# `data/` — reusable World Cup 2026 dataset

Snapshot (tournament in progress) — `matches.csv` / `squads.csv` current as of **2026-06-28**;
fantasy `pool.json` current as of **2026-06-27**. The two sources refresh independently;
re-pull whichever you need before relying on prices, points, standings, or fixtures.

## Files
| File | Description |
|------|-------------|
| `matches.csv` | All 104 fixtures + results, one row per match (UTF-8 BOM for Excel). |
| `squads.csv` | Official registered 26-man rosters, one row per player (1,248 rows, 48 teams). |
| `pool.json` | FIFA Fantasy player pool — every selectable player with price, season points, and next fixture. Produced by the [parser](../scripts/fifa-fantasy-parser.user.js). **This is the single drop zone: every fresh pull overwrites this file in place** (bump the snapshot date above when you do). |
| `fantasy_rules.md` | Scoring, squad/budget/transfer/booster rules + general strategy notes. |
| `archive/` | Raw source JSON the CSVs are derived from (see below). |

## Sources & provenance

**Matches & squads — [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)**
(free, public-domain, no API key).
- Matches raw: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
- Squads raw: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json
- Updated manually ~once/day (maintainer is in CEST, UTC+2). To refresh, just run
  [`python scripts/refresh_openfootball.py`](../scripts/refresh_openfootball.py) — it
  re-downloads the raw files into `archive/` and rebuilds `matches.csv` + `squads.csv`.

Chosen over live APIs (football-data.org, Sportmonks, API-Football) because it needs no key,
is a single clean JSON, and covers all 104 matches including the full knockout bracket with
placeholders.

**Fantasy pool — FIFA's public Fantasy site**, scraped with the userscript in
[`../scripts/`](../scripts/). Not an official export; see [`scripts/README.md`](../scripts/README.md)
to regenerate it.

## `archive/`
Raw source JSON, superseded by the CSVs but kept for provenance/reproducibility:
- `openfootball_matches_raw.json` — raw matches (goals, scores, venues).
- `squads_raw.json` — raw 26-man rosters (number, pos, club, DOB).

---

## Data dictionary

### `matches.csv` (104 rows)
`match_id` (1–104, source order) · `round` (Matchday 1–17, Round of 32/16, Quarter-final,
Semi-final, Match for third place, Final) · `group` (Group A–L; blank for knockout) ·
`date` · `time` (with local UTC offset) · `team1`/`team2` (knockout = placeholders like `2A`,
`3C/D/F/G/H`, `W74`) · `status` (`played`/`upcoming`) · `ft1`/`ft2` (full-time score) ·
`ht1`/`ht2` (half-time score) · `ground` (host city) · `goals1`/`goals2` (scorer + minute,
`(P)` = penalty). Upcoming matches have blank score columns.

Compute group standings/fixtures from rows where `status = played`.

### `squads.csv` (1,248 rows)
`team` · `fifa_code` (3-letter) · `group` (A–L) · `number` (jersey) · `pos` (GK/DF/MF/FW) ·
`player` · `club` · `club_country` · `date_of_birth`.

These are the **official registered 26-man rosters** (submitted to FIFA by 1 Jun, announced
2 Jun) — *not* match starting XIs. Confirmed lineups release ~1 hour before kickoff, so they
don't exist for future games; these rosters are the basis for any predicted/probable XI work.

### `pool.json` (array of player objects)
Each object: `id` · `name` · `position` (GK/DEF/MID/FWD) · `nextGame` (the player's next
fixture) · `team` · `opponent` · `worth` (price, $m) · `points` (season-to-date) · `headshot`
(image URL).

> ⚠️ **Gotcha:** `team`/`opponent` are the **fixture's home/away codes, not the player's
> nationality.** To get a player's nation, use `nextGame` plus known nationality (or join on
> `squads.csv`).

## Status as of the latest snapshots
- **Fantasy pool (2026-06-27):** 940 selectable players — down from 1,190 on 2026-06-24 as
  eliminated teams' players drop out of the pool. Each re-pull overwrites `pool.json` wholesale.
- 104 matches total (12 groups of 4 → top 2 + 8 best 3rd-place into Round of 32 → straight knockout).
- **Matches/squads (2026-06-28):** **72 played** (through 2026-06-27), **32 upcoming** — group
  stage complete, Round of 32 begins 2026-06-28 (South Africa vs Canada). Refresh with
  `python scripts/refresh_openfootball.py`.
- Date range: 2026-06-11 → 2026-07-19 (Final, New York / New Jersey).
