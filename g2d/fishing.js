// ============================================================
//  דייג — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מטילים חכה (מחזיקים כדי לטעון מרחק), מחכים לנשיכה ומגלגלים בעדינות: המחוג חייב להישאר בירוק.
//  28 מינים ב-4 אגמים, מנפוץ ועד אגדי, אלבום שנשמר, חנות של חכות, פתיונות ואגמים. כל סיבוב הוא יום: זריחה, שקיעה ולילה.
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const DAY0 = 6, DAY1 = 26, HOUR = 14;          // a trip runs 6:00 → 2:00; one game hour = 14 seconds
  const RC = ['#c3ccd6', '#6fe08a', '#55aaff', '#c77dff', '#ffcc33'];   // rarity colours: common → legendary
  const STR = [0.25, 0.4, 0.55, 0.72, 0.88];      // how hard each rarity fights
  const RV = [6, 14, 35, 90, 260];                 // base price by rarity
  const LAKE_MULT = [1, 1.8, 3.2, 5.5];
  const ROD = [
    { p: 1.0, c: 0.0, h: 1.4, d: 0.6, $: 0, col: '#c9a04a' },
    { p: 1.22, c: 0.035, h: 1.65, d: 0.72, $: 100, col: '#4fb0e8' },
    { p: 1.45, c: 0.07, h: 2.0, d: 0.84, $: 500, col: '#3a3f4a' },
    { p: 1.75, c: 0.1, h: 2.5, d: 0.93, $: 1800, col: '#e8463a' },
    { p: 2.1, c: 0.14, h: 3.0, d: 1.0, $: 5000, col: '#ffcc33' },
  ];
  const LURE = [
    { s: 1, k: 0, $: 0, col: '#d9776b' },
    { s: 1.15, k: 0.8, $: 120, col: '#d7dde4' },
    { s: 1.3, k: 1.5, $: 600, col: '#5fd06f' },
    { s: 1.45, k: 2.2, $: 2000, col: '#6ff6ff', glow: 1 },
    { s: 1.6, k: 3.2, $: 6000, col: '#ffcc33' },
  ];
  const LAKE = [
    { $: 0, top: '#3f9a86', deep: '#0e3b3a', band: '#69b6a2', sand: '#8a7a52' },
    { $: 300, top: '#2f76a0', deep: '#0a2442', band: '#6a9ec0', sand: '#6a6458' },
    { $: 1500, top: '#2ccbc8', deep: '#085a7a', band: '#79e3df', sand: '#e8d9a8' },
    { $: 4500, top: '#3a86b0', deep: '#0a2036', band: '#86b8d4', sand: '#7a8790' },
  ];
  // the 28 species, 7 per lake: [common, common, uncommon, uncommon, rare, epic, legendary]
  // sh = body shape, c = [back, belly, fins], pat = pattern (pc its colour), hr = height / length, cm = size range
  const SP = [
    { r: 0, sh: 'std', c: ['#ff9a2e', '#ffd88a', '#ff7b22'], pat: 'none', hr: 0.48, cm: [8, 18] },
    { r: 0, sh: 'round', c: ['#6aa56a', '#ffb24a', '#4d8a56'], pat: 'bands', pc: 'rgba(30,70,40,.32)', hr: 0.74, cm: [10, 22], ex: 'ear' },
    { r: 1, sh: 'std', c: ['#c4c044', '#f4efc2', '#e2733a'], pat: 'bands', pc: 'rgba(40,55,20,.55)', hr: 0.36, cm: [15, 35] },
    { r: 1, sh: 'std', c: ['#8d9ba8', '#e2e8ec', '#6c7c8a'], pat: 'bands', pc: 'rgba(40,50,60,.16)', hr: 0.44, cm: [20, 40] },
    { r: 2, sh: 'long', c: ['#5d686e', '#cfc8b6', '#4a545a'], pat: 'spots', pc: 'rgba(25,25,25,.28)', hr: 0.27, cm: [40, 90], ex: 'whisk', night: 1 },
    { r: 3, sh: 'std', c: ['#fff4ea', '#ffffff', '#ffd6c2'], pat: 'koi', pc: '#ff5626', hr: 0.38, cm: [40, 75], ex: 'whisk2' },
    { r: 4, sh: 'std', c: ['#ffcf33', '#fff2b0', '#ffae00'], pat: 'scales', pc: 'rgba(255,255,255,.5)', hr: 0.4, cm: [60, 100], ex: 'whisk', glow: '#ffe27a' },
    { r: 0, sh: 'long', c: ['#7c916a', '#f3e8d2', '#8b9b74'], pat: 'spots', pc: 'rgba(40,40,30,.5)', hr: 0.27, cm: [20, 45], ex: 'stripe', sc: '#f08aa0' },
    { r: 0, sh: 'std', c: ['#9c8c48', '#ebdfae', '#7d6d36'], pat: 'scales', pc: 'rgba(70,45,10,.35)', hr: 0.42, cm: [30, 60], ex: 'whisk2' },
    { r: 1, sh: 'eel', c: ['#4d5c3a', '#cbc79c', '#3e4b30'], pat: 'none', hr: 0.11, cm: [50, 100] },
    { r: 1, sh: 'long', c: ['#5e7b3e', '#ebe8ba', '#708b45'], pat: 'spots', pc: 'rgba(245,245,190,.6)', hr: 0.21, cm: [50, 110] },
    { r: 2, sh: 'long', c: ['#7d90a3', '#f1f3f5', '#5b6d7e'], pat: 'spots', pc: 'rgba(20,30,40,.4)', hr: 0.29, cm: [50, 100], ex: 'stripe', sc: '#ff9a86' },
    { r: 3, sh: 'long', c: ['#a9c9ff', '#eef4ff', '#7fa6f2'], pat: 'spots', pc: 'rgba(255,255,255,.85)', hr: 0.29, cm: [40, 80], night: 1, glow: '#a6d4ff' },
    { r: 4, sh: 'sturgeon', c: ['#6d7b87', '#dadee1', '#566571'], pat: 'none', hr: 0.19, cm: [120, 220], ex: 'whisk', glow: '#cfe8ff' },
    { r: 0, sh: 'std', c: ['#ff7a1a', '#ffae5e', '#ff6800'], pat: 'clown', pc: '#ffffff', hr: 0.5, cm: [6, 12] },
    { r: 0, sh: 'tall', c: ['#ffd43a', '#fff1a2', '#2c6cff'], pat: 'bands', pc: 'rgba(30,60,170,.55)', hr: 0.92, cm: [10, 25] },
    { r: 1, sh: 'std', c: ['#2fd3a4', '#c0f7e6', '#ff70b2'], pat: 'scales', pc: 'rgba(255,255,255,.32)', hr: 0.42, cm: [25, 60] },
    { r: 1, sh: 'round', c: ['#e9c66c', '#fff6d8', '#c99b3b'], pat: 'spots', pc: 'rgba(90,60,20,.45)', hr: 0.84, cm: [15, 40], ex: 'spikes' },
    { r: 2, sh: 'sword', c: ['#3b609f', '#e0eaf7', '#2d4d83'], pat: 'none', hr: 0.23, cm: [120, 280] },
    { r: 3, sh: 'std', c: ['#2b3060', '#4c5794', '#1e2347'], pat: 'none', hr: 0.32, cm: [5, 15], night: 1, ex: 'lights', glow: '#5ff0ff' },
    { r: 4, sh: 'dragon', c: ['#ff8b3e', '#ffd38c', '#ffb54a'], pat: 'none', hr: 0.2, cm: [30, 50], glow: '#ffb5f2' },
    { r: 0, sh: 'std', c: ['#8b8b5e', '#f0ebdc', '#787850'], pat: 'spots', pc: 'rgba(60,60,30,.35)', hr: 0.31, cm: [40, 90], ex: 'whisk1' },
    { r: 0, sh: 'std', c: ['#5b80a9', '#e7eff6', '#4b6b91'], pat: 'none', hr: 0.29, cm: [15, 35] },
    { r: 1, sh: 'std', c: ['#307090', '#d9f1ff', '#255067'], pat: 'tiger', pc: 'rgba(10,30,50,.6)', hr: 0.26, cm: [25, 45] },
    { r: 1, sh: 'flat', c: ['#8b7761', '#f0e7d9', '#705f4d'], pat: 'spots', pc: 'rgba(60,40,20,.3)', hr: 0.55, cm: [60, 150] },
    { r: 2, sh: 'long', c: ['#e0ebf3', '#ffffff', '#c7dae7'], pat: 'none', hr: 0.23, cm: [25, 50], ex: 'ice' },
    { r: 3, sh: 'long', c: ['#40d7a1', '#cab9ff', '#8b6dff'], pat: 'spots', pc: 'rgba(255,255,255,.6)', hr: 0.29, cm: [60, 110], night: 1, glow: '#7effd0' },
    { r: 4, sh: 'crown', c: ['#80d4ff', '#e9f8ff', '#4ba9e9'], pat: 'scales', pc: 'rgba(255,255,255,.5)', hr: 0.42, cm: [100, 180], glow: '#c0f0ff' },
  ];
  SP.forEach((s, i) => { s.i = i; s.lake = Math.floor(i / 7); });

  // ---------- small helpers ----------
  const rect = (x, y, w, h) => ({ x, y, w, h });
  const inR = (p, r) => !!r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const HX = {};
  function rgb(h) { let v = HX[h]; if (!v) { const n = parseInt(h.slice(1), 16); v = HX[h] = [n >> 16, (n >> 8) & 255, n & 255]; } return v; }
  const mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a) => (a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const mixC = (h1, h2, t, a) => css(mixA(rgb(h1), rgb(h2), t), a);
  const priceOf = (s, cm) => Math.max(1, Math.round(RV[s.r] * LAKE_MULT[s.lake] * (0.75 + 0.5 * (cm - s.cm[0]) / Math.max(1, s.cm[1] - s.cm[0]))));
  const pxLen = cm => 22 + 92 * Math.sqrt(Math.max(0, cm - 5) / 215);   // length of a fish on screen
  const hour24 = h => ((h % 24) + 24) % 24;
  const isNight = h => { const x = hour24(h); return x >= 20.25 || x < 5.25; };
  const clockStr = h => { const x = hour24(h), hh = Math.floor(x), mm = Math.floor((x - hh) * 6) * 10; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; };

  // ---------- the sky through the day: [hour, top, middle, horizon, darkness, warm light] ----------
  const SK = [
    [0, '#070b1f', '#121a3d', '#1d2752', 0.66, 0],
    [4.6, '#070b1f', '#121a3d', '#1d2752', 0.66, 0],
    [5.6, '#262b5e', '#70508c', '#e98a78', 0.42, 0.35],
    [6.6, '#4a72b8', '#f0a27e', '#ffd69c', 0.12, 0.45],
    [8, '#4f9ce6', '#8bc8f2', '#cdeeff', 0, 0.05],
    [16.4, '#4a8fda', '#8ec4ee', '#fde2b4', 0, 0.12],
    [18.4, '#3e4e98', '#e27c6e', '#ffc26c', 0.12, 0.55],
    [19.5, '#262b68', '#7b4d88', '#ea826c', 0.35, 0.4],
    [20.6, '#0e1336', '#232a5e', '#3b3c70', 0.58, 0.05],
    [24, '#070b1f', '#121a3d', '#1d2752', 0.66, 0],
  ].map(k => ({ h: k[0], t: rgb(k[1]), m: rgb(k[2]), b: rgb(k[3]), dark: k[4], warm: k[5] }));
  function tod(h) {
    h = hour24(h);
    let i = 0;
    while (i < SK.length - 2 && h > SK[i + 1].h) i++;
    const A = SK[i], B = SK[i + 1], u = clamp((h - A.h) / Math.max(1e-6, B.h - A.h), 0, 1), e = u * u * (3 - 2 * u);
    const dark = A.dark + (B.dark - A.dark) * e;
    return { h, top: mixA(A.t, B.t, e), mid: mixA(A.m, B.m, e), bot: mixA(A.b, B.b, e), dark, warm: A.warm + (B.warm - A.warm) * e, night: clamp((dark - 0.22) / 0.4, 0, 1) };
  }

  // ---------- the layout: landscape 960×600 on computers, portrait 600×1000 on phones ----------
  function layout(W, H) {
    const P = H > W, L = { P, W, H };
    if (!P) {
      Object.assign(L, { hor: 214, sea: 252, bed: 588, dockX: 196, dockY: 226, fx: 112, castA: 268, castB: 928, k: 1 });
      L.btnShop = rect(W - 136, 12, 124, 46); L.btnAlbum = rect(W - 270, 12, 124, 46);
      L.panel = rect(100, 34, 760, 540); L.card = rect(250, 64, 460, 476); L.bar = rect(W / 2 - 210, H - 74, 420, 30);
      L.hint = { x: W / 2, y: H - 108 };
    } else {
      Object.assign(L, { hor: 300, sea: 352, bed: 978, dockX: 150, dockY: 326, fx: 82, castA: 214, castB: 572, k: 0.92 });
      L.btnShop = rect(W - 132, 16, 118, 50); L.btnAlbum = rect(W - 262, 16, 118, 50);
      L.panel = rect(14, 52, 572, 896); L.card = rect(40, 190, 520, 600); L.bar = rect(50, H - 118, 500, 40);
      L.hint = { x: W / 2, y: H - 160 };
    }
    L.bedY = x => L.sea + 120 + (L.bed - L.sea - 150) * clamp((x - L.dockX + 60) / (L.W - L.dockX + 60), 0, 1) + Math.sin(x * 0.021) * 12;
    L.hookY = x => L.sea + 46 + (L.bedY(x) - L.sea - 80) * 0.62;
    return L;
  }

  // ---------- saved progress ----------
  function freshP() { return { coins: 0, rod: 0, lure: 0, lake: 0, own: { rod: [1, 0, 0, 0, 0], lure: [1, 0, 0, 0, 0], lake: [1, 0, 0, 0] }, alb: [], done: [0, 0, 0, 0], days: 0, fights: 0 }; }
  function loadP(g) {
    const P = freshP(), d = g.load('p', null);
    if (!d || typeof d !== 'object') return P;
    const num = (v, a, b, def) => (Number.isFinite(+v) ? clamp(Math.floor(+v), a, b) : def);
    P.coins = num(d.coins, 0, 1e9, 0);
    for (const k of ['rod', 'lure', 'lake']) {
      const n = P.own[k].length;
      if (d.own && Array.isArray(d.own[k])) for (let i = 0; i < n; i++) P.own[k][i] = d.own[k][i] ? 1 : 0;
      P.own[k][0] = 1;
      P[k] = num(d[k], 0, n - 1, 0);
      if (!P.own[k][P[k]]) P[k] = 0;
    }
    if (Array.isArray(d.alb)) for (let i = 0; i < SP.length; i++) { const a = d.alb[i]; if (a && a.n > 0) P.alb[i] = { n: num(a.n, 1, 1e6, 1), b: num(a.b, 1, 999, 1) }; }
    if (Array.isArray(d.done)) for (let i = 0; i < 4; i++) P.done[i] = d.done[i] ? 1 : 0;
    P.days = num(d.days, 0, 1e6, 0); P.fights = num(d.fights, 0, 1e6, 0);
    return P;
  }
  const albCount = (P, lake) => { let n = 0; for (let i = 0; i < SP.length; i++) if (P.alb[i] && (lake == null || SP[i].lake === lake)) n++; return n; };

  // ---------- which fish bites: rarer with a better lure, a longer cast, and at night ----------
  function rollFish(P, lake, dist, night, R) {
    const lu = LURE[P.lure];
    const luck = lu.k + dist * 1.6 + (night ? 0.5 + (lu.glow ? 1 : 0) : 0);
    const base = [52, 28, 12, 4.5, 1.4], sl = [-0.12, 0, 0.2, 0.33, 0.45];
    const pools = [[], [], [], [], []];
    for (let i = lake * 7; i < lake * 7 + 7; i++) if (night || !SP[i].night) pools[SP[i].r].push(i);
    const w = base.map((b, r) => (pools[r].length ? b * Math.exp(luck * sl[r]) : 0));
    let x = R() * w.reduce((a, b) => a + b, 0), r = 0;
    while (r < 4 && x >= w[r]) { x -= w[r]; r++; }
    if (!pools[r].length) r = 0;
    const s = SP[pools[r][Math.floor(R() * pools[r].length)]];
    return { s, cm: Math.round(s.cm[0] + (s.cm[1] - s.cm[0]) * Math.pow(R(), 1.4)) };
  }

  // ---------- the reeling fight. T = line tension 0..1, D = how far the fish is (0 = landed, 1 = gone) ----------
  function fightNew(s, cm, rod, R) {
    const st = STR[s.r] * (0.85 + 0.3 * (cm - s.cm[0]) / Math.max(1, s.cm[1] - s.cm[0]));
    return { st, T: 0.4, v: 0, D: 0.45, strain: 0, run: 0, warn: 0, calm: 1 + R() * 0.8, gw: Math.max(0.08, 0.15 + rod.c - st * 0.04), gc: 0.5, t: 0, ph: R() * 6, zone: 1 };
  }
  function fightStep(F, hold, rod, dt, R) {
    F.t += dt;
    F.gc = 0.5 + Math.sin(F.t * (0.5 + F.st) + F.ph) * 0.13 * F.st;
    if (F.run > 0) F.run -= dt;
    else if (F.warn > 0) { F.warn -= dt; if (F.warn <= 0) F.run = (0.35 + F.st * 0.9) * (0.7 + R() * 0.6); }
    else if ((F.calm -= dt) <= 0) { F.warn = 0.42; F.calm = (2.7 - F.st * 1.6) * (0.6 + R() * 0.8); }
    const pull = F.run > 0 ? 0.25 + F.st * 0.55 : 0;
    F.v += ((hold ? 0.55 : -0.5) + pull - F.v) * Math.min(1, dt * 14);
    F.T = clamp(F.T + F.v * dt, 0, 1);
    if ((F.T <= 0 && F.v < 0) || (F.T >= 1 && F.v > 0)) F.v = 0;
    F.zone = F.T < F.gc - F.gw ? 0 : F.T > F.gc + F.gw ? 2 : 1;
    if (F.zone === 1) F.D -= 0.085 * rod.p * (1 - 0.45 * F.st) * dt;
    else if (F.zone === 0) F.D += (0.035 + 0.05 * F.st) * dt;
    if (F.run > 0) F.D += F.st * 0.05 * dt;
    if (F.zone === 2) F.strain += dt / rod.h; else F.strain = Math.max(0, F.strain - 0.45 * dt);
    if (F.D <= 0) return 'caught';
    if (F.strain >= 1) return 'snap';
    if (F.D >= 1) return 'escape';
    return null;
  }
  // a careful player: ease off while the fish pulls, otherwise aim a little under the middle of the green
  const fightBot = F => (F.warn > 0 || F.run > 0 ? F.T < F.gc - F.gw * 0.6 : F.T < F.gc - F.gw * 0.15);

  // ---------- texts (8 languages). Lists are joined with | ----------
  const TEXT = {
    he: {
      title: 'דייג',
      help: ['לחץ והחזק (עכבר או רווח) כדי לטעון, ושחרר כדי להטיל', 'כשהמצוף צולל — לחץ מהר כדי לתפוס את הדג', 'החזק כדי לגלגל ושחרר כדי להרפות: שמור על המחוג בירוק', 'מכור דגים, קנה חכות, פתיונות ואגמים, ומלא את האלבום'],
      helpTouch: ['גע והחזק את המסך כדי לטעון, והרם את האצבע כדי להטיל', 'כשהמצוף צולל — גע מהר כדי לתפוס את הדג', 'החזק כדי לגלגל והרפה כדי לשחרר: שמור על המחוג בירוק', 'מכור דגים, קנה חכות, פתיונות ואגמים, ומלא את האלבום'],
      holdCast: 'החזק כדי להטיל', release: 'שחרר כדי להטיל!', waiting: 'חכה לנשיכה…', bite: 'נשיכה! עכשיו!', tooEarly: 'מוקדם מדי — הדג נבהל', missed: 'איטי מדי — הדג ברח',
      snapped: 'החוט נקרע!', escaped: 'הדג השתחרר!', reelHint: 'החזק כדי לגלגל — שמור על המחוג בירוק', sell: 'מכור +{n}', newFish: 'חדש!',
      shop: 'חנות', album: 'אלבום', rods: 'חכות', lures: 'פתיונות', lakes: 'אגמים', equip: 'בחר', equipped: 'בשימוש', travel: 'סע לשם', here: 'אתה כאן', need: 'חסרים {n}', bought: 'קנית: {n}!',
      sDist: 'טווח', sReel: 'גלגול', sHold: 'חוזק', sLuck: 'מזל', sBite: 'נשיכות', mult: 'מחיר הדגים ×{n}',
      dayOver: 'היום נגמר!', earned: 'הרווחת היום', daySum: 'דגים: {n} · מינים חדשים: {m}', dayN: 'יום {n} — בוקר טוב!', night: 'הלילה ירד — דגי הלילה יוצאים!', nightOnly: 'רק בלילה',
      lakeDone: 'השלמת את {n}! בונוס +{m}', cm: '{n} ס"מ', bestLen: 'הכי גדול: {n} ס"מ', caughtN: 'נתפסו: {n}', newSp: 'מין חדש באלבום!',
      rar: 'נפוץ|לא נפוץ|נדיר|אפי|אגדי',
      rod: 'חכת במבוק|חכת פיברגלס|חכת קרבון|חכת מקצוענים|חכת הזהב',
      lure: 'תולעת|כפית מסתובבת|זבוב נוצות|פיתיון זוהר|פיתיון הזהב',
      lake: 'בריכת הנופרים|אגם האורנים|לגונת האלמוגים|פיורד הקרח',
      fish: 'דג זהב|דג שמש|אוקונוס|אמנון|שפמנון|קוי|קוי הדרקון|פורל|קרפיון|צלופח|זאב מים|סלמון|פורל הירח|החדקן הקדום|דג ליצן|דג מלאך|דג תוכי|אבו נפחא|דג חרב|דג פנס|דרקון הים|בקלה|הרינג|מקרל|פוטית|דג קרח|סלמון הזוהר|מלך הכפור',
    },
    en: {
      title: 'Fishing',
      help: ['Press and hold (mouse or Space) to charge, release to cast', 'When the float dips under — click fast to hook the fish', 'Hold to reel, let go to ease off: keep the needle in the green', 'Sell fish, buy rods, lures and new lakes, and fill your album'],
      helpTouch: ['Touch and hold the screen to charge, lift your finger to cast', 'When the float dips under — tap fast to hook the fish', 'Hold to reel, let go to ease off: keep the needle in the green', 'Sell fish, buy rods, lures and new lakes, and fill your album'],
      holdCast: 'Hold to cast', release: 'Release to cast!', waiting: 'Wait for a bite…', bite: 'Bite! Now!', tooEarly: 'Too early — the fish got scared', missed: 'Too slow — the fish swam away',
      snapped: 'The line snapped!', escaped: 'The fish got away!', reelHint: 'Hold to reel — keep the needle in the green', sell: 'Sell +{n}', newFish: 'NEW!',
      shop: 'Shop', album: 'Album', rods: 'Rods', lures: 'Lures', lakes: 'Lakes', equip: 'Use', equipped: 'In use', travel: 'Travel', here: "You're here", need: 'Need {n}', bought: 'Bought: {n}!',
      sDist: 'Range', sReel: 'Reel', sHold: 'Strength', sLuck: 'Luck', sBite: 'Bites', mult: 'Fish price ×{n}',
      dayOver: 'The day is over!', earned: 'Earned today', daySum: 'Fish: {n} · New species: {m}', dayN: 'Day {n} — good morning!', night: 'Night falls — the night fish come out!', nightOnly: 'Night only',
      lakeDone: '{n} complete! Bonus +{m}', cm: '{n} cm', bestLen: 'Biggest: {n} cm', caughtN: 'Caught: {n}', newSp: 'New species in the album!',
      rar: 'Common|Uncommon|Rare|Epic|Legendary',
      rod: 'Bamboo Rod|Fiberglass Rod|Carbon Rod|Pro Rod|Golden Rod',
      lure: 'Worm|Spinner|Feather Fly|Glow Lure|Golden Lure',
      lake: 'Lily Pond|Pine Lake|Coral Lagoon|Glacier Fjord',
      fish: 'Goldfish|Sunfish|Perch|Tilapia|Catfish|Koi|Dragon Koi|Trout|Carp|Eel|Pike|Salmon|Moon Trout|Ancient Sturgeon|Clownfish|Angelfish|Parrotfish|Pufferfish|Swordfish|Lanternfish|Sea Dragon|Cod|Herring|Mackerel|Halibut|Icefish|Aurora Salmon|Frost King',
    },
    ar: {
      title: 'الصيد',
      help: ['اضغط مطولاً (الفأرة أو المسافة) للشحن، وأفلت لترمي الصنارة', 'عندما تغوص العوّامة — اضغط بسرعة لتعلق السمكة', 'اضغط مطولاً لتلف الخيط وأفلت لترخيه: أبقِ المؤشر في الأخضر', 'بِع السمك واشترِ صنارات وطُعوماً وبحيرات جديدة، واملأ ألبومك'],
      helpTouch: ['المس الشاشة مطولاً للشحن، وارفع إصبعك لترمي الصنارة', 'عندما تغوص العوّامة — المس بسرعة لتعلق السمكة', 'المس مطولاً لتلف الخيط وارفع إصبعك لترخيه: أبقِ المؤشر في الأخضر', 'بِع السمك واشترِ صنارات وطُعوماً وبحيرات جديدة، واملأ ألبومك'],
      holdCast: 'اضغط مطولاً لترمي', release: 'أفلت لترمي!', waiting: 'انتظر أن تعضّ سمكة…', bite: 'عضّة! الآن!', tooEarly: 'مبكر جداً — خافت السمكة', missed: 'تأخرت — هربت السمكة',
      snapped: 'انقطع الخيط!', escaped: 'أفلتت السمكة!', reelHint: 'اضغط مطولاً لتلف الخيط — أبقِ المؤشر في الأخضر', sell: 'بِع +{n}', newFish: 'جديد!',
      shop: 'المتجر', album: 'الألبوم', rods: 'صنارات', lures: 'طُعوم', lakes: 'بحيرات', equip: 'استخدم', equipped: 'مستخدَم', travel: 'سافر', here: 'أنت هنا', need: 'ينقصك {n}', bought: 'اشتريت: {n}!',
      sDist: 'المدى', sReel: 'اللف', sHold: 'القوة', sLuck: 'الحظ', sBite: 'العضّات', mult: 'سعر السمك ×{n}',
      dayOver: 'انتهى اليوم!', earned: 'ربحت اليوم', daySum: 'أسماك: {n} · أنواع جديدة: {m}', dayN: 'اليوم {n} — صباح الخير!', night: 'حلّ الليل — أسماك الليل تخرج!', nightOnly: 'في الليل فقط',
      lakeDone: 'أكملت {n}! مكافأة +{m}', cm: '{n} سم', bestLen: 'الأكبر: {n} سم', caughtN: 'اصطدت: {n}', newSp: 'نوع جديد في الألبوم!',
      rar: 'شائع|غير شائع|نادر|ملحمي|أسطوري',
      rod: 'صنارة خيزران|صنارة ألياف|صنارة كربون|صنارة المحترفين|الصنارة الذهبية',
      lure: 'دودة|طُعم دوّار|ذبابة ريش|طُعم مضيء|الطُّعم الذهبي',
      lake: 'بركة الزنابق|بحيرة الصنوبر|بحيرة المرجان|مضيق الجليد',
      fish: 'سمكة ذهبية|سمكة الشمس|سمك الفرخ|سمك البلطي|سمك السلور|سمكة كوي|كوي التنين|سمك التروتة|سمك الشبوط|سمك الأنقليس|سمك الكراكي|سمك السلمون|تروتة القمر|الحفش العتيق|سمكة المهرج|سمكة الملاك|سمكة الببغاء|السمكة المنتفخة|سمك أبو سيف|سمكة الفانوس|تنين البحر|سمك القد|سمك الرنجة|سمك الماكريل|سمك الهلبوت|سمكة الجليد|سلمون الشفق|ملك الصقيع',
    },
    es: {
      title: 'Pesca',
      help: ['Mantén pulsado (ratón o Espacio) para cargar y suelta para lanzar', 'Cuando el flotador se hunda, pulsa rápido para enganchar el pez', 'Mantén para recoger y suelta para aflojar: deja la aguja en el verde', 'Vende peces, compra cañas, señuelos y lagos nuevos, y llena tu álbum'],
      helpTouch: ['Mantén el dedo en la pantalla para cargar y levántalo para lanzar', 'Cuando el flotador se hunda, toca rápido para enganchar el pez', 'Mantén para recoger y suelta para aflojar: deja la aguja en el verde', 'Vende peces, compra cañas, señuelos y lagos nuevos, y llena tu álbum'],
      holdCast: 'Mantén para lanzar', release: '¡Suelta para lanzar!', waiting: 'Espera a que piquen…', bite: '¡Pican! ¡Ahora!', tooEarly: 'Demasiado pronto: el pez se asustó', missed: 'Muy lento: el pez se fue',
      snapped: '¡Se rompió el sedal!', escaped: '¡El pez se escapó!', reelHint: 'Mantén para recoger: deja la aguja en el verde', sell: 'Vender +{n}', newFish: '¡NUEVO!',
      shop: 'Tienda', album: 'Álbum', rods: 'Cañas', lures: 'Señuelos', lakes: 'Lagos', equip: 'Usar', equipped: 'En uso', travel: 'Viajar', here: 'Estás aquí', need: 'Faltan {n}', bought: '¡Compraste: {n}!',
      sDist: 'Alcance', sReel: 'Carrete', sHold: 'Fuerza', sLuck: 'Suerte', sBite: 'Picadas', mult: 'Precio del pescado ×{n}',
      dayOver: '¡Se acabó el día!', earned: 'Ganado hoy', daySum: 'Peces: {n} · Especies nuevas: {m}', dayN: 'Día {n}: ¡buenos días!', night: 'Cae la noche: ¡salen los peces nocturnos!', nightOnly: 'Solo de noche',
      lakeDone: '¡{n} completo! Bonus +{m}', cm: '{n} cm', bestLen: 'El mayor: {n} cm', caughtN: 'Pescados: {n}', newSp: '¡Especie nueva en el álbum!',
      rar: 'Común|Poco común|Raro|Épico|Legendario',
      rod: 'Caña de bambú|Caña de fibra|Caña de carbono|Caña profesional|Caña dorada',
      lure: 'Lombriz|Cucharilla|Mosca de plumas|Señuelo brillante|Señuelo dorado',
      lake: 'Estanque de nenúfares|Lago de los pinos|Laguna de coral|Fiordo glaciar',
      fish: 'Pez dorado|Pez sol|Perca|Tilapia|Bagre|Koi|Koi dragón|Trucha|Carpa|Anguila|Lucio|Salmón|Trucha lunar|Esturión ancestral|Pez payaso|Pez ángel|Pez loro|Pez globo|Pez espada|Pez linterna|Dragón marino|Bacalao|Arenque|Caballa|Fletán|Pez de hielo|Salmón aurora|Rey de la escarcha',
    },
    fr: {
      title: 'Pêche',
      help: ['Maintiens (souris ou Espace) pour charger, relâche pour lancer', 'Quand le flotteur plonge, clique vite pour ferrer le poisson', 'Maintiens pour mouliner, relâche pour donner du mou : garde l’aiguille dans le vert', 'Vends tes poissons, achète cannes, leurres et lacs, et remplis ton album'],
      helpTouch: ['Garde le doigt sur l’écran pour charger, lève-le pour lancer', 'Quand le flotteur plonge, touche vite pour ferrer le poisson', 'Maintiens pour mouliner, relâche pour donner du mou : garde l’aiguille dans le vert', 'Vends tes poissons, achète cannes, leurres et lacs, et remplis ton album'],
      holdCast: 'Maintiens pour lancer', release: 'Relâche pour lancer !', waiting: 'Attends une touche…', bite: 'Ça mord ! Vite !', tooEarly: 'Trop tôt : le poisson a eu peur', missed: 'Trop lent : le poisson est parti',
      snapped: 'Le fil a cassé !', escaped: 'Le poisson s’est échappé !', reelHint: 'Maintiens pour mouliner : garde l’aiguille dans le vert', sell: 'Vendre +{n}', newFish: 'NOUVEAU !',
      shop: 'Boutique', album: 'Album', rods: 'Cannes', lures: 'Leurres', lakes: 'Lacs', equip: 'Utiliser', equipped: 'Utilisé', travel: 'Y aller', here: 'Tu es ici', need: 'Il manque {n}', bought: 'Acheté : {n} !',
      sDist: 'Portée', sReel: 'Moulinet', sHold: 'Solidité', sLuck: 'Chance', sBite: 'Touches', mult: 'Prix du poisson ×{n}',
      dayOver: 'La journée est finie !', earned: 'Gagné aujourd’hui', daySum: 'Poissons : {n} · Nouvelles espèces : {m}', dayN: 'Jour {n} — bonjour !', night: 'La nuit tombe : les poissons de nuit sortent !', nightOnly: 'La nuit seulement',
      lakeDone: '{n} terminé ! Bonus +{m}', cm: '{n} cm', bestLen: 'Le plus grand : {n} cm', caughtN: 'Pêchés : {n}', newSp: 'Nouvelle espèce dans l’album !',
      rar: 'Commun|Peu commun|Rare|Épique|Légendaire',
      rod: 'Canne en bambou|Canne en fibre|Canne en carbone|Canne de pro|Canne dorée',
      lure: 'Ver|Cuillère tournante|Mouche à plumes|Leurre lumineux|Leurre doré',
      lake: 'Étang aux nénuphars|Lac des pins|Lagon de corail|Fjord glacé',
      fish: 'Poisson rouge|Perche-soleil|Perche|Tilapia|Poisson-chat|Koï|Koï dragon|Truite|Carpe|Anguille|Brochet|Saumon|Truite lunaire|Esturgeon ancestral|Poisson-clown|Poisson-ange|Poisson-perroquet|Poisson-globe|Espadon|Poisson-lanterne|Dragon des mers|Morue|Hareng|Maquereau|Flétan|Poisson des glaces|Saumon aurore|Roi du givre',
    },
    pt: {
      title: 'Pescaria',
      help: ['Segure (mouse ou Espaço) para carregar e solte para lançar', 'Quando a boia afundar, clique rápido para fisgar o peixe', 'Segure para enrolar e solte para afrouxar: mantenha o ponteiro no verde', 'Venda peixes, compre varas, iscas e lagos novos, e complete o álbum'],
      helpTouch: ['Segure o dedo na tela para carregar e solte para lançar', 'Quando a boia afundar, toque rápido para fisgar o peixe', 'Segure para enrolar e solte para afrouxar: mantenha o ponteiro no verde', 'Venda peixes, compre varas, iscas e lagos novos, e complete o álbum'],
      holdCast: 'Segure para lançar', release: 'Solte para lançar!', waiting: 'Espere o peixe morder…', bite: 'Mordeu! Agora!', tooEarly: 'Cedo demais: o peixe se assustou', missed: 'Devagar demais: o peixe fugiu',
      snapped: 'A linha arrebentou!', escaped: 'O peixe escapou!', reelHint: 'Segure para enrolar: mantenha o ponteiro no verde', sell: 'Vender +{n}', newFish: 'NOVO!',
      shop: 'Loja', album: 'Álbum', rods: 'Varas', lures: 'Iscas', lakes: 'Lagos', equip: 'Usar', equipped: 'Em uso', travel: 'Viajar', here: 'Você está aqui', need: 'Faltam {n}', bought: 'Comprou: {n}!',
      sDist: 'Alcance', sReel: 'Molinete', sHold: 'Força', sLuck: 'Sorte', sBite: 'Mordidas', mult: 'Preço do peixe ×{n}',
      dayOver: 'O dia acabou!', earned: 'Ganho hoje', daySum: 'Peixes: {n} · Espécies novas: {m}', dayN: 'Dia {n} — bom dia!', night: 'A noite caiu: os peixes noturnos saíram!', nightOnly: 'Só à noite',
      lakeDone: '{n} completo! Bônus +{m}', cm: '{n} cm', bestLen: 'O maior: {n} cm', caughtN: 'Pescados: {n}', newSp: 'Espécie nova no álbum!',
      rar: 'Comum|Incomum|Raro|Épico|Lendário',
      rod: 'Vara de bambu|Vara de fibra|Vara de carbono|Vara profissional|Vara dourada',
      lure: 'Minhoca|Colher giratória|Mosca de penas|Isca brilhante|Isca dourada',
      lake: 'Lago dos nenúfares|Lago dos pinheiros|Laguna de coral|Fiorde gelado',
      fish: 'Peixe-dourado|Peixe-sol|Perca|Tilápia|Bagre|Carpa koi|Koi-dragão|Truta|Carpa|Enguia|Lúcio|Salmão|Truta lunar|Esturjão ancestral|Peixe-palhaço|Peixe-anjo|Peixe-papagaio|Baiacu|Peixe-espada|Peixe-lanterna|Dragão-marinho|Bacalhau|Arenque|Cavala|Alabote|Peixe-do-gelo|Salmão aurora|Rei do gelo',
    },
    ru: {
      title: 'Рыбалка',
      help: ['Зажми (мышь или пробел), чтобы зарядить, отпусти — заброс', 'Когда поплавок нырнёт — быстро нажми, чтобы подсечь', 'Держи, чтобы подматывать, отпускай, чтобы ослабить: стрелка — в зелёном', 'Продавай рыбу, покупай удочки, приманки и новые озёра, собирай альбом'],
      helpTouch: ['Зажми экран, чтобы зарядить, отпусти палец — заброс', 'Когда поплавок нырнёт — быстро коснись, чтобы подсечь', 'Держи, чтобы подматывать, отпускай, чтобы ослабить: стрелка — в зелёном', 'Продавай рыбу, покупай удочки, приманки и новые озёра, собирай альбом'],
      holdCast: 'Зажми для заброса', release: 'Отпусти — заброс!', waiting: 'Жди поклёвку…', bite: 'Клюёт! Сейчас!', tooEarly: 'Рано — рыба испугалась', missed: 'Поздно — рыба уплыла',
      snapped: 'Леска порвалась!', escaped: 'Рыба сорвалась!', reelHint: 'Держи, чтобы подматывать: стрелка — в зелёном', sell: 'Продать +{n}', newFish: 'НОВАЯ!',
      shop: 'Магазин', album: 'Альбом', rods: 'Удочки', lures: 'Приманки', lakes: 'Озёра', equip: 'Взять', equipped: 'Выбрано', travel: 'Поехать', here: 'Ты здесь', need: 'Нужно ещё {n}', bought: 'Куплено: {n}!',
      sDist: 'Дальность', sReel: 'Катушка', sHold: 'Прочность', sLuck: 'Удача', sBite: 'Клёв', mult: 'Цена рыбы ×{n}',
      dayOver: 'День окончен!', earned: 'Заработано за день', daySum: 'Рыб: {n} · Новых видов: {m}', dayN: 'День {n} — доброе утро!', night: 'Наступила ночь — ночные рыбы вышли!', nightOnly: 'Только ночью',
      lakeDone: '{n}: все рыбы собраны! Бонус +{m}', cm: '{n} см', bestLen: 'Самая большая: {n} см', caughtN: 'Поймано: {n}', newSp: 'Новый вид в альбоме!',
      rar: 'Обычная|Необычная|Редкая|Эпическая|Легендарная',
      rod: 'Бамбуковая удочка|Фибергласовая удочка|Карбоновая удочка|Удочка профи|Золотая удочка',
      lure: 'Червяк|Блесна-вертушка|Перьевая мушка|Светящаяся приманка|Золотая приманка',
      lake: 'Пруд с кувшинками|Сосновое озеро|Коралловая лагуна|Ледяной фьорд',
      fish: 'Золотая рыбка|Солнечный окунь|Окунь|Тиляпия|Сом|Карп кои|Дракон-кои|Форель|Карп|Угорь|Щука|Лосось|Лунная форель|Древний осётр|Рыба-клоун|Рыба-ангел|Рыба-попугай|Рыба-фугу|Рыба-меч|Рыба-фонарь|Морской дракон|Треска|Сельдь|Скумбрия|Палтус|Ледяная рыба|Сияющий лосось|Король льда',
    },
    de: {
      title: 'Angeln',
      help: ['Halte gedrückt (Maus oder Leertaste) zum Aufladen, lass los zum Auswerfen', 'Taucht der Schwimmer ab, klick schnell, um den Fisch zu haken', 'Halten zum Einholen, loslassen zum Nachgeben: Zeiger im Grünen halten', 'Verkaufe Fische, kaufe Ruten, Köder und neue Seen und fülle dein Album'],
      helpTouch: ['Halte den Finger auf dem Bildschirm zum Aufladen, lass los zum Auswerfen', 'Taucht der Schwimmer ab, tippe schnell, um den Fisch zu haken', 'Halten zum Einholen, loslassen zum Nachgeben: Zeiger im Grünen halten', 'Verkaufe Fische, kaufe Ruten, Köder und neue Seen und fülle dein Album'],
      holdCast: 'Halten zum Auswerfen', release: 'Loslassen zum Auswerfen!', waiting: 'Warte auf einen Biss…', bite: 'Biss! Jetzt!', tooEarly: 'Zu früh – der Fisch ist erschrocken', missed: 'Zu langsam – der Fisch ist weg',
      snapped: 'Die Schnur ist gerissen!', escaped: 'Der Fisch ist entkommen!', reelHint: 'Halten zum Einholen – Zeiger im Grünen halten', sell: 'Verkaufen +{n}', newFish: 'NEU!',
      shop: 'Laden', album: 'Album', rods: 'Ruten', lures: 'Köder', lakes: 'Seen', equip: 'Nutzen', equipped: 'Aktiv', travel: 'Hinfahren', here: 'Du bist hier', need: 'Es fehlen {n}', bought: 'Gekauft: {n}!',
      sDist: 'Weite', sReel: 'Rolle', sHold: 'Stärke', sLuck: 'Glück', sBite: 'Bisse', mult: 'Fischpreis ×{n}',
      dayOver: 'Der Tag ist vorbei!', earned: 'Heute verdient', daySum: 'Fische: {n} · Neue Arten: {m}', dayN: 'Tag {n} – guten Morgen!', night: 'Die Nacht bricht an – die Nachtfische kommen!', nightOnly: 'Nur nachts',
      lakeDone: '{n} komplett! Bonus +{m}', cm: '{n} cm', bestLen: 'Größter: {n} cm', caughtN: 'Gefangen: {n}', newSp: 'Neue Art im Album!',
      rar: 'Häufig|Ungewöhnlich|Selten|Episch|Legendär',
      rod: 'Bambusrute|Glasfaserrute|Karbonrute|Profirute|Goldrute',
      lure: 'Wurm|Spinner|Federfliege|Leuchtköder|Goldköder',
      lake: 'Seerosenteich|Kiefernsee|Korallenlagune|Gletscherfjord',
      fish: 'Goldfisch|Sonnenbarsch|Barsch|Tilapia|Wels|Koi|Drachenkoi|Forelle|Karpfen|Aal|Hecht|Lachs|Mondforelle|Urzeit-Stör|Clownfisch|Kaiserfisch|Papageifisch|Kugelfisch|Schwertfisch|Laternenfisch|Seedrache|Kabeljau|Hering|Makrele|Heilbutt|Eisfisch|Polarlicht-Lachs|Frostkönig',
    },
  };
  const LISTS = {};
  const list = (g, k, i) => { const key = g.lang + k; if (!LISTS[key]) LISTS[key] = String(g.t(k)).split('|'); return LISTS[key][i] || ''; };

  // ---------- drawing: colours, fish ----------
  const seeded = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hexA = (h, a) => css(rgb(h), a);
  SP.forEach(s => { s.dk = mixC(s.c[0], '#000000', 0.22); s.edge = mixC(s.c[0], '#000000', 0.45); });
  const SPOTS = SP.map((s, i) => { const R = seeded(77 + i * 13), a = []; for (let k = 0; k < 11; k++) a.push([R() * 0.72 - 0.32, R() * 1.3 - 0.65, 0.035 + R() * 0.045]); return a; });
  const STARS = (() => { const R = seeded(4242), a = []; for (let i = 0; i < 90; i++) a.push({ x: R(), y: Math.pow(R(), 1.3) * 0.9, r: 0.6 + R() * 1.3, p: R() * 6 }); return a; })();

  function bodyPath(ctx, sh, L, h) {
    ctx.beginPath();
    if (sh === 'round' || sh === 'tall') { ctx.ellipse(L * 0.03, 0, L * 0.4, h, 0, 0, Math.PI * 2); return; }
    const n = L * 0.5, tl = -L * 0.38;
    ctx.moveTo(n, h * 0.08);
    ctx.bezierCurveTo(n * 0.92, -h * 1.12, -L * 0.06, -h * 1.15, tl, -h * 0.3);
    ctx.lineTo(tl, h * 0.3);
    ctx.bezierCurveTo(-L * 0.06, h * 1.1, n * 0.92, h * 1.08, n, h * 0.08);
    ctx.closePath();
  }
  function drawFish(ctx, s, x, y, len, dir, t, o) {
    o = o || {};
    const sh = s.sh, long = sh === 'sword' || sh === 'sturgeon' || sh === 'dragon';
    const L = long ? len * 0.74 : len, h = L * (long ? s.hr * 1.15 : s.hr) / 2, sil = o.sil;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(dir, 1);
    if (long) ctx.translate(-len * 0.12, 0);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const wig = Math.sin(t * (o.fast ? 22 : 7)) * (o.fast ? 0.32 : 0.16);
    if (o.glow && s.glow && !sil) {
      const r = len * 0.8, gr = ctx.createRadialGradient(0, 0, len * 0.08, 0, 0, r);
      gr.addColorStop(0, hexA(s.glow, 0.42 + 0.14 * Math.sin(t * 3))); gr.addColorStop(1, hexA(s.glow, 0));
      ctx.fillStyle = gr; ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    const fin = sil || s.c[2];
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (sh === 'eel') {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16, px = L * 0.5 - u * L; pts.push([px, Math.sin(u * 7 - t * 6) * h * 1.6 * u]); }
      const line = w => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineWidth = w; ctx.stroke(); };
      ctx.strokeStyle = sil || s.edge; line(h * 2.3);
      ctx.strokeStyle = sil || s.c[0]; line(h * 1.9);
      if (!sil) { ctx.strokeStyle = hexA(s.c[1], 0.7); ctx.save(); ctx.translate(0, h * 0.45); line(h * 0.6); ctx.restore(); }
      if (!sil) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L * 0.43, -h * 0.25, Math.max(1.4, h * 0.35), 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.44, -h * 0.25, Math.max(0.8, h * 0.2), 0, 7); ctx.fill(); }
      ctx.restore(); return;
    }
    const tx = sh === 'round' || sh === 'tall' ? -L * 0.35 : -L * 0.36;
    // tail
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(tx + L * 0.05, 0);
    ctx.lineTo(tx - L * 0.19, -h * (sh === 'sword' ? 1.6 : 0.95) + wig * L * 0.25);
    ctx.quadraticCurveTo(tx - L * 0.1, wig * L * 0.12, tx - L * 0.19, h * (sh === 'sword' ? 1.6 : 0.95) + wig * L * 0.25);
    ctx.closePath(); ctx.fill();
    // fins on top and below
    ctx.beginPath();
    if (sh === 'tall') {
      ctx.moveTo(L * 0.1, -h * 0.8); ctx.quadraticCurveTo(-L * 0.05, -h * 2.1, -L * 0.42, -h * 1.75); ctx.lineTo(-L * 0.25, -h * 0.5);
      ctx.moveTo(L * 0.1, h * 0.8); ctx.quadraticCurveTo(-L * 0.05, h * 2.1, -L * 0.42, h * 1.75); ctx.lineTo(-L * 0.25, h * 0.5);
    } else if (sh === 'crown') {
      ctx.moveTo(L * 0.22, -h * 0.85);
      for (let i = 0; i <= 5; i++) { const u = i / 5; ctx.lineTo(L * (0.2 - u * 0.42), -h * (1.75 + Math.sin(i * 1.7) * 0.2) - (i % 2 ? 0 : h * 0.35)); ctx.lineTo(L * (0.16 - u * 0.42), -h * 0.9); }
    } else if (sh === 'flat') {
      ctx.moveTo(L * 0.35, -h * 0.75); ctx.quadraticCurveTo(0, -h * 1.45, -L * 0.36, -h * 0.4); ctx.lineTo(-L * 0.3, -h * 0.2);
      ctx.moveTo(L * 0.2, h * 0.8); ctx.quadraticCurveTo(-L * 0.05, h * 1.4, -L * 0.36, h * 0.4); ctx.lineTo(-L * 0.3, h * 0.2);
    } else {
      ctx.moveTo(L * 0.14, -h * 0.85); ctx.quadraticCurveTo(-L * 0.02, -h * 1.7, -L * 0.2, -h * 0.75);
      ctx.moveTo(-L * 0.05, h * 0.85); ctx.quadraticCurveTo(-L * 0.16, h * 1.45, -L * 0.26, h * 0.6);
    }
    ctx.fill();
    if (sh === 'dragon' && !sil) {
      ctx.fillStyle = s.c[2];
      for (let i = 0; i < 6; i++) { const px = L * (0.3 - i * 0.13), up = i % 2 ? -1 : 1; ctx.beginPath(); ctx.ellipse(px, up * h * 1.45, L * 0.07, h * 0.55, up * (0.6 + Math.sin(t * 2 + i) * 0.25), 0, 7); ctx.fill(); }
    }
    // snouts
    if (sh === 'sword') { ctx.fillStyle = sil || s.dk; ctx.beginPath(); ctx.moveTo(L * 0.46, -h * 0.22); ctx.lineTo(L * 0.5 + len * 0.36, -h * 0.05); ctx.lineTo(L * 0.46, h * 0.12); ctx.fill(); }
    if (sh === 'sturgeon' || sh === 'dragon') { ctx.fillStyle = sil || s.c[0]; ctx.beginPath(); ctx.moveTo(L * 0.42, -h * 0.5); ctx.quadraticCurveTo(L * 0.5 + len * 0.22, -h * 0.35, L * 0.5 + len * 0.26, 0); ctx.quadraticCurveTo(L * 0.5 + len * 0.1, h * 0.35, L * 0.42, h * 0.55); ctx.fill(); }
    // body
    bodyPath(ctx, sh, L, h);
    if (sil) { ctx.fillStyle = sil; ctx.fill(); ctx.restore(); return; }
    const gr = ctx.createLinearGradient(0, -h, 0, h);
    gr.addColorStop(0, s.dk); gr.addColorStop(0.42, s.c[0]); gr.addColorStop(1, s.c[1]);
    ctx.fillStyle = gr; ctx.fill();
    ctx.save(); ctx.clip();
    const pc = s.pc;
    if (s.ex === 'stripe') { ctx.fillStyle = hexA(s.sc, 0.75); ctx.fillRect(-L * 0.4, -h * 0.12, L * 0.9, h * 0.3); }
    if (s.pat === 'bands') { ctx.fillStyle = pc; for (const u of [0.24, 0.08, -0.08, -0.24]) ctx.fillRect(L * u - L * 0.035, -h * 1.2, L * 0.07, h * 2.4); }
    else if (s.pat === 'clown') {
      for (const u of [0.27, 0.02, -0.27]) { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(L * u - L * 0.07, -h * 1.2, L * 0.14, h * 2.4); ctx.fillStyle = pc; ctx.fillRect(L * u - L * 0.05, -h * 1.2, L * 0.1, h * 2.4); }
    } else if (s.pat === 'spots') { ctx.fillStyle = pc; for (const p of SPOTS[s.i]) { ctx.beginPath(); ctx.arc(L * p[0], h * p[1], L * p[2], 0, 7); ctx.fill(); } }
    else if (s.pat === 'koi') { ctx.fillStyle = pc; for (const p of [[0.25, -0.35, 0.16], [0.0, 0.1, 0.13], [-0.22, -0.3, 0.11]]) { ctx.beginPath(); ctx.ellipse(L * p[0], h * p[1], L * p[2], h * 0.75, 0.3, 0, 7); ctx.fill(); } }
    else if (s.pat === 'scales') { ctx.strokeStyle = pc; ctx.lineWidth = Math.max(0.8, L * 0.008); const st = L * 0.075; for (let yy = -h * 0.7, r = 0; yy <= h * 0.7; yy += h * 0.32, r++) for (let xx = -L * 0.3 + (r % 2) * st / 2; xx < L * 0.36; xx += st) { ctx.beginPath(); ctx.arc(xx, yy, st * 0.5, -1.2, 1.2); ctx.stroke(); } }
    else if (s.pat === 'tiger') { ctx.strokeStyle = pc; ctx.lineWidth = L * 0.025; for (let i = 0; i < 7; i++) { const xx = L * (0.25 - i * 0.09); ctx.beginPath(); ctx.moveTo(xx, -h * 1.1); ctx.quadraticCurveTo(xx + L * 0.05, -h * 0.4, xx - L * 0.02, 0); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(L * 0.05, -h * 0.5, L * 0.3, h * 0.18, -0.05, 0, 7); ctx.fill();
    if (s.ex === 'ice') { ctx.fillStyle = 'rgba(160,220,255,.25)'; ctx.fillRect(-L, -h * 2, L * 2, h * 4); }
    ctx.restore();
    bodyPath(ctx, sh, L, h);
    ctx.strokeStyle = s.edge; ctx.lineWidth = Math.max(0.8, L * 0.014); ctx.stroke();
    if (sh === 'sturgeon') { ctx.fillStyle = s.c[1]; for (let i = 0; i < 7; i++) { const px = L * (0.3 - i * 0.1); ctx.beginPath(); ctx.moveTo(px - L * 0.03, -h * 0.82); ctx.lineTo(px, -h * 1.12); ctx.lineTo(px + L * 0.03, -h * 0.82); ctx.fill(); } }
    if (s.ex === 'spikes') { ctx.strokeStyle = s.dk; ctx.lineWidth = Math.max(1, L * 0.02); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(L * 0.03 + Math.cos(a) * L * 0.38, Math.sin(a) * h * 0.95); ctx.lineTo(L * 0.03 + Math.cos(a) * L * 0.47, Math.sin(a) * h * 1.18); ctx.stroke(); } }
    if (s.ex === 'ear') { ctx.fillStyle = '#1d2a22'; ctx.beginPath(); ctx.ellipse(L * 0.2, -h * 0.12, L * 0.05, h * 0.16, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(L * 0.17, -h * 0.02, L * 0.02, 0, 7); ctx.fill(); }
    if (s.ex === 'lights') { for (let i = 0; i < 7; i++) { ctx.fillStyle = hexA('#7ff8ff', 0.6 + 0.4 * Math.sin(t * 4 + i)); ctx.beginPath(); ctx.arc(L * (0.3 - i * 0.1), h * 0.55, Math.max(1, L * 0.025), 0, 7); ctx.fill(); } }
    // side fin, gills, eye, mouth, whiskers
    ctx.fillStyle = hexA(fin, 0.85); ctx.beginPath(); ctx.ellipse(L * 0.18, h * 0.3, L * 0.09, h * 0.22, 0.6 + wig, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = Math.max(0.8, L * 0.012);
    ctx.beginPath(); ctx.arc(L * 0.3, 0, h * 0.75, -1.1, 1.1); ctx.stroke();
    const ex = sh === 'round' || sh === 'tall' ? L * 0.3 : L * 0.37, ey = sh === 'flat' ? -h * 0.55 : -h * 0.22, er = Math.max(1.6, Math.min(h * 0.24, L * 0.055));
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
    ctx.fillStyle = '#121418'; ctx.beginPath(); ctx.arc(ex + er * 0.2, ey, er * 0.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + er * 0.35, ey - er * 0.3, er * 0.22, 0, 7); ctx.fill();
    if (sh === 'flat') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - er * 2.4, ey - er * 0.6, er * 0.9, 0, 7); ctx.fill(); ctx.fillStyle = '#121418'; ctx.beginPath(); ctx.arc(ex - er * 2.2, ey - er * 0.6, er * 0.5, 0, 7); ctx.fill(); }
    if (s.ex && s.ex.startsWith('whisk')) {
      ctx.strokeStyle = s.dk; ctx.lineWidth = Math.max(0.8, L * 0.012);
      const wl = s.ex === 'whisk' ? 0.32 : 0.12, mx = L * 0.47 + (long ? len * 0.1 : 0);
      for (const sy of s.ex === 'whisk1' ? [1] : [-1, 1]) { ctx.beginPath(); ctx.moveTo(mx, h * 0.15); ctx.quadraticCurveTo(mx + L * wl * 0.4, h * (0.5 + sy * 0.3), mx - L * wl * 0.2 + Math.sin(t * 2 + sy) * L * 0.02, h * (0.7 + sy * 0.35) + L * wl * 0.4); ctx.stroke(); }
    }
    ctx.restore();
  }

  // ---------- the sky, the far shore, the water ----------
  function sunPos(L, h) { const x = hour24(h); if (x < 5.6 || x > 19.9) return null; const u = (x - 5.6) / 14.3; return { x: L.W * (0.06 + 0.88 * u), y: L.hor + 10 - Math.sin(Math.PI * u) * (L.hor - 40) }; }
  function moonPos(L, h) { const x = hour24(h); if (x < 19.2 && x > 6.4) return null; const u = ((x - 19.2 + 24) % 24) / 11.2; return { x: L.W * (0.08 + 0.84 * u), y: L.hor + 10 - Math.sin(Math.PI * u) * (L.hor - 56) }; }
  function drawSky(g, ctx, S, T, t) {
    const L = S.L, W = L.W, sg = ctx.createLinearGradient(0, 0, 0, L.hor);
    sg.addColorStop(0, css(T.top)); sg.addColorStop(0.55, css(T.mid)); sg.addColorStop(1, css(T.bot));
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, L.hor + 2);
    if (T.night > 0.02) for (const st of STARS) { ctx.globalAlpha = T.night * (0.55 + 0.45 * Math.sin(t * 2 + st.p)); ctx.fillStyle = '#fff'; ctx.fillRect(st.x * W, st.y * L.hor * 0.9, st.r, st.r); }
    ctx.globalAlpha = 1;
    if (S.lake === 3 && T.night > 0.1) {     // aurora over the fjord
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        const base = L.hor * (0.18 + b * 0.12), col = b === 1 ? [190, 110, 255] : [80, 255, 170];
        const gr = ctx.createLinearGradient(0, base - 60, 0, base + 70);
        gr.addColorStop(0, css(col, 0)); gr.addColorStop(0.6, css(col, 0.22 * T.night)); gr.addColorStop(1, css(col, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, base + 70);
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - 40 + Math.sin(x * 0.008 + t * 0.35 + b * 2) * 28 + Math.sin(x * 0.021 - t * 0.5) * 10);
        ctx.lineTo(W, base + 70); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const sp = sunPos(L, T.h), mp = moonPos(L, T.h);
    if (sp) {
      const low = clamp(1 - (L.hor - sp.y) / (L.hor * 0.55), 0, 1), r = 26 + low * 6;
      const gr = ctx.createRadialGradient(sp.x, sp.y, r * 0.5, sp.x, sp.y, r * 3.4);
      gr.addColorStop(0, css(mixA([255, 245, 200], [255, 170, 90], low), 0.55)); gr.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(sp.x - r * 3.4, sp.y - r * 3.4, r * 6.8, r * 6.8);
      g.circle(ctx, sp.x, sp.y, r); ctx.fillStyle = css(mixA([255, 249, 214], [255, 176, 92], low)); ctx.fill();
    }
    if (mp) {
      const gr = ctx.createRadialGradient(mp.x, mp.y, 10, mp.x, mp.y, 70);
      gr.addColorStop(0, 'rgba(220,230,255,.3)'); gr.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(mp.x - 70, mp.y - 70, 140, 140);
      g.circle(ctx, mp.x, mp.y, 18); ctx.fillStyle = '#eef1ff'; ctx.fill();
      ctx.fillStyle = 'rgba(160,170,200,.45)';
      for (const c of [[-6, -4, 4], [5, 3, 3], [-2, 7, 2.5]]) { g.circle(ctx, mp.x + c[0], mp.y + c[1], c[2]); ctx.fill(); }
    }
    const cc = css(mixA(mixA([255, 255, 255], [255, 196, 170], T.warm), [70, 80, 120], T.dark * 0.9), 0.85);
    for (const c of S.clouds) {
      ctx.fillStyle = cc;
      for (const b of [[0, 0, 1], [0.8, 0.2, 0.75], [-0.8, 0.25, 0.7], [0.3, -0.45, 0.8]]) { g.circle(ctx, c.x + b[0] * 30 * c.s, c.y + b[1] * 30 * c.s, 26 * c.s * b[2]); ctx.fill(); }
    }
    if (T.dark < 0.3) {
      ctx.strokeStyle = 'rgba(40,40,60,.7)'; ctx.lineWidth = 2;
      for (const b of S.birds) { const f = Math.sin(t * 9 + b.p) * 5; ctx.beginPath(); ctx.moveTo(b.x - 9, b.y - f); ctx.quadraticCurveTo(b.x - 3, b.y - 2, b.x, b.y + 1); ctx.quadraticCurveTo(b.x + 3, b.y - 2, b.x + 9, b.y - f); ctx.stroke(); }
    }
  }
  function hills(ctx, W, y0, amp, fr, ph) {
    ctx.beginPath(); ctx.moveTo(0, y0 + 2);
    for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, y0 - amp * (0.6 + 0.4 * Math.sin(x * fr + ph) * Math.cos(x * fr * 0.37 + ph * 2)));
    ctx.lineTo(W, y0 + 2); ctx.closePath(); ctx.fill();
  }
  function drawScenery(g, ctx, S, tc, t) {
    const L = S.L, W = L.W, y0 = L.hor, k = L.P ? 1.3 : 1;
    if (S.lake === 0) {
      ctx.fillStyle = tc('#a6cdb0'); hills(ctx, W, y0, 52 * k, 0.006, 1.3);
      ctx.fillStyle = tc('#76b86c'); hills(ctx, W, y0, 26 * k, 0.012, 2.4);
      for (const [fx, sz] of [[0.3, 1], [0.36, 0.75], [0.55, 1.15], [0.62, 0.8], [0.88, 1], [0.93, 0.7]]) {
        const x = fx * W, y = y0 - 14 * k;
        ctx.fillStyle = tc('#6a4a2e'); ctx.fillRect(x - 2.5, y - 4, 5, 16);
        ctx.fillStyle = tc('#3f8f4c'); g.circle(ctx, x, y - 14 * sz, 15 * sz * k); ctx.fill(); g.circle(ctx, x - 9 * sz, y - 6 * sz, 11 * sz * k); ctx.fill(); g.circle(ctx, x + 9 * sz, y - 6 * sz, 11 * sz * k); ctx.fill();
      }
      const hx = W * 0.74, hy = y0 - 12;
      ctx.fillStyle = tc('#f3e7cf'); ctx.fillRect(hx - 18, hy - 18, 36, 22);
      ctx.fillStyle = tc('#c4473a'); ctx.beginPath(); ctx.moveTo(hx - 23, hy - 17); ctx.lineTo(hx, hy - 34); ctx.lineTo(hx + 23, hy - 17); ctx.fill();
      ctx.fillStyle = S.T.night > 0.3 ? 'rgba(255,214,120,.95)' : tc('#6a8fb0'); ctx.fillRect(hx - 6, hy - 10, 9, 8);
    } else if (S.lake === 1) {
      for (const [layer, col, snow] of [[0, '#8496b4', '#eef3fb'], [1, '#5d7393', '#dfe8f5']]) {
        ctx.fillStyle = tc(col);
        ctx.beginPath(); ctx.moveTo(0, y0);
        const pk = layer ? [[0, 40], [0.12, 110], [0.27, 60], [0.45, 130], [0.62, 70], [0.78, 120], [1, 50]] : [[0, 90], [0.18, 150], [0.36, 95], [0.55, 165], [0.72, 105], [0.88, 150], [1, 110]];
        for (const p of pk) ctx.lineTo(p[0] * W, y0 - p[1] * k * (layer ? 0.75 : 0.9));
        ctx.lineTo(W, y0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = tc(snow);
        for (let i = 1; i < pk.length - 1; i++) {
          const x = pk[i][0] * W, y = y0 - pk[i][1] * k * (layer ? 0.75 : 0.9), d = 18 * k;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d, y + d * 0.9); ctx.lineTo(x - d * 0.3, y + d * 0.65); ctx.lineTo(x + d * 0.2, y + d); ctx.lineTo(x + d, y + d * 0.85); ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = tc('#2e5c4a');
      for (let i = 0; i < 46; i++) { const x = (i / 45) * W + ((i * 37) % 11) - 5, hh = (16 + ((i * 53) % 17)) * k; ctx.beginPath(); ctx.moveTo(x, y0 - hh); ctx.lineTo(x - hh * 0.32, y0 + 1); ctx.lineTo(x + hh * 0.32, y0 + 1); ctx.fill(); }
    } else if (S.lake === 2) {
      ctx.fillStyle = tc('#5fae7a'); ctx.beginPath(); ctx.ellipse(W * 0.72, y0, W * 0.16, 46 * k, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = tc('#4a9a68'); ctx.beginPath(); ctx.ellipse(W * 0.8, y0, W * 0.1, 30 * k, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = tc('#f2e2b2'); ctx.beginPath(); ctx.ellipse(W * 0.3, y0 + 2, W * 0.24, 12 * k, 0, Math.PI, 0); ctx.fill();
      for (const [fx, hh, lean] of [[0.2, 62, -0.25], [0.27, 50, 0.2], [0.38, 70, 0.3], [0.62, 44, -0.2]]) {
        const x = fx * W, top = { x: x + lean * 40, y: y0 - hh * k };
        ctx.strokeStyle = tc('#8a6a44'); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.quadraticCurveTo(x + lean * 10, y0 - hh * 0.5 * k, top.x, top.y); ctx.stroke();
        ctx.fillStyle = tc('#2f9a58');
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t * 1.3 + i + fx * 9) * 0.06; ctx.beginPath(); ctx.ellipse(top.x + Math.cos(a) * 16, top.y + Math.sin(a) * 8 + 6, 19, 5, a, 0, 7); ctx.fill(); }
      }
    } else {
      ctx.fillStyle = tc('#a9bcd2'); ctx.beginPath(); ctx.moveTo(0, y0);
      for (const p of [[0, 70], [0.2, 120], [0.33, 80], [0.5, 140], [0.66, 90], [0.82, 130], [1, 80]]) ctx.lineTo(p[0] * W, y0 - p[1] * k);
      ctx.lineTo(W, y0); ctx.fill();
      ctx.fillStyle = tc('#4f6178'); ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(0, y0 - 175 * k); ctx.lineTo(W * 0.1, y0 - 150 * k); ctx.lineTo(W * 0.2, y0 - 60 * k); ctx.lineTo(W * 0.27, y0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, y0); ctx.lineTo(W, y0 - 190 * k); ctx.lineTo(W * 0.9, y0 - 165 * k); ctx.lineTo(W * 0.8, y0 - 80 * k); ctx.lineTo(W * 0.72, y0); ctx.fill();
      ctx.fillStyle = tc('#eef4fb');
      ctx.beginPath(); ctx.moveTo(0, y0 - 175 * k); ctx.lineTo(W * 0.1, y0 - 150 * k); ctx.lineTo(W * 0.12, y0 - 128 * k); ctx.lineTo(W * 0.05, y0 - 140 * k); ctx.lineTo(0, y0 - 130 * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, y0 - 190 * k); ctx.lineTo(W * 0.9, y0 - 165 * k); ctx.lineTo(W * 0.88, y0 - 140 * k); ctx.lineTo(W * 0.95, y0 - 150 * k); ctx.lineTo(W, y0 - 140 * k); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(235,245,255,' + (0.35 + 0.25 * Math.sin(t * 5 + i)) + ')'; ctx.fillRect(W * 0.835 + i * 2.4, y0 - 120 * k + ((t * 90 + i * 23) % 30), 2, 40 * k); }
    }
  }

  // ---------- decorations of each lake (fixed per lake and layout) ----------
  function makeDeco(L, lake) {
    const R = seeded(900 + lake * 31 + (L.P ? 7 : 0)), D = { weeds: [], stones: [], props: [], pads: [] };
    const nw = L.P ? 11 : 15;
    for (let i = 0; i < nw; i++) { const x = L.dockX + 10 + R() * (L.W - L.dockX - 20); D.weeds.push({ x, h: 40 + R() * (L.P ? 150 : 110), w: 4 + R() * 4, p: R() * 6, c: lake === 2 ? '#3fa86a' : lake === 3 ? '#5f8f88' : '#3f8a4a' }); }
    for (let i = 0; i < 26; i++) { const x = R() * L.W; D.stones.push({ x, y: L.bedY(x) + 6 + R() * 26, r: 3 + R() * 7, c: R() < 0.5 ? '#8f8a7a' : '#6f6a60' }); }
    const np = lake === 2 ? 7 : 4;
    for (let i = 0; i < np; i++) { const x = L.dockX + 40 + R() * (L.W - L.dockX - 80); D.props.push({ x, s: 0.7 + R() * 0.6, k: Math.floor(R() * 3), c: ['#ff6f91', '#ffb347', '#b47cff', '#ff8a5c'][Math.floor(R() * 4)] }); }
    for (let i = 0; i < 6; i++) D.pads.push({ x: L.dockX + 60 + R() * (L.W - L.dockX - 120), y: R(), s: 0.7 + R() * 0.6, f: R() < 0.35 });
    return D;
  }
  function drawBand(g, ctx, S, T, tc, t) {
    const L = S.L, W = L.W, lk = LAKE[S.lake], y0 = L.hor, y1 = L.sea + 4;
    const bg = ctx.createLinearGradient(0, y0, 0, y1);
    bg.addColorStop(0, css(mixA(T.bot, rgb(lk.band), 0.35)));
    bg.addColorStop(1, tc(lk.top));
    ctx.fillStyle = bg; ctx.fillRect(0, y0, W, y1 - y0);
    // the far shore mirrored in the water: a soft dark strip
    ctx.fillStyle = 'rgba(0,30,40,.12)'; ctx.fillRect(0, y0, W, (y1 - y0) * 0.3);
    const sp = sunPos(L, T.h) || moonPos(L, T.h);
    if (sp) {
      const isSun = !!sunPos(L, T.h);
      for (let i = 0; i < 9; i++) {
        const yy = y0 + 3 + i * (y1 - y0 - 6) / 9, w = 8 + i * 4 + Math.sin(t * 3 + i * 2) * 4;
        ctx.fillStyle = isSun ? 'rgba(255,236,190,' + (0.5 - i * 0.03) + ')' : 'rgba(220,230,255,' + (0.4 - i * 0.03) + ')';
        ctx.fillRect(sp.x - w / 2 + Math.sin(t * 2 + i) * 3, yy, w, 2);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.16 * (1 - T.dark)) + ')';
    for (let i = 0; i < 16; i++) { const u = i / 16, yy = y0 + 4 + Math.pow(u, 1.2) * (y1 - y0 - 8), xx = ((i * 173 + t * (12 + i)) % (W + 80)) - 40; ctx.fillRect(xx, yy, 14 + u * 26, 1.5); }
    if (S.lake === 0) for (const p of S.deco.pads) {
      const x = p.x, y = y0 + 6 + p.y * (y1 - y0 - 14), s = p.s * (0.6 + 0.6 * p.y);
      ctx.fillStyle = tc('#4f9a46'); ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 5 * s, 0, 0.25, Math.PI * 2 - 0.1); ctx.lineTo(x, y); ctx.fill();
      if (p.f) { ctx.fillStyle = tc('#ff9ec4'); g.circle(ctx, x + 3 * s, y - 2 * s, 3.5 * s); ctx.fill(); ctx.fillStyle = tc('#ffe27a'); g.circle(ctx, x + 3 * s, y - 2 * s, 1.4 * s); ctx.fill(); }
    }
    if (S.lake === 3) for (const p of S.deco.pads.slice(0, 3)) {
      const x = p.x, y = y0 + 8 + p.y * (y1 - y0 - 18), s = p.s * (0.7 + 0.5 * p.y) * (L.P ? 1.2 : 1);
      ctx.fillStyle = tc('#e8f4ff'); ctx.beginPath(); ctx.moveTo(x - 22 * s, y); ctx.lineTo(x - 12 * s, y - 14 * s); ctx.lineTo(x + 2 * s, y - 20 * s); ctx.lineTo(x + 18 * s, y - 8 * s); ctx.lineTo(x + 24 * s, y); ctx.fill();
      ctx.fillStyle = tc('#a9cfe8'); ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 20 * s); ctx.lineTo(x + 18 * s, y - 8 * s); ctx.lineTo(x + 24 * s, y); ctx.lineTo(x + 4 * s, y); ctx.fill();
    }
  }
  function drawUnder(g, ctx, S, T, tc, t) {
    const L = S.L, W = L.W, H = L.H, lk = LAKE[S.lake], y0 = L.sea;
    const wg = ctx.createLinearGradient(0, y0, 0, H);
    wg.addColorStop(0, tc(lk.top)); wg.addColorStop(1, tc(lk.deep));
    ctx.fillStyle = wg; ctx.fillRect(0, y0, W, H - y0);
    if (T.dark < 0.5) {   // sun rays
      ctx.save(); ctx.globalAlpha = 0.09 * (1 - T.dark * 2);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) { const x = W * (0.2 + i * 0.19) + Math.sin(t * 0.4 + i) * 30; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 34, y0); ctx.lineTo(x - 90 + 34, H); ctx.lineTo(x - 150, H); ctx.fill(); }
      ctx.restore();
    }
    // lake bed
    ctx.fillStyle = tc(lk.sand);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, L.bedY(x));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const s of S.deco.stones) { ctx.fillStyle = tc(s.c); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.4, s.r, 0, 0, 7); ctx.fill(); }
    for (const p of S.deco.props) {
      const x = p.x, y = L.bedY(x) + 4, s = p.s * (L.P ? 1.2 : 1);
      if (S.lake === 2) {
        ctx.fillStyle = tc(p.c);
        if (p.k === 0) { for (let i = -2; i <= 2; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate(i * 0.32 + Math.sin(t + x) * 0.04); g.rr(ctx, -3 * s, -44 * s, 6 * s, 44 * s, 3 * s); ctx.fill(); g.circle(ctx, 0, -44 * s, 5 * s); ctx.fill(); ctx.restore(); } }
        else if (p.k === 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 30 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = Math.PI * (1.1 + i * 0.16); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 28 * s, y + Math.sin(a) * 28 * s); ctx.stroke(); } }
        else { ctx.fillStyle = tc('#ffb347'); ctx.save(); ctx.translate(x, y - 6 * s); ctx.rotate(t * 0.1); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 4 * s : 11 * s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
      } else {
        ctx.fillStyle = tc(S.lake === 3 ? '#9fc4dc' : '#7d7f84');
        if (S.lake === 3 && p.k === 0) { ctx.beginPath(); ctx.moveTo(x - 10 * s, y); ctx.lineTo(x - 3 * s, y - 34 * s); ctx.lineTo(x + 4 * s, y); ctx.lineTo(x + 8 * s, y - 22 * s); ctx.lineTo(x + 14 * s, y); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(x, y, 24 * s, 14 * s, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x - 6 * s, y - 8 * s, 10 * s, 4 * s, -0.2, 0, 7); ctx.fill(); }
      }
    }
    ctx.lineCap = 'round';
    for (const w of S.deco.weeds) {
      const by = L.bedY(w.x) + 6, sw = Math.sin(t * 1.1 + w.p) * 10;
      ctx.strokeStyle = tc(w.c); ctx.lineWidth = w.w;
      ctx.beginPath(); ctx.moveTo(w.x, by); ctx.quadraticCurveTo(w.x + sw * 0.6, by - w.h * 0.5, w.x + sw, by - w.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w.x + 6, by); ctx.quadraticCurveTo(w.x + 6 - sw * 0.4, by - w.h * 0.35, w.x + 4 - sw * 0.7, by - w.h * 0.7); ctx.stroke();
    }
    // the dock posts
    ctx.fillStyle = tc('#5a3d24');
    for (const px of [26, L.dockX - 22]) { ctx.fillRect(px - 7, L.dockY + 16, 14, L.bedY(px) + 12 - L.dockY - 16); }
    ctx.fillStyle = tc('#3d6a3a');
    for (const px of [26, L.dockX - 22]) ctx.fillRect(px - 7, L.sea - 2, 14, 10);
  }
  // the water tint over everything under the surface (deeper = darker, night = much darker)
  function drawWaterTint(g, ctx, S, T) {
    const L = S.L, lk = rgb(LAKE[S.lake].deep), y0 = L.sea;
    const wg = ctx.createLinearGradient(0, y0, 0, L.H);
    wg.addColorStop(0, css(lk, 0.05)); wg.addColorStop(1, css(lk, 0.55));
    ctx.fillStyle = wg; ctx.fillRect(0, y0, L.W, L.H - y0);
    if (T.dark > 0.01) { ctx.fillStyle = 'rgba(3,6,22,' + (T.dark * 0.62) + ')'; ctx.fillRect(0, y0, L.W, L.H - y0); }
  }
  const surfY = (x, t) => Math.sin(x * 0.03 + t * 1.6) * 2 + Math.sin(x * 0.071 - t * 1.1) * 1.4;
  function drawSurface(g, ctx, S, T, t) {
    const L = S.L, W = L.W, y0 = L.sea;
    ctx.beginPath(); ctx.moveTo(0, y0 + surfY(0, t));
    for (let x = 12; x <= W + 12; x += 12) ctx.lineTo(x, y0 + surfY(x, t));
    ctx.lineTo(W, y0 + 9); ctx.lineTo(0, y0 + 9); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.08 * (1 - T.dark)) + ')'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, y0 + surfY(0, t));
    for (let x = 12; x <= W + 12; x += 12) ctx.lineTo(x, y0 + surfY(x, t));
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * (1 - T.dark)) + ')'; ctx.lineWidth = 2; ctx.stroke();
    for (const r of S.rip) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (r.a * 0.8) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r.x, y0 + 1, r.r, r.r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ---------- the dock, the kid and the rod ----------
  function rodGeom(S) {
    const L = S.L, k = L.k, gx = L.fx + 15 * k, gy = L.dockY - 45 * k, len = (L.P ? 128 : 150) * k, a = S.rodA;
    const bend = S.ph === 'fight' && S.F ? 0.15 + S.F.T * 0.55 : S.ph === 'bite' ? 0.3 : 0.06;
    const tx = gx + Math.cos(a) * len, ty = gy + Math.sin(a) * len;
    return { gx, gy, a, len, bend, tx: tx + bend * len * 0.12, ty: ty + bend * len * 0.32 };
  }
  function drawDock(g, ctx, S, T, tc, t) {
    const L = S.L, k = L.k, y = L.dockY, X = L.dockX;
    ctx.fillStyle = tc('#9c6c40'); ctx.fillRect(0, y, X, 13 * k);
    ctx.fillStyle = tc('#734b2b'); ctx.fillRect(0, y + 13 * k, X, 6 * k);
    ctx.strokeStyle = tc('#6a4528'); ctx.lineWidth = 1.5;
    for (let x = 22; x < X; x += 24) { ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + 13 * k); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, y, X, 2);
    // bucket with the day's catch
    const bx = L.fx - 52 * k, n = Math.min(3, S.caught || 0);
    for (let i = 0; i < n; i++) { ctx.fillStyle = tc(['#ff9a2e', '#8d9ba8', '#c4c044'][i]); ctx.beginPath(); ctx.moveTo(bx - 5 + i * 6, y - 22 * k); ctx.lineTo(bx - 10 + i * 6, y - 31 * k); ctx.lineTo(bx + i * 6, y - 31 * k); ctx.fill(); }
    ctx.fillStyle = tc('#5a7fa0'); ctx.beginPath(); ctx.moveTo(bx - 13 * k, y - 24 * k); ctx.lineTo(bx + 13 * k, y - 24 * k); ctx.lineTo(bx + 10 * k, y); ctx.lineTo(bx - 10 * k, y); ctx.fill();
    ctx.strokeStyle = tc('#3d5a75'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, y - 24 * k, 12 * k, Math.PI, 0); ctx.stroke();
    // lantern
    const px = X - 12 * k, ly = y - 74 * k;
    ctx.fillStyle = tc('#5a3d24'); ctx.fillRect(px - 3 * k, ly, 6 * k, 74 * k);
    ctx.fillStyle = tc('#3b3b44'); ctx.fillRect(px - 9 * k, ly - 4 * k, 18 * k, 4 * k); ctx.fillRect(px - 8 * k, ly - 24 * k, 16 * k, 3 * k);
    ctx.fillStyle = T.night > 0.2 ? '#ffd27a' : tc('#d9e4ea'); ctx.fillRect(px - 6 * k, ly - 21 * k, 12 * k, 17 * k);
  }
  function drawKid(g, ctx, S, T, tc, t) {
    const L = S.L, k = L.k, x = L.fx, y = L.dockY, R = rodGeom(S);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // legs, boots, coat
    ctx.fillStyle = tc('#35507a'); g.rr(ctx, x - 9 * k, y - 31 * k, 8 * k, 30 * k, 3 * k); ctx.fill(); g.rr(ctx, x + 1 * k, y - 31 * k, 8 * k, 30 * k, 3 * k); ctx.fill();
    ctx.fillStyle = tc('#3b2a20'); ctx.beginPath(); ctx.ellipse(x - 4 * k, y - 2 * k, 7 * k, 3.5 * k, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 7 * k, y - 2 * k, 7 * k, 3.5 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = tc('#ffc531'); g.rr(ctx, x - 13 * k, y - 65 * k, 26 * k, 38 * k, 9 * k); ctx.fill();
    ctx.fillStyle = tc('#e39f12'); ctx.fillRect(x - 1 * k, y - 62 * k, 2 * k, 33 * k);
    // the rod (behind the front arm)
    const mx = R.gx + Math.cos(R.a) * R.len * 0.55, my = R.gy + Math.sin(R.a) * R.len * 0.55;
    ctx.strokeStyle = tc('#3a2a1c'); ctx.lineWidth = 5 * k; ctx.beginPath(); ctx.moveTo(R.gx - Math.cos(R.a) * 16 * k, R.gy - Math.sin(R.a) * 16 * k); ctx.lineTo(R.gx, R.gy); ctx.stroke();
    ctx.strokeStyle = tc(ROD[S.P.rod].col); ctx.lineWidth = 3.2 * k;
    ctx.beginPath(); ctx.moveTo(R.gx, R.gy); ctx.quadraticCurveTo(mx + R.bend * 10, my + R.bend * R.len * 0.1, R.tx, R.ty); ctx.stroke();
    ctx.fillStyle = tc('#c9ced6'); g.circle(ctx, R.gx + 2 * k, R.gy + 7 * k, 6 * k); ctx.fill();
    ctx.strokeStyle = tc('#7a808a'); ctx.lineWidth = 2; const ra = S.spin || 0;
    ctx.beginPath(); ctx.moveTo(R.gx + 2 * k, R.gy + 7 * k); ctx.lineTo(R.gx + 2 * k + Math.cos(ra) * 7 * k, R.gy + 7 * k + Math.sin(ra) * 7 * k); ctx.stroke();
    // head and hat
    g.circle(ctx, x + 1 * k, y - 78 * k, 13 * k); ctx.fillStyle = tc('#f2c29a'); ctx.fill();
    ctx.fillStyle = tc('#ff9a8a'); g.circle(ctx, x + 8 * k, y - 73 * k, 3 * k); ctx.fill();
    const blink = (t % 4.2) < 0.12;
    ctx.fillStyle = '#1d1d24';
    if (blink) ctx.fillRect(x + 5 * k, y - 80 * k, 5 * k, 1.6 * k); else { g.circle(ctx, x + 8 * k, y - 80 * k, 2 * k); ctx.fill(); }
    ctx.fillStyle = tc('#3d8f5c'); ctx.beginPath(); ctx.ellipse(x + 2 * k, y - 85 * k, 20 * k, 5 * k, -0.06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1 * k, y - 86 * k, 12.5 * k, Math.PI, 0); ctx.fill();
    ctx.fillStyle = tc('#2d6b45'); ctx.fillRect(x - 11 * k, y - 89 * k, 24 * k, 3 * k);
    // arm to the grip
    ctx.strokeStyle = tc('#f2b21f'); ctx.lineWidth = 7 * k;
    ctx.beginPath(); ctx.moveTo(x + 4 * k, y - 57 * k); ctx.lineTo(R.gx - 2 * k, R.gy + 2 * k); ctx.stroke();
    ctx.fillStyle = tc('#f2c29a'); g.circle(ctx, R.gx, R.gy, 4.5 * k); ctx.fill();
  }
  // the fishing line, the float and the hook
  function drawLine(g, ctx, S, T, t) {
    const L = S.L, R = rodGeom(S), ph = S.ph;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(240,244,250,.75)'; ctx.lineWidth = 1.2;
    let fx = S.bx, fy = S.by;
    if (ph === 'idle' || ph === 'charge' || ph === 'card' || ph === 'land') { fx = R.tx + 2; fy = R.ty + 26; }
    const tight = ph === 'fight' || ph === 'bite';
    ctx.beginPath(); ctx.moveTo(R.tx, R.ty);
    if (tight) ctx.lineTo(fx, fy); else ctx.quadraticCurveTo((R.tx + fx) / 2, Math.max(R.ty, fy) + 18, fx, fy);
    ctx.stroke();
    const inWater = ph === 'sink' || ph === 'wait' || ph === 'bite' || ph === 'fight' || ph === 'reel' || ph === 'demo';
    if (inWater && ph !== 'fight') {
      ctx.strokeStyle = 'rgba(240,244,250,.35)'; ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(S.bx, S.hy); ctx.stroke();
      ctx.strokeStyle = '#c0c6cf'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(S.bx - 3, S.hy, 3, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = LURE[S.P.lure].col; g.circle(ctx, S.bx - 2, S.hy + 3, 3); ctx.fill();
    }
    if (ph === 'fight' && S.fish) { ctx.strokeStyle = 'rgba(240,244,250,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(S.fish.x + S.fish.dir * S.fish.len * 0.45, S.fish.y); ctx.stroke(); }
    // float
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(S.tilt || 0);
    g.circle(ctx, 0, 0, 6); ctx.fillStyle = '#f4f4f4'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 6, Math.PI, 0); ctx.fillStyle = '#e8402f'; ctx.fill();
    ctx.fillStyle = '#e8402f'; ctx.fillRect(-1, -12, 2, 7);
    ctx.restore();
    if (T.night > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(fx, fy - 10, 1, fx, fy - 10, 16); gr.addColorStop(0, 'rgba(120,255,160,.8)'); gr.addColorStop(1, 'rgba(120,255,160,0)'); ctx.fillStyle = gr; ctx.fillRect(fx - 16, fy - 26, 32, 32); ctx.restore(); }
  }

  // ---------- user interface on the canvas ----------
  function coinIcon(g, ctx, x, y, r) {
    g.circle(ctx, x, y, r); ctx.fillStyle = '#e8a312'; ctx.fill();
    g.circle(ctx, x, y - r * 0.08, r * 0.84); ctx.fillStyle = '#ffd34d'; ctx.fill();
    ctx.strokeStyle = '#e8a312'; ctx.lineWidth = Math.max(1, r * 0.16); g.circle(ctx, x, y - r * 0.08, r * 0.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.3, 0.6, 0, 7); ctx.fill();
  }
  function cartIcon(g, ctx, x, y, s) {
    ctx.fillStyle = '#ff8a2e'; ctx.beginPath(); ctx.ellipse(x + 3 * s, y - 8 * s, 6 * s, 3 * s, -0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 6 * s); ctx.lineTo(x - 7 * s, y - 11 * s); ctx.lineTo(x - 6 * s, y - 4 * s); ctx.fill();
    ctx.fillStyle = '#c4622a'; ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 5 * s); ctx.lineTo(x + 13 * s, y - 5 * s); ctx.lineTo(x + 10 * s, y + 5 * s); ctx.lineTo(x - 5 * s, y + 5 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a3208'; ctx.lineWidth = 2.4 * s; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 14 * s, y - 9 * s); ctx.lineTo(x - 10 * s, y - 9 * s); ctx.lineTo(x - 5 * s, y + 5 * s); ctx.lineTo(x + 10 * s, y + 5 * s); ctx.lineTo(x + 13 * s, y - 5 * s); ctx.lineTo(x - 8 * s, y - 5 * s); ctx.stroke();
    ctx.fillStyle = '#6a3208'; g.circle(ctx, x - 3 * s, y + 10 * s, 2.6 * s); ctx.fill(); g.circle(ctx, x + 8 * s, y + 10 * s, 2.6 * s); ctx.fill();
  }
  function bucketIcon(g, ctx, x, y, s) {
    ctx.strokeStyle = '#cfe3f5'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(x, y - 4 * s, 7 * s, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#5a8fc0'; ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 4 * s); ctx.lineTo(x + 8 * s, y - 4 * s); ctx.lineTo(x + 6 * s, y + 7 * s); ctx.lineTo(x - 6 * s, y + 7 * s); ctx.fill();
  }
  function bookIcon(g, ctx, x, y, s) {
    g.rr(ctx, x - 12 * s, y - 11 * s, 24 * s, 22 * s, 3 * s); ctx.fillStyle = '#2f6fd6'; ctx.fill();
    ctx.fillStyle = '#f4f0e6'; ctx.fillRect(x - 9 * s, y - 8 * s, 18 * s, 16 * s);
    ctx.fillStyle = '#2f6fd6'; ctx.fillRect(x - 1 * s, y - 9 * s, 2 * s, 18 * s);
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.ellipse(x + 5 * s, y, 3.2 * s, 1.8 * s, 0, 0, 7); ctx.fill();
  }
  function btn(g, ctx, r, label, o) {
    o = o || {};
    ctx.save();
    if (o.off) ctx.globalAlpha *= 0.45;
    const c1 = o.c1 || '#ffd451', c2 = o.c2 || '#f0a41c';
    g.rr(ctx, r.x, r.y + 3, r.w, r.h, Math.min(14, r.h / 2)); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    g.rr(ctx, r.x, r.y, r.w, r.h, Math.min(14, r.h / 2));
    const gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, o.hot ? g.shade(c1, 0.2) : c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    const ix = o.icon ? 22 : 0, rtl = o.rtl;
    if (o.icon) o.icon(rtl ? r.x + r.w - 24 : r.x + 24, r.y + r.h / 2);
    g.text(ctx, label, r.x + r.w / 2 + (rtl ? -ix / 2 : ix / 2), r.y + r.h / 2 + 1, { size: o.size || 19, color: o.tc || '#4a2700', maxW: r.w - 16 - ix * 1.2 });
    ctx.restore();
  }
  function pill(g, ctx, x, y, s, col, size) {
    ctx.font = '800 ' + size + 'px Heebo, Arial, sans-serif';
    const w = ctx.measureText(s).width + size * 1.2, h = size * 1.6;
    g.rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = col; ctx.fill();
    g.text(ctx, s, x, y + 1, { size, color: '#14161c' });
  }
  const castX = (S, p) => S.L.castA + (S.L.castB - S.L.castA) * clamp(p, 0, 1) * ROD[S.P.rod].d;
  function drawHud(g, ctx, S, t) {
    const L = S.L, can = S.ph === 'idle' || S.ph === 'wait' || S.ph === 'sink';
    btn(g, ctx, L.btnShop, g.t('shop'), { off: !can, hot: S.hover === 'shop', icon: (x, y) => cartIcon(g, ctx, x, y, 1), rtl: g.rtl });
    btn(g, ctx, L.btnAlbum, g.t('album'), { off: !can, hot: S.hover === 'album', icon: (x, y) => bookIcon(g, ctx, x, y, 1), rtl: g.rtl, c1: '#8fd3ff', c2: '#4f9fe8', tc: '#0b2a4a' });
    // lake name
    const nm = list(g, 'lake', S.lake);
    ctx.font = '800 16px Heebo, Arial, sans-serif';
    const w = Math.min(L.W * 0.42, ctx.measureText(nm).width + 30);
    g.rr(ctx, 12, 14, w, 32, 16); ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fill();
    g.text(ctx, nm, 12 + w / 2, 31, { size: 16, color: '#fff', maxW: w - 20 });
    if (S.ph === 'charge') {
      const k = L.k, mx = L.fx - 62 * k, top = L.dockY - 160 * k, hh = 108 * k, p = S.pow;
      g.rr(ctx, mx - 11, top - 4, 22, hh + 8, 11); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
      const gr = ctx.createLinearGradient(0, top + hh, 0, top); gr.addColorStop(0, '#5fe07a'); gr.addColorStop(0.6, '#ffd84d'); gr.addColorStop(1, '#ff6a4d');
      g.rr(ctx, mx - 7, top + hh * (1 - p), 14, hh * p, 7); ctx.fillStyle = gr; ctx.fill();
      const x = castX(S, p), y = L.sea - 26 + Math.sin(t * 8) * 3;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, L.sea + 1, 14, 4, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x + 8, y - 10); ctx.lineTo(x, y); ctx.fill();
    }
    if (S.ph === 'bite') {
      const x = S.bx, y = L.sea - 46 + Math.sin(t * 16) * 3;
      g.circle(ctx, x, y, 17); ctx.fillStyle = '#ffd84d'; ctx.fill(); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2.5; ctx.stroke();
      g.text(ctx, '!', x, y + 1, { size: 26, color: '#7a2a00' });
    }
    if (S.ph === 'fight' && S.F) drawTension(g, ctx, S, t);
    let hint = null, col = '#fff';
    if (S.ph === 'idle') hint = g.t('holdCast');
    else if (S.ph === 'charge') hint = g.t('release');
    else if (S.ph === 'wait' || S.ph === 'sink') hint = g.t('waiting');
    else if (S.ph === 'bite') { hint = g.t('bite'); col = '#ffd84d'; }
    else if (S.ph === 'fight' && (S.P.fights < 4 || S.F.zone !== 1)) hint = g.t('reelHint');
    if (hint) g.text(ctx, hint, L.hint.x, S.ph === 'fight' ? L.bar.y - 66 : L.hint.y, { size: L.P ? 26 : 24, color: col, stroke: 'rgba(0,0,0,.55)', strokeW: 5, maxW: L.W - 40, alpha: S.ph === 'wait' ? 0.75 : 1 });
  }
  function drawTension(g, ctx, S, t) {
    const B = S.L.bar, F = S.F, lo = clamp(F.gc - F.gw, 0, 1), hi = clamp(F.gc + F.gw, 0, 1), X = v => B.x + B.w * v;
    g.rr(ctx, B.x - 8, B.y - 40, B.w + 16, B.h + 56, 16); ctx.fillStyle = 'rgba(4,12,26,.55)'; ctx.fill();
    // how far the fish is: the fish icon swims toward the dock on the left
    const dy = B.y - 20;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(B.x + 14, dy); ctx.lineTo(B.x + B.w - 6, dy); ctx.stroke();
    ctx.strokeStyle = '#7dffa8'; ctx.beginPath(); ctx.moveTo(B.x + 14, dy); ctx.lineTo(X(clamp(F.D, 0, 1)), dy); ctx.stroke();
    bucketIcon(g, ctx, B.x + 2, dy, 1);
    const shake = F.warn > 0 || F.run > 0 ? Math.sin(t * 50) * 2.5 : 0;
    drawFish(ctx, S.fish.s, X(clamp(F.D, 0, 1)) + shake, dy, 34, -1, t, { fast: F.run > 0 });
    if (F.warn > 0 || F.run > 0) g.text(ctx, '!!', X(clamp(F.D, 0, 1)), dy - 18, { size: 16, color: '#ff8a5c', stroke: 'rgba(0,0,0,.6)', strokeW: 3 });
    // the tension track: slack | green | too tight
    g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2); ctx.fillStyle = '#20314a'; ctx.fill();
    ctx.save(); g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2); ctx.clip();
    ctx.fillStyle = '#3c5a80'; ctx.fillRect(B.x, B.y, X(lo) - B.x, B.h);
    const rg = ctx.createLinearGradient(X(hi), 0, B.x + B.w, 0); rg.addColorStop(0, '#d9473a'); rg.addColorStop(1, '#8f1d1d');
    ctx.fillStyle = rg; ctx.fillRect(X(hi), B.y, B.x + B.w - X(hi), B.h);
    const gg = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); gg.addColorStop(0, '#8dff9e'); gg.addColorStop(1, '#2fbf5a');
    ctx.fillStyle = gg; ctx.fillRect(X(lo), B.y, X(hi) - X(lo), B.h);
    if (F.strain > 0.02) { ctx.fillStyle = 'rgba(255,60,40,' + (0.25 + 0.25 * Math.sin(t * 20)) + ')'; ctx.fillRect(B.x, B.y + B.h - 6, B.w * clamp(F.strain, 0, 1), 6); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2); ctx.stroke();
    const nx = X(F.T), nc = F.zone === 1 ? '#ffffff' : F.zone === 2 ? '#ffd0c8' : '#cfe3ff';
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(nx - 3, B.y - 5, 6, B.h + 10);
    ctx.fillStyle = nc; ctx.fillRect(nx - 2, B.y - 4, 4, B.h + 8);
    ctx.beginPath(); ctx.moveTo(nx - 8, B.y - 12); ctx.lineTo(nx + 8, B.y - 12); ctx.lineTo(nx, B.y - 3); ctx.fill();
  }
  // the catch card
  function cardLayout(S) { const C = S.L.card; return { C, sell: rect(C.x + 60, C.y + C.h - 92, C.w - 120, 64) }; }
  function drawCard(g, ctx, S, t) {
    const L = S.L, c = S.card, q = clamp((S.anim - c.t0) / 0.35, 0, 1), { C, sell } = cardLayout(S), s = c.s, rc = RC[s.r];
    ctx.fillStyle = 'rgba(4,10,24,' + 0.6 * q + ')'; ctx.fillRect(0, 0, L.W, L.H);
    const cx = C.x + C.w / 2, cy = C.y + C.h / 2, sc = 0.6 + 0.4 * g.ease.back(q);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); ctx.globalAlpha = q;
    ctx.save(); ctx.translate(cx, C.y + 175); ctx.rotate(S.anim * 0.4);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = hexA(rc, 0.16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -L.W * 0.5); ctx.lineTo(40, -L.W * 0.5); ctx.fill(); }
    ctx.restore();
    g.rr(ctx, C.x, C.y + 6, C.w, C.h, 26); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    g.rr(ctx, C.x, C.y, C.w, C.h, 26);
    const bg = ctx.createLinearGradient(0, C.y, 0, C.y + C.h); bg.addColorStop(0, '#1d3a5c'); bg.addColorStop(1, '#0d1d33');
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = rc; ctx.lineWidth = 4; ctx.stroke();
    pill(g, ctx, cx, C.y + 36, list(g, 'rar', s.r), rc, 17);
    const fl = Math.min(C.w * 0.66, 330);
    drawFish(ctx, s, cx, C.y + 178 + Math.sin(S.anim * 2) * 5, fl, 1, S.anim, { glow: true });
    g.text(ctx, list(g, 'fish', s.i), cx, C.y + C.h - 190, { size: 34, color: '#fff', maxW: C.w - 40, shadow: true });
    g.text(ctx, g.t('cm', { n: c.cm }), cx, C.y + C.h - 146, { size: 20, color: '#bfe3ff' });
    if (c.isNew) { ctx.save(); ctx.translate(C.x + C.w - 58, C.y + 34); ctx.rotate(0.25 + Math.sin(S.anim * 4) * 0.06); pill(g, ctx, 0, 0, g.t('newFish'), '#ffd84d', 18); ctx.restore(); }
    btn(g, ctx, sell, g.t('sell', { n: c.val }), { size: 24, hot: S.hover === 'sell', icon: (x, y) => coinIcon(g, ctx, x, y, 12), rtl: g.rtl, c1: '#7dffa0', c2: '#2fbf63', tc: '#06321a' });
    ctx.restore();
  }
  // shop and album panels
  function panelLayout(g, S) {
    const L = S.L, P = L.panel, mir = r => (g.rtl ? rect(P.x + P.w - (r.x - P.x) - r.w, r.y, r.w, r.h) : r);
    const nt = S.panel === 'shop' ? 3 : 4, tw = (P.w - 40) / nt, tabs = [];
    for (let i = 0; i < nt; i++) tabs.push(mir(rect(P.x + 20 + i * tw, P.y + 70, tw - 8, 48)));
    const Y = { tabs, close: mir(rect(P.x + P.w - 62, P.y + 12, 48, 48)), cells: [], P, mir };
    const y0 = P.y + 132, avail = P.y + P.h - 16 - y0;
    if (S.panel === 'shop') {
      const n = S.tab === 2 ? 4 : 5, rh = Math.min(L.P ? 140 : 74, avail / n - 8);
      for (let i = 0; i < n; i++) { const r = rect(P.x + 20, y0 + i * (rh + 8), P.w - 40, rh); r.icon = mir(rect(r.x + 8, r.y + 8, rh - 16, rh - 16)); r.btn = mir(rect(r.x + r.w - (L.P ? 150 : 166), r.y + (rh - 48) / 2, L.P ? 140 : 156, 48)); Y.cells.push(r); }
    } else {
      const cols = L.P ? 2 : 4, rows = L.P ? 4 : 2, cw = (P.w - 40) / cols, ch = avail / rows;
      for (let i = 0; i < 7; i++) Y.cells.push(mir(rect(P.x + 20 + (i % cols) * cw, y0 + Math.floor(i / cols) * ch, cw - 8, ch - 8)));
    }
    return Y;
  }
  function pips(g, ctx, x, y, n, rtl) { for (let i = 0; i < 5; i++) { g.circle(ctx, x + (rtl ? -i : i) * 12, y, 4.2); ctx.fillStyle = i < n ? '#ffd84d' : 'rgba(255,255,255,.18)'; ctx.fill(); } }
  function itemIcon(g, ctx, S, kind, i, r, t) {
    g.rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, s = r.w / 60;
    if (kind === 0) {
      ctx.strokeStyle = ROD[i].col; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 20 * s, cy + 20 * s); ctx.quadraticCurveTo(cx + 4 * s, cy - 6 * s, cx + 22 * s, cy - 22 * s); ctx.stroke();
      ctx.fillStyle = '#c9ced6'; g.circle(ctx, cx - 12 * s, cy + 16 * s, 5 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 22 * s, cy - 22 * s); ctx.lineTo(cx + 22 * s, cy + 14 * s); ctx.stroke();
    } else if (kind === 1) {
      const c = LURE[i].col;
      if (i === 0) { ctx.strokeStyle = c; ctx.lineWidth = 6 * s; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= 10; k++) ctx.lineTo(cx - 18 * s + k * 3.6 * s, cy + Math.sin(k * 1.1 + t * 3) * 6 * s); ctx.stroke(); }
      else {
        if (LURE[i].glow) { const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26 * s); gr.addColorStop(0, hexA(c, 0.7)); gr.addColorStop(1, hexA(c, 0)); ctx.fillStyle = gr; ctx.fillRect(cx - 26 * s, cy - 26 * s, 52 * s, 52 * s); }
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx, cy, 15 * s, 8 * s, 0.3, 0, 7); ctx.fill();
        if (i === 2) { ctx.fillStyle = '#ff6fa8'; ctx.beginPath(); ctx.ellipse(cx - 14 * s, cy - 4 * s, 10 * s, 4 * s, -0.4, 0, 7); ctx.fill(); }
        ctx.strokeStyle = '#c0c6cf'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(cx + 15 * s, cy + 6 * s, 5 * s, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(cx - 4 * s, cy - 3 * s, 5 * s, 2 * s, 0.3, 0, 7); ctx.fill();
      }
    } else {
      ctx.save(); g.rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.clip();
      const lk = LAKE[i], sky = ['#9fd8ff', '#9fc3e8', '#8fe8ff', '#c9e2f5'][i];
      ctx.fillStyle = sky; ctx.fillRect(r.x, r.y, r.w, r.h * 0.5);
      ctx.fillStyle = ['#6fb36a', '#5d7393', '#f2e2b2', '#eef4fb'][i];
      ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h * 0.5); ctx.lineTo(r.x + r.w * 0.3, r.y + r.h * 0.22); ctx.lineTo(r.x + r.w * 0.55, r.y + r.h * 0.4); ctx.lineTo(r.x + r.w * 0.8, r.y + r.h * 0.18); ctx.lineTo(r.x + r.w, r.y + r.h * 0.5); ctx.fill();
      const wg = ctx.createLinearGradient(0, r.y + r.h * 0.5, 0, r.y + r.h); wg.addColorStop(0, lk.top); wg.addColorStop(1, lk.deep);
      ctx.fillStyle = wg; ctx.fillRect(r.x, r.y + r.h * 0.5, r.w, r.h * 0.5);
      drawFish(ctx, SP[i * 7], cx, r.y + r.h * 0.74, r.w * 0.42, 1, t, {});
      ctx.restore();
    }
  }

  function statLine(g, ctx, x, y, items, rtl) {
    for (const [label, n] of items) {
      ctx.font = '700 14px Heebo, Arial, sans-serif';
      const w = ctx.measureText(label).width;
      g.text(ctx, label, x, y, { size: 14, weight: 700, color: '#bcd0e6', align: rtl ? 'right' : 'left' });
      x += (rtl ? -1 : 1) * (w + 12);
      pips(g, ctx, x, y + 1, n, rtl);
      x += (rtl ? -1 : 1) * 76;
    }
  }
  function drawPanel(g, ctx, S, t) {
    const L = S.L, Y = panelLayout(g, S), P = Y.P, q = clamp((S.anim - S.panelT) / 0.22, 0, 1), e = g.ease.back(q), shop = S.panel === 'shop';
    ctx.fillStyle = 'rgba(4,10,24,' + 0.55 * q + ')'; ctx.fillRect(0, 0, L.W, L.H);
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.86 + 0.14 * e, 0.86 + 0.14 * e); ctx.translate(-cx, -cy); ctx.globalAlpha = q;
    g.rr(ctx, P.x, P.y + 6, P.w, P.h, 24); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    g.rr(ctx, P.x, P.y, P.w, P.h, 24);
    const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#1f3d63'); bg.addColorStop(1, '#0e1f36');
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke();
    g.text(ctx, shop ? g.t('shop') : g.t('album') + '  ' + albCount(S.P) + '/' + SP.length, cx, P.y + 38, { size: 30, color: '#ffd84d', maxW: P.w - 260 });
    if (shop) {
      const sx = g.rtl ? P.x + P.w - 30 : P.x + 30;
      coinIcon(g, ctx, sx, P.y + 37, 12);
      g.text(ctx, String(S.P.coins), sx + (g.rtl ? -20 : 20), P.y + 38, { size: 22, color: '#ffe9a0', align: g.rtl ? 'right' : 'left' });
    }
    const C = Y.close;
    g.circle(ctx, C.x + C.w / 2, C.y + C.h / 2, 21); ctx.fillStyle = S.hover === 'close' ? '#ff7a6a' : 'rgba(255,255,255,.12)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(C.x + 16, C.y + 16); ctx.lineTo(C.x + C.w - 16, C.y + C.h - 16); ctx.moveTo(C.x + C.w - 16, C.y + 16); ctx.lineTo(C.x + 16, C.y + C.h - 16); ctx.stroke();
    Y.tabs.forEach((r, i) => {
      const on = i === S.tab;
      g.rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fillStyle = on ? '#ffd451' : S.hover === 'tab' + i ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; ctx.fill();
      const lb = shop ? g.t(['rods', 'lures', 'lakes'][i]) : list(g, 'lake', i);
      g.text(ctx, lb, r.x + r.w / 2, r.y + r.h / 2 + 1, { size: shop ? 19 : 15, color: on ? '#3a2200' : '#e4eefa', maxW: r.w - 14 });
      if (!shop) { const n = albCount(S.P, i); if (n === 7) { g.circle(ctx, r.x + r.w - 6, r.y + 6, 8); ctx.fillStyle = '#5fe07a'; ctx.fill(); } }
    });
    if (shop) {
      const kind = S.tab, key = ['rod', 'lure', 'lake'][kind], items = [ROD, LURE, LAKE][kind];
      Y.cells.forEach((r, i) => {
        const owned = S.P.own[key][i], cur = S.P[key] === i, price = items[i].$;
        g.rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fillStyle = i === S.sel ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.055)'; ctx.fill();
        if (cur) { ctx.strokeStyle = '#5fe07a'; ctx.lineWidth = 2; ctx.stroke(); }
        itemIcon(g, ctx, S, kind, i, r.icon, t);
        const tx = g.rtl ? r.icon.x - 14 : r.icon.x + r.icon.w + 14, al = g.rtl ? 'right' : 'left', maxW = r.w - r.icon.w - r.btn.w - 44;
        g.text(ctx, list(g, key, i), tx, r.y + (L.P ? 28 : 22), { size: L.P ? 22 : 19, align: al, maxW });
        const st = kind === 0 ? [[g.t('sDist'), i + 1], [g.t('sReel'), i + 1], [g.t('sHold'), i + 1]] : kind === 1 ? [[g.t('sLuck'), i + 1], [g.t('sBite'), i + 1]] : null;
        if (st) { if (L.P) st.forEach((s, j) => statLine(g, ctx, tx, r.y + 62 + j * 26, [s], g.rtl)); else statLine(g, ctx, tx, r.y + 52, st, g.rtl); }
        else {
          const m = g.t('mult', { n: LAKE_MULT[i] }), a = '📖 ' + albCount(S.P, i) + '/7';
          if (L.P) { g.text(ctx, m, tx, r.y + 64, { size: 15, weight: 700, color: '#bcd0e6', align: al, maxW }); g.text(ctx, a, tx, r.y + 92, { size: 15, weight: 700, color: '#bcd0e6', align: al, maxW }); }
          else g.text(ctx, m + '   ' + a, tx, r.y + 52, { size: 15, weight: 700, color: '#bcd0e6', align: al, maxW });
        }
        const b = r.btn, hot = S.hover === 'buy' + i;
        if (cur) btn(g, ctx, b, g.t(kind === 2 ? 'here' : 'equipped'), { c1: '#3d5270', c2: '#2a3a52', tc: '#9ff0b4', size: 17 });
        else if (owned) btn(g, ctx, b, g.t(kind === 2 ? 'travel' : 'equip'), { c1: '#8fd3ff', c2: '#4f9fe8', tc: '#0b2a4a', hot, size: 18 });
        else btn(g, ctx, b, String(price), { off: S.P.coins < price, hot, icon: (x, y) => coinIcon(g, ctx, x, y, 11), rtl: g.rtl, size: 20 });
      });
    } else {
      Y.cells.forEach((r, i) => {
        const s = SP[S.tab * 7 + i], a = S.P.alb[s.i], rc = RC[s.r];
        g.rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fillStyle = a ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.04)'; ctx.fill();
        ctx.strokeStyle = a ? hexA(rc, 0.85) : 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.stroke();
        const fx = r.x + r.w / 2, fy = r.y + r.h * 0.4, fl = Math.min(r.w * 0.6, 150, r.h * 1.1);
        if (a) drawFish(ctx, s, fx, fy, fl, 1, t + i, { glow: true });
        else { drawFish(ctx, s, fx, fy, fl, 1, 0, { sil: 'rgba(6,14,30,.85)' }); g.text(ctx, '?', fx, fy + 2, { size: 30, color: 'rgba(255,255,255,.55)' }); }
        g.text(ctx, a ? list(g, 'fish', s.i) : '???', fx, r.y + r.h - 44, { size: 16, color: '#fff', maxW: r.w - 14 });
        g.text(ctx, a ? '×' + a.n + ' · ' + g.t('cm', { n: a.b }) : list(g, 'rar', s.r), fx, r.y + r.h - 20, { size: 13, weight: 700, color: a ? '#bcd0e6' : rc, maxW: r.w - 14 });
        g.circle(ctx, r.x + 14, r.y + 14, 6); ctx.fillStyle = rc; ctx.fill();
        if (s.night) { const mx = r.x + r.w - 18, my = r.y + 16; g.circle(ctx, mx, my, 8); ctx.fillStyle = '#ffe9a8'; ctx.fill(); g.circle(ctx, mx + 4, my - 3, 7); ctx.fillStyle = a ? '#26364e' : '#1a2840'; ctx.fill(); }
      });
    }
    ctx.restore();
  }
  function hoverAt(g, S, p) {
    if (S.ph === 'card') return inR(p, cardLayout(S).sell) ? 'sell' : null;
    if (S.panel) {
      const Y = panelLayout(g, S);
      if (inR(p, Y.close)) return 'close';
      for (let i = 0; i < Y.tabs.length; i++) if (inR(p, Y.tabs[i])) return 'tab' + i;
      if (S.panel === 'shop') for (let i = 0; i < Y.cells.length; i++) if (inR(p, Y.cells[i].btn)) return 'buy' + i;
      return null;
    }
    return inR(p, S.L.btnShop) ? 'shop' : inR(p, S.L.btnAlbum) ? 'album' : null;
  }

  // ---------- the world moving by itself (also behind the menu) ----------
  function ambSpecies(S) {
    const night = isNight(S.h), pool = [];
    for (let i = S.lake * 7; i < S.lake * 7 + 6; i++) if (night || !SP[i].night) pool.push(...Array([6, 3, 1, 1, 0][SP[i].r]).fill(i));
    return SP[pool[Math.floor(Math.random() * pool.length)]];
  }
  function newAmb(S, x) {
    const L = S.L, s = ambSpecies(S), cm = s.cm[0] + (s.cm[1] - s.cm[0]) * Math.random() * 0.7, dir = Math.random() < 0.5 ? -1 : 1;
    x = x != null ? x : dir > 0 ? L.dockX - 60 : L.W + 60;
    const y = L.sea + 40 + Math.random() * (L.bedY(clamp(x, 0, L.W)) - L.sea - 70);
    return { s, len: pxLen(cm), x, y, y0: y, dir, v: 18 + Math.random() * 26, p: Math.random() * 6 };
  }
  function resetWorld(S) {
    const L = S.L;
    S.deco = makeDeco(L, S.lake);
    S.amb = []; for (let i = 0; i < (L.P ? 8 : 7); i++) S.amb.push(newAmb(S, L.dockX + 30 + Math.random() * (L.W - L.dockX - 60)));
    S.clouds = []; for (let i = 0; i < 4; i++) S.clouds.push({ x: Math.random() * L.W, y: 30 + Math.random() * (L.hor * 0.45), s: 0.7 + Math.random() * 0.7, v: 4 + Math.random() * 6 });
    S.birds = []; S.rip = []; S.bub = []; S.motes = [];
  }
  function ripple(S, x, n, big) { for (let i = 0; i < n; i++) if (S.rip.length < 14) S.rip.push({ x, r: 4 + i * (big ? 9 : 5), a: big ? 0.8 : 0.55 }); }
  function updateWorld(g, S, dt) {
    const L = S.L, t = S.t;
    for (let i = 0; i < S.amb.length; i++) {
      const f = S.amb[i];
      f.x += f.dir * f.v * dt; f.p += dt;
      f.y = f.y0 + Math.sin(f.p * 0.7) * 14;
      if ((f.dir > 0 && f.x > L.W + 70) || (f.dir < 0 && f.x < L.dockX - 70)) S.amb[i] = newAmb(S);
      else if (Math.random() < 0.002 * dt * 60 && S.bub.length < 30) S.bub.push({ x: f.x + f.dir * f.len * 0.45, y: f.y, r: 1.5 + Math.random() * 2.5, p: Math.random() * 6 });
    }
    for (let i = S.bub.length - 1; i >= 0; i--) { const b = S.bub[i]; b.y -= (22 + b.r * 8) * dt; b.p += dt * 4; if (b.y < L.sea + 4) { S.bub.splice(i, 1); if (Math.random() < 0.3) ripple(S, b.x, 1, false); } }
    for (let i = S.rip.length - 1; i >= 0; i--) { const r = S.rip[i]; r.r += 34 * dt; r.a -= dt * 0.75; if (r.a <= 0) S.rip.splice(i, 1); }
    for (const c of S.clouds) { c.x += c.v * dt; if (c.x > L.W + 90) { c.x = -90; c.y = 30 + Math.random() * (L.hor * 0.45); } }
    const T = S.T;
    if (T.dark < 0.3 && S.birds.length < 4 && Math.random() < dt * 0.06) { const y = 40 + Math.random() * L.hor * 0.4; for (let k = 0; k < 3; k++) S.birds.push({ x: -20 - k * 22, y: y + k * 9, v: 55 + Math.random() * 10, p: Math.random() * 6 }); }
    for (let i = S.birds.length - 1; i >= 0; i--) { const b = S.birds[i]; b.x += b.v * dt; if (b.x > L.W + 30) S.birds.splice(i, 1); }
    // fireflies at night, snow on the fjord, glowing plankton in the lagoon
    const want = S.lake === 3 ? 40 : T.night > 0.3 ? (S.lake === 2 ? 30 : 16) : 0;
    while (S.motes.length < want) S.motes.push({ x: Math.random() * L.W, y: S.lake === 3 ? Math.random() * L.sea : S.lake === 2 ? L.sea + 20 + Math.random() * (L.H - L.sea - 40) : L.hor - 40 + Math.random() * 90, p: Math.random() * 6, v: 0.5 + Math.random() });
    if (S.motes.length > want) S.motes.length = want;
    for (const m of S.motes) {
      m.p += dt;
      if (S.lake === 3) { m.y += 16 * m.v * dt; m.x += Math.sin(m.p) * 10 * dt; if (m.y > L.sea) { m.y = -4; m.x = Math.random() * L.W; } }
      else { m.x += Math.sin(m.p * 0.7) * 12 * dt; m.y += Math.cos(m.p * 0.9) * 8 * dt; }
    }
    S.dip *= Math.pow(0.04, dt);
    S.tilt = Math.sin(t * 1.8) * 0.06 + S.dip * 0.02;
  }

  // ---------- the fishing itself ----------
  const save = S => S.g.save('p', S.P);
  function hudUpdate(g, S) {
    const n = isNight(S.h);
    g.hud([['🪙', String(S.P.coins)], [n ? '🌙' : '☀️', clockStr(S.h)], ['📖', albCount(S.P) + '/' + SP.length]]);
  }
  function cast(g, S) {
    const a0 = S.rodA; S.rodA = -0.55;
    const R = rodGeom(S), x = castX(S, S.pow);
    S.rodA = a0;
    S.ph = 'cast';
    S.fly = { x0: R.tx, y0: R.ty, x1: x, t: 0, dur: 0.4 + S.pow * 0.45, hgt: 50 + 110 * S.pow };
    S.dist = clamp((x - S.L.castA) / (S.L.castB - S.L.castA), 0, 1);
    g.sfx('whoosh');
  }
  function toWait(S) { S.ph = 'wait'; S.app = null; S.wait = (1.8 + Math.random() * 3.6) / LURE[S.P.lure].s; }
  function spawnApproach(S) {
    const L = S.L, f = rollFish(S.P, S.lake, S.dist, isNight(S.h), Math.random), len = pxLen(f.cm);
    const side = S.bx > L.W - 220 ? -1 : S.bx < L.dockX + 220 ? 1 : Math.random() < 0.5 ? -1 : 1;
    const x = clamp(S.bx + side * (150 + Math.random() * 110), L.dockX + 40, L.W - 30);
    const y = clamp(S.hy + 20 + Math.random() * 70, L.sea + 30, L.bedY(x) - 14);
    S.app = { s: f.s, cm: f.cm, len, x, y, dir: x < S.bx ? 1 : -1, st: 'swim', nib: 0, nibN: 1 + Math.floor(Math.random() * 3), nibT: 0, poke: 0, t: 0 };
  }
  function flee(g, S, msg) {
    if (S.app) { S.app.st = 'flee'; S.app.dir = S.app.x < S.bx ? -1 : 1; S.app.t = 0; }
    if (msg) g.msg(g.t(msg), 1300, '#ffd0c4');
  }
  function reelIn(g, S) { S.ph = 'reel'; S.reelT = 0; S.rx0 = S.bx; S.ry0 = S.by; g.sfx('tick', { p: 0.7 }); }
  function hook(g, S) {
    const A = S.app, rod = ROD[S.P.rod];
    S.F = fightNew(A.s, A.cm, rod, Math.random);
    S.fish = { s: A.s, cm: A.cm, len: A.len, x: A.x, y: A.y, dir: -1, rot: 0 };
    S.fx0 = S.bx; S.fy0 = S.hy;
    S.app = null; S.ph = 'fight'; S.P.fights++; S.wasRun = false; save(S);
    g.sfx('hit'); g.shake(4);
    g.burst(S.bx, S.L.sea, { n: 16, color: ['#ffffff', '#bfe9ff'], speed: 3, gravity: 0.15, spread: 1.6, dir: -Math.PI / 2 });
    ripple(S, S.bx, 3, true);
  }
  function lost(g, S, msg, snd) {
    const f = S.fish;
    S.app = f ? { s: f.s, cm: f.cm, len: f.len, x: f.x, y: f.y, dir: 1, st: 'flee', t: 0 } : null;
    S.fish = null; S.F = null;
    g.msg(g.t(msg), 1500, '#ffb0a0'); g.sfx(snd);
    if (snd === 'break') g.shake(6);
    S.by = S.L.sea; reelIn(g, S);
  }
  function landFish(g, S) {
    const f = S.fish;
    S.ph = 'land'; S.landT = 0; S.lx0 = f.x; S.ly0 = f.y; S.F = null;
    g.sfx('splash'); g.shake(3);
    g.burst(f.x, S.L.sea, { n: 30, color: ['#ffffff', '#bfe9ff', '#7fd0ff'], speed: 4.5, gravity: 0.16, spread: 1.8, dir: -Math.PI / 2 });
    ripple(S, f.x, 3, true);
  }
  function openCard(g, S) {
    const f = S.fish, s = f.s, P = S.P, a = P.alb[s.i], isNew = !a;
    P.alb[s.i] = { n: (a ? a.n : 0) + 1, b: Math.max(a ? a.b : 0, f.cm) };
    S.card = { s, cm: f.cm, val: priceOf(s, f.cm), isNew, t0: S.anim };
    S.ph = 'card'; S.caught++; if (isNew) S.newSp++;
    const C = S.L.card;
    g.sfx(s.r >= 3 ? 'win' : s.r === 2 ? 'power' : 'score');
    if (isNew) g.after(0.45, () => g.sfx('record'));
    if (isNew || s.r >= 2) g.burst(C.x + C.w / 2, C.y + 180, { n: 40 + s.r * 12, color: [RC[s.r], '#ffffff', '#ffd84d'], speed: 6, life: 60, gravity: 0.1 });
    if (!P.done[s.lake] && albCount(P, s.lake) === 7) { P.done[s.lake] = 1; S.bonus = 250 * (s.lake + 1); }
    save(S);
  }
  function sell(g, S) {
    if (!S.card || S.anim - S.card.t0 < 0.4) return;
    const c = S.card, { sell: b } = cardLayout(S);
    S.P.coins += c.val; S.earned += c.val;
    for (let i = 0; i < Math.min(12, 3 + c.val / 8); i++) S.coins.push({ x: b.x + b.w / 2 + (Math.random() - 0.5) * 80, y: b.y + 20, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4, t: 0, d: i * 0.03 });
    g.sfx('coin'); g.after(0.12, () => g.sfx('coin', { p: 1.2 }));
    if (S.bonus) { const n = S.bonus; S.bonus = 0; S.P.coins += n; S.earned += n; g.after(0.5, () => { g.msg(g.t('lakeDone', { n: list(g, 'lake', S.lake), m: n }), 2200, '#ffd84d'); g.sfx('record'); }); }
    else if (c.isNew) g.msg(g.t('newSp'), 1200, '#bfe3ff');
    S.card = null; S.fish = null; S.ph = 'idle'; S.needRelease = true;
    save(S);
  }
  function openPanel(g, S, which) {
    if (!(S.ph === 'idle' || S.ph === 'wait' || S.ph === 'sink') || S.panel) return;
    S.panel = which; S.tab = which === 'album' ? S.lake : 0; S.sel = 0; S.panelT = S.anim; S.ptrHold = false;
    g.sfx('click'); g.noise({ f: 500, f2: 2200, dur: 0.16, vol: 0.06, filter: 'bandpass' });
  }
  function closePanel(g, S) { S.panel = null; S.needRelease = true; g.sfx('click'); }
  function shopAct(g, S, i) {
    const kind = S.tab, key = ['rod', 'lure', 'lake'][kind], items = [ROD, LURE, LAKE][kind], P = S.P;
    if (i < 0 || i >= items.length || P[key] === i) return;
    if (!P.own[key][i]) {
      const price = items[i].$;
      if (P.coins < price) { g.msg(g.t('need', { n: price - P.coins }), 1200, '#ffb0a0'); g.sfx('error'); return; }
      P.coins -= price; P.own[key][i] = 1;
      g.sfx('power'); g.msg(g.t('bought', { n: list(g, key, i) }), 1500, '#ffd84d');
      const r = panelLayout(g, S).cells[i];
      if (r) g.burst(r.btn.x + r.btn.w / 2, r.btn.y + r.btn.h / 2, { n: 26, color: ['#ffd84d', '#ffffff', '#7dffa0'], speed: 4, life: 40 });
    } else g.sfx('pop');
    P[key] = i;
    if (kind === 2) { S.lake = i; S.ph = 'idle'; S.app = null; resetWorld(S); g.flash('#ffffff', 0.35); }
    save(S);
  }
  function endDay(g, S) {
    if (S.ended) return;
    S.ended = true; S.P.days++; save(S);
    g.end({ score: S.earned, scoreLabel: g.t('earned'), title: g.t('dayOver'), text: g.t('daySum', { n: S.caught, m: S.newSp }), result: 'win' });
  }
  function stepFish(g, S, dt) {
    const L = S.L, rod = ROD[S.P.rod];
    S.anim += dt; S.t += dt;
    S.T = tod(S.h);
    let raw = g.key('Space') || g.key('Enter') || g.key('NumpadEnter') || S.ptrHold || S.botHold;
    if (S.needRelease) { if (!raw) S.needRelease = false; raw = false; }
    // a press counts even when the button went down and up between two steps (a very quick click or tap)
    const quick = S.ptrPress || g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter');
    S.ptrPress = false;
    const hold = raw && !S.panel && !S.card, pressed = !S.panel && !S.card && !S.needRelease && ((hold && !S.prevHold) || (quick && !S.prevHold));
    S.prevHold = hold;
    updateWorld(g, S, dt);
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i]; c.t += dt; if (c.t < c.d) continue;
      const k = clamp((c.t - c.d - 0.25) / 0.45, 0, 1);
      if (k <= 0) { c.x += c.vx; c.y += c.vy; c.vy += 0.4; } else { c.x += (24 - c.x) * k * 0.35; c.y += (24 - c.y) * k * 0.35; }
      if (c.t > c.d + 0.8) S.coins.splice(i, 1);
    }
    hudUpdate(g, S);
    if (S.panel) return;
    if (S.ph !== 'card') S.h += dt / HOUR;
    if (!S.nightSaid && hour24(S.h) >= 20.25 && S.h < 24) { S.nightSaid = true; g.msg(g.t('night'), 2200, '#bfe3ff'); g.tone({ f: 523, f2: 392, dur: 0.6, type: 'triangle', vol: 0.08 }); }
    if (S.h >= DAY1 && (S.ph === 'idle' || S.ph === 'wait' || S.ph === 'sink' || S.ph === 'reel')) { endDay(g, S); return; }
    let ra = -1.0;
    switch (S.ph) {
      case 'idle':
        if (pressed) { S.ph = 'charge'; S.pow = 0; S.powDir = 1; g.sfx('tick'); }
        break;
      case 'charge':
        S.pow += S.powDir * dt / 0.9;
        if (S.pow >= 1) { S.pow = 1; S.powDir = -1; } else if (S.pow <= 0) { S.pow = 0; S.powDir = 1; }
        ra = -1.0 - 1.05 * Math.min(1, S.pow * 2.5);
        if (!hold) cast(g, S);
        break;
      case 'cast': {
        const F = S.fly; F.t += dt; const u = Math.min(1, F.t / F.dur);
        S.bx = F.x0 + (F.x1 - F.x0) * u; S.by = F.y0 + (L.sea - F.y0) * u - Math.sin(Math.PI * u) * F.hgt;
        ra = -0.55;
        if (u >= 1) {
          S.ph = 'sink'; S.bx = F.x1; S.by = L.sea; S.hy = L.sea + 4; S.hookY = L.hookY(S.bx);
          ripple(S, S.bx, 3, true); g.sfx('splash');
          g.burst(S.bx, L.sea, { n: 14, color: ['#ffffff', '#cdeeff'], speed: 2.6, gravity: 0.14, spread: 1.4, dir: -Math.PI / 2 });
        }
        break;
      }
      case 'sink':
        ra = -0.85;
        S.hy += (S.hookY - S.hy) * Math.min(1, dt * 2.6);
        if (pressed) reelIn(g, S);
        else if (S.hookY - S.hy < 3) toWait(S);
        break;
      case 'wait': {
        ra = -0.85;
        const A = S.app;
        if (pressed) { if (A && A.st === 'nib') { flee(g, S, 'tooEarly'); g.sfx('error'); toWait(S); S.app = A; } else { flee(g, S); reelIn(g, S); } break; }
        if (!A || A.st === 'flee') { if ((S.wait -= dt) <= 0) spawnApproach(S); break; }
        const tx = S.bx - A.dir * (A.len * 0.5 + 3), ty = S.hy + 2;
        if (A.st === 'swim') {
          const dx = tx - A.x, dy = ty - A.y, d = Math.hypot(dx, dy), v = 50 + A.len * 0.35;
          if (d < 2.5) { A.st = 'nib'; A.nibT = 0.45 + Math.random() * 0.5; }
          else { A.x += dx / d * Math.min(d, v * dt); A.y += dy / d * Math.min(d, v * dt); }
        } else if (A.st === 'nib') {
          A.poke = Math.max(0, A.poke - dt * 3);
          if ((A.nibT -= dt) <= 0) {
            if (A.nib < A.nibN) { A.nib++; A.poke = 1; S.dip = 5; ripple(S, S.bx, 1, false); g.sfx('tick', { p: 0.75 }); A.nibT = 0.5 + Math.random() * 0.7; }
            else { S.ph = 'bite'; S.biteT = 1.05; S.dip = 16; ripple(S, S.bx, 3, true); g.sfx('pop'); g.sfx('splash'); g.burst(S.bx, L.sea, { n: 10, color: '#ffffff', speed: 2, gravity: 0.12, spread: 1.4, dir: -Math.PI / 2 }); }
          }
        }
        break;
      }
      case 'bite':
        ra = -0.8; S.dip = Math.max(S.dip, 12);
        if (S.app) S.app.poke = 1;
        if (pressed) hook(g, S);
        else if ((S.biteT -= dt) <= 0) { const A = S.app; flee(g, S, 'missed'); toWait(S); S.app = A; }
        break;
      case 'fight': {
        const F = S.F, f = S.fish, res = fightStep(F, hold, rod, dt, Math.random);
        if (F.run > 0 && !S.wasRun) { g.sfx('splash'); g.shake(2); ripple(S, f.x, 2, true); g.burst(f.x, L.sea, { n: 8, color: '#ffffff', speed: 2.2, gravity: 0.14, spread: 1.2, dir: -Math.PI / 2 }); }
        S.wasRun = F.run > 0;
        if (hold) { S.spin += dt * 16; if ((S.clickT = (S.clickT || 0) - dt) <= 0) { S.clickT = 0.11; g.sfx('tick', { p: 1.1 + (1 - clamp(F.D, 0, 1)) * 0.6 }); } }
        if (F.zone === 2 && (S.creakT = (S.creakT || 0) - dt) <= 0) { S.creakT = 0.28; g.tone({ f: 210, f2: 150, dur: 0.14, type: 'sawtooth', vol: 0.035 }); }
        const k = clamp(F.D / 0.45, 0, 2.2), x0 = L.dockX + 34;
        const tx = clamp(x0 + (S.fx0 - x0) * k, x0, L.W - 30), ty = L.sea + 26 + (S.fy0 - L.sea - 26) * clamp(k, 0, 1) + Math.sin(S.t * 3) * 10 * F.st;
        f.x += (tx - f.x) * Math.min(1, dt * 4) + (F.run > 0 ? Math.sin(S.t * 40) * 1.2 : 0);
        f.y += (ty - f.y) * Math.min(1, dt * 3);
        f.dir = F.run > 0 ? 1 : -1;
        S.bx += (f.x - S.bx) * Math.min(1, dt * 6); S.by = L.sea - 1;
        ra = -0.72 + F.T * 0.12;
        if (res === 'caught') landFish(g, S);
        else if (res === 'snap') lost(g, S, 'snapped', 'break');
        else if (res === 'escape') lost(g, S, 'escaped', 'whoosh');
        break;
      }
      case 'land': {
        const f = S.fish, R = rodGeom(S), u = Math.min(1, (S.landT += dt) / 0.7);
        f.x = S.lx0 + (R.tx - S.lx0) * u; f.y = S.ly0 + (R.ty + 34 - S.ly0) * u - Math.sin(Math.PI * u) * 90; f.rot = -0.9 * u; f.dir = -1;
        ra = -1.25;
        if (u >= 1) openCard(g, S);
        break;
      }
      case 'card': ra = -1.1; break;
      case 'reel': {
        const R = rodGeom(S), u = Math.min(1, (S.reelT += dt) / 0.45);
        S.bx = S.rx0 + (R.tx - S.rx0) * u; S.by = S.ry0 + (R.ty + 26 - S.ry0) * u - Math.sin(Math.PI * u) * 30; S.hy = S.by;
        S.spin += dt * 20;
        if (u >= 1) S.ph = 'idle';
        break;
      }
    }
    if (S.app && S.app.st === 'flee') { const A = S.app; A.x += A.dir * 170 * dt; A.y += 15 * dt; if ((A.t += dt) > 1.6 && S.app === A) S.app = null; }
    if (S.ph === 'wait' || S.ph === 'sink' || S.ph === 'bite') S.by = L.sea - 1 + Math.sin(S.t * 2.2) * 1.4 + S.dip;
    S.rodA += (ra - S.rodA) * Math.min(1, dt * (S.ph === 'cast' ? 20 : 9));
  }

  // ---------- state, drawing order, registration ----------
  function newState(g, demo) {
    const P = (g.s && g.s.P) || loadP(g), L = layout(g.W, g.H);
    const S = {
      g, P, L, demo, lake: P.lake, ph: demo ? 'demo' : 'idle', h: demo ? 17.7 : DAY0, anim: 0, t: 0, rodA: -1, pow: 0, powDir: 1,
      bx: 0, by: L.sea, hy: L.sea, hookY: L.sea, dip: 0, tilt: 0, spin: 0, dist: 0.5, app: null, F: null, fish: null, card: null,
      caught: 0, earned: 0, newSp: 0, panel: null, tab: 0, sel: 0, panelT: 0, hover: null, ptrHold: false, botHold: false, prevHold: false, needRelease: false,
      coins: [], bonus: 0, nightSaid: false, ended: false,
    };
    S.T = tod(S.h);
    resetWorld(S);
    if (demo) { S.bx = castX(S, 0.7); S.hy = L.hookY(S.bx); }
    return S;
  }
  function glowOf(ctx, f, T, t) {
    if (!f || !f.s.glow) return;
    const r = f.len * 0.95, a = 0.16 + 0.32 * T.night + 0.06 * Math.sin(t * 3);
    const gr = ctx.createRadialGradient(f.x, f.y, f.len * 0.05, f.x, f.y, r);
    gr.addColorStop(0, hexA(f.s.glow, a)); gr.addColorStop(1, hexA(f.s.glow, 0));
    ctx.fillStyle = gr; ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
  }
  function drawWorld(g, ctx, S, T, t) {
    const L = S.L, cache = {};
    const tc = h => cache[h] || (cache[h] = css(mixA(mixA(rgb(h), [255, 150, 100], T.warm * 0.22), [10, 16, 44], T.dark * 0.82)));
    drawSky(g, ctx, S, T, t);
    drawScenery(g, ctx, S, tc, t);
    drawBand(g, ctx, S, T, tc, t);
    drawUnder(g, ctx, S, T, tc, t);
    for (const f of S.amb) drawFish(ctx, f.s, f.x, f.y, f.len, f.dir, t + f.p, {});
    if (S.app) drawFish(ctx, S.app.s, S.app.x + S.app.dir * (S.app.poke || 0) * 5, S.app.y, S.app.len, S.app.dir, t * 1.4, { fast: S.app.st !== 'swim' });
    if (S.fish && S.ph === 'fight') drawFish(ctx, S.fish.s, S.fish.x, S.fish.y, S.fish.len, S.fish.dir, t, { fast: true });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
    for (const b of S.bub) { g.circle(ctx, b.x + Math.sin(b.p) * 2, b.y, b.r); ctx.stroke(); }
    drawWaterTint(g, ctx, S, T);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of S.amb) glowOf(ctx, f, T, t);
    glowOf(ctx, S.app, T, t);
    if (S.ph === 'fight') glowOf(ctx, S.fish, T, t);
    if (S.lake === 2 && T.night > 0.3) for (const m of S.motes) { ctx.fillStyle = 'rgba(90,255,240,' + (0.35 + 0.35 * Math.sin(m.p * 3)) * T.night + ')'; ctx.fillRect(m.x, m.y, 2.4, 2.4); }
    ctx.restore();
    drawSurface(g, ctx, S, T, t);
    drawDock(g, ctx, S, T, tc, t);
    if (S.ph === 'land' && S.fish) drawFish(ctx, S.fish.s, S.fish.x, S.fish.y, S.fish.len, S.fish.dir, t, { fast: true, rot: S.fish.rot, glow: true });
    drawKid(g, ctx, S, T, tc, t);
    if (!S.noLine) drawLine(g, ctx, S, T, t);
    if (T.night > 0.15) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lx = L.dockX - 12 * L.k, ly = L.dockY - 86 * L.k, gr = ctx.createRadialGradient(lx, ly, 4, lx, ly, 150);
      gr.addColorStop(0, 'rgba(255,200,110,' + 0.5 * T.night + ')'); gr.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = gr; ctx.fillRect(lx - 150, ly - 150, 300, 300);
      ctx.fillStyle = 'rgba(255,200,110,' + 0.25 * T.night + ')';
      for (let i = 0; i < 6; i++) ctx.fillRect(lx - 14 + Math.sin(t * 2 + i) * 6, L.sea + 6 + i * 7, 28 - i * 3, 2);
      if (S.lake < 2) for (const m of S.motes) { ctx.fillStyle = 'rgba(220,255,120,' + (0.3 + 0.5 * Math.max(0, Math.sin(m.p * 2.3))) * T.night + ')'; g.circle(ctx, m.x, m.y, 2.2); ctx.fill(); }
      ctx.restore();
    }
    if (S.lake === 3) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const m of S.motes) { g.circle(ctx, m.x, m.y, 1.2 + m.v); ctx.fill(); } }
  }

  GK.register('fishing', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 1000 : 600; },
    bg: '#123049', accent: '#ffd451',
    fmt: v => v + ' 🪙',
    text: TEXT,
    setup(g) { g.s = { P: loadP(g) }; },
    init(g) {
      g.s = newState(g, g.demo);
      if (!g.demo) { g.msg(g.t('dayN', { n: g.s.P.days + 1 }), 1700, '#ffe9a0'); hudUpdate(g, g.s); }
    },
    step(g) { stepFish(g, g.s, 1 / 60); },
    idle(g) {
      const S = g.s; if (!S || !S.L) return;
      S.t += 1 / 60; S.anim += 1 / 60; S.T = tod(S.h);
      updateWorld(g, S, 1 / 60);
      if (S.ph === 'demo') S.by = S.L.sea - 1 + Math.sin(S.t * 2.2) * 1.4;
    },
    draw(g, ctx) {
      const S = g.s; if (!S || !S.L) return;
      const T = S.T || tod(S.h), t = S.t;
      drawWorld(g, ctx, S, T, t);
      if (S.demo) return;
      drawHud(g, ctx, S, t);
      for (const c of S.coins) if (c.t >= c.d) coinIcon(g, ctx, c.x, c.y, 9);
      if (S.ph === 'card' && S.card) drawCard(g, ctx, S, t);
      if (S.panel) drawPanel(g, ctx, S, t);
    },
    // test player: casts to a random distance, strikes 0.28 s after the bite, reels like a careful kid, sells, and spends its coins
    bot(g) {
      const S = g.s; if (!S || S.demo) return;
      if (S.ph === 'card') { if (S.anim - S.card.t0 > 0.9) sell(g, S); return; }
      if (S.panel) { closePanel(g, S); return; }
      if (S.ph === 'idle' && !S.needRelease && !S.botNoShop) {
        const P = S.P;
        for (const [kind, key, items] of [[0, 'rod', ROD], [1, 'lure', LURE], [2, 'lake', LAKE]]) {
          const i = P.own[key].indexOf(0);
          if (i > 0 && P.coins >= items[i].$) { openPanel(g, S, 'shop'); S.tab = kind; shopAct(g, S, i); closePanel(g, S); return; }
        }
      }
      switch (S.ph) {
        case 'idle': S.botHold = !S.needRelease; S.botAim = 0.45 + Math.random() * 0.5; break;
        case 'charge': S.botHold = !(S.powDir > 0 && S.pow >= S.botAim); break;
        case 'bite': S.botHold = 1.05 - S.biteT > 0.28; break;
        case 'fight': S.botHold = fightBot(S.F); break;
        default: S.botHold = false;
      }
    },
    onKey(g, e) {
      const S = g.s; if (!S || S.demo || e.repeat) return;
      const c = e.code, ok = c === 'Enter' || c === 'Space' || c === 'NumpadEnter';
      if (S.ph === 'card') { if (ok) sell(g, S); return; }
      if (S.panel) {
        const nt = S.panel === 'shop' ? 3 : 4;
        if (c === 'Backspace' || c === 'KeyX' || (c === 'KeyS' && S.panel === 'shop') || (c === 'KeyA' && S.panel === 'album')) closePanel(g, S);
        else if (c === 'ArrowLeft' || c === 'ArrowRight') { S.tab = (S.tab + ((c === 'ArrowRight') !== g.rtl ? 1 : -1) + nt) % nt; S.sel = 0; g.sfx('tick'); }
        else if (S.panel === 'shop' && (c === 'ArrowUp' || c === 'ArrowDown')) { const n = S.tab === 2 ? 4 : 5; S.sel = (S.sel + (c === 'ArrowDown' ? 1 : -1) + n) % n; g.sfx('tick'); }
        else if (ok) { if (S.panel === 'shop') shopAct(g, S, S.sel); else closePanel(g, S); }
        return;
      }
      if (c === 'KeyS' || c === 'KeyB') openPanel(g, S, 'shop');
      else if (c === 'KeyA' || c === 'KeyC') openPanel(g, S, 'album');
    },
    onPointer(g, type, p) {
      const S = g.s; if (!S || S.demo) return;
      if (type === 'move') { if (p.kind !== 'touch') S.hover = hoverAt(g, S, p); return; }
      if (type === 'up') { S.ptrHold = false; return; }
      if (p.button > 0) return;
      if (S.ph === 'card') { sell(g, S); return; }
      if (S.panel) {
        const Y = panelLayout(g, S);
        if (inR(p, Y.close) || !inR(p, Y.P)) { closePanel(g, S); return; }
        for (let i = 0; i < Y.tabs.length; i++) if (inR(p, Y.tabs[i])) { S.tab = i; S.sel = 0; g.sfx('tick'); return; }
        if (S.panel === 'shop') for (let i = 0; i < Y.cells.length; i++) {
          if (inR(p, Y.cells[i].btn)) { S.sel = i; shopAct(g, S, i); return; }
          if (inR(p, Y.cells[i])) { S.sel = i; g.sfx('tick'); return; }
        }
        return;
      }
      if (inR(p, S.L.btnShop)) { openPanel(g, S, 'shop'); return; }
      if (inR(p, S.L.btnAlbum)) { openPanel(g, S, 'album'); return; }
      S.ptrHold = true; S.ptrPress = true;
    },
    onPause(g) { if (g.s) { g.s.ptrHold = false; g.s.botHold = false; } },
    destroy(g) { if (g.s && g.s.P && !g.s.demo) save(g.s); },
    cover(ctx, w, h, k) {
      const S = { P: freshP(), L: layout(960, 600), lake: 0, h: 18.3, t: 2.2, anim: 2.2, ph: 'fight', rodA: -0.7, pow: 0, dip: 0, tilt: 0, spin: 1, caught: 3, bx: 640, by: 252, hy: 300, rip: [], bub: [], motes: [], coins: [] };
      S.P.rod = 2; S.T = tod(S.h); S.deco = makeDeco(S.L, 0); S.F = { T: 0.75 };
      S.clouds = [{ x: 160, y: 70, s: 1.1 }, { x: 470, y: 46, s: 0.8 }, { x: 820, y: 96, s: 1 }];
      S.birds = [{ x: 300, y: 80, p: 0 }, { x: 322, y: 90, p: 1 }, { x: 344, y: 84, p: 2 }];
      S.amb = [[0, 420, 450, 1], [5, 300, 550, 1], [1, 820, 490, -1], [2, 900, 590, -1]].map(a => ({ s: SP[a[0]], x: a[1], y: a[2], len: pxLen(SP[a[0]].cm[1] * 0.8), dir: a[3], p: a[0] }));
      S.noLine = true;
      const cam = () => { ctx.translate(-38, -52); ctx.scale(1.1, 1.1); };
      ctx.save(); cam();
      drawWorld(k, ctx, S, S.T, S.t);
      ctx.restore();
      ctx.save(); cam();
      const R = rodGeom(S), fx = 640, fy = 150, s = SP[6];
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(R.tx, R.ty); ctx.quadraticCurveTo(420, 70, 538, 106); ctx.stroke();
      for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (i / 25 - 0.5) * 2.4, d = 40 + (i * 37) % 70; k.circle(ctx, fx + Math.cos(a) * d * 1.4, 250 + Math.sin(a) * d * 0.9, 3 + (i % 4)); ctx.fillStyle = 'rgba(225,245,255,.85)'; ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(fx, 254, 90, 14, 0, 0, Math.PI * 2); ctx.stroke();
      drawFish(ctx, s, fx, fy, 230, -1, 1.2, { glow: true, rot: 0.42 });
      ctx.restore();
      const gr = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
    dev: { SP, ROD, LURE, LAKE, rollFish, fightNew, fightStep, fightBot, priceOf, freshP, layout, tod, panelLayout, cardLayout },
  });
})();
