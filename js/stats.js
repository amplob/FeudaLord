// =====================================================
// PLAYER STATISTICS / RECORDS
// =====================================================
// Persisted in its own localStorage slot so "Reset Game" never wipes it.
// Tracks all-time peaks (resources), kingdom wins, completed games, and
// activity totals. Updated incrementally from a few hooks in game.js.

const STATS_KEY = "feudal-lord-stats";

function _emptyKingdomsTable() {
    const t = {};
    if (typeof KINGDOMS !== "undefined") {
        for (const k of KINGDOMS) t[k.id] = 0;
    }
    return t;
}

function defaultStats() {
    return {
        bestResources: { gold: 0, food: 0, manpower: 0, favor: 0 },
        kingdomsWon: _emptyKingdomsTable(),
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalSpins: 0,
        firstPlayedAt: null,
    };
}

function loadStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return defaultStats();
        const parsed = JSON.parse(raw);
        const base = defaultStats();
        return {
            ...base,
            ...parsed,
            bestResources: { ...base.bestResources, ...(parsed.bestResources || {}) },
            kingdomsWon:   { ...base.kingdomsWon,   ...(parsed.kingdomsWon   || {}) },
        };
    } catch (_) {
        return defaultStats();
    }
}

let _stats = null;
function getStats() {
    if (!_stats) _stats = loadStats();
    return _stats;
}

function saveStats() {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(getStats()));
    } catch (_) { /* quota exceeded or storage disabled */ }
}

// Called after every applyResourceChange. Cheap — usually a no-op.
function updateBestResources(resources) {
    if (!resources) return;
    const stats = getStats();
    let changed = false;
    for (const k of ["gold", "food", "manpower", "favor"]) {
        const v = resources[k];
        if (typeof v === "number" && v > stats.bestResources[k]) {
            stats.bestResources[k] = v;
            changed = true;
        }
    }
    if (changed) saveStats();
}

function recordSpin() {
    const stats = getStats();
    stats.totalSpins += 1;
    if (stats.firstPlayedAt == null) stats.firstPlayedAt = Date.now();
    saveStats();
}

// Called once per terminating game. `kingdomId` is the kingdom on which the
// run ended. `won` distinguishes the two outcomes since both go through
// endGame() with different messages.
function recordGameEnd(won, kingdomId) {
    const stats = getStats();
    stats.gamesPlayed += 1;
    if (won) {
        stats.gamesWon += 1;
        if (kingdomId) {
            stats.kingdomsWon[kingdomId] = (stats.kingdomsWon[kingdomId] || 0) + 1;
        }
    } else {
        stats.gamesLost += 1;
    }
    saveStats();
}

// =====================================================
// RENDER
// =====================================================
// Pulls the live stats and writes them into the #statsOverlay markup.

function renderStats() {
    const body = document.getElementById("statsBody");
    if (!body) return;
    const s = getStats();

    const ICONS = { gold: "💰", food: "🌾", manpower: "👥", favor: "👑" };
    const RESOURCE_LABEL = { gold: "Gold", food: "Food", manpower: "Manpower", favor: "Favor" };

    const peaksRows = ["gold", "food", "manpower", "favor"].map(k =>
        `<tr><td>${ICONS[k]} ${RESOURCE_LABEL[k]}</td><td class="num">${s.bestResources[k]}</td></tr>`
    ).join("");

    const kingdomList = (typeof KINGDOMS !== "undefined" ? KINGDOMS : []);
    const kingdomRows = kingdomList.map(k =>
        `<tr><td>${k.icon} ${k.name}</td><td class="num">${s.kingdomsWon[k.id] || 0}</td></tr>`
    ).join("");

    const winRate = s.gamesPlayed > 0
        ? `${Math.round((s.gamesWon / s.gamesPlayed) * 100)}%`
        : "—";

    body.innerHTML = `
        <section class="stats-block">
            <h3>Records</h3>
            <table class="stats-table">${peaksRows}</table>
        </section>
        <section class="stats-block">
            <h3>Kingdoms Won</h3>
            <table class="stats-table">${kingdomRows || '<tr><td colspan="2" class="muted">No kingdoms loaded</td></tr>'}</table>
        </section>
        <section class="stats-block">
            <h3>Career</h3>
            <table class="stats-table">
                <tr><td>Games played</td><td class="num">${s.gamesPlayed}</td></tr>
                <tr><td>Games won</td>   <td class="num">${s.gamesWon}</td></tr>
                <tr><td>Games lost</td>  <td class="num">${s.gamesLost}</td></tr>
                <tr><td>Win rate</td>    <td class="num">${winRate}</td></tr>
                <tr><td>Total spins</td> <td class="num">${s.totalSpins}</td></tr>
            </table>
        </section>
    `;
}

// =====================================================
// PER-TURN HISTORY (chart data)
// =====================================================
// One snapshot per turn lives in gameState.history so it persists with the
// save and resets with the run. Income is the passive perTurn flow that the
// resource bar shows — the same value that gets applied next spin.

const HISTORY_MAX = 500;
const RESOURCE_KEYS = ["gold", "food", "manpower", "favor"];
const RESOURCE_COLORS = {
    gold:     "#d4af37",
    food:     "#6fa84a",
    manpower: "#5b8ec7",
    favor:    "#b06fc4",
};
const RESOURCE_ICONS_CHART = { gold: "💰", food: "🌾", manpower: "👥", favor: "👑" };

function recordTurnSnapshot() {
    if (!gameState) return;
    if (!Array.isArray(gameState.history)) gameState.history = [];

    const income = (typeof calculateTotalPassiveIncome === "function")
        ? calculateTotalPassiveIncome()
        : { gold: 0, food: 0, manpower: 0, favor: 0 };

    const snapshot = {
        turn: gameState.turn,
        resources: {
            gold:     gameState.resources.gold     || 0,
            food:     gameState.resources.food     || 0,
            manpower: gameState.resources.manpower || 0,
            favor:    gameState.resources.favor    || 0,
        },
        income: {
            gold:     income.gold     || 0,
            food:     income.food     || 0,
            manpower: income.manpower || 0,
            favor:    income.favor    || 0,
        },
    };

    // Coalesce same-turn entries (e.g. seeded snapshot then a turn that
    // didn't increment for some reason): replace, never duplicate.
    const last = gameState.history[gameState.history.length - 1];
    if (last && last.turn === snapshot.turn) {
        gameState.history[gameState.history.length - 1] = snapshot;
    } else {
        gameState.history.push(snapshot);
    }

    if (gameState.history.length > HISTORY_MAX) {
        gameState.history.splice(0, gameState.history.length - HISTORY_MAX);
    }
}

// =====================================================
// CHART RENDER (8-line resource history)
// =====================================================
// 4 solid lines for resource stocks, 4 dashed lines for /turn income, same
// color per resource. Dual y-axis: stocks on the left, income on the right.

function renderStatsChart() {
    const chartEl = document.getElementById("statsChart");
    const legendEl = document.getElementById("statsChartLegend");
    if (!chartEl) return;

    const history = (gameState && Array.isArray(gameState.history)) ? gameState.history : [];

    if (history.length < 2) {
        chartEl.innerHTML = '<div class="chart-empty">Play a few turns to see your trends.</div>';
        if (legendEl) legendEl.innerHTML = "";
        return;
    }

    const W = 600, H = 290;
    const PAD_L = 44, PAD_R = 44, PAD_T = 26, PAD_B = 30;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const turns = history.map(h => h.turn);
    const xMin = turns[0];
    const xMax = turns[turns.length - 1];

    let resMax = 0;
    let incMin = 0;
    let incMax = 0;
    for (const h of history) {
        for (const k of RESOURCE_KEYS) {
            const r = h.resources[k] || 0;
            const i = h.income[k] || 0;
            if (r > resMax) resMax = r;
            if (i < incMin) incMin = i;
            if (i > incMax) incMax = i;
        }
    }
    if (resMax === 0) resMax = 1;
    const incRange = Math.max(1, incMax - incMin);

    const xScale = (t) => (xMax === xMin)
        ? PAD_L + innerW / 2
        : PAD_L + ((t - xMin) / (xMax - xMin)) * innerW;
    const yResScale = (v) => PAD_T + innerH - (v / resMax) * innerH;
    const yIncScale = (v) => PAD_T + innerH - ((v - incMin) / incRange) * innerH;

    const linePoints = (key, isIncome) => history.map(h => {
        const v = isIncome ? (h.income[key] || 0) : (h.resources[key] || 0);
        const x = xScale(h.turn);
        const y = isIncome ? yIncScale(v) : yResScale(v);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const lines = [];
    for (const k of RESOURCE_KEYS) {
        lines.push(
            `<polyline points="${linePoints(k, false)}" fill="none" stroke="${RESOURCE_COLORS[k]}" `
            + `stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />`
        );
    }
    for (const k of RESOURCE_KEYS) {
        lines.push(
            `<polyline points="${linePoints(k, true)}" fill="none" stroke="${RESOURCE_COLORS[k]}" `
            + `stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round" />`
        );
    }

    // Left axis (stocks) — 5 ticks 0..resMax
    const RES_TICKS = 4;
    const resAxis = [];
    for (let i = 0; i <= RES_TICKS; i++) {
        const v = (resMax * i) / RES_TICKS;
        const y = yResScale(v);
        resAxis.push(
            `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="chart-grid"/>`
            + `<text x="${PAD_L - 6}" y="${(y + 3).toFixed(1)}" class="chart-axis-label" text-anchor="end">${Math.round(v)}</text>`
        );
    }

    // Right axis (income)
    const INC_TICKS = 4;
    const incAxis = [];
    for (let i = 0; i <= INC_TICKS; i++) {
        const v = incMin + (incRange * i) / INC_TICKS;
        const y = yIncScale(v);
        const label = Number.isInteger(v) ? String(v) : v.toFixed(1);
        incAxis.push(
            `<text x="${W - PAD_R + 6}" y="${(y + 3).toFixed(1)}" class="chart-axis-label" text-anchor="start">${label}</text>`
        );
    }

    // X-axis turn ticks
    const xTickCount = Math.min(6, Math.max(2, history.length));
    const xTicks = [];
    for (let i = 0; i < xTickCount; i++) {
        const t = Math.round(xMin + ((xMax - xMin) * i) / Math.max(1, xTickCount - 1));
        const x = xScale(t);
        xTicks.push(
            `<text x="${x.toFixed(1)}" y="${(H - PAD_B + 16).toFixed(1)}" class="chart-axis-label" text-anchor="middle">${t}</text>`
        );
    }

    // Zero line for income axis (only if range straddles zero)
    let zeroLine = "";
    if (incMin < 0 && incMax > 0) {
        const y = yIncScale(0);
        zeroLine = `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="chart-zero"/>`;
    }

    chartEl.innerHTML =
        `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="none" role="img" aria-label="Resources over time">`
        + resAxis.join("")
        + zeroLine
        + lines.join("")
        + incAxis.join("")
        + xTicks.join("")
        + `<text x="${PAD_L}" y="14" class="chart-axis-title" text-anchor="start">stock</text>`
        + `<text x="${W - PAD_R}" y="14" class="chart-axis-title" text-anchor="end">/turn</text>`
        + `</svg>`;

    if (legendEl) {
        legendEl.innerHTML = RESOURCE_KEYS.map(k => `
            <div class="legend-item">
                <span class="legend-icon">${RESOURCE_ICONS_CHART[k]}</span>
                <span class="legend-line solid" style="background:${RESOURCE_COLORS[k]}"></span>
                <span class="legend-label">stock</span>
                <span class="legend-line dashed" style="--c:${RESOURCE_COLORS[k]}"></span>
                <span class="legend-label">/turn</span>
            </div>
        `).join("");
    }
}
