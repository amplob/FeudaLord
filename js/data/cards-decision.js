// =====================================================
// DECISION CARDS
// =====================================================
// Each option is a zero-sum trade (input gold-equivalent ≈ output
// gold-equivalent when qualityFactor = 1). The formula motor applies
// bulkRoll (size of opportunity) and varianceRoll (quality) per instance.
// Some options can also `triggersEvent` to activate an event card.
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// =====================================================

const decisionCards = [
    {
        typeId: "refugees",
        category: "decision",
        name: "Refugees at the Gates",
        description: "A band of displaced folk asks for shelter.",
        icon: "🚶",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        options: [
            {
                label: "Welcome them (feed & shelter)",
                inputRes: "food",
                outputRes: "manpower",
                inputBase: 30,
                qualityFactor: 1,
            },
            {
                label: "Provide charitable relief",
                inputRes: "food",
                outputRes: "favor",
                inputBase: 30,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "bishopsRequest",
        category: "decision",
        name: "The Bishop's Request",
        description: "The bishop seeks aid for a new chapel.",
        icon: "⛪",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        options: [
            {
                label: "Gift gold",
                inputRes: "gold",
                outputRes: "favor",
                inputBase: 20,
                qualityFactor: 1,
            },
            {
                label: "Send grain",
                inputRes: "food",
                outputRes: "favor",
                inputBase: 30,
                qualityFactor: 1,
            },
            {
                label: "Send laborers",
                inputRes: "manpower",
                outputRes: "favor",
                inputBase: 5,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "knightsOffer",
        category: "decision",
        name: "A Knight's Offer",
        description: "A wandering knight and his retinue seek a lord to serve.",
        icon: "⚔️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        options: [
            {
                label: "Accept his service (feed his men)",
                inputRes: "food",
                outputRes: "manpower",
                inputBase: 30,
                qualityFactor: 1,
            },
            {
                label: "Buy his whole retinue",
                inputRes: "gold",
                outputRes: "manpower",
                inputBase: 20,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "merchantGuild",
        category: "decision",
        name: "Merchant Guild Request",
        description: "Foreign traders want to establish a guild in your lands.",
        icon: "💼",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        options: [
            {
                label: "Let them trade grain (tax heavily)",
                inputRes: "food",
                outputRes: "gold",
                inputBase: 30,
                qualityFactor: 1,
                triggersEvent: "tradeBoom",
            },
            {
                label: "Put workers at their disposal",
                inputRes: "manpower",
                outputRes: "gold",
                inputBase: 5,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "warPreparations",
        category: "decision",
        name: "War in Neighboring Lands",
        description: "Tensions rise. You must raise forces — quickly.",
        icon: "🏰",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 6,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        options: [
            {
                label: "Hire mercenaries",
                inputRes: "gold",
                outputRes: "manpower",
                inputBase: 20,
                qualityFactor: 1,
            },
            {
                label: "Conscript your own (they resent you)",
                inputRes: "favor",
                outputRes: "manpower",
                inputBase: 10,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "ruralPetition",
        category: "decision",
        name: "Rural Petition",
        description: "The farmers plead for help with a failing harvest.",
        icon: "🏞️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        options: [
            {
                label: "Fund irrigation supplies",
                inputRes: "gold",
                outputRes: "food",
                inputBase: 15,
                qualityFactor: 1,
            },
            {
                label: "Send laborers to the fields",
                inputRes: "manpower",
                outputRes: "food",
                inputBase: 3,
                qualityFactor: 1,
            },
        ],
    },
];
