// ============================================================
//  מבוך הרוחות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  עכבר קטן אוכל גרעינים במבוך. אבן כוח מבהילה את הרוחות לכמה שניות.
//  4 רוחות עם סגנון רדיפה שונה, 6 מבוכים סימטריים שמתחלפים בכל שלב, חיים ופרי בונוס.
// ============================================================
(function () {
  'use strict';
  const T = 30, COLS = 25, ROWS = 21, MH = ROWS * T, W = COLS * T, H = MH + 36;
  // המבוכים: חצי שמאלי + עמודת האמצע, והחצי הימני הוא שיקוף (כך הם תמיד סימטריים)
  //  # קיר   . גרעין   o אבן כוח   - דלת בית הרוחות   G בית הרוחות   P התחלה   רווח = שביל ריק (מנהרה)
  const HALVES = [
    ['#############', '#o.........##', '#.###.####.##', '#............', '#.###.#.#####', '#.....#...#..', '#####.###.#.#', '#####.#......', '#####.#.####-', '     ...#GGGG', '#####.#.#####', '#####.#......', '#####.#.#####', '#.........#..', '#.###.###.#.#', '#o..#.......P', '###.#.#.#####', '#.....#...#..', '#.#######.#.#', '#............', '#############'],
    ['#############', '#o...##......', '#.##.##.####.', '#............', '##.#.####.###', '##.#...#.....', '##.###.#.####', '...#.........', '##.#.##.####-', '##...##.#GGGG', '##.#.##.#####', '##.#.........', '##.#.#.#####.', '#....#.......', '#.##.###.###.', '#o#.......#.P', '#.#.#####.#.#', '#...#.....#..', '#.###.###.##.', '#............', '#############'],
    ['#############', '#o.........##', '#.########.##', '#.#........##', '#.#.######...', '#.#.#......#.', '#...#.####.#.', '###.#.#......', '###.#.#.####-', '    ..#.#GGGG', '###.#.#.#####', '###.#.#......', '###.#.#.####.', '###.#.......P', '#...#.####.#.', '#.#.#......#.', '#.#.######...', '#.#........##', '#.########.##', '#o.........##', '#############'],
    ['#############', '#o....#......', '#.###.#.####.', '#...#...#....', '###.#.#.#.###', '#...#.#...#..', '#.###.#####.#', '#.#..........', '#...#.#.####-', '###.#.#.#GGGG', '#...#...#####', '#.#.#.#......', '#.#.#.###.#.#', '#...#...#....', '###.###.#.#.#', '#o....#...#.P', '#.###.#.###.#', '#...#.#...#..', '#.#.#.###.#.#', '#............', '#############'],
    ['#############', '#o......#....', '#.#####.#.##.', '#.#...#......', '#.#.#.#.#####', '#...#.......#', '###.#.###.#.#', '###.#.#......', '###.#.#.####-', '    ....#GGGG', '###.#.#.#####', '###.#.#......', '###.#.###.#.#', '#...#.......#', '#.#.#.#.#####', '#.#...#.....P', '#.#####.#.##.', '#o......#....', '#.####.###.#.', '#............', '#############'],
    ['#############', '#o.......#...', '#.#.#.##.#.#.', '#...#........', '#.#.#.#.#.##.', '#.#...#.#....', '#.#.#.#.#.#.#', '#...#........', '#.#.###.####-', '   .....#GGGG', '#.#.###.#####', '#...#........', '#.#.#.#.#.#.#', '#.#...#.#....', '#.#.#.#.#.##.', '#o..#.......P', '#.#.#.##.#.#.', '#.#......#...', '#.#.####.#.#.', '#............', '#############'],
  ];
  const MAZES = HALVES.map(h => h.map(r => r + r.slice(0, -1).split('').reverse().join('')));
  const THEMES = [
    { wall: '#3b5bff', edge: '#9db4ff', fill: '#0b1238', dot: '#ffe7a8' },
    { wall: '#ff3d9a', edge: '#ffb6dc', fill: '#2a0a1d', dot: '#fff0b8' },
    { wall: '#16c9a6', edge: '#a2f7e3', fill: '#04221d', dot: '#ffe7a8' },
    { wall: '#ff8a1f', edge: '#ffd3a0', fill: '#2a1404', dot: '#fff3c8' },
    { wall: '#9a5cff', edge: '#d8c6ff', fill: '#170a33', dot: '#ffe7a8' },
    { wall: '#3fc43f', edge: '#bcf5ab', fill: '#082008', dot: '#fff0b8' },
  ];
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];          // 0 למעלה, 1 שמאלה, 2 למטה, 3 ימינה
  const KEYDIR = { ArrowUp: 0, KeyW: 0, ArrowLeft: 1, KeyA: 1, ArrowDown: 2, KeyS: 2, ArrowRight: 3, KeyD: 3 };
  const OPP = d => (d + 2) & 3;
  const DOOR = { x: 12, y: 8 }, EXIT = { x: 12, y: 7 }, INSIDE = { x: 12, y: 9 };
  const HERO_V = 0.105;
  const GHOST_V = [0.068, 0.08, 0.096];
  const FRIGHT = [10, 7, 5.2];                           // שניות של בהלה, יורד בכל שלב
  const MODES = [[8, 14], [6, 20], [4.5, 25]];          // שניות פיזור / רדיפה
  const RELEASE = [[0, 4, 10, 16], [0, 2, 6, 10], [0, 1, 3, 5.5]];
  const LIVES = [4, 3, 3];
  const SLOPPY = [0.35, 0.2, 0];                       // כמה פעמים רוח פונה סתם כך בצומת
  const HIT = [0.56, 0.62, 0.66];                        // המרחק (במשבצות) שבו רוח תופסת את העכבר
  const FRUIT_PTS = [100, 300, 500, 700, 1000, 2000, 3000, 5000];
  const GHOSTS = [
    { col: '#ff5d8f', dark: '#c22a5f', corner: [24, -2] },   // ישיר
    { col: '#a98bff', dark: '#6a4fd1', corner: [0, -2] },    // מארב מקדימה
    { col: '#3ee0b0', dark: '#1d9b78', corner: [24, 22] },   // אקראי
    { col: '#ffad4d', dark: '#c9771a', corner: [0, 22] },    // סיור
  ];
  const START_X = [12, 10, 12, 14], START_Y = [7, 9, 9, 9];

  function parse(rows) {
    const grid = new Uint8Array(ROWS * COLS), dots = new Uint8Array(ROWS * COLS);
    let start = null, n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = rows[r][c], i = r * COLS + c;
      grid[i] = ch === '#' ? 1 : ch === '-' ? 2 : ch === 'G' ? 3 : 0;
      if (ch === '.') { dots[i] = 1; n++; }
      if (ch === 'o') { dots[i] = 2; n++; }
      if (ch === 'P') start = { x: c, y: r };
    }
    return { grid, dots, start, n };
  }
  const PARSED = MAZES.map(parse);
  const wc = c => ((c % COLS) + COLS) % COLS;
  const cellOf = (S, c, r) => (r < 0 || r >= ROWS ? 1 : S.grid[r * COLS + wc(c)]);
  const open = (S, c, r) => cellOf(S, c, r) === 0;

  // נקודות הסיור של הרוח הרביעית: השביל הקרוב לכל פינה פנימית
  function patrolPoints(P) {
    return [[3, 3], [21, 3], [21, 17], [3, 17]].map(([x, y]) => {
      let best = null, bd = 1e9;
      for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (P.grid[r * COLS + c] === 0) { const d = (c - x) ** 2 + (r - y) ** 2; if (d < bd) { bd = d; best = [c, r]; } }
      return best;
    });
  }
  const PATROL = PARSED.map(patrolPoints);

  // ----- בדיקה: כל גרעין נגיש מנקודת ההתחלה (BFS), סימטריה, בלי מבוי סתום -----
  function verify() {
    return PARSED.map((P, mi) => {
      const S = { grid: P.grid };
      const seen = new Uint8Array(ROWS * COLS), q = [[P.start.x, P.start.y]];
      seen[P.start.y * COLS + P.start.x] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (let d = 0; d < 4; d++) {
          const nx = wc(x + DX[d]), ny = y + DY[d];
          if (open(S, nx, ny) && !seen[ny * COLS + nx]) { seen[ny * COLS + nx] = 1; q.push([nx, ny]); }
        }
      }
      let unreach = 0, dead = 0, ghostOk = true;
      for (let i = 0; i < ROWS * COLS; i++) if (P.dots[i] && !seen[i]) unreach++;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (P.grid[r * COLS + c] !== 0) continue;
        let k = 0; for (let d = 0; d < 4; d++) if (open(S, c + DX[d], r + DY[d])) k++;
        if (k < 2) dead++;
      }
      if (!seen[EXIT.y * COLS + EXIT.x] || P.grid[DOOR.y * COLS + DOOR.x] !== 2 || P.grid[INSIDE.y * COLS + INSIDE.x] !== 3) ghostOk = false;
      const sym = MAZES[mi].every(r => r === r.split('').reverse().join(''));
      return { maze: mi + 1, dots: P.n, unreachable: unreach, deadEnds: dead, symmetric: sym, ghostHouse: ghostOk, patrol: PATROL[mi] };
    });
  }

  // ----- מצב משחק -----
  function newGame(g) {
    const S = g.s = { diff: g.diff, level: 1, lives: LIVES[g.diff], score: 0, extra: false, rnd: Math.random, want: null, swipe: null, fruitsGot: [], waka: 0 };
    loadLevel(g, S);
    return S;
  }
  function loadLevel(g, S) {
    const mi = (S.level - 1) % MAZES.length, P = PARSED[mi];
    S.mi = mi;
    S.grid = P.grid;
    S.dots = P.dots.slice();
    S.left = P.n;
    S.eaten = 0;
    S.fruit = null; S.fruitN = 0;
    S.clear = 0;
    resetActors(g, S);
  }
  function resetActors(g, S) {
    const P = PARSED[S.mi], d = g.diff;
    S.hero = { x: P.start.x, y: P.start.y, px: P.start.x, py: P.start.y, dir: 1, moving: false, face: 1, anim: 0, munch: 0 };
    S.want = null;
    S.ghosts = GHOSTS.map((G, i) => ({
      i, x: START_X[i], y: START_Y[i], px: START_X[i], py: START_Y[i], dir: i === 0 ? 1 : i === 3 ? 1 : 0,
      state: i === 0 ? 'active' : 'house', scared: false, rel: RELEASE[d][i] * 60, bob: i * 1.7, rev: false, pi: i % 4,
    }));
    S.mode = 'scatter'; S.modeT = 0; S.modeI = 0;
    S.fright = 0; S.frightMax = 1; S.combo = 0;
    S.ready = 110; S.dying = 0; S.freeze = 0; S.timeIn = 0;
  }
  const ghostSpeed = (g, S) => GHOST_V[g.diff] + Math.min(0.014, (S.level - 1) * 0.0025);
  const frightSteps = (g, S) => Math.round(Math.max(g.diff === 0 ? 4 : 2.5, FRIGHT[g.diff] - (S.level - 1) * 0.5) * 60);

  // ----- תנועה על הרשת: נקודות מרכז המשבצות הן מספרים שלמים -----
  const atCenter = e => Math.abs(e.x - Math.round(e.x)) < 1e-6 && Math.abs(e.y - Math.round(e.y)) < 1e-6;
  function distToNext(e) {
    const p = DX[e.dir] ? e.x : e.y, s = DX[e.dir] || DY[e.dir];
    const f = s > 0 ? Math.ceil(p - 1e-9) - p : p - Math.floor(p + 1e-9);
    return f < 1e-6 ? 1 : f;
  }
  function wrapX(e) { if (e.x < -0.5) { e.x += COLS; e.px += COLS; } else if (e.x > COLS - 0.5) { e.x -= COLS; e.px -= COLS; } }
  function heroMove(S) {
    const h = S.hero;
    if (S.want !== null && h.moving && S.want === OPP(h.dir)) h.dir = S.want;   // אחורה — מיד
    let rem = HERO_V;
    for (let k = 0; k < 4 && rem > 1e-7; k++) {
      if (atCenter(h)) {
        h.x = Math.round(h.x); h.y = Math.round(h.y);
        if (S.want !== null && open(S, h.x + DX[S.want], h.y + DY[S.want])) h.dir = S.want;
        if (!open(S, h.x + DX[h.dir], h.y + DY[h.dir])) { h.moving = false; break; }
        h.moving = true;
      }
      const st = Math.min(rem, distToNext(h));
      h.x += DX[h.dir] * st; h.y += DY[h.dir] * st; rem -= st;
      if (Math.abs(h.x - Math.round(h.x)) < 1e-6) h.x = Math.round(h.x);
      if (Math.abs(h.y - Math.round(h.y)) < 1e-6) h.y = Math.round(h.y);
      wrapX(h);
    }
    if (DX[h.dir]) h.face = DX[h.dir];
    if (h.moving) h.anim += 0.35;
  }
  function ghostTarget(S, gh) {
    const h = S.hero, hx = Math.round(h.x), hy = Math.round(h.y);
    if (gh.state === 'eyes') return [EXIT.x, EXIT.y];
    if (S.mode === 'scatter') return GHOSTS[gh.i].corner;
    if (gh.i === 0) return [hx, hy];
    if (gh.i === 1) return [hx + DX[h.dir] * 4, hy + DY[h.dir] * 4];
    if (gh.i === 3) {
      if ((hx - gh.x) ** 2 + (hy - gh.y) ** 2 < 25) return [hx, hy];
      const wp = PATROL[S.mi][gh.pi];
      if (Math.abs(wp[0] - Math.round(gh.x)) + Math.abs(wp[1] - Math.round(gh.y)) <= 2) gh.pi = (gh.pi + 1) % 4;
      return PATROL[S.mi][gh.pi];
    }
    return null;   // הרוח האקראית
  }
  function ghostChoose(S, gh) {
    const x = Math.round(gh.x), y = Math.round(gh.y), opts = [];
    for (const d of [0, 1, 2, 3]) if (d !== OPP(gh.dir) && open(S, x + DX[d], y + DY[d])) opts.push(d);
    if (!opts.length) return OPP(gh.dir);
    if (opts.length === 1) return opts[0];
    const tg = (gh.scared && gh.state === 'active') || (gh.state === 'active' && S.rnd() < SLOPPY[S.diff]) ? null : ghostTarget(S, gh);
    if (!tg) return opts[Math.floor(S.rnd() * opts.length)];
    let best = opts[0], bd = Infinity;
    for (const d of opts) { const dd = (x + DX[d] - tg[0]) ** 2 + (y + DY[d] - tg[1]) ** 2; if (dd < bd - 1e-9) { bd = dd; best = d; } }
    return best;
  }
  function ghostMove(g, S, gh) {
    if (gh.state === 'house') {
      gh.bob += 0.09;
      gh.y = INSIDE.y + Math.sin(gh.bob) * 0.22;
      if (S.timeIn >= gh.rel) gh.state = 'leaving';
      return;
    }
    if (gh.state === 'leaving' || gh.state === 'entering') {
      const v = gh.state === 'entering' ? 0.12 : 0.06;
      const tx = gh.state === 'entering' ? INSIDE.x : DOOR.x, ty = gh.state === 'entering' ? INSIDE.y : EXIT.y;
      if (gh.state === 'leaving' && Math.abs(gh.x - DOOR.x) > 1e-6) { gh.y += (INSIDE.y - gh.y) * 0.3; gh.x += Math.sign(DOOR.x - gh.x) * Math.min(v, Math.abs(DOOR.x - gh.x)); gh.dir = gh.x < DOOR.x ? 3 : 1; return; }
      const dy = ty - gh.y;
      gh.x = tx;
      if (Math.abs(dy) <= v) {
        gh.y = ty;
        if (gh.state === 'leaving') { gh.state = 'active'; gh.dir = S.rnd() < 0.5 ? 1 : 3; }
        else { gh.state = 'leaving'; gh.scared = false; }
      } else { gh.y += Math.sign(dy) * v; gh.dir = dy < 0 ? 0 : 2; }
      return;
    }
    let v = gh.state === 'eyes' ? 0.22 : gh.scared ? 0.055 : ghostSpeed(g, S);
    const row = Math.round(gh.y);
    if (gh.state !== 'eyes' && (gh.x < 3.5 || gh.x > COLS - 4.5) && S.grid[row * COLS] !== 1) v *= 0.55;   // לאט במנהרה
    if (gh.rev) { gh.rev = false; gh.dir = OPP(gh.dir); }
    let rem = v;
    for (let k = 0; k < 4 && rem > 1e-7; k++) {
      if (atCenter(gh)) {
        gh.x = Math.round(gh.x); gh.y = Math.round(gh.y);
        if (gh.state === 'eyes' && gh.x === EXIT.x && gh.y === EXIT.y) { gh.state = 'entering'; return; }
        gh.dir = ghostChoose(S, gh);
      }
      const st = Math.min(rem, distToNext(gh));
      gh.x += DX[gh.dir] * st; gh.y += DY[gh.dir] * st; rem -= st;
      if (Math.abs(gh.x - Math.round(gh.x)) < 1e-6) gh.x = Math.round(gh.x);
      if (Math.abs(gh.y - Math.round(gh.y)) < 1e-6) gh.y = Math.round(gh.y);
      wrapX(gh);
    }
  }

  // ----- אוכל, רוחות, מוות -----
  function eatAt(g, S) {
    const h = S.hero, c = wc(Math.round(h.x)), r = Math.round(h.y), i = r * COLS + c;
    if (Math.abs(h.x - Math.round(h.x)) + Math.abs(h.y - r) > 0.42) return;
    const v = S.dots[i];
    if (v) {
      S.dots[i] = 0; S.left--; S.eaten++;
      h.munch = 8;
      const px = c * T + T / 2, py = r * T + T / 2;
      if (v === 2) {
        add(g, S, 50);
        S.fright = S.frightMax = frightSteps(g, S);
        S.combo = 0;
        for (const gh of S.ghosts) if (gh.state !== 'eyes' && gh.state !== 'entering') { gh.scared = true; if (gh.state === 'active') gh.rev = true; }
        g.burst(px, py, { n: 22, color: ['#ffffff', '#9ff3ff', '#7aa8ff'], speed: 3.5, life: 34, gravity: 0 });
        if (!g.demo) g.flash('#9ff3ff', 0.16);
        g.sfx('power');
      } else {
        add(g, S, 10);
        S.waka ^= 1;
        g.tone({ type: 'triangle', f: S.waka ? 520 : 660, dur: 0.05, vol: 0.07 });
        if (S.left % 3 === 0) g.burst(px, py, { n: 3, color: THEMES[S.mi].dot, speed: 1.2, life: 14, gravity: 0, size: 3 });
      }
      if (S.eaten === 70 || S.eaten === 170) S.fruit = { t: 570, kind: (S.level - 1) % 5 };
      if (S.left <= 0) { S.clear = 1; g.sfx('win'); }
    }
    const P = PARSED[S.mi];
    if (S.fruit && Math.abs(h.x - P.start.x) + Math.abs(h.y - P.start.y) < 0.6) {
      const pts = FRUIT_PTS[Math.min(FRUIT_PTS.length - 1, S.level - 1)];
      add(g, S, pts);
      g.float(P.start.x * T + T / 2, P.start.y * T, '+' + pts, { color: '#ffd166', size: 24 });
      g.burst(P.start.x * T + T / 2, P.start.y * T + T / 2, { n: 18, color: ['#ff5d5d', '#ffd166', '#7be07b'], speed: 3, life: 30, gravity: 0 });
      g.sfx('coin');
      S.fruitsGot.push(S.fruit.kind); if (S.fruitsGot.length > 6) S.fruitsGot.shift();
      S.fruit = null;
    }
  }
  function add(g, S, n) {
    S.score += n; g.score = S.score;
    if (!S.extra && S.score >= 10000) { S.extra = true; S.lives++; if (!g.demo) { g.msg(g.t('extra'), 1400, '#7be07b'); g.sfx('record'); } }
  }
  function collide(g, S) {
    const h = S.hero;
    for (const gh of S.ghosts) {
      if (gh.state !== 'active') continue;
      let dx = Math.abs(gh.x - h.x); if (dx > COLS / 2) dx = COLS - dx;
      if (dx * dx + (gh.y - h.y) ** 2 > HIT[S.diff] * HIT[S.diff]) continue;
      if (gh.scared) {
        const pts = 200 * (1 << Math.min(3, S.combo++));
        add(g, S, pts);
        gh.state = 'eyes'; gh.scared = false;
        S.freeze = 32; S.freezeTxt = { x: gh.x, y: gh.y, pts };
        g.burst(gh.x * T + T / 2, gh.y * T + T / 2, { n: 20, color: ['#3d4cff', '#ffffff', '#9ff3ff'], speed: 3.2, life: 30, gravity: 0 });
        g.sfx('score', { p: 1 + S.combo * 0.18 });
        return;
      }
      S.dying = 1;
      if (!g.demo) {
        g.sfx('hit');
        g.tone({ type: 'triangle', f: 700, f2: 120, dur: 0.9, vol: 0.12, delay: 0.15 });
        g.shake(6);
        g.burst(h.x * T + T / 2, h.y * T + T / 2, { n: 26, color: ['#d6d1e6', '#ffb3c8', '#ffffff'], speed: 3, life: 40, gravity: 0 });
      }
      return;
    }
  }

  function setWant(S, d) { S.want = d; }

  // ----- בוט לבדיקות: הדרך הבטוחה לגרעין הקרוב, בורח כשרוח מתקרבת -----
  function bfsFrom(S, x, y, maxD) {
    const dist = new Int16Array(ROWS * COLS).fill(-1), q = [x, y];
    dist[y * COLS + x] = 0;
    for (let qi = 0; qi < q.length; qi += 2) {
      const cx = q[qi], cy = q[qi + 1], cd = dist[cy * COLS + cx];
      if (cd >= maxD) continue;
      for (let d = 0; d < 4; d++) {
        const nx = wc(cx + DX[d]), ny = cy + DY[d];
        if (!open(S, nx, ny) || dist[ny * COLS + nx] >= 0) continue;
        dist[ny * COLS + nx] = cd + 1; q.push(nx, ny);
      }
    }
    return dist;
  }
  // הבוט: BFS מהמרכז הבא של העכבר רק דרך משבצות שהעכבר מגיע אליהן לפני כל רוח,
  // אל הגרעין (או הפרי, או רוח מבוהלת) הקרוב. אין דרך בטוחה — בורח למשבצת הכי רחוקה מהרוחות
  function botDir(g, S) {
    const h = S.hero;
    let sx = Math.round(h.x), sy = Math.round(h.y);
    if (!atCenter(h) && h.moving) { sx = Math.round(h.x + DX[h.dir] * 0.5); sy = Math.round(h.y + DY[h.dir] * 0.5); }
    sx = wc(sx);
    const ratio = ghostSpeed(g, S) / HERO_V;
    const threats = S.ghosts.filter(gh => (gh.state === 'active' && (!gh.scared || S.fright < 90)) || gh.state === 'leaving');
    const gd = threats.map(gh => (gh.state === 'leaving' ? bfsFrom(S, EXIT.x, EXIT.y, 40) : bfsFrom(S, wc(Math.round(gh.x)), Math.round(gh.y), 40)));
    const danger = i => { let m = 99; for (const d of gd) if (d[i] >= 0 && d[i] < m) m = d[i]; return m; };
    const prev = new Int16Array(ROWS * COLS).fill(-2), hd = new Int16Array(ROWS * COLS).fill(-1);
    const q = [sx, sy], si = sy * COLS + sx;
    prev[si] = -1; hd[si] = 0;
    let goal = -1, far = si, farScore = -1;
    const huntOk = S.fright > 120, P = PARSED[S.mi];
    for (let qi = 0; qi < q.length; qi += 2) {
      const cx = q[qi], cy = q[qi + 1], ci = cy * COLS + cx, cd = hd[ci];
      const isFruit = S.fruit && cx === P.start.x && cy === P.start.y;
      const hunt = huntOk && S.ghosts.some(gh => gh.scared && gh.state === 'active' && wc(Math.round(gh.x)) === cx && Math.round(gh.y) === cy);
      if (cd > 0 && (S.dots[ci] || isFruit || hunt)) { goal = ci; break; }
      const dg = danger(ci);
      if (dg > farScore) { farScore = dg; far = ci; }
      for (let d = 0; d < 4; d++) {
        const nx = wc(cx + DX[d]), ny = cy + DY[d], ni = ny * COLS + nx;
        if (!open(S, nx, ny) || prev[ni] !== -2) continue;
        if (danger(ni) <= (cd + 1) * ratio + 2) continue;
        prev[ni] = ci; hd[ni] = cd + 1; q.push(nx, ny);
      }
    }
    const target = goal >= 0 ? goal : far;
    if (target === si) {
      // אין לאן ללכת בבטחה: מתרחקים מהרוח הקרובה
      let best = null, bs = -1;
      for (let d = 0; d < 4; d++) { const nx = wc(sx + DX[d]), ny = sy + DY[d]; if (open(S, nx, ny)) { const s = danger(ny * COLS + nx); if (s > bs) { bs = s; best = d; } } }
      return best;
    }
    let t = target;
    while (prev[t] !== si && prev[t] >= 0) t = prev[t];
    const tx = t % COLS, ty = (t / COLS) | 0;
    for (let d = 0; d < 4; d++) if (wc(sx + DX[d]) === tx && sy + DY[d] === ty) {
      // באמצע משבצת: הכיוון יופעל במרכז הבא; אם המרכז הבא מסוכן — מסתובבים עכשיו
      if (!atCenter(h) && h.moving && d !== h.dir) return danger(si) <= 2 ? OPP(h.dir) : d;
      return d;
    }
    return null;
  }

  // ----- ציור -----
  const wallCache = {};
  function wallLayer(S, k, flash) {
    const key = S.mi + ':' + k + ':' + (flash ? 1 : 0);
    if (wallCache[key]) return wallCache[key];
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * k); cv.height = Math.round(MH * k);
    const c = cv.getContext('2d');
    c.scale(k, k);
    drawWalls(c, PARSED[S.mi].grid, flash ? { wall: '#ffffff', edge: '#ffffff', fill: '#3a4a8a' } : THEMES[S.mi]);
    for (const kk of Object.keys(wallCache)) if (!kk.startsWith(S.mi + ':')) delete wallCache[kk];
    return (wallCache[key] = cv);
  }
  function drawWalls(c, grid, th, x0, y0, cols, rows) {
    x0 = x0 || 0; y0 = y0 || 0; cols = cols || COLS; rows = rows || ROWS;
    const isW = (cc, rr) => cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && grid[rr * COLS + cc] === 1;
    const segs = [], squares = [], dotsW = [];
    for (let r = y0; r < y0 + rows; r++) for (let cc = x0; cc < x0 + cols; cc++) {
      if (!isW(cc, r)) continue;
      let lonely = true;
      // in = קטע שמוקף בקירות משני הצדדים (בתוך גוש גדול) — עליו לא מציירים את הקו הבהיר
      if (isW(cc + 1, r)) { segs.push([cc, r, cc + 1, r, isW(cc, r - 1) && isW(cc + 1, r - 1) && isW(cc, r + 1) && isW(cc + 1, r + 1)]); lonely = false; }
      if (isW(cc, r + 1)) { segs.push([cc, r, cc, r + 1, isW(cc - 1, r) && isW(cc - 1, r + 1) && isW(cc + 1, r) && isW(cc + 1, r + 1)]); lonely = false; }
      if (isW(cc - 1, r) || isW(cc, r - 1)) lonely = false;
      if (isW(cc + 1, r) && isW(cc, r + 1) && isW(cc + 1, r + 1)) squares.push([cc, r]);
      if (lonely) dotsW.push([cc, r]);
    }
    const P = v => v * T + T / 2;
    const pass = (col, wd, blur, edgeOnly) => {
      c.save();
      if (blur) { c.shadowColor = th.wall; c.shadowBlur = blur; }
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      for (const s of segs) { if (edgeOnly && s[4]) continue; c.moveTo(P(s[0]), P(s[1])); c.lineTo(P(s[2]), P(s[3])); }
      c.stroke();
      if (!edgeOnly) for (const s of squares) c.fillRect(P(s[0]), P(s[1]), T, T);
      for (const d of dotsW) { c.beginPath(); c.arc(P(d[0]), P(d[1]), wd / 2, 0, Math.PI * 2); c.fill(); }
      c.restore();
    };
    const wd = T * 0.74;
    pass(th.wall, wd, 12);
    pass(th.fill, wd - 6, 0);
    // קו פנימי דק ובהיר
    c.save(); c.globalAlpha = 0.35; pass(th.edge, 2, 0, true); c.restore();
    // דלת הבית
    c.fillStyle = '#ff9ad5';
    if (grid[DOOR.y * COLS + DOOR.x] === 2) { c.fillRect(DOOR.x * T + 2, DOOR.y * T + T / 2 - 3, T - 4, 6); }
  }
  function drawSeed(ctx, x, y, col, t) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, 3.4, 2.6, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  function drawGem(ctx, x, y, t, scale) {
    const s = (scale || 1) * (1 + Math.sin(t * 0.12) * 0.12);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    gr.addColorStop(0, 'rgba(160,240,255,.75)'); gr.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(-15, -15, 30, 30);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, -2); ctx.lineTo(0, 9); ctx.lineTo(-7, -2); ctx.closePath();
    ctx.fillStyle = '#7fe6ff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fillStyle = '#e8fbff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(0, -2); ctx.lineTo(0, 9); ctx.closePath(); ctx.fillStyle = '#3fb7e6'; ctx.fill();
    ctx.restore();
  }
  // העכבר, מבט מלמעלה, האף לכיוון התנועה
  function drawMouse(ctx, x, y, dir, o) {
    o = o || {};
    const s = o.s || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate([-Math.PI / 2, Math.PI, Math.PI / 2, 0][dir]);
    const sq = 1 + (o.munch || 0) * 0.015;
    ctx.scale(s * sq, s / sq);
    if (o.spin) { ctx.rotate(o.spin); ctx.scale(o.shrink, o.shrink); }
    const step = Math.sin(o.anim || 0);
    // זנב
    ctx.strokeStyle = '#e59ab4'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-15, step * 5, -21, -step * 3); ctx.stroke();
    // רגליים
    ctx.fillStyle = '#f2a7c0';
    for (const [fx, fy] of [[4, -6.5], [4, 6.5], [-5, -6.5], [-5, 6.5]]) { ctx.beginPath(); ctx.ellipse(fx + (fy > 0 ? step : -step) * 1.6 * (fx > 0 ? 1 : -1), fy, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
    // גוף
    const gr = ctx.createRadialGradient(-2, -3, 1, 0, 0, 12);
    gr.addColorStop(0, '#e8e4f2'); gr.addColorStop(1, '#a29cb8');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(-1, 0, 10, 7.6, 0, 0, Math.PI * 2); ctx.fill();
    // ראש
    ctx.beginPath(); ctx.ellipse(7, 0, 6.4, 5.6, 0, 0, Math.PI * 2); ctx.fill();
    // אוזניים
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = '#b8b2cc'; ctx.beginPath(); ctx.arc(4.5, sgn * 6.4, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb3cc'; ctx.beginPath(); ctx.arc(4.8, sgn * 6.4, 2.8, 0, Math.PI * 2); ctx.fill();
    }
    // עיניים, אף ושפם
    ctx.fillStyle = '#1a1424';
    if (o.dead) { ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 1.2; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(8, sgn * 2.6 - 1.2); ctx.lineTo(10.4, sgn * 2.6 + 1.2); ctx.moveTo(10.4, sgn * 2.6 - 1.2); ctx.lineTo(8, sgn * 2.6 + 1.2); ctx.stroke(); } }
    else for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(9.4, sgn * 2.6, 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff6f9c'; ctx.beginPath(); ctx.arc(13.2, 0, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const sgn of [-1, 1]) { ctx.moveTo(12, sgn * 1.2); ctx.lineTo(16, sgn * 4.5); ctx.moveTo(12, sgn * 0.6); ctx.lineTo(16.5, sgn * 1.6); }
    ctx.stroke();
    ctx.restore();
  }
  function drawGhost(ctx, x, y, gh, t, flashWhite) {
    const G = GHOSTS[gh.i], r = 12.5;
    if (gh.state === 'eyes' || gh.state === 'entering') { drawEyes(ctx, x, y, gh.dir, false); return; }
    let body = G.col, dark = G.dark;
    if (gh.scared) { body = flashWhite ? '#f1f3ff' : '#3d4cff'; dark = flashWhite ? '#c9cfff' : '#2330b8'; }
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.15 + gh.i) * 0.8);
    ctx.beginPath();
    ctx.arc(0, -2, r, Math.PI, 0);
    const wob = t * 0.25;
    ctx.lineTo(r, r - 2);
    for (let k = 0; k < 4; k++) {
      const x1 = r - (k + 0.5) * (2 * r / 4), x2 = r - (k + 1) * (2 * r / 4);
      ctx.quadraticCurveTo(x1, r - 2 + (k % 2 ? 1 : -1) * 3 * Math.sin(wob + k) - 3, x2, r - 2);
    }
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, -r, 0, r);
    gr.addColorStop(0, body); gr.addColorStop(1, dark);
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.ellipse(-4.5, -8, 3.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill();
    if (gh.scared) {
      ctx.fillStyle = flashWhite ? '#e2364f' : '#ffe6f0';
      for (const sx of [-4, 4]) { ctx.beginPath(); ctx.arc(sx, -3, 2.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = flashWhite ? '#e2364f' : '#ffe6f0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-7, 5); for (let k = 0; k < 6; k++) ctx.lineTo(-7 + (k + 1) * 14 / 6, 5 + (k % 2 ? 0 : -2.5)); ctx.stroke();
      ctx.restore();
      return;
    }
    // לחיים
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(-7, 3, 2.4, 1.5, 0, 0, Math.PI * 2); ctx.ellipse(7, 3, 2.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawEyes(ctx, x, y + Math.sin(t * 0.15 + gh.i) * 0.8, gh.dir, true);
  }
  function drawEyes(ctx, x, y, dir, onBody) {
    const ox = DX[dir] * 2.2, oy = DY[dir] * 2.2;
    for (const sx of [-4.6, 4.6]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x + sx + ox * 0.4, y - 3 + oy * 0.4, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b2a8a';
      ctx.beginPath(); ctx.arc(x + sx + ox, y - 3 + oy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawFruit(ctx, x, y, kind, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    if (kind === 0) {          // דובדבנים
      ctx.strokeStyle = '#4c8a2a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(-2, -6, 3, -10); ctx.moveTo(5, 3); ctx.quadraticCurveTo(4, -4, 3, -10); ctx.stroke();
      for (const [cx, cy] of [[-4, 4], [5, 5]]) { const gr = ctx.createRadialGradient(cx - 1.5, cy - 1.5, 0.5, cx, cy, 5); gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(1, '#c4122a'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, 4.6, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 1) {   // תות
      const gr = ctx.createRadialGradient(-2, -2, 1, 0, 1, 9); gr.addColorStop(0, '#ff7a7a'); gr.addColorStop(1, '#d01834');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-7, -3); ctx.quadraticCurveTo(0, -7, 7, -3); ctx.quadraticCurveTo(6, 6, 0, 9); ctx.quadraticCurveTo(-6, 6, -7, -3); ctx.fill();
      ctx.fillStyle = '#ffe9a0'; for (const [sx, sy] of [[-3, 0], [2, -1], [-1, 4], [3, 4], [0, 1]]) { ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#3fae3f'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-2, -8); ctx.lineTo(0, -5); ctx.lineTo(2, -8); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
    } else if (kind === 2) {   // תפוז
      const gr = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#f07a12');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 1, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3fae3f'; ctx.beginPath(); ctx.ellipse(3, -7, 3.5, 1.8, -0.5, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 3) {   // ענבים
      ctx.fillStyle = '#8a4fd8';
      for (const [cx, cy] of [[-4, -3], [0, -4], [4, -3], [-2, 1], [2, 1], [0, 5]]) { ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (const [cx, cy] of [[-5, -4], [-1, -5], [-3, 0]]) { ctx.beginPath(); ctx.arc(cx, cy, 1, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#4c8a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, -10); ctx.stroke();
    } else {                   // אגס
      const gr = ctx.createRadialGradient(-2, 0, 1, 0, 2, 9); gr.addColorStop(0, '#e9ff8a'); gr.addColorStop(1, '#8fbf1f');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(4, -6, 4, -1); ctx.quadraticCurveTo(8, 3, 6, 7); ctx.quadraticCurveTo(0, 11, -6, 7); ctx.quadraticCurveTo(-8, 3, -4, -1); ctx.quadraticCurveTo(-4, -6, 0, -7); ctx.fill();
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, -10); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBoard(g, ctx, S, alpha, t) {
    ctx.fillStyle = '#070b1e'; ctx.fillRect(0, 0, W, H);
    const k = Math.min(3, Math.max(1, ctx.getTransform().a || 1));
    const flash = S.clear > 30 && Math.floor(S.clear / 12) % 2 === 1;
    ctx.drawImage(wallLayer(S, k, flash), 0, 0, W, MH);
    const th = THEMES[S.mi];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = S.dots[r * COLS + c];
      if (!v) continue;
      if (v === 1) drawSeed(ctx, c * T + T / 2, r * T + T / 2, th.dot, t);
      else drawGem(ctx, c * T + T / 2, r * T + T / 2, t + c, 1);
    }
    const P = PARSED[S.mi];
    if (S.fruit) { const blink = S.fruit.t < 120 && Math.floor(S.fruit.t / 8) % 2; if (!blink) drawFruit(ctx, P.start.x * T + T / 2, P.start.y * T + T / 2 + Math.sin(t * 0.1) * 1.5, S.fruit.kind, 1.25); }
    const lerp = (a, b) => (Math.abs(b - a) > 2 ? b : a + (b - a) * alpha);
    if (!(S.dying > 45)) for (const gh of S.ghosts) {
      if (S.freeze && S.freezeTxt && gh.state === 'eyes' && Math.abs(gh.x - S.freezeTxt.x) < 0.01 && Math.abs(gh.y - S.freezeTxt.y) < 0.01) continue;
      const fw = gh.scared && S.fright < 120 && Math.floor(S.fright / 10) % 2 === 0;
      drawGhost(ctx, lerp(gh.px, gh.x) * T + T / 2, lerp(gh.py, gh.y) * T + T / 2, gh, t, fw);
    }
    const h = S.hero;
    if (S.dying) {
      const u = Math.min(1, S.dying / 80);
      drawMouse(ctx, h.x * T + T / 2, h.y * T + T / 2, h.dir, { spin: u * 8, shrink: Math.max(0.05, 1 - u), dead: true });
    } else drawMouse(ctx, lerp(h.px, h.x) * T + T / 2, lerp(h.py, h.y) * T + T / 2, h.dir, { anim: h.anim, munch: h.munch, s: 1.05 });
    if (S.freeze && S.freezeTxt) g.text(ctx, String(S.freezeTxt.pts), S.freezeTxt.x * T + T / 2, S.freezeTxt.y * T + T / 2, { size: 18, color: '#9ff3ff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
    // פס תחתון: חיים ופירות
    const by = MH + 18;
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, MH, W, H - MH);
    for (let i = 0; i < Math.min(8, S.lives - 1); i++) drawMouse(ctx, 26 + i * 30, by, 3, { s: 0.85 });
    S.fruitsGot.forEach((f, i) => drawFruit(ctx, W - 26 - i * 28, by, f, 1));
  }

  GK.register('ghost-maze', {
    w: W, h: H, bg: '#070b1e', accent: '#ff7eb6',
    diffs: true,
    touch: [['ArrowLeft', '◀'], ['ArrowUp', '▲'], ['ArrowDown', '▼'], ['ArrowRight', '▶']],
    text: {
      he: { title: 'מבוך הרוחות', help: ['חצים או WASD — לזוז במבוך (אפשר ללחוץ מראש, והעכבר יפנה בפינה הבאה)', 'אכול את כל הגרעינים כדי לעבור שלב', 'אבן כוח מבהילה את הרוחות לכמה שניות — אז אפשר לתפוס אותן!', 'היזהר: כל רוח רודפת בדרך אחרת'], helpTouch: ['החלק על המסך או השתמש בכפתורים כדי לזוז', 'אכול את כל הגרעינים כדי לעבור שלב', 'אבן כוח מבהילה את הרוחות — אז אפשר לתפוס אותן!'], levelN: 'שלב {n}!', extra: 'חיים נוספים!', reached: 'הגעת לשלב {n}' },
      en: { title: 'Ghost Maze', help: ['Arrows or WASD — move through the maze (press early and the mouse turns at the next corner)', 'Eat all the seeds to clear the level', 'A power gem scares the ghosts for a few seconds — catch them then!', 'Watch out: every ghost chases in its own way'], helpTouch: ['Swipe on the screen or use the buttons to move', 'Eat all the seeds to clear the level', 'A power gem scares the ghosts — catch them then!'], levelN: 'Level {n}!', extra: 'Extra life!', reached: 'You reached level {n}' },
      ar: { title: 'متاهة الأشباح', help: ['الأسهم أو WASD — تحرّك في المتاهة (اضغط مبكراً فينعطف الفأر عند الزاوية التالية)', 'كُل كل البذور لتجتاز المرحلة', 'جوهرة القوة تُخيف الأشباح لبضع ثوانٍ — عندها أمسك بها!', 'احذر: كل شبح يطاردك بطريقته'], helpTouch: ['اسحب على الشاشة أو استخدم الأزرار للتحرك', 'كُل كل البذور لتجتاز المرحلة', 'جوهرة القوة تُخيف الأشباح — عندها أمسك بها!'], levelN: 'المرحلة {n}!', extra: 'روح إضافية!', reached: 'وصلت إلى المرحلة {n}' },
      es: { title: 'Laberinto de fantasmas', help: ['Flechas o WASD: muévete por el laberinto (pulsa antes y el ratón gira en la próxima esquina)', 'Come todas las semillas para pasar de nivel', 'Una gema de poder asusta a los fantasmas unos segundos: ¡atrápalos!', 'Cuidado: cada fantasma persigue a su manera'], helpTouch: ['Desliza en la pantalla o usa los botones para moverte', 'Come todas las semillas para pasar de nivel', 'Una gema de poder asusta a los fantasmas: ¡atrápalos!'], levelN: '¡Nivel {n}!', extra: '¡Vida extra!', reached: 'Llegaste al nivel {n}' },
      fr: { title: 'Labyrinthe des fantômes', help: ['Flèches ou WASD : avance dans le labyrinthe (appuie en avance, la souris tourne au prochain coin)', 'Mange toutes les graines pour finir le niveau', 'Une gemme de pouvoir effraie les fantômes quelques secondes : attrape-les !', 'Attention : chaque fantôme poursuit à sa façon'], helpTouch: ["Glisse sur l'écran ou utilise les boutons pour bouger", 'Mange toutes les graines pour finir le niveau', 'Une gemme de pouvoir effraie les fantômes : attrape-les !'], levelN: 'Niveau {n} !', extra: 'Vie en plus !', reached: 'Tu as atteint le niveau {n}' },
      pt: { title: 'Labirinto dos Fantasmas', help: ['Setas ou WASD: ande pelo labirinto (aperte antes e o ratinho vira na próxima esquina)', 'Coma todas as sementes para passar de fase', 'Uma gema de poder assusta os fantasmas por alguns segundos: pegue-os!', 'Cuidado: cada fantasma persegue do seu jeito'], helpTouch: ['Deslize na tela ou use os botões para andar', 'Coma todas as sementes para passar de fase', 'Uma gema de poder assusta os fantasmas: pegue-os!'], levelN: 'Fase {n}!', extra: 'Vida extra!', reached: 'Você chegou à fase {n}' },
      ru: { title: 'Лабиринт призраков', help: ['Стрелки или WASD — двигайся по лабиринту (нажми заранее, и мышка свернёт на ближайшем углу)', 'Съешь все зёрнышки, чтобы пройти уровень', 'Камень силы пугает призраков на несколько секунд — лови их!', 'Осторожно: каждый призрак гоняется по-своему'], helpTouch: ['Проводи по экрану или нажимай кнопки, чтобы двигаться', 'Съешь все зёрнышки, чтобы пройти уровень', 'Камень силы пугает призраков — лови их!'], levelN: 'Уровень {n}!', extra: 'Лишняя жизнь!', reached: 'Ты дошёл до уровня {n}' },
      de: { title: 'Geisterlabyrinth', help: ['Pfeile oder WASD – durchs Labyrinth laufen (früh drücken, die Maus biegt an der nächsten Ecke ab)', 'Friss alle Körner, um das Level zu schaffen', 'Ein Kraftjuwel erschreckt die Geister ein paar Sekunden – dann fang sie!', 'Vorsicht: Jeder Geist jagt auf seine eigene Art'], helpTouch: ['Wische über den Bildschirm oder nutze die Tasten', 'Friss alle Körner, um das Level zu schaffen', 'Ein Kraftjuwel erschreckt die Geister – dann fang sie!'], levelN: 'Level {n}!', extra: 'Extraleben!', reached: 'Du hast Level {n} erreicht' },
    },

    init(g) {
      const S = newGame(g);
      if (g.demo) { S.ready = 0; for (const gh of S.ghosts) gh.rel = 0; }
    },

    // בתפריט: הבוט משחק בשקט ברקע
    idle(g) {
      const S = g.s;
      if (!S || !g.demo) return;
      const d = botDir(g, S);
      if (d !== null && d !== undefined) setWant(S, d);
      tick(g, S);
      if (S.dying > 90 || S.clear > 130) { const lv = S.clear > 130 ? S.level + 1 : S.level; newGame(g); g.s.level = lv; loadLevel(g, g.s); g.s.ready = 0; }
    },

    step(g) {
      const S = g.s;
      for (const c of g.hits) if (KEYDIR[c] !== undefined) setWant(S, KEYDIR[c]);
      tick(g, S);
      const b = g.getBest();
      g.hud([[g.t('score'), S.score], [g.t('best'), b === null ? '—' : Math.max(b, S.score)], [g.t('level'), S.level]]);
    },

    bot(g) {
      const S = g.s;
      if (S.ready || S.dying || S.clear || S.freeze) return;
      const d = botDir(g, S);
      if (d !== null && d !== undefined) setWant(S, d);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') S.swipe = { x: p.x, y: p.y, id: p.id, moved: false };
      else if (type === 'move' && S.swipe && S.swipe.id === p.id) {
        const dx = p.x - S.swipe.x, dy = p.y - S.swipe.y;
        if (Math.hypot(dx, dy) < 22) return;
        setWant(S, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0));
        S.swipe = { x: p.x, y: p.y, id: p.id, moved: true };
      } else if (type === 'up' && S.swipe) {
        if (!S.swipe.moved) {
          // לחיצה בלי החלקה: פונים לכיוון הלחיצה ביחס לעכבר
          const hx = S.hero.x * T + T / 2, hy = S.hero.y * T + T / 2, dx = p.x - hx, dy = p.y - hy;
          if (Math.hypot(dx, dy) > 14) setWant(S, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0));
        }
        S.swipe = null;
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s, t = (g.demo ? S.demoT || 0 : g.frame) + alpha;
      drawBoard(g, ctx, S, alpha, t);
      if (S.ready && !g.demo) {
        const a = Math.min(1, S.ready / 20);
        g.text(ctx, S.level > 1 && S.readyLv ? g.t('levelN', { n: S.level }) : g.t('ready'), W / 2, 11 * T + T / 2 + 1, { size: 24, color: '#ffe066', stroke: 'rgba(0,0,0,.75)', strokeW: 5, alpha: a, maxW: 8 * T });
      }
    },

    _verify: verify,   // לבדיקות: BFS על כל המבוכים
    _load: loadLevel,

    cover(ctx, w, h, k) {
      // תקריב של המבוך: העכבר בורח, רוח מבוהלת ושתי רוחות רודפות
      const S = { mi: 0, grid: PARSED[0].grid, dots: PARSED[0].dots.slice() };
      ctx.fillStyle = '#070b1e'; ctx.fillRect(0, 0, w, h);
      const z = 1.62;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-12.5 * T, -14.6 * T);
      drawWalls(ctx, PARSED[0].grid, THEMES[0]);
      for (let r = 9; r < 21; r++) for (let c = 0; c < COLS; c++) {
        const v = S.dots[r * COLS + c];
        if (!v || (r === 15 && c >= 6 && c <= 11)) continue;
        if (v === 1) drawSeed(ctx, c * T + T / 2, r * T + T / 2, THEMES[0].dot, 0); else drawGem(ctx, c * T + T / 2, r * T + T / 2, 3, 1.25);
      }
      drawMouse(ctx, 9 * T + T / 2, 15 * T + T / 2, 1, { anim: 1, s: 1.45 });
      drawGhost(ctx, 13 * T + T / 2, 15 * T + T / 2, { i: 0, dir: 1, state: 'active' }, 2, false);
      drawGhost(ctx, 10 * T + T / 2, 11 * T + T / 2, { i: 1, dir: 2, state: 'active' }, 9, false);
      drawGhost(ctx, 5 * T + T / 2, 17 * T + T / 2, { i: 2, dir: 3, state: 'active', scared: true }, 5, false);
      drawGhost(ctx, 18 * T + T / 2, 13 * T + T / 2, { i: 3, dir: 1, state: 'active' }, 7, false);
      drawFruit(ctx, 12 * T + T / 2, 13 * T + T / 2, 0, 1.4);
      ctx.restore();
      const gr = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
  });

  // צעד אחד של המשחק (גם במשחק וגם בהדגמה שבתפריט)
  function tick(g, S) {
    S.demoT = (S.demoT || 0) + 1;
    const h = S.hero;
    h.px = h.x; h.py = h.y;
    for (const gh of S.ghosts) { gh.px = gh.x; gh.py = gh.y; }
    if (h.munch > 0) h.munch--;
    if (S.ready) { S.ready--; return; }
    if (S.clear) {
      if (++S.clear === 130 && !g.demo) {
        S.level++;
        loadLevel(g, S);
        S.readyLv = true;
        g.msg(g.t('levelN', { n: S.level }), 1300, '#ffe066');
        g.sfx('power');
      }
      return;
    }
    if (S.dying) {
      if (++S.dying === 92 && !g.demo) {
        S.lives--;
        if (S.lives <= 0) { g.end({ score: S.score, text: g.t('reached', { n: S.level }), delay: 600 }); return; }
        resetActors(g, S);
        S.readyLv = false;
      }
      return;
    }
    if (S.freeze) { S.freeze--; return; }
    S.timeIn++;
    if (S.fruit && --S.fruit.t <= 0) S.fruit = null;
    // פיזור ורדיפה מתחלפים (לא בזמן בהלה)
    if (S.fright > 0) {
      if (--S.fright === 0) for (const gh of S.ghosts) gh.scared = false;
    } else {
      S.modeT++;
      const M = MODES[g.diff], lim = (S.mode === 'scatter' ? M[0] : M[1]) * 60;
      if (S.modeT >= lim && S.modeI < 7) {
        S.modeT = 0; S.modeI++;
        S.mode = S.mode === 'scatter' ? 'chase' : 'scatter';
        for (const gh of S.ghosts) if (gh.state === 'active') gh.rev = true;
      }
    }
    heroMove(S);
    eatAt(g, S);
    if (S.clear) return;
    for (const gh of S.ghosts) ghostMove(g, S, gh);
    collide(g, S);
  }
})();
