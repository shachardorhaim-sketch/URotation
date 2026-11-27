// ============================================================
//  מילה ביום — משחק 2D של URotation (המנוע: g2d/kit.js)
//  מנחשים מילה בת 5 אותיות ב-6 ניסיונות: ירוק = במקום, צהוב = במילה במקום אחר, אפור = לא במילה.
//  מילה יומית אחת לכולם (לפי התאריך) ותרגול בלי הגבלה. עברית (עם אותיות סופיות) או אנגלית. סטטיסטיקה נשמרת.
// ============================================================
(function () {
  'use strict';
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };          // final letters count as the normal letter
  const TOFIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };        // ...and are shown at the end of the word
  const ABC = { he: 'אבגדהוזחטיכלמנסעפצקרשת', en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
  const norm = (wl, w) => (wl === 'he' ? [...w].map(c => FIN[c] || c).join('') : String(w).toUpperCase());
  const shown = (wl, ch, i) => (wl === 'he' && i === 4 && TOFIN[ch] ? TOFIN[ch] : ch);
  // curated answers: common words a kid knows, exactly 5 letters (tested: length, alphabet, no duplicates)
  const WORDS = {
    he: (
      'שולחן מחברת שמיכה מברשת מנורה ספרים טלפון מצלמה בקבוק ילקוט צבעים מכחול בובות צעצוע משאית ספינה רמזור מדרכה ארמון בניין ' +
      'מסעדה מרפאה בריכה חופים תלמיד שיעור הפסקה צלצול חופשה פרחים עננים ברקים נהרות אגמים פירות ירקות קרחון שונית זריחה שקיעה ' +
      'שושנה כלנית נרקיס חרצית לוטוס קקטוס כלבים סוסים ברווז ציפור דבורה עכביש צפרדע תמנון מדוזה ארנבת קיפוד דובים אריות פילים ' +
      'קופים ינשוף חלזון תולעת אפרוח תנשמת חסידה חרגול חמסטר סוסון קואלה ברבור סלמון סרדין לוטרה גלידה גבינה ביצים חביתה פיצות ' +
      'ענבים אבטיח אפרסק תותים לימון קיווי רימון אפונה שתייה ארוחה מתכון קציצה שניצל חומוס פלאפל טחינה בורקס לביבה ידיים צוואר ' +
      'אגודל חולצה חצאית כפפות תכשיט שרשרת טבעות גלימה כפתור רוכסן משפחה הורים ילדים תינוק חברים מלכים מלכות נסיכה רופאה ציירת ' +
      'חקלאי שופטת סופרת משורר ממציא לשחות לקפוץ לצייר לכתוב לקרוא לשמוע לאכול לישון לחלום לנסוע לבנות לאפות לרקוד ללמוד לעזור ' +
      'לחייך לצחוק לגלוש למצוא לספור לפתוח לזרוק לתפוס לבעוט לטייל לרכוב לשמוח לגלות לצלול לקטוף לאסוף לשתול לחפור לתפור גדולה ' +
      'מהירה איטית עצובה עייפה קרירה חמימה מתוקה חמוצה מלוחה מצחיק משעמם אמיצה אמיתי נחמדה חמודה מקסים מיוחד אדומה כחולה ירוקה ' +
      'צהובה סגולה כתומה ורודה שחורה אפורה זהובה כסופה שקופה עגולה ארוכה גבוהה נמוכה עמוקה מבריק רועשת חשוכה בהירה טעימה בריאה ' +
      'ראשון שלישי רביעי חמישי שביעי שמיני עשירי אחרון שתיים שמונה עשרים שישים שבעים תשעים שירים גיטרה תופים פסנתר כינור סרטים ' +
      'תמונה מסיבה מתנות חנוכה פורים סוכות מגילה אלופה תחרות ספורט שחייה קפיצה קלפים חידות מחבוא תופסת נדנדה מגלשה מדורה יהלום ' +
      'נחושת קרטון כותנה מדינה שכונה קניון מעיין חללית מטאור תקווה דמיון רעיון הפתעה סיפור קסמים כישוף דרקון ענקים גמדים מכשפה ' +
      'רובוט חייזר גיבור סודות צחקוק נשיקה חיבוק בבקשה סליחה חשבון עברית ספרות תשובה תרגיל חיבור חיסור מילים מילון מרפסת מדרגה ' +
      'מעלית ארובה וילון כורסה עריסה מקלחת כביסה מכונה מנעול פעמון מקלדת רמקול סוללה כרטיס דרכון נסיעה מסלול מנהרה צוללת מעטפה ' +
      'חבילה סלסלה קופסה צנצנת אתמול עכשיו מוקדם מאוחר בקרוב עיתון מגזין הודעה מכשיר דובון גולות רכבות מגרפה אימון קבוצה נקודה ' +
      'שריקה מסננת משאלה מדבקה תרמיל מנהיג כוכבת ספגטי מיונז פומלה קישוא איילה שבלול מצודה הצלחה בדיחה חידון משימה תעודה מערכת ' +
      'חוברת דפדפת מנהלת רכיבה הליכה צלילה טיפוס זריקה בעיטה מסירה ניקוד חמסין טפטוף קרסול מונית קטנוע דוגית כרכרה ממלכה מפלצת ' +
      'קוסמת פיראט מחשבה'
    ).split(' '),
    en: (
      'about above actor adult after again agree alarm album alien alive angel angry ankle apple apron arena arrow award awake ' +
      'badge bagel baker beach beard beast bench berry birth black blank blast blaze blend blink block bloom board bonus brain ' +
      'brave bread break brick bride bring broom brown brush build bunch bunny cabin cable camel candy canoe cargo carry catch ' +
      'chain chair chalk charm chart chase cheer chess chest chick chief child choir class clean clear click cliff climb clock ' +
      'close cloth cloud clown coach coast cocoa comet comic coral couch count court cover craft crane crash crawl cream creek ' +
      'crisp crown crumb curly curve cycle daily daisy dance dizzy donut dough dozen draft drain drama dream dress dried drink ' +
      'drive eager eagle early earth eight elbow empty enjoy enter equal extra fable fairy fancy feast fence ferry field fifty ' +
      'final first flame flash float flock flood floor flour fluff flute focus foggy force forty found frame fresh frost fruit ' +
      'funny fuzzy ghost giant given glass glide globe glove grade grain grand grape grass great green greet grill group grove ' +
      'grown guard guess guest guide habit happy hatch heart heavy hedge hello hippo hobby honey horse hotel house human humor ' +
      'hurry igloo image jelly jewel juice juicy jumbo kayak kitty knock koala label laugh layer learn lemon level light lilac ' +
      'lucky lunch magic mango maple march match maybe mayor medal melon merry metal meter mixer model money month moose motor ' +
      'mouse mouth movie muddy music never night noble noise north novel nurse ocean offer olive onion opera orbit order otter ' +
      'owner paint panda paper party pasta peace peach pearl pedal penny piano piece pilot pizza place plane plant plate point ' +
      'polar porch power press price pride prize proud puppy quack queen quick quiet quilt racer radio rainy raise ranch raven ' +
      'reach ready relax rhyme rider right river roast robin robot rocky round route royal ruler salad sandy sauce scale scarf ' +
      'scene scoop score scout seven shade shake shape share shark sharp sheep shell shine shiny shirt shore short shout silly ' +
      'sixty skate skirt sleep slide slope smart smell smile snack snail snake snowy solar solid sound south space spark speak ' +
      'speed spell spice spicy spoon sport stack stage stair stamp stand start steam stick still stone stool store storm story ' +
      'stove straw study sugar sunny super sweet swing table taste teach teddy teeth thank thick thing think third three throw ' +
      'thumb tiger tired toast today tooth torch total touch tower towel track trail train treat trick truck trunk truth tulip ' +
      'uncle under until upper value video visit voice wagon watch water whale wheat wheel white whole windy world write young ' +
      'yummy zebra birds boats books boots cards coins dolls drums ducks frogs gifts goats kites lions nests pools roses seeds ships ' +
      'shoes socks stars trees twins waves wings words'
    ).split(' '),
  };
  const LIST = { he: WORDS.he.map(w => norm('he', w)), en: WORDS.en.map(w => norm('en', w)) };
  // typing Hebrew on a keyboard set to English: the standard Israeli layout
  const HE_CODE = { KeyE: 'ק', KeyR: 'ר', KeyT: 'א', KeyY: 'ט', KeyU: 'ו', KeyI: 'ן', KeyO: 'ם', KeyP: 'פ', KeyA: 'ש', KeyS: 'ד', KeyD: 'ג', KeyF: 'כ', KeyG: 'ע', KeyH: 'י', KeyJ: 'ח', KeyK: 'ל', KeyL: 'ך', Semicolon: 'ף', KeyZ: 'ז', KeyX: 'ס', KeyC: 'ב', KeyV: 'ה', KeyB: 'נ', KeyN: 'מ', KeyM: 'צ', Comma: 'ת', Period: 'ץ' };
  const KB = { he: ['קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'], en: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] };
  const COL = { g: ['#2fc25b', '#1c8a3e'], y: ['#f2b01e', '#b37a08'], x: ['#56607a', '#3a4258'] };
  const RANK = { x: 1, y: 2, g: 3 };

  // green first, then yellow — a letter counts only as many times as it is in the answer
  function score(guess, ans) {
    const res = ['x', 'x', 'x', 'x', 'x'], left = {};
    for (let i = 0; i < 5; i++) { if (guess[i] === ans[i]) res[i] = 'g'; else left[ans[i]] = (left[ans[i]] || 0) + 1; }
    for (let i = 0; i < 5; i++) if (res[i] !== 'g' && left[guess[i]] > 0) { res[i] = 'y'; left[guess[i]]--; }
    return res;
  }
  // the word of the day: the same for everyone on the same date (days since 1 Jan 2026, through a fixed shuffle)
  const seeded = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const EPOCH = Date.UTC(2026, 0, 1);
  const dayNum = d => { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5); };
  const PERM = {};
  function perm(wl) {
    if (!PERM[wl]) { const n = LIST[wl].length, a = []; for (let i = 0; i < n; i++) a.push(i); const R = seeded(wl === 'he' ? 5786 : 2026); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } PERM[wl] = a; }
    return PERM[wl];
  }
  const dailyWord = (wl, day) => { const n = LIST[wl].length; return LIST[wl][perm(wl)[((day % n) + n) % n]]; };
  const untilMidnight = () => { const d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return Math.max(0, m - d); };
  const hms = ms => { const s = Math.floor(ms / 1000), p = n => (n < 10 ? '0' : '') + n; return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60); };

  // statistics, per word language and mode
  const freshSt = () => ({ played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], lastWin: -99 });
  function loadSt(g, wl, mode) {
    const d = g.load('st_' + wl + '_' + mode, null), s = freshSt();
    if (d && typeof d === 'object') {
      for (const k of ['played', 'wins', 'streak', 'max', 'lastWin']) if (Number.isFinite(+d[k])) s[k] = Math.floor(+d[k]);
      if (Array.isArray(d.dist)) for (let i = 0; i < 6; i++) s.dist[i] = Math.max(0, Math.floor(+d.dist[i]) || 0);
    }
    return s;
  }
  const curStreak = (S) => (S.mode === 'daily' && S.st.lastWin < S.day - 1 ? 0 : S.st.streak);

  // layout: landscape 960×600 with side cards, portrait 600×1000 on phones
  function layout(W, H) {
    const P = H > W, L = { P, W, H };
    if (!P) { L.tile = 56; L.gap = 8; L.gy = 58; L.kb = { x: 180, y: 448, w: 600, kh: 44, gap: 6 }; }
    else { L.tile = 80; L.gap = 10; L.gy = 112; L.kb = { x: 8, y: 718, w: 584, kh: 72, gap: 8 }; }
    L.gw = 5 * L.tile + 4 * L.gap; L.gh = 6 * L.tile + 5 * L.gap; L.gx = (W - L.gw) / 2;
    return L;
  }
  function kbKeys(L, wl) {
    const rows = KB[wl], K = L.kb, out = [];
    const unit = Math.min(...rows.map((r, i) => { const n = r.length + (i === 2 ? 2 : 0); return (K.w - (n - 1) * K.gap) / (r.length + (i === 2 ? 3 : 0)); }));
    rows.forEach((r, i) => {
      const keys = [...r].map(c => ({ k: c, u: 1 }));
      if (i === 2) { keys.unshift({ k: 'ENTER', u: 1.5 }); keys.push({ k: 'BACK', u: 1.5 }); }
      const tw = keys.reduce((a, k) => a + k.u * unit, 0) + (keys.length - 1) * K.gap;
      let x = K.x + (K.w - tw) / 2;
      const y = K.y + i * (K.kh + K.gap);
      for (const k of keys) { out.push({ k: k.k, x, y, w: k.u * unit, h: K.kh }); x += k.u * unit + K.gap; }
    });
    return out;
  }

  // ---------- texts ----------
  const TEXT = {
    he: {
      title: 'מילה ביום',
      help: ['נחש מילה בת 5 אותיות ב-6 ניסיונות', 'ירוק — האות במקום הנכון · צהוב — במילה, אבל במקום אחר · אפור — לא במילה', 'הקלד במקלדת או לחץ על המקשים, ו-Enter כדי לבדוק', 'מילה יומית אחת לכולם, ותרגול בלי הגבלה'],
      helpTouch: ['נחש מילה בת 5 אותיות ב-6 ניסיונות', 'ירוק — האות במקום הנכון · צהוב — במילה, אבל במקום אחר · אפור — לא במילה', 'גע במקשים כדי לכתוב, ובמקש ↵ כדי לבדוק', 'מילה יומית אחת לכולם, ותרגול בלי הגבלה'],
      modeDaily: 'מילה ביום', modePractice: 'תרגול', difficulty: 'שפת המילים', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — השהיה',
      notEnough: 'אין מספיק אותיות', praise: 'גאוני!|מדהים!|מרשים!|נהדר!|יפה מאוד!|בשנייה האחרונה!', lostT: 'לא הפעם…', theWord: 'המילה הייתה',
      played: 'משחקים', winPct: '% ניצחונות', streak: 'רצף', maxStreak: 'רצף שיא', dist: 'כמה ניסיונות לקח', nextIn: 'המילה הבאה בעוד {t}',
      practiceBtn: '▶ תרגול', newWord: '↻ מילה חדשה', dayNo: 'מילה #{n}', statsT: 'סטטיסטיקה', lgG: 'במקום הנכון', lgY: 'במקום אחר', lgX: 'לא במילה', guessN: 'ניסיון {n} מתוך 6',
    },
    en: {
      title: 'Word of the Day',
      help: ['Guess the 5-letter word in 6 tries', 'Green — right spot · Yellow — in the word, wrong spot · Grey — not in the word', 'Type on your keyboard or click the keys, Enter to check', 'One daily word for everyone, plus unlimited practice'],
      helpTouch: ['Guess the 5-letter word in 6 tries', 'Green — right spot · Yellow — in the word, wrong spot · Grey — not in the word', 'Tap the keys to type and ↵ to check', 'One daily word for everyone, plus unlimited practice'],
      modeDaily: 'Daily word', modePractice: 'Practice', difficulty: 'Word language', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — pause',
      notEnough: 'Not enough letters', praise: 'Genius!|Magnificent!|Impressive!|Splendid!|Great!|Phew!', lostT: 'Not this time…', theWord: 'The word was',
      played: 'Played', winPct: 'Win %', streak: 'Streak', maxStreak: 'Best streak', dist: 'Guess distribution', nextIn: 'Next word in {t}',
      practiceBtn: '▶ Practice', newWord: '↻ New word', dayNo: 'Word #{n}', statsT: 'Statistics', lgG: 'Right spot', lgY: 'Wrong spot', lgX: 'Not in word', guessN: 'Guess {n} of 6',
    },
    ar: {
      title: 'كلمة اليوم',
      help: ['خمّن الكلمة المكوّنة من 5 أحرف في 6 محاولات', 'أخضر — في المكان الصحيح · أصفر — في الكلمة بمكان آخر · رمادي — ليس في الكلمة', 'اكتب بلوحة المفاتيح أو انقر على الأزرار، وEnter للتحقق', 'كلمة يومية واحدة للجميع، وتدريب بلا حدود'],
      helpTouch: ['خمّن الكلمة المكوّنة من 5 أحرف في 6 محاولات', 'أخضر — في المكان الصحيح · أصفر — في الكلمة بمكان آخر · رمادي — ليس في الكلمة', 'المس الأزرار للكتابة و↵ للتحقق', 'كلمة يومية واحدة للجميع، وتدريب بلا حدود'],
      modeDaily: 'كلمة اليوم', modePractice: 'تدريب', difficulty: 'لغة الكلمات', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — إيقاف مؤقت',
      notEnough: 'لا توجد أحرف كافية', praise: 'عبقري!|رائع!|مذهل!|ممتاز!|أحسنت!|في اللحظة الأخيرة!', lostT: 'ليس هذه المرة…', theWord: 'الكلمة كانت',
      played: 'لُعبت', winPct: '% الفوز', streak: 'سلسلة', maxStreak: 'أطول سلسلة', dist: 'توزيع المحاولات', nextIn: 'الكلمة التالية بعد {t}',
      practiceBtn: '▶ تدريب', newWord: '↻ كلمة جديدة', dayNo: 'الكلمة #{n}', statsT: 'الإحصائيات', lgG: 'المكان الصحيح', lgY: 'مكان آخر', lgX: 'ليست في الكلمة', guessN: 'المحاولة {n} من 6',
    },
    es: {
      title: 'Palabra del día',
      help: ['Adivina la palabra de 5 letras en 6 intentos', 'Verde: en su sitio · Amarillo: está, pero en otro sitio · Gris: no está', 'Escribe con el teclado o pulsa las teclas, y Enter para comprobar', 'Una palabra diaria para todos y práctica sin límite'],
      helpTouch: ['Adivina la palabra de 5 letras en 6 intentos', 'Verde: en su sitio · Amarillo: está, pero en otro sitio · Gris: no está', 'Toca las teclas para escribir y ↵ para comprobar', 'Una palabra diaria para todos y práctica sin límite'],
      modeDaily: 'Palabra diaria', modePractice: 'Práctica', difficulty: 'Idioma de las palabras', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — pausa',
      notEnough: 'Faltan letras', praise: '¡Genial!|¡Magnífico!|¡Impresionante!|¡Espléndido!|¡Muy bien!|¡Por los pelos!', lostT: 'Esta vez no…', theWord: 'La palabra era',
      played: 'Jugadas', winPct: '% victorias', streak: 'Racha', maxStreak: 'Mejor racha', dist: 'Distribución de intentos', nextIn: 'Siguiente palabra en {t}',
      practiceBtn: '▶ Práctica', newWord: '↻ Palabra nueva', dayNo: 'Palabra #{n}', statsT: 'Estadísticas', lgG: 'En su sitio', lgY: 'Otro sitio', lgX: 'No está', guessN: 'Intento {n} de 6',
    },
    fr: {
      title: 'Mot du jour',
      help: ['Devine le mot de 5 lettres en 6 essais', 'Vert : bien placée · Jaune : dans le mot, mal placée · Gris : absente', 'Tape au clavier ou clique sur les touches, et Entrée pour valider', 'Un mot du jour pour tout le monde, et un entraînement illimité'],
      helpTouch: ['Devine le mot de 5 lettres en 6 essais', 'Vert : bien placée · Jaune : dans le mot, mal placée · Gris : absente', 'Touche les lettres pour écrire et ↵ pour valider', 'Un mot du jour pour tout le monde, et un entraînement illimité'],
      modeDaily: 'Mot du jour', modePractice: 'Entraînement', difficulty: 'Langue des mots', wlHe: 'עברית', wlEn: 'English', keysHint: 'Échap — pause',
      notEnough: 'Pas assez de lettres', praise: 'Génial !|Magnifique !|Impressionnant !|Splendide !|Très bien !|Ouf !', lostT: 'Pas cette fois…', theWord: 'Le mot était',
      played: 'Parties', winPct: '% victoires', streak: 'Série', maxStreak: 'Meilleure série', dist: 'Répartition des essais', nextIn: 'Prochain mot dans {t}',
      practiceBtn: '▶ Entraînement', newWord: '↻ Nouveau mot', dayNo: 'Mot n° {n}', statsT: 'Statistiques', lgG: 'Bien placée', lgY: 'Mal placée', lgX: 'Absente', guessN: 'Essai {n} sur 6',
    },
    pt: {
      title: 'Palavra do dia',
      help: ['Adivinhe a palavra de 5 letras em 6 tentativas', 'Verde: lugar certo · Amarelo: está na palavra, em outro lugar · Cinza: não está', 'Digite no teclado ou clique nas teclas, e Enter para conferir', 'Uma palavra diária para todos e treino sem limite'],
      helpTouch: ['Adivinhe a palavra de 5 letras em 6 tentativas', 'Verde: lugar certo · Amarelo: está na palavra, em outro lugar · Cinza: não está', 'Toque nas teclas para escrever e ↵ para conferir', 'Uma palavra diária para todos e treino sem limite'],
      modeDaily: 'Palavra diária', modePractice: 'Treino', difficulty: 'Idioma das palavras', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — pausa',
      notEnough: 'Faltam letras', praise: 'Genial!|Magnífico!|Impressionante!|Esplêndido!|Muito bem!|Ufa!', lostT: 'Não foi desta vez…', theWord: 'A palavra era',
      played: 'Jogos', winPct: '% vitórias', streak: 'Sequência', maxStreak: 'Melhor sequência', dist: 'Distribuição de tentativas', nextIn: 'Próxima palavra em {t}',
      practiceBtn: '▶ Treino', newWord: '↻ Nova palavra', dayNo: 'Palavra #{n}', statsT: 'Estatísticas', lgG: 'Lugar certo', lgY: 'Outro lugar', lgX: 'Não está', guessN: 'Tentativa {n} de 6',
    },
    ru: {
      title: 'Слово дня',
      help: ['Угадай слово из 5 букв за 6 попыток', 'Зелёный — буква на месте · Жёлтый — есть в слове, но не здесь · Серый — нет в слове', 'Печатай на клавиатуре или нажимай кнопки, Enter — проверить', 'Одно слово дня для всех и тренировка без ограничений'],
      helpTouch: ['Угадай слово из 5 букв за 6 попыток', 'Зелёный — буква на месте · Жёлтый — есть в слове, но не здесь · Серый — нет в слове', 'Нажимай кнопки, чтобы писать, и ↵, чтобы проверить', 'Одно слово дня для всех и тренировка без ограничений'],
      modeDaily: 'Слово дня', modePractice: 'Тренировка', difficulty: 'Язык слов', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — пауза',
      notEnough: 'Мало букв', praise: 'Гениально!|Великолепно!|Впечатляет!|Отлично!|Хорошо!|Фух!', lostT: 'В этот раз нет…', theWord: 'Загаданное слово',
      played: 'Сыграно', winPct: '% побед', streak: 'Серия', maxStreak: 'Лучшая серия', dist: 'Распределение попыток', nextIn: 'Следующее слово через {t}',
      practiceBtn: '▶ Тренировка', newWord: '↻ Новое слово', dayNo: 'Слово № {n}', statsT: 'Статистика', lgG: 'На месте', lgY: 'Не на месте', lgX: 'Нет в слове', guessN: 'Попытка {n} из 6',
    },
    de: {
      title: 'Wort des Tages',
      help: ['Errate das Wort mit 5 Buchstaben in 6 Versuchen', 'Grün: richtige Stelle · Gelb: im Wort, falsche Stelle · Grau: nicht im Wort', 'Tippe auf der Tastatur oder klicke die Tasten, Enter zum Prüfen', 'Ein Tageswort für alle und Üben ohne Ende'],
      helpTouch: ['Errate das Wort mit 5 Buchstaben in 6 Versuchen', 'Grün: richtige Stelle · Gelb: im Wort, falsche Stelle · Grau: nicht im Wort', 'Tippe die Tasten zum Schreiben und ↵ zum Prüfen', 'Ein Tageswort für alle und Üben ohne Ende'],
      modeDaily: 'Tageswort', modePractice: 'Üben', difficulty: 'Sprache der Wörter', wlHe: 'עברית', wlEn: 'English', keysHint: 'Esc — Pause',
      notEnough: 'Zu wenige Buchstaben', praise: 'Genial!|Großartig!|Beeindruckend!|Prima!|Gut gemacht!|Puh!', lostT: 'Diesmal nicht…', theWord: 'Das Wort war',
      played: 'Gespielt', winPct: '% Siege', streak: 'Serie', maxStreak: 'Beste Serie', dist: 'Versuchsverteilung', nextIn: 'Nächstes Wort in {t}',
      practiceBtn: '▶ Üben', newWord: '↻ Neues Wort', dayNo: 'Wort #{n}', statsT: 'Statistik', lgG: 'Richtig', lgY: 'Falsche Stelle', lgX: 'Nicht im Wort', guessN: 'Versuch {n} von 6',
    },
  };

  // ---------- drawing ----------
  function makeBg(W, H, wl) {
    const R = seeded(wl === 'he' ? 11 : 12), a = [], abc = ABC[wl], cols = ['#2fc25b', '#f2b01e', '#8f95c9', '#ffffff'];
    for (let i = 0; i < 24; i++) a.push({ x: R() * W, y: R() * H, s: 26 + R() * 40, r: (R() - 0.5) * 0.8, v: 6 + R() * 12, ch: abc[Math.floor(R() * abc.length)], c: cols[i % 4], a: 0.06 + R() * 0.08 });
    return a;
  }
  function drawBg(g, ctx, W, H, bg, t, L) {
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#1a1644'); gr.addColorStop(0.55, '#2a1d5c'); gr.addColorStop(1, '#3a1f62');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (L) { const cx = W / 2, cy = L.gy + L.gh / 2, rg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(L.gw, L.gh) * 0.9); rg.addColorStop(0, 'rgba(140,110,255,.28)'); rg.addColorStop(1, 'rgba(140,110,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
    for (const b of bg) {
      const y = ((b.y - t * b.v) % (H + 80) + H + 80) % (H + 80) - 40;
      ctx.save(); ctx.translate(b.x, y); ctx.rotate(b.r + Math.sin(t * 0.3 + b.x) * 0.1); ctx.globalAlpha = b.a;
      g.rr(ctx, -b.s / 2, -b.s / 2, b.s, b.s, b.s * 0.18); ctx.fillStyle = b.c; ctx.fill();
      g.text(ctx, b.ch, 0, 1, { size: b.s * 0.55, weight: 900, color: '#1a1644' });
      ctx.restore();
    }
  }
  function tile(g, ctx, x, y, s, ch, st, o) {
    o = o || {};
    const r = s * 0.16;
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2 + (o.dy || 0)); ctx.scale(o.sc || 1, (o.sc || 1) * (o.sy != null ? o.sy : 1)); ctx.translate(-s / 2, -s / 2);
    if (COL[st]) {
      const c = COL[st];
      g.rr(ctx, 0, 4, s, s - 3, r); ctx.fillStyle = c[1]; ctx.fill();
      g.rr(ctx, 0, 0, s, s - 3, r);
      const gr = ctx.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, g.shade(c[0], 0.14)); gr.addColorStop(1, c[0]);
      ctx.fillStyle = gr; ctx.fill();
      g.rr(ctx, s * 0.1, s * 0.07, s * 0.8, s * 0.22, s * 0.1); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
    } else {
      g.rr(ctx, 1, 1, s - 2, s - 2, r);
      ctx.fillStyle = st === 't' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.045)'; ctx.fill();
      ctx.strokeStyle = st === 't' ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)'; ctx.lineWidth = st === 't' ? 2.6 : 2; ctx.stroke();
    }
    if (ch) g.text(ctx, ch, s / 2, s / 2 + (COL[st] ? -1 : 1), { size: s * 0.56, weight: 900, color: '#fff', shadow: COL[st] ? 'rgba(0,0,0,.3)' : false, blur: 3 });
    ctx.restore();
  }
  function drawGrid(g, ctx, S) {
    const L = S.L, t = S.t;
    for (let r = 0; r < 6; r++) {
      let dx = 0;
      if (r === S.rows.length && t - S.shake < 0.45) dx = Math.sin((t - S.shake) * 50) * 9 * (1 - (t - S.shake) / 0.45);
      for (let i = 0; i < 5; i++) {
        const col = S.wl === 'he' ? 4 - i : i, x = L.gx + col * (L.tile + L.gap) + dx, y = L.gy + r * (L.tile + L.gap);
        let ch = '', st = '';
        const o = {};
        if (r < S.rows.length) {
          ch = shown(S.wl, S.rows[r][i], i); st = S.marks[r][i];
          if (r === S.revRow) { const u = (t - S.revT - i * 0.28) / 0.34; if (u < 0) st = 't'; else if (u < 1) { o.sy = Math.max(0.02, Math.abs(Math.cos(Math.PI * u))); if (u < 0.5) st = 't'; } }
          if (S.won && r === S.rows.length - 1 && S.bounceT > 0) { const u = (t - S.bounceT - i * 0.09) / 0.42; if (u > 0 && u < 1) o.dy = -Math.sin(Math.PI * u) * L.tile * 0.35; }
        } else if (r === S.rows.length && !S.done && i < S.typed.length) {
          ch = shown(S.wl, S.typed[i], i); st = 't';
          const u = (t - S.pop[i]) / 0.12; if (u < 1) o.sc = 1 + 0.12 * Math.sin(Math.PI * u);
        }
        tile(g, ctx, x, y, L.tile, ch, st, o);
      }
    }
  }
  function enterIcon(ctx, x, y, s) {
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = s * 0.13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 0.4); ctx.lineTo(x + s * 0.45, y + s * 0.1); ctx.lineTo(x - s * 0.3, y + s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s * 0.1); ctx.lineTo(x - s * 0.18, y - s * 0.17); ctx.lineTo(x - s * 0.18, y + s * 0.37); ctx.closePath(); ctx.fill();
  }
  function backIcon(ctx, x, y, s) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.11; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.55, y); ctx.lineTo(x - s * 0.22, y - s * 0.32); ctx.lineTo(x + s * 0.55, y - s * 0.32); ctx.lineTo(x + s * 0.55, y + s * 0.32); ctx.lineTo(x - s * 0.22, y + s * 0.32); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 0.02 * s, y - s * 0.14); ctx.lineTo(x + s * 0.28, y + s * 0.14); ctx.moveTo(x + s * 0.28, y - s * 0.14); ctx.lineTo(x - 0.02 * s, y + s * 0.14); ctx.stroke();
  }
  function drawKb(g, ctx, S) {
    for (const k of S.kb) {
      const n = k.k.length === 1 ? norm(S.wl, k.k) : k.k, st = k.k.length === 1 ? S.keys[n] : null, c = st ? COL[st] : ['#7a7fc0', '#4d518a'];
      const down = S.press[n] != null && S.t - S.press[n] < 0.13, hov = S.hover === k.k && !down, y = k.y + (down ? 2 : 0);
      g.rr(ctx, k.x, k.y + 3, k.w, k.h - 2, 8); ctx.fillStyle = c[1]; ctx.fill();
      g.rr(ctx, k.x, y, k.w, k.h - 3, 8);
      const gr = ctx.createLinearGradient(0, y, 0, y + k.h); gr.addColorStop(0, g.shade(c[0], hov ? 0.28 : 0.12)); gr.addColorStop(1, c[0]);
      ctx.fillStyle = gr; ctx.fill();
      const cx = k.x + k.w / 2, cy = y + (k.h - 3) / 2;
      if (k.k === 'ENTER') enterIcon(ctx, cx, cy, k.h * 0.42);
      else if (k.k === 'BACK') backIcon(ctx, cx, cy, k.h * 0.42);
      else g.text(ctx, k.k, cx, cy + 1, { size: k.h * (S.wl === 'he' ? 0.5 : 0.44), weight: 800, color: '#fff' });
    }
  }
  function flame(g, ctx, x, y, s, t) {
    const w = Math.sin(t * 6) * s * 0.04;
    ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.55 + w); ctx.bezierCurveTo(x + s * 0.45, y - s * 0.1, x + s * 0.38, y + s * 0.45, x, y + s * 0.45); ctx.bezierCurveTo(x - s * 0.38, y + s * 0.45, x - s * 0.45, y - s * 0.05, x - s * 0.1, y - s * 0.3); ctx.quadraticCurveTo(x - s * 0.05, y - s * 0.05, x + s * 0.05, y - s * 0.12); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.35, x, y - s * 0.55 + w); ctx.fill();
    ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.05 - w); ctx.bezierCurveTo(x + s * 0.22, y + s * 0.15, x + s * 0.18, y + s * 0.4, x, y + s * 0.4); ctx.bezierCurveTo(x - s * 0.18, y + s * 0.4, x - s * 0.22, y + s * 0.18, x, y - s * 0.05 - w); ctx.fill();
  }
  function card(g, ctx, R) {
    g.rr(ctx, R.x, R.y + 4, R.w, R.h, 18); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    g.rr(ctx, R.x, R.y, R.w, R.h, 18); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawSide(g, ctx, S) {
    const L = S.L, t = S.t, streak = curStreak(S), al = g.rtl ? 'right' : 'left';
    const n = Math.min(6, S.rows.length + (S.done ? 0 : 1)), title = S.mode === 'daily' ? g.t('dayNo', { n: S.day + 1 }) : g.t('modePractice');
    if (L.P) {   // phones: one header line
      g.rr(ctx, 16, 14, L.W - 32, 84, 20); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      const a = g.rtl ? L.W - 38 : 38, b = g.rtl ? 66 : L.W - 66;
      g.text(ctx, title, a, 42, { size: 30, color: '#ffd84d', align: al, maxW: L.W * 0.56 });
      g.text(ctx, g.t('guessN', { n }), a, 76, { size: 20, weight: 700, color: '#c9c7f0', align: al, maxW: L.W * 0.56 });
      flame(g, ctx, b, 54, 46, t);
      g.text(ctx, String(streak), b + (g.rtl ? 36 : -36), 57, { size: 38, color: '#fff', align: g.rtl ? 'left' : 'right' });
      return;
    }
    const A = { x: 22, y: L.gy, w: 238, h: L.gh }, B = { x: L.W - 260, y: L.gy, w: 238, h: L.gh }, [P1, P2] = g.rtl ? [B, A] : [A, B];
    card(g, ctx, P1);
    const cx = P1.x + P1.w / 2;
    g.text(ctx, title, cx, P1.y + 32, { size: 23, color: '#ffd84d', maxW: P1.w - 24 });
    g.text(ctx, g.t('guessN', { n }), cx, P1.y + 60, { size: 15, weight: 700, color: '#c9c7f0', maxW: P1.w - 24 });
    flame(g, ctx, cx - 30, P1.y + 122, 58, t);
    g.text(ctx, String(streak), cx + 22, P1.y + 124, { size: 44, color: '#fff' });
    g.text(ctx, g.t('streak'), cx, P1.y + 172, { size: 15, weight: 700, color: '#c9c7f0', maxW: P1.w - 24 });
    [['g', 'lgG'], ['y', 'lgY'], ['x', 'lgX']].forEach(([m, k], i) => {
      const y = P1.y + 214 + i * 50, tx = g.rtl ? P1.x + P1.w - 22 - 38 : P1.x + 22;
      tile(g, ctx, tx, y, 38, S.wl === 'he' ? 'א' : 'A', m, {});
      g.text(ctx, g.t(k), g.rtl ? tx - 12 : tx + 50, y + 19, { size: 15, weight: 700, color: '#e6e4ff', align: al, maxW: P1.w - 84 });
    });
    card(g, ctx, P2);
    const st = S.st, cx2 = P2.x + P2.w / 2, pct = st.played ? Math.round(st.wins * 100 / st.played) : 0;
    g.text(ctx, g.t('statsT'), cx2, P2.y + 32, { size: 21, color: '#ffd84d', maxW: P2.w - 24 });
    [[st.played, 'played'], [pct, 'winPct'], [st.max, 'maxStreak']].forEach(([v, k], i) => {
      const x = g.rtl ? P2.x + P2.w - 42 - i * 77 : P2.x + 42 + i * 77;
      g.text(ctx, String(v), x, P2.y + 74, { size: 26, color: '#fff' });
      g.text(ctx, g.t(k), x, P2.y + 100, { size: 11, weight: 700, color: '#c9c7f0', maxW: 74 });
    });
    const mx = Math.max(1, ...st.dist), bx = P2.x + 40, bw = P2.w - 66;
    st.dist.forEach((v, i) => {
      const y = P2.y + 132 + i * 38, w = Math.max(22, v / mx * bw), x0 = g.rtl ? P2.x + P2.w - 40 : bx;
      g.text(ctx, String(i + 1), g.rtl ? P2.x + P2.w - 24 : P2.x + 24, y + 13, { size: 15, color: '#c9c7f0' });
      g.rr(ctx, g.rtl ? x0 - w : x0, y, w, 26, 6); ctx.fillStyle = S.done && S.won && i === S.rows.length - 1 ? COL.g[0] : 'rgba(255,255,255,.16)'; ctx.fill();
      g.text(ctx, String(v), g.rtl ? x0 - w + 12 : x0 + w - 12, y + 14, { size: 13, color: '#fff' });
    });
  }

  // ---------- typing and checking ----------
  function addLetter(g, S, ch) {
    if (S.done || S.busy || S.demo || S.typed.length >= 5) return;
    S.typed.push(ch); S.pop[S.typed.length - 1] = S.t;
    g.sfx('tick', { p: 0.85 + 0.07 * S.typed.length });
  }
  function delLetter(g, S) { if (S.done || S.busy || !S.typed.length) return; S.typed.pop(); g.sfx('click', { p: 0.7 }); }
  function submit(g, S) {
    if (S.done || S.busy || S.demo) return;
    if (S.typed.length < 5) { S.shake = S.t; g.msg(g.t('notEnough'), 1000, '#ffd0c4'); g.sfx('error'); return; }
    const guess = S.typed.join(''), m = score(guess, S.answer);
    S.rows.push(guess); S.marks.push(m); S.typed = []; S.busy = true; S.revT = S.t; S.revRow = S.rows.length - 1;
    m.forEach((c, i) => g.after(i * 0.28 + 0.17, () => g.tone({ f: c === 'g' ? 620 + i * 60 : c === 'y' ? 520 : 260, dur: 0.12, type: 'triangle', vol: c === 'x' ? 0.08 : 0.13 })));
    g.after(5 * 0.28 + 0.3, () => afterReveal(g, S));
    if (S.mode === 'daily') saveDay(g, S);
  }
  function paintKeys(S, row, m) { for (let i = 0; i < 5; i++) { const c = row[i]; if (!S.keys[c] || RANK[m[i]] > RANK[S.keys[c]]) S.keys[c] = m[i]; } }
  function afterReveal(g, S) {
    if (g.s !== S) return;
    S.busy = false;
    const r = S.rows.length - 1, won = S.marks[r].every(c => c === 'g');
    paintKeys(S, S.rows[r], S.marks[r]);
    if (!won && S.rows.length < 6) return;
    S.done = true; S.won = won;
    record(g, S); if (S.mode === 'daily') saveDay(g, S);
    const L = S.L;
    if (won) {
      S.bounceT = S.t;
      g.msg(String(g.t('praise')).split('|')[S.rows.length - 1], 1500, '#8dffa8');
      g.sfx('power');
      for (let k = 0; k < 3; k++) g.after(0.25 + k * 0.22, () => g.burst(L.gx + L.gw * (0.2 + 0.3 * k), L.gy + r * (L.tile + L.gap), { n: 34, color: ['#2fc25b', '#f2b01e', '#ffffff', '#8f7bff'], speed: 6, life: 60, gravity: 0.12 }));
    } else g.msg(g.t('theWord') + ': ' + [...S.answer].map((c, i) => shown(S.wl, c, i)).join(''), 2400, '#ffd0c4');
    g.after(won ? 1.8 : 2.4, () => endRound(g, S, won ? 'win' : 'lose'));
  }
  function record(g, S) {
    if (S.recorded) return;
    S.recorded = true;
    const st = S.st;
    st.played++;
    if (S.won) { st.wins++; st.dist[S.rows.length - 1]++; st.streak = S.mode === 'daily' && st.lastWin !== S.day - 1 && st.lastWin !== S.day ? 1 : st.streak + 1; st.lastWin = S.day; }
    else st.streak = 0;
    st.max = Math.max(st.max, st.streak);
    g.save('st_' + S.wl + '_' + S.mode, st);
  }
  const saveDay = (g, S) => g.save('day_' + S.wl, { day: S.day, ans: S.answer, rows: S.rows, done: S.done, won: S.won, rec: !!S.recorded });
  function endRound(g, S, sound) {
    if (g.s !== S || g.state !== 'play') return;
    g.end({ result: S.won ? 'win' : 'lose', score: null, delay: 1e9, sound });
    showEnd(g, S);
  }
  function showEnd(g, S) {
    S.endShown = true;
    const st = S.st, n = S.rows.length, wl = S.wl;
    const css = (e, s) => { e.style.cssText = s; return e; };
    g.panel(c => {
      c.appendChild(g.el('h2', '', S.won ? String(g.t('praise')).split('|')[n - 1] : g.t('lostT')));
      if (!S.won) c.appendChild(g.el('p', '', g.t('theWord')));
      const word = css(g.el('div'), 'display:flex;gap:6px;justify-content:center;margin:8px 0 12px;direction:' + (wl === 'he' ? 'rtl' : 'ltr'));
      for (let i = 0; i < 5; i++) word.appendChild(css(g.el('div', '', shown(wl, S.answer[i], i)), 'width:46px;height:46px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff;background:' + (S.won ? COL.g[0] : '#5a6380') + ';box-shadow:0 4px 0 ' + (S.won ? COL.g[1] : '#3a4258')));
      c.appendChild(word);
      const nums = css(g.el('div'), 'display:flex;justify-content:center;gap:10px;margin:2px 0 8px');
      for (const [v, k] of [[st.played, 'played'], [st.played ? Math.round(st.wins * 100 / st.played) : 0, 'winPct'], [curStreak(S), 'streak'], [st.max, 'maxStreak']]) {
        const box = css(g.el('div'), 'min-width:70px;max-width:96px');
        box.appendChild(css(g.el('div', '', String(v)), 'font-size:30px;font-weight:900;line-height:1.1'));
        box.appendChild(css(g.el('div', '', g.t(k)), 'font-size:12px;opacity:.75;line-height:1.2'));
        nums.appendChild(box);
      }
      c.appendChild(nums);
      c.appendChild(g.el('div', 'g2d-lbl', g.t('dist')));
      const dist = css(g.el('div'), 'margin:6px auto 4px;max-width:340px');
      const mx = Math.max(1, ...st.dist);
      st.dist.forEach((v, i) => {
        const row = css(g.el('div'), 'display:flex;align-items:center;gap:6px;margin:3px 0');
        row.appendChild(css(g.el('span', '', String(i + 1)), 'width:14px;font-weight:800;font-size:14px'));
        row.appendChild(css(g.el('span', '', String(v)), 'display:inline-block;box-sizing:border-box;min-width:24px;padding:1px 7px;border-radius:5px;font-weight:800;font-size:13px;text-align:end;width:' + Math.max(8, v / mx * 100) + '%;background:' + (S.won && i === n - 1 ? COL.g[0] : 'rgba(255,255,255,.18)')));
        dist.appendChild(row);
      });
      c.appendChild(dist);
      S.cdEl = null;
      if (S.mode === 'daily') { S.cdEl = g.el('p', '', g.t('nextIn', { t: hms(untilMidnight()) })); c.appendChild(S.cdEl); }
      const row = g.el('div', 'g2d-row');
      if (S.mode === 'daily') g.button(row, g.t('practiceBtn'), () => { g.mode = 'practice'; try { localStorage.setItem('flrot:g2d:word-of-day:mode', 'practice'); } catch (e) {} g.start(); }, { primary: true });
      else g.button(row, g.t('newWord'), () => g.start(), { primary: true });
      g.button(row, g.t('menu'), () => g.menu(), { alt: true });
      c.appendChild(row);
    }, 'custom');
  }

  // ---------- a round ----------
  function pickPractice(g, wl, day) {
    const recent = g.load('recent_' + wl, []), daily = dailyWord(wl, day), L = LIST[wl];
    let w = L[0];
    for (let k = 0; k < 60; k++) { w = L[Math.floor(Math.random() * L.length)]; if (w !== daily && !(Array.isArray(recent) && recent.includes(w))) break; }
    const r = Array.isArray(recent) ? recent.slice(-59) : [];
    r.push(w); g.save('recent_' + wl, r);
    return w;
  }
  const wordLang = g => (g.diff === 1 ? 'en' : 'he');
  function newState(g, demo) {
    const wl = wordLang(g), mode = g.mode === 'practice' ? 'practice' : 'daily', L = layout(g.W, g.H), day = dayNum();
    const S = {
      L, wl, mode, demo, day, rows: [], marks: [], typed: [], keys: {}, done: false, won: false, busy: false, t: 0, pop: [0, 0, 0, 0, 0],
      shake: -9, revT: -9, revRow: -1, bounceT: -9, kb: kbKeys(L, wl), press: {}, hover: null, st: loadSt(g, wl, mode), bg: makeBg(g.W, g.H, wl),
      endShown: false, recorded: false, cdEl: null,
    };
    if (demo) {
      S.answer = norm(wl, wl === 'he' ? 'שולחן' : 'WORLD');
      for (const w of wl === 'he' ? ['ספרים', 'שמיכה'] : ['HEART', 'STORM']) { const r = norm(wl, w); S.rows.push(r); S.marks.push(score(r, S.answer)); paintKeys(S, r, S.marks[S.marks.length - 1]); }
      S.typed = [...norm(wl, wl === 'he' ? 'שולח' : 'WOR')];
      return S;
    }
    if (mode === 'daily') {
      S.answer = dailyWord(wl, day);
      const d = g.load('day_' + wl, null);
      if (d && d.day === day && d.ans === S.answer && Array.isArray(d.rows)) {
        for (const r of d.rows.slice(0, 6)) if (typeof r === 'string' && r.length === 5 && [...r].every(c => ABC[wl].includes(c))) { S.rows.push(r); S.marks.push(score(r, S.answer)); paintKeys(S, r, S.marks[S.marks.length - 1]); }
        const last = S.marks[S.marks.length - 1];
        if (last && (last.every(c => c === 'g') || S.rows.length >= 6)) { S.done = true; S.won = last.every(c => c === 'g'); S.recorded = !!d.rec; S.restored = true; }
      }
    } else S.answer = pickPractice(g, wl, day);
    return S;
  }
  function keyToLetter(wl, e) {
    const k = e.key || '';
    if (wl === 'he') {
      if (k.length === 1) { const n = FIN[k] || k; if (ABC.he.includes(n)) return n; }
      const m = HE_CODE[e.code];
      return m ? FIN[m] || m : null;
    }
    if (k.length === 1 && /[a-z]/i.test(k)) return k.toUpperCase();
    const m = /^Key([A-Z])$/.exec(e.code || '');
    return m ? m[1] : null;
  }
  function keyAt(S, p) { const gp = S.L.kb.gap / 2; return S.kb.find(k => p.x >= k.x - gp && p.x <= k.x + k.w + gp && p.y >= k.y - gp && p.y <= k.y + k.h + gp) || null; }
  function chosenLang() { try { return localStorage.getItem('flrot:g2d:word-of-day:diff') !== null; } catch (e) { return false; } }

  GK.register('word-of-day', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 1000 : 600; },
    bg: '#1a1644', accent: '#ffd84d',
    modes: [{ id: 'daily', label: 'modeDaily' }, { id: 'practice', label: 'modePractice' }],
    diffs: ['wlHe', 'wlEn'],
    typing: true, noBest: true,
    text: TEXT,
    setup(g) { if (!chosenLang()) g.diff = g.lang === 'he' ? 0 : 1; },
    init(g) { g.s = newState(g, g.demo); },
    step(g) {
      const S = g.s;
      S.t += 1 / 60;
      if (S.restored && !S.endShown) { S.restored = false; record(g, S); saveDay(g, S); endRound(g, S, 'click'); return; }
      g.hud([[g.t(S.mode === 'daily' ? 'modeDaily' : 'modePractice'), S.mode === 'daily' ? '#' + (S.day + 1) : '∞'], [g.t('streak'), '🔥 ' + curStreak(S)]]);
    },
    idle(g) {
      const S = g.s; if (!S) return;
      S.t += 1 / 60;
      if (S.cdEl && Math.floor(S.t * 2) !== S.cdTick) { S.cdTick = Math.floor(S.t * 2); S.cdEl.textContent = g.t('nextIn', { t: hms(untilMidnight()) }); }
    },
    draw(g, ctx) {
      const S = g.s; if (!S) return;
      drawBg(g, ctx, g.W, g.H, S.bg, S.t, S.L);
      drawSide(g, ctx, S);
      drawGrid(g, ctx, S);
      drawKb(g, ctx, S);
    },
    // test player: types a word that fits every clue so far (like a person would), letter by letter, then Enter
    bot(g) {
      const S = g.s; if (!S || S.demo || S.done || S.busy) return;
      if ((S.botT = (S.botT || 0) + 1) % 5) return;
      if (!S.botWord) {
        const c = LIST[S.wl].filter(w => S.rows.every((r, i) => score(r, w).join('') === S.marks[i].join('')));
        S.botWord = c.length ? c[Math.floor(Math.random() * c.length)] : LIST[S.wl][0];
      }
      if (S.typed.length < 5) { S.press[S.botWord[S.typed.length]] = S.t; addLetter(g, S, S.botWord[S.typed.length]); }
      else { S.press.ENTER = S.t; submit(g, S); S.botWord = null; }
    },
    onKey(g, e) {
      const S = g.s; if (!S || S.demo) return;
      if (g.state === 'over') {
        if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !e.repeat) { const b = g.root.querySelector('.g2d-ov.show [data-primary]'); if (b) { e.preventDefault(); b.click(); } }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const c = e.code;
      if (c === 'Enter' || c === 'NumpadEnter') { e.preventDefault(); if (!e.repeat) { S.press.ENTER = S.t; submit(g, S); } return; }
      if (c === 'Backspace' || c === 'Delete') { e.preventDefault(); S.press.BACK = S.t; delLetter(g, S); return; }
      const ch = keyToLetter(S.wl, e);
      if (ch) { e.preventDefault(); if (!e.repeat) { S.press[ch] = S.t; addLetter(g, S, ch); } }
    },
    onPointer(g, type, p) {
      const S = g.s; if (!S || S.demo) return;
      const k = keyAt(S, p);
      if (type === 'move') { S.hover = k && p.kind !== 'touch' ? k.k : null; return; }
      if (type !== 'down' || !k || p.button > 0) return;
      if (k.k === 'ENTER') { S.press.ENTER = S.t; submit(g, S); }
      else if (k.k === 'BACK') { S.press.BACK = S.t; delLetter(g, S); }
      else { const n = norm(S.wl, k.k); S.press[n] = S.t; addLetter(g, S, n); }
    },
    onLang(g) {
      // the words follow the site language until the player picks a word language in the menu
      if (g.state === 'menu' && !chosenLang()) { g.diff = g.lang === 'he' ? 0 : 1; if (g.s && g.s.demo && g.s.wl !== wordLang(g)) g.s = newState(g, true); }
      if (g.s && g.s.endShown && g.state === 'over') showEnd(g, g.s);
    },
    cover(ctx, w, h, k) {
      const bg = makeBg(w, h, 'he');
      drawBg(k, ctx, w, h, bg, 0, null);
      const ans = norm('he', 'ניחוש'), s = 84, gap = 10, x0 = (w - (5 * s + 4 * gap)) / 2;
      const rg = ctx.createRadialGradient(w / 2, 270, 20, w / 2, 270, 300); rg.addColorStop(0, 'rgba(47,194,91,.35)'); rg.addColorStop(1, 'rgba(47,194,91,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      const kc = { keys: {} };
      ['שולחן', 'נחשים', 'ניחוש'].forEach((wd, r) => {
        const g2 = norm('he', wd), m = score(g2, ans);
        paintKeys(kc, g2, m);
        for (let i = 0; i < 5; i++) tile(k, ctx, x0 + (4 - i) * (s + gap), 34 + r * (s + gap), s, shown('he', g2[i], i), m[i], r === 2 ? { dy: -Math.sin(i * 0.9) * 6 } : {});
      });
      KB.he.forEach((keys, r) => {
        const kw = 62;
        for (let i = 0; i < keys.length; i++) {
          const ch = FIN[keys[i]] || keys[i], x = w / 2 - (keys.length * (kw + 8) - 8) / 2 + i * (kw + 8), y = 338 + r * 66;
          const st = kc.keys[ch], c = st ? COL[st] : ['#7a7fc0', '#4d518a'];
          k.rr(ctx, x, y + 4, kw, 56, 10); ctx.fillStyle = c[1]; ctx.fill();
          k.rr(ctx, x, y, kw, 54, 10); ctx.fillStyle = c[0]; ctx.fill();
          k.text(ctx, keys[i], x + kw / 2, y + 28, { size: 30, weight: 800, color: '#fff' });
        }
      });
      const R = seeded(7);
      for (let i = 0; i < 70; i++) { ctx.fillStyle = ['#2fc25b', '#f2b01e', '#ffffff', '#8f7bff', '#ff6fa8'][i % 5]; ctx.save(); ctx.translate(R() * w, R() * 330); ctx.rotate(R() * 6); ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
      const gr = ctx.createLinearGradient(0, h - 120, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
    dev: { WORDS, LIST, ABC, norm, shown, score, dailyWord, dayNum, keyToLetter },
  });
})();
