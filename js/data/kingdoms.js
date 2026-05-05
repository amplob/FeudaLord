// =====================================================
// KINGDOMS
// =====================================================
// Each kingdom is a "level" the player can pick. Differences between
// kingdoms:
//   - startingResources: difficulty (full purse → frontier scraps).
//   - resourceValues: per-kingdom overrides on top of BASE_RESOURCE_VALUE.
//     A *lower* value means that resource is more abundant (cheaper) in
//     that kingdom — trade rates and event yields scale automatically.
//     A *higher* value means it's scarcer / more precious. Empty object
//     = use defaults everywhere.
// The wheel, card pool, goal (500 favor) and end conditions are shared.
// Cards with `kingdom: "<id>"` only appear in their kingdom (special
// flavour events).
// =====================================================

const KINGDOMS = [
    {
        id: "greenvale",
        name: "Greenvale",
        icon: "🌳",
        description: "A lush peaceful valley. Begin your reign with a full purse and abundant fields.",
        startingResources: { gold: 100, food: 100, manpower: 100, favor: 100 },
        // Defaults across the board — Greenvale is the balanced reference.
        resourceValues: {},
    },
    {
        id: "rivermark",
        name: "Rivermark",
        icon: "⛵",
        description: "A bustling river port. Trade flows freely and supplies are steady.",
        startingResources: { gold: 75, food: 75, manpower: 75, favor: 75 },
        // Food is abundant — fishing fleets and rich silt fields. Cheaper food.
        resourceValues: { food: 0.3 },
    },
    {
        id: "stonehold",
        name: "Stonehold",
        icon: "🗻",
        description: "A spartan keep on rocky soil. Resources are scarce — rule prudently.",
        startingResources: { gold: 50, food: 50, manpower: 50, favor: 50 },
        // Gold pours from the deep mines, but the rocky land grows little and
        // there are few hands willing to come settle.
        resourceValues: { gold: 0.7, food: 0.7, manpower: 4 },
    },
    {
        id: "wolfsedge",
        name: "Wolfsedge",
        icon: "🐺",
        description: "A frontier outpost on the wild marches. You begin with little — earn your dukedom.",
        startingResources: { gold: 25, food: 25, manpower: 25, favor: 25 },
        // The wilderness eats men. Manpower is dear out here.
        resourceValues: { manpower: 4 },
    },
];

const DEFAULT_KINGDOM_ID = "greenvale";

function getKingdom(id) {
    return KINGDOMS.find(k => k.id === id) || KINGDOMS[0];
}
