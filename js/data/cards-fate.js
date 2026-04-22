// =====================================================
// FATE CARDS
// =====================================================
// Instant, no-choice events that just happen. New schema:
//   output = eventBase × (1 / valueOf(outputRes)) × qualityFactor × varianceRoll
// eventBase is sized in gold-equivalent (can be negative for disasters).
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// =====================================================

const fateCards = [
    {
        typeId: "excellentHarvest",
        category: "fate",
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
        category: "fate",
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
];
