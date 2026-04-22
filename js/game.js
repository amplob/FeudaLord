// =====================================================
// FEUDAL LORD - GAME LOGIC
// =====================================================

const STORAGE_KEY = "feudal-lord-save";

const defaultState = {
    turn: 1,
    resources: {
        gold: 100,
        food: 50,
        manpower: 30,
        favor: 30
    },
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
    document.getElementById("tradeToggle").addEventListener("click", toggleTradePanel);
    document.getElementById("tradeClose").addEventListener("click", hideTradeOverlay);
    document.getElementById("propertiesToggle").addEventListener("click", togglePropertiesPanel);
    document.getElementById("propertiesClose").addEventListener("click", hidePropertiesOverlay);
    document.getElementById("resetButton").addEventListener("click", resetGame);
    document.getElementById("auguryOptions").addEventListener("click", handleAuguryAction);

    // Close overlays on background click
    document.getElementById('tradeOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'tradeOverlay') hideTradeOverlay();
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
    
    // Validate that cardInstance exists and has required properties
    if (!cardInstance || !cardInstance.name) {
        console.warn("Invalid pending state detected, clearing...");
        gameState.pending = null;
        hideAuguryOverlay();
        saveState();
        return;
    }
    
    try {
        if (type === 'investment' && cardInstance) {
            renderInvestmentCard(cardInstance);
        } else if (type === 'decision' && cardInstance) {
            renderDecisionCard(cardInstance);
        } else if (type === 'fate' && cardInstance) {
            renderFateCard(cardInstance);
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
    
    // Spin the wheel
    const result = spinWheel();
    
    // Animate and present result
    animateWheel(() => {
        setSpinButtonState(false);
        showAuguryOverlay();
        presentAugury(result);
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

function presentAugury(wheelResult) {
    // Map wheel result to card category
    const categoryMap = {
        'investment': 'investment',
        'decision': 'decision',
        'fate': 'fate'
    };
    
    // Sometimes fate can trigger events instead
    let category = categoryMap[wheelResult];
    if (category === 'fate' && Math.random() < 0.3) {
        // 30% chance to get an event instead of fate
        const eventCard = selectCard('event', gameState);
        if (eventCard) {
            presentEvent(eventCard);
            return;
        }
    }
    
    // Select a card from the category
    const card = selectCard(category, gameState);
    
    if (!card) {
        // Fallback if no cards available
        showToast("Nothing happens this turn...");
        gameState.pending = null;
        hideAuguryOverlay();
        return;
    }
    
    // Create instance with randomized values
    const cardInstance = createCardInstance(card);
    
    // Present based on category
    if (category === 'investment') {
        presentInvestment(cardInstance);
    } else if (category === 'decision') {
        presentDecision(cardInstance);
    } else {
        presentFate(cardInstance);
    }
}

function presentInvestment(cardInstance) {
    gameState.pending = { type: 'investment', cardInstance };
    renderInvestmentCard(cardInstance);
    saveState();
}

function presentDecision(cardInstance) {
    gameState.pending = { type: 'decision', cardInstance };
    renderDecisionCard(cardInstance);
    saveState();
}

function presentFate(cardInstance) {
    // DON'T apply effects yet - wait for "Continue" click
    gameState.pending = { type: 'fate', cardInstance, effectsApplied: false };
    renderFateCard(cardInstance);
    saveState();
}

function presentEvent(card) {
    const cardInstance = createCardInstance(card);
    
    // Apply activation effects
    if (cardInstance.onActivate) {
        applyResourceChange(cardInstance.onActivate, `${cardInstance.name} begins!`);
    }
    
    // Activate the event
    activateCard(cardInstance);
    
    gameState.pending = { type: 'event', cardInstance };
    renderEventCard(cardInstance);
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

    // Handle continue/skip buttons
    if (button.dataset.action === 'continue' || button.dataset.action === 'skip') {
        gameState.pending = null;
        hideAuguryOverlay();
        renderProperties();
        verifyState();
        saveState();
        return;
    }

    if (!gameState.pending) return;

    const { type, cardInstance } = gameState.pending;

    if (type === 'investment' && button.dataset.action === 'build') {
        handleBuildInvestment(cardInstance);
    } else if (type === 'decision') {
        const optionIndex = parseInt(button.dataset.optionIndex);
        if (!isNaN(optionIndex)) {
            handleDecisionChoice(cardInstance, optionIndex);
        }
    } else if (type === 'fate') {
        // Apply fate effects NOW when clicking Continue
        if (cardInstance.effects && !gameState.pending.effectsApplied) {
            applyResourceChange(cardInstance.effects, cardInstance.name);
            gameState.pending.effectsApplied = true;
        }
        gameState.pending = null;
        hideAuguryOverlay();
        renderProperties();
        verifyState();
        saveState();
    } else if (type === 'event') {
        gameState.pending = null;
        hideAuguryOverlay();
        renderProperties();
        verifyState();
        saveState();
    }
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
    
    gameState.pending = null;
    hideAuguryOverlay();
    renderProperties();
    verifyState();
    saveState();
}

function handleTrade(tradeId, from, to, rate) {
    const fromAmount = tradeConfig.baseAmount;
    const toAmount = Math.round(tradeConfig.baseAmount * rate);
    
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
    // Only allow emergency skip for fate/event, NOT for decisions/investments
    // (player MUST make a choice for those)
    if (!gameState.pending) {
        hideAuguryOverlay();
        return;
    }
    
    const { type } = gameState.pending;
    
    // For fate/event, allow skipping (just closes the info screen)
    if (type === 'fate' || type === 'event') {
        // For fate, still apply effects even if skipping
        if (type === 'fate' && gameState.pending.cardInstance?.effects && !gameState.pending.effectsApplied) {
            applyResourceChange(gameState.pending.cardInstance.effects, gameState.pending.cardInstance.name);
        }
        gameState.pending = null;
        hideAuguryOverlay();
        renderProperties();
        verifyState();
        saveState();
        return;
    }
    
    // For investment/decision, show a warning but don't skip
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
