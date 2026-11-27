// ============================================================
//  פקק תנועה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  חניון 6×6 עמוס. גוררים מכוניות ומשאיות (כל רכב זז רק קדימה ואחורה) עד שהמכונית האדומה יוצאת מהשער.
//  40 שלבים מהקל לקשה. כל שלב הוכח בפותר BFS (מהלך = הזזת רכב אחד כמה משבצות שרוצים),
//  ולכל שלב שמור מספר המהלכים הקטן ביותר. הכוכבים לפי המהלכים; הרמז והבוט משתמשים באותו פותר.
// ============================================================
(function () {
  'use strict';
  // [הלוח: 36 אותיות, שורה אחרי שורה. o = ריק, A = המכונית האדומה, כל אות אחרת = רכב אחד], הכי מעט מהלכים
  const LV = [
    ['ooooBoooooBooAAoBoDoooooDooooooCCooo', 2],   // 1: tutorial - the truck down, then out
    ['BoooooBooCooAAoCoDoooooDoEEooDoooooo', 3],   // 2: tutorial - a car up, the truck down, then out
    ['ooooBoooooBCDoAAECDoFFEoGoHHHoGoIIoo', 4],
    ['oooBBCoDooECFDAAEGFoHHHGoooooGoooIII', 5],
    ['ooooBBCCCoooAADooEooDooEFooooEFGGHHH', 6],
    ['oBBCCDooEooDAAEooDooFFGGooHoooooHoII', 7],
    ['ooBBBoooCDEoAACDEFooGHHFIoGoooIooooo', 8],
    ['ooooBCDDEFBCAAEFBCGHIIJJGHoooooooooo', 9],
    ['oBoCDDoBECoooBEAAFGGHooFooHooIoooooI', 10],
    ['oooBCCDDDBEooFAAEGoFoHHGoFooIooJJJIo', 11],
    ['oBBoooooCDDEAACFoEGGGFooHIIJJJHooooo', 12],
    ['oBoooooBCCoDoAAooDEFFGGDEoHIJJooHIoo', 13],
    ['oooBoooCCBDDAAEBoFoGEHHFoGIooJKKIooJ', 14],
    ['oBCDDooBCEooAACEooFoGGHHFoIIIJKKKooJ', 15],
    ['oooooBooCDDBooCAAEooFGoEooFGHHIIIGoo', 16],
    ['BCCDEoBoFDEoAAFGooHHHGIIoooJJooKKKoo', 17],
    ['oBooCooBDDCoAAEoCoFFEGGoHIIJooHKKJoo', 18],
    ['ooBoCCooBoDDAAEooFGGEHHFIIIJoFoKKJoo', 19],
    ['BCCDDoBoooEFGAAoEFGHHHEooIJJKKoIoLLo', 20],
    ['oBBBCDooooCDoEAAFGoEooFGooHIIoJJHooo', 21],
    ['BoCCoDBEEFoDAAGFoDHHGoooooIJJJKKIooo', 22],
    ['BCCDDEBoFFFEAAGooEHoGoIIHJJJKoLLooKo', 23],
    ['oBBBCDEEooCDoFAAGHoFIoGHooIoJJoooKKo', 24],
    ['BBCCDoEEEoDFAAGoDFooGHHFIJJKooILLKMM', 25],
    ['BoCCDDBoEFGGAAEFoHoooFIHoJJJIKooLLLK', 26],
    ['BBooCCDooEFFDAAEGHoIIIGHJJKooHooKLLL', 27],
    ['BCCDooBEFDGGoEFAAHIJJJoHIKKooLoooooL', 28],
    ['ooBCCCDDBoEoAAFGEoHoFGIIHJJGoKoooooK', 29],
    ['BooooCBDDDECAAFGECooFGEooooHIIoJJHKK', 30],
    ['oBoCCCoBoDEoAAoDEFGHHHEFGoIooJGoIKKJ', 31],
    ['ooBooCDDBoECFGAAEHFGIIEHFooJKKLLoJoo', 32],
    ['oBBBCoDDooCooAAoEFoGHHEFoGIoJJKKIooo', 33],
    ['ooBCDDooBCooAABEoFGHHEoFGoIIoJKKoLLJ', 34],
    ['BCCCoDBoEFFDAAEGHIoJJGHIoooKLLoooKoo', 35],
    ['BCDDEEBCFFGoBAAHGIJJKHGIooKLLIoMMNNo', 36],
    ['BBCoooDoCEEFDoAAGFoooHGFIIIHJooKKHJo', 37],
    ['BCCoDDBoEFFFAAEooGoHIIJGoHKKJLoMMMJL', 38],
    ['BCCDooBoEDFFGoEAAHGoIJJHooIKKLMMNNoL', 40],
    ['BoooooBCCCoDAAoEFDGGHEFDooHIJJoKKIoo', 42],
    ['BBCooDEoCFFDEoAAGDHHoIGoJJJIKooLLIKo', 44],
  ];
  const N = 6, EXIT = 2, GOAL = 4;
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;
  const stars3 = o => o + Math.floor(o * 0.1);              // 3 כוכבים: עד 10% מעל הכי טוב
  const stars2 = o => o + Math.ceil(o * 0.5) + 2;
  const PAL = ['#3d7cff', '#2ecc71', '#9b59ff', '#ffa726', '#18c4c4', '#ff7fd1', '#9ad13a', '#eef1f6', '#5b6b8c', '#c98a5a', '#5ec8ff', '#7d5cff'];
  const CARS = ['sedan', 'taxi', 'sport', 'pickup', 'van'], TRUCKS = ['bus', 'box', 'tanker'];
  const HERO = '#e8323c';

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ----- שלב: רשימת רכבים (אופקי/אנכי, אורך, שורה או עמודה, מיקום) ועיצוב קבוע לכל רכב -----
  function parseBoard(str, opt, n) {
    const cells = {};
    for (let i = 0; i < 36; i++) { const ch = str[i]; if (ch !== 'o' && ch !== '.') (cells[ch] || (cells[ch] = [])).push(i); }
    const R = rng(n * 7919 + 13), pal = PAL.slice();
    for (let i = pal.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pal[i], pal[j]] = [pal[j], pal[i]]; }
    let taxis = 0;
    const cars = Object.keys(cells).sort().map((ch, k) => {
      const cs = cells[ch], hz = cs.length > 1 && cs[1] - cs[0] === 1, len = cs.length;
      const line = hz ? (cs[0] / 6) | 0 : cs[0] % 6, pos = hz ? cs[0] % 6 : (cs[0] / 6) | 0;
      const v = { ch, hz, len, line, pos, face: R() < 0.5 ? 1 : -1, col: pal[k % pal.length], cab: pal[(k + 5) % pal.length], style: '' };
      if (ch === 'A') { v.style = 'hero'; v.col = HERO; v.face = 1; }
      else if (len === 3) v.style = TRUCKS[Math.floor(R() * TRUCKS.length)];
      else {
        v.style = CARS[Math.floor(R() * CARS.length)];
        if (v.style === 'taxi' && taxis++) v.style = 'sedan';      // מונית צהובה אחת לכל היותר בחניון
        if (v.style === 'taxi') v.col = '#ffd23a';
      }
      if (v.style === 'bus') v.col = ['#ffc21a', '#ff9f2e', '#4fb3ff', '#2ecc71'][Math.floor(R() * 4)];
      if (v.cab === v.col) v.cab = '#eef1f6';
      return v;
    });
    return { n, opt, str, cars };
  }
  const parse = n => parseBoard(LV[n - 1][0], LV[n - 1][1], n);

  // ----- הפותר: כל המצבים שאפשר להגיע אליהם, והמרחק של כל אחד מהיציאה (כל מהלך הפיך, אז הגרף לא מכוון) -----
  // בשלב גדול זה עשרות אלפי מצבים: step מקדם את החישוב קצת בכל צעד (בלי לתקוע את המשחק),
  // ורמז שמבקשים לפני שהחישוב נגמר משלים אותו מיד
  const solved = {};
  function solveJob(L) {
    if (solved[L.str]) return solved[L.str];
    const cs = L.cars, n = cs.length, occ = new Int8Array(36), p = new Array(n);
    const enc = q => { let k = 0; for (let i = 0; i < n; i++) k = k * 8 + q[i]; return k; };
    const dec = (k, out) => { for (let i = n - 1; i >= 0; i--) { const r = k % 8; out[i] = r; k = (k - r) / 8; } return out; };
    const neigh = (q, f) => {
      occ.fill(-1);
      for (let i = 0; i < n; i++) { const c = cs[i]; for (let k = 0; k < c.len; k++) occ[c.hz ? c.line * 6 + q[i] + k : (q[i] + k) * 6 + c.line] = i; }
      for (let i = 0; i < n; i++) {
        const c = cs[i], cur = q[i];
        for (let d = -1; d <= 1; d += 2) {
          for (let to = cur + d; to >= 0 && to + c.len <= N; to += d) {
            const head = d < 0 ? to : to + c.len - 1;
            if (occ[c.hz ? c.line * 6 + head : head * 6 + c.line] >= 0) break;
            q[i] = to; f(enc(q), i, to); q[i] = cur;
          }
        }
      }
    };
    const sk = enc(cs.map(c => c.pos));
    return (solved[L.str] = { enc, dec, neigh, p, sk, keys: [sk], dist: new Map([[sk, -1]]), q: [], h: 0, qh: 0, done: false, states: 0, opt: undefined });
  }
  // budget = כמה מצבים לעבד עכשיו. קודם כל המצבים (מצבי סיום מקבלים 0), אחר כך BFS אחורה ממצבי הסיום
  function advance(J, budget) {
    const { keys, dist, q, p } = J;
    while (!J.done && budget-- > 0) {
      if (J.h < keys.length) {
        const k = keys[J.h++];
        J.dec(k, p);
        if (p[0] === GOAL) { dist.set(k, 0); q.push(k); }
        J.neigh(p, k2 => { if (!dist.has(k2)) { dist.set(k2, -1); keys.push(k2); } });
      } else if (J.qh < q.length) {
        const k = q[J.qh++], d = dist.get(k);
        J.dec(k, p);
        J.neigh(p, k2 => { if (dist.get(k2) < 0) { dist.set(k2, d + 1); q.push(k2); } });
      } else { J.done = true; J.states = keys.length; J.opt = dist.get(J.sk); J.keys = J.q = null; }
    }
    return J.done;
  }
  const solver = L => { const J = solveJob(L); advance(J, Infinity); return J; };
  // המהלך הבא בדרך הקצרה ביותר מהמצב הנוכחי
  function bestMove(S) {
    const sv = solver(S.L), p = S.cars.map(c => c.pos), d = sv.dist.get(sv.enc(p));
    if (!(d > 0)) return null;
    let best = null;
    sv.neigh(p, (k, i, to) => { if (!best && sv.dist.get(k) === d - 1) best = { i, to, left: d }; });
    return best;
  }

  // ----- מצב -----
  function makeState(g, L) {
    const S = {
      L, cars: L.cars.map(c => Object.assign({}, c, { f: c.pos, pf: c.pos })),
      moves: 0, hist: [], drag: null, sel: 0, kbd: false, hover: -1, hoverBtn: null, press: null, pressT: 0,
      hint: null, hints: 0, won: false, winT: 0, out: 0, outV: 0, gate: 0, t: 0, botDrag: null,
      wig: new Float32Array(L.cars.length), wigD: new Int8Array(L.cars.length), blink: new Int16Array(L.cars.length),
      clouds: [0, 1, 2].map(k => ({ x: (k * 0.37 + 0.1) * g.W, y: (0.2 + k * 0.3) * g.H, r: 160 + k * 40, v: 0.12 + k * 0.05 })),
    };
    layout(g, S);
    return S;
  }
  function layout(g, S) {
    const W = g.W, H = g.H;
    S.c = 84;
    if (W >= H) {
      S.ox = 190; S.oy = Math.round((H - 6 * S.c) / 2);
      const x = 41, y = Math.round(H / 2 - 46);
      S.btns = [{ id: 'hint', x, y: y - 116, w: 92, h: 92, key: 'H' }, { id: 'undo', x, y, w: 92, h: 92, key: 'Z' }, { id: 'restart', x, y: y + 116, w: 92, h: 92, key: 'R' }];
      S.banner = { x: S.ox + 3 * S.c, y: 30, w: 560 };
    } else {
      S.ox = 26; S.oy = 128;
      const y = S.oy + 6 * S.c + 52, x = Math.round(W / 2 - 46);
      S.btns = [{ id: 'hint', x: x - 120, y, w: 92, h: 92, key: 'H' }, { id: 'undo', x, y, w: 92, h: 92, key: 'Z' }, { id: 'restart', x: x + 120, y, w: 92, h: 92, key: 'R' }];
      S.banner = { x: W / 2, y: 62, w: 590 };
    }
  }
  const btnAt = (S, x, y) => S.btns.find(b => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) || null;
  // הרכב במשבצות (לפי המיקום המוצג), ואיפה הוא על המסך
  const shownPos = (S, i) => (i === 0 && S.won ? GOAL + S.out : S.cars[i].f);
  function carRect(S, i, f) {
    const c = S.cars[i], C = S.c;
    if (f == null) f = shownPos(S, i);
    return c.hz ? { x: S.ox + f * C, y: S.oy + c.line * C, w: c.len * C, h: C } : { x: S.ox + c.line * C, y: S.oy + f * C, w: C, h: c.len * C };
  }
  function carAt(S, x, y, pad) {
    for (let i = S.cars.length - 1; i >= 0; i--) {
      const r = carRect(S, i);
      if (x >= r.x + 4 - pad && x <= r.x + r.w - 4 + pad && y >= r.y + 4 - pad && y <= r.y + r.h - 4 + pad) return i;
    }
    return -1;
  }
  function occupancy(S, skip) {
    const occ = new Int8Array(36).fill(-1);
    S.cars.forEach((c, i) => { if (i !== skip) for (let k = 0; k < c.len; k++) occ[c.hz ? c.line * 6 + c.pos + k : (c.pos + k) * 6 + c.line] = i; });
    return occ;
  }
  // כמה רחוק הרכב יכול לנסוע לכל צד, ומי חוסם אותו
  function freeRange(S, i) {
    const c = S.cars[i], occ = occupancy(S, i), at = q => occ[c.hz ? c.line * 6 + q : q * 6 + c.line];
    let mn = c.pos, mx = c.pos;
    while (mn - 1 >= 0 && at(mn - 1) < 0) mn--;
    while (mx + c.len < N && at(mx + c.len) < 0) mx++;
    return { mn, mx, lo: mn - 1 >= 0 ? at(mn - 1) : -1, hi: mx + c.len < N ? at(mx + c.len) : -1 };
  }
  const pathClear = S => { const c = S.cars[0], occ = occupancy(S, 0); for (let x = c.pos + 2; x < N; x++) if (occ[EXIT * 6 + x] >= 0) return false; return true; };

  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    const t3 = stars3(S.L.opt);
    if (g.H > g.W) g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves + '/' + t3]]);
    else g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves], [g.t('goal'), t3]]);
  }

  // ----- מהלכים: גרירה אחת או כמה הקשות ברצף על אותו רכב = מהלך אחד -----
  function commitMove(g, i, from, to) {
    const S = g.s;
    if (from === to) return;
    const top = S.hist[S.hist.length - 1];
    if (top && top.i === i) { if (top.from === to) S.hist.pop(); }
    else S.hist.push({ i, from });
    S.moves = S.hist.length;
    S.hint = null;
    hud(g);
    if (i === 0 && to === GOAL) win(g);
  }
  function bump(g, i, other, dir) {
    const S = g.s;
    if (other >= 0) { S.wig[other] = 1; S.wigD[other] = dir; }
    g.tone({ f: 150, f2: 105, dur: 0.08, type: 'sine', vol: 0.15 });
  }
  function beginDrag(g, i, x, y, id) {
    const S = g.s, c = S.cars[i], r = freeRange(S, i);
    S.drag = { i, id, start: c.pos, grab: (c.hz ? x : y) / S.c - c.f, mn: r.mn, mx: r.mx, lo: r.lo, hi: r.hi, cell: c.pos, edge: 0 };
    S.sel = i; S.hint = S.hint && S.hint.i === i ? S.hint : S.hint;
    g.sfx('click', { p: 0.8 });
  }
  function dragTo(g, x, y) {
    const S = g.s, d = S.drag;
    if (!d) return;
    const c = S.cars[d.i], raw = (c.hz ? x : y) / S.c - d.grab, f = g.clamp(raw, d.mn, d.mx);
    c.f = c.pf = f;
    const cell = Math.round(f);
    if (cell !== d.cell) { d.cell = cell; g.sfx('tick', { p: 0.8 + cell * 0.08 }); }
    // נוגעים ברכב שחוסם: צליל קטן והרכב החוסם רועד
    const edge = raw < d.mn - 0.12 ? -1 : raw > d.mx + 0.12 ? 1 : 0;
    if (edge && edge !== d.edge) bump(g, d.i, edge < 0 ? d.lo : d.hi, c.hz ? 1 : 2);
    d.edge = edge;
    if (d.i === 0 && f >= GOAL - 0.02 && d.mx === GOAL) endDrag(g);      // המכונית האדומה בשער — יוצאת מיד
  }
  function endDrag(g) {
    const S = g.s, d = S.drag;
    if (!d) return;
    S.drag = null;
    const c = S.cars[d.i], to = g.clamp(Math.round(c.f), d.mn, d.mx);
    c.pos = to;
    if (to !== d.start) {
      g.sfx('place', { p: c.len === 3 ? 0.8 : 1 });
      const r = carRect(S, d.i, to);
      g.burst(r.x + r.w / 2, r.y + r.h / 2, { n: 6, color: ['#c7ccd3', '#9aa3ad'], speed: 1.4, life: 20, gravity: 0, size: 5 });
    }
    commitMove(g, d.i, d.start, to);
  }
  function stepCar(g, i, dir) {
    const S = g.s, c = S.cars[i], r = freeRange(S, i), to = c.pos + dir;
    if (to < r.mn || to > r.mx) { bump(g, i, dir < 0 ? r.lo : r.hi, c.hz ? 1 : 2); return; }
    const from = c.pos;
    c.pos = to;
    g.sfx('move', { p: 0.9 + to * 0.05 });
    // רצף צעדים על אותו רכב = מהלך אחד; ההיסטוריה זוכרת מאיפה התחיל
    const top = S.hist[S.hist.length - 1];
    if (top && top.i === i) { if (top.from === to) S.hist.pop(); }
    else S.hist.push({ i, from });
    S.moves = S.hist.length;
    S.hint = null;
    hud(g);
    if (i === 0 && to === GOAL) win(g);
  }
  function undo(g) {
    const S = g.s;
    if (S.won) return;
    if (S.drag) endDrag(g);
    const h = S.hist.pop();
    if (!h) { g.sfx('error'); return; }
    S.cars[h.i].pos = h.from;
    S.moves = S.hist.length;
    S.hint = null;
    g.sfx('whoosh');
    hud(g);
  }
  function showHint(g) {
    const S = g.s;
    if (S.won) return;
    if (S.drag) endDrag(g);
    const m = bestMove(S);
    if (!m) return;
    S.hint = Object.assign(m, { t: 0 });
    S.sel = m.i;
    S.hints++;
    g.sfx('power');
  }
  function press(g, id) {
    const S = g.s;
    S.press = id; S.pressT = 8;
    if (id === 'undo') undo(g);
    else if (id === 'hint') showHint(g);
    else if (id === 'restart') { g.sfx('click'); g.start(g.level); }
  }
  function win(g) {
    const S = g.s, L = S.L;
    if (S.won) return;
    S.won = true; S.winT = 0; S.out = 0; S.outV = 0.02; S.drag = null; S.hint = null;
    let stars = S.moves <= stars3(L.opt) ? 3 : S.moves <= stars2(L.opt) ? 2 : 1;
    if (S.hints) stars = Math.min(stars, 2);
    g.tone({ f: 90, f2: 260, dur: 0.7, type: 'sawtooth', vol: 0.07 });
    g.tone({ f: 523, dur: 0.12, type: 'square', vol: 0.05, delay: 0.15 });
    g.tone({ f: 659, dur: 0.2, type: 'square', vol: 0.05, delay: 0.3 });
    const gx = S.ox + 6 * S.c + 10, gy = S.oy + (EXIT + 0.5) * S.c;
    g.burst(gx, gy, { n: 40, color: ['#ffd84d', '#ff5d8f', '#4fb8ff', '#7cf0a0', '#ffffff'], speed: 5, life: 60, gravity: 0.08, shape: 'square', size: 7 });
    if (S.moves === L.opt) g.msg(g.t('perfect'), 1100, '#ffd84d');
    S.stars = stars;      // חלון סוף השלב נפתח ב-step, כשהמכונית כבר בחוץ
  }

  // ----- תנועה ואנימציה (גם בתפריט ובסוף) -----
  function animate(g, S) {
    S.t++;
    if (S.pressT > 0) S.pressT--;
    for (let i = 0; i < S.cars.length; i++) {
      const c = S.cars[i];
      c.pf = c.f;
      if (!(S.drag && S.drag.i === i) && c.f !== c.pos) { c.f += (c.pos - c.f) * 0.32; if (Math.abs(c.pos - c.f) < 0.004) c.f = c.pos; }
      if (S.wig[i] > 0) S.wig[i] = Math.max(0, S.wig[i] - 0.06);
      if (S.blink[i] > 0) S.blink[i]--;
    }
    if (!S.won && S.t % 150 === 0 && S.cars.length > 1) S.blink[1 + ((S.t / 150 * 7) % (S.cars.length - 1)) | 0] = 110;
    for (const cl of S.clouds) { cl.x += cl.v; if (cl.x - cl.r > g.W) cl.x = -cl.r; }
    // השער נפתח כשהמכונית האדומה מתקרבת
    const hero = S.won ? GOAL + 1 : S.cars[0].f;
    const want = g.clamp((hero - 2.6) / 1.2, 0, 1);
    S.gate += (want - S.gate) * 0.18;
    if (S.hint) S.hint.t++;
    if (S.won) {
      S.winT++;
      S.outV = Math.min(0.5, S.outV * 1.09 + 0.012);
      const before = S.out;
      S.out += S.outV;
      const r = carRect(S, 0);
      if (S.winT % 3 === 0 && r.x < g.W) g.burst(r.x + 4, r.y + r.h * 0.5, { n: 2, color: ['#d7dbe0', '#aeb5bd'], speed: 0.8, life: 26, gravity: -0.02, size: 9, dir: Math.PI, spread: 0.8 });
      if (before < 2.5 && S.out >= 2.5) g.tone({ f: 420, dur: 0.1, type: 'square', vol: 0.04 });
    } else if (S.t % 70 === 0) {
      const r = carRect(S, 0);
      g.burst(r.x + 2, r.y + r.h * 0.62, { n: 1, color: '#c9ced4', speed: 0.5, life: 30, gravity: -0.015, size: 7, dir: Math.PI, spread: 0.6 });
    }
  }

  // ----- ציור: רקע קבוע (נשמר פעם אחת), חניון, רכבים -----
  const bgCache = { key: '', cv: null };
  function drawStatic(g, ctx, S) {
    const tr = ctx.getTransform ? ctx.getTransform() : null, res = tr ? Math.hypot(tr.a, tr.b) : 1;
    const key = g.W + 'x' + g.H + '@' + res.toFixed(3);
    if (typeof document !== 'undefined' && document.createElement && res > 0) {
      if (bgCache.key !== key) {
        const cv = document.createElement('canvas');
        cv.width = Math.round(g.W * res); cv.height = Math.round(g.H * res);
        const c2 = cv.getContext('2d');
        c2.setTransform(res, 0, 0, res, 0, 0);
        paintStatic(g, c2, S, g.W, g.H);
        bgCache.key = key; bgCache.cv = cv;
      }
      ctx.drawImage(bgCache.cv, 0, 0, g.W, g.H);
    } else paintStatic(g, ctx, S, g.W, g.H);
  }
  function tree(ctx, x, y, r, hue) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.28, y + r * 0.34, r * 1.02, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15);
    gr.addColorStop(0, hue ? '#c6ec7a' : '#a6e57a'); gr.addColorStop(0.5, hue ? '#6fb53f' : '#4fa83d'); gr.addColorStop(1, hue ? '#3d7a26' : '#2c722b');
    ctx.fillStyle = gr;
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + r; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.24, 0, Math.PI * 2); ctx.fill();
  }
  function bush(ctx, x, y, r, R) {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f9a3a';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k - 1.5) * r * 0.55, y + (k % 2 ? -r * 0.25 : r * 0.1), r * 0.7, 0, Math.PI * 2); ctx.fill(); }
    const fl = ['#ff7fb5', '#ffe066', '#ffffff', '#c58cff'][Math.floor(R() * 4)];
    ctx.fillStyle = fl;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + (R() - 0.5) * r * 2, y + (R() - 0.6) * r * 1.1, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  function paintStatic(g, ctx, S, W, H) {
    const c = S.c, ox = S.ox, oy = S.oy, B = 6 * c, cb = 16, sw = 14;
    const R = rng(W * 31 + H * 7);
    // דשא
    let gr = ctx.createLinearGradient(0, 0, W * 0.3, H);
    gr.addColorStop(0, '#7cc65c'); gr.addColorStop(1, '#4e9a3e');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(10,60,10,.1)';
      ctx.beginPath(); ctx.ellipse(R() * W, R() * H, 2 + R() * 6, 1 + R() * 2, R() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // כביש היציאה
    const ry = oy + EXIT * c, gx = ox + B;
    ctx.fillStyle = '#c9ced4'; ctx.fillRect(gx, ry - 26, W - gx + 10, c + 52);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    for (let x = gx; x < W; x += 28) ctx.fillRect(x, ry - 26, 2, c + 52);
    ctx.fillStyle = '#41474f'; ctx.fillRect(gx, ry - 12, W - gx + 10, c + 24);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(gx, ry - 9, W - gx + 10, 3); ctx.fillRect(gx, ry + c + 6, W - gx + 10, 3);
    for (let x = gx + 70; x < W - 20; x += 120) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); const yy = ry + c / 2;
      ctx.moveTo(x, yy - 6); ctx.lineTo(x + 26, yy - 6); ctx.lineTo(x + 26, yy - 15); ctx.lineTo(x + 46, yy); ctx.lineTo(x + 26, yy + 15); ctx.lineTo(x + 26, yy + 6); ctx.lineTo(x, yy + 6); ctx.closePath(); ctx.fill();
    }
    // מדרכה סביב החניון
    g.rr(ctx, ox - cb - sw, oy - cb - sw, B + 2 * (cb + sw), B + 2 * (cb + sw), 26);
    ctx.fillStyle = '#d0d4d9'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 2;
    for (let x = ox - cb - sw; x < ox + B + cb + sw; x += 26) { ctx.beginPath(); ctx.moveTo(x, oy - cb - sw); ctx.lineTo(x, oy + B + cb + sw); ctx.stroke(); }
    for (let y = oy - cb - sw; y < oy + B + cb + sw; y += 26) { ctx.beginPath(); ctx.moveTo(ox - cb - sw, y); ctx.lineTo(ox + B + cb + sw, y); ctx.stroke(); }
    ctx.restore();
    // עצים ושיחים במקומות הפנויים
    const keep = [
      [ox - cb - sw - 8, oy - cb - sw - 8, B + 2 * (cb + sw) + 16, B + 2 * (cb + sw) + 16],
      [gx, ry - 30, W - gx + 20, c + 60],
      ...S.btns.map(b => [b.x - 10, b.y - 10, b.w + 20, b.h + 26]),
      [S.banner.x - S.banner.w / 2, S.banner.y - 26, S.banner.w, 52],
    ];
    const blocked = (x, y, r) => keep.some(([kx, ky, kw, kh]) => x + r > kx && x - r < kx + kw && y + r > ky && y - r < ky + kh);
    const spots = [];
    for (let y = 30; y < H + 30; y += 66) for (let x = 20 + ((y / 66) % 2) * 33; x < W + 30; x += 66) spots.push([x + (R() - 0.5) * 34, y + (R() - 0.5) * 30]);
    for (const [x, y] of spots) {
      const r = 22 + R() * 16;
      if (blocked(x, y, r * 0.8)) { if (!blocked(x, y, 12) && R() < 0.5) bush(ctx, x, y, 11, R); continue; }
      if (R() < 0.25) { bush(ctx, x, y, 13, R); continue; }
      tree(ctx, x, y, r, R() < 0.3);
    }
    // שפת המדרכה (אבן שפה)
    g.rr(ctx, ox - cb, oy - cb, B + 2 * cb, B + 2 * cb, 18);
    gr = ctx.createLinearGradient(0, oy - cb, 0, oy + B + cb);
    gr.addColorStop(0, '#eef1f4'); gr.addColorStop(1, '#a9b1ba');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    // אספלט
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10;
    g.rr(ctx, ox, oy, B, B, 8); ctx.fillStyle = '#41474f'; ctx.fill();
    ctx.restore();
    ctx.save();
    g.rr(ctx, ox, oy, B, B, 8); ctx.clip();
    gr = ctx.createRadialGradient(ox + B * 0.4, oy + B * 0.35, 40, ox + B / 2, oy + B / 2, B * 0.75);
    gr.addColorStop(0, '#4a5059'); gr.addColorStop(1, '#353a41');
    ctx.fillStyle = gr; ctx.fillRect(ox, oy, B, B);
    for (let i = 0; i < 420; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.12)'; ctx.fillRect(ox + R() * B, oy + R() * B, 2, 2); }
    // קווי חניה
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2;
    for (let k = 1; k < N; k++) {
      ctx.beginPath(); ctx.moveTo(ox + k * c, oy); ctx.lineTo(ox + k * c, oy + B); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + k * c); ctx.lineTo(ox + B, oy + k * c); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    for (let a = 1; a < N; a++) for (let b = 1; b < N; b++) { ctx.fillRect(ox + a * c - 7, oy + b * c - 1.5, 14, 3); ctx.fillRect(ox + a * c - 1.5, oy + b * c - 7, 3, 14); }
    // חצים בנתיב של המכונית האדומה
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    for (let k = 0; k < N; k++) {
      const x = ox + k * c + c / 2, y = oy + (EXIT + 0.5) * c;
      ctx.beginPath(); ctx.moveTo(x - 14, y - 12); ctx.lineTo(x + 2, y); ctx.lineTo(x - 14, y + 12); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // הפתח בשפה: היציאה
    ctx.fillStyle = '#41474f'; ctx.fillRect(gx - 6, ry + 1, cb + 8, c - 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(gx + 2, ry + 1, 12, c - 2); ctx.clip();
    for (let y = ry - 12; y < ry + c; y += 12) { ctx.fillStyle = ((y - ry) / 12) % 2 ? '#1c1f24' : '#ffd23a'; ctx.beginPath(); ctx.moveTo(gx + 2, y); ctx.lineTo(gx + 14, y + 12); ctx.lineTo(gx + 14, y + 24); ctx.lineTo(gx + 2, y + 12); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // שלט יציאה ירוק ליד השער
    const sx = gx + 46, sy = ry - 46;
    ctx.fillStyle = '#6b737c'; ctx.fillRect(sx - 2, sy + 8, 4, 22);
    g.rr(ctx, sx - 22, sy - 14, 44, 26, 6); ctx.fillStyle = '#1f9d55'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(sx - 13, sy - 4); ctx.lineTo(sx + 3, sy - 4); ctx.lineTo(sx + 3, sy - 9); ctx.lineTo(sx + 14, sy - 1); ctx.lineTo(sx + 3, sy + 7); ctx.lineTo(sx + 3, sy + 2); ctx.lineTo(sx - 13, sy + 2); ctx.closePath(); ctx.fill();
  }
  function drawGate(g, ctx, S) {
    const c = S.c, px = S.ox + 6 * c + 8, py = S.oy + EXIT * c - 4;
    const a = Math.PI / 2 - S.gate * Math.PI * 0.62, len = c + 4;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; g.rr(ctx, 2, -1, len, 10, 4); ctx.fill();
    g.rr(ctx, 0, -5, len, 10, 4); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#e8323c';
    for (let x = 6; x < len; x += 20) ctx.fillRect(x, -5, 10, 10);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; g.rr(ctx, 0, -5, len, 10, 4); ctx.stroke();
    ctx.restore();
    g.circle(ctx, px, py, 9); ctx.fillStyle = '#5a636d'; ctx.fill();
    g.circle(ctx, px - 2, py - 2, 4); ctx.fillStyle = '#9aa4ae'; ctx.fill();
  }

  // ----- רכבים במבט מלמעלה (ציור במערכת שבה החזית פונה ימינה) -----
  const glass = (ctx, x0, x1) => { const gr = ctx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#2c4a66'); gr.addColorStop(0.6, '#6d9cc4'); gr.addColorStop(1, '#bfe4ff'); return gr; };
  function bodyFill(g, ctx, col, Wd) {
    const gr = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
    gr.addColorStop(0, g.shade(col, -0.32)); gr.addColorStop(0.2, col); gr.addColorStop(0.5, g.shade(col, 0.2)); gr.addColorStop(0.8, col); gr.addColorStop(1, g.shade(col, -0.32));
    return gr;
  }
  function wheels(g, ctx, xs, L, Wd) {
    ctx.fillStyle = '#17191e';
    const wl = Math.min(L * 0.17, 25), ww = Wd * 0.18;
    for (const x of xs) for (const s of [-1, 1]) { g.rr(ctx, x - wl / 2, s > 0 ? Wd / 2 - ww * 0.6 : -Wd / 2 - ww * 0.4, wl, ww, ww * 0.45); ctx.fill(); }
  }
  function lights(g, ctx, L, Wd, o) {
    ctx.fillStyle = '#fff6c8';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L / 2 - 5, s * Wd * 0.3, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff3b3b';
    for (const s of [-1, 1]) { g.rr(ctx, -L / 2 + 1, s * Wd * 0.3 - 4, 4, 8, 2); ctx.fill(); }
    if (o.blink) {
      ctx.fillStyle = '#ffb020';
      ctx.save(); ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 10;
      for (const s of [-1, 1]) { g.circle(ctx, L / 2 - 4, s * (Wd / 2 - 3), 3.5); ctx.fill(); g.circle(ctx, -L / 2 + 4, s * (Wd / 2 - 3), 3.5); ctx.fill(); }
      ctx.restore();
    }
  }
  function mirrors(g, ctx, x, Wd, col) { ctx.fillStyle = col; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x, s * (Wd / 2 + 2), 4, 3, 0, 0, Math.PI * 2); ctx.fill(); } }
  function cabin(g, ctx, L, Wd, col, a, b, rear) {
    // שמשה קדמית, גג, שמשה אחורית (בין x=a ל-x=b)
    const dk = g.shade(col, -0.45);
    ctx.fillStyle = glass(ctx, b - L * 0.03, b + L * 0.13);
    ctx.beginPath(); ctx.moveTo(b - L * 0.01, -Wd * 0.38); ctx.lineTo(b + L * 0.13, -Wd * 0.32); ctx.lineTo(b + L * 0.13, Wd * 0.32); ctx.lineTo(b - L * 0.01, Wd * 0.38); ctx.closePath(); ctx.fill();
    if (rear) {
      ctx.fillStyle = glass(ctx, a + L * 0.02, a - L * 0.1);
      ctx.beginPath(); ctx.moveTo(a + L * 0.01, -Wd * 0.36); ctx.lineTo(a - L * 0.08, -Wd * 0.3); ctx.lineTo(a - L * 0.08, Wd * 0.3); ctx.lineTo(a + L * 0.01, Wd * 0.36); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,50,70,.85)';
    g.rr(ctx, a, -Wd * 0.43, b - a, Wd * 0.08, 2); ctx.fill();
    g.rr(ctx, a, Wd * 0.35, b - a, Wd * 0.08, 2); ctx.fill();
    g.rr(ctx, a, -Wd * 0.36, b - a, Wd * 0.72, Wd * 0.16);
    const gr = ctx.createLinearGradient(0, -Wd * 0.36, 0, Wd * 0.36);
    gr.addColorStop(0, g.shade(col, -0.1)); gr.addColorStop(0.5, g.shade(col, 0.3)); gr.addColorStop(1, g.shade(col, -0.12));
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; g.rr(ctx, a + (b - a) * 0.15, -Wd * 0.26, (b - a) * 0.6, Wd * 0.1, 3); ctx.fill();
  }
  function paintVehicle(g, ctx, v, cx, cy, C, o) {
    o = o || {};
    const L = v.len * C - C * 0.17, Wd = C * 0.72, lift = o.lift || 0;
    const sw = v.hz ? L : Wd, sh = v.hz ? Wd : L;
    // צל (תמיד למטה-ימינה)
    ctx.fillStyle = 'rgba(0,0,0,' + (0.3 + lift * 0.08).toFixed(3) + ')';
    g.rr(ctx, cx - sw / 2 + 2 + lift * 5, cy - sh / 2 + 5 + lift * 8, sw, sh, Wd * 0.3); ctx.fill();
    ctx.save();
    ctx.translate(cx, cy - lift * 3);
    if (lift) ctx.scale(1 + lift * 0.035, 1 + lift * 0.035);
    ctx.rotate(v.hz ? (v.face > 0 ? 0 : Math.PI) : (v.face > 0 ? Math.PI / 2 : -Math.PI / 2));
    if (o.glow) {
      ctx.save();
      ctx.shadowColor = o.glowCol || '#ffffff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = o.glowCol || '#ffffff'; ctx.globalAlpha = Math.min(1, o.glow); ctx.lineWidth = 4;
      g.rr(ctx, -L / 2 - 5, -Wd / 2 - 6, L + 10, Wd + 12, Wd * 0.4); ctx.stroke();
      ctx.restore();
    }
    const col = v.col, dk = g.shade(col, -0.45), st = v.style;
    if (st === 'bus') {
      wheels(g, ctx, [L * 0.32, -L * 0.2, -L * 0.35], L, Wd);
      g.rr(ctx, -L / 2, -Wd / 2, L, Wd, Wd * 0.2); ctx.fillStyle = bodyFill(g, ctx, col, Wd); ctx.fill();
      ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(30,50,70,.85)';
      for (let x = -L * 0.43; x < L * 0.3; x += L * 0.1) { g.rr(ctx, x, -Wd / 2 + 3, L * 0.075, 6, 2); ctx.fill(); g.rr(ctx, x, Wd / 2 - 9, L * 0.075, 6, 2); ctx.fill(); }
      g.rr(ctx, -L * 0.44, -Wd * 0.3, L * 0.82, Wd * 0.6, 8); ctx.fillStyle = g.shade(col, 0.28); ctx.fill();
      ctx.fillStyle = '#cfd5dc'; g.rr(ctx, -L * 0.3, -Wd * 0.18, L * 0.16, Wd * 0.36, 4); ctx.fill(); g.rr(ctx, L * 0.02, -Wd * 0.18, L * 0.14, Wd * 0.36, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.5;
      for (const x of [-L * 0.26, -L * 0.22, -L * 0.18, L * 0.06, L * 0.1]) { ctx.beginPath(); ctx.moveTo(x, -Wd * 0.14); ctx.lineTo(x, Wd * 0.14); ctx.stroke(); }
      ctx.fillStyle = glass(ctx, L * 0.38, L * 0.5); g.rr(ctx, L * 0.4, -Wd * 0.42, L * 0.07, Wd * 0.84, 5); ctx.fill();
      ctx.fillStyle = '#2b2f36'; g.rr(ctx, L / 2 - 4, -Wd * 0.44, 4, Wd * 0.88, 2); ctx.fill(); g.rr(ctx, -L / 2, -Wd * 0.44, 4, Wd * 0.88, 2); ctx.fill();
      mirrors(g, ctx, L * 0.44, Wd, dk);
      lights(g, ctx, L, Wd, o);
    } else if (st === 'box' || st === 'tanker') {
      wheels(g, ctx, [L * 0.36, -L * 0.2, -L * 0.35], L, Wd);
      const cabC = v.cab;
      g.rr(ctx, L * 0.18, -Wd / 2, L * 0.32, Wd, Wd * 0.28); ctx.fillStyle = bodyFill(g, ctx, cabC, Wd); ctx.fill();
      ctx.strokeStyle = g.shade(cabC, -0.45); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = glass(ctx, L * 0.33, L * 0.46);
      ctx.beginPath(); ctx.moveTo(L * 0.34, -Wd * 0.38); ctx.lineTo(L * 0.45, -Wd * 0.33); ctx.lineTo(L * 0.45, Wd * 0.33); ctx.lineTo(L * 0.34, Wd * 0.38); ctx.closePath(); ctx.fill();
      g.rr(ctx, L * 0.2, -Wd * 0.38, L * 0.14, Wd * 0.76, 6); ctx.fillStyle = g.shade(cabC, 0.22); ctx.fill();
      mirrors(g, ctx, L * 0.36, Wd, g.shade(cabC, -0.45));
      ctx.fillStyle = '#ffb020';
      g.rr(ctx, L * 0.24, -4, L * 0.08, 8, 3); ctx.fill();
      if (st === 'box') {
        g.rr(ctx, -L / 2, -Wd / 2 - 1, L * 0.66, Wd + 2, 6); ctx.fillStyle = bodyFill(g, ctx, col, Wd); ctx.fill();
        ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = 2;
        for (let x = -L / 2 + 9; x < L * 0.15; x += 9) { ctx.beginPath(); ctx.moveTo(x, -Wd / 2 + 3); ctx.lineTo(x, Wd / 2 - 3); ctx.stroke(); }
        g.rr(ctx, -L * 0.36, -Wd * 0.17, L * 0.38, Wd * 0.34, Wd * 0.17); ctx.fillStyle = g.shade(col, 0.45); ctx.fill();
        ctx.fillStyle = g.shade(col, -0.3);
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4.5 : 10; ctx.lineTo(-L * 0.17 + Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#2b2f36'; g.rr(ctx, -L / 2 + 2, -Wd * 0.4, L * 0.66, Wd * 0.8, 6); ctx.fill();
        g.rr(ctx, -L / 2, -Wd * 0.46, L * 0.64, Wd * 0.92, Wd * 0.46);
        const tg = ctx.createLinearGradient(0, -Wd * 0.46, 0, Wd * 0.46);
        tg.addColorStop(0, '#7d8894'); tg.addColorStop(0.35, '#f3f6f8'); tg.addColorStop(0.6, '#c3ccd5'); tg.addColorStop(1, '#6a7480');
        ctx.fillStyle = tg; ctx.fill();
        ctx.strokeStyle = '#59636e'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(60,70,80,.45)'; ctx.lineWidth = 1.5;
        for (const x of [-L * 0.3, -L * 0.08]) { ctx.beginPath(); ctx.moveTo(x, -Wd * 0.44); ctx.lineTo(x, Wd * 0.44); ctx.stroke(); }
        ctx.fillStyle = col; g.rr(ctx, -L * 0.46, -3, L * 0.56, 6, 3); ctx.fill();
        for (const x of [-L * 0.38, -L * 0.19, 0]) { g.circle(ctx, x, 0, 6.5); ctx.fillStyle = '#9aa5b0'; ctx.fill(); ctx.strokeStyle = '#59636e'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      lights(g, ctx, L, Wd, o);
    } else {
      // מכוניות (באורך 2)
      wheels(g, ctx, [L * 0.29, -L * 0.29], L, Wd);
      const round = st === 'sport' || st === 'hero' ? 0.42 : st === 'van' ? 0.24 : 0.34;
      g.rr(ctx, -L / 2, -Wd / 2, L, Wd, Wd * round); ctx.fillStyle = bodyFill(g, ctx, col, Wd); ctx.fill();
      ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.stroke();
      if (st === 'sport' || st === 'hero') {
        ctx.fillStyle = st === 'hero' ? '#ffffff' : 'rgba(255,255,255,.75)';
        g.rr(ctx, -L / 2 + 6, -Wd * 0.13, L - 12, Wd * 0.08, 2); ctx.fill();
        g.rr(ctx, -L / 2 + 6, Wd * 0.05, L - 12, Wd * 0.08, 2); ctx.fill();
        cabin(g, ctx, L, Wd, col, -L * 0.26, L * 0.02, true);
        ctx.fillStyle = dk; g.rr(ctx, -L / 2 - 3, -Wd * 0.46, 8, Wd * 0.92, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(L * 0.22, -Wd * 0.3); ctx.quadraticCurveTo(L * 0.34, -Wd * 0.2, L * 0.44, -Wd * 0.24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.22, Wd * 0.3); ctx.quadraticCurveTo(L * 0.34, Wd * 0.2, L * 0.44, Wd * 0.24); ctx.stroke();
        mirrors(g, ctx, L * 0.04, Wd, dk);
      } else if (st === 'pickup') {
        cabin(g, ctx, L, Wd, col, -L * 0.02, L * 0.17, false);
        g.rr(ctx, -L * 0.47, -Wd * 0.39, L * 0.4, Wd * 0.78, 5); ctx.fillStyle = g.shade(col, -0.5); ctx.fill();
        ctx.strokeStyle = g.shade(col, -0.2); ctx.lineWidth = 2;
        for (let k = 1; k < 4; k++) { const y = -Wd * 0.39 + k * Wd * 0.78 / 4; ctx.beginPath(); ctx.moveTo(-L * 0.45, y); ctx.lineTo(-L * 0.09, y); ctx.stroke(); }
        ctx.strokeStyle = g.shade(col, 0.15); ctx.lineWidth = 3; g.rr(ctx, -L * 0.47, -Wd * 0.39, L * 0.4, Wd * 0.78, 5); ctx.stroke();
        mirrors(g, ctx, L * 0.15, Wd, dk);
      } else if (st === 'van') {
        ctx.fillStyle = glass(ctx, L * 0.26, L * 0.42);
        ctx.beginPath(); ctx.moveTo(L * 0.28, -Wd * 0.4); ctx.lineTo(L * 0.4, -Wd * 0.34); ctx.lineTo(L * 0.4, Wd * 0.34); ctx.lineTo(L * 0.28, Wd * 0.4); ctx.closePath(); ctx.fill();
        g.rr(ctx, -L * 0.46, -Wd * 0.4, L * 0.74, Wd * 0.8, 8);
        const gr = ctx.createLinearGradient(0, -Wd * 0.4, 0, Wd * 0.4);
        gr.addColorStop(0, g.shade(col, -0.05)); gr.addColorStop(0.5, g.shade(col, 0.32)); gr.addColorStop(1, g.shade(col, -0.08));
        ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(40,45,55,.5)'; ctx.lineWidth = 2.5;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.4, s * Wd * 0.28); ctx.lineTo(L * 0.2, s * Wd * 0.28); ctx.stroke(); }
        mirrors(g, ctx, L * 0.3, Wd, dk);
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L * 0.22, s * Wd * 0.2); ctx.lineTo(L * 0.44, s * Wd * 0.16); ctx.stroke(); }
        cabin(g, ctx, L, Wd, col, -L * 0.22, L * 0.08, true);
        if (st === 'taxi') {
          g.rr(ctx, -L * 0.12, -Wd * 0.16, L * 0.14, Wd * 0.32, 3); ctx.fillStyle = '#23262c'; ctx.fill();
          ctx.fillStyle = '#ffffff';
          for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) if ((a + b) % 2) ctx.fillRect(-L * 0.11 + a * L * 0.04, -Wd * 0.13 + b * Wd * 0.13, L * 0.04, Wd * 0.13);
          ctx.fillStyle = '#23262c';
          for (let x = -L * 0.44; x < L * 0.44; x += 12) { ctx.fillRect(x, -Wd / 2 + 1, 6, 3); ctx.fillRect(x + 6, Wd / 2 - 4, 6, 3); }
        }
        mirrors(g, ctx, L * 0.1, Wd, dk);
      }
      lights(g, ctx, L, Wd, o);
    }
    ctx.restore();
  }
  // יד שמראה איך גוררים (בשלבים הראשונים)
  function drawHand(g, ctx, x, y, s, down) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(s, s);
    if (down) { ctx.fillStyle = 'rgba(255,255,255,.35)'; g.circle(ctx, 0, -2, 22); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(-6, -26); ctx.arc(0, -26, 6, Math.PI, 0); ctx.lineTo(6, -4);
    ctx.lineTo(13, -6); ctx.arc(17, -4, 4.5, -Math.PI * 0.8, 0.2); ctx.lineTo(23, 0); ctx.arc(26, 2, 4, -Math.PI * 0.8, 0.2);
    ctx.lineTo(30, 6); ctx.lineTo(30, 22); ctx.quadraticCurveTo(28, 36, 12, 38); ctx.lineTo(0, 38); ctx.quadraticCurveTo(-10, 36, -16, 22);
    ctx.lineTo(-20, 8); ctx.quadraticCurveTo(-21, 2, -14, 4); ctx.lineTo(-6, 12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawIcon(g, ctx, id, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.13;
    if (id === 'restart') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.34, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      const a = -Math.PI * 0.35, ax = Math.cos(a) * s * 0.34, ay = Math.sin(a) * s * 0.34;
      ctx.beginPath(); ctx.moveTo(ax + s * 0.2, ay - s * 0.02); ctx.lineTo(ax - s * 0.04, ay - s * 0.2); ctx.lineTo(ax - s * 0.03, ay + s * 0.12); ctx.closePath(); ctx.fill();
    } else if (id === 'undo') {
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.12); ctx.lineTo(s * 0.12, -s * 0.12); ctx.arc(s * 0.12, s * 0.08, s * 0.2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-s * 0.1, s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.12); ctx.lineTo(-s * 0.14, -s * 0.32); ctx.lineTo(-s * 0.14, s * 0.08); ctx.closePath(); ctx.fill();
    } else if (id === 'hint') {
      ctx.beginPath(); ctx.arc(0, -s * 0.08, s * 0.25, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(s * 0.1, s * 0.2); ctx.lineTo(-s * 0.1, s * 0.2); ctx.closePath();
      ctx.fillStyle = '#fff7b0'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.29); ctx.lineTo(s * 0.1, s * 0.29); ctx.moveTo(-s * 0.06, s * 0.37); ctx.lineTo(s * 0.06, s * 0.37); ctx.stroke();
      ctx.lineWidth = s * 0.06;
      for (const a of [-2.4, -1.57, -0.74]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.36, -s * 0.08 + Math.sin(a) * s * 0.36); ctx.lineTo(Math.cos(a) * s * 0.46, -s * 0.08 + Math.sin(a) * s * 0.46); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawButton(g, ctx, S, b, dim) {
    const hot = S.hoverBtn === b.id, down = S.press === b.id && S.pressT > 0, dy = down ? 4 : 0;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.5;
    g.rr(ctx, b.x, b.y + 6, b.w, b.h, 22); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
    g.rr(ctx, b.x, b.y + dy, b.w, b.h, 22);
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, hot ? '#ffe680' : '#ffd84a'); gr.addColorStop(1, hot ? '#f7b733' : '#e8a317');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#7a5208'; ctx.lineWidth = 3; ctx.stroke();
    drawIcon(g, ctx, b.id, b.x + b.w / 2, b.y + b.h / 2 + dy - (g.touch ? 0 : 6), b.w * 0.6, '#3d2a05');
    if (!g.touch) g.text(ctx, b.key, b.x + b.w / 2, b.y + b.h - 13 + dy, { size: 15, weight: 800, color: '#6b4706' });
    ctx.restore();
  }
  function drawScene(g, ctx, S, alpha) {
    drawStatic(g, ctx, S);
    const C = S.c, t = S.t;
    // הרכבים, והמכונית האדומה מעל כולם כשהיא יוצאת
    const order = S.cars.map((c, i) => i).sort((a, b) => (S.drag && S.drag.i === a ? 1 : 0) - (S.drag && S.drag.i === b ? 1 : 0) || (a === 0 ? 1 : 0) - (b === 0 ? 1 : 0));
    const hintI = S.hint ? S.hint.i : -1;
    // רמז: מסגרת מקווקוות במקום שאליו צריך להזיז, וחץ
    if (S.hint && !S.won) {
      const h = S.hint, r = carRect(S, h.i, h.to), p = 0.55 + 0.45 * Math.sin(h.t * 0.15);
      ctx.save();
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -h.t * 0.6;
      ctx.strokeStyle = 'rgba(255,230,90,' + (0.5 + p * 0.5).toFixed(3) + ')'; ctx.lineWidth = 4;
      g.rr(ctx, r.x + 5, r.y + 5, r.w - 10, r.h - 10, 16); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,230,90,.12)'; g.rr(ctx, r.x + 5, r.y + 5, r.w - 10, r.h - 10, 16); ctx.fill();
    }
    for (const i of order) {
      const c = S.cars[i];
      let f = i === 0 && S.won ? GOAL + S.out : S.drag && S.drag.i === i ? c.f : g.lerp(c.pf, c.f, alpha);
      if (S.wig[i] > 0) f += Math.sin(t * 1.3) * S.wig[i] * 0.04 * (S.wigD[i] ? 1 : 0);
      const r = carRect(S, i, f);
      if (r.x > g.W + 10) continue;
      const dragging = S.drag && S.drag.i === i;
      let glow = 0, glowCol = '#ffffff';
      if (i === hintI) { glow = 0.6 + 0.4 * Math.sin(S.hint.t * 0.15); glowCol = '#ffe45a'; }
      else if (S.kbd && S.sel === i && !S.won) { glow = 0.9; glowCol = '#7fe0ff'; }
      else if (S.hover === i && !S.drag && !S.won) { glow = 0.45; }
      if (i === 0 && !S.won && !glow) { glow = 0.25 + 0.15 * Math.sin(t * 0.06); glowCol = '#ff8a8a'; }
      paintVehicle(g, ctx, c, r.x + r.w / 2, r.y + r.h / 2, C, { lift: dragging ? 1 : 0, glow, glowCol, blink: S.blink[i] > 0 && (S.blink[i] % 30) < 15 });
    }
    drawGate(g, ctx, S);
    // חץ הרמז
    if (S.hint && !S.won) {
      const h = S.hint, c = S.cars[h.i], a = carRect(S, h.i), b = carRect(S, h.i, h.to);
      const dir = Math.sign(h.to - c.f) || 1, k = (h.t % 50) / 50;
      const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = b.x + b.w / 2, y2 = b.y + b.h / 2;
      const ax = c.hz ? x1 + (x2 - x1) * (0.3 + 0.4 * k) : x1, ay = c.hz ? y1 : y1 + (y2 - y1) * (0.3 + 0.4 * k);
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(c.hz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(4, -9); ctx.lineTo(4, -20); ctx.lineTo(26, 0); ctx.lineTo(4, 20); ctx.lineTo(4, 9); ctx.lineTo(-18, 9); ctx.closePath();
      ctx.fillStyle = '#ffe45a'; ctx.fill(); ctx.strokeStyle = '#5a4300'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    // צללי עננים חולפים
    for (const cl of S.clouds) {
      const gr = ctx.createRadialGradient(cl.x, cl.y, 10, cl.x, cl.y, cl.r);
      gr.addColorStop(0, 'rgba(10,20,40,.07)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.r, cl.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawTutorial(g, ctx, S) {
    if (S.won || g.level > 2 || g.demo) return;
    const clear = pathClear(S);
    const msg = g.t(clear ? 'tut2' : 'tut1');
    const bn = S.banner;
    ctx.save();
    ctx.font = '800 21px Heebo, Arial, sans-serif';
    const w = Math.min(bn.w, ctx.measureText(msg).width + 48);
    ctx.restore();
    g.rr(ctx, bn.x - w / 2, bn.y - 21, w, 42, 21); ctx.fillStyle = 'rgba(12,22,34,.82)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,216,74,.8)'; ctx.lineWidth = 2; ctx.stroke();
    g.text(ctx, msg, bn.x, bn.y + 1, { size: 21, weight: 800, color: '#ffffff', maxW: w - 30 });
    if (S.drag || S.botDrag) return;
    const m = bestMove(S);
    if (!m) return;
    const c = S.cars[m.i], a = carRect(S, m.i, c.pos), b = carRect(S, m.i, m.to);
    const k = (S.t % 110) / 110, mv = g.ease.inOut(g.clamp((k - 0.2) / 0.55, 0, 1));
    const x = g.lerp(a.x + a.w / 2, b.x + b.w / 2, mv), y = g.lerp(a.y + a.h / 2, b.y + b.h / 2, mv);
    ctx.save();
    ctx.globalAlpha = k < 0.1 ? k / 0.1 : k > 0.88 ? (1 - k) / 0.12 : 1;
    drawHand(g, ctx, x + 6, y + 10, 1.1, k > 0.15 && k < 0.8);
    ctx.restore();
  }

  const T = {
    he: { title: 'פקק תנועה', help: ['הוצא את המכונית האדומה דרך השער מימין', 'גרור רכבים כדי לפנות לה דרך (רק קדימה ואחורה)', 'פחות מהלכים = יותר כוכבים. 💡 רמז: עד 2 כוכבים', 'מקלדת: Tab בוחר רכב, חצים מזיזים. Z מבטל, H רמז'], helpTouch: ['הוצא את המכונית האדומה דרך השער מימין', 'גרור רכבים באצבע כדי לפנות לה דרך', 'פחות מהלכים = יותר כוכבים. 💡 רמז: עד 2 כוכבים'], goal: 'יעד', result: 'מהלכים: {n} · הכי מעט שאפשר: {p}', resultHint: 'מהלכים: {n} · הכי מעט שאפשר: {p} · עם רמז אפשר עד 2 כוכבים', perfect: 'מושלם!', tut1: 'גרור רכבים כדי לפנות דרך למכונית האדומה', tut2: 'הדרך פנויה! גרור את המכונית האדומה החוצה' },
    en: { title: 'Traffic Jam', help: ['Get the red car out through the gate on the right', 'Drag vehicles out of its way (only forward and back)', 'Fewer moves = more stars. 💡 hint: 2 stars at most', 'Keys: Tab picks, arrows move. Z undo, H hint'], helpTouch: ['Get the red car out through the gate on the right', 'Drag vehicles with your finger to clear its way', 'Fewer moves = more stars. 💡 hint: 2 stars at most'], goal: 'Target', result: 'Moves: {n} · Fewest possible: {p}', resultHint: 'Moves: {n} · Fewest possible: {p} · With a hint you can get up to 2 stars', perfect: 'Perfect!', tut1: 'Drag the vehicles to clear a way for the red car', tut2: 'The way is clear! Drag the red car out' },
    ar: { title: 'زحمة سير', help: ['أخرِج السيارة الحمراء عبر البوابة على اليمين', 'اسحب المركبات لتفسح لها الطريق (للأمام وللخلف فقط)', 'حركات أقل = نجوم أكثر. 💡 التلميح: نجمتان كحد أقصى', 'المفاتيح: Tab يختار، الأسهم تحرك. Z تراجع، H تلميح'], helpTouch: ['أخرِج السيارة الحمراء عبر البوابة على اليمين', 'اسحب المركبات بإصبعك لتفسح لها الطريق', 'حركات أقل = نجوم أكثر. 💡 التلميح: نجمتان كحد أقصى'], goal: 'الهدف', result: 'الحركات: {n} · أقل عدد ممكن: {p}', resultHint: 'الحركات: {n} · أقل عدد ممكن: {p} · مع التلميح حتى نجمتين', perfect: 'ممتاز!', tut1: 'اسحب المركبات لتفسح الطريق للسيارة الحمراء', tut2: 'الطريق مفتوح! اسحب السيارة الحمراء إلى الخارج' },
    es: { title: 'Atasco', help: ['Saca el coche rojo por la barrera de la derecha', 'Arrastra los vehículos para abrirle paso', 'Menos movimientos = más estrellas. 💡 pista: máx. 2', 'Teclas: Tab elige, flechas mueven. Z deshace, H pista'], helpTouch: ['Saca el coche rojo por la barrera de la derecha', 'Arrastra los vehículos con el dedo para abrirle paso', 'Menos movimientos = más estrellas. 💡 pista: máx. 2'], goal: 'Meta', result: 'Movimientos: {n} · Lo mínimo posible: {p}', resultHint: 'Movimientos: {n} · Lo mínimo posible: {p} · Con pista, hasta 2 estrellas', perfect: '¡Perfecto!', tut1: 'Arrastra los vehículos para abrirle paso al coche rojo', tut2: '¡Camino libre! Arrastra el coche rojo hacia fuera' },
    fr: { title: 'Embouteillage', help: ['Fais sortir la voiture rouge par la barrière à droite', 'Fais glisser les véhicules pour lui ouvrir la route', 'Moins de coups = plus d’étoiles. 💡 indice : 2 max', 'Clavier : Tab choisit, flèches déplacent. Z annule, H indice'], helpTouch: ['Fais sortir la voiture rouge par la barrière à droite', 'Glisse les véhicules du doigt pour lui ouvrir la route', 'Moins de coups = plus d’étoiles. 💡 indice : 2 max'], goal: 'Objectif', result: 'Coups : {n} · Le minimum possible : {p}', resultHint: 'Coups : {n} · Le minimum possible : {p} · Avec un indice, 2 étoiles max', perfect: 'Parfait !', tut1: 'Fais glisser les véhicules pour libérer la voiture rouge', tut2: 'La route est libre ! Fais sortir la voiture rouge' },
    pt: { title: 'Engarrafamento', help: ['Tire o carro vermelho pela cancela da direita', 'Arraste os veículos para abrir caminho', 'Menos jogadas = mais estrelas. 💡 dica: até 2', 'Teclado: Tab escolhe, setas movem. Z desfaz, H dica'], helpTouch: ['Tire o carro vermelho pela cancela da direita', 'Arraste os veículos com o dedo para abrir caminho', 'Menos jogadas = mais estrelas. 💡 dica: até 2'], goal: 'Meta', result: 'Jogadas: {n} · O mínimo possível: {p}', resultHint: 'Jogadas: {n} · O mínimo possível: {p} · Com dica, até 2 estrelas', perfect: 'Perfeito!', tut1: 'Arraste os veículos para abrir caminho para o carro vermelho', tut2: 'Caminho livre! Arraste o carro vermelho para fora' },
    ru: { title: 'Пробка', help: ['Выведи красную машину через шлагбаум справа', 'Двигай машины, чтобы освободить ей путь', 'Меньше ходов — больше звёзд. 💡 подсказка: до 2', 'Tab — выбор, стрелки — ход. Z — отмена, H — подсказка'], helpTouch: ['Выведи красную машину через шлагбаум справа', 'Двигай машины пальцем, чтобы освободить ей путь', 'Меньше ходов — больше звёзд. 💡 подсказка: до 2'], goal: 'Цель', result: 'Ходов: {n} · Меньше всего можно: {p}', resultHint: 'Ходов: {n} · Меньше всего можно: {p} · С подсказкой — до 2 звёзд', perfect: 'Идеально!', tut1: 'Перетаскивай машины, чтобы освободить путь красной', tut2: 'Путь свободен! Выведи красную машину' },
    de: { title: 'Verkehrsstau', help: ['Bring das rote Auto durch die Schranke rechts hinaus', 'Schiebe die Fahrzeuge aus dem Weg (nur vor und zurück)', 'Weniger Züge = mehr Sterne. 💡 Tipp: höchstens 2', 'Tasten: Tab wählt, Pfeile bewegen. Z zurück, H Tipp'], helpTouch: ['Bring das rote Auto durch die Schranke rechts hinaus', 'Schiebe die Fahrzeuge mit dem Finger aus dem Weg', 'Weniger Züge = mehr Sterne. 💡 Tipp: höchstens 2'], goal: 'Ziel', result: 'Züge: {n} · Am wenigsten möglich: {p}', resultHint: 'Züge: {n} · Am wenigsten möglich: {p} · Mit Tipp höchstens 2 Sterne', perfect: 'Perfekt!', tut1: 'Ziehe die Fahrzeuge weg, damit das rote Auto rauskommt', tut2: 'Der Weg ist frei! Zieh das rote Auto hinaus' },
  };

  const KEYDIR = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  let demoL = null;
  GK.register('traffic-jam', {
    get w() { return portrait() ? 640 : 960; },
    get h() { return portrait() ? 900 : 640; },
    bg: '#4e9a3e', accent: '#ffd84a',
    levels: LV.length,
    text: T,

    init(g) {
      if (g.demo) {
        if (!demoL) demoL = parse(Math.min(LV.length, 14));
        g.s = makeState(g, demoL);
        return;
      }
      g.s = makeState(g, parse(g.level));
      hud(g);
    },

    step(g) {
      const S = g.s;
      animate(g, S);
      if (!S.won) advance(solveJob(S.L), 800);      // הפותר מוכן לרמז בלי לעצור את המשחק
      if (S.won && S.winT === 48 && !g.demo) g.completeLevel(S.stars, { text: g.t(S.hints ? 'resultHint' : 'result', { n: S.moves, p: S.L.opt }), delay: 400 });
      hud(g);
    },
    idle(g) { if (g.s) animate(g, g.s); },

    // בוט לבדיקות: לוקח את המהלך הבא מהפותר וגורר את הרכב דרך אותן פונקציות גרירה של השחקן
    bot(g) {
      const S = g.s;
      if (S.won) return;
      if (S.botDrag) {
        const b = S.botDrag;
        b.k++;
        const u = g.ease.inOut(Math.min(1, b.k / b.n));
        dragTo(g, g.lerp(b.x0, b.x1, u), g.lerp(b.y0, b.y1, u));
        if (b.k >= b.n && S.drag) endDrag(g);
        if (b.k >= b.n) S.botDrag = null;
        return;
      }
      if (S.drag || S.cars.some(c => c.f !== c.pos)) return;
      const m = bestMove(S);
      if (!m) return;
      const c = S.cars[m.i], r = carRect(S, m.i), x0 = r.x + r.w / 2, y0 = r.y + r.h / 2, dd = (m.to - c.pos) * S.c;
      beginDrag(g, m.i, x0, y0, 'bot');
      S.botDrag = { k: 0, n: 8 + Math.abs(m.to - c.pos) * 3, x0, y0, x1: x0 + (c.hz ? dd : 0), y1: y0 + (c.hz ? 0 : dd) };
    },

    onKey(g, e) {
      const S = g.s, c = e.code;
      if (S.won) return;
      if (c === 'Tab') {
        e.preventDefault();
        if (S.drag) return;
        S.kbd = true; S.hint = S.hint && S.hint.i === S.sel ? S.hint : S.hint;
        const n = S.cars.length;
        S.sel = (S.sel + (e.shiftKey ? n - 1 : 1)) % n;
        g.sfx('tick');
        return;
      }
      const d = KEYDIR[c];
      if (d) {
        if (S.drag) return;
        S.kbd = true;
        const car = S.cars[S.sel];
        const along = car.hz ? d[0] : d[1];
        if (!along) { g.tone({ f: 200, f2: 160, dur: 0.06, type: 'triangle', vol: 0.08 }); return; }
        stepCar(g, S.sel, along);
        return;
      }
      if (e.repeat) return;
      if (c === 'KeyZ' || c === 'Backspace' || c === 'KeyU') press(g, 'undo');
      else if (c === 'KeyR') press(g, 'restart');
      else if (c === 'KeyH') press(g, 'hint');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        if (S.drag && S.drag.id === p.id) { dragTo(g, p.x, p.y); g.canvas.style.cursor = 'grabbing'; return; }
        const b = btnAt(S, p.x, p.y);
        S.hoverBtn = b && p.kind !== 'touch' ? b.id : null;
        S.hover = !b && p.kind !== 'touch' && !S.won ? carAt(S, p.x, p.y, 0) : -1;
        g.canvas.style.cursor = b ? 'pointer' : S.hover >= 0 ? 'grab' : 'default';
        return;
      }
      if (type === 'down') {
        const b = btnAt(S, p.x, p.y);
        if (b) { press(g, b.id); return; }
        if (S.won || S.drag || S.botDrag) return;
        const i = carAt(S, p.x, p.y, p.kind === 'touch' ? 10 : 2);
        if (i < 0) return;
        S.kbd = false;
        beginDrag(g, i, p.x, p.y, p.id);
        g.canvas.style.cursor = 'grabbing';
        return;
      }
      if (type === 'up' && S.drag && S.drag.id === p.id) {
        dragTo(g, p.x, p.y);
        endDrag(g);
        g.canvas.style.cursor = 'grab';
      }
    },
    onPause(g) { if (g.s && g.s.drag) endDrag(g); },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S) return;
      drawScene(g, ctx, S, g.state === 'play' || g.state === 'over' ? alpha : 1);
      if (!g.demo) {
        for (const b of S.btns) drawButton(g, ctx, S, b, b.id === 'undo' && !S.hist.length);
        drawTutorial(g, ctx, S);
      }
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const L = parseBoard('BBBCDEFFoCDEooooAAGHIIJKGHLLJKGMMNNK', 1, 3);
      const S = makeState({ W: w, H: h }, L);
      S.c = 74; S.ox = 120; S.oy = Math.round((h - 6 * S.c) / 2) + 4;
      S.btns = []; S.banner = { x: -999, y: -999, w: 0 };
      S.gate = 1; S.won = true; S.out = 1.15;
      paintStatic(k, ctx, S, w, h);
      for (let i = 1; i < S.cars.length; i++) { const r = carRect(S, i); paintVehicle(k, ctx, S.cars[i], r.x + r.w / 2, r.y + r.h / 2, S.c, { blink: i === 4 }); }
      const r = carRect(S, 0);
      // קווי מהירות ועשן מאחורי המכונית האדומה
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const y = r.y + r.h * (0.3 + i * 0.2); ctx.beginPath(); ctx.moveTo(r.x - 12 - i * 8, y); ctx.lineTo(r.x - 60 - i * 14, y); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(230,234,238,' + (0.7 - i * 0.15) + ')'; k.circle(ctx, r.x - 18 - i * 22, r.y + r.h * 0.62 + (i % 2) * 6, 9 + i * 4); ctx.fill(); }
      paintVehicle(k, ctx, S.cars[0], r.x + r.w / 2, r.y + r.h / 2, S.c, { glow: 0.8, glowCol: '#ffe45a' });
      drawGate(k, ctx, S);
      for (const [x, y, c2] of [[r.x + r.w + 40, r.y - 20, '#ffd84d'], [r.x + r.w + 70, r.y + r.h + 10, '#ff5d8f'], [r.x + r.w + 20, r.y + r.h + 30, '#4fb8ff'], [r.x + r.w + 95, r.y + 30, '#7cf0a0']]) { ctx.fillStyle = c2; ctx.save(); ctx.translate(x, y); ctx.rotate(x * 0.1); ctx.fillRect(-6, -4, 12, 8); ctx.restore(); }
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { LV, parse, parseBoard, solver, solveJob, bestMove, stars3, stars2 },
  });
})();
