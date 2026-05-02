// =====================================================
// INVESTMENT CARDS
// =====================================================
// Pay a cost now, earn per-turn income. Target ROI per card is in
// [25, 35] turns (cost in gold-equivalent ≈ 25-35 × yield per turn
// in gold-equivalent).
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

        // 30 g-eq / 1 g-eq/turn → ROI 30
        baseCost: { gold: 30 },
        basePerTurn: { food: 2 },
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

        // 60 g-eq / 2 g-eq/turn → ROI 30
        baseCost: { manpower: 20 },
        basePerTurn: { gold: 2 },
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

        // 75 g-eq / 3 g-eq/turn → ROI 25
        baseCost: { gold: 75 },
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

        // 80 g-eq / 3 g-eq/turn → ROI ≈ 26.67
        baseCost: { gold: 60, food: 40 },
        basePerTurn: { favor: 1.5 },
    },
    {
        typeId: "market",
        category: "investment",
        name: "Open a Market",
        description: "Merchants bring coin and grain.",
        icon: "🏪",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 40 g-eq / 1.5 g-eq/turn → ROI ≈ 26.67
        baseCost: { gold: 30, food: 20 },
        basePerTurn: { gold: 1, food: 1 },
    },
    {
        typeId: "fishingBoats",
        category: "investment",
        name: "Commission Fishing Boats",
        description: "A cheap, quick source of fresh food from the rivers.",
        icon: "🎣",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 15 g-eq / 0.5 g-eq/turn → ROI 30
        baseCost: { gold: 15 },
        basePerTurn: { food: 1 },
    },
    {
        typeId: "vineyard",
        category: "investment",
        name: "Plant a Vineyard",
        description: "Wine for the nobles, income for the coffers.",
        icon: "🍇",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 50 g-eq / 2 g-eq/turn → ROI 25
        baseCost: { gold: 30, food: 40 },
        basePerTurn: { gold: 1, favor: 0.5 },
    },
    {
        typeId: "stoneQuarry",
        category: "investment",
        name: "Open a Stone Quarry",
        description: "Backbreaking work carves wealth from the mountain.",
        icon: "⛰️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 3,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 70 g-eq / 2 g-eq/turn → ROI 35
        baseCost: { gold: 40, manpower: 10 },
        basePerTurn: { gold: 2 },
    },
    {
        typeId: "tradeCaravan",
        category: "investment",
        name: "Sponsor a Trade Caravan",
        description: "A long route across the realm.",
        icon: "🐴",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 4,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 90 g-eq / 3 g-eq/turn → ROI 30
        baseCost: { gold: 60, manpower: 10 },
        basePerTurn: { gold: 2, food: 2 },
    },
    {
        typeId: "royalKeep",
        category: "investment",
        name: "Raise a Royal Keep",
        description: "A great fortress, the seat of your power — a legacy for generations.",
        icon: "🏯",

        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 8,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        // 160 g-eq / 5 g-eq/turn → ROI 32
        baseCost: { gold: 100, manpower: 20 },
        basePerTurn: { manpower: 1, favor: 1 },
    },
];
