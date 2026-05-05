// Headless simulation harness: load the game's JS files in a vm sandbox,
// then run simulateMultipleRuns. Usage:
//   node sim-cli.js                # full
//   node sim-cli.js decision       # decision-only
//   node sim-cli.js event          # event-only
//   node sim-cli.js decision 200 200
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;

function stubElement() {
    const el = {
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        addEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        innerHTML: "",
        textContent: "",
        value: "",
        children: [],
    };
    el.firstChild = null;
    return el;
}

const documentStub = {
    addEventListener: () => {},
    getElementById: () => stubElement(),
    createElement: () => stubElement(),
    querySelector: () => stubElement(),
    querySelectorAll: () => [],
    body: stubElement(),
    documentElement: stubElement(),
};

const silentConsole = { log: () => {}, warn: () => {}, error: console.error, info: () => {}, debug: () => {} };
const ctx = vm.createContext({
    document: documentStub,
    window: {},
    console: silentConsole,
    Math,
    Date,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Symbol,
    structuredClone,
    setTimeout: () => {},
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
    },
});

const files = [
    "js/data/kingdoms.js",
    "js/data/cards-investment.js",
    "js/data/cards-decision.js",
    "js/data/cards-event.js",
    "js/cardSystem.js",
    "js/wheel.js",
    "js/trade.js",
    "js/ui.js",
    "js/stats.js",
    "js/daily.js",
    "js/game.js",
    "js/debug.js",
];

for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8");
    try {
        vm.runInContext(code, ctx, { filename: f });
    } catch (e) {
        console.error(`load error in ${f}:`, e.message);
    }
}

// Initialize the card system so allCards gets populated.
vm.runInContext("initCardSystem();", ctx);

const filter = process.argv[2] || null;
const runs = parseInt(process.argv[3], 10) || 100;
const turns = parseInt(process.argv[4], 10) || 100;

const filterArg = filter && filter !== "full" ? `"${filter}"` : "null";
const result = vm.runInContext(
    `simulateMultipleRuns(${runs}, ${turns}, ${filterArg})`,
    ctx
);

const mode = filter && filter !== "full" ? `${filter} only` : "full";
console.log(`\n${runs} runs × ${turns} turns · ${mode}`);
console.log("Resource    Mean");
for (const [k, v] of Object.entries(result.stats)) {
    console.log(`  ${k.padEnd(10)} ${String(v.mean).padStart(6)}`);
}

const goldEq = { gold: 1, food: 0.5, manpower: 3, favor: 2 };
const totalGold = Object.entries(result.stats).reduce(
    (s, [k, v]) => s + v.mean * goldEq[k],
    0
);
console.log(`  total g-eq ${String(Math.round(totalGold)).padStart(6)}`);
