// ============================================================
//  קשת וחץ — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מבט מהצד: גוררים אחורה כדי לכוון ולמתוח, משחררים, והחץ עף עם כוח המשיכה והרוח.
//  20 שלבים: מטרות במרחקים שגדלים, מטרות זזות, בלונים ותפוח על דחליל. 3 כוכבים לפי נקודות.
//  חצים ננעצים במה שהם פוגעים בו, והמצלמה עוקבת אחרי החץ ביריות ארוכות.
// ============================================================
(function () {
  'use strict';
  const VW = 960, VH = 540, G0 = 462;
  const GRAV = 520, VMAX = 1150, WIND_A = 22, DT = 1 / 60, SUB = 4;
  const SHX = 116, SHY = G0 - 64;                 // הכתף של הקשת
  const PULL = 170, AMIN = -10, AMAX = 75, PMIN = 12, ARROW_L = 46, M_PX = 20;   // 20 פיקסלים = מטר
  const PI = Math.PI, D2R = PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const RING_C = ['#ffd23f', '#ff4d4d', '#3d8bfd', '#2b2f3a', '#f4f4f0'], RING_P = [10, 8, 6, 4, 2];
  const BAL_C = ['#ff5a6e', '#ffb02e', '#4fc3f7', '#7be07b', '#c38bff', '#ff7ac8'];

  // ----- השלבים: מטרה T, בלון B, תפוח על דחליל A; כוכבים לפי נקודות -----
  const T = (x, o) => Object.assign({ k: 'T', x, r: 36, h: 78, amp: 0, per: 150 }, o || {});
  const B = (x, y, amp) => ({ k: 'B', x, y, r: 17, amp: amp || 0 });
  const A = x => ({ k: 'A', x });
  const LV = (n, wind, stars, items, hill) => ({ n, wind, stars, items, hill: hill || null });
  const LEVELS = [
    LV(3, 0, [10, 18, 25], [T(430)]),
    LV(3, 0, [10, 18, 25], [T(560)]),
    LV(4, 0, [20, 30, 40], [B(480, 330), B(560, 280), B(640, 350)]),
    LV(3, 2, [10, 18, 25], [T(660)]),
    LV(3, 0, [10, 16, 24], [T(600, { amp: 55, per: 150 })]),
    LV(3, 0, [30, 40, 50], [A(600)]),
    LV(3, -2, [10, 18, 25], [T(820)]),
    LV(5, 1, [30, 40, 50], [B(640, 300), B(720, 230, 20), B(800, 330), B(880, 260, 25)]),
    LV(4, 0, [14, 24, 32], [T(600), T(900)]),
    LV(3, 3, [8, 16, 24], [T(900, { amp: 70, per: 180 })]),
    LV(3, -2, [30, 40, 50], [A(860)]),
    LV(3, 2, [10, 18, 25], [T(1050)], { x: 1050, h: 90, w: 170 }),
    LV(6, -3, [30, 50, 60], [B(900, 280, 30), B(980, 200), B(1060, 320, 25), B(1140, 240), B(1220, 300, 35)]),
    LV(3, 4, [10, 18, 25], [T(1200)]),
    LV(3, -3, [8, 16, 22], [T(1000, { amp: 80, per: 120 })]),
    LV(3, 4, [30, 40, 50], [A(1150)]),
    LV(5, -4, [24, 40, 56], [T(1000), T(1400), B(1200, 250), B(1300, 200)]),
    LV(7, 5, [40, 60, 70], [B(1100, 180), B(1180, 240, 20), B(1260, 160), B(1340, 220, 30), B(1420, 150), B(1500, 210, 25)]),
    LV(4, -5, [10, 20, 30], [T(1500, { amp: 80, per: 200 })]),
    LV(4, 6, [30, 50, 70], [A(1650), B(1450, 250), B(1550, 200, 25)], { x: 1650, h: 40, w: 220 }),
  ];

  function groundY(D, x) { const h = D.hill; return h ? G0 - h.h * Math.exp(-((x - h.x) / h.w) * ((x - h.x) / h.w)) : G0; }
  function mkObjs(D) {
    return D.items.map((it, i) => {
      const o = Object.assign({}, it, { i, gy: groundY(D, it.x) });
      if (o.k === 'T') { o.base = o.gy - o.h; o.shake = 0; }
      if (o.k === 'B') { o.per = 130 + i * 23; o.ph = i * 1.7; o.col = BAL_C[i % BAL_C.length]; o.popped = false; }
      if (o.k === 'A') { o.hit = false; o.react = 0; }
      return o;
    });
  }
  // מיקום של דבר לפי שעון השלב (בפריימים) — הכול דטרמיניסטי, כדי שהבוט יוכל לחשב מראש
  function oY(o, t) {
    if (o.k === 'T') return o.base - (o.amp ? o.amp * Math.sin(2 * PI * t / o.per) : 0);
    if (o.k === 'B') return o.y + (o.amp ? o.amp * Math.sin(2 * PI * t / o.per + o.ph) : 0);
    return o.gy - 132;
  }
  const ringOf = (dy, r) => clamp(Math.floor(Math.abs(dy) / r * 5), 0, 4);
  const active = o => (o.k === 'T' ? true : o.k === 'B' ? !o.popped : !o.hit);

  // ================= החץ =================
  function newArrow(a, p) {
    const r = a * D2R, v = p / 100 * VMAX;
    return { x: SHX + Math.cos(r) * 36, y: SHY - Math.sin(r) * 36, vx: Math.cos(r) * v, vy: -Math.sin(r) * v, t: 0, pops: [], apple: null, near: 1e9, trail: [] };
  }
  // צעד אחד של החץ בזמן השלב tt. בלונים ותפוח לא עוצרים אותו (נרשמים בחץ). מחזיר אירוע עצירה או null
  function stepArrow(S, ar, tt) {
    const hs = DT / SUB, ax = S.wind * WIND_A;
    for (let k = 0; k < SUB; k++) {
      const px = ar.x, py = ar.y;
      ar.vx += ax * hs; ar.vy += GRAV * hs; ar.x += ar.vx * hs; ar.y += ar.vy * hs;
      const tq = tt - 1 + (k + 1) / SUB;
      for (const o of S.objs) {
        if (o.k === 'T') {
          const oy = oY(o, tq);
          if (px < o.x && ar.x >= o.x) {
            const f = (o.x - px) / (ar.x - px), yc = py + (ar.y - py) * f;
            if (Math.abs(yc - oy) <= o.r) return { k: 'T', o, ring: ringOf(yc - oy, o.r), dy: yc - oy, x: o.x, y: yc };
            if (yc > oy + o.r && yc < o.gy) return { k: 'post', o, x: o.x, y: yc };
          }
          const d = Math.hypot(ar.x - o.x, ar.y - oy); if (d < ar.near) ar.near = d;
        } else if (o.k === 'B') {
          if (o.popped || ar.pops.includes(o)) continue;
          const oy = oY(o, tq), d = Math.hypot(ar.x - o.x, ar.y - oy);
          if (d < o.r + 3) ar.pops.push(o); else if (d < ar.near) ar.near = d;
        } else {
          const ay = o.gy - 132;
          if (!o.hit && !ar.apple) { const d = Math.hypot(ar.x - o.x, ar.y - ay); if (d < 14) ar.apple = o; else if (d < ar.near) ar.near = d; }
          const x = ar.x, y = ar.y, gy = o.gy;
          if (Math.hypot(x - o.x, y - (gy - 104)) < 15 || (Math.abs(x - o.x) < 17 && y > gy - 94 && y < gy - 30) || (Math.abs(x - o.x) < 37 && y > gy - 89 && y < gy - 79) || (Math.abs(x - o.x) < 19 && y > gy - 123 && y < gy - 112) || (Math.abs(x - o.x) < 4 && y > gy - 30))
            return { k: 'scare', o, x, y };
        }
      }
      const gy = groundY(S.D, ar.x);
      if (ar.y >= gy) return { k: 'ground', x: ar.x, y: gy };
      if (ar.x > S.Wd + 80 || ar.x < -80 || ar.y > VH + 100) return { k: 'out', x: ar.x, y: ar.y };
    }
    if (++ar.t > 600) return { k: 'out', x: ar.x, y: ar.y };
    return null;
  }
  // כמה נקודות שווה ירייה (בלי לשנות כלום) — בשביל הבוט והחיפוש
  function simShot(S, a, p, t0) {
    const ar = newArrow(a, p);
    let ev = null;
    for (let i = 0; i < 620 && !ev; i++) ev = stepArrow(S, ar, t0 + i);
    let pts = ar.pops.length * 10 + (ar.apple ? 30 : 0);
    if (ev && ev.k === 'T') pts += RING_P[ev.ring];
    return { pts, ev, near: ev && ev.k === 'T' ? Math.abs(ev.dy) : ar.near, pops: ar.pops.length, apple: !!ar.apple };
  }
  // הירייה הטובה ביותר לחץ הבא: רשת גסה של זווית × כוח (× זמן שחרור כשמשהו זז), ואז חיפוש עדין
  function bestShot(S) {
    const moving = S.objs.some(o => o.amp && active(o));
    const delays = [];
    if (moving) for (let d = 0; d <= 120; d += 8) delays.push(d); else delays.push(0);
    const val = r => r.pts * 1000 - Math.min(999, r.near);
    let best = null;
    for (const d of delays) {
      const t0 = S.t + d + 1;
      for (let a = -4; a <= 70; a += 2) for (let p = 30; p <= 100; p += 2.5) {
        const r = simShot(S, a, p, t0), v = val(r);
        if (!best || v > best.v) best = { v, a, p, d, pts: r.pts };
      }
    }
    const b0 = best;
    for (let a = b0.a - 2; a <= b0.a + 2; a += 0.25) for (let p = Math.max(PMIN, b0.p - 3); p <= Math.min(100, b0.p + 3); p += 0.5) {
      const r = simShot(S, a, p, S.t + b0.d + 1), v = val(r);
      if (v > best.v) best = { v, a, p, d: b0.d, pts: r.pts };
    }
    return best;
  }

  // ================= מצב השלב =================
  function newState(g, lv) {
    const D = LEVELS[lv - 1];
    const far = Math.max(...D.items.map(o => o.x));
    const rnd = GK.U.seeded(lv * 7919 + 3);
    const S = {
      lv, D, t: 0, clock: 0, arrows: D.n, score: 0, wind: D.wind, Wd: Math.max(VW, far + 260),
      objs: mkObjs(D), phase: 'aim', aim: { a: 12, p: 0 }, drag: null, kb: false, rep: {}, fly: null, stuck: [], parts: [], trace: [],
      cam: 0, hold: 0, holdX: 0, intro: 0, done: false, finished: false, shots: 0, last: null, botPlan: null, flash: 0,
      trees: [], clouds: [], flowers: [],
    };
    for (let x = -40; x < S.Wd * 0.55 + VW; x += 38 + rnd() * 60) S.trees.push({ x, s: 0.75 + rnd() * 0.6, k: rnd() < 0.5 ? 0 : 1 });
    for (let i = 0; i < 7; i++) S.clouds.push({ x: rnd() * (S.Wd * 0.3 + VW), y: 50 + rnd() * 130, s: 0.6 + rnd() * 0.7 });
    for (let x = 30; x < S.Wd; x += 18 + rnd() * 40) S.flowers.push({ x, c: BAL_C[(rnd() * 6) | 0], h: 5 + rnd() * 6 });
    S.focus = focusX(S);
    return S;
  }
  function focusX(S) {
    const xs = S.objs.filter(active).map(o => o.x);
    return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : S.objs[0].x;
  }
  const allDone = S => !S.objs.some(o => o.k === 'T') && !S.objs.some(active);
  function setAim(S, a, p) { S.aim.a = clamp(a, AMIN, AMAX); S.aim.p = clamp(p, 0, 100); }

  // ----- חלקיקים בעולם (זזים עם המצלמה) -----
  function puff(S, x, y, o) {
    const n = o.n || 10;
    for (let i = 0; i < n && S.parts.length < 400; i++) {
      const a = (o.dir != null ? o.dir : -PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : PI * 2), v = (o.speed || 3) * (0.35 + Math.random() * 0.9);
      const life = (o.life || 40) * (0.6 + Math.random() * 0.6);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: (o.size || 4) * (0.6 + Math.random() * 0.8), col: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color, g: o.gravity != null ? o.gravity : 0.15, sq: !!o.sq, rot: Math.random() * 6 });
    }
  }

  function shoot(g, S) {
    if (S.phase !== 'aim' || S.done || S.arrows <= 0 || S.aim.p < PMIN) return false;
    S.fly = newArrow(S.aim.a, S.aim.p);
    S.arrows--; S.shots++;
    S.phase = 'fly'; S.drag = null; S.kb = false; S.intro = 0; S.trace = [];
    g.sfx('whoosh');
    g.tone({ f: 330, f2: 110, dur: 0.16, type: 'triangle', vol: 0.18 });
    if (S.arrows === 1 && S.objs.some(o => o.k === 'T' || active(o))) g.after(0.3, () => { if (g.s === S && !S.done) g.msg(g.t('lastArrow'), 900, '#ffd166'); });
    return true;
  }

  function onHit(g, S, ar, ev) {
    const ang = Math.atan2(ar.vy, ar.vx);
    // בלונים שהחץ עבר דרכם
    S.fly = null;
    let gained = 0;
    if (ev.k === 'T') {
      const o = ev.o, pts = RING_P[ev.ring];
      gained += pts;
      S.stuck.push({ o, dx: 3, dy: ev.dy, ang, wob: 1 });
      o.shake = 1;
      g.float(o.x - S.cam, ev.y - 30, '+' + pts, { color: RING_C[ev.ring] === '#2b2f3a' ? '#ffffff' : RING_C[ev.ring], size: 30 });
      if (ev.ring === 0) { g.float(o.x - S.cam, ev.y - 64, g.t('bull'), { color: '#ffe066', size: 28 }); g.sfx('score'); g.sfx('coin', { p: 1.2 }); g.flash('#fff6c2', 0.18); puff(S, o.x, ev.y, { n: 18, color: ['#ffe066', '#fff6c2', '#ffffff'], speed: 4, life: 34, gravity: 0.05, size: 4 }); }
      else g.sfx('hit', { p: 1.5 - ev.ring * 0.12 });
      puff(S, o.x, ev.y, { n: 8, color: ['#e9d7a5', '#c9a66b'], speed: 2.4, life: 24, size: 3, sq: true, dir: PI, spread: 1.6 });
      g.shake(2);
    } else if (ev.k === 'post' || ev.k === 'scare') {
      S.stuck.push(ev.k === 'post' ? { o: ev.o, dx: 2, dy: ev.y - oY(ev.o, S.t), ang, wob: 1 } : { x: ev.x, y: ev.y, ang, wob: 1, apple: !!ar.apple });
      if (ev.k === 'scare') { ev.o.react = 90; g.float(ev.o.x - S.cam, ev.o.gy - 150, g.t('hey'), { color: '#ffd0c8', size: 24 }); g.sfx('bounce', { p: 0.8 }); puff(S, ev.x, ev.y, { n: 12, color: ['#f2d46b', '#d9b44a'], speed: 3, life: 36, size: 3, gravity: 0.12 }); }
      else { g.sfx('place', { p: 1.4 }); g.float(ev.x - S.cam, ev.y - 30, g.t('miss'), { color: '#ffffff', size: 22 }); }
    } else if (ev.k === 'ground') {
      S.stuck.push({ x: ev.x, y: ev.y + 4, ang: clamp(ang, 0.25, 1.3), wob: 1, apple: !!ar.apple });
      puff(S, ev.x, ev.y, { n: 9, color: ['#8a6a3a', '#6fae4a', '#b89060'], speed: 2.2, life: 26, size: 3, sq: true });
      g.sfx('place', { p: 0.7 });
      if (!ar.pops.length && !ar.apple) g.float(ev.x - S.cam, ev.y - 34, g.t('miss'), { color: '#ffffff', size: 22 });
    }
    S.score += gained;
    S.last = { x: ev.x, y: ev.y };
    S.phase = 'hold'; S.hold = 0; S.holdX = ev.x || S.holdX;
    if (ev.k === 'out') S.hold = 24;
  }
  function onPops(g, S, ar) {
    for (const o of ar.pops) {
      if (o.popped) continue;
      o.popped = true;
      S.score += 10;
      const y = oY(o, S.t);
      puff(S, o.x, y, { n: 22, color: [o.col, '#ffffff', GK.U.shade(o.col, -0.25)], speed: 4.5, life: 36, gravity: 0.12, size: 5, sq: true });
      g.float(o.x - S.cam, y - 30, '+10', { color: '#ffffff', size: 26 });
      g.sfx('pop', { p: 0.9 + Math.random() * 0.3 });
    }
    if (ar.apple && !ar.apple.hit) {
      const o = ar.apple;
      o.hit = true; o.react = 120;
      S.score += 30;
      puff(S, o.x, o.gy - 132, { n: 18, color: ['#ff4d4d', '#ffd0d0', '#7be07b'], speed: 3.5, life: 34, gravity: 0.15, size: 4 });
      g.float(o.x - S.cam, o.gy - 170, g.t('appleHit'), { color: '#ffe066', size: 30 });
      g.float(o.x - S.cam, o.gy - 140, '+30', { color: '#ffffff', size: 26 });
      g.sfx('splash'); g.sfx('power'); g.flash('#fff6c2', 0.2);
    }
  }
  function finish(g, S) {
    if (S.finished) return;
    S.finished = true; S.done = true;
    const st = S.D.stars;
    if (allDone(S) && S.arrows > 0) { const b = S.arrows * 10; S.score += b; g.msg(g.t('bonus', { n: b }), 1200, '#ffe066'); }
    const stars = S.score >= st[2] ? 3 : S.score >= st[1] ? 2 : S.score >= st[0] ? 1 : 0;
    if (stars) {
      for (let i = 0; i < 70; i++) puff(S, S.cam + Math.random() * VW, -10 - Math.random() * 40, { n: 1, color: BAL_C, speed: 1.5, life: 120, gravity: 0.06, size: 7, sq: true, dir: PI / 2, spread: 1.2 });
      g.after(0.9, () => { if (g.s === S) g.completeLevel(stars, { text: g.t('pts', { n: S.score }) }); });
    } else g.after(0.5, () => { if (g.s === S) g.end({ result: 'lose', score: null, title: g.t('notEnough'), text: g.t('need', { n: st[0], m: S.score }) }); });
  }

  // ----- שליטה -----
  function keys(g, S) {
    const acts = [['ArrowUp', 'KeyW', 'up'], ['ArrowDown', 'KeyS', 'dn'], ['ArrowRight', 'KeyD', 'pu'], ['ArrowLeft', 'KeyA', 'pd']];
    for (const [k1, k2, id] of acts) {
      const hit = g.hit(k1) || g.hit(k2), held = g.key(k1) || g.key(k2);
      let n = 0;
      if (hit) n = S.rep[id] = 1; else if (held) n = S.rep[id] = (S.rep[id] || 0) + 1; else { S.rep[id] = 0; continue; }
      if (!(n === 1 || (n > 14 && n % 2 === 0))) continue;
      if (!S.kb) { S.kb = true; if (S.aim.p < 30) S.aim.p = 55; }
      if (id === 'up') setAim(S, S.aim.a + 0.5, S.aim.p);
      else if (id === 'dn') setAim(S, S.aim.a - 0.5, S.aim.p);
      else if (id === 'pu') setAim(S, S.aim.a, S.aim.p + 1);
      else setAim(S, S.aim.a, S.aim.p - 1);
      S.intro = 0;
      if (id[0] === 'p' && Math.round(S.aim.p) % 10 === 0) g.sfx('tick', { p: 0.6 + S.aim.p / 100 });
    }
    if ((g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter')) && S.kb) shoot(g, S);
  }

  // ================= ציור =================
  function drawSky(k, ctx, S) {
    const gr = ctx.createLinearGradient(0, 0, 0, VH);
    gr.addColorStop(0, '#4aa3e8'); gr.addColorStop(0.6, '#a9dcff'); gr.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    const sx = 820 - S.cam * 0.05, sy = 92;
    const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 110);
    sg.addColorStop(0, 'rgba(255,250,215,.95)'); sg.addColorStop(0.3, 'rgba(255,238,160,.45)'); sg.addColorStop(1, 'rgba(255,238,160,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 110, sy - 110, 220, 220);
    k.circle(ctx, sx, sy, 28); ctx.fillStyle = '#fff4c4'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const c of S.clouds) {
      const cw = 110 * c.s, x = ((c.x - S.cam * 0.15 + S.clock * 0.08 * (1 + S.wind * 0.3)) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      for (const [dx, dy, r] of [[0, 0, 0.3], [0.24, -0.13, 0.26], [0.46, 0, 0.28], [0.22, 0.07, 0.32]]) { k.circle(ctx, x + dx * cw, c.y + dy * cw, r * cw * 0.72); ctx.fill(); }
    }
    // גבעות רחוקות (פרלקסה)
    const hill = (par, base, amp, f, ph, c1, c2) => {
      ctx.beginPath(); ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 16) { const wx = x + S.cam * par; ctx.lineTo(x, base - Math.sin(wx * f + ph) * amp - Math.sin(wx * f * 2.3 + ph * 1.7) * amp * 0.4); }
      ctx.lineTo(VW, VH); ctx.closePath();
      const g2 = ctx.createLinearGradient(0, base - amp * 1.4, 0, VH); g2.addColorStop(0, c1); g2.addColorStop(1, c2);
      ctx.fillStyle = g2; ctx.fill();
    };
    hill(0.15, 330, 30, 0.005, 1.1, '#9cc7e4', '#86b6d6');
    hill(0.3, 372, 26, 0.008, 3.3, '#8fcf86', '#72b96a');
    // עצים באמצע
    for (const tr of S.trees) {
      const x = tr.x - S.cam * 0.5;
      if (x < -40 || x > VW + 40) continue;
      const y = 404, s = tr.s;
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 3 * s, y - 18 * s, 6 * s, 20 * s);
      ctx.fillStyle = tr.k ? '#3f8f4a' : '#4fa356';
      if (tr.k) { ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 14 * s); ctx.lineTo(x, y - 58 * s); ctx.lineTo(x + 16 * s, y - 14 * s); ctx.fill(); }
      else { k.circle(ctx, x, y - 32 * s, 17 * s); ctx.fill(); k.circle(ctx, x - 10 * s, y - 24 * s, 12 * s); ctx.fill(); k.circle(ctx, x + 10 * s, y - 24 * s, 12 * s); ctx.fill(); }
    }
  }
  function drawGround(k, ctx, S, x0, x1) {
    const D = S.D;
    ctx.beginPath(); ctx.moveTo(x0, VH + 2);
    for (let x = x0; x <= x1 + 8; x += 8) ctx.lineTo(x, groundY(D, x));
    ctx.lineTo(x1 + 8, VH + 2); ctx.closePath();
    let gr = ctx.createLinearGradient(0, G0 - 100, 0, VH);
    gr.addColorStop(0, '#79c94f'); gr.addColorStop(0.35, '#5daa3c'); gr.addColorStop(1, '#3f7f2a');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#a3e36c'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 8; x += 8) { if (x === x0) ctx.moveTo(x, groundY(D, x) + 1); else ctx.lineTo(x, groundY(D, x) + 1); }
    ctx.stroke();
    // פרחים
    for (const f of S.flowers) {
      if (f.x < x0 - 10 || f.x > x1 + 10) continue;
      const y = groundY(D, f.x) + 6;
      ctx.strokeStyle = '#3f7f2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x, y - f.h); ctx.stroke();
      k.circle(ctx, f.x, y - f.h, 2.6); ctx.fillStyle = f.c; ctx.fill();
    }
    // שלטי מרחק כל 10 מטר
    for (let m = 10; SHX + m * M_PX < S.Wd; m += 10) {
      const x = SHX + m * M_PX;
      if (x < x0 - 30 || x > x1 + 30) continue;
      const y = groundY(D, x) + 14;
      ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 2, y - 26, 4, 26);
      k.rr(ctx, x - 15, y - 38, 30, 16, 4); ctx.fillStyle = '#e8c98e'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#7a5530'; ctx.stroke();
      k.text(ctx, String(m), x, y - 30, { size: 11, weight: 800, color: '#5a3a1a' });
    }
  }
  function drawTarget(k, ctx, o, y, t) {
    const sh = o.shake > 0 ? Math.sin(t * 1.8) * o.shake * 2 : 0;
    // רגליים
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(o.x - 16, o.gy + 2); ctx.lineTo(o.x + 2, y + o.r * 0.5); ctx.moveTo(o.x + 16, o.gy + 2); ctx.lineTo(o.x + 4, y + o.r * 0.5); ctx.stroke();
    if (o.amp) { ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x + 3, o.gy); ctx.lineTo(o.x + 3, y); ctx.stroke(); }
    ctx.save(); ctx.translate(o.x + sh, y);
    const rx = o.r * 0.34;
    ctx.beginPath(); ctx.ellipse(3, 2, rx + 3, o.r + 2, 0, 0, 2 * PI); ctx.fillStyle = '#a8793f'; ctx.fill();
    for (let i = 4; i >= 0; i--) { ctx.beginPath(); ctx.ellipse(0, 0, rx * (i + 1) / 5, o.r * (i + 1) / 5, 0, 0, 2 * PI); ctx.fillStyle = RING_C[i]; ctx.fill(); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, 0, rx * (i + 1) / 5, o.r * (i + 1) / 5, 0, 0, 2 * PI); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-rx * 0.3, -o.r * 0.45, rx * 0.25, o.r * 0.25, 0, 0, 2 * PI); ctx.fill();
    ctx.restore();
  }
  function drawBalloon(k, ctx, o, y, t) {
    ctx.strokeStyle = 'rgba(80,80,80,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(o.x, y + o.r + 4);
    for (let i = 1; i <= 6; i++) ctx.lineTo(o.x + Math.sin(t * 0.06 + i + o.i) * 3, y + o.r + 4 + i * 8);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(o.x, y, o.r * 0.86, o.r, 0, 0, 2 * PI);
    const gr = ctx.createRadialGradient(o.x - 5, y - 6, 2, o.x, y, o.r * 1.1);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, o.col); gr.addColorStop(1, GK.U.shade(o.col, -0.3));
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = GK.U.shade(o.col, -0.3);
    ctx.beginPath(); ctx.moveTo(o.x - 3, y + o.r + 4); ctx.lineTo(o.x + 3, y + o.r + 4); ctx.lineTo(o.x, y + o.r - 1); ctx.fill();
  }
  function drawScarecrow(k, ctx, o, t) {
    const x = o.x, gy = o.gy, sc = o.react > 0;
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 3, gy - 112, 6, 114);
    ctx.fillRect(x - 36, gy - 88, 72, 7);
    ctx.fillStyle = '#e8c55a';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 34, gy - 88); ctx.lineTo(x + s * 44, gy - 92); ctx.lineTo(x + s * 42, gy - 84); ctx.lineTo(x + s * 45, gy - 78); ctx.lineTo(x + s * 34, gy - 81); ctx.fill(); }
    k.rr(ctx, x - 17, gy - 94, 34, 46, 6); ctx.fillStyle = '#d9473d'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,20,.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 17, gy - 82 + i * 12); ctx.lineTo(x + 17, gy - 82 + i * 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8 + i * 8, gy - 94); ctx.lineTo(x - 8 + i * 8, gy - 48); ctx.stroke(); }
    k.rr(ctx, x - 15, gy - 50, 30, 18, 4); ctx.fillStyle = '#3d6fb0'; ctx.fill();
    ctx.fillStyle = '#e8c55a'; ctx.beginPath(); ctx.moveTo(x - 12, gy - 33); ctx.lineTo(x - 8, gy - 22); ctx.lineTo(x - 4, gy - 33); ctx.moveTo(x + 4, gy - 33); ctx.lineTo(x + 8, gy - 22); ctx.lineTo(x + 12, gy - 33); ctx.fill();
    k.circle(ctx, x, gy - 104, 15); ctx.fillStyle = '#e3c48a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#a8864a'; ctx.stroke();
    for (const s of [-1, 1]) { k.circle(ctx, x + s * 5.5, gy - 107, sc ? 4 : 2.6); ctx.fillStyle = '#2b2f3a'; ctx.fill(); }
    ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (sc) { k.circle(ctx, x, gy - 97, 3.5); ctx.stroke(); }
    else { ctx.moveTo(x - 7, gy - 99); ctx.quadraticCurveTo(x, gy - 94, x + 7, gy - 99); ctx.stroke(); }
    ctx.fillStyle = '#9a6a2a';
    ctx.beginPath(); ctx.ellipse(x, gy - 115, 20, 4.5, 0, 0, 2 * PI); ctx.fill();
    k.rr(ctx, x - 11, gy - 128, 22, 14, 5); ctx.fill();
    ctx.fillStyle = '#d9473d'; ctx.fillRect(x - 11, gy - 119, 22, 3);
    if (!o.hit) drawApple(k, ctx, x, gy - 132 + Math.sin(t * 0.05) * 0.6, 11);
  }
  function drawApple(k, ctx, x, y, r) {
    k.circle(ctx, x, y, r);
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ff9a9a'); gr.addColorStop(0.55, '#e8323c'); gr.addColorStop(1, '#8f1420');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + 2, y - r * 1.3); ctx.stroke();
    ctx.fillStyle = '#4fc24f'; ctx.beginPath(); ctx.ellipse(x + r * 0.5, y - r * 1.1, r * 0.4, r * 0.18, -0.5, 0, 2 * PI); ctx.fill();
  }
  function drawArrow(k, ctx, x, y, ang, len, o) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const L = len || ARROW_L;
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-4, 0); ctx.stroke();
    ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-7, -4); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = (o && o.col) || '#ff5a4e';
    ctx.beginPath(); ctx.moveTo(-L + 1, 0); ctx.lineTo(-L - 6, -6); ctx.lineTo(-L + 9, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L + 1, 0); ctx.lineTo(-L - 6, 6); ctx.lineTo(-L + 9, 1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawArcher(k, ctx, S, a, draw, arrowOn, t) {
    const x = 104, gy = G0, r = a * D2R, dx = Math.cos(r), dy = -Math.sin(r);
    const shx = SHX, shy = SHY;
    // רגליים ומגפיים
    ctx.fillStyle = '#5b4a3a';
    k.rr(ctx, x - 9, gy - 34, 8, 30, 3); ctx.fill(); k.rr(ctx, x + 3, gy - 34, 8, 30, 3); ctx.fill();
    ctx.fillStyle = '#6b3f1d'; k.rr(ctx, x - 11, gy - 8, 13, 8, 3); ctx.fill(); k.rr(ctx, x + 2, gy - 8, 14, 8, 3); ctx.fill();
    // אשפה עם חצים
    ctx.save(); ctx.translate(x - 12, gy - 70); ctx.rotate(-0.35);
    for (let i = 0; i < Math.min(5, S.arrows); i++) { ctx.fillStyle = '#ff5a4e'; ctx.fillRect(-6 + i * 3.2, -16, 2.6, 8); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-5.5 + i * 3.2, -9, 1.6, 6); }
    k.rr(ctx, -9, -6, 16, 34, 4); ctx.fillStyle = '#8a5a2b'; ctx.fill(); ctx.fillStyle = '#6b4220'; ctx.fillRect(-9, 2, 16, 3);
    ctx.restore();
    // גוף
    k.rr(ctx, x - 13, gy - 76, 26, 46, 9); ctx.fillStyle = '#3f9a52'; ctx.fill();
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 13, gy - 46, 26, 5);
    // ראש וברדס
    k.circle(ctx, x + 1, gy - 88, 12); ctx.fillStyle = '#f2c9a0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 13, gy - 84); ctx.quadraticCurveTo(x - 12, gy - 106, x + 4, gy - 103); ctx.quadraticCurveTo(x + 14, gy - 100, x + 12, gy - 92); ctx.lineTo(x - 2, gy - 94); ctx.lineTo(x - 6, gy - 80); ctx.closePath();
    ctx.fillStyle = '#2f7a40'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 12, gy - 100); ctx.lineTo(x - 26, gy - 96); ctx.lineTo(x - 12, gy - 92); ctx.fill();
    const blink = (S.clock % 200) < 6;
    if (blink) { ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 4, gy - 89); ctx.lineTo(x + 8, gy - 89); ctx.stroke(); }
    else { k.circle(ctx, x + 6, gy - 89, 1.8); ctx.fillStyle = '#2b2f3a'; ctx.fill(); }
    // יד קדמית וקשת
    const grx = shx + dx * 28, gry = shy + dy * 28;
    ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(grx, gry); ctx.stroke();
    const nx = -dy, ny = dx, bl = 32;
    const t1x = grx + nx * bl - dx * 6, t1y = gry + ny * bl - dy * 6, t2x = grx - nx * bl - dx * 6, t2y = gry - ny * bl - dy * 6;
    const hx = grx - dx * (6 + draw * 32), hy = gry - dy * (6 + draw * 32);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(t1x, t1y); ctx.lineTo(hx, hy); ctx.lineTo(t2x, t2y); ctx.stroke();
    ctx.strokeStyle = '#8a4a1c'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(t1x, t1y); ctx.quadraticCurveTo(grx + dx * 16, gry + dy * 16, t2x, t2y); ctx.stroke();
    ctx.strokeStyle = '#c47a3a'; ctx.lineWidth = 1.6; ctx.stroke();
    if (arrowOn) drawArrow(k, ctx, hx + dx * ARROW_L, hy + dy * ARROW_L, Math.atan2(dy, dx));
    // יד אחורית מושכת
    ctx.strokeStyle = '#3f9a52'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(shx - 4, shy + 2); ctx.lineTo((shx + hx) / 2 - dy * 4, (shy + hy) / 2 + 6); ctx.stroke();
    ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo((shx + hx) / 2 - dy * 4, (shy + hy) / 2 + 6); ctx.lineTo(hx, hy); ctx.stroke();
    k.circle(ctx, grx, gry, 3.5); ctx.fillStyle = '#f2c9a0'; ctx.fill();
  }
  function drawWorld(k, ctx, S, x0, x1, t) {
    drawGround(k, ctx, S, x0, x1);
    for (const o of S.objs) {
      if (o.x < x0 - 80 || o.x > x1 + 80) continue;
      if (o.k === 'T') drawTarget(k, ctx, o, oY(o, S.t), t);
      else if (o.k === 'A') drawScarecrow(k, ctx, o, t);
    }
    for (const s of S.stuck) {
      let x = s.x, y = s.y;
      if (s.o) { x = s.o.x + s.dx; y = oY(s.o, S.t) + s.dy; }
      const w = s.wob > 0.02 ? Math.sin(S.clock * 1.6) * s.wob * 0.08 : 0;
      drawArrow(k, ctx, x, y, s.ang + w, ARROW_L);
      if (s.apple) drawApple(k, ctx, x - Math.cos(s.ang) * 10, y - Math.sin(s.ang) * 10, 10);
    }
    for (const o of S.objs) if (o.k === 'B' && !o.popped && o.x > x0 - 40 && o.x < x1 + 40) drawBalloon(k, ctx, o, oY(o, S.t), t);
  }
  function drawGuide(k, ctx, S) {
    const ar = newArrow(S.aim.a, S.aim.p);
    for (let i = 1; i <= 10; i++) {
      const tt = i * 0.03, x = ar.x + ar.vx * tt, y = ar.y + ar.vy * tt + 0.5 * GRAV * tt * tt;
      ctx.globalAlpha = 0.9 - i * 0.07;
      k.circle(ctx, x, y, 3.2 - i * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,40,70,.35)'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawHud(k, ctx, S, g) {
    // חצים
    const aw = 22 + S.D.n * 24;   // הלוח ברוחב של החצים של השלב
    k.rr(ctx, 10, 10, aw, 40, 12); ctx.fillStyle = 'rgba(8,16,30,.45)'; ctx.fill();
    for (let i = 0; i < S.D.n; i++) {
      ctx.globalAlpha = i < S.arrows ? 1 : 0.25;
      drawArrow(k, ctx, 36 + i * 24, 17, -PI / 2.6, 26, {});
    }
    ctx.globalAlpha = 1;
    // פס נקודות עם שלושה כוכבים
    const st = S.D.stars, max = st[2] * 1.12, bx = aw + 30, bw = 210, by = 22;
    k.rr(ctx, bx - 8, 10, bw + 16, 40, 12); ctx.fillStyle = 'rgba(8,16,30,.45)'; ctx.fill();
    k.rr(ctx, bx, by + 6, bw, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
    const f = Math.min(1, S.score / max);
    if (f > 0) { const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ffd166'); gr.addColorStop(1, '#ff9f43'); k.rr(ctx, bx, by + 6, Math.max(10, bw * f), 10, 5); ctx.fillStyle = gr; ctx.fill(); }
    for (let i = 0; i < 3; i++) {
      const x = bx + bw * st[i] / max, on = S.score >= st[i];
      star(ctx, x, by + 11, on ? 11 : 9);
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,.35)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#b8860b' : 'rgba(0,0,0,.3)'; ctx.stroke();
    }
    k.text(ctx, String(S.score), bx + 6, by - 3, { size: 12, weight: 900, color: '#fff', align: 'left' });
    // רוח
    const cx = bx + bw + 100;
    k.rr(ctx, cx - 80, 10, 160, 40, 12); ctx.fillStyle = 'rgba(8,16,30,.45)'; ctx.fill();
    k.text(ctx, g.t('wind'), cx, 20, { size: 12, weight: 700, color: 'rgba(255,255,255,.8)' });
    if (!S.wind) k.text(ctx, g.t('calm'), cx, 38, { size: 14, weight: 800, color: '#cfe8ff', maxW: 140 });
    else {
      const dir = Math.sign(S.wind), len = 14 + Math.abs(S.wind) * 7, y = 38, x0 = cx - 18 - dir * len / 2, x1 = cx - 18 + dir * len / 2;
      ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.moveTo(x1 + dir * 8, y); ctx.lineTo(x1 - dir * 3, y - 6); ctx.lineTo(x1 - dir * 3, y + 6); ctx.closePath(); ctx.fill();
      k.text(ctx, String(Math.abs(S.wind)), cx + 46, y, { size: 16, weight: 900, color: '#fff' });
    }
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = i * PI / 5 - PI / 2; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.closePath();
  }
  function drawInset(k, ctx, S, g) {
    const bx = 724, by = 60, bw = 226, bh = 128, ch = bh - 24, fx = S.focus;
    if (fx - S.cam < VW - 120) return;
    // ממסגר את מה שעוד צריך לפגוע בו (כולל כל הדרך שמטרה או בלון זזים), והשורה של המרחק נשארת מתחת
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const o of S.objs) {
      if (!active(o)) continue;
      const top = o.k === 'T' ? o.base - o.amp - o.r - 6 : o.k === 'B' ? o.y - o.amp - o.r - 8 : o.gy - 150;
      const bot = o.k === 'B' ? o.y + o.amp + o.r + 40 : o.gy + 4;
      x0 = Math.min(x0, o.x - 55); x1 = Math.max(x1, o.x + 55); y0 = Math.min(y0, top); y1 = Math.max(y1, bot);
    }
    if (x1 < x0) { x0 = fx - 120; x1 = fx + 120; y0 = 300; y1 = G0; }
    const s = Math.min(0.62, bw / (x1 - x0), ch / (y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ctx.save();
    k.rr(ctx, bx - 3, by - 3, bw + 6, bh + 6, 12); ctx.fillStyle = 'rgba(8,16,30,.6)'; ctx.fill();
    k.rr(ctx, bx, by, bw, bh, 10); ctx.clip();
    const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#8fcbf5'); gr.addColorStop(1, '#dcf2ff');
    ctx.fillStyle = gr; ctx.fillRect(bx, by, bw, bh);
    ctx.translate(bx + bw / 2 - cx * s, by + ch / 2 - cy * s);
    ctx.scale(s, s);
    drawWorld(k, ctx, S, cx - bw / s / 2 - 20, cx + bw / s / 2 + 20, S.clock);
    ctx.restore();
    k.rr(ctx, bx, by, bw, bh, 10); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
    k.text(ctx, g.t('dist', { n: Math.round((fx - SHX) / M_PX) }), bx + bw / 2, by + bh - 12, { size: 14, weight: 900, color: '#fff', stroke: 'rgba(10,20,35,.75)', strokeW: 4 });
  }
  function drawScene(g, ctx, S, alpha) {
    const t = S.clock;
    drawSky(g, ctx, S);
    ctx.save(); ctx.translate(-S.cam, 0);
    drawWorld(g, ctx, S, S.cam - 20, S.cam + VW + 20, t);
    // שובל של החץ הקודם (לתיקון) וסימן איפה נחת
    if (S.phase === 'aim' && S.trace.length > 4) {
      ctx.save(); ctx.setLineDash([4, 7]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.moveTo(S.trace[0], S.trace[1]); for (let i = 2; i < S.trace.length; i += 2) ctx.lineTo(S.trace[i], S.trace[i + 1]); ctx.stroke(); ctx.restore();
    }
    const aiming = S.phase === 'aim' && !S.done;
    const draw = aiming ? S.aim.p / 100 : 0;
    drawArcher(g, ctx, S, S.phase === 'aim' || S.phase === 'hold' ? S.aim.a : S.aim.a, draw, aiming && S.arrows > 0, t);
    if (aiming && (S.drag || S.kb) && S.aim.p >= PMIN) drawGuide(g, ctx, S);
    if (S.fly) {
      const ar = S.fly, tr = ar.trail;
      for (let j = 0; j < tr.length; j += 2) { ctx.globalAlpha = (j + 2) / tr.length * 0.5; g.circle(ctx, tr[j], tr[j + 1], 1.5); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      const x = ar.x + ar.vx * DT * (alpha || 0), y = ar.y + ar.vy * DT * (alpha || 0), an = Math.atan2(ar.vy, ar.vx);
      drawArrow(g, ctx, x, y, an, ARROW_L);
      if (ar.apple) drawApple(g, ctx, x - Math.cos(an) * 10, y - Math.sin(an) * 10, 10);
    }
    for (const p of S.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.4)); ctx.fillStyle = p.col;
      if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 2 * PI); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (!g.demo) {
      drawHud(g, ctx, S, g);
      if (aiming) drawInset(g, ctx, S, g);
      if (aiming && S.shots === 0 && !S.drag && !S.kb && S.lv <= 2) {
        const u = (S.clock % 120) / 120, e = GK.U.ease.inOut(Math.min(1, u / 0.6));
        const hx = 260 - 80 * e, hy = 300 + 50 * e;
        ctx.globalAlpha = u < 0.85 ? 0.9 : (1 - u) / 0.15 * 0.9;
        g.circle(ctx, hx, hy, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#334'; ctx.stroke();
        ctx.globalAlpha = 1;
        g.text(ctx, g.t('drag'), 300, 250, { size: 24, color: '#fff', stroke: 'rgba(20,40,70,.7)', strokeW: 5 });
      }
      if (aiming && (S.drag || S.kb)) g.text(ctx, Math.round(S.aim.a) + '° · ' + Math.round(S.aim.p) + '%', SHX + 10, SHY - 70, { size: 16, weight: 900, color: '#fff', stroke: 'rgba(10,20,35,.7)', strokeW: 4 });
    }
  }

  // ================= טקסטים =================
  const TXT = {
    he: { title: 'קשת וחץ', help: ['גרור אחורה ושחרר כדי לירות — הכיוון קובע את הזווית, המרחק את הכוח', 'מקלדת: ↑ ↓ זווית, ← → כוח, רווח — ירייה', 'קלע למרכז המטרה: צהוב 10, אדום 8, כחול 6, שחור 4, לבן 2', 'פוצץ בלונים, ופגע בתפוח שעל הדחליל — לא בדחליל!', 'שים לב לרוח! יותר נקודות = יותר כוכבים'], helpTouch: ['גרור אחורה ושחרר כדי לירות — הכיוון קובע את הזווית, המרחק את הכוח', 'קלע למרכז המטרה: צהוב 10, אדום 8, כחול 6, שחור 4, לבן 2', 'פוצץ בלונים, ופגע בתפוח שעל הדחליל — לא בדחליל!', 'שים לב לרוח! יותר נקודות = יותר כוכבים'],
      arrows: 'חצים', wind: 'רוח', calm: 'אין רוח', bull: 'בול!', miss: 'החטאה', appleHit: 'תפוח!', hey: 'היי! לא אני!', lvl: 'שלב {n}', dist: '{n} מטר', pts: 'ניקוד: {n}', notEnough: 'לא מספיק נקודות', need: 'צריך {n} נקודות לכוכב אחד — השגת {m}', goalT: 'קלע למטרה!', goalB: 'פוצץ את כל הבלונים!', goalA: 'פגע בתפוח — לא בדחליל!', goalM: 'פגע בכל מה שאפשר!', drag: 'גרור אחורה ושחרר!', bonus: 'בונוס חצים +{n}', lastArrow: 'חץ אחרון!' },
    en: { title: 'Bow and Arrow', help: ['Drag back and let go to shoot — direction sets the angle, distance the power', 'Keyboard: ↑ ↓ angle, ← → power, Space — shoot', 'Hit the middle: yellow 10, red 8, blue 6, black 4, white 2', 'Pop the balloons, and hit the apple on the scarecrow — not the scarecrow!', 'Watch the wind! More points = more stars'], helpTouch: ['Drag back and let go to shoot — direction sets the angle, distance the power', 'Hit the middle: yellow 10, red 8, blue 6, black 4, white 2', 'Pop the balloons, and hit the apple on the scarecrow — not the scarecrow!', 'Watch the wind! More points = more stars'],
      arrows: 'Arrows', wind: 'Wind', calm: 'Calm', bull: 'Bullseye!', miss: 'Miss', appleHit: 'Apple!', hey: 'Hey! Not me!', lvl: 'Level {n}', dist: '{n} m', pts: 'Score: {n}', notEnough: 'Not enough points', need: 'You need {n} points for one star — you got {m}', goalT: 'Hit the target!', goalB: 'Pop all the balloons!', goalA: 'Hit the apple — not the scarecrow!', goalM: 'Hit everything you can!', drag: 'Drag back and let go!', bonus: 'Arrows left +{n}', lastArrow: 'Last arrow!' },
    ar: { title: 'القوس والسهم', help: ['اسحب للخلف واترك لتطلق — الاتجاه يحدد الزاوية والمسافة تحدد القوة', 'لوحة المفاتيح: ↑ ↓ الزاوية، ← → القوة، المسافة — إطلاق', 'أصب المنتصف: الأصفر 10، الأحمر 8، الأزرق 6، الأسود 4، الأبيض 2', 'فرقع البالونات، وأصب التفاحة فوق الفزاعة — لا الفزاعة!', 'انتبه للرياح! نقاط أكثر = نجوم أكثر'], helpTouch: ['اسحب للخلف واترك لتطلق — الاتجاه يحدد الزاوية والمسافة تحدد القوة', 'أصب المنتصف: الأصفر 10، الأحمر 8، الأزرق 6، الأسود 4، الأبيض 2', 'فرقع البالونات، وأصب التفاحة فوق الفزاعة — لا الفزاعة!', 'انتبه للرياح! نقاط أكثر = نجوم أكثر'],
      arrows: 'السهام', wind: 'الرياح', calm: 'لا رياح', bull: 'في المنتصف!', miss: 'خطأ', appleHit: 'التفاحة!', hey: 'هيه! ليس أنا!', lvl: 'المرحلة {n}', dist: '{n} م', pts: 'النقاط: {n}', notEnough: 'نقاط غير كافية', need: 'تحتاج {n} نقطة لنجمة واحدة — حصلت على {m}', goalT: 'أصب الهدف!', goalB: 'فرقع كل البالونات!', goalA: 'أصب التفاحة — لا الفزاعة!', goalM: 'أصب كل ما تستطيع!', drag: 'اسحب للخلف واترك!', bonus: 'سهام متبقية +{n}', lastArrow: 'آخر سهم!' },
    es: { title: 'Arco y Flecha', help: ['Arrastra hacia atrás y suelta para disparar: la dirección da el ángulo y la distancia la fuerza', 'Teclado: ↑ ↓ ángulo, ← → fuerza, Espacio — disparar', 'Dale al centro: amarillo 10, rojo 8, azul 6, negro 4, blanco 2', 'Revienta los globos y dale a la manzana del espantapájaros, ¡no al espantapájaros!', '¡Ojo con el viento! Más puntos = más estrellas'], helpTouch: ['Arrastra hacia atrás y suelta para disparar: la dirección da el ángulo y la distancia la fuerza', 'Dale al centro: amarillo 10, rojo 8, azul 6, negro 4, blanco 2', 'Revienta los globos y dale a la manzana del espantapájaros, ¡no al espantapájaros!', '¡Ojo con el viento! Más puntos = más estrellas'],
      arrows: 'Flechas', wind: 'Viento', calm: 'Sin viento', bull: '¡En el centro!', miss: 'Fallo', appleHit: '¡Manzana!', hey: '¡Eh! ¡Yo no!', lvl: 'Nivel {n}', dist: '{n} m', pts: 'Puntos: {n}', notEnough: 'No hay puntos suficientes', need: 'Necesitas {n} puntos para una estrella; tienes {m}', goalT: '¡Dale al blanco!', goalB: '¡Revienta todos los globos!', goalA: '¡Dale a la manzana, no al espantapájaros!', goalM: '¡Dale a todo lo que puedas!', drag: '¡Arrastra atrás y suelta!', bonus: 'Flechas sobrantes +{n}', lastArrow: '¡Última flecha!' },
    fr: { title: "L'Arc et la Flèche", help: ["Tire en arrière et lâche pour tirer : la direction donne l'angle, la distance la puissance", 'Clavier : ↑ ↓ angle, ← → puissance, Espace — tirer', 'Vise le centre : jaune 10, rouge 8, bleu 6, noir 4, blanc 2', "Éclate les ballons et touche la pomme sur l'épouvantail — pas l'épouvantail !", "Attention au vent ! Plus de points = plus d'étoiles"], helpTouch: ["Tire en arrière et lâche pour tirer : la direction donne l'angle, la distance la puissance", 'Vise le centre : jaune 10, rouge 8, bleu 6, noir 4, blanc 2', "Éclate les ballons et touche la pomme sur l'épouvantail — pas l'épouvantail !", "Attention au vent ! Plus de points = plus d'étoiles"],
      arrows: 'Flèches', wind: 'Vent', calm: 'Pas de vent', bull: 'En plein centre !', miss: 'Raté', appleHit: 'La pomme !', hey: 'Hé ! Pas moi !', lvl: 'Niveau {n}', dist: '{n} m', pts: 'Score : {n}', notEnough: 'Pas assez de points', need: 'Il faut {n} points pour une étoile — tu en as {m}', goalT: 'Touche la cible !', goalB: 'Éclate tous les ballons !', goalA: "Touche la pomme — pas l'épouvantail !", goalM: 'Touche tout ce que tu peux !', drag: 'Tire en arrière et lâche !', bonus: 'Flèches restantes +{n}', lastArrow: 'Dernière flèche !' },
    pt: { title: 'Arco e Flecha', help: ['Arraste para trás e solte para atirar: a direção define o ângulo e a distância a força', 'Teclado: ↑ ↓ ângulo, ← → força, Espaço — atirar', 'Acerte o centro: amarelo 10, vermelho 8, azul 6, preto 4, branco 2', 'Estoure os balões e acerte a maçã no espantalho — não o espantalho!', 'Cuidado com o vento! Mais pontos = mais estrelas'], helpTouch: ['Arraste para trás e solte para atirar: a direção define o ângulo e a distância a força', 'Acerte o centro: amarelo 10, vermelho 8, azul 6, preto 4, branco 2', 'Estoure os balões e acerte a maçã no espantalho — não o espantalho!', 'Cuidado com o vento! Mais pontos = mais estrelas'],
      arrows: 'Flechas', wind: 'Vento', calm: 'Sem vento', bull: 'Na mosca!', miss: 'Errou', appleHit: 'Maçã!', hey: 'Ei! Eu não!', lvl: 'Fase {n}', dist: '{n} m', pts: 'Pontos: {n}', notEnough: 'Pontos insuficientes', need: 'Você precisa de {n} pontos para uma estrela — fez {m}', goalT: 'Acerte o alvo!', goalB: 'Estoure todos os balões!', goalA: 'Acerte a maçã — não o espantalho!', goalM: 'Acerte tudo o que puder!', drag: 'Puxe para trás e solte!', bonus: 'Flechas de sobra +{n}', lastArrow: 'Última flecha!' },
    ru: { title: 'Лук и стрелы', help: ['Оттяни назад и отпусти, чтобы выстрелить: направление — угол, расстояние — сила', 'Клавиатура: ↑ ↓ угол, ← → сила, Пробел — выстрел', 'Попади в центр: жёлтый 10, красный 8, синий 6, чёрный 4, белый 2', 'Лопай шарики и сбей яблоко с пугала — но не попади в пугало!', 'Следи за ветром! Больше очков — больше звёзд'], helpTouch: ['Оттяни назад и отпусти, чтобы выстрелить: направление — угол, расстояние — сила', 'Попади в центр: жёлтый 10, красный 8, синий 6, чёрный 4, белый 2', 'Лопай шарики и сбей яблоко с пугала — но не попади в пугало!', 'Следи за ветром! Больше очков — больше звёзд'],
      arrows: 'Стрелы', wind: 'Ветер', calm: 'Штиль', bull: 'В яблочко!', miss: 'Мимо', appleHit: 'Яблоко!', hey: 'Эй! Не в меня!', lvl: 'Уровень {n}', dist: '{n} м', pts: 'Очки: {n}', notEnough: 'Не хватает очков', need: 'Нужно {n} очков для одной звезды — у тебя {m}', goalT: 'Попади в мишень!', goalB: 'Лопни все шарики!', goalA: 'Сбей яблоко — не попади в пугало!', goalM: 'Попади во всё, что сможешь!', drag: 'Оттяни и отпусти!', bonus: 'Оставшиеся стрелы +{n}', lastArrow: 'Последняя стрела!' },
    de: { title: 'Pfeil und Bogen', help: ['Zieh nach hinten und lass los zum Schießen – die Richtung gibt den Winkel, der Abstand die Kraft', 'Tastatur: ↑ ↓ Winkel, ← → Kraft, Leertaste — Schuss', 'Triff die Mitte: Gelb 10, Rot 8, Blau 6, Schwarz 4, Weiß 2', 'Lass die Ballons platzen und triff den Apfel auf der Vogelscheuche – nicht die Vogelscheuche!', 'Achte auf den Wind! Mehr Punkte = mehr Sterne'], helpTouch: ['Zieh nach hinten und lass los zum Schießen – die Richtung gibt den Winkel, der Abstand die Kraft', 'Triff die Mitte: Gelb 10, Rot 8, Blau 6, Schwarz 4, Weiß 2', 'Lass die Ballons platzen und triff den Apfel auf der Vogelscheuche – nicht die Vogelscheuche!', 'Achte auf den Wind! Mehr Punkte = mehr Sterne'],
      arrows: 'Pfeile', wind: 'Wind', calm: 'Windstill', bull: 'Ins Schwarze!', miss: 'Daneben', appleHit: 'Apfel!', hey: 'He! Nicht mich!', lvl: 'Level {n}', dist: '{n} m', pts: 'Punkte: {n}', notEnough: 'Nicht genug Punkte', need: 'Du brauchst {n} Punkte für einen Stern – du hast {m}', goalT: 'Triff die Zielscheibe!', goalB: 'Lass alle Ballons platzen!', goalA: 'Triff den Apfel – nicht die Vogelscheuche!', goalM: 'Triff alles, was du kannst!', drag: 'Zieh zurück und lass los!', bonus: 'Übrige Pfeile +{n}', lastArrow: 'Letzter Pfeil!' },
  };
  const goalKey = D => { const ks = new Set(D.items.map(o => o.k)); return ks.size > 1 ? 'goalM' : ks.has('B') ? 'goalB' : ks.has('A') ? 'goalA' : 'goalT'; };

  GK.register('archery', {
    w: VW, h: VH, bg: '#1d3b2a', accent: '#ffd166',
    levels: LEVELS.length,
    text: TXT,
    // לבדיקות: השלבים, הסימולציה והחיפוש — אותן פונקציות שהמשחק משתמש בהן
    test: { LEVELS, newState, bestShot, simShot, stepArrow, setAim, shoot, allDone, oY },

    init(g) {
      g.s = newState(g, g.demo ? 9 : g.level);
      const S = g.s;
      if (g.demo) { S.aim.a = 20; S.aim.p = 70; S.stuck.push({ o: S.objs[1], dx: 3, dy: -4, ang: 0.3, wob: 0 }, { o: S.objs[1], dx: 3, dy: 13, ang: 0.42, wob: 0 }); return; }
      g.msg(g.t('lvl', { n: g.level }) + ' · ' + g.t(goalKey(S.D)), 1500, '#ffd166');
      if (S.focus > VW - 140) S.intro = 1;
    },

    step(g) {
      const S = g.s;
      S.t++; S.clock++;
      if (S.flash > 0) S.flash--;
      for (const o of S.objs) { if (o.shake > 0) o.shake = Math.max(0, o.shake - 0.04); if (o.react > 0) o.react--; }
      for (const s of S.stuck) if (s.wob > 0) s.wob *= 0.93;
      // המצלמה
      let camT = 0;
      const maxCam = S.Wd - VW;
      if (S.phase === 'fly' && S.fly) camT = S.fly.x - 380;
      else if (S.phase === 'hold') camT = S.holdX - VW * 0.62;
      else if (S.intro > 0) {
        S.intro++;
        const ft = clamp(S.focus - VW * 0.6, 0, maxCam);
        camT = S.intro < 120 ? ft : 0;
        if (S.intro > 150) S.intro = 0;
      }
      camT = clamp(camT, 0, maxCam);
      S.cam += (camT - S.cam) * (S.phase === 'fly' ? 0.22 : S.intro ? 0.06 : 0.09);
      if (Math.abs(S.cam - camT) < 0.3) S.cam = camT;
      // שלבים
      if (S.phase === 'aim' && !S.done) keys(g, S);
      else if (S.phase === 'fly' && S.fly) {
        const ar = S.fly;
        const ev = stepArrow(S, ar, S.t);
        if (ar.t % 2 === 0) { ar.trail.push(ar.x, ar.y); if (ar.trail.length > 30) ar.trail.splice(0, 2); }
        if (ar.t % 3 === 0 && S.trace.length < 400) S.trace.push(ar.x, ar.y);
        if (ar.pops.length || ar.apple) onPops(g, S, ar);
        if (ev) { S.trace.push(ar.x, ar.y); onHit(g, S, ar, ev); }
      } else if (S.phase === 'hold') {
        if (++S.hold >= 60) {
          S.focus = focusX(S);
          if (S.arrows <= 0 || allDone(S)) finish(g, S);
          else S.phase = 'aim';
        }
      }
      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.98; p.rot += 0.15;
        if (--p.life <= 0) { S.parts[i] = S.parts[S.parts.length - 1]; S.parts.pop(); }
      }
      g.hud([[g.t('level'), S.lv], [g.t('arrows'), S.arrows + ' / ' + S.D.n, '#ffd166'], [g.t('score'), S.score]]);
    },

    idle(g) { const S = g.s; if (S) { S.clock++; S.t++; for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; if (--p.life <= 0) S.parts.splice(i, 1); } } },

    // בוט לבדיקות: מחשב את הירייה הכי טובה (גם זמן שחרור למטרה שזזה) ויורה דרך אותו כיוון וירייה
    bot(g) {
      const S = g.s;
      if (!S || S.phase !== 'aim' || S.done || S.arrows <= 0) return;
      if (!S.botPlan) { const b = bestShot(S); S.botPlan = { at: S.t + b.d, a: b.a, p: b.p }; }
      if (S.t < S.botPlan.at) return;
      setAim(S, S.botPlan.a, S.botPlan.p); S.kb = true;
      S.botPlan = null;
      shoot(g, S);
    },

    onKey(g, e) { if (e.code === 'KeyR' && g.s && !g.s.finished) g.start(g.level); },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S || S.done) return;
      if (type === 'down') {
        if (S.phase !== 'aim' || S.arrows <= 0) return;
        S.drag = { x: p.x, y: p.y, id: p.id, moved: false }; S.kb = false; S.intro = 0;
        setAim(S, S.aim.a, 0);
      } else if (type === 'move' && S.drag && S.drag.id === p.id) {
        const dx = p.x - S.drag.x, dy = p.y - S.drag.y, L = Math.hypot(dx, dy);
        if (L > 4) S.drag.moved = true;
        if (!S.drag.moved) return;
        const p0 = S.aim.p;
        setAim(S, Math.atan2(dy, -dx) / D2R, Math.min(1, L / PULL) * 100);
        if (Math.floor(p0 / 20) !== Math.floor(S.aim.p / 20)) g.tone({ f: 140 + S.aim.p * 2, f2: 170 + S.aim.p * 2, dur: 0.06, type: 'triangle', vol: 0.06 });
      } else if (type === 'up' && S.drag && S.drag.id === p.id) {
        const moved = S.drag.moved;
        S.drag = null;
        if (moved && S.aim.p >= PMIN) shoot(g, S);
      }
    },

    draw(g, ctx, alpha) { if (g.s) drawScene(g, ctx, g.s, alpha); },

    cover(ctx, w, h, k) {
      const S = newState({}, 9);
      S.cam = 0; S.clock = 40; S.t = 0;
      S.objs = mkObjs(LV(3, 0, [1, 2, 3], [T(545), B(650, 235), B(705, 158), B(758, 214), A(788)]));
      S.objs[1].col = '#ff5a6e'; S.objs[2].col = '#ffb02e'; S.objs[3].col = '#4fc3f7';
      S.stuck.push({ o: S.objs[0], dx: 3, dy: -3, ang: 0.18, wob: 0 }, { o: S.objs[0], dx: 3, dy: 12, ang: 0.3, wob: 0 });
      ctx.save();
      ctx.scale(w / VW * 1.18, h / VH * 1.18); ctx.translate(-30, -70);
      drawSky(k, ctx, S);
      drawWorld(k, ctx, S, -20, VW + 40, 40);
      S.arrows = 3;
      drawArcher(k, ctx, S, 14, 0.85, true, 40);
      // חץ באוויר עם שובל, בדרך לבלון האדום
      for (let i = 0; i < 12; i++) { const x = 175 + i * 28, u = x - 175; ctx.globalAlpha = 0.12 + i * 0.05; k.circle(ctx, x, 360 - u * 0.45 + u * u * 0.00045, 2); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      drawArrow(k, ctx, 530, 257, -0.13, ARROW_L);
      ctx.restore();
    },
  });
})();
