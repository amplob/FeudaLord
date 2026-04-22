// =====================================================
// EVENT CARDS
// =====================================================
// Temporary effects that last for a number of turns.
// Can be triggered by decisions or fate.
// =====================================================

const eventCards = [
    // ===== POSITIVE TEMPORARY EVENTS =====
    {
        typeId: "bountifulSeason",
        category: "event",
        name: "Bountiful Season",
        description: "Perfect weather brings abundant crops!",
        icon: "🌈🌾",
        
        dependencies: [],
        blockedBy: ["droughtEvent"],
        isUnique: false,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        duration: 3,
        perTurnEffects: { food: 8 },
        effectsVariance: 0.15,
        
        onActivate: { favor: 5 },
        onExpire: null,
    },
    {
        typeId: "tradeBoom",
        category: "event",
        name: "Trade Boom",
        description: "Merchants flock to your lands!",
        icon: "📈💰",
        
        dependencies: ["buildMarket"],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        duration: 4,
        perTurnEffects: { gold: 10 },
        effectsVariance: 0.2,
        
        onActivate: { gold: 20 },
        onExpire: null,
    },
    {
        typeId: "religiousFervor",
        category: "event",
        name: "Religious Fervor",
        description: "A wave of piety sweeps the land!",
        icon: "🙏✨",
        
        dependencies: ["buildChurch"],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        duration: 5,
        perTurnEffects: { favor: 5 },
        effectsVariance: 0.15,
        
        onActivate: { favor: 10 },
        onExpire: null,
    },

    // ===== NEGATIVE TEMPORARY EVENTS =====
    {
        typeId: "droughtEvent",
        category: "event",
        name: "Prolonged Drought",
        description: "The sun beats down mercilessly...",
        icon: "☀️🏜️",
        
        dependencies: [],
        blockedBy: ["buildIrrigation"], // Irrigation protects!
        isUnique: false,
        maxInstances: 1,
        minTurn: 4,
        requiresResource: null,
        
        weight: 5,
        absoluteChance: null,
        
        duration: 3,
        perTurnEffects: { food: -8 },
        effectsVariance: 0.2,
        
        onActivate: { favor: -5 },
        onExpire: { favor: 5 }, // Relief when it ends
    },
    {
        typeId: "banditThreat",
        category: "event",
        name: "Bandit Threat",
        description: "Outlaws terrorize the roads!",
        icon: "🗡️😠",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 3,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        duration: 4,
        perTurnEffects: { gold: -5, favor: -3 },
        effectsVariance: 0.25,
        
        onActivate: null,
        onExpire: { favor: 10 }, // People relieved
    },
    {
        typeId: "diseaseOutbreak",
        category: "event",
        name: "Disease Outbreak",
        description: "Sickness spreads through the population.",
        icon: "🤒😷",
        
        dependencies: [],
        blockedBy: ["buildPublicBaths"], // Baths help prevent!
        isUnique: false,
        maxInstances: 1,
        minTurn: 5,
        requiresResource: null,
        
        weight: 4,
        absoluteChance: null,
        
        duration: 3,
        perTurnEffects: { manpower: -5, favor: -3 },
        effectsVariance: 0.3,
        
        onActivate: { manpower: -10 },
        onExpire: null,
    },

    // ===== SPECIAL EVENTS =====
    {
        typeId: "royalVisit",
        category: "event",
        name: "Royal Visit!",
        description: "The King himself visits your lands!",
        icon: "👑🏰",
        
        dependencies: [],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 10,
        requiresResource: { favor: 50, gold: 50 },
        
        weight: 2,
        absoluteChance: 15, // Rare but impactful
        
        duration: 3,
        perTurnEffects: { favor: 10, gold: -10 },
        effectsVariance: 0.1,
        
        onActivate: { favor: 25 },
        onExpire: { favor: 15, gold: 30 }, // Royal gift when leaving
    },
    {
        typeId: "royalVisitStables",
        category: "event",
        name: "King Admires Your Horses!",
        description: "The King is impressed by your stables!",
        icon: "👑🐴",
        
        dependencies: ["buildStables", "royalVisit"],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,
        
        weight: 0, // Only via absoluteChance
        absoluteChance: 80, // Very likely if conditions met
        
        duration: 2,
        perTurnEffects: { favor: 15, gold: 5 },
        effectsVariance: 0.1,
        
        onActivate: { favor: 20 },
        onExpire: { gold: 50 }, // The King buys horses!
    },
    {
        typeId: "warPreparation",
        category: "event",
        name: "War Preparation",
        description: "Neighboring kingdoms prepare for war. You must raise defenses.",
        icon: "⚔️🛡️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 1,
        minTurn: 8,
        requiresResource: null,
        
        weight: 3,
        absoluteChance: null,
        
        duration: 5,
        perTurnEffects: { gold: -8, manpower: -3 },
        effectsVariance: 0.2,
        
        onActivate: { favor: 10 }, // People unite
        onExpire: { favor: 20, manpower: 10 }, // Veterans return
    },
];

