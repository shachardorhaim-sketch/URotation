// ============================================================
//  צוללות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מציבים 5 ספינות (גרירה, סיבוב בלחיצה, או הצבה אקראית) ויורים בתורות במים של האויב.
//  פגיעה = עוד ירייה. ספינות לא נוגעות זו בזו, וסביב ספינה שטבעה המים מסומנים לבד.
//  נגד המחשב (קל: יורה כמעט סתם, בינוני: רודף אחרי פגיעות, קשה: מפת הסתברות)
//  או 2 שחקנים על מחשב אחד, עם מסך "העבר את המחשב" בין התורות כדי שאף אחד לא יציץ.
// ============================================================
(function () {
  'use strict';

  // ---------- כללים ----------
  const N = 10, NN = N * N;
  const FLEET = [5, 4, 3, 3, 2];
  const KEYS = ['carrier', 'battleship', 'cruiser', 'sub', 'destroyer'];
  const MISS = 1, HIT = 2, WATER = 3, SUNK = 4;   // מה ידוע על משבצת: החטאה, פגיעה, מים בטוחים, חלק מספינה שטבעה
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  // קצב (בצעדים של 1/60 שנייה)
  const T = { shell: 20, afterHit: 24, afterSunk: 62, afterMiss: 46, aim: 30, aimHold: 10, cpuAfterHit: 34, cpuAfterSunk: 66, cpuAfterMiss: 44, pass: 64, end: 120 };
  // המחשב: follow = הסיכוי לרדוף אחרי פגיעה (קל/בינוני). קשה = מפת הסתברות מלאה.
  // נבדק ב-tests/battleships/winrates.mjs: ילד (יורה סתם, ואחרי פגיעה סביבה) מנצח את הקל ~92%, את הבינוני ~54%
  const AI = [{ follow: 0.18 }, { follow: 0.8 }, { map: true }];

  const cellsOf = (s, x = s.x, y = s.y, h = s.h) => { const a = []; for (let k = 0; k < s.len; k++) a.push(h ? y * N + x + k : (y + k) * N + x); return a; };

  function newSide() {
    return {
      ships: FLEET.map((len, i) => ({ i, len, x: 0, y: 0, h: true, placed: false, hits: 0, sunk: false })),
      grid: new Int8Array(NN), shots: new Int8Array(NN), at: new Float32Array(NN).fill(-99),
      fired: 0, hit: 0, left: FLEET.length,
    };
  }
  function rebuild(side) {
    side.grid.fill(0);
    for (const s of side.ships) if (s.placed) for (const c of cellsOf(s)) side.grid[c] = s.i + 1;
  }
  const fits = (s, x, y, h) => x >= 0 && y >= 0 && (h ? x + s.len <= N && y < N : y + s.len <= N && x < N);
  // אפשר להניח כאן? בתוך הלוח, ושום ספינה אחרת לא נוגעת (גם לא באלכסון)
  function canPlace(side, s, x, y, h) {
    if (!fits(s, x, y, h)) return false;
    for (let k = 0; k < s.len; k++) {
      const cx = h ? x + k : x, cy = h ? y : y + k;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const v = side.grid[ny * N + nx];
        if (v && v !== s.i + 1) return false;
      }
    }
    return true;
  }
  function autoPlace(side, rnd) {
    for (let tries = 0; tries < 300; tries++) {
      for (const s of side.ships) s.placed = false;
      rebuild(side);
      let ok = true;
      for (const s of side.ships) {
        let done = false;
        for (let k = 0; k < 400 && !done; k++) {
          const h = rnd() < 0.5, x = Math.floor(rnd() * N), y = Math.floor(rnd() * N);
          if (canPlace(side, s, x, y, h)) { s.x = x; s.y = y; s.h = h; s.placed = true; rebuild(side); done = true; }
        }
        if (!done) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }
  const allPlaced = side => side.ships.every(s => s.placed);
  function validFleet(side) {
    if (!allPlaced(side)) return false;
    rebuild(side);
    return side.ships.every(s => canPlace(side, s, s.x, s.y, s.h));
  }
  // ירייה במשבצת c של הצד הזה
  function shoot(side, c) {
    if (c < 0 || c >= NN || side.shots[c]) return null;
    const v = side.grid[c];
    if (!v) { side.shots[c] = MISS; return { hit: false }; }
    side.shots[c] = HIT;
    const s = side.ships[v - 1];
    s.hits++;
    if (s.hits < s.len) return { hit: true, ship: null };
    s.sunk = true; side.left--;
    const cells = cellsOf(s), water = [];
    for (const q of cells) side.shots[q] = SUNK;
    for (const q of cells) {
      const qx = q % N, qy = (q / N) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const n = ny * N + nx;
        if (!side.shots[n]) { side.shots[n] = WATER; water.push(n); }
      }
    }
    return { hit: true, ship: s, water, win: side.left === 0 };
  }

  // ---------- המחשב ----------
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const hasHit = sh => { for (let c = 0; c < NN; c++) if (sh[c] === HIT) return true; return false; };
  function unknownCells(sh) { const a = []; for (let c = 0; c < NN; c++) if (!sh[c]) a.push(c); return a; }
  // מצב "ציד": להמשיך שורה של פגיעות, ואם אין — השכנים של פגיעה
  function targetCells(sh) {
    const line = [], adj = [];
    for (let c = 0; c < NN; c++) {
      if (sh[c] !== HIT) continue;
      const x = c % N, y = (c / N) | 0;
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || sh[ny * N + nx]) continue;
        const ox = x - dx, oy = y - dy;
        const behind = ox >= 0 && oy >= 0 && ox < N && oy < N && sh[oy * N + ox] === HIT;
        (behind ? line : adj).push(ny * N + nx);
      }
    }
    return line.length ? line : adj;
  }
  // ספינה במקום הזה הייתה נוגעת בפגיעה שלא בתוכה — אי אפשר (ספינות לא נוגעות)
  function touchesHit(sh, x, y, h, len) {
    const x2 = h ? x + len - 1 : x, y2 = h ? y : y + len - 1;
    for (let yy = y - 1; yy <= y2 + 1; yy++) for (let xx = x - 1; xx <= x2 + 1; xx++) {
      if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
      if (xx >= x && xx <= x2 && yy >= y && yy <= y2) continue;
      if (sh[yy * N + xx] === HIT) return true;
    }
    return false;
  }
  // מפת הסתברות: בכמה מקומות אפשריים כל ספינה שעוד צפה עוברת בכל משבצת
  function densityMap(side) {
    const sh = side.shots, D = new Float32Array(NN), target = hasHit(sh);
    for (const s of side.ships) {
      if (s.sunk) continue;
      const len = s.len;
      for (let o = 0; o < 2; o++) {
        const h = o === 0;
        for (let y = 0; y < (h ? N : N - len + 1); y++) for (let x = 0; x < (h ? N - len + 1 : N); x++) {
          let ok = true, nh = 0;
          for (let k = 0; k < len; k++) {
            const v = sh[h ? y * N + x + k : (y + k) * N + x];
            if (v === MISS || v === WATER || v === SUNK) { ok = false; break; }
            if (v === HIT) nh++;
          }
          if (!ok || (target && (!nh || touchesHit(sh, x, y, h, len)))) continue;
          for (let k = 0; k < len; k++) { const c = h ? y * N + x + k : (y + k) * N + x; if (!sh[c]) D[c] += 1; }
        }
      }
    }
    return D;
  }
  function aiPick(side, diff, rnd) {
    const sh = side.shots, pick = a => a[Math.floor(rnd() * a.length)];
    const L = AI[diff] || AI[0];
    if (L.map) {
      const D = densityMap(side);
      let mx = 0;
      for (let c = 0; c < NN; c++) if (D[c] > mx) mx = D[c];
      if (mx > 0) {
        const thr = hasHit(sh) ? mx : mx * 0.9, top = [];
        for (let c = 0; c < NN; c++) if (!sh[c] && D[c] >= thr) top.push(c);
        if (top.length) return pick(top);
      }
    } else if (hasHit(sh) && rnd() < L.follow) {
      const t = targetCells(sh);
      if (t.length) return pick(t);
    }
    const u = unknownCells(sh);
    return u.length ? pick(u) : -1;
  }
  // שחקן "ילד" (לבדיקות ולבוט): יורה סתם, ואחרי פגיעה ממשיך סביבה
  function kidPick(side, rnd) {
    const sh = side.shots, pick = a => a[Math.floor(rnd() * a.length)];
    if (hasHit(sh)) { const t = targetCells(sh); if (t.length) return pick(t); }
    const u = unknownCells(sh);
    return u.length ? pick(u) : -1;
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'צוללות', help: ['גרור את הספינות אל הלוח. לחץ על ספינה כדי לסובב אותה (או R)', 'אסור לספינות לגעת זו בזו, גם לא באלכסון', 'לחץ על המים של האויב כדי לירות. פגיעה = עוד ירייה!', 'מי שמטביע ראשון את כל הצי של היריב — מנצח', '2 שחקנים: מעבירים את המחשב בין התורות. בלי להציץ!'], helpTouch: ['גרור את הספינות אל הלוח. גע בספינה כדי לסובב אותה', 'אסור לספינות לגעת זו בזו, גם לא באלכסון', 'גע במים של האויב כדי לירות. פגיעה = עוד ירייה!', 'מי שמטביע ראשון את כל הצי של היריב — מנצח'], yourFleet: 'הצי שלך', enemyWaters: 'המים של האויב', fleetOf: 'הצי של {name}', placeFor: '{name}: הצב את הצי', dragHint: 'גרור את הספינות אל הלוח', rotHint: 'לחץ על ספינה כדי לסובב אותה', rotHintTouch: 'גע בספינה כדי לסובב אותה', noTouch: 'ספינות לא נוגעות זו בזו', rotate: 'סובב', auto: 'אקראי', clear: 'נקה', start: 'לקרב!', needAll: 'הצב קודם את כל הספינות', cantTouch: 'ספינות לא יכולות לגעת זו בזו!', yourTurn: 'התור שלך — ירה!', cpuTurn: 'המחשב מכוון…', fireAgain: 'פגיעה! ירה שוב', hit: 'פגיעה!', miss: 'החטאה', youSunk: 'הטבעת {ship}!', lostShip: 'המחשב הטביע לך {ship}!', passTo: 'העבר את המחשב ל{name}', noPeek: '{name} — בלי להציץ!', ready: 'אני מוכן', shots: 'יריות', hits: 'פגיעות', accuracy: 'דיוק: {n}%', statLine: '{shots} יריות · דיוק {n}%', cpuWon: 'המחשב הטביע את כל הצי שלך', battleStart: 'הקרב מתחיל!', carrier: 'נושאת מטוסים', battleship: 'ספינת קרב', cruiser: 'סיירת', sub: 'צוללת', destroyer: 'משחתת' },
    en: { title: 'Battleships', help: ['Drag your ships onto the grid. Click a ship (or press R) to rotate it', 'Ships may not touch each other, not even diagonally', 'Click the enemy waters to fire. A hit gives you another shot!', 'Sink the whole enemy fleet first to win', '2 players: pass the computer between turns. No peeking!'], helpTouch: ['Drag your ships onto the grid. Tap a ship to rotate it', 'Ships may not touch each other, not even diagonally', 'Tap the enemy waters to fire. A hit gives you another shot!', 'Sink the whole enemy fleet first to win'], yourFleet: 'Your fleet', enemyWaters: 'Enemy waters', fleetOf: "{name}'s fleet", placeFor: '{name}: place your fleet', dragHint: 'Drag the ships onto the grid', rotHint: 'Click a ship to rotate it', rotHintTouch: 'Tap a ship to rotate it', noTouch: "Ships can't touch each other", rotate: 'Rotate', auto: 'Random', clear: 'Clear', start: 'Battle!', needAll: 'Place all your ships first', cantTouch: "Ships can't touch each other!", yourTurn: 'Your turn — fire!', cpuTurn: 'The computer is aiming…', fireAgain: 'Hit! Fire again', hit: 'Hit!', miss: 'Miss', youSunk: 'Enemy {ship} sunk!', lostShip: 'Your {ship} was sunk!', passTo: 'Pass the computer to {name}', noPeek: '{name} — no peeking!', ready: "I'm ready", shots: 'Shots', hits: 'Hits', accuracy: 'Accuracy: {n}%', statLine: '{shots} shots · {n}% accuracy', cpuWon: 'The computer sank your whole fleet', battleStart: 'The battle begins!', carrier: 'carrier', battleship: 'battleship', cruiser: 'cruiser', sub: 'submarine', destroyer: 'destroyer' },
    ar: { title: 'معركة بحرية', help: ['اسحب سفنك إلى اللوحة. انقر على سفينة (أو اضغط R) لتدويرها', 'لا يجوز أن تتلامس السفن، ولا حتى قُطرياً', 'انقر على مياه العدو لتطلق النار. الإصابة تمنحك طلقة أخرى!', 'من يُغرق أسطول خصمه كله أولاً يفوز', 'لاعبان: مرّرا الكمبيوتر بين الأدوار. ممنوع التلصص!'], helpTouch: ['اسحب سفنك إلى اللوحة. المس سفينة لتدويرها', 'لا يجوز أن تتلامس السفن، ولا حتى قُطرياً', 'المس مياه العدو لتطلق النار. الإصابة تمنحك طلقة أخرى!', 'من يُغرق أسطول خصمه كله أولاً يفوز'], yourFleet: 'أسطولك', enemyWaters: 'مياه العدو', fleetOf: 'أسطول {name}', placeFor: '{name}: رتّب أسطولك', dragHint: 'اسحب السفن إلى اللوحة', rotHint: 'انقر على سفينة لتدويرها', rotHintTouch: 'المس سفينة لتدويرها', noTouch: 'السفن لا تتلامس', rotate: 'تدوير', auto: 'عشوائي', clear: 'مسح', start: 'إلى المعركة!', needAll: 'ضع كل سفنك أولاً', cantTouch: 'لا يمكن أن تتلامس السفن!', yourTurn: 'دورك — أطلق النار!', cpuTurn: 'الكمبيوتر يصوّب…', fireAgain: 'إصابة! أطلق مجدداً', hit: 'إصابة!', miss: 'لا إصابة', youSunk: 'أغرقتَ {ship}!', lostShip: 'خسرتَ {ship}!', passTo: 'مرّر الكمبيوتر إلى {name}', noPeek: '{name} — ممنوع التلصص!', ready: 'أنا جاهز', shots: 'الطلقات', hits: 'الإصابات', accuracy: 'الدقة: {n}%', statLine: '{shots} طلقة · دقة {n}%', cpuWon: 'أغرق الكمبيوتر أسطولك كله', battleStart: 'بدأت المعركة!', carrier: 'حاملة الطائرات', battleship: 'البارجة', cruiser: 'الطراد', sub: 'الغواصة', destroyer: 'المدمرة' },
    es: { title: 'Batalla naval', help: ['Arrastra tus barcos al tablero. Haz clic en un barco (o pulsa R) para girarlo', 'Los barcos no pueden tocarse, ni siquiera en diagonal', 'Haz clic en las aguas enemigas para disparar. ¡Un acierto te da otro disparo!', 'Hunde toda la flota enemiga primero para ganar', '2 jugadores: pasen la computadora entre turnos. ¡Sin mirar!'], helpTouch: ['Arrastra tus barcos al tablero. Toca un barco para girarlo', 'Los barcos no pueden tocarse, ni siquiera en diagonal', 'Toca las aguas enemigas para disparar. ¡Un acierto te da otro disparo!', 'Hunde toda la flota enemiga primero para ganar'], yourFleet: 'Tu flota', enemyWaters: 'Aguas enemigas', fleetOf: 'Flota de {name}', placeFor: '{name}: coloca tu flota', dragHint: 'Arrastra los barcos al tablero', rotHint: 'Haz clic en un barco para girarlo', rotHintTouch: 'Toca un barco para girarlo', noTouch: 'Los barcos no se tocan', rotate: 'Girar', auto: 'Al azar', clear: 'Borrar', start: '¡A la batalla!', needAll: 'Primero coloca todos tus barcos', cantTouch: '¡Los barcos no pueden tocarse!', yourTurn: 'Tu turno: ¡dispara!', cpuTurn: 'La computadora apunta…', fireAgain: '¡Tocado! Dispara otra vez', hit: '¡Tocado!', miss: 'Agua', youSunk: '¡Hundiste el {ship} enemigo!', lostShip: '¡Hundieron tu {ship}!', passTo: 'Pasa la computadora a {name}', noPeek: '{name}: ¡no mires!', ready: 'Estoy listo', shots: 'Disparos', hits: 'Aciertos', accuracy: 'Precisión: {n}%', statLine: '{shots} disparos · {n}% de precisión', cpuWon: 'La computadora hundió toda tu flota', battleStart: '¡Comienza la batalla!', carrier: 'portaaviones', battleship: 'acorazado', cruiser: 'crucero', sub: 'submarino', destroyer: 'destructor' },
    fr: { title: 'Bataille navale', help: ['Fais glisser tes navires sur la grille. Clique sur un navire (ou appuie sur R) pour le tourner', 'Les navires ne peuvent pas se toucher, même en diagonale', 'Clique dans les eaux ennemies pour tirer. Touché = un tir de plus !', 'Coule toute la flotte ennemie en premier pour gagner', "2 joueurs : passez-vous l'ordinateur entre les tours. Sans regarder !"], helpTouch: ['Fais glisser tes navires sur la grille. Touche un navire pour le tourner', 'Les navires ne peuvent pas se toucher, même en diagonale', 'Touche les eaux ennemies pour tirer. Touché = un tir de plus !', 'Coule toute la flotte ennemie en premier pour gagner'], yourFleet: 'Ta flotte', enemyWaters: 'Eaux ennemies', fleetOf: 'Flotte de {name}', placeFor: '{name} : place ta flotte', dragHint: 'Fais glisser les navires sur la grille', rotHint: 'Clique sur un navire pour le tourner', rotHintTouch: 'Touche un navire pour le tourner', noTouch: 'Les navires ne se touchent pas', rotate: 'Tourner', auto: 'Au hasard', clear: 'Effacer', start: 'Au combat !', needAll: "Place d'abord tous tes navires", cantTouch: 'Les navires ne peuvent pas se toucher !', yourTurn: 'À toi — tire !', cpuTurn: "L'ordinateur vise…", fireAgain: 'Touché ! Tire encore', hit: 'Touché !', miss: "À l'eau", youSunk: 'Tu as coulé le {ship} ennemi !', lostShip: 'Ton {ship} a coulé !', passTo: "Passe l'ordinateur à {name}", noPeek: '{name}, ne regarde pas !', ready: 'Je suis prêt', shots: 'Tirs', hits: 'Touchés', accuracy: 'Précision : {n} %', statLine: '{shots} tirs · {n} % de précision', cpuWon: "L'ordinateur a coulé toute ta flotte", battleStart: 'La bataille commence !', carrier: 'porte-avions', battleship: 'cuirassé', cruiser: 'croiseur', sub: 'sous-marin', destroyer: 'destroyer' },
    pt: { title: 'Batalha naval', help: ['Arraste seus navios para o tabuleiro. Clique num navio (ou aperte R) para girá-lo', 'Os navios não podem se tocar, nem na diagonal', 'Clique nas águas inimigas para atirar. Acertou? Atire de novo!', 'Afunde toda a frota inimiga primeiro para vencer', '2 jogadores: passem o computador entre os turnos. Sem espiar!'], helpTouch: ['Arraste seus navios para o tabuleiro. Toque num navio para girá-lo', 'Os navios não podem se tocar, nem na diagonal', 'Toque nas águas inimigas para atirar. Acertou? Atire de novo!', 'Afunde toda a frota inimiga primeiro para vencer'], yourFleet: 'Sua frota', enemyWaters: 'Águas inimigas', fleetOf: 'Frota de {name}', placeFor: '{name}: posicione sua frota', dragHint: 'Arraste os navios para o tabuleiro', rotHint: 'Clique num navio para girá-lo', rotHintTouch: 'Toque num navio para girá-lo', noTouch: 'Os navios não se tocam', rotate: 'Girar', auto: 'Aleatório', clear: 'Limpar', start: 'Para a batalha!', needAll: 'Posicione todos os navios primeiro', cantTouch: 'Os navios não podem se tocar!', yourTurn: 'Sua vez — atire!', cpuTurn: 'O computador está mirando…', fireAgain: 'Acertou! Atire de novo', hit: 'Acertou!', miss: 'Água', youSunk: 'Você afundou o {ship} inimigo!', lostShip: 'Seu {ship} afundou!', passTo: 'Passe o computador para {name}', noPeek: '{name}, não espie!', ready: 'Estou pronto', shots: 'Tiros', hits: 'Acertos', accuracy: 'Precisão: {n}%', statLine: '{shots} tiros · {n}% de precisão', cpuWon: 'O computador afundou toda a sua frota', battleStart: 'A batalha começou!', carrier: 'porta-aviões', battleship: 'encouraçado', cruiser: 'cruzador', sub: 'submarino', destroyer: 'destróier' },
    ru: { title: 'Морской бой', help: ['Перетащи корабли на поле. Нажми на корабль (или R), чтобы повернуть его', 'Корабли не могут касаться друг друга, даже углами', 'Нажимай на воды противника, чтобы стрелять. Попал — стреляй ещё!', 'Кто первым потопит весь флот соперника — побеждает', '2 игрока: передавайте компьютер между ходами. Не подглядывать!'], helpTouch: ['Перетащи корабли на поле. Коснись корабля, чтобы повернуть его', 'Корабли не могут касаться друг друга, даже углами', 'Касайся вод противника, чтобы стрелять. Попал — стреляй ещё!', 'Кто первым потопит весь флот соперника — побеждает'], yourFleet: 'Твой флот', enemyWaters: 'Воды противника', fleetOf: 'Флот: {name}', placeFor: '{name}: расставь флот', dragHint: 'Перетащи корабли на поле', rotHint: 'Нажми на корабль, чтобы повернуть', rotHintTouch: 'Коснись корабля, чтобы повернуть', noTouch: 'Корабли не касаются друг друга', rotate: 'Повернуть', auto: 'Случайно', clear: 'Очистить', start: 'В бой!', needAll: 'Сначала расставь все корабли', cantTouch: 'Корабли не могут касаться!', yourTurn: 'Твой ход — огонь!', cpuTurn: 'Компьютер целится…', fireAgain: 'Попал! Стреляй ещё', hit: 'Попал!', miss: 'Мимо', youSunk: 'Враг потерял корабль: {ship}!', lostShip: 'Ты потерял корабль: {ship}!', passTo: 'Передай компьютер: {name}', noPeek: '{name}, не подглядывай!', ready: 'Я готов', shots: 'Выстрелы', hits: 'Попадания', accuracy: 'Точность: {n}%', statLine: 'Выстрелов: {shots} · точность {n}%', cpuWon: 'Компьютер потопил весь твой флот', battleStart: 'Бой начинается!', carrier: 'авианосец', battleship: 'линкор', cruiser: 'крейсер', sub: 'подлодка', destroyer: 'эсминец' },
    de: { title: 'Schiffe versenken', help: ['Zieh deine Schiffe aufs Feld. Klick ein Schiff an (oder drück R), um es zu drehen', 'Schiffe dürfen sich nicht berühren, auch nicht schräg', 'Klick in die feindlichen Gewässer, um zu schießen. Treffer = noch ein Schuss!', 'Versenke zuerst die ganze feindliche Flotte, um zu gewinnen', '2 Spieler: Gebt den Computer zwischen den Zügen weiter. Nicht spicken!'], helpTouch: ['Zieh deine Schiffe aufs Feld. Tippe ein Schiff an, um es zu drehen', 'Schiffe dürfen sich nicht berühren, auch nicht schräg', 'Tippe in die feindlichen Gewässer, um zu schießen. Treffer = noch ein Schuss!', 'Versenke zuerst die ganze feindliche Flotte, um zu gewinnen'], yourFleet: 'Deine Flotte', enemyWaters: 'Feindliche Gewässer', fleetOf: 'Flotte von {name}', placeFor: '{name}: Flotte aufstellen', dragHint: 'Zieh die Schiffe aufs Feld', rotHint: 'Klick ein Schiff an, um es zu drehen', rotHintTouch: 'Tippe ein Schiff an, um es zu drehen', noTouch: 'Schiffe berühren sich nicht', rotate: 'Drehen', auto: 'Zufällig', clear: 'Leeren', start: 'Zum Kampf!', needAll: 'Stell zuerst alle Schiffe auf', cantTouch: 'Schiffe dürfen sich nicht berühren!', yourTurn: 'Du bist dran — Feuer!', cpuTurn: 'Der Computer zielt…', fireAgain: 'Treffer! Schieß noch mal', hit: 'Treffer!', miss: 'Wasser', youSunk: 'Feindliches Schiff versenkt: {ship}!', lostShip: 'Dein Schiff ist gesunken: {ship}!', passTo: 'Gib den Computer an {name}', noPeek: '{name}, nicht hinschauen!', ready: 'Ich bin bereit', shots: 'Schüsse', hits: 'Treffer', accuracy: 'Trefferquote: {n} %', statLine: '{shots} Schüsse · {n} % Treffer', cpuWon: 'Der Computer hat deine ganze Flotte versenkt', battleStart: 'Die Schlacht beginnt!', carrier: 'Flugzeugträger', battleship: 'Schlachtschiff', cruiser: 'Kreuzer', sub: 'U-Boot', destroyer: 'Zerstörer' },
  };
  const COLS = { he: 'אבגדהוזחטי', ar: 'أبتثجحخدذر', ru: 'АБВГДЕЖЗИК' };
  const colLabel = (g, c) => (COLS[g.lang] || 'ABCDEFGHIJ')[g.rtl ? N - 1 - c : c];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const shipName = (g, s) => g.t(KEYS[s.i]);
  const acc = side => (side.fired ? Math.round(side.hit / side.fired * 100) : 0);

  // ---------- פריסה: לרוחב שני לוחות זה ליד זה, בטלפון לאורך — לוח האויב גדול למעלה ----------
  function layout(W, H) {
    const btn = (id, x, y, w, h) => ({ id, x, y, w, h });
    if (H <= W) {
      const dock = [], cs = 36, cx = 714;
      FLEET.forEach((len, i) => dock.push({ x: cx - len * cs / 2, y: 70 + i * 58, cs, nameY: 70 + i * 58 + cs + 10 }));
      return {
        port: false,
        own: { x: 58, y: 92, cs: 40 }, enemy: { x: 522, y: 92, cs: 40 }, pgrid: { x: 58, y: 92, cs: 40 },
        ownTitle: { x: 258, y: 34 }, enemyTitle: { x: 722, y: 34 },
        ownStat: { x: 258, y: 513, cs: 13, row: true }, enemyStat: { x: 722, y: 513, cs: 13, row: true },
        banner: { x: 290, y: 538, w: 380, h: 48 },
        dock, dockBox: { x: 506, y: 58, w: 416, h: 304 }, hintY: [380, 402],
        btns: [btn('rotate', 506, 424, 128, 46), btn('auto', 650, 424, 128, 46), btn('clear', 794, 424, 128, 46), btn('start', 506, 484, 416, 58)],
        ready: { x: 330, y: 430, w: 300, h: 72 },
      };
    }
    const dock = [], cs = 34, gap = 30;
    const rows = [[0, 1], [2, 3, 4]];
    rows.forEach((row, r) => {
      const tw = row.reduce((a, i) => a + FLEET[i] * cs, 0) + gap * (row.length - 1);
      let x = (W - tw) / 2;
      const y = 606 + r * 72;
      row.forEach(i => { dock[i] = { x, y, cs, nameY: y + cs + 11 }; x += FLEET[i] * cs + gap; });
    });
    return {
      port: true,
      own: { x: 52, y: 700, cs: 28 }, enemy: { x: 64, y: 84, cs: 50 }, pgrid: { x: 64, y: 84, cs: 50 },   // מציבים על הלוח הגדול
      ownTitle: { x: 192, y: 662 }, enemyTitle: { x: 314, y: 30 },
      ownStat: { x: 470, y: 872, cs: 15, row: false, title: 'yourFleet' }, enemyStat: { x: 470, y: 722, cs: 15, row: false, title: 'enemyWaters' },
      banner: { x: 100, y: 600, w: 400, h: 48 },
      dock, dockBox: { x: 40, y: 594, w: 520, h: 146 }, hintY: [760, 782],
      btns: [btn('rotate', 40, 804, 160, 52), btn('auto', 220, 804, 160, 52), btn('clear', 400, 804, 160, 52), btn('start', 40, 874, 520, 66)],
      ready: { x: 150, y: 700, w: 300, h: 80 },
    };
  }

  // ---------- מצב המשחק ----------
  const isHuman = (g, who) => g.mode === '2p' || who === 0;
  // מי מסתכל עכשיו על המסך (בשני שחקנים: מי שתורו)
  const viewer = g => (g.mode === '2p' ? (g.s.phase === 'place' ? g.s.placer : g.s.turn) : 0);
  const gridOf = (g, side) => (side === viewer(g) ? g.s.L.own : g.s.L.enemy);
  const cellCenter = (G, c) => ({ x: G.x + (c % N + 0.5) * G.cs, y: G.y + (((c / N) | 0) + 0.5) * G.cs });
  function cellAt(G, x, y) {
    const cx = Math.floor((x - G.x) / G.cs), cy = Math.floor((y - G.y) / G.cs);
    return cx < 0 || cy < 0 || cx >= N || cy >= N ? null : { x: cx, y: cy, c: cy * N + cx };
  }
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const pname = (g, i) => g.t(i ? 'p2' : 'p1');
  const canFire = g => { const S = g.s; return S.phase === 'battle' && !S.shell && !S.cpuAim && S.wait <= 0 && isHuman(g, S.turn) && g.state === 'play'; };

  function newState(g, wins) {
    const S = {
      wins, phase: 'place', sides: [newSide(), newSide()], placer: 0, turn: 0, first: 0,
      wait: 0, next: null, shell: null, cpuAim: null, cpuLast: -1, aim: -1, aimKb: false, fireDown: -1,
      drag: null, sel: -1, pendH: true, hover: null, hoverShip: -1, btnDown: null, nudge: null, rings: [], dockFlash: 0,
      streakT: -9, clock: 0, winner: -1, reveal: -1, recent: [[], []], recentT: -9, started: false,
      passTo: 0, passNext: 'place', L: layout(g.W, g.H), botT: 0, mx: -1, my: -1,
    };
    return S;
  }

  // ----- הצבת הצי -----
  const placeSide = g => g.s.sides[g.s.placer];
  function shipRect(G, s, x = s.x, y = s.y, h = s.h) { return { x: G.x + x * G.cs, y: G.y + y * G.cs, w: (h ? s.len : 1) * G.cs, h: (h ? 1 : s.len) * G.cs }; }
  function dockRect(L, s) { const d = L.dock[s.i]; return { x: d.x, y: d.y, w: s.len * d.cs, h: d.cs, cs: d.cs }; }
  function shipAtPoint(g, p) {
    const S = g.s, side = placeSide(g);
    for (const s of side.ships) {
      if (s.placed) { if (inRect(p, shipRect(S.L.pgrid, s))) return s; }
      else { const r = dockRect(S.L, s); if (inRect(p, { x: r.x - 6, y: r.y - 8, w: r.w + 12, h: r.h + 16 })) return s; }
    }
    return null;
  }
  const btnAt = (g, p) => { for (const b of g.s.L.btns) if (inRect(p, b)) return b.id; return null; };
  // איפה הספינה שנגררת תנחת: המשבצת שמתחת לנקודה שבה תפסו אותה
  function dragSnap(g, d = g.s.drag) {
    const S = g.s, G = S.L.pgrid, s = d.s;
    const len = s.len, w = (d.h ? len : 1), h = (d.h ? 1 : len);
    const cx = d.px - d.ox * G.cs, cy = d.py - d.oy * G.cs;   // הפינה של הספינה, ביחידות עולם
    const midX = cx + w * G.cs / 2, midY = cy + h * G.cs / 2;
    const over = midX > G.x - G.cs * 0.6 && midX < G.x + N * G.cs + G.cs * 0.6 && midY > G.y - G.cs * 0.6 && midY < G.y + N * G.cs + G.cs * 0.6;
    if (!over) return null;
    let x = Math.round((cx - G.x) / G.cs), y = Math.round((cy - G.y) / G.cs);
    x = Math.max(0, Math.min(N - w, x)); y = Math.max(0, Math.min(N - h, y));
    return { x, y, h: d.h, ok: canPlace(placeSide(g), s, x, y, d.h) };
  }
  function putShip(g, s, x, y, h) {
    const side = placeSide(g), G = g.s.L.pgrid;
    Object.assign(s, { x, y, h, placed: true });
    rebuild(side);
    const r = shipRect(G, s);
    g.burst(r.x + r.w / 2, r.y + r.h / 2, { n: 14, color: ['#d6f1ff', '#9fd8ff', '#ffffff'], speed: 2.2, life: 26, size: 4, gravity: 0.02 });
    g.sfx('place');
  }
  // סיבוב במקום; אם לא נכנס — מנסים להזיז קצת לאורך הכיוון החדש.
  // ספינה שעוד בתיבה: הופכים את הכיוון שבו היא תונח (רואים אותו כשמרחפים מעל הלוח)
  function rotateShip(g, s) {
    const side = placeSide(g);
    if (!s.placed) { g.s.pendH = !g.s.pendH; g.sfx('move'); return true; }
    const nh = !s.h;
    for (let k = 0; k < s.len; k++) {
      for (const sg of k ? [-1, 1] : [1]) {
        const x = nh ? s.x - sg * k : s.x, y = nh ? s.y : s.y - sg * k;
        if (canPlace(side, s, x, y, nh)) { Object.assign(s, { x, y, h: nh }); rebuild(side); g.sfx('move'); return true; }
      }
    }
    g.sfx('error');
    g.s.nudge = { s: s.i, t: 0 };
    g.msg(g.t('cantTouch'), 1100, '#ffb3b3');
    return false;
  }
  function doAuto(g) {
    const side = placeSide(g), G = g.s.L.pgrid;
    autoPlace(side, Math.random);
    g.s.sel = -1;
    for (const s of side.ships) { const r = shipRect(G, s); g.burst(r.x + r.w / 2, r.y + r.h / 2, { n: 8, color: ['#d6f1ff', '#ffffff'], speed: 1.8, life: 22, size: 3.5, gravity: 0 }); }
    g.sfx('power');
  }
  function doClear(g) {
    const side = placeSide(g);
    for (const s of side.ships) s.placed = false;
    rebuild(side); g.s.sel = -1;
    g.sfx('whoosh');
  }
  function doStart(g) {
    const S = g.s, side = placeSide(g);
    if (!allPlaced(side)) {
      g.sfx('error'); g.msg(g.t('needAll'), 1300, '#ffd166');
      S.dockFlash = 50;
      return;
    }
    S.sel = -1; S.drag = null;
    if (g.mode === '2p') {
      if (S.placer === 0) toPass(g, 1, 'place');
      else toPass(g, S.first, 'battle');
      return;
    }
    beginBattle(g, 0);
  }
  function beginBattle(g, who) {
    const S = g.s;
    S.phase = 'battle'; S.turn = who; S.recentT = S.clock; S.started = true;
    S.aim = -1; S.hover = null;
    g.msg(g.t('battleStart'), 1300, '#ffd166');
    g.sfx('start');
    if (!isHuman(g, who)) cpuShot(g);
  }
  function toPass(g, to, next) {
    const S = g.s;
    S.phase = 'pass'; S.passTo = to; S.passNext = next;
    S.drag = null; S.btnDown = null; S.hover = null;
    g.sfx('whoosh');
  }
  function passReady(g) {
    const S = g.s;
    if (S.phase !== 'pass') return;
    g.sfx('click');
    S.hover = null; S.btnDown = null;
    if (S.passNext === 'place') { S.phase = 'place'; S.placer = S.passTo; S.sel = -1; S.pendH = true; return; }
    if (!S.started) { beginBattle(g, S.passTo); return; }
    S.phase = 'battle'; S.turn = S.passTo; S.recentT = S.clock; S.aim = -1;
  }

  // ----- ירי -----
  function fireAt(g, c) {
    const S = g.s;
    if (!canFire(g)) return false;
    const tgt = S.sides[1 - S.turn];
    if (c < 0 || c >= NN) return false;
    if (tgt.shots[c]) { g.sfx('error'); S.nudge = { c, t: 0 }; return false; }
    launch(g, S.turn, c);
    return true;
  }
  function launch(g, att, c) {
    const S = g.s, Gt = gridOf(g, 1 - att), Gs = gridOf(g, att);
    const t = cellCenter(Gt, c), w = Gs.cs * N;
    S.shell = { att, c, t: 0, dur: T.shell, sx: Gs.x + w / 2, sy: Gs.y + w / 2, tx: t.x, ty: t.y };
    if (att === S.turn && S.recent) S.recent[1 - att].push(c);
    g.sfx('shoot', { p: 0.9 + Math.random() * 0.2 });
  }
  function resolve(g) {
    const S = g.s, sh = S.shell;
    S.shell = null;
    const att = S.sides[sh.att], tgt = S.sides[1 - sh.att];
    const r = shoot(tgt, sh.c);
    if (!r) { S.wait = 10; S.next = 'again'; return; }   // לא אמור לקרות; בלי זה המשחק היה נתקע
    att.fired++;
    tgt.at[sh.c] = S.clock;
    const G = gridOf(g, 1 - sh.att), p = cellCenter(G, sh.c), k = G.cs / 40;
    const human = isHuman(g, sh.att);
    if (!r.hit) {
      g.burst(p.x, p.y, { n: 18, color: ['#e8f7ff', '#9ad7ff', '#ffffff'], speed: 3.4 * k, life: 34, size: 4 * k, gravity: 0.2 * k, spread: Math.PI * 0.8, dir: -Math.PI / 2 });
      S.rings.push({ x: p.x, y: p.y, t: S.clock, r: G.cs, c: '#d8f3ff' });
      g.float(p.x, p.y - G.cs * 0.6, g.t('miss'), { color: '#bfe6ff', size: 20 * Math.max(0.8, k) });
      g.sfx('splash');
      S.wait = human ? T.afterMiss : T.cpuAfterMiss;
      S.next = 'switch';
      if (g.mode === '2p') S.wait = T.pass;
      return;
    }
    att.hit++;
    g.burst(p.x, p.y, { n: 26, color: ['#fff3b0', '#ffd23f', '#ff8c1a', '#ff4d1a'], speed: 4.6 * k, life: 34, size: 5 * k, gravity: 0.04 });
    g.burst(p.x, p.y, { n: 8, color: ['#5b616b', '#40454d'], speed: 1.4 * k, life: 60, size: 10 * k, gravity: -0.03, drag: 0.95 });
    S.rings.push({ x: p.x, y: p.y, t: S.clock, r: G.cs * 1.2, c: '#ffcf6b' });
    g.shake(r.ship ? 12 : 6);
    g.flash('#ffb347', r.ship ? 0.22 : 0.12);
    g.sfx('boom', { p: 1.1 + Math.random() * 0.15 });
    if (r.ship) {
      const cells = cellsOf(r.ship);
      cells.forEach((q, i) => {
        const pp = cellCenter(G, q);
        g.burst(pp.x, pp.y, { n: 14, color: ['#ffd23f', '#ff8c1a', '#fff3b0'], speed: 3.6 * k, life: 40 + i * 4, size: 5 * k, gravity: 0.03 });
      });
      r.water.forEach((q, i) => { tgt.at[q] = S.clock + 0.25 + i * 0.035; });
      g.float(p.x, p.y - G.cs * 0.6, g.t('hit'), { color: '#ffd166', size: 22 * Math.max(0.8, k) });
      const nm = shipName(g, r.ship);
      if (human) g.msg(g.t('youSunk', { ship: nm }), 1600, '#ffd166');
      else g.msg(g.t('lostShip', { ship: nm }), 1600, '#ff9b9b');
      g.after(0.12, () => g.sfx(human ? 'power' : 'break'));
    } else g.float(p.x, p.y - G.cs * 0.6, g.t('hit'), { color: '#ffb35c', size: 22 * Math.max(0.8, k) });
    if (r.win) {
      S.phase = 'over'; S.winner = sh.att;
      if (g.mode !== '2p' && sh.att === 1) S.reveal = S.clock + 0.6;
      S.wait = T.end; S.next = 'finish';
      return;
    }
    if (human) { S.streakT = S.clock; S.wait = r.ship ? T.afterSunk : T.afterHit; }
    else S.wait = r.ship ? T.cpuAfterSunk : T.cpuAfterHit;
    S.next = 'again';
  }
  function doNext(g) {
    const S = g.s, nx = S.next;
    S.next = null;
    if (nx === 'again') { if (!isHuman(g, S.turn)) cpuShot(g); return; }
    if (nx === 'switch') {
      const to = 1 - S.turn;
      S.recent[1 - to] = [];   // היריות ש-to עומד לירות; recent[to] — מה שירו עליו, יוצג לו כשיחזור
      if (g.mode === '2p') { toPass(g, to, 'battle'); return; }
      S.turn = to;
      if (to === 1) cpuShot(g);
      return;
    }
    if (nx === 'finish') finish(g);
  }
  function cpuShot(g) {
    const S = g.s, c = aiPick(S.sides[0], g.diff, Math.random);
    if (c < 0) return;
    S.cpuAim = { c, from: S.cpuLast >= 0 ? S.cpuLast : 44, t: 0, dur: T.aim + Math.floor(Math.random() * 12) };
  }
  function finish(g) {
    const S = g.s, w = S.winner, you = S.sides[0];
    if (g.mode === '2p') {
      S.wins[w]++;
      const a = S.sides[w];
      g.end({ winner: pname(g, w), score: null, text: g.t('statLine', { shots: a.fired, n: acc(a) }), delay: 300 });
    } else if (w === 0) g.end({ result: 'win', score: you.fired, scoreLabel: g.t('shots'), text: g.t('accuracy', { n: acc(you) }), delay: 300 });
    else g.end({ result: 'lose', score: null, text: g.t('cpuWon'), delay: 300 });
  }

  // ---------- ציור ----------
  const PAL = { light: '#d3dce4', mid: '#8f9cab', dark: '#56626f', edge: 'rgba(16,26,38,.7)', det: '#4b5765', deck: '#a7b3bf' };
  const PAL2 = { light: '#e6d7c5', mid: '#a8927a', dark: '#6e5946', edge: 'rgba(36,24,14,.7)', det: '#5e4a39', deck: '#bba58c' };
  const SUBPAL = { light: '#7b8b9c', mid: '#4a5a6b', dark: '#2a3542', edge: 'rgba(8,14,22,.75)', det: '#1f2832', deck: '#5a6b7c' };
  const SUNKPAL = { light: '#5d6268', mid: '#40454c', dark: '#25292e', edge: 'rgba(0,0,0,.65)', det: '#1d2024', deck: '#4b5056' };

  function hullPath(ctx, kind, L, cs, hw) {
    const m = cs / 2, p = cs * 0.1;
    ctx.beginPath();
    if (kind === 3) {
      ctx.moveTo(p + hw, m - hw);
      ctx.lineTo(L - p - hw * 1.2, m - hw);
      ctx.quadraticCurveTo(L - p, m - hw, L - p, m);
      ctx.quadraticCurveTo(L - p, m + hw, L - p - hw * 1.2, m + hw);
      ctx.lineTo(p + hw, m + hw);
      ctx.arc(p + hw, m, hw, Math.PI / 2, Math.PI * 1.5);
    } else {
      const bow = cs * 0.72;
      ctx.moveTo(p + cs * 0.12, m - hw);
      ctx.lineTo(L - p - bow, m - hw);
      ctx.quadraticCurveTo(L - p - bow * 0.2, m - hw * 0.85, L - p, m);
      ctx.quadraticCurveTo(L - p - bow * 0.2, m + hw * 0.85, L - p - bow, m + hw);
      ctx.lineTo(p + cs * 0.12, m + hw);
      ctx.quadraticCurveTo(p, m + hw, p, m + hw * 0.55);
      ctx.lineTo(p, m - hw * 0.55);
      ctx.quadraticCurveTo(p, m - hw, p + cs * 0.12, m - hw);
    }
    ctx.closePath();
  }
  function turret(ctx, x, m, r, dir, pal) {
    ctx.strokeStyle = pal.det; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, m - r * 0.32); ctx.lineTo(x + dir * r * 1.9, m - r * 0.32); ctx.moveTo(x, m + r * 0.32); ctx.lineTo(x + dir * r * 1.9, m + r * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, m, r, 0, Math.PI * 2);
    ctx.fillStyle = pal.mid; ctx.fill();
    ctx.lineWidth = Math.max(0.8, r * 0.18); ctx.strokeStyle = pal.det; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.25, m - r * 0.25, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
  }
  // ספינה במבט מלמעלה: x,y = הפינה של המשבצת הראשונה. החרטום בקצה הימני (או התחתון)
  function drawShip(g, ctx, kind, len, x, y, h, cs, o) {
    o = o || {};
    const L = len * cs, m = cs / 2;
    const hw = cs * (kind === 0 ? 0.38 : kind === 3 ? 0.27 : kind === 4 ? 0.27 : 0.33);
    const pal = o.sunk ? SUNKPAL : kind === 3 ? SUBPAL : o.pal || PAL;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (h) ctx.translate(x, y); else { ctx.translate(x + cs, y); ctx.rotate(Math.PI / 2); }
    if (!o.flat) { ctx.save(); ctx.translate(cs * 0.07, cs * 0.1); hullPath(ctx, kind, L, cs, hw); ctx.fillStyle = 'rgba(0,12,30,.38)'; ctx.fill(); ctx.restore(); }
    hullPath(ctx, kind, L, cs, hw);
    const gr = ctx.createLinearGradient(0, m - hw, 0, m + hw);
    gr.addColorStop(0, pal.light); gr.addColorStop(0.45, pal.mid); gr.addColorStop(1, pal.dark);
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = Math.max(1, cs * 0.045); ctx.strokeStyle = pal.edge; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save();
    hullPath(ctx, kind, L, cs, hw); ctx.clip();
    if (kind === 0) {
      // סיפון טיסה עם מסלול ומגדל
      g.rr(ctx, cs * 0.18, m - hw * 0.72, L - cs * 0.95, hw * 1.44, hw * 0.2); ctx.fillStyle = '#5b6672'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, cs * 0.035); ctx.setLineDash([cs * 0.16, cs * 0.12]);
      ctx.beginPath(); ctx.moveTo(cs * 0.3, m); ctx.lineTo(L - cs * 0.9, m); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,214,90,.7)'; ctx.beginPath(); ctx.moveTo(cs * 0.4, m + hw * 0.5); ctx.lineTo(L * 0.5, m - hw * 0.45); ctx.stroke();
      g.rr(ctx, L * 0.56, m + hw * 0.22, cs * 0.62, hw * 0.62, cs * 0.06); ctx.fillStyle = pal.det; ctx.fill();
      ctx.fillStyle = pal.light; ctx.fillRect(L * 0.56 + cs * 0.1, m + hw * 0.34, cs * 0.16, hw * 0.18);
      for (const px of [cs * 0.75, cs * 1.65]) {   // מטוסים קטנים על הסיפון
        ctx.fillStyle = '#e8edf2';
        ctx.beginPath(); ctx.moveTo(px + cs * 0.22, m - hw * 0.4); ctx.lineTo(px - cs * 0.12, m - hw * 0.62); ctx.lineTo(px - cs * 0.04, m - hw * 0.4); ctx.lineTo(px - cs * 0.12, m - hw * 0.18); ctx.closePath(); ctx.fill();
      }
    } else if (kind === 3) {
      // צוללת: מגדל עם פריסקופ וסנפיר זנב
      g.rr(ctx, L * 0.4, m - hw * 0.5, cs * 0.62, hw, hw * 0.45); ctx.fillStyle = pal.det; ctx.fill();
      ctx.fillStyle = '#9fb3c6'; ctx.beginPath(); ctx.arc(L * 0.4 + cs * 0.44, m, hw * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(1, cs * 0.03);
      ctx.beginPath(); ctx.moveTo(cs * 0.4, m - hw * 0.55); ctx.lineTo(L - cs * 0.5, m - hw * 0.55); ctx.stroke();
      ctx.fillStyle = pal.dark; ctx.fillRect(cs * 0.1, m - hw * 0.12, cs * 0.3, hw * 0.24);
    } else {
      const sup = kind === 1 ? [L * 0.36, L * 0.26] : kind === 2 ? [L * 0.38, L * 0.26] : [L * 0.3, L * 0.3];
      g.rr(ctx, sup[0], m - hw * 0.55, sup[1], hw * 1.1, hw * 0.3); ctx.fillStyle = pal.deck; ctx.fill();
      ctx.strokeStyle = pal.det; ctx.lineWidth = Math.max(0.8, cs * 0.03); ctx.stroke();
      ctx.fillStyle = pal.det; ctx.beginPath(); ctx.arc(sup[0] + sup[1] * 0.35, m, hw * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(30,40,50,.6)'; ctx.fillRect(sup[0] + sup[1] * 0.65, m - hw * 0.35, sup[1] * 0.18, hw * 0.7);
      const tr = hw * 0.5;
      if (kind === 1) { turret(ctx, L - cs * 1.05, m, tr, 1, pal); turret(ctx, L - cs * 1.62, m, tr, 1, pal); turret(ctx, cs * 0.62, m, tr, -1, pal); }
      else if (kind === 2) { turret(ctx, L - cs * 0.95, m, tr, 1, pal); turret(ctx, cs * 0.55, m, tr, -1, pal); }
      else turret(ctx, L - cs * 0.62, m, tr * 0.9, 1, pal);
    }
    ctx.restore();
    // ברק על הגוף
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, cs * 0.04);
    ctx.beginPath(); ctx.moveTo(cs * 0.3, m - hw * 0.82); ctx.lineTo(L - cs * 0.85, m - hw * 0.82); ctx.stroke();
    ctx.restore();
  }

  function drawFire(ctx, x, y, cs, t, seed, sunk, age) {
    const s = cs * (sunk ? 0.82 : 1);
    if (age >= 0 && age < 0.45) {
      const k = age / 0.45;
      ctx.strokeStyle = `rgba(255,220,140,${0.9 * (1 - k)})`; ctx.lineWidth = cs * 0.08 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(x, y, cs * (0.2 + k * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    const gl = ctx.createRadialGradient(x, y, 0, x, y, s * 0.55);
    gl.addColorStop(0, 'rgba(255,190,80,.8)'); gl.addColorStop(0.5, 'rgba(255,110,20,.35)'); gl.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 1.1);
    for (let i = 0; i < 3; i++) {
      const fx = x + (i - 1) * s * 0.15, hgt = s * (0.3 + 0.1 * Math.sin(t * 10 + seed + i * 2.1) + (i === 1 ? 0.08 : 0)), wd = s * (i === 1 ? 0.13 : 0.1);
      const tip = Math.sin(t * 7 + seed * 2 + i) * s * 0.05;
      ctx.beginPath();
      ctx.moveTo(fx - wd, y + s * 0.12);
      ctx.quadraticCurveTo(fx - wd * 1.1, y - hgt * 0.45, fx + tip, y - hgt);
      ctx.quadraticCurveTo(fx + wd * 1.1, y - hgt * 0.45, fx + wd, y + s * 0.12);
      ctx.closePath();
      ctx.fillStyle = i === 1 ? '#ffe066' : '#ff7a1a'; ctx.fill();
    }
    ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x, y + s * 0.04, s * 0.06, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.45 + i / 3 + seed * 0.137) % 1;
      ctx.globalAlpha = (sunk ? 0.5 : 0.38) * (1 - ph);
      ctx.fillStyle = '#4a4f58';
      ctx.beginPath(); ctx.arc(x + Math.sin(ph * 5 + seed) * s * 0.12, y - s * 0.22 - ph * s * 0.75, s * (0.09 + ph * 0.17), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawMiss(ctx, x, y, cs, age, t, seed) {
    if (age < 0) return;
    const k = Math.min(1, age / 0.22);
    if (age < 0.9) {
      ctx.strokeStyle = `rgba(225,246,255,${0.8 * (1 - age / 0.9)})`; ctx.lineWidth = cs * 0.05;
      ctx.beginPath(); ctx.arc(x, y, cs * (0.14 + age * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    const ph = (t * 0.32 + seed) % 1;
    ctx.strokeStyle = `rgba(210,240,255,${0.22 * (1 - ph)})`; ctx.lineWidth = Math.max(1, cs * 0.03);
    ctx.beginPath(); ctx.arc(x, y, cs * (0.16 + ph * 0.26), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(190,232,255,.2)'; ctx.beginPath(); ctx.arc(x, y, cs * 0.25 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2faff'; ctx.beginPath(); ctx.arc(x, y, cs * 0.12 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,180,220,.55)'; ctx.beginPath(); ctx.arc(x + cs * 0.03, y + cs * 0.035, cs * 0.05 * k, 0, Math.PI * 2); ctx.fill();
  }
  function drawWaterDot(ctx, x, y, cs, age) {
    if (age < 0) return;
    const k = Math.min(1, age / 0.2);
    ctx.fillStyle = `rgba(205,235,255,${0.42 * k})`;
    ctx.beginPath(); ctx.arc(x, y, cs * 0.075 * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
  }

  function drawGridBase(g, ctx, G, t, enemy, glow) {
    const w = G.cs * N;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
    g.rr(ctx, G.x - 7, G.y - 7, w + 14, w + 14, 12);
    ctx.fillStyle = '#0c2440'; ctx.fill();
    ctx.restore();
    if (glow) {
      ctx.save();
      ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4);
      ctx.shadowColor = glow; ctx.shadowBlur = 14;
      g.rr(ctx, G.x - 7, G.y - 7, w + 14, w + 14, 12); ctx.stroke();
      ctx.restore();
    }
    const gr = ctx.createLinearGradient(G.x, G.y, G.x + w * 0.45, G.y + w);
    if (enemy) { gr.addColorStop(0, '#1d6297'); gr.addColorStop(1, '#0c355c'); }
    else { gr.addColorStop(0, '#2b8ccb'); gr.addColorStop(1, '#14598f'); }
    ctx.fillStyle = gr; ctx.fillRect(G.x, G.y, w, w);
    ctx.save();
    ctx.beginPath(); ctx.rect(G.x, G.y, w, w); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.075)'; ctx.lineWidth = Math.max(1, G.cs * 0.035);
    for (let r = 0; r < N; r++) {
      const yy = G.y + (r + 0.35) * G.cs;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const xx = G.x + i * w / 20, yv = yy + Math.sin(i * 1.1 + t * 1.7 + r * 2.3) * G.cs * 0.07;
        if (i) ctx.lineTo(xx, yv); else ctx.moveTo(xx, yv);
      }
      ctx.stroke();
    }
    if (enemy && ctx.createConicGradient) {
      const cx = G.x + w / 2, cy = G.y + w / 2;
      const cg = ctx.createConicGradient(t * 0.9, cx, cy);
      cg.addColorStop(0, 'rgba(130,255,210,.12)'); cg.addColorStop(0.1, 'rgba(130,255,210,0)'); cg.addColorStop(1, 'rgba(130,255,210,0)');
      ctx.fillStyle = cg; ctx.fillRect(G.x, G.y, w, w);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,232,255,.17)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < N; i++) { const o = i * G.cs; ctx.moveTo(G.x + o, G.y); ctx.lineTo(G.x + o, G.y + w); ctx.moveTo(G.x, G.y + o); ctx.lineTo(G.x + w, G.y + o); }
    ctx.stroke();
    const fs = Math.max(10, Math.round(G.cs * 0.36));
    for (let i = 0; i < N; i++) {
      g.text(ctx, colLabel(g, i), G.x + (i + 0.5) * G.cs, G.y - 9 - fs * 0.55, { size: fs, weight: 800, color: '#8cc2ee' });
      g.text(ctx, String(i + 1), G.x - 9 - fs * 0.62, G.y + (i + 0.5) * G.cs, { size: fs, weight: 800, color: '#8cc2ee' });
    }
  }
  function drawMarks(g, ctx, G, side, t) {
    const cs = G.cs, w = cs * N;
    ctx.save();
    ctx.beginPath(); ctx.rect(G.x - 6, G.y - 6, w + 12, w + 12); ctx.clip();
    for (let c = 0; c < NN; c++) {
      const v = side.shots[c];
      if (!v) continue;
      const x = G.x + (c % N + 0.5) * cs, y = G.y + (((c / N) | 0) + 0.5) * cs, age = t - side.at[c];
      if (v === MISS) drawMiss(ctx, x, y, cs, age, t, (c * 0.618) % 1);
      else if (v === WATER) drawWaterDot(ctx, x, y, cs, age);
      else drawFire(ctx, x, y, cs, t, c * 1.37, v === SUNK, age);
    }
    ctx.restore();
  }
  function drawReticle(ctx, x, y, cs, col, t, pulse) {
    const r = cs * (0.42 + (pulse ? Math.sin(t * 8) * 0.04 : 0));
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, cs * 0.07); ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of ORTHO) { ctx.moveTo(x + dx * r * 0.55, y + dy * r * 0.55); ctx.lineTo(x + dx * r * 1.3, y + dy * r * 1.3); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, cs * 0.05), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }
  // צי קטן בצד: אילו ספינות עוד צפות
  function drawFleetStatus(g, ctx, side, P, title) {
    const cs = P.cs;
    if (P.row) {
      const gap = cs * 0.9, tw = FLEET.reduce((a, l) => a + l * cs, 0) + gap * (FLEET.length - 1);
      let x = P.x - tw / 2;
      for (const s of side.ships) {
        drawShip(g, ctx, s.i, s.len, x, P.y - cs / 2, true, cs, { sunk: s.sunk, flat: true });
        if (s.sunk) strike(ctx, x, P.y, s.len * cs);
        x += s.len * cs + gap;
      }
      return;
    }
    if (title) g.text(ctx, title, P.x, P.y - 22, { size: 16, weight: 800, color: '#bfe0ff', maxW: 220 });
    side.ships.forEach((s, i) => {
      const x = P.x - 2.5 * cs, y = P.y + i * 23 - cs / 2;
      drawShip(g, ctx, s.i, s.len, x, y, true, cs, { sunk: s.sunk, flat: true });
      if (s.sunk) strike(ctx, x, y + cs / 2, s.len * cs);
    });
  }
  function strike(ctx, x, y, w) {
    ctx.strokeStyle = 'rgba(255,90,90,.9)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 2, y + 4); ctx.lineTo(x + w - 2, y - 4); ctx.stroke();
  }
  function drawBg(g, ctx, t) {
    const gr = ctx.createLinearGradient(0, 0, 0, g.H);
    gr.addColorStop(0, '#0d2c4f'); gr.addColorStop(1, '#061527');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    // אורות רכים שזזים לאט במים העמוקים
    for (let i = 0; i < 4; i++) {
      const x = g.W * (0.15 + 0.25 * i) + Math.sin(t * 0.2 + i * 1.7) * 40, y = g.H * (0.3 + 0.18 * (i % 3));
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 220);
      rg.addColorStop(0, 'rgba(60,140,210,.10)'); rg.addColorStop(1, 'rgba(60,140,210,0)');
      ctx.fillStyle = rg; ctx.fillRect(x - 220, y - 220, 440, 440);
    }
  }
  function drawBtn(g, ctx, b, label, icon, o) {
    const hov = o.hover && !o.disabled, pri = o.primary;
    ctx.save();
    if (o.disabled) ctx.globalAlpha *= 0.5;
    const lift = hov ? -2 : 0;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    g.rr(ctx, b.x, b.y + lift, b.w, b.h, Math.min(16, b.h / 2.5));
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    if (pri) { gr.addColorStop(0, hov ? '#ffe39a' : '#ffd166'); gr.addColorStop(1, hov ? '#ffae3d' : '#f39c1f'); }
    else { gr.addColorStop(0, hov ? '#3f74a6' : '#2f5d8a'); gr.addColorStop(1, hov ? '#2b5a85' : '#1d4468'); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = pri ? 'rgba(255,255,255,.6)' : 'rgba(170,215,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (o.pulse && !o.disabled) {
      ctx.strokeStyle = `rgba(255,230,150,${0.35 + 0.35 * Math.sin(o.t * 5)})`; ctx.lineWidth = 3;
      g.rr(ctx, b.x - 4, b.y + lift - 4, b.w + 8, b.h + 8, Math.min(18, b.h / 2.3)); ctx.stroke();
    }
    const fs = o.size || Math.min(22, b.h * 0.42), col = pri ? '#3b2300' : '#ffffff';
    ctx.font = '900 ' + fs + 'px Heebo, Arial, sans-serif';
    const tw = Math.min(ctx.measureText(label).width, b.w - fs * 2.4), iw = icon ? fs * 1.05 : 0, gap = icon ? fs * 0.4 : 0;
    const total = tw + iw + gap, cy = b.y + lift + b.h / 2;
    const left = b.x + (b.w - total) / 2;
    const iconX = g.rtl ? left + tw + gap + iw / 2 : left + iw / 2;
    const textX = g.rtl ? left + tw / 2 : left + iw + gap + tw / 2;
    if (icon) drawIcon(ctx, icon, iconX, cy, fs * 0.5, col);
    g.text(ctx, label, textX, cy + 1, { size: fs, weight: 900, color: col, maxW: b.w - fs * 2.4 });
    ctx.restore();
  }
  function drawIcon(ctx, kind, x, y, r, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, r * 0.28); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'rotate') {
      ctx.beginPath(); ctx.arc(x, y, r * 0.8, -Math.PI * 0.3, Math.PI * 1.25); ctx.stroke();
      const a = -Math.PI * 0.3, ex = x + Math.cos(a) * r * 0.8, ey = y + Math.sin(a) * r * 0.8;
      ctx.beginPath(); ctx.moveTo(ex + r * 0.45, ey - r * 0.05); ctx.lineTo(ex, ey); ctx.lineTo(ex + r * 0.05, ey - r * 0.5); ctx.stroke();
    } else if (kind === 'dice') {
      ctx.lineWidth = Math.max(1.5, r * 0.2);
      ctx.beginPath(); const s = r * 0.85; ctx.moveTo(x - s + 3, y - s); ctx.arcTo(x + s, y - s, x + s, y + s, 4); ctx.arcTo(x + s, y + s, x - s, y + s, 4); ctx.arcTo(x - s, y + s, x - s, y - s, 4); ctx.arcTo(x - s, y - s, x + s, y - s, 4); ctx.stroke();
      for (const [dx, dy] of [[-0.45, -0.45], [0, 0], [0.45, 0.45]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * 0.15, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 'clear') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.6, y + r * 0.6); ctx.moveTo(x + r * 0.6, y - r * 0.6); ctx.lineTo(x - r * 0.6, y + r * 0.6); ctx.stroke();
    } else if (kind === 'target') {
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.35, y); ctx.moveTo(x + r * 0.35, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r * 0.35); ctx.moveTo(x, y + r * 0.35); ctx.lineTo(x, y + r); ctx.stroke();
    } else if (kind === 'play') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.65); ctx.lineTo(x + r * 0.65, y); ctx.lineTo(x - r * 0.45, y + r * 0.65); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // צוללת חמודה מהצד (למסך ההעברה ולתמונת הכרטיס)
  function drawSubSide(g, ctx, x, y, s, t, body) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.6) * s * 0.04);
    ctx.rotate(Math.sin(t * 1.1) * 0.025);
    const bd = body || '#ffcf3f', dk = g.shade(bd, -0.35), lt = g.shade(bd, 0.35);
    // פריסקופ
    ctx.fillStyle = dk;
    ctx.fillRect(s * 0.18, -s * 1.15, s * 0.08, s * 0.6);
    ctx.fillRect(s * 0.18, -s * 1.15, s * 0.26, s * 0.08);
    // מגדל
    g.rr(ctx, -s * 0.15, -s * 0.72, s * 0.62, s * 0.42, s * 0.12); ctx.fillStyle = bd; ctx.fill();
    ctx.lineWidth = s * 0.04; ctx.strokeStyle = dk; ctx.stroke();
    // גוף
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.25, s * 0.5, 0, 0, Math.PI * 2);
    const gr = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    gr.addColorStop(0, lt); gr.addColorStop(0.5, bd); gr.addColorStop(1, dk);
    ctx.fillStyle = gr; ctx.fill(); ctx.stroke();
    // פסים וחלונות
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(-s * 0.95, s * 0.2); ctx.lineTo(s * 1.0, s * 0.2); ctx.stroke();
    for (const px of [-0.55, -0.1, 0.35, 0.8]) {
      ctx.beginPath(); ctx.arc(px * s, -s * 0.04, s * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = '#2b4f73'; ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = '#e9eef3'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px * s - s * 0.04, -s * 0.08, s * 0.04, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    }
    // מדחף
    ctx.save(); ctx.translate(-s * 1.32, 0); ctx.scale(1, Math.cos(t * 9));
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function drawWaves(ctx, W, y, t, amp, col, speed, len) {
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, y + Math.sin(x / len + t * speed) * amp + Math.sin(x / (len * 0.43) - t * speed * 1.3) * amp * 0.35);
    ctx.lineTo(W, y + 400); ctx.lineTo(0, y + 400); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }

  // מסך "העבר את המחשב": אטום לגמרי — שום ספינה לא נראית
  function drawPass(g, ctx, S, t) {
    const W = g.W, H = g.H, L = S.L;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#123b66'); gr.addColorStop(1, '#04101f');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const col = S.passTo ? '#ffb35c' : '#5fe0c8';
    const midY = L.port ? 330 : 222;
    drawSubSide(g, ctx, W / 2, midY, L.port ? 110 : 92, t, S.passTo ? '#ff9f43' : '#3fd0b6');
    drawWaves(ctx, W, midY + (L.port ? 30 : 26), t, 7, 'rgba(10,50,90,.75)', 1.6, 60);
    drawWaves(ctx, W, midY + (L.port ? 52 : 46), t + 1, 6, 'rgba(6,30,58,.92)', 1.2, 45);
    const name = pname(g, S.passTo), other = pname(g, 1 - S.passTo);
    const ty = L.port ? 470 : 314;
    g.text(ctx, S.passNext === 'place' ? g.t('placeFor', { name }) : g.t('turnOf', { name }), W / 2, ty, { size: L.port ? 42 : 40, weight: 900, color: col, stroke: 'rgba(0,0,0,.4)', strokeW: 6, maxW: W - 60 });
    g.text(ctx, g.t('passTo', { name }), W / 2, ty + (L.port ? 64 : 48), { size: L.port ? 26 : 24, weight: 800, color: '#e6f2ff', maxW: W - 60 });
    g.text(ctx, g.t('noPeek', { name: other }), W / 2, ty + (L.port ? 110 : 82), { size: L.port ? 22 : 20, weight: 700, color: '#9fc4e8', maxW: W - 60 });
    drawBtn(g, ctx, L.ready, g.t('ready'), 'play', { primary: true, hover: S.hover === 'ready', pulse: true, t, size: L.port ? 30 : 28 });
    // כמה ספינות נשארו לכל אחד (מידע גלוי)
    if (S.passNext === 'battle') {
      const y = L.port ? 860 : 545;
      [0, 1].forEach(i => {
        const x = W / 2 + (i ? 1 : -1) * (L.port ? 150 : 210);
        g.text(ctx, pname(g, i), x, y - 26, { size: 17, weight: 800, color: i ? '#ffc98c' : '#9ff0de', maxW: 260 });
        drawFleetStatus(g, ctx, S.sides[i], { x, y, cs: L.port ? 11 : 12, row: true }, null);
      });
    }
  }

  function drawPlace(g, ctx, S, t) {
    const L = S.L, side = placeSide(g), G = L.pgrid, d = S.drag;
    drawGridBase(g, ctx, G, t, false, null);
    // אזור אסור סביב ספינות (רק כשמזיזים ספינה)
    const moving = d && d.moved ? d.s : S.sel >= 0 && !side.ships[S.sel].placed ? side.ships[S.sel] : null;
    if (moving) {
      ctx.fillStyle = 'rgba(255,80,80,.13)';
      for (let c = 0; c < NN; c++) {
        const x = c % N, y = (c / N) | 0;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) { const v = side.grid[ny * N + nx]; if (v && v !== moving.i + 1) near = true; }
        }
        if (near) ctx.fillRect(G.x + x * G.cs + 1, G.y + y * G.cs + 1, G.cs - 2, G.cs - 2);
      }
    }
    for (const s of side.ships) {
      if (!s.placed) continue;
      let dx = 0;
      if (S.nudge && S.nudge.s === s.i) dx = Math.sin(S.nudge.t * 1.3) * 5 * (1 - S.nudge.t / 20);
      drawShip(g, ctx, s.i, s.len, G.x + s.x * G.cs + dx, G.y + s.y * G.cs, s.h, G.cs, { pal: S.placer ? PAL2 : PAL });
      if (S.sel === s.i && !d) {
        const r = shipRect(G, s);
        ctx.strokeStyle = `rgba(255,230,140,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2.5;
        g.rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 8); ctx.stroke();
      }
    }
    // תיבת הספינות
    const B = L.dockBox;
    g.rr(ctx, B.x, B.y, B.w, B.h, 16);
    ctx.fillStyle = 'rgba(8,24,44,.72)'; ctx.fill();
    const fl = S.dockFlash > 0 ? S.dockFlash / 50 : 0;
    ctx.strokeStyle = fl ? `rgba(255,209,102,${0.4 + fl * 0.6})` : 'rgba(140,200,255,.22)'; ctx.lineWidth = fl ? 3 : 1.5; ctx.stroke();
    for (const s of side.ships) {
      const r = dockRect(L, s);
      if (s.placed || (d && d.s === s)) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(160,210,255,.28)'; ctx.lineWidth = 1.5;
        g.rr(ctx, r.x, r.y + 2, r.w, r.h - 4, 8); ctx.stroke(); ctx.restore();
      } else {
        const hov = S.hoverShip === s.i;
        drawShip(g, ctx, s.i, s.len, r.x, r.y - (hov ? 2 : 0), true, r.cs, { pal: S.placer ? PAL2 : PAL });
        if (S.sel === s.i) {
          ctx.strokeStyle = `rgba(255,230,140,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2.5;
          g.rr(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 9); ctx.stroke();
          drawOrient(ctx, L.port ? r.x + r.w - 2 : r.x + r.w + 20, L.port ? r.y + 1 : r.y + r.h / 2, S.pendH);
        }
      }
      g.text(ctx, cap(g.t(KEYS[s.i])), r.x + r.w / 2, L.dock[s.i].nameY, { size: L.port ? 15 : 13, weight: 700, color: s.placed ? 'rgba(170,205,235,.45)' : '#bcdcf7', maxW: Math.max(r.w + 40, 110) });
    }
    g.text(ctx, g.t(g.touch ? 'rotHintTouch' : 'rotHint'), B.x + B.w / 2, L.hintY[0], { size: L.port ? 19 : 16, weight: 700, color: '#cfe6fb', maxW: B.w });
    g.text(ctx, g.t('noTouch'), B.x + B.w / 2, L.hintY[1], { size: L.port ? 16 : 14, weight: 600, color: '#8fb6d8', maxW: B.w });
    const ready = allPlaced(side);
    const lab = { rotate: ['rotate', 'rotate'], auto: ['auto', 'dice'], clear: ['clear', 'clear'], start: ['start', 'target'] };
    for (const b of L.btns) {
      const [k, ic] = lab[b.id];
      drawBtn(g, ctx, b, g.t(k), ic, { primary: b.id === 'start', disabled: b.id === 'start' ? !ready : b.id === 'rotate' ? S.sel < 0 : b.id === 'clear' ? !side.ships.some(s => s.placed) : false, hover: S.hover === b.id, pulse: b.id === 'start' && ready, t });
    }
    // כותרות (בטלפון אין מקום לשתיים: הכותרת היא ההוראה)
    const title = g.mode === '2p' ? g.t('placeFor', { name: pname(g, S.placer) }) : L.port ? g.t('dragHint') : g.t('yourFleet');
    const tp = L.port ? { x: g.W / 2, y: 34 } : L.ownTitle;
    g.text(ctx, title, tp.x, tp.y, { size: L.port ? 26 : 24, weight: 900, color: g.mode === '2p' ? (S.placer ? '#ffc98c' : '#9ff0de') : '#e6f4ff', maxW: L.port ? 540 : 420 });
    if (!L.port) g.text(ctx, g.t('dragHint'), L.enemyTitle.x, L.enemyTitle.y, { size: 22, weight: 800, color: '#bfe0ff', maxW: 410 });
    // רוח רפאים של מה שנגרר, או של ספינה שנבחרה מהתיבה מעל הלוח
    if (d && d.moved) {
      const snap = dragSnap(g);
      if (snap) {
        const r = shipRect(G, d.s, snap.x, snap.y, snap.h);
        g.rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 7);
        ctx.fillStyle = snap.ok ? 'rgba(90,240,150,.28)' : 'rgba(255,80,80,.32)'; ctx.fill();
        ctx.strokeStyle = snap.ok ? '#7dffb0' : '#ff7b7b'; ctx.lineWidth = 2.5; ctx.stroke();
      }
      const cs = snap ? G.cs : L.dock[d.s.i].cs * 1.1;
      drawShip(g, ctx, d.s.i, d.s.len, d.px - d.ox * cs, d.py - d.oy * cs, d.h, cs, { alpha: 0.9, pal: S.placer ? PAL2 : PAL });
    } else if (S.sel >= 0 && !side.ships[S.sel].placed && S.mx >= 0 && !g.touch) {
      const s = side.ships[S.sel], cell = cellAt(G, S.mx, S.my);
      if (cell) {
        const q = clickSpot(side, s, cell, S.pendH, false), r = shipRect(G, s, q.x, q.y, q.h);
        drawShip(g, ctx, s.i, s.len, r.x, r.y, q.h, G.cs, { alpha: 0.55, pal: S.placer ? PAL2 : PAL, flat: true });
        g.rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 7);
        ctx.strokeStyle = q.ok ? '#7dffb0' : '#ff7b7b'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }
  }
  // תג קטן: איך הספינה שנבחרה בתיבה תונח על הלוח (שוכבת / עומדת)
  function drawOrient(ctx, x, y, h) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3b2300'; ctx.stroke();
    ctx.translate(x, y); if (!h) ctx.rotate(Math.PI / 2);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
    ctx.moveTo(-3, -3.5); ctx.lineTo(-6.5, 0); ctx.lineTo(-3, 3.5);
    ctx.moveTo(3, -3.5); ctx.lineTo(6.5, 0); ctx.lineTo(3, 3.5);
    ctx.stroke();
    ctx.restore();
  }
  // לחיצה על הלוח כשספינה מהתיבה נבחרה: הכיוון המבוקש, ואם לא נכנס (ומותר) — הכיוון השני
  function clickSpot(side, s, cell, h, fallback) {
    const at = hh => { const x = Math.max(0, Math.min(N - (hh ? s.len : 1), cell.x)), y = Math.max(0, Math.min(N - (hh ? 1 : s.len), cell.y)); return { x, y, h: hh, ok: canPlace(side, s, x, y, hh) }; };
    const a = at(h);
    if (a.ok || !fallback) return a;
    const b = at(!h);
    return b.ok ? b : a;
  }

  function drawBattle(g, ctx, S, t, alpha) {
    const L = S.L, me = viewer(g), you = S.sides[me], them = S.sides[1 - me];
    const two = g.mode === '2p', over = S.phase === 'over';
    const myTurn = !over && S.turn === me && isHuman(g, me);
    const meCol = two ? (me ? '#ffb35c' : '#5fe0c8') : '#5fe0c8';
    drawGridBase(g, ctx, L.own, t, false, !over && S.turn !== me ? '#ff6b6b' : null);
    drawGridBase(g, ctx, L.enemy, t, true, myTurn ? meCol : null);
    // הצי שלי
    for (const s of you.ships) drawShip(g, ctx, s.i, s.len, L.own.x + s.x * L.own.cs, L.own.y + s.y * L.own.cs, s.h, L.own.cs, { sunk: s.sunk, pal: me ? PAL2 : PAL });
    // הספינות של היריב: רק מה שטבע (ובסוף המשחק — גם השאר)
    for (const s of them.ships) {
      if (s.sunk) drawShip(g, ctx, s.i, s.len, L.enemy.x + s.x * L.enemy.cs, L.enemy.y + s.y * L.enemy.cs, s.h, L.enemy.cs, { sunk: true });
      else if (over && S.reveal >= 0 && t > S.reveal) {
        const k = Math.min(1, (t - S.reveal) / 0.6);
        drawShip(g, ctx, s.i, s.len, L.enemy.x + s.x * L.enemy.cs, L.enemy.y + s.y * L.enemy.cs, s.h, L.enemy.cs, { alpha: 0.75 * k, pal: me ? PAL : PAL2 });
      }
    }
    drawMarks(g, ctx, L.own, you, t);
    drawMarks(g, ctx, L.enemy, them, t);
    // יריות של היריב בתור האחרון (בשני שחקנים — כדי שתראה מה קרה בזמן שלא הסתכלת)
    if (two && t - S.recentT < 3.2) {
      const k = 1 - (t - S.recentT) / 3.2;
      for (const c of S.recent[me]) {
        const p = cellCenter(L.own, c);
        ctx.strokeStyle = `rgba(255,230,120,${k * (0.5 + 0.5 * Math.sin(t * 9))})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, L.own.cs * 0.48, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // כוונת
    if (canFire(g) && S.aim >= 0 && (g.ptr.over || S.aimKb || g.touch)) {
      const p = cellCenter(L.enemy, S.aim), bad = !!them.shots[S.aim];
      ctx.fillStyle = bad ? 'rgba(255,90,90,.15)' : 'rgba(255,255,255,.12)';
      ctx.fillRect(L.enemy.x + (S.aim % N) * L.enemy.cs, L.enemy.y + ((S.aim / N) | 0) * L.enemy.cs, L.enemy.cs, L.enemy.cs);
      if (!bad) drawReticle(ctx, p.x, p.y, L.enemy.cs, '#ffd166', t, true);
    }
    if (S.nudge && S.nudge.c != null) {
      const p = cellCenter(L.enemy, S.nudge.c);
      ctx.strokeStyle = `rgba(255,100,100,${1 - S.nudge.t / 20})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x + Math.sin(S.nudge.t * 1.4) * 4, p.y, L.enemy.cs * 0.42, 0, Math.PI * 2); ctx.stroke();
    }
    if (S.cpuAim) {
      const a = S.cpuAim, k = g.ease.inOut(Math.min(1, (a.t + alpha) / a.dur));
      const p0 = cellCenter(L.own, a.from), p1 = cellCenter(L.own, a.c);
      drawReticle(ctx, p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k, L.own.cs, '#ff5e5e', t, a.t >= a.dur);
    }
    // הפגז באוויר
    if (S.shell) {
      const s = S.shell;
      for (let i = 7; i >= 0; i--) {
        const k = Math.max(0, Math.min(1, (s.t + alpha) / s.dur - i * 0.03));
        const x = s.sx + (s.tx - s.sx) * k, y = s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * (L.port ? 160 : 140);
        ctx.fillStyle = i ? `rgba(255,${180 + i * 8},${80 + i * 15},${0.55 - i * 0.06})` : '#fff7d6';
        ctx.beginPath(); ctx.arc(x, y, (i ? 5 - i * 0.45 : 6), 0, Math.PI * 2); ctx.fill();
      }
    }
    // טבעות של התזה ופיצוץ
    for (const r of S.rings) {
      const k = (t - r.t) / 0.7;
      if (k < 0 || k > 1) continue;
      ctx.strokeStyle = r.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.2 + k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // כותרות
    const ownT = two ? g.t('fleetOf', { name: pname(g, me) }) : g.t('yourFleet');
    const enT = two ? g.t('fleetOf', { name: pname(g, 1 - me) }) : g.t('enemyWaters');
    g.text(ctx, ownT, L.ownTitle.x, L.ownTitle.y, { size: L.port ? 18 : 22, weight: 900, color: two ? meCol : '#cfe8ff', maxW: L.port ? 290 : 400 });
    g.text(ctx, enT, L.enemyTitle.x, L.enemyTitle.y, { size: L.port ? 24 : 22, weight: 900, color: two ? (me ? '#5fe0c8' : '#ffb35c') : '#ff9f9f', maxW: L.port ? 500 : 400 });
    drawFleetStatus(g, ctx, you, L.ownStat, L.port ? ownT : null);
    drawFleetStatus(g, ctx, them, L.enemyStat, L.port ? enT : null);
    drawBanner(g, ctx, S, t, me, meCol);
  }
  function drawBanner(g, ctx, S, t, me, meCol) {
    const B = S.L.banner, two = g.mode === '2p';
    let txt, col, glow;
    if (S.phase === 'over') {
      if (two) { txt = g.t('wins', { name: pname(g, S.winner) }); col = S.winner ? '#ffb35c' : '#5fe0c8'; }
      else { txt = g.t(S.winner === 0 ? 'youWin' : 'youLose'); col = S.winner === 0 ? '#7dffb0' : '#ff8a8a'; }
      glow = col;
    } else if (S.turn === me && isHuman(g, me)) {
      txt = t - S.streakT < 1.3 ? g.t('fireAgain') : two ? g.t('turnOf', { name: pname(g, me) }) : g.t('yourTurn');
      col = t - S.streakT < 1.3 ? '#ffd166' : meCol; glow = meCol;
    } else { txt = g.t('cpuTurn'); col = '#ff9b9b'; glow = '#ff6b6b'; }
    ctx.save();
    ctx.shadowColor = glow; ctx.shadowBlur = 16;
    g.rr(ctx, B.x, B.y, B.w, B.h, B.h / 2);
    ctx.fillStyle = 'rgba(6,18,34,.88)'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = glow; ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 4); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    g.text(ctx, txt, B.x + B.w / 2, B.y + B.h / 2 + 1, { size: 22, weight: 900, color: col, maxW: B.w - 30 });
  }

  // ---------- קלט ----------
  function placePointer(g, type, p) {
    const S = g.s, side = placeSide(g), L = S.L;
    if (type === 'down') {
      if (p.button === 2) { if (S.drag) { rotateDrag(g); } else if (S.sel >= 0) rotateShip(g, side.ships[S.sel]); return; }
      const b = btnAt(g, p);
      if (b) { S.btnDown = b; return; }
      const s = shipAtPoint(g, p);
      if (s) {
        // ספינה על הלוח נתפסת בכיוון שלה; ספינה מהתיבה (שם היא שוכבת) — שוכבת
        const onGrid = s.placed, h = onGrid ? s.h : true;
        const r = onGrid ? shipRect(L.pgrid, s) : dockRect(L, s), cs = onGrid ? L.pgrid.cs : r.cs;
        const ox = Math.max(0, Math.min((h ? s.len : 1) - 0.01, (p.x - r.x) / cs)), oy = Math.max(0, Math.min((h ? 1 : s.len) - 0.01, (p.y - r.y) / cs));
        S.drag = { s, fromGrid: onGrid, ox, oy, h, x0: p.x, y0: p.y, px: p.x, py: p.y, moved: false, old: { x: s.x, y: s.y, h: s.h } };
        S.sel = s.i;
        if (onGrid) { s.placed = false; rebuild(side); }
        g.sfx('click');
        return;
      }
      // נבחרה ספינה מהתיבה? לחיצה על הלוח מניחה אותה שם
      const cell = cellAt(L.pgrid, p.x, p.y);
      if (cell && S.sel >= 0 && !side.ships[S.sel].placed) {
        const s2 = side.ships[S.sel], q = clickSpot(side, s2, cell, S.pendH, true);
        if (q.ok) putShip(g, s2, q.x, q.y, q.h);
        else { g.sfx('error'); g.msg(g.t('cantTouch'), 1100, '#ffb3b3'); }
        return;
      }
      S.sel = -1;
      return;
    }
    if (type === 'move') {
      S.hover = btnAt(g, p);
      const hs = S.drag ? null : shipAtPoint(g, p);
      S.hoverShip = hs && !hs.placed ? hs.i : -1;
      const d = S.drag;
      g.canvas.style.cursor = d ? 'grabbing' : hs ? 'grab' : S.hover ? 'pointer' : 'default';
      if (!d) return;
      d.px = p.x; d.py = p.y;
      if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 7) d.moved = true;
      return;
    }
    if (type === 'up') {
      if (S.btnDown) { const b = btnAt(g, p); if (b === S.btnDown) pressBtn(g, b); S.btnDown = null; return; }
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      const s = d.s;
      if (!d.moved) {
        if (d.fromGrid) { Object.assign(s, { x: d.old.x, y: d.old.y, h: d.old.h, placed: true }); rebuild(side); rotateShip(g, s); }
        return;   // ספינה מהתיבה נשארת בחורה; לחיצה על הלוח תניח אותה
      }
      const snap = dragSnap(g, d);   // S.drag כבר ריק כאן
      if (snap && snap.ok) { putShip(g, s, snap.x, snap.y, snap.h); return; }
      S.sel = -1;
      if (snap) {
        g.sfx('error'); g.msg(g.t('cantTouch'), 1100, '#ffb3b3');
        if (d.fromGrid) { Object.assign(s, { x: d.old.x, y: d.old.y, h: d.old.h, placed: true }); rebuild(side); }
        return;
      }
      if (d.fromGrid) { s.placed = false; rebuild(side); g.sfx('whoosh'); }
    }
  }
  // השהיה באמצע גרירה: העזיבה של העכבר לא תגיע אלינו, אז מחזירים את הספינה למקום שלה
  function cancelDrag(g) {
    const S = g.s, d = S && S.drag;
    if (S) S.btnDown = null;
    if (!d) return;
    S.drag = null;
    if (d.fromGrid) { Object.assign(d.s, { x: d.old.x, y: d.old.y, h: d.old.h, placed: true }); rebuild(placeSide(g)); }
  }
  function rotateDrag(g) {
    const d = g.s.drag;
    if (!d) return;
    d.h = !d.h;
    const t = d.ox; d.ox = d.oy; d.oy = t;
    g.sfx('move');
  }
  function pressBtn(g, id) {
    const S = g.s, side = placeSide(g);
    if (id === 'rotate') { if (S.sel >= 0) rotateShip(g, side.ships[S.sel]); else g.sfx('error'); }
    else if (id === 'auto') doAuto(g);
    else if (id === 'clear') doClear(g);
    else if (id === 'start') doStart(g);
  }
  function battlePointer(g, type, p) {
    const S = g.s, cell = cellAt(S.L.enemy, p.x, p.y);
    if (type === 'move' || type === 'down') { S.aim = cell ? cell.c : -1; if (type === 'down' || !g.touch) S.aimKb = false; }
    g.canvas.style.cursor = cell && canFire(g) ? 'crosshair' : 'default';
    if (type === 'down') S.fireDown = cell ? cell.c : -1;
    else if (type === 'up') {
      if (S.fireDown >= 0 && cell) fireAt(g, cell.c);
      S.fireDown = -1;
    }
  }

  // ----- בוט לבדיקות: מציב אקראית, ויורה כמו ילד (ציד אקראי ואז סביב פגיעה) -----
  function botAct(g) {
    const S = g.s;
    if (++S.botT % 9) return;
    if (S.phase === 'pass') { passReady(g); return; }
    if (S.phase === 'place' && isHuman(g, S.placer)) {
      if (!allPlaced(placeSide(g))) doAuto(g); else doStart(g);
      return;
    }
    if (canFire(g)) fireAt(g, kidPick(S.sides[1 - S.turn], Math.random));
  }

  // ---------- הרישום ----------
  GK.register('battleships', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 1000 : 600; },
    bg: '#081c33', accent: '#5fe0c8',
    modes: ['cpu', '2p'],
    diffs: true, diffDefault: 0, diffModes: ['cpu'],
    lowerIsBetter: true,
    text: TEXT,

    setup(g) { g.s = { wins: [0, 0] }; },

    init(g) {
      const wins = g.s && g.s.wins ? g.s.wins : [0, 0];
      const S = g.s = newState(g, wins);
      S.first = (wins[0] + wins[1]) % 2;
      if (g.demo) {
        // תמונה יפה מאחורי התפריט: קרב באמצע
        const rnd = g.seeded(11);
        autoPlace(S.sides[0], rnd); autoPlace(S.sides[1], rnd);
        S.phase = 'battle'; S.turn = 0;
        for (let i = 0; i < 26; i++) { shoot(S.sides[1], kidPick(S.sides[1], rnd)); shoot(S.sides[0], aiPick(S.sides[0], 0, rnd)); }
        S.aim = -1;
        return;
      }
      if (g.mode === '2p') { S.phase = 'pass'; S.passTo = 0; S.passNext = 'place'; }
      else autoPlace(S.sides[1], Math.random);
    },

    idle(g) { if (g.s) g.s.clock += 1 / 60; },

    step(g) {
      const S = g.s;
      S.clock += 1 / 60;
      if (S.nudge && ++S.nudge.t > 20) S.nudge = null;
      if (S.dockFlash > 0) S.dockFlash--;
      for (let i = S.rings.length - 1; i >= 0; i--) if (S.clock - S.rings[i].t > 0.8) S.rings.splice(i, 1);
      // מקשים
      if (S.phase === 'place') {
        if (g.hit('KeyR')) { if (S.drag) rotateDrag(g); else if (S.sel >= 0) rotateShip(g, placeSide(g).ships[S.sel]); }
        if (g.hit('KeyA') && !S.drag) doAuto(g);
        if ((g.hit('Enter') || g.hit('NumpadEnter') || g.hit('Space')) && !S.drag) doStart(g);
        if ((g.hit('Backspace') || g.hit('Delete')) && !S.drag) doClear(g);
      } else if (S.phase === 'pass') {
        if (g.hit('Enter') || g.hit('NumpadEnter') || g.hit('Space')) passReady(g);
      } else if (S.phase === 'battle' && canFire(g)) {
        const a = g.axisHit();
        if (a.x || a.y) {
          if (S.aim < 0) S.aim = 44;
          const x = Math.max(0, Math.min(N - 1, S.aim % N + a.x)), y = Math.max(0, Math.min(N - 1, ((S.aim / N) | 0) + a.y));
          S.aim = y * N + x; S.aimKb = true; g.sfx('tick');
        }
        if ((g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter')) && S.aim >= 0) fireAt(g, S.aim);
      }
      // פגז באוויר, כוונת של המחשב, המתנה
      if (S.shell && ++S.shell.t >= S.shell.dur) resolve(g);
      if (S.cpuAim && ++S.cpuAim.t >= S.cpuAim.dur + T.aimHold) {
        const c = S.cpuAim.c;
        S.cpuAim = null; S.cpuLast = c;
        launch(g, 1, c);
      }
      if (!S.shell && !S.cpuAim && S.wait > 0 && --S.wait <= 0) doNext(g);
      // שורת הניקוד
      if (g.mode === '2p') g.hud([[g.t('p1'), '🏆 ' + S.wins[0], '#5fe0c8'], [g.t('p2'), '🏆 ' + S.wins[1], '#ffb35c']]);
      else if (S.phase === 'place') g.hud([[g.t('difficulty'), g.t(['easy', 'medium', 'hard'][g.diff])]]);
      else {
        const b = g.getBest(), y = S.sides[0];
        g.hud([[g.t('shots'), y.fired], [g.t('hits'), y.hit], [g.t('best'), b === null ? '—' : b]]);
      }
    },

    bot(g) { botAct(g); },

    onPause(g) { cancelDrag(g); g.s.fireDown = -1; },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S) return;
      S.mx = p.x; S.my = p.y;
      if (S.phase === 'place') { if (isHuman(g, S.placer)) placePointer(g, type, p); return; }
      if (S.phase === 'pass') {
        const on = inRect(p, S.L.ready);
        S.hover = on ? 'ready' : null;
        g.canvas.style.cursor = on ? 'pointer' : 'default';
        if (type === 'down') S.btnDown = on ? 'ready' : null;
        else if (type === 'up') { if (on && S.btnDown === 'ready') passReady(g); S.btnDown = null; }
        return;
      }
      if (S.phase === 'battle') battlePointer(g, type, p);
    },

    draw(g, ctx, alpha) {
      const S = g.s, t = S.clock;
      drawBg(g, ctx, t);
      if (S.phase === 'pass') drawPass(g, ctx, S, t);
      else if (S.phase === 'place') drawPlace(g, ctx, S, t);
      else drawBattle(g, ctx, S, t, alpha);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0f3a66'); bg.addColorStop(1, '#04142a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const fake = Object.assign(Object.create(k), { lang: 'en', rtl: false });
      // לוח גדול ומוטה
      ctx.save();
      ctx.translate(w * 0.5, h * 0.56); ctx.rotate(-0.12); ctx.translate(-w * 0.5, -h * 0.56);
      const G = { x: 70, y: 20, cs: 64 };
      const t = 1.3;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      k.rr(ctx, G.x - 10, G.y - 10, G.cs * 13 + 20, G.cs * 8 + 20, 18); ctx.fillStyle = '#0b2440'; ctx.fill();
      ctx.restore();
      const gr = ctx.createLinearGradient(G.x, G.y, G.x + 400, G.y + 600);
      gr.addColorStop(0, '#2b8ccb'); gr.addColorStop(1, '#114f80');
      ctx.fillStyle = gr; ctx.fillRect(G.x, G.y, G.cs * 13, G.cs * 8);
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 2;
      for (let r = 0; r < 8; r++) { ctx.beginPath(); for (let i = 0; i <= 26; i++) { const xx = G.x + i * G.cs / 2, yy = G.y + (r + 0.4) * G.cs + Math.sin(i * 1.1 + r * 2.3) * 4; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,232,255,.2)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 1; i < 13; i++) { ctx.moveTo(G.x + i * G.cs, G.y); ctx.lineTo(G.x + i * G.cs, G.y + 8 * G.cs); }
      for (let i = 1; i < 8; i++) { ctx.moveTo(G.x, G.y + i * G.cs); ctx.lineTo(G.x + 13 * G.cs, G.y + i * G.cs); }
      ctx.stroke();
      drawShip(fake, ctx, 0, 5, G.x + 1 * G.cs, G.y + 2 * G.cs, true, G.cs, {});
      drawShip(fake, ctx, 1, 4, G.x + 2 * G.cs + G.cs * 6, G.y + 0.5 * G.cs, false, G.cs, { sunk: true });
      drawShip(fake, ctx, 3, 3, G.x + 10 * G.cs, G.y + 3 * G.cs, false, G.cs, {});
      drawShip(fake, ctx, 4, 2, G.x + 4 * G.cs, G.y + 6 * G.cs, true, G.cs, {});
      const cc = (x, y) => [G.x + (x + 0.5) * G.cs, G.y + (y + 0.5) * G.cs];
      drawFire(ctx, ...cc(2, 2), G.cs, t, 1, false, 9);
      drawFire(ctx, ...cc(4, 2), G.cs, t, 4, false, 9);
      for (let y = 0; y < 4; y++) drawFire(ctx, ...cc(8, 0.5 + y), G.cs, t, y * 2, true, 9);
      for (const [x, y] of [[0, 0], [2, 0], [6, 6], [11, 1], [9, 5], [12, 4], [5, 0], [6, 4]]) drawMiss(ctx, ...cc(x, y), G.cs, 9, 0.4, (x * 0.3) % 1);
      // התזה גדולה במים הפתוחים
      const [sx, sy] = cc(2.7, 3.9);
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (i / 15 - 0.5) * 1.6, r = 30 + (i % 4) * 12;
        ctx.fillStyle = i % 2 ? '#e8f7ff' : '#9ad7ff';
        ctx.beginPath(); ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r * 1.3, 7 - (i % 3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(230,248,255,.85)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(sx, sy + 10, 52, 19, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy + 10, 80, 30, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // פגז עם שובל, ומטרה גדולה
      const tx = w * 0.79, ty = h * 0.62;
      ctx.lineCap = 'round';
      const ox = w * 0.2, oy = h * 0.72;   // רק הסוף של הקשת: פגז שנוחת על הספינה
      for (let i = 10; i < 26; i++) {
        const u = i / 26, x = ox + (tx - ox) * u, y = oy + (ty - oy) * u - Math.sin(u * Math.PI) * 300;
        ctx.fillStyle = `rgba(255,${200 - u * 60},${120 - u * 80},${0.15 + u * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, 3 + u * 6, 0, Math.PI * 2); ctx.fill();
      }
      const bl = ctx.createRadialGradient(tx, ty, 0, tx, ty, 120);
      bl.addColorStop(0, 'rgba(255,250,210,1)'); bl.addColorStop(0.25, 'rgba(255,200,70,.95)'); bl.addColorStop(0.6, 'rgba(255,110,20,.55)'); bl.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(tx, ty, 120, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, r1 = 40, r2 = 95 + (i % 3) * 22;
        ctx.strokeStyle = i % 2 ? '#ffd23f' : '#fff3b0'; ctx.lineWidth = 6 - (i % 3);
        ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1); ctx.lineTo(tx + Math.cos(a) * r2, ty + Math.sin(a) * r2); ctx.stroke();
      }
      drawReticle(ctx, tx, ty, 150, '#ffd166', 0, false);
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      // הצוללת הצהובה שיורה, עם בועות
      ctx.save(); ctx.shadowColor = 'rgba(0,10,30,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      drawSubSide(k, ctx, w * 0.17, h * 0.86, 74, 0.6, '#ffcf3f');
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,245,255,.8)'; ctx.lineWidth = 2.5;
      for (const [bx, by, br] of [[0.05, 0.8, 9], [0.03, 0.7, 6], [0.07, 0.64, 4.5], [0.3, 0.83, 7], [0.32, 0.75, 4.5]]) { ctx.beginPath(); ctx.arc(w * bx, h * by, br, 0, Math.PI * 2); ctx.stroke(); }
    },

    // לבדיקות בלבד
    dev: { N, FLEET, MISS, HIT, WATER, SUNK, newSide, rebuild, canPlace, autoPlace, allPlaced, validFleet, shoot, aiPick, kidPick, densityMap, targetCells, AI, layout },
  });
})();
