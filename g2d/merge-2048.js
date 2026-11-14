// ============================================================
//  2048 — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מחליקים את כל האריחים, שני אריחים זהים מתאחדים לאחד כפול.
//  לוחות 4×4, 5×5 ו-6×6, ביטול אחד לכל מהלך, ממשיכים גם אחרי 2048, והמשחק נשמר כשיוצאים.
// ============================================================
(function () {
  'use strict';
  // בטלפון עומד העולם עומד גם הוא (הלוח גדול יותר), במחשב הוא שוכב
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const SLIDE = 7, POP = 12, BORN = 10;            // אורך ההנפשות בצעדים (1/60 שנייה)
  const KEYDIR = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  const NUDGE = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  let uid = 1;

  // צבעי האריחים: למעלה, למטה, צבע הספרות
  const STY = {
    2: ['#fffaf0', '#efe2c8', '#76624b'], 4: ['#ffeccb', '#f6d394', '#7a5226'],
    8: ['#ffc07e', '#ff8f3c', '#fff'], 16: ['#ff9e7c', '#ff5f47', '#fff'], 32: ['#ff7f9f', '#ee426c', '#fff'],
    64: ['#f070e0', '#b63fcd', '#fff'], 128: ['#ffd65c', '#f2a922', '#fff'], 256: ['#ffcb3d', '#ec8f12', '#fff'],
    512: ['#a6ec6c', '#3dbb5c', '#fff'], 1024: ['#6cefe2', '#1fa9cf', '#fff'], 2048: ['#ffe352', '#ff8a1c', '#fff'],
    4096: ['#b79dff', '#6f3dee', '#fff'], 8192: ['#77b6ff', '#2c5fe6', '#fff'],
  };
  const sty = v => STY[v] || ['#56658a', '#1e2741', '#ffd84d'];

  // ----- טקסטים -----
  const TXT = {
    he: { title: '2048', help: ['חצים או WASD — החלק את כל האריחים', 'שני אריחים זהים שנפגשים מתאחדים לאחד כפול', 'הגע לאריח 2048 — ואחר כך אפשר להמשיך!', 'Z או הכפתור "בטל" — ביטול המהלך האחרון'], helpTouch: ['החלק על הלוח לכל כיוון', 'שני אריחים זהים שנפגשים מתאחדים לאחד כפול', 'הגע לאריח 2048 — ואחר כך אפשר להמשיך!', 'הכפתור "בטל" מבטל את המהלך האחרון'], goal: 'המטרה', biggest: 'הכי גדול: {n}', undo: 'בטל', undoNote: 'ביטול אחד לכל מהלך', undoUsed: 'עשה מהלך כדי לבטל', noMoves: 'אין יותר מהלכים!', finish: 'סיים', reached: 'הגעת ל-{n}!', keepGoing: 'המשך הלאה!', resumed: 'ממשיכים מאיפה שעצרת', endText: 'האריח הכי גדול: {n}', swipeHint: 'החלק לכל כיוון' },
    en: { title: '2048', help: ['Arrows or WASD — slide all the tiles', 'Two equal tiles that touch merge into one', 'Reach the 2048 tile — then keep going!', 'Z or the Undo button — take back the last move'], helpTouch: ['Swipe the board in any direction', 'Two equal tiles that touch merge into one', 'Reach the 2048 tile — then keep going!', 'The Undo button takes back the last move'], goal: 'Goal', biggest: 'Biggest: {n}', undo: 'Undo', undoNote: 'One undo per move', undoUsed: 'Make a move to undo', noMoves: 'No moves left!', finish: 'Finish', reached: 'You made {n}!', keepGoing: 'Keep going!', resumed: 'Continuing where you left off', endText: 'Biggest tile: {n}', swipeHint: 'Swipe in any direction' },
    ar: { title: '2048', help: ['الأسهم أو WASD — حرّك كل المربعات', 'مربعان متساويان يلتقيان يندمجان في واحد', 'اصنع المربع 2048 — ثم واصل اللعب!', 'Z أو زر «تراجع» — يلغي الحركة الأخيرة'], helpTouch: ['اسحب على اللوحة في أي اتجاه', 'مربعان متساويان يلتقيان يندمجان في واحد', 'اصنع المربع 2048 — ثم واصل اللعب!', 'زر «تراجع» يلغي الحركة الأخيرة'], goal: 'الهدف', biggest: 'الأكبر: {n}', undo: 'تراجع', undoNote: 'تراجع واحد لكل حركة', undoUsed: 'تحرّك أولاً لتتراجع', noMoves: 'لا توجد حركات!', finish: 'إنهاء', reached: 'وصلت إلى {n}!', keepGoing: 'واصل اللعب!', resumed: 'نكمل من حيث توقفت', endText: 'أكبر مربع: {n}', swipeHint: 'اسحب في أي اتجاه' },
    es: { title: '2048', help: ['Flechas o WASD — desliza todas las fichas', 'Dos fichas iguales que se tocan se unen en una', '¡Llega a la ficha 2048 y sigue jugando!', 'Z o el botón Deshacer — anula la última jugada'], helpTouch: ['Desliza el tablero en cualquier dirección', 'Dos fichas iguales que se tocan se unen en una', '¡Llega a la ficha 2048 y sigue jugando!', 'El botón Deshacer anula la última jugada'], goal: 'Meta', biggest: 'La mayor: {n}', undo: 'Deshacer', undoNote: 'Un deshacer por jugada', undoUsed: 'Juega para deshacer', noMoves: '¡No quedan jugadas!', finish: 'Terminar', reached: '¡Llegaste a {n}!', keepGoing: '¡Sigue jugando!', resumed: 'Sigues donde lo dejaste', endText: 'Ficha más grande: {n}', swipeHint: 'Desliza en cualquier dirección' },
    fr: { title: '2048', help: ['Flèches ou WASD — fais glisser toutes les tuiles', 'Deux tuiles égales qui se touchent fusionnent', 'Atteins la tuile 2048, puis continue !', 'Z ou le bouton Annuler — annule le dernier coup'], helpTouch: ['Glisse sur le plateau dans tous les sens', 'Deux tuiles égales qui se touchent fusionnent', 'Atteins la tuile 2048, puis continue !', 'Le bouton Annuler annule le dernier coup'], goal: 'Objectif', biggest: 'La plus grande : {n}', undo: 'Annuler', undoNote: 'Une annulation par coup', undoUsed: 'Joue pour annuler', noMoves: 'Plus aucun coup !', finish: 'Terminer', reached: 'Tu as fait {n} !', keepGoing: 'Continue !', resumed: 'On reprend là où tu étais', endText: 'Plus grande tuile : {n}', swipeHint: 'Glisse dans tous les sens' },
    pt: { title: '2048', help: ['Setas ou WASD — deslize todas as peças', 'Duas peças iguais que se encostam viram uma só', 'Chegue à peça 2048 — e continue jogando!', 'Z ou o botão Desfazer — volta a última jogada'], helpTouch: ['Deslize o tabuleiro em qualquer direção', 'Duas peças iguais que se encostam viram uma só', 'Chegue à peça 2048 — e continue jogando!', 'O botão Desfazer volta a última jogada'], goal: 'Meta', biggest: 'Maior: {n}', undo: 'Desfazer', undoNote: 'Um desfazer por jogada', undoUsed: 'Jogue para desfazer', noMoves: 'Sem jogadas!', finish: 'Terminar', reached: 'Você fez {n}!', keepGoing: 'Continue jogando!', resumed: 'Continuando de onde parou', endText: 'Maior peça: {n}', swipeHint: 'Deslize em qualquer direção' },
    ru: { title: '2048', help: ['Стрелки или WASD — сдвинуть все плитки', 'Две одинаковые плитки сливаются в одну', 'Собери плитку 2048 — и играй дальше!', 'Z или кнопка «Отменить» — вернуть последний ход'], helpTouch: ['Проведи по полю в любую сторону', 'Две одинаковые плитки сливаются в одну', 'Собери плитку 2048 — и играй дальше!', 'Кнопка «Отменить» возвращает последний ход'], goal: 'Цель', biggest: 'Самая большая: {n}', undo: 'Отменить', undoNote: 'Одна отмена на ход', undoUsed: 'Сделай ход, чтобы отменить', noMoves: 'Ходов больше нет!', finish: 'Завершить', reached: 'Ты собрал {n}!', keepGoing: 'Играй дальше!', resumed: 'Продолжаем с того же места', endText: 'Самая большая плитка: {n}', swipeHint: 'Проведи в любую сторону' },
    de: { title: '2048', help: ['Pfeile oder WASD — alle Steine schieben', 'Zwei gleiche Steine, die sich treffen, verschmelzen', 'Erreiche den Stein 2048 — dann spiel weiter!', 'Z oder die Taste Zurück — letzten Zug zurücknehmen'], helpTouch: ['Wische in eine beliebige Richtung', 'Zwei gleiche Steine, die sich treffen, verschmelzen', 'Erreiche den Stein 2048 — dann spiel weiter!', 'Die Taste Zurück nimmt den letzten Zug zurück'], goal: 'Ziel', biggest: 'Größter: {n}', undo: 'Zurück', undoNote: 'Einmal zurück pro Zug', undoUsed: 'Erst ziehen, dann zurück', noMoves: 'Keine Züge mehr!', finish: 'Beenden', reached: 'Du hast {n} geschafft!', keepGoing: 'Spiel weiter!', resumed: 'Weiter, wo du aufgehört hast', endText: 'Größter Stein: {n}', swipeHint: 'In jede Richtung wischen' },
  };
  for (const L in TXT) { TXT[L].size4 = '4×4'; TXT[L].size5 = '5×5'; TXT[L].size6 = '6×6'; }

  // ----- חוקי המשחק על מערך מספרים (משמש את הבוט ואת הבדיקות) -----
  function lineCells(n, dir, k) {
    const a = [];
    for (let j = 0; j < n; j++) {
      if (dir === 'left') a.push([k, j]); else if (dir === 'right') a.push([k, n - 1 - j]);
      else if (dir === 'up') a.push([j, k]); else a.push([n - 1 - j, k]);
    }
    return a;
  }
  function slideLine(vals) {
    const a = vals.filter(v => v), out = [];
    let gain = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === a[i + 1]) { out.push(a[i] * 2); gain += a[i] * 2; i++; } else out.push(a[i]);
    }
    while (out.length < vals.length) out.push(0);
    return { out, gain };
  }
  function simMove(vals, n, dir) {
    const out = vals.slice();
    let gain = 0, moved = false;
    for (let k = 0; k < n; k++) {
      const cells = lineCells(n, dir, k);
      const res = slideLine(cells.map(([r, c]) => vals[r * n + c]));
      gain += res.gain;
      cells.forEach(([r, c], j) => { if (vals[r * n + c] !== res.out[j]) moved = true; out[r * n + c] = res.out[j]; });
    }
    return { vals: out, gain, moved };
  }
  function canMoveVals(vals, n) {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = vals[r * n + c];
      if (!v) return true;
      if (c + 1 < n && vals[r * n + c + 1] === v) return true;
      if (r + 1 < n && vals[(r + 1) * n + c] === v) return true;
    }
    return false;
  }

  // ----- מצב הלוח עם אריחים (לאנימציה) -----
  const newTile = (v, r, c) => ({ id: uid++, v, r, c, fr: r, fc: c, pop: false, born: false });
  function valsOf(S) { const a = new Array(S.n * S.n).fill(0); for (const row of S.grid) for (const t of row) if (t) a[t.r * S.n + t.c] = t.v; return a; }
  function emptyCells(S) { const out = []; for (let r = 0; r < S.n; r++) for (let c = 0; c < S.n; c++) if (!S.grid[r][c]) out.push([r, c]); return out; }
  function blankGrid(n) { const a = []; for (let r = 0; r < n; r++) a.push(new Array(n).fill(null)); return a; }
  function biggest(S) { let m = 0; for (const row of S.grid) for (const t of row) if (t && t.v > m) m = t.v; return m; }

  function spawn(S) {
    const e = emptyCells(S);
    if (!e.length) return null;
    const [r, c] = e[Math.floor(Math.random() * e.length)];
    const t = newTile(Math.random() < 0.9 ? 2 : 4, r, c);
    t.born = true;
    S.grid[r][c] = t;
    return t;
  }
  function snapshot(S) {
    const cells = [];
    for (const row of S.grid) for (const t of row) if (t) cells.push([t.v, t.r, t.c]);
    return { n: S.n, cells, score: S.score, moves: S.moves, won: S.won };
  }
  function loadSnap(S, snap) {
    S.grid = blankGrid(S.n);
    for (const [v, r, c] of snap.cells) if (r >= 0 && c >= 0 && r < S.n && c < S.n) S.grid[r][c] = newTile(v, r, c);
    S.score = snap.score || 0; S.moves = snap.moves || 0; S.won = !!snap.won;
    S.ghosts = []; S.anim = 99; S.pending = null;
  }
  const goalOf = S => { let goal = 2048; const b = biggest(S); while (goal <= b) goal *= 2; return goal; };

  // ----- פריסה: לוח + לוח צד (שוכב) או לוח צד למעלה (עומד) -----
  function layout(W, H, n) {
    const port = H > W;
    const B = port ? 560 : 576, bx = port ? 20 : 42, by = port ? 250 : 32;
    const gap = Math.round(B * (n >= 6 ? 0.022 : 0.026));
    const cs = (B - gap * (n + 1)) / n;
    const L = { port, B, bx, by, gap, cs, n };
    if (port) {
      L.goal = { x: 20, y: 20, w: 270, h: 210 };
      L.undo = { x: 310, y: 20, w: 270, h: 104 };
      L.tut = { x: 310, y: 136, w: 270, h: 94 };
      L.hintY = 856;
    } else {
      L.goal = { x: 658, y: 32, w: 260, h: 228 };
      L.undo = { x: 658, y: 280, w: 260, h: 104 };
      L.tut = { x: 658, y: 404, w: 260, h: 204 };
    }
    return L;
  }
  const cellX = (L, c) => L.bx + L.gap + c * (L.cs + L.gap);
  const cellY = (L, r) => L.by + L.gap + r * (L.cs + L.gap);
  const inRect = (p, R) => R && p.x >= R.x && p.y >= R.y && p.x <= R.x + R.w && p.y <= R.y + R.h;
  function stuckBtns(L) {
    const w = Math.min(200, L.B * 0.36), h = 64, y = L.by + L.B * 0.58;
    return { undo: { x: L.bx + L.B / 2 - w - 10, y, w, h }, finish: { x: L.bx + L.B / 2 + 10, y, w, h } };
  }

  // ----- תזוזה -----
  function queueMove(g, dir) { const S = g.s; if (S.stuck || S.queue.length >= 2) return; S.queue.push(dir); }

  function fireEffects(g) {
    const S = g.s, P = S.pending;
    if (!P) return;
    S.pending = null;
    const L = S.L;
    let top = 0;
    for (const m of P.merged) {
      if (m.v > top) top = m.v;
      const x = cellX(L, m.c) + L.cs / 2, y = cellY(L, m.r) + L.cs / 2;
      const col = sty(m.v);
      g.burst(x, y, { n: m.v >= 128 ? 22 : 9, color: [col[0], col[1], '#ffffff'], speed: m.v >= 128 ? 4.2 : 2.6, life: 30, size: m.v >= 128 ? 6 : 4, gravity: 0.05 });
    }
    if (P.gain) {
      const m = P.merged[0];
      g.float(cellX(L, m.c) + L.cs / 2, cellY(L, m.r) + L.cs * 0.2, '+' + P.gain, { color: '#fff3c4', size: 24 });
      g.sfx('pop', { p: 0.75 + Math.log2(top) * 0.07 });
      if (top >= 512) g.shake(4);
    }
    if (P.reach) {
      g.msg(g.t('reached', { n: P.reach }) + ' ' + g.t('keepGoing'), 2200, '#ffe352');
      g.sfx('win');
      g.flash('#ffe9a0', 0.35);
      for (let i = 0; i < 6; i++) g.burst(L.bx + L.B * (0.15 + 0.14 * i), L.by + L.B * 0.3, { n: 24, color: ['#ffe352', '#ff8a1c', '#ff7f9f', '#6cefe2', '#ffffff'], speed: 6, life: 70, size: 6, shape: 'square', gravity: 0.12 });
    }
  }

  function applyMove(g, dir) {
    const S = g.s, n = S.n;
    if (S.anim < SLIDE + BORN) { S.anim = 99; fireEffects(g); }
    const snap = snapshot(S);
    const grid = blankGrid(n), ghosts = [], merged = [];
    let gain = 0, moved = false;
    for (const row of S.grid) for (const t of row) if (t) { t.fr = t.r; t.fc = t.c; t.pop = false; t.born = false; }
    for (let k = 0; k < n; k++) {
      const cells = lineCells(n, dir, k);
      const tiles = cells.map(([r, c]) => S.grid[r][c]).filter(Boolean);
      let j = 0;
      for (let i = 0; i < tiles.length; i++, j++) {
        const [r, c] = cells[j], t = tiles[i];
        if (i + 1 < tiles.length && tiles[i + 1].v === t.v) {
          const u = tiles[i + 1], m = newTile(t.v * 2, r, c);
          m.pop = true;
          for (const s of [t, u]) { s.r = r; s.c = c; ghosts.push(s); }
          grid[r][c] = m; merged.push(m); gain += m.v; moved = true;
          i++;
        } else {
          if (t.r !== r || t.c !== c) moved = true;
          t.r = r; t.c = c; grid[r][c] = t;
        }
      }
    }
    if (!moved) {
      for (const row of S.grid) for (const t of row) if (t) { t.r = t.fr; t.c = t.fc; }
      S.nudge = { d: NUDGE[dir], t: 10 };
      g.sfx('tick', { p: 0.6 });
      return false;
    }
    const before = biggest(S);
    S.grid = grid; S.ghosts = ghosts; S.anim = 0;
    S.score += gain; g.score = S.score; S.moves++;
    S.undo = snap;
    spawn(S);
    const after = biggest(S);
    let reach = 0;
    if (after >= 2048 && after > before) {
      let p = 2048; while (p * 2 <= after) p *= 2;
      if (p > before) reach = p;
      S.won = true;
    }
    S.pending = { merged, gain, reach };
    g.sfx('move', { p: 0.9 + Math.random() * 0.15 });
    if (!canMoveVals(valsOf(S), n)) { S.stuck = true; S.stuckT = 0; }
    saveRun(g);
    return true;
  }

  function undo(g) {
    const S = g.s;
    if (!S.undo) { g.sfx('error'); S.undoShake = 14; return; }
    fireEffects(g);
    loadSnap(S, S.undo);
    S.undo = null; S.stuck = false; S.queue = [];
    g.score = S.score;
    S.rewind = 16;
    g.sfx('whoosh');
    saveRun(g);
  }

  function finish(g) {
    const S = g.s;
    if (S.done) return;
    S.done = true;
    g.save('run' + S.n, null);
    g.end({ score: S.score, result: S.won ? 'win' : undefined, text: g.t('endText', { n: biggest(S) }), delay: 900 });
  }

  function saveRun(g) {
    const S = g.s;
    if (g.demo) return;
    g.save('run' + S.n, S.stuck && !S.undo ? null : snapshot(S));
  }

  // ----- בוט לבדיקות: מעריך כל כיוון במבט של שני מהלכים קדימה -----
  function heur(v, n) {
    let empty = 0, max = 0, mono = 0, smooth = 0;
    const lg = x => (x ? Math.log2(x) : 0);
    for (let i = 0; i < n * n; i++) { if (!v[i]) empty++; if (v[i] > max) max = v[i]; }
    for (let k = 0; k < n; k++) {
      let i1 = 0, d1 = 0, i2 = 0, d2 = 0;
      for (let j = 0; j + 1 < n; j++) {
        const a = lg(v[k * n + j]), b = lg(v[k * n + j + 1]), c = lg(v[j * n + k]), d = lg(v[(j + 1) * n + k]);
        if (a > b) d1 += a - b; else i1 += b - a;
        if (c > d) d2 += c - d; else i2 += d - c;
        if (a && b) smooth -= Math.abs(a - b);
        if (c && d) smooth -= Math.abs(c - d);
      }
      mono -= Math.min(i1, d1) + Math.min(i2, d2);
    }
    const corner = [v[0], v[n - 1], v[n * (n - 1)], v[n * n - 1]].includes(max) ? lg(max) : 0;
    return empty * 2.7 + mono + smooth * 0.1 + corner;
  }
  function botDir(vals, n) {
    let best = null, bestV = -1e9;
    for (const d of ['left', 'up', 'right', 'down']) {
      const r1 = simMove(vals, n, d);
      if (!r1.moved) continue;
      const empt = [];
      r1.vals.forEach((x, i) => { if (!x) empt.push(i); });
      const pick = empt.length > 6 ? empt.filter((_, i) => i % Math.ceil(empt.length / 6) === 0) : empt;
      let sum = 0;
      for (const i of pick) {
        const v2 = r1.vals.slice(); v2[i] = 2;
        let m = -50;
        for (const d2 of ['left', 'up', 'right', 'down']) { const r2 = simMove(v2, n, d2); if (r2.moved) m = Math.max(m, heur(r2.vals, n)); }
        sum += m;
      }
      const val = pick.length ? sum / pick.length : heur(r1.vals, n);
      if (val > bestV) { bestV = val; best = d; }
    }
    return best;
  }

  // ----- ציור -----
  function drawBg(g, ctx, t) {
    const W = g.W, H = g.H;
    const gr = ctx.createLinearGradient(0, 0, W * 0.3, H);
    gr.addColorStop(0, '#2d1c55'); gr.addColorStop(1, '#130d29');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const x = (i * 197 + Math.sin(t * 0.004 + i) * 40) % W, y = (i * 131 + t * (0.08 + i * 0.01)) % (H + 160) - 80;
      const r = 40 + (i % 4) * 22;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = ['255,180,90', '255,110,160', '120,220,255', '190,140,255'][i % 4];
      rg.addColorStop(0, 'rgba(' + col + ',0.13)'); rg.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function drawTile(g, ctx, x, y, s, v, scale, alpha) {
    const [a, b, fg] = sty(v);
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    if (scale !== 1) ctx.scale(scale, scale);
    if (alpha != null) ctx.globalAlpha *= alpha;
    const R = s * 0.15;
    g.rr(ctx, -s / 2, -s / 2 + s * 0.045, s, s, R); ctx.fillStyle = 'rgba(10,4,30,0.35)'; ctx.fill();
    if (v >= 128) { ctx.save(); ctx.shadowColor = a; ctx.shadowBlur = s * (v >= 2048 ? 0.5 : 0.28); g.rr(ctx, -s / 2, -s / 2, s, s, R); ctx.fillStyle = b; ctx.fill(); ctx.restore(); }
    const gr = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.rr(ctx, -s / 2, -s / 2, s, s, R); ctx.fillStyle = gr; ctx.fill();
    g.rr(ctx, -s / 2 + s * 0.07, -s / 2 + s * 0.06, s * 0.86, s * 0.34, R * 0.8); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    const str = String(v), d = str.length;
    const size = s * (d <= 2 ? 0.48 : d === 3 ? 0.4 : d === 4 ? 0.32 : d === 5 ? 0.26 : 0.22);
    g.text(ctx, str, 0, s * 0.03, { size, weight: 900, color: fg, shadow: fg === '#fff' ? 'rgba(90,30,0,.35)' : null, blur: 4 });
    ctx.restore();
  }

  function card(g, ctx, R, glow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    g.rr(ctx, R.x, R.y, R.w, R.h, 20); ctx.fillStyle = 'rgba(32,22,64,0.88)'; ctx.fill();
    ctx.restore();
    g.rr(ctx, R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1, 20); ctx.strokeStyle = glow || 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawPanel(g, ctx) {
    const S = g.s, L = S.L, t = S.t;
    // המטרה
    const G = L.goal;
    card(g, ctx, G);
    g.text(ctx, g.t('goal'), G.x + G.w / 2, G.y + 30, { size: 22, weight: 800, color: '#cdbdf7', maxW: G.w - 20 });
    const goal = goalOf(S), ts = L.port ? 104 : 112, bob = Math.sin(t * 0.05) * 3;
    drawTile(g, ctx, G.x + G.w / 2 - ts / 2, G.y + 50 + bob, ts, goal, 1);
    g.text(ctx, g.t('biggest', { n: biggest(S) || 2 }), G.x + G.w / 2, G.y + G.h - 26, { size: 20, weight: 700, color: '#fff', maxW: G.w - 20 });
    // בטל
    const U = L.undo, on = !!S.undo && !g.demo;
    const sx = S.undoShake ? Math.sin(S.undoShake * 1.7) * S.undoShake * 0.5 : 0;
    ctx.save(); ctx.translate(sx, 0);
    ctx.save();
    ctx.shadowColor = on ? 'rgba(255,140,40,.45)' : 'rgba(0,0,0,.3)'; ctx.shadowBlur = on ? 22 : 12; ctx.shadowOffsetY = 5;
    const ug = ctx.createLinearGradient(0, U.y, 0, U.y + U.h);
    ug.addColorStop(0, on ? '#ffc061' : '#4c4370'); ug.addColorStop(1, on ? '#ff7d36' : '#3a3258');
    g.rr(ctx, U.x, U.y, U.w, U.h, 20); ctx.fillStyle = ug; ctx.fill();
    ctx.restore();
    g.rr(ctx, U.x + 6, U.y + 5, U.w - 12, U.h * 0.38, 15); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
    g.text(ctx, '↶ ' + g.t('undo'), U.x + U.w / 2, U.y + U.h * 0.4, { size: 32, weight: 900, color: on ? '#fff' : 'rgba(255,255,255,.55)', shadow: on ? 'rgba(120,40,0,.4)' : null, maxW: U.w - 24 });
    g.text(ctx, g.t(on || g.demo ? 'undoNote' : 'undoUsed'), U.x + U.w / 2, U.y + U.h * 0.77, { size: 16, weight: 700, color: on ? '#fff6e0' : 'rgba(255,255,255,.5)', maxW: U.w - 24 });
    ctx.restore();
    // הדרכה קטנה: 2 + 2 = 4
    const T = L.tut;
    card(g, ctx, T);
    const rows = L.port ? [[2, 4]] : [[2, 4], [4, 8], [64, 128]];
    const ms = L.port ? 46 : 44, rowH = L.port ? T.h : (T.h - 16) / 3;
    rows.forEach(([a, b], i) => {
      const cy = T.y + (L.port ? T.h / 2 : 8 + rowH * (i + 0.5));
      const x0 = T.x + T.w / 2 - (ms * 3 + 64) / 2;
      const wob = Math.max(0, Math.sin(t * 0.06 - i * 1.3)) * 0.12;
      drawTile(g, ctx, x0, cy - ms / 2, ms, a, 1);
      g.text(ctx, '+', x0 + ms + 16, cy, { size: 26, weight: 900, color: '#cdbdf7' });
      drawTile(g, ctx, x0 + ms + 32, cy - ms / 2, ms, a, 1);
      g.text(ctx, '=', x0 + ms * 2 + 48, cy, { size: 26, weight: 900, color: '#cdbdf7' });
      drawTile(g, ctx, x0 + ms * 2 + 64, cy - ms / 2, ms, b, 1 + wob);
    });
  }

  function drawBoard(g, ctx, alpha) {
    const S = g.s, L = S.L, n = S.n, cs = L.cs;
    let ox = 0, oy = 0;
    if (S.nudge && S.nudge.t > 0) { const k = Math.sin(S.nudge.t / 10 * Math.PI) * 7; ox = S.nudge.d[0] * k; oy = S.nudge.d[1] * k; }
    ctx.save();
    ctx.translate(ox, oy);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    g.rr(ctx, L.bx, L.by, L.B, L.B, 22);
    const bg = ctx.createLinearGradient(0, L.by, 0, L.by + L.B);
    bg.addColorStop(0, '#3b2c69'); bg.addColorStop(1, '#2a1f4c');
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    g.rr(ctx, L.bx + 1, L.by + 1, L.B - 2, L.B - 2, 21); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2; ctx.stroke();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { g.rr(ctx, cellX(L, c), cellY(L, r), cs, cs, cs * 0.15); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); }
    const a = S.anim + (S.anim < SLIDE + BORN && g.state === 'play' ? alpha : 0);
    const e = g.ease.out;
    if (a < SLIDE) {
      const p = e(Math.max(0, a) / SLIDE);
      const moving = [];
      for (const row of S.grid) for (const t of row) if (t && !t.pop && !t.born) moving.push(t);
      for (const t of S.ghosts.concat(moving)) {
        const x = cellX(L, t.fc + (t.c - t.fc) * p), y = cellY(L, t.fr + (t.r - t.fr) * p);
        drawTile(g, ctx, x, y, cs, t.v, 1);
      }
    } else {
      for (const row of S.grid) for (const t of row) {
        if (!t) continue;
        let sc = 1;
        if (t.pop) { const q = (a - SLIDE) / POP; if (q < 1) sc = 1 + Math.sin(q * Math.PI) * 0.2; }
        if (t.born) { const q = (a - SLIDE) / BORN; if (q < 1) sc = Math.max(0.05, g.ease.back(Math.max(0, q))); }
        drawTile(g, ctx, cellX(L, t.c), cellY(L, t.r), cs, t.v, sc);
      }
    }
    if (S.rewind > 0) { g.rr(ctx, L.bx, L.by, L.B, L.B, 22); ctx.fillStyle = 'rgba(160,220,255,' + (S.rewind / 16 * 0.25) + ')'; ctx.fill(); }
    ctx.restore();
  }

  function drawStuck(g, ctx) {
    const S = g.s, L = S.L, k = Math.min(1, S.stuckT / 30);
    ctx.save();
    ctx.globalAlpha = k;
    g.rr(ctx, L.bx, L.by, L.B, L.B, 22); ctx.fillStyle = 'rgba(18,10,40,0.72)'; ctx.fill();
    g.text(ctx, g.t('noMoves'), L.bx + L.B / 2, L.by + L.B * 0.4, { size: 44, weight: 900, color: '#fff', maxW: L.B - 40, shadow: true });
    if (S.undo) {
      const B = stuckBtns(L);
      for (const [key, R, c1, c2] of [['undo', B.undo, '#ffc061', '#ff7d36'], ['finish', B.finish, '#8fe3ff', '#4b8dff']]) {
        const gr = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        g.rr(ctx, R.x, R.y, R.w, R.h, 16); ctx.fillStyle = gr; ctx.fill();
        g.text(ctx, (key === 'undo' ? '↶ ' : '✓ ') + g.t(key), R.x + R.w / 2, R.y + R.h / 2, { size: 26, weight: 900, color: '#fff', maxW: R.w - 16, shadow: 'rgba(0,0,0,.3)' });
      }
    }
    ctx.restore();
  }

  // תמונת פתיחה (תפריט) — לוח יפה באמצע משחק
  function demoBoard(S) {
    const pat = { 4: [[2, 4, 8, 2], [4, 16, 32, 8], [8, 64, 128, 16], [256, 512, 1024, 2048]] };
    const n = S.n;
    S.grid = blankGrid(n);
    const base = pat[4];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const rr = r - (n - 4), cc = c;
      let v = rr >= 0 && cc < 4 ? base[rr][cc] : ((r + c) % 3 === 0 ? 2 : (r * c) % 5 === 1 ? 4 : 0);
      if (v) S.grid[r][c] = newTile(v, r, c);
    }
  }

  GK.register('merge-2048', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#1b1236', accent: '#ffb347',
    modes: [{ id: '4', label: 'size4' }, { id: '5', label: 'size5' }, { id: '6', label: 'size6' }],
    text: TXT,

    init(g) {
      const wasPaused = !!(g.s && g.s.wasPaused);
      const n = +g.mode || 4;
      const S = g.s = { n, L: layout(g.W, g.H, n), grid: blankGrid(n), ghosts: [], queue: [], anim: 99, score: 0, moves: 0, won: false, undo: null, stuck: false, stuckT: 0, done: false, pending: null, nudge: null, rewind: 0, undoShake: 0, sw: null, t: 0, wasPaused: false, botT: 0 };
      g.score = 0;
      const saved = g.load('run' + n, null);
      if (g.demo) {
        if (saved && saved.cells && saved.cells.length) loadSnap(S, saved); else demoBoard(S);
        return;
      }
      if (!wasPaused && saved && saved.cells && saved.cells.length && saved.n === n) {
        loadSnap(S, saved);
        g.score = S.score;
        if (!canMoveVals(valsOf(S), n)) { S.stuck = true; S.stuckT = 30; }
        g.after(0.3, () => g.msg(g.t('resumed'), 1600, '#ffe1a6'));
      } else {
        g.save('run' + n, null);
        const a = spawn(S), b = spawn(S);
        S.anim = SLIDE; // האריחים הראשונים צומחים
        if (a) a.born = true; if (b) b.born = true;
      }
    },

    step(g) {
      const S = g.s;
      S.t++; S.wasPaused = false;
      for (const c of g.hits) {
        if (KEYDIR[c]) queueMove(g, KEYDIR[c]);
        else if (c === 'KeyZ' || c === 'Backspace' || c === 'KeyU') undo(g);
        else if (S.stuck && (c === 'Enter' || c === 'Space')) finish(g);
      }
      if (S.queue.length && !S.stuck) applyMove(g, S.queue.shift());
      if (S.anim < 99) { S.anim++; if (S.anim === SLIDE) fireEffects(g); }
      if (S.nudge && S.nudge.t > 0) S.nudge.t--;
      if (S.rewind > 0) S.rewind--;
      if (S.undoShake > 0) S.undoShake--;
      if (S.stuck) {
        S.stuckT++;
        if (!S.undo && S.stuckT > 80) finish(g);
      }
      const b = g.getBest();
      g.hud([[g.t('score'), S.score], [g.t('best'), b === null ? Math.max(0, S.score) : Math.max(b, S.score)]]);
    },

    idle(g) { if (g.s) g.s.t++; },

    bot(g) {
      const S = g.s;
      if (S.done) return;
      if (S.stuck) { if (S.stuckT > 40) finish(g); return; }
      if (++S.botT < 6 || S.queue.length || S.anim < SLIDE) return;
      S.botT = 0;
      const d = botDir(valsOf(S), S.n);
      if (d) queueMove(g, d);
    },

    onPause(g) { if (g.s) g.s.wasPaused = true; },

    onPointer(g, type, p) {
      const S = g.s, L = S.L;
      if (type === 'down') {
        if (inRect(p, L.undo)) { undo(g); return; }
        if (S.stuck) {
          if (S.undo) { const B = stuckBtns(L); if (inRect(p, B.undo)) return undo(g); if (inRect(p, B.finish)) return finish(g); }
          return;
        }
        S.sw = { x: p.x, y: p.y, id: p.id, used: false };
      } else if (type === 'move' && S.sw && S.sw.id === p.id && !S.sw.used) {
        const dx = p.x - S.sw.x, dy = p.y - S.sw.y;
        if (Math.hypot(dx, dy) < 26) return;
        queueMove(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        S.sw.used = true;
      } else if (type === 'up') {
        if (S.sw && !S.sw.used && S.sw.id === p.id) {
          const dx = p.x - S.sw.x, dy = p.y - S.sw.y;
          if (Math.hypot(dx, dy) >= 14) queueMove(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }
        S.sw = null;
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s;
      drawBg(g, ctx, S.t + alpha);
      drawPanel(g, ctx);
      drawBoard(g, ctx, alpha);
      if (S.stuck) drawStuck(g, ctx);
      if (S.L.port && S.L.hintY) g.text(ctx, g.t(g.touch ? 'swipeHint' : 'undoNote'), g.W / 2, S.L.hintY, { size: 22, weight: 700, color: 'rgba(255,255,255,.55)', maxW: g.W - 40 });
    },

    cover(ctx, w, h, k) {
      const S = { t: 0 };
      const g = Object.assign(Object.create(k), { W: w, H: h, s: S });
      drawBg(g, ctx, 300);
      // ניצוצות ברקע
      for (let i = 0; i < 22; i++) {
        const x = (i * 173) % w, y = (i * 97 + 40) % h, r = 2 + (i % 4);
        ctx.fillStyle = ['#ffe352', '#ff8fb0', '#8ff0ff', '#ffffff'][i % 4];
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(x, y - r * 2.4); ctx.lineTo(x + r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 2.4, y); ctx.lineTo(x + r * 0.6, y + r * 0.6); ctx.lineTo(x, y + r * 2.4); ctx.lineTo(x - r * 0.6, y + r * 0.6); ctx.lineTo(x - r * 2.4, y); ctx.lineTo(x - r * 0.6, y - r * 0.6); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // לוח קטן מוטה מימין
      ctx.save();
      ctx.translate(w * 0.66, h * 0.52); ctx.rotate(-0.08);
      const B = 400, cs = 88, gap = 9.6;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      k.rr(ctx, -B / 2, -B / 2, B, B, 26); ctx.fillStyle = '#33265e'; ctx.fill(); ctx.restore();
      const vals = [[2, 4, 8, 16], [4, 8, 32, 64], [2, 128, 256, 512], [0, 2, 1024, 0]];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = -B / 2 + gap + c * (cs + gap), y = -B / 2 + gap + r * (cs + gap);
        k.rr(ctx, x, y, cs, cs, 13); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
        if (vals[r][c]) drawTile(g, ctx, x, y, cs, vals[r][c], 1);
      }
      ctx.restore();
      // אריח 2048 גדול וזוהר משמאל
      ctx.save();
      ctx.translate(w * 0.24, h * 0.5); ctx.rotate(0.06);
      const s = 250;
      const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, s * 1.1);
      rg.addColorStop(0, 'rgba(255,220,80,.55)'); rg.addColorStop(1, 'rgba(255,220,80,0)');
      ctx.fillStyle = rg; ctx.fillRect(-s * 1.2, -s * 1.2, s * 2.4, s * 2.4);
      drawTile(g, ctx, -s / 2, -s / 2, s, 2048, 1);
      ctx.restore();
    },

    // לבדיקות: חוקי המשחק הטהורים
    _core: { slideLine, simMove, canMoveVals, botDir, lineCells },
  });
})();
