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
    // Turn now lives on the Kingdom page; refresh it if visible.
    const turnEl = document.getElementById("kingdomTurn");
    if (turnEl) turnEl.textContent = state.turn;

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
// UI - Kingdom page
// =====================================================
//
// Replaces the old Estate modal. Shows the kingdom title + description,
// current turn / favor goal, the active events (no filter) and the built
// investments with a per-resource filter.

let currentPropertyFilter = 'all';

function renderKingdom() {
    if (!gameState) return;
    const titleEl   = document.getElementById("kingdomTitle");
    const descEl    = document.getElementById("kingdomDescription");
    const turnEl    = document.getElementById("kingdomTurn");
    const goalEl    = document.getElementById("kingdomGoal");
    const eventsEl  = document.getElementById("kingdomEvents");
    const estateEl  = document.getElementById("kingdomEstate");
    if (!titleEl || !eventsEl || !estateEl) return;

    // Title + flavor (later: vary per chosen kingdom).
    titleEl.textContent = "Kingdom of Demesne";
    descEl.textContent  = "A kind and prosperous demesne where peasants till the soil and lords gather favor. Reach 500 👑 to be crowned Duke.";
    turnEl.textContent  = gameState.turn;
    goalEl.textContent  = `${fmtNum(gameState.resources.favor)} / 500 👑`;

    // Events: every active event card, no filter.
    const events = getActiveCardsByCategory("event");
    eventsEl.innerHTML = "";
    if (events.length === 0) {
        eventsEl.innerHTML = '<div class="property-empty">No events active.</div>';
    } else {
        for (const ev of events) eventsEl.appendChild(makePropertyItem(ev));
    }

    // Estate: investments, filtered by the active resource tab.
    const investments = getActiveCardsByCategory("investment");
    const filtered = filterCardsByResource(investments, currentPropertyFilter);
    estateEl.innerHTML = "";
    if (investments.length === 0) {
        estateEl.innerHTML = '<div class="property-empty">No properties yet. Build some investments!</div>';
    } else if (filtered.length === 0) {
        estateEl.innerHTML = `<div class="property-empty">No properties producing ${RESOURCE_ICON[currentPropertyFilter]}</div>`;
    } else {
        for (const inv of filtered) estateEl.appendChild(makePropertyItem(inv));
    }
}

// Build a single row used by both the Events and Estate sections.
function makePropertyItem(card) {
    const item = document.createElement("div");
    item.className = "property-item";
    let suffix = '';
    if (card.turnsRemaining !== null && card.turnsRemaining !== undefined) {
        suffix = `<span class="turns-remaining">(${card.turnsRemaining} turns)</span>`;
    } else if (card.category === "investment" && (card.level || 1) > 1) {
        suffix = `<span class="level-badge">Lv. ${card.level}</span>`;
    }
    item.innerHTML = `
        <div class="property-info">
            <span class="icon">${card.icon || '🏠'}</span>
            <span class="name">${card.name}</span>
            ${suffix}
        </div>
        <span class="yield">${card.perTurn ? formatPerTurn(card.perTurn) : ''}</span>
    `;
    return item;
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
        renderKingdom();
    });
}

// Compat alias — many call sites still call renderProperties().
function renderProperties() { renderKingdom(); }

// =====================================================
// UI - Game page navigation
// =====================================================
// The game now has two pages inside #gameScreen: the wheel (default) and the
// kingdom view. Switching between them just toggles is-hidden — both stay in
// the DOM so listeners remain wired.

function showWheelPage() {
    document.getElementById("wheelPage")?.classList.remove("is-hidden");
    document.getElementById("kingdomPage")?.classList.add("is-hidden");
}

function showKingdomPage() {
    renderKingdom();
    document.getElementById("kingdomPage")?.classList.remove("is-hidden");
    document.getElementById("wheelPage")?.classList.add("is-hidden");
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


// =====================================================
// UI - Realm (landscape view)
// =====================================================
//
// Each investment has a fixed coordinate on a 4:3 canvas (percentages of
// width/height, anchored at the icon's center). When the structure is built
// the emoji shows in full color; when not, it shows as a grey silhouette so
// the player can see what's left to claim. Coordinates are tuned to the
// landscape backdrop bands defined in style.css (.realm-canvas).
const STRUCTURE_LAYOUT = {
    goldmine:     { left: 15, top: 15 },
    stoneQuarry:  { left: 78, top: 18 },
    royalKeep:    { left: 50, top: 30 },
    barracks:     { left: 22, top: 50 },
    cathedral:    { left: 50, top: 53 },
    vineyard:     { left: 78, top: 50 },
    market:       { left: 38, top: 65 },
    tradeCaravan: { left: 15, top: 73 },
    watermill:    { left: 28, top: 87 },
    fishingBoats: { left: 78, top: 90 },
};

function renderRealm() {
    const canvas = document.getElementById("realmCanvas");
    if (!canvas) return;
    const built = new Map(getBuiltStructures().map(s => [s.typeId, s]));
    canvas.innerHTML = "";
    for (const card of investmentCards) {
        const layout = STRUCTURE_LAYOUT[card.typeId];
        if (!layout) continue;
        const struct = built.get(card.typeId);
        const isBuilt = !!struct;
        const level = struct ? (struct.level || 1) : 0;

        const node = document.createElement("div");
        node.className = `realm-structure${isBuilt ? "" : " empty"}`;
        node.style.left = `${layout.left}%`;
        node.style.top = `${layout.top}%`;
        node.title = isBuilt && level > 1
            ? `${card.name} (Lv. ${level})`
            : card.name;
        node.innerHTML = `
            <span class="icon">${card.icon}</span>
            ${level > 1 ? `<span class="level-badge">Lv. ${level}</span>` : ""}
        `;
        canvas.appendChild(node);
    }
}

function showRealmOverlay() {
    renderRealm();
    document.getElementById('realmOverlay').classList.remove('hidden');
}

function hideRealmOverlay() {
    document.getElementById('realmOverlay').classList.add('hidden');
}

function toggleRealmPanel() {
    const overlay = document.getElementById('realmOverlay');
    if (overlay.classList.contains('hidden')) {
        showRealmOverlay();
    } else {
        hideRealmOverlay();
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

// Render the spin counter / regen countdown under the wheel. Called from
// handleSpin and once per second via startSpinTick() so the timer ticks live.
function renderSpinStatus() {
    const el = document.getElementById('spinStatus');
    const spinBtn = document.getElementById('spinButton');
    if (!el || !gameState) return;
    applyRegen();
    const cur = gameState.spins;
    const max = gameState.maxSpins;

    if (cur >= max) {
        el.textContent = `⚡ ${cur} / ${max}`;
    } else {
        const ms = spinsRegenInMs() ?? 0;
        const total = Math.ceil(ms / 1000);
        const mm = String(Math.floor(total / 60)).padStart(2, "0");
        const ss = String(total % 60).padStart(2, "0");
        el.textContent = `⚡ ${cur} / ${max} · +1 in ${mm}:${ss}`;
    }
    el.classList.toggle("empty", cur <= 0);
    if (spinBtn) spinBtn.classList.toggle("no-spins", cur <= 0);
}

let _spinTickHandle = null;
function startSpinTick() {
    if (_spinTickHandle) return;
    _spinTickHandle = setInterval(renderSpinStatus, 1000);
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

    // If this typeId is already built, treat the build as a level-up.
    const existing = getActiveCards().find(c => c.typeId === cardInstance.typeId);
    const currentLevel = existing ? (existing.level || 1) : 0;
    const nextLevel = currentLevel + 1;
    const verb = currentLevel > 0 ? `Upgrade to Lv. ${nextLevel}` : "Investment";
    titleEl.textContent = `${CATEGORY_ICON.investment} ${verb}: ${cardInstance.name}`;
    descEl.textContent = cardInstance.description;

    const canBuild = canAfford(cardInstance.cost);
    const affordClass = canBuild ? '' : 'cannot-afford';

    const yieldGoldEq = goldEquivalent(cardInstance.perTurn);
    const roi = yieldGoldEq > 0 ? goldEquivalent(cardInstance.cost) / yieldGoldEq : 0;
    const roiText = roi > 0
        ? (roi % 1 === 0 ? `${roi}` : roi.toFixed(2))
        : "—";

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
                <div class="stat-row roi">
                    <span class="label">ROI:</span>
                    <span class="value">${roiText} turns</span>
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

    titleEl.textContent = `${CATEGORY_ICON.decision} ${cardInstance.name}`;
    descEl.textContent = cardInstance.description;

    const showAssess = hasStaticFlag('assess');

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

        let assessHtml = '';
        if (showAssess && option.effects && Object.keys(option.effects).length > 0) {
            const delta = goldEquivalent(option.effects);
            const cls = delta >= 0 ? 'positive' : 'negative';
            const sign = delta >= 0 ? '+' : '';
            assessHtml = `<span class="option-assess ${cls}">${sign}${fmtNum(round2(delta))}💰</span>`;
        }

        optionsHtml += `
            <div class="decision-option">
                <button data-option-index="${index}" class="primary decision-btn">
                    <div class="option-main">
                        <span class="option-label">${option.label}</span>
                        <span class="option-effects">${effectsText}</span>
                    </div>
                    ${assessHtml}
                </button>
            </div>
        `;
    });

    optionsEl.innerHTML = optionsHtml;
}

// Sum gold-equivalent value of an effects object using canonical rates.
// gold=1, food=0.5, manpower=3, favor=2 (see RESOURCE_VALUE in cardSystem.js).
function goldEquivalent(effects) {
    if (!effects) return 0;
    return Object.entries(effects).reduce(
        (sum, [res, amt]) => sum + amt * (RESOURCE_VALUE[res] || 0),
        0
    );
}

function renderEventCard(cardInstance) {
    // Unified event renderer: handles instant-only, ongoing-only, and combined cards.
    document.getElementById('emergencyClose').style.display = 'block';

    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = `${CATEGORY_ICON.event} ${cardInstance.name}`;
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

    titleEl.textContent = `${CATEGORY_ICON.trade} A Merchant Approaches`;
    descEl.textContent = "A caravan of traders arrives at your gates, offering their wares.";

    optionsEl.innerHTML = `
        <div class="card-icon large">${CATEGORY_ICON.trade}</div>
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
                return `${value >= 0 ? "+" : ""}${fmtNum(value)}${RESOURCE_ICON[key]}`;
            } else {
                return `${fmtNum(value)}${RESOURCE_ICON[key]}`;
            }
        })
        .join(" ");
}

function formatCost(cost) {
    if (!cost) return "Free";
    const entries = Object.entries(cost);
    if (entries.length === 0) return "Free";
    return entries
        .map(([key, value]) => `${fmtNum(value)}${RESOURCE_ICON[key]}`)
        .join(" ");
}

function formatPerTurn(perTurn) {
    if (!perTurn) return "";
    const entries = Object.entries(perTurn);
    if (entries.length === 0) return "";
    return entries
        .map(([key, value]) => `${value >= 0 ? "+" : ""}${fmtNum(value)}${RESOURCE_ICON[key]}/turn`)
        .join(" ");
}
