// ============================================================
//  רברסי — משחק 2D של URotation (המנוע: g2d/kit.js)
//  לוח 8×8: מניחים דיסקית כך שדיסקיות של היריב נתקעות בין שתי דיסקיות שלך — והן מתהפכות (בגל).
//  משבצות חוקיות מסומנות, מעבר תור כשאין מהלך, ספירת דיסקיות. נגד המחשב (מינימקס לפי רמה) או 2 שחקנים.
// ============================================================
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const DR8 = [-1, -1, -1, 0, 0, 1, 1, 1], DC8 = [-1, 0, 1, -1, 1, -1, 0, 1];

  // ---------- חוקים: משבצת = r*8+c, 1 שחור (מתחיל), 2 לבן ----------
  const RAYS = (() => {
    const a = [];
    for (let sq = 0; sq < 64; sq++) for (let d = 0; d < 8; d++) {
      const ray = [];
      let r = (sq >> 3) + DR8[d], c = (sq & 7) + DC8[d];
      while (r >= 0 && r < 8 && c >= 0 && c < 8) { ray.push(r * 8 + c); r += DR8[d]; c += DC8[d]; }
      a.push(Int8Array.from(ray));
    }
    return a;
  })();
  function newPos() { const b = new Int8Array(64); b[27] = 2; b[36] = 2; b[28] = 1; b[35] = 1; return { b, turn: 1 }; }
  function legalAt(b, sq, p) {
    if (b[sq]) return false;
    const o = 3 - p;
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[sq * 8 + d];
      let k = 0;
      while (k < ray.length && b[ray[k]] === o) k++;
      if (k > 0 && k < ray.length && b[ray[k]] === p) return true;
    }
    return false;
  }
  function movesOf(b, p) { const out = []; for (let sq = 0; sq < 64; sq++) if (legalAt(b, sq, p)) out.push(sq); return out; }
  function countMoves(b, p) { let n = 0; for (let sq = 0; sq < 64; sq++) if (legalAt(b, sq, p)) n++; return n; }
  function flipsOf(b, sq, p) {
    const o = 3 - p, out = [];
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[sq * 8 + d];
      let k = 0;
      while (k < ray.length && b[ray[k]] === o) k++;
      if (k > 0 && k < ray.length && b[ray[k]] === p) for (let j = 0; j < k; j++) out.push(ray[j]);
    }
    return out;
  }
  // מניח ומהפך; הדיסקיות שהתהפכו נכתבות ל-out החל מ-at. מחזיר כמה התהפכו
  function place(b, sq, p, out, at) {
    const o = 3 - p;
    let n = 0;
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[sq * 8 + d];
      let k = 0;
      while (k < ray.length && b[ray[k]] === o) k++;
      if (k > 0 && k < ray.length && b[ray[k]] === p) for (let j = 0; j < k; j++) { b[ray[j]] = p; out[at + n++] = ray[j]; }
    }
    b[sq] = p;
    return n;
  }
  function count(b) { let x = 0, y = 0; for (let i = 0; i < 64; i++) { if (b[i] === 1) x++; else if (b[i] === 2) y++; } return [x, y]; }

  // ---------- המחשב ----------
  // ערך של כל משבצת: פינות שוות הרבה, המשבצות שליד פינה ריקה מסוכנות
  const WT = Int16Array.from([
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, -1, -1, -1, -1, -2, 10,
    5, -2, -1, -1, -1, -1, -2, 5,
    5, -2, -1, -1, -1, -1, -2, 5,
    10, -2, -1, -1, -1, -1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
  ]);
  const CORNERS = [[0, [1, 8, 9]], [7, [6, 15, 14]], [56, [57, 48, 49]], [63, [62, 55, 54]]];
  const ORDERED = Array.from({ length: 64 }, (_, i) => i).sort((a, b) => WT[b] - WT[a]);
  const WIN = 100000;
  function evaluate(b, p) {
    const o = 3 - p;
    let s = 0, empt = 0;
    for (let i = 0; i < 64; i++) { const v = b[i]; if (!v) empt++; else s += v === p ? WT[i] : -WT[i]; }
    // ליד פינה תפוסה המשבצות כבר לא מסוכנות
    for (const [cn, adj] of CORNERS) if (b[cn]) for (const a of adj) if (b[a]) s += (b[a] === p ? 1 : -1) * (6 - WT[a]);
    s += 7 * (countMoves(b, p) - countMoves(b, o));
    if (empt < 14) { const [x, y] = count(b); s += (p === 1 ? x - y : y - x) * (14 - empt); }
    return s;
  }
  const finalScore = (b, p) => { const [x, y] = count(b), d = p === 1 ? x - y : y - x; return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0; };

  // אלפא-בטא עם מחסנית מפורשת: רץ כמה מילישניות בכל פריים וממשיך בפריים הבא (הדף לא קופא).
  // מעמיק בהדרגה עד opt.depth (ובסוף המשחק, עד הסוף ממש), ושומר את המהלך הכי טוב של העומק האחרון שהסתיים.
  function makeSearch(P, opt, rnd) {
    const b = Int8Array.from(P.b), me = P.turn;
    const self = { done: false, best: -1, score: 0, depth: 0, nodes: 0, t: 0, run: () => true };
    const root = movesOf(b, me);
    if (!root.length) { self.done = true; return self; }
    root.sort((x, y) => WT[y] - WT[x] + (rnd() - 0.5) * 0.5);
    self.best = root[0];
    if (root.length === 1) { self.done = true; return self; }
    let empties = 0;
    for (let i = 0; i < 64; i++) if (!b[i]) empties++;
    // בסוף המשחק: עד הסוף ממש (כל מעבר תור הוא עוד צעד, אז לכל היותר פי 2 מהמשבצות הריקות)
    const maxD = opt.endgame && empties <= opt.endgame ? empties * 2 : opt.depth;
    const MP = 66, MW = 34, INF = 1e9;
    const mv = new Int8Array(MP * MW), mn = new Int8Array(MP), mi = new Int8Array(MP), via = new Int8Array(MP), D = new Int8Array(MP), BM = new Int8Array(MP);
    const viaF = new Int16Array(MP), viaN = new Int8Array(MP);
    const A = new Float64Array(MP), B = new Float64Array(MP), BEST = new Float64Array(MP);
    const flips = new Int8Array(8192);
    const noise = opt.noise || 0;
    let fsp = 0, sp = 0, depth = 0, cut = false;   // cut: עלה כלשהו נקטע בגלל העומק (ולא בסוף המשחק)
    const sideAt = p => (p & 1 ? 3 - me : me);
    function enter(p, d, a, bb) {
      self.nodes++;
      const side = sideAt(p);
      const base = p * MW;
      let k = 0;
      if (p === 0) for (const sq of root) mv[base + k++] = sq;
      else for (let i = 0; i < 64; i++) { const sq = ORDERED[i]; if (!b[sq] && legalAt(b, sq, side)) mv[base + k++] = sq; }
      if (!k) {
        // אין מהלך: אם גם ליריב אין — המשחק נגמר; אחרת מעבר תור
        let any = false;
        for (let sq = 0; sq < 64 && !any; sq++) if (!b[sq] && legalAt(b, sq, 3 - side)) any = true;
        if (!any) return finalScore(b, side);
        mv[base + k++] = -1;
      } else if (d <= 0) { cut = true; let v = evaluate(b, side); if (noise) v += (rnd() - 0.5) * noise; return v; }
      if (d <= 0 && mv[base] === -1) { cut = true; let v = evaluate(b, side); if (noise) v += (rnd() - 0.5) * noise; return v; }
      mn[p] = k; mi[p] = 0; A[p] = a; B[p] = bb; BEST[p] = -INF; BM[p] = mv[base]; D[p] = d;
      sp = p;
      return null;
    }
    function iterate() { depth++; cut = false; enter(0, depth, -INF, INF); }
    self.run = ms => {
      if (self.done) return true;
      const t0 = now();
      let it = 0;
      while (!self.done) {
        if ((++it & 255) === 0 && (now() - t0 > ms || self.nodes > opt.nodes)) break;
        const p = sp;
        if (mi[p] < mn[p] && A[p] < B[p]) {
          const sq = mv[p * MW + mi[p]++], side = sideAt(p), f0 = fsp;
          let nf = 0;
          if (sq >= 0) { nf = place(b, sq, side, flips, fsp); fsp += nf; }
          viaF[p + 1] = f0; viaN[p + 1] = nf;
          const res = enter(p + 1, D[p] - 1, -B[p], -A[p]);
          if (res === null) { via[p + 1] = sq; continue; }
          if (sq >= 0) { b[sq] = 0; for (let i = 0; i < nf; i++) b[flips[f0 + i]] = 3 - side; }
          fsp = f0;
          const v = -res;
          if (v > BEST[p]) { BEST[p] = v; BM[p] = sq; }
          if (v > A[p]) A[p] = v;
        } else if (p === 0) {
          self.best = BM[0]; self.score = BEST[0]; self.depth = depth;
          const j = root.indexOf(BM[0]);
          if (j > 0) { root.splice(j, 1); root.unshift(BM[0]); }
          // סיום: העומק המלא, או שכל הענפים הגיעו לסוף המשחק (התוצאה מדויקת), או ניצחון מוכח (exact: עד הסוף, לבדיקות)
          if (depth >= maxD || !cut || (Math.abs(BEST[0]) >= WIN && !opt.exact)) self.done = true;
          else iterate();
        } else {
          const v = -BEST[p], sq = via[p], side = sideAt(p - 1);
          if (sq >= 0) { b[sq] = 0; for (let i = 0; i < viaN[p]; i++) b[flips[viaF[p] + i]] = 3 - side; }
          fsp = viaF[p];
          sp = p - 1;
          const q = sp;
          if (v > BEST[q]) { BEST[q] = v; BM[q] = sq; }
          if (v > A[q]) A[q] = v;
        }
      }
      self.t += now() - t0;
      if (!self.done && (self.t > opt.budget || self.nodes > opt.nodes)) self.done = true;
      return self.done;
    };
    iterate();
    return self;
  }

  // רמות (נבדקו מול שחקנים מתוסרטים, ראה g2dtools/tests/reversi)
  // קל = מתחיל שהופך כמה שיותר; בינוני = מבט של 2 מהלכים עם הרבה טעויות; קשה = 4 מהלכים קדימה ו-8 האחרונים עד הסוף,
  // עם החלקה נדירה (מהלך אחד מ-20) כדי ששחקן חזק יוכל לנצח לפעמים
  const LEVELS = [
    { greedy: 2, random: 0.3, corner: 0.3, think: 0.3 },
    { random: 0.4, depth: 2, noise: 30, budget: 100, nodes: 25000, think: 0.34 },
    { random: 0.05, depth: 4, noise: 6, budget: 200, nodes: 40000, endgame: 8, think: 0.38 },
  ];
  const IS_CORNER = sq => sq === 0 || sq === 7 || sq === 56 || sq === 63;
  function cpuPlan(P, diff, rnd) {
    const L = LEVELS[diff];
    const quick = best => ({ done: true, best, depth: 0, careless: true, run: () => true });
    if (L.greedy) {
      // מתחיל: הופך כמה שיותר דיסקיות, לפעמים לא שם לב לפינה פנויה, ולפעמים משחק סתם
      const b = P.b, ms = movesOf(b, P.turn);
      let pool = ms;
      if (rnd() >= L.corner) { const nc = ms.filter(s => !IS_CORNER(s)); if (nc.length) pool = nc; }
      if (rnd() < L.random) return quick(pool[Math.floor(rnd() * pool.length)]);
      let best = pool[0], bv = -1e9;
      for (const s of pool) { const v = flipsOf(b, s, P.turn).length + rnd() * L.greedy; if (v > bv) { bv = v; best = s; } }
      return quick(best);
    }
    if (L.random && rnd() < L.random) {
      const ms = movesOf(P.b, P.turn);
      return quick(ms[Math.floor(rnd() * ms.length)]);
    }
    return makeSearch(P, L, rnd);
  }
  // שחקן פשוט (לבדיקות, ו-GK.bot): לוקח פינה, נמנע מהמשבצות שליד פינה ריקה, ואחרת הופך כמה שיותר
  function botPick(P, rnd) {
    const b = P.b, ms = movesOf(b, P.turn);
    if (!ms.length) return -1;
    const corner = ms.filter(s => s === 0 || s === 7 || s === 56 || s === 63);
    if (corner.length) return corner[Math.floor(rnd() * corner.length)];
    const risky = s => CORNERS.some(([cn, adj]) => !b[cn] && adj.includes(s));
    const pool = ms.filter(s => !risky(s));
    let best = -1, bv = -1e9;
    for (const s of pool.length ? pool : ms) { const v = flipsOf(b, s, P.turn).length + rnd() * 2.5; if (v > bv) { bv = v; best = s; } }
    return best;
  }

  // ---------- פריסה ----------
  function layout(W, H) {
    const port = H > W;
    const CS = port ? 66 : 62, FR = 14;
    const bw = CS * 8 + FR * 2;
    const L = { port, W, H, CS, FR, bw, bx: Math.round((W - bw) / 2), by: port ? 188 : 40, DR: CS * 0.4 };
    L.ix = L.bx + FR; L.iy = L.by + FR;
    if (port) {
      L.cards = [{ x: 15, y: 16, w: 279, h: 152 }, { x: W - 294, y: 16, w: 279, h: 152 }];
      L.pill = { x: W / 2, y: 836, h: 62, max: 560, size: 27 };
    } else {
      L.cards = [{ x: 24, y: 118, w: 176, h: 322 }, { x: W - 200, y: 118, w: 176, h: 322 }];
      L.pill = { x: W / 2, y: 604, h: 48, max: 520, size: 22 };
    }
    return L;
  }
  const cx = (L, sq) => L.ix + L.CS * (sq & 7) + L.CS / 2;
  const cy = (L, sq) => L.iy + L.CS * (sq >> 3) + L.CS / 2;

  // ---------- ציור ----------
  const SKIN = {
    1: { light: '#626979', mid: '#262a33', dark: '#0a0b0e', edge: '#000000', groove: 'rgba(255,255,255,.08)', shine: 'rgba(255,255,255,.3)', glow: '#9fb0d6', pupil: '#0b0c10', ink: '#e9edf5', chip: '#cfd6e6' },
    2: { light: '#ffffff', mid: '#f3f4f6', dark: '#c4c8d0', edge: '#8e939e', groove: 'rgba(0,0,0,.07)', shine: 'rgba(255,255,255,.95)', glow: '#ffffff', pupil: '#1c2230', ink: '#2a3142', chip: '#ffffff' },
  };
  function rrPath(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function paintDisc(c, x, y, R, p) {
    const k = SKIN[p];
    c.beginPath(); c.arc(x, y + R * 0.1, R, 0, TAU); c.fillStyle = k.edge; c.fill();
    const gr = c.createRadialGradient(x - R * 0.35, y - R * 0.42, R * 0.08, x, y, R);
    gr.addColorStop(0, k.light); gr.addColorStop(0.55, k.mid); gr.addColorStop(1, k.dark);
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = gr; c.fill();
    c.lineWidth = R * 0.06; c.strokeStyle = k.groove; c.beginPath(); c.arc(x, y, R * 0.7, 0, TAU); c.stroke();
    c.fillStyle = k.shine; c.beginPath(); c.ellipse(x - R * 0.32, y - R * 0.44, R * 0.34, R * 0.14, -0.5, 0, TAU); c.fill();
  }
  function paintBoard(c, L, ox, oy) {
    const { CS, FR, bw } = L, inner = CS * 8;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    c.beginPath(); rrPath(c, ox, oy, bw, bw, 20);
    const wood = c.createLinearGradient(ox, oy, ox + bw, oy + bw);
    wood.addColorStop(0, '#9a5f32'); wood.addColorStop(0.5, '#7b4422'); wood.addColorStop(1, '#5a2f16');
    c.fillStyle = wood; c.fill();
    c.restore();
    // סיבי עץ
    c.save(); c.beginPath(); rrPath(c, ox, oy, bw, bw, 20); c.clip();
    c.strokeStyle = 'rgba(255,220,170,.08)'; c.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const y = oy + 6 + i * (bw / 26); c.beginPath(); c.moveTo(ox, y); c.bezierCurveTo(ox + bw * 0.3, y + 5, ox + bw * 0.6, y - 5, ox + bw, y + 2); c.stroke(); }
    c.restore();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,225,180,.35)'; c.beginPath(); rrPath(c, ox + 2, oy + 2, bw - 4, bw - 4, 18); c.stroke();
    // לבד ירוק
    const fx = ox + FR, fy = oy + FR;
    const felt = c.createRadialGradient(fx + inner / 2, fy + inner * 0.4, inner * 0.1, fx + inner / 2, fy + inner / 2, inner * 0.75);
    felt.addColorStop(0, '#2fa463'); felt.addColorStop(1, '#16723f');
    c.fillStyle = felt; c.fillRect(fx, fy, inner, inner);
    c.globalAlpha = 0.06;
    for (let i = 0; i < 900; i++) { const x = fx + ((i * 73.13) % inner), y = fy + ((i * 41.71 + i * i * 0.37) % inner); c.fillStyle = i % 2 ? '#ffffff' : '#000000'; c.fillRect(x, y, 1.5, 1.5); }
    c.globalAlpha = 1;
    // קווי המשבצות
    c.strokeStyle = 'rgba(0,40,18,.55)'; c.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      c.beginPath(); c.moveTo(fx + i * CS, fy); c.lineTo(fx + i * CS, fy + inner); c.stroke();
      c.beginPath(); c.moveTo(fx, fy + i * CS); c.lineTo(fx + inner, fy + i * CS); c.stroke();
    }
    c.fillStyle = 'rgba(0,40,18,.7)';
    for (const [i, j] of [[2, 2], [6, 2], [2, 6], [6, 6]]) { c.beginPath(); c.arc(fx + i * CS, fy + j * CS, 4, 0, TAU); c.fill(); }
    // צל פנימי בקצוות הלבד
    const sh = c.createLinearGradient(0, fy, 0, fy + 18);
    sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh; c.fillRect(fx, fy, inner, 18);
  }
  const cache = { res: 0, L: null };
  function sprites(ctx, L) {
    let res = 2;
    try { const m = ctx.getTransform(); res = Math.hypot(m.a, m.b) || 2; } catch (e) {}
    res = Math.max(1, Math.min(4, Math.round(res * 4) / 4));
    if (cache.res === res && cache.L === L) return cache;
    cache.res = res; cache.L = L;
    const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res); const c = cv.getContext('2d'); c.scale(res, res); return [cv, c]; };
    const R = L.DR, half = R * 1.15 + 2;
    cache.dh = half; cache.ds = half * 2;
    for (const p of [1, 2]) { const [cv, c] = mk(half * 2, half * 2); paintDisc(c, half, half, R, p); cache[p] = cv; }
    const m = 44;
    const [bv, bc] = mk(L.bw + m * 2, L.bw + m * 2);
    paintBoard(bc, L, m, m);
    cache.board = bv; cache.m = m; cache.bs = L.bw + m * 2;
    return cache;
  }
  function drawBg(ctx, W, H, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#123a2c'); gr.addColorStop(0.6, '#0c2a20'); gr.addColorStop(1, '#071712');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const cols = ['120,255,190', '255,230,150', '150,200,255'];
    for (let i = 0; i < 10; i++) {
      const r = 50 + (i * 37) % 80;
      const x = ((i * 191.3 + t * (4 + (i % 4) * 2.5)) % (W + r * 2)) - r, y = (i * 113.7) % H + Math.sin(t * 0.4 + i * 1.7) * 18;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + cols[i % 3] + ',.10)'); rg.addColorStop(1, 'rgba(' + cols[i % 3] + ',0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  // דיסקית שמתהפכת: מתכווצת לרוחב, מחליפה צבע באמצע, ומתרוממת קצת
  function drawDiscAt(ctx, C, L, p, x, y, sx, lift, scale) {
    const s = scale || 1;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.3 - lift * 0.012).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x + 2 + lift * 0.3, y + L.DR * 0.28 + lift * 0.4, L.DR * s * Math.max(0.35, sx) * 1.02, L.DR * s * 0.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y - lift); ctx.scale(Math.max(0.04, sx) * s, s);
    ctx.drawImage(C[p], -C.dh, -C.dh, C.ds, C.ds);
    ctx.restore();
  }

  // ---------- הדמויות ----------
  function drawBuddy(ctx, x, y, R, p, mood, lx, ly, blink) {
    const k = SKIN[p];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.08;
    ctx.beginPath(); ctx.arc(x, y + R * 0.1, R, 0, TAU); ctx.fillStyle = k.edge; ctx.fill();
    ctx.restore();
    paintDisc(ctx, x, y, R, p);
    const ex = R * 0.3, ey = y - R * 0.1, ew = R * 0.19, eh = R * 0.23;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const ex2 = x + s * ex;
      ctx.strokeStyle = k.ink; ctx.lineWidth = R * 0.075;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex2, ey + eh * 0.35, ew * 0.85, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); continue; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(ex2 - ew * 0.8, ey); ctx.lineTo(ex2 + ew * 0.8, ey); ctx.stroke(); continue; }
      const big = mood === 'wow' ? 1.15 : 1;
      ctx.beginPath(); ctx.ellipse(ex2, ey, ew * big, eh * big, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = R * 0.03; ctx.strokeStyle = p === 2 ? k.ink : 'rgba(0,0,0,.6)'; ctx.stroke();
      const pr = ew * (mood === 'wow' ? 0.36 : 0.52);
      const px = ex2 + lx * ew * 0.42, py = ey + ly * eh * 0.38 + (mood === 'sad' ? eh * 0.25 : 0);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fillStyle = k.pupil; ctx.fill();
      ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.32, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = k.ink; ctx.lineWidth = R * 0.065;
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex2 - s * ew * 1.0, ey - eh * 1.15); ctx.lineTo(ex2 + s * ew * 0.9, ey - eh * 1.55); ctx.stroke(); }
      if (mood === 'think' && s === 1) { ctx.beginPath(); ctx.moveTo(ex2 - ew, ey - eh * 1.5); ctx.quadraticCurveTo(ex2, ey - eh * 1.95, ex2 + ew, ey - eh * 1.55); ctx.stroke(); }
    }
    const my = y + R * 0.36;
    ctx.strokeStyle = k.ink; ctx.lineWidth = R * 0.075;
    if (mood === 'happy') {
      ctx.beginPath(); ctx.moveTo(x - R * 0.3, my - R * 0.05); ctx.quadraticCurveTo(x, my + R * 0.42, x + R * 0.3, my - R * 0.05); ctx.closePath();
      ctx.fillStyle = '#5a0f22'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(x, my + R * 0.24, R * 0.15, 0, TAU); ctx.fillStyle = '#ff6f8a'; ctx.fill(); ctx.restore();
    } else if (mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + R * 0.16, R * 0.18, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(x, my + R * 0.04, R * 0.09, R * 0.12, 0, 0, TAU); ctx.fillStyle = '#5a0f22'; ctx.fill(); ctx.stroke(); }
    else if (mood === 'think') { ctx.beginPath(); ctx.moveTo(x - R * 0.12, my + R * 0.04); ctx.lineTo(x + R * 0.14, my); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, my - R * 0.1, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,140,170,.42)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * R * 0.56, y + R * 0.2, R * 0.13, R * 0.08, 0, 0, TAU); ctx.fill(); }
  }
  function drawRobot(ctx, x, y, R, mood, lx, ly, blink, t) {
    const hw = R * 0.92, hh = R * 0.76, acc = '#5ef0b4';
    ctx.strokeStyle = '#8d9bbf'; ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x, y - hh - R * 0.26); ctx.stroke();
    const on = mood === 'think' ? Math.sin(t * 16) > 0 : true;
    ctx.save();
    if (on) { ctx.shadowColor = acc; ctx.shadowBlur = R * 0.35; }
    ctx.beginPath(); ctx.arc(x, y - hh - R * 0.33, R * 0.12, 0, TAU); ctx.fillStyle = on ? acc : '#2d7a5c'; ctx.fill();
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.beginPath(); rrPath(ctx, s < 0 ? x - hw - R * 0.16 : x + hw - R * 0.02, y - R * 0.26, R * 0.18, R * 0.5, R * 0.07);
      ctx.fillStyle = acc; ctx.fill(); ctx.strokeStyle = '#1f7a57'; ctx.lineWidth = R * 0.03; ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.08;
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32);
    const hg = ctx.createLinearGradient(0, y - hh, 0, y + hh);
    hg.addColorStop(0, '#f6f8ff'); hg.addColorStop(1, '#a3b0d2');
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32); ctx.strokeStyle = '#56627f'; ctx.lineWidth = R * 0.04; ctx.stroke();
    const sw = hw * 0.8, sh = hh * 0.72;
    ctx.beginPath(); rrPath(ctx, x - sw, y - sh, sw * 2, sh * 2, R * 0.2);
    const sg = ctx.createLinearGradient(0, y - sh, 0, y + sh);
    sg.addColorStop(0, '#16224a'); sg.addColorStop(1, '#0a1230');
    ctx.fillStyle = sg; ctx.fill();
    ctx.save();
    const col = '#5ef0ff';
    ctx.shadowColor = col; ctx.shadowBlur = R * 0.18;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = R * 0.08; ctx.lineCap = 'round';
    const ex = R * 0.32, ey = y - R * 0.1;
    for (const s of [-1, 1]) {
      let ex2 = x + s * ex + lx * R * 0.07, ey2 = ey + ly * R * 0.06;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex2, ey2 + R * 0.06, R * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex2 - R * 0.12, ey2 - s * R * 0.05); ctx.lineTo(ex2 + R * 0.12, ey2 + s * R * 0.05); ctx.stroke(); continue; }
      if (mood === 'think') { ex2 = x + s * ex + R * 0.06; ey2 = ey - R * 0.07; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(ex2 - R * 0.1, ey2); ctx.lineTo(ex2 + R * 0.1, ey2); ctx.stroke(); continue; }
      if (mood === 'wow') { ctx.beginPath(); ctx.arc(ex2, ey2, R * 0.13, 0, TAU); ctx.lineWidth = R * 0.06; ctx.stroke(); ctx.lineWidth = R * 0.08; continue; }
      ctx.beginPath(); rrPath(ctx, ex2 - R * 0.08, ey2 - R * 0.12, R * 0.16, R * 0.24, R * 0.07); ctx.fill();
    }
    const my = y + R * 0.3;
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(x, my - R * 0.1, R * 0.22, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    else if (mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + R * 0.16, R * 0.2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.arc(x, my, R * 0.08, 0, TAU); ctx.lineWidth = R * 0.05; ctx.stroke(); }
    else if (mood === 'think') {
      ctx.lineWidth = R * 0.06;
      ctx.beginPath(); for (let i = 0; i <= 8; i++) { const xx = x - R * 0.22 + i * R * 0.055, yy = my + Math.sin(i * 1.6 + t * 10) * R * 0.035; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke();
    } else { ctx.beginPath(); ctx.moveTo(x - R * 0.17, my); ctx.quadraticCurveTo(x, my + R * 0.08, x + R * 0.17, my); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#7b88aa';
    for (const [bx, by] of [[x - hw * 0.86, y - hh * 0.8], [x + hw * 0.86, y - hh * 0.8], [x - hw * 0.86, y + hh * 0.8], [x + hw * 0.86, y + hh * 0.8]]) { ctx.beginPath(); ctx.arc(bx, by, R * 0.045, 0, TAU); ctx.fill(); }
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'רברסי', help: ['לחץ על משבצת מסומנת כדי להניח דיסקית (או חצים ורווח)', 'דיסקיות של היריב שנתקעות בין הדיסקית החדשה לדיסקית שלך — מתהפכות!', 'אין לך מהלך? התור עובר ליריב', 'בסוף מנצח מי שיש לו יותר דיסקיות. הפינות הכי שוות!'], helpTouch: ['גע במשבצת מסומנת כדי להניח דיסקית', 'דיסקיות של היריב שנתקעות בין הדיסקית החדשה לדיסקית שלך — מתהפכות!', 'אין לך מהלך? התור עובר ליריב', 'בסוף מנצח מי שיש לו יותר דיסקיות. הפינות הכי שוות!'], you: 'אתה', yourTurn: 'התור שלך!', thinking: 'המחשב חושב…', cpuWins: 'המחשב ניצח', notHere: 'אי אפשר להניח כאן', corner: 'פינה!', discs: 'דיסקיות', passYou: 'אין לך מהלכים — התור עובר', passCpu: 'למחשב אין מהלכים — שוב תורך!', passP: 'ל{name} אין מהלכים — התור עובר', endYou: 'יש לך {a} דיסקיות ולמחשב {b}.', end2p: 'לשחקן 1 יש {a} דיסקיות ולשחקן 2 יש {b}.', tip1: 'טיפ: תפוס פינות — אי אפשר להפוך אותן לעולם.', tip2: 'טיפ: אל תניח ליד פינה ריקה, זה פותח אותה ליריב.', tip3: 'טיפ: לא תמיד כדאי להפוך הרבה — עדיף שליריב יהיו מעט מהלכים.' },
    en: { title: 'Reversi', help: ['Click a marked square to place a disc (or arrows + Space)', 'Enemy discs trapped between your new disc and another of yours flip over!', 'No move? Your turn passes to the opponent', 'Whoever has more discs at the end wins. Corners are the best!'], helpTouch: ['Tap a marked square to place a disc', 'Enemy discs trapped between your new disc and another of yours flip over!', 'No move? Your turn passes to the opponent', 'Whoever has more discs at the end wins. Corners are the best!'], you: 'You', yourTurn: 'Your turn!', thinking: 'The computer is thinking…', cpuWins: 'The computer wins', notHere: "You can't place a disc there", corner: 'Corner!', discs: 'Discs', passYou: 'You have no moves — your turn passes', passCpu: 'The computer has no moves — your turn again!', passP: '{name} has no moves — the turn passes', endYou: 'You have {a} discs and the computer {b}.', end2p: 'Player 1 has {a} discs and Player 2 has {b}.', tip1: 'Tip: grab the corners — they can never be flipped.', tip2: "Tip: don't play next to an empty corner, it hands it to your opponent.", tip3: 'Tip: flipping a lot is not always best — leave your opponent few moves.' },
    ar: { title: 'ريفرسي', help: ['انقر على مربع مُعلَّم لوضع قرص (أو الأسهم والمسافة)', 'أقراص الخصم المحصورة بين قرصك الجديد وقرص آخر لك تنقلب!', 'لا توجد حركة؟ ينتقل الدور إلى الخصم', 'يفوز من لديه أقراص أكثر في النهاية. الزوايا هي الأفضل!'], helpTouch: ['المس مربعاً مُعلَّماً لوضع قرص', 'أقراص الخصم المحصورة بين قرصك الجديد وقرص آخر لك تنقلب!', 'لا توجد حركة؟ ينتقل الدور إلى الخصم', 'يفوز من لديه أقراص أكثر في النهاية. الزوايا هي الأفضل!'], you: 'أنت', yourTurn: 'دورك!', thinking: 'الكمبيوتر يفكر…', cpuWins: 'فاز الكمبيوتر', notHere: 'لا يمكن وضع قرص هنا', corner: 'زاوية!', discs: 'الأقراص', passYou: 'لا توجد لديك حركات — ينتقل الدور', passCpu: 'لا توجد حركات للكمبيوتر — دورك مجدداً!', passP: 'لا توجد حركات لـ{name} — ينتقل الدور', endYou: 'لديك {a} قرصاً وللكمبيوتر {b}.', end2p: 'لدى اللاعب 1 {a} قرصاً ولدى اللاعب 2 {b}.', tip1: 'نصيحة: احتل الزوايا — لا يمكن قلبها أبداً.', tip2: 'نصيحة: لا تلعب بجانب زاوية فارغة، فهذا يمنحها لخصمك.', tip3: 'نصيحة: قلب الكثير ليس الأفضل دائماً — اترك لخصمك حركات قليلة.' },
    es: { title: 'Reversi', help: ['Haz clic en una casilla marcada para poner una ficha (o flechas + Espacio)', '¡Las fichas rivales atrapadas entre tu ficha nueva y otra tuya se dan vuelta!', '¿No tienes jugada? El turno pasa al rival', 'Al final gana quien tenga más fichas. ¡Las esquinas valen oro!'], helpTouch: ['Toca una casilla marcada para poner una ficha', '¡Las fichas rivales atrapadas entre tu ficha nueva y otra tuya se dan vuelta!', '¿No tienes jugada? El turno pasa al rival', 'Al final gana quien tenga más fichas. ¡Las esquinas valen oro!'], you: 'Tú', yourTurn: '¡Tu turno!', thinking: 'La computadora piensa…', cpuWins: 'Gana la computadora', notHere: 'No puedes poner una ficha ahí', corner: '¡Esquina!', discs: 'Fichas', passYou: 'No tienes jugadas: pasa el turno', passCpu: 'La computadora no tiene jugadas: ¡te toca otra vez!', passP: '{name} no tiene jugadas: pasa el turno', endYou: 'Tienes {a} fichas y la computadora {b}.', end2p: 'El jugador 1 tiene {a} fichas y el jugador 2 tiene {b}.', tip1: 'Consejo: toma las esquinas, nunca se pueden dar vuelta.', tip2: 'Consejo: no juegues junto a una esquina vacía, se la regalas al rival.', tip3: 'Consejo: voltear muchas no siempre es mejor; deja al rival con pocas jugadas.' },
    fr: { title: 'Reversi', help: ['Clique sur une case marquée pour poser un pion (ou flèches + Espace)', "Les pions adverses coincés entre ton nouveau pion et un autre des tiens se retournent !", "Pas de coup possible ? Ton tour passe à l'adversaire", 'À la fin, celui qui a le plus de pions gagne. Les coins sont les meilleures cases !'], helpTouch: ['Touche une case marquée pour poser un pion', "Les pions adverses coincés entre ton nouveau pion et un autre des tiens se retournent !", "Pas de coup possible ? Ton tour passe à l'adversaire", 'À la fin, celui qui a le plus de pions gagne. Les coins sont les meilleures cases !'], you: 'Toi', yourTurn: 'À toi !', thinking: "L'ordinateur réfléchit…", cpuWins: "L'ordinateur gagne", notHere: 'Tu ne peux pas poser ici', corner: 'Un coin !', discs: 'Pions', passYou: "Tu n'as aucun coup — ton tour passe", passCpu: "L'ordinateur n'a aucun coup — encore à toi !", passP: "{name} n'a aucun coup — le tour passe", endYou: "Tu as {a} pions et l'ordinateur {b}.", end2p: 'Le joueur 1 a {a} pions et le joueur 2 en a {b}.', tip1: 'Astuce : prends les coins, ils ne peuvent jamais être retournés.', tip2: "Astuce : ne joue pas à côté d'un coin vide, tu l'offres à l'adversaire.", tip3: "Astuce : retourner beaucoup n'est pas toujours le mieux ; laisse peu de coups à l'adversaire." },
    pt: { title: 'Reversi', help: ['Clique numa casa marcada para colocar uma peça (ou setas + Espaço)', 'As peças do rival presas entre a sua peça nova e outra sua viram!', 'Sem jogada? A vez passa para o rival', 'No fim vence quem tiver mais peças. Os cantos são os melhores!'], helpTouch: ['Toque numa casa marcada para colocar uma peça', 'As peças do rival presas entre a sua peça nova e outra sua viram!', 'Sem jogada? A vez passa para o rival', 'No fim vence quem tiver mais peças. Os cantos são os melhores!'], you: 'Você', yourTurn: 'Sua vez!', thinking: 'O computador está pensando…', cpuWins: 'O computador venceu', notHere: 'Não dá para colocar aí', corner: 'Canto!', discs: 'Peças', passYou: 'Você não tem jogadas — a vez passa', passCpu: 'O computador não tem jogadas — sua vez de novo!', passP: '{name} não tem jogadas — a vez passa', endYou: 'Você tem {a} peças e o computador {b}.', end2p: 'O jogador 1 tem {a} peças e o jogador 2 tem {b}.', tip1: 'Dica: pegue os cantos, eles nunca podem ser virados.', tip2: 'Dica: não jogue ao lado de um canto vazio, isso o entrega ao rival.', tip3: 'Dica: virar muitas nem sempre é melhor; deixe o rival com poucas jogadas.' },
    ru: { title: 'Реверси', help: ['Нажми на отмеченную клетку, чтобы поставить фишку (или стрелки + Пробел)', 'Фишки соперника, зажатые между новой фишкой и другой твоей, переворачиваются!', 'Нет хода? Ход переходит к сопернику', 'В конце побеждает тот, у кого больше фишек. Углы — лучшие клетки!'], helpTouch: ['Коснись отмеченной клетки, чтобы поставить фишку', 'Фишки соперника, зажатые между новой фишкой и другой твоей, переворачиваются!', 'Нет хода? Ход переходит к сопернику', 'В конце побеждает тот, у кого больше фишек. Углы — лучшие клетки!'], you: 'Ты', yourTurn: 'Твой ход!', thinking: 'Компьютер думает…', cpuWins: 'Компьютер победил', notHere: 'Сюда ставить нельзя', corner: 'Угол!', discs: 'Фишки', passYou: 'У тебя нет ходов — ход переходит', passCpu: 'У компьютера нет ходов — снова твой ход!', passP: '{name}: нет ходов — ход переходит', endYou: 'Фишек у тебя: {a}, у компьютера: {b}.', end2p: 'Фишек у игрока 1: {a}, у игрока 2: {b}.', tip1: 'Совет: занимай углы — их нельзя перевернуть.', tip2: 'Совет: не ходи рядом с пустым углом — ты отдаёшь его сопернику.', tip3: 'Совет: переворачивать много не всегда выгодно — оставь сопернику мало ходов.' },
    de: { title: 'Reversi', help: ['Klicke auf ein markiertes Feld, um einen Stein zu setzen (oder Pfeile + Leertaste)', 'Gegnerische Steine zwischen deinem neuen und einem anderen deiner Steine werden umgedreht!', 'Kein Zug möglich? Dann ist der Gegner dran', 'Am Ende gewinnt, wer mehr Steine hat. Ecken sind am wertvollsten!'], helpTouch: ['Tippe auf ein markiertes Feld, um einen Stein zu setzen', 'Gegnerische Steine zwischen deinem neuen und einem anderen deiner Steine werden umgedreht!', 'Kein Zug möglich? Dann ist der Gegner dran', 'Am Ende gewinnt, wer mehr Steine hat. Ecken sind am wertvollsten!'], you: 'Du', yourTurn: 'Du bist dran!', thinking: 'Der Computer denkt nach…', cpuWins: 'Der Computer gewinnt', notHere: 'Hier kannst du nicht setzen', corner: 'Ecke!', discs: 'Steine', passYou: 'Du hast keinen Zug — der Gegner ist dran', passCpu: 'Der Computer hat keinen Zug — du bist wieder dran!', passP: '{name} hat keinen Zug — der Gegner ist dran', endYou: 'Du hast {a} Steine und der Computer {b}.', end2p: 'Spieler 1 hat {a} Steine und Spieler 2 hat {b}.', tip1: 'Tipp: Schnapp dir die Ecken — sie können nie umgedreht werden.', tip2: 'Tipp: Setz nicht neben eine leere Ecke, sonst bekommt sie der Gegner.', tip3: 'Tipp: Viel umdrehen ist nicht immer gut — lass dem Gegner wenige Züge.' },
  };

  // ---------- מהלך המשחק ----------
  const tallyKey = g => (g.mode === '2p' ? '2p' : 'cpu' + g.diff);
  const isCpu = (S, p) => S.vsCpu && p === 2;
  const FLIP = 0.26, WAVE = 0.05;   // משך ההיפוך של דיסקית, וההשהיה בין טבעת לטבעת בגל
  function humanTurn(g) { const S = g.s; return g.state === 'play' && !S.over && !S.anim && !S.think && !S.wait && !isCpu(S, S.P.turn); }
  function setMood(S, p, m, sec) { S.mood[p] = m; S.moodUntil[p] = S.t + sec; }

  function hud(g) {
    const S = g.s, [x, y] = count(S.P.b);
    if (S.vsCpu) g.hud([[g.t('you'), String(x), SKIN[1].chip], [g.t('cpu'), String(y), SKIN[2].chip], [g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff])]]);
    else { const tl = S.keep.tally['2p'] || [0, 0]; g.hud([[g.t('p1'), String(x), SKIN[1].chip], [g.t('p2'), String(y), SKIN[2].chip], ['🏆', tl[0] + ' : ' + tl[1]]]); }
  }

  function beginTurn(g) {
    const S = g.s, P = S.P;
    if (S.over) return;
    S.moves = movesOf(P.b, P.turn);
    S.hover = -1; S.hoverFlips = [];
    if (!S.moves.length) {
      if (!movesOf(P.b, 3 - P.turn).length) return finish(g);
      // אין מהלך: התור עובר
      if (!g.demo) {
        const who = P.turn;
        const msg = S.vsCpu ? g.t(who === 1 ? 'passYou' : 'passCpu') : g.t('passP', { name: g.t(who === 1 ? 'p1' : 'p2') });
        g.msg(msg, 1500, '#ffe08a');
        g.sfx('whoosh');
        setMood(S, who, 'wow', 1.2);
      }
      P.turn = 3 - P.turn;
      S.wait = { until: S.t + (g.demo ? 0 : 1.0) };
      return;
    }
    if (isCpu(S, P.turn) && !g.demo) {
      const lv = LEVELS[g.diff];
      S.cpuHover = S.moves[Math.floor(Math.random() * S.moves.length)];
      S.think = { plan: cpuPlan(P, g.diff, Math.random), t0: S.t, minT: lv.think + Math.random() * 0.12, target: -1, tT: 0, wander: S.t + 0.18 };
    }
  }

  function humanPlace(g, sq) {
    const S = g.s;
    if (!humanTurn(g) || sq < 0 || sq > 63) return false;
    if (!S.moves.includes(sq)) {
      S.nudge = { sq, t: 0 }; S.hintFlash = 50;
      g.sfx('error');
      if (!S.P.b[sq]) g.msg(g.t('notHere'), 900, '#ffb0a0');
      return false;
    }
    doMove(g, sq);
    return true;
  }

  function doMove(g, sq) {
    const S = g.s, P = S.P, p = P.turn, L = S.L;
    const fl = flipsOf(P.b, sq, p);
    for (const f of fl) P.b[f] = p;
    P.b[sq] = p;
    P.turn = 3 - p;
    S.moves = []; S.hover = -1; S.hoverFlips = [];
    const r0 = sq >> 3, c0 = sq & 7;
    let maxRing = 0;
    const flips = fl.map(f => { const ring = Math.max(Math.abs((f >> 3) - r0), Math.abs((f & 7) - c0)); if (ring > maxRing) maxRing = ring; return { sq: f, d: 0.12 + (ring - 1) * WAVE, sounded: false }; });
    S.anim = { sq, p, t0: S.t, flips, end: 0.12 + (maxRing - 1) * WAVE + FLIP + 0.04 };
    S.last = sq;
    g.sfx('place', { p: 0.9 + Math.random() * 0.15 });
    const x = cx(L, sq), y = cy(L, sq);
    g.burst(x, y, { n: 8, color: [SKIN[p].light, '#ffffff'], speed: 2, life: 22, size: 4 });
    if (sq === 0 || sq === 7 || sq === 56 || sq === 63) {
      g.float(x, y - L.CS * 0.6, g.t('corner'), { color: '#ffe08a', size: L.port ? 30 : 26 });
      g.burst(x, y, { n: 26, color: ['#ffe08a', '#ffffff', '#ffd34d'], speed: 4.2, life: 40, size: 5 });
      g.sfx('power');
      setMood(S, p, 'happy', 1.2); setMood(S, 3 - p, 'wow', 1.2);
    } else if (fl.length >= 5) {
      g.float(x, y - L.CS * 0.55, '+' + fl.length, { color: '#ffe08a', size: L.port ? 30 : 26 });
      setMood(S, p, 'happy', 1); setMood(S, 3 - p, 'wow', 1);
    }
  }

  function stepAnim(g) {
    const S = g.s, a = S.anim, L = S.L;
    if (!a) return;
    const e = S.t - a.t0;
    let i = 0;
    for (const f of a.flips) {
      if (!f.sounded && e >= f.d + FLIP / 2) {
        f.sounded = true;
        g.tone({ f: 520 + i * 45, dur: 0.045, type: 'triangle', vol: 0.07 });
        g.burst(cx(L, f.sq), cy(L, f.sq), { n: 4, color: [SKIN[a.p].light, SKIN[a.p].mid], speed: 1.6, life: 18, size: 3 });
      }
      i++;
    }
    if (e >= a.end) { S.anim = null; beginTurn(g); }
  }

  function finish(g) {
    const S = g.s, P = S.P;
    S.over = true;
    const [x, y] = count(P.b);
    const w = x > y ? 1 : y > x ? 2 : 0;
    S.result = { w, x, y, t0: S.t };
    if (g.demo) return;
    const L = S.L;
    if (w) {
      const tk = tallyKey(g), tl = S.keep.tally[tk] = S.keep.tally[tk] || [0, 0];
      tl[w - 1]++;
      for (let sq = 0; sq < 64; sq += 3) if (P.b[sq] === w) g.burst(cx(L, sq), cy(L, sq), { n: 5, color: [SKIN[w].light, '#ffe08a', '#ffffff'], speed: 2.6, life: 36, size: 4 });
      if (!S.vsCpu || w === 1) for (let i = 0; i < 5; i++) g.burst(L.ix + L.CS * 8 * (0.1 + 0.2 * i), L.iy - 6, { n: 20, color: ['#ff4d6d', '#ffd84d', '#5ef0ff', '#7cff8a', '#ffffff', '#b38cff'], speed: 6.5, life: 95, size: 7, gravity: 0.16, spread: Math.PI * 0.8, dir: -Math.PI / 2, shape: 'square', drag: 0.985 });
      g.flash('#ffffff', 0.14); g.shake(4);
    }
    hud(g);
    const txt = S.vsCpu ? g.t('endYou', { a: x, b: y }) : g.t('end2p', { a: x, b: y });
    let o;
    if (S.vsCpu) {
      if (w === 1) { const b = g.getBest(); g.sfx(b !== null && x > b ? 'record' : 'win'); o = { result: 'win', score: x, scoreLabel: g.t('discs'), text: txt }; }
      else if (w === 2) { g.sfx('lose'); o = { result: 'lose', score: null, text: txt + ' ' + g.t('tip' + (1 + Math.floor(Math.random() * 3))) }; }
      else { g.sfx('score'); o = { result: 'draw', score: null, text: txt }; }
    } else if (w) { g.sfx('win'); o = { winner: g.t(w === 1 ? 'p1' : 'p2'), score: null, text: txt }; }
    else { g.sfx('score'); o = { result: 'draw', score: null, text: txt }; }
    S.pendingEnd = { o: Object.assign({ sound: 'none', delay: 350 }, o), at: S.t + 1.2 };
  }

  function stepCpu(g) {
    const S = g.s, th = S.think;
    if (!th) return;
    if (!th.plan.done && now() - (S.sliceEnd || 0) > 5) { th.plan.run(8); S.sliceEnd = now(); }   // פרוסה אחת לכל פריים מצויר
    if (th.target < 0) {
      if (S.t >= th.wander && S.moves.length > 1) {
        th.wander = S.t + 0.22 + Math.random() * 0.18;
        const o = S.moves.filter(m => m !== S.cpuHover);
        S.cpuHover = o[Math.floor(Math.random() * o.length)];
        g.sfx('tick', { p: 0.7 });
      }
      if (th.plan.done && S.t - th.t0 >= th.minT) {
        let m = th.plan.best;
        if (!S.moves.includes(m)) m = S.moves[0];
        th.target = m; th.tT = S.t; S.cpuHover = m;
      }
    } else if (S.t - th.tT > 0.16) {
      S.think = null;
      doMove(g, th.target);
    }
  }

  function setHover(g, sq) {
    const S = g.s;
    if (sq === S.hover) return;
    S.hover = sq;
    S.hoverFlips = sq >= 0 && humanTurn(g) && S.moves.includes(sq) ? flipsOf(S.P.b, sq, S.P.turn) : [];
    if (S.hoverFlips.length) g.tone({ f: 1300, dur: 0.02, vol: 0.025, type: 'sine' });
  }

  // ---------- כרטיסים ושורת מצב ----------
  function moodOf(S, p) {
    if (S.result) return S.result.w === p ? 'happy' : S.result.w ? 'sad' : 'idle';
    if (S.moodUntil[p] > S.t) return S.mood[p];
    if (S.think && isCpu(S, p)) return 'think';
    return 'idle';
  }
  function drawCard(g, ctx, S, p, t, look, n) {
    const L = S.L, k = L.cards[(p === 1) !== g.rtl ? 0 : 1], sk = SKIN[p];
    const active = !S.over && !g.demo && S.P.turn === p;
    const pulse = active ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    ctx.save();
    if (active) { ctx.shadowColor = sk.glow; ctx.shadowBlur = 12 + pulse * 14; }
    g.rr(ctx, k.x, k.y, k.w, k.h, 22);
    const bg = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
    bg.addColorStop(0, active ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.09)'); bg.addColorStop(1, active ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)');
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    g.rr(ctx, k.x, k.y, k.w, k.h, 22);
    ctx.lineWidth = active ? 3 : 1.5; ctx.strokeStyle = active ? sk.glow : 'rgba(255,255,255,.14)'; ctx.stroke();
    const port = L.port;
    const ax = port ? (g.rtl ? k.x + k.w - 74 : k.x + 74) : k.x + k.w / 2, ay = port ? k.y + k.h / 2 + 4 : k.y + 100, aR = port ? 50 : 58;
    const bob = active ? Math.sin(t * 4) * 3 : 0;
    let lx = look.x - ax, ly = look.y - ay;
    const ll = Math.hypot(lx, ly) || 1;
    lx /= ll; ly /= ll;
    const mood = moodOf(S, p), blink = S.blink[p] > 0;
    if (isCpu(S, p)) drawRobot(ctx, ax, ay + bob, aR * 0.92, mood, lx, ly, blink, t);
    else drawBuddy(ctx, ax, ay + bob, aR, p, mood, lx, ly, blink);
    const tx = port ? (g.rtl ? k.x + (k.w - 148) / 2 : k.x + 148 + (k.w - 148) / 2) : k.x + k.w / 2;
    const name = S.vsCpu ? g.t(p === 1 ? 'you' : 'cpu') : g.t(p === 1 ? 'p1' : 'p2');
    g.text(ctx, name, tx, port ? k.y + 46 : k.y + 196, { size: port ? 27 : 26, weight: 900, color: '#fff', maxW: port ? k.w - 160 : k.w - 20, shadow: true });
    // כמה דיסקיות יש לשחקן — מספר גדול עם דיסקית קטנה
    const wy = port ? k.y + 104 : k.y + 262, num = String(n);
    const sz = port ? 40 : 46;
    ctx.save(); ctx.font = '900 ' + sz + 'px Heebo, Arial, sans-serif'; const nw = ctx.measureText(num).width; ctx.restore();
    const gw = 30 + 12 + nw, dx = tx - gw / 2 + 15;
    ctx.save(); paintDisc(ctx, dx, wy - 2, 14, p); ctx.restore();
    const pop = S.anim && S.anim.p === p ? 1 + 0.12 * Math.max(0, 1 - (S.t - S.anim.t0) / 0.3) : 1;
    ctx.save(); ctx.translate(tx - gw / 2 + 42 + nw / 2, wy); ctx.scale(pop, pop);
    g.text(ctx, num, 0, 2, { size: sz, weight: 900, color: p === 1 ? '#dfe6f5' : '#ffffff', dir: 'ltr', shadow: true });
    ctx.restore();
    if (!port) g.text(ctx, g.t('discs'), k.x + k.w / 2, k.y + k.h - 26, { size: 16, weight: 700, color: 'rgba(255,255,255,.6)', maxW: k.w - 20 });
  }
  function drawPill(g, ctx, S, t) {
    const L = S.L, P = S.P, pl = L.pill;
    let txt, p = P.turn, alpha = 1;
    if (S.result) {
      p = S.result.w;
      if (!p) txt = g.t('draw');
      else txt = S.vsCpu ? g.t(p === 1 ? 'youWin' : 'cpuWins') : g.t('wins', { name: g.t(p === 1 ? 'p1' : 'p2') });
    } else if (S.vsCpu) { txt = P.turn === 1 ? g.t('yourTurn') : g.t('thinking'); if (P.turn === 2) alpha = 0.65 + 0.35 * Math.sin(t * 6); }
    else txt = g.t('turnOf', { name: g.t(P.turn === 1 ? 'p1' : 'p2') });
    const size = pl.size;
    ctx.save(); ctx.font = '900 ' + size + 'px Heebo, Arial, sans-serif';
    const tw = Math.min(ctx.measureText(txt).width, pl.max - (p ? 96 : 50));
    ctx.restore();
    const D = pl.h * 0.6, w = tw + (p ? D + 64 : 50), x0 = pl.x - w / 2, y0 = pl.y - pl.h / 2;
    g.rr(ctx, x0, y0, w, pl.h, pl.h / 2);
    ctx.fillStyle = 'rgba(4,20,14,.6)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = p ? SKIN[p].glow : 'rgba(255,255,255,.3)'; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    if (p) {
      const ix = g.rtl ? x0 + w - 22 - D / 2 : x0 + 22 + D / 2;
      paintDisc(ctx, ix, pl.y - 1, D / 2, p);
      g.text(ctx, txt, g.rtl ? ix - D / 2 - 14 : ix + D / 2 + 14, pl.y + 1, { size, weight: 900, color: '#fff', align: g.rtl ? 'right' : 'left', maxW: tw, alpha });
    } else g.text(ctx, txt, pl.x, pl.y + 1, { size, weight: 900, color: '#fff', maxW: tw });
  }

  // ---------- הרשמה ----------
  GK.register('reversi', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#0c2a20', accent: '#7cf2b0',
    modes: ['cpu', '2p'],
    diffs: true, diffDefault: 0, diffModes: ['cpu'],
    text: TEXT,

    setup(g) { g.s = { keep: { tally: {} } }; },

    init(g) {
      const keep = (g.s && g.s.keep) || { tally: {} };
      const L = layout(g.W, g.H), vsCpu = g.mode !== '2p';
      const S = g.s = {
        keep, L, vsCpu, P: newPos(), t: 0, moves: [], hover: -1, hoverFlips: [], cursor: 19, kbd: false, anim: null, think: null, wait: null,
        over: false, result: null, last: -1, nudge: null, hintFlash: 0, press: null, cpuHover: -1, pendingEnd: null,
        mood: [0, 'idle', 'idle'], moodUntil: [0, 0, 0], blink: [0, 0, 0], botT: 0,
      };
      if (g.demo) {
        // משחק באמצע, מאחורי התפריט
        const rnd = g.seeded(8);
        for (let i = 0; i < 14; i++) {
          const ms = movesOf(S.P.b, S.P.turn);
          if (!ms.length) break;
          const sq = ms[Math.floor(rnd() * ms.length)];
          for (const f of flipsOf(S.P.b, sq, S.P.turn)) S.P.b[f] = S.P.turn;
          S.P.b[sq] = S.P.turn; S.P.turn = 3 - S.P.turn; S.last = sq;
        }
      }
      beginTurn(g);
    },

    step(g) {
      const S = g.s;
      S.t += 1 / 60;
      if (S.pendingEnd && S.t >= S.pendingEnd.at) { const o = S.pendingEnd.o; S.pendingEnd = null; g.end(o); return; }
      if (S.wait && S.t >= S.wait.until) { S.wait = null; beginTurn(g); }
      stepAnim(g);
      if (g.state === 'play') stepCpu(g);
      if (S.nudge && ++S.nudge.t > 18) S.nudge = null;
      if (S.hintFlash > 0) S.hintFlash--;
      for (const p of [1, 2]) { if (S.blink[p] > 0) S.blink[p]--; else if (Math.random() < 0.006) S.blink[p] = 8; }
      if (g.state === 'play') hud(g);
    },

    idle(g) {
      const S = g.s;
      if (!S || !S.L) return;
      S.t += 1 / 60;
      for (const p of [1, 2]) { if (S.blink[p] > 0) S.blink[p]--; else if (Math.random() < 0.006) S.blink[p] = 8; }
    },

    // בוט לבדיקות (GK.bot): משחק בתור האדם דרך אותה פונקציה שהלחיצה משתמשת בה
    bot(g) {
      const S = g.s;
      if (!humanTurn(g)) { S.botT = 0; return; }
      if (++S.botT < 14) return;
      S.botT = 0;
      const sq = botPick(S.P, Math.random);
      setHover(g, sq);
      humanPlace(g, sq);
    },

    onKey(g, e) {
      const S = g.s, c = e.code;
      const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], KeyA: [0, -1], KeyD: [0, 1], KeyW: [-1, 0], KeyS: [1, 0] }[c];
      if (mv) {
        if (!S.kbd) { S.kbd = true; if (S.moves.length && !S.moves.includes(S.cursor)) S.cursor = S.moves[0]; }
        else S.cursor = Math.max(0, Math.min(7, (S.cursor >> 3) + mv[0])) * 8 + Math.max(0, Math.min(7, (S.cursor & 7) + mv[1]));
        setHover(g, S.cursor);
        g.sfx('tick');
        return;
      }
      if (e.repeat) return;
      if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter') { S.kbd = true; humanPlace(g, S.cursor); }
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S || !S.L) return;
      const L = S.L, c = Math.floor((p.x - L.ix) / L.CS), r = Math.floor((p.y - L.iy) / L.CS);
      const sq = c >= 0 && c < 8 && r >= 0 && r < 8 ? r * 8 + c : -1;
      if (type === 'move') {
        if (sq >= 0) { S.kbd = false; S.cursor = sq; }
        setHover(g, sq);
        g.canvas.style.cursor = sq >= 0 && humanTurn(g) && S.moves.includes(sq) ? 'pointer' : 'default';
      } else if (type === 'down') {
        S.press = { id: p.id, sq };
        if (sq >= 0) { S.kbd = false; S.cursor = sq; }
        setHover(g, sq);
      } else if (type === 'up') {
        if (!S.press || S.press.id !== p.id) return;
        const st = S.press.sq;
        S.press = null;
        if (sq >= 0 && sq === st) humanPlace(g, sq);
        if (p.kind === 'touch') setHover(g, -1);
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S || !S.L) return;
      const L = S.L, P = S.P, t = S.t + alpha / 60, C = sprites(ctx, L);
      drawBg(ctx, g.W, g.H, t);
      const [nx, ny] = count(P.b);
      const look = S.anim ? { x: cx(L, S.anim.sq), y: cy(L, S.anim.sq) } : S.think && S.cpuHover >= 0 ? { x: cx(L, S.cpuHover), y: cy(L, S.cpuHover) } : S.hover >= 0 ? { x: cx(L, S.hover), y: cy(L, S.hover) } : { x: g.W / 2, y: L.iy + L.CS * 4 };
      drawCard(g, ctx, S, 1, t, look, nx);
      drawCard(g, ctx, S, 2, t, look, ny);
      ctx.drawImage(C.board, L.bx - C.m, L.by - C.m, C.bs, C.bs);
      const human = humanTurn(g);
      // רמזים: איפה מותר להניח (נקודות שפועמות)
      if ((human || (g.demo && !S.over)) && S.moves.length) {
        const k = S.hintFlash > 0 ? 1 : 0.55 + 0.25 * Math.sin(t * 4);
        for (const m of S.moves) {
          if (m === S.hover) continue;
          ctx.globalAlpha = k * 0.75;
          ctx.beginPath(); ctx.arc(cx(L, m), cy(L, m), L.CS * (S.hintFlash > 0 ? 0.19 : 0.15), 0, TAU);
          ctx.fillStyle = P.turn === 1 ? 'rgba(10,12,16,.9)' : 'rgba(255,255,255,.95)'; ctx.fill();
          ctx.globalAlpha = k * 0.9; ctx.lineWidth = 2; ctx.strokeStyle = P.turn === 1 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)'; ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // המשבצת של המקלדת
      if (human && S.kbd) {
        ctx.strokeStyle = 'rgba(255,236,150,' + (0.7 + 0.25 * Math.sin(t * 6)).toFixed(3) + ')'; ctx.lineWidth = 4;
        ctx.strokeRect(L.ix + (S.cursor & 7) * L.CS + 3, L.iy + (S.cursor >> 3) * L.CS + 3, L.CS - 6, L.CS - 6);
      }
      // הדיסקיות (עם היפוך בגל ודיסקית חדשה שנוחתת)
      const a = S.anim, ae = a ? t - a.t0 : 0;
      const fmap = a ? new Map(a.flips.map(f => [f.sq, f])) : null;
      const winGlow = S.result && S.result.w && t > S.result.t0 + 0.15 ? Math.min(1, (t - S.result.t0 - 0.15) / 0.4) : 0;
      for (let sq = 0; sq < 64; sq++) {
        const v = P.b[sq];
        if (!v) continue;
        let x = cx(L, sq), y = cy(L, sq);
        if (S.nudge && S.nudge.sq === sq) x += Math.sin(S.nudge.t * 1.4) * 5 * (1 - S.nudge.t / 18);
        if (a && sq === a.sq) {
          const k = Math.min(1, ae / 0.16);
          drawDiscAt(ctx, C, L, v, x, y, 1, (1 - k) * L.CS * 0.35, 1 + (1 - g.ease.out(k)) * 0.35);
          continue;
        }
        const f = fmap && fmap.get(sq);
        if (f) {
          const k = Math.max(0, Math.min(1, (ae - f.d) / FLIP));
          const col = k < 0.5 ? 3 - v : v;
          drawDiscAt(ctx, C, L, col, x, y, Math.abs(Math.cos(Math.PI * k)), Math.sin(Math.PI * k) * L.CS * 0.2, 1);
          continue;
        }
        if (winGlow && v === S.result.w) {
          ctx.save(); ctx.shadowColor = S.result.w === 1 ? '#8fb6ff' : '#fff6c8'; ctx.shadowBlur = 18 * winGlow;
          drawDiscAt(ctx, C, L, v, x, y, 1, Math.sin(t * 6 + sq * 0.4) * 2 * winGlow, 1 + 0.04 * winGlow);
          ctx.restore();
          continue;
        }
        drawDiscAt(ctx, C, L, v, x, y, 1, 0, 1);
      }
      if (S.result && t > S.result.t0 + 0.15) {
        // הצד המפסיד מחשיך קצת
        const k = Math.min(1, (t - S.result.t0 - 0.15) / 0.4) * 0.35;
        for (let sq = 0; sq < 64; sq++) if (P.b[sq] && P.b[sq] !== S.result.w && S.result.w) { ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(cx(L, sq), cy(L, sq), L.DR * 1.05, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // המהלך האחרון: נקודה אדומה קטנה
      if (S.last >= 0 && !a && !S.result) {
        ctx.beginPath(); ctx.arc(cx(L, S.last), cy(L, S.last), L.CS * 0.07, 0, TAU); ctx.fillStyle = '#ff5a5a'; ctx.fill();
      }
      // תצוגה מקדימה: הדיסקית החדשה שקופה, ומה יתהפך
      if (human && S.hover >= 0 && S.moves.includes(S.hover)) {
        ctx.globalAlpha = 0.55; drawDiscAt(ctx, C, L, P.turn, cx(L, S.hover), cy(L, S.hover), 1, 0, 1); ctx.globalAlpha = 1;
        for (const f of S.hoverFlips) {
          ctx.beginPath(); ctx.arc(cx(L, f), cy(L, f), L.DR * 0.42, 0, TAU);
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.turn === 1 ? 'rgba(20,24,32,.85)' : 'rgba(255,255,255,.9)'; ctx.stroke();
        }
      }
      // המחשב מתלבט: דיסקית שקופה מרחפת מעל משבצות
      if (S.think && S.cpuHover >= 0) {
        ctx.globalAlpha = 0.32 + 0.12 * Math.sin(t * 8); drawDiscAt(ctx, C, L, P.turn, cx(L, S.cpuHover), cy(L, S.cpuHover), 1, 3, 1); ctx.globalAlpha = 1;
      }
      drawPill(g, ctx, S, t);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 30, w * 0.5, h * 0.5, w * 0.72);
      bg.addColorStop(0, '#1d6b4a'); bg.addColorStop(1, '#06160f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const r = 60 + (i * 41) % 90, x = (i * 211.3) % w, y = (i * 127.7) % h;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(160,255,200,.12)'); rg.addColorStop(1, 'rgba(160,255,200,0)');
        ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const CS = 58, L = { CS, FR: 14, bw: CS * 8 + 28, DR: CS * 0.4 };
      L.bx = Math.round((w - L.bw) / 2); L.by = 40; L.ix = L.bx + 14; L.iy = L.by + 14;
      const C = { dh: L.DR * 1.15 + 2, ds: (L.DR * 1.15 + 2) * 2 };
      for (const p of [1, 2]) { const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(C.ds); paintDisc(cv.getContext('2d'), C.dh, C.dh, L.DR, p); C[p] = cv; }
      ctx.save();
      ctx.translate(w / 2, h * 0.55); ctx.rotate(-0.06); ctx.translate(-w / 2, -h * 0.55);
      paintBoard(ctx, L, L.bx, L.by);
      const B = [
        '........',
        '..2.....',
        '..21112.',
        '..22221.',
        '.1112221',
        '..1121..',
        '...1....',
        '........',
      ];
      const flipping = { 26: 0.8, 27: 0.62, 28: 0.38, 29: 0.18 };   // הגל מתקדם מהדיסקית החדשה (25) ימינה
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const ch = B[r][c];
        if (ch === '.') continue;
        const sq = r * 8 + c, v = +ch;
        const f = flipping[sq];
        if (f != null) drawDiscAt(ctx, C, L, f < 0.5 ? 2 : 1, cx(L, sq), cy(L, sq), Math.abs(Math.cos(Math.PI * f)), Math.sin(Math.PI * f) * 12, 1);
        else drawDiscAt(ctx, C, L, v, cx(L, sq), cy(L, sq), 1, 0, 1);
      }
      // הדיסקית החדשה נוחתת, עם ניצוצות
      drawDiscAt(ctx, C, L, 1, cx(L, 25), cy(L, 25), 1, 10, 1.12);
      for (const m of [11, 12, 45, 52]) { ctx.beginPath(); ctx.arc(cx(L, m), cy(L, m), CS * 0.13, 0, TAU); ctx.fillStyle = 'rgba(10,12,16,.55)'; ctx.fill(); }
      ctx.restore();
      drawBuddy(ctx, 112, 400, 84, 1, 'happy', 0.6, -0.2, false);
      drawRobot(ctx, 850, 380, 84, 'wow', -0.8, 0.1, false, 0);
      const conf = ['#ffe08a', '#ffffff', '#7cf2b0', '#9fb0d6'];
      for (let i = 0; i < 36; i++) {
        const a = i * 2.39996, r = 80 + (i * 37) % 280;
        const x = w * 0.5 + Math.cos(a) * r * 1.35, y = h * 0.42 + Math.sin(a) * r * 0.6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3); ctx.fillStyle = conf[i % conf.length]; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, -2); ctx.lineTo(6, 0); ctx.lineTo(2, 2); ctx.lineTo(0, 6); ctx.lineTo(-2, 2); ctx.lineTo(-6, 0); ctx.lineTo(-2, -2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0.65, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { beginTurn, newPos, movesOf, flipsOf, legalAt, place, count, evaluate, makeSearch, cpuPlan, botPick, LEVELS, WT, CORNERS },
  });
})();
