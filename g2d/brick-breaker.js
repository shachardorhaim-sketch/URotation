// ============================================================
//  שובר לבנים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מחבט וכדור שוברים קירות של לבנים ב-30 שלבים מעוצבים (תמונות ודוגמאות).
//  לבנים של 1–3 פגיעות, לבני פלדה שלא נשברות, שדרוגים נופלים, כוכבים לפי חיים שאבדו.
// ============================================================
(function () {
  const W = 800, H = 600, TAU = Math.PI * 2;
  const WALL = 14, GX = 36, GY = 58, BW = 56, BH = 26, COLS = 13;
  const PAD_Y = 548, PAD_H = 16, PAD_W = 118, R = 8;
  const MAXANG = 1.08;            // הזווית הכי חדה מהמחבט (כ-62°)
  const MINVY = 0.32;             // מהירות אנכית מינימלית (חלק מהמהירות) — הכדור לא נתקע בלולאה אופקית
  const COL = { r: '#ff4d5e', o: '#ff9a3d', y: '#ffd84d', g: '#4cd964', l: '#b5f24d', c: '#45d6e8', b: '#4f8cff', p: '#a46bff', k: '#ff7ac8', w: '#eef2f8', n: '#b9783f', d: '#46557a', s: '#ffc9a0' };
  const PUPS = {
    fire: { col: '#ff7a2f', dark: '#a83a10', dur: 8 * 60 },
    multi: { col: '#45d6e8', dark: '#127a8a', dur: 0 },
    wide: { col: '#4cd964', dark: '#1d7a33', dur: 15 * 60 },
    sticky: { col: '#c38bff', dark: '#5b2aa8', dur: 15 * 60 },
  };
  const THEMES = [['#1b2350', '#0c1028', '#2a3a7a'], ['#2a1846', '#100a22', '#4a2a7a'], ['#123a3a', '#081a1c', '#1f5a5a'], ['#3a1a2a', '#180a12', '#6a2a48'], ['#1a2e1a', '#0a140a', '#2f5a2f'], ['#33281a', '#140f08', '#6a4f2a']];
  // 30 שלבים: 13 עמודות. אות קטנה = לבנה של פגיעה אחת, אות גדולה = 2 פגיעות, * = זהב (3), # = פלדה
  const LEVELS = [
    ['.............', '.rrrrrrrrrrr.', '.ooooooooooo.', '.yyyyyyyyyyy.'],
    ['......w......', '.....yyy.....', '....ooooo....', '...rrrrrrr...', '..kkkkkkkkk..', '.ppppppppppp.'],
    ['..rrr...rrr..', '.rkkrr.rrrrr.', '.rkrrrrrrrrr.', '.rrrrrrrrrrr.', '..rrrrrrrrr..', '...rrrrrrr...', '....rrrrr....', '.....rrr.....', '......r......'],
    ['bbbbbbbbbbbbb', '.............', 'CCCCCCCCCCCCC', '.............', 'ggggggggggggg', '.............', 'YYYYYYYYYYYYY'],
    ['....yyyyy....', '..yyyyyyyyy..', '.yyyyyyyyyyy.', '.yyDDyyyDDyy.', 'yyyDDyyyDDyyy', 'yyyyyyyyyyyyy', 'yyDyyyyyyyDyy', '.yyDyyyyyDyy.', '.yyyDDDDDyyy.', '..yyyyyyyyy..', '....yyyyy....'],
    ['.............', '.ggggggggggg.', '.gGGGGGGGGGg.', '.ggggggggggg.', '.............', '....#####....'],
    ['...l.....l...', '....l...l....', '...lllllll...', '..lllllllll..', '.llwwlllwwll.', '.llwdlllwdll.', '.lllllllllll.', '..lllDDDlll..', '...lllllll...', '...l.l.l.l...'],
    ['....rrrrr....', '..rrwwrrrrr..', '.rrwwwrrrwwr.', '.rrrwrrrwwwr.', 'rrrrrrrrrwrrr', 'rwwrrrrrrrrrr', '.rrrrrrrrrrr.', '....sssss....', '....sdsds....', '....sssss....'],
    ['......r......', '.....rrr.....', '....rrrrr....', '...rrrrrrr...', '..rrrrrrrrr..', '..wwwwwwwww..', '..wbbwwwbbw..', '..wbbwwwbbw..', '..wwwwNwwww..', '..wwwwNwwww..'],
    ['r.r.r.r.r.r.r', '.b.b.b.b.b.b.', 'R.R.R.R.R.R.R', '.B.B.B.B.B.B.', 'r.r.r.r.r.r.r', '.b.b.b.b.b.b.'],
    ['......g......', '.....ggg.....', '....ggLgg....', '...gggggLg...', '....gLggg....', '...ggggggg...', '..ggLgggLgg..', '...ggggggg...', '.....nnn.....', '.....nnn.....', '.....NNN.....'],
    ['ccccccccccccc', 'bbbbbbbbbbbbb', 'ppppppppppppp', '.............', '.............', '##..#####..##'],
    ['.............', '....oooooo..o', '..ooooooooooo', '.owdoooooooo.', '.ooooooooooo.', '..ooooooooooo', '....oooooo..o'],
    ['......w......', '.....wrw.....', '.....www.....', '....wwbww....', '....wbbbw....', '....wwbww....', '....wwwww....', '...rwwwwwr...', '..rrwwwwwrr..', '..rr.ooo.rr..', '......y......'],
    ['....kk.kk....', '...kkkkkkk...', '....kkykk....', '...kkyyykk...', '....kkykk....', '...kkkkkkk...', '....kk.kk....', '......g......', '...gg.g......', '....ggg.gg...', '......ggg....'],
    ['......y......', '..y...y...y..', '...y.ooo.y...', '....ooooo....', 'yy.ooOOOoo.yy', '...ooOOOoo...', '....ooooo....', '...y.ooo.y...', '..y...y...y..', '......y......'],
    ['rrrrrrrrrrrrr', '#.#.#.#.#.#.#', 'ooooooooooooo', '.#.#.#.#.#.#.', 'yyyyyyyyyyyyy', '#.#.#.#.#.#.#'],
    ['.o.........o.', '.oo.......oo.', '.ooooooooooo.', '.oowwooowwoo.', '.oowdooowdoo.', '.oooookooooo.', '.ooooKKKoooo.', '..ooooooooo..', '...ooooooo...'],
    ['......c......', '.....ccc.....', '....ccCcc....', '...ccCCCcc...', '..ccCC*CCcc..', '...ccCCCcc...', '....ccCcc....', '.....ccc.....', '......c......'],
    ['ppppppppppppp', 'PPPPPPPPPPPPP', 'kkkkkkkkkkkkk', '.............', '.##..###..##.'],
    ['..rrrrrrrrr..', '.rooooooooor.', 'roygggggggyor', 'roygbbbbbgyor', 'roygb...bgyor', 'roygb...bgyor'],
    ['....wwwww....', '...wwwwwww...', '..wwwwwwwww..', '..wwBwwwBww..', '..wwBwwwBww..', '..wwwwwwwww..', '..wwwkkkwww..', '..wwwwwwwww..', '..w.ww.ww.w..'],
    ['y.....y.....y', '..#.......#..', '.bbb.....bbb.', '.bBb..*..bBb.', '.bbb.....bbb.', '..#.......#..', 'y.....y.....y'],
    ['*************', '.............', 'CCCCCCCCCCCCC', 'ccccccccccccc', '.............', '....#...#....'],
    ['r...........r', 'or.........ro', 'yor.......roy', 'gyor.....royg', 'cgyor...roygc', 'bcgyor.roygcb'],
    ['#.#.#...#.#.#', 'wwwww...wwwww', 'wWWWw...wWWWw', 'wwwwwwwwwwwww', 'wWWWWWWWWWWWw', 'wWnnnnnnnnnWw', 'wWn.......nWw'],
    ['k#k#k#k#k#k#k', '.............', '*.*.*.*.*.*.*', '.............', 'K#K#K#K#K#K#K'],
    ['.....ggg.....', '...gGgGgGg...', '..gGgGgGgGg..', '.gGgGgGgGgGg.', '.ggggggggggg.', '..s.......s..', '.ss.......ss.'],
    ['*#*#*#*#*#*#*', '.............', 'BBBBBBBBBBBBB', 'bbbbbbbbbbbbb', '.............', '###.......###'],
    ['*.....*.....*', '**...***...**', '*************', '*kkkkk*kkkkk*', '*kPPPkkkPPPk*', '*kkkkk*kkkkk*', '*************'],
  ];

  // כל לבנה שאפשר לשבור נגישה לכדור: הצפה מהחלל שמסביב דרך תאים ריקים או שבירים (לא דרך פלדה)
  function reach(rows) {
    const nr = rows.length, seen = new Set(), st = [];
    const open = (c, r) => c < 0 || c >= COLS || r < 0 || r >= nr || rows[r][c] !== '#';
    for (let c = -1; c <= COLS; c++) { st.push([c, -1], [c, nr]); }
    for (let r = 0; r < nr; r++) st.push([-1, r], [COLS, r]);
    while (st.length) {
      const [c, r] = st.pop(), k = c + ',' + r;
      if (seen.has(k) || c < -1 || c > COLS || r < -1 || r > nr || !open(c, r)) continue;
      seen.add(k);
      st.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    const stuck = [];
    rows.forEach((row, r) => { for (let c = 0; c < COLS; c++) if (row[c] !== '.' && row[c] !== '#' && !seen.has(c + ',' + r)) stuck.push(c + ',' + r); });
    return stuck;
  }

  const compact = (arr, keep) => { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; };
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shade(hex, amt) { return GK.U.shade(hex, amt); }

  // ---------- ציור ----------
  function drawBrick(ctx, x, y, w, h, br) {
    const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
    if (br.steel) {
      const gr = ctx.createLinearGradient(0, iy, 0, iy + ih);
      gr.addColorStop(0, '#f0f3f8'); gr.addColorStop(0.45, '#a7b2c2'); gr.addColorStop(1, '#5b6576');
      rr(ctx, ix, iy, iw, ih, 4); ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = '#3c4452'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); rr(ctx, ix, iy, iw, ih, 4); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(ix + iw * 0.25, iy); ctx.lineTo(ix + iw * 0.42, iy); ctx.lineTo(ix + iw * 0.3, iy + ih); ctx.lineTo(ix + iw * 0.13, iy + ih); ctx.fill();
      ctx.restore();
      for (const [bx, by] of [[ix + 5, iy + 5], [ix + iw - 5, iy + 5], [ix + 5, iy + ih - 5], [ix + iw - 5, iy + ih - 5]]) {
        ctx.fillStyle = '#4a5363'; ctx.beginPath(); ctx.arc(bx, by, 2.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8edf5'; ctx.beginPath(); ctx.arc(bx - 0.6, by - 0.6, 0.9, 0, TAU); ctx.fill();
      }
      return;
    }
    const gold = br.max === 3;
    const base = gold ? '#ffcf3d' : COL[br.ch.toLowerCase()];
    const gr = ctx.createLinearGradient(0, iy, 0, iy + ih);
    if (gold) { gr.addColorStop(0, '#fff6c4'); gr.addColorStop(0.4, '#ffd23f'); gr.addColorStop(1, '#b07a08'); }
    else { gr.addColorStop(0, shade(base, 0.45)); gr.addColorStop(0.5, base); gr.addColorStop(1, shade(base, -0.35)); }
    rr(ctx, ix, iy, iw, ih, 5); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = br.max >= 2 ? 2.5 : 1.2; ctx.strokeStyle = shade(base, -0.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.38)'; rr(ctx, ix + 4, iy + 2.5, iw - 8, ih * 0.28, 3); ctx.fill();
    if (br.max === 2) {   // שתי נקודות = צריך שתי פגיעות
      ctx.fillStyle = shade(base, -0.45);
      for (const dx of [-7, 7]) { ctx.beginPath(); ctx.arc(ix + iw / 2 + dx, iy + ih * 0.62, 2.6, 0, TAU); ctx.fill(); }
    }
    if (gold) {
      ctx.fillStyle = '#8a5a00';
      for (const dx of [-12, 0, 12]) { ctx.beginPath(); ctx.arc(ix + iw / 2 + dx, iy + ih * 0.62, 2.3, 0, TAU); ctx.fill(); }
    }
    if (br.hp < br.max) {   // סדקים
      ctx.strokeStyle = 'rgba(30,20,20,.65)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      const s = (br.c * 7 + br.r * 13) % 5;
      ctx.beginPath(); ctx.moveTo(ix + 10 + s * 3, iy + 1); ctx.lineTo(ix + 16 + s * 2, iy + ih * 0.45); ctx.lineTo(ix + 11 + s * 3, iy + ih * 0.7); ctx.lineTo(ix + 18 + s * 2, iy + ih - 1); ctx.stroke();
      if (br.max - br.hp >= 2) { ctx.beginPath(); ctx.moveTo(ix + iw - 12 - s, iy + 1); ctx.lineTo(ix + iw - 20 - s, iy + ih * 0.5); ctx.lineTo(ix + iw - 14 - s, iy + ih - 1); ctx.stroke(); }
    }
  }
  function drawPaddle(ctx, x, w, t, o) {
    const l = x - w / 2, y = PAD_Y - PAD_H / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, l + 4, y + 8, w, PAD_H, PAD_H / 2); ctx.fill();
    const gr = ctx.createLinearGradient(0, y, 0, y + PAD_H);
    gr.addColorStop(0, '#f6f9ff'); gr.addColorStop(0.45, '#9dbbe8'); gr.addColorStop(1, '#3a5a96');
    rr(ctx, l, y, w, PAD_H, PAD_H / 2); ctx.fillStyle = gr; ctx.fill();
    for (const sg of [-1, 1]) {   // קצוות זוהרים
      const ex = x + sg * (w / 2 - 9);
      const eg = ctx.createLinearGradient(0, y, 0, y + PAD_H);
      eg.addColorStop(0, '#d8fbff'); eg.addColorStop(0.5, o.fire ? '#ff9a3d' : '#3fd6ff'); eg.addColorStop(1, o.fire ? '#a8400f' : '#0f6f9a');
      rr(ctx, ex - 9, y, 18, PAD_H, PAD_H / 2); ctx.fillStyle = eg; ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, l + 12, y + 2.5, w - 24, 3.5, 2); ctx.fill();
    if (o.sticky) {   // ריר ירוק דביק
      ctx.fillStyle = 'rgba(150,255,120,.85)';
      rr(ctx, l + 8, y - 3, w - 16, 6, 3); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const dx = l + 18 + (w - 36) * (i / 4), dl = 4 + 3 * Math.sin(t * 3 + i * 1.7);
        ctx.beginPath(); ctx.ellipse(dx, y + PAD_H + dl * 0.5, 2.6, dl, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawBall(ctx, b, t, fire) {
    for (let i = 0; i < b.trail.length; i++) {   // שובל
      const p = b.trail[(b.ti + i) % b.trail.length];
      if (!p) continue;
      const a = (i + 1) / b.trail.length;
      ctx.globalAlpha = a * (fire ? 0.5 : 0.28);
      ctx.fillStyle = fire ? (i % 2 ? '#ffd84d' : '#ff7a2f') : '#bfe6ff';
      ctx.beginPath(); ctx.arc(p[0], p[1], R * (0.4 + a * 0.55), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (fire) {
      ctx.fillStyle = 'rgba(255,140,40,.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.9, 0, TAU); ctx.fill();
    }
    const gr = ctx.createRadialGradient(b.x - R * 0.35, b.y - R * 0.4, R * 0.1, b.x, b.y, R);
    if (fire) { gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, '#ffbd3d'); gr.addColorStop(1, '#e0501a'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#dbe7f5'); gr.addColorStop(1, '#8796ad'); }
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.fill();
  }
  function drawPup(ctx, k, x, y, t) {
    const P = PUPS[k], w = 46, h = 22;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 8);
    ctx.fillStyle = P.col; rr(ctx, -w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 14); ctx.fill();
    ctx.globalAlpha = 1;
    const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, shade(P.col, 0.55)); gr.addColorStop(0.5, P.col); gr.addColorStop(1, P.dark);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    drawPupIcon(ctx, k, 0, 0, 8);
    ctx.restore();
  }
  function drawPupIcon(ctx, k, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (k === 'fire') { ctx.beginPath(); ctx.moveTo(0, -s * 1.1); ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.9, s * 0.9, 0, s * 0.95); ctx.bezierCurveTo(-s * 0.9, s * 0.9, -s * 0.8, 0, -s * 0.2, -s * 0.4); ctx.quadraticCurveTo(-s * 0.1, s * 0.1, 0, -s * 1.1); ctx.fill(); }
    else if (k === 'multi') { for (const [dx, dy] of [[-s * 0.75, s * 0.35], [s * 0.75, s * 0.35], [0, -s * 0.45]]) { ctx.beginPath(); ctx.arc(dx, dy, s * 0.45, 0, TAU); ctx.fill(); } }
    else if (k === 'wide') { ctx.beginPath(); ctx.moveTo(-s * 1.3, 0); ctx.lineTo(s * 1.3, 0); ctx.moveTo(-s * 1.3, 0); ctx.lineTo(-s * 0.7, -s * 0.55); ctx.moveTo(-s * 1.3, 0); ctx.lineTo(-s * 0.7, s * 0.55); ctx.moveTo(s * 1.3, 0); ctx.lineTo(s * 0.7, -s * 0.55); ctx.moveTo(s * 1.3, 0); ctx.lineTo(s * 0.7, s * 0.55); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.55, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s, s * 0.75); ctx.lineTo(s, s * 0.75); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.75); ctx.lineTo(-s * 0.4, s * 1.1); ctx.moveTo(s * 0.3, s * 0.75); ctx.lineTo(s * 0.3, s * 1.25); ctx.stroke(); }
    ctx.restore();
  }
  function paintBg(ctx, w, h, th) {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, th[0]); gr.addColorStop(1, th[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = th[2]; ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
    const s = 34;
    for (let y = 0, row = 0; y < h + s; y += s * 0.866, row++) for (let x = (row % 2) * s / 2; x < w + s; x += s) {   // משושים
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * s * 0.5, py = y + Math.sin(a) * s * 0.5; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(w / 2, h * 0.4, h * 0.2, w / 2, h * 0.5, h * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }
  function paintWalls(ctx, w, h) {
    const side = (x, wd) => {
      const gr = ctx.createLinearGradient(x, 0, x + wd, 0);
      gr.addColorStop(0, '#5d6a80'); gr.addColorStop(0.5, '#c5d0e0'); gr.addColorStop(1, '#4a5568');
      ctx.fillStyle = gr; ctx.fillRect(x, 0, wd, h);
    };
    side(0, WALL); side(w - WALL, WALL);
    const tg = ctx.createLinearGradient(0, 0, 0, WALL);
    tg.addColorStop(0, '#5d6a80'); tg.addColorStop(0.5, '#c5d0e0'); tg.addColorStop(1, '#4a5568');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, w, WALL);
    ctx.fillStyle = '#39424f';
    for (let y = 40; y < h; y += 70) for (const x of [WALL / 2, w - WALL / 2]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }
    for (let x = 40; x < w; x += 90) { ctx.beginPath(); ctx.arc(x, WALL / 2, 2.4, 0, TAU); ctx.fill(); }
  }
  // שכבת רקע + לבנים מצוירת מראש, ומצוירת מחדש רק כשלבנה משתנה
  const layers = new WeakMap();
  function layerFor(g) {
    let L = layers.get(g);
    const k = Math.max(1, Math.round((g.canvas.width / W) * 4) / 4);
    if (!L || L.k !== k) {
      const bg = document.createElement('canvas'), br = document.createElement('canvas');
      for (const c of [bg, br]) { c.width = Math.round(W * k); c.height = Math.round(H * k); }
      L = { k, bg, br, theme: -1, sig: -1 };
      layers.set(g, L);
    }
    return L;
  }
  function brickRect(c, r) { return { x: GX + c * BW, y: GY + r * BH }; }

  // ---------- מצב ----------
  function load(g, lv) {
    const rows = LEVELS[(lv - 1) % LEVELS.length];
    const grid = [];
    let left = 0;
    rows.forEach((row, r) => {
      const line = [];
      for (let c = 0; c < COLS; c++) {
        const ch = row[c];
        if (ch === '.') { line.push(null); continue; }
        const steel = ch === '#', max = steel ? 99 : ch === '*' ? 3 : ch === ch.toUpperCase() ? 2 : 1;
        line.push({ ch, c, r, steel, max, hp: max, flash: 0 });
        if (!steel) left++;
      }
      grid.push(line);
    });
    return { grid, left, total: left };
  }
  function newBall(x, y, stuck) { return { x, y, vx: 0, vy: 0, stuck, off: 0, trail: new Array(7).fill(null), ti: 0, dead: false, stuckT: 0 }; }
  function speed(g) { const S = g.s; return Math.min(8.8, 5.3 + g.level * 0.075 + Math.min(1.1, S.padHits * 0.025)); }
  function setVel(b, sp, ang) { b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; }
  function fixVel(b, sp) {   // שומר על המהירות ועל מהירות אנכית מינימלית
    let vx = b.vx, vy = b.vy;
    const m = Math.hypot(vx, vy) || 1;
    vx = vx / m * sp; vy = vy / m * sp;
    if (Math.abs(vy) < sp * MINVY) { vy = (vy < 0 ? -1 : 1) * sp * MINVY; vx = (vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - vy * vy); }
    b.vx = vx; b.vy = vy;
  }
  function launch(g) {   // לחיצה / רווח / חץ למעלה — משגר כדורים שתקועים על המחבט
    const S = g.s;
    let any = false;
    for (const b of S.balls) if (b.stuck) {
      b.stuck = false; any = true;
      const off = Math.max(-1, Math.min(1, b.off / (S.pad.w / 2)));
      setVel(b, speed(g), (Math.abs(off) < 0.05 ? (Math.random() - 0.5) * 0.5 : off * MAXANG * 0.8));
    }
    if (any) g.sfx('jump', { p: 0.8 });
  }
  function setAim(g, x) { g.s.aim = x; }

  function dropPup(g, x, y) {
    const S = g.s;
    if (S.pups.length >= 3 || S.t - S.lastDrop < 70 || Math.random() > 0.12) return;
    S.lastDrop = S.t;
    const r = Math.random();
    const k = r < 0.27 ? 'fire' : r < 0.55 ? 'multi' : r < 0.8 ? 'wide' : 'sticky';
    S.pups.push({ k, x, y, t: 0 });
  }
  function catchPup(g, p) {
    const S = g.s, P = PUPS[p.k];
    if (p.k === 'multi') {
      const add = [];
      for (const b of S.balls) {
        if (b.dead || S.balls.length + add.length >= 12) continue;
        if (b.stuck) { launch(g); }
        for (const da of [-0.45, 0.45]) {
          const nb = newBall(b.x, b.y, false);
          const ang = Math.atan2(b.vx, -b.vy) + da;
          setVel(nb, speed(g), ang); fixVel(nb, speed(g));
          add.push(nb);
        }
      }
      S.balls.push(...add);
    } else S.fx[p.k] = P.dur;
    g.score += 50;
    g.burst(p.x, PAD_Y - 10, { n: 18, color: [P.col, '#ffffff'], speed: 3, life: 28 });
    g.float(p.x, PAD_Y - 40, g.t(p.k), { color: P.col, size: 24, life: 70 });
    g.sfx('power');
  }

  function hitBrick(g, br, ball) {
    const S = g.s;
    const { x, y } = brickRect(br.c, br.r);
    const cx = x + BW / 2, cy = y + BH / 2;
    br.flash = 7;
    S.dirty = true;
    if (br.steel) {
      g.burst(ball.x, ball.y, { n: 5, color: ['#ffffff', '#c5d0e0'], speed: 2.2, life: 14 });
      g.sfx('tick', { p: 0.6 });
      return;
    }
    br.hp -= S.fx.fire > 0 ? br.hp : 1;
    S.bounces = 0; S.dry = 0;
    if (br.hp > 0) { g.sfx('tick', { p: 1.1 }); g.burst(cx, cy, { n: 4, color: shade(COL[br.ch.toLowerCase()] || '#ffcf3d', 0.3), speed: 1.6, life: 14 }); return; }
    S.grid[br.r][br.c] = null;
    S.left--;
    S.chain = Math.min(20, S.chain + 1);
    const pts = (br.max === 3 ? 150 : br.max === 2 ? 80 : 40) + S.chain * 10;
    g.score += pts;
    const col = br.max === 3 ? '#ffcf3d' : COL[br.ch.toLowerCase()];
    g.burst(cx, cy, { n: 14, color: [col, shade(col, 0.5), '#ffffff'], speed: 3.2, life: 30, size: 5, shape: 'square', gravity: 0.15 });
    g.float(cx, cy - 6, '+' + pts, { color: '#ffffff', size: 16, life: 40 });
    g.sfx('break', { p: 0.85 + S.chain * 0.03 });
    S.pieces.push({ x, y, col, t: 0, vy: -1.5, vx: (Math.random() - 0.5) * 2, rot: 0, vr: (Math.random() - 0.5) * 0.2 });
    if (S.pieces.length > 30) S.pieces.shift();
    dropPup(g, cx, cy);
  }
  // התנגשות כדור–לבנים: הלבנה עם החפיפה הגדולה ביותר, היפוך על הציר עם החפיפה הקטנה
  function brickCollide(g, b) {
    const S = g.s;
    const c0 = Math.floor((b.x - R - GX) / BW), c1 = Math.floor((b.x + R - GX) / BW);
    const r0 = Math.floor((b.y - R - GY) / BH), r1 = Math.floor((b.y + R - GY) / BH);
    let best = null, bo = 0, bAxis = 0;
    for (let r = Math.max(0, r0); r <= Math.min(S.grid.length - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
        const br = S.grid[r][c];
        if (!br) continue;
        const x = GX + c * BW, y = GY + r * BH;
        const nx = Math.max(x, Math.min(b.x, x + BW)), ny = Math.max(y, Math.min(b.y, y + BH));
        const dx = b.x - nx, dy = b.y - ny;
        if (dx * dx + dy * dy >= R * R) continue;
        const ox = Math.min(b.x + R - x, x + BW - (b.x - R)), oy = Math.min(b.y + R - y, y + BH - (b.y - R));
        const o = Math.min(ox, oy);
        if (!best || o > bo) { best = br; bo = o; bAxis = ox < oy ? 0 : 1; }
      }
    }
    if (!best) return;
    const fire = S.fx.fire > 0 && !best.steel;
    if (!fire) {
      const x = GX + best.c * BW, y = GY + best.r * BH;
      if (bAxis === 0) {
        if (b.x < x + BW / 2) { b.x = Math.min(b.x, x - R); b.vx = -Math.abs(b.vx); } else { b.x = Math.max(b.x, x + BW + R); b.vx = Math.abs(b.vx); }
      } else {
        if (b.y < y + BH / 2) { b.y = Math.min(b.y, y - R); b.vy = -Math.abs(b.vy); } else { b.y = Math.max(b.y, y + BH + R); b.vy = Math.abs(b.vy); }
      }
      if (best.steel) loopGuard(g, b);
    }
    hitBrick(g, best, b);
  }
  // אחרי הרבה פגיעות בקירות ובפלדה בלי להגיע למחבט או ללבנה — מטים את הכדור קצת כלפי מטה, אל השחקן
  function loopGuard(g, b) {
    const S = g.s;
    if (++S.bounces > 20) {
      const sp = Math.hypot(b.vx, b.vy);
      let a = Math.atan2(b.vy, b.vx);
      const d = Math.atan2(Math.sin(Math.PI / 2 - a), Math.cos(Math.PI / 2 - a));
      a += Math.sign(d) * Math.min(Math.abs(d), 0.2 + Math.random() * 0.25);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    }
  }
  function stepBall(g, b) {
    const S = g.s, pad = S.pad, sp = speed(g);
    b.trail[b.ti] = [b.x, b.y]; b.ti = (b.ti + 1) % b.trail.length;
    if (b.stuck) {
      b.x = pad.x + b.off; b.y = PAD_Y - PAD_H / 2 - R - 0.5;
      if (++b.stuckT > 180) launch(g);   // אין רגעים מתים: משגר לבד אחרי 3 שניות
      return;
    }
    fixVel(b, sp);
    const n = Math.ceil(sp / 3.5);
    for (let i = 0; i < n; i++) {
      b.x += b.vx / n; b.y += b.vy / n;
      if (b.x < WALL + R) { b.x = WALL + R; b.vx = Math.abs(b.vx); loopGuard(g, b); g.sfx('tick', { p: 0.5 }); }
      if (b.x > W - WALL - R) { b.x = W - WALL - R; b.vx = -Math.abs(b.vx); loopGuard(g, b); g.sfx('tick', { p: 0.5 }); }
      if (b.y < WALL + R) { b.y = WALL + R; b.vy = Math.abs(b.vy); loopGuard(g, b); g.sfx('tick', { p: 0.5 }); }
      brickCollide(g, b);
      const top = PAD_Y - PAD_H / 2, hw = pad.w / 2;
      if (b.vy > 0 && b.y + R >= top && b.y + R <= top + 12 + sp && b.x >= pad.x - hw - R * 0.7 && b.x <= pad.x + hw + R * 0.7) {
        const off = Math.max(-1, Math.min(1, (b.x - pad.x) / (hw + R * 0.5)));
        b.y = top - R;
        S.padHits++; S.chain = 0; S.bounces = 0;
        if (S.fx.sticky > 0) { b.stuck = true; b.off = b.x - pad.x; b.stuckT = 120; b.vx = b.vy = 0; g.sfx('place'); return; }
        // אחרי 4 חבטות בלי לשבור כלום (למשל הלוך-חזור מול פלדה) — הטיה קטנה, שלא ייתקעו בלולאה
        const nudge = S.dry >= 4 ? (Math.random() - 0.5) * 0.22 : 0;
        S.dry++;
        setVel(b, speed(g), off * MAXANG + nudge);
        fixVel(b, speed(g));
        g.sfx('bounce', { p: 1 + Math.abs(off) * 0.3 });
        g.burst(b.x, top, { n: 5, color: ['#bfe6ff', '#ffffff'], speed: 2, life: 14, dir: -Math.PI / 2, spread: 1.6 });
        pad.squash = 1;
      }
      fixVel(b, sp);
    }
    if (b.y > H + 30) b.dead = true;
  }

  function loseLife(g) {
    const S = g.s;
    S.lives--;
    g.shake(10); g.flash('#ff3b5c', 0.25); g.sfx('lose');
    S.fx.fire = S.fx.wide = S.fx.sticky = 0;
    S.pups.length = 0;
    if (S.lives <= 0) { S.over = 70; return; }
    const b = newBall(S.pad.x, PAD_Y - 20, true);
    S.balls = [b];
    g.msg('♥'.repeat(S.lives), 900, '#ff7b95');
  }

  // ---------- בוט לבדיקות: מנחש איפה הכדור ינחת, ומכוון אותו אל לבנה — דרך אותו "יעד" של העכבר ----------
  function landX(b) {
    const top = PAD_Y - PAD_H / 2 - R;
    const t = (top - b.y) / b.vy;
    const lo = WALL + R, span = W - 2 * WALL - 2 * R;
    let x = b.x + b.vx * t - lo;
    x = ((x % (2 * span)) + 2 * span) % (2 * span);
    return lo + (x > span ? 2 * span - x : x);
  }
  // עוקב אחרי המסלול של כדור שיוצא מהמחבט בזווית ang: קירות ופלדה מחזירים אותו (כמו במשחק).
  // מחזיר את אורך הדרך עד לבנה שאפשר לשבור, או 0 אם הוא חוזר למחבט בלי לפגוע באף לבנה כזאת.
  function trace(S, x, y, ang) {
    let dx = Math.sin(ang) * 4, dy = -Math.cos(ang) * 4;
    for (let n = 1; n < 900; n++) {
      x += dx; y += dy;
      if (x < WALL + R) { x = WALL + R; dx = Math.abs(dx); }
      if (x > W - WALL - R) { x = W - WALL - R; dx = -Math.abs(dx); }
      if (y < WALL + R) { y = WALL + R; dy = Math.abs(dy); }
      if (y > PAD_Y - PAD_H / 2 - R) return 0;
      const c0 = Math.max(0, Math.floor((x - R - GX) / BW)), c1 = Math.min(COLS - 1, Math.floor((x + R - GX) / BW));
      const r0 = Math.max(0, Math.floor((y - R - GY) / BH)), r1 = Math.min(S.grid.length - 1, Math.floor((y + R - GY) / BH));
      let done = false;
      for (let r = r0; r <= r1 && !done; r++) for (let c = c0; c <= c1 && !done; c++) {
        const br = S.grid[r][c];
        if (!br) continue;
        const bx = GX + c * BW, by = GY + r * BH;
        const nx = Math.max(bx, Math.min(x, bx + BW)), ny = Math.max(by, Math.min(y, by + BH));
        if ((x - nx) * (x - nx) + (y - ny) * (y - ny) >= R * R) continue;
        if (!br.steel) return n;
        const ox = Math.min(x + R - bx, bx + BW - (x - R)), oy = Math.min(y + R - by, by + BH - (y - R));
        if (ox < oy) dx = x < bx + BW / 2 ? -Math.abs(dx) : Math.abs(dx);
        else dy = y < by + BH / 2 ? -Math.abs(dy) : Math.abs(dy);
        done = true;
      }
    }
    return 0;
  }
  function botPlay(g) {
    const S = g.s, pad = S.pad;
    if (S.balls.some(b => b.stuck) && S.t % 15 === 0) launch(g);
    let ball = null, bt = 1e9;
    for (const b of S.balls) if (!b.stuck && !b.dead && b.vy > 0) { const t = (PAD_Y - b.y) / b.vy; if (t < bt) { bt = t; ball = b; } }
    if (!ball) {
      const p = S.pups.find(q => q.y > 300);
      if (p) setAim(g, p.x);
      else if (S.balls[0]) setAim(g, S.balls[0].x);
      return;
    }
    const lx = landX(ball), hw = pad.w / 2, reachK = hw + R * 0.5;
    const P = S.botPlan;
    if (!P || P.hits !== S.padHits || Math.abs(P.lx - lx) > 6 || S.t - P.t > 20) {
      const opts = [];
      for (let i = -10; i <= 10; i++) {   // 21 זוויות אפשריות; רק כאלה שהמחבט יכול להגיע אליהן
        const off = i * 0.085, px = lx - off * reachK;
        if (px < WALL + hw - 1 || px > W - WALL - hw + 1) continue;
        const len = trace(S, lx, PAD_Y - PAD_H / 2 - R, off * MAXANG);
        if (len) opts.push({ off, len });
      }
      opts.sort((a, b) => a.len - b.len);
      const pick = opts.length ? opts[Math.floor(Math.random() * Math.min(opts.length, 4))] : { off: (Math.random() - 0.5) * 1.4 };
      S.botPlan = { hits: S.padHits, lx, t: S.t, off: pick.off, ok: opts.length > 0 };
    }
    setAim(g, lx - S.botPlan.off * reachK);
  }

  GK.register('brick-breaker', {
    w: W, h: H, bg: '#0c1028', accent: '#7fd8ff',
    levels: LEVELS.length,
    touch: null,
    text: {
      he: { title: 'שובר לבנים', help: ['הזז את המחבט עם העכבר או עם החצים', 'לחץ או הקש רווח כדי לשגר את הכדור', 'שבור את כל הלבנים. לבני פלדה לא נשברות', 'איפה שהכדור פוגע במחבט — לשם הוא עף', 'אסוף כדור אש, עוד כדורים, מחבט רחב ומחבט דביק'], helpTouch: ['גרור את האצבע כדי להזיז את המחבט', 'גע במסך כדי לשגר את הכדור', 'שבור את כל הלבנים. לבני פלדה לא נשברות', 'אסוף כדור אש, עוד כדורים, מחבט רחב ומחבט דביק'], launch: 'לחץ או הקש רווח כדי לשגר', launchTouch: 'גע במסך כדי לשגר', fire: 'כדור אש!', multi: 'עוד כדורים!', wide: 'מחבט רחב!', sticky: 'מחבט דביק!', left: 'נשארו {n} לבנים' },
      en: { title: 'Brick Breaker', help: ['Move the paddle with the mouse or the arrows', 'Click or press Space to launch the ball', 'Break every brick. Steel bricks never break', 'Where the ball hits the paddle decides where it flies', 'Catch fireballs, extra balls, a wide paddle and a sticky paddle'], helpTouch: ['Drag your finger to move the paddle', 'Tap the screen to launch the ball', 'Break every brick. Steel bricks never break', 'Catch fireballs, extra balls, a wide paddle and a sticky paddle'], launch: 'Click or press Space to launch', launchTouch: 'Tap to launch', fire: 'Fireball!', multi: 'Multi-ball!', wide: 'Wide paddle!', sticky: 'Sticky paddle!', left: '{n} bricks left' },
      ar: { title: 'كاسر الطوب', help: ['حرّك المضرب بالفأرة أو بالأسهم', 'انقر أو اضغط المسافة لإطلاق الكرة', 'اكسر كل الطوب. الطوب الفولاذي لا ينكسر', 'مكان اصطدام الكرة بالمضرب يحدد اتجاهها', 'اجمع كرة النار والكرات الإضافية والمضرب العريض واللاصق'], helpTouch: ['اسحب إصبعك لتحريك المضرب', 'المس الشاشة لإطلاق الكرة', 'اكسر كل الطوب. الطوب الفولاذي لا ينكسر', 'اجمع كرة النار والكرات الإضافية والمضرب العريض واللاصق'], launch: 'انقر أو اضغط المسافة للإطلاق', launchTouch: 'المس الشاشة للإطلاق', fire: 'كرة نار!', multi: 'كرات إضافية!', wide: 'مضرب عريض!', sticky: 'مضرب لاصق!', left: 'بقي {n} من الطوب' },
      es: { title: 'Rompeladrillos', help: ['Mueve la paleta con el ratón o las flechas', 'Haz clic o pulsa Espacio para lanzar la bola', 'Rompe todos los ladrillos. Los de acero no se rompen', 'Donde la bola toca la paleta decide hacia dónde vuela', 'Atrapa bola de fuego, más bolas, paleta ancha y paleta pegajosa'], helpTouch: ['Arrastra el dedo para mover la paleta', 'Toca la pantalla para lanzar la bola', 'Rompe todos los ladrillos. Los de acero no se rompen', 'Atrapa bola de fuego, más bolas, paleta ancha y paleta pegajosa'], launch: 'Haz clic o pulsa Espacio para lanzar', launchTouch: 'Toca para lanzar', fire: '¡Bola de fuego!', multi: '¡Multibola!', wide: '¡Paleta ancha!', sticky: '¡Paleta pegajosa!', left: 'Quedan {n} ladrillos' },
      fr: { title: 'Casse-briques', help: ['Déplace la raquette avec la souris ou les flèches', 'Clique ou appuie sur Espace pour lancer la balle', 'Casse toutes les briques. Celles en acier sont incassables', "L'endroit où la balle touche la raquette décide où elle part", 'Attrape boule de feu, balles en plus, raquette large et collante'], helpTouch: ['Fais glisser ton doigt pour déplacer la raquette', "Touche l'écran pour lancer la balle", 'Casse toutes les briques. Celles en acier sont incassables', 'Attrape boule de feu, balles en plus, raquette large et collante'], launch: 'Clique ou appuie sur Espace pour lancer', launchTouch: 'Touche pour lancer', fire: 'Boule de feu !', multi: 'Multi-balles !', wide: 'Raquette large !', sticky: 'Raquette collante !', left: 'Encore {n} briques' },
      pt: { title: 'Quebra-tijolos', help: ['Mova a raquete com o mouse ou as setas', 'Clique ou aperte Espaço para lançar a bola', 'Quebre todos os tijolos. Os de aço não quebram', 'Onde a bola bate na raquete decide para onde ela vai', 'Pegue bola de fogo, mais bolas, raquete larga e raquete grudenta'], helpTouch: ['Arraste o dedo para mover a raquete', 'Toque na tela para lançar a bola', 'Quebre todos os tijolos. Os de aço não quebram', 'Pegue bola de fogo, mais bolas, raquete larga e raquete grudenta'], launch: 'Clique ou aperte Espaço para lançar', launchTouch: 'Toque para lançar', fire: 'Bola de fogo!', multi: 'Multibola!', wide: 'Raquete larga!', sticky: 'Raquete grudenta!', left: 'Faltam {n} tijolos' },
      ru: { title: 'Разбивай кирпичи', help: ['Двигай платформу мышью или стрелками', 'Щёлкни или нажми Пробел, чтобы запустить мяч', 'Разбей все кирпичи. Стальные не разбиваются', 'Куда мяч попадёт на платформе, туда он и полетит', 'Лови огненный мяч, лишние мячи, широкую и липкую платформу'], helpTouch: ['Веди пальцем, чтобы двигать платформу', 'Коснись экрана, чтобы запустить мяч', 'Разбей все кирпичи. Стальные не разбиваются', 'Лови огненный мяч, лишние мячи, широкую и липкую платформу'], launch: 'Щёлкни или нажми Пробел для запуска', launchTouch: 'Коснись экрана для запуска', fire: 'Огненный мяч!', multi: 'Мультимяч!', wide: 'Широкая платформа!', sticky: 'Липкая платформа!', left: 'Осталось кирпичей: {n}' },
      de: { title: 'Ziegelbrecher', help: ['Bewege den Schläger mit der Maus oder den Pfeilen', 'Klicke oder drücke die Leertaste, um den Ball zu starten', 'Zerbrich alle Ziegel. Stahlziegel sind unzerbrechlich', 'Wo der Ball den Schläger trifft, bestimmt seine Richtung', 'Fang Feuerball, Extrabälle, breiten und klebrigen Schläger'], helpTouch: ['Zieh den Finger, um den Schläger zu bewegen', 'Tippe auf den Bildschirm, um den Ball zu starten', 'Zerbrich alle Ziegel. Stahlziegel sind unzerbrechlich', 'Fang Feuerball, Extrabälle, breiten und klebrigen Schläger'], launch: 'Klicke oder drücke die Leertaste zum Starten', launchTouch: 'Tippe zum Starten', fire: 'Feuerball!', multi: 'Multiball!', wide: 'Breiter Schläger!', sticky: 'Klebriger Schläger!', left: 'Noch {n} Ziegel' },
    },

    init(g) {
      const lv = g.demo ? Math.max(1, g.level || 1) : g.level;
      const L = load(g, lv);
      const S = g.s = {
        grid: L.grid, left: L.left, total: L.total, lives: 3, t: 0,
        pad: { x: W / 2, vx: 0, w: PAD_W, squash: 0 }, aim: null, balls: [], pups: [], pieces: [],
        fx: { fire: 0, wide: 0, sticky: 0 }, padHits: 0, chain: 0, bounces: 0, dry: 0, lastDrop: -999, botPlan: null,
        dirty: true, done: 0, over: 0, theme: (lv - 1) % THEMES.length,
      };
      S.balls.push(newBall(W / 2, PAD_Y - 20, true));
      if (g.demo) { const b = S.balls[0]; b.stuck = false; b.x = W * 0.62; b.y = 430; setVel(b, 5, 0.5); }
      else g.msg(g.t('level') + ' ' + lv, 1100, '#7fd8ff');
    },

    idle(g) {   // בתפריט: הכדור קופץ לבד מאחורי החלון
      const S = g.s;
      if (!g.demo) return;
      S.t++;
      const b = S.balls[0];
      if (!b) return;
      b.trail[b.ti] = [b.x, b.y]; b.ti = (b.ti + 1) % b.trail.length;
      b.x += b.vx; b.y += b.vy;
      if (b.x < WALL + R || b.x > W - WALL - R) b.vx *= -1;
      if (b.y < GY + 12 * BH || b.y > PAD_Y - 20) b.vy *= -1;
      S.pad.x += (b.x - S.pad.x) * 0.08;
    },

    step(g) {
      const S = g.s, pad = S.pad;
      S.t++;
      for (const k of ['fire', 'wide', 'sticky']) if (S.fx[k] > 0) { S.fx[k]--; if (k === 'sticky' && S.fx[k] === 0) launch(g); }
      // ----- המחבט -----
      const ax = g.axis().x;
      if (ax) S.aim = null;
      if (ax) { pad.vx += (ax * 11 - pad.vx) * 0.45; pad.x += pad.vx; }
      else if (S.aim != null) { const d = S.aim - pad.x; const mv = Math.max(-26, Math.min(26, d)); pad.x += mv; pad.vx = mv; }
      else { pad.vx *= 0.7; pad.x += pad.vx; }
      const tw = S.fx.wide > 0 ? PAD_W * 1.55 : PAD_W;
      pad.w += (tw - pad.w) * 0.15;
      pad.x = Math.max(WALL + pad.w / 2, Math.min(W - WALL - pad.w / 2, pad.x));
      if (pad.squash > 0) pad.squash = Math.max(0, pad.squash - 0.1);
      if (g.hit('Space') || g.hit('ArrowUp') || g.hit('KeyW')) launch(g);
      // ----- סוף השלב / סוף המשחק -----
      if (S.done > 0) {
        if (S.done % 8 === 0) g.burst(g.rnd(80, W - 80), g.rnd(80, 360), { n: 22, color: ['#ffd84d', '#ff7ac8', '#7fd8ff', '#4cd964', '#ffffff'], speed: 4.5, life: 50 });
        if (--S.done === 0) { const stars = S.lives >= 3 ? 3 : S.lives === 2 ? 2 : 1; g.completeLevel(stars, { delay: 500 }); }
        return;
      }
      if (S.over > 0) { if (--S.over === 0) g.end({ result: 'lose', score: null, text: g.t('left', { n: S.left }) }); return; }
      // ----- כדורים -----
      for (const b of S.balls) stepBall(g, b);
      compact(S.balls, b => !b.dead);
      if (S.left <= 0) {
        S.done = 75; g.flash('#ffffff', 0.35); g.sfx('score');
        S.balls.length = 0; S.pups.length = 0;
        return;
      }
      if (!S.balls.length) loseLife(g);
      // ----- שדרוגים ושברים -----
      for (const p of S.pups) {
        p.t++; p.y += 2.3;
        if (p.y + 11 >= PAD_Y - PAD_H / 2 && p.y - 11 <= PAD_Y + PAD_H / 2 && Math.abs(p.x - pad.x) < pad.w / 2 + 23) { p.got = true; catchPup(g, p); }
      }
      compact(S.pups, p => !p.got && p.y < H + 20);
      for (const q of S.pieces) { q.t++; q.vy += 0.35; q.y += q.vy; q.x += q.vx; q.rot += q.vr; }
      compact(S.pieces, q => q.y < H + 40);
      for (const line of S.grid) for (const br of line) if (br && br.flash > 0) br.flash--;
      g.hud([[g.t('level'), g.level], [g.t('lives'), S.lives > 0 ? '♥'.repeat(S.lives) : '—', '#ff7b95'], [g.t('score'), g.score]]);
    },

    bot: botPlay,

    onKey(g, e) { if (e.code === 'Enter') launch(g); },

    onPointer(g, type, p) {
      if (type === 'move' && p.kind !== 'touch') setAim(g, p.x);
      if (type === 'move' && p.kind === 'touch' && p.down) setAim(g, p.x);
      if (type === 'down') { setAim(g, p.x); launch(g); }
    },

    draw(g, ctx) {
      const S = g.s, t = S.t / 60, pad = S.pad;
      const L = layerFor(g);
      if (L.theme !== S.theme) {
        const c = L.bg.getContext('2d');
        c.setTransform(L.k, 0, 0, L.k, 0, 0);
        paintBg(c, W, H, THEMES[S.theme]);
        paintWalls(c, W, H);
        L.theme = S.theme; S.dirty = true;
      }
      if (S.dirty || L.grid !== S.grid) {
        const c = L.br.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.br.width, L.br.height);
        c.setTransform(L.k, 0, 0, L.k, 0, 0);
        for (const line of S.grid) for (const br of line) if (br) { const { x, y } = brickRect(br.c, br.r); drawBrick(c, x, y, BW, BH, br); }
        S.dirty = false; L.grid = S.grid;
      }
      ctx.drawImage(L.bg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      for (const line of S.grid) for (const br of line) if (br) { const { x, y } = brickRect(br.c, br.r); rr(ctx, x + 5, y + 7, BW - 4, BH - 4, 5); ctx.fill(); }
      ctx.drawImage(L.br, 0, 0, W, H);
      for (const line of S.grid) for (const br of line) if (br && br.flash > 0) {   // הבזק לבן בפגיעה
        const { x, y } = brickRect(br.c, br.r);
        ctx.globalAlpha = br.flash / 7 * 0.7; ctx.fillStyle = '#ffffff';
        rr(ctx, x + 2, y + 2, BW - 4, BH - 4, 5); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const q of S.pieces) {   // הלבנה השבורה נופלת ומסתובבת
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t / 50);
        ctx.translate(q.x + BW / 2, q.y + BH / 2); ctx.rotate(q.rot); ctx.scale(0.8, 0.8);
        ctx.fillStyle = q.col; rr(ctx, -BW / 2 + 2, -BH / 2 + 2, BW - 4, BH - 4, 5); ctx.fill();
        ctx.restore();
      }
      for (const p of S.pups) drawPup(ctx, p.k, p.x, p.y, p.t / 60);
      drawPaddle(ctx, pad.x, pad.w, t, { sticky: S.fx.sticky > 0, fire: S.fx.fire > 0 });
      for (const b of S.balls) drawBall(ctx, b, t, S.fx.fire > 0);
      // רמז לשיגור
      const stuck = S.balls.find(b => b.stuck);
      if (stuck && !g.demo && S.done === 0) {
        const a = 0.55 + 0.45 * Math.sin(t * 5);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * a) + ')'; ctx.setLineDash([4, 8]); ctx.lineWidth = 2;
        const off = Math.max(-1, Math.min(1, stuck.off / (pad.w / 2))), ang = Math.abs(off) < 0.05 ? 0 : off * MAXANG * 0.8;
        ctx.beginPath(); ctx.moveTo(stuck.x, stuck.y - R - 4); ctx.lineTo(stuck.x + Math.sin(ang) * 66, stuck.y - Math.cos(ang) * 66); ctx.stroke(); ctx.setLineDash([]);
        g.text(ctx, g.t(g.touch ? 'launchTouch' : 'launch'), W / 2, 420, { size: 22, color: '#ffffff', alpha: a, stroke: 'rgba(0,0,0,.6)', strokeW: 5, maxW: W - 80 });
      }
      // שדרוגים פעילים
      let ix = 36;
      for (const k of ['fire', 'wide', 'sticky']) if (S.fx[k] > 0) {
        const f = S.fx[k] / PUPS[k].dur;
        ctx.globalAlpha = S.fx[k] < 90 && (S.t >> 3) % 2 === 0 ? 0.4 : 1;
        ctx.fillStyle = PUPS[k].col; ctx.beginPath(); ctx.arc(ix, H - 24, 13, 0, TAU); ctx.fill();
        drawPupIcon(ctx, k, ix, H - 24, 6.5);
        ctx.strokeStyle = PUPS[k].col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix, H - 24, 18, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
        ctx.globalAlpha = 1;
        ix += 44;
      }
    },

    cover(ctx, w, h, k) {
      paintBg(ctx, w, h, ['#1d2a63', '#0b0f2b', '#34489a']);
      paintWalls(ctx, w, h);
      // קיר בצבעי הקשת, והכדור הלוהט פורץ דרכו
      const bw = 66, bh = 30, gx = (w - 13 * bw) / 2, gy = 34;
      const rows = ['rrrrrrrrrrrrr', 'ooooooooooooo', 'yyyyy*y*yyyyy', 'ggggg...ggggg', 'cccc.....cccc', 'bb#b.....b#bb', 'pppp.....pppp', 'kKkkk...kkkKk'];
      rows.forEach((row, r) => { for (let c = 0; c < 13; c++) { const ch = row[c]; if (ch === '.') continue; const max = ch === '*' ? 3 : ch !== '#' && ch === ch.toUpperCase() ? 2 : 1; drawBrick(ctx, gx + c * bw, gy + r * bh, bw, bh, { ch, c, r, steel: ch === '#', max, hp: (c + r) % 5 === 0 && max > 1 ? max - 1 : max }); } });
      const R2 = k.seeded(4), cx = w / 2, cy = 300;
      const cols = ['#ffd84d', '#4cd964', '#45d6e8', '#ff9a3d'];
      for (let i = 0; i < 6; i++) {   // לבנים שעפות
        ctx.save(); ctx.translate(cx - 150 + i * 60 + R2() * 20, 190 + R2() * 60); ctx.rotate((R2() - 0.5) * 1.4); ctx.scale(0.75, 0.75);
        drawBrick(ctx, -bw / 2, -bh / 2, bw, bh, { ch: 'ygco'[i % 4], c: 0, r: 0, max: 1, hp: 1 }); ctx.restore();
      }
      for (let i = 0; i < 46; i++) { ctx.fillStyle = cols[i % 4]; const a = R2() * TAU, d = 30 + R2() * 110; const s = 3 + R2() * 5; ctx.fillRect(cx + Math.cos(a) * d, 225 + Math.sin(a) * d * 0.55, s, s); }
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
      glow.addColorStop(0, 'rgba(255,200,80,.55)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, TAU); ctx.fill();
      const ball = newBall(cx, cy, false);
      for (let i = 0; i < 7; i++) ball.trail[i] = [cx - (7 - i) * 9, cy + (7 - i) * 15];
      ctx.save(); ctx.translate(cx, cy); ctx.scale(2.1, 2.1); ctx.translate(-cx, -cy); drawBall(ctx, ball, 0, true); ctx.restore();
      ctx.save(); ctx.translate(200, 400); ctx.scale(1.4, 1.4); drawPup(ctx, 'multi', 0, 0, 0.3); ctx.restore();
      ctx.save(); ctx.translate(770, 360); ctx.scale(1.4, 1.4); drawPup(ctx, 'wide', 0, 0, 0.6); ctx.restore();
      ctx.save(); ctx.translate(0, h - 40 - PAD_Y); ctx.translate(cx - 30, PAD_Y); ctx.scale(1.5, 1.5); ctx.translate(-(cx - 30), -PAD_Y);
      drawPaddle(ctx, cx - 30, 150, 0, { sticky: false, fire: true }); ctx.restore();
    },
  });
  GK.games['brick-breaker']._t = { LEVELS, reach, COLS };
})();
