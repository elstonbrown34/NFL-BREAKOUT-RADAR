# NFL Breakout Radar

**Live app:** https://nflradar.elstonbrown.com

Finds NFL players who are about to break out — before the box score shows it. Every receiver, tight end and running back is scored on role, opportunity and efficiency, then ranked against players at the same position.

Built by Elston Brown II. Data: [nflverse](https://nflverse.nflverse.com/). Not affiliated with the NFL.

## The problem

Breakout players are obvious in hindsight. By the time fantasy points and highlight reels catch up, the signal was already there: snap share creeping up, targets per route rising, efficiency holding steady. This app quantifies those early signals so a rising role is visible weeks before the production spike.

## The model

Each eligible player (≥4 games with offensive snaps, ≥15 opportunities, snap share ≤75%, PPG <12) gets a 0–100 **Breakout Score**:

- **Role (40%)** — snap share trend, last 3 games vs. all earlier games
- **Opportunity (40%)** — average WOPR (WR/TE) or (targets + carries) / snaps (RB)
- **Efficiency (20%)** — production per opportunity

Scores are **position-relative percentiles** with average tied ranks; missing metrics are neutral (50), so results are deterministic. Games under 20% snap share are excluded from trend calculations as possible injury exits — flagged "Limited" in the weekly table rather than silently dropped.

## Does it work? The backtest

The `/backtest` page evaluates the model honestly: scores computed through Week 10 of 2024 and 2025 are checked against actual Weeks 11–18 production. A "hit" means ≥4 games, ≥12 PPR/game (WR/RB) or ≥9 (TE), and ≥4 more PPR/game than through Week 10.

Results (vs. picking any eligible player at random):

| Season | Top 20 hit rate | Baseline | Multiple |
| ------ | --------------- | -------- | -------- |
| 2024   | 20.0%           | 7.1%     | 2.84×    |
| 2025   | 15.0%           | 6.2%     | 2.43×    |

The baseline retains every eligible player — including those who stopped playing — to avoid survivorship bias. The page states plainly: small sample; injuries, trades and coaching changes can't be predicted from box scores.

## AI features (server-side only)

- **AI Scouting Report** — each player page can generate a short report (why rising / what to watch / verdict) from that player's scores, percentiles and 3-week changes. Reports are cached by a SHA-256 fingerprint of the exact input data, so unchanged data never repeats inference. Invalid AI output is validated and discarded; the page never breaks.
- **Ask the Radar** — natural-language search ("rising slot receivers on good teams") translated by AI into validated, whitelisted filters. The AI never supplies player data — it only interprets the question. Rate-limited per browser, cached per question per week, and all queries logged privately.

No API keys in the frontend. All AI calls run in server functions with validated inputs and outputs.

## Engineering notes

- **Stack:** React 19, TanStack Start (SSR + server functions), TanStack Query, Tailwind CSS v4, Lovable Cloud (Postgres with row-level security), Lovable AI Gateway.
- **Data pipeline:** weekly sync from fixed nflverse URLs with an atomic 5-minute per-season cooldown; CSV parsing, name normalization and joining live in a tested pure module.
- **Security:** public tables are read-only to anonymous users; all writes go through privileged server-side RPCs with advisory locks. Rate limits and generation claims are enforced atomically in the database.
- **Testing:** 56 unit tests cover the scoring model, backtest evaluation, filter application, scouting schema and name joining — the deterministic core is fully verified.
- **Data quality rules:** average tied ranks, neutral missing metrics, injury-shortened game exclusion, full-cohort recomputation for historical comparisons.

## Running locally

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Tests: `npm run test`
