#!/usr/bin/env python3
"""
refresh_openfootball.py — rebuild data/matches.csv and data/squads.csv from openfootball.

Data source & credit
---------------------
All match and squad data comes from the **openfootball/worldcup.json** project, which is
released into the **public domain** (Unlicense / CC0). Please credit it if you reuse the data.

  Project : https://github.com/openfootball/worldcup.json
  Matches : https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
  Squads  : https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json

This script does NOT touch the FIFA Fantasy player pool (data/pool.json) — that comes from the
browser userscript in this same folder (see scripts/README.md).

Usage
-----
  python scripts/refresh_openfootball.py            # fetch latest, refresh raw JSON + both CSVs
  python scripts/refresh_openfootball.py --no-fetch # re-convert from the existing data/archive/ raws (offline)

Outputs (relative to repo root):
  data/archive/openfootball_matches_raw.json   raw source JSON (matches)
  data/archive/squads_raw.json                 raw source JSON (squads)
  data/matches.csv                             flattened, one row per match (UTF-8 BOM for Excel)
  data/squads.csv                              flattened, one row per player
"""
from __future__ import annotations
import argparse
import csv
import json
import sys
from pathlib import Path
from urllib.request import urlopen, Request

BASE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026"
MATCHES_URL = f"{BASE}/worldcup.json"
SQUADS_URL = f"{BASE}/worldcup.squads.json"

# Repo layout: this file lives in scripts/, data/ is its sibling.
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ARCHIVE = DATA / "archive"

MATCH_COLS = ["match_id", "round", "group", "date", "time", "team1", "team2",
              "status", "ft1", "ft2", "ht1", "ht2", "ground", "goals1", "goals2"]
SQUAD_COLS = ["team", "fifa_code", "group", "number", "pos", "player",
              "club", "club_country", "date_of_birth"]


def fetch_json(url: str, dest: Path) -> None:
    """Download `url` and save the raw bytes to `dest` (so the archive stays the true source)."""
    print(f"  GET {url}")
    req = Request(url, headers={"User-Agent": "world-cup-data-2026/refresh"})
    with urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())
    print(f"      -> {dest.relative_to(ROOT)} ({dest.stat().st_size:,} bytes)")


def _fmt_goals(goals: list) -> str:
    """openfootball goal objects are {name, minute, penalty?} -> 'Name 9'; Other 67'(P)'."""
    if not goals:
        return ""
    return "; ".join(
        f"{g['name']} {g['minute']}'" + ("(P)" if g.get("penalty") else "")
        for g in goals
    )


def convert_matches(raw_path: Path, out_path: Path) -> int:
    data = json.loads(raw_path.read_text(encoding="utf-8"))
    rows = []
    for i, x in enumerate(data["matches"], 1):
        ft = x.get("score", {}).get("ft", [None, None])
        ht = x.get("score", {}).get("ht", [None, None])
        rows.append({
            "match_id": i,
            "round": x["round"],
            "group": x.get("group", ""),
            "date": x["date"],
            "time": x.get("time", ""),
            "team1": x["team1"],
            "team2": x["team2"],
            "status": "played" if "score" in x else "upcoming",
            "ft1": ft[0], "ft2": ft[1],
            "ht1": ht[0], "ht2": ht[1],
            "ground": x.get("ground", ""),
            "goals1": _fmt_goals(x.get("goals1", [])),
            "goals2": _fmt_goals(x.get("goals2", [])),
        })
    # utf-8-sig writes a BOM so Excel opens the accented names correctly.
    with out_path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=MATCH_COLS)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def convert_squads(raw_path: Path, out_path: Path) -> int:
    teams = json.loads(raw_path.read_text(encoding="utf-8"))
    rows = []
    for t in teams:
        for p in t["players"]:
            club = p.get("club") or {}
            rows.append({
                "team": t["name"],
                "fifa_code": t["fifa_code"],
                "group": t["group"],
                "number": p.get("number"),
                "pos": p.get("pos"),
                "player": p.get("name"),
                "club": club.get("name", ""),
                "club_country": club.get("country", ""),
                "date_of_birth": p.get("date_of_birth", ""),
            })
    with out_path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=SQUAD_COLS)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="Rebuild matches.csv and squads.csv from openfootball.")
    ap.add_argument("--no-fetch", action="store_true",
                    help="skip the download; re-convert from the existing data/archive/ raw JSON")
    args = ap.parse_args()

    matches_raw = ARCHIVE / "openfootball_matches_raw.json"
    squads_raw = ARCHIVE / "squads_raw.json"

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    if not args.no_fetch:
        print("Fetching latest from openfootball (public domain)...")
        fetch_json(MATCHES_URL, matches_raw)
        fetch_json(SQUADS_URL, squads_raw)
    else:
        print("--no-fetch: converting from existing archive raws.")
        for p in (matches_raw, squads_raw):
            if not p.exists():
                print(f"ERROR: {p} not found; run without --no-fetch first.", file=sys.stderr)
                return 1

    n_m = convert_matches(matches_raw, DATA / "matches.csv")
    print(f"  wrote data/matches.csv ({n_m} matches)")
    n_s = convert_squads(squads_raw, DATA / "squads.csv")
    print(f"  wrote data/squads.csv ({n_s} players)")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
