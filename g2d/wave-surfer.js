// ============================================================
//  גולש הגלים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  גלים מסכום של סינוסים שזזים. מחזיקים כדי ללחוץ את הגל ולתפוס מהירות בירידה,
//  משחררים בעלייה ועפים מהפסגה. באוויר מסתובבים לסלטות, ונוחתים מקבילים לגל — או נופלים.
//  סשן של 90 שניות עם שיא.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540;
  const SESSION = 90 * 60;
  const G = 0.25, G_AIR = 0.17, G_DIVE = 0.55;
  const VMIN = 3.4, VMAX = 17;
  const ROT = 0.16;                                 // מהירות סיבוב באוויר (רדיאנים לצעד) — סלטה בכ-0.65 שנייה
  const TOL = [0.82, 0.6, 0.46];                    // כמה סטייה מהגל מותר בנחיתה
  const ALIGN = [0.05, 0.022, 0];                   // יישור עצמי עדין באוויר (עוזר בקל)
  const WAVE = [0.9, 1, 1.13];
  const FLIP_PTS = [0, 200, 500, 900, 1400, 2000];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrapA = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
  const TAU = Math.PI * 2;
  const K1 = TAU / 900, K2 = TAU / 410, K3 = TAU / 160;
  const C1 = 1.5, C2 = 1.05, C3 = -0.6;

  // גובה הגל (חיובי = למעלה) והשיפוע שלו
  function waveH(S, x, t) {
    const m = S.wm, a1 = (80 + 36 * Math.sin(x / 2600 + 1.3)) * m;
    return a1 * Math.sin(K1 * (x - C1 * t)) + 30 * m * Math.sin(K2 * (x - C2 * t) + 1.7) + 5 * Math.sin(K3 * (x - C3 * t) + 0.6);
  }
  function waveD(S, x, t) {
    const m = S.wm, ph1 = K1 * (x - C1 * t), a1 = (80 + 36 * Math.sin(x / 2600 + 1.3)) * m, da1 = 36 * m * Math.cos(x / 2600 + 1.3) / 2600;
    return a1 * K1 * Math.cos(ph1) + da1 * Math.sin(ph1) + 30 * m * K2 * Math.cos(K2 * (x - C2 * t) + 1.7) + 5 * K3 * Math.cos(K3 * (x - C3 * t) + 0.6);
  }
  const surfY = (S, x, t) => -waveH(S, x, t);           // y בעולם (למטה חיובי)
  const slopeA = (S, x, t) => Math.atan(-waveD(S, x, t)); // זווית הגל על המסך

  function newState(diff, demo) {
    const S = {
      diff, demo, wm: WAVE[diff], t: 0,
      x: 200, y: 0, vx: VMIN + 1, vy: 0, s: VMIN + 1, ang: 0, air: false, airT: 0, rot: 0,
      wipe: 0, crouch: 0, hold: false, ptr: null, dragRot: 0,
      score: 0, stars: [], nextStar: 700, combo: 0, best: 0, flips: 0, landings: 0, wipes: 0, starsGot: 0,
      timeLeft: SESSION, camX: 0, camY: -300, z: 1, pcamX: 0, pcamY: -300, pz: 1, px: 200, py: 0, pang: 0,
      distPts: 0, lastX: 200, trail: 0, msgT: 0, rnd: Math.random, warned: false,
      board: { x: 0, y: 0, vx: 0, vy: 0, a: 0 }, swim: 0,
    };
    S.y = surfY(S, S.x, 0);
    spawnStars(S);
    camUpdate(S, true);
    return S;
  }
  // כוכבים בקשתות מעל הגלים
  function spawnStars(S) {
    while (S.nextStar < S.x + W * 2.2) {
      const x0 = S.nextStar, n = 4 + Math.floor(S.rnd() * 3), hi = 70 + S.rnd() * 190, spread = 46;
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : 0.5;
        S.stars.push({ x: x0 + i * spread, h: hi + Math.sin(u * Math.PI) * 40, got: false, ph: S.rnd() * 6 });
      }
      S.nextStar += 520 + S.rnd() * 520;
    }
    while (S.stars.length && S.stars[0].x < S.x - W) S.stars.shift();
  }

  // ----- הפיזיקה -----
  function physics(g, S, hold, rotIn) {
    S.t++;
    S.px = S.x; S.py = S.y; S.pang = S.ang;
    const tol = TOL[S.diff];
    if (S.wipe > 0) {
      // נפילה: הגולש שוחה בחזרה לגלשן
      S.wipe--;
      S.x += VMIN * 0.6; S.y = surfY(S, S.x, S.t) + 6;
      S.ang = slopeA(S, S.x, S.t);
      const b = S.board; b.vy += 0.25; b.x += b.vx; b.y += b.vy; b.a += 0.12; b.vx *= 0.98;
      const by = surfY(S, b.x, S.t); if (b.y > by) { b.y = by; b.vy *= -0.3; b.vx *= 0.9; }
      if (S.wipe === 0) { S.s = VMIN + 0.5; S.air = false; S.crouch = 0; }
      return;
    }
    if (!S.air) {
      const d = waveD(S, S.x, S.t), n = Math.sqrt(1 + d * d);
      const ge = hold ? G * 2.6 : G;
      S.s += -ge * d / n;                       // בירידה (d<0) מאיצים
      S.s = clamp(S.s * 0.9975, VMIN, VMAX);
      const vx = S.s / n, nx = S.x + vx, ny = surfY(S, nx, S.t);
      const vy = ny - S.py;                     // כולל את עליית הגל עצמו
      // האם הגולש עף? (בלי לחיצה, כשהגל נעלם מתחתיו)
      if (!hold && vy < -0.4) {
        const yFree = ny + vy + G_AIR, ySurf = surfY(S, nx + vx, S.t + 1);
        if (yFree < ySurf - 0.6) {
          S.air = true; S.airT = 0; S.rot = 0;
          S.vx = vx; S.vy = vy; S.x = nx; S.y = ny;
          if (!S.demo) g.noise({ filter: 'bandpass', f: 900, f2: 2400, dur: 0.22, vol: 0.06, q: 0.8 });
          return;
        }
      }
      S.x = nx; S.y = ny;
      S.ang = slopeA(S, nx, S.t);
      S.vx = vx; S.vy = vy;
      S.crouch += ((hold ? 1 : 0) - S.crouch) * 0.25;
      return;
    }
    // באוויר
    S.airT++;
    S.vy += hold ? G_DIVE : G_AIR;
    S.x += S.vx; S.y += S.vy;
    const before = S.ang;
    S.ang += rotIn * ROT;
    if (!rotIn && ALIGN[S.diff]) {
      // יישור עדין לכיוון התנועה, רק כשלא מסתובבים
      const want = Math.atan2(S.vy, S.vx);
      S.ang += clamp(wrapA(want - S.ang), -1, 1) * ALIGN[S.diff];
    }
    S.rot += S.ang - before;
    S.crouch += (0.35 - S.crouch) * 0.2;
    const ys = surfY(S, S.x, S.t);
    if (S.y >= ys) land(g, S, ys, tol);
  }
  function land(g, S, ys, tol) {
    const a = slopeA(S, S.x, S.t), diff = Math.abs(wrapA(S.ang - a));
    S.y = ys; S.air = false;
    const flips = Math.floor((Math.abs(S.rot) + 0.9) / TAU);
    const sx = S.x, sy = S.y;
    if (diff > tol) {
      // נפילה
      S.wipe = 72; S.wipes++; S.combo = 0;
      S.board = { x: S.x, y: S.y - 4, vx: S.vx * 0.6, vy: -4, a: S.ang };
      S.s = VMIN;
      if (!S.demo) {
        g.burst(screenX(S, sx), screenY(S, sy), { n: 34, color: ['#ffffff', '#bdf3ff', '#7fd9ff'], speed: 4.5, life: 40, gravity: 0.18, dir: -Math.PI / 2, spread: 2.6 });
        g.sfx('splash'); g.shake(5);
        floatTxt(g, S, g.t('wipe'), '#ff8a8a', 26);
      }
      return;
    }
    // נחיתה טובה: שומרים את המהירות לאורך הגל (ההיטל של מהירות המעוף על השיפוע)
    S.s = clamp(S.vx * Math.cos(a) + S.vy * Math.sin(a), VMIN, VMAX);
    S.ang = a;
    S.landings++;
    let pts = 0, txt = '';
    if (flips > 0) {
      S.combo = Math.min(S.combo + 1, 5);
      const base = FLIP_PTS[Math.min(flips, FLIP_PTS.length - 1)] + Math.max(0, flips - 5) * 600;
      pts = base * S.combo;
      S.flips += flips;
      txt = g.t(flips === 1 ? 'flip1' : flips === 2 ? 'flip2' : flips === 3 ? 'flip3' : 'flipN', { k: flips, n: pts });
    }
    const perfect = diff < 0.16;
    if (perfect) { pts += 50; S.s = Math.min(VMAX, S.s + 1.6); }
    if (S.airT > 60) pts += Math.round((S.airT - 60) * 1.5);
    S.score += pts;
    if (!S.demo) {
      g.burst(screenX(S, sx), screenY(S, sy), { n: 16, color: ['#ffffff', '#c9f6ff'], speed: 3, life: 26, gravity: 0.15, dir: -Math.PI / 2, spread: 2.2 });
      if (flips > 0) { floatTxt(g, S, txt, '#ffd84d', 28); g.sfx(S.combo > 1 ? 'power' : 'score', { p: 1 + S.combo * 0.06 }); if (S.combo > 1) g.msg(g.t('combo', { n: S.combo }), 900, '#ffd84d'); }
      else g.sfx('splash');
      if (perfect) { floatTxt(g, S, g.t('perfect'), '#7be0ff', 22, 30); g.tone({ f: 1200, f2: 1800, dur: 0.12, vol: 0.08 }); }
    }
  }
  function floatTxt(g, S, s, color, size, dy) { g.float(screenX(S, S.x), screenY(S, S.y) - 50 - (dy || 0), s, { color, size }); }
  // מיקום על המסך (בשביל חלקיקים וטקסט צף של המנוע, שמצוירים בלי המצלמה)
  const screenX = (S, x) => (x - S.camX) * S.z;
  const screenY = (S, y) => (y - S.camY) * S.z;

  function camUpdate(S, snap) {
    S.pcamX = S.camX; S.pcamY = S.camY; S.pz = S.z;
    const top = Math.min(S.y, -150) - 120, bottom = 175;
    const zt = clamp(H / (bottom - top), 0.5, 1);
    S.z = snap ? zt : S.z + (zt - S.z) * 0.06;
    S.camX = S.x - 270 / S.z;
    const ct = bottom - H / S.z;
    S.camY = snap ? ct : S.camY + (ct - S.camY) * 0.2;
    if (snap) { S.pcamX = S.camX; S.pcamY = S.camY; S.pz = S.z; }
  }

  function collect(g, S) {
    for (const st of S.stars) {
      if (st.got || Math.abs(st.x - S.x) > 40) continue;
      const sy = surfY(S, st.x, S.t) - st.h;
      if (Math.hypot(st.x - S.x, sy - (S.y - 18)) < 30) {
        st.got = true; S.starsGot++;
        S.score += 25;
        if (!S.demo) {
          g.burst(screenX(S, st.x), screenY(S, sy), { n: 12, color: ['#ffe066', '#fff6c2', '#ffb300'], speed: 2.6, life: 26, gravity: 0 });
          g.float(screenX(S, st.x), screenY(S, sy) - 16, '+25', { color: '#ffe066', size: 20 });
          g.sfx('coin', { p: 1 + (S.starsGot % 5) * 0.06 });
        }
      }
    }
  }

  function gameStep(g, S, hold, rotIn) {
    physics(g, S, hold, rotIn);
    // נקודות על מרחק
    if (S.x - S.lastX >= 40) { const k = Math.floor((S.x - S.lastX) / 40); S.score += k; S.lastX += k * 40; }
    collect(g, S);
    spawnStars(S);
    camUpdate(S, false);
    if (!S.demo && !S.air && !S.wipe && S.s > 7 && S.t % 2 === 0) {
      g.burst(screenX(S, S.x - 16), screenY(S, S.y), { n: 2, color: ['#ffffff', '#d8f8ff'], speed: 1.6 + S.s * 0.12, life: 18, gravity: 0.12, dir: Math.PI + 0.5, spread: 0.8, size: 3 });
    }
  }

  // ----- בוט: לוחץ בירידה, משחרר בעלייה, ובאוויר מתכנן סלטות לפי הנחיתה הצפויה -----
  function predictLanding(S) {
    let x = S.x, y = S.y, vy = S.vy;
    for (let k = 1; k < 400; k++) {
      vy += G_AIR; x += S.vx; y += vy;
      const ys = surfY(S, x, S.t + k);
      if (y >= ys) return { k, a: slopeA(S, x, S.t + k) };
    }
    return { k: 400, a: 0 };
  }
  function botInput(S) {
    if (S.wipe) return { hold: false, rot: 0 };
    if (!S.air) {
      const d = waveD(S, S.x, S.t);
      // מחזיק בירידה, משחרר כשמגיעים לעלייה שמובילה לפסגה
      return { hold: d < 0.02, rot: 0 };
    }
    if (S.vy < 0 && S.airT < 4) S.botPlan = null;
    const L = predictLanding(S);
    if (!S.botPlan) {
      // כמה סלטות אפשר להספיק: כל סלטה צריכה ~55 צעדים, ועוד 14 צעדים ליישור
      const n = Math.max(0, Math.floor((L.k - 16) / (TAU / ROT + 2)));
      S.botPlan = { n, dir: -1 };
    }
    const target = L.a + S.botPlan.dir * S.botPlan.n * TAU;
    const curTotal = S.ang + 0;   // זווית מצטברת
    if (S.botBase === undefined || S.airT <= 1) S.botBase = S.ang - S.rot;
    const need = (S.botBase + S.botPlan.dir * S.botPlan.n * TAU + wrapA(L.a - S.botBase)) - curTotal;
    const rot = Math.abs(need) < ROT * 0.5 ? 0 : Math.sign(need);
    return { hold: false, rot, target };
  }

  // ----- ציור -----
  const SKY = ['#1d2b6b', '#4b3f8f', '#e0708a', '#ffb36b', '#ffd98e'];
  function drawSky(g, ctx, S, camX) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, SKY[0]); gr.addColorStop(0.35, SKY[1]); gr.addColorStop(0.62, SKY[2]); gr.addColorStop(0.8, SKY[3]); gr.addColorStop(1, SKY[4]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // שמש
    const sx = W * 0.72, sy = H * 0.6;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
    sg.addColorStop(0, 'rgba(255,240,190,.95)'); sg.addColorStop(0.25, 'rgba(255,214,140,.55)'); sg.addColorStop(1, 'rgba(255,160,120,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 190, sy - 190, 380, 380);
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, TAU); ctx.fill();
    // עננים
    ctx.fillStyle = 'rgba(255,225,235,.55)';
    for (let i = 0; i < 6; i++) {
      let cx = (i * 380 - camX * 0.08) % (W + 400); if (cx < -200) cx += W + 400;
      cx -= 200;
      const cy = 60 + (i * 53) % 150, s = 0.7 + (i % 3) * 0.25;
      for (const [ex, ey, rx, ry] of [[0, 0, 70, 18], [40, -10, 44, 20], [-38, -4, 36, 14]]) { ctx.beginPath(); ctx.ellipse(cx + ex * s, cy + ey * s, rx * s, ry * s, 0, 0, TAU); ctx.fill(); }
    }
    // איים רחוקים עם דקלים
    for (let i = 0; i < 3; i++) {
      let ix = (i * 760 + 300 - camX * 0.15) % (W + 760); if (ix < -380) ix += W + 760;
      ix -= 380;
      const iy = H * 0.62, iw = 150 + i * 40;
      ctx.fillStyle = 'rgba(94,52,92,.55)';
      ctx.beginPath(); ctx.ellipse(ix, iy, iw, 26, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(94,52,92,.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ix - 20, iy - 18); ctx.quadraticCurveTo(ix - 14, iy - 50, ix - 4, iy - 74); ctx.stroke();
      ctx.fillStyle = 'rgba(94,52,92,.6)';
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.62; ctx.beginPath(); ctx.ellipse(ix - 4 + Math.cos(a) * 16, iy - 74 + Math.sin(a) * 8, 18, 4, a, 0, TAU); ctx.fill(); }
    }
  }
  function drawBackWaves(ctx, S, camX, camY, z) {
    const layers = [{ p: 0.45, a: 26, k: TAU / 520, c: 'rgba(40,96,150,.75)', off: -70, sp: 0.9 }, { p: 0.7, a: 34, k: TAU / 640, c: 'rgba(28,118,160,.85)', off: -35, sp: 1.2 }];
    for (const L of layers) {
      const base = (L.off - camY) * z * L.p + H * (1 - L.p) * 0.62;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let sx = 0; sx <= W + 16; sx += 16) {
        const wx = sx / z + camX * L.p;
        ctx.lineTo(sx, base - (L.a * Math.sin(wx * L.k - S.t * 0.02 * L.sp) + 10 * Math.sin(wx * L.k * 2.3 + S.t * 0.03)) * z);
      }
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = L.c; ctx.fill();
    }
  }
  function drawSea(ctx, S, camX, camY, z, t) {
    const x0 = camX - 20, x1 = camX + W / z + 20, step = 8 / z;
    ctx.beginPath();
    ctx.moveTo(x0, camY + H / z + 10);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, surfY(S, x, t));
    ctx.lineTo(x1, camY + H / z + 10); ctx.closePath();
    const gr = ctx.createLinearGradient(0, -140, 0, 220);
    gr.addColorStop(0, '#3fe0e6'); gr.addColorStop(0.35, '#1aa6c7'); gr.addColorStop(1, '#0b3f73');
    ctx.fillStyle = gr; ctx.fill();
    // קצף לאורך הפסגות
    ctx.save();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) { const y = surfY(S, x, t); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.2 / Math.max(0.6, z); ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 12; ctx.stroke();
    ctx.restore();
    // נצנוצים ופסי אור במים
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) {
      const sx = x0 + ((i * 137.5 + Math.floor(t / 40) * 61) % (x1 - x0));
      const y = surfY(S, sx, t) + 18 + (i * 29) % 90;
      const a = 0.5 + 0.5 * Math.sin(t * 0.1 + i);
      ctx.globalAlpha = a * 0.6;
      ctx.fillRect(sx - 6, y, 12, 2);
    }
    ctx.globalAlpha = 1;
    // כתמי קצף על פסגות
    for (let x = Math.floor(x0 / 30) * 30; x <= x1; x += 30) {
      const d1 = waveD(S, x - 15, t), d2 = waveD(S, x + 15, t);
      if (d1 > 0.05 && d2 < -0.05) {
        const y = surfY(S, x, t);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath();
        for (const [ex, ey, rx, ry] of [[0, 2, 16, 5], [-12, 6, 8, 3], [14, 7, 7, 3]]) { ctx.moveTo(x + ex + rx, y + ey); ctx.ellipse(x + ex, y + ey, rx, ry, 0, 0, TAU); }
        ctx.fill();
      }
    }
  }
  function drawStar(ctx, x, y, r, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.05) * 0.3);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
    gr.addColorStop(0, 'rgba(255,230,120,.55)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gr; ctx.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, -r, 0, r); sg.addColorStop(0, '#fff6b0'); sg.addColorStop(1, '#ffb300');
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = '#c98200'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  // הגולש: ילד על גלשן. crouch 0..1, pose: 'ride' | 'air' | 'swim'
  function drawSurfer(ctx, x, y, ang, crouch, pose, t, noBoard) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (!noBoard) drawBoard(ctx, 0, 0, 0);
    if (pose === 'swim') { ctx.restore(); return; }
    const c = crouch, hipY = -22 + c * 7, kneeX = 7 + c * 3;
    // רגליים
    ctx.strokeStyle = '#2b5fd9'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-kneeX, hipY + 9); ctx.lineTo(-2, hipY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(kneeX + 4, hipY + 9); ctx.lineTo(3, hipY); ctx.stroke();
    // גוף
    const tx = 1 + c * 3, ty = hipY - 17 + c * 3;
    ctx.strokeStyle = '#ff6b4a'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(tx, ty); ctx.stroke();
    // ידיים לאיזון
    const arm = pose === 'air' ? Math.sin(t * 0.3) * 0.4 : 0.2;
    ctx.strokeStyle = '#ffcf9e'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(tx, ty + 3); ctx.lineTo(tx - 13, ty + 2 - 8 * Math.cos(arm)); ctx.lineTo(tx - 22, ty - 6 + Math.sin(arm) * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty + 3); ctx.lineTo(tx + 13, ty + 4 - 6 * Math.cos(arm)); ctx.lineTo(tx + 23, ty + 1 - Math.sin(arm) * 8); ctx.stroke();
    // ראש
    ctx.fillStyle = '#ffcf9e';
    ctx.beginPath(); ctx.arc(tx + 2, ty - 11, 8.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3418';
    ctx.beginPath(); ctx.arc(tx + 1, ty - 14, 8.6, Math.PI * 0.95, Math.PI * 2.1); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.ellipse(tx + 1, ty - 18, 9, 3.6, -0.1, Math.PI, TAU); ctx.fill();
    ctx.fillRect(tx + 4, ty - 19, 9, 2.6);
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(tx + 6, ty - 11, 1.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(tx + 5, ty - 8, 2.6, 0.2, 1.4); ctx.stroke();
    ctx.restore();
  }
  function drawBoard(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const gr = ctx.createLinearGradient(-30, 0, 30, 0);
    gr.addColorStop(0, '#ff4f8b'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#3fd0ff');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-30, -2); ctx.quadraticCurveTo(0, -8, 34, -3); ctx.quadraticCurveTo(38, 0, 32, 2); ctx.quadraticCurveTo(0, 5, -30, 2); ctx.quadraticCurveTo(-33, 0, -30, -2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-24, -1.5); ctx.lineTo(28, -2.5); ctx.stroke();
    ctx.fillStyle = '#2a2a40'; ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(-28, 9); ctx.lineTo(-20, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawScene(g, ctx, S, alpha) {
    const camX = S.pcamX + (S.camX - S.pcamX) * alpha, camY = S.pcamY + (S.camY - S.pcamY) * alpha, z = S.pz + (S.z - S.pz) * alpha;
    const t = S.t - 1 + alpha;
    drawSky(g, ctx, S, camX);
    drawBackWaves(ctx, S, camX, camY, z);
    ctx.save();
    ctx.scale(z, z); ctx.translate(-camX, -camY);
    drawSea(ctx, S, camX, camY, z, t);
    for (const st of S.stars) {
      if (st.got || st.x < camX - 40 || st.x > camX + W / z + 40) continue;
      drawStar(ctx, st.x, surfY(S, st.x, t) - st.h + Math.sin(t * 0.06 + st.ph) * 4, 13, t + st.ph * 20);
    }
    const x = S.px + (S.x - S.px) * alpha, y = S.py + (S.y - S.py) * alpha;
    let ang = S.pang + wrapA(S.ang - S.pang) * alpha;
    if (S.wipe) {
      const b = S.board;
      drawBoard(ctx, b.x, b.y, b.a);
      // הגולש במים: ראש וידיים
      const hy = surfY(S, x, t);
      ctx.fillStyle = '#ffcf9e'; ctx.beginPath(); ctx.arc(x, hy - 3, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.arc(x - 1, hy - 6, 8, Math.PI * 0.95, Math.PI * 2.1); ctx.fill();
      ctx.strokeStyle = '#ffcf9e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const sw = Math.sin(S.t * 0.25) * 6;
      ctx.beginPath(); ctx.moveTo(x - 6, hy); ctx.lineTo(x - 14, hy - 8 + sw); ctx.moveTo(x + 6, hy); ctx.lineTo(x + 14, hy - 8 - sw); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.ellipse(x, hy + 3, 18, 4, 0, 0, TAU); ctx.fill();
    } else if (S.big) { ctx.save(); ctx.translate(x, y); ctx.scale(S.big, S.big); drawSurfer(ctx, 0, 0, ang, S.crouch, 'air', S.t); ctx.restore(); }
    else drawSurfer(ctx, x, y, ang, S.crouch, S.air ? 'air' : 'ride', S.t);
    ctx.restore();
  }

  GK.register('wave-surfer', {
    w: W, h: H, bg: '#1d2b6b', accent: '#ffd23f',
    diffs: true,
    touch: [['ArrowLeft', '⟲'], ['ArrowRight', '⟳'], null, ['Space', '⤓']],
    text: {
      he: { title: 'גולש הגלים', help: ['החזק רווח, ↓ או את העכבר — לוחצים את הגל ותופסים מהירות בירידה', 'שחרר בעלייה כדי לעוף מעל פסגת הגל', 'באוויר: ← → או גרירה — סלטות! נחת מקביל לגל, אחרת תיפול', 'אסוף כוכבים. יש לך 90 שניות'], helpTouch: ['החזק את המסך — לוחצים את הגל ותופסים מהירות בירידה', 'שחרר בעלייה כדי לעוף מעל הפסגה', 'באוויר: גרור ימינה ושמאלה או לחץ ⟲ ⟳ — סלטות!', 'נחת מקביל לגל ואסוף כוכבים. 90 שניות!'], flip1: 'סלטה! +{n}', flip2: 'סלטה כפולה! +{n}', flip3: 'סלטה משולשת! +{n}', flipN: '{k} סלטות! +{n}', perfect: 'נחיתה מושלמת!', wipe: 'אופס, נפלת!', combo: 'קומבו ×{n}', hurry: 'עוד 10 שניות!', tip: 'החזק בירידה, שחרר בעלייה', result: '{f} סלטות · {s} כוכבים' },
      en: { title: 'Wave Surfer', help: ['Hold Space, ↓ or the mouse — press into the wave to gain speed going down', 'Release on the way up to fly off the crest', 'In the air: ← → or drag to flip! Land along the wave or you wipe out', 'Collect stars. You have 90 seconds'], helpTouch: ['Hold the screen — press into the wave to gain speed going down', 'Release on the way up to fly off the crest', 'In the air: drag left and right or press ⟲ ⟳ to flip!', 'Land along the wave and collect stars. 90 seconds!'], flip1: 'Flip! +{n}', flip2: 'Double flip! +{n}', flip3: 'Triple flip! +{n}', flipN: '{k} flips! +{n}', perfect: 'Perfect landing!', wipe: 'Wipeout!', combo: 'Combo ×{n}', hurry: '10 seconds left!', tip: 'Hold going down, release going up', result: '{f} flips · {s} stars' },
      ar: { title: 'راكب الأمواج', help: ['اضغط مطولاً على المسافة أو ↓ أو الفأرة — اضغط الموجة لتكسب سرعة في النزول', 'اترك في الصعود لتطير فوق قمة الموجة', 'في الهواء: ← → أو السحب — شقلبات! انزل موازياً للموجة وإلا ستسقط', 'اجمع النجوم. لديك 90 ثانية'], helpTouch: ['اضغط مطولاً على الشاشة — اضغط الموجة لتكسب سرعة', 'اترك في الصعود لتطير فوق القمة', 'في الهواء: اسحب يميناً ويساراً أو اضغط ⟲ ⟳ للشقلبة!', 'انزل موازياً للموجة واجمع النجوم. 90 ثانية!'], flip1: 'شقلبة! +{n}', flip2: 'شقلبة مزدوجة! +{n}', flip3: 'شقلبة ثلاثية! +{n}', flipN: '{k} شقلبات! +{n}', perfect: 'هبوط مثالي!', wipe: 'أوه، سقطت!', combo: 'كومبو ×{n}', hurry: 'بقيت 10 ثوانٍ!', tip: 'اضغط في النزول واترك في الصعود', result: '{f} شقلبات · {s} نجوم' },
      es: { title: 'Surfista de olas', help: ['Mantén Espacio, ↓ o el ratón: aprieta la ola para ganar velocidad al bajar', 'Suelta al subir para volar sobre la cresta', 'En el aire: ← → o arrastra para dar volteretas. Aterriza paralelo a la ola o te caes', 'Atrapa estrellas. Tienes 90 segundos'], helpTouch: ['Mantén pulsada la pantalla: aprieta la ola para ganar velocidad', 'Suelta al subir para volar sobre la cresta', 'En el aire: arrastra a los lados o pulsa ⟲ ⟳ para girar', 'Aterriza paralelo a la ola y atrapa estrellas. ¡90 segundos!'], flip1: '¡Voltereta! +{n}', flip2: '¡Doble voltereta! +{n}', flip3: '¡Triple voltereta! +{n}', flipN: '¡{k} volteretas! +{n}', perfect: '¡Aterrizaje perfecto!', wipe: '¡Te caíste!', combo: 'Combo ×{n}', hurry: '¡Quedan 10 segundos!', tip: 'Aprieta al bajar, suelta al subir', result: '{f} volteretas · {s} estrellas' },
      fr: { title: 'Surfeur des vagues', help: ["Maintiens Espace, ↓ ou la souris : appuie sur la vague pour prendre de la vitesse en descente", 'Relâche en montée pour décoller de la crête', "En l'air : ← → ou glisse pour faire des saltos. Atterris le long de la vague, sinon tu tombes", "Attrape les étoiles. Tu as 90 secondes"], helpTouch: ["Maintiens l'écran : appuie sur la vague pour prendre de la vitesse", 'Relâche en montée pour décoller de la crête', "En l'air : glisse à gauche et à droite ou appuie sur ⟲ ⟳", 'Atterris le long de la vague et attrape les étoiles. 90 secondes !'], flip1: 'Salto ! +{n}', flip2: 'Double salto ! +{n}', flip3: 'Triple salto ! +{n}', flipN: '{k} saltos ! +{n}', perfect: 'Atterrissage parfait !', wipe: 'Oups, chute !', combo: 'Combo ×{n}', hurry: 'Encore 10 secondes !', tip: 'Appuie en descente, relâche en montée', result: '{f} saltos · {s} étoiles' },
      pt: { title: 'Surfista das Ondas', help: ['Segure Espaço, ↓ ou o mouse: aperte a onda para ganhar velocidade na descida', 'Solte na subida para voar da crista', 'No ar: ← → ou arraste para dar mortais. Aterrisse paralelo à onda ou você cai', 'Pegue estrelas. Você tem 90 segundos'], helpTouch: ['Segure a tela: aperte a onda para ganhar velocidade', 'Solte na subida para voar da crista', 'No ar: arraste para os lados ou toque ⟲ ⟳ para dar mortais!', 'Aterrisse paralelo à onda e pegue estrelas. 90 segundos!'], flip1: 'Mortal! +{n}', flip2: 'Mortal duplo! +{n}', flip3: 'Mortal triplo! +{n}', flipN: '{k} mortais! +{n}', perfect: 'Aterrissagem perfeita!', wipe: 'Ops, caiu!', combo: 'Combo ×{n}', hurry: 'Faltam 10 segundos!', tip: 'Segure na descida, solte na subida', result: '{f} mortais · {s} estrelas' },
      ru: { title: 'Покоритель волн', help: ['Держи пробел, ↓ или мышь — дави на волну и разгоняйся на спуске', 'Отпусти на подъёме, чтобы взлететь с гребня', 'В воздухе: ← → или перетаскивание — сальто! Приземляйся вдоль волны, иначе упадёшь', 'Собирай звёзды. У тебя 90 секунд'], helpTouch: ['Держи палец на экране — дави на волну и разгоняйся', 'Отпусти на подъёме, чтобы взлететь с гребня', 'В воздухе: веди пальцем влево-вправо или жми ⟲ ⟳ — сальто!', 'Приземляйся вдоль волны и собирай звёзды. 90 секунд!'], flip1: 'Сальто! +{n}', flip2: 'Двойное сальто! +{n}', flip3: 'Тройное сальто! +{n}', flipN: '{k} сальто! +{n}', perfect: 'Идеальное приземление!', wipe: 'Ой, упал!', combo: 'Комбо ×{n}', hurry: 'Осталось 10 секунд!', tip: 'Дави на спуске, отпускай на подъёме', result: 'сальто: {f} · звёзды: {s}' },
      de: { title: 'Wellenreiter', help: ['Halte Leertaste, ↓ oder die Maus – drück in die Welle und werde bergab schneller', 'Lass beim Aufstieg los, um vom Wellenkamm zu fliegen', 'In der Luft: ← → oder Ziehen für Saltos! Lande parallel zur Welle, sonst stürzt du', 'Sammle Sterne. Du hast 90 Sekunden'], helpTouch: ['Halte den Bildschirm – drück in die Welle und werde schneller', 'Lass beim Aufstieg los, um vom Kamm zu fliegen', 'In der Luft: nach links und rechts ziehen oder ⟲ ⟳ drücken!', 'Lande parallel zur Welle und sammle Sterne. 90 Sekunden!'], flip1: 'Salto! +{n}', flip2: 'Doppelsalto! +{n}', flip3: 'Dreifachsalto! +{n}', flipN: '{k} Saltos! +{n}', perfect: 'Perfekte Landung!', wipe: 'Hoppla, gestürzt!', combo: 'Combo ×{n}', hurry: 'Noch 10 Sekunden!', tip: 'Bergab halten, bergauf loslassen', result: '{f} Saltos · {s} Sterne' },
    },

    init(g) {
      g.s = newState(g.diff, g.demo);
      if (g.demo) for (let i = 0; i < 500; i++) { const b = botInput(g.s); gameStep(g, g.s, b.hold, b.rot); }
    },
    idle(g) {
      const S = g.s;
      if (!S) return;
      if (g.demo) { const b = botInput(S); gameStep(g, S, b.hold, b.rot); return; }
      // אחרי הסוף: הגלים ממשיכים לזוז
      S.pcamX = S.camX; S.pcamY = S.camY; S.pz = S.z; S.px = S.x; S.py = S.y; S.pang = S.ang;
      S.t++;
      if (!S.air && !S.wipe) S.y = surfY(S, S.x, S.t);
    },

    step(g) {
      const S = g.s;
      const ptrHold = S.ptr && !S.ptr.drag;
      const hold = g.key('Space') || g.key('ArrowDown') || g.key('KeyS') || ptrHold;
      let rot = (g.key('ArrowRight') || g.key('KeyD') ? 1 : 0) - (g.key('ArrowLeft') || g.key('KeyA') ? 1 : 0);
      if (S.dragRot) { rot = clamp(S.dragRot, -1.6, 1.6); S.dragRot = 0; }
      if (!S.air) rot = 0;
      gameStep(g, S, hold, rot);
      S.timeLeft--;
      if (S.timeLeft === 600 && !S.warned) { S.warned = true; g.msg(g.t('hurry'), 1400, '#ff8a8a'); g.sfx('tick'); }
      if (S.timeLeft < 600 && S.timeLeft % 60 === 0 && S.timeLeft > 0) g.sfx('tick', { p: 1.3 });
      const sec = Math.ceil(S.timeLeft / 60);
      const b = g.getBest();
      g.hud([[g.t('score'), S.score], [g.t('best'), b === null ? '—' : Math.max(b, S.score)], [g.t('time'), Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), sec <= 10 ? '#ff8a8a' : null]]);
      if (S.timeLeft <= 0) g.end({ score: S.score, text: g.t('result', { f: S.flips, s: S.starsGot }) });
    },

    bot(g) {
      const S = g.s;
      const b = botInput(S);
      if (b.hold) g.keys.add('Space'); else g.keys.delete('Space');
      g.keys.delete('ArrowLeft'); g.keys.delete('ArrowRight');
      if (b.rot > 0) g.keys.add('ArrowRight'); else if (b.rot < 0) g.keys.add('ArrowLeft');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') { if (!S.ptr) S.ptr = { id: p.id, x: p.x, sx: p.x, drag: false }; }
      else if (type === 'move' && S.ptr && S.ptr.id === p.id && p.down !== false) {
        const dx = p.x - S.ptr.x;
        if (Math.abs(p.x - S.ptr.sx) > 14) S.ptr.drag = true;
        if (S.ptr.drag && S.air) S.dragRot += dx * 0.045;
        S.ptr.x = p.x;
      } else if (type === 'up' && S.ptr && S.ptr.id === p.id) S.ptr = null;
    },
    onPause(g) { if (g.s) g.s.ptr = null; },

    draw(g, ctx, alpha) {
      const S = g.s;
      drawScene(g, ctx, S, alpha);
      if (!g.demo && S.t < 260 && g.state === 'play') {
        const a = Math.min(1, (260 - S.t) / 40);
        g.text(ctx, g.t('tip'), W / 2, 70, { size: 24, color: '#ffffff', stroke: 'rgba(20,30,80,.6)', strokeW: 6, alpha: a, maxW: W - 80 });
      }
      if (!g.demo && S.combo > 1 && g.state === 'play') g.text(ctx, '×' + S.combo, W - 40, 40, { size: 30, color: '#ffd84d', stroke: 'rgba(0,0,0,.4)', strokeW: 5 });
      // מונה סיבובים באוויר
      const turns = S.air ? Math.floor((Math.abs(S.rot) + 0.25) / TAU) : 0;
      if (!g.demo && turns > 0) {
        const sx = screenX(S, S.x), sy = screenY(S, S.y) - 78 * S.z;
        g.text(ctx, '↻ ' + turns, sx, sy, { size: 26, color: '#ffffff', stroke: 'rgba(30,40,110,.65)', strokeW: 5 });
      }
    },

    _sim: { newState, gameStep, botInput, surfY, slopeA },

    cover(ctx, w, h, k) {
      const S = newState(1, true);
      // גל גבוה, הגולש באוויר באמצע סלטה מעל הפסגה
      S.t = 380; S.x = 900;
      ctx.save(); ctx.scale(w / W, h / H);
      S.z = S.pz = 0.86; S.camX = S.pcamX = S.x - 330; S.camY = S.pcamY = 175 - H / 0.86;
      S.px = S.x; S.py = S.y = surfY(S, S.x + 60, S.t) - 150; S.ang = S.pang = -0.9; S.air = true; S.big = 1.9;
      S.stars = [];
      for (let i = 0; i < 5; i++) S.stars.push({ x: S.x + 210 + i * 46, h: 120 + Math.sin(i / 4 * Math.PI) * 40, got: false, ph: i });
      drawScene(k, ctx, S, 1);
      ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.15)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
  });
})();
