// =====================================================
// INVESTMENT CARDS
// =====================================================
// Pay a cost now, earn per-turn income. Target ROI = 20 turns
// (cost in gold-equivalent = 20 × yield per turn in gold-equivalent).
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// Instance randomization (see applyInvestmentFormula):
//   bulkRoll    ∈ [0.5, 2]   → scales cost AND yield (preserves ROI)
//   varianceRoll ∈ [0.85, 1.15] → scales only yield (quality of build)
// =====================================================

const investmentCards = [
    {
        typeId: "watermill",
        category: "investment",
        name: "Build a Watermill",
        description: "A steady source of flour and bread for the realm.",
        icon: "🏞️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 30 gold = 30 g-eq → +3 food/turn = 1.5 g-eq/turn → ROI 20
        baseCost: { gold: 30 },
        basePerTurn: { food: 3 },
    },
    {
        typeId: "goldmine",
        category: "investment",
        name: "Open a Goldmine",
        description: "Hard labor, shiny reward.",
        icon: "⛏️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 20 manpower = 60 g-eq → +3 gold/turn = 3 g-eq/turn → ROI 20
        baseCost: { manpower: 20 },
        basePerTurn: { gold: 3 },
    },
    {
        typeId: "barracks",
        category: "investment",
        name: "Build Barracks",
        description: "Train new hands for the realm.",
        icon: "⚔️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 3,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 60 gold = 60 g-eq → +1 manpower/turn = 3 g-eq/turn → ROI 20
        baseCost: { gold: 60 },
        basePerTurn: { manpower: 1 },
    },
    {
        typeId: "cathedral",
        category: "investment",
        name: "Build a Cathedral",
        description: "A monument to piety — the faithful will revere you.",
        icon: "⛪",

        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 5,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 60 gold + 40 food = 80 g-eq → +2 favor/turn = 4 g-eq/turn → ROI 20
        baseCost: { gold: 60, food: 40 },
        basePerTurn: { favor: 2 },
    },
    {
        typeId: "market",
        category: "investment",
        name: "Open a Market",
        description: "Merchants bring coin, grain, and a touch of prestige.",
        icon: "🏪",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 30 gold + 20 food = 40 g-eq → +1 gold +1 food +0.25 favor/turn = 2 g-eq/turn → ROI 20
        baseCost: { gold: 30, food: 20 },
        basePerTurn: { gold: 1, food: 1, favor: 0.25 },
    },
];
