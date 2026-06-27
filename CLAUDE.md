# CLAUDE.md — FIFA World Cup 2026 Fantasy optimization workspace

Personal workspace to optimize Erick's FIFA WC 2026 Fantasy team each round.
Data is a **daily snapshot** (openfootball + FIFA fantasy pool) — re-pull before each round.

> **Forked this for your own team?** Wherever this says `ericks_squad/`, use your own
> `*_squad/` folder instead (see the root README's "Use it for your own team"). Everything
> else — `data/`, `scripts/`, the workflow below — applies unchanged.

## Layout
| Path | What it is |
|------|-----------|
| `ericks_squad/my_squad.md` | **My current 15 players**, XI/bench, captain, bank, boosters remaining. Update after every change. |
| `ericks_squad/DECISIONS.md` | **Decision log** — every round's moves + the reasoning. Append each round. |
| `data/pool.json` | **THE optimization input** — every selectable player with `worth` (price), `points` (season-to-date), `position`, `nextGame`, `team`/`opponent`. (JSON despite the original `.md` name; it's the parser's export.) |
| `data/matches.csv` | All 104 fixtures + results (compute standings/fixtures from `status=played`). |
| `data/squads.csv` | Official 26-man rosters (position/club/DOB). Used to map FIFA 3-letter codes → teams. |
| `data/fantasy_rules.md` | Scoring, squad/budget/transfer/booster rules + strategy notes. |
| `data/archive/` | Raw source JSON (superseded by the CSVs). |
| `scripts/fifa-fantasy-parser.user.js` | Userscript that scrapes the FIFA Fantasy pool into `data/pool.json`. |
| `data/README.md`, `scripts/README.md`, `ericks_squad/README.md` | Per-folder docs (provenance, data dictionary, parser usage). |

## Rules cheat-sheet
- Squad: 2 GK / 5 DEF / 5 MID / 3 FWD, $100m (→$105m at knockouts). Max 3/country (group) → 8 (final).
- Transfers: 2 free before MD2 & MD3, **unlimited R3→R32**, then 4/4/5/6 for R16/QF/SF/Final. Extra = -3 pts.
- Boosters (**each one-time, whole tournament**): Wildcard, 12th Man, Max Captain, Qualification (R32+), Mystery (R32+).
- Captain = 2×. Can re-captain live to any player whose team hasn't kicked off (free; manual change cancels auto-subs/vice).
- Scoring leans MID/FWD (goals + assists + creation); DEF/GK live on clean sheets (+5, need 60 mins).

## Optimization workflow (each round)
1. Re-pull data (see `data/README.md` + `scripts/README.md`) so `data/pool.json` + matches are current.
2. Parse `data/pool.json`; compute group standings from played matches to grade fixtures (opponent weak/eliminated, rotation risk for qualified teams).
3. Rank by points and points-per-$; flag dead slots (0-pt non-players) and same-team upgrades.
4. Pick transfers (respect budget, free-transfer count, country limits), XI/formation, captain, booster.
5. Update `ericks_squad/my_squad.md` and append to `ericks_squad/DECISIONS.md`.

## Key gotchas
- `team`/`opponent` in `data/pool.json` are the fixture's home/away codes, **not** the player's nation — use `nextGame` + known nationality.
- Lockout = first match of the round (≈ earliest kickoff). Transfers/booster must be set before it.
- "Round 3" group finale = matches dated 24–27 Jun (CSV calls them Matchday 14–17).
