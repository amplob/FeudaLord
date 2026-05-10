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

    // --- Kingdom-locked flavour events ---
    // Each one only enters its own kingdom's draw pool (`card.kingdom` filter
    // in isCardEligible). They use the standard eventBase formula so the per-
    // kingdom resourceValues automatically scale the resulting unit count.

    {
        typeId: "prosperousRegion",
        category: "event",
        name: "Prosperous Region",
        description: "Word of your fair rule spreads through Greenvale's villages.",
        icon: "🌳👑",
        tonality: "good",
        kingdom: "greenvale",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // Instant: +4 favor (eventBase 8, qF 1, favor = 2 g-eq)
        outputRes: "favor",
        eventBase: 8,
        qualityFactor: 1,
    },
    {
        typeId: "fishermansSurplus",
        category: "event",
        name: "Fisherman's Surplus",
        description: "The Rivermark fleets return with boats heavy with silver fish.",
        icon: "🎣🌾",
        tonality: "good",
        kingdom: "rivermark",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // Instant: ~+27 food (eventBase 8, qF 1, food = 0.3 g-eq in Rivermark)
        outputRes: "food",
        eventBase: 8,
        qualityFactor: 1,
    },
    {
        typeId: "hiddenGoldVein",
        category: "event",
        name: "Hidden Gold Vein",
        description: "Stonehold's miners strike a rich seam in the deep galleries.",
        icon: "⛏️💰",
        tonality: "good",
        kingdom: "stonehold",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // Instant: ~+11 gold (eventBase 8, qF 1, gold = 0.7 g-eq in Stonehold)
        outputRes: "gold",
        eventBase: 8,
        qualityFactor: 1,
    },
    {
        typeId: "wolfHunt",
        category: "event",
        name: "Wolf Hunt",
        description: "The Wolfsedge garrison rides out to thin the packs at the treeline.",
        icon: "🐺⚔️",
        tonality: "bad",
        kingdom: "wolfsedge",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        // Instant: ~-2 manpower (eventBase -8, manpower = 4 g-eq in Wolfsedge)
        outputRes: "manpower",
        eventBase: -8,
        qualityFactor: 1,
    },

    // --- Shortage events: auto-triggered when a resource hits ≤ 0 ---
    // These are not drawn from the wheel (weight: 0 + filtered in
    // getEligibleCards). game.js#manageShortageEvents activates one when its
    // `shortageOf` resource is depleted and silently deactivates it on
    // recovery. perTurnEffects keeps the realm bleeding every turn while
    // active. onActivate mirrors perTurnEffects so the penalty also fires
    // on the turn the shortage begins (matching the old decay cascade).
    {
        typeId: "shortageGold",
        category: "event",
        name: "Empty Coffers",
        description: "The treasury is bone dry — the realm groans under unpaid wages.",
        icon: "💸",
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 0,
        absoluteChance: null,

        shortageOf: "gold",
        onActivate: { food: -2, manpower: -0.33, favor: -0.5 },
        perTurnEffects: { food: -2, manpower: -0.33, favor: -0.5 },
        onExpire: null,
    },
    {
        typeId: "shortageFood",
        category: "event",
        name: "Famine",
        description: "Granaries are empty — hunger claims the weakest each week.",
        icon: "🥀",
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 0,
        absoluteChance: null,

        shortageOf: "food",
        onActivate: { manpower: -1 },
        perTurnEffects: { manpower: -1 },
        onExpire: null,
    },
    {
        typeId: "shortageManpower",
        category: "event",
        name: "Workforce Collapse",
        description: "Too few hands to till the fields, mind the coffers, or keep the peace.",
        icon: "🏚️",
        tonality: "bad",

        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 0,
        absoluteChance: null,

        shortageOf: "manpower",
        onActivate: { gold: -1, food: -1, favor: -0.5 },
        perTurnEffects: { gold: -1, food: -1, favor: -0.5 },
        onExpire: null,
    },
];
