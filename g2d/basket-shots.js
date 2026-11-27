// ============================================================
//  זריקות לסל — משחק 2D של URotation (המנוע: g2d/kit.js)
//  גוררים אחורה ומשחררים: הכדור עף בקשת, פוגע בטבעת, במתקן ובלוח (עיגול מול קטעים עם עובי)
//  ונכנס לרשת שזזה באמת (נקודות ורלה). אחרי כל סל עוברים למקום חדש, ובהמשך נושבת רוח.
//  שני מצבים: 60 שניות, ועד 3 החטאות. החיפוש בבדיקות מוכיח שמכל מקום ובכל רוח יש זריקה שנכנסת.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540, FLOOR = 482;
  const R = 15;                                                    // רדיוס הכדור
  const HOOP_X = 826, RIM_Y = 228, RIM_HALF = 34, RIM_R = 4, RIM_RY = 6;
  const BOARD_X = 891, BOARD_HW = 5, BOARD_TOP = 128, BOARD_BOT = 248;
  const POLE_X = 944;
  const GRAV = 900, SUB = 4, HS = 1 / 60 / SUB;                      // פיקסלים לשנייה², 4 תתי-צעדים בכל צעד
  const VMAX = 1080, PULL = 210, PMIN = 0.12, AMIN = 15, AMAX = 85;
  const WIND_UNIT = 20, WIND_MAX = [2, 4, 6], WIND_FROM = 4;       // רוח: רמה × 20 פיקסלים לשנייה², מהסל הרביעי
  const GUIDE_T = [0.95, 0.42, 0.22];                              // כמה שניות של המסלול רואים, לפי רמת הקושי
  const NET_ROWS = 5, NET_COLS = 6, NET_LEN = 56;
  const THREE_X = 330, FT_X = 676;
  const SPOTS = [640, 600, 555, 510, 465, 420, 375, 320, 275, 230, 180, 130];   // מהקרוב לרחוק
  const HAND_DX = 18, HAND_DY = 128;
  const SECS = 60, LIVES = 3, BALL_T = 7 * 60;
  const hand = sx => ({ x: sx + HAND_DX, y: FLOOR - HAND_DY });

  // הטבעת, המתקן, הלוח והעמוד — קטעים עם עובי (קפסולות). הטבעת הקדמית היא קטע באורך אפס
  const SEGS = [
    { ax: HOOP_X - RIM_HALF, ay: RIM_Y, bx: HOOP_X - RIM_HALF, by: RIM_Y, r: RIM_R, e: 0.55, f: 0.8, k: 1 },
    { ax: HOOP_X + RIM_HALF, ay: RIM_Y, bx: BOARD_X - BOARD_HW - 1, by: RIM_Y, r: RIM_R, e: 0.5, f: 0.8, k: 1 },
    { ax: BOARD_X, ay: BOARD_TOP, bx: BOARD_X, by: BOARD_BOT, r: BOARD_HW, e: 0.6, f: 0.88, k: 2 },
    { ax: BOARD_X + 8, ay: 188, bx: POLE_X, by: 214, r: 5, e: 0.4, f: 0.85, k: 3 },
    { ax: POLE_X, ay: 214, bx: POLE_X, by: FLOOR, r: 9, e: 0.4, f: 0.85, k: 3 },
  ];

  // ================= פיזיקה =================
  function mkBall(x, y, vx, vy) { return { x, y, lx: x, ly: y, vx, vy, a: 0, w: -8, rim: 0, board: 0, floor: 0, scored: false, done: false, slow: 0, f: 0, fade: 1, age: 0 }; }

  function hitSeg(b, s, ev) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = s.ax + dx * t, qy = s.ay + dy * t;
    let nx = b.x - qx, ny = b.y - qy;
    const rr = R + s.r, d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2);
    if (d > 1e-6) { nx /= d; ny /= d; } else { nx = 0; ny = -1; }
    b.x = qx + nx * rr; b.y = qy + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (s.k === 1) b.rim++; else if (s.k === 2) b.board++;
    if (vn >= 0) return;
    // פגיעה: קפיצה לפי הגמישות, חיכוך רק במכה (כדור שמתגלגל על הטבעת לא נעצר)
    const tx = -ny, ty = nx, fr = -vn > 40 ? s.f : 0.995;
    const vt = (b.vx * tx + b.vy * ty) * fr, vn2 = -vn * s.e;
    b.vx = nx * vn2 + tx * vt; b.vy = ny * vn2 + ty * vt;
    b.w = vt / R;
    if (ev && -vn > 30) ev.push({ k: s.k, v: -vn, x: qx, y: qy });
  }

  // צעד אחד (1/60 שנייה) של כדור. החישוב מדויק לתאוצה קבועה, כך שהחיפוש במסלול הסגור מתאים לו בדיוק
  function ballFrame(b, wind, ev) {
    b.lx = b.x; b.ly = b.y;
    for (let i = 0; i < SUB; i++) {
      const oy = b.y;
      b.x += b.vx * HS + 0.5 * wind * HS * HS;
      b.y += b.vy * HS + 0.5 * GRAV * HS * HS;
      b.vx += wind * HS; b.vy += GRAV * HS;
      // הרשת: משפך רך מתחת לטבעת — מאט ומרכז (תלוי רק במקום הכדור, כדי שהחיפוש יהיה זהה למשחק)
      if (b.y > RIM_Y && b.y < RIM_Y + NET_LEN && Math.abs(b.x - HOOP_X) < RIM_HALF) {
        b.vx += (HOOP_X - b.x) * 40 * HS; b.vx *= 0.985; b.vy *= 0.985;
      }
      for (let k = 0; k < SEGS.length; k++) hitSeg(b, SEGS[k], ev);
      if (b.y > FLOOR - R) {
        b.y = FLOOR - R;
        if (b.vy > 0) {
          const imp = b.vy;
          b.vy = imp > 50 ? -imp * 0.62 : 0;
          b.floor++;
          if (ev && imp > 60) ev.push({ k: 4, v: imp, x: b.x, y: FLOOR });
        }
        b.vx *= 0.994; b.w = b.vx / R;
      }
      if (!b.scored && oy <= RIM_Y && b.y > RIM_Y && Math.abs(b.x - HOOP_X) < RIM_HALF - 1) {
        b.scored = true;
        if (ev) ev.push({ k: 9, v: b.vy, x: b.x, y: RIM_Y });
      }
      // כדור שנתקע על הטבעת או על המתקן — דחיפה קטנה פנימה, כמו במציאות
      if (b.vx * b.vx + b.vy * b.vy < 900 && b.y < FLOOR - R - 3) { if (++b.slow > 30) { b.vx += HOOP_X > b.x ? 50 : -50; b.slow = 0; } } else b.slow = 0;
      b.a += b.w * HS;
    }
    b.f++;
  }

  // זריקה שלמה בלי ציור — לחיפוש ולבדיקות
  function simThrow(sx, ang, pow, wind) {
    const L = hand(sx), r = ang * Math.PI / 180, v = pow * VMAX;
    const b = mkBall(L.x, L.y, Math.cos(r) * v, -Math.sin(r) * v);
    for (let f = 0; f < BALL_T; f++) {
      ballFrame(b, wind, null);
      if (b.scored) return { ok: true, swish: b.rim === 0 && b.board === 0, rim: b.rim, board: b.board, f };
      if (b.floor || b.x < -2 * R || b.x > W + 2 * R) return { ok: false, f };
    }
    return { ok: false, f: BALL_T };
  }
  // היכן המסלול (בלי פגיעות) חוצה את גובה הטבעת בירידה
  function crossAt(sx, ang, pow, wind) {
    const L = hand(sx), r = ang * Math.PI / 180, v = pow * VMAX, vx = Math.cos(r) * v, vy = -Math.sin(r) * v;
    const disc = vy * vy - 2 * GRAV * (L.y - RIM_Y);
    if (disc < 0) return -1e9;
    const t = (-vy + Math.sqrt(disc)) / GRAV;
    return L.x + vx * t + 0.5 * wind * t * t;
  }
  // זריקה נקייה למקום ולרוח: לכל זווית (מהמועדפת והלאה) חיפוש בינארי על הכוח, ואימות בסימולציה המלאה
  function solveThrow(sx, wind, pref, off) {
    pref = pref == null ? 55 : pref; off = off || 0;
    for (let i = 0; i <= 150; i++) {
      const ang = pref + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5;
      if (ang < AMIN + 5 || ang > AMAX - 2) continue;
      const tgt = HOOP_X + off;
      let lo = PMIN, hi = 1;
      if (crossAt(sx, ang, hi, wind) < tgt) continue;
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (crossAt(sx, ang, m, wind) < tgt) lo = m; else hi = m; }
      const p = (lo + hi) / 2, r = simThrow(sx, ang, p, wind);
      if (r.ok && r.swish) return { a: ang, p };
    }
    return null;
  }

  // ================= הרשת (נקודות ורלה, רק לציור — לא משפיעה על הכדור) =================
  function makeNet() {
    const P = [], restV = [], restH = [];
    for (let r = 0; r <= NET_ROWS; r++) {
      const hw = RIM_HALF * (1 - 0.072 * r), y = RIM_Y + 2 + r * NET_LEN / NET_ROWS;
      for (let c = 0; c < NET_COLS; c++) { const x = HOOP_X - hw + 2 * hw * c / (NET_COLS - 1); P.push({ x, y, px: x, py: y, rx: x, ry: y }); }
    }
    for (let r = 0; r < NET_ROWS; r++) for (let c = 0; c < NET_COLS; c++) { const a = P[r * NET_COLS + c], b = P[(r + 1) * NET_COLS + c]; restV.push(Math.hypot(a.rx - b.rx, a.ry - b.ry)); }
    for (let r = 0; r <= NET_ROWS; r++) for (let c = 0; c < NET_COLS - 1; c++) { const a = P[r * NET_COLS + c], b = P[r * NET_COLS + c + 1]; restH.push(Math.hypot(a.rx - b.rx, a.ry - b.ry)); }
    return { P, restV, restH };
  }
  function link(a, b, L, fixA) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - L) / d;
    if (fixA) { b.x -= dx * k; b.y -= dy * k; }
    else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
  }
  function netPush(N, b) {
    if (Math.abs(b.x - HOOP_X) > RIM_HALF + R + 8 || b.y < RIM_Y - R - 4 || b.y > RIM_Y + NET_LEN + R + 8) return;
    const rr = R + 2;
    for (let i = NET_COLS; i < N.P.length; i++) {
      const p = N.P[i], dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
      if (d < rr) {
        const k = (rr - d) / (d || 1);
        p.x += dx * k; p.y += dy * k;
        p.y += Math.max(0, b.vy) / 60 * 0.22;                 // הכדור גורר את החוטים איתו למטה
      }
    }
  }
  function netStep(S) {
    const N = S.net, P = N.P, sh = Math.sin(S.clock * 0.9) * S.rimShake * 2.4;
    for (let c = 0; c < NET_COLS; c++) { P[c].x = P[c].rx; P[c].y = P[c].ry + sh; }
    for (let i = NET_COLS; i < P.length; i++) {
      const p = P[i], vx = (p.x - p.px) * 0.9, vy = (p.y - p.py) * 0.9;
      p.px = p.x; p.py = p.y;
      p.x += vx + (p.rx - p.x) * 0.05 + S.wind * 0.0004;
      p.y += vy + 0.1 + (p.ry - p.y) * 0.05;
    }
    if (S.ball) netPush(N, S.ball);
    for (const d of S.dead) netPush(N, d);
    for (let it = 0; it < 3; it++) {
      let v = 0, h = NET_COLS - 1;
      for (let r = 0; r < NET_ROWS; r++) for (let c = 0; c < NET_COLS; c++) link(P[r * NET_COLS + c], P[(r + 1) * NET_COLS + c], N.restV[v++], r === 0);
      for (let r = 1; r <= NET_ROWS; r++) for (let c = 0; c < NET_COLS - 1; c++) link(P[r * NET_COLS + c], P[r * NET_COLS + c + 1], N.restH[h++], false);
    }
  }

  // ================= מצב המשחק =================
  function newState(g) {
    const S = {
      phase: 'ready', pt: 0, spot: 1, px: SPOTS[1], walk: null, throwX: SPOTS[1],
      ball: null, dead: [], ev: [], ev2: [], pop: 1,
      aim: { a: 55, p: 0.55 }, lastA: 55, drag: null, kb: false, rep: {},
      wind: 0, windLv: 0, windShown: false,
      score: 0, baskets: 0, swishes: 0, streak: 0, bestStreak: 0, fire: false, throws: 0, misses: 0,
      lives: LIVES, left: SECS * 60, over: false, buzz: false,
      net: makeNet(), rimShake: 0, boardShake: 0, clock: 0, cheer: 0, botWait: 0, trail: [],
      leaves: [], clouds: [],
    };
    const rnd = GK.U.seeded(5);
    for (let i = 0; i < 18; i++) S.leaves.push({ x: rnd() * W, y: 120 + rnd() * 330, ph: rnd() * 6.28, rot: rnd() * 6.28, s: 3 + rnd() * 3, c: rnd() < 0.5 ? '#f2a03d' : '#8cc152', on: i < 4 });
    for (let i = 0; i < 4; i++) S.clouds.push({ x: rnd() * (W + 200) - 100, y: 40 + i * 34 + rnd() * 20, s: 0.7 + rnd() * 0.6 });
    return S;
  }

  function throwBall(g) {
    const S = g.s;
    if (S.phase !== 'ready' || S.over || S.aim.p < PMIN) return false;
    const L = hand(S.px), r = S.aim.a * Math.PI / 180, v = S.aim.p * VMAX;
    S.ball = mkBall(L.x, L.y, Math.cos(r) * v, -Math.sin(r) * v);
    S.throwX = S.px; S.lastA = S.aim.a;
    S.phase = 'fly'; S.pt = 0; S.throws++; S.drag = null; S.trail.length = 0;
    g.sfx('whoosh');
    g.tone({ f: 220, f2: 330, dur: 0.08, type: 'triangle', vol: 0.08 });
    return true;
  }

  function newBall(g) {
    const S = g.s;
    if (S.ball) { S.dead.push(S.ball); if (S.dead.length > 3) S.dead.shift(); }
    S.ball = null; S.phase = 'ready'; S.pt = 0; S.pop = 0; S.kb = false;
    g.sfx('pop', { p: 0.8 });
  }

  function setWind(g) {
    const S = g.s;
    if (S.baskets < WIND_FROM) { S.windLv = 0; S.wind = 0; return; }
    const cap = Math.min(WIND_MAX[g.diff], 1 + Math.floor((S.baskets - WIND_FROM) / 2));
    const lv = g.ri(Math.max(1, cap - 1), cap);
    S.windLv = lv * (Math.random() < 0.5 ? -1 : 1);
    S.wind = S.windLv * WIND_UNIT;
    if (!S.windShown) { S.windShown = true; g.msg(g.t('windStart'), 1400, '#bfe6ff'); g.sfx('whoosh'); }
  }

  function goNext(g) {
    const S = g.s;
    const maxI = Math.min(SPOTS.length - 1, 2 + S.baskets);
    let i = S.spot;
    while (i === S.spot) i = g.ri(0, maxI);
    S.spot = i;
    const to = SPOTS[i];
    S.walk = { from: S.px, to, t: 0, dur: Math.round(g.clamp(Math.abs(to - S.px) / 9, 18, 50)) };
    S.phase = 'move'; S.pt = 0;
    setWind(g);
  }

  function basket(g, b) {
    const S = g.s;
    const three = S.throwX < THREE_X;
    const swish = b.rim === 0 && b.board === 0, bank = !swish && b.rim === 0;
    const fireBefore = S.fire;
    let pts = (three ? 3 : 2) + (swish ? 1 : 0);
    if (fireBefore) pts *= 2;
    S.score += pts; g.score = S.score;
    S.baskets++; S.streak++;
    if (S.streak > S.bestStreak) S.bestStreak = S.streak;
    if (swish) S.swishes++;
    g.float(HOOP_X - 70, RIM_Y - 30, '+' + pts, { color: fireBefore ? '#ffb347' : '#ffffff', size: fireBefore ? 40 : 34, life: 70 });
    if (swish) g.float(HOOP_X - 70, RIM_Y - 74, g.t('swish'), { color: '#7dffd8', size: 28, life: 75 });
    else if (bank) g.float(HOOP_X - 70, RIM_Y - 74, g.t('bank'), { color: '#bfe6ff', size: 24, life: 70 });
    g.burst(HOOP_X, RIM_Y + 46, { n: swish ? 34 : 20, color: ['#ffd166', '#ff6b2c', '#ffffff', '#7dffd8', '#5aa9ff'], speed: swish ? 5 : 4, life: 48, gravity: 0.12, shape: 'square', size: 5 });
    // צלילים: סוויש של הרשת, צלצול, וקהל קטן
    g.noise({ filter: 'bandpass', f: 5200, f2: 1600, dur: swish ? 0.34 : 0.24, vol: swish ? 0.22 : 0.15, q: 1.1 });
    g.noise({ filter: 'highpass', f: 3500, f2: 7000, dur: 0.16, vol: 0.06, delay: 0.03 });
    g.sfx(three ? 'coin' : 'score');
    g.noise({ filter: 'bandpass', f: 1300, f2: 800, dur: 0.9, vol: 0.06, q: 0.5, delay: 0.12 });
    S.cheer = 70;
    if (S.streak === 3) { S.fire = true; g.msg(g.t('fire'), 1400, '#ffb347'); g.sfx('power'); g.flash('#ffb347', 0.18); }
    else if (S.streak > 3 && S.streak % 5 === 0) g.msg(g.t('streakN', { n: S.streak }), 1200, '#ffd166');
    if (S.buzz) { g.msg(g.t('buzzer'), 1800, '#ffd166'); g.sfx('record'); }
    g.shake(swish ? 4 : 2);
    S.phase = 'cheer'; S.pt = 0;
  }

  function miss(g, b) {
    const S = g.s;
    S.streak = 0;
    if (S.fire) S.fire = false;
    S.misses++;
    if (g.mode === 'streak') S.lives--;
    const x = g.clamp(b.x, 60, W - 60), y = g.clamp(b.y - 50, 80, FLOOR - 70);
    g.float(x, y, g.t('miss'), { color: '#ff9b8f', size: 26, life: 60 });
    g.tone({ type: 'triangle', f: 330, f2: 200, dur: 0.34, vol: 0.12 });
    if (g.mode === 'streak') { g.shake(5); g.flash('#ff3b3b', 0.14); }
    S.phase = 'sad'; S.pt = 0;
  }

  function finish(g) {
    const S = g.s;
    if (S.over) return;
    S.over = true;
    g.end({
      score: S.score,
      title: g.t(g.mode === 'time' ? 'timeUp' : 'outTitle'),
      text: g.t('stats', { b: S.baskets, s: S.swishes, r: S.bestStreak }),
      delay: 1100,
    });
  }
  function endNow(g) {
    const S = g.s;
    if ((g.mode === 'streak' && S.lives <= 0) || (g.mode === 'time' && S.left <= 0)) { finish(g); return true; }
    return false;
  }

  function onHits(g, S, ev, main) {
    for (const e of ev) {
      const v = Math.min(1, e.v / 700);
      if (e.k === 1) {
        g.tone({ type: 'square', f: 880 + Math.random() * 140, f2: 780, dur: 0.08, vol: (0.025 + 0.05 * v) * (main ? 1 : 0.5) });
        g.tone({ type: 'triangle', f: 1460 + Math.random() * 80, dur: 0.24, vol: (0.05 + 0.09 * v) * (main ? 1 : 0.5), delay: 0.004 });
        g.noise({ filter: 'bandpass', f: 3200, dur: 0.05, vol: 0.05 + 0.1 * v, q: 2 });
        S.rimShake = Math.min(1.4, S.rimShake + 0.35 + v);
        if (main) g.burst(e.x, e.y, { n: 3 + Math.round(6 * v), color: ['#ffd27a', '#ff8a3d', '#ffffff'], speed: 2.4, life: 16, size: 3, gravity: 0.1 });
        if (main && v > 0.45) g.shake(2.5);
      } else if (e.k === 2) {
        g.tone({ f: 190, f2: 120, dur: 0.12, vol: (0.1 + 0.14 * v) * (main ? 1 : 0.5) });
        g.noise({ f: 1400, f2: 300, dur: 0.1, vol: 0.05 + 0.08 * v });
        S.boardShake = Math.min(1.3, S.boardShake + 0.5 + v);
      } else if (e.k === 3) {
        g.tone({ type: 'triangle', f: 420, f2: 300, dur: 0.18, vol: 0.06 + 0.08 * v });
      } else if (e.k === 4) {
        g.tone({ f: 128, f2: 70, dur: 0.13, vol: (0.08 + 0.16 * v) * (main ? 1 : 0.6) });
        g.noise({ f: 700, f2: 120, dur: 0.07, vol: 0.04 + 0.06 * v });
      }
    }
  }

  // תנועה לציור בלבד: כדורים ישנים, רשת, עלים, עננים, שובל. רץ גם בתפריט ובסוף
  function animate(g, playing) {
    const S = g.s;
    S.clock++;
    if (!playing && S.ball) ballFrame(S.ball, S.wind, null);
    for (let i = S.dead.length - 1; i >= 0; i--) {
      const d = S.dead[i];
      d.age++;
      S.ev2.length = 0;
      ballFrame(d, S.wind, playing ? S.ev2 : null);
      if (playing && S.ev2.length) onHits(g, S, S.ev2, false);
      if (d.age > 80) d.fade -= 0.035;
      if (d.fade <= 0 || d.x < -60 || d.x > W + 60) S.dead.splice(i, 1);
    }
    netStep(S);
    S.rimShake *= 0.9; S.boardShake *= 0.86;
    if (S.cheer > 0) S.cheer--;
    if (S.pop < 1) S.pop = Math.min(1, S.pop + 0.1);
    const b = S.ball;
    if (b && !b.done && b.vx * b.vx + b.vy * b.vy > 250000) { S.trail.push(b.x, b.y); if (S.trail.length > 20) S.trail.splice(0, 2); }
    else if (S.trail.length) S.trail.splice(0, 2);
    if (S.fire && b && !b.done && playing && S.clock % 2 === 0) g.burst(b.x, b.y, { n: 2, color: ['#ffd166', '#ff8a3d', '#ff5a1f'], speed: 1.2, life: 20, size: 7, gravity: -0.06 });
    // עננים ועלים זזים עם הרוח
    const ws = S.wind / WIND_UNIT;
    for (const c of S.clouds) { c.x += (0.12 + ws * 0.09) * c.s; if (c.x > W + 140) c.x = -140; if (c.x < -140) c.x = W + 140; }
    for (let i = 0; i < S.leaves.length; i++) {
      const L = S.leaves[i];
      if (!L.on && ws !== 0 && i < 4 + Math.abs(ws) * 2) L.on = true;
      if (L.on && ws === 0 && i >= 4) L.on = false;
      if (!L.on) continue;
      L.ph += 0.05; L.rot += 0.08 + Math.abs(ws) * 0.02;
      L.x += (ws === 0 ? 0.25 : ws * 0.9) + Math.sin(L.ph) * 0.3;
      L.y += Math.cos(L.ph * 0.7) * 0.6 + 0.12;
      if (L.y > FLOOR - 4) L.y = 120;
      if (L.x > W + 20) { L.x = -20; L.y = 120 + Math.random() * 300; }
      if (L.x < -20) { L.x = W + 20; L.y = 120 + Math.random() * 300; }
    }
  }

  function keyAim(g) {
    const S = g.s;
    const dirs = [['ArrowUp', 'KeyW', 0, 1], ['ArrowDown', 'KeyS', 0, -1], ['ArrowRight', 'KeyD', 1, 1], ['ArrowLeft', 'KeyA', 1, -1]];
    for (const [k1, k2, which, sgn] of dirs) {
      const held = g.key(k1) || g.key(k2), hit = g.hit(k1) || g.hit(k2);
      if (hit) S.rep[k1] = 0;
      if (!held) continue;
      const n = S.rep[k1] = (S.rep[k1] || 0) + 1;
      if (hit || (n > 12 && n % 2 === 0)) {
        S.kb = true;
        if (which === 0) S.aim.a = g.clamp(Math.round(S.aim.a) + sgn, AMIN, AMAX);
        else S.aim.p = g.clamp(Math.round(S.aim.p * 100 + sgn) / 100, PMIN, 1);
        if (which === 1 && Math.round(S.aim.p * 100) % 10 === 0) g.sfx('tick', { p: 0.6 + S.aim.p });
      }
    }
    if ((g.hit('Space') || g.hit('Enter')) && S.phase === 'ready') { S.kb = true; throwBall(g); }
  }

  function setAimPull(S, dx, dy) {
    let a = Math.atan2(-dy, dx) * 180 / Math.PI;
    if (a < -90) a = AMAX;
    S.aim.a = Math.max(AMIN, Math.min(AMAX, a));
    S.aim.p = Math.max(0, Math.min(1, Math.hypot(dx, dy) / PULL));
  }

  const fmtT = f => { const s = Math.max(0, Math.ceil(f / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function hud(g) {
    const S = g.s, b = g.getBest(), best = b === null ? '—' : Math.max(b, S.score);
    const items = [];
    if (g.mode === 'time') items.push([g.t('time'), fmtT(S.left), S.left <= 600 ? '#ff6b6b' : null]);
    items.push([g.t('score'), S.score]);
    if (g.mode === 'streak') items.push([g.t('chances'), '🏀'.repeat(Math.max(0, S.lives)) + '✖'.repeat(LIVES - Math.max(0, S.lives)), '#ff9f43']);
    items.push([g.t('best'), best]);
    if (S.windLv) items.push([g.t('wind'), (S.windLv < 0 ? '←' : '→') + ' ' + Math.abs(S.windLv), '#8fd3ff']);
    if (S.fire) items.push(['🔥', '×2', '#ffb347']);
    g.hud(items);
  }

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
    }
    ctx.drawImage(L.c, 0, 0, W, H);
  }

  function paintSky(ctx, k) {
    let gr = ctx.createLinearGradient(0, 0, 0, FLOOR);
    gr.addColorStop(0, '#2c58cc'); gr.addColorStop(0.4, '#6aa2f0'); gr.addColorStop(0.74, '#ffcda4'); gr.addColorStop(1, '#ffae78');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const sx = 200, sy = 312;
    gr = ctx.createRadialGradient(sx, sy, 10, sx, sy, 250);
    gr.addColorStop(0, 'rgba(255,246,206,.95)'); gr.addColorStop(0.22, 'rgba(255,214,150,.55)'); gr.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 40, 480, 460);
    k.circle(ctx, sx, sy, 42); ctx.fillStyle = '#fff4d2'; ctx.fill();
    // עיר רחוקה
    const rnd = k.seeded(17);
    let x = -10;
    while (x < W) {
      const w = 34 + rnd() * 60, h = 70 + rnd() * 150, top = 342 - h;
      ctx.fillStyle = '#9aa7d9'; ctx.fillRect(x, top, w, h + 20);
      if (rnd() < 0.3) { ctx.fillRect(x + w * 0.4, top - 14, 3, 14); }
      ctx.fillStyle = 'rgba(214,224,255,.45)';
      for (let yy = top + 8; yy < 330; yy += 12) for (let xx = x + 5; xx < x + w - 6; xx += 9) if (rnd() < 0.55) ctx.fillRect(xx, yy, 4, 5);
      x += w + 2 + rnd() * 6;
    }
    // עיר קרובה
    x = -20;
    while (x < W) {
      const w = 50 + rnd() * 70, h = 40 + rnd() * 110, top = 360 - h;
      gr = ctx.createLinearGradient(0, top, 0, 380);
      gr.addColorStop(0, '#6a78b8'); gr.addColorStop(1, '#55619c');
      ctx.fillStyle = gr; ctx.fillRect(x, top, w, h + 30);
      ctx.fillStyle = '#5a67a4'; ctx.fillRect(x - 2, top - 4, w + 4, 5);
      if (rnd() < 0.35) { ctx.fillStyle = '#4c5891'; k.rr(ctx, x + w * 0.2, top - 16, 16, 13, 3); ctx.fill(); ctx.fillRect(x + w * 0.2 + 3, top - 4, 2, 4); ctx.fillRect(x + w * 0.2 + 11, top - 4, 2, 4); }
      for (let yy = top + 9; yy < 352; yy += 14) for (let xx = x + 7; xx < x + w - 9; xx += 13) {
        const lit = rnd() < 0.42;
        ctx.fillStyle = lit ? 'rgba(255,224,150,.9)' : 'rgba(40,48,90,.35)'; ctx.fillRect(xx, yy, 6, 7);
      }
      x += w + 4 + rnd() * 10;
    }
  }

  const FENCE_TOP = 300;
  function paintCourt(ctx, k) {
    // גדר רשת
    ctx.fillStyle = 'rgba(40,52,84,.22)'; ctx.fillRect(0, FENCE_TOP, W, FLOOR - FENCE_TOP);
    ctx.strokeStyle = 'rgba(38,46,76,.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -200; x < W + 200; x += 15) {
      ctx.moveTo(x, FENCE_TOP); ctx.lineTo(x + (FLOOR - FENCE_TOP), FLOOR);
      ctx.moveTo(x, FENCE_TOP); ctx.lineTo(x - (FLOOR - FENCE_TOP), FLOOR);
    }
    ctx.stroke();
    for (let x = 20; x < W; x += 180) {
      const gr = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      gr.addColorStop(0, '#3c4669'); gr.addColorStop(0.5, '#7d88ad'); gr.addColorStop(1, '#3c4669');
      ctx.fillStyle = gr; ctx.fillRect(x - 4, FENCE_TOP - 6, 8, FLOOR - FENCE_TOP + 6);
      k.circle(ctx, x, FENCE_TOP - 7, 5); ctx.fillStyle = '#6c779d'; ctx.fill();
    }
    let gr = ctx.createLinearGradient(0, FENCE_TOP - 4, 0, FENCE_TOP + 4);
    gr.addColorStop(0, '#8a94b8'); gr.addColorStop(1, '#4a547a');
    ctx.fillStyle = gr; ctx.fillRect(0, FENCE_TOP - 4, W, 6);
    // הרצפה: אספלט כחול, צבע כתום ליד הסל וקווים לבנים
    const top = FLOOR - 16;
    gr = ctx.createLinearGradient(0, top, 0, H);
    gr.addColorStop(0, '#3a74d8'); gr.addColorStop(0.35, '#2f63c4'); gr.addColorStop(1, '#22489a');
    ctx.fillStyle = gr; ctx.fillRect(0, top, W, H - top);
    const vx = 480, sl = x => x + (x - vx) * 0.09;     // קווים נוטים קצת, כאילו יש עומק
    ctx.fillStyle = '#e8653a';
    ctx.beginPath(); ctx.moveTo(FT_X, top); ctx.lineTo(W, top); ctx.lineTo(W, H); ctx.lineTo(sl(FT_X), H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, top, W, 3);
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4;
    for (const x of [THREE_X, FT_X, 952]) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(sl(x), H); ctx.stroke(); }
    // טקסטורה
    const rnd = k.seeded(23);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 160; i++) ctx.fillRect(rnd() * W, top + 4 + rnd() * (H - top - 4), 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, top, W, 2);
    // ספסל קטן משמאל
    k.rr(ctx, 14, FLOOR - 40, 70, 9, 4); ctx.fillStyle = '#c47a3f'; ctx.fill();
    ctx.fillStyle = '#7b4a26'; ctx.fillRect(20, FLOOR - 31, 5, 26); ctx.fillRect(73, FLOOR - 31, 5, 26);
  }

  function drawCloud(k, ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (const [dx, dy, r] of [[0, 0, 20], [22, -10, 24], [46, 0, 19], [22, 6, 20]]) { k.circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
  }
  function drawTree(k, ctx, x, base, s, sway) {
    ctx.fillStyle = '#6b4a35'; ctx.fillRect(x - 5 * s, base - 70 * s, 10 * s, 70 * s);
    const tx = x + sway * 10 * s, ty = base - 92 * s;
    const blobs = [[0, 0, 34], [-26, 14, 24], [26, 12, 26], [-12, -20, 24], [14, -22, 22]];
    for (const [dx, dy, r] of blobs) { k.circle(ctx, tx + dx * s, ty + dy * s, r * s); ctx.fillStyle = '#4f8f4a'; ctx.fill(); }
    for (const [dx, dy, r] of blobs) { k.circle(ctx, tx + dx * s - 5 * s, ty + dy * s - 6 * s, r * s * 0.6); ctx.fillStyle = '#6fb35f'; ctx.fill(); }
  }
  function drawFlag(k, ctx, x, top, ws, t) {
    ctx.fillStyle = '#e8edf7'; ctx.fillRect(x - 2, top, 4, FLOOR - 16 - top);
    k.circle(ctx, x, top - 2, 4); ctx.fillStyle = '#ffd166'; ctx.fill();
    const dir = ws === 0 ? 1 : Math.sign(ws), str = Math.min(1, Math.abs(ws) / 5);
    const droop = (1 - str) * 1.25 + 0.12;              // זווית מהאופק: רפוי למטה בלי רוח
    const len = 54, n = 9, pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, ang = droop * u * 0.9 + droop * 0.1;
      const wave = Math.sin(t * (4 + str * 6) - u * 4) * (3 + str * 3) * u;
      pts.push([x + dir * Math.cos(ang) * len * u, top + 4 + Math.sin(ang) * len * u + wave]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(pts[i][0], pts[i][1] - (1 - u) * 13 - u * 4); }
    for (let i = n; i >= 0; i--) { const u = i / n; ctx.lineTo(pts[i][0], pts[i][1] + (1 - u) * 13 + u * 4); }
    ctx.closePath();
    ctx.fillStyle = '#ff6b2c'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); }
    ctx.stroke();
  }
  // צופים מאחורי הגדר
  const FANS = [[388, '#ff5d73', '#3b2a20', 0], [446, '#4fc3f7', '#f1c27d', 1], [512, '#ffd166', '#8d5a3b', 2], [574, '#7e57c2', '#e0ac7e', 3], [640, '#26c281', '#c88b5f', 4]];
  function drawFans(k, ctx, cheer, t) {
    for (const [x, shirt, skin, i] of FANS) {
      const up = cheer > 0 ? Math.abs(Math.sin(t * 9 + i * 1.3)) * 9 : Math.sin(t * 1.5 + i) * 1;
      const y = 418 - up - (i % 2) * 6;
      k.rr(ctx, x - 13, y + 12, 26, 50, 9); ctx.fillStyle = shirt; ctx.fill();
      if (cheer > 0) { ctx.strokeStyle = skin; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 10, y + 18); ctx.lineTo(x - 18, y - 6); ctx.moveTo(x + 10, y + 18); ctx.lineTo(x + 18, y - 6); ctx.stroke(); }
      k.circle(ctx, x, y, 12); ctx.fillStyle = skin; ctx.fill();
      ctx.fillStyle = '#2a1d16'; ctx.beginPath(); ctx.arc(x, y - 2, 12, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#222'; k.circle(ctx, x + 3, y + 1, 1.6); ctx.fill(); k.circle(ctx, x + 8, y + 1, 1.6); ctx.fill();
    }
  }

  function drawBall(ctx, x, y, r, rot, alpha) {
    ctx.save();
    if (alpha != null && alpha < 1) ctx.globalAlpha *= Math.max(0, alpha);
    ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.12, 0, 0, r);
    gr.addColorStop(0, '#ffb36b'); gr.addColorStop(0.55, '#f2781f'); gr.addColorStop(1, '#ad4409');
    ctx.fillStyle = gr; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = '#3b1a07'; ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.32, 0, r * 0.98, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 1.32, 0, r * 0.98, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(70,25,0,.7)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(-(rot || 0));
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function ballShadow(ctx, x, y, alpha) {
    const hgt = Math.max(0, FLOOR - R - y), s = Math.max(0.35, 1 - hgt / 420);
    ctx.fillStyle = 'rgba(10,20,50,' + (0.3 * s * (alpha == null ? 1 : alpha)).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x, FLOOR + 2, R * 1.1 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawHoopBack(k, ctx, rs, bs) {
    const bx = BOARD_X + Math.sin(bs * 9) * bs * 1.6;
    // עמוד וזרוע
    let gr = ctx.createLinearGradient(POLE_X - 9, 0, POLE_X + 9, 0);
    gr.addColorStop(0, '#1f2d55'); gr.addColorStop(0.45, '#4a5f9c'); gr.addColorStop(1, '#1b264a');
    ctx.fillStyle = gr; ctx.fillRect(POLE_X - 9, 206, 18, FLOOR - 206);
    k.rr(ctx, POLE_X - 13, FLOOR - 92, 26, 92, 6); ctx.fillStyle = '#ffcf3f'; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(POLE_X + 4, FLOOR - 92, 9, 92);
    k.rr(ctx, POLE_X - 24, FLOOR - 8, 48, 10, 4); ctx.fillStyle = '#2b375e'; ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b3a68'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(bx + 6, 188); ctx.lineTo(POLE_X, 214); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + 6, 160); ctx.lineTo(POLE_X, 214); ctx.stroke();
    ctx.strokeStyle = '#5a6ea8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx + 6, 186); ctx.lineTo(POLE_X, 212); ctx.stroke();
    // הלוח: זכוכית במסגרת לבנה (רואים אותו מהצד, קצת מסובב)
    const x0 = bx - BOARD_HW, w = 13, y0 = BOARD_TOP, h = BOARD_BOT - BOARD_TOP;
    gr = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, 'rgba(225,244,255,.95)'); gr.addColorStop(1, 'rgba(150,196,230,.9)');
    k.rr(ctx, x0, y0, w, h, 3); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.fillStyle = '#ff5a36'; ctx.fillRect(x0 + 1.5, RIM_Y - 44, 4, 46);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x0 + 2, y0 + 6, 2, h - 12);
    // המתקן והטבעת האחורית
    ctx.fillStyle = '#c9cfdd'; ctx.fillRect(HOOP_X + RIM_HALF - 2, RIM_Y - 3, x0 - (HOOP_X + RIM_HALF) + 3, 7);
    ctx.fillStyle = '#8a92a8'; ctx.fillRect(HOOP_X + RIM_HALF + 4, RIM_Y + 3, x0 - (HOOP_X + RIM_HALF) - 4, 6);
    const ry = RIM_Y + Math.sin(rs * 11) * rs * 2.4;
    ctx.lineWidth = 5; ctx.strokeStyle = '#c4410c';
    ctx.beginPath(); ctx.ellipse(HOOP_X, ry, RIM_HALF, RIM_RY, 0, Math.PI, Math.PI * 2); ctx.stroke();
  }
  function drawHoopFront(k, ctx, S) {
    const P = S.net.P;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,50,80,.35)'; ctx.lineWidth = 3.2;
    netPath(ctx, P, 1.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.8;
    netPath(ctx, P, 0); ctx.stroke();
    const ry = RIM_Y + Math.sin(S.rimShake * 11) * S.rimShake * 2.4;
    ctx.lineWidth = 6; ctx.strokeStyle = '#ff6a1f';
    ctx.beginPath(); ctx.ellipse(HOOP_X, ry, RIM_HALF, RIM_RY, 0, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffb27a';
    ctx.beginPath(); ctx.ellipse(HOOP_X, ry - 1, RIM_HALF - 1, RIM_RY - 1, 0, 0.3, Math.PI - 0.3); ctx.stroke();
    for (const s of [-1, 1]) { k.circle(ctx, HOOP_X + s * RIM_HALF, ry, 3.6); ctx.fillStyle = '#ff7d33'; ctx.fill(); }
  }
  function netPath(ctx, P, oy) {
    const C = NET_COLS;
    ctx.beginPath();
    for (let r = 0; r < NET_ROWS; r++) for (let c = 0; c < C - 1; c++) {
      const a = P[r * C + c], b = P[(r + 1) * C + c + 1], a2 = P[r * C + c + 1], b2 = P[(r + 1) * C + c];
      ctx.moveTo(a.x, a.y + oy); ctx.lineTo(b.x, b.y + oy);
      ctx.moveTo(a2.x, a2.y + oy); ctx.lineTo(b2.x, b2.y + oy);
    }
    for (let r = 0; r < NET_ROWS; r++) for (const c of [0, C - 1]) { const a = P[r * C + c], b = P[(r + 1) * C + c]; ctx.moveTo(a.x, a.y + oy); ctx.lineTo(b.x, b.y + oy); }
    const last = NET_ROWS * C;
    ctx.moveTo(P[last].x, P[last].y + oy);
    for (let c = 1; c < C; c++) ctx.lineTo(P[last + c].x, P[last + c].y + oy);
  }
  const inHoopZone = b => Math.abs(b.x - HOOP_X) < RIM_HALF + 2 && b.y > RIM_Y - R && b.y < RIM_Y + NET_LEN + R;

  // ---------- השחקן ----------
  const KID = { skin: '#c68a5d', skinD: '#9e6741', skinL: '#dba27a', hair: '#24160f', shirt: '#ff6b2c', shirtD: '#c84a14', shorts: '#25408f', shortsD: '#182b63', band: '#ffd166' };
  function limb(ctx, ax, ay, bx, by, bend, w, col) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
    const ex = mx - dy / d * bend, ey = my + dx / d * bend;
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(bx, by); ctx.stroke();
  }
  function drawKid(k, ctx, x, o) {
    const t = o.t || 0, cr = o.crouch || 0, jump = o.jump || 0, walking = o.walk != null;
    const bob = walking ? Math.abs(Math.sin(o.walk)) * 3 : Math.sin(t * 2.6) * 1.1;
    const fy = FLOOR - jump;
    const hipY = fy - 36 + cr * 11 - bob, shY = hipY - 33, hx = x + 1, hy = shY - 22;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(10,20,50,.24)';
    ctx.beginPath(); ctx.ellipse(x + 2, FLOOR + 2, Math.max(12, 25 - jump * 0.35), 5, 0, 0, Math.PI * 2); ctx.fill();
    // רגליים (האחורית קודם)
    for (const s of [-1, 1]) {
      const ph = walking ? o.walk + (s > 0 ? 0 : Math.PI) : 0;
      const hipX = x + s * 6, footX = x + s * 8 + (walking ? Math.sin(ph) * 10 : 0);
      const footY = fy - 5 - (walking ? Math.max(0, -Math.cos(ph)) * 5 : 0);
      const kneeX = (hipX + footX) / 2 + 3 + cr * 9, kneeY = (hipY + footY) / 2 + cr * 3;
      ctx.strokeStyle = s < 0 ? KID.skinD : KID.skin; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(hipX, hipY + 4); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY - 5); ctx.stroke();
      ctx.strokeStyle = s < 0 ? '#d9dce8' : '#ffffff'; ctx.lineWidth = 9.5;
      ctx.beginPath(); ctx.moveTo(footX + (kneeX - footX) * 0.3, footY - 5 + (kneeY - footY) * 0.3); ctx.lineTo(footX, footY - 4); ctx.stroke();
      k.rr(ctx, footX - 7, footY - 7, 21, 11, 5); ctx.fillStyle = s < 0 ? '#e4e6ef' : '#ffffff'; ctx.fill();
      ctx.fillStyle = KID.shirt; ctx.fillRect(footX - 1, footY - 3, 12, 2.5);
      ctx.fillStyle = '#353b55'; ctx.fillRect(footX - 7, footY + 2, 21, 2.2);
    }
    // מכנסיים וחולצה
    k.rr(ctx, x - 14, hipY - 9, 28, 19, 6); ctx.fillStyle = KID.shorts; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 14, hipY + 3, 3, 7); ctx.fillRect(x + 11, hipY + 3, 3, 7);
    ctx.fillStyle = KID.shortsD; ctx.fillRect(x - 1, hipY + 1, 2, 9);
    ctx.beginPath();
    ctx.moveTo(x - 12, shY + 1); ctx.quadraticCurveTo(x, shY + 6, x + 12, shY + 1);
    ctx.lineTo(x + 15, hipY - 3); ctx.lineTo(x - 15, hipY - 3); ctx.closePath();
    let gr = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
    gr.addColorStop(0, KID.shirtD); gr.addColorStop(0.45, KID.shirt); gr.addColorStop(1, '#ff8a4f');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 7, shY + 3); ctx.quadraticCurveTo(x, shY + 9, x + 7, shY + 3); ctx.stroke();
    k.text(ctx, '7', x + 2, (shY + hipY) / 2 + 2, { size: 15, weight: 900, color: '#ffffff', stroke: KID.shirtD, strokeW: 3 });
    // ידיים
    const shL = [x - 11, shY + 6], shR = [x + 11, shY + 6];
    let hl, hr, bl = 10, br = -10;
    const B = hand(x);
    if (o.arms === 'hold') { hl = [B.x - 13, B.y + 7]; hr = [B.x + 9, B.y + 9]; bl = 8; br = -6; }
    else if (o.arms === 'throw') {
      const a = (o.aim || 55) * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a);
      hl = [shL[0] + 12 + dx * 44, shL[1] + dy * 44]; hr = [shR[0] + dx * 46, shR[1] + dy * 46]; bl = 2; br = -2;
    } else if (o.arms === 'up') { hl = [x - 24, shY - 40]; hr = [x + 26, shY - 42]; bl = -4; br = 4; }
    else if (o.arms === 'head') { hl = [hx - 12, hy - 20]; hr = [hx + 14, hy - 18]; bl = 14; br = -14; }
    else if (o.arms === 'swing') { const s = Math.sin(o.walk) * 12; hl = [x - 14 - s, shY + 32]; hr = [x + 14 + s, shY + 32]; bl = -4; br = 4; }
    else { hl = [x - 15, shY + 34]; hr = [x + 15, shY + 34]; bl = -3; br = 3; }
    limb(ctx, shL[0], shL[1], hl[0], hl[1], bl, 8, KID.skinD);
    // ראש
    ctx.fillStyle = KID.hair;
    k.circle(ctx, hx - 3, hy - 2, 21); ctx.fill();
    gr = ctx.createRadialGradient(hx + 5, hy - 6, 3, hx + 1, hy + 1, 21);
    gr.addColorStop(0, KID.skinL); gr.addColorStop(1, KID.skin);
    k.circle(ctx, hx + 1, hy + 1, 19.5); ctx.fillStyle = gr; ctx.fill();
    k.circle(ctx, hx - 15, hy + 3, 5); ctx.fillStyle = KID.skinD; ctx.fill();
    ctx.fillStyle = KID.hair;
    for (const [dx, dy, r] of [[-15, -9, 9], [-6, -16, 10], [5, -18, 9], [14, -13, 7], [-19, 1, 6]]) { k.circle(ctx, hx + dx, hy + dy, r); ctx.fill(); }
    ctx.strokeStyle = KID.band; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(hx + 1, hy + 1, 19.2, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
    ctx.strokeStyle = '#ff6b2c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(hx + 1, hy + 1, 19.2, Math.PI * 1.3, Math.PI * 1.7); ctx.stroke();
    // פנים
    let lx = 1, ly = -0.4;
    if (o.look) { const dx = o.look.x - hx, dy = o.look.y - hy, d = Math.hypot(dx, dy) || 1; lx = dx / d; ly = dy / d; }
    for (const [ex, er] of [[hx + 1, 4.8], [hx + 12, 5.2]]) {
      const ey = hy - 1;
      if (o.blink || o.mouth === 'sad') {
        ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex - er, ey + (o.mouth === 'sad' ? 1 : 0)); ctx.quadraticCurveTo(ex, ey + (o.mouth === 'sad' ? -2 : 2), ex + er, ey + (o.mouth === 'sad' ? 1 : 0)); ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        k.circle(ctx, ex + lx * 1.8, ey + ly * 2, er * 0.55); ctx.fillStyle = '#2a1a12'; ctx.fill();
        k.circle(ctx, ex + lx * 1.8 - 1, ey + ly * 2 - 1.2, er * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
      }
      ctx.strokeStyle = KID.hair; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(ex - er * 0.9, ey - er * 1.6 - (o.mouth === 'open' ? 2 : 0)); ctx.lineTo(ex + er * 0.9, ey - er * 1.75 - (o.mouth === 'open' ? 2 : 0)); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,120,120,.35)'; k.circle(ctx, hx - 4, hy + 8, 3.5); ctx.fill(); k.circle(ctx, hx + 17, hy + 8, 3.2); ctx.fill();
    ctx.strokeStyle = '#7a3b22'; ctx.lineWidth = 2;
    if (o.mouth === 'open') { ctx.fillStyle = '#7a2a1a'; ctx.beginPath(); ctx.ellipse(hx + 8, hy + 11, 5, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff8f8f'; ctx.beginPath(); ctx.ellipse(hx + 8, hy + 13, 3, 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (o.mouth === 'sad') { ctx.beginPath(); ctx.arc(hx + 8, hy + 15, 4.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(hx + 8, hy + 7, 5, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    // היד הקדמית מעל הכול (והכדור מצויר לפניה כשהוא בידיים)
    o.frontArm = [shR[0], shR[1], hr[0], hr[1], br];
    o.hands = [hl, hr];
    ctx.restore();
  }
  function drawFrontArm(k, ctx, o) {
    const [ax, ay, bx, by, bend] = o.frontArm;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    limb(ctx, ax, ay, bx, by, bend, 8.5, KID.skin);
    ctx.fillStyle = KID.skin; k.circle(ctx, bx, by, 5.2); ctx.fill();
    const [l] = o.hands; ctx.fillStyle = KID.skinD; k.circle(ctx, l[0], l[1], 4.8); ctx.fill();
    ctx.restore();
  }

  function poseOf(g, S) {
    const o = { t: S.clock / 60, crouch: 0, jump: 0, arms: 'hold', mouth: 'smile', walk: null, look: null, blink: (S.clock % 210) < 7, aim: S.lastA };
    if (S.phase === 'ready') {
      const aiming = (S.drag && S.drag.moved) || S.kb;
      o.crouch = aiming ? S.aim.p * 0.9 : 0;
      o.look = { x: HOOP_X, y: RIM_Y };
      if (S.pop < 1) o.arms = 'hold';
    } else if (S.phase === 'fly') {
      const u = S.pt / 22;
      o.jump = u < 1 ? Math.sin(u * Math.PI) * 22 : 0;
      o.arms = S.pt < 40 ? 'throw' : 'rest';
      o.look = S.ball;
      o.mouth = S.pt > 30 ? 'open' : 'smile';
    } else if (S.phase === 'cheer') { o.arms = 'up'; o.jump = Math.abs(Math.sin(S.pt * 0.19)) * 16; o.mouth = 'open'; o.look = { x: HOOP_X, y: RIM_Y }; }
    else if (S.phase === 'sad') { o.arms = 'head'; o.mouth = 'sad'; }
    else if (S.phase === 'move') { o.walk = S.walk.t * 0.42; o.arms = 'swing'; o.look = { x: W, y: hand(S.px).y }; }
    return o;
  }

  function drawGuide(g, ctx, S) {
    const L = hand(S.px), r = S.aim.a * Math.PI / 180, v = S.aim.p * VMAX, vx = Math.cos(r) * v, vy = -Math.sin(r) * v;
    const T = GUIDE_T[g.diff] || GUIDE_T[1], ax = g.diff === 0 ? S.wind : 0, n = Math.round(T / 0.05);
    for (let i = 1; i <= n; i++) {
      const tt = i * 0.05, x = L.x + vx * tt + 0.5 * ax * tt * tt, y = L.y + vy * tt + 0.5 * GRAV * tt * tt;
      const fade = 1 - (i - 1) / n;
      ctx.globalAlpha = 0.3 + 0.65 * fade;
      g.circle(ctx, x, y, 2.6 + 2.6 * fade); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,30,70,.4)'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // טבעת כוח סביב הכדור
    const col = S.aim.p > 0.85 ? '#ff6b4a' : S.aim.p > 0.55 ? '#ffd166' : '#7be07b';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.arc(L.x, L.y, R + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(L.x, L.y, R + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.aim.p); ctx.stroke();
    if (S.drag && S.drag.moved) {
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.moveTo(S.drag.x0, S.drag.y0); ctx.lineTo(S.drag.x, S.drag.y); ctx.stroke();
      ctx.setLineDash([]);
      g.circle(ctx, S.drag.x0, S.drag.y0, 5); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
    }
  }

  function drawWindUI(g, ctx, S, x, y) {
    const lv = S.windLv;
    g.rr(ctx, x, y, 118, 34, 17);
    const bg = ctx.createLinearGradient(0, y, 0, y + 34);
    bg.addColorStop(0, '#12224e'); bg.addColorStop(1, '#0a1432');
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = 'rgba(160,215,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    // סמל רוח
    ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 10, y + 12); ctx.lineTo(x + 24, y + 12); ctx.arc(x + 24, y + 9, 3, Math.PI / 2, -Math.PI * 0.9, true);
    ctx.moveTo(x + 10, y + 19); ctx.lineTo(x + 28, y + 19); ctx.arc(x + 28, y + 22, 3, -Math.PI / 2, Math.PI * 0.9);
    ctx.moveTo(x + 10, y + 25); ctx.lineTo(x + 20, y + 25); ctx.stroke();
    // חץ באורך העוצמה
    const cx = x + 74, len = 8 + Math.abs(lv) * 5.5, dir = Math.sign(lv);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - dir * len / 2, y + 17); ctx.lineTo(cx + dir * len / 2, y + 17); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx + dir * (len / 2 + 8), y + 17); ctx.lineTo(cx + dir * (len / 2 - 2), y + 10); ctx.lineTo(cx + dir * (len / 2 - 2), y + 24); ctx.closePath(); ctx.fill();
    g.text(ctx, String(Math.abs(lv)), x + 106, y + 18, { size: 18, weight: 900, color: '#bfe6ff' });
  }

  function drawScoreUI(g, ctx, S) {
    const x = 14, y = 12, w = 196, h = 50;
    g.rr(ctx, x, y, w, h, 14);
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(18,28,64,.9)'); gr.addColorStop(1, 'rgba(10,16,40,.9)');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = S.fire ? '#ffb347' : 'rgba(255,140,60,.7)'; ctx.lineWidth = 2; ctx.stroke();
    drawBall(ctx, x + 24, y + 25, 12, 0.5, 1);
    g.text(ctx, String(S.score), x + 66, y + 27, { size: 30, weight: 900, color: S.fire ? '#ffb347' : '#ffffff' });
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + 104, y + 10, 2, h - 20);
    if (g.mode === 'time') g.text(ctx, fmtT(S.left), x + 152, y + 27, { size: 26, weight: 900, color: S.left <= 600 && (S.left > 180 || S.clock % 30 < 20) ? (S.left <= 600 ? '#ff6b6b' : '#fff') : '#ffffff' });
    else for (let i = 0; i < LIVES; i++) drawBall(ctx, x + 126 + i * 24, y + 25, 9, 0.3, i < S.lives ? 1 : 0.22);
  }

  function drawScene(g, ctx, S, alpha) {
    const t = S.clock / 60, ws = S.wind / WIND_UNIT;
    layer(ctx, 'sky', paintSky);
    for (const c of S.clouds) drawCloud(g, ctx, c.x, c.y, c.s);
    const sway = Math.sin(t * (1.2 + Math.abs(ws) * 0.5)) * (0.2 + Math.abs(ws) * 0.12) + ws * 0.18;
    drawTree(g, ctx, 46, 330, 1.05, sway);
    drawTree(g, ctx, 700, 318, 0.8, sway * 1.1);
    drawFans(g, ctx, S.cheer, t);
    drawFlag(g, ctx, 268, 236, ws, t);
    layer(ctx, 'court', paintCourt);
    // סימון המקום על הרצפה
    const sx = SPOTS[S.spot] + 2;
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, FLOOR + 6, 30, 7, 0, 0, Math.PI * 2); ctx.stroke();
    if (SPOTS[S.spot] < THREE_X) {
      g.circle(ctx, sx - 40, FLOOR + 18, 11); ctx.fillStyle = '#ffd166'; ctx.fill();
      g.text(ctx, '3', sx - 40, FLOOR + 19, { size: 15, weight: 900, color: '#5a3200' });
    }
    // עלים
    for (const L of S.leaves) if (L.on) { ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.fillStyle = L.c; ctx.beginPath(); ctx.ellipse(0, 0, L.s * 1.6, L.s * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    drawHoopBack(g, ctx, S.rimShake, S.boardShake);
    const balls = S.dead.slice();
    if (S.ball) balls.push(S.ball);
    const pos = b => ({ x: b.lx + (b.x - b.lx) * alpha, y: b.ly + (b.y - b.ly) * alpha });
    for (const b of balls) { const p = pos(b); ballShadow(ctx, p.x, p.y, b.fade); }
    for (const b of balls) if (inHoopZone(b)) { const p = pos(b); drawBall(ctx, p.x, p.y, R, b.a, b.fade); }
    drawHoopFront(g, ctx, S);
    // שובל
    for (let i = 0; i < S.trail.length; i += 2) {
      ctx.globalAlpha = (i + 2) / S.trail.length * 0.4;
      g.circle(ctx, S.trail[i], S.trail[i + 1], 4 + i * 0.4); ctx.fillStyle = S.fire ? '#ffb347' : '#ffffff'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // השחקן
    const o = poseOf(g, S);
    const kx = S.px;
    drawKid(g, ctx, kx, o);
    if (S.phase === 'ready' && !S.over) {
      const B = hand(kx), sc = g.ease.back(S.pop);
      if (S.fire) { ctx.globalAlpha = 0.5 + Math.sin(S.clock * 0.3) * 0.2; g.circle(ctx, B.x, B.y, R * 1.6); ctx.fillStyle = '#ff8a3d'; ctx.fill(); ctx.globalAlpha = 1; }
      drawBall(ctx, B.x, B.y, R * sc, 0.4, 1);
    }
    drawFrontArm(g, ctx, o);
    for (const b of balls) if (!inHoopZone(b)) { const p = pos(b); drawBall(ctx, p.x, p.y, R, b.a, b.fade); }
    // כדור מעל המסך: חץ קטן
    if (S.ball && S.ball.y < -R) { const x = g.clamp(S.ball.x, 20, W - 20); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x - 9, 20); ctx.lineTo(x + 9, 20); ctx.closePath(); ctx.fill(); }
    if (!g.demo && S.phase === 'ready' && !S.over && ((S.drag && S.drag.moved) || S.kb)) drawGuide(g, ctx, S);
    // רמז בזריקה הראשונה
    if (!g.demo && S.throws === 0 && S.phase === 'ready' && !(S.drag && S.drag.moved) && !S.kb) {
      const B = hand(kx), u = (S.clock % 110) / 110, e = u < 0.6 ? g.ease.inOut(u / 0.6) : 1;
      const px = B.x - 70 * e, py = B.y + 55 * e;
      ctx.globalAlpha = u < 0.85 ? 0.95 : (1 - u) / 0.15 * 0.95;
      g.circle(ctx, px + 4, py + 6, 15); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      g.circle(ctx, px, py, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#334'; ctx.stroke();
      ctx.globalAlpha = 1;
      g.text(ctx, g.t('dragHint'), g.clamp(B.x + 60, 170, 600), B.y - 72, { size: 24, color: '#fff', stroke: 'rgba(20,30,70,.75)', strokeW: 6, maxW: 420 });
    }
    if (!g.demo) {
      drawScoreUI(g, ctx, S);
      if (S.windLv) drawWindUI(g, ctx, S, 14, 70);
    }
  }

  // ================= טקסטים =================
  const TXT = {
    he: { title: 'זריקות לסל', help: ['גרור אחורה ושחרר כדי לזרוק — ככל שתמשוך יותר, הזריקה חזקה יותר', 'אחרי כל סל עוברים למקום חדש. מאחורי הקו הלבן — 3 נקודות!', 'סל נקי בלי לגעת בטבעת = נקודת בונוס. 3 סלים ברצף = בוער, ניקוד כפול!', 'בהמשך מתחילה רוח — הדגל והחץ מראים לאן היא נושבת', 'מקלדת: חצים — זווית וכוח, רווח — זריקה'], helpTouch: ['גרור אחורה ושחרר כדי לזרוק — ככל שתמשוך יותר, הזריקה חזקה יותר', 'אחרי כל סל עוברים למקום חדש. מאחורי הקו הלבן — 3 נקודות!', 'סל נקי בלי לגעת בטבעת = נקודת בונוס. 3 סלים ברצף = בוער, ניקוד כפול!', 'בהמשך מתחילה רוח — הדגל והחץ מראים לאן היא נושבת'], mode_time: '60 שניות', mode_streak: 'עד 3 החטאות', swish: 'סוויש!', bank: 'מהלוח!', fire: 'בוער! ניקוד כפול', miss: 'החטאה', wind: 'רוח', windStart: 'מתחילה רוח!', buzzer: 'סל עם הצפירה!', timeUp: 'נגמר הזמן!', outTitle: '3 החטאות — המשחק נגמר', stats: 'סלים: {b} · נקיים: {s} · רצף שיא: {r}', chances: 'סיכויים', dragHint: 'גרור אחורה ושחרר!', streakN: '{n} ברצף!' },
    en: { title: 'Basket Shots', help: ['Drag back and let go to throw — the further you pull, the harder the throw', 'After every basket you move to a new spot. Behind the white line — 3 points!', 'A clean shot that misses the rim = bonus point. 3 baskets in a row = on fire, double points!', 'Later the wind starts — the flag and the arrow show where it blows', 'Keyboard: arrows — angle and power, Space — throw'], helpTouch: ['Drag back and let go to throw — the further you pull, the harder the throw', 'After every basket you move to a new spot. Behind the white line — 3 points!', 'A clean shot that misses the rim = bonus point. 3 baskets in a row = on fire, double points!', 'Later the wind starts — the flag and the arrow show where it blows'], mode_time: '60 seconds', mode_streak: 'Until 3 misses', swish: 'Swish!', bank: 'Off the glass!', fire: 'On fire! Double points', miss: 'Miss', wind: 'Wind', windStart: 'The wind picks up!', buzzer: 'Buzzer beater!', timeUp: "Time's up!", outTitle: '3 misses — game over', stats: 'Baskets: {b} · Swishes: {s} · Best streak: {r}', chances: 'Chances', dragHint: 'Drag back and let go!', streakN: '{n} in a row!' },
    ar: { title: 'رميات السلة', help: ['اسحب للخلف واترك لترمي — كلما سحبت أكثر كانت الرمية أقوى', 'بعد كل سلة تنتقل إلى مكان جديد. خلف الخط الأبيض — 3 نقاط!', 'رمية نظيفة لا تلمس الحلقة = نقطة إضافية. 3 سلات متتالية = مشتعل، نقاط مضاعفة!', 'لاحقاً تبدأ الرياح — العلم والسهم يبيّنان اتجاهها', 'لوحة المفاتيح: الأسهم — الزاوية والقوة، المسافة — رمي'], helpTouch: ['اسحب للخلف واترك لترمي — كلما سحبت أكثر كانت الرمية أقوى', 'بعد كل سلة تنتقل إلى مكان جديد. خلف الخط الأبيض — 3 نقاط!', 'رمية نظيفة لا تلمس الحلقة = نقطة إضافية. 3 سلات متتالية = مشتعل، نقاط مضاعفة!', 'لاحقاً تبدأ الرياح — العلم والسهم يبيّنان اتجاهها'], mode_time: '60 ثانية', mode_streak: 'حتى 3 أخطاء', swish: 'سويش!', bank: 'من اللوحة!', fire: 'مشتعل! نقاط مضاعفة', miss: 'خطأ', wind: 'الرياح', windStart: 'بدأت الرياح!', buzzer: 'سلة مع صافرة النهاية!', timeUp: 'انتهى الوقت!', outTitle: '3 أخطاء — انتهت اللعبة', stats: 'السلات: {b} · النظيفة: {s} · أفضل سلسلة: {r}', chances: 'الفرص', dragHint: 'اسحب للخلف واترك!', streakN: '{n} على التوالي!' },
    es: { title: 'Tiros a canasta', help: ['Arrastra hacia atrás y suelta para tirar: cuanto más tires, más fuerte', 'Tras cada canasta cambias de sitio. Detrás de la línea blanca, ¡3 puntos!', 'Un tiro limpio sin tocar el aro = punto extra. 3 canastas seguidas = en racha, ¡puntos dobles!', 'Luego empieza el viento: la bandera y la flecha muestran hacia dónde sopla', 'Teclado: flechas — ángulo y fuerza, Espacio — tirar'], helpTouch: ['Arrastra hacia atrás y suelta para tirar: cuanto más tires, más fuerte', 'Tras cada canasta cambias de sitio. Detrás de la línea blanca, ¡3 puntos!', 'Un tiro limpio sin tocar el aro = punto extra. 3 canastas seguidas = en racha, ¡puntos dobles!', 'Luego empieza el viento: la bandera y la flecha muestran hacia dónde sopla'], mode_time: '60 segundos', mode_streak: 'Hasta 3 fallos', swish: '¡Limpia!', bank: '¡De tablero!', fire: '¡En racha! Puntos dobles', miss: 'Fallo', wind: 'Viento', windStart: '¡Empieza el viento!', buzzer: '¡Canasta sobre la bocina!', timeUp: '¡Se acabó el tiempo!', outTitle: '3 fallos: fin del juego', stats: 'Canastas: {b} · Limpias: {s} · Mejor racha: {r}', chances: 'Intentos', dragHint: '¡Arrastra hacia atrás y suelta!', streakN: '¡{n} seguidas!' },
    fr: { title: 'Tirs au panier', help: ["Tire vers l'arrière et lâche pour lancer : plus tu tires, plus c'est fort", 'Après chaque panier, tu changes de place. Derrière la ligne blanche : 3 points !', "Un tir propre sans toucher l'arceau = point bonus. 3 paniers de suite = en feu, points doublés !", 'Ensuite le vent se lève : le drapeau et la flèche montrent sa direction', 'Clavier : flèches — angle et puissance, Espace — lancer'], helpTouch: ["Tire vers l'arrière et lâche pour lancer : plus tu tires, plus c'est fort", 'Après chaque panier, tu changes de place. Derrière la ligne blanche : 3 points !', "Un tir propre sans toucher l'arceau = point bonus. 3 paniers de suite = en feu, points doublés !", 'Ensuite le vent se lève : le drapeau et la flèche montrent sa direction'], mode_time: '60 secondes', mode_streak: "Jusqu'à 3 ratés", swish: 'Swish !', bank: 'Avec la planche !', fire: 'En feu ! Points doublés', miss: 'Raté', wind: 'Vent', windStart: 'Le vent se lève !', buzzer: 'Panier au buzzer !', timeUp: 'Temps écoulé !', outTitle: '3 ratés — partie terminée', stats: 'Paniers : {b} · Swish : {s} · Meilleure série : {r}', chances: 'Essais', dragHint: 'Tire en arrière et lâche !', streakN: '{n} de suite !' },
    pt: { title: 'Arremessos à cesta', help: ['Arraste para trás e solte para arremessar: quanto mais puxar, mais forte', 'Depois de cada cesta você muda de lugar. Atrás da linha branca: 3 pontos!', 'Arremesso limpo sem tocar no aro = ponto extra. 3 cestas seguidas = pegando fogo, pontos em dobro!', 'Depois começa o vento: a bandeira e a seta mostram para onde ele sopra', 'Teclado: setas — ângulo e força, Espaço — arremessar'], helpTouch: ['Arraste para trás e solte para arremessar: quanto mais puxar, mais forte', 'Depois de cada cesta você muda de lugar. Atrás da linha branca: 3 pontos!', 'Arremesso limpo sem tocar no aro = ponto extra. 3 cestas seguidas = pegando fogo, pontos em dobro!', 'Depois começa o vento: a bandeira e a seta mostram para onde ele sopra'], mode_time: '60 segundos', mode_streak: 'Até 3 erros', swish: 'Swish!', bank: 'Na tabela!', fire: 'Pegando fogo! Pontos em dobro', miss: 'Errou', wind: 'Vento', windStart: 'Começou a ventar!', buzzer: 'Cesta no estouro do relógio!', timeUp: 'Acabou o tempo!', outTitle: '3 erros — fim de jogo', stats: 'Cestas: {b} · Limpas: {s} · Melhor sequência: {r}', chances: 'Chances', dragHint: 'Puxe para trás e solte!', streakN: '{n} seguidas!' },
    ru: { title: 'Броски в кольцо', help: ['Оттяни назад и отпусти, чтобы бросить: чем сильнее тянешь, тем сильнее бросок', 'После каждого попадания ты переходишь на новое место. За белой линией — 3 очка!', 'Чистый бросок, не задевший кольцо, = бонусное очко. 3 попадания подряд — в ударе, двойные очки!', 'Потом поднимается ветер — флаг и стрелка показывают, куда он дует', 'Клавиатура: стрелки — угол и сила, Пробел — бросок'], helpTouch: ['Оттяни назад и отпусти, чтобы бросить: чем сильнее тянешь, тем сильнее бросок', 'После каждого попадания ты переходишь на новое место. За белой линией — 3 очка!', 'Чистый бросок, не задевший кольцо, = бонусное очко. 3 попадания подряд — в ударе, двойные очки!', 'Потом поднимается ветер — флаг и стрелка показывают, куда он дует'], mode_time: '60 секунд', mode_streak: 'До 3 промахов', swish: 'Чисто!', bank: 'От щита!', fire: 'В ударе! Двойные очки', miss: 'Мимо', wind: 'Ветер', windStart: 'Поднялся ветер!', buzzer: 'Бросок с сиреной!', timeUp: 'Время вышло!', outTitle: '3 промаха — игра окончена', stats: 'Попаданий: {b} · Чистых: {s} · Лучшая серия: {r}', chances: 'Попытки', dragHint: 'Оттяни и отпусти!', streakN: '{n} подряд!' },
    de: { title: 'Korbwürfe', help: ['Zieh nach hinten und lass los zum Werfen – je weiter, desto kräftiger', 'Nach jedem Korb gehst du an einen neuen Platz. Hinter der weißen Linie – 3 Punkte!', 'Ein sauberer Wurf ohne Ringberührung = Bonuspunkt. 3 Körbe in Folge = heiß gelaufen, doppelte Punkte!', 'Später kommt Wind auf – Fahne und Pfeil zeigen, wohin er weht', 'Tastatur: Pfeile – Winkel und Kraft, Leertaste – Wurf'], helpTouch: ['Zieh nach hinten und lass los zum Werfen – je weiter, desto kräftiger', 'Nach jedem Korb gehst du an einen neuen Platz. Hinter der weißen Linie – 3 Punkte!', 'Ein sauberer Wurf ohne Ringberührung = Bonuspunkt. 3 Körbe in Folge = heiß gelaufen, doppelte Punkte!', 'Später kommt Wind auf – Fahne und Pfeil zeigen, wohin er weht'], mode_time: '60 Sekunden', mode_streak: 'Bis 3 Fehlwürfe', swish: 'Swish!', bank: 'Über das Brett!', fire: 'Heiß gelaufen! Doppelte Punkte', miss: 'Daneben', wind: 'Wind', windStart: 'Wind kommt auf!', buzzer: 'Korb mit der Schlusssirene!', timeUp: 'Zeit ist um!', outTitle: '3 Fehlwürfe – Spiel vorbei', stats: 'Körbe: {b} · Swish: {s} · Beste Serie: {r}', chances: 'Versuche', dragHint: 'Zieh zurück und lass los!', streakN: '{n} in Folge!' },
  };

  GK.register('basket-shots', {
    w: W, h: H, bg: '#1d3a7a', accent: '#ff9f43',
    modes: [{ id: 'time', label: 'mode_time' }, { id: 'streak', label: 'mode_streak' }],
    diffs: true, diffDefault: 0,
    text: TXT,
    // לבדיקות: הפיזיקה והחיפוש, בלי ציור
    sim: { SPOTS, WIND_UNIT, WIND_MAX, VMAX, PULL, AMIN, AMAX, PMIN, GUIDE_T, HOOP_X, RIM_Y, simThrow, solveThrow, crossAt, hand, ballFrame, mkBall },

    init(g) {
      g.s = newState(g);
      if (g.demo) { g.s.spot = 4; g.s.px = SPOTS[4]; g.s.wind = 2 * WIND_UNIT; for (let i = 0; i < 30; i++) netStep(g.s); g.s.wind = 0; }
      else { g.s.spot = g.ri(0, 2); g.s.px = SPOTS[g.s.spot]; }
    },

    step(g) {
      const S = g.s;
      if (g.mode === 'time' && S.left > 0 && !S.over) {
        S.left--;
        if (S.left <= 600 && S.left > 0 && S.left % 60 === 0) g.sfx('tick', { p: S.left <= 180 ? 1.5 : 1.1 });
        if (S.left === 0) {
          g.tone({ type: 'square', f: 196, dur: 0.75, vol: 0.1 }); g.tone({ type: 'sawtooth', f: 200, dur: 0.75, vol: 0.05 });
          if (S.phase === 'fly' && S.ball && !S.ball.done) S.buzz = true;
          else { finish(g); animate(g, true); return; }
        }
      }
      keyAim(g);
      const ev = S.ev; ev.length = 0;
      if (S.ball) ballFrame(S.ball, S.wind, ev);
      onHits(g, S, ev, true);
      if (S.phase === 'fly' && S.ball && !S.ball.done) {
        const b = S.ball;
        if (b.scored) { b.done = true; basket(g, b); }
        else if (b.floor || b.x < -2 * R || b.x > W + 2 * R || b.f >= BALL_T) { b.done = true; miss(g, b); }
      }
      S.pt++;
      if (S.phase === 'cheer' && S.pt >= 40) { if (!endNow(g)) goNext(g); }
      else if (S.phase === 'sad' && S.pt >= 34) { if (!endNow(g)) newBall(g); }
      else if (S.phase === 'move') {
        const w = S.walk; w.t++;
        const u = Math.min(1, w.t / w.dur);
        S.px = w.from + (w.to - w.from) * g.ease.inOut(u);
        if (u >= 1) newBall(g);
      }
      if (S.drag && S.phase !== 'ready' && S.phase !== 'move' && S.phase !== 'cheer' && S.phase !== 'sad') S.drag = null;
      animate(g, true);
      hud(g);
    },

    idle(g) { animate(g, false); },

    bot(g) {
      const S = g.s;
      if (S.phase !== 'ready' || S.over || S.drag) return;
      if (++S.botWait < 24) return;
      S.botWait = 0;
      const sol = solveThrow(S.px, S.wind, 48 + Math.random() * 14, (Math.random() - 0.5) * 10);
      if (!sol) return;
      S.aim.a = sol.a; S.aim.p = sol.p; S.kb = true;
      throwBall(g);
    },

    onPause(g) { if (g.s) g.s.drag = null; },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') {
        if (p.button === 2) { S.drag = null; return; }
        if (S.over || S.phase === 'fly') return;
        S.drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, id: p.id, moved: false };
        S.kb = false;
      } else if (type === 'move' && S.drag && S.drag.id === p.id) {
        S.drag.x = p.x; S.drag.y = p.y;
        const dx = S.drag.x0 - p.x, dy = S.drag.y0 - p.y;
        if (Math.hypot(dx, dy) > 6) S.drag.moved = true;
        if (!S.drag.moved) return;
        const prev = S.aim.p;
        setAimPull(S, dx, dy);
        if (Math.floor(prev * 10) !== Math.floor(S.aim.p * 10) && S.phase === 'ready') g.sfx('tick', { p: 0.6 + S.aim.p });
      } else if (type === 'up' && S.drag && S.drag.id === p.id) {
        const d = S.drag;
        S.drag = null;
        if (d.moved && S.phase === 'ready') throwBall(g);
      }
    },

    draw(g, ctx, alpha) { drawScene(g, ctx, g.s, alpha); },

    cover(ctx, w, h, k) {
      ctx.save();
      ctx.scale(w / W, h / H);
      paintSky(ctx, k);
      drawCloud(k, ctx, 330, 70, 1.1); drawCloud(k, ctx, 600, 40, 0.8);
      drawTree(k, ctx, 46, 330, 1.05, 0.3);
      drawTree(k, ctx, 700, 318, 0.8, 0.3);
      drawFans(k, ctx, 1, 0.4);
      drawFlag(k, ctx, 268, 236, 3, 1.2);
      paintCourt(ctx, k);
      drawHoopBack(k, ctx, 0, 0);
      // הרשת מתנפחת סביב הכדור שנכנס
      const S = { net: makeNet(), clock: 10, rimShake: 0.4, wind: 0, ball: mkBall(HOOP_X - 3, RIM_Y + 14, 0, 300), dead: [] };
      for (let i = 0; i < 6; i++) { netPush(S.net, S.ball); netStep(S); }
      drawBall(ctx, HOOP_X - 3, RIM_Y + 14, R, 0.8, 1);
      drawHoopFront(k, ctx, S);
      // שובל אש
      for (let i = 0; i < 22; i++) {
        const u = i / 22, x = 330 + u * 470, y = 300 - Math.sin(u * Math.PI * 0.92) * 230 + u * 40;
        ctx.globalAlpha = 0.15 + u * 0.55;
        k.circle(ctx, x, y, 5 + u * 9); ctx.fillStyle = i % 3 === 0 ? '#ffd166' : '#ff8a3d'; ctx.fill();
      }
      ctx.globalAlpha = 1;
      const o = { t: 0.3, jump: 18, arms: 'throw', aim: 58, mouth: 'open', look: { x: HOOP_X, y: RIM_Y } };
      drawKid(k, ctx, 300, o);
      drawFrontArm(k, ctx, o);
      // ניצוצות
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, x = HOOP_X + Math.cos(a) * 62, y = RIM_Y + 26 + Math.sin(a) * 42;
        ctx.fillStyle = i % 2 ? '#ffd166' : '#ffffff';
        ctx.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 2.5 : 7, an = j * Math.PI / 4 + i; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill();
      }
      k.text(ctx, '+3', HOOP_X - 92, RIM_Y - 48, { size: 46, weight: 900, color: '#ffffff', stroke: 'rgba(20,30,80,.75)', strokeW: 7 });
      ctx.restore();
    },
  });
})();
