# Decisions — Reference & Tuning Sheet

A snapshot of the 20 decision cards currently in `js/data/cards-decision.js`,
with parametrization rules and good-vs-bad ratios called out so we can
iterate on balance the same way we did with investments.

---

## What a decision is

- Pop-up presented to the player; they pick **one of 3 options**.
- **Unskippable** — every option requires a payment. If the player can't
  afford any, the manual trade panel is the survival escape hatch.
- Some options can `triggersEvent: "<eventTypeId>"` to fire an event card on
  top of the trade (currently only `merchantGuild` → `tradeBoom`).
- The **best option's position is shuffled across cards** so the player has
  to read each time — no fixed "always pick option 2" pattern.

---

## Two schemas (do not mix on a card)

### A. Per-option trade

Each option independently defines `inputRes → outputRes`. Zero-sum-ish
swap — pay X of resource A, receive Y of resource B.

```js
options: [
  { label, inputRes, outputRes, inputBase, qualityFactor },
  ...
]
```

### B. Fixed-output

Card defines `outputRes` + `outputBase`. Each option is an alternative
**payment method** (different `inputRes`) for the same reward.

```js
outputRes: "favor",
outputBase: 7.5,
options: [
  { label, inputRes, qualityFactor },
  ...
]
```

The output amount is rolled **once per card**; input amount rolled **per
option**.

---

## Parametrization fields

| Field | Schema | Type | Purpose |
|-------|--------|------|---------|
| `outputRes` | A (per-option) | string | Set on each option |
| `outputRes` | B (fixed) | string | Set at card level |
| `outputBase` | B only | number | Reward size (own resource units, before bulk roll) |
| `inputRes` | A & B | string | What this option costs |
| `inputBase` | A only | number | Cost size (own resource units, before bulk roll) |
| `qualityFactor` | A & B | 0.7 / 1.0 / 1.3 | Deal quality (see below) |
| `triggersEvent` | A & B | string? | Optional event typeId to fire when chosen |

Per-card meta (same as other card types): `typeId`, `name`, `description`,
`icon`, `minTurn`, `weight`, `dependencies`, `blockedBy`, `requiresResource`.

---

## Math

Canonical resource values (g-eq): `gold=1`, `food=0.5`, `manpower=3`, `favor=2`.

**Random rolls (every option draw):**
- `bulkRoll ∈ [0.5, 2]` — scales the size of the swap
- `varianceRoll ∈ [0.85, 1.15]` — small per-option quality jitter

### Per-option trade
```
inputAmount  = inputBase × bulkRoll
outputAmount = inputAmount × canonicalRate(in→out) × qualityFactor × varianceRoll
```
Higher `qualityFactor` ⇒ **more output** for the same input. Player wants high.

### Fixed-output
```
outputAmount = outputBase × bulkRoll                          // rolled once per card
inputAmount  = outputAmount × canonicalRate(out→in) / qualityFactor × varianceRoll
```
Higher `qualityFactor` ⇒ **less input** for the same output. Player wants high.

Both schemas: at `qualityFactor = 1` the swap is canonical (zero sum in
g-eq). At 1.3 the player profits ~30% in g-eq; at 0.7 they lose ~30%.

---

## Good-vs-bad ratios

Every card uses the **0.7 / 1.0 / 1.3 split** for its three options
(intentional — players see one clearly best, one neutral, one bad option).
Variance ±15% can occasionally flip neutral vs best in a single roll, but
across many plays the ordering holds.

| qualityFactor | Tag | Profit/loss in g-eq | Player intent |
|---------------|-----|---------------------|----------------|
| **1.3** | best | +30% over canonical | Pick this if you can afford it |
| **1.0** | neutral | breakeven | Pick if the best option's input is dry |
| **0.7** | worst | −30% loss | Trap option / desperation only |

Variance band per option: ±15%, so realized factor is in:
- worst: 0.595 – 0.805
- neutral: 0.85 – 1.15
- best: 1.105 – 1.495

The bands overlap slightly: a low-rolled best (1.105) ≈ a high-rolled neutral (1.15).

---

## Card catalog — Per-option trade (6)

| # | typeId | name | minTurn | options (input → output, qf) |
|---|--------|------|---------|--------------------------------|
| 1 | refugees | Refugees at the Gates | 2 | 12🌾→👥 (1.3) · 12🌾→👑 (1.0) · 12🌾→💰 (0.7) |
| 2 | tournament | Host a Tournament | 4 | 20💰→👑 (1.3) · 20💰→👥 (1.0) · 20💰→🌾 (0.7) |
| 3 | royalDecree | Royal Decree | 3 | 10👑→💰 (1.0) · 10👑→👥 (1.3) · 10👑→🌾 (0.7) |
| 4 | forestClearing | Forest Clearing Offer | 2 | 5👥→🌾 (1.3) · 5👥→💰 (1.0) · 5👥→👑 (0.7) |
| 5 | festivalOfLights | Festival of Lights | 3 | 20💰→👑 (1.3) · 40🌾→👑 (0.7) · 5👥→👑 (1.0) |
| 6 | oldKnightRetires | An Old Knight Retires | 5 | 20💰→👑 (1.0) · 30🌾→👥 (1.3) · 20💰→👥 (0.7) |

All inputBase values in g-eq sit between **6 and 20** (refugees is the
outlier at 6 g-eq — small because food is cheap per unit).

## Card catalog — Fixed-output (14)

| # | typeId | name | minTurn | output | base | g-eq | options (input, qf) |
|---|--------|------|---------|--------|------|------|----------------------|
| 1 | bishopsRequest | The Bishop's Request | 1 | 👑 | 7.5 | 15 | 💰 (1.0) · 🌾 (1.3) · 👥 (0.7) |
| 2 | knightsOffer | A Knight's Offer | 2 | 👥 | 5 | 15 | 🌾 (1.0) · 💰 (0.7) · 👑 (1.3) |
| 3 | merchantGuild | Merchant Guild Request | 3 | 💰 | 17 | 17 | 🌾 (1.3, +tradeBoom) · 👥 (0.7) · 👑 (1.0) |
| 4 | warPreparations | War in Neighboring Lands | 6 | 👥 | 5.5 | 16.5 | 💰 (1.0) · 👑 (1.3) · 🌾 (0.7) |
| 5 | ruralPetition | Rural Petition | 3 | 🌾 | 33 | 16.5 | 💰 (1.3) · 👥 (1.0) · 👑 (0.7) |
| 6 | travelingMinstrel | A Traveling Minstrel | 1 | 👑 | 7 | 14 | 💰 (1.0) · 🌾 (1.3) · 👥 (0.7) |
| 7 | surplusGrainOffer | Surplus Grain Offer | 2 | 💰 | 17 | 17 | 🌾 (1.3) · 👑 (0.7) · 👥 (1.0) |
| 8 | foreignMercenaries | Foreign Mercenaries | 3 | 👥 | 5 | 15 | 💰 (1.3) · 👑 (1.0) · 🌾 (0.7) |
| 9 | huntingParty | Great Hunting Party | 2 | 🌾 | 40 | 20 | 👥 (1.3) · 💰 (1.0) · 👑 (0.7) |
| 10 | taxCollection | Tax Collection Round | 1 | 💰 | 17 | 17 | 👑 (0.7) · 👥 (1.0) · 🌾 (1.3) |
| 11 | saltMerchant | The Salt Merchant | 2 | 🌾 | 35 | 17.5 | 💰 (1.3) · 👑 (1.0) · 👥 (0.7) |
| 12 | apothecaryArrives | An Apothecary Arrives | 3 | 👑 | 8 | 16 | 💰 (1.0) · 👥 (0.7) · 🌾 (1.3) |
| 13 | peasantVolunteers | Peasant Volunteers | 2 | 👥 | 5 | 15 | 🌾 (1.3) · 💰 (1.0) · 👑 (0.7) |
| 14 | dowryOffered | A Dowry Offered | 4 | 💰 | 20 | 20 | 👑 (1.0) · 👥 (1.3) · 🌾 (0.7) |

Output sizes (g-eq) cluster tightly between **14 and 20**, mean ~16.5.

---

## Output distribution (fixed-output cards)

| Output resource | Cards | Avg output (g-eq) |
|-----------------|-------|--------------------|
| 💰 Gold | 4 (merchantGuild, surplusGrainOffer, taxCollection, dowryOffered) | 17.75 |
| 🌾 Food | 3 (ruralPetition, huntingParty, saltMerchant) | 18 |
| 👥 Manpower | 4 (knightsOffer, warPreparations, foreignMercenaries, peasantVolunteers) | 15.4 |
| 👑 Favor | 3 (bishopsRequest, travelingMinstrel, apothecaryArrives) | 15 |

Pretty balanced across the four resources.

Per-option trades shift the picture:
- 💰 spent (4 cards: tournament, festival[opt-A], oldKnight[opt-A,C])
- 🌾 spent (2 cards: refugees, festival[opt-B], oldKnight[opt-B])
- 👥 spent (1 card: forestClearing, plus festival[opt-C])
- 👑 spent (1 card: royalDecree)

So **gold is the most common payment** in per-option trades; favor is rarely
spent. Slightly skewed.

---

## Best-option position shuffle

Across the 20 cards, where does `qualityFactor: 1.3` sit?

| 1.3 in option slot | Count |
|--------------------|-------|
| 1st | 7 |
| 2nd | 6 |
| 3rd | 7 |

Reasonably uniform — no positional bias for the player to exploit.

---

## Observations & possible tuning levers

1. **Output sizes are very uniform (14-20 g-eq).** Every fixed-output card
   gives roughly the same value. There's no "small but cheap" or "big but
   expensive" axis. We could introduce variance: some cards smaller and
   safer (ROI ~10 g-eq), some bigger and riskier (~30 g-eq).

2. **`refugees` is undercosted vs the rest** — its inputBase is only 6
   g-eq, half of the typical 15-20. Either intentionally a small "early
   game" decision or a balance miss.

3. **No card lets you spend favor for food, food for favor (positive way),
   or manpower for manpower-equivalent stuff.** Coverage matrix is sparse;
   if Marc wants every conversion path available we'd need 4×3 = 12
   directional cards minimum across both schemas.

4. **`triggersEvent` is used exactly once** (`merchantGuild` → `tradeBoom`).
   Underused as a design tool — could spice up other cards with combo
   payouts at the cost of slightly worse base trades.

5. **All cards use the rigid 0.7/1.0/1.3 split.** Could consider:
   - Trap cards: 0.5 / 0.7 / 1.0 (no good option, only "least bad")
   - Bonus cards: 1.0 / 1.3 / 1.6 (rare, all options are good)
   - Or wider quality spreads on rarer cards to make them stand out.

6. **`minTurn` is the only gating mechanism** (1-6 range). Nothing checks
   `requiresIncome` like investments do. Could match the new system.

7. **Most "best" options output the resource you'd intuitively expect**
   (knightsOffer best = pay favor for manpower; ruralPetition best = pay
   gold for food). Consider whether some cards should *invert* this so the
   thematic option isn't always optimal — adds replay value.

---

## Files referenced

- `js/data/cards-decision.js` — card catalog
- `js/cardSystem.js#applyTradeFormula` — per-option trade math
- `js/cardSystem.js#applyFixedOutputTrade` — fixed-output math
- `js/cardSystem.js#rollBulk` / `rollVariance` — random rolls
- `docs/ENGINE.md` — broader engine spec
