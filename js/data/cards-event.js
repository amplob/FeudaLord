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
// Pool design: one good + one bad event per resource (8 events total). Bad
// events outweigh good ones so the event slices apply slow downward pressure
// on every resource (target: each resource ends in [-50, 0] after a 100-turn
// event-only sim that started at 30). Equal weights (10) keep firing rates
// uniform within a tonality. Magnitudes per fire (raw, before sliceMultiplier):
//   gold:     good +6 lifetime,   bad -10 instant
//   food:     good +10 instant,   bad -12 lifetime
//   manpower: good  +3 instant,   bad  -6 instant
//   favor:    good  +3 lifetime,  bad  -6 lifetime
// =====================================================

const eventCards = [
    // --- Good events (one per resource) ---
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

        // Instant: +10 food per fire (eventBase 5, qF 1, food = 0.5 g-eq)
        outputRes: "food",
        eventBase: 5,
        qualityFactor: 1,
    },
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

        weight: 10,
        absoluteChance: null,

        // Ongoing 4 turns: +2 gold onActivate, +1 gold/turn → +6 gold lifetime
        duration: 4,
        onActivate: { gold: 2 },
        perTurnEffects: { gold: 1 },
        onExpire: null,
    },
    {
        typeId: "eagerVolunteers",
        category: "event",
        name: "Eager Volunteers",
        description: "Stout peasants answer the banner call without prompting.",
        icon: "🛡️🚩",
        tonality: "good",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // Instant: +3 manpower per fire (eventBase 9, qF 1, manpower = 3 g-eq)
        outputRes: "manpower",
        eventBase: 9,
        qualityFactor: 1,
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

        weight: 10,
        absoluteChance: null,

        // Ongoing 3 turns: +1 favor/turn → +3 favor lifetime
        duration: 3,
        onActivate: null,
        perTurnEffects: { favor: 1 },
        onExpire: null,
    },

    // --- Bad events (one per resource) ---
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

        weight: 10,
        absoluteChance: null,

        // Ongoing 3 turns: -4 food/turn → -12 food lifetime
        duration: 3,
        onActivate: null,
        perTurnEffects: { food: -4 },
        onExpire: null,
    },
    {
        typeId: "royalTribute",
        category: "event",
        name: "Royal Tribute Demanded",
        description: "A messenger from the crown demands an unscheduled levy of coin.",
        icon: "📜💸",
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // Instant: -10 gold per fire (eventBase -10, qF 1)
        outputRes: "gold",
        eventBase: -10,
        qualityFactor: 1,
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

        weight: 10,
        absoluteChance: null,

        // Instant: -6 manpower per fire (eventBase -18, qF 1, manpower = 3 g-eq)
        outputRes: "manpower",
        eventBase: -18,
        qualityFactor: 1,
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

        weight: 10,
        absoluteChance: null,

        // Ongoing 3 turns: -2 favor/turn → -6 favor lifetime
        duration: 3,
        onActivate: null,
        perTurnEffects: { favor: -2 },
        onExpire: null,
    },
];
