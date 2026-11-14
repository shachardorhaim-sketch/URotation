// ============================================================
//  חללית נגד חייזרים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  יורה אנכי: החללית למטה יורה לבד, גלים של חייזרים נכנסים במבנים וצוללים עליה.
//  כל גל חמישי בוס ענק עם פס חיים ודפוסי התקפה. שדרוגים: ירייה כפולה, מגן, ירי מהיר.
// ============================================================
(function () {
  const W = 600, H = 800, TAU = Math.PI * 2;
  const SHIP_Y = 728, SHIP_TOP = 470, SHIP_BOT = 764;
  // רמת הקושי: כמה החייזרים יורים (fire, bfire), מהירות הכדורים (bs, bbs), כמה צוללים ובאיזו מהירות.
  // hr = רדיוס הפגיעה בחללית (קטן = סלחני). fan/aim/spin/mins = עוצמת הדפוסים של הבוס.
  const DIFF = [
    { bs: 2.1, fire: 0.27, dive: 0.5, dsp: 2.4, bbs: 2.1, bfire: 0.5, hr: 6, fan: 5, aim: 2, spin: 13, mins: 3 },
    { bs: 3.2, fire: 0.68, dive: 0.95, dsp: 3.4, bbs: 3.1, bfire: 0.85, hr: 7.5, fan: 7, aim: 3, spin: 8, mins: 4 },
    { bs: 4.6, fire: 1.35, dive: 1.45, dsp: 4.5, bbs: 4.4, bfire: 1.25, hr: 8.5, fan: 11, aim: 5, spin: 5, mins: 6 },
  ];
  const TYPES = {
    b: { hp: 1, pts: 100, r: 17, body: '#5be36b', dark: '#1d8a3a', light: '#d4ffbe' },   // ירוק רגיל
    z: { hp: 2, pts: 150, r: 17, body: '#b07cff', dark: '#5527a3', light: '#ecdcff' },   // סגול עם עין אחת, יורה כפול
    d: { hp: 1, pts: 200, r: 16, body: '#ff9a3d', dark: '#b4461a', light: '#ffe0b8' },   // כתום צולל
    t: { hp: 3, pts: 300, r: 19, body: '#4fb2ff', dark: '#1c5aa6', light: '#d6edff' },   // כחול עם קסדה, 3 פגיעות
  };
  const PUPS = {
    dbl: { col: '#ffd84d', dark: '#a87300', dur: 14 * 60 },
    rapid: { col: '#ff7ad9', dark: '#9c1f78', dur: 10 * 60 },
    shield: { col: '#5fe3ff', dark: '#13789e', dur: 10 * 60 },
    life: { col: '#ff5d7a', dark: '#a3172e', dur: 0 },
  };
  // מבני הגלים: כל שורה ממורכזת לבד, רווח = מקום ריק
  const WAVES = [
    ['bbbbbb', 'bbbbbb'],
    ['zbzbzbz', 'bbbbbbb', 'bbbbbbb'],
    ['d d d d d', 'zzzzzzz', 'bbbbbbb', 'bbbbbbb'],
    ['ttt   ttt', 'zzzzzzzzz', 'ddddddd', 'bbbbbbbbb'],
  ];
  const LATE = [
    ['  ddddd  ', ' tzzzzzt ', 'bbbbbbbbb', 'bbbbbbbbb', ' ddddddd '],
    ['t t t t t', 'zzzzzzzzz', 'dbdbdbdbd', 'bbbbbbbbb', 'bbbbbbbbb'],
    ['dd ttt dd', 'zzzzzzzzz', 'bbbbbbbbb', 'zzzzzzzzz'],
    ['    t    ', '   zzz   ', '  ddddd  ', ' bbbbbbb ', 'bbbbbbbbb'],
    ['tdtdtdtdt', 'zzzzzzzzz', 'bbbbbbbbb', 'bbbbbbbbb'],
  ];
  // מסלולי כניסה (עקומת בזייה): נקודת התחלה ושתי נקודות שליטה, מצד שמאל. הסוף הוא המקום במבנה.
  const PATHS = [
    [-40, 70, 470, 150, 40, 400],
    [170, -40, 540, 360, 70, 390],
    [-40, 330, 320, 410, 560, 110],
  ];
  const SLOT_W = 52, SLOT_H = 46;

  const compact = (arr, keep) => { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; };
  const waveMul = n => Math.min(1.9, 1 + (n - 1) * 0.055);

  // ---------- רקע: ערפילית וכוכב לכת מצוירים פעם אחת ----------
  let NEB = null;
  function nebula() {
    if (NEB) return NEB;
    const c = document.createElement('canvas'), k = 2;
    c.width = W * k; c.height = H * k;
    const x = c.getContext('2d');
    x.scale(k, k);
    paintNebula(x, W, H, GK.U.seeded(77));
    NEB = c;
    return c;
  }
  function paintNebula(x, w, h, R) {
    const blobs = [['#5a2a9a', 0.22], ['#1f4fa8', 0.22], ['#127a8a', 0.16], ['#9a2a7a', 0.14]];
    for (let i = 0; i < 9; i++) {
      const [col, a] = blobs[i % blobs.length];
      const cx = R() * w, cy = R() * h, r = (0.25 + R() * 0.35) * w;
      for (const dy of [-h, 0, h]) {   // נמשך מעל ומתחת כדי שהגלילה תהיה רציפה
        const gr = x.createRadialGradient(cx, cy + dy, 0, cx, cy + dy, r);
        gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0));
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
      }
    }
    for (let i = 0; i < 160; i++) {
      x.globalAlpha = 0.15 + R() * 0.35;
      x.fillStyle = R() < 0.2 ? '#ffd9f0' : '#cfe2ff';
      x.fillRect(R() * w, R() * h, 1, 1);
    }
    x.globalAlpha = 1;
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function drawPlanet(ctx, x, y, r) {
    ctx.save();
    const ring = (a0, a1) => {   // הטבעת: החצי האחורי לפני הכוכב, הקדמי אחריו
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ffd9a8'; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * 0.36, -0.3, a0, a1); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.95, r * 0.44, -0.3, a0, a1); ctx.stroke();
      ctx.globalAlpha = 1;
    };
    ring(Math.PI, TAU);
    const gr = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffb98a'); gr.addColorStop(0.55, '#d9606a'); gr.addColorStop(1, '#4a1840');
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = gr; ctx.fill();
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ffe0c0'; ctx.lineWidth = r * 0.06;
    for (const k of [-0.35, 0, 0.3]) { ctx.beginPath(); ctx.ellipse(x, y + k * r, r * 0.92, r * 0.1, 0, 0, TAU); ctx.stroke(); }
    ring(0, Math.PI);
    ctx.restore();
  }
  function makeStars() {
    const L = [], R = Math.random;
    for (const [n, sp, sz, a] of [[70, 0.35, 1.1, 0.5], [42, 0.85, 1.6, 0.75], [18, 1.7, 2.4, 1]]) {
      for (let i = 0; i < n; i++) L.push({ x: R() * W, y: R() * H, sp: sp * (0.8 + R() * 0.4), sz: sz * (0.7 + R() * 0.6), a, tw: R() * TAU });
    }
    return L;
  }
  function moveBg(S, k) {
    for (const s of S.stars) { s.y += s.sp * k; if (s.y > H + 3) { s.y = -3; s.x = Math.random() * W; } }
    S.bgY = (S.bgY + 0.18 * k) % H;
    S.planetY += 0.1 * k;
    if (S.planetY > H + 120) { S.planetY = -260; S.planetX = 80 + Math.random() * (W - 160); }
  }
  let BGG = null;
  function drawSpace(ctx, S, t) {
    if (!BGG) { BGG = ctx.createLinearGradient(0, 0, 0, H); BGG.addColorStop(0, '#050816'); BGG.addColorStop(0.55, '#0b0f2e'); BGG.addColorStop(1, '#1a1040'); }
    ctx.fillStyle = BGG; ctx.fillRect(0, 0, W, H);
    const n = nebula(), oy = S.bgY;
    ctx.drawImage(n, 0, oy - H, W, H); ctx.drawImage(n, 0, oy, W, H);
    drawPlanet(ctx, S.planetX, S.planetY, 46);
    for (const s of S.stars) {
      const a = s.a * (0.7 + 0.3 * Math.sin(t * 3 + s.tw));
      if (s.sp > 1.2) {   // הכוכבים הקרובים: נקודה עם הילה רכה
        ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#bcd4ff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * 1.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * 0.55, 0, TAU); ctx.fill();
      } else { ctx.globalAlpha = a; ctx.fillStyle = '#bcd4ff'; ctx.fillRect(s.x, s.y, s.sz, s.sz); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- ציור: חללית, חייזרים, בוס, שדרוגים ----------
  function drawShip(ctx, x, y, s, t, tilt, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * (1 - Math.abs(tilt) * 0.28), s);
    // להבות מנוע
    const fl = 0.75 + 0.25 * Math.sin(t * 40) + 0.1 * Math.sin(t * 23);
    for (const [ex, ln, wd] of [[0, 22, 7], [-13, 12, 4], [13, 12, 4]]) {
      const len = ln * fl * (o.boost ? 1.4 : 1);
      const gr = ctx.createLinearGradient(0, 18, 0, 18 + len);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#ffd84d'); gr.addColorStop(0.7, '#ff7a3a'); gr.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(ex - wd, 17); ctx.quadraticCurveTo(ex, 18 + len * 1.3, ex + wd, 17); ctx.closePath(); ctx.fill();
    }
    // כנפיים
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.scale(sg, 1);
      ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(27, 10); ctx.quadraticCurveTo(29, 19, 22, 20); ctx.lineTo(6, 17); ctx.closePath();
      const wg = ctx.createLinearGradient(6, 0, 28, 0); wg.addColorStop(0, '#3f78e0'); wg.addColorStop(1, '#22409a');
      ctx.fillStyle = wg; ctx.fill();
      ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(27, 10); ctx.quadraticCurveTo(29, 19, 22, 20); ctx.lineTo(20, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9fc0ff'; ctx.fillRect(10, 2, 2.5, 12);
      ctx.fillStyle = '#c9d9f5'; ctx.fillRect(12, 10, 3.5, 10);   // תותח קטן
      ctx.restore();
    }
    // גוף
    ctx.beginPath();
    ctx.moveTo(0, -30); ctx.bezierCurveTo(9, -22, 11, -8, 10, 6); ctx.lineTo(9, 19); ctx.lineTo(-9, 19); ctx.lineTo(-10, 6); ctx.bezierCurveTo(-11, -8, -9, -22, 0, -30);
    const bg = ctx.createLinearGradient(-10, 0, 10, 0); bg.addColorStop(0, '#9fb8e0'); bg.addColorStop(0.45, '#ffffff'); bg.addColorStop(1, '#8aa2cc');
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(4, -27, 6, -24, 6.5, -21); ctx.lineTo(-6.5, -21); ctx.bezierCurveTo(-6, -24, -4, -27, 0, -30); ctx.fill();
    // תא הטייס
    const cg = ctx.createLinearGradient(0, -16, 0, 4); cg.addColorStop(0, '#bff4ff'); cg.addColorStop(0.5, '#2fb6e8'); cg.addColorStop(1, '#0d4f86');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -6, 5.2, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-1.8, -10, 1.6, 3.6, 0.2, 0, TAU); ctx.fill();
    // אורות מהבהבים בקצות הכנפיים
    const on = Math.sin(t * 6) > 0;
    ctx.fillStyle = on ? '#ff5a6e' : '#7a2030'; ctx.beginPath(); ctx.arc(-25, 15, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = on ? '#6dff9a' : '#1e6a3a'; ctx.beginPath(); ctx.arc(25, 15, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawAlien(ctx, a, t, sx, sy) {
    const T = TYPES[a.t], r = T.r;
    ctx.save();
    ctx.translate(a.x, a.y); ctx.rotate(a.tilt || 0);
    const sc = a.sc || 1; if (sc !== 1) ctx.scale(sc, sc);
    const flap = Math.sin(t * 9 + a.ph);
    const white = a.flash > 0;
    // כנפיים / זרועות
    ctx.fillStyle = white ? '#ffffff' : T.dark;
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.scale(sg, 1);
      ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.15);
      ctx.quadraticCurveTo(r * 1.65, -r * 0.75 - flap * r * 0.32, r * 1.5, r * 0.3 - flap * r * 0.1);
      ctx.quadraticCurveTo(r * 1.05, r * 0.15, r * 0.6, r * 0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // גוף
    ctx.beginPath();
    if (a.t === 'd') { ctx.moveTo(0, r * 1.15); ctx.bezierCurveTo(r * 1.15, r * 0.35, r * 1.05, -r, 0, -r); ctx.bezierCurveTo(-r * 1.05, -r, -r * 1.15, r * 0.35, 0, r * 1.15); }
    else ctx.arc(0, 0, r, 0, TAU);
    if (white) ctx.fillStyle = '#ffffff';
    else { const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15); gr.addColorStop(0, T.light); gr.addColorStop(0.45, T.body); gr.addColorStop(1, T.dark); ctx.fillStyle = gr; }
    ctx.fill();
    // מבט אל החללית
    let lx = 0, ly = 1;
    if (sx != null) { const dx = sx - a.x, dy = sy - a.y, d = Math.hypot(dx, dy) || 1; lx = dx / d; ly = dy / d; }
    const blink = ((t * 60 + a.ph * 97) % 230) < 7;
    if (a.t === 'z') {   // עין אחת גדולה וקרניים
      ctx.fillStyle = white ? '#ffffff' : T.dark;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * r * 0.45, -r * 0.8); ctx.lineTo(sg * r * 0.75, -r * 1.35); ctx.lineTo(sg * r * 0.8, -r * 0.6); ctx.fill(); }
      eye(ctx, 0, -r * 0.05, r * 0.46, lx, ly, blink);
      ctx.strokeStyle = '#3a1670'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.58); ctx.lineTo(-r * 0.12, r * 0.48); ctx.lineTo(r * 0.1, r * 0.6); ctx.lineTo(r * 0.33, r * 0.48); ctx.stroke();
    } else {
      if (a.t === 'b') {   // אנטנות
        ctx.strokeStyle = white ? '#ffffff' : T.dark; ctx.lineWidth = 2;
        for (const sg of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(sg * r * 0.3, -r * 0.85); ctx.quadraticCurveTo(sg * r * 0.4, -r * 1.35, sg * r * 0.65, -r * 1.45); ctx.stroke();
          ctx.fillStyle = '#fff59a'; ctx.beginPath(); ctx.arc(sg * r * 0.65, -r * 1.45, 2.6 + Math.sin(t * 5 + a.ph) * 0.6, 0, TAU); ctx.fill();
        }
      }
      if (a.t === 't') {   // קסדה
        ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath();
        const hg = ctx.createLinearGradient(0, -r, 0, 0); hg.addColorStop(0, white ? '#fff' : '#e6eef8'); hg.addColorStop(1, white ? '#fff' : '#8a9bb3');
        ctx.fillStyle = hg; ctx.fill();
        ctx.fillStyle = '#ffcc33'; ctx.fillRect(-r * 0.12, -r * 1.02, r * 0.24, r * 0.75);
        if (a.hp < a.max) {   // סדקים בקסדה
          ctx.strokeStyle = '#3a4a60'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.62); ctx.lineTo(-r * 0.35, -r * 0.4); ctx.lineTo(-r * 0.48, -r * 0.22); ctx.stroke();
          if (a.hp < a.max - 1) { ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.7); ctx.lineTo(r * 0.3, -r * 0.45); ctx.lineTo(r * 0.45, -r * 0.25); ctx.stroke(); }
        }
      }
      const ey = a.t === 't' ? r * 0.12 : -r * 0.1;
      eye(ctx, -r * 0.38, ey, r * 0.3, lx, ly, blink);
      eye(ctx, r * 0.38, ey, r * 0.3, lx, ly, blink);
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.22, 0.2, Math.PI - 0.2); ctx.stroke();
      if (a.t === 'd') { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.55, r * 0.15, r * 0.25, 0.5, 0, TAU); ctx.fill(); }
    }
    if (a.carry) {   // נושא שדרוג: הילה זוהרת
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 8);
      ctx.strokeStyle = PUPS[a.carry].col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function eye(ctx, x, y, r, lx, ly, blink) {
    if (blink) { ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 0.8, y); ctx.lineTo(x + r * 0.8, y); ctx.stroke(); return; }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16162a'; ctx.beginPath(); ctx.arc(x + lx * r * 0.38, y + ly * r * 0.38, r * 0.52, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + lx * r * 0.38 - r * 0.18, y + ly * r * 0.38 - r * 0.2, r * 0.18, 0, TAU); ctx.fill();
  }

  function drawBoss(ctx, B, t, sx, sy) {
    ctx.save();
    ctx.translate(B.x, B.y);
    const rage = B.hp < B.max / 2, white = B.flash > 0;
    // אלומת אור מתחת
    const lg = ctx.createLinearGradient(0, 20, 0, 120);
    lg.addColorStop(0, rage ? 'rgba(255,90,120,.28)' : 'rgba(120,255,200,.22)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-40, 24); ctx.lineTo(40, 24); ctx.lineTo(70, 120); ctx.lineTo(-70, 120); ctx.closePath(); ctx.fill();
    // כיפת זכוכית עם החייזר בפנים
    const dg = ctx.createRadialGradient(-14, -44, 4, 0, -20, 58);
    dg.addColorStop(0, 'rgba(220,250,255,.4)'); dg.addColorStop(0.6, 'rgba(90,200,255,.14)'); dg.addColorStop(1, 'rgba(60,150,230,.42)');
    // החייזר
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -14, 50, 46, 0, Math.PI, TAU); ctx.closePath(); ctx.clip();
    const ag = ctx.createRadialGradient(-10, -40, 4, 0, -20, 40); ag.addColorStop(0, '#d4ffbe'); ag.addColorStop(0.5, '#5be36b'); ag.addColorStop(1, '#1d8a3a');
    ctx.fillStyle = white ? '#ffffff' : ag; ctx.beginPath(); ctx.ellipse(0, -14, 30, 32, 0, 0, TAU); ctx.fill();
    let lx = 0, ly = 1;
    if (sx != null) { const dx = sx - B.x, dy = sy - B.y, d = Math.hypot(dx, dy) || 1; lx = dx / d; ly = dy / d; }
    const blink = ((t * 60) % 200) < 7;
    eye(ctx, -12, -26, 9, lx, ly, blink); eye(ctx, 12, -26, 9, lx, ly, blink);
    if (rage) { ctx.strokeStyle = '#123a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-21, -40); ctx.lineTo(-5, -34); ctx.moveTo(21, -40); ctx.lineTo(5, -34); ctx.stroke(); }
    ctx.strokeStyle = '#123a1a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); if (rage) ctx.arc(0, -4, 8, Math.PI + 0.4, TAU - 0.4); else ctx.arc(0, -12, 8, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, -14, 50, 46, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-24, -40, 7, 14, 0.6, 0, TAU); ctx.fill();
    // גוף הצלחת
    const hg = ctx.createLinearGradient(0, -20, 0, 40);
    hg.addColorStop(0, white ? '#ffffff' : '#c9c2e8'); hg.addColorStop(0.45, white ? '#ffffff' : '#7a6fb0'); hg.addColorStop(1, white ? '#ffffff' : '#2e2860');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 4, 118, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = white ? '#ffffff' : '#4a3f86'; ctx.beginPath(); ctx.ellipse(0, 18, 80, 18, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 112, 26, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    // אורות סביב
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.12 + i * 0.095), lx2 = Math.cos(a) * 100, ly2 = 8 + Math.sin(a) * 20;
      const on = ((Math.floor(t * 8) + i) % 3) === 0;
      ctx.fillStyle = on ? (rage ? '#ff4d6d' : '#7dffb0') : (rage ? '#7a1a2a' : '#1e5a3a');
      ctx.beginPath(); ctx.arc(lx2, ly2, 4.2, 0, TAU); ctx.fill();
    }
    // תותחים
    for (const sg of [-1, 1]) {
      ctx.fillStyle = white ? '#ffffff' : '#3a3470'; g2rr(ctx, sg * 52 - 8, 24, 16, 20, 5); ctx.fill();
      ctx.fillStyle = rage ? '#ff4d6d' : '#ffd84d'; ctx.beginPath(); ctx.arc(sg * 52, 44, 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function g2rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawPup(ctx, k, x, y, r, t) {
    const P = PUPS[k];
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 7);
    ctx.strokeStyle = P.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 5 + Math.sin(t * 7) * 2, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, P.col); gr.addColorStop(1, P.dark);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (k === 'dbl') {   // שני כדורים מחודדים שנפתחים כמו V
      for (const sg of [-1, 1]) {
        ctx.save(); ctx.translate(sg * r * 0.26, r * 0.1); ctx.rotate(sg * 0.45);
        ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.quadraticCurveTo(r * 0.2, -r * 0.35, r * 0.17, r * 0.45); ctx.lineTo(-r * 0.17, r * 0.45); ctx.quadraticCurveTo(-r * 0.2, -r * 0.35, 0, -r * 0.62); ctx.fill();
        ctx.restore();
      }
    }
    else if (k === 'rapid') { ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.62); ctx.lineTo(-r * 0.38, r * 0.08); ctx.lineTo(0, r * 0.08); ctx.lineTo(-r * 0.15, r * 0.62); ctx.lineTo(r * 0.38, -r * 0.08); ctx.lineTo(0, -r * 0.08); ctx.closePath(); ctx.fill(); }
    else if (k === 'shield') { ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.38); ctx.quadraticCurveTo(r * 0.45, r * 0.35, 0, r * 0.62); ctx.quadraticCurveTo(-r * 0.45, r * 0.35, -r * 0.5, -r * 0.38); ctx.closePath(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(0, r * 0.55); ctx.bezierCurveTo(-r * 0.9, -r * 0.1, -r * 0.35, -r * 0.75, 0, -r * 0.25); ctx.bezierCurveTo(r * 0.35, -r * 0.75, r * 0.9, -r * 0.1, 0, r * 0.55); ctx.fill(); }
    ctx.restore();
  }

  function drawEnemyShot(ctx, b) {
    ctx.fillStyle = b.big ? 'rgba(255,120,80,.35)' : 'rgba(255,90,170,.35)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = b.big ? '#ffb070' : '#ff7ac8';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
  }
  function drawPlayerShot(ctx, b, rapid) {
    ctx.fillStyle = rapid ? 'rgba(255,122,217,.4)' : 'rgba(120,230,255,.4)';
    g2rr(ctx, b.x - 4.5, b.y - 11, 9, 24, 4.5); ctx.fill();
    ctx.fillStyle = '#ffffff'; g2rr(ctx, b.x - 2, b.y - 8, 4, 18, 2); ctx.fill();
  }

  // ---------- מצב המשחק ----------
  function newState(g) {
    return {
      ship: { x: W / 2, y: SHIP_Y, vx: 0, vy: 0, inv: 0, dead: 0, dbl: 0, rapid: 0, shield: 0, cd: 20, tilt: 0, lx: W / 2 },
      lives: 3, wave: 0, phase: 'intro', phaseT: 0, aliens: [], pb: [], eb: [], pups: [], rings: [], boss: null,
      ft: 0, fx: W / 2, fy: 104, fireT: 150, diveT: 200, overT: 0, mouse: null, drag: null, pend: { x: 0, y: 0 },
      stars: makeStars(), bgY: 0, planetX: 110, planetY: 140, t: 0,
    };
  }
  function slotPos(S, a) {
    const br = 1 + Math.sin(S.ft * 0.03) * 0.045;
    return { x: S.fx + a.sx * br, y: S.fy + a.sy * SLOT_H + Math.sin(S.ft * 0.05 + a.sx * 0.02) * 3 };
  }
  function mkAlien(t, sx, sy) {
    const T = TYPES[t];
    return { t, hp: T.hp, max: T.hp, sx, sy, x: 0, y: -60, st: 'wait', delay: 0, k: 0, ks: 1 / 105, p: null, vx: 0, vy: 0, tx: 0, sp: 3, shots: 0, shotT: 0, flash: 0, ph: Math.random() * TAU, tilt: 0, carry: null, minion: false, dead: false };
  }
  function formation(S, tpl) {
    const list = [];
    tpl.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== ' ') list.push(mkAlien(row[i], (i - (row.length - 1) / 2) * SLOT_W, r));
    });
    return list;
  }
  function spawnWave(g) {
    const S = g.s, n = S.wave;
    if (n % 5 === 0) { spawnBoss(g); return; }
    const nb = n - Math.floor(n / 5);
    const late = nb > WAVES.length;
    const tpl = late ? LATE[(nb - WAVES.length - 1) % LATE.length] : WAVES[nb - 1];
    const list = formation(S, tpl);
    if (late) { const up = Math.min(0.5, (nb - WAVES.length) * 0.06); for (const a of list) if (a.t === 'b' && Math.random() < up) { const t = Math.random() < 0.5 ? 'z' : 'd'; Object.assign(a, { t, hp: TYPES[t].hp, max: TYPES[t].hp }); } }
    const rows = tpl.length;
    const ks = 1 / Math.max(70, 105 - n * 1.5);
    for (let r = 0; r < rows; r++) {
      const inRow = list.filter(a => a.sy === r);
      const side = r % 2 === 0 ? -1 : 1, path = PATHS[(n + r) % PATHS.length];
      // מתחילים מהצד שממנו נכנסים
      inRow.sort((a, b) => (a.sx - b.sx) * -side);
      inRow.forEach((a, i) => {
        a.p = path.map((v, j) => (j % 2 === 0 && side > 0 ? W - v : v));
        a.delay = r * 46 + i * 7 + 1;
        a.ks = ks;
      });
    }
    list[Math.floor(Math.random() * list.length)].carry = pickPup(g);
    S.aliens.push(...list);
    S.fireT = 120; S.diveT = 160;
  }
  function spawnBoss(g) {
    const S = g.s, bn = S.wave / 5;
    const hp = 60 + 45 * (bn - 1);
    S.boss = { x: W / 2, y: -150, ty: 168, hp, max: hp, t: 0, mt: 0, st: 'enter', pi: 0, pt: 0, cool: 60, flash: 0, ang: 0, bn, dieT: 0, order: ['fan', 'aim', 'minions', 'spiral'] };
  }
  function pickPup() { const r = Math.random(); return r < 0.4 ? 'dbl' : r < 0.7 ? 'rapid' : 'shield'; }
  function dropPup(g, x, y, k) { if (g.s.pups.length < 8) g.s.pups.push({ k, x: Math.max(30, Math.min(W - 30, x)), y, vy: 1.6, t: 0 }); }

  function nextWave(g) {
    const S = g.s;
    S.wave++; S.phase = 'intro'; S.phaseT = 70;
    if (S.wave % 5 === 0) {
      g.msg(g.t('boss'), 1700, '#ff7b95');
      for (let i = 0; i < 4; i++) g.tone({ f: 520, f2: 380, dur: 0.18, type: 'square', vol: 0.05, delay: i * 0.22 });
    } else g.msg(g.t('wave', { n: S.wave }), 1300, '#8fd3ff');
  }

  // ---------- יריות ----------
  function shot(g, x, y, sp, ang, big) {
    const S = g.s;
    if (S.eb.length > 240) S.eb.shift();
    S.eb.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: big ? 6.5 : 5, big: big ? 1 : 0 });
  }
  function aimAng(g, x, y, lim) {
    const sh = g.s.ship;
    let a = Math.atan2(sh.y - y, sh.x - x);
    if (lim) a = Math.max(Math.PI / 2 - lim, Math.min(Math.PI / 2 + lim, a));
    return a;
  }
  function fire(g) {
    const S = g.s, sh = S.ship;
    sh.cd = sh.rapid > 0 ? 5 : 10;
    if (sh.dbl > 0) S.pb.push({ x: sh.x - 11, y: sh.y - 20, vx: -0.3 }, { x: sh.x + 11, y: sh.y - 20, vx: 0.3 });
    else S.pb.push({ x: sh.x, y: sh.y - 28, vx: 0 });
    if (S.t % 2 === 0) g.tone({ f: 1250, f2: 640, dur: 0.05, type: 'square', vol: 0.02 });
  }
  function formationShot(g) {
    const S = g.s, D = DIFF[g.diff];
    const cand = S.aliens.filter(a => a.st === 'form');
    if (!cand.length || S.ship.dead) return;
    let a = cand[Math.floor(Math.random() * cand.length)];
    const zs = cand.filter(c => c.t === 'z');
    if (zs.length && Math.random() < 0.5) a = zs[Math.floor(Math.random() * zs.length)];
    const sp = D.bs * Math.min(1.35, 1 + (S.wave - 1) * 0.025);
    if (a.t === 'z') { shot(g, a.x - 7, a.y + 12, sp, aimAng(g, a.x, a.y, 0.45)); shot(g, a.x + 7, a.y + 12, sp, aimAng(g, a.x, a.y, 0.45)); }
    else shot(g, a.x, a.y + 12, sp, aimAng(g, a.x, a.y, 0.45));
    g.tone({ f: 520, f2: 300, dur: 0.08, type: 'triangle', vol: 0.035 });
  }
  function startDive(g) {
    const S = g.s;
    const cand = S.aliens.filter(a => a.st === 'form');
    if (!cand.length) return;
    let a = cand[Math.floor(Math.random() * cand.length)];
    const ds = cand.filter(c => c.t === 'd');
    if (ds.length && Math.random() < 0.6) a = ds[Math.floor(Math.random() * ds.length)];
    beginDive(g, a, S.ship.x + (Math.random() - 0.5) * 80);
    if (S.wave >= 6 && Math.random() < Math.min(0.55, S.wave * 0.035)) {
      const w = cand.find(c => c !== a && c.st === 'form' && Math.abs(c.sy - a.sy) <= 1 && Math.abs(c.sx - a.sx) < 60);
      if (w) beginDive(g, w, a.tx + (w.x - a.x));
    }
    g.tone({ f: 760, f2: 300, dur: 0.32, type: 'triangle', vol: 0.04 });
  }
  function beginDive(g, a, tx) {
    const S = g.s, D = DIFF[g.diff];
    a.st = 'dive'; a.vx = a.x < W / 2 ? -1.8 : 1.8; a.vy = -2.8;
    a.tx = tx;
    a.sp = D.dsp * (1 + Math.min(0.45, (S.wave - 1) * 0.03)) * (a.t === 'd' ? 1.15 : 1);
    a.shots = Math.random() < D.fire * 1.4 ? (a.t === 'z' ? 2 : 1) + (S.wave > 8 ? 1 : 0) : 0;
    a.shotT = 25 + Math.floor(Math.random() * 30);
  }

  // ---------- צעד: חייזרים, בוס, התנגשויות ----------
  function stepAliens(g) {
    const S = g.s, D = DIFF[g.diff], sh = S.ship;
    for (const a of S.aliens) {
      const px = a.x;
      if (a.flash > 0) a.flash--;
      if (a.st === 'wait') { if (--a.delay <= 0) { a.st = 'enter'; a.k = 0; a.x = a.p[0]; a.y = a.p[1]; } continue; }
      const sp = slotPos(S, a);
      if (a.st === 'enter') {
        a.k += a.ks;
        if (a.k >= 1) { a.st = 'form'; a.x = sp.x; a.y = sp.y; }
        else {
          const k = a.k, u = 1 - k, p = a.p;
          a.x = u * u * u * p[0] + 3 * u * u * k * p[2] + 3 * u * k * k * p[4] + k * k * k * sp.x;
          a.y = u * u * u * p[1] + 3 * u * u * k * p[3] + 3 * u * k * k * p[5] + k * k * k * sp.y;
        }
      } else if (a.st === 'form') { a.x = sp.x; a.y = sp.y; }
      else if (a.st === 'dive') {
        if (a.y < 430) a.tx += (sh.x - a.tx) * 0.022;
        const dx = a.tx - a.x, dy = H + 100 - a.y, d = Math.hypot(dx, dy) || 1;
        a.vx += (dx / d * a.sp - a.vx) * 0.045; a.vy += (dy / d * a.sp - a.vy) * 0.045;
        a.x += a.vx + Math.sin(S.t * 0.08 + a.ph) * 0.6; a.y += a.vy;
        if (a.shots > 0 && --a.shotT <= 0 && a.y > 60 && a.y < sh.y - 170 && !sh.dead) {
          shot(g, a.x, a.y + 12, D.bs * Math.min(1.3, 1 + (S.wave - 1) * 0.025) * 1.05, aimAng(g, a.x, a.y, 0.6));
          a.shots--; a.shotT = 28;
        }
        if (a.y > H + 40) {
          if (a.minion) { a.dead = true; continue; }
          a.st = 'back'; a.y = -40; a.x = sp.x;
        }
      } else if (a.st === 'back') {
        const dx = sp.x - a.x, dy = sp.y - a.y, d = Math.hypot(dx, dy);
        if (d < 3.5) { a.st = 'form'; a.x = sp.x; a.y = sp.y; } else { a.x += dx / d * 3.5; a.y += dy / d * 3.5; }
      }
      a.tilt += (Math.max(-0.5, Math.min(0.5, (a.x - px) * 0.07)) - a.tilt) * 0.2;
    }
  }
  function spawnMinion(g, B) {
    const S = g.s, a = mkAlien(B.bn >= 2 ? 'd' : 'b', 0, 0);
    a.minion = true; a.x = B.x + (Math.random() - 0.5) * 120; a.y = B.y + 30;
    beginDive(g, a, S.ship.x + (Math.random() - 0.5) * 140);
    a.vx = (a.x - B.x) * 0.04; a.vy = 1.5; a.shots = 0;
    S.aliens.push(a);
  }
  function stepBoss(g) {
    const S = g.s, B = S.boss, D = DIFF[g.diff];
    if (!B) return;
    B.t++;
    if (B.flash > 0) B.flash--;
    if (B.st === 'enter') {
      B.y += (B.ty - B.y) * 0.025 + 0.5;
      if (B.y >= B.ty - 1) { B.y = B.ty; B.st = 'fight'; }
      return;
    }
    if (B.st === 'dying') {
      if (B.dieT % 7 === 0) {
        const ex = B.x + (Math.random() - 0.5) * 200, ey = B.y + (Math.random() - 0.5) * 60;
        g.burst(ex, ey, { n: 16, color: ['#ffffff', '#ffd84d', '#ff7a5a', '#b07cff'], speed: 4, life: 32, gravity: 0.02 });
        S.rings.push({ x: ex, y: ey, r: 6, max: 46, c: '#ffd84d' });
        g.sfx('hit', { p: 0.7 + Math.random() * 0.5 }); g.shake(6);
      }
      B.x += Math.sin(B.dieT * 0.9) * 2;
      if (--B.dieT <= 0) finishBoss(g);
      return;
    }
    const rage = B.hp < B.max / 2;
    B.mt += rage ? 1.5 : 1;
    B.x = W / 2 + Math.sin(B.mt * 0.011) * 165;
    B.y = B.ty + Math.sin(B.mt * 0.023) * 16;
    if (B.cool > 0) { B.cool--; return; }
    B.pt++;
    if (runPattern(g, B, B.order[B.pi % B.order.length], rage)) { B.pi++; B.pt = 0; B.cool = Math.round((rage ? 45 : 75) / D.bfire); }
  }
  function runPattern(g, B, pat, rage) {
    const S = g.s, D = DIFF[g.diff], t = B.pt, sp = D.bbs * (1 + (B.bn - 1) * 0.08);
    const ox = B.x, oy = B.y + 42;
    if (pat === 'fan') {
      if (t === 1 || t === 55 || (rage && t === 110)) {
        const n = D.fan + (rage ? 2 : 0);
        for (let i = 0; i < n; i++) shot(g, ox, oy, sp, Math.PI / 2 + (i - (n - 1) / 2) * (1.7 / (n - 1)), true);
        g.sfx('laser', { p: 0.55 });
      }
      return t >= (rage ? 120 : 64);
    }
    if (pat === 'aim') {
      const n = D.aim + (rage ? 1 : 0);
      for (const st of [1, 60]) if (t >= st && t < st + n * 10 && (t - st) % 10 === 0) {
        for (const sg of [-1, 1]) { const x = ox + sg * 52; shot(g, x, oy, sp * 1.1, aimAng(g, x, oy, 0)); }
        g.tone({ f: 600, f2: 280, dur: 0.1, type: 'square', vol: 0.04 });
      }
      return t >= 60 + n * 10 + 20;
    }
    if (pat === 'spiral') {
      if (t % D.spin === 0) {
        for (const k of [0, Math.PI]) { const a = B.ang + k; if (Math.sin(a) > -0.2) shot(g, ox, oy - 14, sp * 0.85, a, true); }
        B.ang += 0.33;
      }
      return t >= (rage ? 200 : 150);
    }
    if (pat === 'minions') {
      const n = D.mins + (rage ? 1 : 0);
      if (t % 16 === 1 && (t - 1) / 16 < n) { spawnMinion(g, B); g.tone({ f: 300, f2: 700, dur: 0.15, type: 'triangle', vol: 0.05 }); }
      return t >= n * 16 + 40;
    }
    return true;
  }
  function hitBoss(g) {
    const S = g.s, B = S.boss;
    B.hp--; B.flash = 4; g.score += 10;
    g.sfx('tick', { p: 0.7 });
    if (B.hp <= 0) {
      B.st = 'dying'; B.dieT = 110;
      for (const b of S.eb) g.burst(b.x, b.y, { n: 3, color: '#ffd84d', speed: 1.5, life: 18, gravity: 0 });
      S.eb.length = 0;
      for (const a of S.aliens) if (a.minion) { a.dead = true; g.burst(a.x, a.y, { n: 10, color: [TYPES[a.t].body, '#fff'], speed: 3, life: 25 }); }
      g.sfx('boom'); g.shake(10);
    }
  }
  function finishBoss(g) {
    const S = g.s, B = S.boss;
    const pts = 2500 * B.bn;
    g.score += pts;
    g.burst(B.x, B.y, { n: 90, color: ['#ffffff', '#ffd84d', '#ff7a5a', '#b07cff', '#7dffb0'], speed: 7, life: 60, gravity: 0.03 });
    S.rings.push({ x: B.x, y: B.y, r: 10, max: 160, c: '#ffffff' }, { x: B.x, y: B.y, r: 4, max: 110, c: '#ffd84d' });
    g.float(B.x, B.y - 30, '+' + pts, { color: '#ffd84d', size: 34, life: 80 });
    g.flash('#ffffff', 0.5); g.shake(16); g.sfx('boom'); g.sfx('win');
    if (S.lives < 5) dropPup(g, B.x - 40, B.y, 'life');
    dropPup(g, B.x + 40, B.y, pickPup());
    S.boss = null;
  }
  function killAlien(g, a) {
    const S = g.s, T = TYPES[a.t];
    a.dead = true;
    const pts = a.st === 'dive' ? T.pts * 2 : T.pts;
    g.score += pts;
    g.burst(a.x, a.y, { n: 18, color: [T.body, T.light, '#ffffff'], speed: 3.4, life: 30, gravity: 0.02 });
    S.rings.push({ x: a.x, y: a.y, r: 6, max: 36, c: T.light });
    g.float(a.x, a.y - 16, '+' + pts, { color: a.st === 'dive' ? '#ffd84d' : '#ffffff', size: a.st === 'dive' ? 22 : 18 });
    g.sfx('pop', { p: 0.75 + Math.random() * 0.5 });
    if (a.carry) dropPup(g, a.x, a.y, a.carry);
    else if (!a.minion && Math.random() < 0.035) dropPup(g, a.x, a.y, pickPup());
  }
  function killShip(g) {
    const S = g.s, sh = S.ship;
    g.burst(sh.x, sh.y, { n: 50, color: ['#ffffff', '#7cd3ff', '#ffd84d', '#ff7a5a'], speed: 5.5, life: 52, gravity: 0.02 });
    S.rings.push({ x: sh.x, y: sh.y, r: 8, max: 90, c: '#7cd3ff' });
    g.shake(14); g.flash('#ff4060', 0.3); g.sfx('boom');
    S.lives--; sh.dead = 80; sh.dbl = sh.rapid = sh.shield = 0; sh.inv = 0;
    S.mouse = null;
    if (S.lives <= 0) { S.overT = 110; sh.dead = 9999; }
  }
  function respawn(g) {
    const S = g.s, sh = S.ship;
    sh.x = W / 2; sh.y = SHIP_Y; sh.vx = sh.vy = 0; sh.inv = 150; sh.cd = 30;
    for (const b of S.eb) g.burst(b.x, b.y, { n: 3, color: '#ff9ad5', speed: 1.2, life: 16, gravity: 0 });
    S.eb.length = 0;
    g.sfx('power', { p: 0.8 });
  }
  function collect(g, p) {
    const S = g.s, sh = S.ship, P = PUPS[p.k];
    if (p.k === 'life') S.lives = Math.min(5, S.lives + 1);
    else sh[p.k] = P.dur;
    g.score += 50;
    g.burst(p.x, p.y, { n: 20, color: [P.col, '#ffffff'], speed: 3, life: 30, gravity: 0 });
    g.float(sh.x, sh.y - 46, g.t(p.k), { color: P.col, size: 24, life: 70 });
    g.sfx('power');
  }
  function collide(g) {
    const S = g.s, D = DIFF[g.diff], sh = S.ship;
    for (const b of S.pb) {
      if (b.y < -20) continue;
      for (const a of S.aliens) {
        if (a.st === 'wait' || a.dead) continue;
        const r = TYPES[a.t].r + 3;
        if (Math.abs(a.x - b.x) < r && Math.abs(a.y - b.y) < r + 8) {
          b.y = -99;
          if (--a.hp <= 0) killAlien(g, a); else { a.flash = 5; g.sfx('tick', { p: 1.3 }); }
          break;
        }
      }
      const B = S.boss;
      if (b.y > -20 && B && B.st !== 'dying' && B.y > 40) {
        const ex = (b.x - B.x) / 116, ey = (b.y - B.y + 6) / 50;
        if (ex * ex + ey * ey < 1) {
          if (Math.random() < 0.4) g.burst(b.x, b.y, { n: 3, color: '#ffffff', speed: 2, life: 12 });
          b.y = -99; hitBoss(g);
        }
      }
    }
    if (sh.dead) return;
    const shieldR = 34;
    for (const b of S.eb) {
      const dx = b.x - sh.x, dy = b.y - sh.y;
      if (sh.shield > 0) {
        if (dx * dx + dy * dy < (shieldR + b.r) * (shieldR + b.r)) { g.burst(b.x, b.y, { n: 6, color: '#bff4ff', speed: 2, life: 16, gravity: 0 }); b.y = H + 99; g.sfx('tick', { p: 1.6 }); }
        continue;
      }
      if (sh.inv > 0) continue;
      const rr = D.hr + b.r * 0.8;
      if (dx * dx + dy * dy < rr * rr) { b.y = H + 99; killShip(g); return; }
    }
    for (const a of S.aliens) {
      if (a.st === 'wait' || a.dead) continue;
      const r = TYPES[a.t].r * 0.75 + (sh.shield > 0 ? shieldR : D.hr + 6);
      const dx = a.x - sh.x, dy = a.y - sh.y;
      if (dx * dx + dy * dy < r * r) {
        if (sh.shield > 0) killAlien(g, a);
        else if (sh.inv <= 0) { killAlien(g, a); killShip(g); return; }
      }
    }
    for (const p of S.pups) {
      if (!p.got && Math.hypot(p.x - sh.x, p.y - sh.y) < 38) { p.got = true; collect(g, p); }
    }
  }

  // ---------- בוט לבדיקות: מתחמק מיריות, נשאר מתחת לחייזרים ואוסף שדרוגים — דרך אותם מקשים של שחקן ----------
  function botPlay(g) {
    const S = g.s, sh = S.ship, D = DIFF[g.diff];
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) g.keys.delete(k);
    if (sh.dead) return;
    let goal = W / 2;
    const live = S.aliens.filter(a => !a.dead && a.st !== 'wait');
    if (S.boss) goal = S.boss.x;
    else if (live.length) {
      let bestA = null, bd = 1e9;
      for (const a of live) { const d = Math.abs(a.x - sh.x) - a.y * 0.3; if (d < bd) { bd = d; bestA = a; } }
      goal = bestA.x;
    }
    for (const p of S.pups) if (p.y > 300 && p.y < sh.y) goal = p.x;
    let best = sh.x, bestC = 1e18;
    for (let cx = 28; cx <= W - 28; cx += 12) {
      const dist = Math.abs(cx - sh.x);
      let c = Math.abs(cx - goal) * 0.6 + dist * 0.15;
      const lo = Math.min(cx, sh.x), hi = Math.max(cx, sh.x);
      const threat = (x, y, vx, vy, rad) => {
        if (vy <= 0.05) return;
        const tt = (sh.y - y) / vy;
        if (tt < -6 || tt > 75) return;
        const bx = x + vx * Math.max(0, tt);
        const reach = Math.min(dist, Math.max(0, tt) * 6.5);
        const px = cx > sh.x ? sh.x + reach : sh.x - reach;   // where the ship will be at that time
        const d = Math.abs(bx - px), lim = rad + D.hr + 16;
        if (d < lim) c += (80 - tt) * (lim - d) * 6;
        if (bx > lo - lim && bx < hi + lim && tt < dist / 6.5 + 4) c += 30;
      };
      for (const b of S.eb) threat(b.x, b.y, b.vx, b.vy, b.r);
      for (const a of live) if (a.st === 'dive') threat(a.x, a.y, a.vx, a.vy, TYPES[a.t].r);
      if (c < bestC) { bestC = c; best = cx; }
    }
    if (best < sh.x - 3) g.keys.add('ArrowLeft'); else if (best > sh.x + 3) g.keys.add('ArrowRight');
    if (sh.y < SHIP_BOT - 6) g.keys.add('ArrowDown');
  }

  GK.register('alien-attack', {
    w: W, h: H, bg: '#070a1c', accent: '#8fd3ff',
    diffs: true,
    text: {
      he: { title: 'חללית נגד חייזרים', help: ['חצים / WASD או העכבר — הזז את החללית', 'החללית יורה לבד — פוצץ את כל החייזרים בגל', 'התחמק מהיריות ומהחייזרים שצוללים עליך', 'כל גל חמישי מגיע בוס ענק עם פס חיים', 'אסוף שדרוגים: ירייה כפולה, מגן וירי מהיר'], helpTouch: ['גרור את האצבע על המסך כדי להזיז את החללית', 'החללית יורה לבד — פוצץ את כל החייזרים בגל', 'התחמק מהיריות. כל גל חמישי מגיע בוס ענק', 'אסוף שדרוגים: ירייה כפולה, מגן וירי מהיר'], wave: 'גל {n}', waveLbl: 'גל', boss: 'בוס!', bossName: 'ספינת האם', dbl: 'ירייה כפולה!', shield: 'מגן!', rapid: 'ירי מהיר!', life: 'חיים נוספים!', clear: 'הגל נוקה!', reached: 'הגעת לגל {n}' },
      en: { title: 'Spaceship vs Aliens', help: ['Arrows / WASD or the mouse — move the ship', 'Your ship fires by itself — blast every alien in the wave', 'Dodge the shots and the aliens that dive at you', 'Every 5th wave brings a giant boss with a health bar', 'Grab power-ups: double shot, shield and rapid fire'], helpTouch: ['Drag your finger on the screen to move the ship', 'Your ship fires by itself — blast every alien in the wave', 'Dodge the shots. Every 5th wave brings a giant boss', 'Grab power-ups: double shot, shield and rapid fire'], wave: 'Wave {n}', waveLbl: 'Wave', boss: 'Boss!', bossName: 'Mothership', dbl: 'Double shot!', shield: 'Shield!', rapid: 'Rapid fire!', life: 'Extra life!', clear: 'Wave cleared!', reached: 'You reached wave {n}' },
      ar: { title: 'مركبة ضد الفضائيين', help: ['الأسهم / WASD أو الفأرة — حرّك المركبة', 'المركبة تطلق النار وحدها — فجّر كل الفضائيين في الموجة', 'تفادَ الطلقات والفضائيين الذين ينقضّون عليك', 'كل موجة خامسة يأتي زعيم عملاق مع شريط طاقة', 'اجمع التعزيزات: طلقة مزدوجة، درع، وإطلاق سريع'], helpTouch: ['اسحب إصبعك على الشاشة لتحريك المركبة', 'المركبة تطلق النار وحدها — فجّر كل الفضائيين في الموجة', 'تفادَ الطلقات. كل موجة خامسة يأتي زعيم عملاق', 'اجمع التعزيزات: طلقة مزدوجة، درع، وإطلاق سريع'], wave: 'الموجة {n}', waveLbl: 'الموجة', boss: 'الزعيم!', bossName: 'السفينة الأم', dbl: 'طلقة مزدوجة!', shield: 'درع!', rapid: 'إطلاق سريع!', life: 'حياة إضافية!', clear: 'اكتملت الموجة!', reached: 'وصلت إلى الموجة {n}' },
      es: { title: 'Nave contra alienígenas', help: ['Flechas / WASD o el ratón — mueve la nave', 'Tu nave dispara sola: destruye a todos los alienígenas de la oleada', 'Esquiva los disparos y a los alienígenas que se lanzan contra ti', 'Cada 5 oleadas llega un jefe gigante con barra de vida', 'Recoge mejoras: disparo doble, escudo y disparo rápido'], helpTouch: ['Arrastra el dedo por la pantalla para mover la nave', 'Tu nave dispara sola: destruye a todos los alienígenas', 'Esquiva los disparos. Cada 5 oleadas llega un jefe gigante', 'Recoge mejoras: disparo doble, escudo y disparo rápido'], wave: 'Oleada {n}', waveLbl: 'Oleada', boss: '¡Jefe!', bossName: 'Nave nodriza', dbl: '¡Disparo doble!', shield: '¡Escudo!', rapid: '¡Disparo rápido!', life: '¡Vida extra!', clear: '¡Oleada superada!', reached: 'Llegaste a la oleada {n}' },
      fr: { title: 'Vaisseau contre aliens', help: ['Flèches / WASD ou la souris — déplace le vaisseau', 'Ton vaisseau tire tout seul : détruis tous les aliens de la vague', 'Esquive les tirs et les aliens qui plongent sur toi', 'Toutes les 5 vagues, un boss géant avec une barre de vie', 'Ramasse les bonus : tir double, bouclier et tir rapide'], helpTouch: ["Fais glisser ton doigt sur l'écran pour déplacer le vaisseau", 'Ton vaisseau tire tout seul : détruis tous les aliens', 'Esquive les tirs. Toutes les 5 vagues, un boss géant', 'Ramasse les bonus : tir double, bouclier et tir rapide'], wave: 'Vague {n}', waveLbl: 'Vague', boss: 'Boss !', bossName: 'Vaisseau mère', dbl: 'Tir double !', shield: 'Bouclier !', rapid: 'Tir rapide !', life: 'Vie en plus !', clear: 'Vague terminée !', reached: 'Tu as atteint la vague {n}' },
      pt: { title: 'Nave contra alienígenas', help: ['Setas / WASD ou o mouse — mova a nave', 'Sua nave atira sozinha: destrua todos os alienígenas da onda', 'Desvie dos tiros e dos alienígenas que mergulham em você', 'A cada 5 ondas chega um chefe gigante com barra de vida', 'Pegue bônus: tiro duplo, escudo e tiro rápido'], helpTouch: ['Arraste o dedo na tela para mover a nave', 'Sua nave atira sozinha: destrua todos os alienígenas', 'Desvie dos tiros. A cada 5 ondas chega um chefe gigante', 'Pegue bônus: tiro duplo, escudo e tiro rápido'], wave: 'Onda {n}', waveLbl: 'Onda', boss: 'Chefe!', bossName: 'Nave-mãe', dbl: 'Tiro duplo!', shield: 'Escudo!', rapid: 'Tiro rápido!', life: 'Vida extra!', clear: 'Onda concluída!', reached: 'Você chegou à onda {n}' },
      ru: { title: 'Корабль против пришельцев', help: ['Стрелки / WASD или мышь — двигай корабль', 'Корабль стреляет сам — уничтожь всех пришельцев в волне', 'Уворачивайся от выстрелов и пикирующих пришельцев', 'Каждая 5-я волна — огромный босс с полоской здоровья', 'Собирай бонусы: двойной выстрел, щит и быструю стрельбу'], helpTouch: ['Веди пальцем по экрану, чтобы двигать корабль', 'Корабль стреляет сам — уничтожь всех пришельцев', 'Уворачивайся от выстрелов. Каждая 5-я волна — огромный босс', 'Собирай бонусы: двойной выстрел, щит и быструю стрельбу'], wave: 'Волна {n}', waveLbl: 'Волна', boss: 'Босс!', bossName: 'Корабль-матка', dbl: 'Двойной выстрел!', shield: 'Щит!', rapid: 'Быстрая стрельба!', life: 'Ещё жизнь!', clear: 'Волна пройдена!', reached: 'Ты дошёл до волны {n}' },
      de: { title: 'Raumschiff gegen Aliens', help: ['Pfeile / WASD oder die Maus — Schiff bewegen', 'Dein Schiff schießt von selbst — zerstöre alle Aliens der Welle', 'Weiche den Schüssen und den herabstürzenden Aliens aus', 'Jede 5. Welle kommt ein riesiger Boss mit Lebensbalken', 'Sammle Extras: Doppelschuss, Schild und Schnellfeuer'], helpTouch: ['Zieh den Finger über den Bildschirm, um das Schiff zu bewegen', 'Dein Schiff schießt von selbst — zerstöre alle Aliens', 'Weiche den Schüssen aus. Jede 5. Welle kommt ein Riesen-Boss', 'Sammle Extras: Doppelschuss, Schild und Schnellfeuer'], wave: 'Welle {n}', waveLbl: 'Welle', boss: 'Boss!', bossName: 'Mutterschiff', dbl: 'Doppelschuss!', shield: 'Schild!', rapid: 'Schnellfeuer!', life: 'Extraleben!', clear: 'Welle geschafft!', reached: 'Du hast Welle {n} erreicht' },
    },

    init(g) {
      const S = g.s = newState(g);
      g.canvas.style.cursor = g.demo ? '' : 'none';
      if (g.demo) {   // תמונה שקטה מאחורי התפריט: מבנה של חייזרים וחללית
        S.wave = 1;
        S.aliens = formation(S, ['zbzbzbz', 'bbbbbbb', 'ddddddd']);
        for (const a of S.aliens) { a.st = 'form'; const p = slotPos(S, a); a.x = p.x; a.y = p.y; }
        S.aliens[3].carry = 'dbl';
        for (let i = 0; i < 5; i++) S.pb.push({ x: W / 2, y: SHIP_Y - 60 - i * 95, vx: 0 });
        S.pups.push({ k: 'shield', x: 140, y: 520, vy: 1.6, t: 0 });
        return;
      }
      nextWave(g);
    },

    idle(g) {   // תפריט וסוף: הכוכבים זזים והמבנה מתנדנד
      const S = g.s;
      S.t++; S.ft++;
      moveBg(S, 1);
      S.fx = W / 2 + Math.sin(S.ft * 0.012) * 46;
      for (const a of S.aliens) if (a.st === 'form') { const p = slotPos(S, a); a.x = p.x; a.y = p.y; }
      if (g.demo) for (const b of S.pb) { b.y -= 9; if (b.y < -20) b.y += 480; }
    },

    step(g) {
      const S = g.s, sh = S.ship, D = DIFF[g.diff];
      S.t++; S.ft++;
      moveBg(S, 1);
      S.fx = W / 2 + Math.sin(S.ft * 0.012) * 46;
      // ----- זרימת הגלים -----
      if (S.phase === 'intro') { if (--S.phaseT <= 0) { spawnWave(g); S.phase = 'fight'; } }
      else if (S.phase === 'fight') {
        if (!S.aliens.length && !S.boss) {
          S.phase = 'clear'; S.phaseT = 80;
          const bonus = 100 * S.wave;
          g.score += bonus;
          g.float(W / 2, H * 0.4, g.t('clear'), { color: '#8fd3ff', size: 34, life: 75, speed: 0.6 });
          g.float(W / 2, H * 0.4 + 40, '+' + bonus, { color: '#ffd84d', size: 28, life: 75, speed: 0.6 });
          g.sfx('score');
        }
      } else if (S.phase === 'clear') { if (--S.phaseT <= 0) nextWave(g); }
      // ----- החללית -----
      if (sh.dead > 0) { if (--sh.dead === 0 && S.lives > 0) respawn(g); }
      else {
        const ax = g.axis();
        if (ax.x || ax.y) S.mouse = null;
        if (S.pend.x || S.pend.y) { sh.x += S.pend.x; sh.y += S.pend.y; S.pend.x = S.pend.y = 0; sh.vx = sh.vy = 0; }
        else if (S.mouse) {
          const dx = S.mouse.x - sh.x, dy = S.mouse.y - sh.y, d = Math.hypot(dx, dy), mx = 15;
          if (d > mx) { sh.x += dx / d * mx; sh.y += dy / d * mx; } else { sh.x = S.mouse.x; sh.y = S.mouse.y; }
        } else {
          sh.vx += (ax.x * 7 - sh.vx) * 0.38; sh.vy += (ax.y * 6 - sh.vy) * 0.38;
          sh.x += sh.vx; sh.y += sh.vy;
        }
        sh.x = Math.max(26, Math.min(W - 26, sh.x)); sh.y = Math.max(SHIP_TOP, Math.min(SHIP_BOT, sh.y));
        sh.tilt += (Math.max(-0.5, Math.min(0.5, (sh.x - sh.lx) * 0.07)) - sh.tilt) * 0.3;
        sh.lx = sh.x;
        if (--sh.cd <= 0) fire(g);
        for (const k of ['dbl', 'rapid', 'shield']) if (sh[k] > 0) { sh[k]--; if (sh[k] === 90) g.sfx('tick', { p: 0.6 }); }
        if (sh.inv > 0) sh.inv--;
      }
      // ----- יריות וחפצים -----
      for (const b of S.pb) { b.y -= 13; b.x += b.vx; }
      compact(S.pb, b => b.y > -30);
      for (const b of S.eb) { b.x += b.vx; b.y += b.vy; }
      compact(S.eb, b => b.y < H + 20 && b.y > -40 && b.x > -20 && b.x < W + 20);
      for (const p of S.pups) { p.t++; p.y += p.vy; p.x += Math.sin(p.t * 0.06) * 0.6; }
      compact(S.pups, p => !p.got && p.y < H + 30);
      for (const r of S.rings) r.r += (r.max - r.r) * 0.14 + 0.6;
      compact(S.rings, r => r.r < r.max - 1);
      // ----- אויבים -----
      stepAliens(g);
      stepBoss(g);
      if (S.phase === 'fight' && !S.boss) {
        const entering = S.aliens.some(a => a.st === 'wait' || a.st === 'enter');
        const few = S.aliens.length <= 4 ? 2 : 1;
        const wm = waveMul(S.wave);
        if (!entering && (S.diveT -= few) <= 0) { startDive(g); S.diveT = Math.round((130 + Math.random() * 110) / (D.dive * wm)); }
        if (!entering && --S.fireT <= 0) { formationShot(g); S.fireT = Math.round((90 + Math.random() * 70) / (D.fire * wm)); }
      }
      collide(g);
      compact(S.aliens, a => !a.dead);
      if (S.overT > 0 && --S.overT === 0) {
        g.canvas.style.cursor = '';
        g.end({ score: g.score, text: g.t('reached', { n: S.wave }) });
        return;
      }
      const b = g.getBest();
      g.hud([[g.t('score'), g.score], [g.t('best'), b === null ? '—' : Math.max(b, g.score)], [g.t('waveLbl'), S.wave], [g.t('lives'), S.lives > 0 ? '♥'.repeat(S.lives) : '—', '#ff7b95']]);
    },

    bot: botPlay,

    onPointer(g, type, p) {
      const S = g.s;
      if (p.kind === 'touch') {   // גרירה יחסית: האצבע לא מסתירה את החללית
        if (type === 'down' && !S.drag) S.drag = { id: p.id, x: p.x, y: p.y };
        else if (type === 'move' && S.drag && S.drag.id === p.id) {
          S.pend.x += (p.x - S.drag.x) * 1.3; S.pend.y += (p.y - S.drag.y) * 1.3;
          S.drag.x = p.x; S.drag.y = p.y;
        } else if (type === 'up' && S.drag && S.drag.id === p.id) S.drag = null;
        S.mouse = null;
        return;
      }
      if (type === 'move' || type === 'down') S.mouse = { x: p.x, y: Math.max(SHIP_TOP, Math.min(SHIP_BOT, p.y)) };
    },

    draw(g, ctx) {
      const S = g.s, t = S.t / 60, sh = S.ship;
      drawSpace(ctx, S, t);
      for (const r of S.rings) {
        ctx.globalAlpha = Math.max(0, 1 - r.r / r.max) * 0.8;
        ctx.strokeStyle = r.c; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const p of S.pups) drawPup(ctx, p.k, p.x, p.y, 15, p.t / 60);
      const tx = sh.dead ? null : sh.x, ty = sh.y;
      for (const a of S.aliens) if (a.st !== 'wait') drawAlien(ctx, a, t, tx, ty);
      if (S.boss) drawBoss(ctx, S.boss, t, tx, ty);
      for (const b of S.pb) drawPlayerShot(ctx, b, sh.rapid > 0);
      for (const b of S.eb) drawEnemyShot(ctx, b);
      if (!sh.dead && (sh.inv <= 0 || (S.t >> 2) % 2 === 0)) {
        drawShip(ctx, sh.x, sh.y, 1, t, sh.tilt, {});
        if (sh.shield > 0) {
          const fade = sh.shield < 90 && (S.t >> 3) % 2 === 0 ? 0.35 : 1;
          ctx.globalAlpha = fade;
          const gr = ctx.createRadialGradient(sh.x, sh.y, 18, sh.x, sh.y, 36);
          gr.addColorStop(0, 'rgba(95,227,255,0)'); gr.addColorStop(0.75, 'rgba(95,227,255,.18)'); gr.addColorStop(1, 'rgba(160,240,255,.55)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sh.x, sh.y, 36, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sh.x, sh.y, 35, t * 3, t * 3 + 4.4); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // פס החיים של הבוס
      const B = S.boss;
      if (B && B.st !== 'dying') {
        const bw = 360, bx = (W - bw) / 2, by = 30;
        g.text(ctx, g.t('bossName'), W / 2, 15, { size: 15, color: '#ffd0dc', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
        g.rr(ctx, bx - 3, by - 3, bw + 6, 18, 9); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
        const f = Math.max(0, B.hp / B.max);
        if (f > 0) {
          const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0); hg.addColorStop(0, '#ff4d6d'); hg.addColorStop(1, '#ffb347');
          g.rr(ctx, bx, by, bw * f, 12, 6); ctx.fillStyle = hg; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 4, by + 2, Math.max(0, bw * f - 8), 3);
        }
      }
      // סימני שדרוגים פעילים
      if (!sh.dead) {
        let ix = 22;
        for (const k of ['dbl', 'rapid', 'shield']) if (sh[k] > 0) {
          const f = sh[k] / PUPS[k].dur;
          ctx.globalAlpha = sh[k] < 90 && (S.t >> 3) % 2 === 0 ? 0.4 : 1;
          drawPup(ctx, k, ix, H - 22, 11, 0);
          ctx.strokeStyle = PUPS[k].col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ix, H - 22, 16, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
          ctx.globalAlpha = 1;
          ix += 40;
        }
      }
    },

    cover(ctx, w, h, k) {
      // רקע
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050816'); bg.addColorStop(0.6, '#0d1236'); bg.addColorStop(1, '#22134a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      paintNebula(ctx, w, h, k.seeded(11));
      const R = k.seeded(5);
      for (let i = 0; i < 150; i++) { ctx.globalAlpha = 0.3 + R() * 0.7; ctx.fillStyle = '#dfe9ff'; const s = R() * 2.2 + 0.6; ctx.fillRect(R() * w, R() * h, s, s); }
      ctx.globalAlpha = 1;
      drawPlanet(ctx, 120, 110, 58);
      // חייזרים במבנה
      const al = [];
      ['zbzbzbzbz', 'bdbdbdbdb', ' t b b t '].forEach((row, r) => {
        for (let i = 0; i < row.length; i++) if (row[i] !== ' ') al.push({ t: row[i], hp: 3, max: 3, x: w * 0.5 + (i - (row.length - 1) / 2) * 82, y: 72 + r * 70, ph: i * 1.7 + r, tilt: Math.sin(i + r) * 0.12, flash: 0, sc: 1.45 });
      });
      for (const a of al) drawAlien(ctx, a, 0.37, w * 0.47, h * 0.86);
      // יריות
      for (const [x, y] of [[w * 0.45, 330], [w * 0.49, 330], [w * 0.45, 250], [w * 0.49, 250]]) { ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4); drawPlayerShot(ctx, { x: 0, y: 0 }, false); ctx.restore(); }
      for (const [x, y] of [[w * 0.27, 300], [w * 0.7, 340], [w * 0.62, 260], [w * 0.33, 400]]) drawEnemyShot(ctx, { x, y, r: 7, big: 0 });
      // פיצוץ
      const ex = w * 0.63, ey = 214;
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 70);
      eg.addColorStop(0, 'rgba(255,255,255,.95)'); eg.addColorStop(0.3, 'rgba(255,216,77,.8)'); eg.addColorStop(0.7, 'rgba(255,110,60,.35)'); eg.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 70, 0, TAU); ctx.fill();
      const R2 = k.seeded(9);
      for (let i = 0; i < 26; i++) { const a = R2() * TAU, d = 30 + R2() * 70; ctx.fillStyle = ['#ffffff', '#ffd84d', '#ff9a3d', '#5be36b'][i % 4]; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 2 + R2() * 4, 0, TAU); ctx.fill(); }
      drawPup(ctx, 'dbl', w * 0.2, h * 0.62, 24, 0.2);
      drawPup(ctx, 'shield', w * 0.82, h * 0.55, 22, 0.5);
      drawShip(ctx, w * 0.47, h * 0.84, 2.3, 0.21, 0, {});
      const vg = ctx.createLinearGradient(0, h * 0.6, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.3)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },
  });
})();
