// ============================================================
//  תותח הפרות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  יורים פרה חמודה עם קסדה מתותח. היא קופצת על חציר וטרמפולינות, נתפסת בבלונים, נתקעת בבוץ
//  ואוספת מטבעות. אחרי כל שיגור קונים שדרוגים (נשמרים), ומגיעים לאסם, לטחנה... ועד הירח.
// ============================================================
(function () {
  'use strict';
  const VW = 960, VH = 540, HZ = 470;      // מסך; גובה הקרקע במסך כשהמצלמה למטה
  const PX = 10;                            // פיקסלים במטר
  const G = 900, DT = 1 / 60, R = 27, DRAG = 0.00008;
  const CAN = { x: 120, y: -30 }, BARREL = 80, START_X = 160;
  const AMIN = 12, AMAX = 78;
  const UPG = [
    { k: 'power', max: 5, cost: [40, 120, 280, 560, 1000] },
    { k: 'bounce', max: 5, cost: [30, 90, 220, 450, 850] },
    { k: 'wings', max: 3, cost: [180, 500, 1200] },
    { k: 'rocket', max: 4, cost: [220, 600, 1300, 2400] },
  ];
  const SPEED = L => 720 + 170 * L;                  // מהירות יציאה בכוח מלא
  const BOUNCE = L => 0.42 + 0.07 * L;               // כמה מהמהירות נשאר בקפיצה מהקרקע
  const LIFT = [0, 0.34, 0.54, 0.72];                 // כמה כוח משיכה הכנפיים מבטלות בירידה
  const FUEL = [0, 1.2, 2.0, 2.8, 3.6];              // שניות של רקטה
  const THRUST = 1700, TH_ANG = 28 * Math.PI / 180;
  const MILES = [
    { m: 100, k: 'barn', bonus: 30, icon: '🏚️' }, { m: 250, k: 'mill', bonus: 60, icon: '🌾' }, { m: 500, k: 'lake', bonus: 120, icon: '🦆' },
    { m: 900, k: 'castle', bonus: 250, icon: '🏰' }, { m: 1400, k: 'mount', bonus: 450, icon: '⛰️' }, { m: 2000, k: 'base', bonus: 800, icon: '🚀' },
    { m: 3000, k: 'moon', bonus: 1500, icon: '🌕' },
  ];
  const mX = m => START_X + m * PX;

  // ================= הטיסה (בלי ציור — גם לבדיקות) =================
  function newFlight(up, ang, pw, seed) {
    const r = ang * Math.PI / 180, v = SPEED(up.power) * pw;
    return {
      x: CAN.x + Math.cos(r) * BARREL, y: CAN.y - Math.sin(r) * BARREL, vx: Math.cos(r) * v, vy: -Math.sin(r) * v,
      t: 0, fuel: FUEL[up.rocket], fuel0: FUEL[up.rocket], ground: false, rest: 0, done: false, balloon: 0, coins: 0,
      objs: [], chunk: 900, rng: GK.U.seeded(seed), bounces: 0, mud: false, burn: false, ev: [], maxH: 0, up,
    };
  }
  function genChunk(F, x0) {
    const rnd = F.rng, W = 720, lim = F.t > 70;
    if (lim) return;
    const r = () => rnd();
    if (r() < 0.55) {   // קשת מטבעות
      const cx = x0 + 100 + r() * 480, cy = -110 - r() * 260, n = 5 + Math.floor(r() * 4), big = r() < 0.2;
      for (let i = 0; i < n; i++) { const u = i / (n - 1) - 0.5; F.objs.push({ t: 'coin', x: cx + u * 34 * n, y: cy + u * u * 120, v: big && i === Math.floor(n / 2) ? 5 : 1, got: false }); }
    }
    const pick = r();
    if (pick < 0.32) F.objs.push({ t: 'hay', x: x0 + 80 + r() * (W - 160), w: 74, h: 52, used: false });
    else if (pick < 0.5) F.objs.push({ t: 'tramp', x: x0 + 80 + r() * (W - 160), w: 86, h: 24, used: false });
    if (r() < 0.3) F.objs.push({ t: 'mud', x: x0 + 140 + r() * (W - 280), w: 140 + r() * 140 });
    if (r() < 0.26) F.objs.push({ t: 'ball', x: x0 + 100 + r() * (W - 200), y: -170 - r() * 280, used: false, n: 3 + Math.floor(r() * 3) });
    if (r() < 0.35) { const gx = x0 + 120 + r() * 400; for (let i = 0; i < 4; i++) F.objs.push({ t: 'coin', x: gx + i * 34, y: -R, v: 1, got: false }); }
  }
  function fStep(F, thrust) {
    if (F.done) return;
    const up = F.up;
    F.t += DT;
    while (F.chunk < F.x + 2200) { genChunk(F, F.chunk); F.chunk += 720; }
    if (F.objs.length > 60) F.objs = F.objs.filter(o => o.x + (o.w || 0) > F.x - 1400);
    let ax = 0, ay = G;
    const sp = Math.hypot(F.vx, F.vy);
    ax -= DRAG * F.vx * sp; ay -= DRAG * F.vy * sp;
    F.burn = false;
    if (F.balloon > 0) {
      F.balloon -= DT;
      ay = 0; F.vy += (-170 - F.vy) * 0.06; F.vx *= 0.997;
      if (F.balloon <= 0) { F.ev.push({ t: 'unballoon' }); F.vy -= 120; }
    } else if (thrust && F.fuel > 0) {
      F.fuel = Math.max(0, F.fuel - DT); F.burn = true;
      ax += Math.cos(TH_ANG) * THRUST; ay -= Math.sin(TH_ANG) * THRUST;
      if (F.ground) { F.ground = false; F.vy = Math.min(F.vy, -200); }
    }
    if (up.wings && !F.ground && F.vy > 0 && F.balloon <= 0) ay -= G * LIFT[up.wings] * Math.min(1, Math.max(0, F.vx) / 650);
    if (F.t > 80) { F.vx *= 0.97; }                      // ביטחון: אף שיגור לא נמשך לנצח
    F.vx += ax * DT; F.vy += ay * DT;
    F.x += F.vx * DT; F.y += F.vy * DT;
    if (-F.y > F.maxH) F.maxH = -F.y;
    // בוץ
    F.mud = false;
    for (const o of F.objs) if (o.t === 'mud' && F.x > o.x - o.w / 2 && F.x < o.x + o.w / 2) F.mud = true;
    // חפצים
    for (const o of F.objs) {
      if (o.t === 'coin') {
        if (!o.got && Math.abs(o.x - F.x) < R + 14 && Math.abs(o.y - F.y) < R + 14 && Math.hypot(o.x - F.x, o.y - F.y) < R + 13) { o.got = true; F.coins += o.v; F.ev.push({ t: 'coin', o }); }
      } else if (o.t === 'hay' || o.t === 'tramp') {
        if (o.used || F.x + R * 0.8 < o.x - o.w / 2 || F.x - R * 0.8 > o.x + o.w / 2 || F.y + R < -o.h) continue;
        o.used = true; F.ground = false; F.bounces++;
        if (o.t === 'hay') { F.vy = -Math.max(Math.abs(F.vy) * 0.9, 560); F.vx = Math.max(F.vx, 260) * 1.06; }
        else { F.vy = -Math.max(Math.abs(F.vy) * 1.02, 780); F.vx = Math.max(F.vx * 1.04, 300); }
        F.y = Math.min(F.y, -o.h - R);
        F.ev.push({ t: o.t, o });
      } else if (o.t === 'ball') {
        if (!o.used && F.balloon <= 0 && Math.hypot(o.x - F.x, o.y + 30 - F.y) < R + 34) { o.used = true; F.balloon = 2.4; F.ev.push({ t: 'balloon', o }); }
      }
    }
    // קרקע
    if (F.y > -R) {
      F.y = -R;
      if (F.vy > 0) {
        const e = BOUNCE(up.bounce) * (F.mud ? 0.3 : 1), out = F.vy * e;
        if (out > 90) { F.vy = -out; F.vx *= F.mud ? 0.6 : 0.9; F.bounces++; F.ev.push({ t: 'bounce', v: out, mud: F.mud }); }
        else { if (F.vy > 60) F.ev.push({ t: 'land', mud: F.mud }); F.vy = 0; F.ground = true; }
      }
    }
    if (F.ground) {
      F.vy = 0;
      const fr = (F.mud ? 2600 : 560) * DT;
      F.vx = Math.abs(F.vx) <= fr ? 0 : F.vx - Math.sign(F.vx) * fr;
      if (Math.abs(F.vx) < 8) { if (++F.rest >= 15) { F.done = true; F.vx = 0; F.ev.push({ t: 'rest' }); } }
      else F.rest = 0;
    }
  }
  const meters = F => Math.max(0, Math.floor((F.x - START_X) / PX));

  // ================= מצב המשחק =================
  function loadUp(g) {
    const u = g.load('up', null) || {};
    const up = {};
    for (const U of UPG) up[U.k] = Math.max(0, Math.min(U.max, +u[U.k] || 0));
    return up;
  }
  function newState(g) {
    return {
      phase: 'aim', ang: 42, meter: 0, mt: 0, aiming: false, F: null, up: loadUp(g), bank: Math.max(0, +g.load('bank', 0) || 0),
      miles: g.load('miles', []) || [], camX: 0, camY: 0, parts: [], clock: 0, cow: { rot: 0, vr: 0, blink: 0, sq: 0 }, endT: 0,
      thrustPtr: false, seed: (Math.random() * 1e9) >>> 0, passed: 0, hover: -1,
    };
  }
  function buy(g, i) {
    const S = g.s, U = UPG[i], L = S.up[U.k];
    if (S.phase !== 'aim') return;
    if (L >= U.max) { g.sfx('error'); return; }
    const c = U.cost[L];
    if (S.bank < c) { g.sfx('error'); g.msg(g.t('need', { n: c - S.bank }), 900, '#ffb4a2'); return; }
    S.bank -= c; S.up[U.k] = L + 1;
    g.save('bank', S.bank); g.save('up', S.up);
    g.sfx('power');
    const cr = cardRect(i);
    g.burst(cr.x + cr.w / 2, cr.y + cr.h / 2, { n: 20, color: ['#ffd84d', '#fff3b0', '#7be07b'], speed: 4, life: 36 });
  }
  function fire(g) {
    const S = g.s;
    if (S.phase !== 'aim') return;
    const pw = 0.6 + 0.4 * S.meter;
    S.F = newFlight(S.up, S.ang, pw, S.seed);
    S.phase = 'fly'; S.passed = 0; S.pw = pw;
    S.cow.vr = 3.5;
    g.sfx('boom'); g.shake(10);
    const r = S.ang * Math.PI / 180, mx = CAN.x + Math.cos(r) * (BARREL + 10), my = CAN.y - Math.sin(r) * (BARREL + 10);
    for (let i = 0; i < 18; i++) puff(S, mx, my, Math.cos(r) * 2 + (Math.random() - 0.5) * 3, -Math.sin(r) * 2 + (Math.random() - 0.5) * 3, '#e9e4dc', 26 + Math.random() * 20);
    for (let i = 0; i < 12; i++) spark(S, mx, my, Math.cos(r) * 6 + (Math.random() - 0.5) * 4, -Math.sin(r) * 6 + (Math.random() - 0.5) * 4, i % 2 ? '#ffd84d' : '#ff8c42');
    g.msg(g.t('moo'), 700, '#ffffff');
  }
  function puff(S, x, y, vx, vy, col, life) { if (S.parts.length < 320) S.parts.push({ x, y, vx, vy, life, max: life, s: 8 + Math.random() * 8, col, k: 'puff' }); }
  function spark(S, x, y, vx, vy, col) { if (S.parts.length < 320) S.parts.push({ x, y, vx, vy, life: 26, max: 26, s: 3 + Math.random() * 3, col, k: 'spark' }); }
  function onEvents(g, S) {
    const F = S.F;
    for (const e of F.ev) {
      if (e.t === 'coin') { g.sfx('coin', { p: e.o.v > 1 ? 0.8 : 1 + Math.random() * 0.2 }); for (let i = 0; i < 6; i++) spark(S, e.o.x, e.o.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#ffd84d'); if (e.o.v > 1) worldFloat(S, e.o.x, e.o.y - 20, '+' + e.o.v, '#ffe066'); }
      else if (e.t === 'hay') { g.sfx('bounce', { p: 0.8 }); g.noise({ filter: 'bandpass', f: 1800, f2: 600, dur: 0.18, vol: 0.12 }); for (let i = 0; i < 16; i++) spark(S, e.o.x + (Math.random() - 0.5) * 60, -40, (Math.random() - 0.5) * 7, -Math.random() * 6, i % 2 ? '#f2d16b' : '#d9a93b'); S.cow.vr += 8; worldFloat(S, F.x, F.y - 40, g.t('boing'), '#fff3b0'); }
      else if (e.t === 'tramp') { g.sfx('jump', { p: 0.7 }); g.tone({ f: 300, f2: 900, dur: 0.25, type: 'sine', vol: 0.15 }); e.o.wob = 1; S.cow.vr += 10; worldFloat(S, F.x, F.y - 40, g.t('boing'), '#b8f0ff'); g.shake(4); }
      else if (e.t === 'balloon') { g.sfx('pop', { p: 1.4 }); worldFloat(S, F.x, F.y - 50, g.t('upup'), '#ffb3d9'); }
      else if (e.t === 'unballoon') { g.sfx('pop'); g.sfx('pop', { p: 1.3 }); for (let i = 0; i < 14; i++) spark(S, F.x, F.y - 70, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, ['#ff5c8a', '#5cc8ff', '#ffd84d'][i % 3]); }
      else if (e.t === 'bounce') { g.sfx('bounce', { p: 0.7 + Math.min(0.6, e.v / 2000) }); S.cow.sq = 1; S.cow.vr = -S.cow.vr * 0.5 + F.vx / 160; for (let i = 0; i < 10; i++) puff(S, F.x + (Math.random() - 0.5) * 30, -6, (Math.random() - 0.5) * 3, -Math.random() * 1.5, e.mud ? '#7a5230' : '#cdb48a', 22); if (e.mud) g.sfx('splash'); if (e.v > 500) g.shake(5); }
      else if (e.t === 'land') { g.sfx(e.mud ? 'splash' : 'place'); S.cow.sq = 0.8; }
      else if (e.t === 'rest') { g.tone({ f: 220, f2: 160, dur: 0.5, type: 'sawtooth', vol: 0.08 }); g.tone({ f: 180, f2: 130, dur: 0.6, type: 'triangle', vol: 0.12, delay: 0.12 }); }
    }
    F.ev.length = 0;
  }
  function worldFloat(S, x, y, txt, col) { if (S.parts.length < 320) S.parts.push({ x, y, vx: 0, vy: -1.2, life: 60, max: 60, txt, col, k: 'txt' }); }

  // ================= ציור =================
  const cardRect = i => ({ x: 98 + i * 194, y: 12, w: 180, h: 94 });
  function drawCow(k, ctx, x, y, rot, o) {
    o = o || {};
    const u = R;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    const sq = o.sq || 0;
    ctx.scale(1 + sq * 0.18, 1 - sq * 0.16);
    const leg = o.legs || 0;
    // כנפיים מאחור
    if (o.wings) {
      const fl = Math.sin(o.flap || 0) * 0.5;
      for (const s of [1, 0.75]) {
        ctx.save(); ctx.translate(-u * 0.2, -u * 0.55); ctx.rotate(-0.6 - fl * s); ctx.scale(s, s);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-u * 1.1, -u * 1.5, -u * 2.0, -u * 1.1); ctx.quadraticCurveTo(-u * 1.5, -u * 0.6, -u * 1.75, -u * 0.25); ctx.quadraticCurveTo(-u * 1.1, -u * 0.2, -u * 1.25, u * 0.1); ctx.quadraticCurveTo(-u * 0.6, u * 0.05, 0, 0);
        ctx.fillStyle = s === 1 ? '#ffffff' : '#e3ecf7'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#9fb3c8'; ctx.stroke();
        ctx.restore();
      }
    }
    // רקטה על הגב
    if (o.rocket) {
      ctx.save(); ctx.translate(-u * 0.55, -u * 0.62);
      k.rr(ctx, -u * 0.95, -u * 0.22, u * 1.25, u * 0.44, u * 0.2); ctx.fillStyle = '#e8edf2'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a8796'; ctx.stroke();
      ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(u * 0.3, -u * 0.22); ctx.quadraticCurveTo(u * 0.62, 0, u * 0.3, u * 0.22); ctx.fill();
      ctx.fillStyle = '#ff5a4f'; ctx.fillRect(-u * 0.55, -u * 0.22, u * 0.16, u * 0.44);
      if (o.flame) {
        const fl = 0.8 + Math.random() * 0.5;
        const gr = ctx.createLinearGradient(-u * 0.95, 0, -u * (0.95 + 1.3 * fl), 0);
        gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.4, '#ffb52e'); gr.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-u * 0.95, -u * 0.18); ctx.quadraticCurveTo(-u * (0.95 + 1.4 * fl), 0, -u * 0.95, u * 0.18); ctx.fill();
      }
      ctx.restore();
    }
    // רגליים
    ctx.lineCap = 'round';
    const legs = [[-0.75, 0.55], [-0.35, 0.65], [0.35, 0.65], [0.75, 0.55]];
    legs.forEach(([lx, ly], i) => {
      const sw = Math.sin(leg + i * 1.7) * 0.5;
      const ex = lx * u + Math.sin(sw) * u * 0.55, ey = ly * u + Math.cos(sw) * u * 0.55;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = u * 0.32;
      ctx.beginPath(); ctx.moveTo(lx * u, ly * u - u * 0.1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#3a3a46'; ctx.lineWidth = u * 0.3;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.sin(sw) * 2, ey + u * 0.08); ctx.stroke();
    });
    // זנב
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = u * 0.1;
    ctx.beginPath(); ctx.moveTo(-u * 1.15, -u * 0.2); ctx.quadraticCurveTo(-u * 1.6, -u * 0.3 + Math.sin(leg * 2) * u * 0.2, -u * 1.55, u * 0.25); ctx.stroke();
    ctx.fillStyle = '#3a3a46'; k.circle(ctx, -u * 1.55, u * 0.28, u * 0.13); ctx.fill();
    // גוף
    ctx.beginPath(); ctx.ellipse(0, 0, u * 1.25, u * 0.82, 0, 0, Math.PI * 2);
    const gb = ctx.createRadialGradient(-u * 0.3, -u * 0.5, u * 0.2, 0, 0, u * 1.3);
    gb.addColorStop(0, '#ffffff'); gb.addColorStop(1, '#dfe4ea');
    ctx.fillStyle = gb; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a3a46'; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#2f2f3a';
    ctx.beginPath(); ctx.ellipse(-u * 0.55, -u * 0.35, u * 0.42, u * 0.3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(u * 0.3, u * 0.35, u * 0.36, u * 0.26, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-u * 1.05, u * 0.35, u * 0.3, u * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // ראש
    const hx = u * 1.1, hy = -u * 0.42;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(hx - u * 0.48, hy - u * 0.12, u * 0.26, u * 0.13, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a3a46'; ctx.stroke();
    k.circle(ctx, hx, hy, u * 0.6);
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a3a46'; ctx.stroke();
    ctx.fillStyle = '#2f2f3a'; ctx.beginPath(); ctx.ellipse(hx - u * 0.18, hy - u * 0.05, u * 0.2, u * 0.26, 0.3, 0, Math.PI * 2); ctx.fill();
    // אף
    ctx.beginPath(); ctx.ellipse(hx + u * 0.38, hy + u * 0.22, u * 0.36, u * 0.27, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb3c4'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c96b84'; ctx.stroke();
    ctx.fillStyle = '#b8506c';
    k.circle(ctx, hx + u * 0.28, hy + u * 0.22, u * 0.06); ctx.fill(); k.circle(ctx, hx + u * 0.5, hy + u * 0.22, u * 0.06); ctx.fill();
    // עיניים
    for (const [ex, ey] of [[hx + u * 0.02, hy - u * 0.2], [hx + u * 0.3, hy - u * 0.24]]) {
      if (o.dizzy) {
        ctx.strokeStyle = '#2f2f3a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); for (let a = 0; a < 12; a++) { const rr = a * 0.011 * u; ctx.lineTo(ex + Math.cos(a * 1.1 + (o.t || 0) * 6) * rr, ey + Math.sin(a * 1.1 + (o.t || 0) * 6) * rr); } ctx.stroke();
      } else if (o.blink) { ctx.strokeStyle = '#2f2f3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - u * 0.1, ey); ctx.lineTo(ex + u * 0.1, ey); ctx.stroke(); }
      else {
        k.circle(ctx, ex, ey, u * (o.wide ? 0.17 : 0.14)); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#2f2f3a'; ctx.stroke();
        k.circle(ctx, ex + u * 0.04, ey, u * 0.075); ctx.fillStyle = '#1d1d26'; ctx.fill();
        k.circle(ctx, ex + u * 0.06, ey - u * 0.03, u * 0.025); ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
    // קסדה
    ctx.save(); ctx.translate(hx - u * 0.02, hy - u * 0.28); ctx.rotate(-0.15);
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.62, u * 0.46, 0, Math.PI, 0); ctx.closePath();
    const gh = ctx.createLinearGradient(0, -u * 0.46, 0, 0); gh.addColorStop(0, '#ff6b5e'); gh.addColorStop(1, '#d6372b');
    ctx.fillStyle = gh; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#8e1f17'; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-u * 0.08, -u * 0.45, u * 0.16, u * 0.45);
    ctx.fillStyle = '#ffd84d'; k.rr(ctx, -u * 0.7, -u * 0.06, u * 1.4, u * 0.12, u * 0.06); ctx.fill();
    // קרניים מבצבצות
    ctx.fillStyle = '#fff1c9'; ctx.strokeStyle = '#a8905a'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * u * 0.5, -u * 0.12); ctx.quadraticCurveTo(s * u * 0.8, -u * 0.3, s * u * 0.78, -u * 0.5); ctx.quadraticCurveTo(s * u * 0.6, -u * 0.3, s * u * 0.38, -u * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function drawCannon(k, ctx, x, y, ang, o) {
    o = o || {};
    const r = -ang * Math.PI / 180;
    ctx.save(); ctx.translate(x, y);
    // קנה
    ctx.save(); ctx.rotate(r);
    const gb = ctx.createLinearGradient(0, -22, 0, 22);
    gb.addColorStop(0, '#6c7a8c'); gb.addColorStop(0.45, '#3b4656'); gb.addColorStop(1, '#202833');
    k.rr(ctx, -30, -21, BARREL + 30, 42, 14); ctx.fillStyle = gb; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#151b23'; ctx.stroke();
    ctx.fillStyle = '#ffd84d'; ctx.fillRect(10, -21, 8, 42); ctx.fillRect(BARREL - 32, -21, 6, 42);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-24, -16, BARREL + 14, 6);
    if (o.cow) {   // הפרה מציצה מפי התותח
      ctx.save(); ctx.beginPath(); ctx.rect(BARREL - 2, -70, 90, 140); ctx.clip();
      drawCow(k, ctx, BARREL - 2, 8, 0.05, { blink: o.blink, legs: 0 });
      ctx.restore();
    }
    k.rr(ctx, BARREL - 14, -26, 22, 52, 8); ctx.fillStyle = '#2a3340'; ctx.fill(); ctx.stroke();
    k.rr(ctx, BARREL - 4, -19, 6, 38, 3); ctx.fillStyle = '#10151c'; ctx.fill();
    ctx.restore();
    // עגלה וגלגלים
    ctx.fillStyle = '#8a5528'; ctx.strokeStyle = '#4e2e12'; ctx.lineWidth = 2.5;
    k.rr(ctx, -46, 6, 92, 22, 8); ctx.fill(); ctx.stroke();
    for (const wx of [-30, 30]) {
      k.circle(ctx, wx, 24, 22); ctx.fillStyle = '#6b3f1d'; ctx.fill(); ctx.stroke();
      k.circle(ctx, wx, 24, 15); ctx.fillStyle = '#a0632e'; ctx.fill();
      ctx.strokeStyle = '#4e2e12'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + (o.wheel || 0); ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 15, 24 - Math.sin(a) * 15); ctx.lineTo(wx + Math.cos(a) * 15, 24 + Math.sin(a) * 15); ctx.stroke(); }
      k.circle(ctx, wx, 24, 5); ctx.fillStyle = '#ffd84d'; ctx.fill();
      ctx.lineWidth = 2.5;
    }
    ctx.restore();
  }
  function drawSky(k, ctx, alt, clock, camX) {
    const t = Math.min(1, alt / 3200);
    const gr = ctx.createLinearGradient(0, 0, 0, VH);
    const mix = (a, b) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; };
    gr.addColorStop(0, mix('#4aa8f0', '#0b1440')); gr.addColorStop(0.7, mix('#a8dcff', '#24357a')); gr.addColorStop(1, mix('#e3f5ff', '#3b4f9e'));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    if (t > 0.2) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) { ctx.globalAlpha = (t - 0.2) * (0.4 + (i % 5) * 0.12); const sx = ((i * 137 - camX * 0.02) % VW + VW) % VW, sy = (i * 71) % VH; ctx.fillRect(sx, sy, 2, 2); }
      ctx.globalAlpha = 1;
    }
    // שמש
    k.circle(ctx, VW * 0.82, VH * 0.18 + alt * 0.02, 34); ctx.fillStyle = 'rgba(255,246,190,.95)'; ctx.fill();
    k.circle(ctx, VW * 0.82, VH * 0.18 + alt * 0.02, 52); ctx.fillStyle = 'rgba(255,240,170,.25)'; ctx.fill();
  }
  function hillLayer(ctx, camX, camY, par, base, amp, f, col, col2) {
    const off = camX * par, y0 = HZ - camY * par * 0.6;
    ctx.beginPath(); ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 16) { const wx = x + off; ctx.lineTo(x, y0 - base - Math.sin(wx * f) * amp - Math.sin(wx * f * 2.7 + 1.3) * amp * 0.4); }
    ctx.lineTo(VW, VH); ctx.closePath();
    const gr = ctx.createLinearGradient(0, y0 - base - amp, 0, y0); gr.addColorStop(0, col); gr.addColorStop(1, col2);
    ctx.fillStyle = gr; ctx.fill();
  }
  function drawClouds(k, ctx, camX, camY, clock) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 7; i++) {
      const span = VW + 400, cw = 90 + (i % 3) * 40;
      const cx = ((i * 331 - camX * 0.25 + clock * 0.2) % span + span) % span - 200;
      const cy = 60 + (i * 97) % 240 - camY * 0.25;
      if (cy < -80 || cy > VH + 40) continue;
      for (const [dx, dy, r] of [[0, 0, 0.3], [0.25, -0.12, 0.26], [0.5, 0, 0.28], [0.25, 0.06, 0.32]]) { k.circle(ctx, cx + dx * cw, cy + dy * cw, r * cw * 0.65); ctx.fill(); }
    }
  }
  function drawLandmark(k, g, ctx, M, sx, gy, clock) {
    ctx.save(); ctx.translate(sx, gy);
    if (M.k === 'barn') {
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-90, -110, 180, 110);
      ctx.beginPath(); ctx.moveTo(-105, -105); ctx.lineTo(0, -175); ctx.lineTo(105, -105); ctx.closePath(); ctx.fillStyle = '#8e2a20'; ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-36, -76, 72, 76); ctx.fillStyle = '#c0392b'; ctx.fillRect(-30, -70, 60, 70);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-30, -70); ctx.lineTo(30, 0); ctx.moveTo(30, -70); ctx.lineTo(-30, 0); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-14, -140, 28, 24);
    } else if (M.k === 'mill') {
      ctx.fillStyle = '#e8d3a8'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-26, -170); ctx.lineTo(26, -170); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5528'; ctx.beginPath(); ctx.moveTo(-32, -168); ctx.lineTo(0, -205); ctx.lineTo(32, -168); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b3f1d'; ctx.fillRect(-12, -40, 24, 40);
      ctx.save(); ctx.translate(0, -165); ctx.rotate(clock * 0.03);
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#f7f1e3'; ctx.fillRect(6, -10, 100, 20); ctx.strokeStyle = '#8a5528'; ctx.lineWidth = 2; ctx.strokeRect(6, -10, 100, 20); }
      k.circle(ctx, 0, 0, 9); ctx.fillStyle = '#6b3f1d'; ctx.fill();
      ctx.restore();
    } else if (M.k === 'lake') {
      ctx.fillStyle = '#4fb3e8'; ctx.beginPath(); ctx.ellipse(0, 4, 260, 26, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 80 - 20 + Math.sin(clock * 0.05 + i) * 6, -10, 40, 3);
      for (const dx of [-80, 60]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(dx, -14, 18, 11, 0, 0, Math.PI * 2); ctx.fill(); k.circle(ctx, dx + 14, -26, 8); ctx.fill(); ctx.fillStyle = '#ffb52e'; ctx.beginPath(); ctx.moveTo(dx + 21, -27); ctx.lineTo(dx + 30, -25); ctx.lineTo(dx + 21, -23); ctx.fill(); ctx.fillStyle = '#222'; k.circle(ctx, dx + 16, -28, 1.8); ctx.fill(); }
    } else if (M.k === 'castle') {
      ctx.fillStyle = '#9aa4b1';
      ctx.fillRect(-120, -120, 240, 120); ctx.fillRect(-150, -180, 60, 180); ctx.fillRect(90, -180, 60, 180);
      for (let i = 0; i < 6; i++) ctx.fillRect(-120 + i * 44, -136, 22, 16);
      for (const tx of [-150, 90]) for (let i = 0; i < 3; i++) ctx.fillRect(tx + i * 22, -196, 14, 16);
      ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -60); ctx.arc(0, -60, 30, Math.PI, 0); ctx.lineTo(30, 0); ctx.fill();
      for (const tx of [-120, 120]) { ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, -196); ctx.lineTo(tx, -240); ctx.stroke(); ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(tx, -240); ctx.lineTo(tx + 34 + Math.sin(clock * 0.1) * 4, -230); ctx.lineTo(tx, -220); ctx.fill(); }
    } else if (M.k === 'mount') {
      for (const [dx, h, w, c] of [[-160, 260, 220, '#7d8ba3'], [110, 330, 260, '#6a7891'], [0, 200, 180, '#8b98ae']]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(dx - w, 0); ctx.lineTo(dx, -h); ctx.lineTo(dx + w, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(dx - w * 0.28, -h * 0.72); ctx.lineTo(dx, -h); ctx.lineTo(dx + w * 0.28, -h * 0.72); ctx.lineTo(dx + w * 0.1, -h * 0.66); ctx.lineTo(dx - w * 0.06, -h * 0.74); ctx.closePath(); ctx.fill();
      }
    } else if (M.k === 'base') {
      ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-60, -230); ctx.moveTo(-90, 0); ctx.lineTo(-90, -230); ctx.stroke();
      ctx.lineWidth = 3; for (let y = 0; y > -230; y -= 30) { ctx.beginPath(); ctx.moveTo(-90, y); ctx.lineTo(-60, y - 30); ctx.stroke(); }
      ctx.fillStyle = '#f2f4f7'; k.rr(ctx, -40, -240, 56, 240, 26); ctx.fill();
      ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(-40, -200); ctx.quadraticCurveTo(-12, -290, 16, -200); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4fb3e8'; k.circle(ctx, -12, -150, 12); ctx.fill();
      ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(-62, 0); ctx.lineTo(-40, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(16, -40); ctx.lineTo(38, 0); ctx.lineTo(16, 0); ctx.fill();
    } else if (M.k === 'moon') {
      const gr = ctx.createRadialGradient(-60, -300, 40, 0, -220, 260);
      gr.addColorStop(0, '#fffbe6'); gr.addColorStop(1, '#d9d2b8');
      k.circle(ctx, 0, -220, 240); ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = 'rgba(150,140,110,.35)';
      for (const [cx, cy, r] of [[-80, -300, 40], [60, -200, 55], [-20, -120, 30], [100, -330, 25], [-130, -180, 22]]) { k.circle(ctx, cx, cy, r); ctx.fill(); }
    }
    if (M.nosign) { ctx.restore(); return; }
    // שלט
    const lab = M.icon + ' ' + g.t(M.k) + ' · ' + g.t('meters', { n: M.m });
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(-4, -46, 8, 46);
    ctx.font = '800 16px Heebo, Arial, sans-serif';
    const tw = Math.min(260, ctx.measureText(lab).width + 24);
    k.rr(ctx, -tw / 2, -78, tw, 32, 8); ctx.fillStyle = '#c98a4b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a22'; ctx.stroke();
    g.text(ctx, lab, 0, -62, { size: 16, color: '#fff', maxW: tw - 12, stroke: 'rgba(80,40,10,.6)', strokeW: 3 });
    ctx.restore();
  }
  function drawObj(k, ctx, o, sx, gy, clock) {
    if (o.t === 'coin') {
      if (o.got) return;
      const sy = gy + o.y, sc = Math.abs(Math.cos(clock * 0.06 + o.x * 0.01));
      const r = o.v > 1 ? 17 : 12;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(Math.max(0.25, sc), 1);
      k.circle(ctx, 0, 0, r); ctx.fillStyle = o.v > 1 ? '#ffb31a' : '#ffd84d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b8860b'; ctx.stroke();
      k.circle(ctx, 0, 0, r * 0.6); ctx.strokeStyle = 'rgba(184,134,11,.7)'; ctx.stroke();
      ctx.restore();
    } else if (o.t === 'hay') {
      const h = o.used ? o.h * 0.55 : o.h;
      ctx.save(); ctx.translate(sx, gy);
      k.rr(ctx, -o.w / 2, -h, o.w, h, 10);
      const gr = ctx.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, '#f6d77a'); gr.addColorStop(1, '#c99a2e');
      ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#9a7320'; ctx.stroke();
      ctx.strokeStyle = 'rgba(154,115,32,.6)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-o.w / 2 + 6, -h + h * i / 5); ctx.lineTo(o.w / 2 - 6, -h + h * i / 5 + 2); ctx.stroke(); }
      ctx.fillStyle = '#b5482f'; ctx.fillRect(-o.w / 2 + 14, -h, 6, h); ctx.fillRect(o.w / 2 - 20, -h, 6, h);
      ctx.restore();
    } else if (o.t === 'tramp') {
      const wob = o.wob ? Math.sin(clock * 0.8) * 9 * o.wob : 0, hw = o.w / 2, top = -o.h;
      ctx.save(); ctx.translate(sx, gy);
      ctx.strokeStyle = '#2b3542'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const lx of [-hw + 10, hw - 10]) { ctx.beginPath(); ctx.moveTo(lx, top + 4); ctx.lineTo(lx + Math.sign(lx) * 8, 0); ctx.stroke(); }
      ctx.strokeStyle = '#9aa6b4'; ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) { const x = -hw + 8 + i * (o.w - 16) / 6; ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(x + (k % 2 ? 3 : -3), top - 2 + k * 1.2); ctx.stroke(); }
      ctx.fillStyle = '#20262e';
      ctx.beginPath(); ctx.moveTo(-hw + 6, top); ctx.quadraticCurveTo(0, top + 8 + wob, hw - 6, top); ctx.lineTo(hw - 6, top - 4); ctx.quadraticCurveTo(0, top + 3 + wob, -hw + 6, top - 4); ctx.closePath(); ctx.fill();
      k.rr(ctx, -hw - 2, top - 7, 16, 9, 4); ctx.fillStyle = '#ff5a4f'; ctx.fill();
      k.rr(ctx, hw - 14, top - 7, 16, 9, 4); ctx.fillStyle = '#4fc3f7'; ctx.fill();
      ctx.restore();
    } else if (o.t === 'mud') {
      ctx.save(); ctx.translate(sx, gy);
      ctx.fillStyle = '#6b4424'; ctx.beginPath(); ctx.ellipse(0, 2, o.w / 2, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(-o.w * 0.1, -1, o.w * 0.32, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(o.w * 0.2, -2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (o.t === 'ball') {
      if (o.used) return;
      ctx.save(); ctx.translate(sx, gy + o.y + Math.sin(clock * 0.05 + o.x) * 6);
      const cols = ['#ff5c8a', '#5cc8ff', '#ffd84d', '#9be870', '#c08cff'];
      ctx.strokeStyle = 'rgba(80,80,90,.7)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < o.n; i++) { const bx = (i - (o.n - 1) / 2) * 20, by = -30 - (i % 2) * 14; ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(bx * 0.5, 0, bx, by + 18); ctx.stroke(); }
      for (let i = 0; i < o.n; i++) {
        const bx = (i - (o.n - 1) / 2) * 20, by = -30 - (i % 2) * 14;
        ctx.beginPath(); ctx.ellipse(bx, by, 15, 18, 0, 0, Math.PI * 2); ctx.fillStyle = cols[i % cols.length]; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(bx - 5, by - 6, 4, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawWorld(g, ctx, S) {
    const F = S.F, camX = S.camX, camY = S.camY, gy = HZ - camY, clock = S.clock;
    drawSky(g, ctx, Math.max(0, -camY), clock, camX);
    drawClouds(g, ctx, camX, camY, clock);
    hillLayer(ctx, camX, camY, 0.12, 120, 40, 0.004, '#a9cfe0', '#9cc6d8');
    hillLayer(ctx, camX, camY, 0.3, 60, 30, 0.007, '#9fd28e', '#86c27a');
    // ציוני דרך
    for (const M of MILES) { const sx = mX(M.m) - camX; if (sx > -360 && sx < VW + 360) drawLandmark(g, g, ctx, M, sx, gy, clock); }
    // קרקע
    if (gy < VH + 30) {
      let gr = ctx.createLinearGradient(0, gy, 0, gy + 80);
      gr.addColorStop(0, '#5aa83c'); gr.addColorStop(0.18, '#4a8f31'); gr.addColorStop(0.2, '#8a5a32'); gr.addColorStop(1, '#5e3b1f');
      ctx.fillStyle = gr; ctx.fillRect(0, gy, VW, Math.max(0, VH - gy) + 2);
      ctx.fillStyle = '#7ed957';
      const off = ((camX % 28) + 28) % 28;
      for (let x = -off; x < VW; x += 28) { ctx.beginPath(); ctx.moveTo(x, gy + 1); ctx.lineTo(x + 6, gy - 7); ctx.lineTo(x + 12, gy + 1); ctx.fill(); }
      // גדר ושלטי מרחק
      const f0 = Math.floor(camX / 160) * 160;
      ctx.strokeStyle = '#a0632e'; ctx.lineWidth = 4;
      for (let x = f0; x < camX + VW + 160; x += 160) { const sx = x - camX + 40; ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 34); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, gy - 26); ctx.lineTo(VW, gy - 26); ctx.moveTo(0, gy - 12); ctx.lineTo(VW, gy - 12); ctx.stroke();
      const m0 = Math.floor((camX - START_X) / (50 * PX));
      for (let i = m0; i < m0 + 4; i++) {
        if (i <= 0 || MILES.some(M => M.m === i * 50)) continue;
        const sx = START_X + i * 50 * PX - camX;
        if (sx < -40 || sx > VW + 40) continue;
        ctx.fillStyle = '#6b3f1d'; ctx.fillRect(sx - 3, gy - 46, 6, 46);
        g.rr(ctx, sx - 30, gy - 66, 60, 24, 6); ctx.fillStyle = '#f7f1e3'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6b3f1d'; ctx.stroke();
        g.text(ctx, g.t('meters', { n: i * 50 }), sx, gy - 54, { size: 14, color: '#4e2e12', maxW: 54 });
      }
    }
    // חפצים
    if (F) for (const o of F.objs) { const sx = o.x - camX; if (sx > -160 && sx < VW + 160) drawObj(g, ctx, o, sx, gy, clock); }
    // תותח
    const cx = CAN.x - camX;
    if (cx > -200) drawCannon(g, ctx, cx, CAN.y + gy, S.ang, { cow: S.phase === 'aim', blink: (clock % 170) < 8 });
    // חלקיקים (בעולם)
    for (const p of S.parts) {
      const sx = p.x - camX, sy = p.y + gy, a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      if (p.k === 'txt') { g.text(ctx, p.txt, sx, sy, { size: 22, color: p.col, stroke: 'rgba(0,0,0,.5)', strokeW: 4, alpha: a }); continue; }
      ctx.globalAlpha = p.k === 'puff' ? a * 0.7 : a;
      g.circle(ctx, sx, sy, p.k === 'puff' ? p.s * (1.6 - p.life / p.max * 0.6) : p.s); ctx.fillStyle = p.col; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // הפרה
    if (F) {
      const sx = F.x - camX, sy = F.y + gy;
      if (F.balloon > 0) {   // בלונים מעליה
        const cols = ['#ff5c8a', '#5cc8ff', '#ffd84d'];
        ctx.strokeStyle = 'rgba(80,80,90,.7)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + (i - 1) * 18, sy - 62); ctx.stroke(); }
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(sx + (i - 1) * 18, sy - 76 - (i % 2) * 10, 14, 17, 0, 0, Math.PI * 2); ctx.fillStyle = cols[i]; ctx.fill(); }
      }
      if (sy < -30) {   // הפרה גבוה מעל המסך: חץ
        g.rr(ctx, sx - 34, 8, 68, 30, 10); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
        g.text(ctx, '▲ ' + Math.floor(-F.y / PX), sx, 23, { size: 16, color: '#fff' });
      }
      drawCow(g, ctx, sx, sy, S.cow.rot, { sq: S.cow.sq, legs: F.done ? 0 : clock * 0.4, wings: S.up.wings > 0, flap: clock * (F.vy > 0 && !F.ground ? 0.5 : 0.15), rocket: S.up.rocket > 0, flame: F.burn, wide: !F.done, dizzy: F.done, t: clock / 60, blink: false });
      if (F.done) {   // כוכבי סחרחורת
        for (let i = 0; i < 3; i++) { const a = clock * 0.08 + i * 2.1; ctx.fillStyle = '#ffd84d'; ctx.font = '16px sans-serif'; g.text(ctx, '★', sx + Math.cos(a) * 26 + 18, sy - 34 + Math.sin(a) * 7, { size: 16, color: '#ffd84d' }); }
      }
    }
  }
  function drawShop(g, ctx, S) {
    const names = ['power', 'bounce', 'wings', 'rocket'];
    UPG.forEach((U, i) => {
      const c = cardRect(i), L = S.up[U.k], maxed = L >= U.max, cost = maxed ? 0 : U.cost[L], can = !maxed && S.bank >= cost;
      const hov = S.hover === i;
      g.rr(ctx, c.x, c.y, c.w, c.h, 14);
      ctx.fillStyle = can ? (hov ? 'rgba(44,98,46,.97)' : 'rgba(28,70,36,.95)') : 'rgba(18,30,48,.93)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = can ? '#7be07b' : maxed ? '#ffd166' : 'rgba(255,255,255,.25)'; ctx.stroke();
      drawIcon(g, ctx, i, c.x + 30, c.y + 34);
      g.text(ctx, g.t(names[i]), c.x + 108, c.y + 22, { size: 15, color: '#fff', maxW: c.w - 64 });
      for (let p = 0; p < U.max; p++) { g.rr(ctx, c.x + 62 + p * ((c.w - 74) / U.max), c.y + 40, (c.w - 74) / U.max - 4, 9, 4); ctx.fillStyle = p < L ? '#7be07b' : 'rgba(255,255,255,.18)'; ctx.fill(); }
      const label = maxed ? g.t('max') : '🪙 ' + cost;
      g.text(ctx, label, c.x + c.w / 2, c.y + 72, { size: 18, color: maxed ? '#ffd166' : can ? '#ffe066' : '#c7cdd6' });
      if (!g.touch) g.text(ctx, String(i + 1), c.x + c.w - 12, c.y + c.h - 12, { size: 12, color: 'rgba(255,255,255,.45)' });
    });
  }
  function drawIcon(k, ctx, i, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (i === 0) { ctx.rotate(-0.5); k.rr(ctx, -16, -8, 34, 16, 6); ctx.fillStyle = '#aab6c4'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.fillStyle = '#ffd84d'; ctx.fillRect(-8, -8, 4, 16); ctx.rotate(0.5); k.circle(ctx, -6, 10, 7); ctx.fillStyle = '#d08a4a'; ctx.fill(); ctx.strokeStyle = '#ffe2b8'; ctx.stroke(); }
    else if (i === 1) { ctx.strokeStyle = '#7fe0ff'; ctx.lineWidth = 4; ctx.beginPath(); for (let a = 0; a <= 1; a += 0.05) ctx.lineTo(Math.sin(a * Math.PI * 6) * 10, 14 - a * 28); ctx.stroke(); }
    else if (i === 2) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-14, 8); ctx.quadraticCurveTo(-10, -16, 16, -14); ctx.quadraticCurveTo(6, -6, 10, 0); ctx.quadraticCurveTo(0, 2, 2, 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#9fb3c8'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { k.rr(ctx, -6, -16, 12, 26, 6); ctx.fillStyle = '#e8edf2'; ctx.fill(); ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.quadraticCurveTo(0, -24, 6, -10); ctx.fill(); ctx.fillStyle = '#ffb52e'; ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(0, 20); ctx.lineTo(5, 10); ctx.fill(); }
    ctx.restore();
  }

  const TXT = {
    he: { title: 'תותח הפרות', help: ['כוון את התותח עם העכבר או החצים', 'לחץ או רווח כשמד הכוח מלא — והפרה עפה!', 'קפוץ על חציר וטרמפולינות, תפוס בלונים ואסוף מטבעות. היזהר מבוץ', 'אחרי כל שיגור קנה שדרוגים: עוצמה, קפיציות, כנפיים ורקטה (רווח באוויר)', 'הגע לאסם, לטחנה... ועד הירח!'], helpTouch: ['גרור כדי לכוון ושחרר כשמד הכוח מלא', 'קפוץ על חציר וטרמפולינות, תפוס בלונים ואסוף מטבעות. היזהר מבוץ', 'אחרי כל שיגור קנה שדרוגים. עם רקטה — החזק את המסך באוויר', 'הגע לאסם, לטחנה... ועד הירח!'], power: 'עוצמת תותח', bounce: 'קפיציות', wings: 'כנפי ריחוף', rocket: 'דלק רקטה', max: 'מקסימום', distance: 'מרחק', meters: '{n} מ׳', coins: 'מטבעות', fuel: 'דלק', earned: 'הרווחת {n} מטבעות', need: 'חסרים עוד {n} מטבעות', barn: 'האסם', mill: 'טחנת הרוח', lake: 'האגם', castle: 'הטירה', mount: 'ההרים', base: 'בסיס החלל', moon: 'הירח', boing: 'בוינג!', upup: 'למעלה!', next: 'היעד הבא: {name}', landed: 'הפרה נחתה!', moo: 'מווו!', aimHint: 'לחץ כשהמד מלא!', flyHint: 'החזק רווח — רקטה!', flyHintT: 'החזק את המסך — רקטה!' },
    en: { title: 'Cow Cannon', help: ['Aim the cannon with the mouse or the arrows', 'Click or press Space when the power meter is full — and the cow flies!', 'Bounce on hay and trampolines, grab balloons, collect coins. Avoid the mud', 'After each launch buy upgrades: power, bounce, wings and a rocket (Space in the air)', 'Reach the barn, the windmill… all the way to the moon!'], helpTouch: ['Drag to aim and let go when the power meter is full', 'Bounce on hay and trampolines, grab balloons, collect coins. Avoid the mud', 'After each launch buy upgrades. With a rocket, hold the screen in the air', 'Reach the barn, the windmill… all the way to the moon!'], power: 'Cannon power', bounce: 'Bounciness', wings: 'Glide wings', rocket: 'Rocket fuel', max: 'MAX', distance: 'Distance', meters: '{n} m', coins: 'Coins', fuel: 'Fuel', earned: 'You earned {n} coins', need: '{n} more coins needed', barn: 'The barn', mill: 'The windmill', lake: 'The lake', castle: 'The castle', mount: 'The mountains', base: 'The space base', moon: 'The moon', boing: 'Boing!', upup: 'Up, up!', next: 'Next goal: {name}', landed: 'The cow landed!', moo: 'Moo!', aimHint: 'Click when the meter is full!', flyHint: 'Hold Space — rocket!', flyHintT: 'Hold the screen — rocket!' },
    ar: { title: 'مدفع البقر', help: ['صوّب المدفع بالفأرة أو بالأسهم', 'انقر أو اضغط المسافة عندما يمتلئ مؤشر القوة — فتطير البقرة!', 'اقفز على القش والترامبولين، أمسك البالونات واجمع العملات. احذر الوحل', 'بعد كل إطلاق اشترِ ترقيات: القوة، النطاطية، الأجنحة والصاروخ (المسافة في الهواء)', 'صِل إلى الحظيرة والطاحونة… وحتى القمر!'], helpTouch: ['اسحب للتصويب واترك عندما يمتلئ مؤشر القوة', 'اقفز على القش والترامبولين، أمسك البالونات واجمع العملات. احذر الوحل', 'بعد كل إطلاق اشترِ ترقيات. مع الصاروخ، اضغط مطولاً على الشاشة في الهواء', 'صِل إلى الحظيرة والطاحونة… وحتى القمر!'], power: 'قوة المدفع', bounce: 'النطاطية', wings: 'أجنحة الطيران', rocket: 'وقود الصاروخ', max: 'الأقصى', distance: 'المسافة', meters: '{n} م', coins: 'العملات', fuel: 'الوقود', earned: 'ربحت {n} عملة', need: 'تحتاج {n} عملة أخرى', barn: 'الحظيرة', mill: 'طاحونة الهواء', lake: 'البحيرة', castle: 'القلعة', mount: 'الجبال', base: 'قاعدة الفضاء', moon: 'القمر', boing: 'بوينغ!', upup: 'إلى الأعلى!', next: 'الهدف التالي: {name}', landed: 'هبطت البقرة!', moo: 'مووو!', aimHint: 'انقر عندما يمتلئ المؤشر!', flyHint: 'اضغط المسافة مطولاً — صاروخ!', flyHintT: 'اضغط مطولاً — صاروخ!' },
    es: { title: 'El Cañón de Vacas', help: ['Apunta el cañón con el ratón o las flechas', 'Haz clic o pulsa Espacio cuando el medidor esté lleno: ¡la vaca vuela!', 'Rebota en heno y camas elásticas, atrapa globos y junta monedas. Evita el barro', 'Tras cada lanzamiento compra mejoras: potencia, rebote, alas y cohete (Espacio en el aire)', '¡Llega al granero, al molino… y hasta la luna!'], helpTouch: ['Arrastra para apuntar y suelta cuando el medidor esté lleno', 'Rebota en heno y camas elásticas, atrapa globos y junta monedas. Evita el barro', 'Tras cada lanzamiento compra mejoras. Con cohete, mantén pulsada la pantalla en el aire', '¡Llega al granero, al molino… y hasta la luna!'], power: 'Potencia', bounce: 'Rebote', wings: 'Alas planeadoras', rocket: 'Combustible', max: 'MÁX', distance: 'Distancia', meters: '{n} m', coins: 'Monedas', fuel: 'Combustible', earned: 'Ganaste {n} monedas', need: 'Faltan {n} monedas', barn: 'El granero', mill: 'El molino', lake: 'El lago', castle: 'El castillo', mount: 'Las montañas', base: 'La base espacial', moon: 'La luna', boing: '¡Boing!', upup: '¡Arriba!', next: 'Próxima meta: {name}', landed: '¡La vaca aterrizó!', moo: '¡Muuu!', aimHint: '¡Clic con el medidor lleno!', flyHint: '¡Mantén Espacio: cohete!', flyHintT: '¡Mantén pulsado: cohete!' },
    fr: { title: 'Le Canon à Vaches', help: ['Vise avec la souris ou les flèches', "Clique ou appuie sur Espace quand la jauge est pleine : la vache s'envole !", 'Rebondis sur le foin et les trampolines, attrape des ballons, ramasse des pièces. Évite la boue', "Après chaque tir, achète des améliorations : puissance, rebond, ailes et fusée (Espace en l'air)", "Atteins la grange, le moulin… jusqu'à la lune !"], helpTouch: ['Glisse pour viser et lâche quand la jauge est pleine', 'Rebondis sur le foin et les trampolines, attrape des ballons, ramasse des pièces. Évite la boue', "Après chaque tir, achète des améliorations. Avec la fusée, garde le doigt sur l'écran en l'air", "Atteins la grange, le moulin… jusqu'à la lune !"], power: 'Puissance', bounce: 'Rebond', wings: 'Ailes planantes', rocket: 'Carburant fusée', max: 'MAX', distance: 'Distance', meters: '{n} m', coins: 'Pièces', fuel: 'Carburant', earned: 'Tu as gagné {n} pièces', need: 'Il manque {n} pièces', barn: 'La grange', mill: 'Le moulin', lake: 'Le lac', castle: 'Le château', mount: 'Les montagnes', base: 'La base spatiale', moon: 'La lune', boing: 'Boing !', upup: 'Hop, en haut !', next: 'Prochain but : {name}', landed: 'La vache a atterri !', moo: 'Meuh !', aimHint: 'Clique quand la jauge est pleine !', flyHint: 'Maintiens Espace : fusée !', flyHintT: 'Garde le doigt : fusée !' },
    pt: { title: 'Canhão de Vacas', help: ['Mire o canhão com o mouse ou as setas', 'Clique ou aperte Espaço quando o medidor encher — e a vaca voa!', 'Quique no feno e nas camas elásticas, pegue balões e moedas. Fuja da lama', 'Depois de cada lançamento compre melhorias: força, quique, asas e foguete (Espaço no ar)', 'Chegue ao celeiro, ao moinho… até a lua!'], helpTouch: ['Arraste para mirar e solte quando o medidor encher', 'Quique no feno e nas camas elásticas, pegue balões e moedas. Fuja da lama', 'Depois de cada lançamento compre melhorias. Com foguete, segure a tela no ar', 'Chegue ao celeiro, ao moinho… até a lua!'], power: 'Força do canhão', bounce: 'Quique', wings: 'Asas de planar', rocket: 'Combustível', max: 'MÁX', distance: 'Distância', meters: '{n} m', coins: 'Moedas', fuel: 'Combustível', earned: 'Você ganhou {n} moedas', need: 'Faltam {n} moedas', barn: 'O celeiro', mill: 'O moinho', lake: 'O lago', castle: 'O castelo', mount: 'As montanhas', base: 'A base espacial', moon: 'A lua', boing: 'Boing!', upup: 'Para cima!', next: 'Próxima meta: {name}', landed: 'A vaca pousou!', moo: 'Muuu!', aimHint: 'Clique com o medidor cheio!', flyHint: 'Segure Espaço — foguete!', flyHintT: 'Segure a tela — foguete!' },
    ru: { title: 'Коровья пушка', help: ['Наводи пушку мышью или стрелками', 'Жми кнопку мыши или Пробел, когда шкала полна, — и корова летит!', 'Отскакивай от сена и батутов, хватай шарики, собирай монеты. Берегись грязи', 'После выстрела покупай улучшения: мощь, прыгучесть, крылья и ракету (Пробел в воздухе)', 'Долети до амбара, мельницы… и до самой Луны!'], helpTouch: ['Веди пальцем, чтобы целиться, и отпусти, когда шкала полна', 'Отскакивай от сена и батутов, хватай шарики, собирай монеты. Берегись грязи', 'После выстрела покупай улучшения. С ракетой держи палец на экране в воздухе', 'Долети до амбара, мельницы… и до самой Луны!'], power: 'Мощь пушки', bounce: 'Прыгучесть', wings: 'Крылья', rocket: 'Топливо ракеты', max: 'МАКС', distance: 'Дальность', meters: '{n} м', coins: 'Монеты', fuel: 'Топливо', earned: 'Заработано монет: {n}', need: 'Не хватает монет: {n}', barn: 'Амбар', mill: 'Мельница', lake: 'Озеро', castle: 'Замок', mount: 'Горы', base: 'Космодром', moon: 'Луна', boing: 'Бойнг!', upup: 'Вверх!', next: 'Следующая цель: {name}', landed: 'Корова приземлилась!', moo: 'Мууу!', aimHint: 'Жми, когда шкала полна!', flyHint: 'Держи Пробел — ракета!', flyHintT: 'Держи палец — ракета!' },
    de: { title: 'Kuhkanone', help: ['Ziel mit der Maus oder den Pfeiltasten', 'Klick oder drück die Leertaste, wenn die Anzeige voll ist – und die Kuh fliegt!', 'Hüpf auf Heu und Trampoline, schnapp Ballons, sammle Münzen. Vorsicht vor Schlamm', 'Kauf nach jedem Schuss Upgrades: Kraft, Sprung, Flügel und Rakete (Leertaste in der Luft)', 'Erreiche die Scheune, die Mühle … bis zum Mond!'], helpTouch: ['Zieh zum Zielen und lass los, wenn die Anzeige voll ist', 'Hüpf auf Heu und Trampoline, schnapp Ballons, sammle Münzen. Vorsicht vor Schlamm', 'Kauf nach jedem Schuss Upgrades. Mit Rakete den Finger in der Luft auf dem Bildschirm halten', 'Erreiche die Scheune, die Mühle … bis zum Mond!'], power: 'Kanonenkraft', bounce: 'Sprungkraft', wings: 'Gleitflügel', rocket: 'Raketensprit', max: 'MAX', distance: 'Weite', meters: '{n} m', coins: 'Münzen', fuel: 'Sprit', earned: '{n} Münzen verdient', need: 'Es fehlen {n} Münzen', barn: 'Die Scheune', mill: 'Die Windmühle', lake: 'Der See', castle: 'Die Burg', mount: 'Die Berge', base: 'Der Raumhafen', moon: 'Der Mond', boing: 'Boing!', upup: 'Hoch hinaus!', next: 'Nächstes Ziel: {name}', landed: 'Die Kuh ist gelandet!', moo: 'Muuh!', aimHint: 'Klick, wenn die Anzeige voll ist!', flyHint: 'Leertaste halten – Rakete!', flyHintT: 'Finger halten – Rakete!' },
  };

  GK.register('cow-cannon', {
    w: VW, h: VH, bg: '#1f4f7a', accent: '#ffd166',
    fmt: (v, g) => g.t('meters', { n: v }),
    touch: null,
    text: TXT,
    sim: { newFlight, step: fStep, meters, UPG, SPEED, FUEL, MILES, PX },

    init(g) {
      g.s = newState(g);
    },

    step(g) {
      const S = g.s;
      S.clock++;
      if (S.phase === 'aim') {
        S.mt += DT;
        S.meter = 0.5 - 0.5 * Math.cos(S.mt * Math.PI / 0.75);          // 0→1→0 כל 1.5 שניות
        if (g.key('ArrowUp') || g.key('KeyW')) S.ang = Math.min(AMAX, S.ang + 0.8);
        if (g.key('ArrowDown') || g.key('KeyS')) S.ang = Math.max(AMIN, S.ang - 0.8);
        for (let i = 0; i < 4; i++) if (g.hit('Digit' + (i + 1))) buy(g, i);
        if (g.hit('Space') || g.hit('Enter')) fire(g);
        if (S.meter > 0.985 && !S.ding) { S.ding = true; g.sfx('tick', { p: 1.6 }); } else if (S.meter < 0.9) S.ding = false;
        S.camX += (0 - S.camX) * 0.2; S.camY += (0 - S.camY) * 0.2;
      } else if (S.phase === 'fly') {
        const F = S.F;
        const thrust = g.key('Space') || g.key('ArrowUp') || g.key('KeyW') || S.thrustPtr || S.botThrust;
        fStep(F, thrust);
        onEvents(g, S);
        if (F.burn) { S.burnSnd = (S.burnSnd || 0) + 1; if (S.burnSnd % 6 === 1) g.noise({ filter: 'lowpass', f: 900, f2: 400, dur: 0.12, vol: 0.12 }); for (let i = 0; i < 2; i++) puff(S, F.x - Math.cos(S.cow.rot) * 30, F.y - 10, -3 - Math.random() * 2, 1 + Math.random(), i ? '#ffb52e' : '#d8d8d8', 18); }
        // סיבוב הפרה
        const c = S.cow;
        if (F.done) c.rot += (0 - c.rot) * 0.15;
        else if (F.ground) c.rot += F.vx / R * DT * 0.6;
        else { c.rot += c.vr * DT; c.vr *= 0.985; c.rot += (Math.atan2(F.vy, Math.max(80, F.vx)) * 0.5 - c.rot) * 0.03; }
        c.sq *= 0.85;
        // ציוני דרך
        const m = meters(F);
        for (const M of MILES) if (m >= M.m && S.passed < M.m) {
          S.passed = M.m;
          const first = !S.miles.includes(M.k);
          g.msg(M.icon + ' ' + g.t(M.k) + '!', 1400, '#ffe066');
          g.sfx('score');
          if (first) { S.miles.push(M.k); g.save('miles', S.miles); F.coins += M.bonus; worldFloat(S, F.x, F.y - 60, '+' + M.bonus + ' 🪙', '#ffe066'); g.sfx('record'); }
        }
        // מצלמה
        const tx = Math.max(0, F.x - 330), ty = Math.min(0, F.y + 300);
        S.camX += (tx - S.camX) * 0.18; S.camY += (ty - S.camY) * 0.12;
        if (F.done) {
          if (++S.endT === 50) {
            const earned = F.coins + Math.floor(m / 4);
            S.bank += earned; g.save('bank', S.bank);
            g.score = m;
            g.end({ score: m, scoreLabel: g.t('distance'), title: g.t('landed'), text: g.t('earned', { n: earned }) + ' · 🪙 ' + S.bank });
          }
        }
      }
      for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.x += p.vx; p.y += p.vy; if (p.k === 'spark') p.vy += 0.2; else if (p.k === 'puff') { p.vx *= 0.94; p.vy *= 0.94; } if (--p.life <= 0) { S.parts[i] = S.parts[S.parts.length - 1]; S.parts.pop(); } }
      if (S.F) for (const o of S.F.objs) if (o.wob) o.wob *= 0.94;
      const F = S.F;
      const hud = [[g.t('coins'), '🪙 ' + (S.bank + (F && S.phase === 'fly' ? F.coins : 0))]];
      if (F) hud.unshift([g.t('distance'), g.t('meters', { n: meters(F) })]);
      if (F && S.up.rocket) hud.push([g.t('fuel'), Math.round(F.fuel / F.fuel0 * 100) + '%', F.fuel > 0 ? '#ffb52e' : '#888']);
      const b = g.getBest();
      hud.push([g.t('best'), b === null ? '—' : g.t('meters', { n: b })]);
      g.hud(hud);
    },

    idle(g) { g.s.clock++; },

    bot(g) {
      const S = g.s;
      if (S.phase === 'aim') {
        // קונה את השדרוג הזול ביותר שאפשר, ואז יורה בזווית טובה כשהמד כמעט מלא
        let best = -1, bc = 1e9;
        UPG.forEach((U, i) => { const L = S.up[U.k]; if (L < U.max && U.cost[L] <= S.bank && U.cost[L] < bc) { bc = U.cost[L]; best = i; } });
        if (best >= 0) { buy(g, best); return; }
        S.ang = 40;
        if (S.meter > 0.96) fire(g);
      } else if (S.phase === 'fly') {
        const F = S.F;
        S.botThrust = F.fuel > 0 && F.vy > -100 && F.balloon <= 0;
      }
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (S.phase === 'aim') {
        let hov = -1;
        for (let i = 0; i < 4; i++) { const c = cardRect(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) hov = i; }
        S.hover = hov;
        if (type === 'down') { if (hov >= 0) { buy(g, hov); S.aiming = false; return; } S.aiming = true; }
        if ((type === 'move' && hov < 0 && (p.kind === 'mouse' || p.down)) || (type === 'down' && hov < 0)) {
          const dx = p.x - (CAN.x - S.camX), dy = (CAN.y + HZ - S.camY) - p.y;
          if (dx > 4) S.ang = Math.max(AMIN, Math.min(AMAX, Math.atan2(dy, dx) * 180 / Math.PI));
        }
        if (type === 'up' && S.aiming) { S.aiming = false; fire(g); }
      } else if (S.phase === 'fly') {
        if (type === 'down') S.thrustPtr = true;
        else if (type === 'up') S.thrustPtr = false;
      }
    },

    draw(g, ctx) {
      const S = g.s;
      drawWorld(g, ctx, S);
      if (S.phase === 'aim') {
        if (!g.demo) drawShop(g, ctx, S);
        // מד כוח
        const mx = CAN.x - S.camX - 92, my = HZ - S.camY - 190, mh = 150;
        g.rr(ctx, mx - 4, my - 4, 30, mh + 8, 10); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
        const gr = ctx.createLinearGradient(0, my + mh, 0, my); gr.addColorStop(0, '#7be07b'); gr.addColorStop(0.6, '#ffd166'); gr.addColorStop(1, '#ff5a4f');
        g.rr(ctx, mx, my + mh * (1 - S.meter), 22, mh * S.meter, 7); ctx.fillStyle = gr; ctx.fill();
        if (S.meter > 0.95) { g.rr(ctx, mx - 4, my - 4, 30, mh + 8, 10); ctx.lineWidth = 3; ctx.strokeStyle = '#fff6b0'; ctx.stroke(); }
        // קו כיוון קצר
        const r = S.ang * Math.PI / 180, ox = CAN.x - S.camX + Math.cos(r) * (BARREL + 20), oy = CAN.y + HZ - S.camY - Math.sin(r) * (BARREL + 20);
        for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.85 - i * 0.12; g.circle(ctx, ox + Math.cos(r) * i * 22, oy - Math.sin(r) * i * 22, 4); ctx.fillStyle = '#fff'; ctx.fill(); }
        ctx.globalAlpha = 1;
        if (!g.demo) {
          // היעד הבא
          const nx = MILES.find(M => !S.miles.includes(M.k));
          if (nx) g.text(ctx, g.t('next', { name: nx.icon + ' ' + g.t(nx.k) + ' (' + g.t('meters', { n: nx.m }) + ')' }), VW / 2 + 120, 132, { size: 17, color: '#ffffff', stroke: 'rgba(10,30,60,.65)', strokeW: 4 });
          g.text(ctx, g.t('aimHint'), CAN.x + 150, HZ - 250, { size: 18, color: '#fff6b0', stroke: 'rgba(10,30,60,.65)', strokeW: 4, alpha: 0.6 + 0.4 * S.meter });
        }
      } else if (S.phase === 'fly' && S.up.rocket && S.F && S.F.fuel > 0 && S.F.t < 2.5 && !S.F.burn) {
        g.text(ctx, g.t(g.touch ? 'flyHintT' : 'flyHint'), VW / 2, 150, { size: 22, color: '#ffe066', stroke: 'rgba(0,0,0,.55)', strokeW: 5 });
      }
    },

    cover(ctx, w, h, k) {
      ctx.save();
      ctx.scale(w / VW, h / VH);
      drawSky(k, ctx, 0, 30, 0);
      drawClouds(k, ctx, 0, 0, 30);
      hillLayer(ctx, 0, 0, 0.12, 120, 40, 0.004, '#a9cfe0', '#9cc6d8');
      hillLayer(ctx, 0, 0, 0.3, 60, 30, 0.007, '#9fd28e', '#86c27a');
      ctx.save(); ctx.translate(800, HZ); ctx.scale(0.8, 0.8); ctx.translate(-800, -HZ);
      drawLandmark(k, k, ctx, { k: 'barn', icon: '', m: 0, nosign: true }, 800, HZ, 0);
      ctx.restore();
      let gr = ctx.createLinearGradient(0, HZ, 0, HZ + 80);
      gr.addColorStop(0, '#5aa83c'); gr.addColorStop(0.18, '#4a8f31'); gr.addColorStop(0.2, '#8a5a32'); gr.addColorStop(1, '#5e3b1f');
      ctx.fillStyle = gr; ctx.fillRect(0, HZ, VW, VH - HZ);
      drawObj(k, ctx, { t: 'hay', w: 74, h: 52, used: false }, 640, HZ, 0);
      drawObj(k, ctx, { t: 'tramp', w: 86, h: 24 }, 470, HZ, 0);
      for (let i = 0; i < 5; i++) drawObj(k, ctx, { t: 'coin', x: 0, y: -330 + (i - 2) * (i - 2) * 9, v: 1 }, 540 + i * 40, HZ, 0);
      drawObj(k, ctx, { t: 'ball', x: 1, y: -330, n: 4 }, 760, HZ, 0);
      drawCannon(k, ctx, 130, HZ - 30, 38, {});
      // שובל עשן
      for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.15 + i * 0.07; k.circle(ctx, 220 + i * 22, 390 - i * 22 + i * i * 0.4, 8 + i); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(410, 220); ctx.scale(1.9, 1.9);
      drawCow(k, ctx, 0, 0, -0.35, { legs: 1.2, wings: true, flap: 0.6, wide: true });
      ctx.restore();
      gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    },
  });
})();
