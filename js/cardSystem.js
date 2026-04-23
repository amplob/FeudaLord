// =====================================================
// CARD SYSTEM
// =====================================================
// Manages card selection, eligibility, and randomization.
// =====================================================

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
    // Check minimum turn
    if (state.turn < card.minTurn) {
        return false;
    }
    
    // Check if unique card already played
    if (card.isUnique && playedCardTypes.has(card.typeId)) {
        return false;
    }
    
    // Check max instances
    if (card.maxInstances !== null) {
        const instanceCount = countActiveInstances(card.typeId);
        if (instanceCount >= card.maxInstances) {
            return false;
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
 */
function getEligibleCards(category, state) {
    return allCards.filter(card => 
        card.category === category && isCardEligible(card, state)
    );
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
 */
function selectCard(category, state) {
    const eligibleCards = getEligibleCards(category, state);

    if (eligibleCards.length === 0) {
        console.warn(`No eligible cards for category: ${category}`);
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

const RESOURCE_VALUE = { gold: 1, food: 0.5, manpower: 3, favor: 2 };

function canonicalRate(from, to) {
    return RESOURCE_VALUE[from] / RESOURCE_VALUE[to];
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

// Trade-style formula: convert inputRes → outputRes.
// inputAmount  = inputBase × bulkRoll
// outputAmount = inputAmount × canonicalRate × qualityFactor × varianceRoll × tierMultiplier
function applyTradeFormula({ inputRes, outputRes, inputBase, qualityFactor = 1, tierMultiplier = 1 }) {
    const bulk = rollBulk();
    const variance = rollVariance();
    const inputAmount = round2(inputBase * bulk);
    const outputAmount = round2(
        inputAmount * canonicalRate(inputRes, outputRes) * qualityFactor * variance * tierMultiplier
    );
    return { inputAmount, outputAmount };
}

// Instant-event formula: no input, size is eventBase in gold-equivalent.
// output = eventBase × (1/valueOfTargetResource) × qualityFactor × varianceRoll × tierMultiplier
function applyInstantEventFormula({ outputRes, eventBase, qualityFactor = 1, tierMultiplier = 1 }) {
    const variance = rollVariance();
    const outputAmount = round2(
        eventBase * (1 / RESOURCE_VALUE[outputRes]) * qualityFactor * variance * tierMultiplier
    );
    return { outputAmount };
}

// Fixed-output trade: outputAmount is given (rolled once per card), each option
// pays a different inputRes to reach it. Higher qualityFactor / tierMultiplier
// reduces the input cost (better deal for the player). Variance applies per option.
// inputAmount = outputAmount × canonicalRate(out→in) / (qualityFactor × tierMultiplier) × varianceRoll
function applyFixedOutputTrade({ outputRes, outputAmount, inputRes, qualityFactor = 1, tierMultiplier = 1 }) {
    const variance = rollVariance();
    const inputAmount = round2(
        outputAmount * canonicalRate(outputRes, inputRes) / (qualityFactor * tierMultiplier) * variance
    );
    return { inputAmount };
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

// =====================================================
// RANDOMIZATION (legacy)
// =====================================================

/**
 * Apply variance to a base value.
 */
function applyVariance(baseValue, variance) {
    if (variance === 0 || variance === undefined) return baseValue;
    const multiplier = 1 + (Math.random() * 2 - 1) * variance;
    return Math.round(baseValue * multiplier);
}

/**
 * Randomize an effects object (cost, yield, effects).
 */
function randomizeEffects(effects, variance) {
    if (!effects) return {};

    const randomized = {};
    for (const [resource, amount] of Object.entries(effects)) {
        randomized[resource] = applyVariance(amount, variance);
    }
    return randomized;
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
 */
function createCardInstance(card) {
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
        if (card.baseCost) {
            instance.cost = randomizeEffects(card.baseCost, card.costVariance || 0);
        }
        if (card.basePerTurn) {
            instance.perTurn = randomizeEffects(card.basePerTurn, card.yieldVariance || 0);
        }
    }
    
    // For decisions: three schemas supported.
    //   1. Fixed-output: card-level outputRes + outputBase. Options are payment methods
    //      (inputRes) or rejects (no inputRes). Output is rolled once per card.
    //   2. Per-option trade: each option has inputRes/outputRes/inputBase.
    //   3. Legacy: options carry raw effects.
    if (card.options) {
        if (card.outputRes && typeof card.outputBase === "number") {
            const outputAmount = round2(card.outputBase * rollBulk());
            instance.options = card.options.map(opt => {
                if (opt.inputRes) {
                    const tierMultiplier = evalTierMultiplier(opt.tierBoosts);
                    const { inputAmount } = applyFixedOutputTrade({
                        outputRes: card.outputRes,
                        outputAmount,
                        inputRes: opt.inputRes,
                        qualityFactor: opt.qualityFactor || 1,
                        tierMultiplier,
                    });
                    return {
                        label: opt.label,
                        effects: {
                            [opt.inputRes]: -inputAmount,
                            [card.outputRes]: outputAmount,
                        },
                        perTurnEffects: opt.perTurnEffects
                            ? randomizeEffects(opt.perTurnEffects, opt.effectsVariance || 0)
                            : null,
                        triggersEvent: opt.triggersEvent || null,
                        ...copyFlagFields(opt),
                    };
                }
                return {
                    label: opt.label,
                    effects: {},
                    perTurnEffects: opt.perTurnEffects
                        ? randomizeEffects(opt.perTurnEffects, opt.effectsVariance || 0)
                        : null,
                    triggersEvent: opt.triggersEvent || null,
                    ...copyFlagFields(opt),
                };
            });
        } else {
            instance.options = card.options.map(opt => {
                if (opt.inputRes && opt.outputRes && typeof opt.inputBase === "number") {
                    const tierMultiplier = evalTierMultiplier(opt.tierBoosts);
                    const { inputAmount, outputAmount } = applyTradeFormula({
                        inputRes: opt.inputRes,
                        outputRes: opt.outputRes,
                        inputBase: opt.inputBase,
                        qualityFactor: opt.qualityFactor || 1,
                        tierMultiplier,
                    });
                    return {
                        label: opt.label,
                        effects: {
                            [opt.inputRes]: -inputAmount,
                            [opt.outputRes]: outputAmount,
                        },
                        perTurnEffects: opt.perTurnEffects
                            ? randomizeEffects(opt.perTurnEffects, opt.effectsVariance || 0)
                            : null,
                        triggersEvent: opt.triggersEvent || null,
                        ...copyFlagFields(opt),
                    };
                }
                return {
                    label: opt.label,
                    effects: randomizeEffects(opt.effects || {}, opt.effectsVariance || 0),
                    perTurnEffects: opt.perTurnEffects
                        ? randomizeEffects(opt.perTurnEffects, opt.effectsVariance || 0)
                        : null,
                    triggersEvent: opt.triggersEvent || null,
                    ...copyFlagFields(opt),
                };
            });
        }
    }

    // Instant-event effects: eventBase sized in gold-equivalent. Applied on draw.
    // Legacy top-level `effects` still supported.
    if (card.outputRes && typeof card.eventBase === "number") {
        const tierMultiplier = evalTierMultiplier(card.tierBoosts);
        const { outputAmount } = applyInstantEventFormula({
            outputRes: card.outputRes,
            eventBase: card.eventBase,
            qualityFactor: card.qualityFactor || 1,
            tierMultiplier,
        });
        instance.effects = { [card.outputRes]: outputAmount };
    } else if (card.effects) {
        instance.effects = randomizeEffects(card.effects, card.effectsVariance || 0);
    }
    
    // For events, randomize per-turn and activation effects
    if (card.category === 'event') {
        instance.perTurn = card.perTurnEffects 
            ? randomizeEffects(card.perTurnEffects, card.effectsVariance || 0)
            : null;
        instance.onActivate = card.onActivate 
            ? randomizeEffects(card.onActivate, card.effectsVariance || 0)
            : null;
        instance.onExpire = card.onExpire 
            ? randomizeEffects(card.onExpire, card.effectsVariance || 0)
            : null;
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
 */
function activateCard(instance) {
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

