// ============================================================
//  האקר צעיר — משחק 2D של URotation (המנוע: g2d/kit.js)
//  24 משימות סייבר חוקיות במחשב רטרו: צופן קיסר, בסיס 64, בינארי והקס, הערה נסתרת בקוד של דף,
//  פישינג, סיסמה חזקה, יומן כניסות, XOR וסטגנוגרפיה. כל משימה מסבירה רעיון אחד ואת הכלל: בודקים רק מה שמותר.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600;
  const SX = 12, SY = 12, SW = 936, SH = 576;           // המסך של המחשב
  const LX = 28, LY = 62, LW = 300, LH = 512;           // לוח המשימה (משמאל)
  const RX = 344, RY = 62, RW = 588, RH = 452;          // אזור הפאזל (מימין)
  const TY = 524, TH = 46;                              // שורת הטרמינל
  const GREEN = '#39ff88', DIM = '#1d7a4a', DARK = '#06180e', AMBER = '#ffbf47', RED = '#ff5b5b', CYAN = '#5cd6ff', PALE = '#c9ffe0';
  const MONO = 'Consolas, "Courier New", monospace', SANS = 'Heebo, Arial, sans-serif';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const RTLC = /[֐-ࣿ]/;

  // ----- צופן קיסר בכל אלפבית: עברית 22 אותיות (סופיות = רגילות), ערבית 28, רוסית 32, לטינית 26 -----
  const ALPHA = { he: 'אבגדהוזחטיכלמנסעפצקרשת', ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', ru: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', lat: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const alphaOf = L => ALPHA[L] || ALPHA.lat;
  const shiftWord = (w, k, A) => [...w].map(c => { const i = A.indexOf(FIN[c] || c); return i < 0 ? c : A[((i + k) % A.length + A.length) % A.length]; }).join('');
  // המילים של שלושת שלבי הקיסר, בכל שפה (שלב 1: הזזה 1, שלב 9: הזזה 3, שלב 19: מפתח לא ידוע)
  const CWORDS = {
    he: ['סייבר', 'סיסמה', 'מחשב'], en: ['CYBER', 'PASSWORD', 'COMPUTER'], ar: ['رمز', 'مفتاح', 'حاسوب'], es: ['CLAVE', 'SECRETO', 'TECLADO'],
    fr: ['CODE', 'SECRET', 'CLAVIER'], pt: ['SENHA', 'SEGREDO', 'TECLADO'], ru: ['КОД', 'ПАРОЛЬ', 'ХАКЕР'], de: ['CODE', 'PASSWORT', 'TASTATUR'],
  };
  // השוואת תשובות: בלי רווחים וסימנים, בלי ניקוד וטעמים, אותיות סופיות = רגילות
  const normA = s => String(s == null ? '' : s).toUpperCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[ךםןףץ]/g, c => FIN[c]).replace(/[أإآٱ]/g, 'ا').replace(/[^\p{L}\p{N}]/gu, '');
  // בסיס 64 של טקסט בכל שפה (UTF-8)
  const b64 = s => { const u = new TextEncoder().encode(s); let b = ''; for (const x of u) b += String.fromCharCode(x); return btoa(b); };

  // ספרות בגופן 5×7 (למסכת ה-XOR ולתמונה עם הסוד)
  const DIG = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110',
    '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000',
    '01110100011000101110100011000101110', '01110100011000101111000010001001100'];
  const digOn = (d, x, y) => DIG[d][y * 5 + x] === '1';

  // ----- 24 השלבים. safe = איזה כלל של "בטוח וחוקי" מוצג -----
  const LV = [
    { k: 'caesar', w: 0, shift: 1, safe: 3 },
    { k: 'choice', opts: ['30', '100', '999', '1000'], ans: 3, safe: 4 },
    { k: 'bits', target: 13, safe: 0 },
    { k: 'phish', lines: 'mail', bad: [0, 1, 4], safe: 5 },
    { k: 'source', code: '7391', safe: 2 },
    { k: 'choice', opts: ['sunshine', 'Password1!', '12345678901', 'violet-tiger-rocket-bread'], ans: 3, safe: 4 },
    { k: 'b64', code: '8813', safe: 0 },
    { k: 'choice', tOpts: 'o8', ans: 0, safe: 1 },
    { k: 'caesar', w: 1, shift: 3, safe: 3 },
    { k: 'type', show: 'hex', ans: '31', safe: 0 },
    { k: 'log', ans: 9, safe: 6 },
    { k: 'choice', opts: ['1111', '2222', '1234', '1357'], ans: 2, safe: 4 },
    { k: 'xor', safe: 7 },
    { k: 'choice', opts: ['superbank.com.secure-login.xyz/home', 'superb4nk.com/login', 'superbank.com/login', 'superbank-help.net/login'], ans: 2, safe: 5, mono: true },
    { k: 'type', show: 'ascii', ans: 'HI', safe: 0 },
    { k: 'choice', tOpts: 'o16', ans: 0, safe: 4 },
    { k: 'stego', safe: 3 },
    { k: 'choice', opts: ['0', '1', '2', '5'], ans: 3, safe: 4 },
    { k: 'caesar', w: 2, shift: 0, brute: true, safe: 1 },
    { k: 'shell', ans: '4096', safe: 3 },
    { k: 'choice', tOpts: 'o21', ans: 0, safe: 4 },
    { k: 'phish', lines: 'chat', bad: [1, 2, 3, 5], safe: 5 },
    { k: 'type', show: 'xorbits', ans: '1100', safe: 7 },
    { k: 'final', ans: 'WHITEHAT', safe: 7 },
  ];
  const LOG = [
    ['07:58', 'ok', 'dana', '10.0.0.12'], ['08:02', 'ok', 'omer', '10.0.0.15'], ['08:40', 'fail', 'noa', '10.0.0.21'], ['08:41', 'ok', 'noa', '10.0.0.21'],
    ['09:12', 'fail', 'admin', '10.0.0.66'], ['09:12', 'fail', 'admin', '10.0.0.66'], ['09:12', 'fail', 'admin', '10.0.0.66'], ['09:13', 'fail', 'admin', '10.0.0.66'],
    ['09:13', 'fail', 'admin', '10.0.0.66'], ['09:13', 'ok', 'admin', '10.0.0.66'], ['09:30', 'ok', 'maya', '10.0.0.30'], ['10:05', 'ok', 'dana', '10.0.0.12'],
  ];
  const FINAL_B64 = 'WktMV0hLRFc=';   // ZKLWHKDW = WHITEHAT בהזזה של 3

  // ----- טקסט: הכיוון לפי התוכן, גופן רגיל או גופן מסוף -----
  function tx(ctx, s, x, y, o) {
    o = o || {};
    s = String(s);
    ctx.save();
    ctx.font = (o.w || 700) + ' ' + (o.size || 16) + 'px ' + (o.mono ? MONO : SANS);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    ctx.direction = o.dir || (RTLC.test(s) ? 'rtl' : 'ltr');
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 10; }
    ctx.fillStyle = o.color || GREEN;
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
    ctx.restore();
  }
  const wrapCache = new Map();
  function wrap(ctx, s, maxW, size, mono, w) {
    const key = s + '|' + maxW + '|' + size + '|' + (mono ? 1 : 0) + '|' + (w || 700);
    let lines = wrapCache.get(key);
    if (lines) return lines;
    ctx.save();
    ctx.font = (w || 700) + ' ' + size + 'px ' + (mono ? MONO : SANS);
    lines = [];
    let cur = '';
    for (const word of String(s).split(' ')) {
      if (!word) continue;
      const t = cur ? cur + ' ' + word : word;
      if (!cur || ctx.measureText(t).width <= maxW) cur = t; else { lines.push(cur); cur = word; }
      while (cur.length > 1 && ctx.measureText(cur).width > maxW) {
        let k = cur.length - 1;
        while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
        lines.push(cur.slice(0, k)); cur = cur.slice(k);
      }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    if (wrapCache.size > 400) wrapCache.clear();
    wrapCache.set(key, lines);
    return lines;
  }
  const hitB = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

  // ----- טקסטים ב-8 שפות. lv = לכל שלב [כותרת, הסבר, משימה, רמז] -----
  const TEXT = {
    en: {
      title: 'Young Hacker',
      help: ['24 cyber missions on a retro computer: ciphers, codes, phishing and more', 'Read the mission, then click, switch or type your answer', 'Stuck? Take a hint (it costs one star)', 'All of this is pretend — real hacking only with permission!'],
      mission: 'MISSION {n}/24', safeT: 'SAFE & LEGAL', hint: '? HINT', hintCost: '(costs a star)', granted: 'ACCESS GRANTED', denied: 'ACCESS DENIED',
      typeHere: 'type the answer…', enter: 'ENTER', shift: 'SHIFT', use: 'USE THIS', cipher: 'CIPHER', decoded: 'DECODED', target: 'TARGET', sum: 'SUM',
      found: 'found {n} of {m}', viewSrc: 'VIEW SOURCE', viewPage: 'VIEW PAGE', club: 'Robot Club', members: 'Members only — enter the club code',
      srcNote: 'note to self: delete before launch! club code =', clickDecode: 'click a note to decode it', doorCode: 'DOOR CODE: 8813',
      decoy1: 'Shopping list: milk, bread, apples', decoy2: 'Joke: why did the computer sneeze? It had a virus!',
      xorBtn: 'XOR', keyT: 'KEY', secretT: 'SECRET', resultT: 'RESULT', boost: 'BOOST',
      shHelp: 'commands: ls, ls -a, cat <file>, pwd, whoami, clear', shNotes: 'Psst… hidden files start with a dot.', shNo: 'command not found', shNoFile: 'no such file',
      step1: 'open the source', step2: 'decode the secret', step3: 'turn the wheel',
      lv: [
        ['The secret shift', 'A Caesar cipher moves every letter forward in the alphabet. To read it, move each letter back.', 'Every letter was moved forward by 1. Decode the word.', 'Press ◀ on the wheel once, or swap each letter for the one before it.'],
        ['How many codes?', 'Every extra digit multiplies the number of possible codes by 10.', 'A bike lock has 3 dials, each from 0 to 9. How many different codes are there?', 'Codes go from 000 to 999 — and 000 counts too!'],
        ['Lamps that count', 'Computers count with only 0 and 1. Each lamp is worth double the lamp to its right.', 'Turn on lamps that add up to {n} to open the door.', 'Start with the biggest lamp that still fits: 8, then 4, then 1.'],
        ['Fishy email', 'Phishing is a fake message that tries to trick you into giving away a password.', 'Click the 3 suspicious lines in this email.', "Check the sender's address, rushing words, and what they ask you to send."],
        ['Secrets in the source', 'Every web page has source code that anyone can open and read. Secrets never belong there!', 'The Robot Club page wants a club code. Look in the page source and type it.', 'Press VIEW SOURCE and look for a comment: <!-- … -->'],
        ['The strongest password', 'Long and random beats short and clever. Four random words make a strong password that is easy to remember.', 'Which password is the hardest to guess?', 'Attackers try common words with a number and ! at the end first.'],
        ['Base64 is not a lock', 'Base64 writes any data with letters and digits. It hides nothing — anyone can decode it.', 'One of these notes hides the door code. Decode them and type the code.', 'Click each note to decode it.'],
        ['A million guesses a second', 'A computer can try about a million codes every second. Short codes fall fast — that is why sites lock after a few wrong tries.', 'How long does it take to try ALL 1,000,000 six-digit codes?', 'A million codes, a million every second.'],
        ['Shift by three', 'Julius Caesar shifted his letters by 3. With the key, decoding is easy.', 'Every letter was moved forward by 3. Decode the word.', 'Turn the wheel back 3 steps.'],
        ['Counting in hex', 'Hex counts with 16 digits: 0–9 and then A–F (A = 10 … F = 15). Colours and memory addresses use it.', 'What is hex 1F in normal numbers? Type it.', '1F = 1×16 + 15'],
        ['Read the log', "A log is a computer's diary. Defenders read it to spot an intruder.", 'Someone guessed the admin password. Click the line where they got in.', 'Many failed tries from one address, then a success…'],
        ['Password fingerprints', "Sites don't keep your password. They keep a hash — a one-way fingerprint — and compare fingerprints.", "Our toy hash multiplies the digits. Dana's PIN has toy hash 24. Which PIN can it be?", 'Multiply the digits of each PIN: 1×2×3×4 = ?'],
        ['The XOR mask', 'XOR compares two squares: same → dark, different → lit. The key that hides a picture also brings it back.', 'Press XOR to lay the key over the secret, then type the digit you see.', 'Press the XOR button.'],
        ['Which link is real?', 'Fake sites copy famous names. The real site is the name that comes right before the first single "/".', 'Which link really goes to superbank.com?', 'Look at what comes right before the first "/".'],
        ['Letters are numbers', 'Every letter has a number (A = 65, B = 66 …). The computer stores those numbers in 0s and 1s.', 'Turn the two bytes into letters and type the word.', '01001000 = 64 + 8 = 72 = H'],
        ['A second lock', 'Two-step login asks for something extra, like a code on your phone, so a stolen password alone is not enough.', 'A thief learned your password. What still stops them?', 'Which one needs something the thief does not have?'],
        ['Hidden in a picture', "Steganography hides a message inside a picture by changing colours so slightly that eyes can't tell.", 'Boost the tiny colour differences to reveal the code, then type it.', 'Drag the BOOST slider all the way up.'],
        ['One password, five doors', 'Attackers try a leaked password on every site. Use a different password for each site — a password manager remembers them.', 'Maya uses the same password on 5 sites. One site gets hacked. How many of her accounts are in danger?', 'The attacker tries the leaked password everywhere.'],
        ['Unknown key', "Don't know the key? Try them all! That is brute force — it works because there are only a few keys.", 'This word was shifted by a key nobody told you. Turn the wheel until it makes sense.', 'Keep turning: one of the shifts gives a real word.'],
        ['Hidden files', 'In Linux, files whose names start with a dot are hidden. The command ls -a shows them.', 'Find the hidden file and read the flag. Then type the flag number.', 'Type ls -a, then cat and the name of the hidden file.'],
        ['A pinch of salt', 'A salt is random letters added before hashing, so two equal passwords still get different hashes.', 'Two users both chose cat123. WITHOUT salt, their stored hashes are…', 'Same password in, same hash out.'],
        ['Too good to be true', 'Free prizes, countdowns and requests for passwords are the classic bait of scammers.', 'Click the 4 suspicious lines in this chat message.', 'Prizes, hurry, strange links and asking for secrets.'],
        ['XOR by hand', 'The XOR rule: two equal bits give 0, two different bits give 1.', 'Message 1010 XOR key 0110 = ? Type the 4 bits.', 'Bit by bit: 1 and 0 are different, so 1.'],
        ['Final mission: the flag', 'White-hat hackers use their skills only with permission, to make the internet safer.', 'Open the source, decode the secret, then turn the wheel to read the flag.', 'Source → click the secret → turn the wheel → USE THIS.'],
      ],
      safe: ['Only test computers and accounts that are yours — or that you have permission to test.', "Trying someone else's password, even as a joke, is against the law.", 'Found a security hole? Tell the owner or an adult. Never use it.', 'Practice hacking only on training games made for it, like CTF sites.',
        'Never share your password — not even with your best friend.', 'Real companies never ask for your password in a message.', 'Defenders read logs to protect people, not to spy on them.', 'White-hat hackers ask first, then help fix what they find.'],
      o8: ['About 1 second', 'About 1 hour', 'About 1 week', 'About 100 years'],
      o16: ['A code sent to my phone', 'A longer username', 'A cooler profile picture', 'A new nickname'],
      o21: ['Exactly the same', 'Different', 'Empty'],
      mail: ['From: SuperBank <support@superbank-alerts.xyz>', 'URGENT!!! Your account closes in 1 hour!', 'Hello dear customer,', 'We found a small problem with your account.', 'Reply with your password so we can fix it.', 'Thanks, the SuperBank team'],
      chat: ['Gemzorp Rewards 🎁', 'You won 10,000 free gems!!!', 'Hurry — the offer ends in 5 minutes!', 'Claim here: gemzorp-free-gems.win', 'Have a great day!', "Type your password and a parent's card number to claim."],
    },
    he: {
      title: 'האקר צעיר',
      help: ['24 משימות סייבר במחשב רטרו: צפנים, קודים, פישינג ועוד', 'קרא את המשימה, ואז לחץ, הדלק או הקלד את התשובה', 'נתקעת? קח רמז (הוא עולה כוכב אחד)', 'הכול כאן בכאילו — פריצה אמיתית מותרת רק ברשות!'],
      mission: 'משימה {n}/24', safeT: 'בטוח וחוקי', hint: '? רמז', hintCost: '(עולה כוכב)', granted: 'גישה אושרה', denied: 'גישה נדחתה',
      typeHere: 'הקלד את התשובה…', enter: 'אישור', shift: 'הזזה', use: 'זו המילה', cipher: 'צופן', decoded: 'מפוענח', target: 'יעד', sum: 'סכום',
      found: 'נמצאו {n} מתוך {m}', viewSrc: 'הצג קוד מקור', viewPage: 'הצג את הדף', club: 'מועדון הרובוטים', members: 'לחברים בלבד — הקלד את קוד המועדון',
      srcNote: 'תזכורת: למחוק לפני ההשקה! קוד המועדון =', clickDecode: 'לחץ על פתק כדי לפענח אותו', doorCode: 'קוד הדלת: 8813',
      decoy1: 'רשימת קניות: חלב, לחם, תפוחים', decoy2: 'בדיחה: למה המחשב התעטש? כי היה לו וירוס!',
      xorBtn: 'XOR', keyT: 'מפתח', secretT: 'סוד', resultT: 'תוצאה', boost: 'הגברה',
      shHelp: 'פקודות: ls, ls -a, cat <file>, pwd, whoami, clear', shNotes: 'פססט… קבצים נסתרים מתחילים בנקודה.', shNo: 'פקודה לא מוכרת', shNoFile: 'אין קובץ כזה',
      step1: 'פתח את קוד המקור', step2: 'פענח את הסוד', step3: 'סובב את הגלגל',
      lv: [
        ['ההזזה הסודית', 'צופן קיסר מזיז כל אות קדימה באלף־בית. כדי לקרוא, מזיזים כל אות אחורה.', 'כל אות זזה קדימה ב־1. פענח את המילה.', 'לחץ פעם אחת על ◀ בגלגל, או החלף כל אות באות שלפניה.'],
        ['כמה קודים יש?', 'כל ספרה נוספת מכפילה פי 10 את מספר הקודים האפשריים.', 'למנעול אופניים יש 3 גלגלות, בכל אחת 0 עד 9. כמה קודים שונים יש?', 'הקודים הם מ־000 עד 999 — וגם 000 נחשב!'],
        ['נורות שסופרות', 'מחשבים סופרים רק עם 0 ו־1. כל נורה שווה פי 2 מהנורה שמימינה.', 'הדלק נורות שסכומן {n} כדי לפתוח את הדלת.', 'התחל מהנורה הגדולה שעוד נכנסת: 8, אחר כך 4, ואז 1.'],
        ['מייל מחשיד', 'פישינג הוא הודעה מזויפת שמנסה לגרום לך למסור סיסמה.', 'לחץ על 3 השורות החשודות במייל הזה.', 'בדוק את כתובת השולח, מילים שמלחיצות, ומה מבקשים ממך לשלוח.'],
        ['סודות בקוד המקור', 'לכל דף אינטרנט יש קוד מקור שכל אחד יכול לפתוח ולקרוא. אסור לשים שם סודות!', 'הדף של מועדון הרובוטים מבקש קוד. חפש אותו בקוד המקור והקלד אותו.', 'לחץ על "הצג קוד מקור" וחפש הערה: <!-- … -->'],
        ['הסיסמה החזקה', 'ארוך ואקראי מנצח קצר ומתוחכם. ארבע מילים אקראיות הן סיסמה חזקה שקל לזכור.', 'איזו סיסמה הכי קשה לנחש?', 'תוקפים מנסים קודם מילים נפוצות עם מספר ו־! בסוף.'],
        ['בסיס 64 הוא לא מנעול', 'בסיס 64 כותב כל מידע באותיות ובספרות. הוא לא מסתיר כלום — כל אחד יכול לפענח אותו.', 'באחד הפתקים מסתתר קוד הדלת. פענח אותם והקלד את הקוד.', 'לחץ על כל פתק כדי לפענח אותו.'],
        ['מיליון ניחושים בשנייה', 'מחשב יכול לנסות בערך מיליון קודים בכל שנייה. קודים קצרים נופלים מהר — לכן אתרים ננעלים אחרי כמה טעויות.', 'כמה זמן לוקח לנסות את כל 1,000,000 הקודים בני 6 הספרות?', 'מיליון קודים, מיליון בכל שנייה.'],
        ['הזזה בשלוש', 'יוליוס קיסר הזיז את האותיות שלו ב־3. כשיודעים את המפתח, קל לפענח.', 'כל אות זזה קדימה ב־3. פענח את המילה.', 'סובב את הגלגל 3 צעדים אחורה.'],
        ['ספירה בהקס', 'הקס סופר עם 16 ספרות: 0–9 ואחריהן A–F (A = 10 … F = 15). צבעים וכתובות בזיכרון משתמשים בו.', 'כמה זה 1F בהקס במספרים רגילים? הקלד.', '1F = 1×16 + 15'],
        ['קרא את היומן', 'יומן (לוג) הוא היומן של המחשב. המגינים קוראים אותו כדי לתפוס פורץ.', 'מישהו ניחש את הסיסמה של admin. לחץ על השורה שבה הוא נכנס.', 'הרבה ניסיונות כושלים מאותה כתובת, ואז הצלחה…'],
        ['טביעות אצבע של סיסמאות', 'אתרים לא שומרים את הסיסמה שלך. הם שומרים גיבוב (hash) — טביעת אצבע חד־כיוונית — ומשווים טביעות.', 'הגיבוב־צעצוע שלנו כופל את הספרות. לקוד של דנה יש גיבוב 24. איזה קוד זה יכול להיות?', 'כפול את הספרות של כל קוד: 1×2×3×4 = ?'],
        ['מסכת ה־XOR', 'XOR משווה שני ריבועים: זהים ← כבוי, שונים ← דולק. המפתח שמסתיר תמונה גם מחזיר אותה.', 'לחץ על XOR כדי להניח את המפתח על הסוד, והקלד את הספרה שרואים.', 'לחץ על הכפתור XOR.'],
        ['איזה קישור אמיתי?', 'אתרים מזויפים מעתיקים שמות מפורסמים. האתר האמיתי הוא השם שמופיע ממש לפני ה־"/" הראשון.', 'איזה קישור באמת מוביל ל־superbank.com?', 'בדוק מה כתוב ממש לפני ה־"/" הראשון.'],
        ['אותיות הן מספרים', 'לכל אות יש מספר (A = 65, B = 66 …). המחשב שומר את המספרים האלה באפסים ואחדות.', 'הפוך את שני הבייטים לאותיות והקלד את המילה.', '01001000 = 64 + 8 = 72 = H'],
        ['מנעול שני', 'אימות דו־שלבי מבקש עוד משהו, כמו קוד בטלפון — כך שסיסמה גנובה לבד לא מספיקה.', 'גנב גילה את הסיסמה שלך. מה עדיין עוצר אותו?', 'מה מהם דורש משהו שאין לגנב?'],
        ['מוסתר בתמונה', 'סטגנוגרפיה מסתירה הודעה בתוך תמונה על ידי שינוי צבעים קטן כל כך שהעין לא מבחינה.', 'הגבר את ההבדלים הזעירים בצבע כדי לחשוף את הקוד, והקלד אותו.', 'גרור את פס ההגברה עד הסוף.'],
        ['סיסמה אחת, חמש דלתות', 'תוקפים מנסים סיסמה שדלפה בכל האתרים. השתמש בסיסמה אחרת לכל אתר — מנהל סיסמאות זוכר אותן בשבילך.', 'מאיה משתמשת באותה סיסמה ב־5 אתרים. אתר אחד נפרץ. כמה מהחשבונות שלה בסכנה?', 'התוקף מנסה את הסיסמה שדלפה בכל מקום.'],
        ['מפתח לא ידוע', 'לא יודעים את המפתח? מנסים את כולם! זה נקרא כוח גס (brute force) — וזה עובד כי יש מעט מפתחות.', 'המילה הוזזה במפתח שאף אחד לא גילה לך. סובב את הגלגל עד שיוצאת מילה.', 'המשך לסובב: אחת ההזזות נותנת מילה אמיתית.'],
        ['קבצים נסתרים', 'בלינוקס, קבצים ששמם מתחיל בנקודה הם נסתרים. הפקודה ls -a מציגה אותם.', 'מצא את הקובץ הנסתר וקרא את הדגל. אחר כך הקלד את המספר שבדגל.', 'הקלד ls -a, ואז cat ואת השם של הקובץ הנסתר.'],
        ['קורט מלח', 'מלח (salt) הוא אותיות אקראיות שמוסיפים לפני הגיבוב, כך ששתי סיסמאות זהות מקבלות גיבובים שונים.', 'שני משתמשים בחרו cat123. בלי מלח, הגיבובים השמורים שלהם…', 'אותה סיסמה נכנסת — אותו גיבוב יוצא.'],
        ['טוב מכדי להיות אמיתי', 'פרסים בחינם, ספירה לאחור ובקשות לסיסמה הם הפיתיון הקלאסי של נוכלים.', "לחץ על 4 השורות החשודות בהודעת הצ'אט.", 'פרסים, לחץ זמן, קישורים מוזרים ובקשה לסודות.'],
        ['XOR ביד', 'חוק ה־XOR: שני ביטים שווים נותנים 0, שני ביטים שונים נותנים 1.', 'הודעה 1010 XOR מפתח 0110 = ? הקלד את 4 הביטים.', 'ביט אחרי ביט: 1 ו־0 שונים, אז 1.'],
        ['משימת הסיום: הדגל', 'האקרים "כובע לבן" משתמשים בכישורים שלהם רק ברשות, כדי שהאינטרנט יהיה בטוח יותר.', 'פתח את קוד המקור, פענח את הסוד, וסובב את הגלגל כדי לקרוא את הדגל.', 'קוד מקור ← לחץ על הסוד ← סובב את הגלגל ← "זו המילה".'],
      ],
      safe: ['בודקים רק מחשבים וחשבונות שהם שלך — או שקיבלת רשות לבדוק.', 'לנסות סיסמה של מישהו אחר, אפילו בצחוק, זה נגד החוק.', 'מצאת חור באבטחה? ספר לבעלים או למבוגר. לעולם אל תשתמש בו.', 'מתאמנים בפריצה רק במשחקי אימון שנבנו לזה, כמו אתרי CTF.',
        'אל תמסור את הסיסמה שלך — אפילו לא לחבר הכי טוב.', 'חברות אמיתיות אף פעם לא מבקשות סיסמה בהודעה.', 'מגינים קוראים יומנים כדי להגן על אנשים, לא כדי לרגל אחריהם.', 'האקרים "כובע לבן" מבקשים רשות קודם, ואז עוזרים לתקן את מה שמצאו.'],
      o8: ['בערך שנייה אחת', 'בערך שעה', 'בערך שבוע', 'בערך 100 שנה'],
      o16: ['קוד שנשלח לטלפון שלי', 'שם משתמש ארוך יותר', 'תמונת פרופיל מגניבה יותר', 'כינוי חדש'],
      o21: ['זהים לגמרי', 'שונים', 'ריקים'],
      mail: ['מאת: SuperBank <support@superbank-alerts.xyz>', 'דחוף!!! החשבון שלך ייסגר בעוד שעה!', 'שלום לקוח יקר,', 'מצאנו בעיה קטנה בחשבון שלך.', 'השב עם הסיסמה שלך כדי שנוכל לתקן.', 'תודה, צוות SuperBank'],
      chat: ['Gemzorp פרסים 🎁', 'זכית ב־10,000 יהלומים בחינם!!!', 'מהר — המבצע נגמר בעוד 5 דקות!', 'לקבלה: gemzorp-free-gems.win', 'שיהיה לך יום נהדר!', 'הקלד את הסיסמה שלך ומספר כרטיס אשראי של אחד ההורים כדי לקבל.'],
    },
    ar: {
      title: 'الهاكر الصغير',
      help: ['24 مهمة سيبرانية على حاسوب قديم: شيفرات ورموز وتصيّد والمزيد', 'اقرأ المهمة، ثم انقر أو شغّل أو اكتب إجابتك', 'علقت؟ خذ تلميحاً (يكلّفك نجمة)', 'كل هذا تمثيل — الاختراق الحقيقي مسموح فقط بإذن!'],
      mission: 'المهمة {n}/24', safeT: 'آمن وقانوني', hint: '? تلميح', hintCost: '(يكلّف نجمة)', granted: 'تم السماح بالدخول', denied: 'تم رفض الدخول',
      typeHere: 'اكتب الإجابة…', enter: 'إدخال', shift: 'الإزاحة', use: 'هذه هي', cipher: 'الشيفرة', decoded: 'بعد الفك', target: 'الهدف', sum: 'المجموع',
      found: 'وجدت {n} من {m}', viewSrc: 'عرض المصدر', viewPage: 'عرض الصفحة', club: 'نادي الروبوتات', members: 'للأعضاء فقط — اكتب رمز النادي',
      srcNote: 'تذكير: احذف هذا قبل الإطلاق! رمز النادي =', clickDecode: 'انقر على ملاحظة لفكّها', doorCode: 'رمز الباب: 8813',
      decoy1: 'قائمة التسوق: حليب، خبز، تفاح', decoy2: 'نكتة: لماذا عطس الحاسوب؟ لأنه أصيب بفيروس!',
      xorBtn: 'XOR', keyT: 'المفتاح', secretT: 'السر', resultT: 'النتيجة', boost: 'تضخيم',
      shHelp: 'الأوامر: ls, ls -a, cat <file>, pwd, whoami, clear', shNotes: 'هسس… الملفات المخفية تبدأ بنقطة.', shNo: 'أمر غير معروف', shNoFile: 'لا يوجد ملف كهذا',
      step1: 'افتح المصدر', step2: 'فكّ السر', step3: 'أدر العجلة',
      lv: [
        ['الإزاحة السرية', 'شيفرة قيصر تحرّك كل حرف إلى الأمام في الأبجدية. لقراءتها، حرّك كل حرف إلى الخلف.', 'تحرّك كل حرف خطوة واحدة إلى الأمام. فكّ الكلمة.', 'اضغط ◀ في العجلة مرة واحدة، أو استبدل كل حرف بالحرف الذي قبله.'],
        ['كم رمزاً يوجد؟', 'كل رقم إضافي يضاعف عدد الرموز الممكنة 10 مرات.', 'قفل دراجة فيه 3 عجلات، في كل منها من 0 إلى 9. كم رمزاً مختلفاً يوجد؟', 'الرموز من 000 إلى 999 — و000 يُحسب أيضاً!'],
        ['مصابيح تعدّ', 'الحواسيب تعدّ بـ 0 و1 فقط. كل مصباح يساوي ضعف المصباح الذي على يمينه.', 'أضئ مصابيح مجموعها {n} لتفتح الباب.', 'ابدأ بأكبر مصباح يتسع: 8، ثم 4، ثم 1.'],
        ['بريد مريب', 'التصيّد رسالة مزيّفة تحاول خداعك لتعطي كلمة مرورك.', 'انقر على الأسطر الثلاثة المريبة في هذا البريد.', 'افحص عنوان المرسل، والكلمات المستعجلة، وما يطلبونه منك.'],
        ['أسرار في المصدر', 'لكل صفحة ويب شيفرة مصدر يستطيع أي شخص فتحها وقراءتها. لا مكان للأسرار هناك!', 'صفحة نادي الروبوتات تطلب رمزاً. ابحث عنه في المصدر واكتبه.', 'اضغط "عرض المصدر" وابحث عن تعليق: <!-- … -->'],
        ['أقوى كلمة مرور', 'الطويل والعشوائي يغلب القصير الذكي. أربع كلمات عشوائية تصنع كلمة مرور قوية وسهلة التذكر.', 'أي كلمة مرور هي الأصعب تخميناً؟', 'المهاجمون يجرّبون أولاً كلمات شائعة مع رقم و! في آخرها.'],
        ['Base64 ليس قفلاً', 'Base64 يكتب أي بيانات بالحروف والأرقام. إنه لا يخفي شيئاً — أي شخص يستطيع فكّه.', 'إحدى هذه الملاحظات تخفي رمز الباب. فكّها واكتب الرمز.', 'انقر على كل ملاحظة لتفكّها.'],
        ['مليون تخمين في الثانية', 'يستطيع الحاسوب تجربة نحو مليون رمز كل ثانية. الرموز القصيرة تسقط بسرعة — لذلك تُقفل المواقع بعد بضع محاولات خاطئة.', 'كم يستغرق تجريب كل الرموز ذات الـ 6 أرقام (1,000,000 رمز)؟', 'مليون رمز، مليون كل ثانية.'],
        ['إزاحة بثلاثة', 'كان يوليوس قيصر يزيح حروفه بـ 3. مع المفتاح، الفك سهل.', 'تحرّك كل حرف 3 خطوات إلى الأمام. فكّ الكلمة.', 'أدر العجلة 3 خطوات إلى الخلف.'],
        ['العدّ بالست عشري', 'النظام الست عشري يعدّ بـ 16 رقماً: 0–9 ثم A–F (A = 10 … F = 15). الألوان وعناوين الذاكرة تستخدمه.', 'كم يساوي 1F بالأرقام العادية؟ اكتبه.', '1F = 1×16 + 15'],
        ['اقرأ السجل', 'السجل هو مذكرات الحاسوب. المدافعون يقرؤونه لاكتشاف المتسلل.', 'أحدهم خمّن كلمة مرور admin. انقر على السطر الذي دخل فيه.', 'محاولات فاشلة كثيرة من العنوان نفسه، ثم نجاح…'],
        ['بصمات كلمات المرور', 'المواقع لا تحفظ كلمة مرورك. إنها تحفظ "هاش" — بصمة باتجاه واحد — وتقارن البصمات.', 'الهاش اللعبة عندنا يضرب الأرقام. للرمز السري لدانة هاش 24. أي رمز يمكن أن يكون؟', 'اضرب أرقام كل رمز: 1×2×3×4 = ؟'],
        ['قناع XOR', 'XOR يقارن مربعين: متشابهان ← مطفأ، مختلفان ← مضاء. المفتاح الذي يخفي الصورة يعيدها أيضاً.', 'اضغط XOR لتضع المفتاح فوق السر، ثم اكتب الرقم الذي تراه.', 'اضغط زر XOR.'],
        ['أي رابط حقيقي؟', 'المواقع المزيفة تنسخ أسماء مشهورة. الموقع الحقيقي هو الاسم الذي يأتي مباشرة قبل أول "/".', 'أي رابط يذهب فعلاً إلى superbank.com؟', 'انظر إلى ما يأتي مباشرة قبل أول "/".'],
        ['الحروف أرقام', 'لكل حرف رقم (A = 65، B = 66 …). يخزّن الحاسوب هذه الأرقام بالأصفار والآحاد.', 'حوّل البايتين إلى حرفين واكتب الكلمة.', '01001000 = 64 + 8 = 72 = H'],
        ['قفل ثانٍ', 'الدخول بخطوتين يطلب شيئاً إضافياً، مثل رمز على هاتفك، فلا تكفي كلمة مرور مسروقة وحدها.', 'عرف لصّ كلمة مرورك. ما الذي ما زال يوقفه؟', 'أيّها يحتاج شيئاً ليس عند اللص؟'],
        ['مخفي في صورة', 'إخفاء المعلومات يضع رسالة داخل صورة بتغيير الألوان تغييراً صغيراً جداً لا تلاحظه العين.', 'ضخّم الفروق الصغيرة في الألوان لتكشف الرمز، ثم اكتبه.', 'اسحب شريط التضخيم حتى النهاية.'],
        ['كلمة مرور واحدة، خمسة أبواب', 'المهاجمون يجرّبون كلمة المرور المسرّبة في كل المواقع. استخدم كلمة مرور مختلفة لكل موقع — ومدير كلمات المرور يتذكرها لك.', 'تستخدم مايا كلمة المرور نفسها في 5 مواقع. اختُرق موقع واحد. كم حساباً من حساباتها في خطر؟', 'المهاجم يجرّب كلمة المرور المسرّبة في كل مكان.'],
        ['مفتاح مجهول', 'لا تعرف المفتاح؟ جرّبها كلها! هذا اسمه "القوة الغاشمة" — وينجح لأن المفاتيح قليلة.', 'أُزيحت هذه الكلمة بمفتاح لم يخبرك به أحد. أدر العجلة حتى يظهر معنى.', 'تابع التدوير: إحدى الإزاحات تعطي كلمة حقيقية.'],
        ['ملفات مخفية', 'في لينكس، الملفات التي يبدأ اسمها بنقطة تكون مخفية. الأمر ls -a يُظهرها.', 'جد الملف المخفي واقرأ العلم. ثم اكتب رقم العلم.', 'اكتب ls -a، ثم cat واسم الملف المخفي.'],
        ['رشة ملح', 'الملح أحرف عشوائية تُضاف قبل الهاش، فتحصل كلمتا مرور متطابقتان على هاشين مختلفين.', 'اختار مستخدمان cat123. بدون ملح، الهاشان المحفوظان لهما…', 'كلمة المرور نفسها تدخل — الهاش نفسه يخرج.'],
        ['أجمل من أن يكون حقيقياً', 'الجوائز المجانية والعدّ التنازلي وطلب كلمات المرور هي الطُّعم المعتاد للمحتالين.', 'انقر على الأسطر الأربعة المريبة في رسالة الدردشة.', 'جوائز، استعجال، روابط غريبة، وطلب أسرار.'],
        ['XOR باليد', 'قاعدة XOR: بِتّان متساويان يعطيان 0، وبِتّان مختلفان يعطيان 1.', 'الرسالة 1010 XOR المفتاح 0110 = ؟ اكتب البِتّات الأربعة.', 'بِتّاً بِتّاً: 1 و0 مختلفان، إذن 1.'],
        ['المهمة الأخيرة: العلم', 'الهاكرز أصحاب "القبعات البيضاء" يستخدمون مهاراتهم بإذن فقط، ليجعلوا الإنترنت أكثر أماناً.', 'افتح المصدر، فكّ السر، ثم أدر العجلة لتقرأ العلم.', 'المصدر ← انقر على السر ← أدر العجلة ← "هذه هي".'],
      ],
      safe: ['اختبر فقط الحواسيب والحسابات التي تملكها — أو التي حصلت على إذن لاختبارها.', 'تجربة كلمة مرور شخص آخر، حتى على سبيل المزاح، مخالفة للقانون.', 'وجدت ثغرة أمنية؟ أخبر صاحبها أو شخصاً بالغاً. لا تستغلها أبداً.', 'تدرّب على الاختراق فقط في ألعاب تدريب مصنوعة لذلك، مثل مواقع CTF.',
        'لا تشارك كلمة مرورك أبداً — ولا حتى مع أعز أصدقائك.', 'الشركات الحقيقية لا تطلب كلمة مرورك في رسالة أبداً.', 'المدافعون يقرؤون السجلات لحماية الناس، لا للتجسس عليهم.', 'الهاكرز أصحاب القبعات البيضاء يستأذنون أولاً، ثم يساعدون في إصلاح ما وجدوه.'],
      o8: ['نحو ثانية واحدة', 'نحو ساعة', 'نحو أسبوع', 'نحو 100 سنة'],
      o16: ['رمز يُرسل إلى هاتفي', 'اسم مستخدم أطول', 'صورة شخصية أجمل', 'لقب جديد'],
      o21: ['متطابقان تماماً', 'مختلفان', 'فارغان'],
      mail: ['من: SuperBank <support@superbank-alerts.xyz>', 'عاجل!!! سيُغلق حسابك خلال ساعة!', 'مرحباً عزيزنا العميل،', 'وجدنا مشكلة صغيرة في حسابك.', 'أرسل لنا كلمة مرورك في الرد لنصلحها.', 'شكراً، فريق SuperBank'],
      chat: ['جوائز Gemzorp 🎁', 'ربحت 10,000 جوهرة مجاناً!!!', 'أسرع — ينتهي العرض خلال 5 دقائق!', 'استلم هنا: gemzorp-free-gems.win', 'أتمنى لك يوماً رائعاً!', 'اكتب كلمة مرورك ورقم بطاقة أحد والديك لتستلم الجائزة.'],
    },
    es: {
      title: 'Joven Hacker',
      help: ['24 misiones de ciberseguridad en una computadora retro: cifrados, códigos, phishing y más', 'Lee la misión y luego haz clic, enciende o escribe tu respuesta', '¿Atascado? Pide una pista (cuesta una estrella)', 'Todo esto es de mentira: hackear de verdad, solo con permiso.'],
      mission: 'MISIÓN {n}/24', safeT: 'SEGURO Y LEGAL', hint: '? PISTA', hintCost: '(cuesta una estrella)', granted: 'ACCESO CONCEDIDO', denied: 'ACCESO DENEGADO',
      typeHere: 'escribe la respuesta…', enter: 'ENTRAR', shift: 'DESPLAZ.', use: 'USAR ESTA', cipher: 'CIFRADO', decoded: 'DESCIFRADO', target: 'OBJETIVO', sum: 'SUMA',
      found: '{n} de {m} encontradas', viewSrc: 'VER CÓDIGO', viewPage: 'VER PÁGINA', club: 'Club de Robots', members: 'Solo socios: escribe el código del club',
      srcNote: 'nota: ¡borrar antes de publicar! código del club =', clickDecode: 'haz clic en una nota para descifrarla', doorCode: 'CÓDIGO DE LA PUERTA: 8813',
      decoy1: 'Lista de compras: leche, pan, manzanas', decoy2: 'Chiste: ¿por qué estornudó la computadora? ¡Tenía un virus!',
      xorBtn: 'XOR', keyT: 'CLAVE', secretT: 'SECRETO', resultT: 'RESULTADO', boost: 'AUMENTO',
      shHelp: 'comandos: ls, ls -a, cat <archivo>, pwd, whoami, clear', shNotes: 'Psst… los archivos ocultos empiezan con un punto.', shNo: 'comando no encontrado', shNoFile: 'no existe ese archivo',
      step1: 'abre el código', step2: 'descifra el secreto', step3: 'gira la rueda',
      lv: [
        ['El desplazamiento secreto', 'El cifrado César mueve cada letra hacia adelante en el alfabeto. Para leerlo, mueve cada letra hacia atrás.', 'Cada letra avanzó 1 lugar. Descifra la palabra.', 'Pulsa ◀ una vez en la rueda, o cambia cada letra por la anterior.'],
        ['¿Cuántos códigos?', 'Cada cifra extra multiplica por 10 la cantidad de códigos posibles.', 'Un candado de bici tiene 3 ruedas, cada una del 0 al 9. ¿Cuántos códigos distintos hay?', 'Los códigos van del 000 al 999, ¡y el 000 también cuenta!'],
        ['Luces que cuentan', 'Las computadoras cuentan solo con 0 y 1. Cada luz vale el doble que la luz de su derecha.', 'Enciende luces que sumen {n} para abrir la puerta.', 'Empieza por la luz más grande que quepa: 8, luego 4, luego 1.'],
        ['Correo sospechoso', 'El phishing es un mensaje falso que intenta engañarte para que des tu contraseña.', 'Haz clic en las 3 líneas sospechosas de este correo.', 'Mira la dirección del remitente, las prisas y lo que te piden enviar.'],
        ['Secretos en el código', 'Toda página web tiene un código fuente que cualquiera puede abrir y leer. ¡Ahí no van secretos!', 'La página del Club de Robots pide un código. Búscalo en el código fuente y escríbelo.', 'Pulsa VER CÓDIGO y busca un comentario: <!-- … -->'],
        ['La contraseña más fuerte', 'Largo y al azar gana a corto e ingenioso. Cuatro palabras al azar forman una contraseña fuerte y fácil de recordar.', '¿Qué contraseña es la más difícil de adivinar?', 'Los atacantes prueban primero palabras comunes con un número y ! al final.'],
        ['Base64 no es un candado', 'Base64 escribe cualquier dato con letras y números. No esconde nada: cualquiera puede decodificarlo.', 'Una de estas notas esconde el código de la puerta. Descífralas y escribe el código.', 'Haz clic en cada nota para descifrarla.'],
        ['Un millón de intentos por segundo', 'Una computadora puede probar cerca de un millón de códigos por segundo. Los códigos cortos caen rápido: por eso las webs se bloquean tras varios errores.', '¿Cuánto tarda en probar TODOS los 1.000.000 de códigos de 6 cifras?', 'Un millón de códigos, un millón por segundo.'],
        ['Desplazar tres', 'Julio César desplazaba sus letras 3 lugares. Con la clave, descifrar es fácil.', 'Cada letra avanzó 3 lugares. Descifra la palabra.', 'Gira la rueda 3 pasos hacia atrás.'],
        ['Contar en hexadecimal', 'El hexadecimal cuenta con 16 cifras: 0–9 y luego A–F (A = 10 … F = 15). Lo usan los colores y las direcciones de memoria.', '¿Cuánto es 1F en números normales? Escríbelo.', '1F = 1×16 + 15'],
        ['Lee el registro', 'Un registro (log) es el diario de una computadora. Los defensores lo leen para descubrir a un intruso.', 'Alguien adivinó la contraseña de admin. Haz clic en la línea donde entró.', 'Muchos intentos fallidos desde la misma dirección y luego un éxito…'],
        ['Huellas de contraseñas', 'Las webs no guardan tu contraseña. Guardan un hash —una huella de un solo sentido— y comparan huellas.', 'Nuestro hash de juguete multiplica las cifras. El PIN de Dana tiene hash 24. ¿Cuál puede ser?', 'Multiplica las cifras de cada PIN: 1×2×3×4 = ?'],
        ['La máscara XOR', 'XOR compara dos casillas: iguales → apagada, distintas → encendida. La clave que esconde una imagen también la recupera.', 'Pulsa XOR para poner la clave sobre el secreto y escribe la cifra que ves.', 'Pulsa el botón XOR.'],
        ['¿Qué enlace es real?', 'Las webs falsas copian nombres famosos. La web real es el nombre que va justo antes de la primera "/".', '¿Qué enlace lleva de verdad a superbank.com?', 'Mira lo que va justo antes de la primera "/".'],
        ['Las letras son números', 'Cada letra tiene un número (A = 65, B = 66 …). La computadora guarda esos números con ceros y unos.', 'Convierte los dos bytes en letras y escribe la palabra.', '01001000 = 64 + 8 = 72 = H'],
        ['Un segundo candado', 'El inicio de sesión en dos pasos pide algo más, como un código en tu teléfono: una contraseña robada no basta.', 'Un ladrón averiguó tu contraseña. ¿Qué todavía lo detiene?', '¿Cuál necesita algo que el ladrón no tiene?'],
        ['Escondido en una imagen', 'La esteganografía esconde un mensaje dentro de una imagen cambiando los colores tan poco que el ojo no lo nota.', 'Aumenta las pequeñas diferencias de color para revelar el código y escríbelo.', 'Arrastra la barra de AUMENTO hasta el final.'],
        ['Una contraseña, cinco puertas', 'Los atacantes prueban una contraseña filtrada en todas las webs. Usa una contraseña distinta en cada web: un gestor de contraseñas las recuerda por ti.', 'Maya usa la misma contraseña en 5 webs. Hackean una. ¿Cuántas de sus cuentas están en peligro?', 'El atacante prueba la contraseña filtrada en todas partes.'],
        ['Clave desconocida', '¿No sabes la clave? ¡Pruébalas todas! Eso es fuerza bruta, y funciona porque hay pocas claves.', 'Esta palabra se desplazó con una clave que nadie te dijo. Gira la rueda hasta que tenga sentido.', 'Sigue girando: uno de los desplazamientos da una palabra real.'],
        ['Archivos ocultos', 'En Linux, los archivos cuyo nombre empieza con un punto están ocultos. El comando ls -a los muestra.', 'Encuentra el archivo oculto y lee la bandera. Luego escribe el número de la bandera.', 'Escribe ls -a y después cat con el nombre del archivo oculto.'],
        ['Una pizca de sal', 'La sal son letras al azar que se añaden antes del hash, así dos contraseñas iguales dan hashes distintos.', 'Dos usuarios eligieron cat123. SIN sal, sus hashes guardados son…', 'Misma contraseña entra, mismo hash sale.'],
        ['Demasiado bueno para ser verdad', 'Premios gratis, cuentas atrás y peticiones de contraseña son el cebo clásico de los estafadores.', 'Haz clic en las 4 líneas sospechosas de este mensaje.', 'Premios, prisas, enlaces raros y pedir secretos.'],
        ['XOR a mano', 'La regla XOR: dos bits iguales dan 0, dos bits distintos dan 1.', 'Mensaje 1010 XOR clave 0110 = ? Escribe los 4 bits.', 'Bit a bit: 1 y 0 son distintos, así que 1.'],
        ['Misión final: la bandera', 'Los hackers de "sombrero blanco" usan sus habilidades solo con permiso, para que internet sea más seguro.', 'Abre el código, descifra el secreto y gira la rueda para leer la bandera.', 'Código → clic en el secreto → gira la rueda → USAR ESTA.'],
      ],
      safe: ['Prueba solo computadoras y cuentas que sean tuyas o que tengas permiso para probar.', 'Probar la contraseña de otra persona, aunque sea en broma, va contra la ley.', '¿Encontraste un fallo de seguridad? Avisa al dueño o a un adulto. Nunca lo uses.', 'Practica hacking solo en juegos de entrenamiento hechos para eso, como los sitios CTF.',
        'Nunca compartas tu contraseña, ni siquiera con tu mejor amigo.', 'Las empresas de verdad nunca te piden la contraseña por mensaje.', 'Los defensores leen los registros para proteger a la gente, no para espiarla.', 'Los hackers de sombrero blanco piden permiso primero y luego ayudan a arreglar lo que encuentran.'],
      o8: ['Cerca de 1 segundo', 'Cerca de 1 hora', 'Cerca de 1 semana', 'Cerca de 100 años'],
      o16: ['Un código enviado a mi teléfono', 'Un nombre de usuario más largo', 'Una foto de perfil más chula', 'Un apodo nuevo'],
      o21: ['Exactamente iguales', 'Distintos', 'Vacíos'],
      mail: ['De: SuperBank <support@superbank-alerts.xyz>', '¡¡¡URGENTE!!! ¡Tu cuenta se cierra en 1 hora!', 'Hola, querido cliente:', 'Encontramos un pequeño problema en tu cuenta.', 'Responde con tu contraseña para que podamos arreglarlo.', 'Gracias, el equipo de SuperBank'],
      chat: ['Premios Gemzorp 🎁', '¡¡¡Ganaste 10.000 gemas gratis!!!', '¡Rápido, la oferta termina en 5 minutos!', 'Recógelas aquí: gemzorp-free-gems.win', '¡Que tengas un gran día!', 'Escribe tu contraseña y el número de tarjeta de tu padre o tu madre para recibirlas.'],
    },
    fr: {
      title: 'Jeune Hacker',
      help: ['24 missions de cybersécurité sur un ordinateur rétro : codes secrets, chiffres, hameçonnage et plus', 'Lis la mission, puis clique, allume ou tape ta réponse', 'Bloqué ? Prends un indice (il coûte une étoile)', 'Tout ça, c’est pour de faux : pirater pour de vrai, seulement avec permission !'],
      mission: 'MISSION {n}/24', safeT: 'SÛR ET LÉGAL', hint: '? INDICE', hintCost: '(coûte une étoile)', granted: 'ACCÈS AUTORISÉ', denied: 'ACCÈS REFUSÉ',
      typeHere: 'tape la réponse…', enter: 'ENTRÉE', shift: 'DÉCALAGE', use: 'C’EST ÇA', cipher: 'CHIFFRÉ', decoded: 'DÉCHIFFRÉ', target: 'CIBLE', sum: 'SOMME',
      found: '{n} sur {m} trouvées', viewSrc: 'VOIR LE CODE', viewPage: 'VOIR LA PAGE', club: 'Club des Robots', members: 'Réservé aux membres : tape le code du club',
      srcNote: 'pense-bête : à effacer avant la mise en ligne ! code du club =', clickDecode: 'clique sur une note pour la décoder', doorCode: 'CODE DE LA PORTE : 8813',
      decoy1: 'Liste de courses : lait, pain, pommes', decoy2: 'Blague : pourquoi l’ordinateur a-t-il éternué ? Il avait un virus !',
      xorBtn: 'XOR', keyT: 'CLÉ', secretT: 'SECRET', resultT: 'RÉSULTAT', boost: 'AMPLIFIER',
      shHelp: 'commandes : ls, ls -a, cat <fichier>, pwd, whoami, clear', shNotes: 'Psst… les fichiers cachés commencent par un point.', shNo: 'commande introuvable', shNoFile: 'fichier introuvable',
      step1: 'ouvre le code', step2: 'décode le secret', step3: 'tourne la roue',
      lv: [
        ['Le décalage secret', 'Le chiffre de César avance chaque lettre dans l’alphabet. Pour lire, recule chaque lettre.', 'Chaque lettre a avancé de 1. Déchiffre le mot.', 'Appuie une fois sur ◀ sur la roue, ou remplace chaque lettre par celle d’avant.'],
        ['Combien de codes ?', 'Chaque chiffre en plus multiplie par 10 le nombre de codes possibles.', 'Un cadenas de vélo a 3 molettes, chacune de 0 à 9. Combien de codes différents existe-t-il ?', 'Les codes vont de 000 à 999 — et 000 compte aussi !'],
        ['Des lampes qui comptent', 'Les ordinateurs comptent seulement avec 0 et 1. Chaque lampe vaut le double de la lampe à sa droite.', 'Allume des lampes dont la somme fait {n} pour ouvrir la porte.', 'Commence par la plus grande lampe qui rentre : 8, puis 4, puis 1.'],
        ['Un e-mail louche', 'L’hameçonnage (phishing) est un faux message qui essaie de te piéger pour obtenir ton mot de passe.', 'Clique sur les 3 lignes suspectes de cet e-mail.', 'Regarde l’adresse de l’expéditeur, les mots pressants et ce qu’on te demande d’envoyer.'],
        ['Des secrets dans le code', 'Chaque page web a un code source que tout le monde peut ouvrir et lire. Les secrets n’ont rien à y faire !', 'La page du Club des Robots demande un code. Cherche-le dans le code source et tape-le.', 'Appuie sur VOIR LE CODE et cherche un commentaire : <!-- … -->'],
        ['Le mot de passe le plus solide', 'Long et au hasard bat court et malin. Quatre mots au hasard font un mot de passe solide et facile à retenir.', 'Quel mot de passe est le plus difficile à deviner ?', 'Les pirates essaient d’abord des mots courants avec un chiffre et ! à la fin.'],
        ['Base64 n’est pas un cadenas', 'Base64 écrit n’importe quelle donnée avec des lettres et des chiffres. Il ne cache rien : tout le monde peut le décoder.', 'Une de ces notes cache le code de la porte. Décode-les et tape le code.', 'Clique sur chaque note pour la décoder.'],
        ['Un million d’essais par seconde', 'Un ordinateur peut essayer environ un million de codes par seconde. Les codes courts tombent vite : c’est pour ça que les sites se bloquent après quelques erreurs.', 'Combien de temps pour essayer TOUS les 1 000 000 codes à 6 chiffres ?', 'Un million de codes, un million par seconde.'],
        ['Décaler de trois', 'Jules César décalait ses lettres de 3. Avec la clé, déchiffrer est facile.', 'Chaque lettre a avancé de 3. Déchiffre le mot.', 'Tourne la roue de 3 crans en arrière.'],
        ['Compter en hexadécimal', 'L’hexadécimal compte avec 16 chiffres : 0–9 puis A–F (A = 10 … F = 15). Les couleurs et les adresses mémoire l’utilisent.', 'Combien vaut 1F en nombres normaux ? Tape-le.', '1F = 1×16 + 15'],
        ['Lis le journal', 'Un journal (log) est le carnet de bord d’un ordinateur. Les défenseurs le lisent pour repérer un intrus.', 'Quelqu’un a deviné le mot de passe d’admin. Clique sur la ligne où il est entré.', 'Beaucoup d’échecs depuis la même adresse, puis une réussite…'],
        ['Les empreintes des mots de passe', 'Les sites ne gardent pas ton mot de passe. Ils gardent un hash — une empreinte à sens unique — et comparent les empreintes.', 'Notre hash jouet multiplie les chiffres. Le code de Dana a le hash 24. Lequel peut-ce être ?', 'Multiplie les chiffres de chaque code : 1×2×3×4 = ?'],
        ['Le masque XOR', 'XOR compare deux cases : pareilles → éteinte, différentes → allumée. La clé qui cache une image la fait aussi revenir.', 'Appuie sur XOR pour poser la clé sur le secret, puis tape le chiffre que tu vois.', 'Appuie sur le bouton XOR.'],
        ['Quel lien est le vrai ?', 'Les faux sites copient des noms connus. Le vrai site est le nom juste avant le premier « / ».', 'Quel lien mène vraiment à superbank.com ?', 'Regarde ce qui vient juste avant le premier « / ».'],
        ['Les lettres sont des nombres', 'Chaque lettre a un numéro (A = 65, B = 66 …). L’ordinateur garde ces nombres en 0 et en 1.', 'Transforme les deux octets en lettres et tape le mot.', '01001000 = 64 + 8 = 72 = H'],
        ['Un deuxième cadenas', 'La connexion en deux étapes demande autre chose, comme un code sur ton téléphone : un mot de passe volé ne suffit pas.', 'Un voleur connaît ton mot de passe. Qu’est-ce qui l’arrête encore ?', 'Lequel demande une chose que le voleur n’a pas ?'],
        ['Caché dans une image', 'La stéganographie cache un message dans une image en changeant les couleurs si peu que l’œil ne voit rien.', 'Amplifie les minuscules différences de couleur pour révéler le code, puis tape-le.', 'Fais glisser la barre AMPLIFIER jusqu’au bout.'],
        ['Un mot de passe, cinq portes', 'Les pirates essaient un mot de passe volé sur tous les sites. Utilise un mot de passe différent par site : un gestionnaire de mots de passe s’en souvient pour toi.', 'Maya utilise le même mot de passe sur 5 sites. Un site est piraté. Combien de ses comptes sont en danger ?', 'Le pirate essaie le mot de passe volé partout.'],
        ['Clé inconnue', 'Tu ne connais pas la clé ? Essaie-les toutes ! C’est la force brute, et ça marche car il y a peu de clés.', 'Ce mot a été décalé avec une clé que personne ne t’a dite. Tourne la roue jusqu’à ce qu’il ait un sens.', 'Continue de tourner : un des décalages donne un vrai mot.'],
        ['Fichiers cachés', 'Sous Linux, les fichiers dont le nom commence par un point sont cachés. La commande ls -a les montre.', 'Trouve le fichier caché et lis le drapeau. Puis tape le nombre du drapeau.', 'Tape ls -a, puis cat et le nom du fichier caché.'],
        ['Une pincée de sel', 'Le sel, ce sont des lettres au hasard ajoutées avant le hash : deux mots de passe identiques donnent alors des hash différents.', 'Deux utilisateurs ont choisi cat123. SANS sel, leurs hash enregistrés sont…', 'Même mot de passe en entrée, même hash en sortie.'],
        ['Trop beau pour être vrai', 'Cadeaux gratuits, comptes à rebours et demandes de mot de passe sont l’appât classique des arnaqueurs.', 'Clique sur les 4 lignes suspectes de ce message.', 'Cadeaux, urgence, liens bizarres et demande de secrets.'],
        ['XOR à la main', 'La règle XOR : deux bits égaux donnent 0, deux bits différents donnent 1.', 'Message 1010 XOR clé 0110 = ? Tape les 4 bits.', 'Bit par bit : 1 et 0 sont différents, donc 1.'],
        ['Mission finale : le drapeau', 'Les hackers « chapeau blanc » utilisent leurs talents seulement avec permission, pour rendre internet plus sûr.', 'Ouvre le code, décode le secret, puis tourne la roue pour lire le drapeau.', 'Code → clic sur le secret → tourne la roue → C’EST ÇA.'],
      ],
      safe: ['Teste seulement les ordinateurs et les comptes qui sont à toi — ou que tu as la permission de tester.', 'Essayer le mot de passe de quelqu’un d’autre, même pour rire, c’est interdit par la loi.', 'Tu as trouvé une faille ? Préviens le propriétaire ou un adulte. Ne l’utilise jamais.', 'Entraîne-toi seulement sur des jeux faits pour ça, comme les sites de CTF.',
        'Ne partage jamais ton mot de passe — même pas avec ton meilleur ami.', 'Les vraies entreprises ne demandent jamais ton mot de passe par message.', 'Les défenseurs lisent les journaux pour protéger les gens, pas pour les espionner.', 'Les hackers chapeau blanc demandent d’abord la permission, puis aident à réparer ce qu’ils trouvent.'],
      o8: ['Environ 1 seconde', 'Environ 1 heure', 'Environ 1 semaine', 'Environ 100 ans'],
      o16: ['Un code envoyé sur mon téléphone', 'Un nom d’utilisateur plus long', 'Une photo de profil plus cool', 'Un nouveau surnom'],
      o21: ['Exactement les mêmes', 'Différents', 'Vides'],
      mail: ['De : SuperBank <support@superbank-alerts.xyz>', 'URGENT !!! Ton compte sera fermé dans 1 heure !', 'Bonjour cher client,', 'Nous avons trouvé un petit problème sur ton compte.', 'Réponds avec ton mot de passe pour que nous le réparions.', 'Merci, l’équipe SuperBank'],
      chat: ['Cadeaux Gemzorp 🎁', 'Tu as gagné 10 000 gemmes gratuites !!!', 'Vite, l’offre se termine dans 5 minutes !', 'C’est ici : gemzorp-free-gems.win', 'Bonne journée !', 'Tape ton mot de passe et le numéro de carte d’un parent pour les recevoir.'],
    },
    pt: {
      title: 'Jovem Hacker',
      help: ['24 missões de cibersegurança num computador retrô: cifras, códigos, phishing e mais', 'Leia a missão e depois clique, acenda ou digite sua resposta', 'Travou? Peça uma dica (custa uma estrela)', 'Tudo aqui é de mentirinha — invadir de verdade só com permissão!'],
      mission: 'MISSÃO {n}/24', safeT: 'SEGURO E LEGAL', hint: '? DICA', hintCost: '(custa uma estrela)', granted: 'ACESSO LIBERADO', denied: 'ACESSO NEGADO',
      typeHere: 'digite a resposta…', enter: 'ENTRAR', shift: 'DESLOCAR', use: 'USAR ESTA', cipher: 'CIFRA', decoded: 'DECIFRADO', target: 'ALVO', sum: 'SOMA',
      found: '{n} de {m} encontradas', viewSrc: 'VER CÓDIGO', viewPage: 'VER PÁGINA', club: 'Clube dos Robôs', members: 'Só para sócios — digite o código do clube',
      srcNote: 'lembrete: apagar antes de publicar! código do clube =', clickDecode: 'clique numa nota para decifrá-la', doorCode: 'CÓDIGO DA PORTA: 8813',
      decoy1: 'Lista de compras: leite, pão, maçãs', decoy2: 'Piada: por que o computador espirrou? Ele pegou um vírus!',
      xorBtn: 'XOR', keyT: 'CHAVE', secretT: 'SEGREDO', resultT: 'RESULTADO', boost: 'REALÇAR',
      shHelp: 'comandos: ls, ls -a, cat <arquivo>, pwd, whoami, clear', shNotes: 'Psiu… arquivos ocultos começam com um ponto.', shNo: 'comando não encontrado', shNoFile: 'arquivo não existe',
      step1: 'abra o código', step2: 'decifre o segredo', step3: 'gire a roda',
      lv: [
        ['O deslocamento secreto', 'A cifra de César avança cada letra no alfabeto. Para ler, volte cada letra.', 'Cada letra avançou 1. Decifre a palavra.', 'Aperte ◀ uma vez na roda, ou troque cada letra pela anterior.'],
        ['Quantos códigos?', 'Cada dígito a mais multiplica por 10 o número de códigos possíveis.', 'Um cadeado de bicicleta tem 3 rodinhas, cada uma de 0 a 9. Quantos códigos diferentes existem?', 'Os códigos vão de 000 a 999 — e o 000 também conta!'],
        ['Lâmpadas que contam', 'Computadores contam só com 0 e 1. Cada lâmpada vale o dobro da lâmpada à sua direita.', 'Acenda lâmpadas que somem {n} para abrir a porta.', 'Comece pela maior lâmpada que cabe: 8, depois 4, depois 1.'],
        ['E-mail suspeito', 'Phishing é uma mensagem falsa que tenta enganar você para entregar sua senha.', 'Clique nas 3 linhas suspeitas deste e-mail.', 'Veja o endereço de quem enviou, as palavras de pressa e o que pedem para você enviar.'],
        ['Segredos no código', 'Toda página da web tem um código-fonte que qualquer um pode abrir e ler. Segredos não ficam lá!', 'A página do Clube dos Robôs pede um código. Procure no código-fonte e digite.', 'Aperte VER CÓDIGO e procure um comentário: <!-- … -->'],
        ['A senha mais forte', 'Longa e aleatória ganha de curta e esperta. Quatro palavras aleatórias formam uma senha forte e fácil de lembrar.', 'Qual senha é a mais difícil de adivinhar?', 'Os atacantes tentam primeiro palavras comuns com um número e ! no fim.'],
        ['Base64 não é cadeado', 'Base64 escreve qualquer dado com letras e números. Ele não esconde nada — qualquer um pode decodificar.', 'Uma destas notas esconde o código da porta. Decifre e digite o código.', 'Clique em cada nota para decifrá-la.'],
        ['Um milhão de tentativas por segundo', 'Um computador pode tentar cerca de um milhão de códigos por segundo. Códigos curtos caem rápido — por isso os sites bloqueiam depois de alguns erros.', 'Quanto tempo leva para tentar TODOS os 1.000.000 de códigos de 6 dígitos?', 'Um milhão de códigos, um milhão por segundo.'],
        ['Deslocar três', 'Júlio César deslocava as letras em 3. Com a chave, decifrar é fácil.', 'Cada letra avançou 3. Decifre a palavra.', 'Gire a roda 3 passos para trás.'],
        ['Contando em hexadecimal', 'O hexadecimal conta com 16 dígitos: 0–9 e depois A–F (A = 10 … F = 15). Cores e endereços de memória usam ele.', 'Quanto é 1F em números normais? Digite.', '1F = 1×16 + 15'],
        ['Leia o registro', 'Um registro (log) é o diário do computador. Os defensores leem para achar um invasor.', 'Alguém adivinhou a senha do admin. Clique na linha em que ele entrou.', 'Muitas tentativas erradas do mesmo endereço e depois um acerto…'],
        ['Impressões digitais de senhas', 'Os sites não guardam sua senha. Guardam um hash — uma impressão digital de mão única — e comparam as impressões.', 'Nosso hash de brinquedo multiplica os dígitos. O PIN da Dana tem hash 24. Qual pode ser?', 'Multiplique os dígitos de cada PIN: 1×2×3×4 = ?'],
        ['A máscara XOR', 'XOR compara dois quadradinhos: iguais → apagado, diferentes → aceso. A chave que esconde uma imagem também a traz de volta.', 'Aperte XOR para pôr a chave sobre o segredo e digite o número que aparece.', 'Aperte o botão XOR.'],
        ['Qual link é de verdade?', 'Sites falsos copiam nomes famosos. O site verdadeiro é o nome que vem logo antes da primeira "/".', 'Qual link leva de verdade a superbank.com?', 'Veja o que vem logo antes da primeira "/".'],
        ['Letras são números', 'Cada letra tem um número (A = 65, B = 66 …). O computador guarda esses números em zeros e uns.', 'Transforme os dois bytes em letras e digite a palavra.', '01001000 = 64 + 8 = 72 = H'],
        ['Um segundo cadeado', 'O login em duas etapas pede algo a mais, como um código no seu celular: uma senha roubada sozinha não basta.', 'Um ladrão descobriu sua senha. O que ainda o impede?', 'Qual precisa de algo que o ladrão não tem?'],
        ['Escondido na imagem', 'A esteganografia esconde uma mensagem dentro de uma imagem mudando as cores tão pouco que o olho não percebe.', 'Realce as pequenas diferenças de cor para revelar o código e digite.', 'Arraste a barra REALÇAR até o fim.'],
        ['Uma senha, cinco portas', 'Os atacantes testam uma senha vazada em todos os sites. Use uma senha diferente em cada site — um gerenciador de senhas lembra para você.', 'Maya usa a mesma senha em 5 sites. Um site é invadido. Quantas contas dela correm perigo?', 'O atacante testa a senha vazada em todo lugar.'],
        ['Chave desconhecida', 'Não sabe a chave? Teste todas! Isso é força bruta — funciona porque há poucas chaves.', 'Esta palavra foi deslocada com uma chave que ninguém contou. Gire a roda até fazer sentido.', 'Continue girando: um dos deslocamentos dá uma palavra de verdade.'],
        ['Arquivos ocultos', 'No Linux, arquivos cujo nome começa com um ponto ficam ocultos. O comando ls -a mostra eles.', 'Ache o arquivo oculto e leia a bandeira. Depois digite o número da bandeira.', 'Digite ls -a e depois cat com o nome do arquivo oculto.'],
        ['Uma pitada de sal', 'O sal são letras aleatórias adicionadas antes do hash, para que duas senhas iguais tenham hashes diferentes.', 'Dois usuários escolheram cat123. SEM sal, os hashes guardados deles são…', 'Mesma senha entra, mesmo hash sai.'],
        ['Bom demais para ser verdade', 'Prêmios grátis, contagens regressivas e pedidos de senha são a isca clássica dos golpistas.', 'Clique nas 4 linhas suspeitas desta mensagem.', 'Prêmios, pressa, links estranhos e pedidos de segredos.'],
        ['XOR na mão', 'A regra do XOR: dois bits iguais dão 0, dois bits diferentes dão 1.', 'Mensagem 1010 XOR chave 0110 = ? Digite os 4 bits.', 'Bit a bit: 1 e 0 são diferentes, então 1.'],
        ['Missão final: a bandeira', 'Hackers de "chapéu branco" usam suas habilidades só com permissão, para deixar a internet mais segura.', 'Abra o código, decifre o segredo e gire a roda para ler a bandeira.', 'Código → clique no segredo → gire a roda → USAR ESTA.'],
      ],
      safe: ['Teste só computadores e contas que são seus — ou que você tem permissão para testar.', 'Tentar a senha de outra pessoa, mesmo de brincadeira, é contra a lei.', 'Achou uma falha de segurança? Conte ao dono ou a um adulto. Nunca use.', 'Treine invasões só em jogos de treino feitos para isso, como os sites de CTF.',
        'Nunca compartilhe sua senha — nem com seu melhor amigo.', 'Empresas de verdade nunca pedem sua senha por mensagem.', 'Os defensores leem registros para proteger as pessoas, não para espioná-las.', 'Hackers de chapéu branco pedem permissão primeiro e depois ajudam a consertar o que acharam.'],
      o8: ['Cerca de 1 segundo', 'Cerca de 1 hora', 'Cerca de 1 semana', 'Cerca de 100 anos'],
      o16: ['Um código enviado ao meu celular', 'Um nome de usuário mais longo', 'Uma foto de perfil mais legal', 'Um apelido novo'],
      o21: ['Exatamente iguais', 'Diferentes', 'Vazios'],
      mail: ['De: SuperBank <support@superbank-alerts.xyz>', 'URGENTE!!! Sua conta será fechada em 1 hora!', 'Olá, querido cliente,', 'Encontramos um probleminha na sua conta.', 'Responda com sua senha para podermos consertar.', 'Obrigado, equipe SuperBank'],
      chat: ['Prêmios Gemzorp 🎁', 'Você ganhou 10.000 gemas grátis!!!', 'Corra — a oferta acaba em 5 minutos!', 'Resgate aqui: gemzorp-free-gems.win', 'Tenha um ótimo dia!', 'Digite sua senha e o número do cartão de um dos seus pais para resgatar.'],
    },
    ru: {
      title: 'Юный хакер',
      help: ['24 миссии по кибербезопасности на ретро-компьютере: шифры, коды, фишинг и не только', 'Прочитай задание, потом нажимай, включай или вводи ответ', 'Застрял? Возьми подсказку (она стоит одну звезду)', 'Здесь всё понарошку — по-настоящему взламывать можно только с разрешения!'],
      mission: 'МИССИЯ {n}/24', safeT: 'БЕЗОПАСНО И ЗАКОННО', hint: '? ПОДСКАЗКА', hintCost: '(стоит звезду)', granted: 'ДОСТУП РАЗРЕШЁН', denied: 'ДОСТУП ЗАПРЕЩЁН',
      typeHere: 'введи ответ…', enter: 'ВВОД', shift: 'СДВИГ', use: 'ЭТО ОНО', cipher: 'ШИФР', decoded: 'РАСШИФРОВКА', target: 'ЦЕЛЬ', sum: 'СУММА',
      found: 'найдено {n} из {m}', viewSrc: 'ПОКАЗАТЬ КОД', viewPage: 'ПОКАЗАТЬ СТРАНИЦУ', club: 'Клуб роботов', members: 'Только для членов клуба — введи код',
      srcNote: 'напоминалка: удалить перед запуском! код клуба =', clickDecode: 'нажми на записку, чтобы расшифровать', doorCode: 'КОД ДВЕРИ: 8813',
      decoy1: 'Список покупок: молоко, хлеб, яблоки', decoy2: 'Шутка: почему компьютер чихнул? Он подхватил вирус!',
      xorBtn: 'XOR', keyT: 'КЛЮЧ', secretT: 'СЕКРЕТ', resultT: 'РЕЗУЛЬТАТ', boost: 'УСИЛИТЬ',
      shHelp: 'команды: ls, ls -a, cat <файл>, pwd, whoami, clear', shNotes: 'Тсс… скрытые файлы начинаются с точки.', shNo: 'команда не найдена', shNoFile: 'нет такого файла',
      step1: 'открой код', step2: 'расшифруй секрет', step3: 'поверни колесо',
      lv: [
        ['Тайный сдвиг', 'Шифр Цезаря сдвигает каждую букву вперёд по алфавиту. Чтобы прочитать, сдвинь каждую букву назад.', 'Каждая буква сдвинута вперёд на 1. Расшифруй слово.', 'Нажми ◀ на колесе один раз или замени каждую букву предыдущей.'],
        ['Сколько кодов?', 'Каждая лишняя цифра умножает число возможных кодов на 10.', 'У велозамка 3 колёсика, на каждом от 0 до 9. Сколько всего разных кодов?', 'Коды идут от 000 до 999 — и 000 тоже считается!'],
        ['Лампочки считают', 'Компьютеры считают только нулями и единицами. Каждая лампочка вдвое больше лампочки справа.', 'Включи лампочки, которые в сумме дают {n}, и дверь откроется.', 'Начни с самой большой подходящей: 8, потом 4, потом 1.'],
        ['Подозрительное письмо', 'Фишинг — это поддельное сообщение, которое пытается выманить у тебя пароль.', 'Нажми на 3 подозрительные строки в этом письме.', 'Посмотри на адрес отправителя, на слова, которые торопят, и на то, что у тебя просят.'],
        ['Секреты в коде', 'У каждой веб-страницы есть исходный код, который любой может открыть и прочитать. Секретам там не место!', 'Страница Клуба роботов просит код. Найди его в исходном коде и введи.', 'Нажми ПОКАЗАТЬ КОД и найди комментарий: <!-- … -->'],
        ['Самый надёжный пароль', 'Длинный и случайный лучше короткого и хитрого. Четыре случайных слова — надёжный пароль, который легко запомнить.', 'Какой пароль труднее всего угадать?', 'Взломщики сначала пробуют обычные слова с цифрой и ! на конце.'],
        ['Base64 — не замок', 'Base64 записывает любые данные буквами и цифрами. Он ничего не прячет — расшифровать может любой.', 'В одной из записок спрятан код двери. Расшифруй их и введи код.', 'Нажми на каждую записку, чтобы расшифровать.'],
        ['Миллион попыток в секунду', 'Компьютер может перебрать около миллиона кодов в секунду. Короткие коды падают быстро — поэтому сайты блокируются после нескольких ошибок.', 'Сколько времени нужно, чтобы перебрать ВСЕ 1 000 000 шестизначных кодов?', 'Миллион кодов, миллион в секунду.'],
        ['Сдвиг на три', 'Юлий Цезарь сдвигал буквы на 3. Если знаешь ключ, расшифровать легко.', 'Каждая буква сдвинута вперёд на 3. Расшифруй слово.', 'Поверни колесо на 3 шага назад.'],
        ['Счёт в шестнадцатеричной', 'Шестнадцатеричная система считает 16 цифрами: 0–9 и дальше A–F (A = 10 … F = 15). Её используют цвета и адреса памяти.', 'Сколько будет 1F в обычных числах? Введи ответ.', '1F = 1×16 + 15'],
        ['Прочитай журнал', 'Журнал (лог) — это дневник компьютера. Защитники читают его, чтобы найти взломщика.', 'Кто-то угадал пароль admin. Нажми на строку, где он вошёл.', 'Много неудачных попыток с одного адреса, а потом успех…'],
        ['Отпечатки паролей', 'Сайты не хранят твой пароль. Они хранят хеш — односторонний отпечаток — и сравнивают отпечатки.', 'Наш игрушечный хеш перемножает цифры. У PIN-кода Даны хеш 24. Каким он может быть?', 'Перемножь цифры каждого кода: 1×2×3×4 = ?'],
        ['Маска XOR', 'XOR сравнивает две клетки: одинаковые → темно, разные → светится. Ключ, который прячет картинку, и возвращает её.', 'Нажми XOR, чтобы наложить ключ на секрет, и введи цифру, которую увидишь.', 'Нажми кнопку XOR.'],
        ['Какая ссылка настоящая?', 'Поддельные сайты копируют известные имена. Настоящий сайт — это имя прямо перед первой «/».', 'Какая ссылка на самом деле ведёт на superbank.com?', 'Посмотри, что стоит прямо перед первой «/».'],
        ['Буквы — это числа', 'У каждой буквы есть номер (A = 65, B = 66 …). Компьютер хранит эти числа нулями и единицами.', 'Преврати два байта в буквы и введи слово.', '01001000 = 64 + 8 = 72 = H'],
        ['Второй замок', 'Двухэтапный вход просит что-то ещё, например код на телефоне, — одного украденного пароля мало.', 'Вор узнал твой пароль. Что его всё равно остановит?', 'Что требует того, чего у вора нет?'],
        ['Спрятано в картинке', 'Стеганография прячет сообщение в картинке, меняя цвета так слабо, что глаз не замечает.', 'Усиль крошечные различия цвета, чтобы увидеть код, и введи его.', 'Перетащи ползунок УСИЛИТЬ до конца.'],
        ['Один пароль — пять дверей', 'Взломщики пробуют украденный пароль на всех сайтах. Используй разные пароли для разных сайтов — их запомнит менеджер паролей.', 'Майя использует один пароль на 5 сайтах. Один сайт взломали. Сколько её аккаунтов в опасности?', 'Взломщик пробует украденный пароль везде.'],
        ['Неизвестный ключ', 'Не знаешь ключ? Попробуй все! Это полный перебор — он работает, потому что ключей мало.', 'Это слово сдвинули ключом, который тебе не сказали. Крути колесо, пока не получится слово.', 'Продолжай крутить: один из сдвигов даст настоящее слово.'],
        ['Скрытые файлы', 'В Linux файлы, имя которых начинается с точки, скрыты. Команда ls -a их показывает.', 'Найди скрытый файл и прочитай флаг. Потом введи число из флага.', 'Введи ls -a, а потом cat и имя скрытого файла.'],
        ['Щепотка соли', 'Соль — это случайные буквы, которые добавляют перед хешированием, чтобы у одинаковых паролей были разные хеши.', 'Два пользователя выбрали cat123. БЕЗ соли их сохранённые хеши…', 'Одинаковый пароль на входе — одинаковый хеш на выходе.'],
        ['Слишком хорошо, чтобы быть правдой', 'Бесплатные призы, обратный отсчёт и просьбы о пароле — любимая наживка мошенников.', 'Нажми на 4 подозрительные строки в этом сообщении.', 'Призы, спешка, странные ссылки и просьба о секретах.'],
        ['XOR вручную', 'Правило XOR: два одинаковых бита дают 0, два разных — 1.', 'Сообщение 1010 XOR ключ 0110 = ? Введи 4 бита.', 'Бит за битом: 1 и 0 разные, значит 1.'],
        ['Финальная миссия: флаг', 'Хакеры в «белых шляпах» используют свои умения только с разрешения, чтобы интернет стал безопаснее.', 'Открой код, расшифруй секрет и поверни колесо, чтобы прочитать флаг.', 'Код → нажми на секрет → поверни колесо → ЭТО ОНО.'],
      ],
      safe: ['Проверяй только свои компьютеры и аккаунты — или те, которые тебе разрешили проверять.', 'Пробовать чужой пароль, даже в шутку, — против закона.', 'Нашёл дыру в защите? Расскажи владельцу или взрослому. Никогда ею не пользуйся.', 'Тренируйся во взломе только в учебных играх, созданных для этого, например на сайтах CTF.',
        'Никому не говори свой пароль — даже лучшему другу.', 'Настоящие компании никогда не просят пароль в сообщении.', 'Защитники читают журналы, чтобы защищать людей, а не шпионить за ними.', 'Хакеры в белых шляпах сначала спрашивают разрешения, а потом помогают исправить найденное.'],
      o8: ['Около 1 секунды', 'Около 1 часа', 'Около 1 недели', 'Около 100 лет'],
      o16: ['Код, присланный на мой телефон', 'Более длинное имя пользователя', 'Более крутая аватарка', 'Новый ник'],
      o21: ['Совершенно одинаковые', 'Разные', 'Пустые'],
      mail: ['От: SuperBank <support@superbank-alerts.xyz>', 'СРОЧНО!!! Твой аккаунт закроют через 1 час!', 'Здравствуй, дорогой клиент!', 'Мы нашли небольшую проблему в твоём аккаунте.', 'Пришли в ответ свой пароль, чтобы мы всё исправили.', 'Спасибо, команда SuperBank'],
      chat: ['Призы Gemzorp 🎁', 'Ты выиграл 10 000 бесплатных кристаллов!!!', 'Скорее — акция закончится через 5 минут!', 'Забрать здесь: gemzorp-free-gems.win', 'Хорошего дня!', 'Введи свой пароль и номер карты родителей, чтобы получить приз.'],
    },
    de: {
      title: 'Junger Hacker',
      help: ['24 Cyber-Missionen auf einem Retro-Computer: Geheimschriften, Codes, Phishing und mehr', 'Lies die Mission, dann klicke, schalte oder tippe deine Antwort', 'Komm nicht weiter? Nimm einen Tipp (kostet einen Stern)', 'Alles hier ist nur gespielt – echtes Hacken nur mit Erlaubnis!'],
      mission: 'MISSION {n}/24', safeT: 'SICHER & LEGAL', hint: '? TIPP', hintCost: '(kostet einen Stern)', granted: 'ZUGRIFF ERLAUBT', denied: 'ZUGRIFF VERWEIGERT',
      typeHere: 'Antwort eintippen…', enter: 'ENTER', shift: 'VERSCHIEBUNG', use: 'DAS IST ES', cipher: 'GEHEIMTEXT', decoded: 'ENTSCHLÜSSELT', target: 'ZIEL', sum: 'SUMME',
      found: '{n} von {m} gefunden', viewSrc: 'QUELLTEXT', viewPage: 'SEITE ZEIGEN', club: 'Roboter-Club', members: 'Nur für Mitglieder – gib den Club-Code ein',
      srcNote: 'Notiz: vor dem Start löschen! Club-Code =', clickDecode: 'klicke auf eine Notiz, um sie zu entschlüsseln', doorCode: 'TÜRCODE: 8813',
      decoy1: 'Einkaufsliste: Milch, Brot, Äpfel', decoy2: 'Witz: Warum hat der Computer geniest? Er hatte einen Virus!',
      xorBtn: 'XOR', keyT: 'SCHLÜSSEL', secretT: 'GEHEIMNIS', resultT: 'ERGEBNIS', boost: 'VERSTÄRKEN',
      shHelp: 'Befehle: ls, ls -a, cat <Datei>, pwd, whoami, clear', shNotes: 'Psst… versteckte Dateien beginnen mit einem Punkt.', shNo: 'Befehl nicht gefunden', shNoFile: 'Datei nicht gefunden',
      step1: 'Quelltext öffnen', step2: 'Geheimnis entschlüsseln', step3: 'Rad drehen',
      lv: [
        ['Die geheime Verschiebung', 'Die Caesar-Verschlüsselung schiebt jeden Buchstaben im Alphabet nach vorn. Zum Lesen schiebst du jeden Buchstaben zurück.', 'Jeder Buchstabe wurde um 1 nach vorn geschoben. Entschlüssle das Wort.', 'Drück einmal ◀ am Rad oder ersetze jeden Buchstaben durch den davor.'],
        ['Wie viele Codes?', 'Jede zusätzliche Ziffer macht zehnmal so viele mögliche Codes.', 'Ein Fahrradschloss hat 3 Rädchen, jedes von 0 bis 9. Wie viele verschiedene Codes gibt es?', 'Die Codes gehen von 000 bis 999 – und 000 zählt auch!'],
        ['Lampen, die zählen', 'Computer zählen nur mit 0 und 1. Jede Lampe ist doppelt so viel wert wie die Lampe rechts daneben.', 'Schalte Lampen ein, die zusammen {n} ergeben, dann geht die Tür auf.', 'Fang mit der größten Lampe an, die noch passt: 8, dann 4, dann 1.'],
        ['Komische E-Mail', 'Phishing ist eine gefälschte Nachricht, die dich dazu bringen will, ein Passwort zu verraten.', 'Klicke auf die 3 verdächtigen Zeilen in dieser E-Mail.', 'Prüf die Absenderadresse, Wörter, die dich hetzen, und was du schicken sollst.'],
        ['Geheimnisse im Quelltext', 'Jede Webseite hat einen Quelltext, den jeder öffnen und lesen kann. Geheimnisse gehören da nicht hin!', 'Die Seite des Roboter-Clubs will einen Code. Such ihn im Quelltext und tipp ihn ein.', 'Drück QUELLTEXT und such einen Kommentar: <!-- … -->'],
        ['Das stärkste Passwort', 'Lang und zufällig schlägt kurz und schlau. Vier zufällige Wörter sind ein starkes Passwort, das man sich leicht merkt.', 'Welches Passwort ist am schwersten zu erraten?', 'Angreifer probieren zuerst bekannte Wörter mit einer Zahl und ! am Ende.'],
        ['Base64 ist kein Schloss', 'Base64 schreibt beliebige Daten mit Buchstaben und Ziffern. Es versteckt nichts – jeder kann es entschlüsseln.', 'Eine dieser Notizen versteckt den Türcode. Entschlüssle sie und tipp den Code ein.', 'Klicke auf jede Notiz, um sie zu entschlüsseln.'],
        ['Eine Million Versuche pro Sekunde', 'Ein Computer kann etwa eine Million Codes pro Sekunde ausprobieren. Kurze Codes fallen schnell – darum sperren Seiten nach ein paar Fehlversuchen.', 'Wie lange dauert es, ALLE 1.000.000 sechsstelligen Codes auszuprobieren?', 'Eine Million Codes, eine Million pro Sekunde.'],
        ['Um drei verschoben', 'Julius Caesar hat seine Buchstaben um 3 verschoben. Mit dem Schlüssel ist das Entschlüsseln leicht.', 'Jeder Buchstabe wurde um 3 nach vorn geschoben. Entschlüssle das Wort.', 'Dreh das Rad 3 Schritte zurück.'],
        ['Zählen in Hex', 'Hex zählt mit 16 Ziffern: 0–9 und dann A–F (A = 10 … F = 15). Farben und Speicheradressen benutzen es.', 'Wie viel ist Hex 1F in normalen Zahlen? Tipp es ein.', '1F = 1×16 + 15'],
        ['Lies das Protokoll', 'Ein Protokoll (Log) ist das Tagebuch eines Computers. Verteidiger lesen es, um Eindringlinge zu entdecken.', 'Jemand hat das Admin-Passwort erraten. Klicke auf die Zeile, in der er hineingekommen ist.', 'Viele Fehlversuche von derselben Adresse, dann ein Erfolg…'],
        ['Fingerabdrücke von Passwörtern', 'Webseiten speichern dein Passwort nicht. Sie speichern einen Hash – einen Fingerabdruck in nur eine Richtung – und vergleichen Fingerabdrücke.', 'Unser Spielzeug-Hash multipliziert die Ziffern. Danas PIN hat den Hash 24. Welche PIN kann es sein?', 'Multipliziere die Ziffern jeder PIN: 1×2×3×4 = ?'],
        ['Die XOR-Maske', 'XOR vergleicht zwei Kästchen: gleich → dunkel, verschieden → hell. Der Schlüssel, der ein Bild versteckt, holt es auch zurück.', 'Drück XOR, um den Schlüssel auf das Geheimnis zu legen, und tipp die Ziffer ein, die du siehst.', 'Drück den XOR-Knopf.'],
        ['Welcher Link ist echt?', 'Gefälschte Seiten kopieren bekannte Namen. Die echte Seite ist der Name direkt vor dem ersten „/“.', 'Welcher Link führt wirklich zu superbank.com?', 'Schau, was direkt vor dem ersten „/“ steht.'],
        ['Buchstaben sind Zahlen', 'Jeder Buchstabe hat eine Zahl (A = 65, B = 66 …). Der Computer speichert diese Zahlen als Nullen und Einsen.', 'Mach aus den zwei Bytes Buchstaben und tipp das Wort ein.', '01001000 = 64 + 8 = 72 = H'],
        ['Ein zweites Schloss', 'Die Anmeldung in zwei Schritten verlangt noch etwas, zum Beispiel einen Code auf deinem Handy – ein gestohlenes Passwort allein reicht nicht.', 'Ein Dieb kennt dein Passwort. Was hält ihn trotzdem auf?', 'Was braucht etwas, das der Dieb nicht hat?'],
        ['Im Bild versteckt', 'Steganografie versteckt eine Nachricht in einem Bild, indem sie die Farben so wenig ändert, dass das Auge nichts merkt.', 'Verstärke die winzigen Farbunterschiede, um den Code zu sehen, und tipp ihn ein.', 'Zieh den Regler VERSTÄRKEN ganz nach oben.'],
        ['Ein Passwort, fünf Türen', 'Angreifer probieren ein geklautes Passwort auf allen Seiten aus. Nimm für jede Seite ein anderes Passwort – ein Passwort-Manager merkt sie sich für dich.', 'Maya benutzt dasselbe Passwort auf 5 Seiten. Eine Seite wird gehackt. Wie viele ihrer Konten sind in Gefahr?', 'Der Angreifer probiert das geklaute Passwort überall.'],
        ['Unbekannter Schlüssel', 'Du kennst den Schlüssel nicht? Probier alle! Das heißt Brute Force – es klappt, weil es nur wenige Schlüssel gibt.', 'Dieses Wort wurde mit einem Schlüssel verschoben, den dir niemand verraten hat. Dreh das Rad, bis es Sinn ergibt.', 'Dreh weiter: Eine der Verschiebungen ergibt ein echtes Wort.'],
        ['Versteckte Dateien', 'Unter Linux sind Dateien versteckt, deren Name mit einem Punkt beginnt. Der Befehl ls -a zeigt sie.', 'Finde die versteckte Datei und lies die Flagge. Dann tipp die Zahl aus der Flagge ein.', 'Tipp ls -a, dann cat und den Namen der versteckten Datei.'],
        ['Eine Prise Salz', 'Salz sind zufällige Buchstaben, die vor dem Hashen dazukommen – so bekommen zwei gleiche Passwörter verschiedene Hashes.', 'Zwei Nutzer haben cat123 gewählt. OHNE Salz sind ihre gespeicherten Hashes…', 'Gleiches Passwort rein, gleicher Hash raus.'],
        ['Zu schön, um wahr zu sein', 'Gratis-Preise, Countdowns und Fragen nach dem Passwort sind der typische Köder von Betrügern.', 'Klicke auf die 4 verdächtigen Zeilen in dieser Nachricht.', 'Preise, Zeitdruck, komische Links und die Frage nach Geheimnissen.'],
        ['XOR von Hand', 'Die XOR-Regel: Zwei gleiche Bits ergeben 0, zwei verschiedene Bits ergeben 1.', 'Nachricht 1010 XOR Schlüssel 0110 = ? Tipp die 4 Bits ein.', 'Bit für Bit: 1 und 0 sind verschieden, also 1.'],
        ['Letzte Mission: die Flagge', 'White-Hat-Hacker setzen ihr Können nur mit Erlaubnis ein, um das Internet sicherer zu machen.', 'Öffne den Quelltext, entschlüssle das Geheimnis und dreh dann das Rad, um die Flagge zu lesen.', 'Quelltext → aufs Geheimnis klicken → Rad drehen → DAS IST ES.'],
      ],
      safe: ['Teste nur Computer und Konten, die dir gehören – oder für die du eine Erlaubnis hast.', 'Das Passwort von jemand anderem auszuprobieren ist verboten – auch als Spaß.', 'Eine Sicherheitslücke gefunden? Sag es dem Besitzer oder einem Erwachsenen. Nutze sie nie aus.', 'Übe Hacken nur in Trainingsspielen, die dafür gemacht sind, wie CTF-Seiten.',
        'Verrate nie dein Passwort – nicht mal deinem besten Freund.', 'Echte Firmen fragen nie per Nachricht nach deinem Passwort.', 'Verteidiger lesen Protokolle, um Menschen zu schützen, nicht um sie auszuspionieren.', 'White-Hat-Hacker fragen zuerst um Erlaubnis und helfen dann, das Gefundene zu reparieren.'],
      o8: ['Etwa 1 Sekunde', 'Etwa 1 Stunde', 'Etwa 1 Woche', 'Etwa 100 Jahre'],
      o16: ['Ein Code, der an mein Handy geschickt wird', 'Ein längerer Benutzername', 'Ein cooleres Profilbild', 'Ein neuer Spitzname'],
      o21: ['Genau gleich', 'Verschieden', 'Leer'],
      mail: ['Von: SuperBank <support@superbank-alerts.xyz>', 'DRINGEND!!! Dein Konto wird in 1 Stunde geschlossen!', 'Hallo, lieber Kunde,', 'Wir haben ein kleines Problem mit deinem Konto gefunden.', 'Antworte mit deinem Passwort, damit wir es reparieren können.', 'Danke, dein SuperBank-Team'],
      chat: ['Gemzorp-Gewinne 🎁', 'Du hast 10.000 Gratis-Edelsteine gewonnen!!!', 'Schnell – das Angebot endet in 5 Minuten!', 'Hier abholen: gemzorp-free-gems.win', 'Hab einen schönen Tag!', 'Gib dein Passwort und die Kartennummer deiner Eltern ein, um sie zu bekommen.'],
    },
  };
  const KH = { he: 'Esc — השהיה', en: 'Esc — pause', ar: 'Esc — إيقاف مؤقت', es: 'Esc — pausa', fr: 'Échap — pause', pt: 'Esc — pausa', ru: 'Esc — пауза', de: 'Esc — Pause' };
  for (const L in KH) TEXT[L].keysHint = KH[L];
  const MSGT = { he: 'הודעה', en: 'MESSAGE', ar: 'الرسالة', es: 'MENSAJE', fr: 'MESSAGE', pt: 'MENSAGEM', ru: 'СООБЩЕНИЕ', de: 'NACHRICHT' };
  for (const L in MSGT) TEXT[L].msgT = MSGT[L];

  // ----- מקומות קבועים על המסך (משותפים לציור וללחיצה) -----
  const OPT = i => ({ a: 'opt', i, x: RX + 24, y: RY + 120 + i * 76, w: RW - 48, h: 62 });
  const BIT = i => ({ a: 'bit', i, x: RX + 44 + i * 71 - 30, y: RY + 190, w: 60, h: 60 });
  const LINE = i => ({ a: 'line', i, x: RX + 20, y: RY + 64 + i * 62, w: RW - 40, h: 54 });
  const NOTE = i => ({ a: 'note', i, x: RX + 20, y: RY + 70 + i * 120, w: RW - 40, h: 104 });
  const LOGL = i => ({ a: 'log', i, x: RX + 14, y: RY + 56 + i * 32, w: RW - 28, h: 30 });
  const SRCB = { a: 'src', x: RX + RW - 214, y: RY + 12, w: 200, h: 40 };
  const XORB = { a: 'xor', x: RX + RW / 2 - 80, y: RY + 330, w: 160, h: 50 };
  const SLIDE = { a: 'slide', x: RX + 150, y: RY + 372, w: 360, h: 34 };
  const HINTB = { a: 'hint', x: LX + 16, y: LY + LH - 58, w: LW - 32, h: 44 };
  const ENTB = { a: 'enter', x: RX + RW - 118, y: TY + 4, w: 112, h: TH - 8 };
  const wheelBtns = y => [{ a: 'wl', x: RX + 150, y, w: 64, h: 54 }, { a: 'wr', x: RX + RW - 214, y, w: 64, h: 54 }, { a: 'use', x: RX + RW / 2 - 100, y: y + 118, w: 200, h: 46 }];
  const SECB = { a: 'secret', x: RX + 20, y: RY + 186, w: RW - 40, h: 30 };
  const TYPING = { caesar: 1, source: 1, b64: 1, type: 1, xor: 1, stego: 1, shell: 1, final: 1 };
  const digits = s => String(s == null ? '' : s).replace(/\D/g, '');

  // ----- שלב חדש -----
  function setupLevel(g) {
    const S = g.s, i = clamp((g.level | 0) - 1, 0, LV.length - 1), d = LV[i];
    S.i = i; S.def = d; S.bad = new Set(); S.badT = -9; S.badI = -1;
    if (d.k === 'caesar') {
      const A = alphaOf(g.lang), w = CWORDS[g.lang][d.w];
      S.key = d.brute ? 2 + Math.floor(Math.random() * (A.length - 4)) : d.shift;
      S.plain = w; S.alpha = A; S.cipher = shiftWord(w, S.key, A); S.wheel = 0;
    } else if (d.k === 'bits') S.bits = [0, 0, 0, 0, 0, 0, 0, 0];
    else if (d.k === 'phish') S.marks = new Set();
    else if (d.k === 'source') S.src = false;
    else if (d.k === 'b64') S.notes = g.shuffle([g.t('decoy1'), g.t('doorCode'), g.t('decoy2')]).map(t => ({ t, b: b64(t), open: false }));
    else if (d.k === 'xor') {
      const dg = g.ri(2, 9), key = [], sec = [];
      for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) {
        const k = Math.random() < 0.5 ? 1 : 0, on = x >= 1 && x <= 5 && y >= 1 && y <= 7 && digOn(dg, x - 1, y - 1) ? 1 : 0;
        key.push(k); sec.push(k ^ on);
      }
      S.xor = { key, sec, on: false, digit: dg };
    } else if (d.k === 'stego') {
      const code = String(g.ri(1, 9)) + g.ri(0, 9) + g.ri(0, 9) + g.ri(0, 9), mask = new Uint8Array(40 * 24);
      [...code].forEach((c, n) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (digOn(+c, x, y)) mask[(8 + y) * 40 + 4 + n * 9 + x] = 1; });
      S.stego = { code, mask, boost: 0, drag: false };
    } else if (d.k === 'shell') S.sh = ['CyberOS 2.6 — kid@cyber', g.t('shHelp'), ''];
    else if (d.k === 'final') { S.fin = { src: false, dec: false }; S.alpha = ALPHA.lat; S.cipher = 'ZKLWHKDW'; S.key = 3; S.wheel = 0; S.plain = 'WHITEHAT'; }
  }

  // ----- פעולות השחקן (העכבר, המקלדת והבוט עוברים כולם דרך כאן) -----
  function win(g) {
    const S = g.s;
    if (S.done) return;
    S.done = true; S.flashT = g.time; S.flashOk = true;
    S.stars = Math.max(1, 3 - (S.hint ? 1 : 0) - (S.wrong >= 2 ? 1 : 0));
    g.sfx('power');
    g.burst(RX + RW / 2, RY + RH / 2, { n: 40, color: [GREEN, PALE, '#7dffb4'], speed: 5, life: 60, gravity: 0.05, shape: 'square', size: 5 });
    S.rain = [];
    for (let k = 0; k < 46; k++) S.rain.push({ x: RX + Math.random() * RW, y: RY - Math.random() * 200, v: 4 + Math.random() * 5, c: Math.random() < 0.5 ? '0' : '1' });
    g.after(1.5, () => g.completeLevel(S.stars));
  }
  function fail(g, i) {
    const S = g.s;
    if (S.done) return;
    S.wrong++; S.flashT = g.time; S.flashOk = false; S.badT = g.time; S.badI = i == null ? -1 : i;
    g.sfx('error'); g.shake(7);
  }
  function submit(g, raw) {
    const S = g.s, d = S.def;
    if (!d || S.done) return;
    const txt = String(raw == null ? '' : raw).trim();
    if (!txt) return;
    if (d.k === 'shell') return shell(g, txt);
    let ok;
    if (d.k === 'caesar' || d.k === 'final') ok = normA(txt) === normA(S.plain);
    else if (d.k === 'source' || d.k === 'b64') ok = digits(txt) === (d.code || '');
    else if (d.k === 'xor') ok = digits(txt) === String(S.xor.digit);
    else if (d.k === 'stego') ok = digits(txt) === S.stego.code;
    else if (d.k === 'type') ok = normA(txt) === normA(d.ans);
    if (ok) win(g); else fail(g);
  }
  function shell(g, cmd) {
    const S = g.s, low = cmd.toLowerCase().replace(/\s+/g, ' ').trim(), out = s => S.sh.push(s);
    if (digits(cmd) === S.def.ans && !/^(cat|ls|echo)\b/.test(low)) return win(g);
    out('kid@cyber:~$ ' + cmd);
    if (low === 'ls') out('games  notes.txt');
    else if (/^ls -(a|la|al)$/.test(low)) out('.  ..  .secret  games  notes.txt');
    else if (low === 'cat notes.txt') out(g.t('shNotes'));
    else if (low === 'cat .secret') { out('FLAG: ' + S.def.ans); g.sfx('coin'); }
    else if (low === 'ls games' || low === 'cd games') out('maze  rocket-race');
    else if (low.startsWith('cat ')) out('cat: ' + cmd.slice(4).trim() + ': ' + g.t('shNoFile'));
    else if (low === 'pwd') out('/home/kid');
    else if (low === 'whoami') out('kid');
    else if (low === 'help') out(g.t('shHelp'));
    else if (low === 'clear') S.sh.length = 0;
    else if (/^\d+$/.test(low)) { out(g.t('denied')); fail(g); }
    else out(cmd.split(' ')[0] + ': ' + g.t('shNo'));
    if (S.sh.length > 40) S.sh.splice(0, S.sh.length - 40);
    g.sfx('tick');
  }
  function wheelBy(g, dlt) { const S = g.s; S.wheel = ((S.wheel + dlt) % S.alpha.length + S.alpha.length) % S.alpha.length; g.sfx('tick', { p: 1 + S.wheel * 0.02 }); }
  const decoded = S => shiftWord(S.cipher, -S.wheel, S.alpha);
  function act(g, b) {
    const S = g.s, d = S.def;
    if (!d || S.done) return;
    switch (b.a) {
      case 'hint': if (!S.hint) { S.hint = true; g.sfx('pop'); } break;
      case 'enter': { const inp = g.yh.input; submit(g, inp.value); inp.value = ''; break; }
      case 'opt': if (b.i === d.ans) win(g); else if (!S.bad.has(b.i)) { S.bad.add(b.i); fail(g, b.i); } break;
      case 'bit': {
        S.bits[b.i] ^= 1;
        g.sfx(S.bits[b.i] ? 'place' : 'click');
        if (S.bits.reduce((s, v, k) => s + v * (128 >> k), 0) === d.target) win(g);
        break;
      }
      case 'line':
        if (d.bad.includes(b.i)) { if (!S.marks.has(b.i)) { S.marks.add(b.i); g.sfx('coin'); if (S.marks.size === d.bad.length) win(g); } }
        else fail(g, b.i);
        break;
      case 'src': if (d.k === 'final') { S.fin.src = !S.fin.src; } else S.src = !S.src; g.sfx('whoosh'); break;
      case 'note': if (!S.notes[b.i].open) { S.notes[b.i].open = true; g.sfx('pop'); } break;
      case 'log': if (b.i === d.ans) win(g); else fail(g, b.i); break;
      case 'xor': S.xor.on = !S.xor.on; g.sfx('laser'); break;
      case 'secret': if (!S.fin.dec) { S.fin.dec = true; g.sfx('pop'); } break;
      case 'wl': wheelBy(g, -1); break;
      case 'wr': wheelBy(g, 1); break;
      case 'use': submit(g, decoded(S)); break;
    }
  }
  function slideTo(g, x) { const S = g.s; S.stego.boost = clamp((x - SLIDE.x) / SLIDE.w, 0, 1); }
  function buttons(g) {
    const S = g.s, d = S.def, out = [];
    if (!d || S.done) return out;
    out.push(HINTB);
    if (TYPING[d.k]) out.push(ENTB);
    if (d.k === 'choice') (d.tOpts ? g.t(d.tOpts) : d.opts).forEach((o, i) => out.push(OPT(i)));
    else if (d.k === 'bits') for (let i = 0; i < 8; i++) out.push(BIT(i));
    else if (d.k === 'phish') for (let i = 0; i < 6; i++) out.push(LINE(i));
    else if (d.k === 'source') out.push(SRCB);
    else if (d.k === 'b64') S.notes.forEach((n, i) => out.push(NOTE(i)));
    else if (d.k === 'log') LOG.forEach((l, i) => out.push(LOGL(i)));
    else if (d.k === 'xor') out.push(XORB);
    else if (d.k === 'stego') out.push(SLIDE);
    else if (d.k === 'caesar') out.push(...wheelBtns(RY + 226));
    else if (d.k === 'final') { out.push(SRCB); if (S.fin.src && !S.fin.dec) out.push(SECB); if (S.fin.dec) out.push(...wheelBtns(RY + 270)); }
    return out;
  }
  function press(g, a, i) { const b = g.s.btns.find(q => q.a === a && (i == null || q.i === i)); if (b) act(g, b); return !!b; }

  // ----- בוט לבדיקות: פותר כל שלב דרך אותם כפתורים ואותה שורת הקלדה -----
  function botStep(g) {
    const S = g.s, d = S.def;
    if (!d || S.done || ++S.bt % 24) return;
    const n = S.alpha ? S.alpha.length : 26, toKey = () => { const k = ((S.key - S.wheel) % n + n) % n; if (!k) press(g, 'use'); else press(g, k <= n / 2 ? 'wr' : 'wl'); };
    switch (d.k) {
      case 'caesar': toKey(); break;
      case 'choice': press(g, 'opt', d.ans); break;
      case 'bits': { const i = S.bits.findIndex((v, k) => v !== ((d.target & (128 >> k)) ? 1 : 0)); if (i >= 0) press(g, 'bit', i); break; }
      case 'phish': press(g, 'line', d.bad.find(i => !S.marks.has(i))); break;
      case 'source': if (!S.src) press(g, 'src'); else submit(g, d.code); break;
      case 'b64': { const i = S.notes.findIndex(x => !x.open); if (i >= 0) press(g, 'note', i); else submit(g, d.code); break; }
      case 'log': press(g, 'log', d.ans); break;
      case 'xor': if (!S.xor.on) press(g, 'xor'); else submit(g, String(S.xor.digit)); break;
      case 'stego': if (S.stego.boost < 1) slideTo(g, SLIDE.x + SLIDE.w * (S.stego.boost + 0.34)); else submit(g, S.stego.code); break;
      case 'shell': { const st = S.botSh = (S.botSh || 0) + 1; submit(g, st === 1 ? 'ls -a' : st === 2 ? 'cat .secret' : d.ans); break; }
      case 'type': submit(g, d.ans); break;
      case 'final': if (!S.fin.src) press(g, 'src'); else if (!S.fin.dec) press(g, 'secret'); else toKey(); break;
    }
  }

  // ----- ציור: עזרים -----
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, o) {
    o = o || {};
    rr(ctx, x, y, w, h, o.r == null ? 8 : o.r);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.line !== false) { ctx.lineWidth = o.lw || 1.5; ctx.strokeStyle = o.line || DIM; ctx.stroke(); }
  }
  const isRtl = g => g.lang === 'he' || g.lang === 'ar';
  const spaced = (g, s) => (g.lang === 'ar' && RTLC.test(s) ? s : [...s].join(' '));
  function btn(g, ctx, b, label, o) {
    o = o || {};
    const hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y), col = o.color || GREEN;
    box(ctx, b.x, b.y, b.w, b.h, { fill: hov ? 'rgba(57,255,136,.22)' : o.fill || 'rgba(57,255,136,.08)', line: col, lw: hov ? 2.5 : 1.5 });
    tx(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, { size: o.size || 18, color: col, align: 'center', maxW: b.w - 14, mono: o.mono, w: 800 });
  }
  // לוח עם "לשונית" כותרת בסגנון חלון של מסוף ישן
  function frame(ctx, x, y, w, h, title, col) {
    box(ctx, x, y, w, h, { fill: 'rgba(4,22,12,.55)', line: col || DIM });
    if (title) {
      ctx.save(); ctx.font = '700 12px ' + MONO;
      const tw = ctx.measureText(title).width + 16;
      ctx.restore();
      ctx.fillStyle = '#031009'; ctx.fillRect(x + 14, y - 8, tw, 16);
      tx(ctx, title, x + 22, y, { size: 12, color: col || DIM, mono: true, dir: 'ltr' });
    }
  }
  function lock(ctx, x, y, s, open, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, open ? -26 : -18, 14, Math.PI, open ? Math.PI * 1.85 : 0); if (!open) ctx.lineTo(14, -6); ctx.moveTo(-14, open ? -26 : -18); ctx.lineTo(-14, -6); ctx.stroke();
    ctx.fillStyle = col; rr(ctx, -22, -8, 44, 34, 6); ctx.fill();
    ctx.fillStyle = '#031009'; ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-2, 6, 4, 10);
    ctx.restore();
  }

  // ----- ציור: הפאזלים -----
  function drawStrip(g, ctx, S, y) {
    const A = [...S.alpha], n = A.length, cw = (RW - 40) / n, fs = Math.min(18, cw * 0.82), rtl = S.alpha === ALPHA.he || S.alpha === ALPHA.ar;
    const used = new Set([...S.cipher]);
    for (let i = 0; i < n; i++) {
      const cx = rtl ? RX + RW - 20 - (i + 0.5) * cw : RX + 20 + (i + 0.5) * cw, c2 = A[(i + S.wheel) % n];
      tx(ctx, A[i], cx, y, { size: fs, color: PALE, align: 'center', mono: true });
      tx(ctx, '↓', cx, y + 19, { size: 10, color: DIM, align: 'center' });
      if (used.has(c2)) box(ctx, cx - cw / 2 + 1, y + 28, cw - 2, 24, { fill: 'rgba(255,191,71,.18)', line: false, r: 4 });
      tx(ctx, c2, cx, y + 40, { size: fs, color: used.has(c2) ? AMBER : DIM, align: 'center', mono: true });
    }
  }
  function drawWheel(g, ctx, S, y0) {
    const [wl, wr, use] = wheelBtns(y0), cx = RX + RW / 2;
    btn(g, ctx, wl, '◀', { size: 24 }); btn(g, ctx, wr, '▶', { size: 24 });
    tx(ctx, g.t('shift') + ': ' + S.wheel, cx, y0 + 27, { size: 22, color: GREEN, align: 'center', mono: true, w: 800 });
    const dec = decoded(S), right = normA(dec) === normA(S.plain);
    tx(ctx, g.t('decoded'), cx, y0 + 66, { size: 12, color: DIM, align: 'center', mono: true });
    tx(ctx, spaced(g, dec), cx, y0 + 94, { size: 30, color: right ? GREEN : PALE, align: 'center', mono: true, w: 800, glow: right ? GREEN : null });
    btn(g, ctx, use, g.t('use'), { color: AMBER, size: 17 });
  }
  function drawCaesar(g, ctx, S) {
    tx(ctx, g.t('cipher'), RX + RW / 2, RY + 30, { size: 13, color: DIM, align: 'center', mono: true });
    tx(ctx, spaced(g, S.cipher), RX + RW / 2, RY + 70, { size: 40, color: AMBER, align: 'center', mono: true, w: 800, glow: AMBER });
    drawStrip(g, ctx, S, RY + 122);
    drawWheel(g, ctx, S, RY + 226);
  }
  function choiceArt(g, ctx, i, t) {
    const cx = RX + RW / 2, cy = RY + 58;
    ctx.save(); ctx.strokeStyle = GREEN; ctx.fillStyle = GREEN; ctx.lineWidth = 3;
    if (i === 1) { for (let k = 0; k < 3; k++) { box(ctx, cx - 75 + k * 52, cy - 26, 46, 52, { line: GREEN, fill: 'rgba(57,255,136,.08)' }); tx(ctx, String(Math.floor(t * 6 + k * 3) % 10), cx - 52 + k * 52, cy + 1, { size: 30, color: AMBER, align: 'center', mono: true }); } }
    else if (i === 5) { box(ctx, cx - 150, cy - 20, 300, 40, { line: GREEN }); tx(ctx, '••••••••' + (Math.floor(t * 2) % 2 ? '|' : ''), cx - 136, cy + 2, { size: 22, color: PALE, mono: true, dir: 'ltr' }); lock(ctx, cx + 120, cy + 8, 0.7, false, AMBER); }
    else if (i === 7) { ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t * 6) * 24, cy + Math.sin(t * 6) * 24); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 16); ctx.stroke(); }
    else if (i === 11) { for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(cx, cy + 4, 8 + k * 6, 12 + k * 6, 0, Math.PI * 1.05, Math.PI * 1.95 + (k % 2) * 0.6); ctx.stroke(); } }
    else if (i === 13) { box(ctx, cx - 190, cy - 20, 380, 40, { line: CYAN, r: 20 }); lock(ctx, cx - 168, cy + 4, 0.45, false, CYAN); tx(ctx, 'https://', cx - 146, cy + 1, { size: 18, color: CYAN, mono: true, dir: 'ltr' }); tx(ctx, '????????.com', cx - 56, cy + 1, { size: 18, color: AMBER, mono: true, dir: 'ltr' }); }
    else if (i === 15) { box(ctx, cx - 26, cy - 40, 52, 82, { line: GREEN, r: 9 }); tx(ctx, String(100000 + Math.floor(t / 3) % 899999).slice(-6), cx, cy - 2, { size: 13, color: AMBER, align: 'center', mono: true }); ctx.beginPath(); ctx.arc(cx, cy + 32, 4, 0, Math.PI * 2); ctx.fill(); }
    else if (i === 17) { for (let k = 0; k < 5; k++) { const x = cx - 130 + k * 56; box(ctx, x, cy - 30, 40, 60, { line: k === 2 ? RED : GREEN, fill: k === 2 ? 'rgba(255,91,91,.2)' : null, r: 4 }); ctx.beginPath(); ctx.arc(x + 31, cy + 2, 3, 0, Math.PI * 2); ctx.fill(); } }
    else if (i === 20) { ctx.beginPath(); ctx.moveTo(cx - 22, cy + 34); ctx.lineTo(cx - 28, cy - 14); ctx.lineTo(cx + 28, cy - 14); ctx.lineTo(cx + 22, cy + 34); ctx.closePath(); ctx.stroke(); box(ctx, cx - 30, cy - 34, 60, 20, { line: GREEN, r: 6 }); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(cx - 12 + (k % 3) * 12, cy - 26 + (k > 2 ? 6 : 0), 2, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  }
  function drawChoice(g, ctx, S, d) {
    choiceArt(g, ctx, S.i, g.time);
    const opts = d.tOpts ? g.t(d.tOpts) : d.opts, rtl = isRtl(g) && !d.mono;
    opts.forEach((o, i) => {
      const b = OPT(i), bad = S.bad.has(i), hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y) && !bad, shake = bad && g.time - S.badT < 0.4 && S.badI === i ? Math.sin(g.time * 70) * 5 : 0;
      box(ctx, b.x + shake, b.y, b.w, b.h, { fill: bad ? 'rgba(255,91,91,.16)' : hov ? 'rgba(57,255,136,.18)' : 'rgba(57,255,136,.05)', line: bad ? RED : hov ? GREEN : DIM, lw: hov ? 2.5 : 1.5 });
      const kx = rtl ? b.x + b.w - 34 : b.x + 34;
      tx(ctx, '[' + (i + 1) + ']', kx + shake, b.y + b.h / 2, { size: 17, color: bad ? RED : AMBER, align: 'center', mono: true });
      tx(ctx, (bad ? '✗ ' : '') + o, (rtl ? b.x + b.w - 66 : b.x + 66) + shake, b.y + b.h / 2 + 1, { size: d.mono ? 19 : 20, color: bad ? RED : PALE, align: rtl ? 'right' : 'left', mono: d.mono, maxW: b.w - 90, w: 700, dir: d.mono ? 'ltr' : undefined });
    });
  }
  function drawBits(g, ctx, S, d) {
    const sum = S.bits.reduce((s, v, k) => s + v * (128 >> k), 0), ok = sum === d.target;
    tx(ctx, g.t('target') + ': ' + d.target, RX + RW / 2, RY + 60, { size: 30, color: AMBER, align: 'center', mono: true, w: 800, glow: AMBER });
    for (let i = 0; i < 8; i++) {
      const b = BIT(i), cx = b.x + 30, cy = b.y + 30, on = S.bits[i], hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y);
      tx(ctx, String(128 >> i), cx, RY + 160, { size: 16, color: on ? AMBER : DIM, align: 'center', mono: true });
      ctx.save();
      if (on) { ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 26; }
      const gr = ctx.createRadialGradient(cx - 8, cy - 10, 3, cx, cy, 28);
      gr.addColorStop(0, on ? '#fff7cf' : '#1c3326'); gr.addColorStop(1, on ? '#ffb020' : '#0a1a10');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.lineWidth = hov ? 3 : 2; ctx.strokeStyle = on ? '#ffe08a' : hov ? GREEN : DIM; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.stroke();
      tx(ctx, on ? '1' : '0', cx, RY + 286, { size: 24, color: on ? GREEN : DIM, align: 'center', mono: true, w: 800 });
    }
    tx(ctx, g.t('sum') + ' = ' + sum, RX + RW / 2, RY + 350, { size: 30, color: ok ? GREEN : PALE, align: 'center', mono: true, w: 800 });
    lock(ctx, RX + RW / 2, RY + 420, 1, ok, ok ? GREEN : DIM);
  }
  function drawLines(g, ctx, S, d, arr, mail) {
    box(ctx, RX + 14, RY + 14, RW - 28, 38, { fill: 'rgba(92,214,255,.1)', line: CYAN });
    tx(ctx, (mail ? '✉ inbox' : '✉ chat') + '   ' + g.t('found', { n: S.marks.size, m: d.bad.length }), RX + 30, RY + 33, { size: 15, color: CYAN, mono: true, dir: 'ltr' });
    const rtl = isRtl(g);
    arr.forEach((s, i) => {
      const b = LINE(i), m = S.marks.has(i), bad = S.badI === i && g.time - S.badT < 0.5, hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y);
      const sh = bad ? Math.sin(g.time * 70) * 5 : 0;
      box(ctx, b.x + sh, b.y, b.w, b.h, { fill: m ? 'rgba(255,191,71,.2)' : bad ? 'rgba(255,91,91,.2)' : hov ? 'rgba(57,255,136,.12)' : 'rgba(57,255,136,.03)', line: m ? AMBER : bad ? RED : hov ? GREEN : 'rgba(29,122,74,.6)' });
      if (m) tx(ctx, '⚠', rtl ? b.x + 22 : b.x + b.w - 22, b.y + b.h / 2, { size: 20, color: AMBER, align: 'center' });
      tx(ctx, s, (rtl ? b.x + b.w - 14 : b.x + 14) + sh, b.y + b.h / 2 + 1, { size: 16, color: m ? AMBER : PALE, align: rtl ? 'right' : 'left', maxW: b.w - 52, w: 600 });
    });
  }
  function robot(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    rr(ctx, -20, -16, 40, 32, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -26); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -29, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-8, -3, 4, 0, Math.PI * 2); ctx.arc(8, -3, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-8, 7, 16, 3);
    ctx.restore();
  }
  function drawSource(g, ctx, S, showSrc, page, srcLines, secretLine) {
    btn(g, ctx, SRCB, showSrc ? g.t('viewPage') : g.t('viewSrc'), { color: CYAN, size: 15 });
    box(ctx, RX + 14, RY + 60, RW - 28, RH - 74, { fill: showSrc ? 'rgba(0,0,0,.35)' : 'rgba(220,255,235,.07)', line: CYAN });
    if (!showSrc) {
      box(ctx, RX + 26, RY + 72, RW - 52, 32, { fill: 'rgba(92,214,255,.12)', line: false, r: 16 });
      tx(ctx, page.url, RX + 44, RY + 88, { size: 15, color: CYAN, mono: true, dir: 'ltr' });
      robot(ctx, RX + RW / 2, RY + 160, 1.6, GREEN);
      tx(ctx, page.title, RX + RW / 2, RY + 230, { size: 28, color: GREEN, align: 'center', w: 900, glow: GREEN });
      tx(ctx, page.sub, RX + RW / 2, RY + 270, { size: 17, color: PALE, align: 'center', maxW: RW - 80 });
      box(ctx, RX + RW / 2 - 120, RY + 300, 240, 42, { line: GREEN });
      tx(ctx, '_ _ _ _', RX + RW / 2, RY + 322, { size: 22, color: DIM, align: 'center', mono: true });
      return;
    }
    srcLines.forEach((ln, i) => {
      const y = RY + 84 + i * 30, isC = ln.includes('<!--');
      if (i === secretLine) { const b = SECB, hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y); box(ctx, b.x, b.y, b.w, b.h, { fill: hov ? 'rgba(255,191,71,.25)' : 'rgba(255,191,71,.1)', line: AMBER, r: 4 }); }
      tx(ctx, ln, RX + 30, y, { size: 15, color: isC ? AMBER : /^\s*</.test(ln) ? CYAN : PALE, mono: true, dir: 'ltr', maxW: RW - 60 });
    });
  }
  function drawNotes(g, ctx, S) {
    tx(ctx, g.t('clickDecode'), RX + RW / 2, RY + 34, { size: 15, color: DIM, align: 'center' });
    S.notes.forEach((n, i) => {
      const b = NOTE(i), hov = !n.open && g.ptr.over && hitB(b, g.ptr.x, g.ptr.y), rtl = isRtl(g);
      box(ctx, b.x, b.y, b.w, b.h, { fill: hov ? 'rgba(57,255,136,.12)' : 'rgba(57,255,136,.04)', line: n.open ? GREEN : DIM });
      tx(ctx, 'note' + (i + 1) + '.txt', b.x + 14, b.y + 18, { size: 13, color: DIM, mono: true, dir: 'ltr' });
      tx(ctx, n.b, b.x + 14, b.y + 46, { size: 15, color: AMBER, mono: true, dir: 'ltr', maxW: b.w - 28 });
      if (n.open) tx(ctx, '→ ' + n.t, rtl ? b.x + b.w - 14 : b.x + 14, b.y + 80, { size: 17, color: GREEN, align: rtl ? 'right' : 'left', maxW: b.w - 28, w: 800 });
      else tx(ctx, '[ decode ]', b.x + b.w - 70, b.y + 80, { size: 14, color: CYAN, align: 'center', mono: true, dir: 'ltr' });
    });
  }
  function drawLog(g, ctx, S) {
    tx(ctx, '/var/log/auth.log', RX + 20, RY + 30, { size: 15, color: CYAN, mono: true, dir: 'ltr' });
    LOG.forEach((l, i) => {
      const b = LOGL(i), hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y), bad = S.badI === i && g.time - S.badT < 0.5, y = b.y + b.h / 2;
      if (hov || bad) box(ctx, b.x, b.y, b.w, b.h, { fill: bad ? 'rgba(255,91,91,.25)' : 'rgba(57,255,136,.12)', line: bad ? RED : GREEN, r: 4 });
      tx(ctx, l[0], b.x + 10, y, { size: 15, color: DIM, mono: true, dir: 'ltr' });
      tx(ctx, 'LOGIN', b.x + 72, y, { size: 15, color: PALE, mono: true, dir: 'ltr' });
      tx(ctx, l[1].toUpperCase(), b.x + 136, y, { size: 15, color: l[1] === 'ok' ? GREEN : RED, mono: true, dir: 'ltr', w: 800 });
      tx(ctx, 'user=' + l[2], b.x + 200, y, { size: 15, color: PALE, mono: true, dir: 'ltr' });
      tx(ctx, 'ip=' + l[3], b.x + 340, y, { size: 15, color: CYAN, mono: true, dir: 'ltr' });
    });
  }
  function grid(ctx, x, y, cells, cs, on, col) {
    for (let j = 0; j < 9; j++) for (let i = 0; i < 7; i++) {
      ctx.fillStyle = cells ? (cells[j * 7 + i] ? col : 'rgba(29,122,74,.18)') : 'rgba(29,122,74,.12)';
      ctx.fillRect(x + i * cs + 1, y + j * cs + 1, cs - 2, cs - 2);
    }
    if (!cells) tx(ctx, '?', x + cs * 3.5, y + cs * 4.5, { size: 60, color: DIM, align: 'center', mono: true, w: 800 });
    ctx.lineWidth = 1.5; ctx.strokeStyle = on ? col : DIM; ctx.strokeRect(x - 2, y - 2, cs * 7 + 4, cs * 9 + 4);
  }
  function drawXor(g, ctx, S) {
    const X = S.xor, cs = 19, gy = RY + 90, xs = [RX + 40, RX + 227, RX + 414];
    const res = X.on ? X.key.map((k, i) => k ^ X.sec[i]) : null;
    [[g.t('keyT'), X.key, CYAN], [g.t('secretT'), X.sec, AMBER], [g.t('resultT'), res, GREEN]].forEach(([lab, cells, col], i) => {
      tx(ctx, lab, xs[i] + cs * 3.5, gy - 22, { size: 15, color: col, align: 'center', mono: true, w: 800 });
      grid(ctx, xs[i], gy, cells, cs, i < 2 || X.on, col);
    });
    tx(ctx, '⊕', (xs[0] + xs[1] + cs * 7) / 2, gy + cs * 4.5, { size: 30, color: PALE, align: 'center' });
    tx(ctx, '=', (xs[1] + xs[2] + cs * 7) / 2, gy + cs * 4.5, { size: 30, color: PALE, align: 'center' });
    btn(g, ctx, XORB, 'XOR', { color: X.on ? AMBER : GREEN, size: 22, mono: true });
  }
  function stegoColor(x, y) {   // נוף קטן: שמיים, שמש, גבעות ודשא
    if (Math.hypot(x - 35.5, y - 3.5) < 3.2) return [255, 214, 90];   // השמש בפינה, רחוק מהספרות הנסתרות
    if (y > 20) return [52, 150 + (x * 7 + y * 3) % 18, 70];
    if (y > 15 + Math.sin(x * 0.35) * 2.2 + Math.cos(x * 0.13) * 1.5) return [70, 172 + (x * 5) % 20, 90];
    return [90 + y * 4, 160 + y * 3, 235];
  }
  function drawStego(g, ctx, S) {
    const st = S.stego, cs = 12, ox = RX + RW / 2 - 240, oy = RY + 40;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 40; x++) {
      const c = stegoColor(x, y), m = st.mask[y * 40 + x];
      // הסוד: הערוץ האדום גדל ב-1 בלבד. ההגברה מכפילה את ההבדל עד שרואים אותו
      const r = Math.min(255, c[0] + (m ? 1 + st.boost * 220 : 0)), gg = Math.max(0, c[1] - (m ? st.boost * 140 : 0)), bb = Math.max(0, c[2] - (m ? st.boost * 160 : 0));
      ctx.fillStyle = 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ')';
      ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
    }
    ctx.lineWidth = 2; ctx.strokeStyle = DIM; ctx.strokeRect(ox - 1, oy - 1, 40 * cs + 2, 24 * cs + 2);
    tx(ctx, g.t('boost'), SLIDE.x - 16, SLIDE.y + SLIDE.h / 2, { size: 16, color: AMBER, align: 'right', mono: true, w: 800, maxW: 120 });
    box(ctx, SLIDE.x, SLIDE.y + 11, SLIDE.w, 12, { fill: 'rgba(57,255,136,.1)', line: DIM, r: 6 });
    if (st.boost > 0.01) box(ctx, SLIDE.x, SLIDE.y + 11, SLIDE.w * st.boost, 12, { fill: 'rgba(255,191,71,.6)', line: false, r: 6 });
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(SLIDE.x + SLIDE.w * st.boost, SLIDE.y + 17, 13, 0, Math.PI * 2); ctx.fill();
    tx(ctx, Math.round(st.boost * 100) + '%', SLIDE.x + SLIDE.w + 22, SLIDE.y + 17, { size: 16, color: PALE, mono: true, dir: 'ltr' });
  }
  function drawShell(g, ctx, S) {
    box(ctx, RX + 10, RY + 10, RW - 20, RH - 20, { fill: 'rgba(0,0,0,.45)', line: DIM });
    S.sh.slice(-14).forEach((ln, i) => {
      const r = RTLC.test(ln);
      tx(ctx, ln, r ? RX + RW - 26 : RX + 26, RY + 34 + i * 29, { size: 15, color: ln.startsWith('kid@') ? GREEN : ln.startsWith('FLAG') ? AMBER : PALE, mono: true, maxW: RW - 50, align: r ? 'right' : 'left' });
    });
  }
  function drawType(g, ctx, S, d) {
    const cx = RX + RW / 2;
    if (d.show === 'hex') {
      tx(ctx, '1F = ?', cx, RY + 80, { size: 54, color: AMBER, align: 'center', mono: true, w: 800, glow: AMBER, dir: 'ltr' });
      for (let i = 0; i < 16; i++) {
        const x = RX + 40 + i * 34.4, y = RY + 190, hot = i === 15 || i === 1;
        box(ctx, x - 14, y - 22, 28, 66, { fill: hot ? 'rgba(255,191,71,.15)' : null, line: hot ? AMBER : DIM, r: 5 });
        tx(ctx, '0123456789ABCDEF'[i], x, y - 6, { size: 20, color: hot ? AMBER : GREEN, align: 'center', mono: true, w: 800 });
        tx(ctx, String(i), x, y + 24, { size: 14, color: PALE, align: 'center', mono: true });
      }
      tx(ctx, '1F  →  [1]×16 + [F]', cx, RY + 320, { size: 24, color: PALE, align: 'center', mono: true, dir: 'ltr' });
    } else if (d.show === 'ascii') {
      tx(ctx, '01001000  01001001', cx, RY + 70, { size: 40, color: AMBER, align: 'center', mono: true, w: 800, glow: AMBER, dir: 'ltr' });
      tx(ctx, '128 64 32 16 8 4 2 1', cx, RY + 120, { size: 16, color: DIM, align: 'center', mono: true, dir: 'ltr' });
      for (let i = 0; i < 26; i++) {
        const x = RX + 44 + (i % 13) * 41.5, y = RY + 190 + Math.floor(i / 13) * 78;
        box(ctx, x - 18, y - 24, 36, 62, { line: DIM, r: 5 });
        tx(ctx, String.fromCharCode(65 + i), x, y - 6, { size: 20, color: GREEN, align: 'center', mono: true, w: 800 });
        tx(ctx, String(65 + i), x, y + 22, { size: 13, color: PALE, align: 'center', mono: true });
      }
    } else {
      [[g.t('msgT'), '1 0 1 0'], [g.t('keyT'), '0 1 1 0'], ['XOR', '? ? ? ?']].forEach(([lab, bits], i) => {
        tx(ctx, lab, cx - 70, RY + 70 + i * 62, { size: 17, color: i === 2 ? AMBER : DIM, align: 'right', mono: true, w: 800, maxW: 190 });
        tx(ctx, bits, cx - 40, RY + 70 + i * 62, { size: 38, color: i === 2 ? AMBER : PALE, mono: true, w: 800, dir: 'ltr' });
      });
      ctx.fillStyle = DIM; ctx.fillRect(cx - 40, RY + 154, 190, 2);
      [['0', '0', '0'], ['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']].forEach((r, i) => tx(ctx, r[0] + ' ⊕ ' + r[1] + ' = ' + r[2], cx, RY + 290 + i * 34, { size: 22, color: r[2] === '1' ? GREEN : PALE, align: 'center', mono: true, dir: 'ltr' }));
    }
  }
  function drawFinal(g, ctx, S) {
    const steps = [g.t('step1'), g.t('step2'), g.t('step3')], done = [S.fin.src || S.fin.dec, S.fin.dec, false];
    steps.forEach((s, i) => tx(ctx, (done[i] ? '✔ ' : (i + 1) + '. ') + s, isRtl(g) ? RX + RW - 20 - i * 150 : RX + 20 + i * 150, RY + 32, { size: 14, color: done[i] ? GREEN : DIM, maxW: 140, w: 700, align: isRtl(g) ? 'right' : 'left' }));
    if (!S.fin.dec) {
      drawSource(g, ctx, S, S.fin.src, { url: 'http://academy.local/final', title: 'Hacker Academy', sub: g.t('step1') + ' → ' + g.t('step2') },
        ['<html>', '  <body>', '    <h1>Hacker Academy</h1>', '    <!-- secret: ' + FINAL_B64 + ' -->', '    <p>Good luck!</p>', '  </body>', '</html>'], S.fin.src ? 3 : -1);
      return;
    }
    tx(ctx, FINAL_B64 + '  →  ' + S.cipher, RX + RW / 2, RY + 84, { size: 24, color: AMBER, align: 'center', mono: true, dir: 'ltr', w: 800 });
    drawStrip(g, ctx, S, RY + 150);
    drawWheel(g, ctx, S, RY + 270);
  }
  // ----- המסך: מסגרת, קווי סריקה, לוח המשימה, שורת הטרמינל -----
  function drawScreen(ctx, w, h) {
    const k = w / W, gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2b3038'); gr.addColorStop(1, '#121519');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.save(); rr(ctx, SX * k, SY * k, SW * k, SH * k, 22 * k); ctx.clip();
    const sg = ctx.createRadialGradient(w / 2, h / 2, 60 * k, w / 2, h / 2, 640 * k);
    sg.addColorStop(0, '#0c2c19'); sg.addColorStop(1, '#020a05');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function drawCRT(ctx, w, h, t) {
    const k = w / W;
    ctx.save(); rr(ctx, SX * k, SY * k, SW * k, SH * k, 22 * k); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = SY * k; y < (SY + SH) * k; y += 3) ctx.fillRect(SX * k, y, SW * k, 1);
    const by = (SY + ((t * 70) % (SH + 160)) - 80) * k, bg = ctx.createLinearGradient(0, by - 70 * k, 0, by + 70 * k);
    bg.addColorStop(0, 'rgba(57,255,136,0)'); bg.addColorStop(0.5, 'rgba(57,255,136,.045)'); bg.addColorStop(1, 'rgba(57,255,136,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, by - 70 * k, w, 140 * k);
    const vg = ctx.createRadialGradient(w / 2, h / 2, 250 * k, w / 2, h / 2, 640 * k);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.save(); rr(ctx, SX * k, SY * k, SW * k, SH * k, 22 * k); ctx.lineWidth = 3 * k; ctx.strokeStyle = '#05070a'; ctx.stroke(); ctx.restore();
  }
  function shield(ctx, x, y, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(10, -7); ctx.lineTo(9, 3); ctx.quadraticCurveTo(6, 10, 0, 13); ctx.quadraticCurveTo(-6, 10, -9, 3); ctx.lineTo(-10, -7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#031009'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-1, 5); ctx.lineTo(5, -3); ctx.stroke();
    ctx.restore();
  }
  function drawStatus(g, ctx) {
    tx(ctx, '▣ CYBER-OS 2.6', SX + 20, SY + 25, { size: 14, color: DIM, mono: true, dir: 'ltr', w: 800 });
    const S = g.s;
    if (S.def) {
      const best = g.levelStars(S.i + 1);
      tx(ctx, '★'.repeat(best) + '☆'.repeat(3 - best), W / 2, SY + 25, { size: 18, color: AMBER, align: 'center' });
    }
    const d = new Date(), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    tx(ctx, hh + (Math.floor(g.time * 2 + S.clock * 2) % 2 ? ':' : ' ') + mm, SX + SW - 20, SY + 25, { size: 14, color: DIM, mono: true, align: 'right', dir: 'ltr' });
  }
  function drawBrief(g, ctx) {
    const S = g.s, d = S.def, T = g.t('lv')[S.i], rtl = isRtl(g), al = rtl ? 'right' : 'left', x = rtl ? LX + LW - 16 : LX + 16, mw = LW - 32;
    frame(ctx, LX, LY, LW, LH, 'mission.txt');
    const safe = g.t('safe')[d.safe], sl = wrap(ctx, safe, mw - 40, 13, false, 600);
    const hl = S.hint ? wrap(ctx, T[3], mw - 20, 14, false, 700) : null;
    const hintH = hl ? hl.length * 19 + 18 : 44, safeH = sl.length * 18 + 30, safeY = LY + LH - 14 - hintH - 12 - safeH;
    // אם ההסבר ארוך, מקטינים מעט את הגופן כדי שלא ייגע בתיבת "בטוח וחוקי"
    let fs = 15, lay;
    for (; fs >= 12; fs--) {
      lay = { t: wrap(ctx, T[0], mw, fs + 7, false, 900), x: wrap(ctx, T[1], mw, fs, false, 600), q: wrap(ctx, '▸ ' + T[2].replace('{n}', d.target || ''), mw, fs + 1, false, 800) };
      const bottom = LY + 52 + lay.t.length * (fs + 12) + 6 + lay.x.length * (fs + 6) + 18 + lay.q.length * (fs + 7);
      if (bottom < safeY - 6) break;
    }
    let y = LY + 26;
    tx(ctx, g.t('mission', { n: S.i + 1 }), x, y, { size: 13, color: AMBER, align: al, w: 800 });
    y += 26;
    for (const ln of lay.t) { tx(ctx, ln, x, y, { size: fs + 7, color: GREEN, align: al, w: 900 }); y += fs + 12; }
    y += 6;
    for (const ln of lay.x) { tx(ctx, ln, x, y, { size: fs, color: PALE, align: al, w: 600 }); y += fs + 6; }
    ctx.fillStyle = 'rgba(29,122,74,.6)'; ctx.fillRect(LX + 16, y + 2, LW - 32, 1.5);
    y += 18;
    for (const ln of lay.q) { tx(ctx, ln, x, y, { size: fs + 1, color: AMBER, align: al, w: 800 }); y += fs + 7; }
    box(ctx, LX + 12, safeY, LW - 24, safeH, { fill: 'rgba(92,214,255,.08)', line: CYAN });
    shield(ctx, rtl ? LX + LW - 32 : LX + 32, safeY + 22, CYAN);
    tx(ctx, g.t('safeT'), rtl ? LX + LW - 52 : LX + 52, safeY + 16, { size: 12, color: CYAN, align: al, w: 900 });
    sl.forEach((ln, i) => tx(ctx, ln, rtl ? LX + LW - 52 : LX + 52, safeY + 36 + i * 18, { size: 13, color: PALE, align: al, w: 600 }));
    if (hl) {
      const hy = LY + LH - 14 - hintH;
      box(ctx, LX + 12, hy, LW - 24, hintH, { fill: 'rgba(255,191,71,.1)', line: AMBER });
      hl.forEach((ln, i) => tx(ctx, ln, rtl ? LX + LW - 22 : LX + 22, hy + 18 + i * 19, { size: 14, color: AMBER, align: al, w: 700 }));
    } else if (!S.done) btn(g, ctx, HINTB, g.t('hint') + '  ' + g.t('hintCost'), { color: AMBER, size: 15 });
  }
  function drawTerm(g, ctx) {
    const S = g.s, d = S.def;
    frame(ctx, RX, TY, RW, TH, null, TYPING[d.k] ? GREEN : DIM);
    tx(ctx, '>', RX + 18, TY + TH / 2, { size: 20, color: GREEN, mono: true, dir: 'ltr', w: 800 });
    if (TYPING[d.k]) { if (!S.done) btn(g, ctx, ENTB, g.t('enter') + ' ⏎', { size: 15 }); return; }
    const keys = d.k === 'choice' ? '[1] [2] [3] [4]' : d.k === 'bits' ? '[1] … [8]' : '';
    tx(ctx, keys + (Math.floor(g.time * 2) % 2 ? ' ▌' : ''), RX + 40, TY + TH / 2, { size: 16, color: DIM, mono: true, dir: 'ltr' });
  }
  function drawPuzzle(g, ctx) {
    const S = g.s, d = S.def;
    frame(ctx, RX, RY, RW, RH, d.k + '.exe');
    if (d.k === 'caesar') drawCaesar(g, ctx, S);
    else if (d.k === 'choice') drawChoice(g, ctx, S, d);
    else if (d.k === 'bits') drawBits(g, ctx, S, d);
    else if (d.k === 'phish') drawLines(g, ctx, S, d, g.t(d.lines), d.lines === 'mail');
    else if (d.k === 'source') drawSource(g, ctx, S, S.src, { url: 'http://robotclub.local/members', title: g.t('club'), sub: g.t('members') },
      ['<html>', '  <head><title>Robot Club</title></head>', '  <body>', '    <h1>Robot Club</h1>', '    <!-- ' + g.t('srcNote') + ' ' + d.code + ' -->', '    <input placeholder="club code">', '    <button>Enter</button>', '  </body>', '</html>'], -1);
    else if (d.k === 'b64') drawNotes(g, ctx, S);
    else if (d.k === 'log') drawLog(g, ctx, S);
    else if (d.k === 'xor') drawXor(g, ctx, S);
    else if (d.k === 'stego') drawStego(g, ctx, S);
    else if (d.k === 'shell') drawShell(g, ctx, S);
    else if (d.k === 'type') drawType(g, ctx, S, d);
    else if (d.k === 'final') drawFinal(g, ctx, S);
  }
  function drawFlash(g, ctx) {
    const S = g.s, e = g.time - S.flashT;
    if (S.rain) for (const r of S.rain) tx(ctx, r.c, r.x, r.y, { size: 18, color: GREEN, mono: true, alpha: 0.8 });
    if (!(e >= 0 && e < (S.flashOk ? 1.6 : 0.8))) return;
    const a = S.flashOk ? Math.min(1, e * 5) : 1 - e / 0.8, sh = S.flashOk ? 0 : Math.sin(e * 60) * 6 * (1 - e / 0.8);
    ctx.save(); ctx.globalAlpha = a * 0.85;
    box(ctx, RX + 40 + sh, RY + RH / 2 - 52, RW - 80, 104, { fill: S.flashOk ? 'rgba(4,40,20,.92)' : 'rgba(50,6,6,.92)', line: S.flashOk ? GREEN : RED, lw: 3 });
    ctx.restore();
    tx(ctx, g.t(S.flashOk ? 'granted' : 'denied'), RX + RW / 2 + sh, RY + RH / 2 + 2, { size: 40, color: S.flashOk ? GREEN : RED, align: 'center', w: 900, glow: S.flashOk ? GREEN : RED, blur: 18, alpha: a, maxW: RW - 110 });
  }
  function drawDemo(g, ctx) {
    const S = g.s, t = S.clock;
    frame(ctx, LX, LY, LW, LH + TH + 10, 'boot.log');
    const lines = ['CYBER-OS 2.6', '[ OK ] 0101 1100 1010', '[ OK ] ' + g.t('safeT'), '[ OK ] ' + g.t('mission', { n: 1 }), '> ' + (Math.floor(t * 2) % 2 ? '▌' : '')];
    lines.forEach((ln, i) => { if (t * 2.2 > i) tx(ctx, ln, LX + 18, LY + 30 + i * 30, { size: 16, color: i === 0 ? AMBER : GREEN, mono: true, dir: 'ltr', maxW: LW - 36 }); });
    frame(ctx, RX, RY, RW, RH + TH + 10, 'secure.exe');
    ctx.save(); rr(ctx, RX + 2, RY + 2, RW - 4, RH + TH + 6, 8); ctx.clip();
    for (let c = 0; c < 22; c++) {
      const x = RX + 14 + c * 26.5, sp = 40 + (c * 37) % 60, off = (c * 113) % 400;
      for (let r = 0; r < 18; r++) {
        const y = RY + ((t * sp + off + r * 28) % (RH + TH + 40)) - 10;
        tx(ctx, ((c * 7 + r * 3 + Math.floor(t * 3)) % 3) ? '0' : '1', x, y, { size: 16, color: r === 0 ? PALE : GREEN, mono: true, alpha: 0.12 + (r % 5) * 0.05 });
      }
    }
    ctx.restore();
    const open = Math.floor(t / 2.5) % 2 === 1;
    ctx.save(); ctx.shadowColor = open ? GREEN : AMBER; ctx.shadowBlur = 30;
    lock(ctx, RX + RW / 2, RY + (RH + TH) / 2 + 10, 3.2, open, open ? GREEN : AMBER);
    ctx.restore();
  }
  // ----- שכבת ה-DOM: שורת ההקלדה של הטרמינל, מעל הקנבס ובאותו קנה מידה -----
  const CSS = `.yh-layer{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;z-index:2}
.yh-in{position:absolute;pointer-events:auto;box-sizing:border-box;background:transparent;border:0;outline:none;color:#39ff88;font:700 20px Consolas,"Courier New",monospace;padding:0 6px;caret-color:#39ff88;user-select:text;-webkit-user-select:text}
.yh-in::placeholder{color:#1d7a4a}`;
  function makeLayer(g) {
    const st = document.createElement('style');
    st.textContent = CSS;
    const lay = g.el('div', 'yh-layer');
    lay.style.width = W + 'px'; lay.style.height = H + 'px'; lay.hidden = true;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'yh-in'; inp.maxLength = 40; inp.autocomplete = 'off'; inp.spellcheck = false; inp.dir = 'auto';
    inp.setAttribute('autocapitalize', 'off');
    Object.assign(inp.style, { left: (RX + 34) + 'px', top: (TY + 6) + 'px', width: (RW - 166) + 'px', height: (TH - 12) + 'px' });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const v = inp.value; inp.value = ''; if (g.s && g.state === 'play') submit(g, v); }
      else if (e.key === 'Escape') { e.preventDefault(); inp.blur(); g.pause(); }
    });
    lay.appendChild(inp);
    g.root.appendChild(st); g.stage.appendChild(lay);
    g.yh = { style: st, layer: lay, input: inp, lsig: '', cur: '' };
    inp.placeholder = g.t('typeHere');
  }
  function placeLayer(g) {
    const S = g.s, lay = g.yh.layer, show = g.state !== 'menu' && !!S.def && !!TYPING[S.def.k] && !S.done;
    if (lay.hidden === show) lay.hidden = !show;
    if (!show) { if (document.activeElement === g.yh.input) g.yh.input.blur(); return; }
    const cv = g.canvas, k = cv.clientWidth / W, sig = cv.offsetLeft + ',' + cv.offsetTop + ',' + k;
    if (sig !== g.yh.lsig) { g.yh.lsig = sig; lay.style.transform = 'translate(' + cv.offsetLeft + 'px,' + cv.offsetTop + 'px) scale(' + k + ')'; }
  }

  GK.register('young-hacker', {
    w: W, h: H, bg: '#121519', accent: GREEN,
    levels: LV.length,
    typing: true,
    text: TEXT,
    setup(g) { makeLayer(g); },
    init(g) {
      g.s = { clock: 0, bt: 0, wrong: 0, hint: false, done: false, flashT: -9, flashOk: false, stars: 0, rain: null, btns: [], drag: false, def: null };
      g.yh.input.value = '';
      if (!g.demo) setupLevel(g);
    },
    step(g) {
      const S = g.s;
      S.clock += 1 / 60;
      if (S.rain) for (const r of S.rain) { r.y += r.v; if (r.y > RY + RH + 20) { r.y = RY - 10; r.c = Math.random() < 0.5 ? '0' : '1'; } }
      S.btns = buttons(g);
      g.hud([[g.t('level'), (S.i + 1) + '/' + LV.length]]);
    },
    idle(g) { if (g.s) g.s.clock += 1 / 60; },
    bot(g) { botStep(g); },
    onPointer(g, type, p) {
      const S = g.s, d = S.def;
      if (!d) return;
      if (type === 'down') {
        if (d.k === 'stego' && !S.done && p.x >= SLIDE.x - 20 && p.x <= SLIDE.x + SLIDE.w + 20 && p.y >= SLIDE.y - 10 && p.y <= SLIDE.y + SLIDE.h + 10) { S.drag = p.id; slideTo(g, p.x); return; }
        for (let i = S.btns.length - 1; i >= 0; i--) if (hitB(S.btns[i], p.x, p.y)) { act(g, S.btns[i]); S.btns = buttons(g); return; }
      } else if (type === 'move') { if (S.drag !== false && S.drag === p.id) slideTo(g, p.x); }
      else if (type === 'up') { if (S.drag === p.id) { S.drag = false; g.sfx('tick'); } }
    },
    onKey(g, e) {
      const S = g.s, d = S.def;
      if (!d || S.done) return;
      if (TYPING[d.k]) {
        if (d.k === 'stego' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { S.stego.boost = clamp(S.stego.boost + (e.code === 'ArrowRight' ? 0.1 : -0.1), 0, 1); return; }
        if ((d.k === 'caesar' || (d.k === 'final' && S.fin.dec)) && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { wheelBy(g, e.code === 'ArrowRight' ? 1 : -1); return; }
        if (d.k === 'xor' && e.code === 'Space') { act(g, XORB); return; }
        if (e.code === 'Enter' || (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) g.yh.input.focus();
        return;
      }
      const m = /^(Digit|Numpad)([1-8])$/.exec(e.code);
      if (!m || e.repeat) return;
      const n = +m[2] - 1;
      if (d.k === 'choice') press(g, 'opt', n);
      else if (d.k === 'bits') press(g, 'bit', n);
    },
    onLang(g) {
      if (!g.yh) return;
      g.yh.input.placeholder = g.t('typeHere');
      const S = g.s;
      if (S && S.def && !S.done && (S.def.k === 'caesar' || S.def.k === 'b64')) setupLevel(g);   // מילים והערות בשפה החדשה
    },
    onPause(g) { if (g.s) g.s.drag = false; },
    destroy(g) { if (g.yh) { g.yh.layer.remove(); g.yh.style.remove(); g.canvas.style.cursor = ''; } },
    draw(g, ctx) {
      const S = g.s;
      drawScreen(ctx, W, H);
      drawStatus(g, ctx);
      if (!S.def) drawDemo(g, ctx);
      else { drawBrief(g, ctx); drawPuzzle(g, ctx); drawTerm(g, ctx); drawFlash(g, ctx); }
      drawCRT(ctx, W, H, S.clock);
      placeLayer(g);
      let c = '';
      if (g.state === 'play' && g.ptr.over && (S.btns.some(b => hitB(b, g.ptr.x, g.ptr.y)) || (S.def && S.def.k === 'stego' && hitB(SLIDE, g.ptr.x, g.ptr.y)))) c = 'pointer';
      if (c !== g.yh.cur) { g.yh.cur = c; g.canvas.style.cursor = c; }
    },
    cover(ctx, w, h, k) {
      ctx.fillStyle = '#1b1530'; ctx.fillRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.42, h * 0.45, 40, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, '#2c5a3e'); bg.addColorStop(1, '#0a1410');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const r = k.seeded(9);
      for (let c = 0; c < 34; c++) for (let j = 0; j < 12; j++) tx(ctx, r() < 0.5 ? '0' : '1', c * 29 + 8, j * 46 + r() * 30, { size: 22, color: GREEN, mono: true, alpha: 0.07 + r() * 0.14 });
      // מחשב רטרו
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      const mg = ctx.createLinearGradient(0, 70, 0, 430); mg.addColorStop(0, '#e9e1c8'); mg.addColorStop(1, '#bdb294');
      rr(ctx, 150, 60, 470, 370, 34); ctx.fillStyle = mg; ctx.fill(); ctx.restore();
      rr(ctx, 186, 92, 398, 280, 22); ctx.fillStyle = '#0d1b12'; ctx.fill();
      const sg = ctx.createRadialGradient(385, 230, 20, 385, 230, 260); sg.addColorStop(0, '#16502d'); sg.addColorStop(1, '#03110a');
      rr(ctx, 196, 102, 378, 260, 18); ctx.fillStyle = sg; ctx.fill();
      ctx.save(); rr(ctx, 196, 102, 378, 260, 18); ctx.clip();
      tx(ctx, '> _', 220, 135, { size: 26, color: GREEN, mono: true, dir: 'ltr', w: 800 });
      tx(ctx, 'V0hJVEVIQVQ=', 220, 178, { size: 20, color: AMBER, mono: true, dir: 'ltr' });
      ctx.shadowColor = GREEN; ctx.shadowBlur = 30; lock(ctx, 440, 290, 2.4, true, GREEN); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 102; y < 362; y += 4) ctx.fillRect(196, y, 378, 1.5);
      ctx.restore();
      rr(ctx, 330, 430, 110, 26, 6); ctx.fillStyle = '#a99f82'; ctx.fill();
      rr(ctx, 250, 452, 270, 22, 8); ctx.fillStyle = '#cfc6aa'; ctx.fill();
      ctx.fillStyle = '#5fd18b'; ctx.beginPath(); ctx.arc(585, 405, 7, 0, Math.PI * 2); ctx.fill();
      // מקלדת
      ctx.save(); ctx.translate(470, 480); ctx.rotate(-0.04);
      rr(ctx, -10, -6, 420, 70, 12); ctx.fillStyle = '#d7cfb4'; ctx.fill();
      for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) { rr(ctx, 6 + i * 33 + row * 6, 4 + row * 20, 27, 16, 4); ctx.fillStyle = '#efe8d2'; ctx.fill(); }
      ctx.restore();
      // גלגל צופן
      ctx.save(); ctx.translate(790, 180);
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(0, 0, 118, 0, Math.PI * 2); ctx.fillStyle = '#f2c14e'; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fillStyle = '#2b6cb0'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fillStyle = '#f2c14e'; ctx.fill();
      const A = ALPHA.lat;
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * Math.PI * 2 - Math.PI / 2;
        tx(ctx, A[i], Math.cos(a) * 99, Math.sin(a) * 99, { size: 18, color: '#3a2a05', align: 'center', mono: true, w: 800 });
        tx(ctx, A[(i + 3) % 26], Math.cos(a) * 62, Math.sin(a) * 62, { size: 15, color: '#e8f1ff', align: 'center', mono: true, w: 800 });
      }
      ctx.restore();
      // דגל
      ctx.save(); ctx.translate(800, 420);
      ctx.fillStyle = '#d9d9d9'; ctx.fillRect(-4, -110, 8, 150);
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.moveTo(4, -110); ctx.quadraticCurveTo(60, -125, 110, -100); ctx.lineTo(110, -50); ctx.quadraticCurveTo(60, -75, 4, -60); ctx.closePath(); ctx.fill();
      tx(ctx, '{ }', 56, -82, { size: 26, color: '#06301a', align: 'center', mono: true, w: 900 });
      ctx.restore();
    },
  });
})();
