// =====================================================
// CARD SYSTEM
// =====================================================
// Manages card selection, eligibility, and randomization.
// =====================================================

// Canonical per-category icons. Single source of truth: wheel slices and
// augury card titles both reference this so they stay in lockstep.
const CATEGORY_ICON = {
    investment: "🔨",
    decision: "🎭",
    event: "❓",
    // "trade" = insider trade in the kingdom — open, no timer, fixed rates.
    trade: "⚖️",
    // "merchant" = wandering merchant — single random offer, timer to accept.
    merchant: "🛒",
};

// All cards combined (populated on init)
let allCards = [];

// Active instances (investments built, events running)
let activeCards = [];

// Cards that have been played (for tracking unique cards)
let playedCardTypes = new Set();

// =====================================================
// INITIALIZATION
// =====================================================

function initCardSystem() {
    // Combine all card arrays
    allCards = [
        ...investmentCards,
        ...decisionCards,
        ...eventCards
    ];

    console.log(`Card system initialized with ${allCards.length} cards`);
    console.log(`- Investments: ${investmentCards.length}`);
    console.log(`- Decisions: ${decisionCards.length}`);
    console.log(`- Events: ${eventCards.length}`);

    validateCards();
}

// =====================================================
// CARD VALIDATOR (DEBUG only)
// =====================================================
// Runs at init to catch the kinds of typos that otherwise surface as "the
// sim looks a bit off" or "this card never appears": duplicate typeIds,
// dangling cross-card references, mixed decision schemas, dead events,
// resource/flag name typos. console.error per problem; doesn't block init.

function validateCards() {
    if (typeof DEBUG !== "undefined" && !DEBUG) return 0;

    let problems = 0;
    const log = (msg) => { console.error(`[card-validator] ${msg}`); problems++; };

    const validResources = new Set(Object.keys(RESOURCE_VALUE));
    const checkResources = (obj, where) => {
        for (const r of Object.keys(obj || {})) {
            if (!validResources.has(r)) log(`${where}: unknown resource "${r}"`);
        }
    };

    // Build lookup tables: typeId index, event ids, flags that anyone declares.
    const byId = new Map();
    const eventIds = new Set();
    const seedStatic = (typeof defaultState !== "undefined" && defaultState.staticFlags) || [];
    const setFlags = { event: new Set(), static: new Set(seedStatic) };

    for (const c of allCards) {
        if (byId.has(c.typeId)) {
            log(`duplicate typeId "${c.typeId}" (${byId.get(c.typeId).category} + ${c.category})`);
        } else {
            byId.set(c.typeId, c);
        }
        if (c.category === "event") eventIds.add(c.typeId);
        asFlagArray(c.setsEventFlag).forEach(f => setFlags.event.add(f));
        asFlagArray(c.setsStaticFlag).forEach(f => setFlags.static.add(f));
        for (const opt of c.options || []) {
            asFlagArray(opt.setsEventFlag).forEach(f => setFlags.event.add(f));
            asFlagArray(opt.setsStaticFlag).forEach(f => setFlags.static.add(f));
        }
    }

    const validKingdoms = (typeof KINGDOMS !== "undefined")
        ? new Set(KINGDOMS.map(k => k.id))
        : null;

    for (const c of allCards) {
        const tag = `${c.category}/${c.typeId}`;

        // Cross-card refs
        for (const dep of c.dependencies || []) {
            if (!byId.has(dep)) log(`${tag}: dependency "${dep}" not found`);
        }
        for (const bk of c.blockedBy || []) {
            if (!byId.has(bk)) log(`${tag}: blockedBy "${bk}" not found`);
        }

        // Kingdom lock must reference a real kingdom.
        if (c.kingdom && validKingdoms && !validKingdoms.has(c.kingdom)) {
            log(`${tag}: kingdom "${c.kingdom}" — no such kingdom`);
        }

        // Resource keys in eligibility / payloads
        checkResources(c.requiresResource, `${tag}.requiresResource`);

        // Flag references must resolve to a flag that some card sets
        // (or, for static, was seeded by defaultState).
        for (const f of asFlagArray(c.requiresEventFlag)) {
            if (!setFlags.event.has(f)) log(`${tag}: requiresEventFlag "${f}" — no card sets it`);
        }
        for (const f of asFlagArray(c.blockedByEventFlag)) {
            if (!setFlags.event.has(f)) log(`${tag}: blockedByEventFlag "${f}" — no card sets it`);
        }
        for (const f of asFlagArray(c.requiresStaticFlag)) {
            if (!setFlags.static.has(f)) log(`${tag}: requiresStaticFlag "${f}" — never set`);
        }
        for (const f of asFlagArray(c.blockedByStaticFlag)) {
            if (!setFlags.static.has(f)) log(`${tag}: blockedByStaticFlag "${f}" — never set`);
        }

        // Per-category checks
        if (c.category === "investment") {
            if (!c.baseCost) log(`${tag}: investment missing baseCost`);
            if (!c.basePerTurn) log(`${tag}: investment missing basePerTurn`);
            checkResources(c.baseCost, `${tag}.baseCost`);
            checkResources(c.basePerTurn, `${tag}.basePerTurn`);
        }

        if (c.category === "event") {
            if (!c.tonality) log(`${tag}: event missing tonality (good/bad)`);
            const hasInstant = typeof c.eventBase === "number" && c.outputRes;
            const hasOnActivate = c.onActivate && Object.keys(c.onActivate).length > 0;
            const hasPerTurn = c.perTurnEffects && Object.keys(c.perTurnEffects).length > 0;
            const hasOnExpire = c.onExpire && Object.keys(c.onExpire).length > 0;
            if (!hasInstant && !hasOnActivate && !hasPerTurn && !hasOnExpire) {
                log(`${tag}: event has no eventBase / onActivate / perTurnEffects / onExpire — does nothing`);
            }
            if (c.outputRes && !validResources.has(c.outputRes)) log(`${tag}: outputRes "${c.outputRes}" invalid`);
            checkResources(c.onActivate, `${tag}.onActivate`);
            checkResources(c.perTurnEffects, `${tag}.perTurnEffects`);
            checkResources(c.onExpire, `${tag}.onExpire`);
        }

        if (c.category === "decision") {
            if (!c.options || c.options.length === 0) {
                log(`${tag}: decision has no options`);
                continue;
            }
            // Card-level qualityFactors must exist and match the options length.
            // Shuffled and assigned to options at draw time (see createCardInstance).
            if (!Array.isArray(c.qualityFactors) || c.qualityFactors.length !== c.options.length) {
                log(`${tag}: qualityFactors must be an array of the same length as options (${c.options.length})`);
            }
            // Legacy fixed-output fields are no longer supported.
            if (c.outputRes || typeof c.outputBase === "number") {
                log(`${tag}: card-level outputRes/outputBase is the old fixed-output schema — every option must declare its own inputRes/outputRes/inputBase instead`);
            }
            for (const opt of c.options) {
                if (opt.triggersEvent && !eventIds.has(opt.triggersEvent)) {
                    log(`${tag}: option "${opt.label}" triggersEvent "${opt.triggersEvent}" — no such event`);
                }
                if (opt.perTurnEffects) {
                    log(`${tag}: option "${opt.label}" has perTurnEffects — define a real event card and use triggersEvent instead`);
                }
                if ("qualityFactor" in opt) {
                    log(`${tag}: option "${opt.label}" has per-option qualityFactor — move it to the card-level qualityFactors array`);
                }
                if (!(opt.inputRes && opt.outputRes && typeof opt.inputBase === "number")) {
                    log(`${tag}: option "${opt.label}" missing inputRes/outputRes/inputBase`);
                } else {
                    // Resource fields may list multiple resources separated by
                    // commas (e.g., "food,gold"). Each must be a valid resource.
                    const ins = parseResources(opt.inputRes);
                    const outs = parseResources(opt.outputRes);
                    if (!ins.length) log(`${tag}: option "${opt.label}" inputRes is empty`);
                    if (!outs.length) log(`${tag}: option "${opt.label}" outputRes is empty`);
                    for (const r of ins) {
                        if (!validResources.has(r)) log(`${tag}: option "${opt.label}" inputRes "${r}" invalid`);
                    }
                    for (const r of outs) {
                        if (!validResources.has(r)) log(`${tag}: option "${opt.label}" outputRes "${r}" invalid`);
                    }
                }
            }
        }
    }

    if (problems === 0) {
        console.log(`[card-validator] ✓ ${allCards.length} cards validated`);
    } else {
        console.error(`[card-validator] ✗ ${problems} problem(s) across ${allCards.length} cards`);
    }
    return problems;
}

// =====================================================
// FLAG SYSTEM
// =====================================================
// Two flavors:
//   - eventFlags: transient ("something is happening"). Two sources:
//       (a) Auto-derived: any active event card with `setsEventFlag: "name"`
//           contributes the flag for its lifetime. No manual cleanup on expiry.
//       (b) Manual: decision options can `setsEventFlag`/`clearsEventFlag`
//           to push/pull entries in gameState.eventFlags directly.
//     hasEventFlag returns true if either source has the flag.
//   - staticFlags: permanent ("something has happened"). Only ever added
//       (by any source); never cleared. Lives in gameState.staticFlags.
// Cards can express eligibility via requiresEventFlag / blockedByEventFlag /
// requiresStaticFlag / blockedByStaticFlag (each: string or array of strings).
// =====================================================

function asFlagArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
}

function hasEventFlag(name) {
    if (gameState.eventFlags && gameState.eventFlags.includes(name)) return true;
    for (const c of activeCards) {
        if (asFlagArray(c.setsEventFlag).includes(name)) return true;
    }
    return false;
}

function hasStaticFlag(name) {
    return !!(gameState.staticFlags && gameState.staticFlags.includes(name));
}

function addEventFlag(name) {
    if (!gameState.eventFlags.includes(name)) gameState.eventFlags.push(name);
}

function removeEventFlag(name) {
    gameState.eventFlags = gameState.eventFlags.filter(f => f !== name);
}

function addStaticFlag(name) {
    if (!gameState.staticFlags.includes(name)) gameState.staticFlags.push(name);
}

// Apply flag mutations from a card (on activation) or option (on choice).
// On event activation, `setsEventFlag` is SKIPPED because it's auto-derived
// from active cards — passing it manually would double-book it.
function applyFlagMutations(src, { autoDerivedSets = false } = {}) {
    if (!src) return;
    if (!autoDerivedSets) asFlagArray(src.setsEventFlag).forEach(addEventFlag);
    asFlagArray(src.clearsEventFlag).forEach(removeEventFlag);
    asFlagArray(src.setsStaticFlag).forEach(addStaticFlag);
}

// =====================================================
// ELIGIBILITY CHECKS
// =====================================================

/**
 * Check if a card is eligible to be drawn.
 */
function isCardEligible(card, state) {
    // Kingdom-locked card: only eligible when its kingdom is the active one.
    if (card.kingdom && state.kingdomId !== card.kingdom) {
        return false;
    }

    // Check minimum turn (legacy gating, kept for non-investment cards)
    if (card.minTurn !== undefined && state.turn < card.minTurn) {
        return false;
    }

    // Check passive income requirements (replaces minTurn for investments)
    if (card.requiresIncome) {
        const income = calculateTotalPassiveIncome();
        for (const [resource, amount] of Object.entries(card.requiresIncome)) {
            if ((income[resource] || 0) < amount) return false;
        }
    }

    // Check if unique card already played
    if (card.isUnique && playedCardTypes.has(card.typeId)) {
        return false;
    }
    
    // Check max instances. For investments this acts as a max LEVEL: building
    // the same one again levels up rather than spawning a second copy.
    if (card.maxInstances !== null) {
        if (card.category === "investment") {
            const existing = activeCards.find(c => c.typeId === card.typeId);
            const currentLevel = existing ? (existing.level || 1) : 0;
            if (currentLevel >= card.maxInstances) return false;
        } else {
            if (countActiveInstances(card.typeId) >= card.maxInstances) return false;
        }
    }
    
    // Check dependencies (all must be satisfied)
    if (card.dependencies && card.dependencies.length > 0) {
        const hasAllDependencies = card.dependencies.every(depTypeId => 
            hasActiveCard(depTypeId)
        );
        if (!hasAllDependencies) {
            return false;
        }
    }
    
    // Check blockers (none must be active)
    if (card.blockedBy && card.blockedBy.length > 0) {
        const isBlocked = card.blockedBy.some(blockerTypeId => 
            hasActiveCard(blockerTypeId)
        );
        if (isBlocked) {
            return false;
        }
    }
    
    // Check required resources
    if (card.requiresResource) {
        for (const [resource, amount] of Object.entries(card.requiresResource)) {
            if (state.resources[resource] < amount) {
                return false;
            }
        }
    }

    // Check flag requirements
    if (card.requiresEventFlag && !asFlagArray(card.requiresEventFlag).every(hasEventFlag)) {
        return false;
    }
    if (card.blockedByEventFlag && asFlagArray(card.blockedByEventFlag).some(hasEventFlag)) {
        return false;
    }
    if (card.requiresStaticFlag && !asFlagArray(card.requiresStaticFlag).every(hasStaticFlag)) {
        return false;
    }
    if (card.blockedByStaticFlag && asFlagArray(card.blockedByStaticFlag).some(hasStaticFlag)) {
        return false;
    }

    return true;
}

/**
 * Get all eligible cards of a specific category.
 * If tonality is provided ("good"/"bad"/"neutral"), also filter by card.tonality.
 */
function getEligibleCards(category, state, tonality) {
    return allCards.filter(card => {
        if (card.category !== category) return false;
        // Shortage events are auto-triggered by manageShortageEvents — never
        // drawn from the wheel, even if their gating happens to allow it.
        if (card.shortageOf) return false;
        if (tonality && card.tonality !== tonality) return false;
        return isCardEligible(card, state);
    });
}

// =====================================================
// CARD SELECTION
// =====================================================

/**
 * Effective weight = base weight × product of active multipliers from weightBoosts.
 * weightBoosts: [{ ifEventFlag?: "name", ifStaticFlag?: "name", multiplier: N }, ...]
 * Each boost whose condition is currently met multiplies the weight by its multiplier.
 * Multiple active boosts stack multiplicatively.
 */
function effectiveWeight(card) {
    let w = card.weight;
    if (!card.weightBoosts) return w;
    for (const boost of card.weightBoosts) {
        if (boost.ifEventFlag && !hasEventFlag(boost.ifEventFlag)) continue;
        if (boost.ifStaticFlag && !hasStaticFlag(boost.ifStaticFlag)) continue;
        w *= (boost.multiplier ?? 1);
    }
    return w;
}

/**
 * Select a random card from eligible cards using weighted probability.
 * Optional tonality filter ("good"/"bad"/"neutral") narrows the pool — used
 * by the wheel to draw only cards matching the landed slice's tonality.
 */
function selectCard(category, state, tonality) {
    const eligibleCards = getEligibleCards(category, state, tonality);

    if (eligibleCards.length === 0) {
        console.warn(`No eligible cards for category: ${category}${tonality ? ` (tonality: ${tonality})` : ""}`);
        return null;
    }

    // First, check for absolute chance cards
    for (const card of eligibleCards) {
        if (card.absoluteChance !== null && card.absoluteChance > 0) {
            const roll = Math.random() * 100;
            if (roll < card.absoluteChance) {
                console.log(`Absolute chance triggered for: ${card.name} (${card.absoluteChance}%)`);
                return card;
            }
        }
    }

    // Filter to cards with effective weight > 0 for normal selection
    const weightedCards = eligibleCards.filter(card => effectiveWeight(card) > 0);

    if (weightedCards.length === 0) {
        return eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
    }

    const totalWeight = weightedCards.reduce((sum, card) => sum + effectiveWeight(card), 0);

    let random = Math.random() * totalWeight;
    for (const card of weightedCards) {
        random -= effectiveWeight(card);
        if (random <= 0) {
            return card;
        }
    }

    return weightedCards[weightedCards.length - 1];
}

// =====================================================
// FORMULA MOTOR
// =====================================================
// Canonical gold-equivalent values per unit. Conversions and
// instant-event sizing are derived from this table.
//
// Kingdoms can override any subset of these via their `resourceValues`
// (data/kingdoms.js). Lower override = "more abundant in that kingdom"
// (cheaper to buy with other resources, more units per fixed g-eq event).

const BASE_RESOURCE_VALUE = { gold: 1, food: 0.5, manpower: 3, favor: 2 };

// Display symbols (used by ui.js formatters).
const RESOURCE_ICON = {
    gold: "💰",
    food: "🌾",
    manpower: "👥",
    favor: "👑",
};

// Kingdom-aware accessor. Reads the override from the active kingdom (if
// any) and falls back to the base table. Used by all formulas, the trade
// panel, and ui.js#goldEquivalent so a single switch of gameState.kingdomId
// re-prices the whole game consistently.
function getResourceValue(resource) {
    if (typeof gameState !== "undefined" && gameState && gameState.kingdomId
        && typeof getKingdom === "function") {
        const k = getKingdom(gameState.kingdomId);
        if (k && k.resourceValues && resource in k.resourceValues) {
            return k.resourceValues[resource];
        }
    }
    return BASE_RESOURCE_VALUE[resource];
}

// Back-compat shim: a few places (the validator's resource-name set, ui.js)
// still want a static-looking RESOURCE_VALUE object. Keep it pointing at
// the BASE table — its only consumer needs the *keys*, not the values.
const RESOURCE_VALUE = BASE_RESOURCE_VALUE;

function canonicalRate(from, to) {
    return getResourceValue(from) / getResourceValue(to);
}

function rollBulk() {
    return 0.5 + Math.random() * 1.5;
}

function rollVariance() {
    return 0.85 + Math.random() * 0.30;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

// In-place Fisher-Yates on a copy; returns the shuffled copy.
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Evaluate tierBoosts against active cards; pick the best multiplier
// among entries whose prereqs (typeIds) are all active. Default 1.0.
function evalTierMultiplier(tierBoosts) {
    if (!tierBoosts || tierBoosts.length === 0) return 1.0;
    let best = 1.0;
    for (const boost of tierBoosts) {
        const prereqs = boost.if || [];
        if (prereqs.every(id => hasActiveCard(id)) && boost.multiplier > best) {
            best = boost.multiplier;
        }
    }
    return best;
}

// Parse a resource list. Accepts a single name ("food"), a
// comma-separated list ("food,gold"), or an array. Trims whitespace and
// drops blanks. Used by decision options to declare multi-resource
// inputs/outputs.
function parseResources(spec) {
    if (Array.isArray(spec)) return spec.map(s => String(s).trim()).filter(Boolean);
    if (typeof spec !== "string") return [];
    return spec.split(",").map(s => s.trim()).filter(Boolean);
}

// Trade-style formula. Supports multi-resource inputs and outputs:
//
//   inputBase is sized in units of the FIRST listed input resource. The
//   total cost (in g-eq) = inputBase × value(firstInput) × bulkRoll, then
//   split EVENLY across all listed input resources. Each input's amount
//   is its share of the total g-eq, converted back into its own units.
//
//   The output's total g-eq = totalInputGEq × qualityFactor × varianceRoll
//   × tierMultiplier. Split evenly across all listed output resources,
//   converted into per-resource amounts the same way.
//
// Single-resource options (the common case) collapse to the original
// behavior: inputAmount = inputBase × bulk in input units, outputAmount =
// inputAmount × canonicalRate × qF × variance × tier in output units.
//
// Returns the resolved per-resource effects object (inputs negative,
// outputs positive, summed if a resource appears on both sides).
function applyTradeFormula({ inputRes, outputRes, inputBase, qualityFactor = 1, tierMultiplier = 1 }) {
    const inputs = parseResources(inputRes);
    const outputs = parseResources(outputRes);
    if (!inputs.length || !outputs.length) return { effects: {} };

    const bulk = rollBulk();
    const variance = rollVariance();
    const totalInputGEq = inputBase * getResourceValue(inputs[0]) * bulk;
    const shareInputGEq = totalInputGEq / inputs.length;
    const totalOutputGEq = totalInputGEq * qualityFactor * variance * tierMultiplier;
    const shareOutputGEq = totalOutputGEq / outputs.length;

    const effects = {};
    for (const r of inputs) {
        const amount = round2(shareInputGEq / getResourceValue(r));
        effects[r] = (effects[r] || 0) - amount;
    }
    for (const r of outputs) {
        const amount = round2(shareOutputGEq / getResourceValue(r));
        effects[r] = round2((effects[r] || 0) + amount);
    }
    return { effects };
}

// Instant-event formula: no input, size is eventBase in gold-equivalent.
// output = eventBase × (1/valueOfTargetResource) × qualityFactor × varianceRoll × tierMultiplier
function applyInstantEventFormula({ outputRes, eventBase, qualityFactor = 1, tierMultiplier = 1 }) {
    const variance = rollVariance();
    const outputAmount = round2(
        eventBase * (1 / getResourceValue(outputRes)) * qualityFactor * variance * tierMultiplier
    );
    return { outputAmount };
}

// Scale every resource amount in an effects object by `factor`.
function scaleEffects(effects, factor) {
    if (!effects) return {};
    const scaled = {};
    for (const [resource, amount] of Object.entries(effects)) {
        scaled[resource] = round2(amount * factor);
    }
    return scaled;
}

// Investment formula: bulk scales cost and yield together (preserves ROI);
// variance perturbs only the yield (quality of the specific build).
function applyInvestmentFormula({ baseCost, basePerTurn }) {
    const bulk = rollBulk();
    const variance = rollVariance();
    return {
        cost: scaleEffects(baseCost, bulk),
        perTurn: scaleEffects(basePerTurn, bulk * variance),
    };
}

// Pick up flag-related fields from a card or option def onto its instance copy.
function copyFlagFields(src) {
    return {
        setsEventFlag: src.setsEventFlag || null,
        clearsEventFlag: src.clearsEventFlag || null,
        setsStaticFlag: src.setsStaticFlag || null,
    };
}

/**
 * Create a card instance with randomized values.
 * `sliceMultiplier` comes from the wheel slice's tonality: >1 for "good" slices
 * (better output per input / bigger positive event), <1 for "bad" (rougher deal /
 * intensified negative event — signs are preserved by multiplication).
 * Investments ignore it (always called with default 1).
 */
function createCardInstance(card, { sliceMultiplier = 1 } = {}) {
    const instance = {
        instanceId: generateInstanceId(),
        typeId: card.typeId,
        category: card.category,
        name: card.name,
        description: card.description,
        icon: card.icon,

        cost: null,
        perTurn: null,

        // For events with duration
        duration: card.duration || null,
        turnsRemaining: card.duration || null,
        tonality: card.tonality || null,

        // Flag hooks (setsEventFlag needed on instance for auto-derived hasEventFlag)
        ...copyFlagFields(card),

        // Original card reference
        _cardDef: card,
    };

    if (card.category === "investment" && card.baseCost && card.basePerTurn) {
        const { cost, perTurn } = applyInvestmentFormula({
            baseCost: card.baseCost,
            basePerTurn: card.basePerTurn,
        });
        instance.cost = cost;
        instance.perTurn = perTurn;
    } else {
        if (card.baseCost) instance.cost = scaleEffects(card.baseCost, 1);
        if (card.basePerTurn) instance.perTurn = scaleEffects(card.basePerTurn, 1);
    }

    // Decisions: each option is an independent inputRes → outputRes trade.
    // The card carries a `qualityFactors` array (one factor per option). At
    // instantiation we shuffle the factors and assign them to options in
    // order, so the "best deal" position is randomised every draw.
    if (card.options) {
        const factors = shuffleArray(card.qualityFactors || []);
        instance.options = card.options.map((opt, i) => {
            if (!(opt.inputRes && opt.outputRes && typeof opt.inputBase === "number")) {
                console.error(
                    `Decision ${card.typeId} option "${opt.label}" — every option must ` +
                    `define inputRes, outputRes, and inputBase.`
                );
                return {
                    label: opt.label,
                    effects: {},
                    triggersEvent: opt.triggersEvent || null,
                    ...copyFlagFields(opt),
                };
            }
            const tierMultiplier = evalTierMultiplier(opt.tierBoosts) * sliceMultiplier;
            const { effects } = applyTradeFormula({
                inputRes: opt.inputRes,
                outputRes: opt.outputRes,
                inputBase: opt.inputBase,
                qualityFactor: factors[i] ?? 1,
                tierMultiplier,
            });
            return {
                label: opt.label,
                effects,
                triggersEvent: opt.triggersEvent || null,
                ...copyFlagFields(opt),
            };
        });
    }

    // Instant-event effects: eventBase sized in gold-equivalent. Applied on draw.
    // Legacy top-level `effects` still supported.
    if (card.outputRes && typeof card.eventBase === "number") {
        const tierMultiplier = evalTierMultiplier(card.tierBoosts) * sliceMultiplier;
        const { outputAmount } = applyInstantEventFormula({
            outputRes: card.outputRes,
            eventBase: card.eventBase,
            qualityFactor: card.qualityFactor || 1,
            tierMultiplier,
        });
        instance.effects = { [card.outputRes]: outputAmount };
    } else if (card.effects) {
        instance.effects = scaleEffects(card.effects, sliceMultiplier);
    }

    // Events: scale per-turn / activation / expiry by the slice multiplier.
    if (card.category === 'event') {
        instance.perTurn = card.perTurnEffects ? scaleEffects(card.perTurnEffects, sliceMultiplier) : null;
        instance.onActivate = card.onActivate ? scaleEffects(card.onActivate, sliceMultiplier) : null;
        instance.onExpire = card.onExpire ? scaleEffects(card.onExpire, sliceMultiplier) : null;
    }

    return instance;
}

let instanceCounter = 0;
function generateInstanceId() {
    return `card_${Date.now()}_${instanceCounter++}`;
}

// =====================================================
// ACTIVE CARD MANAGEMENT
// =====================================================

/**
 * Add a card to active cards (investments, events).
 *
 * Investments level up: building the same investment again finds the
 * existing structure, increments its `level`, and adds the new build's
 * perTurn into the existing perTurn (per resource). The cost was paid
 * separately by the caller. Other categories always create a new
 * concurrent instance.
 */
function activateCard(instance) {
    if (instance.category === "investment") {
        const existing = activeCards.find(c => c.typeId === instance.typeId);
        if (existing) {
            existing.level = (existing.level || 1) + 1;
            for (const [r, amt] of Object.entries(instance.perTurn || {})) {
                existing.perTurn[r] = round2((existing.perTurn[r] || 0) + amt);
            }
            playedCardTypes.add(instance.typeId);
            console.log(`Investment leveled up: ${existing.name} → Lv.${existing.level}`);
            return;
        }
        instance.level = 1;
    }
    activeCards.push(instance);
    playedCardTypes.add(instance.typeId);
    console.log(`Card activated: ${instance.name} (${instance.instanceId})`);
}

/**
 * Remove a card from active cards.
 */
function deactivateCard(instanceId) {
    const index = activeCards.findIndex(c => c.instanceId === instanceId);
    if (index !== -1) {
        const removed = activeCards.splice(index, 1)[0];
        console.log(`Card deactivated: ${removed.name} (${removed.instanceId})`);
        return removed;
    }
    return null;
}

/**
 * Check if a card type is active.
 */
function hasActiveCard(typeId) {
    return activeCards.some(card => card.typeId === typeId);
}

/**
 * Count active instances of a card type.
 */
function countActiveInstances(typeId) {
    return activeCards.filter(card => card.typeId === typeId).length;
}

/**
 * Get all active cards (for display/calculation).
 */
function getActiveCards() {
    return [...activeCards];
}

/**
 * Get active cards by category.
 */
function getActiveCardsByCategory(category) {
    return activeCards.filter(card => card.category === category);
}

/**
 * Single source of truth for the "what's been built" view (e.g. a future
 * landscape rendering each structure as pixels on a backdrop). One entry
 * per investment typeId; each carries its current `level` (1..maxInstances)
 * and the stacked per-turn yield. Read-only — mutate via activateCard.
 */
function getBuiltStructures() {
    return activeCards
        .filter(c => c.category === "investment")
        .map(c => ({
            typeId: c.typeId,
            name: c.name,
            icon: c.icon,
            level: c.level || 1,
            perTurn: c.perTurn,
        }));
}

// =====================================================
// EVENT APPLICATION
// =====================================================

/**
 * Apply an event instance's effects in canonical order:
 *   1. instant effects
 *   2. onActivate
 *   3. activateCard if ongoing (duration or perTurn)
 *   4. applyFlagMutations (autoDerivedSets, since setsEventFlag is read off
 *      the instance after it's active)
 *
 * `applyChange(effects, label)` is the resource-write strategy: in production
 * it's `applyResourceChange` (shows a toast); in the sim it's
 * `addResourcesQuiet` (silent). Single source of truth — used by acceptEvent,
 * the decision triggersEvent branch, and the headless sim.
 */
function applyEventInstance(instance, applyChange) {
    if (instance.effects && Object.keys(instance.effects).length > 0) {
        applyChange(instance.effects, instance.name);
    }
    if (instance.onActivate) {
        applyChange(instance.onActivate, `${instance.name} begins!`);
    }
    if (instance.duration || instance.perTurn) {
        activateCard(instance);
    }
    applyFlagMutations(instance, { autoDerivedSets: true });
}

// =====================================================
// TURN PROCESSING
// =====================================================

/**
 * Process active events at turn start.
 * Returns effects to apply and expired events.
 */
function processActiveEvents() {
    const results = {
        perTurnEffects: {},
        expiredEvents: [],
        expireEffects: {},
    };
    
    // Get all event cards
    const events = getActiveCardsByCategory('event');
    
    for (const event of events) {
        // Add per-turn effects
        if (event.perTurn) {
            for (const [resource, amount] of Object.entries(event.perTurn)) {
                results.perTurnEffects[resource] = (results.perTurnEffects[resource] || 0) + amount;
            }
        }
        
        // Decrement turns remaining
        if (event.turnsRemaining !== null) {
            event.turnsRemaining--;
            
            // Check if expired
            if (event.turnsRemaining <= 0) {
                results.expiredEvents.push(event);
                
                // Add expire effects
                if (event.onExpire) {
                    for (const [resource, amount] of Object.entries(event.onExpire)) {
                        results.expireEffects[resource] = (results.expireEffects[resource] || 0) + amount;
                    }
                }
            }
        }
    }
    
    // Remove expired events
    for (const expired of results.expiredEvents) {
        deactivateCard(expired.instanceId);
    }
    
    return results;
}

/**
 * Calculate total passive income from all active cards.
 */
function calculateTotalPassiveIncome() {
    const total = { gold: 0, food: 0, manpower: 0, favor: 0 };
    
    for (const card of activeCards) {
        if (card.perTurn) {
            for (const [resource, amount] of Object.entries(card.perTurn)) {
                total[resource] = (total[resource] || 0) + amount;
            }
        }
    }
    
    return total;
}

// =====================================================
// SAVE/LOAD
// =====================================================

/**
 * Get card system state for saving.
 */
function getCardSystemState() {
    return {
        activeCards: activeCards,
        playedCardTypes: Array.from(playedCardTypes),
    };
}

/**
 * Restore card system state from save.
 */
function restoreCardSystemState(savedState) {
    if (savedState) {
        activeCards = savedState.activeCards || [];
        playedCardTypes = new Set(savedState.playedCardTypes || []);
    } else {
        activeCards = [];
        playedCardTypes = new Set();
    }
}

/**
 * Reset card system (for new game).
 */
function resetCardSystem() {
    activeCards = [];
    playedCardTypes = new Set();
    instanceCounter = 0;
}

