# Decisions — Reference & Tuning Sheet

A snapshot of the 20 decision cards in `js/data/cards-decision.js`, the
parametrization rules, and the good-vs-bad ratios — so we can keep
iterating on balance the same way we did with investments.

---

## What a decision is

- Pop-up presented to the player; they pick **one of 3 options**.
- **Unskippable** — every option requires a payment. If the player can't
  afford any, resources go negative and shortage events kick in (or favor
  drops below zero and the run ends). The manual trade panel is the
  survival escape hatch.
- Some options can `triggersEvent: "<eventTypeId>"` to fire an event card
  on top of the trade (currently only `merchantGuild` → `tradeBoom`).
- **Quality factors are shuffled every draw** — the player can't memorise
  "option 2 is always best on card X". They have to read the rolled
  amounts and decide.

---

## Schema — one path for every decision

Each option is an **independent inputRes → outputRes trade**. The card
declares a `qualityFactors` array (one factor per option); at draw time
the factors are shuffled and assigned to options in order.

```js
{
  typeId: "tournament",
  category: "decision",
  name: "Host a Tournament",
  description: "...",
  icon: "🤺",

  dependencies: [], blockedBy: [],
  isUnique: false, maxInstances: null,
  minTurn: 4, requiresResource: null,
  weight: 9, absoluteChance: null,

  qualityFactors: [0.7, 1.0, 1.3],   // shuffled per draw

  options: [
    { label: "Grand spectacle (seek renown)", inputRes: "gold", outputRes: "favor",    inputBase: 20 },
    { label: "Recruit the champions",         inputRes: "gold", outputRes: "manpower", inputBase: 20 },
    { label: "Feast the visiting lords",      inputRes: "gold", outputRes: "food",     inputBase: 20 },
  ],
}
```

Both `inputRes` AND `outputRes` can vary across the three options — same
input + varied outputs (Tournament), varied inputs + same output
(BishopsRequest), or fully mixed (OldKnightRetires).

The legacy "fixed-output" schema (`outputRes`/`outputBase` at the card
level) is gone, and so is `applyFixedOutputTrade` in `cardSystem.js`.
The validator will flag any card that still carries those fields.

---

## Parametrization fields

| Field | Level | Type | Purpose |
|-------|-------|------|---------|
| `qualityFactors` | card | number[] | Shuffled & assigned to options at draw time. Length must match `options`. |
| `inputRes` | option | string | What this option costs |
| `outputRes` | option | string | What this option yields |
| `inputBase` | option | number | Cost size, in input-resource units, before the bulk roll |
| `triggersEvent` | option | string? | Optional event typeId to fire when chosen |

Per-card meta (same as other card types): `typeId`, `name`,
`description`, `icon`, `minTurn`, `weight`, `dependencies`, `blockedBy`,
`requiresResource`.

---

## Math

Canonical resource values (g-eq): `gold=1`, `food=0.5`, `manpower=3`, `favor=2`.

**Random rolls (every option draw):**
- `bulkRoll ∈ [0.5, 2]` — scales the size of the swap (per option)
- `varianceRoll ∈ [0.85, 1.15]` — small per-option quality jitter
- `qualityFactor` — pulled from the card's shuffled `qualityFactors` array

**Formula** (one for every option):
```
inputAmount  = inputBase × bulkRoll
outputAmount = inputAmount × canonicalRate(in→out) × qualityFactor × varianceRoll
```

At `qualityFactor = 1` the swap is canonical (zero sum in g-eq). At 1.3
the player profits ~30% in g-eq; at 0.7 they lose ~30%.

**Rule of thumb for sizing inputBase**: pick the desired g-eq scale of
the trade and divide by the input's value:
`inputBase ≈ desired_g-eq / value(inputRes)`.

Most current cards target **15–20 g-eq** per option, matching the
investment-tier scale of mid-game decisions.

---

## Good-vs-bad ratios

Every card uses the **0.7 / 1.0 / 1.3** spread in its `qualityFactors`.
Three options, three quality bands.

| qualityFactor | Tag | Profit/loss in g-eq | Realised range (with ±15% variance) |
|---------------|-----|---------------------|--------------------------------------|
| **1.3** | best | +30% over canonical | 1.105 – 1.495 |
| **1.0** | neutral | breakeven | 0.85 – 1.15 |
| **0.7** | worst | −30% loss | 0.595 – 0.805 |

The neutral and best bands overlap slightly (a low-rolled best can equal
a high-rolled neutral). Across many plays the ordering holds. Because
the array is **shuffled per draw**, neither label position nor
input/output choice predicts which band you'll roll — only the displayed
amounts do (the UI shows the resolved input and output for each option
before the player picks).

---

## Card catalog (20)

All cards use `qualityFactors: [0.7, 1.0, 1.3]`. Options column lists
`input → output, inputBase` for each option.

| # | typeId | name | minTurn | Options (input → output, base) |
|---|--------|------|---------|---------------------------------|
| 1 | refugees | Refugees at the Gates | 2 | 12🌾→👥 · 12🌾→👑 · 12🌾→💰 |
| 2 | bishopsRequest | The Bishop's Request | 1 | 15💰→👑 · 30🌾→👑 · 5👥→👑 |
| 3 | knightsOffer | A Knight's Offer | 2 | 30🌾→👥 · 15💰→👥 · 7.5👑→👥 |
| 4 | merchantGuild | Merchant Guild Request | 3 | 34🌾→💰 (+tradeBoom) · 6👥→💰 · 8.5👑→💰 |
| 5 | warPreparations | War in Neighboring Lands | 6 | 17💰→👥 · 8.5👑→👥 · 33🌾→👥 |
| 6 | ruralPetition | Rural Petition | 3 | 17💰→🌾 · 5.5👥→🌾 · 8.5👑→🌾 |
| 7 | travelingMinstrel | A Traveling Minstrel | 1 | 14💰→👑 · 28🌾→👑 · 5👥→👑 |
| 8 | surplusGrainOffer | Surplus Grain Offer | 2 | 34🌾→💰 · 8.5👑→💰 · 6👥→💰 |
| 9 | foreignMercenaries | Foreign Mercenaries | 3 | 15💰→👥 · 7.5👑→👥 · 30🌾→👥 |
| 10 | huntingParty | Great Hunting Party | 2 | 7👥→🌾 · 20💰→🌾 · 10👑→🌾 |
| 11 | taxCollection | Tax Collection Round | 1 | 8.5👑→💰 · 6👥→💰 · 34🌾→💰 |
| 12 | saltMerchant | The Salt Merchant | 2 | 18💰→🌾 · 9👑→🌾 · 6👥→🌾 |
| 13 | apothecaryArrives | An Apothecary Arrives | 3 | 16💰→👑 · 5👥→👑 · 32🌾→👑 |
| 14 | peasantVolunteers | Peasant Volunteers | 2 | 30🌾→👥 · 15💰→👥 · 7.5👑→👥 |
| 15 | dowryOffered | A Dowry Offered | 4 | 10👑→💰 · 7👥→💰 · 40🌾→💰 |
| 16 | tournament | Host a Tournament | 4 | 20💰→👑 · 20💰→👥 · 20💰→🌾 |
| 17 | royalDecree | Royal Decree | 3 | 10👑→💰 · 10👑→👥 · 10👑→🌾 |
| 18 | forestClearing | Forest Clearing Offer | 2 | 5👥→🌾 · 5👥→💰 · 5👥→👑 |
| 19 | festivalOfLights | Festival of Lights | 3 | 20💰→👑 · 40🌾→👑 · 7👥→👑 |
| 20 | oldKnightRetires | An Old Knight Retires | 5 | 20💰→👑 · 30🌾→👥 · 20💰→👥 |

**Per-card input-side g-eq** (rounded): cards 2-9 and 11-15 all sit
around **15–20 g-eq** per option (the size implied by the old
fixed-output formulas they were converted from). #1 (refugees) is
deliberately small (6 g-eq) as an early-game card. #16 (tournament) and
#19 (festival) target **20 g-eq**. #17 (royalDecree) is 20 g-eq.
#18 (forestClearing) is 15 g-eq.

---

## Output distribution

Across all 60 options on the 20 cards:

| Output resource | Option count |
|-----------------|--------------|
| 💰 Gold | 14 |
| 🌾 Food | 12 |
| 👥 Manpower | 16 |
| 👑 Favor | 18 |

| Input resource | Option count |
|----------------|--------------|
| 💰 Gold | 14 |
| 🌾 Food | 17 |
| 👥 Manpower | 16 |
| 👑 Favor | 13 |

Reasonably balanced both ways — every resource is a meaningful payment
and a meaningful reward at multiple points in the deck.

---

## Observations & tuning levers

1. **Random quality has no positional bias** — the best slot is no
   longer "always the food option" or "always the third option". The
   player has to read the rolled amounts.

2. **Mostly homogeneous output per card.** 13 of 20 cards have all three
   options yielding the same resource. Only #1, #15, #16, #17, #18, #19,
   #20 vary outputs. There's room to mix more if Marc wants more
   strategic depth (pick the resource you need, not the cheapest path).

3. **Output sizes are still uniform (14–20 g-eq).** No "tiny but cheap"
   or "huge but expensive" decisions yet. A second pass could add small
   early-game decisions (5 g-eq) and big late-game ones (40 g-eq).

4. **`triggersEvent` is used exactly once** (`merchantGuild` →
   `tradeBoom`). Underused as a design tool — good place to add combo
   payouts on otherwise modest options.

5. **`minTurn` is the only gating mechanism** today (1–6 range). Nothing
   uses `requiresIncome` like investments. Worth considering for
   late-game decisions (e.g., tournament unlocks once gold yield ≥ 1).

6. **No "trap" or "bonus" cards yet.** Every card uses the same
   [0.7, 1.0, 1.3] split. A rare card with [0.5, 0.7, 1.0] (all bad) or
   [1.0, 1.3, 1.6] (all good) would stand out and reward attention.

---

## Files referenced

- `js/data/cards-decision.js` — card catalog
- `js/cardSystem.js#applyTradeFormula` — option math
- `js/cardSystem.js#createCardInstance` (decision branch) — quality
  shuffling and effect resolution
- `js/cardSystem.js#shuffleArray` — Fisher-Yates helper
- `js/cardSystem.js#rollBulk` / `rollVariance` — random rolls
- `docs/ENGINE.md` — broader engine spec
