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

        // 15 gold = 15 g-eq → +2 food/turn = 1 g-eq/turn → ROI 15 (fast payback)
        baseCost: { gold: 15 },
        basePerTurn: { food: 2 },
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

        // 15 gold + 40 food = 35 g-eq → +1 gold +0.5 favor/turn = 2 g-eq/turn → ROI ~17
        baseCost: { gold: 15, food: 40 },
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

        // 40 gold + 10 manpower = 70 g-eq → +3 gold/turn = 3 g-eq/turn → ROI ~23
        baseCost: { gold: 40, manpower: 10 },
        basePerTurn: { gold: 3 },
    },
    {
        typeId: "tradeCaravan",
        category: "investment",
        name: "Sponsor a Trade Caravan",
        description: "A long route across the realm — slow returns, but generous.",
        icon: "🐴",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 4,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 60 gold + 10 manpower = 90 g-eq → +2 gold +2 food/turn = 3 g-eq/turn → ROI ~30
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

        // 100 gold + 20 manpower = 160 g-eq → +1 manpower +0.5 favor/turn = 4 g-eq/turn → ROI ~40
        baseCost: { gold: 100, manpower: 20 },
        basePerTurn: { manpower: 1, favor: 0.5 },
    },
];
