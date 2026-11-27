// ============================================================
//  בונה גשרים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  בונים גשר מעל הנהר בתוך תקציב: כביש, עץ ופלדה בין נקודות חיבור על רשת. העוגנים קבועים.
//  "בדיקה" — הרכב נוסע. הפיזיקה: נקודות ורלה עם אילוצי מרחק (XPBD בתתי-צעדים), צבעי מאמץ מירוק לאדום,
//  וקורות שנשברות. 15 שלבים; לכל שלב פתרון ייחוס שנמצא בחיפוש (g2dtools/tests/bridge-builder/search.mjs).
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540, G = 30, GRAV = 600, NSUB = 20, HS = 1 / 60 / NSUB, WATER = 452;
  const SPEED = 115, ACC = 520, SETTLE = 40, START = 55, TMAX = 45 * 60, DAMP = 0.05, MAXM = 150;
  // cost = מחיר לפיקסל אורך, str = הכוח שבו הקורה נשברת, EA = קשיחות
  const MATS = [
    { id: 'road', cost: 2, maxL: 125, dens: 0.045, EA: 4e6, str: 48000, col: '#4b505e', lt: '#707688', dk: '#24272f', w: 10 },
    { id: 'wood', cost: 1, maxL: 120, dens: 0.02, EA: 3e6, str: 30000, col: '#c98a4b', lt: '#eab47c', dk: '#6e421c', w: 7 },
    { id: 'steel', cost: 3, maxL: 180, dens: 0.035, EA: 9e6, str: 110000, col: '#8ea4bd', lt: '#d2deea', dk: '#465569', w: 7 },
  ];
  const VEH = [
    { m: 30, wb: 50, r: 12, col: '#ff5a5a', e: '🚗' },
    { m: 45, wb: 56, r: 12, col: '#3fa9f5', e: '🛻' },
    { m: 62, wb: 60, r: 13, col: '#ffc93c', e: '🚐' },
    { m: 85, wb: 70, r: 14, col: '#ff8c42', e: '🚚' },
    { m: 100, wb: 82, r: 14, col: '#2ec27e', e: '🚌' },
    { m: 120, wb: 86, r: 15, col: '#9b5de5', e: '🚛' },
  ];
  // השלבים: קצה הגדה השמאלית והימנית (x, וגובה הכביש), עוגנים נוספים על הצוקים, עמודי סלע עם עוגן, והרכב
  const LV = [
    { xL: 420, xR: 540, y: 270, v: 0 },
    { xL: 390, xR: 570, y: 270, an: [[390, 360], [570, 360]], v: 0 },
    { xL: 360, xR: 600, y: 270, v: 0 },
    { xL: 330, xR: 630, y: 270, an: [[330, 390], [630, 390]], v: 1 },
    { xL: 300, xR: 660, y: 270, pil: [[480, 360]], v: 1 },
    { xL: 300, xR: 660, y: 270, v: 2 },
    { xL: 300, xR: 660, yL: 300, yR: 240, v: 2 },
    { xL: 270, xR: 690, y: 270, an: [[270, 390], [690, 390]], v: 2 },
    { xL: 240, xR: 720, y: 270, pil: [[480, 330]], v: 3 },
    { xL: 240, xR: 720, y: 270, v: 3 },
    { xL: 210, xR: 750, y: 270, an: [[210, 360], [750, 360]], v: 3 },
    { xL: 180, xR: 780, y: 270, pil: [[480, 330]], v: 4 },
    { xL: 180, xR: 780, yL: 300, yR: 240, an: [[180, 390], [780, 360]], pil: [[420, 360]], v: 3 },
    { xL: 180, xR: 780, y: 270, pil: [[360, 360], [600, 360]], v: 5 },
    { xL: 150, xR: 810, y: 270, an: [[150, 360], [810, 360]], pil: [[390, 390], [570, 390]], v: 5 },
  ];
  // פתרונות ייחוס (נמצאו בחיפוש): קורות [x1,y1,x2,y2,חומר] ביחידות רשת, וחומר 0 כביש, 1 עץ, 2 פלדה
  const SOLS = [
    "14,9,18,9,0",
    "13,9,16,9,0;16,9,19,9,0;13,9,16,7,1;16,7,19,9,1;16,9,16,7,1",
    "12,9,16,9,0;16,9,20,9,0;12,9,14,7,1;14,7,16,9,1;14,7,18,7,1;16,9,18,7,1;18,7,20,9,1",
    "11,9,13,9,0;13,9,15,9,0;15,9,17,9,0;17,9,19,9,0;19,9,21,9,0;11,13,13,9,2;11,13,15,9,2;21,13,19,9,2;21,13,17,9,2",
    "10,9,13,9,0;13,9,16,9,0;10,9,13,8,2;13,8,16,9,2;13,9,13,8,2;16,9,19,9,0;19,9,22,9,0;16,9,19,8,2;19,8,22,9,2;19,9,19,8,2;16,12,16,9,2",
    "10,9,14,9,0;14,9,18,9,0;18,9,22,9,0;10,9,14,7,2;18,7,22,9,2;14,9,14,7,2;18,9,18,7,2;14,7,18,7,2;14,7,18,9,2",
    "10,10,14,9,0;14,9,18,9,0;18,9,22,8,0;10,10,14,11,2;18,11,22,8,2;14,9,14,11,2;18,9,18,11,2;14,11,18,11,2;14,11,18,9,2",
    "9,9,11,9,0;11,9,13,9,0;13,9,15,9,0;15,9,17,9,0;17,9,19,9,0;19,9,21,9,0;21,9,23,9,0;9,9,11,8,2;21,8,23,9,2;11,9,11,8,2;13,9,13,8,2;15,9,15,8,2;17,9,17,8,2;19,9,19,8,2;21,9,21,8,2;11,8,13,8,2;13,8,15,8,2;15,8,17,8,2;17,8,19,8,2;19,8,21,8,2;11,8,13,9,2;13,8,15,9,2;15,8,17,9,2;17,9,19,8,2;19,9,21,8,2;9,13,11,9,2;9,13,13,9,2;23,13,21,9,2;23,13,19,9,2",
    "8,9,12,9,0;12,9,16,9,0;8,9,12,7,2;12,7,16,9,2;12,9,12,7,2;16,9,20,9,0;20,9,24,9,0;16,9,20,7,2;20,7,24,9,2;20,9,20,7,2;16,11,16,9,2",
    "8,9,12,9,0;12,9,16,9,0;16,9,20,9,0;20,9,24,9,0;8,9,12,12,2;20,12,24,9,2;12,9,12,12,2;16,9,16,12,2;20,9,20,12,2;12,12,16,12,2;16,12,20,12,2;12,12,16,9,2;16,9,20,12,2",
    "7,9,10,9,0;10,9,13,9,0;13,9,16,9,0;16,9,19,9,0;19,9,22,9,0;22,9,25,9,0;7,9,10,6,2;22,6,25,9,2;10,9,10,6,2;13,9,13,6,2;16,9,16,6,2;19,9,19,6,2;22,9,22,6,2;10,6,13,6,2;13,6,16,6,2;16,6,19,6,2;19,6,22,6,2;10,6,13,9,2;13,6,16,9,2;16,9,19,6,2;19,9,22,6,2;7,12,10,9,2;25,12,22,9,2",
    "6,9,8,9,0;8,9,10,9,0;10,9,12,9,0;12,9,14,9,0;14,9,16,9,0;6,9,8,6,2;14,6,16,9,2;8,9,8,6,2;10,9,10,6,2;12,9,12,6,2;14,9,14,6,2;8,6,10,6,2;10,6,12,6,2;12,6,14,6,2;8,6,10,9,2;10,6,12,9,2;12,9,14,6,2;16,9,18,9,0;18,9,20,9,0;20,9,22,9,0;22,9,24,9,0;24,9,26,9,0;16,9,18,6,2;24,6,26,9,2;18,9,18,6,2;20,9,20,6,2;22,9,22,6,2;24,9,24,6,2;18,6,20,6,2;20,6,22,6,2;22,6,24,6,2;18,6,20,9,2;20,6,22,9,2;22,9,24,6,2;16,11,16,9,2",
    "6,10,10,10,0;10,10,14,9,0;6,10,10,6,2;10,6,14,9,2;10,10,10,6,2;14,9,18,9,0;18,9,22,8,0;22,8,26,8,0;14,9,18,5,2;22,4,26,8,2;18,9,18,5,2;22,8,22,4,2;18,5,22,4,2;18,5,22,8,2;14,12,14,9,2",
    "6,9,9,9,0;9,9,12,9,0;6,9,9,11,2;9,11,12,9,2;9,9,9,11,2;12,9,16,9,0;16,9,20,9,0;12,9,16,11,2;16,11,20,9,2;16,9,16,11,2;20,9,23,9,0;23,9,26,9,0;20,9,23,11,2;23,11,26,9,2;23,9,23,11,2;12,12,12,9,2;20,12,20,9,2",
    "5,9,9,9,0;9,9,13,9,0;5,9,9,11,2;9,11,13,9,2;9,9,9,11,2;13,9,16,9,0;16,9,19,9,0;13,9,16,11,2;16,11,19,9,2;16,9,16,11,2;19,9,23,9,0;23,9,27,9,0;19,9,23,11,2;23,11,27,9,2;23,9,23,11,2;13,13,13,9,2;19,13,19,9,2",
  ];
  const BUDGET = [350,900,1350,3400,3250,3700,3750,7700,4350,6000,9150,10950,7450,6100,6750];
  const decode = s => (s || '').split(';').filter(Boolean).map(t => { const a = t.split(',').map(Number); return [a[0] * G, a[1] * G, a[2] * G, a[3] * G, a[4]]; });
  const SOL = LV.map((_, i) => decode(SOLS[i]));

  function geo(n) {
    const L = LV[n - 1], yL = L.yL || L.y, yR = L.yR || L.y;
    const anchors = [[L.xL, yL], [L.xR, yR]].concat(L.an || [], (L.pil || []).map(p => [p[0], p[1]]));
    const ground = [[-300, yL, L.xL, yL], [L.xR, yR, W + 300, yR]].concat((L.pil || []).map(p => [p[0] - 30, p[1], p[0] + 30, p[1]]));
    const solid = [{ x0: -1e4, x1: L.xL, y0: yL }, { x0: L.xR, x1: 1e4, y0: yR }].concat((L.pil || []).map(p => ({ x0: p[0] - 30, x1: p[0] + 30, y0: p[1] })));
    return { n, xL: L.xL, xR: L.xR, yL, yR, v: L.v, pil: L.pil || [], anchors, ground, solid, finish: L.xR + 60 };
  }
  function solidAt(Gm, x, y) {
    if (y >= WATER - 6 || y < 30 || x < 0 || x > W) return true;
    for (const s of Gm.solid) if (x > s.x0 + 0.5 && x < s.x1 - 0.5 && y > s.y0 + 0.5) return true;
    return false;
  }
  const memberCost = (L, mt) => Math.round(L * MATS[mt].cost);
  const designCost = D => D.reduce((s, m) => s + memberCost(Math.hypot(m[2] - m[0], m[3] - m[1]), m[4]), 0);
  const starsFor = (cost, budget) => (cost <= budget * 0.75 ? 3 : cost <= budget * 0.9 ? 2 : 1);

  // ================= פיזיקה =================
  function buildWorld(n, D, vs) {
    const Gm = geo(n), V = VEH[Gm.v], mass = V.m * (vs || 1);
    const Wd = { n, geo: Gm, P: [], M: [], C: [], wheels: [], car: null, t: 0, ev: [], status: 'run', maxS: 0, maxX: 0, progT: 0, flipT: 0, go: false };
    const idx = new Map();
    const pt = (x, y, fixed) => { const k = x + ',' + y; if (idx.has(k)) return idx.get(k); const i = Wd.P.length; Wd.P.push({ x, y, px: x, py: y, vx: 0, vy: 0, m: fixed ? 0 : 0.5, w: 0, fixed, joint: true }); idx.set(k, i); return i; };
    for (const [x, y] of Gm.anchors) pt(x, y, true);
    for (const [x1, y1, x2, y2, mt] of D) {
      const a = pt(x1, y1, false), b = pt(x2, y2, false), M = MATS[mt], L0 = Math.hypot(x2 - x1, y2 - y1);
      Wd.M.push({ a, b, mat: mt, L0, alpha: L0 / M.EA, fs: 0, fa: 0, stress: 0, broken: false });
      const mm = M.dens * L0 / 2;
      if (!Wd.P[a].fixed) Wd.P[a].m += mm;
      if (!Wd.P[b].fixed) Wd.P[b].m += mm;
    }
    // הקרקע: קטעים קבועים שהגלגלים נוסעים עליהם
    Wd.ground = Gm.ground.map(([x1, y1, x2, y2]) => { const a = Wd.P.length; Wd.P.push({ x: x1, y: y1, px: x1, py: y1, vx: 0, vy: 0, m: 0, w: 0, fixed: true }); Wd.P.push({ x: x2, y: y2, px: x2, py: y2, vx: 0, vy: 0, m: 0, w: 0, fixed: true }); return [a, a + 1]; });
    // הרכב: שני גלגלים ושתי נקודות גוף, מחוברים במסגרת קשיחה
    const x0 = 26, yg = Gm.yL, r = V.r, hb = r + 22;
    const add = (x, y, m) => { const i = Wd.P.length; Wd.P.push({ x, y, px: x, py: y, vx: 0, vy: 0, m, w: 1 / m, fixed: false, car: true }); return i; };
    const rw = add(x0, yg - r, mass * 0.32), fw = add(x0 + V.wb, yg - r, mass * 0.32);
    const cr = add(x0 + 6, yg - r - hb, mass * 0.18), cf = add(x0 + V.wb - 6, yg - r - hb, mass * 0.18);
    const q = [rw, fw, cr, cf];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = Wd.P[q[i]], b = Wd.P[q[j]]; Wd.C.push({ a: q[i], b: q[j], L0: Math.hypot(b.x - a.x, b.y - a.y) }); }
    Wd.car = { rw, fw, cr, cf, r, type: Gm.v, roll: 0 };
    Wd.wheels = [{ i: rw, c: null, ghost: null }, { i: fw, c: null, ghost: null }];
    for (const p of Wd.P) p.w = p.fixed ? 0 : 1 / p.m;
    // כביש שנבנה בתוך הרכב עצמו (מעל הגדה, במקום שבו הוא עומד): הגלגל עובר דרכו עד שהם נפרדים.
    // בלי זה הדחיפה הראשונה הייתה מעיפה את הקורה ואת הרכב באלפי פיקסלים בשנייה
    for (const wh of Wd.wheels) {
      const p = Wd.P[wh.i];
      for (const m of Wd.M) if (m.mat === 0 && segDist(p.x, p.y, Wd.P[m.a].x, Wd.P[m.a].y, Wd.P[m.b].x, Wd.P[m.b].y) < r + 1) (wh.ghost || (wh.ghost = new Set())).add(m);
    }
    return Wd;
  }

  function contact(Wd, wh, r, ia, ib) {
    const P = Wd.P, p = P[wh.i], a = P[ia], b = P[ib];
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    if (L2 < 1e-6) return;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + dx * t, qy = a.y + dy * t;
    let nx = p.x - qx, ny = p.y - qy;
    const d = Math.sqrt(nx * nx + ny * ny);
    if (d >= r || d < 1e-9) return;
    nx /= d; ny /= d;
    const wa = a.w * (1 - t), wb = b.w * t, ws = p.w + wa * (1 - t) + wb * t;
    const dl = (r - d) / ws;
    p.x += p.w * dl * nx; p.y += p.w * dl * ny;
    a.x -= wa * dl * nx; a.y -= wa * dl * ny;
    b.x -= wb * dl * nx; b.y -= wb * dl * ny;
    wh.c = { nx, ny, a: ia, b: ib, t };
  }

  function substep(Wd, grav) {
    const P = Wd.P, h2 = HS * HS;
    for (const p of P) if (p.w) { p.vy += grav * HS; p.px = p.x; p.py = p.y; p.x += p.vx * HS; p.y += p.vy * HS; }
    for (const m of Wd.M) {
      if (m.broken) continue;
      const a = P[m.a], b = P[m.b], ws = a.w + b.w;
      if (!ws) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
      const dl = -(d - m.L0) / (ws + m.alpha / h2), nx = dx / d, ny = dy / d;
      a.x -= a.w * dl * nx; a.y -= a.w * dl * ny; b.x += b.w * dl * nx; b.y += b.w * dl * ny;
      m.fs -= dl / h2;
    }
    for (const c of Wd.C) {
      const a = P[c.a], b = P[c.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
      const dl = -(d - c.L0) / (a.w + b.w), nx = dx / d, ny = dy / d;
      a.x -= a.w * dl * nx; a.y -= a.w * dl * ny; b.x += b.w * dl * nx; b.y += b.w * dl * ny;
    }
    const r = Wd.car.r;
    for (const wh of Wd.wheels) {
      wh.c = null;
      for (const m of Wd.M) if (!m.broken && m.mat === 0 && !(wh.ghost && wh.ghost.has(m))) contact(Wd, wh, r, m.a, m.b);
      for (const [a, b] of Wd.ground) contact(Wd, wh, r, a, b);
    }
    for (const p of P) if (p.w) { p.vx = (p.x - p.px) / HS; p.vy = (p.y - p.py) / HS; if (!p.car) { p.vx *= 0.9996; p.vy *= 0.9996; } }
    // שיכוך לאורך הקורות: רעידות קטנות נעלמות, והגשר נרגע
    for (const m of Wd.M) {
      if (m.broken) continue;
      const a = P[m.a], b = P[m.b], ws = a.w + b.w;
      if (!ws) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-9, nx = dx / d, ny = dy / d;
      const k = ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * DAMP / ws;
      a.vx += a.w * k * nx; a.vy += a.w * k * ny; b.vx -= b.w * k * nx; b.vy -= b.w * k * ny;
    }
    // המנוע: גלגל שנוגע בכביש נדחף קדימה לאורך המשטח
    if (Wd.go) for (const wh of Wd.wheels) {
      const c = wh.c;
      if (!c) continue;
      let tx = -c.ny, ty = c.nx;
      if (tx < 0) { tx = -tx; ty = -ty; }
      const a = P[c.a], b = P[c.b], p = P[wh.i];
      const sx = a.vx * (1 - c.t) + b.vx * c.t, sy = a.vy * (1 - c.t) + b.vy * c.t;
      const vt = (p.vx - sx) * tx + (p.vy - sy) * ty;
      const dv = Math.max(-ACC * HS, Math.min(ACC * HS, SPEED - vt));
      p.vx += tx * dv; p.vy += ty * dv;
    }
  }

  // צעד של 1/60 שנייה: תתי-צעדים, כוחות ממוצעים, שבירה ומצב הרכב
  function stepWorld(Wd) {
    Wd.t++;
    if (Wd.t === START && !Wd.noDrive) Wd.go = true;
    for (const m of Wd.M) m.fs = 0;
    const grav = GRAV * Math.min(1, Wd.t / SETTLE);
    for (let s = 0; s < NSUB; s++) substep(Wd, grav);
    for (const wh of Wd.wheels) if (wh.ghost) {
      const p = Wd.P[wh.i];
      for (const m of wh.ghost) if (m.broken || segDist(p.x, p.y, Wd.P[m.a].x, Wd.P[m.a].y, Wd.P[m.b].x, Wd.P[m.b].y) > Wd.car.r + 2) wh.ghost.delete(m);
      if (!wh.ghost.size) wh.ghost = null;
    }
    for (const m of Wd.M) {
      if (m.broken) continue;
      m.fa = m.fs / NSUB;
      m.stress = Math.abs(m.fa) / MATS[m.mat].str;
      if (m.stress > Wd.maxS) Wd.maxS = m.stress;
      if (m.stress > 1) { m.broken = true; Wd.ev.push({ t: 'break', m }); }
    }
    if (Wd.status !== 'run') return;
    const P = Wd.P, c = Wd.car, rw = P[c.rw], fw = P[c.fw];
    c.roll += (Math.hypot(rw.vx, rw.vy) / 60) * Math.sign(rw.vx || 1);
    for (const i of [c.rw, c.fw, c.cr, c.cf]) if (P[i].y > WATER) { Wd.status = 'fall'; Wd.ev.push({ t: 'splash', x: P[i].x }); return; }
    if (rw.x > Wd.geo.finish) { Wd.status = 'win'; return; }
    const ang = Math.atan2(fw.y - rw.y, fw.x - rw.x);
    if (Math.abs(ang) > 1.25) { if (++Wd.flipT > 40) { Wd.status = 'stuck'; return; } } else Wd.flipT = 0;
    if (rw.x > Wd.maxX + 2) { Wd.maxX = rw.x; Wd.progT = Wd.t; }
    if ((Wd.go && Wd.t - Wd.progT > 240 && Wd.t > START + 60) || Wd.t > TMAX) Wd.status = 'stuck';
  }

  // ================= מצב המשחק =================
  function refresh(S) {
    const J = [], seen = new Set();
    for (const [x, y] of S.geo.anchors) { J.push({ x, y, a: true }); seen.add(x + ',' + y); }
    for (const m of S.D) for (const [x, y] of [[m[0], m[1]], [m[2], m[3]]]) { const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); J.push({ x, y, a: false }); } }
    S.J = J;
    S.cost = designCost(S.D);
  }
  function newState(g, n) {
    const S = {
      lv: n, geo: geo(n), mode: 'build', D: [], J: [], undo: [], mat: 0, tool: 'build', sel: null, drag: null, hover: null, hoverBtn: null,
      World: null, result: null, resT: 0, fails: 0, hint: false, debris: [], clock: 0, botT: 0, budget: BUDGET[n - 1] || 3000, cost: 0,
      errT: 0, err: '', engT: 0, creak: 0, confetti: 0,
    };
    return S;
  }
  const saveD = g => { if (!g.demo) g.save('d' + g.s.lv, g.s.D.map(m => m.map((v, i) => (i < 4 ? v / G : v)))); };
  function loadD(g, n) {
    const d = g.load('d' + n, null);
    if (!Array.isArray(d)) return [];
    return d.filter(m => Array.isArray(m) && m.length === 5).map(m => [m[0] * G, m[1] * G, m[2] * G, m[3] * G, m[4] | 0]);
  }
  function pushUndo(S) { S.undo.push(JSON.stringify(S.D)); if (S.undo.length > 60) S.undo.shift(); }
  function sameSeg(m, x1, y1, x2, y2) { return (m[0] === x1 && m[1] === y1 && m[2] === x2 && m[3] === y2) || (m[0] === x2 && m[1] === y2 && m[2] === x1 && m[3] === y1); }

  // הוספת קורה — אותה פונקציה לעכבר, למגע, למקלדת ולבוט
  function addMember(g, x1, y1, x2, y2, mt) {
    const S = g.s;
    if (x1 === x2 && y1 === y2) return 'same';
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L > MATS[mt].maxL + 0.01) return 'long';
    if (solidAt(S.geo, x1, y1) || solidAt(S.geo, x2, y2)) return 'solid';
    const old = S.D.findIndex(m => sameSeg(m, x1, y1, x2, y2));
    if (old >= 0 && S.D[old][4] === mt) return 'dup';
    const extra = memberCost(L, mt) - (old >= 0 ? memberCost(L, S.D[old][4]) : 0);
    if (S.cost + extra > S.budget) return 'budget';
    if (old < 0 && S.D.length >= MAXM) return 'max';
    pushUndo(S);
    if (old >= 0) S.D[old][4] = mt; else S.D.push([x1, y1, x2, y2, mt]);
    refresh(S); saveD(g);
    return 'ok';
  }
  function removeAt(g, x, y) {
    const S = g.s;
    const f = S.fat ? 1.7 : 1;                      // אצבע: אזורי פגיעה גדולים יותר
    const j = S.J.find(p => !p.a && Math.hypot(p.x - x, p.y - y) < 12 * f);
    let hit = [];
    if (j) hit = S.D.filter(m => (m[0] === j.x && m[1] === j.y) || (m[2] === j.x && m[3] === j.y));
    else {
      let best = null, bd = 9 * f;
      for (const m of S.D) { const d = segDist(x, y, m[0], m[1], m[2], m[3]); if (d < bd) { bd = d; best = m; } }
      if (best) hit = [best];
    }
    if (!hit.length) return false;
    pushUndo(S);
    S.D = S.D.filter(m => !hit.includes(m));
    refresh(S); saveD(g);
    g.sfx('pop', { p: 0.7 });
    for (const m of hit) g.burst((m[0] + m[2]) / 2, (m[1] + m[3]) / 2, { n: 8, color: [MATS[m[4]].col, MATS[m[4]].lt], speed: 2, life: 22, gravity: 0.15, shape: 'square', size: 4 });
    return true;
  }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
  }
  const jointNear = (S, x, y, r) => { let best = null, bd = r; for (const p of S.J) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; };
  // נקודת הסוף: הנקודה על הרשת הכי קרובה לסמן שלא רחוקה מדי מההתחלה
  function target(S, x, y) {
    const s = S.sel, maxL = MATS[S.mat].maxL;
    const j = jointNear(S, x, y, S.fat ? 24 : 14);
    if (j && Math.hypot(j.x - s.x, j.y - s.y) <= maxL + 0.01) return { x: j.x, y: j.y };
    let bx = Math.round(x / G) * G, by = Math.round(y / G) * G;
    if (Math.hypot(bx - s.x, by - s.y) <= maxL + 0.01) return { x: bx, y: by };
    let best = null, bd = 1e9;
    for (let gx = s.x - maxL; gx <= s.x + maxL; gx += G) for (let gy = s.y - maxL; gy <= s.y + maxL; gy += G) {
      if (Math.hypot(gx - s.x, gy - s.y) > maxL + 0.01 || (gx === s.x && gy === s.y)) continue;
      const d = Math.hypot(gx - x, gy - y);
      if (d < bd) { bd = d; best = { x: gx, y: gy }; }
    }
    return best;
  }
  function tryPlace(g, tx, ty) {
    const S = g.s, s = S.sel;
    const r = addMember(g, s.x, s.y, tx, ty, S.mat);
    if (r === 'ok') {
      g.sfx('place', { p: [1, 1.15, 0.8][S.mat] });
      if (S.mat === 2) g.tone({ type: 'square', f: 640, f2: 520, dur: 0.06, vol: 0.04 });
      g.burst(tx, ty, { n: 6, color: [MATS[S.mat].lt, '#ffffff'], speed: 1.6, life: 16, size: 3, gravity: 0 });
      return true;
    }
    if (r === 'budget') { S.err = 'over'; S.errT = 80; g.sfx('error'); g.msg(g.t('over'), 1100, '#ff8a80'); }
    else if (r !== 'dup') { g.sfx('error'); S.errT = 30; S.err = ''; }
    return false;
  }
  function doUndo(g) {
    const S = g.s;
    if (!S.undo.length || S.mode !== 'build') return;
    S.D = JSON.parse(S.undo.pop()); S.sel = null;
    refresh(S); saveD(g); g.sfx('click', { p: 0.8 });
  }
  function startTest(g) {
    const S = g.s;
    if (S.mode !== 'build') return;
    S.mode = 'test'; S.sel = null; S.drag = null; S.result = null; S.resT = 0; S.debris.length = 0;
    S.World = buildWorld(S.lv, S.D, 1);
    g.sfx('start');
  }
  function stopTest(g) {
    const S = g.s;
    if (S.mode !== 'test' || S.result === 'win') return;
    S.mode = 'build'; S.World = null; S.result = null; S.debris.length = 0;
    g.sfx('click');
  }

  function testStep(g) {
    const S = g.s, Wd = S.World;
    if (!Wd || S.resT > 600) return;
    const before = Wd.status;
    stepWorld(Wd);
    for (const e of Wd.ev) {
      if (e.t === 'break') {
        const m = e.m, a = Wd.P[m.a], b = Wd.P[m.b], M = MATS[m.mat], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x);
        for (const s of [-1, 1]) if (S.debris.length < 40) S.debris.push({ x: mx + Math.cos(ang) * m.L0 * 0.25 * s, y: my + Math.sin(ang) * m.L0 * 0.25 * s, a: ang, L: m.L0 * 0.48, mt: m.mat, vx: (a.vx + b.vx) / 120 + s * 0.6, vy: (a.vy + b.vy) / 120 - 1, va: s * (0.04 + Math.random() * 0.05) });
        g.burst(mx, my, { n: 16, color: [M.col, M.lt, M.dk], speed: 3.5, life: 34, gravity: 0.2, shape: 'square', size: 5 });
        if (m.mat === 2) { g.tone({ type: 'triangle', f: 1100, f2: 320, dur: 0.25, vol: 0.14 }); g.noise({ filter: 'highpass', f: 3000, f2: 900, dur: 0.18, vol: 0.12 }); }
        else g.sfx('break', { p: m.mat === 0 ? 0.6 : 1 });
        g.shake(m.mat === 1 ? 4 : 6);
      } else if (e.t === 'splash') {
        g.sfx('splash'); g.burst(e.x, WATER, { n: 30, color: ['#ffffff', '#bfe9ff', '#7cc8f0'], speed: 4.5, life: 40, gravity: 0.2, spread: Math.PI * 0.8, dir: -Math.PI / 2 });
        g.shake(8);
      }
    }
    Wd.ev.length = 0;
    // צליל מנוע עדין וחריקות כשקורה קרובה לשבירה
    if (Wd.go && Wd.status === 'run' && ++S.engT % 7 === 0) g.tone({ type: 'sawtooth', f: 62 + VEH[Wd.geo.v].m * 0.05, dur: 0.07, vol: 0.025 });
    let hot = 0;
    for (const m of Wd.M) if (!m.broken && m.stress > 0.85) hot++;
    if (hot && ++S.creak % 24 === 0) g.noise({ filter: 'bandpass', f: 380 + Math.random() * 200, dur: 0.16, vol: 0.06, q: 6 });
    if (before === 'run' && Wd.status !== 'run') {
      if (Wd.status === 'win') {
        S.result = 'win'; S.resT = 0;
        g.sfx('power'); g.flash('#fff6c2', 0.2);
      } else {
        S.result = Wd.status; S.resT = 0; S.fails++;
        g.save('fails' + S.lv, S.fails);
        g.after(0.5, () => { if (g.s === S && S.result && S.result !== 'win') g.sfx('lose'); });
      }
    }
    if (S.result) S.resT++;
    if (S.result === 'win') {
      if (S.resT % 6 === 0 && S.resT < 70) g.burst(g.rnd(200, 760), g.rnd(60, 160), { n: 12, color: ['#ffd166', '#ff5a5a', '#3fa9f5', '#2ec27e', '#ffffff'], speed: 3, life: 60, gravity: 0.08, shape: 'square', size: 6 });
      if (S.resT === 90) g.completeLevel(starsFor(S.cost, S.budget), { text: g.t('cost', { c: money(S.cost), b: money(S.budget) }) });
    }
    for (let i = S.debris.length - 1; i >= 0; i--) {
      const d = S.debris[i];
      d.vy += 0.2; d.x += d.vx; d.y += d.vy; d.a += d.va;
      if (d.y > WATER + 4) { g.burst(d.x, WATER, { n: 8, color: ['#ffffff', '#bfe9ff'], speed: 2.4, life: 26, gravity: 0.18, spread: Math.PI * 0.7, dir: -Math.PI / 2 }); if (Math.random() < 0.5) g.sfx('splash'); S.debris.splice(i, 1); }
    }
  }
  const money = v => '$' + Math.round(v).toLocaleString('en-US');

  // ================= כפתורים על הקנבס =================
  const TB_Y = 488, TB_H = 40;
  function buttons(g) {
    const S = g.s, out = [];
    if (S.mode === 'build') {
      for (let i = 0; i < 3; i++) out.push({ id: 'm' + i, x: 14 + i * 104, y: TB_Y, w: 98, h: TB_H });
      out.push({ id: 'undo', x: 330, y: TB_Y, w: 42, h: TB_H }, { id: 'erase', x: 378, y: TB_Y, w: 42, h: TB_H }, { id: 'clear', x: 426, y: TB_Y, w: 42, h: TB_H });
      if (S.fails >= 2 && SOL[S.lv - 1].length) out.push({ id: 'hint', x: 474, y: TB_Y, w: 42, h: TB_H });
      out.push({ id: 'test', x: 790, y: TB_Y - 2, w: 156, h: TB_H + 4 });
    } else if (S.result !== 'win') {
      out.push({ id: 'stop', x: 790, y: TB_Y - 2, w: 156, h: TB_H + 4 });
      if (S.result) out.push({ id: 'edit', x: W / 2 - 160, y: 286, w: 150, h: 50 }, { id: 'retry', x: W / 2 + 10, y: 286, w: 150, h: 50 });
    }
    return out;
  }
  function press(g, id) {
    const S = g.s;
    if (id[0] === 'm') { S.mat = +id[1]; S.tool = 'build'; g.sfx('click', { p: 1 + S.mat * 0.1 }); }
    else if (id === 'undo') doUndo(g);
    else if (id === 'erase') { S.tool = S.tool === 'erase' ? 'build' : 'erase'; S.sel = null; g.sfx('click'); }
    else if (id === 'clear') { if (S.D.length) { pushUndo(S); S.D = []; S.sel = null; refresh(S); saveD(g); g.sfx('boom', { p: 1.6 }); } }
    else if (id === 'hint') { S.hint = !S.hint; g.sfx('click'); }
    else if (id === 'test') startTest(g);
    else if (id === 'stop' || id === 'edit') stopTest(g);
    else if (id === 'retry') { stopTest(g); startTest(g); }
  }
  const btnAt = (g, x, y) => buttons(g).find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);

  // ================= ציור =================
  const layers = {};
  function layer(ctx, name, paint) {
    const k = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
    let L = layers[name];
    if (!L || L.k !== k) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * k); c.height = Math.round(H * k);
      const x = c.getContext('2d'); x.scale(k, k); paint(x, GK.U);
      L = layers[name] = { c, k };
      if (name.startsWith('ter')) for (const o of Object.keys(layers)) if (o !== name && o.startsWith('ter')) delete layers[o];
    }
    ctx.drawImage(L.c, 0, 0, W, H);
  }
  function paintSky(ctx, k) {
    let gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#4aa3f0'); gr.addColorStop(0.55, '#a8dcff'); gr.addColorStop(1, '#e6f6ff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    gr = ctx.createRadialGradient(800, 80, 10, 800, 80, 160);
    gr.addColorStop(0, 'rgba(255,250,215,1)'); gr.addColorStop(0.3, 'rgba(255,240,170,.6)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = gr; ctx.fillRect(600, -80, 400, 330);
    k.circle(ctx, 800, 80, 34); ctx.fillStyle = '#fff7cf'; ctx.fill();
    const mount = (base, amp, seed, c1, c2) => {
      const rnd = k.seeded(seed);
      ctx.beginPath(); ctx.moveTo(0, H);
      let x = 0, y = base;
      while (x <= W + 40) { ctx.lineTo(x, y); x += 40 + rnd() * 60; y = base - rnd() * amp; }
      ctx.lineTo(W, H); ctx.closePath();
      const g2 = ctx.createLinearGradient(0, base - amp, 0, base + 80); g2.addColorStop(0, c1); g2.addColorStop(1, c2);
      ctx.fillStyle = g2; ctx.fill();
    };
    mount(250, 120, 3, '#9fb8dc', '#c9dbef');
    mount(300, 90, 8, '#7fa3c9', '#a9c4e0');
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [x, y, s] of [[120, 70, 1], [420, 46, 0.8], [600, 110, 0.7]]) for (const [dx, dy, r] of [[0, 0, 20], [22, -10, 24], [46, 0, 19], [22, 6, 20]]) { k.circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
  }
  function rockFill(ctx, k, x0, y0, x1, seed) {
    const gr = ctx.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, '#b9773f'); gr.addColorStop(0.4, '#9a5f30'); gr.addColorStop(1, '#6e4120');
    ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1 - x0, H - y0);
    const rnd = k.seeded(seed);
    ctx.strokeStyle = 'rgba(70,38,14,.35)'; ctx.lineWidth = 2;
    for (let y = y0 + 26; y < H; y += 26 + rnd() * 10) { ctx.beginPath(); ctx.moveTo(x0, y); for (let x = x0; x <= x1; x += 30) ctx.lineTo(x, y + (rnd() - 0.5) * 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,220,170,.12)';
    for (let i = 0; i < (x1 - x0) / 14; i++) { ctx.beginPath(); ctx.ellipse(x0 + rnd() * (x1 - x0), y0 + 20 + rnd() * (H - y0 - 20), 6 + rnd() * 8, 3 + rnd() * 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  function paintTerrain(Gm) {
    return (ctx, k) => {
      // אדמת קרקעית הנהר
      ctx.fillStyle = '#5b3a1f'; ctx.fillRect(0, WATER + 30, W, H);
      // הקיר הרחוק של הקניון, באובך כחלחל — נותן לפער עומק
      {
        const rnd = k.seeded(41 + Gm.n), top = Math.max(Gm.yL, Gm.yR) + 46;
        ctx.beginPath(); ctx.moveTo(Gm.xL, WATER + 12);
        for (let x = Gm.xL; ; x += 12 + rnd() * 18) { const xx = Math.min(x, Gm.xR); ctx.lineTo(xx, top + Math.sin(xx * 0.021) * 10 + (rnd() - 0.5) * 12); if (xx >= Gm.xR) break; }
        ctx.lineTo(Gm.xR, WATER + 12); ctx.closePath();
        const gr = ctx.createLinearGradient(0, top - 16, 0, WATER);
        gr.addColorStop(0, 'rgba(146,156,190,.6)'); gr.addColorStop(1, 'rgba(84,92,128,.88)');
        ctx.fillStyle = gr; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.strokeStyle = 'rgba(40,50,80,.16)'; ctx.lineWidth = 2;
        for (let y = top + 22; y < WATER; y += 24) { ctx.beginPath(); ctx.moveTo(Gm.xL, y); for (let x = Gm.xL; x <= Gm.xR + 30; x += 30) ctx.lineTo(x, y + (rnd() - 0.5) * 6); ctx.stroke(); }
        ctx.restore();
      }
      for (const p of Gm.pil) {
        const x0 = p[0] - 30, x1 = p[0] + 30;
        const gr = ctx.createLinearGradient(x0, 0, x1, 0);
        gr.addColorStop(0, '#7d8794'); gr.addColorStop(0.5, '#a9b3bf'); gr.addColorStop(1, '#6c7480');
        ctx.fillStyle = gr; ctx.fillRect(x0 + 4, p[1], x1 - x0 - 8, H - p[1]);
        ctx.strokeStyle = 'rgba(50,58,70,.35)'; ctx.lineWidth = 2;
        for (let y = p[1] + 24; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x1 - 4, y); ctx.stroke(); }
        k.rr(ctx, x0, p[1] - 4, x1 - x0, 12, 4); ctx.fillStyle = '#c3ccd6'; ctx.fill();
      }
      for (const [x0, x1, y, seed] of [[-10, Gm.xL, Gm.yL, 5], [Gm.xR, W + 10, Gm.yR, 9]]) {
        rockFill(ctx, k, x0, y, x1, seed);
        // דשא וכביש על הגדה
        k.rr(ctx, x0 - 4, y - 6, x1 - x0 + 8, 16, 6); ctx.fillStyle = '#5cbf47'; ctx.fill();
        ctx.fillStyle = '#86e06a'; ctx.fillRect(x0, y - 6, x1 - x0, 4);
        ctx.fillStyle = '#4b505e'; ctx.fillRect(x0, y - 4, x1 - x0, 8);
        ctx.fillStyle = '#ffd84d';
        for (let x = x0 + 8; x < x1 - 14; x += 34) ctx.fillRect(x, y - 1, 16, 2.4);
      }
      // עצים קטנים על הגדות
      for (const [x, y] of [[Math.max(24, Gm.xL - 120), Gm.yL], [Math.min(W - 30, Gm.xR + 140), Gm.yR]]) {
        ctx.fillStyle = '#6b4a35'; ctx.fillRect(x - 3, y - 34, 6, 30);
        for (const [dx, dy, r] of [[0, -46, 18], [-12, -36, 13], [12, -36, 13]]) { k.circle(ctx, x + dx, y + dy, r); ctx.fillStyle = '#3f8f45'; ctx.fill(); }
        k.circle(ctx, x - 5, y - 52, 8); ctx.fillStyle = '#5fb35f'; ctx.fill();
      }
    };
  }
  function drawWater(ctx, t) {
    const gr = ctx.createLinearGradient(0, WATER, 0, H);
    gr.addColorStop(0, 'rgba(64,164,223,.92)'); gr.addColorStop(1, 'rgba(22,86,150,.96)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, WATER + Math.sin(x * 0.03 + t * 2) * 2.5);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) { const y = WATER + Math.sin(x * 0.03 + t * 2) * 2.5; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    for (let i = 0; i < 9; i++) { const x = ((i * 113 + t * 26) % (W + 60)) - 30; ctx.fillRect(x, WATER + 14 + (i % 3) * 14, 24, 2); }
  }
  function stressCol(s) {
    s = Math.max(0, Math.min(1, s));
    const a = s < 0.5 ? [61, 220, 110] : [255, 210, 61], b = s < 0.5 ? [255, 210, 61] : [255, 59, 48], u = s < 0.5 ? s * 2 : (s - 0.5) * 2;
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * u) + ',' + Math.round(a[1] + (b[1] - a[1]) * u) + ',' + Math.round(a[2] + (b[2] - a[2]) * u) + ')';
  }
  function drawMember(ctx, x1, y1, x2, y2, mt, tint, alpha) {
    const M = MATS[mt];
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.strokeStyle = M.dk; ctx.lineWidth = M.w + 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = tint || M.col; ctx.lineWidth = M.w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (x2 - x1) / L, ny = (y2 - y1) / L;
    if (mt === 0) {
      ctx.strokeStyle = tint ? 'rgba(255,255,255,.55)' : '#ffd84d'; ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.moveTo(x1 + nx * 6, y1 + ny * 6); ctx.lineTo(x2 - nx * 6, y2 - ny * 6); ctx.stroke(); ctx.setLineDash([]);
    } else if (mt === 1) {
      ctx.strokeStyle = tint ? 'rgba(255,255,255,.35)' : M.lt; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1 - ny * 1.5, y1 + nx * 1.5); ctx.lineTo(x2 - ny * 1.5, y2 + nx * 1.5); ctx.stroke();
    } else {
      ctx.strokeStyle = tint ? 'rgba(255,255,255,.45)' : M.lt; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x1 - ny * 2, y1 + nx * 2); ctx.lineTo(x2 - ny * 2, y2 + nx * 2); ctx.stroke();
      ctx.fillStyle = M.dk;
      for (let d = 10; d < L - 6; d += 18) { ctx.beginPath(); ctx.arc(x1 + nx * d, y1 + ny * d, 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawJoint(k, ctx, x, y, anchor, hot) {
    if (anchor) {
      k.rr(ctx, x - 9, y - 9, 18, 18, 4); ctx.fillStyle = hot ? '#ffe08a' : '#ff6a3d'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#8a2d12'; ctx.stroke();
      k.circle(ctx, x, y, 3.2); ctx.fillStyle = '#ffe9dc'; ctx.fill();
    } else {
      k.circle(ctx, x, y, hot ? 7 : 5.5); ctx.fillStyle = hot ? '#fff6c2' : '#ffffff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#2b3140'; ctx.stroke();
    }
  }
  function drawWheel(k, ctx, x, y, r, rot) {
    k.circle(ctx, x, y, r); ctx.fillStyle = '#23252c'; ctx.fill();
    k.circle(ctx, x, y, r * 0.55); ctx.fillStyle = '#c8ced8'; ctx.fill();
    ctx.strokeStyle = '#6c7380'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = rot + i * 2.094; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); ctx.stroke(); }
    k.circle(ctx, x, y, r * 0.16); ctx.fillStyle = '#4a505c'; ctx.fill();
  }
  // הרכב מצויר לפי הגלגל האחורי והקדמי (סיבוב לפי השיפוע)
  function drawVehicle(k, ctx, type, rx, ry, fx, fy, roll) {
    const V = VEH[type], r = V.r, wb = Math.hypot(fx - rx, fy - ry) || V.wb, ang = Math.atan2(fy - ry, fx - rx);
    ctx.save();
    ctx.translate(rx, ry); ctx.rotate(ang);
    const body = (x, y, w, h, rad, col) => { k.rr(ctx, x, y, w, h, rad); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); };
    const win = (x, y, w, h) => { k.rr(ctx, x, y, w, h, 4); ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 2, y + 2, Math.max(2, w * 0.25), h - 4); };
    const head = (x, y) => { k.circle(ctx, x, y, 5); ctx.fillStyle = '#e0ac7e'; ctx.fill(); ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(x, y - 1, 5, Math.PI, 0); ctx.fill(); };
    const c = V.col, dk = GK.U.shade(c, -0.25);
    if (type === 0) {
      body(-r - 8, -r - 14, wb + 2 * r + 18, 17, 7, c);
      k.rr(ctx, 4, -r - 30, wb - 10, 18, 9); ctx.fillStyle = c; ctx.fill();
      win(10, -r - 27, (wb - 22) / 2 - 2, 12); win(10 + (wb - 22) / 2 + 2, -r - 27, (wb - 22) / 2, 12); head(wb - 10, -r - 20);
    } else if (type === 1) {
      body(-r - 8, -r - 16, wb * 0.55 + r + 8, 14, 4, dk);
      body(wb * 0.42, -r - 32, wb * 0.58 + r + 6, 31, 7, c);
      win(wb * 0.5, -r - 28, wb * 0.4, 12); head(wb * 0.7, -r - 21);
    } else if (type === 2) {
      body(-r - 8, -r - 38, wb + 2 * r + 16, 38, 9, c);
      for (let i = 0; i < 3; i++) win(-r - 2 + i * 22, -r - 33, 17, 12);
      win(wb + r - 16, -r - 33, 16, 14); head(wb + r - 8, -r - 25);
    } else if (type === 3 || type === 5) {
      const big = type === 5;
      k.rr(ctx, -r - 6, -r - 10, wb + 2 * r + 8, 8, 3); ctx.fillStyle = '#3a3f4b'; ctx.fill();
      body(-r - 10, -r - (big ? 52 : 46), wb * (big ? 0.82 : 0.78) + r, big ? 44 : 38, 5, big ? '#e9eef5' : '#f2f2f2');
      ctx.fillStyle = c; ctx.fillRect(-r - 6, -r - (big ? 30 : 26), wb * (big ? 0.82 : 0.78) + r - 8, 7);
      body(wb * (big ? 0.8 : 0.76), -r - 36, wb * (big ? 0.2 : 0.24) + r + 10, 35, 8, c);
      win(wb * (big ? 0.84 : 0.8) + 2, -r - 31, 15, 13); head(wb * (big ? 0.84 : 0.8) + 10, -r - 24);
    } else {
      body(-r - 10, -r - 42, wb + 2 * r + 20, 41, 9, c);
      for (let i = 0; i < 5; i++) win(-r - 3 + i * 21, -r - 36, 16, 13);
      win(wb + r - 4, -r - 36, 12, 18);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-r - 6, -r - 18, wb + 2 * r + 12, 3);
    }
    k.circle(ctx, wb + r + 6, -r - 8, 3); ctx.fillStyle = '#fff4b0'; ctx.fill();
    ctx.restore();
    drawWheel(k, ctx, rx, ry, r, roll);
    drawWheel(k, ctx, fx, fy, r, roll);
  }

  function drawToolbar(g, ctx, S) {
    g.rr(ctx, 6, TB_Y - 8, W - 12, TB_H + 16, 14); ctx.fillStyle = 'rgba(14,24,44,.82)'; ctx.fill();
    const hov = S.hoverBtn;
    for (const b of buttons(g)) {
      if (b.y < 400) continue;                      // כפתורי החלון (עריכה / שוב) מצוירים בחלון עצמו
      const on = (b.id[0] === 'm' && S.tool === 'build' && S.mat === +b.id[1]) || (b.id === 'erase' && S.tool === 'erase') || (b.id === 'hint' && S.hint);
      const isTest = b.id === 'test' || b.id === 'stop';
      g.rr(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.fillStyle = isTest ? (b.id === 'test' ? '#2ec27e' : '#ff8c42') : on ? '#ffd166' : hov === b.id ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)';
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#fff3c4' : 'rgba(255,255,255,.22)'; ctx.stroke();
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, ink = on || isTest ? '#13203a' : '#ffffff';
      if (b.id[0] === 'm') {
        const mt = +b.id[1];
        drawMember(ctx, b.x + 12, cy, b.x + 34, cy, mt);
        g.text(ctx, g.t(MATS[mt].id), b.x + 66, cy + 1, { size: 15, weight: 800, color: ink, maxW: 58 });
      } else if (b.id === 'undo') {
        ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx + 2, cy + 2, 9, Math.PI * 1.1, Math.PI * 2.4); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 6); ctx.lineTo(cx - 2, cy - 3); ctx.lineTo(cx - 10, cy + 5); ctx.closePath(); ctx.fill();
      } else if (b.id === 'erase') {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6);
        g.rr(ctx, -11, -6, 22, 12, 3); ctx.fillStyle = on ? '#13203a' : '#ff8fa3'; ctx.fill();
        ctx.fillStyle = on ? '#ffd166' : '#ffffff'; ctx.fillRect(-11, -6, 8, 12);
        ctx.restore();
      } else if (b.id === 'clear') {
        ctx.fillStyle = ink; ctx.fillRect(cx - 8, cy - 7, 16, 3); ctx.fillRect(cx - 3, cy - 10, 6, 3);
        g.rr(ctx, cx - 7, cy - 3, 14, 14, 2); ctx.fill();
      } else if (b.id === 'hint') {
        g.circle(ctx, cx, cy - 3, 8); ctx.fillStyle = on ? '#13203a' : '#ffe066'; ctx.fill();
        ctx.fillStyle = ink; ctx.fillRect(cx - 4, cy + 6, 8, 4);
      } else if (isTest) {
        if (b.id === 'test') { ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(b.x + 22, cy - 9); ctx.lineTo(b.x + 37, cy); ctx.lineTo(b.x + 22, cy + 9); ctx.closePath(); ctx.fill(); }
        else { ctx.fillStyle = ink; ctx.fillRect(b.x + 22, cy - 8, 15, 15); }
        g.text(ctx, g.t(b.id === 'test' ? 'test' : 'edit'), b.x + 94, cy + 1, { size: 19, weight: 900, color: ink, maxW: 100 });
      }
    }
    // התקציב: פס עם סימני כוכבים
    const bx = 530, bw = 236, by = TB_Y + 4, ratio = S.cost / S.budget;
    g.text(ctx, money(S.cost) + ' / ' + money(S.budget), bx + bw / 2, by + 6, { size: 15, weight: 800, color: S.errT > 0 && S.err === 'over' && S.clock % 12 < 6 ? '#ff8a80' : '#ffffff' });
    g.rr(ctx, bx, by + 18, bw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
    g.rr(ctx, bx, by + 18, Math.max(6, bw * Math.min(1, ratio)), 10, 5); ctx.fillStyle = ratio <= 0.75 ? '#2ec27e' : ratio <= 0.9 ? '#ffd166' : '#ff8c42'; ctx.fill();
    for (const [f, n] of [[0.75, 3], [0.9, 2]]) {
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(bx + bw * f - 1, by + 16, 2, 14);
      g.text(ctx, '★'.repeat(n), bx + bw * f - 2, by + 36, { size: 9, weight: 800, color: '#ffd166', align: 'right' });
    }
  }

  function drawScene(g, ctx, S) {
    const t = S.clock / 60, Gm = S.geo;
    layer(ctx, 'sky', paintSky);
    layer(ctx, 'ter' + Gm.n, paintTerrain(Gm));
    // דגל הסיום
    const fx = Gm.finish + 26, fy = Gm.yR - 4;
    ctx.fillStyle = '#e8edf5'; ctx.fillRect(fx - 2, fy - 62, 4, 62);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#222' : '#fff'; ctx.fillRect(fx + 2 + i * 7, fy - 62 + j * 7 + Math.sin(t * 4 + i) * 1.2, 7, 7); }
    const build = S.mode === 'build';
    // רשת הנקודות (רק בבנייה)
    if (build && !g.demo) {
      ctx.fillStyle = 'rgba(255,255,255,.32)';
      for (let x = 0; x <= W; x += G) for (let y = 30; y < WATER - 6; y += G) if (!solidAt(Gm, x, y)) ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    }
    if (build) {
      if (S.hint) for (const m of SOL[S.lv - 1]) { ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]); ctx.stroke(); ctx.setLineDash([]); }
      for (const m of S.D) if (m[4] !== 0) drawMember(ctx, m[0], m[1], m[2], m[3], m[4]);
      for (const m of S.D) if (m[4] === 0) drawMember(ctx, m[0], m[1], m[2], m[3], 0);
      // תצוגה מקדימה של הקורה הבאה
      if (S.sel && S.hover && !g.demo) {
        const tg = target(S, S.hover.x, S.hover.y);
        ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(S.sel.x, S.sel.y, MATS[S.mat].maxL, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (tg) {
          const L = Math.hypot(tg.x - S.sel.x, tg.y - S.sel.y), ok = !solidAt(Gm, tg.x, tg.y) && S.cost + memberCost(L, S.mat) <= S.budget;
          drawMember(ctx, S.sel.x, S.sel.y, tg.x, tg.y, S.mat, ok ? null : '#ff5a5a', 0.7);
          g.text(ctx, money(memberCost(L, S.mat)), (S.sel.x + tg.x) / 2, (S.sel.y + tg.y) / 2 - 16, { size: 13, weight: 800, color: ok ? '#ffffff' : '#ff8a80', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
        }
      }
      const pulse = !g.demo && S.D.length === 0 && S.lv <= 2;
      for (const p of S.J) drawJoint(g, ctx, p.x, p.y, p.a, (S.sel && S.sel.x === p.x && S.sel.y === p.y) || (pulse && p.a && p.y === Gm.yL && S.clock % 50 < 25));
      if (S.hover && !S.sel && S.tool === 'build' && !g.demo) { const j = jointNear(S, S.hover.x, S.hover.y, 14); if (j) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; g.circle(ctx, j.x, j.y, 11); ctx.stroke(); } }
      if (S.tool === 'erase' && S.hover && !g.demo) { ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 2.5; g.circle(ctx, S.hover.x, S.hover.y, 10); ctx.stroke(); }
      if (g.demo && S.showCar) { const V = VEH[Gm.v]; drawVehicle(g, ctx, Gm.v, S.showCar - V.wb / 2, Gm.yL - V.r - 5, S.showCar + V.wb / 2, Gm.yL - V.r - 5, 0); }
      else { const V = VEH[Gm.v]; drawVehicle(g, ctx, Gm.v, 26, Gm.yL - V.r, 26 + V.wb, Gm.yL - V.r, 0); }
    } else {
      const Wd = S.World, P = Wd.P;
      for (const pass of [1, 0]) for (const m of Wd.M) if (!m.broken && (m.mat === 0) === (pass === 0)) { const a = P[m.a], b = P[m.b]; drawMember(ctx, a.x, a.y, b.x, b.y, m.mat, stressCol(m.stress)); }
      for (const m of Wd.M) if (!m.broken) for (const i of [m.a, m.b]) { const p = P[i]; if (!p.fixed) { g.circle(ctx, p.x, p.y, 3.5); ctx.fillStyle = '#ffffff'; ctx.fill(); } }
      for (const [x, y] of Gm.anchors) drawJoint(g, ctx, x, y, true, false);
      for (const d of S.debris) { const c = Math.cos(d.a) * d.L / 2, s = Math.sin(d.a) * d.L / 2; drawMember(ctx, d.x - c, d.y - s, d.x + c, d.y + s, d.mt, null, 0.9); }
      const c = Wd.car;
      drawVehicle(g, ctx, c.type, P[c.rw].x, P[c.rw].y, P[c.fw].x, P[c.fw].y, c.roll / c.r);
    }
    drawWater(ctx, t);
    if (g.demo) return;
    drawToolbar(g, ctx, S);
    // הודעות על הקנבס
    if (build && S.lv <= 2 && S.D.length < (S.lv === 1 ? 1 : 3)) g.text(ctx, g.t(S.lv === 1 ? 'tip1' : 'tip2'), W / 2, 40, { size: 22, color: '#ffffff', stroke: 'rgba(20,40,70,.75)', strokeW: 6, maxW: 900 });
    if (!build && S.World && !S.World.go) g.text(ctx, g.t('ready'), W / 2, 40, { size: 24, color: '#ffffff', stroke: 'rgba(20,40,70,.75)', strokeW: 6 });
    if (S.result && S.result !== 'win' && S.resT > 20) {
      const a = Math.min(1, (S.resT - 20) / 15);
      ctx.globalAlpha = a;
      g.rr(ctx, W / 2 - 200, 190, 400, 162, 20); ctx.fillStyle = 'rgba(14,24,44,.9)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ff8c42'; ctx.stroke();
      g.text(ctx, g.t(S.result === 'fall' ? 'fell' : 'stuck'), W / 2, 238, { size: 26, weight: 900, color: '#ffb38a', maxW: 370 });
      for (const b of buttons(g)) if (b.id === 'edit' || b.id === 'retry') {
        g.rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = b.id === 'retry' ? '#2ec27e' : S.hoverBtn === b.id ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.16)'; ctx.fill();
        g.text(ctx, g.t(b.id === 'retry' ? 'retry' : 'edit'), b.x + b.w / 2, b.y + b.h / 2 + 1, { size: 19, weight: 900, color: b.id === 'retry' ? '#13203a' : '#ffffff', maxW: b.w - 16 });
      }
      ctx.globalAlpha = 1;
    }
    if (S.result === 'win') g.text(ctx, g.t('made'), W / 2, 120, { size: 40, weight: 900, color: '#ffe066', stroke: 'rgba(20,40,70,.8)', strokeW: 8 });
  }

  // ================= טקסטים =================
  const TXT = {
    he: { title: 'בונה גשרים', help: ['לחץ על נקודת חיבור ואז על מקום אחר כדי לבנות קורה', 'כביש — עליו הרכב נוסע. עץ זול, פלדה חזקה ויקרה', 'לחץ "בדיקה" וצפה ברכב: ירוק = בסדר, אדום = עומד להישבר', 'כמה שפחות מהתקציב — יותר כוכבים', 'קליק ימני — מחיקה · Z — ביטול · רווח — בדיקה · 1/2/3 — חומר'], helpTouch: ['גע בנקודת חיבור ואז במקום אחר כדי לבנות קורה', 'כביש — עליו הרכב נוסע. עץ זול, פלדה חזקה ויקרה', 'לחץ "בדיקה" וצפה ברכב: ירוק = בסדר, אדום = עומד להישבר', 'כמה שפחות מהתקציב — יותר כוכבים · המחק מוחק קורות'], road: 'כביש', wood: 'עץ', steel: 'פלדה', test: 'בדיקה', edit: 'עריכה', retry: 'בדוק שוב', budget: 'תקציב', over: 'אין מספיק תקציב!', fell: 'הרכב נפל לנהר!', stuck: 'הרכב נתקע!', made: 'הרכב עבר!', cost: 'עלות: {c} מתוך {b}', vehicle: 'רכב', ready: 'הגשר מתייצב…', tip1: 'לחץ על העוגן השמאלי ואז על הימני', tip2: 'הוסף קורות עץ מתחת לכביש כדי לתמוך בו' },
    en: { title: 'Bridge Builder', help: ['Click a joint, then another spot to build a beam', 'Road — the vehicle drives on it. Wood is cheap, steel is strong but pricey', 'Press Test and watch: green = fine, red = about to break', 'Spend less of the budget for more stars', 'Right-click — delete · Z — undo · Space — test · 1/2/3 — material'], helpTouch: ['Tap a joint, then another spot to build a beam', 'Road — the vehicle drives on it. Wood is cheap, steel is strong but pricey', 'Press Test and watch: green = fine, red = about to break', 'Spend less of the budget for more stars · The eraser deletes beams'], road: 'Road', wood: 'Wood', steel: 'Steel', test: 'Test', edit: 'Edit', retry: 'Test again', budget: 'Budget', over: 'Not enough budget!', fell: 'The vehicle fell into the river!', stuck: 'The vehicle got stuck!', made: 'It made it across!', cost: 'Cost: {c} of {b}', vehicle: 'Vehicle', ready: 'The bridge settles…', tip1: 'Click the left anchor, then the right one', tip2: 'Add wood beams under the road to hold it up' },
    ar: { title: 'باني الجسور', help: ['انقر على نقطة وصل ثم على مكان آخر لبناء عارضة', 'الطريق — تسير عليه المركبة. الخشب رخيص، والفولاذ قوي وغالٍ', 'اضغط "اختبار" وشاهد: الأخضر = جيد، الأحمر = على وشك الانكسار', 'كلما أنفقت أقل من الميزانية حصلت على نجوم أكثر', 'زر الفأرة الأيمن — حذف · Z — تراجع · المسافة — اختبار · 1/2/3 — المادة'], helpTouch: ['المس نقطة وصل ثم مكاناً آخر لبناء عارضة', 'الطريق — تسير عليه المركبة. الخشب رخيص، والفولاذ قوي وغالٍ', 'اضغط "اختبار" وشاهد: الأخضر = جيد، الأحمر = على وشك الانكسار', 'كلما أنفقت أقل حصلت على نجوم أكثر · الممحاة تحذف العوارض'], road: 'طريق', wood: 'خشب', steel: 'فولاذ', test: 'اختبار', edit: 'تعديل', retry: 'اختبر مجدداً', budget: 'الميزانية', over: 'الميزانية لا تكفي!', fell: 'سقطت المركبة في النهر!', stuck: 'علقت المركبة!', made: 'عبرت المركبة!', cost: 'التكلفة: {c} من {b}', vehicle: 'المركبة', ready: 'الجسر يستقر…', tip1: 'انقر على المرساة اليسرى ثم على اليمنى', tip2: 'أضف عوارض خشبية تحت الطريق لتسنده' },
    es: { title: 'Constructor de puentes', help: ['Haz clic en una unión y luego en otro punto para poner una viga', 'Carretera: el vehículo va por ella. La madera es barata y el acero fuerte pero caro', 'Pulsa Probar y mira: verde = bien, rojo = a punto de romperse', 'Gasta menos presupuesto para ganar más estrellas', 'Clic derecho — borrar · Z — deshacer · Espacio — probar · 1/2/3 — material'], helpTouch: ['Toca una unión y luego otro punto para poner una viga', 'Carretera: el vehículo va por ella. La madera es barata y el acero fuerte pero caro', 'Pulsa Probar y mira: verde = bien, rojo = a punto de romperse', 'Gasta menos para ganar más estrellas · La goma borra vigas'], road: 'Carretera', wood: 'Madera', steel: 'Acero', test: 'Probar', edit: 'Editar', retry: 'Probar otra vez', budget: 'Presupuesto', over: '¡No alcanza el presupuesto!', fell: '¡El vehículo cayó al río!', stuck: '¡El vehículo se atascó!', made: '¡Cruzó!', cost: 'Costo: {c} de {b}', vehicle: 'Vehículo', ready: 'El puente se asienta…', tip1: 'Haz clic en el anclaje izquierdo y luego en el derecho', tip2: 'Pon vigas de madera bajo la carretera para sostenerla' },
    fr: { title: 'Bâtisseur de ponts', help: ['Clique sur un point d’attache, puis ailleurs pour poser une poutre', 'Route — le véhicule roule dessus. Le bois est bon marché, l’acier solide mais cher', 'Appuie sur Tester et regarde : vert = ça va, rouge = presque cassé', 'Dépense moins du budget pour plus d’étoiles', 'Clic droit — supprimer · Z — annuler · Espace — tester · 1/2/3 — matériau'], helpTouch: ['Touche un point d’attache, puis ailleurs pour poser une poutre', 'Route — le véhicule roule dessus. Le bois est bon marché, l’acier solide mais cher', 'Appuie sur Tester et regarde : vert = ça va, rouge = presque cassé', 'Dépense moins pour plus d’étoiles · La gomme efface les poutres'], road: 'Route', wood: 'Bois', steel: 'Acier', test: 'Tester', edit: 'Modifier', retry: 'Retester', budget: 'Budget', over: 'Budget insuffisant !', fell: 'Le véhicule est tombé dans la rivière !', stuck: 'Le véhicule est bloqué !', made: 'Il a traversé !', cost: 'Coût : {c} sur {b}', vehicle: 'Véhicule', ready: 'Le pont se stabilise…', tip1: 'Clique sur l’ancrage de gauche, puis sur celui de droite', tip2: 'Ajoute des poutres en bois sous la route pour la soutenir' },
    pt: { title: 'Construtor de Pontes', help: ['Clique num ponto de ligação e depois em outro lugar para pôr uma viga', 'Estrada — o veículo passa por ela. Madeira é barata, aço é forte mas caro', 'Aperte Testar e veja: verde = tudo bem, vermelho = quase quebrando', 'Gaste menos do orçamento para ganhar mais estrelas', 'Clique direito — apagar · Z — desfazer · Espaço — testar · 1/2/3 — material'], helpTouch: ['Toque num ponto de ligação e depois em outro lugar para pôr uma viga', 'Estrada — o veículo passa por ela. Madeira é barata, aço é forte mas caro', 'Aperte Testar e veja: verde = tudo bem, vermelho = quase quebrando', 'Gaste menos para ganhar mais estrelas · A borracha apaga vigas'], road: 'Estrada', wood: 'Madeira', steel: 'Aço', test: 'Testar', edit: 'Editar', retry: 'Testar de novo', budget: 'Orçamento', over: 'Orçamento insuficiente!', fell: 'O veículo caiu no rio!', stuck: 'O veículo ficou preso!', made: 'Atravessou!', cost: 'Custo: {c} de {b}', vehicle: 'Veículo', ready: 'A ponte está se ajeitando…', tip1: 'Clique na âncora da esquerda e depois na da direita', tip2: 'Coloque vigas de madeira sob a estrada para sustentá-la' },
    ru: { title: 'Строитель мостов', help: ['Нажми на узел, потом на другое место, чтобы поставить балку', 'Дорога — по ней едет машина. Дерево дешёвое, сталь прочная, но дорогая', 'Нажми «Тест» и смотри: зелёный = хорошо, красный = вот-вот сломается', 'Чем меньше потратишь, тем больше звёзд', 'Правая кнопка — удалить · Z — отмена · Пробел — тест · 1/2/3 — материал'], helpTouch: ['Коснись узла, потом другого места, чтобы поставить балку', 'Дорога — по ней едет машина. Дерево дешёвое, сталь прочная, но дорогая', 'Нажми «Тест» и смотри: зелёный = хорошо, красный = вот-вот сломается', 'Чем меньше потратишь, тем больше звёзд · Ластик удаляет балки'], road: 'Дорога', wood: 'Дерево', steel: 'Сталь', test: 'Тест', edit: 'Править', retry: 'Ещё тест', budget: 'Бюджет', over: 'Не хватает бюджета!', fell: 'Машина упала в реку!', stuck: 'Машина застряла!', made: 'Проехала!', cost: 'Стоимость: {c} из {b}', vehicle: 'Машина', ready: 'Мост оседает…', tip1: 'Нажми на левую опору, потом на правую', tip2: 'Поставь деревянные балки под дорогой, чтобы её поддержать' },
    de: { title: 'Brückenbauer', help: ['Klick auf einen Knoten, dann auf eine andere Stelle, um einen Balken zu bauen', 'Straße — darauf fährt das Fahrzeug. Holz ist billig, Stahl stark, aber teuer', 'Drück „Testen“ und schau zu: Grün = gut, Rot = bricht gleich', 'Je weniger Budget du brauchst, desto mehr Sterne', 'Rechtsklick — löschen · Z — rückgängig · Leertaste — testen · 1/2/3 — Material'], helpTouch: ['Tipp auf einen Knoten, dann auf eine andere Stelle, um einen Balken zu bauen', 'Straße — darauf fährt das Fahrzeug. Holz ist billig, Stahl stark, aber teuer', 'Drück „Testen“ und schau zu: Grün = gut, Rot = bricht gleich', 'Weniger Budget = mehr Sterne · Der Radierer löscht Balken'], road: 'Straße', wood: 'Holz', steel: 'Stahl', test: 'Testen', edit: 'Bearbeiten', retry: 'Nochmal testen', budget: 'Budget', over: 'Budget reicht nicht!', fell: 'Das Fahrzeug ist in den Fluss gefallen!', stuck: 'Das Fahrzeug steckt fest!', made: 'Geschafft – es ist drüben!', cost: 'Kosten: {c} von {b}', vehicle: 'Fahrzeug', ready: 'Die Brücke setzt sich…', tip1: 'Klick auf den linken Anker, dann auf den rechten', tip2: 'Bau Holzbalken unter die Straße, um sie zu stützen' },
  };

  GK.register('bridge-builder', {
    w: W, h: H, bg: '#1b3a5c', accent: '#ffd166',
    levels: LV.length,
    text: TXT,
    // לבדיקות: הפיזיקה, השלבים והפתרונות, בלי ציור
    sim: { LV, MATS, VEH, G, WATER, geo, solidAt, buildWorld, stepWorld, memberCost, designCost, starsFor, SOL, BUDGET, SOLS },

    init(g) {
      if (g.demo) {
        const n = 10;
        g.s = newState(g, n);
        g.s.D = SOL[n - 1].map(m => m.slice());
        g.s.showCar = 470;
        refresh(g.s);
        return;
      }
      const S = g.s = newState(g, g.level);
      S.D = loadD(g, g.level).filter(m => !solidAt(S.geo, m[0], m[1]) && !solidAt(S.geo, m[2], m[3]) && Math.hypot(m[2] - m[0], m[3] - m[1]) <= MATS[m[4]].maxL + 0.01);
      S.fails = g.load('fails' + g.level, 0) | 0;
      refresh(S);
      if (S.cost > S.budget) { S.D = []; refresh(S); }
      g.msg(g.t('level') + ' ' + g.level, 1000, '#ffd166');
    },

    step(g) {
      const S = g.s;
      S.clock++;
      if (S.errT > 0) S.errT--;
      if (S.mode === 'test') testStep(g);
      g.hud([[g.t('level'), S.lv], [g.t('vehicle'), VEH[S.geo.v].e], [g.t('budget'), money(S.budget)]]);
    },

    idle(g) { if (g.s) g.s.clock++; },

    // בוט לבדיקות: בונה את פתרון הייחוס דרך אותה פונקציית הוספה של העכבר, ולוחץ "בדיקה"
    bot(g) {
      const S = g.s;
      if (S.mode === 'build') {
        if (S.botT === 0) { if (S.D.length) { pushUndo(S); S.D = []; refresh(S); } }
        const sol = SOL[S.lv - 1];
        if (S.botT < sol.length) { const m = sol[S.botT]; S.mat = m[4]; addMember(g, m[0], m[1], m[2], m[3], m[4]); S.botT++; }
        else { S.botT = 0; startTest(g); }
      } else if (S.result && S.result !== 'win' && S.resT > 40) { stopTest(g); }
    },

    onKey(g, e) {
      const S = g.s, c = e.code;
      if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') press(g, 'm' + (+c[5] - 1));
      else if (c === 'KeyZ') doUndo(g);
      else if (c === 'KeyX' && S.mode === 'build') press(g, 'erase');
      else if (c === 'KeyH' && S.mode === 'build' && S.fails >= 2) press(g, 'hint');
      else if (c === 'Space' || c === 'Enter') { if (S.mode === 'build') startTest(g); else if (S.result !== 'win') stopTest(g); }
      else if (c === 'KeyR' && S.mode === 'test' && S.result !== 'win') press(g, 'retry');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        const b = btnAt(g, p.x, p.y);
        S.hoverBtn = b ? b.id : null;
        S.hover = b || p.y > TB_Y - 10 ? null : { x: p.x, y: p.y };
        if (S.drag && Math.hypot(p.x - S.drag.x, p.y - S.drag.y) > 12) S.drag.moved = true;
        return;
      }
      if (type === 'down') {
        S.fat = p.kind === 'touch';
        const b = btnAt(g, p.x, p.y);
        if (b) { press(g, b.id); return; }
        if (S.mode !== 'build' || p.y > TB_Y - 10) return;
        S.hover = { x: p.x, y: p.y };
        if (p.button === 2) { if (S.sel) S.sel = null; else removeAt(g, p.x, p.y); return; }
        if (S.tool === 'erase') { removeAt(g, p.x, p.y); return; }
        const j = jointNear(S, p.x, p.y, S.fat ? 27 : 16);
        if (S.sel) {
          if (j && j.x === S.sel.x && j.y === S.sel.y) { S.sel = null; return; }
          const tg = target(S, p.x, p.y);
          if (tg && tryPlace(g, tg.x, tg.y)) S.sel = { x: tg.x, y: tg.y };
          return;
        }
        if (j) { S.sel = { x: j.x, y: j.y }; S.drag = { x: p.x, y: p.y, moved: false }; g.sfx('tick'); }
        return;
      }
      if (type === 'up') {
        const d = S.drag;
        S.drag = null;
        if (d && d.moved && S.sel && S.mode === 'build') {
          const tg = target(S, p.x, p.y);
          if (tg) tryPlace(g, tg.x, tg.y);
          S.sel = null;
        }
      }
    },

    draw(g, ctx) { drawScene(g, ctx, g.s); },

    cover(ctx, w, h, k) {
      ctx.save();
      ctx.scale(w / W, h / H);
      paintSky(ctx, k);
      ctx.scale(1.28, 1.28); ctx.translate(-105, -92);
      const Gm = geo(10);
      paintTerrain(Gm)(ctx, k);
      // קרש שבור נופל לנהר, עם התזה
      ctx.save(); ctx.translate(318, 430); ctx.rotate(0.9); drawMember(ctx, -34, 0, 34, 0, 1); ctx.restore();
      for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 13), d = 16 + (i % 4) * 9; k.circle(ctx, 340 + Math.cos(a) * d, WATER + Math.sin(a) * d * 1.3, 3 + (i % 3)); ctx.fillStyle = i % 2 ? '#ffffff' : '#bfe9ff'; ctx.fill(); }
      const D = SOL[9].length ? SOL[9] : [[240, 270, 480, 270, 0], [480, 270, 720, 270, 0]];
      let i = 0;
      for (const m of D) if (m[4] !== 0) drawMember(ctx, m[0], m[1], m[2], m[3], m[4], stressCol(((i++ * 37) % 100) / 130));
      for (const m of D) if (m[4] === 0) drawMember(ctx, m[0], m[1], m[2], m[3], 0, stressCol(0.15 + ((i++ * 53) % 100) / 220));
      for (const [x, y] of Gm.anchors) drawJoint(k, ctx, x, y, true, false);
      const V = VEH[3];
      drawVehicle(k, ctx, 3, 430, 270 - V.r - 6, 430 + V.wb, 270 - V.r - 6, 0.5);
      drawWater(ctx, 1);
      ctx.restore();
    },
  });
})();
