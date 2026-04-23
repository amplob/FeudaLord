// =====================================================
// UI - Resource Bar Updates
// =====================================================

// Format numbers: integers as-is, fractional with 2 decimals
function fmtNum(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function updateResourceBar(state) {
    document.getElementById("goldValue").textContent = fmtNum(state.resources.gold);
    document.getElementById("foodValue").textContent = fmtNum(state.resources.food);
    document.getElementById("manpowerValue").textContent = fmtNum(state.resources.manpower);
    document.getElementById("favorValue").textContent = fmtNum(state.resources.favor);
    document.getElementById("turnValue").textContent = state.turn;

    updateIncomeIndicators();
}

function updateIncomeIndicators() {
    const net = calculateTotalPassiveIncome();

    const resources = ['gold', 'food', 'manpower', 'favor'];
    resources.forEach(resource => {
        const indicator = document.getElementById(`${resource}Income`);
        if (!indicator) return;

        const value = net[resource];
        if (value === 0) {
            indicator.textContent = '';
            indicator.className = 'income-indicator';
        } else {
            indicator.textContent = value > 0 ? `+${fmtNum(value)}` : fmtNum(value);
            indicator.className = `income-indicator ${value > 0 ? 'positive' : 'negative'}`;
        }
    });
}

// =====================================================
// UI - Properties Panel
// =====================================================

let currentPropertyFilter = 'all';

function renderProperties() {
    const list = document.getElementById("propertyList");
    if (!list) return;

    const activeCards = getActiveCards();
    const filtered = filterCardsByResource(activeCards, currentPropertyFilter);

    if (activeCards.length === 0) {
        list.innerHTML = '<div class="property-empty">No properties yet. Build some investments!</div>';
        return;
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="property-empty">No properties producing ${symbolFor(currentPropertyFilter)}</div>`;
        return;
    }

    list.innerHTML = "";
    filtered.forEach((card) => {
        const item = document.createElement("div");
        item.className = "property-item";
        
        // Show turns remaining for events
        let turnsInfo = '';
        if (card.turnsRemaining !== null && card.turnsRemaining !== undefined) {
            turnsInfo = `<span class="turns-remaining">(${card.turnsRemaining} turns)</span>`;
        }
        
        item.innerHTML = `
            <div class="property-info">
                <span class="icon">${card.icon || '🏠'}</span>
                <span class="name">${card.name}</span>
                ${turnsInfo}
            </div>
            <span class="yield">${card.perTurn ? formatPerTurn(card.perTurn) : ''}</span>
        `;
        list.appendChild(item);
    });
}

function filterCardsByResource(cards, filter) {
    if (filter === 'all') return cards;
    return cards.filter(card => {
        if (!card.perTurn) return false;
        return Object.keys(card.perTurn).includes(filter);
    });
}

function setupPropertyTabs() {
    const tabs = document.getElementById('resourceTabs');
    if (!tabs) return;
    
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        
        tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentPropertyFilter = tab.dataset.filter;
        renderProperties();
    });
}

// =====================================================
// UI - Overlay Management
// =====================================================

function showAuguryOverlay() {
    document.getElementById('auguryOverlay').classList.remove('hidden');
}

function hideAuguryOverlay() {
    document.getElementById('auguryOverlay').classList.add('hidden');
}

function showTradeOverlay() {
    document.getElementById('tradeOverlay').classList.remove('hidden');
}

function hideTradeOverlay() {
    document.getElementById('tradeOverlay').classList.add('hidden');
}

function showPropertiesOverlay() {
    renderProperties();
    document.getElementById('propertiesOverlay').classList.remove('hidden');
}

function hidePropertiesOverlay() {
    document.getElementById('propertiesOverlay').classList.add('hidden');
}

function toggleTradePanel() {
    const overlay = document.getElementById('tradeOverlay');
    if (overlay.classList.contains('hidden')) {
        showTradeOverlay();
    } else {
        hideTradeOverlay();
    }
}

function togglePropertiesPanel() {
    const overlay = document.getElementById('propertiesOverlay');
    if (overlay.classList.contains('hidden')) {
        showPropertiesOverlay();
    } else {
        hidePropertiesOverlay();
    }
}

// =====================================================
// UI - Spin Button Control
// =====================================================

function setSpinButtonState(spinning) {
    const spinButton = document.getElementById('spinButton');
    if (spinning) {
        spinButton.classList.add('spinning');
        spinButton.disabled = true;
    } else {
        spinButton.classList.remove('spinning');
        spinButton.disabled = false;
    }
}

function enableSpinButton() {
    const spinButton = document.getElementById('spinButton');
    spinButton.disabled = false;
    spinButton.classList.remove('spinning');
}

function disableSpinButton() {
    const spinButton = document.getElementById('spinButton');
    spinButton.disabled = true;
}

// =====================================================
// UI - Card Rendering
// =====================================================

function renderInvestmentCard(cardInstance) {
    // Hide emergency close for mandatory decisions
    document.getElementById('emergencyClose').style.display = 'none';
    
    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = `🏗️ Investment: ${cardInstance.name}`;
    descEl.textContent = cardInstance.description;

    const canBuild = canAfford(cardInstance.cost);
    const affordClass = canBuild ? '' : 'cannot-afford';

    optionsEl.innerHTML = `
        <div class="card-details ${affordClass}">
            <div class="card-icon">${cardInstance.icon}</div>
            <div class="card-stats">
                <div class="stat-row cost">
                    <span class="label">Cost:</span>
                    <span class="value">${formatCost(cardInstance.cost)}</span>
                </div>
                <div class="stat-row yield">
                    <span class="label">Yield:</span>
                    <span class="value">${formatPerTurn(cardInstance.perTurn)}</span>
                </div>
            </div>
        </div>
        <div class="card-actions">
            <button data-action="build" class="primary" ${canBuild ? '' : 'disabled'}>
                ${canBuild ? '🔨 Build' : '❌ Cannot Afford'}
            </button>
            <button data-action="skip" class="secondary">Skip this turn</button>
        </div>
    `;
}

function renderDecisionCard(cardInstance) {
    // Hide emergency close for mandatory decisions
    document.getElementById('emergencyClose').style.display = 'none';
    
    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = `⚖️ ${cardInstance.name}`;
    descEl.textContent = cardInstance.description;

    let optionsHtml = `<div class="card-icon large">${cardInstance.icon}</div>`;
    
    cardInstance.options.forEach((option, index) => {
        let effectsText = '';
        
        if (option.effects && Object.keys(option.effects).length > 0) {
            effectsText += formatEffects(option.effects);
        }
        
        if (option.perTurnEffects && Object.keys(option.perTurnEffects).length > 0) {
            if (effectsText) effectsText += ' ';
            effectsText += `<span class="per-turn">${formatPerTurn(option.perTurnEffects)}</span>`;
        }
        
        if (!effectsText) effectsText = 'No effect';
        
        optionsHtml += `
            <div class="decision-option">
                <button data-option-index="${index}" class="primary decision-btn">
                    <span class="option-label">${option.label}</span>
                    <span class="option-effects">${effectsText}</span>
                </button>
            </div>
        `;
    });

    optionsEl.innerHTML = optionsHtml;
}

function renderEventCard(cardInstance) {
    // Unified event renderer: handles instant-only, ongoing-only, and combined cards.
    document.getElementById('emergencyClose').style.display = 'block';

    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = `🎲 ${cardInstance.name}`;
    descEl.textContent = cardInstance.description;

    const instant = cardInstance.effects;
    const hasInstant = instant && Object.keys(instant).length > 0;
    const instantSum = hasInstant ? Object.values(instant).reduce((s, v) => s + v, 0) : 0;
    const onActivateSum = cardInstance.onActivate
        ? Object.values(cardInstance.onActivate).reduce((s, v) => s + v, 0)
        : 0;
    const perTurnSum = cardInstance.perTurn
        ? Object.values(cardInstance.perTurn).reduce((s, v) => s + v, 0)
        : 0;
    const isPositive = (instantSum + onActivateSum + perTurnSum) >= 0;

    const parts = [`<div class="fate-icon">${cardInstance.icon}</div>`];
    if (hasInstant) {
        parts.push(`<div class="fate-effects">${formatEffects(instant)}</div>`);
    }
    if (cardInstance.onActivate) {
        parts.push(`<div class="event-activate">Immediate: ${formatEffects(cardInstance.onActivate)}</div>`);
    }
    if (cardInstance.perTurn) {
        parts.push(`<div class="event-effect">Per turn: ${formatPerTurn(cardInstance.perTurn)}</div>`);
    }
    if (cardInstance.duration) {
        parts.push(`<div class="event-duration">Lasts ${cardInstance.duration} turns</div>`);
    }
    if (cardInstance.onExpire) {
        parts.push(`<div class="event-expire">On expire: ${formatEffects(cardInstance.onExpire)}</div>`);
    }

    optionsEl.innerHTML = `
        <div class="fate-result ${isPositive ? 'positive' : 'negative'}">
            ${parts.join('')}
        </div>
        <div class="card-actions">
            <button data-action="continue" class="primary">Continue</button>
        </div>
    `;
}

function renderTradeCard() {
    document.getElementById('emergencyClose').style.display = 'none';

    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = "💼 A Merchant Approaches";
    descEl.textContent = "A caravan of traders arrives at your gates, offering their wares.";

    optionsEl.innerHTML = `
        <div class="card-icon large">💼</div>
        <div class="card-actions">
            <button data-action="trade" class="primary">Trade</button>
            <button data-action="pass" class="secondary">Pass</button>
        </div>
    `;
}

function renderGameOver(message) {
    // Hide emergency close for game over
    document.getElementById('emergencyClose').style.display = 'none';
    
    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    const isWin = message.includes("Duke");
    
    titleEl.textContent = isWin ? "🎉 Victory!" : "💀 Game Over";
    descEl.textContent = message;
    
    optionsEl.innerHTML = `
        <div class="game-over-actions">
            <button data-reset="true" class="primary reset-btn">
                ${isWin ? "🏰 Start New Reign" : "⚔️ Try Again"}
            </button>
        </div>
    `;
}

// =====================================================
// UI - Toast & Floating
// =====================================================

function showToast(message) {
    if (!message) return;
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2400);
}

function showFloating(resource, amount) {
    const resourceEl = document.querySelector(`.resource[data-resource="${resource}"]`);
    if (!resourceEl) return;

    const floatEl = document.createElement("span");
    floatEl.className = `floating ${amount >= 0 ? "positive" : "negative"}`;
    floatEl.textContent = `${amount >= 0 ? "+" : ""}${fmtNum(amount)}`;
    resourceEl.appendChild(floatEl);

    setTimeout(() => {
        floatEl.remove();
    }, 1200);
}

// =====================================================
// UI - Formatting Helpers
// =====================================================

function formatEffects(effects, showPlus = true) {
    if (!effects) return "No effect";
    const entries = Object.entries(effects);
    if (entries.length === 0) return "No effect";
    return entries
        .map(([key, value]) => {
            if (showPlus) {
                return `${value >= 0 ? "+" : ""}${fmtNum(value)}${symbolFor(key)}`;
            } else {
                return `${fmtNum(value)}${symbolFor(key)}`;
            }
        })
        .join(" ");
}

function formatCost(cost) {
    if (!cost) return "Free";
    const entries = Object.entries(cost);
    if (entries.length === 0) return "Free";
    return entries
        .map(([key, value]) => `${fmtNum(value)}${symbolFor(key)}`)
        .join(" ");
}

function formatPerTurn(perTurn) {
    if (!perTurn) return "";
    const entries = Object.entries(perTurn);
    if (entries.length === 0) return "";
    return entries
        .map(([key, value]) => `${value >= 0 ? "+" : ""}${fmtNum(value)}${symbolFor(key)}/turn`)
        .join(" ");
}
