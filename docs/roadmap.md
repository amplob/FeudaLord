# Roadmap

Open feature backlog, ordered by priority. Update as items ship — keep
"Shipped recently" entries here for ~a month before pruning so the recent
history is visible.

## Shipped recently

- **Save-after-spin** + debounced cloud writes (~50 → ~1 cloud writes per
  session) + per-kingdom `saveSeq` reconciliation on sign-in.
- **Per-kingdom saves**: each kingdom has its own localStorage slot and
  Firestore map entry; switching kingdoms is a silent commit + load and
  reset lives on each kingdom card.
- **Per-kingdom canonical values + 4 kingdom-locked events** (Greenvale
  Prosperous Region, Rivermark Fisherman's Surplus, Stonehold Hidden Gold
  Vein, Wolfsedge Wolf Hunt). Resource value grid shown on the Kingdom
  page.
- **Cascade decay loss model**: instant-death on negative resources is
  gone; running negative now bleeds others until favor crosses zero.
  `.in-decay` UI marker on the resource bar; rising-edge toasts.
- **Stats page** (resource history chart, all-time records, kingdom wins).
- **Daily login bonus** with countdown button on the wheel page.
- **Spin Shop** (free ad / unlimited IAP) when stamina runs out.
- **Wheel physics**: peg/pointer collisions with bounce-back, pointer flex
  animation.
- **Kingdom selection screen** with 4 difficulty levels (Greenvale,
  Rivermark, Stonehold, Wolfsedge).
- **Realm overlay** (emoji landscape of built investments, with level
  badges).
- **Investment leveling** (instances stack in place, max-level driven by
  the existing maxInstances field).
- **Card validator** (DEBUG-only, runs at init).

## Tier 1 — Ship blockers (before publishing)

1. **Audio engine.** The 🎵 / 🔊 toggles persist mute state in
   localStorage but no audio is wired. Hook a small `Audio` instance per
   sfx (button click, spin land, level up) plus an ambient music loop
   that respects the mute flag. Free assets: freesound.org,
   incompetech.com.
2. **Tutorial / onboarding.** First-time users have no idea what the
   wheel does. Inline tooltips for the first 2-3 turns: "Press SPIN to
   begin", "These slices draw cards from each category", "Decisions
   force a payment — pick wisely".
3. **PWA manifest + service worker.** Required for "Add to Home
   Screen" on mobile and the precursor to a Capacitor / Bubblewrap
   wrapper for the Play Store. Platform detection already lives in
   `js/platform.js` (web-desktop / web-mobile / capacitor-android);
   `cloudSaveState` already skips the debounce on native, so when the
   wrap lands the cloud-write savings come for free.
4. **Game-over screen polish.** Stats screen exists but the loss/win
   modal is still terse. Show turns survived, peak favor, investments
   built, and a clean "Try again" CTA.

## Tier 2 — Retention

5. **Achievements.** Tie unlocks to fixed milestones: "Win Greenvale →
   +5 maxSpins", "Reach 200 favor → unlock Stonehold". `maxSpins` is
   already per-player; needs an achievements table + unlock check at
   game-over / on-spin.

## Tier 3 — Monetization

6. **AdMob rewarded videos.** Two slots first: "Continue on game-over"
   (>70% conversion expected) and "Re-spin this turn". Add via the
   Google Mobile Ads SDK after the game is wrapped as an app. The
   Spin Shop already has the "free ad → +spins" surface to plug into.
7. **€1 IAP — remove ads.** Stripe Checkout while still web; switch
   to Google Play Billing once on the Play Store. Removes interstitials
   and banners, *not* rewarded videos (some players still want bonus).

## Tier 4 — Content depth

8. **Story arcs via flags.** The flag system + registry exist
   (`docs/flags.md`) but no card uses them yet. First arc idea:
   "The Plague Year" — a chained event that locks the realm into
   a -food / -manpower spiral and resolves with a decision that
   grants +200 favor.
9. **Deeper per-kingdom decks.** Each kingdom now has 1 flavour event
   and tweaked canonical values, but the rest of the pool is shared.
   Wolfsedge could lean into war / raid decisions; Greenvale into
   prosperous trade. Add 2-4 more `kingdom: "<id>"` cards per realm.
10. **More cards.** 12 events / 20 decisions / 10 investments is enough
    for a first playthrough but reveals repetition fast. Target ~30
    events, ~40 decisions for a polished release.

## Tier 5 — Polish

11. **Animations & juiciness.** Cards bounce in, resources tick up,
    the wheel sparkles on a good slice. Most cheaply: CSS transitions
    on `.augury-content`, `.property-item`, the resource counters.
12. **Haptic feedback** on mobile (vibrate on big events / game over).
13. **i18n.** Catalan / Spanish strings for UI; cards stay English
    until volume justifies translation.
14. **Analytics.** Firebase Analytics or Plausible — kingdom pick
    rate, churn point, average session length. Required input for
    monetization tuning.
