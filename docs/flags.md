# Flag Registry

Inventory of every flag name in use in the game. Add an entry whenever a card or
decision option introduces a new flag.

For the field-level spec (declaration points, eligibility, weight-boost semantics),
see `docs/ENGINE.md` §7. This doc is just the registry.

## Quick reference — where to declare

| Field                  | Type                                              | Where                                       |
|------------------------|---------------------------------------------------|---------------------------------------------|
| `setsEventFlag`        | string \| string[]                                | event card (top-level) or decision option   |
| `clearsEventFlag`      | string \| string[]                                | event card or decision option               |
| `setsStaticFlag`       | string \| string[]                                | event card or decision option               |
| `requiresEventFlag`    | string \| string[]                                | any card (eligibility — AND)                |
| `blockedByEventFlag`   | string \| string[]                                | any card (eligibility — NONE)               |
| `requiresStaticFlag`   | string \| string[]                                | any card                                    |
| `blockedByStaticFlag`  | string \| string[]                                | any card                                    |
| `weightBoosts`         | `[{ ifEventFlag?, ifStaticFlag?, multiplier }]`   | any card (probability tuning)               |

## Event flags

Transient — "something is happening". Auto-derived from active event cards'
`setsEventFlag`, plus manual entries pushed by decision options. `hasEventFlag(name)`
returns true if either source has it.

| Flag name | Set by | Cleared by | Used by | Notes |
|-----------|--------|------------|---------|-------|
| _(none yet)_ |  |  |  |  |

## Static flags

Permanent — "something has happened". Set-only; never cleared. Lives in
`gameState.staticFlags`.

| Flag name | Set by                       | Used by                              | Notes |
|-----------|------------------------------|--------------------------------------|-------|
| `assess`  | `defaultState` (default-on)  | `ui.js` (`renderDecisionCard`)       | Player aid: renders the gold-equivalent delta on each decision option. Default-on for every new game; could later be gated behind an unlock card. |

## Conventions

- Flag names are **camelCase** strings (`tradeBoom`, not `trade-boom` or `TRADE_BOOM`).
- Names should read as states: `war`, `plague`, `royalCharter` (event flags) or
  `cathedralBuilt`, `royalEndowment` (static flags).
- The headless sim (`js/debug.js`) **excludes** every card with any of
  `requiresEventFlag` / `blockedByEventFlag` / `requiresStaticFlag` /
  `blockedByStaticFlag`. When you add a flag-gated card, write a focused sim
  variant that primes the relevant flag, rather than relying on the default test
  modal to cover it.
