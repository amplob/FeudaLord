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
    document.getElementById("propertiesToggle").addEventListener("click", togglePropertiesPanel);
    document.getElementById("propertiesClose").addEventListener("click", hidePropertiesOverlay);
    document.getElementById("resetButton").addEventListener("click", resetGame);
    document.getElementById("auguryOptions").addEventListener("click", handleAuguryAction);

    // Close overlays on background click
    document.getElementById('tradeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'tradeOverlay') handleTradeClose();
    });
    document.getElementById('propertiesOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'propertiesOverlay') hidePropertiesOverlay();
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

    // Spin the wheel — returns the full landed segment (type/tonality/multiplier)
    const segment = spinWheel();

    // Animate and present result
    animateWheel(() => {
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
        if (cardInstance.effects && Object.keys(cardInstance.effects).length > 0) {
            applyResourceChange(cardInstance.effects, cardInstance.name);
        }
        if (cardInstance.onActivate) {
            applyResourceChange(cardInstance.onActivate, `${cardInstance.name} begins!`);
        }
        if (cardInstance.duration || cardInstance.perTurn) {
            activateCard(cardInstance);
        }
        // setsEventFlag is auto-derived from active cards (skipped here).
        // clearsEventFlag + setsStaticFlag still apply imperatively.
        applyFlagMutations(cardInstance, { autoDerivedSets: true });
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
    
    // If has per-turn effects, create an event-like card
    if (option.perTurnEffects && Object.keys(option.perTurnEffects).length > 0) {
        const eventInstance = {
            instanceId: generateInstanceId(),
            typeId: `${cardInstance.typeId}_effect`,
            category: 'event',
            name: `${cardInstance.name} (${option.label})`,
            description: 'Ongoing effect from your decision',
            icon: cardInstance.icon,
            perTurn: option.perTurnEffects,
            duration: null, // Permanent
            turnsRemaining: null,
        };
        activateCard(eventInstance);
        showToast(`Ongoing: ${formatEffects(option.perTurnEffects)}/turn`);
    }

    // If this option triggers an event card, activate it now
    if (option.triggersEvent) {
        const eventCard = allCards.find(c => c.typeId === option.triggersEvent);
        if (eventCard) {
            const eventInstance = createCardInstance(eventCard);
            if (eventInstance.effects && Object.keys(eventInstance.effects).length > 0) {
                applyResourceChange(eventInstance.effects, eventInstance.name);
            }
            if (eventInstance.onActivate) {
                applyResourceChange(eventInstance.onActivate, `${eventInstance.name} begins!`);
            }
            if (eventInstance.duration || eventInstance.perTurn) {
                activateCard(eventInstance);
            }
            applyFlagMutations(eventInstance, { autoDerivedSets: true });
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
// START GAME
// =====================================================

document.addEventListener("DOMContentLoaded", initGame);
