// ============================================================
//  דמקה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  לוח 8×8, אכילה חובה, קפיצות ברצף, מלך זז צעד אחד לכל כיוון.
//  נגד המחשב (אלפא-בטא: קל טועה באמת, בינוני אפשר לנצח, קשה חזק) או 2 שחקנים.
// ============================================================
(function () {
  'use strict';

  // ---------- חיפוש אלפא-בטא שאפשר לעצור ולהמשיך בפריים הבא (כדי שהדף לא יקפא) ----------
  // G = { moves(pos, ply) → מסעים מסודרים ([] = אין מסעים), play(pos, m), undo(pos, m),
  //       over(pos, ply) → ניקוד אם המשחק נגמר כאן (מנקודת המבט של מי שתורו), אחרת null,
  //       empty(pos, ply) → ניקוד כשאין מסעים, evaluate(pos) → ניקוד למי שתורו,
  //       extend(pos) → (רשות) להמשיך לחפש גם בעומק 0, למשל כשיש אכילה חובה }
  // מחזיר אובייקט: run(ms) מריץ עד ms מילישניות; done, best, score, depth, nodes.
  const WINSCORE = 1e6;
  function makeSearch(G, pos, maxDepth, budgetMs) {
    const INF = 1e9;
    const root = G.moves(pos, 0).slice();
    const self = { done: false, best: root[0] || null, score: 0, depth: 0, nodes: 0, t: 0, run: () => true };
    if (root.length <= 1) { self.done = true; return self; }
    let depth = 0, stack = [];
    function enter(d, a, b, ply) {
      self.nodes++;
      const o = G.over(pos, ply);
      if (o !== null) return o;
      if (d <= 0 && !(G.extend && ply < 60 && G.extend(pos))) return G.evaluate(pos);
      const ms = ply === 0 ? root : G.moves(pos, ply);
      if (!ms.length) return G.empty(pos, ply);
      return { ms, i: 0, d: d < 1 ? 1 : d, a, b, best: -INF, bm: null, ply, via: null };
    }
    const upd = (fr, v, m) => { if (v > fr.best) { fr.best = v; fr.bm = m; } if (v > fr.a) fr.a = v; };
    function next() { depth++; stack = [enter(depth, -INF, INF, 0)]; }
    function finish(fr, spent) {
      self.best = fr.bm; self.score = fr.best; self.depth = depth;
      const i = root.indexOf(fr.bm);
      if (i > 0) { root.splice(i, 1); root.unshift(fr.bm); }
      if (depth >= maxDepth || Math.abs(fr.best) > WINSCORE / 2 || spent > budgetMs * 0.5) self.done = true;
      else next();
    }
    function abort() {
      const r = stack[0];
      if (r && r.bm && r.bm !== self.best && r.best > -INF) { self.best = r.bm; self.score = r.best; }
      while (stack.length > 1) G.undo(pos, stack.pop().via);
      stack = []; self.done = true;
    }
    self.run = ms => {
      const t0 = performance.now(), base = self.t;
      let n = 0;
      while (!self.done) {
        if ((++n & 127) === 0 && performance.now() - t0 > ms) break;
        const fr = stack[stack.length - 1];
        if (fr.i < fr.ms.length && fr.a < fr.b) {
          const m = fr.ms[fr.i++];
          G.play(pos, m);
          const ch = enter(fr.d - 1, -fr.b, -fr.a, fr.ply + 1);
          if (typeof ch === 'number') { G.undo(pos, m); upd(fr, -ch, m); } else { ch.via = m; stack.push(ch); }
        } else {
          stack.pop();
          if (!stack.length) { finish(fr, base + performance.now() - t0); continue; }
          G.undo(pos, fr.via);
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

  // ---------- כללי הדמקה ----------
  // משבצת: 0 ריק, 1 כלי אדום, 2 מלך אדום, -1 כלי שחור, -2 מלך שחור. האדום למטה ועולה למעלה.
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const DRAW_PLIES = 80;   // 40 מסעים לכל צד בלי אכילה ובלי תזוזה של כלי רגיל — תיקו

  function newPos() {
    const b = new Int8Array(64);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) {
      if (r < 3) b[r * 8 + c] = -1; else if (r > 4) b[r * 8 + c] = 1;
    }
    return { b, turn: 1, quiet: 0, hist: [] };
  }

  function jumps(b, sq, p, king, path, caps, capP, out) {
    const s = p > 0 ? 1 : -1, r = sq >> 3, c = sq & 7;
    let any = false;
    for (const [dr, dc] of DIRS) {
      if (!king && dr !== -s) continue;
      const r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
      const mid = (r + dr) * 8 + c + dc, to = r2 * 8 + c2;
      if (b[mid] * s >= 0 || b[to] !== 0) continue;
      any = true;
      const cp = b[mid];
      b[mid] = 0;
      path.push(to); caps.push(mid); capP.push(cp);
      if (!king && r2 === (s > 0 ? 0 : 7)) out.push({ path: path.slice(), caps: caps.slice(), capP: capP.slice(), p, crown: true });
      else jumps(b, to, p, king, path, caps, capP, out);
      path.pop(); caps.pop(); capP.pop();
      b[mid] = cp;
    }
    if (!any && caps.length) out.push({ path: path.slice(), caps: caps.slice(), capP: capP.slice(), p, crown: false });
  }
  function genMoves(P) {
    const b = P.b, s = P.turn, out = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (p * s <= 0) continue;
      b[sq] = 0;
      jumps(b, sq, p, p === 2 || p === -2, [sq], [], [], out);
      b[sq] = p;
    }
    if (out.length) return out;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (p * s <= 0) continue;
      const king = p === 2 || p === -2, r = sq >> 3, c = sq & 7;
      for (const [dr, dc] of DIRS) {
        if (!king && dr !== -s) continue;
        const r1 = r + dr, c1 = c + dc;
        if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7 || b[r1 * 8 + c1]) continue;
        out.push({ path: [sq, r1 * 8 + c1], caps: [], capP: [], p, crown: !king && r1 === (s > 0 ? 0 : 7) });
      }
    }
    return out;
  }
  function hasCapture(P) {
    const b = P.b, s = P.turn;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (p * s <= 0) continue;
      const king = p === 2 || p === -2, r = sq >> 3, c = sq & 7;
      for (const [dr, dc] of DIRS) {
        if (!king && dr !== -s) continue;
        const r2 = r + 2 * dr, c2 = c + 2 * dc;
        if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
        if (b[(r + dr) * 8 + c + dc] * s < 0 && b[r2 * 8 + c2] === 0) return true;
      }
    }
    return false;
  }
  function play(P, m) {
    const b = P.b, from = m.path[0], to = m.path[m.path.length - 1];
    b[from] = 0;
    for (const c of m.caps) b[c] = 0;
    b[to] = m.crown ? 2 * Math.sign(m.p) : m.p;
    P.hist.push(P.quiet);
    P.quiet = m.caps.length || m.p === 1 || m.p === -1 ? 0 : P.quiet + 1;
    P.turn = -P.turn;
  }
  function undo(P, m) {
    const b = P.b, from = m.path[0], to = m.path[m.path.length - 1];
    P.turn = -P.turn;
    P.quiet = P.hist.pop();
    b[to] = 0;
    for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.capP[i];
    b[from] = m.p;
  }
  function count(P) {
    let r = 0, d = 0;
    for (let i = 0; i < 64; i++) { if (P.b[i] > 0) r++; else if (P.b[i] < 0) d++; }
    return [r, d];
  }

  // הערכת מצב (חיובי = טוב למי שתורו)
  function evaluate(P) {
    const b = P.b;
    let sc = 0, nR = 0, nD = 0, kR = 0, kD = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p) continue;
      const s = p > 0 ? 1 : -1, r = sq >> 3, c = sq & 7;
      let v;
      if (p === 1 || p === -1) {
        const adv = s > 0 ? 7 - r : r;
        v = 100 + adv * 5 + (adv >= 5 ? 8 : 0) + (adv === 0 && (c === 2 || c === 6 || c === 1 || c === 5) ? 9 : 0);
      } else {
        v = 160 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 3;
        if (s > 0) kR++; else kD++;
      }
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 4;
      sc += s * v;
      if (s > 0) nR++; else nD++;
    }
    // מי שמוביל רוצה להחליף כלים; ובסוף המשחק המלכים שלו רודפים אחרי היריב
    const tot = nR + nD, lead = nR - nD;
    if (lead) sc += lead * (24 - tot) * 3;
    if (tot <= 10 && lead) {
      const strong = lead > 0 ? 1 : -1;
      let dist = 0;
      for (let sq = 0; sq < 64; sq++) {
        if (b[sq] !== 2 * strong) continue;
        let best = 99;
        for (let t = 0; t < 64; t++) if (b[t] * strong < 0) best = Math.min(best, Math.max(Math.abs((sq >> 3) - (t >> 3)), Math.abs((sq & 7) - (t & 7))));
        dist += best;
      }
      sc -= strong * dist * 4;
    }
    return sc * P.turn;
  }

  const ORDER = (P, ms) => ms.sort((a, b) => (b.caps.length - a.caps.length) || ((b.crown ? 1 : 0) - (a.crown ? 1 : 0)));
  const G = {
    moves: P => ORDER(P, genMoves(P)),
    play, undo,
    over: P => (P.quiet >= DRAW_PLIES ? 0 : null),
    empty: (P, ply) => -(WINSCORE - ply),
    evaluate,
    extend: hasCapture,
  };
  // רמות: קל = לא מסתכל על התשובה של היריב ולפעמים משחק סתם (טעויות אמיתיות),
  // בינוני = רואה תשובה אחת קדימה ולפעמים טועה, קשה = חיפוש מלא עד שנגמר הזמן (בערך רבע שנייה)
  // הקל לא ממשיך לחפש אכילות אחרי המסע שלו, אז הוא לא רואה שהכלי שלו ייאכל — כמו מתחיל
  const G_EASY = Object.assign({}, G, { extend: null });
  const LEVEL = [{ depth: 1, random: 0.3, budget: 60, g: G_EASY }, { depth: 2, random: 0.12, budget: 120, g: G }, { depth: 30, random: 0, budget: 250, g: G }];
  function cpuSearch(P, diff, rnd) {
    const L = LEVEL[diff];
    const ms = genMoves(P);
    if (ms.length && rnd() < L.random) {
      const pick = ms[Math.floor(rnd() * ms.length)];
      return { done: true, best: pick, run: () => true, depth: 0 };
    }
    return makeSearch(L.g, P, L.depth, L.budget);
  }

  // ---------- פריסה וציור ----------
  const W = 600, H = 700, BX = 20, BY = 20, SQ = 70;
  const LIGHT = '#f2e6c9', DARK = '#3d7a4c';
  const SKIN = {
    1: { top: '#ff7a6b', mid: '#e5392f', side: '#8f1d18', ring: 'rgba(255,255,255,.28)' },
    [-1]: { top: '#5d6379', mid: '#2b2f3d', side: '#0e1017', ring: 'rgba(255,255,255,.22)' },
  };
  const xy = sq => ({ x: BX + (sq & 7) * SQ + SQ / 2, y: BY + (sq >> 3) * SQ + SQ / 2 });
  const sqAt = (x, y) => {
    const c = Math.floor((x - BX) / SQ), r = Math.floor((y - BY) / SQ);
    return c < 0 || c > 7 || r < 0 || r > 7 ? -1 : r * 8 + c;
  };

  function drawCrown(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-11, 6); ctx.lineTo(-13, -6); ctx.lineTo(-6, -1); ctx.lineTo(0, -9); ctx.lineTo(6, -1); ctx.lineTo(13, -6); ctx.lineTo(11, 6); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,0,.85)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = '#fff6c8';
    for (const [bx, by] of [[-13, -6], [0, -9], [13, -6]]) { ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawDisc(ctx, p, x, y, R, o) {
    const sk = SKIN[p > 0 ? 1 : -1], lift = (o && o.lift) || 0, king = p === 2 || p === -2;
    ctx.save();
    if (o && o.alpha != null) ctx.globalAlpha *= o.alpha;
    // צל
    ctx.fillStyle = `rgba(0,0,0,${0.32 - lift * 0.12})`;
    ctx.beginPath(); ctx.ellipse(x + 2 + lift * 6, y + R * 0.32 + lift * 10, R * (1 + lift * 0.1), R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    y -= lift * 14;
    const th = R * 0.24;
    // דופן
    ctx.fillStyle = sk.side;
    ctx.beginPath(); ctx.ellipse(x, y + th, R, R * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - R, y, R * 2, th);
    // פנים
    const gr = ctx.createRadialGradient(x - R * 0.35, y - R * 0.45, R * 0.1, x, y, R);
    gr.addColorStop(0, sk.top); gr.addColorStop(0.75, sk.mid); gr.addColorStop(1, sk.side);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = sk.ring; ctx.lineWidth = R * 0.07;
    ctx.beginPath(); ctx.ellipse(x, y, R * 0.68, R * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, R * 0.4, R * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    if (king) {
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = R * 0.1;
      ctx.beginPath(); ctx.ellipse(x, y, R * 0.9, R * 0.83, 0, 0, Math.PI * 2); ctx.stroke();
      drawCrown(ctx, x, y + 1, R / 22, '#ffd34d');
    }
    // ברק
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.ellipse(x - R * 0.32, y - R * 0.42, R * 0.32, R * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'דמקה', help: ['לחץ על כלי ואז על משבצת (או גרור). כלים זזים באלכסון קדימה', 'אכילה היא חובה! קופצים מעל כלי של היריב, ואפשר כמה קפיצות ברצף', 'כלי שמגיע לצד השני נהיה מלך: זז צעד אחד לכל כיוון, גם אחורה', 'מנצח מי שאוכל את כל הכלים של היריב או חוסם אותו'], helpTouch: ['גע בכלי ואז במשבצת (או גרור). כלים זזים באלכסון קדימה', 'אכילה היא חובה! קופצים מעל כלי של היריב, ואפשר כמה קפיצות ברצף', 'כלי שמגיע לצד השני נהיה מלך: זז צעד אחד לכל כיוון, גם אחורה', 'מנצח מי שאוכל את כל הכלים של היריב או חוסם אותו'], red: 'האדום', black: 'השחור', redTurn: 'תור האדום', blackTurn: 'תור השחור', you: 'אתה', yourTurn: 'התור שלך', thinking: 'המחשב חושב…', mustCapture: 'חובה לאכול!', keepJumping: 'המשך לקפוץ!', king: 'מלך!', piecesLeft: 'כלים שנשארו', drawRule: '40 מסעים בלי אכילה — תיקו', blocked: 'אין לו מסעים — חסום!' },
    en: { title: 'Checkers', help: ['Click a piece, then a square (or drag). Pieces move diagonally forward', 'Capturing is a must! Jump over an enemy piece — several jumps in a row are allowed', 'A piece that reaches the far side becomes a king: one step in any direction, back too', 'Capture all enemy pieces or block them to win'], helpTouch: ['Tap a piece, then a square (or drag). Pieces move diagonally forward', 'Capturing is a must! Jump over an enemy piece — several jumps in a row are allowed', 'A piece that reaches the far side becomes a king: one step in any direction, back too', 'Capture all enemy pieces or block them to win'], red: 'Red', black: 'Black', redTurn: "Red's turn", blackTurn: "Black's turn", you: 'You', yourTurn: 'Your turn', thinking: 'The computer is thinking…', mustCapture: 'You must capture!', keepJumping: 'Keep jumping!', king: 'King!', piecesLeft: 'Pieces left', drawRule: '40 moves without a capture — draw', blocked: 'No moves left — blocked!' },
    ar: { title: 'الداما', help: ['انقر على قطعة ثم على مربع (أو اسحبها). القطع تتحرك قُطرياً إلى الأمام', 'الأكل إجباري! اقفز فوق قطعة الخصم، ويمكن عدة قفزات متتالية', 'القطعة التي تصل إلى الجهة الأخرى تصبح ملكاً: خطوة واحدة في أي اتجاه، للخلف أيضاً', 'تفوز إذا أكلت كل قطع الخصم أو حاصرتها'], helpTouch: ['المس قطعة ثم مربعاً (أو اسحبها). القطع تتحرك قُطرياً إلى الأمام', 'الأكل إجباري! اقفز فوق قطعة الخصم، ويمكن عدة قفزات متتالية', 'القطعة التي تصل إلى الجهة الأخرى تصبح ملكاً: خطوة واحدة في أي اتجاه، للخلف أيضاً', 'تفوز إذا أكلت كل قطع الخصم أو حاصرتها'], red: 'الأحمر', black: 'الأسود', redTurn: 'دور الأحمر', blackTurn: 'دور الأسود', you: 'أنت', yourTurn: 'دورك', thinking: 'الكمبيوتر يفكر…', mustCapture: 'الأكل إجباري!', keepJumping: 'تابع القفز!', king: 'ملك!', piecesLeft: 'القطع المتبقية', drawRule: '40 نقلة بلا أكل — تعادل', blocked: 'لا نقلات — محاصر!' },
    es: { title: 'Damas', help: ['Haz clic en una ficha y luego en una casilla (o arrástrala). Las fichas avanzan en diagonal', '¡Capturar es obligatorio! Salta sobre una ficha rival; se permiten varios saltos seguidos', 'Una ficha que llega al otro lado se corona: un paso en cualquier dirección, también atrás', 'Gana quien captura todas las fichas rivales o las bloquea'], helpTouch: ['Toca una ficha y luego una casilla (o arrástrala). Las fichas avanzan en diagonal', '¡Capturar es obligatorio! Salta sobre una ficha rival; se permiten varios saltos seguidos', 'Una ficha que llega al otro lado se corona: un paso en cualquier dirección, también atrás', 'Gana quien captura todas las fichas rivales o las bloquea'], red: 'Rojo', black: 'Negro', redTurn: 'Turno del rojo', blackTurn: 'Turno del negro', you: 'Tú', yourTurn: 'Tu turno', thinking: 'La computadora piensa…', mustCapture: '¡Tienes que capturar!', keepJumping: '¡Sigue saltando!', king: '¡Dama!', piecesLeft: 'Fichas restantes', drawRule: '40 jugadas sin capturas — empate', blocked: '¡Sin jugadas — bloqueado!' },
    fr: { title: 'Dames', help: ['Clique sur un pion puis sur une case (ou fais-le glisser). Les pions avancent en diagonale', 'La prise est obligatoire ! Saute par-dessus un pion adverse ; plusieurs sauts à la suite sont permis', "Un pion qui atteint l'autre bord devient une dame : un pas dans tous les sens, même en arrière", 'Gagne en prenant tous les pions adverses ou en les bloquant'], helpTouch: ['Touche un pion puis une case (ou fais-le glisser). Les pions avancent en diagonale', 'La prise est obligatoire ! Saute par-dessus un pion adverse ; plusieurs sauts à la suite sont permis', "Un pion qui atteint l'autre bord devient une dame : un pas dans tous les sens, même en arrière", 'Gagne en prenant tous les pions adverses ou en les bloquant'], red: 'Rouge', black: 'Noir', redTurn: 'Au tour du rouge', blackTurn: 'Au tour du noir', you: 'Toi', yourTurn: 'À toi de jouer', thinking: "L'ordinateur réfléchit…", mustCapture: 'Tu dois prendre !', keepJumping: 'Continue à sauter !', king: 'Dame !', piecesLeft: 'Pions restants', drawRule: '40 coups sans prise — nulle', blocked: 'Plus de coups — bloqué !' },
    pt: { title: 'Damas', help: ['Clique numa peça e depois numa casa (ou arraste). As peças andam na diagonal para a frente', 'Capturar é obrigatório! Salte sobre uma peça rival; vários saltos seguidos são permitidos', 'Uma peça que chega ao outro lado vira dama: um passo em qualquer direção, para trás também', 'Vence quem captura todas as peças rivais ou as bloqueia'], helpTouch: ['Toque numa peça e depois numa casa (ou arraste). As peças andam na diagonal para a frente', 'Capturar é obrigatório! Salte sobre uma peça rival; vários saltos seguidos são permitidos', 'Uma peça que chega ao outro lado vira dama: um passo em qualquer direção, para trás também', 'Vence quem captura todas as peças rivais ou as bloqueia'], red: 'Vermelho', black: 'Preto', redTurn: 'Vez do vermelho', blackTurn: 'Vez do preto', you: 'Você', yourTurn: 'Sua vez', thinking: 'O computador está pensando…', mustCapture: 'Você tem que capturar!', keepJumping: 'Continue saltando!', king: 'Dama!', piecesLeft: 'Peças restantes', drawRule: '40 lances sem captura — empate', blocked: 'Sem lances — bloqueado!' },
    ru: { title: 'Шашки', help: ['Нажми на шашку, потом на клетку (или перетащи). Шашки ходят по диагонали вперёд', 'Бить обязательно! Перепрыгни шашку соперника — можно несколько прыжков подряд', 'Шашка, дошедшая до другого края, становится дамкой: шаг в любую сторону, и назад тоже', 'Побеждает тот, кто съест все шашки соперника или запрёт их'], helpTouch: ['Коснись шашки, потом клетки (или перетащи). Шашки ходят по диагонали вперёд', 'Бить обязательно! Перепрыгни шашку соперника — можно несколько прыжков подряд', 'Шашка, дошедшая до другого края, становится дамкой: шаг в любую сторону, и назад тоже', 'Побеждает тот, кто съест все шашки соперника или запрёт их'], red: 'Красные', black: 'Чёрные', redTurn: 'Ход красных', blackTurn: 'Ход чёрных', you: 'Ты', yourTurn: 'Твой ход', thinking: 'Компьютер думает…', mustCapture: 'Бить обязательно!', keepJumping: 'Прыгай дальше!', king: 'Дамка!', piecesLeft: 'Осталось шашек', drawRule: '40 ходов без взятий — ничья', blocked: 'Нет ходов — заперт!' },
    de: { title: 'Dame', help: ['Klicke einen Stein und dann ein Feld an (oder zieh ihn). Steine ziehen schräg nach vorn', 'Schlagen ist Pflicht! Spring über einen gegnerischen Stein – mehrere Sprünge hintereinander sind erlaubt', 'Ein Stein auf der anderen Seite wird zur Dame: ein Schritt in jede Richtung, auch zurück', 'Gewonnen hat, wer alle gegnerischen Steine schlägt oder blockiert'], helpTouch: ['Tippe einen Stein und dann ein Feld an (oder zieh ihn). Steine ziehen schräg nach vorn', 'Schlagen ist Pflicht! Spring über einen gegnerischen Stein – mehrere Sprünge hintereinander sind erlaubt', 'Ein Stein auf der anderen Seite wird zur Dame: ein Schritt in jede Richtung, auch zurück', 'Gewonnen hat, wer alle gegnerischen Steine schlägt oder blockiert'], red: 'Rot', black: 'Schwarz', redTurn: 'Rot ist dran', blackTurn: 'Schwarz ist dran', you: 'Du', yourTurn: 'Du bist dran', thinking: 'Der Computer denkt nach…', mustCapture: 'Du musst schlagen!', keepJumping: 'Spring weiter!', king: 'Dame!', piecesLeft: 'Steine übrig', drawRule: '40 Züge ohne Schlagen — unentschieden', blocked: 'Keine Züge mehr — blockiert!' },
  };

  // ---------- מצב המשחק ----------
  const isHuman = (g, side) => g.mode === '2p' || side === 1;

  function beginTurn(g) {
    const S = g.s, P = S.P;
    S.moves = genMoves(P);
    S.sel = -1; S.partial = null;
    S.mustCap = S.moves.length > 0 && S.moves[0].caps.length > 0;
    if (!S.moves.length) return finish(g, -P.turn, 'blocked');
    if (P.quiet >= DRAW_PLIES) return finish(g, 0, 'drawRule');
    if (!isHuman(g, P.turn) && !g.demo) {
      S.think = { search: cpuSearch(P, g.diff, Math.random), t0: g.time };
    }
  }

  function finish(g, winner, why) {
    const S = g.s;
    S.over = true;
    const [r, d] = count(S.P);
    S.overWhy = why;
    if (g.demo) return;
    if (winner === 0) { g.end({ result: 'draw', score: null, text: g.t('drawRule') }); return; }
    const txt = why === 'blocked' ? g.t('blocked') : null;
    if (g.mode === '2p') {
      S.wins[winner > 0 ? 0 : 1]++;
      g.end({ winner: g.t(winner > 0 ? 'red' : 'black'), score: null, text: txt });
    } else if (winner > 0) g.end({ result: 'win', score: r, scoreLabel: g.t('piecesLeft'), text: txt });
    else g.end({ result: 'lose', score: null, text: txt });
  }

  // מבצע מסע שלם (עם אנימציה של כל הקפיצות), ואז מעביר תור
  function commit(g, m, fromHuman) {
    const S = g.s, P = S.P;
    S.last = { from: m.path[0], to: m.path[m.path.length - 1], path: m.path.slice() };
    const startHop = fromHuman && S.partial ? S.partial.hops : 0;
    play(P, m);
    S.anim = { m, hop: startHop, t: 0, hopDur: 10, popped: startHop };
    S.sel = -1; S.partial = null; S.moves = [];
  }

  function stepAnim(g) {
    const S = g.s, a = S.anim;
    if (!a) return;
    a.t++;
    if (a.t >= a.hopDur) {
      // נחיתה של קפיצה
      const m = a.m, i = a.hop;
      if (m.caps.length) {
        const c = m.caps[i], q = xy(c), col = m.capP[i] > 0 ? ['#ff7a6b', '#ffd0c8'] : ['#5d6379', '#c7cbe0'];
        g.burst(q.x, q.y, { n: 22, color: [...col, '#ffffff'], speed: 4, life: 34, size: 5 });
        g.sfx('hit', { p: 1 + i * 0.12 }); g.shake(4);
        a.popped = i + 1;
      } else g.sfx('place');
      a.hop++; a.t = 0;
      if (a.hop >= m.path.length - 1) {
        S.anim = null;
        if (m.crown) {
          const q = xy(m.path[m.path.length - 1]);
          g.burst(q.x, q.y, { n: 34, color: ['#ffd34d', '#fff3b0', '#ffae00'], speed: 5, life: 46, size: 5 });
          g.float(q.x, q.y - 30, g.t('king'), { color: '#ffd34d', size: 26 });
          g.sfx('power'); g.flash('#ffe9a0', 0.15);
        }
        beginTurn(g);
      }
    }
  }

  // ----- קלט של אדם (עכבר, מגע, בוט) -----
  function movesFrom(S, sq) {
    const hops = S.partial ? S.partial.hops : 0;
    return S.moves.filter(m => m.path[hops] === sq && (!S.partial || S.partial.list.includes(m)));
  }
  function targetsOf(S) {
    if (S.sel < 0) return [];
    const hops = S.partial ? S.partial.hops : 0, out = new Map();
    for (const m of movesFrom(S, S.sel)) out.set(m.path[hops + 1], true);
    return [...out.keys()];
  }
  function canAct(g) {
    const S = g.s;
    return !S.over && !S.anim && !S.think && isHuman(g, S.P.turn) && g.state === 'play';
  }
  function clickSq(g, sq) {
    const S = g.s;
    if (!canAct(g) || sq < 0) return;
    if (S.sel >= 0 && targetsOf(S).includes(sq)) { hopTo(g, sq); return; }
    if (S.partial) { g.sfx('error'); g.msg(g.t('keepJumping'), 900, '#ffd34d'); return; }
    const p = S.P.b[sq];
    if (p && Math.sign(p) === S.P.turn) {
      if (movesFrom(S, sq).length) { S.sel = sq; g.sfx('click'); }
      else {
        S.sel = -1;
        S.nudge = { sq, t: 0 };
        g.sfx('error');
        if (S.mustCap) { g.msg(g.t('mustCapture'), 1100, '#ffd34d'); S.capFlash = 60; }
      }
    } else S.sel = -1;
  }
  function hopTo(g, sq) {
    const S = g.s, hops = S.partial ? S.partial.hops : 0;
    const list = movesFrom(S, S.sel).filter(m => m.path[hops + 1] === sq);
    const done = list.find(m => m.path.length === hops + 2);
    if (done && list.length === 1) { commit(g, done, true); return; }
    if (done) { commit(g, done, true); return; }
    // עוד קפיצות בדרך: הכלי זז צעד אחד ומחכה לקפיצה הבאה
    S.partial = { hops: hops + 1, list, from: S.partial ? S.partial.from : S.sel };
    const c = list[0].caps[hops], q = xy(c), cp = list[0].capP[hops];
    g.burst(q.x, q.y, { n: 18, color: cp > 0 ? ['#ff7a6b', '#ffffff'] : ['#5d6379', '#ffffff'], speed: 3.5, life: 30, size: 5 });
    g.sfx('hit'); g.shake(3);
    S.hopAnim = { from: S.sel, to: sq, t: 0 };
    S.sel = sq;
  }

  // ----- המחשב -----
  function stepCpu(g) {
    const S = g.s, th = S.think;
    if (!th) return;
    const now = performance.now();
    if (!th.search.done && now - (S.sliceEnd || 0) > 4) { th.search.run(9); S.sliceEnd = performance.now(); }
    if (th.search.done && g.time - th.t0 >= 0.45) {
      const m = th.search.best;
      S.think = null;
      if (m) commit(g, m, false);
    }
  }

  // בוט לבדיקות: משחק את הצד האנושי דרך אותן לחיצות, עם חיפוש קטן
  function botMove(g) {
    const S = g.s;
    if (!canAct(g) || (g.frame % 12)) return;
    if (S.partial) {
      const m = S.partial.list[0];
      clickSq(g, m.path[S.partial.hops + 1]);
      return;
    }
    if (!S.botPlan) {
      const s = makeSearch(G, S.P, 2, 50); while (!s.run(50));
      S.botPlan = s.best;
    }
    const m = S.botPlan;
    if (S.sel !== m.path[0]) clickSq(g, m.path[0]);
    else { clickSq(g, m.path[1]); if (!S.partial) S.botPlan = null; }
    if (!S.moves.length) S.botPlan = null;
  }

  // ----- ציור -----
  function drawBoard(g, ctx) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#173225'); gr.addColorStop(1, '#0a1712');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    g.rr(ctx, BX - 11, BY - 11, SQ * 8 + 22, SQ * 8 + 22, 14);
    const fr = ctx.createLinearGradient(0, BY - 11, 0, BY + SQ * 8 + 11);
    fr.addColorStop(0, '#7a4a28'); fr.addColorStop(1, '#4a2a14');
    ctx.fillStyle = fr; ctx.fill();
    ctx.restore();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? DARK : LIGHT;
      ctx.fillRect(BX + c * SQ, BY + r * SQ, SQ, SQ);
    }
    const sh = ctx.createLinearGradient(BX, BY, BX + SQ * 8, BY + SQ * 8);
    sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = sh; ctx.fillRect(BX, BY, SQ * 8, SQ * 8);
  }
  function tint(ctx, sq, col) { ctx.fillStyle = col; ctx.fillRect(BX + (sq & 7) * SQ, BY + (sq >> 3) * SQ, SQ, SQ); }

  function drawStrip(g, ctx, S) {
    const y0 = BY + SQ * 8 + 22, h = H - y0 - 12, rtl = g.rtl;
    g.rr(ctx, 12, y0, W - 24, h, 16);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    const P = S.P, [r, d] = count(P), turn = P.turn;
    // מי בתור
    let msg;
    if (S.over) msg = '';
    else if (g.mode === '2p') msg = g.t(turn > 0 ? 'redTurn' : 'blackTurn');
    else msg = turn > 0 ? g.t('yourTurn') : g.t('thinking');
    const tx = rtl ? W - 34 : 34, align = rtl ? 'right' : 'left';
    if (msg) {
      const dx = rtl ? tx - 16 : tx + 16;
      drawDisc(ctx, turn, dx, y0 + h / 2 - 2, 15);
      const pulse = !isHuman(g, turn) ? 0.6 + 0.4 * Math.sin(g.frame / 8) : 1;
      g.text(ctx, msg, rtl ? tx - 44 : tx + 44, y0 + h / 2, { size: 23, weight: 900, color: '#fff', align, alpha: pulse, maxW: W - 320 });
    }
    // כמה כלים לכל צד: עיגול קטן ולידו המספר
    const base = rtl ? 44 : W - 182;
    [[1, r], [-1, d]].forEach(([s, n], i) => {
      const x = base + i * 82;
      drawDisc(ctx, s, x, y0 + h / 2 - 2, 14);
      g.text(ctx, String(n), x + 22, y0 + h / 2 + 1, { size: 25, weight: 900, color: s > 0 ? '#ff9a8f' : '#c7cbe0', align: 'left' });
    });
  }

  GK.register('checkers', {
    w: W, h: H, bg: '#10241b', accent: '#ff7a6b',
    modes: ['cpu', '2p'],
    diffs: true, diffDefault: 0, diffModes: ['cpu'],
    lowerIsBetter: false,
    text: TEXT,

    setup(g) { g.s = { wins: [0, 0] }; },

    init(g) {
      const wins = g.s ? g.s.wins : [0, 0];
      const S = g.s = { wins, P: newPos(), moves: [], sel: -1, partial: null, anim: null, think: null, last: null, over: false, drag: null, down: null, nudge: null, capFlash: 0, hopAnim: null, botPlan: null, mustCap: false };
      if (g.demo) {
        // תמונה יפה מאחורי התפריט: כמה מסעים של פתיחה
        const rnd = g.seeded(5);
        for (let i = 0; i < 6; i++) { const ms = genMoves(S.P); play(S.P, ms[Math.floor(rnd() * ms.length)]); }
        S.P.hist = [];
      }
      beginTurn(g);
    },

    step(g) {
      const S = g.s;
      if (S.hopAnim && ++S.hopAnim.t > 8) S.hopAnim = null;
      if (S.nudge && ++S.nudge.t > 18) S.nudge = null;
      if (S.capFlash > 0) S.capFlash--;
      stepAnim(g);
      if (!S.anim && !S.over) stepCpu(g);
      const [r, d] = count(S.P);
      if (g.mode === '2p') g.hud([[g.t('red'), r, '#ff8a7d'], [g.t('black'), d, '#aab0c8'], ['🏆', S.wins[0] + ' : ' + S.wins[1]]]);
      else g.hud([[g.t('you'), r, '#ff8a7d'], [g.t('cpu'), d, '#aab0c8'], [g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff])]]);
    },

    bot(g) { botMove(g); },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S) return;
      const sq = sqAt(p.x, p.y);
      if (type === 'down') {
        const wasSel = S.sel;
        clickSq(g, sq);
        S.down = { x: p.x, y: p.y, sq, wasSel };
      } else if (type === 'move') {
        if (S.down && !S.drag && S.sel >= 0 && S.down.sq === S.sel && Math.hypot(p.x - S.down.x, p.y - S.down.y) > 8) S.drag = { sq: S.sel };
        if (S.drag) { S.drag.x = p.x; S.drag.y = p.y; }
        const mine = canAct(g) && sq >= 0 && Math.sign(S.P.b[sq]) === S.P.turn && movesFrom(S, sq).length;
        g.canvas.style.cursor = S.drag ? 'grabbing' : mine || (S.sel >= 0 && targetsOf(S).includes(sq)) ? 'pointer' : 'default';
      } else if (type === 'up') {
        const d = S.down;
        S.down = null;
        if (S.drag) {
          S.drag = null;
          if (sq >= 0 && sq !== S.sel && S.sel >= 0 && targetsOf(S).includes(sq)) hopTo(g, sq);
          return;
        }
        if (d && d.sq === d.wasSel && S.sel === d.sq && !S.partial && sq === d.sq) S.sel = -1;
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s, P = S.P, t = g.frame / 60;
      drawBoard(g, ctx);
      if (S.last) { tint(ctx, S.last.from, 'rgba(255,214,64,.30)'); tint(ctx, S.last.to, 'rgba(255,214,64,.40)'); }
      const a = S.anim;
      const hide = new Set();
      if (a) hide.add(a.m.path[a.m.path.length - 1]);
      if (S.drag) hide.add(S.drag.sq);
      // באמצע קפיצה כפולה הלוח עוד לא השתנה: הכלי מצויר במשבצת שאליה קפץ, לא במקום ההתחלה
      const partialP = S.partial ? S.partial.list[0].p : 0;
      if (S.partial) hide.add(S.partial.from);
      // כלים שחייבים לאכול (כשהשחקן לחץ על כלי אחר)
      const capSet = new Set();
      if (canAct(g) && S.mustCap && !S.partial) for (const m of S.moves) capSet.add(m.path[0]);
      if (S.sel >= 0) tint(ctx, S.sel, 'rgba(255,230,120,.55)');
      // כלים שנאכלים באמצע אנימציה, וכלים שנאכלו בקפיצה חלקית
      const pendingCaps = new Set(S.partial ? S.partial.list[0].caps.slice(0, S.partial.hops) : []);
      for (let sq = 0; sq < 64; sq++) {
        const p = P.b[sq];
        if (!p || hide.has(sq) || pendingCaps.has(sq)) continue;
        const q = xy(sq);
        let x = q.x;
        if (S.nudge && S.nudge.sq === sq) x += Math.sin(S.nudge.t * 1.4) * 5 * (1 - S.nudge.t / 18);
        if (capSet.has(sq) && (S.capFlash > 0 || S.sel < 0)) {
          const k = S.capFlash > 0 ? 0.9 : 0.45 + Math.sin(t * 5) * 0.25;
          ctx.strokeStyle = `rgba(255,211,77,${k})`; ctx.lineWidth = 4;
          g.circle(ctx, q.x, q.y, SQ * 0.46); ctx.stroke();
        }
        drawDisc(ctx, p, x, q.y, SQ * 0.36);
      }
      if (a) {
        // כלים שעוד לא נאכלו בזמן האנימציה
        for (let i = a.popped; i < a.m.caps.length; i++) { const q = xy(a.m.caps[i]); drawDisc(ctx, a.m.capP[i], q.x, q.y, SQ * 0.36); }
        const k = Math.min(1, (a.t + alpha) / a.hopDur), e = g.ease.inOut(k);
        const p1 = xy(a.m.path[a.hop]), p2 = xy(a.m.path[Math.min(a.hop + 1, a.m.path.length - 1)]);
        const jump = a.m.caps.length ? Math.sin(k * Math.PI) : Math.sin(k * Math.PI) * 0.3;
        const showP = a.m.crown && a.hop >= a.m.path.length - 2 && k > 0.95 ? 2 * Math.sign(a.m.p) : a.m.p;
        drawDisc(ctx, showP, p1.x + (p2.x - p1.x) * e, p1.y + (p2.y - p1.y) * e, SQ * 0.36, { lift: jump });
      }
      if (S.partial && S.hopAnim) {
        const k = g.ease.inOut(Math.min(1, (S.hopAnim.t + alpha) / 8)), p1 = xy(S.hopAnim.from), p2 = xy(S.hopAnim.to);
        drawDisc(ctx, partialP, p1.x + (p2.x - p1.x) * k, p1.y + (p2.y - p1.y) * k, SQ * 0.36, { lift: Math.sin(k * Math.PI) });
      } else if (S.partial && !S.drag) { const q = xy(S.sel); drawDisc(ctx, partialP, q.x, q.y, SQ * 0.36); }
      // יעדים חוקיים
      if (S.sel >= 0 && canAct(g)) {
        for (const to of targetsOf(S)) {
          const q = xy(to);
          g.circle(ctx, q.x, q.y, SQ * 0.17);
          ctx.fillStyle = `rgba(255,236,150,${0.65 + Math.sin(t * 6) * 0.2})`; ctx.fill();
        }
      }
      if (S.drag && S.drag.x != null) {
        const p = S.partial ? S.partial.list[0].p : P.b[S.drag.sq];
        drawDisc(ctx, p, S.drag.x, S.drag.y, SQ * 0.4, { lift: 0.5 });
      }
      drawStrip(g, ctx, S);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1f4a33'); bg.addColorStop(1, '#0a1712');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const sq = 96, ox = 110, oy = -8;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(0.08); ctx.translate(-w / 2, -h / 2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      k.rr(ctx, ox - 14, oy - 14, sq * 8 + 28, sq * 8 + 28, 18); ctx.fillStyle = '#5c3519'; ctx.fill();
      ctx.shadowColor = 'transparent';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? DARK : LIGHT; ctx.fillRect(ox + c * sq, oy + r * sq, sq, sq); }
      const at = (c, r) => [ox + c * sq + sq / 2, oy + r * sq + sq / 2];
      const R = sq * 0.38;
      for (const [c, r] of [[1, 0], [3, 0], [0, 1], [2, 1], [7, 2]]) drawDisc(ctx, -1, ...at(c, r), R);
      for (const [c, r] of [[0, 5], [4, 5], [7, 4], [1, 4]]) drawDisc(ctx, 1, ...at(c, r), R);
      // מלך אדום קופץ פעמיים: מ-(2,5) מעל (3,4) אל (4,3), ומעל (5,2) אל (6,1)
      const hops = [at(2, 5), at(4, 3), at(6, 1)];
      drawDisc(ctx, 2, ...hops[0], R, { alpha: 0.28 });
      drawDisc(ctx, -1, ...at(3, 4), R, { alpha: 0.4 });
      drawDisc(ctx, -1, ...at(5, 2), R, { alpha: 0.75 });
      ctx.strokeStyle = 'rgba(255,236,150,.95)'; ctx.lineWidth = 7; ctx.setLineDash([16, 12]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...hops[0]);
      for (let i = 1; i < hops.length; i++) {
        const [x0, y0] = hops[i - 1], [x1, y1] = hops[i];
        ctx.quadraticCurveTo((x0 + x1) / 2 - 40, (y0 + y1) / 2 - 40, x1, y1);
      }
      ctx.stroke(); ctx.setLineDash([]);
      drawDisc(ctx, 2, ...hops[2], R * 1.12, { lift: 0.7 });
      ctx.restore();
      const [kx, ky] = hops[2];
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39, r = 40 + (i * 29) % 110;
        ctx.fillStyle = ['#ffd34d', '#fff3b0', '#ff7a6b'][i % 3]; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(kx + Math.cos(a) * r * 1.1, ky + 10 + Math.sin(a) * r * 0.7, 3 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    dev: {
      newPos, genMoves, play, undo, evaluate, count, makeSearch, G, LEVEL, cpuSearch, hasCapture, DRAW_PLIES, beginTurn,
      // מציב לוח (64 מספרים) ותור, כדי לבדוק מצבים מיוחדים
      setBoard(g, cells, turn, quiet) { const S = g.s; S.P = { b: Int8Array.from(cells), turn, quiet: quiet || 0, hist: [] }; S.anim = null; S.think = null; S.over = false; S.last = null; beginTurn(g); },
    },
  });
})();
