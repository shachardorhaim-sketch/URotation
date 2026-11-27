// ============================================================
//  חמש בשורה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  לוח 15×15, מניחים אבנים בתורות, מי שיוצר 5 (או יותר) בשורה מנצח.
//  נגד המחשב (קל: חמדן שמפספס הרבה, בינוני: חמדן זהיר, קשה: חיפוש אלפא-בטא + רצף איומים)
//  או 2 שחקנים. המהלך האחרון מסומן, והשורה המנצחת זוהרת.
// ============================================================
(function () {
  'use strict';

  // ---------- הלוח: 15×15, וכל "חלון" של 5 משבצות ברצף ----------
  const N = 15, NN = N * N, CENTER = 7 * N + 7;
  const WS = [0, 1, 12, 120, 1500, 1e6];   // ערך חלון לפי מספר האבנים שלי בו (כשאין בו אבן של היריב)
  const WC = [], CW = [];
  for (let c = 0; c < NN; c++) CW.push([]);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const ex = x + 4 * dx, ey = y + 4 * dy;
      if (ex < 0 || ex >= N || ey < 0 || ey >= N) continue;
      const w = WC.length / 5;
      for (let k = 0; k < 5; k++) { const c = (y + k * dy) * N + x + k * dx; WC.push(c); CW[c].push(w); }
    }
  }
  const NW = WC.length / 5;
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };

  function newPos() {
    return { b: new Int8Array(NN), cnt: [null, new Int8Array(NW), new Int8Array(NW)], e: [0, 0, 0], f4: [0, 0, 0], nb: new Int8Array(NN), turn: 1, hist: [], won: 0, n: 0 };
  }
  function bump(P, c, d) {
    const x = c % N, y = (c / N) | 0;
    for (let yy = Math.max(0, y - 2); yy <= Math.min(N - 1, y + 2); yy++) for (let xx = Math.max(0, x - 2); xx <= Math.min(N - 1, x + 2); xx++) P.nb[yy * N + xx] += d;
  }
  function play(P, c) {
    const p = P.turn, o = 3 - p, mine = P.cnt[p], th = P.cnt[o], ws = CW[c];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], a = mine[w], t = th[w];
      if (t === 0) { P.e[p] += WS[a + 1] - WS[a]; if (a === 3) P.f4[p]++; else if (a === 4) { P.f4[p]--; P.won = p; } }
      else if (a === 0) { P.e[o] -= WS[t]; if (t === 4) P.f4[o]--; }
      mine[w] = a + 1;
    }
    P.b[c] = p; P.hist.push(c); P.n++; P.turn = o;
    bump(P, c, 1);
  }
  function undo(P) {
    const c = P.hist.pop(), p = P.b[c], o = 3 - p, mine = P.cnt[p], th = P.cnt[o], ws = CW[c];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], a = mine[w] - 1, t = th[w];
      mine[w] = a;
      if (t === 0) { P.e[p] -= WS[a + 1] - WS[a]; if (a === 3) P.f4[p]--; else if (a === 4) P.f4[p]++; }
      else if (a === 0) { P.e[o] += WS[t]; if (t === 4) P.f4[o]++; }
    }
    P.b[c] = 0; P.n--; P.turn = p; P.won = 0;
    bump(P, c, -1);
  }
  // משבצות ריקות ששחקן p משלים בהן חמש
  function fiveCells(P, p) {
    const out = [];
    if (!P.f4[p]) return out;
    const mine = P.cnt[p], th = P.cnt[3 - p];
    for (let w = 0; w < NW; w++) {
      if (mine[w] !== 4 || th[w] !== 0) continue;
      for (let k = 0; k < 5; k++) { const c = WC[w * 5 + k]; if (!P.b[c] && out.indexOf(c) < 0) out.push(c); }
    }
    return out;
  }
  // כמה שחקן p מרוויח אם ישים אבן ב-c (סכום החלונות שמתחזקים)
  function gain(P, c, p) {
    const mine = P.cnt[p], th = P.cnt[3 - p], ws = CW[c];
    let s = 0;
    for (let i = 0; i < ws.length; i++) { const w = ws[i]; if (th[w] === 0) s += WS[mine[w] + 1] - WS[mine[w]]; }
    return s;
  }
  function candidates(P) {
    const out = [];
    for (let c = 0; c < NN; c++) if (!P.b[c] && P.nb[c]) out.push(c);
    if (!out.length && !P.b[CENTER]) out.push(CENTER);
    return out;
  }
  function nearOne(P) {   // משבצות ריקות שנוגעות באבן (למהלכים "סתם" של המחשב הקל)
    const out = [];
    for (let c = 0; c < NN; c++) {
      if (P.b[c]) continue;
      const x = c % N, y = (c / N) | 0;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
        const xx = x + dx, yy = y + dy;
        if ((dx || dy) && xx >= 0 && yy >= 0 && xx < N && yy < N && P.b[yy * N + xx]) near = true;
      }
      if (near) out.push(c);
    }
    return out.length ? out : candidates(P);
  }
  // השורה המנצחת (5 או יותר) שעוברת דרך c
  function winLine(P, c) {
    const p = P.b[c], x = c % N, y = (c / N) | 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [c];
      for (let k = 1; ; k++) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= N || yy >= N || P.b[yy * N + xx] !== p) break; cells.push(yy * N + xx); }
      for (let k = 1; ; k++) { const xx = x - dx * k, yy = y - dy * k; if (xx < 0 || yy < 0 || xx >= N || yy >= N || P.b[yy * N + xx] !== p) break; cells.unshift(yy * N + xx); }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  // ---------- המחשב ----------
  // קל ובינוני: בוחרים את המשבצת עם הכי הרבה התקפה+הגנה, עם "רעש" וטעויות. קשה: חיפוש.
  // (נבדקו מול שחקנים מתוסרטים, ראה g2dtools/tests/five-in-row/sim.mjs)
  const LV = [
    { def: 0.4, noise: 0.6, random: 0.2, missWin: 0.3, missBlock: 0.45 },
    { def: 0.8, noise: 0.4, random: 0.05, missWin: 0, missBlock: 0.1 },
    { search: true, depth: 10, budget: 140 },
  ];
  function greedyPick(P, L, rnd) {
    const me = P.turn, op = 3 - me;
    const win = fiveCells(P, me);
    if (win.length && rnd() >= L.missWin) return win[0];
    const block = fiveCells(P, op);
    if (block.length && rnd() >= L.missBlock) return block[0];
    if (rnd() < L.random) { const a = nearOne(P); return a[Math.floor(rnd() * a.length)]; }
    const cand = candidates(P);
    let best = cand[0], bv = -Infinity;
    for (const c of cand) {
      const v = (gain(P, c, me) + L.def * gain(P, c, op)) * (1 + L.noise * (rnd() * 2 - 1));
      if (v > bv) { bv = v; best = c; }
    }
    return best;
  }
  const WIN = 1e8;
  const SC = new Float64Array(NN);   // ציונים זמניים למיון המהלכים (בלי להקצות זיכרון בכל צומת)
  function orderedMoves(P, K) {
    const me = P.turn, op = 3 - me;
    const win = fiveCells(P, me);
    if (win.length) return [win[0]];
    const block = fiveCells(P, op);
    if (block.length) return block;
    const cand = candidates(P);
    for (const c of cand) SC[c] = gain(P, c, me) + gain(P, c, op) * 0.9;
    cand.sort((a, b) => SC[b] - SC[a]);
    return cand.slice(0, K);
  }
  const G = {
    moves: (P, ply) => orderedMoves(P, ply === 0 ? 14 : ply < 3 ? 9 : 6),
    play: (P, c) => play(P, c),
    undo: P => undo(P),
    over(P, ply) {
      if (P.won) return -(WIN - ply);                         // היריב השלים חמש
      const me = P.turn, op = 3 - me;
      if (P.f4[me]) return WIN - ply - 1;                     // אני משלים חמש במהלך הבא
      if (P.f4[op] && fiveCells(P, op).length >= 2) return -(WIN - ply - 2);   // שני איומים — אי אפשר לחסום את שניהם
      if (P.n >= NN) return 0;
      return null;
    },
    empty: () => 0,
    evaluate: P => P.e[P.turn] * 1.15 - P.e[3 - P.turn],
    extend: P => P.f4[3 - P.turn] > 0,                        // חסימה כפויה — מסתכלים עוד צעד
  };
  // רצף של "ארבע" שהיריב חייב לחסום כל פעם, עד ניצחון בטוח
  function vcf(P, depth, budget) {
    if (budget.n <= 0 || depth <= 0) return -1;
    // תקרת זמן: החיפוש הזה רץ בבת אחת, אז הוא לא יעכב פריים ביותר מכמה מילישניות
    if (--budget.n <= 0 || ((budget.n & 15) === 0 && performance.now() > budget.until)) { budget.n = 0; return -1; }
    const me = P.turn, op = 3 - me;
    const win = fiveCells(P, me);
    if (win.length) return win[0];
    if (P.f4[op]) return -1;
    // רק משבצות שהופכות שלוש לארבע: המשבצות הריקות של כל חלון כזה
    const mine = P.cnt[me], th = P.cnt[op], moves = [];
    for (let w = 0; w < NW; w++) {
      if (mine[w] !== 3 || th[w] !== 0) continue;
      for (let k = 0; k < 5; k++) { const c = WC[w * 5 + k]; if (!P.b[c] && moves.indexOf(c) < 0) moves.push(c); }
    }
    for (const c of moves) {
      if (budget.n <= 0) return -1;
      play(P, c);
      const th = fiveCells(P, me);
      let good = th.length >= 2;
      if (th.length === 1) {
        play(P, th[0]);
        if (!P.won && !P.f4[op]) good = vcf(P, depth - 1, budget) >= 0;
        undo(P);
      }
      undo(P);
      if (good) return c;
    }
    return -1;
  }
  // חיפוש אלפא-בטא שאפשר לעצור ולהמשיך בפריים הבא (כדי שהדף לא יקפא) — כמו בדמקה
  function makeSearch(Gm, pos, maxDepth, budgetMs) {
    const INF = 1e12;
    const root = Gm.moves(pos, 0).slice();
    const self = { done: false, best: root[0] != null ? root[0] : -1, score: 0, depth: 0, nodes: 0, t: 0, run: () => true };
    if (root.length <= 1) { self.done = true; return self; }
    let depth = 0, stack = [];
    function enter(d, a, b, ply) {
      self.nodes++;
      const o = Gm.over(pos, ply);
      if (o !== null) return o;
      if (d <= 0 && !(Gm.extend && ply < 24 && Gm.extend(pos))) return Gm.evaluate(pos);
      const ms = ply === 0 ? root : Gm.moves(pos, ply);
      if (!ms.length) return Gm.empty(pos, ply);
      return { ms, i: 0, d: d < 1 ? 1 : d, a, b, best: -INF, bm: null, ply, via: null };
    }
    const upd = (fr, v, m) => { if (v > fr.best) { fr.best = v; fr.bm = m; } if (v > fr.a) fr.a = v; };
    function next() { depth++; stack = [enter(depth, -INF, INF, 0)]; }
    function finish(fr, spent) {
      self.best = fr.bm; self.score = fr.best; self.depth = depth;
      const i = root.indexOf(fr.bm);
      if (i > 0) { root.splice(i, 1); root.unshift(fr.bm); }
      if (depth >= maxDepth || Math.abs(fr.best) > WIN / 2 || spent > budgetMs * 0.45) self.done = true;
      else next();
    }
    function abort() {
      const r = stack[0];
      if (r && r.bm != null && r.bm !== self.best && r.best > -INF && r.i >= r.ms.length) { self.best = r.bm; self.score = r.best; }
      while (stack.length > 1) Gm.undo(pos, stack.pop().via);
      stack = []; self.done = true;
    }
    self.run = ms => {
      const t0 = performance.now(), base = self.t;
      
      while (!self.done) {
        if (performance.now() - t0 > ms) break;   // בכל צומת: צומת אחד יכול להיות כבד, ופריים לא מחכה
        const fr = stack[stack.length - 1];
        if (fr.i < fr.ms.length && fr.a < fr.b) {
          const m = fr.ms[fr.i++];
          Gm.play(pos, m);
          const ch = enter(fr.d - 1, -fr.b, -fr.a, fr.ply + 1);
          if (typeof ch === 'number') { Gm.undo(pos, m); upd(fr, -ch, m); } else { ch.via = m; stack.push(ch); }
        } else {
          stack.pop();
          if (!stack.length) { finish(fr, base + performance.now() - t0); continue; }
          Gm.undo(pos, fr.via);
          upd(stack[stack.length - 1], -fr.best, fr.via);
        }
      }
      self.t = base + performance.now() - t0;
      if (!self.done && self.t > budgetMs) abort();
      return self.done;
    };
    next();
    return self;
  }
  const doneWith = c => ({ done: true, best: c, run: () => true });
  // מחזיר "מחשבה": run(ms) עד שהיא done, ואז best
  function cpuThink(P, diff, rnd) {
    const L = LV[diff] || LV[0];
    if (!P.n) return doneWith(CENTER);
    if (!L.search) return doneWith(greedyPick(P, L, rnd));
    const me = P.turn, op = 3 - me;
    const win = fiveCells(P, me);
    if (win.length) return doneWith(win[0]);
    const block = fiveCells(P, op);
    if (block.length) return doneWith(block[0]);
    const v = vcf(P, 12, { n: 1500, until: performance.now() + 12 });
    if (v >= 0) return doneWith(v);
    return makeSearch(G, P, L.depth, L.budget);
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'חמש בשורה', help: ['לחץ על נקודה בלוח כדי להניח אבן', 'צור שורה של 5 אבנים שלך — לרוחב, לאורך או באלכסון', 'חסום את השורות של היריב לפני שהן מגיעות ל-5!', '2 שחקנים: משחקים בתורות על אותו מחשב'], helpTouch: ['גע בנקודה כדי לכוון, וגע בה שוב כדי להניח אבן', 'צור שורה של 5 אבנים שלך — לרוחב, לאורך או באלכסון', 'חסום את השורות של היריב לפני שהן מגיעות ל-5!', '2 שחקנים: משחקים בתורות על אותו מכשיר'], you: 'אתה', yourTurn: 'התור שלך', thinking: 'חושב', starts: '{name} מתחיל!', moveN: 'מהלך {n}', tapAgain: 'גע שוב כדי להניח', watch: 'זהירות — ארבע בשורה!', tipTitle: 'טיפ', tips: ['איום כפול: צור שתי שורות של 3 בבת אחת — אי אפשר לחסום את שתיהן!', 'שלוש בשורה עם שני צדדים פתוחים זה איום — חסום אותו מיד', 'שחק קרוב למרכז: יש שם יותר כיוונים לבנות שורות'] },
    en: { title: 'Five in a Row', help: ['Click a point on the board to place a stone', 'Make a line of 5 of your stones — across, down or diagonally', "Block your opponent's lines before they reach 5!", '2 players: take turns on the same computer'], helpTouch: ['Tap a point to aim, then tap it again to place a stone', 'Make a line of 5 of your stones — across, down or diagonally', "Block your opponent's lines before they reach 5!", '2 players: take turns on the same device'], you: 'You', yourTurn: 'Your turn', thinking: 'Thinking', starts: '{name} starts!', moveN: 'Move {n}', tapAgain: 'Tap again to place', watch: 'Watch out — four in a row!', tipTitle: 'Tip', tips: ['Double threat: make two lines of 3 at once — they can only block one!', 'Three in a row with both ends open is a threat — block it right away', 'Play near the center: there are more ways to build lines there'] },
    ar: { title: 'خمسة في صف', help: ['انقر على نقطة في اللوحة لتضع حجراً', 'كوّن صفاً من 5 من أحجارك — أفقياً أو عمودياً أو قُطرياً', 'اقطع صفوف خصمك قبل أن تصل إلى 5!', 'لاعبان: تناوبا على نفس الكمبيوتر'], helpTouch: ['المس نقطة لتصوّب، ثم المسها مجدداً لتضع حجراً', 'كوّن صفاً من 5 من أحجارك — أفقياً أو عمودياً أو قُطرياً', 'اقطع صفوف خصمك قبل أن تصل إلى 5!', 'لاعبان: تناوبا على نفس الجهاز'], you: 'أنت', yourTurn: 'دورك', thinking: 'يفكر', starts: '{name} يبدأ!', moveN: 'النقلة {n}', tapAgain: 'المس مجدداً لتضع الحجر', watch: 'انتبه — أربعة في صف!', tipTitle: 'نصيحة', tips: ['تهديد مزدوج: كوّن صفين من 3 معاً — لن يستطيع قطع الاثنين!', 'ثلاثة في صف وطرفاها مفتوحان تهديد — اقطعها فوراً', 'العب قرب المنتصف: هناك طرق أكثر لبناء الصفوف'] },
    es: { title: 'Cinco en línea', help: ['Haz clic en un punto del tablero para poner una piedra', 'Forma una línea de 5 piedras tuyas: horizontal, vertical o diagonal', '¡Bloquea las líneas de tu rival antes de que lleguen a 5!', '2 jugadores: jueguen por turnos en la misma computadora'], helpTouch: ['Toca un punto para apuntar y tócalo otra vez para poner la piedra', 'Forma una línea de 5 piedras tuyas: horizontal, vertical o diagonal', '¡Bloquea las líneas de tu rival antes de que lleguen a 5!', '2 jugadores: jueguen por turnos en el mismo dispositivo'], you: 'Tú', yourTurn: 'Tu turno', thinking: 'Pensando', starts: '¡Empieza {name}!', moveN: 'Jugada {n}', tapAgain: 'Toca otra vez para poner', watch: '¡Cuidado: cuatro en línea!', tipTitle: 'Consejo', tips: ['Doble amenaza: forma dos líneas de 3 a la vez, ¡solo podrá bloquear una!', 'Tres en línea con los dos extremos libres es una amenaza: bloquéala ya', 'Juega cerca del centro: ahí hay más formas de hacer líneas'] },
    fr: { title: 'Cinq en ligne', help: ['Clique sur un point du plateau pour poser une pierre', 'Aligne 5 de tes pierres : en ligne, en colonne ou en diagonale', 'Bloque les lignes de ton adversaire avant qu’elles atteignent 5 !', '2 joueurs : jouez chacun votre tour sur le même ordinateur'], helpTouch: ['Touche un point pour viser, puis touche-le encore pour poser la pierre', 'Aligne 5 de tes pierres : en ligne, en colonne ou en diagonale', 'Bloque les lignes de ton adversaire avant qu’elles atteignent 5 !', '2 joueurs : jouez chacun votre tour sur le même appareil'], you: 'Toi', yourTurn: 'À toi de jouer', thinking: 'Réflexion', starts: '{name} commence !', moveN: 'Coup {n}', tapAgain: 'Touche encore pour poser', watch: 'Attention — quatre alignés !', tipTitle: 'Astuce', tips: ['Double menace : fais deux lignes de 3 en même temps, il ne pourra en bloquer qu’une !', 'Trois alignés avec les deux bouts libres, c’est une menace : bloque-la tout de suite', 'Joue près du centre : il y a plus de façons d’aligner'] },
    pt: { title: 'Cinco em linha', help: ['Clique num ponto do tabuleiro para colocar uma pedra', 'Forme uma linha de 5 pedras suas: na horizontal, vertical ou diagonal', 'Bloqueie as linhas do adversário antes que cheguem a 5!', '2 jogadores: joguem em turnos no mesmo computador'], helpTouch: ['Toque num ponto para mirar e toque de novo para colocar a pedra', 'Forme uma linha de 5 pedras suas: na horizontal, vertical ou diagonal', 'Bloqueie as linhas do adversário antes que cheguem a 5!', '2 jogadores: joguem em turnos no mesmo aparelho'], you: 'Você', yourTurn: 'Sua vez', thinking: 'Pensando', starts: '{name} começa!', moveN: 'Jogada {n}', tapAgain: 'Toque de novo para colocar', watch: 'Cuidado — quatro em linha!', tipTitle: 'Dica', tips: ['Ameaça dupla: faça duas linhas de 3 ao mesmo tempo — ele só pode bloquear uma!', 'Três em linha com as duas pontas livres é uma ameaça: bloqueie na hora', 'Jogue perto do centro: lá há mais jeitos de formar linhas'] },
    ru: { title: 'Пять в ряд', help: ['Нажми на точку доски, чтобы поставить камень', 'Выстрой 5 своих камней в ряд — по горизонтали, вертикали или диагонали', 'Перекрывай ряды соперника, пока их не стало 5!', '2 игрока: ходите по очереди за одним компьютером'], helpTouch: ['Коснись точки, чтобы прицелиться, и ещё раз, чтобы поставить камень', 'Выстрой 5 своих камней в ряд — по горизонтали, вертикали или диагонали', 'Перекрывай ряды соперника, пока их не стало 5!', '2 игрока: ходите по очереди на одном устройстве'], you: 'Ты', yourTurn: 'Твой ход', thinking: 'Думает', starts: 'Начинает {name}!', moveN: 'Ход {n}', tapAgain: 'Коснись ещё раз, чтобы поставить', watch: 'Осторожно — четыре в ряд!', tipTitle: 'Совет', tips: ['Двойная угроза: сделай сразу два ряда по 3 — соперник закроет только один!', 'Три в ряд с открытыми концами — угроза, закрой её сразу', 'Играй ближе к центру: там больше способов построить ряд'] },
    de: { title: 'Fünf in einer Reihe', help: ['Klick auf einen Punkt des Bretts, um einen Stein zu setzen', 'Bilde eine Reihe aus 5 deiner Steine — waagrecht, senkrecht oder schräg', 'Blockiere die Reihen deines Gegners, bevor sie 5 erreichen!', '2 Spieler: abwechselnd am selben Computer spielen'], helpTouch: ['Tippe auf einen Punkt zum Zielen und noch mal zum Setzen', 'Bilde eine Reihe aus 5 deiner Steine — waagrecht, senkrecht oder schräg', 'Blockiere die Reihen deines Gegners, bevor sie 5 erreichen!', '2 Spieler: abwechselnd am selben Gerät spielen'], you: 'Du', yourTurn: 'Du bist dran', thinking: 'Denkt nach', starts: '{name} beginnt!', moveN: 'Zug {n}', tapAgain: 'Noch mal tippen zum Setzen', watch: 'Achtung — vier in einer Reihe!', tipTitle: 'Tipp', tips: ['Doppelte Drohung: Bau zwei Dreierreihen auf einmal — er kann nur eine blocken!', 'Drei in einer Reihe mit zwei offenen Enden ist eine Drohung — sofort blocken', 'Spiel nah an der Mitte: Dort gibt es mehr Wege für Reihen'] },
  };
  const EXTRA = {
    he: { blocked: 'נחסם!', four: 'ארבע!', recordHint: 'נצח בפחות מהלכים כדי לשבור את השיא!' },
    en: { blocked: 'Blocked!', four: 'Four!', recordHint: 'Win in fewer moves to beat your record!' },
    ar: { blocked: 'تم الصد!', four: 'أربعة!', recordHint: 'افز بنقلات أقل لتحطم رقمك القياسي!' },
    es: { blocked: '¡Bloqueado!', four: '¡Cuatro!', recordHint: '¡Gana en menos jugadas para batir tu récord!' },
    fr: { blocked: 'Bloqué !', four: 'Quatre !', recordHint: 'Gagne en moins de coups pour battre ton record !' },
    pt: { blocked: 'Bloqueado!', four: 'Quatro!', recordHint: 'Vença em menos jogadas para bater seu recorde!' },
    ru: { blocked: 'Перекрыто!', four: 'Четыре!', recordHint: 'Побеждай быстрее, чтобы побить рекорд!' },
    de: { blocked: 'Geblockt!', four: 'Vier!', recordHint: 'Gewinne mit weniger Zügen, um deinen Rekord zu schlagen!' },
  };
  for (const k in EXTRA) Object.assign(TEXT[k], EXTRA[k]);

  // ---------- פריסה ----------
  function layout(W, H) {
    if (H <= W) return { port: false, bx: 20, by: 20, bs: 600, x0: 50, y0: 50, sp: 540 / 14, cards: [{ x: 648, y: 20, w: 292, h: 166 }, { x: 648, y: 198, w: 292, h: 166 }], info: { x: 648, y: 376, w: 292, h: 62 }, tip: { x: 648, y: 450, w: 292, h: 170 } };
    return { port: true, bx: 12, by: 12, bs: 576, x0: 40, y0: 40, sp: 508 / 14, cards: [{ x: 12, y: 600, w: 282, h: 100 }, { x: 306, y: 600, w: 282, h: 100 }], info: { x: 12, y: 712, w: 576, h: 54 }, tip: { x: 12, y: 778, w: 576, h: 110 } };
  }
  const ptOf = (L, c) => ({ x: L.x0 + (c % N) * L.sp, y: L.y0 + ((c / N) | 0) * L.sp });
  function cellAt(L, x, y) {
    const cx = Math.round((x - L.x0) / L.sp), cy = Math.round((y - L.y0) / L.sp);
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return -1;
    const px = L.x0 + cx * L.sp, py = L.y0 + cy * L.sp;
    return Math.hypot(x - px, y - py) <= L.sp * 0.62 ? cy * N + cx : -1;
  }

  // ---------- מצב המשחק ----------
  const isHuman = (g, p) => g.mode === '2p' || p === 1;
  const nameOf = (g, p) => (g.mode === '2p' ? g.t(p === 1 ? 'p1' : 'p2') : g.t(p === 1 ? 'you' : 'cpu'));
  const canAct = g => { const S = g.s; return g.state === 'play' && !S.over && !S.think && isHuman(g, S.P.turn); };

  function blinks(S) { for (const p of [1, 2]) { if (S.blink[p] > 0) S.blink[p]--; else if (Math.random() < 0.006) S.blink[p] = 8; } }
  function setMood(S, p, m, sec) { S.mood[p] = m; S.moodUntil[p] = S.clock + sec; }
  function place(g, c) {
    const S = g.s, P = S.P, L = S.L;
    if (c < 0 || P.b[c] || S.over) return false;
    const p = P.turn, o = 3 - p, f4me = P.f4[p], f4op = P.f4[o];
    play(P, c);
    S.last = c; S.anim = { c, t: 0 }; S.pend = -1;
    if (p === 1) S.moves1++; else S.moves2++;
    const q = ptOf(S.L, c);
    g.burst(q.x, q.y, { n: 10, color: p === 1 ? ['#c9a26a', '#8a6a3c', '#e8cf9f'] : ['#e8cf9f', '#ffffff', '#c9a26a'], speed: 2.2, life: 22, size: 3.2, gravity: 0.05 });
    g.sfx('place', { p: p === 1 ? 0.95 : 1.12 });
    if (P.won) {
      S.over = true; S.winner = p;
      S.line = { cells: winLine(P, c) || [c], t0: S.clock };
      S.endT = 80;
      for (const k of S.line.cells) { const pp = ptOf(S.L, k); g.burst(pp.x, pp.y, { n: 14, color: ['#ffd84d', '#fff3b0', '#ffae00', '#ffffff'], speed: 3.6, life: 44, size: 4.5, gravity: 0.06 }); }
      g.shake(6); g.flash('#fff3b0', 0.2);
      g.sfx(isHuman(g, p) ? 'power' : 'hit');
      // קונפטי כשאדם מנצח (נגד המחשב או בשני שחקנים)
      if (isHuman(g, p)) for (let i = 0; i < 5; i++) g.burst(L.bx + L.bs * (0.1 + 0.2 * i), L.by + 10, { n: 20, color: ['#ff4d6d', '#ffd84d', '#5ef0ff', '#7cff8a', '#ffffff', '#b38cff'], speed: 6.5, life: 95, size: 7, gravity: 0.16, spread: Math.PI * 0.8, dir: -Math.PI / 2, shape: 'square', drag: 0.985 });
      return true;
    }
    if (P.n >= NN) { S.over = true; S.winner = 0; S.endT = 40; return true; }
    // ארבע בשורה (איום) או חסימה של ארבע: טקסט צף, צליל ופרצופים
    const fs = L.port ? 26 : 22;
    if (P.f4[p] > f4me) {
      g.float(q.x, q.y - L.sp * 0.75, g.t('four'), { color: '#ffd84d', size: fs });
      g.tone({ f: 660, f2: 1180, dur: 0.14, type: 'triangle', vol: 0.12 });
      setMood(S, p, 'happy', 1.2); setMood(S, o, 'wow', 1.2);
    } else if (P.f4[o] < f4op) {
      g.float(q.x, q.y - L.sp * 0.75, g.t('blocked'), { color: '#9fe8ff', size: fs });
      g.tone({ f: 420, f2: 300, dur: 0.12, type: 'square', vol: 0.06 });
      setMood(S, p, 'happy', 0.9); setMood(S, o, 'sad', 0.9);
    }
    // אזהרה (רק בקל): למחשב יש ארבע — מראים איפה לחסום
    S.warn = g.mode === 'cpu' && g.diff === 0 && P.turn === 1 ? fiveCells(P, 2) : [];
    if (S.warn.length) g.sfx('tick');
    beginTurn(g);
    return true;
  }
  function beginTurn(g) {
    const S = g.s;
    if (S.over || g.demo) return;
    if (!isHuman(g, S.P.turn)) { S.think = cpuThink(S.P, g.diff, Math.random); S.thinkT = g.time; }
  }
  function stepCpu(g) {
    const S = g.s, th = S.think;
    if (!th) return;
    if (!th.done && performance.now() - (S.sliceEnd || 0) > 5) { th.run(6); S.sliceEnd = performance.now(); }
    if (th.done && g.time - S.thinkT >= 0.45) {
      S.think = null;
      let c = th.best;
      if (c == null || c < 0 || S.P.b[c]) { const a = candidates(S.P); c = a[0]; }
      place(g, c);
    }
  }
  function finish(g) {
    const S = g.s;
    if (S.winner === 0) { g.end({ result: 'draw', score: null, delay: 200 }); return; }
    if (g.mode === '2p') { S.wins[S.winner - 1]++; g.end({ winner: nameOf(g, S.winner), score: null, delay: 200 }); return; }
    if (S.winner === 1) g.end({ result: 'win', score: S.moves1, scoreLabel: g.t('moves'), text: g.t('recordHint'), delay: 200 });
    else { const tips = g.t('tips'); g.end({ result: 'lose', score: null, text: '💡 ' + (Array.isArray(tips) ? tips[S.tip % tips.length] : ''), delay: 200 }); }
  }

  // ---------- ציור ----------
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, g.W, g.H);
    gr.addColorStop(0, '#24323f'); gr.addColorStop(1, '#10161d');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    // כתמי אור רכים שנודדים לאט
    const cols = ['255,216,77', '120,190,255', '255,255,255'];
    for (let i = 0; i < 8; i++) {
      const r = 60 + (i * 37) % 90;
      const x = ((i * 211.3 + t * (5 + (i % 3) * 3)) % (g.W + r * 2)) - r, y = (i * 127.7) % g.H + Math.sin(t * 0.5 + i * 1.3) * 16;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + cols[i % 3] + ',.08)'); rg.addColorStop(1, 'rgba(' + cols[i % 3] + ',0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // ---------- הדמויות: אבן עם פרצוף, ורובוט למחשב ----------
  const TAU = Math.PI * 2;
  function rrPath(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function drawBuddy(ctx, x, y, R, p, mood, lx, ly, blink) {
    const ink = p === 1 ? '#e9edf5' : '#2a3142', pupil = p === 1 ? '#0b0c10' : '#1c2230';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = R * 0.35; ctx.shadowOffsetY = R * 0.1;
    ctx.beginPath(); ctx.arc(x, y, R * 0.98, 0, TAU); ctx.fillStyle = p === 1 ? '#0a0b0e' : '#b7b4ab'; ctx.fill();
    ctx.restore();
    drawStone(ctx, p, x, y, R, { flat: true });
    const ex = R * 0.3, ey = y - R * 0.1, ew = R * 0.19, eh = R * 0.23;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const ex2 = x + s * ex;
      ctx.strokeStyle = ink; ctx.lineWidth = R * 0.075;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex2, ey + eh * 0.35, ew * 0.85, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); continue; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(ex2 - ew * 0.8, ey); ctx.lineTo(ex2 + ew * 0.8, ey); ctx.stroke(); continue; }
      const big = mood === 'wow' ? 1.15 : 1;
      ctx.beginPath(); ctx.ellipse(ex2, ey, ew * big, eh * big, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = R * 0.03; ctx.strokeStyle = p === 2 ? ink : 'rgba(0,0,0,.6)'; ctx.stroke();
      const pr = ew * (mood === 'wow' ? 0.36 : 0.52);
      const px = ex2 + lx * ew * 0.42, py = ey + ly * eh * 0.38 + (mood === 'sad' ? eh * 0.25 : 0);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fillStyle = pupil; ctx.fill();
      ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.32, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = R * 0.065;
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex2 - s * ew * 1.0, ey - eh * 1.15); ctx.lineTo(ex2 + s * ew * 0.9, ey - eh * 1.55); ctx.stroke(); }
    }
    const my = y + R * 0.36;
    ctx.strokeStyle = ink; ctx.lineWidth = R * 0.075;
    if (mood === 'happy') {
      ctx.beginPath(); ctx.moveTo(x - R * 0.3, my - R * 0.05); ctx.quadraticCurveTo(x, my + R * 0.42, x + R * 0.3, my - R * 0.05); ctx.closePath();
      ctx.fillStyle = '#5a0f22'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(x, my + R * 0.24, R * 0.15, 0, TAU); ctx.fillStyle = '#ff6f8a'; ctx.fill(); ctx.restore();
    } else if (mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + R * 0.16, R * 0.18, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(x, my + R * 0.04, R * 0.09, R * 0.12, 0, 0, TAU); ctx.fillStyle = '#5a0f22'; ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, my - R * 0.1, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,140,170,.42)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * R * 0.56, y + R * 0.2, R * 0.13, R * 0.08, 0, 0, TAU); ctx.fill(); }
  }
  function drawRobot(ctx, x, y, R, mood, lx, ly, blink, t) {
    const hw = R * 0.92, hh = R * 0.76, acc = '#ffd84d';
    ctx.strokeStyle = '#8d9bbf'; ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x, y - hh - R * 0.26); ctx.stroke();
    const on = mood === 'think' ? Math.sin(t * 16) > 0 : true;
    ctx.save();
    if (on) { ctx.shadowColor = acc; ctx.shadowBlur = R * 0.35; }
    ctx.beginPath(); ctx.arc(x, y - hh - R * 0.33, R * 0.12, 0, TAU); ctx.fillStyle = on ? acc : '#8a7426'; ctx.fill();
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.beginPath(); rrPath(ctx, s < 0 ? x - hw - R * 0.16 : x + hw - R * 0.02, y - R * 0.26, R * 0.18, R * 0.5, R * 0.07);
      ctx.fillStyle = acc; ctx.fill(); ctx.strokeStyle = '#9a7a12'; ctx.lineWidth = R * 0.03; ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = R * 0.3; ctx.shadowOffsetY = R * 0.08;
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32);
    const hg = ctx.createLinearGradient(0, y - hh, 0, y + hh);
    hg.addColorStop(0, '#f6f8ff'); hg.addColorStop(1, '#a3b0d2');
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    ctx.beginPath(); rrPath(ctx, x - hw, y - hh, hw * 2, hh * 2, R * 0.32); ctx.strokeStyle = '#56627f'; ctx.lineWidth = R * 0.04; ctx.stroke();
    const sw = hw * 0.8, sh = hh * 0.72;
    ctx.beginPath(); rrPath(ctx, x - sw, y - sh, sw * 2, sh * 2, R * 0.2);
    const sg = ctx.createLinearGradient(0, y - sh, 0, y + sh);
    sg.addColorStop(0, '#16224a'); sg.addColorStop(1, '#0a1230');
    ctx.fillStyle = sg; ctx.fill();
    ctx.save();
    const col = '#5ef0ff';
    ctx.shadowColor = col; ctx.shadowBlur = R * 0.18;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = R * 0.08; ctx.lineCap = 'round';
    const ex = R * 0.32, ey = y - R * 0.1;
    for (const s of [-1, 1]) {
      let ex2 = x + s * ex + lx * R * 0.07, ey2 = ey + ly * R * 0.06;
      if (mood === 'happy') { ctx.beginPath(); ctx.arc(ex2, ey2 + R * 0.06, R * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(ex2 - R * 0.12, ey2 - s * R * 0.05); ctx.lineTo(ex2 + R * 0.12, ey2 + s * R * 0.05); ctx.stroke(); continue; }
      if (mood === 'think') { ex2 = x + s * ex + R * 0.06; ey2 = ey - R * 0.07; }
      if (blink && mood !== 'wow') { ctx.beginPath(); ctx.moveTo(ex2 - R * 0.1, ey2); ctx.lineTo(ex2 + R * 0.1, ey2); ctx.stroke(); continue; }
      if (mood === 'wow') { ctx.beginPath(); ctx.arc(ex2, ey2, R * 0.13, 0, TAU); ctx.lineWidth = R * 0.06; ctx.stroke(); ctx.lineWidth = R * 0.08; continue; }
      ctx.beginPath(); rrPath(ctx, ex2 - R * 0.08, ey2 - R * 0.12, R * 0.16, R * 0.24, R * 0.07); ctx.fill();
    }
    const my = y + R * 0.3;
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(x, my - R * 0.1, R * 0.22, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    else if (mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + R * 0.16, R * 0.2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.arc(x, my, R * 0.08, 0, TAU); ctx.lineWidth = R * 0.05; ctx.stroke(); }
    else if (mood === 'think') {
      ctx.lineWidth = R * 0.06;
      ctx.beginPath(); for (let i = 0; i <= 8; i++) { const xx = x - R * 0.22 + i * R * 0.055, yy = my + Math.sin(i * 1.6 + t * 10) * R * 0.035; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke();
    } else { ctx.beginPath(); ctx.moveTo(x - R * 0.17, my); ctx.quadraticCurveTo(x, my + R * 0.08, x + R * 0.17, my); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#7b88aa';
    for (const [bx, by] of [[x - hw * 0.86, y - hh * 0.8], [x + hw * 0.86, y - hh * 0.8], [x - hw * 0.86, y + hh * 0.8], [x + hw * 0.86, y + hh * 0.8]]) { ctx.beginPath(); ctx.arc(bx, by, R * 0.045, 0, TAU); ctx.fill(); }
  }
  function moodOf(S, p) {
    if (S.over) return S.winner === p ? 'happy' : S.winner ? 'sad' : 'idle';
    if (S.moodUntil[p] > S.clock) return S.mood[p];
    if (S.think && S.P.turn === p) return 'think';
    return 'idle';
  }
  function drawBoard(g, ctx, L) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    g.rr(ctx, L.bx, L.by, L.bs, L.bs, 16);
    const wd = ctx.createLinearGradient(L.bx, L.by, L.bx + L.bs, L.by + L.bs);
    wd.addColorStop(0, '#f0c98c'); wd.addColorStop(0.5, '#e3b06c'); wd.addColorStop(1, '#c98f4c');
    ctx.fillStyle = wd; ctx.fill();
    ctx.restore();
    // עורקי עץ
    ctx.save();
    g.rr(ctx, L.bx, L.by, L.bs, L.bs, 16); ctx.clip();
    ctx.strokeStyle = 'rgba(120,70,25,.10)'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const y = L.by + (i + 0.5) * L.bs / 16;
      ctx.beginPath(); ctx.moveTo(L.bx, y);
      for (let k = 1; k <= 8; k++) ctx.quadraticCurveTo(L.bx + (k - 0.5) * L.bs / 8, y + Math.sin(i * 1.7 + k) * 7, L.bx + k * L.bs / 8, y + Math.sin(i * 2.3 + k * 1.3) * 3);
      ctx.stroke();
    }
    const sh = ctx.createLinearGradient(L.bx, L.by, L.bx, L.by + L.bs);
    sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(60,30,0,.12)');
    ctx.fillStyle = sh; ctx.fillRect(L.bx, L.by, L.bs, L.bs);
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,55,20,.55)'; ctx.lineWidth = 3;
    g.rr(ctx, L.bx + 1.5, L.by + 1.5, L.bs - 3, L.bs - 3, 15); ctx.stroke();
    // קווי הלוח
    const e = L.sp * 14;
    ctx.strokeStyle = 'rgba(60,35,10,.78)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      ctx.moveTo(L.x0, L.y0 + i * L.sp); ctx.lineTo(L.x0 + e, L.y0 + i * L.sp);
      ctx.moveTo(L.x0 + i * L.sp, L.y0); ctx.lineTo(L.x0 + i * L.sp, L.y0 + e);
    }
    ctx.stroke();
    ctx.lineWidth = 2.6; ctx.strokeRect(L.x0, L.y0, e, e);
    ctx.fillStyle = 'rgba(60,35,10,.85)';
    for (const [x, y] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) { ctx.beginPath(); ctx.arc(L.x0 + x * L.sp, L.y0 + y * L.sp, L.sp * 0.11, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawStone(ctx, p, x, y, r, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (!o.flat) { ctx.fillStyle = 'rgba(40,20,0,.35)'; ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.2, r * 0.98, r * 0.92, 0, 0, Math.PI * 2); ctx.fill(); }
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
    if (p === 1) { gr.addColorStop(0, '#7a7f8a'); gr.addColorStop(0.35, '#2c3038'); gr.addColorStop(1, '#0a0b0e'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#eceae4'); gr.addColorStop(1, '#b7b4ab'); }
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (p === 2) { ctx.strokeStyle = 'rgba(120,110,95,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = p === 1 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.34, y - r * 0.4, r * 0.3, r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawStones(g, ctx, S, t, alpha) {
    const L = S.L, P = S.P, R = L.sp * 0.45;
    for (let c = 0; c < NN; c++) {
      const p = P.b[c];
      if (!p) continue;
      const q = ptOf(L, c);
      let r = R, a = 1;
      if (S.anim && S.anim.c === c) { const k = Math.min(1, (S.anim.t + alpha) / 9); r = R * (1.28 - 0.28 * g.ease.out(k)); a = 0.35 + 0.65 * k; }
      drawStone(ctx, p, q.x, q.y, r, { alpha: a });
    }
    // המהלך האחרון
    if (S.last >= 0 && P.b[S.last]) {
      const q = ptOf(L, S.last), p = P.b[S.last];
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath(); ctx.arc(q.x, q.y, R * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,${p === 1 ? 110 : 80},${p === 1 ? 110 : 80},${0.45 + 0.35 * Math.sin(t * 5)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q.x, q.y, R * 1.12, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function drawLine(g, ctx, S, t) {
    const ln = S.line;
    if (!ln || ln.cells.length < 2) return;
    const L = S.L, a = ptOf(L, ln.cells[0]), b = ptOf(L, ln.cells[ln.cells.length - 1]);
    const k = Math.min(1, (t - ln.t0) / 0.45), good = g.mode === '2p' || S.winner === 1;
    const col = good ? '#ffd84d' : '#ff6b6b';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = L.sp * 0.22;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = L.sp * 0.07;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke();
    for (const c of ln.cells) {
      const q = ptOf(L, c);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.beginPath(); ctx.arc(q.x, q.y, L.sp * 0.52, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function wrap(ctx, s, maxW, font) {
    ctx.font = font;
    const words = String(s).split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawCard(g, ctx, S, p, R, t, look) {
    const L = S.L, active = !S.over && S.P.turn === p, cpu = !isHuman(g, p), glow = active || (S.over && S.winner === p);
    ctx.save();
    g.rr(ctx, R.x, R.y, R.w, R.h, 18);
    const bg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    bg.addColorStop(0, glow ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.07)'); bg.addColorStop(1, glow ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)');
    ctx.fillStyle = bg; ctx.fill();
    if (glow) { ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 14; ctx.strokeStyle = `rgba(255,216,77,${0.65 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 2.5; }
    else { ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; }
    ctx.stroke();
    ctx.restore();
    // הדמות: מסתכלת על המהלך, מתלבטת, שמחה או עצובה
    const rtl = g.rtl, aR = L.port ? 30 : 46, cy = R.y + R.h / 2;
    const ax = rtl ? R.x + R.w - 18 - aR : R.x + 18 + aR, ay = cy + (L.port ? 3 : 5) + (active ? Math.sin(t * 4) * 2.5 : 0);
    let lx = look.x - ax, ly = look.y - ay;
    const ll = Math.hypot(lx, ly) || 1;
    lx /= ll; ly /= ll;
    const mood = moodOf(S, p), blink = S.blink[p] > 0;
    if (cpu) {
      drawRobot(ctx, ax, ay, aR * 0.88, mood, lx, ly, blink, t);
      drawStone(ctx, p, ax + (rtl ? -1 : 1) * aR * 0.8, ay + aR * 0.72, aR * 0.3, {});   // הצבע שהמחשב משחק בו
    } else drawBuddy(ctx, ax, ay, aR, p, mood, lx, ly, blink);
    const tx = rtl ? ax - aR - 18 : ax + aR + 18, al = rtl ? 'right' : 'left', mw = R.w - aR * 2 - 50;
    let sub = '';
    if (g.mode === '2p') sub = '🏆 ' + S.wins[p - 1];
    else if (cpu) sub = g.t(['easy', 'medium', 'hard'][g.diff]);
    if (active && !g.demo) sub = cpu ? g.t('thinking') + '.'.repeat(1 + (Math.floor(t * 3) % 3)) : g.t('yourTurn');
    const dy = sub ? (L.port ? 13 : 16) : 0;
    g.text(ctx, nameOf(g, p), tx, cy - dy, { size: L.port ? 21 : 25, weight: 900, color: '#fff', align: al, maxW: mw, shadow: true });
    if (sub) g.text(ctx, sub, tx, cy + (L.port ? 15 : 19), { size: L.port ? 16 : 18, weight: 700, color: active ? '#ffd84d' : 'rgba(220,230,240,.7)', align: al, maxW: mw });
  }
  function drawPanel(g, ctx, S, t) {
    const L = S.L;
    const lc = S.think ? S.last : S.pend >= 0 ? S.pend : S.kb && S.cur >= 0 ? S.cur : S.hover >= 0 && !S.P.b[S.hover] ? S.hover : S.last;
    const look = lc >= 0 ? ptOf(L, lc) : { x: L.bx + L.bs / 2, y: L.by + L.bs / 2 };
    const sw = L.port && g.rtl;   // בטלפון בעברית/ערבית שחקן 1 מימין
    drawCard(g, ctx, S, 1, L.cards[sw ? 1 : 0], t, look);
    drawCard(g, ctx, S, 2, L.cards[sw ? 0 : 1], t, look);
    const I = L.info;
    g.rr(ctx, I.x, I.y, I.w, I.h, 14); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
    let msg = g.t('moveN', { n: S.P.n + (S.over ? 0 : 1) }), col = '#dfe8f0';
    if (S.warn && S.warn.length && canAct(g)) { msg = g.t('watch'); col = '#ff8a8a'; }
    else if (S.pend >= 0 && canAct(g)) { msg = g.t('tapAgain'); col = '#ffd84d'; }
    else if (S.startMsg > 0) { msg = g.t('starts', { name: nameOf(g, S.first) }); col = '#ffd84d'; }
    g.text(ctx, msg, I.x + I.w / 2, I.y + I.h / 2 + 1, { size: L.port ? 21 : 22, weight: 800, color: col, maxW: I.w - 24 });
    const T = L.tip;
    g.rr(ctx, T.x, T.y, T.w, T.h, 14); ctx.fillStyle = 'rgba(255,216,77,.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,216,77,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    const tips = g.t('tips'), tip = Array.isArray(tips) ? tips[S.tip % tips.length] : String(tips);
    const rtl = g.rtl, x = rtl ? T.x + T.w - 16 : T.x + 16, al = rtl ? 'right' : 'left';
    g.text(ctx, '💡 ' + g.t('tipTitle'), x, T.y + 22, { size: 17, weight: 900, color: '#ffd84d', align: al, maxW: T.w - 32 });
    const fs = 17, lh = L.port ? 22 : 25, lines = wrap(ctx, tip, T.w - 32, '700 ' + fs + 'px Heebo, Arial, sans-serif');
    lines.slice(0, L.port ? 3 : 5).forEach((ln, i) => g.text(ctx, ln, x, T.y + (L.port ? 48 : 54) + i * lh, { size: fs, weight: 700, color: '#e9eef3', align: al, maxW: T.w - 32 }));
  }

  // ---------- הרישום ----------
  GK.register('five-in-row', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 900 : 640; },
    bg: '#16212b', accent: '#ffd84d',
    modes: ['cpu', '2p'],
    diffs: true, diffDefault: 0, diffModes: ['cpu'],
    lowerIsBetter: true,
    text: TEXT,

    setup(g) { g.s = { wins: [0, 0], round: 0 }; },

    init(g) {
      const old = g.s || { wins: [0, 0], round: 0 };
      const S = g.s = { wins: old.wins, round: old.round, P: newPos(), L: layout(g.W, g.H), last: -1, anim: null, pend: -1, cur: -1, kb: false, hover: -1, think: null, thinkT: 0, over: false, winner: 0, line: null, endT: 0, moves1: 0, moves2: 0, warn: [], clock: 0, tip: 0, first: 1, startMsg: 0, mood: [0, 'idle', 'idle'], moodUntil: [0, 0, 0], blink: [0, 0, 0] };
      S.tip = Math.floor(Math.random() * 3);
      if (g.demo) {
        // תמונה יפה מאחורי התפריט: משחק באמצע, עם חמש שחורות זוהרות
        const pos = [[7, 7, 1], [8, 6, 2], [8, 8, 1], [6, 6, 2], [9, 9, 1], [10, 10, 2], [6, 8, 1], [5, 9, 2], [9, 7, 1], [7, 9, 2], [10, 8, 2], [6, 5, 1], [11, 6, 2], [10, 6, 1], [8, 4, 2], [5, 6, 1], [4, 7, 2]];
        for (const [x, y, p] of pos) { S.P.turn = p; play(S.P, y * N + x); }
        S.P.turn = 1;
        S.last = 4 * N + 7;
        return;
      }
      // שני שחקנים: מי שפותח מתחלף בכל סיבוב
      if (g.mode === '2p') { S.first = S.round % 2 ? 2 : 1; S.round++; S.startMsg = 150; }
      S.P.turn = S.first;
      beginTurn(g);
    },

    idle(g) { const S = g.s; if (!S || !S.L) return; S.clock += 1 / 60; if (S.anim && ++S.anim.t > 12) S.anim = null; blinks(S); },

    step(g) {
      const S = g.s;
      S.clock += 1 / 60;
      if (S.anim && ++S.anim.t > 12) S.anim = null;
      if (S.startMsg > 0) S.startMsg--;
      blinks(S);
      if (S.over) { if (S.endT > 0 && --S.endT === 0) finish(g); }
      else {
        // מקלדת: חצים מזיזים סמן, רווח או Enter מניחים
        const a = g.axisHit();
        if ((a.x || a.y) && canAct(g)) {
          if (S.cur < 0) S.cur = S.last >= 0 ? S.last : CENTER;
          const x = Math.max(0, Math.min(N - 1, S.cur % N + a.x)), y = Math.max(0, Math.min(N - 1, ((S.cur / N) | 0) + a.y));
          S.cur = y * N + x; S.kb = true; g.sfx('tick');
        }
        if ((g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter')) && canAct(g) && S.cur >= 0) {
          if (S.P.b[S.cur]) g.sfx('error'); else place(g, S.cur);
        }
        stepCpu(g);
      }
      if (g.mode === '2p') g.hud([[g.t('p1'), '🏆 ' + S.wins[0], '#cfd3da'], [g.t('p2'), '🏆 ' + S.wins[1], '#ffffff']]);
      else { const b = g.getBest(); g.hud([[g.t('moves'), S.moves1], [g.t('best'), b === null ? '—' : b]]); }
    },

    // בוט לבדיקות: משחק את הצד האנושי כמו המחשב הבינוני, דרך אותה פונקציה של לחיצה
    bot(g) {
      const S = g.s;
      if (!canAct(g) || g.frame % 10) return;
      place(g, S.P.n ? greedyPick(S.P, LV[1], Math.random) : CENTER);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S) return;
      const c = cellAt(S.L, p.x, p.y);
      if (type === 'move') {
        S.hover = c; S.kb = false;
        g.canvas.style.cursor = c >= 0 && canAct(g) && !S.P.b[c] ? 'pointer' : 'default';
        return;
      }
      if (type !== 'down' || !canAct(g)) return;
      if (c < 0) { S.pend = -1; return; }
      if (S.P.b[c]) { g.sfx('error'); S.pend = -1; return; }
      // במגע: נגיעה ראשונה מכוונת, נגיעה שנייה באותה נקודה מניחה
      if (p.kind === 'touch' || p.kind === 'pen') {
        if (S.pend !== c) { S.pend = c; g.sfx('tick'); return; }
      }
      place(g, c);
    },

    draw(g, ctx, alpha) {
      const S = g.s, L = S.L, t = S.clock;
      drawBg(g, ctx, t);
      drawBoard(g, ctx, L);
      // אזהרה בקל: איפה המחשב משלים חמש
      if (S.warn && S.warn.length && !S.over) for (const c of S.warn) {
        const q = ptOf(L, c);
        ctx.strokeStyle = `rgba(255,70,70,${0.55 + 0.4 * Math.sin(t * 8)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, L.sp * 0.42, 0, Math.PI * 2); ctx.stroke();
      }
      drawStones(g, ctx, S, t, alpha);
      // רוח רפאים: עכבר, סמן מקלדת או נגיעה ראשונה
      if (canAct(g)) {
        const who = S.P.turn, R = L.sp * 0.45;
        const ghost = S.pend >= 0 ? S.pend : S.kb ? S.cur : g.ptr.over && !g.touch ? S.hover : -1;
        if (ghost >= 0 && !S.P.b[ghost]) {
          const q = ptOf(L, ghost);
          drawStone(ctx, who, q.x, q.y, R, { alpha: S.pend >= 0 ? 0.55 + 0.25 * Math.sin(t * 7) : 0.45, flat: true });
          if (S.pend >= 0 || S.kb) {
            ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(q.x, q.y, R * 1.25, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
      drawLine(g, ctx, S, t);
      drawPanel(g, ctx, S, t);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#2c4152'); bg.addColorStop(1, '#0e151c');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.52); ctx.rotate(-0.16); ctx.translate(-w * 0.5, -h * 0.52);
      const L = { bx: 110, by: -170, bs: 880, x0: 150, y0: -130, sp: 800 / 14 };
      drawBoard(k, ctx, L);
      const P = newPos(), R = L.sp * 0.45;
      const black = [[5, 9], [6, 8], [7, 7], [8, 6], [9, 5], [6, 10], [10, 7], [4, 6]], white = [[4, 10], [10, 4], [7, 9], [8, 8], [5, 7], [9, 8], [6, 6], [11, 6]];
      for (const [x, y] of black) { P.turn = 1; play(P, y * N + x); }
      for (const [x, y] of white) { P.turn = 2; play(P, y * N + x); }
      for (let c = 0; c < NN; c++) if (P.b[c]) { const q = ptOf(L, c); drawStone(ctx, P.b[c], q.x, q.y, R, {}); }
      const a = ptOf(L, 9 * N + 5), b = ptOf(L, 5 * N + 9);
      ctx.lineCap = 'round'; ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 30;
      ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      for (const [x, y] of [[5, 9], [6, 8], [7, 7], [8, 6], [9, 5]]) { const q = ptOf(L, y * N + x); ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, q.y, L.sp * 0.55, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      drawBuddy(ctx, 122, 428, 84, 1, 'happy', 0.6, -0.3, false);
      drawRobot(ctx, 846, 410, 78, 'wow', -0.8, 0.1, false, 0);
      for (let i = 0; i < 26; i++) {
        const an = i * 2.39, r = 30 + (i * 37) % 170;
        ctx.fillStyle = ['#ffd84d', '#fff3b0', '#ffae00'][i % 3]; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(w * 0.55 + Math.cos(an) * r * 1.4, h * 0.45 + Math.sin(an) * r * 0.9, 3 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: { N, NN, CENTER, newPos, play, undo, fiveCells, gain, candidates, nearOne, winLine, greedyPick, cpuThink, vcf, makeSearch, G, LV, WIN },
  });
})();
