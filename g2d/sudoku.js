// ============================================================
//  סודוקו — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מחולל שכל חידה שלו בעלת פתרון אחד בלבד (נבדק בפותר שסופר פתרונות),
//  ונפתרת בהיגיון בלי לנחש: קל וביניוני ביחידים, קשה דורש גם זוגות ונעילות.
//  הערות, הדגשות, טעויות באדום, רמזים, ושיא הזמן הכי טוב לכל רמה.
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const ALL = 0x3fe;   // ביטים 1..9
  const ROW = new Int8Array(81), COL = new Int8Array(81), BOX = new Int8Array(81);
  for (let i = 0; i < 81; i++) { ROW[i] = (i / 9) | 0; COL[i] = i % 9; BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0); }
  const UNITS = [];
  for (let k = 0; k < 9; k++) {
    const r = [], c = [], b = [];
    for (let i = 0; i < 81; i++) { if (ROW[i] === k) r.push(i); if (COL[i] === k) c.push(i); if (BOX[i] === k) b.push(i); }
    UNITS.push(r, c, b);
  }
  const PEERS = [];
  for (let i = 0; i < 81; i++) { const s = new Set(); for (let j = 0; j < 81; j++) if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) s.add(j); PEERS.push([...s]); }
  const POP = new Int8Array(1024);
  for (let m = 1; m < 1024; m++) POP[m] = POP[m >> 1] + (m & 1);
  const lowDigit = m => { for (let d = 1; d <= 9; d++) if (m & (1 << d)) return d; return 0; };
  const PEN_MISTAKE = 10, PEN_HINT = 30;

  // ---------- פותר שסופר פתרונות (עד limit) ----------
  function countSolutions(grid, limit) {
    const g = Int8Array.from(grid), R = new Int32Array(9), C = new Int32Array(9), B = new Int32Array(9);
    for (let i = 0; i < 81; i++) if (g[i]) {
      const m = 1 << g[i];
      if ((R[ROW[i]] | C[COL[i]] | B[BOX[i]]) & m) return 0;
      R[ROW[i]] |= m; C[COL[i]] |= m; B[BOX[i]] |= m;
    }
    let count = 0;
    const rec = () => {
      let best = -1, bm = 0, bn = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) {
        const m = ALL & ~(R[ROW[i]] | C[COL[i]] | B[BOX[i]]), n = POP[m];
        if (n < bn) { bn = n; best = i; bm = m; if (n < 2) break; }
      }
      if (best < 0) return ++count >= limit;
      if (!bn) return false;
      const r = ROW[best], c = COL[best], b = BOX[best];
      for (let d = 1; d <= 9; d++) if (bm & (1 << d)) {
        const m = 1 << d;
        g[best] = d; R[r] |= m; C[c] |= m; B[b] |= m;
        if (rec()) return true;
        g[best] = 0; R[r] &= ~m; C[c] &= ~m; B[b] &= ~m;
      }
      return false;
    };
    rec();
    return count;
  }

  // ---------- לוח מלא אקראי ----------
  function fullGrid(rnd) {
    const g = new Int8Array(81), R = new Int32Array(9), C = new Int32Array(9), B = new Int32Array(9);
    const rec = () => {
      let best = -1, bm = 0, bn = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) {
        const m = ALL & ~(R[ROW[i]] | C[COL[i]] | B[BOX[i]]), n = POP[m];
        if (n < bn) { bn = n; best = i; bm = m; if (n < 2) break; }
      }
      if (best < 0) return true;
      if (!bn) return false;
      const ds = [];
      for (let d = 1; d <= 9; d++) if (bm & (1 << d)) ds.push(d);
      for (let k = ds.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = ds[k]; ds[k] = ds[j]; ds[j] = t; }
      const r = ROW[best], c = COL[best], b = BOX[best];
      for (const d of ds) {
        const m = 1 << d;
        g[best] = d; R[r] |= m; C[c] |= m; B[b] |= m;
        if (rec()) return true;
        g[best] = 0; R[r] &= ~m; C[c] &= ~m; B[b] &= ~m;
      }
      return false;
    };
    rec();
    return g;
  }

  // ---------- פותר הגיוני (כמו בן אדם) ----------
  // level 0: יחידים גלויים · 1: גם יחידים נסתרים · 2: גם נעילות (pointing/claiming) וזוגות גלויים
  function logicSolve(puz, level) {
    const v = Int8Array.from(puz), cand = new Int16Array(81);
    for (let i = 0; i < 81; i++) if (!v[i]) {
      let m = ALL;
      for (const p of PEERS[i]) if (v[p]) m &= ~(1 << v[p]);
      cand[i] = m;
    }
    const place = (i, d) => { v[i] = d; cand[i] = 0; for (const p of PEERS[i]) cand[p] &= ~(1 << d); };
    let guard = 0;
    while (guard++ < 400) {
      let prog = false;
      for (let i = 0; i < 81; i++) if (!v[i]) {
        if (!cand[i]) return false;
        if (POP[cand[i]] === 1) { place(i, lowDigit(cand[i])); prog = true; }
      }
      if (prog) continue;
      if (level >= 1) {
        for (const u of UNITS) for (let d = 1; d <= 9 && !prog; d++) {
          const bit = 1 << d;
          let at = -1, n = 0, have = false;
          for (const i of u) { if (v[i] === d) { have = true; break; } if (!v[i] && (cand[i] & bit)) { n++; at = i; } }
          if (have) continue;
          if (n === 0) return false;
          if (n === 1) { place(at, d); prog = true; }
        }
        if (prog) continue;
      }
      if (level >= 2) {
        // נעילות: ספרה שבתוך ריבוע נמצאת רק בשורה/עמודה אחת (ולהפך)
        for (let a = 0; a < 27; a++) for (let d = 1; d <= 9; d++) {
          const bit = 1 << d, cells = UNITS[a].filter(i => !v[i] && (cand[i] & bit));
          if (cells.length < 2) continue;
          const others = [];
          if (a % 3 === 2) { // ריבוע
            if (cells.every(i => ROW[i] === ROW[cells[0]])) others.push(...UNITS[ROW[cells[0]] * 3]);
            if (cells.every(i => COL[i] === COL[cells[0]])) others.push(...UNITS[COL[cells[0]] * 3 + 1]);
          } else if (cells.every(i => BOX[i] === BOX[cells[0]])) others.push(...UNITS[BOX[cells[0]] * 3 + 2]);
          for (const j of others) if (!v[j] && !cells.includes(j) && (cand[j] & bit)) { cand[j] &= ~bit; prog = true; }
        }
        // זוגות גלויים
        for (const u of UNITS) {
          const pairs = u.filter(i => !v[i] && POP[cand[i]] === 2);
          for (let x = 0; x < pairs.length; x++) for (let y = x + 1; y < pairs.length; y++) {
            const m = cand[pairs[x]];
            if (cand[pairs[y]] !== m) continue;
            for (const j of u) if (j !== pairs[x] && j !== pairs[y] && !v[j] && (cand[j] & m)) { cand[j] &= ~m; prog = true; }
          }
        }
      }
      if (!prog) break;
    }
    for (let i = 0; i < 81; i++) if (!v[i]) return false;
    return true;
  }

  // ---------- מחולל: מוריד זוגות סימטריים כל עוד יש פתרון אחד והוא נפתר בהיגיון ברמה ----------
  const TARGET = [40, 32, 26], LEVEL = [1, 1, 2];
  function makePuzzle(diff, rnd) {
    let best = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const sol = fullGrid(rnd), puz = Int8Array.from(sol);
      const order = [];
      for (let i = 0; i <= 40; i++) order.push(i);
      for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = order[k]; order[k] = order[j]; order[j] = t; }
      let clues = 81;
      for (const i of order) {
        if (clues <= TARGET[diff]) break;
        const j = 80 - i, a = puz[i], b = puz[j];
        puz[i] = 0; puz[j] = 0;
        if (countSolutions(puz, 2) === 1 && logicSolve(puz, LEVEL[diff])) clues -= i === j ? 1 : 2;
        else { puz[i] = a; puz[j] = b; }
      }
      const res = { puz, sol, clues };
      if (diff === 2) {
        const real = !logicSolve(puz, 1);   // קשה באמת: היחידים לבד לא מספיקים
        if (real && clues <= 30) return res;
        if (!best || (real && !best.real) || (real === best.real && clues < best.clues)) { best = res; best.real = real; }
      } else {
        if (clues <= TARGET[diff] + 1) return res;
        if (!best || clues < best.clues) best = res;
      }
    }
    return best;
  }

  // ---------- טקסטים ----------
  const TXT = {
    he: { title: 'סודוקו', help: ['לחץ על משבצת ואז על מספר כדי לכתוב אותו', 'בכל שורה, עמודה וריבוע 3×3 — כל מספר מ-1 עד 9 פעם אחת', 'הערות: כתוב מספרים קטנים של מה שאפשרי', 'טעות נצבעת באדום ומוסיפה 10 שניות, רמז מוסיף 30', 'מקלדת: חצים · 1–9 · N הערות · Delete מחק · Z בטל · H רמז'], helpTouch: ['הקש על משבצת ואז על מספר כדי לכתוב אותו', 'בכל שורה, עמודה וריבוע 3×3 — כל מספר מ-1 עד 9 פעם אחת', 'הערות: כתוב מספרים קטנים של מה שאפשרי', 'טעות נצבעת באדום ומוסיפה 10 שניות, רמז מוסיף 30'], notes: 'הערות', erase: 'מחק', undo: 'בטל', hint: 'רמז', mistakes: 'טעויות', endText: 'טעויות: {m} · רמזים: {h}', solved: 'פתרת!', pickCell: 'בחר קודם משבצת' },
    en: { title: 'Sudoku', help: ['Click a cell, then a number to write it', 'Every row, column and 3×3 box holds 1–9 exactly once', 'Notes: write small numbers for what could fit', 'A mistake turns red and adds 10 seconds; a hint adds 30', 'Keys: arrows · 1–9 · N notes · Delete erase · Z undo · H hint'], helpTouch: ['Tap a cell, then a number to write it', 'Every row, column and 3×3 box holds 1–9 exactly once', 'Notes: write small numbers for what could fit', 'A mistake turns red and adds 10 seconds; a hint adds 30'], notes: 'Notes', erase: 'Erase', undo: 'Undo', hint: 'Hint', mistakes: 'Mistakes', endText: 'Mistakes: {m} · Hints: {h}', solved: 'Solved!', pickCell: 'Pick a cell first' },
    ar: { title: 'سودوكو', help: ['اضغط على خانة ثم على رقم لكتابته', 'كل صف وعمود ومربع 3×3 فيه الأرقام 1–9 مرة واحدة', 'الملاحظات: اكتب أرقاماً صغيرة لما قد يناسب', 'الخطأ يظهر بالأحمر ويضيف 10 ثوانٍ، والتلميح يضيف 30', 'المفاتيح: الأسهم · 1–9 · N ملاحظات · Delete مسح · Z تراجع · H تلميح'], helpTouch: ['المس خانة ثم رقماً لكتابته', 'كل صف وعمود ومربع 3×3 فيه الأرقام 1–9 مرة واحدة', 'الملاحظات: اكتب أرقاماً صغيرة لما قد يناسب', 'الخطأ يظهر بالأحمر ويضيف 10 ثوانٍ، والتلميح يضيف 30'], notes: 'ملاحظات', erase: 'مسح', undo: 'تراجع', hint: 'تلميح', mistakes: 'الأخطاء', endText: 'الأخطاء: {m} · التلميحات: {h}', solved: 'أحسنت!', pickCell: 'اختر خانة أولاً' },
    es: { title: 'Sudoku', help: ['Haz clic en una casilla y luego en un número', 'Cada fila, columna y caja de 3×3 tiene del 1 al 9 una vez', 'Notas: escribe en pequeño lo que podría ir', 'Un error se pone rojo y suma 10 segundos; una pista suma 30', 'Teclas: flechas · 1–9 · N notas · Supr borrar · Z deshacer · H pista'], helpTouch: ['Toca una casilla y luego un número', 'Cada fila, columna y caja de 3×3 tiene del 1 al 9 una vez', 'Notas: escribe en pequeño lo que podría ir', 'Un error se pone rojo y suma 10 segundos; una pista suma 30'], notes: 'Notas', erase: 'Borrar', undo: 'Deshacer', hint: 'Pista', mistakes: 'Errores', endText: 'Errores: {m} · Pistas: {h}', solved: '¡Resuelto!', pickCell: 'Elige una casilla primero' },
    fr: { title: 'Sudoku', help: ['Clique sur une case, puis sur un chiffre', 'Chaque ligne, colonne et carré 3×3 contient 1 à 9 une seule fois', 'Notes : écris en petit ce qui pourrait aller', 'Une erreur devient rouge et ajoute 10 s ; un indice ajoute 30 s', 'Touches : flèches · 1–9 · N notes · Suppr effacer · Z annuler · H indice'], helpTouch: ['Touche une case, puis un chiffre', 'Chaque ligne, colonne et carré 3×3 contient 1 à 9 une seule fois', 'Notes : écris en petit ce qui pourrait aller', 'Une erreur devient rouge et ajoute 10 s ; un indice ajoute 30 s'], notes: 'Notes', erase: 'Effacer', undo: 'Annuler', hint: 'Indice', mistakes: 'Erreurs', endText: 'Erreurs : {m} · Indices : {h}', solved: 'Résolu !', pickCell: "Choisis d'abord une case" },
    pt: { title: 'Sudoku', help: ['Clique numa casa e depois num número', 'Cada linha, coluna e quadrado 3×3 tem de 1 a 9 uma vez só', 'Notas: escreva em pequeno o que pode caber', 'Um erro fica vermelho e soma 10 segundos; uma dica soma 30', 'Teclas: setas · 1–9 · N notas · Delete apagar · Z desfazer · H dica'], helpTouch: ['Toque numa casa e depois num número', 'Cada linha, coluna e quadrado 3×3 tem de 1 a 9 uma vez só', 'Notas: escreva em pequeno o que pode caber', 'Um erro fica vermelho e soma 10 segundos; uma dica soma 30'], notes: 'Notas', erase: 'Apagar', undo: 'Desfazer', hint: 'Dica', mistakes: 'Erros', endText: 'Erros: {m} · Dicas: {h}', solved: 'Resolvido!', pickCell: 'Escolha uma casa primeiro' },
    ru: { title: 'Судоку', help: ['Нажми на клетку, потом на цифру', 'В каждой строке, столбце и квадрате 3×3 цифры 1–9 по разу', 'Заметки: пиши мелкие цифры-варианты', 'Ошибка краснеет и добавляет 10 секунд, подсказка — 30', 'Клавиши: стрелки · 1–9 · N заметки · Delete стереть · Z отменить · H подсказка'], helpTouch: ['Коснись клетки, потом цифры', 'В каждой строке, столбце и квадрате 3×3 цифры 1–9 по разу', 'Заметки: пиши мелкие цифры-варианты', 'Ошибка краснеет и добавляет 10 секунд, подсказка — 30'], notes: 'Заметки', erase: 'Стереть', undo: 'Отменить', hint: 'Подсказка', mistakes: 'Ошибки', endText: 'Ошибки: {m} · Подсказки: {h}', solved: 'Решено!', pickCell: 'Сначала выбери клетку' },
    de: { title: 'Sudoku', help: ['Klicke auf ein Feld, dann auf eine Zahl', 'Jede Zeile, Spalte und jedes 3×3-Quadrat hat 1–9 genau einmal', 'Notizen: kleine Zahlen für das, was passen könnte', 'Ein Fehler wird rot und kostet 10 Sekunden, ein Tipp 30', 'Tasten: Pfeile · 1–9 · N Notizen · Entf löschen · Z zurück · H Tipp'], helpTouch: ['Tippe auf ein Feld, dann auf eine Zahl', 'Jede Zeile, Spalte und jedes 3×3-Quadrat hat 1–9 genau einmal', 'Notizen: kleine Zahlen für das, was passen könnte', 'Ein Fehler wird rot und kostet 10 Sekunden, ein Tipp 30'], notes: 'Notizen', erase: 'Löschen', undo: 'Zurück', hint: 'Tipp', mistakes: 'Fehler', endText: 'Fehler: {m} · Tipps: {h}', solved: 'Gelöst!', pickCell: 'Wähle zuerst ein Feld' },
  };
  const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- פריסה ----------
  function layout(W, H) {
    if (H > W) {
      const cs = 62, B = cs * 9, bx = (W - B) / 2, by = 16;
      const L = { port: true, cs, B, bx, by, pad: [], tools: [] };
      const tw = (B - 30) / 4;
      for (let k = 0; k < 4; k++) L.tools.push({ x: bx + k * (tw + 10), y: by + B + 20, w: tw, h: 78 });
      const pw = (B - 8 * 6) / 9;
      for (let d = 1; d <= 9; d++) L.pad.push({ x: bx + (d - 1) * (pw + 6), y: by + B + 114, w: pw, h: 112, d });
      L.info = { x: bx, y: by + B + 246, w: B, h: 66 };
      return L;
    }
    const cs = 64, B = cs * 9, bx = 32, by = 32;
    const L = { port: false, cs, B, bx, by, pad: [], tools: [] };
    const px = 640, bw = 88, bh = 84;
    for (let d = 1; d <= 9; d++) L.pad.push({ x: px + ((d - 1) % 3) * (bw + 12), y: by + ((d - 1) / 3 | 0) * (bh + 12), w: bw, h: bh, d });
    for (let k = 0; k < 4; k++) L.tools.push({ x: px + (k % 2) * 150, y: 332 + (k / 2 | 0) * 84, w: 138, h: 72 });
    L.info = { x: px, y: 508, w: 288, h: 100 };
    return L;
  }
  const TOOLS = ['notes', 'erase', 'undo', 'hint'];
  const inR = (p, R) => p.x >= R.x && p.y >= R.y && p.x <= R.x + R.w && p.y <= R.y + R.h;

  // ---------- מצב ופעולות ----------
  function newState(g, diff, rnd) {
    const P = makePuzzle(diff, rnd);
    const S = {
      diff, sol: P.sol, given: new Uint8Array(81), val: new Int8Array(81), notes: new Int16Array(81), hinted: new Uint8Array(81),
      sel: -1, hl: 0, notesMode: false, undo: [], frames: 0, pen: 0, mistakes: 0, hints: 0, won: false, wonT: 0, ended: false,
      t: 0, pops: new Int32Array(81).fill(-999), shakes: new Int32Array(81).fill(-999), waves: [], clues: P.clues, botT: 0, L: layout(g.W, g.H),
    };
    for (let i = 0; i < 81; i++) if (P.puz[i]) { S.given[i] = 1; S.val[i] = P.puz[i]; }
    return S;
  }
  const isWrong = (S, i) => S.val[i] && S.val[i] !== S.sol[i];
  const seconds = S => Math.floor(S.frames / 60) + S.pen;
  function digitCount(S, d) { let n = 0; for (let i = 0; i < 81; i++) if (S.val[i] === d && S.val[i] === S.sol[i]) n++; return n; }
  function select(g, i) {
    const S = g.s;
    if (i < 0 || i > 80) return;
    S.sel = i;
    S.hl = S.val[i] && !isWrong(S, i) ? S.val[i] : 0;
    g.sfx('tick', { p: 0.9 + (i % 9) * 0.02 });
  }
  function moveSel(g, dx, dy) {
    const S = g.s;
    if (S.sel < 0) return select(g, 40);
    const r = (ROW[S.sel] + dy + 9) % 9, c = (COL[S.sel] + dx + 9) % 9;
    select(g, r * 9 + c);
  }
  function unitDone(S, u) { for (const i of u) if (S.val[i] !== S.sol[i]) return false; return true; }

  function input(g, d) {   // מספר מהמקלדת או מהלוח
    const S = g.s;
    if (S.won) return;
    if (S.sel < 0) { S.hl = d; g.msg(g.t('pickCell'), 900); return; }
    const i = S.sel;
    if (S.given[i] || (S.val[i] && !isWrong(S, i))) { S.hl = d; g.sfx('tick'); return; }
    if (S.notesMode) {
      if (S.val[i]) return;
      S.undo.push({ i, val: S.val[i], notes: S.notes[i], peers: [] });
      S.notes[i] ^= 1 << d;
      g.sfx('click', { p: 1 + d * 0.03 });
      return;
    }
    if (S.val[i] === d) return;
    put(g, i, d, false);
  }
  function put(g, i, d, hint) {
    const S = g.s, L = S.L;
    const rec = { i, val: S.val[i], notes: S.notes[i], peers: [] };
    S.val[i] = d; S.notes[i] = 0; S.pops[i] = S.t;
    const x = L.bx + COL[i] * L.cs + L.cs / 2, y = L.by + ROW[i] * L.cs + L.cs / 2;
    if (d !== S.sol[i]) {
      S.undo.push(rec);
      S.mistakes++; S.pen += PEN_MISTAKE; S.shakes[i] = S.t; S.hl = d;
      g.sfx('error'); g.shake(3);
      g.float(x, y - L.cs * 0.3, '+0:' + PEN_MISTAKE, { color: '#ff6b6b', size: 22 });
      return;
    }
    for (const p of PEERS[i]) if (S.notes[p] & (1 << d)) { rec.peers.push([p, S.notes[p]]); S.notes[p] &= ~(1 << d); }
    if (hint) { S.hinted[i] = 1; S.hints++; S.pen += PEN_HINT; g.float(x, y - L.cs * 0.3, '+0:' + PEN_HINT, { color: '#c9a7ff', size: 22 }); g.sfx('power'); }
    else S.undo.push(rec);
    S.hl = d;
    g.burst(x, y, { n: 8, color: ['#7fb2ff', '#ffffff', '#b9d4ff'], speed: 2.2, life: 22, size: 4, gravity: 0 });
    let done = 0;
    for (const u of [UNITS[ROW[i] * 3], UNITS[COL[i] * 3 + 1], UNITS[BOX[i] * 3 + 2]]) if (unitDone(S, u)) { S.waves.push({ cells: u, from: i, t0: S.t }); done++; }
    if (digitCount(S, d) === 9) { done++; g.sfx('power', { p: 1.1 }); }
    if (!hint) g.sfx(done ? 'coin' : 'place', { p: done ? 1 + done * 0.08 : 1 + d * 0.02 });
    if (S.val.every((v, k) => v === S.sol[k])) win(g, i);
  }
  function erase(g) {
    const S = g.s, i = S.sel;
    if (S.won || i < 0 || S.given[i] || (S.val[i] && !isWrong(S, i))) { g.sfx('tick', { p: 0.7 }); return; }
    if (!S.val[i] && !S.notes[i]) return;
    S.undo.push({ i, val: S.val[i], notes: S.notes[i], peers: [] });
    S.val[i] = 0; S.notes[i] = 0;
    g.sfx('whoosh');
  }
  function undo(g) {
    const S = g.s;
    if (S.won) return;
    const u = S.undo.pop();
    if (!u) { g.sfx('error'); return; }
    S.val[u.i] = u.val; S.notes[u.i] = u.notes;
    for (const [p, n] of u.peers) S.notes[p] = n;
    S.sel = u.i; S.hl = u.val && !isWrong(S, u.i) ? u.val : 0;
    g.sfx('whoosh');
  }
  function hint(g) {
    const S = g.s;
    if (S.won) return;
    let i = S.sel;
    if (i < 0 || S.given[i] || (S.val[i] && !isWrong(S, i))) {
      // המשבצת הריקה עם הכי מעט אפשרויות
      let bestN = 99; i = -1;
      for (let k = 0; k < 81; k++) if (!S.val[k] || isWrong(S, k)) {
        let m = ALL;
        for (const p of PEERS[k]) if (S.val[p] && !isWrong(S, p)) m &= ~(1 << S.val[p]);
        if (POP[m] < bestN) { bestN = POP[m]; i = k; }
      }
      if (i < 0) return;
      S.sel = i;
    }
    put(g, i, S.sol[i], true);
  }
  function win(g, last) {
    const S = g.s;
    S.won = true; S.wonT = 0; S.sel = -1; S.hl = 0;
    const all = []; for (let k = 0; k < 81; k++) all.push(k);
    S.waves.push({ cells: all, from: last, t0: S.t, big: true });
    g.sfx('win');
    g.msg(g.t('solved'), 1500, '#9fe7ff');
  }

  // ---------- ציור ----------
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, g.W, g.H);
    gr.addColorStop(0, '#173058'); gr.addColorStop(1, '#0c1830');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    ctx.save();
    ctx.globalAlpha = 0.045; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      const x = (i * 211 + t * 0.12 * (1 + i % 3)) % (g.W + 80) - 40, y = (i * 137 + 20) % g.H;
      g.text(ctx, String(1 + i % 9), x, y, { size: 30 + (i % 4) * 14, weight: 900, color: '#ffffff' });
    }
    ctx.restore();
  }
  function btn(g, ctx, R, on, hot) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    const gr = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    if (on) { gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#3f8ff0'); }
    else if (hot) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe8f7'); }
    else { gr.addColorStop(0, '#f4f8ff'); gr.addColorStop(1, '#d5e0f2'); }
    g.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
  }
  function drawPanel(g, ctx) {
    const S = g.s, L = S.L;
    for (const P of L.pad) {
      const left = 9 - digitCount(S, P.d), done = left <= 0;
      ctx.save();
      if (done) ctx.globalAlpha = 0.45;
      btn(g, ctx, P, S.hl === P.d && !done, false);
      const big = L.port ? 40 : 44;
      if (S.notesMode && !done) {
        g.text(ctx, String(P.d), P.x + P.w / 2, P.y + P.h * 0.42, { size: big * 0.62, weight: 800, color: '#5a6c92' });
        ctx.strokeStyle = 'rgba(90,108,146,.5)'; ctx.lineWidth = 2; g.rr(ctx, P.x + P.w * 0.26, P.y + P.h * 0.18, P.w * 0.48, P.h * 0.48, 8); ctx.stroke();
      } else g.text(ctx, String(P.d), P.x + P.w / 2, P.y + P.h * 0.44, { size: big, weight: 900, color: S.hl === P.d && !done ? '#ffffff' : '#1d3a72' });
      g.text(ctx, done ? '✓' : String(left), P.x + P.w / 2, P.y + P.h * 0.82, { size: 15, weight: 800, color: S.hl === P.d && !done ? '#e8f4ff' : '#6d7fa3' });
      ctx.restore();
    }
    const icons = ['✏️', '⌫', '↶', '💡'];
    L.tools.forEach((R, k) => {
      const on = k === 0 && S.notesMode;
      btn(g, ctx, R, on, false);
      const lab = g.t(TOOLS[k]);
      const iy = L.port ? R.y + R.h * 0.36 : R.y + R.h * 0.36;
      g.text(ctx, icons[k], R.x + R.w / 2, iy, { size: 24, weight: 700, color: on ? '#ffffff' : '#2b4a86' });
      g.text(ctx, lab, R.x + R.w / 2, R.y + R.h * 0.76, { size: 17, weight: 800, color: on ? '#ffffff' : '#2b4a86', maxW: R.w - 12 });
      if (k === 0) { g.circle(ctx, R.x + R.w - 14, R.y + 14, 6); ctx.fillStyle = on ? '#b7ff9a' : '#9aa9c4'; ctx.fill(); }
    });
    // מידע: רמה והתקדמות
    const I = L.info;
    g.rr(ctx, I.x, I.y, I.w, I.h, 16); ctx.fillStyle = '#1b3159'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; ctx.stroke();
    let filled = 0; for (let i = 0; i < 81; i++) if (S.val[i] && S.val[i] === S.sol[i]) filled++;
    const diffName = g.t(['easy', 'medium', 'hard'][S.diff]), ty = I.y + (L.port ? 20 : 28);
    // שם הרמה בצד שבו מתחילים לקרוא, האחוזים בצד השני
    g.text(ctx, diffName, g.rtl ? I.x + I.w - 18 : I.x + 18, ty, { size: 20, weight: 800, color: '#bfe3ff', align: g.rtl ? 'right' : 'left', maxW: I.w * 0.6 });
    g.text(ctx, Math.round(filled / 81 * 100) + '%', g.rtl ? I.x + 18 : I.x + I.w - 18, ty, { size: 20, weight: 800, color: '#ffffff', align: g.rtl ? 'left' : 'right' });
    const by = I.y + (L.port ? 40 : 54), bw = I.w - 36;
    g.rr(ctx, I.x + 18, by, bw, 14, 7); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
    const pg = ctx.createLinearGradient(I.x, 0, I.x + bw, 0); pg.addColorStop(0, '#5ec8ff'); pg.addColorStop(1, '#9cf29b');
    g.rr(ctx, I.x + 18, by, Math.max(14, bw * filled / 81), 14, 7); ctx.fillStyle = pg; ctx.fill();
  }

  function drawBoard(g, ctx) {
    const S = g.s, L = S.L, cs = L.cs, t = S.t;
    const sel = S.sel, hl = S.hl;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    g.rr(ctx, L.bx - 6, L.by - 6, L.B + 12, L.B + 12, 16); ctx.fillStyle = '#26406e'; ctx.fill();
    ctx.restore();
    for (let i = 0; i < 81; i++) {
      const x = L.bx + COL[i] * cs, y = L.by + ROW[i] * cs;
      let col = BOX[i] % 2 ? '#f1f5fc' : '#fdfdfb';
      if (sel >= 0 && (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel])) col = '#dce8fb';
      if (hl && S.val[i] === hl && !isWrong(S, i)) col = '#b8d2fb';
      if (isWrong(S, i)) col = '#ffdcdc';
      if (i === sel) col = '#93bbf7';
      ctx.fillStyle = col; ctx.fillRect(x, y, cs, cs);
    }
    // גלים של שורה/עמודה/ריבוע שהושלמו
    for (let w = S.waves.length - 1; w >= 0; w--) {
      const W = S.waves[w], age = t - W.t0;
      if (age > (W.big ? 110 : 60)) { S.waves.splice(w, 1); continue; }
      for (const i of W.cells) {
        const d = Math.abs(ROW[i] - ROW[W.from]) + Math.abs(COL[i] - COL[W.from]);
        const q = (age - d * (W.big ? 4 : 3)) / 22;
        if (q <= 0 || q >= 1) continue;
        ctx.fillStyle = W.big ? 'rgba(255,214,90,' + (Math.sin(q * Math.PI) * 0.75) + ')' : 'rgba(120,230,170,' + (Math.sin(q * Math.PI) * 0.6) + ')';
        ctx.fillRect(L.bx + COL[i] * cs, L.by + ROW[i] * cs, cs, cs);
      }
    }
    // קווים
    ctx.strokeStyle = '#bcc7da'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 1; k < 9; k++) if (k % 3) { ctx.moveTo(L.bx + k * cs, L.by); ctx.lineTo(L.bx + k * cs, L.by + L.B); ctx.moveTo(L.bx, L.by + k * cs); ctx.lineTo(L.bx + L.B, L.by + k * cs); }
    ctx.stroke();
    ctx.strokeStyle = '#2c4270'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 3; k < 9; k += 3) { ctx.moveTo(L.bx + k * cs, L.by); ctx.lineTo(L.bx + k * cs, L.by + L.B); ctx.moveTo(L.bx, L.by + k * cs); ctx.lineTo(L.bx + L.B, L.by + k * cs); }
    ctx.stroke();
    g.rr(ctx, L.bx, L.by, L.B, L.B, 6); ctx.lineWidth = 4; ctx.stroke();
    // ספרות והערות
    for (let i = 0; i < 81; i++) {
      const x = L.bx + COL[i] * cs, y = L.by + ROW[i] * cs, v = S.val[i];
      if (v) {
        const wrong = isWrong(S, i);
        const pa = t - S.pops[i], sa = t - S.shakes[i];
        const sc = pa >= 0 && pa < 12 ? 1 + Math.sin(pa / 12 * Math.PI) * 0.28 : 1;
        const sx = sa >= 0 && sa < 18 ? Math.sin(sa * 1.6) * (18 - sa) * 0.35 : 0;
        const color = S.given[i] ? '#1b2a4c' : wrong ? '#e3343a' : S.hinted[i] ? '#8a4fe0' : '#2a6ce0';
        g.text(ctx, String(v), x + cs / 2 + sx, y + cs * 0.53, { size: cs * 0.6 * sc, weight: S.given[i] ? 900 : 700, color });
      } else if (S.notes[i]) {
        for (let d = 1; d <= 9; d++) if (S.notes[i] & (1 << d)) {
          const nx = x + cs * (0.2 + ((d - 1) % 3) * 0.3), ny = y + cs * (0.2 + ((d - 1) / 3 | 0) * 0.3);
          if (d === hl) { g.circle(ctx, nx, ny, cs * 0.14); ctx.fillStyle = '#3f8ff0'; ctx.fill(); }
          g.text(ctx, String(d), nx, ny + 1, { size: cs * 0.23, weight: 800, color: d === hl ? '#ffffff' : '#6b7a99' });
        }
      }
    }
    if (sel >= 0) {
      const x = L.bx + COL[sel] * cs, y = L.by + ROW[sel] * cs;
      ctx.strokeStyle = '#2a6ce0'; ctx.lineWidth = 3;
      g.rr(ctx, x + 1.5, y + 1.5, cs - 3, cs - 3, 5); ctx.stroke();
    }
  }

  // תמונה לרקע התפריט: חידה קבועה (זרע קבוע), חצי פתורה
  function demoState(g) {
    const S = newState(g, 0, g.seeded(2026));
    let k = 0;
    for (let i = 0; i < 81; i++) if (!S.given[i] && (k++ % 3 === 0)) S.val[i] = S.sol[i];
    S.notes[S.val.findIndex(v => !v)] = (1 << 2) | (1 << 5) | (1 << 7);
    S.sel = 40; S.hl = S.val[40] || 0;
    return S;
  }

  GK.register('sudoku', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#0f1e3a', accent: '#5ec8ff',
    diffs: true,
    lowerIsBetter: true,
    fmt: v => mmss(v),
    text: TXT,

    init(g) {
      g.s = g.demo ? demoState(g) : newState(g, g.diff, Math.random);
      g.score = 0;
    },

    step(g) {
      const S = g.s;
      S.t++;
      if (!S.won) S.frames++;
      for (const c of g.hits) {
        if (c.startsWith('Digit') || c.startsWith('Numpad')) {
          const d = +c.slice(c.startsWith('Digit') ? 5 : 6);
          if (d >= 1 && d <= 9) input(g, d); else if (d === 0) erase(g);
        } else if (c === 'ArrowLeft' || c === 'KeyA') moveSel(g, -1, 0);
        else if (c === 'ArrowRight' || c === 'KeyD') moveSel(g, 1, 0);
        else if (c === 'ArrowUp' || c === 'KeyW') moveSel(g, 0, -1);
        else if (c === 'ArrowDown' || c === 'KeyS') moveSel(g, 0, 1);
        else if (c === 'Backspace' || c === 'Delete') erase(g);
        else if (c === 'KeyN' || c === 'Space') { S.notesMode = !S.notesMode; g.sfx('click'); }
        else if (c === 'KeyZ') undo(g);
        else if (c === 'KeyH') hint(g);
      }
      if (S.won) {
        if (S.pausedEnd) { S.pausedEnd = false; S.wonT = Math.min(S.wonT, 70); }   // אחרי השהיה: עוד חצי שנייה של החגיגה
        S.wonT++;
        if (S.wonT === 20) for (let k = 0; k < 5; k++) g.burst(S.L.bx + S.L.B * (0.1 + k * 0.2), S.L.by + S.L.B * 0.4, { n: 26, color: ['#ffd65a', '#7fd0ff', '#9cf29b', '#ff8fb0', '#ffffff'], speed: 6, life: 70, size: 6, shape: 'square', gravity: 0.12 });
        if (S.wonT === 100 && !S.ended) {
          S.ended = true;
          g.end({ score: seconds(S), result: 'win', scoreLabel: g.t('time'), text: g.t('endText', { m: S.mistakes, h: S.hints }), delay: 500 });
        }
      }
      const b = g.getBest();
      g.hud([[g.t('time'), mmss(seconds(S))], [g.t('mistakes'), S.mistakes, S.mistakes ? '#ff8a8a' : null], [g.t('best'), b === null ? '—' : mmss(b)]]);
    },

    idle(g) { if (g.s) g.s.t++; },
    onPause(g) { if (g.s) g.s.pausedEnd = true; },

    // בוט לבדיקות: בוחר משבצת ריקה וכותב בה דרך אותן פעולות של השחקן (לפעמים טועה, לפעמים כותב הערה)
    bot(g) {
      const S = g.s;
      if (S.won || ++S.botT < 5) return;
      S.botT = 0;
      if (S.sel < 0 || (S.val[S.sel] && !isWrong(S, S.sel))) {
        const empt = []; for (let i = 0; i < 81; i++) if (!S.val[i] || isWrong(S, i)) empt.push(i);
        if (empt.length) select(g, empt[Math.floor(Math.random() * empt.length)]);
        return;
      }
      const i = S.sel;
      if (isWrong(S, i)) { erase(g); return; }
      if (S.notesMode) { S.notesMode = false; return; }
      const r = Math.random();
      if (r < 0.04) { input(g, (S.sol[i] % 9) + 1); return; }
      if (r < 0.08) { S.notesMode = true; input(g, S.sol[i]); return; }
      input(g, S.sol[i]);
    },

    onPointer(g, type, p) {
      if (type !== 'down') return;
      const S = g.s, L = S.L;
      if (p.x >= L.bx && p.y >= L.by && p.x < L.bx + L.B && p.y < L.by + L.B) {
        const c = Math.floor((p.x - L.bx) / L.cs), r = Math.floor((p.y - L.by) / L.cs);
        select(g, r * 9 + c);
        if (p.button === 2) erase(g);
        return;
      }
      for (const P of L.pad) if (inR(p, P)) { input(g, P.d); return; }
      L.tools.forEach((R, k) => {
        if (!inR(p, R)) return;
        if (k === 0) { S.notesMode = !S.notesMode; g.sfx('click'); }
        else if (k === 1) erase(g);
        else if (k === 2) undo(g);
        else hint(g);
      });
    },

    draw(g, ctx) {
      const S = g.s;
      drawBg(g, ctx, S.t);
      drawBoard(g, ctx);
      drawPanel(g, ctx);
    },

    cover(ctx, w, h, k) {
      const g = Object.assign(Object.create(k), { W: w, H: h });
      const S = { t: 0 };
      g.s = S;
      drawBg(g, ctx, 0);
      // לוח מוטה עם ספרות
      const P = makePuzzle(0, k.seeded(77));
      ctx.save();
      ctx.translate(w * 0.5, h * 0.53); ctx.rotate(-0.07);
      const cs = 50, B = cs * 9;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
      k.rr(ctx, -B / 2 - 8, -B / 2 - 8, B + 16, B + 16, 18); ctx.fillStyle = '#26406e'; ctx.fill(); ctx.restore();
      for (let i = 0; i < 81; i++) {
        const x = -B / 2 + COL[i] * cs, y = -B / 2 + ROW[i] * cs;
        let col = BOX[i] % 2 ? '#f1f5fc' : '#fdfdfb';
        if (ROW[i] === 4 || COL[i] === 4 || BOX[i] === 4) col = '#dce8fb';
        if (P.sol[i] === 7) col = '#b8d2fb';
        if (i === 40) col = '#93bbf7';
        ctx.fillStyle = col; ctx.fillRect(x, y, cs, cs);
      }
      ctx.strokeStyle = '#bcc7da'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let q = 1; q < 9; q++) if (q % 3) { ctx.moveTo(-B / 2 + q * cs, -B / 2); ctx.lineTo(-B / 2 + q * cs, B / 2); ctx.moveTo(-B / 2, -B / 2 + q * cs); ctx.lineTo(B / 2, -B / 2 + q * cs); }
      ctx.stroke();
      ctx.strokeStyle = '#2c4270'; ctx.lineWidth = 3.5; ctx.beginPath();
      for (let q = 3; q < 9; q += 3) { ctx.moveTo(-B / 2 + q * cs, -B / 2); ctx.lineTo(-B / 2 + q * cs, B / 2); ctx.moveTo(-B / 2, -B / 2 + q * cs); ctx.lineTo(B / 2, -B / 2 + q * cs); }
      ctx.stroke(); ctx.strokeRect(-B / 2, -B / 2, B, B);
      for (let i = 0; i < 81; i++) {
        const show = P.puz[i] || P.sol[i] === 7 || i % 4 === 0;
        if (!show) continue;
        const x = -B / 2 + COL[i] * cs + cs / 2, y = -B / 2 + ROW[i] * cs + cs * 0.53;
        k.text(ctx, String(P.sol[i]), x, y, { size: 30, weight: P.puz[i] ? 900 : 700, color: P.puz[i] ? '#1b2a4c' : '#2a6ce0' });
      }
      ctx.restore();
      // עיפרון
      ctx.save();
      ctx.translate(w * 0.86, h * 0.62); ctx.rotate(-0.75);
      const gr = ctx.createLinearGradient(-18, 0, 18, 0); gr.addColorStop(0, '#ffcf4a'); gr.addColorStop(1, '#f39c12');
      k.rr(ctx, -18, -150, 36, 220, 6); ctx.fillStyle = gr; ctx.fill();
      ctx.fillStyle = '#ff8fb0'; k.rr(ctx, -18, -170, 36, 30, 8); ctx.fill();
      ctx.fillStyle = '#c0c6d0'; ctx.fillRect(-18, -146, 36, 12);
      ctx.fillStyle = '#f5deb3'; ctx.beginPath(); ctx.moveTo(-18, 70); ctx.lineTo(18, 70); ctx.lineTo(0, 118); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(-6, 102); ctx.lineTo(6, 102); ctx.lineTo(0, 118); ctx.closePath(); ctx.fill();
      ctx.restore();
      // כוכבים
      for (let i = 0; i < 16; i++) {
        const x = (i * 157 + 30) % w, y = (i * 83 + 20) % h, r = 2 + (i % 3);
        if (x > w * 0.22 && x < w * 0.78) continue;
        ctx.fillStyle = ['#ffd65a', '#9fe7ff', '#ffffff'][i % 3]; ctx.globalAlpha = 0.85;
        g.circle(ctx, x, y, r); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    _core: { countSolutions, fullGrid, logicSolve, makePuzzle, ROW, COL, BOX },
  });
})();
