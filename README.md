# World Cup 2026 — data, tools & a fantasy decision log

An open, transparent workspace for the **2026 FIFA World Cup** (hosted by Canada / USA /
Mexico, 11 Jun – 19 Jul 2026). Three things live here, and you're welcome to use any of them:

1. **Reusable data** — every fixture, every result, and all 48 official 26-man squads, plus
   the full FIFA Fantasy player pool (prices + season points).
2. **The tooling** — a browser userscript that pulls the FIFA Fantasy pool yourself, so the
   data is reproducible and not just a one-off dump.
3. **My decision-making** — my actual fantasy squad and a round-by-round log of every move
   and the reasoning behind it. Steal the process, not the team.

> ⏱️ **Snapshot, not a live feed.** The committed data is a frozen daily snapshot
> (last refreshed **2026-06-24**, with the tournament still in progress). To get current
> numbers, re-pull — see [`data/README.md`](data/README.md) and [`scripts/README.md`](scripts/README.md).

## Repo map

| Folder | What's in it |
|--------|--------------|
| [`data/`](data/) | Reusable context anyone can use — `matches.csv`, `squads.csv`, the fantasy `pool.json`, the full `fantasy_rules.md`, and raw source JSON under `archive/`. Start with [`data/README.md`](data/README.md) for the data dictionary. |
| [`ericks_squad/`](ericks_squad/) | **My** team only — `my_squad.md` (current 15) and `DECISIONS.md` (the reasoning trail). This is the personal part of the repo. |
| [`scripts/`](scripts/) | How to reproduce the data pull — the FIFA Fantasy parser userscript + install/usage docs in [`scripts/README.md`](scripts/README.md). |

## Use it for your own team

Want to run *your* squad the same way — your own data, your own folder, an agent helping you
decide? Here's the whole loop:

1. **Get the repo.** Fork or clone it so you have `data/`, `scripts/`, and `CLAUDE.md` locally.
2. **Pull your fantasy pool.** Follow the
   [6-step TL;DR in `scripts/README.md`](scripts/README.md#tldr--pull-your-own-data-in-6-steps)
   to run the userscript and export the player pool. Save it as **`data/pool.json`**.
3. **(Optional) refresh fixtures/squads.** Re-download the openfootball JSON (see
   [`data/README.md`](data/README.md)) if you want the latest results and standings.
4. **Make your own squad folder.** Copy [`ericks_squad/`](ericks_squad/) to
   `your_squad/` (any name ending in `_squad` keeps the convention) and edit the two files to
   be yours:
   - `my_squad.md` — your current 15, formation, captain/vice, bank, boosters left.
   - `DECISIONS.md` — start an empty log; you'll append a round entry each time.
5. **Let an agent help you decide.** Open the repo in an AI coding agent (e.g.
   [Claude Code](https://claude.com/claude-code)). [`CLAUDE.md`](CLAUDE.md) already describes the
   per-round optimization workflow — point the agent at your `pool.json` + your squad folder and
   ask it to recommend transfers, XI, captain, and booster timing. It reads the rules from
   [`data/fantasy_rules.md`](data/fantasy_rules.md) and grades fixtures from `data/matches.csv`.
6. **Log the decision.** Have the agent (or you) update `my_squad.md` and append the reasoning
   to `DECISIONS.md`, then repeat before the next round's lockout.

> 💡 [`ericks_squad/`](ericks_squad/) is a worked example of exactly this — read its
> `DECISIONS.md` to see the kind of reasoning to aim for.

## How the data is produced

- **Matches & squads** come from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)
  — free, public-domain, no API key. Run
  [`python scripts/refresh_openfootball.py`](scripts/refresh_openfootball.py) to download the raw
  JSON into [`data/archive/`](data/archive/) and rebuild the CSVs.
- **The fantasy pool** (`data/pool.json`) is scraped from FIFA's public Fantasy site with the
  [userscript](scripts/fifa-fantasy-parser.user.js). It is *not* an official export — run the
  script yourself to refresh it.

## Licensing

- **Code** (the userscript) — MIT, see [`LICENSE`](LICENSE).
- **Match & squad data** — originates from openfootball, which is released into the **public
  domain**.
- **Fantasy pool data** — scraped from FIFA's public Fantasy website; included here for
  convenience/transparency. Respect FIFA's terms if you redistribute it.
