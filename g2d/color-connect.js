// ============================================================
//  מחברים צבעים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מותחים קווים בין שתי נקודות באותו צבע. אסור שקווים יחצו זה את זה, וכל הלוח צריך להתמלא.
//  50 שלבים מ-5×5 עד 9×9. המחולל בונה קודם פתרון שממלא את כל הלוח (מסלול שעובר בכל המשבצות,
//  מעורבב במהלכי backbite וחתוך לקטעים), והקצוות של כל קטע הם הנקודות — אז לכל שלב יש פתרון בוודאות.
//  הזרעים נבחרו כך שלכל שלב יש פתרון אחד בלבד (פותר נפרד בבדיקות סופר את הפתרונות).
// ============================================================
(function () {
  'use strict';
  const LEVELS = 50;
  const SIZE = n => (n <= 8 ? 5 : n <= 18 ? 6 : n <= 28 ? 7 : n <= 39 ? 8 : 9);
  const BAND = { 5: [1, 8, 5, 4], 6: [9, 18, 6, 5], 7: [19, 28, 7, 6], 8: [29, 39, 9, 7], 9: [40, 50, 10, 8] };   // first, last, colours at first, colours at last
  const COL = ['#ff4757', '#3d7cff', '#2ed573', '#ffd32a', '#ff9f1a', '#1ee3cf', '#ff6bcb', '#a55eea', '#f1f2f6', '#c8875a'];
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const colorsFor = n => { const s = SIZE(n), [a, b, c0, c1] = BAND[s]; return Math.round(c0 + (c1 - c0) * (n - a) / Math.max(1, b - a)); };

  // ----- המחולל: מסלול המילטוני אקראי על כל הלוח, חתוך ל-k קטעים -----
  function hamPath(cols, rows, R) {
    const p = [];
    for (let y = 0; y < rows; y++) for (let i = 0; i < cols; i++) p.push(y * cols + (y % 2 ? cols - 1 - i : i));
    const m = p.length, iters = m * 60;
    for (let it = 0; it < iters; it++) {
      if (R() < 0.5) p.reverse();
      const e = p[m - 1], ex = e % cols, ey = (e / cols) | 0, nb = [];
      for (let d = 0; d < 4; d++) { const nx = ex + DX[d], ny = ey + DY[d]; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) nb.push(ny * cols + nx); }
      const v = nb[Math.floor(R() * nb.length)];
      if (v === p[m - 2]) continue;
      for (let a = p.indexOf(v) + 1, b = m - 1; a < b; a++, b--) { const t = p[a]; p[a] = p[b]; p[b] = t; }
    }
    return p;
  }
  const adj = (cols, a, b) => { const ax = a % cols, ay = (a / cols) | 0, bx = b % cols, by = (b / cols) | 0; return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
  // חותכים את המסלול לקטעים שאף אחד מהם לא נוגע בעצמו (אין שתי משבצות לא-עוקבות של אותו קו צמודות),
  // באורך 3 לפחות, ושתי הנקודות שלו לא צמודות. בחירה אקראית מבין כל החיתוכים האפשריים (תכנון דינמי).
  // קווים כאלה לא משאירים קיצורי דרך, ולכן לרוב יש לשלב פתרון אחד בלבד.
  function build(cols, rows, k, seed) {
    for (let a = 0; a < 300; a++) {
      const R = rng(seed + a * 7919), path = hamPath(cols, rows, R), m = path.length;
      const pos = new Int32Array(cols * rows);
      path.forEach((c, i) => { pos[c] = i; });
      const maxL = new Int32Array(m);
      for (let i = 0; i < m; i++) {
        let L = 1;
        for (let j = i + 1; j < m; j++) {
          const c = path[j], x = c % cols, y = (c / cols) | 0;
          let touch = false;
          for (let d = 0; d < 4 && !touch; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) { const q = pos[ny * cols + nx]; if (q >= i && q < j - 1) touch = true; } }
          if (touch) break;
          L++;
        }
        maxL[i] = L;
      }
      const okSeg = (i, L) => L >= 3 && L <= maxL[i] && i + L <= m && !adj(cols, path[i], path[i + L - 1]);
      const can = Array.from({ length: m + 1 }, () => new Uint8Array(k + 1));
      can[m][0] = 1;
      for (let i = m - 1; i >= 0; i--) for (let j = 1; j <= k; j++) for (let L = 3; L <= maxL[i] && i + L <= m; L++) if (okSeg(i, L) && can[i + L][j - 1]) { can[i][j] = 1; break; }
      if (!can[0][k]) continue;
      const segs = [];
      for (let i = 0, j = k; j > 0; j--) {
        const opts = [];
        for (let L = 3; L <= maxL[i] && i + L <= m; L++) if (okSeg(i, L) && can[i + L][j - 1]) opts.push(L);
        const L = opts[Math.floor(R() * opts.length)];
        segs.push(path.slice(i, i + L)); i += L;
      }
      // צבעים בסדר אקראי
      const order = Array.from({ length: k }, (_, j) => j);
      for (let j = k - 1; j > 0; j--) { const r = Math.floor(R() * (j + 1)); [order[j], order[r]] = [order[r], order[j]]; }
      const sol = [];
      order.forEach((o, j) => { sol[o] = segs[j]; });
      return { cols, rows, k, sol, tries: a };
    }
    return null;
  }
  // הזרע של כל שלב נבחר מראש (בבדיקות) כך שלשלב יש פתרון אחד בלבד; הבדיקות מוכיחות את זה שוב
  const SEEDS = [4977, 5954, 106934, 207914, 408897, 309871, 410851, 111819, 12793, 13770, 114750, 415736, 316710, 517693, 418667, 119635, 120612, 21586, 122566, 223546, 224523, 325503, 426483, 27448, 28425, 429414, 330388, 31356, 332342, 1033340, 334296, 735285, 236247, 337227, 138198, 639190, 640167, 41126, 442115, 143083, 544072, 445046, 146014, 647006, 147968, 48942, 649937, 350905, 651891, 452862];
  const levelPuzzle = n => { const s = SIZE(n); return build(s, s, colorsFor(n), SEEDS[n - 1] != null ? SEEDS[n - 1] : 4000 + n * 977); };

  // ----- מצב -----
  function makeState(g, P) {
    const n = P.cols * P.rows;
    const S = {
      P, n, dots: new Int8Array(n).fill(-1), paths: Array.from({ length: P.k }, () => []), owner: new Int8Array(n).fill(-1),
      drag: null, moves: 0, last: -1, hints: 0, hist: [], conn: new Uint8Array(P.k), pulse: new Float32Array(P.k),
      won: false, winT: 0, t: 0, cur: 0, kdraw: false, kbd: false, ptr: null, pid: null, hoverBtn: null, press: null, pressT: 0,
      bot: { c: 0, i: 0, wait: 0 }, fillMsgT: 0,
    };
    P.sol.forEach((s, c) => { S.dots[s[0]] = c; S.dots[s[s.length - 1]] = c; });
    S.cur = P.sol[0][0];
    layout(g, S);
    return S;
  }
  function layout(g, S) {
    const W = g.W, H = g.H, P = S.P;
    if (W >= H) {
      const side = 180, c = Math.floor(Math.min((W - side - 60) / P.cols, (H - 50) / P.rows, 110));
      S.c = c; S.bx = Math.round((W - side - c * P.cols) / 2 + 14); S.by = Math.round((H - c * P.rows) / 2);
      const sx = Math.round((S.bx + c * P.cols + W) / 2);
      S.info = { x: sx, y: H / 2 - 200, port: false };
      S.btns = [{ id: 'undo', x: sx - 42, y: H / 2 - 112, w: 84, h: 84, key: 'Z' }, { id: 'hint', x: sx - 42, y: H / 2 - 8, w: 84, h: 84, key: 'H' }, { id: 'restart', x: sx - 42, y: H / 2 + 96, w: 84, h: 84, key: 'R' }];
    } else {
      const c = Math.floor(Math.min((W - 40) / P.cols, (H - 280) / P.rows, 110));
      S.c = c; S.bx = Math.round((W - c * P.cols) / 2); S.by = Math.round(26 + (H - 280 - c * P.rows) / 2);
      const y = S.by + c * P.rows + 92;
      S.info = { x: W / 2, y: S.by + c * P.rows + 40, port: true };
      S.btns = [{ id: 'undo', x: W / 2 - 150, y, w: 84, h: 84, key: 'Z' }, { id: 'hint', x: W / 2 - 42, y, w: 84, h: 84, key: 'H' }, { id: 'restart', x: W / 2 + 66, y, w: 84, h: 84, key: 'R' }];
    }
  }
  const cellAt = (S, x, y) => { const cx = Math.floor((x - S.bx) / S.c), cy = Math.floor((y - S.by) / S.c); return cx >= 0 && cy >= 0 && cx < S.P.cols && cy < S.P.rows ? cy * S.P.cols + cx : -1; };
  const btnAt = (S, x, y) => S.btns.find(b => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) || null;
  const ccx = (S, i) => S.bx + (i % S.P.cols + 0.5) * S.c, ccy = (S, i) => S.by + (((i / S.P.cols) | 0) + 0.5) * S.c;
  const isDone = (S, c) => { const p = S.paths[c]; return p.length > 1 && S.dots[p[p.length - 1]] === c && p[p.length - 1] !== p[0]; };
  const filled = S => { let f = 0; for (let i = 0; i < S.n; i++) if (S.owner[i] >= 0) f++; return f; };
  const same = (a, b) => a.length === b.length && a.every((p, i) => p.length === b[i].length && p.every((x, j) => x === b[i][j]));

  function rebuild(g) {
    const S = g.s;
    S.owner.fill(-1);
    S.paths.forEach((p, c) => { for (const i of p) S.owner[i] = c; });
    for (let c = 0; c < S.P.k; c++) {
      const d = isDone(S, c) ? 1 : 0;
      if (d && !S.conn[c] && !g.demo) {
        S.pulse[c] = 1;
        const e = S.paths[c][S.paths[c].length - 1];
        g.burst(ccx(S, e), ccy(S, e), { n: 14, color: [COL[c], '#ffffff'], speed: 2.8, life: 28, gravity: 0 });
        g.sfx('pop', { p: 0.9 + S.conn.reduce((s, x) => s + x, 0) * 0.07 });
      }
      S.conn[c] = d;
    }
    hud(g);
    if (!S.won && S.conn.every(x => x) && filled(S) === S.n) win(g);
  }
  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    const t3 = S.P.k + Math.floor(S.P.k / 4);
    if (g.H > g.W) g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves + '/' + t3]]);
    else g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves], [g.t('goal'), t3]]);
  }

  // ----- ציור קווים: כל קלט (עכבר, מגע, מקלדת, בוט) עובר דרך startAt / stepTo / endDrag -----
  function startAt(g, cell) {
    const S = g.s;
    if (S.won || cell < 0) return false;
    let c = S.dots[cell];
    const before = S.paths.map(p => p.slice());
    if (c >= 0) S.paths[c] = [cell];
    else {
      c = S.owner[cell];
      if (c < 0) return false;
      const p = S.paths[c];
      p.length = p.indexOf(cell) + 1;
    }
    S.drag = { c, before, moves: S.moves, last: S.last, snap: S.paths.map(p => p.slice()) };
    if (c !== S.last) { S.moves++; S.last = c; }
    g.tone({ f: 520 + c * 30, dur: 0.05, type: 'triangle', vol: 0.1 });
    rebuild(g);
    return true;
  }
  function stepTo(g, cell) {
    const S = g.s, d = S.drag;
    if (!d || S.won || cell < 0) return false;
    const c = d.c, P = S.paths[c], last = P[P.length - 1];
    if (cell === last) return false;
    const idx = P.indexOf(cell);
    if (idx >= 0) P.length = idx + 1;   // אחורה על הקו שלך: מקצרים אותו
    else {
      if (!adj(S.P.cols, last, cell) || isDone(S, c)) return false;
      const dc = S.dots[cell];
      if (dc >= 0 && dc !== c) return false;   // נקודה בצבע אחר חוסמת
      P.push(cell);
      g.tone({ f: 380 + Math.min(P.length, 30) * 14, dur: 0.035, type: 'sine', vol: 0.06 });
    }
    // שאר הקווים: כמו שהיו בתחילת המשיכה, וחתוכים איפה שהקו הזה עובר עכשיו
    const mine = new Set(P);
    for (let o = 0; o < S.P.k; o++) {
      if (o === c) continue;
      const sp = d.snap[o];
      let cut = sp.length;
      for (let i = 0; i < sp.length; i++) if (mine.has(sp[i])) { cut = i; break; }
      S.paths[o] = sp.slice(0, cut);
    }
    rebuild(g);
    return true;
  }
  // הולכים מסוף הקו אל המשבצת שמתחת לאצבע, משבצת אחת בכל פעם (גם כשהעכבר קופץ מהר)
  function dragTo(g, cell) {
    const S = g.s;
    if (!S.drag || cell < 0) return;
    const P = S.paths[S.drag.c];
    if (P.includes(cell)) { stepTo(g, cell); return; }
    for (let guard = 0; guard < 24; guard++) {
      const last = P[P.length - 1];
      if (last === cell) return;
      const cols = S.P.cols, lx = last % cols, ly = (last / cols) | 0, tx = cell % cols, ty = (cell / cols) | 0;
      const dx = Math.sign(tx - lx), dy = Math.sign(ty - ly);
      const next = Math.abs(tx - lx) >= Math.abs(ty - ly) ? ly * cols + lx + dx : (ly + dy) * cols + lx;
      if (!stepTo(g, next)) {
        // אם הדרך הישרה חסומה, ננסה את הציר השני
        const alt = Math.abs(tx - lx) >= Math.abs(ty - ly) ? (dy ? (ly + dy) * cols + lx : -1) : (dx ? ly * cols + lx + dx : -1);
        if (alt < 0 || !stepTo(g, alt)) return;
      }
    }
  }
  function endDrag(g) {
    const S = g.s, d = S.drag;
    if (!d) return;
    S.drag = null; S.kdraw = false;
    if (same(d.before, S.paths)) { S.moves = d.moves; S.last = d.last; hud(g); return; }   // נגיעה בלי שינוי לא נחשבת למהלך
    if (S.hist.length < 400) S.hist.push(d.before);
    if (!S.won && S.conn.every(x => x) && filled(S) < S.n && S.t - S.fillMsgT > 60) { S.fillMsgT = S.t; g.msg(g.t('fill'), 1800, '#ffe08a'); g.sfx('error'); }
  }
  function undo(g) {
    const S = g.s;
    if (S.won || S.drag) return;
    if (!S.hist.length) { g.sfx('error'); return; }
    S.paths = S.hist.pop();
    S.conn.fill(0);
    g.sfx('whoosh');
    rebuild(g);
  }
  function hint(g) {
    const S = g.s;
    if (S.won || S.drag) return;
    const P = S.P;
    let c = -1;
    for (let o = 0; o < P.k && c < 0; o++) { const p = S.paths[o], s = P.sol[o]; if (!(p.length === s.length && (p.every((x, i) => x === s[i]) || p.every((x, i) => x === s[s.length - 1 - i])))) c = o; }
    if (c < 0) return;
    S.hist.push(S.paths.map(p => p.slice()));
    const mine = new Set(P.sol[c]);
    for (let o = 0; o < P.k; o++) { if (o === c) continue; const p = S.paths[o]; let cut = p.length; for (let i = 0; i < p.length; i++) if (mine.has(p[i])) { cut = i; break; } p.length = cut; }
    S.paths[c] = P.sol[c].slice();
    S.hints++; S.moves += 2; S.last = c;
    g.sfx('power');
    for (const i of P.sol[c]) if (S.dots[i] === c) g.burst(ccx(S, i), ccy(S, i), { n: 12, color: ['#fff6b0', COL[c]], speed: 2.5, life: 26, gravity: 0 });
    rebuild(g);
  }
  function win(g) {
    const S = g.s, k = S.P.k;
    S.won = true; S.winT = 0; S.drag = null; S.kdraw = false;
    const stars = S.moves <= k + Math.floor(k / 4) ? 3 : S.moves <= k * 2 ? 2 : 1;
    if (!g.demo) g.completeLevel(stars, { text: g.t('result', { n: S.moves, p: k }), delay: 700 });
  }
  function press(g, id) {
    const S = g.s;
    S.press = id; S.pressT = 8;
    if (id === 'undo') undo(g);
    else if (id === 'hint') hint(g);
    else if (id === 'restart') { g.sfx('click'); g.start(g.level); }
  }

  // ----- ציור -----
  const bokeh = {};
  function bokehFor(W, H) {
    const k = W + 'x' + H;
    if (!bokeh[k]) { const R = rng(W * 13 + H * 7); bokeh[k] = Array.from({ length: 16 }, (_, i) => ({ x: R() * W, y: R() * H, r: 30 + R() * 80, c: COL[i % 8], s: 0.2 + R() * 0.5, p: R() * 6 })); }
    return bokeh[k];
  }
  function drawBackdrop(g, ctx, W, H, t) {
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#1b1f3b'); gr.addColorStop(1, '#0d1024');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (const b of bokehFor(W, H)) {
      const x = b.x + Math.sin(t * 0.004 * b.s + b.p) * 30, y = b.y + Math.cos(t * 0.003 * b.s + b.p) * 24;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      rg.addColorStop(0, b.c + '30'); rg.addColorStop(1, b.c + '00');
      ctx.fillStyle = rg; ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
    }
  }
  function drawBoard(g, ctx, S, o) {
    const P = S.P, c = S.c, t = S.t, bw = c * P.cols, bh = c * P.rows;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    g.rr(ctx, S.bx - 10, S.by - 10, bw + 20, bh + 20, 18); ctx.fillStyle = '#10142a'; ctx.fill();
    ctx.restore();
    g.rr(ctx, S.bx - 10, S.by - 10, bw + 20, bh + 20, 18); ctx.strokeStyle = 'rgba(140,160,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
    // תאים צבועים בגוון הקו שעובר בהם
    for (let i = 0; i < S.n; i++) {
      const x = S.bx + (i % P.cols) * c, y = S.by + ((i / P.cols) | 0) * c, ow = S.owner[i];
      ctx.fillStyle = ow >= 0 ? COL[ow] + (S.conn[ow] ? '3a' : '22') : ((i % P.cols) + ((i / P.cols) | 0)) % 2 ? '#181d38' : '#161a33';
      ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
    }
    ctx.strokeStyle = 'rgba(120,140,220,.16)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= P.cols; i++) { ctx.moveTo(S.bx + i * c, S.by); ctx.lineTo(S.bx + i * c, S.by + bh); }
    for (let i = 0; i <= P.rows; i++) { ctx.moveTo(S.bx, S.by + i * c); ctx.lineTo(S.bx + bw, S.by + i * c); }
    ctx.stroke();
    // הקווים
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wave = S.won ? S.winT : -1;
    S.paths.forEach((p, k) => {
      if (p.length < 2) return;
      ctx.save();
      if (S.conn[k]) { ctx.shadowColor = COL[k]; ctx.shadowBlur = 10 + S.pulse[k] * 16; }
      ctx.strokeStyle = COL[k]; ctx.lineWidth = c * 0.34;
      ctx.beginPath(); ctx.moveTo(ccx(S, p[0]), ccy(S, p[0]));
      for (let i = 1; i < p.length; i++) ctx.lineTo(ccx(S, p[i]), ccy(S, p[i]));
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = c * 0.1;
      ctx.beginPath(); ctx.moveTo(ccx(S, p[0]), ccy(S, p[0]));
      for (let i = 1; i < p.length; i++) ctx.lineTo(ccx(S, p[i]), ccy(S, p[i]));
      ctx.stroke();
      if (wave >= 0) {
        const at = (wave * 0.6) % (p.length + 6);
        for (let i = 0; i < p.length; i++) {
          const a = Math.max(0, 1 - Math.abs(i - at) / 2.5);
          if (a <= 0) continue;
          g.circle(ctx, ccx(S, p[i]), ccy(S, p[i]), c * 0.2); ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.6).toFixed(3) + ')'; ctx.fill();
        }
      }
    });
    // הנקודות
    for (let i = 0; i < S.n; i++) {
      const k = S.dots[i];
      if (k < 0) continue;
      const x = ccx(S, i), y = ccy(S, i), pul = S.pulse[k], r = c * (0.36 + pul * 0.08);
      ctx.save();
      ctx.shadowColor = COL[k]; ctx.shadowBlur = S.conn[k] ? 18 : 8;
      g.circle(ctx, x, y, r);
      const rg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.25, COL[k]); rg.addColorStop(1, g.shade(COL[k], -0.35));
      ctx.fillStyle = rg; ctx.fill();
      ctx.restore();
      if (S.conn[k]) { g.circle(ctx, x, y, r + c * 0.05); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = c * 0.035; ctx.stroke(); }
    }
    // האצבע שמציירת
    if (S.drag && S.ptr && !(o && o.noHead)) {
      ctx.save(); ctx.globalAlpha = 0.28;
      g.circle(ctx, S.ptr.x, S.ptr.y, c * 0.5); ctx.fillStyle = COL[S.drag.c]; ctx.fill();
      ctx.restore();
    }
  }
  function drawIcon(g, ctx, id, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.14;
    if (id === 'restart') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.36, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      const a = -Math.PI * 0.35, ax = Math.cos(a) * s * 0.36, ay = Math.sin(a) * s * 0.36;
      ctx.beginPath(); ctx.moveTo(ax + s * 0.2, ay - s * 0.02); ctx.lineTo(ax - s * 0.04, ay - s * 0.2); ctx.lineTo(ax - s * 0.03, ay + s * 0.12); ctx.closePath(); ctx.fill();
    } else if (id === 'undo') {
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.12); ctx.lineTo(s * 0.12, -s * 0.12); ctx.arc(s * 0.12, s * 0.08, s * 0.2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-s * 0.1, s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.12); ctx.lineTo(-s * 0.14, -s * 0.32); ctx.lineTo(-s * 0.14, s * 0.08); ctx.closePath(); ctx.fill();
    } else if (id === 'hint') {
      g.circle(ctx, 0, -s * 0.08, s * 0.27); ctx.fill();
      ctx.fillRect(-s * 0.13, s * 0.12, s * 0.26, s * 0.12);
      g.rr(ctx, -s * 0.11, s * 0.27, s * 0.22, s * 0.08, s * 0.03); ctx.fill();
      ctx.lineWidth = s * 0.06;
      for (let k = 0; k < 5; k++) { const a = -Math.PI * (0.15 + k * 0.175); ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.36, -s * 0.08 + Math.sin(a) * s * 0.36); ctx.lineTo(Math.cos(a) * s * 0.47, -s * 0.08 + Math.sin(a) * s * 0.47); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawButton(g, ctx, S, b, dim) {
    const hot = S.hoverBtn === b.id, down = S.press === b.id && S.pressT > 0, dy = down ? 4 : 0;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.45;
    g.rr(ctx, b.x, b.y + 6, b.w, b.h, 22); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
    g.rr(ctx, b.x, b.y + dy, b.w, b.h, 22);
    const gr = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    gr.addColorStop(0, hot ? '#8fa2ff' : '#7486ff'); gr.addColorStop(1, hot ? '#c47dff' : '#b06cff');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawIcon(g, ctx, b.id, b.x + b.w / 2, b.y + b.h / 2 + dy - (g.touch ? 0 : 6), b.w * 0.6, '#ffffff');
    if (!g.touch) g.text(ctx, b.key, b.x + b.w / 2, b.y + b.h - 12 + dy, { size: 14, weight: 800, color: 'rgba(255,255,255,.85)' });
    ctx.restore();
  }
  function drawInfo(g, ctx, S) {
    const k = S.P.k, done = S.conn.reduce((s, x) => s + x, 0), pct = Math.round(filled(S) / S.n * 100);
    const { x, y, port } = S.info;
    const ix = port ? x - 120 : x, iy = port ? y : y;
    // זוגות שחוברו
    for (let i = 0; i < 2; i++) { g.circle(ctx, ix - 44 + i * 16, iy, 11); ctx.fillStyle = COL[i * 2]; ctx.fill(); ctx.strokeStyle = '#0d1024'; ctx.lineWidth = 2; ctx.stroke(); }
    g.text(ctx, done + '/' + k, ix + 4, iy + 1, { size: 28, weight: 900, color: '#ffffff', align: 'left', dir: 'ltr' });
    // כמה מהלוח מלא
    const bx = port ? x + 30 : x - 60, by = port ? y - 9 : y + 34, bw = port ? 150 : 120;
    g.rr(ctx, bx, by, bw, 18, 9); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
    if (pct > 0) {
      g.rr(ctx, bx, by, Math.max(18, bw * pct / 100), 18, 9);
      const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      gr.addColorStop(0, '#2ed573'); gr.addColorStop(0.5, '#1ee3cf'); gr.addColorStop(1, '#3d7cff');
      ctx.fillStyle = gr; ctx.fill();
    }
    g.text(ctx, pct + '%', bx + bw / 2, by + 10, { size: 13, weight: 900, color: '#ffffff', stroke: 'rgba(0,0,0,.4)', strokeW: 3, dir: 'ltr' });
  }

  const T = {
    he: { title: 'מחברים צבעים', help: ['גרור מנקודה אל הנקודה באותו צבע כדי לחבר אותן', 'קווים לא יכולים לחצות זה את זה — ומלא את כל הלוח!', 'גרור אחורה כדי לקצר קו. Z בטל · H רמז · R מחדש'], helpTouch: ['גרור באצבע מנקודה אל הנקודה באותו צבע', 'קווים לא יכולים לחצות זה את זה — ומלא את כל הלוח!', 'גרור אחורה כדי לקצר קו. 💡 רמז מצייר קו אחד'], goal: 'יעד', fill: 'כל הזוגות מחוברים — עכשיו מלא את כל הלוח!', result: 'מהלכים: {n} · מושלם: {p}' },
    en: { title: 'Color Connect', help: ['Drag from a dot to the dot of the same color to join them', "Lines can't cross — and fill the whole board!", 'Drag back to shorten a line. Z undo · H hint · R restart'], helpTouch: ['Drag your finger from a dot to the dot of the same color', "Lines can't cross — and fill the whole board!", 'Drag back to shorten a line. 💡 Hint draws one line'], goal: 'Target', fill: 'All pairs joined — now fill the whole board!', result: 'Moves: {n} · Perfect: {p}' },
    ar: { title: 'وصّل الألوان', help: ['اسحب من نقطة إلى النقطة التي بنفس اللون لتوصلهما', 'لا يمكن للخطوط أن تتقاطع — واملأ اللوحة كلها!', 'اسحب للخلف لتقصير الخط. Z تراجع · H تلميح · R من جديد'], helpTouch: ['اسحب بإصبعك من نقطة إلى النقطة التي بنفس اللون', 'لا يمكن للخطوط أن تتقاطع — واملأ اللوحة كلها!', 'اسحب للخلف لتقصير الخط. 💡 التلميح يرسم خطاً واحداً'], goal: 'الهدف', fill: 'كل الأزواج موصولة — الآن املأ اللوحة كلها!', result: 'الحركات: {n} · الكامل: {p}' },
    es: { title: 'Une Colores', help: ['Arrastra de un punto al punto del mismo color para unirlos', 'Las líneas no se pueden cruzar, ¡y llena todo el tablero!', 'Arrastra hacia atrás para acortar. Z deshacer · H pista · R reiniciar'], helpTouch: ['Arrastra el dedo de un punto al punto del mismo color', 'Las líneas no se pueden cruzar, ¡y llena todo el tablero!', 'Arrastra hacia atrás para acortar. 💡 La pista dibuja una línea'], goal: 'Meta', fill: '¡Todas las parejas unidas! Ahora llena todo el tablero', result: 'Movimientos: {n} · Perfecto: {p}' },
    fr: { title: 'Relie les Couleurs', help: ["Glisse d'un point jusqu'au point de la même couleur", 'Les lignes ne peuvent pas se croiser — et remplis tout le plateau !', 'Reviens en arrière pour raccourcir. Z annuler · H indice · R recommencer'], helpTouch: ["Glisse le doigt d'un point au point de la même couleur", 'Les lignes ne peuvent pas se croiser — et remplis tout le plateau !', "Reviens en arrière pour raccourcir. 💡 L'indice trace une ligne"], goal: 'Objectif', fill: 'Toutes les paires sont reliées — remplis tout le plateau !', result: 'Coups : {n} · Parfait : {p}' },
    pt: { title: 'Ligue as Cores', help: ['Arraste de um ponto até o ponto da mesma cor para ligá-los', 'As linhas não podem se cruzar — e preencha o tabuleiro todo!', 'Arraste de volta para encurtar. Z desfaz · H dica · R recomeça'], helpTouch: ['Arraste o dedo de um ponto até o ponto da mesma cor', 'As linhas não podem se cruzar — e preencha o tabuleiro todo!', 'Arraste de volta para encurtar. 💡 A dica desenha uma linha'], goal: 'Meta', fill: 'Todos os pares ligados — agora preencha o tabuleiro todo!', result: 'Jogadas: {n} · Perfeito: {p}' },
    ru: { title: 'Соедини цвета', help: ['Тяни линию от точки к точке того же цвета', 'Линии не могут пересекаться — и заполни всё поле!', 'Веди назад, чтобы укоротить. Z — отмена · H — подсказка · R — заново'], helpTouch: ['Веди пальцем от точки к точке того же цвета', 'Линии не могут пересекаться — и заполни всё поле!', 'Веди назад, чтобы укоротить. 💡 Подсказка рисует одну линию'], goal: 'Цель', fill: 'Все пары соединены — теперь заполни всё поле!', result: 'Ходов: {n} · Идеально: {p}' },
    de: { title: 'Farben Verbinden', help: ['Ziehe von einem Punkt zum Punkt in derselben Farbe', 'Linien dürfen sich nicht kreuzen – und fülle das ganze Feld!', 'Zieh zurück, um zu kürzen. Z zurück · H Tipp · R neu'], helpTouch: ['Zieh mit dem Finger von einem Punkt zum gleichfarbigen Punkt', 'Linien dürfen sich nicht kreuzen – und fülle das ganze Feld!', 'Zieh zurück, um zu kürzen. 💡 Der Tipp zeichnet eine Linie'], goal: 'Ziel', fill: 'Alle Paare verbunden – jetzt fülle das ganze Feld!', result: 'Züge: {n} · Perfekt: {p}' },
  };

  const KEYDIR = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  let demoP = null;

  GK.register('color-connect', {
    get w() { return portrait() ? 640 : 880; },
    get h() { return portrait() ? 900 : 640; },
    bg: '#0d1024', accent: '#b98bff',
    levels: LEVELS,
    text: T,

    init(g) {
      if (g.demo) {
        if (!demoP) demoP = build(6, 6, 6, 31337);
        const S = g.s = makeState(g, demoP);
        S.paths = demoP.sol.map(s => s.slice());
        S.paths[1] = S.paths[1].slice(0, Math.max(2, S.paths[1].length - 3));
        rebuild(g);
        return;
      }
      g.s = makeState(g, levelPuzzle(g.level));
      hud(g);
    },

    step(g) {
      const S = g.s;
      S.t++;
      if (S.pressT > 0) S.pressT--;
      for (let k = 0; k < S.P.k; k++) if (S.pulse[k] > 0) S.pulse[k] = Math.max(0, S.pulse[k] - 0.04);
      hud(g);
    },
    idle(g) {
      const S = g.s;
      if (!S) return;
      S.t++;
      if (S.won) S.winT++;
      if (S.pressT > 0) S.pressT--;
      for (let k = 0; k < S.P.k; k++) if (S.pulse[k] > 0) S.pulse[k] = Math.max(0, S.pulse[k] - 0.04);
    },

    // בוט לבדיקות: מצייר את הפתרון של המחולל, משבצת אחרי משבצת, דרך אותן פעולות של האצבע
    bot(g) {
      const S = g.s, B = S.bot, P = S.P;
      if (S.won || B.c >= P.k) return;
      if (B.wait > 0) { B.wait--; return; }
      B.wait = 1;
      const sol = P.sol[B.c];
      if (!S.drag) { startAt(g, sol[0]); B.i = 1; return; }
      if (B.i < sol.length) { stepTo(g, sol[B.i++]); return; }
      endDrag(g); B.c++; B.wait = 4;
    },

    onKey(g, e) {
      const S = g.s, c = e.code, P = S.P;
      if (S.won) return;
      const d = KEYDIR[c];
      if (d !== undefined) {
        if (!S.kbd) { S.kbd = true; return; }
        const from = S.kdraw && S.drag ? S.paths[S.drag.c][S.paths[S.drag.c].length - 1] : S.cur;
        const x = from % P.cols + DX[d], y = ((from / P.cols) | 0) + DY[d];
        if (x < 0 || y < 0 || x >= P.cols || y >= P.rows) return;
        const n = y * P.cols + x;
        if (S.kdraw && S.drag) { if (stepTo(g, n)) S.cur = n; else g.sfx('error'); }
        else { S.cur = n; g.sfx('tick'); }
        return;
      }
      if (e.repeat) return;
      if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter') {
        if (!S.kbd) { S.kbd = true; return; }
        if (S.kdraw) endDrag(g);
        else if (startAt(g, S.cur)) { S.kdraw = true; const p = S.paths[S.drag.c]; S.cur = p[p.length - 1]; }
        else g.sfx('error');
      } else if (c === 'KeyZ' || c === 'Backspace') { if (S.kdraw) endDrag(g); press(g, 'undo'); }
      else if (c === 'KeyH') { if (S.kdraw) endDrag(g); press(g, 'hint'); }
      else if (c === 'KeyR') press(g, 'restart');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        const b = btnAt(S, p.x, p.y);
        S.hoverBtn = b && p.kind !== 'touch' ? b.id : null;
        if (p.kind === 'mouse') S.kbd = false;
        if (S.drag && !S.kdraw && p.id === S.pid) { S.ptr = { x: p.x, y: p.y }; dragTo(g, cellAt(S, p.x, p.y)); }
        return;
      }
      if (type === 'down') {
        const b = btnAt(S, p.x, p.y);
        if (b) { press(g, b.id); return; }
        if (S.kdraw) endDrag(g);
        if (S.drag) return;
        const i = cellAt(S, p.x, p.y);
        if (startAt(g, i)) { S.pid = p.id; S.ptr = { x: p.x, y: p.y }; S.cur = i; }
        return;
      }
      if (type === 'up' && S.drag && !S.kdraw && p.id === S.pid) { endDrag(g); S.ptr = null; }
    },

    draw(g, ctx) {
      const S = g.s;
      if (!S) return;
      drawBackdrop(g, ctx, g.W, g.H, S.t);
      drawBoard(g, ctx, S);
      if (g.state === 'play' && S.kbd && !S.won) {
        const x = S.bx + (S.cur % S.P.cols) * S.c, y = S.by + ((S.cur / S.P.cols) | 0) * S.c;
        ctx.save(); g.rr(ctx, x + 3, y + 3, S.c - 6, S.c - 6, S.c * 0.18);
        ctx.strokeStyle = S.kdraw ? COL[S.drag ? S.drag.c : 0] : '#ffffff'; ctx.lineWidth = 4; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.7 + Math.sin(S.t * 0.15) * 0.3; ctx.stroke(); ctx.restore();
      }
      if (!g.demo) {
        drawInfo(g, ctx, S);
        for (const b of S.btns) drawButton(g, ctx, S, b, b.id === 'undo' && !S.hist.length);
      }
    },

    cover(ctx, w, h, k) {
      const P = build(9, 5, 7, 2024);
      const S = makeState({ W: w, H: h }, P);
      S.c = 92; S.bx = (w - 9 * 92) / 2; S.by = (h - 5 * 92) / 2; S.t = 50;
      S.paths = P.sol.map(s => s.slice());
      S.paths[2] = S.paths[2].slice(0, Math.max(2, S.paths[2].length - 4));
      S.owner.fill(-1); S.paths.forEach((p, c) => { for (const i of p) S.owner[i] = c; });
      for (let c = 0; c < P.k; c++) S.conn[c] = isDone(S, c) ? 1 : 0;
      drawBackdrop(k, ctx, w, h, 0);
      drawBoard(k, ctx, S, { noHead: true });
      const e = S.paths[2][S.paths[2].length - 1];
      ctx.save(); ctx.globalAlpha = 0.35; k.circle(ctx, ccx(S, e), ccy(S, e), 46); ctx.fillStyle = COL[2]; ctx.fill(); ctx.restore();
    },

    // לבדיקות בלבד
    dev: { build, levelPuzzle, colorsFor, SIZE, LEVELS, adj, SEEDS },
  });
})();
