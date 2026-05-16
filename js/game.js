// =====================================================
// FEUDAL LORD - GAME LOGIC
// =====================================================

// Each kingdom has its own localStorage slot — switching kingdoms is now a
// silent save+swap rather than an overwrite. Cloud-save mirrors the same
// per-kingdom layout into a Firestore map.
const STORAGE_KEY_PREFIX = "feudal-lord-save";
const STORAGE_KEY = STORAGE_KEY_PREFIX; // legacy alias (used by syncOnSignIn for migration)
function storageKeyFor(kingdomId) { return `${STORAGE_KEY_PREFIX}-${kingdomId}`; }

// Move a pre-multi-save single-slot save into its kingdom-specific slot.
// Runs once on DOMContentLoaded; no-op after that. Quiet on failure.
function migrateLegacySave() {
    const legacy = localStorage.getItem(STORAGE_KEY_PREFIX);
    if (!legacy) return;
    try {
        const parsed = JSON.parse(legacy);
        const kid = parsed.kingdomId || DEFAULT_KINGDOM_ID;
        const newKey = storageKeyFor(kid);
        if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, legacy);
            console.log(`[migrate] moved legacy save → ${newKey}`);
        }
        localStorage.removeItem(STORAGE_KEY_PREFIX);
    } catch (_) { /* ignore corrupt legacy */ }
}

// Spin stamina: one spin regenerates every SPIN_REGEN_MS, capped at maxSpins.
// Achievements / unlocks can grow maxSpins later (held on gameState).
const SPIN_REGEN_MS = 5 * 60 * 1000;

// Build a fresh game state for a given kingdom — same defaults except for
// starting resources, which come from the kingdom's table. The KINGDOMS
// array (data/kingdoms.js) is the single source of difficulty.
function buildInitialState(kingdomId) {
    const kingdom = getKingdom(kingdomId);
    const state = structuredClone(defaultState);
    state.kingdomId = kingdom.id;
    state.resources = { ...kingdom.startingResources };
    return state;
}

const defaultState = {
    turn: 1,
    resources: {
        gold: 30,
        food: 30,
        manpower: 30,
        favor: 30
    },
    // eventFlags: transient boolean state (conceptually "something is happening").
    //   Auto-derived from active event cards' setsEventFlag + decision-set entries here.
    // staticFlags: permanent, once-set boolean state ("something has happened").
    eventFlags: [],
    // "assess" is a player-facing aid: shows gold-equivalent delta on each
    // decision option. Starts active; a future card could gate it.
    staticFlags: ["assess"],
    cardSystemState: null,
    pending: null,
    gameOver: false,
    // Which kingdom (= difficulty / starting purse) is being played. Picked
    // on the kingdom selection screen; null when no game has been started.
    kingdomId: null,

    // Monotonic version counter — incremented on every saveState. Cloud sync
    // compares the local vs remote saveSeq on sign-in to pick the newer copy
    // (vital on mobile, where a process kill can drop the cloud flush).
    saveSeq: 0,

    // Stamina (spin economy). lastSpinAt is the ms timestamp the current
    // regen interval started counting from; advances by SPIN_REGEN_MS as
    // each regen tick is credited. Null on first ever load — populated on
    // first applyRegen().
    spins: 30,
    maxSpins: 30,
    lastSpinAt: null,

    // Set true once the player takes the "buy me a coffee" deal in the
    // Spin Shop. While true, spins never deplete and the regen timer is
    // hidden. Persists with the save like any other progression state.
    unlimitedSpins: false,

    // Per-turn snapshot log for the Stats page chart. One entry per turn:
    // { turn, resources: {...}, income: {...} }. Capped to HISTORY_MAX entries.
    history: [],

};

let gameState = null;

// =====================================================
// INITIALIZATION
// =====================================================

function initGame() {
    // Initialize card system first
    initCardSystem();
    
    // Load saved state
    gameState = loadState();
    
    // Restore card system state
    restoreCardSystemState(gameState.cardSystemState);

    // Credit regen for time elapsed since last save, then start the live tick
    // so the countdown updates every second while the game is open.
    applyRegen();

    // Surface any shortage events that are valid against the just-loaded
    // resources (saves from before the shortage-events change won't carry
    // them in activeCards, so re-sync on every boot).
    manageShortageEvents();

    // Update UI
    updateResourceBar(gameState);
    renderProperties();
    renderSpinStatus();
    startSpinTick();
    startDailyTick();
    initTradeUI(handleTrade);
    setupPropertyTabs();

    // Event listeners
    document.getElementById("spinButton").addEventListener("click", handleSpin);
    document.getElementById("tradeClose").addEventListener("click", handleTradeClose);
    document.getElementById("auguryOptions").addEventListener("click", handleAuguryAction);
    if (typeof wireSpinShop === "function") wireSpinShop();
    document.getElementById("dailyButton").addEventListener("click", handleDailyClick);
    document.getElementById("dailyContinue").addEventListener("click", hideDailyOverlay);
    document.getElementById("eyeButton").addEventListener("click", toggleRealmView);
    document.getElementById("shortageContinue").addEventListener("click", hideShortagePopup);
    wireSidebar();
    // Render the realm landscape behind the wheel on first paint.
    renderRealm();

    // Close overlays on background click
    document.getElementById('tradeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'tradeOverlay') handleTradeClose();
    });
    document.getElementById('dailyOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'dailyOverlay') hideDailyOverlay();
    });

    // Seed an initial history snapshot for legacy saves and brand-new games.
    if (!gameState.history || gameState.history.length === 0) {
        gameState.history = [];
        recordTurnSnapshot();
    }
    
    // Emergency close button for stuck augury
    document.getElementById('emergencyClose').addEventListener('click', emergencySkipTurn);
    
    // Escape key to skip stuck augury
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gameState.pending) {
            emergencySkipTurn();
        }
    });

    // Handle saved game states
    if (gameState.gameOver) {
        handleSavedGameOver();
    } else if (gameState.pending) {
        showAuguryOverlay();
        restorePendingAugury();
    }

    saveState();
}

function handleSavedGameOver() {
    disableSpinButton();
    showAuguryOverlay();
    const isWin = gameState.resources.favor >= 500;
    const message = isWin 
        ? "🎉 The people crown you Duke!" 
        : "Your previous reign has ended.";
    renderGameOver(message);
}

function restorePendingAugury() {
    if (!gameState.pending) return;
    
    const { type, cardInstance } = gameState.pending;

    // Trade and merchant pseudo-cards have no cardInstance; everything else
    // requires one.
    if (type !== 'trade' && type !== 'merchant' && (!cardInstance || !cardInstance.name)) {
        console.warn("Invalid pending state detected, clearing...");
        gameState.pending = null;
        hideAuguryOverlay();
        saveState();
        return;
    }

    try {
        if (type === 'trade') {
            renderTradeCard();
        } else if (type === 'merchant') {
            // Restore the timed offer with a fresh 6s window — saving the
            // remaining time would be slightly nicer but adds save-format
            // complexity for little practical gain (most reloads won't be
            // mid-merchant).
            const offer = gameState.pending.offer;
            if (!offer) throw new Error("Merchant pending without offer");
            renderMerchantCard(offer);
            if (_merchantTimerId) clearTimeout(_merchantTimerId);
            _merchantTimerId = setTimeout(() => {
                _merchantTimerId = null;
                if (gameState.pending && gameState.pending.type === "merchant") {
                    handleMerchantAction("pass");
                }
            }, MERCHANT_DECISION_MS);
        } else if (type === 'investment' && cardInstance) {
            renderInvestmentCard(cardInstance);
        } else if (type === 'decision' && cardInstance) {
            renderDecisionCard(cardInstance);
        } else if (type === 'event' && cardInstance) {
            renderEventCard(cardInstance);
        } else {
            throw new Error("Unknown pending type");
        }
    } catch (error) {
        console.error("Failed to restore pending augury:", error);
        gameState.pending = null;
        hideAuguryOverlay();
        showToast("Previous turn state was corrupted. Starting fresh.");
        saveState();
    }
}

// =====================================================
// SPIN STAMINA
// =====================================================
// Regenerates +1 spin every SPIN_REGEN_MS up to maxSpins. lastSpinAt holds
// the ms timestamp the current regen interval is counted from. Idempotent:
// works correctly even if the page was closed for hours — the elapsed time
// since lastSpinAt credits the right number of ticks on next load.

function applyRegen() {
    if (!gameState) return;
    if (gameState.unlimitedSpins) {
        // Keep the bucket pinned to full so any UI that still reads
        // gameState.spins shows a consistent value.
        gameState.spins = gameState.maxSpins;
        gameState.lastSpinAt = Date.now();
        return;
    }
    const now = Date.now();
    if (gameState.lastSpinAt == null) {
        gameState.lastSpinAt = now;
        return;
    }
    if (gameState.spins >= gameState.maxSpins) {
        // Cap reached — keep the timer pinned to "now" so it doesn't accumulate
        // phantom ticks while the bucket is full.
        gameState.lastSpinAt = now;
        return;
    }
    const elapsed = now - gameState.lastSpinAt;
    const ticks = Math.floor(elapsed / SPIN_REGEN_MS);
    if (ticks > 0) {
        gameState.spins = Math.min(gameState.maxSpins, gameState.spins + ticks);
        gameState.lastSpinAt += ticks * SPIN_REGEN_MS;
        if (gameState.spins >= gameState.maxSpins) {
            gameState.lastSpinAt = now;
        }
    }
}

function spinsRegenInMs() {
    if (gameState.unlimitedSpins) return null;
    if (gameState.spins >= gameState.maxSpins) return null;
    const elapsed = Date.now() - (gameState.lastSpinAt || Date.now());
    return Math.max(0, SPIN_REGEN_MS - (elapsed % SPIN_REGEN_MS));
}

// =====================================================
// MAIN GAME LOOP
// =====================================================

function handleSpin() {
    if (gameState.pending) {
        showToast("Resolve the current augury first.");
        return;
    }

    applyRegen();
    if (!gameState.unlimitedSpins && gameState.spins <= 0) {
        // Out of spins → drop the player straight into the Spin Shop
        // instead of a toast. Both options (free ad / paid unlimited) are
        // one tap away.
        if (typeof openSpinShop === "function") {
            openSpinShop();
        } else {
            showToast("Out of spins.");
        }
        return;
    }

    setSpinButtonState(true);

    // Save-after-spin model: nothing is committed until the spin actually
    // lands. All the turn's mutations (consume spin, tick events, apply
    // passive income, increment turn, present augury) happen inside the
    // wheel callback, then a single saveState() captures the whole turn.
    // If the user closes mid-animation, the previous save is unchanged —
    // reload restores them to where they were before clicking SPIN.
    spinWheel((segment) => {
        setSpinButtonState(false);
        if (!gameState.unlimitedSpins) gameState.spins -= 1;
        recordSpin();
        processEvents();
        applyPassiveIncome();
        // Shortage events fire AFTER passive income has had a chance to
        // refill — only resources still ≤ 0 trigger one. Newly-activated
        // shortages apply their onActivate penalty immediately.
        manageShortageEvents();
        gameState.turn += 1;
        recordTurnSnapshot();
        updateResourceBar(gameState);
        renderSpinStatus();
        // Decay or events may have crossed the favor threshold. If so, end
        // the run instead of presenting a card.
        verifyState();
        if (gameState.gameOver) {
            saveState();
            return;
        }
        showAuguryOverlay();
        presentAugury(segment);   // sets gameState.pending (or clears it on "nothing happens")
        saveState();              // single commit for the entire turn
    });
}

// =====================================================
// SHORTAGE EVENTS (negative-resource cascade as real events)
// =====================================================
// When a resource sits at ≤ 0 we activate the matching shortage event
// (cards-event.js, marked with `shortageOf: "<resource>"`). The event
// shows up in the kingdom events list, contributes its perTurnEffects to
// the per-turn yield, and pops a toast on activation. When the resource
// recovers above zero the event is silently removed (no end toast).
// On game over we leave events as-is — the run is over either way.

// Re-entrancy guard. manageShortageEvents calls applyEventInstance →
// applyChange → applyResourceChange, and applyResourceChange now calls
// manageShortageEvents again. The recursive call is idempotent per typeId
// (the `existing` check), but the guard avoids re-iterating the card list.
let _shortageSyncing = false;

function manageShortageEvents() {
    if (!gameState || gameState.gameOver) return;
    if (_shortageSyncing) return;
    _shortageSyncing = true;
    try {
        const shortageCards = allCards.filter(c => c.shortageOf);
        for (const card of shortageCards) {
            const conditionMet = gameState.resources[card.shortageOf] <= 0;
            const existing = activeCards.find(c => c.typeId === card.typeId);
            if (conditionMet && !existing) {
                const inst = createCardInstance(card);
                // applyEventInstance applies onActivate (immediate penalty)
                // and adds the card to activeCards (so processActiveEvents
                // picks up its perTurnEffects from next turn).
                applyEventInstance(inst, applyResourceChange);
                renderKingdom();
                updateIncomeIndicators();
                if (typeof showShortagePopup === "function") {
                    showShortagePopup(inst);
                }
            } else if (!conditionMet && existing) {
                deactivateCard(existing.instanceId);
                renderKingdom();
                updateIncomeIndicators();
            }
        }
    } finally {
        _shortageSyncing = false;
    }
}

function processEvents() {
    const eventResults = processActiveEvents();
    
    // Apply per-turn effects from events
    if (Object.keys(eventResults.perTurnEffects).length > 0) {
        const hasEffects = Object.values(eventResults.perTurnEffects).some(v => v !== 0);
        if (hasEffects) {
            applyResourceChange(eventResults.perTurnEffects, "Event effects");
        }
    }
    
    // Apply expire effects
    if (Object.keys(eventResults.expireEffects).length > 0) {
        applyResourceChange(eventResults.expireEffects, "Event ended");
    }
    
    // Notify about expired events
    for (const expired of eventResults.expiredEvents) {
        showToast(`${expired.icon} ${expired.name} has ended`);
    }
}

function applyPassiveIncome() {
    // Only investments contribute here. Event perTurn is already applied by
    // processEvents above — folding it in again would double-count any
    // event that yields per turn (drought, shortages, etc.).
    const net = { gold: 0, food: 0, manpower: 0, favor: 0 };
    for (const card of activeCards) {
        if (card.category !== "investment" || !card.perTurn) continue;
        for (const [resource, amount] of Object.entries(card.perTurn)) {
            net[resource] = (net[resource] || 0) + amount;
        }
    }
    const hasIncome = Object.values(net).some(v => v !== 0);
    if (hasIncome) {
        applyResourceChange(net, "Passive income collected");
    }
}

// =====================================================
// AUGURY PRESENTATION
// =====================================================

function presentAugury(segment) {
    // Wheel slice maps directly to a category (investment / decision / event /
    // trade / merchant). Tonality ("good"/"neutral"/"bad") filters the event
    // pool; multiplier scales payouts (decisions) and event magnitudes
    // (events). Trade and merchant are fixed flows, not drawn from the card
    // pool.
    if (segment.type === 'trade') {
        presentTrade(segment);
        return;
    }
    if (segment.type === 'merchant') {
        presentMerchant(segment);
        return;
    }

    // Events are filtered by tonality; decisions and investments aren't.
    const tonalityFilter = segment.type === 'event' ? segment.tonality : undefined;
    const card = selectCard(segment.type, gameState, tonalityFilter);

    if (!card) {
        showToast("Nothing happens this turn...");
        gameState.pending = null;
        hideAuguryOverlay();
        return;
    }

    const cardInstance = createCardInstance(card, { sliceMultiplier: segment.multiplier });

    if (segment.type === 'investment') {
        presentInvestment(cardInstance, segment);
    } else if (segment.type === 'decision') {
        presentDecision(cardInstance, segment);
    } else if (segment.type === 'event') {
        presentEvent(cardInstance, segment);
    }
}

function presentInvestment(cardInstance, segment) {
    gameState.pending = { type: 'investment', cardInstance, segment };
    renderInvestmentCard(cardInstance, segment);
}

function presentDecision(cardInstance, segment) {
    gameState.pending = { type: 'decision', cardInstance, segment };
    renderDecisionCard(cardInstance, segment);
}

function presentEvent(cardInstance, segment) {
    // Don't apply effects yet — wait for "Continue" click.
    // Events are "just accept": instant effects + onActivate + activation all fire on Continue.
    gameState.pending = { type: 'event', cardInstance, segment, effectsApplied: false };
    renderEventCard(cardInstance, segment);
}

function presentTrade(segment) {
    gameState.pending = { type: 'trade', segment };
    renderTradeCard();
}

// =====================================================
// MERCHANT (timed random offer)
// =====================================================
// A wandering merchant offers a single trade with a 6s deadline. 70% of
// offers are favorable (output gold-eq > input gold-eq) so the player has
// real incentive to read and decide; 30% are bad deals dressed up as a
// trade. Sometimes (25%) both sides of the trade are the same resource —
// a trivial "is Y > X?" sanity check.

const MERCHANT_DECISION_MS = 6000;
const MERCHANT_FAVORABLE_PROB = 0.70;
const MERCHANT_SAME_RESOURCE_PROB = 0.25;

let _merchantTimerId = null;

function generateMerchantOffer() {
    const resources = ["gold", "food", "manpower", "favor"];
    const fromRes = resources[Math.floor(Math.random() * resources.length)];

    let toRes;
    if (Math.random() < MERCHANT_SAME_RESOURCE_PROB) {
        toRes = fromRes;
    } else {
        const others = resources.filter(r => r !== fromRes);
        toRes = others[Math.floor(Math.random() * others.length)];
    }

    // Input value in gold-equivalent: 4–12g. Converted to whole units.
    const inputGoldEq = 4 + Math.random() * 8;
    const fromAmt = Math.max(1, Math.round(inputGoldEq / RESOURCE_VALUE[fromRes]));

    // Favorable: 1.05x – 1.40x. Unfavorable: 0.55x – 0.95x.
    const favorable = Math.random() < MERCHANT_FAVORABLE_PROB;
    const ratio = favorable
        ? 1.05 + Math.random() * 0.35
        : 0.55 + Math.random() * 0.40;

    // Recompute from the actual rounded fromAmt so the displayed output
    // ratio matches what the player would compute mentally.
    const inputValue = fromAmt * RESOURCE_VALUE[fromRes];
    const toAmt = Math.max(1, Math.round((inputValue * ratio) / RESOURCE_VALUE[toRes]));

    return { fromRes, fromAmt, toRes, toAmt, favorable };
}

function presentMerchant(segment) {
    const offer = generateMerchantOffer();
    gameState.pending = { type: "merchant", offer, segment };
    renderMerchantCard(offer);

    // Auto-pass if the player doesn't decide in time.
    if (_merchantTimerId) clearTimeout(_merchantTimerId);
    _merchantTimerId = setTimeout(() => {
        _merchantTimerId = null;
        // Only auto-pass if we're still on the merchant card (player might
        // have switched apps, opened another overlay, etc).
        if (gameState.pending && gameState.pending.type === "merchant") {
            handleMerchantAction("pass");
        }
    }, MERCHANT_DECISION_MS);
}

function handleMerchantAction(action) {
    if (_merchantTimerId) { clearTimeout(_merchantTimerId); _merchantTimerId = null; }
    if (!gameState.pending || gameState.pending.type !== "merchant") return;
    const { offer } = gameState.pending;

    if (action === "trade") {
        // Same-resource offers collapse to a single net delta so we don't
        // first subtract then add and double-count the float animations.
        const delta = {};
        if (offer.fromRes === offer.toRes) {
            delta[offer.fromRes] = offer.toAmt - offer.fromAmt;
        } else {
            delta[offer.fromRes] = -offer.fromAmt;
            delta[offer.toRes]   =  offer.toAmt;
        }
        applyResourceChange(delta, "Merchant deal accepted");
    }

    gameState.pending = null;
    hideAuguryOverlay();
    verifyState();
    // Save-after-spin: the next spin's saveState commits this.
}

// =====================================================
// ACTION HANDLERS
// =====================================================

function handleAuguryAction(event) {
    const button = event.target.closest("button");
    if (!button) return;

    // Handle reset button (game over)
    if (button.dataset.reset === 'true') {
        resetGame();
        return;
    }

    if (!gameState.pending) {
        if (button.dataset.action === 'continue' || button.dataset.action === 'skip') {
            hideAuguryOverlay();
        }
        return;
    }

    const { type, cardInstance } = gameState.pending;
    const action = button.dataset.action;

    if (type === 'investment' && action === 'build') {
        handleBuildInvestment(cardInstance);
    } else if (type === 'investment' && action === 'skip') {
        gameState.pending = null;
        hideAuguryOverlay();
    } else if (type === 'decision') {
        const optionIndex = parseInt(button.dataset.optionIndex);
        if (!isNaN(optionIndex)) {
            handleDecisionChoice(cardInstance, optionIndex);
        }
    } else if (type === 'event' && action === 'continue') {
        acceptEvent(cardInstance);
    } else if (type === 'trade' && action === 'trade') {
        // Keep pending; open the existing trade overlay. Closing it returns here.
        hideAuguryOverlay();
        showTradeOverlay();
    } else if (type === 'trade' && action === 'pass') {
        gameState.pending = null;
        hideAuguryOverlay();
    } else if (type === 'merchant' && (action === 'merchantTrade' || action === 'merchantPass')) {
        handleMerchantAction(action === 'merchantTrade' ? 'trade' : 'pass');
    }
}

function acceptEvent(cardInstance) {
    if (!gameState.pending.effectsApplied) {
        applyEventInstance(cardInstance, applyResourceChange);
        gameState.pending.effectsApplied = true;
    }
    gameState.pending = null;
    hideAuguryOverlay();
    renderProperties();
    updateIncomeIndicators();
    verifyState();
    // Save-after-spin: don't persist mid-turn. The next spin will commit, or
    // the save happens in endGame if verifyState ended the run.
}

function handleBuildInvestment(cardInstance) {
    // Check if can afford
    if (!canAfford(cardInstance.cost)) {
        showToast("Not enough resources!");
        return;
    }
    
    // Pay cost
    applyResourceChange(negateEffects(cardInstance.cost), `Built ${cardInstance.name}`);
    
    // Activate the card
    activateCard(cardInstance);
    
    // Update UI
    renderProperties();
    updateIncomeIndicators();
    
    gameState.pending = null;
    hideAuguryOverlay();
    verifyState();
    // Save-after-spin: build is part of this turn's resolution; the next
    // spin will commit it (or endGame if it pushed us over the loss line).
}

function handleDecisionChoice(cardInstance, optionIndex) {
    const option = cardInstance.options[optionIndex];
    if (!option) return;
    
    // Apply immediate effects
    if (option.effects && Object.keys(option.effects).length > 0) {
        applyResourceChange(option.effects, `${cardInstance.name}: ${option.label}`);
    }
    
    // For ongoing consequences of a decision, the option declares
    // `triggersEvent: "<eventTypeId>"` and we activate that real event card.
    // (No more synthetic "decision-as-event" branch; it had no tonality, no
    // expiry, and wasn't visible to the validator.)
    if (option.triggersEvent) {
        const eventCard = allCards.find(c => c.typeId === option.triggersEvent);
        if (eventCard) {
            const eventInstance = createCardInstance(eventCard);
            applyEventInstance(eventInstance, applyResourceChange);
            showToast(`${eventInstance.icon} ${eventInstance.name} triggered!`);
        }
    }

    // Apply flag mutations from the chosen option itself (sets/clears event flags, sets static flags).
    applyFlagMutations(option);

    // The decision has been resolved. Mark the typeId played so isUnique
    // narrative decisions (e.g., druidPact) can't fire twice.
    playedCardTypes.add(cardInstance.typeId);

    gameState.pending = null;
    hideAuguryOverlay();
    renderProperties();
    verifyState();
    // Save-after-spin: decision is committed by the next spin's saveState.
}

// When closing the trade overlay, if we got here from the Merchant wheel slice,
// go back to the augury so the player can choose again (Trade or Pass). The
// merchant approach doesn't auto-end the turn until Pass is clicked.
function handleTradeClose() {
    hideTradeOverlay();
    if (gameState.pending?.type === 'trade') {
        showAuguryOverlay();
        renderTradeCard();
    }
}

function handleTrade(tradeId, from, to, rate) {
    const fromAmount = tradeConfig.baseAmount;
    const toAmount = tradeConfig.baseAmount * rate;
    
    if (gameState.resources[from] < fromAmount) {
        showToast("Not enough resources to trade.");
        return;
    }

    const change = {
        [from]: -fromAmount,
        [to]: toAmount
    };

    applyResourceChange(change, "Trade completed");
    
    const message = getTradeMessage(tradeId);
    if (message) {
        showToast(message);
    }
    
    verifyState();
}

// =====================================================
// RESOURCE MANAGEMENT
// =====================================================

function applyResourceChange(change, reason) {
    Object.entries(change).forEach(([resource, amount]) => {
        if (typeof amount !== "number") return;
        gameState.resources[resource] += amount;
        showFloating(resource, amount);
    });

    updateResourceBar(gameState);
    updateBestResources(gameState.resources);

    if (reason) {
        showToast(reason);
    }

    // Any resource change can push us into (or out of) a shortage state —
    // sync the shortage events so the popup and event list stay in lockstep
    // with the resource bar, even between spins (decisions, trades, etc.).
    if (typeof manageShortageEvents === "function") {
        manageShortageEvents();
    }

    // No saveState here — under save-after-spin, mid-turn resource changes
    // are in-memory only. The next spin (or endGame / reset) commits.
}

function canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([resource, amount]) => 
        gameState.resources[resource] >= amount
    );
}

function negateEffects(effects) {
    const negated = {};
    Object.entries(effects).forEach(([resource, amount]) => {
        negated[resource] = -amount;
    });
    return negated;
}

// =====================================================
// WIN/LOSE CONDITIONS
// =====================================================

function verifyState() {
    const favor = gameState.resources.favor;

    if (favor >= 500) {
        endGame("🎉 The people crown you Duke!");
        return;
    }
    // Only favor ends the run now. Other resources going negative activate
    // shortage events (manageShortageEvents), whose perTurnEffects push
    // favor toward this threshold over time.
    if (favor < 0) {
        endGame("⚔️ Revolution! The people overthrow you.");
    }
}

function endGame(message) {
    const wasAlreadyOver = gameState.gameOver;
    gameState.gameOver = true;
    disableSpinButton();

    // Record the game's outcome in player stats — only the first time we
    // transition into game-over (verifyState can fire on every resource
    // change, so this guard prevents duplicate counting).
    if (!wasAlreadyOver) {
        const won = (gameState.resources?.favor || 0) >= 500;
        recordGameEnd(won, gameState.kingdomId);
    }

    saveState();
    // Game-over is an integrity event — push the final state to cloud now
    // instead of waiting for the debounce timer (no-op on native, which
    // doesn't schedule one in the first place).
    if (typeof flushCloudSave === "function") flushCloudSave();

    showAuguryOverlay();
    renderGameOver(message);
}

// =====================================================
// SAVE/LOAD
// =====================================================

function saveState() {
    if (!gameState || !gameState.kingdomId) return;
    gameState.cardSystemState = getCardSystemState();
    gameState.saveSeq = (gameState.saveSeq || 0) + 1;
    localStorage.setItem(storageKeyFor(gameState.kingdomId), JSON.stringify(gameState));
    // Fire-and-forget Firestore mirror. cloud-save.js no-ops when not signed in.
    if (typeof cloudSaveState === "function") cloudSaveState(gameState);
}

// Read a kingdom's slot from localStorage. Returns null when there's no
// save for that kingdom (caller falls back to buildInitialState).
function loadStateFor(kingdomId) {
    const stored = localStorage.getItem(storageKeyFor(kingdomId));
    if (!stored) return null;
    try {
        const parsed = JSON.parse(stored);
        const merged = {
            ...structuredClone(defaultState),
            ...parsed,
            resources: {
                ...structuredClone(defaultState.resources),
                ...parsed.resources
            }
        };
        // Defensive: any save without a kingdomId belongs to its slot.
        if (!merged.kingdomId) merged.kingdomId = kingdomId;
        return merged;
    } catch (error) {
        console.error("Failed to load save:", error);
        return null;
    }
}

// Back-compat helper — used only by initGame as a fallback when entering
// without going through selectKingdom (shouldn't happen in normal flow).
function loadState() {
    if (gameState && gameState.kingdomId) {
        return loadStateFor(gameState.kingdomId) || buildInitialState(gameState.kingdomId);
    }
    return structuredClone(defaultState);
}

function emergencySkipTurn() {
    // Only allow emergency skip for events (info/accept screens), NOT for decisions/investments
    // (player MUST make a choice for those).
    if (!gameState.pending) {
        hideAuguryOverlay();
        return;
    }

    const { type, cardInstance } = gameState.pending;

    if (type === 'event') {
        // Treat emergency-close as Continue: accept the event and apply everything.
        acceptEvent(cardInstance);
        return;
    }

    showToast("You must make a decision!");
}

function resetGame() {
    // Reset game state — keep the current kingdom (so resources match the
    // chosen difficulty), only wipe progress.
    const kingdomId = gameState?.kingdomId || DEFAULT_KINGDOM_ID;
    gameState = buildInitialState(kingdomId);

    // Reset card system
    resetCardSystem();

    // Seed the new run's history with the starting snapshot.
    recordTurnSnapshot();

    // Reset UI
    enableSpinButton();
    hideAuguryOverlay();
    hideTradeOverlay();
    showWheelPage();
    updateResourceBar(gameState);
    renderKingdom();
    if (typeof renderSpinStatus === "function") renderSpinStatus();

    // Reset property filter
    currentPropertyFilter = 'all';
    const tabs = document.getElementById('resourceTabs');
    if (tabs) {
        tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const allTab = tabs.querySelector('[data-filter="all"]');
        if (allTab) allTab.classList.add('active');
    }

    showToast("New reign begins!");
    saveState();
}

// =====================================================
// SIDEBAR (slide-out drawer)
// =====================================================
// Single source for opening secondary screens (Realm, Estate, Test, Main Menu).
// The hamburger button toggles the drawer; clicking the backdrop or any item
// closes it. Items dispatch by data-action so debug.js can append a Test entry
// without needing its own listener.

function wireSidebar() {
    const burger = document.getElementById("menuBurger");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!burger || !sidebar || !backdrop) return;

    function setOpen(open) {
        sidebar.classList.toggle("open", open);
        backdrop.classList.toggle("visible", open);
        sidebar.setAttribute("aria-hidden", open ? "false" : "true");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    burger.addEventListener("click", () => {
        setOpen(!sidebar.classList.contains("open"));
    });
    backdrop.addEventListener("click", () => setOpen(false));

    sidebar.addEventListener("click", (e) => {
        const btn = e.target.closest(".sidebar-item");
        if (!btn) return;
        const action = btn.dataset.action;
        setOpen(false);
        switch (action) {
            case "spin":    showWheelPage(); break;
            case "kingdom": showKingdomPage(); break;
            case "realm":   showRealmView(); break;
            case "stats":   showStatsPage(); break;
            case "menu":    returnToMainMenu(); break;
            case "test":
                if (typeof showTestPicker === "function") showTestPicker();
                break;
        }
    });
}

function returnToMainMenu() {
    saveState();
    document.getElementById("gameScreen").classList.add("is-hidden");
    document.getElementById("kingdomSelectScreen")?.classList.add("is-hidden");
    document.getElementById("menuScreen").classList.remove("is-hidden");
}

// =====================================================
// MENU SCREEN
// =====================================================
// The game stays dormant behind the entry menu until Play is clicked,
// so the augury overlay (if a save has a pending decision) doesn't
// flash while the menu is on screen.

const MENU_PREFIX = "feudal-lord-menu-";
let _gameStarted = false;

function wireMenu() {
    // Move any pre-multi-save localStorage entry to its kingdom slot before
    // anything else reads from storage.
    migrateLegacySave();

    const musicBtn = document.getElementById("musicToggle");
    const soundBtn = document.getElementById("soundToggle");
    const playBtn = document.getElementById("playButton");
    if (!musicBtn || !soundBtn || !playBtn) return;

    const wireToggle = (btn, key) => {
        const muted = localStorage.getItem(MENU_PREFIX + key) === "1";
        btn.classList.toggle("muted", muted);
        btn.addEventListener("click", () => {
            const nowMuted = btn.classList.toggle("muted");
            localStorage.setItem(MENU_PREFIX + key, nowMuted ? "1" : "0");
        });
    };
    wireToggle(musicBtn, "music");
    wireToggle(soundBtn, "sound");

    // Play takes the user to the kingdom selection screen; from there they
    // pick a kingdom (and per-kingdom resets live on the kingdom cards).
    playBtn.addEventListener("click", showKingdomSelect);

    wireKingdomSelect();
    wireAuthUI();
}

// =====================================================
// KINGDOM SELECTION
// =====================================================

function wireKingdomSelect() {
    const screen = document.getElementById("kingdomSelectScreen");
    const back = document.getElementById("kingdomSelectBack");
    const list = document.getElementById("kingdomList");
    if (!screen || !list) return;

    back?.addEventListener("click", () => {
        screen.classList.add("is-hidden");
        document.getElementById("menuScreen").classList.remove("is-hidden");
    });

    list.addEventListener("click", (e) => {
        // Per-kingdom reset takes precedence over the card click.
        const resetBtn = e.target.closest("[data-reset]");
        if (resetBtn) {
            e.stopPropagation();
            resetKingdom(resetBtn.dataset.reset);
            return;
        }
        const card = e.target.closest(".kingdom-card");
        if (!card) return;
        selectKingdom(card.dataset.kingdomId);
    });
}

function showKingdomSelect() {
    document.getElementById("menuScreen").classList.add("is-hidden");
    document.getElementById("kingdomSelectScreen").classList.remove("is-hidden");
    renderKingdomList();
}

// Render the cards. Each kingdom that has its own save shows a "Continue"
// hint and a per-kingdom Reset button (the global menu reset is gone now
// that progress is per-kingdom).
function renderKingdomList() {
    const list = document.getElementById("kingdomList");
    if (!list) return;

    list.innerHTML = "";
    KINGDOMS.forEach((k, i) => {
        const r = k.startingResources;
        const hasSave = localStorage.getItem(storageKeyFor(k.id)) !== null;
        const card = document.createElement("div");
        card.className = "kingdom-row";
        card.innerHTML = `
            <button class="kingdom-card" data-kingdom-id="${k.id}">
                <div class="kingdom-card-icon">${k.icon}</div>
                <div class="kingdom-card-body">
                    <div class="kingdom-card-level">Level ${i + 1}${hasSave ? " · Continue" : ""}</div>
                    <h3>${k.name}</h3>
                    <p>${k.description}</p>
                    <div class="kingdom-card-resources">
                        Start: ${r.gold} 💰  ${r.food} 🌾  ${r.manpower} 👥  ${r.favor} 👑
                    </div>
                </div>
            </button>
            ${hasSave ? `<button class="kingdom-reset" data-reset="${k.id}" title="Reset ${k.name}" aria-label="Reset ${k.name}">🗑️</button>` : ""}
        `;
        list.appendChild(card);
    });
}

// User picked a kingdom card. Per-kingdom saves now coexist, so we silently
// commit the current kingdom (if any) and load whatever's stored for the
// target — no overwrite warning. A fresh kingdom with no save starts new.
function selectKingdom(kingdomId) {
    // Persist the kingdom we're leaving so its progress isn't lost.
    if (gameState && gameState.kingdomId && gameState.kingdomId !== kingdomId) {
        saveState();
        if (typeof flushCloudSave === "function") flushCloudSave();
    }

    // Load the target's save, or build a fresh state if it's brand new.
    let next = loadStateFor(kingdomId);
    if (!next) {
        next = buildInitialState(kingdomId);
    }
    gameState = next;

    // Reveal the game.
    document.getElementById("kingdomSelectScreen").classList.add("is-hidden");
    document.getElementById("gameScreen").classList.remove("is-hidden");

    if (!_gameStarted) {
        _gameStarted = true;
        initGame();
    } else {
        // Game already wired this session — refresh UI for the new state.
        restoreCardSystemState(gameState.cardSystemState);
        applyRegen();
        currentPropertyFilter = 'all';
        updateResourceBar(gameState);
        renderKingdom();
        renderSpinStatus();
        // Trade rates are kingdom-aware; rebuild for the new canonical values.
        initTradeUI(handleTrade);
        showWheelPage();
        hideAuguryOverlay();
        hideTradeOverlay();
        if (gameState.gameOver) handleSavedGameOver();
        else if (gameState.pending) {
            showAuguryOverlay();
            restorePendingAugury();
        } else {
            enableSpinButton();
        }
        saveState();
    }
}

// Wipe a single kingdom's save (localStorage + cloud). Triggered by the 🗑️
// on the kingdom selection card. If the kingdom is currently loaded, the
// in-memory gameState and visible UI also reset to that kingdom's defaults.
async function resetKingdom(kingdomId) {
    const k = getKingdom(kingdomId);
    if (!confirm(`Reset ${k.name}? Your save for this kingdom will be deleted.`)) return;

    localStorage.removeItem(storageKeyFor(kingdomId));
    if (typeof cloudDeleteKingdom === "function") {
        try { await cloudDeleteKingdom(kingdomId); } catch (_) {}
    }

    if (gameState && gameState.kingdomId === kingdomId) {
        gameState = buildInitialState(kingdomId);
        if (typeof resetCardSystem === "function") resetCardSystem();
    }

    renderKingdomList();
}

// Reflect auth state on the menu: either a "Sign in with Google" button or
// a small profile chip with the user's name + a Sign out link.
function wireAuthUI() {
    if (typeof onAuthChange !== "function") {
        // Firebase scripts didn't load (offline, blocked, etc) — hide the
        // whole auth block so the user doesn't see a button that does nothing.
        document.getElementById("authBlock")?.classList.add("is-hidden");
        return;
    }

    const signInBtn = document.getElementById("signInButton");
    const signOutBtn = document.getElementById("signOutButton");
    const status = document.getElementById("authStatus");
    const nameEl = document.getElementById("authName");
    const avatarEl = document.getElementById("authAvatar");

    signInBtn.addEventListener("click", signInWithGoogle);
    signOutBtn.addEventListener("click", signOutUser);

    onAuthChange(user => {
        if (user) {
            signInBtn.classList.add("is-hidden");
            status.classList.remove("is-hidden");
            nameEl.textContent = user.displayName || user.email || "Signed in";
            if (user.photoURL) {
                avatarEl.src = user.photoURL;
                avatarEl.classList.remove("is-hidden");
            } else {
                avatarEl.classList.add("is-hidden");
            }
        } else {
            signInBtn.classList.remove("is-hidden");
            status.classList.add("is-hidden");
        }
    });
}

document.addEventListener("DOMContentLoaded", wireMenu);
