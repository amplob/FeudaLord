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
// Each event declares a `tonality` ("good" | "bad") used by the wheel to
// filter the pool when the landed slice is of a specific tonality.
// =====================================================

const eventCards = [
    // --- Instant events ---
    {
        typeId: "excellentHarvest",
        category: "event",
        name: "Excellent Harvest!",
        description: "The gods have blessed your fields.",
        icon: "🌾✨",
        tonality: "good",

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
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 5,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // -24 g-eq → ~-8 manpower (±15% variance). Mirrors excellentHarvest.
        outputRes: "manpower",
        eventBase: -20,
        qualityFactor: 1.2,
    },

    // --- Ongoing events ---
    {
        typeId: "tradeBoom",
        category: "event",
        name: "Trade Boom",
        description: "Merchants flock to your lands, filling the coffers.",
        icon: "📈💰",
        tonality: "good",

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
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // -10 gold on activate, -10 food/turn × 4 turns = -30 g-eq total.
        // Mirrors tradeBoom.
        duration: 4,
        onActivate: { gold: -10 },
        perTurnEffects: { food: -10 },
        onExpire: null,
    },
    {
        typeId: "festivalSeason",
        category: "event",
        name: "Festival Season",
        description: "The realm celebrates — songs, feasts, and spontaneous joy.",
        icon: "🎉",
        tonality: "good",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 2,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        // +10 food on activate (=5 g-eq), +3 favor/turn × 3 turns (=18 g-eq) ≈ 23 g-eq total
        duration: 3,
        onActivate: { food: 10 },
        perTurnEffects: { favor: 3 },
        onExpire: null,
    },
    {
        typeId: "nobleFeud",
        category: "event",
        name: "Noble Feud",
        description: "Two of your vassals are at each other's throats — bribes flow and loyalty wavers.",
        icon: "⚔️",
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        // -5 gold on activate (=-5 g-eq), -3 favor/turn × 3 turns (=-18 g-eq) = -23 g-eq total
        // Mirrors festivalSeason.
        duration: 3,
        onActivate: { gold: -5 },
        perTurnEffects: { favor: -3 },
        onExpire: null,
    },
];
