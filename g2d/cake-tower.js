// ============================================================
//  מגדל העוגה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שכבת עוגה נעה מעל המגדל; רווח, ↓, קליק או הקשה מפילים אותה. מה שבולט מעבר
//  למגדל נחתך ונופל. נחיתה מושלמת (כמה פיקסלים) מצלצלת ומגדילה קצת את השכבה.
//  כל 10 שכבות — קישוט חדש והשכבות זזות מהר יותר. המצלמה עולה עם המגדל
//  (מעל הגגות, דרך העננים והשקיעה ועד החלל), ובסוף מתרחקת כדי להראות את כולו.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600, CX = W / 2;
  const LH = 34;                  // גובה שכבה
  const RY = 7;                   // חצי הגובה של פני השכבה (מבט קצת מלמעלה)
  const PLATE = -60;              // פני הצלחת של המעמד (משטח השיש בגובה 0)
  const PR = 172;                 // חצי רוחב הצלחת
  const GAP = 54;                 // השכבה הנעה מרחפת כך מעל המגדל
  const TOPY = 400;               // איפה ראש המגדל על המסך
  const CAM0 = PLATE - LH - TOPY; // המצלמה בהתחלה
  const CM = 5;                   // סנטימטרים לשכבה (לטקסט הסיום)
  // לפי רמת הקושי: רוחב, מהירות התחלה, תוספת לכל 10 שכבות, מקסימום, סבולת "מושלם" (פיקסלים), כמה גדלה שכבה מושלמת
  const DIFF = [
    { w: 280, v0: 2.9, dv: 0.42, vmax: 6.4, tol: 7, grow: 12 },
    { w: 260, v0: 3.8, dv: 0.52, vmax: 7.8, tol: 5, grow: 10 },
    { w: 240, v0: 4.8, dv: 0.62, vmax: 9.4, tol: 4, grow: 8 },
  ];
  const SPR = ['#ff5d8f', '#ffd166', '#5ad1ff', '#7be07b', '#b48cff', '#ff9f43'];
  // כל 10 שכבות סגנון חדש (ואז מתחילים שוב): צבעי הספוג, המילוי, הציפוי והקישוט
  const TIERS = [
    { deco: 'cream', sponge: '#f2c98a', spongeL: '#fbe3b6', spongeD: '#c48d4a', fill: '#fff6e0', frost: '#fffaf3', frostD: '#dccab4', band: 6, drip: [3, 9] },
    { deco: 'cherry', sponge: '#f6a3bb', spongeL: '#ffd3df', spongeD: '#cc6688', fill: '#fff2f6', frost: '#ff86ab', frostD: '#d4557f', band: 6, drip: [4, 10] },
    { deco: 'sprinkle', sponge: '#8b5634', spongeL: '#b98559', spongeD: '#5a3218', fill: '#f8e6cf', frost: '#5c321b', frostD: '#371b0c', band: 7, drip: [4, 11] },
    { deco: 'chip', sponge: '#9fe3c6', spongeL: '#d2f7e7', spongeD: '#5bb38f', fill: '#ffffff', frost: '#5b3820', frostD: '#341d0e', band: 6, drip: [7, 17] },
    { deco: 'berry', sponge: '#ffdc80', spongeL: '#fff1c4', spongeD: '#d4a23d', fill: '#c2acff', frost: '#f7f3ff', frostD: '#cfc5ee', band: 6, drip: [3, 10] },
    { deco: 'star', sponge: '#c4a3ff', spongeL: '#e7d9ff', spongeD: '#8a62d8', fill: '#fff7d6', frost: '#ffd54d', frostD: '#d29e0e', band: 6, drip: [4, 11] },
  ];
  const U = GK.U, clamp = U.clamp, lerp = U.lerp;
  for (const T of TIERS) T.top = U.shade(T.frost, 0.22);
  const tierOf = n => (n <= 0 ? 0 : Math.floor((n - 1) / 10));
  const styleOf = n => TIERS[tierOf(n) % TIERS.length];
  const topOf = i => PLATE - LH * (i + 1);            // y של ראש שכבה i (0 = שכבת הבסיס)
  const speedOf = (D, n) => Math.min(D.vmax, D.v0 + D.dv * tierOf(n) + 0.03 * ((n - 1) % 10));
  const arcY = (ox, hw, ry) => { const u = ox / hw; return u >= 1 || u <= -1 ? 0 : Math.sqrt(1 - u * u) * ry; };
  const SPEC = {};

  // ----- קישוטים: נוצרים פעם אחת לכל שכבה, במרחק מהמרכז שלה (כך הם נשארים במקום כשחותכים) -----
  function makeDeco(n, w) {
    const T = styleOf(n), r = U.seeded(n * 9973 + 17), hw = w / 2;
    const top = [], side = [], drips = [];
    for (let x = -hw + 8 + r() * 12; x < hw - 6; x += 15 + r() * 17) drips.push({ ox: x, len: T.drip[0] + r() * (T.drip[1] - T.drip[0]), wd: 5 + r() * 4 });
    const k = T.deco, col = () => SPR[(r() * SPR.length) | 0];
    if (k === 'cream') {
      for (let x = -hw + 12; x < hw - 9; x += 24) top.push({ k: 'dollop', ox: x + (r() - 0.5) * 4, v: -0.8, s: 6 + r() * 1.5 });
      for (let x = -hw + 24; x < hw - 9; x += 24) top.push({ k: 'dollop', ox: x + (r() - 0.5) * 4, v: 0.72, s: 6.5 + r() * 1.5 });
    } else if (k === 'cherry') {
      const c = Math.max(2, Math.round(w / 62));
      for (let i = 0; i < c; i++) top.push({ k: 'cherry', ox: -hw + (i + 0.5) * w / c + (r() - 0.5) * 12, v: (r() - 0.5) * 1.1, s: 6.5, r: r() - 0.5 });
    } else if (k === 'sprinkle') {
      for (let i = 0; i < w / 5; i++) side.push({ k: 'spr', ox: -hw + 5 + r() * (w - 10), v: r(), c: col(), r: r() * Math.PI });
      for (let i = 0; i < w / 8; i++) top.push({ k: 'spr', ox: -hw + 7 + r() * (w - 14), v: r() * 1.8 - 0.9, c: col(), r: r() * Math.PI });
    } else if (k === 'chip') {
      for (let i = 0; i < w / 15; i++) top.push({ k: 'chip', ox: -hw + 8 + r() * (w - 16), v: r() * 1.8 - 0.9, s: 3 + r() * 1.5 });
    } else if (k === 'berry') {
      for (let i = 0; i < w / 19; i++) top.push({ k: 'berry', ox: -hw + 8 + r() * (w - 16), v: r() * 1.8 - 0.9, s: 3.8 + r() * 1.2 });
    } else {
      for (let i = 0; i < w / 24; i++) side.push({ k: 'star', ox: -hw + 9 + r() * (w - 18), v: r(), s: 4 + r() * 1.6, r: r() * 1.2 });
      for (let i = 0; i < w / 13; i++) top.push({ k: 'pearl', ox: -hw + 7 + r() * (w - 14), v: r() * 1.8 - 0.9, s: 2.2 + r() * 1.1 });
    }
    top.sort((a, b) => a.v - b.v);
    return { top, side, drips };
  }
  function newLayer(n, x, w) { const d = makeDeco(n, w); return { x, w, gw: w, n, top: d.top, side: d.side, drips: d.drips, sq: 0 }; }
  // חלוקת קישוטים בין החלק שנשאר לחלק שנחתך
  function split(arr, sx, kL, kR, kX, pL, pR, pX) {
    const keep = [], piece = [];
    for (const it of arr) {
      const ax = sx + it.ox;
      if (ax > kL + 1.5 && ax < kR - 1.5) keep.push(Object.assign({}, it, { ox: ax - kX }));
      else if (ax > pL + 1.5 && ax < pR - 1.5) piece.push(Object.assign({}, it, { ox: ax - pX }));
    }
    return [keep, piece];
  }

  // ----- מצב המשחק -----
  function makeState(g) {
    const D = DIFF[g.diff] || DIFF[0];
    const S = {
      D, layers: [newLayer(0, CX, D.w)], slider: null, pieces: [], phase: 'slide',
      cam: CAM0, pcam: CAM0, zoom: 1, pzoom: 1, zc: CAM0 + H / 2, pzc: CAM0 + H / 2, zoomTo: null,
      combo: 0, best: g.getBest(), passed: false, press: false, drops: 0, t: 0, missT: 0,
      banner: null, ring: null, pulse: 0, aim: null, quiet: false,
    };
    spawn(S);
    return S;
  }
  function spawn(S) {
    const top = S.layers[S.layers.length - 1], n = S.layers.length, w = top.gw;
    const side = n % 2 ? -1 : 1, A = w + 34;
    const L = newLayer(n, top.x + side * A, w);
    L.vx = -side * speedOf(S.D, n); L.min = top.x - A; L.max = top.x + A;
    L.y = L.py = topOf(n) - GAP; L.px = L.x; L.vy = 0;
    S.slider = L; S.phase = 'slide'; S.aim = null;
  }
  function slide(S) {
    const L = S.slider;
    L.px = L.x; L.py = L.y;
    L.x += L.vx;
    if (L.x > L.max) { L.x = 2 * L.max - L.x; L.vx = -Math.abs(L.vx); }
    else if (L.x < L.min) { L.x = 2 * L.min - L.x; L.vx = Math.abs(L.vx); }
  }
  function startFall(g, S) {
    S.phase = 'fall'; S.slider.vy = 2.5; S.drops++;
    g.noise({ filter: 'bandpass', f: 650, f2: 1900, dur: 0.11, vol: 0.06, q: 1.2 });
  }
  function fall(g, S) {
    const L = S.slider;
    L.px = L.x; L.py = L.y;
    L.vy += 1.6; L.y += L.vy;
    const land = topOf(S.layers.length);
    if (L.y >= land) { L.y = land; landIt(g, S); }
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function landIt(g, S) {
    const D = S.D, sl = S.slider, top = S.layers[S.layers.length - 1];
    top.w = top.gw;                                     // שכבה שעוד גדלה — מסיימים את הגדילה
    const yT = topOf(S.layers.length), sy = yT - S.cam;
    const d = sl.x - top.x, T = styleOf(sl.n);
    let L;
    if (Math.abs(d) <= D.tol) {
      // מושלם: נצמדת בדיוק, מצלצלת וגדלה קצת
      S.combo++;
      L = { x: top.x, w: sl.w, gw: Math.min(D.w, sl.w + D.grow), n: sl.n, top: sl.top, side: sl.side, drips: sl.drips, sq: 1 };
      S.layers.push(L);
      S.ring = { x: L.x, y: yT, w: L.gw, t: 0 };
      if (!S.quiet) {
        const f = 587 * Math.pow(2, PENTA[Math.min(S.combo - 1, PENTA.length - 1)] / 12);
        g.tone({ f, dur: 0.34, type: 'triangle', vol: 0.17 });
        g.tone({ f: f * 2, dur: 0.22, vol: 0.06, delay: 0.035 });
        g.tone({ f: f * 1.5, dur: 0.18, vol: 0.05, delay: 0.07 });
        for (const sx of [L.x - L.gw / 2, L.x + L.gw / 2]) g.burst(sx, sy, { n: 9, color: ['#ffffff', '#fff3a8', '#ffd166'], speed: 3, life: 26, size: 4, gravity: 0 });
        if (!g.demo) g.float(L.x, sy - 26, S.combo > 1 ? g.t('combo', { n: S.combo }) : g.t('perfect'), { color: '#fff3a8', size: 26 });
      }
    } else {
      const tl = top.x - top.w / 2, tr = top.x + top.w / 2, sL = sl.x - sl.w / 2, sR = sl.x + sl.w / 2;
      const l = Math.max(sL, tl), r = Math.min(sR, tr);
      if (r - l < 4) { miss(g, S); return; }
      S.combo = 0;
      const kx = (l + r) / 2, side = d > 0 ? 1 : -1;
      const pl = side > 0 ? r : sL, pr = side > 0 ? sR : l, px = (pl + pr) / 2;
      const [kt, pt] = split(sl.top, sl.x, l, r, kx, pl, pr, px);
      const [ks, ps] = split(sl.side, sl.x, l, r, kx, pl, pr, px);
      const [kd, pd] = split(sl.drips, sl.x, l, r, kx, pl, pr, px);
      L = { x: kx, w: r - l, gw: r - l, n: sl.n, top: kt, side: ks, drips: kd, sq: 1 };
      S.layers.push(L);
      S.pieces.push({ x: px, y: yT + LH / 2, px, py: yT + LH / 2, w: pr - pl, n: sl.n, top: pt, side: ps, drips: pd, a: 0, va: side * (0.025 + Math.random() * 0.03), vx: side * (1 + Math.random() * 0.9), vy: -0.6, rest: 0 });
      if (!S.quiet) {
        const cx = side > 0 ? r : l;
        g.burst(cx, sy + LH / 2, { n: 14, color: [T.sponge, T.spongeL, T.frost], speed: 2.6, life: 34, size: 4.5, gravity: 0.22, spread: Math.PI * 0.8, dir: -Math.PI / 2 + side * 0.7, shape: 'square' });
        g.noise({ filter: 'highpass', f: 5200, f2: 1900, dur: 0.09, vol: 0.1 });
        if (r - l < 16 && !g.demo) g.float(kx, sy - 24, g.t('phew'), { color: '#ffffff', size: 22 });
      }
    }
    g.score = S.layers.length - 1;
    S.pulse = 10;
    if (!S.quiet) {
      g.sfx('place', { p: 0.95 + Math.random() * 0.12 });
      g.noise({ f: 420, f2: 110, dur: 0.1, vol: 0.14 });
      // שכבה חדשה של קישוטים כל 10 שכבות — והמהירות עולה
      if (g.score % 10 === 0) {
        S.banner = { tier: g.score / 10, t: 0 };
        g.sfx('power');
        g.burst(CX, 150, { n: 50, color: SPR, speed: 6, life: 70, size: 6, gravity: 0.12, shape: 'square' });
        g.flash('#ffffff', 0.15);
      }
      if (!g.demo && S.best && g.score === S.best + 1) {
        g.sfx('coin', { p: 1.2 });
        g.float(CX, sy - 64, g.t('newRec'), { color: '#ffd166', size: 30, life: 80 });
      }
    }
    spawn(S);
  }
  function miss(g, S) {
    const sl = S.slider, top = S.layers[S.layers.length - 1], side = sl.x >= top.x ? 1 : -1;
    S.pieces.push({ x: sl.x, y: sl.y + LH / 2, px: sl.x, py: sl.y + LH / 2, w: sl.w, n: sl.n, top: sl.top, side: sl.side, drips: sl.drips, a: 0, va: side * 0.045, vx: side * 2.4, vy: 1, rest: 0 });
    S.slider = null; S.phase = 'miss'; S.missT = 0; S.combo = 0;
    if (!S.quiet) { g.sfx('whoosh'); g.shake(5); }
  }
  function missStep(g, S) {
    S.missT++;
    if (S.missT === 30) {
      // המצלמה מתרחקת ומראה את כל המגדל
      const top = topOf(S.layers.length - 1) - 70, bot = 90;
      S.zoomTo = { z: Math.min(1, (H - 140) / (bot - top)), c: (top + bot) / 2 };
    }
    if (S.missT === 78) g.end({ score: g.score, title: g.t('missTitle'), scoreLabel: g.t('height'), text: g.t('tall', { n: (g.score + 1) * CM }), delay: 500 });
  }

  // ----- פיזיקה של חתיכות שנחתכו: נופלות, מסתובבות, מקפצות על הצלחת והשיש -----
  function stepPieces(g, S, sound) {
    for (let i = S.pieces.length - 1; i >= 0; i--) {
      const p = S.pieces[i];
      p.px = p.x; p.py = p.y;
      if (p.rest > 60) continue;
      p.vy = Math.min(p.vy + 0.55, 17); p.x += p.vx; p.y += p.vy; p.a += p.va;
      const ext = Math.abs(p.w / 2 * Math.sin(p.a)) + Math.abs((LH / 2 + RY) * Math.cos(p.a));
      const onPlate = Math.abs(p.x - CX) < PR - 8 && p.y < PLATE + 4;
      const floor = onPlate ? PLATE : 0;
      if (p.y + ext >= floor) {
        p.y = floor - ext;
        if (p.vy > 3) {
          if (sound && !S.quiet) { const sy = (floor - S.zc) * S.zoom + H / 2; if (sy > -20 && sy < H + 20) g.tone({ f: 160, f2: 80, dur: 0.09, vol: 0.06 }); }
          p.vy *= -0.3; p.va *= 0.5;
        } else p.vy = 0;
        if (onPlate) p.vx += (p.x >= CX ? 1 : -1) * 0.35; else p.vx *= 0.8;
        const tgt = Math.round(p.a / Math.PI) * Math.PI;
        p.a += (tgt - p.a) * 0.2; p.va *= 0.7;
        if (!onPlate && Math.abs(p.vy) < 0.6 && Math.abs(p.vx) < 0.2) p.rest++;
      }
      if (p.x < -900 || p.x > W + 900) S.pieces.splice(i, 1);
    }
    if (S.pieces.length > 40) S.pieces.splice(0, S.pieces.length - 40);
  }
  function stepCam(S) {
    S.pcam = S.cam; S.pzoom = S.zoom; S.pzc = S.zc;
    const tgt = Math.min(CAM0, topOf(S.layers.length - 1) - TOPY);
    S.cam += (tgt - S.cam) * 0.1;
    if (S.zoomTo) { S.zoom += (S.zoomTo.z - S.zoom) * 0.08; S.zc += (S.zoomTo.c - S.zc) * 0.08; }
    else S.zc = S.cam + H / 2;
  }
  function stepLayers(S) {
    const n = S.layers.length;
    for (let i = Math.max(0, n - 3); i < n; i++) {
      const L = S.layers[i];
      L.sq = L.sq > 0.02 ? L.sq * 0.8 : 0;
      if (L.w !== L.gw) { L.w += (L.gw - L.w) * 0.2; if (Math.abs(L.gw - L.w) < 0.3) L.w = L.gw; }
    }
    if (S.banner && ++S.banner.t > 150) S.banner = null;
    if (S.ring && ++S.ring.t > 24) S.ring = null;
    if (S.pulse > 0) S.pulse--;
  }
  // הבוט (לבדיקות ולתפריט): מכוון לראש המגדל עם טעות קטנה, ולוחץ ברגע הכי קרוב — כמו שחקן
  function botWants(S, err) {
    const sl = S.slider;
    if (!sl || S.phase !== 'slide') return false;
    const top = S.layers[S.layers.length - 1];
    if (S.aim == null) S.aim = top.x + (Math.random() * 2 - 1) * err;
    let nx = sl.x + sl.vx;
    if (nx > sl.max) nx = 2 * sl.max - nx; else if (nx < sl.min) nx = 2 * sl.min - nx;
    const now = Math.abs(sl.x - S.aim);
    return now <= Math.abs(nx - S.aim) && now <= Math.abs(sl.vx) + 0.01;
  }
  // מגדל יפה מאחורי התפריט
  function demoState(g) {
    const S = makeState(g);
    S.quiet = true;
    for (let i = 0; i < 9; i++) { S.slider.x = S.layers[S.layers.length - 1].x + U.rnd(-9, 9); landIt(g, S); }
    stepLayers(S);
    for (const L of S.layers) { L.sq = 0; L.w = L.gw; }
    S.cam = S.pcam = Math.min(CAM0, topOf(S.layers.length - 1) - TOPY);
    S.zc = S.pzc = S.cam + H / 2;
    return S;
  }

  // ===================== ציור =====================
  const R0 = U.seeded(4242);
  const STARS = [], CLOUDS = [], HOUSES = [], HILLS = [];
  for (let i = 0; i < 110; i++) STARS.push({ x: R0() * W, y: R0() * H, r: 1 + R0() * 1.8, a: 0.45 + R0() * 0.55, p: R0() * 6.28 });
  for (let i = 0; i < 30; i++) CLOUDS.push({ z: 140 + i * 46 + R0() * 30, x: R0() * W, s: 0.55 + R0() * 0.75, v: 0.06 + R0() * 0.14 });
  for (let x = -30; x < W + 40;) { const w = 46 + R0() * 54; HOUSES.push({ x, w, h: 36 + R0() * 52, roof: R0() < 0.5, c: (R0() * 4) | 0, win: R0() }); x += w + 6 + R0() * 18; }
  for (let i = 0; i < 7; i++) HILLS.push({ x: -80 + i * 170 + R0() * 60, r: 120 + R0() * 90 });
  const BALLOONS = [{ z: 560, x: 150, c: '#ff6b8a' }, { z: 700, x: 815, c: '#5ad1ff' }, { z: 830, x: 290, c: '#7be07b' }];
  const SKY = [[0, '#59b6ff', '#dff4ff'], [420, '#4a96ec', '#c6e6ff'], [620, '#7a64d6', '#ffc58c'], [860, '#3d2e8c', '#ff8f7c'], [1100, '#17174d', '#45327f'], [1380, '#05060f', '#161a3c']]
    .map(([z, a, b]) => [z, [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))]);
  function skyAt(z) {
    let i = 0;
    while (i < SKY.length - 2 && z > SKY[i + 1][0]) i++;
    const A = SKY[i], B = SKY[i + 1], t = clamp((z - A[0]) / (B[0] - A[0]), 0, 1);
    const mix = (p, q) => 'rgb(' + p.map((v, k) => Math.round(v + (q[k] - v) * t)).join(',') + ')';
    return [mix(A[1], B[1]), mix(A[2], B[2])];
  }
  function cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.ellipse(x, y, 62 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(x - 10 * s, y); ctx.arc(x - 18 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
    ctx.moveTo(x + 40 * s, y); ctx.arc(x + 18 * s, y - 16 * s, 30 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  function balloon(ctx, x, y, c) {
    ctx.strokeStyle = 'rgba(80,50,40,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 9, y + 26); ctx.lineTo(x - 6, y + 40); ctx.moveTo(x + 9, y + 26); ctx.lineTo(x + 6, y + 40); ctx.stroke();
    const gr = ctx.createRadialGradient(x - 8, y - 10, 3, x, y, 30);
    gr.addColorStop(0, U.shade(c, 0.45)); gr.addColorStop(1, U.shade(c, -0.25));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x - 10, y + 26); ctx.bezierCurveTo(x - 34, y + 4, x - 30, y - 30, x, y - 30); ctx.bezierCurveTo(x + 30, y - 30, x + 34, y + 4, x + 10, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.moveTo(x - 4, y + 25); ctx.bezierCurveTo(x - 12, y + 4, x - 10, y - 26, x, y - 30); ctx.bezierCurveTo(x + 10, y - 26, x + 12, y + 4, x + 4, y + 25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a0683a'; U.rr(ctx, x - 7, y + 39, 14, 10, 2); ctx.fill();
  }
  // השמיים לפי הגובה: יום, שקיעה, לילה, חלל — עם גגות, גבעות, עננים, כדורים פורחים וכוכבים
  function drawSky(ctx, alt, t) {
    const z = alt * 0.5;
    const [c1, c2] = skyAt(z);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const sa = clamp((z - 860) / 320, 0, 1);
    if (sa > 0) {
      ctx.fillStyle = '#ffffff';
      for (const s of STARS) { ctx.globalAlpha = sa * s.a * (0.6 + 0.4 * Math.sin(t * 0.05 + s.p)); ctx.fillRect(s.x, (s.y + z * 0.06) % H, s.r, s.r); }
      ctx.globalAlpha = 1;
    }
    if (z < 1000) {      // השמש שוקעת ככל שעולים
      const sx = 790, sy = 105 + z * 0.4, k = clamp(z / 900, 0, 1), a = clamp((1000 - z) / 150, 0, 1);
      const col = 'rgb(255,' + Math.round(244 - 110 * k) + ',' + Math.round(184 - 110 * k) + ')';
      const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, 120);
      glow.addColorStop(0, 'rgba(255,240,180,' + (0.45 * a) + ')'); glow.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.globalAlpha = a; ctx.fillStyle = col; U.circle(ctx, sx, sy, 44); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (z > 950) {       // ירח
      const a = clamp((z - 950) / 200, 0, 1);
      ctx.globalAlpha = a;
      const mg = ctx.createRadialGradient(170, 112, 10, 170, 112, 90);
      mg.addColorStop(0, 'rgba(255,248,220,.35)'); mg.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = mg; ctx.fillRect(80, 22, 180, 180);
      ctx.fillStyle = '#fff6d8'; U.circle(ctx, 170, 112, 34); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,160,.45)';
      U.circle(ctx, 158, 104, 7); ctx.fill(); U.circle(ctx, 182, 122, 5); ctx.fill(); U.circle(ctx, 176, 98, 3.5); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (z > 1250) {      // כוכבי לכת
      const a = clamp((z - 1250) / 200, 0, 1);
      ctx.globalAlpha = a;
      const pg = ctx.createRadialGradient(748, 158, 6, 760, 170, 40);
      pg.addColorStop(0, '#ffd2a1'); pg.addColorStop(1, '#c0653a');
      ctx.fillStyle = pg; U.circle(ctx, 760, 170, 38); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,170,.85)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(760, 172, 66, 14, -0.25, 0.15, Math.PI - 0.15, false); ctx.stroke();
      ctx.fillStyle = '#7fb6ff'; U.circle(ctx, 210, 400, 15); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // כדורים פורחים בשקיעה
    for (const b of BALLOONS) { const y = 470 - (b.z - z); if (y > -60 && y < H + 60) balloon(ctx, b.x + Math.sin(t * 0.01 + b.z) * 10, y, b.c); }
    // עננים
    const ca = z < 700 ? 0.92 : z < 1100 ? lerp(0.92, 0.2, (z - 700) / 400) : Math.max(0, 0.2 - (z - 1100) / 400);
    if (ca > 0.01) {
      ctx.fillStyle = z < 600 ? '#ffffff' : '#ffe3ef';
      for (const c of CLOUDS) {
        const y = 470 - (c.z - z);
        if (y < -60 || y > H + 60) continue;
        const x = ((c.x + t * c.v) % (W + 260)) - 130;
        ctx.globalAlpha = ca; cloud(ctx, x, y, c.s);
      }
      ctx.globalAlpha = 1;
    }
    // גבעות ובתים רחוקים (רק בהתחלה, למטה)
    const hy = 432 + alt * 0.3;
    if (hy < H + 10) {
      ctx.fillStyle = '#9fd4b2';
      ctx.beginPath(); for (const h of HILLS) { ctx.moveTo(h.x + h.r, hy + 120); ctx.ellipse(h.x, hy + 120, h.r, 120, 0, Math.PI, 0); } ctx.fill();
      ctx.fillRect(0, hy + 110, W, 300);
    }
    const ty = 492 + alt * 0.42;
    if (ty - 100 < H) {
      const WALLS = ['#f4d9c6', '#e6e0f5', '#d5ecf2', '#f6e7b8'];
      for (const h of HOUSES) {
        ctx.fillStyle = WALLS[h.c]; ctx.fillRect(h.x, ty - h.h, h.w, h.h + 200);
        ctx.fillStyle = h.roof ? '#d9786a' : '#8f86c9';
        ctx.beginPath(); ctx.moveTo(h.x - 6, ty - h.h); ctx.lineTo(h.x + h.w / 2, ty - h.h - 22); ctx.lineTo(h.x + h.w + 6, ty - h.h); ctx.fill();
        ctx.fillStyle = h.win > 0.5 ? '#ffe6a3' : '#a9c4dc';
        ctx.fillRect(h.x + h.w * 0.22, ty - h.h + 12, 9, 11); ctx.fillRect(h.x + h.w * 0.62, ty - h.h + 12, 9, 11);
      }
    }
  }
  // משטח השיש, הארונות ודברים על השיש (עולם)
  function drawCounter(ctx, x0, x1) {
    ctx.fillStyle = '#f2b6c4'; ctx.fillRect(x0, 30, x1 - x0, 3000);
    ctx.strokeStyle = '#d98ea2'; ctx.lineWidth = 3;
    ctx.fillStyle = '#f7c8d3';
    for (let x = Math.floor((x0 - CX) / 190) * 190 + CX - 95; x < x1; x += 190) {
      U.rr(ctx, x + 10, 50, 170, 230, 12); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#fff3d6'; U.circle(ctx, x + 95 + 60, 165, 7); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = '#c98a5a'; ctx.fillRect(x0, 8, x1 - x0, 24);
    ctx.fillStyle = '#a86d42'; ctx.fillRect(x0, 28, x1 - x0, 4);
    const tg = ctx.createLinearGradient(0, -8, 0, 8);
    tg.addColorStop(0, '#fffaf4'); tg.addColorStop(1, '#eadfd2');
    ctx.fillStyle = tg; ctx.fillRect(x0, -8, x1 - x0, 17);
    // קערת ערבוב עם מטרפה
    ctx.fillStyle = '#7ec4e8'; ctx.beginPath(); ctx.ellipse(150, -18, 62, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(88, -18); ctx.bezierCurveTo(92, 6, 208, 6, 212, -18); ctx.fill();
    ctx.fillStyle = '#fff2dc'; ctx.beginPath(); ctx.ellipse(150, -18, 54, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9aa7b5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(158, -20); ctx.lineTo(196, -62); ctx.stroke();
    ctx.strokeStyle = '#c3ccd6'; ctx.lineWidth = 1.5;
    for (const o of [-6, 0, 6]) { ctx.beginPath(); ctx.ellipse(160 + o * 0.3, -26, 6 + Math.abs(o) * 0.4, 12, -0.7, 0, Math.PI * 2); ctx.stroke(); }
    // שק קמח
    ctx.fillStyle = '#efe6d6'; U.rr(ctx, 30, -70, 46, 70, 10); ctx.fill();
    ctx.fillStyle = '#d9a95b'; U.rr(ctx, 38, -46, 30, 18, 4); ctx.fill();
    // ביצים
    for (const [x, y] of [[262, -12], [282, -10], [272, -24]]) { ctx.fillStyle = '#fff8ee'; ctx.beginPath(); ctx.ellipse(x, y, 9, 11, 0, 0, Math.PI * 2); ctx.fill(); }
    // קערת דובדבנים
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(744, -24); ctx.bezierCurveTo(748, 4, 832, 4, 836, -24); ctx.fill();
    for (const [x, y] of [[762, -30], [780, -34], [798, -30], [816, -33], [790, -42]]) { ctx.fillStyle = '#d7192f'; U.circle(ctx, x, y, 8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; U.circle(ctx, x - 2.5, y - 2.5, 2); ctx.fill(); }
    // צנצנת סוכריות צבעוניות
    ctx.fillStyle = 'rgba(220,240,255,.75)'; U.rr(ctx, 868, -78, 52, 78, 10); ctx.fill();
    const r = U.seeded(7);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = SPR[i % SPR.length]; ctx.fillRect(874 + r() * 40, -50 + r() * 44, 5, 2.5); }
    ctx.fillStyle = '#ff86ab'; U.rr(ctx, 864, -88, 60, 14, 5); ctx.fill();
  }
  function drawStand(ctx) {
    ctx.fillStyle = '#c6d6ea'; ctx.beginPath(); ctx.ellipse(CX, -2, 74, 10, 0, 0, Math.PI * 2); ctx.fill();
    const sg = ctx.createLinearGradient(CX - 30, 0, CX + 30, 0);
    sg.addColorStop(0, '#b7c9e2'); sg.addColorStop(0.45, '#ffffff'); sg.addColorStop(1, '#a8bcd8');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(CX - 16, PLATE + 8); ctx.lineTo(CX + 16, PLATE + 8); ctx.lineTo(CX + 34, -4); ctx.lineTo(CX - 34, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8fb6e6';
    ctx.beginPath(); ctx.moveTo(CX - PR, PLATE); ctx.ellipse(CX, PLATE + 9, PR, 15, 0, Math.PI, 0, true); ctx.lineTo(CX + PR, PLATE); ctx.ellipse(CX, PLATE, PR, 15, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(CX, PLATE, PR, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d7e4f4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(CX, PLATE, PR - 12, 11, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // פריט קישוט על פני השכבה
  function topItem(ctx, it, x, y) {
    const s = it.s || 5;
    if (it.k === 'dollop' || it.k === 'cherry') {
      const d = it.k === 'cherry' ? 4.6 : s;
      ctx.fillStyle = '#e4d3bf'; ctx.beginPath(); ctx.ellipse(x, y + 1, d, d * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.ellipse(x, y - d * 0.3, d * 0.92, d * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y - d * 0.85, d * 0.58, d * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - d * 0.28, y - d * 1.1); ctx.quadraticCurveTo(x + d * 0.05, y - d * 1.85, x + d * 0.2, y - d * 1.1); ctx.fill();
      if (it.k === 'dollop') { ctx.fillStyle = 'rgba(255,255,255,.95)'; U.circle(ctx, x - d * 0.35, y - d * 0.55, d * 0.2); ctx.fill(); return; }
      const cy = y - 11;
      ctx.strokeStyle = '#4f7a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 1, cy - 5); ctx.quadraticCurveTo(x + 2 + it.r * 8, cy - 13, x + 6 + it.r * 5, cy - 16); ctx.stroke();
      const gr = ctx.createRadialGradient(x - 2, cy - 2.5, 0.5, x, cy, 7);
      gr.addColorStop(0, '#ff8f9a'); gr.addColorStop(0.5, '#e3152f'); gr.addColorStop(1, '#8e0a1c');
      ctx.fillStyle = gr; U.circle(ctx, x, cy, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x - 2.4, cy - 2.6, 1.6, 2.5, 0.6, 0, Math.PI * 2); ctx.fill();
    } else if (it.k === 'chip') {
      ctx.fillStyle = '#3b1f10';
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.9); ctx.quadraticCurveTo(x + s * 1.3, y, x, y + s * 0.5); ctx.quadraticCurveTo(x - s * 1.3, y, x, y - s * 1.9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; U.circle(ctx, x - s * 0.3, y - s * 0.6, s * 0.28); ctx.fill();
    } else if (it.k === 'berry') {
      ctx.fillStyle = '#34479f'; U.circle(ctx, x, y - s * 0.6, s); ctx.fill();
      ctx.fillStyle = '#6f86e8'; U.circle(ctx, x - s * 0.35, y - s * 0.95, s * 0.35); ctx.fill();
      ctx.fillStyle = '#1b2563'; U.circle(ctx, x + s * 0.15, y - s * 1.15, s * 0.25); ctx.fill();
    } else if (it.k === 'pearl') {
      ctx.fillStyle = '#fdf8ff'; U.circle(ctx, x, y - s * 0.6, s); ctx.fill();
      ctx.fillStyle = 'rgba(150,120,200,.45)'; U.circle(ctx, x + s * 0.3, y - s * 0.35, s * 0.55); ctx.fill();
      ctx.fillStyle = '#ffffff'; U.circle(ctx, x - s * 0.3, y - s * 0.9, s * 0.35); ctx.fill();
    }
  }
  function starPath(ctx, x, y, r, rot) {
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function sprinkles(ctx, items, x, yOf, vis) {
    ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (const c of SPR) {
      ctx.strokeStyle = c; ctx.beginPath();
      for (const it of items) {
        if (it.c !== c || (vis && !vis(it))) continue;
        const px = x + it.ox, py = yOf(it), dx = Math.cos(it.r) * 3, dy = Math.sin(it.r) * 1.6;
        ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy);
      }
      ctx.stroke();
    }
  }
  // שכבה: גליל עם ספוג, פס מילוי, ציפוי עם טפטופים, פנים עליונות וקישוטים
  // next = השכבה שמעליה (את מה שהיא מכסה לא מציירים)
  function drawLayer(ctx, L, x, yT, w, next) {
    if (w < 1) return;
    const T = styleOf(L.n), hw = w / 2, l = x - hw, r = x + hw, yB = yT + LH, ry = Math.min(RY, hw * 0.45);
    if (L.sq) { const s = L.sq * 0.13; ctx.save(); ctx.translate(x, yB); ctx.scale(1 + s * 0.5, 1 - s); ctx.translate(-x, -yB); }
    ctx.beginPath(); ctx.moveTo(l, yT); ctx.lineTo(l, yB); ctx.ellipse(x, yB, hw, ry, 0, Math.PI, 0, true); ctx.lineTo(r, yT); ctx.closePath();
    const gr = ctx.createLinearGradient(l, 0, r, 0);
    gr.addColorStop(0, T.spongeD); gr.addColorStop(0.25, T.sponge); gr.addColorStop(0.5, T.spongeL); gr.addColorStop(0.8, T.sponge); gr.addColorStop(1, T.spongeD);
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(70,30,25,.32)'; ctx.lineWidth = 1.5; ctx.stroke();
    // פס מילוי (קרם / ריבה) לאורך החזית
    ctx.beginPath(); ctx.ellipse(x, yT + LH * 0.62, Math.max(0, hw - 0.8), ry, 0, Math.PI, 0, true);
    ctx.strokeStyle = 'rgba(60,20,20,.13)'; ctx.lineWidth = 6.5; ctx.stroke();
    ctx.strokeStyle = T.fill; ctx.lineWidth = 4; ctx.stroke();
    // ציפוי + טפטופים
    const b = T.band, N = Math.max(8, Math.ceil(w / 12));
    ctx.beginPath(); ctx.moveTo(l, yT);
    for (let i = 0; i <= N; i++) { const a = Math.PI * (1 - i / N); ctx.lineTo(x + Math.cos(a) * hw, yT + Math.sin(a) * ry + b); }
    ctx.lineTo(r, yT); ctx.ellipse(x, yT, hw, ry, 0, 0, -Math.PI, true); ctx.closePath();
    ctx.fillStyle = T.frost; ctx.fill();
    ctx.strokeStyle = T.frostD; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath();
    for (const d of L.drips) {
      if (d.ox < -hw + d.wd * 0.7 || d.ox > hw - d.wd * 0.7) continue;
      const px = x + d.ox, py = yT + arcY(d.ox, hw, ry) + b - 2, h2 = d.wd / 2;
      ctx.moveTo(px - h2, py); ctx.lineTo(px - h2, py + d.len); ctx.arc(px, py + d.len, h2, Math.PI, 0, true); ctx.lineTo(px + h2, py); ctx.closePath();
    }
    ctx.fillStyle = T.frost; ctx.fill();
    ctx.strokeStyle = T.frostD; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = T.frost;
    ctx.beginPath(); ctx.moveTo(l + 1, yT); for (let i = 0; i <= N; i++) { const a = Math.PI * (1 - i / N); ctx.lineTo(x + Math.cos(a) * (hw - 1), yT + Math.sin(a) * ry + b - 1.5); } ctx.lineTo(r - 1, yT); ctx.closePath(); ctx.fill();
    // פנים עליונות
    ctx.beginPath(); ctx.ellipse(x, yT, hw, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.top; ctx.fill();
    ctx.strokeStyle = T.frostD; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.beginPath(); ctx.ellipse(x - hw * 0.35, yT - ry * 0.15, hw * 0.33, ry * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    // קישוטים על הצד
    if (L.side.length) {
      const yOf = it => yT + arcY(it.ox, hw, ry) + 1.5 + it.v * (b - 2.5);
      if (L.side[0].k === 'spr') sprinkles(ctx, L.side, x, yOf);
      else {
        ctx.beginPath();
        for (const it of L.side) if (Math.abs(it.ox) < hw - 4) starPath(ctx, x + it.ox, yOf(it) + 1, it.s, it.r);
        ctx.fillStyle = '#fff4b8'; ctx.fill(); ctx.strokeStyle = '#c98a08'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
    // קישוטים למעלה (מה שהשכבה הבאה מכסה — לא מציירים)
    const nl = next ? next.x - next.w / 2 + 7 : 0, nr = next ? next.x + next.w / 2 - 7 : 0;
    const vis = it => !next || x + it.ox < nl || x + it.ox > nr;
    if (L.top.length && L.top[0].k === 'spr') sprinkles(ctx, L.top, x, it => yT + it.v * ry * 0.6, vis);
    else for (const it of L.top) { if (Math.abs(it.ox) < hw - 2 && vis(it)) topItem(ctx, it, x + it.ox, yT + it.v * ry * 0.62); }
    if (L.sq) ctx.restore();
  }
  function drawPiece(ctx, p, alpha) {
    const x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha);
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.a);
    drawLayer(ctx, p, 0, -LH / 2, p.w, null);
    ctx.restore();
  }

  function drawWorld(g, ctx, S, alpha, z, zc) {
    const x0 = CX - W / 2 / z - 40, x1 = CX + W / 2 / z + 40, vt = zc - H / 2 / z - LH * 2, vb = zc + H / 2 / z + LH;
    drawCounter(ctx, x0, x1);
    drawStand(ctx);
    // קו השיא
    if (!g.demo && S.best > 0) {
      const y = topOf(S.best);
      if (y > vt && y < vb) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,209,102,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([12, 9]);
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.restore();
        const s = g.t('best') + ' ' + S.best;
        ctx.save(); ctx.font = '800 17px Heebo, Arial, sans-serif'; const tw = ctx.measureText(s).width; ctx.restore();
        ctx.fillStyle = 'rgba(120,60,10,.82)'; U.rr(ctx, 12, y - 30, tw + 22, 26, 13); ctx.fill();
        g.text(ctx, s, 23 + tw / 2, y - 17, { size: 17, color: '#ffd166' });
      }
    }
    const n = S.layers.length;
    for (let i = 0; i < n; i++) {
      const yT = topOf(i);
      if (yT > vb || yT + LH < vt) continue;
      const L = S.layers[i];
      drawLayer(ctx, L, L.x, yT, L.w, S.layers[i + 1] || null);
    }
    // הבזק "מושלם" סביב השכבה
    if (S.ring) {
      const k = S.ring.t / 24;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(S.ring.x, S.ring.y + LH / 2, S.ring.w / 2 + 10 + k * 60, LH / 2 + 8 + k * 26, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // השכבה הנעה + הצל שלה על ראש המגדל (מראה איפה תנחת)
    const sl = S.slider;
    if (sl) {
      const top = S.layers[n - 1], ty = topOf(n - 1), x = lerp(sl.px, sl.x, alpha), y = lerp(sl.py, sl.y, alpha);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(top.x, ty, top.w / 2, Math.min(RY, top.w * 0.225), 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(80,30,50,.3)'; ctx.fillRect(x - sl.w / 2, ty - RY - 2, sl.w, RY * 2 + 4);
      ctx.restore();
      drawLayer(ctx, sl, x, y, sl.w, null);
    }
    for (const p of S.pieces) drawPiece(ctx, p, alpha);
  }

  function drawOverlay(g, ctx, S) {
    if (g.demo) return;
    const pop = 1 + S.pulse * 0.022;
    ctx.save(); ctx.translate(CX, 66); ctx.scale(pop, pop);
    g.text(ctx, String(g.score), 0, 0, { size: 70, weight: 900, color: '#ffffff', stroke: 'rgba(70,25,60,.55)', strokeW: 10 });
    ctx.restore();
    if (S.banner) {
      const t = S.banner.t, a = t < 12 ? t / 12 : t > 128 ? Math.max(0, (150 - t) / 22) : 1, sc = t < 14 ? U.ease.back(t / 14) : 1;
      const tier = S.banner.tier % TIERS.length, T = TIERS[tier];
      ctx.save(); ctx.globalAlpha = a; ctx.translate(CX, 152); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(255,255,255,.94)'; U.rr(ctx, -220, -34, 440, 70, 35); ctx.fill();
      ctx.strokeStyle = T.frostD; ctx.lineWidth = 3; ctx.stroke();
      const demo = { k: T.deco === 'cream' ? 'dollop' : T.deco, s: T.deco === 'cream' ? 9 : T.deco === 'pearl' ? 4 : 5, r: 0.3, v: 0 };
      for (const sx of [-180, 180]) {
        if (T.deco === 'sprinkle') sprinkles(ctx, SPR.map((c, i) => ({ c, ox: (i - 2.5) * 6, r: i * 1.1, v: 0 })), sx, it => 4 + (it.r % 2) * 5);
        else if (T.deco === 'star') { ctx.beginPath(); starPath(ctx, sx, 2, 14, 0); ctx.fillStyle = '#ffd54d'; ctx.fill(); ctx.strokeStyle = '#c98a08'; ctx.lineWidth = 1.5; ctx.stroke(); }
        else { ctx.save(); ctx.translate(sx, 12); ctx.scale(1.6, 1.6); topItem(ctx, demo, 0, 0); ctx.restore(); }
      }
      g.text(ctx, g.t('t' + tier), 0, -7, { size: 30, weight: 900, color: '#d9467a', maxW: 300 });
      g.text(ctx, g.t('faster'), 0, 21, { size: 16, weight: 800, color: '#7a4b8c', maxW: 300 });
      ctx.restore();
    }
    if (S.drops === 0 && S.slider) {
      const bob = Math.sin(S.t * 0.12) * 4;
      g.text(ctx, g.t(g.touch ? 'hintT' : 'hint'), CX, 226 + bob, { size: 25, weight: 800, color: '#ffffff', stroke: 'rgba(60,20,50,.6)', strokeW: 6, maxW: 820 });
    }
  }

  Object.assign(SPEC, {
    w: W, h: H, bg: '#2a1b2e', accent: '#ff8fb1',
    diffs: true,
    text: {
      he: { title: 'מגדל העוגה', help: ['שכבת עוגה זזה מעל המגדל — רווח, ↓ או קליק מפילים אותה', 'מה שבולט מעבר למגדל נחתך ונופל', 'נחיתה מושלמת מצלצלת ומגדילה קצת את השכבה', 'כל 10 שכבות — קישוט חדש, והשכבות זזות מהר יותר'], helpTouch: ['הקש על המסך כדי להפיל את השכבה', 'מה שבולט מעבר למגדל נחתך ונופל', 'נחיתה מושלמת מצלצלת ומגדילה קצת את השכבה', 'כל 10 שכבות — קישוט חדש, והשכבות זזות מהר יותר'], height: 'גובה', tall: 'העוגה שלך בגובה {n} ס״מ!', perfect: 'מושלם!', combo: 'מושלם ×{n}!', hint: 'רווח או קליק — הפל את השכבה', hintT: 'הקש כדי להפיל את השכבה', missTitle: 'אופס! השכבה החליקה', newRec: 'שיא חדש!', faster: 'מהר יותר!', phew: 'פיו!', t0: 'קצפת!', t1: 'דובדבנים!', t2: 'סוכריות צבעוניות!', t3: 'שבבי שוקולד!', t4: 'אוכמניות!', t5: 'כוכבי זהב!' },
      en: { title: 'Cake Tower', help: ['A cake layer slides above the tower — Space, ↓ or click drops it', 'Whatever hangs over the edge is cut off and falls', 'A perfect drop chimes and grows the layer back a little', 'Every 10 layers — new toppings, and the layers move faster'], helpTouch: ['Tap the screen to drop the layer', 'Whatever hangs over the edge is cut off and falls', 'A perfect drop chimes and grows the layer back a little', 'Every 10 layers — new toppings, and the layers move faster'], height: 'Height', tall: 'Your cake is {n} cm tall!', perfect: 'Perfect!', combo: 'Perfect ×{n}!', hint: 'Space or click — drop the layer', hintT: 'Tap to drop the layer', missTitle: 'Oops! It slipped off', newRec: 'New record!', faster: 'Faster!', phew: 'Phew!', t0: 'Whipped cream!', t1: 'Cherries!', t2: 'Sprinkles!', t3: 'Chocolate chips!', t4: 'Blueberries!', t5: 'Golden stars!' },
      ar: { title: 'برج الكعكة', help: ['طبقة كعك تتحرك فوق البرج — المسافة أو ↓ أو النقر تُسقطها', 'ما يبرز خارج البرج يُقطع ويسقط', 'الإسقاط المثالي يرنّ ويُكبّر الطبقة قليلاً', 'كل 10 طبقات — زينة جديدة، والطبقات تتحرك أسرع'], helpTouch: ['اضغط على الشاشة لإسقاط الطبقة', 'ما يبرز خارج البرج يُقطع ويسقط', 'الإسقاط المثالي يرنّ ويُكبّر الطبقة قليلاً', 'كل 10 طبقات — زينة جديدة، والطبقات تتحرك أسرع'], height: 'الارتفاع', tall: 'ارتفاع كعكتك {n} سم!', perfect: 'مثالي!', combo: 'مثالي ×{n}!', hint: 'المسافة أو النقر — أسقط الطبقة', hintT: 'اضغط لإسقاط الطبقة', missTitle: 'أوبس! انزلقت الطبقة', newRec: 'رقم قياسي جديد!', faster: 'أسرع!', phew: 'نجوت!', t0: 'كريمة مخفوقة!', t1: 'كرز!', t2: 'حلوى ملوّنة!', t3: 'رقائق الشوكولاتة!', t4: 'توت أزرق!', t5: 'نجوم ذهبية!' },
      es: { title: 'Torre de Pastel', help: ['Una capa de pastel se mueve sobre la torre: Espacio, ↓ o clic la sueltan', 'Lo que sobresale del borde se corta y cae', 'Una caída perfecta suena y agranda un poco la capa', 'Cada 10 capas: nuevos adornos y las capas van más rápido'], helpTouch: ['Toca la pantalla para soltar la capa', 'Lo que sobresale del borde se corta y cae', 'Una caída perfecta suena y agranda un poco la capa', 'Cada 10 capas: nuevos adornos y las capas van más rápido'], height: 'Altura', tall: '¡Tu pastel mide {n} cm!', perfect: '¡Perfecto!', combo: '¡Perfecto ×{n}!', hint: 'Espacio o clic: suelta la capa', hintT: 'Toca para soltar la capa', missTitle: '¡Ups! Se resbaló', newRec: '¡Nuevo récord!', faster: '¡Más rápido!', phew: '¡Uf!', t0: '¡Nata montada!', t1: '¡Cerezas!', t2: '¡Chispitas de colores!', t3: '¡Chispas de chocolate!', t4: '¡Arándanos!', t5: '¡Estrellas doradas!' },
      fr: { title: 'Tour de Gâteau', help: ['Un étage de gâteau glisse au-dessus de la tour : Espace, ↓ ou clic le lâche', 'Ce qui dépasse du bord est coupé et tombe', 'Un lâcher parfait tinte et agrandit un peu l’étage', 'Tous les 10 étages : nouvelles décorations, et ça va plus vite'], helpTouch: ['Touche l’écran pour lâcher l’étage', 'Ce qui dépasse du bord est coupé et tombe', 'Un lâcher parfait tinte et agrandit un peu l’étage', 'Tous les 10 étages : nouvelles décorations, et ça va plus vite'], height: 'Hauteur', tall: 'Ton gâteau mesure {n} cm !', perfect: 'Parfait !', combo: 'Parfait ×{n} !', hint: 'Espace ou clic : lâche l’étage', hintT: 'Touche pour lâcher l’étage', missTitle: 'Oups ! Il a glissé', newRec: 'Nouveau record !', faster: 'Plus vite !', phew: 'Ouf !', t0: 'Chantilly !', t1: 'Cerises !', t2: 'Vermicelles colorés !', t3: 'Pépites de chocolat !', t4: 'Myrtilles !', t5: 'Étoiles dorées !' },
      pt: { title: 'Torre de Bolo', help: ['Uma camada de bolo desliza sobre a torre: Espaço, ↓ ou clique a solta', 'O que passar da borda é cortado e cai', 'Uma queda perfeita toca um sino e aumenta um pouco a camada', 'A cada 10 camadas: novos enfeites, e as camadas ficam mais rápidas'], helpTouch: ['Toque na tela para soltar a camada', 'O que passar da borda é cortado e cai', 'Uma queda perfeita toca um sino e aumenta um pouco a camada', 'A cada 10 camadas: novos enfeites, e as camadas ficam mais rápidas'], height: 'Altura', tall: 'Seu bolo tem {n} cm de altura!', perfect: 'Perfeito!', combo: 'Perfeito ×{n}!', hint: 'Espaço ou clique: solte a camada', hintT: 'Toque para soltar a camada', missTitle: 'Ops! Escorregou', newRec: 'Novo recorde!', faster: 'Mais rápido!', phew: 'Ufa!', t0: 'Chantilly!', t1: 'Cerejas!', t2: 'Granulado colorido!', t3: 'Gotas de chocolate!', t4: 'Mirtilos!', t5: 'Estrelas douradas!' },
      ru: { title: 'Башня из торта', help: ['Коржик ездит над башней — пробел, ↓ или клик роняют его', 'Всё, что свисает с края, отрезается и падает', 'Идеальное попадание звенит и немного увеличивает коржик', 'Каждые 10 слоёв — новые украшения, и коржи ездят быстрее'], helpTouch: ['Нажми на экран, чтобы уронить коржик', 'Всё, что свисает с края, отрезается и падает', 'Идеальное попадание звенит и немного увеличивает коржик', 'Каждые 10 слоёв — новые украшения, и коржи ездят быстрее'], height: 'Высота', tall: 'Твой торт высотой {n} см!', perfect: 'Идеально!', combo: 'Идеально ×{n}!', hint: 'Пробел или клик — урони коржик', hintT: 'Нажми, чтобы уронить коржик', missTitle: 'Ой! Коржик соскользнул', newRec: 'Новый рекорд!', faster: 'Быстрее!', phew: 'Фух!', t0: 'Взбитые сливки!', t1: 'Вишенки!', t2: 'Цветная посыпка!', t3: 'Шоколадная крошка!', t4: 'Черника!', t5: 'Золотые звёзды!' },
      de: { title: 'Tortenturm', help: ['Eine Tortenschicht gleitet über dem Turm – Leertaste, ↓ oder Klick lässt sie fallen', 'Was über den Rand ragt, wird abgeschnitten und fällt', 'Ein perfekter Wurf klingelt und macht die Schicht etwas breiter', 'Alle 10 Schichten – neue Deko, und die Schichten werden schneller'], helpTouch: ['Tippe auf den Bildschirm, um die Schicht fallen zu lassen', 'Was über den Rand ragt, wird abgeschnitten und fällt', 'Ein perfekter Wurf klingelt und macht die Schicht etwas breiter', 'Alle 10 Schichten – neue Deko, und die Schichten werden schneller'], height: 'Höhe', tall: 'Deine Torte ist {n} cm hoch!', perfect: 'Perfekt!', combo: 'Perfekt ×{n}!', hint: 'Leertaste oder Klick – Schicht fallen lassen', hintT: 'Tippen – Schicht fallen lassen', missTitle: 'Hoppla! Abgerutscht', newRec: 'Neuer Rekord!', faster: 'Schneller!', phew: 'Puh!', t0: 'Sahne!', t1: 'Kirschen!', t2: 'Bunte Streusel!', t3: 'Schokostückchen!', t4: 'Blaubeeren!', t5: 'Goldene Sterne!' },
    },

    init(g) { g.s = g.demo ? demoState(g) : makeState(g); },

    step(g) {
      const S = g.s;
      S.t++;
      if (g.hit('Space') || g.hit('ArrowDown') || g.hit('KeyS') || g.hit('Enter') || g.hit('NumpadEnter')) S.press = true;
      if (S.phase === 'slide') { if (S.press) startFall(g, S); else slide(S); }
      else if (S.phase === 'fall') fall(g, S);
      else if (S.phase === 'miss') missStep(g, S);
      S.press = false;
      stepPieces(g, S, true); stepCam(S); stepLayers(S);
      const b = S.best;
      g.hud([[g.t('height'), g.score], [g.t('best'), b === null ? '—' : Math.max(b, g.score)]]);
    },

    // בתפריט: מגדל שנבנה לבד (בשקט). בסוף משחק: החתיכות והמצלמה ממשיכות לזוז
    idle(g) {
      const S = g.s;
      if (!S) return;
      S.t++;
      if (g.demo) {
        if (S.phase === 'slide') { if (botWants(S, 8)) startFall(g, S); else slide(S); }
        else if (S.phase === 'fall') fall(g, S);
        else if (++S.missT > 80 || S.phase !== 'miss') { g.s = demoState(g); return; }
        if (S.layers.length > 40) { g.s = demoState(g); return; }
      }
      stepPieces(g, S, false); stepCam(S); stepLayers(S);
    },

    bot(g) { if (botWants(g.s, SPEC._botErr)) g.s.press = true; },
    _botErr: 10,

    onPointer(g, type) { if (type === 'down') g.s.press = true; },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S) return;
      const cam = lerp(S.pcam, S.cam, alpha), z = lerp(S.pzoom, S.zoom, alpha), zc = lerp(S.pzc, S.zc, alpha);
      drawSky(ctx, Math.max(0, CAM0 - cam), S.t);
      ctx.save();
      ctx.translate(CX, H / 2); ctx.scale(z, z); ctx.translate(-CX, -zc);
      drawWorld(g, ctx, S, alpha, z, zc);
      ctx.restore();
      drawOverlay(g, ctx, S);
    },

    cover(ctx, w, h, k) {
      ctx.save();
      ctx.scale(w / W, w / W);
      drawSky(ctx, 330, 0);
      const r = U.seeded(99);
      ctx.save();
      ctx.translate(CX, 520); ctx.scale(0.93, 0.93); ctx.translate(-CX, 0);
      drawCounter(ctx, -200, W + 200);
      drawStand(ctx);
      // שלוש קומות כמו עוגת חתונה, כך שרואים את הקצפת, הדובדבנים והסוכריות על השוליים
      const ns = [0, 1, 2, 3, 21, 22, 23, 11, 12, 13], wds = [320, 320, 320, 320, 240, 240, 240, 180, 180, 180];
      const layers = ns.map((n, i) => newLayer(n, CX + (i ? (r() - 0.5) * 4 : 0), wds[i]));
      layers.forEach((L, i) => drawLayer(ctx, L, L.x, topOf(i), L.w, layers[i + 1] || null));
      const tops = topOf(layers.length - 1);
      // השכבה הבאה נופלת, וחתיכה שנחתכה עפה הצידה
      const sl = newLayer(14, layers[layers.length - 1].x + 6, layers[layers.length - 1].w);
      drawLayer(ctx, sl, sl.x, tops - LH - 34, sl.w, null);
      const p = newLayer(13, 0, 52);
      ctx.save(); ctx.translate(layers[layers.length - 1].x + 175, tops + 40); ctx.rotate(0.55); drawLayer(ctx, p, 0, -LH / 2, 52, null); ctx.restore();
      ctx.fillStyle = '#ffd3df';
      for (let i = 0; i < 14; i++) { ctx.fillRect(layers[layers.length - 1].x + 140 + r() * 40, tops + 70 + r() * 60, 5, 5); }
      // נצנוצים של "מושלם"
      ctx.fillStyle = '#fff6b0';
      for (const [sx, sy, s] of [[-170, -40, 13], [165, -70, 10], [-120, -110, 8], [120, -5, 7], [200, -130, 9]]) { ctx.beginPath(); starPath(ctx, sl.x + sx, tops + sy, s, 0.2); ctx.fill(); }
      ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,10,30,.3)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
  });
  GK.register('cake-tower', SPEC);
})();
