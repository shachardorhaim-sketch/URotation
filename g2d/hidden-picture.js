// ============================================================
//  ציור מוסתר — משחק 2D של URotation (המנוע: g2d/kit.js)
//  תשבץ ציור (נונוגרם): המספרים ליד כל שורה ועמודה אומרים כמה משבצות ברצף צריך למלא שם.
//  40 ציורים מ-5×5 עד 15×15. כל ציור הוכח בפותר: הוא נפתר עד הסוף בהיגיון של שורה ועמודה בלבד
//  (בלי לנחש), ולכן יש לו פתרון אחד בלבד. כשמסיימים — הציור מתגלה בצבע.
//  כלל הטעויות ההוגן: טעות מתוקנת מיד (המשבצת מקבלת את הסימון הנכון) ועולה רק בכוכב. אי אפשר להיתקע או להפסיד.
// ============================================================
(function () {
  'use strict';
  // @art-begin (generated from g2dtools/tests/hidden-picture/art.mjs by build.mjs)
  const PAL = {"k":"#2b2d42","d":"#555b6e","e":"#adb5bd","w":"#ffffff","r":"#e63946","R":"#a4161a","o":"#f4a261","O":"#e76f51","y":"#ffd166","Y":"#f6aa1c","l":"#a7c957","g":"#52b788","G":"#2d6a4f","c":"#a8dadc","b":"#4895ef","B":"#1d3557","p":"#ffafcc","P":"#f15bb5","v":"#9b5de5","n":"#a0522d","N":"#6f4518","t":"#e6b980","s":"#ffd7b5"};
  const HOLE = {"0":"c","1":"k","2":"w","3":"y","4":"r","5":"b","6":"g","7":"p","8":"e","9":"n"};
  const PICS = [
    { id: "heart", bg: "#ffe5ec", rows: ["rr.rr","rwrrr","rrrrr",".rrr.","..r.."] },
    { id: "house", bg: "#cdeffd", rows: ["..r..",".rrr.","rrrrr",".yyy.",".y9y."] },
    { id: "tree", bg: "#dff3ff", rows: ["..y..",".ggg.",".ggg.","ggggg","..n.."] },
    { id: "cat", bg: "#fff1d6", rows: ["o...o","ooooo","o1o1o","oopoo",".ooo."] },
    { id: "mushroom", bg: "#e8f6e0", rows: [".rrr.","rrwrr","rrrrr","..w..",".www."] },
    { id: "boat", bg: "#cdeffd", rows: [".w...",".ww..",".www.","nnnnn",".nnn."] },
    { id: "apple", bg: "#fff3e0", rows: ["...nll.","...n...",".rr.rr.","rwrrrrr","rrrrrrr","rrrrrrr",".rrrrr.","..r.r.."] },
    { id: "fish", bg: "#cdeffd", rows: ["....ooo.","O..ooooo","OOoooo1o","OOoooooo","O..ooooo","....ooo."] },
    { id: "duck", bg: "#cdeffd", rows: ["....yyy..","...yyyyy.","...yy1yOO","...yyyyy.","y...yyy..","yy.yyyyyy","yyyyYYyyy",".yyyyyyy."] },
    { id: "flower", bg: "#e8f6e0", rows: ["..ppp..",".ppppp.","ppp3ppp",".ppppp.","..ppp..","...g...","gg.g.gg",".ggggg."] },
    { id: "icecream", bg: "#fdf0f5", rows: ["...r...","..ppp..",".ppppp.","pp5pp3p","ppppppp",".ttttt.","..ttt..","...t..."] },
    { id: "star", bg: "#1d3557", rows: ["...y...","...y...","yyyyyyy",".y1y1y.","..yyy..",".yy.yy.",".y...y."] },
    { id: "car", bg: "#cdeffd", rows: ["...rrrr...","..r0r00r..",".r00r000r.","rrrrrrrrrr","yrrrrrrrrR","rrkkrrrkkr","..kk...kk."] },
    { id: "dog", bg: "#fff1d6", rows: [".NN....NN.","NNNttttNNN","NNttttttNN","NNt1tt1tNN","NNttttttNN",".NttkkttN.","..ttkktt..","..tttttt..","...tPPt..."] },
    { id: "bunny", bg: "#d8f3dc", rows: [".ww....ww.",".wp....pw.",".wp....pw.",".ww....ww.",".wwwwwwww.","ww1wwww1ww","wwwwPPwwww",".wwwwwwww.","..wwwwww.."] },
    { id: "frog", bg: "#cdeffd", rows: [".ggg..ggg.","gw1g..g1wg","gggggggggg","gpggggggpg","g1gggggg1g","gg111111gg",".gggggggg.","gg.g..g.gg"] },
    { id: "owl", bg: "#1d3557", rows: ["n........n","nn......nn","nnnnnnnnnn","nwwwnnwwwn","nw1wnnw1wn","nwwwYYwwwn","nnnnYYnnnn",".nttttttn.",".nt9tt9tn.",".nttttttn.","..YY..YY.."] },
    { id: "butterfly", bg: "#e0fbfc", rows: ["...k..k...","PPP.kk.PPP","PPPPkkPPPP","P3PPkkPP3P","PPPPkkPPPP",".PPPkkPPP.","..vvkkvv..",".vvvkkvvv.",".vv.kk.vv."] },
    { id: "snail", bg: "#e8f6e0", rows: ["...nnnn....","..nNNNNn...",".nNnnnnNn.k",".nNnNNnNn.l",".nNnnnNNn.l","..nNNNNnlll","lllllllllll",".lllllllll."] },
    { id: "rocket", bg: "#1d3557", rows: ["...rr...","..rrrr..",".rrrrrr.",".ww00ww.",".ww00ww.",".wwwwww.",".wwwwww.",".wwrrww.","rwwwwwwr","rrwwwwrr","rr.oo.rr","...yy..."] },
    { id: "penguin", bg: "#cdeffd", rows: ["...kkkk...","..kkkkkk..",".kk2kk2kk.",".kkkOOkkk.",".kwwwwwwk.","kkwwwwwwkk","kkwwwwwwkk","k.wwwwww.k","..wwwwww..","..kwwwwk..",".OO....OO."] },
    { id: "cupcake", bg: "#fdf0f5", rows: ["....rr....","...pppp...","..pppppp..",".pp3pp5pp.","pppppppppp",".ntnntnnt.",".ntnntnnt.","..tnntnn..","..nnnnnn.."] },
    { id: "turtle", bg: "#cdeffd", rows: ["...GGGG.....","..GgGGgG..ll",".GgGGgGGG.1l",".GGgGGGgGlll","GGGGGGGGGGl.","tttttttttt..",".ll....ll...",".ll....ll..."] },
    { id: "whale", bg: "#cdeffd", rows: ["..c.c.......","...c........","..bbbbbb....",".bbbbbbbb.bb","b1bbbbbbbbb.","bbbbbbbbbb..","wwwwwwwbb...",".wwwww......"] },
    { id: "panda", bg: "#d8f3dc", rows: [".kk......kk.","kkkk....kkkk","kkwwwwwwwwkk",".wwwwwwwwww.","wwkkwwwwkkww","wkk2kwwk2kkw","wkkkkwwkkkkw","wwwwwkkwwwww",".wwwwkkwwww.","..wwwwwwww..","...wwwwww..."] },
    { id: "elephant", bg: "#fff3e0", rows: ["....eeee....","ee.eeeeee.ee","eppeeeeeeppe","eppe1ee1eppe","eppeeeeeeppe","eepeeeeeepee",".ee.eeee.ee.","....eeee....",".....ee.....",".....ee.....",".....eee....","......ee...."] },
    { id: "chick", bg: "#e0fbfc", rows: [".....Y......","....yyyy....","..yyyyyyyy..",".yyyyyyyyyy.",".yy1yyyy1yy.","yyyyyOOyyyyy","yyyyyOOyyyyy","yYyyyyyyyyYy","yYYyyyyyyYYy",".yyyyyyyyyy.","..yyyyyyyy..","...O....O..."] },
    { id: "octopus", bg: "#cdeffd", rows: ["...PPPPPP...","..PPPPPPPP..",".PPPPPPPPPP.",".PP2PPPP2PP.",".PP1PPPP1PP.",".PPPPPPPPPP.",".PPPP11PPPP.","PPPPPPPPPPPP","P.PP.PP.PP.P","P.P..PP..P.P",".P.P....P.P."] },
    { id: "lion", bg: "#fff3e0", rows: ["...OOOOOO...",".OOOOOOOOOO.","OOOyyyyyyOOO","OOyyyyyyyyOO","OOy1yyyy1yOO","OOyyyyyyyyOO","OOyyykkyyyOO","OOyyyyyyyyOO",".OOy1yy1yOO.",".OOOyyyyOOO.","..OOOOOOOO..","....OOOO...."] },
    { id: "ladybug", bg: "#d8f3dc", rows: ["...k....k...","....k..k....","....kkkk....","...kkkkkk...","..rrrkkrrr..",".rr1rkkr1rr.",".rrrrkkrrrr.",".r1rrkkrr1r.",".rrrrkkrrrr.","..rr1kk1rr..","...rrkkrr..."] },
    { id: "dino", bg: "#e0fbfc", rows: ["...........ggg.","..........gg1gg","..........ggggg","..........gg...",".........ggg...",".........gg....",".....ggggggg...","...gggglglggg..",".gggggggggggg..","gg.gggggggggg..","g...gg.gg.ggg..","....gg.gg..gg.."] },
    { id: "castle", bg: "#cdeffd", rows: [".......r.......",".......v.......","......vvv......",".r...vvvvv...r.",".v....ppp....v.","vvv...p1p...vvv","ppp...ppp...ppp","p1p.p.ppp.p.p1p","ppppppppppppppp","ppppppppppppppp","pp1ppp999ppp1pp","ppppp99999ppppp","ppppp99999ppppp","ppppp99999ppppp","GGGGG99999GGGGG"] },
    { id: "parrot", bg: "#d8f3dc", rows: ["....rrrr.......","...rrrrrr......","..rrr2rrrww....","..rrr1rrwwkk...","..rrrrrrwkk....","..rrrrrrr......",".rrrrrrrr......",".rryyyrrr......",".rybbyyrr......",".rbbbbyrr......","NNNbbbbrrNNNNNN","...bbbbr.......","....bbb........","....bb.........",".....b........."] },
    { id: "fox", bg: "#40916c", rows: [".OO.........OO.",".OOO.......OOO.",".OkOO.....OOkO.",".OkkOOOOOOOkkO.","OOOOOOOOOOOOOOO","OOO1OOOOOOO1OOO","OOOOOOOOOOOOOOO","wwwOOOOOOOOOwww",".wwwwOOOOOwwww.","..wwwwwwwwwww..","....wwwkwww....","......www......"] },
    { id: "unicorn", bg: "#fdf0f5", rows: ["....Y..........","....YY.........",".....YY..P.....","......wwPPv....",".....wwwwPvb...","....ww1wwwPvb..","...wwwwwwwwPvb.","..wwwwwwwwwwPvb",".wwwwwwwwwwwPvb","wwwwwwwwwwwwwPv","ww7wwww..wwwwPv","wwwwww....wwwwP",".wwww.....wwwww","..........wwwww","..........wwwww"] },
    { id: "robot", bg: "#e0fbfc", rows: [".......r.......",".......d.......","..eeeeeeeeeee..","..ee0000000ee..","..ee0100010ee..","..ee0000000ee..","..ee0044400ee..","..eeeeeeeeeee..","......eee......","eebbbbbbbbbbbee","e.bbbbbbbbbbb.e","e.bb3bb4bb5bb.e","e.bbbbbbbbbbb.e","...bbb...bbb...","..eeee...eeee.."] },
    { id: "plane", bg: "#cdeffd", rows: [".b.............",".bb............",".bbb.....bb....",".bbwwwwwwbbwww.","wwww0w0w0w0wwww",".wwwwwwwwwwwwr.","....bbbbbb.....","......bbbb....."] },
    { id: "balloon", bg: "#cdeffd", rows: ["....rryrr....","..rryyryyrr..",".rryyrrryyrr.",".ryyrrrrryyr.","rryyrrrrryyrr","rryyrrrrryyrr","rryyrrrrryyrr",".ryyrrrrryyr.",".rryyrrryyrr.","..rryyryyrr..","...rryyyrr...","....k...k....","....k...k....","....nnnnn....","....nnnnn...."] },
    { id: "ship", bg: "#cdeffd", rows: [".......r.......",".......k.......","...wwwwkwwww...","...wwwwkwwww...","..wwwwwkwwwww..","..wwwwwkwwwww..",".wwwwwwkwwwwww.",".......k.......","nnnnnnnnnnnnnnn",".nnnn1nnn1nnnn.","..nnnnnnnnnnn..","b.b.b.b.b.b.b.b","bbbbbbbbbbbbbbb"] },
    { id: "dragon", bg: "#fff3e0", rows: ["..g..........g.","..gg........gg.","...gggggggggg..","..gggggggggggg.","..gg2ggggg2ggg.","..gg1ggggg1ggg.","..gggggggggggg.","...gggg11gggg..","v...gggggggg...","vv.ggyyyyyygg.v",".vgggyyyyyyggvv","..gggyyyyyyggv.","...ggyyyyyygg..","....gg....gg...","...ggg....ggg.."] },
  ];
  // @art-end

  // שמות הציורים: he en ar es fr pt ru de
  const NAMES = {
    heart: ['לב', 'Heart', 'قلب', 'Corazón', 'Cœur', 'Coração', 'Сердце', 'Herz'],
    house: ['בית', 'House', 'بيت', 'Casa', 'Maison', 'Casa', 'Домик', 'Haus'],
    tree: ['עץ אשוח', 'Pine tree', 'شجرة صنوبر', 'Pino', 'Sapin', 'Pinheiro', 'Ёлка', 'Tannenbaum'],
    cat: ['חתול', 'Cat', 'قطة', 'Gato', 'Chat', 'Gato', 'Кошка', 'Katze'],
    mushroom: ['פטרייה', 'Mushroom', 'فطر', 'Seta', 'Champignon', 'Cogumelo', 'Гриб', 'Pilz'],
    boat: ['סירה', 'Boat', 'قارب', 'Barco', 'Bateau', 'Barco', 'Лодка', 'Boot'],
    apple: ['תפוח', 'Apple', 'تفاحة', 'Manzana', 'Pomme', 'Maçã', 'Яблоко', 'Apfel'],
    fish: ['דג', 'Fish', 'سمكة', 'Pez', 'Poisson', 'Peixe', 'Рыбка', 'Fisch'],
    duck: ['ברווז', 'Duck', 'بطة', 'Pato', 'Canard', 'Pato', 'Утёнок', 'Ente'],
    flower: ['פרח', 'Flower', 'زهرة', 'Flor', 'Fleur', 'Flor', 'Цветок', 'Blume'],
    icecream: ['גלידה', 'Ice cream', 'آيس كريم', 'Helado', 'Glace', 'Sorvete', 'Мороженое', 'Eis'],
    star: ['כוכב', 'Star', 'نجمة', 'Estrella', 'Étoile', 'Estrela', 'Звезда', 'Stern'],
    car: ['מכונית', 'Car', 'سيارة', 'Coche', 'Voiture', 'Carro', 'Машина', 'Auto'],
    dog: ['כלב', 'Dog', 'كلب', 'Perro', 'Chien', 'Cachorro', 'Собака', 'Hund'],
    bunny: ['ארנב', 'Bunny', 'أرنب', 'Conejo', 'Lapin', 'Coelho', 'Кролик', 'Hase'],
    frog: ['צפרדע', 'Frog', 'ضفدع', 'Rana', 'Grenouille', 'Sapo', 'Лягушка', 'Frosch'],
    owl: ['ינשוף', 'Owl', 'بومة', 'Búho', 'Hibou', 'Coruja', 'Сова', 'Eule'],
    butterfly: ['פרפר', 'Butterfly', 'فراشة', 'Mariposa', 'Papillon', 'Borboleta', 'Бабочка', 'Schmetterling'],
    snail: ['חילזון', 'Snail', 'حلزون', 'Caracol', 'Escargot', 'Caracol', 'Улитка', 'Schnecke'],
    rocket: ['חללית', 'Rocket', 'صاروخ', 'Cohete', 'Fusée', 'Foguete', 'Ракета', 'Rakete'],
    penguin: ['פינגווין', 'Penguin', 'بطريق', 'Pingüino', 'Pingouin', 'Pinguim', 'Пингвин', 'Pinguin'],
    cupcake: ['קאפקייק', 'Cupcake', 'كب كيك', 'Magdalena', 'Cupcake', 'Cupcake', 'Капкейк', 'Cupcake'],
    turtle: ['צב', 'Turtle', 'سلحفاة', 'Tortuga', 'Tortue', 'Tartaruga', 'Черепаха', 'Schildkröte'],
    whale: ['לווייתן', 'Whale', 'حوت', 'Ballena', 'Baleine', 'Baleia', 'Кит', 'Wal'],
    panda: ['פנדה', 'Panda', 'باندا', 'Panda', 'Panda', 'Panda', 'Панда', 'Panda'],
    elephant: ['פיל', 'Elephant', 'فيل', 'Elefante', 'Éléphant', 'Elefante', 'Слон', 'Elefant'],
    chick: ['אפרוח', 'Chick', 'كتكوت', 'Pollito', 'Poussin', 'Pintinho', 'Цыплёнок', 'Küken'],
    octopus: ['תמנון', 'Octopus', 'أخطبوط', 'Pulpo', 'Pieuvre', 'Polvo', 'Осьминог', 'Krake'],
    lion: ['אריה', 'Lion', 'أسد', 'León', 'Lion', 'Leão', 'Лев', 'Löwe'],
    ladybug: ['פרת משה רבנו', 'Ladybug', 'دعسوقة', 'Mariquita', 'Coccinelle', 'Joaninha', 'Божья коровка', 'Marienkäfer'],
    dino: ['דינוזאור', 'Dinosaur', 'ديناصور', 'Dinosaurio', 'Dinosaure', 'Dinossauro', 'Динозавр', 'Dinosaurier'],
    castle: ['טירה', 'Castle', 'قلعة', 'Castillo', 'Château', 'Castelo', 'Замок', 'Schloss'],
    parrot: ['תוכי', 'Parrot', 'ببغاء', 'Loro', 'Perroquet', 'Papagaio', 'Попугай', 'Papagei'],
    fox: ['שועל', 'Fox', 'ثعلب', 'Zorro', 'Renard', 'Raposa', 'Лиса', 'Fuchs'],
    unicorn: ['חד־קרן', 'Unicorn', 'حصان وحيد القرن', 'Unicornio', 'Licorne', 'Unicórnio', 'Единорог', 'Einhorn'],
    robot: ['רובוט', 'Robot', 'روبوت', 'Robot', 'Robot', 'Robô', 'Робот', 'Roboter'],
    plane: ['מטוס', 'Airplane', 'طائرة', 'Avión', 'Avion', 'Avião', 'Самолёт', 'Flugzeug'],
    balloon: ['כדור פורח', 'Hot-air balloon', 'منطاد', 'Globo', 'Montgolfière', 'Balão', 'Воздушный шар', 'Heißluftballon'],
    ship: ['ספינת מפרש', 'Sailing ship', 'سفينة شراعية', 'Velero', 'Voilier', 'Veleiro', 'Парусник', 'Segelschiff'],
    dragon: ['דרקון', 'Dragon', 'تنين', 'Dragón', 'Dragon', 'Dragão', 'Дракон', 'Drache'],
  };
  const LI = { he: 0, en: 1, ar: 2, es: 3, fr: 4, pt: 5, ru: 6, de: 7 };
  const INK = '#343d82';
  const portrait = () => typeof innerWidth === 'number' && innerHeight > innerWidth * 1.05;
  const isFilled = ch => /[A-Za-z]/.test(ch);
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // ----- הפותר: שורה אחת (תכנון דינמי על כל ההצבות האפשריות), הפצה על כל הלוח, וספירת פתרונות -----
  function cluesOf(cells) {
    const out = []; let run = 0;
    for (const v of cells) { if (v) run++; else if (run) { out.push(run); run = 0; } }
    if (run) out.push(run);
    return out;
  }
  // line: 0 לא ידוע, 1 מלא, 2 ריק. מחזיר את מה שאפשר להסיק בוודאות (או null אם אין הצבה אפשרית)
  function solveLine(clue, line) {
    const n = line.length, k = clue.length, K = k + 1;
    const F = new Uint8Array((n + 1) * K);
    F[n * K + k] = 1;
    const fits = (i, b) => { if (i + b > n) return false; for (let t = i; t < i + b; t++) if (line[t] === 2) return false; return true; };
    for (let i = n - 1; i >= 0; i--) for (let j = k; j >= 0; j--) {
      let ok = 0;
      if (line[i] !== 1 && F[(i + 1) * K + j]) ok = 1;
      if (!ok && j < k && fits(i, clue[j])) { const e = i + clue[j]; ok = e === n ? F[n * K + j + 1] : line[e] !== 1 ? F[(e + 1) * K + j + 1] : 0; }
      F[i * K + j] = ok;
    }
    if (!F[0]) return null;
    const R = new Uint8Array((n + 1) * K); R[0] = 1;
    const canF = new Uint8Array(n), canE = new Uint8Array(n);
    for (let i = 0; i < n; i++) for (let j = 0; j <= k; j++) {
      if (!R[i * K + j] || !F[i * K + j]) continue;
      if (line[i] !== 1 && F[(i + 1) * K + j]) { canE[i] = 1; R[(i + 1) * K + j] = 1; }
      if (j < k && fits(i, clue[j])) {
        const e = i + clue[j];
        if (e === n) { if (F[n * K + j + 1]) { for (let t = i; t < e; t++) canF[t] = 1; R[n * K + j + 1] = 1; } }
        else if (line[e] !== 1 && F[(e + 1) * K + j + 1]) { for (let t = i; t < e; t++) canF[t] = 1; canE[e] = 1; R[(e + 1) * K + j + 1] = 1; }
      }
    }
    const out = new Int8Array(n);
    for (let i = 0; i < n; i++) out[i] = canF[i] && !canE[i] ? 1 : canE[i] && !canF[i] ? 2 : 0;
    return out;
  }
  const rowOf = (P, b, y) => b.slice(y * P.W, y * P.W + P.W);
  const colOf = (P, b, x) => { const l = new Int8Array(P.H); for (let y = 0; y < P.H; y++) l[y] = b[y * P.W + x]; return l; };
  function propagate(P, grid) {
    let any = true, passes = 0;
    while (any) {
      any = false; passes++;
      for (let y = 0; y < P.H; y++) {
        const r = solveLine(P.rowClues[y], rowOf(P, grid, y));
        if (!r) return { ok: false, passes };
        for (let x = 0; x < P.W; x++) if (r[x] && !grid[y * P.W + x]) { grid[y * P.W + x] = r[x]; any = true; }
      }
      for (let x = 0; x < P.W; x++) {
        const r = solveLine(P.colClues[x], colOf(P, grid, x));
        if (!r) return { ok: false, passes };
        for (let y = 0; y < P.H; y++) if (r[y] && !grid[y * P.W + x]) { grid[y * P.W + x] = r[y]; any = true; }
      }
    }
    return { ok: true, passes, solved: grid.indexOf(0) < 0 };
  }
  function countSolutions(P, limit) {
    let count = 0, nodes = 0;
    const rec = grid => {
      if (count >= limit || nodes > 100000) return;
      nodes++;
      if (!propagate(P, grid).ok) return;
      const u = grid.indexOf(0);
      if (u < 0) { count++; return; }
      for (const v of [1, 2]) { const g2 = grid.slice(); g2[u] = v; rec(g2); if (count >= limit) return; }
    };
    rec(new Int8Array(P.W * P.H));
    return count;
  }

  // ----- ציור → תשבץ -----
  const cache = {};
  function puzzle(n) {
    if (cache[n]) return cache[n];
    const pic = PICS[n - 1], H = pic.rows.length, W = pic.rows[0].length;
    const sol = new Uint8Array(W * H), col = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = pic.rows[y][x], i = y * W + x;
      sol[i] = isFilled(ch) ? 1 : 0;
      col[i] = sol[i] ? PAL[ch] : HOLE[ch] ? PAL[HOLE[ch]] : pic.bg;
    }
    const blocks = cells => { const out = []; let s = -1; cells.forEach((v, i) => { if (v && s < 0) s = i; if (!v && s >= 0) { out.push([s, i - s]); s = -1; } }); if (s >= 0) out.push([s, cells.length - s]); return out; };
    const rowBlocks = [], colBlocks = [];
    for (let y = 0; y < H; y++) rowBlocks.push(blocks([...sol.slice(y * W, y * W + W)]));
    for (let x = 0; x < W; x++) { const c = []; for (let y = 0; y < H; y++) c.push(sol[y * W + x]); colBlocks.push(blocks(c)); }
    let total = 0; for (const v of sol) total += v;
    return (cache[n] = {
      n, id: pic.id, W, H, sol, col, bg: pic.bg, total, rowBlocks, colBlocks,
      rowClues: rowBlocks.map(b => b.map(q => q[1])), colClues: colBlocks.map(b => b.map(q => q[1])),
    });
  }

  // ----- מצב -----
  function makeState(W, H, P) {
    const N = P.W * P.H;
    const S = {
      P, N, board: new Int8Array(N), auto: new Uint8Array(N), pop: new Float32Array(N), err: new Float32Array(N), glow: new Float32Array(N),
      rowDone: new Uint8Array(P.H), colDone: new Uint8Array(P.W), rowFx: new Float32Array(P.H), colFx: new Float32Array(P.W),
      rowBlk: P.rowBlocks.map(b => new Uint8Array(b.length)), colBlk: P.colBlocks.map(b => new Uint8Array(b.length)),
      filled: 0, mistakes: 0, hints: 0, t: 0, mode: 'fill', stroke: null, hover: -1, cur: 0, kbd: false,
      won: false, winT: 0, done: false, confirmT: 0, hoverBtn: null, press: null, pressT: 0, botT: 0, toneT: -9, hintLine: null, tip: null,
    };
    layout(W, H, S);
    for (let y = 0; y < P.H; y++) if (!P.rowBlocks[y].length) { S.rowDone[y] = 1; crossRest(S, y, -1); }
    for (let x = 0; x < P.W; x++) if (!P.colBlocks[x].length) { S.colDone[x] = 1; crossRest(S, -1, x); }
    return S;
  }
  function layout(W, H, S) {
    const P = S.P, port = H > W;
    const maxR = Math.max(1, ...P.rowClues.map(c => c.length)), maxC = Math.max(1, ...P.colClues.map(c => c.length));
    const ax = 16, ay = 16, aw = port ? W - 32 : W - 240, ah = port ? H - 262 : H - 32;
    let c = 60;
    for (let it = 0; it < 5; it++) {
      S.fs = Math.max(12, Math.min(24, Math.round(c * 0.5)));
      S.sw = S.fs * 1.18 + 4; S.sh = S.fs * 1.12 + 3;
      S.cw = Math.ceil(maxR * S.sw + 12); S.ch = Math.ceil(maxC * S.sh + 10);
      c = Math.floor(Math.min((aw - 24 - S.cw) / P.W, (ah - 24 - S.ch) / P.H, 78));
    }
    S.c = c;
    const tw = S.cw + c * P.W, th = S.ch + c * P.H;
    S.gx = Math.round(ax + (aw - tw) / 2 + S.cw); S.gy = Math.round(ay + (ah - th) / 2 + S.ch);
    if (!port) {
      const sx = W - 116;
      S.prev = { x: sx - 80, y: 34, w: 160, h: 160 };
      S.starY = 222; S.starX = sx;
      S.btns = [
        { id: 'fill', x: sx - 88, y: 262, w: 84, h: 84 }, { id: 'cross', x: sx + 4, y: 262, w: 84, h: 84 },
        { id: 'hint', x: sx - 88, y: 362, w: 84, h: 84, key: 'H' }, { id: 'restart', x: sx + 4, y: 362, w: 84, h: 84, key: 'R' },
      ];
      S.tipBox = { x: sx - 92, y: 462, w: 184, fs: 17 };
    } else {
      const by = H - 222;
      S.prev = { x: 22, y: by, w: 150, h: 150 };
      S.starY = by + 178; S.starX = 97;
      const bw = 92, gap = 10, x0 = W - 22 - (bw * 4 + gap * 3 + 14);
      S.btns = [
        { id: 'fill', x: x0, y: by + 20, w: bw, h: 104 }, { id: 'cross', x: x0 + bw + gap, y: by + 20, w: bw, h: 104 },
        { id: 'hint', x: x0 + 2 * (bw + gap) + 14, y: by + 20, w: bw, h: 104, key: 'H' }, { id: 'restart', x: x0 + 3 * (bw + gap) + 14, y: by + 20, w: bw, h: 104, key: 'R' },
      ];
      S.tipBox = { x: x0, y: by + 134, w: bw * 4 + gap * 3 + 14, fs: 21 };
    }
  }
  const cellAt = (S, x, y) => { const cx = Math.floor((x - S.gx) / S.c), cy = Math.floor((y - S.gy) / S.c); return cx >= 0 && cy >= 0 && cx < S.P.W && cy < S.P.H ? cy * S.P.W + cx : -1; };
  const btnAt = (S, x, y) => S.btns.find(b => x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) || null;
  function crossRest(S, y, x) {
    const P = S.P;
    if (y >= 0) { for (let i = 0; i < P.W; i++) { const k = y * P.W + i; if (!S.board[k]) { S.board[k] = 2; S.auto[k] = 1; } } }
    else for (let j = 0; j < P.H; j++) { const k = j * P.W + x; if (!S.board[k]) { S.board[k] = 2; S.auto[k] = 1; } }
  }
  function starsOf(S) {
    const pen = S.mistakes + S.hints, free = S.N <= 36 ? 0 : S.N <= 110 ? 1 : 2;
    return pen <= free ? 3 : pen <= free + 3 ? 2 : 1;
  }
  const cx = (S, i) => S.gx + (i % S.P.W + 0.5) * S.c, cy = (S, i) => S.gy + (Math.floor(i / S.P.W) + 0.5) * S.c;

  // ----- חוקים: כל קלט (עכבר, מגע, מקלדת, רמז, בוט) עובר דרך apply -----
  function checkLines(g, S, i, quiet) {
    const P = S.P, x = i % P.W, y = Math.floor(i / P.W);
    let blocks = 0, lines = 0;
    const scan = (spans, done, get) => spans.forEach(([s, l], k) => { if (done[k]) return; for (let t = s; t < s + l; t++) if (S.board[get(t)] !== 1) return; done[k] = 1; blocks++; });
    if (!S.rowDone[y]) {
      scan(P.rowBlocks[y], S.rowBlk[y], t => y * P.W + t);
      if (S.rowBlk[y].every(v => v)) { S.rowDone[y] = 1; S.rowFx[y] = 1; crossRest(S, y, -1); lines++; if (!quiet) for (let k = 0; k < P.W; k += 2) g.burst(S.gx + (k + 0.5) * S.c, S.gy + (y + 0.5) * S.c, { n: 3, color: ['#ffd166', '#ffffff', '#8ecae6'], speed: 1.8, life: 26, gravity: 0, size: 4 }); }
    }
    if (!S.colDone[x]) {
      scan(P.colBlocks[x], S.colBlk[x], t => t * P.W + x);
      if (S.colBlk[x].every(v => v)) { S.colDone[x] = 1; S.colFx[x] = 1; crossRest(S, -1, x); lines++; if (!quiet) for (let k = 0; k < P.H; k += 2) g.burst(S.gx + (x + 0.5) * S.c, S.gy + (k + 0.5) * S.c, { n: 3, color: ['#ffd166', '#ffffff', '#8ecae6'], speed: 1.8, life: 26, gravity: 0, size: 4 }); }
    }
    if (!quiet) {
      if (lines) g.sfx('coin', { p: 0.9 + Math.min(0.5, (S.rowDone.reduce((a, v) => a + v, 0) + S.colDone.reduce((a, v) => a + v, 0)) * 0.012) });
      else if (blocks) g.tone({ f: 660, f2: 880, dur: 0.07, type: 'sine', vol: 0.09 });
    }
  }
  // act: 'fill' | 'cross'. מחזיר 1 (נכון), -1 (טעות שתוקנה), 0 (כבר ידוע)
  function apply(g, i, act, src) {
    const S = g.s, P = S.P;
    if (S.won || i < 0 || S.board[i]) return 0;
    const want = P.sol[i] ? 1 : 2, got = act === 'fill' ? 1 : 2;
    S.board[i] = want;
    if (want === 1) { S.filled++; S.pop[i] = 1; }
    if (src === 'hint') S.glow[i] = 1;
    let res = 1;
    if (got !== want) {
      res = -1; S.mistakes++; S.err[i] = 1; S.stroke = null;
      g.shake(5); g.sfx('error');
      g.float(cx(S, i), cy(S, i) - S.c * 0.4, want === 1 ? '■' : '✕', { color: '#ff8fa3', size: Math.max(18, S.c * 0.55) });
      if (S.mistakes === 1) S.tip = { k: 'fixed', t: 190, max: 190 };
    } else if (!src && S.t - S.toneT >= 2) {
      S.toneT = S.t;
      const x = i % P.W, y = Math.floor(i / P.W);
      if (want === 1) g.tone({ f: 330 + ((x + y) % 7) * 45, f2: 300 + ((x + y) % 7) * 40, dur: 0.06, type: 'triangle', vol: 0.13 });
      else g.tone({ f: 1100, dur: 0.025, type: 'square', vol: 0.035 });
    }
    if (want === 1) checkLines(g, S, i, src === 'bulk');
    if (S.filled >= P.total) win(g);
    return res;
  }
  function deduce(S, all) {
    const P = S.P;
    let best = null;
    const tryLine = (axis, k, clue, line, idx) => {
      const r = solveLine(clue, line);
      if (!r) return;
      const cells = [];
      for (let t = 0; t < line.length; t++) if (r[t] && !line[t]) cells.push([idx(t), r[t]]);
      if (cells.length && (!best || cells.length > best.cells.length)) best = { axis, k, cells };
    };
    for (let y = 0; y < P.H && (all || !best); y++) if (!S.rowDone[y]) tryLine('r', y, P.rowClues[y], rowOf(P, S.board, y), t => y * P.W + t);
    for (let x = 0; x < P.W && (all || !best); x++) if (!S.colDone[x]) tryLine('c', x, P.colClues[x], colOf(P, S.board, x), t => t * P.W + x);
    return best;
  }
  function hint(g) {
    const S = g.s, P = S.P;
    if (S.won) return;
    const d = deduce(S, true);
    S.hints++;
    g.sfx('power');
    if (d) {
      S.hintLine = { axis: d.axis, k: d.k, t: 70 };
      for (const [i, v] of d.cells) apply(g, i, v === 1 ? 'fill' : 'cross', 'hint');
    } else {
      const free = []; for (let i = 0; i < S.N; i++) if (!S.board[i] && P.sol[i]) free.push(i);
      if (free.length) apply(g, free[Math.floor(Math.random() * free.length)], 'fill', 'hint');
    }
  }
  function win(g) {
    const S = g.s;
    if (S.won) return;
    S.won = true; S.winT = 0; S.stroke = null; S.tip = null;
    if (!g.demo) [523, 659, 784, 988, 1175, 1568].forEach((f, k) => g.tone({ f, dur: 0.18, type: 'triangle', vol: 0.12, delay: k * 0.09 }));
  }
  function finish(g) {
    const S = g.s, P = S.P;
    S.done = true;
    const secs = Math.round(S.t / 60), stars = starsOf(S);
    const times = g.load('times', {}), old = times[g.level];
    if (!old || secs < old) { times[g.level] = secs; g.save('times', times); }
    let text = g.t('result', { t: fmtT(secs), m: S.mistakes, h: S.hints });
    if (old && secs < old) text += ' · ' + g.t('newTime');
    if (g.level >= PICS.length) text += ' · ' + g.t('allDone');
    g.completeLevel(stars, { title: g.t('picTitle', { name: picName(g, P.id) }), text, delay: 650 });
  }
  function press(g, id) {
    const S = g.s;
    if (S.won) return;
    S.press = id; S.pressT = 8;
    if (id === 'fill' || id === 'cross') { if (S.mode !== id) { S.mode = id; g.sfx('click'); } }
    else if (id === 'hint') hint(g);
    else if (id === 'restart') {
      if (!S.filled && !S.mistakes && !S.hints) return;
      if (S.confirmT > 0) { g.sfx('whoosh'); g.start(g.level); return; }
      S.confirmT = 150; g.sfx('click'); S.tip = { k: 'confirm', t: 150, max: 150 };
    }
  }
  const picName = (g, id) => (NAMES[id] || [id, id])[LI[g.lang] != null ? LI[g.lang] : 1];

  // ----- ציור -----
  const FLOAT = (() => { let a = 7; const R = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); return Array.from({ length: 24 }, (_, i) => ({ x: R(), y: R(), s: 10 + R() * 22, v: 0.12 + R() * 0.3, r: R() * 6, c: ['#ff8fab', '#ffd166', '#8ecae6', '#95d5b2', '#cdb4db', '#f4a261'][i % 6] })); })();
  function drawBack(g, ctx, W, H, t) {
    const gr = ctx.createLinearGradient(0, 0, W * 0.3, H);
    gr.addColorStop(0, '#2c2766'); gr.addColorStop(1, '#141230');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (const f of FLOAT) {
      const span = H + 80, y = ((f.y * span - t * f.v) % span + span) % span - 40, x = f.x * W + Math.sin(t * 0.012 + f.r) * 14;
      ctx.save(); ctx.globalAlpha = 0.17; ctx.translate(x, y); ctx.rotate(t * 0.003 + f.r);
      g.rr(ctx, -f.s / 2, -f.s / 2, f.s, f.s, f.s * 0.24); ctx.fillStyle = f.c; ctx.fill(); ctx.restore();
    }
  }
  function drawCross(ctx, x, y, c, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + c * 0.3, y + c * 0.3); ctx.lineTo(x + c * 0.7, y + c * 0.7); ctx.moveTo(x + c * 0.7, y + c * 0.3); ctx.lineTo(x + c * 0.3, y + c * 0.7); ctx.stroke();
  }
  function drawBoard(g, ctx, S) {
    const P = S.P, c = S.c, gx = S.gx, gy = S.gy, GW = c * P.W, GH = c * P.H, L = gx - S.cw, T = gy - S.ch;
    const fade = S.won ? g.clamp((S.winT - 50) / 28, 0, 1) : 0;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    g.rr(ctx, L - 10, T - 10, S.cw + GW + 20, S.ch + GH + 20, 18); ctx.fillStyle = '#fbf8f1'; ctx.fill(); ctx.restore();
    // שורות ועמודות של הרמזים
    ctx.globalAlpha = 1 - fade;
    for (let y = 0; y < P.H; y++) { ctx.fillStyle = S.rowDone[y] ? '#ddf3e2' : y % 2 ? '#ebe7f8' : '#f1eefb'; ctx.fillRect(L, gy + y * c, S.cw - 4, c); }
    for (let x = 0; x < P.W; x++) { ctx.fillStyle = S.colDone[x] ? '#ddf3e2' : x % 2 ? '#ebe7f8' : '#f1eefb'; ctx.fillRect(gx + x * c, T, c, S.ch - 4); }
    const hov = S.won ? -1 : S.kbd ? S.cur : S.hover;
    if (hov >= 0 && g.state === 'play') {
      const hx = hov % P.W, hy = Math.floor(hov / P.W);
      ctx.fillStyle = 'rgba(255,200,70,.32)';
      ctx.fillRect(L, gy + hy * c, S.cw + GW, c); ctx.fillRect(gx + hx * c, T, c, S.ch + GH);
    }
    if (S.hintLine && S.hintLine.t > 0) {
      ctx.fillStyle = 'rgba(120,220,255,' + (0.4 * S.hintLine.t / 70).toFixed(3) + ')';
      if (S.hintLine.axis === 'r') ctx.fillRect(L, gy + S.hintLine.k * c, S.cw + GW, c); else ctx.fillRect(gx + S.hintLine.k * c, T, c, S.ch + GH);
    }
    for (let y = 0; y < P.H; y++) if (S.rowFx[y] > 0) { ctx.fillStyle = 'rgba(120,230,150,' + (S.rowFx[y] * 0.45).toFixed(3) + ')'; ctx.fillRect(L, gy + y * c, S.cw + GW, c); }
    for (let x = 0; x < P.W; x++) if (S.colFx[x] > 0) { ctx.fillStyle = 'rgba(120,230,150,' + (S.colFx[x] * 0.45).toFixed(3) + ')'; ctx.fillRect(gx + x * c, T, c, S.ch + GH); }
    ctx.globalAlpha = 1;
    // המשבצות
    for (let i = 0; i < S.N; i++) {
      const x = gx + (i % P.W) * c, y = gy + Math.floor(i / P.W) * c, v = S.board[i];
      if (v === 1) {
        const k = S.pop[i] > 0 ? g.ease.back(1 - S.pop[i]) : 1, s = c * 0.88 * k, o = (c - s) / 2;
        if (s > 0.5) {
          g.rr(ctx, x + o, y + o, s, s, c * 0.16); ctx.fillStyle = S.err[i] > 0 ? '#5a3d82' : INK; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x + o + s * 0.14, y + o + s * 0.12, s * 0.72, s * 0.13);
        }
      } else if (v === 2) drawCross(ctx, x, y, c, S.auto[i] ? '#d3cfe4' : '#8e88b6', Math.max(1.5, c * (S.auto[i] ? 0.06 : 0.085)));
      if (S.err[i] > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, S.err[i] * 1.3);
        g.rr(ctx, x + 2, y + 2, c - 4, c - 4, c * 0.16); ctx.fillStyle = 'rgba(255,77,109,.22)'; ctx.fill();
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = Math.max(2, c * 0.08); ctx.stroke(); ctx.restore();
      }
      if (S.glow[i] > 0) { ctx.save(); ctx.globalAlpha = S.glow[i] * 0.7; g.rr(ctx, x + 1, y + 1, c - 2, c - 2, c * 0.16); ctx.strokeStyle = '#7fdcff'; ctx.lineWidth = Math.max(2, c * 0.09); ctx.stroke(); ctx.restore(); }
    }
    // הגילוי: גל צבע באלכסון
    if (S.won) {
      const span = P.W + P.H - 2 || 1;
      for (let i = 0; i < S.N; i++) {
        const px = i % P.W, py = Math.floor(i / P.W), rp = g.clamp((S.winT - ((px + py) / span) * 40) / 10, 0, 1);
        if (rp <= 0) continue;
        ctx.globalAlpha = rp; ctx.fillStyle = P.col[i]; ctx.fillRect(gx + px * c, gy + py * c, c + 0.5, c + 0.5);
      }
      ctx.globalAlpha = 1;
    }
    // קווי הרשת: דקים, ועבים כל 5
    const la = 1 - fade;
    if (la > 0) {
      ctx.globalAlpha = la;
      ctx.strokeStyle = '#d9d5ea'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 1; x < P.W; x++) if (x % 5) { ctx.moveTo(gx + x * c + 0.5, gy); ctx.lineTo(gx + x * c + 0.5, gy + GH); }
      for (let y = 1; y < P.H; y++) if (y % 5) { ctx.moveTo(gx, gy + y * c + 0.5); ctx.lineTo(gx + GW, gy + y * c + 0.5); }
      ctx.stroke();
      ctx.strokeStyle = '#8f89b8'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 5; x < P.W; x += 5) { ctx.moveTo(gx + x * c, gy - S.ch + 6); ctx.lineTo(gx + x * c, gy + GH); }
      for (let y = 5; y < P.H; y += 5) { ctx.moveTo(gx - S.cw + 6, gy + y * c); ctx.lineTo(gx + GW, gy + y * c); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // הרמזים (המספרים)
    if (fade < 1) {
      ctx.globalAlpha = 1 - fade;
      const num = (s, x, y, done) => {
        g.text(ctx, s, x, y, { size: S.fs, weight: 800, color: done ? '#bdb7d8' : '#312b63' });
        if (done) { ctx.strokeStyle = 'rgba(150,140,190,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - S.fs * 0.42, y + S.fs * 0.3); ctx.lineTo(x + S.fs * 0.42, y - S.fs * 0.3); ctx.stroke(); }
      };
      for (let y = 0; y < P.H; y++) {
        const cl = P.rowClues[y], yy = gy + (y + 0.5) * c + 1;
        if (!cl.length) { num('0', gx - 6 - S.sw / 2, yy, true); continue; }
        for (let k = 0; k < cl.length; k++) num(cl[k], gx - 6 - (cl.length - 1 - k) * S.sw - S.sw / 2, yy, S.rowDone[y] || S.rowBlk[y][k]);
      }
      for (let x = 0; x < P.W; x++) {
        const cl = P.colClues[x], xx = gx + (x + 0.5) * c;
        if (!cl.length) { num('0', xx, gy - 5 - S.sh / 2, true); continue; }
        for (let k = 0; k < cl.length; k++) num(cl[k], xx, gy - 5 - (cl.length - 1 - k) * S.sh - S.sh / 2, S.colDone[x] || S.colBlk[x][k]);
      }
      ctx.globalAlpha = 1;
    }
    // מסגרת הלוח, ובסוף מסגרת זהב לתמונה
    ctx.strokeStyle = '#4e4882'; ctx.lineWidth = 2.5; ctx.strokeRect(gx, gy, GW, GH);
    if (S.won) {
      const a = g.clamp((S.winT - 45) / 25, 0, 1);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
        ctx.strokeStyle = '#e9b949'; ctx.lineWidth = 8; ctx.strokeRect(gx - 5, gy - 5, GW + 10, GH + 10);
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2; ctx.strokeRect(gx - 5, gy - 5, GW + 10, GH + 10);
        ctx.restore();
      }
    }
    // הסמן של המקלדת
    if (S.kbd && !S.won && g.state === 'play') {
      const x = gx + (S.cur % P.W) * c, y = gy + Math.floor(S.cur / P.W) * c;
      ctx.save(); g.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, c * 0.18);
      ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 3.5; ctx.shadowColor = '#ffbf69'; ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.75 + Math.sin(S.t * 0.15) * 0.25; ctx.stroke(); ctx.restore();
    }
  }
  function drawBanner(g, ctx, S) {
    const a = g.clamp((S.winT - 55) / 18, 0, 1);
    if (a <= 0) return;
    const P = S.P, name = g.t('picTitle', { name: picName(g, P.id) });
    const fs = Math.min(40, Math.max(26, S.c * 0.9)), x = S.gx + S.c * P.W / 2;
    const y = Math.max(fs * 0.9 + 6, S.gy - S.ch / 2 - 4);
    ctx.save();
    ctx.font = '900 ' + fs + 'px Heebo, Arial, sans-serif';
    const w = Math.min(S.c * P.W + S.cw, ctx.measureText(name).width + 70), h = fs * 1.5;
    ctx.translate(x, y); const k = g.ease.back(a); ctx.scale(k, k);
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    g.rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#ff7eb6'); gr.addColorStop(1, '#e8508f');
    ctx.fillStyle = gr; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fff2f8'; ctx.lineWidth = 3; ctx.stroke();
    g.text(ctx, name, 0, 2, { size: fs, weight: 900, color: '#ffffff', stroke: 'rgba(120,20,70,.35)', strokeW: 4, maxW: w - 30 });
    ctx.restore();
  }
  function drawPic(ctx, S, x, y, w, h, colour, rpF) {
    const P = S.P, s = Math.min(w / P.W, h / P.H), ox = x + (w - s * P.W) / 2, oy = y + (h - s * P.H) / 2;
    if (colour) { ctx.fillStyle = P.bg; ctx.fillRect(ox, oy, s * P.W, s * P.H); }
    for (let i = 0; i < S.N; i++) {
      const px = i % P.W, py = Math.floor(i / P.W);
      if (colour) { const a = rpF ? rpF(px, py) : 1; if (a <= 0 && S.board[i] !== 1) continue; ctx.fillStyle = a > 0.5 ? P.col[i] : INK; }
      else if (S.board[i] === 1) ctx.fillStyle = INK; else continue;
      ctx.fillRect(ox + px * s, oy + py * s, s + 0.4, s + 0.4);
    }
    return { ox, oy, s };
  }
  function drawStar(ctx, x, y, r, on) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
    ctx.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.12)'; ctx.fill();
    ctx.strokeStyle = on ? '#b8860b' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawIcon(g, ctx, id, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.13;
    if (id === 'fill') { g.rr(ctx, -s * 0.3, -s * 0.3, s * 0.6, s * 0.6, s * 0.1); ctx.fill(); }
    else if (id === 'cross') { ctx.lineWidth = s * 0.15; ctx.beginPath(); ctx.moveTo(-s * 0.27, -s * 0.27); ctx.lineTo(s * 0.27, s * 0.27); ctx.moveTo(s * 0.27, -s * 0.27); ctx.lineTo(-s * 0.27, s * 0.27); ctx.stroke(); }
    else if (id === 'hint') {
      g.circle(ctx, 0, -s * 0.08, s * 0.27); ctx.fill();
      ctx.fillRect(-s * 0.13, s * 0.12, s * 0.26, s * 0.12);
      g.rr(ctx, -s * 0.11, s * 0.27, s * 0.22, s * 0.08, s * 0.03); ctx.fill();
    } else if (id === 'restart') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.32, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      const a = -Math.PI * 0.35, ax = Math.cos(a) * s * 0.32, ay = Math.sin(a) * s * 0.32;
      ctx.beginPath(); ctx.moveTo(ax + s * 0.2, ay - s * 0.02); ctx.lineTo(ax - s * 0.04, ay - s * 0.2); ctx.lineTo(ax - s * 0.03, ay + s * 0.12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawButton(g, ctx, S, b) {
    const on = b.id === S.mode, hot = S.hoverBtn === b.id, down = S.press === b.id && S.pressT > 0, dy = down ? 3 : 0;
    const warn = b.id === 'restart' && S.confirmT > 0;
    ctx.save();
    g.rr(ctx, b.x, b.y + 5, b.w, b.h, 20); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    g.rr(ctx, b.x, b.y + dy, b.w, b.h, 20);
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    if (warn) { gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(1, '#e5484d'); }
    else if (on) { gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#ffb703'); }
    else if (b.id === 'hint' || b.id === 'restart') { gr.addColorStop(0, hot ? '#9db4ff' : '#8199f5'); gr.addColorStop(1, hot ? '#7b6cf0' : '#6a5ae0'); }
    else { gr.addColorStop(0, hot ? '#4b4690' : '#3d3878'); gr.addColorStop(1, hot ? '#3a3577' : '#2f2b62'); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = on ? '#fff3c4' : 'rgba(255,255,255,.28)'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
    const ic = on ? '#3b2a05' : '#ffffff';
    drawIcon(g, ctx, b.id, b.x + b.w / 2, b.y + b.h * 0.4 + dy, Math.min(b.w, b.h) * 0.58, b.id === 'fill' && !on ? '#c9c4ff' : ic);
    g.text(ctx, g.t('b_' + b.id), b.x + b.w / 2, b.y + b.h * 0.82 + dy, { size: g.H > g.W ? 19 : 13, weight: 800, color: on ? '#3b2a05' : '#ffffff', maxW: b.w - 8 });
    if (b.key && !g.touch) g.text(ctx, b.key, b.x + b.w - 13, b.y + 13 + dy, { size: 11, weight: 800, color: 'rgba(255,255,255,.7)' });
    ctx.restore();
  }
  // בועת הודעה מתחת לכפתורים (במקום הודעה קופצת שכיסתה את המספרים)
  function drawTip(g, ctx, S) {
    const tp = S.tip, B = S.tipBox;
    if (!tp || !B) return;
    const fs = B.fs, lh = fs * 1.28, maxW = B.w - 30;
    ctx.save();
    ctx.font = '800 ' + fs + 'px Heebo, Arial, sans-serif';
    const lines = [];
    let cur = '';
    for (const w of String(g.t(tp.k)).split(' ')) { const s2 = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(s2).width > maxW) { lines.push(cur); cur = w; } else cur = s2; }
    if (cur) lines.push(cur);
    const h = lines.length * lh + 22, age = tp.max - tp.t;
    const k = g.ease.back(Math.min(1, age / 12)), a = Math.min(1, tp.t / 18);
    ctx.globalAlpha = a;
    ctx.translate(B.x + B.w / 2, B.y + h / 2); ctx.scale(k, k);
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    g.rr(ctx, -B.w / 2, -h / 2, B.w, h, 16);
    ctx.fillStyle = tp.k === 'fixed' ? '#fff0f3' : '#fff6dc'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = tp.k === 'fixed' ? '#ff8fa3' : '#ffc857'; ctx.lineWidth = 3; ctx.stroke();
    lines.forEach((l, i) => g.text(ctx, l, 0, -h / 2 + 11 + lh * (i + 0.5), { size: fs, weight: 800, color: '#3b2350', maxW }));
    ctx.restore();
  }
  function drawSide(g, ctx, S) {
    const p = S.prev;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    g.rr(ctx, p.x, p.y, p.w, p.h, 16); ctx.fillStyle = '#fbf8f1'; ctx.fill(); ctx.restore();
    const span = S.P.W + S.P.H - 2 || 1;
    drawPic(ctx, S, p.x + 12, p.y + 12, p.w - 24, p.h - 24, S.won, S.won ? (px, py) => g.clamp((S.winT - ((px + py) / span) * 40) / 10, 0, 1) : null);
    if (!S.won && !S.filled) g.text(ctx, '?', p.x + p.w / 2, p.y + p.h / 2 + 4, { size: p.h * 0.45, weight: 900, color: 'rgba(52,61,130,.18)' });
    const st = starsOf(S);
    for (let k = 0; k < 3; k++) drawStar(ctx, S.starX + (k - 1) * 40, S.starY, 15, k < st);
    for (const b of S.btns) drawButton(g, ctx, S, b);
  }

  const T = {
    he: { title: 'ציור מוסתר', help: ["המספרים אומרים כמה משבצות ברצף למלא בכל שורה ועמודה", "לחיצה — מלא · לחיצה ימנית — ✕ · גרור לצבוע הרבה · H רמז", "טעות מתוקנת לבד — רק כוכב יורד"], helpTouch: ["המספרים אומרים כמה משבצות ברצף למלא בכל שורה ועמודה", "הקש למלא · בחר ✕ למטה לסימון ריק · גרור לצבוע הרבה", "טעות מתוקנת לבד — רק כוכב יורד"], mistakes: 'טעויות', picTitle: '{name}!', result: 'זמן {t} · טעויות {m} · רמזים {h}', newTime: 'שיא זמן חדש!', confirm: 'לחץ שוב כדי להתחיל מחדש', fixed: 'אופס! תיקנתי לך את המשבצת', b_fill: 'מלא', b_cross: 'ריק', b_hint: 'רמז', b_restart: 'מחדש' },
    en: { title: 'Hidden Picture', help: ["Numbers tell how many cells in a row to fill, per row and column", "Click — fill · Right-click — ✕ · Drag to paint · H — hint", "Mistakes fix themselves — you only lose a star"], helpTouch: ["Numbers tell how many cells in a row to fill, per row and column", "Tap to fill · Pick ✕ below to mark empty · Drag to paint", "Mistakes fix themselves — you only lose a star"], mistakes: 'Mistakes', picTitle: '{name}!', result: 'Time {t} · Mistakes {m} · Hints {h}', newTime: 'New best time!', confirm: 'Press again to start over', fixed: 'Oops! I fixed that cell for you', b_fill: 'Fill', b_cross: 'Empty', b_hint: 'Hint', b_restart: 'Restart' },
    ar: { title: 'الصورة المخفية', help: ["الأرقام تخبرك كم مربعاً متتالياً تملأ في كل صف وعمود", "انقر — املأ · نقر يمين — ✕ · اسحب للتلوين · H تلميح", "الخطأ يُصحَّح وحده — تخسر نجمة فقط"], helpTouch: ["الأرقام تخبرك كم مربعاً متتالياً تملأ في كل صف وعمود", "المس للملء · اختر ✕ في الأسفل للفارغ · اسحب للتلوين", "الخطأ يُصحَّح وحده — تخسر نجمة فقط"], mistakes: 'الأخطاء', picTitle: '{name}!', result: 'الوقت {t} · الأخطاء {m} · التلميحات {h}', newTime: 'أفضل وقت جديد!', confirm: 'اضغط مرة أخرى للبدء من جديد', fixed: 'أوه! صحّحت لك هذا المربع', b_fill: 'املأ', b_cross: 'فارغ', b_hint: 'تلميح', b_restart: 'من جديد' },
    es: { title: 'Dibujo Oculto', help: ["Los números dicen cuántas casillas seguidas llenar en cada fila y columna", "Clic — llenar · Clic derecho — ✕ · Arrastra para pintar · H pista", "Los errores se corrigen solos: solo pierdes una estrella"], helpTouch: ["Los números dicen cuántas casillas seguidas llenar en cada fila y columna", "Toca para llenar · Elige ✕ abajo para vacías · Arrastra para pintar", "Los errores se corrigen solos: solo pierdes una estrella"], mistakes: 'Errores', picTitle: '¡{name}!', result: 'Tiempo {t} · Errores {m} · Pistas {h}', newTime: '¡Nuevo mejor tiempo!', confirm: 'Pulsa otra vez para empezar de nuevo', fixed: '¡Uy! Te corregí esa casilla', b_fill: 'Llenar', b_cross: 'Vacía', b_hint: 'Pista', b_restart: 'Reiniciar' },
    fr: { title: 'Dessin Caché', help: ["Les nombres disent combien de cases d'affilée remplir par ligne et colonne", "Clic — remplir · Clic droit — ✕ · Glisse pour peindre · H indice", "Les erreurs se corrigent seules : tu perds juste une étoile"], helpTouch: ["Les nombres disent combien de cases d'affilée remplir par ligne et colonne", "Touche pour remplir · Choisis ✕ en bas pour les vides · Glisse pour peindre", "Les erreurs se corrigent seules : tu perds juste une étoile"], mistakes: 'Erreurs', picTitle: '{name} !', result: 'Temps {t} · Erreurs {m} · Indices {h}', newTime: 'Nouveau meilleur temps !', confirm: 'Appuie encore pour recommencer', fixed: "Oups ! J'ai corrigé cette case", b_fill: 'Remplir', b_cross: 'Vide', b_hint: 'Indice', b_restart: 'Recommencer' },
    pt: { title: 'Desenho Escondido', help: ["Os números dizem quantas casas seguidas pintar em cada linha e coluna", "Clique — pintar · Direito — ✕ · Arraste para pintar · H dica", "Erros se corrigem sozinhos: você só perde uma estrela"], helpTouch: ["Os números dizem quantas casas seguidas pintar em cada linha e coluna", "Toque para pintar · Escolha ✕ embaixo para vazias · Arraste para pintar", "Erros se corrigem sozinhos: você só perde uma estrela"], mistakes: 'Erros', picTitle: '{name}!', result: 'Tempo {t} · Erros {m} · Dicas {h}', newTime: 'Novo melhor tempo!', confirm: 'Toque de novo para recomeçar', fixed: 'Opa! Corrigi essa casa para você', b_fill: 'Pintar', b_cross: 'Vazia', b_hint: 'Dica', b_restart: 'Recomeçar' },
    ru: { title: 'Тайная картинка', help: ["Числа — сколько клеток подряд закрасить в строке и столбце", "Клик — закрасить · Правый — ✕ · Веди, чтобы красить · H подсказка", "Ошибки исправляются сами — теряешь только звезду"], helpTouch: ["Числа — сколько клеток подряд закрасить в строке и столбце", "Нажми — закрасить · Выбери ✕ внизу для пустых · Веди, чтобы красить", "Ошибки исправляются сами — теряешь только звезду"], mistakes: 'Ошибки', picTitle: '{name}!', result: 'Время {t} · Ошибки {m} · Подсказки {h}', newTime: 'Новое лучшее время!', confirm: 'Нажми ещё раз, чтобы начать заново', fixed: 'Ой! Я исправил эту клетку', b_fill: 'Закрасить', b_cross: 'Пусто', b_hint: 'Подсказка', b_restart: 'Заново' },
    de: { title: 'Verstecktes Bild', help: ["Die Zahlen sagen, wie viele Felder am Stück je Zeile und Spalte gefüllt werden", "Klick — füllen · Rechtsklick — ✕ · Ziehen malt · H Tipp", "Fehler korrigieren sich selbst – du verlierst nur einen Stern"], helpTouch: ["Die Zahlen sagen, wie viele Felder am Stück je Zeile und Spalte gefüllt werden", "Tippen füllt · Unten ✕ wählen für leere Felder · Ziehen malt", "Fehler korrigieren sich selbst – du verlierst nur einen Stern"], mistakes: 'Fehler', picTitle: '{name}!', result: 'Zeit {t} · Fehler {m} · Tipps {h}', newTime: 'Neue Bestzeit!', confirm: 'Nochmal drücken für einen Neustart', fixed: 'Hoppla! Ich habe das Feld korrigiert', b_fill: 'Füllen', b_cross: 'Leer', b_hint: 'Tipp', b_restart: 'Neu' },
  };

  const KEYDIR = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  function strokeTo(g, S, x, y) {
    const st = S.stroke, P = S.P;
    let tx = g.clamp(Math.floor((x - S.gx) / S.c), 0, P.W - 1), ty = g.clamp(Math.floor((y - S.gy) / S.c), 0, P.H - 1);
    if (!st.axis) { if (tx === st.x0 && ty === st.y0) return; st.axis = Math.abs(tx - st.x0) >= Math.abs(ty - st.y0) ? 'h' : 'v'; }
    if (st.axis === 'h') ty = st.y0; else tx = st.x0;
    let lx = st.last % P.W, ly = Math.floor(st.last / P.W);
    while ((lx !== tx || ly !== ty) && S.stroke) {
      lx += Math.sign(tx - lx); ly += Math.sign(ty - ly);
      st.last = ly * P.W + lx;
      apply(g, st.last, st.act);
    }
    S.hover = ty * P.W + tx;
  }
  // תמונה קטנה של הציור בחלון הסיום (מוזרקת לכרטיס של המנוע; נבנית מחדש כשהכרטיס מתחלף)
  function thumb(g) {
    const S = g.s;
    if (!S || !S.done || g.state !== 'over') return;
    const card = g.root.querySelector('.g2d-ov.show .g2d-card');
    if (!card || card.querySelector('.hp-thumb')) return;
    const P = S.P, sh = g.stage.clientHeight || 400, size = Math.round(Math.max(64, Math.min(150, sh * 0.2)));
    const s = Math.max(1, Math.floor(size * 2 / Math.max(P.W, P.H))), cv = document.createElement('canvas');
    cv.className = 'hp-thumb'; cv.width = s * P.W; cv.height = s * P.H;
    cv.style.cssText = 'display:block;margin:8px auto 4px;width:' + Math.round(cv.width / 2) + 'px;height:' + Math.round(cv.height / 2) + 'px;border-radius:10px;border:3px solid #ffd166;box-shadow:0 6px 18px rgba(0,0,0,.45)';
    const c2 = cv.getContext('2d');
    for (let i = 0; i < S.N; i++) { c2.fillStyle = P.col[i]; c2.fillRect((i % P.W) * s, Math.floor(i / P.W) * s, s, s); }
    const after = card.querySelector('.g2d-stars') || card.querySelector('h2');
    if (after && after.nextSibling) card.insertBefore(cv, after.nextSibling); else card.appendChild(cv);
  }
  function tick(g) {
    const S = g.s;
    if (S.pressT > 0) S.pressT--;
    if (S.confirmT > 0) S.confirmT--;
    if (S.hintLine && S.hintLine.t > 0) S.hintLine.t--;
    if (S.tip && --S.tip.t <= 0) S.tip = null;
    for (let i = 0; i < S.N; i++) { if (S.pop[i] > 0) S.pop[i] = Math.max(0, S.pop[i] - 0.11); if (S.err[i] > 0) S.err[i] = Math.max(0, S.err[i] - 0.012); if (S.glow[i] > 0) S.glow[i] = Math.max(0, S.glow[i] - 0.015); }
    for (let y = 0; y < S.P.H; y++) if (S.rowFx[y] > 0) S.rowFx[y] = Math.max(0, S.rowFx[y] - 0.035);
    for (let x = 0; x < S.P.W; x++) if (S.colFx[x] > 0) S.colFx[x] = Math.max(0, S.colFx[x] - 0.035);
  }
  function hud(g) {
    const S = g.s;
    if (g.demo) return;
    const m = [g.t('mistakes'), String(S.mistakes), S.mistakes ? '#ff8fa3' : null];
    if (g.H > g.W) g.hud([[g.t('level'), g.level], m]);
    else g.hud([[g.t('level'), g.level], [g.t('time'), fmtT(S.t / 60)], m]);
  }

  GK.register('hidden-picture', {
    get w() { return portrait() ? 640 : 880; },
    get h() { return portrait() ? 900 : 640; },
    bg: '#1d1a42', accent: '#ffc857',
    levels: PICS.length,
    text: T,

    init(g) {
      if (g.demo) {
        const S = g.s = makeState(g.W, g.H, puzzle(29));
        const P = S.P;
        for (let i = 0; i < S.N; i++) if (Math.floor(i / P.W) < 7 || (i % P.W) < 3) apply(g, i, P.sol[i] ? 'fill' : 'cross', 'bulk');
        S.pop.fill(0);
        return;
      }
      g.s = makeState(g.W, g.H, puzzle(g.level));
      hud(g);
    },

    step(g) {
      const S = g.s;
      tick(g);
      if (S.won) {
        S.winT++;
        if (S.winT % 5 === 0 && S.winT < 50) {
          const P = S.P, d = Math.round((S.winT / 40) * (P.W + P.H - 2));
          for (let k = 0; k < 3; k++) { const x = g.ri(0, P.W - 1), y = g.clamp(d - x, 0, P.H - 1); g.burst(S.gx + (x + 0.5) * S.c, S.gy + (y + 0.5) * S.c, { n: 5, color: ['#ffffff', '#ffd166', '#ff8fab'], speed: 2.2, life: 30, gravity: 0, size: 4 }); }
        }
        if (S.winT === 60) { const P = S.P; g.burst(S.gx + S.c * P.W / 2, S.gy + S.c * P.H / 2, { n: 60, color: ['#ffd166', '#ff8fab', '#8ecae6', '#95d5b2', '#ffffff'], speed: 6, life: 60, gravity: 0.06 }); }
        if (S.winT >= 96 && !S.done) finish(g);
        return;
      }
      S.t++;
      hud(g);
    },
    onPause(g) { const S = g.s; if (S && S.won && !S.done && S.winT > 50) S.winT = 50; },
    idle(g) {
      const S = g.s;
      if (!S) return;
      tick(g);
      if (S.won) S.winT++;
      thumb(g);
    },

    // בוט לבדיקות: מסיק משבצת בהיגיון של שורה/עמודה ומסמן אותה דרך אותה פעולה של השחקן
    bot(g) {
      const S = g.s;
      if (S.won || ++S.botT % 3) return;
      const d = deduce(S, false);
      if (d) { const [i, v] = d.cells[0]; S.cur = i; S.kbd = false; S.hover = i; apply(g, i, v === 1 ? 'fill' : 'cross'); }
    },

    onKey(g, e) {
      const S = g.s, c = e.code, P = S.P;
      if (S.won) return;
      const d = KEYDIR[c];
      if (d) {
        if (!S.kbd) { S.kbd = true; return; }
        const x = g.clamp(S.cur % P.W + d[0], 0, P.W - 1), y = g.clamp(Math.floor(S.cur / P.W) + d[1], 0, P.H - 1), n = y * P.W + x;
        if (n === S.cur) return;
        S.cur = n;
        if (g.key('Space') || g.key('Enter')) apply(g, n, 'fill');
        else if (g.key('KeyX')) apply(g, n, 'cross');
        else g.sfx('tick');
        return;
      }
      if (e.repeat) return;
      if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter') { S.kbd = true; if (!apply(g, S.cur, 'fill')) g.sfx('tick'); }
      else if (c === 'KeyX') { S.kbd = true; if (!apply(g, S.cur, 'cross')) g.sfx('tick'); }
      else if (c === 'KeyH') press(g, 'hint');
      else if (c === 'KeyR') press(g, 'restart');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'move') {
        if (p.kind === 'mouse') { const b = btnAt(S, p.x, p.y); S.hoverBtn = b ? b.id : null; S.kbd = false; }
        if (S.stroke && p.id === S.stroke.id) strokeTo(g, S, p.x, p.y);
        else if (p.kind === 'mouse') S.hover = cellAt(S, p.x, p.y);
        return;
      }
      if (type === 'down') {
        const b = btnAt(S, p.x, p.y);
        if (b) { press(g, b.id); return; }
        const i = cellAt(S, p.x, p.y);
        if (i < 0 || S.won) return;
        S.kbd = false; S.cur = i; S.hover = i;
        const act = p.kind === 'mouse' && p.button === 2 ? 'cross' : S.mode;
        S.stroke = { id: p.id, act, x0: i % S.P.W, y0: Math.floor(i / S.P.W), axis: null, last: i };
        if (!apply(g, i, act)) g.sfx('tick');
        return;
      }
      if (type === 'up') { if (S.stroke && p.id === S.stroke.id) S.stroke = null; if (p.kind !== 'mouse') S.hover = -1; }
    },

    draw(g, ctx) {
      const S = g.s;
      if (!S) return;
      drawBack(g, ctx, g.W, g.H, g.frame + (S.winT || 0));
      drawBoard(g, ctx, S);
      if (!g.demo) { drawSide(g, ctx, S); drawTip(g, ctx, S); }
      if (S.won) drawBanner(g, ctx, S);
    },

    cover(ctx, w, h, k) {
      const P = puzzle(34), S = makeState(w, h, P);
      const span = P.W + P.H - 2;
      for (let i = 0; i < S.N; i++) { const x = i % P.W, y = Math.floor(i / P.W); if (x + y < 19 && (x + y < 13 || (x * 7 + y * 3) % 5 < 3)) S.board[i] = P.sol[i] ? 1 : 2; }
      S.c = 30; S.fs = 14; S.sw = 20; S.sh = 18; S.cw = 98; S.ch = 92;
      S.gx = Math.round((w - (S.cw + S.c * P.W)) / 2 + S.cw - 110); S.gy = Math.round((h - (S.ch + S.c * P.H)) / 2 + S.ch);
      drawBack(k, ctx, w, h, 140);
      drawBoard(k, ctx, S);
      // החצי השני כבר מתגלה בצבע
      for (let i = 0; i < S.N; i++) { const x = i % P.W, y = Math.floor(i / P.W), q = (x + y) / span; if (q > 0.55) { ctx.globalAlpha = Math.min(1, (q - 0.55) * 14); ctx.fillStyle = P.col[i]; ctx.fillRect(S.gx + x * S.c, S.gy + y * S.c, S.c + 0.5, S.c + 0.5); } }
      ctx.globalAlpha = 1;
      for (let j = 0; j < 14; j++) { const t = j / 13, x = S.gx + S.c * P.W * (0.35 + t * 0.65), y = S.gy + S.c * P.H * (1 - t) * 0.95; k.circle(ctx, x, y, 3 + (j % 3) * 2); ctx.fillStyle = j % 2 ? '#ffffff' : '#ffd166'; ctx.fill(); }
      // התמונה הקטנה והכוכבים בצד
      const px = w - 230, py = 120;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; k.rr(ctx, px, py, 190, 170, 18); ctx.fillStyle = '#fbf8f1'; ctx.fill(); ctx.restore();
      S.board.fill(1);
      drawPic(ctx, S, px + 14, py + 14, 162, 142, true, null);
      for (let j = 0; j < 3; j++) drawStar(ctx, px + 95 + (j - 1) * 50, py + 220, 20, true);
    },

    // לבדיקות בלבד
    dev: { PICS, PAL, HOLE, NAMES, puzzle, solveLine, propagate, countSolutions, starsOf, deduce },
  });
})();
