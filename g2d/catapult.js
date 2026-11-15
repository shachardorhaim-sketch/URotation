// ============================================================
//  הקטפולטה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  גוררים אחורה את האבן, משחררים, ומפילים מבצרים של עץ, אבן וקרח על הרפשים הזועפים.
//  הפיזיקה (קופסאות ועיגולים, חיכוך, ערימות יציבות, שינה) כתובה כאן בסגנון Box2D-Lite:
//  מגעים נשמרים בין צעדים (warm starting), דחפים מצטברים, ותיקון מיקום עם מרווח קטן.
// ============================================================
(function () {
  'use strict';
  const VW = 960, VH = 540, GY = 470;                 // העולם, וגובה פני הקרקע
  const GRAV = 700, DT = 1 / 60, ITER = 12, SLOP = 0.5, BIAS = 0.2;
  const SLEEP_V = 6, SLEEP_W = 0.06, SLEEP_N = 30;   // גוף שכמעט לא זז חצי שנייה נרדם
  const V_DMG = 110;                                  // מהירות פגיעה שמתחתיה אין נזק
  const SX = 160, SY = 350, PULL = 100, VMAX = 840, ROCK_R = 13;
  const AMIN = -20, AMAX = 85, PMIN = 15, RELOAD = 24, WAIT_MAX = 600;
  const RB = { x: 12, y: 12, w: 44, h: 44 };          // כפתור התחלה מחדש על הקנבס

  const MAT = {
    w: { dens: 0.7, mu: 0.6, hp: 250, pts: 50, col: '#cf8f4f', lt: '#ecb877', dk: '#7a4a22' },
    s: { dens: 2.0, mu: 0.7, hp: 900, pts: 100, col: '#9ea8b3', lt: '#cdd4db', dk: '#59616a' },
    i: { dens: 0.9, mu: 0.25, hp: 110, pts: 30, col: '#a9e2fb', lt: '#f2fbff', dk: '#4fa3d1' },
    r: { dens: 5, mu: 0.6 },
    g: { mu: 0.6 },
    e: { mu: 0.8 },
  };
  const SLIMES = [
    { r: 14, hp: 40, dens: 0.5, body: '#7bd85a', dk: '#3c8a2c', lt: '#d2f9b4', pts: 500 },
    { r: 17, hp: 55, dens: 0.5, body: '#b884ec', dk: '#6a3fa0', lt: '#ecdcfd', pts: 500 },
    { r: 24, hp: 150, dens: 0.55, body: '#ffa04a', dk: '#b45a10', lt: '#ffe0b5', pts: 1000 },
  ];

  // ================= פיזיקה =================
  function mkWorld() { return { bodies: [], arbs: new Map(), nid: 1, steps: 0, ev: [] }; }
  function bounds(b) {
    let ex, ey;
    if (b.k === 'c') ex = ey = b.r;
    else { const c = Math.abs(Math.cos(b.a)), s = Math.abs(Math.sin(b.a)); ex = c * b.hw + s * b.hh; ey = s * b.hw + c * b.hh; }
    b.x0 = b.x - ex; b.x1 = b.x + ex; b.y0 = b.y - ey; b.y1 = b.y + ey;
  }
  function add(Wd, o) {
    const b = {
      id: Wd.nid++, k: o.k, role: o.role, x: o.x, y: o.y, a: 0, vx: o.vx || 0, vy: o.vy || 0, w: 0,
      hw: o.hw || 0, hh: o.hh || 0, r: o.r || 0, mat: o.mat, sz: o.sz || 0, mu: MAT[o.mat].mu, fixed: !!o.fixed,
      awake: true, st: 0, dead: false, invM: 0, invI: 0, m: 0, hp: 1e12, hp0: 1e12, dmg: 0, x0: 0, x1: 0, y0: 0, y1: 0, ix: 0,
    };
    if (!b.fixed) {
      const dens = o.dens || MAT[o.mat].dens;
      const m = (b.k === 'c' ? Math.PI * b.r * b.r : 4 * b.hw * b.hh) * dens / 1000;
      const I = b.k === 'c' ? 0.5 * m * b.r * b.r : m * (b.hw * b.hw + b.hh * b.hh) / 3;
      b.m = m; b.invM = 1 / m; b.invI = 1 / I;
      if (o.hp) b.hp = b.hp0 = o.hp;
    }
    bounds(b);
    Wd.bodies.push(b);
    return b;
  }

  // ----- קופסה מול קופסה: ציר הפרדה + חיתוך הצלע הפוגעת (כמו Box2D-Lite) -----
  function clipSeg(v, nx, ny, off, edge) {
    const out = [];
    const d0 = nx * v[0].x + ny * v[0].y - off, d1 = nx * v[1].x + ny * v[1].y - off;
    if (d0 <= 0) out.push(v[0]);
    if (d1 <= 0) out.push(v[1]);
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      const p = { x: v[0].x + t * (v[1].x - v[0].x), y: v[0].y + t * (v[1].y - v[0].y), f: null };
      if (d0 > 0) { p.f = v[0].f.slice(); p.f[0] = edge; p.f[2] = 0; }
      else { p.f = v[1].f.slice(); p.f[1] = edge; p.f[3] = 0; }
      out.push(p);
    }
    return out;
  }
  function incident(hx, hy, px, py, c, s, nx, ny) {
    const lx = -(c * nx + s * ny), ly = -(-s * nx + c * ny);
    let v0, v1;
    if (Math.abs(lx) > Math.abs(ly)) {
      if (lx >= 0) { v0 = [hx, -hy, 3, 4]; v1 = [hx, hy, 4, 1]; }
      else { v0 = [-hx, hy, 1, 2]; v1 = [-hx, -hy, 2, 3]; }
    } else if (ly >= 0) { v0 = [hx, hy, 4, 1]; v1 = [-hx, hy, 1, 2]; }
    else { v0 = [-hx, -hy, 2, 3]; v1 = [hx, -hy, 3, 4]; }
    return [
      { x: px + c * v0[0] - s * v0[1], y: py + s * v0[0] + c * v0[1], f: [0, 0, v0[2], v0[3]] },
      { x: px + c * v1[0] - s * v1[1], y: py + s * v1[0] + c * v1[1], f: [0, 0, v1[2], v1[3]] },
    ];
  }
  function boxBox(A, B, out) {
    const hAx = A.hw, hAy = A.hh, hBx = B.hw, hBy = B.hh;
    const cA = Math.cos(A.a), sA = Math.sin(A.a), cB = Math.cos(B.a), sB = Math.sin(B.a);
    const dpx = B.x - A.x, dpy = B.y - A.y;
    const dAx = cA * dpx + sA * dpy, dAy = -sA * dpx + cA * dpy;
    const dBx = cB * dpx + sB * dpy, dBy = -sB * dpx + cB * dpy;
    const a11 = Math.abs(cA * cB + sA * sB), a12 = Math.abs(-cA * sB + sA * cB), a21 = Math.abs(-sA * cB + cA * sB), a22 = Math.abs(sA * sB + cA * cB);
    const fAx = Math.abs(dAx) - hAx - (a11 * hBx + a12 * hBy), fAy = Math.abs(dAy) - hAy - (a21 * hBx + a22 * hBy);
    if (fAx > 0 || fAy > 0) return 0;
    const fBx = Math.abs(dBx) - (a11 * hAx + a21 * hAy) - hBx, fBy = Math.abs(dBy) - (a12 * hAx + a22 * hAy) - hBy;
    if (fBx > 0 || fBy > 0) return 0;
    let axis = 0, sep = fAx, nx = dAx > 0 ? cA : -cA, ny = dAx > 0 ? sA : -sA;
    if (fAy > 0.95 * sep + 0.01 * hAy) { axis = 1; sep = fAy; nx = dAy > 0 ? -sA : sA; ny = dAy > 0 ? cA : -cA; }
    if (fBx > 0.95 * sep + 0.01 * hBx) { axis = 2; sep = fBx; nx = dBx > 0 ? cB : -cB; ny = dBx > 0 ? sB : -sB; }
    if (fBy > 0.95 * sep + 0.01 * hBy) { axis = 3; sep = fBy; nx = dBy > 0 ? -sB : sB; ny = dBy > 0 ? cB : -cB; }
    let fnx, fny, front, snx, sny, side, negSide, posSide, negEdge, posEdge, inc;
    if (axis < 2) {
      fnx = nx; fny = ny;
      if (axis === 0) { front = A.x * fnx + A.y * fny + hAx; snx = -sA; sny = cA; side = A.x * snx + A.y * sny; negSide = -side + hAy; posSide = side + hAy; negEdge = 3; posEdge = 1; }
      else { front = A.x * fnx + A.y * fny + hAy; snx = cA; sny = sA; side = A.x * snx + A.y * sny; negSide = -side + hAx; posSide = side + hAx; negEdge = 2; posEdge = 4; }
      inc = incident(hBx, hBy, B.x, B.y, cB, sB, fnx, fny);
    } else {
      fnx = -nx; fny = -ny;
      if (axis === 2) { front = B.x * fnx + B.y * fny + hBx; snx = -sB; sny = cB; side = B.x * snx + B.y * sny; negSide = -side + hBy; posSide = side + hBy; negEdge = 3; posEdge = 1; }
      else { front = B.x * fnx + B.y * fny + hBy; snx = cB; sny = sB; side = B.x * snx + B.y * sny; negSide = -side + hBx; posSide = side + hBx; negEdge = 2; posEdge = 4; }
      inc = incident(hAx, hAy, A.x, A.y, cA, sA, fnx, fny);
    }
    let cp = clipSeg(inc, -snx, -sny, negSide, negEdge);
    if (cp.length < 2) return 0;
    cp = clipSeg(cp, snx, sny, posSide, posEdge);
    if (cp.length < 2) return 0;
    let n = 0;
    for (let i = 0; i < 2; i++) {
      const s = fnx * cp[i].x + fny * cp[i].y - front;
      if (s <= 0) {
        let f = cp[i].f;
        if (axis >= 2) f = [f[2], f[3], f[0], f[1]];
        out.push({ x: cp[i].x - s * fnx, y: cp[i].y - s * fny, nx, ny, sep: s, fid: f[0] | (f[1] << 4) | (f[2] << 8) | (f[3] << 12), Pn: 0, Pt: 0, r1x: 0, r1y: 0, r2x: 0, r2y: 0, mn: 0, mt: 0, bias: 0 });
        n++;
      }
    }
    return n;
  }
  // עיגול מול קופסה: הנורמל מהקופסה אל העיגול (flip הופך אותו)
  function circBox(C, B, out, flip) {
    const c = Math.cos(B.a), s = Math.sin(B.a);
    const dx = C.x - B.x, dy = C.y - B.y;
    const lx = c * dx + s * dy, ly = -s * dx + c * dy;
    let qx = lx < -B.hw ? -B.hw : lx > B.hw ? B.hw : lx, qy = ly < -B.hh ? -B.hh : ly > B.hh ? B.hh : ly;
    let nlx, nly, sep;
    if (qx === lx && qy === ly) {
      const px = B.hw - Math.abs(lx), py = B.hh - Math.abs(ly);
      if (px < py) { nlx = lx >= 0 ? 1 : -1; nly = 0; qx = nlx * B.hw; sep = -px - C.r; }
      else { nlx = 0; nly = ly >= 0 ? 1 : -1; qy = nly * B.hh; sep = -py - C.r; }
    } else {
      const ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey);
      if (d > C.r) return 0;
      nlx = ex / d; nly = ey / d; sep = d - C.r;
    }
    let nx = c * nlx - s * nly, ny = s * nlx + c * nly;
    const px = B.x + c * qx - s * qy, py = B.y + s * qx + c * qy;
    if (flip) { nx = -nx; ny = -ny; }
    out.push({ x: px, y: py, nx, ny, sep, fid: 0, Pn: 0, Pt: 0, r1x: 0, r1y: 0, r2x: 0, r2y: 0, mn: 0, mt: 0, bias: 0 });
    return 1;
  }
  function circCirc(A, B, out) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), rs = A.r + B.r;
    if (d > rs) return 0;
    const nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1, sep = d - rs;
    out.push({ x: A.x + nx * (A.r + sep / 2), y: A.y + ny * (A.r + sep / 2), nx, ny, sep, fid: 0, Pn: 0, Pt: 0, r1x: 0, r1y: 0, r2x: 0, r2y: 0, mn: 0, mt: 0, bias: 0 });
    return 1;
  }
  function collide(b1, b2, out) {
    if (b1.k === 'b' && b2.k === 'b') return boxBox(b1, b2, out);
    if (b1.k === 'c' && b2.k === 'c') return circCirc(b1, b2, out);
    if (b1.k === 'c') return circBox(b1, b2, out, true);
    return circBox(b2, b1, out, false);
  }

  function kill(Wd, b, why) {
    if (b.dead) return;
    b.dead = true; Wd.dirty = true;
    Wd.ev.push({ t: why, b });
    for (const [k, ar] of Wd.arbs) if (ar.b1 === b || ar.b2 === b) {
      const o = ar.b1 === b ? ar.b2 : ar.b1;
      if (!o.fixed) { o.st = 0; o.awake = true; }
      Wd.arbs.delete(k);
    }
  }

  function wStep(Wd) {
    const B = Wd.bodies, n = B.length, arbs = Wd.arbs;
    Wd.steps++;
    for (let i = 0; i < n; i++) { const b = B[i]; b.ix = i; if (b.awake && !b.fixed) bounds(b); }
    // מגעים: רק זוגות שאחד מהם ער (זוג ישן שומר את המגע שלו כמו שהוא)
    for (let i = 0; i < n; i++) {
      const a = B[i];
      for (let j = i + 1; j < n; j++) {
        const b = B[j];
        if (!(a.awake && !a.fixed) && !(b.awake && !b.fixed)) continue;
        const lo = a.id < b.id ? a : b, hi = lo === a ? b : a, key = lo.id * 65536 + hi.id;
        if (a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0) { arbs.delete(key); continue; }
        const cs = [];
        if (!collide(lo, hi, cs)) { arbs.delete(key); continue; }
        const old = arbs.get(key);
        if (old) {
          for (const c of cs) for (const o of old.c) if (o.fid === c.fid) { c.Pn = o.Pn; c.Pt = o.Pt; break; }
          old.c = cs;
        } else arbs.set(key, { b1: lo, b2: hi, c: cs, mu: Math.sqrt(lo.mu * hi.mu) });
      }
    }
    // איים: גופים שנוגעים זה בזה נרדמים ומתעוררים יחד
    const par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const ar of arbs.values()) if (!ar.b1.fixed && !ar.b2.fixed) { const r1 = find(ar.b1.ix), r2 = find(ar.b2.ix); if (r1 !== r2) par[r1] = r2; }
    const minSt = new Int32Array(n).fill(1 << 30);
    for (let i = 0; i < n; i++) if (!B[i].fixed) { const r = find(i); if (B[i].st < minSt[r]) minSt[r] = B[i].st; }
    for (let i = 0; i < n; i++) {
      const b = B[i];
      if (b.fixed) continue;
      const wake = minSt[find(i)] < SLEEP_N;
      if (!wake && b.awake) { b.awake = false; b.vx = b.vy = b.w = 0; }
      else if (wake && !b.awake) b.awake = true;
    }
    for (let i = 0; i < n; i++) { const b = B[i]; if (b.awake && !b.fixed) b.vy += GRAV * DT; }
    // נזק לפי מהירות הפגיעה, ואז הכנה לפתרון
    const act = [];
    for (const ar of arbs.values()) {
      const b1 = ar.b1, b2 = ar.b2;
      if (!(b1.awake && !b1.fixed) && !(b2.awake && !b2.fixed)) continue;
      act.push(ar);
      let imp = 0, hx = 0, hy = 0;
      for (const c of ar.c) {
        const r1x = c.x - b1.x, r1y = c.y - b1.y, r2x = c.x - b2.x, r2y = c.y - b2.y;
        const vn = (b2.vx - b2.w * r2y - b1.vx + b1.w * r1y) * c.nx + (b2.vy + b2.w * r2x - b1.vy - b1.w * r1x) * c.ny;
        if (-vn > imp) { imp = -vn; hx = c.x; hy = c.y; }
      }
      if (imp > V_DMG) {
        const J = (imp - V_DMG) / (b1.invM + b2.invM);
        b1.dmg += J; b2.dmg += J;
        if (J > 12) Wd.ev.push({ t: 'hit', x: hx, y: hy, J, a: b1, b: b2 });
      }
    }
    for (const ar of act) {
      const b1 = ar.b1, b2 = ar.b2;
      for (const c of ar.c) {
        const r1x = c.r1x = c.x - b1.x, r1y = c.r1y = c.y - b1.y, r2x = c.r2x = c.x - b2.x, r2y = c.r2y = c.y - b2.y;
        const rn1 = r1x * c.nx + r1y * c.ny, rn2 = r2x * c.nx + r2y * c.ny;
        c.mn = 1 / (b1.invM + b2.invM + b1.invI * (r1x * r1x + r1y * r1y - rn1 * rn1) + b2.invI * (r2x * r2x + r2y * r2y - rn2 * rn2));
        const tx = c.ny, ty = -c.nx, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
        c.mt = 1 / (b1.invM + b2.invM + b1.invI * (r1x * r1x + r1y * r1y - rt1 * rt1) + b2.invI * (r2x * r2x + r2y * r2y - rt2 * rt2));
        c.bias = -BIAS / DT * Math.min(0, c.sep + SLOP);
        const Px = c.Pn * c.nx + c.Pt * tx, Py = c.Pn * c.ny + c.Pt * ty;
        b1.vx -= b1.invM * Px; b1.vy -= b1.invM * Py; b1.w -= b1.invI * (r1x * Py - r1y * Px);
        b2.vx += b2.invM * Px; b2.vy += b2.invM * Py; b2.w += b2.invI * (r2x * Py - r2y * Px);
      }
    }
    for (let it = 0; it < ITER; it++) {
      for (let q = 0; q < act.length; q++) {
        const ar = act[q], b1 = ar.b1, b2 = ar.b2, cs = ar.c;
        for (let m = 0; m < cs.length; m++) {
          const c = cs[m], r1x = c.r1x, r1y = c.r1y, r2x = c.r2x, r2y = c.r2y;
          let dvx = b2.vx - b2.w * r2y - b1.vx + b1.w * r1y, dvy = b2.vy + b2.w * r2x - b1.vy - b1.w * r1x;
          let dP = c.mn * (c.bias - (dvx * c.nx + dvy * c.ny));
          const P0 = c.Pn; c.Pn = P0 + dP > 0 ? P0 + dP : 0; dP = c.Pn - P0;
          let Px = dP * c.nx, Py = dP * c.ny;
          b1.vx -= b1.invM * Px; b1.vy -= b1.invM * Py; b1.w -= b1.invI * (r1x * Py - r1y * Px);
          b2.vx += b2.invM * Px; b2.vy += b2.invM * Py; b2.w += b2.invI * (r2x * Py - r2y * Px);
          dvx = b2.vx - b2.w * r2y - b1.vx + b1.w * r1y; dvy = b2.vy + b2.w * r2x - b1.vy - b1.w * r1x;
          const tx = c.ny, ty = -c.nx, maxPt = ar.mu * c.Pn, T0 = c.Pt;
          let t = T0 - c.mt * (dvx * tx + dvy * ty);
          c.Pt = t < -maxPt ? -maxPt : t > maxPt ? maxPt : t;
          dP = c.Pt - T0; Px = dP * tx; Py = dP * ty;
          b1.vx -= b1.invM * Px; b1.vy -= b1.invM * Py; b1.w -= b1.invI * (r1x * Py - r1y * Px);
          b2.vx += b2.invM * Px; b2.vy += b2.invM * Py; b2.w += b2.invI * (r2x * Py - r2y * Px);
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const b = B[i];
      if (!b.awake || b.fixed) continue;
      b.x += DT * b.vx; b.y += DT * b.vy; b.a += DT * b.w;
      if (b.k === 'c') b.w *= b.role === 'slime' ? 0.86 : 0.985;   // התנגדות גלגול: רפש דביק כמעט לא מתגלגל, אבן נעצרת בסוף
      if (b.vx * b.vx + b.vy * b.vy < SLEEP_V * SLEEP_V && Math.abs(b.w) < SLEEP_W) b.st++; else b.st = 0;
    }
    for (let i = 0; i < n; i++) {
      const b = B[i];
      if (b.fixed || b.dead) continue;
      if (b.dmg > 0) {
        if (b.role !== 'rock') b.hp -= b.dmg;
        b.dmg = 0;
        if (b.hp <= 0) { kill(Wd, b, b.role === 'slime' ? 'pop' : 'break'); continue; }
      }
      if (b.x < -200 || b.x > VW + 200 || b.y > VH + 150) kill(Wd, b, b.role === 'slime' ? 'pop' : 'out');
    }
    if (Wd.dirty) { Wd.bodies = Wd.bodies.filter(b => !b.dead); Wd.dirty = false; }
  }
  const asleep = Wd => Wd.bodies.every(b => b.fixed || !b.awake);
  const slimesLeft = Wd => Wd.bodies.reduce((n, b) => n + (b.role === 'slime' ? 1 : 0), 0);
  function launchPos(a, p) { const r = a * Math.PI / 180; return { x: SX - Math.cos(r) * p / 100 * PULL, y: SY + Math.sin(r) * p / 100 * PULL }; }
  function shoot(Wd, a, p) {
    const r = a * Math.PI / 180, v = p / 100 * VMAX, L = launchPos(a, p);
    return add(Wd, { k: 'c', role: 'rock', x: L.x, y: L.y, r: ROCK_R, mat: 'r', vx: Math.cos(r) * v, vy: -Math.sin(r) * v });
  }
  function clone(Wd) {
    const N = { bodies: [], arbs: new Map(), nid: Wd.nid, steps: Wd.steps, ev: [] }, map = new Map();
    for (const b of Wd.bodies) { const c = Object.assign({}, b); N.bodies.push(c); map.set(b, c); }
    for (const [k, ar] of Wd.arbs) N.arbs.set(k, { b1: map.get(ar.b1), b2: map.get(ar.b2), mu: ar.mu, c: ar.c.map(c => Object.assign({}, c)) });
    return N;
  }

  // ================= שלבים =================
  // כל חלק מונח בדיוק על מה שמתחתיו (אין רווחים ואין חפיפה), כך שהמבצר עומד יציב מההתחלה
  const SZ = { P: [20, 80], T: [20, 120], S: [20, 40], Q: [20, 20], C: [40, 40], B: [60, 60], H: [40, 20], M: [80, 20], L: [120, 20], X: [160, 20] };
  function Lay() {
    const o = { blocks: [], slimes: [], ledges: [], tops: [] };
    const topAt = (x0, x1) => { let y = GY; for (const t of o.tops) if (t.x0 < x1 - 0.01 && t.x1 > x0 + 0.01 && t.y < y) y = t.y; return y; };
    o.b = (t, mat, x) => { const [w, h] = SZ[t]; const y = topAt(x - w / 2, x + w / 2) - h / 2; o.blocks.push({ x, y, hw: w / 2, hh: h / 2, mat }); o.tops.push({ x0: x - w / 2, x1: x + w / 2, y: y - h / 2 }); return o; };
    o.s = (sz, x) => { const r = SLIMES[sz].r; o.slimes.push({ x, y: topAt(x - 1, x + 1) - r, sz }); return o; };
    o.ledge = (x, top, w) => { const bot = GY + 30; o.ledges.push({ x, y: (top + bot) / 2, hw: w / 2, hh: (bot - top) / 2 }); o.tops.push({ x0: x - w / 2, x1: x + w / 2, y: top }); return o; };
    o.tower = (x, mat, t, n) => { for (let i = 0; i < n; i++) o.b(t, mat, x); return o; };
    o.house = (x, mat, span, roof, inner) => {
      const h = span / 2 - 10;
      o.b('P', mat, x - h); o.b('P', mat, x + h);
      if (inner != null && inner >= 0) o.s(inner, x);
      o.b(span === 80 ? 'M' : span === 120 ? 'L' : 'X', roof || mat, x);
      return o;
    };
    o.pyr = (x, mat, rows) => { for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) o.b('C', mat, x - (rows - r - 1) * 20 + i * 40); return o; };
    return o;
  }
  const LEVELS = [
    { rocks: 3, f: L => L.house(680, 'w', 120, 'w').s(1, 680).s(0, 820) },
    { rocks: 3, f: L => L.tower(610, 'w', 'C', 3).s(1, 610).tower(770, 'w', 'C', 2).s(1, 770) },
    { rocks: 3, f: L => L.house(620, 'i', 120, 'i', 0).s(0, 620).tower(790, 'i', 'C', 3).s(1, 790) },
    { rocks: 4, f: L => L.pyr(700, 'w', 3).s(1, 700).s(0, 590).s(0, 810) },
    { rocks: 4, f: L => L.house(640, 's', 120, 'w', 1).house(800, 'w', 80, 'w').s(0, 800) },
    { rocks: 4, f: L => L.house(700, 's', 160, 'w', 1).house(700, 'w', 120, 's', 0).s(1, 700) },
    { rocks: 4, f: L => L.b('B', 's', 620).tower(620, 'i', 'C', 2).s(1, 620).house(800, 'i', 120, 'i', 1).s(0, 800) },
    { rocks: 4, f: L => L.tower(640, 's', 'C', 3).ledge(830, 380, 180).house(830, 'w', 120, 'w', 0).s(1, 830) },
    { rocks: 4, f: L => L.house(700, 's', 160, 's', 2).tower(860, 'i', 'C', 4).s(0, 860) },
    { rocks: 5, f: L => L.tower(620, 's', 'C', 3).tower(780, 's', 'C', 3).s(1, 700).b('X', 'w', 700).s(0, 660).s(0, 740) },
    { rocks: 4, f: L => L.pyr(720, 'i', 4).s(1, 720).s(0, 580) },
    { rocks: 4, f: L => L.tower(560, 's', 'C', 2).house(720, 'w', 120, 'w', 1).house(720, 'w', 80, 'w', 0).s(1, 720) },
    { rocks: 4, f: L => L.ledge(620, 400, 120).house(620, 'w', 80, 'w').s(0, 620).ledge(850, 320, 160).house(850, 'i', 120, 'i', 1).s(1, 850) },
    { rocks: 4, f: L => L.house(760, 'w', 80, 'w', 0).house(760, 'w', 80, 'w', 0).house(760, 'w', 80, 'w', 0).s(1, 760).s(0, 620) },
    { rocks: 5, f: L => L.tower(640, 'i', 'C', 3).ledge(830, 360, 200).house(830, 's', 160, 's', 2).s(0, 830) },
    { rocks: 4, f: L => L.pyr(620, 'w', 3).s(0, 620).house(820, 's', 120, 'w', 1).house(820, 'i', 80, 'i', 0).s(1, 820) },
    { rocks: 5, f: L => L.house(600, 'w', 120, 'w', 1).s(0, 600).ledge(770, 300, 120).tower(770, 'i', 'C', 2).s(1, 770).house(900, 's', 80, 's', 0) },
    { rocks: 5, f: L => L.house(660, 'w', 120, 'w', 1).house(800, 'w', 120, 'w', 1).b('X', 'w', 730).s(2, 730) },
    { rocks: 5, f: L => L.b('B', 's', 590).b('C', 'w', 590).s(0, 590).ledge(810, 340, 220).house(810, 's', 160, 'i', 2).house(810, 'i', 120, 'i', 0).s(1, 810) },
    { rocks: 5, f: L => L.tower(580, 's', 'C', 3).s(0, 580).house(720, 's', 120, 'w', 1).house(720, 'w', 80, 'w', 0).s(1, 720).ledge(880, 400, 140).house(880, 'i', 120, 'i', 2) },
  ];
  // פתרונות שנמצאו בחיפוש (g2dtools/tests/catapult/search.mjs) — הבוט משחק אותם, והבדיקה מוכיחה שהם מנצחים
  const SOL = [[[22,88]],[[18,96]],[[34,80]],[[34,74],[22,88]],[[14,96]],[[14,96]],[[30,88]],[[26,96]],[[22,88]],[[6,96]],[[-2,96]],[[22,88]],[[34,96]],[[10,96]],[[34,96]],[[22,96]],[[1,96],[63,100],[54,88]],[[17,94]],[[46,88]],[[23,100],[30,96]]];

  function buildLevel(n) {
    const Wd = mkWorld();
    add(Wd, { k: 'b', role: 'ground', x: VW / 2, y: GY + 200, hw: 900, hh: 200, mat: 'e', fixed: true });
    const L = Lay();
    LEVELS[n - 1].f(L);
    for (const p of L.ledges) add(Wd, { k: 'b', role: 'ledge', x: p.x, y: p.y, hw: p.hw, hh: p.hh, mat: 'e', fixed: true });
    for (const p of L.blocks) add(Wd, { k: 'b', role: 'blk', x: p.x, y: p.y, hw: p.hw, hh: p.hh, mat: p.mat, hp: Math.round(MAT[p.mat].hp * Math.sqrt(p.hw * p.hh * 4 / 1600)) });
    for (const p of L.slimes) { const T = SLIMES[p.sz]; add(Wd, { k: 'c', role: 'slime', x: p.x, y: p.y, r: T.r, sz: p.sz, mat: 'g', dens: T.dens, hp: T.hp }); }
    return Wd;
  }

  // ================= משחק =================
  const starsFor = left => (left >= 2 ? 3 : left === 1 ? 2 : 1);
  function newState(g, lv) {
    const Wd = buildLevel(lv);
    const S = {
      W: Wd, lv, rocks: LEVELS[lv - 1].rocks, shots: 0, phase: 'ready', load: RELOAD, aim: { a: 35, p: 70 }, drag: null, kb: false,
      since: 0, won: false, wonT: 0, over: false, score: 0, fx: [], clock: 0, rep: {}, lastTick: 0, hitT: 0, trail: [], look: { x: SX, y: SY }, shake: 0,
      deco: new Map(),
    };
    for (const b of Wd.bodies) deco(S, b);
    return S;
  }
  // פרטים לציור בלבד (סדקים, מצמוץ) — לא משפיעים על הפיזיקה
  function deco(S, b) {
    if (S.deco.has(b.id)) return S.deco.get(b.id);
    const rnd = GK.U.seeded(b.id * 7919 + 13);
    const d = { blink: Math.floor(rnd() * 200), ph: rnd() * 6.28, sq: 0, cr: [] };
    if (b.k === 'b') for (let i = 0; i < 3; i++) {
      const pts = [];
      let x = (rnd() - 0.5) * b.hw * 1.4, y = (rnd() - 0.5) * b.hh * 1.4;
      pts.push([x, y]);
      for (let k = 0; k < 3; k++) { x += (rnd() - 0.5) * b.hw * 0.9; y += (rnd() - 0.5) * b.hh * 0.9; pts.push([Math.max(-b.hw, Math.min(b.hw, x)), Math.max(-b.hh, Math.min(b.hh, y))]); }
      d.cr.push(pts);
    }
    S.deco.set(b.id, d);
    return d;
  }
  function fire(g) {
    const S = g.s;
    if (S.phase !== 'ready' || S.load > 0 || S.rocks <= 0 || S.won || S.over) return false;
    if (S.aim.p < PMIN) return false;
    const r = shoot(S.W, S.aim.a, S.aim.p);
    deco(S, r);
    S.rocks--; S.shots++; S.phase = 'fly'; S.since = 0; S.kb = false; S.drag = null; S.trail.length = 0; S.cur = r;
    g.sfx('whoosh'); g.tone({ f: 180, f2: 90, dur: 0.12, type: 'triangle', vol: 0.16 });
    if (S.rocks === 1) g.after(0.6, () => { if (!S.won && g.s === S) g.msg(g.t('lastRock'), 1100, '#ffd166'); });
    return true;
  }
  function setAim(S, a, p) {
    S.aim.a = Math.max(AMIN, Math.min(AMAX, Math.round(a)));
    S.aim.p = Math.max(0, Math.min(100, Math.round(p)));
  }
  function burstStars(S, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const an = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
      if (S.fx.length < 240) S.fx.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 1.5, life: 40 + Math.random() * 30, max: 70, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 6, col: col || (i % 3 ? '#ffd84d' : '#fff6c2') });
    }
  }
  function onEvents(g, S) {
    const ev = S.W.ev;
    let bigHit = 0;
    for (const e of ev) {
      if (e.t === 'pop') {
        const b = e.b, T = SLIMES[b.sz];
        S.score += T.pts;
        burstStars(S, b.x, b.y, 16 + b.sz * 6);
        g.burst(b.x, b.y, { n: 18, color: [T.body, T.lt, T.dk], speed: 4, life: 34, gravity: 0.15 });
        g.float(b.x, b.y - 24, '+' + T.pts, { color: '#ffe066', size: 24 });
        g.sfx('pop', { p: 0.8 + Math.random() * 0.3 });
        g.tone({ f: 660, f2: 1320, dur: 0.18, type: 'triangle', vol: 0.12, delay: 0.05 });
        g.shake(4);
      } else if (e.t === 'break') {
        const b = e.b, M = MAT[b.mat];
        S.score += M.pts;
        const n = Math.round(8 + (b.hw * b.hh) / 60);
        g.burst(b.x, b.y, { n: Math.min(26, n), color: [M.col, M.lt, M.dk], speed: 3.5, life: 38, gravity: 0.22, shape: 'square', size: b.mat === 'i' ? 5 : 6 });
        g.float(b.x, b.y - 10, '+' + M.pts, { color: '#ffffff', size: 18 });
        if (b.mat === 'i') g.noise({ filter: 'highpass', f: 6000, f2: 2500, dur: 0.22, vol: 0.16 });
        g.sfx('break', { p: b.mat === 's' ? 0.6 : b.mat === 'i' ? 1.4 : 1 });
      } else if (e.t === 'hit') {
        if (e.J > bigHit) bigHit = e.J;
        for (const b of [e.a, e.b]) if (b.role === 'slime') { const d = deco(S, b); d.sq = Math.min(1, d.sq + e.J / 60); }
        if (e.J > 60 && S.hitT <= 0) {
          const m = e.a.role === 'blk' ? e.a.mat : e.b.role === 'blk' ? e.b.mat : 'e';
          g.sfx(m === 's' ? 'hit' : m === 'i' ? 'tick' : 'place', { p: 0.8 + Math.random() * 0.4 });
          g.burst(e.x, e.y, { n: 6, color: m === 'e' ? ['#b88a5a', '#d9b98b'] : [MAT[m].lt, MAT[m].col], speed: 2, life: 22, gravity: 0.1, size: 4 });
          S.hitT = 5;
        }
      }
    }
    if (bigHit > 300) g.shake(Math.min(9, bigHit / 90));
    ev.length = 0;
  }
  // הבוט: אם יש פתרון שמור לשלב הוא משחק אותו; אחרת מכוון אל הרפש הקרוב (מסלול בלי מכשולים)
  function botAim(S) {
    const plan = SOL[S.lv - 1];
    if (plan && plan[S.shots]) return plan[S.shots];
    const sl = S.W.bodies.filter(b => b.role === 'slime').sort((a, b) => a.x - b.x)[0];
    if (!sl) return [35, 70];
    let best = null, bd = 1e9;
    for (let a = 5; a <= 70; a += 1) for (let p = 30; p <= 100; p += 2) {
      const L = launchPos(a, p), r = a * Math.PI / 180, v = p / 100 * VMAX, vx = Math.cos(r) * v, vy = -Math.sin(r) * v;
      const t = (sl.x - L.x) / vx;
      if (t <= 0) continue;
      const y = L.y + vy * t + 0.5 * GRAV * t * t;
      const d = Math.abs(y - sl.y);
      if (d < bd) { bd = d; best = [a, p]; }
    }
    return best || [35, 70];
  }

  // ================= ציור =================
  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = rot + i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.closePath();
  }
  function drawSky(k, ctx, w, h, clock) {
    let gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5fb8f5'); gr.addColorStop(0.62, '#bfe7ff'); gr.addColorStop(1, '#eef9ff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    const sx = w * 0.84, sy = h * 0.17;
    gr = ctx.createRadialGradient(sx, sy, 6, sx, sy, h * 0.16);
    gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.35, 'rgba(255,236,150,.85)'); gr.addColorStop(1, 'rgba(255,236,150,0)');
    ctx.fillStyle = gr; ctx.fillRect(sx - h * 0.2, sy - h * 0.2, h * 0.4, h * 0.4);
    k.circle(ctx, sx, sy, h * 0.05); ctx.fillStyle = '#fff6c8'; ctx.fill();
    for (let i = 0; i < 5; i++) {
      const cw = w * (0.1 + (i % 3) * 0.03);
      const cx = ((i * 263 + clock * (0.12 + i * 0.03)) % (w + cw * 2)) - cw, cy = h * (0.08 + (i * 0.37 % 1) * 0.28);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const [dx, dy, r] of [[0, 0, 0.28], [0.22, -0.12, 0.24], [0.42, 0, 0.26], [0.2, 0.06, 0.3]]) { k.circle(ctx, cx + dx * cw, cy + dy * cw, r * cw * 0.7); ctx.fill(); }
    }
    // גבעות רחוקות
    const hill = (base, amp, f, ph, c1, c2) => {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, base - Math.sin(x * f + ph) * amp - Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.35);
      ctx.lineTo(w, h); ctx.closePath();
      const g2 = ctx.createLinearGradient(0, base - amp * 1.4, 0, h); g2.addColorStop(0, c1); g2.addColorStop(1, c2);
      ctx.fillStyle = g2; ctx.fill();
    };
    hill(h * 0.66, h * 0.06, 0.006, 1.2, '#a6d7a0', '#88c482');
    hill(h * 0.76, h * 0.05, 0.009, 4.0, '#7fc06e', '#5fa552');
  }
  function drawGround(ctx, w, h, gy) {
    let gr = ctx.createLinearGradient(0, gy, 0, h);
    gr.addColorStop(0, '#8a5a32'); gr.addColorStop(1, '#5e3b1f');
    ctx.fillStyle = gr; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    for (let i = 0; i < 26; i++) { const x = (i * 157) % w, y = gy + 22 + ((i * 53) % Math.max(10, h - gy - 30)); ctx.beginPath(); ctx.ellipse(x, y, 10 + (i % 4) * 4, 4 + (i % 3), 0, 0, Math.PI * 2); ctx.fill(); }
    gr = ctx.createLinearGradient(0, gy - 4, 0, gy + 16);
    gr.addColorStop(0, '#7ed957'); gr.addColorStop(1, '#4e9e35');
    ctx.fillStyle = gr; ctx.fillRect(0, gy - 3, w, 18);
    ctx.fillStyle = '#9be870';
    for (let x = 0; x < w; x += 14) { ctx.beginPath(); ctx.moveTo(x, gy - 2); ctx.lineTo(x + 5, gy - 9 - (x * 7 % 5)); ctx.lineTo(x + 9, gy - 2); ctx.fill(); }
  }
  function drawLedge(k, ctx, b) {
    const x = b.x - b.hw, y = b.y - b.hh, w = b.hw * 2, h = b.hh * 2;
    k.rr(ctx, x, y, w, h, 10);
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#9a6a3e'); gr.addColorStop(1, '#6b4424');
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + 14 + ((i * 37) % Math.max(10, w - 28)), y + 24 + ((i * 29) % Math.max(10, h - 40)), 9, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    k.rr(ctx, x - 3, y - 4, w + 6, 14, 6); ctx.fillStyle = '#5fbf43'; ctx.fill();
    k.rr(ctx, x - 3, y - 4, w + 6, 6, 3); ctx.fillStyle = '#8fe36a'; ctx.fill();
  }
  const gradCache = new WeakMap();
  function blockFill(ctx, mat, hh) {
    let cache = gradCache.get(ctx);
    if (!cache) gradCache.set(ctx, cache = new Map());
    const key = mat + hh;
    let gr = cache.get(key);
    if (!gr) {
      const M = MAT[mat];
      gr = ctx.createLinearGradient(0, -hh, 0, hh);
      if (mat === 'i') { gr.addColorStop(0, 'rgba(236,250,255,.95)'); gr.addColorStop(1, 'rgba(140,208,242,.88)'); }
      else { gr.addColorStop(0, M.lt); gr.addColorStop(0.5, M.col); gr.addColorStop(1, g2shade(M.col, -0.18)); }
      cache.set(key, gr);
    }
    return gr;
  }
  const g2shade = (h, a) => GK.U.shade(h, a);
  function drawBlock(k, ctx, b, d) {
    const M = MAT[b.mat], w = b.hw * 2, h = b.hh * 2;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.a);
    k.rr(ctx, -b.hw, -b.hh, w, h, Math.min(5, b.hw * 0.4, b.hh * 0.4));
    ctx.fillStyle = blockFill(ctx, b.mat, b.hh); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = M.dk; ctx.stroke();
    ctx.save(); ctx.clip();
    if (b.mat === 'w') {
      ctx.strokeStyle = 'rgba(122,74,34,.45)'; ctx.lineWidth = 1.5;
      const along = w >= h;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        if (along) { const yy = -b.hh + h * i / 3; ctx.moveTo(-b.hw + 3, yy); ctx.bezierCurveTo(-b.hw * 0.3, yy - 2, b.hw * 0.3, yy + 2, b.hw - 3, yy); }
        else { const xx = -b.hw + w * i / 3; ctx.moveTo(xx, -b.hh + 3); ctx.bezierCurveTo(xx - 2, -b.hh * 0.3, xx + 2, b.hh * 0.3, xx, b.hh - 3); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(122,74,34,.5)';
      ctx.beginPath(); ctx.ellipse(along ? b.hw * 0.35 : 0, along ? 0 : b.hh * 0.3, 2.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (b.mat === 's') {
      ctx.strokeStyle = 'rgba(70,78,88,.45)'; ctx.lineWidth = 1.5;
      const rows = Math.max(1, Math.round(h / 20));
      for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(-b.hw, -b.hh + h * r / rows); ctx.lineTo(b.hw, -b.hh + h * r / rows); ctx.stroke(); }
      for (let r = 0; r < rows; r++) {
        const cols = Math.max(1, Math.round(w / 30)), off = r % 2 ? 0.5 : 0;
        for (let c = 1; c < cols + (off ? 1 : 0); c++) { const xx = -b.hw + w * (c - off) / cols; if (xx <= -b.hw + 2 || xx >= b.hw - 2) continue; ctx.beginPath(); ctx.moveTo(xx, -b.hh + h * r / rows); ctx.lineTo(xx, -b.hh + h * (r + 1) / rows); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-b.hw, -b.hh, w, 3);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-b.hw + w * 0.18, b.hh - 3); ctx.lineTo(-b.hw + w * 0.18 + h * 0.6, -b.hh + 3); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-b.hw + w * 0.32, b.hh - 3); ctx.lineTo(-b.hw + w * 0.32 + h * 0.4, -b.hh + h * 0.5); ctx.stroke();
    }
    const dmg = 1 - b.hp / b.hp0;
    if (dmg > 0.2 && d) {
      ctx.strokeStyle = b.mat === 'i' ? 'rgba(255,255,255,.95)' : 'rgba(40,24,10,.75)'; ctx.lineWidth = 1.6;
      const nc = dmg > 0.6 ? 3 : dmg > 0.4 ? 2 : 1;
      for (let i = 0; i < nc; i++) { const p = d.cr[i]; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]); ctx.stroke(); }
    }
    ctx.restore();
    ctx.restore();
  }
  function drawRock(k, ctx, x, y, r, a) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a || 0);
    k.circle(ctx, 0, 0, r);
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
    gr.addColorStop(0, '#c9c3bb'); gr.addColorStop(0.6, '#8d857c'); gr.addColorStop(1, '#5b544d');
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a443e'; ctx.stroke();
    ctx.fillStyle = 'rgba(60,54,48,.55)';
    k.circle(ctx, r * 0.3, r * 0.2, r * 0.22); ctx.fill();
    k.circle(ctx, -r * 0.25, r * 0.4, r * 0.13); ctx.fill();
    k.circle(ctx, r * 0.05, -r * 0.42, r * 0.12); ctx.fill();
    ctx.restore();
  }
  function drawSlime(k, ctx, x, y, r, T, o) {
    o = o || {};
    const sq = o.sq || 0, wob = Math.sin(o.ph || 0) * 0.04;
    const sx = 1 + sq * 0.25 + wob, sy = 1 - sq * 0.22 - wob;
    ctx.save();
    ctx.translate(x, y + r * (1 - sy));
    ctx.scale(sx, sy);
    // צל
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(0, r * 0.98, r * 0.85, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // גוף
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    ctx.bezierCurveTo(-r * 1.05, -r * 0.4, -r * 0.55, -r * 1.02, 0, -r * 1.0);
    ctx.bezierCurveTo(r * 0.55, -r * 1.02, r * 1.05, -r * 0.4, r, r * 0.55);
    ctx.quadraticCurveTo(r * 0.98, r, r * 0.6, r);
    ctx.lineTo(-r * 0.6, r);
    ctx.quadraticCurveTo(-r * 0.98, r, -r, r * 0.55);
    ctx.closePath();
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
    gr.addColorStop(0, T.lt); gr.addColorStop(0.45, T.body); gr.addColorStop(1, T.dk);
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = T.dk; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.55, r * 0.16, r * 0.26, 0.5, 0, Math.PI * 2); ctx.fill();
    // עיניים
    const lx = o.lx || 0, ly = o.ly || 0, scared = o.scared;
    for (const s of [-1, 1]) {
      const ex = s * r * 0.36, ey = -r * 0.18, er = r * (scared ? 0.27 : 0.23);
      if (o.blink) { ctx.strokeStyle = '#1d1d2b'; ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke(); }
      else {
        k.circle(ctx, ex, ey, er); ctx.fillStyle = '#fff'; ctx.fill();
        k.circle(ctx, ex + lx * er * 0.45, ey + ly * er * 0.45, er * (scared ? 0.38 : 0.5)); ctx.fillStyle = '#1d1d2b'; ctx.fill();
      }
      // גבות זועפות
      ctx.strokeStyle = T.dk; ctx.lineWidth = r * 0.11; ctx.lineCap = 'round';
      ctx.beginPath();
      if (scared) { ctx.moveTo(ex - er * 0.9, ey - er * 1.55); ctx.lineTo(ex + er * 0.9, ey - er * 1.75); }
      else { ctx.moveTo(ex - s * er * 1.0, ey - er * 1.7); ctx.lineTo(ex + s * er * 0.8, ey - er * 1.05); }
      ctx.stroke();
    }
    // פה
    ctx.strokeStyle = '#1d1d2b'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath();
    if (scared) { k.circle(ctx, 0, r * 0.38, r * 0.13); ctx.fillStyle = '#3a1a2a'; ctx.fill(); }
    else { ctx.moveTo(-r * 0.22, r * 0.42); ctx.quadraticCurveTo(0, r * 0.26, r * 0.22, r * 0.42); ctx.stroke(); }
    if (T === SLIMES[2]) {   // הגדול חובש קסדה קטנה
      ctx.fillStyle = '#8c96a3';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.86, r * 0.55, r * 0.32, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#b8c2cc'; ctx.fillRect(-r * 0.62, -r * 0.88, r * 1.24, r * 0.1);
      ctx.fillStyle = '#ffd166'; k.circle(ctx, 0, -r * 1.08, r * 0.09); ctx.fill();
    }
    ctx.restore();
  }
  function drawSlingBack(k, ctx, rx, ry, loaded) {
    // עמוד, מזלג ורצועה אחורית
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(SX, GY + 2); ctx.lineTo(SX, SY + 26); ctx.stroke();
    ctx.strokeStyle = '#8a5528'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(SX, GY); ctx.lineTo(SX, SY + 28); ctx.stroke();
    ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(SX, SY + 30); ctx.quadraticCurveTo(SX + 4, SY + 8, SX + 18, SY - 16); ctx.stroke();
    ctx.strokeStyle = '#a0632e'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(SX, SY + 30); ctx.quadraticCurveTo(SX + 4, SY + 8, SX + 18, SY - 16); ctx.stroke();
    if (loaded) {
      ctx.strokeStyle = '#5a2c14'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(SX + 18, SY - 12); ctx.lineTo(rx + ROCK_R * 0.6, ry); ctx.stroke();
      ctx.strokeStyle = '#4a240f'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(rx, ry, ROCK_R + 2, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
    }
  }
  function drawSlingFront(k, ctx, rx, ry, loaded) {
    if (loaded) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#5a2c14'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(SX - 18, SY - 12); ctx.lineTo(rx - ROCK_R * 0.6, ry); ctx.stroke();
    } else {
      ctx.strokeStyle = '#5a2c14'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(SX - 18, SY - 12); ctx.quadraticCurveTo(SX, SY + 4, SX + 18, SY - 12); ctx.stroke();
    }
    ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(SX, SY + 30); ctx.quadraticCurveTo(SX - 4, SY + 8, SX - 18, SY - 16); ctx.stroke();
    ctx.strokeStyle = '#a0632e'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(SX, SY + 30); ctx.quadraticCurveTo(SX - 4, SY + 8, SX - 18, SY - 16); ctx.stroke();
    ctx.fillStyle = '#3d1f0c';
    k.circle(ctx, SX - 18, SY - 15, 4); ctx.fill(); k.circle(ctx, SX + 18, SY - 15, 4); ctx.fill();
  }
  function drawScene(g, ctx, S) {
    drawSky(g, ctx, VW, VH, S.clock);
    for (const b of S.W.bodies) if (b.role === 'ledge') drawLedge(g, ctx, b);
    drawGround(ctx, VW, VH, GY);
    // הקטפולטה מאחור
    const loaded = !S.won && S.rocks > 0 && (S.phase === 'ready' || S.phase === 'aim');
    const aiming = loaded && (S.drag || S.kb || S.botAim);
    const P = aiming ? launchPos(S.aim.a, S.aim.p) : { x: SX, y: SY };
    let ry = P.y;
    if (loaded && S.load > 0) ry += S.load * 3;
    drawSlingBack(g, ctx, P.x, ry, loaded);
    // שובל של האבן (מאחורי הכול)
    for (let i = 0; i < S.trail.length; i++) {
      const p = S.trail[i];
      ctx.globalAlpha = (i + 1) / S.trail.length * 0.5;
      g.circle(ctx, p[0], p[1], 3 + i * 0.25); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // אבנים שמחכות בתור
    for (let i = 0; i < S.rocks - (loaded ? 1 : 0); i++) drawRock(g, ctx, SX - 46 - i * 26, GY - ROCK_R + 1, ROCK_R, i);
    for (const b of S.W.bodies) {
      if (b.role === 'blk') drawBlock(g, ctx, b, deco(S, b));
      else if (b.role === 'rock') drawRock(g, ctx, b.x, b.y, b.r, b.a);
    }
    const cur = S.cur && !S.cur.dead && S.cur.awake ? S.cur : null;
    for (const b of S.W.bodies) if (b.role === 'slime') {
      const d = deco(S, b), T = SLIMES[b.sz];
      let lx = 0, ly = 0, scared = false;
      const tx = cur ? cur.x : aiming ? P.x : SX, ty = cur ? cur.y : aiming ? P.y : SY;
      const dx = tx - b.x, dy = ty - b.y, dd = Math.hypot(dx, dy) || 1;
      lx = dx / dd; ly = dy / dd;
      if (cur && dd < 220) scared = true;
      drawSlime(g, ctx, b.x, b.y, b.r, T, { sq: d.sq, ph: S.clock * 0.08 + d.ph, blink: (S.clock + d.blink) % 190 < 7, lx, ly, scared });
    }
    if (loaded) drawRock(g, ctx, P.x, ry, ROCK_R, 0);
    drawSlingFront(g, ctx, P.x, ry, loaded);
    // מסלול קצר
    if (aiming && S.load <= 0 && S.aim.p >= PMIN) {
      const r = S.aim.a * Math.PI / 180, v = S.aim.p / 100 * VMAX, vx = Math.cos(r) * v, vy = -Math.sin(r) * v;
      for (let i = 1; i <= 11; i++) {
        const t = i * 0.05;
        const x = P.x + vx * t, y = P.y + vy * t + 0.5 * GRAV * t * t;
        ctx.globalAlpha = 0.95 - i * 0.075;
        g.circle(ctx, x, y, 4.2 - i * 0.22); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,40,60,.35)'; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // מד כוח קטן ליד הקטפולטה
      const bw = 56, bx = SX - bw / 2, by = SY + 58;
      g.rr(ctx, bx - 2, by - 2, bw + 4, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
      g.rr(ctx, bx, by, bw * S.aim.p / 100, 6, 3); ctx.fillStyle = S.aim.p > 85 ? '#ff7a45' : S.aim.p > 55 ? '#ffd166' : '#7be07b'; ctx.fill();
    }
    // כוכבים של רפשים שהתפוצצו
    for (const f of S.fx) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 25));
      star(ctx, f.x, f.y, f.s, f.rot); ctx.fillStyle = f.col; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(160,110,0,.6)'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // כפתור "התחל מחדש" בפינה
    if (!g.demo) {
      g.rr(ctx, RB.x, RB.y, RB.w, RB.h, 12); ctx.fillStyle = S.rbHover ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.26)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,60,100,.5)'; ctx.stroke();
      ctx.strokeStyle = '#1d3d63'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      const cx = RB.x + RB.w / 2, cy = RB.y + RB.h / 2;
      ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI * 0.25, Math.PI * 1.45); ctx.stroke();
      ctx.fillStyle = '#1d3d63'; ctx.beginPath(); ctx.moveTo(cx + 11, cy - 13); ctx.lineTo(cx + 12, cy - 2); ctx.lineTo(cx + 2, cy - 6); ctx.closePath(); ctx.fill();
    }
    // רמז בשלב הראשון
    if (!g.demo && S.lv === 1 && S.shots === 0 && S.phase === 'ready' && !S.drag && !S.kb && S.load <= 0) {
      const u = (S.clock % 120) / 120, e = u < 0.6 ? GK.U.ease.inOut(u / 0.6) : 1;
      const hx = SX - 70 * e, hy = SY + 40 * e;
      ctx.globalAlpha = u < 0.85 ? 0.9 : (1 - u) / 0.15 * 0.9;
      g.circle(ctx, hx + 4, hy + 6, 16); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      g.circle(ctx, hx, hy, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#334'; ctx.stroke();
      ctx.globalAlpha = 1;
      g.text(ctx, g.t('drag'), SX + 10, SY - 70, { size: 22, color: '#fff', stroke: 'rgba(20,40,70,.7)', strokeW: 5 });
    }
  }

  // ================= רישום =================
  const TXT = {
    he: { title: 'הקטפולטה', help: ['גרור אחורה כדי לכוון — ככל שתמשוך יותר, האבן תעוף חזק יותר', 'שחרר כדי לשגר, והפל את המבצר על הרפשים הזועפים', 'פוצץ את כל הרפשים כדי לעבור שלב. אבנים שנשארו = כוכבים', 'קרח מתנפץ בקלות, עץ נשבר, ואבן קשה מאוד', 'מקלדת: חצים — זווית וכוח, רווח — שיגור, R — מהתחלה'], helpTouch: ['גרור אחורה כדי לכוון — ככל שתמשוך יותר, האבן תעוף חזק יותר', 'שחרר כדי לשגר, והפל את המבצר על הרפשים הזועפים', 'פוצץ את כל הרפשים כדי לעבור שלב. אבנים שנשארו = כוכבים', 'קרח מתנפץ בקלות, עץ נשבר, ואבן קשה מאוד'], rocks: 'אבנים', slimes: 'רפשים', noRocks: 'נגמרו האבנים!', lvl: 'שלב {n}', drag: 'גרור אחורה ושחרר!', pts: 'ניקוד: {n}', lastRock: 'אבן אחרונה!' },
    en: { title: 'The Catapult', help: ['Drag back to aim — the further you pull, the harder the rock flies', 'Let go to launch and bring the fort down on the grumpy slimes', 'Pop every slime to clear the level. Rocks left over = stars', 'Ice shatters easily, wood breaks, stone is very tough', 'Keyboard: arrows — angle and power, Space — launch, R — restart'], helpTouch: ['Drag back to aim — the further you pull, the harder the rock flies', 'Let go to launch and bring the fort down on the grumpy slimes', 'Pop every slime to clear the level. Rocks left over = stars', 'Ice shatters easily, wood breaks, stone is very tough'], rocks: 'Rocks', slimes: 'Slimes', noRocks: 'Out of rocks!', lvl: 'Level {n}', drag: 'Drag back and let go!', pts: 'Score: {n}', lastRock: 'Last rock!' },
    ar: { title: 'المنجنيق', help: ['اسحب إلى الخلف للتصويب — كلما سحبت أكثر طار الحجر أقوى', 'اترك لتطلق، وأسقط الحصن على الهلاميات الغاضبة', 'فرقع كل الهلاميات لتجتاز المرحلة. الأحجار المتبقية = نجوم', 'الجليد يتحطم بسهولة، الخشب ينكسر، والحجر قوي جداً', 'لوحة المفاتيح: الأسهم — الزاوية والقوة، المسافة — إطلاق، R — من جديد'], helpTouch: ['اسحب إلى الخلف للتصويب — كلما سحبت أكثر طار الحجر أقوى', 'اترك لتطلق، وأسقط الحصن على الهلاميات الغاضبة', 'فرقع كل الهلاميات لتجتاز المرحلة. الأحجار المتبقية = نجوم', 'الجليد يتحطم بسهولة، الخشب ينكسر، والحجر قوي جداً'], rocks: 'الأحجار', slimes: 'الهلاميات', noRocks: 'نفدت الأحجار!', lvl: 'المرحلة {n}', drag: 'اسحب للخلف واترك!', pts: 'النقاط: {n}', lastRock: 'آخر حجر!' },
    es: { title: 'La Catapulta', help: ['Arrastra hacia atrás para apuntar: cuanto más tires, más fuerte vuela la piedra', 'Suelta para lanzar y derriba el fuerte sobre los slimes gruñones', 'Revienta todos los slimes para pasar el nivel. Piedras sobrantes = estrellas', 'El hielo se rompe fácil, la madera se quiebra y la piedra es muy dura', 'Teclado: flechas — ángulo y fuerza, Espacio — lanzar, R — reiniciar'], helpTouch: ['Arrastra hacia atrás para apuntar: cuanto más tires, más fuerte vuela la piedra', 'Suelta para lanzar y derriba el fuerte sobre los slimes gruñones', 'Revienta todos los slimes para pasar el nivel. Piedras sobrantes = estrellas', 'El hielo se rompe fácil, la madera se quiebra y la piedra es muy dura'], rocks: 'Piedras', slimes: 'Slimes', noRocks: '¡Sin piedras!', lvl: 'Nivel {n}', drag: '¡Arrastra hacia atrás y suelta!', pts: 'Puntos: {n}', lastRock: '¡Última piedra!' },
    fr: { title: 'La Catapulte', help: ["Tire vers l'arrière pour viser : plus tu tires, plus la pierre vole fort", 'Lâche pour tirer et fais tomber le fort sur les slimes grognons', 'Éclate tous les slimes pour finir le niveau. Pierres restantes = étoiles', 'La glace se brise facilement, le bois casse, la pierre est très solide', 'Clavier : flèches — angle et puissance, Espace — tirer, R — recommencer'], helpTouch: ["Tire vers l'arrière pour viser : plus tu tires, plus la pierre vole fort", 'Lâche pour tirer et fais tomber le fort sur les slimes grognons', 'Éclate tous les slimes pour finir le niveau. Pierres restantes = étoiles', 'La glace se brise facilement, le bois casse, la pierre est très solide'], rocks: 'Pierres', slimes: 'Slimes', noRocks: 'Plus de pierres !', lvl: 'Niveau {n}', drag: 'Tire en arrière et lâche !', pts: 'Score : {n}', lastRock: 'Dernière pierre !' },
    pt: { title: 'A Catapulta', help: ['Arraste para trás para mirar: quanto mais puxar, mais forte a pedra voa', 'Solte para lançar e derrube o forte sobre as gosmas rabugentas', 'Estoure todas as gosmas para passar de fase. Pedras de sobra = estrelas', 'O gelo quebra fácil, a madeira racha e a pedra é muito dura', 'Teclado: setas — ângulo e força, Espaço — lançar, R — recomeçar'], helpTouch: ['Arraste para trás para mirar: quanto mais puxar, mais forte a pedra voa', 'Solte para lançar e derrube o forte sobre as gosmas rabugentas', 'Estoure todas as gosmas para passar de fase. Pedras de sobra = estrelas', 'O gelo quebra fácil, a madeira racha e a pedra é muito dura'], rocks: 'Pedras', slimes: 'Gosmas', noRocks: 'Acabaram as pedras!', lvl: 'Fase {n}', drag: 'Puxe para trás e solte!', pts: 'Pontos: {n}', lastRock: 'Última pedra!' },
    ru: { title: 'Катапульта', help: ['Оттяни назад, чтобы прицелиться: чем сильнее тянешь, тем дальше летит камень', 'Отпусти, чтобы выстрелить, и обрушь крепость на ворчливых слизней', 'Лопни всех слизней, чтобы пройти уровень. Оставшиеся камни = звёзды', 'Лёд легко бьётся, дерево ломается, камень очень прочный', 'Клавиатура: стрелки — угол и сила, Пробел — выстрел, R — заново'], helpTouch: ['Оттяни назад, чтобы прицелиться: чем сильнее тянешь, тем дальше летит камень', 'Отпусти, чтобы выстрелить, и обрушь крепость на ворчливых слизней', 'Лопни всех слизней, чтобы пройти уровень. Оставшиеся камни = звёзды', 'Лёд легко бьётся, дерево ломается, камень очень прочный'], rocks: 'Камни', slimes: 'Слизни', noRocks: 'Камни кончились!', lvl: 'Уровень {n}', drag: 'Оттяни и отпусти!', pts: 'Очки: {n}', lastRock: 'Последний камень!' },
    de: { title: 'Das Katapult', help: ['Zieh nach hinten zum Zielen – je weiter, desto kräftiger fliegt der Stein', 'Lass los zum Abschießen und bring die Festung auf die grummeligen Schleime', 'Lass alle Schleime platzen, um das Level zu schaffen. Übrige Steine = Sterne', 'Eis zerspringt leicht, Holz bricht, Stein ist sehr hart', 'Tastatur: Pfeile – Winkel und Kraft, Leertaste – Schuss, R – neu'], helpTouch: ['Zieh nach hinten zum Zielen – je weiter, desto kräftiger fliegt der Stein', 'Lass los zum Abschießen und bring die Festung auf die grummeligen Schleime', 'Lass alle Schleime platzen, um das Level zu schaffen. Übrige Steine = Sterne', 'Eis zerspringt leicht, Holz bricht, Stein ist sehr hart'], rocks: 'Steine', slimes: 'Schleime', noRocks: 'Keine Steine mehr!', lvl: 'Level {n}', drag: 'Zieh zurück und lass los!', pts: 'Punkte: {n}', lastRock: 'Letzter Stein!' },
  };

  GK.register('catapult', {
    w: VW, h: VH, bg: '#173a5c', accent: '#ffc65c',
    levels: LEVELS.length,
    text: TXT,
    // לבדיקות: הפיזיקה והשלבים, בלי ציור
    sim: { levels: LEVELS.length, build: buildLevel, step: wStep, shoot, clone, asleep, slimesLeft, rocks: n => LEVELS[n - 1].rocks, starsFor, WAIT_MAX, SOL },

    init(g) {
      g.s = newState(g, g.demo ? 1 : g.level);
      if (g.demo) { for (let i = 0; i < 90; i++) wStep(g.s.W); g.s.W.ev.length = 0; g.s.load = 0; }
      else g.msg(g.t('lvl', { n: g.level }), 1100, '#ffd166');
    },

    step(g) {
      const S = g.s;
      S.clock++;
      if (S.hitT > 0) S.hitT--;
      if (S.load > 0) S.load--;
      // מקלדת: חצים / WASD לזווית ולכוח (לחיצה ממושכת חוזרת), רווח או Enter לשיגור
      if (S.phase === 'ready' && !S.drag && !S.won && S.rocks > 0) {
        const dirs = [['ArrowUp', 'KeyW', 0, 1], ['ArrowDown', 'KeyS', 0, -1], ['ArrowRight', 'KeyD', 1, 1], ['ArrowLeft', 'KeyA', 1, -1]];
        for (const [k1, k2, which, sgn] of dirs) {
          const held = g.key(k1) || g.key(k2), hit = g.hit(k1) || g.hit(k2);
          if (hit) S.rep[k1] = 0;
          if (held) {
            const n = S.rep[k1] = (S.rep[k1] || 0) + 1;
            if (hit || (n > 14 && n % 2 === 0)) {
              S.kb = true;
              if (which === 0) setAim(S, S.aim.a + sgn, S.aim.p); else setAim(S, S.aim.a, S.aim.p + sgn);
              if (which === 1 && S.aim.p % 10 === 0) g.sfx('tick', { p: 0.6 + S.aim.p / 100 });
            }
          }
        }
        if ((g.hit('Space') || g.hit('Enter')) && S.load <= 0) { if (S.aim.p < PMIN) setAim(S, S.aim.a, 50); S.kb = true; fire(g); }
      }
      wStep(S.W);
      S.since++;
      onEvents(g, S);
      // שובל
      const cur = S.cur && !S.cur.dead && S.cur.awake ? S.cur : null;
      if (cur && cur.vx * cur.vx + cur.vy * cur.vy > 40000 && S.clock % 3 === 0) { S.trail.push([cur.x, cur.y]); if (S.trail.length > 14) S.trail.shift(); }
      else if (S.trail.length && S.clock % 3 === 0) S.trail.shift();
      for (const b of S.W.bodies) if (b.role === 'slime') { const d = deco(S, b); d.sq *= 0.88; }
      for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.x += f.vx; f.y += f.vy; f.vy += 0.08; f.vx *= 0.98; f.rot += f.vr; if (--f.life <= 0) S.fx.splice(i, 1); }
      // סדר השלב
      const left = slimesLeft(S.W);
      if (!S.won && left === 0) {
        S.won = true; S.wonT = 0;
        g.flash('#fff6c2', 0.25);
        let bonus = 0;
        for (let i = 0; i < S.rocks; i++) { bonus += 1000; g.float(SX - 46 - i * 26, GY - 40 - i * 6, '+1000', { color: '#ffe066', size: 24 }); }
        S.score += bonus;
        if (S.rocks) g.sfx('coin');
      }
      if (S.won) {
        if (++S.wonT === 80) g.completeLevel(starsFor(S.rocks), { text: g.t('pts', { n: S.score }) });
      } else if (S.phase === 'fly') {
        const calm = asleep(S.W);
        if (S.rocks > 0 && (calm || S.since >= 240)) { S.phase = 'ready'; S.load = RELOAD; g.sfx('place', { p: 1.3 }); }
        else if (S.rocks === 0 && !S.over && (calm || S.since >= WAIT_MAX)) { S.over = true; g.end({ result: 'lose', score: null, title: g.t('noRocks'), text: g.t('pts', { n: S.score }) }); }
      }
      const rk = [];
      for (let i = 0; i < LEVELS[S.lv - 1].rocks; i++) rk.push(i < S.rocks ? '●' : '○');
      g.hud([[g.t('level'), S.lv], [g.t('rocks'), rk.join(''), '#ffd166'], [g.t('slimes'), left, '#9be870'], [g.t('score'), S.score]]);
    },

    idle(g) { const S = g.s; S.clock++; for (const b of S.W.bodies) if (b.role === 'slime') deco(S, b).sq *= 0.9; },

    // בוט לבדיקות: מחכה שהכול נרגע, מכוון (כמו המקלדת) ויורה
    bot(g) {
      const S = g.s;
      if (S.phase !== 'ready' || S.load > 0 || S.won || S.over || S.rocks <= 0) return;
      if (!asleep(S.W) && S.since < WAIT_MAX) return;
      const [a, p] = botAim(S);
      setAim(S, a, p); S.botAim = true;
      fire(g);
      S.botAim = false;
    },

    onKey(g, e) { if (e.code === 'KeyR' && !g.s.won) g.start(g.level); },

    onPointer(g, type, p) {
      const S = g.s;
      const onRb = p.x >= RB.x && p.x <= RB.x + RB.w && p.y >= RB.y && p.y <= RB.y + RB.h;
      if (type === 'move') S.rbHover = onRb;
      if (type === 'down' && onRb && !S.won) { g.start(g.level); return; }
      if (type === 'down') {
        if (S.phase !== 'ready' || S.won || S.rocks <= 0) return;
        S.drag = { x: p.x, y: p.y, id: p.id, moved: false };
      } else if (type === 'move' && S.drag && S.drag.id === p.id) {
        const dx = p.x - S.drag.x, dy = p.y - S.drag.y;
        if (Math.hypot(dx, dy) > 4) S.drag.moved = true;
        if (!S.drag.moved) return;
        const prev = S.aim.p;
        setAim(S, Math.atan2(dy, -dx) * 180 / Math.PI, Math.min(1, Math.hypot(dx, dy) / PULL) * 100);
        if (Math.floor(prev / 10) !== Math.floor(S.aim.p / 10)) g.sfx('tick', { p: 0.6 + S.aim.p / 100 });
      } else if (type === 'up' && S.drag && S.drag.id === p.id) {
        const moved = S.drag.moved;
        S.drag = null;
        if (moved && S.aim.p >= PMIN) fire(g);
      }
    },

    draw(g, ctx) {
      const S = g.s;
      drawScene(g, ctx, S);
    },

    cover(ctx, w, h, k) {
      ctx.save();
      ctx.scale(w / VW * 1.2, h / VH * 1.2);
      ctx.translate(-78, -88);
      drawSky(k, ctx, VW, VH, 40);
      drawGround(ctx, VW, VH, GY);
      const P = launchPos(30, 58);
      drawSlingBack(k, ctx, P.x, P.y, true);
      const S = { cr: [] };
      const blocks = [
        { x: 640, y: 430, hw: 10, hh: 40, a: 0, mat: 'w', hp: 1, hp0: 1 }, { x: 760, y: 430, hw: 10, hh: 40, a: 0, mat: 'w', hp: 1, hp0: 1 },
        { x: 700, y: 380, hw: 80, hh: 10, a: 0, mat: 'w', hp: 1, hp0: 1 }, { x: 670, y: 350, hw: 20, hh: 20, a: 0, mat: 'i', hp: 1, hp0: 1 },
        { x: 730, y: 350, hw: 20, hh: 20, a: 0, mat: 'i', hp: 1, hp0: 1 }, { x: 700, y: 320, hw: 60, hh: 10, a: 0, mat: 's', hp: 1, hp0: 1 },
        { x: 812, y: 440, hw: 30, hh: 30, a: 0, mat: 's', hp: 1, hp0: 1 }, { x: 812, y: 390, hw: 20, hh: 20, a: 0.12, mat: 'w', hp: 1, hp0: 1 },
        { x: 560, y: 450, hw: 20, hh: 20, a: 0, mat: 'i', hp: 1, hp0: 1 },
      ];
      for (const b of blocks) drawBlock(k, ctx, b, S);
      drawSlime(k, ctx, 700, 453, 17, SLIMES[1], { lx: -1, ly: -0.2, scared: true });
      drawSlime(k, ctx, 700, 286, 24, SLIMES[2], { lx: -1, ly: 0.1 });
      drawSlime(k, ctx, 814, 356, 14, SLIMES[0], { lx: -1, ly: 0.2 });
      // אבן באוויר עם שובל
      for (let i = 0; i < 13; i++) { const x = 200 + i * 27, y = 300 - i * 16 + i * i * 0.75; ctx.globalAlpha = 0.1 + i * 0.05; k.circle(ctx, x, y, 3 + i * 0.35); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      drawRock(k, ctx, 568, 222, 17, 0.6);
      drawRock(k, ctx, P.x, P.y, ROCK_R, 0);
      drawSlingFront(k, ctx, P.x, P.y, true);
      for (let i = 0; i < 7; i++) { star(ctx, 600 + i * 18 + (i % 2) * 10, 250 - (i % 3) * 22, 7 + (i % 3) * 2, i); ctx.fillStyle = i % 2 ? '#ffd84d' : '#fff6c2'; ctx.fill(); }
      ctx.restore();
    },
  });
})();
