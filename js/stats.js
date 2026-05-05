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

function showStatsOverlay() {
    renderStats();
    const overlay = document.getElementById("statsOverlay");
    if (overlay) overlay.classList.remove("hidden");
}

function hideStatsOverlay() {
    const overlay = document.getElementById("statsOverlay");
    if (overlay) overlay.classList.add("hidden");
}
