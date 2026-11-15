// ============================================================
//  בועות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  יורים בועה צבעונית; 3 או יותר מאותו צבע מתפוצצות, ומה שנשאר בלי חיבור לתקרה נופל.
//  קו כיוון שקופץ מהקירות, התקרה יורדת כל כמה יריות, החלפת הבועה הבאה,
//  והצבעים באים רק ממה שעוד נשאר על הלוח. 25 שלבים (הוכחו בסימולציה) ומצב אינסופי.
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  // גיאומטריה של השדה (ביחידות השדה, הראשית בפינה השמאלית העליונה של התקרה)
  const R = 20, D = 40, RH = R * Math.sqrt(3), FW = 480, FH = 608, SX = 240, SY = 560, ROWS_MAX = 13, MAXR = 18;
  const MINA = 0.14, SPEED = 16, SUB = 4, HIT = 2 * R - 6;
  const COLS = [['#ff6b81', '#e8193f', '#8f0b25'], ['#ffc06a', '#ff8c12', '#9a4800'], ['#fff17a', '#f5c60d', '#8f6f00'], ['#7cf09a', '#1fb94e', '#0b6128'], ['#7fc2ff', '#2a74f0', '#0e3787'], ['#d9a3ff', '#9a45f0', '#4e1585']];

  // ---------- לוגיקה טהורה ----------
  const isOdd = (f, r) => ((r + f.parity) & 1) === 1;
  const ncols = (f, r) => (isOdd(f, r) ? 11 : 12);
  const cxOf = (f, r, c) => R + c * D + (isOdd(f, r) ? R : 0);
  const cyOf = (f, r) => R + (r + f.drop) * RH;
  function nbrs(f, r, c) {
    const out = [[r, c - 1], [r, c + 1]];
    const o = isOdd(f, r);
    for (const dr of [-1, 1]) { if (o) out.push([r + dr, c], [r + dr, c + 1]); else out.push([r + dr, c - 1], [r + dr, c]); }
    return out.filter(([rr, cc]) => rr >= 0 && rr < MAXR && cc >= 0 && cc < ncols(f, rr));
  }
  function emptyField(ncol) { const grid = []; for (let r = 0; r < MAXR; r++) grid.push(new Int8Array(12).fill(-1)); return { grid, parity: 0, drop: 0, ncol }; }
  function colorsOn(f) { const s = new Set(); for (let r = 0; r < MAXR; r++) for (let c = 0; c < 12; c++) if (f.grid[r][c] >= 0) s.add(f.grid[r][c]); return [...s]; }
  function count(f) { let n = 0; for (let r = 0; r < MAXR; r++) for (let c = 0; c < 12; c++) if (f.grid[r][c] >= 0) n++; return n; }
  function lowest(f) { for (let r = MAXR - 1; r >= 0; r--) for (let c = 0; c < 12; c++) if (f.grid[r][c] >= 0) return r; return -1; }
  const lost = f => { const lo = lowest(f); return lo >= 0 && lo + f.drop >= ROWS_MAX; };

  // יריה: מתקדמת פריים אחד (בתתי-צעדים). מחזירה true כשהבועה נתקעת
  function flyStep(f, s) {
    for (let k = 0; k < SUB; k++) {
      s.x += s.vx / SUB; s.y += s.vy / SUB;
      if (s.x < R) { s.x = 2 * R - s.x; s.vx = -s.vx; s.bounces = (s.bounces || 0) + 1; if (s.path) s.path.push([R, s.y]); }
      if (s.x > FW - R) { s.x = 2 * (FW - R) - s.x; s.vx = -s.vx; s.bounces = (s.bounces || 0) + 1; if (s.path) s.path.push([FW - R, s.y]); }
      if (s.y <= R + f.drop * RH) { s.y = R + f.drop * RH; return true; }
      const rr = Math.round((s.y - R) / RH - f.drop);
      for (let r = Math.max(0, rr - 1); r <= Math.min(MAXR - 1, rr + 1); r++) {
        const y = cyOf(f, r);
        if (Math.abs(y - s.y) > HIT) continue;
        for (let c = 0; c < ncols(f, r); c++) {
          if (f.grid[r][c] < 0) continue;
          const dx = cxOf(f, r, c) - s.x, dy = y - s.y;
          if (dx * dx + dy * dy < HIT * HIT) return true;
        }
      }
    }
    return false;
  }
  function attached(f, r, c) { if (r === 0) return true; return nbrs(f, r, c).some(([a, b]) => f.grid[a][b] >= 0); }
  function snapCell(f, x, y) {
    const rr = Math.max(0, Math.round((y - R) / RH - f.drop));
    let best = null, bd = 1e9;
    for (let r = Math.max(0, rr - 1); r <= Math.min(MAXR - 1, rr + 1); r++) for (let c = 0; c < ncols(f, r); c++) {
      if (f.grid[r][c] >= 0 || !attached(f, r, c)) continue;
      const dx = cxOf(f, r, c) - x, dy = cyOf(f, r) - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [r, c]; }
    }
    if (best) return best;
    for (let r = 0; r < MAXR; r++) for (let c = 0; c < ncols(f, r); c++) {   // ליתר ביטחון
      if (f.grid[r][c] >= 0 || !attached(f, r, c)) continue;
      const dx = cxOf(f, r, c) - x, dy = cyOf(f, r) - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [r, c]; }
    }
    return best || [0, 0];
  }
  function aimVec(a) { return { vx: Math.cos(a) * SPEED, vy: -Math.sin(a) * SPEED }; }
  // המסלול המלא של יריה (משמש את קו הכיוון ואת הבוט)
  function trace(f, a) {
    const v = aimVec(a), s = { x: SX, y: SY, vx: v.vx, vy: v.vy, path: [[SX, SY]] };
    for (let k = 0; k < 400; k++) if (flyStep(f, s)) break;
    s.path.push([s.x, s.y]);
    return { path: s.path, x: s.x, y: s.y, cell: snapCell(f, s.x, s.y) };
  }
  // שם בועה ומחזיר מה התפוצץ ומה נפל
  function place(f, r, c, color) {
    f.grid[r][c] = color;
    const res = { popped: [], dropped: [], r, c };
    const seen = new Set([r * 16 + c]), q = [[r, c, 0]], group = [];
    while (q.length) {
      const [a, b, d] = q.shift(); group.push([a, b, d]);
      for (const [x, y] of nbrs(f, a, b)) { const k = x * 16 + y; if (!seen.has(k) && f.grid[x][y] === color) { seen.add(k); q.push([x, y, d + 1]); } }
    }
    if (group.length < 3) return res;
    for (const [a, b, d] of group) { res.popped.push([a, b, color, d]); f.grid[a][b] = -1; }
    res.dropped = dropFloating(f);
    return res;
  }
  // מוריד כל בועה שלא מחוברת (דרך שכנות) לשורה העליונה
  function dropFloating(f) {
    const keep = new Set(), st = [], out = [];
    for (let cc = 0; cc < ncols(f, 0); cc++) if (f.grid[0][cc] >= 0) { keep.add(cc); st.push([0, cc]); }
    while (st.length) { const [a, b] = st.pop(); for (const [x, y] of nbrs(f, a, b)) { const k = x * 16 + y; if (!keep.has(k) && f.grid[x][y] >= 0) { keep.add(k); st.push([x, y]); } } }
    for (let a = 0; a < MAXR; a++) for (let b = 0; b < ncols(f, a); b++) if (f.grid[a][b] >= 0 && !keep.has(a * 16 + b)) { out.push([a, b, f.grid[a][b]]); f.grid[a][b] = -1; }
    return out;
  }
  function pushRow(f, rnd, ncol) {   // מצב אינסופי: שורה חדשה מלמעלה
    f.grid.pop();
    f.parity ^= 1;
    const row = new Int8Array(12).fill(-1);
    f.grid.unshift(row);
    for (let c = 0; c < ncols(f, 0); c++) row[c] = Math.floor(rnd() * ncol);
  }
  const scoreOf = res => res.popped.length * 10 + Math.round(res.dropped.length * 20 * (1 + res.dropped.length / 4));

  // ---------- 25 השלבים (סימולציה כיילה את מספר היריות לירידת התקרה ואת הכוכבים) ----------
  // pat: הצורה · maxg: הגוש הכי גדול מאותו צבע · drop: כל כמה יריות התקרה יורדת · par: [יריות ל-3 כוכבים, ל-2 כוכבים]
  // הוכח בסימולציה (tests/bubbles/calib2.mjs): בוט מכוון מנצח כל שלב (1–8: 6/6, אחר כך 4–5 מתוך 6), ושלבים 1–5 גם בכיוון לא מדויק
  const LEVELS = [
    { rows: 3, ncol: 3, pat: 'full', maxg: 5, drop: 10, par: [21, 29] }, { rows: 4, ncol: 3, pat: 'pyramid', maxg: 4, drop: 10, par: [25, 35] },
    { rows: 4, ncol: 3, pat: 'heart', maxg: 4, drop: 10, par: [20, 26] }, { rows: 6, ncol: 3, pat: 'columns', maxg: 3, drop: 9, par: [14, 19] },
    { rows: 6, ncol: 4, pat: 'full', maxg: 4, drop: 9, par: [32, 41] }, { rows: 6, ncol: 4, pat: 'diamond', maxg: 3, drop: 9, par: [34, 51] },
    { rows: 6, ncol: 4, pat: 'flower', maxg: 3, drop: 9, par: [30, 38] }, { rows: 7, ncol: 4, pat: 'holes', maxg: 3, drop: 8, par: [44, 61] },
    { rows: 7, ncol: 4, pat: 'zigzag', maxg: 3, drop: 8, par: [31, 39] }, { rows: 7, ncol: 4, pat: 'pyramid', maxg: 2, drop: 8, par: [39, 53] },
    { rows: 7, ncol: 5, pat: 'full', maxg: 3, drop: 8, par: [48, 68] }, { rows: 8, ncol: 5, pat: 'heart', maxg: 3, drop: 8, par: [63, 80] },
    { rows: 8, ncol: 5, pat: 'columns', maxg: 3, drop: 8, par: [17, 24] }, { rows: 8, ncol: 5, pat: 'diamond', maxg: 2, drop: 7, par: [58, 78] },
    { rows: 8, ncol: 5, pat: 'flower', maxg: 3, drop: 7, par: [50, 59] }, { rows: 8, ncol: 5, pat: 'holes', maxg: 3, drop: 8, par: [61, 86] },
    { rows: 8, ncol: 5, pat: 'zigzag', maxg: 3, drop: 8, par: [58, 75] }, { rows: 8, ncol: 5, pat: 'full', maxg: 3, drop: 8, par: [45, 63] },
    { rows: 9, ncol: 6, pat: 'pyramid', maxg: 3, drop: 7, par: [46, 64] }, { rows: 9, ncol: 6, pat: 'heart', maxg: 3, drop: 7, par: [62, 99] },
    { rows: 9, ncol: 6, pat: 'columns', maxg: 2, drop: 7, par: [33, 43] }, { rows: 9, ncol: 6, pat: 'flower', maxg: 3, drop: 8, par: [64, 81] },
    { rows: 9, ncol: 6, pat: 'holes', maxg: 3, drop: 11, par: [77, 108] }, { rows: 9, ncol: 6, pat: 'diamond', maxg: 3, drop: 9, par: [78, 104] },
    { rows: 9, ncol: 6, pat: 'full', maxg: 3, drop: 9, par: [77, 95] },
  ];
  function seededRnd(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // צורת השלב: אילו תאים מלאים. mid = מרחק מהאמצע (בעמודות), rows = מספר השורות
  function shapeHas(pat, r, c, f, rows) {
    const mid = Math.abs(c + (isOdd(f, r) ? 0.5 : 0) - 5.5), y = r - (rows - 1) / 2;
    switch (pat) {
      case 'pyramid': return mid <= 6.2 - r * 0.55;
      case 'diamond': return mid + Math.abs(y) * 1.05 <= 6.4;
      case 'heart': { const top = r < rows * 0.35; return top ? !(mid < 1 && r > 0) && mid < 6 : mid <= 6.2 - (r - rows * 0.35) * 1.15; }
      case 'flower': { const d = Math.hypot(mid, y * 1.25); return d <= 4.4 || (d <= 6.3 && Math.round(Math.atan2(y, mid) * 3) % 2 === 0); }
      case 'columns': return r === 0 || (mid > 1.2 && mid < 2.6) || mid > 4.4;
      case 'holes': return !((r % 3 === 1) && (mid < 1 || (mid > 3 && mid < 4.2)));
      case 'zigzag': return r % 2 === 0 || mid > 1.5;
      default: return true;
    }
  }
  function groupsOf(f) {
    const seen = new Set(), out = [];
    for (let r = 0; r < MAXR; r++) for (let c = 0; c < ncols(f, r); c++) {
      const col = f.grid[r][c];
      if (col < 0 || seen.has(r * 16 + c)) continue;
      const grp = [[r, c]], st = [[r, c]];
      seen.add(r * 16 + c);
      while (st.length) { const [a, b] = st.pop(); for (const [x, y] of nbrs(f, a, b)) { const k = x * 16 + y; if (!seen.has(k) && f.grid[x][y] === col) { seen.add(k); grp.push([x, y]); st.push([x, y]); } } }
      out.push(grp);
    }
    return out;
  }
  // צבעים סימטריים (תמונת מראה) עם גושים קטנים — maxg = הגוש הכי גדול מאותו צבע
  function buildLevel(n) {
    const L = LEVELS[n - 1], f = emptyField(L.ncol), rnd = seededRnd(1000 + n * 7919);
    const mir = (r, c) => ncols(f, r) - 1 - c;
    const pick = () => Math.floor(rnd() * L.ncol);
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < ncols(f, r); c++) {
      const m = mir(r, c);
      if (m < c) continue;
      if (r > 0 && !shapeHas(L.pat, r, c, f, L.rows)) continue;
      const v = pick();
      f.grid[r][c] = v; f.grid[r][m] = v;
    }
    const recolor = (r, c) => {
      const ban = new Set(nbrs(f, r, c).map(([x, y]) => f.grid[x][y]));
      const m = mir(r, c);
      for (const [x, y] of nbrs(f, r, m)) ban.add(f.grid[x][y]);
      const opts = []; for (let k = 0; k < L.ncol; k++) if (!ban.has(k)) opts.push(k);
      const v = opts.length ? opts[Math.floor(rnd() * opts.length)] : pick();
      f.grid[r][c] = v; f.grid[r][m] = v;
    };
    for (let it = 0; it < 400; it++) {
      const big = groupsOf(f).filter(g2 => g2.length > L.maxg);
      if (!big.length) break;
      for (const g2 of big) { const [r, c] = g2[Math.floor(rnd() * g2.length)]; recolor(r, c); }
    }
    // כל הצבעים של השלב מופיעים
    for (let k = 0; k < L.ncol; k++) if (!colorsOn(f).includes(k)) {
      for (let tries = 0; tries < 50; tries++) { const r = Math.floor(rnd() * L.rows), c = Math.floor(rnd() * ncols(f, r)); if (f.grid[r][c] >= 0) { f.grid[r][c] = k; f.grid[r][mir(r, c)] = k; break; } }
    }
    dropFloating(f);
    return f;
  }
  function pickColor(f, rnd) { const cs = colorsOn(f); return cs.length ? cs[Math.floor(rnd() * cs.length)] : 0; }

  // ---------- בוט: בודק זוויות, בוחר את המהלך הכי טוב (גם החלפה) ----------
  function evalCell(f, r, c, color) {
    const g2 = { grid: f.grid.map(x => Int8Array.from(x)), parity: f.parity, drop: f.drop, ncol: f.ncol };
    const res = place(g2, r, c, color);
    let v = res.popped.length * 10 + res.dropped.length * 14;
    if (!res.popped.length) {
      let same = 0; for (const [x, y] of nbrs(g2, r, c)) if (g2.grid[x][y] === color) same++;
      v = same * 3 - (r + f.drop) * 0.8;
      if (r + f.drop >= ROWS_MAX - 1) v -= 50;
    } else v += 20;
    return v;
  }
  // sloppy: שחקן פחות מדויק (ילד) — סטייה בזווית, ולפעמים לא המהלך הכי טוב
  function botChoice(f, cur, next, sloppy, rnd) {
    const cells = new Map();
    for (let k = 0; k <= 60; k++) {
      const a = MINA + (Math.PI - 2 * MINA) * k / 60, t = trace(f, a), key = t.cell[0] * 16 + t.cell[1];
      const o = cells.get(key);
      if (o) o.as.push(a); else cells.set(key, { r: t.cell[0], c: t.cell[1], as: [a] });
    }
    const opts = [];
    for (const o of cells.values()) {
      const a = o.as[o.as.length >> 1];   // החציון של הזוויות שבאמת מגיעות לאותו תא
      opts.push({ v: evalCell(f, o.r, o.c, cur), a, swap: false });
      if (next !== cur && next >= 0) opts.push({ v: evalCell(f, o.r, o.c, next) - 0.5, a, swap: true });
    }
    opts.sort((x, y) => y.v - x.v);
    if (!sloppy) return opts[0] || { v: 0, a: Math.PI / 2, swap: false };
    const pick = opts[Math.min(opts.length - 1, Math.floor(rnd() * rnd() * 3))];
    const g = (rnd() + rnd() + rnd() - 1.5) * 0.06;   // בערך ±3 מעלות
    return { v: pick.v, a: Math.max(MINA, Math.min(Math.PI - MINA, pick.a + g)), swap: pick.swap };
  }
  // סימולציה של שלב שלם (בלי ציור) — להוכחה שכל שלב פתיר
  function simulate(n, rnd, opt) {
    const L = LEVELS[n - 1], f = buildLevel(n);
    const dropEvery = (opt && opt.drop) || L.drop, sloppy = !!(opt && opt.sloppy);
    let cur = pickColor(f, rnd), next = pickColor(f, rnd), shots = 0, until = dropEvery;
    while (shots < 300) {
      const ch = botChoice(f, cur, next, sloppy, rnd);
      if (ch.swap) { const t = cur; cur = next; next = t; }
      const tr = trace(f, ch.a);
      place(f, tr.cell[0], tr.cell[1], cur);
      shots++;
      if (!count(f)) return { won: true, shots };
      if (lost(f)) return { won: false, shots };
      if (--until <= 0) { f.drop++; until = dropEvery; if (lost(f)) return { won: false, shots }; }
      const cs = colorsOn(f);
      cur = cs.includes(next) ? next : pickColor(f, rnd);
      next = pickColor(f, rnd);
    }
    return { won: false, shots };
  }

  // ---------- טקסטים ----------
  const TXT = {
    he: { title: 'בועות', help: ['כוון ולחץ כדי לירות · X מחליף בועה', '3 מאותו צבע מתפוצצות. אל תיתן לבועות לחצות את הקו!'], helpTouch: ['גרור כדי לכוון ושחרר כדי לירות · הקש על הבועה הבאה להחלפה', '3 מאותו צבע מתפוצצות. אל תיתן לבועות לחצות את הקו!'], modeLevels: 'שלבים', modeEndless: 'אינסופי', shots: 'יריות', ceiling: 'התקרה יורדת בעוד', swap: 'החלף', clearAll: 'פוצץ את כל הבועות!', endlessGo: 'כמה זמן תחזיק מעמד?', shotsText: 'פוצצת הכול ב-{n} יריות', lostText: 'הבועות הגיעו לקו', newRow: 'שורה חדשה!' },
    en: { title: 'Bubbles', help: ['Aim and click to shoot · X swaps the bubble', 'Pop 3 of a colour. Keep the bubbles above the line!'], helpTouch: ['Drag to aim, let go to shoot · tap the next bubble to swap', 'Pop 3 of a colour. Keep the bubbles above the line!'], modeLevels: 'Levels', modeEndless: 'Endless', shots: 'Shots', ceiling: 'Ceiling drops in', swap: 'Swap', clearAll: 'Pop all the bubbles!', endlessGo: 'How long can you last?', shotsText: 'Cleared in {n} shots', lostText: 'The bubbles reached the line', newRow: 'New row!' },
    ar: { title: 'الفقاعات', help: ['صوّب وانقر للإطلاق · X يبدّل الفقاعة', 'فجّر 3 من لون واحد. أبقِ الفقاعات فوق الخط!'], helpTouch: ['اسحب للتصويب وارفع للإطلاق · المس الفقاعة التالية للتبديل', 'فجّر 3 من لون واحد. أبقِ الفقاعات فوق الخط!'], modeLevels: 'مراحل', modeEndless: 'بلا نهاية', shots: 'الطلقات', ceiling: 'السقف ينزل بعد', swap: 'تبديل', clearAll: 'فجّر كل الفقاعات!', endlessGo: 'كم ستصمد؟', shotsText: 'نظّفت كل شيء في {n} طلقة', lostText: 'وصلت الفقاعات إلى الخط', newRow: 'صف جديد!' },
    es: { title: 'Burbujas', help: ['Apunta y haz clic para disparar · X cambia la burbuja', 'Explota 3 del mismo color. ¡No dejes que crucen la línea!'], helpTouch: ['Arrastra para apuntar y suelta para disparar · toca la siguiente para cambiar', 'Explota 3 del mismo color. ¡No dejes que crucen la línea!'], modeLevels: 'Niveles', modeEndless: 'Infinito', shots: 'Disparos', ceiling: 'El techo baja en', swap: 'Cambiar', clearAll: '¡Explota todas las burbujas!', endlessGo: '¿Cuánto aguantarás?', shotsText: 'Limpiado en {n} disparos', lostText: 'Las burbujas llegaron a la línea', newRow: '¡Nueva fila!' },
    fr: { title: 'Bulles', help: ['Vise et clique pour tirer · X échange la bulle', 'Éclate 3 bulles d’une couleur. Garde-les au-dessus de la ligne !'], helpTouch: ['Glisse pour viser, lâche pour tirer · touche la suivante pour échanger', 'Éclate 3 bulles d’une couleur. Garde-les au-dessus de la ligne !'], modeLevels: 'Niveaux', modeEndless: 'Infini', shots: 'Tirs', ceiling: 'Le plafond descend dans', swap: 'Échanger', clearAll: 'Fais éclater toutes les bulles !', endlessGo: 'Combien de temps tiendras-tu ?', shotsText: 'Tout éclaté en {n} tirs', lostText: 'Les bulles ont atteint la ligne', newRow: 'Nouvelle rangée !' },
    pt: { title: 'Bolhas', help: ['Mire e clique para atirar · X troca a bolha', 'Estoure 3 da mesma cor. Não deixe passar da linha!'], helpTouch: ['Arraste para mirar e solte para atirar · toque na próxima para trocar', 'Estoure 3 da mesma cor. Não deixe passar da linha!'], modeLevels: 'Fases', modeEndless: 'Infinito', shots: 'Tiros', ceiling: 'O teto desce em', swap: 'Trocar', clearAll: 'Estoure todas as bolhas!', endlessGo: 'Quanto tempo você aguenta?', shotsText: 'Limpou tudo em {n} tiros', lostText: 'As bolhas chegaram à linha', newRow: 'Nova fileira!' },
    ru: { title: 'Пузыри', help: ['Целься и кликай для выстрела · X — поменять', 'Лопай 3 одного цвета. Не пускай пузыри за линию!'], helpTouch: ['Веди пальцем и отпусти для выстрела · коснись следующего, чтобы поменять', 'Лопай 3 одного цвета. Не пускай пузыри за линию!'], modeLevels: 'Уровни', modeEndless: 'Бесконечно', shots: 'Выстрелы', ceiling: 'Потолок опустится через', swap: 'Поменять', clearAll: 'Лопни все пузыри!', endlessGo: 'Сколько продержишься?', shotsText: 'Всё лопнуло за {n} выстрелов', lostText: 'Пузыри дошли до линии', newRow: 'Новый ряд!' },
    de: { title: 'Blasen', help: ['Zielen und klicken zum Schießen · X tauscht', 'Lass 3 gleiche platzen. Halte die Blasen über der Linie!'], helpTouch: ['Ziehen zum Zielen, loslassen zum Schießen · nächste Blase antippen zum Tauschen', 'Lass 3 gleiche platzen. Halte die Blasen über der Linie!'], modeLevels: 'Level', modeEndless: 'Endlos', shots: 'Schüsse', ceiling: 'Decke sinkt in', swap: 'Tauschen', clearAll: 'Lass alle Blasen platzen!', endlessGo: 'Wie lange hältst du durch?', shotsText: 'Alles weg in {n} Schüssen', lostText: 'Die Blasen haben die Linie erreicht', newRow: 'Neue Reihe!' },
  };

  // ---------- פריסה ----------
  function layout(W, H) {
    if (H > W) return { port: true, F: { x: 60, y: 196 }, info: { x: 20, y: 16, w: 560, h: 160 } };
    return { port: false, F: { x: 240, y: 16 }, left: { x: 20, y: 16, w: 200, h: 608 }, right: { x: 740, y: 16, w: 200, h: 608 } };
  }
  const nextPos = () => ({ x: SX - 92, y: SY + 18 });

  function newState(g) {
    const endless = g.mode === 'endless';
    const n = Math.max(1, Math.min(25, g.level || 1));
    let f;
    if (endless) {
      f = emptyField(4);
      for (let k = 0; k < 6; k++) pushRow(f, Math.random, 4);
    } else f = buildLevel(n);
    const S = {
      endless, n, f, L: layout(g.W, g.H), aim: Math.PI / 2, phase: 'aim', shot: null, cur: 0, next: 0, shots: 0,
      until: endless ? 7 : LEVELS[n - 1].drop, dropEvery: endless ? 7 : LEVELS[n - 1].drop, score: 0, popping: [], falling: [], wait: 0,
      dropAnim: 0, t: 0, botT: 0, ended: false, endT: 0, press: null, guide: null, guideA: null, shake: 0, kbAim: false, rows: 6,
    };
    S.cur = pickColor(f, Math.random); S.next = pickColor(f, Math.random);
    return S;
  }
  function boardColorsFix(S) {
    const cs = colorsOn(S.f);
    if (!cs.length) return;
    if (!cs.includes(S.cur)) S.cur = cs[Math.floor(Math.random() * cs.length)];
    if (!cs.includes(S.next)) S.next = cs[Math.floor(Math.random() * cs.length)];
  }
  function fire(g) {
    const S = g.s;
    if (S.phase !== 'aim' || S.ended) return;
    const v = aimVec(S.aim);
    S.shot = { x: SX, y: SY, vx: v.vx, vy: v.vy, color: S.cur };
    S.phase = 'fly';
    S.cur = S.next;
    S.next = pickColor(S.f, Math.random);
    S.shots++;
    g.sfx('shoot', { p: 1.1 });
  }
  function swap(g) {
    const S = g.s;
    if (S.phase !== 'aim' && S.phase !== 'fly') return;
    if (S.cur === S.next) { g.sfx('tick'); return; }
    const t = S.cur; S.cur = S.next; S.next = t; S.swapT = S.t;
    g.sfx('whoosh');
  }
  function fieldToWorld(S, x, y) { return { x: S.L.F.x + x, y: S.L.F.y + y }; }

  function land(g) {
    const S = g.s, f = S.f, sh = S.shot;
    const [r, c] = snapCell(f, sh.x, sh.y);
    const res = place(f, r, c, sh.color);
    S.shot = null;
    S.lastLand = { r, c, t: S.t };
    const gain = scoreOf(res);
    S.score += gain; g.score = S.score;
    if (res.popped.length) {
      for (const [a, b, col, d] of res.popped) S.popping.push({ x: cxOf(f, a, b), y: cyOf(f, a), col, t: -d * 3 });
      g.sfx('pop', { p: 0.9 + Math.min(0.6, res.popped.length * 0.05) });
      const p = fieldToWorld(S, cxOf(f, r, c), cyOf(f, r));
      g.float(p.x, p.y - 20, '+' + gain, { color: '#fff7b0', size: res.dropped.length ? 30 : 24 });
    } else g.sfx('place', { p: 1.3 });
    for (const [a, b, col] of res.dropped) S.falling.push({ x: cxOf(f, a, b), y: cyOf(f, a), col, vy: -1 - Math.random() * 2, vx: (Math.random() - 0.5) * 3, rot: 0 });
    if (res.dropped.length) { g.sfx('coin', { p: 1 + Math.min(0.5, res.dropped.length * 0.03) }); if (res.dropped.length >= 6) { g.shake(5); g.msg('+' + Math.round(res.dropped.length * 20 * (1 + res.dropped.length / 4)), 900, '#9fffd0'); } }
    S.phase = 'settle'; S.wait = res.popped.length ? 10 : 4;
  }
  function afterShot(g) {
    const S = g.s, f = S.f;
    if (!S.endless && !count(f)) { win(g); return; }
    if (lost(f)) { lose(g); return; }
    if (--S.until <= 0) {
      S.until = S.dropEvery;
      if (S.endless) {
        const ncol = Math.min(6, 4 + Math.floor(S.shots / 45));
        pushRow(f, Math.random, ncol); S.rows++;
        S.dropEvery = Math.max(4, 7 - Math.floor(S.shots / 60)); S.until = S.dropEvery;
        g.msg(g.t('newRow'), 700, '#9fe7ff');
      } else f.drop++;
      S.dropAnim = 14;
      g.sfx('hit', { p: 0.7 }); g.shake(6);
      if (lost(f)) { lose(g); return; }
    }
    if (S.endless && !count(f)) { for (let k = 0; k < 4; k++) pushRow(f, Math.random, Math.min(6, 4 + Math.floor(S.shots / 45))); g.msg(g.t('newRow'), 700, '#9fe7ff'); }
    boardColorsFix(S);
    S.phase = 'aim';
  }
  function win(g) {
    const S = g.s;
    S.phase = 'won'; S.endT = 0;
    g.sfx('win'); g.flash('#ffffff', 0.3);
    const L = LEVELS[S.n - 1];
    S.stars = S.shots <= L.par[0] ? 3 : S.shots <= L.par[1] ? 2 : 1;
  }
  function lose(g) {
    const S = g.s;
    S.phase = 'lost'; S.endT = 0;
    g.sfx('lose'); g.shake(10); g.flash('#ff4060', 0.3);
  }

  // ---------- ציור ----------
  function drawBubble(ctx, x, y, r, col, alpha) {
    const [c1, c2, c3] = COLS[col];
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, c1); gr.addColorStop(0.6, c2); gr.addColorStop(1, c3);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, Math.PI * 2); ctx.fill();
    // סימן לכל צבע (גם למי שמתקשה להבדיל צבעים)
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    const s = r * 0.32;
    ctx.beginPath();
    if (col === 0) { ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4); ctx.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); }
    else if (col === 1) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } }
    else if (col === 2) { ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); }
    else if (col === 3) { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); }
    else if (col === 4) { ctx.rect(x - s * 0.75, y - s * 0.75, s * 1.5, s * 1.5); }
    else { ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.95, y + s * 0.75); ctx.lineTo(x - s * 0.95, y + s * 0.75); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, g.H);
    gr.addColorStop(0, '#1b5c9e'); gr.addColorStop(1, '#0b2547');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 18; i++) {
      const r = 6 + (i % 5) * 5, x = (i * 173 + Math.sin(t * 0.01 + i) * 20) % g.W, y = g.H + 40 - ((t * (0.25 + (i % 4) * 0.12) + i * 97) % (g.H + 80));
      ctx.strokeStyle = 'rgba(200,235,255,.16)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }
  }
  function card(g, ctx, R2) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    g.rr(ctx, R2.x, R2.y, R2.w, R2.h, 18); ctx.fillStyle = 'rgba(10,36,72,.85)'; ctx.fill();
    ctx.restore();
    g.rr(ctx, R2.x + 0.5, R2.y + 0.5, R2.w - 1, R2.h - 1, 18); ctx.strokeStyle = 'rgba(160,220,255,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawInfo(g, ctx) {
    const S = g.s, L = S.L;
    const items = [];
    const title = S.endless ? g.t('modeEndless') : g.t('level') + ' ' + S.n;
    const best = g.getBest();
    if (L.port) {
      const I = L.info;
      card(g, ctx, I);
      g.text(ctx, title, I.x + I.w / 2, I.y + 26, { size: 24, weight: 900, color: '#bfe8ff', maxW: I.w - 20 });
      const cols3 = [I.x + I.w / 6, I.x + I.w / 2, I.x + I.w * 5 / 6];
      const lab = [S.endless ? g.t('score') : g.t('shots'), g.t('ceiling'), S.endless ? g.t('best') : '★'];
      const val = [S.endless ? S.score : S.shots, S.until, S.endless ? (best === null ? '—' : Math.max(best, S.score)) : null];
      for (let k = 0; k < 3; k++) {
        g.text(ctx, lab[k], cols3[k], I.y + 64, { size: 16, weight: 700, color: '#9fd0f5', maxW: I.w / 3 - 12 });
        if (k === 2 && !S.endless) drawStarsPar(g, ctx, cols3[k], I.y + 108, S);
        else if (k === 1) drawDropDots(g, ctx, cols3[k], I.y + 108, S);
        else g.text(ctx, String(val[k]), cols3[k], I.y + 108, { size: 34, weight: 900, color: '#fff' });
      }
      return;
    }
    const A = L.left, B = L.right;
    card(g, ctx, A); card(g, ctx, B);
    g.text(ctx, title, A.x + A.w / 2, A.y + 34, { size: 26, weight: 900, color: '#bfe8ff', maxW: A.w - 20 });
    g.text(ctx, S.endless ? g.t('endlessGo') : g.t('clearAll'), A.x + A.w / 2, A.y + 72, { size: 15, weight: 700, color: '#9fd0f5', maxW: A.w - 20 });
    g.text(ctx, S.endless ? g.t('score') : g.t('shots'), A.x + A.w / 2, A.y + 130, { size: 18, weight: 700, color: '#9fd0f5', maxW: A.w - 20 });
    g.text(ctx, String(S.endless ? S.score : S.shots), A.x + A.w / 2, A.y + 174, { size: 44, weight: 900, color: '#fff' });
    if (!S.endless) drawStarsPar(g, ctx, A.x + A.w / 2, A.y + 250, S);
    else { g.text(ctx, g.t('best'), A.x + A.w / 2, A.y + 240, { size: 18, weight: 700, color: '#9fd0f5' }); g.text(ctx, best === null ? '—' : String(Math.max(best, S.score)), A.x + A.w / 2, A.y + 276, { size: 30, weight: 900, color: '#ffe27a' }); }
    g.text(ctx, g.t('ceiling'), B.x + B.w / 2, B.y + 40, { size: 17, weight: 700, color: '#9fd0f5', maxW: B.w - 20 });
    g.text(ctx, String(S.until), B.x + B.w / 2, B.y + 92, { size: 52, weight: 900, color: S.until <= 1 ? '#ff8a8a' : '#fff' });
    drawDropDots(g, ctx, B.x + B.w / 2, B.y + 140, S);
    if (!S.endless) { g.text(ctx, g.t('score'), B.x + B.w / 2, B.y + 220, { size: 17, weight: 700, color: '#9fd0f5' }); g.text(ctx, String(S.score), B.x + B.w / 2, B.y + 256, { size: 30, weight: 900, color: '#ffe27a' }); }
    // רמז החלפה
    g.text(ctx, g.t('swap') + ': X', B.x + B.w / 2, B.y + B.h - 40, { size: 16, weight: 700, color: 'rgba(200,230,255,.6)', maxW: B.w - 20 });
    void items;
  }
  function drawDropDots(g, ctx, x, y, S) {
    const n = S.dropEvery, w = Math.min(18, 150 / n);
    for (let k = 0; k < n; k++) {
      const on = k < S.until;
      g.circle(ctx, x + (k - (n - 1) / 2) * w, y, w * 0.32);
      ctx.fillStyle = on ? (S.until <= 1 ? '#ff8a8a' : '#7fd0ff') : 'rgba(255,255,255,.18)'; ctx.fill();
    }
  }
  function drawStarsPar(g, ctx, x, y, S) {
    const L = LEVELS[S.n - 1], st = S.shots <= L.par[0] ? 3 : S.shots <= L.par[1] ? 2 : 1;
    for (let k = 0; k < 3; k++) g.text(ctx, '★', x + (k - 1) * 34, y, { size: 32, weight: 900, color: k < st ? '#ffd65a' : 'rgba(255,255,255,.22)' });
  }

  function drawField(g, ctx, alpha) {
    const S = g.s, f = S.f, F = S.L.F, t = S.t;
    ctx.save();
    ctx.translate(F.x, F.y);
    // זכוכית
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    g.rr(ctx, -6, -6, FW + 12, FH + 12, 18); ctx.fillStyle = 'rgba(8,30,60,.78)'; ctx.fill();
    ctx.restore();
    g.rr(ctx, -6, -6, FW + 12, FH + 12, 18); ctx.strokeStyle = 'rgba(160,220,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.rect(0, 0, FW, FH); ctx.clip();
    // הזזה רכה כשהתקרה יורדת
    const dOff = S.dropAnim > 0 ? -RH * (S.dropAnim / 14) * (S.endless ? 1 : 1) : 0;
    const warn = S.until <= 1 && S.phase === 'aim' ? Math.sin(t * 0.6) * 1.5 : 0;
    // תקרה
    const ceilY = f.drop * RH + dOff;
    const cg = ctx.createLinearGradient(0, ceilY - 60, 0, ceilY);
    cg.addColorStop(0, '#4b5d78'); cg.addColorStop(1, '#8aa0bd');
    ctx.fillStyle = cg; ctx.fillRect(0, ceilY - 400, FW, 400);
    ctx.fillStyle = '#2f3d52'; ctx.fillRect(0, ceilY - 6, FW, 6);
    for (let x = 20; x < FW; x += 60) { g.circle(ctx, x + warn, ceilY - 18, 4); ctx.fillStyle = '#c8d6e8'; ctx.fill(); }
    // קו הסכנה
    const dangerY = (ROWS_MAX - 0.5) * RH + R;
    const lo = lowest(f), close = lo >= 0 && lo + f.drop >= ROWS_MAX - 2;
    ctx.strokeStyle = close ? 'rgba(255,80,100,' + (0.6 + Math.sin(t * 0.25) * 0.3) + ')' : 'rgba(255,120,140,.35)';
    ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(0, dangerY); ctx.lineTo(FW, dangerY); ctx.stroke();
    ctx.setLineDash([]);
    // בועות
    for (let r = 0; r < MAXR; r++) for (let c = 0; c < ncols(f, r); c++) {
      const col = f.grid[r][c];
      if (col < 0) continue;
      let x = cxOf(f, r, c) + warn, y = cyOf(f, r) + dOff;
      if (S.lastLand && S.lastLand.r === r && S.lastLand.c === c && t - S.lastLand.t < 10) { const q = (t - S.lastLand.t) / 10; y += Math.sin(q * Math.PI) * 3; }
      drawBubble(ctx, x, y, R, col);
    }
    // קו כיוון
    if (S.phase === 'aim' && S.guide) {
      const pts = S.guide.path;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      let acc = 0;
      for (let k = 0; k + 1 < pts.length; k++) {
        const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], len = Math.hypot(x2 - x1, y2 - y1);
        for (let d = (14 - acc % 14) % 14; d < len; d += 14) {
          const q = d / len, x = x1 + (x2 - x1) * q, y = y1 + (y2 - y1) * q;
          const fade = Math.max(0.25, 1 - (acc + d) / 900);
          ctx.globalAlpha = fade; g.circle(ctx, x, y, 3.2); ctx.fill();
        }
        acc += len;
      }
      ctx.globalAlpha = 1;
      const [gr2, gc] = S.guide.cell;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(cxOf(f, gr2, gc), cyOf(f, gr2), R - 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // מתפוצצות ונופלות
    for (const p of S.popping) { if (p.t < 0) { drawBubble(ctx, p.x, p.y, R, p.col); continue; } const q = p.t / 12; drawBubble(ctx, p.x, p.y, R * (1 + q * 0.5), p.col, 1 - q); }
    for (const p of S.falling) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawBubble(ctx, 0, 0, R, p.col); ctx.restore(); }
    // יריה באוויר
    if (S.shot) drawBubble(ctx, S.shot.x, S.shot.y, R, S.shot.color);
    // משגר
    ctx.save();
    ctx.translate(SX, SY);
    ctx.rotate(-S.aim + Math.PI / 2);
    const lg = ctx.createLinearGradient(-14, 0, 14, 0); lg.addColorStop(0, '#9fb7d6'); lg.addColorStop(0.5, '#e8f2ff'); lg.addColorStop(1, '#7d95b5');
    ctx.fillStyle = lg; g.rr(ctx, -13, -62, 26, 50, 8); ctx.fill();
    ctx.fillStyle = '#ffd65a'; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(11, -60); ctx.lineTo(-11, -60); ctx.closePath(); ctx.fill();
    ctx.restore();
    g.circle(ctx, SX, SY + 6, 34); ctx.fillStyle = '#25466f'; ctx.fill();
    ctx.strokeStyle = '#8fc4f5'; ctx.lineWidth = 3; ctx.stroke();
    if (S.phase !== 'won' && S.phase !== 'lost') {
      const sw = S.swapT && t - S.swapT < 10 ? 1 - Math.sin((t - S.swapT) / 10 * Math.PI) * 0.3 : 1;
      drawBubble(ctx, SX, SY, R * sw, S.cur);
      const np = nextPos();
      g.circle(ctx, np.x, np.y, R * 0.95); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      drawBubble(ctx, np.x, np.y, R * 0.78 * sw, S.next);
      g.text(ctx, '⇄', np.x + 40, np.y + 2, { size: 24, weight: 900, color: 'rgba(220,240,255,.75)' });
    }
    ctx.restore();
  }

  function cellToWorldHit(S, p) { return { x: p.x - S.L.F.x, y: p.y - S.L.F.y }; }
  function aimAt(g, p) {
    const S = g.s, q = cellToWorldHit(S, p);
    let a = Math.atan2(SY - q.y, q.x - SX);
    if (q.y > SY - 4) a = q.x < SX ? Math.PI - MINA : MINA;
    S.aim = Math.max(MINA, Math.min(Math.PI - MINA, a));
  }
  function overNext(S, p) { const q = cellToWorldHit(S, p), np = nextPos(); return Math.hypot(q.x - np.x, q.y - np.y) < R * 1.6 || Math.hypot(q.x - (np.x + 40), q.y - np.y) < 18; }

  // תפריט: במצב אינסופי מסתירים את רשת השלבים של המנוע
  function menuFix(g) {
    if (g.mode !== 'endless' || g.state !== 'menu') return;
    const ov = g.root.querySelector('.g2d-ov');
    const grid = ov && ov.querySelector('.g2d-lv');
    if (!grid || grid.dataset.hid) return;
    grid.dataset.hid = '1'; grid.style.display = 'none';
    const lbl = grid.previousElementSibling;
    if (lbl && lbl.classList.contains('g2d-lbl')) lbl.style.display = 'none';
    const btn = ov.querySelector('[data-primary]');
    if (btn) btn.textContent = g.t('play');
    const b = g.getBest();
    if (b !== null && btn && btn.parentNode) { const p = g.el('p', '', g.t('best') + ': ' + b); btn.parentNode.after(p); }
  }

  GK.register('bubbles', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#0e2a4a', accent: '#6fe3ff',
    modes: [{ id: 'levels', label: 'modeLevels' }, { id: 'endless', label: 'modeEndless' }],
    levels: 25,
    text: TXT,

    setup(g) {
      const ov = g.root.querySelector('.g2d-ov');
      if (ov && window.MutationObserver) { g._menuObs = new MutationObserver(() => menuFix(g)); g._menuObs.observe(ov, { childList: true, subtree: true }); }
    },
    destroy(g) { if (g._menuObs) g._menuObs.disconnect(); },

    init(g) {
      g.s = newState(g);
      g.score = 0;
      if (!g.demo) g.after(0.1, () => g.msg(g.s.endless ? g.t('endlessGo') : g.t('level') + ' ' + g.s.n, 1100, '#bfe8ff'));
      setTimeout(() => menuFix(g), 0);
    },

    step(g) {
      const S = g.s;
      S.t++;
      for (const c of g.hits) {
        if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') fire(g);
        else if (c === 'KeyX' || c === 'ArrowDown' || c === 'KeyS' || c === 'ShiftLeft' || c === 'ShiftRight') swap(g);
      }
      const ax = (g.key('ArrowLeft') || g.key('KeyA') ? 1 : 0) - (g.key('ArrowRight') || g.key('KeyD') ? 1 : 0);
      if (ax) { S.aim = Math.max(MINA, Math.min(Math.PI - MINA, S.aim + ax * 0.03)); S.kbAim = true; }
      if (S.pausedEnd) { S.pausedEnd = false; if (S.phase === 'won') S.endT = Math.min(S.endT, 15); if (S.phase === 'lost') S.endT = Math.min(S.endT, 30); }   // אחרי השהיה: עוד חצי שנייה
      if (S.dropAnim > 0) S.dropAnim--;
      for (let k = S.popping.length - 1; k >= 0; k--) { const p = S.popping[k]; if (++p.t > 12) { S.popping.splice(k, 1); const w = fieldToWorld(S, p.x, p.y); g.burst(w.x, w.y, { n: 7, color: [COLS[p.col][0], COLS[p.col][1], '#ffffff'], speed: 3, life: 24, size: 4, gravity: 0.05 }); } }
      for (let k = S.falling.length - 1; k >= 0; k--) { const p = S.falling[k]; p.vy += 0.45; p.y += p.vy; p.x += p.vx; p.rot += p.vx * 0.05; if (p.y > FH + 40) S.falling.splice(k, 1); }
      if (S.phase === 'fly' && S.shot) {
        if (flyStep(S.f, S.shot)) land(g);
        else if (S.shot.bounced !== (S.shot.bounces || 0)) { S.shot.bounced = S.shot.bounces || 0; g.sfx('bounce', { p: 1.6 }); }
      } else if (S.phase === 'settle') { if (--S.wait <= 0) afterShot(g); }
      else if (S.phase === 'won') {
        if (++S.endT === 45 && !S.ended) { S.ended = true; g.completeLevel(S.stars, { text: g.t('shotsText', { n: S.shots }) }); }
      } else if (S.phase === 'lost') {
        if (S.endT === 0) for (let r = 0; r < MAXR; r++) for (let c = 0; c < 12; c++) if (S.f.grid[r][c] >= 0) { S.falling.push({ x: cxOf(S.f, r, c), y: cyOf(S.f, r), col: S.f.grid[r][c], vy: -Math.random() * 3, vx: (Math.random() - 0.5) * 4, rot: 0 }); S.f.grid[r][c] = -1; }
        if (++S.endT === 60 && !S.ended) {
          S.ended = true;
          if (S.endless) g.end({ score: S.score, text: g.t('lostText') });
          else g.end({ result: 'lose', score: null, text: g.t('lostText') });
        }
      }
      // קו הכיוון מחושב רק כשהזווית או הלוח השתנו
      if (S.phase === 'aim') {
        const key = S.aim.toFixed(4) + ':' + S.f.drop + ':' + S.shots;
        if (key !== S.guideKey) { S.guideKey = key; S.guide = trace(S.f, S.aim); }
      }
      const b = g.getBest();
      if (S.endless) g.hud([[g.t('score'), S.score], [g.t('best'), b === null ? '—' : Math.max(b, S.score)]]);
      else g.hud([[g.t('level'), S.n], [g.t('shots'), S.shots], [g.t('score'), S.score]]);
    },

    idle(g) { if (g.s) g.s.t++; },
    onPause(g) { if (g.s) g.s.pausedEnd = true; },

    // בוט לבדיקות: בוחר זווית (ואולי החלפה) ויורה דרך אותן פעולות של השחקן
    bot(g) {
      const S = g.s;
      if (S.phase !== 'aim' || ++S.botT < 16) return;
      S.botT = 0;
      const ch = botChoice(S.f, S.cur, S.next);
      if (ch.swap) swap(g);
      S.aim = ch.a;
      fire(g);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        if (p.kind === 'mouse' || (S.press && S.press.id === p.id)) { aimAt(g, p); S.kbAim = false; }
        return;
      }
      if (type === 'down') {
        if (overNext(S, p)) { swap(g); S.press = null; return; }
        S.press = { id: p.id, kind: p.kind };
        aimAt(g, p);
      } else if (type === 'up') {
        if (S.press && S.press.id === p.id) { aimAt(g, p); fire(g); }
        S.press = null;
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      drawBg(g, ctx, S.t);
      drawInfo(g, ctx);
      drawField(g, ctx, alpha);
    },

    cover(ctx, w, h, k) {
      const g = Object.assign(Object.create(k), { W: w, H: h });
      drawBg(g, ctx, 120);
      const f = emptyField(6), rnd = seededRnd(5);
      for (let r = 0; r < 5; r++) for (let c = 0; c < ncols(f, r); c++) f.grid[r][c] = (Math.floor(c / 2) + (r > 2 ? 1 : 0) + Math.floor(rnd() * 1.4)) % 6;
      const sc = 0.9, ox = (w - FW * sc) / 2, oy = 6;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
      g.rr(ctx, -8, -30, FW + 16, 640, 20); ctx.fillStyle = 'rgba(8,30,60,.7)'; ctx.fill();
      ctx.strokeStyle = 'rgba(160,220,255,.45)'; ctx.lineWidth = 3; ctx.stroke();
      for (let r = 0; r < 5; r++) for (let c = 0; c < ncols(f, r); c++) drawBubble(ctx, cxOf(f, r, c), cyOf(f, r), R, f.grid[r][c]);
      // קו כיוון קופץ ובועה באוויר
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      const pts = [[240, 520], [20, 320], [175, 182]];
      for (let s = 0; s + 1 < pts.length; s++) { const [x1, y1] = pts[s], [x2, y2] = pts[s + 1], L2 = Math.hypot(x2 - x1, y2 - y1); for (let d = 0; d < L2; d += 16) { g.circle(ctx, x1 + (x2 - x1) * d / L2, y1 + (y2 - y1) * d / L2, 3.5); ctx.fill(); } }
      drawBubble(ctx, 95, 250, R * 1.05, 3);
      // משגר
      ctx.save(); ctx.translate(240, 540); ctx.rotate(-0.62);
      ctx.fillStyle = '#dce9fa'; g.rr(ctx, -15, -70, 30, 56, 9); ctx.fill();
      ctx.fillStyle = '#ffd65a'; ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(13, -68); ctx.lineTo(-13, -68); ctx.closePath(); ctx.fill();
      ctx.restore();
      g.circle(ctx, 240, 546, 40); ctx.fillStyle = '#25466f'; ctx.fill(); ctx.strokeStyle = '#8fc4f5'; ctx.lineWidth = 4; ctx.stroke();
      drawBubble(ctx, 240, 540, R * 1.1, 0);
      ctx.restore();
      // פיצוץ
      for (let q = 0; q < 14; q++) { const a = q * 0.45, x = w * 0.66 + Math.cos(a) * 60, y = 150 + Math.sin(a) * 50; ctx.fillStyle = ['#ffd65a', '#ff8fb0', '#ffffff'][q % 3]; g.circle(ctx, x, y, 4 + (q % 3) * 2); ctx.fill(); }
    },

    _core: { LEVELS, buildLevel, simulate, trace, place, flyStep, snapCell, colorsOn, count, lost, emptyField, pushRow, botChoice, ROWS_MAX },
  });
})();
