// =====================================================
// EVENT CARDS
// =====================================================
// Unified "event" category: things that simply happen and the player accepts.
// A card may carry either or both of two shapes:
//   - Instant: outputRes + eventBase → one-time effect applied on draw.
//     Formula: eventBase × (1/valueOf(outputRes)) × qualityFactor × variance × tierMultiplier
//   - Ongoing: duration + perTurnEffects (+ optional onActivate / onExpire).
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// eventBase is sized in gold-equivalent (negative = disaster).
// Can also be triggered by decision options via `triggersEvent`.
// =====================================================

const eventCards = [
    // --- Instant events ---
    {
        typeId: "excellentHarvest",
        category: "event",
        name: "Excellent Harvest!",
        description: "The gods have blessed your fields.",
        icon: "🌾✨",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // +20 g-eq × 1.2 quality → ~+48 food (±15% variance)
        outputRes: "food",
        eventBase: 20,
        qualityFactor: 1.2,
    },
    {
        typeId: "plagueStrikes",
        category: "event",
        name: "Plague Strikes!",
        description: "A terrible sickness sweeps through your lands.",
        icon: "☠️🤒",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 5,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // -25 g-eq → ~-8.3 manpower (±15% variance)
        outputRes: "manpower",
        eventBase: -25,
        qualityFactor: 1,
    },

    // --- Ongoing events ---
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

        // -3 favor on activate, -6 food/turn × 3 turns, +3 favor relief on expire
        duration: 3,
        onActivate: { favor: -3 },
        perTurnEffects: { food: -6 },
        onExpire: { favor: 3 },
    },
];
