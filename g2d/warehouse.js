// ============================================================
//  המחסן — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מחסנאי קטן דוחף ארגזים אל הנקודות המסומנות (כללי סוקובאן: רק דוחפים, אף פעם לא מושכים).
//  40 שלבים. כל שלב נוצר במחולל והוכח פתיר בפותר מדויק; לכל שלב שמור מספר הצעדים הקטן ביותר
//  ופתרון שמגיע אליו (הבוט של הבדיקות משחק אותו דרך אותו תור תנועות של השחקן).
// ============================================================
(function () {
  'use strict';
  // [המפה: # קיר, . נקודה, $ ארגז, * ארגז על נקודה, @ המחסנאי, + המחסנאי על נקודה, _ בחוץ], הכי מעט צעדים, דחיפות, פתרון
  const LV = [
    ["#######|#     #|#@ $ .#|#     #|#######", 3, 2, "rRR"],
    ["#######|#     #|#.@ $ #|#######", 8, 3, "urrrdLLL"],
    ["__####|###  #|# $  #|#  @ #|# . ##|#####_", 17, 4, "lluRdrruulDrdLulD"],
    ["######|#@  .#|#    #|# $  #|#   ##|#####_", 10, 4, "ddRdrUUluR"],
    ["####___|#  #___|# $####|# $   #|#@.   #|#   .##|######_", 24, 8, "uRluurDDDldRRuruLdlluurD"],
    ["######_|#   +#_|# $$ ##|#    .#|#     #|#######", 11, 6, "llDRlldRRRU"],
    ["#######|#  @  #|# $ $ #|#     #|#..   #|#######", 14, 7, "rDrdLLuLDuulDD"],
    ["_######|## .  #|#  $$ #|#@ .###|#   #__|#####__", 25, 7, "ururDurrdLLulDlddrrUUlldR"],
    ["#######_|#.    ##|#    $@#|#    $ #|# .   ##|#######_", 15, 9, "LLLrrrdLLLuLDlU"],
    ["#####__|# . #__|#   ###|#  $  #|# @$. #|#######", 32, 12, "RUrrdLLuluurDldRdrruLLullddRRlUU"],
    ["__######|###   .#|# $    #|# @$ ###|#.  ##__|#####___", 25, 10, "luRRurrdLdLLuRllDrrrUluRR"],
    ["___#####|####   #|# $ @$ #|# ##   #|# .   .#|########", 27, 11, "urDrdLdlllluuRRRDuRurDDldLL"],
    ["__#####_|_##.  ##|##   $ #|#@  $  #|#  ##  #|# .##  #|########", 24, 9, "rururrDrddlULrruLLdLUlDD"],
    ["#######__|#.    ###|#     $ #|#.  # $ #|##  # @ #|_########", 29, 13, "ruuLLLLulDrrrddrUruLLLLdLUruL"],
    ["___####|___# +#|__##  #|__#   #|###   #|#  $  #|# $.  #|#######", 43, 13, "dddddllUlldRRuruulDrdLdlluRRurrddLUUluRdrUU"],
    ["_#####__|_#.  #__|_#  $###|##@$   #|#  #   #|#  .####|#   #___|#####___", 42, 19, "RRdrruLLLulDDlddrUUUUrurDldRdrruLLLulDDldR"],
    ["_#######|_# . $ #|## @$  #|#  # ###|# .  #__|######__", 52, 14, "urDrruLLdllddrrUdlluurRurrdLLddlluuuRRdLulDDurrrruLL"],
    ["#######__|#.   @#__|#     #__|#     ###|###  $  #|__# .$  #|__#######", 47, 16, "ddlddRUrrdLLuluurDldRdrruLLullddRUrrdLulUUruLLL"],
    ["__#######|### .$  #|# @ .$$ #|#.    # #|#####   #|____#####", 49, 14, "rrdrdrruuulLDurrdLLrrddllUlluuRDRddrruuLLruLddLLL"],
    ["####___|# @####|# $ $ #|#  $  #|###   #|__#...#|__#####", 36, 15, "DrDulldRRDrruuLLrDllluurDldRRRDuurDD"],
    ["########|#  $.  #|#.@$$  #|#.   ###|#    #__|######__", 34, 15, "uRDuRDrruLLdllddrrULLurRurrdLLLLuR"],
    ["___#####|####  .#|#   $$ #|#  $# .#|# .@  ##|##  ###_|_####___", 46, 15, "rruruulDLLDlluRRRRurDllldlddrUrrUUllDuruRdddlL"],
    ["#####__|#   #__|#.  #__|#   ###|# .$$@#|#   $.#|#######", 33, 15, "dLLUdrruLLUluurDDllddRUUddRRuLuuL"],
    ["#######_|#  .  #_|#    $##|#.#  $ #|# .  $@#|########", 31, 14, "LruLdLUluurrDLLrddrruLLdLUULulD"],
    ["######__|#  . ###|#. @$  #|##  $  #|#    $ #|# # ####|#  .#___|#####___", 31, 14, "dRluurDrrddLLrULrruLLdLDDulUrUL"],
    ["#######|#   $+#|#  $$ #|#   ###|# . #__|#.  #__|#####__", 35, 18, "LLDurrdLLDlddrUUlluuRDuRRdLLDuulDDD"],
    ["__####__|###  #__|# .$.###|# $ $. #|###    #|__#@   #|__######", 61, 19, "uuRuulDDrdrruLdlUluurDDrddllURuulDulldRRRddrruLdllUUruLdddrUU"],
    ["_____####|_#####  #|## $ $  #|#    $  #|#.    ###|#+    #__|##.   #__|_######__", 69, 27, "uurrruRDrruulDrdLLulDlluRRRdrruulDrdLLLLulDDDrrrULLLuurrrrdLLLulDDrdL"],
    ["__#######|### .   #|# $$#   #|#  $   .#|#   # + #|######  #|_____####", 60, 22, "ullLdlluRRRRuullDurrrrddLdlUlLdlluRluRdRRRRuulllDldRRRUrDuuL"],
    ["####______|#..#####__|#@     #__|#      #__|##   .$###|_#       #|_# $  #$ #|_####    #|____######", 66, 26, "rddddRRurrrrddlllUUddrrUruLLLUUrDuuLLLLrdddRdrUddrruuLLLLdlUUUUdlU"],
    ["_######__|##.  .#__|# .   ##_|#      #_|###  $$##|__### $ #|____#@  #|____#####", 67, 23, "uUUUddddrruLdlUUluurDrDLddrruLdlUUruLullddRUrrddlUruLLdlUUdrruLLruL"],
    ["######____|#@   #____|#    ###__|# . .  ###|##    $  #|_#   #$  #|_#  $.   #|_#########", 66, 24, "rrrddrdRlldldRRRUrrdLLLLuuurrDllddrrruruLLLLddrrUruLLulDLdlUddRRUU"],
    ["#####_____|#   ######|#    $ . #|#  $$  @ #|####  .  #|___### .##|_____####_", 49, 21, "ulLLLrrddlULuRlullddRRRuRDullulDldRRRRldRRluuRDrD"],
    ["___#####__|__##.  ###|###  #   #|#  $   @ #|#  $    ##|# $  #  .#|####  .  #|___#######", 50, 20, "dlllLruulDllddRRlURlluRRdRRRddllUluRRlUUdrrDurDlDR"],
    ["######___|#    ###_|#      ##|##.#    #|#  @ .  #|# $   $$#|###### .#|_____#  #|_____####", 75, 27, "rrrrDLddrUUlulldRurDrddlUUluurrDLddrUllUlllldRRRRurDrddlUUluUrrDDuLuuLLLulD"],
    ["____#####|##### @ #|# . $$  #|#  $# # #|#  $    #|###  .. #|__####. #|_____####", 62, 27, "lDDDlLrdRuuuLLDlluRRRRurrdLulDDDrDulldlUUlldRRRdRUrruullDDuulL"],
    ["___#######|___#     #|####  $$ #|#  .# $  #|#    #   #|#  .$   .#|#.  @#####|######____", 69, 29, "luRRRurrdLLLLulDrrrururuulDDuLDDRdLLLdLLrUUrdrruuuulldRurDDDurrDldLLL"],
    ["__#######|_##   ..#|_#  #  .#|##$     #|# $$    #|#@.$  ###|#######__", 66, 27, "rRUdlluRRUrruullDlDRRRRdrUUdllllddlluRdrUluRRRRdldLUdLuuRRdrUdrUlU"],
    ["#######__|#     #__|# #   ###|# .$$#  #|##$$.   #|_#    @ #|_###   .#|___###. #|_____####", 69, 25, "ullULuurDDDrddlUlURRluulDuullddRluurrrddddllURUruulDDDldRRRuRDuurDDlD"],
    ["_########|_#   #..#|##$     #|#    .  #|#+#     #|#$$$  ###|#   ###__|#   #____|#####____", 72, 29, "urrdDuulldDRRlddrUUUUruullDRdddlluuRRuRRdrUddldLLddllUURdrUUURlluRRRRdrU"],
  ];
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], LET = 'urdl';
  const TWEEN = 7;
  const KEYDIR = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;
  const stars3 = o => o + Math.floor(o * 0.1);              // 3 כוכבים: עד 10% מעל הכי טוב
  const stars2 = o => o + Math.ceil(o * 0.5) + 2;

  function parseLevel(n) {
    const [str, opt, pushes, path] = LV[n - 1];
    const rows = str.split('|'), H = rows.length, W = Math.max(...rows.map(r => r.length));
    const cell = new Uint8Array(W * H), goal = new Uint8Array(W * H), boxes = [];
    let player = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = rows[y][x] || '_', i = y * W + x;
      cell[i] = ch === '_' ? 0 : ch === '#' ? 2 : 1;
      if (ch === '.' || ch === '*' || ch === '+') goal[i] = 1;
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
    return { n, W, H, cell, goal, boxes, player, opt, pushes, path, live: liveCells(W, H, cell, goal) };
  }
  // משבצות שממנה ארגז עוד יכול להגיע לנקודה כלשהי (בלי להתחשב בארגזים אחרים). מחוץ להן — הארגז תקוע לתמיד
  function liveCells(W, H, cell, goal) {
    const live = new Uint8Array(W * H), q = [];
    for (let i = 0; i < W * H; i++) if (goal[i]) { live[i] = 1; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      for (let d = 0; d < 4; d++) {
        const s = DX[d] + DY[d] * W, y = q[h] - s, z = y - s;
        if (y < 0 || z < 0 || y >= W * H || z >= W * H || cell[y] !== 1 || cell[z] !== 1 || live[y]) continue;
        live[y] = 1; q.push(y);
      }
    }
    return live;
  }
  function frozen(L, boxes, b) {
    const W = L.W;
    for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const a = b + ox + oy * W, cs = [a, a + 1, a + W, a + W + 1];
      let ok = true, off = false;
      for (const c of cs) { const bx = boxes.includes(c); if (!(L.cell[c] === 2 || bx)) { ok = false; break; } if (bx && !L.goal[c]) off = true; }
      if (ok && off) return true;
    }
    return false;
  }
  const isStuck = (L, boxes, b) => !L.goal[b] && (!L.live[b] || frozen(L, boxes, b));

  // ----- מצב -----
  function makeState(g, L) {
    const S = {
      L, boxes: L.boxes.slice(), player: L.player, face: 2, moves: 0, pushes: 0, hist: [], queue: [],
      tw: 0, pf: L.player, mb: -1, bf: 0, bump: 0, bumpD: 0, won: false, winT: 0, t: 0, walk: 0,
      hold: null, pd: null, hoverBtn: null, press: null, pressT: 0, botI: 0, stuck: new Set(), glow: new Float32Array(L.W * L.H),
    };
    layout(g, S);
    return S;
  }
  function layout(g, S) {
    const W = g.W, H = g.H, L = S.L;
    if (W >= H) {
      const side = 170, c = Math.floor(Math.min((W - side - 60) / L.W, (H - 50) / L.H, 84));
      S.c = c; S.ox = Math.round((W - side - c * L.W) / 2 + 12); S.oy = Math.round((H - c * L.H) / 2);
      const sx = Math.round((S.ox + c * L.W + W) / 2);
      S.btns = [{ id: 'undo', x: sx - 46, y: H / 2 - 104, w: 92, h: 92, key: 'Z' }, { id: 'restart', x: sx - 46, y: H / 2 + 12, w: 92, h: 92, key: 'R' }];
    } else {
      const c = Math.floor(Math.min((W - 40) / L.W, (H - 240) / L.H, 84));
      S.c = c; S.ox = Math.round((W - c * L.W) / 2); S.oy = Math.round(30 + (H - 240 - c * L.H) / 2);
      const y = S.oy + c * L.H + 50;
      S.btns = [{ id: 'undo', x: W / 2 - 112, y, w: 92, h: 92, key: 'Z' }, { id: 'restart', x: W / 2 + 20, y, w: 92, h: 92, key: 'R' }];
    }
  }
  const cellAt = (S, x, y) => { const cx = Math.floor((x - S.ox) / S.c), cy = Math.floor((y - S.oy) / S.c); return cx >= 0 && cy >= 0 && cx < S.L.W && cy < S.L.H ? cy * S.L.W + cx : -1; };
  const btnAt = (S, x, y) => S.btns.find(b => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) || null;
  const cx = (S, i) => S.ox + (i % S.L.W + 0.5) * S.c, cy = (S, i) => S.oy + (((i / S.L.W) | 0) + 0.5) * S.c;

  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    const t3 = stars3(S.L.opt);
    if (g.H > g.W) g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves + '/' + t3]]);
    else g.hud([[g.t('level'), g.level], [g.t('moves'), S.moves], [g.t('goal'), t3]]);
  }

  // ----- תנועה: כל הקלטים (מקלדת, עכבר, מגע, בוט) נכנסים לתור, וזה מבצע אחד אחד -----
  function tryMove(g, d) {
    const S = g.s, L = S.L, s = DX[d] + DY[d] * L.W, n = S.player + s;
    S.face = d;
    if (L.cell[n] !== 1) { bump(g, d); return false; }
    const bi = S.boxes.indexOf(n);
    if (bi >= 0) {
      const n2 = n + s;
      if (L.cell[n2] !== 1 || S.boxes.includes(n2)) { bump(g, d); return false; }
      if (S.hist.length < 5000) S.hist.push({ p: S.player, boxes: S.boxes.slice(), face: S.face, moves: S.moves, pushes: S.pushes, mb: bi });
      S.boxes[bi] = n2; S.pushes++;
      S.mb = bi; S.bf = n;
      g.noise({ f: 900, f2: 300, dur: 0.12, vol: 0.09, filter: 'lowpass' });
      g.burst(cx(S, n) - DX[d] * S.c * 0.45, cy(S, n) + S.c * 0.35, { n: 5, color: ['#c9b79a', '#e6dccb'], speed: 1.2, life: 22, gravity: -0.02, size: 5 });
      if (L.goal[n2]) {
        S.glow[n2] = 1;
        g.sfx('coin', { p: 0.9 + S.boxes.filter(b => L.goal[b]).length * 0.06 });
        g.burst(cx(S, n2), cy(S, n2), { n: 16, color: ['#ffe066', '#fff7c2', '#7cf0a0'], speed: 3, life: 30, gravity: 0 });
      } else if (L.goal[n]) g.tone({ f: 420, f2: 300, dur: 0.12, type: 'triangle', vol: 0.12 });
      updateStuck(g, n2);
    } else {
      if (S.hist.length < 5000) S.hist.push({ p: S.player, boxes: S.boxes.slice(), face: S.face, moves: S.moves, pushes: S.pushes, mb: -1 });
      S.mb = -1;
      g.sfx('tick', { p: 0.7 + (S.moves % 2) * 0.12 });
    }
    S.pf = S.player; S.player = n; S.moves++; S.tw = TWEEN; S.walk++;
    hud(g);
    if (S.boxes.every(b => L.goal[b])) win(g);
    return true;
  }
  function bump(g, d) {
    const S = g.s;
    if (S.bump > 0) return;
    S.bump = 10; S.bumpD = d;
    g.tone({ f: 150, f2: 110, dur: 0.08, type: 'sine', vol: 0.16 });
  }
  function updateStuck(g, moved) {
    const S = g.s, L = S.L, before = S.stuck.size;
    S.stuck = new Set(S.boxes.filter(b => isStuck(L, S.boxes, b)));
    if (S.stuck.size > before && moved != null && S.stuck.has(moved)) {
      g.msg(g.t('stuck'), 2200, '#ffb4a8');
      g.sfx('error');
    }
  }
  function undo(g) {
    const S = g.s;
    if (S.won || !S.hist.length) { if (!S.won) g.sfx('error'); return; }
    const h = S.hist.pop();
    S.queue.length = 0;
    const cur = S.player, curBox = h.mb >= 0 ? S.boxes[h.mb] : -1;
    S.player = h.p; S.boxes = h.boxes; S.moves = h.moves; S.pushes = h.pushes; S.face = h.face;
    S.pf = cur; S.tw = TWEEN; S.mb = h.mb; S.bf = curBox;
    updateStuck(g, null);
    g.sfx('whoosh');
    hud(g);
  }
  function win(g) {
    const S = g.s, L = S.L;
    S.won = true; S.winT = 0; S.queue.length = 0;
    const stars = S.moves <= stars3(L.opt) ? 3 : S.moves <= stars2(L.opt) ? 2 : 1;
    for (const b of S.boxes) g.burst(cx(S, b), cy(S, b), { n: 14, color: ['#ffe066', '#7cf0a0', '#ffffff', '#ff9f43'], speed: 4, life: 45, gravity: 0.06 });
    if (!g.demo) g.completeLevel(stars, { text: g.t('result', { n: S.moves, p: L.opt }), delay: 700 });
  }
  // הליכה אוטומטית למשבצת שנלחצה (בלי לדחוף ארגזים בדרך)
  function walkTo(g, target) {
    const S = g.s, L = S.L;
    if (target === S.player) return;
    for (let d = 0; d < 4; d++) if (S.player + DX[d] + DY[d] * L.W === target) { S.queue = [d]; return; }
    if (L.cell[target] !== 1 || S.boxes.includes(target)) { g.sfx('error'); return; }
    const prev = new Map([[S.player, -1]]), q = [S.player];
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (let d = 0; d < 4; d++) {
        const n = c + DX[d] + DY[d] * L.W;
        if (L.cell[n] !== 1 || S.boxes.includes(n) || prev.has(n)) continue;
        prev.set(n, c); q.push(n);
        if (n === target) {
          const path = [];
          for (let k = n; k !== S.player; k = prev.get(k)) { const p = prev.get(k); path.unshift([0, 1, 2, 3].find(e => p + DX[e] + DY[e] * L.W === k)); }
          S.queue = path;
          return;
        }
      }
    }
    g.sfx('error');
  }
  function press(g, id) {
    const S = g.s;
    S.press = id; S.pressT = 8;
    if (id === 'undo') undo(g);
    else if (id === 'restart') { g.sfx('click'); g.start(g.level); }
  }

  // ----- ציור -----
  const speck = {};
  function speckles(W, H) {
    const k = W + 'x' + H;
    if (!speck[k]) { let a = (W * 31 + H) >>> 0; const R = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); speck[k] = Array.from({ length: 70 }, () => [R() * W, R() * H, 1 + R() * 2.5]); }
    return speck[k];
  }
  function drawBackdrop(g, ctx, W, H) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2c3a4a'); gr.addColorStop(1, '#1b2531');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (const [x, y, r] of speckles(W, H)) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    // פסי אזהרה בצדדים
    ctx.save();
    for (const yy of [0, H - 14]) {
      ctx.beginPath(); ctx.rect(0, yy, W, 14); ctx.clip();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(0, yy, W, 14);
      ctx.fillStyle = '#1d232b';
      for (let x = -20; x < W + 20; x += 28) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 14, yy); ctx.lineTo(x + 28, yy + 14); ctx.lineTo(x + 14, yy + 14); ctx.fill(); }
      ctx.restore(); ctx.save();
    }
    ctx.restore();
    const rg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, Math.max(W, H) * 0.7);
    rg.addColorStop(0, 'rgba(255,240,200,.07)'); rg.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  function drawFloor(g, ctx, x, y, c, i, odd) {
    ctx.fillStyle = odd ? '#c9d2d8' : '#c2ccd3';
    ctx.fillRect(x, y, c, c);
    ctx.strokeStyle = 'rgba(70,85,100,.22)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, c - 1.5, c - 1.5);
    ctx.fillStyle = 'rgba(80,95,110,.18)';
    const r = (i * 2654435761) >>> 0;
    ctx.fillRect(x + (r % 7) / 7 * c * 0.8 + c * 0.1, y + ((r >> 4) % 7) / 7 * c * 0.8 + c * 0.1, 2.5, 2.5);
  }
  function drawGoal(g, ctx, x, y, c, t, full) {
    const pulse = full ? 0 : 0.5 + 0.5 * Math.sin(t * 0.09);
    ctx.save();
    if (!full) { ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 8 + pulse * 10; }
    ctx.strokeStyle = full ? '#3fbf6f' : '#f2b705'; ctx.lineWidth = c * 0.07;
    g.circle(ctx, x, y, c * 0.3); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = full ? '#3fbf6f' : '#f2b705';
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, r1 = c * 0.4, r2 = c * 0.24;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.lineTo(x + Math.cos(a + 0.22) * r2, y + Math.sin(a + 0.22) * r2);
      ctx.lineTo(x + Math.cos(a - 0.22) * r2, y + Math.sin(a - 0.22) * r2);
      ctx.fill();
    }
    g.circle(ctx, x, y, c * 0.1); ctx.fill();
  }
  function drawWall(g, ctx, x, y, c, front) {
    const fh = front ? c * 0.26 : 0;
    // החלק העליון: לבנים
    ctx.fillStyle = '#b5523c'; ctx.fillRect(x, y, c, c - fh);
    ctx.strokeStyle = 'rgba(60,20,12,.45)'; ctx.lineWidth = 1.6;
    const rows = 3, rh = (c - fh) / rows;
    for (let r = 0; r < rows; r++) {
      const yy = y + r * rh;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + c, yy); ctx.stroke();
      const off = r % 2 ? c / 2 : c / 4;
      for (let xx = x + off; xx < x + c; xx += c / 2) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + rh); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,200,170,.18)'; ctx.fillRect(x, y, c, c * 0.06);
    if (front) {
      ctx.fillStyle = '#7d3326'; ctx.fillRect(x, y + c - fh, c, fh);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + c - fh, c, fh * 0.25);
    }
  }
  function drawCrate(g, ctx, x, y, c, onGoal, stuck, glow, t) {
    const s = c * 0.84, h = s / 2;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + c * 0.04, y + h * 0.95, h * 1.02, c * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (onGoal) { ctx.shadowColor = '#7cf0a0'; ctx.shadowBlur = 10 + glow * 18; }
    g.rr(ctx, x - h, y - h, s, s, c * 0.08);
    ctx.fillStyle = stuck ? '#b8574b' : onGoal ? '#d9b44a' : '#c98a3e'; ctx.fill();
    ctx.restore();
    const edge = stuck ? '#6e2a22' : onGoal ? '#7d6420' : '#7a4c1c', plank = stuck ? '#c96a5d' : onGoal ? '#ead07a' : '#dda05a';
    ctx.lineWidth = c * 0.07; ctx.strokeStyle = edge;
    g.rr(ctx, x - h, y - h, s, s, c * 0.08); ctx.stroke();
    const i = h * 0.72;
    ctx.fillStyle = plank;
    ctx.fillRect(x - i, y - i, i * 2, i * 0.55); ctx.fillRect(x - i, y + i * 0.45, i * 2, i * 0.55);
    ctx.strokeStyle = edge; ctx.lineWidth = c * 0.05;
    ctx.strokeRect(x - i, y - i, i * 2, i * 2);
    ctx.beginPath(); ctx.moveTo(x - i, y + i); ctx.lineTo(x + i, y - i); ctx.stroke();
    ctx.fillStyle = edge;
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.circle(ctx, x + px * h * 0.82, y + py * h * 0.82, c * 0.025); ctx.fill(); }
    if (onGoal) {
      g.circle(ctx, x + h * 0.6, y - h * 0.6, c * 0.15); ctx.fillStyle = '#2fb35f'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = c * 0.045; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + h * 0.6 - c * 0.07, y - h * 0.6); ctx.lineTo(x + h * 0.6 - c * 0.02, y - h * 0.6 + c * 0.05); ctx.lineTo(x + h * 0.6 + c * 0.07, y - h * 0.6 - c * 0.05); ctx.stroke();
    }
    if (stuck) {
      const b = 1 + Math.sin(t * 0.25) * 0.08;
      g.circle(ctx, x + h * 0.6, y - h * 0.6, c * 0.15 * b); ctx.fillStyle = '#ff4d4d'; ctx.fill();
      g.text(ctx, '!', x + h * 0.6, y - h * 0.6 + 1, { size: c * 0.22, weight: 900, color: '#fff' });
    }
  }
  function drawWorker(g, ctx, x, y, c, face, o) {
    const walk = o.walk || 0, push = o.push || 0, jump = o.jump || 0, t = o.t || 0;
    const fx = DX[face], fy = DY[face];
    const bob = Math.abs(Math.sin(walk * Math.PI)) * c * 0.05 + jump;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + c * 0.36, c * 0.28 * (1 - jump / c), c * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x + fx * push * c * 0.06, y - bob + fy * push * c * 0.04);
    // רגליים
    const step = Math.sin(walk * Math.PI) * c * 0.06;
    ctx.fillStyle = '#2b3a55';
    g.rr(ctx, -c * 0.16, c * 0.14 + step, c * 0.12, c * 0.2, c * 0.04); ctx.fill();
    g.rr(ctx, c * 0.04, c * 0.14 - step, c * 0.12, c * 0.2, c * 0.04); ctx.fill();
    ctx.fillStyle = '#3b2a1e';
    g.rr(ctx, -c * 0.18, c * 0.3 + step, c * 0.16, c * 0.07, c * 0.03); ctx.fill();
    g.rr(ctx, c * 0.02, c * 0.3 - step, c * 0.16, c * 0.07, c * 0.03); ctx.fill();
    // גוף: סרבל
    g.rr(ctx, -c * 0.22, -c * 0.06, c * 0.44, c * 0.28, c * 0.1); ctx.fillStyle = '#2f6fd6'; ctx.fill();
    ctx.fillStyle = '#ffcf3a'; ctx.fillRect(-c * 0.14, -c * 0.02, c * 0.05, c * 0.2); ctx.fillRect(c * 0.09, -c * 0.02, c * 0.05, c * 0.2);
    // ידיים (קדימה כשדוחפים)
    const armX = fx * c * (0.14 + push * 0.1), armY = fy * c * (0.08 + push * 0.06);
    ctx.fillStyle = '#f2c09b';
    g.circle(ctx, -c * 0.25 + armX * 0.6, c * 0.06 + armY, c * 0.07); ctx.fill();
    g.circle(ctx, c * 0.25 + armX * 0.6, c * 0.06 + armY, c * 0.07); ctx.fill();
    // ראש
    const hx = fx * c * 0.03, hy = -c * 0.2;
    g.circle(ctx, hx, hy, c * 0.19); ctx.fillStyle = '#f5c7a1'; ctx.fill();
    if (face !== 0) {
      const ex = fx * c * 0.06, ey = fy * c * 0.03;
      const blink = (t % 200) < 7;
      ctx.fillStyle = '#1d2433';
      for (const sx of fx ? [0] : [-1, 1]) {
        const px = hx + ex + (fx ? fx * c * 0.04 : sx * c * 0.07), py = hy + ey + c * 0.01;
        if (blink) ctx.fillRect(px - c * 0.03, py, c * 0.06, c * 0.015);
        else { g.circle(ctx, px, py, c * 0.03); ctx.fill(); }
      }
      if (face === 2) { ctx.strokeStyle = '#a0522d'; ctx.lineWidth = c * 0.025; ctx.beginPath(); ctx.arc(hx, hy + c * 0.05, c * 0.06, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,120,120,.35)';
      if (!fx) { g.circle(ctx, hx - c * 0.11, hy + c * 0.05, c * 0.035); ctx.fill(); g.circle(ctx, hx + c * 0.11, hy + c * 0.05, c * 0.035); ctx.fill(); }
    }
    // קסדה צהובה
    ctx.fillStyle = '#ffc61a';
    ctx.beginPath(); ctx.arc(hx, hy - c * 0.03, c * 0.2, Math.PI, 0); ctx.fill();
    g.rr(ctx, hx - c * 0.24 + fx * c * 0.04, hy - c * 0.05, c * 0.48, c * 0.06, c * 0.03); ctx.fill();
    ctx.fillStyle = '#ffe27a'; ctx.fillRect(hx - c * 0.025, hy - c * 0.22, c * 0.05, c * 0.16);
    ctx.restore();
  }

  function drawRoom(g, ctx, S, alpha) {
    const L = S.L, c = S.c, t = S.t;
    // צל של החדר
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#56606b';
    for (let i = 0; i < L.W * L.H; i++) if (L.cell[i]) ctx.fillRect(S.ox + (i % L.W) * c, S.oy + ((i / L.W) | 0) * c, c, c);
    ctx.restore();
    for (let i = 0; i < L.W * L.H; i++) {
      if (L.cell[i] !== 1) continue;
      const x = S.ox + (i % L.W) * c, y = S.oy + ((i / L.W) | 0) * c;
      drawFloor(g, ctx, x, y, c, i, ((i % L.W) + ((i / L.W) | 0)) % 2);
    }
    // צל רך מתחת לקירות
    for (let i = 0; i < L.W * L.H; i++) {
      if (L.cell[i] !== 1 || i < L.W || L.cell[i - L.W] !== 2) continue;
      const x = S.ox + (i % L.W) * c, y = S.oy + ((i / L.W) | 0) * c;
      const gr = ctx.createLinearGradient(0, y, 0, y + c * 0.3);
      gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(x, y, c, c * 0.3);
    }
    for (let i = 0; i < L.W * L.H; i++) if (L.goal[i]) drawGoal(g, ctx, cx(S, i), cy(S, i), c, t, S.boxes.includes(i));
    for (let i = 0; i < L.W * L.H; i++) {
      if (L.cell[i] !== 2) continue;
      const below = i + L.W < L.W * L.H ? L.cell[i + L.W] : 0;
      drawWall(g, ctx, S.ox + (i % L.W) * c, S.oy + ((i / L.W) | 0) * c, c, below !== 2);
    }
    // ארגזים ומחסנאי לפי שורות (מה שלמטה מצויר מעל)
    const p = S.tw > 0 ? g.ease.out(Math.min(1, (TWEEN - S.tw + alpha) / TWEEN)) : 1;
    const items = [];
    S.boxes.forEach((b, k) => {
      let x = cx(S, b), y = cy(S, b);
      if (k === S.mb && S.tw > 0 && S.bf >= 0) { x = g.lerp(cx(S, S.bf), x, p); y = g.lerp(cy(S, S.bf), y, p); }
      items.push({ y, f: () => drawCrate(g, ctx, x, y, c, !!L.goal[b], S.stuck.has(b), S.glow[b], t) });
    });
    let px = cx(S, S.player), py = cy(S, S.player);
    if (S.tw > 0) { px = g.lerp(cx(S, S.pf), px, p); py = g.lerp(cy(S, S.pf), py, p); }
    if (S.bump > 0) { const k = Math.sin(S.bump / 10 * Math.PI) * c * 0.08; px += DX[S.bumpD] * k; py += DY[S.bumpD] * k; }
    const jump = S.won ? Math.abs(Math.sin(S.winT * 0.16)) * c * 0.22 * Math.max(0, 1 - S.winT / 120) : 0;
    items.push({ y: py + 0.1, f: () => drawWorker(g, ctx, px, py, c, S.face, { walk: S.tw > 0 ? S.walk + p : S.walk, push: S.tw > 0 && S.mb >= 0 ? 1 : 0, jump, t }) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
  }
  function drawIcon(g, ctx, id, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.14;
    if (id === 'restart') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.36, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      const a = -Math.PI * 0.35, ax = Math.cos(a) * s * 0.36, ay = Math.sin(a) * s * 0.36;
      ctx.beginPath(); ctx.moveTo(ax + s * 0.2, ay - s * 0.02); ctx.lineTo(ax - s * 0.04, ay - s * 0.2); ctx.lineTo(ax - s * 0.03, ay + s * 0.12); ctx.closePath(); ctx.fill();
    } else if (id === 'undo') {
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.12); ctx.lineTo(s * 0.12, -s * 0.12); ctx.arc(s * 0.12, s * 0.08, s * 0.2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-s * 0.1, s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.12); ctx.lineTo(-s * 0.14, -s * 0.32); ctx.lineTo(-s * 0.14, s * 0.08); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawButton(g, ctx, S, b, dim) {
    const hot = S.hoverBtn === b.id, down = S.press === b.id && S.pressT > 0, dy = down ? 4 : 0;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.45;
    g.rr(ctx, b.x, b.y + 6, b.w, b.h, 22); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    g.rr(ctx, b.x, b.y + dy, b.w, b.h, 22);
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, hot ? '#ffe680' : '#ffd84a'); gr.addColorStop(1, hot ? '#f7b733' : '#e8a317');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#7a5208'; ctx.lineWidth = 3; ctx.stroke();
    drawIcon(g, ctx, b.id, b.x + b.w / 2, b.y + b.h / 2 + dy - (g.touch ? 0 : 6), b.w * 0.6, '#3d2a05');
    if (!g.touch) g.text(ctx, b.key, b.x + b.w / 2, b.y + b.h - 13 + dy, { size: 15, weight: 800, color: '#6b4706' });
    ctx.restore();
  }

  const T = {
    he: { title: 'המחסן', help: ['דחוף את כל הארגזים אל הנקודות הצהובות', 'חצים או WASD לזוז, או לחץ על משבצת. Z — בטל, R — מחדש', 'אפשר רק לדחוף, לא למשוך! פחות צעדים = יותר כוכבים'], helpTouch: ['דחוף את כל הארגזים אל הנקודות הצהובות', 'החלק, הקש על משבצת או השתמש בחצים. ↶ מבטל צעד', 'אפשר רק לדחוף, לא למשוך! פחות צעדים = יותר כוכבים'], goal: 'יעד', stuck: 'הארגז הזה נתקע! לחץ ↶ כדי לבטל', result: 'צעדים: {n} · הכי מעט שאפשר: {p}' },
    en: { title: 'Warehouse', help: ['Push every crate onto a yellow spot', 'Arrows or WASD to move, or click a tile. Z undo, R restart', 'You can only push, never pull! Fewer moves = more stars'], helpTouch: ['Push every crate onto a yellow spot', 'Swipe, tap a tile or use the arrows. ↶ undoes a move', 'You can only push, never pull! Fewer moves = more stars'], goal: 'Target', stuck: 'This crate is stuck! Press ↶ to undo', result: 'Moves: {n} · Fewest possible: {p}' },
    ar: { title: 'المستودع', help: ['ادفع كل الصناديق إلى البقع الصفراء', 'الأسهم أو WASD للتحرك، أو انقر على مربع. Z تراجع، R من جديد', 'يمكنك الدفع فقط، لا السحب! حركات أقل = نجوم أكثر'], helpTouch: ['ادفع كل الصناديق إلى البقع الصفراء', 'اسحب أو المس مربعاً أو استخدم الأسهم. ↶ يلغي حركة', 'يمكنك الدفع فقط، لا السحب! حركات أقل = نجوم أكثر'], goal: 'الهدف', stuck: 'هذا الصندوق عالق! اضغط ↶ للتراجع', result: 'الحركات: {n} · أقل عدد ممكن: {p}' },
    es: { title: 'El Almacén', help: ['Empuja cada caja hasta un punto amarillo', 'Flechas o WASD para moverte, o haz clic en una casilla. Z deshacer, R reiniciar', '¡Solo puedes empujar, nunca tirar! Menos movimientos = más estrellas'], helpTouch: ['Empuja cada caja hasta un punto amarillo', 'Desliza, toca una casilla o usa las flechas. ↶ deshace', '¡Solo puedes empujar, nunca tirar! Menos movimientos = más estrellas'], goal: 'Meta', stuck: '¡Esta caja se atascó! Pulsa ↶ para deshacer', result: 'Movimientos: {n} · Lo mínimo posible: {p}' },
    fr: { title: "L'Entrepôt", help: ['Pousse chaque caisse sur une case jaune', 'Flèches ou WASD pour bouger, ou clique sur une case. Z annuler, R recommencer', "On peut seulement pousser, jamais tirer ! Moins de coups = plus d'étoiles"], helpTouch: ['Pousse chaque caisse sur une case jaune', 'Glisse, touche une case ou utilise les flèches. ↶ annule', "On peut seulement pousser, jamais tirer ! Moins de coups = plus d'étoiles"], goal: 'Objectif', stuck: 'Cette caisse est coincée ! Appuie sur ↶', result: 'Coups : {n} · Le minimum possible : {p}' },
    pt: { title: 'O Armazém', help: ['Empurre cada caixa até um ponto amarelo', 'Setas ou WASD para andar, ou clique numa casa. Z desfaz, R recomeça', 'Só dá para empurrar, nunca puxar! Menos jogadas = mais estrelas'], helpTouch: ['Empurre cada caixa até um ponto amarelo', 'Deslize, toque numa casa ou use as setas. ↶ desfaz', 'Só dá para empurrar, nunca puxar! Menos jogadas = mais estrelas'], goal: 'Meta', stuck: 'Esta caixa travou! Toque em ↶ para desfazer', result: 'Jogadas: {n} · O mínimo possível: {p}' },
    ru: { title: 'Склад', help: ['Толкай каждый ящик на жёлтую метку', 'Стрелки или WASD — ходить, или нажми на клетку. Z — отмена, R — заново', 'Можно только толкать, тянуть нельзя! Меньше ходов — больше звёзд'], helpTouch: ['Толкай каждый ящик на жёлтую метку', 'Проведи пальцем, коснись клетки или жми стрелки. ↶ — отмена', 'Можно только толкать, тянуть нельзя! Меньше ходов — больше звёзд'], goal: 'Цель', stuck: 'Этот ящик застрял! Нажми ↶, чтобы отменить', result: 'Ходов: {n} · Меньше всего можно: {p}' },
    de: { title: 'Das Lager', help: ['Schiebe jede Kiste auf einen gelben Punkt', 'Pfeile oder WASD zum Gehen, oder klicke ein Feld an. Z zurück, R neu', 'Du kannst nur schieben, nie ziehen! Weniger Züge = mehr Sterne'], helpTouch: ['Schiebe jede Kiste auf einen gelben Punkt', 'Wische, tippe auf ein Feld oder nutze die Pfeile. ↶ macht rückgängig', 'Du kannst nur schieben, nie ziehen! Weniger Züge = mehr Sterne'], goal: 'Ziel', stuck: 'Diese Kiste steckt fest! Drücke ↶', result: 'Züge: {n} · Am wenigsten möglich: {p}' },
  };

  let demoL = null;
  GK.register('warehouse', {
    get w() { return portrait() ? 640 : 880; },
    get h() { return portrait() ? 900 : 640; },
    bg: '#1b2531', accent: '#ffd84a',
    levels: LV.length,
    touch: [['ArrowLeft', '◀'], ['ArrowUp', '▲'], ['ArrowDown', '▼'], ['ArrowRight', '▶']],
    text: T,

    init(g) {
      if (g.demo) {
        if (!demoL) demoL = parseLevel(21);
        g.s = makeState(g, demoL);
        return;
      }
      g.s = makeState(g, parseLevel(g.level));
      hud(g);
    },

    step(g) {
      const S = g.s;
      S.t++;
      if (S.pressT > 0) S.pressT--;
      if (S.bump > 0) S.bump--;
      for (let i = 0; i < S.glow.length; i++) if (S.glow[i] > 0) S.glow[i] = Math.max(0, S.glow[i] - 0.03);
      if (S.tw > 0) S.tw--;
      if (S.tw === 0 && !S.won) {
        if (S.queue.length) { const d = S.queue.shift(); if (!tryMove(g, d)) S.queue.length = 0; }
        else if (S.hold && g.key(S.hold.code) && S.t - S.hold.t0 > 9) tryMove(g, S.hold.d);
      }
      hud(g);
    },
    idle(g) {
      const S = g.s;
      if (!S) return;
      S.t++;
      if (S.tw > 0) S.tw--;
      if (S.won) S.winT++;
      if (S.pressT > 0) S.pressT--;
      for (let i = 0; i < S.glow.length; i++) if (S.glow[i] > 0) S.glow[i] = Math.max(0, S.glow[i] - 0.03);
    },

    // בוט לבדיקות: משחק את הפתרון השמור, צעד אחרי צעד, דרך אותו תור תנועות
    bot(g) {
      const S = g.s;
      if (S.won || S.tw > 0 || S.queue.length) return;
      if (S.botI === 0 && (S.moves > 0 || S.hist.length)) { S.botI = -1; return; }
      if (S.botI < 0 || S.botI >= S.L.path.length) return;
      S.queue.push(LET.indexOf(S.L.path[S.botI++].toLowerCase()));
    },

    onKey(g, e) {
      const S = g.s, c = e.code;
      if (S.won) return;
      const d = KEYDIR[c];
      if (d !== undefined) {
        if (e.repeat) return;
        if (S.queue.length < 2) S.queue.push(d);
        S.hold = { code: c, d, t0: S.t };
        return;
      }
      if (e.repeat) return;
      if (c === 'KeyZ' || c === 'Backspace' || c === 'KeyU') press(g, 'undo');
      else if (c === 'KeyR') press(g, 'restart');
    },
    onKeyUp(g, e) { const S = g.s; if (S.hold && S.hold.code === e.code) S.hold = null; },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        const b = btnAt(S, p.x, p.y);
        S.hoverBtn = b && p.kind !== 'touch' ? b.id : null;
        if (S.pd && S.pd.id === p.id && p.kind !== 'mouse' && !S.won) {
          const dx = p.x - S.pd.x, dy = p.y - S.pd.y;
          if (Math.hypot(dx, dy) >= 34) {
            const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
            if (S.queue.length < 2) S.queue.push(d);
            S.pd.x = p.x; S.pd.y = p.y; S.pd.moved = true;
          }
        }
        return;
      }
      if (type === 'down') {
        const b = btnAt(S, p.x, p.y);
        if (b) { press(g, b.id); return; }
        if (S.won) return;
        S.pd = { x: p.x, y: p.y, id: p.id, moved: false };
        if (p.kind === 'mouse' && p.button === 0) { const i = cellAt(S, p.x, p.y); if (i >= 0) walkTo(g, i); }
        return;
      }
      if (type === 'up') {
        const pd = S.pd;
        S.pd = null;
        if (!pd || pd.id !== p.id || pd.moved || p.kind === 'mouse' || S.won) return;
        const i = cellAt(S, p.x, p.y);
        if (i >= 0) walkTo(g, i);
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      if (!S) return;
      drawBackdrop(g, ctx, g.W, g.H);
      drawRoom(g, ctx, S, g.state === 'play' || g.state === 'over' ? alpha : 0);
      if (!g.demo) for (const b of S.btns) drawButton(g, ctx, S, b, b.id === 'undo' && !S.hist.length);
    },

    cover(ctx, w, h, k) {
      const rows = ['__#########', '__#   .   #', '###  $$   #', '#.  #   * #', '#  @$    .#', '#####  ####', '____####___'];
      LV.push([rows.join('|'), 1, 1, 'u']);
      const L = parseLevel(LV.length);
      LV.pop();
      const S = makeState({ W: w, H: h }, L);
      S.c = 70; S.ox = (w - S.c * L.W) / 2; S.oy = (h - S.c * L.H) / 2 + 4; S.t = 30;
      S.face = 1; S.walk = 0.5;
      drawBackdrop(k, ctx, w, h);
      drawRoom(k, ctx, S, 0);
      const px = S.ox + 3.5 * S.c, py = S.oy + 4.5 * S.c;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px - S.c * (0.55 + i * 0.05), py - S.c * 0.25 + i * S.c * 0.22); ctx.lineTo(px - S.c * (0.85 + i * 0.1), py - S.c * 0.25 + i * S.c * 0.22); ctx.stroke(); }
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { LV, parseLevel, liveCells, isStuck },
  });
})();
