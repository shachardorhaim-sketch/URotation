// ============================================================
//  צינורות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מסובבים צינורות כדי שהמים יזרמו ממגדל המים לכל הפרחים.
//  40 שלבים מ-4×4 עד 9×9. כל שלב נבנה בזרע קבוע מעץ פורש של כל הלוח,
//  ולכן יש לו פתרון בוודאות (והבדיקות מוכיחות את זה שוב בפותר נפרד).
// ============================================================
(function () {
  'use strict';
  const LEVELS = 40;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], BIT = [1, 2, 4, 8];   // למעלה, ימינה, למטה, שמאלה
  const rotM = (m, r) => { r = ((r % 4) + 4) % 4; while (r-- > 0) m = ((m << 1) | (m >> 3)) & 15; return m; };
  const nbits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  const period = m => (rotM(m, 1) === m ? 1 : rotM(m, 2) === m ? 2 : 4);
  const SIZE = n => (n <= 4 ? 4 : n <= 10 ? 5 : n <= 17 ? 6 : n <= 25 ? 7 : n <= 33 ? 8 : 9);
  const OUTS = { 4: [3, 4], 5: [3, 5], 6: [4, 6], 7: [5, 7], 8: [6, 9], 9: [7, 10] };
  const PETAL = ['#ff5d8f', '#ffb238', '#b979ff', '#ff6b4a', '#4fb8ff', '#ffe14d', '#ff8ad8', '#62d97c', '#ff9f6b', '#9fa8ff'];
  const WATER = '#38bdf8', WATER_HI = '#d4f4ff', WIN_RATE = 0.5;
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ----- בניית שלב: עץ פורש על כל הלוח, העלים הם הפרחים, ואז ערבוב הסיבובים -----
  // kind: 0 = צינור (מסתובב), 1 = מגדל המים, 2 = פרח. shape = הפתחים בפתרון. rot = כמה רבעי סיבוב התערבב.
  function build(cols, rows, seed, lo, hi) {
    for (let a = 0; a < 800; a++) {
      const R = rng(seed * 31 + a * 7919 + 17);
      const n = cols * rows, link = new Uint8Array(n), seen = new Uint8Array(n);
      const sx = Math.min(cols - 1, Math.floor(cols * (0.3 + R() * 0.4))), sy = Math.min(rows - 1, Math.floor(rows * (0.3 + R() * 0.4)));
      const src = sy * cols + sx, pNew = 0.45 + R() * 0.5, act = [src];
      seen[src] = 1;
      while (act.length) {
        const ai = R() < pNew ? act.length - 1 : Math.floor(R() * act.length);
        const c = act[ai], x = c % cols, y = (c / cols) | 0, opts = [];
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx]) opts.push(d); }
        if (!opts.length) { act.splice(ai, 1); continue; }
        const d = opts[Math.floor(R() * opts.length)], nc = (y + DY[d]) * cols + x + DX[d];
        link[c] |= BIT[d]; link[nc] |= BIT[(d + 2) & 3]; seen[nc] = 1; act.push(nc);
      }
      const kind = new Uint8Array(n), outs = [];
      for (let i = 0; i < n; i++) { if (i === src) kind[i] = 1; else if (nbits(link[i]) === 1) { kind[i] = 2; outs.push(i); } }
      if (outs.length < lo || outs.length > hi) continue;
      const rot = new Int8Array(n);
      let par = 0, pipes = 0;
      for (let i = 0; i < n; i++) {
        if (kind[i]) continue;
        pipes++;
        const p = period(link[i]);
        rot[i] = p === 1 ? 0 : Math.floor(R() * 4);
        par += (p - (rot[i] % p)) % p;
      }
      if (par < Math.max(3, pipes * 0.75)) continue;
      // המרחק של כל משבצת מהמגדל בפתרון (לרמזים ולגל החגיגה)
      const sd = new Int16Array(n).fill(-1), q = [src];
      sd[src] = 0;
      for (let h = 0; h < q.length; h++) {
        const c = q[h], x = c % cols, y = (c / cols) | 0;
        for (let d = 0; d < 4; d++) if (link[c] & BIT[d]) { const nc = (y + DY[d]) * cols + x + DX[d]; if (sd[nc] < 0) { sd[nc] = sd[c] + 1; q.push(nc); } }
      }
      const P = { cols, rows, src, kind, shape: link, rot, outs, par, pipes, sd, tries: a };
      if (flow(P, rot, flowBuf(n)) === outs.length) continue;   // לא מתחילים פתור
      return P;
    }
    return null;
  }
  const levelPuzzle = n => { const s = SIZE(n); return build(s, s, 9001 + n * 131, OUTS[s][0], OUTS[s][1]); };

  // ----- זרימת המים: מהמגדל דרך פתחים שמתאימים זה לזה -----
  const maskOf = (P, rot, i) => (P.kind[i] ? P.shape[i] : rotM(P.shape[i], rot[i]));
  const flowBuf = n => ({ on: new Uint8Array(n), from: new Int8Array(n), dist: new Int16Array(n), q: new Int16Array(n) });
  function flow(P, rot, F) {
    const { on, from, dist, q } = F, cols = P.cols, rows = P.rows;
    on.fill(0); from.fill(-1);
    let h = 0, tl = 0;
    q[tl++] = P.src; on[P.src] = 1; dist[P.src] = 0;
    while (h < tl) {
      const c = q[h++], m = maskOf(P, rot, c), x = c % cols, y = (c / cols) | 0;
      for (let d = 0; d < 4; d++) {
        if (!(m & BIT[d])) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nc = ny * cols + nx;
        if (on[nc] || !(maskOf(P, rot, nc) & BIT[(d + 2) & 3])) continue;
        on[nc] = 1; from[nc] = (d + 2) & 3; dist[nc] = dist[c] + 1; q[tl++] = nc;
      }
    }
    let lit = 0;
    for (const o of P.outs) if (on[o]) lit++;
    return lit;
  }

  // ----- מצב משחק -----
  function makeState(g, P, solved) {
    const n = P.cols * P.rows;
    const S = {
      P, n, rot: Int8Array.from(P.rot), aim: new Int32Array(n), ang: new Float32Array(n),
      wet: new Float32Array(n), bloom: new Float32Array(n), open: new Uint8Array(n), glow: new Float32Array(n),
      F: flowBuf(n), lit: 0, turns: 0, hints: 0, cur: P.src, kbd: false, hover: -1, hoverBtn: null, press: null, pressT: 0,
      won: false, winT: 0, fin: -1, maxD: 0, finAt: -1, t: 0, botT: 0, intro: solved ? 99 : 0, wobble: new Float32Array(n),
    };
    if (solved) S.rot.fill(0);
    for (let i = 0; i < n; i++) S.aim[i] = S.ang[i] = S.rot[i];
    S.lit = flow(P, S.rot, S.F);
    if (solved) for (let i = 0; i < n; i++) if (S.F.on[i]) { S.wet[i] = 1; if (P.kind[i] === 2) { S.open[i] = 1; S.bloom[i] = 1; } }
    S.petal = P.outs.map((o, k) => PETAL[k % PETAL.length]);
    S.petalOf = new Map(P.outs.map((o, k) => [o, S.petal[k]]));
    layout(g, S);
    return S;
  }

  function layout(g, S) {
    const W = g.W, H = g.H, P = S.P;
    if (W >= H) {
      const side = 170, c = Math.floor(Math.min((W - side - 60) / P.cols, (H - 50) / P.rows, 118));
      S.c = c; S.bw = c * P.cols; S.bh = c * P.rows;
      S.bx = Math.round((W - side - S.bw) / 2 + 12); S.by = Math.round((H - S.bh) / 2);
      const sx = Math.round((S.bx + S.bw + W) / 2);
      S.counter = { x: sx, y: H / 2 - 120 };
      S.btns = [{ id: 'restart', x: sx - 46, y: H / 2 - 40, w: 92, h: 92, key: 'R' }, { id: 'hint', x: sx - 46, y: H / 2 + 74, w: 92, h: 92, key: 'H' }];
    } else {
      const c = Math.floor(Math.min((W - 40) / P.cols, (H - 260) / P.rows, 118));
      S.c = c; S.bw = c * P.cols; S.bh = c * P.rows;
      S.bx = Math.round((W - S.bw) / 2); S.by = Math.round(30 + (H - 260 - S.bh) / 2);
      const y = S.by + S.bh + 50;
      S.counter = { x: W / 2 - 170, y: y + 46 };
      S.btns = [{ id: 'restart', x: W / 2 - 40, y, w: 92, h: 92, key: 'R' }, { id: 'hint', x: W / 2 + 90, y, w: 92, h: 92, key: 'H' }];
    }
  }
  const cellAt = (S, x, y) => {
    const cx = Math.floor((x - S.bx) / S.c), cy = Math.floor((y - S.by) / S.c);
    return cx >= 0 && cy >= 0 && cx < S.P.cols && cy < S.P.rows ? cy * S.P.cols + cx : -1;
  };
  const btnAt = (S, x, y) => S.btns.find(b => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) || null;

  // ----- פעולות השחקן (העכבר, המגע, המקלדת והבוט עוברים כולם כאן) -----
  function turn(g, i, dir, free) {
    const S = g.s, P = S.P;
    if (S.won || i < 0) return;
    if (P.kind[i]) { S.wobble[i] = 1; if (!free) g.sfx('error'); return; }
    S.aim[i] += dir;
    S.rot[i] = (((S.rot[i] + dir) % 4) + 4) % 4;
    if (!free) { S.turns++; g.tone({ f: dir > 0 ? 560 : 470, f2: dir > 0 ? 420 : 360, dur: 0.07, type: 'triangle', vol: 0.13 }); }
    const was = S.lit;
    S.lit = flow(P, S.rot, S.F);
    if (S.lit > was) g.tone({ f: 300, f2: 620, dur: 0.16, type: 'sine', vol: 0.12, delay: 0.04 });
    hud(g);
    if (S.lit === P.outs.length) win(g);
  }
  // נפתר: השלב נגמר מיד (הכוכבים נשמרים), והמים ממשיכים לזרום ולהפריח מאחורי החלון
  function win(g) {
    const S = g.s, P = S.P;
    S.won = true; S.winT = 0; S.kbd = false;
    let maxD = 0;
    for (let i = 0; i < S.n; i++) if (S.F.on[i] && S.F.dist[i] > maxD) maxD = S.F.dist[i];
    S.maxD = maxD;
    S.finAt = fillFrames(S) + 4;
    const stars = S.turns <= P.par ? 3 : S.turns <= Math.ceil(P.par * 1.5) + 2 ? 2 : 1;
    if (!g.demo) g.completeLevel(stars, { text: g.t('result', { n: S.turns, p: P.par }), delay: 700 });
  }
  // כמה צעדים עד שהמים מגיעים לכל הפרחים (אותו חשבון כמו stepWorld, על עותק)
  function fillFrames(S) {
    const P = S.P, on = S.F.on, from = S.F.from, wet = Float32Array.from(S.wet);
    for (let f = 0; f < 600; f++) {
      if (P.outs.every(o => wet[o] >= 1)) return f;
      for (let i = 0; i < S.n; i++) {
        if (!on[i]) continue;
        if (i === P.src) { wet[i] = 1; continue; }
        const fr = from[i], pi = i + DX[fr] + DY[fr] * P.cols;
        if (wet[pi] >= 0.999) wet[i] = Math.min(1, wet[i] + WIN_RATE);
      }
    }
    return 600;
  }
  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    if (g.H > g.W) g.hud([[g.t('level'), g.level], [g.t('turns'), S.turns + '/' + S.P.par]]);   // צר: שני שבבים כדי שלא יישברו לשתי שורות
    else g.hud([[g.t('level'), g.level], [g.t('turns'), S.turns], [g.t('goal'), S.P.par]]);
  }
  function wrongTile(S) {
    const P = S.P;
    let best = -1;
    for (let i = 0; i < S.n; i++) {
      if (P.kind[i]) continue;
      const p = period(P.shape[i]);
      if (S.rot[i] % p === 0) continue;
      if (best < 0 || P.sd[i] < P.sd[best]) best = i;
    }
    return best;
  }
  function fixTile(g, i, free) {
    const S = g.s, p = period(S.P.shape[i]), k = (p - (S.rot[i] % p)) % p;
    if (k === 3) turn(g, i, -1, free);
    else for (let j = 0; j < k; j++) turn(g, i, 1, free);
    return k === 3 ? 1 : k;
  }
  function hint(g) {
    const S = g.s;
    if (S.won) return;
    const i = wrongTile(S);
    if (i < 0) return;
    const k = fixTile(g, i, true);
    S.turns += k + 2; S.hints++;
    S.glow[i] = 1;
    g.sfx('power');
    const x = S.bx + (i % S.P.cols + 0.5) * S.c, y = S.by + (((i / S.P.cols) | 0) + 0.5) * S.c;
    g.burst(x, y, { n: 16, color: ['#fff6b0', '#ffd84d', '#ffffff'], speed: 3, life: 30, gravity: 0 });
    g.float(x, y - S.c * 0.3, '+' + (k + 2), { color: '#ffd84d', size: 24 });
  }
  function press(g, b) {
    const S = g.s;
    S.press = b.id; S.pressT = 8;
    if (b.id === 'restart') { g.sfx('click'); g.start(g.level); }
    else if (b.id === 'hint') hint(g);
  }

  // ----- מים, פריחה וחגיגה -----
  function stepWorld(g, S) {
    const P = S.P, on = S.F.on, from = S.F.from, rate = S.won ? WIN_RATE : 0.2;
    S.t++;
    if (S.intro < 99) S.intro++;
    for (let i = 0; i < S.n; i++) {
      const d = S.aim[i] - S.ang[i];
      S.ang[i] = Math.abs(d) < 0.01 ? S.aim[i] : S.ang[i] + d * 0.3;
      if (S.glow[i] > 0) S.glow[i] = Math.max(0, S.glow[i] - 0.02);
      if (S.wobble[i] > 0) S.wobble[i] = Math.max(0, S.wobble[i] - 0.06);
      if (on[i]) {
        if (i === P.src) { S.wet[i] = 1; continue; }
        const f = from[i], pi = i + DX[f] + DY[f] * P.cols;
        if (S.wet[pi] >= 0.999) S.wet[i] = Math.min(1, S.wet[i] + rate);
      } else if (S.wet[i] > 0) S.wet[i] = Math.max(0, S.wet[i] - 0.12);
    }
    let k = 0;
    for (const o of P.outs) {
      const ready = on[o] && S.wet[o] >= 1;
      if (ready && !S.open[o]) {
        S.open[o] = 1;
        const x = S.bx + (o % P.cols + 0.5) * S.c, y = S.by + (((o / P.cols) | 0) + 0.35) * S.c;
        g.burst(x, y, { n: 18, color: [S.petalOf.get(o), '#ffffff', '#fff3a0'], speed: 3.2, life: 34, gravity: 0.04 });
        g.sfx('pop', { p: 1 + k * 0.08 });
      } else if (!on[o] && S.open[o]) S.open[o] = 0;
      S.bloom[o] += ((S.open[o] ? 1 : 0) - S.bloom[o]) * 0.12;
      k++;
    }
  }
  function stepWin(g, S) {
    if (!S.won) return;
    S.winT++;
    const P = S.P, end = Math.ceil(S.maxD * 0.8) + 4;
    if (S.winT === S.finAt) {
      S.fin = 0;
      g.sfx('splash');
      const x = S.bx + (P.src % P.cols + 0.5) * S.c, y = S.by + (((P.src / P.cols) | 0) + 0.5) * S.c;
      g.burst(x, y, { n: 30, color: [WATER, WATER_HI, '#ffffff'], speed: 4.5, life: 40, gravity: 0.1 });
    }
    if (S.fin < 0 || S.fin > end + 30) return;
    S.fin++;
    if (S.fin === end) {
      g.shake(4);
      for (const o of P.outs) { const x = S.bx + (o % P.cols + 0.5) * S.c, y = S.by + (((o / P.cols) | 0) + 0.3) * S.c; g.burst(x, y, { n: 12, color: [S.petalOf.get(o), '#fff', '#fff3a0'], speed: 2.6, life: 32, gravity: -0.02 }); }
    }
  }

  // ----- בוט לבדיקות: מתקן כל פעם את הצינור הקרוב ביותר למגדל, דרך אותה פעולה של לחיצה -----
  function botStep(g) {
    const S = g.s;
    if (S.won || ++S.botT < 5) return;
    S.botT = 0;
    const i = wrongTile(S);
    if (i < 0) return;
    S.cur = i;
    const p = period(S.P.shape[i]), k = (p - (S.rot[i] % p)) % p;
    turn(g, i, k === 3 ? -1 : 1);
  }

  // ----- ציור -----
  const tufts = {};
  function tuftsFor(W, H) {
    const k = W + 'x' + H;
    if (!tufts[k]) {
      const R = rng(W * 7 + H), a = [];
      for (let i = 0; i < 150; i++) a.push({ x: R() * W, y: R() * H, s: 5 + R() * 9, l: R() < 0.5 });
      tufts[k] = a;
    }
    return tufts[k];
  }
  function drawBackdrop(g, ctx, W, H) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3f9a52'); gr.addColorStop(1, '#22603a');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * 0.5, H * 0.35, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    rg.addColorStop(0, 'rgba(255,255,210,.16)'); rg.addColorStop(1, 'rgba(0,30,10,.35)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
    for (const t of tuftsFor(W, H)) {
      ctx.strokeStyle = t.l ? 'rgba(160,230,140,.35)' : 'rgba(20,70,35,.45)';
      ctx.beginPath();
      ctx.moveTo(t.x - t.s * 0.4, t.y - t.s); ctx.lineTo(t.x, t.y); ctx.lineTo(t.x + t.s * 0.4, t.y - t.s);
      ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + t.s * 0.05, t.y - t.s * 1.2);
      ctx.stroke();
    }
  }
  function drawFrame(g, ctx, x, y, w, h, c) {
    const p = Math.max(10, c * 0.16);
    g.rr(ctx, x - p, y - p + 8, w + 2 * p, h + 2 * p, p + 8); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
    g.rr(ctx, x - p, y - p, w + 2 * p, h + 2 * p, p + 8);
    const gr = ctx.createLinearGradient(0, y - p, 0, y + h + p);
    gr.addColorStop(0, '#8a5a34'); gr.addColorStop(1, '#5b3a20');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#3d2614'; ctx.lineWidth = 3; ctx.stroke();
    g.rr(ctx, x - 3, y - 3, w + 6, h + 6, 8); ctx.fillStyle = '#3a2a1b'; ctx.fill();
  }
  function drawSlot(g, ctx, x, y, c) {
    const p = Math.max(1.5, c * 0.03), s = c - 2 * p;
    g.rr(ctx, x + p, y + p, s, s, c * 0.13); ctx.fillStyle = '#d8c296'; ctx.fill();
    g.rr(ctx, x + p, y + p, s, s * 0.22, c * 0.13); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
    g.rr(ctx, x + p, y + p + s * 0.8, s, s * 0.2, c * 0.13); ctx.fillStyle = 'rgba(90,60,25,.18)'; ctx.fill();
  }
  function arms(ctx, shape, c, w, col, cap) {
    ctx.lineCap = cap || 'butt'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    for (let d = 0; d < 4; d++) if (shape & BIT[d]) { ctx.moveTo(0, 0); ctx.lineTo(DX[d] * c * 0.5, DY[d] * c * 0.5); }
    ctx.stroke();
  }
  // צינור במרכז (0,0), מסובב כבר. inArm = הצד שממנו נכנסים המים (בכיוונים של הצורה), -1 = המים יוצאים לכל הכיוונים
  function drawPipe(g, ctx, c, shape, wet, inArm, t) {
    arms(ctx, shape, c, c * 0.36, '#5a3216');
    arms(ctx, shape, c, c * 0.29, '#c4743a');
    arms(ctx, shape, c, c * 0.2, '#e39a5c');
    arms(ctx, shape, c, c * 0.12, '#41230f');
    g.circle(ctx, 0, 0, c * 0.205); ctx.fillStyle = '#5a3216'; ctx.fill();
    g.circle(ctx, 0, 0, c * 0.17); ctx.fillStyle = '#c4743a'; ctx.fill();
    g.circle(ctx, 0, 0, c * 0.12); ctx.fillStyle = '#e39a5c'; ctx.fill();
    g.circle(ctx, 0, 0, c * 0.065); ctx.fillStyle = '#41230f'; ctx.fill();
    if (wet > 0) drawWater(g, ctx, c, shape, wet, inArm, t);
    ctx.fillStyle = '#9a5a2a';
    for (let d = 0; d < 4; d++) if (shape & BIT[d]) {
      const fx = DX[d] * c * 0.4, fy = DY[d] * c * 0.4, lw = c * 0.42, th = c * 0.075;
      if (DX[d]) g.rr(ctx, fx - th / 2, fy - lw / 2, th, lw, th * 0.4); else g.rr(ctx, fx - lw / 2, fy - th / 2, lw, th, th * 0.4);
      ctx.fill();
    }
  }
  function drawWater(g, ctx, c, shape, wet, inArm, t) {
    const fi = Math.min(1, wet * 2), fo = inArm < 0 ? wet : Math.max(0, wet * 2 - 1);
    ctx.lineCap = 'round'; ctx.strokeStyle = WATER; ctx.lineWidth = c * 0.13;
    const path = () => {
      ctx.beginPath();
      for (let d = 0; d < 4; d++) if (shape & BIT[d]) {
        const ex = DX[d] * c * 0.5, ey = DY[d] * c * 0.5;
        if (d === inArm) { if (fi > 0) { ctx.moveTo(ex, ey); ctx.lineTo(ex * (1 - fi), ey * (1 - fi)); } }
        else if (fo > 0) { ctx.moveTo(0, 0); ctx.lineTo(ex * fo, ey * fo); }
      }
    };
    path(); ctx.stroke();
    if (wet >= 0.5 || inArm < 0) { g.circle(ctx, 0, 0, c * 0.08); ctx.fillStyle = WATER; ctx.fill(); }
    ctx.save();
    ctx.setLineDash([c * 0.07, c * 0.15]); ctx.lineDashOffset = -t * c * 0.012;
    ctx.strokeStyle = WATER_HI; ctx.lineWidth = c * 0.045; ctx.globalAlpha = 0.85;
    path(); ctx.stroke();
    ctx.restore();
  }
  function drawTower(g, ctx, c, shape, t) {
    drawPipe(g, ctx, c, shape, 1, -1, t);
    const w = c * 0.58, h = c * 0.5;
    g.rr(ctx, -w / 2, -h / 2 + c * 0.05, w, h, c * 0.12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    g.rr(ctx, -w / 2, -h / 2, w, h, c * 0.12);
    const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, '#1d5fb8'); gr.addColorStop(0.45, '#4aa3f0'); gr.addColorStop(1, '#174a91');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#0e2f5e'; ctx.lineWidth = c * 0.03; ctx.stroke();
    ctx.fillStyle = '#9ccaf2';
    ctx.fillRect(-w / 2, -h * 0.2, w, c * 0.035); ctx.fillRect(-w / 2, h * 0.2, w, c * 0.035);
    const b = Math.sin(t * 0.08) * c * 0.012, s = c * 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -s * 1.3 + b); ctx.bezierCurveTo(s * 0.9, -s * 0.2 + b, s * 0.8, s * 0.75 + b, 0, s * 0.75 + b); ctx.bezierCurveTo(-s * 0.8, s * 0.75 + b, -s * 0.9, -s * 0.2 + b, 0, -s * 1.3 + b); ctx.fill();
    ctx.fillStyle = 'rgba(56,189,248,.8)'; g.circle(ctx, -s * 0.25, s * 0.2 + b, s * 0.22); ctx.fill();
  }
  function drawFlower(g, ctx, c, shape, wet, bloom, col, t, seed) {
    // הצינור הקטן שמגיע אל העציץ
    arms(ctx, shape, c, c * 0.36, '#5a3216'); arms(ctx, shape, c, c * 0.29, '#c4743a'); arms(ctx, shape, c, c * 0.2, '#e39a5c'); arms(ctx, shape, c, c * 0.12, '#41230f');
    let inArm = 0;
    for (let d = 0; d < 4; d++) if (shape & BIT[d]) inArm = d;
    if (wet > 0) {
      const ex = DX[inArm] * c * 0.5, ey = DY[inArm] * c * 0.5, f = Math.min(1, wet);
      ctx.lineCap = 'round'; ctx.strokeStyle = WATER; ctx.lineWidth = c * 0.13;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex * (1 - f), ey * (1 - f)); ctx.stroke();
    }
    const sway = Math.sin(t * 0.05 + seed) * 0.08 * (0.3 + bloom);
    // העציץ
    const py = c * 0.1, tw = c * 0.46, bw = c * 0.32, ph = c * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, py + ph + c * 0.02, tw * 0.5, c * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-tw / 2, py); ctx.lineTo(tw / 2, py); ctx.lineTo(bw / 2, py + ph); ctx.lineTo(-bw / 2, py + ph); ctx.closePath();
    ctx.fillStyle = '#c0582f'; ctx.fill();
    g.rr(ctx, -tw / 2 - c * 0.03, py - c * 0.04, tw + c * 0.06, c * 0.09, c * 0.03); ctx.fillStyle = '#d96c3d'; ctx.fill();
    ctx.fillStyle = '#5b3a22'; ctx.fillRect(-tw / 2 + c * 0.02, py - c * 0.035, tw - c * 0.04, c * 0.03);
    // גבעול ופרח
    ctx.save();
    ctx.translate(0, py - c * 0.02); ctx.rotate(sway);
    const sh = c * (0.2 + 0.14 * bloom), droop = (1 - bloom) * 0.5;
    ctx.strokeStyle = bloom > 0.3 ? '#2f9e44' : '#6f8f55'; ctx.lineWidth = c * 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(c * 0.04, -sh * 0.5, Math.sin(droop) * sh * 0.6, -sh); ctx.stroke();
    ctx.fillStyle = bloom > 0.3 ? '#3bb54a' : '#7d9b62';
    ctx.beginPath(); ctx.ellipse(c * 0.07, -sh * 0.35, c * 0.075, c * 0.03, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-c * 0.07, -sh * 0.55, c * 0.07, c * 0.028, 0.6, 0, Math.PI * 2); ctx.fill();
    const hx = Math.sin(droop) * sh * 0.6, hy = -sh;
    if (bloom < 0.12) {
      ctx.fillStyle = '#86a86a'; ctx.beginPath(); ctx.ellipse(hx, hy, c * 0.055, c * 0.08, droop, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(hx + c * 0.015, hy + c * 0.02, c * 0.03, c * 0.05, droop, 0, Math.PI * 2); ctx.fill();
    } else {
      const r = c * 0.2 * bloom, spin = t * 0.004 + seed;
      ctx.fillStyle = col;
      for (let k = 0; k < 6; k++) { const a = spin + k * Math.PI / 3; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * r * 0.62, hy + Math.sin(a) * r * 0.62, r * 0.5, r * 0.3, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let k = 0; k < 6; k++) { const a = spin + k * Math.PI / 3; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * r * 0.5, hy + Math.sin(a) * r * 0.5, r * 0.22, r * 0.12, a, 0, Math.PI * 2); ctx.fill(); }
      g.circle(ctx, hx, hy, r * 0.36); ctx.fillStyle = '#ffd23f'; ctx.fill();
      g.circle(ctx, hx - r * 0.1, hy - r * 0.1, r * 0.13); ctx.fillStyle = '#fff3b0'; ctx.fill();
    }
    ctx.restore();
  }

  function drawBoard(g, ctx, S, o) {
    const P = S.P, c = S.c, t = S.t;
    drawFrame(g, ctx, S.bx, S.by, S.bw, S.bh, c);
    const n = S.n, on = S.F.on, from = S.F.from;
    for (let i = 0; i < n; i++) {
      const x = S.bx + (i % P.cols) * c, y = S.by + ((i / P.cols) | 0) * c;
      drawSlot(g, ctx, x, y, c);
    }
    for (let i = 0; i < n; i++) {
      const gx = i % P.cols, gy = (i / P.cols) | 0, x = S.bx + gx * c + c / 2, y = S.by + gy * c + c / 2;
      let sc = 1;
      if (S.intro < 99) { const u = Math.max(0, Math.min(1, (S.intro - (gx + gy) * 1.6) / 16)); sc = u <= 0 ? 0 : g.ease.back(u); }
      if (sc <= 0.01) continue;
      ctx.save();
      ctx.translate(x, y);
      if (S.wobble[i] > 0) ctx.rotate(Math.sin(S.wobble[i] * 18) * 0.1 * S.wobble[i]);
      if (sc !== 1) ctx.scale(sc, sc);
      if (S.fin >= 0 && on[i]) { const ph = (S.fin - S.F.dist[i] * 0.8) / 18; if (ph > 0 && ph < 1) { const a = Math.sin(ph * Math.PI); g.circle(ctx, 0, 0, c * 0.5); ctx.fillStyle = 'rgba(255,255,220,' + (a * 0.45).toFixed(3) + ')'; ctx.fill(); } }
      if (S.glow[i] > 0) { g.rr(ctx, -c * 0.46, -c * 0.46, c * 0.92, c * 0.92, c * 0.14); ctx.fillStyle = 'rgba(255,230,120,' + (S.glow[i] * 0.55).toFixed(3) + ')'; ctx.fill(); }
      if (P.kind[i] === 1) drawTower(g, ctx, c, P.shape[i], t);
      else if (P.kind[i] === 2) drawFlower(g, ctx, c, P.shape[i], S.wet[i], S.bloom[i], S.petalOf.get(i), t, i * 1.7);
      else {
        ctx.rotate(S.ang[i] * Math.PI / 2);
        const r = S.rot[i], fr = on[i] ? from[i] : -2;
        const inArm = fr >= 0 ? (((fr - r) % 4) + 4) % 4 : 9;
        drawPipe(g, ctx, c, P.shape[i], S.wet[i], inArm, t);
      }
      ctx.restore();
    }
    // מים שנשפכים מקצוות פתוחים
    if (!o || !o.noLeaks) {
      for (let i = 0; i < n; i++) {
        if (!on[i] || S.wet[i] < 1 || P.kind[i] === 2) continue;
        const m = maskOf(P, S.rot, i), gx = i % P.cols, gy = (i / P.cols) | 0;
        if (Math.abs(S.ang[i] - S.aim[i]) > 0.05) continue;
        for (let d = 0; d < 4; d++) {
          if (!(m & BIT[d])) continue;
          const nx = gx + DX[d], ny = gy + DY[d];
          const ok = nx >= 0 && ny >= 0 && nx < P.cols && ny < P.rows && (maskOf(P, S.rot, ny * P.cols + nx) & BIT[(d + 2) & 3]);
          if (ok) continue;
          const ex = S.bx + (gx + 0.5 + DX[d] * 0.5) * c, ey = S.by + (gy + 0.5 + DY[d] * 0.5) * c;
          for (let k = 0; k < 3; k++) {
            const ph = ((t + k * 9 + i * 5) % 27) / 27, sp = (k - 1) * 0.5;
            const px = ex + (DX[d] * ph * 0.22 + (DY[d] ? sp * ph * 0.12 : 0)) * c, py = ey + (DY[d] * ph * 0.22 + (DX[d] ? sp * ph * 0.12 : 0) + ph * ph * 0.12) * c;
            g.circle(ctx, px, py, c * 0.04 * (1 - ph * 0.5)); ctx.fillStyle = 'rgba(160,225,255,' + (0.9 * (1 - ph)).toFixed(3) + ')'; ctx.fill();
          }
        }
      }
    }
  }
  function drawIcon(g, ctx, id, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'restart') {
      ctx.lineWidth = s * 0.14;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.36, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      const a = -Math.PI * 0.35, ax = Math.cos(a) * s * 0.36, ay = Math.sin(a) * s * 0.36;
      ctx.beginPath(); ctx.moveTo(ax + s * 0.2, ay - s * 0.02); ctx.lineTo(ax - s * 0.04, ay - s * 0.2); ctx.lineTo(ax - s * 0.03, ay + s * 0.12); ctx.closePath(); ctx.fill();
    } else if (id === 'hint') {
      g.circle(ctx, 0, -s * 0.08, s * 0.27); ctx.fill();
      ctx.fillRect(-s * 0.13, s * 0.12, s * 0.26, s * 0.12);
      g.rr(ctx, -s * 0.11, s * 0.27, s * 0.22, s * 0.08, s * 0.03); ctx.fill();
      ctx.lineWidth = s * 0.06;
      for (let k = 0; k < 5; k++) { const a = -Math.PI * (0.15 + k * 0.175); ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.36, -s * 0.08 + Math.sin(a) * s * 0.36); ctx.lineTo(Math.cos(a) * s * 0.47, -s * 0.08 + Math.sin(a) * s * 0.47); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.55)'; g.circle(ctx, -s * 0.09, -s * 0.16, s * 0.07); ctx.fill();
    }
    ctx.restore();
  }
  function drawButton(g, ctx, S, b) {
    const hot = S.hoverBtn === b.id, down = S.press === b.id && S.pressT > 0, dy = down ? 4 : 0;
    g.rr(ctx, b.x, b.y + 6, b.w, b.h, 22); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    g.rr(ctx, b.x, b.y + dy, b.w, b.h, 22);
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, hot ? '#fff8e2' : '#fff1cf'); gr.addColorStop(1, hot ? '#f7d58e' : '#e9c27a');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
    drawIcon(g, ctx, b.id, b.x + b.w / 2, b.y + b.h / 2 + dy - (g.touch ? 0 : 6), b.w * 0.62, '#6b3f1d');
    if (!g.touch) g.text(ctx, b.key, b.x + b.w / 2, b.y + b.h - 13 + dy, { size: 15, weight: 800, color: '#8a5a2b' });
  }
  function drawCounter(g, ctx, S) {
    const x = S.counter.x, y = S.counter.y, total = S.P.outs.length;
    ctx.save(); ctx.translate(x - 34, y);
    drawFlowerIcon(g, ctx, 30, S.lit === total ? '#ffd23f' : '#ff5d8f');
    ctx.restore();
    g.text(ctx, S.lit + '/' + total, x + 12, y + 2, { size: 30, weight: 900, color: '#ffffff', align: 'left', stroke: 'rgba(0,0,0,.35)', strokeW: 5, dir: 'ltr' });
  }
  function drawFlowerIcon(g, ctx, s, col) {
    ctx.fillStyle = col;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.24, s * 0.15, a, 0, Math.PI * 2); ctx.fill(); }
    g.circle(ctx, 0, 0, s * 0.18); ctx.fillStyle = '#fff3b0'; ctx.fill();
  }

  const T = {
    he: { title: 'צינורות', help: ['לחץ על צינור כדי לסובב אותו (קליק ימני — אחורה)', 'הבא מים מהמגדל לכל הפרחים כדי שיפרחו', 'פחות סיבובים = יותר כוכבים. מקלדת: חצים ורווח'], helpTouch: ['הקש על צינור כדי לסובב אותו', 'הבא מים מהמגדל לכל הפרחים כדי שיפרחו', 'פחות סיבובים = יותר כוכבים'], turns: 'סיבובים', goal: 'יעד', result: 'סיבובים: {n} · יעד ל-3 כוכבים: {p}' },
    en: { title: 'Pipes', help: ['Click a pipe to turn it (right-click turns it back)', 'Bring water from the tower to every flower', 'Fewer turns = more stars. Keys: arrows and Space'], helpTouch: ['Tap a pipe to turn it', 'Bring water from the tower to every flower', 'Fewer turns = more stars'], turns: 'Turns', goal: 'Target', result: 'Turns: {n} · 3-star target: {p}' },
    ar: { title: 'الأنابيب', help: ['انقر على أنبوب لتدويره (النقر الأيمن للخلف)', 'أوصل الماء من البرج إلى كل الزهور', 'دورات أقل = نجوم أكثر. المفاتيح: الأسهم والمسافة'], helpTouch: ['المس أنبوباً لتدويره', 'أوصل الماء من البرج إلى كل الزهور', 'دورات أقل = نجوم أكثر'], turns: 'الدورات', goal: 'الهدف', result: 'الدورات: {n} · هدف 3 نجوم: {p}' },
    es: { title: 'Tuberías', help: ['Haz clic en una tubería para girarla (clic derecho: al revés)', 'Lleva el agua de la torre a todas las flores', 'Menos giros = más estrellas. Teclas: flechas y Espacio'], helpTouch: ['Toca una tubería para girarla', 'Lleva el agua de la torre a todas las flores', 'Menos giros = más estrellas'], turns: 'Giros', goal: 'Meta', result: 'Giros: {n} · Meta de 3 estrellas: {p}' },
    fr: { title: 'Tuyaux', help: ['Clique sur un tuyau pour le tourner (clic droit : retour)', "Amène l'eau de la tour à toutes les fleurs", "Moins de rotations = plus d'étoiles. Clavier : flèches et Espace"], helpTouch: ['Touche un tuyau pour le tourner', "Amène l'eau de la tour à toutes les fleurs", "Moins de rotations = plus d'étoiles"], turns: 'Rotations', goal: 'Objectif', result: 'Rotations : {n} · Objectif 3 étoiles : {p}' },
    pt: { title: 'Canos', help: ['Clique num cano para girá-lo (clique direito: ao contrário)', 'Leve a água da torre a todas as flores', 'Menos giros = mais estrelas. Teclas: setas e Espaço'], helpTouch: ['Toque num cano para girá-lo', 'Leve a água da torre a todas as flores', 'Menos giros = mais estrelas'], turns: 'Giros', goal: 'Meta', result: 'Giros: {n} · Meta de 3 estrelas: {p}' },
    ru: { title: 'Трубы', help: ['Нажми на трубу, чтобы повернуть её (правой кнопкой — назад)', 'Доведи воду от башни до всех цветов', 'Меньше поворотов — больше звёзд. Клавиши: стрелки и пробел'], helpTouch: ['Коснись трубы, чтобы повернуть её', 'Доведи воду от башни до всех цветов', 'Меньше поворотов — больше звёзд'], turns: 'Повороты', goal: 'Цель', result: 'Поворотов: {n} · Цель на 3 звезды: {p}' },
    de: { title: 'Rohre', help: ['Klicke auf ein Rohr, um es zu drehen (Rechtsklick: zurück)', 'Bring das Wasser vom Turm zu allen Blumen', 'Weniger Drehungen = mehr Sterne. Tasten: Pfeile und Leertaste'], helpTouch: ['Tippe auf ein Rohr, um es zu drehen', 'Bring das Wasser vom Turm zu allen Blumen', 'Weniger Drehungen = mehr Sterne'], turns: 'Drehungen', goal: 'Ziel', result: 'Drehungen: {n} · Ziel für 3 Sterne: {p}' },
  };

  const KEYMOVE = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  let demoP = null;

  GK.register('pipes', {
    get w() { return portrait() ? 640 : 880; },
    get h() { return portrait() ? 900 : 640; },
    bg: '#22603a', accent: '#7fd8ff',
    levels: LEVELS,
    text: T,

    init(g) {
      if (g.demo) {
        if (!demoP) demoP = build(6, 6, 4242, 4, 6);
        g.s = makeState(g, demoP, true);
        return;
      }
      const P = levelPuzzle(g.level);
      g.s = makeState(g, P, false);
    },

    step(g) {
      const S = g.s;
      if (S.pressT > 0) S.pressT--;
      stepWorld(g, S);
      stepWin(g, S);
      hud(g);
    },
    idle(g) { const S = g.s; if (S) { stepWorld(g, S); stepWin(g, S); if (S.pressT > 0) S.pressT--; } },

    bot: botStep,

    onKey(g, e) {
      const S = g.s, c = e.code, P = S.P;
      if (S.won) return;
      const mv = KEYMOVE[c];
      if (mv !== undefined) {
        if (!S.kbd) { S.kbd = true; return; }
        const x = S.cur % P.cols + DX[mv], y = ((S.cur / P.cols) | 0) + DY[mv];
        if (x >= 0 && y >= 0 && x < P.cols && y < P.rows) { S.cur = y * P.cols + x; g.sfx('tick'); }
        return;
      }
      if (e.repeat) return;
      if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter' || c === 'KeyE' || c === 'KeyQ') {
        if (!S.kbd) { S.kbd = true; return; }
        turn(g, S.cur, c === 'KeyQ' ? -1 : 1);
      } else if (c === 'KeyR') press(g, S.btns[0]);
      else if (c === 'KeyH') press(g, S.btns[1]);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        S.hover = p.kind === 'touch' ? -1 : cellAt(S, p.x, p.y);
        const b = btnAt(S, p.x, p.y);
        S.hoverBtn = b && p.kind !== 'touch' ? b.id : null;
        if (p.kind === 'mouse') S.kbd = false;
        return;
      }
      if (type !== 'down') return;
      const b = btnAt(S, p.x, p.y);
      if (b) { press(g, b); return; }
      const i = cellAt(S, p.x, p.y);
      if (i >= 0) { S.cur = i; turn(g, i, p.button === 2 ? -1 : 1); }
    },

    draw(g, ctx) {
      const S = g.s;
      if (!S) return;
      drawBackdrop(g, ctx, g.W, g.H);
      drawBoard(g, ctx, S);
      const P = S.P, c = S.c;
      if (g.state === 'play' && !S.won) {
        const hv = S.kbd ? S.cur : S.hover;
        if (hv >= 0) {
          const x = S.bx + (hv % P.cols) * c, y = S.by + ((hv / P.cols) | 0) * c;
          ctx.save();
          g.rr(ctx, x + 3, y + 3, c - 6, c - 6, c * 0.14);
          if (S.kbd) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 14; ctx.globalAlpha = 0.75 + Math.sin(S.t * 0.15) * 0.25; ctx.stroke(); }
          else if (!P.kind[hv]) { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); }
          ctx.restore();
        }
      }
      if (!g.demo) {
        drawCounter(g, ctx, S);
        for (const b of S.btns) drawButton(g, ctx, S, b);
      }
    },

    cover(ctx, w, h, k) {
      const P = build(8, 4, 777, 4, 7);
      const S = makeState({ W: w, H: h }, P, true);
      S.c = 104; S.bw = 8 * 104; S.bh = 4 * 104; S.bx = (w - S.bw) / 2; S.by = (h - S.bh) / 2 + 6; S.t = 40;
      drawBackdrop(k, ctx, w, h);
      drawBoard(k, ctx, S, { noLeaks: true });
      for (let i = 0; i < 7; i++) {
        const x = S.bx + ((i * 5 + 1) % 8 + 0.8) * S.c, y = S.by + ((i * 3) % 4 + 0.2) * S.c, r = 9 + (i % 3) * 4;
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.shadowColor = '#bff0ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
        ctx.restore();
      }
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { build, levelPuzzle, flow, flowBuf, maskOf, rotM, period, LEVELS, SIZE },
  });
})();
