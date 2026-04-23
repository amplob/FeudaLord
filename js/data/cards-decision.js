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

    // --- Fixed-output trade ---

    {
        typeId: "travelingMinstrel",
        category: "decision",
        name: "A Traveling Minstrel",
        description: "A minstrel offers to sing of your glory across the realm.",
        icon: "🎵",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~17 g-eq of favor (7 × 2 × bulkMean 1.25 = 17.5)
        outputRes: "favor",
        outputBase: 7,

        options: [
            { label: "Pay him in coin", inputRes: "gold", qualityFactor: 1 },
            { label: "Feast the troupe", inputRes: "food", qualityFactor: 1 },
            { label: "Send him away", qualityFactor: 1 },
        ],
    },
    {
        typeId: "surplusGrainOffer",
        category: "decision",
        name: "Surplus Grain Offer",
        description: "A merchant offers fair prices for your grain reserves.",
        icon: "🌽",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~22 g-eq of gold (18 × 1 × bulkMean 1.25 = 22.5)
        outputRes: "gold",
        outputBase: 18,

        options: [
            { label: "Sell the grain", inputRes: "food", qualityFactor: 1 },
            { label: "Keep the reserves", qualityFactor: 1 },
        ],
    },
    {
        typeId: "foreignMercenaries",
        category: "decision",
        name: "Foreign Mercenaries",
        description: "A band of sellswords offers their blades — for a price.",
        icon: "🗡️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // ~22 g-eq of manpower (6 × 3 × bulkMean 1.25 = 22.5)
        outputRes: "manpower",
        outputBase: 6,

        options: [
            { label: "Pay their contract", inputRes: "gold", qualityFactor: 1 },
            { label: "Appeal to honor", inputRes: "favor", qualityFactor: 1 },
            { label: "Send them away", qualityFactor: 1 },
        ],
    },
    {
        typeId: "huntingParty",
        category: "decision",
        name: "Great Hunting Party",
        description: "The huntmaster proposes a grand expedition into the deep forest.",
        icon: "🏹",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~22 g-eq of food (35 × 0.5 × bulkMean 1.25 = 21.9)
        outputRes: "food",
        outputBase: 35,

        options: [
            { label: "Send trained hunters", inputRes: "manpower", qualityFactor: 1 },
            { label: "Equip the expedition", inputRes: "gold", qualityFactor: 1 },
            { label: "Cancel the hunt", qualityFactor: 1 },
        ],
    },
    {
        typeId: "taxCollection",
        category: "decision",
        name: "Tax Collection Round",
        description: "The steward asks how hard to squeeze this year's levy.",
        icon: "💰",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~22 g-eq of gold (18 × 1 × bulkMean 1.25 = 22.5)
        outputRes: "gold",
        outputBase: 18,

        options: [
            { label: "Squeeze the peasants", inputRes: "favor", qualityFactor: 1 },
            { label: "Keep a light hand", qualityFactor: 1 },
        ],
    },
    {
        typeId: "saltMerchant",
        category: "decision",
        name: "The Salt Merchant",
        description: "A caravan from the coast brings barrels of precious salt.",
        icon: "🧂",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~19 g-eq of food (30 × 0.5 × bulkMean 1.25 = 18.75)
        outputRes: "food",
        outputBase: 30,

        options: [
            { label: "Pay in coin", inputRes: "gold", qualityFactor: 1 },
            { label: "Offer royal favor", inputRes: "favor", qualityFactor: 1 },
            { label: "Let him pass on", qualityFactor: 1 },
        ],
    },
    {
        typeId: "apothecaryArrives",
        category: "decision",
        name: "An Apothecary Arrives",
        description: "A learned healer asks for patronage to set up shop.",
        icon: "🧪",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        // ~20 g-eq of favor (8 × 2 × bulkMean 1.25 = 20)
        outputRes: "favor",
        outputBase: 8,

        options: [
            { label: "Fund his shop", inputRes: "gold", qualityFactor: 1 },
            { label: "Assign apprentices", inputRes: "manpower", qualityFactor: 1 },
            { label: "Turn him away", qualityFactor: 1 },
        ],
    },
    {
        typeId: "peasantVolunteers",
        category: "decision",
        name: "Peasant Volunteers",
        description: "Young men from the villages offer to join the guard.",
        icon: "🧑‍🌾",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        // ~22 g-eq of manpower (6 × 3 × bulkMean 1.25 = 22.5)
        outputRes: "manpower",
        outputBase: 6,

        options: [
            { label: "Feed and house them", inputRes: "food", qualityFactor: 1 },
            { label: "Equip them properly", inputRes: "gold", qualityFactor: 1 },
            { label: "Turn them down", qualityFactor: 1 },
        ],
    },
    {
        typeId: "dowryOffered",
        category: "decision",
        name: "A Dowry Offered",
        description: "A distant house proposes a marriage alliance with a handsome dowry.",
        icon: "💍",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 4,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        // ~25 g-eq of gold (20 × 1 × bulkMean 1.25 = 25)
        outputRes: "gold",
        outputBase: 20,

        options: [
            { label: "Accept the match (political cost)", inputRes: "favor", qualityFactor: 1 },
            { label: "Send an armed escort", inputRes: "manpower", qualityFactor: 1 },
            { label: "Decline the offer", qualityFactor: 1 },
        ],
    },

    // --- Per-option trade (zero-sum swaps) ---

    {
        typeId: "tournament",
        category: "decision",
        name: "Host a Tournament",
        description: "Knights from across the realm come to test their mettle.",
        icon: "🤺",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 4,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        options: [
            {
                label: "Grand spectacle (seek renown)",
                inputRes: "gold",
                outputRes: "favor",
                inputBase: 20,
                qualityFactor: 1,
            },
            {
                label: "Recruit the champions",
                inputRes: "gold",
                outputRes: "manpower",
                inputBase: 20,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "royalDecree",
        category: "decision",
        name: "Royal Decree",
        description: "A messenger from the crown demands you spend your standing.",
        icon: "📜",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 9,
        absoluteChance: null,

        options: [
            {
                label: "Call in favors for coin",
                inputRes: "favor",
                outputRes: "gold",
                inputBase: 10,
                qualityFactor: 1,
            },
            {
                label: "Request a royal garrison",
                inputRes: "favor",
                outputRes: "manpower",
                inputBase: 10,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "forestClearing",
        category: "decision",
        name: "Forest Clearing Offer",
        description: "The woodcutters ask where to put their backs.",
        icon: "🪓",

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
                label: "Turn it into farmland",
                inputRes: "manpower",
                outputRes: "food",
                inputBase: 5,
                qualityFactor: 1,
            },
            {
                label: "Harvest the timber",
                inputRes: "manpower",
                outputRes: "gold",
                inputBase: 5,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "festivalOfLights",
        category: "decision",
        name: "Festival of Lights",
        description: "The townsfolk wish to hold a festival — but who pays?",
        icon: "🎆",

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
                label: "Fund a lavish show",
                inputRes: "gold",
                outputRes: "favor",
                inputBase: 20,
                qualityFactor: 1,
            },
            {
                label: "Open the granaries for a feast",
                inputRes: "food",
                outputRes: "favor",
                inputBase: 40,
                qualityFactor: 1,
            },
        ],
    },
    {
        typeId: "oldKnightRetires",
        category: "decision",
        name: "An Old Knight Retires",
        description: "A loyal veteran asks how you'll see him off.",
        icon: "🛡️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 5,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        options: [
            {
                label: "Generous pension",
                inputRes: "gold",
                outputRes: "favor",
                inputBase: 20,
                qualityFactor: 1,
            },
            {
                label: "Settle him on a farm",
                inputRes: "food",
                outputRes: "manpower",
                inputBase: 30,
                qualityFactor: 1,
            },
        ],
    },
];
