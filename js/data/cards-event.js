// =====================================================
// EVENT CARDS
// =====================================================
// Temporary ongoing effects. Legacy schema (onActivate, perTurnEffects,
// onExpire, duration). Balance is documented in gold-equivalent.
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// Can be triggered by fate slice (30% reroll) or by decision options.
// =====================================================

const eventCards = [
    {
        typeId: "tradeBoom",
        category: "event",
        name: "Trade Boom",
        description: "Merchants flock to your lands, filling the coffers.",
        icon: "📈💰",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        // +10 g-eq on activate, +5 g-eq/turn × 4 turns = +30 g-eq total
        duration: 4,
        onActivate: { gold: 10 },
        perTurnEffects: { gold: 5 },
        onExpire: null,
    },
    {
        typeId: "drought",
        category: "event",
        name: "Prolonged Drought",
        description: "The sun beats down mercilessly, parching the fields.",
        icon: "☀️🏜️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // -6 g-eq on activate, -3 g-eq/turn × 3 = -9 g-eq, +6 g-eq relief on expire
        // Net: ~-9 g-eq over duration
        duration: 3,
        onActivate: { favor: -3 },
        perTurnEffects: { food: -6 },
        onExpire: { favor: 3 },
    },
];
