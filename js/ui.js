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

    // Mark cells whose resource is in cascade decay (<= 0) so the player
    // can see at a glance why their turn-start toast is firing.
    for (const res of ["gold", "food", "manpower", "favor"]) {
        const cell = document.querySelector(`.resource[data-resource="${res}"]`);
        if (cell) cell.classList.toggle("in-decay", state.resources[res] <= 0);
    }

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

    // Title + flavor — pulled from the selected kingdom (data/kingdoms.js).
    const kingdom = getKingdom(gameState.kingdomId);
    titleEl.textContent = `${kingdom.icon} Kingdom of ${kingdom.name}`;
    descEl.textContent  = kingdom.description;
    turnEl.textContent  = gameState.turn;
    goalEl.textContent  = `${fmtNum(gameState.resources.favor)} / 500 👑`;

    renderResourceValueGrid();

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

// Show the active kingdom's per-resource canonical value as a 4-cell grid.
// An override below the base reads as "abundant" (green ↓), above as
// "scarce" (red ↑); equal values are shown plain. The numbers are the
// gold-equivalent value used by every formula in the game.
function renderResourceValueGrid() {
    const grid = document.getElementById("kingdomResources");
    if (!grid) return;
    grid.innerHTML = "";
    for (const res of ["gold", "food", "manpower", "favor"]) {
        const value = getResourceValue(res);
        const base = BASE_RESOURCE_VALUE[res];
        let cls = "resource-value";
        let arrow = "";
        if (value < base) { cls += " abundant"; arrow = " ↓"; }
        else if (value > base) { cls += " scarce"; arrow = " ↑"; }
        const cell = document.createElement("div");
        cell.className = cls;
        cell.innerHTML = `
            <span class="icon">${RESOURCE_ICON[res]}</span>
            <span class="value">${value}${arrow}</span>
        `;
        grid.appendChild(cell);
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

// All game-screen pages live side-by-side under #gameScreen; this helper
// picks one to show and hides the rest so transitions always end clean.
const GAME_PAGE_IDS = ["wheelPage", "kingdomPage", "statsPage"];

function showGamePage(id) {
    for (const pageId of GAME_PAGE_IDS) {
        document.getElementById(pageId)?.classList.toggle("is-hidden", pageId !== id);
    }
}

function showWheelPage() {
    // Default Wheel view: the spin UI is on, the realm sits in the background.
    // renderRealm() refreshes the backdrop so newly-built structures show up
    // when the player returns from an augury or another page.
    renderRealm();
    document.getElementById("wheelPage")?.classList.remove("realm-view");
    syncEyeButton();
    showGamePage("wheelPage");
}

function showKingdomPage() {
    renderKingdom();
    showGamePage("kingdomPage");
}

function showStatsPage() {
    renderStats();
    renderStatsChart();
    showGamePage("statsPage");
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
// UI - Realm (per-kingdom landscape page)
// =====================================================
//
// Each kingdom gets its own structure layout on a 4:3 canvas (percentages of
// width/height, anchored at the icon's center). The canvas backdrop is
// keyed off `data-kingdom` so every realm has its own gradient (defined in
// style.css). Built structures show full color; un-built show as a grey
// silhouette so the player can see what's left to claim. Adding a new
// kingdom: extend KINGDOMS and add an entry here + a matching CSS rule.
const REALM_LAYOUTS = {
    // Lush peaceful valley — symmetric, river at the bottom.
    greenvale: {
        watchtower:    { left: 50, top: 8 },
        goldmine:      { left: 15, top: 15 },
        stoneQuarry:   { left: 85, top: 15 },
        shrine:        { left: 28, top: 25 },
        cathedral:     { left: 50, top: 25 },
        sanatorium:    { left: 72, top: 25 },
        huntingLodge:  { left: 15, top: 42 },
        trainingGround:{ left: 35, top: 40 },
        market:        { left: 52, top: 42 },
        tradingSquare: { left: 72, top: 40 },
        tollGate:      { left: 88, top: 42 },
        orchard:       { left: 20, top: 58 },
        tavern:        { left: 45, top: 60 },
        cattleFarm:    { left: 75, top: 58 },
        watermill:     { left: 20, top: 82 },
        dock:          { left: 48, top: 84 },
        fishermen:     { left: 78, top: 84 },
    },
    // Bustling river port — wide water band, structures clustered inland.
    rivermark: {
        cathedral:     { left: 35, top: 18 },
        watchtower:    { left: 65, top: 20 },
        shrine:        { left: 20, top: 28 },
        goldmine:      { left: 12, top: 38 },
        sanatorium:    { left: 50, top: 32 },
        stoneQuarry:   { left: 85, top: 38 },
        huntingLodge:  { left: 20, top: 52 },
        trainingGround:{ left: 45, top: 52 },
        tradingSquare: { left: 75, top: 52 },
        market:        { left: 35, top: 65 },
        tavern:        { left: 60, top: 65 },
        tollGate:      { left: 85, top: 62 },
        orchard:       { left: 15, top: 78 },
        cattleFarm:    { left: 60, top: 78 },
        watermill:     { left: 20, top: 90 },
        dock:          { left: 45, top: 90 },
        fishermen:     { left: 80, top: 90 },
    },
    // Spartan keep on rocky soil — elevated, sparse, gully at the bottom.
    stonehold: {
        watchtower:    { left: 50, top: 12 },
        stoneQuarry:   { left: 18, top: 22 },
        goldmine:      { left: 82, top: 22 },
        shrine:        { left: 35, top: 32 },
        cathedral:     { left: 50, top: 32 },
        sanatorium:    { left: 65, top: 32 },
        trainingGround:{ left: 20, top: 46 },
        tollGate:      { left: 50, top: 46 },
        huntingLodge:  { left: 80, top: 46 },
        market:        { left: 35, top: 58 },
        tavern:        { left: 50, top: 60 },
        tradingSquare: { left: 65, top: 58 },
        orchard:       { left: 18, top: 72 },
        cattleFarm:    { left: 82, top: 72 },
        watermill:     { left: 20, top: 86 },
        dock:          { left: 50, top: 88 },
        fishermen:     { left: 80, top: 86 },
    },
    // Frontier outpost on the wild marches — sparse, scattered.
    wolfsedge: {
        watchtower:    { left: 50, top: 12 },
        shrine:        { left: 20, top: 22 },
        cathedral:     { left: 75, top: 22 },
        stoneQuarry:   { left: 15, top: 42 },
        trainingGround:{ left: 30, top: 38 },
        huntingLodge:  { left: 50, top: 40 },
        goldmine:      { left: 75, top: 40 },
        tollGate:      { left: 15, top: 58 },
        market:        { left: 40, top: 58 },
        sanatorium:    { left: 60, top: 55 },
        tradingSquare: { left: 85, top: 58 },
        orchard:       { left: 30, top: 72 },
        tavern:        { left: 50, top: 70 },
        cattleFarm:    { left: 72, top: 72 },
        watermill:     { left: 20, top: 86 },
        dock:          { left: 50, top: 86 },
        fishermen:     { left: 80, top: 86 },
    },
};

function realmLayoutFor(kingdomId) {
    return REALM_LAYOUTS[kingdomId] || REALM_LAYOUTS.greenvale;
}

function renderRealm() {
    const canvas = document.getElementById("realmCanvas");
    if (!canvas) return;

    const kingdomId = (typeof gameState !== "undefined" && gameState && gameState.kingdomId)
        || (typeof DEFAULT_KINGDOM_ID !== "undefined" ? DEFAULT_KINGDOM_ID : "greenvale");
    const kingdom = (typeof getKingdom === "function") ? getKingdom(kingdomId) : null;

    canvas.dataset.kingdom = kingdomId;

    const titleEl   = document.getElementById("realmKingdomName");
    const taglineEl = document.getElementById("realmTagline");
    if (titleEl && kingdom)   titleEl.textContent = kingdom.name;
    if (taglineEl && kingdom) taglineEl.textContent = kingdom.description || "";

    const layout = realmLayoutFor(kingdomId);
    const built = new Map(getBuiltStructures().map(s => [s.typeId, s]));
    canvas.innerHTML = "";
    for (const card of investmentCards) {
        const pos = layout[card.typeId];
        if (!pos) continue;
        const struct = built.get(card.typeId);
        const isBuilt = !!struct;
        const level = struct ? (struct.level || 1) : 0;

        const node = document.createElement("div");
        node.className = `realm-structure${isBuilt ? "" : " empty"}`;
        node.style.left = `${pos.left}%`;
        node.style.top  = `${pos.top}%`;
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

// Sidebar entry: jump to the wheel page in immersive realm-only view (no
// wheel, no spin, no pointer). Eye button can flip back.
function showRealmView() {
    renderRealm();
    showGamePage("wheelPage");
    document.getElementById("wheelPage")?.classList.add("realm-view");
    syncEyeButton();
}

// Eye-button toggle: flip between "wheel + realm bg" and "realm only".
function toggleRealmView() {
    const page = document.getElementById("wheelPage");
    if (!page) return;
    const turningOn = !page.classList.contains("realm-view");
    if (turningOn) renderRealm();
    page.classList.toggle("realm-view", turningOn);
    syncEyeButton();
}

function syncEyeButton() {
    const btn = document.getElementById("eyeButton");
    const page = document.getElementById("wheelPage");
    if (!btn || !page) return;
    const on = page.classList.contains("realm-view");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
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

    if (gameState.unlimitedSpins) {
        el.textContent = `⚡ ∞ · 🕵️ deal sealed`;
    } else if (cur >= max) {
        el.textContent = `⚡ ${cur} / ${max}`;
    } else {
        const ms = spinsRegenInMs() ?? 0;
        const total = Math.ceil(ms / 1000);
        const mm = String(Math.floor(total / 60)).padStart(2, "0");
        const ss = String(total % 60).padStart(2, "0");
        el.textContent = `⚡ ${cur} / ${max} · +1 in ${mm}:${ss}`;
    }
    const empty = !gameState.unlimitedSpins && cur <= 0;
    el.classList.toggle("empty", empty);
    if (spinBtn) spinBtn.classList.toggle("no-spins", empty);

    // Keep the Spin Shop's status line in sync while it's open.
    if (typeof refreshSpinShop === "function") refreshSpinShop();
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

// Sum gold-equivalent value of an effects object using the active kingdom's
// canonical rates (defaults: gold=1, food=0.5, manpower=3, favor=2 — see
// BASE_RESOURCE_VALUE / per-kingdom overrides in cardSystem.js).
function goldEquivalent(effects) {
    if (!effects) return 0;
    return Object.entries(effects).reduce(
        (sum, [res, amt]) => sum + amt * (getResourceValue(res) || 0),
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

    titleEl.textContent = `${CATEGORY_ICON.trade} Insider Trade`;
    descEl.textContent = "Your stewards open the kingdom's coffers — settle a trade at the realm's standing rates.";

    optionsEl.innerHTML = `
        <div class="card-icon large">${CATEGORY_ICON.trade}</div>
        <div class="card-actions">
            <button data-action="trade" class="primary">Trade</button>
            <button data-action="pass" class="secondary">Pass</button>
        </div>
    `;
}

// Merchant offer card: shows "X 🌾 → Y 💰" on a green button whose fill
// drains left-to-right over MERCHANT_DECISION_MS. The animation is driven
// by a CSS transition on transform: scaleX, anchored at the right edge so
// the *left* side of the green empties first (the player can sense how
// much time is left without reading a number).
function renderMerchantCard(offer) {
    document.getElementById('emergencyClose').style.display = 'none';

    const titleEl = document.getElementById("auguryTitle");
    const descEl = document.getElementById("auguryDescription");
    const optionsEl = document.getElementById("auguryOptions");

    titleEl.textContent = `${CATEGORY_ICON.merchant} A Merchant Approaches`;
    descEl.textContent = "A wandering trader makes a single offer. Decide quickly — they will not wait.";

    const fromIcon = RESOURCE_ICON[offer.fromRes];
    const toIcon   = RESOURCE_ICON[offer.toRes];

    optionsEl.innerHTML = `
        <div class="card-icon large">${CATEGORY_ICON.merchant}</div>
        <div class="card-actions">
            <button data-action="merchantTrade" class="primary merchant-trade">
                <span class="merchant-trade-fill"></span>
                <span class="merchant-trade-label">${offer.fromAmt}${fromIcon} → ${offer.toAmt}${toIcon}</span>
            </button>
            <button data-action="merchantPass" class="secondary">Pass</button>
        </div>
    `;

    // Kick off the drain animation on the next frame so the transition fires
    // (CSS transitions only animate when the *changed* state is applied
    // after the element is already in the DOM with the *initial* state).
    const fill = optionsEl.querySelector('.merchant-trade-fill');
    if (fill) {
        fill.style.transform = 'scaleX(1)';
        fill.style.transition = 'none';
        // Force reflow so the transition starts from the full state.
        void fill.offsetWidth;
        fill.style.transition = 'transform 6s linear';
        fill.style.transform = 'scaleX(0)';
    }
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
