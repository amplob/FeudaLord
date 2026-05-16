// =====================================================
// HISTORY LINE — DRUIDS OF THE GREENWOOD
// =====================================================
// Entry point: forestClearing's "Trees stay up" option triggers the
// `treeLover` event (below), which sets the static flag [druidContact].
// From there the chain advances through three stages:
//
//   Stage 1  treeLover           (trigger event) → [druidContact]
//   Stage 2  druidsApproach      (requires [druidContact]) → [druidsApproached]
//   Stage 3  druidPact           (requires [druidsApproached])
//              ├─ Embrace        → [druidAlly]
//              ├─ Decline        → [druidNeutral]   (chain ends)
//              └─ Spy            → [druidEnemy]
//   Stage 4a druidWardens         (event,    requires [druidAlly])
//            druidGrove           (decision, requires [druidAlly])
//   Stage 4b forestUnrest         (event,    requires [druidEnemy])
//            druidCurse           (decision, requires [druidEnemy])
//
// All cards are isUnique (story beats fire once). Stage-1 has weight 0
// (only fires from the trigger). All others rely on the wheel's normal
// draw weighted by `weight`, gated by the static flags.
// =====================================================

const historyDruidsCards = [
    // ── Stage 1 — the trigger ─────────────────────────────────────────
    {
        typeId: "treeLover",
        category: "event",
        name: "The Greenwood Watches",
        description: "Your mercy in the wood does not go unseen. Hidden eyes mark you as friend, not foe.",
        icon: "🌳",
        tonality: "good",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 0,                              // never drawn — only via trigger
        absoluteChance: null,

        // Instant: ~2 favor (eventBase 4 g-eq).
        outputRes: "favor",
        eventBase: 4,
        qualityFactor: 1,

        setsStaticFlag: "druidContact",
    },

    // ── Stage 2 — the druids approach ─────────────────────────────────
    {
        typeId: "druidsApproach",
        category: "event",
        name: "Druids at the Gate",
        description: "Robed figures crowned in oak appear at your keep, bearing strange herbs and stranger looks.",
        icon: "🌿",
        tonality: "good",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        requiresStaticFlag: "druidContact",

        // Instant: ~2 manpower from druid attendants (eventBase 6 g-eq).
        outputRes: "manpower",
        eventBase: 6,
        qualityFactor: 1,

        setsStaticFlag: "druidsApproached",
    },

    // ── Stage 3 — the pact: ally / neutral / enemy ────────────────────
    {
        typeId: "druidPact",
        category: "decision",
        name: "The Druids' Bargain",
        description: "The elders offer initiation, polite distance, or your envy if you cross them. The forest waits on your answer.",
        icon: "🍃",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 8,
        absoluteChance: null,

        requiresStaticFlag: "druidsApproached",
        qualityFactors: [0.8, 1.0, 1.2],         // narrower swing — story beat, not a dice game

        options: [
            { label: "Embrace their teachings",
              inputRes: "favor", outputRes: "manpower,favor", inputBase: 15,
              setsStaticFlag: "druidAlly" },
            { label: "Politely decline",
              inputRes: "favor", outputRes: "", inputBase: 5,
              setsStaticFlag: "druidNeutral" },
            { label: "Spy on the council",
              inputRes: "gold", outputRes: "favor", inputBase: 15,
              setsStaticFlag: "druidEnemy" },
        ],
    },

    // ── Stage 4a — ally branch ────────────────────────────────────────
    {
        typeId: "druidWardens",
        category: "event",
        name: "Druid Wardens",
        description: "Cloaked guardians take posts along the marches. The forest fights for you now.",
        icon: "🌲",
        tonality: "good",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        requiresStaticFlag: "druidAlly",

        // Ongoing: small manpower + food trickle for 4 turns.
        duration: 4,
        onActivate: { manpower: 1 },
        perTurnEffects: { manpower: 0.5, food: 0.25 },
        onExpire: null,
    },
    {
        typeId: "druidGrove",
        category: "decision",
        name: "Petition for Sacred Groves",
        description: "The council asks you to spare wide stretches of woodland as sanctuary. They will repay you with the forest's bounty.",
        icon: "🌳",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 6,
        absoluteChance: null,

        requiresStaticFlag: "druidAlly",
        qualityFactors: [0.7, 1.0, 1.3],

        options: [
            { label: "Grant the sanctuary", inputRes: "favor", outputRes: "food", inputBase: 15 },
            { label: "Bargain for warriors", inputRes: "favor", outputRes: "manpower", inputBase: 15 },
            { label: "Refuse — they overreach", inputRes: "favor", outputRes: "", inputBase: 5 },
        ],
    },

    // ── Stage 4b — enemy branch ───────────────────────────────────────
    {
        typeId: "forestUnrest",
        category: "event",
        name: "Forest Unrest",
        description: "Trees grow strangely. Crops at the woodline rot in the night. The druids' ill will is felt.",
        icon: "🥀",
        tonality: "bad",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        requiresStaticFlag: "druidEnemy",

        // Ongoing: bleed food for 3 turns.
        duration: 3,
        onActivate: { food: -2 },
        perTurnEffects: { food: -1.5 },
        onExpire: null,
    },
    {
        typeId: "druidCurse",
        category: "decision",
        name: "A Curse Falls Quiet",
        description: "Mysterious illness sweeps the villages. The mages whisper of green-cloaked figures seen at dusk.",
        icon: "🌑",

        isUnique: true,
        maxInstances: 1,
        minTurn: 1,
        requiresResource: null,

        weight: 5,
        absoluteChance: null,

        requiresStaticFlag: "druidEnemy",
        qualityFactors: [0.6, 1.0, 1.4],         // wider swing — desperation makes things volatile

        options: [
            { label: "Hire a priest to break it", inputRes: "gold", outputRes: "manpower", inputBase: 18 },
            { label: "Make amends, offer tribute", inputRes: "favor", outputRes: "manpower", inputBase: 18 },
            { label: "Endure it grimly", inputRes: "manpower", outputRes: "", inputBase: 6 },
        ],
    },
];
