// =====================================================
// DEBUG / SIMULATION TOOLS
// =====================================================
// Runs multiple playthroughs with random decisions to
// evaluate game balance. Bypasses affordability checks
// and allows negative resources so each run completes all
// turns (no early termination on win/loss).
// =====================================================

const DEBUG = true;
const SIM_RUNS = 100;
const SIM_TURNS = 100;

// -----------------------------------------------------
// Snapshot / restore
// -----------------------------------------------------

function snapshotGlobalState() {
    return {
        gameState: structuredClone(gameState),
        activeCards: structuredClone(activeCards),
        playedCardTypes: new Set(playedCardTypes),
        instanceCounter: instanceCounter,
    };
}

function restoreGlobalState(snap) {
    gameState = snap.gameState;
    activeCards = snap.activeCards;
    playedCardTypes = snap.playedCardTypes;
    instanceCounter = snap.instanceCounter;
}

// -----------------------------------------------------
// Debug-mode card selection (skips requiresResource check)
// -----------------------------------------------------

function isCardEligibleDebug(card) {
    // Skip flag-gated cards entirely. The sim doesn't simulate flag/story
    // state, so including them would either misreport balance (if we
    // bypassed the check) or never fire them (if we honored it). Story
    // arcs get their own focused sim runs that set the relevant flags.
    if (card.requiresEventFlag) return false;
    if (card.blockedByEventFlag) return false;
    if (card.requiresStaticFlag) return false;
    if (card.blockedByStaticFlag) return false;

    if (gameState.turn < card.minTurn) return false;
    if (card.isUnique && playedCardTypes.has(card.typeId)) return false;
    if (card.maxInstances !== null && countActiveInstances(card.typeId) >= card.maxInstances) return false;
    if (card.dependencies?.length && !card.dependencies.every(d => hasActiveCard(d))) return false;
    if (card.blockedBy?.length && card.blockedBy.some(b => hasActiveCard(b))) return false;
    return true;
}

function selectCardDebug(category, tonality) {
    const eligible = allCards.filter(c => {
        if (c.category !== category) return false;
        if (tonality && c.tonality !== tonality) return false;
        return isCardEligibleDebug(c);
    });
    if (eligible.length === 0) return null;

    for (const card of eligible) {
        if (card.absoluteChance && card.absoluteChance > 0 && Math.random() * 100 < card.absoluteChance) {
            return card;
        }
    }

    const weighted = eligible.filter(c => c.weight > 0);
    if (weighted.length === 0) return eligible[Math.floor(Math.random() * eligible.length)];

    const total = weighted.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    for (const card of weighted) {
        r -= card.weight;
        if (r <= 0) return card;
    }
    return weighted[weighted.length - 1];
}

// -----------------------------------------------------
// Resource mutation (no UI side effects)
// -----------------------------------------------------

function addResourcesQuiet(change) {
    if (!change) return;
    for (const [resource, amount] of Object.entries(change)) {
        if (typeof amount === "number") {
            gameState.resources[resource] = (gameState.resources[resource] || 0) + amount;
        }
    }
}

// -----------------------------------------------------
// Single simulated run (always runs the full N turns)
// -----------------------------------------------------

function simulateSingleRun(numTurns, sliceTypeFilter = null) {
    // Fresh starting state, independent of whatever the real game holds
    gameState = structuredClone(defaultState);
    gameState.eventFlags = [];
    gameState.staticFlags = [];
    activeCards = [];
    playedCardTypes = new Set();

    const slicePool = sliceTypeFilter
        ? wheelConfig.filter(s => s.type === sliceTypeFilter)
        : wheelConfig;

    for (let t = 0; t < numTurns; t++) {
        // Per-turn event effects + expirations
        const evt = processActiveEvents();
        addResourcesQuiet(evt.perTurnEffects);
        addResourcesQuiet(evt.expireEffects);

        // Passive income from active investments/events
        addResourcesQuiet(calculateTotalPassiveIncome());

        // Spin wheel: uniform over slicePool. Each slice carries type, tonality,
        // and multiplier. Trade slices skip card draw (sim doesn't trade).
        const slice = slicePool[Math.floor(Math.random() * slicePool.length)];
        const { type: wheelResult, tonality, multiplier: sliceMultiplier } = slice;

        if (wheelResult === "trade") {
            gameState.turn += 1;
            continue;
        }

        const tonalityFilter = wheelResult === "event" ? tonality : undefined;
        const card = selectCardDebug(wheelResult, tonalityFilter);
        if (card) {
            const instance = createCardInstance(card, { sliceMultiplier });

            if (wheelResult === "investment") {
                // Build regardless of affordability
                if (instance.cost) addResourcesQuiet(negateEffects(instance.cost));
                activateCard(instance);
            } else if (wheelResult === "decision") {
                // Random option
                const opt = instance.options[Math.floor(Math.random() * instance.options.length)];
                addResourcesQuiet(opt.effects);
                if (opt.triggersEvent) {
                    const eventCard = allCards.find(c => c.typeId === opt.triggersEvent);
                    if (eventCard) {
                        applyEventInstance(createCardInstance(eventCard), addResourcesQuiet);
                    }
                }
                applyFlagMutations(opt);
            } else if (wheelResult === "event") {
                applyEventInstance(instance, addResourcesQuiet);
            }
        }

        gameState.turn += 1;
    }

    return { ...gameState.resources };
}

// -----------------------------------------------------
// Multiple runs + aggregation
// -----------------------------------------------------

function simulateMultipleRuns(runs, turns, sliceTypeFilter = null) {
    const snap = snapshotGlobalState();

    const allRuns = [];
    for (let i = 0; i < runs; i++) {
        allRuns.push(simulateSingleRun(turns, sliceTypeFilter));
    }

    restoreGlobalState(snap);

    const resourceKeys = ["gold", "food", "manpower", "favor"];
    const stats = {};
    for (const key of resourceKeys) {
        const values = allRuns.map(r => r[key]);
        stats[key] = {
            mean: Math.round(values.reduce((a, b) => a + b, 0) / runs),
        };
    }

    return { stats, allRuns, runs, turns, sliceTypeFilter };
}

// -----------------------------------------------------
// Results modal
// -----------------------------------------------------

// Cards with any flag/story field — excluded from sim by isCardEligibleDebug.
function countFlagGatedCards() {
    return allCards.filter(c =>
        c.requiresEventFlag || c.blockedByEventFlag ||
        c.requiresStaticFlag || c.blockedByStaticFlag
    ).length;
}

function showSimResults({ stats, allRuns, runs, turns, sliceTypeFilter }) {
    const modeLabel = sliceTypeFilter
        ? `${sliceTypeFilter} only`
        : "full wheel";
    const excluded = countFlagGatedCards();
    const excludedNote = excluded > 0
        ? ` · ${excluded} flag-gated card${excluded === 1 ? "" : "s"} excluded`
        : "";
    let overlay = document.getElementById("simResultsOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "simResultsOverlay";
        overlay.className = "overlay";
        overlay.style.zIndex = "400"; // above header (250), toast (300), and other overlays
        overlay.innerHTML = `
            <div class="overlay-content" style="max-width: 520px;">
                <div class="overlay-header">
                    <h2>🧪 Simulation Results</h2>
                    <button class="close-btn" id="simResultsClose">✕</button>
                </div>
                <div id="simResultsBody" style="padding: 0 4px;"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById("simResultsClose").addEventListener("click", () => {
            overlay.classList.add("hidden");
        });
        overlay.addEventListener("click", (e) => {
            if (e.target.id === "simResultsOverlay") overlay.classList.add("hidden");
        });
    }

    const row = (icon, label, s) =>
        `<tr><td style="padding:4px 8px;">${icon} ${label}</td>` +
        `<td style="padding:4px 8px;text-align:right;"><b>${s.mean}</b></td></tr>`;

    document.getElementById("simResultsBody").innerHTML = `
        <p style="color:#aaa;margin-bottom:12px;">
            ${runs} runs × ${turns} turns · ${modeLabel} · random decisions · affordability bypassed${excludedNote}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead><tr style="border-bottom:1px solid #555;">
                <th style="padding:4px 8px;text-align:left;">Resource</th>
                <th style="padding:4px 8px;text-align:right;">Mean</th>
            </tr></thead>
            <tbody>
                ${row("💰", "Gold", stats.gold)}
                ${row("🌾", "Food", stats.food)}
                ${row("👥", "Manpower", stats.manpower)}
                ${row("👑", "Favor", stats.favor)}
            </tbody>
        </table>
    `;

    overlay.classList.remove("hidden");
    console.log("Simulation result:", { stats, allRuns });
}

// -----------------------------------------------------
// Test picker modal
// -----------------------------------------------------

const SIM_MODES = [
    { id: "full",     label: "Full test",     filter: null,         desc: "Standard wheel (all slice types)" },
    { id: "event",    label: "Event test",    filter: "event",      desc: "Only event slices fire each turn" },
    { id: "decision", label: "Decision test", filter: "decision",   desc: "Only decision slices fire each turn" },
];

function showTestPicker() {
    let overlay = document.getElementById("testPickerOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "testPickerOverlay";
        overlay.className = "overlay";
        overlay.style.zIndex = "400";
        overlay.innerHTML = `
            <div class="overlay-content" style="max-width: 480px;">
                <div class="overlay-header">
                    <h2>🧪 Tests</h2>
                    <button class="close-btn" id="testPickerClose">✕</button>
                </div>
                <div id="testPickerBody" class="option-list"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById("testPickerClose").addEventListener("click", () => {
            overlay.classList.add("hidden");
        });
        overlay.addEventListener("click", (e) => {
            if (e.target.id === "testPickerOverlay") overlay.classList.add("hidden");
        });

        const body = document.getElementById("testPickerBody");
        for (const mode of SIM_MODES) {
            const btn = document.createElement("button");
            btn.className = "option";
            btn.innerHTML = `<strong>${mode.label} ${SIM_RUNS}×${SIM_TURNS}</strong><span style="color:#aaa;font-size:0.9rem;">${mode.desc}</span>`;
            btn.addEventListener("click", () => {
                overlay.classList.add("hidden");
                showSimResults(simulateMultipleRuns(SIM_RUNS, SIM_TURNS, mode.filter));
            });
            body.appendChild(btn);
        }
    }

    overlay.classList.remove("hidden");
}

// -----------------------------------------------------
// Wire up debug button
// -----------------------------------------------------

function addDebugButton() {
    if (!DEBUG) return;
    const actions = document.querySelector(".header-actions");
    if (!actions) return;

    const btn = document.createElement("button");
    btn.textContent = "🧪 Test";
    btn.className = "header-btn";
    btn.title = "Open test picker";
    btn.addEventListener("click", showTestPicker);
    actions.appendChild(btn);
}

document.addEventListener("DOMContentLoaded", addDebugButton);
