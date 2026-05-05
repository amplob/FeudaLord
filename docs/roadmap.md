# Roadmap

Open feature backlog, ordered by priority. Update as items ship — keep
"Done" entries here for ~a month before pruning so the recent history is
visible.

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
3. **Save-after-spin** (in progress this iteration). Persist on spin
   commit only, so closing mid-decision rolls back. Cuts Firestore
   writes 4-5×.
4. **PWA manifest + service worker.** Required for "Add to Home
   Screen" on mobile and the precursor to a Capacitor / Bubblewrap
   wrapper for the Play Store.
5. **Game-over screen with stats.** Currently a one-liner toast.
   Should show turns survived, peak favor, investments built, and a
   "Try again" button.

## Tier 2 — Retention

6. **Achievements.** Tie unlocks to fixed milestones: "Win Greenvale →
   +5 maxSpins", "Reach 200 favor → unlock Stonehold". `maxSpins` is
   already per-player; needs an achievements table + unlock check at
   game-over / on-spin.
7. **Daily login bonus.** First Play of the calendar day → +X spins or
   +Y favor. Engages a daily routine.
8. **Stats / records page.** "Most favor reached", "kingdoms won",
   "longest reign". Reachable from the main menu.

## Tier 3 — Monetization

9. **AdMob rewarded videos.** Two slots first: "Continue on game-over"
   (>70% conversion expected) and "Re-spin this turn". Add via the
   Google Mobile Ads SDK after the game is wrapped as an app.
10. **€1 IAP — remove ads.** Stripe Checkout while still web; switch
    to Google Play Billing once on the Play Store. Removes interstitials
    and banners, *not* rewarded videos (some players still want bonus).
11. **Buy spins** as a secondary IAP — small refill bundles for
    impatient players.

## Tier 4 — Content depth

12. **Story arcs via flags.** The flag system + registry exist
    (`docs/flags.md`) but no card uses them yet. First arc idea:
    "The Plague Year" — a chained event that locks the realm into
    a -food / -manpower spiral and resolves with a decision that
    grants +200 favor.
13. **Per-kingdom card decks.** Wolfsedge could lean into war /
    raid events; Greenvale into prosperous trade decisions. Right
    now all four kingdoms draw from the same pool, so they only
    differ in starting resources.
14. **More cards.** 8 events / 20 decisions / 10 investments is
    enough to feel a single playthrough but reveals repetition fast.
    Target ~30 events, ~40 decisions for a polished release.

## Tier 5 — Polish

15. **Animations & juiciness.** Cards bounce in, resources tick up,
    the wheel sparkles on a good slice. Most cheaply: CSS
    transitions on `.augury-content`, `.property-item`, the resource
    counters.
16. **Haptic feedback** on mobile (vibrate on big events / game over).
17. **i18n.** Catalan / Spanish strings for UI; cards stay English
    until volume justifies translation.
18. **Analytics.** Firebase Analytics or Plausible — kingdom pick
    rate, churn point, average session length. Required input for
    monetization tuning.
