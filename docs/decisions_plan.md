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

`inputRes` and `outputRes` can also list **multiple resources** as a
comma-separated string (e.g., `"food,gold"`). The cost and reward are
split **evenly** across the listed resources by gold-equivalent — see
the math below.

```js
// "Welcome them as workers" — pay food AND gold, receive manpower AND favor.
{ label: "Welcome them as workers",
  inputRes: "food,gold", outputRes: "manpower,favor", inputBase: 12 },
```

The legacy "fixed-output" schema (`outputRes`/`outputBase` at the card
level) is gone, and so is `applyFixedOutputTrade` in `cardSystem.js`.
The validator will flag any card that still carries those fields.

---

## Parametrization fields

| Field | Level | Type | Purpose |
|-------|-------|------|---------|
| `qualityFactors` | card | number[] | Shuffled & assigned to options at draw time. Length must match `options`. |
| `inputRes` | option | string | What this option costs. One resource (`"food"`), several (`"food,gold"`), or `""` (free reward). |
| `outputRes` | option | string | What this option yields. Same syntax as `inputRes`. `""` makes it a pure cost / decline option. |
| `inputBase` | option | number | Total **gold-equivalent** scale of the option, before the bulk roll. For trades it's the input g-eq (split across inputs). For free-reward options it's the output g-eq. |
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

**Formula** (one for every option). Three shapes depending on which
sides are filled:

```
TRADE         (inputRes set, outputRes set)
  totalInputGEq  = inputBase × bulkRoll
  shareInputGEq  = totalInputGEq / numInputs
  totalOutputGEq = totalInputGEq × qualityFactor × varianceRoll
  shareOutputGEq = totalOutputGEq / numOutputs
  for each input  r: amount = shareInputGEq  / value(r)   (subtracted)
  for each output r: amount = shareOutputGEq / value(r)   (added)

PURE COST     (inputRes set, outputRes "")
  cost = inputBase × bulkRoll, split evenly across inputs (no qF/variance)
  → "Decline the offer", "Pay tribute" — flat loss, predictable.

FREE REWARD   (inputRes "", outputRes set)
  reward = inputBase × bulkRoll × qualityFactor × varianceRoll
  split evenly across outputs.
  → "Accept the gift", "A favorable wind" — no payment, just a roll.
```

At `qualityFactor = 1` the swap is canonical (zero sum in g-eq). At 1.3
the player profits ~30%; at 0.7 they lose ~30%.

A resource that appears on both sides nets out in the final effects
(e.g., `inputRes: "gold,food", outputRes: "gold,manpower"` would
subtract its input share and add its output share to `effects.gold`).

**Sizing inputBase**: just pick the g-eq scale of the trade directly.
Most current cards sit at **15–20 g-eq** per option, matching the
investment-tier scale of mid-game decisions. Refugees is intentionally
small (6 g-eq) as an early-game card.

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

`qualityFactors` is `[0.7, 1.0, 1.3]` everywhere except `refugees`
(`[0.7, 1.0, 1.1]` — Marc trimmed the upside there). `inputBase` is in
g-eq; "uniform" means the same inputBase across all three options.

| # | typeId | name | minTurn | inputBase | Options (input → output) |
|---|--------|------|---------|-----------|---------------------------|
| 1 | refugees | Refugees at the Gates | 2 | 6 | 🌾→👥 · 🌾→👑 · 🌾→💰 |
| 2 | newCult | A Charismatic Preacher | 1 | 10/15/3 | 👑→👥 (+cultRising) · 💰→👑 · 👑→∅ |
| 3 | knightsOffer | A Knight's Offer | 2 | 15 | 🌾→👥 · 💰→👥 · 👑→👥 |
| 4 | merchantGuild | Merchant Guild Request | 3 | 17 | 🌾→💰 (+tradeBoom) · 👥→💰 · 👑→💰 |
| 5 | warPreparations | War in Neighboring Lands | 6 | 17 | 💰→👥 · 👑→👥 · 🌾→👥 |
| 6 | ruralPetition | Rural Petition | 3 | 17 | 💰→🌾 · 👥→🌾 · 👑→🌾 |
| 7 | travelingMinstrel | A Traveling Minstrel | 1 | 14 | 💰→👑 · 🌾→👑 · 👥→👑 |
| 8 | surplusGrainOffer | Surplus Grain Offer | 2 | 17 | 🌾→💰 · 👑→💰 · 👥→💰 |
| 9 | foreignMercenaries | Foreign Mercenaries | 3 | 15/15/12 | 💰→👥 · 🌾→👥 · ∅→👥 (+mercenariesBetray) — qualityFactors [0.5, 1.0, 1.5] (volatile) |
| 10 | huntingParty | Great Hunting Party | 2 | 20 | 👥→🌾 · 💰→🌾 · 👑→🌾 |
| 11 | taxCollection | Tax Collection Round | 1 | 17 | 👑→💰 · 👥→💰 · 🌾→💰 |
| 12 | saltMerchant | The Salt Merchant | 2 | 17.5 | 💰→🌾 · 👑→🌾 · 👥→🌾 |
| 13 | apothecaryArrives | An Apothecary Arrives | 3 | 15/15/10 | 💰→👥 · 🌾→👥+👑 · 👑→👥 (+plagueOutbreak) |
| 14 | peasantVolunteers | Peasant Volunteers | 2 | 15 | 🌾→👥 · 💰→👥 · 👑→👥 |
| 15 | dowryOffered | A Dowry Offered | 4 | 20 | 👑→💰 · 👥→💰 · 🌾→💰 |
| 16 | tournament | Host a Tournament | 4 | 20/20/10 | 💰→👑 · 💰→👥 · 🌾→👑 |
| 17 | royalDecree | Royal Decree | 3 | 20 | 👑→💰 · 👑→👥 · 👑→🌾 |
| 18 | forestClearing | Forest Clearing Offer | 2 | 15 | 👥→🌾 · 👥→💰 · 👥→👑 |
| 19 | festivalOfLights | Festival of Lights | 3 | 20/15/5 | 💰→👑 (+tradeBoom) · 🌾→👑 · 👑→∅ |
| 20 | oldKnightRetires | An Old Knight Retires | 5 | 20/15/20 | 💰→👑 · 🌾→👥 · 💰→👥 |

Sizes cluster at **15–20 g-eq** — investment-tier scale. #1 (refugees)
is 6 g-eq (early-game). #16 (tournament) deliberately makes "Feast"
cheaper (10 g-eq) because food is the input. #20 (oldKnightRetires)
makes "Settle on a farm" cheaper (15 g-eq).

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
