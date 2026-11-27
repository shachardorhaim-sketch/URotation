// ============================================================
//  URotation — המנוע המשותף של משחקי ה-2D (התיקייה g2d)
//  משחק נרשם:  GK.register('snake', { w, h, bg, text, init, step, draw, cover, ... })
//  האתר מרכיב: GK.mount('snake', host) ומקבל בחזרה פונקציית פירוק.
//  המנוע נותן לכל משחק: עולם בגודל קבוע שמתמתח למסגרת, צעדים קבועים (60 בשנייה),
//  תפריט, השהיה, סוף משחק, שיאים, שלבים, צלילים, חלקיקים, 8 שפות וכפתורי מגע.
// ============================================================
(function () {
  'use strict';
  if (window.GK) return;

  const LANGS = ['he', 'en', 'ar', 'es', 'fr', 'pt', 'ru', 'de'];
  const RTL = { he: 1, ar: 1 };
  const FONT = 'Heebo, Arial, sans-serif';
  const STEP = 1 / 60;
  const TOUCH = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  const reg = {};
  const missing = new Set();

  // ---------- מילים שכל המשחקים צריכים ----------
  const COMMON = {
    he: { play: '▶ שחק', again: '↻ שחק שוב', menu: 'תפריט', resume: '▶ המשך', restart: 'התחל מחדש', paused: 'המשחק מושהה', score: 'ניקוד', best: 'שיא', level: 'שלב', time: 'זמן', moves: 'מהלכים', lives: 'חיים', newBest: 'שיא חדש!', gameOver: 'המשחק נגמר', youWin: 'ניצחת!', youLose: 'הפסדת', draw: 'תיקו!', levelDone: 'השלב הושלם!', nextLevel: 'לשלב הבא', allDone: 'סיימת את כל השלבים!', vsCpu: 'נגד המחשב', twoP: '2 שחקנים', onePlayer: 'שחקן אחד', p1: 'שחקן 1', p2: 'שחקן 2', cpu: 'המחשב', wins: '{name} ניצח!', turnOf: 'התור של {name}', easy: 'קל', medium: 'בינוני', hard: 'קשה', difficulty: 'רמת קושי', mode: 'מצב משחק', howTo: 'איך משחקים', locked: 'נעול', ready: 'מוכנים?', go: 'צא!', yes: 'כן', no: 'לא', back: 'חזרה', keysHint: 'P / Esc — השהיה · M — צליל' },
    en: { play: '▶ Play', again: '↻ Play again', menu: 'Menu', resume: '▶ Resume', restart: 'Restart', paused: 'Paused', score: 'Score', best: 'Best', level: 'Level', time: 'Time', moves: 'Moves', lives: 'Lives', newBest: 'New record!', gameOver: 'Game over', youWin: 'You win!', youLose: 'You lose', draw: "It's a draw!", levelDone: 'Level complete!', nextLevel: 'Next level', allDone: 'You finished every level!', vsCpu: 'Vs computer', twoP: '2 players', onePlayer: '1 player', p1: 'Player 1', p2: 'Player 2', cpu: 'Computer', wins: '{name} wins!', turnOf: "{name}'s turn", easy: 'Easy', medium: 'Medium', hard: 'Hard', difficulty: 'Difficulty', mode: 'Game mode', howTo: 'How to play', locked: 'Locked', ready: 'Ready?', go: 'Go!', yes: 'Yes', no: 'No', back: 'Back', keysHint: 'P / Esc — pause · M — sound' },
    ar: { play: '▶ العب', again: '↻ العب مجدداً', menu: 'القائمة', resume: '▶ تابع', restart: 'ابدأ من جديد', paused: 'اللعبة متوقفة', score: 'النقاط', best: 'الرقم القياسي', level: 'المرحلة', time: 'الوقت', moves: 'الحركات', lives: 'الأرواح', newBest: 'رقم قياسي جديد!', gameOver: 'انتهت اللعبة', youWin: 'لقد فزت!', youLose: 'لقد خسرت', draw: 'تعادل!', levelDone: 'اكتملت المرحلة!', nextLevel: 'المرحلة التالية', allDone: 'أنهيت كل المراحل!', vsCpu: 'ضد الكمبيوتر', twoP: 'لاعبان', onePlayer: 'لاعب واحد', p1: 'اللاعب 1', p2: 'اللاعب 2', cpu: 'الكمبيوتر', wins: '{name} فاز!', turnOf: 'دور {name}', easy: 'سهل', medium: 'متوسط', hard: 'صعب', difficulty: 'الصعوبة', mode: 'وضع اللعب', howTo: 'طريقة اللعب', locked: 'مقفل', ready: 'مستعدون؟', go: 'انطلق!', yes: 'نعم', no: 'لا', back: 'رجوع', keysHint: 'P / Esc — إيقاف مؤقت · M — الصوت' },
    es: { play: '▶ Jugar', again: '↻ Jugar otra vez', menu: 'Menú', resume: '▶ Continuar', restart: 'Reiniciar', paused: 'En pausa', score: 'Puntos', best: 'Récord', level: 'Nivel', time: 'Tiempo', moves: 'Movimientos', lives: 'Vidas', newBest: '¡Nuevo récord!', gameOver: 'Fin del juego', youWin: '¡Ganaste!', youLose: 'Perdiste', draw: '¡Empate!', levelDone: '¡Nivel completado!', nextLevel: 'Siguiente nivel', allDone: '¡Completaste todos los niveles!', vsCpu: 'Contra la computadora', twoP: '2 jugadores', onePlayer: '1 jugador', p1: 'Jugador 1', p2: 'Jugador 2', cpu: 'Computadora', wins: '¡{name} gana!', turnOf: 'Turno de {name}', easy: 'Fácil', medium: 'Medio', hard: 'Difícil', difficulty: 'Dificultad', mode: 'Modo de juego', howTo: 'Cómo jugar', locked: 'Bloqueado', ready: '¿Listos?', go: '¡Ya!', yes: 'Sí', no: 'No', back: 'Volver', keysHint: 'P / Esc — pausa · M — sonido' },
    fr: { play: '▶ Jouer', again: '↻ Rejouer', menu: 'Menu', resume: '▶ Reprendre', restart: 'Recommencer', paused: 'En pause', score: 'Score', best: 'Record', level: 'Niveau', time: 'Temps', moves: 'Coups', lives: 'Vies', newBest: 'Nouveau record !', gameOver: 'Partie terminée', youWin: 'Tu as gagné !', youLose: 'Tu as perdu', draw: 'Match nul !', levelDone: 'Niveau terminé !', nextLevel: 'Niveau suivant', allDone: 'Tu as fini tous les niveaux !', vsCpu: "Contre l'ordinateur", twoP: '2 joueurs', onePlayer: '1 joueur', p1: 'Joueur 1', p2: 'Joueur 2', cpu: 'Ordinateur', wins: '{name} gagne !', turnOf: 'Au tour de {name}', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', difficulty: 'Difficulté', mode: 'Mode de jeu', howTo: 'Comment jouer', locked: 'Verrouillé', ready: 'Prêts ?', go: 'Partez !', yes: 'Oui', no: 'Non', back: 'Retour', keysHint: 'P / Échap — pause · M — son' },
    pt: { play: '▶ Jogar', again: '↻ Jogar de novo', menu: 'Menu', resume: '▶ Continuar', restart: 'Recomeçar', paused: 'Pausado', score: 'Pontos', best: 'Recorde', level: 'Fase', time: 'Tempo', moves: 'Jogadas', lives: 'Vidas', newBest: 'Novo recorde!', gameOver: 'Fim de jogo', youWin: 'Você venceu!', youLose: 'Você perdeu', draw: 'Empate!', levelDone: 'Fase concluída!', nextLevel: 'Próxima fase', allDone: 'Você terminou todas as fases!', vsCpu: 'Contra o computador', twoP: '2 jogadores', onePlayer: '1 jogador', p1: 'Jogador 1', p2: 'Jogador 2', cpu: 'Computador', wins: '{name} venceu!', turnOf: 'Vez de {name}', easy: 'Fácil', medium: 'Médio', hard: 'Difícil', difficulty: 'Dificuldade', mode: 'Modo de jogo', howTo: 'Como jogar', locked: 'Bloqueado', ready: 'Prontos?', go: 'Já!', yes: 'Sim', no: 'Não', back: 'Voltar', keysHint: 'P / Esc — pausa · M — som' },
    ru: { play: '▶ Играть', again: '↻ Ещё раз', menu: 'Меню', resume: '▶ Продолжить', restart: 'Заново', paused: 'Пауза', score: 'Очки', best: 'Рекорд', level: 'Уровень', time: 'Время', moves: 'Ходы', lives: 'Жизни', newBest: 'Новый рекорд!', gameOver: 'Игра окончена', youWin: 'Победа!', youLose: 'Поражение', draw: 'Ничья!', levelDone: 'Уровень пройден!', nextLevel: 'Следующий уровень', allDone: 'Все уровни пройдены!', vsCpu: 'Против компьютера', twoP: '2 игрока', onePlayer: '1 игрок', p1: 'Игрок 1', p2: 'Игрок 2', cpu: 'Компьютер', wins: '{name} побеждает!', turnOf: 'Ходит {name}', easy: 'Легко', medium: 'Средне', hard: 'Сложно', difficulty: 'Сложность', mode: 'Режим', howTo: 'Как играть', locked: 'Закрыто', ready: 'Готовы?', go: 'Вперёд!', yes: 'Да', no: 'Нет', back: 'Назад', keysHint: 'P / Esc — пауза · M — звук' },
    de: { play: '▶ Spielen', again: '↻ Nochmal', menu: 'Menü', resume: '▶ Weiter', restart: 'Neu starten', paused: 'Pause', score: 'Punkte', best: 'Rekord', level: 'Level', time: 'Zeit', moves: 'Züge', lives: 'Leben', newBest: 'Neuer Rekord!', gameOver: 'Spiel vorbei', youWin: 'Du gewinnst!', youLose: 'Du verlierst', draw: 'Unentschieden!', levelDone: 'Level geschafft!', nextLevel: 'Nächstes Level', allDone: 'Du hast alle Level geschafft!', vsCpu: 'Gegen den Computer', twoP: '2 Spieler', onePlayer: '1 Spieler', p1: 'Spieler 1', p2: 'Spieler 2', cpu: 'Computer', wins: '{name} gewinnt!', turnOf: '{name} ist dran', easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', difficulty: 'Schwierigkeit', mode: 'Spielmodus', howTo: 'So wird gespielt', locked: 'Gesperrt', ready: 'Bereit?', go: 'Los!', yes: 'Ja', no: 'Nein', back: 'Zurück', keysHint: 'P / Esc — Pause · M — Ton' },
  };

  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
  const langNow = () => { const l = lsGet('flrot:lang', 'he'); return LANGS.includes(l) ? l : 'he'; };
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // ---------- כלים קטנים לכל משחק (זמינים גם כ-g.clamp וכו') ----------
  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    rnd: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    ri: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
    ease: {
      out: t => 1 - (1 - t) * (1 - t),
      in: t => t * t,
      inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
      back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
      elastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.0944) + 1),
    },
    // מספרים אקראיים שחוזרים על עצמם לפי זרע (לשלבים קבועים, "מילה ביום" וכו')
    seeded(s) { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
    circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); },
    // צבע בהיר יותר (amt חיובי) או כהה יותר (שלילי), amt בין -1 ל-1
    shade(hex, amt) {
      let c = String(hex).replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const n = parseInt(c, 16), f = amt < 0 ? 0 : 255, p = Math.abs(amt);
      const ch = v => Math.round(v + (f - v) * p);
      return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
    },
  };

  // כיוון לפי הטקסט עצמו: עברית או ערבית מימין לשמאל, מספרים כמו "+5" תמיד משמאל לימין
  const RTL_CHARS = /[֐-ࣿ]/;
  function drawText(ctx, s, x, y, o) {
    o = o || {};
    s = String(s);
    ctx.save();
    ctx.font = (o.weight || 800) + ' ' + (o.size || 24) + 'px ' + FONT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    ctx.direction = o.dir || (RTL_CHARS.test(s) ? 'rtl' : 'ltr');
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow) { ctx.shadowColor = o.shadow === true ? 'rgba(0,0,0,.5)' : o.shadow; ctx.shadowBlur = o.blur != null ? o.blur : 8; ctx.shadowOffsetY = 2; }
    if (o.stroke) {
      ctx.lineWidth = o.strokeW || 5; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round';
      if (o.maxW) ctx.strokeText(s, x, y, o.maxW); else ctx.strokeText(s, x, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = o.color || '#fff';
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
    ctx.restore();
  }

  // ---------- צלילים: הכול מסונתז, בלי קבצים. הקשר שמע אחד לכל הדף ----------
  let AC = null, OUT = null, noiseBuf = null;
  let muted = lsGet('flrot:g2d:sound', '1') === '0';
  const lastSfx = {};
  function audio() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        const comp = AC.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        OUT = AC.createGain(); OUT.gain.value = 0.8;
        OUT.connect(comp); comp.connect(AC.destination);
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
    return AC;
  }
  // השעון של השמע מתחיל רק אחרי לחיצה אמיתית; עד אז כל צליל היה מצטבר ומתנגן ביחד
  const canPlay = () => !muted && AC && AC.state === 'running' && AC.currentTime > 0;
  function tone(t0, o) {
    const os = AC.createOscillator(), gn = AC.createGain();
    const dur = o.dur || 0.12, vol = o.vol != null ? o.vol : 0.2;
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(Math.max(20, o.f || 440), t0);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (o.att || 0.006));
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    os.connect(gn); gn.connect(OUT);
    os.start(t0); os.stop(t0 + dur + 0.03);
  }
  function hiss(t0, o) {
    const dur = o.dur || 0.2;
    if (!noiseBuf) {
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = AC.createBiquadFilter(); fl.type = o.filter || 'lowpass'; fl.Q.value = o.q || 0.8;
    fl.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + dur);
    const gn = AC.createGain();
    gn.gain.setValueAtTime(o.vol != null ? o.vol : 0.2, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(gn); gn.connect(OUT);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  const P = o => o.p || 1;   // גובה הצליל (1 = רגיל)
  const SFX = {
    click: (t, o) => tone(t, { type: 'square', f: 760 * P(o), dur: 0.045, vol: 0.06 }),
    tick: (t, o) => tone(t, { f: 1500 * P(o), dur: 0.03, vol: 0.06 }),
    move: (t, o) => tone(t, { type: 'triangle', f: 520 * P(o), dur: 0.05, vol: 0.1 }),
    place: (t, o) => tone(t, { type: 'triangle', f: 330 * P(o), f2: 250 * P(o), dur: 0.09, vol: 0.22 }),
    pop: (t, o) => tone(t, { f: 380 * P(o), f2: 980 * P(o), dur: 0.09, vol: 0.2 }),
    coin: (t, o) => { tone(t, { type: 'square', f: 988 * P(o), dur: 0.07, vol: 0.07 }); tone(t + 0.07, { type: 'square', f: 1319 * P(o), dur: 0.16, vol: 0.07 }); },
    score: (t, o) => { tone(t, { type: 'triangle', f: 660 * P(o), dur: 0.08, vol: 0.2 }); tone(t + 0.08, { type: 'triangle', f: 990 * P(o), dur: 0.15, vol: 0.2 }); },
    jump: (t, o) => tone(t, { type: 'square', f: 260 * P(o), f2: 640 * P(o), dur: 0.14, vol: 0.06 }),
    bounce: (t, o) => tone(t, { f: 240 * P(o), f2: 140 * P(o), dur: 0.1, vol: 0.28 }),
    shoot: (t, o) => { hiss(t, { f: 3200, f2: 900, dur: 0.08, vol: 0.14 }); tone(t, { type: 'square', f: 320 * P(o), f2: 120, dur: 0.08, vol: 0.05 }); },
    laser: (t, o) => tone(t, { type: 'sawtooth', f: 1400 * P(o), f2: 220, dur: 0.14, vol: 0.05 }),
    hit: (t, o) => { hiss(t, { f: 1800, f2: 200, dur: 0.12, vol: 0.22 }); tone(t, { f: 170 * P(o), f2: 60, dur: 0.14, vol: 0.3 }); },
    break: (t, o) => { hiss(t, { filter: 'highpass', f: 4500, f2: 1500, dur: 0.14, vol: 0.18 }); tone(t, { type: 'triangle', f: 900 * P(o), f2: 380, dur: 0.1, vol: 0.12 }); },
    boom: (t, o) => { hiss(t, { f: 1400, f2: 50, dur: 0.55, vol: 0.32 }); tone(t, { f: 110 * P(o), f2: 32, dur: 0.5, vol: 0.34 }); },
    splash: t => hiss(t, { filter: 'bandpass', f: 2600, f2: 500, dur: 0.32, vol: 0.22, q: 0.6 }),
    whoosh: t => hiss(t, { filter: 'bandpass', f: 380, f2: 2800, dur: 0.24, vol: 0.14, q: 0.9 }),
    error: t => { tone(t, { type: 'square', f: 190, dur: 0.09, vol: 0.06 }); tone(t + 0.1, { type: 'square', f: 140, dur: 0.15, vol: 0.06 }); },
    power: (t, o) => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.055, { type: 'square', f: f * P(o), dur: 0.1, vol: 0.055 })),
    start: t => { tone(t, { type: 'triangle', f: 440, dur: 0.1, vol: 0.18 }); tone(t + 0.1, { type: 'triangle', f: 880, dur: 0.2, vol: 0.18 }); },
    win: t => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.09, { type: 'triangle', f, dur: i === 4 ? 0.55 : 0.16, vol: 0.2 })),
    lose: t => [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.14, { type: 'triangle', f, f2: f * 0.96, dur: i === 3 ? 0.5 : 0.16, vol: 0.2 })),
    record: t => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(t + i * 0.07, { type: 'square', f, dur: 0.12, vol: 0.055 })),
  };
  function play(name, o) {
    if (!canPlay() || !SFX[name]) return;
    const t = AC.currentTime;
    if (lastSfx[name] && t - lastSfx[name] < 0.035) return;   // אותו צליל לא נערם על עצמו
    lastSfx[name] = t;
    try { SFX[name](t + 0.005, o || {}); } catch (e) {}
  }

  // ---------- עיצוב (פעם אחת לדף) ----------
  const CSS = `
.g2d{position:relative;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;user-select:none;-webkit-user-select:none;color:#fff;--acc:#4fd1c5;-webkit-tap-highlight-color:transparent}
.g2d button{font-family:inherit;cursor:pointer}
.g2d-bar{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 2px 8px;min-height:44px}
.g2d-hud{display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:0}
.g2d-chip{background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:4px 12px;display:flex;gap:7px;align-items:baseline;white-space:nowrap}
.g2d-chip span{font-size:13px;font-weight:600;opacity:.78}
.g2d-chip b{font-size:16px;font-weight:800;color:var(--acc);font-variant-numeric:tabular-nums}
.g2d-ib{width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.38);color:#fff;font-size:17px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.g2d-ib:hover{background:rgba(255,255,255,.16)}
.g2d-stage{flex:1 1 auto;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
.g2d-stage canvas{display:block;touch-action:none;border-radius:10px;box-shadow:0 10px 30px -12px rgba(0,0,0,.6)}
.g2d-touch{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 4px 2px;direction:ltr}
.g2d-tgrp{display:flex;gap:10px}
.g2d-tb{width:66px;height:66px;border-radius:18px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fff;font-size:26px;font-weight:800;touch-action:none;display:flex;align-items:center;justify-content:center}
.g2d-tb.on{background:var(--acc);color:#0b1220}
.g2d-ov{position:absolute;inset:0;display:none;background:rgba(5,8,14,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:5;padding:14px;overflow:auto}
.g2d-ov.show{display:flex}
.g2d-card{margin:auto;background:rgba(15,21,33,.95);border:1px solid rgba(255,255,255,.13);border-radius:20px;padding:22px 24px;width:100%;max-width:520px;text-align:center;box-shadow:0 22px 60px rgba(0,0,0,.55)}
.g2d-card h2{margin:0 0 6px;font-size:clamp(24px,4vw,38px);font-weight:900;line-height:1.15;color:var(--acc)}
.g2d-card p{margin:6px 0;font-size:15px;line-height:1.5;opacity:.92}
.g2d-help{text-align:start;background:rgba(255,255,255,.07);border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14.5px;line-height:1.6}
.g2d-lbl{font-size:13px;opacity:.72;margin-top:10px;font-weight:600}
.g2d-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.g2d-btn{background:var(--acc);color:#0b1220;border:0;border-radius:12px;padding:12px 24px;font-size:18px;font-weight:800;min-width:140px}
.g2d-btn:hover{filter:brightness(1.1)}
.g2d-btn.alt{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);font-size:16px}
.g2d-opt{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 14px;font-size:15px;font-weight:700}
.g2d-opt.on{background:var(--acc);color:#0b1220;border-color:var(--acc)}
.g2d-lv{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:8px;margin:10px 0;max-height:min(42vh,280px);overflow:auto;padding:2px}
.g2d-lvb{aspect-ratio:1;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:18px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0}
.g2d-lvb.cur{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc) inset}
.g2d-lvb small{font-size:10px;color:#ffd166;letter-spacing:1px;line-height:1}
.g2d-lvb:disabled{opacity:.35;cursor:default}
.g2d-big{font-size:clamp(36px,6vw,58px);font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums}
.g2d-stars{font-size:40px;color:#ffd166;letter-spacing:4px;margin:4px 0}
.g2d-new{color:#ffd166;font-weight:900;font-size:19px;margin:4px 0;animation:g2dPulse .7s ease-in-out infinite alternate}
@keyframes g2dPulse{from{transform:scale(1)}to{transform:scale(1.08)}}
.g2d-keys{font-size:12px;opacity:.55;margin-top:10px}
.g2d-toast{position:absolute;left:50%;top:20%;transform:translate(-50%,-50%) scale(.85);background:rgba(0,0,0,.66);padding:10px 22px;border-radius:14px;font-size:clamp(20px,3.2vw,30px);font-weight:900;opacity:0;transition:opacity .2s,transform .25s;pointer-events:none;z-index:4;white-space:nowrap}
.g2d-toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
`;
  function injectCss() {
    if (document.getElementById('g2d-css')) return;
    const s = el('style'); s.id = 'g2d-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- הרכבת משחק ----------
  let active = 0;
  function mount(id, host) {
    const spec = reg[id];
    if (!spec) throw new Error('g2d: no game ' + id);
    injectCss();
    const W = spec.w || 800, H = spec.h || 600, NS = 'flrot:g2d:' + id + ':';
    const root = el('div', 'g2d');
    root.style.background = spec.bg || '#0d1620';
    if (spec.accent) root.style.setProperty('--acc', spec.accent);
    root.innerHTML =
      '<div class="g2d-bar"><div class="g2d-hud"></div><button type="button" class="g2d-ib" data-a="pause" hidden></button><button type="button" class="g2d-ib" data-a="sound"></button></div>' +
      '<div class="g2d-stage"><canvas></canvas><div class="g2d-toast"></div></div>' +
      '<div class="g2d-touch" hidden></div><div class="g2d-ov"></div>';
    host.appendChild(root);
    const $ = s => root.querySelector(s);
    const hudEl = $('.g2d-hud'), stageEl = $('.g2d-stage'), cv = $('canvas'), toastEl = $('.g2d-toast'), touchEl = $('.g2d-touch'), ovEl = $('.g2d-ov');
    const pauseBtn = $('[data-a=pause]'), soundBtn = $('[data-a=sound]');
    const ctx = cv.getContext('2d');

    const g = Object.assign(Object.create(U), {
      id, W, H, spec, ctx, root, stage: stageEl, canvas: cv, el,
      lang: langNow(), rtl: false, touch: TOUCH,
      state: 'menu', mode: null, diff: 0, level: 1, demo: true,
      frame: 0, time: 0, score: 0, alive: true,
      ptr: { x: W / 2, y: H / 2, down: false, hit: false, up: false, over: false, id: null, button: 0 },
      touches: new Map(), keys: new Set(), hits: new Set(),
    });

    // ----- מצבים, רמות ושלבים -----
    const MODE_LABEL = { cpu: 'vsCpu', '2p': 'twoP', '1p': 'onePlayer' };
    const modes = (spec.modes || []).map(m => (typeof m === 'string' ? { id: m, label: MODE_LABEL[m] || 'mode_' + m } : m));
    const diffs = spec.diffs === true ? ['easy', 'medium', 'hard'] : spec.diffs || null;
    const nLevels = spec.levels || 0;
    if (modes.length) g.mode = (modes.find(m => m.id === lsGet(NS + 'mode')) || modes[0]).id;
    if (diffs) { const d = +lsGet(NS + 'diff', spec.diffDefault || 0); g.diff = d >= 0 && d < diffs.length ? d : 0; }
    const showDiffs = () => diffs && (!spec.diffModes || spec.diffModes.includes(g.mode));
    const lvProg = () => { try { return JSON.parse(lsGet(NS + 'lv', '{}')) || {}; } catch (e) { return {}; } };
    const lvOpen = (n, p) => spec.levelsOpen || n === 1 || !!p[n - 1] || !!p[n];
    g.levelStars = n => lvProg()[n] || 0;

    // ----- טקסטים -----
    const has = k => { const T = spec.text || {}; return !!((T[g.lang] && T[g.lang][k] !== undefined) || (T.en && T.en[k] !== undefined)); };
    g.t = (k, vars) => {
      const T = spec.text || {}, L = g.lang;
      let s = T[L] && T[L][k] !== undefined ? T[L][k] : COMMON[L] && COMMON[L][k] !== undefined ? COMMON[L][k] : undefined;
      if (s === undefined) {
        missing.add(id + ':' + L + ':' + k);
        s = T.en && T.en[k] !== undefined ? T.en[k] : COMMON.en[k] !== undefined ? COMMON.en[k] : T.he && T.he[k] !== undefined ? T.he[k] : k;
      }
      if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, n) => (vars[n] !== undefined ? vars[n] : m));
      return s;
    };
    g.text = (c, s, x, y, o) => drawText(c, s, x, y, o);
    const fmt = v => (spec.fmt ? spec.fmt(v, g) : String(v));

    // ----- קלט -----
    g.key = c => g.keys.has(c);
    g.hit = c => g.hits.has(c);
    const AX = { arrows: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], wasd: ['KeyA', 'KeyD', 'KeyW', 'KeyS'] };
    const axisOf = (which, fn) => {
      let x = 0, y = 0;
      for (const s of which === 'arrows' || which === 'wasd' ? [which] : ['arrows', 'wasd']) {
        const a = AX[s];
        if (fn(a[0])) x--; if (fn(a[1])) x++; if (fn(a[2])) y--; if (fn(a[3])) y++;
      }
      return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };
    g.axis = which => axisOf(which, g.key);
    g.axisHit = which => axisOf(which, g.hit);

    // ----- שיאים -----
    const bestKey = () => NS + 'best:' + (g.mode || '-') + ':' + (diffs ? g.diff : '-');
    g.getBest = () => { const v = lsGet(bestKey(), null); return v === null ? null : +v; };

    // ----- אפקטים: חלקיקים, טקסט צף, רעידה, הבזק -----
    const parts = [];
    let shakeA = 0, flashA = 0, flashC = '#fff';
    g.burst = (x, y, o = {}) => {
      const n = o.n != null ? o.n : 14, sp = o.speed || 3, life = o.life || 40, size = o.size || 4, col = o.color || '#ffd166';
      const spread = o.spread != null ? o.spread : Math.PI * 2, dir = o.dir || 0;
      for (let i = 0; i < n; i++) {
        const a = dir + (Math.random() - 0.5) * spread, v = sp * (0.35 + Math.random() * 0.9);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8), col: Array.isArray(col) ? col[i % col.length] : col, g: o.gravity != null ? o.gravity : 0.08, drag: o.drag || 0.97, sq: o.shape === 'square' });
      }
      if (parts.length > 1600) parts.splice(0, parts.length - 1600);
    };
    g.float = (x, y, s, o = {}) => parts.push({ x, y, vx: 0, vy: -(o.speed || 1.1), life: o.life || 55, max: o.life || 55, txt: String(s), col: o.color || '#fff', size: o.size || 22, g: 0, drag: 1 });
    g.shake = a => { shakeA = Math.max(shakeA, a); };
    g.flash = (c, a) => { flashC = c || '#fff'; flashA = a != null ? a : 0.35; };
    g.clearFx = () => { parts.length = 0; shakeA = 0; flashA = 0; };
    function stepFx() {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= p.drag; if (!p.txt) p.vy *= p.drag;
        if (--p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); }
      }
      shakeA = shakeA > 0.3 ? shakeA * 0.86 : 0;
      flashA = flashA > 0.01 ? flashA * 0.88 : 0;
    }
    function drawFx(c) {
      for (const p of parts) {
        const a = Math.max(0, Math.min(1, p.life / p.max * 1.4));
        if (p.txt) { drawText(c, p.txt, p.x, p.y, { size: p.size, color: p.col, stroke: 'rgba(0,0,0,.55)', strokeW: 4, alpha: a }); continue; }
        c.globalAlpha = a; c.fillStyle = p.col;
        if (p.sq) c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        else { c.beginPath(); c.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); c.fill(); }
      }
      c.globalAlpha = 1;
    }

    // ----- טיימרים בזמן המשחק (עוצרים בהשהיה) -----
    let timers = [];
    g.after = (sec, fn) => { timers.push({ t: g.time + sec, fn }); };

    // ----- הודעה קופצת, שורת הניקוד -----
    let toastT = 0;
    g.msg = (s, ms, color) => {
      toastEl.textContent = s; toastEl.style.color = color || '';
      toastEl.classList.add('show');
      clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), ms || 1200);
    };
    const hideToast = () => { clearTimeout(toastT); toastEl.classList.remove('show'); };
    let hudSig = '';
    g.hud = items => {
      const sig = JSON.stringify(items || []);
      if (sig === hudSig) return;
      hudSig = sig; hudEl.textContent = '';
      for (const it of items || []) {
        if (!it) continue;
        const c = el('div', 'g2d-chip');
        if (it[0]) c.appendChild(el('span', '', it[0]));
        c.appendChild(el('b', '', it[1]));
        if (it[2]) c.style.setProperty('--acc', it[2]);
        hudEl.appendChild(c);
      }
    };

    // ----- שמירה -----
    g.save = (k, v) => lsSet(NS + 's:' + k, JSON.stringify(v));
    g.load = (k, d) => { const v = lsGet(NS + 's:' + k, null); if (v === null) return d; try { return JSON.parse(v); } catch (e) { return d; } };

    // ----- צלילים -----
    g.sfx = (name, o) => { if (!g.demo) play(name, o); };
    g.tone = o => { if (!g.demo && canPlay()) try { tone(AC.currentTime + 0.005 + (o.delay || 0), o); } catch (e) {} };
    g.noise = o => { if (!g.demo && canPlay()) try { hiss(AC.currentTime + 0.005 + (o.delay || 0), o); } catch (e) {} };

    // ----- חלונות (תפריט, השהיה, סוף) -----
    let panelKind = null, lastEnd = null, endTimer = 0;
    function panel(kind, build) {
      panelKind = kind;
      ovEl.textContent = '';
      const card = el('div', 'g2d-card');
      build(card);
      ovEl.appendChild(card);
      ovEl.classList.add('show');
      ovEl.scrollTop = 0;
    }
    function closePanel() { panelKind = null; ovEl.classList.remove('show'); ovEl.textContent = ''; }
    function button(parent, text, fn, o = {}) {
      const b = el('button', 'g2d-btn' + (o.alt ? ' alt' : ''), text);
      b.type = 'button';
      if (o.primary) b.dataset.primary = '1';
      b.addEventListener('click', () => { audio(); play('click'); fn(); });
      parent.appendChild(b);
      return b;
    }
    function optRow(card, label, items, cur, pickFn) {
      card.appendChild(el('div', 'g2d-lbl', label));
      const row = el('div', 'g2d-row');
      items.forEach((txt, i) => {
        const b = el('button', 'g2d-opt' + (i === cur ? ' on' : ''), txt);
        b.type = 'button';
        b.addEventListener('click', () => { audio(); play('click'); pickFn(i); });
        row.appendChild(b);
      });
      card.appendChild(row);
    }
    g.panel = (build, kind) => panel(kind || 'custom', build);
    g.closePanel = closePanel;
    g.button = button;

    function showMenu() {
      g.state = 'menu';
      syncBar();
      panel('menu', card => {
        card.appendChild(el('h2', '', g.t('title')));
        if (has('tagline')) card.appendChild(el('p', '', g.t('tagline')));
        const help = g.t(TOUCH && has('helpTouch') ? 'helpTouch' : 'help');
        if (help && help !== 'help') {
          const box = el('div', 'g2d-help');
          (Array.isArray(help) ? help : [help]).forEach(l => box.appendChild(el('div', '', l)));
          card.appendChild(box);
        }
        if (modes.length > 1) optRow(card, g.t('mode'), modes.map(m => g.t(m.label)), modes.findIndex(m => m.id === g.mode), i => { g.mode = modes[i].id; lsSet(NS + 'mode', g.mode); showMenu(); });
        if (showDiffs()) optRow(card, g.t('difficulty'), diffs.map(d => g.t(d)), g.diff, i => { g.diff = i; lsSet(NS + 'diff', i); showMenu(); });
        const row = el('div', 'g2d-row');
        if (nLevels) {
          const p = lvProg();
          let next = 1;
          for (let n = 1; n <= nLevels; n++) if (lvOpen(n, p)) next = n; else break;
          for (let n = 1; n <= nLevels; n++) if (lvOpen(n, p) && !p[n]) { next = n; break; }
          card.appendChild(el('div', 'g2d-lbl', g.t('level')));
          const grid = el('div', 'g2d-lv');
          for (let n = 1; n <= nLevels; n++) {
            const open = lvOpen(n, p), st = p[n] || 0;
            const b = el('button', 'g2d-lvb' + (n === next ? ' cur' : ''));
            b.type = 'button';
            b.appendChild(el('span', '', open ? String(n) : '🔒'));
            if (st) b.appendChild(el('small', '', '★'.repeat(st)));
            if (!open) { b.disabled = true; b.title = g.t('locked'); }
            else b.addEventListener('click', () => { audio(); play('click'); startRound(n); });
            grid.appendChild(b);
          }
          card.appendChild(grid);
          button(row, g.t('play') + ' · ' + next, () => startRound(next), { primary: true });
          setTimeout(() => { const c = grid.querySelector('.cur'); if (c && c.scrollIntoView) grid.scrollTop = Math.max(0, c.offsetTop - grid.offsetTop - 60); }, 0);
        } else button(row, g.t('play'), () => startRound(), { primary: true });
        card.appendChild(row);
        const b = g.getBest();
        if (!nLevels && !spec.noBest && b !== null) card.appendChild(el('p', '', g.t('best') + ': ' + fmt(b)));
        if (!TOUCH) card.appendChild(el('div', 'g2d-keys', g.t('keysHint')));
      });
    }
    function showPause() {
      panel('pause', card => {
        card.appendChild(el('h2', '', g.t('paused')));
        const row = el('div', 'g2d-row');
        button(row, g.t('resume'), resume, { primary: true });
        button(row, g.t('restart'), () => startRound(), { alt: true });
        button(row, g.t('menu'), toMenu, { alt: true });
        card.appendChild(row);
      });
    }
    function showOver(o) {
      panel('over', card => {
        let title = o.title || (o.winner ? g.t('wins', { name: o.winner }) : g.t({ win: 'youWin', lose: 'youLose', draw: 'draw', level: 'levelDone' }[o.result] || 'gameOver'));
        if (o.result === 'level' && g.level >= nLevels && !o.title) title = g.t('allDone');
        card.appendChild(el('h2', '', title));
        if (o.result === 'level' && o.stars != null) card.appendChild(el('div', 'g2d-stars', '★'.repeat(o.stars) + '☆'.repeat(Math.max(0, 3 - o.stars))));
        if (o.score != null && o.result !== 'level') {
          card.appendChild(el('div', 'g2d-lbl', o.scoreLabel || g.t('score')));
          card.appendChild(el('div', 'g2d-big', fmt(o.score)));
        }
        if (o.isNew) card.appendChild(el('div', 'g2d-new', g.t('newBest')));
        else if (o.best != null) card.appendChild(el('p', '', g.t('best') + ': ' + fmt(o.best)));
        if (o.text) card.appendChild(el('p', '', o.text));
        const row = el('div', 'g2d-row');
        const hasNext = o.result === 'level' && g.level < nLevels;
        if (hasNext) button(row, g.t('nextLevel'), () => startRound(g.level + 1), { primary: true });
        button(row, g.t('again'), () => startRound(), { primary: !hasNext, alt: hasNext });
        button(row, g.t('menu'), toMenu, { alt: true });
        card.appendChild(row);
      });
    }
    function rerenderPanel() {
      if (panelKind === 'menu') showMenu();
      else if (panelKind === 'pause') showPause();
      else if (panelKind === 'over' && lastEnd) showOver(lastEnd);
    }

    // ----- זרימת המשחק -----
    function startRound(lv) {
      if (lv) g.level = lv;
      clearTimeout(endTimer);
      closePanel();
      g.state = 'play'; g.demo = false;
      g.frame = 0; g.time = 0; g.score = 0; timers = [];
      g.clearFx(); g.keys.clear(); g.hits.clear(); g.touches.clear();
      g.ptr.down = g.ptr.hit = g.ptr.up = false;
      hudSig = '';
      hideToast();   // הודעה מהסבב הקודם לא נשארת על הלוח החדש
      try { spec.init(g); } catch (e) { report(e); }
      audio(); play('start');
      syncBar();
      acc = 0; last = performance.now();
    }
    function pause() {
      if (g.state !== 'play') return;
      g.state = 'pause';
      if (spec.onPause) try { spec.onPause(g); } catch (e) { report(e); }
      showPause(); syncBar();
    }
    function resume() {
      if (g.state !== 'pause') return;
      closePanel();
      g.state = 'play'; g.keys.clear();
      syncBar();
      acc = 0; last = performance.now();
    }
    function toMenu() {
      clearTimeout(endTimer);
      g.demo = true; g.state = 'menu';
      g.clearFx(); timers = [];
      hideToast();
      try { spec.init(g); } catch (e) { report(e); }
      showMenu();
    }
    g.end = (o = {}) => {
      if (g.state !== 'play') return;
      g.state = 'over';
      o = Object.assign({}, o);
      if (o.score === undefined && !nLevels && !spec.noBest) o.score = g.score;
      if (o.score != null && !spec.noBest && o.result !== 'level' && !o.noRecord) {
        const b = g.getBest(), better = b === null || (spec.lowerIsBetter ? o.score < b : o.score > b);
        if (better && (spec.lowerIsBetter || o.score > 0)) { lsSet(bestKey(), o.score); o.isNew = b !== null; o.best = o.score; }
        else o.best = b;
      }
      play(o.sound || (o.isNew ? 'record' : o.result === 'win' || o.result === 'level' || o.winner ? 'win' : o.result === 'draw' ? 'score' : 'lose'));
      lastEnd = o;
      clearTimeout(endTimer);
      endTimer = setTimeout(() => { if (g.alive && g.state === 'over') showOver(o); }, o.delay != null ? o.delay : 750);
      syncBar();
    };
    g.completeLevel = (stars, o = {}) => {
      if (g.state !== 'play') return;
      stars = stars == null ? 3 : Math.max(1, Math.min(3, stars));
      const p = lvProg();
      p[g.level] = Math.max(p[g.level] || 0, stars);
      lsSet(NS + 'lv', JSON.stringify(p));
      g.end(Object.assign({ result: 'level', stars }, o));
    };
    g.start = startRound; g.pause = pause; g.resume = resume; g.menu = toMenu;

    // ----- סרגל: השהיה וצליל -----
    function syncBar() {
      pauseBtn.hidden = !(g.state === 'play' || g.state === 'pause');
      pauseBtn.textContent = g.state === 'pause' ? '▶' : '⏸';
      soundBtn.textContent = muted ? '🔇' : '🔊';
    }
    function setMuted(m) {
      muted = m; lsSet('flrot:g2d:sound', m ? '0' : '1'); syncBar();
      if (!m) audio();
    }
    pauseBtn.addEventListener('click', () => (g.state === 'pause' ? resume() : pause()));
    soundBtn.addEventListener('click', () => setMuted(!muted));
    // כפתור שמקבל מיקוד היה תופס את הרווח והחיצים
    root.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });

    // ----- מקלדת -----
    const isField = t => t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    function onKD(e) {
      if (!g.alive || isField(e.target)) return;
      audio();
      const c = e.code;
      if ((g.state === 'play' || g.state === 'pause') && (c === 'Escape' || (c === 'KeyP' && !spec.typing))) {
        e.preventDefault();
        if (g.state === 'play') pause(); else resume();
        return;
      }
      if (c === 'KeyM' && !spec.typing && (g.state !== 'play' || !spec.usesM)) { setMuted(!muted); return; }
      if (panelKind && panelKind !== 'custom' && (c === 'Enter' || c === 'NumpadEnter' || c === 'Space')) {
        const b = ovEl.querySelector('[data-primary]');
        if (b) { e.preventDefault(); if (!e.repeat) b.click(); }
        return;
      }
      if (g.state !== 'play') { if (spec.onKey && panelKind === 'custom') spec.onKey(g, e); return; }
      if (c.startsWith('Arrow') || c === 'Space') e.preventDefault();
      if (!e.repeat) g.hits.add(c);
      g.keys.add(c);
      if (spec.onKey) try { spec.onKey(g, e); } catch (er) { report(er); }
    }
    function onKU(e) {
      g.keys.delete(e.code);
      if (spec.onKeyUp && g.state === 'play') try { spec.onKeyUp(g, e); } catch (er) { report(er); }
    }

    // ----- עכבר ומגע (בקואורדינטות של העולם) -----
    function toWorld(e) {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / (r.width || 1) * W, y: (e.clientY - r.top) / (r.height || 1) * H };
    }
    const callPtr = (type, p) => { if (spec.onPointer) try { spec.onPointer(g, type, p); } catch (er) { report(er); } };
    function onPD(e) {
      audio();
      if (g.state !== 'play') return;
      e.preventDefault();
      const p = toWorld(e);
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      g.touches.set(e.pointerId, p);
      if (e.isPrimary || !g.ptr.down) Object.assign(g.ptr, { x: p.x, y: p.y, down: true, hit: true, id: e.pointerId, button: e.button });
      callPtr('down', Object.assign(p, { id: e.pointerId, button: e.button, primary: e.isPrimary, kind: e.pointerType }));
    }
    function onPM(e) {
      const p = toWorld(e);
      if (g.touches.has(e.pointerId)) g.touches.set(e.pointerId, p);
      if (e.isPrimary || e.pointerId === g.ptr.id) { g.ptr.x = p.x; g.ptr.y = p.y; g.ptr.over = true; }
      if (g.state === 'play') callPtr('move', Object.assign(p, { id: e.pointerId, down: g.touches.has(e.pointerId), primary: e.isPrimary, kind: e.pointerType }));
    }
    function onPU(e) {
      const p = toWorld(e);
      const wasDown = g.touches.delete(e.pointerId);
      if (e.pointerId === g.ptr.id && g.ptr.down) Object.assign(g.ptr, { x: p.x, y: p.y, down: false, up: true });
      if (g.state === 'play' && wasDown) callPtr('up', Object.assign(p, { id: e.pointerId, primary: e.isPrimary, kind: e.pointerType }));
    }
    cv.addEventListener('pointerdown', onPD);
    cv.addEventListener('pointermove', onPM);
    cv.addEventListener('pointerup', onPU);
    cv.addEventListener('pointercancel', onPU);
    cv.addEventListener('pointerleave', () => { g.ptr.over = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());

    // ----- כפתורי מגע (רק במכשיר מגע, ורק אם המשחק ביקש) -----
    if (TOUCH && spec.touch) {
      touchEl.hidden = false;
      const groups = [[]];
      spec.touch.forEach(b => (b ? groups[groups.length - 1].push(b) : groups.push([])));
      groups.forEach(gr => {
        const d = el('div', 'g2d-tgrp');
        gr.forEach(([code, label]) => {
          const b = el('button', 'g2d-tb', label);
          b.type = 'button';
          const on = ev => {
            ev.preventDefault(); audio();
            try { b.setPointerCapture(ev.pointerId); } catch (er) {}
            b.classList.add('on');
            if (g.state !== 'play') return;
            g.keys.add(code); g.hits.add(code);
            if (spec.onKey) try { spec.onKey(g, { code, key: code, repeat: false, type: 'keydown', preventDefault() {} }); } catch (er) { report(er); }
          };
          const off = () => { b.classList.remove('on'); g.keys.delete(code); };
          b.addEventListener('pointerdown', on);
          b.addEventListener('pointerup', off);
          b.addEventListener('pointercancel', off);
          d.appendChild(b);
        });
        touchEl.appendChild(d);
      });
    }

    // ----- גודל: העולם תמיד W×H, מתמתח למסגרת, ברזולוציה חדה -----
    let RES = 0;
    function fit() {
      const sw = stageEl.clientWidth, sh = stageEl.clientHeight;
      if (sw < 4 || sh < 4) return;
      const k = Math.min(sw / W, sh / H);
      cv.style.width = Math.floor(W * k) + 'px';
      cv.style.height = Math.floor(H * k) + 'px';
      const res = Math.max(1, Math.min(3, Math.ceil(k * (window.devicePixelRatio || 1) * 2) / 2));
      if (res !== RES) { RES = res; cv.width = Math.round(W * res); cv.height = Math.round(H * res); }
    }
    const ro = new ResizeObserver(fit);
    ro.observe(stageEl);

    // ----- ציור ולולאה -----
    let errs = 0;
    function report(e) { if (errs++ < 3) console.error('[g2d:' + id + ']', e); }
    function render(alpha) {
      if (!RES) return;
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = spec.bg || '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (shakeA) ctx.translate((Math.random() - 0.5) * shakeA * 2, (Math.random() - 0.5) * shakeA * 2);
      try { spec.draw(g, ctx, alpha); } catch (e) { report(e); }
      ctx.restore();
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.save();
      if (shakeA) ctx.translate((Math.random() - 0.5) * shakeA, (Math.random() - 0.5) * shakeA);
      drawFx(ctx);
      ctx.restore();
      if (flashA) { ctx.globalAlpha = flashA; ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
    let raf = 0, last = performance.now(), acc = 0;
    function frame(now) {
      if (!g.alive) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.25) dt = 0.25;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 10) {
        acc -= STEP; n++;
        if (g.state === 'play') {
          if (GK.bot && spec.bot) try { spec.bot(g); } catch (e) { report(e); }
          try { spec.step(g); } catch (e) { report(e); }
          g.frame++; g.time += STEP;
          if (timers.length) {
            const due = timers.filter(t => t.t <= g.time);
            if (due.length) { timers = timers.filter(t => t.t > g.time); due.forEach(t => { try { t.fn(); } catch (e) { report(e); } }); }
          }
        } else if (spec.idle && g.state !== 'pause') try { spec.idle(g); } catch (e) { report(e); }
        stepFx();
        g.hits.clear(); g.ptr.hit = false; g.ptr.up = false;
      }
      if (n === 10) acc = 0;
      render(acc / STEP);
    }

    // ----- שפה, השהיה כשעוזבים את הלשונית -----
    function setLang(L) {
      g.lang = LANGS.includes(L) ? L : 'he';
      g.rtl = !!RTL[g.lang];
      root.dir = g.rtl ? 'rtl' : 'ltr';
      hudSig = '';
      if (spec.onLang) try { spec.onLang(g); } catch (e) { report(e); }
    }
    const onLang = e => { setLang(e.detail); rerenderPanel(); };
    const onVis = () => { if (document.hidden) pause(); };
    const onBlur = () => pause();
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('flrot:lang', onLang);

    setLang(g.lang);
    // try לא תופס הבטחה שנכשלה: בלי catch, פונט שלא ירד היה מפיל שגיאה בדפדפן
    try { if (document.fonts) document.fonts.load('800 20px Heebo').catch(() => {}); } catch (e) {}
    audio();
    fit();
    if (spec.setup) try { spec.setup(g); } catch (e) { report(e); }
    try { spec.init(g); } catch (e) { report(e); }
    showMenu();
    raf = requestAnimationFrame(frame);
    active++;
    GK.cur = g;

    return function cleanup() {
      if (!g.alive) return;
      g.alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(endTimer); clearTimeout(toastT);
      ro.disconnect();
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('flrot:lang', onLang);
      if (spec.destroy) try { spec.destroy(g); } catch (e) { report(e); }
      root.remove();
      active--;
      if (GK.cur === g) GK.cur = null;
    };
  }

  // תמונת הכרטיס של משחק (960×540), מצוירת מהקוד שלו — לכלי שמייצר את הקבצים
  function cover(id, canvas) {
    const spec = reg[id];
    if (!spec || !spec.cover) return false;
    const c = canvas.getContext('2d');
    const k = Object.assign(Object.create(U), {
      W: canvas.width, H: canvas.height, lang: 'he', rtl: true,
      text: (cx, s, x, y, o) => drawText(cx, s, x, y, o),
      t: key => (spec.text && spec.text.he && spec.text.he[key]) || (COMMON.he[key]) || key,
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    spec.cover(c, canvas.width, canvas.height, k);
    return true;
  }

  const GK = window.GK = {
    register(id, spec) { reg[id] = spec; },
    mount, cover, U, COMMON, LANGS,
    games: reg, missing, cur: null, bot: false,
    get active() { return active; },
    get muted() { return muted; },
  };
})();
