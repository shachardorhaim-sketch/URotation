// ============================================================
//  יהלומים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שלוש בשורה: מחליפים שני יהלומים סמוכים. 4 בשורה = מפוצץ קו, 5 = פצצת צבע, צורת L/T = פצצה.
//  30 שלבים עם מטרות (ניקוד, איסוף צבעים, ניקוי ג'לי), 3 כוכבים, ערבוב כשאין מהלך ורמז כשמחכים.
//  כל שלב הוכח בסימולציה: בוט פשוט מנצח אותו ברוב הפעמים (ראו g2dtools/tests/gems).
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const R = 8, C = 8, N = 64;
  const idx = (r, c) => r * C + c;
  let uid = 1;
  // sp: 0 רגיל, 1 מפוצץ שורה, 2 מפוצץ עמודה, 3 פצצה, 4 פצצת צבע
  const mk = (color, sp) => ({ id: uid++, color, sp: sp || 0, x: 0, y: 0, vy: 0, born: -99 });

  const SHAPES = {
    full: ['########', '########', '########', '########', '########', '########', '########', '########'],
    corners: ['.######.', '########', '########', '########', '########', '########', '########', '.######.'],
    plus: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
    ring: ['########', '########', '###..###', '##....##', '##....##', '###..###', '########', '########'],
    donut: ['########', '########', '##....##', '##....##', '##....##', '##....##', '########', '########'],
    heart: ['.##..##.', '########', '########', '########', '########', '.######.', '..####..', '...##...'],
    hourglass: ['########', '.######.', '..####..', '..####..', '..####..', '..####..', '.######.', '########'],
    diamond: ['...##...', '..####..', '.######.', '########', '########', '.######.', '..####..', '...##...'],
  };
  const JELLY = {
    center: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 1 : 0),
    center2: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 2 : 0),
    bottom: r => (r >= 5 ? 1 : 0),
    band: r => (r === 3 || r === 4 ? 1 : 0),
    band2: r => (r === 3 || r === 4 ? 2 : 0),
    border: (r, c, m) => (edge(m, r, c) ? 1 : 0),
    border2: (r, c, m) => (edge(m, r, c) ? 2 : 0),
    checker: (r, c) => ((r + c) % 2 === 0 ? 1 : 0),
    x: (r, c) => (r === c || r + c === 7 ? 1 : 0),
    all: () => 1,
    all2: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 2 : 1),
  };
  function edge(m, r, c) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= R || cc >= C || !m[idx(rr, cc)]) return true; }
    return false;
  }

  // ----- 30 השלבים. stars: [ניקוד ל-2 כוכבים, ניקוד ל-3 כוכבים]. הכול כויל בסימולציה (tests/gems/calib.mjs + tune.mjs):
  //  שלבים 1–5 מנוצחים גם במשחק אקראי לגמרי ב-80%+, ובוט חמדן מנצח 93%+ עד שלב 10, 85%+ עד 20, 75%+ עד 30 -----
  const LEVELS = [
    { goal: { score: 2000 }, moves: 15, ncol: 5, shape: 'full', stars: [4500, 6100] },
    { goal: { score: 2100 }, moves: 16, ncol: 5, shape: 'full', stars: [4900, 6600] },
    { goal: { collect: { 0: 15 } }, moves: 16, ncol: 5, shape: 'full', stars: [4400, 6400] },
    { goal: { score: 2500 }, moves: 18, ncol: 5, shape: 'corners', stars: [5500, 7100] },
    { goal: { collect: { 3: 14, 4: 14 } }, moves: 18, ncol: 5, shape: 'full', stars: [4800, 6800] },
    { goal: { jelly: 1 }, jelly: 'center', moves: 14, ncol: 5, shape: 'full', stars: [4200, 5900] },
    { goal: { score: 3300 }, moves: 18, ncol: 5, shape: 'plus', stars: [4500, 6000] },
    { goal: { collect: { 2: 29 } }, moves: 18, ncol: 5, shape: 'corners', stars: [5300, 6800] },
    { goal: { jelly: 1 }, jelly: 'band', moves: 22, ncol: 5, shape: 'full', stars: [6500, 8600] },
    { goal: { collect: { 0: 16, 1: 16, 5: 16 } }, moves: 22, ncol: 6, shape: 'full', stars: [4200, 5400] },
    { goal: { score: 3000 }, moves: 20, ncol: 6, shape: 'full', stars: [4100, 5200] },
    { goal: { jelly: 1 }, jelly: 'border', moves: 29, ncol: 5, shape: 'corners', stars: [8600, 11200] },
    { goal: { collect: { 3: 33 } }, moves: 20, ncol: 5, shape: 'plus', stars: [5000, 6300] },
    { goal: { jelly: 1 }, jelly: 'bottom', moves: 28, ncol: 5, shape: 'full', stars: [9200, 11600] },
    { goal: { score: 4700 }, moves: 22, ncol: 5, shape: 'heart', stars: [5800, 7100] },
    { goal: { jelly: 1 }, jelly: 'all', moves: 30, ncol: 5, shape: 'full', stars: [9400, 11900] },
    { goal: { collect: { 0: 20, 4: 20 } }, moves: 22, ncol: 6, shape: 'full', stars: [4100, 5300] },
    { goal: { jelly: 1 }, jelly: 'band2', moves: 23, ncol: 5, shape: 'full', stars: [7100, 9500] },
    { goal: { score: 4100 }, moves: 22, ncol: 5, shape: 'hourglass', stars: [4900, 6200] },
    { goal: { jelly: 1 }, jelly: 'center2', moves: 16, ncol: 5, shape: 'full', stars: [5100, 7100] },
    { goal: { collect: { 0: 20, 2: 20, 3: 20, 5: 20 } }, moves: 24, ncol: 6, shape: 'corners', stars: [4600, 5700] },
    { goal: { jelly: 1 }, jelly: 'all', moves: 27, ncol: 5, shape: 'plus', stars: [6600, 8500] },
    { goal: { score: 2500 }, moves: 24, ncol: 5, shape: 'donut', stars: [3200, 4000] },
    { goal: { collect: { 5: 24 } }, moves: 22, ncol: 6, shape: 'full', stars: [4400, 5600] },
    { goal: { jelly: 1 }, jelly: 'all2', moves: 29, ncol: 5, shape: 'full', stars: [10100, 12600] },
    { goal: { score: 5200 }, moves: 25, ncol: 5, shape: 'diamond', stars: [6000, 7100] },
    { goal: { collect: { 0: 31, 2: 31, 3: 31 } }, moves: 26, ncol: 5, shape: 'hourglass', stars: [5400, 6700] },
    { goal: { jelly: 1 }, jelly: 'border', moves: 32, ncol: 5, shape: 'heart', stars: [7400, 9300] },
    { goal: { score: 4400 }, moves: 25, ncol: 6, shape: 'corners', stars: [5300, 6300] },
    { goal: { jelly: 1 }, jelly: 'all2', moves: 26, ncol: 5, shape: 'corners', stars: [8400, 10700] },
  ];

  // ================== לוגיקה טהורה (משמשת גם את הסימולציה) ==================
  function makeBoard(lv, rnd) {
    const mask = new Uint8Array(N), jelly = new Int8Array(N), sh = SHAPES[lv.shape];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) mask[idx(r, c)] = sh[r][c] === '#' ? 1 : 0;
    if (lv.jelly) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (mask[idx(r, c)]) jelly[idx(r, c)] = JELLY[lv.jelly](r, c, mask);
    const b = { mask, jelly, cells: new Array(N).fill(null), ncol: lv.ncol, rnd };
    fill(b);
    return b;
  }
  const colorOf = (b, i) => { const g = b.cells[i]; return g && g.sp !== 4 ? g.color : -1; };
  function fill(b) {
    for (let tries = 0; tries < 200; tries++) {
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const i = idx(r, c);
        if (!b.mask[i]) { b.cells[i] = null; continue; }
        const ban = new Set();
        if (c >= 2 && colorOf(b, i - 1) >= 0 && colorOf(b, i - 1) === colorOf(b, i - 2)) ban.add(colorOf(b, i - 1));
        if (r >= 2 && colorOf(b, i - C) >= 0 && colorOf(b, i - C) === colorOf(b, i - 2 * C)) ban.add(colorOf(b, i - C));
        const opts = []; for (let k = 0; k < b.ncol; k++) if (!ban.has(k)) opts.push(k);
        const g = mk(opts[Math.floor(b.rnd() * opts.length)]);
        g.x = c; g.y = r; b.cells[i] = g;
      }
      if (!findRuns(b).length && findMoves(b).length) return;
    }
  }
  function runLenAt(b, i) {
    const col = colorOf(b, i);
    if (col < 0) return 0;
    const r = (i / C) | 0, c = i % C;
    let h = 1, v = 1;
    for (let k = c - 1; k >= 0 && colorOf(b, idx(r, k)) === col; k--) h++;
    for (let k = c + 1; k < C && colorOf(b, idx(r, k)) === col; k++) h++;
    for (let k = r - 1; k >= 0 && colorOf(b, idx(k, c)) === col; k--) v++;
    for (let k = r + 1; k < R && colorOf(b, idx(k, c)) === col; k++) v++;
    return Math.max(h, v);
  }
  function findRuns(b) {
    const runs = [];
    for (let r = 0; r < R; r++) {
      let c = 0;
      while (c < C) {
        const col = colorOf(b, idx(r, c));
        if (col < 0) { c++; continue; }
        let e = c + 1;
        while (e < C && colorOf(b, idx(r, e)) === col) e++;
        if (e - c >= 3) { const cells = []; for (let k = c; k < e; k++) cells.push(idx(r, k)); runs.push({ dir: 'h', cells }); }
        c = e;
      }
    }
    for (let c = 0; c < C; c++) {
      let r = 0;
      while (r < R) {
        const col = colorOf(b, idx(r, c));
        if (col < 0) { r++; continue; }
        let e = r + 1;
        while (e < R && colorOf(b, idx(e, c)) === col) e++;
        if (e - r >= 3) { const cells = []; for (let k = r; k < e; k++) cells.push(idx(k, c)); runs.push({ dir: 'v', cells }); }
        r = e;
      }
    }
    return runs;
  }
  function isValidSwap(b, a, c) {
    const A = b.cells[a], B = b.cells[c];
    if (!A || !B) return false;
    if (A.sp === 4 || B.sp === 4 || (A.sp && B.sp)) return true;
    b.cells[a] = B; b.cells[c] = A;
    const ok = runLenAt(b, a) >= 3 || runLenAt(b, c) >= 3;
    b.cells[a] = A; b.cells[c] = B;
    return ok;
  }
  function findMoves(b) {
    const out = [];
    for (let i = 0; i < N; i++) {
      if (!b.cells[i]) continue;
      if (i % C < C - 1 && b.cells[i + 1] && isValidSwap(b, i, i + 1)) out.push([i, i + 1]);
      if (i + C < N && b.cells[i + C] && isValidSwap(b, i, i + C)) out.push([i, i + C]);
    }
    return out;
  }
  const newEv = () => ({ cleared: [], blasts: [], made: [], jelly: [], rays: [], big: false });
  function mostCommon(b) {
    const n = new Array(6).fill(0);
    for (let i = 0; i < N; i++) { const c = colorOf(b, i); if (c >= 0) n[c]++; }
    let best = 0; for (let k = 1; k < 6; k++) if (n[k] > n[best]) best = k;
    return best;
  }
  function blastCells(b, i, sp, out) {
    const r = (i / C) | 0, c = i % C;
    if (sp === 1) for (let k = 0; k < C; k++) out.push(idx(r, k));
    else if (sp === 2) for (let k = 0; k < R; k++) out.push(idx(k, c));
    else if (sp === 3) { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < R && cc < C) out.push(idx(rr, cc)); } }
    else if (sp === 4) { const col = mostCommon(b); for (let k = 0; k < N; k++) if (colorOf(b, k) === col) out.push(k); }
  }
  // מנקה תאים (ומפעיל מיוחדים בשרשרת). create: מיוחדים חדשים שנוצרים במקום
  function explode(b, start, create, ev) {
    const keep = new Set(create.map(x => x.i));
    const queue = start.slice(), seen = new Set();
    while (queue.length) {
      const i = queue.shift();
      if (seen.has(i)) continue;
      seen.add(i);
      const g = b.cells[i];
      if (!g) continue;
      if (keep.has(i) && !g.sp) continue;
      if (g.sp) {
        const out = [];
        blastCells(b, i, g.sp, out);
        ev.blasts.push({ i, sp: g.sp });
        for (const j of out) if (!seen.has(j)) queue.push(j);
      }
      b.cells[i] = null;
      ev.cleared.push({ i, gem: g });
      if (b.jelly[i] > 0) { b.jelly[i]--; ev.jelly.push(i); }
    }
    for (const x of create) {
      let g = b.cells[x.i];
      if (!g) { g = mk(x.color); g.x = x.i % C; g.y = (x.i / C) | 0; b.cells[x.i] = g; }
      g.sp = x.sp;
      if (x.sp === 4) g.color = -1;
    }
  }
  function groupRuns(runs) {
    const parent = runs.map((_, k) => k);
    const find = k => (parent[k] === k ? k : (parent[k] = find(parent[k])));
    for (let a = 0; a < runs.length; a++) for (let c = a + 1; c < runs.length; c++) if (runs[a].cells.some(x => runs[c].cells.includes(x))) parent[find(a)] = find(c);
    const map = new Map();
    runs.forEach((run, k) => { const p = find(k); if (!map.has(p)) map.set(p, []); map.get(p).push(run); });
    return [...map.values()];
  }
  function matchStep(b, focus, ev) {
    const runs = findRuns(b);
    if (!runs.length) return false;
    const start = [], create = [];
    for (const G of groupRuns(runs)) {
      const cells = [...new Set(G.flatMap(x => x.cells))];
      const maxLen = Math.max(...G.map(x => x.cells.length));
      const hasH = G.some(x => x.dir === 'h'), hasV = G.some(x => x.dir === 'v');
      let sp = 0;
      if (maxLen >= 5) sp = 4; else if (hasH && hasV) sp = 3; else if (maxLen === 4) sp = G.find(x => x.cells.length === 4).dir === 'h' ? 1 : 2;
      start.push(...cells);
      if (!sp) continue;
      let at = focus ? cells.find(i => focus.includes(i)) : undefined;
      if (at === undefined) {
        if (sp === 3) { const hc = G.filter(x => x.dir === 'h').flatMap(x => x.cells); at = G.filter(x => x.dir === 'v').flatMap(x => x.cells).find(i => hc.includes(i)); }
        if (at === undefined) { const run = G.reduce((a, x) => (x.cells.length > a.cells.length ? x : a)); at = run.cells[run.cells.length >> 1]; }
      }
      if (b.cells[at] && b.cells[at].sp) { const alt = cells.find(i => b.cells[i] && !b.cells[i].sp && !create.some(x => x.i === i)); if (alt !== undefined) at = alt; }
      if (create.some(x => x.i === at)) continue;
      create.push({ i: at, sp, color: sp === 4 ? -1 : b.cells[at].color });
      ev.made.push({ i: at, sp });
    }
    explode(b, start, create, ev);
    return true;
  }
  // אחרי שהתאים כבר הוחלפו: at = לאן הגיע היהלום שגררו, from = מאיפה
  function resolveSwap(b, at, from, ev) {
    const P = b.cells[at], Q = b.cells[from];
    if (P.sp === 4 || Q.sp === 4) {
      const cb = P.sp === 4 ? at : from, ot = cb === at ? from : at, O = b.cells[ot];
      const start = [cb, ot];
      if (O.sp === 4) { for (let i = 0; i < N; i++) if (b.cells[i]) start.push(i); ev.big = true; O.sp = 0; }
      else {
        const col = O.color;
        for (let i = 0; i < N; i++) {
          const g = b.cells[i];
          if (!g || i === cb || g.sp === 4 || g.color !== col) continue;
          if (O.sp === 1 || O.sp === 2) g.sp = b.rnd() < 0.5 ? 1 : 2; else if (O.sp === 3) g.sp = 3;
          start.push(i); ev.rays.push(i);
        }
      }
      b.cells[cb].sp = 0;
      ev.blasts.push({ i: cb, sp: 4 });
      explode(b, start, [], ev);
      return true;
    }
    if (P.sp && Q.sp) {
      const r = (at / C) | 0, c = at % C, cells = [at, from];
      const lines = (P.sp <= 2 ? 1 : 0) + (Q.sp <= 2 ? 1 : 0);
      const add = (rr, cc) => { if (rr >= 0 && cc >= 0 && rr < R && cc < C) cells.push(idx(rr, cc)); };
      if (lines === 2) { for (let k = 0; k < C; k++) add(r, k); for (let k = 0; k < R; k++) add(k, c); ev.blasts.push({ i: at, sp: 1 }, { i: at, sp: 2 }); }
      else if (lines === 1) { for (let d = -1; d <= 1; d++) { for (let k = 0; k < C; k++) add(r + d, k); for (let k = 0; k < R; k++) add(k, c + d); } ev.blasts.push({ i: at, sp: 6 }); }
      else { for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add(r + dr, c + dc); ev.blasts.push({ i: at, sp: 5 }); }
      P.sp = 0; Q.sp = 0;
      explode(b, cells, [], ev);
      return true;
    }
    return matchStep(b, [at, from], ev);
  }
  function gravity(b) {
    for (let c = 0; c < C; c++) {
      const rows = [];
      for (let r = R - 1; r >= 0; r--) if (b.mask[idx(r, c)]) rows.push(r);
      let w = 0;
      for (const r of rows) {
        const g = b.cells[idx(r, c)];
        if (!g) continue;
        const tr = rows[w++];
        if (tr !== r) { b.cells[idx(tr, c)] = g; b.cells[idx(r, c)] = null; }
      }
      for (let k = w; k < rows.length; k++) {
        const g = mk(Math.floor(b.rnd() * b.ncol));
        g.x = c; g.y = -1 - (k - w);
        b.cells[idx(rows[k], c)] = g;
      }
    }
  }
  function shuffleBoard(b) {
    const cellsIdx = [], gems = [];
    for (let i = 0; i < N; i++) if (b.cells[i]) { cellsIdx.push(i); gems.push(b.cells[i]); }
    for (let t = 0; t < 300; t++) {
      for (let k = gems.length - 1; k > 0; k--) { const j = Math.floor(b.rnd() * (k + 1)); const x = gems[k]; gems[k] = gems[j]; gems[j] = x; }
      cellsIdx.forEach((i, k) => { b.cells[i] = gems[k]; });
      if (!findRuns(b).length && findMoves(b).length) return;
    }
    for (const i of cellsIdx) if (!b.cells[i].sp) b.cells[i].color = -9;
    for (const i of cellsIdx) if (b.cells[i].color === -9) {
      const r = (i / C) | 0, c = i % C, ban = new Set();
      if (c >= 2 && colorOf(b, i - 1) >= 0 && colorOf(b, i - 1) === colorOf(b, i - 2)) ban.add(colorOf(b, i - 1));
      if (r >= 2 && colorOf(b, i - C) >= 0 && colorOf(b, i - C) === colorOf(b, i - 2 * C)) ban.add(colorOf(b, i - C));
      const opts = []; for (let k = 0; k < b.ncol; k++) if (!ban.has(k)) opts.push(k);
      b.cells[i].color = opts[Math.floor(b.rnd() * opts.length)];
    }
  }
  function cloneBoard(b) {
    return { mask: b.mask, jelly: Int8Array.from(b.jelly), ncol: b.ncol, rnd: b.rnd, cells: b.cells.map(g => (g ? { color: g.color, sp: g.sp } : null)) };
  }
  // ניקוד: 20 לכל יהלום, גדל עם שרשרת; בונוס על יצירת מיוחד
  function scoreOf(ev, cascade) {
    let s = ev.cleared.length * 20 * (1 + 0.5 * (cascade - 1));
    for (const m of ev.made) s += m.sp === 4 ? 120 : m.sp === 3 ? 80 : 50;
    return Math.round(s);
  }
  const goalDone = (lv, st) => {
    if (lv.goal.score) return st.score >= lv.goal.score;
    if (lv.goal.collect) return Object.keys(lv.goal.collect).every(k => st.col[k] >= lv.goal.collect[k]);
    return st.jelly <= 0;
  };
  const jellyLeft = b => { let n = 0; for (let i = 0; i < N; i++) n += b.jelly[i]; return n; };
  function account(st, ev, cascade) {
    st.score += scoreOf(ev, cascade);
    for (const x of ev.cleared) if (x.gem.color >= 0) st.col[x.gem.color]++;
  }
  // ערך של מהלך בעיני בוט חמדן: התקדמות במטרה + מיוחדים
  function moveValue(b, m, lv, st) {
    const sim = cloneBoard(b), ev = newEv();
    const A = sim.cells[m[0]]; sim.cells[m[0]] = sim.cells[m[1]]; sim.cells[m[1]] = A;
    resolveSwap(sim, m[1], m[0], ev);
    let v = ev.cleared.length;
    if (lv.goal.collect) for (const x of ev.cleared) { const need = lv.goal.collect[x.gem.color]; if (need && st.col[x.gem.color] < need) v += 6; }
    if (lv.goal.jelly) v += ev.jelly.length * 7;
    for (const x of ev.made) v += x.sp === 4 ? 18 : x.sp === 3 ? 11 : 8;
    v += ((m[0] / C) | 0) * 0.15;
    return v;
  }
  function greedyMove(b, moves, lv, st) {
    let best = moves[0], bv = -1;
    for (const m of moves) { const v = moveValue(b, m, lv, st); if (v > bv) { bv = v; best = m; } }
    return best;
  }
  function bonusPick(b) {
    const opts = [];
    for (let i = 0; i < N; i++) if (b.cells[i] && !b.cells[i].sp) opts.push(i);
    return opts.length ? opts[Math.floor(b.rnd() * opts.length)] : -1;
  }
  // סימולציה מלאה של שלב (בלי ציור) — להוכחה שכל שלב פתיר ולכיול הכוכבים
  // opt.moves: מספר מהלכים אחר; opt.trace: רושם אחרי כל מהלך את הניקוד, הצבעים והג'לי (לכיול)
  function simulate(n, rnd, policy, opt) {
    const lv = typeof n === 'number' ? LEVELS[n - 1] : n, b = makeBoard(lv, rnd);
    const st = { score: 0, col: [0, 0, 0, 0, 0, 0], jelly: jellyLeft(b) };
    let moves = (opt && opt.moves) || lv.moves, shuffles = 0;
    const trace = opt && opt.trace;
    while (moves > 0 && !goalDone(lv, st)) {
      const mv = findMoves(b);
      if (!mv.length) { shuffleBoard(b); shuffles++; continue; }
      const m = policy === 'random' ? mv[Math.floor(rnd() * mv.length)] : greedyMove(b, mv, lv, st);
      const A = b.cells[m[0]]; b.cells[m[0]] = b.cells[m[1]]; b.cells[m[1]] = A;
      let ev = newEv();
      resolveSwap(b, m[1], m[0], ev);
      account(st, ev, 1);
      moves--;
      for (let cascade = 2; ; cascade++) { gravity(b); ev = newEv(); if (!matchStep(b, null, ev)) break; account(st, ev, cascade); }
      st.jelly = jellyLeft(b);
      if (trace) trace.push({ score: st.score, col: st.col.slice(), jelly: st.jelly });
    }
    const won = goalDone(lv, st);
    const left = moves;
    if (won) {
      for (; moves > 0; moves--) {
        const i = bonusPick(b);
        if (i < 0) break;
        b.cells[i].sp = rnd() < 0.5 ? 1 : 2;
        let ev = newEv(); explode(b, [i], [], ev); account(st, ev, 1);
        for (let cascade = 2; ; cascade++) { gravity(b); ev = newEv(); if (!matchStep(b, null, ev)) break; account(st, ev, cascade); }
      }
    }
    return { won, score: st.score, left, shuffles };
  }

  // ================== טקסטים ==================
  const TXT = {
    he: { title: 'יהלומים', help: ['החלף שני יהלומים סמוכים (גרירה או שתי לחיצות) כדי לסדר 3 בשורה', '4 בשורה = מפוצץ קו · 5 = פצצת צבע · צורת L או T = פצצה', 'השג את המטרה של השלב לפני שנגמרים המהלכים', 'החלף שני מיוחדים זה עם זה לפיצוץ ענק!'], helpTouch: ['גרור יהלום אל שכן שלו כדי לסדר 3 בשורה', '4 בשורה = מפוצץ קו · 5 = פצצת צבע · צורת L או T = פצצה', 'השג את המטרה של השלב לפני שנגמרים המהלכים', 'החלף שני מיוחדים זה עם זה לפיצוץ ענק!'], goal: 'המטרה', goalScore: 'הגע ל-{n} נקודות', goalJelly: 'נקה את כל הג\'לי', goalCollect: 'אסוף יהלומים', jellyLeft: 'נשארו {n}', movesLeft: 'מהלכים', great: 'יפה!', amazing: 'מדהים!', wow: 'וואו!', shuffle: 'אין מהלכים — מערבבים!', bonus: 'בונוס!', outOfMoves: 'נגמרו המהלכים', soClose: 'כמעט! נסה שוב', scoreText: 'ניקוד: {n}', levelGo: 'שלב {n}' },
    en: { title: 'Gems', help: ['Swap two neighbouring gems (drag or two clicks) to line up 3', '4 in a row = line blaster · 5 = colour bomb · L or T shape = bomb', 'Reach the level goal before you run out of moves', 'Swap two specials together for a giant blast!'], helpTouch: ['Drag a gem onto its neighbour to line up 3', '4 in a row = line blaster · 5 = colour bomb · L or T shape = bomb', 'Reach the level goal before you run out of moves', 'Swap two specials together for a giant blast!'], goal: 'Goal', goalScore: 'Reach {n} points', goalJelly: 'Clear all the jelly', goalCollect: 'Collect gems', jellyLeft: '{n} left', movesLeft: 'Moves', great: 'Great!', amazing: 'Amazing!', wow: 'Wow!', shuffle: 'No moves — shuffling!', bonus: 'Bonus!', outOfMoves: 'Out of moves', soClose: 'So close! Try again', scoreText: 'Score: {n}', levelGo: 'Level {n}' },
    ar: { title: 'الجواهر', help: ['بدّل جوهرتين متجاورتين (اسحب أو انقر مرتين) لتصفّ 3', '4 في صف = مفجّر خط · 5 = قنبلة ألوان · شكل L أو T = قنبلة', 'حقّق هدف المرحلة قبل أن تنفد الحركات', 'بدّل جوهرتين خاصتين معاً لانفجار ضخم!'], helpTouch: ['اسحب جوهرة نحو جارتها لتصفّ 3', '4 في صف = مفجّر خط · 5 = قنبلة ألوان · شكل L أو T = قنبلة', 'حقّق هدف المرحلة قبل أن تنفد الحركات', 'بدّل جوهرتين خاصتين معاً لانفجار ضخم!'], goal: 'الهدف', goalScore: 'اجمع {n} نقطة', goalJelly: 'نظّف كل الهلام', goalCollect: 'اجمع الجواهر', jellyLeft: 'بقي {n}', movesLeft: 'الحركات', great: 'رائع!', amazing: 'مذهل!', wow: 'واو!', shuffle: 'لا حركات — نخلط!', bonus: 'مكافأة!', outOfMoves: 'نفدت الحركات', soClose: 'كدت تنجح! حاول مجدداً', scoreText: 'النقاط: {n}', levelGo: 'المرحلة {n}' },
    es: { title: 'Gemas', help: ['Cambia dos gemas vecinas (arrastra o dos clics) para alinear 3', '4 en línea = rayo · 5 = bomba de color · forma de L o T = bomba', 'Cumple la meta del nivel antes de quedarte sin movimientos', '¡Cambia dos especiales entre sí para una explosión gigante!'], helpTouch: ['Arrastra una gema hacia su vecina para alinear 3', '4 en línea = rayo · 5 = bomba de color · forma de L o T = bomba', 'Cumple la meta del nivel antes de quedarte sin movimientos', '¡Cambia dos especiales entre sí para una explosión gigante!'], goal: 'Meta', goalScore: 'Llega a {n} puntos', goalJelly: 'Limpia toda la gelatina', goalCollect: 'Recoge gemas', jellyLeft: 'Quedan {n}', movesLeft: 'Movimientos', great: '¡Bien!', amazing: '¡Increíble!', wow: '¡Guau!', shuffle: 'Sin jugadas: ¡mezclando!', bonus: '¡Bonus!', outOfMoves: 'Sin movimientos', soClose: '¡Casi! Inténtalo otra vez', scoreText: 'Puntos: {n}', levelGo: 'Nivel {n}' },
    fr: { title: 'Gemmes', help: ['Échange deux gemmes voisines (glisser ou deux clics) pour en aligner 3', '4 en ligne = rayon · 5 = bombe de couleur · forme en L ou T = bombe', 'Atteins l’objectif du niveau avant la fin des coups', 'Échange deux spéciales entre elles pour une explosion géante !'], helpTouch: ['Glisse une gemme vers sa voisine pour en aligner 3', '4 en ligne = rayon · 5 = bombe de couleur · forme en L ou T = bombe', 'Atteins l’objectif du niveau avant la fin des coups', 'Échange deux spéciales entre elles pour une explosion géante !'], goal: 'Objectif', goalScore: 'Atteins {n} points', goalJelly: 'Nettoie toute la gelée', goalCollect: 'Ramasse des gemmes', jellyLeft: 'Encore {n}', movesLeft: 'Coups', great: 'Bien !', amazing: 'Génial !', wow: 'Waouh !', shuffle: 'Aucun coup : on mélange !', bonus: 'Bonus !', outOfMoves: 'Plus de coups', soClose: 'Presque ! Réessaie', scoreText: 'Score : {n}', levelGo: 'Niveau {n}' },
    pt: { title: 'Joias', help: ['Troque duas joias vizinhas (arraste ou dois cliques) para alinhar 3', '4 em linha = raio · 5 = bomba de cor · forma de L ou T = bomba', 'Cumpra a meta da fase antes que as jogadas acabem', 'Troque dois especiais entre si para uma explosão gigante!'], helpTouch: ['Arraste uma joia até a vizinha para alinhar 3', '4 em linha = raio · 5 = bomba de cor · forma de L ou T = bomba', 'Cumpra a meta da fase antes que as jogadas acabem', 'Troque dois especiais entre si para uma explosão gigante!'], goal: 'Meta', goalScore: 'Chegue a {n} pontos', goalJelly: 'Limpe toda a geleia', goalCollect: 'Junte joias', jellyLeft: 'Faltam {n}', movesLeft: 'Jogadas', great: 'Boa!', amazing: 'Incrível!', wow: 'Uau!', shuffle: 'Sem jogadas: misturando!', bonus: 'Bônus!', outOfMoves: 'Acabaram as jogadas', soClose: 'Quase! Tente de novo', scoreText: 'Pontos: {n}', levelGo: 'Fase {n}' },
    ru: { title: 'Самоцветы', help: ['Меняй местами два соседних камня (тяни или два клика), чтобы собрать 3 в ряд', '4 в ряд = луч · 5 = цветная бомба · фигура L или T = бомба', 'Выполни цель уровня, пока не кончились ходы', 'Поменяй местами два особых камня — будет огромный взрыв!'], helpTouch: ['Тяни камень к соседу, чтобы собрать 3 в ряд', '4 в ряд = луч · 5 = цветная бомба · фигура L или T = бомба', 'Выполни цель уровня, пока не кончились ходы', 'Поменяй местами два особых камня — будет огромный взрыв!'], goal: 'Цель', goalScore: 'Набери {n} очков', goalJelly: 'Очисти всё желе', goalCollect: 'Собери камни', jellyLeft: 'Осталось {n}', movesLeft: 'Ходы', great: 'Здорово!', amazing: 'Потрясающе!', wow: 'Вау!', shuffle: 'Ходов нет — перемешиваем!', bonus: 'Бонус!', outOfMoves: 'Ходы закончились', soClose: 'Почти! Попробуй ещё', scoreText: 'Очки: {n}', levelGo: 'Уровень {n}' },
    de: { title: 'Edelsteine', help: ['Tausche zwei benachbarte Steine (ziehen oder zwei Klicks), um 3 in eine Reihe zu bringen', '4 in einer Reihe = Strahl · 5 = Farbbombe · L- oder T-Form = Bombe', 'Erfülle das Levelziel, bevor die Züge ausgehen', 'Tausche zwei Spezialsteine miteinander für eine Riesenexplosion!'], helpTouch: ['Ziehe einen Stein auf seinen Nachbarn, um 3 in eine Reihe zu bringen', '4 in einer Reihe = Strahl · 5 = Farbbombe · L- oder T-Form = Bombe', 'Erfülle das Levelziel, bevor die Züge ausgehen', 'Tausche zwei Spezialsteine miteinander für eine Riesenexplosion!'], goal: 'Ziel', goalScore: 'Erreiche {n} Punkte', goalJelly: 'Entferne das ganze Gelee', goalCollect: 'Sammle Steine', jellyLeft: 'Noch {n}', movesLeft: 'Züge', great: 'Super!', amazing: 'Klasse!', wow: 'Wow!', shuffle: 'Keine Züge — wir mischen!', bonus: 'Bonus!', outOfMoves: 'Keine Züge mehr', soClose: 'Fast! Versuch es nochmal', scoreText: 'Punkte: {n}', levelGo: 'Level {n}' },
  };

  // ================== ציור יהלומים ==================
  const GEM = [
    ['#ff8a9c', '#e01743', '#6e0620'], ['#ffc77a', '#ff8414', '#7a3500'], ['#fff48a', '#f2c40c', '#7d6200'],
    ['#8affba', '#13b356', '#05502a'], ['#8ccfff', '#1d6de0', '#0a2c70'], ['#e7a8ff', '#9a3ae0', '#470c74'],
  ];
  function gemPath(ctx, k, s) {
    ctx.beginPath();
    if (k === 0) { const a = s * 0.78, rr = s * 0.22; ctx.moveTo(-a + rr, -a); ctx.arcTo(a, -a, a, a, rr); ctx.arcTo(a, a, -a, a, rr); ctx.arcTo(-a, a, -a, -a, rr); ctx.arcTo(-a, -a, a, -a, rr); }
    else if (k === 1) { for (let q = 0; q < 6; q++) { const a = Math.PI / 6 + q * Math.PI / 3; ctx.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95); } }
    else if (k === 2) { ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.85, 0); }
    else if (k === 3) { const a = s * 0.85, b = s * 0.42; ctx.moveTo(-b, -a); ctx.lineTo(b, -a); ctx.lineTo(a, -b); ctx.lineTo(a, b); ctx.lineTo(b, a); ctx.lineTo(-b, a); ctx.lineTo(-a, b); ctx.lineTo(-a, -b); }
    else if (k === 4) ctx.arc(0, 0, s * 0.86, 0, Math.PI * 2);
    else { ctx.moveTo(0, -s * 0.92); ctx.quadraticCurveTo(s * 0.12, -s * 0.9, s * 0.92, s * 0.62); ctx.quadraticCurveTo(s * 0.95, s * 0.8, s * 0.75, s * 0.8); ctx.lineTo(-s * 0.75, s * 0.8); ctx.quadraticCurveTo(-s * 0.95, s * 0.8, -s * 0.92, s * 0.62); ctx.quadraticCurveTo(-s * 0.12, -s * 0.9, 0, -s * 0.92); }
    ctx.closePath();
  }
  function drawGemRaw(ctx, k, sp, s) {   // ממורכז ב-0,0, s = חצי גודל
    if (sp === 4) {
      const gr = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 0.9);
      gr.addColorStop(0, '#5a4a7a'); gr.addColorStop(1, '#120a22');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, s * 0.86, 0, Math.PI * 2); ctx.fill();
      for (let q = 0; q < 14; q++) {
        const a = q * 2.4, rr = s * (0.25 + (q % 4) * 0.15);
        ctx.fillStyle = GEM[q % 6][0]; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.4, s * 0.22, s * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const [c1, c2, c3] = GEM[k];
    gemPath(ctx, k, s); ctx.fillStyle = c3; ctx.fill();
    ctx.save(); ctx.scale(0.86, 0.86);
    gemPath(ctx, k, s);
    const gr = ctx.createLinearGradient(-s, -s, s, s);
    gr.addColorStop(0, c1); gr.addColorStop(0.55, c2); gr.addColorStop(1, c3);
    ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
    // ברק
    ctx.save(); ctx.scale(0.55, 0.55); gemPath(ctx, k, s); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.ellipse(-s * 0.32, -s * 0.38, s * 0.2, s * 0.1, -0.7, 0, Math.PI * 2); ctx.fill();
    if (sp === 1 || sp === 2) {
      ctx.save(); gemPath(ctx, k, s * 0.86); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const d of [-0.42, 0, 0.42]) { if (sp === 1) ctx.fillRect(-s, d * s - s * 0.08, s * 2, s * 0.16); else ctx.fillRect(d * s - s * 0.08, -s, s * 0.16, s * 2); }
      ctx.restore();
    }
    if (sp === 3) {
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = s * 0.14;
      gemPath(ctx, k, s * 0.7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  }
  const sprites = new Map();
  function sprite(k, sp, px) {
    const key = k + ':' + sp + ':' + px;
    let cv = sprites.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = cv.height = px;
    const c = cv.getContext('2d');
    c.translate(px / 2, px / 2);
    drawGemRaw(c, k, sp, px * 0.42);
    sprites.set(key, cv);
    return cv;
  }
  function drawGem(ctx, g, x, y, cs, t, scale, res) {
    const px = Math.round(cs * res);
    const bomb = g.sp === 4 || g.color < 0;   // פצצת צבע (גם אחרי שהופעלה ונעלמת)
    const img = sprite(bomb ? 0 : g.color, bomb ? 4 : g.sp, px);
    ctx.save();
    ctx.translate(x, y);
    if (bomb) ctx.rotate(t * 0.03);
    if (g.sp === 3) { const p = 1 + Math.sin(t * 0.15) * 0.05; scale *= p; }
    if (scale !== 1) ctx.scale(scale, scale);
    if (g.sp && g.sp !== 4) { ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = cs * 0.25; }
    ctx.drawImage(img, -cs / 2, -cs / 2, cs, cs);
    ctx.restore();
  }

  // ================== פריסה ==================
  function layout(W, H) {
    if (H > W) {
      const cs = 70;
      return { port: true, cs, bx: 20, by: 296, moves: { x: 20, y: 18, w: 168, h: 262 }, goal: { x: 202, y: 18, w: 378, h: 148 }, score: { x: 202, y: 178, w: 378, h: 102 } };
    }
    const cs = 70;
    return { port: false, cs, bx: 372, by: 40, moves: { x: 24, y: 40, w: 320, h: 150 }, goal: { x: 24, y: 206, w: 320, h: 236 }, score: { x: 24, y: 458, w: 320, h: 142 } };
  }

  // ================== המשחק ==================
  function newState(g, n) {
    const lv = LEVELS[n - 1];
    const S = {
      n, lv, L: layout(g.W, g.H), b: makeBoard(lv, Math.random), phase: 'intro', timer: 50, movesLeft: lv.moves,
      st: { score: 0, col: [0, 0, 0, 0, 0, 0], jelly: 0 }, cascade: 0, dying: [], fx: [], sel: -1, cur: -1, kb: false, drag: null,
      swap: null, idleT: 0, hint: null, bonusLeft: 0, won: false, endT: 0, done: false, t: 0, botT: 0, shuffles: 0, made: 0,
    };
    S.st.jelly = jellyLeft(S.b);
    S.jelly0 = S.st.jelly;
    return S;
  }
  const res = g => Math.max(1, Math.min(3, (g.canvas.width / g.W) || 1));
  const cellCenter = (S, i) => ({ x: S.L.bx + (i % C + 0.5) * S.L.cs, y: S.L.by + (((i / C) | 0) + 0.5) * S.L.cs });

  function settle(S) {   // מזיז את היהלומים אל המקום שלהם; מחזיר true כשהכול במקום
    let still = true;
    for (let i = 0; i < N; i++) {
      const gm = S.b.cells[i];
      if (!gm) continue;
      const tc = i % C, tr = (i / C) | 0;
      if (gm.y < tr - 0.001) {   // נופל
        gm.vy = Math.min(0.55, gm.vy + 0.028); gm.y += gm.vy;
        if (gm.y >= tr) { gm.y = tr; gm.vy = 0; gm.land = S.t; }
        still = false;
      } else if (gm.y > tr + 0.001) { gm.y = Math.max(tr, gm.y - 0.16); still = false; }
      if (Math.abs(gm.x - tc) > 0.001) { gm.x += Math.sign(tc - gm.x) * Math.min(0.16, Math.abs(tc - gm.x)); still = false; }
    }
    return still && !S.dying.length;
  }

  function trySwap(g, a, c) {
    const S = g.s;
    if (S.phase !== 'idle' || a < 0 || c < 0 || a === c) return;
    const ra = (a / C) | 0, ca = a % C, rc = (c / C) | 0, cc = c % C;
    if (Math.abs(ra - rc) + Math.abs(ca - cc) !== 1 || !S.b.cells[a] || !S.b.cells[c]) return;
    const valid = isValidSwap(S.b, a, c);
    const A = S.b.cells[a]; S.b.cells[a] = S.b.cells[c]; S.b.cells[c] = A;
    S.swap = { a, c, valid };
    S.phase = 'swap'; S.sel = -1; S.hint = null; S.idleT = 0;
    if (valid) S.movesLeft--;
    g.sfx('whoosh');
  }

  function applyEv(g, ev, cascade) {
    const S = g.s, L = S.L;
    const gain = scoreOf(ev, cascade);
    account(S.st, ev, cascade);
    g.score = S.st.score;
    S.st.jelly = jellyLeft(S.b);
    let sx = 0, sy = 0;
    ev.cleared.forEach((x, k) => {
      const gm = x.gem, px = L.bx + (gm.x + 0.5) * L.cs, py = L.by + (gm.y + 0.5) * L.cs;
      sx += px; sy += py;
      S.dying.push({ gm, x: gm.x, y: gm.y, t: 0, d: Math.min(10, k * 0.35) });
      if (k < 26) g.burst(px, py, { n: 5, color: gm.color >= 0 ? [GEM[gm.color][0], GEM[gm.color][1], '#ffffff'] : ['#ffffff', '#ffd65a'], speed: 3, life: 26, size: 4, gravity: 0.08 });
    });
    for (const i of ev.jelly) { const p = cellCenter(S, i); g.burst(p.x, p.y, { n: 6, color: ['#ff8ad8', '#ffc4ee'], speed: 2.2, life: 22, size: 5, gravity: 0.15 }); }
    if (ev.cleared.length) g.float(sx / ev.cleared.length, sy / ev.cleared.length - 10, '+' + gain, { color: '#fff1a8', size: cascade > 1 ? 30 : 24 });
    let sound = 'pop';
    for (const bl of ev.blasts) {
      S.fx.push({ type: bl.sp, i: bl.i, t: 0 });
      if (bl.sp === 1 || bl.sp === 2) sound = 'laser';
      else if (bl.sp === 3 || bl.sp === 5 || bl.sp === 6) { sound = 'boom'; g.shake(bl.sp === 3 ? 6 : 10); }
      else if (bl.sp === 4) { sound = 'power'; g.flash('#ffffff', 0.25); }
    }
    for (const i of ev.rays) S.fx.push({ type: 'ray', i, from: ev.blasts.find(x => x.sp === 4), t: 0 });
    if (ev.big) { g.flash('#ffffff', 0.5); g.shake(14); }
    if (ev.made.length) { S.made += ev.made.length; for (const m of ev.made) { const p = cellCenter(S, m.i); g.burst(p.x, p.y, { n: 18, color: ['#ffffff', '#fff1a8'], speed: 4, life: 30, size: 4, gravity: 0 }); } g.sfx('power', { p: 1.2 }); }
    g.sfx(sound, { p: 1 + (cascade - 1) * 0.12 });
    if (ev.jelly.length) g.sfx('splash');
    if (cascade === 2) g.msg(g.t('great'), 800, '#9fffd0');
    else if (cascade === 3) g.msg(g.t('amazing'), 900, '#ffd65a');
    else if (cascade >= 4) g.msg(g.t('wow'), 1000, '#ff9ad8');
  }

  function endTurn(g) {
    const S = g.s;
    if (S.won) {
      if (S.bonusLeft > 0) {
        const i = bonusPick(S.b);
        if (i >= 0) {
          S.bonusLeft--; S.movesLeft = S.bonusLeft;
          S.b.cells[i].sp = Math.random() < 0.5 ? 1 : 2;
          const ev = newEv(); explode(S.b, [i], [], ev);
          applyEv(g, ev, 1);
          S.phase = 'clear'; S.timer = 12; S.cascade = 1;
          return;
        }
      }
      S.phase = 'done'; S.endT = 0;
      return;
    }
    if (goalDone(S.lv, S.st)) {
      S.won = true; S.bonusLeft = S.movesLeft;   // המהלכים שנשארו הופכים למפוצצי קו (נספרים לאחור)
      g.msg(S.bonusLeft ? g.t('bonus') : g.t('levelDone'), 1200, '#ffd65a');
      g.sfx('win'); g.flash('#fff6c8', 0.3);
      S.phase = 'pause'; S.timer = 50;
      return;
    }
    if (S.movesLeft <= 0) { S.phase = 'lost'; S.endT = 0; g.sfx('lose'); return; }
    if (!findMoves(S.b).length) {
      shuffleBoard(S.b); S.shuffles++;
      g.msg(g.t('shuffle'), 1300, '#9fe7ff'); g.sfx('whoosh');
      S.phase = 'shuffle';
      return;
    }
    S.phase = 'idle';
  }

  function stars(S) { const [s2, s3] = S.lv.stars; return S.st.score >= s3 ? 3 : S.st.score >= s2 ? 2 : 1; }

  function stepGame(g) {
    const S = g.s;
    S.t++;
    for (let k = S.dying.length - 1; k >= 0; k--) { const d = S.dying[k]; if (++d.t > 14 + d.d) S.dying.splice(k, 1); }
    for (let k = S.fx.length - 1; k >= 0; k--) if (++S.fx[k].t > 26) S.fx.splice(k, 1);
    const still = settle(S);
    if (S.pausedEnd) { S.pausedEnd = false; if (S.phase === 'done') S.endT = Math.min(S.endT, 10); if (S.phase === 'lost') S.endT = Math.min(S.endT, 20); }   // אחרי השהיה: עוד חצי שנייה
    switch (S.phase) {
      case 'intro': if (--S.timer <= 0) S.phase = 'idle'; break;
      case 'idle':
        if (++S.idleT > 300 && !S.hint) { const mv = findMoves(S.b); if (mv.length) S.hint = greedyMove(S.b, mv, S.lv, S.st); }
        break;
      case 'swap':
        if (!still) break;
        if (S.swap.valid) {
          const ev = newEv();
          resolveSwap(S.b, S.swap.c, S.swap.a, ev);
          S.cascade = 1; applyEv(g, ev, 1);
          S.phase = 'clear'; S.timer = 12;
        } else {
          const { a, c } = S.swap, A = S.b.cells[a]; S.b.cells[a] = S.b.cells[c]; S.b.cells[c] = A;
          S.phase = 'back'; g.sfx('error');
        }
        break;
      case 'back': if (still) S.phase = 'idle'; break;
      case 'clear': if (--S.timer <= 0) { gravity(S.b); S.phase = 'fall'; } break;
      case 'fall':
        if (!still) break;
        { const ev = newEv(); if (matchStep(S.b, null, ev)) { S.cascade++; applyEv(g, ev, S.cascade); S.phase = 'clear'; S.timer = 12; } else endTurn(g); }
        break;
      case 'shuffle': if (still) S.phase = 'idle'; break;
      case 'pause': if (--S.timer <= 0) endTurn(g); break;
      case 'done':
        if (++S.endT === 40 && !S.ended) { S.ended = true; g.completeLevel(stars(S), { text: g.t('scoreText', { n: S.st.score }) }); }
        break;
      case 'lost':
        if (++S.endT === 50 && !S.ended) { S.ended = true; g.end({ result: 'lose', score: null, title: g.t('outOfMoves'), text: g.t('soClose') }); }
        break;
    }
    g.hud([[g.t('level'), S.n], [g.t('movesLeft'), S.movesLeft, S.movesLeft <= 3 ? '#ff8a8a' : null], [g.t('score'), S.st.score]]);
  }

  // ================== ציור ==================
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, g.W * 0.4, g.H);
    gr.addColorStop(0, '#3a1a6b'); gr.addColorStop(1, '#140a2e');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 30; i++) {
      const x = (i * 131 + 40) % g.W, y = (i * 89 + t * (0.15 + (i % 5) * 0.05)) % (g.H + 20) - 10;
      const a = 0.25 + 0.25 * Math.sin(t * 0.05 + i);
      ctx.fillStyle = 'rgba(255,230,255,' + a.toFixed(3) + ')';
      const r = 1 + (i % 3);
      ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y); ctx.closePath(); ctx.fill();
    }
  }
  function card(g, ctx, R) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    g.rr(ctx, R.x, R.y, R.w, R.h, 18); ctx.fillStyle = 'rgba(40,20,80,0.9)'; ctx.fill();
    ctx.restore();
    g.rr(ctx, R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1, 18); ctx.strokeStyle = 'rgba(255,200,255,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawJellyIcon(ctx, x, y, s) {
    const gr = ctx.createLinearGradient(0, y - s, 0, y + s);
    gr.addColorStop(0, '#ffb3ec'); gr.addColorStop(1, '#e04fb4');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.7); ctx.quadraticCurveTo(x - s, y - s, x, y - s); ctx.quadraticCurveTo(x + s, y - s, x + s, y + s * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - s * 0.35, y - s * 0.35, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  function drawPanel(g, ctx) {
    const S = g.s, L = S.L, t = S.t, lv = S.lv;
    // מהלכים
    const M = L.moves;
    card(g, ctx, M);
    g.text(ctx, g.t('level') + ' ' + S.n, M.x + M.w / 2, M.y + 28, { size: 22, weight: 800, color: '#ffc8f0', maxW: M.w - 20 });
    const mc = { x: M.x + M.w / 2, y: L.port ? M.y + 140 : M.y + 92 };
    const pulse = S.movesLeft <= 3 && S.movesLeft > 0 ? 1 + Math.sin(t * 0.2) * 0.06 : 1;
    ctx.save(); ctx.translate(mc.x, mc.y); ctx.scale(pulse, pulse);
    const rg = ctx.createRadialGradient(-10, -14, 6, 0, 0, 46);
    rg.addColorStop(0, S.movesLeft <= 3 ? '#ff9a9a' : '#b98cff'); rg.addColorStop(1, S.movesLeft <= 3 ? '#c4283d' : '#5a2bb0');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    g.text(ctx, String(S.movesLeft), mc.x, mc.y + 2, { size: 42, weight: 900, color: '#fff', shadow: 'rgba(0,0,0,.3)' });
    g.text(ctx, g.t('movesLeft'), mc.x, L.port ? M.y + M.h - 26 : mc.y + 46 + 2, { size: 17, weight: 700, color: '#e6d6ff', maxW: M.w - 20, base: L.port ? 'middle' : 'top' });
    // מטרה
    const G = L.goal;
    card(g, ctx, G);
    g.text(ctx, g.t('goal'), G.x + G.w / 2, G.y + 24, { size: 20, weight: 800, color: '#ffc8f0', maxW: G.w - 20 });
    if (lv.goal.score) {
      g.text(ctx, '⭐ ' + lv.goal.score, G.x + G.w / 2, G.y + G.h * 0.52, { size: 38, weight: 900, color: '#ffe27a' });
      g.text(ctx, g.t('goalScore', { n: lv.goal.score }), G.x + G.w / 2, G.y + G.h - 26, { size: 17, weight: 700, color: '#e6d6ff', maxW: G.w - 20 });
    } else if (lv.goal.jelly) {
      const left = S.st.jelly;
      drawJellyIcon(ctx, G.x + G.w / 2 - 50, G.y + G.h * 0.52, 26);
      g.text(ctx, left ? String(left) : '✓', G.x + G.w / 2 + 30, G.y + G.h * 0.53, { size: 40, weight: 900, color: left ? '#fff' : '#8dffb0' });
      g.text(ctx, g.t('goalJelly'), G.x + G.w / 2, G.y + G.h - 26, { size: 17, weight: 700, color: '#e6d6ff', maxW: G.w - 20 });
    } else {
      const ks = Object.keys(lv.goal.collect).map(Number);
      const cols = L.port ? ks.length : Math.min(2, ks.length), rows = Math.ceil(ks.length / cols);
      const cw = (G.w - 30) / cols, rh = Math.min(L.port ? 80 : 74, (G.h - 74) / rows);
      ks.forEach((k, q) => {
        const cx = G.x + 15 + (q % cols + 0.5) * cw, cy = G.y + 46 + (Math.floor(q / cols) + 0.5) * rh;
        const need = lv.goal.collect[k], have = Math.min(need, S.st.col[k]);
        const img = sprite(k, 0, Math.round(44 * res(g)));
        const ix = L.port && ks.length > 2 ? cx : cx - 34;
        ctx.drawImage(img, ix - 22, (L.port && ks.length > 2 ? cy - 18 : cy) - 22, 44, 44);
        const tx = L.port && ks.length > 2 ? cx : cx + 18, ty = L.port && ks.length > 2 ? cy + 22 : cy;
        g.text(ctx, have >= need ? '✓' : (need - have) + '', tx, ty, { size: have >= need ? 30 : 26, weight: 900, color: have >= need ? '#8dffb0' : '#fff' });
      });
      g.text(ctx, g.t('goalCollect'), G.x + G.w / 2, G.y + G.h - 22, { size: 17, weight: 700, color: '#e6d6ff', maxW: G.w - 20 });
    }
    // ניקוד וכוכבים
    const P = L.score;
    card(g, ctx, P);
    const top = lv.stars[1] * 1.1, sc = S.st.score;
    g.text(ctx, g.t('score') + ': ' + sc, P.x + P.w / 2, P.y + 26, { size: 22, weight: 800, color: '#fff', maxW: P.w - 20 });
    const bx = P.x + 22, bw = P.w - 44, by = P.y + (L.port ? 58 : 64);
    g.rr(ctx, bx, by, bw, 16, 8); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0); pg.addColorStop(0, '#ff7ad9'); pg.addColorStop(1, '#ffd65a');
    g.rr(ctx, bx, by, Math.max(16, bw * Math.min(1, sc / top)), 16, 8); ctx.fillStyle = pg; ctx.fill();
    const marks = [lv.goal.score ? lv.goal.score : null, lv.stars[0], lv.stars[1]];
    marks.forEach((m, q) => {
      if (m == null) return;
      const mx = bx + bw * Math.min(1, m / top);
      g.text(ctx, '★', mx, by + 8, { size: 28, weight: 900, color: sc >= m ? '#ffd65a' : 'rgba(255,255,255,.35)', stroke: 'rgba(60,20,90,.8)', strokeW: 4 });
    });
  }

  function drawBoard(g, ctx) {
    const S = g.s, L = S.L, cs = L.cs, b = S.b, t = S.t, rz = res(g);
    // משבצות ורקע
    for (let i = 0; i < N; i++) {
      if (!b.mask[i]) continue;
      const x = L.bx + (i % C) * cs, y = L.by + ((i / C) | 0) * cs;
      ctx.fillStyle = ((i % C) + ((i / C) | 0)) % 2 ? 'rgba(30,14,60,.82)' : 'rgba(46,24,88,.82)';
      ctx.fillRect(x, y, cs, cs);
    }
    ctx.strokeStyle = 'rgba(255,190,255,.28)'; ctx.lineWidth = 2;
    for (let i = 0; i < N; i++) {
      if (!b.mask[i]) continue;
      const r = (i / C) | 0, c = i % C, x = L.bx + c * cs, y = L.by + r * cs;
      ctx.beginPath();
      if (r === 0 || !b.mask[i - C]) { ctx.moveTo(x, y); ctx.lineTo(x + cs, y); }
      if (r === R - 1 || !b.mask[i + C]) { ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); }
      if (c === 0 || !b.mask[i - 1]) { ctx.moveTo(x, y); ctx.lineTo(x, y + cs); }
      if (c === C - 1 || !b.mask[i + 1]) { ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); }
      ctx.stroke();
    }
    // ג'לי
    for (let i = 0; i < N; i++) {
      const j = b.jelly[i];
      if (!j) continue;
      const x = L.bx + (i % C) * cs, y = L.by + ((i / C) | 0) * cs, wob = Math.sin(t * 0.08 + i) * 1.2;
      g.rr(ctx, x + 3, y + 3 + wob * 0.3, cs - 6, cs - 6 - wob * 0.3, 14);
      ctx.fillStyle = j > 1 ? 'rgba(240,70,190,.62)' : 'rgba(255,140,220,.38)'; ctx.fill();
      ctx.strokeStyle = j > 1 ? 'rgba(255,180,240,.95)' : 'rgba(255,190,240,.6)'; ctx.lineWidth = j > 1 ? 3 : 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x + cs * 0.3, y + cs * 0.22, cs * 0.14, cs * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    // יהלומים (נחתכים בגבול העליון של הלוח)
    ctx.save();
    ctx.beginPath(); ctx.rect(L.bx - 4, L.by, C * cs + 8, R * cs + 4); ctx.clip();
    const hint = S.hint && S.phase === 'idle' ? S.hint : null;
    for (let i = 0; i < N; i++) {
      const gm = b.cells[i];
      if (!gm) continue;
      let x = L.bx + (gm.x + 0.5) * cs, y = L.by + (gm.y + 0.5) * cs, sc = 1;
      if (gm.land && t - gm.land < 8) sc = 1 + Math.sin((t - gm.land) / 8 * Math.PI) * 0.06;
      if (hint && (hint[0] === i || hint[1] === i)) {
        const o = hint[0] === i ? hint[1] : hint[0], w = Math.sin(t * 0.25) * 0.5 + 0.5;
        x += ((o % C) - (i % C)) * cs * 0.1 * w; y += (((o / C) | 0) - ((i / C) | 0)) * cs * 0.1 * w; sc *= 1 + w * 0.08;
      }
      if (i === S.sel) { sc *= 1.1; ctx.fillStyle = 'rgba(255,255,255,.22)'; g.rr(ctx, L.bx + (i % C) * cs + 3, L.by + ((i / C) | 0) * cs + 3, cs - 6, cs - 6, 12); ctx.fill(); }
      drawGem(ctx, gm, x, y, cs * 0.96, t, sc, rz);
    }
    for (const d of S.dying) {
      const q = Math.max(0, (d.t - d.d) / 14);
      if (q >= 1) continue;
      const x = L.bx + (d.x + 0.5) * cs, y = L.by + (d.y + 0.5) * cs;
      ctx.save(); ctx.globalAlpha = 1 - q;
      drawGem(ctx, d.gm, x, y, cs * 0.96, t, 1 + q * 0.5, rz);
      ctx.restore();
    }
    ctx.restore();
    // אפקטים של פיצוצים
    for (const f of S.fx) {
      const p = cellCenter(S, f.i), q = f.t / 26, a = 1 - q;
      ctx.save();
      if (f.type === 1 || f.type === 2) {
        const gr = f.type === 1 ? ctx.createLinearGradient(0, p.y - cs * 0.4, 0, p.y + cs * 0.4) : ctx.createLinearGradient(p.x - cs * 0.4, 0, p.x + cs * 0.4, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        const th = cs * (0.9 - q * 0.6);
        if (f.type === 1) ctx.fillRect(L.bx, p.y - th / 2, C * cs, th); else ctx.fillRect(p.x - th / 2, L.by, th, R * cs);
      } else if (f.type === 3 || f.type === 5 || f.type === 6) {
        const rr = cs * (f.type === 3 ? 1.6 : 2.6) * g.ease.out(q);
        ctx.strokeStyle = 'rgba(255,220,120,' + a + ')'; ctx.lineWidth = 10 * a + 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,220,' + a * 0.35 + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
      } else if (f.type === 'ray' && f.from) {
        const o = cellCenter(S, f.from.i);
        ctx.strokeStyle = 'rgba(200,240,255,' + a + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(o.x, o.y);
        const mx = (o.x + p.x) / 2 + Math.sin(f.t * 1.3 + f.i) * 14, my = (o.y + p.y) / 2 + Math.cos(f.t * 1.1 + f.i) * 14;
        ctx.quadraticCurveTo(mx, my, p.x, p.y); ctx.stroke();
      } else if (f.type === 4) {
        ctx.fillStyle = 'rgba(255,255,255,' + a * 0.5 + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, cs * 2.5 * q, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (S.kb && S.cur >= 0 && S.phase === 'idle') {
      ctx.strokeStyle = S.sel === S.cur ? '#ffd65a' : '#ffffff'; ctx.lineWidth = 3;
      g.rr(ctx, L.bx + (S.cur % C) * cs + 2, L.by + ((S.cur / C) | 0) * cs + 2, cs - 4, cs - 4, 12); ctx.stroke();
    }
  }

  function cellAt(S, p) {
    const L = S.L, c = Math.floor((p.x - L.bx) / L.cs), r = Math.floor((p.y - L.by) / L.cs);
    if (c < 0 || r < 0 || c >= C || r >= R) return -1;
    const i = idx(r, c);
    return S.b.mask[i] ? i : -1;
  }

  GK.register('gems', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#1d0f3d', accent: '#ff7ad9',
    levels: 30,
    text: TXT,

    init(g) {
      const n = Math.max(1, Math.min(30, g.level || 1));
      g.s = newState(g, n);
      g.score = 0;
      if (g.demo) { g.s.phase = 'idle'; return; }
      g.after(0.15, () => g.msg(g.t('levelGo', { n }), 1200, '#ffc8f0'));
    },

    step(g) {
      const S = g.s;
      for (const c of g.hits) {
        const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -C, ArrowDown: C, KeyA: -1, KeyD: 1, KeyW: -C, KeyS: C }[c];
        if (mv) {
          S.kb = true;
          if (S.cur < 0) { S.cur = 27; continue; }
          const nx = S.cur + mv;
          if (nx < 0 || nx >= N || (Math.abs(mv) === 1 && ((nx / C) | 0) !== ((S.cur / C) | 0))) continue;
          if (S.sel >= 0) { trySwap(g, S.sel, nx); S.sel = -1; }
          if (S.b.mask[nx]) S.cur = nx;
        } else if ((c === 'Space' || c === 'Enter') && S.cur >= 0 && S.phase === 'idle') { S.sel = S.sel === S.cur ? -1 : S.cur; g.sfx('click'); }
      }
      stepGame(g);
    },

    idle(g) { if (g.s) g.s.t++; },
    onPause(g) { if (g.s) g.s.pausedEnd = true; },

    // בוט לבדיקות: מהלך חמדן דרך אותה פעולת החלפה של השחקן
    bot(g) {
      const S = g.s;
      if (S.phase !== 'idle' || ++S.botT < 18) return;
      S.botT = 0;
      const mv = findMoves(S.b);
      if (mv.length) { const m = greedyMove(S.b, mv, S.lv, S.st); trySwap(g, m[0], m[1]); }
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') {
        S.kb = false;
        const i = cellAt(S, p);
        if (i < 0 || S.phase !== 'idle') { S.drag = null; return; }
        if (S.sel >= 0 && S.sel !== i) {
          const ra = (S.sel / C) | 0, rc = (i / C) | 0;
          if (Math.abs(ra - rc) + Math.abs((S.sel % C) - (i % C)) === 1) { trySwap(g, S.sel, i); S.drag = null; return; }
        }
        S.sel = S.sel === i ? -1 : i;
        if (S.sel >= 0) g.sfx('click');
        S.drag = { i, x: p.x, y: p.y, id: p.id };
      } else if (type === 'move' && S.drag && S.drag.id === p.id) {
        const dx = p.x - S.drag.x, dy = p.y - S.drag.y;
        if (Math.hypot(dx, dy) < S.L.cs * 0.35) return;
        const i = S.drag.i, r = (i / C) | 0, c = i % C;
        let j = -1;
        if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && c < C - 1) j = i + 1; else if (dx < 0 && c > 0) j = i - 1; }
        else { if (dy > 0 && r < R - 1) j = i + C; else if (dy < 0 && r > 0) j = i - C; }
        S.drag = null;
        if (j >= 0 && S.b.mask[j]) trySwap(g, i, j);
      } else if (type === 'up') S.drag = null;
    },

    draw(g, ctx) {
      const S = g.s;
      drawBg(g, ctx, S.t);
      drawPanel(g, ctx);
      drawBoard(g, ctx);
    },

    cover(ctx, w, h, k) {
      const g = Object.assign(Object.create(k), { W: w, H: h });
      drawBg(g, ctx, 40);
      const cs = 74, cols = 9, rows = 5, ox = w / 2 - cols * cs / 2, oy = h / 2 - rows * cs / 2 + 6;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      k.rr(ctx, ox - 10, oy - 10, cols * cs + 20, rows * cs + 20, 22); ctx.fillStyle = 'rgba(30,14,60,.92)'; ctx.fill();
      ctx.restore();
      const pat = [[0, 4, 2, 1, 5, 3, 0, 2, 4], [3, 3, 5, 3, 0, 1, 4, 4, 1], [2, 1, 0, 4, 2, 2, 2, 5, 0], [5, 0, 1, 5, 3, 4, 1, 3, 2], [1, 2, 4, 0, 1, 5, 0, 1, 3]];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 ? 'rgba(46,24,88,.9)' : 'rgba(58,32,104,.9)';
        ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs);
      }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const sp = r === 1 && c === 3 ? 1 : r === 3 && c === 6 ? 3 : r === 2 && c === 8 ? 4 : 0;
        ctx.save(); ctx.translate(ox + (c + 0.5) * cs, oy + (r + 0.5) * cs);
        if (r === 2 && c >= 4 && c <= 6) { ctx.shadowColor = '#fff6a0'; ctx.shadowBlur = 26; }
        drawGemRaw(ctx, pat[r][c], sp, cs * 0.42);
        ctx.restore();
      }
      // קרן של מפוצץ קו
      const gy = oy + 1.5 * cs, gr = ctx.createLinearGradient(0, gy - 22, 0, gy + 22);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(ox, gy - 22, cols * cs, 44);
      for (let q = 0; q < 26; q++) { const x = (q * 151) % w, y = (q * 67 + 15) % h; ctx.fillStyle = ['#ffd65a', '#ff9ad8', '#9fe7ff', '#fff'][q % 4]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x, y, 1.5 + (q % 3), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    },

    _core: { LEVELS, SHAPES, makeBoard, findRuns, findMoves, isValidSwap, resolveSwap, matchStep, gravity, shuffleBoard, simulate, goalDone, newEv, explode, cloneBoard, jellyLeft },
  });
})();
