# AimRush

Playable aim-training prototype inspired by the general genre of **Aimlabs**: timed circular targets, per-hit demo rewards, streak bonuses, miss penalties, persistent wallet, and a local leaderboard. Original name, visuals and implementation; not affiliated with Aimlabs.

**This version uses free demo credits only.** It has no deposits, purchases, withdrawals or cash prizes.

## Run

Requires Node.js 24+ for built-in `node:sqlite`. No npm dependencies, installation or build step.

```sh
cd /workspace/sla
npm test
npm start
```

The server runs on loopback port 3100. `HOST` and `PORT` override the listening interface and port; only expose it deliberately as a demo. `DATA_DIR` overrides local SQLite storage, normally `data/aim.sqlite`. Stop with Ctrl+C. Restarting preserves wallets and rounds; deadlines continue while the server is stopped.

The environment is already isolated: use this checkout directly; no Git worktree is needed.

## Gameplay and exact credit rules

- Each round reserves a **100-credit stake** from the demo wallet and lasts **30 seconds**.
- **30 targets** appear one per second. Each remains available for **950 ms**.
- A hit inside the circular target earns **6 credits**, plus the current streak bonus.
- Every 5 consecutive hits increases the bonus by 2 credits per hit, capped at 10 extra. The fifth hit already receives the first bonus.
- Letting a target expire costs **4 credits** and resets the streak.
- An off-target shot costs **2 credits** and resets the streak. Only one off-target penalty is permitted per target. You may still hit that target afterward.
- Shots between targets and after a target was hit do not score. Touch and mouse use the same circular hit region.
- Ending early counts every remaining target as missed. Refreshing does not pause or restart a round.
- Final payout is `max(0, 100 + hit rewards − penalties)`. The stake was already deducted at entry; net round result is payout minus 100. A no-hit run loses the 100-credit stake. A perfect 30-hit run earns 340 net credits and returns 440 total.
- Credits displayed during the round are provisional; wallet settlement happens at the end.
- Accuracy is successful shots divided by successful plus penalized off-target shots. Target coverage is tracked separately. Average reaction uses successful hits only and includes network transit to the server.
- Free refill adds 1,000 credits when the wallet is below 1,000.

A mouse is recommended. Sound is optional and generated locally. Fullscreen depends on browser support.

## Ranking

The leaderboard shows the best finished hit count per anonymous browser account on this server, up to ten accounts. No fake players, global ranking or manufactured online counts. Ties are sorted by internal account ID. Clearing cookies creates a fresh demo account; this is not production account authentication.

## Implementation

- `game.js`: seeded target layout, hit detection, timing rules, streaks and settlement calculations.
- `server.js`: authoritative scoring and deadline, wallet transactions, idempotent settlement, persistent SQLite data, HttpOnly SameSite cookie sessions and local leaderboard.
- `public/`: responsive canvas range, crosshair, live round result, sound, wallet and ranking.
- `test/game.test.js`: rule tests and HTTP integration tests using temporary isolated databases.

The server validates target timing, target ID, coordinates, geometry and duplicate hits. It ignores client-supplied rewards and scores. These checks **do not prevent aimbots**: target coordinates are available to the browser, and fabricated clicks within valid timing are possible. Random target layouts also make this unsuitable for a calibrated competitive cash format. Real anti-cheat, equivalent challenge conditions and fairness evaluation are separate engineering work.

## Reference and research status

The selected reference is **Aimlabs**, named by the project owner: https://store.steampowered.com/app/714010/Aimlabs/

This establishes the genre reference, not evidence of demand for cash play. No assertion is made about Aimlabs supporting this payment model or about its current revenue or player counts. Attempts to retrieve official Skillz and Papaya pages for the earlier block-puzzle direction failed with network-proxy 403 responses. No current market-validation study was completed.

The intended launch country remains unspecified. The interface is English as requested for an international audience.

## Before real-money operation

This is a local functional prototype, not a payment-ready business. A cash launch still requires the specific country, operating rules and accepted payment provider; applicable classification cannot be inferred from the label “skill game.” It also requires account/identity/age and location controls as applicable, deposits and withdrawal reconciliation, bot/fraud prevention, a calibrated payout model, and production deployment and recovery work. The generous demo rewards are design defaults and do not demonstrate sustainable cash economics.

There are no embedded credentials or payment keys. Do not connect this demo wallet to money as if it were a financial ledger.

## Validation

Run `npm test` for seven tests: repeatable target layouts, combo rewards, expired-target penalties, invalid/duplicate/future shots, wrong-shot penalties, payout boundaries, and a full HTTP wallet/round/ranking lifecycle. The HTTP test uses port 3097 and a temporary SQLite database. Browser validation is performed separately against the running server, including mouse aiming and a mobile viewport.
