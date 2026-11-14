// ============================================================
//  הוקי אוויר — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שולחן במבט מלמעלה. המחבט הולך אחרי העכבר או האצבע, הדיסקית קופצת מהדפנות.
//  נגד המחשב (3 רמות) או 2 שחקנים: שתי אצבעות על מסך מגע, או WASD והחצים. הראשון ל-7 מנצח.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540;
  const L = 40, R = 920, T = 40, B = 500;          // גבולות משטח המשחק
  const CX = W / 2, CY = H / 2, CORNER = 70;
  const GOAL_H = 190, G0 = CY - GOAL_H / 2, G1 = CY + GOAL_H / 2;
  const PR = 21, MR = 34;                          // רדיוס הדיסקית והמחבט
  const MAXV = 27, FRICTION = 0.9965;
  const HEAT_MAX = 40;                             // שניות בלי גול עד שהדיסקית הכי "חמה" (מהירה פי 1.5)
  const MALLET_MAX = 34;                           // מהירות מקסימלית של מחבט שהולך אחרי העכבר (לצעד)
  const TO_WIN = 7;
  const COL = [
    { main: '#2f8cff', dark: '#1550b8', light: '#a9d1ff', glow: 'rgba(47,140,255,' },
    { main: '#ff3d6b', dark: '#b3173f', light: '#ffb3c6', glow: 'rgba(255,61,107,' },
  ];
  // המחשב: מהירות מחבט, עיכוב בתגובה, טעות בכיוון, נטייה לתקוף, חיזוי (0 בלי, 1 ישר, 2 עם קירות), עומק המכה,
  // עד איזו מהירות הוא תוקף, טעות בהגנה, וכל כמה צעדים הוא מחשב מחדש איפה לעמוד
  const AIP = [
    { spd: 4.2, delay: 22, err: 90, atk: 0.4, predict: 0, strike: 26, slow: 5, derr: 55, plan: 30 },
    { spd: 6.4, delay: 15, err: 55, atk: 0.7, predict: 1, strike: 36, slow: 7, derr: 30, plan: 16 },
    { spd: 10.5, delay: 7, err: 20, atk: 1, predict: 2, strike: 62, slow: 14, derr: 18, plan: 9 },
  ];
  const KEYS = [
    { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' },
    { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' },
  ];

  const clampM = (m, side) => {
    const x0 = side === 0 ? L + MR : CX + MR, x1 = side === 0 ? CX - MR : R - MR;
    m.x = Math.max(x0, Math.min(x1, m.x)); m.y = Math.max(T + MR, Math.min(B - MR, m.y));
    cornerFix(m, CORNER - MR);
  };
  // פינות מעוגלות: מרכז העיגול חייב להישאר בתוך קשת הפינה
  function cornerFix(o, rad) {
    const cx = o.x < L + CORNER ? L + CORNER : o.x > R - CORNER ? R - CORNER : null;
    const cy = o.y < T + CORNER ? T + CORNER : o.y > B - CORNER ? B - CORNER : null;
    if (cx === null || cy === null) return null;
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d <= rad) return null;
    o.x = cx + dx / d * rad; o.y = cy + dy / d * rad;
    return { nx: -dx / d, ny: -dy / d };
  }

  function newMallet(side) { const x = side === 0 ? L + 110 : R - 110; return { x, y: CY, px: x, py: CY, vx: 0, vy: 0, kvx: 0, kvy: 0, side, useKeys: false, hitGlow: 0 }; }

  function placePuck(g, side) {
    const S = g.s, x = side === 0 ? CX - 170 : CX + 170;
    S.puck = { x, y: CY, px: x, py: CY, vx: 0, vy: 0, rot: 0, trail: [] };
    S.idle = 0;
    // מחבט שעומד על המקום של הדיסקית זז ממנה אחורה
    for (const m of S.mallets || []) {
      const dx = m.x - x, dy = m.y - CY, d = Math.hypot(dx, dy), min = PR + MR + 6;
      if (d < min) { const nx = d > 0.01 ? dx / d : (m.side === 0 ? -1 : 1), ny = d > 0.01 ? dy / d : 0; m.x = x + nx * min; m.y = CY + ny * min; clampM(m, m.side); if (Math.hypot(m.x - x, m.y - CY) < min) { m.x = x + (m.side === 0 ? -min : min); clampM(m, m.side); } m.px = m.x; m.py = m.y; }
    }
  }

  // ---------- קלט ----------
  function targetsFromInput(g) {
    const S = g.s, out = [null, null];
    const two = g.mode === '2p' && !g.demo;
    // אצבעות: כל אצבע שולטת במחבט של החצי שלה
    for (const p of g.touches.values()) {
      const side = two ? (p.x < CX ? 0 : 1) : 0;
      if (!out[side]) out[side] = { x: p.x, y: p.y, src: 'touch' };
    }
    // עכבר: רק אחרי שזז מעל השולחן. מקלדת גוברת עליו עד שהוא זז שוב
    S.mouseMoved = g.ptr.over && (g.ptr.x !== S.lastPtr.x || g.ptr.y !== S.lastPtr.y);
    if (S.mouseMoved) S.mouseActive = true;
    S.lastPtr.x = g.ptr.x; S.lastPtr.y = g.ptr.y;
    if (S.mouseActive && !g.touches.size) {
      const side = two ? (g.ptr.x < CX ? 0 : 1) : 0;
      if (!out[side]) out[side] = { x: g.ptr.x, y: g.ptr.y, src: 'mouse' };
    }
    return out;
  }
  function keyDir(g, k) { return { x: (g.key(k.r) ? 1 : 0) - (g.key(k.l) ? 1 : 0), y: (g.key(k.d) ? 1 : 0) - (g.key(k.u) ? 1 : 0) }; }

  function moveMallet(g, m, target, kd) {
    m.px = m.x; m.py = m.y;
    if (kd && (kd.x || kd.y)) {
      m.useKeys = true;
      const n = Math.hypot(kd.x, kd.y) || 1;
      m.kvx += (kd.x / n * 11 - m.kvx) * 0.22; m.kvy += (kd.y / n * 11 - m.kvy) * 0.22;
    } else { m.kvx *= 0.8; m.kvy *= 0.8; }
    if (target && !(kd && (kd.x || kd.y))) {
      m.useKeys = false; m.kvx = m.kvy = 0;
      const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
      const step = Math.min(d, target.max || MALLET_MAX);
      if (d > 0.01) { m.x += dx / d * step; m.y += dy / d * step; }
    } else if (m.useKeys) { m.x += m.kvx; m.y += m.kvy; }
    clampM(m, m.side);
    m.vx = m.x - m.px; m.vy = m.y - m.py;
    if (m.hitGlow > 0) m.hitGlow--;
  }

  // ---------- פיזיקה של הדיסקית ----------
  function clack(g, v, wall) {
    if (v < 1.5) return;
    const vol = Math.min(0.24, 0.05 + v * 0.012);
    if (wall) g.tone({ f: 260 + v * 8, f2: 160, dur: 0.06, type: 'triangle', vol: vol * 0.8 });
    else { g.tone({ f: 900 + v * 30, f2: 500, dur: 0.05, type: 'triangle', vol }); g.noise({ filter: 'highpass', f: 3000, dur: 0.04, vol: vol * 0.6 }); }
  }

  function puckStep(g) {
    const S = g.s, p = S.puck;
    p.px = p.x; p.py = p.y;
    const maxv = MAXV * (1 + 0.5 * Math.min(1, S.heat / HEAT_MAX));
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxv) { p.vx *= maxv / sp; p.vy *= maxv / sp; }
    const SUB = Math.max(4, Math.ceil(sp / 6));
    for (let i = 1; i <= SUB; i++) {
      p.x += p.vx / SUB; p.y += p.vy / SUB;
      // המחבטים (בתנועה בתוך הצעד)
      for (const m of S.mallets) {
        const mx = m.px + (m.x - m.px) * i / SUB, my = m.py + (m.y - m.py) * i / SUB;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy), min = PR + MR;
        if (d < min) {
          const nx = d > 0.01 ? dx / d : (m.side === 0 ? 1 : -1), ny = d > 0.01 ? dy / d : 0;
          p.x = mx + nx * min; p.y = my + ny * min;
          const rvx = p.vx - m.vx, rvy = p.vy - m.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            p.vx -= 1.9 * vn * nx; p.vy -= 1.9 * vn * ny;
            const imp = -vn;
            clack(g, imp, false);
            m.hitGlow = 10;
            S.lastHit = m.side; S.hits++;
            if (S.phase === 'ready') S.phase = 'play';
            if (imp > 12 && !g.demo) { g.burst(p.x - nx * PR, p.y - ny * PR, { n: 10, color: ['#ffffff', COL[m.side].light], speed: 4, life: 18, gravity: 0 }); g.shake(Math.min(6, imp * 0.25)); }
          }
        }
      }
      wallCollide(g, p);
      if (S.phase === 'play') {
        if (p.x < L - PR * 0.9) { goal(g, 1); return; }
        if (p.x > R + PR * 0.9) { goal(g, 0); return; }
      }
    }
    const nsp = Math.hypot(p.vx, p.vy);
    if (nsp > maxv) { p.vx *= maxv / nsp; p.vy *= maxv / nsp; }
    p.vx *= FRICTION; p.vy *= FRICTION;
    p.rot += (p.vx + p.vy) * 0.01;
    // דיסקית שנתקעה מתחת למחבט צמוד לקיר: המחבט נדחף ממנה
    for (const m of S.mallets) {
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d < PR + MR - 0.5 && d > 0.01) { m.x = p.x - dx / d * (PR + MR); m.y = p.y - dy / d * (PR + MR); clampM(m, m.side); }
    }
    if (g.frame % 2 === 0) { p.trail.push(p.x, p.y); if (p.trail.length > 16) p.trail.splice(0, 2); }
  }

  function wallCollide(g, p) {
    const e = 0.9;
    const inMouth = p.y > G0 + 2 && p.y < G1 - 2;
    if (p.y < T + PR) { p.y = T + PR; if (p.vy < 0) { clack(g, -p.vy, true); p.vy = -p.vy * e; } }
    if (p.y > B - PR) { p.y = B - PR; if (p.vy > 0) { clack(g, p.vy, true); p.vy = -p.vy * e; } }
    if (!inMouth) {
      if (p.x < L + PR) { p.x = L + PR; if (p.vx < 0) { clack(g, -p.vx, true); p.vx = -p.vx * e; } }
      if (p.x > R - PR) { p.x = R - PR; if (p.vx > 0) { clack(g, p.vx, true); p.vx = -p.vx * e; } }
    } else {
      // בתוך פתח השער: עמודי השער הם עיגולים קטנים בקצוות
      for (const [px, py] of [[L, G0], [L, G1], [R, G0], [R, G1]]) {
        const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy);
        if (d < PR + 3 && d > 0.01) {
          const nx = dx / d, ny = dy / d;
          p.x = px + nx * (PR + 3); p.y = py + ny * (PR + 3);
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= 1.85 * vn * nx; p.vy -= 1.85 * vn * ny; clack(g, -vn, true); }
        }
      }
      if (p.x < L || p.x > R) { p.y = Math.max(G0 + PR, Math.min(G1 - PR, p.y)); }
    }
    if (p.x > L && p.x < R) {
      const n = cornerFix(p, CORNER - PR);
      if (n) { const vn = p.vx * n.nx + p.vy * n.ny; if (vn < 0) { p.vx -= 1.9 * vn * n.nx; p.vy -= 1.9 * vn * n.ny; clack(g, -vn, true); } }
    }
  }

  function goal(g, scorer) {
    const S = g.s;
    S.score[scorer]++;
    S.heat = 0;
    S.phase = 'goal'; S.phaseT = 80; S.scorer = scorer; S.flashSide = scorer;
    const gx = scorer === 0 ? R + 10 : L - 10;
    S.puck.vx = S.puck.vy = 0; S.puck.x = gx; S.puck.trail.length = 0; S.puck.hidden = true;
    if (!g.demo) {
      g.shake(10);
      g.burst(gx, CY, { n: 50, color: [COL[scorer].main, COL[scorer].light, '#ffffff', '#ffe14d'], speed: 7, life: 55, gravity: 0, spread: Math.PI, dir: scorer === 0 ? Math.PI : 0, shape: 'square' });
      g.sfx(scorer === 0 && g.mode === 'cpu' ? 'score' : g.mode === 'cpu' ? 'error' : 'score');
      g.noise({ filter: 'bandpass', f: 700, f2: 1500, dur: 0.9, vol: 0.12, q: 0.6 });
      const s0 = S.score[0], s1 = S.score[1];
      if (s0 < TO_WIN && s1 < TO_WIN && (s0 === TO_WIN - 1 || s1 === TO_WIN - 1)) g.after(0.5, () => g.msg(g.t('matchPoint'), 1300, '#ffe14d'));
    }
  }

  // ---------- המחשב ----------
  function predictY(p, x0, bounce) {
    // איפה הדיסקית תחצה את הקו x0 (עם קפיצות מהקירות למעלה ולמטה)
    if (Math.abs(p.vx) < 0.2) return p.y;
    const t = (x0 - p.x) / p.vx;
    if (t < 0) return p.y;
    let y = p.y + p.vy * t;
    if (!bounce) return Math.max(T + PR, Math.min(B - PR, y));
    const lo = T + PR, hi = B - PR, span = hi - lo;
    let k = (y - lo) % (2 * span); if (k < 0) k += 2 * span;
    return lo + (k > span ? 2 * span - k : k);
  }
  function aiTarget(g, m, prm) {
    const S = g.s, side = m.side, dir = side === 1 ? -1 : 1;     // dir: כיוון ההתקפה
    const hist = S.hist;
    const p = hist.length ? hist[Math.max(0, hist.length - 1 - prm.delay)] : S.puck;
    const st = m.ai || (m.ai = { mode: 'defend', t: 0, aimY: CY, slowT: 0 });
    const ownX = side === 1 ? R : L, oppX = side === 1 ? L : R;
    const defX = ownX + dir * 70;                                // הקו שממנו מגנים, קצת לפני השער
    const inMyHalf = side === 1 ? p.x > CX + 2 : p.x < CX - 2;
    const sp = Math.hypot(p.vx, p.vy);
    const coming = p.vx * dir < -0.4;
    if (S.phase === 'goal') { st.mode = 'defend'; return { x: defX, y: CY, max: prm.spd }; }
    if (inMyHalf && sp < 1) st.slowT++; else st.slowT = 0;
    if (!inMyHalf) st.mode = 'defend';
    else if (st.mode !== 'attack' && (sp < prm.slow || !coming) && --st.t <= 0) {
      st.t = 20;
      // מחליט לתקוף; דיסקית שעומדת אצלו יותר משנייה וחצי — תמיד
      if (Math.random() < prm.atk || st.slowT > 90) {
        st.mode = 'attack'; st.phase = 'go'; st.atkT = 0; st.hitsAt = S.hits;
        const goalY = CY + (Math.random() * 2 - 1) * prm.err;
        st.aimY = prm.predict === 2 && Math.random() < 0.3 ? (Math.random() < 0.5 ? 2 * T - goalY : 2 * B - goalY) : goalY;
      }
    }
    if (st.mode === 'attack') {
      st.atkT++;
      if (st.atkT > 200 || S.hits !== st.hitsAt || (coming && sp > prm.slow * 1.6)) st.mode = 'defend';
    }
    if (st.mode === 'attack') {
      let dx = oppX - p.x, dy = st.aimY - p.y;
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;           // מהדיסקית אל היעד
      const reach = PR + MR;
      const bx = p.x - dx * (reach + 6), by = p.y - dy * (reach + 6);   // מאחורי הדיסקית
      if (st.phase === 'go') {
        const rx = m.x - p.x, ry = m.y - p.y;
        const front = rx * dx + ry * dy;                                 // חיובי = המחבט בצד הלא נכון
        if (front > -reach * 0.35) {
          // עוקף את הדיסקית מהצד בלי לגעת בה
          const sgn = (dx * ry - dy * rx) >= 0 ? 1 : -1;
          const wx = p.x - dy * sgn * (reach + 22) - dx * reach * 0.7, wy = p.y + dx * sgn * (reach + 22) - dy * reach * 0.7;
          return { x: wx, y: wy, max: prm.spd };
        }
        if (Math.hypot(m.x - bx, m.y - by) < 12) { st.phase = 'strike'; st.strikeT = 0; }
        else return { x: bx, y: by, max: prm.spd };
      }
      if (++st.strikeT > 30) st.mode = 'defend';
      // כשהדיסקית "חמה" (הרבה זמן בלי גול) המחשב מכה חזק יותר
      return { x: p.x + dx * prm.strike, y: p.y + dy * prm.strike, max: prm.spd * (1.4 + 0.9 * Math.min(1, S.heat / HEAT_MAX)) };
    }
    // מגן: עומד מול השער בגובה שבו הדיסקית תגיע (מחשב מחדש כל כמה צעדים, עם טעות קטנה)
    if (--st.dT <= 0 || st.defY == null) {
      st.dT = prm.plan;
      st.defErr = (Math.random() * 2 - 1) * prm.derr * (1 + Math.min(1, S.heat / HEAT_MAX));
      let y;
      if (coming && prm.predict > 0) y = predictY(p, defX, prm.predict === 2);
      else y = CY + (p.y - CY) * 0.55;
      st.defY = Math.max(G0 - 12, Math.min(G1 + 12, y + st.defErr));
    }
    return { x: defX, y: st.defY, max: prm.spd };
  }

  // ---------- זרימת המשחק ----------
  function tick(g) {
    const S = g.s;
    S.frame++;
    let tg = [null, null], kd = [null, null];
    if (g.demo) {
      tg = [aiTarget(g, S.mallets[0], AIP[1]), aiTarget(g, S.mallets[1], AIP[1])];
    } else {
      tg = targetsFromInput(g);
      if (S.botT) { tg[0] = S.botT; S.botT = null; }
      if (g.mode === 'cpu') {
        const a = keyDir(g, KEYS[0]), b = keyDir(g, KEYS[1]);
        kd[0] = { x: Math.max(-1, Math.min(1, a.x + b.x)), y: Math.max(-1, Math.min(1, a.y + b.y)) };
        tg[1] = aiTarget(g, S.mallets[1], AIP[g.diff] || AIP[1]);
        kd[1] = null;
      } else { kd = [keyDir(g, KEYS[0]), keyDir(g, KEYS[1])]; }
    }
    for (let i = 0; i < 2; i++) {
      const m = S.mallets[i], k = kd[i], t = tg[i];
      if (k && (k.x || k.y)) m.keyMode = true;
      if (t && t.src === 'mouse' && S.mouseMoved) m.keyMode = false;
      if (t && t.src === 'mouse' && m.keyMode) tg[i] = null;
    }
    if (S.phase === 'ready' || S.phase === 'play' || S.phase === 'goal') {
      moveMallet(g, S.mallets[0], tg[0], kd[0]);
      moveMallet(g, S.mallets[1], tg[1], kd[1]);
    }
    if (S.phase === 'play') { S.heat = Math.min(HEAT_MAX, S.heat + 1 / 60); if (!g.demo && S.heat >= HEAT_MAX * 0.5 && !S.hotSaid) { S.hotSaid = true; g.msg(g.t('hot'), 1200, '#ff9d2e'); g.sfx('power', { p: 0.8 }); } }
    if (S.heat < 1) S.hotSaid = false;
    if (S.phase === 'play' || S.phase === 'ready') puckStep(g);
    else { S.puck.px = S.puck.x; S.puck.py = S.puck.y; }
    S.hist.push({ x: S.puck.x, y: S.puck.y, vx: S.puck.vx, vy: S.puck.vy });
    if (S.hist.length > 30) S.hist.shift();
    if (S.phase === 'ready' && --S.phaseT <= 0) { S.phase = 'play'; }
    if (S.phase === 'goal' && --S.phaseT <= 0) {
      const done = Math.max(S.score[0], S.score[1]) >= TO_WIN;
      if (done && !g.demo) { S.phase = 'over'; finish(g); return; }
      if (done) S.score = [0, 0];
      placePuck(g, 1 - S.scorer);
      S.phase = 'ready'; S.phaseT = 45;
    }
    if (S.flashSide != null && S.phase !== 'goal') S.flashSide = null;
    // דיסקית שעומדת הרבה זמן: האוויר דוחף אותה לאט למרכז
    const p = S.puck;
    if (S.phase === 'play' && Math.hypot(p.vx, p.vy) < 0.15) { if (++S.idle > 360) { p.vx += (CX - p.x) * 0.0006; p.vy += (CY - p.y) * 0.0006; } } else S.idle = 0;
  }

  function finish(g) {
    const S = g.s, [a, b] = S.score;
    const scoreStr = '⁦' + a + ' : ' + b + '⁩';
    if (g.mode === 'cpu') {
      const res = a > b ? 'win' : 'lose';
      S.stats[res[0]][g.diff]++;
      g.save('stats', S.stats);
      g.end({ result: res, score: scoreStr, scoreLabel: g.t('final'), text: g.t('winsOn', { d: g.t(['easy', 'medium', 'hard'][g.diff]), n: S.stats.w[g.diff] }), delay: 900 });
    } else {
      S.tally[a > b ? 0 : 1]++;
      g.end({ winner: g.t(a > b ? 'p1' : 'p2'), score: scoreStr, scoreLabel: g.t('final'), text: g.t('tally', { a: S.tally[0], b: S.tally[1] }), delay: 900 });
    }
  }

  // ---------- ציור ----------
  const layers = {};
  function layer(ctx, name, paint) {
    const k = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
    let Lr = layers[name];
    if (!Lr || Lr.k !== k) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * k); c.height = Math.round(H * k);
      const x = c.getContext('2d'); x.scale(k, k); paint(x);
      Lr = layers[name] = { c, k };
    }
    ctx.drawImage(Lr.c, 0, 0, W, H);
  }
  function rinkPath(ctx, g, inset) { g.rr(ctx, L - inset, T - inset, R - L + inset * 2, B - T + inset * 2, CORNER + inset); }

  function paintTable(ctx, g) {
    // רקע: חדר משחקים כהה
    const bg = ctx.createRadialGradient(CX, CY, 100, CX, CY, 620);
    bg.addColorStop(0, '#1b2140'); bg.addColorStop(1, '#090b18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // מסגרת השולחן
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rinkPath(ctx, g, 30); ctx.fillStyle = '#20263f'; ctx.fill(); ctx.restore();
    const fr = ctx.createLinearGradient(0, T - 30, 0, B + 30);
    fr.addColorStop(0, '#39426a'); fr.addColorStop(1, '#1d2340');
    rinkPath(ctx, g, 26); ctx.fillStyle = fr; ctx.fill();
    // משטח
    const ice = ctx.createLinearGradient(L, T, R, B);
    ice.addColorStop(0, '#eaf6ff'); ice.addColorStop(0.5, '#ffffff'); ice.addColorStop(1, '#e3f0fb');
    rinkPath(ctx, g, 0); ctx.fillStyle = ice; ctx.fill();
    ctx.save(); rinkPath(ctx, g, 0); ctx.clip();
    // חורי אוויר
    ctx.fillStyle = 'rgba(80,110,150,.18)';
    for (let y = T + 14; y < B; y += 22) for (let x = L + 14 + ((y / 22) % 2) * 11; x < R; x += 22) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    // קווים: אמצע, עיגול מרכזי, קשתות השערים
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,61,107,.55)';
    ctx.beginPath(); ctx.moveTo(CX, T); ctx.lineTo(CX, B); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,61,107,.55)'; ctx.beginPath(); ctx.arc(CX, CY, 8, 0, Math.PI * 2); ctx.fill();
    for (const s of [0, 1]) {
      const gx = s === 0 ? L : R, c = COL[s];
      ctx.strokeStyle = c.glow + '.55)';
      ctx.beginPath(); ctx.arc(gx, CY, 110, s === 0 ? -Math.PI / 2 : Math.PI / 2, s === 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
      ctx.fillStyle = c.glow + '.07)'; ctx.beginPath(); ctx.arc(gx, CY, 110, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.glow + '.3)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s === 0 ? L + 230 : R - 230, T); ctx.lineTo(s === 0 ? L + 230 : R - 230, B); ctx.stroke();
      ctx.lineWidth = 4;
    }
    // השתקפות אור
    const sh = ctx.createLinearGradient(0, T, 0, B);
    sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(120,150,190,.12)');
    ctx.fillStyle = sh; ctx.fillRect(L, T, R - L, B - T);
    ctx.restore();
    // השערים: חריץ כהה בדופן
    for (const s of [0, 1]) {
      const x = s === 0 ? L - 26 : R;
      const gr = ctx.createLinearGradient(x, 0, x + 26, 0);
      gr.addColorStop(s === 0 ? 0 : 1, '#05060c'); gr.addColorStop(s === 0 ? 1 : 0, '#1a1f36');
      g.rr(ctx, x, G0, 26, GOAL_H, 6); ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = COL[s].main;
      ctx.fillRect(s === 0 ? L - 4 : R, G0 - 6, 4, 12); ctx.fillRect(s === 0 ? L - 4 : R, G1 - 6, 4, 12);
    }
  }

  function drawRails(g, ctx, S, t) {
    // הדפנות זוהרות; צד מי שהבקיע זוהר חזק
    ctx.save();
    ctx.lineWidth = 5;
    for (const s of [0, 1]) {
      const flash = S.flashSide === s ? 0.5 + 0.5 * Math.sin(t * 30) : 0;
      ctx.strokeStyle = COL[s].glow + (0.65 + flash * 0.35) + ')';
      ctx.shadowColor = COL[s].main; ctx.shadowBlur = 12 + flash * 25;
      ctx.beginPath();
      if (s === 0) { ctx.moveTo(CX, T - 3); ctx.lineTo(L + CORNER, T - 3); ctx.arc(L + CORNER, T + CORNER, CORNER + 3, -Math.PI / 2, Math.PI, true); ctx.lineTo(L - 3, G0); ctx.moveTo(L - 3, G1); ctx.lineTo(L - 3, B - CORNER); ctx.arc(L + CORNER, B - CORNER, CORNER + 3, Math.PI, Math.PI / 2, true); ctx.lineTo(CX, B + 3); }
      else { ctx.moveTo(CX, T - 3); ctx.lineTo(R - CORNER, T - 3); ctx.arc(R - CORNER, T + CORNER, CORNER + 3, -Math.PI / 2, 0); ctx.lineTo(R + 3, G0); ctx.moveTo(R + 3, G1); ctx.lineTo(R + 3, B - CORNER); ctx.arc(R - CORNER, B - CORNER, CORNER + 3, 0, Math.PI / 2); ctx.lineTo(CX, B + 3); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMallet(g, ctx, x, y, side, glow, r) {
    r = r || MR;
    const c = COL[side];
    ctx.fillStyle = 'rgba(0,0,40,.18)'; g.circle(ctx, x + 5, y + 8, r); ctx.fill();
    if (glow > 0) { ctx.globalAlpha = glow / 10 * 0.5; g.circle(ctx, x, y, r + 9); ctx.fillStyle = c.main; ctx.fill(); ctx.globalAlpha = 1; }
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    gr.addColorStop(0, c.light); gr.addColorStop(0.55, c.main); gr.addColorStop(1, c.dark);
    g.circle(ctx, x, y, r); ctx.fillStyle = gr; ctx.fill();
    g.circle(ctx, x, y, r * 0.72); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3; ctx.stroke();
    // הידית
    const hg = ctx.createRadialGradient(x - r * 0.15, y - r * 0.2, 2, x, y, r * 0.45);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.5, c.light); hg.addColorStop(1, c.dark);
    g.circle(ctx, x, y, r * 0.42); ctx.fillStyle = hg; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.45, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2); ctx.fill();
  }
  function drawPuck(g, ctx, x, y, rot, r) {
    r = r || PR;
    ctx.fillStyle = 'rgba(0,0,40,.22)'; g.circle(ctx, x + 3, y + 5, r); ctx.fill();
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#4a4f63'); gr.addColorStop(1, '#14161f');
    g.circle(ctx, x, y, r); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2.5; g.circle(ctx, x, y, r * 0.68); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#ffd24d';
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(r * 0.68, 0, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.3, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function drawScene(g, ctx, alpha) {
    const S = g.s, t = S.frame / 60;
    const lerp = (a, b) => a + (b - a) * alpha;
    layer(ctx, 'table', c => paintTable(c, g));
    // הניקוד, גדול ושקוף על המשטח
    for (const s of [0, 1]) g.text(ctx, String(S.score[s]), s === 0 ? CX - 200 : CX + 200, CY + 4, { size: 150, weight: 900, color: COL[s].glow + '.13)' });
    drawRails(g, ctx, S, t);
    const p = S.puck;
    if (!p.hidden) {
      // שובל
      const tr = p.trail, sp = Math.hypot(p.vx, p.vy), hot = Math.min(1, S.heat / HEAT_MAX);
      if (sp > 6 && tr.length >= 4) {
        const col = hot > 0.5 ? '#ff7a1a' : '#ffd24d';
        for (let i = 0; i < tr.length; i += 2) {
          const a = (i / tr.length) * Math.min(1, (sp - 6) / 10) * (0.35 + hot * 0.3);
          ctx.globalAlpha = a; g.circle(ctx, tr[i], tr[i + 1], PR * (0.5 + 0.5 * i / tr.length)); ctx.fillStyle = col; ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (hot > 0.5) { ctx.globalAlpha = (hot - 0.5) * 1.2 * (0.6 + 0.4 * Math.sin(t * 14)); g.circle(ctx, lerp(p.px, p.x), lerp(p.py, p.y), PR + 7); ctx.fillStyle = '#ff7a1a'; ctx.fill(); ctx.globalAlpha = 1; }
      drawPuck(g, ctx, lerp(p.px, p.x), lerp(p.py, p.y), p.rot);
    }
    for (const m of S.mallets) drawMallet(g, ctx, lerp(m.px, m.x), lerp(m.py, m.y), m.side, m.hitGlow);
    // הודעות
    if (S.phase === 'goal' && !g.demo) {
      const u = 1 - S.phaseT / 80, k = g.ease.back(Math.min(1, u * 3));
      ctx.save(); ctx.translate(S.scorer === 0 ? CX + 200 : CX - 200, CY); ctx.scale(k, k);
      g.text(ctx, g.t('goal'), 0, 0, { size: 72, weight: 900, color: COL[S.scorer].main, stroke: '#ffffff', strokeW: 10, maxW: 380 });
      ctx.restore();
    }
    if (S.phase === 'ready' && S.first && !g.demo) g.text(ctx, g.t('firstTo', { n: TO_WIN }), CX, CY - 120, { size: 30, weight: 900, color: '#1d2340', alpha: Math.min(1, S.phaseT / 20), maxW: 600 });
  }

  // ---------- הרישום ----------
  GK.register('air-hockey', {
    w: W, h: H, bg: '#0d1022', accent: '#ff3d6b',
    modes: ['cpu', '2p'],
    diffs: true, diffModes: ['cpu'], diffDefault: 0,
    noBest: true,
    text: {
      he: { title: 'הוקי אוויר', help: ['הזז את העכבר — המחבט הכחול הולך אחריו', 'או: WASD או החצים', 'הכנס את הדיסקית לשער של היריב', 'הראשון שמגיע ל-7 מנצח', '2 שחקנים: שחקן 1 עם WASD, שחקן 2 עם החצים'], helpTouch: ['גרור את האצבע — המחבט הולך אחריה', 'הכנס את הדיסקית לשער של היריב', 'הראשון שמגיע ל-7 מנצח', '2 שחקנים: כל אחד שם אצבע בצד שלו של המסך'], goal: 'גול!', final: 'התוצאה', matchPoint: 'נקודת ניצחון!', firstTo: 'הראשון ל-{n} מנצח!', winsOn: 'ניצחונות ברמה {d}: {n}', winsLbl: 'ניצחונות', tally: 'ניצחונות: שחקן 1 — {a} · שחקן 2 — {b}', hot: 'הדיסקית מתחממת! 🔥' },
      en: { title: 'Air Hockey', help: ['Move the mouse — the blue mallet follows it', 'Or: WASD or the arrow keys', "Hit the puck into your opponent's goal", 'First to 7 wins', '2 players: player 1 uses WASD, player 2 the arrows'], helpTouch: ['Drag your finger — the mallet follows it', "Hit the puck into your opponent's goal", 'First to 7 wins', '2 players: each puts a finger on their own side'], goal: 'GOAL!', final: 'Final score', matchPoint: 'Match point!', firstTo: 'First to {n} wins!', winsOn: 'Wins on {d}: {n}', winsLbl: 'Wins', tally: 'Wins: player 1 — {a} · player 2 — {b}', hot: 'The puck is heating up! 🔥' },
      ar: { title: 'هوكي الهواء', help: ['حرّك الفأرة — المضرب الأزرق يتبعها', 'أو: WASD أو الأسهم', 'أدخل القرص في مرمى خصمك', 'أول من يصل إلى 7 يفوز', 'لاعبان: اللاعب 1 بـ WASD واللاعب 2 بالأسهم'], helpTouch: ['اسحب إصبعك — المضرب يتبعه', 'أدخل القرص في مرمى خصمك', 'أول من يصل إلى 7 يفوز', 'لاعبان: كل واحد يضع إصبعه في جهته من الشاشة'], goal: 'هدف!', final: 'النتيجة', matchPoint: 'نقطة الفوز!', firstTo: 'أول من يصل إلى {n} يفوز!', winsOn: 'الانتصارات في مستوى {d}: {n}', winsLbl: 'الانتصارات', tally: 'الانتصارات: اللاعب 1 — {a} · اللاعب 2 — {b}', hot: 'القرص يسخن! 🔥' },
      es: { title: 'Hockey de Aire', help: ['Mueve el ratón: el mazo azul lo sigue', 'O usa WASD o las flechas', 'Mete el disco en la portería rival', 'Gana el primero que llegue a 7', '2 jugadores: el jugador 1 usa WASD y el 2 las flechas'], helpTouch: ['Arrastra el dedo: el mazo lo sigue', 'Mete el disco en la portería rival', 'Gana el primero que llegue a 7', '2 jugadores: cada uno pone un dedo en su lado'], goal: '¡GOL!', final: 'Resultado', matchPoint: '¡Punto de partido!', firstTo: '¡Gana el primero en llegar a {n}!', winsOn: 'Victorias en {d}: {n}', winsLbl: 'Victorias', tally: 'Victorias: jugador 1 — {a} · jugador 2 — {b}', hot: '¡El disco se calienta! 🔥' },
      fr: { title: 'Air Hockey', help: ['Bouge la souris : le maillet bleu la suit', 'Ou : WASD ou les flèches', 'Envoie le palet dans le but adverse', 'Le premier à 7 gagne', '2 joueurs : le joueur 1 avec WASD, le joueur 2 avec les flèches'], helpTouch: ['Glisse ton doigt : le maillet le suit', 'Envoie le palet dans le but adverse', 'Le premier à 7 gagne', '2 joueurs : chacun pose un doigt de son côté'], goal: 'BUT !', final: 'Score final', matchPoint: 'Balle de match !', firstTo: 'Le premier à {n} gagne !', winsOn: 'Victoires en {d} : {n}', winsLbl: 'Victoires', tally: 'Victoires : joueur 1 — {a} · joueur 2 — {b}', hot: 'Le palet chauffe ! 🔥' },
      pt: { title: 'Hóquei de Mesa', help: ['Mexa o mouse: o batedor azul o segue', 'Ou use WASD ou as setas', 'Coloque o disco no gol do adversário', 'Quem chegar a 7 primeiro vence', '2 jogadores: o jogador 1 usa WASD e o 2 as setas'], helpTouch: ['Arraste o dedo: o batedor o segue', 'Coloque o disco no gol do adversário', 'Quem chegar a 7 primeiro vence', '2 jogadores: cada um põe um dedo no seu lado'], goal: 'GOL!', final: 'Placar final', matchPoint: 'Ponto da vitória!', firstTo: 'Quem chegar a {n} primeiro vence!', winsOn: 'Vitórias no {d}: {n}', winsLbl: 'Vitórias', tally: 'Vitórias: jogador 1 — {a} · jogador 2 — {b}', hot: 'O disco está esquentando! 🔥' },
      ru: { title: 'Аэрохоккей', help: ['Двигай мышь — синяя бита следует за ней', 'Или: WASD или стрелки', 'Забей шайбу в ворота соперника', 'Кто первым наберёт 7, тот победил', '2 игрока: игрок 1 — WASD, игрок 2 — стрелки'], helpTouch: ['Веди пальцем — бита следует за ним', 'Забей шайбу в ворота соперника', 'Кто первым наберёт 7, тот победил', '2 игрока: каждый держит палец на своей половине'], goal: 'ГОЛ!', final: 'Счёт', matchPoint: 'Матчбол!', firstTo: 'Кто первым наберёт {n}, побеждает!', winsOn: 'Победы, уровень «{d}»: {n}', winsLbl: 'Победы', tally: 'Победы: игрок 1 — {a} · игрок 2 — {b}', hot: 'Шайба раскаляется! 🔥' },
      de: { title: 'Airhockey', help: ['Bewege die Maus — der blaue Schläger folgt ihr', 'Oder: WASD oder die Pfeiltasten', 'Schieß den Puck ins gegnerische Tor', 'Wer zuerst 7 hat, gewinnt', '2 Spieler: Spieler 1 mit WASD, Spieler 2 mit den Pfeilen'], helpTouch: ['Zieh den Finger — der Schläger folgt ihm', 'Schieß den Puck ins gegnerische Tor', 'Wer zuerst 7 hat, gewinnt', '2 Spieler: jeder legt einen Finger auf seine Seite'], goal: 'TOR!', final: 'Endstand', matchPoint: 'Matchball!', firstTo: 'Wer zuerst {n} hat, gewinnt!', winsOn: 'Siege auf {d}: {n}', winsLbl: 'Siege', tally: 'Siege: Spieler 1 — {a} · Spieler 2 — {b}', hot: 'Der Puck wird heiß! 🔥' },
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
      const S = g.s = {
        tally, frame: 0, score: [0, 0], mallets: [newMallet(0), newMallet(1)], puck: null, hist: [],
        phase: 'ready', phaseT: 70, first: true, scorer: 0, flashSide: null, idle: 0, hits: 0, lastHit: -1, heat: 0, hotSaid: false,
        lastPtr: { x: g.ptr.x, y: g.ptr.y }, mouseActive: false, botT: null,
        stats: g.load('stats', { w: [0, 0, 0], l: [0, 0, 0] }),
      };
      placePuck(g, 0);
      if (g.demo) {
        S.phase = 'play'; S.puck.vx = 9; S.puck.vy = 5; S.score = [3, 2];
        for (let i = 0; i < 20; i++) tick(g);
      }
    },

    step(g) {
      const S = g.s;
      if (S.phase === 'over') return;
      if (S.phase === 'play') S.first = false;
      tick(g);
      if (g.mode === 'cpu') g.hud([[g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff]), '#ffd24d'], [g.t('winsLbl'), S.stats.w[g.diff]]]);
      else g.hud([[g.t('p1'), '🏆 ' + S.tally[0], COL[0].light], [g.t('p2'), '🏆 ' + S.tally[1], COL[1].light]]);
    },

    idle(g) { if (g.demo && g.s && g.s.mallets) tick(g); else if (g.s && g.s.frame != null) g.s.frame++; },

    // בוט לבדיקות: מזיז את מחבט שחקן 1 כמו עכבר (אותו מסלול כמו קלט אמיתי)
    bot(g) {
      const S = g.s; if (!S || !S.mallets) return;
      const tgt = aiTarget(g, S.mallets[0], AIP[1]);
      S.botT = { x: tgt.x, y: tgt.y, max: 18 };
    },

    draw(g, ctx, alpha) {
      if (!g.s || !g.s.mallets) return;
      drawScene(g, ctx, alpha);
    },

    cover(ctx, w, h, k) {
      ctx.save(); ctx.scale(w / W, h / H);
      paintTable(ctx, k);
      const S = { flashSide: 1, frame: 3 };
      drawRails(k, ctx, S, 0.06);
      k.text(ctx, '6', CX - 200, CY + 4, { size: 150, weight: 900, color: COL[0].glow + '.13)' });
      k.text(ctx, '5', CX + 200, CY + 4, { size: 150, weight: 900, color: COL[1].glow + '.13)' });
      // דיסקית עפה עם שובל אל השער האדום, המחבט האדום לא מספיק להגיע
      const x0 = 372, y0 = 196, x1 = 712, y1 = 300;
      for (let i = 14; i >= 1; i--) {
        const u = 1 - i / 15;
        ctx.globalAlpha = 0.04 + 0.4 * u * u;
        k.circle(ctx, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, PR * (0.45 + 0.75 * u)); ctx.fillStyle = u > 0.6 ? '#ff9d2e' : '#ffd24d'; ctx.fill();
      }
      ctx.globalAlpha = 1;
      const sr = k.seeded(4);
      for (let i = 0; i < 16; i++) { const a = -0.9 + sr() * 1.8, d = 26 + sr() * 40; k.circle(ctx, 352 + Math.cos(a) * d, 186 + Math.sin(a) * d, 2 + sr() * 3.5); ctx.fillStyle = i % 2 ? '#ffffff' : '#ffd24d'; ctx.fill(); }
      drawMallet(k, ctx, 300, 170, 0, 10, MR * 1.3);
      drawMallet(k, ctx, 810, 150, 1, 0, MR * 1.3);
      ctx.save(); ctx.translate(x1, y1); ctx.scale(1.55, 1.55); drawPuck(k, ctx, 0, 0, 0.5); ctx.restore();
      ctx.restore();
    },
  });
})();
