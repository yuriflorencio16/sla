# AimRush

Browser-based aim-training prototype in Brazilian Portuguese. Circular targets, per-hit virtual rewards, combo bonuses, missed-target penalties, a persistent demo wallet and a local ranking. Original implementation and visuals; not affiliated with Aimlabs or Blockwin.

**Free simulated BRL only. No deposits, purchases, cash prizes or withdrawals.**

## Run

Requires Node.js 24+ with built-in `node:sqlite`. No external dependencies, installation or build step.

```sh
cd /workspace/sla
npm test
npm start
```

Default: loopback port 3100. `HOST` and `PORT` override the listening interface and port. `DATA_DIR` overrides storage, normally `data/aim.sqlite`. Restarting preserves local wallets and rounds; deadlines continue while the server is stopped. The environment is isolated: use the checkout directly, without a new Git worktree.

See `PUBLISH.md` and `render.yaml` for a hosted browser demo. The Render free filesystem is ephemeral; this configuration does not provide durable production storage.

## Interface

The lobby follows the supplied visual reference: deep blue grid background, central rounded card, original colorful aim-themed banner, top-right balance and fixed bottom navigation. Navigation opens the wallet, ranking, lobby/game, rules and audio screens. There are no fabricated online counts, referral rewards or fake payment forms.

Entry presets: **R$ 5, 10, 20, 30, 50 and 100**. A custom field accepts **R$ 1,00–100,00**, including centavos. The initial demo balance is R$ 10,00. The free wallet refill completes the balance up to R$ 100,00. It never charges money.

The target-site URL returned proxy 403, including a second attempt. The supplied screenshot, rather than an authenticated website inspection, informed the layout. No third-party login was performed.

## Amounts and game rules

All database amounts are integer **simulated centavos**. Existing balances keep their values: 1,000 internal units display as R$ 10,00. No conversion to actual money or database migration occurs.

1. Entry is reserved immediately and stored with the round. It cannot change during play. The API defaults to R$ 1,00 for backward compatibility; the lobby initially selects R$ 5,00.
2. A round contains **30 targets over 30 seconds**, one per second, with **950 ms** availability per target.
3. Each hit earns **6% of the entry**. Every five consecutive hits adds 2 percentage points per hit, up to 10 points extra. The fifth hit receives the first bonus.
4. A missed target costs **4% of the entry**, and an off-target shot costs **2%**. Either resets the combo. Only one off-target penalty is applied per target; it may still be hit afterward.
5. Each individual reward/penalty is rounded to a centavo. The UI maximum-return preview uses the same rounding and bonus rules as the server.
6. Final return is `max(0, entry + rewards − penalties)`. Net result is return minus the reserved entry. Ending early marks all remaining targets as missed. Reloading does not pause a round.
7. The maximum return is a perfect 30-hit run without errors, including the entry. It is not a guaranteed minimum. The rounded maximum for R$ 5,00 entry is **R$ 22,00** returned, **+R$ 17,00** net. With six opening hits and then early finish: **R$ 2,20** return, **−R$ 2,80** net.

Amounts on older rounds lacking an `entry` field continue to use their original R$ 1,00 entry and scoring. The header shows available funds; the in-game estimated balance adds the provisional return. Wallet settlement occurs once, on the server, when the round ends.

Accuracy is hits divided by hits plus penalized off-target shots. Target coverage is distinct. Average hit reaction includes network transit. A mouse is recommended; touch also works.

## Crosshair and sensitivity

Open **Mira** from the fixed navigation or the lobby. The CS-inspired editor provides classic, solid cross, dot, circle and T shapes; size, gap, thickness, outline width/color, crosshair color, opacity, center dot/size and shot expansion. The live preview uses the same renderer as normal rounds and training. Presets and a reset button are included. Settings are sanitized and saved to `localStorage`; if storage is unavailable, changes remain in memory for the session.

Sensitivity is applied to relative mouse movement in **captured mode** through the Pointer Lock API, rather than scaling the operating-system cursor. Desktop round/training start requests capture from the user's click; the capture button or the next click on the arena can reacquire it. **Esc releases the cursor without pausing the timer**. Leaving a play screen or finishing releases capture. Raw/unadjusted movement is requested when supported; if capture fails, direct cursor control remains available.

Movement uses a CS-style `0.022 degrees/count` reference and a 90-degree horizontal reference FOV at 4:3, projected onto the arena. Sensitivity is 0.05–5, with optional vertical inversion. The DPI field only calculates a theoretical cm/360° reference; it cannot configure hardware DPI. Browser/OS mouse counts may differ from CS, so this is not an exact game sensitivity converter. Cursor-free mode and touch use direct positions and do not apply the sensitivity multiplier.

## Free training

Open **Treino**. No stake, wallet operation, reward or ranking entry is created. Practice is a local training session with adjustable target radius (12–48 virtual arena units), 30/60-second duration or unlimited time, and three modes:

- **Precisão:** three targets; each hit replaces its target.
- **Flick:** one target at a time; each hit spawns the next.
- **Tracking:** a continuously moving target; measures the percentage of sampled time with the crosshair inside it. Clicking is optional for tracking measurement and still records hits/shots.

The HUD shows hit/shot count, precision, average hit reaction and tracking percentage. Stopping or reaching the time limit shows results; leaving the training screen ends the session. Changing settings then returning starts a fresh practice. Training cannot start during an active stake round; settings and other menus do not pause an active stake round. The range is an original 2D aim-training scene, not a reproduction of a Valorant map or its 3D character movement.

## Audio

Background music and hit effects have independent controls. The original 104 BPM electronic loop is synthesized locally with Web Audio: melody, pads, bass and percussion. No external music or asset download is required. Choose Áudio → Tocar to start, pause with the same control, and adjust volume with the slider. Volume is saved locally. Music pauses while the tab is hidden. Browsers require a user gesture to enable audio; nothing plays on initial load.

## Implementation

- `game.js`: seeded target positions, per-round stake, geometry, deadlines, proportional rewards, combos, maximum preview and settlement.
- `server.js`: authoritative scoring, SQLite wallet transactions, idempotent settlement, anonymous HttpOnly SameSite cookies and local ranking.
- `public/`: blue lobby, gameplay canvas, wallet, rules, ranking, audio, BRL formatting and entry parsing. `aim.js` handles settings, rendering and relative input; `practice.js` handles the free exercise engine; `customize.js` connects the editor and training UI.
- `test/`: engine, HTTP integration, legacy data compatibility and currency/input tests.

The ranking shows the best finished hit count per anonymous browser account on this server, up to ten accounts. Clearing cookies creates a fresh account. This is a demo session, not account authentication or recovery.

## Validation

`npm test` runs **18 tests**, including stake validation, proportional payouts, exact maximum-preview matching, old-round compatibility, BRL input/formatting and the HTTP wallet lifecycle. HTTP tests use temporary isolated SQLite databases and port 3097. The tests also cover saved aim settings, sensitivity, input bounds, inversion, training deadlines and tracking metrics. Browser checks cover real pointer capture and measured sensitivity changes, editor persistence and rendered presets, 30-second automatic training completion, no training wallet/ranking effects, round hits, mobile widths and touch. Earlier validation also covered entry selection, settlement, insufficient balance/refill and audio output.

## Production limitations

The browser knows the target positions. Timing and geometry validation **do not prevent aimbots**; fabricated in-time coordinates are possible. Random layouts are not an independently calibrated competitive format. The generous demo reward model is not evidence of sustainable cash economics or commercial demand.

There is no payment integration, real-money ledger, identity/age/location verification, production account security, fraud detection or production operations. A cash launch requires a specified country, an accepted operating model and payment provider, equivalent challenge conditions, bot prevention and suitable infrastructure. The label “skill game” alone does not establish legal classification. Do not connect this demo wallet to money as if it were a financial ledger.
