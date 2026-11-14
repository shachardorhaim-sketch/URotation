// ============================================================
//  חותכים פירות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  פירות נזרקים מלמטה; מחליקים עם העכבר או האצבע כדי לחתוך: שובל זוהר, מיץ, חצאים שנופלים.
//  פצצות (בקלאסי — סוף הסיבוב), קומבו לכמה פירות בהחלקה אחת. קלאסי (3 פספוסים) ומרוץ של 60 שניות.
// ============================================================
(function () {
  const W = 960, H = 600, TAU = Math.PI * 2;
  const GR = 0.19, BOMB_R = 28, RUSH = 60;
  const FRUITS = [
    { kind: 'apple', r: 30, skin: '#ff4757', dark: '#9e1426', flesh: '#fff3d1', rim: '#ffe2a8', juice: '#ffe48a' },
    { kind: 'orange', r: 31, skin: '#ffa21f', dark: '#c05a06', flesh: '#ffb340', rim: '#fff0c2', juice: '#ffab2e' },
    { kind: 'lemon', r: 26, skin: '#ffe23d', dark: '#c9a000', flesh: '#fff59a', rim: '#fffbe0', juice: '#fff176' },
    { kind: 'melon', r: 44, skin: '#46c35f', dark: '#145c2a', flesh: '#ff4d5e', rim: '#e9ffd8', juice: '#ff3b5c' },
    { kind: 'kiwi', r: 26, skin: '#a07a46', dark: '#5a4220', flesh: '#8fd94a', rim: '#d8f5b0', juice: '#a6e05a', sx: 1.12 },
    { kind: 'plum', r: 25, skin: '#9150e6', dark: '#3f1a70', flesh: '#ffd36b', rim: '#ffe9a8', juice: '#b35cff' },
    { kind: 'peach', r: 30, skin: '#ffab85', dark: '#d8553a', flesh: '#ffd59e', rim: '#fff0d8', juice: '#ffb07a' },
    { kind: 'coco', r: 32, skin: '#8a5a32', dark: '#4a2e14', flesh: '#ffffff', rim: '#7a5230', juice: '#f6f6f6' },
    { kind: 'straw', r: 25, skin: '#ff3b4f', dark: '#a8142a', flesh: '#ff8a96', rim: '#ffd0d6', juice: '#ff4d6d' },
  ];
  const GOLD = { kind: 'gold', r: 28, skin: '#ffd23f', dark: '#b07a08', flesh: '#fff3a0', rim: '#ffffff', juice: '#ffe066' };
  const shade = (c, a) => GK.U.shade(c, a);
  const compact = (arr, keep) => { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; };
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
  }

  // ---------- ציור הפירות ----------
  function bodyPath(ctx, F, r) {
    ctx.beginPath();
    if (F.kind === 'straw') {
      ctx.moveTo(0, r * 1.05);
      ctx.bezierCurveTo(r * 0.6, r * 0.8, r * 1.1, r * 0.1, r * 0.95, -r * 0.45);
      ctx.bezierCurveTo(r * 0.85, -r * 0.95, r * 0.2, -r * 0.95, 0, -r * 0.8);
      ctx.bezierCurveTo(-r * 0.2, -r * 0.95, -r * 0.85, -r * 0.95, -r * 0.95, -r * 0.45);
      ctx.bezierCurveTo(-r * 1.1, r * 0.1, -r * 0.6, r * 0.8, 0, r * 1.05);
    } else if (F.kind === 'gold') {
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.55 : r * 1.1; if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
    } else if (F.kind === 'lemon') ctx.ellipse(0, 0, r * 1.2, r * 0.95, 0, 0, TAU);
    else ctx.ellipse(0, 0, r * (F.sx || 1), r, 0, 0, TAU);
  }
  function drawBody(ctx, F, r) {
    bodyPath(ctx, F, r);
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r * 1.15);
    gr.addColorStop(0, shade(F.skin, 0.5)); gr.addColorStop(0.55, F.skin); gr.addColorStop(1, F.dark);
    ctx.fillStyle = gr; ctx.fill();
    const k = F.kind;
    ctx.lineCap = 'round';
    if (k === 'melon') {
      ctx.save(); bodyPath(ctx, F, r); ctx.clip();
      ctx.strokeStyle = 'rgba(15,70,30,.75)'; ctx.lineWidth = r * 0.14;
      for (let i = -3; i <= 3; i++) { const x = i * r * 0.32; ctx.beginPath(); ctx.moveTo(x, -r); ctx.bezierCurveTo(x + r * 0.18, -r * 0.4, x - r * 0.18, r * 0.3, x + r * 0.05, r); ctx.stroke(); }
      ctx.restore();
    } else if (k === 'orange' || k === 'lemon') {
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for (let i = 0; i < 16; i++) { const a = i * 2.4, d = r * (0.25 + (i * 37 % 10) / 15); ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.9, r * 0.045, 0, TAU); ctx.fill(); }
      if (k === 'lemon') { ctx.fillStyle = F.skin; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 1.2, 0, r * 0.16, r * 0.12, 0, 0, TAU); ctx.fill(); } }
      else { ctx.fillStyle = '#3f8a2a'; ctx.beginPath(); ctx.arc(0, -r * 0.9, r * 0.1, 0, TAU); ctx.fill(); }
    } else if (k === 'kiwi' || k === 'coco') {
      ctx.strokeStyle = k === 'kiwi' ? 'rgba(70,45,15,.5)' : 'rgba(40,22,8,.6)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 26; i++) { const a = i * 2.39, d = r * (0.2 + (i * 53 % 10) / 13); const x = Math.cos(a) * d * (F.sx || 1), y = Math.sin(a) * d * 0.95; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 1) * 4, y + Math.sin(a + 1) * 4); ctx.stroke(); }
      if (k === 'coco') { ctx.fillStyle = '#2a1608'; for (const [x, y] of [[-r * 0.2, -r * 0.55], [r * 0.2, -r * 0.55], [0, -r * 0.3]]) { ctx.beginPath(); ctx.arc(x, y, r * 0.09, 0, TAU); ctx.fill(); } }
    } else if (k === 'plum' || k === 'peach') {
      if (k === 'peach') { const bl = ctx.createRadialGradient(r * 0.35, r * 0.2, 0, r * 0.35, r * 0.2, r * 0.8); bl.addColorStop(0, 'rgba(255,70,90,.45)'); bl.addColorStop(1, 'rgba(255,70,90,0)'); ctx.fillStyle = bl; bodyPath(ctx, F, r); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.92); ctx.bezierCurveTo(r * 0.35, -r * 0.4, r * 0.35, r * 0.4, 0, r * 0.95); ctx.stroke();
    } else if (k === 'apple') {
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = r * 0.11;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(r * 0.12, -r * 1.22); ctx.stroke();
      ctx.fillStyle = '#4fc24f'; ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 1.02, r * 0.3, r * 0.14, -0.5, 0, TAU); ctx.fill();
    } else if (k === 'straw') {
      ctx.fillStyle = '#ffe680';
      for (let i = 0; i < 14; i++) { const a = i * 2.4, d = r * (0.2 + (i * 31 % 10) / 15); ctx.beginPath(); ctx.ellipse(Math.cos(a) * d * 0.85, Math.sin(a) * d * 0.8 + r * 0.1, r * 0.05, r * 0.08, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#3fae3f';
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.lineTo(Math.cos(a - 0.2) * r * 0.55, -r * 0.78 + Math.sin(a - 0.2) * r * 0.35 - r * 0.1); ctx.lineTo(Math.cos(a + 0.2) * r * 0.55, -r * 0.78 + Math.sin(a + 0.2) * r * 0.35 - r * 0.1); ctx.fill(); }
    } else if (k === 'gold') {
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; bodyPath(ctx, F, r); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.16, r * 0.28, 0.6, 0, TAU); ctx.fill();
  }
  // הצד החתוך (במסגרת שבה החתך אופקי והחצי מעליו)
  function drawFace(ctx, F, r) {
    const rx = r * (F.kind === 'lemon' ? 1.15 : (F.sx || 1)) * 0.94, ry = r * 0.44;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = F.rim; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.86, ry * 0.78, 0, 0, TAU); ctx.fillStyle = F.flesh; ctx.fill();
    ctx.save(); ctx.scale(1, ry / rx);
    const q = rx * 0.86, k = F.kind;
    if (k === 'orange' || k === 'lemon') {
      ctx.strokeStyle = F.rim; ctx.lineWidth = 2.2;
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * q * 0.92, Math.sin(a) * q * 0.92); ctx.stroke(); }
    } else if (k === 'melon') {
      ctx.fillStyle = '#2a1a1a';
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + 0.3; ctx.beginPath(); ctx.ellipse(Math.cos(a) * q * 0.55, Math.sin(a) * q * 0.55, 3, 5, a, 0, TAU); ctx.fill(); }
    } else if (k === 'kiwi') {
      ctx.fillStyle = '#f4ffe0'; ctx.beginPath(); ctx.arc(0, 0, q * 0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1a10';
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14; ctx.beginPath(); ctx.ellipse(Math.cos(a) * q * 0.45, Math.sin(a) * q * 0.45, 2.4, 1.4, a, 0, TAU); ctx.fill(); }
    } else if (k === 'apple') {
      ctx.fillStyle = '#5a3a1a';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.ellipse(Math.cos(a) * q * 0.2, Math.sin(a) * q * 0.2, 3.4, 2, a, 0, TAU); ctx.fill(); }
    } else if (k === 'plum' || k === 'peach') {
      ctx.fillStyle = '#9a5a2a'; ctx.beginPath(); ctx.ellipse(0, 0, q * 0.36, q * 0.3, 0, 0, TAU); ctx.fill();
    } else if (k === 'straw' || k === 'gold') {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, q * 0.45, q * 0.3, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawFruit(ctx, F, x, y, rot, s) {
    ctx.save(); ctx.translate(x, y);
    if (F.kind === 'gold') { const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, F.r * 2); gl.addColorStop(0, 'rgba(255,230,120,.5)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, F.r * 2, 0, TAU); ctx.fill(); }
    ctx.rotate(rot); if (s && s !== 1) ctx.scale(s, s);
    drawBody(ctx, F, F.r);
    ctx.restore();
  }
  function drawHalf(ctx, h) {
    const F = h.F, r = F.r;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    ctx.beginPath(); ctx.rect(-r * 2, -r * 2, r * 4, r * 2); ctx.clip();
    ctx.save(); ctx.rotate(h.body); drawBody(ctx, F, r); ctx.restore();
    drawFace(ctx, F, r);
    ctx.restore();
  }
  function drawBomb(ctx, x, y, rot, t) {
    const r = BOMB_R;
    ctx.save(); ctx.translate(x, y);
    const p = 0.5 + 0.5 * Math.sin(t * 10);
    const gl = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.7);
    gl.addColorStop(0, 'rgba(255,50,60,' + (0.25 + 0.25 * p) + ')'); gl.addColorStop(1, 'rgba(255,50,60,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.fill();
    ctx.rotate(rot);
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
    gr.addColorStop(0, '#7a8094'); gr.addColorStop(0.45, '#2c2f3a'); gr.addColorStop(1, '#0b0c10');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9aa3b5'; ctx.fillRect(-r * 0.3, -r * 1.15, r * 0.6, r * 0.32);
    ctx.fillStyle = '#5d6475'; ctx.fillRect(-r * 0.3, -r * 0.92, r * 0.6, r * 0.08);
    ctx.strokeStyle = '#d8b07a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.quadraticCurveTo(r * 0.1, -r * 1.6, r * 0.5, -r * 1.65); ctx.stroke();
    const sx = r * 0.5, sy = -r * 1.65, s = 6 + 3 * Math.sin(t * 30);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * 0.4 : s; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
    ctx.restore();
  }
  function paintBoard(c, w, h) {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#8a5a30'); bg.addColorStop(1, '#5e3a1c');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const R = GK.U.seeded(21), ph = 86;
    for (let y = 0, i = 0; y < h; y += ph, i++) {
      c.fillStyle = 'rgba(' + (i % 2 ? '255,220,170' : '40,20,5') + ',' + (0.04 + R() * 0.05) + ')';
      c.fillRect(0, y, w, ph);
      c.strokeStyle = 'rgba(50,25,8,.28)'; c.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) {
        const gy = y + 8 + R() * (ph - 16), amp = 2 + R() * 4, f = 0.004 + R() * 0.01, off = R() * 100;
        c.beginPath(); for (let x = 0; x <= w; x += 12) c.lineTo(x, gy + Math.sin((x + off) * f) * amp); c.stroke();
      }
      for (let k = 0; k < 2; k++) {
        const kx = R() * w, ky = y + 20 + R() * (ph - 40);
        c.fillStyle = 'rgba(60,30,10,.35)'; c.beginPath(); c.ellipse(kx, ky, 14 + R() * 10, 6 + R() * 3, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(60,30,10,.3)'; c.beginPath(); c.ellipse(kx, ky, 24, 10, 0, 0, TAU); c.stroke();
      }
      c.fillStyle = 'rgba(25,12,4,.6)'; c.fillRect(0, y + ph - 3, w, 3);
      c.fillStyle = 'rgba(255,220,170,.12)'; c.fillRect(0, y, w, 2);
    }
    const vg = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  }
  function drawSplat(ctx, s) {
    ctx.globalAlpha = Math.max(0, s.a) * 0.7;
    ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = s.seed + i * 0.9, d = s.r * (0.9 + ((i * 37 + s.seed * 10) % 7) / 7);
      ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.r * (0.18 + (i % 3) * 0.08), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const boards = new WeakMap();
  function boardFor(g) {
    const k = Math.max(1, Math.round((g.canvas.width / W) * 4) / 4);
    let b = boards.get(g);
    if (!b || b.k !== k) {
      const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
      const x = c.getContext('2d'); x.scale(k, k); paintBoard(x, W, H);
      b = { k, c }; boards.set(g, b);
    }
    return b.c;
  }

  // ---------- זריקות ----------
  function throwItem(g, o) {
    const S = g.s;
    const x = o.x != null ? o.x : 120 + Math.random() * (W - 240);
    const apex = o.apex != null ? o.apex : 70 + Math.random() * 190;
    const y0 = H + 40;
    const vy = -Math.sqrt(2 * GR * (y0 - apex));
    const T = 2 * -vy / GR;
    const tx = o.tx != null ? o.tx : 180 + Math.random() * (W - 360);
    const it = { x, y: y0, vx: (tx - x) / T, vy, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.09, cut: false, bomb: !!o.bomb, F: o.bomb ? null : o.gold ? GOLD : FRUITS[Math.floor(Math.random() * FRUITS.length)], gold: !!o.gold };
    S.items.push(it);
    g.sfx('whoosh');
  }
  function planThrow(g) {
    const S = g.s, rush = g.mode === 'rush';
    const lv = rush ? 0.75 : Math.min(1, S.t / (60 * 150));   // הקושי עולה בשתי הדקות וחצי הראשונות
    const bombP = rush ? 0.2 : 0.08 + lv * 0.2;
    const r = Math.random();
    const list = [];
    if (r < 0.35 - lv * 0.15) list.push({});
    else if (r < 0.6) { const n = 2 + Math.floor(Math.random() * (1 + lv * 2)); for (let i = 0; i < n; i++) list.push({ delay: i * 9 }); }
    else if (r < 0.8) {   // מניפה מהמרכז
      const n = 3 + Math.floor(Math.random() * (1 + lv * 2)), cx = 300 + Math.random() * 360;
      for (let i = 0; i < n; i++) list.push({ x: cx + (i - (n - 1) / 2) * 30, tx: cx + (i - (n - 1) / 2) * 140, apex: 90 + Math.random() * 60 });
    } else {   // מטח מצד אחד
      const n = 3 + Math.floor(Math.random() * (2 + lv * 2)), side = Math.random() < 0.5;
      for (let i = 0; i < n; i++) list.push({ x: side ? 80 + i * 22 : W - 80 - i * 22, tx: side ? 520 + i * 60 : W - 520 - i * 60, delay: i * 7 });
    }
    if (Math.random() < bombP) list.push({ bomb: true, delay: Math.floor(Math.random() * 20) });
    if (lv > 0.5 && Math.random() < bombP * 0.4) list.push({ bomb: true, delay: 10 + Math.floor(Math.random() * 20) });
    if (Math.random() < 0.05) list.push({ gold: true, delay: 15 });
    for (const o of list) S.queue.push({ at: S.t + (o.delay || 0), o });
    S.next = rush ? 34 + Math.floor(Math.random() * 22) : Math.round(90 - lv * 44 + Math.random() * 22);
  }

  // ---------- חיתוך ----------
  function newBlade() { return { pts: [], down: true, n: 0, last: -99, cx: 0, cy: 0 }; }
  function onPtr(g, type, p) {   // המטפל האמיתי בעכבר ובמגע (גם הבוט עובר דרכו)
    const S = g.s;
    if (!S || S.ending) return;
    if (type === 'down') {
      if (p.kind === 'mouse' && p.button) return;
      const old = S.blades.get(p.id);
      if (old) { endCombo(g, old); old.down = false; S.fading.push(old); }
      const b = newBlade(); b.pts.push({ x: p.x, y: p.y, t: S.t });
      S.blades.set(p.id, b);
    } else if (type === 'move') {
      const b = S.blades.get(p.id);
      if (!b || !b.down) return;
      const x = Math.max(0, Math.min(W, p.x)), y = Math.max(0, Math.min(H, p.y));
      const last = b.pts[b.pts.length - 1];
      if (last && Math.hypot(x - last.x, y - last.y) < 3) return;
      if (last) S.segs.push({ x0: last.x, y0: last.y, x1: x, y1: y, b });
      b.pts.push({ x, y, t: S.t });
      if (b.pts.length > 30) b.pts.shift();
    } else if (type === 'up') {
      const b = S.blades.get(p.id);
      if (b) { b.down = false; S.blades.delete(p.id); S.fading.push(b); }
    }
  }
  function endCombo(g, b) {
    if (b.n >= 3) {
      const S = g.s, bonus = b.n;
      g.score += bonus;
      g.float(b.cx, b.cy - 40, g.t('combo'), { color: '#ffd84d', size: 34, life: 70, speed: 0.7 });
      g.float(b.cx, b.cy, '×' + b.n + '  +' + bonus, { color: '#ffffff', size: 26, life: 70, speed: 0.7 });
      g.sfx('record'); g.flash('#fff3b0', 0.12);
      S.combos++;
    }
    b.n = 0;
  }
  function slice(g, it, sg) {
    const S = g.s, F = it.F;
    it.cut = true;
    const ang = Math.atan2(sg.y1 - sg.y0, sg.x1 - sg.x0);
    for (const s of [0, 1]) {
      const rot = ang + s * Math.PI, dx = Math.sin(rot), dy = -Math.cos(rot);
      S.halves.push({ F, x: it.x + dx * 3, y: it.y + dy * 3, vx: it.vx * 0.6 + dx * 2.3 + Math.cos(ang) * 0.9, vy: Math.min(it.vy, 2) * 0.5 + dy * 2.3 - 1.2, rot, vr: (s ? 1 : -1) * (0.03 + Math.random() * 0.05), body: it.rot - rot });
    }
    if (S.halves.length > 40) S.halves.splice(0, S.halves.length - 40);
    S.slashes.push({ x0: it.x - Math.cos(ang) * F.r * 1.4, y0: it.y - Math.sin(ang) * F.r * 1.4, x1: it.x + Math.cos(ang) * F.r * 1.4, y1: it.y + Math.sin(ang) * F.r * 1.4, t: 9 });
    g.burst(it.x, it.y, { n: 22, color: [F.juice, shade(F.juice, -0.2), F.flesh], speed: 4.5, life: 34, size: 6, gravity: 0.2 });
    S.splats.push({ x: it.x + (Math.random() - 0.5) * 20, y: it.y + (Math.random() - 0.5) * 20, r: F.r * (0.7 + Math.random() * 0.4), col: F.juice, a: 1, seed: Math.random() * TAU });
    if (S.splats.length > 18) S.splats.shift();
    const pts = it.gold ? 5 : 1;
    g.score += pts;
    S.sliced++;
    g.float(it.x, it.y - F.r - 6, '+' + pts, { color: it.gold ? '#ffd84d' : '#ffffff', size: it.gold ? 30 : 22 });
    g.sfx('splash'); g.noise({ filter: 'highpass', f: 5000, f2: 1800, dur: 0.07, vol: 0.12 });
    if (it.gold) g.sfx('coin');
    const b = sg.b;
    b.n = (S.t - b.last <= 14) ? b.n + 1 : 1;
    b.last = S.t; b.cx = it.x; b.cy = it.y;
  }
  function hitBomb(g, it) {
    const S = g.s;
    it.cut = true;
    g.burst(it.x, it.y, { n: 60, color: ['#ffffff', '#ffd84d', '#ff7a3a', '#555'], speed: 7, life: 50, gravity: 0.05 });
    g.shake(18); g.flash('#ffffff', 0.85); g.sfx('boom');
    if (g.mode === 'rush') {
      const lost = Math.min(10, g.score);
      g.score -= lost;
      g.float(it.x, it.y - 30, '-' + lost, { color: '#ff5a6a', size: 34, life: 70 });
      S.bombHits++;
      return;
    }
    S.ending = 80; S.endWhy = 'bomb'; S.boomX = it.x; S.boomY = it.y;
  }

  // ---------- בוט לבדיקות: מתכנן החלקה ישרה דרך פרי בלי לעבור ליד פצצה, ומחליק דרך onPointer ----------
  function botPlay(g) {
    const S = g.s;
    const B = S.bot || (S.bot = { pts: null, i: 0, cool: 0 });
    const P = (x, y) => ({ x, y, id: 777, kind: 'mouse', button: 0, primary: true, down: true });
    if (B.pts) {
      if (B.i < B.pts.length) {
        const [x, y] = B.pts[B.i];
        if (B.i > 0) {   // כמו אדם: מרים את האצבע אם פצצה עומדת לחצות את החלק הבא של ההחלקה
          const [px, py] = B.pts[B.i - 1];
          for (const bm of S.items) if (bm.bomb && !bm.cut) {
            const nx = bm.x + bm.vx, ny = bm.y + bm.vy + GR;
            if (segDist(bm.x, bm.y, px, py, x, y) < BOMB_R + 12 || segDist(nx, ny, px, py, x, y) < BOMB_R + 12) { onPtr(g, 'up', P(px, py)); B.pts = null; B.cool = 3; return; }
          }
        }
        onPtr(g, B.i === 0 ? 'down' : 'move', P(x, y)); B.i++;
      }
      else { const [x, y] = B.pts[B.pts.length - 1]; onPtr(g, 'up', P(x, y)); B.pts = null; B.cool = 4; }
      return;
    }
    if (B.cool > 0) { B.cool--; return; }
    const lead = 3.5;
    const fut = (o, f) => [o.x + o.vx * f, o.y + o.vy * f + 0.5 * GR * f * f];
    const targets = S.items.filter(o => !o.cut && !o.bomb && o.y < H - 10 && o.y > -10);
    if (!targets.length) return;
    targets.sort((a, b) => (b.vy > 0 ? b.y + 400 : b.y) - (a.vy > 0 ? a.y + 400 : a.y));
    const [px, py] = fut(targets[0], lead);
    let best = null, bestN = 0;
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 12, dx = Math.cos(a), dy = Math.sin(a);
      const x0 = px - dx * 110, y0 = py - dy * 110, x1 = px + dx * 110, y1 = py + dy * 110;
      let safe = true;
      for (const bm of S.items) if (bm.bomb && !bm.cut) for (let f = 0; f <= 8 && safe; f++) { const [bx, by] = fut(bm, f); if (segDist(bx, by, x0, y0, x1, y1) < BOMB_R + 40) safe = false; }
      if (!safe) continue;
      let n = 0;
      for (const o of targets) { const [ox, oy] = fut(o, lead); if (segDist(ox, oy, x0, y0, x1, y1) < o.F.r * 0.75) n++; }
      if (n > bestN) { bestN = n; best = [x0, y0, x1, y1]; }
    }
    if (!best) return;
    B.pts = [];
    for (let i = 0; i <= 6; i++) B.pts.push([best[0] + (best[2] - best[0]) * i / 6, best[1] + (best[3] - best[1]) * i / 6]);
    B.i = 0;
  }

  function hud(g) {
    const S = g.s, b = g.getBest();
    const items = [[g.t('score'), g.score], [g.t('best'), b === null ? '—' : Math.max(b, g.score)]];
    if (g.mode === 'rush') items.push([g.t('time'), Math.max(0, Math.ceil(RUSH - S.t / 60))]);
    g.hud(items);
  }

  GK.register('fruit-slice', {
    w: W, h: H, bg: '#3a2410', accent: '#ffcf4d',
    modes: [{ id: 'classic', label: 'mClassic' }, { id: 'rush', label: 'mRush' }],
    text: {
      he: { title: 'חותכים פירות', help: ['החזק את כפתור העכבר והחלק כדי לחתוך פירות', 'אל תחתוך פצצות!', 'חתוך כמה פירות בהחלקה אחת — קומבו!', 'קלאסי: 3 פירות שנופלים בלי חיתוך — המשחק נגמר', 'מרוץ: כמה שיותר פירות ב-60 שניות'], helpTouch: ['החלק עם האצבע כדי לחתוך פירות', 'אל תחתוך פצצות!', 'חתוך כמה פירות בהחלקה אחת — קומבו!', 'קלאסי: 3 פספוסים והמשחק נגמר. מרוץ: 60 שניות'], mClassic: 'קלאסי', mRush: 'מרוץ 60 שניות', combo: 'קומבו!', sliced: 'חתכת {n} פירות', bombHit: 'חתכת פצצה!', timeUp: 'נגמר הזמן!' },
      en: { title: 'Fruit Slice', help: ['Hold the mouse button and swipe to slice fruit', "Don't slice the bombs!", 'Slice several fruits in one swipe for a combo!', 'Classic: let 3 fruits fall and the game is over', 'Rush: slice as many as you can in 60 seconds'], helpTouch: ['Swipe with your finger to slice fruit', "Don't slice the bombs!", 'Slice several fruits in one swipe for a combo!', 'Classic: 3 misses and it is over. Rush: 60 seconds'], mClassic: 'Classic', mRush: '60-second rush', combo: 'Combo!', sliced: 'You sliced {n} fruits', bombHit: 'You hit a bomb!', timeUp: "Time's up!" },
      ar: { title: 'تقطيع الفواكه', help: ['اضغط زر الفأرة واسحب لتقطيع الفواكه', 'لا تقطع القنابل!', 'قطّع عدة فواكه بسحبة واحدة — كومبو!', 'الكلاسيكي: إذا سقطت 3 فواكه دون تقطيع تنتهي اللعبة', 'السباق: قطّع أكبر عدد في 60 ثانية'], helpTouch: ['اسحب بإصبعك لتقطيع الفواكه', 'لا تقطع القنابل!', 'قطّع عدة فواكه بسحبة واحدة — كومبو!', 'الكلاسيكي: 3 أخطاء وتنتهي. السباق: 60 ثانية'], mClassic: 'كلاسيكي', mRush: 'سباق 60 ثانية', combo: 'كومبو!', sliced: 'قطّعت {n} فاكهة', bombHit: 'قطعت قنبلة!', timeUp: 'انتهى الوقت!' },
      es: { title: 'Corta frutas', help: ['Mantén pulsado el ratón y desliza para cortar fruta', '¡No cortes las bombas!', '¡Corta varias frutas de un tajo para hacer combo!', 'Clásico: si caen 3 frutas sin cortar, se acaba', 'Contrarreloj: corta todas las que puedas en 60 segundos'], helpTouch: ['Desliza el dedo para cortar fruta', '¡No cortes las bombas!', '¡Corta varias frutas de un tajo para hacer combo!', 'Clásico: 3 fallos y se acaba. Contrarreloj: 60 segundos'], mClassic: 'Clásico', mRush: 'Contrarreloj 60 s', combo: '¡Combo!', sliced: 'Cortaste {n} frutas', bombHit: '¡Cortaste una bomba!', timeUp: '¡Se acabó el tiempo!' },
      fr: { title: 'Tranche-fruits', help: ['Maintiens le bouton de la souris et glisse pour trancher', 'Ne tranche pas les bombes !', "Tranche plusieurs fruits d'un coup pour un combo !", 'Classique : 3 fruits ratés et la partie est finie', 'Course : tranches-en le plus possible en 60 secondes'], helpTouch: ['Glisse ton doigt pour trancher les fruits', 'Ne tranche pas les bombes !', "Tranche plusieurs fruits d'un coup pour un combo !", 'Classique : 3 ratés et c’est fini. Course : 60 secondes'], mClassic: 'Classique', mRush: 'Course de 60 s', combo: 'Combo !', sliced: 'Tu as tranché {n} fruits', bombHit: 'Tu as touché une bombe !', timeUp: 'Temps écoulé !' },
      pt: { title: 'Corta frutas', help: ['Segure o botão do mouse e deslize para cortar frutas', 'Não corte as bombas!', 'Corte várias frutas num só golpe para fazer combo!', 'Clássico: se caírem 3 frutas sem cortar, acabou', 'Corrida: corte o máximo que puder em 60 segundos'], helpTouch: ['Deslize o dedo para cortar frutas', 'Não corte as bombas!', 'Corte várias frutas num só golpe para fazer combo!', 'Clássico: 3 erros e acabou. Corrida: 60 segundos'], mClassic: 'Clássico', mRush: 'Corrida de 60 s', combo: 'Combo!', sliced: 'Você cortou {n} frutas', bombHit: 'Você cortou uma bomba!', timeUp: 'O tempo acabou!' },
      ru: { title: 'Режем фрукты', help: ['Зажми кнопку мыши и проведи, чтобы резать фрукты', 'Не режь бомбы!', 'Разрежь несколько фруктов одним взмахом — комбо!', 'Классика: упустишь 3 фрукта — игра окончена', 'Гонка: разрежь как можно больше за 60 секунд'], helpTouch: ['Проведи пальцем, чтобы резать фрукты', 'Не режь бомбы!', 'Разрежь несколько фруктов одним взмахом — комбо!', 'Классика: 3 промаха — конец. Гонка: 60 секунд'], mClassic: 'Классика', mRush: 'Гонка 60 секунд', combo: 'Комбо!', sliced: 'Разрезано фруктов: {n}', bombHit: 'Ты задел бомбу!', timeUp: 'Время вышло!' },
      de: { title: 'Obst schneiden', help: ['Halte die Maustaste gedrückt und wische, um Obst zu schneiden', 'Schneide keine Bomben!', 'Mehrere Früchte mit einem Wisch geben eine Combo!', 'Klassisch: Fallen 3 Früchte ungeschnitten, ist es vorbei', 'Rausch: Schneide so viele wie möglich in 60 Sekunden'], helpTouch: ['Wische mit dem Finger, um Obst zu schneiden', 'Schneide keine Bomben!', 'Mehrere Früchte mit einem Wisch geben eine Combo!', 'Klassisch: 3 Fehler und vorbei. Rausch: 60 Sekunden'], mClassic: 'Klassisch', mRush: '60-Sekunden-Rausch', combo: 'Combo!', sliced: 'Du hast {n} Früchte geschnitten', bombHit: 'Du hast eine Bombe erwischt!', timeUp: 'Die Zeit ist um!' },
    },

    init(g) {
      g.s = { t: 0, items: [], halves: [], splats: [], slashes: [], blades: new Map(), fading: [], segs: [], queue: [], next: 25, misses: 0, missFx: [], sliced: 0, combos: 0, bombHits: 0, ending: 0, endWhy: '', bot: null };
      g.canvas.style.cursor = g.demo ? '' : 'crosshair';
      if (g.demo) {   // פירות תלויים באוויר מאחורי התפריט
        const S = g.s;
        [[150, 170, 3], [300, 380, 0], [480, 140, 1], [660, 330, 6], [820, 190, 8], [560, 470, 4]].forEach(([x, y, i]) => S.items.push({ x, y, vx: 0, vy: 0, rot: x * 0.01, vr: 0.006 * (i % 2 ? 1 : -1), cut: false, bomb: false, F: FRUITS[i], gold: false }));
        S.items.push({ x: 380, y: 250, vx: 0, vy: 0, rot: 0.3, vr: 0, cut: false, bomb: true, F: null });
        for (const [x, y, i] of [[200, 420, 1], [700, 120, 3], [420, 520, 0]]) S.splats.push({ x, y, r: 36, col: FRUITS[i].juice, a: 0.8, seed: i });
      }
    },

    idle(g) {
      const S = g.s;
      S.t++;
      if (g.demo) for (const it of S.items) { it.rot += it.vr; it.y += Math.sin(S.t * 0.03 + it.x) * 0.15; }
      for (const h of S.halves) { h.vy += GR * 1.6; h.x += h.vx; h.y += h.vy; h.rot += h.vr; }
    },

    step(g) {
      const S = g.s, rush = g.mode === 'rush';
      S.t++;
      // ----- סוף הסיבוב (פצצה / פספוסים) -----
      if (S.ending > 0) {
        for (const h of S.halves) { h.vy += GR * 1.6; h.x += h.vx; h.y += h.vy; h.rot += h.vr; }
        if (--S.ending === 0) {
          g.canvas.style.cursor = '';
          const o = { score: g.score, text: g.t('sliced', { n: S.sliced }) };
          if (S.endWhy === 'bomb') o.title = g.t('bombHit');
          if (S.endWhy === 'time') o.title = g.t('timeUp');
          g.end(o);
        }
        return;
      }
      if (rush && S.t >= RUSH * 60) { S.ending = 40; S.endWhy = 'time'; g.sfx('whoosh'); return; }
      // ----- זריקות -----
      if (--S.next <= 0) planThrow(g);
      for (let i = S.queue.length - 1; i >= 0; i--) if (S.queue[i].at <= S.t) { throwItem(g, S.queue[i].o); S.queue.splice(i, 1); }
      for (const it of S.items) { it.vy += GR; it.x += it.vx; it.y += it.vy; it.rot += it.vr; }
      // ----- חיתוכים -----
      for (const sg of S.segs) {
        for (const it of S.items) {
          if (it.cut) continue;
          const rad = it.bomb ? BOMB_R * 0.85 : it.F.r * 0.95;
          if (segDist(it.x, it.y, sg.x0, sg.y0, sg.x1, sg.y1) < rad) {
            if (it.bomb) { hitBomb(g, it); if (S.ending) break; }
            else slice(g, it, sg);
          }
        }
        if (S.ending) break;
      }
      S.segs.length = 0;
      if (S.ending) return;
      // ----- פספוסים -----
      for (const it of S.items) {
        if (it.cut || it.vy <= 0 || it.y < H + 50) continue;
        it.cut = true;
        if (it.bomb || it.gold || rush) continue;
        S.misses++;
        S.missFx.push({ x: Math.max(40, Math.min(W - 40, it.x)), t: 50 });
        g.sfx('error'); g.shake(4);
        if (S.misses >= 3) { S.ending = 60; S.endWhy = 'miss'; g.sfx('lose'); }
      }
      compact(S.items, it => !it.cut && it.y < H + 120);
      for (const h of S.halves) { h.vy += GR * 1.6; h.x += h.vx; h.y += h.vy; h.rot += h.vr; }
      compact(S.halves, h => h.y < H + 80);
      for (const s of S.slashes) s.t--;
      compact(S.slashes, s => s.t > 0);
      for (const s of S.splats) s.a -= 0.0035;
      compact(S.splats, s => s.a > 0);
      for (const m of S.missFx) m.t--;
      compact(S.missFx, m => m.t > 0);
      // ----- שובלים וקומבו -----
      for (const b of S.blades.values()) {
        while (b.pts.length > 1 && S.t - b.pts[0].t > 7) b.pts.shift();
        if (b.n && S.t - b.last > 14) endCombo(g, b);
      }
      for (const b of S.fading) { if (b.n) endCombo(g, b); while (b.pts.length && S.t - b.pts[0].t > 7) b.pts.shift(); }
      compact(S.fading, b => b.pts.length > 0);
      hud(g);
    },

    bot: botPlay,
    onPointer: onPtr,

    draw(g, ctx) {
      const S = g.s, t = S.t / 60;
      ctx.drawImage(boardFor(g), 0, 0, W, H);
      for (const s of S.splats) drawSplat(ctx, s);
      for (const h of S.halves) drawHalf(ctx, h);
      for (const it of S.items) {
        if (it.bomb) drawBomb(ctx, it.x, it.y, it.rot, t);
        else drawFruit(ctx, it.F, it.x, it.y, it.rot, 1);
      }
      for (const s of S.slashes) {
        ctx.globalAlpha = s.t / 9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // שובל הלהב
      const blade = b => {
        const p = b.pts, n = p.length;
        if (n < 2) return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < n; i++) {
            const f = i / (n - 1), age = Math.max(0, 1 - (S.t - p[i].t) / 8);
            ctx.globalAlpha = (pass ? 0.95 : 0.35) * age;
            ctx.strokeStyle = pass ? '#ffffff' : (b.n >= 3 ? '#ffd84d' : '#7fe0ff');
            ctx.lineWidth = (pass ? 5 : 15) * (0.25 + 0.75 * f);
            ctx.beginPath(); ctx.moveTo(p[i - 1].x, p[i - 1].y); ctx.lineTo(p[i].x, p[i].y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      };
      for (const b of S.blades.values()) blade(b);
      for (const b of S.fading) blade(b);
      // פספוסים (קלאסי): שלושה איקסים בפינה
      if (g.mode !== 'rush') {
        for (let i = 0; i < 3; i++) {
          const x = W - 40 - (2 - i) * 46, y = 38, on = i < S.misses;
          const pop = on && S.missFx.length && i === S.misses - 1 ? 1 + S.missFx[S.missFx.length - 1].t / 50 * 0.6 : 1;
          ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
          ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 11; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(13, 13); ctx.moveTo(13, -13); ctx.lineTo(-13, 13); ctx.stroke();
          ctx.strokeStyle = on ? '#ff3b4f' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(13, 13); ctx.moveTo(13, -13); ctx.lineTo(-13, 13); ctx.stroke();
          ctx.restore();
        }
        for (const m of S.missFx) {   // איקס אדום איפה שהפרי נפל
          ctx.globalAlpha = m.t / 50; ctx.strokeStyle = '#ff3b4f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(m.x - 14, H - 44); ctx.lineTo(m.x + 14, H - 16); ctx.moveTo(m.x + 14, H - 44); ctx.lineTo(m.x - 14, H - 16); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (!g.demo) {   // מרוץ: פס זמן ומספרים גדולים בסוף
        const left = Math.max(0, RUSH - S.t / 60), f = left / RUSH;
        g.rr(ctx, 20, 14, W - 40, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
        g.rr(ctx, 20, 14, (W - 40) * f, 10, 5); ctx.fillStyle = left < 10 ? '#ff5a6a' : '#ffcf4d'; ctx.fill();
        if (left > 0 && left <= 5) {
          const s = left - Math.floor(left);
          g.text(ctx, String(Math.ceil(left)), W / 2, 90, { size: 60 + s * 30, color: '#ffffff', alpha: 0.4 + s * 0.6, stroke: 'rgba(0,0,0,.5)', strokeW: 8 });
        }
      }
      if (S.ending && S.endWhy === 'bomb') {   // הבזק הפיצוץ
        const k = S.ending / 80;
        const gr = ctx.createRadialGradient(S.boomX, S.boomY, 0, S.boomX, S.boomY, 700 * (1 - k) + 60);
        gr.addColorStop(0, 'rgba(255,255,255,' + (0.9 * k) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
    },

    cover(ctx, w, h, k) {
      const sc = h / H;
      ctx.save(); ctx.scale(sc, sc);
      const ww = w / sc;
      paintBoard(ctx, ww, H);
      for (const [x, y, i, r] of [[220, 430, 3, 70], [700, 150, 0, 50], [520, 520, 1, 44], [860, 420, 8, 40]]) drawSplat(ctx, { x, y, r, col: FRUITS[i].juice, a: 1, seed: i * 1.3 });
      // אבטיח חתוך באמצע
      const ang = -0.35;
      ctx.save(); ctx.translate(470, 290); ctx.scale(1.7, 1.7); ctx.translate(-470, -290);
      for (const s of [0, 1]) { const rot = ang + s * Math.PI; drawHalf(ctx, { F: FRUITS[3], x: 470 + Math.sin(rot) * 16, y: 290 - Math.cos(rot) * 16, rot, body: 0.4 - rot }); }
      ctx.restore();
      const R = k.seeded(3);
      for (let i = 0; i < 40; i++) { const a = R() * TAU, d = 50 + R() * 110; ctx.fillStyle = ['#ff3b5c', '#ff4d5e', '#ffd0d6'][i % 3]; ctx.beginPath(); ctx.arc(470 + Math.cos(a) * d, 290 + Math.sin(a) * d * 0.7, 3 + R() * 6, 0, TAU); ctx.fill(); }
      // שובל הלהב
      ctx.lineCap = 'round';
      const p0 = [210, 420], p1 = [760, 160];
      for (const [col, wd, al] of [['#7fe0ff', 26, 0.35], ['#ffffff', 9, 0.95]]) {
        for (let i = 1; i <= 20; i++) {
          const f0 = (i - 1) / 20, f1 = i / 20;
          ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = wd * (0.2 + 0.8 * f1);
          ctx.beginPath(); ctx.moveTo(p0[0] + (p1[0] - p0[0]) * f0, p0[1] + (p1[1] - p0[1]) * f0); ctx.lineTo(p0[0] + (p1[0] - p0[0]) * f1, p0[1] + (p1[1] - p0[1]) * f1); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      drawFruit(ctx, FRUITS[1], 160, 170, 0.4, 1.5);
      drawFruit(ctx, FRUITS[0], 790, 330, -0.2, 1.5);
      drawFruit(ctx, FRUITS[8], 320, 110, 0.3, 1.4);
      drawFruit(ctx, FRUITS[4], 650, 470, 0.5, 1.4);
      drawFruit(ctx, FRUITS[5], 900, 140, 0.1, 1.3);
      drawBomb(ctx, 1010, 330, 0.25, 0.1);
      ctx.restore();
    },
  });
  GK.games['fruit-slice']._t = { FRUITS, segDist, GR, BOMB_R };
})();
