// ============================================================
//  אל תעירו את אבא — משחק 2D של URotation (המנוע: g2d/kit.js)
//  התגנבות מצחיקה במבט מלמעלה: מהחדר שלך למטבח, לוקחים עוגייה מהצנצנת וחוזרים למיטה.
//  אבא נוחר על הספה. ריצה, קרשים חורקים, צעצועים מצפצפים ונקישות ברהיטים יוצרים גלי רעש;
//  גל שמגיע לאבא ממלא את מד השינה, ומד מלא = אבא מתעורר ("!"). כשהמד גבוה (ובשלבים
//  מתקדמים גם סתם) אבא מציץ — מתחבאים מאחורי רהיטים. חתולה שמייללת, כלב שנובח.
//  כל שלב עביר: בוט שמשחק דרך אותו קלט של שחקן מסיים את כולם (ראו g2dtools/tests/dont-wake-dad).
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600, T = 30, COLS = 32, ROWS = 20;
  const KR = 10, SNEAK = 1.35, RUN = 2.7;               // הילד: רדיוס, מהירות התגנבות וריצה
  const WARN = 75, LOOK = 165, HALF = 0.42, SWEEP = 0.62, RANGE = 520;   // הצצה של אבא
  const DOG_R = 78, CAT_R = 58;
  const NC = 15, NW = W / NC, NH = H / NC;             // רשת הניווט של הבוט
  const U = GK.U, clamp = U.clamp, lerp = U.lerp;
  const TAU = Math.PI * 2;
  const NOISE = {   // רדיוס הגל, כמה הוא ממלא את המד, צבע
    step: { R: 150, a: 6, c: '#9fd3ff' }, tok: { R: 90, a: 4, c: '#9fd3ff' }, bonk: { R: 210, a: 18, c: '#ffd166' },
    creak: { R: 230, a: 20, c: '#ffd166' }, creakRun: { R: 280, a: 28, c: '#ff9a5a' }, squeak: { R: 250, a: 24, c: '#ffd166' },
    meow: { R: 240, a: 22, c: '#ffb3e6' }, woof: { R: 300, a: 30, c: '#ff7a59' },
  };

  // ----- שלבים (32×20 משבצות של 30) -----
  // # קיר · . פרקט · , אריחים · ~ שטיח (ריצה שקטה) · _ שטיח בחדר שלך (שקט) · c קרש חורק
  // רהיטים: S ספה (Z = הראש של אבא) · A כורסה · B מדף ספרים · T שולחן · h כיסא · K שיש (J = צנצנת העוגיות)
  //   F מקרר · V טלוויזיה · L עציץ · E המיטה שלך · X שידה
  // P התחלה · o עוגייה בונוס · t צעצוע מצפצף · g הכלב · 1-4 המסלול של החתולה
  const MAP1 = [
    '################################',
    '#EE___XX_#....BBBB..L#,KKKJKKKF#',
    '#EE______#...........#,,,,,,,,F#',
    '#EE______#...........#,,,,,,,,,#',
    '#________#...........#,,,,,,,,,#',
    '#__P_____#.....c.....#,,,,,,,,,#',
    '#________..c.........#,,,,,,,,,#',
    '#________.........c..#,,,,,,,,,#',
    '#________#...........#,,,TTT,,,#',
    '##########............,,hTTTh,,#',
    '#.....................,,,TTT,,,#',
    '#...........ZSSSS....#,,,,,,,,,#',
    '#...........SSSSS....#,,,,,,,,,#',
    '#..........~~~~~~~...#,,,,,,,,,#',
    '#..........~~TTT~~AA.#,,,,,,,,,#',
    '#..........~~TTT~~AA.#,,,,,,,,,#',
    '#..........~~~~~~~...#,,,,,,,,,#',
    '#.............o......#,,,,,,,o,#',
    '#BBBB........VVV....L#,,,,,,,,,#',
    '################################',
  ];
  const MAP2 = [
    '################################',
    '#FKKJK,,,,,#........#XX______EE#',
    '#F,,,,,,,,,#..t.....#________EE#',
    '#,,,,,,,,,,#......t.#________EE#',
    '#,,,TT,,,,,,....t....__________#',
    '#,,,TT,,,,,,.t.......___P______#',
    '#,,,,,,,,,,#...t....#________XX#',
    '#,,,,,,,,,o#......t.#__________#',
    '#,,,,,,,,,,#........#__________#',
    '######,,#######..########..#####',
    '#..............cc..............#',
    '#L............................L#',
    '#......AA....ZSSSSS...AA.......#',
    '#......AA....SSSSSS...AA.......#',
    '#........~~~~~~~~~~~~~~........#',
    '#........~~~~TTTTTT~~~~........#',
    '#........~~~~~~~~~~~~~~........#',
    '#...............o..............#',
    '#BBB...........VVVV...........B#',
    '################################',
  ];
  const MAP3 = [
    '################################',
    '#BB.............#FKKKKJKKKK,,,,#',
    '#....hTTTh......#F,,,,,,,,,,,,,#',
    '#....hTTTh......#,,,,,,,,,,,,,,#',
    '#...............#,,,,TTT,,,,,,,#',
    '#.L.............#,,,,TTT,,,,,o,#',
    '#...............#,,,,,,,,,,,,,,#',
    '#...............#######,,#######',
    '#.......AA.....................#',
    '#ZS.....AA.............L.......#',
    '#SS.........~~~~~..BB..........#',
    '#SS.........~~~~~..BB..........#',
    '#SS.........L...........L......#',
    '#..............................#',
    '####..###########..#############',
    '#,,,,,,,,,,,,#______________EE_#',
    '#,,,,,,,,,,,,#____P_________EE_#',
    '#,o,,,,,,,,,,#XX____________EE_#',
    '#XXX,,,,,,,,,#_________________#',
    '################################',
  ];
  const MAP4 = [
    '################################',
    '#BBB.....VVV.....L#KKKKJKKKK,FF#',
    '#........o........#,,,,,,,,,,FF#',
    '#....~~~~~~~~~....#,,,,,,,,,,,,#',
    '#....~~~TTT~~~....#,,,,TTTT,,,,#',
    '#....~~~~~~~~~....#,,,,TTTT,,,,#',
    '#....ZSSSSS.......#,,,,,,,,,,,,#',
    '#....SSSSSS.....AA#,,,,,,,,,,,,#',
    '##############..########,,######',
    '#.1...............c............#',
    '#.........c..................2.#',
    '####..################..########',
    '#______________#,,,,,,,,,,,,,,,#',
    '#___P__________#,,,,,,,,,,,,,,,#',
    '#______________#,,,,,,,,,,o,,,,#',
    '#______________#,,,,,,,,,,,,,,,#',
    '#EE____________#,,,,,,,,,,,,XXX#',
    '#EE__________XX#,,,,,,,,,,,,XXX#',
    '#EE____________#,,,,,,,,,,,,,,,#',
    '################################',
  ];
  const MAP5 = [
    '################################',
    '#EE___XX#LBB.ZSSSS..BBL#KKJKKFF#',
    '#EE_____#..c.SSSSS..c..#,,,,,FF#',
    '#EE_____#..c.....c.....#,,,,,,,#',
    '#_______#..c....oc.....#,,TT,,,#',
    '#_______#..c..c..c..c~~#,,TT,,,#',
    '#___P___#.Lc..c~~c..c~~#,,,,,,,#',
    '#_______#..c..c~~c..c~~#,,,,,,,#',
    '#_______#..c..c~~cL.c~~#,,,,,,,#',
    '#_______...c.Lc~~c..c..,,,,,,,,#',
    '#_______...c..c~~c..c..,,,,,,,,#',
    '#_______#..c..c~~c..c..#,,,,,,,#',
    '#_______#..c..cL~c..c.L#,,,,,,,#',
    '#_______#..c..c~~c..c..#,,,,,,,#',
    '#_______#..c..c..c..c..#,,,,,,,#',
    '#XX_____#.....c.....c..#,,,,,,,#',
    '#XX_____#.....c.....c..#,,,,,,,#',
    '#_______#..c..c..c..c..#,o,,,,,#',
    '#_______#..c..c..c..c..#,,,,,,,#',
    '################################',
  ];
  const MAP6 = [
    '################################',
    '#L................BB.#XX_____EE#',
    '#.....h..h...c.......#_______EE#',
    '#....TTTTTT..........._______EE#',
    '#....TTTTTT.....c.....___P_____#',
    '#.....h..h........c..#_________#',
    '#...........c...t....#_________#',
    '#o...................#_______XX#',
    '###..#########..########..######',
    '#,,,,,,,,#....................L#',
    '#K,,,,,,,#.....................#',
    '#K,,,,,,,#......ZSSSS..........#',
    '#K,,TT,,,#......SSSSS..........#',
    '#J,,TT,,,#.....................#',
    '#K,,,,,,,..g...................#',
    '#K,,,,,,,.....~~~~~~~~~~.......#',
    '#K,,,,,,,#....~~~TTT~~~~...AA..#',
    '#F,,,,,,,#...o~~~~~~~~~~...AA..#',
    '#F,,,,,,,#L......VVV..........L#',
    '################################',
  ];
  const LEVELS = [
    { map: MAP1, look: 90, peek: null, decay: 0.12, tip: 'tip1' },
    { map: MAP2, look: 90, peek: null, decay: 0.11, tip: 'tip2' },
    { map: MAP3, look: 0, peek: [6, 10], decay: 0.1, tip: 'tip3' },
    { map: MAP4, look: 270, peek: [12, 18], decay: 0.1, tip: 'tip4' },
    { map: MAP5, look: 90, peek: null, decay: 0.09, tip: 'tip5' },
    { map: MAP6, look: 90, peek: [10, 15], decay: 0.09, tip: 'tip6' },
    { map: MAP1, mirror: true, look: 90, peek: [8, 12], decay: 0.08, tip: 'tip7', add: [[12, 3, '1'], [20, 3, '2'], [20, 8, '3'], [12, 8, '4'], [8, 5, 'g']] },
    { map: MAP4, mirror: true, look: 270, peek: [7, 11], decay: 0.08, tip: 'tip8', add: [[3, 5, 'g'], [28, 14, 't'], [24, 16, 't'], [22, 12, 't']] },
  ];

  // ----- פענוח שלב -----
  const FURN = 'SZABThKJFVLEX', FLOOR = '.,~_c', GROUP = { Z: 'S', J: 'K' };
  const key = ch => GROUP[ch] || ch;
  function parse(def) {
    let rows = def.map;
    if (def.mirror) rows = rows.map(r => [...r].reverse().join(''));
    const gr = rows.map(r => [...r]);
    for (const [x, y, ch] of def.add || []) gr[y][x] = ch;
    const L = {
      wall: new Uint8Array(COLS * ROWS), floor: [], creak: new Uint8Array(COLS * ROWS), furn: [], toys: [], cookies: [], cat: [], dog: null,
      start: null, jar: null, bed: null, dad: null, peek: def.peek, decay: def.decay, tip: def.tip,
      look: ((def.mirror ? 180 - def.look : def.look) + 360) % 360 * Math.PI / 180,
    };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = gr[y][x], i = y * COLS + x;
      if (ch === '#') { L.wall[i] = 1; L.floor[i] = '#'; continue; }
      if (FLOOR.includes(ch)) { L.floor[i] = ch === 'c' ? '.' : ch; if (ch === 'c') L.creak[i] = 1; continue; }
      const cnt = {};       // משהו על הרצפה: הרצפה מתחתיו = הנפוצה סביבו
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const c = (gr[y + dy] || [])[x + dx];
        if (c && FLOOR.includes(c)) { const f = c === 'c' ? '.' : c; cnt[f] = (cnt[f] || 0) + 1; }
      }
      let best = '.', bn = 0;
      for (const f in cnt) if (cnt[f] > bn) { bn = cnt[f]; best = f; }
      L.floor[i] = best;
      const px = x * T + T / 2, py = y * T + T / 2;
      if (ch === 'P') L.start = { x: px, y: py };
      else if (ch === 'o') L.cookies.push({ x: px, y: py });
      else if (ch === 't') L.toys.push({ x: px, y: py });
      else if (ch === 'g') L.dog = { x: px, y: py };
      else if (ch >= '1' && ch <= '4') L.cat[+ch - 1] = { x: px, y: py };
    }
    L.cat = L.cat.filter(Boolean);
    const used = new Uint8Array(COLS * ROWS);
    const same = (x, y, k) => x < COLS && y < ROWS && !used[y * COLS + x] && FURN.includes(gr[y][x]) && key(gr[y][x]) === k;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = gr[y][x];
      if (!FURN.includes(ch) || used[y * COLS + x]) continue;
      const k = key(ch);
      let w = 1, h = 1;
      while (same(x + w, y, k)) w++;
      while ([...Array(w)].every((_, j) => same(x + j, y + h, k))) h++;
      const f = { k, x: x * T, y: y * T, w: w * T, h: h * T, tx: x, ty: y, tw: w, th: h, see: k !== 'S', rat: 0, cd: 0, seed: x * 31 + y * 17 };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        used[(y + j) * COLS + x + i] = 1;
        const c = gr[y + j][x + i];
        if (c === 'Z') L.dad = { tx: x + i, ty: y + j, f };
        if (c === 'J') L.jar = { x: (x + i) * T + T / 2, y: (y + j) * T + T / 2, f };
      }
      if (k === 'E') L.bed = f;
      L.furn.push(f);
    }
    // הראש של אבא בקצה הספה, והגוף לאורכה
    const d = L.dad, f = d.f;
    if (f.tw >= f.th) { const left = d.tx === f.tx; d.x = left ? f.x + 19 : f.x + f.w - 19; d.y = f.y + f.h / 2; d.ang = left ? 0 : Math.PI; d.len = f.w; d.wid = f.h; }
    else { const top = d.ty === f.ty; d.x = f.x + f.w / 2; d.y = top ? f.y + 19 : f.y + f.h - 19; d.ang = top ? Math.PI / 2 : -Math.PI / 2; d.len = f.h; d.wid = f.w; }
    // מלבני התנגשות: שורות קיר רצופות + רהיטים
    L.rects = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS;) {
      if (!L.wall[y * COLS + x]) { x++; continue; }
      let e = x; while (e < COLS && L.wall[y * COLS + e]) e++;
      L.rects.push({ x: x * T, y: y * T, w: (e - x) * T, h: T, f: null });
      x = e;
    }
    for (const fu of L.furn) L.rects.push({ x: fu.x + 2, y: fu.y + 2, w: fu.w - 4, h: fu.h - 4, f: fu });
    // רשת חסימת מבט (10 פיקסלים): קירות ורהיטים חוץ מהספה של אבא
    L.block = new Uint8Array(96 * 60);
    for (let j = 0; j < 60; j++) for (let i = 0; i < 96; i++) {
      const x = i * 10 + 5, y = j * 10 + 5;
      if (L.wall[Math.floor(y / T) * COLS + Math.floor(x / T)]) { L.block[j * 96 + i] = 1; continue; }
      for (const fu of L.furn) if (fu.see && x > fu.x + 2 && x < fu.x + fu.w - 2 && y > fu.y + 2 && y < fu.y + fu.h - 2) { L.block[j * 96 + i] = 1; break; }
    }
    return L;
  }
  const PARSED = LEVELS.map(parse);

  // ----- גיאומטריה -----
  function circleHits(L, x, y, r) {
    for (const q of L.rects) {
      const cx = clamp(x, q.x, q.x + q.w), cy = clamp(y, q.y, q.y + q.h);
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
    return false;
  }
  function blocked(L, x, y) { const i = Math.floor(x / 10), j = Math.floor(y / 10); return i < 0 || j < 0 || i >= 96 || j >= 60 || L.block[j * 96 + i] === 1; }
  function los(L, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5);
    for (let k = 2; k < n; k++) { const t = k / n; if (blocked(L, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  function rayLen(L, x, y, a) { const dx = Math.cos(a) * 5, dy = Math.sin(a) * 5; let d = 0; while (d < RANGE && !blocked(L, x + dx * d / 5, y + dy * d / 5)) d += 5; return d; }
  const tileAt = (x, y) => Math.floor(y / T) * COLS + Math.floor(x / T);

  // ----- רשת הניווט של הבוט (ומבחן העבירות) -----
  function buildNav(L) {
    if (L.free) return;
    L.free = new Uint8Array(NW * NH); L.haz = new Uint8Array(NW * NH); L.exposed = new Uint8Array(NW * NH);
    const d = L.dad;
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const x = i * NC + NC / 2, y = j * NC + NC / 2, c = j * NW + i;
      L.free[c] = circleHits(L, x, y, KR + 2) ? 0 : 1;
      let hz = 0;
      for (let ty = Math.floor((y - 7) / T); ty <= Math.floor((y + 7) / T) && !hz; ty++) for (let tx = Math.floor((x - 7) / T); tx <= Math.floor((x + 7) / T); tx++) if (tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && L.creak[ty * COLS + tx]) { hz = 1; break; }
      for (const t of L.toys) if (Math.hypot(t.x - x, t.y - y) < KR + 13) hz = 1;   // הצפצוף מתחיל ב-KR+8
      if (L.dog && Math.hypot(L.dog.x - x, L.dog.y - y) < DOG_R + 16) hz = 1;
      L.haz[c] = hz;
      const dd = Math.hypot(x - d.x, y - d.y);
      L.exposed[c] = dd < RANGE && Math.abs(angDiff(Math.atan2(y - d.y, x - d.x), L.look)) < SWEEP + HALF + 0.05 && los(L, d.x, d.y, x, y) ? 1 : 0;
    }
    L.cookieCells = L.cookies.map(c => nearFree(L, c.x, c.y, 18));
  }
  const navIdx = (x, y) => clamp(Math.floor(y / NC), 0, NH - 1) * NW + clamp(Math.floor(x / NC), 0, NW - 1);
  const cellX = c => (c % NW) * NC + NC / 2, cellY = c => Math.floor(c / NW) * NC + NC / 2;
  const DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DY8 = [0, 0, 1, -1, 1, -1, 1, -1];
  // A* על הרשת. מחיר: צעד, +400 על מפגע (קרש חורק, צעצוע, הכלב), ועוד מחיר זמני ליד החתולה
  function astar(L, s, t, extra, noHaz) {
    const N = NW * NH, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const tx = t % NW, ty = Math.floor(t / NW);
    const hf = i => { const dx = Math.abs(i % NW - tx), dy = Math.abs(Math.floor(i / NW) - ty); return dx + dy - 0.586 * Math.min(dx, dy); };
    const heap = [];
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    g[s] = 0; push(hf(s), s);
    while (heap.length) {
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === t) break;
      const x = i % NW, y = Math.floor(i / NW);
      for (let k = 0; k < 8; k++) {
        const nx = x + DX8[k], ny = y + DY8[k];
        if (nx < 0 || ny < 0 || nx >= NW || ny >= NH) continue;
        const j = ny * NW + nx;
        if (!L.free[j] || closed[j] || (noHaz && L.haz[j])) continue;
        if (k >= 4 && (!L.free[y * NW + nx] || !L.free[ny * NW + x] || ((L.haz[y * NW + nx] || L.haz[ny * NW + x]) && !L.haz[i]))) continue;   // לא חותכים פינה של מפגע
        const c = g[i] + (k >= 4 ? 1.414 : 1) + (L.haz[j] ? 400 : 0) + (extra ? extra[j] : 0);
        if (c < g[j]) { g[j] = c; came[j] = i; push(c + hf(j), j); }
      }
    }
    if (s !== t && came[t] < 0) return null;
    const path = [];
    for (let i = t; i !== s; i = came[i]) path.push(i);
    return path.reverse();
  }
  // התא הפנוי הקרוב לנקודה (צנצנת על השיש, המיטה)
  function nearFree(L, x, y, maxD) {
    let best = -1, bd = 1e9;
    for (let c = 0; c < NW * NH; c++) { if (!L.free[c] || L.haz[c]) continue; const d = Math.hypot(cellX(c) - x, cellY(c) - y); if (d < bd && d <= maxD) { bd = d; best = c; } }
    return best;
  }
  function bedDist(L, x, y) { const b = L.bed; const cx = clamp(x, b.x + 2, b.x + b.w - 2), cy = clamp(y, b.y + 2, b.y + b.h - 2); return Math.hypot(x - cx, y - cy); }
  function bedCell(L) {
    let best = -1, bd = 1e9;
    for (let c = 0; c < NW * NH; c++) { if (!L.free[c] || L.haz[c]) continue; const d = bedDist(L, cellX(c), cellY(c)); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  // ----- מצב המשחק -----
  function makeState(g) {
    const n = clamp(g.level || 1, 1, LEVELS.length), L = PARSED[n - 1];
    buildNav(L);
    const S = {
      n, L, t: 0, meter: 0, quietT: 0, maxMeter: 0, rings: [], words: [],
      kid: { x: L.start.x, y: L.start.y, vx: 0, vy: 0, face: -Math.PI / 2, walk: 0, step: 0, moving: false },
      dad: { state: 'sleep', t: 0, gaze: L.look, look: L.look, breath: 0, bubble: 0, cd: 0, mumble: 0 },
      nextPeek: L.peek ? Math.round(U.rnd(L.peek[0], L.peek[1]) * 60) + 120 : -1,
      cookies: L.cookies.map(c => ({ x: c.x, y: c.y, got: false })), jar: false, got: 0,
      toys: L.toys.map(t => ({ x: t.x, y: t.y, cd: 0, sq: 0 })),
      cat: L.cat.length ? { x: L.cat[0].x, y: L.cat[0].y, wp: 1, wait: 60, face: 0, near: 0, cd: 0, meow: 0, walk: 0 } : null,
      dog: L.dog ? { x: L.dog.x, y: L.dog.y, state: 'sleep', t: 0, far: 0, bark: 0 } : null,
      lastCreak: -1, seen: 0, spotted: false, stats: {}, over: null, overT: 0, ptr: null, ptrId: null, tipT: 0, botDir: null, bot: {},
    };
    for (const f of L.furn) { f.rat = 0; f.cd = 0; }
    return S;
  }

  // ----- רעש -----
  function noise(g, S, x, y, kind, word) {
    const N = NOISE[kind];
    S.stats[kind] = (S.stats[kind] || 0) + 1;
    S.rings.push({ x, y, r: 0, R: N.R, a: N.a, c: N.c, dad: false, dog: false });
    if (S.rings.length > 24) S.rings.shift();
    if (word && !g.demo) g.float(x, y - 22, g.t(word), { color: N.c, size: word === 'woof' ? 26 : 21, life: 60 });
  }
  function stepRings(g, S) {
    const d = S.dad;
    for (let i = S.rings.length - 1; i >= 0; i--) {
      const r = S.rings[i];
      r.r += 7;
      const dd = Math.hypot(r.x - S.L.dad.x, r.y - S.L.dad.y);
      if (!r.dad && r.r >= dd) {
        r.dad = true;
        if (dd < r.R && d.state !== 'awake') {
          S.meter += r.a * (1 - 0.4 * dd / r.R);
          S.quietT = 0;
          d.bubble = 0;                 // בועת השינה מתפוצצת
          d.mumble = 70;
        }
      }
      if (S.dog && !r.dog && r.r >= Math.hypot(r.x - S.dog.x, r.y - S.dog.y)) {
        r.dog = true;
        if (r.a >= 12 && Math.hypot(r.x - S.dog.x, r.y - S.dog.y) < r.R && S.dog.state === 'sleep') { S.dog.state = 'alert'; S.dog.t = 30; }
      }
      if (r.r > r.R) S.rings.splice(i, 1);
    }
  }
  const SND = {
    creak(g) { g.tone({ type: 'sawtooth', f: 210, f2: 150, dur: 0.32, vol: 0.06 }); g.tone({ type: 'square', f: 105, f2: 92, dur: 0.3, vol: 0.035, delay: 0.04 }); g.tone({ type: 'sawtooth', f: 260, f2: 170, dur: 0.18, vol: 0.04, delay: 0.16 }); },
    squeak(g) { g.tone({ f: 1300, f2: 2300, dur: 0.11, vol: 0.12 }); g.tone({ f: 2200, f2: 1250, dur: 0.12, vol: 0.1, delay: 0.11 }); },
    bonk(g) { g.sfx('hit', { p: 1.3 }); },
    tok(g) { g.tone({ type: 'triangle', f: 260, f2: 160, dur: 0.06, vol: 0.08 }); },
    step(g) { g.noise({ f: 900, f2: 300, dur: 0.06, vol: 0.09 }); },
    meow(g) { g.tone({ type: 'triangle', f: 560, f2: 880, dur: 0.17, vol: 0.13 }); g.tone({ type: 'triangle', f: 880, f2: 470, dur: 0.26, vol: 0.13, delay: 0.16 }); },
    woof(g) { for (const dl of [0, 0.2]) { g.noise({ f: 900, f2: 180, dur: 0.14, vol: 0.2, delay: dl }); g.tone({ type: 'square', f: 190, f2: 110, dur: 0.12, vol: 0.08, delay: dl }); } },
  };

  // ----- הילד: תנועה, התנגשות, מפגעים -----
  function moveKid(g, S, dx, dy, run) {
    const k = S.kid, L = S.L;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    const sp = run ? RUN : SNEAK;
    k.vx = lerp(k.vx, dx * sp, 0.35); k.vy = lerp(k.vy, dy * sp, 0.35);
    if (Math.abs(k.vx) < 0.02) k.vx = 0;
    if (Math.abs(k.vy) < 0.02) k.vy = 0;
    k.x += k.vx; k.y += k.vy;
    const speed = Math.hypot(k.vx, k.vy);
    k.moving = speed > 0.3;
    if (len > 0.1) k.face = Math.atan2(dy, dx);
    for (let it = 0; it < 3; it++) for (const q of L.rects) {
      const cx = clamp(k.x, q.x, q.x + q.w), cy = clamp(k.y, q.y, q.y + q.h);
      let ox = k.x - cx, oy = k.y - cy, d2 = ox * ox + oy * oy;
      if (d2 >= KR * KR) continue;
      let nx, ny;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = ox / d; ny = oy / d; k.x += nx * (KR - d); k.y += ny * (KR - d); }
      else {
        const l = k.x - q.x, r = q.x + q.w - k.x, t = k.y - q.y, b = q.y + q.h - k.y, m = Math.min(l, r, t, b);
        if (m === l) { nx = -1; ny = 0; k.x = q.x - KR; } else if (m === r) { nx = 1; ny = 0; k.x = q.x + q.w + KR; } else if (m === t) { nx = 0; ny = -1; k.y = q.y - KR; } else { nx = 0; ny = 1; k.y = q.y + q.h + KR; }
      }
      const vn = k.vx * nx + k.vy * ny;
      if (vn < 0) {
        k.vx -= vn * nx; k.vy -= vn * ny;
        const f = q.f;
        if (f && f.cd === 0 && -vn > 0.85) {      // נקישה ברהיט
          f.cd = 45; f.rat = 1;
          if (-vn > 1.9) { noise(g, S, k.x - nx * KR, k.y - ny * KR, 'bonk', 'bonk'); SND.bonk(g); g.shake(3); }
          else { noise(g, S, k.x - nx * KR, k.y - ny * KR, 'tok'); SND.tok(g); }
        }
      }
    }
    // צעדים (ריצה רועשת, חוץ משטיחים); הליכה שקטה עם טיק עדין
    const tile = tileAt(k.x, k.y), fl = L.floor[tile], soft = fl === '~' || fl === '_';
    if (k.moving) {
      k.walk += speed * 0.16;
      if (++k.step >= (run ? 15 : 24)) {
        k.step = 0;
        if (run && speed > 1.6 && !soft) { noise(g, S, k.x, k.y, 'step'); SND.step(g); }
        else g.tone({ type: 'triangle', f: 1400 + Math.random() * 200, dur: 0.025, vol: 0.02 });
      }
    }
    // קרש חורק
    if (L.creak[tile]) {
      if (tile !== S.lastCreak) { S.lastCreak = tile; noise(g, S, k.x, k.y, run && speed > 1.6 ? 'creakRun' : 'creak', 'creak'); SND.creak(g); }
    } else S.lastCreak = -1;
    // צעצועים
    for (const t of S.toys) {
      if (Math.hypot(t.x - k.x, t.y - k.y) < KR + 8) { if (t.cd === 0) { noise(g, S, t.x, t.y, 'squeak', 'squeak'); SND.squeak(g); t.sq = 1; } t.cd = 90; }
      else if (t.cd > 0) t.cd--;
      if (t.sq > 0) t.sq = Math.max(0, t.sq - 0.06);
    }
  }

  // ----- אבא -----
  function stepDad(g, S) {
    const d = S.dad, L = S.L, k = S.kid;
    d.breath += 1;
    if (d.cd > 0) d.cd--;
    if (d.mumble > 0) d.mumble--;
    if (d.state === 'sleep') {
      const ph = d.breath % 190;
      d.bubble = Math.min(1, d.bubble + 0.008);
      if (ph === 0) {       // נחירה — חזקה יותר כשהילד קרוב
        const near = clamp(1 - Math.hypot(k.x - L.dad.x, k.y - L.dad.y) / 650, 0, 1);
        g.noise({ f: 260, f2: 140, dur: 0.55, vol: 0.03 + 0.09 * near, q: 2 });
        g.tone({ type: 'sawtooth', f: 62, f2: 54, dur: 0.5, vol: 0.02 + 0.05 * near });
        g.noise({ filter: 'highpass', f: 2600, f2: 1800, dur: 0.45, vol: 0.012 + 0.03 * near, delay: 0.75 });
      }
      if (S.nextPeek > 0) S.nextPeek--;
      if ((S.meter >= 65 && d.cd === 0) || S.nextPeek === 0) {
        d.state = 'warn'; d.t = WARN;
        if (S.nextPeek === 0) S.nextPeek = Math.round(U.rnd(L.peek[0], L.peek[1]) * 60) + WARN + LOOK;
        g.tone({ f: 300, f2: 390, dur: 0.22, vol: 0.12 }); g.tone({ f: 330, f2: 300, dur: 0.18, vol: 0.08, delay: 0.24 });
      }
    } else if (d.state === 'warn') {
      if (--d.t <= 0) { d.state = 'look'; d.t = LOOK; }
    } else if (d.state === 'look') {
      const p = 1 - d.t / LOOK;
      d.gaze = L.look + SWEEP * Math.sin(-Math.PI / 2 + Math.PI * p);
      const dx = k.x - L.dad.x, dy = k.y - L.dad.y, dd = Math.hypot(dx, dy);
      S.spotted = dd < RANGE && Math.abs(angDiff(Math.atan2(dy, dx), d.gaze)) < HALF && los(L, L.dad.x, L.dad.y, k.x, k.y);
      if (S.spotted) { S.stats.seen = (S.stats.seen || 0) + 1; S.meter += 1.25; S.quietT = 0; if (S.seen === 0) g.sfx('error'); S.seen = 12; }
      if (--d.t <= 0) { d.state = 'sleep'; d.cd = 240; d.gaze = L.look; S.spotted = false; }
    }
    if (S.seen > 0) S.seen--;
    if (S.meter >= 100 && d.state !== 'awake') {
      S.meter = 100; d.state = 'awake'; S.over = 'lose'; S.overT = 0;
      g.tone({ type: 'square', f: 220, f2: 880, dur: 0.25, vol: 0.1 }); g.shake(9); g.flash('#fff3c4', 0.5);
    }
    if (++S.quietT > 75 && d.state !== 'awake') S.meter = Math.max(0, S.meter - L.decay);
    S.maxMeter = Math.max(S.maxMeter, S.meter);
  }
  // ----- החתולה והכלב -----
  function stepCat(g, S) {
    const c = S.cat, k = S.kid;
    if (c.wait > 0) c.wait--;
    else {
      const wp = S.L.cat[c.wp], dx = wp.x - c.x, dy = wp.y - c.y, d = Math.hypot(dx, dy);
      if (d < 1) { c.wp = (c.wp + 1) % S.L.cat.length; c.wait = 60 + Math.floor(Math.random() * 80); }
      else { const v = Math.min(0.8, d); c.x += dx / d * v; c.y += dy / d * v; c.face = Math.atan2(dy, dx); c.walk += 0.12; }
    }
    if (c.cd > 0) c.cd--;
    if (c.meow > 0) c.meow--;
    if (Math.hypot(k.x - c.x, k.y - c.y) < CAT_R) { if (++c.near >= 10 && c.cd === 0) { c.cd = 200; c.meow = 40; noise(g, S, c.x, c.y, 'meow', 'meow'); SND.meow(g); } }
    else c.near = 0;
  }
  function stepDog(g, S) {
    const o = S.dog, k = S.kid, dd = Math.hypot(k.x - o.x, k.y - o.y);
    if (o.bark > 0) o.bark--;
    if (o.state === 'sleep') { if (dd < DOG_R) { o.state = 'alert'; o.t = 30; } }
    else if (o.state === 'alert') { if (--o.t <= 0) { o.state = 'awake'; o.t = 0; o.far = 0; bark(g, S); } }
    else {
      o.t++;
      if (dd < DOG_R + 42) { o.far = 0; if (o.t % 100 === 0) bark(g, S); }
      else if (++o.far > 150) o.state = 'sleep';
    }
  }
  function bark(g, S) { S.dog.bark = 26; noise(g, S, S.dog.x, S.dog.y, 'woof', 'woof'); SND.woof(g); }

  // ----- בוט (לבדיקות): מתכנן מסלול שקט, מתחבא כשאבא מציץ, נזהר מהחתולה -----
  function botStep(S) {
    const L = S.L, k = S.kid, B = S.bot, d = S.dad;
    if (S.over) { S.botDir = { x: 0, y: 0 }; return; }
    const ki = navIdx(k.x, k.y);
    let goal;
    if (d.state === 'warn' || d.state === 'look') {
      if (!L.exposed[ki]) { S.botDir = { x: 0, y: 0 }; return; }
      if (B.hide == null || L.exposed[B.hide]) {
        // התא המוסתר הקרוב (BFS בלי מפגעים)
        const seen = new Uint8Array(NW * NH), q = [ki]; seen[ki] = 1; B.hide = -1;
        for (let h = 0; h < q.length; h++) {
          const i = q[h];
          if (!L.exposed[i] && !L.haz[i]) { B.hide = i; break; }
          for (let m = 0; m < 4; m++) { const nx = i % NW + DX8[m], ny = Math.floor(i / NW) + DY8[m], j = ny * NW + nx; if (nx >= 0 && ny >= 0 && nx < NW && ny < NH && !seen[j] && L.free[j]) { seen[j] = 1; q.push(j); } }
        }
      }
      goal = B.hide;
    } else {
      B.hide = null;
      if (S.cat && Math.hypot(k.x - S.cat.x, k.y - S.cat.y) < 72) {
        // מתרחקים מהחתולה
        let bi = -1, bd = -1;
        for (let m = 0; m < 8; m++) {
          const nx = k.x + DX8[m] * NC, ny = k.y + DY8[m] * NC, j = navIdx(nx, ny);
          if (!L.free[j] || L.haz[j]) continue;
          const dd = Math.hypot(nx - S.cat.x, ny - S.cat.y);
          if (dd > bd) { bd = dd; bi = m; }
        }
        if (bi >= 0) { S.botDir = { x: DX8[bi], y: DY8[bi] }; return; }
      }
      const left = S.cookies.map((c, i) => ({ c: L.cookieCells[i], x: c.x, y: c.y, got: c.got })).filter(c => !c.got && c.c >= 0);
      if (!S.jar) left.push({ c: B.jarCell != null ? B.jarCell : (B.jarCell = nearFree(L, L.jar.x, L.jar.y, 45)), x: L.jar.x, y: L.jar.y });
      if (left.length) { left.sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y)); goal = left[0].c; }
      else goal = B.bedCell != null ? B.bedCell : (B.bedCell = bedCell(L));
    }
    if (goal < 0) { S.botDir = { x: 0, y: 0 }; return; }
    if (goal !== B.goal || !B.path || ++B.age > 12) {
      let extra = null;
      if (S.cat) { extra = new Float32Array(NW * NH); for (let c = 0; c < NW * NH; c++) { const dd = Math.hypot(cellX(c) - S.cat.x, cellY(c) - S.cat.y); if (dd < 80) extra[c] = 250; else if (dd < 110) extra[c] = 40; } }
      B.path = astar(L, ki, goal, extra); B.goal = goal; B.age = 0;
    }
    const P = B.path;
    if (!P || !P.length) { const gx = cellX(goal) - k.x, gy = cellY(goal) - k.y, gd = Math.hypot(gx, gy); S.botDir = gd > 2 ? { x: gx / gd, y: gy / gd } : { x: 0, y: 0 }; return; }
    while (P.length > 1 && Math.hypot(cellX(P[0]) - k.x, cellY(P[0]) - k.y) < 9) P.shift();
    // הנקודה הרחוקה במסלול שאפשר ללכת אליה בקו ישר בלי מפגע
    let tgt = P[0];
    for (let m = 1; m < Math.min(P.length, 9); m++) {
      const x1 = cellX(P[m]), y1 = cellY(P[m]), dd = Math.hypot(x1 - k.x, y1 - k.y), n = Math.ceil(dd / 5);
      let ok = true;
      for (let s = 1; s <= n && ok; s++) { const c = navIdx(k.x + (x1 - k.x) * s / n, k.y + (y1 - k.y) * s / n); if (!L.free[c] || L.haz[c]) ok = false; }
      if (!ok) break;
      tgt = P[m];
    }
    const gx = cellX(tgt) - k.x, gy = cellY(tgt) - k.y, gd = Math.hypot(gx, gy);
    S.botDir = gd > 1.5 ? { x: gx / gd, y: gy / gd } : { x: 0, y: 0 };
    // תקוע? דחיפה קטנה
    if (B.lx != null && Math.hypot(k.x - B.lx, k.y - B.ly) < 0.2 && gd > 3) { if (++B.stuck > 40) { B.path = null; B.stuck = 0; } } else B.stuck = 0;
    B.lx = k.x; B.ly = k.y;
  }

  // ===================== ציור =====================
  const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647);
  function paintStatic(ctx, L) {
    const rnd = R(7);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x, f = L.floor[i], px = x * T, py = y * T;
      if (f === '#') continue;
      if (f === ',') {
        ctx.fillStyle = (x + y) % 2 ? '#3d4a6a' : '#46557a'; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(px + 2, py + 2, T - 4, 3);
      } else if (f === '~') {
        ctx.fillStyle = '#6a2c4e'; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = '#82395f'; ctx.beginPath(); ctx.moveTo(px + 15, py + 5); ctx.lineTo(px + 25, py + 15); ctx.lineTo(px + 15, py + 25); ctx.lineTo(px + 5, py + 15); ctx.fill();
        ctx.fillStyle = '#d9a74a';
        const n = (dx, dy) => L.floor[(y + dy) * COLS + x + dx] === '~';
        if (!n(0, -1)) ctx.fillRect(px, py + 2, T, 3);
        if (!n(0, 1)) ctx.fillRect(px, py + T - 5, T, 3);
        if (!n(-1, 0)) ctx.fillRect(px + 2, py, 3, T);
        if (!n(1, 0)) ctx.fillRect(px + T - 5, py, 3, T);
      } else if (f === '_') {
        ctx.fillStyle = '#34407a'; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = 'rgba(160,180,255,.13)';
        for (let k = 0; k < 3; k++) ctx.fillRect(px + 4 + rnd() * 22, py + 4 + rnd() * 22, 2, 2);
      } else {
        // פרקט: 3 קרשים בכל משבצת
        for (let p = 0; p < 3; p++) {
          const sh = rnd() * 0.06;
          ctx.fillStyle = U.shade('#4a3d5e', sh - 0.03); ctx.fillRect(px, py + p * 10, T, 10);
          ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, py + p * 10 + 9, T, 1);
          const seam = ((x * 3 + p * 11 + y * 7) % 5) * 6;
          if (seam) ctx.fillRect(px + seam, py + p * 10, 1, 9);
        }
        if (L.creak[i]) {   // קרש חורק: בהיר יותר, עם סדקים ומסמרים בולטים
          ctx.fillStyle = '#7a5a6e'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
          ctx.fillStyle = '#8d6a7c'; ctx.fillRect(px + 1, py + 1, T - 2, 4);
          ctx.strokeStyle = '#2a1f33'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(px + 5, py + 9); ctx.lineTo(px + 12, py + 14); ctx.lineTo(px + 9, py + 19); ctx.lineTo(px + 17, py + 24);
          ctx.moveTo(px + 22, py + 6); ctx.lineTo(px + 19, py + 12); ctx.lineTo(px + 25, py + 16); ctx.stroke();
          ctx.fillStyle = '#c9b9a0'; U.circle(ctx, px + 4, py + 4, 1.6); ctx.fill(); U.circle(ctx, px + 26, py + 26, 1.6); ctx.fill();
          ctx.strokeStyle = 'rgba(255,170,90,.55)'; ctx.lineWidth = 1; ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
        }
      }
    }
    // קירות + חלונות עם אור ירח
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!L.wall[y * COLS + x]) continue;
      const px = x * T, py = y * T;
      ctx.fillStyle = '#1e1a33'; ctx.fillRect(px, py, T, T);
      const below = y + 1 < ROWS && !L.wall[(y + 1) * COLS + x];
      if (below) { ctx.fillStyle = '#3a3360'; ctx.fillRect(px, py + T - 7, T, 7); ctx.fillStyle = '#4a4277'; ctx.fillRect(px, py + T - 7, T, 2); }
      ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(px, py, T, 2);
    }
    for (let x = 2; x < COLS - 2; x++) {
      if (x % 7 !== 3 || L.wall[COLS + x] || !L.wall[x] || (x * T > 260 && x * T < 700)) continue;   // לא מתחת למד
      const px = x * T;
      ctx.fillStyle = '#9cc4ff'; ctx.fillRect(px - 8, 6, T + 16, 14);
      ctx.fillStyle = '#d9e8ff'; ctx.fillRect(px - 6, 8, 10, 10);
      ctx.strokeStyle = '#5b5486'; ctx.lineWidth = 2; ctx.strokeRect(px - 8, 6, T + 16, 14); ctx.beginPath(); ctx.moveTo(px + T / 2, 6); ctx.lineTo(px + T / 2, 20); ctx.stroke();
      const gr = ctx.createLinearGradient(0, T, 0, T + 150);
      gr.addColorStop(0, 'rgba(170,200,255,.16)'); gr.addColorStop(1, 'rgba(170,200,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(px - 8, T); ctx.lineTo(px + T + 8, T); ctx.lineTo(px + T + 40, T + 150); ctx.lineTo(px + 18, T + 150); ctx.fill();
    }
  }
  function getStatic(g, S) {
    const res = Math.max(1, Math.round(g.canvas.width / W * 2) / 2);
    if (!S.L.stat || S.L.statRes !== res) {
      const c = document.createElement('canvas');
      c.width = W * res; c.height = H * res;
      const cx = c.getContext('2d'); cx.scale(res, res);
      paintStatic(cx, S.L);
      S.L.stat = c; S.L.statRes = res;
    }
    return S.L.stat;
  }
  const BOOKS = ['#b8504d', '#4f7fbd', '#8fb35a', '#e2b74a', '#8064a2', '#d98a4a'];
  function drawFurn(ctx, f, t, glow) {
    const sx = f.rat ? Math.sin(t * 1.9) * f.rat * 2 : 0;
    const x = f.x + 2 + sx, y = f.y + 2, w = f.w - 4, h = f.h - 4, k = f.k;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; U.rr(ctx, x + 3, y + 4, w, h, 6); ctx.fill();
    const rr = (a, b, c, d, r, col) => { ctx.fillStyle = col; U.rr(ctx, a, b, c, d, r); ctx.fill(); };
    if (k === 'S' || k === 'A') {
      const col = k === 'S' ? '#3b7479' : '#7a4a6e', dk = U.shade(col, -0.3), lt = U.shade(col, 0.15);
      rr(x, y, w, h, 9, dk);
      const hor = w >= h;
      if (hor) { rr(x + 7, y + 9, w - 14, h - 11, 6, col); rr(x + 2, y + 2, w - 4, 9, 5, lt); }
      else { rr(x + 9, y + 7, w - 11, h - 14, 6, col); rr(x + 2, y + 2, 9, h - 4, 5, lt); }
    } else if (k === 'B') {
      rr(x, y, w, h, 3, '#5a3b2a');
      const r = R(f.seed + 3);
      const hor = w >= h;
      for (let p = 4; p < (hor ? w : h) - 4; p += 5) {
        ctx.fillStyle = BOOKS[Math.floor(r() * BOOKS.length)];
        if (hor) ctx.fillRect(x + p, y + 4, 4, h - 8 - r() * 5); else ctx.fillRect(x + 4, y + p, w - 8 - r() * 5, 4);
      }
    } else if (k === 'T') {
      rr(x, y, w, h, 5, '#6b4a33'); rr(x + 3, y + 3, w - 6, h - 6, 4, '#7d5a3f');
      ctx.fillStyle = 'rgba(255,230,190,.22)';
      if (w >= h) ctx.fillRect(x + 6, y + h / 2 - 5, w - 12, 10); else ctx.fillRect(x + w / 2 - 5, y + 6, 10, h - 12);
      ctx.fillStyle = '#e8e4f2'; U.circle(ctx, x + w / 2, y + h / 2, 7); ctx.fill();
      ctx.fillStyle = '#e0a04a'; U.circle(ctx, x + w / 2 - 2, y + h / 2 - 1, 3); ctx.fill(); ctx.fillStyle = '#c85a5a'; U.circle(ctx, x + w / 2 + 2.5, y + h / 2 + 1.5, 3); ctx.fill();
    } else if (k === 'h') {
      rr(x + 2, y + 2, w - 4, h - 4, 4, '#6b4a33'); rr(x + 5, y + 5, w - 10, h - 10, 3, '#8a6448');
    } else if (k === 'K') {
      rr(x, y, w, h, 3, '#6d7788'); rr(x + 2, y + 2, w - 4, h - 4, 3, '#8d97a8');
      if (w >= 90 || h >= 90) {      // כיור וכיריים
        const hor = w >= h, a = hor ? x + w * 0.22 : x + w / 2, b = hor ? y + h / 2 : y + h * 0.22;
        rr(a - 9, b - 7, 18, 14, 4, '#5d6c82'); ctx.fillStyle = '#c8d2e0'; U.circle(ctx, a, b - 5, 1.6); ctx.fill();
        const c = hor ? x + w * 0.78 : x + w / 2, e = hor ? y + h / 2 : y + h * 0.78;
        ctx.strokeStyle = '#3c4454'; ctx.lineWidth = 2;
        for (const [ox, oy] of [[-5, -4], [5, -4], [-5, 5], [5, 5]]) { U.circle(ctx, c + ox, e + oy, 3.2); ctx.stroke(); }
      }
    } else if (k === 'F') {
      rr(x, y, w, h, 4, '#9fb0c8'); rr(x + 2, y + 2, w - 4, h - 4, 4, '#c9d6e8');
      ctx.fillStyle = '#7d8ca3'; ctx.fillRect(x + w - 8, y + 6, 3, Math.min(20, h - 12));
      ctx.fillStyle = '#ff7a8a'; U.circle(ctx, x + 8, y + 9, 3); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 6, y + 15, 6, 5);
    } else if (k === 'V') {
      rr(x, y, w, h, 4, '#2a2440');
      const fl = 0.75 + 0.25 * Math.sin(t * 0.37) * Math.sin(t * 0.11);
      const hor = w >= h;
      rr(hor ? x + 4 : x + w / 2 - 3, hor ? y + h / 2 - 3 : y + 4, hor ? w - 8 : 6, hor ? 6 : h - 8, 2, '#111');
      ctx.fillStyle = 'rgba(140,190,255,' + (0.7 * fl) + ')';
      if (hor) ctx.fillRect(x + 6, y + h / 2 - 5, w - 12, 2); else ctx.fillRect(x + w / 2 - 5, y + 6, 2, h - 12);
    } else if (k === 'L') {
      ctx.fillStyle = '#a0563b'; U.circle(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.32); ctx.fill();
      for (let a = 0; a < 7; a++) {
        const an = a * 0.9 + f.seed, cx = x + w / 2 + Math.cos(an) * 7, cy = y + h / 2 + Math.sin(an) * 7;
        ctx.fillStyle = a % 2 ? '#3f8f5a' : '#52a86c';
        ctx.beginPath(); ctx.ellipse(cx, cy, 9, 4.5, an, 0, TAU); ctx.fill();
      }
    } else if (k === 'E') {
      rr(x, y, w, h, 7, '#6b4a33');
      rr(x + 3, y + 3, w - 6, h - 6, 6, '#e8e4f2');
      const hor = w > h;
      const px = hor ? x + 5 : x + 6, py = hor ? y + 6 : y + 5, pw = hor ? 18 : w - 12, ph = hor ? h - 12 : 18;
      rr(px, py, pw, ph, 6, '#ffffff');
      const bx = hor ? x + 26 : x + 3, by = hor ? y + 3 : y + 26;
      rr(bx, by, hor ? w - 29 : w - 6, hor ? h - 6 : h - 29, 6, '#d95f86');
      ctx.fillStyle = '#ffd96a';
      const r = R(f.seed);
      for (let s = 0; s < 7; s++) { const sx2 = bx + 6 + r() * ((hor ? w - 29 : w - 6) - 12), sy2 = by + 6 + r() * ((hor ? h - 6 : h - 29) - 12); ctx.beginPath(); star(ctx, sx2, sy2, 3.2); ctx.fill(); }
      if (glow) { ctx.strokeStyle = 'rgba(255,214,102,' + (0.5 + 0.4 * Math.sin(t * 0.15)) + ')'; ctx.lineWidth = 3; U.rr(ctx, x - 3, y - 3, w + 6, h + 6, 9); ctx.stroke(); }
    } else if (k === 'X') {
      rr(x, y, w, h, 4, '#6e5040'); rr(x + 3, y + 3, w - 6, h - 6, 3, '#83614d');
      ctx.fillStyle = '#d9b48a'; U.circle(ctx, x + w / 2, y + h / 2, 3); ctx.fill();
    }
  }
  function star(ctx, x, y, r) { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
  function drawCookie(ctx, x, y, r) {
    ctx.fillStyle = '#c98b45'; U.circle(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = '#e0a85e'; U.circle(ctx, x - r * 0.15, y - r * 0.15, r * 0.8); ctx.fill();
    ctx.fillStyle = '#4a2a17';
    for (const [a, b] of [[-0.35, -0.3], [0.3, -0.1], [-0.1, 0.35], [0.38, 0.4]]) { U.circle(ctx, x + a * r, y + b * r, r * 0.16); ctx.fill(); }
  }
  function drawJar(ctx, x, y, taken, t) {
    if (!taken) { const a = 0.35 + 0.25 * Math.sin(t * 0.12); const gl = ctx.createRadialGradient(x, y, 4, x, y, 34); gl.addColorStop(0, 'rgba(255,214,102,' + a + ')'); gl.addColorStop(1, 'rgba(255,214,102,0)'); ctx.fillStyle = gl; U.circle(ctx, x, y, 34); ctx.fill(); }
    ctx.fillStyle = 'rgba(200,225,255,.55)'; U.circle(ctx, x, y, 12); ctx.fill();
    drawCookie(ctx, x - 3, y + 2, 5); if (!taken) { drawCookie(ctx, x + 4, y - 2, 5); drawCookie(ctx, x, y - 5, 4.5); }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; U.circle(ctx, x, y, 12); ctx.stroke();
    if (!taken) { ctx.fillStyle = '#e46a6a'; U.circle(ctx, x, y, 8); ctx.fill(); ctx.fillStyle = '#ff9a9a'; U.circle(ctx, x - 2, y - 2, 3); ctx.fill(); }
    else { ctx.fillStyle = '#e46a6a'; U.circle(ctx, x + 14, y - 9, 7); ctx.fill(); }
  }
  function drawDuck(ctx, x, y, sq) {
    const s = 1 - sq * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.3, s);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 3, 10, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.ellipse(-2, 0, 9, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe07a'; U.circle(ctx, 5, -1, 5); ctx.fill();
    ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(14, -1); ctx.lineTo(9, 1); ctx.fill();
    ctx.fillStyle = '#222'; U.circle(ctx, 6.5, -3, 1.2); ctx.fill();
    ctx.restore();
  }
  // הילד במבט מלמעלה: פיג׳מה, שיער, עיניים לכיוון ההליכה, עוגייה ביד
  function drawKid(ctx, x, y, face, walk, carry, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, 4, 12, 9, 0, 0, TAU); ctx.fill();
    ctx.rotate(face);
    const st = Math.sin(walk) * 4;
    ctx.fillStyle = '#f2f2ff'; ctx.beginPath(); ctx.ellipse(st, -5, 4.5, 3.2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(-st, 5, 4.5, 3.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fb6ff'; ctx.beginPath(); ctx.ellipse(-2, 0, 8, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a8fe0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(4, -4); ctx.moveTo(-8, 4); ctx.lineTo(4, 4); ctx.stroke();
    ctx.fillStyle = '#f3c9a4'; U.circle(ctx, 3, -9 - st * 0.3, 3); ctx.fill(); U.circle(ctx, 3, 9 + st * 0.3, 3); ctx.fill();
    if (carry) drawCookie(ctx, 9, 8, 5);
    ctx.fillStyle = '#f3c9a4'; U.circle(ctx, 3, 0, 8.5); ctx.fill();
    ctx.fillStyle = '#6b3f22'; ctx.beginPath(); ctx.arc(3, 0, 8.8, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 0, 5, 7.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1530'; U.circle(ctx, 8, -3.2, 1.6); ctx.fill(); U.circle(ctx, 8, 3.2, 1.6); ctx.fill();
    ctx.fillStyle = '#ff9aa8'; U.circle(ctx, 6.5, -5.5, 1.4); ctx.fill(); U.circle(ctx, 6.5, 5.5, 1.4); ctx.fill();
    ctx.restore();
  }
  // אבא על הספה: שמיכה, גרביים, כרית, שפם, פה פתוח ובועת שינה
  function drawDad(g, ctx, D, st, t, gaze) {
    ctx.save(); ctx.translate(D.x, D.y); ctx.rotate(D.ang);
    const len = D.len - 26, wid = D.wid;
    ctx.fillStyle = '#e9e6f5'; ctx.beginPath(); ctx.ellipse(-4, 0, 14, Math.min(19, wid / 2 - 4), 0, 0, TAU); ctx.fill();
    const bre = Math.sin(D.breath * TAU / 190) * 1.5;
    ctx.fillStyle = '#4f62a8'; U.rr(ctx, 12, -wid / 2 + 7 - bre, len - 18, wid - 14 + bre * 2, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,102,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let p = 24; p < len - 8; p += 14) { ctx.moveTo(p, -wid / 2 + 8); ctx.lineTo(p, wid / 2 - 8); } ctx.stroke();
    ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.ellipse(len - 2, -6, 6, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(len - 2, 6, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1c6a4'; ctx.beginPath(); ctx.ellipse(22, wid / 2 - 9, 9, 5, 0.3, 0, TAU); ctx.fill();
    const up = st === 'awake';
    ctx.fillStyle = '#f1c6a4'; U.circle(ctx, 2, 0, 14); ctx.fill();
    ctx.fillStyle = '#4a3428'; ctx.beginPath(); ctx.arc(2, 0, 14.5, Math.PI * 0.62, Math.PI * 1.38); ctx.fill();
    if (up) { ctx.beginPath(); for (let a = -2; a <= 2; a++) { ctx.moveTo(-10, a * 5); ctx.lineTo(-17, a * 6.5); } ctx.strokeStyle = '#4a3428'; ctx.lineWidth = 3; ctx.stroke(); }
    // עיניים
    const open = st === 'look' ? 1 : st === 'warn' ? 0.45 : st === 'awake' ? 1.3 : 0;
    for (const s of [-1, 1]) {
      const ex = 1, ey = s * 5.5;
      if (open > 0) {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.6 * Math.min(1, open), 3.6 * open, 0, 0, TAU); ctx.fill();
        const la = gaze - D.ang;
        ctx.fillStyle = '#1b1530'; U.circle(ctx, ex + Math.cos(la) * 1.6, ey + Math.sin(la) * 1.6, 1.8); ctx.fill();
      } else { ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ex - 1, ey, 3, -0.9, 0.9); ctx.stroke(); }
    }
    ctx.fillStyle = '#e0a487'; U.circle(ctx, 7, 0, 3); ctx.fill();
    ctx.fillStyle = '#4a3428'; ctx.beginPath(); ctx.ellipse(10, -4, 2.6, 6, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, 4, 2.6, 6, -0.5, 0, TAU); ctx.fill();
    const mo = st === 'sleep' ? 2 + Math.max(0, Math.sin(D.breath * TAU / 190)) * 3 : st === 'awake' ? 5 : 1.5;
    ctx.fillStyle = '#5a2a2a'; ctx.beginPath(); ctx.ellipse(13, 0, mo * 0.7, mo, 0, 0, TAU); ctx.fill();
    if (st === 'sleep' && D.bubble > 0.05) {     // בועת שינה מהאף
      const br = (2 + 7 * D.bubble) * (0.75 + 0.25 * Math.sin(D.breath * TAU / 190));
      ctx.fillStyle = 'rgba(190,225,255,.35)'; ctx.strokeStyle = 'rgba(220,240,255,.8)'; ctx.lineWidth = 1;
      U.circle(ctx, 9, -br - 2, br); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; U.circle(ctx, 9 - br * 0.35, -br * 1.35 - 2, br * 0.22); ctx.fill();
    }
    ctx.restore();
    // זזז / ? / !
    if (st === 'sleep') {
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.008 + i / 3) % 1), rise = Math.min(40, D.y - 52);
        g.text(ctx, 'z', D.x + 12 + p * (rise < 30 ? 44 : 22) + Math.sin(p * 6 + i) * 4, D.y - 22 - p * rise, { size: 12 + p * 12, color: '#cfe0ff', alpha: Math.sin(p * Math.PI) * 0.9 });
      }
    } else if (st === 'warn' || st === 'look') {
      const bob = Math.sin(t * 0.2) * 2;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; U.rr(ctx, D.x + 10, D.y - 54 + bob, 30, 30, 10); ctx.fill();
      g.text(ctx, st === 'warn' ? '?' : '?!', D.x + 25, D.y - 38 + bob, { size: st === 'warn' ? 22 : 18, weight: 900, color: st === 'warn' ? '#7a4b8c' : '#d9467a' });
    }
  }
  function drawCat(ctx, c, t) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.face);
    const sit = c.wait > 0;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(2, 3, 13, 8, 0, 0, TAU); ctx.fill();
    const sw = Math.sin(t * 0.08) * (sit ? 0.4 : 0.8);
    ctx.strokeStyle = '#e39a4c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-18, sw * 10, -22, sw * 4 + (sit ? 6 : 0)); ctx.stroke();
    ctx.fillStyle = '#e39a4c'; ctx.beginPath(); ctx.ellipse(-1, 0, sit ? 9 : 11, sit ? 8.5 : 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c97c33'; ctx.fillRect(-5, -6, 2, 12); ctx.fillRect(1, -6.5, 2, 13);
    ctx.fillStyle = '#e39a4c'; U.circle(ctx, 10, 0, 6.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(13, -10); ctx.lineTo(15, -3); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(13, 10); ctx.lineTo(15, 3); ctx.fill();
    ctx.fillStyle = '#c8ff6a'; U.circle(ctx, 14, -2.6, 1.6); ctx.fill(); U.circle(ctx, 14, 2.6, 1.6); ctx.fill();
    if (c.meow > 0) { ctx.fillStyle = '#5a2a3a'; U.circle(ctx, 16, 0, 1.8); ctx.fill(); }
    ctx.restore();
  }
  function drawDog(g, ctx, o, t) {
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.x + 3, o.y + 4, 24, 20, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9e3d52'; U.circle(ctx, o.x, o.y, 22); ctx.fill();
    ctx.fillStyle = '#c2596e'; U.circle(ctx, o.x, o.y, 16); ctx.fill();
    if (o.state === 'sleep') {
      ctx.fillStyle = '#a8703f'; ctx.beginPath(); ctx.ellipse(o.x - 2, o.y + 1, 13, 11, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b98250'; U.circle(ctx, o.x + 8, o.y - 6, 7); ctx.fill();
      ctx.fillStyle = '#7a4e2a'; ctx.beginPath(); ctx.ellipse(o.x + 3, o.y - 9, 3, 6, 0.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(o.x + 10, o.y - 6, 2, 0.3, 2.6); ctx.stroke();
      const p = (t * 0.01) % 1;
      g.text(ctx, 'z', o.x + 14 + p * 10, o.y - 16 - p * 20, { size: 10 + p * 8, color: '#cfe0ff', alpha: Math.sin(p * Math.PI) * 0.8 });
    } else {
      const wag = Math.sin(t * 0.6) * 0.6;
      ctx.strokeStyle = '#a8703f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o.x - 10, o.y + 4); ctx.lineTo(o.x - 18 + wag * 4, o.y + 12 + wag * 6); ctx.stroke();
      ctx.fillStyle = '#a8703f'; ctx.beginPath(); ctx.ellipse(o.x - 2, o.y + 2, 12, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b98250'; U.circle(ctx, o.x + 6, o.y - 7, 8); ctx.fill();
      ctx.fillStyle = '#7a4e2a'; ctx.beginPath(); ctx.ellipse(o.x - 1, o.y - 9, 3, 7, 0.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(o.x + 13, o.y - 9, 3, 7, -0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1b1530'; U.circle(ctx, o.x + 3, o.y - 9, 1.5); ctx.fill(); U.circle(ctx, o.x + 9, o.y - 9, 1.5); ctx.fill(); U.circle(ctx, o.x + 6, o.y - 3, 2.2); ctx.fill();
      if (o.bark > 0) { ctx.fillStyle = '#5a2a2a'; ctx.beginPath(); ctx.ellipse(o.x + 6, o.y + 1, 3, 2.4, 0, 0, TAU); ctx.fill(); }
      if (o.state === 'alert') g.text(ctx, '!', o.x + 20, o.y - 22, { size: 24, weight: 900, color: '#ff7a59', stroke: '#1b1530', strokeW: 4 });
    }
    if (o.state === 'sleep' || o.state === 'alert') { ctx.strokeStyle = 'rgba(255,122,89,.22)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 2; U.circle(ctx, o.x, o.y, DOG_R); ctx.stroke(); ctx.setLineDash([]); }
  }
  function conePoly(L, ox, oy, a0, a1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, d = rayLen(L, ox, oy, a); pts.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d]); }
    return pts;
  }
  function fillCone(ctx, ox, oy, pts, col, a) {
    const gr = ctx.createRadialGradient(ox, oy, 10, ox, oy, RANGE);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(ox, oy); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
  }
  function drawMeter(g, ctx, S) {
    const x = 330, y = 6, w = 300, h = 18, v = clamp(S.meter / 100, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; U.rr(ctx, x - 34, y - 3, w + 70, h + 6, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; U.rr(ctx, x, y, w, h, 9); ctx.fill();
    if (v > 0.005) {
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, '#5fd47a'); gr.addColorStop(0.55, '#ffd166'); gr.addColorStop(1, '#ff5a5a');
      ctx.fillStyle = gr; U.rr(ctx, x, y, Math.max(h, w * v), h, 9); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w * 0.65, y + 2); ctx.lineTo(x + w * 0.65, y + h - 2); ctx.stroke();
    // פרצוף ישן משמאל, "!" מימין
    ctx.fillStyle = '#f1c6a4'; U.circle(ctx, x - 17, y + h / 2, 9); ctx.fill();
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x - 20, y + h / 2 - 1, 2.2, 0.2, 2.9); ctx.moveTo(x - 11.8, y + h / 2 - 1); ctx.arc(x - 14, y + h / 2 - 1, 2.2, 0.2, 2.9); ctx.stroke();
    const hot = S.meter >= 65;
    g.text(ctx, '!', x + w + 18, y + h / 2 + 1, { size: hot ? 20 + Math.sin(S.t * 0.4) * 3 : 18, weight: 900, color: hot ? '#ff5a5a' : 'rgba(255,255,255,.5)' });
  }

  function drawScene(g, ctx, S, alpha) {
    const L = S.L, t = S.t, d = S.dad;
    ctx.drawImage(getStatic(g, S), 0, 0, W, H);
    // אור הטלוויזיה
    for (const f of L.furn) if (f.k === 'V') {
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2, fl = 0.8 + 0.2 * Math.sin(t * 0.37);
      const gl = ctx.createRadialGradient(cx, cy, 5, cx, cy, 150);
      gl.addColorStop(0, 'rgba(120,170,255,' + 0.22 * fl + ')'); gl.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(cx - 150, cy - 150, 300, 300);
    }
    // הצצה: אזור האזהרה ואז אלומת המבט
    if (d.state === 'warn') {
      const a = (1 - d.t / WARN) * 0.16;
      fillCone(ctx, L.dad.x, L.dad.y, S.coneW || (S.coneW = conePoly(L, L.dad.x, L.dad.y, L.look - SWEEP - HALF, L.look + SWEEP + HALF, 60)), '255,230,140', a);
    } else if (d.state === 'look' || d.state === 'awake') {
      const ga = d.state === 'awake' ? L.look : d.gaze;
      fillCone(ctx, L.dad.x, L.dad.y, conePoly(L, L.dad.x, L.dad.y, ga - HALF, ga + HALF, 34), S.spotted ? '255,120,100' : '255,236,150', 0.42);
    }
    for (const f of L.furn) drawFurn(ctx, f, t, f.k === 'E' && S.jar);
    drawJar(ctx, L.jar.x, L.jar.y, S.jar, t);
    for (const c of S.cookies) if (!c.got) {
      const gl = 0.3 + 0.2 * Math.sin(t * 0.1 + c.x);
      ctx.strokeStyle = 'rgba(255,214,102,' + gl + ')'; ctx.lineWidth = 2; U.circle(ctx, c.x, c.y, 13 + Math.sin(t * 0.1) * 1.5); ctx.stroke();
      drawCookie(ctx, c.x, c.y + Math.sin(t * 0.08 + c.y) * 1.5, 8);
    }
    for (const ty of S.toys) drawDuck(ctx, ty.x, ty.y, ty.sq);
    if (S.dog) drawDog(g, ctx, S.dog, t);
    drawDad(g, ctx, Object.assign({ breath: d.breath, bubble: d.bubble }, L.dad), d.state, t, d.gaze);
    if (S.cat) drawCat(ctx, S.cat, t);
    const k = S.kid, kx = S.over === 'win' ? lerp(k.x, L.bed.x + L.bed.w / 2, Math.min(1, S.overT / 30)) : k.x, ky = S.over === 'win' ? lerp(k.y, L.bed.y + L.bed.h / 2, Math.min(1, S.overT / 30)) : k.y;
    if (S.over !== 'win' || S.overT < 30) drawKid(ctx, kx, ky, k.face, k.walk, S.got > 0, t);
    else {   // מתחת לשמיכה, מכרסם
      const b = L.bed, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.fillStyle = '#c94d76'; ctx.beginPath(); ctx.ellipse(cx, cy, 14 + Math.sin(t * 0.5) * 1.5, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f3c9a4'; U.circle(ctx, cx, cy - 13, 7); ctx.fill();
    }
    if (S.seen > 0) g.text(ctx, '!', k.x, k.y - 26, { size: 26, weight: 900, color: '#ff5a5a', stroke: '#1b1530', strokeW: 5 });
    // גלי רעש
    for (const r of S.rings) {
      const a = 1 - r.r / r.R;
      ctx.strokeStyle = r.c; ctx.lineWidth = 3; ctx.globalAlpha = a * 0.85;
      U.circle(ctx, r.x, r.y, r.r); ctx.stroke();
      if (r.r > 10) { ctx.lineWidth = 1.5; ctx.globalAlpha = a * 0.45; U.circle(ctx, r.x, r.y, r.r - 9); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // אבא מתעורר: האור נדלק
    if (S.over === 'lose') {
      ctx.fillStyle = 'rgba(255,236,170,' + Math.min(0.32, S.overT / 40) + ')'; ctx.fillRect(0, 0, W, H);
      const s = 1 + Math.min(1, S.overT / 10) * 0.2;
      // הבועה תמיד בתוך המסך: מעל אבא, או מתחתיו כשהוא ליד הקיר העליון
      const below = L.dad.y < 130, bx = clamp(L.dad.x + 20, 112, W - 112), by = below ? L.dad.y + 74 : L.dad.y - 66;
      ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
      ctx.fillStyle = '#ffffff'; U.rr(ctx, -88, -22, 176, 44, 16); ctx.fill();
      const tx = clamp(L.dad.x - bx, -60, 60);
      ctx.beginPath();
      if (below) { ctx.moveTo(tx - 10, -20); ctx.lineTo(tx, -36); ctx.lineTo(tx + 10, -20); } else { ctx.moveTo(tx - 10, 20); ctx.lineTo(tx, 36); ctx.lineTo(tx + 10, 20); }
      ctx.fill();
      g.text(ctx, g.t('who'), 0, 1, { size: 22, weight: 900, color: '#d9467a', maxW: 160 });
      ctx.restore();
      g.text(ctx, '!', L.dad.x + (below ? 30 : 0), L.dad.y - (below ? 0 : 28), { size: 34, weight: 900, color: '#ff5a5a', stroke: '#1b1530', strokeW: 6 });
    }
  }

  function finish(g, S) {
    S.overT++;
    if (S.over === 'win' && S.overT === 40) { g.sfx('coin'); for (let i = 0; i < 3; i++) g.tone({ type: 'triangle', f: 700 + i * 120, dur: 0.06, vol: 0.06, delay: 0.12 * i }); }
    if (S.over === 'win' && S.overT === 70) g.completeLevel(Math.min(3, S.got), { text: g.t('winText', { n: S.got }) });
    if (S.over === 'lose' && S.overT === 80) g.end({ result: 'lose', score: null, title: g.t('busted'), text: g.t('loseText') });
  }

  GK.register('dont-wake-dad', {
    w: W, h: H, bg: '#141a33', accent: '#ffd166',
    levels: LEVELS.length,
    touch: [['Space', '🏃']],
    text: {
      he: { title: 'אל תעירו את אבא', help: ['חצים / WASD, או החזק את העכבר במקום שאליו תלך — להתגנב', 'Shift או רווח — לרוץ (רועש!). על שטיח הריצה שקטה', 'קח עוגייה מהצנצנת במטבח וחזור למיטה', 'קרשים חורקים, צעצועים ונקישות ברהיטים מעירים את אבא', 'כשאבא מציץ — התחבא מאחורי רהיט!'], helpTouch: ['גע והחזק במקום שאליו תרצה ללכת', 'כפתור 🏃 — לרוץ (רועש!)', 'קח עוגייה מהצנצנת במטבח וחזור למיטה', 'כשאבא מציץ — התחבא מאחורי רהיט!'], cookies: 'עוגיות', lvl: 'שלב {n}', creak: 'חריקה!', squeak: 'צפצוף!', bonk: 'בום!', meow: 'מיאו!', woof: 'הב הב!', got: 'יש! עכשיו למיטה', yum: 'יאמי!', who: 'מי שם?!', busted: 'נתפסת!', loseText: 'אבא התעורר... ישר למיטה, בלי עוגיות!', winText: 'אכלת {n} עוגיות מתחת לשמיכה!', tip1: 'התגנב לצנצנת העוגיות במטבח וחזור למיטה. עקוף קרשים חורקים!', tip2: 'צעצועים מצפצפים על הרצפה — אל תדרוך עליהם!', tip3: 'אבא מציץ מדי פעם — התחבא מאחורי רהיטים!', tip4: 'החתולה מייללת אם מתקרבים אליה. חכה שתעבור!', tip5: 'רצפה מלאה חריקות! מצא את הדרך השקטה', tip6: 'הכלב ישן — אל תתקרב ואל תרעיש לידו!', tip7: 'חתולה, כלב ואבא שמציץ. בהצלחה!', tip8: 'הלילה הגדול: כל המשפחה בבית!' },
      en: { title: "Don't Wake Dad", help: ['Arrows / WASD, or hold the mouse where you want to go — sneak', 'Shift or Space — run (noisy!). Running on rugs is quiet', 'Grab a cookie from the kitchen jar and get back to bed', 'Creaky boards, squeaky toys and bumping furniture wake Dad up', 'When Dad peeks — hide behind furniture!'], helpTouch: ['Touch and hold where you want to go', 'The 🏃 button — run (noisy!)', 'Grab a cookie from the kitchen jar and get back to bed', 'When Dad peeks — hide behind furniture!'], cookies: 'Cookies', lvl: 'Level {n}', creak: 'CREAK!', squeak: 'SQUEAK!', bonk: 'BONK!', meow: 'MEOW!', woof: 'WOOF!', got: 'Got it! Now back to bed', yum: 'Yum!', who: "Who's there?!", busted: 'Busted!', loseText: 'Dad woke up... straight to bed, no cookies!', winText: 'You munched {n} cookies under the blanket!', tip1: 'Sneak to the cookie jar in the kitchen and back to bed. Avoid creaky boards!', tip2: "Squeaky toys on the floor — don't step on them!", tip3: 'Dad peeks now and then — hide behind furniture!', tip4: 'The cat meows if you get close. Wait for her to pass!', tip5: 'A floor full of creaks! Find the quiet path', tip6: "The dog is asleep — don't get close or make noise near him!", tip7: 'A cat, a dog and a peeking dad. Good luck!', tip8: 'The big night: the whole family is home!' },
      ar: { title: 'لا توقظوا أبي', help: ['الأسهم / WASD، أو اضغط بالفأرة مطوّلاً حيث تريد — تسلّل', 'Shift أو المسافة — اركض (مزعج!). الركض على السجاد هادئ', 'خذ كعكة من برطمان المطبخ وعد إلى السرير', 'الألواح التي تصرّ والألعاب التي تصفّر والاصطدام بالأثاث توقظ أبي', 'عندما يختلس أبي النظر — اختبئ خلف الأثاث!'], helpTouch: ['المس مطوّلاً المكان الذي تريد الذهاب إليه', 'زر 🏃 — اركض (مزعج!)', 'خذ كعكة من برطمان المطبخ وعد إلى السرير', 'عندما يختلس أبي النظر — اختبئ خلف الأثاث!'], cookies: 'الكعك', lvl: 'المرحلة {n}', creak: 'صرير!', squeak: 'صفير!', bonk: 'طاخ!', meow: 'مياو!', woof: 'هاو هاو!', got: 'أخذتها! الآن إلى السرير', yum: 'لذيذ!', who: 'من هناك؟!', busted: 'انكشفت!', loseText: 'استيقظ أبي... إلى السرير فوراً، بلا كعك!', winText: 'أكلت {n} كعكات تحت البطانية!', tip1: 'تسلّل إلى برطمان الكعك في المطبخ وعد إلى السرير. تجنّب الألواح التي تصرّ!', tip2: 'ألعاب تصفّر على الأرض — لا تدُس عليها!', tip3: 'أبي يختلس النظر أحياناً — اختبئ خلف الأثاث!', tip4: 'القطة تموء إذا اقتربت منها. انتظر حتى تمرّ!', tip5: 'أرضية مليئة بالصرير! ابحث عن الطريق الهادئ', tip6: 'الكلب نائم — لا تقترب ولا تُحدث ضجة قربه!', tip7: 'قطة وكلب وأب يختلس النظر. بالتوفيق!', tip8: 'الليلة الكبيرة: كل العائلة في البيت!' },
      es: { title: 'No despiertes a papá', help: ['Flechas / WASD, o mantén el ratón donde quieras ir: avanza a escondidas', 'Shift o Espacio: corre (¡hace ruido!). Correr sobre alfombras es silencioso', 'Toma una galleta del tarro de la cocina y vuelve a la cama', 'Las tablas que crujen, los juguetes que chillan y los golpes con muebles despiertan a papá', 'Cuando papá espía, ¡escóndete detrás de un mueble!'], helpTouch: ['Toca y mantén donde quieras ir', 'Botón 🏃: corre (¡hace ruido!)', 'Toma una galleta del tarro de la cocina y vuelve a la cama', 'Cuando papá espía, ¡escóndete detrás de un mueble!'], cookies: 'Galletas', lvl: 'Nivel {n}', creak: '¡CRUJ!', squeak: '¡ÑIC!', bonk: '¡PUM!', meow: '¡MIAU!', woof: '¡GUAU!', got: '¡La tengo! Ahora a la cama', yum: '¡Ñam!', who: '¿¡Quién anda ahí!?', busted: '¡Te pillaron!', loseText: 'Papá se despertó... ¡a la cama sin galletas!', winText: '¡Te comiste {n} galletas bajo la manta!', tip1: 'Ve a escondidas al tarro de galletas de la cocina y vuelve a la cama. ¡Evita las tablas que crujen!', tip2: '¡Juguetes que chillan en el suelo! No los pises', tip3: 'Papá espía de vez en cuando: ¡escóndete detrás de los muebles!', tip4: 'La gata maúlla si te acercas. ¡Espera a que pase!', tip5: '¡Un suelo lleno de crujidos! Encuentra el camino silencioso', tip6: 'El perro duerme: ¡no te acerques ni hagas ruido cerca!', tip7: 'Una gata, un perro y un papá que espía. ¡Suerte!', tip8: 'La gran noche: ¡toda la familia está en casa!' },
      fr: { title: 'Ne réveille pas papa', help: ['Flèches / WASD, ou maintiens la souris là où tu veux aller : avance en douce', 'Maj ou Espace : cours (ça fait du bruit !). Courir sur un tapis est silencieux', 'Prends un cookie dans le bocal de la cuisine et retourne au lit', 'Les planches qui grincent, les jouets qui couinent et les chocs contre les meubles réveillent papa', 'Quand papa jette un œil, cache-toi derrière un meuble !'], helpTouch: ['Touche et maintiens là où tu veux aller', 'Bouton 🏃 : cours (ça fait du bruit !)', 'Prends un cookie dans le bocal de la cuisine et retourne au lit', 'Quand papa jette un œil, cache-toi derrière un meuble !'], cookies: 'Cookies', lvl: 'Niveau {n}', creak: 'CRIII !', squeak: 'COUIC !', bonk: 'BONK !', meow: 'MIAOU !', woof: 'OUAF !', got: 'Je l’ai ! Vite au lit', yum: 'Miam !', who: 'Qui est là ?!', busted: 'Repéré !', loseText: 'Papa s’est réveillé... direct au lit, sans cookies !', winText: 'Tu as croqué {n} cookies sous la couverture !', tip1: 'Va en douce jusqu’au bocal de cookies, puis retourne au lit. Évite les planches qui grincent !', tip2: 'Des jouets qui couinent par terre : ne marche pas dessus !', tip3: 'Papa jette un œil de temps en temps : cache-toi derrière les meubles !', tip4: 'La chatte miaule si tu t’approches. Attends qu’elle passe !', tip5: 'Un plancher plein de grincements ! Trouve le chemin silencieux', tip6: 'Le chien dort : ne t’approche pas et ne fais pas de bruit près de lui !', tip7: 'Une chatte, un chien et un papa qui jette un œil. Bonne chance !', tip8: 'La grande nuit : toute la famille est là !' },
      pt: { title: 'Não acorde o papai', help: ['Setas / WASD, ou segure o mouse onde quer ir: ande escondido', 'Shift ou Espaço: corra (faz barulho!). Correr no tapete é silencioso', 'Pegue um biscoito do pote da cozinha e volte para a cama', 'Tábuas que rangem, brinquedos que apitam e trombadas nos móveis acordam o papai', 'Quando o papai espiar, esconda-se atrás de um móvel!'], helpTouch: ['Toque e segure onde quer ir', 'Botão 🏃: corra (faz barulho!)', 'Pegue um biscoito do pote da cozinha e volte para a cama', 'Quando o papai espiar, esconda-se atrás de um móvel!'], cookies: 'Biscoitos', lvl: 'Fase {n}', creak: 'NHEC!', squeak: 'QUÉ!', bonk: 'PÁ!', meow: 'MIAU!', woof: 'AU AU!', got: 'Peguei! Agora para a cama', yum: 'Nham!', who: 'Quem está aí?!', busted: 'Pego no flagra!', loseText: 'O papai acordou... direto para a cama, sem biscoitos!', winText: 'Você comeu {n} biscoitos debaixo do cobertor!', tip1: 'Vá escondido até o pote de biscoitos na cozinha e volte para a cama. Evite as tábuas que rangem!', tip2: 'Brinquedos que apitam no chão: não pise neles!', tip3: 'O papai espia de vez em quando: esconda-se atrás dos móveis!', tip4: 'A gata mia se você chegar perto. Espere ela passar!', tip5: 'Um piso cheio de rangidos! Ache o caminho silencioso', tip6: 'O cachorro está dormindo: não chegue perto nem faça barulho ao lado dele!', tip7: 'Uma gata, um cachorro e um papai que espia. Boa sorte!', tip8: 'A grande noite: a família toda está em casa!' },
      ru: { title: 'Не разбуди папу', help: ['Стрелки / WASD или зажми мышь там, куда идти, — крадись', 'Shift или пробел — бег (шумно!). По ковру бегать тихо', 'Возьми печенье из банки на кухне и вернись в кровать', 'Скрипучие доски, пищащие игрушки и удары о мебель будят папу', 'Когда папа подглядывает — прячься за мебелью!'], helpTouch: ['Нажми и держи там, куда хочешь идти', 'Кнопка 🏃 — бег (шумно!)', 'Возьми печенье из банки на кухне и вернись в кровать', 'Когда папа подглядывает — прячься за мебелью!'], cookies: 'Печенье', lvl: 'Уровень {n}', creak: 'СКРИП!', squeak: 'ПИСК!', bonk: 'БУМ!', meow: 'МЯУ!', woof: 'ГАВ!', got: 'Есть! Теперь в кровать', yum: 'Ням!', who: 'Кто там?!', busted: 'Попался!', loseText: 'Папа проснулся... марш в кровать без печенья!', winText: 'Ты съел {n} печенья под одеялом!', tip1: 'Прокрадись к банке с печеньем на кухне и вернись в кровать. Обходи скрипучие доски!', tip2: 'На полу пищащие игрушки — не наступай на них!', tip3: 'Папа иногда подглядывает — прячься за мебелью!', tip4: 'Кошка мяукает, если подойти близко. Дождись, пока она пройдёт!', tip5: 'Весь пол скрипит! Найди тихую дорогу', tip6: 'Пёс спит — не подходи близко и не шуми рядом!', tip7: 'Кошка, пёс и папа, который подглядывает. Удачи!', tip8: 'Большая ночь: вся семья дома!' },
      de: { title: 'Weck Papa nicht auf', help: ['Pfeile / WASD oder die Maus dort halten, wo du hinwillst – schleichen', 'Shift oder Leertaste – rennen (laut!). Auf Teppichen ist Rennen leise', 'Hol einen Keks aus der Keksdose in der Küche und geh zurück ins Bett', 'Knarrende Dielen, quietschende Spielzeuge und Stöße gegen Möbel wecken Papa', 'Wenn Papa blinzelt – versteck dich hinter Möbeln!'], helpTouch: ['Halte den Finger dort, wo du hinwillst', 'Taste 🏃 – rennen (laut!)', 'Hol einen Keks aus der Keksdose in der Küche und geh zurück ins Bett', 'Wenn Papa blinzelt – versteck dich hinter Möbeln!'], cookies: 'Kekse', lvl: 'Level {n}', creak: 'KNARR!', squeak: 'QUIETSCH!', bonk: 'RUMS!', meow: 'MIAU!', woof: 'WUFF!', got: 'Geschafft! Jetzt ab ins Bett', yum: 'Mjam!', who: 'Wer ist da?!', busted: 'Erwischt!', loseText: 'Papa ist aufgewacht... ab ins Bett, ohne Kekse!', winText: 'Du hast {n} Kekse unter der Decke gefuttert!', tip1: 'Schleich zur Keksdose in der Küche und zurück ins Bett. Meide knarrende Dielen!', tip2: 'Quietschende Spielzeuge auf dem Boden – tritt nicht drauf!', tip3: 'Papa blinzelt ab und zu – versteck dich hinter Möbeln!', tip4: 'Die Katze miaut, wenn du ihr zu nahe kommst. Warte, bis sie vorbei ist!', tip5: 'Ein Boden voller Knarren! Finde den leisen Weg', tip6: 'Der Hund schläft – komm ihm nicht zu nahe und mach keinen Lärm!', tip7: 'Eine Katze, ein Hund und ein blinzelnder Papa. Viel Glück!', tip8: 'Die große Nacht: Die ganze Familie ist zu Hause!' },
    },

    init(g) {
      g.s = makeState(g);
      if (!g.demo) { g.msg(g.t('lvl', { n: g.s.n }), 1500, '#ffd166'); }
    },

    step(g) {
      const S = g.s, k = S.kid;
      S.t++; S.tipT++;
      if (S.over) {
        finish(g, S);
        stepRings(g, S);
        S.dad.breath++;
        return;
      }
      let dx = 0, dy = 0, run = false;
      if (GK.bot && S.botDir) { dx = S.botDir.x; dy = S.botDir.y; }
      else {
        const a = g.axis(); dx = a.x; dy = a.y;
        if (S.ptr) { const vx = S.ptr.x - k.x, vy = S.ptr.y - k.y, d = Math.hypot(vx, vy); if (d > 7) { dx = vx / d; dy = vy / d; } }
        run = g.key('ShiftLeft') || g.key('ShiftRight') || g.key('Space');
      }
      moveKid(g, S, dx, dy, run);
      for (const f of S.L.furn) { if (f.cd > 0) f.cd--; if (f.rat > 0) f.rat = Math.max(0, f.rat - 0.05); }
      // איסוף
      for (const c of S.cookies) if (!c.got && Math.hypot(c.x - k.x, c.y - k.y) < KR + 10) {
        c.got = true; S.got++;
        g.sfx('coin'); g.burst(c.x, c.y, { n: 14, color: ['#e0a85e', '#ffd166', '#ffffff'], speed: 2.5, life: 30 });
        g.float(c.x, c.y - 20, '+1', { color: '#ffd166' });
      }
      if (!S.jar && Math.hypot(S.L.jar.x - k.x, S.L.jar.y - k.y) < 42) {
        S.jar = true; S.got++;
        g.sfx('pop'); g.sfx('coin', { p: 1.2 });
        g.burst(S.L.jar.x, S.L.jar.y, { n: 20, color: ['#e0a85e', '#ffd166', '#ffffff'], speed: 3, life: 36 });
        g.float(k.x, k.y - 26, g.t('got'), { color: '#ffd166', size: 22, life: 90 });
      }
      if (S.jar && bedDist(S.L, k.x, k.y) < KR + 8) {
        S.over = 'win'; S.overT = 0;
        g.float(k.x, k.y - 26, g.t('yum'), { color: '#ffd166', size: 26, life: 80 });
      }
      stepRings(g, S);
      if (S.cat) stepCat(g, S);
      if (S.dog) stepDog(g, S);
      stepDad(g, S);
      g.hud([[g.t('level'), S.n], [g.t('cookies'), S.got + '/' + (1 + S.cookies.length)]]);
    },

    bot(g) { if (g.s && !g.s.over) botStep(g.s); },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') { S.ptr = { x: p.x, y: p.y }; S.ptrId = p.id; }
      else if (type === 'move' && S.ptr && p.id === S.ptrId && p.down) { S.ptr.x = p.x; S.ptr.y = p.y; }
      else if (type === 'up' && p.id === S.ptrId) S.ptr = null;
    },
    onPause(g) { if (g.s) g.s.ptr = null; },

    idle(g) {
      const S = g.s;
      if (!S) return;
      S.t++;
      if (g.demo) { S.dad.breath++; S.dad.bubble = Math.min(1, S.dad.bubble + 0.008); }
      else if (S.over) { S.overT++; S.dad.breath++; stepRings(g, S); }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S) return;
      drawScene(g, ctx, S, alpha);
      if (g.demo) return;
      drawMeter(g, ctx, S);
      if (S.tipT < 420) {
        const a = Math.min(1, (420 - S.tipT) / 40);
        g.text(ctx, g.t(S.L.tip), W / 2, H - 15, { size: 16, weight: 800, color: '#ffe9a8', alpha: a, maxW: 900 });
      }
    },

    // לבדיקות: מעבר מהיר על כל השלבים — מסלול שקט קיים מההתחלה לצנצנת, לכל עוגייה ולמיטה
    _verify() {
      return PARSED.map((L, n) => {
        buildNav(L);
        const s = navIdx(L.start.x, L.start.y), jar = nearFree(L, L.jar.x, L.jar.y, 45), bed = bedCell(L);
        const quiet = (a, b) => { const p = astar(L, a, b, null, true); return p ? p.length : -1; };
        const res = { level: n + 1, start: L.free[s] === 1, jarCell: jar >= 0, toJar: quiet(s, jar), toBed: quiet(jar, bed), cookies: L.cookieCells.map(c => (c < 0 ? -2 : quiet(s, c))), catPath: true, dad: !!L.dad, bedOK: bed >= 0 && bedDist(L, cellX(bed), cellY(bed)) < KR + 8 };
        for (let i = 0; i < L.cat.length; i++) { const a = L.cat[i], b = L.cat[(i + 1) % L.cat.length]; for (let s2 = 0; s2 <= 40; s2++) { const x = lerp(a.x, b.x, s2 / 40), y = lerp(a.y, b.y, s2 / 40); if (circleHits(L, x, y, 6)) res.catPath = false; } }
        return res;
      });
    },
    _levels: LEVELS.length,

    cover(ctx, w, h, k) {
      // סצנה מוגדלת: אבא נוחר על הספה, הילד מתגנב עם עוגייה, קרש חורק וחתולה עם עיניים זוהרות
      const L = PARSED[0];
      ctx.save();
      ctx.scale(2, 2);
      ctx.translate(-290, -230);
      paintStatic(ctx, L);
      const tv = L.furn.find(f => f.k === 'V');
      const gl = ctx.createRadialGradient(tv.x + tv.w / 2, tv.y, 5, tv.x + tv.w / 2, tv.y, 160);
      gl.addColorStop(0, 'rgba(120,170,255,.25)'); gl.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(tv.x - 160, tv.y - 160, 320 + tv.w, 320);
      for (const f of L.furn) drawFurn(ctx, f, 0, false);
      drawDad(k, ctx, Object.assign({ breath: 47, bubble: 1 }, L.dad), 'sleep', 40, L.look);
      const kx = 560, ky = 300;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
      for (const [r, a] of [[26, 0.9], [44, 0.55], [62, 0.25]]) { ctx.globalAlpha = a; U.circle(ctx, kx - 10, ky + 8, r); ctx.stroke(); }
      ctx.globalAlpha = 1;
      drawKid(ctx, kx, ky, 0.15, 1.2, true, 0);
      drawCat(ctx, { x: 615, y: 455, face: Math.PI * 0.9, wait: 1, meow: 0 }, 10);
      drawCookie(ctx, 437, 532, 8);
      ctx.restore();
      const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(5,6,20,.55)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    },
  });
})();
