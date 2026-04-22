// =====================================================
// FATE CARDS
// =====================================================
// Random events with no player choice.
// Good or bad things just happen!
// =====================================================

const fateCards = [
    // ===== POSITIVE EVENTS =====
    {
        typeId: "excellentHarvest",
        category: "fate",
        name: "Excellent Harvest!",
        description: "The gods have blessed your fields!",
        icon: "🌾✨",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 10,
        absoluteChance: null,
        
        effects: { food: 30 },
        effectsVariance: 0.25,
    },
    {
        typeId: "goldDiscovered",
        category: "fate",
        name: "Gold Discovered!",
        description: "A farmer found gold nuggets in his field!",
        icon: "💰🎉",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { gold: 40 },
        effectsVariance: 0.3,
    },
    {
        typeId: "travelersSpreadWord",
        category: "fate",
        name: "Word Spreads of Your Kindness",
        description: "Travelers tell tales of your fair rule.",
        icon: "💬👑",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { favor: 20 },
        effectsVariance: 0.2,
    },
    {
        typeId: "refugeesArriveFate",
        category: "fate",
        name: "Settlers Arrive",
        description: "A group of skilled workers seeks a new home.",
        icon: "🏃👨‍👩‍👧",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { manpower: 15 },
        effectsVariance: 0.25,
    },
    {
        typeId: "merchantCaravan",
        category: "fate",
        name: "Merchant Caravan",
        description: "A wealthy caravan passes through, trading generously.",
        icon: "🐪💰",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { gold: 25, food: 10 },
        effectsVariance: 0.2,
    },

    // ===== NEGATIVE EVENTS =====
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
        minTurn: 4,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        effects: { manpower: -20, favor: -15 },
        effectsVariance: 0.3,
    },
    {
        typeId: "droughtRuins",
        category: "fate",
        name: "Drought Ruins Crops",
        description: "No rain for weeks. The harvest is lost.",
        icon: "☀️🥀",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { food: -25 },
        effectsVariance: 0.25,
    },
    {
        typeId: "thievesRaid",
        category: "fate",
        name: "Thieves Raid Treasury!",
        description: "Bandits snuck in and stole from the coffers!",
        icon: "🦹💰",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,
        
        weight: 7,
        absoluteChance: null,
        
        effects: { gold: -30 },
        effectsVariance: 0.3,
    },
    {
        typeId: "fireDestroys",
        category: "fate",
        name: "Fire Destroys Buildings!",
        description: "A terrible fire swept through the town.",
        icon: "🔥🏚️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        effects: { gold: -20, manpower: -10 },
        effectsVariance: 0.25,
    },
    {
        typeId: "harshWinter",
        category: "fate",
        name: "Harsh Winter",
        description: "The coldest winter in memory takes its toll.",
        icon: "❄️😰",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { food: -20, manpower: -10 },
        effectsVariance: 0.2,
    },

    // ===== MIXED EVENTS =====
    {
        typeId: "kingDemandsTribute",
        category: "fate",
        name: "King Demands Tribute",
        description: "The royal tax collector arrives unexpectedly.",
        icon: "👑📜",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 5,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        effects: { gold: -40, favor: 25 },
        effectsVariance: 0.2,
    },
    {
        typeId: "warNeighboring",
        category: "fate",
        name: "War in Neighboring Lands",
        description: "Refugees and deserters flee to your territory.",
        icon: "⚔️🏃",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 4,
        requiresResource: null,
        
        weight: 6,
        absoluteChance: null,
        
        effects: { manpower: 20, food: -15 },
        effectsVariance: 0.25,
    },
    {
        typeId: "religiousPilgrimage",
        category: "fate",
        name: "Religious Pilgrimage",
        description: "Pilgrims pass through, eating your food but praising you.",
        icon: "🙏🚶",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { food: -15, favor: 25 },
        effectsVariance: 0.2,
    },
    {
        typeId: "mercenariesPass",
        category: "fate",
        name: "Mercenaries Pass Through",
        description: "Sell-swords looking for work. They're expensive but skilled.",
        icon: "💪💰",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: null,
        
        weight: 7,
        absoluteChance: null,
        
        effects: { gold: -25, manpower: 15 },
        effectsVariance: 0.2,
    },

    // ===== SPECIAL FATE (with dependencies) =====
    {
        typeId: "tavernFamous",
        category: "fate",
        name: "Your Tavern Becomes Famous!",
        description: "Bards sing of your tavern across the land!",
        icon: "🍺🎵",
        
        dependencies: ["openTavern"],
        blockedBy: [],
        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,
        
        weight: 5,
        absoluteChance: 25, // Special event
        
        effects: { favor: 20, gold: 15 },
        effectsVariance: 0.15,
    },
    {
        typeId: "mineCollapse",
        category: "fate",
        name: "Mine Collapse!",
        description: "Part of your mine has collapsed!",
        icon: "⛏️💥",
        
        dependencies: ["buyMine"],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        effects: { manpower: -10, gold: -15 },
        effectsVariance: 0.3,
    },
];

