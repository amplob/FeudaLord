// =====================================================
// INVESTMENT CARDS
// =====================================================
// Properties that generate passive income per turn.
// =====================================================

const investmentCards = [
    // ===== FAVOR BUILDINGS =====
    {
        typeId: "buildFountain",
        category: "investment",
        name: "Build a Fountain",
        description: "A beautiful fountain brings joy to the townspeople.",
        icon: "⛲",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        baseCost: { gold: 40, manpower: 10 },
        costVariance: 0.15,
        basePerTurn: { favor: 3 },
        yieldVariance: 0.1,
    },
    {
        typeId: "buildStatue",
        category: "investment",
        name: "Build a Statue",
        description: "A magnificent statue in your honor. The people love it!",
        icon: "🗿",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 3,
        requiresResource: { gold: 50 },
        
        weight: 10,
        absoluteChance: null,
        
        baseCost: { gold: 60, manpower: 15 },
        costVariance: 0.15,
        basePerTurn: { favor: 5 },
        yieldVariance: 0.1,
    },
    {
        typeId: "buildPublicBaths",
        category: "investment",
        name: "Build Public Baths",
        description: "Luxurious baths for all citizens. Requires a fountain first.",
        icon: "🛁",
        
        dependencies: ["buildFountain"],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 5,
        requiresResource: { gold: 80 },
        
        weight: 8,
        absoluteChance: null,
        
        baseCost: { gold: 100, manpower: 25 },
        costVariance: 0.2,
        basePerTurn: { favor: 8 },
        yieldVariance: 0.15,
    },
    {
        typeId: "repairPlaza",
        category: "investment",
        name: "Repair the Plaza",
        description: "Fix the crumbling town square. A quick win for favor.",
        icon: "🏛️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,
        
        weight: 15,
        absoluteChance: null,
        
        baseCost: { gold: 30, manpower: 20 },
        costVariance: 0.1,
        basePerTurn: { favor: 4 },
        yieldVariance: 0.1,
    },

    // ===== FOOD PRODUCTION =====
    {
        typeId: "investTools",
        category: "investment",
        name: "Invest in Tools",
        description: "Better tools mean better harvests.",
        icon: "🔧",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        baseCost: { gold: 35, manpower: 10 },
        costVariance: 0.15,
        basePerTurn: { food: 5 },
        yieldVariance: 0.15,
    },
    {
        typeId: "buildIrrigation",
        category: "investment",
        name: "Build Irrigation",
        description: "Water channels to keep crops healthy year-round.",
        icon: "💧",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 2,
        requiresResource: { gold: 40 },
        
        weight: 10,
        absoluteChance: null,
        
        baseCost: { gold: 50, manpower: 15 },
        costVariance: 0.15,
        basePerTurn: { food: 8 },
        yieldVariance: 0.15,
    },
    {
        typeId: "buyFertilizer",
        category: "investment",
        name: "Buy Fertilizer Supply",
        description: "Smells terrible, but the crops love it.",
        icon: "💩",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 1,
        requiresResource: null,
        
        weight: 10,
        absoluteChance: null,
        
        baseCost: { gold: 40, manpower: 5 },
        costVariance: 0.2,
        basePerTurn: { food: 6 },
        yieldVariance: 0.2,
    },
    {
        typeId: "motivateFarmers",
        category: "investment",
        name: "Motivate Farmers",
        description: "Inspiring speeches! (They'll work harder but like you less)",
        icon: "📢",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 1,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        baseCost: { gold: 20, manpower: 5 },
        costVariance: 0.1,
        basePerTurn: { food: 4, favor: -1 },
        yieldVariance: 0.15,
    },

    // ===== GOLD PRODUCTION =====
    {
        typeId: "buyMine",
        category: "investment",
        name: "Buy a Mine",
        description: "A gold mine! What could go wrong?",
        icon: "⛏️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 3,
        requiresResource: { gold: 60 },
        
        weight: 8,
        absoluteChance: null,
        
        baseCost: { gold: 80, manpower: 20 },
        costVariance: 0.2,
        basePerTurn: { gold: 10 },
        yieldVariance: 0.2,
    },
    {
        typeId: "sendProspectors",
        category: "investment",
        name: "Send Prospectors",
        description: "They'll find gold... but won't come back.",
        icon: "🏔️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 2,
        requiresResource: { manpower: 15 },
        
        weight: 7,
        absoluteChance: null,
        
        baseCost: { gold: 30, manpower: 15 },
        costVariance: 0.15,
        basePerTurn: { gold: 6, manpower: -1 },
        yieldVariance: 0.2,
    },
    {
        typeId: "openTavern",
        category: "investment",
        name: "Open a Tavern",
        description: "Ale, songs, and profits! People love a good tavern.",
        icon: "🍺",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        baseCost: { gold: 45, manpower: 10 },
        costVariance: 0.15,
        basePerTurn: { gold: 5, favor: 2 },
        yieldVariance: 0.15,
    },
    {
        typeId: "establishTradeRoute",
        category: "investment",
        name: "Establish Trade Route",
        description: "Connect with distant merchants for steady income.",
        icon: "🛤️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 4,
        requiresResource: { gold: 50 },
        
        weight: 8,
        absoluteChance: null,
        
        baseCost: { gold: 60, manpower: 10 },
        costVariance: 0.2,
        basePerTurn: { gold: 8 },
        yieldVariance: 0.15,
    },

    // ===== MANPOWER PRODUCTION =====
    {
        typeId: "buildHouses",
        category: "investment",
        name: "Build Houses",
        description: "More homes means more people!",
        icon: "🏠",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 3,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        baseCost: { gold: 50, food: 10 },
        costVariance: 0.15,
        basePerTurn: { manpower: 5 },
        yieldVariance: 0.15,
    },
    {
        typeId: "improveLiving",
        category: "investment",
        name: "Improve Living Conditions",
        description: "Better conditions attract families and boost morale.",
        icon: "🏡",
        
        dependencies: ["buildHouses"],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 3,
        requiresResource: { gold: 30 },
        
        weight: 8,
        absoluteChance: null,
        
        baseCost: { gold: 40, food: 15 },
        costVariance: 0.15,
        basePerTurn: { manpower: 3, favor: 2 },
        yieldVariance: 0.15,
    },
    {
        typeId: "openImmigration",
        category: "investment",
        name: "Open Immigration",
        description: "Foreigners welcome! (Locals are skeptical)",
        icon: "🚪",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 2,
        requiresResource: { food: 20 },
        
        weight: 6,
        absoluteChance: null,
        
        baseCost: { gold: 20, food: 20 },
        costVariance: 0.1,
        basePerTurn: { manpower: 8, favor: -3 },
        yieldVariance: 0.2,
    },

    // ===== SPECIAL / CHAIN BUILDINGS =====
    {
        typeId: "buildStables",
        category: "investment",
        name: "Build Stables",
        description: "Fine horses for your lords. Opens new opportunities.",
        icon: "🐴",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 5,
        requiresResource: { gold: 60 },
        
        weight: 6,
        absoluteChance: null,
        
        baseCost: { gold: 70, manpower: 15, food: 10 },
        costVariance: 0.15,
        basePerTurn: { favor: 3, gold: 2 },
        yieldVariance: 0.1,
    },
    {
        typeId: "buildChurch",
        category: "investment",
        name: "Build a Church",
        description: "A place of worship. The faithful will be grateful.",
        icon: "⛪",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 4,
        requiresResource: { gold: 70, favor: 20 },
        
        weight: 5,
        absoluteChance: null,
        
        baseCost: { gold: 80, manpower: 20 },
        costVariance: 0.15,
        basePerTurn: { favor: 6 },
        yieldVariance: 0.1,
    },
    {
        typeId: "buildMarket",
        category: "investment",
        name: "Build a Market",
        description: "A bustling marketplace brings merchants and coin.",
        icon: "🏪",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: { gold: 40 },
        
        weight: 10,
        absoluteChance: null,
        
        baseCost: { gold: 55, manpower: 12 },
        costVariance: 0.15,
        basePerTurn: { gold: 6, favor: 1 },
        yieldVariance: 0.15,
    },
];

