// ============================================================
//  הגנת המגדלים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  8 מפות עם דרכים. 4 מגדלים (חצים, תותח, קרח, ברקים) עם 3 שדרוגים ומכירה.
//  6 סוגי מפלצות (חיפושיות בנחיל, רצים, שריונים, עטלפים, מרפאים, ענק), גלים,
//  בונוס זהב על גל מוקדם, מהירות ×2, וכוכבים לפי החיים שנשארו.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600, T = 48, COLS = 20, ROWS = 10, MH = ROWS * T, DT = 1 / 60;
  const FONT = 'Heebo, Arial, sans-serif';
  const LIVES = 20, WAVE_GAP = 18;
  const KINDS = ['arrow', 'cannon', 'frost', 'bolt'];
  const TNAME = { arrow: 'tArrow', cannon: 'tCannon', frost: 'tFrost', bolt: 'tBolt' };
  const TDESC = { arrow: 'dArrow', cannon: 'dCannon', frost: 'dFrost', bolt: 'dBolt' };
  // מגדלים: מחיר, 3 שדרוגים, ונתונים לכל רמה (0 = בסיס, 3 = שדרוג אחרון)
  const TW = {
    arrow: { cost: 50, up: [55, 85, 130], dmg: [9, 14, 21, 30], rate: [1.5, 1.7, 1.9, 2.3], range: [112, 122, 134, 150], air: true },
    cannon: { cost: 80, up: [75, 115, 170], dmg: [22, 34, 50, 74], rate: [0.55, 0.6, 0.66, 0.75], range: [100, 106, 116, 128], splash: [42, 46, 52, 60], air: false },
    frost: { cost: 65, up: [60, 95, 140], dmg: [3, 5, 8, 12], rate: [1, 1, 1.1, 1.2], range: [82, 90, 100, 112], slow: [0.35, 0.42, 0.5, 0.58], air: true },
    bolt: { cost: 120, up: [100, 150, 220], dmg: [16, 24, 34, 48], rate: [0.75, 0.85, 0.95, 1.1], range: [108, 118, 130, 144], chain: [3, 4, 5, 6], air: true },
  };
  // מפלצות: חיים, מהירות (יחידות בשנייה), זהב, כמה חיים הן לוקחות, רדיוס, שריון
  const EN = {
    swarm: { hp: 16, sp: 58, gold: 3, dmg: 1, r: 9 },
    fast: { hp: 34, sp: 96, gold: 6, dmg: 1, r: 11 },
    armor: { hp: 120, sp: 40, gold: 14, dmg: 2, r: 15, arm: 0.6 },
    fly: { hp: 48, sp: 62, gold: 9, dmg: 1, r: 13, fly: true },
    heal: { hp: 80, sp: 46, gold: 12, dmg: 1, r: 13 },
    boss: { hp: 900, sp: 26, gold: 120, dmg: 10, r: 24, arm: 0.3 },
  };
  const ETYPES = ['swarm', 'fast', 'armor', 'fly', 'heal', 'boss'];
  const ENAME = { swarm: 'nSwarm', fast: 'nFast', armor: 'nArmor', fly: 'nFly', heal: 'nHeal', boss: 'nBoss' };
  const ETIP = { swarm: 'tipSwarm', fast: 'tipFast', armor: 'tipArmor', fly: 'tipFly', heal: 'tipHeal', boss: 'tipBoss' };
  const ECOL = { swarm: ['#ffd23f', '#e09f00', '#3a2a10'], fast: ['#ff8a4c', '#d9480f', '#fff'], armor: ['#cfd6de', '#6b7785', '#ffd43b'], fly: ['#a55eea', '#5b2c6f', '#fff'], heal: ['#69db7c', '#2f9e44', '#e6fcf5'], boss: ['#e8590c', '#7b1d14', '#ffd43b'] };

  const THEMES = [
    { g1: '#7cc95a', g2: '#6dbb4c', road: '#e2c48a', edge: '#a8834e', deco: 'meadow', dot: '#5aa53f' },
    { g1: '#4f9a42', g2: '#468c3a', road: '#cfa76b', edge: '#7d5d35', deco: 'forest', dot: '#3c7a31' },
    { g1: '#ecd08f', g2: '#e3c47f', road: '#b9894f', edge: '#8a6234', deco: 'desert', dot: '#d4b06a' },
    { g1: '#eef5fb', g2: '#e1ecf5', road: '#a9bfd2', edge: '#7a93a8', deco: 'snow', dot: '#c9dceb' },
    { g1: '#d08458', g2: '#c4774d', road: '#ecc28f', edge: '#a0663f', deco: 'canyon', dot: '#b2643c' },
    { g1: '#4b3f45', g2: '#43383e', road: '#8b7466', edge: '#2e2529', deco: 'volcano', dot: '#ff7b29' },
    { g1: '#6d8c4c', g2: '#627f44', road: '#a8925f', edge: '#5f5133', deco: 'swamp', dot: '#4f6b37' },
    { g1: '#83b85f', g2: '#77ab55', road: '#cfc6b4', edge: '#8e8576', deco: 'castle', dot: '#ff8fab' },
  ];
  // מפות: נקודות הדרך במשבצות (הראשונה מחוץ ללוח, האחרונה היא הטירה), מספר גלים, זהב התחלתי, כוח המפלצות
  const MAPS = [
    { th: 0, waves: 10, gold: 220, hp: 0.5, paths: [[[-1, 2], [4, 2], [4, 7], [9, 7], [9, 2], [14, 2], [14, 7], [19, 7]]] },
    { th: 1, waves: 12, gold: 220, hp: 0.75, paths: [[[-1, 8], [3, 8], [3, 3], [7, 3], [7, 6], [11, 6], [11, 1], [16, 1], [16, 5], [19, 5]]] },
    { th: 2, waves: 14, gold: 230, hp: 0.85, paths: [[[-1, 1], [5, 1], [5, 4], [10, 4], [10, 8], [15, 8], [15, 3], [19, 3]]] },
    { th: 3, waves: 15, gold: 240, hp: 0.95, paths: [[[-1, 1], [17, 1], [17, 8], [2, 8], [2, 4], [13, 4], [13, 6]]] },
    { th: 4, waves: 16, gold: 260, hp: 1.0, paths: [[[-1, 1], [6, 1], [6, 5], [11, 5], [11, 2], [15, 2], [15, 7], [19, 7]], [[-1, 8], [6, 8], [6, 5], [11, 5], [11, 2], [15, 2], [15, 7], [19, 7]]] },
    { th: 5, waves: 18, gold: 280, hp: 1.1, paths: [[[-1, 5], [6, 5], [6, 2], [12, 2], [12, 7], [19, 7]]] },
    { th: 6, waves: 18, gold: 300, hp: 1.15, paths: [[[-1, 1], [8, 1], [8, 3], [16, 3], [16, 5], [19, 5]], [[-1, 8], [11, 8], [11, 5], [16, 5], [19, 5]]] },
    { th: 7, waves: 20, gold: 320, hp: 1.25, paths: [[[-1, 2], [5, 2], [5, 6], [10, 6], [10, 3], [14, 3], [14, 7], [19, 7]], [[12, -1], [12, 1], [17, 1], [17, 7], [19, 7]]] },
  ];

  // ----- סרגל המגדלים למטה -----
  const BY = MH + 8, BH = H - MH - 16;
  const CARDS = KINDS.map((k, i) => ({ x: 8 + i * 98, y: BY, w: 92, h: BH }));
  const INFO = { x: 402, y: BY, w: 352, h: BH };
  const NEXT = { x: 762, y: BY, w: 122, h: BH };
  const SPD = { x: 890, y: BY, w: 62, h: BH };
  const UPB = { x: INFO.x + 8, y: INFO.y + 44, w: 182, h: 52 };
  const SELLB = { x: INFO.x + 196, y: INFO.y + 44, w: 148, h: 52 };
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  // ---------- מפה ----------
  function posAt(P, d) {
    d = d < 0 ? 0 : d > P.len ? P.len : d;
    let i = 1;
    while (i < P.cum.length - 1 && P.cum[i] < d) i++;
    const a = P.pts[i - 1], b = P.pts[i], L = (P.cum[i] - P.cum[i - 1]) || 1, f = (d - P.cum[i - 1]) / L;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function buildMap(mi) {
    const M = MAPS[mi];
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    const mark = (c, r) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) grid[r][c] = 1; };
    const paths = M.paths.map(wp => {
      for (let i = 1; i < wp.length; i++) {
        let [c, r] = wp[i - 1];
        const [c1, r1] = wp[i], dc = Math.sign(c1 - c), dr = Math.sign(r1 - r);
        for (;;) { mark(c, r); if (c === c1 && r === r1) break; c += dc; r += dr; }
      }
      const pts = wp.map(([c, r]) => [c * T + T / 2, r * T + T / 2]);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, len: cum[cum.length - 1], wp };
    });
    const end = M.paths[0][M.paths[0].length - 1];
    const castle = { x: Math.min(end[0] * T + T / 2, W - 40), y: end[1] * T + T - 4 };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cx = c * T + T / 2, cy = r * T + T / 2;
      if (grid[r][c] === 0 && Math.abs(cx - castle.x) < 46 && cy < castle.y + 4 && cy > castle.y - 84) grid[r][c] = 3;
    }
    const rnd = GK.U.seeded(1000 + mi * 77), deco = [];
    const near = (c, r, d) => {
      for (let y = r - d; y <= r + d; y++) for (let x = c - d; x <= c + d; x++) if (y >= 0 && y < ROWS && x >= 0 && x < COLS && grid[y][x] === 1) return true;
      return false;
    };
    for (let i = 0; i < 500 && deco.length < 13; i++) {
      const c = Math.floor(rnd() * COLS), r = Math.floor(rnd() * ROWS);
      if (grid[r][c] !== 0 || near(c, r, 1)) continue;
      grid[r][c] = 2;
      deco.push({ c, r, v: Math.floor(rnd() * 3), s: 0.85 + rnd() * 0.3, ox: (rnd() - 0.5) * 10, oy: (rnd() - 0.5) * 8 });
    }
    deco.sort((a, b) => a.r - b.r);
    const samples = [];
    for (const P of paths) for (let d = 0; d < P.len; d += 12) { const q = posAt(P, d); if (q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= MH) samples.push(q); }
    return { mi, grid, paths, castle, deco, samples };
  }

  // ---------- גלים ----------
  function makeWaves(mi) {
    const N = MAPS[mi].waves, out = [];
    const fly = mi >= 1 ? 'fly' : 'fast', heal = mi >= 2 ? 'heal' : 'armor';
    for (let w = 1; w <= N; w++) {
      const c = k => Math.max(1, Math.round(k * (1 + (w - 1) * 0.1)));
      const gr = [];
      switch ((w - 1) % 6) {
        case 0: gr.push(['swarm', c(7), 0.45]); if (w > 1) gr.push(['armor', c(1), 1.6]); break;
        case 1: gr.push(['fast', c(5), 0.8]); break;
        case 2: gr.push(['swarm', c(6), 0.4], ['fast', c(3), 0.7]); break;
        case 3: gr.push(['armor', c(2), 1.7], ['swarm', c(5), 0.4]); break;
        case 4: gr.push([fly, c(4), 1.0]); if (w > 6) gr.push(['swarm', c(6), 0.35]); break;
        case 5: gr.push(['fast', c(4), 0.6], [heal, 1 + Math.floor(w / 8), 1.4], ['armor', c(2), 1.5]); break;
      }
      if (w === N) gr.push(['boss', mi >= 7 ? 2 : 1, 6]);
      else if (mi >= 3 && w === Math.ceil(N / 2)) gr.push(['boss', 1, 3]);
      out.push(gr);
    }
    return out;
  }
  const hpMul = (mi, w) => MAPS[mi].hp * (1 + 0.1 * (w - 1) + 0.004 * (w - 1) * (w - 1));

  // ---------- מצב ----------
  function newState(g) {
    const mi = Math.max(0, Math.min(MAPS.length - 1, (g.level || 1) - 1));
    return {
      mi, map: buildMap(mi), N: MAPS[mi].waves, waves: makeWaves(mi),
      gold: MAPS[mi].gold, lives: LIVES, wave: 0, cd: 0, cdOn: false, queue: [], t: 0, anim: 0,
      en: [], towers: [], shots: [], fx: [], kills: 0,
      sel: null, pick: null, pend: null, speed: 1,
      seen: {}, banner: null, tut: mi === 0 ? 1 : 0, upgraded: false,
      over: null, endT: 0, ended: false, snd: {}, botT: 0, botPlan: 0, demo: !!g.demo, demoT: 0,
    };
  }
  const towerAt = (S, c, r) => S.towers.find(t => t.c === c && t.r === r) || null;
  const canBuild = (S, c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && S.map.grid[r][c] === 0 && !towerAt(S, c, r);
  const sellValue = tw => Math.floor(tw.spent * 0.7);
  const canCall = S => !S.over && !S.demo && S.wave < S.N && (S.wave === 0 || (S.cdOn && !S.queue.length));
  const bonusNow = S => (S.wave > 0 && S.cdOn ? Math.round(Math.max(0, S.cd) * 1.5) : 0);
  function snd(g, key, gap, fn) { const S = g.s; if (S.demo || S.t - (S.snd[key] == null ? -9 : S.snd[key]) < gap) return; S.snd[key] = S.t; fn(); }

  function addTower(S, k, c, r, lv) {
    const tw = { k, c, r, x: c * T + T / 2, y: r * T + T / 2, lv: lv || 0, spent: TW[k].cost, cd: 0.4, ang: -Math.PI / 4, recoil: 0, pop: 0.35, cov: 0 };
    for (let i = 0; i < tw.lv; i++) tw.spent += TW[k].up[i];
    tw.cov = coverage(S, c, r, TW[k].range[0]);
    S.towers.push(tw);
    S.towers.sort((a, b) => a.r - b.r);
    return tw;
  }

  // ---------- פעולות (גם העכבר וגם הבוט עוברים כאן) ----------
  const act = {
    select(g, k) { const S = g.s; S.sel = k; S.pick = null; S.pend = null; if (k) g.sfx('click'); },
    build(g, c, r) {
      const S = g.s, k = S.sel;
      if (!k) return false;
      if (!canBuild(S, c, r)) { g.sfx('error'); g.msg(g.t('cantBuild'), 900, '#ff8787'); return false; }
      const cost = TW[k].cost;
      if (S.gold < cost) { g.sfx('error'); g.msg(g.t('noGold'), 900, '#ffd166'); return false; }
      S.gold -= cost;
      const tw = addTower(S, k, c, r, 0);
      S.pend = null;
      g.burst(tw.x, tw.y + 10, { n: 14, color: ['#d9c39a', '#a8875a', '#fff'], speed: 2.2, life: 26, gravity: 0.05 });
      g.sfx('place');
      if (S.gold < cost) S.sel = null;
      return true;
    },
    pick(g, tw) { const S = g.s; S.pick = tw; S.sel = null; S.pend = null; if (tw) g.sfx('click', { p: 1.2 }); },
    upgrade(g) {
      const S = g.s, tw = S.pick;
      if (!tw || tw.lv >= 3) return false;
      const cost = TW[tw.k].up[tw.lv];
      if (S.gold < cost) { g.sfx('error'); g.msg(g.t('noGold'), 900, '#ffd166'); return false; }
      S.gold -= cost; tw.spent += cost; tw.lv++; tw.pop = 0.4; S.upgraded = true;
      g.burst(tw.x, tw.y - 14, { n: 22, color: ['#ffe066', '#fff', '#ffd43b'], speed: 3, life: 34, gravity: -0.02 });
      g.sfx('power');
      return true;
    },
    sell(g) {
      const S = g.s, tw = S.pick;
      if (!tw) return false;
      const v = sellValue(tw);
      S.gold += v;
      S.towers.splice(S.towers.indexOf(tw), 1);
      S.pick = null;
      g.float(tw.x, tw.y - 30, '+' + v, { color: '#ffe066', size: 22 });
      g.burst(tw.x, tw.y, { n: 16, color: ['#a8875a', '#888', '#ffe066'], speed: 2.5, life: 28 });
      g.sfx('coin');
      return true;
    },
    next(g) {
      const S = g.s;
      if (!canCall(S)) return false;
      const b = bonusNow(S);
      if (b > 0) { S.gold += b; g.float(NEXT.x + NEXT.w / 2, NEXT.y - 6, '+' + b, { color: '#ffe066', size: 24 }); g.sfx('coin'); }
      startWave(g);
      return true;
    },
    speed(g) { const S = g.s; S.speed = S.speed === 1 ? 2 : 1; g.sfx('click', { p: S.speed === 2 ? 1.3 : 0.9 }); },
  };

  function startWave(g) {
    const S = g.s;
    S.wave++;
    S.cdOn = false; S.cd = 0;
    if (!S.demo && S.wave > 1) S.gold += 10 + 2 * S.wave;
    const groups = S.waves[S.wave - 1], hm = hpMul(S.mi, S.wave), np = S.map.paths.length;
    let at = S.t + 0.4, k = 0;
    for (const [type, n, gap] of groups) {
      const bm = MAPS[S.mi].hp * (1 + 0.07 * (S.wave - 1)) * (S.wave < S.N ? 0.7 : 1) * (S.mi === 0 ? 0.6 : 1);
      for (let i = 0; i < n; i++) { S.queue.push({ at, type, p: (k++) % np, hm: type === 'boss' ? bm : hm }); at += gap; }
      at += 1.2;
    }
    S.queue.sort((a, b) => a.at - b.at);
    if (!S.demo) {
      g.msg(S.wave === S.N ? g.t('lastWave') : g.t('waveMsg', { n: S.wave }), 1100, '#ffd166');
      g.sfx('start');
      if (S.tut === 3) S.tut = 4;
    }
  }
  function spawn(g, q) {
    const S = g.s, b = EN[q.type], P = S.map.paths[q.p];
    const hp = Math.round(b.hp * q.hm);
    const small = q.type === 'swarm';
    const e = {
      type: q.type, hp, max: hp, hm: q.hm, sp: b.sp * (0.94 + Math.random() * 0.12), d: 0, p: q.p,
      ox: (Math.random() - 0.5) * (small ? 18 : 12), oy: (Math.random() - 0.5) * (small ? 14 : 10),
      x: P.pts[0][0], y: P.pts[0][1], px: P.pts[0][0], py: P.pts[0][1], dir: 1,
      slow: 0, slowT: 0, hitT: 0, healT: 1.2, arm: b.arm || 0, fly: !!b.fly, r: b.r, gold: b.gold, dmg: b.dmg,
      ph: Math.random() * 6.28, dead: false,
    };
    S.en.push(e);
    if (!S.demo && !S.seen[q.type]) {
      S.seen[q.type] = 1;
      S.banner = { type: q.type, t: 5 };
      if (q.type === 'boss') { g.msg(g.t('bossMsg'), 1500, '#ff8787'); g.tone({ f: 70, f2: 50, dur: 0.7, type: 'sawtooth', vol: 0.12 }); }
    }
  }

  // ---------- סימולציה (צעד אחד = 1/60 שנייה של זמן משחק) ----------
  function findTarget(S, x, y, R, air) {
    let best = null, bp = -1;
    for (const e of S.en) {
      if (e.dead || (e.fly && !air)) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy > (R + e.r * 0.5) * (R + e.r * 0.5)) continue;
      const pr = e.d / S.map.paths[e.p].len;
      if (pr > bp) { bp = pr; best = e; }
    }
    return best;
  }
  function hurt(g, e, dmg, kind) {
    if (e.dead) return;
    if (e.arm) dmg *= kind === 'arrow' ? 1 - e.arm : kind === 'cannon' ? 1 - e.arm * 0.5 : 1;
    e.hp -= dmg; e.hitT = 0.1;
    if (e.hp <= 0) kill(g, e);
  }
  function kill(g, e) {
    const S = g.s;
    e.dead = true;
    const col = ECOL[e.type];
    g.burst(e.x, e.y - (e.fly ? 14 : 0), { n: e.type === 'boss' ? 46 : e.type === 'swarm' ? 7 : 12, color: [col[0], col[1], '#fff'], speed: e.type === 'boss' ? 5 : 2.6, life: e.type === 'boss' ? 50 : 28 });
    if (S.demo) return;
    S.gold += e.gold; S.kills++;
    g.float(e.x, e.y - e.r - (e.fly ? 22 : 8), '+' + e.gold, { color: '#ffe066', size: e.type === 'boss' ? 30 : 17, life: 40 });
    snd(g, 'pop', 0.05, () => g.sfx('pop', { p: 0.75 + Math.random() * 0.5 }));
    if (e.type === 'boss') { g.shake(10); g.sfx('boom'); }
  }
  function leak(g, e) {
    const S = g.s;
    e.dead = true;
    if (S.demo) return;
    S.lives = Math.max(0, S.lives - e.dmg);
    g.shake(e.type === 'boss' ? 16 : 6);
    g.flash('#ff3030', e.type === 'boss' ? 0.3 : 0.16);
    g.sfx('hit');
    g.float(S.map.castle.x, S.map.castle.y - 92, '-' + e.dmg, { color: '#ff6b6b', size: 26 });
    if (S.lives <= 0 && !S.over) { S.over = 'lose'; S.endT = 1.3; }
  }
  function explode(g, s) {
    const S = g.s;
    for (const e of S.en) if (!e.dead && !e.fly && (e.x - s.x1) * (e.x - s.x1) + (e.y - s.y1) * (e.y - s.y1) <= (s.sp + e.r * 0.6) * (s.sp + e.r * 0.6)) hurt(g, e, s.dmg, 'cannon');
    S.fx.push({ k: 'boom', x: s.x1, y: s.y1, r: s.sp, t: 0, dur: 0.35 });
    g.burst(s.x1, s.y1, { n: 9, color: ['#ffb347', '#ff6b35', '#7a6a5a'], speed: 2.4, life: 22, size: 4, gravity: 0.05 });
    snd(g, 'boom', 0.09, () => { g.noise({ f: 900, f2: 90, dur: 0.26, vol: 0.13 }); g.tone({ f: 120, f2: 45, dur: 0.22, vol: 0.14 }); });
  }

  function sim(g) {
    const S = g.s;
    S.t += DT;
    while (S.queue.length && S.queue[0].at <= S.t) spawn(g, S.queue.shift());
    if (!S.demo && !S.over) {
      if (!S.queue.length && S.wave > 0 && S.wave < S.N && !S.cdOn) { S.cdOn = true; S.cd = WAVE_GAP; }
      if (S.cdOn && (S.cd -= DT) <= 0) startWave(g);
    }
    // מפלצות
    for (const e of S.en) {
      if (e.dead) continue;
      if (e.slowT > 0 && (e.slowT -= DT) <= 0) e.slow = 0;
      e.d += e.sp * (1 - e.slow) * DT;
      const P = S.map.paths[e.p];
      if (e.d >= P.len) { leak(g, e); continue; }
      const q = posAt(P, e.d), nx = q[0] + e.ox, ny = q[1] + e.oy;
      if (Math.abs(nx - e.x) > 0.05) e.dir = nx > e.x ? 1 : -1;
      e.x = nx; e.y = ny;
      if (e.hitT > 0) e.hitT -= DT;
      if (e.type === 'heal' && (e.healT -= DT) <= 0) {
        e.healT = 1.6;
        for (const o of S.en) {
          if (o.dead || o === e || o.hp >= o.max) continue;
          if ((o.x - e.x) * (o.x - e.x) + (o.y - e.y) * (o.y - e.y) < 85 * 85) o.hp = Math.min(o.max, o.hp + Math.min(o.max * 0.1, 25 * e.hm));
        }
        S.fx.push({ k: 'heal', x: e.x, y: e.y, t: 0, dur: 0.6 });
      }
    }
    // מגדלים
    for (const tw of S.towers) {
      if (tw.recoil > 0) tw.recoil -= DT;
      if (tw.pop > 0) tw.pop -= DT;
      if ((tw.cd -= DT) > 0) continue;
      const d = TW[tw.k], lv = tw.lv, R = d.range[lv];
      if (tw.k === 'frost') {
        let any = false;
        for (const e of S.en) {
          if (e.dead) continue;
          const dx = e.x - tw.x, dy = e.y - tw.y;
          if (dx * dx + dy * dy > R * R) continue;
          any = true;
          e.slow = Math.max(e.slow, d.slow[lv]); e.slowT = 1.7;
          hurt(g, e, d.dmg[lv], 'magic');
        }
        if (any) {
          tw.cd = 1 / d.rate[lv];
          S.fx.push({ k: 'ring', x: tw.x, y: tw.y, r: R, t: 0, dur: 0.55 });
          snd(g, 'frost', 0.15, () => g.tone({ f: 1500, f2: 2300, dur: 0.14, vol: 0.04 }));
        } else tw.cd = 0.1;
        continue;
      }
      const tg = findTarget(S, tw.x, tw.y, R, d.air);
      if (!tg) { tw.cd = 0.08; continue; }
      tw.cd = 1 / d.rate[lv];
      tw.ang = Math.atan2(tg.y - tw.y, tg.x - tw.x);
      if (tw.k === 'arrow') {
        S.shots.push({ k: 'arrow', x: tw.x, y: tw.y - 34 - lv * 4, tg, tx: tg.x, ty: tg.y, dmg: d.dmg[lv], a: tw.ang });
        snd(g, 'arrow', 0.07, () => g.tone({ f: 980 + Math.random() * 240, f2: 420, dur: 0.05, type: 'triangle', vol: 0.035 }));
      } else if (tw.k === 'cannon') {
        const dur = 0.5, P = S.map.paths[tg.p], q = posAt(P, tg.d + tg.sp * (1 - tg.slow) * dur);
        S.shots.push({ k: 'ball', x0: tw.x + Math.cos(tw.ang) * 20, y0: tw.y - 8 + Math.sin(tw.ang) * 16, x1: q[0] + tg.ox, y1: q[1] + tg.oy, t: 0, dur, dmg: d.dmg[lv], sp: d.splash[lv] });
        tw.recoil = 0.16;
        snd(g, 'cannon', 0.1, () => g.tone({ f: 200, f2: 70, dur: 0.12, type: 'square', vol: 0.05 }));
      } else {
        const hits = [tg];
        let last = tg;
        for (let i = 1; i < d.chain[lv]; i++) {
          let best = null, bd = 95 * 95;
          for (const e of S.en) {
            if (e.dead || hits.includes(e)) continue;
            const dd = (e.x - last.x) * (e.x - last.x) + (e.y - last.y) * (e.y - last.y);
            if (dd < bd) { bd = dd; best = e; }
          }
          if (!best) break;
          hits.push(best); last = best;
        }
        const pts = [[tw.x, tw.y - 44 - lv * 3]];
        hits.forEach((e, i) => { pts.push([e.x, e.y - (e.fly ? 16 : 4)]); hurt(g, e, d.dmg[lv] * Math.pow(0.85, i), 'magic'); });
        S.fx.push({ k: 'bolt', pts, t: 0, dur: 0.22 });
        snd(g, 'bolt', 0.1, () => g.sfx('laser', { p: 0.8 + Math.random() * 0.4 }));
      }
    }
    // יריות
    for (const s of S.shots) {
      if (s.k === 'arrow') {
        if (s.tg && !s.tg.dead) { s.tx = s.tg.x; s.ty = s.tg.y - (s.tg.fly ? 16 : 4); }
        const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy), st = 580 * DT;
        s.a = Math.atan2(dy, dx);
        if (L <= st) { s.dead = true; if (s.tg && !s.tg.dead) hurt(g, s.tg, s.dmg, 'arrow'); }
        else { s.x += dx / L * st; s.y += dy / L * st; }
      } else if ((s.t += DT) >= s.dur) { s.dead = true; explode(g, s); }
    }
    for (const f of S.fx) f.t += DT;
    compact(S.en); compact(S.shots); compactFx(S.fx);
    if (!S.demo && !S.over && S.wave >= S.N && !S.queue.length && !S.en.length) { S.over = 'win'; S.endT = 1.4; g.sfx('score'); }
  }
  function compact(a) { let j = 0; for (let i = 0; i < a.length; i++) if (!a[i].dead) a[j++] = a[i]; a.length = j; }
  function compactFx(a) { let j = 0; for (let i = 0; i < a.length; i++) if (a[i].t < a[i].dur) a[j++] = a[i]; a.length = j; }

  function finish(g) {
    const S = g.s;
    if (S.over === 'win') {
      const stars = S.lives >= 18 ? 3 : S.lives >= 10 ? 2 : 1;
      g.completeLevel(stars, { text: g.t('livesLeft', { n: S.lives }) });
    } else g.end({ result: 'lose', score: null, text: g.t('reached', { n: S.wave, m: S.N }) });
  }

  // ---------- בוט לבדיקות: בונה במקומות שמכסים הכי הרבה דרך, משדרג, ומזמן גלים כשהשדה ריק ----------
  function coverage(S, c, r, R) {
    const key = c + ',' + r + ',' + R, cc = S.map.cov || (S.map.cov = {});
    if (cc[key] != null) return cc[key];
    const x = c * T + T / 2, y = r * T + T / 2;
    let n = 0;
    for (const q of S.map.samples) if ((q[0] - x) * (q[0] - x) + (q[1] - y) * (q[1] - y) <= R * R) n++;
    return (cc[key] = n);
  }
  function bestSpot(S, k) {
    const R = Math.round(TW[k].range[0] * 0.92);
    let best = null, bv = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!canBuild(S, c, r)) continue;
      const v = coverage(S, c, r, R);
      if (v > bv) { bv = v; best = [c, r]; }
    }
    return best;
  }
  const PLAN = ['arrow', 'arrow', 'cannon', 'frost', 'bolt', 'arrow', 'cannon', 'bolt', 'arrow', 'frost', 'bolt', 'cannon', 'arrow', 'bolt'];
  // כמה נזק בשנייה מגדל עושה (בערך) — כדי להשוות בין בנייה לשדרוג
  function dpsOf(k, lv) {
    const d = TW[k];
    let v = d.dmg[lv] * d.rate[lv];
    if (k === 'bolt') v *= 1 + (d.chain[lv] - 1) * 0.5;
    if (k === 'cannon') v *= 1.8;
    if (k === 'frost') v = v * 2 + d.slow[lv] * 30;
    return v;
  }
  function botStep(g) {
    const S = g.s;
    if (S.over || S.demo) return;
    if ((S.botT -= DT) > 0) return;
    S.botT = 0.25;
    const plan = S.botOnly ? [S.botOnly] : PLAN;
    const k = plan[S.botPlan % plan.length];
    const sp = bestSpot(S, k);
    const buildV = sp ? dpsOf(k, 0) * coverage(S, sp[0], sp[1], Math.round(TW[k].range[0] * 0.92)) / TW[k].cost * (S.towers.length < 5 ? 3 : 1) : -1;
    let up = null, upV = -1;
    if (!S.botNoUp) for (const t of S.towers) if (t.lv < 3) { const v = (dpsOf(t.k, t.lv + 1) - dpsOf(t.k, t.lv)) * t.cov / TW[t.k].up[t.lv]; if (v > upV) { upV = v; up = t; } }
    if (buildV >= upV && sp && !(S.botMax && S.towers.length >= S.botMax)) {
      if (S.gold >= TW[k].cost) { act.select(g, k); if (act.build(g, sp[0], sp[1])) S.botPlan++; S.sel = null; }
    } else if (up && S.gold >= TW[up.k].up[up.lv]) { act.pick(g, up); act.upgrade(g); S.pick = null; }
    if (!sp) S.botPlan++;
    if (S.wave === 0 && S.towers.length >= 3) act.next(g);
    else if (S.botEarly !== false && canCall(S) && !S.en.length) act.next(g);
  }

  // ---------- ציור: עזרים ----------
  function fitSize(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const w = ctx.measureText(s).width;
    return w <= maxW ? size : Math.max(9, Math.floor(size * maxW / w));
  }
  function wrap(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const words = String(s).split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width <= maxW || !cur) cur = tryS;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function coin(ctx, x, y, r) {
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.55, '#ffc61a'); gr.addColorStop(1, '#b8860b');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(130,85,0,.85)'; ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  // שורה של חלקים (טקסט או אייקון) ממורכזת. בעברית ובערבית הסדר מתהפך
  function row(g, ctx, parts, cx, cy, maxW, size, rtl) {
    let s = size, total = 0;
    const measure = () => {
      total = 0;
      ctx.font = '800 ' + s + 'px ' + FONT;
      for (const p of parts) total += (p.icon ? p.w * s / size : ctx.measureText(String(p.text)).width) + (p.gap != null ? p.gap : 6);
      total -= 6;
    };
    measure();
    if (total > maxW) { s = Math.max(9, Math.floor(s * maxW / total)); measure(); }
    let x = cx - total / 2;
    const list = rtl ? parts.slice().reverse() : parts;
    for (const p of list) {
      if (p.icon) { const w = p.w * s / size; p.icon(x + w / 2, cy, s / size); x += w; }
      else { ctx.font = '800 ' + s + 'px ' + FONT; const w = ctx.measureText(String(p.text)).width; g.text(ctx, p.text, x + w / 2, cy, { size: s, color: p.color || '#fff', weight: 800 }); x += w; }
      x += p.gap != null ? p.gap : 6;
    }
  }

  // ---------- ציור: המפה (נשמרת פעם אחת בתמונה) ----------
  function paintMap(ctx, U, map) {
    const TH = THEMES[MAPS[map.mi].th], rnd = U.seeded(77 + map.mi * 131);
    const gr = ctx.createLinearGradient(0, 0, 0, MH);
    gr.addColorStop(0, U.shade(TH.g1, 0.07)); gr.addColorStop(1, U.shade(TH.g1, -0.08));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, MH);
    ctx.fillStyle = TH.g2; ctx.globalAlpha = 0.5;
    for (let r = 0; r < ROWS; r++) for (let c = r % 2; c < COLS; c += 2) ctx.fillRect(c * T, r * T, T, T);
    ctx.globalAlpha = 1;
    // פרטים קטנים על הקרקע
    for (let i = 0; i < 340; i++) {
      const x = rnd() * W, y = rnd() * MH, v = rnd();
      ctx.save();
      if (TH.deco === 'meadow' || TH.deco === 'forest' || TH.deco === 'castle' || TH.deco === 'swamp') {
        ctx.strokeStyle = U.shade(TH.g1, -0.25); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x - 1, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x + 1, y - 4); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 4, y - 2); ctx.stroke();
        if (v < 0.12 && TH.deco !== 'swamp') { ctx.fillStyle = v < 0.04 ? '#fff' : v < 0.08 ? '#ffd43b' : TH.dot; ctx.beginPath(); ctx.arc(x + 6, y - 2, 2.6, 0, 6.3); ctx.fill(); }
      } else if (TH.deco === 'volcano') {
        if (v < 0.25) { ctx.strokeStyle = 'rgba(255,120,40,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 13, y - 2); ctx.stroke(); }
        else { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + v * 2, 0, 6.3); ctx.fill(); }
      } else {
        ctx.fillStyle = v < 0.5 ? U.shade(TH.g1, -0.12) : U.shade(TH.g1, 0.25);
        ctx.beginPath(); ctx.arc(x, y, 1.2 + v * 1.8, 0, 6.3); ctx.fill();
      }
      ctx.restore();
    }
    if (TH.deco === 'swamp') for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = rnd() * MH;
      ctx.fillStyle = 'rgba(40,70,60,.45)'; ctx.beginPath(); ctx.ellipse(x, y, 22 + rnd() * 18, 9 + rnd() * 6, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x - 6, y - 2, 8, 2, 0, 0, 6.3); ctx.fill();
    }
    // הדרך: קודם כל השוליים, אחר כך הדרך, ואז אבנים קטנות
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (P, w, col, oy) => { ctx.beginPath(); ctx.moveTo(P.pts[0][0], P.pts[0][1] + oy); for (let i = 1; i < P.pts.length; i++) ctx.lineTo(P.pts[i][0], P.pts[i][1] + oy); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
    for (const P of map.paths) stroke(P, T * 0.98, 'rgba(0,0,0,.2)', 4);
    for (const P of map.paths) stroke(P, T * 0.92, TH.edge, 0);
    for (const P of map.paths) stroke(P, T * 0.76, TH.road, 0);
    for (const P of map.paths) stroke(P, T * 0.3, U.shade(TH.road, 0.1), 0);
    for (const P of map.paths) for (let d = 0; d < P.len; d += 9) {
      const q = posAt(P, d);
      if (rnd() < 0.45) continue;
      ctx.fillStyle = rnd() < 0.5 ? U.shade(TH.road, -0.16) : U.shade(TH.road, 0.2);
      ctx.beginPath(); ctx.ellipse(q[0] + (rnd() - 0.5) * T * 0.62, q[1] + (rnd() - 0.5) * T * 0.62, 2 + rnd() * 2.2, 1.5 + rnd() * 1.4, rnd() * 3, 0, 6.3); ctx.fill();
    }
    for (const dc of map.deco) drawDeco(ctx, U, TH.deco, dc.c * T + T / 2 + dc.ox, dc.r * T + T / 2 + dc.oy, dc.v, dc.s);
    for (const P of map.paths) drawCave(ctx, U, P);
    drawCastle(ctx, U, map.castle.x, map.castle.y);
  }
  function drawCave(ctx, U, P) {
    const [x, y] = P.pts[0], top = y < 0;
    ctx.save();
    ctx.translate(top ? x : 0, top ? 0 : y);
    if (top) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#6d6875'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 34, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#4a4453'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 27, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#1b1525'; ctx.beginPath(); ctx.ellipse(0, 2, 11, 21, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#8a8494';
    for (const [a, b, r] of [[6, -30, 6], [14, -20, 5], [17, 6, 5], [12, 22, 6], [4, 31, 5]]) { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  function drawCastle(ctx, U, cx, by) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, by - 1, 44, 9, 0, 0, 6.3); ctx.fill();
    const stone = '#c9c1b3', dark = '#958b7c';
    for (const sx of [-1, 1]) {
      const x = cx + sx * 26 - 11;
      ctx.fillStyle = stone; ctx.fillRect(x, by - 66, 22, 64);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + (sx > 0 ? 14 : 0), by - 66, 8, 64);
      ctx.fillStyle = dark;
      for (let i = 0; i < 3; i++) ctx.fillRect(x + i * 8, by - 72, 6, 7);
      ctx.fillStyle = '#3b6fd6'; ctx.beginPath(); ctx.moveTo(x - 3, by - 72); ctx.lineTo(x + 25, by - 72); ctx.lineTo(x + 11, by - 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(x - 3, by - 72); ctx.lineTo(x + 6, by - 72); ctx.lineTo(x + 11, by - 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2b38'; U.rr(ctx, x + 7, by - 52, 8, 12, 4); ctx.fill();
    }
    ctx.fillStyle = stone; ctx.fillRect(cx - 18, by - 50, 36, 48);
    ctx.fillStyle = dark;
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 18 + i * 10, by - 56, 7, 7);
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1;
    for (let yy = by - 42; yy < by; yy += 9) { ctx.beginPath(); ctx.moveTo(cx - 18, yy); ctx.lineTo(cx + 18, yy); ctx.stroke(); }
    ctx.fillStyle = '#5c3a1e'; ctx.beginPath(); ctx.moveTo(cx - 11, by - 2); ctx.lineTo(cx - 11, by - 22); ctx.arc(cx, by - 22, 11, Math.PI, 0); ctx.lineTo(cx + 11, by - 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i += 6) { ctx.beginPath(); ctx.moveTo(cx + i, by - 2); ctx.lineTo(cx + i, by - 28); ctx.stroke(); }
    ctx.restore();
  }
  function drawDeco(ctx, U, kind, x, y, v, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 14, 18, 6, 0, 0, 6.3); ctx.fill();
    if (kind === 'meadow' || (kind === 'castle' && v === 0)) {
      ctx.fillStyle = '#7a4f2a'; ctx.fillRect(-3, 2, 6, 13);
      for (const [a, b, r, c] of [[-9, -2, 11, '#3f9b3a'], [9, -2, 11, '#3f9b3a'], [0, -11, 13, '#4caf50'], [-3, -14, 5, '#7bd36f']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); }
    } else if (kind === 'forest' || kind === 'snow') {
      ctx.fillStyle = '#6b4423'; ctx.fillRect(-3, 6, 6, 9);
      const cols = kind === 'snow' ? ['#2f6b4f', '#3c7f5e', '#4b9270'] : ['#24633a', '#2e7a47', '#3a8f55'];
      for (let i = 0; i < 3; i++) {
        const yy = 8 - i * 10, w = 17 - i * 4;
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(-w, yy); ctx.lineTo(w, yy); ctx.lineTo(0, yy - 16); ctx.closePath(); ctx.fill();
        if (kind === 'snow') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w * 0.45, yy - 9); ctx.lineTo(w * 0.45, yy - 9); ctx.lineTo(0, yy - 16); ctx.closePath(); ctx.fill(); }
      }
    } else if (kind === 'desert') {
      if (v === 0) { ctx.fillStyle = '#a39382'; ctx.beginPath(); ctx.ellipse(0, 6, 15, 10, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#c4b5a5'; ctx.beginPath(); ctx.ellipse(-4, 2, 7, 4, 0, 0, 6.3); ctx.fill(); }
      else {
        ctx.fillStyle = '#3f9b54'; U.rr(ctx, -5, -18, 10, 34, 5); ctx.fill();
        U.rr(ctx, -15, -8, 7, 14, 3.5); ctx.fill(); U.rr(ctx, -15, 2, 12, 6, 3); ctx.fill();
        U.rr(ctx, 8, -12, 7, 12, 3.5); ctx.fill(); U.rr(ctx, 3, -4, 12, 6, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-2, -15, 2, 28);
      }
    } else if (kind === 'canyon') {
      ctx.fillStyle = '#9c4f2e'; ctx.beginPath(); ctx.moveTo(-18, 14); ctx.lineTo(-13, -10); ctx.lineTo(12, -12); ctx.lineTo(18, 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,180,.35)'; ctx.lineWidth = 2;
      for (const yy of [-4, 4]) { ctx.beginPath(); ctx.moveTo(-15, yy); ctx.lineTo(15, yy); ctx.stroke(); }
      ctx.fillStyle = '#c0683f'; ctx.fillRect(-13, -14, 25, 5);
    } else if (kind === 'volcano') {
      if (v === 0) { ctx.fillStyle = '#ff6a00'; ctx.beginPath(); ctx.ellipse(0, 6, 17, 8, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.ellipse(-3, 5, 8, 3, 0, 0, 6.3); ctx.fill(); }
      else { ctx.fillStyle = '#26202a'; ctx.beginPath(); ctx.moveTo(-15, 13); ctx.lineTo(-9, -8); ctx.lineTo(4, -13); ctx.lineTo(15, 13); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(4, -13); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); }
    } else if (kind === 'swamp') {
      if (v === 0) { ctx.fillStyle = '#3d6b5a'; ctx.beginPath(); ctx.ellipse(0, 6, 18, 9, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#56c26b'; ctx.beginPath(); ctx.ellipse(6, 4, 6, 3, 0.3, 0, 6.3); ctx.fill(); }
      else {
        ctx.strokeStyle = '#5b4632'; ctx.lineCap = 'round'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -10); ctx.moveTo(0, -2); ctx.lineTo(-10, -12); ctx.moveTo(0, -6); ctx.lineTo(9, -16); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#3f8f3a'; U.rr(ctx, -16, -4, 32, 18, 9); ctx.fill();
      ctx.fillStyle = '#52a84a'; U.rr(ctx, -14, -6, 28, 10, 6); ctx.fill();
      for (const [a, b] of [[-8, -2], [0, 0], [8, -3]]) { ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.arc(a, b, 2.5, 0, 6.3); ctx.fill(); }
    }
    ctx.restore();
  }

  // ---------- ציור: מגדלים ----------
  function drawTower(ctx, U, k, lv, x, y, t, ang, recoil, s) {
    ctx.save(); ctx.translate(x, y);
    if (s && s !== 1) ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 15, 21, 7, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#8f887d'; U.rr(ctx, -18, 1, 36, 17, 6); ctx.fill();
    ctx.fillStyle = '#b6aea2'; U.rr(ctx, -18, -1, 36, 9, 5); ctx.fill();
    if (k === 'arrow') {
      const h = 26 + lv * 4, wood = lv >= 2 ? '#a7a097' : '#9a6332', wd = lv >= 2 ? '#7d766d' : '#6e4220';
      ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(13, 4); ctx.lineTo(10, -h); ctx.lineTo(-10, -h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = wd; ctx.lineWidth = 1.6;
      for (let yy = -h + 7; yy < 4; yy += 7) { ctx.beginPath(); ctx.moveTo(-12, yy); ctx.lineTo(12, yy); ctx.stroke(); }
      if (lv < 2) { ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(9, -h + 4); ctx.moveTo(11, 2); ctx.lineTo(-9, -h + 4); ctx.stroke(); }
      ctx.fillStyle = wd; U.rr(ctx, -15, -h - 6, 30, 8, 3); ctx.fill();
      // הקשת
      ctx.save(); ctx.translate(0, -h - 12);
      ctx.fillStyle = '#2f9e44'; U.rr(ctx, -5, -2, 10, 10, 3); ctx.fill();
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(0, -6, 5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(0, -8, 5.5, Math.PI, 0); ctx.fill();
      ctx.rotate(ang); ctx.strokeStyle = '#6e4220'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(4, 0, 8, -1.2, 1.2); ctx.stroke();
      ctx.restore();
      if (lv >= 1) { ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.moveTo(-10, -h + 4); ctx.lineTo(-10, -h + 18); ctx.lineTo(-4, -h + 13); ctx.lineTo(-4, -h + 4); ctx.closePath(); ctx.fill(); }
      if (lv >= 3) { ctx.fillStyle = '#ffd43b'; for (const sx of [-15, 13]) { ctx.beginPath(); ctx.moveTo(sx, -h - 6); ctx.lineTo(sx + 2, -h - 14); ctx.lineTo(sx + 4, -h - 6); ctx.fill(); } }
    } else if (k === 'cannon') {
      const r = 15 + lv;
      const gr = ctx.createRadialGradient(-5, -12, 2, 0, -6, r + 3);
      gr.addColorStop(0, '#aeb6bf'); gr.addColorStop(1, '#4d5656');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -6, r, 0, 6.3); ctx.fill();
      ctx.strokeStyle = lv >= 3 ? '#ffd43b' : 'rgba(0,0,0,.3)'; ctx.lineWidth = lv >= 3 ? 3 : 2; ctx.beginPath(); ctx.arc(0, -6, r, 0, 6.3); ctx.stroke();
      ctx.save(); ctx.translate(0, -8); ctx.rotate(ang);
      const rc = recoil > 0 ? recoil * 30 : 0, bl = 24 + lv * 3, bw = 10 + lv;
      ctx.fillStyle = '#2d3436'; U.rr(ctx, -4 - rc, -bw / 2, bl, bw, 4); ctx.fill();
      ctx.fillStyle = '#444c50'; ctx.fillRect(bl - 9 - rc, -bw / 2 - 2, 6, bw + 4);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-2 - rc, -bw / 2 + 2, bl - 6, 2);
      if (lv >= 2) { ctx.fillStyle = '#e0a800'; ctx.fillRect(6 - rc, -bw / 2, 3, bw); }
      ctx.restore();
      ctx.fillStyle = '#3b3f42'; ctx.beginPath(); ctx.arc(0, -8, 6, 0, 6.3); ctx.fill();
    } else if (k === 'frost') {
      ctx.fillStyle = '#d0ebff'; U.rr(ctx, -11, -14, 22, 18, 5); ctx.fill();
      ctx.fillStyle = '#a5d8ff'; U.rr(ctx, -13, -16, 26, 6, 3); ctx.fill();
      const by = -34 + Math.sin(t * 2.2 + x) * 3, sz = 11 + lv * 2;
      ctx.save(); ctx.shadowColor = '#74c0fc'; ctx.shadowBlur = 14;
      const gr = ctx.createLinearGradient(0, by - sz * 1.4, 0, by + sz);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#74c0fc'); gr.addColorStop(1, '#1c7ed6');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, by - sz * 1.4); ctx.lineTo(sz * 0.62, by); ctx.lineTo(0, by + sz); ctx.lineTo(-sz * 0.62, by); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(0, by - sz * 1.3); ctx.lineTo(-sz * 0.3, by - 2); ctx.lineTo(0, by); ctx.closePath(); ctx.fill();
      for (let i = 0; i < lv; i++) {
        const a = t * 1.8 + i * (Math.PI * 2 / Math.max(1, lv)), ox = Math.cos(a) * 19, oy = by + Math.sin(a) * 7;
        ctx.fillStyle = '#e7f5ff'; ctx.beginPath(); ctx.moveTo(ox, oy - 5); ctx.lineTo(ox + 3, oy); ctx.lineTo(ox, oy + 5); ctx.lineTo(ox - 3, oy); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#495057'; U.rr(ctx, -5, -34, 10, 38, 3); ctx.fill();
      const n = 3 + lv;
      for (let i = 0; i < n; i++) {
        const yy = -4 - i * (28 / n);
        ctx.fillStyle = i % 2 ? '#d9822b' : '#f0a04b'; ctx.beginPath(); ctx.ellipse(0, yy, 11 - i * 0.6, 3.6, 0, 0, 6.3); ctx.fill();
      }
      const oy = -42 - lv * 2, fl = 0.75 + Math.sin(t * 17 + x) * 0.25, r = 7 + lv;
      ctx.save(); ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 16 * fl;
      const gr = ctx.createRadialGradient(-2, oy - 2, 1, 0, oy, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#d0bfff'); gr.addColorStop(1, '#7048e8');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, oy, r, 0, 6.3); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,200,255,' + (0.5 * fl) + ')'; ctx.lineWidth = 1.5;
      const a0 = t * 9 + x;
      ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r, oy + Math.sin(a0) * r); ctx.lineTo(Math.cos(a0) * (r + 6), oy + Math.sin(a0) * (r + 6) - 3); ctx.lineTo(Math.cos(a0) * (r + 10), oy + Math.sin(a0) * (r + 10)); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- ציור: מפלצות ----------
  function eyes(ctx, x, y, r, look) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x + r * 0.35 * (look == null ? 1 : look), y + r * 0.05, r * 0.55, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.3, r * 0.2, 0, 6.3); ctx.fill();
  }
  function drawEnemy(ctx, U, e, x, y, t) {
    const r = e.r, c = ECOL[e.type], ph = t * 10 + e.ph;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, r * 0.78, r * (e.fly ? 0.7 : 0.95), r * 0.3, 0, 0, 6.3); ctx.fill();
    if (e.fly) ctx.translate(0, -16 - Math.sin(t * 5 + e.ph) * 3);
    if (e.dir < 0) ctx.scale(-1, 1);
    const bob = Math.abs(Math.sin(ph)) * r * 0.12;
    const body = (rx, ry, oy) => {
      const gr = ctx.createRadialGradient(-rx * 0.35, oy - ry * 0.45, rx * 0.15, 0, oy, Math.max(rx, ry));
      gr.addColorStop(0, U.shade(c[0], 0.3)); gr.addColorStop(0.6, c[0]); gr.addColorStop(1, c[1]);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, oy, rx, ry, 0, 0, 6.3); ctx.fill();
    };
    if (e.type === 'swarm') {
      ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) { const sw = Math.sin(ph * 1.6 + i) * 2.5; ctx.beginPath(); ctx.moveTo(i * 4, 0); ctx.lineTo(i * 4 + sw, r * 0.95); ctx.stroke(); }
      body(r, r * 0.78, -bob);
      ctx.strokeStyle = 'rgba(58,42,16,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.7 - bob); ctx.lineTo(-r * 0.2, r * 0.7 - bob); ctx.stroke();
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(r * 0.8, -bob - 1, r * 0.48, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.95, -bob - 3, 1.8, 0, 6.3); ctx.fill();
    } else if (e.type === 'fast') {
      const s1 = Math.sin(ph * 1.8) * 4;
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(-3 + s1, r * 0.8, 4.5, 2.6, 0, 0, 6.3); ctx.ellipse(4 - s1, r * 0.8, 4.5, 2.6, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r - 4 - i * 2, -4 + i * 4 - bob); ctx.lineTo(-r - 12 - i * 2, -4 + i * 4 - bob); ctx.stroke(); }
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(-6, -r * 0.6 - bob); ctx.lineTo(-2, -r * 1.35 - bob); ctx.lineTo(2, -r * 0.7 - bob); ctx.fill();
      body(r, r * 0.92, -bob);
      eyes(ctx, r * 0.35, -r * 0.2 - bob, r * 0.38);
      ctx.strokeStyle = '#5c1d00'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r * 0.35, r * 0.25 - bob, 3.5, 0.2, 2.6); ctx.stroke();
    } else if (e.type === 'armor') {
      const s1 = Math.sin(ph) * 3;
      ctx.fillStyle = '#3d444b'; ctx.fillRect(-8 + s1, r * 0.35, 6, r * 0.5); ctx.fillRect(3 - s1, r * 0.35, 6, r * 0.5);
      body(r, r * 0.85, -bob);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, r * 0.35 - bob, r * 0.95, r * 0.35, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#2b2f33'; U.rr(ctx, -r * 0.1, -r * 0.35 - bob, r * 1.0, r * 0.32, 3); ctx.fill();
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.2 - bob, 2.6, 0, 6.3); ctx.arc(r * 0.62, -r * 0.2 - bob, 2.6, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#9aa5b1'; for (const [a, b] of [[-0.55, 0.15], [-0.2, 0.45], [0.2, 0.45]]) { ctx.beginPath(); ctx.arc(a * r, b * r - bob, 1.8, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(-3, -r * 0.82 - bob); ctx.lineTo(0, -r * 1.25 - bob); ctx.lineTo(4, -r * 0.82 - bob); ctx.fill();
    } else if (e.type === 'fly') {
      const fl = Math.sin(t * 16 + e.ph);
      ctx.fillStyle = c[1];
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-r * 1.7, -r * 0.6 - fl * r * 0.9); ctx.lineTo(-r * 1.2, r * 0.1); ctx.lineTo(-r * 0.7, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(r * 1.7, -r * 0.6 - fl * r * 0.9); ctx.lineTo(r * 1.2, r * 0.1); ctx.lineTo(r * 0.7, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.4, -r * 1.2); ctx.lineTo(-r * 0.1, -r * 0.6); ctx.moveTo(r * 0.6, -r * 0.5); ctx.lineTo(r * 0.4, -r * 1.2); ctx.lineTo(r * 0.1, -r * 0.6); ctx.fill();
      body(r * 0.8, r * 0.8, 0);
      eyes(ctx, -r * 0.25, -r * 0.1, r * 0.25, 0.6); eyes(ctx, r * 0.3, -r * 0.1, r * 0.25, 0.6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-2, r * 0.3); ctx.lineTo(0, r * 0.55); ctx.lineTo(1, r * 0.3); ctx.moveTo(2, r * 0.3); ctx.lineTo(4, r * 0.55); ctx.lineTo(5, r * 0.3); ctx.fill();
    } else if (e.type === 'heal') {
      const pulse = (t * 1.5 + e.ph) % 1;
      ctx.strokeStyle = 'rgba(105,219,124,' + (0.45 * (1 - pulse)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.2 + pulse * 1.4), 0, 6.3); ctx.stroke();
      const sq = 1 + Math.sin(ph * 0.7) * 0.08;
      body(r * 1.08 * sq, r * 0.88 / sq, 2 - bob * 0.5);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.2, r * 0.25, r * 0.14, -0.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.ellipse(0, -r * 0.95, 4, 8, 0.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#8ce99a'; ctx.beginPath(); ctx.ellipse(1, -r * 0.95, 1.4, 6, 0.5, 0, 6.3); ctx.fill();
      eyes(ctx, -r * 0.05, -r * 0.05, r * 0.24); eyes(ctx, r * 0.45, -r * 0.05, r * 0.24);
    } else {
      const s1 = Math.sin(ph * 0.6) * 4;
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(-8 + s1, r * 0.85, 8, 5, 0, 0, 6.3); ctx.ellipse(9 - s1, r * 0.85, 8, 5, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 2); ctx.lineTo(-r * 1.25, -r * 0.55 + s1); ctx.stroke();
      ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.arc(-r * 1.3, -r * 0.62 + s1, 7, 0, 6.3); ctx.fill();
      body(r, r * 0.95, -bob);
      ctx.fillStyle = U.shade(c[0], 0.35); ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.35 - bob, r * 0.55, r * 0.4, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#f8f0e3';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.45, -r * 0.7 - bob); ctx.lineTo(sd * r * 0.75, -r * 1.25 - bob); ctx.lineTo(sd * r * 0.2, -r * 0.85 - bob); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.82 - bob); ctx.lineTo(-r * 0.36, -r * 1.2 - bob); ctx.lineTo(-r * 0.15, -r * 0.98 - bob); ctx.lineTo(0, -r * 1.25 - bob); ctx.lineTo(r * 0.15, -r * 0.98 - bob); ctx.lineTo(r * 0.36, -r * 1.2 - bob); ctx.lineTo(r * 0.32, -r * 0.82 - bob); ctx.closePath(); ctx.fill();
      eyes(ctx, r * 0.05, -r * 0.3 - bob, r * 0.2); eyes(ctx, r * 0.5, -r * 0.3 - bob, r * 0.2);
      ctx.strokeStyle = '#3b0d06'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.55 - bob); ctx.lineTo(r * 0.2, -r * 0.45 - bob); ctx.moveTo(r * 0.68, -r * 0.55 - bob); ctx.lineTo(r * 0.36, -r * 0.45 - bob); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.28, r * 0.12 - bob, r * 0.22, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(r * 0.12, r * 0.18 - bob); ctx.lineTo(r * 0.16, r * 0.02 - bob); ctx.lineTo(r * 0.22, r * 0.2 - bob); ctx.moveTo(r * 0.34, r * 0.2 - bob); ctx.lineTo(r * 0.4, r * 0.02 - bob); ctx.lineTo(r * 0.44, r * 0.18 - bob); ctx.fill();
    }
    if (e.slow > 0) {
      ctx.fillStyle = 'rgba(130,200,255,.35)'; ctx.beginPath(); ctx.ellipse(0, -bob, r * 1.1, r, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#e7f5ff';
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + t * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.6 - bob, 1.8, 0, 6.3); ctx.fill(); }
    }
    if (e.hitT > 0) { ctx.globalAlpha = Math.min(1, e.hitT * 6) * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -bob, r, r * 0.9, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function hpBar(ctx, U, e, x, y) {
    if (e.hp >= e.max) return;
    const w = Math.max(22, e.r * 2 + 6), yy = y - e.r - (e.fly ? 30 : 12) - (e.type === 'boss' ? 10 : 0), f = Math.max(0, e.hp / e.max);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; U.rr(ctx, x - w / 2 - 1, yy - 1, w + 2, 6, 3); ctx.fill();
    ctx.fillStyle = f > 0.6 ? '#51cf66' : f > 0.3 ? '#fcc419' : '#ff6b6b'; U.rr(ctx, x - w / 2, yy, w * f, 4, 2); ctx.fill();
  }

  // ---------- ציור: הסרגל ----------
  const hov = (g, R) => !g.touch && g.ptr.over && inR(g.ptr, R);
  function btnBg(ctx, U, R, col, on, hover) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; U.rr(ctx, R.x, R.y + 3, R.w, R.h, 12); ctx.fill();
    const gr = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    gr.addColorStop(0, U.shade(col, hover ? 0.28 : 0.16)); gr.addColorStop(1, U.shade(col, -0.18));
    ctx.fillStyle = gr; U.rr(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
    ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.2)'; ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    ctx.restore();
  }
  function drawBar(g, ctx, S) {
    const t = S.anim;
    const gr = ctx.createLinearGradient(0, MH, 0, H);
    gr.addColorStop(0, '#6b4424'); gr.addColorStop(1, '#3a2413');
    ctx.fillStyle = gr; ctx.fillRect(0, MH, W, H - MH);
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2;
    for (const yy of [MH + 40, MH + 80]) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(0, MH, W, 3);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, MH + 3, W, 2);
    // כרטיסי המגדלים
    KINDS.forEach((k, i) => {
      const R = CARDS[i], d = TW[k], can = S.gold >= d.cost, sel = S.sel === k, hv = hov(g, R);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, R.x, R.y + 3, R.w, R.h, 12); ctx.fill();
      const cg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
      cg.addColorStop(0, sel ? '#fff1b8' : hv ? '#fbefd5' : '#f1e1c0'); cg.addColorStop(1, sel ? '#f5c84c' : '#cdb185');
      ctx.fillStyle = cg; g.rr(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : 'rgba(60,35,10,.5)'; ctx.lineWidth = sel ? 3.5 : 2; ctx.stroke();
      if (sel) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.globalAlpha = can ? 1 : 0.45;
      drawTower(ctx, g, k, 0, R.x + R.w / 2, R.y + 50, t, -0.7, 0, 0.88);
      ctx.globalAlpha = 1;
      row(g, ctx, [{ icon: (x, y, s) => coin(ctx, x, y, 8 * s), w: 17 }, { text: d.cost, color: can ? '#3b2a12' : '#c92a2a' }], R.x + R.w / 2, R.y + R.h - 14, R.w - 8, 21, false);
      if (!g.touch) g.text(ctx, String(i + 1), R.x + 13, R.y + 14, { size: 14, color: 'rgba(70,45,15,.6)' });
      ctx.restore();
    });
    drawInfo(g, ctx, S);
    // גל הבא
    const can = canCall(S), hv = hov(g, NEXT) && can;
    const pulse = S.wave === 0 && can ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
    btnBg(ctx, g, NEXT, can ? '#2f9e44' : '#5f5a54', pulse > 0.6, hv);
    if (pulse) { ctx.save(); ctx.strokeStyle = 'rgba(255,240,150,' + (0.3 + pulse * 0.6) + ')'; ctx.lineWidth = 3 + pulse * 3; g.rr(ctx, NEXT.x - 3, NEXT.y - 3, NEXT.w + 6, NEXT.h + 6, 14); ctx.stroke(); ctx.restore(); }
    const cx = NEXT.x + NEXT.w / 2;
    ctx.fillStyle = can ? '#fff' : 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.moveTo(cx - 9, NEXT.y + 16); ctx.lineTo(cx + 13, NEXT.y + 29); ctx.lineTo(cx - 9, NEXT.y + 42); ctx.closePath(); ctx.fill();
    if (S.wave < S.N) {
      const label = S.wave === 0 ? g.t('start') : g.t('waveN', { n: S.wave + 1 });
      g.text(ctx, label, cx, NEXT.y + 62, { size: fitSize(ctx, label, 20, NEXT.w - 12), color: can ? '#fff' : 'rgba(255,255,255,.55)' });
      const b = bonusNow(S);
      if (b > 0) row(g, ctx, [{ text: '+' + b, color: '#ffe066' }, { icon: (x, y, s) => coin(ctx, x, y, 7 * s), w: 15 }], cx, NEXT.y + 86, NEXT.w - 10, 19, false);
      if (S.cdOn) {
        const f = Math.max(0, S.cd / WAVE_GAP);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, NEXT.x + 10, NEXT.y + NEXT.h - 8, NEXT.w - 20, 4, 2); ctx.fill();
        ctx.fillStyle = '#ffe066'; g.rr(ctx, NEXT.x + 10, NEXT.y + NEXT.h - 8, (NEXT.w - 20) * f, 4, 2); ctx.fill();
      }
    } else g.text(ctx, S.wave + '/' + S.N, cx, NEXT.y + 66, { size: 20, color: 'rgba(255,255,255,.55)' });
    // מהירות
    btnBg(ctx, g, SPD, S.speed === 2 ? '#e8590c' : '#4a3a2c', S.speed === 2, hov(g, SPD));
    const sx = SPD.x + SPD.w / 2;
    ctx.fillStyle = '#fff';
    for (const o of [-9, 5]) { ctx.beginPath(); ctx.moveTo(sx + o - 4, SPD.y + 22); ctx.lineTo(sx + o + 8, SPD.y + 31); ctx.lineTo(sx + o - 4, SPD.y + 40); ctx.closePath(); ctx.fill(); }
    g.text(ctx, '×2', sx, SPD.y + 70, { size: 24, color: '#fff' });
  }
  function hoverKind(g) {
    if (g.touch || !g.ptr.over) return null;
    for (let i = 0; i < KINDS.length; i++) if (inR(g.ptr, CARDS[i])) return KINDS[i];
    return null;
  }
  function drawInfo(g, ctx, S) {
    const R = INFO, rtl = g.rtl, L = R.x + 14, Rr = R.x + R.w - 14, ax = rtl ? Rr : L, al = rtl ? 'right' : 'left';
    ctx.save();
    g.rr(ctx, R.x, R.y, R.w, R.h, 12); ctx.fillStyle = 'rgba(25,14,6,.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (S.pick) {
      const tw = S.pick, d = TW[tw.k];
      const sx = rtl ? L + 6 : Rr - 6 - 40;
      for (let i = 0; i < 3; i++) star(ctx, sx + i * 20, R.y + 22, 8.5, i < tw.lv ? '#ffd43b' : 'rgba(255,255,255,.2)');
      const title = g.t(TNAME[tw.k]);
      g.text(ctx, title, ax, R.y + 23, { size: fitSize(ctx, title, 21, R.w - 100), align: al, color: '#ffe8a3' });
      const can = tw.lv < 3, cost = can ? d.up[tw.lv] : 0, ok = can && S.gold >= cost;
      btnBg(ctx, g, UPB, can ? (ok ? '#2f9e44' : '#6b6259') : '#4a4038', false, hov(g, UPB) && can);
      if (can) row(g, ctx, [
        { icon: (x, y, s) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y - 9 * s); ctx.lineTo(x + 8 * s, y + 1 * s); ctx.lineTo(x + 3 * s, y + 1 * s); ctx.lineTo(x + 3 * s, y + 8 * s); ctx.lineTo(x - 3 * s, y + 8 * s); ctx.lineTo(x - 3 * s, y + 1 * s); ctx.lineTo(x - 8 * s, y + 1 * s); ctx.closePath(); ctx.fill(); }, w: 17 },
        { text: g.t('upgrade') }, { icon: (x, y, s) => coin(ctx, x, y, 7.5 * s), w: 16, gap: 4 }, { text: cost, color: ok ? '#ffe066' : '#ff8787' },
      ], UPB.x + UPB.w / 2, UPB.y + UPB.h / 2 + 1, UPB.w - 14, 19, rtl);
      else g.text(ctx, g.t('maxed'), UPB.x + UPB.w / 2, UPB.y + UPB.h / 2 + 1, { size: fitSize(ctx, g.t('maxed'), 19, UPB.w - 14), color: '#ffe8a3' });
      btnBg(ctx, g, SELLB, '#b8541c', false, hov(g, SELLB));
      row(g, ctx, [{ text: g.t('sell') }, { icon: (x, y, s) => coin(ctx, x, y, 7.5 * s), w: 16, gap: 4 }, { text: '+' + sellValue(tw), color: '#ffe066' }], SELLB.x + SELLB.w / 2, SELLB.y + SELLB.h / 2 + 1, SELLB.w - 14, 19, rtl);
      ctx.restore();
      return;
    }
    const k = hoverKind(g) || S.sel;
    if (k) {
      const title = g.t(TNAME[k]);
      g.text(ctx, title, ax, R.y + 22, { size: fitSize(ctx, title, 21, R.w - 28), align: al, color: '#ffe8a3' });
      const lines = wrap(ctx, g.t(TDESC[k]), 18, R.w - 28, 600).slice(0, 2);
      lines.forEach((ln, i) => g.text(ctx, ln, ax, R.y + 52 + i * 25, { size: fitSize(ctx, ln, 18, R.w - 28, 600), weight: 600, align: al, color: '#f3e5c9' }));
      ctx.restore();
      return;
    }
    if (S.wave < S.N) {
      g.text(ctx, g.t('coming'), ax, R.y + 20, { size: 18, weight: 700, align: al, color: '#f3e5c9' });
      const cnt = {};
      for (const [ty, n] of S.waves[S.wave]) cnt[ty] = (cnt[ty] || 0) + n;
      const types = Object.keys(cnt), slot = Math.min(84, (R.w - 20) / types.length);
      types.forEach((ty, i) => {
        const x = rtl ? Rr - 18 - i * slot : L + 18 + i * slot, y = R.y + 66;
        const e = { type: ty, r: Math.min(EN[ty].r, 15), dir: rtl ? -1 : 1, ph: i, fly: EN[ty].fly, slow: 0, hitT: 0 };
        drawEnemy(ctx, g, e, x, y + (e.fly ? 10 : 0), S.anim);
        g.text(ctx, '×' + cnt[ty], x + (rtl ? -22 : 22), y + 4, { size: 18, color: '#fff', align: rtl ? 'right' : 'left', dir: 'ltr' });
      });
    } else g.text(ctx, g.t('allSent'), R.x + R.w / 2, R.y + R.h / 2, { size: fitSize(ctx, g.t('allSent'), 20, R.w - 24), color: '#ffe8a3' });
    ctx.restore();
  }
  function drawBanner(g, ctx, cx, y, title, sub, icon, a) {
    ctx.save();
    ctx.globalAlpha = a;
    const ts = 21, ss = 17;
    ctx.font = '800 ' + ts + 'px ' + FONT;
    let tw = ctx.measureText(title).width;
    if (sub) { ctx.font = '600 ' + ss + 'px ' + FONT; tw = Math.max(tw, ctx.measureText(sub).width); }
    tw = Math.min(W - 60, tw);
    const bw = Math.min(W - 40, tw + (icon ? 86 : 40)), bh = sub ? 64 : 42, x = cx - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, x, y + 3, bw, bh, 14); ctx.fill();
    ctx.fillStyle = 'rgba(28,24,40,.88)'; g.rr(ctx, x, y, bw, bh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,232,163,.6)'; ctx.lineWidth = 2; ctx.stroke();
    const tx = icon ? (g.rtl ? x + (bw - 46) / 2 : x + 46 + (bw - 46) / 2) : cx;
    if (icon) icon(g.rtl ? x + bw - 30 : x + 30, y + bh / 2);
    const inner = bw - (icon ? 66 : 24);
    g.text(ctx, title, tx, y + (sub ? 21 : bh / 2), { size: fitSize(ctx, title, ts, inner), color: '#ffe8a3' });
    if (sub) g.text(ctx, sub, tx, y + 46, { size: fitSize(ctx, sub, ss, inner, 600), weight: 600, color: '#fff' });
    ctx.restore();
  }
  function arrowAt(ctx, x, y, t) {
    const b = Math.sin(t * 7) * 5;
    ctx.save(); ctx.translate(x, y + b);
    ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -15); ctx.lineTo(-5, -15); ctx.lineTo(-5, -30); ctx.lineTo(5, -30); ctx.lineTo(5, -15); ctx.lineTo(13, -15); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // תמונת הרקע של המפה נשמרת פעם אחת (לפי המפה ולפי חדות המסך)
  let bgCache = { key: '', c: null };
  function bgFor(g, S) {
    const res = g.canvas.width / W, key = S.mi + ':' + g.canvas.width;
    if (bgCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * res); c.height = Math.round(MH * res);
      const x = c.getContext('2d');
      x.setTransform(res, 0, 0, res, 0, 0);
      paintMap(x, g, S.map);
      bgCache = { key, c };
    }
    return bgCache.c;
  }

  function drawWorld(g, ctx, S, alpha, U) {
    const t = S.anim;
    // מערות: הילה חיה
    for (const P of S.map.paths) {
      const [x, y] = P.pts[0], top = y < 0, gx = top ? x : 2, gy = top ? 2 : y, p = 0.5 + 0.5 * Math.sin(t * 3 + x);
      const gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, 30);
      gr.addColorStop(0, 'rgba(190,120,255,' + (0.35 + 0.25 * p) + ')'); gr.addColorStop(1, 'rgba(190,120,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, 30, 0, 6.3); ctx.fill();
    }
    // דגל על הטירה
    const C = S.map.castle;
    ctx.strokeStyle = '#5c3a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C.x, C.y - 56); ctx.lineTo(C.x, C.y - 84); ctx.stroke();
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(C.x, C.y - 84);
    for (let i = 0; i <= 6; i++) ctx.lineTo(C.x + i * 3.2, C.y - 84 + Math.sin(t * 6 - i * 0.8) * 2);
    for (let i = 6; i >= 0; i--) ctx.lineTo(C.x + i * 3.2, C.y - 74 + Math.sin(t * 6 - i * 0.8) * 2);
    ctx.closePath(); ctx.fill();
    return t;
  }

  GK.register('tower-defense', {
    w: W, h: H, bg: '#2a1a0d', accent: '#ffd166',
    levels: MAPS.length,
    text: {
      he: {
        title: 'הגנת המגדלים',
        help: ['בחר מגדל בסרגל למטה ולחץ על הדשא ליד הדרך כדי לבנות', 'לחץ על מגדל כדי לשדרג אותו (עד 3 פעמים) או למכור', 'הכפתור ▶ מביא את הגל הבא מוקדם — ונותן בונוס זהב', 'כל מפלצת שמגיעה לטירה לוקחת לך חיים', 'מקשים: 1–4 מגדלים · רווח גל הבא · F מהירות ×2'],
        helpTouch: ['בחר מגדל למטה, הקש על הדשא ליד הדרך והקש שוב כדי לבנות', 'הקש על מגדל כדי לשדרג אותו או למכור', 'הכפתור ▶ מביא את הגל הבא מוקדם — ונותן בונוס זהב', 'כל מפלצת שמגיעה לטירה לוקחת לך חיים'],
        gold: 'זהב', wave: 'גל',
        tArrow: 'מגדל חצים', tCannon: 'תותח', tFrost: 'מגדל קרח', tBolt: 'מגדל ברקים',
        dArrow: 'יורה מהר ופוגע גם במעופפים', dCannon: 'פיצוץ שפוגע בכמה ביחד. לא פוגע במעופפים', dFrost: 'מאט את כל המפלצות בעיגול שלו', dBolt: 'ברק שקופץ בין מפלצות ועובר שריון',
        nSwarm: 'חיפושיות', nFast: 'רצים', nArmor: 'שריונים', nFly: 'עטלפים', nHeal: 'מרפאים', nBoss: 'ענק',
        tipSwarm: 'באות בנחיל — התותח פוגע בכמה ביחד', tipFast: 'מהירים מאוד — הקרח מאט אותם', tipArmor: 'חצים כמעט לא פוגעים בהם — נסה תותח או ברק', tipFly: 'עפים — התותח לא יכול לפגוע בהם', tipHeal: 'מרפאים את החברים שלידם — חסל אותם קודם', tipBoss: 'חזק מאוד, ואם הוא עובר — לוקח 10 חיים!',
        start: 'התחל!', waveN: 'גל {n}', waveMsg: 'גל {n}!', lastWave: 'הגל האחרון!', bossMsg: 'ענק מתקרב!',
        upgrade: 'שדרג', sell: 'מכור', maxed: 'רמה מקסימלית', noGold: 'אין מספיק זהב', cantBuild: 'אי אפשר לבנות כאן',
        newFoe: 'חדש: {name}', livesLeft: 'נשארו לך {n} חיים', reached: 'הגעת לגל {n} מתוך {m}', coming: 'בגל הבא:', allSent: 'כל הגלים כבר בדרך!',
        tut1: 'בחר מגדל מהסרגל למטה', tut2: 'לחץ על הדשא ליד הדרך כדי לבנות', tut2t: 'הקש על הדשא ליד הדרך, ושוב כדי לבנות', tut3: 'בנה עוד מגדל או שניים — ואז לחץ התחל!', tut4: 'לחץ על מגדל כדי לשדרג אותו',
      },
      en: {
        title: 'Tower Defense',
        help: ['Pick a tower in the bar below, then click the grass by the road to build', 'Click a tower to upgrade it (up to 3 times) or sell it', '▶ calls the next wave early — and gives bonus gold', 'Every monster that reaches the castle costs you lives', 'Keys: 1–4 towers · Space next wave · F speed ×2'],
        helpTouch: ['Pick a tower below, tap the grass by the road, then tap again to build', 'Tap a tower to upgrade or sell it', '▶ calls the next wave early — and gives bonus gold', 'Every monster that reaches the castle costs you lives'],
        gold: 'Gold', wave: 'Wave',
        tArrow: 'Arrow tower', tCannon: 'Cannon', tFrost: 'Frost tower', tBolt: 'Lightning tower',
        dArrow: 'Shoots fast and hits flyers too', dCannon: "Blasts groups at once. Can't hit flyers", dFrost: 'Slows every monster in its circle', dBolt: 'Lightning jumps between monsters and pierces armor',
        nSwarm: 'Beetles', nFast: 'Runners', nArmor: 'Armored', nFly: 'Bats', nHeal: 'Healers', nBoss: 'Giant',
        tipSwarm: 'They come in swarms — cannons hit many at once', tipFast: 'Very fast — frost slows them down', tipArmor: 'Arrows barely hurt them — try cannons or lightning', tipFly: "They fly — cannons can't hit them", tipHeal: 'They heal monsters nearby — take them out first', tipBoss: 'Very tough, and costs 10 lives if it gets through!',
        start: 'Start!', waveN: 'Wave {n}', waveMsg: 'Wave {n}!', lastWave: 'Final wave!', bossMsg: 'A giant is coming!',
        upgrade: 'Upgrade', sell: 'Sell', maxed: 'Max level', noGold: 'Not enough gold', cantBuild: "You can't build here",
        newFoe: 'New: {name}', livesLeft: '{n} lives left', reached: 'You reached wave {n} of {m}', coming: 'Next wave:', allSent: 'All waves are on their way!',
        tut1: 'Pick a tower from the bar below', tut2: 'Click the grass next to the road to build', tut2t: 'Tap the grass by the road, then tap again to build', tut3: 'Build one or two more — then press Start!', tut4: 'Click a tower to upgrade it',
      },
      ar: {
        title: 'دفاع الأبراج',
        help: ['اختر برجاً من الشريط في الأسفل ثم انقر على العشب بجانب الطريق للبناء', 'انقر على برج لتطويره (حتى 3 مرات) أو لبيعه', 'الزر ▶ يستدعي الموجة التالية مبكراً — ويعطي ذهباً إضافياً', 'كل وحش يصل إلى القلعة يأخذ منك أرواحاً', 'المفاتيح: 1–4 الأبراج · المسافة الموجة التالية · F سرعة ×2'],
        helpTouch: ['اختر برجاً في الأسفل، المس العشب بجانب الطريق ثم المسه مجدداً للبناء', 'المس برجاً لتطويره أو بيعه', 'الزر ▶ يستدعي الموجة التالية مبكراً — ويعطي ذهباً إضافياً', 'كل وحش يصل إلى القلعة يأخذ منك أرواحاً'],
        gold: 'ذهب', wave: 'الموجة',
        tArrow: 'برج السهام', tCannon: 'مدفع', tFrost: 'برج الجليد', tBolt: 'برج البرق',
        dArrow: 'يطلق بسرعة ويصيب الطائرين أيضاً', dCannon: 'ينفجر على عدة وحوش معاً. لا يصيب الطائرين', dFrost: 'يُبطئ كل الوحوش داخل دائرته', dBolt: 'برق يقفز بين الوحوش ويخترق الدروع',
        nSwarm: 'خنافس', nFast: 'عدّاؤون', nArmor: 'مدرّعون', nFly: 'خفافيش', nHeal: 'معالِجون', nBoss: 'عملاق',
        tipSwarm: 'تأتي في أسراب — المدفع يصيب الكثير منها معاً', tipFast: 'سريعون جداً — الجليد يُبطئهم', tipArmor: 'السهام بالكاد تؤذيهم — جرّب المدفع أو البرق', tipFly: 'تطير — المدفع لا يستطيع إصابتها', tipHeal: 'يعالجون الوحوش القريبة — تخلّص منهم أولاً', tipBoss: 'قوي جداً، ويأخذ 10 أرواح إذا عبر!',
        start: 'ابدأ!', waveN: 'الموجة {n}', waveMsg: 'الموجة {n}!', lastWave: 'الموجة الأخيرة!', bossMsg: 'عملاق قادم!',
        upgrade: 'طوّر', sell: 'بِع', maxed: 'أعلى مستوى', noGold: 'الذهب لا يكفي', cantBuild: 'لا يمكن البناء هنا',
        newFoe: 'جديد: {name}', livesLeft: 'تبقّى لك {n} من الأرواح', reached: 'وصلت إلى الموجة {n} من {m}', coming: 'الموجة القادمة:', allSent: 'كل الموجات في الطريق!',
        tut1: 'اختر برجاً من الشريط في الأسفل', tut2: 'انقر على العشب بجانب الطريق للبناء', tut2t: 'المس العشب بجانب الطريق، ثم المسه مجدداً للبناء', tut3: 'ابنِ برجاً أو اثنين آخرين — ثم اضغط ابدأ!', tut4: 'انقر على برج لتطويره',
      },
      es: {
        title: 'Defensa de Torres',
        help: ['Elige una torre en la barra de abajo y haz clic en la hierba junto al camino', 'Haz clic en una torre para mejorarla (hasta 3 veces) o venderla', '▶ trae la siguiente oleada antes y da oro extra', 'Cada monstruo que llega al castillo te quita vidas', 'Teclas: 1–4 torres · Espacio siguiente oleada · F velocidad ×2'],
        helpTouch: ['Elige una torre abajo, toca la hierba junto al camino y vuelve a tocar para construir', 'Toca una torre para mejorarla o venderla', '▶ trae la siguiente oleada antes y da oro extra', 'Cada monstruo que llega al castillo te quita vidas'],
        gold: 'Oro', wave: 'Oleada',
        tArrow: 'Torre de flechas', tCannon: 'Cañón', tFrost: 'Torre de hielo', tBolt: 'Torre de rayos',
        dArrow: 'Dispara rápido y también a los voladores', dCannon: 'Explota sobre grupos. No alcanza a los voladores', dFrost: 'Frena a todos los monstruos de su círculo', dBolt: 'El rayo salta entre monstruos y atraviesa armaduras',
        nSwarm: 'Escarabajos', nFast: 'Corredores', nArmor: 'Acorazados', nFly: 'Murciélagos', nHeal: 'Sanadores', nBoss: 'Gigante',
        tipSwarm: 'Vienen en enjambre: el cañón golpea a muchos a la vez', tipFast: 'Muy rápidos: el hielo los frena', tipArmor: 'Las flechas casi no les hacen daño: usa cañones o rayos', tipFly: 'Vuelan: el cañón no puede alcanzarlos', tipHeal: 'Curan a los monstruos cercanos: elimínalos primero', tipBoss: '¡Muy fuerte, y si pasa te quita 10 vidas!',
        start: '¡Empezar!', waveN: 'Oleada {n}', waveMsg: '¡Oleada {n}!', lastWave: '¡Última oleada!', bossMsg: '¡Viene un gigante!',
        upgrade: 'Mejorar', sell: 'Vender', maxed: 'Nivel máximo', noGold: 'No tienes oro suficiente', cantBuild: 'No se puede construir aquí',
        newFoe: 'Nuevo: {name}', livesLeft: 'Te quedan {n} vidas', reached: 'Llegaste a la oleada {n} de {m}', coming: 'Próxima oleada:', allSent: '¡Todas las oleadas están en camino!',
        tut1: 'Elige una torre en la barra de abajo', tut2: 'Haz clic en la hierba junto al camino para construir', tut2t: 'Toca la hierba junto al camino y vuelve a tocar para construir', tut3: 'Construye una o dos más y pulsa ¡Empezar!', tut4: 'Haz clic en una torre para mejorarla',
      },
      fr: {
        title: 'Défense des Tours',
        help: ["Choisis une tour dans la barre du bas, puis clique sur l'herbe près du chemin", 'Clique sur une tour pour l’améliorer (3 fois max) ou la vendre', '▶ fait venir la vague suivante plus tôt, avec un bonus d’or', 'Chaque monstre qui atteint le château te coûte des vies', 'Touches : 1–4 tours · Espace vague suivante · F vitesse ×2'],
        helpTouch: ["Choisis une tour en bas, touche l'herbe près du chemin, puis touche encore pour construire", 'Touche une tour pour l’améliorer ou la vendre', '▶ fait venir la vague suivante plus tôt, avec un bonus d’or', 'Chaque monstre qui atteint le château te coûte des vies'],
        gold: 'Or', wave: 'Vague',
        tArrow: "Tour d'archers", tCannon: 'Canon', tFrost: 'Tour de givre', tBolt: "Tour d'éclairs",
        dArrow: 'Tire vite et touche aussi les volants', dCannon: 'Explose sur les groupes. Ne touche pas les volants', dFrost: 'Ralentit tous les monstres dans son cercle', dBolt: "L'éclair saute de monstre en monstre et perce l'armure",
        nSwarm: 'Scarabées', nFast: 'Coureurs', nArmor: 'Blindés', nFly: 'Chauves-souris', nHeal: 'Soigneurs', nBoss: 'Géant',
        tipSwarm: 'Ils arrivent en essaim : le canon en touche plusieurs à la fois', tipFast: 'Très rapides : le givre les ralentit', tipArmor: 'Les flèches les blessent à peine : essaie le canon ou l’éclair', tipFly: 'Ils volent : le canon ne peut pas les toucher', tipHeal: 'Ils soignent les monstres proches : élimine-les en premier', tipBoss: 'Très costaud, et il coûte 10 vies s’il passe !',
        start: 'Go !', waveN: 'Vague {n}', waveMsg: 'Vague {n} !', lastWave: 'Dernière vague !', bossMsg: 'Un géant arrive !',
        upgrade: 'Améliorer', sell: 'Vendre', maxed: 'Niveau max', noGold: "Pas assez d'or", cantBuild: 'Impossible de construire ici',
        newFoe: 'Nouveau : {name}', livesLeft: 'Il te reste {n} vies', reached: 'Tu as atteint la vague {n} sur {m}', coming: 'Prochaine vague :', allSent: 'Toutes les vagues sont en route !',
        tut1: 'Choisis une tour dans la barre du bas', tut2: "Clique sur l'herbe près du chemin pour construire", tut2t: "Touche l'herbe près du chemin, puis touche encore pour construire", tut3: 'Construis-en une ou deux de plus, puis appuie sur Go !', tut4: 'Clique sur une tour pour l’améliorer',
      },
      pt: {
        title: 'Defesa de Torres',
        help: ['Escolha uma torre na barra abaixo e clique na grama ao lado da estrada', 'Clique numa torre para melhorá-la (até 3 vezes) ou vendê-la', '▶ chama a próxima onda mais cedo — e dá ouro extra', 'Cada monstro que chega ao castelo tira vidas', 'Teclas: 1–4 torres · Espaço próxima onda · F velocidade ×2'],
        helpTouch: ['Escolha uma torre abaixo, toque na grama ao lado da estrada e toque de novo para construir', 'Toque numa torre para melhorá-la ou vendê-la', '▶ chama a próxima onda mais cedo — e dá ouro extra', 'Cada monstro que chega ao castelo tira vidas'],
        gold: 'Ouro', wave: 'Onda',
        tArrow: 'Torre de flechas', tCannon: 'Canhão', tFrost: 'Torre de gelo', tBolt: 'Torre de raios',
        dArrow: 'Atira rápido e acerta voadores também', dCannon: 'Explode em grupos. Não acerta voadores', dFrost: 'Deixa lentos todos os monstros no círculo', dBolt: 'O raio pula entre monstros e fura armaduras',
        nSwarm: 'Besouros', nFast: 'Corredores', nArmor: 'Blindados', nFly: 'Morcegos', nHeal: 'Curandeiros', nBoss: 'Gigante',
        tipSwarm: 'Vêm em enxame — o canhão acerta vários de uma vez', tipFast: 'Muito rápidos — o gelo os deixa lentos', tipArmor: 'Flechas quase não os ferem — use canhões ou raios', tipFly: 'Eles voam — o canhão não os acerta', tipHeal: 'Curam os monstros por perto — derrote-os primeiro', tipBoss: 'Muito forte, e tira 10 vidas se passar!',
        start: 'Começar!', waveN: 'Onda {n}', waveMsg: 'Onda {n}!', lastWave: 'Última onda!', bossMsg: 'Um gigante vem aí!',
        upgrade: 'Melhorar', sell: 'Vender', maxed: 'Nível máximo', noGold: 'Ouro insuficiente', cantBuild: 'Não dá para construir aqui',
        newFoe: 'Novo: {name}', livesLeft: 'Restam {n} vidas', reached: 'Você chegou à onda {n} de {m}', coming: 'Próxima onda:', allSent: 'Todas as ondas estão a caminho!',
        tut1: 'Escolha uma torre na barra abaixo', tut2: 'Clique na grama ao lado da estrada para construir', tut2t: 'Toque na grama ao lado da estrada e toque de novo para construir', tut3: 'Construa mais uma ou duas — e aperte Começar!', tut4: 'Clique numa torre para melhorá-la',
      },
      ru: {
        title: 'Защита башнями',
        help: ['Выбери башню на панели внизу и нажми на траву у дороги', 'Нажми на башню, чтобы улучшить её (до 3 раз) или продать', '▶ вызывает следующую волну раньше — и даёт бонусное золото', 'Каждый монстр, дошедший до замка, отнимает жизни', 'Клавиши: 1–4 башни · Пробел следующая волна · F скорость ×2'],
        helpTouch: ['Выбери башню внизу, коснись травы у дороги и коснись ещё раз, чтобы построить', 'Коснись башни, чтобы улучшить или продать её', '▶ вызывает следующую волну раньше — и даёт бонусное золото', 'Каждый монстр, дошедший до замка, отнимает жизни'],
        gold: 'Золото', wave: 'Волна',
        tArrow: 'Башня лучников', tCannon: 'Пушка', tFrost: 'Ледяная башня', tBolt: 'Башня молний',
        dArrow: 'Стреляет быстро, попадает и по летающим', dCannon: 'Взрыв бьёт по группе. Не достаёт летающих', dFrost: 'Замедляет всех монстров в своём круге', dBolt: 'Молния прыгает между монстрами и пробивает броню',
        nSwarm: 'Жуки', nFast: 'Бегуны', nArmor: 'Бронированные', nFly: 'Летучие мыши', nHeal: 'Лекари', nBoss: 'Великан',
        tipSwarm: 'Идут роем — пушка бьёт сразу многих', tipFast: 'Очень быстрые — лёд их замедляет', tipArmor: 'Стрелы почти не ранят — используй пушки или молнии', tipFly: 'Летают — пушка в них не попадёт', tipHeal: 'Лечат монстров рядом — убери их первыми', tipBoss: 'Очень крепкий и отнимает 10 жизней, если пройдёт!',
        start: 'Старт!', waveN: 'Волна {n}', waveMsg: 'Волна {n}!', lastWave: 'Последняя волна!', bossMsg: 'Идёт великан!',
        upgrade: 'Улучшить', sell: 'Продать', maxed: 'Макс. уровень', noGold: 'Не хватает золота', cantBuild: 'Здесь строить нельзя',
        newFoe: 'Новые: {name}', livesLeft: 'Осталось жизней: {n}', reached: 'Ты дошёл до волны {n} из {m}', coming: 'Следующая волна:', allSent: 'Все волны уже в пути!',
        tut1: 'Выбери башню на панели внизу', tut2: 'Нажми на траву у дороги, чтобы построить', tut2t: 'Коснись травы у дороги, потом ещё раз — чтобы построить', tut3: 'Построй ещё одну-две — и жми Старт!', tut4: 'Нажми на башню, чтобы улучшить её',
      },
      de: {
        title: 'Turmverteidigung',
        help: ['Wähle unten einen Turm und klicke auf das Gras neben dem Weg', 'Klicke auf einen Turm, um ihn zu verbessern (bis zu 3-mal) oder zu verkaufen', '▶ holt die nächste Welle früher — mit Bonus-Gold', 'Jedes Monster, das die Burg erreicht, kostet Leben', 'Tasten: 1–4 Türme · Leertaste nächste Welle · F Tempo ×2'],
        helpTouch: ['Wähle unten einen Turm, tippe auf das Gras neben dem Weg und noch einmal zum Bauen', 'Tippe auf einen Turm, um ihn zu verbessern oder zu verkaufen', '▶ holt die nächste Welle früher — mit Bonus-Gold', 'Jedes Monster, das die Burg erreicht, kostet Leben'],
        gold: 'Gold', wave: 'Welle',
        tArrow: 'Pfeilturm', tCannon: 'Kanone', tFrost: 'Frostturm', tBolt: 'Blitzturm',
        dArrow: 'Schießt schnell und trifft auch Flieger', dCannon: 'Trifft ganze Gruppen. Nicht gegen Flieger', dFrost: 'Bremst alle Monster in seinem Kreis', dBolt: 'Der Blitz springt zwischen Monstern und durchschlägt Panzer',
        nSwarm: 'Käfer', nFast: 'Flitzer', nArmor: 'Gepanzerte', nFly: 'Fledermäuse', nHeal: 'Heiler', nBoss: 'Riese',
        tipSwarm: 'Sie kommen im Schwarm — die Kanone trifft viele auf einmal', tipFast: 'Sehr schnell — Frost bremst sie', tipArmor: 'Pfeile schaden ihnen kaum — nimm Kanonen oder Blitze', tipFly: 'Sie fliegen — die Kanone trifft sie nicht', tipHeal: 'Sie heilen Monster in der Nähe — erledige sie zuerst', tipBoss: 'Sehr zäh und kostet 10 Leben, wenn er durchkommt!',
        start: 'Los!', waveN: 'Welle {n}', waveMsg: 'Welle {n}!', lastWave: 'Letzte Welle!', bossMsg: 'Ein Riese kommt!',
        upgrade: 'Verbessern', sell: 'Verkaufen', maxed: 'Max. Stufe', noGold: 'Nicht genug Gold', cantBuild: 'Hier kann man nicht bauen',
        newFoe: 'Neu: {name}', livesLeft: 'Noch {n} Leben', reached: 'Du hast Welle {n} von {m} erreicht', coming: 'Nächste Welle:', allSent: 'Alle Wellen sind unterwegs!',
        tut1: 'Wähle unten einen Turm', tut2: 'Klicke auf das Gras neben dem Weg, um zu bauen', tut2t: 'Tippe auf das Gras neben dem Weg und noch einmal zum Bauen', tut3: 'Bau noch ein, zwei mehr — dann drück Los!', tut4: 'Klicke auf einen Turm, um ihn zu verbessern',
      },
    },

    init(g) {
      const S = g.s = newState(g);
      if (g.demo) {
        for (const [k, lv] of [['arrow', 1], ['cannon', 0], ['frost', 1], ['bolt', 2], ['arrow', 0], ['cannon', 2]]) { const sp = bestSpot(S, k); if (sp) addTower(S, k, sp[0], sp[1], lv); }
        for (let i = 0; i < 360; i++) { demoStep(g); }
      }
    },

    step(g) {
      const S = g.s;
      S.anim += DT;
      for (const e of S.en) { e.px = e.x; e.py = e.y; }
      for (const s of S.shots) { s.px = s.x; s.py = s.y; }
      if (!S.over) for (let i = 0; i < S.speed && !S.over; i++) sim(g);
      else {
        sim(g);
        if ((S.endT -= DT) <= 0 && !S.ended) { S.ended = true; finish(g); return; }
      }
      // הדרכה בשלב הראשון
      if (S.tut === 1 && S.sel) S.tut = 2;
      else if (S.tut === 2 && !S.sel && !S.towers.length) S.tut = 1;
      if ((S.tut === 1 || S.tut === 2) && S.towers.length) S.tut = 3;
      if (S.tut === 4 && (S.upgraded || S.wave >= 6)) S.tut = 0;
      if (S.banner && (S.banner.t -= DT) <= 0) S.banner = null;
      g.hud([[g.t('gold'), Math.floor(S.gold), '#ffd166'], [g.t('lives'), S.lives, '#ff8787'], [g.t('wave'), S.wave + '/' + S.N, '#8ce99a']]);
      // סמן עכבר
      let cur = 'default';
      if (g.ptr.over) {
        const p = g.ptr;
        if (p.y >= MH) { if (CARDS.some(R => inR(p, R)) || inR(p, NEXT) && canCall(S) || inR(p, SPD) || S.pick && (inR(p, UPB) || inR(p, SELLB))) cur = 'pointer'; }
        else { const c = Math.floor(p.x / T), r = Math.floor(p.y / T); if (S.sel ? canBuild(S, c, r) : towerAt(S, c, r)) cur = 'pointer'; }
      }
      if (g.canvas.style.cursor !== cur) g.canvas.style.cursor = cur;
    },

    idle(g) { if (g.demo && g.s) demoStep(g); },

    bot(g) { botStep(g); },

    onKey(g, e) {
      const S = g.s;
      if (S.over) return;
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (i >= 0) { act.select(g, S.sel === KINDS[i] ? null : KINDS[i]); return; }
      if (e.code === 'Space' || e.code === 'KeyN') act.next(g);
      else if (e.code === 'KeyF') act.speed(g);
      else if (e.code === 'KeyU' && S.pick) act.upgrade(g);
      else if ((e.code === 'KeyX' || e.code === 'Delete') && S.pick) act.sell(g);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type !== 'down' || S.over) return;
      if (p.button === 2) { S.sel = null; S.pick = null; S.pend = null; return; }
      if (p.y >= MH) {
        for (let i = 0; i < KINDS.length; i++) if (inR(p, CARDS[i])) { act.select(g, S.sel === KINDS[i] ? null : KINDS[i]); return; }
        if (inR(p, NEXT)) { if (!act.next(g)) g.sfx('error'); return; }
        if (inR(p, SPD)) { act.speed(g); return; }
        if (S.pick && inR(p, UPB)) { act.upgrade(g); return; }
        if (S.pick && inR(p, SELLB)) { act.sell(g); return; }
        return;
      }
      const c = Math.floor(p.x / T), r = Math.floor(p.y / T), tw = towerAt(S, c, r);
      if (tw) { act.pick(g, S.pick === tw ? null : tw); return; }
      if (S.sel) {
        if (p.kind === 'touch' && canBuild(S, c, r) && !(S.pend && S.pend.c === c && S.pend.r === r)) { S.pend = { c, r }; g.sfx('tick'); return; }
        act.build(g, c, r);
        return;
      }
      S.pick = null;
    },

    draw(g, ctx, alpha) {
      const S = g.s, t = S.anim;
      ctx.drawImage(bgFor(g, S), 0, 0, W, MH);
      drawWorld(g, ctx, S, alpha);
      // משבצות פנויות כשבוחרים מגדל
      if (S.sel) {
        ctx.fillStyle = 'rgba(255,255,255,.1)';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canBuild(S, c, r)) { g.rr(ctx, c * T + 3, r * T + 3, T - 6, T - 6, 6); ctx.fill(); }
      }
      // טווח של מגדל נבחר
      const ring = (x, y, R, col) => { ctx.save(); ctx.fillStyle = col.replace('A', '.12'); ctx.strokeStyle = col.replace('A', '.75'); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(x, y, R, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore(); };
      if (S.pick) {
        const tw = S.pick;
        ring(tw.x, tw.y, TW[tw.k].range[tw.lv], 'rgba(255,255,255,A)');
        if (tw.lv < 3 && hov(g, UPB)) ring(tw.x, tw.y, TW[tw.k].range[tw.lv + 1], 'rgba(140,233,154,A)');
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; g.rr(ctx, tw.c * T + 2, tw.r * T + 2, T - 4, T - 4, 8); ctx.stroke();
      }
      // רוח רפאים של מגדל לפני הבנייה
      let ghost = null;
      if (S.sel) {
        if (S.pend) ghost = S.pend;
        else if (!g.touch && g.ptr.over && g.ptr.y < MH) ghost = { c: Math.floor(g.ptr.x / T), r: Math.floor(g.ptr.y / T) };
      }
      if (ghost) {
        const ok = canBuild(S, ghost.c, ghost.r), gx = ghost.c * T + T / 2, gy = ghost.r * T + T / 2;
        ring(gx, gy, TW[S.sel].range[0], ok ? 'rgba(140,233,154,A)' : 'rgba(255,107,107,A)');
        ctx.globalAlpha = ok ? 0.7 : 0.35; drawTower(ctx, g, S.sel, 0, gx, gy, t, -0.7, 0, 1); ctx.globalAlpha = 1;
      }
      // מגדלים ומפלצות על הקרקע לפי עומק
      const items = [];
      for (const tw of S.towers) items.push([tw.y + 12, tw]);
      for (const e of S.en) if (!e.fly) items.push([e.y, e]);
      items.sort((a, b) => a[0] - b[0]);
      const ex = e => (e.px == null ? e.x : e.px + (e.x - e.px) * alpha), ey = e => (e.py == null ? e.y : e.py + (e.y - e.py) * alpha);
      for (const [, o] of items) {
        if (o.k) { const s = o.pop > 0 ? 1 + Math.sin(o.pop / 0.4 * Math.PI) * 0.12 : 1; drawTower(ctx, g, o.k, o.lv, o.x, o.y, t, o.ang, o.recoil, s); }
        else drawEnemy(ctx, g, o, ex(o), ey(o), t);
      }
      for (const e of S.en) if (e.fly) drawEnemy(ctx, g, e, ex(e), ey(e), t);
      // יריות
      for (const s of S.shots) {
        if (s.k === 'arrow') {
          const x = s.px == null ? s.x : s.px + (s.x - s.px) * alpha, y = s.py == null ? s.y : s.py + (s.y - s.py) * alpha;
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.a);
          ctx.strokeStyle = '#6e4220'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(3, 0); ctx.stroke();
          ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(1, -3.5); ctx.lineTo(1, 3.5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#f8f9fa'; ctx.fillRect(-13, -2.5, 4, 5);
          ctx.restore();
        } else {
          const f = Math.min(1, (s.t + alpha * DT) / s.dur), x = s.x0 + (s.x1 - s.x0) * f, y = s.y0 + (s.y1 - s.y0) * f, h = Math.sin(f * Math.PI) * 46;
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 6, 2.5, 0, 0, 6.3); ctx.fill();
          const gr = ctx.createRadialGradient(x - 2, y - h - 2, 1, x, y - h, 7);
          gr.addColorStop(0, '#868e96'); gr.addColorStop(1, '#212529');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - h, 6.5, 0, 6.3); ctx.fill();
        }
      }
      // אפקטים
      for (const f of S.fx) {
        const q = f.t / f.dur;
        if (f.k === 'ring') {
          ctx.strokeStyle = 'rgba(165,216,255,' + (0.7 * (1 - q)) + ')'; ctx.lineWidth = 4 * (1 - q) + 1;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.3 + 0.7 * q), 0, 6.3); ctx.stroke();
          ctx.fillStyle = 'rgba(208,235,255,' + (0.12 * (1 - q)) + ')'; ctx.fill();
        } else if (f.k === 'boom') {
          const gr = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * (0.5 + q * 0.6));
          gr.addColorStop(0, 'rgba(255,240,180,' + (1 - q) + ')'); gr.addColorStop(0.5, 'rgba(255,140,40,' + (0.8 * (1 - q)) + ')'); gr.addColorStop(1, 'rgba(255,80,20,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + q * 0.6), 0, 6.3); ctx.fill();
        } else if (f.k === 'heal') {
          ctx.strokeStyle = 'rgba(105,219,124,' + (0.8 * (1 - q)) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(f.x, f.y, 85 * q, 0, 6.3); ctx.stroke();
        } else if (f.k === 'bolt') {
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [w, col] of [[7, 'rgba(151,117,250,' + (0.45 * (1 - q)) + ')'], [2.5, 'rgba(255,255,255,' + (1 - q * 0.8) + ')']]) {
            ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
            for (let i = 0; i < f.pts.length - 1; i++) {
              const [x0, y0] = f.pts[i], [x1, y1] = f.pts[i + 1];
              if (i === 0) ctx.moveTo(x0, y0);
              for (let j = 1; j <= 4; j++) { const u = j / 4, jit = j < 4 ? (Math.random() - 0.5) * 12 : 0; ctx.lineTo(x0 + (x1 - x0) * u + jit, y0 + (y1 - y0) * u + jit * 0.7); }
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      for (const e of S.en) hpBar(ctx, g, e, ex(e), ey(e));
      drawBar(g, ctx, S);
      if (S.demo) return;
      // באנרים: הדרכה ומפלצת חדשה
      let by = 10;
      if (S.tut && !S.over) {
        let key = null, target = null;
        if (S.tut === 1) { key = 'tut1'; target = CARDS[0]; }
        else if (S.tut === 2) key = g.touch ? 'tut2t' : 'tut2';
        else if (S.tut === 3 && S.wave === 0) { key = 'tut3'; target = NEXT; }
        else if (S.tut === 4 && S.wave >= 2 && S.towers.some(tw => tw.lv < 3 && S.gold >= TW[tw.k].up[tw.lv])) key = 'tut4';
        if (key) {
          drawBanner(g, ctx, W / 2, by, g.t(key), null, null, 1);
          by += 52;
          if (target) arrowAt(ctx, target.x + target.w / 2, target.y - 6, t);
        }
      }
      if (S.banner) {
        const b = S.banner, a = Math.min(1, b.t * 2, (5 - b.t) * 4);
        drawBanner(g, ctx, W / 2, by, g.t('newFoe', { name: g.t(ENAME[b.type]) }), g.t(ETIP[b.type]), (x, y) => drawEnemy(ctx, g, { type: b.type, r: Math.min(EN[b.type].r, 17), dir: 1, ph: 0, fly: false, slow: 0, hitT: 0 }, x, y - 2, t), a);
      }
    },

    cover(ctx, w, h, k) {
      const map = buildMap(0);
      ctx.save();
      ctx.scale(h / MH, h / MH);
      ctx.translate(-48, 0);
      paintMap(ctx, k, map);
      const towers = [['arrow', 6, 4, 2], ['cannon', 11, 4, 1], ['frost', 7, 5, 1], ['bolt', 12, 5, 3], ['arrow', 2, 4, 1], ['cannon', 16, 5, 2]];
      const items = [];
      for (const [kk, c, r, lv] of towers) items.push([r * T + T / 2 + 12, { k: kk, x: c * T + T / 2, y: r * T + T / 2, lv }]);
      const P = map.paths[0];
      const foes = [['swarm', 260], ['swarm', 285], ['swarm', 305], ['fast', 420], ['armor', 560], ['heal', 700], ['fast', 760], ['boss', 1240], ['armor', 1000]];
      const es = foes.map(([ty, d], i) => { const q = posAt(P, d); return { type: ty, r: EN[ty].r, x: q[0], y: q[1], dir: 1, ph: i * 1.7, fly: false, slow: ty === 'armor' && d > 900 ? 0.4 : 0, hitT: 0, hp: 1, max: 1 }; });
      for (const e of es) items.push([e.y, e]);
      items.sort((a, b) => a[0] - b[0]);
      for (const [, o] of items) { if (o.k) drawTower(ctx, k, o.k, o.lv, o.x, o.y, 0.6, -0.4, 0, 1); else drawEnemy(ctx, k, o, o.x, o.y, 0.3); }
      const bats = [[330, 160], [380, 130], [600, 300]];
      bats.forEach(([x, y], i) => drawEnemy(ctx, k, { type: 'fly', r: 13, dir: 1, ph: i * 2, fly: true, slow: 0, hitT: 0 }, x, y, 0.2 + i * 0.1));
      // ברק ופיצוץ
      ctx.lineCap = 'round';
      const bp = [[12 * T + 24, 5 * T + 24 - 52], [es[5].x, es[5].y - 4], [es[6].x, es[6].y - 4], [es[4].x, es[4].y - 4]];
      for (const [wd, col] of [[9, 'rgba(151,117,250,.5)'], [3, '#fff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath();
        const rr = k.seeded(5);
        for (let i = 0; i < bp.length - 1; i++) { const [x0, y0] = bp[i], [x1, y1] = bp[i + 1]; if (!i) ctx.moveTo(x0, y0); for (let j = 1; j <= 4; j++) { const u = j / 4, jt = j < 4 ? (rr() - 0.5) * 14 : 0; ctx.lineTo(x0 + (x1 - x0) * u + jt, y0 + (y1 - y0) * u + jt); } }
        ctx.stroke();
      }
      const bx = posAt(P, 290)[0], byy = posAt(P, 290)[1];
      const gr = ctx.createRadialGradient(bx, byy, 2, bx, byy, 44);
      gr.addColorStop(0, 'rgba(255,245,190,1)'); gr.addColorStop(0.5, 'rgba(255,140,40,.85)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, byy, 44, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(165,216,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(7 * T + 24, 5 * T + 24, 70, 0, 6.3); ctx.stroke();
      ctx.restore();
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },
  });

  // מסך התפריט: מפלצות הולכות והמגדלים יורים בלי צלילים
  function demoStep(g) {
    const S = g.s;
    S.anim += DT;
    for (const e of S.en) { e.px = e.x; e.py = e.y; }
    for (const s of S.shots) { s.px = s.x; s.py = s.y; }
    if ((S.demoT -= DT) <= 0 && S.en.length < 14) {
      S.demoT = 1.1;
      const pool = ['swarm', 'swarm', 'fast', 'armor', 'fly', 'heal'].filter(t => t !== 'fly' || S.mi > 0);
      spawn(g, { type: pool[Math.floor(Math.random() * pool.length)], p: Math.floor(Math.random() * S.map.paths.length), hm: 1.6 });
    }
    sim(g);
  }
})();
