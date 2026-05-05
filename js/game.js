// =====================================================
// FEUDAL LORD - GAME LOGIC
// =====================================================

const STORAGE_KEY = "feudal-lord-save";

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
    document.getElementById("realmClose").addEventListener("click", hideRealmOverlay);
    document.getElementById("auguryOptions").addEventListener("click", handleAuguryAction);
    if (typeof wireSpinShop === "function") wireSpinShop();
    document.getElementById("dailyButton").addEventListener("click", handleDailyClick);
    document.getElementById("dailyContinue").addEventListener("click", hideDailyOverlay);
    wireSidebar();

    // Close overlays on background click
    document.getElementById('tradeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'tradeOverlay') handleTradeClose();
    });
    document.getElementById('realmOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'realmOverlay') hideRealmOverlay();
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

    // Trade pseudo-card has no cardInstance; everything else requires one.
    if (type !== 'trade' && (!cardInstance || !cardInstance.name)) {
        console.warn("Invalid pending state detected, clearing...");
        gameState.pending = null;
        hideAuguryOverlay();
        saveState();
        return;
    }
    
    try {
        if (type === 'trade') {
            renderTradeCard();
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
        gameState.turn += 1;
        recordTurnSnapshot();
        updateResourceBar(gameState);
        renderSpinStatus();
        showAuguryOverlay();
        presentAugury(segment);   // sets gameState.pending (or clears it on "nothing happens")
        saveState();              // single commit for the entire turn
    });
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
    const net = calculateTotalPassiveIncome();
    const hasIncome = Object.values(net).some(v => v !== 0);
    
    if (hasIncome) {
        applyResourceChange(net, "Passive income collected");
    }
}

// =====================================================
// AUGURY PRESENTATION
// =====================================================

function presentAugury(segment) {
    // Wheel slice maps directly to a category (investment / decision / event / trade).
    // Tonality ("good"/"neutral"/"bad") filters the event pool; multiplier scales
    // payouts (decisions) and event magnitudes (events). Trade is a fixed flow,
    // not drawn from the card pool.
    if (segment.type === 'trade') {
        presentTrade(segment);
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
    const { gold, food, manpower, favor } = gameState.resources;
    
    if (favor >= 500) {
        endGame("🎉 The people crown you Duke!");
        return;
    }
    if (gold < 0) {
        endGame("💸 Bankruptcy! You lose your lands.");
        return;
    }
    if (food < 0) {
        endGame("🥀 Famine! The people starve.");
        return;
    }
    if (manpower <= 0) {
        endGame("🏚️ Your lands are abandoned.");
        return;
    }
    if (favor <= -50) {
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

    showAuguryOverlay();
    renderGameOver(message);
}

// =====================================================
// SAVE/LOAD
// =====================================================

function saveState() {
    gameState.cardSystemState = getCardSystemState();
    gameState.saveSeq = (gameState.saveSeq || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    // Fire-and-forget Firestore mirror. cloud-save.js no-ops when not signed in.
    if (typeof cloudSaveState === "function") cloudSaveState(gameState);
}

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return structuredClone(defaultState);
    }

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
        // Migrate legacy saves that predate kingdoms — label them as the
        // default kingdom so the Kingdom page renders correctly.
        if (!merged.kingdomId) merged.kingdomId = DEFAULT_KINGDOM_ID;
        return merged;
    } catch (error) {
        console.error("Failed to load save:", error);
        return structuredClone(defaultState);
    }
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
    hideRealmOverlay();
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
            case "realm":   toggleRealmPanel(); break;
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
    const musicBtn = document.getElementById("musicToggle");
    const soundBtn = document.getElementById("soundToggle");
    const playBtn = document.getElementById("playButton");
    const resetBtn = document.getElementById("menuResetButton");
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
    // pick a kingdom which kicks off (or resumes) the game.
    playBtn.addEventListener("click", showKingdomSelect);

    if (resetBtn) resetBtn.addEventListener("click", resetFromMenu);

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

// Render the cards. Marks the kingdom currently in localStorage with a
// "Continue" hint so the player knows which one resumes vs. resets.
function renderKingdomList() {
    const list = document.getElementById("kingdomList");
    if (!list) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const savedKingdom = stored
        ? (() => { try { return JSON.parse(stored).kingdomId; } catch (_) { return null; } })()
        : null;

    list.innerHTML = "";
    KINGDOMS.forEach((k, i) => {
        const r = k.startingResources;
        const isSaved = savedKingdom === k.id;
        const card = document.createElement("button");
        card.className = "kingdom-card";
        card.dataset.kingdomId = k.id;
        card.innerHTML = `
            <div class="kingdom-card-icon">${k.icon}</div>
            <div class="kingdom-card-body">
                <div class="kingdom-card-level">Level ${i + 1}${isSaved ? " · Continue" : ""}</div>
                <h3>${k.name}</h3>
                <p>${k.description}</p>
                <div class="kingdom-card-resources">
                    Start: ${r.gold} 💰  ${r.food} 🌾  ${r.manpower} 👥  ${r.favor} 👑
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// User picked a kingdom card. If it matches the saved kingdom, resume.
// If it differs (and a save exists), confirm before overwriting.
function selectKingdom(kingdomId) {
    const stored = localStorage.getItem(STORAGE_KEY);
    let savedKingdom = null;
    let hasSave = false;
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            savedKingdom = parsed.kingdomId || null;
            hasSave = true;
        }
    } catch (_) {}
    // Legacy null-kingdom saves are treated as the default kingdom so the
    // user keeps their progress when they pick that one.
    const effectiveSaved = savedKingdom || (hasSave ? DEFAULT_KINGDOM_ID : null);

    if (effectiveSaved && effectiveSaved !== kingdomId) {
        const k = getKingdom(kingdomId);
        if (!confirm(`Start ${k.name}? Your current progress will be replaced.`)) return;
    }

    if (effectiveSaved !== kingdomId) {
        // Fresh state for this kingdom (or first ever play).
        const fresh = buildInitialState(kingdomId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }

    // Reveal the game and load.
    document.getElementById("kingdomSelectScreen").classList.add("is-hidden");
    document.getElementById("gameScreen").classList.remove("is-hidden");

    if (!_gameStarted) {
        _gameStarted = true;
        initGame();
    } else {
        // Game already initialized this session — re-load the new state.
        gameState = loadState();
        restoreCardSystemState(gameState.cardSystemState);
        applyRegen();
        currentPropertyFilter = 'all';
        updateResourceBar(gameState);
        renderKingdom();
        renderSpinStatus();
        // Trade rates are kingdom-aware; rebuild the panel so the new
        // canonical values reach the rate display.
        initTradeUI(handleTrade);
        showWheelPage();
        hideAuguryOverlay();
        hideTradeOverlay();
        hideRealmOverlay();
        if (gameState.gameOver) handleSavedGameOver();
        else if (gameState.pending) {
            showAuguryOverlay();
            restorePendingAugury();
        }
        saveState();
    }
}

// Wipe all save state from the entry screen. If the game has already been
// initialized this session (Play was clicked), delegate to resetGame() so the
// in-memory state and visible UI both reset; otherwise clear localStorage and
// the per-user Firestore doc directly.
async function resetFromMenu() {
    if (!confirm("Reset all progress? This deletes your save and starts fresh.")) return;
    if (gameState) {
        resetGame(); // in-place reset; saveState() inside writes defaults to local + cloud.
    } else {
        localStorage.removeItem(STORAGE_KEY);
        if (typeof currentUser !== "undefined" && currentUser && typeof fbDb !== "undefined") {
            try {
                await fbDb.collection(SAVES_COLLECTION).doc(currentUser.uid).delete();
            } catch (e) {
                console.error("[reset] cloud delete failed:", e);
            }
        }
    }
    alert("Progress reset.");
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
