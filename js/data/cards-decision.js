// =====================================================
// DECISION CARDS
// =====================================================
// One schema: each option is an independent inputRes → outputRes trade.
// inputBase is the total cost in gold-equivalent (g-eq). The engine
// splits that cost evenly across the listed inputRes resources and
// translates each share into per-resource units via the canonical rates
// (gold=1, food=0.5, manpower=3, favor=2). The output's g-eq similarly
// splits across the listed outputRes resources.
//
// Both `inputRes` and `outputRes` accept a single resource ("food") or
// a comma-separated list ("food,gold") — see cardSystem.js#applyTradeFormula.
//
// Quality factors are declared at the card level as an array
// `qualityFactors` of the same length as `options`. They're shuffled
// every draw and assigned to options in order — so the best / neutral /
// worst position is randomised each play.
//
// Decisions are UNSKIPPABLE — every option must require a payment. If
// the player cannot afford any option, resources go negative and shortage
// events kick in (or favor turns negative and the run ends). The manual
// trade panel is the survival escape hatch.
//
// Some options can `triggersEvent` to activate an event card on top of
// the trade (currently only `merchantGuild` → `tradeBoom`).
//
// With qualityFactor 1.0 the output's g-eq matches the input's g-eq.
// With 1.3 the player profits ~30% in g-eq; with 0.7 they lose ~30%.
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

        qualityFactors: [0.7, 1.0, 0.9],

        options: [
            { label: "Welcome them as workers", inputRes: "food,gold", outputRes: "manpower,favor", inputBase: 20 },
            { label: "Provide charitable relief", inputRes: "food,manpower", outputRes: "favor", inputBase: 15 },
            { label: "Sell their meager goods", inputRes: "favor", outputRes: "gold", inputBase: 10 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Gift gold", inputRes: "gold", outputRes: "favor", inputBase: 15 },
            { label: "Send thoughts and prayers", inputRes: "favor", outputRes: "favor", inputBase: 15 },
            { label: "Send laborers", inputRes: "manpower", outputRes: "favor", inputBase: 15 },
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

        qualityFactors: [0.9, 1.0, 1.2],

        options: [
            { label: "Feed his men", inputRes: "food", outputRes: "manpower", inputBase: 15 },
            { label: "Buy his retinue", inputRes: "gold", outputRes: "manpower", inputBase: 15 },
            { label: "Knight him personally", inputRes: "favor,gold", outputRes: "manpower,favor", inputBase: 15 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Grant them rights", inputRes: "favor", outputRes: "gold", inputBase: 17, triggersEvent: "tradeBoom" },
            { label: "Assign workers", inputRes: "manpower", outputRes: "gold", inputBase: 17, triggersEvent: "tradeBoom" },
            { label: "Deny them entry", inputRes: "favor", outputRes: "", inputBase: 1 },
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

        qualityFactors: [0.7, 0.8, 0.8],

        options: [
            { label: "Hire mercenaries", inputRes: "gold", outputRes: "manpower", inputBase: 17 },
            { label: "Conscript peasants", inputRes: "favor", outputRes: "manpower", inputBase: 17 },
            { label: "Promise war rations", inputRes: "food", outputRes: "manpower", inputBase: 17 },
        ],
    },
    {
        typeId: "ruralPetition",
        category: "decision",
        name: "Rural Petition",
        description: "The farmers plead for help with the incoming harvest.",
        icon: "🏞️",

        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,

        weight: 10,
        absoluteChance: null,

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Fund irrigation", inputRes: "gold", outputRes: "food", inputBase: 17 },
            { label: "Send laborers", inputRes: "manpower", outputRes: "food", inputBase: 17 },
            { label: "Plants grow themselves", inputRes: "favor", outputRes: "", inputBase: 5 },
        ],
    },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Pay him in coin", inputRes: "gold", outputRes: "favor", inputBase: 14 },
            { label: "Feast the troupe", inputRes: "food", outputRes: "favor", inputBase: 9 },
            { label: "Write him a poem", inputRes: "favor", outputRes: "favor", inputBase: 4 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Pay their contract", inputRes: "gold", outputRes: "manpower", inputBase: 15 },
            { label: "Appeal to honor", inputRes: "favor", outputRes: "manpower", inputBase: 9 },
            { label: "Promise full bellies", inputRes: "food", outputRes: "manpower", inputBase: 15 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Send trained hunters", inputRes: "manpower", outputRes: "food", inputBase: 20 },
            { label: "Equip the expedition", inputRes: "gold", outputRes: "food", inputBase: 20 },
            { label: "Decline the offer", inputRes: "favor", outputRes: "", inputBase: 3 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Squeeze the peasants", inputRes: "favor", outputRes: "gold", inputBase: 17 },
            { label: "Send armed enforcers", inputRes: "manpower", outputRes: "gold", inputBase: 17 },
            { label: "Leap years dont count", inputRes: "gold", outputRes: "", inputBase: 3 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Fund his shop", inputRes: "gold", outputRes: "favor", inputBase: 16 },
            { label: "Assign apprentices", inputRes: "manpower", outputRes: "favor", inputBase: 16 },
            { label: "Provision his herbs", inputRes: "food", outputRes: "favor", inputBase: 16 },
        ],
    },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Grand spectacle (seek renown)", inputRes: "gold", outputRes: "favor", inputBase: 20 },
            { label: "Recruit the champions", inputRes: "gold", outputRes: "manpower", inputBase: 20 },
            { label: "Feast the visiting lords", inputRes: "food", outputRes: "favor", inputBase: 10 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Call in favors for coin", inputRes: "favor", outputRes: "gold", inputBase: 20 },
            { label: "Request a royal garrison", inputRes: "favor", outputRes: "manpower", inputBase: 20 },
            { label: "Beg the royal granaries", inputRes: "favor", outputRes: "food", inputBase: 20 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Turn it into farmland", inputRes: "manpower", outputRes: "food", inputBase: 15 },
            { label: "Harvest the timber", inputRes: "manpower", outputRes: "gold", inputBase: 15 },
            { label: "Trees stay up", inputRes: "favor", outputRes: "favor", inputBase: 3, triggersEvent: "treeLover"},
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Fund a lavish show", inputRes: "gold", outputRes: "favor", inputBase: 20 },
            { label: "Open the granaries for a feast", inputRes: "food", outputRes: "favor", inputBase: 20 },
            { label: "Volunteer labor for the show", inputRes: "manpower", outputRes: "favor", inputBase: 20 },
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

        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Generous pension", inputRes: "gold", outputRes: "favor", inputBase: 10 },
            { label: "Settle him on a farm", inputRes: "food", outputRes: "manpower", inputBase: 15 },
            { label: "You look so young", inputRes: "favor", outputRes: "", inputBase: 5 },
        ],
    },
];
