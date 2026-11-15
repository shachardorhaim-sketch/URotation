// ============================================================
//  קפיצה לשמיים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  קופץ אנכי: הדמות קופצת לבד על עננים, מנווטים ימינה ושמאלה (עם מעבר בין הקצוות).
//  עננים רגילים, זזים, נשברים, קפיצים ותרמיל רקטה נדיר. מפלצונים חמודים — להתחמק או לרמוס.
//  המצלמה רק עולה. כל ענן "בטוח" נמצא בטווח קפיצה מהקודם — הוכחה בבדיקה עם בוט.
// ============================================================
(function () {
  const W = 540, H = 800, TAU = Math.PI * 2;
  const G = 0.4, JUMP = -14, SPRING = -22.5, JET_V = -16, JET_T = 150;
  const MAXV = 7.2, ACC = 0.9;
  const PW = 74, HERO_R = 19, START_Y = 700;
  const REACH = JUMP * JUMP / (2 * G);   // 245 — הגובה הכי גבוה של קפיצה רגילה
  const GAP_MIN = [70, 130], GAP_MAX = [105, 195];   // רווח בין עננים בטוחים: בהתחלה ובקושי המלא
  const compact = (arr, keep) => { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; };
  const wrapDx = (a, b) => { let d = a - b; d -= Math.round(d / W) * W; return d; };   // מרחק אופקי על מסך שמתחבר בקצוות
  const lerp = (a, b, t) => a + (b - a) * t;
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }
  const SKY = [[0, '#4fb3ff', '#c4ecff'], [5000, '#5b78e0', '#ffb98f'], [11000, '#2f2a78', '#c46fb0'], [18000, '#0c1238', '#2c3a80'], [26000, '#03040c', '#1b1242']];
  function skyAt(h) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (h <= b[0]) { const t = Math.max(0, (h - a[0]) / (b[0] - a[0])); return [mixHex(a[1], b[1], t), mixHex(a[2], b[2], t)]; }
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }

  // ---------- ציור ----------
  function cloudShape(ctx, x, y, w, h) {
    ctx.beginPath();
    const r = h * 0.62;
    ctx.moveTo(x - w / 2 + r * 0.6, y + h * 0.55);
    ctx.lineTo(x + w / 2 - r * 0.6, y + h * 0.55);
    ctx.arc(x + w / 2 - r * 0.7, y + h * 0.05, r * 0.72, Math.PI * 0.5, -Math.PI * 0.35, true);
    ctx.arc(x + w * 0.14, y - h * 0.2, r * 0.95, -Math.PI * 0.1, -Math.PI * 0.85, true);
    ctx.arc(x - w * 0.18, y - h * 0.12, r * 0.85, -Math.PI * 0.2, -Math.PI * 0.95, true);
    ctx.arc(x - w / 2 + r * 0.7, y + h * 0.08, r * 0.7, -Math.PI * 0.75, Math.PI * 0.5, true);
    ctx.closePath();
  }
  function drawGround(ctx, y) {   // גדת עננים רכה בתחתית, שעליה מתחילים
    const gr = ctx.createLinearGradient(0, y - 20, 0, y + 160);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9def5');
    ctx.fillStyle = gr;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const r = 30 + ((i * 7) % 3) * 7, cx = i * 58 - 18, cy = y - 3 + r; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
    ctx.rect(-30, y + 26, W + 60, 260);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i <= 10; i++) { const r = 30 + ((i * 7) % 3) * 7, cx = i * 58 - 18; ctx.beginPath(); ctx.ellipse(cx - r * 0.25, y + r * 0.45, r * 0.4, r * 0.18, -0.3, 0, TAU); ctx.fill(); }
  }
  function drawPlat(ctx, p, t) {
    const x = p.x, y = p.y + 9, w = p.w, h = 20;
    if (p.broken) return;
    if (p.ground) { drawGround(ctx, p.y); return; }
    ctx.fillStyle = 'rgba(30,50,90,.16)'; ctx.beginPath(); ctx.ellipse(x, y + 14, w * 0.45, 5, 0, 0, TAU); ctx.fill();
    const gr = ctx.createLinearGradient(0, y - h * 0.6, 0, y + h * 0.6);
    if (p.type === 'break') { gr.addColorStop(0, '#d5d9e0'); gr.addColorStop(1, '#8c93a3'); }
    else if (p.type === 'move') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9fd6ff'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d3e2f2'); }
    cloudShape(ctx, x, y, w, h); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = p.type === 'break' ? '#6c7384' : 'rgba(120,150,190,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (p.type === 'break') {   // סדקים
      ctx.strokeStyle = '#5d6475'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 6, y - h * 0.5); ctx.lineTo(x - 1, y - 2); ctx.lineTo(x - 7, y + 3); ctx.lineTo(x - 2, y + h * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 17, y - h * 0.3); ctx.lineTo(x + 13, y + 2); ctx.stroke();
    }
    if (p.type === 'move') {   // פסי תנועה
      ctx.strokeStyle = 'rgba(60,140,220,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const s = p.vx > 0 ? -1 : 1;
      for (const dy of [-4, 3]) { ctx.beginPath(); ctx.moveTo(x + s * (w / 2 + 4), y + dy); ctx.lineTo(x + s * (w / 2 + 14), y + dy); ctx.stroke(); }
    }
    if (p.spring) drawSpring(ctx, x + p.sx, p.y, p.springT > 0);
    if (p.jet) drawJetItem(ctx, x + p.jx, p.y - 14, t);
  }
  function drawSpring(ctx, x, y, used) {
    const hgt = used ? 22 : 13;
    ctx.strokeStyle = '#b8c2d0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 7, y);
    for (let i = 1; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 7 : -7), y - hgt * i / 4);
    ctx.stroke();
    const gr = ctx.createLinearGradient(0, y - hgt - 6, 0, y - hgt);
    gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(1, '#d42a3a');
    ctx.fillStyle = gr; GK.U.rr(ctx, x - 11, y - hgt - 6, 22, 7, 3); ctx.fill();
  }
  function drawJetItem(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 4) * 2);
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6); ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    drawJetpack(ctx, 0, 0, 1, false, t);
    ctx.restore();
  }
  function drawJetpack(ctx, x, y, s, fire, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const dx of [-6, 6]) {
      if (fire) {
        const fl = 14 + Math.sin(t * 50 + dx) * 5;
        const fg = ctx.createLinearGradient(0, 10, 0, 10 + fl);
        fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.35, '#ffd84d'); fg.addColorStop(1, 'rgba(255,90,40,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(dx - 4, 10); ctx.quadraticCurveTo(dx, 10 + fl * 1.4, dx + 4, 10); ctx.fill();
      }
      const gr = ctx.createLinearGradient(dx - 5, 0, dx + 5, 0);
      gr.addColorStop(0, '#8c96a8'); gr.addColorStop(0.5, '#e8edf5'); gr.addColorStop(1, '#6a7385');
      ctx.fillStyle = gr; GK.U.rr(ctx, dx - 5, -10, 10, 21, 4); ctx.fill();
      ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.moveTo(dx - 5, -8); ctx.quadraticCurveTo(dx, -17, dx + 5, -8); ctx.fill();
    }
    ctx.restore();
  }
  function drawHero(ctx, x, y, o) {
    const r = HERO_R, t = o.t;
    ctx.save(); ctx.translate(x, y);
    if (o.spin) ctx.rotate(o.spin);
    ctx.scale(o.sx || 1, o.sy || 1);
    if (o.jet) drawJetpack(ctx, -o.face * 14, 2, 1, true, t);
    // אוזניים
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.translate(sg * r * 0.45, -r * 0.75); ctx.rotate(sg * (0.25 + Math.sin(t * 6) * 0.06));
      ctx.fillStyle = '#ff8fb8'; ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.24, r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd0e2'; ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.11, r * 0.36, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // רגליים
    ctx.fillStyle = '#ff6fa3';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * r * 0.42, r * 0.92, r * 0.3, r * 0.16, 0, 0, TAU); ctx.fill(); }
    // גוף
    const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    gr.addColorStop(0, '#ffe3ef'); gr.addColorStop(0.5, '#ffa3c6'); gr.addColorStop(1, '#ff6f9f');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.42, 0, 0, TAU); ctx.fill();
    // פנים
    const lx = o.face * r * 0.12;
    if (o.dead) {
      ctx.strokeStyle = '#3a1a2a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (const sg of [-1, 1]) { const ex = sg * r * 0.36 + lx, ey = -r * 0.1; ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4); ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(lx, r * 0.42, r * 0.16, 0, TAU); ctx.stroke();
    } else {
      const blink = (t * 60 % 200) < 6;
      for (const sg of [-1, 1]) {
        const ex = sg * r * 0.36 + lx, ey = -r * 0.1;
        if (blink) { ctx.strokeStyle = '#3a1a2a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.lineTo(ex + 5, ey); ctx.stroke(); continue; }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.26, r * 0.31, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a1830'; ctx.beginPath(); ctx.arc(ex + o.face * 2 + (o.look || 0), ey + (o.vy > 4 ? 3 : o.vy < -4 ? -2 : 1), r * 0.16, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + o.face * 2 - 2, ey - 3, r * 0.06, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,90,140,.45)';
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * r * 0.62 + lx, r * 0.22, r * 0.15, r * 0.09, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#7a2a4a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); if (o.vy < -9) ctx.arc(lx, r * 0.3, r * 0.14, 0, TAU); else ctx.arc(lx, r * 0.22, r * 0.18, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawMonster(ctx, m, t) {
    ctx.save(); ctx.translate(m.x, m.y);
    if (m.dead) { ctx.rotate(m.spin); ctx.scale(1.25, 0.5); }
    const r = 22, flap = Math.sin(t * 12 + m.ph);
    ctx.fillStyle = '#5a2a8a';
    for (const sg of [-1, 1]) {   // כנפי עטלף קטנות
      ctx.save(); ctx.scale(sg, 1);
      ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.1); ctx.lineTo(r * 1.6, -r * 0.6 - flap * 6); ctx.lineTo(r * 1.35, -r * 0.05); ctx.lineTo(r * 1.55, r * 0.25 - flap * 3); ctx.lineTo(r * 0.75, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18, rr = i % 2 ? r : r * 1.12; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
    const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    gr.addColorStop(0, '#d9b3ff'); gr.addColorStop(0.5, '#9a5ae0'); gr.addColorStop(1, '#5a2a8a');
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = '#ffd84d';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * r * 0.35, -r * 0.85); ctx.lineTo(sg * r * 0.55, -r * 1.4); ctx.lineTo(sg * r * 0.7, -r * 0.75); ctx.fill(); }
    if (m.dead) {
      ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, 6); ctx.moveTo(8, -6); ctx.lineTo(-8, 6); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a1040'; ctx.beginPath(); ctx.arc(Math.sin(t * 2 + m.ph) * 3, -r * 0.05, r * 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(Math.sin(t * 2 + m.ph) * 3 - 3, -r * 0.15, r * 0.07, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(-r * 0.15, -r * 0.48); ctx.moveTo(r * 0.5, -r * 0.6); ctx.lineTo(r * 0.15, -r * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.52); ctx.lineTo(-r * 0.15, r * 0.42); ctx.lineTo(0, r * 0.52); ctx.lineTo(r * 0.15, r * 0.42); ctx.lineTo(r * 0.3, r * 0.52); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBackdrop(ctx, S, t) {
    const hgt = Math.max(0, START_Y - S.camY - H);
    const [top, bot] = skyAt(hgt);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const night = Math.max(0, Math.min(1, (hgt - 9000) / 8000));
    if (night > 0) {   // כוכבים
      for (const s of S.stars) {
        const y = ((s.y - S.camY * 0.05) % H + H) % H;
        ctx.globalAlpha = night * s.a * (0.6 + 0.4 * Math.sin(t * 2 + s.tw));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x, y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }
    const space = Math.max(0, Math.min(1, (hgt - 20000) / 6000));
    if (space > 0) {   // כוכב לכת רחוק
      ctx.globalAlpha = space;
      const px = 120, py = ((140 - S.camY * 0.02) % (H + 300) + H + 300) % (H + 300) - 150;
      const pg = ctx.createRadialGradient(px - 18, py - 18, 4, px, py, 46);
      pg.addColorStop(0, '#ffd2a0'); pg.addColorStop(0.6, '#e0706a'); pg.addColorStop(1, '#5a2050');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 46, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,180,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(px, py, 78, 16, -0.3, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // עננים ברקע (פרלקסה)
    const day = 1 - night * 0.7;
    for (const c of S.bgClouds) {
      const y = ((c.y - S.camY * c.k) % (H + 200) + H + 200) % (H + 200) - 100;
      ctx.globalAlpha = 0.5 * day * c.a;
      ctx.fillStyle = '#ffffff';
      cloudShape(ctx, c.x, y, c.w, c.w * 0.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // גבעות בהתחלה
    const groundY = START_Y + 40 - S.camY;
    if (groundY < H + 200) {
      ctx.fillStyle = '#7fd36a';
      ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, groundY - 50 - Math.sin(x * 0.012) * 40 - Math.sin(x * 0.031) * 14); ctx.lineTo(W, H + 400); ctx.lineTo(0, H + 400); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#58b84c';
      ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, groundY - 10 - Math.sin(x * 0.02 + 1) * 22); ctx.lineTo(W, H + 400); ctx.lineTo(0, H + 400); ctx.closePath(); ctx.fill();
    }
  }

  // ---------- יצירת העולם: שרשרת של עננים בטוחים ----------
  function diffAt(y) { return Math.max(0, Math.min(1, (START_Y - y) / 40000)); }
  function addPlat(S, o) { const p = Object.assign({ w: PW, vx: 0, type: 'normal', reliable: false, spring: false, sx: 0, springT: 0, jet: false, jx: 0, broken: false, min: 40, max: W - 40 }, o); S.plats.push(p); return p; }
  function generate(S, upto) {
    const R = S.rnd;
    while (S.genY > upto) {
      const d = diffAt(S.genY);
      const gap = lerp(GAP_MIN[0], GAP_MIN[1], d) + R() * (lerp(GAP_MAX[0], GAP_MAX[1], d) - lerp(GAP_MIN[0], GAP_MIN[1], d));
      const y = S.genY - gap;
      // מרחק אופקי מהענן הקודם: לכל היותר 270 (חצי מסך) — קפיצה מגיעה ל-330
      let x;
      for (let k = 0; k < 20; k++) { x = 45 + R() * (W - 90); const dx = Math.abs(wrapDx(x, S.genX)); if (dx >= 30) break; }
      const moving = S.genY < START_Y - 1500 && R() < 0.08 + 0.32 * d;
      const p = addPlat(S, { x, y, reliable: true, type: moving ? 'move' : 'normal' });
      if (moving) {
        const sp = (0.8 + R() * 0.8) * (R() < 0.5 ? -1 : 1);
        const span = 120 + R() * 160;
        p.vx = sp; p.min = Math.max(45, x - span / 2); p.max = Math.min(W - 45, x + span / 2);
      } else if (S.genY < START_Y - 600 && R() < 0.08) { p.spring = true; p.sx = (R() - 0.5) * 30; }
      else if (S.genY < START_Y - 4000 && START_Y - y - S.lastJet > 6000 && R() < 0.03) { p.jet = true; p.jx = (R() - 0.5) * 24; S.lastJet = START_Y - y; }
      // עננים נוספים ברווח: עוזרים בהתחלה, ומטעים (נשברים) בהמשך
      if (R() < 0.55 * (1 - d)) addPlat(S, { x: 45 + R() * (W - 90), y: y + gap * (0.35 + R() * 0.3) });
      if (S.genY < START_Y - 800 && R() < 0.15 + 0.35 * d) addPlat(S, { x: 45 + R() * (W - 90), y: y + gap * (0.3 + R() * 0.4), type: 'break' });
      // מפלצון: רק רחוק (150+) מהענן שמתחת ומזה שמעל, וכשאף אחד מהם לא זז
      const prev = S.lastRel;
      if (S.genY < START_Y - 2500 && !moving && prev && prev.type !== 'move' && R() < 0.04 + 0.12 * d) {
        for (let k = 0; k < 12; k++) {
          const mx = 40 + R() * (W - 80);
          if (Math.abs(wrapDx(mx, x)) >= 150 && Math.abs(wrapDx(mx, prev.x)) >= 150) {
            S.mons.push({ x: mx, bx: mx, y: y + gap * 0.5, by: y + gap * 0.5, ph: R() * TAU, dead: false, vy: 0, spin: 0 });
            break;
          }
        }
      }
      S.lastRel = p;
      S.genY = y; S.genX = x;
    }
  }

  function newState(g) {
    const R = Math.random;
    const S = {
      t: 0, camY: 0, maxH: 0, stomps: 0, plats: [], mons: [], bits: [], rnd: R,
      hero: { x: W / 2, y: START_Y - HERO_R - 1, vx: 0, vy: JUMP, face: 1, sx: 1, sy: 1, jet: 0, dead: 0, spin: 0, lastPlat: null },
      genY: START_Y, genX: W / 2, lastRel: null, lastJet: 0, ptrX: null, ptrT: 0, over: 0,
      stars: [], bgClouds: [],
    };
    for (let i = 0; i < 70; i++) S.stars.push({ x: R() * W, y: R() * H, s: R() < 0.15 ? 2 : 1, a: 0.4 + R() * 0.6, tw: R() * TAU });
    for (let i = 0; i < 6; i++) S.bgClouds.push({ x: R() * W, y: R() * (H + 200), w: 120 + R() * 140, k: 0.25 + R() * 0.2, a: 0.6 + R() * 0.4 });
    addPlat(S, { x: W / 2, y: START_Y, w: W + 60, reliable: true, ground: true, min: W / 2, max: W / 2 });
    S.lastRel = S.plats[0];
    generate(S, -H);
    return S;
  }

  function die(g, how) {
    const S = g.s, h = S.hero;
    if (h.dead) return;
    h.dead = 1; h.jet = 0;
    if (how === 'monster') { h.vy = -6; g.sfx('hit'); g.shake(10); g.flash('#ff4060', 0.25); g.burst(h.x, h.y, { n: 18, color: ['#ffd84d', '#ffffff'], speed: 4, life: 30 }); }
    else g.sfx('whoosh');
  }

  // ---------- בוט לבדיקות: בוחר את הענן הבא ומנווט אליו במקשים (כמו שחקן) ----------
  function botPlay(g) {
    const S = g.s, h = S.hero;
    g.keys.delete('ArrowLeft'); g.keys.delete('ArrowRight');
    if (h.dead) return;
    const feet = h.y + HERO_R;
    let target = null;
    if (h.jet) target = null;
    else if (h.vy < 0) {   // עולה: הענן הכי גבוה שעוד נגיע אליו, לא נשבר
      const apex = feet - h.vy * h.vy / (2 * G);
      let best = -1e9;
      for (const p of S.plats) {
        if (p.broken || p.type === 'break' || p.ground) continue;
        if (p.y < apex + 22 || p.y > feet - 20) continue;
        const tDown = (-h.vy + Math.sqrt(Math.max(0, h.vy * h.vy - 2 * G * (feet - p.y)))) / G;
        const px = p.x + p.vx * tDown;
        if (Math.abs(wrapDx(px, h.x)) - p.w / 2 > tDown * MAXV * 0.85) continue;
        if (monsterNear(S, p.x, p.y)) continue;
        const score = -p.y + (p.spring ? 400 : 0) + (p.jet ? 900 : 0);
        if (score > best) { best = score; target = p; }
      }
    }
    if (!target) {   // יורד: הענן הכי גבוה מתחתיו שאפשר להגיע אליו
      let best = 1e9;
      for (const p of S.plats) {
        if (p.broken || p.type === 'break') continue;
        if (p.y < feet - 2) continue;
        const dy = p.y - feet, vy = Math.max(h.vy, 0);
        const tt = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
        const px = p.x + p.vx * tt;
        if (Math.abs(wrapDx(px, h.x)) > tt * MAXV * 0.9 + p.w / 2) continue;
        if (p.y - S.camY > H - 30) continue;
        if (p.y < best) { best = p.y; target = p; }
      }
    }
    let goal = target ? target.x + (target.spring ? target.sx : 0) : h.x;
    if (target && target.type === 'move') {
      const dy = target.y - feet, vy = h.vy;
      const tt = Math.max(1, (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * Math.max(0, dy)))) / G);
      goal = Math.max(target.min, Math.min(target.max, target.x + target.vx * tt));
    }
    // מתחמק ממפלצונים שבדרך
    for (const m of S.mons) {
      if (m.dead) continue;
      const dy = m.y - h.y;
      if (dy > -170 && dy < 60 && Math.abs(wrapDx(m.x, h.x)) < 80 && !(h.vy > 0 && h.y < m.y - 20)) goal = h.x + (wrapDx(h.x, m.x) >= 0 ? 90 : -90);
    }
    const d = wrapDx(goal, h.x);
    if (d < -4) g.keys.add('ArrowLeft'); else if (d > 4) g.keys.add('ArrowRight');
  }
  function monsterNear(S, x, y) { return S.mons.some(m => !m.dead && Math.abs(m.y - y) < 110 && Math.abs(wrapDx(m.x, x)) < 110); }

  GK.register('sky-jump', {
    w: W, h: H, bg: '#1f4a86', accent: '#ffb3d1',
    touch: [['ArrowLeft', '◀'], null, ['ArrowRight', '▶']],
    fmt: (v, g) => v + ' ' + g.t('unit'),
    text: {
      he: { unit: 'מ׳', title: 'קפיצה לשמיים', help: ['הדמות קופצת לבד — חצים / AD או העכבר כדי לנווט', 'צא מצד אחד של המסך ותופיע בצד השני', 'עננים אפורים נשברים, קפיצים מקפיצים גבוה', 'נחת על מפלצון כדי לרמוס אותו — אל תיתקע בו מהצד', 'אל תיפול! כמה גבוה תגיע?'], helpTouch: ['הדמות קופצת לבד — החזק את האצבע בצד שאליו לזוז', 'צא מצד אחד של המסך ותופיע בצד השני', 'עננים אפורים נשברים, קפיצים מקפיצים גבוה', 'נחת על מפלצון כדי לרמוס אותו. אל תיפול!'], height: 'גובה', reached: 'הגעת לגובה {n} מטר', stomp: 'נרמס!' },
      en: { unit: 'm', title: 'Sky Jump', help: ['You bounce by yourself — steer with arrows / AD or the mouse', 'Leave one side of the screen and come back on the other', 'Grey clouds break, springs throw you high', "Land on a monster to stomp it — don't bump into it", "Don't fall! How high can you go?"], helpTouch: ['You bounce by yourself — hold your finger on the side to move to', 'Leave one side of the screen and come back on the other', 'Grey clouds break, springs throw you high', "Land on a monster to stomp it. Don't fall!"], height: 'Height', reached: 'You reached {n} meters', stomp: 'Stomp!' },
      ar: { unit: 'م', title: 'القفز إلى السماء', help: ['تقفز وحدك — وجّه بالأسهم / AD أو بالفأرة', 'اخرج من جانب الشاشة لتظهر من الجانب الآخر', 'السحب الرمادية تنكسر، والنوابض ترميك عالياً', 'اهبط على الوحش لتدوسه — لا تصطدم به من الجانب', 'لا تسقط! إلى أي ارتفاع ستصل؟'], helpTouch: ['تقفز وحدك — ضع إصبعك على الجهة التي تريدها', 'اخرج من جانب الشاشة لتظهر من الجانب الآخر', 'السحب الرمادية تنكسر، والنوابض ترميك عالياً', 'اهبط على الوحش لتدوسه. لا تسقط!'], height: 'الارتفاع', reached: 'وصلت إلى {n} متر', stomp: 'دعسة!' },
      es: { unit: 'm', title: 'Salto al cielo', help: ['Rebotas solo: dirige con las flechas / AD o el ratón', 'Sal por un lado de la pantalla y vuelves por el otro', 'Las nubes grises se rompen y los muelles te lanzan alto', 'Cae sobre un monstruo para aplastarlo, no choques de lado', '¡No te caigas! ¿Hasta dónde llegarás?'], helpTouch: ['Rebotas solo: mantén el dedo en el lado hacia donde ir', 'Sal por un lado de la pantalla y vuelves por el otro', 'Las nubes grises se rompen y los muelles te lanzan alto', 'Cae sobre un monstruo para aplastarlo. ¡No te caigas!'], height: 'Altura', reached: 'Llegaste a {n} metros', stomp: '¡Aplastado!' },
      fr: { unit: 'm', title: 'Saut vers le ciel', help: ['Tu rebondis tout seul : dirige avec les flèches / AD ou la souris', "Sors d'un côté de l'écran pour revenir de l'autre", 'Les nuages gris cassent, les ressorts te lancent haut', 'Atterris sur un monstre pour l’écraser, ne le touche pas de côté', 'Ne tombe pas ! Jusqu’où monteras-tu ?'], helpTouch: ['Tu rebondis tout seul : garde le doigt du côté où aller', "Sors d'un côté de l'écran pour revenir de l'autre", 'Les nuages gris cassent, les ressorts te lancent haut', 'Atterris sur un monstre pour l’écraser. Ne tombe pas !'], height: 'Hauteur', reached: 'Tu es monté à {n} mètres', stomp: 'Écrasé !' },
      pt: { unit: 'm', title: 'Salto para o céu', help: ['Você quica sozinho: guie com as setas / AD ou o mouse', 'Saia por um lado da tela e volte pelo outro', 'Nuvens cinza quebram, molas te jogam bem alto', 'Caia em cima de um monstro para esmagá-lo, não bata de lado', 'Não caia! Até onde você chega?'], helpTouch: ['Você quica sozinho: segure o dedo no lado para onde ir', 'Saia por um lado da tela e volte pelo outro', 'Nuvens cinza quebram, molas te jogam bem alto', 'Caia em cima de um monstro para esmagá-lo. Não caia!'], height: 'Altura', reached: 'Você chegou a {n} metros', stomp: 'Esmagado!' },
      ru: { unit: 'м', title: 'Прыжок в небо', help: ['Прыжки сами — управляй стрелками / AD или мышью', 'Уйди за край экрана — появишься с другой стороны', 'Серые облака ломаются, пружины подкидывают высоко', 'Прыгни на монстра сверху, чтобы раздавить, но не врезайся сбоку', 'Не упади! Как высоко ты заберёшься?'], helpTouch: ['Прыжки сами — держи палец с той стороны, куда двигаться', 'Уйди за край экрана — появишься с другой стороны', 'Серые облака ломаются, пружины подкидывают высоко', 'Прыгни на монстра сверху, чтобы раздавить. Не упади!'], height: 'Высота', reached: 'Ты поднялся на {n} м', stomp: 'Раздавлен!' },
      de: { unit: 'm', title: 'Himmelssprung', help: ['Du hüpfst von selbst — lenke mit Pfeilen / AD oder der Maus', 'Verlass eine Bildschirmseite und komm auf der anderen zurück', 'Graue Wolken brechen, Federn schleudern dich hoch', 'Spring von oben auf ein Monster, um es plattzumachen', 'Fall nicht runter! Wie hoch kommst du?'], helpTouch: ['Du hüpfst von selbst — halte den Finger auf der Seite, wohin du willst', 'Verlass eine Bildschirmseite und komm auf der anderen zurück', 'Graue Wolken brechen, Federn schleudern dich hoch', 'Spring von oben auf ein Monster. Fall nicht runter!'], height: 'Höhe', reached: 'Du hast {n} Meter erreicht', stomp: 'Platt!' },
    },

    init(g) {
      g.s = newState(g);
      if (g.demo) { const h = g.s.hero; h.y = START_Y - 260; h.vy = -3; }
    },

    idle(g) {
      const S = g.s, h = S.hero;
      S.t++;
      if (!g.demo) return;
      h.vy += G * 0.5; h.y += h.vy;
      if (h.y > START_Y - HERO_R - 1) { h.y = START_Y - HERO_R - 1; h.vy = JUMP * 0.75; h.sy = 0.75; h.sx = 1.2; }
      h.sx += (1 - h.sx) * 0.15; h.sy += (1 - h.sy) * 0.15;
    },

    step(g) {
      const S = g.s, h = S.hero;
      S.t++;
      // ----- היגוי: מקשים, או מיקום העכבר / האצבע -----
      const ax = g.axis().x;
      if (ax) S.ptrX = null;
      if (!h.dead) {
        if (ax) { h.vx += ax * ACC; h.vx = Math.max(-MAXV, Math.min(MAXV, h.vx)); h.face = ax; }
        else if (S.ptrX != null) { const d = S.ptrX - h.x; h.vx = Math.max(-8.5, Math.min(8.5, d * 0.18)); if (Math.abs(d) > 6) h.face = d > 0 ? 1 : -1; }
        else h.vx *= 0.82;
      }
      h.x += h.vx;
      if (h.x < -HERO_R) h.x += W; else if (h.x > W + HERO_R) h.x -= W;
      // ----- אנכי -----
      const feet0 = h.y + HERO_R;
      if (h.jet > 0) {
        h.jet--; h.vy = JET_V;
        if (S.t % 2 === 0) g.burst(h.x - h.face * 14, h.y + 22, { n: 2, color: ['#ffd84d', '#ff7a3a', '#ffffff'], speed: 2, life: 18, dir: Math.PI / 2, spread: 0.6, gravity: 0.05 });
        if (h.jet === 0) g.sfx('pop');
      } else h.vy = Math.min(h.vy + G, 15);
      h.y += h.vy;
      const feet = h.y + HERO_R;
      h.sx += (1 - h.sx) * 0.15; h.sy += (1 - h.sy) * 0.15;
      if (h.dead) h.spin += 0.15;
      // ----- נחיתה על עננים -----
      if (!h.dead && h.vy > 0 && !h.jet) {
        for (const p of S.plats) {
          if (p.broken || feet0 > p.y + 2 || feet < p.y) continue;
          if (Math.abs(wrapDx(h.x, p.x)) > p.w / 2 + HERO_R * 0.55) continue;
          if (p.type === 'break') {   // נשבר — הדמות ממשיכה ליפול
            p.broken = true;
            S.bits.push({ x: p.x - 18, y: p.y + 9, vx: -1.2, vy: 1, rot: 0, vr: -0.05, w: p.w * 0.5, t: 0 }, { x: p.x + 18, y: p.y + 9, vx: 1.2, vy: 1, rot: 0, vr: 0.05, w: p.w * 0.5, t: 0 });
            g.burst(p.x, p.y + 10, { n: 10, color: ['#c5cad4', '#8c93a3'], speed: 2.2, life: 26 });
            g.sfx('break', { p: 0.8 });
            continue;
          }
          h.y = p.y - HERO_R;
          const onSpring = p.spring && Math.abs(wrapDx(h.x, p.x + p.sx)) < 18;
          if (onSpring) { h.vy = SPRING; p.springT = 16; g.sfx('jump', { p: 1.4 }); g.sfx('bounce', { p: 1.5 }); h.sy = 1.35; h.sx = 0.75; }
          else { h.vy = JUMP; g.sfx('jump', { p: 0.9 + Math.min(0.4, S.maxH / 60000) }); h.sy = 0.7; h.sx = 1.25; }
          g.burst(h.x, p.y + 4, { n: 6, color: ['#ffffff', '#e6f2ff'], speed: 1.6, life: 18, gravity: 0.02, dir: Math.PI / 2, spread: 2.6 });
          h.lastPlat = p;
          break;
        }
      }
      // ----- תרמיל רקטה -----
      if (!h.dead && !h.jet) for (const p of S.plats) if (p.jet && Math.abs(wrapDx(h.x, p.x + p.jx)) < 26 && Math.abs(h.y - (p.y - 14)) < 30) { p.jet = false; h.jet = JET_T; g.sfx('power'); g.flash('#fff3b0', 0.25); }
      // ----- מפלצונים -----
      for (const m of S.mons) {
        if (m.dead) { m.vy += G; m.y += m.vy; m.spin += 0.12; continue; }
        m.x = m.bx + Math.sin(S.t * 0.02 + m.ph) * 30; m.y = m.by + Math.sin(S.t * 0.05 + m.ph) * 8;
        if (h.dead) continue;
        const dx = wrapDx(h.x, m.x), dy = h.y - m.y;
        if (Math.abs(dx) < 22 + HERO_R * 0.7 && Math.abs(dy) < 22 + HERO_R * 0.7) {
          if (h.jet) { m.dead = true; m.vy = -4; g.sfx('pop'); continue; }
          if (h.vy > 0 && dy < -8) {   // רמיסה
            m.dead = true; m.vy = -2; h.vy = JUMP; h.sy = 0.7; h.sx = 1.25;
            g.sfx('pop'); g.sfx('bounce', { p: 1.2 }); g.burst(m.x, m.y, { n: 18, color: ['#b98aff', '#ffd84d', '#ffffff'], speed: 3.5, life: 30 });
            g.float(m.x, m.y - 30, g.t('stomp'), { color: '#ffd84d', size: 24 });
            S.stomps++;
          } else die(g, 'monster');
        }
      }
      // ----- עננים זזים, קפיצים, שברים -----
      for (const p of S.plats) {
        if (p.type === 'move') { p.x += p.vx; if (p.x < p.min || p.x > p.max) { p.vx = -p.vx; p.x = Math.max(p.min, Math.min(p.max, p.x)); } }
        if (p.springT > 0) p.springT--;
      }
      for (const b of S.bits) { b.t++; b.vy += G; b.x += b.vx; b.y += b.vy; b.rot += b.vr; }
      compact(S.bits, b => b.t < 60);
      // ----- מצלמה (רק למעלה), גובה, יצירה -----
      if (!h.dead) {
        const want = h.y - H * 0.42;
        if (want < S.camY) S.camY = want;
        S.maxH = Math.max(S.maxH, START_Y - HERO_R - h.y);
        g.score = Math.floor(S.maxH / 10);
      }
      generate(S, S.camY - H);
      const bottom = S.camY + H;
      compact(S.plats, p => p.y < bottom + 60);
      compact(S.mons, m => m.y < bottom + 120);
      // ----- נפילה -----
      if (!h.dead && h.y - HERO_R > bottom) die(g, 'fall');
      if (h.dead && (h.y - HERO_R > bottom + 40 || h.dead++ > 150)) {
        if (!S.over) { S.over = 1; g.sfx('lose'); }
      }
      if (S.over && S.over++ > 20) { g.end({ score: g.score, scoreLabel: g.t('height'), text: g.t('reached', { n: g.score }) }); return; }
      const b = g.getBest();
      g.hud([[g.t('height'), g.score + ' ' + g.t('unit')], [g.t('best'), b === null ? '—' : Math.max(b, g.score) + ' ' + g.t('unit')]]);
    },

    bot: botPlay,

    onPointer(g, type, p) {
      const S = g.s;
      if (p.kind === 'touch') { if (type === 'up') S.ptrX = null; else if (p.down !== false) S.ptrX = p.x; return; }
      if (type === 'move' || type === 'down') S.ptrX = p.x;
    },

    draw(g, ctx) {
      const S = g.s, h = S.hero, t = S.t / 60;
      drawBackdrop(ctx, S, t);
      ctx.save(); ctx.translate(0, -S.camY);
      for (const p of S.plats) {
        if (p.y - S.camY < -40 || p.y - S.camY > H + 40) continue;
        drawPlat(ctx, p, t);
        if (p.ground) continue;
        if (p.x < p.w / 2 + 10) drawPlat(ctx, Object.assign({}, p, { x: p.x + W }), t);
        if (p.x > W - p.w / 2 - 10) drawPlat(ctx, Object.assign({}, p, { x: p.x - W }), t);
      }
      for (const b of S.bits) {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - b.t / 60); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = '#a9afbc'; cloudShape(ctx, 0, 0, b.w, 14); ctx.fill(); ctx.restore();
      }
      for (const m of S.mons) if (m.y - S.camY > -60 && m.y - S.camY < H + 60) drawMonster(ctx, m, t);
      const o = { t, face: h.face, sx: h.sx, sy: h.sy, jet: h.jet > 0, dead: !!h.dead, spin: h.dead ? h.spin : 0, vy: h.vy };
      drawHero(ctx, h.x, h.y, o);
      if (h.x < HERO_R) drawHero(ctx, h.x + W, h.y, o);
      if (h.x > W - HERO_R) drawHero(ctx, h.x - W, h.y, o);
      ctx.restore();
    },

    cover(ctx, w, h, k) {
      const S = { camY: -3000, stars: [], bgClouds: [] };
      const R = k.seeded(8);
      for (let i = 0; i < 5; i++) S.bgClouds.push({ x: R() * w, y: R() * h, w: 160 + R() * 160, k: 0, a: 0.8 });
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#5b8ff0'); sky.addColorStop(0.65, '#9fd2ff'); sky.addColorStop(1, '#ffd4b8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (const c of S.bgClouds) { cloudShape(ctx, c.x, c.y, c.w, c.w * 0.3); ctx.fill(); }
      const sc = 1.45;
      ctx.save(); ctx.scale(sc, sc);
      const plats = [[120, 330, 'normal'], [300, 270, 'move'], [470, 300, 'break'], [210, 175, 'normal'], [560, 160, 'normal'], [400, 95, 'normal'], [70, 110, 'normal']];
      for (const [x, y, type] of plats) drawPlat(ctx, { x, y, w: PW, type, vx: 1, spring: x === 560, sx: 0, springT: 0, jet: false }, 0);
      drawMonster(ctx, { x: 560, y: 70, ph: 1, dead: false }, 0.4);
      drawHero(ctx, 300, 205, { t: 0.5, face: 1, sx: 0.88, sy: 1.15, vy: -12 });
      ctx.restore();
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.6 - i * 0.09; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(300 * sc - 4, (232 + i * 16) * sc, 6 - i * 0.7, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
  });
  GK.games['sky-jump']._t = { W, H, G, JUMP, MAXV, REACH, START_Y, HERO_R, GAP_MAX, wrapDx, newState, generate };
})();
