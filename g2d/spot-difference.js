// ============================================================
//  מצא את ההבדלים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שתי תמונות שמצוירות מהקוד (פארק, חדר, חוף, מטבח, חלל) מאותו זרע. בכל שלב 5–7 הבדלים:
//  חפץ שנעלם, צבע אחר, זז, הפוך במראה או בגודל אחר. לוחצים על הבדל באחת התמונות והוא מסומן בשתיהן.
//  טעות עולה 5 שניות. 30 שלבים, רמזים ושעון. כל הבדל נבחר רק אם הוא גדול מספיק, בניגוד מספיק לרקע,
//  משנה בפועל מספיק פיקסלים (נמדד בציור עצמו) ולא נוגע בהבדל אחר — והבדיקות מוכיחות את זה שוב
//  בפיקסלים על כל 30 השלבים (g2dtools/tests/spot-difference/pixels.mjs).
// ============================================================
(function () {
  'use strict';
  const LEVELS = 30, SW = 480, SH = 400, PI2 = Math.PI * 2, PENALTY = 5, HINTS = 3;
  const THEME_ORDER = ['park', 'room', 'beach', 'kitchen', 'space'];
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;
  const nDiffs = n => (n <= 10 ? 5 : n <= 20 ? 6 : 7);
  const timeFor = n => (n <= 10 ? 120 : n <= 20 ? 110 : 100);

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // מרחק צבעים (משוקלל לעין): מעל ~200 = צבעים שונים לגמרי
  const cdist = (a, b) => { const p = rgb(a), q = rgb(b); return Math.sqrt(2 * (p[0] - q[0]) ** 2 + 4 * (p[1] - q[1]) ** 2 + 3 * (p[2] - q[2]) ** 2); };
  const rgba = (h, a) => { const p = rgb(h); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; };

  // ----- ספריית החפצים: חצי רוחב, חצי גובה (ביחס לגודל), a = לא סימטרי (אפשר מראה), r = אפשר צבע אחר -----
  const TY = {
    ball: [0.5, 0.5, 'r'], star: [0.5, 0.48, 'r'], flower: [0.32, 0.52, 'r'], balloon: [0.32, 0.5, 'r'], bird: [0.5, 0.33, 'ar'],
    cat: [0.44, 0.5, 'ar'], dog: [0.5, 0.4, 'ar'], fish: [0.5, 0.3, 'ar'], cup: [0.44, 0.4, 'ar'], plant: [0.38, 0.5, 'r'],
    clock: [0.5, 0.5, 'r'], frame: [0.5, 0.4, 'ar'], lamp: [0.32, 0.5, 'r'], books: [0.46, 0.36, 'r'], teddy: [0.4, 0.5, 'r'],
    duck: [0.5, 0.42, 'ar'], car: [0.5, 0.32, 'r'], cushion: [0.5, 0.32, 'r'], butterfly: [0.48, 0.38, 'r'], kite: [0.34, 0.5, 'a'],
    tree: [0.44, 0.5, 'r'], pine: [0.38, 0.5, ''], bush: [0.5, 0.3, 'r'], bench: [0.5, 0.28, 'r'], mushroom: [0.46, 0.44, 'r'],
    sun: [0.5, 0.5, ''], cloud: [0.5, 0.32, ''], umbrella: [0.5, 0.5, 'ar'], castle: [0.46, 0.48, 'a'], bucket: [0.34, 0.46, 'r'],
    shell: [0.46, 0.4, 'r'], starfish: [0.5, 0.48, 'r'], crab: [0.5, 0.36, 'r'], palm: [0.46, 0.5, 'a'], boat: [0.5, 0.48, 'ar'],
    icecream: [0.3, 0.5, ''], planet: [0.5, 0.5, 'r'], ringed: [0.62, 0.36, 'ar'], moon: [0.5, 0.5, 'a'], rocket: [0.4, 0.48, 'a'],
    ufo: [0.5, 0.3, 'r'], astronaut: [0.42, 0.5, 'a'], satellite: [0.5, 0.32, ''], comet: [0.5, 0.26, 'a'], alien: [0.36, 0.5, 'r'],
    asteroid: [0.5, 0.48, ''], pot: [0.5, 0.36, 'r'], kettle: [0.5, 0.42, 'ar'], apple: [0.42, 0.46, 'r'], pear: [0.32, 0.48, 'r'],
    jar: [0.3, 0.46, ''], pan: [0.6, 0.3, 'a'], cupcake: [0.36, 0.46, 'r'],
  };
  const SZ = {
    ball: [32, 46], star: [32, 46], flower: [36, 48], balloon: [38, 54], bird: [36, 50], cat: [44, 60], dog: [50, 66], fish: [40, 56], cup: [36, 46], plant: [44, 60],
    clock: [46, 62], frame: [60, 84], lamp: [60, 84], books: [44, 58], teddy: [48, 64], duck: [38, 50], car: [48, 62], cushion: [48, 62], butterfly: [34, 46], kite: [46, 62],
    tree: [82, 106], pine: [74, 98], bush: [56, 76], bench: [66, 86], mushroom: [34, 46], sun: [66, 80], cloud: [66, 100], umbrella: [66, 88], castle: [60, 78], bucket: [36, 48],
    shell: [32, 44], starfish: [36, 50], crab: [42, 56], palm: [90, 112], boat: [62, 78], icecream: [40, 54], planet: [46, 78], ringed: [58, 82], moon: [52, 70], rocket: [56, 76],
    ufo: [58, 74], astronaut: [54, 70], satellite: [56, 74], comet: [58, 80], alien: [46, 60], asteroid: [32, 50], pot: [52, 66], kettle: [48, 60], apple: [32, 42], pear: [36, 46],
    jar: [40, 54], pan: [54, 68], cupcake: [38, 50],
  };
  const VIVID = ['#e8323c', '#3d7cff', '#2ecc71', '#ffd23a', '#9b59ff', '#ff8a1f', '#ff6fb5', '#18c4c4'];
  const COLS = {
    star: ['#ffd23a', '#ff8a1f', '#ff6fb5', '#5ec8ff'], flower: ['#ff6fb5', '#e8323c', '#ffd23a', '#9b59ff', '#ffffff', '#ff8a1f'], bird: ['#3d7cff', '#e8323c', '#ffd23a', '#2b2f36', '#ff8a1f'],
    cat: ['#ff9f43', '#8a8f99', '#2b2f36', '#f4f6fa', '#b5651d'], dog: ['#b5651d', '#e9c48f', '#8a5a36', '#f4f6fa'], fish: ['#ff8a1f', '#5ec8ff', '#ffd23a', '#ff6fb5', '#e8323c'],
    plant: ['#d2693c', '#3d7cff', '#f4f6fa', '#ffd23a', '#9b59ff'], frame: ['#8a5a36', '#ffd23a', '#2b2f36', '#e8323c', '#3d7cff'], teddy: ['#b5651d', '#d9a066', '#f4f6fa', '#ff9fc8'],
    duck: ['#ffd23a', '#f4f6fa', '#ff8a1f'], tree: ['#4fb043', '#3d9a3a', '#6cc04a', '#2f8a3f'], pine: ['#2f7d4a', '#2a6e43', '#3a8f55'], bush: ['#3f9a3a', '#4fb043', '#2f8a3f'],
    bench: ['#b5651d', '#8a5a36', '#3d7cff', '#e8323c'], mushroom: ['#e8323c', '#ff8a1f', '#9b59ff', '#8a5a36'], sun: ['#ffd23a'], cloud: ['#ffffff'], castle: ['#e8c37a'],
    shell: ['#ffb3c7', '#ffe0b3', '#f4f6fa', '#ffcf9a'], starfish: ['#ff8a1f', '#ff6fb5', '#e8323c', '#ffd23a'], crab: ['#e8323c', '#ff8a1f'], palm: ['#3fae4a'],
    icecream: ['#ff9fc8', '#7be0ff', '#f4f6fa', '#a0522d', '#9be070'], planet: ['#ff8a1f', '#5ec8ff', '#ff6fb5', '#9b59ff', '#2ecc71', '#e8323c'], ringed: ['#ffd23a', '#ff9fc8', '#7be0ff', '#c49bff'],
    moon: ['#fff3b0', '#f4f6fa'], ufo: ['#9aa5b0', '#5ec8ff', '#2ecc71', '#ff6fb5'], astronaut: ['#ffd23a', '#5ec8ff', '#ff8a1f'], satellite: ['#ffd23a', '#c0c7cf', '#ff8a1f'],
    comet: ['#7be0ff', '#ffd23a', '#ff9fc8'], alien: ['#7be07b', '#5ec8ff', '#c49bff'], asteroid: ['#9a8f86', '#8a8f99', '#a0846c'], pot: ['#e8323c', '#3d7cff', '#c0c7cf', '#2ecc71', '#ff8a1f'],
    kettle: ['#e8323c', '#c0c7cf', '#ffd23a', '#5ec8ff', '#2ecc71'], apple: ['#e8323c', '#7bd34a', '#ffd23a'], pear: ['#b5d84a', '#ffd23a', '#9be070'], pan: ['#2b2f36', '#3a3f47'],
    cupcake: ['#ff9fc8', '#7be0ff', '#f4f6fa', '#a0522d', '#ffd23a'],
  };
  // how much of the box the main colour covers: a colour change must repaint at least MIN_AREA of the picture
  const COVER = { ball: 0.55, star: 0.45, flower: 0.35, balloon: 0.6, bird: 0.6, cat: 0.6, dog: 0.55, fish: 0.6, cup: 0.6, plant: 0.3, clock: 0.45, frame: 0.35, lamp: 0.3, books: 0.45, teddy: 0.6, duck: 0.65, car: 0.45, cushion: 0.8, butterfly: 0.55, tree: 0.6, bush: 0.6, bench: 0.4, mushroom: 0.45, bucket: 0.55, shell: 0.6, starfish: 0.45, crab: 0.45, boat: 0.2, planet: 0.7, ringed: 0.35, ufo: 0.45, alien: 0.5, pot: 0.6, kettle: 0.6, apple: 0.7, pear: 0.65, cupcake: 0.4 };
  const MIN_AREA = 600;
  // natural colours for things that only come in some colours (an autumn tree, a ginger cat, a green pear)
  const ALT = { tree: ['#ff8a1f', '#e8323c', '#ffd23a'], bush: ['#ff8a1f', '#e8323c', '#ffd23a', '#9b59ff'], cat: COLS.cat, dog: COLS.dog, teddy: COLS.teddy, duck: COLS.duck, apple: ['#e8323c', '#7bd34a', '#ffd23a', '#ff8a1f'], pear: ['#e8323c', '#7bd34a', '#ffd23a', '#ff8a1f'], crab: ['#e8323c', '#ff8a1f', '#9b59ff'], shell: ['#ffb3c7', '#ffe0b3', '#f4f6fa', '#ffcf9a', '#9b59ff', '#5ec8ff'] };
  const RECOL = ['#e8323c', '#3d7cff', '#2ecc71', '#ffd23a', '#9b59ff', '#ff8a1f', '#ff6fb5', '#18c4c4', '#f4f6fa', '#2b2f36', '#8a5a36'];

  // ----- עזרים לציור -----
  function ol(X, s) { X.strokeStyle = 'rgba(28,22,38,.8)'; X.lineWidth = Math.max(1.4, s * 0.045); X.lineJoin = 'round'; X.lineCap = 'round'; }
  function fs(X, f) { X.fillStyle = f; X.fill(); X.stroke(); }
  function el(X, x, y, rx, ry, rot) { X.beginPath(); X.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, PI2); }
  function rg(X, g, c, x, y, r) { const q = X.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05); q.addColorStop(0, g.shade(c, 0.42)); q.addColorStop(0.55, c); q.addColorStop(1, g.shade(c, -0.25)); return q; }
  function lg(X, g, c, y0, y1) { const q = X.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, g.shade(c, 0.3)); q.addColorStop(0.5, c); q.addColorStop(1, g.shade(c, -0.22)); return q; }
  function poly(X, pts) { X.beginPath(); for (let i = 0; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]); X.closePath(); }
  function star5(X, r, ri) { X.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? ri : r; X.lineTo(Math.cos(a) * q, Math.sin(a) * q); } X.closePath(); }
  // כמה עיגולים שנראים כגוף אחד: קודם קו מתאר עבה לכולם, אחר כך המילוי
  function blob(X, g, s, circles, c) {
    ol(X, s); X.lineWidth *= 2;
    for (const [x, y, r] of circles) { el(X, x * s, y * s, r * s, r * s); X.stroke(); }
    for (const [x, y, r] of circles) { el(X, x * s, y * s, r * s, r * s); X.fillStyle = rg(X, g, c, x * s, y * s, r * s); X.fill(); }
    ol(X, s);
  }
  const shadow = (X, s, y, w) => { X.fillStyle = 'rgba(0,0,0,.16)'; el(X, 0, y * s, w * s, s * 0.05); X.fill(); };
  const eye = (X, x, y, r) => { el(X, x, y, r, r); X.fillStyle = '#1b1d22'; X.fill(); el(X, x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.35); X.fillStyle = '#fff'; X.fill(); };

  // כל ציור במערכת שבה (0,0) מרכז החפץ ו-s הגודל שלו. k = הצבע הראשי, k2 = צבע משני
  const DRAW = {
    ball(X, g, s, k, k2) {
      const r = s * 0.47;
      el(X, 0, 0, r, r); fs(X, rg(X, g, k, 0, 0, r));
      X.save(); el(X, 0, 0, r, r); X.clip();
      X.fillStyle = 'rgba(255,255,255,.92)'; el(X, -r * 0.12, 0, r * 0.26, r * 1.2); X.fill();
      X.fillStyle = k2; el(X, r * 0.62, 0, r * 0.24, r * 1.2); X.fill();
      X.restore(); el(X, 0, 0, r, r); X.stroke();
      X.fillStyle = 'rgba(255,255,255,.6)'; el(X, -r * 0.42, -r * 0.45, r * 0.18, r * 0.11, -0.6); X.fill();
    },
    star(X, g, s, k) {
      star5(X, s * 0.47, s * 0.21); fs(X, rg(X, g, k, 0, 0, s * 0.45));
      eye(X, -s * 0.07, -s * 0.03, s * 0.035); eye(X, s * 0.07, -s * 0.03, s * 0.035);
      X.beginPath(); X.arc(0, s * 0.04, s * 0.06, 0.3, Math.PI - 0.3); X.stroke();
    },
    flower(X, g, s, k) {
      X.strokeStyle = '#2f8a3f'; X.lineWidth = s * 0.07; X.lineCap = 'round';
      X.beginPath(); X.moveTo(0, s * 0.5); X.quadraticCurveTo(s * 0.05, s * 0.15, 0, -s * 0.1); X.stroke();
      X.fillStyle = '#3fae4a'; el(X, s * 0.11, s * 0.24, s * 0.13, s * 0.05, -0.5); X.fill();
      ol(X, s);
      for (let i = 0; i < 6; i++) { const a = i * PI2 / 6; el(X, Math.cos(a) * s * 0.16, -s * 0.25 + Math.sin(a) * s * 0.16, s * 0.12, s * 0.12); fs(X, rg(X, g, k, Math.cos(a) * s * 0.16, -s * 0.25 + Math.sin(a) * s * 0.16, s * 0.12)); }
      el(X, 0, -s * 0.25, s * 0.09, s * 0.09); fs(X, '#ffd23a');
    },
    balloon(X, g, s, k) {
      X.strokeStyle = '#6b6f78'; X.lineWidth = 1.5;
      X.beginPath(); X.moveTo(0, s * 0.22); X.quadraticCurveTo(-s * 0.12, s * 0.36, s * 0.06, s * 0.5); X.stroke();
      ol(X, s);
      poly(X, [-s * 0.05, s * 0.27, s * 0.05, s * 0.27, 0, s * 0.2]); fs(X, k);
      el(X, 0, -s * 0.13, s * 0.29, s * 0.35); fs(X, rg(X, g, k, 0, -s * 0.13, s * 0.35));
      X.fillStyle = 'rgba(255,255,255,.55)'; el(X, -s * 0.12, -s * 0.27, s * 0.06, s * 0.11, 0.4); X.fill();
    },
    bird(X, g, s, k) {
      poly(X, [-s * 0.26, -s * 0.02, -s * 0.5, -s * 0.15, -s * 0.46, s * 0.1]); fs(X, g.shade(k, -0.2));
      el(X, -s * 0.04, s * 0.05, s * 0.3, s * 0.17); fs(X, rg(X, g, k, 0, 0, s * 0.3));
      el(X, s * 0.26, -s * 0.06, s * 0.14, s * 0.14); fs(X, rg(X, g, k, s * 0.26, -s * 0.06, s * 0.14));
      poly(X, [s * 0.38, -s * 0.1, s * 0.5, -s * 0.04, s * 0.38, s * 0.01]); fs(X, '#ff9f1a');
      X.beginPath(); X.moveTo(-s * 0.14, 0); X.quadraticCurveTo(-s * 0.04, -s * 0.36, s * 0.12, -s * 0.3); X.quadraticCurveTo(s * 0.06, -s * 0.08, -s * 0.14, 0); fs(X, g.shade(k, 0.28));
      eye(X, s * 0.3, -s * 0.1, s * 0.035);
    },
    cat(X, g, s, k) {
      const dk = g.shade(k, -0.35);
      X.strokeStyle = 'rgba(28,22,38,.8)'; X.lineWidth = s * 0.11; X.lineCap = 'round';
      X.beginPath(); X.moveTo(-s * 0.18, s * 0.4); X.quadraticCurveTo(-s * 0.5, s * 0.32, -s * 0.36, -s * 0.02); X.stroke();
      X.strokeStyle = k === '#2b2f36' ? '#4a4f58' : dk; X.lineWidth = s * 0.065;
      X.beginPath(); X.moveTo(-s * 0.18, s * 0.4); X.quadraticCurveTo(-s * 0.5, s * 0.32, -s * 0.36, -s * 0.02); X.stroke();
      ol(X, s);
      el(X, -s * 0.04, s * 0.21, s * 0.26, s * 0.27); fs(X, rg(X, g, k, -s * 0.04, s * 0.2, s * 0.3));
      for (const ex of [-0.08, 0.2]) { poly(X, [s * (ex - 0.08), -s * 0.3, s * ex, -s * 0.49, s * (ex + 0.09), -s * 0.33]); fs(X, k); }
      el(X, s * 0.07, -s * 0.22, s * 0.21, s * 0.18); fs(X, rg(X, g, k, s * 0.07, -s * 0.22, s * 0.21));
      el(X, s * 0.0, s * 0.27, s * 0.12, s * 0.15); X.fillStyle = 'rgba(255,255,255,.28)'; X.fill();
      eye(X, s * 0.0, -s * 0.24, s * 0.04); eye(X, s * 0.14, -s * 0.24, s * 0.04);
      poly(X, [s * 0.05, -s * 0.16, s * 0.11, -s * 0.16, s * 0.08, -s * 0.12]); X.fillStyle = '#ff7fa0'; X.fill();
      X.lineWidth = 1; X.beginPath(); X.moveTo(s * 0.16, -s * 0.14); X.lineTo(s * 0.3, -s * 0.16); X.moveTo(s * 0.16, -s * 0.12); X.lineTo(s * 0.3, -s * 0.1); X.stroke();
    },
    dog(X, g, s, k) {
      const dk = g.shade(k, -0.3);
      X.strokeStyle = dk; X.lineWidth = s * 0.07; X.lineCap = 'round';
      X.beginPath(); X.moveTo(-s * 0.3, -s * 0.02); X.quadraticCurveTo(-s * 0.46, -s * 0.1, -s * 0.42, -s * 0.3); X.stroke();
      ol(X, s);
      for (const lx of [-0.26, -0.12, 0.1, 0.22]) { g.rr(X, s * lx - s * 0.045, s * 0.08, s * 0.09, s * 0.3, s * 0.03); fs(X, g.shade(k, -0.08)); }
      el(X, -s * 0.04, s * 0.04, s * 0.32, s * 0.17); fs(X, rg(X, g, k, -s * 0.04, 0, s * 0.32));
      g.rr(X, s * 0.1, -s * 0.1, s * 0.12, s * 0.06, 2); fs(X, '#e8323c');
      el(X, s * 0.3, -s * 0.15, s * 0.16, s * 0.15); fs(X, rg(X, g, k, s * 0.3, -s * 0.15, s * 0.16));
      el(X, s * 0.41, -s * 0.09, s * 0.08, s * 0.06); fs(X, g.shade(k, 0.35));
      el(X, s * 0.47, -s * 0.11, s * 0.03, s * 0.025); X.fillStyle = '#1b1d22'; X.fill();
      el(X, s * 0.21, -s * 0.14, s * 0.06, s * 0.14, 0.35); fs(X, dk);
      eye(X, s * 0.33, -s * 0.2, s * 0.03);
    },
    fish(X, g, s, k, k2) {
      poly(X, [-s * 0.24, 0, -s * 0.5, -s * 0.2, -s * 0.44, 0, -s * 0.5, s * 0.2]); fs(X, g.shade(k, -0.15));
      X.beginPath(); X.moveTo(-s * 0.08, -s * 0.17); X.quadraticCurveTo(s * 0.04, -s * 0.3, s * 0.14, -s * 0.17); X.closePath(); fs(X, g.shade(k, -0.15));
      el(X, s * 0.06, 0, s * 0.34, s * 0.2); fs(X, rg(X, g, k, s * 0.06, 0, s * 0.3));
      X.save(); el(X, s * 0.06, 0, s * 0.34, s * 0.2); X.clip();
      X.fillStyle = rgba(k2 === k ? '#ffffff' : k2, 0.75); X.fillRect(-s * 0.12, -s * 0.3, s * 0.07, s * 0.6); X.fillRect(s * 0.04, -s * 0.3, s * 0.07, s * 0.6);
      X.restore(); el(X, s * 0.06, 0, s * 0.34, s * 0.2); X.stroke();
      el(X, s * 0.26, -s * 0.05, s * 0.06, s * 0.06); fs(X, '#fff'); eye(X, s * 0.27, -s * 0.05, s * 0.03);
    },
    cup(X, g, s, k, k2) {
      X.strokeStyle = 'rgba(28,22,38,.8)'; X.lineWidth = s * 0.12;
      X.beginPath(); X.arc(s * 0.2, s * 0.02, s * 0.14, -Math.PI / 2, Math.PI / 2); X.stroke();
      X.strokeStyle = g.shade(k, -0.15); X.lineWidth = s * 0.06; X.stroke();
      ol(X, s);
      g.rr(X, -s * 0.36, -s * 0.3, s * 0.56, s * 0.66, s * 0.08); fs(X, lg(X, g, k, -s * 0.3, s * 0.36));
      X.fillStyle = k2; X.fillRect(-s * 0.35, s * 0.02, s * 0.54, s * 0.1);
      el(X, -s * 0.08, -s * 0.3, s * 0.27, s * 0.06); fs(X, '#5a3a22');
    },
    plant(X, g, s, k) {
      ol(X, s);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; el(X, Math.cos(a) * s * 0.2, s * 0.02 + Math.sin(a) * s * 0.24, s * 0.08, s * 0.2, a + Math.PI / 2); fs(X, i % 2 ? '#3fae4a' : '#2f8a3f'); }
      poly(X, [-s * 0.24, s * 0.08, s * 0.24, s * 0.08, s * 0.17, s * 0.48, -s * 0.17, s * 0.48]); fs(X, lg(X, g, k, s * 0.08, s * 0.48));
      g.rr(X, -s * 0.27, s * 0.04, s * 0.54, s * 0.1, s * 0.03); fs(X, g.shade(k, 0.15));
    },
    clock(X, g, s, k) {
      el(X, 0, 0, s * 0.48, s * 0.48); fs(X, rg(X, g, k, 0, 0, s * 0.48));
      el(X, 0, 0, s * 0.37, s * 0.37); fs(X, '#fbfaf5');
      X.lineWidth = Math.max(1, s * 0.03);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; X.beginPath(); X.moveTo(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28); X.lineTo(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33); X.stroke(); }
      X.lineWidth = s * 0.06; X.strokeStyle = '#2b2f36';
      X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(-Math.PI / 6) * s * 0.2, Math.sin(-Math.PI / 6) * s * 0.2); X.stroke();
      X.lineWidth = s * 0.04; X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(Math.PI * 0.95) * s * 0.29, Math.sin(Math.PI * 0.95) * s * 0.29); X.stroke();
      el(X, 0, 0, s * 0.04, s * 0.04); X.fillStyle = '#e8323c'; X.fill();
    },
    frame(X, g, s, k) {
      g.rr(X, -s * 0.48, -s * 0.38, s * 0.96, s * 0.76, s * 0.04); fs(X, lg(X, g, k, -s * 0.38, s * 0.38));
      X.save(); g.rr(X, -s * 0.38, -s * 0.28, s * 0.76, s * 0.56, 2); X.clip();
      X.fillStyle = '#9fd8ff'; X.fillRect(-s * 0.4, -s * 0.3, s * 0.8, s * 0.6);
      X.fillStyle = '#ffd23a'; el(X, s * 0.2, -s * 0.12, s * 0.08, s * 0.08); X.fill();
      X.fillStyle = '#5fb84a'; el(X, -s * 0.2, s * 0.3, s * 0.38, s * 0.24); X.fill();
      X.fillStyle = '#3f8f35'; el(X, s * 0.28, s * 0.34, s * 0.3, s * 0.16); X.fill();
      X.restore(); g.rr(X, -s * 0.38, -s * 0.28, s * 0.76, s * 0.56, 2); X.stroke();
    },
    lamp(X, g, s, k) {
      el(X, 0, s * 0.44, s * 0.2, s * 0.055); fs(X, '#4a4f58');
      g.rr(X, -s * 0.025, -s * 0.12, s * 0.05, s * 0.56, 2); fs(X, '#8a909a');
      X.fillStyle = 'rgba(255,240,170,.55)'; el(X, 0, -s * 0.08, s * 0.26, s * 0.05); X.fill();
      poly(X, [-s * 0.16, -s * 0.48, s * 0.16, -s * 0.48, s * 0.3, -s * 0.1, -s * 0.3, -s * 0.1]); fs(X, lg(X, g, k, -s * 0.48, -s * 0.1));
    },
    books(X, g, s, k, k2) {
      const bk = (x, y, w, h, c) => { g.rr(X, x * s, y * s, w * s, h * s, s * 0.04); fs(X, lg(X, g, c, y * s, (y + h) * s)); X.fillStyle = '#fbfaf5'; X.fillRect((x + w - 0.08) * s, (y + 0.04) * s, 0.06 * s, (h - 0.08) * s); X.fillStyle = 'rgba(255,255,255,.4)'; X.fillRect((x + 0.08) * s, (y + 0.04) * s, 0.04 * s, (h - 0.08) * s); };
      bk(-0.46, 0.1, 0.92, 0.24, k); bk(-0.38, -0.12, 0.8, 0.22, k2); bk(-0.42, -0.34, 0.74, 0.22, g.shade(k, 0.35));
    },
    teddy(X, g, s, k, k2) {
      const lt = g.shade(k, 0.35);
      for (const sx of [-1, 1]) { el(X, sx * s * 0.17, -s * 0.36, s * 0.09, s * 0.09); fs(X, k); el(X, sx * s * 0.17, -s * 0.36, s * 0.045, s * 0.045); X.fillStyle = lt; X.fill(); }
      for (const sx of [-1, 1]) { el(X, sx * s * 0.26, s * 0.12, s * 0.09, s * 0.14, sx * 0.4); fs(X, k); el(X, sx * s * 0.15, s * 0.4, s * 0.11, s * 0.09); fs(X, k); }
      el(X, 0, s * 0.18, s * 0.24, s * 0.26); fs(X, rg(X, g, k, 0, s * 0.18, s * 0.26));
      el(X, 0, s * 0.22, s * 0.13, s * 0.15); X.fillStyle = lt; X.fill();
      el(X, 0, -s * 0.2, s * 0.22, s * 0.2); fs(X, rg(X, g, k, 0, -s * 0.2, s * 0.22));
      el(X, 0, -s * 0.13, s * 0.09, s * 0.07); X.fillStyle = lt; X.fill();
      el(X, 0, -s * 0.15, s * 0.035, s * 0.025); X.fillStyle = '#1b1d22'; X.fill();
      eye(X, -s * 0.08, -s * 0.23, s * 0.03); eye(X, s * 0.08, -s * 0.23, s * 0.03);
      poly(X, [0, -s * 0.02, -s * 0.1, -s * 0.07, -s * 0.1, s * 0.03]); fs(X, k2); poly(X, [0, -s * 0.02, s * 0.1, -s * 0.07, s * 0.1, s * 0.03]); fs(X, k2);
    },
    duck(X, g, s, k) {
      poly(X, [-s * 0.38, s * 0.04, -s * 0.5, -s * 0.1, -s * 0.28, -s * 0.02]); fs(X, k);
      el(X, -s * 0.04, s * 0.16, s * 0.42, s * 0.24); fs(X, rg(X, g, k, -s * 0.04, s * 0.16, s * 0.4));
      el(X, s * 0.16, -s * 0.18, s * 0.2, s * 0.2); fs(X, rg(X, g, k, s * 0.16, -s * 0.18, s * 0.2));
      el(X, s * 0.37, -s * 0.12, s * 0.12, s * 0.06); fs(X, '#ff8a1f');
      X.beginPath(); X.moveTo(-s * 0.2, s * 0.1); X.quadraticCurveTo(0, s * 0.26, s * 0.16, s * 0.08); X.stroke();
      eye(X, s * 0.2, -s * 0.24, s * 0.04);
    },
    car(X, g, s, k) {
      poly(X, [-s * 0.34, -s * 0.04, -s * 0.24, -s * 0.28, s * 0.06, -s * 0.28, s * 0.18, -s * 0.04]); fs(X, g.shade(k, 0.12));
      X.fillStyle = '#9fd8ff'; poly(X, [-s * 0.27, -s * 0.07, -s * 0.21, -s * 0.23, -s * 0.1, -s * 0.23, -s * 0.1, -s * 0.07]); X.fill(); poly(X, [-s * 0.06, -s * 0.07, -s * 0.06, -s * 0.23, s * 0.04, -s * 0.23, s * 0.12, -s * 0.07]); X.fill();
      g.rr(X, -s * 0.5, -s * 0.06, s, s * 0.24, s * 0.07); fs(X, lg(X, g, k, -s * 0.06, s * 0.18));
      for (const wx of [-0.28, 0.28]) { el(X, wx * s, s * 0.2, s * 0.1, s * 0.1); fs(X, '#23262c'); el(X, wx * s, s * 0.2, s * 0.04, s * 0.04); X.fillStyle = '#c0c7cf'; X.fill(); }
      el(X, s * 0.46, s * 0.02, s * 0.03, s * 0.03); X.fillStyle = '#fff6b0'; X.fill();
    },
    cushion(X, g, s, k, k2) {
      g.rr(X, -s * 0.47, -s * 0.29, s * 0.94, s * 0.58, s * 0.2); fs(X, rg(X, g, k, 0, 0, s * 0.5));
      X.save(); X.setLineDash([3, 3]); X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = 1.5; g.rr(X, -s * 0.38, -s * 0.2, s * 0.76, s * 0.4, s * 0.14); X.stroke(); X.restore();
      el(X, 0, 0, s * 0.05, s * 0.05); fs(X, k2);
    },
    butterfly(X, g, s, k, k2) {
      for (const sx of [-1, 1]) {
        el(X, sx * s * 0.22, -s * 0.12, s * 0.22, s * 0.19, sx * 0.4); fs(X, rg(X, g, k, sx * s * 0.22, -s * 0.12, s * 0.22));
        el(X, sx * s * 0.17, s * 0.16, s * 0.15, s * 0.12, -sx * 0.4); fs(X, g.shade(k, -0.15));
        el(X, sx * s * 0.25, -s * 0.13, s * 0.06, s * 0.06); X.fillStyle = k2; X.fill();
      }
      el(X, 0, 0, s * 0.05, s * 0.24); fs(X, '#2b2f36');
      X.lineWidth = 1.5; X.beginPath(); X.moveTo(-s * 0.02, -s * 0.2); X.lineTo(-s * 0.12, -s * 0.34); X.moveTo(s * 0.02, -s * 0.2); X.lineTo(s * 0.12, -s * 0.34); X.stroke();
    },
    kite(X, g, s, k, k2) {
      X.strokeStyle = '#6b6f78'; X.lineWidth = 1.5;
      X.beginPath(); X.moveTo(0, s * 0.22); X.bezierCurveTo(s * 0.22, s * 0.3, -s * 0.06, s * 0.42, s * 0.16, s * 0.5); X.stroke();
      ol(X, s);
      for (const [bx, by] of [[0.08, 0.3], [0.08, 0.42]]) { poly(X, [bx * s - 5, by * s - 4, bx * s + 5, by * s + 4, bx * s + 5, by * s - 4, bx * s - 5, by * s + 4]); X.fillStyle = k2; X.fill(); }
      poly(X, [0, -s * 0.5, s * 0.3, -s * 0.12, 0, s * 0.22, -s * 0.3, -s * 0.12]); fs(X, k);
      X.save(); X.clip(); X.fillStyle = k2; X.fillRect(0, -s * 0.5, s * 0.3, s * 0.38); X.fillRect(-s * 0.3, -s * 0.12, s * 0.3, s * 0.34); X.restore();
      poly(X, [0, -s * 0.5, s * 0.3, -s * 0.12, 0, s * 0.22, -s * 0.3, -s * 0.12]); X.stroke();
      X.beginPath(); X.moveTo(0, -s * 0.5); X.lineTo(0, s * 0.22); X.moveTo(-s * 0.3, -s * 0.12); X.lineTo(s * 0.3, -s * 0.12); X.stroke();
    },
    tree(X, g, s, k, k2) {
      shadow(X, s, 0.46, 0.3);
      ol(X, s); g.rr(X, -s * 0.07, 0, s * 0.14, s * 0.48, s * 0.04); fs(X, '#8a5a36');
      blob(X, g, s, [[0, -0.22, 0.27], [-0.2, -0.08, 0.2], [0.2, -0.08, 0.2], [-0.1, -0.3, 0.19], [0.12, -0.3, 0.18]], k);
      X.fillStyle = k2 === '#e8323c' || k2 === '#ff8a1f' ? k2 : '#e8323c';
      for (const [fx, fy] of [[-0.18, -0.1], [0.1, -0.2], [0.2, -0.02], [-0.04, -0.36]]) { el(X, fx * s, fy * s, s * 0.035, s * 0.035); X.fill(); }
    },
    pine(X, g, s, k) {
      shadow(X, s, 0.46, 0.26);
      ol(X, s); g.rr(X, -s * 0.05, s * 0.3, s * 0.1, s * 0.18, 2); fs(X, '#8a5a36');
      poly(X, [0, -s * 0.12, s * 0.36, s * 0.32, -s * 0.36, s * 0.32]); fs(X, lg(X, g, g.shade(k, -0.1), -s * 0.12, s * 0.32));
      poly(X, [0, -s * 0.32, s * 0.28, s * 0.08, -s * 0.28, s * 0.08]); fs(X, lg(X, g, k, -s * 0.32, s * 0.08));
      poly(X, [0, -s * 0.5, s * 0.2, -s * 0.16, -s * 0.2, -s * 0.16]); fs(X, lg(X, g, g.shade(k, 0.1), -s * 0.5, -s * 0.16));
    },
    bush(X, g, s, k, k2) {
      shadow(X, s, 0.26, 0.42);
      blob(X, g, s, [[-0.26, 0.05, 0.2], [0, -0.05, 0.25], [0.26, 0.05, 0.2]], k);
      X.fillStyle = k2;
      for (const [fx, fy] of [[-0.3, 0], [-0.08, -0.16], [0.12, 0.02], [0.3, -0.04], [-0.14, 0.12]]) { el(X, fx * s, fy * s, s * 0.04, s * 0.04); X.fill(); }
    },
    bench(X, g, s, k) {
      for (const lx of [-0.38, 0.32]) { g.rr(X, lx * s, -s * 0.2, s * 0.06, s * 0.46, 2); fs(X, '#4a4f58'); }
      g.rr(X, -s * 0.48, -s * 0.26, s * 0.96, s * 0.1, 3); fs(X, lg(X, g, k, -s * 0.26, -s * 0.16));
      g.rr(X, -s * 0.48, -s * 0.12, s * 0.96, s * 0.1, 3); fs(X, lg(X, g, k, -s * 0.12, -s * 0.02));
      g.rr(X, -s * 0.5, s * 0.03, s, s * 0.11, 3); fs(X, lg(X, g, g.shade(k, 0.15), s * 0.03, s * 0.14));
    },
    mushroom(X, g, s, k) {
      g.rr(X, -s * 0.1, -s * 0.04, s * 0.2, s * 0.46, s * 0.06); fs(X, '#f6efe0');
      X.beginPath(); X.moveTo(-s * 0.44, s * 0.04); X.quadraticCurveTo(-s * 0.42, -s * 0.44, 0, -s * 0.44); X.quadraticCurveTo(s * 0.42, -s * 0.44, s * 0.44, s * 0.04); X.closePath(); fs(X, rg(X, g, k, 0, -s * 0.2, s * 0.4));
      X.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-0.2, -0.12, 0.06], [0.04, -0.28, 0.07], [0.24, -0.1, 0.05], [0, -0.08, 0.04]]) { el(X, dx * s, dy * s, r * s, r * s); X.fill(); }
    },
    sun(X, g, s) {
      X.fillStyle = '#ffb020';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; poly(X, [Math.cos(a - 0.14) * s * 0.33, Math.sin(a - 0.14) * s * 0.33, Math.cos(a) * s * 0.49, Math.sin(a) * s * 0.49, Math.cos(a + 0.14) * s * 0.33, Math.sin(a + 0.14) * s * 0.33]); X.fill(); }
      el(X, 0, 0, s * 0.32, s * 0.32); fs(X, rg(X, g, '#ffd23a', 0, 0, s * 0.32));
      eye(X, -s * 0.1, -s * 0.05, s * 0.035); eye(X, s * 0.1, -s * 0.05, s * 0.035);
      X.beginPath(); X.arc(0, s * 0.04, s * 0.12, 0.35, Math.PI - 0.35); X.stroke();
    },
    cloud(X, g, s) {
      X.strokeStyle = 'rgba(120,150,180,.55)'; X.lineWidth = 3;
      const cs = [[-0.26, 0.06, 0.2], [0, -0.08, 0.25], [0.26, 0.05, 0.21], [0.06, 0.1, 0.2]];
      for (const [x, y, r] of cs) { el(X, x * s, y * s, r * s, r * s); X.stroke(); }
      for (const [x, y, r] of cs) { el(X, x * s, y * s, r * s, r * s); X.fillStyle = '#ffffff'; X.fill(); }
      X.fillStyle = 'rgba(200,220,240,.5)'; el(X, 0.05 * s, 0.2 * s, 0.36 * s, 0.07 * s); X.fill();
    },
    umbrella(X, g, s, k) {
      X.fillStyle = 'rgba(0,0,0,.16)'; el(X, s * 0.06, s * 0.45, s * 0.3, s * 0.045); X.fill();
      X.save(); X.rotate(-0.25);
      X.strokeStyle = '#7a808a'; X.lineWidth = s * 0.04; X.beginPath(); X.moveTo(0, -s * 0.32); X.lineTo(0, s * 0.48); X.stroke();
      ol(X, s);
      X.beginPath(); X.moveTo(-s * 0.46, -s * 0.12); X.quadraticCurveTo(0, -s * 0.62, s * 0.46, -s * 0.12); X.closePath(); fs(X, k);
      X.save(); X.clip(); X.fillStyle = '#ffffff';
      for (let i = -3; i <= 3; i += 2) poly(X, [0, -s * 0.5, i * s * 0.13, -s * 0.1, (i + 1) * s * 0.13, -s * 0.1]), X.fill();
      X.restore();
      X.beginPath(); X.moveTo(-s * 0.46, -s * 0.12); X.quadraticCurveTo(0, -s * 0.62, s * 0.46, -s * 0.12); X.closePath(); X.stroke();
      el(X, 0, -s * 0.38, s * 0.03, s * 0.03); fs(X, k);
      X.restore();
    },
    castle(X, g, s, k, k2) {
      const c = k;
      X.strokeStyle = '#3d3020'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(0, -s * 0.3); X.lineTo(0, -s * 0.48); X.stroke();
      ol(X, s);
      poly(X, [0, -s * 0.48, s * 0.18, -s * 0.43, 0, -s * 0.38]); fs(X, k2);
      g.rr(X, -s * 0.44, -s * 0.02, s * 0.88, s * 0.48, 4); fs(X, lg(X, g, c, -s * 0.02, s * 0.46));
      for (const [tx, ty, tw] of [[-0.44, -0.24, 0.2], [0.24, -0.24, 0.2], [-0.12, -0.32, 0.24]]) {
        g.rr(X, tx * s, ty * s, tw * s, (0.04 - ty) * s, 2); fs(X, lg(X, g, g.shade(c, 0.08), ty * s, 0));
        for (let b = 0; b < 3; b++) { X.fillStyle = g.shade(c, 0.1); X.fillRect((tx + b * tw / 2.5) * s, (ty - 0.06) * s, tw / 5 * s, 0.07 * s); X.strokeRect((tx + b * tw / 2.5) * s, (ty - 0.06) * s, tw / 5 * s, 0.07 * s); }
      }
      X.beginPath(); X.moveTo(-s * 0.08, s * 0.46); X.lineTo(-s * 0.08, s * 0.28); X.arc(0, s * 0.28, s * 0.08, Math.PI, 0); X.lineTo(s * 0.08, s * 0.46); fs(X, '#6b4a2a');
      X.fillStyle = '#6b4a2a'; X.fillRect(-s * 0.36, -s * 0.12, s * 0.05, s * 0.07); X.fillRect(s * 0.31, -s * 0.12, s * 0.05, s * 0.07);
    },
    bucket(X, g, s, k) {
      X.strokeStyle = '#4a4f58'; X.lineWidth = s * 0.04; X.beginPath(); X.arc(0, -s * 0.18, s * 0.26, Math.PI * 1.05, Math.PI * 1.95); X.stroke();
      ol(X, s);
      poly(X, [-s * 0.3, -s * 0.18, s * 0.3, -s * 0.18, s * 0.22, s * 0.44, -s * 0.22, s * 0.44]); fs(X, lg(X, g, k, -s * 0.18, s * 0.44));
      el(X, 0, -s * 0.18, s * 0.3, s * 0.07); fs(X, '#e8c37a');
      X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(-s * 0.2, -s * 0.06, s * 0.05, s * 0.4);
    },
    shell(X, g, s, k) {
      X.beginPath(); X.moveTo(-s * 0.1, s * 0.36); X.lineTo(-s * 0.44, -s * 0.06); X.quadraticCurveTo(0, -s * 0.6, s * 0.44, -s * 0.06); X.lineTo(s * 0.1, s * 0.36); X.closePath(); fs(X, rg(X, g, k, 0, 0, s * 0.42));
      X.lineWidth = 1.2;
      for (let i = -3; i <= 3; i++) { X.beginPath(); X.moveTo(0, s * 0.34); X.lineTo(i * s * 0.12, -s * 0.24 + Math.abs(i) * s * 0.05); X.stroke(); }
      g.rr(X, -s * 0.14, s * 0.3, s * 0.28, s * 0.08, 2); fs(X, g.shade(k, -0.1));
    },
    starfish(X, g, s, k) {
      X.lineWidth = s * 0.08; X.lineJoin = 'round';
      star5(X, s * 0.44, s * 0.2); X.stroke(); X.fillStyle = rg(X, g, k, 0, 0, s * 0.44); X.fill();
      ol(X, s); X.fillStyle = g.shade(k, 0.45);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * PI2 / 5; for (const d of [0.14, 0.26]) { el(X, Math.cos(a) * s * d, Math.sin(a) * s * d, s * 0.025, s * 0.025); X.fill(); } }
    },
    crab(X, g, s, k) {
      X.lineWidth = s * 0.04;
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(sx * s * 0.18, s * 0.1 + i * s * 0.05); X.lineTo(sx * s * 0.42, s * 0.12 + i * s * 0.07); X.lineTo(sx * s * 0.46, s * 0.24 + i * s * 0.04); X.stroke(); }
      for (const sx of [-1, 1]) {
        X.beginPath(); X.moveTo(sx * s * 0.2, -s * 0.02); X.lineTo(sx * s * 0.32, -s * 0.14); X.stroke();
        el(X, sx * s * 0.36, -s * 0.2, s * 0.1, s * 0.08, sx * 0.5); fs(X, rg(X, g, k, sx * s * 0.36, -s * 0.2, s * 0.1));
        X.beginPath(); X.moveTo(sx * s * 0.36, -s * 0.2); X.lineTo(sx * s * 0.46, -s * 0.26); X.stroke();
        X.beginPath(); X.moveTo(sx * s * 0.07, -s * 0.06); X.lineTo(sx * s * 0.09, -s * 0.2); X.stroke();
        el(X, sx * s * 0.09, -s * 0.23, s * 0.045, s * 0.045); fs(X, '#fff'); eye(X, sx * s * 0.09, -s * 0.23, s * 0.022);
      }
      el(X, 0, s * 0.08, s * 0.28, s * 0.18); fs(X, rg(X, g, k, 0, s * 0.06, s * 0.28));
      X.beginPath(); X.arc(0, s * 0.08, s * 0.07, 0.3, Math.PI - 0.3); X.stroke();
    },
    palm(X, g, s) {
      shadow(X, s, 0.46, 0.28);
      ol(X, s);
      for (let i = 0; i < 7; i++) {
        const u = i / 6, x = -s * 0.04 + Math.pow(u, 1.6) * s * 0.14, y = s * 0.46 - u * s * 0.68;
        el(X, x, y, s * (0.075 - u * 0.02), s * 0.065, 0.2 * u); fs(X, i % 2 ? '#9a6a3c' : '#b98252');
      }
      const tx = s * 0.1, ty = -s * 0.24;
      for (const [a, l, c] of [[-2.85, 0.4, '#2f8a3f'], [-2.2, 0.34, '#3fae4a'], [-1.45, 0.28, '#2f8a3f'], [-0.75, 0.34, '#3fae4a'], [0.05, 0.36, '#2f8a3f']]) {
        const ex = tx + Math.cos(a) * l * s, ey = ty + Math.sin(a) * l * s + s * 0.08, nx = -Math.sin(a) * s * 0.08, ny = Math.cos(a) * s * 0.08;
        X.beginPath(); X.moveTo(tx, ty); X.quadraticCurveTo((tx + ex) / 2 - nx, (ty + ey) / 2 - ny - s * 0.06, ex, ey); X.quadraticCurveTo((tx + ex) / 2 + nx, (ty + ey) / 2 + ny - s * 0.02, tx, ty); fs(X, c);
      }
      for (const [cx, cy] of [[0.06, -0.2], [0.14, -0.19]]) { el(X, cx * s, cy * s, s * 0.05, s * 0.05); fs(X, '#6b4a2a'); }
    },
    boat(X, g, s, k, k2) {
      ol(X, s);
      X.beginPath(); X.moveTo(-s * 0.04, s * 0.2); X.lineTo(-s * 0.04, -s * 0.46); X.stroke();
      poly(X, [-s * 0.04, -s * 0.46, -s * 0.22, -s * 0.42, -s * 0.04, -s * 0.38]); fs(X, k2);
      poly(X, [-s * 0.01, -s * 0.44, s * 0.36, s * 0.12, -s * 0.01, s * 0.12]); fs(X, '#fbfaf5');
      X.save(); poly(X, [-s * 0.01, -s * 0.44, s * 0.36, s * 0.12, -s * 0.01, s * 0.12]); X.clip(); X.fillStyle = k2; X.fillRect(-s * 0.02, -s * 0.12, s * 0.4, s * 0.1); X.restore();
      poly(X, [-s * 0.07, -s * 0.34, -s * 0.07, s * 0.12, -s * 0.3, s * 0.12]); fs(X, '#efe9da');
      poly(X, [-s * 0.48, s * 0.18, s * 0.48, s * 0.18, s * 0.34, s * 0.42, -s * 0.34, s * 0.42]); fs(X, lg(X, g, k, s * 0.18, s * 0.42));
      X.fillStyle = 'rgba(255,255,255,.7)'; X.fillRect(-s * 0.38, s * 0.24, s * 0.76, s * 0.035);
    },
    icecream(X, g, s, k, k2) {
      poly(X, [-s * 0.18, -s * 0.02, s * 0.18, -s * 0.02, 0, s * 0.5]); fs(X, '#e0a35a');
      X.save(); poly(X, [-s * 0.18, -s * 0.02, s * 0.18, -s * 0.02, 0, s * 0.5]); X.clip(); X.lineWidth = 1;
      for (let i = -4; i <= 4; i++) { X.beginPath(); X.moveTo(i * s * 0.08, 0); X.lineTo(i * s * 0.08 + s * 0.3, s * 0.5); X.moveTo(i * s * 0.08, 0); X.lineTo(i * s * 0.08 - s * 0.3, s * 0.5); X.stroke(); }
      X.restore(); ol(X, s);
      el(X, 0, -s * 0.3, s * 0.15, s * 0.13); fs(X, rg(X, g, k2, 0, -s * 0.3, s * 0.15));
      el(X, 0, -s * 0.1, s * 0.2, s * 0.15); fs(X, rg(X, g, k, 0, -s * 0.1, s * 0.2));
      el(X, 0, -s * 0.45, s * 0.05, s * 0.05); fs(X, '#e8323c');
    },
    planet(X, g, s, k, k2) {
      el(X, 0, 0, s * 0.47, s * 0.47); fs(X, rg(X, g, k, 0, 0, s * 0.47));
      X.save(); el(X, 0, 0, s * 0.47, s * 0.47); X.clip();
      X.fillStyle = rgba(g.shade(k, -0.3), 0.6); el(X, 0, -s * 0.14, s * 0.6, s * 0.06, -0.2); X.fill();
      X.fillStyle = rgba(k2, 0.5); el(X, 0, s * 0.16, s * 0.6, s * 0.08, -0.2); X.fill();
      X.restore(); el(X, 0, 0, s * 0.47, s * 0.47); X.stroke();
    },
    ringed(X, g, s, k, k2) {
      X.save(); X.rotate(-0.35);
      X.strokeStyle = 'rgba(28,22,38,.8)'; X.lineWidth = s * 0.1; el(X, 0, 0, s * 0.58, s * 0.14); X.stroke();
      X.strokeStyle = k2; X.lineWidth = s * 0.06; el(X, 0, 0, s * 0.58, s * 0.14); X.stroke();
      ol(X, s); el(X, 0, 0, s * 0.32, s * 0.32); fs(X, rg(X, g, k, 0, 0, s * 0.32));
      X.strokeStyle = 'rgba(28,22,38,.8)'; X.lineWidth = s * 0.1; X.beginPath(); X.ellipse(0, 0, s * 0.58, s * 0.14, 0, 0.05, Math.PI - 0.05); X.stroke();
      X.strokeStyle = k2; X.lineWidth = s * 0.06; X.beginPath(); X.ellipse(0, 0, s * 0.58, s * 0.14, 0, 0.05, Math.PI - 0.05); X.stroke();
      X.restore();
    },
    moon(X, g, s, k) {
      el(X, 0, 0, s * 0.47, s * 0.47); fs(X, rg(X, g, k, 0, 0, s * 0.47));
      X.save(); el(X, 0, 0, s * 0.47, s * 0.47); X.clip();
      X.fillStyle = 'rgba(20,24,60,.62)'; el(X, s * 0.3, -s * 0.08, s * 0.42, s * 0.48); X.fill(); X.restore();
      X.fillStyle = g.shade(k, -0.18);
      for (const [cx, cy, r] of [[-0.2, 0.12, 0.08], [-0.08, -0.22, 0.06], [-0.28, -0.1, 0.05]]) { el(X, cx * s, cy * s, r * s, r * s); X.fill(); }
      el(X, 0, 0, s * 0.47, s * 0.47); X.stroke();
    },
    rocket(X, g, s, k, k2) {
      X.save(); X.rotate(0.45);
      X.beginPath(); X.moveTo(-s * 0.08, s * 0.28); X.quadraticCurveTo(0, s * 0.6, s * 0.08, s * 0.28); X.closePath();
      const fl = X.createLinearGradient(0, s * 0.28, 0, s * 0.56); fl.addColorStop(0, '#fff3a0'); fl.addColorStop(1, 'rgba(255,120,30,.2)'); X.fillStyle = fl; X.fill();
      ol(X, s);
      poly(X, [-s * 0.1, s * 0.08, -s * 0.24, s * 0.3, -s * 0.1, s * 0.26]); fs(X, k);
      poly(X, [s * 0.1, s * 0.08, s * 0.24, s * 0.3, s * 0.1, s * 0.26]); fs(X, k);
      X.beginPath(); X.moveTo(0, -s * 0.46); X.quadraticCurveTo(s * 0.19, -s * 0.22, s * 0.12, s * 0.28); X.lineTo(-s * 0.12, s * 0.28); X.quadraticCurveTo(-s * 0.19, -s * 0.22, 0, -s * 0.46); fs(X, lg(X, g, '#f4f6fa', -s * 0.46, s * 0.28));
      X.save(); X.clip(); X.fillStyle = k; X.fillRect(-s * 0.2, -s * 0.5, s * 0.4, s * 0.24); X.restore();
      X.beginPath(); X.moveTo(0, -s * 0.46); X.quadraticCurveTo(s * 0.19, -s * 0.22, s * 0.12, s * 0.28); X.lineTo(-s * 0.12, s * 0.28); X.quadraticCurveTo(-s * 0.19, -s * 0.22, 0, -s * 0.46); X.stroke();
      el(X, 0, -s * 0.04, s * 0.07, s * 0.07); fs(X, '#5ec8ff');
      X.restore();
    },
    ufo(X, g, s, k) {
      el(X, 0, -s * 0.09, s * 0.2, s * 0.16); const q = X.createLinearGradient(0, -s * 0.25, 0, 0); q.addColorStop(0, '#e6f7ff'); q.addColorStop(1, '#6fb8e8'); fs(X, q);
      el(X, 0, s * 0.04, s * 0.48, s * 0.13); fs(X, rg(X, g, k, 0, s * 0.02, s * 0.48));
      el(X, 0, s * 0.11, s * 0.28, s * 0.06); fs(X, g.shade(k, -0.25));
      X.fillStyle = '#ffd23a'; for (let i = -2; i <= 2; i++) { el(X, i * s * 0.17, s * 0.05, s * 0.03, s * 0.03); X.fill(); }
    },
    astronaut(X, g, s, k, k2) {
      g.rr(X, -s * 0.26, -s * 0.08, s * 0.12, s * 0.34, 4); fs(X, '#c0c7cf');
      for (const lx of [-0.16, 0.03]) { g.rr(X, lx * s, s * 0.2, s * 0.13, s * 0.27, 4); fs(X, '#f4f6fa'); g.rr(X, lx * s, s * 0.4, s * 0.13, s * 0.08, 3); fs(X, '#8a909a'); }
      g.rr(X, -s * 0.3, -s * 0.04, s * 0.1, s * 0.26, s * 0.05); fs(X, '#f4f6fa');
      X.save(); X.translate(s * 0.16, -s * 0.02); X.rotate(-2.3); g.rr(X, 0, -s * 0.05, s * 0.3, s * 0.1, s * 0.05); fs(X, '#f4f6fa'); X.restore();
      g.rr(X, -s * 0.2, -s * 0.08, s * 0.4, s * 0.36, s * 0.1); fs(X, lg(X, g, '#f4f6fa', -s * 0.08, s * 0.28));
      g.rr(X, -s * 0.09, 0, s * 0.18, s * 0.1, 2); fs(X, '#d7dde4');
      X.fillStyle = k2; el(X, -s * 0.04, s * 0.05, s * 0.02, s * 0.02); X.fill(); X.fillStyle = '#e8323c'; el(X, s * 0.04, s * 0.05, s * 0.02, s * 0.02); X.fill();
      el(X, 0, -s * 0.27, s * 0.2, s * 0.2); fs(X, rg(X, g, '#f4f6fa', 0, -s * 0.27, s * 0.2));
      g.rr(X, -s * 0.13, -s * 0.35, s * 0.26, s * 0.16, s * 0.07); fs(X, lg(X, g, k, -s * 0.35, -s * 0.19));
      X.fillStyle = 'rgba(255,255,255,.6)'; el(X, -s * 0.06, -s * 0.31, s * 0.04, s * 0.025, -0.4); X.fill();
    },
    satellite(X, g, s, k) {
      X.lineWidth = 2; X.beginPath(); X.moveTo(-s * 0.2, 0); X.lineTo(s * 0.2, 0); X.stroke(); ol(X, s);
      for (const px of [-0.5, 0.2]) {
        g.rr(X, px * s, -s * 0.12, s * 0.3, s * 0.24, 2); fs(X, '#2f5fbf');
        X.lineWidth = 1; X.strokeStyle = 'rgba(180,220,255,.7)';
        for (let i = 1; i < 3; i++) { X.beginPath(); X.moveTo((px + i * 0.1) * s, -s * 0.11); X.lineTo((px + i * 0.1) * s, s * 0.11); X.stroke(); }
        X.beginPath(); X.moveTo(px * s, 0); X.lineTo((px + 0.3) * s, 0); X.stroke(); ol(X, s);
      }
      X.beginPath(); X.moveTo(0, -s * 0.18); X.lineTo(0, -s * 0.3); X.stroke();
      el(X, 0, -s * 0.22, s * 0.09, s * 0.035); fs(X, '#e6e9ee');
      g.rr(X, -s * 0.16, -s * 0.17, s * 0.32, s * 0.34, 4); fs(X, rg(X, g, k, 0, 0, s * 0.24));
    },
    comet(X, g, s, k) {
      const q = X.createLinearGradient(s * 0.24, 0, -s * 0.5, 0); q.addColorStop(0, rgba(k, 0.95)); q.addColorStop(1, rgba(k, 0));
      X.fillStyle = q; poly(X, [s * 0.22, -s * 0.16, -s * 0.5, -s * 0.05, -s * 0.46, s * 0.1, s * 0.22, s * 0.16]); X.fill();
      el(X, s * 0.27, 0, s * 0.2, s * 0.2); fs(X, rg(X, g, '#ffffff', s * 0.27, 0, s * 0.2));
      el(X, s * 0.27, 0, s * 0.1, s * 0.1); X.fillStyle = rgba(k, 0.8); X.fill();
    },
    alien(X, g, s, k, k2) {
      X.lineWidth = 1.5; for (const sx of [-1, 1]) { X.beginPath(); X.moveTo(sx * s * 0.08, -s * 0.28); X.lineTo(sx * s * 0.18, -s * 0.42); X.stroke(); el(X, sx * s * 0.18, -s * 0.44, s * 0.05, s * 0.05); fs(X, k2); }
      ol(X, s);
      g.rr(X, -s * 0.16, s * 0.12, s * 0.32, s * 0.34, s * 0.1); fs(X, g.shade(k, -0.15));
      el(X, 0, -s * 0.06, s * 0.32, s * 0.25); fs(X, rg(X, g, k, 0, -s * 0.08, s * 0.32));
      for (const sx of [-1, 1]) { el(X, sx * s * 0.12, -s * 0.09, s * 0.09, s * 0.11); fs(X, '#fff'); eye(X, sx * s * 0.12, -s * 0.07, s * 0.05); }
      X.beginPath(); X.arc(0, s * 0.04, s * 0.08, 0.3, Math.PI - 0.3); X.stroke();
    },
    asteroid(X, g, s, k, k2, o) {
      const R = rng((o.v || 1) * 977);
      X.beginPath(); for (let i = 0; i < 9; i++) { const a = i * PI2 / 9, r = s * (0.38 + R() * 0.09); X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath();
      fs(X, rg(X, g, k, 0, 0, s * 0.45));
      X.fillStyle = g.shade(k, -0.25);
      for (let i = 0; i < 3; i++) { el(X, (R() - 0.5) * s * 0.4, (R() - 0.5) * s * 0.4, s * (0.05 + R() * 0.05), s * (0.04 + R() * 0.04)); X.fill(); }
    },
    pot(X, g, s, k) {
      for (const sx of [-1, 1]) { g.rr(X, sx > 0 ? s * 0.38 : -s * 0.5, -s * 0.08, s * 0.12, s * 0.08, 3); fs(X, '#3a3f47'); }
      g.rr(X, -s * 0.4, -s * 0.12, s * 0.8, s * 0.46, s * 0.08); fs(X, lg(X, g, k, -s * 0.12, s * 0.34));
      el(X, 0, -s * 0.13, s * 0.42, s * 0.08); fs(X, g.shade(k, 0.2));
      el(X, 0, -s * 0.24, s * 0.07, s * 0.05); fs(X, '#3a3f47');
    },
    kettle(X, g, s, k) {
      X.strokeStyle = '#3a3f47'; X.lineWidth = s * 0.06; X.beginPath(); X.arc(0, -s * 0.1, s * 0.24, Math.PI * 1.12, Math.PI * 1.88); X.stroke();
      ol(X, s);
      X.beginPath(); X.moveTo(s * 0.2, s * 0.1); X.quadraticCurveTo(s * 0.38, s * 0.02, s * 0.48, -s * 0.18); X.lineTo(s * 0.4, -s * 0.2); X.quadraticCurveTo(s * 0.32, -s * 0.04, s * 0.18, -s * 0.04); X.closePath(); fs(X, k);
      el(X, 0, s * 0.1, s * 0.3, s * 0.29); fs(X, rg(X, g, k, 0, s * 0.08, s * 0.3));
      g.rr(X, -s * 0.26, s * 0.32, s * 0.52, s * 0.08, 3); fs(X, g.shade(k, -0.25));
      el(X, 0, -s * 0.16, s * 0.12, s * 0.045); fs(X, g.shade(k, 0.2)); el(X, 0, -s * 0.21, s * 0.04, s * 0.03); fs(X, '#3a3f47');
    },
    apple(X, g, s, k) {
      X.strokeStyle = '#6b4a2a'; X.lineWidth = s * 0.05; X.beginPath(); X.moveTo(0, -s * 0.24); X.lineTo(s * 0.04, -s * 0.42); X.stroke();
      ol(X, s);
      el(X, s * 0.13, -s * 0.34, s * 0.12, s * 0.05, -0.5); fs(X, '#4fb043');
      el(X, 0, s * 0.06, s * 0.4, s * 0.36); fs(X, rg(X, g, k, 0, s * 0.04, s * 0.4));
      X.fillStyle = 'rgba(255,255,255,.5)'; el(X, -s * 0.18, -s * 0.06, s * 0.06, s * 0.1, 0.4); X.fill();
    },
    pear(X, g, s, k) {
      X.strokeStyle = '#6b4a2a'; X.lineWidth = s * 0.05; X.beginPath(); X.moveTo(0, -s * 0.3); X.lineTo(s * 0.03, -s * 0.44); X.stroke();
      blob(X, g, s, [[0, 0.17, 0.29], [0, -0.13, 0.18]], k);
      el(X, s * 0.12, -s * 0.38, s * 0.1, s * 0.04, -0.5); fs(X, '#4fb043');
    },
    jar(X, g, s, k, k2) {
      g.rr(X, -s * 0.22, -s * 0.06, s * 0.44, s * 0.48, s * 0.06); X.fillStyle = k; X.fill();
      g.rr(X, -s * 0.26, -s * 0.26, s * 0.52, s * 0.7, s * 0.08); X.fillStyle = 'rgba(220,240,255,.35)'; X.fill(); X.stroke();
      X.fillStyle = 'rgba(255,255,255,.45)'; X.fillRect(-s * 0.18, -s * 0.2, s * 0.05, s * 0.56);
      g.rr(X, -s * 0.28, -s * 0.4, s * 0.56, s * 0.14, 3); fs(X, lg(X, g, k2, -s * 0.4, -s * 0.26));
      g.rr(X, -s * 0.16, s * 0.06, s * 0.32, s * 0.16, 2); fs(X, '#fbfaf5');
    },
    pan(X, g, s, k) {
      g.rr(X, s * 0.12, -s * 0.05, s * 0.46, s * 0.1, 4); fs(X, '#6b4a2a');
      el(X, s * 0.5, 0, s * 0.025, s * 0.025); X.fillStyle = '#1b1d22'; X.fill();
      el(X, -s * 0.24, 0, s * 0.34, s * 0.28); fs(X, rg(X, g, k, -s * 0.24, 0, s * 0.34));
      el(X, -s * 0.24, 0, s * 0.25, s * 0.2); X.fillStyle = 'rgba(255,255,255,.08)'; X.fill();
    },
    cupcake(X, g, s, k, k2) {
      poly(X, [-s * 0.3, s * 0.02, s * 0.3, s * 0.02, s * 0.22, s * 0.44, -s * 0.22, s * 0.44]); fs(X, lg(X, g, k2, s * 0.02, s * 0.44));
      X.strokeStyle = 'rgba(0,0,0,.18)'; X.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { X.beginPath(); X.moveTo(i * s * 0.11, s * 0.04); X.lineTo(i * s * 0.08, s * 0.42); X.stroke(); }
      ol(X, s);
      blob(X, g, s, [[0, -0.02, 0.32], [0, -0.16, 0.24], [0, -0.28, 0.14]].map(([x, y, r]) => [x, y, r * 0.9]), k);
      for (const [dx, dy, c] of [[-0.12, -0.08, '#3d7cff'], [0.1, -0.14, '#ffd23a'], [0.02, -0.02, '#2ecc71'], [-0.06, -0.24, '#e8323c']]) { X.fillStyle = c; X.fillRect(dx * s, dy * s, s * 0.06, s * 0.025); }
      el(X, 0, -s * 0.4, s * 0.06, s * 0.06); fs(X, '#e8323c');
    },
  };

  // ----- הנושאים: רקע קבוע (לא משתנה בין התמונות) ואזורים להנחת חפצים -----
  const WALLS = ['#f6d9c8', '#d2e8f7', '#e4dbf6', '#d8efd8', '#fff0c4'];
  const THEMES = {
    park: {
      zones: () => [
        { box: [14, 10, 466, 132], types: ['cloud', 'cloud', 'bird', 'bird', 'balloon', 'kite', 'sun', 'butterfly'], n: [5, 7] },
        { box: [8, 158, 472, 396], types: ['tree', 'tree', 'pine', 'bush', 'bush', 'bench', 'flower', 'flower', 'flower', 'mushroom', 'dog', 'cat', 'ball', 'duck', 'butterfly'], n: [15, 21] },
      ],
      bgAt: (v, x, y) => (y < 150 ? '#a8dcff' : '#5fb34a'),
      bg(X, g, v) {
        let q = X.createLinearGradient(0, 0, 0, 170); q.addColorStop(0, '#7cc6ff'); q.addColorStop(1, '#d8f1ff');
        X.fillStyle = q; X.fillRect(0, 0, SW, 170);
        X.fillStyle = '#9ad97a'; el(X, 90 + v.a * 60, 172, 190, 60); X.fill();
        X.fillStyle = '#86cc66'; el(X, 380 - v.b * 60, 178, 210, 66); X.fill();
        q = X.createLinearGradient(0, 150, 0, SH); q.addColorStop(0, '#74c95a'); q.addColorStop(1, '#4f9e3e');
        X.fillStyle = q; X.fillRect(0, 150, SW, SH - 150);
        X.beginPath(); X.moveTo(110 + v.a * 80, SH); X.bezierCurveTo(180, 300, 330, 268 + v.b * 20, SW, 252); X.lineTo(SW, 286); X.bezierCurveTo(350, 302, 250, 330, 210 + v.a * 80, SH); X.closePath();
        X.fillStyle = '#e8d6a6'; X.fill(); X.strokeStyle = 'rgba(120,90,40,.25)'; X.lineWidth = 2; X.stroke();
        const R = rng(v.seed);
        X.strokeStyle = 'rgba(30,90,30,.35)'; X.lineWidth = 1.5;
        for (let i = 0; i < 46; i++) { const x = R() * SW, y = 160 + R() * 236; X.beginPath(); X.moveTo(x, y); X.lineTo(x - 2, y - 6); X.moveTo(x + 3, y); X.lineTo(x + 4, y - 7); X.stroke(); }
      },
    },
    room: {
      zones: v => [
        { box: [12, 12, 468, 244], types: ['frame', 'frame', 'clock', 'star', 'balloon', 'kite', 'butterfly'], n: [6, 9] },
        { box: [10, 272, 470, 396], types: ['teddy', 'ball', 'cat', 'dog', 'duck', 'car', 'cushion', 'books', 'plant', 'lamp', 'cup'], n: [9, 13] },
      ],
      blocks: v => [[v.wx - 14, 22, 162, 142]],
      bgAt: (v, x, y) => (y < 262 ? WALLS[v.wall] : '#c9935a'),
      bg(X, g, v) {
        const wc = WALLS[v.wall];
        X.fillStyle = wc; X.fillRect(0, 0, SW, 262);
        X.fillStyle = g.shade(wc, v.a > 0.5 ? -0.05 : 0.25);
        if (v.a > 0.5) for (let x = 0; x < SW; x += 32) X.fillRect(x, 0, 14, 262);
        else for (let y = 14; y < 262; y += 30) for (let x = ((y / 30) % 2) * 15 + 8; x < SW; x += 30) { el(X, x, y, 4, 4); X.fill(); }
        // חלון עם וילונות
        const wx = v.wx;
        X.fillStyle = '#ffffff'; X.fillRect(wx - 6, 30, 146, 120);
        const q = X.createLinearGradient(0, 36, 0, 144); q.addColorStop(0, '#7cc6ff'); q.addColorStop(1, '#d8f1ff');
        X.fillStyle = q; X.fillRect(wx, 36, 134, 108);
        X.save(); X.beginPath(); X.rect(wx, 36, 134, 108); X.clip();
        X.fillStyle = '#ffffff'; el(X, wx + 40, 70, 22, 10); X.fill(); el(X, wx + 56, 66, 16, 10); X.fill();
        X.fillStyle = '#86cc66'; el(X, wx + 90, 150, 70, 30); X.fill(); X.restore();
        X.fillStyle = '#ffffff'; X.fillRect(wx + 64, 36, 6, 108); X.fillRect(wx, 86, 134, 6);
        X.fillStyle = VIVID[v.cur]; X.fillRect(wx - 14, 24, 26, 132); X.fillRect(wx + 122, 24, 26, 132);
        X.fillStyle = 'rgba(0,0,0,.12)'; for (const cx of [wx - 8, wx + 2, wx + 128, wx + 138]) X.fillRect(cx, 24, 3, 132);
        X.fillStyle = '#8a5a36'; X.fillRect(wx - 20, 20, 174, 6);
        // רצפה
        X.fillStyle = '#f4f1ea'; X.fillRect(0, 256, SW, 12);
        const f = X.createLinearGradient(0, 268, 0, SH); f.addColorStop(0, '#d6a46b'); f.addColorStop(1, '#b8834e');
        X.fillStyle = f; X.fillRect(0, 268, SW, SH - 268);
        X.strokeStyle = 'rgba(90,50,20,.25)'; X.lineWidth = 2;
        for (let y = 268; y < SH; y += 22) { X.beginPath(); X.moveTo(0, y); X.lineTo(SW, y); X.stroke(); for (let x = ((y / 22) % 2) * 60; x < SW; x += 120) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 22); X.stroke(); } }
      },
    },
    beach: {
      zones: () => [
        { box: [12, 8, 468, 110], types: ['sun', 'cloud', 'cloud', 'bird', 'bird', 'kite', 'balloon'], n: [4, 6] },
        { box: [12, 122, 468, 212], types: ['boat', 'boat', 'fish', 'fish', 'duck', 'ball'], n: [3, 5] },
        { box: [8, 226, 472, 396], types: ['umbrella', 'castle', 'bucket', 'shell', 'shell', 'starfish', 'crab', 'palm', 'icecream', 'ball'], n: [10, 14] },
      ],
      bgAt: (v, x, y) => (y < 116 ? '#9ad8ff' : y < 220 ? '#3fa9e6' : '#f0d48f'),
      bg(X, g, v) {
        let q = X.createLinearGradient(0, 0, 0, 120); q.addColorStop(0, '#69c3ff'); q.addColorStop(1, '#c9ecff');
        X.fillStyle = q; X.fillRect(0, 0, SW, 120);
        q = X.createLinearGradient(0, 114, 0, 224); q.addColorStop(0, '#2f8fd8'); q.addColorStop(1, '#5fc8f0');
        X.fillStyle = q; X.fillRect(0, 114, SW, 110);
        X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 2;
        const R = rng(v.seed);
        for (let i = 0; i < 16; i++) { const x = R() * SW, y = 126 + R() * 86; X.beginPath(); X.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85); X.stroke(); }
        q = X.createLinearGradient(0, 220, 0, SH); q.addColorStop(0, '#f8e2a8'); q.addColorStop(1, '#e8c47a');
        X.fillStyle = q; X.beginPath(); X.moveTo(0, 224);
        for (let x = 0; x <= SW; x += 20) X.lineTo(x, 220 + Math.sin(x * 0.05 + v.a * 6) * 4);
        X.lineTo(SW, SH); X.lineTo(0, SH); X.closePath(); X.fill();
        X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 4; X.beginPath();
        for (let x = 0; x <= SW; x += 20) X.lineTo(x, 220 + Math.sin(x * 0.05 + v.a * 6) * 4);
        X.stroke();
        X.fillStyle = 'rgba(160,110,50,.25)';
        for (let i = 0; i < 70; i++) { el(X, R() * SW, 232 + R() * 166, 1.5, 1.5); X.fill(); }
      },
    },
    kitchen: {
      zones: v => {
        const sx0 = v.left ? 196 : 16, sx1 = v.left ? 466 : 300;
        return [
          { box: [sx0, 72, sx1, 148], base: 148, types: ['jar', 'cup', 'plant', 'books', 'cupcake', 'apple', 'pear', 'jar'], n: [5, 7] },
          { box: [v.left ? 196 : 12, 162, v.left ? 468 : 300, 252], types: ['clock', 'frame', 'pan', 'clock'], n: [2, 4] },
          { box: [10, 150, 470, 262], base: 262, types: ['pot', 'kettle', 'apple', 'pear', 'jar', 'cupcake', 'cup', 'plant', 'pot'], n: [7, 10] },
        ];
      },
      blocks: v => [v.left ? [16, 64, 170, 152] : [314, 64, 152, 152]],
      bgAt: (v, x, y) => (y < 262 ? '#f1f1ea' : '#7fb3d5'),
      bg(X, g, v) {
        X.fillStyle = '#f4f4ef'; X.fillRect(0, 0, SW, 262);
        X.strokeStyle = 'rgba(0,0,0,.08)'; X.lineWidth = 1.5;
        for (let x = 0; x < SW; x += 30) { X.beginPath(); X.moveTo(x, 64); X.lineTo(x, 262); X.stroke(); }
        for (let y = 64; y < 262; y += 30) { X.beginPath(); X.moveTo(0, y); X.lineTo(SW, y); X.stroke(); }
        X.fillStyle = rgba(VIVID[v.cur], 0.35); for (let x = 0; x < SW; x += 60) X.fillRect(x, 214, 30, 30);
        // ארונות עליונים
        X.fillStyle = '#c08a5e'; X.fillRect(0, 0, SW, 62);
        X.strokeStyle = 'rgba(80,40,10,.35)'; X.lineWidth = 2;
        for (let x = 6; x < SW; x += 79) { g.rr(X, x, 6, 72, 48, 5); X.stroke(); el(X, x + 36, 46, 4, 4); X.fillStyle = '#e6e9ee'; X.fill(); }
        X.fillStyle = 'rgba(0,0,0,.15)'; X.fillRect(0, 60, SW, 4);
        // חלון
        const wx = v.left ? 30 : 328;
        X.fillStyle = '#ffffff'; X.fillRect(wx - 6, 76, 136, 128);
        const q = X.createLinearGradient(0, 82, 0, 198); q.addColorStop(0, '#7cc6ff'); q.addColorStop(1, '#d8f1ff');
        X.fillStyle = q; X.fillRect(wx, 82, 124, 116);
        X.save(); X.beginPath(); X.rect(wx, 82, 124, 116); X.clip(); X.fillStyle = '#86cc66'; el(X, wx + 70, 206, 80, 34); X.fill(); X.restore();
        X.fillStyle = '#ffffff'; X.fillRect(wx + 59, 82, 6, 116); X.fillRect(wx, 136, 124, 6);
        // מדף
        const sx0 = v.left ? 196 : 16, sx1 = v.left ? 466 : 300;
        X.fillStyle = '#a8744a'; X.fillRect(sx0, 148, sx1 - sx0, 8); X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(sx0, 156, sx1 - sx0, 3);
        X.fillStyle = '#8a5a36'; X.fillRect(sx0 + 16, 156, 6, 14); X.fillRect(sx1 - 22, 156, 6, 14);
        // שיש וארונות תחתונים
        const cab = ['#7fb3d5', '#9fd1a6', '#f2c48d', '#c7b3e6', '#e9a3a3'][v.wall];
        X.fillStyle = '#e4dfd6'; X.fillRect(0, 262, SW, 18); X.fillStyle = 'rgba(255,255,255,.6)'; X.fillRect(0, 262, SW, 3);
        X.fillStyle = cab; X.fillRect(0, 280, SW, SH - 280);
        X.strokeStyle = 'rgba(0,0,0,.18)';
        for (let x = 8; x < SW; x += 94) { g.rr(X, x, 290, 86, 100, 6); X.stroke(); g.rr(X, x + 30, 300, 26, 6, 3); X.fillStyle = '#e6e9ee'; X.fill(); }
      },
    },
    space: {
      zones: () => [{ box: [8, 8, 472, 392], types: ['planet', 'planet', 'ringed', 'moon', 'rocket', 'ufo', 'astronaut', 'satellite', 'comet', 'alien', 'asteroid', 'asteroid', 'star', 'star'], n: [14, 20] }],
      bgAt: () => '#151a42',
      bg(X, g, v) {
        const q = X.createRadialGradient(SW * 0.3, SH * 0.3, 20, SW * 0.5, SH * 0.5, SW * 0.8);
        q.addColorStop(0, '#26215e'); q.addColorStop(1, '#0b0f2a');
        X.fillStyle = q; X.fillRect(0, 0, SW, SH);
        for (const [x, y, r, c] of [[120 + v.a * 200, 120, 150, '#8a4fff'], [360 - v.b * 160, 290, 170, '#2f8fd8']]) { const n = X.createRadialGradient(x, y, 10, x, y, r); n.addColorStop(0, rgba(c, 0.28)); n.addColorStop(1, rgba(c, 0)); X.fillStyle = n; X.fillRect(0, 0, SW, SH); }
        const R = rng(v.seed);
        for (let i = 0; i < 130; i++) { X.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.6).toFixed(2) + ')'; el(X, R() * SW, R() * SH, 0.6 + R() * 1.1, 0.6 + R() * 1.1); X.fill(); }
      },
    },
  };

  // ----- בניית שלב: חפצים במקומות פנויים, ואז ההבדלים -----
  const bbox = o => { const t = TY[o.t]; return [o.x - t[0] * o.s, o.y - t[1] * o.s, o.x + t[0] * o.s, o.y + t[1] * o.s]; };
  const grow = (b, m) => [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
  const hits = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const inside = (b, box) => b[0] >= box[0] && b[1] >= box[1] && b[2] <= box[2] && b[3] <= box[3];
  const MIN_SIDE = 22;
  function place(R, zones, blocks, n) {
    const objs = [], t01 = (n - 1) / (LEVELS - 1), scale = 1.08 - t01 * 0.14;
    zones.forEach((z, zi) => {
      const want = Math.round(z.n[0] + (z.n[1] - z.n[0]) * Math.min(1, t01 * 1.2));
      let placed = 0;
      for (let tries = 0; tries < want * 50 && placed < want; tries++) {
        const t = z.types[Math.floor(R() * z.types.length)];
        // תמונה מגוונת: עד 3 מכל סוג (שמש, ירח, דקל וטירה — אחד)
        if (objs.filter(o => o.t === t).length >= (t === 'sun' || t === 'moon' || t === 'palm' || t === 'castle' ? 1 : 3)) continue;
        const [lo, hi] = SZ[t], s = Math.round((lo + R() * (hi - lo)) * scale), hw = TY[t][0] * s, hh = TY[t][1] * s;
        const [x0, y0, x1, y1] = z.box;
        if (x1 - x0 < 2 * hw || y1 - y0 < 2 * hh) continue;
        const x = x0 + hw + R() * (x1 - x0 - 2 * hw), y = z.base != null ? z.base - hh : y0 + hh + R() * (y1 - y0 - 2 * hh);
        if (y - hh < y0 - 0.5) continue;
        const cols = COLS[t] || VIVID, k = cols[Math.floor(R() * cols.length)];
        let k2 = VIVID[Math.floor(R() * VIVID.length)];
        if (k2 === k) k2 = VIVID[(VIVID.indexOf(k2) + 3) % VIVID.length];
        const o = { t, x: Math.round(x), y: Math.round(y), s, k, k2, f: R() < 0.5 ? 1 : -1, v: 1 + Math.floor(R() * 999), z: zi };
        const b = grow(bbox(o), 5);
        if (objs.some(p => hits(b, bbox(p))) || blocks.some(r => hits(b, [r[0], r[1], r[0] + r[2], r[1] + r[3]]))) continue;
        objs.push(o); placed++;
      }
    });
    // מה שלמטה מצויר אחרון (נראה קרוב יותר)
    return objs.sort((a, b) => a.z - b.z || (a.y + TY[a.t][1] * a.s) - (b.y + TY[b.t][1] * b.s));
  }
  // כמה פיקסלים הבדל באמת משנה, ואיפה: מציירים את האזור (עם שוליים) לפני ואחרי, באותו ציור של המשחק.
  // פיקסל "השתנה" כשהפרש הצבע בו גדול (מעל 60). מחזיר את המספר ואת המלבן של כל מה שהשתנה
  let pxC = null;
  function measure(U, T, v, objs, j, set, reg) {
    const x0 = Math.max(0, Math.floor(reg[0]) - 30), y0 = Math.max(0, Math.floor(reg[1]) - 30);
    const x1 = Math.min(SW, Math.ceil(reg[2]) + 30), y1 = Math.min(SH, Math.ceil(reg[3]) + 30), w = x1 - x0, h = y1 - y0;
    if (!pxC) pxC = document.createElement('canvas');
    pxC.width = w; pxC.height = h;
    const X = pxC.getContext('2d', { willReadFrequently: true });
    const shot = list => { X.setTransform(1, 0, 0, 1, -x0, -y0); paintScene(U, X, T, v, list); return X.getImageData(0, 0, w, h).data; };
    const a = shot(objs), b = shot(objs.map((o, i) => (i === j ? Object.assign({}, o, set) : o)));
    let c = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4) {
      if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) <= 60) continue;
      c++; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    return c ? { c, box: [x0 + bx0, y0 + by0, x0 + bx1 + 1, y0 + by1 + 1] } : { c: 0, box: reg };
  }
  function buildLevel(n) {
    const theme = THEME_ORDER[(n - 1) % THEME_ORDER.length], T = THEMES[theme], k = nDiffs(n);
    const U = typeof GK !== 'undefined' && GK.U, canPx = !!(U && typeof document !== 'undefined' && document.createElement);
    // (רשת ביטחון: אם 60 ניסיונות עם מדידת הפיקסלים לא הספיקו, עוד 20 בלעדיה — הבדיקות מוודאות שזה לא קורה)
    for (let attempt = 0; attempt < 80; attempt++) {
      const R = rng(n * 1000003 + attempt * 7919 + 11);
      const v = { seed: Math.floor(R() * 1e9), a: R(), b: R(), wall: Math.floor(R() * WALLS.length), cur: Math.floor(R() * VIVID.length), left: R() < 0.5 };
      v.wx = 30 + Math.floor(R() * 290);
      const zones = T.zones(v), blocks = T.blocks ? T.blocks(v) : [];
      const objs = place(R, zones, blocks, n);
      const px = canPx && attempt < 60 ? (j, set, reg) => measure(U, T, v, objs, j, set, reg) : null;
      const diffs = pickDiffs(R, n, k, objs, zones, blocks, (x, y) => T.bgAt(v, x, y), px);
      if (!diffs) continue;
      const A = objs.map(o => Object.assign({}, o)), B = objs.map(o => Object.assign({}, o));
      for (const d of diffs) Object.assign((d.side ? B : A)[d.j], d.set);
      return { n, theme, v, A, B, diffs, k, time: timeFor(n), attempt };
    }
    return null;
  }
  // כמה פיקסלים כל סוג הבדל צריך לשנות לפחות (הבדיקות דורשות 350 לכל הבדל; היפוך במראה צריך יותר כדי שיבלוט)
  const MIN_PX = { remove: 420, recolor: 420, move: 420, resize: 480, mirror: 600 };
  function pickDiffs(R, n, k, objs, zones, blocks, bgAt, px) {
    const minS = n <= 10 ? 38 : n <= 20 ? 33 : 29;
    const kinds = n <= 4 ? ['remove', 'recolor', 'move'] : n <= 10 ? ['remove', 'recolor', 'move', 'resize'] : ['remove', 'recolor', 'move', 'resize', 'mirror'];
    const order = objs.map((o, j) => j).filter(j => { const o = objs[j], b = bbox(o); return o.s >= minS && Math.min(b[2] - b[0], b[3] - b[1]) >= MIN_SIDE; });
    for (let i = order.length - 1; i > 0; i--) { const r = Math.floor(R() * (i + 1)); [order[i], order[r]] = [order[r], order[i]]; }
    const free = (b, j) => !objs.some((p, i) => i !== j && hits(b, grow(bbox(p), 5))) && !blocks.some(r => hits(b, [r[0], r[1], r[0] + r[2], r[1] + r[3]]));
    const diffs = [], used = {}, cap = Math.ceil(k * 0.4);
    let ki = Math.floor(R() * kinds.length);
    // מעבר ראשון: גיוון — לא יותר מ-40% מאותו סוג הבדל. השני (רק אם חסר): בלי הגבלה
    for (let pass = 0; pass < 2 && diffs.length < k; pass++) for (const j of order) {
      if (diffs.length >= k) break;
      if (diffs.some(d => d.j === j)) continue;
      const o = objs[j], b0 = bbox(o), zone = zones[o.z], bg = bgAt(o.x, o.y), fl = TY[o.t][2];
      for (let tt = 0; tt < kinds.length; tt++) {
        const kind = kinds[(ki + tt) % kinds.length];
        if (!pass && (used[kind] || 0) >= cap) continue;
        let set = null, reg = null;
        if (kind === 'remove') { if ((cdist(o.k, bg) >= 110 || o.t === 'cloud') && (b0[2] - b0[0]) * (b0[3] - b0[1]) * 0.5 >= MIN_AREA) { set = { gone: true }; reg = b0; } }
        else if (kind === 'recolor' && fl.includes('r') && (COVER[o.t] || 0) * (b0[2] - b0[0]) * (b0[3] - b0[1]) >= MIN_AREA) {
          const pal = ALT[o.t] || RECOL, start = Math.floor(R() * pal.length);
          for (let c = 0; c < pal.length && !set; c++) { const nc = pal[(start + c) % pal.length]; if (cdist(nc, o.k) >= 230 && cdist(nc, bg) >= 140) set = { k: nc }; }
          reg = b0;
        } else if (kind === 'mirror' && fl.includes('a') && o.s >= 40) { set = { f: -o.f }; reg = b0; }
        else if (kind === 'move') {
          for (let tr = 0; tr < 16 && !set; tr++) {
            const a = zone.base != null ? (R() < 0.5 ? 0 : Math.PI) : R() * PI2, dd = Math.max(32, o.s * (0.75 + R() * 0.4));
            const nx = Math.round(o.x + Math.cos(a) * dd), ny = Math.round(zone.base != null ? o.y : o.y + Math.sin(a) * dd);
            const nb = bbox(Object.assign({}, o, { x: nx, y: ny }));
            if (inside(nb, zone.box) && free(grow(nb, 4), j)) { set = { x: nx, y: ny }; reg = union(b0, nb); }
          }
        } else if (kind === 'resize') {
          for (const f of [1.42, 0.64]) {
            if (set) break;
            const ns = Math.round(o.s * f), ny = zone.base != null ? Math.round(zone.base - TY[o.t][1] * ns) : o.y;
            const nb = bbox(Object.assign({}, o, { s: ns, y: ny }));
            const dA = Math.abs((nb[2] - nb[0]) * (nb[3] - nb[1]) - (b0[2] - b0[0]) * (b0[3] - b0[1])) * 0.6;
            if (ns >= 24 && dA >= MIN_AREA && Math.min(nb[2] - nb[0], nb[3] - nb[1]) >= MIN_SIDE && inside(nb, zone.box) && free(grow(nb, 4), j)) { set = { s: ns, y: ny }; reg = union(b0, nb); }
          }
        }
        if (!set) continue;
        let r = grow(reg, 6);
        // בדפדפן: ההבדל נמדד בפיקסלים. קטן מדי — לא נבחר. העיגול מקיף בדיוק את מה שהשתנה
        if (px) { const m = px(j, set, r); if (m.c < MIN_PX[kind]) continue; r = grow(union(m.box, reg), 6); }
        if (r[0] < 0 || r[1] < 0 || r[2] > SW || r[3] > SH) r = [Math.max(0, r[0]), Math.max(0, r[1]), Math.min(SW, r[2]), Math.min(SH, r[3])];
        if (diffs.some(d => hits(grow(d.reg, 4), grow(r, 4)))) continue;
        diffs.push({ j, kind, side: R() < 0.5 ? 0 : 1, set, reg: r });
        used[kind] = (used[kind] || 0) + 1;
        ki++;
        break;
      }
    }
    return diffs.length === k ? diffs : null;
  }
  const levelCache = {};
  const getLevel = n => levelCache[n] || (levelCache[n] = buildLevel(n));
  // בדיקה בקוד של כל שלב: מספר, גודל, ניגוד, ובלי חפיפות
  function verifyLevel(n) {
    const L = getLevel(n), errs = [];
    if (!L) return ['no level'];
    if (L.diffs.length !== nDiffs(n) || L.diffs.length < 5 || L.diffs.length > 7) errs.push('count ' + L.diffs.length);
    const T = THEMES[L.theme];
    L.diffs.forEach((d, i) => {
      const o = L.A[d.j], b = bbox(o), b2 = bbox(L.B[d.j]);
      if (Math.min(b[2] - b[0], b[3] - b[1], b2[2] - b2[0], b2[3] - b2[1]) < MIN_SIDE || Math.min(L.A[d.j].s, L.B[d.j].s) < 24) errs.push(i + ': too small');
      if (d.reg[0] < -6 || d.reg[1] < -6 || d.reg[2] > SW + 6 || d.reg[3] > SH + 6) errs.push(i + ': outside the picture');
      if (d.kind === 'recolor' && cdist(L.A[d.j].k, L.B[d.j].k) < 230) errs.push(i + ': colours too close');
      if (d.kind === 'remove' && o.t !== 'cloud' && cdist(o.k, T.bgAt(L.v, o.x, o.y)) < 110) errs.push(i + ': no contrast with the background');
      L.diffs.forEach((e, k2) => { if (k2 > i && hits(d.reg, e.reg)) errs.push(i + ' overlaps ' + k2); });
    });
    return errs;
  }

  // ----- ציור תמונה שלמה -----
  function paintScene(g, X, T, v, objs) {
    X.save();
    T.bg(X, g, v);
    for (const o of objs) {
      if (o.gone) continue;
      X.save(); X.translate(o.x, o.y); if (o.f < 0) X.scale(-1, 1);
      ol(X, o.s);
      DRAW[o.t](X, g, o.s, o.k, o.k2, o);
      X.restore();
    }
    X.restore();
  }
  const renderScene = (g, X, L, side) => paintScene(g, X, THEMES[L.theme], L.v, side ? L.B : L.A);
  const sceneCache = { key: '', cv: [null, null] };
  function drawPanel(g, ctx, S, side, px, py) {
    const L = S.L, tr = ctx.getTransform ? ctx.getTransform() : null, res = tr ? Math.hypot(tr.a, tr.b) : 1;
    if (typeof document !== 'undefined' && document.createElement && res > 0) {
      const key = L.n + '@' + res.toFixed(3);
      if (sceneCache.key !== key) {
        sceneCache.key = key;
        sceneCache.cv = [0, 1].map(sd => {
          const cv = document.createElement('canvas');
          cv.width = Math.round(SW * res); cv.height = Math.round(SH * res);
          const c2 = cv.getContext('2d'); c2.setTransform(res, 0, 0, res, 0, 0);
          renderScene(g, c2, L, sd);
          return cv;
        });
      }
      ctx.drawImage(sceneCache.cv[side], px, py, SW, SH);
    } else { ctx.save(); ctx.translate(px, py); renderScene(g, ctx, L, side); ctx.restore(); }
  }

  // ----- מצב ומסך -----
  function makeState(g, L) {
    const S = { L, found: L.diffs.map(() => -1), nf: 0, marks: [], hint: null, hints: HINTS, time: L.time, t: 0, lock: 0, won: false, lost: false, press: 0, hoverHint: false, lastSec: -1, botT: 0, miss: 0, endT: 0, stars: 0 };
    layout(g, S);
    return S;
  }
  function layout(g, S) {
    if (g.W > g.H) {
      S.panels = [[8, 8], [g.W - 8 - SW, 8]];
      const y = 8 + SH + 12;
      S.strip = { y, h: g.H - y - 6 };
      S.dots = { x: 18, y: y + S.strip.h / 2 };
      S.bar = { x: 264, y: y + S.strip.h / 2 - 13, w: 520, h: 26 };
      S.hbtn = { x: g.W - 8 - 130, y: y + 4, w: 130, h: S.strip.h - 8 };
    } else {
      S.panels = [[8, 8], [8, 8 + SH + 10]];
      const y = 8 + 2 * SH + 20;
      S.strip = { y, h: g.H - y - 6 };
      S.dots = { x: 14, y: y + 22 };
      S.bar = { x: 14, y: y + 44, w: g.W - 28 - 140, h: 24 };
      S.hbtn = { x: g.W - 8 - 128, y: y + 6, w: 128, h: S.strip.h - 12 };
    }
  }
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    g.hud([[g.t('level'), g.level], [g.t('found'), S.nf + '/' + S.L.k], [g.t('time'), fmtT(S.time), S.time < 10 ? '#ff7a7a' : null]]);
  }
  // נקודה בעולם → איזו תמונה ואיפה בתוכה
  function toScene(S, x, y) {
    for (let p = 0; p < 2; p++) { const [px, py] = S.panels[p]; if (x >= px && x <= px + SW && y >= py && y <= py + SH) return { p, x: x - px, y: y - py }; }
    return null;
  }
  function diffAt(S, sx, sy) {
    let best = -1, bd = 1e9;
    S.L.diffs.forEach((d, i) => {
      if (S.found[i] >= 0) return;
      const r = grow(d.reg, 10);
      if (sx < r[0] || sx > r[2] || sy < r[1] || sy > r[3]) return;
      const dd = Math.hypot(sx - (r[0] + r[2]) / 2, sy - (r[1] + r[3]) / 2);
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }
  function clickAt(g, x, y) {
    const S = g.s;
    if (S.won || S.lost) return;
    const hb = S.hbtn;
    if (x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) { useHint(g); return; }
    const q = toScene(S, x, y);
    if (!q || S.lock > 0) return;
    const i = diffAt(S, q.x, q.y);
    if (i >= 0) found(g, i, q);
    else {
      S.lock = 18; S.miss++;
      S.time = Math.max(0, S.time - PENALTY);
      S.marks.push({ p: q.p, x: q.x, y: q.y, t: 0 });
      if (S.marks.length > 12) S.marks.shift();
      g.sfx('error'); g.shake(4);
      g.float(x, y - 20, '-' + PENALTY, { color: '#ff6b6b', size: 26 });
    }
  }
  function found(g, i, q) {
    const S = g.s, d = S.L.diffs[i];
    S.found[i] = S.t; S.nf++;
    if (S.hint && S.hint.i === i) S.hint = null;
    g.sfx('coin', { p: 1 + S.nf * 0.07 });
    for (const [px, py] of S.panels) { const cx = px + (d.reg[0] + d.reg[2]) / 2, cy = py + (d.reg[1] + d.reg[3]) / 2; g.burst(cx, cy, { n: 16, color: ['#39e07a', '#ffffff', '#ffe45a'], speed: 3.2, life: 34, gravity: 0.02 }); }
    const [px, py] = S.panels[q.p];
    g.float(px + q.x, py + q.y - 24, '✓', { color: '#39e07a', size: 30 });
    if (S.nf === S.L.k) {
      // כל ההבדלים נמצאו: חגיגה קצרה (השעון עוצר), ואז חלון סוף השלב (ב-step)
      S.won = true; S.endT = 0; S.hint = null;
      const frac = S.time / S.L.time;
      S.stars = frac >= 0.5 ? 3 : frac >= 0.25 ? 2 : 1;
      for (const [x0, y0] of S.panels) g.burst(x0 + SW / 2, y0 + SH / 2, { n: 50, color: ['#ffd84d', '#ff5d8f', '#4fb8ff', '#7cf0a0', '#ffffff'], speed: 6, life: 60, gravity: 0.1, shape: 'square', size: 7 });
      g.flash('#ffffff', 0.25);
      g.sfx('power');
    }
    hud(g);
  }
  function useHint(g) {
    const S = g.s;
    if (S.hints <= 0 || S.won || S.lost) { g.sfx('error'); return; }
    const left = S.L.diffs.map((d, i) => i).filter(i => S.found[i] < 0 && !(S.hint && S.hint.i === i));
    if (!left.length) return;
    S.hints--; S.press = 8;
    S.hint = { i: left[0], t: 0 };
    g.sfx('power');
  }

  // ----- ציור -----
  function ring(g, ctx, cx, cy, rx, ry, col, prog, w) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(10,20,10,.55)'; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + PI2 * prog); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + PI2 * prog); ctx.stroke();
    ctx.restore();
  }
  const ringOf = d => { const w = d.reg[2] - d.reg[0], h = d.reg[3] - d.reg[1]; return [(d.reg[0] + d.reg[2]) / 2, (d.reg[1] + d.reg[3]) / 2, Math.max(24, w * 0.62 + 4), Math.max(24, h * 0.62 + 4)]; };
  function drawBackdrop(g, ctx) {
    const q = ctx.createLinearGradient(0, 0, 0, g.H);
    q.addColorStop(0, '#2a2350'); q.addColorStop(1, '#171433');
    ctx.fillStyle = q; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (let x = 12; x < g.W; x += 28) for (let y = 12; y < g.H; y += 28) { ctx.beginPath(); ctx.arc(x, y, 2, 0, PI2); ctx.fill(); }
  }
  function drawGame(g, ctx, S) {
    drawBackdrop(g, ctx);
    const intro = Math.min(1, S.t / 18);
    S.panels.forEach(([px, py], p) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
      g.rr(ctx, px - 4, py - 4, SW + 8, SH + 8, 14); ctx.fillStyle = '#f7f3e8'; ctx.fill();
      ctx.restore();
      ctx.save();
      g.rr(ctx, px, py, SW, SH, 10); ctx.clip();
      ctx.globalAlpha = 0.3 + 0.7 * intro;
      drawPanel(g, ctx, S, p, px, py);
      ctx.globalAlpha = 1;
      // סימונים
      S.L.diffs.forEach((d, i) => {
        const [cx, cy, rx, ry] = ringOf(d);
        if (S.found[i] >= 0) ring(g, ctx, px + cx, py + cy, rx, ry, '#39e07a', Math.min(1, (S.t - S.found[i]) / 16), 5);
        else if (S.lost) ring(g, ctx, px + cx, py + cy, rx, ry, '#ffb020', 1, 5);
      });
      if (S.hint && !S.won) {
        const [cx, cy, rx, ry] = ringOf(S.L.diffs[S.hint.i]), k = 1 + 0.12 * Math.sin(S.hint.t * 0.2);
        ctx.save(); ctx.globalAlpha = Math.min(1, (150 - S.hint.t) / 30);
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.hint.t;
        ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(px + cx, py + cy, rx * k + 6, ry * k + 6, 0, 0, PI2); ctx.stroke();
        ctx.restore();
      }
      for (const m of S.marks) {
        if (m.p !== p || m.t > 50) continue;
        const a = 1 - m.t / 50, r = 13 + m.t * 0.12;
        ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(px + m.x - r, py + m.y - r); ctx.lineTo(px + m.x + r, py + m.y + r); ctx.moveTo(px + m.x + r, py + m.y - r); ctx.lineTo(px + m.x - r, py + m.y + r); ctx.stroke();
        ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
    if (g.demo) return;
    // שורת המצב: עיגולים של הבדלים, שעון, כפתור רמז
    const D = S.dots;
    for (let i = 0; i < S.L.k; i++) {
      const x = D.x + 13 + i * 30, on = i < S.nf;
      g.circle(ctx, x, D.y, 11); ctx.fillStyle = on ? '#39e07a' : 'rgba(255,255,255,.12)'; ctx.fill();
      ctx.strokeStyle = on ? '#1d8a46' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
      if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 5, D.y); ctx.lineTo(x - 1, D.y + 4); ctx.lineTo(x + 5, D.y - 4); ctx.stroke(); }
    }
    const B = S.bar, frac = g.clamp(S.time / S.L.time, 0, 1), low = S.time < 10 && !S.won;
    g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
    if (frac > 0) {
      const q = ctx.createLinearGradient(B.x, 0, B.x + B.w, 0);
      q.addColorStop(0, '#ff5a5a'); q.addColorStop(0.35, '#ffd84d'); q.addColorStop(1, '#39e07a');
      ctx.save(); g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2); ctx.clip();
      ctx.fillStyle = low && (S.t % 30) < 15 ? '#ff5a5a' : q; ctx.fillRect(B.x, B.y, B.w * frac, B.h);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(B.x, B.y + 2, B.w * frac, B.h * 0.3);
      ctx.restore();
    }
    g.text(ctx, '⏱ ' + fmtT(S.time), B.x + B.w / 2, B.y + B.h / 2 + 1, { size: 17, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
    const H = S.hbtn, dy = S.press > 0 ? 3 : 0, dim = S.hints <= 0 || S.won || S.lost;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.45;
    g.rr(ctx, H.x, H.y + 4, H.w, H.h, 16); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    g.rr(ctx, H.x, H.y + dy, H.w, H.h, 16);
    const hq = ctx.createLinearGradient(0, H.y, 0, H.y + H.h); hq.addColorStop(0, S.hoverHint ? '#ffe680' : '#ffd84a'); hq.addColorStop(1, S.hoverHint ? '#f7b733' : '#e8a317');
    ctx.fillStyle = hq; ctx.fill(); ctx.strokeStyle = '#7a5208'; ctx.lineWidth = 3; ctx.stroke();
    g.text(ctx, '💡 ×' + S.hints, H.x + H.w / 2, H.y + H.h / 2 + dy + 1, { size: 22, weight: 900, color: '#3d2a05' });
    if (!g.touch) g.text(ctx, 'H', H.x + H.w - 14, H.y + 13 + dy, { size: 12, weight: 800, color: '#6b4706' });
    ctx.restore();
  }

  const T = {
    he: { title: 'מצא את ההבדלים', help: ['מצא את כל ההבדלים לפני שהזמן נגמר!', 'לחץ על הבדל באחת התמונות — הוא יסומן בשתיהן', 'לחיצה שגויה עולה 5 שניות. 💡 מראה הבדל אחד', 'מהר יותר = יותר כוכבים'], helpTouch: ['מצא את כל ההבדלים לפני שהזמן נגמר!', 'הקש על הבדל באחת התמונות — הוא יסומן בשתיהן', 'הקשה שגויה עולה 5 שניות. 💡 מראה הבדל אחד', 'מהר יותר = יותר כוכבים'], found: 'נמצאו', findN: 'מצא {n} הבדלים!', result: 'נשארו {s} שניות · טעויות: {m}', timeUp: 'נגמר הזמן!', lostText: 'מצאת {n} מתוך {k}. ההבדלים שנשארו מסומנים בכתום' },
    en: { title: 'Spot the Difference', help: ['Find all the differences before time runs out!', 'Click one in either picture — it gets circled in both', 'A wrong click costs 5 seconds. 💡 shows one', 'Faster = more stars'], helpTouch: ['Find all the differences before time runs out!', 'Tap one in either picture — it gets circled in both', 'A wrong tap costs 5 seconds. 💡 shows one', 'Faster = more stars'], found: 'Found', findN: 'Find {n} differences!', result: '{s} seconds left · Mistakes: {m}', timeUp: "Time's up!", lostText: 'You found {n} of {k}. The ones left are circled in orange' },
    ar: { title: 'أوجد الاختلافات', help: ['أوجد كل الاختلافات قبل أن ينفد الوقت!', 'انقر على اختلاف في أي صورة — فيُحاط في الصورتين', 'النقرة الخاطئة تكلّف 5 ثوانٍ. 💡 يُظهر اختلافاً', 'أسرع = نجوم أكثر'], helpTouch: ['أوجد كل الاختلافات قبل أن ينفد الوقت!', 'المس اختلافاً في أي صورة — فيُحاط في الصورتين', 'اللمسة الخاطئة تكلّف 5 ثوانٍ. 💡 يُظهر اختلافاً', 'أسرع = نجوم أكثر'], found: 'وُجد', findN: 'أوجد {n} اختلافات!', result: 'بقي {s} ثانية · الأخطاء: {m}', timeUp: 'انتهى الوقت!', lostText: 'وجدت {n} من {k}. الباقي محاط باللون البرتقالي' },
    es: { title: 'Encuentra las diferencias', help: ['¡Encuentra todas las diferencias a tiempo!', 'Haz clic en una, en cualquier imagen: se marca en las dos', 'Un clic equivocado cuesta 5 segundos. 💡 muestra una', 'Más rápido = más estrellas'], helpTouch: ['¡Encuentra todas las diferencias a tiempo!', 'Toca una, en cualquier imagen: se marca en las dos', 'Un toque equivocado cuesta 5 segundos. 💡 muestra una', 'Más rápido = más estrellas'], found: 'Halladas', findN: '¡Encuentra {n} diferencias!', result: 'Quedan {s} segundos · Errores: {m}', timeUp: '¡Se acabó el tiempo!', lostText: 'Encontraste {n} de {k}. Las que faltan están en naranja' },
    fr: { title: 'Trouve les différences', help: ['Trouve toutes les différences à temps !', 'Clique dessus dans l’une des deux images', 'Un mauvais clic coûte 5 secondes. 💡 en montre une', 'Plus vite = plus d’étoiles'], helpTouch: ['Trouve toutes les différences à temps !', 'Touche-la dans l’une des deux images', 'Un mauvais toucher coûte 5 secondes. 💡 en montre une', 'Plus vite = plus d’étoiles'], found: 'Trouvées', findN: 'Trouve {n} différences !', result: 'Il reste {s} secondes · Erreurs : {m}', timeUp: 'Temps écoulé !', lostText: 'Tu en as trouvé {n} sur {k}. Les autres sont entourées en orange' },
    pt: { title: 'Jogo dos erros', help: ['Ache todas as diferenças antes que o tempo acabe!', 'Clique numa delas em qualquer imagem: marca nas duas', 'Um clique errado custa 5 segundos. 💡 mostra uma', 'Mais rápido = mais estrelas'], helpTouch: ['Ache todas as diferenças antes que o tempo acabe!', 'Toque numa delas em qualquer imagem: marca nas duas', 'Um toque errado custa 5 segundos. 💡 mostra uma', 'Mais rápido = mais estrelas'], found: 'Achadas', findN: 'Ache {n} diferenças!', result: 'Sobraram {s} segundos · Erros: {m}', timeUp: 'Acabou o tempo!', lostText: 'Você achou {n} de {k}. As que faltaram estão em laranja' },
    ru: { title: 'Найди отличия', help: ['Найди все отличия, пока не кончилось время!', 'Нажми на отличие на любой картинке — оно обведётся на обеих', 'Неверный клик стоит 5 секунд. 💡 показывает одно', 'Быстрее = больше звёзд'], helpTouch: ['Найди все отличия, пока не кончилось время!', 'Коснись отличия на любой картинке — оно обведётся на обеих', 'Неверное касание стоит 5 секунд. 💡 показывает одно', 'Быстрее = больше звёзд'], found: 'Найдено', findN: 'Найди {n} отличий!', result: 'Осталось {s} с · Ошибок: {m}', timeUp: 'Время вышло!', lostText: 'Найдено {n} из {k}. Остальные обведены оранжевым' },
    de: { title: 'Finde die Unterschiede', help: ['Finde alle Unterschiede, bevor die Zeit abläuft!', 'Klicke ihn in einem der beiden Bilder an', 'Ein falscher Klick kostet 5 Sekunden. 💡 zeigt einen', 'Schneller = mehr Sterne'], helpTouch: ['Finde alle Unterschiede, bevor die Zeit abläuft!', 'Tippe ihn in einem der beiden Bilder an', 'Falsches Tippen kostet 5 Sekunden. 💡 zeigt einen', 'Schneller = mehr Sterne'], found: 'Gefunden', findN: 'Finde {n} Unterschiede!', result: 'Noch {s} Sekunden · Fehler: {m}', timeUp: 'Die Zeit ist um!', lostText: 'Du hast {n} von {k} gefunden. Die übrigen sind orange eingekreist' },
  };

  GK.register('spot-difference', {
    get w() { return portrait() ? 496 : 984; },
    get h() { return portrait() ? 900 : 486; },
    bg: '#1d1940', accent: '#ffd84a',
    levels: LEVELS,
    text: T,

    init(g) {
      g.s = makeState(g, getLevel(g.demo ? 1 : g.level));
      if (g.demo) g.s.t = 60;
      else g.msg(g.t('findN', { n: g.s.L.k }), 1400, '#ffd84a');
      hud(g);
    },

    step(g) {
      const S = g.s;
      S.t++;
      if (S.lock > 0) S.lock--;
      if (S.press > 0) S.press--;
      for (const m of S.marks) m.t++;
      if (S.hint) { S.hint.t++; if (S.hint.t > 150) S.hint = null; }
      if (!S.won && !S.lost) {
        S.time = Math.max(0, S.time - 1 / 60);
        const sec = Math.ceil(S.time);
        if (S.time < 10 && sec !== S.lastSec) g.sfx('tick', { p: 1.3 });
        S.lastSec = sec;
        if (S.time <= 0) {
          // נגמר הזמן: ההבדלים שנשארו מסומנים בכתום, ואחרי רגע חלון הסוף
          S.lost = true; S.hint = null; S.endT = 0;
          g.shake(6); g.flash('#ff3b3b', 0.2);
          g.tone({ f: 220, f2: 110, dur: 0.5, type: 'sawtooth', vol: 0.08 });
          g.msg(g.t('timeUp'), 1300, '#ffb020');
        }
      } else if (++S.endT === (S.won ? 50 : 90)) {
        if (S.won) g.completeLevel(S.stars, { text: g.t('result', { s: Math.ceil(S.time), m: S.miss }), delay: 350 });
        else g.end({ result: 'lose', score: null, title: g.t('timeUp'), text: g.t('lostText', { n: S.nf, k: S.L.k }), delay: 350 });
      }
      hud(g);
    },
    idle(g) { const S = g.s; if (!S) return; S.t++; for (const m of S.marks) m.t++; },

    // בוט לבדיקות: לוחץ על הבדל שעוד לא נמצא דרך אותה פונקציית לחיצה של השחקן, כל חצי שנייה
    bot(g) {
      const S = g.s;
      if (S.won || S.lost || ++S.botT < 30) return;
      S.botT = 0;
      const i = S.found.findIndex(f => f < 0);
      if (i < 0) return;
      const d = S.L.diffs[i], p = S.t % 2, [px, py] = S.panels[p];
      clickAt(g, px + (d.reg[0] + d.reg[2]) / 2, py + (d.reg[1] + d.reg[3]) / 2);
    },

    onKey(g, e) { if (e.code === 'KeyH' && !e.repeat) useHint(g); },
    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') { clickAt(g, p.x, p.y); return; }
      if (type === 'move') {
        const hb = S.hbtn;
        S.hoverHint = p.kind !== 'touch' && p.x >= hb.x && p.x <= hb.x + hb.w && p.y >= hb.y && p.y <= hb.y + hb.h;
        g.canvas.style.cursor = S.hoverHint ? 'pointer' : toScene(S, p.x, p.y) ? 'crosshair' : 'default';
      }
    },

    draw(g, ctx) { if (g.s) drawGame(g, ctx, g.s); },
    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const L = getLevel(1);
      const q = ctx.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#2a2350'); q.addColorStop(1, '#171433');
      ctx.fillStyle = q; ctx.fillRect(0, 0, w, h);
      const sc = 0.955, py = (h - SH * sc) / 2;
      [0, 1].forEach(side => {
        const px = side ? w - 10 - SW * sc : 10;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; k.rr(ctx, px - 4, py - 4, SW * sc + 8, SH * sc + 8, 14); ctx.fillStyle = '#f7f3e8'; ctx.fill();
        ctx.restore();
        ctx.save(); k.rr(ctx, px, py, SW * sc, SH * sc, 10); ctx.clip();
        ctx.translate(px, py); ctx.scale(sc, sc);
        renderScene(k, ctx, L, side);
        L.diffs.slice(0, 3).forEach(d => { const [cx, cy, rx, ry] = ringOf(d); ring(k, ctx, cx, cy, rx, ry, '#39e07a', 1, 6); });
        ctx.restore();
      });
      // זכוכית מגדלת
      const mx = w / 2, my = h * 0.6;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.6);
      k.rr(ctx, -10, 46, 20, 70, 9); ctx.fillStyle = '#8a5a36'; ctx.fill(); ctx.strokeStyle = '#3d2a14'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(mx, my, 52, 0, PI2); ctx.fillStyle = 'rgba(200,235,255,.35)'; ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = '#2b2f36'; ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = '#ffd84a'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(mx - 18, my - 20, 14, 8, -0.7, 0, PI2); ctx.fill();
    },

    // לבדיקות בלבד
    dev: { getLevel, verifyLevel, renderScene, SW, SH, nDiffs, timeFor, DRAW, TY },
  });
})();
