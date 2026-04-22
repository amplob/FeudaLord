// =====================================================
// DECISION CARDS
// =====================================================
// Events that require player choice between options.
// =====================================================

const decisionCards = [
    // ===== PEOPLE & VISITORS =====
    {
        typeId: "knightOffers",
        category: "decision",
        name: "A Knight's Offer",
        description: "A wandering knight offers to serve your lands.",
        icon: "⚔️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: { food: 15 },
        
        weight: 10,
        absoluteChance: null,
        
        options: [
            {
                label: "Accept his service",
                effects: { manpower: 20 },
                perTurnEffects: { food: -5 },
                effectsVariance: 0.2,
            },
            {
                label: "Decline politely",
                effects: { favor: 5 },
                effectsVariance: 0.1,
            }
        ]
    },
    {
        typeId: "merchantsSettle",
        category: "decision",
        name: "Merchant Guild Request",
        description: "Wealthy merchants want to establish a guild in your lands.",
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
                label: "Welcome them",
                effects: { gold: 30 },
                perTurnEffects: { gold: 3 },
                effectsVariance: 0.2,
            },
            {
                label: "Reject (protect local traders)",
                effects: { favor: 15 },
                effectsVariance: 0.15,
            }
        ]
    },
    {
        typeId: "churchDonation",
        category: "decision",
        name: "Church Asks for Donation",
        description: "The bishop requests gold to build a new chapel.",
        icon: "✝️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        options: [
            {
                label: "Donate generously",
                effects: { gold: -25, favor: 15 },
                effectsVariance: 0.15,
            },
            {
                label: "Refuse",
                effects: { favor: -10 },
                effectsVariance: 0.2,
            }
        ]
    },
    {
        typeId: "peasantTaxes",
        category: "decision",
        name: "Peasants Demand Lower Taxes",
        description: "A delegation of peasants pleads for tax relief.",
        icon: "👨‍🌾",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        options: [
            {
                label: "Grant tax relief",
                effects: { favor: 20 },
                perTurnEffects: { gold: -3 },
                effectsVariance: 0.15,
            },
            {
                label: "Maintain current taxes",
                effects: { favor: -15 },
                effectsVariance: 0.2,
            }
        ]
    },
    {
        typeId: "nobleMarriage",
        category: "decision",
        name: "Marriage Alliance Proposal",
        description: "A neighboring noble offers a marriage alliance.",
        icon: "💍",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 5,
        requiresResource: { favor: 20 },
        
        weight: 6,
        absoluteChance: null,
        
        options: [
            {
                label: "Accept the alliance",
                effects: { gold: 50, favor: 20 },
                perTurnEffects: { food: -5 },
                effectsVariance: 0.2,
            },
            {
                label: "Decline respectfully",
                effects: { favor: -5 },
                effectsVariance: 0.1,
            }
        ]
    },
    {
        typeId: "banditsOffer",
        category: "decision",
        name: "Bandits Seek Employment",
        description: "A group of outlaws offers to work as your 'enforcers'.",
        icon: "🗡️",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 2,
        requiresResource: null,
        
        weight: 8,
        absoluteChance: null,
        
        options: [
            {
                label: "Hire them",
                effects: { manpower: 15 },
                perTurnEffects: { favor: -2 },
                effectsVariance: 0.2,
            },
            {
                label: "Send them away",
                effects: {},
                effectsVariance: 0,
            }
        ]
    },
    {
        typeId: "refugeesArrive",
        category: "decision",
        name: "Refugees at the Gates",
        description: "Foreign refugees seek shelter in your lands.",
        icon: "🚶",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: { food: 20 },
        
        weight: 10,
        absoluteChance: null,
        
        options: [
            {
                label: "Welcome them",
                effects: { manpower: 25, food: -20 },
                effectsVariance: 0.2,
            },
            {
                label: "Turn them away",
                effects: { favor: -5 },
                effectsVariance: 0.15,
            }
        ]
    },
    {
        typeId: "festivalProposal",
        category: "decision",
        name: "Festival Proposal",
        description: "Your advisor suggests hosting a grand festival.",
        icon: "🎉",
        
        dependencies: [],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 3,
        requiresResource: { gold: 30, food: 30 },
        
        weight: 8,
        absoluteChance: null,
        
        options: [
            {
                label: "Host the festival!",
                effects: { gold: -30, food: -20, favor: 35 },
                effectsVariance: 0.2,
            },
            {
                label: "Too expensive",
                effects: { favor: -5 },
                effectsVariance: 0.1,
            }
        ]
    },

    // ===== SPECIAL DECISIONS (with dependencies) =====
    {
        typeId: "tavernBrawl",
        category: "decision",
        name: "Tavern Brawl!",
        description: "A massive fight broke out in your tavern!",
        icon: "🍺💥",
        
        dependencies: ["openTavern"],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 15,
        absoluteChance: null,
        
        options: [
            {
                label: "Let them fight it out",
                effects: { manpower: -5, favor: -5 },
                effectsVariance: 0.3,
            },
            {
                label: "Pay for damages",
                effects: { gold: -20, favor: 10 },
                effectsVariance: 0.2,
            },
            {
                label: "Free ale for everyone!",
                effects: { gold: -15, food: -10, favor: 20 },
                effectsVariance: 0.15,
            }
        ]
    },
    {
        typeId: "horseThief",
        category: "decision",
        name: "Horse Thief Caught!",
        description: "Guards caught someone trying to steal from your stables.",
        icon: "🐴🚨",
        
        dependencies: ["buildStables"],
        blockedBy: [],
        isUnique: false,
        maxInstances: null,
        minTurn: 1,
        requiresResource: null,
        
        weight: 12,
        absoluteChance: null,
        
        options: [
            {
                label: "Execute him publicly",
                effects: { favor: -10, manpower: -1 },
                effectsVariance: 0.1,
            },
            {
                label: "Show mercy, put him to work",
                effects: { manpower: 5, favor: 10 },
                effectsVariance: 0.15,
            },
            {
                label: "Fine him heavily",
                effects: { gold: 15 },
                effectsVariance: 0.3,
            }
        ]
    },
    {
        typeId: "churchMiracle",
        category: "decision",
        name: "Miracle at the Church!",
        description: "Pilgrims claim a miracle occurred at your church!",
        icon: "⛪✨",
        
        dependencies: ["buildChurch"],
        blockedBy: [],
        isUnique: false,
        maxInstances: 2,
        minTurn: 1,
        requiresResource: null,
        
        weight: 10,
        absoluteChance: 30, // 30% chance when eligible - it's special!
        
        options: [
            {
                label: "Proclaim it loudly",
                effects: { favor: 30 },
                perTurnEffects: { favor: 2 },
                effectsVariance: 0.2,
            },
            {
                label: "Investigate quietly",
                effects: { favor: 10 },
                effectsVariance: 0.1,
            },
            {
                label: "Charge pilgrims to see it",
                effects: { gold: 40, favor: -15 },
                effectsVariance: 0.25,
            }
        ]
    },
];

