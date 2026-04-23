# FeudaLord Engine Reference

A technical spec of the game engine: resources, cards, formulas, flags, selection, win/loss.
Source of truth for balance and card authoring. Update when the engine changes.

---

## 1. Resources

Four resources. Each has a **canonical gold-equivalent value** used to keep trades and event
sizes fair across currencies.

| Resource  | Symbol | Canonical value (g-eq per unit) |
|-----------|--------|---------------------------------|
| gold      | 💰     | 1                               |
| food      | 🌾     | 0.5                             |
| manpower  | 👥     | 3                               |
| favor     | 👑     | 2                               |

Starting resources: gold 100, food 50, manpower 30, favor 30 (`defaultState` in `js/game.js`).

Canonical conversion: `canonicalRate(from, to) = RESOURCE_VALUE[from] / RESOURCE_VALUE[to]`.
Example: 1 gold = 2 food; 1 manpower = 3 gold.

---

## 2. Turn Loop

Each "spin" of the wheel runs the following sequence (`handleSpin` in `js/game.js`):

1. **Process active events** — for every event card in `activeCards`:
   - apply `perTurn` effects,
   - decrement `turnsRemaining`,
   - if expired: apply `onExpire`, remove from `activeCards`.
2. **Apply passive income** — sum `perTurn` across all active cards (investments + events).
3. **Spin the wheel** — pick a slice uniformly at random (see §3).
4. **Animate** (3.1s). Then show the augury overlay.
5. **Increment `gameState.turn`** and save.
6. **Present the drawn card** — modal with either immediate effects or a decision.

`verifyState()` is called after every resource change (both during the turn loop and during
trades) — it short-circuits to game-over the moment a threshold is crossed.

---

## 3. The Wheel

`wheelConfig` in `js/wheel.js` defines **8 equal-sized slices** (45° each). Current pattern:

```
D I D E D I D E    (4 decision, 2 investment, 2 event → 50% / 25% / 25%)
```

Each slice has a `type` (`"investment"` / `"decision"` / `"event"`) that maps 1:1 to a card
category. A spin picks a slice uniformly, then `selectCard(wheelType, state)` draws from
the eligible cards of that category.

If no eligible card exists in a category on a given turn, the turn resolves with a toast
"Nothing happens this turn..." and no card.

---

## 4. Card Categories

Three top-level categories. Each card is a plain object exported from `js/data/cards-*.js`,
combined into `allCards` by `initCardSystem()`.

### 4.1 Investment
Long-term builds. Paid once, produce per-turn income forever.
- Fields: `baseCost`, `basePerTurn`.
- Formula: see §6.4.
- Instance has `cost` and `perTurn` populated; player must afford `cost` to build.

### 4.2 Decision
One-time choices with 2+ options. Two supported schemas (one card uses one schema at a time):

**Per-option trade** — each option is its own zero-sum trade (`inputRes`/`outputRes`/
`inputBase` on the option). Formula §6.1.

**Fixed-output** — card declares `outputRes` + `outputBase`. The output is **rolled once
per card**; each option is a different payment method (`inputRes` + `qualityFactor`). An
option with **no `inputRes`** is a "reject" (empty effects). Formula §6.2.

Options may carry `triggersEvent: "typeId"` to fire an event card as a consequence of the
choice (see §8.3).

### 4.3 Event
"Things that happen; the player accepts them." A single event card may be:

- **Instant** — `outputRes` + `eventBase` → one-time effect on Continue. Formula §6.3.
- **Ongoing** — `duration` + `perTurnEffects` (+ optional `onActivate` / `onExpire`).
  Ongoing events go into `activeCards` for `duration` turns.
- **Both** — a single card may carry an instant payload AND ongoing parts.

Events can also be triggered imperatively by a decision option (`triggersEvent`).

---

## 5. Card Definition — Common Fields

Every card shares this metadata contract (`isCardEligible` in `js/cardSystem.js`):

| Field               | Type              | Meaning                                                   |
|---------------------|-------------------|-----------------------------------------------------------|
| `typeId`            | string            | Unique id across all cards                                |
| `category`          | `"investment"` \| `"decision"` \| `"event"` | Maps to wheel slice       |
| `name`, `description`, `icon` | string  | Display text                                              |
| `dependencies`      | string[]          | typeIds that must all be in `activeCards` (AND)           |
| `blockedBy`         | string[]          | typeIds that must NOT be in `activeCards` (none)          |
| `isUnique`          | boolean           | If true, card is excluded once played (even if deactivated) |
| `maxInstances`      | number \| null    | Max concurrent active instances (null = unlimited)        |
| `minTurn`           | number            | Card ineligible until `gameState.turn >= minTurn`         |
| `requiresResource`  | object \| null    | Min resource thresholds, e.g. `{ gold: 50 }`              |
| `weight`            | number            | Base weight in weighted selection (0 = never)             |
| `absoluteChance`    | number \| null    | 0-100. If set, checked FIRST each draw; rolls independently |

Flag eligibility (see §7) extends this with `requiresEventFlag`, `blockedByEventFlag`,
`requiresStaticFlag`, `blockedByStaticFlag`, plus `weightBoosts` for probability tuning.

---

## 6. Formulas

Shared helpers in `js/cardSystem.js`:

```js
rollBulk()     = 0.5 + random × 1.5    // range [0.5, 2], mean 1.25
rollVariance() = 0.85 + random × 0.30  // range [0.85, 1.15]
round2(n)      = round to 2 decimals
```

`tierMultiplier` (default 1.0): computed from optional `tierBoosts: [{ if: [typeIds], multiplier }]`
on a card or option. Best-matching multiplier wins among boosts whose prereqs are all active.

### 6.1 Per-option trade (decision)

Zero-sum: trade input for output at the canonical rate, scaled by bulk (size of opportunity)
and variance (quality of the specific deal).

```
inputAmount  = inputBase × rollBulk()
outputAmount = inputAmount × canonicalRate(in→out) × qualityFactor × rollVariance() × tierMultiplier
```

`qualityFactor > 1` = good deal for the player; `< 1` = bad deal.

### 6.2 Fixed-output trade (decision)

Output is rolled once per card. Each option pays a different input to reach the same output.
Higher `qualityFactor` / `tierMultiplier` = **less input needed** (better deal for player).

```
outputAmount = outputBase × rollBulk()                         // rolled once per card
inputAmount  = outputAmount × canonicalRate(out→in) / (qualityFactor × tierMultiplier)
                                                    × rollVariance()  // rolled per option
```

Reject option: no `inputRes`, `effects: {}`.

### 6.3 Instant-event formula

Size is declared in gold-equivalent on `eventBase` (negative = disaster).

```
outputAmount = eventBase × (1 / valueOf(outputRes)) × qualityFactor × rollVariance() × tierMultiplier
```

### 6.4 Investment formula

`rollBulk()` scales cost AND per-turn yield together, **preserving the ROI ratio** per build.
`rollVariance()` perturbs only the per-turn yield (quality of the specific build).

```
cost    = baseCost    × rollBulk()
perTurn = basePerTurn × rollBulk() × rollVariance()
```

Target ROI across investment cards: **≈20 turns** (balance goal; not enforced in code).

---

## 7. Flag System

Two flavors of boolean game state beyond resources and active cards.

- **`eventFlag`** — transient ("something is happening").
- **`staticFlag`** — permanent ("something has happened"). Set-only; never cleared.

Stored as string arrays on `gameState.eventFlags` and `gameState.staticFlags`.

### 7.1 `hasEventFlag(name)` — two sources

1. **Auto-derived**: any active event card whose top-level `setsEventFlag` includes `name`.
2. **Manual**: decision options can push entries into `gameState.eventFlags` directly.

Auto-derivation means you don't write cleanup code: when the event expires and leaves
`activeCards`, its contribution disappears. Two events setting the same flag → flag stays
on until the last one expires.

### 7.2 Declaration points

| Field              | Valid on              | Effect                                                            |
|--------------------|-----------------------|-------------------------------------------------------------------|
| `setsEventFlag`    | event card (top-level)| Flag auto-active while card is in `activeCards`                   |
| `setsEventFlag`    | decision option       | `addEventFlag(name)` on choice (persists in `gameState.eventFlags`) |
| `clearsEventFlag`  | event card / option   | `removeEventFlag(name)` on activation / choice                    |
| `setsStaticFlag`   | event card / option   | `addStaticFlag(name)` on activation / choice (permanent)          |

All four accept a string or an array of strings.

### 7.3 Eligibility by flag

Any card can filter itself in or out by flag state:

```js
requiresEventFlag:    "war",             // AND of all listed (string or array)
blockedByEventFlag:   ["plague", "war"], // NONE of the listed
requiresStaticFlag:   "royalCharter",
blockedByStaticFlag:  "exiled",
```

### 7.4 Weight boosts (probability tuning)

When a category's card pool is large but only a few are flag-gated, those few can be
**drowned out** in weighted selection. `weightBoosts` lets a card multiply its weight when
a flag is active:

```js
weight: 10,
weightBoosts: [
    { ifEventFlag:  "war",        multiplier: 10 },
    { ifStaticFlag: "greatLord",  multiplier: 2  },
],
```

Semantics:
- `effectiveWeight(card) = card.weight × ∏(multiplier of active boosts)`.
- A boost activates when **all** its conditions (`ifEventFlag` AND/OR `ifStaticFlag`) hold.
- Multiple active boosts stack multiplicatively.
- `selectCard` filters on `effectiveWeight > 0`, so a boost can resurrect a `weight: 0` card.

---

## 8. Selection Algorithm

`selectCard(category, state)` in `js/cardSystem.js`:

1. Collect eligible cards: `card.category === category && isCardEligible(card, state)`.
2. **Absolute-chance pass**: for each eligible card with `absoluteChance > 0`, roll
   independently (`Math.random() × 100 < absoluteChance`) — return the first match.
3. **Weighted pass**: filter to `effectiveWeight(card) > 0`, build cumulative distribution,
   pick one proportionally to `effectiveWeight`.
4. Fallback: uniform random among eligible if no weighted candidates.

### 8.1 `createCardInstance(card)`

Rolls randomness and freezes a per-draw copy of the card:
- Investment: rolls bulk/variance → `cost`, `perTurn`.
- Decision per-option trade: rolls bulk+variance per option → `effects`.
- Decision fixed-output: rolls bulk once → `outputAmount`; rolls variance per option.
- Instant event: rolls variance → `effects`.
- Ongoing event: freezes `onActivate`, `perTurn`, `onExpire`, `duration`, `turnsRemaining`.
- Flag fields (`setsEventFlag` etc.) are copied onto the instance (needed for auto-derivation
  after save/load).

### 8.2 Draw → Apply

| Category   | On draw (modal shown)     | On Continue / choice                                                                      |
|------------|---------------------------|-------------------------------------------------------------------------------------------|
| Investment | Show cost/yield + Build/Skip | Build: pay `cost`, `activateCard(instance)`. Skip: discard.                           |
| Decision   | Show all options          | Chosen option: apply `effects` + `perTurnEffects` (as ad-hoc event) + `triggersEvent` + flag mutations. |
| Event      | Show instant/ongoing parts| Apply `effects`, `onActivate`, `activateCard(instance)` if `duration`/`perTurn`, flag mutations. |

### 8.3 `triggersEvent` (decision → event)

A decision option may include `triggersEvent: "typeId"`. On choice:
1. Look up the event card by `typeId` in `allCards`.
2. `createCardInstance` → apply `effects` + `onActivate` → `activateCard` if ongoing.
3. Apply the event's `clearsEventFlag` / `setsStaticFlag`. (`setsEventFlag` is auto-derived.)

Triggered events **bypass eligibility** (no `isCardEligible` check) — the decision option
vouches for them. Their flag/activation semantics are identical to a wheel-drawn event.

---

## 9. Win / Loss Conditions

`verifyState()` in `js/game.js` fires after every resource change:

| Condition       | Outcome                         | Message                                    |
|-----------------|---------------------------------|--------------------------------------------|
| favor ≥ 500     | **Win**                         | 🎉 The people crown you Duke!              |
| gold < 0        | Loss                            | 💸 Bankruptcy! You lose your lands.        |
| food < 0        | Loss                            | 🥀 Famine! The people starve.              |
| manpower ≤ 0    | Loss                            | 🏚️ Your lands are abandoned.               |
| favor ≤ −50     | Loss                            | ⚔️ Revolution! The people overthrow you.   |

On game-over: `gameState.gameOver = true`, spin disabled, augury overlay shows the message
with a Reset button. No turn limit.

---

## 10. Trade System

Out-of-band resource conversions (independent of cards). Player can trade at any time via
the trade overlay.

- `tradeConfig.baseAmount = 10` — fixed unit size per trade.
- Trade rates are **deliberately worse than canonical** (≈ 0.5× canonical) — trading is a
  "last resort" sink; cards are the efficient path to conversion.

Trade table (from-target → rate, i.e. 10 units of `from` yields `10 × rate` of `target`):

| from \ target | gold  | food  | manpower | favor |
|---------------|-------|-------|----------|-------|
| **gold**      | —     | 1.0   | 0.167    | 0.25  |
| **food**      | 0.25  | —     | 0.083    | 0.125 |
| **manpower**  | 1.5   | 3.0   | —        | 0.75  |
| **favor**     | 1.0   | 2.0   | 0.333    | —     |

No per-turn trade limits. Only check: source resource must have ≥ `baseAmount` available.

---

## 11. Save / Load

- **Storage**: `localStorage`, key `"feudal-lord-save"` (single slot, no versioning).
- **Persisted**: `turn`, `resources`, `eventFlags`, `staticFlags`, `cardSystemState`
  (= `{ activeCards, playedCardTypes }`), `pending` (current augury), `gameOver`.
- **Load**: `loadState()` spreads defaults **first** then overlays parsed → new fields get
  defaults on old saves (automatic forward-compat for additive changes).
- **Reset**: `resetGame()` = `structuredClone(defaultState)` + `resetCardSystem()`.

---

## 12. Debug Simulator

`js/debug.js` runs N simulated playthroughs of M turns to sanity-check balance.

- Bypasses affordability (builds regardless of cost).
- Picks decision options uniformly at random.
- Uses `isCardEligibleDebug` (skips `requiresResource` so the sim can explore gated cards).
- Fresh `gameState` per run; snapshots/restores around the sim so real state isn't touched.
- Reports mean / min / max per resource across runs in a modal.

When authoring cards, check the balance intent: decisions should average ≈0 g-eq per pick,
investments should ROI in ≈20 turns, events average to the designer's intended g-eq total.
If the sim drifts far from zero on decisions, a `qualityFactor` is likely off.

---

## 13. Extending the Engine — Quick Recipes

**A card that only appears during war and is common when it does**
```js
{
    typeId: "heroicDefense",
    category: "event",
    weight: 10,
    requiresEventFlag: "war",
    weightBoosts: [{ ifEventFlag: "war", multiplier: 10 }],
    // ...
}
```

**An event that keeps a flag alive for its duration**
```js
{
    typeId: "war", category: "event",
    setsEventFlag: "war",  // auto-active while this card is in activeCards
    duration: 5,
    onActivate: { manpower: -5 },
    perTurnEffects: { gold: -3 },
    // ...
}
```

**A decision that permanently changes the realm**
```js
{
    // on the option:
    label: "Declare independence",
    inputRes: "favor", qualityFactor: 0.5,   // expensive
    setsStaticFlag: "independent",           // permanent; unlocks / blocks future cards
}
```

**A decision that triggers a follow-up event**
```js
{
    label: "Grant grain rights",
    inputRes: "food", qualityFactor: 1,
    triggersEvent: "tradeBoom",  // event card ID, bypasses eligibility
}
```
