// =====================================================
// INVESTMENT CARDS
// =====================================================
// Pay a cost now, earn per-turn income. Cards are gated by
// `requiresIncome` (passive income thresholds) instead of fixed turns.
// ROI decreases monotonically from 40 (tier-0) down to ~20 (tier-3).
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// See docs/investments_plan.md for the full design rationale.
// =====================================================

const investmentCards = [
    {
        typeId: "fishermen",
        category: "investment",
        name: "Hire Fishermen",
        description: "A modest, steady catch from the river.",
        icon: "🎣",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: null,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 10 g-eq / 0.25 g-eq/turn → ROI 40
        baseCost: { gold: 8, food: 4 },
        basePerTurn: { food: 0.5 },
    },
    {
        typeId: "tollGate",
        category: "investment",
        name: "Open a Toll Gate",
        description: "A coin from every cart that passes through.",
        icon: "🛤️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: null,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 20 g-eq / 0.5 g-eq/turn → ROI 40
        baseCost: { gold: 16, food: 8 },
        basePerTurn: { gold: 0.5 },
    },
    {
        typeId: "shrine",
        category: "investment",
        name: "Erect a Shrine",
        description: "Daily offerings keep the gods — and the people — content.",
        icon: "⛩️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: null,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // 20 g-eq / 0.5 g-eq/turn → ROI 40
        baseCost: { food: 40 },
        basePerTurn: { favor: 0.25 },
    },
    {
        typeId: "trainingGround",
        category: "investment",
        name: "Build a Training Ground",
        description: "A small drill yard — feeds and shapes new hands.",
        icon: "🏋️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: null,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 30 g-eq / 0.75 g-eq/turn → ROI 40
        baseCost: { gold: 14, food: 32 },
        basePerTurn: { manpower: 0.25 },
    },
    {
        typeId: "orchard",
        category: "investment",
        name: "Plant an Orchard",
        description: "Cheap saplings, patient yield.",
        icon: "🍎",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { food: 0.5 },
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 18 g-eq / 0.5 g-eq/turn → ROI 36
        baseCost: { gold: 2, food: 32 },
        basePerTurn: { food: 1 },
    },
    {
        typeId: "tradingSquare",
        category: "investment",
        name: "Open a Trading Square",
        description: "A handful of stalls — coin and grain change hands.",
        icon: "🏛️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 0.5 },
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 24 g-eq / 0.75 g-eq/turn → ROI 32
        baseCost: { gold: 12, food: 6, manpower: 3 },
        basePerTurn: { gold: 0.5, food: 0.5 },
    },
    {
        typeId: "tavern",
        category: "investment",
        name: "Open a Tavern",
        description: "Coin, gossip, and goodwill flow over every cup.",
        icon: "🍺",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 0.5 },
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 45 g-eq / 1.5 g-eq/turn → ROI 30
        baseCost: { gold: 5, food: 50, manpower: 5 },
        basePerTurn: { gold: 0.5, favor: 0.5 },
    },
    {
        typeId: "watermill",
        category: "investment",
        name: "Build a Watermill",
        description: "A steady source of flour and bread for the realm.",
        icon: "🏞️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { food: 1 },
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 28 g-eq / 1 g-eq/turn → ROI 28
        baseCost: { gold: 12, food: 8, manpower: 4 },
        basePerTurn: { food: 2 },
    },
    {
        typeId: "goldmine",
        category: "investment",
        name: "Open a Goldmine",
        description: "Hard labor, shiny reward.",
        icon: "⛏️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 1 },
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // 54 g-eq / 2 g-eq/turn → ROI 27
        baseCost: { gold: 24, food: 12, manpower: 8 },
        basePerTurn: { gold: 2 },
    },
    {
        typeId: "market",
        category: "investment",
        name: "Open a Market",
        description: "A licensed marketplace — every stall pays its share.",
        icon: "🏪",

        isUnique: false,
        maxInstances: 2,
        requiresIncome: { gold: 1, favor: 0.5 },
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 52 g-eq / 2 g-eq/turn → ROI 26
        baseCost: { gold: 14, food: 12, manpower: 8, favor: 4 },
        basePerTurn: { gold: 0.5, food: 0.5, manpower: 0.25, favor: 0.25 },
    },
    {
        typeId: "huntingLodge",
        category: "investment",
        name: "Build a Hunting Lodge",
        description: "Game, pelts, and seasoned woodsmen.",
        icon: "🏹",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 1, manpower: 0.5 },
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 50 g-eq / 2 g-eq/turn → ROI 25
        baseCost: { gold: 20, food: 12, manpower: 8 },
        basePerTurn: { food: 1, manpower: 0.5 },
    },
    {
        typeId: "cattleFarm",
        category: "investment",
        name: "Raise a Cattle Farm",
        description: "Pastures and fences — beef, milk, and leather.",
        icon: "🐄",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { food: 1.5 },
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // 37 g-eq / 1.5 g-eq/turn → ROI ≈ 24.7
        baseCost: { gold: 5, food: 40, manpower: 4 },
        basePerTurn: { food: 3 },
    },
    {
        typeId: "sanatorium",
        category: "investment",
        name: "Found a Sanatorium",
        description: "Monks tending the sick — health for the realm, favor for the crown.",
        icon: "🏥",

        isUnique: false,
        maxInstances: 2,
        requiresIncome: { gold: 1, favor: 0.5 },
        requiresResource: null,

        weight: 7,
        absoluteChance: null,

        // 80 g-eq / 3.5 g-eq/turn → ROI ≈ 22.9
        baseCost: { gold: 24, food: 12, manpower: 8, favor: 13 },
        basePerTurn: { manpower: 0.5, favor: 1 },
    },
    {
        typeId: "watchtower",
        category: "investment",
        name: "Build a Watchtower",
        description: "Eyes on the road — order kept, respect earned.",
        icon: "🗼",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 1, manpower: 0.5 },
        requiresResource: null,

        weight: 7,
        absoluteChance: null,

        // 56 g-eq / 2.5 g-eq/turn → ROI ≈ 22.4
        baseCost: { gold: 14, food: 12, manpower: 8, favor: 6 },
        basePerTurn: { manpower: 0.5, favor: 0.5 },
    },
    {
        typeId: "dock",
        category: "investment",
        name: "Build a Dock",
        description: "A port for trade and tide — fish, freight, and dockhands.",
        icon: "⚓",

        isUnique: false,
        maxInstances: 2,
        requiresIncome: { food: 1.5 },
        requiresResource: null,

        weight: 7,
        absoluteChance: null,

        // 74 g-eq / 3.5 g-eq/turn → ROI ≈ 21.1
        baseCost: { gold: 30, food: 16, manpower: 8, favor: 6 },
        basePerTurn: { food: 2, gold: 1, manpower: 0.5 },
    },
    {
        typeId: "stoneQuarry",
        category: "investment",
        name: "Open a Stone Quarry",
        description: "Backbreaking work carves wealth from the mountain.",
        icon: "⛰️",

        isUnique: false,
        maxInstances: 3,
        requiresIncome: { gold: 2 },
        requiresResource: null,

        weight: 7,
        absoluteChance: null,

        // 51 g-eq / 2.5 g-eq/turn → ROI ≈ 20.4
        baseCost: { gold: 24, food: 12, manpower: 7 },
        basePerTurn: { gold: 2.5 },
    },
    {
        typeId: "cathedral",
        category: "investment",
        name: "Build a Cathedral",
        description: "A monument to piety — the faithful will revere you.",
        icon: "⛪",

        isUnique: false,
        maxInstances: 2,
        requiresIncome: { gold: 2, favor: 1 },
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        // 60 g-eq / 3 g-eq/turn → ROI 20
        baseCost: { gold: 18, food: 12, manpower: 8, favor: 6 },
        basePerTurn: { favor: 1.5 },
    },
];
