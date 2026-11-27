// ============================================================
//  טנקים בהרים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  ארטילריה בתורות: זווית, כוח, רוח וארבעה נשקים. נגד המחשב (3 רמות) או 2 שחקנים על מחשב אחד.
//  האדמה היא מפת גבהים: פיצוץ חוצב מכתש, והאדמה שמעליו נופלת פנימה.
//  טנק שהקרקע נעלמה מתחתיו מחליק במדרון ונופל (ונפגע מנפילה גבוהה).
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600, FH = 540, BED = 520;      // העולם, גובה השדה (מתחתיו לוח הבקרה), ראש סלע היסוד שלא נשבר
  const GRAV = 300, VMAX = 640, WIND_A = 4, DT = 1 / 60, SUB = 3;
  const TANK_R = 15, HP0 = 100, ARM = 16, MAX_FLY = 720, TURN_CAP = 60, PMIN = 10;
  const CHUNK_G = 0.5, TANK_G = 0.42, SLIDE_D = 12, SELF_K = 0.5;
  const PI = Math.PI, D2R = PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // הנשקים: רדיוס הפיצוץ, נזק מרבי, תחמושת (-1 = בלי הגבלה), גודל הפגז
  const WPN = [
    { id: 'shell', r: 33, dmg: 38, ammo: -1, sz: 4.5, col: '#3c424c', lt: '#9aa3b0' },
    { id: 'big', r: 54, dmg: 50, ammo: 2, sz: 7, col: '#b8322a', lt: '#ff8a7a' },
    { id: 'triple', r: 24, dmg: 22, ammo: 3, sz: 3.6, col: '#e8901c', lt: '#ffd27a' },
    { id: 'bounce', r: 32, dmg: 32, ammo: 3, sz: 5.2, col: '#2f9e52', lt: '#9ff0b4', bounces: 3 },
  ];
  const SKIN = [
    { body: '#3d8bfd', lt: '#a9cdff', dk: '#1b4c9e' },
    { body: '#ff5a4e', lt: '#ffb4aa', dk: '#a3261d' },
  ];
  // המחשב: כמה רחוק (בפיקסלים) הוא מחטיא. ירייה ראשונה, כמה מהטעות נשאר בכל ירייה, ורעש קבוע שלא נעלם
  const AI = [
    { first: 340, keep: 0.86, floor: 240, special: 0.05 },   // קל — מחטיא הרבה
    { first: 170, keep: 0.7, floor: 80, special: 0.25 },     // בינוני
    { first: 90, keep: 0.5, floor: 24, special: 0.45 },      // קשה
  ];
  const THEMES = [
    { id: 'meadow', sky: ['#3d8fde', '#8fcbf5', '#dcf2ff'], sun: '#fff3c4', far: 'peaks', farC: '#7f9fc6', farD: '#6886ad', cap: '#f4f8ff', mid: '#5c8c69', midD: '#3f6d4c', tree: 'pine',
      top: '#63c23f', topD: '#3b8a27', blade: '#8de35f', dirt: ['#ae7843', '#88592f', '#5c3b1f'], strata: 'rgba(70,40,15,.16)', peb: 'rgba(80,50,25,.55)', scorch: '#3a2715', bed: '#4b5058', haze: 'rgba(220,240,255,' },
    { id: 'snow', sky: ['#6c98c9', '#b7d2ec', '#eef5fb'], sun: '#ffffff', far: 'peaks', farC: '#90a5c0', farD: '#7489a6', cap: '#ffffff', mid: '#7c92a7', midD: '#5d7389', tree: 'snowpine', snowfall: true,
      top: '#f6faff', topD: '#b4c9df', blade: null, dirt: ['#9c9faa', '#7c7f8c', '#5a5d69'], strata: 'rgba(40,44,60,.15)', peb: 'rgba(50,54,66,.5)', scorch: '#33353d', bed: '#3e424b', haze: 'rgba(235,244,252,' },
    { id: 'canyon', sky: ['#ee7d45', '#f7b46c', '#fde0aa'], sun: '#fff1c9', far: 'mesas', farC: '#c26a4a', farD: '#a4553a', cap: null, mid: '#a5553c', midD: '#86422d', tree: 'cactus',
      top: '#f0c27a', topD: '#c78a46', blade: '#d6a35e', dirt: ['#d98a52', '#b4653a', '#874426'], strata: 'rgba(90,35,10,.16)', peb: 'rgba(110,50,25,.5)', scorch: '#4a2414', bed: '#5b3a2e', haze: 'rgba(253,224,170,' },
    { id: 'night', sky: ['#0b1532', '#1c2c5a', '#3a4b7e'], moon: true, far: 'peaks', farC: '#2c3c69', farD: '#22305a', cap: '#c3d1f0', mid: '#1f2d4e', midD: '#17223d', tree: 'pine',
      top: '#4f9a62', topD: '#2b6a3d', blade: '#6cbf7f', dirt: ['#6c5a7a', '#524462', '#3a2f48'], strata: 'rgba(20,10,35,.2)', peb: 'rgba(25,15,40,.5)', scorch: '#1d1526', bed: '#2b2c3c', haze: 'rgba(58,75,126,' },
  ];

  // לוח הבקרה למטה (ומקומות הכפתורים לבדיקת לחיצה)
  const DB = {
    aL: { x: 10, y: 549, w: 40, h: 42 }, aR: { x: 150, y: 549, w: 40, h: 42 },
    pD: { x: 204, y: 549, w: 40, h: 42 }, pU: { x: 364, y: 549, w: 40, h: 42 },
    wp: [0, 1, 2, 3].map(i => ({ x: 420 + i * 86, y: 546, w: 80, h: 48 })),
    fire: { x: 776, y: 546, w: 174, h: 48 },
  };
  const inR = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  function gauss() { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * Math.random()); }

  // ================= האדמה =================
  function genWorld(rnd) {
    const n = W + 1;
    const T = { h: new Float32Array(n), grass: new Uint8Array(n).fill(1), cLen: new Float32Array(n), cBot: new Float32Array(n), cV: new Float32Array(n), fall: 0 };
    const r = rnd();
    const kind = r < 0.36 ? 'peak' : r < 0.58 ? 'twin' : r < 0.8 ? 'valley' : 'hills';
    const base = 335 + rnd() * 70;
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
    const a1 = 20 + rnd() * 24, a2 = 9 + rnd() * 11, a3 = 3 + rnd() * 4;
    const cx = W / 2 + (rnd() - 0.5) * 140, big = 130 + rnd() * 120, pw = 80 + rnd() * 50;
    const bump = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));
    for (let x = 0; x <= W; x++) {
      let y = base + a1 * Math.sin(x * 0.0058 + p1) + a2 * Math.sin(x * 0.0157 + p2) + a3 * Math.sin(x * 0.041 + p3);
      if (kind === 'peak') y -= big * bump(x, cx, pw);
      else if (kind === 'twin') y -= big * 0.78 * bump(x, cx - 125, 66) + big * 0.62 * bump(x, cx + 135, 72);
      else if (kind === 'valley') y += 80 * bump(x, cx, 150) - 75 * (bump(x, 110, 120) + bump(x, W - 110, 120));
      else y -= 75 * bump(x, cx - 170, 85) + 95 * bump(x, cx + 120, 78);
      T.h[x] = clamp(y, 130, BED - 44);
    }
    // משטחים ישרים לטנקים
    const xs = [Math.round(70 + rnd() * 150), Math.round(W - 70 - rnd() * 150)];
    for (const xi of xs) {
      let avg = 0;
      for (let x = xi - 20; x <= xi + 20; x++) avg += T.h[x];
      avg /= 41;
      for (let x = xi - 42; x <= xi + 42; x++) {
        if (x < 0 || x > W) continue;
        const d = Math.abs(x - xi), k = d <= 22 ? 1 : 0.5 + 0.5 * Math.cos((d - 22) / 20 * PI);
        T.h[x] = T.h[x] + (avg - T.h[x]) * k;
      }
    }
    return { T, xs, kind };
  }
  // פני השטח לפיזיקה: אם עמודה נופלת — ראש הגוש הנופל
  function topAt(T, i) { return T.cLen[i] > 0 ? T.cBot[i] - T.cLen[i] : T.h[i]; }
  function surf(T, x) {
    if (!(x > 0)) x = 0; else if (x > W) x = W;
    const i = x | 0, f = x - i, j = i < W ? i + 1 : W;
    const a = topAt(T, i);
    return a + (topAt(T, j) - a) * f;
  }
  // מכתש: מה שבתוך העיגול נעלם, והאדמה שמעליו נופלת פנימה
  function carve(T, cx, cy, r) {
    const x0 = Math.max(0, Math.ceil(cx - r)), x1 = Math.min(W, Math.floor(cx + r));
    let any = false;
    for (let x = x0; x <= x1; x++) {
      if (T.cLen[x] > 0) { T.h[x] -= T.cLen[x]; T.cLen[x] = 0; T.cV[x] = 0; }
      const dx = x - cx, dy = Math.sqrt(Math.max(0, r * r - dx * dx));
      const top = cy - dy, bot = Math.min(cy + dy, BED), s = T.h[x];
      if (bot <= s || bot <= top) continue;
      any = true;
      if (s < top) { T.cLen[x] = top - s; T.cBot[x] = top; T.cV[x] = 0; T.h[x] = bot; }
      else { T.h[x] = bot; T.grass[x] = 0; }
    }
    T.fall = 0;
    for (let x = 0; x <= W; x++) if (T.cLen[x] > 0) T.fall++;
    return any;
  }
  function stepChunks(T) {
    if (T.fall <= 0) return 0;
    let n = 0, landed = 0;
    for (let x = 0; x <= W; x++) {
      if (T.cLen[x] <= 0) continue;
      T.cV[x] += CHUNK_G; T.cBot[x] += T.cV[x];
      if (T.cBot[x] >= T.h[x]) { T.h[x] -= T.cLen[x]; T.cLen[x] = 0; T.cV[x] = 0; landed++; } else n++;
    }
    T.fall = n;
    return n > 0 ? n : landed ? -landed : 0;
  }

  // ================= הטנקים =================
  function support(T, x) {
    let yL = 1e9, yR = 1e9;
    for (let k = 2; k <= 14; k += 2) { const a = surf(T, x - k), b = surf(T, x + k); if (a < yL) yL = a; if (b < yR) yR = b; }
    const c = surf(T, x), hi = Math.min(yL, yR, c), d = yR - yL;
    return { y: Math.min((yL + yR) / 2, c, hi + 7), d, ang: Math.atan2(clamp(d, -14, 14), 24) };
  }
  function newTank(i, x, T) {
    const s = support(T, x);
    return { i, x, y: s.y, vy: 0, ang: s.ang, slide: 0, kick: 0, air: false, fallY: 0, hp: HP0, shown: HP0, aim: i ? 135 : 45, pow: 62, w: 0,
      ammo: WPN.map(w => w.ammo), flash: 0, recoil: 0, roll: 0, dead: false, smokeT: 0 };
  }
  function pivot(tk) { return { x: tk.x + Math.sin(tk.ang) * 17, y: tk.y - Math.cos(tk.ang) * 17 }; }

  // ================= פגזים =================
  function newShell(tk, a, p, wi, sub) {
    const r = a * D2R, ca = Math.cos(r), sa = Math.sin(r), pv = pivot(tk), v = p / 100 * VMAX;
    return { x: pv.x + ca * 24, y: pv.y - sa * 24, vx: ca * v, vy: -sa * v, wi, owner: tk.i, t: 0, bounces: 0, sub: sub || 0, trail: [], apex: false, bounced: 0, hit: null };
  }
  // צעד אחד (1/60 שנייה) של פגז. מחזיר null, 'out', 'tank' או 'ground'. לא משנה שום דבר מלבד הפגז (גם המחשב מחשב איתו)
  function moveShell(S, sh) {
    const T = S.T, hs = DT / SUB, ax = S.wind * WIND_A, w = WPN[sh.wi];
    const rr = (TANK_R + w.sz) * (TANK_R + w.sz);
    for (let k = 0; k < SUB; k++) {
      sh.vx += ax * hs; sh.vy += GRAV * hs;
      sh.x += sh.vx * hs; sh.y += sh.vy * hs;
      if (sh.x < -50 || sh.x > W + 50) return 'out';
      for (const tk of S.tanks) {
        if (tk.dead || (tk.i === sh.owner && sh.t < ARM)) continue;
        const dx = sh.x - tk.x, dy = sh.y - (tk.y - 9);
        if (dx * dx + dy * dy < rr) { sh.hit = tk; return 'tank'; }
      }
      if (sh.x >= 0 && sh.x <= W) {
        const gy = surf(T, sh.x);
        if (sh.y >= gy) {
          if (w.bounces && sh.bounces < w.bounces) {
            const sl = (surf(T, sh.x + 3) - surf(T, sh.x - 3)) / 6, L = Math.hypot(sl, 1), nx = sl / L, ny = -1 / L;
            const vn = sh.vx * nx + sh.vy * ny;
            if (vn < 0) { sh.vx = (sh.vx - 1.6 * vn * nx) * 0.88; sh.vy = (sh.vy - 1.6 * vn * ny) * 0.88; }
            sh.y = gy - 1; sh.bounces++; sh.bounced++;
            if (sh.vx * sh.vx + sh.vy * sh.vy < 4900) return 'ground';
            continue;
          }
          sh.y = Math.min(sh.y, gy + 1);
          return 'ground';
        }
      }
    }
    if (++sh.t > MAX_FLY) return 'out';
    return null;
  }
  function simShot(S, tk, a, p, wi) {
    const sh = newShell(tk, a, p, wi);
    let ev = null;
    for (let i = 0; i <= MAX_FLY + 2 && !ev; i++) ev = moveShell(S, sh);
    return { x: sh.x, y: sh.y, ev: ev || 'out', hit: sh.hit };
  }
  // הירייה המושלמת (זווית וכוח בשלמים, כמו שבן אדם יכול לכוון), עם הרוח והאדמה של עכשיו
  function solve(S, me, foe, wi) {
    const dir = foe.x >= me.x ? 1 : -1, tx = foe.x, ty = foe.y - 9, w = WPN[wi];
    const score = (el, p) => {
      const a = dir > 0 ? el : 180 - el, r = simShot(S, me, a, p, wi);
      let d;
      if (r.ev === 'tank' && r.hit === foe) d = 0;
      else if (r.ev === 'out') d = 2000 + Math.abs(r.x - tx);
      else d = Math.hypot(r.x - tx, r.y - ty);
      if (r.ev === 'tank' && r.hit === me) d += 3000;
      else if (r.ev !== 'out' && Math.hypot(r.x - me.x, r.y - me.y + 9) < w.r + 26) d += 1500;
      return { a, el, p, d: d + Math.abs(el - 52) * 0.12, x: r.x, miss: d };
    };
    let best = null;
    for (let el = 18; el <= 82; el += 4) for (let p = 22; p <= 100; p += 3) { const c = score(el, p); if (!best || c.d < best.d) best = c; }
    const b0 = best;
    for (let el = b0.el - 3; el <= b0.el + 3; el++) for (let p = b0.p - 3; p <= b0.p + 3; p++) {
      if (p < PMIN || p > 100 || el < 5 || el > 88 || (el === b0.el && p === b0.p)) continue;
      const c = score(el, p);
      if (c.d < best.d) best = c;
    }
    // כמה פיקסלים זזה הנחיתה לכל יחידת כוח (כדי שהטעות של המחשב תהיה בפיקסלים)
    const ra = simShot(S, me, best.a, Math.min(100, best.p + 2), wi), rb = simShot(S, me, best.a, Math.max(PMIN, best.p - 2), wi);
    let slope = (ra.x - rb.x) / ((Math.min(100, best.p + 2) - Math.max(PMIN, best.p - 2)) || 1) * dir;
    if (!(slope > 3) || ra.ev === 'out' || rb.ev === 'out') slope = 16;
    best.slope = Math.min(slope, 40);
    return best;
  }

  // ================= מצב המשחק =================
  function newState(g, keep) {
    const seed = (Math.random() * 1e9) | 0, rnd = GK.U.seeded(seed);
    const th = THEMES[Math.floor(rnd() * THEMES.length)];
    const wd = genWorld(rnd);
    const S = {
      wins: keep.wins, matches: keep.matches, th, kind: wd.kind, T: wd.T,
      tanks: [newTank(0, wd.xs[0], wd.T), newTank(1, wd.xs[1], wd.T)],
      turn: 0, turns: 0, phase: 'aim', aimT: 0, wind: Math.round((rnd() - 0.5) * 8), windShown: 0, shells: [], main: null,
      booms: [], parts: [], smoke: [], debris: [], trace: [[], []], land: [null, null], plan: null, aiBias: null, aiN: 0,
      drag: null, hold: null, hover: null, rep: {}, showAim: 0, settleT: 0, dieT: 0, clock: 0, shooter: 0, done: false,
      back: genBack(rnd, th), deco: genDeco(rnd),
    };
    S.windShown = S.wind;
    return S;
  }
  function genBack(rnd, th) {
    const peaks = [];
    for (let i = 0; i < 7; i++) peaks.push({ x: -60 + i * 170 + rnd() * 80, h: th.far === 'mesas' ? 90 + rnd() * 90 : 130 + rnd() * 120, w: th.far === 'mesas' ? 90 + rnd() * 60 : 120 + rnd() * 90 });
    peaks.sort((a, b) => a.h - b.h);
    const hills = [], ph = rnd() * 6, ph2 = rnd() * 6;
    for (let x = 0; x <= W; x += 12) hills.push(356 + Math.sin(x * 0.009 + ph) * 22 + Math.sin(x * 0.023 + ph2) * 10);
    const trees = [];
    for (let x = 6; x < W; x += 10 + rnd() * 18) if (rnd() < (th.tree === 'cactus' ? 0.22 : 0.72)) trees.push({ x, s: 0.7 + rnd() * 0.6 });
    const clouds = [];
    for (let i = 0; i < 6; i++) clouds.push({ x: rnd() * (W + 200) - 100, y: 70 + rnd() * 120, s: 0.6 + rnd() * 0.7 });
    const stars = [];
    for (let i = 0; i < 80; i++) stars.push({ x: rnd() * W, y: rnd() * 300, r: 0.6 + rnd() * 1.3, ph: rnd() * 6 });
    const flakes = [];
    for (let i = 0; i < 70; i++) flakes.push({ x: rnd() * W, y: rnd() * FH, r: 1 + rnd() * 2, sp: 0.4 + rnd() * 0.8, ph: rnd() * 6 });
    return { peaks, hills, trees, clouds, stars, flakes };
  }
  function genDeco(rnd) {
    const strata = [];
    for (let k = 0; k < 3; k++) strata.push({ y: 300 + k * 62 + rnd() * 24, f: 0.008 + rnd() * 0.012, a: 5 + rnd() * 10, ph: rnd() * 6 });
    const pebbles = [];
    for (let i = 0; i < 70; i++) pebbles.push({ x: rnd() * W, y: 190 + rnd() * 330, r: 1.6 + rnd() * 3.4, a: rnd() * 3 });
    const blades = [];
    for (let x = 2; x < W; x += 5 + rnd() * 6) blades.push({ x: Math.round(x), h: 4 + rnd() * 6, l: (rnd() - 0.5) * 4 });
    return { strata, pebbles, blades };
  }
  const isCpu = (g, S, i) => g.demo || (g.mode !== '2p' && i === 1);
  const nameOf = (g, i) => (g.mode === '2p' ? g.t(i ? 'p2' : 'p1') : g.t(i ? 'cpu' : 'you'));

  function damage(g, S, tk, d, by) {
    if (d <= 0 || tk.hp <= 0) return 0;
    d = Math.min(Math.round(d), tk.hp);
    tk.hp -= d; tk.flash = 12;
    if (!g.demo && g.mode !== '2p' && by === 0 && tk.i === 1) g.score += d * 10;
    return d;
  }

  // ----- חלקיקים משלי (כדי שלא יצוירו מעל לוח הבקרה) -----
  function puff(S, x, y, o) {
    const n = o.n || 10;
    for (let i = 0; i < n; i++) {
      if (S.parts.length > 420) break;
      const a = (o.dir != null ? o.dir : -PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : PI * 2), v = (o.speed || 3) * (0.35 + Math.random() * 0.9);
      const life = (o.life || 40) * (0.6 + Math.random() * 0.6);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: (o.size || 4) * (0.6 + Math.random() * 0.8), col: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color, g: o.gravity != null ? o.gravity : 0.2, sq: !!o.sq, rot: Math.random() * 6 });
    }
  }
  function smokeAt(S, x, y, n, dark, big) {
    for (let i = 0; i < n; i++) {
      if (S.smoke.length > 110) S.smoke.shift();
      const life = 60 + Math.random() * 50;
      S.smoke.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.6, vy: -0.3 - Math.random() * 0.7, r: (big || 8) * (0.6 + Math.random() * 0.7), life, max: life, c: dark ? 40 + Math.random() * 30 : 150 + Math.random() * 60 });
    }
  }

  function explode(g, S, x, y, wi, owner, direct) {
    const w = WPN[wi], th = S.th;
    carve(S.T, x, y, w.r);
    let hitAny = false;
    for (const tk of S.tanks) {
      if (tk.dead) continue;
      const d = Math.hypot(tk.x - x, tk.y - 9 - y);
      let dm = tk === direct ? w.dmg : Math.round(w.dmg * clamp(1 - Math.max(0, d - 8) / (w.r + 10), 0, 1));
      if (owner === tk.i) dm = Math.round(dm * SELF_K);   // הפגז שלך פוגע בך רק בחצי
      if (dm <= 0) continue;
      dm = damage(g, S, tk, dm, owner);
      if (!dm) continue;
      hitAny = true;
      tk.kick += (Math.sign(tk.x - x) || (tk.i ? 1 : -1)) * Math.min(2.4, dm / 14);
      g.float(tk.x, tk.y - 58, '-' + dm, { color: '#ff6b5e', size: 26 + Math.min(10, dm / 5) });
      if (!g.demo) {
        if (tk === direct && owner !== tk.i) g.float(tk.x, tk.y - 86, g.t('direct'), { color: '#ffe066', size: 22 });
        if (owner === tk.i) g.float(tk.x, tk.y - 86, g.t('selfHit'), { color: '#ffd0c8', size: 18 });
        if (owner === 0 && tk.i === 1 && g.mode !== '2p') g.float(tk.x + 34, tk.y - 30, '+' + dm * 10, { color: '#ffffff', size: 18 });
      }
    }
    S.booms.push({ x, y, r: w.r, t: 0, life: 26 + w.r * 0.35 });
    puff(S, x, y, { n: 10 + w.r * 0.45, color: th.dirt.concat([th.top]), speed: 3 + w.r / 14, life: 46, gravity: 0.24, size: 5, sq: true });
    puff(S, x, y, { n: 10, color: ['#fff3b0', '#ffc24a', '#ff7b2e'], speed: 4.5, life: 22, gravity: 0.06, size: 3.5 });
    smokeAt(S, x, y - 6, 4 + (w.r / 12 | 0), true, 8 + w.r * 0.18);
    if (!g.demo) {
      g.shake(Math.min(11, 2 + w.r / 7) + (hitAny ? 2 : 0));
      if (w.r > 40) g.flash('#fff4d0', 0.22);
      g.sfx('boom', { p: w.r > 40 ? 0.75 : wi === 2 ? 1.3 : 1 });
      if (hitAny) g.sfx('hit', { p: 0.9 });
    }
  }

  function fire(g, S) {
    if (S.phase !== 'aim' || S.done) return false;
    const tk = S.tanks[S.turn];
    if (tk.ammo[tk.w] === 0) tk.w = 0;
    const wi = tk.w;
    if (tk.ammo[wi] > 0) tk.ammo[wi]--;
    const list = WPN[wi].id === 'triple' ? [[1.2, 0.95], [0, 1], [-1.2, 1.05]] : [[0, 1]];
    S.shells.length = 0;
    list.forEach(([da, k], j) => S.shells.push(newShell(tk, tk.aim + da, tk.pow * k, wi, j)));
    S.main = S.shells[list.length === 3 ? 1 : 0];
    S.trace[tk.i] = []; S.land[tk.i] = null; S.shooter = tk.i;
    S.phase = 'fly'; S.flyT = 0; S.plan = null; S.drag = null; S.hold = null;
    tk.recoil = 1;
    if (tk.ammo[wi] === 0) tk.w = 0;
    const pv = pivot(tk), r = tk.aim * D2R, mx = pv.x + Math.cos(r) * 26, my = pv.y - Math.sin(r) * 26;
    puff(S, mx, my, { n: 12, color: ['#fff6c2', '#ffcf4a', '#ff8a2e'], speed: 3.2, life: 14, gravity: 0, size: 4, dir: -r, spread: 0.9 });
    smokeAt(S, mx, my, 4, false, 7);
    if (!g.demo) {
      g.sfx('shoot', { p: wi === 1 ? 0.6 : 0.85 });
      g.tone({ f: 120, f2: 40, dur: 0.3, type: 'sine', vol: 0.24 });
      g.noise({ f: 1200, f2: 120, dur: 0.32, vol: 0.16 });
      g.shake(wi === 1 ? 4 : 2.5);
    }
    return true;
  }

  function nextTurn(g, S) {
    S.turn = 1 - S.turn; S.turns++;
    let w = S.wind + Math.round((Math.random() - 0.5) * 6);
    if (Math.random() < 0.12) w = Math.round((Math.random() - 0.5) * 16);
    S.wind = clamp(w, -10, 10);
    S.phase = 'aim'; S.aimT = 0; S.plan = null; S.showAim = 0;
    if (!g.demo) {
      if (!isCpu(g, S, S.turn)) g.msg(g.mode === '2p' ? g.t('turnOf', { name: nameOf(g, S.turn) }) : g.t('yourTurn'), 900, SKIN[S.turn].lt);
      g.sfx('move', { p: S.turn ? 0.8 : 1.1 });
    }
  }

  function killTank(g, S, tk) {
    tk.dead = true; tk.slide = 0;
    carve(S.T, tk.x, tk.y - 4, 24);
    S.booms.push({ x: tk.x, y: tk.y - 10, r: 70, t: 0, life: 50 });
    S.booms.push({ x: tk.x - 14, y: tk.y - 30, r: 40, t: -8, life: 36 });
    puff(S, tk.x, tk.y - 10, { n: 34, color: [SKIN[tk.i].body, SKIN[tk.i].dk, '#30343c', '#ffcf4a'], speed: 6, life: 60, gravity: 0.22, size: 6, sq: true });
    smokeAt(S, tk.x, tk.y - 16, 10, true, 16);
    const r = tk.aim * D2R;
    S.debris.push({ x: tk.x, y: tk.y - 17, vx: (Math.random() - 0.5) * 3 + (tk.i ? 1.2 : -1.2), vy: -9.5, rot: 0, vr: (Math.random() - 0.5) * 0.4, a: r, i: tk.i, rest: false, bounce: 0 });
    if (!g.demo) { g.shake(14); g.flash('#ffe8b0', 0.4); g.sfx('boom', { p: 0.6 }); g.sfx('break', { p: 0.7 }); }
  }

  function finish(g, S, cap) {
    if (S.done) return;
    S.done = true;
    const [a, b] = S.tanks, da = a.hp <= 0, dbb = b.hp <= 0;
    if (g.demo) { S.restart = true; return; }
    const capTxt = cap ? g.t('timeUp') + ' · ' : '';
    let w = da && dbb ? -1 : da ? 1 : dbb ? 0 : a.hp > b.hp ? 0 : b.hp > a.hp ? 1 : -1;
    if (g.mode === '2p') {
      if (w >= 0) S.wins[w]++;
      const txt = capTxt + g.t('tally', { a: S.wins[0], b: S.wins[1] });
      if (w < 0) g.end({ result: 'draw', score: null, text: txt, delay: 400 });
      else g.end({ winner: nameOf(g, w), score: null, text: txt, delay: 400 });
      return;
    }
    const st = g.load('wins', [0, 0, 0]);
    if (w === 0) { st[g.diff]++; g.save('wins', st); g.score += 1000 + a.hp * 10; }
    const txt = capTxt + g.t('winsOn', { d: g.t(['easy', 'medium', 'hard'][g.diff]), n: st[g.diff] });
    g.end({ result: w === 0 ? 'win' : w < 0 ? 'draw' : 'lose', score: g.score, text: txt, delay: 400 });
  }

  // ================= תור המחשב =================
  function cpuPlan(g, S, me, foe) {
    const P = AI[g.demo ? 1 : g.diff];
    let wi = 0;
    const avail = [1, 2, 3].filter(i => me.ammo[i] !== 0);
    if (avail.length && Math.random() < P.special) wi = avail[Math.floor(Math.random() * avail.length)];
    const sol = solve(S, me, foe, wi);
    // הטעות בפיקסלים: מתחילה גדולה, קטנה מירייה לירייה (כמו בן אדם שמתקן), ותמיד נשאר רעש לפי הרמה
    S.aiBias = S.aiBias == null ? gauss() * P.first : S.aiBias * P.keep;
    const errPx = S.aiBias + gauss() * P.floor;
    const p = clamp(Math.round(sol.p + errPx / sol.slope), PMIN, 100);
    return { wi, a: sol.a, p, err: errPx };
  }
  function cpuStep(g, S, tk) {
    if (!S.plan) { S.plan = cpuPlan(g, S, tk, S.tanks[1 - tk.i]); S.from = { a: tk.aim, p: tk.pow }; }
    const P = S.plan, t0 = 26, t1 = 74;
    if (S.aimT === 16 && P.wi !== tk.w) { tk.w = P.wi; g.sfx('click'); }
    if (S.aimT > t0 && S.aimT <= t1) {
      const u = GK.U.ease.inOut((S.aimT - t0) / (t1 - t0));
      tk.aim = Math.round(S.from.a + (P.a - S.from.a) * u);
      tk.pow = Math.round(S.from.p + (P.p - S.from.p) * u);
      if (S.aimT % 6 === 0) g.sfx('tick', { p: 0.6 + tk.pow / 120 });
    }
    if (S.aimT === t1 + 18) { tk.aim = P.a; tk.pow = P.p; fire(g, S); }
  }

  // ================= שליטה של שחקן =================
  function adjust(g, S, tk, id) {
    const a0 = tk.aim, p0 = tk.pow;
    if (id === 'aL') tk.aim = Math.min(180, tk.aim + 1);
    else if (id === 'aR') tk.aim = Math.max(0, tk.aim - 1);
    else if (id === 'pU') tk.pow = Math.min(100, tk.pow + 1);
    else if (id === 'pD') tk.pow = Math.max(PMIN, tk.pow - 1);
    if (tk.aim !== a0 || tk.pow !== p0) {
      S.showAim = 90;
      if ((id[0] === 'p' ? tk.pow : tk.aim) % 5 === 0) g.sfx('tick', { p: 0.6 + tk.pow / 120 });
    }
  }
  function pickWeapon(g, S, tk, wi) {
    if (wi < 0 || wi > 3 || tk.ammo[wi] === 0) { g.sfx('error'); return; }
    if (tk.w !== wi) { tk.w = wi; g.sfx('click', { p: 1.2 }); S.wpFlash = 20; }
  }
  function cycleWeapon(g, S, tk, d) {
    for (let k = 1; k <= 4; k++) { const wi = (tk.w + d * k + 8) % 4; if (tk.ammo[wi] !== 0) { pickWeapon(g, S, tk, wi); return; } }
  }
  function aimAt(S, tk, p) {
    const pv = pivot(tk), dx = p.x - pv.x, dy = pv.y - p.y;
    let a = Math.atan2(dy, dx) / D2R;
    if (a < 0) a = dx >= 0 ? 0 : 180;
    tk.aim = clamp(Math.round(a), 0, 180);
    tk.pow = clamp(Math.round(Math.hypot(dx, dy) / 2), PMIN, 100);
    S.showAim = 90;
  }
  const ACTS = [['ArrowLeft', 'KeyA', 'aL'], ['ArrowRight', 'KeyD', 'aR'], ['ArrowUp', 'KeyW', 'pU'], ['ArrowDown', 'KeyS', 'pD']];
  function humanStep(g, S, tk) {
    for (const [k1, k2, id] of ACTS) {
      const hit = g.hit(k1) || g.hit(k2), held = g.key(k1) || g.key(k2) || (S.hold && S.hold.id === id);
      if (hit) { adjust(g, S, tk, id); S.rep[id] = 1; continue; }
      if (!held) { S.rep[id] = 0; continue; }
      const n = S.rep[id] = (S.rep[id] || 0) + 1;
      if (n > 16 && n % (n > 70 ? 1 : 3) === 0) adjust(g, S, tk, id);
    }
    if (g.hit('KeyQ')) cycleWeapon(g, S, tk, -1);
    if (g.hit('KeyE')) cycleWeapon(g, S, tk, 1);
    for (let i = 0; i < 4; i++) if (g.hit('Digit' + (i + 1)) || g.hit('Numpad' + (i + 1))) pickWeapon(g, S, tk, i);
    if (g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter')) fire(g, S);
  }

  // ================= צעד העולם (גם בתפריט ובמסך הסוף) =================
  function stepWorld(g, S) {
    S.clock++;
    S.windShown += (S.wind - S.windShown) * 0.06;
    for (const c of S.back.clouds) { c.x += (0.12 + S.windShown * 0.045) * c.s; if (c.x > W + 140) c.x = -140; if (c.x < -140) c.x = W + 140; }
    if (S.th.snowfall) for (const f of S.back.flakes) { f.y += f.sp; f.x += Math.sin(S.clock * 0.02 + f.ph) * 0.3 + S.windShown * 0.12; if (f.y > FH) { f.y = -4; f.x = Math.random() * W; } if (f.x > W) f.x -= W; if (f.x < 0) f.x += W; }
    // פגזים
    for (let i = S.shells.length - 1; i >= 0; i--) {
      const sh = S.shells[i], vy0 = sh.vy;
      const ev = moveShell(S, sh);
      if (!sh.apex && vy0 < 0 && sh.vy >= 0) { sh.apex = true; if (sh === S.main) g.tone({ f: 1500, f2: 620, dur: 1.1, type: 'sine', vol: 0.035 }); }
      if (sh.bounced) {
        sh.bounced = 0;
        puff(S, sh.x, sh.y, { n: 8, color: S.th.dirt, speed: 2.4, life: 24, gravity: 0.2, size: 4, sq: true });
        g.sfx('bounce', { p: 1.1 + sh.bounces * 0.12 });
      }
      if (sh.t % 2 === 0) { sh.trail.push(sh.x, sh.y); if (sh.trail.length > 40) sh.trail.splice(0, 2); }
      if (sh === S.main && sh.t % 3 === 0 && S.trace[sh.owner].length < 480) S.trace[sh.owner].push(sh.x, sh.y);
      if (ev) {
        if (sh === S.main) { S.trace[sh.owner].push(sh.x, sh.y); S.land[sh.owner] = ev === 'out' ? null : { x: sh.x, y: sh.y }; }
        if (ev !== 'out') explode(g, S, sh.x, sh.y, sh.wi, sh.owner, ev === 'tank' ? sh.hit : null);
        S.shells.splice(i, 1);
      }
    }
    const ch = stepChunks(S.T);
    if (ch < 0 && !g.demo) g.sfx('place', { p: 0.55 });
    S.dirt = ch > 0;
    let moving = false;
    for (const tk of S.tanks) if (stepTank(g, S, tk)) moving = true;
    S.moving = moving;
    for (let i = S.booms.length - 1; i >= 0; i--) if (++S.booms[i].t >= S.booms[i].life) S.booms.splice(i, 1);
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.98; p.rot += 0.2;
      if (p.y > FH - 2) { p.y = FH - 2; p.vy *= -0.3; p.vx *= 0.6; }
      if (--p.life <= 0) { S.parts[i] = S.parts[S.parts.length - 1]; S.parts.pop(); }
    }
    for (let i = S.smoke.length - 1; i >= 0; i--) {
      const s = S.smoke[i];
      s.x += s.vx + S.windShown * 0.05; s.y += s.vy; s.r += 0.12;
      if (--s.life <= 0) S.smoke.splice(i, 1);
    }
    for (const d of S.debris) {
      if (d.rest) continue;
      d.vy += 0.35; d.x += d.vx; d.y += d.vy; d.rot += d.vr;
      if (d.x < 8 || d.x > W - 8) { d.vx = -d.vx * 0.5; d.x = clamp(d.x, 8, W - 8); }
      const gy = surf(S.T, d.x) - 5;
      if (d.y >= gy && d.vy > 0) {
        d.y = gy;
        if (d.bounce++ < 2 && d.vy > 2) { d.vy *= -0.35; d.vx *= 0.6; d.vr *= 0.5; puff(S, d.x, d.y + 4, { n: 6, color: S.th.dirt, speed: 2, life: 20, size: 3, sq: true }); if (!g.demo) g.sfx('place', { p: 0.7 }); }
        else { d.rest = true; d.rot = Math.round(d.rot / PI) * PI; }
      }
    }
    for (const tk of S.tanks) if (tk.dead && ++tk.smokeT % 9 === 0) smokeAt(S, tk.x + (Math.random() - 0.5) * 10, tk.y - 16, 1, true, 9);
    if (S.wpFlash > 0) S.wpFlash--;
    if (S.showAim > 0 && !S.drag) S.showAim--;
  }
  function stepTank(g, S, tk) {
    const T = S.T;
    if (tk.flash > 0) tk.flash--;
    if (tk.recoil > 0) tk.recoil = Math.max(0, tk.recoil - 0.07);
    tk.shown += (tk.hp - tk.shown) * 0.08;
    if (Math.abs(tk.shown - tk.hp) < 0.3) tk.shown = tk.hp;
    let sp = support(T, tk.x);
    const grounded = !tk.air && tk.y >= sp.y - 1.5;
    if (grounded && Math.abs(sp.d) > SLIDE_D) {
      const dir = Math.sign(sp.d);
      if (tk.slide && Math.sign(tk.slide) !== dir) tk.slide *= 0.4;
      tk.slide = clamp(tk.slide + dir * 0.14, -2.6, 2.6);
    } else tk.slide *= 0.8;
    if (Math.abs(tk.slide) < 0.04) tk.slide = 0;
    tk.kick *= 0.88;
    if (Math.abs(tk.kick) < 0.04) tk.kick = 0;
    const mv = tk.slide + tk.kick;
    if (mv) {
      const nx = clamp(tk.x + mv, 16, W - 16);
      if (nx === tk.x) { tk.slide = 0; tk.kick = 0; }
      tk.roll += nx - tk.x; tk.x = nx;
      sp = support(T, tk.x);
      if (Math.abs(tk.slide) > 1 && S.clock % 4 === 0) puff(S, tk.x - Math.sign(tk.slide) * 14, tk.y - 2, { n: 2, color: S.th.dirt, speed: 1.2, life: 18, size: 3, gravity: 0.05 });
    }
    tk.ang += (sp.ang - tk.ang) * 0.25;
    if (tk.y < sp.y - 0.8) {
      if (!tk.air) { tk.air = true; tk.fallY = tk.y; tk.vy = 0; }
      tk.vy += TANK_G; tk.y += tk.vy;
      if (tk.y >= sp.y) land(g, S, tk, sp.y);
    } else if (tk.air) land(g, S, tk, sp.y);
    else tk.y = sp.y;
    return tk.air || tk.slide !== 0 || tk.kick !== 0;
  }
  function land(g, S, tk, y) {
    const drop = y - tk.fallY;
    tk.y = y; tk.air = false; tk.vy = 0;
    if (drop > 8) puff(S, tk.x, y, { n: 8 + Math.min(12, drop / 5), color: S.th.dirt, speed: 2.2, life: 26, size: 4, sq: true, spread: PI, dir: -PI / 2 });
    if (drop > 26 && !tk.dead) {
      const d = damage(g, S, tk, Math.min(30, (drop - 26) / 3), S.shooter);
      if (d > 0) { g.float(tk.x, tk.y - 58, '-' + d, { color: '#ff6b5e', size: 24 }); if (!g.demo) g.float(tk.x, tk.y - 84, g.t('fall'), { color: '#ffd0c8', size: 18 }); }
      if (!g.demo) { g.sfx('place', { p: 0.5 }); g.shake(3); }
    }
  }

  // ================= זרימת התורות =================
  function stepFlow(g, S) {
    if (S.done) return;
    if (S.phase === 'aim') {
      S.aimT++;
      const tk = S.tanks[S.turn];
      if (isCpu(g, S, S.turn)) cpuStep(g, S, tk);
      else if (!g.demo) humanStep(g, S, tk);
    } else if (S.phase === 'fly') {
      S.flyT++;
      if (!S.shells.length) { S.phase = 'settle'; S.settleT = 0; }
    } else if (S.phase === 'settle') {
      S.settleT++;
      const busy = S.dirt || S.moving || S.booms.length;
      if ((!busy && S.settleT > 34) || S.settleT > 420) {
        const dead = S.tanks.filter(t => t.hp <= 0 && !t.dead);
        if (dead.length) { for (const t of dead) killTank(g, S, t); S.phase = 'dying'; S.dieT = 0; }
        else if (S.turns + 1 >= TURN_CAP) { S.phase = 'dying'; S.dieT = 60; S.cap = true; }
        else nextTurn(g, S);
      }
    } else if (S.phase === 'dying') {
      if (++S.dieT >= 110) finish(g, S, !!S.cap);
    }
  }

  // ================= ציור =================
  function drawSky(k, ctx, S, t) {
    const th = S.th, B = S.back;
    let gr = ctx.createLinearGradient(0, 0, 0, FH);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.55, th.sky[1]); gr.addColorStop(1, th.sky[2]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, FH);
    if (th.moon) {
      for (const s of B.stars) { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 0.05 + s.ph); k.circle(ctx, s.x, s.y, s.r); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      const mx = 760, my = 112;
      gr = ctx.createRadialGradient(mx, my, 10, mx, my, 90); gr.addColorStop(0, 'rgba(220,230,255,.35)'); gr.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(mx - 90, my - 90, 180, 180);
      k.circle(ctx, mx, my, 30); ctx.fillStyle = '#eef2ff'; ctx.fill();
      ctx.fillStyle = 'rgba(160,170,210,.45)';
      for (const [dx, dy, r] of [[-9, -6, 6], [8, 9, 4.5], [10, -10, 3.5], [-4, 12, 3]]) { k.circle(ctx, mx + dx, my + dy, r); ctx.fill(); }
    } else {
      const sx = th.id === 'canyon' ? 700 : 780, sy = th.id === 'canyon' ? 210 : 104;
      gr = ctx.createRadialGradient(sx, sy, 8, sx, sy, 120); gr.addColorStop(0, 'rgba(255,250,215,.95)'); gr.addColorStop(0.3, 'rgba(255,238,160,.5)'); gr.addColorStop(1, 'rgba(255,238,160,0)');
      ctx.fillStyle = gr; ctx.fillRect(sx - 120, sy - 120, 240, 240);
      k.circle(ctx, sx, sy, th.id === 'canyon' ? 40 : 30); ctx.fillStyle = th.sun; ctx.fill();
    }
    for (const c of B.clouds) {
      const cw = 110 * c.s;
      ctx.fillStyle = th.moon ? 'rgba(150,165,210,.18)' : th.id === 'canyon' ? 'rgba(255,236,210,.78)' : 'rgba(255,255,255,.88)';
      for (const [dx, dy, r] of [[0, 0, 0.3], [0.24, -0.13, 0.26], [0.46, 0, 0.28], [0.22, 0.07, 0.32]]) { k.circle(ctx, c.x + dx * cw, c.y + dy * cw, r * cw * 0.72); ctx.fill(); }
    }
  }
  function drawFar(k, ctx, S) {
    const th = S.th, B = S.back, base = 380;
    for (const p of B.peaks) {
      const top = base - 40 - p.h;
      ctx.beginPath();
      if (th.far === 'mesas') { ctx.moveTo(p.x - p.w, base); ctx.lineTo(p.x - p.w * 0.6, top + 8); ctx.lineTo(p.x - p.w * 0.52, top); ctx.lineTo(p.x + p.w * 0.52, top); ctx.lineTo(p.x + p.w * 0.6, top + 8); ctx.lineTo(p.x + p.w, base); }
      else { ctx.moveTo(p.x - p.w, base); ctx.quadraticCurveTo(p.x - p.w * 0.35, top + p.h * 0.12, p.x, top); ctx.quadraticCurveTo(p.x + p.w * 0.35, top + p.h * 0.12, p.x + p.w, base); }
      ctx.closePath();
      const gr = ctx.createLinearGradient(p.x - p.w, 0, p.x + p.w, 0);
      gr.addColorStop(0, th.farC); gr.addColorStop(0.5, th.farC); gr.addColorStop(0.5, th.farD); gr.addColorStop(1, th.farD);
      ctx.fillStyle = gr; ctx.fill();
      if (th.far === 'mesas') {
        ctx.save(); ctx.clip();
        ctx.fillStyle = 'rgba(255,220,180,.16)';
        for (let y = top + 14; y < base; y += 22) ctx.fillRect(p.x - p.w, y, p.w * 2, 5);
        ctx.restore();
      } else if (th.cap) {
        const ch = p.h * 0.3, yy = top + ch;
        ctx.beginPath(); ctx.moveTo(p.x, top);
        ctx.lineTo(p.x + p.w * 0.17, yy - 4); ctx.lineTo(p.x + p.w * 0.09, yy - 10); ctx.lineTo(p.x + p.w * 0.02, yy + 2); ctx.lineTo(p.x - p.w * 0.06, yy - 8);
        ctx.lineTo(p.x - p.w * 0.12, yy + 1); ctx.lineTo(p.x - p.w * 0.18, yy - 5); ctx.closePath();
        ctx.fillStyle = th.cap; ctx.fill();
      }
    }
    // שכבת אובך שנותנת עומק
    let gr = ctx.createLinearGradient(0, 230, 0, base);
    gr.addColorStop(0, th.haze + '0)'); gr.addColorStop(1, th.haze + '.55)');
    ctx.fillStyle = gr; ctx.fillRect(0, 230, W, base - 230);
    // גבעות באמצע עם עצים
    ctx.beginPath(); ctx.moveTo(0, FH);
    B.hills.forEach((y, i) => ctx.lineTo(i * 12, y));
    ctx.lineTo(W, FH); ctx.closePath();
    gr = ctx.createLinearGradient(0, 320, 0, 470);
    gr.addColorStop(0, th.mid); gr.addColorStop(1, th.midD);
    ctx.fillStyle = gr; ctx.fill();
    const hy = x => { const i = Math.min(B.hills.length - 2, Math.floor(x / 12)), f = x / 12 - i; return B.hills[i] + (B.hills[i + 1] - B.hills[i]) * f; };
    ctx.fillStyle = th.midD;
    for (const tr of B.trees) {
      const x = tr.x, y = hy(x) + 3, s = tr.s;
      if (th.tree === 'cactus') {
        k.rr(ctx, x - 3 * s, y - 24 * s, 6 * s, 24 * s, 3 * s); ctx.fill();
        k.rr(ctx, x - 10 * s, y - 17 * s, 4 * s, 10 * s, 2 * s); ctx.fill(); k.rr(ctx, x - 10 * s, y - 10 * s, 8 * s, 4 * s, 2 * s); ctx.fill();
        k.rr(ctx, x + 6 * s, y - 20 * s, 4 * s, 9 * s, 2 * s); ctx.fill(); k.rr(ctx, x + 2 * s, y - 13 * s, 8 * s, 4 * s, 2 * s); ctx.fill();
        continue;
      }
      ctx.beginPath();
      for (let j = 0; j < 3; j++) { const ty = y - 8 * s - j * 7 * s, tw = (9 - j * 2.2) * s; ctx.moveTo(x - tw, ty + 6 * s); ctx.lineTo(x, ty - 7 * s); ctx.lineTo(x + tw, ty + 6 * s); }
      ctx.fill();
      ctx.fillRect(x - 1.2 * s, y - 4 * s, 2.4 * s, 5 * s);
      if (th.tree === 'snowpine') {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.moveTo(x - 3.2 * s, y - 25 * s); ctx.lineTo(x, y - 29 * s); ctx.lineTo(x + 3.2 * s, y - 25 * s); ctx.fill();
        ctx.fillStyle = th.midD;
      }
    }
    gr = ctx.createLinearGradient(0, 380, 0, FH);
    gr.addColorStop(0, th.haze + '0)'); gr.addColorStop(1, th.haze + '.25)');
    ctx.fillStyle = gr; ctx.fillRect(0, 380, W, FH - 380);
  }
  function drawGround(k, ctx, S) {
    const T = S.T, th = S.th, D = S.deco;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-2, FH + 2);
    for (let x = 0; x <= W; x += 2) ctx.lineTo(x, T.h[x]);
    ctx.lineTo(W + 2, FH + 2); ctx.closePath();
    const dg = ctx.createLinearGradient(0, 160, 0, FH);
    dg.addColorStop(0, th.dirt[0]); dg.addColorStop(0.55, th.dirt[1]); dg.addColorStop(1, th.dirt[2]);
    ctx.fillStyle = dg; ctx.fill();
    ctx.clip();
    ctx.fillStyle = th.strata;
    for (const b of D.strata) { ctx.beginPath(); ctx.moveTo(0, FH); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, b.y + Math.sin(x * b.f + b.ph) * b.a); ctx.lineTo(W, FH); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = th.peb;
    ctx.beginPath();
    for (const p of D.pebbles) { ctx.moveTo(p.x + p.r, p.y); ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, p.a, 0, 2 * PI); }
    ctx.fill();
    ctx.restore();
    // סלע היסוד
    ctx.beginPath(); ctx.moveTo(0, FH);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, BED + 3 + ((x * 7919) % 5));
    ctx.lineTo(W, FH); ctx.closePath();
    ctx.fillStyle = th.bed; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let x = 12; x < W; x += 48) { ctx.beginPath(); ctx.ellipse(x, BED + 11, 9, 3, 0, 0, 2 * PI); ctx.fill(); }
    // שפה עליונה: עשב / שלג / חול על אדמה שלמה, חרוך במכתשים
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) { if (x === 0) ctx.moveTo(x, T.h[x]); else ctx.lineTo(x, T.h[x]); }
    ctx.strokeStyle = th.scorch; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    let on = false;
    for (let x = 0; x <= W; x += 2) {
      const ok = T.grass[x] && T.cLen[x] <= 0;
      if (ok) { if (!on) { ctx.moveTo(x, T.h[x] + 1); on = true; } else ctx.lineTo(x, T.h[x] + 1); } else on = false;
    }
    ctx.strokeStyle = th.topD; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = th.top; ctx.lineWidth = 5.5; ctx.stroke();
    if (th.blade) {
      ctx.beginPath();
      for (const b of D.blades) {
        if (!T.grass[b.x] || T.cLen[b.x] > 0) continue;
        const y = T.h[b.x] - 1;
        ctx.moveTo(b.x - 1.6, y); ctx.lineTo(b.x + b.l, y - b.h); ctx.lineTo(b.x + 1.6, y);
      }
      ctx.fillStyle = th.blade; ctx.fill();
    }
    // גושי אדמה שנופלים
    if (T.fall > 0) {
      ctx.fillStyle = dg;
      for (let x = 0; x <= W; x++) if (T.cLen[x] > 0) ctx.fillRect(x - 0.6, T.cBot[x] - T.cLen[x], 1.8, T.cLen[x]);
      ctx.fillStyle = th.top;
      for (let x = 0; x <= W; x++) if (T.cLen[x] > 0 && T.grass[x]) ctx.fillRect(x - 0.6, T.cBot[x] - T.cLen[x] - 2, 1.8, 4);
    }
  }
  function drawTank(k, ctx, tk, t, o) {
    const sk = SKIN[tk.i];
    ctx.save();
    ctx.translate(tk.x, tk.y);
    ctx.rotate(tk.ang);
    if (tk.dead) {
      k.rr(ctx, -17, -9, 34, 9, 4.5); ctx.fillStyle = '#1d1f24'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(16, -9); ctx.lineTo(12, -16); ctx.lineTo(-12, -16); ctx.closePath();
      ctx.fillStyle = '#3b3d44'; ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,.7)'; k.circle(ctx, 2, -12, 2.5 + Math.sin(t * 0.3) * 1); ctx.fill();
      ctx.restore();
      return;
    }
    // שרשראות וגלגלים
    k.rr(ctx, -18, -10, 36, 10, 5); ctx.fillStyle = '#262a31'; ctx.fill();
    ctx.save(); k.rr(ctx, -18, -10, 36, 10, 5); ctx.clip();
    ctx.fillStyle = '#3c424c';
    const off = ((tk.roll % 5) + 5) % 5;
    for (let x = -22 + off; x < 20; x += 5) ctx.fillRect(x, -10, 2, 10);
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      k.circle(ctx, -11.2 + i * 7.5, -5, 3.3); ctx.fillStyle = '#6b7482'; ctx.fill();
      k.circle(ctx, -11.2 + i * 7.5, -5, 1.3); ctx.fillStyle = '#2b2f36'; ctx.fill();
    }
    // קנה (זווית אבסולוטית, בלי קשר לשיפוע)
    const ra = tk.aim * D2R, rec = tk.recoil * 5;
    ctx.save();
    ctx.translate(0, -17);
    ctx.rotate(-ra - tk.ang);
    k.rr(ctx, 2 - rec, -2.6, 23, 5.2, 2); ctx.fillStyle = sk.dk; ctx.fill();
    k.rr(ctx, 20 - rec, -3.4, 6, 6.8, 1.5); ctx.fillStyle = '#2b2f36'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(4 - rec, -2, 16, 1.4);
    ctx.restore();
    // גוף
    ctx.beginPath(); ctx.moveTo(-17, -9); ctx.lineTo(17, -9); ctx.lineTo(13, -17); ctx.lineTo(-13, -17); ctx.closePath();
    let gr = ctx.createLinearGradient(0, -17, 0, -9);
    gr.addColorStop(0, sk.lt); gr.addColorStop(0.45, sk.body); gr.addColorStop(1, sk.dk);
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = sk.dk; ctx.stroke();
    // צריח
    ctx.beginPath(); ctx.arc(0, -16.5, 9, PI, 0); ctx.closePath();
    gr = ctx.createRadialGradient(-3, -21, 1, 0, -17, 10);
    gr.addColorStop(0, sk.lt); gr.addColorStop(1, sk.body);
    ctx.fillStyle = gr; ctx.fill(); ctx.stroke();
    ctx.fillStyle = sk.dk; k.rr(ctx, -4, -26.5, 8, 2.6, 1.3); ctx.fill();
    // אנטנה עם דגל שמתנופף ברוח
    const wv = o.wind || 0, fl = Math.sin(t * 0.25 + tk.i) * 1.5;
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(-10, -38); ctx.stroke();
    const fw = (Math.abs(wv) < 0.5 ? 0.35 : Math.sign(wv) * (0.55 + Math.min(1, Math.abs(wv) / 8) * 0.45)) * 13;
    ctx.beginPath(); ctx.moveTo(-10, -38); ctx.quadraticCurveTo(-10 + fw * 0.5, -37 + fl, -10 + fw, -34.5 + fl * 0.6); ctx.lineTo(-10, -31.5); ctx.closePath();
    ctx.fillStyle = sk.body; ctx.fill();
    if (tk.flash > 0) {
      ctx.globalAlpha = tk.flash / 12 * 0.75; ctx.fillStyle = '#fff';
      k.rr(ctx, -18, -27, 36, 27, 6); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawHpBar(k, ctx, tk, active, t) {
    const x = tk.x - 21, y = tk.y - 50, w = 42;
    k.rr(ctx, x - 1.5, y - 1.5, w + 3, 9, 4.5); ctx.fillStyle = 'rgba(10,14,22,.72)'; ctx.fill();
    const f = tk.hp / HP0, s = tk.shown / HP0;
    if (s > f) { k.rr(ctx, x, y, w * s, 6, 3); ctx.fillStyle = '#fff1d6'; ctx.fill(); }
    if (f > 0) { k.rr(ctx, x, y, Math.max(6, w * f), 6, 3); ctx.fillStyle = f > 0.6 ? '#5ad35a' : f > 0.3 ? '#ffd23f' : '#ff5a4e'; ctx.fill(); }
    if (active) {
      const by = y - 16 + Math.sin(t * 0.12) * 3;
      ctx.beginPath(); ctx.moveTo(tk.x - 8, by - 6); ctx.lineTo(tk.x + 8, by - 6); ctx.lineTo(tk.x, by + 3); ctx.closePath();
      ctx.fillStyle = SKIN[tk.i].lt; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(10,14,22,.6)'; ctx.stroke();
    }
  }
  function drawShellAt(k, ctx, x, y, vx, vy, wi, t) {
    const w = WPN[wi], r = w.sz;
    if (w.id === 'bounce') {
      k.circle(ctx, x, y, r); ctx.fillStyle = w.col; ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3);
      ctx.strokeStyle = '#eaffef'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.62, PI - 0.8, PI + 0.8); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx));
    ctx.beginPath(); ctx.moveTo(r * 1.7, 0); ctx.quadraticCurveTo(r * 1.1, -r, -r * 0.9, -r * 0.8); ctx.lineTo(-r * 1.1, 0); ctx.lineTo(-r * 0.9, r * 0.8); ctx.quadraticCurveTo(r * 1.1, r, r * 1.7, 0); ctx.closePath();
    ctx.fillStyle = w.col; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-r * 0.6, -r * 0.55, r * 1.4, r * 0.3);
    ctx.restore();
  }
  function drawWeaponIcon(k, ctx, wi, x, y, s) {
    const w = WPN[wi];
    if (w.id === 'triple') { for (const [dx, dy] of [[-9, 4], [0, -4], [9, 4]]) drawShellAt(k, ctx, x + dx * s, y + dy * s, 1, -0.3, 2, 0); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (w.id === 'big' ? 1.25 : 1.6), s * (w.id === 'big' ? 1.25 : 1.6));
    drawShellAt(k, ctx, 0, 0, 1, -0.4, wi, 0);
    ctx.restore();
  }
  function drawBooms(k, ctx, S) {
    for (const b of S.booms) {
      if (b.t < 0) continue;
      const u = b.t / b.life, e = GK.U.ease.out(Math.min(1, u * 1.7));
      const rr = b.r * (0.35 + 0.8 * e);
      ctx.globalAlpha = Math.max(0, 1 - u);
      const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
      gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.28, '#ffd75e'); gr.addColorStop(0.62, 'rgba(255,120,40,.85)'); gr.addColorStop(1, 'rgba(170,40,10,0)');
      ctx.fillStyle = gr; k.circle(ctx, b.x, b.y, rr); ctx.fill();
      ctx.globalAlpha = Math.max(0, 0.7 * (1 - u));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * (1 - u) + 0.5;
      k.circle(ctx, b.x, b.y, b.r * (0.55 + 1.15 * GK.U.ease.out(u))); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawSmoke(k, ctx, S) {
    for (const s of S.smoke) {
      const a = Math.min(1, s.life / 30) * Math.min(1, (s.max - s.life + 4) / 10) * 0.5;
      ctx.globalAlpha = a; ctx.fillStyle = 'rgb(' + (s.c | 0) + ',' + (s.c | 0) + ',' + ((s.c + 8) | 0) + ')';
      k.circle(ctx, s.x, s.y, s.r); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawParts(ctx, S) {
    for (const p of S.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.4)); ctx.fillStyle = p.col;
      if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 2 * PI); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawGuide(k, ctx, S, tk) {
    const sh = newShell(tk, tk.aim, tk.pow, tk.w);
    const n = 9 + Math.round(tk.pow / 12);
    for (let i = 1; i <= n; i++) {
      const tt = i * 0.055, x = sh.x + sh.vx * tt, y = sh.y + sh.vy * tt + 0.5 * GRAV * tt * tt;
      if (x < 0 || x > W || y > surf(S.T, x)) break;
      ctx.globalAlpha = 0.95 - i / n * 0.75;
      k.circle(ctx, x, y, 3.6 - i / n * 1.8); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,30,50,.4)'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawTrace(k, ctx, S, i) {
    const tr = S.trace[i];
    if (tr.length < 4) return;
    ctx.save();
    ctx.setLineDash([5, 7]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
    for (let j = 2; j < tr.length; j += 2) ctx.lineTo(tr[j], tr[j + 1]);
    ctx.stroke();
    ctx.restore();
    const L = S.land[i];
    if (L) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L.x - 6, L.y - 6); ctx.lineTo(L.x + 6, L.y + 6); ctx.moveTo(L.x + 6, L.y - 6); ctx.lineTo(L.x - 6, L.y + 6); ctx.stroke();
    }
  }
  function drawDebris(k, ctx, S) {
    for (const d of S.debris) {
      const sk = SKIN[d.i];
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      k.rr(ctx, 2, -2.4, 20, 4.8, 2); ctx.fillStyle = '#3b3d44'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 2, 9, PI, 0); ctx.closePath(); ctx.fillStyle = d.rest ? '#4a4c55' : sk.dk; ctx.fill();
      ctx.restore();
    }
  }
  function panelBox(k, ctx, x, y, w, h, glow) {
    k.rr(ctx, x, y, w, h, 12);
    ctx.fillStyle = 'rgba(8,12,22,.5)'; ctx.fill();
    ctx.lineWidth = glow ? 2.5 : 1; ctx.strokeStyle = glow || 'rgba(255,255,255,.18)'; ctx.stroke();
  }
  function drawTop(g, ctx, S) {
    const t = S.clock;
    for (const tk of S.tanks) {
      const left = tk.i === 0, w = 268, x = left ? 10 : W - 10 - w, y = 8, act = S.turn === tk.i && !S.done;
      const sk = SKIN[tk.i];
      ctx.save();
      if (act) { ctx.shadowColor = sk.body; ctx.shadowBlur = 12 + Math.sin(t * 0.1) * 5; }
      panelBox(g, ctx, x, y, w, 46, act ? sk.lt : null);
      ctx.restore();
      // טנק קטן
      const ix = left ? x + 30 : x + w - 30;
      ctx.save(); ctx.translate(ix, y + 36); ctx.scale(left ? 0.9 : -0.9, 0.9);
      drawTank(g, ctx, { i: tk.i, x: 0, y: 0, ang: 0, aim: 35, recoil: 0, roll: 0, flash: 0, dead: tk.dead }, t, { wind: 0 });
      ctx.restore();
      const tx = left ? x + 58 : x + w - 58;
      g.text(ctx, nameOf(g, tk.i), tx, y + 14, { size: 15, weight: 800, align: left ? 'left' : 'right', color: '#fff', maxW: 120 });
      g.text(ctx, String(Math.max(0, Math.ceil(tk.shown))), left ? x + w - 12 : x + 12, y + 14, { size: 15, weight: 900, align: left ? 'right' : 'left', color: sk.lt });
      const bx = left ? x + 58 : x + 12, bw = w - 70, by = y + 27;
      g.rr(ctx, bx, by, bw, 11, 5.5); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
      const f = tk.hp / HP0, s = tk.shown / HP0;
      const X = v => (left ? bx : bx + bw - bw * v);
      if (s > f) { g.rr(ctx, X(s), by, bw * s, 11, 5.5); ctx.fillStyle = '#fff1d6'; ctx.fill(); }
      if (f > 0) {
        const gr = ctx.createLinearGradient(0, by, 0, by + 11);
        const c = f > 0.6 ? ['#8df07a', '#3fae3f'] : f > 0.3 ? ['#ffe27a', '#e0a91a'] : ['#ff9a8a', '#d8352a'];
        gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
        g.rr(ctx, X(f), by, Math.max(8, bw * f), 11, 5.5); ctx.fillStyle = gr; ctx.fill();
      }
    }
    // הרוח
    const cx = W / 2, wx = cx - 92, ww = 184;
    panelBox(g, ctx, wx, 8, ww, 46, null);
    g.text(ctx, g.t('wind'), cx, 20, { size: 13, weight: 700, color: 'rgba(255,255,255,.75)' });
    const wv = S.wind;
    if (wv === 0) g.text(ctx, g.t('calm'), cx, 40, { size: 15, weight: 800, color: '#cfe8ff', maxW: ww - 20 });
    else {
      const dir = Math.sign(wv), len = 14 + Math.abs(S.windShown) * 6.2, ay = 40;
      // פסים קטנים שזזים עם הרוח — מעל ומתחת לחץ, ונגמרים לפני המספר
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = ((t * (0.6 + Math.abs(wv) * 0.15) + i * 30) % 90) / 90;
        const sx = cx - dir * 80 + dir * ph * 100, sy = i === 1 ? 49 : 31;
        ctx.globalAlpha = Math.sin(ph * PI) * 0.8;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dir * 10, sy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const x0 = cx - dir * len / 2 - dir * 16, x1 = cx + dir * len / 2 - dir * 16;
      const gr = ctx.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(160,215,255,.35)'); gr.addColorStop(1, Math.abs(wv) > 6 ? '#ff9a6a' : '#9fd8ff');
      ctx.strokeStyle = gr; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
      ctx.fillStyle = Math.abs(wv) > 6 ? '#ff9a6a' : '#9fd8ff';
      ctx.beginPath(); ctx.moveTo(x1 + dir * 9, ay); ctx.lineTo(x1 - dir * 3, ay - 7); ctx.lineTo(x1 - dir * 3, ay + 7); ctx.closePath(); ctx.fill();
      g.text(ctx, String(Math.abs(wv)), cx + dir * 58, ay, { size: 18, weight: 900, color: '#fff' });
    }
  }
  function btnBox(g, ctx, r, on, hover, col) {
    g.rr(ctx, r.x, r.y, r.w, r.h, 10);
    const gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    if (col) { gr.addColorStop(0, GK.U.shade(col, 0.25)); gr.addColorStop(1, GK.U.shade(col, -0.2)); }
    else { gr.addColorStop(0, hover ? '#4a5a72' : '#3a4659'); gr.addColorStop(1, hover ? '#2c3646' : '#232b38'); }
    ctx.globalAlpha = on ? 1 : 0.4;
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
  }
  function tri(ctx, x, y, s, dir, vert) {
    ctx.beginPath();
    if (vert) { ctx.moveTo(x - s, y + dir * s * 0.55); ctx.lineTo(x + s, y + dir * s * 0.55); ctx.lineTo(x, y - dir * s * 0.75); }
    else { ctx.moveTo(x + dir * s * 0.75, y); ctx.lineTo(x - dir * s * 0.55, y - s); ctx.lineTo(x - dir * s * 0.55, y + s); }
    ctx.closePath(); ctx.fill();
  }
  function drawDash(g, ctx, S) {
    const tk = S.tanks[S.turn], human = !isCpu(g, S, S.turn) && !S.done, live = human && S.phase === 'aim';
    let gr = ctx.createLinearGradient(0, FH, 0, H);
    gr.addColorStop(0, '#273141'); gr.addColorStop(1, '#131922');
    ctx.fillStyle = gr; ctx.fillRect(0, FH, W, H - FH);
    ctx.fillStyle = SKIN[S.turn].body; ctx.globalAlpha = 0.85; ctx.fillRect(0, FH, W, 3); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (const x of [198, 412, 768]) ctx.fillRect(x, FH + 10, 1.5, 40);
    const hv = S.hover;
    // זווית
    for (const id of ['aL', 'aR', 'pD', 'pU']) {
      const r = DB[id];
      btnBox(g, ctx, r, live, hv === id || (S.hold && S.hold.id === id));
      ctx.globalAlpha = live ? 1 : 0.4;
      ctx.fillStyle = '#e8eef8';
      if (id === 'aL' || id === 'aR') tri(ctx, r.x + r.w / 2, r.y + r.h / 2, 8, id === 'aL' ? -1 : 1, false);
      else { ctx.fillRect(r.x + 12, r.y + r.h / 2 - 2.2, 16, 4.4); if (id === 'pU') ctx.fillRect(r.x + r.w / 2 - 2.2, r.y + 13, 4.4, 16); }
      ctx.globalAlpha = 1;
    }
    const el = tk.aim <= 90 ? tk.aim : 180 - tk.aim, adir = tk.aim < 90 ? 1 : tk.aim > 90 ? -1 : 0;
    g.text(ctx, g.t('angle'), 100, FH + 14, { size: 12, weight: 700, color: 'rgba(255,255,255,.65)', maxW: 92 });
    g.text(ctx, el + '°', 100 - (adir ? 9 : 0) * 0, FH + 38, { size: 24, weight: 900, color: '#fff' });
    if (adir) { ctx.fillStyle = SKIN[S.turn].lt; tri(ctx, 100 + adir * 36, FH + 38, 5.5, adir, false); }
    g.text(ctx, g.t('power'), 304, FH + 14, { size: 12, weight: 700, color: 'rgba(255,255,255,.65)', maxW: 112 });
    g.text(ctx, String(tk.pow), 304, FH + 34, { size: 22, weight: 900, color: '#fff' });
    g.rr(ctx, 254, FH + 47, 100, 6, 3); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    gr = ctx.createLinearGradient(254, 0, 354, 0); gr.addColorStop(0, '#7be07b'); gr.addColorStop(0.6, '#ffd166'); gr.addColorStop(1, '#ff6b4a');
    g.rr(ctx, 254, FH + 47, Math.max(6, tk.pow), 6, 3); ctx.fillStyle = gr; ctx.fill();
    // נשקים
    for (let i = 0; i < 4; i++) {
      const r = DB.wp[i], sel = tk.w === i, empty = tk.ammo[i] === 0;
      g.rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.globalAlpha = empty ? 0.35 : 1;
      gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      if (sel) { gr.addColorStop(0, GK.U.shade(SKIN[S.turn].body, 0.15)); gr.addColorStop(1, SKIN[S.turn].dk); }
      else { gr.addColorStop(0, hv === 'w' + i ? '#465570' : '#344055'); gr.addColorStop(1, '#212937'); }
      ctx.fillStyle = gr; ctx.fill();
      ctx.lineWidth = sel ? 2.5 : 1.2; ctx.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,.18)'; ctx.stroke();
      if (sel && S.wpFlash > 0) { ctx.globalAlpha = S.wpFlash / 20 * 0.5; ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = empty ? 0.35 : 1; }
      drawWeaponIcon(g, ctx, i, r.x + r.w / 2, r.y + 17, 1);
      g.text(ctx, g.t('w' + i), r.x + r.w / 2, r.y + 38, { size: 12, weight: 800, color: '#fff', maxW: r.w - 8 });
      const am = tk.ammo[i];
      g.rr(ctx, r.x + r.w - 23, r.y + 3, 20, 15, 7.5); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
      g.text(ctx, am < 0 ? '∞' : String(am), r.x + r.w - 13, r.y + 11, { size: am < 0 ? 13 : 11, weight: 900, color: am === 0 ? '#ff8a7a' : '#ffe066' });
      g.text(ctx, String(i + 1), r.x + 9, r.y + 10, { size: 10, weight: 700, color: 'rgba(255,255,255,.45)' });
      ctx.globalAlpha = 1;
    }
    // כפתור האש
    const F = DB.fire;
    ctx.save();
    if (live) { ctx.shadowColor = '#ff6a3a'; ctx.shadowBlur = 10 + Math.sin(S.clock * 0.15) * 6; }
    btnBox(g, ctx, F, true, hv === 'fire', live ? (hv === 'fire' ? '#ff7a45' : '#f0552e') : '#4a5260');
    ctx.restore();
    if (live) {
      g.text(ctx, g.t('fire'), F.x + F.w / 2 + 12, F.y + F.h / 2 + 1, { size: 22, weight: 900, color: '#fff', stroke: 'rgba(120,20,0,.45)', strokeW: 4, maxW: F.w - 44 });
      // להבה קטנה
      const fx = F.x + 26, fy = F.y + F.h / 2 + 2, fl = Math.sin(S.clock * 0.3) * 1.5;
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath(); ctx.moveTo(fx, fy + 9); ctx.quadraticCurveTo(fx - 9, fy + 2, fx - 2, fy - 11 - fl); ctx.quadraticCurveTo(fx + 1, fy - 3, fx + 5, fy - 6); ctx.quadraticCurveTo(fx + 9, fy + 2, fx, fy + 9); ctx.fill();
      ctx.fillStyle = '#fff6d0'; k2circle(g, ctx, fx, fy + 3, 3);
    } else {
      const who = S.done ? '' : isCpu(g, S, S.turn) ? g.t('aiming') : '';
      const dots = '.'.repeat(1 + ((S.clock / 15) | 0) % 3);
      g.text(ctx, who ? who.replace(/\.+$/, '') + dots : '…', F.x + F.w / 2, F.y + F.h / 2 + 1, { size: 17, weight: 800, color: 'rgba(255,255,255,.7)', maxW: F.w - 16 });
    }
  }
  function k2circle(g, ctx, x, y, r) { g.circle(ctx, x, y, r); ctx.fill(); }
  function drawScene(g, ctx, S, alpha) {
    const t = S.clock, th = S.th;
    drawSky(g, ctx, S, t);
    drawFar(g, ctx, S);
    drawGround(g, ctx, S);
    const act = S.tanks[S.turn];
    const aiming = S.phase === 'aim' && !S.done;
    if (aiming && !isCpu(g, S, S.turn)) drawTrace(g, ctx, S, S.turn);
    for (const tk of S.tanks) drawTank(g, ctx, tk, t, { wind: S.windShown });
    drawDebris(g, ctx, S);
    drawSmoke(g, ctx, S);
    if (aiming && (S.aimT > 26 || !isCpu(g, S, S.turn))) drawGuide(g, ctx, S, act);
    if (S.drag && aiming) {
      const pv = pivot(act);
      ctx.save(); ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(S.drag.x, S.drag.y); ctx.stroke(); ctx.restore();
      g.circle(ctx, S.drag.x, S.drag.y, 9); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    // פגזים ושובלים
    for (const sh of S.shells) {
      const w = WPN[sh.wi], tr = sh.trail;
      for (let j = 0; j < tr.length; j += 2) {
        const f = (j + 2) / tr.length;
        ctx.globalAlpha = f * 0.55; ctx.fillStyle = w.lt;
        g.circle(ctx, tr[j], tr[j + 1], 1.2 + f * w.sz * 0.7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const x = sh.x + sh.vx * DT * (alpha || 0), y = sh.y + sh.vy * DT * (alpha || 0);
      drawShellAt(g, ctx, x, y, sh.vx, sh.vy, sh.wi, t);
      if (y < 2) {   // מעל המסך: חץ קטן שמראה איפה הפגז
        const ix = clamp(x, 14, W - 14);
        ctx.fillStyle = w.lt; ctx.strokeStyle = 'rgba(10,14,22,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ix, 60); ctx.lineTo(ix - 7, 72); ctx.lineTo(ix + 7, 72); ctx.closePath(); ctx.stroke(); ctx.fill();
      }
    }
    drawBooms(g, ctx, S);
    drawParts(ctx, S);
    for (const tk of S.tanks) if (!tk.dead) drawHpBar(g, ctx, tk, aiming && tk === act && !g.demo, t);
    if (th.snowfall) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      for (const f of S.back.flakes) { ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, 2 * PI); }
      ctx.fill();
    }
    // זווית וכוח ליד הטנק כשמכוונים
    if (aiming && S.showAim > 0 && !isCpu(g, S, S.turn)) {
      const el = act.aim <= 90 ? act.aim : 180 - act.aim;
      ctx.globalAlpha = Math.min(1, S.showAim / 20);
      g.text(ctx, el + '° · ' + act.pow, act.x, act.y - 84, { size: 16, weight: 900, color: '#fff', stroke: 'rgba(10,14,22,.7)', strokeW: 4 });
      ctx.globalAlpha = 1;
    }
    if (!g.demo) { drawTop(g, ctx, S); drawDash(g, ctx, S); }
    else drawDashIdle(g, ctx);
  }
  function drawDashIdle(g, ctx) {
    const gr = ctx.createLinearGradient(0, FH, 0, H);
    gr.addColorStop(0, '#273141'); gr.addColorStop(1, '#131922');
    ctx.fillStyle = gr; ctx.fillRect(0, FH, W, H - FH);
  }

  // ================= טקסטים =================
  const TXT = {
    he: { title: 'טנקים בהרים', help: ['לחץ וגרור בשדה כדי לכוון — הכיוון קובע את הזווית, המרחק את הכוח', 'מקלדת: ← → זווית, ↑ ↓ כוח, Q / E נשק, רווח — אש!', 'ארבעה נשקים: פגז, פגז ענק, משולש, וקופץ שמקפץ על האדמה', 'שים לב לרוח! האדמה מתפוצצת, וטנק בלי קרקע מחליק ונופל', 'הורד לטנק השני את כל החיים כדי לנצח. ב-2 שחקנים משחקים בתורות'], helpTouch: ['גע וגרור בשדה כדי לכוון, או השתמש ב-◀ ▶ (זווית) וב-▲ ▼ (כוח)', '🔥 — אש! 🔄 — החלף נשק', 'שים לב לרוח! הורד לטנק השני את כל החיים כדי לנצח'],
      angle: 'זווית', power: 'כוח', wind: 'רוח', calm: 'אין רוח', fire: 'אש!', w0: 'פגז', w1: 'פגז ענק', w2: 'משולש', w3: 'קופץ', you: 'אתה', yourTurn: 'התור שלך!', direct: 'פגיעה ישירה!', selfHit: 'אאוץ׳! פגעת בעצמך', fall: 'נפילה!', aiming: 'מכוון...', tally: 'ניצחונות: שחקן 1 — {a} · שחקן 2 — {b}', winsOn: 'ניצחונות ברמה {d}: {n}', timeUp: 'נגמרו התורות! מי שנשארו לו יותר חיים מנצח' },
    en: { title: 'Mountain Tanks', help: ['Click and drag on the field to aim — direction sets the angle, distance the power', 'Keyboard: ← → angle, ↑ ↓ power, Q / E weapon, Space — fire!', 'Four weapons: shell, big shell, triple, and a bouncer that hops along the ground', 'Watch the wind! The ground blows apart, and a tank with no ground under it slides and falls', "Bring the other tank's health to zero to win. 2 players take turns"], helpTouch: ['Touch and drag on the field to aim, or use ◀ ▶ (angle) and ▲ ▼ (power)', '🔥 — fire! 🔄 — change weapon', "Watch the wind! Bring the other tank's health to zero to win"],
      angle: 'Angle', power: 'Power', wind: 'Wind', calm: 'Calm', fire: 'FIRE!', w0: 'Shell', w1: 'Big shell', w2: 'Triple', w3: 'Bouncer', you: 'You', yourTurn: 'Your turn!', direct: 'Direct hit!', selfHit: 'Ouch! You hit yourself', fall: 'Fall!', aiming: 'Aiming...', tally: 'Wins: player 1 — {a} · player 2 — {b}', winsOn: 'Wins on {d}: {n}', timeUp: 'Out of turns! More health left wins' },
    ar: { title: 'دبابات في الجبال', help: ['اضغط واسحب في الساحة للتصويب — الاتجاه يحدد الزاوية والمسافة تحدد القوة', 'لوحة المفاتيح: ← → الزاوية، ↑ ↓ القوة، Q / E السلاح، المسافة — أطلق!', 'أربعة أسلحة: قذيفة، قذيفة كبيرة، ثلاثية، وقافزة تقفز على الأرض', 'انتبه للرياح! الأرض تتفجر، والدبابة التي تفقد الأرض تحتها تنزلق وتسقط', 'أنزِل صحة الدبابة الأخرى إلى الصفر لتفوز. لاعبان يلعبان بالتناوب'], helpTouch: ['المس واسحب في الساحة للتصويب، أو استخدم ◀ ▶ (الزاوية) و ▲ ▼ (القوة)', '🔥 — أطلق! 🔄 — غيّر السلاح', 'انتبه للرياح! أنزِل صحة الدبابة الأخرى إلى الصفر لتفوز'],
      angle: 'الزاوية', power: 'القوة', wind: 'الرياح', calm: 'لا رياح', fire: 'أطلق!', w0: 'قذيفة', w1: 'قذيفة كبيرة', w2: 'ثلاثية', w3: 'قافزة', you: 'أنت', yourTurn: 'دورك!', direct: 'إصابة مباشرة!', selfHit: 'آخ! أصبت نفسك', fall: 'سقوط!', aiming: 'يصوّب...', tally: 'الانتصارات: اللاعب 1 — {a} · اللاعب 2 — {b}', winsOn: 'الانتصارات في مستوى {d}: {n}', timeUp: 'انتهت الأدوار! من بقيت له صحة أكثر يفوز' },
    es: { title: 'Tanques en la Montaña', help: ['Haz clic y arrastra en el campo para apuntar: la dirección da el ángulo y la distancia la fuerza', 'Teclado: ← → ángulo, ↑ ↓ fuerza, Q / E arma, Espacio — ¡fuego!', 'Cuatro armas: proyectil, proyectil grande, triple y un saltarín que rebota en el suelo', '¡Ojo con el viento! El suelo vuela en pedazos y un tanque sin suelo se desliza y cae', 'Deja sin vida al otro tanque para ganar. A 2 jugadores, por turnos'], helpTouch: ['Toca y arrastra en el campo para apuntar, o usa ◀ ▶ (ángulo) y ▲ ▼ (fuerza)', '🔥 — ¡fuego! 🔄 — cambiar de arma', '¡Ojo con el viento! Deja sin vida al otro tanque para ganar'],
      angle: 'Ángulo', power: 'Fuerza', wind: 'Viento', calm: 'Sin viento', fire: '¡FUEGO!', w0: 'Proyectil', w1: 'Grande', w2: 'Triple', w3: 'Saltarín', you: 'Tú', yourTurn: '¡Tu turno!', direct: '¡Impacto directo!', selfHit: '¡Ay! Te diste a ti mismo', fall: '¡Caída!', aiming: 'Apuntando...', tally: 'Victorias: jugador 1 — {a} · jugador 2 — {b}', winsOn: 'Victorias en {d}: {n}', timeUp: '¡Se acabaron los turnos! Gana quien tenga más vida' },
    fr: { title: 'Tanks des Montagnes', help: ["Clique et glisse sur le terrain pour viser : la direction donne l'angle, la distance la puissance", 'Clavier : ← → angle, ↑ ↓ puissance, Q / E arme, Espace — feu !', 'Quatre armes : obus, gros obus, triple, et un rebondisseur qui saute sur le sol', 'Attention au vent ! Le sol explose, et un tank sans sol sous lui glisse et tombe', "Fais tomber la vie de l'autre tank à zéro pour gagner. À 2, chacun son tour"], helpTouch: ['Touche et glisse sur le terrain pour viser, ou utilise ◀ ▶ (angle) et ▲ ▼ (puissance)', "🔥 — feu ! 🔄 — changer d'arme", "Attention au vent ! Fais tomber la vie de l'autre tank à zéro pour gagner"],
      angle: 'Angle', power: 'Puissance', wind: 'Vent', calm: 'Pas de vent', fire: 'FEU !', w0: 'Obus', w1: 'Gros obus', w2: 'Triple', w3: 'Rebond', you: 'Toi', yourTurn: 'À toi !', direct: 'En plein dans le mille !', selfHit: "Aïe ! Tu t'es touché", fall: 'Chute !', aiming: 'Il vise...', tally: 'Victoires : joueur 1 — {a} · joueur 2 — {b}', winsOn: 'Victoires en {d} : {n}', timeUp: 'Plus de tours ! Le plus de vie gagne' },
    pt: { title: 'Tanques na Montanha', help: ['Clique e arraste no campo para mirar: a direção define o ângulo e a distância a força', 'Teclado: ← → ângulo, ↑ ↓ força, Q / E arma, Espaço — fogo!', 'Quatro armas: projétil, projétil grande, triplo e um saltador que quica no chão', 'Cuidado com o vento! O chão explode, e um tanque sem chão escorrega e cai', 'Zere a vida do outro tanque para vencer. Com 2 jogadores, cada um na sua vez'], helpTouch: ['Toque e arraste no campo para mirar, ou use ◀ ▶ (ângulo) e ▲ ▼ (força)', '🔥 — fogo! 🔄 — trocar de arma', 'Cuidado com o vento! Zere a vida do outro tanque para vencer'],
      angle: 'Ângulo', power: 'Força', wind: 'Vento', calm: 'Sem vento', fire: 'FOGO!', w0: 'Projétil', w1: 'Grande', w2: 'Triplo', w3: 'Saltador', you: 'Você', yourTurn: 'Sua vez!', direct: 'Acerto direto!', selfHit: 'Ai! Você se acertou', fall: 'Queda!', aiming: 'Mirando...', tally: 'Vitórias: jogador 1 — {a} · jogador 2 — {b}', winsOn: 'Vitórias no {d}: {n}', timeUp: 'Acabaram os turnos! Vence quem tem mais vida' },
    ru: { title: 'Танки в горах', help: ['Нажми и тяни по полю, чтобы прицелиться: направление — угол, расстояние — сила', 'Клавиатура: ← → угол, ↑ ↓ сила, Q / E оружие, Пробел — огонь!', 'Четыре вида оружия: снаряд, большой снаряд, тройной и прыгун, который скачет по земле', 'Следи за ветром! Земля разлетается, а танк без опоры скользит и падает', 'Сбей всё здоровье другого танка, чтобы победить. Вдвоём — ходите по очереди'], helpTouch: ['Коснись и тяни по полю, чтобы прицелиться, или жми ◀ ▶ (угол) и ▲ ▼ (сила)', '🔥 — огонь! 🔄 — сменить оружие', 'Следи за ветром! Сбей всё здоровье другого танка, чтобы победить'],
      angle: 'Угол', power: 'Сила', wind: 'Ветер', calm: 'Штиль', fire: 'ОГОНЬ!', w0: 'Снаряд', w1: 'Большой', w2: 'Тройной', w3: 'Прыгун', you: 'Ты', yourTurn: 'Твой ход!', direct: 'Прямое попадание!', selfHit: 'Ой! Попал в себя', fall: 'Падение!', aiming: 'Целится...', tally: 'Победы: игрок 1 — {a} · игрок 2 — {b}', winsOn: 'Победы, уровень «{d}»: {n}', timeUp: 'Ходы кончились! Побеждает тот, у кого больше здоровья' },
    de: { title: 'Panzer in den Bergen', help: ['Klicke und ziehe auf dem Feld zum Zielen – die Richtung gibt den Winkel, der Abstand die Kraft', 'Tastatur: ← → Winkel, ↑ ↓ Kraft, Q / E Waffe, Leertaste — Feuer!', 'Vier Waffen: Granate, große Granate, Dreifach und ein Hüpfer, der über den Boden springt', 'Achte auf den Wind! Der Boden fliegt weg, und ein Panzer ohne Boden rutscht und fällt', 'Bring die Energie des anderen Panzers auf null. Zu zweit wird abwechselnd gespielt'], helpTouch: ['Tippe und ziehe auf dem Feld zum Zielen, oder nutze ◀ ▶ (Winkel) und ▲ ▼ (Kraft)', '🔥 — Feuer! 🔄 — Waffe wechseln', 'Achte auf den Wind! Bring die Energie des anderen Panzers auf null'],
      angle: 'Winkel', power: 'Kraft', wind: 'Wind', calm: 'Windstill', fire: 'FEUER!', w0: 'Granate', w1: 'Groß', w2: 'Dreifach', w3: 'Hüpfer', you: 'Du', yourTurn: 'Du bist dran!', direct: 'Volltreffer!', selfHit: 'Autsch! Selbst getroffen', fall: 'Absturz!', aiming: 'Zielt...', tally: 'Siege: Spieler 1 — {a} · Spieler 2 — {b}', winsOn: 'Siege auf {d}: {n}', timeUp: 'Keine Züge mehr! Mehr Energie gewinnt' },
  };

  function setHud(g, S) {
    if (g.mode === '2p') g.hud([[g.t('p1'), '🏆 ' + S.wins[0], SKIN[0].lt], [g.t('p2'), '🏆 ' + S.wins[1], SKIN[1].lt]]);
    else { const b = g.getBest(); g.hud([[g.t('score'), g.score], [g.t('best'), b === null ? '—' : Math.max(b, g.score)]]); }
  }

  GK.register('tanks', {
    w: W, h: H, bg: '#16243a', accent: '#ffb347',
    modes: ['cpu', '2p'],
    diffs: true, diffModes: ['cpu'], diffDefault: 0,
    touch: [['ArrowLeft', '◀'], ['ArrowRight', '▶'], ['ArrowDown', '▼'], ['ArrowUp', '▲'], null, ['KeyE', '🔄'], ['Space', '🔥']],
    text: TXT,
    // לבדיקות (Node): הפיזיקה, הפותר והמחשב — אותן פונקציות שהמשחק משתמש בהן
    test: { WPN, AI, THEMES, genWorld, surf, carve, support, newShell, moveShell, simShot, solve, cpuPlan, fire, newState, stepWorld, stepFlow, adjust, aimAt, pickWeapon, isCpu, PMIN, TURN_CAP, W, H, FH, BED },

    setup(g) {
      g.s = { wins: [0, 0], matches: 0 };
      // שישה כפתורי מגע בגודל הרגיל (66px) יוצאים מרוחב של טלפון — מקטין אותם כך שייכנסו גם במסך של 320px (רק במשחק הזה)
      for (const b of g.root.querySelectorAll('.g2d-tb')) Object.assign(b.style, { width: 'min(50px, calc((100vw - 64px) / 6.4))', height: '56px', fontSize: '22px', borderRadius: '14px' });
      for (const d of g.root.querySelectorAll('.g2d-tgrp')) d.style.gap = '7px';
    },

    init(g) {
      const keep = { wins: g.s && g.s.wins ? g.s.wins : [0, 0], matches: g.s && g.s.matches != null ? g.s.matches : 0 };
      if (!g.demo) keep.matches++;
      const S = g.s = newState(g, keep);
      if (g.mode === '2p' && !g.demo && keep.matches % 2 === 0) { S.turn = 1; }
      if (g.demo) { S.aimT = -60; }
      else g.msg(g.mode === '2p' ? g.t('turnOf', { name: nameOf(g, S.turn) }) : g.t('yourTurn'), 1100, SKIN[S.turn].lt);
    },

    step(g) {
      const S = g.s;
      stepWorld(g, S);
      stepFlow(g, S);
      setHud(g, S);
    },

    idle(g) {
      const S = g.s;
      if (!S || !S.T) return;
      stepWorld(g, S);
      if (g.state === 'menu') {
        stepFlow(g, S);
        if (S.restart) { const keep = { wins: S.wins, matches: S.matches }; g.s = newState(g, keep); g.s.aimT = -60; }
      }
    },

    // בוט לבדיקות (GK.bot): משחק את הצד האנושי דרך אותם כיוון וירייה, עם טעות קטנה
    bot(g) {
      const S = g.s;
      if (!S || S.phase !== 'aim' || S.done || isCpu(g, S, S.turn) || S.aimT < 24) return;
      const tk = S.tanks[S.turn], foe = S.tanks[1 - S.turn];
      const avail = [1, 2, 3].filter(i => tk.ammo[i] !== 0);
      tk.w = avail.length && Math.random() < 0.35 ? avail[Math.floor(Math.random() * avail.length)] : 0;
      const sol = solve(S, tk, foe, tk.w);
      tk.aim = sol.a;
      tk.pow = clamp(Math.round(sol.p + gauss() * 2.2), PMIN, 100);
      fire(g, S);
    },

    onKey(g, e) {
      if (e.code === 'Tab') e.preventDefault && e.preventDefault();
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S) return;
      const tk = S.tanks[S.turn], live = S.phase === 'aim' && !S.done && !isCpu(g, S, S.turn);
      const hitBtn = () => {
        for (const id of ['aL', 'aR', 'pD', 'pU']) if (inR(DB[id], p)) return id;
        for (let i = 0; i < 4; i++) if (inR(DB.wp[i], p)) return 'w' + i;
        if (inR(DB.fire, p)) return 'fire';
        return null;
      };
      if (type === 'move') {
        if (S.drag && S.drag.id === p.id) {
          if (live) { S.drag.x = clamp(p.x, 0, W); S.drag.y = clamp(p.y, 0, FH); aimAt(S, tk, S.drag); }
          return;
        }
        if (p.kind !== 'touch') S.hover = p.y >= FH ? hitBtn() : null;
        return;
      }
      if (type === 'up') {
        if (S.drag && S.drag.id === p.id) S.drag = null;
        if (S.hold && S.hold.pid === p.id) S.hold = null;
        return;
      }
      // down
      if (!live) return;
      if (p.y >= FH) {
        const b = hitBtn();
        if (!b) return;
        if (b === 'fire') fire(g, S);
        else if (b[0] === 'w') pickWeapon(g, S, tk, +b[1]);
        else { adjust(g, S, tk, b); S.hold = { id: b, pid: p.id }; S.rep[b] = 1; }
        return;
      }
      S.drag = { id: p.id, x: p.x, y: p.y };
      aimAt(S, tk, p);
      g.sfx('tick', { p: 0.6 + tk.pow / 120 });
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S || !S.T) return;
      drawScene(g, ctx, S, alpha);
    },

    cover(ctx, w, h, k) {
      // סצנה קבועה: הטנק הכחול יורה, הפגז נוחת ליד האדום
      const rnd = GK.U.seeded(77);
      const th = THEMES[0];
      const T = { h: new Float32Array(W + 1), grass: new Uint8Array(W + 1).fill(1), cLen: new Float32Array(W + 1), cBot: new Float32Array(W + 1), cV: new Float32Array(W + 1), fall: 0 };
      for (let x = 0; x <= W; x++) {
        let y = 408 + 16 * Math.sin(x * 0.007 + 1.2) + 8 * Math.sin(x * 0.02 + 0.4);
        y -= 200 * Math.exp(-(((x - 470) / 115) ** 2));
        y -= 46 * Math.exp(-(((x - 140) / 80) ** 2));
        T.h[x] = y;
      }
      // משטחים ישרים לשני הטנקים, ומכתש של החטאה קודמת על צלע ההר
      for (const xi of [140, 805]) {
        const y0 = T.h[xi];
        for (let x = Math.max(0, xi - 70); x <= Math.min(W, xi + 70); x++) { const d = Math.abs(x - xi), q = d <= 44 ? 1 : 0.5 + 0.5 * Math.cos((d - 44) / 26 * PI); T.h[x] += (y0 - T.h[x]) * q; }
      }
      carve(T, 262, T.h[262] + 9, 24); for (let x = 0; x <= W; x++) if (T.cLen[x] > 0) { T.h[x] -= T.cLen[x]; T.cLen[x] = 0; }
      const S = { th, T, back: genBack(rnd, th), deco: genDeco(rnd), clock: 30, windShown: 4 };
      S.back.clouds = [{ x: 120, y: 90, s: 1.1 }, { x: 560, y: 70, s: 0.8 }, { x: 860, y: 150, s: 0.9 }];
      ctx.save();
      ctx.scale(w / W, h / FH);
      drawSky(k, ctx, S, 30);
      drawFar(k, ctx, S);
      drawGround(k, ctx, S);
      // הטנקים גדולים פי 2, כדי שיראו אותם טוב גם בכרטיס קטן
      const Z = 2;
      const a = { i: 0, x: 140, y: T.h[140], ang: 0, aim: 58, recoil: 0.5, roll: 0, flash: 0, dead: false };
      const b = { i: 1, x: 805, y: T.h[805], ang: 0, aim: 138, recoil: 0, roll: 0, flash: 0, dead: false };
      const big = tk => { ctx.save(); ctx.translate(tk.x, tk.y); ctx.scale(Z, Z); drawTank(k, ctx, Object.assign({}, tk, { x: 0, y: 0 }), 10, { wind: 4 }); ctx.restore(); };
      // מסלול הפגז: מקצה הקנה, מעל ההר, אל הפיצוץ ליד הטנק האדום
      const r = a.aim * D2R, x0 = a.x + Math.cos(r) * 26 * Z, y0 = a.y - 17 * Z - Math.sin(r) * 26 * Z;
      const ex = 712, ey = T.h[712] - 4;
      const qx = (x0 + ex) / 2, qy = y0 - (qx - x0) * Math.tan(r);
      const P = u => [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * qx + u * u * ex, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * qy + u * u * ey];
      for (let i = 1; i <= 30; i++) { const u = i / 33, [px, py] = P(u); ctx.globalAlpha = u < 0.55 ? 0.35 + u : 0.5; k.circle(ctx, px, py, 2.4 + Math.min(u, 0.55) * 4); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      big(a); big(b);
      const [sx, sy] = P(0.56), [sx2, sy2] = P(0.58);
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1.8, 1.8); drawShellAt(k, ctx, 0, 0, sx2 - sx, sy2 - sy, 1, 0); ctx.restore();
      const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, 58);
      gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.3, '#ffd75e'); gr.addColorStop(0.65, 'rgba(255,120,40,.85)'); gr.addColorStop(1, 'rgba(170,40,10,0)');
      ctx.fillStyle = gr; k.circle(ctx, ex, ey, 58); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; k.circle(ctx, ex, ey, 70); ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const an = -PI * (0.1 + 0.8 * rnd()), d = 36 + rnd() * 64;
        ctx.fillStyle = th.dirt[i % 3];
        ctx.save(); ctx.translate(ex + Math.cos(an) * d, ey + Math.sin(an) * d); ctx.rotate(rnd() * 3); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      }
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#4a4a52'; k.circle(ctx, ex - 24 + i * 10, ey - 62 - i * 9, 15 + i * 3); ctx.fill(); }
      ctx.globalAlpha = 1;
      // פס חיים מעל כל טנק
      for (const [tk, f] of [[a, 1], [b, 0.35]]) {
        const bw = 78, bx = tk.x - bw / 2, by = tk.y - 100;
        k.rr(ctx, bx - 3, by - 3, bw + 6, 16, 8); ctx.fillStyle = 'rgba(10,14,22,.75)'; ctx.fill();
        k.rr(ctx, bx, by, bw * f, 10, 5); ctx.fillStyle = f > 0.6 ? '#5ad35a' : '#ff5a4e'; ctx.fill();
      }
      ctx.restore();
    },
  });
})();
