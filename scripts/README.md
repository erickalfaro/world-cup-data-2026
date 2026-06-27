# `scripts/` — tooling to (re)build the data

Two tools, one per data source:

| Tool | Produces | Source |
|------|----------|--------|
| [`fifa-fantasy-parser.user.js`](fifa-fantasy-parser.user.js) | `data/pool.json` | FIFA Fantasy site (browser scrape) |
| [`refresh_openfootball.py`](refresh_openfootball.py) | `data/matches.csv`, `data/squads.csv` | [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) |

The fantasy pool comes from a **browser userscript** (you run it on the FIFA site); the matches
and squads come from a **Python script** that downloads openfootball's public-domain JSON and
flattens it to CSV. Refresh whichever you need before a round.

---

# FIFA Fantasy pool parser (`fifa-fantasy-parser.user.js`)

A browser **userscript** that scrapes the FIFA World Cup Fantasy player pool straight from the
page and exports it as JSON/CSV. This is how [`data/pool.json`](../data/pool.json) is produced.

## TL;DR — pull your own data in 6 steps
1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in your browser.
2. Add a new userscript and paste in [`fifa-fantasy-parser.user.js`](fifa-fantasy-parser.user.js); save.
3. Log into the **FIFA Fantasy** site and open the **player pool / transfers** screen.
4. **Scroll the whole list top → bottom** (slowly) so every player renders and gets captured.
   A floating panel shows the running count — click **Re-scan now** if it looks short.
5. Click **Download JSON** → your browser saves **`pool.json`**.
6. Move it into your data folder, **overwriting `data/pool.json`** (or your own `*_squad/`'s
   working copy — see the [root README](../README.md#use-it-for-your-own-team)). That single
   file is always your latest pull — no renaming, no second copy to manage.

Everything below is the detailed version.

## What it does
- Runs on FIFA's public Fantasy site (`*.fifa.com`, `fantasy.fifa.com`, `*.fantasy.fifa.com`).
- Reads the virtualized player list as you scroll, deduping players into a single store.
- For each player it captures: `id`, `name`, `position` (GK/DEF/MID/FWD), `nextGame`, `team`,
  `opponent`, `worth` (price), `points` (season-to-date), and `headshot` URL.
- Adds a small floating, draggable panel with **Copy JSON**, **Download JSON**,
  **Download CSV**, **Re-scan now**, and **Clear**. The collected array is also exposed at
  `window.__fifaPlayers` for console use.

## Install
1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/) (any modern browser).
2. Open [`fifa-fantasy-parser.user.js`](fifa-fantasy-parser.user.js) and create a new script
   with its contents (Tampermonkey: Dashboard → **+** → paste → save). `@grant none`, no extra
   permissions needed.

## Use
1. Go to the FIFA Fantasy **player pool / transfers** screen where the full list is shown.
2. **Scroll the entire list top to bottom** — the parser only sees rows the page has
   rendered, so scrolling is what loads everyone into the store. Use **Re-scan now** if needed.
3. Click **Download JSON**. The browser saves **`pool.json`**.
4. Move it onto **`data/pool.json`** (overwrite it) to refresh this repo's optimization input.

`Download CSV` produces `pool.csv` if you prefer a flat table; it's git-ignored (transient).
Only `data/pool.json` is tracked — and since you overwrite it in place each pull, its git
history doubles as your snapshot archive (`git show HEAD~1:data/pool.json` for the previous one).

> ⚠️ FIFA's markup uses hashed CSS class names that change over time. The script anchors on
> stable signals (headshot image URLs, a `.player` class token) to survive that, but a major
> site redesign may still require updating the selectors.

---

# openfootball matches & squads (`refresh_openfootball.py`)

Rebuilds [`data/matches.csv`](../data/matches.csv) and [`data/squads.csv`](../data/squads.csv)
from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — a free,
**public-domain** dataset (no API key). It downloads the raw JSON into
[`data/archive/`](../data/archive/) and flattens it into the two CSVs.

```bash
python scripts/refresh_openfootball.py             # fetch latest, rebuild raw JSON + both CSVs
python scripts/refresh_openfootball.py --no-fetch  # offline: re-convert from existing data/archive/ raws
```

No dependencies — standard-library Python 3 only. The CSVs are written with a UTF-8 BOM so
Excel renders accented player names correctly.

**Credit:** match results, fixtures, and the official 26-man squads are sourced from the
[openfootball project](https://github.com/openfootball/worldcup.json) (released into the public
domain). Please keep this attribution if you reuse the data.

## What else openfootball publishes for 2026
`refresh_openfootball.py` only pulls the two files this repo uses, but the same
[`/2026` folder](https://github.com/openfootball/worldcup.json/tree/master/2026) also has:

| File | Contents | Why it might help |
|------|----------|-------------------|
| `worldcup.teams.json` | 48 teams: continent, confederation, FIFA code, flag emoji | Map FIFA 3-letter codes → nation; group/confed lookups |
| `worldcup.groups.json` | The 12 groups → team lists | Group membership without parsing fixtures |
| `worldcup.stadiums.json` | 16 venues: city, timezone, capacity, coordinates | **Travel/rest** modeling across the huge NA map; timezone for kickoff times |
| `worldcup.quali_playoffs.json` | Qualifying play-off bracket + results | Pre-tournament form / late qualifiers |

Extending the script to fetch any of these is a few lines — see the `convert_*` pattern.
