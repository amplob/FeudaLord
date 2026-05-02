// =====================================================
// DECISION CARDS
// =====================================================
// Two schemas coexist:
//  - Per-option trade: each option is a zero-sum trade (inputRes → outputRes).
//  - Fixed-output: card-level outputRes + outputBase set the reward; each
//    option is a different payment method (inputRes). outputAmount is rolled
//    once per card; inputAmount is rolled per option.
// Canonical values: gold=1, food=0.5, manpower=3, favor=2.
// Decisions are UNSKIPPABLE — every option must require a payment. If the
// player cannot afford any option, resources go negative and verifyState()
// ends the game. The manual trade panel is the survival safety net.
// Some options can `triggersEvent` to activate an event card.
// Each card has THREE options with differentiated qualityFactor (0.7 / 1.0 / 1.3)
// so one option is mechanically best, one neutral, one worst — variance can
// occasionally flip outcomes. The "best" position is shuffled across cards
// so the player must read each one. For per-option trades, qualityFactor
// scales the OUTPUT (higher = better deal); for fixed-output, qualityFactor
// reduces the INPUT cost (higher = pay less for the same reward).
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

        // Per-option trade: spend food, get different resources back.
        options: [
            {
                label: "Welcome them as workers",
                inputRes: "food",
                outputRes: "manpower",
                inputBase: 12,
                qualityFactor: 1.3,
            },
            {
                label: "Provide charitable relief",
                inputRes: "food",
                outputRes: "favor",
                inputBase: 12,
                qualityFactor: 1.0,
            },
            {
                label: "Sell their meager goods",
                inputRes: "food",
                outputRes: "gold",
                inputBase: 12,
                qualityFactor: 0.7,
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

        outputRes: "favor",
        outputBase: 7.5,

        options: [
            { label: "Gift gold", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Send grain", inputRes: "food", qualityFactor: 1.3 },
            { label: "Send laborers", inputRes: "manpower", qualityFactor: 0.7 },
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

        outputRes: "manpower",
        outputBase: 5,

        options: [
            { label: "Feed his men", inputRes: "food", qualityFactor: 1.0 },
            { label: "Buy his retinue", inputRes: "gold", qualityFactor: 0.7 },
            { label: "Knight him personally", inputRes: "favor", qualityFactor: 1.3 },
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

        outputRes: "gold",
        outputBase: 17,

        options: [
            // Food option also triggers a Trade Boom event — big bonus on top of the gold.
            { label: "Grant grain rights", inputRes: "food", qualityFactor: 1.3, triggersEvent: "tradeBoom" },
            { label: "Assign workers", inputRes: "manpower", qualityFactor: 0.7 },
            { label: "Royal endorsement", inputRes: "favor", qualityFactor: 1.0 },
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

        outputRes: "manpower",
        outputBase: 5.5,

        options: [
            { label: "Hire mercenaries", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Conscript peasants", inputRes: "favor", qualityFactor: 1.3 },
            { label: "Promise war rations", inputRes: "food", qualityFactor: 0.7 },
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

        outputRes: "food",
        outputBase: 33,

        options: [
            { label: "Fund irrigation", inputRes: "gold", qualityFactor: 1.3 },
            { label: "Send laborers", inputRes: "manpower", qualityFactor: 1.0 },
            { label: "Decree royal levy", inputRes: "favor", qualityFactor: 0.7 },
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

        outputRes: "favor",
        outputBase: 7,

        options: [
            { label: "Pay him in coin", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Feast the troupe", inputRes: "food", qualityFactor: 1.3 },
            { label: "Lend him guards", inputRes: "manpower", qualityFactor: 0.7 },
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

        outputRes: "gold",
        outputBase: 17,

        options: [
            { label: "Sell the grain", inputRes: "food", qualityFactor: 1.3 },
            { label: "Command royal levy", inputRes: "favor", qualityFactor: 0.7 },
            { label: "Use serfs to ship it", inputRes: "manpower", qualityFactor: 1.0 },
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

        outputRes: "manpower",
        outputBase: 5,

        options: [
            { label: "Pay their contract", inputRes: "gold", qualityFactor: 1.3 },
            { label: "Appeal to honor", inputRes: "favor", qualityFactor: 1.0 },
            { label: "Promise full bellies", inputRes: "food", qualityFactor: 0.7 },
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

        outputRes: "food",
        outputBase: 40,

        options: [
            { label: "Send trained hunters", inputRes: "manpower", qualityFactor: 1.3 },
            { label: "Equip the expedition", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Royal hunting decree", inputRes: "favor", qualityFactor: 0.7 },
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

        outputRes: "gold",
        outputBase: 17,

        options: [
            { label: "Squeeze the peasants", inputRes: "favor", qualityFactor: 0.7 },
            { label: "Send armed enforcers", inputRes: "manpower", qualityFactor: 1.0 },
            { label: "Collect grain tithes", inputRes: "food", qualityFactor: 1.3 },
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

        outputRes: "food",
        outputBase: 35,

        options: [
            { label: "Pay in coin", inputRes: "gold", qualityFactor: 1.3 },
            { label: "Offer royal favor", inputRes: "favor", qualityFactor: 1.0 },
            { label: "Trade workers for caravans", inputRes: "manpower", qualityFactor: 0.7 },
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

        outputRes: "favor",
        outputBase: 8,

        options: [
            { label: "Fund his shop", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Assign apprentices", inputRes: "manpower", qualityFactor: 0.7 },
            { label: "Provision his herbs", inputRes: "food", qualityFactor: 1.3 },
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

        outputRes: "manpower",
        outputBase: 5,

        options: [
            { label: "Feed and house them", inputRes: "food", qualityFactor: 1.3 },
            { label: "Equip them properly", inputRes: "gold", qualityFactor: 1.0 },
            { label: "Drape them in royal colors", inputRes: "favor", qualityFactor: 0.7 },
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

        outputRes: "gold",
        outputBase: 20,

        options: [
            { label: "Accept the match (political cost)", inputRes: "favor", qualityFactor: 1.0 },
            { label: "Send an armed escort", inputRes: "manpower", qualityFactor: 1.3 },
            { label: "Provision the wedding feast", inputRes: "food", qualityFactor: 0.7 },
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
                qualityFactor: 1.3,
            },
            {
                label: "Recruit the champions",
                inputRes: "gold",
                outputRes: "manpower",
                inputBase: 20,
                qualityFactor: 1.0,
            },
            {
                label: "Feast the visiting lords",
                inputRes: "gold",
                outputRes: "food",
                inputBase: 20,
                qualityFactor: 0.7,
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
                qualityFactor: 1.0,
            },
            {
                label: "Request a royal garrison",
                inputRes: "favor",
                outputRes: "manpower",
                inputBase: 10,
                qualityFactor: 1.3,
            },
            {
                label: "Beg the royal granaries",
                inputRes: "favor",
                outputRes: "food",
                inputBase: 10,
                qualityFactor: 0.7,
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
                qualityFactor: 1.3,
            },
            {
                label: "Harvest the timber",
                inputRes: "manpower",
                outputRes: "gold",
                inputBase: 5,
                qualityFactor: 1.0,
            },
            {
                label: "Donate the wood to the church",
                inputRes: "manpower",
                outputRes: "favor",
                inputBase: 5,
                qualityFactor: 0.7,
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
                qualityFactor: 1.3,
            },
            {
                label: "Open the granaries for a feast",
                inputRes: "food",
                outputRes: "favor",
                inputBase: 40,
                qualityFactor: 0.7,
            },
            {
                label: "Volunteer labor for the show",
                inputRes: "manpower",
                outputRes: "favor",
                inputBase: 5,
                qualityFactor: 1.0,
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
                qualityFactor: 1.0,
            },
            {
                label: "Settle him on a farm",
                inputRes: "food",
                outputRes: "manpower",
                inputBase: 30,
                qualityFactor: 1.3,
            },
            {
                label: "Reward him with lands",
                inputRes: "gold",
                outputRes: "manpower",
                inputBase: 20,
                qualityFactor: 0.7,
            },
        ],
    },
];
