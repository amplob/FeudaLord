// =====================================================
// DECISION CARDS
// =====================================================
// Two schemas coexist:
//  - Per-option trade: each option is a zero-sum trade (inputRes → outputRes).
//  - Fixed-output: card-level outputRes + outputBase set the reward; each
//    option is a different payment method (inputRes) or a reject (no input).
//    outputAmount is rolled once per card; inputAmount is rolled per option.
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// Some options can `triggersEvent` to activate an event card.
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
        description: "The bishop seeks aid for a new chapel. He will bless those who give.",
        icon: "⛪",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // Fixed output: ~15 g-eq of favor on average (7.5 × 2 × bulkMean 1.25)
        outputRes: "favor",
        outputBase: 7.5,

        options: [
            { label: "Gift gold", inputRes: "gold", qualityFactor: 1 },
            { label: "Send grain", inputRes: "food", qualityFactor: 1 },
            { label: "Send laborers", inputRes: "manpower", qualityFactor: 1 },
            { label: "Refuse the bishop", qualityFactor: 1 },
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

        // Fixed output: ~18 g-eq of manpower on average (6 × 3 × bulkMean 1.25 ≈ 22.5 g-eq)
        outputRes: "manpower",
        outputBase: 6,

        options: [
            { label: "Feed his men", inputRes: "food", qualityFactor: 1 },
            { label: "Buy his retinue", inputRes: "gold", qualityFactor: 1 },
            { label: "Send him away", qualityFactor: 1 },
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

        // Fixed output: ~18 g-eq of gold (22.5 g-eq average)
        outputRes: "gold",
        outputBase: 18,

        options: [
            // Food option also triggers a Trade Boom event — big bonus on top of the gold.
            { label: "Grant grain rights", inputRes: "food", qualityFactor: 1, triggersEvent: "tradeBoom" },
            { label: "Assign workers", inputRes: "manpower", qualityFactor: 1 },
            { label: "Reject the guild", qualityFactor: 1 },
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

        // Fixed output: ~19.5 g-eq of manpower (6.5 × 3 × bulkMean 1.25 ≈ 24 g-eq)
        outputRes: "manpower",
        outputBase: 6.5,

        options: [
            { label: "Hire mercenaries", inputRes: "gold", qualityFactor: 1 },
            { label: "Conscript peasants", inputRes: "favor", qualityFactor: 1 },
            { label: "Stay neutral", qualityFactor: 1 },
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

        // Fixed output: ~15 g-eq of food (30 × 0.5 × bulkMean 1.25 ≈ 18.75 g-eq)
        outputRes: "food",
        outputBase: 30,

        options: [
            { label: "Fund irrigation", inputRes: "gold", qualityFactor: 1 },
            { label: "Send laborers", inputRes: "manpower", qualityFactor: 1 },
            { label: "Ignore their pleas", qualityFactor: 1 },
        ],
    },
];
