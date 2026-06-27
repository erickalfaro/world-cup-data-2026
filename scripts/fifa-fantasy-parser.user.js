// ==UserScript==
// @name         FIFA World Cup Fantasy — Player Pool Parser
// @namespace    https://github.com/erick/world_cup
// @version      1.0.0
// @description  Auto-parses player facts (position, next game, worth, points) from the FIFA Fantasy player pool as you scroll. Accumulates everything into a draggable panel with Copy JSON / Download CSV.
// @match        *://*.fifa.com/*
// @match        *://fantasy.fifa.com/*
// @match        *://*.fantasy.fifa.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * The FIFA fantasy page renders the player pool with styled-components
   * (hashed `sc-xxxx` class names that change between builds) inside a
   * VIRTUALIZED scroll list — only the rows currently on screen exist in
   * the DOM, and they get recycled as you scroll.
   *
   * Strategy: don't trust hashed class names. Anchor on stable signals:
   *   - the headshot <img> (src/srcset contains ".../headshots/<id>_...")
   *   - the row's `player` class token (semantic, not hashed)
   * then pull the remaining facts out of the row's text with regexes.
   * Results are keyed by player id (or name) and accumulated across scroll
   * so recycled rows don't get lost.
   * ------------------------------------------------------------------ */

  const store = new Map();           // key -> player object
  let lastCount = 0;

  // ---- regexes ---------------------------------------------------------
  const RE_HEADSHOT = /headshots\/(\d+)/i;             // player id from image URL
  const RE_POSITION = /\b(GK|GKP|DEF|MID|FWD)\b/;      // position code
  const RE_MATCHUP  = /\b([A-Z]{2,3})\s*v\.?\s*([A-Z]{2,3})\b/; // "JOR v ARG"
  const RE_WORTH    = /\$\s*\d+(?:\.\d+)?\s*[mM]\b/;   // "$10.5m"

  // ---- helpers ---------------------------------------------------------

  // From a headshot image, climb up to the element that represents the row.
  // Prefer an ancestor with a `player` class token; otherwise fall back to a
  // few levels up. We stop early if the candidate already contains a $worth
  // token (i.e. it holds the full row of facts).
  function rowFor(img) {
    let el = img;
    let withPlayerToken = null;
    for (let i = 0; i < 8 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      if (el.classList && el.classList.contains('player') && !withPlayerToken) {
        withPlayerToken = el;
      }
      const txt = el.textContent || '';
      if (RE_WORTH.test(txt) && RE_POSITION.test(txt)) {
        // This ancestor holds the full fact line — good enough.
        return withPlayerToken || el;
      }
    }
    return withPlayerToken || (img.parentElement && img.parentElement.parentElement) || img.parentElement;
  }

  // Pull the player's display name. The canonical source is the name
  // <button>/<a> inside the row (e.g. "Vinícius Júnior") — the image `alt`
  // is unreliable (often a short/last-name form, sometimes empty). We pick
  // the first link/heading/button whose text isn't purely a number or symbol
  // (this skips the "+" action button, the points stat, etc.).
  function extractName(row, img) {
    const cands = row.querySelectorAll('button, a, h1, h2, h3, h4, strong, [class*="name" i]');
    for (const c of cands) {
      const t = (c.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > 1 && !/^[\d.,$+\-\s%]+$/.test(t) && !RE_POSITION.test(t)) {
        return t;
      }
    }
    const alt = (img && img.getAttribute('alt') || '').trim();
    return alt.length > 1 ? alt : null;
  }

  // Parse one row element into a player object (or null if it doesn't look
  // like a player row). `row` is the row wrapper, which holds three siblings:
  //   .player  -> headshot, name, position, next game, worth
  //   .stat    -> total points  (NOT inside .player!)
  //   .action  -> the "+" add button
  function parseRow(row) {
    if (!row) return null;

    // The facts (name/pos/worth) live in the .player block; isolate it so the
    // points number from .stat can't leak into worth/number parsing.
    const playerEl = row.querySelector('.player') || row;

    const img = playerEl.querySelector('img') || row.querySelector('img');
    const urlSource = img ? ((img.getAttribute('src') || '') + ' ' + (img.getAttribute('srcset') || '')) : '';
    const idMatch = urlSource.match(RE_HEADSHOT);
    const id = idMatch ? idMatch[1] : null;

    const name = extractName(playerEl, img);
    let text = (playerEl.textContent || '').replace(/\s+/g, ' ').trim();
    // Drop the name from the fact text so it can't interfere with number parsing.
    if (name) text = text.split(name).join(' ').replace(/\s+/g, ' ').trim();

    const pos = (text.match(RE_POSITION) || [])[1] || null;

    const mu = text.match(RE_MATCHUP);
    const nextGame = mu ? `${mu[1]} v ${mu[2]}` : null;
    const team = mu ? mu[1] : null;
    const opponent = mu ? mu[2] : null;

    const worthMatch = text.match(RE_WORTH);
    const worth = worthMatch ? worthMatch[0].replace(/\s+/g, '') : null;

    // Points: read the dedicated .stat sibling directly (most reliable).
    // Fall back to scanning the whole row text for a standalone integer that
    // isn't part of the $worth value.
    let points = null;
    const statEl = row.querySelector('.stat');
    if (statEl) {
      const m = (statEl.textContent || '').match(/-?\d+/);
      if (m) points = parseInt(m[0], 10);
    }
    if (points == null) {
      const rowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
      const stripped = (name ? rowText.split(name).join(' ') : rowText)
        .replace(RE_WORTH, ' ');
      const ints = stripped.match(/\b\d{1,3}\b/g);
      if (ints && ints.length) points = parseInt(ints[ints.length - 1], 10);
    }

    // Must look like a real player row.
    if (!name && !id) return null;
    if (!pos && !worth && !nextGame) return null;

    return {
      id,
      name: name || null,
      position: pos,
      nextGame,
      team,
      opponent,
      worth,
      points,
      headshot: img ? ((img.getAttribute('src') || (img.getAttribute('srcset') || '').split(' ')[0] || '').replace(/^\/\//, 'https://')) : null,
    };
  }

  // Discover the player rows currently mounted in the (virtualized) list.
  // Primary: the semantic `.player` class token on each row, then climb to the
  // wrapper that also holds the `.stat` (points) sibling. This is stable and
  // independent of lazy-loaded headshot images. Fallback: anchor on headshot
  // images and climb to the row, in case the class ever changes.
  function findRows() {
    let players = Array.from(document.querySelectorAll('.player')).filter((r) => {
      const t = r.textContent || '';
      return r.querySelector('img') || (RE_WORTH.test(t) && RE_POSITION.test(t));
    });
    if (players.length) {
      // Return the wrapper (parent) when it contains the .stat sibling,
      // otherwise the .player element itself.
      return players.map((p) => {
        const wrap = p.parentElement;
        return (wrap && wrap.querySelector('.stat')) ? wrap : p;
      });
    }

    const out = [];
    document.querySelectorAll('img').forEach((img) => {
      const url = (img.getAttribute('src') || '') + ' ' + (img.getAttribute('srcset') || '');
      if (RE_HEADSHOT.test(url)) {
        const r = rowFor(img);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // ---- scan ------------------------------------------------------------
  function scan() {
    const rows = findRows();
    let added = 0;
    rows.forEach((row) => {
      const p = parseRow(row);
      if (!p) return;
      // Key by name first (always present from the button; survives lazy
      // images), falling back to id. This avoids double-counting a player
      // who was first seen before their headshot finished loading.
      const key = p.name || p.id;
      if (!key) return;
      const prev = store.get(key);
      // Keep / merge — newer parse may have filled missing fields.
      if (!prev) {
        store.set(key, p);
        added++;
        console.log('[FIFA-Parser] +', p.name, p);
      } else {
        let changed = false;
        for (const k of Object.keys(p)) {
          if ((prev[k] == null || prev[k] === '') && p[k] != null && p[k] !== '') {
            prev[k] = p[k];
            changed = true;
          }
        }
        if (changed) store.set(key, prev);
      }
    });
    if (store.size !== lastCount || added) {
      lastCount = store.size;
      updatePanel();
    }
  }

  // Debounced scan so rapid scroll/mutation events coalesce.
  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      try { scan(); } catch (e) { console.error('[FIFA-Parser] scan error', e); }
    }, 150);
  }

  // ---- output helpers --------------------------------------------------
  function asArray() {
    return Array.from(store.values());
  }

  function toCSV() {
    const rows = asArray();
    const cols = ['id', 'name', 'position', 'nextGame', 'team', 'opponent', 'worth', 'points', 'headshot'];
    const esc = (v) => {
      if (v == null) v = '';
      v = String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const lines = [cols.join(',')];
    rows.forEach((r) => lines.push(cols.map((c) => esc(r[c])).join(',')));
    return lines.join('\n');
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // ---- floating panel --------------------------------------------------
  let panel, countEl;
  function buildPanel() {
    panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed', 'top:12px', 'right:12px', 'z-index:2147483647',
      'background:#0b1f3a', 'color:#fff', 'font:13px/1.4 system-ui,sans-serif',
      'border:1px solid #3a6ff0', 'border-radius:8px', 'padding:10px 12px',
      'box-shadow:0 6px 24px rgba(0,0,0,.4)', 'width:230px', 'user-select:none',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = '⚽ FIFA Player Parser';
    title.style.cssText = 'font-weight:700;margin-bottom:6px;cursor:move';
    panel.appendChild(title);

    countEl = document.createElement('div');
    countEl.style.cssText = 'margin-bottom:8px;opacity:.9';
    panel.appendChild(countEl);

    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = [
        'display:block', 'width:100%', 'margin:4px 0', 'padding:6px 8px',
        'background:#3a6ff0', 'color:#fff', 'border:0', 'border-radius:5px',
        'cursor:pointer', 'font:600 12px system-ui,sans-serif',
      ].join(';');
      b.addEventListener('click', fn);
      return b;
    };

    panel.appendChild(mkBtn('Copy JSON', () => {
      const json = JSON.stringify(asArray(), null, 2);
      navigator.clipboard.writeText(json).then(
        () => flash('Copied JSON ✓'),
        () => { console.log(json); flash('Logged to console'); }
      );
    }));
    panel.appendChild(mkBtn('Download CSV', () => {
      download('pool.csv', toCSV(), 'text/csv');
      flash('CSV downloaded ✓');
    }));
    panel.appendChild(mkBtn('Download JSON', () => {
      download('pool.json', JSON.stringify(asArray(), null, 2), 'application/json');
      flash('JSON downloaded ✓');
    }));
    panel.appendChild(mkBtn('Re-scan now', () => scan()));
    panel.appendChild(mkBtn('Clear', () => { store.clear(); lastCount = 0; updatePanel(); }));

    const msg = document.createElement('div');
    msg.id = '__fifa_msg';
    msg.style.cssText = 'margin-top:6px;height:16px;font-size:11px;color:#9fd';
    panel.appendChild(msg);

    document.body.appendChild(panel);
    makeDraggable(panel, title);
    updatePanel();
  }

  function flash(t) {
    const m = document.getElementById('__fifa_msg');
    if (m) { m.textContent = t; setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 2000); }
  }

  function updatePanel() {
    if (countEl) countEl.textContent = `${store.size} players captured`;
    window.__fifaPlayers = asArray(); // also exposed for manual access in console
  }

  function makeDraggable(box, handle) {
    let sx, sy, ox, oy, drag = false;
    handle.addEventListener('mousedown', (e) => {
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = box.getBoundingClientRect(); ox = r.left; oy = r.top;
      box.style.right = 'auto'; box.style.left = ox + 'px'; box.style.top = oy + 'px';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      box.style.left = (ox + e.clientX - sx) + 'px';
      box.style.top = (oy + e.clientY - sy) + 'px';
    });
    window.addEventListener('mouseup', () => { drag = false; });
  }

  // ---- wire up ---------------------------------------------------------
  function init() {
    buildPanel();

    // Re-scan on any DOM mutation (virtualized rows mount/unmount) ...
    const mo = new MutationObserver(scheduleScan);
    mo.observe(document.body, { childList: true, subtree: true });

    // ... and on scroll (capture covers the inner scrolling list too).
    window.addEventListener('scroll', scheduleScan, true);

    // Periodic safety net in case some updates slip past the observer.
    setInterval(scheduleScan, 1500);

    scan();
    console.log('[FIFA-Parser] running. Scroll the player pool. Access data via window.__fifaPlayers');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
