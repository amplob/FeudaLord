// =====================================================
// DEBUG / SIMULATION TOOLS
// =====================================================
// Runs multiple playthroughs with random decisions to
// evaluate game balance. Bypasses affordability checks
// and allows negative resources so each run completes all
// turns (no early termination on win/loss).
// =====================================================

const DEBUG = true;
const SIM_RUNS = 10;
const SIM_TURNS = 50;

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
    if (gameState.turn < card.minTurn) return false;
    if (card.isUnique && playedCardTypes.has(card.typeId)) return false;
    if (card.maxInstances !== null && countActiveInstances(card.typeId) >= card.maxInstances) return false;
    if (card.dependencies?.length && !card.dependencies.every(d => hasActiveCard(d))) return false;
    if (card.blockedBy?.length && card.blockedBy.some(b => hasActiveCard(b))) return false;
    return true;
}

function selectCardDebug(category) {
    const eligible = allCards.filter(c => c.category === category && isCardEligibleDebug(c));
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

function simulateSingleRun(numTurns) {
    // Fresh starting state, independent of whatever the real game holds
    gameState = structuredClone(defaultState);
    gameState.eventFlags = [];
    gameState.staticFlags = [];
    activeCards = [];
    playedCardTypes = new Set();

    for (let t = 0; t < numTurns; t++) {
        // Per-turn event effects + expirations
        const evt = processActiveEvents();
        addResourcesQuiet(evt.perTurnEffects);
        addResourcesQuiet(evt.expireEffects);

        // Passive income from active investments/events
        addResourcesQuiet(calculateTotalPassiveIncome());

        // Spin wheel: uniform over 8 slices. Types: investment / decision / event.
        const wheelResult = wheelConfig[Math.floor(Math.random() * wheelConfig.length)].type;

        const card = selectCardDebug(wheelResult);
        if (card) {
            const instance = createCardInstance(card);

            if (wheelResult === "investment") {
                // Build regardless of affordability
                if (instance.cost) addResourcesQuiet(negateEffects(instance.cost));
                activateCard(instance);
            } else if (wheelResult === "decision") {
                // Random option
                const opt = instance.options[Math.floor(Math.random() * instance.options.length)];
                addResourcesQuiet(opt.effects);
                if (opt.perTurnEffects) {
                    activateCard({
                        instanceId: generateInstanceId(),
                        typeId: `${instance.typeId}_effect`,
                        category: "event",
                        name: `${instance.name} (${opt.label})`,
                        perTurn: opt.perTurnEffects,
                        duration: null,
                        turnsRemaining: null,
                    });
                }
                if (opt.triggersEvent) {
                    const eventCard = allCards.find(c => c.typeId === opt.triggersEvent);
                    if (eventCard) {
                        const eventInstance = createCardInstance(eventCard);
                        if (eventInstance.effects) addResourcesQuiet(eventInstance.effects);
                        if (eventInstance.onActivate) addResourcesQuiet(eventInstance.onActivate);
                        if (eventInstance.duration || eventInstance.perTurn) activateCard(eventInstance);
                        applyFlagMutations(eventInstance, { autoDerivedSets: true });
                    }
                }
                applyFlagMutations(opt);
            } else if (wheelResult === "event") {
                // Instant effects + onActivate apply now; ongoing events activate.
                if (instance.effects) addResourcesQuiet(instance.effects);
                if (instance.onActivate) addResourcesQuiet(instance.onActivate);
                if (instance.duration || instance.perTurn) activateCard(instance);
                applyFlagMutations(instance, { autoDerivedSets: true });
            }
        }

        gameState.turn += 1;
    }

    return { ...gameState.resources };
}

// -----------------------------------------------------
// Multiple runs + aggregation
// -----------------------------------------------------

function simulateMultipleRuns(runs, turns) {
    const snap = snapshotGlobalState();

    const allRuns = [];
    for (let i = 0; i < runs; i++) {
        allRuns.push(simulateSingleRun(turns));
    }

    restoreGlobalState(snap);

    const resourceKeys = ["gold", "food", "manpower", "favor"];
    const stats = {};
    for (const key of resourceKeys) {
        const values = allRuns.map(r => r[key]);
        stats[key] = {
            mean: Math.round(values.reduce((a, b) => a + b, 0) / runs),
            min: Math.min(...values),
            max: Math.max(...values),
        };
    }

    return { stats, allRuns, runs, turns };
}

// -----------------------------------------------------
// Results modal
// -----------------------------------------------------

function showSimResults({ stats, allRuns, runs, turns }) {
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
        `<td style="padding:4px 8px;text-align:right;"><b>${s.mean}</b></td>` +
        `<td style="padding:4px 8px;text-align:right;color:#999;">${s.min} … ${s.max}</td></tr>`;

    const runRow = (r, i) =>
        `<tr><td style="padding:2px 8px;">#${i + 1}</td>` +
        `<td style="padding:2px 8px;text-align:right;">${r.gold}</td>` +
        `<td style="padding:2px 8px;text-align:right;">${r.food}</td>` +
        `<td style="padding:2px 8px;text-align:right;">${r.manpower}</td>` +
        `<td style="padding:2px 8px;text-align:right;">${r.favor}</td></tr>`;

    document.getElementById("simResultsBody").innerHTML = `
        <p style="color:#aaa;margin-bottom:12px;">
            ${runs} runs × ${turns} turns · random decisions · affordability bypassed
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead><tr style="border-bottom:1px solid #555;">
                <th style="padding:4px 8px;text-align:left;">Resource</th>
                <th style="padding:4px 8px;text-align:right;">Mean</th>
                <th style="padding:4px 8px;text-align:right;">Min … Max</th>
            </tr></thead>
            <tbody>
                ${row("💰", "Gold", stats.gold)}
                ${row("🌾", "Food", stats.food)}
                ${row("👥", "Manpower", stats.manpower)}
                ${row("👑", "Favor", stats.favor)}
            </tbody>
        </table>
        <details>
            <summary style="cursor:pointer;color:#aaa;">Per-run values</summary>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
                <thead><tr style="border-bottom:1px solid #555;color:#aaa;">
                    <th style="padding:2px 8px;text-align:left;">Run</th>
                    <th style="padding:2px 8px;text-align:right;">💰</th>
                    <th style="padding:2px 8px;text-align:right;">🌾</th>
                    <th style="padding:2px 8px;text-align:right;">👥</th>
                    <th style="padding:2px 8px;text-align:right;">👑</th>
                </tr></thead>
                <tbody>${allRuns.map(runRow).join("")}</tbody>
            </table>
        </details>
    `;

    overlay.classList.remove("hidden");
    console.log("Simulation result:", { stats, allRuns });
}

// -----------------------------------------------------
// Wire up debug button
// -----------------------------------------------------

function addDebugButton() {
    if (!DEBUG) return;
    const actions = document.querySelector(".header-actions");
    if (!actions) return;

    const btn = document.createElement("button");
    btn.textContent = `🧪 Test ${SIM_RUNS}×${SIM_TURNS}`;
    btn.className = "header-btn";
    btn.title = `Run ${SIM_RUNS} simulations of ${SIM_TURNS} turns each`;
    btn.addEventListener("click", () => {
        showSimResults(simulateMultipleRuns(SIM_RUNS, SIM_TURNS));
    });
    actions.appendChild(btn);
}

document.addEventListener("DOMContentLoaded", addDebugButton);
