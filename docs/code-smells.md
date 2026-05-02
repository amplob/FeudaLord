# Code Smells — FeudaLord

Audit of `js/**/*.js`. Verified against the tree at HEAD on 2026-05-01. Line numbers may drift; smells are described so they remain identifiable. Findings are ranked roughly by bang‑for‑buck for a future ~30 min cleanup pass.

## High value

### Sim/runtime drift in `selectCardDebug`
`js/debug.js:56–80` selects via raw `card.weight`, ignoring `effectiveWeight()` (which folds in `weightBoosts` from `js/cardSystem.js:333`). It also short-circuits all four flag gates (`requiresEventFlag` / `blockedByEventFlag` / `requiresStaticFlag` / `blockedByStaticFlag`) at lines 43–46.

Why it matters: rebalancing decisions/events via `simulateMultipleRuns` will overestimate the frequency of cards under active boosts and underestimate flag‑gated story arcs. The numbers we tune against the sim won't match what players see once a story arc activates.

Fix: take an `{ ignoreFlags = false }` option on `isCardEligible` and `selectCard` in `cardSystem.js`, then have `debug.js` call those with `ignoreFlags: true`. Replace the bespoke `selectCardDebug` entirely. This also eliminates the `c.weight` vs `effectiveWeight(c)` divergence.

### `RESOURCE_VALUE` not the source of truth for trade rates
`js/cardSystem.js:394` defines `RESOURCE_VALUE = { gold: 1, food: 0.5, manpower: 3, favor: 2 }`. `js/trade.js:8–45` then hardcodes 12 trade rates as raw decimals (0.25, 1.5, 0.167, 0.083, …) representing 0.5× canonical, but never references `RESOURCE_VALUE`.

Why it matters: any future change to canonical resource values silently desyncs trade. The `0.5×` convention is documented in the design memory but invisible to the code.

Fix: derive rates: `rate(from, to) = 0.5 * RESOURCE_VALUE[from] / RESOURCE_VALUE[to]`. Build `tradeOptions` programmatically; keep names/icons/messages as data.

(Note: `goldEquivalent` in `ui.js:270–275` already imports `RESOURCE_VALUE` correctly — that one isn't duplicated.)

### Three near-identical effect formatters
`js/ui.js:403`, `:418`, `:427` — `formatEffects`, `formatCost`, `formatPerTurn` are the same iterate‑and‑join with three different sign/suffix conventions.

Fix: one `formatEffects(effects, { signed = true, suffix = "" } = {})`. The three call sites become `formatEffects(eff)`, `formatEffects(cost, { signed: false })`, `formatEffects(perTurn, { suffix: "/turn" })`.

## Medium value

### Two coexisting decision schemas
`cards-decision.js` header (lines 4–8) acknowledges this: cards either declare a card‑level `outputRes`/`outputBase` (with options as payment methods, fixed‑output trade) or per‑option `inputRes`/`outputRes`/`inputBase` (per‑option trade). The instance creator branches at `js/cardSystem.js:540–610` and the rebalancer must reason about both.

Why it matters: low immediate cost (validator covers schema integrity), but it raises the friction for any future rebalance pass and for newcomers. Especially relevant given decisions are the largest card category.

Fix: tag each card with an explicit `schema: "fixed-output"` | `"per-option"` field at the data layer, and dispatch on it in `createCardInstance`. Eliminates the implicit "if `card.outputBase` is a number" branch.

### Asymmetric `gameState.pending` shape
`js/game.js` event branch keeps `effectsApplied: false` on the pending state (used at `:247` to avoid double‑applying on restore). Investments/decisions/trade don't carry the field.

Fix: normalise to `pending = { type, cardInstance, effectsApplied: false }` for all types and gate inside `applyEventInstance`. One‑shape pending state simplifies `restorePendingAugury` and `handleAuguryAction` (`game.js:262–304`), which currently have a long if‑else over four card types.

### `handleAuguryAction` is data‑driven trapped inside if‑else
`js/game.js:262–304` switches on `pending.type` with eight branches. Adding a fifth card type means editing this function and `restorePendingAugury` in lockstep.

Fix: a dispatch map `{ investment: handleInvestmentAction, decision: handleDecisionAction, … }`. Each handler takes `(pending, button)` and lives next to the corresponding render function in `ui.js`.

### Sim doesn't apply `verifyState`
`simulateSingleRun` in `debug.js` lets resources go arbitrarily negative across N turns; the real game ends on bankruptcy via `verifyState` (`game.js:448`). This is intentional — the sim wants every run to complete N turns for clean averaging — but the divergence is undocumented.

Fix: a comment block at the top of `simulateSingleRun` stating the assumption, plus an optional `--strict` mode in `sim-cli.js` that does verify and reports survival rate per N runs. Useful for spotting balance changes that secretly cause bankruptcy.

## Low value (nice-to-have)

### Unused / dead code
- `js/wheel.js:225–264` — `testWheelProbabilities()` and `testSpecificAngles()` are defined but never called. Either wire them into the test picker (`debug.js:259+`) as additional modes or move them to a separate `wheel-debug.js`.
- `js/cardSystem.js` — comment at `:613` mentions a "legacy top‑level effects" path on event cards. Worth verifying no current card uses it; if not, delete the branch and add a validator warning.

### Hardcoded element IDs
`js/game.js:48–73` references ~10 element IDs as raw strings. A single `const EL = { spinButton: "spinButton", … }` at the top would catch typos at refactor time. Low priority — the IDs are stable.

### Long eligibility filter
`js/cardSystem.js` `isCardEligible` checks ~10 conditions in series (`minTurn`, unique, `maxInstances`, dependencies, `blockedBy`, `requiresResource`, four flag gates). Readable today, but easy to regress when adding new gates. Consider grouping into `passesBasic()` / `passesFlags()` / `passesDependencies()` sub‑predicates if more gates land.

### Naming: event effect timing fields
Event cards carry up to four effect payloads (`effects` instant, `onActivate`, `perTurnEffects`, `onExpire`) with similar names but different timing. Renaming to `instantEffects` / `activationEffects` / `perTurnEffects` / `expiryEffects` at the instance layer (`createCardInstance`) would clarify intent without churning the data files.

## Out of scope

- Card numbers in `cards-*.js` — just rebalanced; numbers per se are fine.
- Style/formatting nits.
- Big architectural moves (module system, framework, tests) — not justified at this size.
