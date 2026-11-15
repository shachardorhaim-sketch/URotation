// ============================================================
//  ארבע בשורה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  לוח 7×6: מפילים דיסקיות (הן נופלות וקופצות), ומי שמחבר ראשון 4 בשורה מנצח — והשורה זוהרת.
//  נגד המחשב (אלפא-בטא שרץ כמה מילישניות בכל פריים: קל טועה באמת, בינוני אפשר לנצח, קשה חזק) או 2 שחקנים.
// ============================================================
(function () {
  'use strict';
  const COLS = 7, ROWS = 6, NCELL = COLS * ROWS, TAU = Math.PI * 2;
  // בטלפון עומד העולם עומד גם הוא (הלוח גדול יותר), במחשב הוא שוכב
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const DC = [1, 0, 1, 1], DR = [0, 1, 1, -1];      // לרוחב, לגובה, אלכסון עולה, אלכסון יורד
  const at = (c, r) => c * ROWS + r;                  // r = 0 היא השורה התחתונה

  // ---------- חוקים ----------
  function newPos(turn) { return { cells: new Int8Array(NCELL), h: new Int8Array(COLS), turn: turn || 1, n: 0 }; }
  function drop(P, c) { const r = P.h[c]; P.cells[at(c, r)] = P.turn; P.h[c] = r + 1; P.n++; P.turn = 3 - P.turn; return r; }
  function winsAt(cells, c, r, p) {
    for (let k = 0; k < 4; k++) {
      const dc = DC[k], dr = DR[k];
      let n = 1, cc = c + dc, rr = r + dr;
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[cc * ROWS + rr] === p) { n++; cc += dc; rr += dr; }
      cc = c - dc; rr = r - dr;
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[cc * ROWS + rr] === p) { n++; cc -= dc; rr -= dr; }
      if (n >= 4) return true;
    }
    return false;
  }
  // כל השורות של 4 ומעלה שעוברות דרך (c, r), כל אחת מסודרת מקצה לקצה
  function lineAt(cells, c, r, p) {
    const segs = [];
    for (let k = 0; k < 4; k++) {
      const back = [], fwd = [];
      let cc = c - DC[k], rr = r - DR[k];
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[at(cc, rr)] === p) { back.push([cc, rr]); cc -= DC[k]; rr -= DR[k]; }
      cc = c + DC[k]; rr = r + DR[k];
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[at(cc, rr)] === p) { fwd.push([cc, rr]); cc += DC[k]; rr += DR[k]; }
      if (back.length + fwd.length + 1 >= 4) segs.push(back.reverse().concat([[c, r]], fwd));
    }
    return segs.length ? segs : null;
  }
  // 69 הרביעיות של הלוח, ולכל משבצת — הרביעיות שעוברות בה
  const QUADS = (() => {
    const a = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) for (let k = 0; k < 4; k++) {
      const c3 = c + DC[k] * 3, r3 = r + DR[k] * 3;
      if (c3 < 0 || c3 >= COLS || r3 < 0 || r3 >= ROWS) continue;
      for (let i = 0; i < 4; i++) a.push(at(c + DC[k] * i, r + DR[k] * i));
    }
    return Int8Array.from(a);
  })();
  const QOF = (() => { const a = []; for (let i = 0; i < NCELL; i++) a.push([]); for (let q = 0; q < QUADS.length; q += 4) for (let k = 0; k < 4; k++) a[QUADS[q + k]].push(q); return a; })();
  // כמה "שלישיות פתוחות" (3 שלי + משבצת ריקה) עוברות במשבצת i
  function threatsThrough(cells, i, p) {
    let n = 0;
    for (const q of QOF[i]) {
      let a = 0, e = 0;
      for (let k = 0; k < 4; k++) { const v = cells[QUADS[q + k]]; if (v === p) a++; else if (!v) e++; }
      if (a === 3 && e === 1) n++;
    }
    return n;
  }

  // ---------- המחשב ----------
  // הערכת מצב למי ש-p: כל רביעייה שעוד אפשר להשלים שווה נקודות לפי כמה דיסקיות יש בה, ועוד בונוס לעמודה האמצעית
  const VA = [0, 1, 5, 24, 0], VB = [0, 1, 5, 28, 0];
  function evaluate(cells, p) {
    let s = 0;
    for (let i = 0; i < QUADS.length; i += 4) {
      let a = 0, b = 0;
      for (let k = 0; k < 4; k++) { const v = cells[QUADS[i + k]]; if (v === p) a++; else if (v) b++; }
      if (!b) s += VA[a]; else if (!a) s -= VB[b];
    }
    for (let r = 0; r < ROWS; r++) { const v = cells[3 * ROWS + r]; if (v === p) s += 4; else if (v) s -= 4; }
    return s;
  }

  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  const WIN = 100000;
  // חיפוש אלפא-בטא עם מחסנית מפורשת, כדי שיוכל לרוץ כמה מילישניות בכל פריים ולהמשיך בפריים הבא (הדף לא קופא).
  // מעמיק בהדרגה (1, 2, 3...) עד opt.depth או עד שנגמר הזמן (opt.budget מילישניות של חישוב), ותמיד שומר את המהלך
  // הטוב ביותר של העומק האחרון שהסתיים. בכל צומת: ניצחון מיידי נלקח, איום יחיד של היריב נחסם, שני איומים = הפסד.
  function makeSearch(P, opt, rnd) {
    const cells = Int8Array.from(P.cells), h = Int8Array.from(P.h), me = P.turn;
    let n = P.n;
    const self = { done: false, best: -1, score: 0, depth: 0, nodes: 0, t: 0, run: () => true };
    const legal = ORDER.filter(c => h[c] < ROWS);
    self.best = legal[0];
    if (legal.length <= 1) { self.done = true; return self; }
    const winHere = (c, p) => { const i = at(c, h[c]); cells[i] = p; const w = winsAt(cells, c, h[c], p); cells[i] = 0; return w; };
    for (const c of legal) if (winHere(c, me)) { self.best = c; self.score = WIN; self.done = true; return self; }
    const threats = legal.filter(c => winHere(c, 3 - me));
    if (threats.length) { self.best = threats[0]; self.score = threats.length > 1 ? -WIN : 0; self.done = true; return self; }
    // מהלך שמתחת לאיום של היריב (היריב ישים מעליו וינצח) נבדק אחרון
    function under(c, side) {
      const r = h[c];
      if (r >= ROWS - 1) return false;
      const i = at(c, r);
      cells[i] = side; cells[i + 1] = 3 - side;
      const w = winsAt(cells, c, r + 1, 3 - side);
      cells[i] = 0; cells[i + 1] = 0;
      return w;
    }
    // סדר השורש: המרכז קודם; בין שני צדדים סימטריים — לפי הגרלה, כדי שהמשחקים יהיו שונים
    const ord = ORDER.slice();
    for (let i = 1; i < 7; i += 2) if (rnd() < 0.5) { const tmp = ord[i]; ord[i] = ord[i + 1]; ord[i + 1] = tmp; }
    const safe = ord.filter(c => h[c] < ROWS && !under(c, me)), bad = ord.filter(c => h[c] < ROWS && under(c, me));
    const rootList = safe.concat(bad);
    self.best = rootList[0];
    const MP = NCELL + 2, INF = 1e9;
    const mv = new Int8Array(MP * 7), mn = new Int8Array(MP), mi = new Int8Array(MP), via = new Int8Array(MP), D = new Int8Array(MP), BM = new Int8Array(MP);
    const A = new Float64Array(MP), B = new Float64Array(MP), BEST = new Float64Array(MP);
    const noise = opt.noise || 0;
    let sp = 0, depth = 0;
    // נכנסים לצומת בגובה p: מחזיר ערך (מנקודת המבט של מי שתורו) או null אם נפתחה מסגרת חדשה במחסנית
    function enter(p, d, a, b) {
      self.nodes++;
      const side = p & 1 ? 3 - me : me, o = 3 - side;
      let forced = -1, nt = 0;
      for (let c = 0; c < COLS; c++) {
        const r = h[c];
        if (r >= ROWS) continue;
        const i = c * ROWS + r;
        cells[i] = side;
        if (winsAt(cells, c, r, side)) { cells[i] = 0; return WIN - p - 1; }
        cells[i] = o;
        if (winsAt(cells, c, r, o)) { nt++; forced = c; }
        cells[i] = 0;
      }
      if (nt > 1) return -(WIN - p - 2);
      if (d <= 0) { let v = evaluate(cells, side); if (noise) v += (rnd() - 0.5) * noise; return v; }
      const base = p * 7;
      let k = 0;
      if (forced >= 0) mv[base + k++] = forced;
      else if (p === 0) for (const c of rootList) mv[base + k++] = c;
      else {
        let badMask = 0;
        for (const c of ORDER) { if (h[c] >= ROWS) continue; if (under(c, side)) badMask |= 1 << c; else mv[base + k++] = c; }
        for (const c of ORDER) if (badMask & (1 << c)) mv[base + k++] = c;
      }
      if (!k) return 0;
      mn[p] = k; mi[p] = 0; A[p] = a; B[p] = b; BEST[p] = -INF; BM[p] = mv[base]; D[p] = d;
      sp = p;
      return null;
    }
    function iterate() { depth++; enter(0, depth, -INF, INF); }
    self.run = ms => {
      if (self.done) return true;
      const t0 = now();
      let it = 0;
      while (!self.done) {
        if ((++it & 511) === 0 && (now() - t0 > ms || self.nodes > opt.nodes)) break;
        const p = sp;
        if (mi[p] < mn[p] && A[p] < B[p]) {
          const c = mv[p * 7 + mi[p]++], r = h[c], i = c * ROWS + r;
          cells[i] = p & 1 ? 3 - me : me; h[c] = r + 1; n++;
          let v;
          if (n >= NCELL) v = 0;
          else {
            const res = enter(p + 1, D[p] - 1, -B[p], -A[p]);
            if (res === null) { via[p + 1] = c; continue; }
            v = -res;
          }
          h[c] = r; n--; cells[i] = 0;
          if (v > BEST[p]) { BEST[p] = v; BM[p] = c; }
          if (v > A[p]) A[p] = v;
        } else if (p === 0) {
          // השורש הסתיים: שומרים את המהלך הכי טוב ומעמיקים עוד צעד
          self.best = BM[0]; self.score = BEST[0]; self.depth = depth;
          const j = rootList.indexOf(BM[0]);
          if (j > 0) { rootList.splice(j, 1); rootList.unshift(BM[0]); }
          if (depth >= opt.depth || Math.abs(BEST[0]) >= WIN - 100 || depth >= NCELL - P.n) self.done = true;
          else iterate();
        } else {
          const v = -BEST[p], c = via[p];
          sp = p - 1;
          h[c]--; n--; cells[c * ROWS + h[c]] = 0;
          const q = sp;
          if (v > BEST[q]) { BEST[q] = v; BM[q] = c; }
          if (v > A[q]) A[q] = v;
        }
      }
      self.t += now() - t0;
      if (!self.done && (self.t > opt.budget || self.nodes > opt.nodes)) self.done = true;   // נשאר המהלך של העומק האחרון שהושלם
      return self.done;
    };
    iterate();
    return self;
  }

  // רמות (נבדקו מול שחקנים מתוסרטים, ראה g2dtools/tests/four-in-row): קל — יותר מחצי מהמהלכים "סתם" (עמודה אקראית,
  // האמצע יותר), ואחרת מסתכל 2 מהלכים קדימה. בינוני — מסתכל 4 קדימה בעין לא מדויקת ומפספס כל מהלך חמישי.
  // קשה — מעמיק כמה שאפשר ב-0.25 שנייה (עד 200 אלף מצבים).
  const LEVELS = [
    { random: 0.6, depth: 2, noise: 40, budget: 40, nodes: 5000, think: 0.42 },
    { random: 0.2, depth: 4, noise: 14, budget: 80, nodes: 30000, think: 0.48 },
    { random: 0, depth: 20, noise: 0, budget: 250, nodes: 200000, think: 0.52 },
  ];
  function centerPick(P, rnd) {
    const legal = ORDER.filter(c => P.h[c] < ROWS);
    let tot = 0;
    const w = legal.map(c => { const v = 4 - Math.abs(3 - c) * 0.8; tot += v; return v; });
    let x = rnd() * tot;
    for (let i = 0; i < legal.length; i++) { x -= w[i]; if (x <= 0) return legal[i]; }
    return legal[legal.length - 1];
  }
  function cpuPlan(P, diff, rnd) {
    const L = LEVELS[diff];
    if (L.random && rnd() < L.random) return { done: true, best: centerPick(P, rnd), depth: 0, careless: true, run: () => true };
    return makeSearch(P, L, rnd);
  }

  // שחקן פשוט (לבדיקות, ו-GK.bot): מנצח אם אפשר, חוסם, לא שם מתחת לאיום, אוהב את האמצע ושלישיות פתוחות
  function botPick(P, rnd) {
    const me = P.turn, op = 3 - me, cells = P.cells, legal = [];
    for (let c = 0; c < COLS; c++) if (P.h[c] < ROWS) legal.push(c);
    const winIn = (c, p) => { const i = at(c, P.h[c]); cells[i] = p; const w = winsAt(cells, c, P.h[c], p); cells[i] = 0; return w; };
    for (const c of legal) if (winIn(c, me)) return c;
    for (const c of legal) if (winIn(c, op)) return c;
    const safe = legal.filter(c => {
      const r = P.h[c];
      if (r >= ROWS - 1) return true;
      cells[at(c, r)] = me; cells[at(c, r + 1)] = op;
      const w = winsAt(cells, c, r + 1, op);
      cells[at(c, r)] = 0; cells[at(c, r + 1)] = 0;
      return !w;
    });
    const pool = safe.length ? safe : legal;
    let best = pool[0], bv = -1e9;
    for (const c of pool) {
      const i = at(c, P.h[c]);
      cells[i] = me;
      const v = 4 - Math.abs(3 - c) + 3 * threatsThrough(cells, i, me) + rnd() * 5;
      cells[i] = 0;
      if (v > bv) { bv = v; best = c; }
    }
    return best;
  }

  // ---------- פריסה ----------
  function layout(W, H) {
    const port = H > W;
    const CS = port ? 78 : 68, PAD = port ? 12 : 14;
    const pw = CS * COLS + PAD * 2, ph = CS * ROWS + PAD * 2;
    const L = { port, W, H, CS, PAD, pw, ph, px: Math.round((W - pw) / 2), py: port ? 262 : 100, HR: CS * 0.41, DR: CS * 0.37, grav: 1.25 * CS / 68 };
    L.gy = L.py - Math.round(CS * 0.68);      // הדיסקית שמחכה מעל הלוח
    L.top = L.gy - CS * 0.62;                  // מכאן ולמטה לחיצה בוחרת עמודה
    L.legB = L.py + ph + (port ? 28 : 26);     // תחתית הרגליים של הלוח
    if (port) {
      L.cards = [{ x: 15, y: 16, w: 279, h: 148 }, { x: W - 294, y: 16, w: 279, h: 148 }];
      L.pill = { x: W / 2, y: 838, h: 62, max: 540, size: 28 };
    } else {
      L.cards = [{ x: 24, y: 118, w: 176, h: 322 }, { x: W - 200, y: 118, w: 176, h: 322 }];
      L.pill = { x: W / 2, y: 600, h: 50, max: 470, size: 23 };
    }
    return L;
  }
  const colX = (L, c) => L.px + L.PAD + L.CS * c + L.CS / 2;
  const rowY = (L, r) => L.py + L.PAD + L.CS * (ROWS - 1 - r) + L.CS / 2;

  // ---------- ציור: צבעים, דיסקיות, הלוח ----------
  const SKIN = {
    1: { light: '#ff9eab', mid: '#ff3b57', dark: '#c4142e', rim: '#8a0b20', glow: '#ff6b81', ink: '#3d0612', blush: 'rgba(255,170,190,.55)' },
    2: { light: '#fff4a8', mid: '#ffcc1f', dark: '#e39b00', rim: '#a56800', glow: '#ffd84d', ink: '#4a2c00', blush: 'rgba(255,150,70,.45)' },
  };
  function rrPath(c, x, y, w, h, r) {
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function paintDisc(c, x, y, R, p, plain) {
    const k = SKIN[p];
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = k.rim; c.fill();
    const gr = c.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.08, x, y, R * 0.95);
    gr.addColorStop(0, k.light); gr.addColorStop(0.45, k.mid); gr.addColorStop(1, k.dark);
    c.beginPath(); c.arc(x, y, R * 0.9, 0, TAU); c.fillStyle = gr; c.fill();
    if (!plain) {
      // טבעת בולטת כמו בדיסקית אמיתית, וסימן קטן (כוכב / נקודה) שעוזר להבדיל גם בלי צבעים
      c.lineWidth = R * 0.09;
      c.strokeStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(x + R * 0.02, y + R * 0.04, R * 0.6, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.38)'; c.beginPath(); c.arc(x - R * 0.02, y - R * 0.03, R * 0.6, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.22)';
      if (p === 1) {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.12 : R * 0.27; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        c.closePath(); c.fill();
      } else { c.beginPath(); c.arc(x, y, R * 0.17, 0, TAU); c.fill(); }
    }
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.ellipse(x - R * 0.36, y - R * 0.46, R * 0.3, R * 0.14, -0.6, 0, TAU); c.fill();
  }
  // החזית של הלוח עם החורים (מצוירת מעל הדיסקיות, כך שהן נראות בתוך הלוח)
  function paintPlate(c, L, ox, oy) {
    const { pw, ph, CS, PAD, HR } = L, rad = CS * 0.3, legH = L.legB - L.py - ph;
    for (const s of [0, 1]) {
      const fw = CS * 0.62, fx = s ? ox + pw - fw - CS * 0.3 : ox + CS * 0.3;
      const g1 = c.createLinearGradient(fx, 0, fx + fw, 0);
      g1.addColorStop(0, '#173c9e'); g1.addColorStop(0.5, '#2b5cdc'); g1.addColorStop(1, '#14348a');
      c.fillStyle = g1;
      c.beginPath(); c.moveTo(fx + fw * 0.18, oy + ph - 12); c.lineTo(fx + fw * 0.82, oy + ph - 12); c.lineTo(fx + fw, oy + ph + legH - 8); c.lineTo(fx, oy + ph + legH - 8); c.closePath(); c.fill();
      c.beginPath(); rrPath(c, fx - fw * 0.38, oy + ph + legH - 12, fw * 1.76, 12, 6); c.fillStyle = '#12307f'; c.fill();
    }
    // צל רך מחוץ ללוח בלבד
    c.save();
    c.beginPath(); c.rect(ox - 300, oy - 300, pw + 600, ph + 600); rrPath(c, ox, oy, pw, ph, rad); c.clip('evenodd');
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 26; c.shadowOffsetY = 12;
    c.beginPath(); rrPath(c, ox, oy, pw, ph, rad); c.fillStyle = '#000'; c.fill();
    c.restore();
    const holes = [];
    for (let col = 0; col < COLS; col++) for (let r = 0; r < ROWS; r++) holes.push([ox + PAD + CS * col + CS / 2, oy + PAD + CS * r + CS / 2]);
    const body = () => { c.beginPath(); rrPath(c, ox, oy, pw, ph, rad); for (const [hx, hy] of holes) { c.moveTo(hx + HR, hy); c.arc(hx, hy, HR, 0, TAU); } };
    body();
    const gr = c.createLinearGradient(0, oy, 0, oy + ph);
    gr.addColorStop(0, '#5b95ff'); gr.addColorStop(0.16, '#3a72f2'); gr.addColorStop(1, '#1f4cc4');
    c.fillStyle = gr; c.fill('evenodd');
    // ברק עליון ופס אור אלכסוני
    c.save(); body(); c.clip('evenodd');
    const gl = c.createLinearGradient(0, oy, 0, oy + ph * 0.45);
    gl.addColorStop(0, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.fillRect(ox, oy, pw, ph * 0.45);
    c.globalAlpha = 0.07; c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(ox + pw * 0.6, oy); c.lineTo(ox + pw * 0.76, oy); c.lineTo(ox + pw * 0.5, oy + ph); c.lineTo(ox + pw * 0.34, oy + ph); c.fill();
    c.restore();
    // שוליים של כל חור: צל בחלק העליון, אור בתחתון
    const inner = c.createRadialGradient(0, HR * 0.32, HR * 0.5, 0, HR * 0.2, HR * 1.18);
    inner.addColorStop(0, 'rgba(0,0,30,0)'); inner.addColorStop(1, 'rgba(0,4,40,.62)');
    const rim = c.createLinearGradient(0, -HR, 0, HR);
    rim.addColorStop(0, 'rgba(8,22,80,.9)'); rim.addColorStop(0.55, 'rgba(30,70,170,.45)'); rim.addColorStop(1, 'rgba(185,215,255,.95)');
    for (const [hx, hy] of holes) {
      c.save(); c.translate(hx, hy);
      c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.fillStyle = inner; c.fill();
      c.lineWidth = CS * 0.05; c.strokeStyle = rim; c.beginPath(); c.arc(0, 0, HR - CS * 0.02, 0, TAU); c.stroke();
      c.restore();
    }
    c.lineWidth = 3; c.strokeStyle = '#163894'; c.beginPath(); rrPath(c, ox + 1.5, oy + 1.5, pw - 3, ph - 3, rad); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.32)'; c.beginPath(); rrPath(c, ox + 4.5, oy + 4.5, pw - 9, ph - 9, rad - 3); c.stroke();
    // ברגים קטנים בפינות
    for (const [bx, by] of [[ox + PAD * 0.6, oy + PAD * 0.6], [ox + pw - PAD * 0.6, oy + PAD * 0.6], [ox + PAD * 0.6, oy + ph - PAD * 0.6], [ox + pw - PAD * 0.6, oy + ph - PAD * 0.6]]) {
      c.beginPath(); c.arc(bx, by, 3.2, 0, TAU); c.fillStyle = '#9cc0ff'; c.fill();
      c.beginPath(); c.arc(bx + 0.6, by + 0.8, 2, 0, TAU); c.fillStyle = '#2a58c8'; c.fill();
    }
  }
  // תמונות מוכנות (דיסקיות ולוח) ברזולוציה של המסך — מצוירות פעם אחת ולא בכל פריים
  const cache = { res: 0, L: null };
  function sprites(ctx, L) {
    let res = 2;
    try { const m = ctx.getTransform(); res = Math.hypot(m.a, m.b) || 2; } catch (e) {}
    res = Math.max(1, Math.min(4, Math.round(res * 4) / 4));
    if (cache.res === res && cache.L === L) return cache;
    cache.res = res; cache.L = L;
    const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res); const c = cv.getContext('2d'); c.scale(res, res); return [cv, c]; };
    const R = L.DR, half = R + 3;
    cache.dh = half; cache.ds = half * 2;
    for (const p of [1, 2]) { const [cv, c] = mk(half * 2, half * 2); paintDisc(c, half, half, R, p); cache[p] = cv; }
    const m = 44;
    const [pv, pc] = mk(L.pw + m * 2, L.legB - L.py + m * 2);
    paintPlate(pc, L, m, m);
    cache.plate = pv; cache.m = m; cache.pw = L.pw + m * 2; cache.ph = L.legB - L.py + m * 2;
    return cache;
  }
  const disc = (ctx, C, p, x, y) => ctx.drawImage(C[p], x - C.dh, y - C.dh, C.ds, C.ds);

  function drawBg(ctx, W, H, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#271d68'); gr.addColorStop(0.6, '#161144'); gr.addColorStop(1, '#0b0922');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // אורות רכים שנעים לאט
    const cols = ['255,80,110', '255,210,70', '120,150,255', '190,120,255'];
    for (let i = 0; i < 11; i++) {
      const r = 50 + (i * 37) % 80;
      const x = ((i * 191.3 + t * (5 + (i % 4) * 2.5)) % (W + r * 2)) - r, y = (i * 113.7) % H + Math.sin(t * 0.4 + i * 1.7) * 18;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + cols[i % 4] + ',.13)'); rg.addColorStop(1, 'rgba(' + cols[i % 4] + ',0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 40; i++) { const x = (i * 97.3) % W, y = (i * 61.7 + i * i * 3.1) % H, a = 0.5 + 0.5 * Math.sin(t * 1.3 + i); ctx.globalAlpha = a; ctx.fillRect(x, y, 2, 2); }
    ctx.globalAlpha = 1;
  }

  // ---------- הדמויות: דיסקית עם פרצוף, ורובוט למחשב ----------
  function drawBuddy(ctx, x, y, R, p, mood, lx, ly, blink) {
    const k = SKIN[p];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.08;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = k.rim; ctx.fill();
    ctx.restore();
    paintDisc(ctx, x, y, R, p, true);
    const ex = R * 0.3, ey = y - R * 0.1, ew = R * 0.19, eh = R * 0.23;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const cx = x + s * ex;
      ctx.strokeStyle = k.ink; ctx.lineWidth = R * 0.075;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(cx, ey + eh * 0.35, ew * 0.85, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); continue; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(cx - ew * 0.8, ey); ctx.lineTo(cx + ew * 0.8, ey); ctx.stroke(); continue; }
      const big = mood === 'wow' ? 1.15 : 1;
      ctx.beginPath(); ctx.ellipse(cx, ey, ew * big, eh * big, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = R * 0.03; ctx.stroke();
      const pr = ew * (mood === 'wow' ? 0.36 : 0.52);
      const px = cx + lx * ew * 0.42, py = ey + ly * eh * 0.38 + (mood === 'sad' ? eh * 0.25 : 0);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fillStyle = k.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.32, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = R * 0.065;
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(cx - s * ew * 1.0, ey - eh * 1.15); ctx.lineTo(cx + s * ew * 0.9, ey - eh * 1.55); ctx.stroke(); }
      if (mood === 'think' && s === 1) { ctx.beginPath(); ctx.moveTo(cx - ew, ey - eh * 1.5); ctx.quadraticCurveTo(cx, ey - eh * 1.95, cx + ew, ey - eh * 1.55); ctx.stroke(); }
    }
    const my = y + R * 0.36;
    ctx.strokeStyle = k.ink; ctx.lineWidth = R * 0.075;
    if (mood === 'happy') {
      ctx.beginPath(); ctx.moveTo(x - R * 0.3, my - R * 0.05); ctx.quadraticCurveTo(x, my + R * 0.42, x + R * 0.3, my - R * 0.05); ctx.closePath();
      ctx.fillStyle = k.ink; ctx.fill();
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(x, my + R * 0.24, R * 0.15, 0, TAU); ctx.fillStyle = '#ff6f8a'; ctx.fill(); ctx.restore();
    } else if (mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + R * 0.16, R * 0.18, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(x, my + R * 0.04, R * 0.09, R * 0.12, 0, 0, TAU); ctx.fillStyle = k.ink; ctx.fill(); }
    else if (mood === 'think') { ctx.beginPath(); ctx.moveTo(x - R * 0.12, my + R * 0.04); ctx.lineTo(x + R * 0.14, my); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, my - R * 0.1, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    ctx.fillStyle = k.blush;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * R * 0.56, y + R * 0.2, R * 0.13, R * 0.08, 0, 0, TAU); ctx.fill(); }
  }
  function drawRobot(ctx, x, y, R, mood, lx, ly, blink, t) {
    const hw = R * 0.92, hh = R * 0.76;
    // אנטנה עם נורה (מהבהבת כשהוא חושב)
    ctx.strokeStyle = '#8d9bbf'; ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x, y - hh - R * 0.26); ctx.stroke();
    const on = mood === 'think' ? Math.sin(t * 16) > 0 : true;
    ctx.save();
    if (on) { ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = R * 0.35; }
    ctx.beginPath(); ctx.arc(x, y - hh - R * 0.33, R * 0.12, 0, TAU); ctx.fillStyle = on ? '#ffd84d' : '#8a6a10'; ctx.fill();
    ctx.restore();
    // אוזניים צהובות
    for (const s of [-1, 1]) {
      ctx.beginPath(); rrPath(ctx, s < 0 ? x - hw - R * 0.16 : x + hw - R * 0.02, y - R * 0.26, R * 0.18, R * 0.5, R * 0.07);
      ctx.fillStyle = '#ffc21f'; ctx.fill(); ctx.strokeStyle = '#a56800'; ctx.lineWidth = R * 0.03; ctx.stroke();
    }
    // ראש מתכת
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.08;
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32);
    const hg = ctx.createLinearGradient(0, y - hh, 0, y + hh);
    hg.addColorStop(0, '#f6f8ff'); hg.addColorStop(1, '#a3b0d2');
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32); ctx.strokeStyle = '#56627f'; ctx.lineWidth = R * 0.04; ctx.stroke();
    // מסך הפנים
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
      let cx = x + s * ex + lx * R * 0.07, cy = ey + ly * R * 0.06;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(cx, cy + R * 0.06, R * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(cx - R * 0.12, cy - s * R * 0.05); ctx.lineTo(cx + R * 0.12, cy + s * R * 0.05); ctx.stroke(); continue; }
      if (mood === 'think') { cx = x + s * ex + R * 0.06; cy = ey - R * 0.07; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(cx - R * 0.1, cy); ctx.lineTo(cx + R * 0.1, cy); ctx.stroke(); continue; }
      if (mood === 'wow') { ctx.beginPath(); ctx.arc(cx, cy, R * 0.13, 0, TAU); ctx.lineWidth = R * 0.06; ctx.stroke(); ctx.lineWidth = R * 0.08; continue; }
      ctx.beginPath(); rrPath(ctx, cx - R * 0.08, cy - R * 0.12, R * 0.16, R * 0.24, R * 0.07); ctx.fill();
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
    // ברגים
    ctx.fillStyle = '#7b88aa';
    for (const [bx, by] of [[x - hw * 0.86, y - hh * 0.8], [x + hw * 0.86, y - hh * 0.8], [x - hw * 0.86, y + hh * 0.8], [x + hw * 0.86, y + hh * 0.8]]) { ctx.beginPath(); ctx.arc(bx, by, R * 0.045, 0, TAU); ctx.fill(); }
  }
  function drawTrophy(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(-9, -5, 4.6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(9, -5, 4.6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = '#ffd84d'; ctx.strokeStyle = '#b07a00'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11); ctx.quadraticCurveTo(9, 4, 0, 5); ctx.quadraticCurveTo(-9, 4, -9, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-2, 5, 4, 5); ctx.fillRect(-7, 10, 14, 3.5);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-5.5, -9, 2.5, 8);
    ctx.restore();
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'ארבע בשורה', help: ['לחץ על עמודה כדי להפיל דיסקית (או חצים ורווח, או המקשים 1–7)', 'מי שמחבר ראשון 4 בשורה — לרוחב, לגובה או באלכסון — מנצח!', 'שים לב לשורות של היריב וחסום אותן בזמן', '2 שחקנים: משחקים בתורות על אותו מחשב'], helpTouch: ['גע בעמודה כדי להפיל דיסקית. אפשר להחליק את האצבע ולשחרר', 'מי שמחבר ראשון 4 בשורה — לרוחב, לגובה או באלכסון — מנצח!', 'שים לב לשורות של היריב וחסום אותן בזמן'], you: 'אתה', yourTurn: 'התור שלך!', thinking: 'המחשב חושב…', cpuWins: 'המחשב ניצח', colFull: 'העמודה מלאה', blocked: 'נחסם!', streak: 'רצף ניצחונות', inMoves: 'ניצחת ב-{n} מהלכים', boardFull: 'הלוח התמלא ואף אחד לא חיבר 4', starts: '{name} מתחיל', tip1: 'טיפ: העמודה האמצעית הכי חזקה — יש ממנה הכי הרבה דרכים לחבר 4', tip2: 'טיפ: אל תשכח לבדוק גם את האלכסונים!', tip3: 'טיפ: צור שני איומים בבת אחת — אפשר לחסום רק אחד' },
    en: { title: 'Four in a Row', help: ['Click a column to drop a disc (or arrows + Space, or keys 1–7)', 'Be the first to connect 4 in a row — across, up or diagonally — to win!', "Watch your opponent's lines and block them in time", '2 players: take turns on the same computer'], helpTouch: ['Tap a column to drop a disc. You can slide your finger and let go', 'Be the first to connect 4 in a row — across, up or diagonally — to win!', "Watch your opponent's lines and block them in time"], you: 'You', yourTurn: 'Your turn!', thinking: 'The computer is thinking…', cpuWins: 'The computer wins', colFull: 'That column is full', blocked: 'Blocked!', streak: 'Win streak', inMoves: 'You won in {n} moves', boardFull: 'The board is full and nobody connected 4', starts: '{name} starts', tip1: 'Tip: the middle column is the strongest — it is part of the most lines', tip2: "Tip: don't forget to check the diagonals!", tip3: 'Tip: make two threats at once — they can only block one' },
    ar: { title: 'أربعة في صف', help: ['انقر على عمود لإسقاط قرص (أو الأسهم والمسافة، أو المفاتيح 1–7)', 'أول من يصل 4 في صف — أفقياً أو عمودياً أو قطرياً — يفوز!', 'راقب صفوف خصمك وأوقفها في الوقت المناسب', 'لاعبان: تناوبا على نفس الكمبيوتر'], helpTouch: ['المس عموداً لإسقاط قرص. يمكنك تحريك إصبعك ثم رفعه', 'أول من يصل 4 في صف — أفقياً أو عمودياً أو قطرياً — يفوز!', 'راقب صفوف خصمك وأوقفها في الوقت المناسب'], you: 'أنت', yourTurn: 'دورك!', thinking: 'الكمبيوتر يفكر…', cpuWins: 'فاز الكمبيوتر', colFull: 'هذا العمود ممتلئ', blocked: 'تم الصد!', streak: 'سلسلة الانتصارات', inMoves: 'فزت في {n} نقلات', boardFull: 'امتلأت اللوحة ولم يصنع أحد 4 في صف', starts: '{name} يبدأ', tip1: 'نصيحة: العمود الأوسط هو الأقوى — يمر به أكبر عدد من الصفوف', tip2: 'نصيحة: لا تنسَ أن تراقب الأقطار!', tip3: 'نصيحة: اصنع تهديدين معاً — يمكن صد واحد فقط' },
    es: { title: 'Cuatro en Raya', help: ['Haz clic en una columna para soltar una ficha (o flechas + Espacio, o las teclas 1–7)', '¡Gana quien conecte 4 en línea primero: horizontal, vertical o diagonal!', 'Vigila las líneas de tu rival y bloquéalas a tiempo', '2 jugadores: por turnos en la misma computadora'], helpTouch: ['Toca una columna para soltar una ficha. Puedes deslizar el dedo y soltar', '¡Gana quien conecte 4 en línea primero: horizontal, vertical o diagonal!', 'Vigila las líneas de tu rival y bloquéalas a tiempo'], you: 'Tú', yourTurn: '¡Tu turno!', thinking: 'La computadora piensa…', cpuWins: 'Gana la computadora', colFull: 'Esa columna está llena', blocked: '¡Bloqueado!', streak: 'Racha de victorias', inMoves: 'Ganaste en {n} jugadas', boardFull: 'El tablero se llenó y nadie conectó 4', starts: 'Empieza {name}', tip1: 'Consejo: la columna del medio es la más fuerte, forma parte de más líneas', tip2: '¡Consejo: no olvides mirar las diagonales!', tip3: 'Consejo: crea dos amenazas a la vez; solo pueden bloquear una' },
    fr: { title: 'Quatre en ligne', help: ['Clique sur une colonne pour lâcher un jeton (ou flèches + Espace, ou les touches 1–7)', 'Le premier qui aligne 4 jetons — en ligne, en colonne ou en diagonale — gagne !', "Surveille les lignes de l'adversaire et bloque-les à temps", '2 joueurs : chacun son tour sur le même ordinateur'], helpTouch: ['Touche une colonne pour lâcher un jeton. Tu peux glisser le doigt puis lâcher', 'Le premier qui aligne 4 jetons — en ligne, en colonne ou en diagonale — gagne !', "Surveille les lignes de l'adversaire et bloque-les à temps"], you: 'Toi', yourTurn: 'À toi !', thinking: "L'ordinateur réfléchit…", cpuWins: "L'ordinateur gagne", colFull: 'Cette colonne est pleine', blocked: 'Bloqué !', streak: 'Série de victoires', inMoves: 'Gagné en {n} coups', boardFull: "La grille est pleine et personne n'a aligné 4", starts: '{name} commence', tip1: 'Astuce : la colonne du milieu est la plus forte, elle sert à plus de lignes', tip2: "Astuce : n'oublie pas les diagonales !", tip3: "Astuce : crée deux menaces d'un coup, on ne peut en bloquer qu'une" },
    pt: { title: 'Quatro em Linha', help: ['Clique numa coluna para soltar uma peça (ou setas + Espaço, ou as teclas 1–7)', 'Quem ligar 4 em linha primeiro — na horizontal, vertical ou diagonal — vence!', 'Fique de olho nas linhas do rival e bloqueie-as a tempo', '2 jogadores: revezem no mesmo computador'], helpTouch: ['Toque numa coluna para soltar uma peça. Pode deslizar o dedo e soltar', 'Quem ligar 4 em linha primeiro — na horizontal, vertical ou diagonal — vence!', 'Fique de olho nas linhas do rival e bloqueie-as a tempo'], you: 'Você', yourTurn: 'Sua vez!', thinking: 'O computador está pensando…', cpuWins: 'O computador venceu', colFull: 'Essa coluna está cheia', blocked: 'Bloqueado!', streak: 'Vitórias seguidas', inMoves: 'Você venceu em {n} jogadas', boardFull: 'O tabuleiro encheu e ninguém fez 4', starts: '{name} começa', tip1: 'Dica: a coluna do meio é a mais forte, faz parte de mais linhas', tip2: 'Dica: não esqueça de olhar as diagonais!', tip3: 'Dica: crie duas ameaças de uma vez; só dá para bloquear uma' },
    ru: { title: 'Четыре в ряд', help: ['Нажми на столбец, чтобы бросить фишку (или стрелки + Пробел, или клавиши 1–7)', 'Кто первым соберёт 4 в ряд — по горизонтали, вертикали или диагонали — побеждает!', 'Следи за рядами соперника и вовремя их перекрывай', '2 игрока: ходите по очереди за одним компьютером'], helpTouch: ['Коснись столбца, чтобы бросить фишку. Можно провести пальцем и отпустить', 'Кто первым соберёт 4 в ряд — по горизонтали, вертикали или диагонали — побеждает!', 'Следи за рядами соперника и вовремя их перекрывай'], you: 'Ты', yourTurn: 'Твой ход!', thinking: 'Компьютер думает…', cpuWins: 'Компьютер победил', colFull: 'Этот столбец заполнен', blocked: 'Перекрыто!', streak: 'Серия побед', inMoves: 'Ходов до победы: {n}', boardFull: 'Поле заполнено, и никто не собрал 4', starts: '{name} начинает', tip1: 'Совет: средний столбец самый сильный — через него проходит больше всего рядов', tip2: 'Совет: не забывай про диагонали!', tip3: 'Совет: создай две угрозы сразу — перекрыть можно только одну' },
    de: { title: 'Vier in einer Reihe', help: ['Klicke auf eine Spalte, um einen Stein fallen zu lassen (oder Pfeile + Leertaste, oder Tasten 1–7)', 'Wer zuerst 4 in einer Reihe hat — waagrecht, senkrecht oder diagonal — gewinnt!', 'Achte auf die Reihen deines Gegners und blockiere sie rechtzeitig', '2 Spieler: abwechselnd am selben Computer'], helpTouch: ['Tippe auf eine Spalte, um einen Stein fallen zu lassen. Du kannst den Finger ziehen und loslassen', 'Wer zuerst 4 in einer Reihe hat — waagrecht, senkrecht oder diagonal — gewinnt!', 'Achte auf die Reihen deines Gegners und blockiere sie rechtzeitig'], you: 'Du', yourTurn: 'Du bist dran!', thinking: 'Der Computer denkt nach…', cpuWins: 'Der Computer gewinnt', colFull: 'Diese Spalte ist voll', blocked: 'Geblockt!', streak: 'Siegesserie', inMoves: 'Gewonnen in {n} Zügen', boardFull: 'Das Brett ist voll und niemand hat 4 geschafft', starts: '{name} beginnt', tip1: 'Tipp: Die mittlere Spalte ist die stärkste — sie gehört zu den meisten Reihen', tip2: 'Tipp: Vergiss die Diagonalen nicht!', tip3: 'Tipp: Mach zwei Drohungen auf einmal — nur eine kann geblockt werden' },
  };

  // ---------- מהלך המשחק ----------
  const tallyKey = g => (g.mode === '2p' ? '2p' : 'cpu' + g.diff);
  const isCpu = (S, p) => S.vsCpu && p === 2;
  function humanTurn(g) { const S = g.s; return g.state === 'play' && !S.over && !S.lock && !S.think && !isCpu(S, S.P.turn); }
  function setMood(S, p, m, sec) { S.mood[p] = m; S.moodUntil[p] = S.t + sec; }

  function hud(g) {
    const S = g.s;
    if (S.vsCpu) {
      const b = g.getBest();
      g.hud([[g.t('streak'), String(S.streak), '#ffd84d'], [g.t('best'), b == null ? '—' : String(Math.max(b, S.streak))], [g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff])]]);
    } else {
      const tl = S.keep.tally['2p'] || [0, 0];
      g.hud([[g.t('p1'), String(tl[0]), SKIN[1].glow], [g.t('p2'), String(tl[1]), SKIN[2].glow]]);
    }
  }

  function beginTurn(g) {
    const S = g.s;
    if (S.over || g.demo) return;
    if (isCpu(S, S.P.turn)) {
      const lv = LEVELS[g.diff];
      S.cpuCol = S.last ? S.last.c : 3;
      S.think = { plan: cpuPlan(S.P, g.diff, Math.random), t0: S.t, minT: lv.think + Math.random() * 0.18, target: -1, tT: 0, wander: S.t + 0.16 + Math.random() * 0.1 };
    }
  }

  function setCursor(g, c) {
    const S = g.s;
    if (c === S.cursor) return;
    S.cursor = c;
    if (humanTurn(g)) g.tone({ f: 1150 + c * 45, dur: 0.025, vol: 0.03, type: 'sine' });
  }

  function humanDrop(g, c) {
    const S = g.s;
    if (!humanTurn(g) || c < 0 || c >= COLS) return false;
    S.cursor = c;
    if (S.P.h[c] >= ROWS) { S.nudge = { c, t: 0 }; g.sfx('error'); g.msg(g.t('colFull'), 900, '#ff9eab'); return false; }
    doDrop(g, c);
    return true;
  }

  function doDrop(g, c) {
    const S = g.s, P = S.P, L = S.L, p = P.turn, r = P.h[c];
    // האם היריב היה מנצח בדיוק כאן? אז זו חסימה
    P.cells[at(c, r)] = 3 - p;
    const blocked = winsAt(P.cells, c, r, 3 - p);
    P.cells[at(c, r)] = 0;
    drop(P, c);
    S.last = { c, r, p };
    S.lock = true;
    S.gx = S.pgx = colX(L, c);
    S.falling.push({ c, r, p, y: L.gy, py: L.gy, vy: 3 * L.CS / 68, tY: rowY(L, r), hits: 0, blocked });
    g.tone({ f: 720, f2: 380, dur: 0.07, type: 'sine', vol: 0.05 });
  }

  function clack(g, d, v) {
    const k = Math.min(1, v / 30);
    if (k < 0.06) return;
    g.noise({ f: 3000, f2: 900, dur: 0.05, vol: 0.05 + 0.13 * k, filter: 'bandpass', q: 1.4 });
    g.tone({ f: 200 + d.r * 22, f2: 130, dur: 0.075, type: 'triangle', vol: 0.06 + 0.16 * k });
    if (d.hits === 1) g.shake(1 + 2.2 * k);
  }

  function landed(g, d) {
    const S = g.s, P = S.P, L = S.L;
    S.lock = false;
    const x = colX(L, d.c), y = rowY(L, d.r);
    const segs = lineAt(P.cells, d.c, d.r, d.p);
    if (segs) return winRound(g, d.p, segs);
    if (d.blocked) {
      g.float(x, y - L.CS * 0.55, g.t('blocked'), { color: '#a8ecff', size: L.port ? 30 : 26 });
      g.burst(x, y, { n: 18, color: ['#a8ecff', '#ffffff', SKIN[d.p].light], speed: 3.2, life: 34, size: 5 });
      g.sfx('score', { p: 0.85 });
      setMood(S, d.p, 'happy', 1.1); setMood(S, 3 - d.p, 'wow', 1.1);
    }
    if (P.n >= NCELL) return drawRound(g);
    beginTurn(g);
  }

  function winRound(g, p, segs) {
    const S = g.s, L = S.L;
    S.over = true;
    const cells = [], seen = new Set();
    for (const seg of segs) for (const [c, r] of seg) { const i = at(c, r); if (!seen.has(i)) { seen.add(i); cells.push([c, r]); } }
    S.win = { p, lines: segs, cells, t0: S.t };
    if (g.demo) return;
    const tk = tallyKey(g);
    const tl = S.keep.tally[tk] = S.keep.tally[tk] || [0, 0];
    tl[p - 1]++;
    for (const [c, r] of cells) g.burst(colX(L, c), rowY(L, r), { n: 16, color: [SKIN[p].light, SKIN[p].mid, '#ffffff'], speed: 4, life: 40, size: 5 });
    if (!S.vsCpu || p === 1) {
      for (let i = 0; i < 5; i++) g.burst(L.px + L.pw * (0.1 + 0.2 * i), L.py - 8, { n: 22, color: ['#ff4d6d', '#ffd84d', '#5ef0ff', '#7cff8a', '#ffffff', '#b38cff'], speed: 6.5, life: 95, size: 7, gravity: 0.16, spread: Math.PI * 0.8, dir: -Math.PI / 2, shape: 'square', drag: 0.985 });
    }
    g.flash(SKIN[p].light, 0.16); g.shake(5);
    g.tone({ f: 1568, dur: 0.35, vol: 0.05, delay: 0.55, type: 'sine' });
    let moves = 0;
    for (let i = 0; i < NCELL; i++) if (S.P.cells[i] === p) moves++;
    // החגיגה נמשכת שנייה (השורה נדלקת), ורק אז חלון הסיום; הצליל מתנגן כבר עכשיו
    if (S.vsCpu) {
      if (p === 1) {
        const b = g.getBest();
        S.streak++; g.save('streak' + g.diff, S.streak); hud(g);
        g.sfx(b !== null && S.streak > b ? 'record' : 'win');
        finishLater(g, { result: 'win', score: S.streak, scoreLabel: g.t('streak'), text: g.t('inMoves', { n: moves }) });
      } else {
        S.streak = 0; g.save('streak' + g.diff, 0); hud(g);
        g.sfx('lose');
        finishLater(g, { result: 'lose', score: null, text: g.t('tip' + (1 + Math.floor(Math.random() * 3))) });
      }
    } else { hud(g); g.sfx('win'); finishLater(g, { winner: g.t(p === 1 ? 'p1' : 'p2'), score: null }); }
  }
  function finishLater(g, o, sec) { g.s.pendingEnd = { o: Object.assign({ sound: 'none', delay: 350 }, o), at: g.s.t + (sec || 1.1) }; }

  function drawRound(g) {
    const S = g.s;
    S.over = true; S.drawn = true;
    if (g.demo) return;
    g.sfx('score');
    finishLater(g, { result: 'draw', score: null, text: g.t('boardFull') }, 0.7);
  }

  // המחשב: חושב כמה מילישניות בכל פריים, מרחף מעל כמה עמודות ואז מפיל
  function stepCpu(g) {
    const S = g.s, th = S.think;
    if (!th) return;
    if (!th.plan.done) th.plan.run(9);
    if (th.target < 0) {
      if (S.t >= th.wander) {
        th.wander = S.t + 0.2 + Math.random() * 0.18;
        const opts = [];
        for (let c = 0; c < COLS; c++) if (S.P.h[c] < ROWS && c !== S.cpuCol && Math.abs(c - S.cpuCol) <= 2) opts.push(c);
        if (opts.length) { S.cpuCol = opts[Math.floor(Math.random() * opts.length)]; g.sfx('tick', { p: 0.7 }); }
      }
      if (th.plan.done && S.t - th.t0 >= th.minT) {
        let c = th.plan.best;
        if (!(c >= 0 && c < COLS && S.P.h[c] < ROWS)) c = ORDER.find(k => S.P.h[k] < ROWS);
        th.target = c; th.tT = S.t; S.cpuCol = c;
      }
    } else if (Math.abs(S.gx - colX(S.L, th.target)) < 3 && S.t - th.tT > 0.12) {
      S.think = null;
      doDrop(g, th.target);
    }
  }

  function stepWorld(g) {
    const S = g.s, L = S.L;
    for (let i = S.falling.length - 1; i >= 0; i--) {
      const d = S.falling[i];
      d.py = d.y; d.vy += L.grav; d.y += d.vy;
      if (d.y >= d.tY) {
        d.y = d.tY;
        const v = d.vy;
        d.hits++;
        clack(g, d, v * 68 / L.CS);
        if (d.hits === 1) landed(g, d);
        if (v > 3.2 * L.CS / 68 && d.hits < 3) d.vy = -v * 0.27;
        else S.falling.splice(i, 1);
      }
    }
    const col = S.think ? S.cpuCol : S.cursor;
    S.pgx = S.gx; S.gx += (colX(L, col) - S.gx) * 0.3;
    if (S.nudge && ++S.nudge.t > 20) S.nudge = null;
    for (const p of [1, 2]) { if (S.blink[p] > 0) S.blink[p]--; else if (Math.random() < 0.006) S.blink[p] = 8; }
  }

  // ---------- ציור הכרטיסים ושורת המצב ----------
  function moodOf(S, p) {
    if (S.win) return S.win.p === p ? 'happy' : 'sad';
    if (S.moodUntil[p] > S.t) return S.mood[p];
    if (S.think && isCpu(S, p)) return 'think';
    return 'idle';
  }
  function drawCard(g, ctx, S, p, t, look) {
    const L = S.L, k = L.cards[(p === 1) !== g.rtl ? 0 : 1], sk = SKIN[p];
    const active = !S.over && !g.demo && S.P.turn === p;
    const pulse = active ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    ctx.save();
    if (active) { ctx.shadowColor = sk.glow; ctx.shadowBlur = 14 + pulse * 14; }
    g.rr(ctx, k.x, k.y, k.w, k.h, 22);
    const bg = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
    bg.addColorStop(0, active ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.09)'); bg.addColorStop(1, active ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)');
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    g.rr(ctx, k.x, k.y, k.w, k.h, 22);
    ctx.lineWidth = active ? 3 : 1.5; ctx.strokeStyle = active ? sk.mid : 'rgba(255,255,255,.14)'; ctx.stroke();
    const port = L.port;
    const ax = port ? (g.rtl ? k.x + k.w - 74 : k.x + 74) : k.x + k.w / 2, ay = port ? k.y + k.h / 2 + 4 : k.y + 102, aR = port ? 50 : 60;
    const bob = active ? Math.sin(t * 4) * 3 : 0;
    let lx = look.x - ax, ly = look.y - ay;
    const ll = Math.hypot(lx, ly) || 1;
    lx /= ll; ly /= ll;
    const mood = moodOf(S, p), blink = S.blink[p] > 0;
    if (isCpu(S, p)) drawRobot(ctx, ax, ay + bob, aR * 0.92, mood, lx, ly, blink, t);
    else drawBuddy(ctx, ax, ay + bob, aR, p, mood, lx, ly, blink);
    const tx = port ? (g.rtl ? k.x + (k.w - 148) / 2 : k.x + 148 + (k.w - 148) / 2) : k.x + k.w / 2;
    const name = S.vsCpu ? g.t(p === 1 ? 'you' : 'cpu') : g.t(p === 1 ? 'p1' : 'p2');
    g.text(ctx, name, tx, port ? k.y + 50 : k.y + 202, { size: port ? 28 : 27, weight: 900, color: '#fff', maxW: port ? k.w - 160 : k.w - 20, shadow: true });
    const tl = S.keep.tally[tallyKey(g)] || [0, 0];
    const wy = port ? k.y + 102 : k.y + 258, num = String(tl[p - 1]);
    ctx.save(); ctx.font = '900 30px Heebo, Arial, sans-serif'; const nw = ctx.measureText(num).width; ctx.restore();
    const gw = 30 + 10 + nw;
    drawTrophy(ctx, tx - gw / 2 + 15, wy, 28);
    g.text(ctx, num, tx - gw / 2 + 40, wy + 1, { size: 30, weight: 900, color: '#ffd84d', align: 'left', dir: 'ltr' });
    // נקודת הצבע של השחקן
    if (!port) { ctx.globalAlpha = 0.95; paintDisc(ctx, k.x + k.w / 2, k.y + k.h - 30, 13, p); ctx.globalAlpha = 1; }
  }
  function drawPill(g, ctx, S, t) {
    const L = S.L, P = S.P, pl = L.pill;
    let txt, p = P.turn, alpha = 1;
    if (S.win) { p = S.win.p; txt = S.vsCpu ? g.t(p === 1 ? 'youWin' : 'cpuWins') : g.t('wins', { name: g.t(p === 1 ? 'p1' : 'p2') }); }
    else if (S.over) { txt = g.t('draw'); p = 0; }
    else if (S.vsCpu) { txt = P.turn === 1 ? g.t('yourTurn') : g.t('thinking'); if (P.turn === 2) alpha = 0.65 + 0.35 * Math.sin(t * 6); }
    else txt = g.t('turnOf', { name: g.t(P.turn === 1 ? 'p1' : 'p2') });
    const size = pl.size;
    ctx.save(); ctx.font = '900 ' + size + 'px Heebo, Arial, sans-serif';
    const tw = Math.min(ctx.measureText(txt).width, pl.max - (p ? 96 : 50));
    ctx.restore();
    const D = pl.h * 0.62, w = tw + (p ? D + 64 : 50), x0 = pl.x - w / 2, y0 = pl.y - pl.h / 2;
    g.rr(ctx, x0, y0, w, pl.h, pl.h / 2);
    ctx.fillStyle = 'rgba(8,8,30,.55)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = p ? SKIN[p].glow : 'rgba(255,255,255,.3)'; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    if (p) {
      const ix = g.rtl ? x0 + w - 22 - D / 2 : x0 + 22 + D / 2;
      paintDisc(ctx, ix, pl.y, D / 2, p);
      g.text(ctx, txt, g.rtl ? ix - D / 2 - 14 : ix + D / 2 + 14, pl.y + 1, { size, weight: 900, color: '#fff', align: g.rtl ? 'right' : 'left', maxW: tw, alpha });
    } else g.text(ctx, txt, pl.x, pl.y + 1, { size, weight: 900, color: '#fff', maxW: tw });
  }

  // ---------- הרשמה ----------
  GK.register('four-in-row', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#161144', accent: '#ffd84d',
    modes: ['cpu', '2p'],
    diffs: true, diffDefault: 0, diffModes: ['cpu'],
    text: TEXT,

    setup(g) { g.s = { keep: { tally: {}, round: 0 } }; },

    init(g) {
      const keep = (g.s && g.s.keep) || { tally: {}, round: 0 };
      const L = layout(g.W, g.H), vsCpu = g.mode !== '2p';
      let starter = 1;
      if (!g.demo && !vsCpu) { keep.round++; starter = keep.round % 2 ? 1 : 2; }
      const x3 = colX(L, 3);
      const S = g.s = {
        keep, L, vsCpu, P: newPos(starter), t: 0, cursor: 3, gx: x3, pgx: x3, cpuCol: 3, falling: [], lock: false, think: null,
        win: null, over: false, drawn: false, last: null, press: null, nudge: null, mood: [0, 'idle', 'idle'], moodUntil: [0, 0, 0], blink: [0, 0, 0],
        streak: vsCpu ? (+g.load('streak' + g.diff, 0) || 0) : 0, botT: 0, demoT: 1.5,
      };
      if (g.demo) {
        // משחק באמצע, מאחורי התפריט
        const rnd = g.seeded(23);
        for (let i = 0; i < 13; i++) {
          const ok = ORDER.filter(c => { if (S.P.h[c] >= ROWS) return false; const r = S.P.h[c]; S.P.cells[at(c, r)] = S.P.turn; const w = winsAt(S.P.cells, c, r, S.P.turn); S.P.cells[at(c, r)] = 0; return !w; });
          const c = ok[Math.min(ok.length - 1, Math.floor(Math.pow(rnd(), 1.6) * ok.length))];
          const r = drop(S.P, c);
          S.last = { c, r, p: 3 - S.P.turn };
        }
        return;
      }
      if (!vsCpu) g.after(0.2, () => g.msg(g.t('starts', { name: g.t(starter === 1 ? 'p1' : 'p2') }), 1300, SKIN[starter].glow));
      beginTurn(g);
    },

    step(g) {
      const S = g.s;
      S.t += 1 / 60;
      stepWorld(g);
      if (S.pendingEnd && S.t >= S.pendingEnd.at) { const o = S.pendingEnd.o; S.pendingEnd = null; g.end(o); return; }
      if (g.state === 'play') stepCpu(g);
      if (g.state === 'play') hud(g);
    },

    idle(g) {
      const S = g.s;
      if (!S || !S.L) return;
      S.t += 1 / 60;
      if (g.demo && S.t > S.demoT) {
        S.demoT = S.t + 1.1 + Math.random() * 0.8;
        const opts = ORDER.filter(c => S.P.h[c] < ROWS && c !== S.cursor);
        if (opts.length) S.cursor = opts[Math.floor(Math.random() * opts.length)];
      }
      stepWorld(g);
    },

    // בוט לבדיקות (GK.bot): משחק בתור האדם דרך אותה פונקציה שהלחיצה משתמשת בה
    bot(g) {
      const S = g.s;
      if (!humanTurn(g)) { S.botT = 0; return; }
      if (++S.botT < 16) return;
      S.botT = 0;
      const c = botPick(S.P, Math.random);
      setCursor(g, c);
      humanDrop(g, c);
    },

    onKey(g, e) {
      const S = g.s, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') setCursor(g, Math.max(0, S.cursor - 1));
      else if (c === 'ArrowRight' || c === 'KeyD') setCursor(g, Math.min(COLS - 1, S.cursor + 1));
      else if (e.repeat) return;
      else if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter' || c === 'ArrowDown' || c === 'KeyS') humanDrop(g, S.cursor);
      else {
        const m = /^(?:Digit|Numpad)([1-7])$/.exec(c);
        if (m) { setCursor(g, +m[1] - 1); humanDrop(g, +m[1] - 1); }
      }
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S || !S.L) return;
      const L = S.L;
      const inX = p.x >= L.px - 12 && p.x <= L.px + L.pw + 12;
      const c = inX ? Math.max(0, Math.min(COLS - 1, Math.floor((p.x - L.px - L.PAD) / L.CS))) : -1;
      const inY = p.y >= L.top && p.y <= L.legB;
      if (type === 'down') {
        if (c < 0 || !inY) return;
        S.press = { id: p.id };
        setCursor(g, c);
      } else if (type === 'move') {
        const pressing = S.press && S.press.id === p.id;
        if (c >= 0 && (inY || pressing)) setCursor(g, c);
        g.canvas.style.cursor = c >= 0 && inY && humanTurn(g) ? 'pointer' : 'default';
      } else if (type === 'up') {
        if (!S.press || S.press.id !== p.id) return;
        S.press = null;
        if (c >= 0) humanDrop(g, c);
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S || !S.L) return;
      const L = S.L, P = S.P, t = S.t + alpha / 60, C = sprites(ctx, L);
      drawBg(ctx, g.W, g.H, t);
      // לאן הדמויות מסתכלות: על הדיסקית שנופלת, או על זו שמחכה מעל הלוח
      const f = S.falling[S.falling.length - 1];
      const look = S.win ? { x: colX(L, S.win.cells[0][0]), y: rowY(L, S.win.cells[0][1]) } : f ? { x: colX(L, f.c), y: f.y } : { x: S.gx, y: L.gy };
      for (const p of [1, 2]) drawCard(g, ctx, S, p, t, look);
      // פנים הלוח (כהה, כדי שחורים ריקים ייראו עמוקים)
      ctx.fillStyle = 'rgba(4,6,32,.62)';
      g.rr(ctx, L.px + 6, L.py + 6, L.pw - 12, L.ph - 12, L.CS * 0.26); ctx.fill();
      for (let c = 0; c < COLS; c++) for (let r = 0; r < P.h[c]; r++) {
        if (S.falling.length && S.falling.some(d => d.c === c && d.r === r)) continue;
        disc(ctx, C, P.cells[at(c, r)], colX(L, c), rowY(L, r));
      }
      for (const d of S.falling) disc(ctx, C, d.p, colX(L, d.c), d.py + (d.y - d.py) * alpha);
      ctx.drawImage(C.plate, L.px - C.m, L.py - C.m, C.pw, C.ph);
      const human = humanTurn(g) || (g.demo && !S.over);
      // העמודה שנבחרה מוארת, ורואים איפה הדיסקית תנחת
      if (human) {
        const c = S.cursor, x = colX(L, c);
        const bm = ctx.createLinearGradient(0, L.py, 0, L.py + L.ph);
        bm.addColorStop(0, 'rgba(255,255,255,.16)'); bm.addColorStop(1, 'rgba(255,255,255,.03)');
        ctx.fillStyle = bm; g.rr(ctx, x - L.CS / 2 + 4, L.py + 5, L.CS - 8, L.ph - 10, L.CS * 0.3); ctx.fill();
        if (P.h[c] < ROWS && !g.demo) { ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 6); disc(ctx, C, P.turn, x, rowY(L, P.h[c])); ctx.globalAlpha = 1; }
      }
      // המהלך האחרון מסומן בטבעת
      if (S.last && !S.win && !S.falling.length) {
        const x = colX(L, S.last.c), y = rowY(L, S.last.r);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.18 * Math.sin(t * 4)).toFixed(3) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, L.HR + 1.5, 0, TAU); ctx.stroke();
      }
      // ניצחון: הלוח מחשיך, הדיסקיות המנצחות פועמות וזוהרות וקו אור עובר דרכן
      if (S.win && t > S.win.t0 + 0.22) {
        const e = t - S.win.t0 - 0.22, k = Math.min(1, e / 0.35);
        ctx.save(); ctx.globalAlpha = 0.45 * k; ctx.fillStyle = '#05061a'; ctx.beginPath(); rrPath(ctx, L.px, L.py, L.pw, L.ph, L.CS * 0.3); ctx.fill(); ctx.restore();
        const sc = 1 + (0.05 + 0.04 * Math.sin(e * 7)) * k;
        ctx.save(); ctx.shadowColor = SKIN[S.win.p].glow; ctx.shadowBlur = 26 * k;
        for (const [c, r] of S.win.cells) { const s = C.ds * sc; ctx.drawImage(C[S.win.p], colX(L, c) - s / 2, rowY(L, r) - s / 2, s, s); }
        ctx.restore();
        const q = g.ease.out(Math.min(1, e / 0.45));
        for (const seg of S.win.lines) {
          const a = seg[0], b = seg[seg.length - 1];
          const x1 = colX(L, a[0]), y1 = rowY(L, a[1]), x2 = colX(L, b[0]), y2 = rowY(L, b[1]);
          ctx.save(); ctx.lineCap = 'round';
          ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
          ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = L.CS * (0.12 + 0.025 * Math.sin(e * 8));
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); ctx.stroke();
          ctx.strokeStyle = SKIN[S.win.p].light; ctx.lineWidth = L.CS * 0.05; ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); ctx.stroke();
          ctx.restore();
        }
      }
      // הדיסקית שמחכה מעל הלוח (של האדם, או של המחשב כשהוא מתלבט)
      if ((human || S.think) && !S.over) {
        let x = S.pgx + (S.gx - S.pgx) * alpha;
        const y = L.gy + Math.sin(t * 3.5) * 2.5, col = S.think ? S.cpuCol : S.cursor;
        if (S.nudge) x += Math.sin(S.nudge.t * 1.6) * 7 * (1 - S.nudge.t / 20);
        ctx.globalAlpha = P.h[col] >= ROWS ? 0.45 : 1;
        disc(ctx, C, P.turn, x, y);
        ctx.globalAlpha = 1;
      }
      drawPill(g, ctx, S, t);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.3, 30, w * 0.5, h * 0.5, w * 0.72);
      bg.addColorStop(0, '#3b2c94'); bg.addColorStop(1, '#0d0a2a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      drawBg2(ctx, w, h);
      const CS = 62, PAD = 12;
      const L = { CS, PAD, pw: CS * COLS + PAD * 2, ph: CS * ROWS + PAD * 2, HR: CS * 0.41, DR: CS * 0.37 };
      L.px = Math.round((w - L.pw) / 2); L.py = 116; L.legB = L.py + L.ph + 22;
      ctx.save();
      ctx.translate(w / 2, h * 0.62); ctx.rotate(-0.045); ctx.translate(-w / 2, -h * 0.62);
      ctx.fillStyle = 'rgba(4,6,32,.65)'; k.rr(ctx, L.px + 6, L.py + 6, L.pw - 12, L.ph - 12, CS * 0.26); ctx.fill();
      const cols = [[1, 2], [1, 2], [2, 1, 2], [1, 2, 1, 2], [2, 1, 2, 1], [1, 2], []];
      const win = [[1, 0], [2, 1], [3, 2], [4, 3]];
      for (let c = 0; c < COLS; c++) cols[c].forEach((p, r) => paintDisc(ctx, colX(L, c), rowY(L, r), L.DR, p));
      paintPlate(ctx, L, L.px, L.py);
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = "#05061a"; ctx.beginPath(); rrPath(ctx, L.px, L.py, L.pw, L.ph, CS * 0.3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = '#ff6b81'; ctx.shadowBlur = 30;
      for (const [c, r] of win) paintDisc(ctx, colX(L, c), rowY(L, r), L.DR * 1.08, 1);
      ctx.restore();
      ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = CS * 0.14;
      ctx.beginPath(); ctx.moveTo(colX(L, 1), rowY(L, 0)); ctx.lineTo(colX(L, 4), rowY(L, 3)); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffb3be'; ctx.lineWidth = CS * 0.05;
      ctx.beginPath(); ctx.moveTo(colX(L, 1), rowY(L, 0)); ctx.lineTo(colX(L, 4), rowY(L, 3)); ctx.stroke();
      ctx.restore();
      // דיסקית צהובה שמאחרת את הרכבת — נופלת מלמעלה
      const fx = colX(L, 5), fy = L.py - 40;
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffd84d';
      for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.28 - i * 0.07; ctx.beginPath(); ctx.arc(fx, fy - i * 26, L.DR * (1 - i * 0.08), 0, TAU); ctx.fill(); }
      ctx.restore();
      paintDisc(ctx, fx, fy, L.DR, 2);
      ctx.restore();
      drawBuddy(ctx, 118, 392, 86, 1, 'happy', 0.6, -0.2, false);
      drawRobot(ctx, 846, 372, 86, 'wow', -0.8, 0.1, false, 0);
      const conf = ['#ff4d6d', '#ffd84d', '#5ef0ff', '#7cff8a', '#ffffff', '#b38cff'];
      for (let i = 0; i < 46; i++) {
        const a = i * 2.39996, r = 70 + (i * 37) % 300;
        const x = w * 0.5 + Math.cos(a) * r * 1.35, y = h * 0.42 + Math.sin(a) * r * 0.62;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3); ctx.fillStyle = conf[i % conf.length]; ctx.globalAlpha = 0.9;
        ctx.fillRect(-5, -3, 10, 6); ctx.restore();
      }
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0.65, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { newPos, drop, winsAt, lineAt, evaluate, makeSearch, cpuPlan, botPick, centerPick, threatsThrough, LEVELS, ORDER, COLS, ROWS, at },
  });

  // אורות רכים לתמונת הכרטיס
  function drawBg2(ctx, w, h) {
    const cols = ['255,80,110', '255,210,70', '120,150,255', '190,120,255'];
    for (let i = 0; i < 12; i++) {
      const r = 60 + (i * 41) % 90, x = (i * 211.3) % w, y = (i * 127.7) % h;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + cols[i % 4] + ',.16)'); rg.addColorStop(1, 'rgba(' + cols[i % 4] + ',0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
})();
