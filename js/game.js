// =====================================================
// FEUDAL LORD - GAME LOGIC
// =====================================================

const STORAGE_KEY = "feudal-lord-save";

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
    gameOver: false
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
    
    // Update UI
    updateResourceBar(gameState);
    renderProperties();
    initTradeUI(handleTrade);
    setupPropertyTabs();

    // Event listeners
    document.getElementById("spinButton").addEventListener("click", handleSpin);
    document.getElementById("tradeClose").addEventListener("click", handleTradeClose);
    document.getElementById("propertiesClose").addEventListener("click", hidePropertiesOverlay);
    document.getElementById("realmClose").addEventListener("click", hideRealmOverlay);
    document.getElementById("resetButton").addEventListener("click", resetGame);
    document.getElementById("auguryOptions").addEventListener("click", handleAuguryAction);
    wireSidebar();

    // Close overlays on background click
    document.getElementById('tradeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'tradeOverlay') handleTradeClose();
    });
    document.getElementById('propertiesOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'propertiesOverlay') hidePropertiesOverlay();
    });
    document.getElementById('realmOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'realmOverlay') hideRealmOverlay();
    });
    
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
// MAIN GAME LOOP
// =====================================================

function handleSpin() {
    if (gameState.pending) {
        showToast("Resolve the current augury first.");
        return;
    }

    // Hide spin text and disable button
    setSpinButtonState(true);

    // Process active events first
    processEvents();

    // Apply passive income
    applyPassiveIncome();

    // Spin the wheel: physics loop runs in wheel.js, calls back with the
    // landed segment once the wheel comes to rest (after peg collisions and
    // any final bounce-back).
    spinWheel((segment) => {
        setSpinButtonState(false);
        showAuguryOverlay();
        presentAugury(segment);
    });

    gameState.turn += 1;
    updateResourceBar(gameState);
    saveState();
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
    saveState();
}

function presentDecision(cardInstance, segment) {
    gameState.pending = { type: 'decision', cardInstance, segment };
    renderDecisionCard(cardInstance, segment);
    saveState();
}

function presentEvent(cardInstance, segment) {
    // Don't apply effects yet — wait for "Continue" click.
    // Events are "just accept": instant effects + onActivate + activation all fire on Continue.
    gameState.pending = { type: 'event', cardInstance, segment, effectsApplied: false };
    renderEventCard(cardInstance, segment);
    saveState();
}

function presentTrade(segment) {
    gameState.pending = { type: 'trade', segment };
    renderTradeCard();
    saveState();
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
        saveState();
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
        saveState();
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
    saveState();
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
    saveState();
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
    saveState();
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
    
    if (reason) {
        showToast(reason);
    }
    
    saveState();
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
    gameState.gameOver = true;
    disableSpinButton();
    saveState();
    
    showAuguryOverlay();
    renderGameOver(message);
}

// =====================================================
// SAVE/LOAD
// =====================================================

function saveState() {
    gameState.cardSystemState = getCardSystemState();
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
        return {
            ...structuredClone(defaultState),
            ...parsed,
            resources: { 
                ...structuredClone(defaultState.resources), 
                ...parsed.resources 
            }
        };
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
    // Reset game state
    gameState = structuredClone(defaultState);
    
    // Reset card system
    resetCardSystem();
    
    // Reset UI
    enableSpinButton();
    hideAuguryOverlay();
    hideTradeOverlay();
    hidePropertiesOverlay();
    updateResourceBar(gameState);
    renderProperties();
    
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
            case "realm":  toggleRealmPanel(); break;
            case "estate": togglePropertiesPanel(); break;
            case "menu":   returnToMainMenu(); break;
            case "test":
                if (typeof showTestPicker === "function") showTestPicker();
                break;
        }
    });
}

function returnToMainMenu() {
    saveState();
    document.getElementById("gameScreen").classList.add("is-hidden");
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

    // Idempotent: returning to the menu and clicking Play again should not
    // re-bind every listener inside initGame.
    playBtn.addEventListener("click", () => {
        document.getElementById("menuScreen").classList.add("is-hidden");
        document.getElementById("gameScreen").classList.remove("is-hidden");
        if (!_gameStarted) {
            _gameStarted = true;
            initGame();
        }
    });

    wireAuthUI();
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
