// ============================================================
//  כדורגל ראשים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שני שחקנים עם ראש ענק קופצים, נוגחים ובועטים. נגד המחשב (3 רמות) או 2 שחקנים על מקלדת אחת.
//  משחק של 90 שניות, מד כוח לבעיטת אש, משקוף שהכדור קופץ ממנו וחגיגות גול מצחיקות.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540, GROUND = 468;
  const GOAL_W = 72, GOAL_TOP = 336, BAR_R = 6, BAR_X = GOAL_W + 8;   // המשקוף: מהקיר עד BAR_X בגובה GOAL_TOP
  const BR = 17;                                                     // רדיוס הכדור
  const HEAD_R = 34, HEAD_DY = 62, BODY_R = 16, BODY_DY = 22, FOOT_R = 12;
  const GRAV = 0.42, P_GRAV = 0.62, JUMP_V = 11.4, RUN = 4.9, MAXV = 24;
  const MATCH = 90, GOLDEN = 30, KICK_T = 15;
  const START_X = [250, W - 250];
  const POWER_FULL = 100;

  // מראה השחקנים: 0 = הכחול (שחקן 1), 1 = האדום (שחקן 2). למחשב יש מראה לפי רמת הקושי
  const LOOKS = {
    blue: { skin: '#f3c9a0', hair: '#3a2416', shirt: '#2f80ff', dark: '#1b4fb5', shoe: '#ffffff', sole: '#1b4fb5', style: 'spiky' },
    red: { skin: '#c88b5f', hair: '#1c1c1c', shirt: '#ff4b4b', dark: '#b42525', shoe: '#ffe14d', sole: '#b42525', style: 'afro' },
    easy: { skin: '#f6d2b0', hair: '#e8a33c', shirt: '#ff8a3d', dark: '#c45a14', shoe: '#ffffff', sole: '#c45a14', style: 'cap' },
    hard: { skin: '#b97b50', hair: '#141414', shirt: '#9b3bff', dark: '#5d1bb0', shoe: '#222222', sole: '#9b3bff', style: 'mohawk' },
  };
  // המחשב לפי רמה: מהירות, עיכוב בתגובה (צעדים), סיכוי לבעוט ולקפוץ כשאפשר, כל כמה צעדים מתכנן, טעות במיקום, כמה נשאר בבית
  const AIP = [
    { spd: 0.55, delay: 22, kick: 0.3, jump: 0.15, plan: 16, err: 50, home: 0.2, pw: 0.4, kk: 0.78 },
    { spd: 0.72, delay: 15, kick: 0.5, jump: 0.35, plan: 10, err: 30, home: 0.45, pw: 0.8, kk: 0.88 },
    { spd: 0.9, delay: 7, kick: 0.82, jump: 0.7, plan: 5, err: 13, home: 0.75, pw: 1, kk: 0.96 },
  ];
  const KEYS1P = { l: ['ArrowLeft', 'KeyA', 'TL'], r: ['ArrowRight', 'KeyD', 'TR'], j: ['ArrowUp', 'KeyW', 'TJ'], k: ['Space', 'ArrowDown', 'KeyS', 'KeyX', 'KeyK', 'TK'] };
  const KEYS2P = [
    { l: ['KeyA', 'TL'], r: ['KeyD', 'TR'], j: ['KeyW', 'TJ'], k: ['KeyS', 'Space', 'TK'] },
    { l: ['ArrowLeft'], r: ['ArrowRight'], j: ['ArrowUp'], k: ['ArrowDown', 'Enter', 'NumpadEnter', 'Slash', 'ShiftRight', 'Numpad0', 'Period'] },
  ];
  // כפתורי מגע בתוך המסך, רק ל-2 שחקנים במכשיר מגע
  const TBTN = [
    { who: 0, k: 'l', x: 14, lbl: '◀' }, { who: 0, k: 'r', x: 84, lbl: '▶' }, { who: 0, k: 'j', x: 234, lbl: '⤒' }, { who: 0, k: 'k', x: 304, lbl: 'K' },
    { who: 1, k: 'j', x: W - 374, lbl: '⤒' }, { who: 1, k: 'k', x: W - 304, lbl: 'K' }, { who: 1, k: 'l', x: W - 154, lbl: '◀' }, { who: 1, k: 'r', x: W - 84, lbl: '▶' },
  ].map(b => Object.assign(b, { y: GROUND + 8, w: 64, h: 58 }));
  const CELEBS = ['flip', 'dance', 'grow', 'rocket'];

  // ---------- מצב ----------
  function newPlayer(i, look, spd, kk) {
    const x = START_X[i];
    return { i, x, y: GROUND, px: x, py: GROUND, vx: 0, vy: 0, onGround: true, face: i === 0 ? 1 : -1, look, spd: spd || 1, kk: kk || 1,
      kickT: -1, kickHit: false, coyote: 0, jumpBuf: 0, power: 0, squash: 0, rot: 0, headK: 1, blink: 0, mood: 0, rain: 0, flame: 0, ai: null };
  }
  function newBall(x, y) { return { x, y, px: x, py: y, vx: 0, vy: 0, rot: 0, fire: 0, held: true, lastTouch: -1 }; }

  function lookFor(g, i) {
    if (i === 0) return LOOKS.blue;
    if (g.mode === 'cpu') return [LOOKS.easy, LOOKS.red, LOOKS.hard][g.diff] || LOOKS.red;
    return LOOKS.red;
  }

  function resetKick(g) {
    const S = g.s;
    S.players.forEach((p, i) => { p.x = p.px = START_X[i]; p.y = p.py = GROUND; p.vx = p.vy = 0; p.kickT = -1; p.rot = 0; p.headK = 1; p.mood = 0; p.rain = 0; p.onGround = true; });
    S.ball = newBall(W / 2, 150);
    S.phase = 'kick'; S.phaseT = 45;
    S.hist.length = 0;
  }

  // ---------- פיזיקה ----------
  const swing = t => (t < 0 ? 0 : t <= 5 ? t / 5 : t <= 7 ? 1 : Math.max(0, 1 - (t - 7) / 8));
  const footPos = p => { const s = swing(p.kickT); return { x: p.x + p.face * (12 + 27 * s), y: p.y - FOOT_R - 30 * s, s }; };

  // נקודה הכי קרובה על המשקוף (קטע אופקי) לעיגול
  function barHit(x, y, r, side) {
    const x0 = side === 0 ? 0 : W - BAR_X, x1 = side === 0 ? BAR_X : W;
    const cx = Math.max(x0, Math.min(x1, x)), cy = GOAL_TOP;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= r + BAR_R) return null;
    if (d < 0.001) return { nx: 0, ny: 1, pen: r + BAR_R };
    return { nx: dx / d, ny: dy / d, pen: r + BAR_R - d };
  }

  function readCtrl(g, map) {
    const any = arr => arr.some(c => g.key(c)), anyHit = arr => arr.some(c => g.hit(c));
    return { l: any(map.l), r: any(map.r), j: any(map.j), k: any(map.k), jHit: anyHit(map.j), kHit: anyHit(map.k) };
  }
  const merge = (a, b) => (b ? { l: a.l || b.l, r: a.r || b.r, j: a.j || b.j, k: a.k || b.k, jHit: a.jHit || b.jHit, kHit: a.kHit || b.kHit } : a);
  const NONE = { l: false, r: false, j: false, k: false, jHit: false, kHit: false };

  function touchCtrl(g) {
    const out = [Object.assign({}, NONE), Object.assign({}, NONE)];
    const S = g.s;
    for (const b of TBTN) {
      let on = false;
      for (const p of g.touches.values()) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) on = true;
      const id = b.who + b.k;
      if (on) { out[b.who][b.k] = true; if (!S.tHeld[id]) out[b.who][b.k + 'Hit'] = true; }
      S.tHeld[id] = on;
    }
    return out;
  }

  function updatePlayer(g, p, c) {
    const want = (c.r ? 1 : 0) - (c.l ? 1 : 0);
    p.vx += (want * RUN * p.spd - p.vx) * (p.onGround ? 0.42 : 0.3);
    if (c.jHit) p.jumpBuf = 8;
    if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if ((p.jumpBuf > 0 || c.j) && p.coyote > 0 && p.vy >= 0) {
      p.vy = -JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.squash = -0.7;
      g.sfx('jump', { p: p.i ? 0.9 : 1.05 });
    }
    if (p.jumpBuf > 0) p.jumpBuf--;
    p.vy += P_GRAV;
    p.x += p.vx; p.y += p.vy;
    if (p.y >= GROUND) {
      if (!p.onGround && p.vy > 5) { p.squash = 0.8; if (!g.demo) g.burst(p.x, GROUND, { n: 6, color: '#7ccf6a', speed: 1.6, life: 18, gravity: 0.1, dir: -Math.PI / 2, spread: 2.4 }); }
      p.y = GROUND; p.vy = 0; p.onGround = true;
    } else p.onGround = false;
    p.x = Math.max(HEAD_R + 2, Math.min(W - HEAD_R - 2, p.x));
    // הראש פוגע במשקוף מלמטה
    for (const side of [0, 1]) {
      const h = barHit(p.x, p.y - HEAD_DY, HEAD_R, side);
      if (h) { p.x += h.nx * h.pen; p.y += h.ny * h.pen; if (h.ny > 0.3 && p.vy < 0) { p.vy = 1; g.sfx('bounce', { p: 0.7 }); } }
    }
    // בעיטה: לחיצה מתחילה בעיטה, החזקה בועטת שוב ושוב
    if ((c.kHit || c.k) && p.kickT < 0) { p.kickT = 0; p.kickHit = false; g.noise({ filter: 'bandpass', f: 600, f2: 2400, dur: 0.12, vol: 0.08, q: 1 }); }
    if (p.kickT >= 0 && ++p.kickT > KICK_T) p.kickT = -1;
    p.squash *= 0.78;
    if (p.flame > 0) p.flame--;
    if (p.rain > 0) p.rain--;
    if (p.blink > 0) p.blink--; else if (Math.random() < 0.006) p.blink = 8;
  }

  function separate(a, b) {
    const dx = b.x - a.x, dy = (b.y - a.y);
    if (Math.abs(dy) > 90) return;
    const min = HEAD_R * 2 - 6;
    if (Math.abs(dx) < min) {
      const push = (min - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      a.x -= s * push; b.x += s * push;
      a.x = Math.max(HEAD_R + 2, Math.min(W - HEAD_R - 2, a.x)); b.x = Math.max(HEAD_R + 2, Math.min(W - HEAD_R - 2, b.x));
    }
  }

  function bounceSound(g, v, pitch) {
    if (v < 2.5) return;
    g.tone({ f: 190 * (pitch || 1), f2: 110, dur: 0.09, vol: Math.min(0.22, 0.05 + v * 0.012), type: 'sine' });
  }

  function hitCircle(g, b, cx, cy, cr, cvx, cvy, e) {
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), min = cr + BR;
    if (d >= min) return false;
    const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : -1;
    b.x = cx + nx * min; b.y = cy + ny * min;
    const rvx = b.vx - cvx, rvy = b.vy - cvy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; bounceSound(g, -vn, 1.3); }
    return true;
  }

  function kickBall(g, p, b) {
    const S = g.s;
    p.kickHit = true;
    const high = b.y < p.y - 58;
    if (p.power >= POWER_FULL) {
      p.power = 0; p.flame = 40;
      b.vx = p.face * 20 * p.kk; b.vy = high ? -1.5 : -3.2; b.fire = 55;
      if (!g.demo) { g.shake(8); g.flash('#ffb020', 0.22); g.burst(b.x, b.y, { n: 30, color: ['#ffdf4d', '#ff8a1d', '#ff3d1d'], speed: 6, life: 32 }); }
      g.sfx('boom', { p: 1.4 }); g.sfx('laser', { p: 0.7 });
    } else {
      b.vx = p.face * (9.8 + Math.abs(p.vx) * 0.4 + Math.random() * 1.2) * p.kk;
      b.vy = (high ? -3.6 : -7.2 - Math.random() * 1.2) * (0.6 + 0.4 * p.kk);
      gainPower(g, p, 9);
      if (!g.demo) g.burst(b.x, b.y, { n: 8, color: ['#ffffff', '#ffe58a'], speed: 3, life: 18 });
      g.sfx('shoot', { p: 1.1 });
    }
    b.lastTouch = p.i; b.lastKind = 'kick'; b.lastX = b.x;
    S.touches++;
  }

  function ballStep(g) {
    const S = g.s, b = S.ball;
    if (b.held) return;
    b.vy += b.fire > 0 ? GRAV * 0.12 : GRAV;
    if (b.fire > 0) { b.fire--; if (!g.demo && g.frame % 2 === 0) g.burst(b.x - b.vx, b.y - b.vy, { n: 2, color: ['#ffdf4d', '#ff8a1d', '#ff3d1d'], speed: 1, life: 20, size: 7, gravity: -0.05 }); }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) / 6));
    for (let i = 0; i < n; i++) {
      b.x += b.vx / n; b.y += b.vy / n;
      // רצפה, תקרה וקירות
      if (b.y > GROUND - BR) {
        b.y = GROUND - BR;
        if (b.vy > 0) { bounceSound(g, b.vy, 1); b.vy = b.vy > 1.4 ? -b.vy * 0.56 : 0; }
      }
      if (b.y < BR) { b.y = BR; if (b.vy < 0) b.vy = -b.vy * 0.6; }
      const inGoal = b.y > GOAL_TOP;
      if (b.x < BR) { b.x = BR; if (b.vx < 0) b.vx = -b.vx * (inGoal ? 0.22 : 0.55); }
      if (b.x > W - BR) { b.x = W - BR; if (b.vx > 0) b.vx = -b.vx * (inGoal ? 0.22 : 0.55); }
      // המשקופים
      for (const side of [0, 1]) {
        const h = barHit(b.x, b.y, BR, side);
        if (!h) continue;
        b.x += h.nx * h.pen; b.y += h.ny * h.pen;
        const vn = b.vx * h.nx + b.vy * h.ny;
        if (vn < 0) {
          b.vx -= 1.62 * vn * h.nx; b.vy -= 1.62 * vn * h.ny;
          if (-vn > 3) { g.tone({ f: 980, f2: 760, dur: 0.18, type: 'triangle', vol: 0.14 }); g.tone({ f: 1470, dur: 0.12, type: 'sine', vol: 0.06 }); S.barShake[side] = 10; if (!g.demo) g.shake(3); }
        }
        // כדור שנח על המשקוף מתגלגל חזרה למגרש
        if (b.y < GOAL_TOP && Math.abs(b.vx) < 0.6 && Math.abs(b.vy) < 1.2) b.vx += side === 0 ? 0.35 : -0.35;
      }
      // השחקנים: ראש, גוף ורגל בועטת
      for (const p of S.players) {
        const f = footPos(p);
        if (p.kickT >= 1 && p.kickT <= 8 && !p.kickHit && Math.hypot(b.x - f.x, b.y - f.y) < FOOT_R + BR + 8) { kickBall(g, p, b); continue; }
        if (hitCircle(g, b, p.x, p.y - HEAD_DY, HEAD_R, p.vx, p.vy, 0.45)) {
          b.vx += p.face * 0.5 + (Math.random() - 0.5) * 0.4;
          if (p.vy < -2) { b.vy -= 1.6; b.vx += p.face * 1.4; }
          touch(g, p, b, 6, 'head');
        }
        if (hitCircle(g, b, p.x, p.y - BODY_DY, BODY_R, p.vx, p.vy, 0.3)) touch(g, p, b, 4, 'body');
        if (p.kickT < 0 && hitCircle(g, b, f.x, f.y, FOOT_R, p.vx, p.vy, 0.5)) touch(g, p, b, 3, 'foot');
      }
    }
    b.vx *= 0.996;
    if (b.y >= GROUND - BR - 0.5) b.vx *= 0.986;
    b.rot += b.vx / BR;
  }
  function gainPower(g, p, pw) {
    const f = g.s.frame;
    if (f - (p.pwF == null ? -999 : p.pwF) < 45) return;
    p.pwF = f; p.power = Math.min(POWER_FULL, p.power + pw);
  }
  function touch(g, p, b, pw, kind) {
    gainPower(g, p, pw);
    b.lastTouch = p.i; b.lastKind = kind; b.lastX = b.x;
  }

  // ---------- המחשב: איפה הכדור ינחת, לעמוד מאחוריו, לבעוט ולקפוץ ----------
  function predict(b, frames, minY) {
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    if (b.held) return { x, y, t: 0 };
    for (let t = 0; t < frames; t++) {
      vy += GRAV; x += vx; y += vy;
      vx *= 0.996;
      if (y > GROUND - BR) { y = GROUND - BR; vy = -vy * 0.56; }
      if (x < BR) { x = BR; vx = -vx * 0.55; } else if (x > W - BR) { x = W - BR; vx = -vx * 0.55; }
      if (y >= minY && vy > 0) return { x, y, t };
    }
    return { x, y, t: frames };
  }
  function aiCtrl(g, p, prm) {
    const S = g.s;
    const st = p.ai || (p.ai = { planT: 0, tx: p.x, err: 0, kickCD: 0, jumpCD: 0 });
    const hist = S.hist;
    const b = hist.length ? hist[Math.max(0, hist.length - 1 - prm.delay)] : S.ball;
    const c = Object.assign({}, NONE);
    const f = p.face;
    if (--st.planT <= 0) {
      st.planT = prm.plan;
      st.err = (Math.random() * 2 - 1) * prm.err;
      const pr = predict(b, 45, GROUND - 95);
      const rel = (pr.x - p.x) * f;
      let tx = rel > -14 ? pr.x - f * 30 : pr.x - f * 74;
      const homeX = f > 0 ? GOAL_W + 110 : W - GOAL_W - 110;
      if ((pr.x - homeX) * f > 330) tx = tx + (homeX - tx) * prm.home;
      st.tx = Math.max(HEAD_R, Math.min(W - HEAD_R, tx + st.err));
    }
    const dx = st.tx - p.x;
    if (Math.abs(dx) > 9) { if (dx < 0) c.l = true; else c.r = true; }
    const rel = (b.x - p.x) * f, dy = b.y - p.y;
    if (st.kickCD > 0) st.kickCD--;
    if (rel > 4 && rel < 74 && dy > -100 && dy < 12 && st.kickCD <= 0) {
      st.kickCD = 22;
      if (Math.random() < prm.kick && (p.power < POWER_FULL || Math.random() < prm.pw)) c.k = c.kHit = true;
    }
    if (st.jumpCD > 0) st.jumpCD--;
    if (st.jumpCD <= 0 && Math.abs(b.x - p.x) < 82 && b.y < p.y - 108 && b.y > p.y - 270 && b.vy > -3) {
      st.jumpCD = 40;
      if (Math.random() < prm.jump) c.j = c.jHit = true;
    }
    return c;
  }

  // ---------- גול, חגיגות, שעון ----------
  function goal(g, scorer) {
    const S = g.s;
    S.score[scorer]++;
    S.phase = 'goal'; S.phaseT = 160; S.scorer = scorer;
    S.celeb = S.celebOrder[S.celebI++ % CELEBS.length];
    S.goalT = 0; S.crowd = 170;
    const sc = S.players[scorer], co = S.players[1 - scorer];
    co.mood = 1; co.rain = 150;
    sc.mood = 2;
    const gx = scorer === 0 ? W - GOAL_W / 2 : GOAL_W / 2;
    if (!g.demo) {
      g.shake(12); g.flash('#ffffff', 0.3);
      g.burst(gx, GOAL_TOP + 80, { n: 60, color: [sc.look.shirt, '#ffffff', '#ffe14d'], speed: 7, life: 60, gravity: 0.12, shape: 'square' });
      g.sfx('score'); g.noise({ filter: 'bandpass', f: 900, f2: 1600, dur: 1.6, vol: 0.18, q: 0.5 });
      g.after(0.25, () => g.sfx('power'));
    }
  }

  function celebrate(g, p, kind, t) {
    if (kind === 'flip') {
      if ((t === 2 || t === 70) && p.onGround) { p.vy = -13; p.onGround = false; p.spinT = 0; }
      if (!p.onGround) { p.spinT = (p.spinT || 0) + 1; p.rot = Math.min(1, p.spinT / 38) * Math.PI * 2; } else p.rot = 0;
    } else if (kind === 'dance') {
      if (t % 18 === 2 && p.onGround) { p.vy = -6; p.onGround = false; p.face = -p.face; }
      p.rot = Math.sin(t * 0.35) * 0.25;
      if (t % 22 === 5 && !g.demo) g.float(p.x + (Math.random() - 0.5) * 50, p.y - 120, Math.random() < 0.5 ? '♪' : '♫', { color: '#ffe14d', size: 30 });
    } else if (kind === 'grow') {
      const u = t < 40 ? g.ease.elastic(t / 40) : t > 120 ? 1 - g.ease.out((t - 120) / 30) : 1;
      p.headK = 1 + 0.65 * Math.max(0, u);
      if (t === 6) g.sfx('pop', { p: 0.6 });
      if (t === 124) g.sfx('pop', { p: 1.4 });
    } else if (kind === 'rocket') {
      if (t < 34) { p.vy = -9.5; p.onGround = false; if (!g.demo) g.burst(p.x, p.y, { n: 3, color: ['#ffffff', '#ffd27a', '#ff8a1d'], speed: 2, life: 26, size: 9, gravity: 0.02, dir: Math.PI / 2, spread: 0.8 }); }
      if (t === 2) g.sfx('whoosh');
      p.rot = Math.sin(t * 0.5) * 0.08;
    }
  }

  function finish(g) {
    const S = g.s, [a, b] = S.score;
    S.phase = 'over';
    const scoreStr = '⁦' + a + ' : ' + b + '⁩';
    if (g.mode === 'cpu') {
      const st = S.stats;
      const res = a > b ? 'win' : a < b ? 'lose' : 'draw';
      st[res[0]][g.diff]++;
      g.save('stats', st);
      g.end({ result: res, score: scoreStr, scoreLabel: g.t('final'), text: g.t('winsOn', { d: g.t(['easy', 'medium', 'hard'][g.diff]), n: st.w[g.diff] }), delay: 900 });
    } else {
      if (a !== b) S.tally[a > b ? 0 : 1]++;
      g.end(a === b ? { result: 'draw', score: scoreStr, scoreLabel: g.t('final') } : { winner: g.t(a > b ? 'p1' : 'p2'), score: scoreStr, scoreLabel: g.t('final'), text: g.t('tally', { a: S.tally[0], b: S.tally[1] }), delay: 900 });
    }
  }

  // צעד אחד של המשחק (גם במשחק עצמו וגם ברקע של התפריט, שם שני המחשבים משחקים)
  function tick(g) {
    const S = g.s;
    S.frame++;
    for (const p of S.players) { p.px = p.x; p.py = p.y; }
    S.ball.px = S.ball.x; S.ball.py = S.ball.y;
    // הקלט
    let c0 = NONE, c1 = NONE;
    const live = S.phase === 'play' || S.phase === 'kick' || S.phase === 'intro';
    if (live) {
      if (g.demo) { c0 = aiCtrl(g, S.players[0], AIP[1]); c1 = aiCtrl(g, S.players[1], AIP[1]); }
      else if (g.mode === 'cpu') {
        c0 = merge(readCtrl(g, KEYS1P), S.botIn);
        c1 = aiCtrl(g, S.players[1], AIP[g.diff] || AIP[1]);
      } else {
        c0 = merge(readCtrl(g, KEYS2P[0]), S.botIn); c1 = readCtrl(g, KEYS2P[1]);
        if (g.touch) { const t = touchCtrl(g); c0 = merge(c0, t[0]); c1 = merge(c1, t[1]); }
      }
    }
    S.botIn = null;
    if (S.phase === 'goal') {
      const t = 160 - S.phaseT;
      celebrate(g, S.players[S.scorer], S.celeb, t);
    }
    updatePlayer(g, S.players[0], c0);
    updatePlayer(g, S.players[1], c1);
    separate(S.players[0], S.players[1]);
    // הכדור
    if (S.phase === 'kick') {
      S.ball.y = 150 + Math.sin(S.frame * 0.15) * 4;
      if (--S.phaseT <= 0) { S.phase = 'play'; S.ball.held = false; S.ball.vx = (Math.random() - 0.5) * 1.5; S.ball.vy = 1; g.sfx('click'); }
    } else ballStep(g);
    S.hist.push({ x: S.ball.x, y: S.ball.y, vx: S.ball.vx, vy: S.ball.vy, held: S.ball.held });
    if (S.hist.length > 40) S.hist.shift();
    for (const p of S.players) if (S.phase === 'play' && !g.demo) p.power = Math.min(POWER_FULL, p.power + (p.i === 1 && g.mode === 'cpu' ? 0.035 * (AIP[g.diff] || AIP[1]).pw : 0.035));
    for (const p of S.players) { if (p.power >= POWER_FULL && !p.ready) { p.ready = true; if (!g.demo) { g.sfx('power'); g.float(p.i === 0 ? 111 : W - 111, 86, g.t('power'), { color: '#ffd24d', size: 22, speed: 0.5 }); } } if (p.power < POWER_FULL) p.ready = false; }
    S.barShake[0] *= 0.8; S.barShake[1] *= 0.8;
    if (S.crowd > 0) S.crowd--;
    // גול?
    const b = S.ball;
    if (S.phase === 'play') {
      if (b.x < GOAL_W - 6 && b.y > GOAL_TOP) goal(g, 1);
      else if (b.x > W - GOAL_W + 6 && b.y > GOAL_TOP) goal(g, 0);
    }
    if (S.phase === 'goal') {
      S.goalT++;
      if (--S.phaseT <= 0) {
        for (const p of S.players) { p.rot = 0; p.headK = 1; p.mood = 0; p.face = p.i === 0 ? 1 : -1; }
        if (S.golden && !g.demo) { S.phase = 'whistle'; S.phaseT = 40; }
        else resetKick(g);
      }
    }
    // השעון
    if (!g.demo && S.phase === 'play') {
      S.clock--;
      if (S.clock <= 600 && S.clock > 0 && S.clock % 60 === 0) g.sfx('tick', { p: 1.3 });
      if (S.clock <= 0) {
        if (S.score[0] === S.score[1] && !S.golden) {
          S.golden = true; S.clock = GOLDEN * 60;
          g.msg(g.t('golden'), 2000, '#ffd24d');
          whistle(g);
        } else { S.phase = 'whistle'; S.phaseT = 60; whistle(g, true); }
      }
    }
    if (S.phase === 'whistle' && --S.phaseT <= 0) finish(g);
  }
  function whistle(g, long) {
    g.tone({ f: 2350, f2: 2250, dur: 0.18, type: 'square', vol: 0.05 });
    g.tone({ f: 2350, f2: 2200, dur: long ? 0.7 : 0.3, type: 'square', vol: 0.05, delay: 0.22 });
  }

  // ---------- ציור ----------
  const layers = {};
  function layer(ctx, name, paint) {
    const k = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
    let L = layers[name];
    if (!L || L.k !== k) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * k); c.height = Math.round(H * k);
      const x = c.getContext('2d'); x.scale(k, k); paint(x);
      L = layers[name] = { c, k };
    }
    ctx.drawImage(L.c, 0, 0, W, H);
  }

  function crowdDots() {
    const r = GK.U.seeded(7), out = [];
    const skins = ['#f3c9a0', '#c88b5f', '#8d5a3b', '#f6d2b0', '#e0ac7e'];
    const shirts = ['#2f80ff', '#ff4b4b', '#ffe14d', '#ffffff', '#4fd1c5', '#ff8a3d', '#9b3bff', '#2f80ff', '#ff4b4b'];
    for (let row = 0; row < 8; row++) {
      const y = 150 + row * 21;
      for (let x = 8 + (row % 2) * 9; x < W; x += 18) {
        if (r() < 0.08) continue;
        out.push({ x: x + (r() - 0.5) * 5, y: y + (r() - 0.5) * 3, s: skins[(r() * skins.length) | 0], c: shirts[(r() * shirts.length) | 0], ph: r() * 6.28, row });
      }
    }
    return out;
  }
  let CROWD = null;

  function paintBack(ctx, k) {
    const sky = ctx.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, '#1d4fb8'); sky.addColorStop(0.6, '#4f9cf0'); sky.addColorStop(1, '#a9dcff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // עננים רחוקים
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const [x, y, s] of [[90, 86, 0.8], [700, 40, 1], [860, 92, 0.75]]) {
      for (const [dx, dy, r] of [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]]) { k.circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
    }
    // היציע
    const st = ctx.createLinearGradient(0, 110, 0, 330);
    st.addColorStop(0, '#2b3550'); st.addColorStop(1, '#161c2c');
    ctx.fillStyle = st;
    ctx.beginPath(); ctx.moveTo(0, 128); ctx.quadraticCurveTo(W / 2, 92, W, 128); ctx.lineTo(W, 334); ctx.lineTo(0, 334); ctx.closePath(); ctx.fill();
    // גג
    ctx.fillStyle = '#3c4866';
    ctx.beginPath(); ctx.moveTo(0, 118); ctx.quadraticCurveTo(W / 2, 80, W, 118); ctx.lineTo(W, 132); ctx.quadraticCurveTo(W / 2, 96, 0, 132); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 160 + i * 21); ctx.lineTo(W, 160 + i * 21); ctx.stroke(); }
    // עמודי תאורה
    for (const x of [268, W - 268]) {
      ctx.fillStyle = '#596580'; ctx.fillRect(x - 4, 20, 8, 110);
      k.rr(ctx, x - 34, 6, 68, 30, 6); ctx.fillStyle = '#2b3550'; ctx.fill();
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { k.circle(ctx, x - 24 + i * 16, 15 + j * 12, 5); ctx.fillStyle = '#fffbe0'; ctx.fill(); }
      const gl = ctx.createRadialGradient(x, 20, 4, x, 20, 90);
      gl.addColorStop(0, 'rgba(255,250,210,.55)'); gl.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 90, -70, 180, 180);
    }
    // שלטי פרסום (בלי מותגים)
    const ads = ['#ff4b4b', '#2f80ff', '#ffd24d', '#4fd1c5', '#9b3bff', '#ff8a3d'];
    for (let i = 0; i < 12; i++) {
      const x = i * 80;
      ctx.fillStyle = ads[i % ads.length]; ctx.fillRect(x, 318, 80, 30);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      if (i % 2) { k.circle(ctx, x + 40, 333, 9); ctx.fill(); ctx.fillStyle = ads[i % ads.length]; k.circle(ctx, x + 40, 333, 4); ctx.fill(); }
      else { k.rr(ctx, x + 18, 328, 44, 10, 5); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 346, W, 3);
    // הדשא, בפסים
    const gr = ctx.createLinearGradient(0, 348, 0, H);
    gr.addColorStop(0, '#3e9b45'); gr.addColorStop(1, '#2f7e37');
    ctx.fillStyle = gr; ctx.fillRect(0, 348, W, H - 348);
    for (let i = 0; i < 12; i += 2) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(i * 80, 348, 80, H - 348); }
    // קווים
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2, 352); ctx.lineTo(W / 2, GROUND); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W / 2, (352 + GROUND) / 2 + 6, 120, 44, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, GROUND + 4, W, H - GROUND);
  }

  function paintCrowd(ctx, k, up) {
    CROWD = CROWD || crowdDots();
    for (const d of CROWD) {
      const lift = up ? ((d.x * 7 + d.row * 13) % 3) * 2 + 2 : 0;
      ctx.fillStyle = d.c;
      k.rr(ctx, d.x - 6, d.y + 3 - lift, 12, 10, 4); ctx.fill();
      if (up && (d.x | 0) % 3 === 0) { ctx.strokeStyle = d.s; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(d.x - 5, d.y + 4 - lift); ctx.lineTo(d.x - 9, d.y - 9 - lift); ctx.moveTo(d.x + 5, d.y + 4 - lift); ctx.lineTo(d.x + 9, d.y - 9 - lift); ctx.stroke(); }
      ctx.fillStyle = d.s; k.circle(ctx, d.x, d.y - lift, 5.5); ctx.fill();
    }
    // היציע קצת בצל, כדי שהשחקנים יבלטו
    const sh = ctx.createLinearGradient(0, 130, 0, 320);
    sh.addColorStop(0, 'rgba(16,22,38,.42)'); sh.addColorStop(1, 'rgba(16,22,38,.2)');
    ctx.fillStyle = sh; ctx.fillRect(0, 128, W, 192);
  }

  function drawGoalBack(g, ctx, side, shake) {
    const x0 = side === 0 ? 0 : W - GOAL_W;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x0, GOAL_TOP, GOAL_W, GROUND - GOAL_TOP);
    ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = -12; i < 22; i++) {
      const a = x0 + i * 14 + (side ? 0 : shake), b = x0 + i * 14 + (GROUND - GOAL_TOP) * 0.5;
      ctx.moveTo(a, GOAL_TOP); ctx.lineTo(b, GROUND);
      ctx.moveTo(b, GOAL_TOP); ctx.lineTo(a, GROUND);
    }
    ctx.rect(x0, GOAL_TOP, GOAL_W, GROUND - GOAL_TOP);
    ctx.save(); ctx.clip(); ctx.stroke(); ctx.restore();
    ctx.restore();
    // עמוד אחורי
    const px = side === 0 ? 3 : W - 9;
    ctx.fillStyle = '#e8edf5'; ctx.fillRect(px, GOAL_TOP, 6, GROUND - GOAL_TOP);
  }
  function drawGoalFront(g, ctx, side, shake) {
    const x0 = side === 0 ? 0 : W - BAR_X, y = GOAL_TOP + Math.sin(shake * 1.7) * shake * 0.4;
    const gr = ctx.createLinearGradient(0, y - BAR_R, 0, y + BAR_R);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b8c2d4');
    g.rr(ctx, x0, y - BAR_R, BAR_X, BAR_R * 2, BAR_R);
    ctx.fillStyle = gr; ctx.fill();
    // עמוד קדמי דק (רק לציור)
    const fx = side === 0 ? BAR_X - 6 : W - BAR_X;
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(fx, y, 6, GROUND - y);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(fx + (side === 0 ? 4 : 0), y, 2, GROUND - y);
  }

  function drawBall(g, ctx, x, y, rot, fire, r) {
    r = r || BR;
    if (fire > 0) {
      const a = Math.min(1, fire / 20);
      for (let i = 4; i >= 1; i--) {
        ctx.globalAlpha = 0.25 * a; g.circle(ctx, x, y, r + i * 5); ctx.fillStyle = i > 2 ? '#ff6a1d' : '#ffd24d'; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    g.circle(ctx, x, y, r); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.clip();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#20232b';
    const pent = (cx, cy, s) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } ctx.closePath(); ctx.fill(); };
    pent(0, 0, r * 0.36);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3); }
    ctx.restore();
    const sh = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)');
    g.circle(ctx, x, y, r); ctx.fillStyle = sh; ctx.fill();
  }

  function drawPlayer(g, ctx, p, x, y, look, ball, t) {
    const air = Math.max(0, GROUND - y);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * (1 - Math.min(1, air / 220))).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 32 * (1 - Math.min(0.5, air / 320)), 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    if (p.rot) { ctx.translate(0, -45); ctx.rotate(p.rot * p.face); ctx.translate(0, 45); }
    ctx.scale(1 + p.squash * 0.13, 1 - p.squash * 0.13);
    const f = p.face;
    // רגל אחורית
    ctx.fillStyle = look.sole; g.rr(ctx, -f * 14 - 11, -10, 22, 10, 5); ctx.fill();
    ctx.fillStyle = look.shoe; g.rr(ctx, -f * 14 - 11, -13, 22, 9, 5); ctx.fill();
    // גוף (חולצה)
    const sg = ctx.createLinearGradient(0, -44, 0, -8);
    sg.addColorStop(0, look.shirt); sg.addColorStop(1, look.dark);
    g.rr(ctx, -17, -44, 34, 34, 12); ctx.fillStyle = sg; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; g.rr(ctx, -2, -40, 4, 26, 2); ctx.fill();
    // רגל בועטת
    const s = swing(p.kickT), fx = f * (12 + 27 * s), fy = -FOOT_R - 30 * s;
    ctx.strokeStyle = look.dark; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * 6, -18); ctx.lineTo(fx - f * 4, fy + 2); ctx.stroke();
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(-f * s * 0.9);
    ctx.fillStyle = look.sole; g.rr(ctx, -13, 2, 28, 9, 4); ctx.fill();
    ctx.fillStyle = look.shoe; g.rr(ctx, -13, -8, 28, 13, 6); ctx.fill();
    ctx.fillStyle = look.sole; ctx.fillRect(-4, -6, 2, 8); ctx.fillRect(2, -6, 2, 8);
    ctx.restore();
    if (p.flame > 0) { ctx.globalAlpha = p.flame / 40; g.circle(ctx, fx, fy, 16); ctx.fillStyle = '#ffb020'; ctx.fill(); ctx.globalAlpha = 1; }
    // ראש
    ctx.save();
    ctx.translate(0, -HEAD_DY);
    const hk = p.headK || 1;
    ctx.scale(hk, hk);
    drawHead(g, ctx, look, f, p, ball, x, y - HEAD_DY, t);
    ctx.restore();
    ctx.restore();
    // ענן גשם מעל מי שספג גול
    if (p.rain > 0) {
      const a = Math.min(1, p.rain / 30);
      ctx.globalAlpha = a;
      const cx = x, cy = y - HEAD_DY - HEAD_R * (p.headK || 1) - 46 + Math.sin(t * 3) * 3;
      ctx.fillStyle = '#6f7a8f';
      for (const [dx, dy, r] of [[-20, 4, 14], [0, -4, 18], [20, 4, 14], [0, 8, 14]]) { g.circle(ctx, cx + dx, cy + dy, r); ctx.fill(); }
      ctx.strokeStyle = '#7fc4ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const rx = cx - 20 + i * 10, ry = cy + 18 + ((t * 120 + i * 17) % 26); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }

  function drawHead(g, ctx, look, f, p, ball, hx, hy, t) {
    const R = HEAD_R;
    // שיער מאחור (אפרו)
    if (look.style === 'afro') { ctx.fillStyle = look.hair; for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; g.circle(ctx, Math.cos(a) * R * 0.92 - f * 4, Math.sin(a) * R * 0.92 - 4, 13); ctx.fill(); } }
    const gr = ctx.createRadialGradient(-R * 0.3 + f * 6, -R * 0.35, R * 0.2, 0, 0, R);
    gr.addColorStop(0, g.shade(look.skin, 0.18)); gr.addColorStop(1, g.shade(look.skin, -0.14));
    g.circle(ctx, 0, 0, R); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = g.shade(look.skin, -0.3); ctx.lineWidth = 2; ctx.stroke();
    // אוזן
    g.circle(ctx, -f * R * 0.62, 4, 8); ctx.fillStyle = g.shade(look.skin, -0.08); ctx.fill();
    // שיער
    ctx.fillStyle = look.hair;
    if (look.style === 'spiky') {
      ctx.beginPath(); ctx.moveTo(-R, -2);
      for (let i = 0; i <= 6; i++) { const a = Math.PI + i * Math.PI / 6; const rr = i % 2 ? R * 1.32 : R * 0.98; ctx.lineTo(Math.cos(a) * rr - f * 3, Math.sin(a) * rr); }
      ctx.lineTo(R * 0.7, -R * 0.5); ctx.quadraticCurveTo(0, -R * 0.45, -R, -2); ctx.fill();
    } else if (look.style === 'afro') {
      ctx.beginPath(); ctx.arc(0, -4, R * 0.98, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(0, -R * 0.55, -R * 0.95, -R * 0.3); ctx.fill();
      ctx.fillStyle = '#ff4b4b'; ctx.fillRect(-R * 0.98, -R * 0.5, R * 1.96, 8);
    } else if (look.style === 'cap') {
      ctx.beginPath(); ctx.arc(0, -6, R * 0.98, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = '#ff8a3d'; ctx.fill();
      g.rr(ctx, f > 0 ? 4 : -R * 1.45, -12, R * 1.05, 9, 4); ctx.fillStyle = '#c45a14'; ctx.fill();
      ctx.fillStyle = '#ffffff'; g.circle(ctx, 0, -R * 0.62, 6); ctx.fill();
      ctx.fillStyle = look.hair; ctx.fillRect(-f * R * 0.85 - 6, -6, 12, 10);
    } else if (look.style === 'mohawk') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const x0 = -R * 0.55 + i * R * 0.22; ctx.moveTo(x0, -R * 0.82); ctx.lineTo(x0 + R * 0.11 - f * 6, -R * 1.42); ctx.lineTo(x0 + R * 0.22, -R * 0.82); }
      ctx.fill();
      ctx.fillRect(-R * 0.55, -R * 0.95, R * 1.3, 8);
    }
    // עיניים שמסתכלות על הכדור
    const ex = f * R * 0.36, ey = -4;
    const bdx = ball.x - (hx + ex * (p.headK || 1)), bdy = ball.y - (hy + ey);
    const bd = Math.hypot(bdx, bdy) || 1;
    const lx = bdx / bd * 4, ly = bdy / bd * 4;
    const eyes = [[ex - f * 9, ey], [ex + f * 11, ey - 1]];
    if (look.style === 'mohawk') {
      // משקפי שמש
      ctx.fillStyle = '#111';
      g.rr(ctx, Math.min(eyes[0][0], eyes[1][0]) - 10, ey - 8, Math.abs(eyes[1][0] - eyes[0][0]) + 20, 15, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(Math.min(eyes[0][0], eyes[1][0]) - 6, ey - 5, 6, 3);
    } else {
      for (const [x, y] of eyes) {
        if (p.blink > 0 || p.mood === 2) {
          ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
          ctx.beginPath(); if (p.mood === 2) ctx.arc(x, y + 2, 6, Math.PI * 1.1, Math.PI * 1.9); else { ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); } ctx.stroke();
        } else {
          g.circle(ctx, x, y, 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
          g.circle(ctx, x + lx, y + ly, 3.8); ctx.fillStyle = '#1b1b1b'; ctx.fill();
          g.circle(ctx, x + lx + 1.3, y + ly - 1.3, 1.2); ctx.fillStyle = '#fff'; ctx.fill();
        }
      }
    }
    // גבות: כועסות כשבועט, עצובות כשספג
    ctx.strokeStyle = g.shade(look.hair, 0.1); ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    const angry = p.kickT >= 0 ? 4 : 0, sad = p.mood === 1 ? -5 : 0;
    for (const [x, y] of eyes) {
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 12 + (x * f < ex * f ? -angry + sad : angry - sad) * 0.5);
      ctx.lineTo(x + 7, y - 12 + (x * f < ex * f ? angry - sad : -angry + sad) * 0.5);
      ctx.stroke();
    }
    // פה
    const mx = f * R * 0.42, my = 15;
    ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 3;
    if (p.mood === 1) { ctx.beginPath(); ctx.arc(mx, my + 7, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (p.mood === 2 || p.kickT >= 0 || !p.onGround) {
      ctx.beginPath(); ctx.ellipse(mx, my, 7, p.mood === 2 ? 7 : 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#5a1a1a'; ctx.fill();
      if (p.mood === 2) { ctx.fillStyle = '#ff7b8a'; ctx.beginPath(); ctx.ellipse(mx, my + 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    } else { ctx.beginPath(); ctx.arc(mx, my - 3, 7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    // דמעות
    if (p.mood === 1 && (t * 10 | 0) % 2 === 0) {
      ctx.fillStyle = '#7fc4ff';
      for (const [x, y] of eyes) { ctx.beginPath(); ctx.ellipse(x, y + 12 + ((t * 40) % 14), 2.5, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // לחיים
    ctx.fillStyle = 'rgba(255,110,110,.22)'; g.circle(ctx, mx + f * 8, 8, 6); ctx.fill();
  }

  function drawMeter(g, ctx, x, y, w, v, col, t, flip) {
    g.rr(ctx, x, y, w, 16, 8); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    const full = v >= POWER_FULL;
    const fw = Math.max(0, (w - 6) * v / POWER_FULL);
    if (fw > 2) {
      g.rr(ctx, flip ? x + w - 3 - fw : x + 3, y + 3, fw, 10, 5);
      ctx.fillStyle = full ? (Math.sin(t * 12) > 0 ? '#ffe14d' : '#ff8a1d') : col; ctx.fill();
    }
    ctx.strokeStyle = full ? '#ffe14d' : 'rgba(255,255,255,.35)'; ctx.lineWidth = full ? 2.5 : 1.5;
    g.rr(ctx, x, y, w, 16, 8); ctx.stroke();
    g.text(ctx, '⚡', flip ? x - 14 : x + w + 14, y + 8, { size: 16, color: full ? '#ffe14d' : 'rgba(255,255,255,.6)' });
  }

  function fmtClock(f) { const s = Math.ceil(Math.max(0, f) / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  function drawScene(g, ctx, alpha) {
    const S = g.s, t = S.frame / 60;
    const lerp = (a, b) => a + (b - a) * alpha;
    layer(ctx, 'back', c => paintBack(c, g));
    const up = S.crowd > 0 && (S.frame >> 3) % 2 === 0;
    layer(ctx, up ? 'crowdUp' : 'crowd', c => paintCrowd(c, g, up));
    drawGoalBack(g, ctx, 0, S.barShake[0]);
    drawGoalBack(g, ctx, 1, S.barShake[1]);
    const b = S.ball, bx = lerp(b.px, b.x), by = lerp(b.py, b.y);
    // צל הכדור
    const air = GROUND - by;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * Math.max(0, 1 - air / 300)).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(bx, GROUND + 3, BR * Math.max(0.4, 1 - air / 400), 4, 0, 0, Math.PI * 2); ctx.fill();
    S.players.forEach((p, i) => drawPlayer(g, ctx, p, lerp(p.px, p.x), lerp(p.py, p.y), p.look, { x: bx, y: by }, t));
    drawBall(g, ctx, bx, by, b.rot, b.fire);
    drawGoalFront(g, ctx, 0, S.barShake[0]);
    drawGoalFront(g, ctx, 1, S.barShake[1]);
    if (b.held && S.phase === 'kick') {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 10);
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; g.circle(ctx, bx, by, BR + 8); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function drawHudCanvas(g, ctx) {
    const S = g.s, t = S.frame / 60;
    // לוח התוצאות
    const bw = 300, bx = W / 2 - bw / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    g.rr(ctx, bx, 10, bw, 58, 14); ctx.fillStyle = 'rgba(12,18,32,.88)'; ctx.fill(); ctx.restore();
    g.rr(ctx, bx, 10, 90, 58, 14); ctx.fillStyle = S.players[0].look.shirt; ctx.fill();
    g.rr(ctx, bx + bw - 90, 10, 90, 58, 14); ctx.fillStyle = S.players[1].look.shirt; ctx.fill();
    ctx.fillStyle = 'rgba(12,18,32,.88)'; ctx.fillRect(bx + 76, 10, 148, 58);
    g.text(ctx, String(S.score[0]), bx + 45, 41, { size: 40, weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.35)', strokeW: 4 });
    g.text(ctx, String(S.score[1]), bx + bw - 45, 41, { size: 40, weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.35)', strokeW: 4 });
    const low = !g.demo && S.clock <= 600 && S.phase === 'play';
    const pulse = low ? 1 + 0.08 * Math.sin(t * 12) : 1;
    g.text(ctx, fmtClock(S.clock), W / 2, S.golden ? 33 : 40, { size: 30 * pulse, weight: 900, color: low ? '#ff6b6b' : '#ffffff' });
    if (S.golden) g.text(ctx, g.t('goldenShort'), W / 2, 56, { size: 13, weight: 800, color: '#ffd24d', maxW: 140 });
    // שמות ומדי כוח
    const n0 = g.mode === 'cpu' ? g.t('you') : g.t('p1'), n1 = g.mode === 'cpu' ? g.t('cpu') : g.t('p2');
    g.text(ctx, n0, 26, 22, { size: 17, weight: 800, align: 'left', dir: 'ltr', color: '#fff', stroke: 'rgba(0,0,0,.5)', strokeW: 4, maxW: 220 });
    g.text(ctx, n1, W - 26, 22, { size: 17, weight: 800, align: 'right', dir: 'ltr', color: '#fff', stroke: 'rgba(0,0,0,.5)', strokeW: 4, maxW: 220 });
    drawMeter(g, ctx, 26, 38, 170, S.players[0].power, '#7fc4ff', t, false);
    drawMeter(g, ctx, W - 196, 38, 170, S.players[1].power, '#ff9b9b', t, true);
    // הודעות גדולות
    if (S.phase === 'goal' && S.goalT < 120) {
      const u = Math.min(1, S.goalT / 22), k = g.ease.back(u);
      const a = S.goalT > 95 ? 1 - (S.goalT - 95) / 25 : 1;
      ctx.save(); ctx.translate(W / 2, 190); ctx.rotate(Math.sin(S.goalT * 0.2) * 0.05); ctx.scale(k, k);
      g.text(ctx, g.t('goal'), 0, 0, { size: 96, weight: 900, color: '#ffe14d', stroke: '#a3360f', strokeW: 12, alpha: a, maxW: 700 });
      ctx.restore();
    }
    if (S.phase === 'intro') {
      const u = 1 - S.phaseT / 70;
      g.text(ctx, S.phaseT > 25 ? g.t('ready') : g.t('go'), W / 2, 200, { size: 64 + 20 * g.ease.out(u), weight: 900, color: '#ffffff', stroke: 'rgba(0,0,0,.55)', strokeW: 9, maxW: 700 });
    }
    if (S.phase === 'whistle' || S.phase === 'over') {
      g.text(ctx, g.t('timeUp'), W / 2, 200, { size: 64, weight: 900, color: '#ffffff', stroke: 'rgba(0,0,0,.55)', strokeW: 9, maxW: 700 });
    }
    // כפתורי מגע ל-2 שחקנים
    if (g.touch && g.mode === '2p' && !g.demo) {
      for (const bt of TBTN) {
        const on = S.tHeld[bt.who + bt.k];
        g.rr(ctx, bt.x, bt.y, bt.w, bt.h, 14);
        ctx.fillStyle = on ? (bt.who ? 'rgba(255,75,75,.75)' : 'rgba(47,128,255,.75)') : 'rgba(0,0,0,.32)'; ctx.fill();
        ctx.strokeStyle = bt.who ? '#ff9b9b' : '#9cc4ff'; ctx.lineWidth = 2; ctx.stroke();
        g.text(ctx, bt.lbl === 'K' ? '👟' : bt.lbl, bt.x + bt.w / 2, bt.y + bt.h / 2 + 1, { size: 26, color: '#fff' });
      }
    }
  }

  // ---------- הרישום ----------
  GK.register('head-soccer', {
    w: W, h: H, bg: '#14304f', accent: '#ffd24d',
    modes: ['cpu', '2p'],
    diffs: true, diffModes: ['cpu'], diffDefault: 0,
    noBest: true,
    touch: [['TL', '◀'], ['TR', '▶'], null, ['TJ', '⤒'], ['TK', '👟']],
    text: {
      he: { title: 'כדורגל ראשים', help: ['חצים או A/D — לזוז, ↑ או W — לקפוץ', 'רווח או ↓ — לבעוט. קפוץ אל הכדור כדי לנגוח', 'כשמד הכוח ⚡ מתמלא — הבעיטה הבאה היא בעיטת אש!', '90 שניות. מי שמבקיע יותר מנצח', '2 שחקנים: שחקן 1 — W A D ובעיטה ב-S, שחקן 2 — החצים ובעיטה ב-↓'], helpTouch: ['◀ ▶ — לזוז, ⤒ — לקפוץ, 👟 — לבעוט', 'כשמד הכוח ⚡ מתמלא — הבעיטה הבאה היא בעיטת אש!', '90 שניות. מי שמבקיע יותר מנצח'], goal: 'גול!', final: 'התוצאה', golden: 'שוויון! גול הזהב מנצח', goldenShort: 'גול הזהב', power: 'בעיטת אש!', you: 'אתה', winsOn: 'ניצחונות ברמה {d}: {n}', winsLbl: 'ניצחונות', tally: 'ניצחונות: שחקן 1 — {a} · שחקן 2 — {b}', timeUp: 'נגמר הזמן!' },
      en: { title: 'Big Head Soccer', help: ['Arrows or A/D — move, ↑ or W — jump', 'Space or ↓ — kick. Jump into the ball to head it', 'When the ⚡ power meter is full, your next kick is a fire shot!', '90 seconds. Whoever scores more wins', '2 players: player 1 — W A D, kick with S; player 2 — arrows, kick with ↓'], helpTouch: ['◀ ▶ — move, ⤒ — jump, 👟 — kick', 'When the ⚡ power meter is full, your next kick is a fire shot!', '90 seconds. Whoever scores more wins'], goal: 'GOAL!', final: 'Final score', golden: 'Tied! Golden goal wins', goldenShort: 'Golden goal', power: 'FIRE SHOT!', you: 'You', winsOn: 'Wins on {d}: {n}', winsLbl: 'Wins', tally: 'Wins: player 1 — {a} · player 2 — {b}', timeUp: "Time's up!" },
      ar: { title: 'كرة الرؤوس', help: ['الأسهم أو A/D — للتحرك، ↑ أو W — للقفز', 'المسافة أو ↓ — للركل. اقفز نحو الكرة لتضربها برأسك', 'عندما يمتلئ مقياس القوة ⚡ تصبح ركلتك التالية ركلة نارية!', '90 ثانية. من يسجل أكثر يفوز', 'لاعبان: اللاعب 1 — W A D والركل بـ S، اللاعب 2 — الأسهم والركل بـ ↓'], helpTouch: ['◀ ▶ — للتحرك، ⤒ — للقفز، 👟 — للركل', 'عندما يمتلئ مقياس القوة ⚡ تصبح ركلتك التالية ركلة نارية!', '90 ثانية. من يسجل أكثر يفوز'], goal: 'هدف!', final: 'النتيجة', golden: 'تعادل! الهدف الذهبي يفوز', goldenShort: 'الهدف الذهبي', power: 'ركلة نارية!', you: 'أنت', winsOn: 'الانتصارات في مستوى {d}: {n}', winsLbl: 'الانتصارات', tally: 'الانتصارات: اللاعب 1 — {a} · اللاعب 2 — {b}', timeUp: 'انتهى الوقت!' },
      es: { title: 'Fútbol Cabezón', help: ['Flechas o A/D — moverte, ↑ o W — saltar', 'Espacio o ↓ — patear. Salta hacia la pelota para cabecear', '¡Cuando el medidor ⚡ se llena, tu próxima patada es de fuego!', '90 segundos. Gana quien marque más', '2 jugadores: jugador 1 — W A D y patea con S; jugador 2 — flechas y patea con ↓'], helpTouch: ['◀ ▶ — moverte, ⤒ — saltar, 👟 — patear', '¡Cuando el medidor ⚡ se llena, tu próxima patada es de fuego!', '90 segundos. Gana quien marque más'], goal: '¡GOL!', final: 'Resultado', golden: '¡Empate! Gana el gol de oro', goldenShort: 'Gol de oro', power: '¡TIRO DE FUEGO!', you: 'Tú', winsOn: 'Victorias en {d}: {n}', winsLbl: 'Victorias', tally: 'Victorias: jugador 1 — {a} · jugador 2 — {b}', timeUp: '¡Se acabó el tiempo!' },
      fr: { title: 'Foot Grosses Têtes', help: ['Flèches ou A/D — bouger, ↑ ou W — sauter', 'Espace ou ↓ — tirer. Saute vers le ballon pour faire une tête', 'Quand la jauge ⚡ est pleine, ton prochain tir est une frappe de feu !', '90 secondes. Celui qui marque le plus gagne', '2 joueurs : joueur 1 — W A D, tir avec S ; joueur 2 — flèches, tir avec ↓'], helpTouch: ['◀ ▶ — bouger, ⤒ — sauter, 👟 — tirer', 'Quand la jauge ⚡ est pleine, ton prochain tir est une frappe de feu !', '90 secondes. Celui qui marque le plus gagne'], goal: 'BUT !', final: 'Score final', golden: 'Égalité ! Le but en or gagne', goldenShort: 'But en or', power: 'FRAPPE DE FEU !', you: 'Toi', winsOn: 'Victoires en {d} : {n}', winsLbl: 'Victoires', tally: 'Victoires : joueur 1 — {a} · joueur 2 — {b}', timeUp: 'Temps écoulé !' },
      pt: { title: 'Futebol Cabeção', help: ['Setas ou A/D — mover, ↑ ou W — pular', 'Espaço ou ↓ — chutar. Pule na bola para cabecear', 'Quando o medidor ⚡ enche, o próximo chute é de fogo!', '90 segundos. Quem marcar mais vence', '2 jogadores: jogador 1 — W A D, chuta com S; jogador 2 — setas, chuta com ↓'], helpTouch: ['◀ ▶ — mover, ⤒ — pular, 👟 — chutar', 'Quando o medidor ⚡ enche, o próximo chute é de fogo!', '90 segundos. Quem marcar mais vence'], goal: 'GOL!', final: 'Placar final', golden: 'Empate! O gol de ouro vence', goldenShort: 'Gol de ouro', power: 'CHUTE DE FOGO!', you: 'Você', winsOn: 'Vitórias no {d}: {n}', winsLbl: 'Vitórias', tally: 'Vitórias: jogador 1 — {a} · jogador 2 — {b}', timeUp: 'Acabou o tempo!' },
      ru: { title: 'Футбол головами', help: ['Стрелки или A/D — двигаться, ↑ или W — прыжок', 'Пробел или ↓ — удар. Прыгни к мячу, чтобы ударить головой', 'Когда шкала силы ⚡ заполнится, следующий удар будет огненным!', '90 секунд. Побеждает тот, кто забьёт больше', '2 игрока: игрок 1 — W A D, удар S; игрок 2 — стрелки, удар ↓'], helpTouch: ['◀ ▶ — двигаться, ⤒ — прыжок, 👟 — удар', 'Когда шкала силы ⚡ заполнится, следующий удар будет огненным!', '90 секунд. Побеждает тот, кто забьёт больше'], goal: 'ГОЛ!', final: 'Счёт', golden: 'Ничья! Золотой гол побеждает', goldenShort: 'Золотой гол', power: 'ОГНЕННЫЙ УДАР!', you: 'Ты', winsOn: 'Победы, уровень «{d}»: {n}', winsLbl: 'Победы', tally: 'Победы: игрок 1 — {a} · игрок 2 — {b}', timeUp: 'Время вышло!' },
      de: { title: 'Großkopf-Fußball', help: ['Pfeile oder A/D — laufen, ↑ oder W — springen', 'Leertaste oder ↓ — schießen. Spring zum Ball für einen Kopfball', 'Ist die ⚡-Kraftanzeige voll, wird dein nächster Schuss ein Feuerschuss!', '90 Sekunden. Wer mehr Tore schießt, gewinnt', '2 Spieler: Spieler 1 — W A D, Schuss mit S; Spieler 2 — Pfeile, Schuss mit ↓'], helpTouch: ['◀ ▶ — laufen, ⤒ — springen, 👟 — schießen', 'Ist die ⚡-Kraftanzeige voll, wird dein nächster Schuss ein Feuerschuss!', '90 Sekunden. Wer mehr Tore schießt, gewinnt'], goal: 'TOR!', final: 'Endstand', golden: 'Unentschieden! Das goldene Tor gewinnt', goldenShort: 'Goldenes Tor', power: 'FEUERSCHUSS!', you: 'Du', winsOn: 'Siege auf {d}: {n}', winsLbl: 'Siege', tally: 'Siege: Spieler 1 — {a} · Spieler 2 — {b}', timeUp: 'Zeit ist um!' },
    },

    setup(g) {
      g.s = { tally: [0, 0] };
      // kit.js קורא ל-document.fonts.load() בלי catch: אם קובץ הפונט Heebo לא נטען (תקלת רשת), זה נהיה
      // "Uncaught (in promise) NetworkError". המשחק הזה לא פונה לרשת בכלל, אז שגיאת רשת כזאת היא של הפונט.
      g.fontGuard = e => { if (e.reason && e.reason.name === 'NetworkError') e.preventDefault(); };
      window.addEventListener('unhandledrejection', g.fontGuard);
    },

    destroy(g) { if (g.fontGuard) window.removeEventListener('unhandledrejection', g.fontGuard); },

    init(g) {
      const tally = g.s ? g.s.tally : [0, 0];
      const prm = AIP[g.diff] || AIP[1];
      const S = g.s = {
        tally, frame: 0, score: [0, 0], clock: MATCH * 60, golden: false,
        players: [newPlayer(0, lookFor(g, 0)), g.mode === 'cpu' && !g.demo ? newPlayer(1, lookFor(g, 1), prm.spd, prm.kk) : newPlayer(1, lookFor(g, 1))],
        ball: newBall(W / 2, 150), hist: [], phase: 'intro', phaseT: 70, scorer: 0, celeb: 'flip', celebI: 0, celebOrder: CELEBS.slice(),
        goalT: 0, crowd: 0, barShake: [0, 0], touches: 0, botIn: null, tHeld: {},
        stats: g.load('stats', { w: [0, 0, 0], d: [0, 0, 0], l: [0, 0, 0] }),
      };
      g.shuffle(S.celebOrder);
      if (g.demo) {
        S.phase = 'play'; S.ball.held = false; S.ball.x = W / 2 - 60; S.ball.y = 330; S.ball.vx = 3; S.ball.vy = -6;
        S.players[0].x = S.players[0].px = 330; S.players[1].x = S.players[1].px = 640;
        S.score = [2, 1];
        for (let i = 0; i < 30; i++) tick(g);
      } else whistle(g);
    },

    step(g) {
      const S = g.s;
      if (S.phase === 'intro' && --S.phaseT <= 0) { S.phase = 'kick'; S.phaseT = 10; }
      if (S.phase !== 'over') tick(g);
      if (g.mode === 'cpu') {
        g.hud([[g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff]), '#ffd24d'], [g.t('winsLbl'), S.stats.w[g.diff]]]);
      } else g.hud([[g.t('p1'), '🏆 ' + S.tally[0], '#7fb3ff'], [g.t('p2'), '🏆 ' + S.tally[1], '#ff8f8f']]);
    },

    // במסך התפריט שני המחשבים משחקים מאחור
    idle(g) { if (g.demo && g.s && g.s.players) tick(g); else if (g.s && g.s.frame != null) g.s.frame++; },

    // בוט לבדיקות: משחק את שחקן 1 דרך אותו קלט כמו אדם
    bot(g) { const S = g.s; if (S && S.players) S.botIn = aiCtrl(g, S.players[0], AIP[1]); },

    draw(g, ctx, alpha) {
      if (!g.s || !g.s.players) return;
      drawScene(g, ctx, alpha);
      drawHudCanvas(g, ctx);
    },

    cover(ctx, w, h, k) {
      const sx = w / W, sy = h / H;
      ctx.save(); ctx.scale(sx, sy);
      paintBack(ctx, k);
      paintCrowd(ctx, k, true);
      drawGoalBack(k, ctx, 1, 0);
      const p1 = newPlayer(0, LOOKS.blue), p2 = newPlayer(1, LOOKS.red);
      p1.x = 380; p1.y = GROUND - 70; p1.kickT = 6;
      p2.x = 690; p2.y = GROUND; p2.mood = 0;
      const ball = { x: 560, y: 300 };
      // שובל האש
      for (let i = 9; i >= 1; i--) {
        ctx.globalAlpha = 0.09 * (10 - i);
        k.circle(ctx, ball.x - i * 18, ball.y + i * 5, BR + 10 - i * 0.6); ctx.fillStyle = i > 4 ? '#ff6a1d' : '#ffd24d'; ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawPlayer(k, ctx, p2, p2.x, p2.y, p2.look, ball, 0);
      drawPlayer(k, ctx, p1, p1.x, p1.y, p1.look, ball, 0);
      ctx.save(); ctx.translate(ball.x, ball.y); ctx.scale(1.5, 1.5); ctx.translate(-ball.x, -ball.y);
      drawBall(k, ctx, ball.x, ball.y, 0.4, 30);
      ctx.restore();
      drawGoalFront(k, ctx, 1, 0);
      ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
  });
})();
