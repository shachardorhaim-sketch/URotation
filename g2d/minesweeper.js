// ============================================================
//  שדה מוקשים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שלושה גדלים. הלחיצה הראשונה תמיד בטוחה ופותחת שטח, והמוקשים נבנים רק אחריה:
//  כל לוח עובר פותר הגיוני, כך שאפשר לפתור אותו בלי לנחש.
//  קליק ימני / לחיצה ארוכה = דגל, לחיצה על מספר עם מספיק דגלים = פתיחת השכנים.
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const SIZES = [{ w: 9, h: 9, m: 10 }, { w: 16, h: 16, m: 40 }, { w: 30, h: 16, m: 99 }];
  const NUMC = [null, '#1e63d6', '#2e8b3a', '#d7263d', '#1a237e', '#8b1a1a', '#00897b', '#212121', '#6f6f6f'];
  const HID = 0, OPEN = 1, FLAG = 2;
  const LONG = 24;   // לחיצה ארוכה: 0.4 שנייה

  // ---------- שכנים ----------
  const nbCache = {};
  function neighbors(W, H) {
    const key = W + 'x' + H;
    if (nbCache[key]) return nbCache[key];
    const nb = [];
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0, a = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) a.push(ny * W + nx);
      }
      nb.push(a);
    }
    return (nbCache[key] = nb);
  }
  function numbers(W, H, mine) {
    const nb = neighbors(W, H), num = new Int8Array(W * H);
    for (let i = 0; i < W * H; i++) { if (mine[i]) { num[i] = -1; continue; } let n = 0; for (const j of nb[i]) n += mine[j]; num[i] = n; }
    return num;
  }

  // ---------- פותר הגיוני: משחק רק לפי מה שרואים (מספרים ודגלים) ----------
  // state: Uint8Array של HID/OPEN/FLAG. מחזיר {safe:[...], mines:[...]} — מה שבטוח לדעת עכשיו.
  function deduce(W, H, M, state, num) {
    const nb = neighbors(W, H), N = W * H;
    const safe = new Set(), mines = new Set();
    const cons = [];
    for (let i = 0; i < N; i++) {
      if (state[i] !== OPEN || num[i] <= 0) continue;
      const unk = [];
      let fl = 0;
      for (const j of nb[i]) { if (state[j] === FLAG) fl++; else if (state[j] === HID) unk.push(j); }
      if (!unk.length) continue;
      const need = num[i] - fl;
      if (need === 0) unk.forEach(j => safe.add(j));
      else if (need === unk.length) unk.forEach(j => mines.add(j));
      else cons.push({ cells: unk, need });
    }
    if (safe.size || mines.size) return { safe: [...safe], mines: [...mines] };
    // זוגות אילוצים חופפים (כולל תת-קבוצה): כמה מוקשים יכולים להיות בחיתוך
    const byCell = new Map();
    cons.forEach((c, k) => c.cells.forEach(j => { if (!byCell.has(j)) byCell.set(j, []); byCell.get(j).push(k); }));
    for (let a = 0; a < cons.length; a++) {
      const A = cons[a], seen = new Set();
      for (const j of A.cells) for (const b of byCell.get(j)) {
        if (b === a || seen.has(b)) continue;
        seen.add(b);
        const B = cons[b];
        const inter = A.cells.filter(x => B.cells.includes(x));
        const bOnly = B.cells.filter(x => !A.cells.includes(x));
        const aOnly = A.cells.length - inter.length;
        const maxI = Math.min(inter.length, A.need, B.need);
        const minI = Math.max(0, A.need - aOnly, B.need - bOnly.length);
        if (!bOnly.length) continue;
        if (B.need - maxI === bOnly.length) bOnly.forEach(x => mines.add(x));
        if (B.need - minI === 0) bOnly.forEach(x => safe.add(x));
      }
      if (safe.size || mines.size) return { safe: [...safe], mines: [...mines] };
    }
    // ספירה כללית של המוקשים שנשארו
    let flags = 0, hid = 0;
    for (let i = 0; i < N; i++) { if (state[i] === FLAG) flags++; else if (state[i] === HID) hid++; }
    if (hid && M - flags === 0) for (let i = 0; i < N; i++) if (state[i] === HID) safe.add(i);
    if (hid && M - flags === hid) for (let i = 0; i < N; i++) if (state[i] === HID) mines.add(i);
    return { safe: [...safe], mines: [...mines] };
  }
  function flood(W, H, state, num, i, out) {
    const nb = neighbors(W, H), st = [i];
    while (st.length) {
      const k = st.pop();
      if (state[k] !== HID) continue;
      state[k] = OPEN; if (out) out.push(k);
      if (num[k] === 0) for (const j of nb[k]) if (state[j] === HID) st.push(j);
    }
  }
  // האם הלוח נפתר מהלחיצה הראשונה בהיגיון בלבד
  function solvable(W, H, M, mine, num, first) {
    const state = new Uint8Array(W * H);
    flood(W, H, state, num, first);
    for (let guard = 0; guard < W * H * 2; guard++) {
      const d = deduce(W, H, M, state, num);
      if (!d.safe.length && !d.mines.length) break;
      for (const j of d.mines) state[j] = FLAG;
      for (const j of d.safe) { if (mine[j]) return { ok: false, open: 0, bad: true }; flood(W, H, state, num, j); }
    }
    let open = 0;
    for (let i = 0; i < W * H; i++) if (state[i] === OPEN) open++;
    return { ok: open === W * H - M, open };
  }
  function layMines(W, H, M, first, rnd) {
    const nb = neighbors(W, H), N = W * H, ban = new Uint8Array(N);
    ban[first] = 1; for (const j of nb[first]) ban[j] = 1;
    const cells = [];
    for (let i = 0; i < N; i++) if (!ban[i]) cells.push(i);
    const mine = new Uint8Array(N);
    for (let k = 0; k < M; k++) { const r = k + Math.floor(rnd() * (cells.length - k)); const t = cells[k]; cells[k] = cells[r]; cells[r] = t; mine[cells[k]] = 1; }
    return mine;
  }
  // מנסה לוחות עד שנמצא אחד שנפתר בלי ניחוש (או עד שנגמר הזמן — ואז הכי טוב שנמצא)
  function makeBoard(W, H, M, first, rnd, budget) {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t0 = now();
    let best = null;
    for (let tries = 1; ; tries++) {
      const mine = layMines(W, H, M, first, rnd), num = numbers(W, H, mine);
      const r = solvable(W, H, M, mine, num, first);
      if (r.ok) return { mine, num, logic: true, tries };
      if (!best || r.open > best.open) best = { mine, num, logic: false, tries, open: r.open };
      if (now() - t0 > budget && tries >= 3) { best.tries = tries; return best; }
    }
  }

  // ---------- טקסטים ----------
  const TXT = {
    he: { title: 'שדה מוקשים', help: ['לחץ על משבצת כדי לחשוף אותה. המספר אומר כמה מוקשים נוגעים בה', 'קליק ימני — דגל על מוקש. הלחיצה הראשונה תמיד בטוחה', 'לחיצה על מספר שיש לידו מספיק דגלים חושפת את כל השכנים', 'כל לוח נפתר בהיגיון — חשוף את כל המשבצות הבטוחות!'], helpTouch: ['הקש על משבצת כדי לחשוף אותה. המספר אומר כמה מוקשים נוגעים בה', 'לחיצה ארוכה או מצב 🚩 — דגל. ההקשה הראשונה תמיד בטוחה', 'הקשה על מספר עם מספיק דגלים חושפת את כל השכנים', 'בלוח גדול: 🔍 מגדיל, וגרירה מזיזה את הלוח'], beginner: 'מתחיל', intermediate: 'בינוני', expert: 'מומחה', mines: 'מוקשים', dig: 'חשיפה', flag: 'דגל', zoomIn: 'הגדל', zoomOut: 'הקטן', boom: 'בום!', loseText: 'חשפת {n}% מהשדה. נסה שוב!', cleared: 'השדה נקי!' },
    en: { title: 'Minesweeper', help: ['Click a cell to uncover it. A number tells how many mines touch it', 'Right-click — put a flag on a mine. The first click is always safe', 'Clicking a number with enough flags around it opens all its neighbours', 'Every board can be solved with logic — uncover all the safe cells!'], helpTouch: ['Tap a cell to uncover it. A number tells how many mines touch it', 'Long-press or 🚩 mode — place a flag. The first tap is always safe', 'Tapping a number with enough flags opens all its neighbours', 'On big boards: 🔍 zooms in, dragging moves the board'], beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert', mines: 'Mines', dig: 'Dig', flag: 'Flag', zoomIn: 'Zoom in', zoomOut: 'Zoom out', boom: 'Boom!', loseText: 'You cleared {n}% of the field. Try again!', cleared: 'Field cleared!' },
    ar: { title: 'كاسحة الألغام', help: ['اضغط على خانة لكشفها. الرقم يخبرك كم لغماً يلمسها', 'زر الفأرة الأيمن — ضع علماً على لغم. النقرة الأولى آمنة دائماً', 'النقر على رقم حوله أعلام كافية يكشف كل جيرانه', 'كل لوحة تُحل بالمنطق — اكشف كل الخانات الآمنة!'], helpTouch: ['المس خانة لكشفها. الرقم يخبرك كم لغماً يلمسها', 'ضغطة طويلة أو وضع 🚩 — ضع علماً. اللمسة الأولى آمنة دائماً', 'لمس رقم حوله أعلام كافية يكشف كل جيرانه', 'في اللوحات الكبيرة: 🔍 للتكبير، والسحب يحرّك اللوحة'], beginner: 'مبتدئ', intermediate: 'متوسط', expert: 'خبير', mines: 'الألغام', dig: 'كشف', flag: 'علم', zoomIn: 'تكبير', zoomOut: 'تصغير', boom: 'بوم!', loseText: 'كشفت {n}% من الحقل. حاول مجدداً!', cleared: 'الحقل نظيف!' },
    es: { title: 'Buscaminas', help: ['Haz clic en una casilla para descubrirla. El número dice cuántas minas la tocan', 'Clic derecho — pon una bandera en una mina. El primer clic siempre es seguro', 'Hacer clic en un número con banderas suficientes abre todos sus vecinos', 'Cada tablero se resuelve con lógica: ¡descubre todas las casillas seguras!'], helpTouch: ['Toca una casilla para descubrirla. El número dice cuántas minas la tocan', 'Mantén pulsado o usa el modo 🚩 para poner una bandera. El primer toque es seguro', 'Tocar un número con banderas suficientes abre sus vecinos', 'En tableros grandes: 🔍 acerca y arrastrar mueve el tablero'], beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Experto', mines: 'Minas', dig: 'Cavar', flag: 'Bandera', zoomIn: 'Acercar', zoomOut: 'Alejar', boom: '¡Bum!', loseText: 'Despejaste el {n}% del campo. ¡Inténtalo otra vez!', cleared: '¡Campo despejado!' },
    fr: { title: 'Démineur', help: ['Clique sur une case pour la découvrir. Le chiffre dit combien de mines la touchent', 'Clic droit — un drapeau sur une mine. Le premier clic est toujours sûr', 'Cliquer un chiffre entouré d’assez de drapeaux ouvre tous ses voisins', 'Chaque grille se résout par la logique : découvre toutes les cases sûres !'], helpTouch: ['Touche une case pour la découvrir. Le chiffre dit combien de mines la touchent', 'Appui long ou mode 🚩 — un drapeau. Le premier appui est toujours sûr', 'Toucher un chiffre avec assez de drapeaux ouvre ses voisins', 'Sur les grandes grilles : 🔍 zoome, glisser déplace la grille'], beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert', mines: 'Mines', dig: 'Creuser', flag: 'Drapeau', zoomIn: 'Zoomer', zoomOut: 'Dézoomer', boom: 'Boum !', loseText: 'Tu as dégagé {n} % du champ. Réessaie !', cleared: 'Champ déminé !' },
    pt: { title: 'Campo Minado', help: ['Clique numa casa para revelá-la. O número diz quantas minas a tocam', 'Clique direito — ponha uma bandeira numa mina. O primeiro clique é sempre seguro', 'Clicar num número com bandeiras suficientes abre todos os vizinhos', 'Todo tabuleiro se resolve com lógica: revele todas as casas seguras!'], helpTouch: ['Toque numa casa para revelá-la. O número diz quantas minas a tocam', 'Toque longo ou modo 🚩 — ponha uma bandeira. O primeiro toque é seguro', 'Tocar num número com bandeiras suficientes abre os vizinhos', 'Em tabuleiros grandes: 🔍 amplia e arrastar move o tabuleiro'], beginner: 'Iniciante', intermediate: 'Intermediário', expert: 'Especialista', mines: 'Minas', dig: 'Cavar', flag: 'Bandeira', zoomIn: 'Ampliar', zoomOut: 'Reduzir', boom: 'Bum!', loseText: 'Você limpou {n}% do campo. Tente de novo!', cleared: 'Campo limpo!' },
    ru: { title: 'Сапёр', help: ['Нажми на клетку, чтобы открыть её. Число — сколько мин её касается', 'Правый клик — флажок на мину. Первый клик всегда безопасен', 'Клик по числу, вокруг которого хватает флажков, открывает соседей', 'Каждое поле решается логикой — открой все безопасные клетки!'], helpTouch: ['Коснись клетки, чтобы открыть её. Число — сколько мин её касается', 'Долгое нажатие или режим 🚩 — флажок. Первое касание безопасно', 'Касание числа с нужным числом флажков открывает соседей', 'На больших полях: 🔍 увеличивает, перетаскивание двигает поле'], beginner: 'Новичок', intermediate: 'Любитель', expert: 'Эксперт', mines: 'Мины', dig: 'Копать', flag: 'Флажок', zoomIn: 'Увеличить', zoomOut: 'Уменьшить', boom: 'Бум!', loseText: 'Ты открыл {n}% поля. Попробуй ещё!', cleared: 'Поле разминировано!' },
    de: { title: 'Minensucher', help: ['Klicke auf ein Feld, um es aufzudecken. Die Zahl sagt, wie viele Minen es berühren', 'Rechtsklick — Fahne auf eine Mine. Der erste Klick ist immer sicher', 'Ein Klick auf eine Zahl mit genug Fahnen öffnet alle Nachbarn', 'Jedes Feld ist mit Logik lösbar — deck alle sicheren Felder auf!'], helpTouch: ['Tippe auf ein Feld, um es aufzudecken. Die Zahl sagt, wie viele Minen es berühren', 'Lang drücken oder 🚩-Modus — eine Fahne. Das erste Tippen ist sicher', 'Tippen auf eine Zahl mit genug Fahnen öffnet die Nachbarn', 'Auf großen Feldern: 🔍 vergrößert, Ziehen bewegt das Feld'], beginner: 'Anfänger', intermediate: 'Fortgeschritten', expert: 'Experte', mines: 'Minen', dig: 'Graben', flag: 'Fahne', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', boom: 'Bumm!', loseText: 'Du hast {n} % des Feldes geräumt. Versuch es nochmal!', cleared: 'Feld geräumt!' },
  };
  const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- פריסה ----------
  function layout(W, H, diff) {
    const port = H > W;
    const sz = SIZES[diff];
    const cols = port && sz.w > sz.h ? sz.h : sz.w, rows = port && sz.w > sz.h ? sz.w : sz.h;
    const area = port ? { x: 10, y: 10, w: W - 20, h: H - 104 } : { x: 20, y: 14, w: W - 40, h: H - 96 };
    const cs = Math.floor(Math.min(area.w / cols, area.h / rows, 64));
    const bw = cs * cols, bh = cs * rows;
    const L = { port, cols, rows, cs, bw, bh, bx: Math.round(area.x + (area.w - bw) / 2), by: Math.round(area.y + (area.h - bh) / 2), area };
    const ty = port ? H - 80 : H - 70;
    L.mode = { x: W / 2 - 150, y: ty, w: 300, h: 58 };
    L.zoom = { x: W / 2 + 166, y: ty, w: 58, h: 58 };
    L.view = { x: L.bx, y: L.by, w: bw, h: bh };
    return L;
  }

  // ---------- מצב ----------
  function newState(g, diff) {
    const L = layout(g.W, g.H, diff), sz = SIZES[diff];
    const N = L.cols * L.rows;
    return {
      diff, L, W: L.cols, H: L.rows, M: sz.m, N, mine: null, num: null, state: new Uint8Array(N), revT: new Float32Array(N).fill(-1e9),
      started: false, frames: 0, over: false, won: false, endT: 0, ended: false, boomAt: -1, reveal: [], wrongFlags: [], logic: null,
      flagMode: false, zoom: 1, cam: { x: L.bw / 2, y: L.bh / 2 }, press: null, cur: -1, kb: false, t: 0, botT: 0, hover: -1, opened: 0,
    };
  }
  const flagsCount = S => { let n = 0; for (let i = 0; i < S.N; i++) if (S.state[i] === FLAG) n++; return n; };
  const secs = S => Math.floor(S.frames / 60);

  // ---------- מצלמה (להגדלה בלוחות גדולים) ----------
  function clampCam(S) {
    const L = S.L, z = S.zoom;
    const hw = L.view.w / (2 * z), hh = L.view.h / (2 * z);
    S.cam.x = Math.max(hw, Math.min(L.bw - hw, S.cam.x));
    S.cam.y = Math.max(hh, Math.min(L.bh - hh, S.cam.y));
  }
  // נקודה בעולם → נקודה על הלוח (0..bw)
  function toBoard(S, p) { const L = S.L; return { x: (p.x - L.view.x - L.view.w / 2) / S.zoom + S.cam.x, y: (p.y - L.view.y - L.view.h / 2) / S.zoom + S.cam.y }; }
  function cellAt(S, p) {
    const L = S.L;
    if (p.x < L.view.x || p.y < L.view.y || p.x > L.view.x + L.view.w || p.y > L.view.y + L.view.h) return -1;
    const q = toBoard(S, p), c = Math.floor(q.x / L.cs), r = Math.floor(q.y / L.cs);
    if (c < 0 || r < 0 || c >= S.W || r >= S.H) return -1;
    return r * S.W + c;
  }
  // כמה פיקסלים במסך יש למשבצת (כדי לדעת אם צריך זכוכית מגדלת)
  function screenCell(g) { try { const r = g.canvas.getBoundingClientRect(); return g.s.L.cs * (r.width / g.W); } catch (e) { return 99; } }
  const needZoom = g => g.s.diff > 0 && screenCell(g) < 24;

  // ---------- פעולות ----------
  function firstClick(g, i) {
    const S = g.s;
    const r = makeBoard(S.W, S.H, S.M, i, Math.random, S.diff === 2 ? 260 : 160);
    S.mine = r.mine; S.num = r.num; S.logic = r.logic; S.tries = r.tries;
    S.started = true;
  }
  function open(g, i, quiet) {
    const S = g.s;
    if (S.over || i < 0) return;
    if (!S.started) firstClick(g, i);
    if (S.state[i] === FLAG) { g.sfx('tick', { p: 0.6 }); return; }
    if (S.state[i] === OPEN) { chord(g, i); return; }
    if (S.mine[i]) { lose(g, i); return; }
    const out = [];
    flood(S.W, S.H, S.state, S.num, i, out);
    const x0 = i % S.W, y0 = (i / S.W) | 0;
    for (const k of out) { const d = Math.hypot(k % S.W - x0, ((k / S.W) | 0) - y0); S.revT[k] = S.t + d * 1.6; }
    S.opened += out.length;
    if (!quiet) {
      g.sfx(out.length > 6 ? 'whoosh' : 'pop', { p: 0.9 + Math.random() * 0.2 });
      const c = cellCenter(S, i);
      g.burst(c.x, c.y, { n: Math.min(18, 4 + out.length), color: ['#6fbf4a', '#9fe070', '#c9a66b'], speed: 2.4, life: 26, size: 4, gravity: 0.12 });
    }
    checkWin(g, i);
  }
  function chord(g, i) {
    const S = g.s, nb = neighbors(S.W, S.H);
    if (S.state[i] !== OPEN || S.num[i] <= 0) return;
    let fl = 0; for (const j of nb[i]) if (S.state[j] === FLAG) fl++;
    if (fl !== S.num[i]) { S.nudge = { i, t: S.t }; g.sfx('tick', { p: 0.7 }); return; }
    let any = false;
    for (const j of nb[i]) if (S.state[j] === HID) {
      any = true;
      if (S.mine[j]) { lose(g, j); return; }
      open(g, j, true);
      if (S.over) return;
    }
    if (any) g.sfx('whoosh');
  }
  function toggleFlag(g, i) {
    const S = g.s;
    if (S.over || i < 0 || S.state[i] === OPEN) return;
    if (!S.started) { g.sfx('tick', { p: 0.6 }); return; }   // עוד אין מוקשים: דגל לפני החשיפה הראשונה לא עושה כלום
    S.state[i] = S.state[i] === FLAG ? HID : FLAG;
    S.revT[i] = S.t;
    g.sfx(S.state[i] === FLAG ? 'place' : 'tick', { p: S.state[i] === FLAG ? 1.2 : 0.8 });
  }
  function act(g, i, flagIt) {
    const S = g.s;
    if (i < 0 || S.over) return;
    if (S.state[i] === OPEN) chord(g, i);
    else if (flagIt) toggleFlag(g, i);
    else open(g, i);
  }
  function checkWin(g, last) {
    const S = g.s;
    if (S.over || S.opened < S.N - S.M) return;
    S.over = true; S.won = true; S.endT = 0; S.lastI = last;
    const c0 = cellCenter(S, last);
    // המוקשים מקבלים דגלים בגל
    for (let i = 0; i < S.N; i++) if (S.mine[i]) { const d = Math.hypot(i % S.W - last % S.W, ((i / S.W) | 0) - ((last / S.W) | 0)); S.revT[i] = S.t + 10 + d * 2.5; S.state[i] = FLAG; }
    g.sfx('win'); g.flash('#fff6c8', 0.25);
    g.msg(g.t('cleared'), 1500, '#c9ff9e');
    g.burst(c0.x, c0.y, { n: 40, color: ['#ffd65a', '#ff7a7a', '#7ad0ff', '#9cf29b', '#ffffff'], speed: 6, life: 60, size: 6, shape: 'square', gravity: 0.1 });
  }
  function lose(g, i) {
    const S = g.s;
    S.over = true; S.won = false; S.boomAt = i; S.endT = 0;
    S.state[i] = OPEN; S.revT[i] = S.t;
    const c = cellCenter(S, i);
    g.burst(c.x, c.y, { n: 46, color: ['#ff5a3c', '#ffcc33', '#ffffff', '#555555'], speed: 7, life: 50, size: 6 });
    g.shake(12); g.flash('#ff3b3b', 0.35); g.sfx('boom');
    // שאר המוקשים מתגלים לפי המרחק
    const list = [];
    for (let k = 0; k < S.N; k++) if (S.mine[k] && k !== i && S.state[k] !== FLAG) list.push(k);
    list.sort((a, b) => Math.hypot(a % S.W - i % S.W, ((a / S.W) | 0) - ((i / S.W) | 0)) - Math.hypot(b % S.W - i % S.W, ((b / S.W) | 0) - ((i / S.W) | 0)));
    const gap = Math.max(1, Math.min(5, Math.floor(80 / Math.max(1, list.length))));
    S.reveal = list.map((k, n) => ({ k, at: S.t + 20 + n * gap }));
    S.wrongFlags = [];
    for (let k = 0; k < S.N; k++) if (S.state[k] === FLAG && !S.mine[k]) S.wrongFlags.push(k);
    S.revealEnd = S.t + 20 + list.length * gap;
  }
  function cellCenter(S, i) {
    const L = S.L, bx = (i % S.W + 0.5) * L.cs, by = (((i / S.W) | 0) + 0.5) * L.cs;
    return { x: L.view.x + L.view.w / 2 + (bx - S.cam.x) * S.zoom, y: L.view.y + L.view.h / 2 + (by - S.cam.y) * S.zoom };
  }

  // ---------- ציור ----------
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, g.H);
    gr.addColorStop(0, '#24452c'); gr.addColorStop(1, '#13281a');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    ctx.globalAlpha = 0.07; ctx.fillStyle = '#c8f5a0';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97 + Math.sin(t * 0.01 + i) * 6) % g.W, y = (i * 61) % g.H;
      ctx.beginPath(); ctx.ellipse(x, y, 5, 12, Math.sin(i) * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawMine(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#1d1d24'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); ctx.lineTo(-Math.cos(a) * r * 1.25, -Math.sin(a) * r * 1.25); ctx.stroke(); }
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    gr.addColorStop(0, '#6a6a7a'); gr.addColorStop(1, '#16161c');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawFlag(ctx, x, y, s, wave) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#5b3a1e'; ctx.fillRect(-s * 0.04, -s * 0.34, s * 0.08, s * 0.62);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.22, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    const w = Math.sin(wave) * s * 0.03;
    ctx.fillStyle = '#e8242e';
    ctx.beginPath(); ctx.moveTo(s * 0.04, -s * 0.36); ctx.quadraticCurveTo(s * 0.2, -s * 0.3 + w, s * 0.34, -s * 0.2); ctx.lineTo(s * 0.04, -s * 0.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(s * 0.06, -s * 0.33); ctx.lineTo(s * 0.18, -s * 0.27); ctx.lineTo(s * 0.06, -s * 0.22); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawBoard(g, ctx) {
    const S = g.s, L = S.L, cs = L.cs, t = S.t, nb = neighbors(S.W, S.H);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    g.rr(ctx, L.view.x - 6, L.view.y - 6, L.view.w + 12, L.view.h + 12, 12); ctx.fillStyle = '#3b5d2e'; ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(L.view.x, L.view.y, L.view.w, L.view.h); ctx.clip();
    ctx.translate(L.view.x + L.view.w / 2 - S.cam.x * S.zoom, L.view.y + L.view.h / 2 - S.cam.y * S.zoom);
    ctx.scale(S.zoom, S.zoom);
    // התאים שנלחצים כרגע (לחיצה על מספר מדגישה שכנים)
    const pressed = new Set();
    if (S.press && !S.press.moved && S.press.i >= 0 && !S.over) {
      const i = S.press.i;
      if (S.state[i] === OPEN && S.num && S.num[i] > 0) { for (const j of nb[i]) if (S.state[j] === HID) pressed.add(j); }
      else if (S.state[i] === HID && !S.flagMode && !S.press.long) pressed.add(i);
    }
    const ns = cs * 0.62;
    for (let i = 0; i < S.N; i++) {
      const c = i % S.W, r = (i / S.W) | 0, x = c * cs, y = r * cs, st = S.state[i];
      const odd = (c + r) % 2;
      const rq = (t - S.revT[i]) / 9;       // 0..1 מעבר מדשא לחול
      const showOpen = st === OPEN && rq >= 0;
      if (showOpen) {
        ctx.fillStyle = S.boomAt === i ? '#ff5b4a' : odd ? '#e6cfa4' : '#efdcb6';
        ctx.fillRect(x, y, cs, cs);
        if (S.num && S.num[i] > 0) {
          const sc = rq < 1 ? 0.6 + g.ease.back(Math.min(1, rq)) * 0.4 : 1;
          let nx = 0;
          if (S.nudge && S.nudge.i === i && t - S.nudge.t < 14) nx = Math.sin((t - S.nudge.t) * 1.8) * 3;
          g.text(ctx, String(S.num[i]), x + cs / 2 + nx, y + cs * 0.54, { size: ns * sc, weight: 900, color: NUMC[S.num[i]] });
        }
        if (S.mine && S.mine[i]) drawMine(ctx, x + cs / 2, y + cs / 2, cs * 0.26, t);
      } else {
        let col = odd ? '#86c862' : '#93d36d';
        if (pressed.has(i)) col = odd ? '#a9dc8a' : '#b3e294';
        else if (i === S.hover && !S.over) col = odd ? '#9bd77a' : '#a6dd84';
        ctx.fillStyle = col; ctx.fillRect(x, y, cs, cs);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, cs, Math.max(1.5, cs * 0.08));
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y + cs - Math.max(1.5, cs * 0.08), cs, Math.max(1.5, cs * 0.08));
        if (st === FLAG) {
          const fq = Math.min(1, Math.max(0, (t - S.revT[i]) / 10));
          if (fq > 0) {
            ctx.save(); ctx.translate(x + cs / 2, y + cs * 0.55); ctx.scale(g.ease.back(fq), g.ease.back(fq));
            drawFlag(ctx, 0, 0, cs, t * 0.12 + i);
            ctx.restore();
          }
          if (S.over && !S.won && S.wrongFlags.includes(i) && t > S.revealEnd) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = cs * 0.1; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x + cs * 0.2, y + cs * 0.2); ctx.lineTo(x + cs * 0.8, y + cs * 0.8); ctx.moveTo(x + cs * 0.8, y + cs * 0.2); ctx.lineTo(x + cs * 0.2, y + cs * 0.8); ctx.stroke();
          }
        }
      }
    }
    // מוקשים שמתגלים אחרי פיצוץ
    for (const R of S.reveal) {
      if (t < R.at) continue;
      const c = R.k % S.W, r = (R.k / S.W) | 0, q = Math.min(1, (t - R.at) / 8);
      ctx.fillStyle = (c + r) % 2 ? '#e6cfa4' : '#efdcb6'; ctx.fillRect(c * cs, r * cs, cs, cs);
      drawMine(ctx, c * cs + cs / 2, r * cs + cs / 2, cs * 0.26 * g.ease.back(q), t);
    }
    // קווים דקים בין משבצות פתוחות
    ctx.strokeStyle = 'rgba(120,90,50,.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < S.W; c++) { ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, L.bh); }
    for (let r = 1; r < S.H; r++) { ctx.moveTo(0, r * cs); ctx.lineTo(L.bw, r * cs); }
    ctx.stroke();
    if (S.kb && S.cur >= 0 && !S.over) {
      ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 3;
      ctx.strokeRect((S.cur % S.W) * cs + 1.5, ((S.cur / S.W) | 0) * cs + 1.5, cs - 3, cs - 3);
    }
    ctx.restore();
  }
  function drawBar(g, ctx) {
    const S = g.s, L = S.L, R = L.mode;
    // מתג חשיפה / דגל
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    g.rr(ctx, R.x, R.y, R.w, R.h, R.h / 2); ctx.fillStyle = '#1d3a22'; ctx.fill();
    ctx.restore();
    const half = R.w / 2, kx = R.x + (S.flagMode ? half : 0);
    const gr = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    gr.addColorStop(0, S.flagMode ? '#ff7a6b' : '#b3ef8a'); gr.addColorStop(1, S.flagMode ? '#e2342f' : '#5fb547');
    g.rr(ctx, kx + 4, R.y + 4, half - 8, R.h - 8, (R.h - 8) / 2); ctx.fillStyle = gr; ctx.fill();
    g.text(ctx, '⛏️ ' + g.t('dig'), R.x + half / 2, R.y + R.h / 2, { size: 20, weight: 800, color: S.flagMode ? 'rgba(255,255,255,.6)' : '#173d14', maxW: half - 16 });
    g.text(ctx, '🚩 ' + g.t('flag'), R.x + half * 1.5, R.y + R.h / 2, { size: 20, weight: 800, color: S.flagMode ? '#fff' : 'rgba(255,255,255,.6)', maxW: half - 16 });
    if (needZoom(g)) {
      const Z = L.zoom;
      g.rr(ctx, Z.x, Z.y, Z.w, Z.h, 16); ctx.fillStyle = S.zoom > 1 ? '#ffd65a' : '#1d3a22'; ctx.fill();
      g.text(ctx, S.zoom > 1 ? '➖' : '🔍', Z.x + Z.w / 2, Z.y + Z.h / 2, { size: 24, weight: 800, color: '#fff' });
    }
  }

  // תמונת התפריט: לוח מתחיל חצי פתור
  function demoState(g) {
    const S = newState(g, g.diff);
    const rnd = g.seeded(7 + g.diff);
    const first = Math.floor(S.N / 2 + S.W / 2);
    const r = makeBoard(S.W, S.H, S.M, first, rnd, 30);
    S.mine = r.mine; S.num = r.num; S.started = true;
    flood(S.W, S.H, S.state, S.num, first);
    for (let k = 0; k < 6; k++) { const d = deduce(S.W, S.H, S.M, S.state, S.num); for (const j of d.mines) S.state[j] = FLAG; for (const j of d.safe.slice(0, 3)) flood(S.W, S.H, S.state, S.num, j); }
    return S;
  }

  GK.register('minesweeper', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#16301d', accent: '#8ee06b',
    diffs: ['beginner', 'intermediate', 'expert'],
    lowerIsBetter: true,
    fmt: v => mmss(v),
    text: TXT,

    init(g) {
      g.s = g.demo ? demoState(g) : newState(g, g.diff);
      g.score = 0;
    },

    step(g) {
      const S = g.s;
      S.t++;
      if (S.started && !S.over) S.frames++;
      // מקלדת: חצים מזיזים סמן, רווח פותח, F דגל
      for (const c of g.hits) {
        const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] }[c];
        if (mv) {
          S.kb = true;
          if (S.cur < 0) S.cur = Math.floor(S.H / 2) * S.W + Math.floor(S.W / 2);
          else { const x = Math.max(0, Math.min(S.W - 1, S.cur % S.W + mv[0])), y = Math.max(0, Math.min(S.H - 1, ((S.cur / S.W) | 0) + mv[1])); S.cur = y * S.W + x; }
          if (S.zoom > 1) { S.cam.x = (S.cur % S.W + 0.5) * S.L.cs; S.cam.y = (((S.cur / S.W) | 0) + 0.5) * S.L.cs; clampCam(S); }
        } else if ((c === 'Space' || c === 'Enter') && S.cur >= 0) act(g, S.cur, S.flagMode);
        else if (c === 'KeyF' && S.cur >= 0) { if (S.state[S.cur] === OPEN) chord(g, S.cur); else toggleFlag(g, S.cur); }
        else if (c === 'KeyX') S.flagMode = !S.flagMode;
      }
      // לחיצה ארוכה במגע = דגל
      const P = S.press;
      if (P && !P.moved && !P.long && P.touch && S.t - P.t >= LONG && P.i >= 0) {
        P.long = true;
        if (S.state[P.i] !== OPEN) toggleFlag(g, P.i);
      }
      if (S.over) {
        S.endT++;
        if (!S.won && S.reveal.length) {
          for (const R of S.reveal) if (R.at === S.t) { g.sfx('pop', { p: 0.6 + Math.random() * 0.5 }); const c = cellCenter(S, R.k); g.burst(c.x, c.y, { n: 6, color: ['#ff9f43', '#555'], speed: 2, life: 20, size: 3 }); }
        }
        if (S.won && S.endT % 12 === 0 && S.endT < 70) { const i = Math.floor(Math.random() * S.N), c = cellCenter(S, i); g.burst(c.x, c.y, { n: 20, color: ['#ffd65a', '#ff7a7a', '#7ad0ff', '#9cf29b'], speed: 5, life: 50, size: 5, shape: 'square', gravity: 0.1 }); }
        const doneAt = S.won ? 100 : Math.max(70, S.revealEnd - (S.t - S.endT) + 50);
        if (S.pausedEnd) { S.pausedEnd = false; S.endT = Math.min(S.endT, doneAt - 30); }   // אחרי השהיה: עוד חצי שנייה של האנימציה
        if (!S.ended && S.endT >= doneAt) {
          S.ended = true;
          if (S.won) g.end({ score: secs(S), result: 'win', scoreLabel: g.t('time'), delay: 300 });
          else g.end({ result: 'lose', score: null, title: g.t('boom'), text: g.t('loseText', { n: Math.floor(S.opened / (S.N - S.M) * 100) }), delay: 300 });
        }
      }
      if (S.zoom > 1 && !needZoom(g)) { S.zoom = 1; clampCam(S); }
      const b = g.getBest();
      g.hud([[g.t('time'), mmss(secs(S))], ['💣', S.M - flagsCount(S)], [g.t('best'), b === null ? '—' : mmss(b)]]);
    },

    idle(g) { if (g.s) g.s.t++; },
    onPause(g) { if (g.s) g.s.pausedEnd = true; },

    // בוט לבדיקות: רואה רק מספרים ודגלים, ופועל דרך אותן פעולות של השחקן
    bot(g) {
      const S = g.s;
      if (S.over || ++S.botT < 4) return;
      S.botT = 0;
      if (!S.started) { act(g, Math.floor(S.N / 2), false); return; }
      const d = deduce(S.W, S.H, S.M, S.state, S.num);
      if (d.mines.length) { toggleFlag(g, d.mines[0]); return; }
      if (d.safe.length) {
        // אם יש מספר שכל הדגלים שלו במקום — פתיחת שכנים (chord), אחרת פתיחה רגילה
        const nb = neighbors(S.W, S.H);
        for (const i of d.safe) for (const j of nb[i]) if (S.state[j] === OPEN && S.num[j] > 0) {
          let fl = 0; for (const k of nb[j]) if (S.state[k] === FLAG) fl++;
          if (fl === S.num[j]) { act(g, j, false); return; }
        }
        act(g, d.safe[0], false); return;
      }
      const hid = []; for (let i = 0; i < S.N; i++) if (S.state[i] === HID) hid.push(i);
      S.botGuesses = (S.botGuesses || 0) + 1;
      act(g, hid[Math.floor(Math.random() * hid.length)], false);
    },

    onPointer(g, type, p) {
      const S = g.s, L = S.L;
      if (type === 'move') {
        S.hover = p.kind === 'mouse' ? cellAt(S, p) : -1;
        if (p.kind === 'mouse') S.kb = false;
        const P = S.press;
        if (P && P.id === p.id) {
          const dx = p.x - P.x, dy = p.y - P.y;
          if (!P.moved && Math.hypot(dx, dy) > (S.zoom > 1 ? 10 : 18)) P.moved = true;
          if (P.moved && S.zoom > 1) { S.cam.x = P.cx - dx / S.zoom; S.cam.y = P.cy - dy / S.zoom; clampCam(S); }
        }
        return;
      }
      if (type === 'down') {
        if (p.x >= L.mode.x && p.x <= L.mode.x + L.mode.w && p.y >= L.mode.y && p.y <= L.mode.y + L.mode.h) { S.flagMode = !S.flagMode; g.sfx('click'); return; }
        if (needZoom(g) && p.x >= L.zoom.x && p.x <= L.zoom.x + L.zoom.w && p.y >= L.zoom.y && p.y <= L.zoom.y + L.zoom.h) {
          if (S.zoom > 1) S.zoom = 1;
          else { S.zoom = Math.min(3, Math.max(2, 30 / screenCell(g))); if (S.press && S.press.i >= 0) { const c = cellCenter(S, S.press.i); S.cam = toBoard(S, c); } }
          clampCam(S); g.sfx('click'); return;
        }
        const i = cellAt(S, p);
        if (p.button === 2) { if (i >= 0) { if (S.state[i] === OPEN) chord(g, i); else toggleFlag(g, i); } return; }
        if (p.button === 1) { if (i >= 0) chord(g, i); return; }
        S.press = { id: p.id, x: p.x, y: p.y, i, t: S.t, moved: false, long: false, touch: p.kind !== 'mouse', cx: S.cam.x, cy: S.cam.y };
        return;
      }
      if (type === 'up') {
        const P = S.press;
        S.press = null;
        if (!P || P.id !== p.id || P.moved || P.long || P.i < 0) return;
        const i = cellAt(S, p);
        if (i !== P.i) return;
        act(g, i, S.flagMode);
      }
    },

    draw(g, ctx) {
      const S = g.s;
      drawBg(g, ctx, S.t);
      drawBoard(g, ctx);
      drawBar(g, ctx);
    },

    cover(ctx, w, h, k) {
      const g = Object.assign(Object.create(k), { W: w, H: h });
      drawBg(g, ctx, 0);
      const cs = 60, cols = 13, rows = 8, ox = (w - cols * cs) / 2, oy = (h - rows * cs) / 2;
      const rnd = k.seeded(31);
      const W = cols, H = rows, first = 3 * W + 6;
      const r = makeBoard(W, H, 16, first, rnd, 50);
      const state = new Uint8Array(W * H);
      flood(W, H, state, r.num, first);
      for (let q = 0; q < 2; q++) { const d = deduce(W, H, 16, state, r.num); for (const j of d.mines) state[j] = FLAG; }
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      k.rr(ctx, ox - 8, oy - 8, cols * cs + 16, rows * cs + 16, 16); ctx.fillStyle = '#3b5d2e'; ctx.fill();
      ctx.restore();
      for (let i = 0; i < W * H; i++) {
        const c = i % W, rr = (i / W) | 0, x = ox + c * cs, y = oy + rr * cs, odd = (c + rr) % 2;
        if (state[i] === OPEN) {
          ctx.fillStyle = odd ? '#e6cfa4' : '#efdcb6'; ctx.fillRect(x, y, cs, cs);
          if (r.num[i] > 0) k.text(ctx, String(r.num[i]), x + cs / 2, y + cs * 0.54, { size: 38, weight: 900, color: NUMC[r.num[i]] });
        } else {
          ctx.fillStyle = odd ? '#86c862' : '#93d36d'; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, cs, 5);
          ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y + cs - 5, cs, 5);
          if (state[i] === FLAG) drawFlag(ctx, x + cs / 2, y + cs * 0.55, cs, i);
        }
      }
      // מוקש גדול מתפוצץ בפינה
      const mx = ox + (cols - 2) * cs + cs / 2, my = oy + (rows - 2) * cs + cs / 2;
      const glow = ctx.createRadialGradient(mx, my, 5, mx, my, 120);
      glow.addColorStop(0, 'rgba(255,200,60,.85)'); glow.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = glow; ctx.fillRect(mx - 130, my - 130, 260, 260);
      drawMine(ctx, mx, my, 34, 0);
    },

    _core: { neighbors, numbers, deduce, flood, solvable, layMines, makeBoard, SIZES },
  });
})();
