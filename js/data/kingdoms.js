// =====================================================
// KINGDOMS
// =====================================================
// Each kingdom is a "level" the player can pick. Currently the only thing
// that varies is the starting resources — the wheel, card pool, goal
// (500 favor) and end conditions are shared. Difficulty scales from
// Greenvale (100 of each) down to Wolfsedge (25 of each).
// Future: per-kingdom flag presets, custom decks, distinct goals.
// =====================================================

const KINGDOMS = [
    {
        id: "greenvale",
        name: "Greenvale",
        icon: "🌳",
        description: "A lush peaceful valley. Begin your reign with a full purse and abundant fields.",
        startingResources: { gold: 100, food: 100, manpower: 100, favor: 100 },
    },
    {
        id: "rivermark",
        name: "Rivermark",
        icon: "⛵",
        description: "A bustling river port. Trade flows freely and supplies are steady.",
        startingResources: { gold: 75, food: 75, manpower: 75, favor: 75 },
    },
    {
        id: "stonehold",
        name: "Stonehold",
        icon: "🗻",
        description: "A spartan keep on rocky soil. Resources are scarce — rule prudently.",
        startingResources: { gold: 50, food: 50, manpower: 50, favor: 50 },
    },
    {
        id: "wolfsedge",
        name: "Wolfsedge",
        icon: "🐺",
        description: "A frontier outpost on the wild marches. You begin with little — earn your dukedom.",
        startingResources: { gold: 25, food: 25, manpower: 25, favor: 25 },
    },
];

const DEFAULT_KINGDOM_ID = "greenvale";

function getKingdom(id) {
    return KINGDOMS.find(k => k.id === id) || KINGDOMS[0];
}
