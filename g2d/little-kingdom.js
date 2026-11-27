// ============================================================
//  הממלכה הקטנה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  בונים כפר על מפה קטנה: בתים (אנשים), חוות (אוכל), מנסרה (עץ), מחצבה (אבן),
//  חומות, מגדלים, מגורי חיילים וטירה. גובלינים פושטים כל כמה דקות.
//  7 פרקים עם מטרות. הממלכה נשמרת (g.save) וממשיכה בפעם הבאה.
// ============================================================
(function () {
  'use strict';
  const W = 960, T = 48, COLS = 20, ROWS = 10, MH = ROWS * T, TOPM = 24, DT = 1 / 60;
  // לרוחב: פס עליון 48, רצועת נוף 24, מפה 480, סרגל בנייה 96. לאורך (טלפון) הפסים גדולים יותר — setLayout
  let H = 648, MY = 72, BY = MY + MH;
  let HP = 1328;
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const FONT = 'Heebo, Arial, sans-serif';
  const U = GK.U;
  // המפה: . דשא  T עצים  R סלעים  W אגם  C גבעת הטירה (רק הטירה נבנית שם). הגובלינים נכנסים מהקצוות (עמודה 0 ו-19, שורות 3–6)
  const MAP = [
    'TTTT.........RRR..TT',
    'TTT.....CCC...RR...T',
    'TT......CCC.........',
    '........CCC.........',
    '....................',
    '....................',
    '....................',
    '.WW...............RR',
    'WWWW........T....RRR',
    'WWW...TT........RRRR',
  ];
  const ter = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? 'X' : MAP[r][c]);
  const isGate = (c, r) => (c === 0 || c === COLS - 1) && r >= 3 && r <= 6;
  const HALL = { c: 9, r: 4 }, HILL = { c: 8, r: 1 };
  const RES = ['food', 'wood', 'stone'];
  // מבנים: גודל במשבצות, מחיר, חיים, מקומות מגורים, עובדים, מה מייצר, כל כמה שניות, ליד מה חייב לעמוד, מאיזה פרק פתוח
  const B = {
    hall: { s: 2, hp: 400, house: 6, make: 'wood', amt: 2, every: 6 },
    house: { s: 1, cost: { wood: 12 }, hp: 60, house: 4, ch: 0 },
    farm: { s: 2, cost: { wood: 20 }, hp: 80, jobs: 2, make: 'food', amt: 4, every: 6, ch: 0 },
    mill: { s: 2, cost: { wood: 20, food: 10 }, hp: 80, jobs: 2, make: 'wood', amt: 3, every: 6, near: 'T', ch: 1 },
    quarry: { s: 2, cost: { wood: 30 }, hp: 100, jobs: 2, make: 'stone', amt: 3, every: 7, near: 'R', ch: 1 },
    tower: { s: 1, cost: { wood: 20, stone: 20 }, hp: 140, range: 3.6, dmg: 8, rate: 1, ch: 2 },
    wall: { s: 1, cost: { stone: 3 }, hp: 90, ch: 3 },
    barracks: { s: 2, cost: { wood: 40, stone: 25 }, hp: 160, troops: 3, ch: 2 },
    castle: { s: 3, cost: { wood: 150, stone: 160, food: 80 }, hp: 600, house: 10, range: 4.6, dmg: 12, rate: 1.4, troops: 2, ch: 5 },
  };
  const ORDER = ['house', 'farm', 'mill', 'quarry', 'tower', 'wall', 'barracks', 'castle'];
  const EAT = 1 / 15, GROW = 4, TRAIN = 8, TRAIN_FOOD = 10, KO_TIME = 15;
  // גובלינים: חיים, מהירות (משבצות לשנייה), נזק למכה, רדיוס, כמה הם סוחבים
  const GOB = {
    grunt: { hp: 22, sp: 0.9, dmg: 5, r: 11, loot: 12 },
    runner: { hp: 14, sp: 1.5, dmg: 3, r: 9, loot: 10 },
    brute: { hp: 80, sp: 0.6, dmg: 16, r: 16, loot: 20 },
    chief: { hp: 240, sp: 0.55, dmg: 22, r: 20, loot: 40 },
  };
  const DIFF = [
    { hp: 1, n: 1, every: 180, first: 100 },
    { hp: 1.3, n: 1.3, every: 150, first: 85 },
    { hp: 1.65, n: 1.6, every: 120, first: 70 },
  ];
  // פרקים: מטרות [סוג, כמה] ופרס
  const CH = [
    { goals: [['house', 1], ['farm', 1], ['people', 8]], reward: { wood: 30, stone: 10 } },
    { goals: [['mill', 1], ['quarry', 1], ['people', 12]], reward: { wood: 30, stone: 40 } },
    { goals: [['tower', 1], ['barracks', 1], ['raids', 1]], reward: { food: 40, wood: 40, stone: 40 } },
    { goals: [['people', 20], ['farms', 3], ['walls', 8]], reward: { food: 50, wood: 50, stone: 50 } },
    { goals: [['towers', 3], ['soldiers', 6], ['raids', 3]], reward: { food: 60, wood: 80, stone: 80 } },
    { goals: [['castle', 1]], reward: { food: 100, wood: 100, stone: 100 } },
    { goals: [['people', 40], ['raids', 8]], reward: { food: 200, wood: 200, stone: 200 } },
  ];
  const SOL = { hp: 45, dmg: 6, rate: 0.8, sp: 1.7 };

  // ---------- טקסטים (8 שפות). helpTouch נבנה מ-tt ומשורות העזרה ----------
  const TX = {
    he: {
      title: 'הממלכה הקטנה',
      help: ['בחר מבנה בסרגל למטה ולחץ על הדשא כדי לבנות', 'בתים מביאים אנשים, חוות נותנות אוכל, המנסרה עץ והמחצבה אבן', 'גובלינים פושטים כל כמה דקות — בנה מגדלים, חומות וחיילים', 'השלם את המטרות של כל פרק. הממלכה נשמרת לבד', 'מקשים: 1–8 מבנים · F מהירות ×2 · קליק ימני מבטל'],
      tt: 'בחר מבנה למטה, הקש על הדשא והקש שוב כדי לבנות',
      n_hall: 'אולם הכפר', n_house: 'בית', n_farm: 'חווה', n_mill: 'מנסרה', n_quarry: 'מחצבה', n_tower: 'מגדל שמירה', n_wall: 'חומה', n_barracks: 'מגורי חיילים', n_castle: 'טירה',
      d_hall: 'הלב של הכפר. כאן שמורים האוכל, העץ והאבן — והגובלינים רוצים אותם', d_house: 'מביא 4 אנשים חדשים לכפר', d_farm: 'מגדלת אוכל. צריכה 2 עובדים', d_mill: 'כורתת עץ. בנה ליד היער. צריכה 2 עובדים', d_quarry: 'חוצבת אבן. בנה ליד הסלעים. צריכה 2 עובדים', d_tower: 'קשת יורה חצים על גובלינים קרובים', d_wall: 'עוצרת גובלינים. הם צריכים לשבור אותה קודם', d_barracks: 'מאמנים עד 3 חיילים (10 אוכל לכל אחד)', d_castle: 'הלב של הממלכה: 10 אנשים, 2 אבירים, והיא יורה חצים',
      food: 'אוכל', wood: 'עץ', stone: 'אבן', people: 'אנשים', soldiersL: 'חיילים',
      c1: 'כפר חדש', c2: 'עץ ואבן', c3: 'השומרים', c4: 'עיר שגדלה', c5: 'הגנה חזקה', c6: 'הטירה', c7: 'ממלכה אגדית',
      chapter: 'פרק {n}', goals: 'מטרות', reward: 'פרס', chDone: 'פרק {n} הושלם!', letsGo: 'יאללה!', nextCh: 'לפרק הבא', closeB: 'סגור', newK: 'ממלכה חדשה', newQ: 'להתחיל ממלכה חדשה? הממלכה הזאת תימחק.', newYes: 'כן, להתחיל מחדש', allDone: 'הממלכה שלך מושלמת! הגובלינים ימשיכו לבוא — המשך להגן עליה.',
      g_house: 'בנה בית', g_farm: 'בנה חווה', g_mill: 'בנה מנסרה', g_quarry: 'בנה מחצבה', g_tower: 'בנה מגדל שמירה', g_barracks: 'בנה מגורי חיילים', g_castle: 'בנה את הטירה', g_people: 'הגע ל-{n} אנשים', g_farms: 'שיהיו לך {n} חוות', g_walls: 'בנה {n} קטעי חומה', g_towers: 'שיהיו לך {n} מגדלים', g_soldiers: 'שיהיו לך {n} חיילים', g_raids: 'הדוף פשיטות של גובלינים',
      noFood: 'אין מספיק אוכל', noWood: 'אין מספיק עץ', noStone: 'אין מספיק אבן', cant: 'אי אפשר לבנות כאן', nTrees: 'בנה ליד היער', nRocks: 'בנה ליד הסלעים', locked: 'נפתח בפרק {n}', oneCastle: 'כבר יש לך טירה', hill: 'הגבעה הזאת שמורה לטירה', hillOnly: 'את הטירה בונים על גבעת הטירה, מעל האולם', raidNowQ: 'עוד לחיצה — והגובלינים באים עכשיו!', raidNextT: 'הפשיטה הבאה', raidNextD: 'לחץ כאן פעמיים כדי להזעיק את הגובלינים עכשיו', raidWait: 'הגובלינים עוד מתאספים — נסה שוב עוד מעט',
      raidSoon: 'הגובלינים מתקרבים!', raidGo: 'פשיטת גובלינים!', raidWon: 'הדפת את הפשיטה!', raidLost: 'הגובלינים גנבו {n} משאבים',
      hungry: 'נגמר האוכל! בנה חוות', noWork: 'אין מספיק עובדים — בנה בתים', full: 'הבתים מלאים — בנה עוד בתים',
      workers: 'עובדים {n}/{m}', makes: '+{n} {r} כל {s} שניות', removeB: 'הרוס', ruined: 'נפגע — יתוקן אחרי הפשיטה', training: 'חיילים {n}/{m}', shoots: 'יורה על גובלינים', home: '+{n} אנשים',
      tut1: 'בחר את הבית בסרגל למטה', tut2: 'לחץ על הדשא כדי לבנות', tut2t: 'הקש על הדשא, ושוב כדי לבנות', tut3: 'עכשיו בחר חווה — היא נותנת אוכל', tut4: 'לבתים מגיעים אנשים חדשים. הגע ל-8!', tut5: 'בחר מנסרה ובנה אותה ליד היער', tut6: 'גובלינים יגיעו בקרוב! בנה מגדל ליד אולם הכפר',
    },
    en: {
      title: 'Little Kingdom',
      help: ['Pick a building in the bar below, then click the grass to build it', 'Houses bring people, farms make food, the lumber mill wood and the quarry stone', 'Goblins raid every few minutes — build towers, walls and soldiers', "Complete each chapter's goals. Your kingdom saves by itself", 'Keys: 1–8 buildings · F speed ×2 · right click cancels'],
      tt: 'Pick a building below, tap the grass, then tap again to build',
      n_hall: 'Village Hall', n_house: 'House', n_farm: 'Farm', n_mill: 'Lumber Mill', n_quarry: 'Quarry', n_tower: 'Watchtower', n_wall: 'Wall', n_barracks: 'Barracks', n_castle: 'Castle',
      d_hall: 'The heart of the village. Food, wood and stone are kept here — goblins want them', d_house: 'Brings 4 new people to the village', d_farm: 'Grows food. Needs 2 workers', d_mill: 'Cuts wood. Build it by the forest. Needs 2 workers', d_quarry: 'Cuts stone. Build it by the rocks. Needs 2 workers', d_tower: 'An archer shoots arrows at nearby goblins', d_wall: 'Stops goblins. They have to break it first', d_barracks: 'Trains up to 3 soldiers (10 food each)', d_castle: 'The heart of your kingdom: 10 people, 2 knights, and it shoots arrows',
      food: 'Food', wood: 'Wood', stone: 'Stone', people: 'People', soldiersL: 'Soldiers',
      c1: 'A New Village', c2: 'Wood and Stone', c3: 'The Guards', c4: 'A Growing Town', c5: 'Strong Defense', c6: 'The Castle', c7: 'A Legendary Kingdom',
      chapter: 'Chapter {n}', goals: 'Goals', reward: 'Reward', chDone: 'Chapter {n} complete!', letsGo: "Let's go!", nextCh: 'Next chapter', closeB: 'Close', newK: 'New kingdom', newQ: 'Start a new kingdom? This one will be lost.', newYes: 'Yes, start over', allDone: 'Your kingdom is complete! The goblins keep coming — keep defending it.',
      g_house: 'Build a house', g_farm: 'Build a farm', g_mill: 'Build a lumber mill', g_quarry: 'Build a quarry', g_tower: 'Build a watchtower', g_barracks: 'Build barracks', g_castle: 'Build the castle', g_people: 'Reach {n} people', g_farms: 'Have {n} farms', g_walls: 'Build {n} wall pieces', g_towers: 'Have {n} towers', g_soldiers: 'Have {n} soldiers', g_raids: 'Repel goblin raids',
      noFood: 'Not enough food', noWood: 'Not enough wood', noStone: 'Not enough stone', cant: "You can't build here", nTrees: 'Build it next to the forest', nRocks: 'Build it next to the rocks', locked: 'Opens in chapter {n}', oneCastle: 'You already have a castle', hill: 'This hill is saved for the castle', hillOnly: 'The castle goes on the castle hill, above the hall', raidNowQ: 'Press again and the goblins come now!', raidNextT: 'Next raid', raidNextD: 'Press here twice to call the goblins now', raidWait: 'The goblins are still gathering — try again soon',
      raidSoon: 'Goblins are coming!', raidGo: 'Goblin raid!', raidWon: 'Raid repelled!', raidLost: 'The goblins stole {n} supplies',
      hungry: 'Out of food! Build farms', noWork: 'Not enough workers — build houses', full: 'Houses are full — build more houses',
      workers: 'Workers {n}/{m}', makes: '+{n} {r} every {s} s', removeB: 'Remove', ruined: 'Damaged — fixed after the raid', training: 'Soldiers {n}/{m}', shoots: 'Shoots goblins', home: '+{n} people',
      tut1: 'Pick the house in the bar below', tut2: 'Click the grass to build it', tut2t: 'Tap the grass, then tap again to build', tut3: 'Now pick the farm — it makes food', tut4: 'New people move into houses. Reach 8!', tut5: 'Pick the lumber mill and build it by the forest', tut6: 'Goblins are coming soon! Build a tower near the village hall',
    },
    ar: {
      title: 'المملكة الصغيرة',
      help: ['اختر مبنى من الشريط في الأسفل ثم انقر على العشب لتبنيه', 'البيوت تجلب الناس، والمزارع تصنع الطعام، والمنشرة الخشب، والمحجر الحجر', 'العفاريت تغير كل بضع دقائق — ابنِ أبراجاً وأسواراً وجنوداً', 'أكمل أهداف كل فصل. مملكتك تُحفظ تلقائياً', 'المفاتيح: 1–8 المباني · F سرعة ×2 · النقر الأيمن يلغي'],
      tt: 'اختر مبنى في الأسفل، المس العشب ثم المسه مجدداً للبناء',
      n_hall: 'قاعة القرية', n_house: 'بيت', n_farm: 'مزرعة', n_mill: 'منشرة', n_quarry: 'محجر', n_tower: 'برج حراسة', n_wall: 'سور', n_barracks: 'ثكنة', n_castle: 'قلعة',
      d_hall: 'قلب القرية. هنا يُحفظ الطعام والخشب والحجر — والعفاريت تريدها', d_house: 'يجلب 4 أشخاص جدد إلى القرية', d_farm: 'تزرع الطعام. تحتاج عاملَين', d_mill: 'تقطع الخشب. ابنِها قرب الغابة. تحتاج عاملَين', d_quarry: 'يقطع الحجر. ابنِه قرب الصخور. يحتاج عاملَين', d_tower: 'رامٍ يطلق السهام على العفاريت القريبة', d_wall: 'يوقف العفاريت. عليها كسره أولاً', d_barracks: 'تدرّب حتى 3 جنود (10 طعام لكل جندي)', d_castle: 'قلب مملكتك: 10 أشخاص وفارسان، وتطلق السهام',
      food: 'طعام', wood: 'خشب', stone: 'حجر', people: 'الناس', soldiersL: 'الجنود',
      c1: 'قرية جديدة', c2: 'خشب وحجر', c3: 'الحرّاس', c4: 'بلدة تكبر', c5: 'دفاع قوي', c6: 'القلعة', c7: 'مملكة أسطورية',
      chapter: 'الفصل {n}', goals: 'الأهداف', reward: 'الجائزة', chDone: 'اكتمل الفصل {n}!', letsGo: 'هيا بنا!', nextCh: 'الفصل التالي', closeB: 'إغلاق', newK: 'مملكة جديدة', newQ: 'هل تبدأ مملكة جديدة؟ ستضيع هذه المملكة.', newYes: 'نعم، ابدأ من جديد', allDone: 'اكتملت مملكتك! العفاريت ستواصل المجيء — واصل الدفاع عنها.',
      g_house: 'ابنِ بيتاً', g_farm: 'ابنِ مزرعة', g_mill: 'ابنِ منشرة', g_quarry: 'ابنِ محجراً', g_tower: 'ابنِ برج حراسة', g_barracks: 'ابنِ ثكنة', g_castle: 'ابنِ القلعة', g_people: 'صِل إلى {n} شخصاً', g_farms: 'امتلك {n} مزارع', g_walls: 'ابنِ {n} قطع سور', g_towers: 'امتلك {n} أبراج', g_soldiers: 'امتلك {n} جنود', g_raids: 'اصدد غارات العفاريت',
      noFood: 'الطعام لا يكفي', noWood: 'الخشب لا يكفي', noStone: 'الحجر لا يكفي', cant: 'لا يمكن البناء هنا', nTrees: 'ابنِها قرب الغابة', nRocks: 'ابنِه قرب الصخور', locked: 'يُفتح في الفصل {n}', oneCastle: 'لديك قلعة بالفعل', hill: 'هذه التلة محجوزة للقلعة', hillOnly: 'تُبنى القلعة على تلة القلعة فوق القاعة', raidNowQ: 'اضغط مرة أخرى وستأتي العفاريت الآن!', raidNextT: 'الغارة التالية', raidNextD: 'اضغط هنا مرتين لاستدعاء العفاريت الآن', raidWait: 'العفاريت ما زالت تتجمع — حاول بعد قليل',
      raidSoon: 'العفاريت قادمة!', raidGo: 'غارة العفاريت!', raidWon: 'صددت الغارة!', raidLost: 'سرقت العفاريت {n} من المؤن',
      hungry: 'نفد الطعام! ابنِ مزارع', noWork: 'العمال لا يكفون — ابنِ بيوتاً', full: 'البيوت ممتلئة — ابنِ بيوتاً أكثر',
      workers: 'العمال {n}/{m}', makes: '+{n} {r} كل {s} ث', removeB: 'هدم', ruined: 'متضرر — يُصلَح بعد الغارة', training: 'الجنود {n}/{m}', shoots: 'يطلق على العفاريت', home: '+{n} أشخاص',
      tut1: 'اختر البيت من الشريط في الأسفل', tut2: 'انقر على العشب لتبنيه', tut2t: 'المس العشب، ثم المسه مجدداً للبناء', tut3: 'الآن اختر المزرعة — إنها تصنع الطعام', tut4: 'أناس جدد يسكنون البيوت. صِل إلى 8!', tut5: 'اختر المنشرة وابنِها قرب الغابة', tut6: 'العفاريت قادمة قريباً! ابنِ برجاً قرب قاعة القرية',
    },
    es: {
      title: 'El Pequeño Reino',
      help: ['Elige un edificio en la barra de abajo y haz clic en la hierba para construirlo', 'Las casas traen gente, las granjas comida, el aserradero madera y la cantera piedra', 'Los goblins atacan cada pocos minutos: construye torres, murallas y soldados', 'Cumple los objetivos de cada capítulo. Tu reino se guarda solo', 'Teclas: 1–8 edificios · F velocidad ×2 · clic derecho cancela'],
      tt: 'Elige un edificio abajo, toca la hierba y vuelve a tocar para construir',
      n_hall: 'Ayuntamiento', n_house: 'Casa', n_farm: 'Granja', n_mill: 'Aserradero', n_quarry: 'Cantera', n_tower: 'Torre de vigía', n_wall: 'Muralla', n_barracks: 'Cuartel', n_castle: 'Castillo',
      d_hall: 'El corazón del pueblo. Aquí se guardan comida, madera y piedra: los goblins las quieren', d_house: 'Trae 4 personas nuevas al pueblo', d_farm: 'Cultiva comida. Necesita 2 trabajadores', d_mill: 'Corta madera. Constrúyelo junto al bosque. Necesita 2 trabajadores', d_quarry: 'Saca piedra. Constrúyela junto a las rocas. Necesita 2 trabajadores', d_tower: 'Un arquero dispara flechas a los goblins cercanos', d_wall: 'Frena a los goblins. Primero tienen que romperla', d_barracks: 'Entrena hasta 3 soldados (10 de comida cada uno)', d_castle: 'El corazón de tu reino: 10 personas, 2 caballeros y dispara flechas',
      food: 'Comida', wood: 'Madera', stone: 'Piedra', people: 'Personas', soldiersL: 'Soldados',
      c1: 'Un pueblo nuevo', c2: 'Madera y piedra', c3: 'Los guardias', c4: 'Un pueblo que crece', c5: 'Defensa fuerte', c6: 'El castillo', c7: 'Un reino legendario',
      chapter: 'Capítulo {n}', goals: 'Objetivos', reward: 'Premio', chDone: '¡Capítulo {n} completado!', letsGo: '¡Vamos!', nextCh: 'Siguiente capítulo', closeB: 'Cerrar', newK: 'Reino nuevo', newQ: '¿Empezar un reino nuevo? Este se perderá.', newYes: 'Sí, empezar de nuevo', allDone: '¡Tu reino está completo! Los goblins seguirán viniendo: sigue defendiéndolo.',
      g_house: 'Construye una casa', g_farm: 'Construye una granja', g_mill: 'Construye un aserradero', g_quarry: 'Construye una cantera', g_tower: 'Construye una torre de vigía', g_barracks: 'Construye un cuartel', g_castle: 'Construye el castillo', g_people: 'Llega a {n} personas', g_farms: 'Ten {n} granjas', g_walls: 'Construye {n} tramos de muralla', g_towers: 'Ten {n} torres', g_soldiers: 'Ten {n} soldados', g_raids: 'Rechaza ataques de goblins',
      noFood: 'No hay comida suficiente', noWood: 'No hay madera suficiente', noStone: 'No hay piedra suficiente', cant: 'No se puede construir aquí', nTrees: 'Constrúyelo junto al bosque', nRocks: 'Constrúyela junto a las rocas', locked: 'Se abre en el capítulo {n}', oneCastle: 'Ya tienes un castillo', hill: 'Esta colina está reservada para el castillo', hillOnly: 'El castillo va en la colina, encima del ayuntamiento', raidNowQ: '¡Pulsa otra vez y los goblins vienen ya!', raidNextT: 'Próximo ataque', raidNextD: 'Pulsa aquí dos veces para llamar a los goblins ya', raidWait: 'Los goblins aún se están reuniendo: inténtalo pronto',
      raidSoon: '¡Vienen los goblins!', raidGo: '¡Ataque goblin!', raidWon: '¡Ataque rechazado!', raidLost: 'Los goblins robaron {n} provisiones',
      hungry: '¡Sin comida! Construye granjas', noWork: 'Faltan trabajadores: construye casas', full: 'Las casas están llenas: construye más',
      workers: 'Trabajadores {n}/{m}', makes: '+{n} de {r} cada {s} s', removeB: 'Quitar', ruined: 'Dañado: se arregla tras el ataque', training: 'Soldados {n}/{m}', shoots: 'Dispara a los goblins', home: '+{n} personas',
      tut1: 'Elige la casa en la barra de abajo', tut2: 'Haz clic en la hierba para construirla', tut2t: 'Toca la hierba y vuelve a tocar para construir', tut3: 'Ahora elige la granja: da comida', tut4: 'Llega gente nueva a las casas. ¡Llega a 8!', tut5: 'Elige el aserradero y constrúyelo junto al bosque', tut6: '¡Pronto vendrán goblins! Construye una torre cerca del ayuntamiento',
    },
    fr: {
      title: 'Le Petit Royaume',
      help: ['Choisis un bâtiment dans la barre du bas, puis clique sur l’herbe pour le construire', 'Les maisons amènent des habitants, les fermes de la nourriture, la scierie du bois, la carrière de la pierre', 'Les gobelins attaquent toutes les quelques minutes : construis tours, murs et soldats', 'Remplis les objectifs de chaque chapitre. Ton royaume se sauvegarde tout seul', 'Touches : 1–8 bâtiments · F vitesse ×2 · clic droit annule'],
      tt: 'Choisis un bâtiment en bas, touche l’herbe, puis touche encore pour construire',
      n_hall: 'Mairie', n_house: 'Maison', n_farm: 'Ferme', n_mill: 'Scierie', n_quarry: 'Carrière', n_tower: 'Tour de guet', n_wall: 'Mur', n_barracks: 'Caserne', n_castle: 'Château',
      d_hall: 'Le cœur du village. Nourriture, bois et pierre sont gardés ici — les gobelins les veulent', d_house: 'Amène 4 nouveaux habitants au village', d_farm: 'Produit de la nourriture. Il faut 2 ouvriers', d_mill: 'Coupe du bois. À bâtir près de la forêt. Il faut 2 ouvriers', d_quarry: 'Taille de la pierre. À bâtir près des rochers. Il faut 2 ouvriers', d_tower: 'Un archer tire des flèches sur les gobelins proches', d_wall: 'Arrête les gobelins. Ils doivent d’abord le casser', d_barracks: 'Entraîne jusqu’à 3 soldats (10 nourriture chacun)', d_castle: 'Le cœur de ton royaume : 10 habitants, 2 chevaliers, et il tire des flèches',
      food: 'Nourriture', wood: 'Bois', stone: 'Pierre', people: 'Habitants', soldiersL: 'Soldats',
      c1: 'Un nouveau village', c2: 'Bois et pierre', c3: 'Les gardes', c4: 'Une ville qui grandit', c5: 'Défense solide', c6: 'Le château', c7: 'Un royaume légendaire',
      chapter: 'Chapitre {n}', goals: 'Objectifs', reward: 'Récompense', chDone: 'Chapitre {n} terminé !', letsGo: 'C’est parti !', nextCh: 'Chapitre suivant', closeB: 'Fermer', newK: 'Nouveau royaume', newQ: 'Commencer un nouveau royaume ? Celui-ci sera perdu.', newYes: 'Oui, recommencer', allDone: 'Ton royaume est complet ! Les gobelins vont continuer à venir — continue de le défendre.',
      g_house: 'Construis une maison', g_farm: 'Construis une ferme', g_mill: 'Construis une scierie', g_quarry: 'Construis une carrière', g_tower: 'Construis une tour de guet', g_barracks: 'Construis une caserne', g_castle: 'Construis le château', g_people: 'Atteins {n} habitants', g_farms: 'Aie {n} fermes', g_walls: 'Construis {n} morceaux de mur', g_towers: 'Aie {n} tours', g_soldiers: 'Aie {n} soldats', g_raids: 'Repousse les attaques de gobelins',
      noFood: 'Pas assez de nourriture', noWood: 'Pas assez de bois', noStone: 'Pas assez de pierre', cant: 'Impossible de construire ici', nTrees: 'Construis-la près de la forêt', nRocks: 'Construis-la près des rochers', locked: 'Ouvert au chapitre {n}', oneCastle: 'Tu as déjà un château', hill: 'Cette colline est réservée au château', hillOnly: 'Le château se bâtit sur la colline, au-dessus de la mairie', raidNowQ: 'Appuie encore et les gobelins arrivent !', raidNextT: 'Prochaine attaque', raidNextD: 'Appuie ici deux fois pour appeler les gobelins tout de suite', raidWait: 'Les gobelins se rassemblent encore — réessaie bientôt',
      raidSoon: 'Les gobelins arrivent !', raidGo: 'Attaque de gobelins !', raidWon: 'Attaque repoussée !', raidLost: 'Les gobelins ont volé {n} provisions',
      hungry: 'Plus de nourriture ! Construis des fermes', noWork: 'Pas assez d’ouvriers — construis des maisons', full: 'Les maisons sont pleines — construis-en d’autres',
      workers: 'Ouvriers {n}/{m}', makes: '+{n} {r} toutes les {s} s', removeB: 'Démolir', ruined: 'Abîmé — réparé après l’attaque', training: 'Soldats {n}/{m}', shoots: 'Tire sur les gobelins', home: '+{n} habitants',
      tut1: 'Choisis la maison dans la barre du bas', tut2: 'Clique sur l’herbe pour la construire', tut2t: 'Touche l’herbe, puis touche encore pour construire', tut3: 'Choisis maintenant la ferme — elle donne à manger', tut4: 'De nouveaux habitants arrivent dans les maisons. Atteins 8 !', tut5: 'Choisis la scierie et construis-la près de la forêt', tut6: 'Les gobelins arrivent bientôt ! Construis une tour près de la mairie',
    },
    pt: {
      title: 'O Pequeno Reino',
      help: ['Escolha um prédio na barra abaixo e clique na grama para construir', 'Casas trazem pessoas, fazendas fazem comida, a serraria madeira e a pedreira pedra', 'Goblins atacam a cada poucos minutos — construa torres, muralhas e soldados', 'Cumpra os objetivos de cada capítulo. Seu reino é salvo sozinho', 'Teclas: 1–8 prédios · F velocidade ×2 · clique direito cancela'],
      tt: 'Escolha um prédio abaixo, toque na grama e toque de novo para construir',
      n_hall: 'Prefeitura', n_house: 'Casa', n_farm: 'Fazenda', n_mill: 'Serraria', n_quarry: 'Pedreira', n_tower: 'Torre de vigia', n_wall: 'Muralha', n_barracks: 'Quartel', n_castle: 'Castelo',
      d_hall: 'O coração da vila. Aqui ficam comida, madeira e pedra — os goblins querem roubá-las', d_house: 'Traz 4 pessoas novas para a vila', d_farm: 'Planta comida. Precisa de 2 trabalhadores', d_mill: 'Corta madeira. Construa perto da floresta. Precisa de 2 trabalhadores', d_quarry: 'Tira pedra. Construa perto das rochas. Precisa de 2 trabalhadores', d_tower: 'Um arqueiro atira flechas nos goblins próximos', d_wall: 'Segura os goblins. Eles precisam quebrá-la primeiro', d_barracks: 'Treina até 3 soldados (10 de comida cada)', d_castle: 'O coração do seu reino: 10 pessoas, 2 cavaleiros, e atira flechas',
      food: 'Comida', wood: 'Madeira', stone: 'Pedra', people: 'Pessoas', soldiersL: 'Soldados',
      c1: 'Uma vila nova', c2: 'Madeira e pedra', c3: 'Os guardas', c4: 'Uma cidade que cresce', c5: 'Defesa forte', c6: 'O castelo', c7: 'Um reino lendário',
      chapter: 'Capítulo {n}', goals: 'Objetivos', reward: 'Prêmio', chDone: 'Capítulo {n} concluído!', letsGo: 'Vamos lá!', nextCh: 'Próximo capítulo', closeB: 'Fechar', newK: 'Reino novo', newQ: 'Começar um reino novo? Este será perdido.', newYes: 'Sim, recomeçar', allDone: 'Seu reino está completo! Os goblins vão continuar vindo — continue defendendo.',
      g_house: 'Construa uma casa', g_farm: 'Construa uma fazenda', g_mill: 'Construa uma serraria', g_quarry: 'Construa uma pedreira', g_tower: 'Construa uma torre de vigia', g_barracks: 'Construa um quartel', g_castle: 'Construa o castelo', g_people: 'Chegue a {n} pessoas', g_farms: 'Tenha {n} fazendas', g_walls: 'Construa {n} pedaços de muralha', g_towers: 'Tenha {n} torres', g_soldiers: 'Tenha {n} soldados', g_raids: 'Repila ataques de goblins',
      noFood: 'Comida insuficiente', noWood: 'Madeira insuficiente', noStone: 'Pedra insuficiente', cant: 'Não dá para construir aqui', nTrees: 'Construa perto da floresta', nRocks: 'Construa perto das rochas', locked: 'Abre no capítulo {n}', oneCastle: 'Você já tem um castelo', hill: 'Esta colina é reservada para o castelo', hillOnly: 'O castelo fica na colina, acima da prefeitura', raidNowQ: 'Aperte de novo e os goblins vêm agora!', raidNextT: 'Próximo ataque', raidNextD: 'Aperte aqui duas vezes para chamar os goblins agora', raidWait: 'Os goblins ainda estão se reunindo — tente daqui a pouco',
      raidSoon: 'Os goblins estão chegando!', raidGo: 'Ataque goblin!', raidWon: 'Ataque repelido!', raidLost: 'Os goblins roubaram {n} suprimentos',
      hungry: 'Acabou a comida! Construa fazendas', noWork: 'Faltam trabalhadores — construa casas', full: 'As casas estão cheias — construa mais casas',
      workers: 'Trabalhadores {n}/{m}', makes: '+{n} de {r} a cada {s} s', removeB: 'Demolir', ruined: 'Danificado — consertado após o ataque', training: 'Soldados {n}/{m}', shoots: 'Atira nos goblins', home: '+{n} pessoas',
      tut1: 'Escolha a casa na barra abaixo', tut2: 'Clique na grama para construir', tut2t: 'Toque na grama e toque de novo para construir', tut3: 'Agora escolha a fazenda — ela faz comida', tut4: 'Gente nova chega às casas. Chegue a 8!', tut5: 'Escolha a serraria e construa perto da floresta', tut6: 'Os goblins vêm aí! Construa uma torre perto da prefeitura',
    },
    ru: {
      title: 'Маленькое королевство',
      help: ['Выбери здание на панели внизу и нажми на траву, чтобы построить', 'Дома приводят жителей, фермы дают еду, лесопилка — дерево, каменоломня — камень', 'Гоблины нападают каждые несколько минут — строй башни, стены и солдат', 'Выполняй цели каждой главы. Королевство сохраняется само', 'Клавиши: 1–8 здания · F скорость ×2 · правый клик — отмена'],
      tt: 'Выбери здание внизу, коснись травы и коснись ещё раз, чтобы построить',
      n_hall: 'Ратуша', n_house: 'Дом', n_farm: 'Ферма', n_mill: 'Лесопилка', n_quarry: 'Каменоломня', n_tower: 'Сторожевая башня', n_wall: 'Стена', n_barracks: 'Казарма', n_castle: 'Замок',
      d_hall: 'Сердце деревни. Здесь хранятся еда, дерево и камень — гоблины хотят их украсть', d_house: 'Приводит в деревню 4 новых жителей', d_farm: 'Выращивает еду. Нужны 2 работника', d_mill: 'Рубит дерево. Строй у леса. Нужны 2 работника', d_quarry: 'Добывает камень. Строй у скал. Нужны 2 работника', d_tower: 'Лучник стреляет в гоблинов поблизости', d_wall: 'Задерживает гоблинов. Им придётся её ломать', d_barracks: 'Обучает до 3 солдат (10 еды за каждого)', d_castle: 'Сердце королевства: 10 жителей, 2 рыцаря, и он стреляет',
      food: 'Еда', wood: 'Дерево', stone: 'Камень', people: 'Жители', soldiersL: 'Солдаты',
      c1: 'Новая деревня', c2: 'Дерево и камень', c3: 'Стражи', c4: 'Растущий город', c5: 'Крепкая оборона', c6: 'Замок', c7: 'Легендарное королевство',
      chapter: 'Глава {n}', goals: 'Цели', reward: 'Награда', chDone: 'Глава {n} пройдена!', letsGo: 'Вперёд!', nextCh: 'Следующая глава', closeB: 'Закрыть', newK: 'Новое королевство', newQ: 'Начать новое королевство? Это будет потеряно.', newYes: 'Да, начать заново', allDone: 'Королевство построено! Гоблины будут нападать и дальше — защищай его.',
      g_house: 'Построй дом', g_farm: 'Построй ферму', g_mill: 'Построй лесопилку', g_quarry: 'Построй каменоломню', g_tower: 'Построй сторожевую башню', g_barracks: 'Построй казарму', g_castle: 'Построй замок', g_people: 'Жителей: {n}', g_farms: 'Ферм: {n}', g_walls: 'Кусков стены: {n}', g_towers: 'Башен: {n}', g_soldiers: 'Солдат: {n}', g_raids: 'Отбей набеги гоблинов',
      noFood: 'Не хватает еды', noWood: 'Не хватает дерева', noStone: 'Не хватает камня', cant: 'Здесь строить нельзя', nTrees: 'Строй рядом с лесом', nRocks: 'Строй рядом со скалами', locked: 'Откроется в главе {n}', oneCastle: 'У тебя уже есть замок', hill: 'Этот холм оставлен для замка', hillOnly: 'Замок строят на холме над ратушей', raidNowQ: 'Нажми ещё раз — и гоблины придут сейчас!', raidNextT: 'Следующий набег', raidNextD: 'Нажми сюда дважды, чтобы позвать гоблинов сейчас', raidWait: 'Гоблины ещё собираются — попробуй чуть позже',
      raidSoon: 'Гоблины идут!', raidGo: 'Набег гоблинов!', raidWon: 'Набег отбит!', raidLost: 'Гоблины украли припасы: {n}',
      hungry: 'Еда кончилась! Строй фермы', noWork: 'Не хватает работников — строй дома', full: 'Дома заполнены — строй ещё',
      workers: 'Работники {n}/{m}', makes: '+{n} {r} каждые {s} с', removeB: 'Снести', ruined: 'Повреждено — починят после набега', training: 'Солдаты {n}/{m}', shoots: 'Стреляет в гоблинов', home: '+{n} жителей',
      tut1: 'Выбери дом на панели внизу', tut2: 'Нажми на траву, чтобы построить', tut2t: 'Коснись травы, потом ещё раз — чтобы построить', tut3: 'Теперь выбери ферму — она даёт еду', tut4: 'В дома приходят новые жители. Собери 8!', tut5: 'Выбери лесопилку и построй её у леса', tut6: 'Скоро придут гоблины! Построй башню у ратуши',
    },
    de: {
      title: 'Das kleine Königreich',
      help: ['Wähle unten ein Gebäude und klicke auf das Gras, um es zu bauen', 'Häuser bringen Leute, Höfe Essen, das Sägewerk Holz und der Steinbruch Stein', 'Alle paar Minuten greifen Kobolde an — baue Türme, Mauern und Soldaten', 'Erfülle die Ziele jedes Kapitels. Dein Königreich speichert sich selbst', 'Tasten: 1–8 Gebäude · F Tempo ×2 · Rechtsklick bricht ab'],
      tt: 'Wähle unten ein Gebäude, tippe aufs Gras und noch einmal zum Bauen',
      n_hall: 'Rathaus', n_house: 'Haus', n_farm: 'Bauernhof', n_mill: 'Sägewerk', n_quarry: 'Steinbruch', n_tower: 'Wachturm', n_wall: 'Mauer', n_barracks: 'Kaserne', n_castle: 'Burg',
      d_hall: 'Das Herz des Dorfes. Hier lagern Essen, Holz und Stein — die Kobolde wollen sie', d_house: 'Bringt 4 neue Leute ins Dorf', d_farm: 'Baut Essen an. Braucht 2 Arbeiter', d_mill: 'Schlägt Holz. Am Wald bauen. Braucht 2 Arbeiter', d_quarry: 'Bricht Stein. An den Felsen bauen. Braucht 2 Arbeiter', d_tower: 'Ein Bogenschütze schießt auf Kobolde in der Nähe', d_wall: 'Hält Kobolde auf. Sie müssen sie erst zerschlagen', d_barracks: 'Bildet bis zu 3 Soldaten aus (je 10 Essen)', d_castle: 'Das Herz deines Königreichs: 10 Leute, 2 Ritter, und sie schießt Pfeile',
      food: 'Essen', wood: 'Holz', stone: 'Stein', people: 'Leute', soldiersL: 'Soldaten',
      c1: 'Ein neues Dorf', c2: 'Holz und Stein', c3: 'Die Wächter', c4: 'Eine wachsende Stadt', c5: 'Starke Verteidigung', c6: 'Die Burg', c7: 'Ein legendäres Königreich',
      chapter: 'Kapitel {n}', goals: 'Ziele', reward: 'Belohnung', chDone: 'Kapitel {n} geschafft!', letsGo: 'Los geht’s!', nextCh: 'Nächstes Kapitel', closeB: 'Schließen', newK: 'Neues Königreich', newQ: 'Ein neues Königreich beginnen? Dieses geht verloren.', newYes: 'Ja, neu anfangen', allDone: 'Dein Königreich ist fertig! Die Kobolde kommen weiter — verteidige es.',
      g_house: 'Baue ein Haus', g_farm: 'Baue einen Bauernhof', g_mill: 'Baue ein Sägewerk', g_quarry: 'Baue einen Steinbruch', g_tower: 'Baue einen Wachturm', g_barracks: 'Baue eine Kaserne', g_castle: 'Baue die Burg', g_people: 'Erreiche {n} Leute', g_farms: 'Habe {n} Bauernhöfe', g_walls: 'Baue {n} Mauerstücke', g_towers: 'Habe {n} Türme', g_soldiers: 'Habe {n} Soldaten', g_raids: 'Wehre Koboldangriffe ab',
      noFood: 'Nicht genug Essen', noWood: 'Nicht genug Holz', noStone: 'Nicht genug Stein', cant: 'Hier kann man nicht bauen', nTrees: 'Am Wald bauen', nRocks: 'An den Felsen bauen', locked: 'Ab Kapitel {n}', oneCastle: 'Du hast schon eine Burg', hill: 'Dieser Hügel ist für die Burg reserviert', hillOnly: 'Die Burg kommt auf den Burghügel über dem Rathaus', raidNowQ: 'Drück nochmal und die Kobolde kommen jetzt!', raidNextT: 'Nächster Angriff', raidNextD: 'Drück hier zweimal, um die Kobolde jetzt zu rufen', raidWait: 'Die Kobolde sammeln sich noch — versuch es gleich nochmal',
      raidSoon: 'Die Kobolde kommen!', raidGo: 'Koboldangriff!', raidWon: 'Angriff abgewehrt!', raidLost: 'Die Kobolde haben {n} Vorräte geklaut',
      hungry: 'Kein Essen mehr! Baue Bauernhöfe', noWork: 'Zu wenig Arbeiter — baue Häuser', full: 'Die Häuser sind voll — baue mehr Häuser',
      workers: 'Arbeiter {n}/{m}', makes: '+{n} {r} alle {s} s', removeB: 'Abreißen', ruined: 'Beschädigt — wird nach dem Angriff repariert', training: 'Soldaten {n}/{m}', shoots: 'Schießt auf Kobolde', home: '+{n} Leute',
      tut1: 'Wähle unten das Haus', tut2: 'Klicke auf das Gras, um es zu bauen', tut2t: 'Tippe aufs Gras und noch einmal zum Bauen', tut3: 'Wähle jetzt den Bauernhof — er macht Essen', tut4: 'In die Häuser ziehen neue Leute. Erreiche 8!', tut5: 'Wähle das Sägewerk und baue es am Wald', tut6: 'Bald kommen Kobolde! Baue einen Turm beim Rathaus',
    },
  };
  for (const L in TX) TX[L].helpTouch = [TX[L].tt].concat(TX[L].help.slice(1, 4));

  // ---------- מצב ----------
  const idx = (c, r) => r * COLS + c;
  const SOLID = { T: 1, R: 1, W: 1, X: 1 };
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const tileOf = (x, y) => [Math.max(0, Math.min(COLS - 1, Math.floor(x / T))), Math.max(0, Math.min(ROWS - 1, Math.floor((y - MY) / T)))];
  let uid = 1;

  function newState(demo) {
    const S = {
      demo: !!demo, t: 0, anim: 0, speed: 1,
      res: { food: 30, wood: 50, stone: 10 }, pop: 4, cap: 0, jobs: 0, growT: 0, hungry: false, cnt: {},
      grid: new Array(COLS * ROWS).fill(null), bs: [],
      sol: [], gob: [], arrows: [], fly: [], walkers: [],
      ch: 0, raidOn: false, raidT: 0, raidMax: 0, raidN: 0, raid: null, won: 0, warned: false,
      sel: null, pick: null, pend: null, panel: null, toast: null, banner: null, fl: [], callT: 0,
      fIn: null, fOut: null, flowDirty: true, saveT: 3, goalT: 0, botT: 0,
      bump: { food: 0, wood: 0, stone: 0, people: 0 },
    };
    addB(S, 'hall', HALL.c, HALL.r);
    return S;
  }

  function addB(S, k, c, r) {
    const d = B[k], s = d.s;
    const b = { id: uid++, k, c, r, s, x: (c + s / 2) * T, y: MY + (r + s / 2) * T, foot: MY + (r + s) * T, hp: d.hp, max: d.hp, ruin: false, t: Math.random() * 2, staff: 0, train: 0, cd: 0.6, ang: -0.6, born: -9, seed: (c * 7 + r * 13) % 5, hitT: 0 };
    for (let y = r; y < r + s; y++) for (let x = c; x < c + s; x++) S.grid[idx(x, y)] = b;
    S.bs.push(b);
    S.flowDirty = true;
    recount(S);
    return b;
  }
  function delB(S, b) {
    for (let y = b.r; y < b.r + b.s; y++) for (let x = b.c; x < b.c + b.s; x++) S.grid[idx(x, y)] = null;
    S.bs.splice(S.bs.indexOf(b), 1);
    S.sol = S.sol.filter(s => s.home !== b);
    if (S.pick === b) S.pick = null;
    S.flowDirty = true;
    recount(S);
  }
  function recount(S) {
    S.cap = 0; S.jobs = 0; S.cnt = {};
    for (const b of S.bs) {
      const d = B[b.k];
      S.cnt[b.k] = (S.cnt[b.k] || 0) + 1;
      if (d.house) S.cap += d.house;
      if (d.jobs) S.jobs += d.jobs;
    }
  }
  const troopsOf = (S, b) => { let n = 0; for (const s of S.sol) if (s.home === b) n++; return n; };

  // אפשר לבנות כאן? '' = כן, אחרת מפתח של הודעה
  function canPlace(S, k, c, r) {
    const s = B[k].s, want = k === 'castle' ? 'C' : '.';
    if (k === 'castle' && S.cnt.castle) return 'oneCastle';
    if (c < 0 || r < 0 || c + s > COLS || r + s > ROWS) return k === 'castle' ? 'hillOnly' : 'cant';
    for (let y = r; y < r + s; y++) for (let x = c; x < c + s; x++) {
      const t = ter(x, y);
      if (t !== want) return k === 'castle' ? 'hillOnly' : t === 'C' ? 'hill' : 'cant';
      if (isGate(x, y) || S.grid[idx(x, y)]) return 'cant';
    }
    for (const e of S.gob) { const [gc, gr] = tileOf(e.x, e.y); if (gc >= c && gc < c + s && gr >= r && gr < r + s) return 'cant'; }
    const near = B[k].near;
    if (near) {
      for (let y = r - 1; y <= r + s; y++) for (let x = c - 1; x <= c + s; x++) if (ter(x, y) === near) return '';
      return near === 'T' ? 'nTrees' : 'nRocks';
    }
    return '';
  }
  const lackOf = (S, k) => { const c = B[k].cost; for (const r in c) if (S.res[r] < c[r]) return r; return null; };
  const LACK = { food: 'noFood', wood: 'noWood', stone: 'noStone' };
  // המשבצת שבה מבנה ייבנה כשהעכבר מעל נקודה (מבנה גדול ממורכז על הסמן)
  // הטירה נצמדת לגבעה שלה כשהסמן קרוב אליה
  const anchorAt = (k, x, y) => {
    const s = B[k].s, cx = x / T, cy = (y - MY) / T;
    if (k === 'castle' && cx >= HILL.c - 1 && cx < HILL.c + 4 && cy >= HILL.r - 1.5 && cy < HILL.r + 4) return [HILL.c, HILL.r];
    return [Math.floor(cx - (s - 1) / 2), Math.floor(cy - (s - 1) / 2)];
  };
  // טקסט שעולה מהמפה (מצויר מתחת לממשק, כדי שלא יעלה על הכיתובים)
  function pop(g, x, y, s, col, size) { const S = g.s; if (S && S.fl.length < 40) S.fl.push({ x, y, s: String(s), col, size: size || 20, t: 0, dead: false }); }

  // ---------- מפת הדרכים של הגובלינים (דייקסטרה על 200 משבצות) ----------
  function block(S, i) { const b = S.grid[i]; if (!b || b.ruin) return 0; if (b.k === 'hall') return 1e6; return b.k === 'wall' ? 7 : 12; }
  function field(S, goals) {
    const N = COLS * ROWS, dist = new Float64Array(N).fill(1e9), done = new Uint8Array(N);
    for (const i of goals) dist[i] = 0;
    for (;;) {
      let cur = -1, best = 1e9;
      for (let i = 0; i < N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; cur = i; }
      if (cur < 0) break;
      done[cur] = 1;
      const c = cur % COLS, r = (cur / COLS) | 0, step = 1 + block(S, cur);
      for (const [dx, dy] of D4) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || SOLID[ter(nc, nr)]) continue;
        const ni = idx(nc, nr);
        if (!done[ni] && best + step < dist[ni]) dist[ni] = best + step;
      }
    }
    return dist;
  }
  function flows(S) {
    if (!S.flowDirty) return;
    S.flowDirty = false;
    const inG = [], outG = [];
    for (let r = HALL.r - 1; r <= HALL.r + 2; r++) for (let c = HALL.c - 1; c <= HALL.c + 2; c++) {
      const edge = (r === HALL.r - 1 || r === HALL.r + 2) !== (c === HALL.c - 1 || c === HALL.c + 2);
      if (edge && !SOLID[ter(c, r)]) inG.push(idx(c, r));
    }
    for (let r = 0; r < ROWS; r++) for (const c of [0, COLS - 1]) if (isGate(c, r)) outG.push(idx(c, r));
    S.fIn = field(S, inG); S.fOut = field(S, outG);
  }

  // ---------- הודעות ----------
  function toast(g, s, col) { g.s.toast = { s, col: col || '#fff', t: 2.2 }; }

  // ---------- פעולות (העכבר, המגע והבוט עוברים כאן) ----------
  const act = {
    select(g, k) {
      const S = g.s;
      if (k && B[k].ch > S.ch) { g.sfx('error'); toast(g, g.t('locked', { n: B[k].ch + 1 }), '#ffd166'); return false; }
      S.sel = k && S.sel !== k ? k : null; S.pick = null; S.pend = null;
      if (S.sel) g.sfx('click');
      return true;
    },
    place(g, c, r) {
      const S = g.s, k = S.sel;
      if (!k) return false;
      const why = canPlace(S, k, c, r);
      if (why) { g.sfx('error'); toast(g, g.t(why), '#ff9b9b'); return false; }
      const lack = lackOf(S, k);
      if (lack) { g.sfx('error'); toast(g, g.t(LACK[lack]), '#ffd166'); return false; }
      for (const res in B[k].cost) S.res[res] -= B[k].cost[res];
      const b = addB(S, k, c, r);
      b.born = S.t;
      S.pend = null;
      g.burst(b.x, b.foot - 6, { n: 10 + b.s * 6, color: ['#d8c49a', '#a8875a', '#fff6dc'], speed: 2.2, life: 28, gravity: 0.05 });
      g.sfx('place');
      g.tone({ f: 520, f2: 760, dur: 0.08, type: 'triangle', vol: 0.08, delay: 0.09 });
      if (k === 'castle' || lackOf(S, k)) S.sel = null;
      S.goalT = 0; S.saveT = Math.min(S.saveT, 0.5);
      return true;
    },
    pick(g, b) { const S = g.s; S.pick = b && S.pick !== b ? b : null; S.sel = null; S.pend = null; if (S.pick) g.sfx('click', { p: 1.2 }); },
    remove(g) {
      const S = g.s, b = S.pick;
      if (!b || b.k === 'hall') return false;
      const cost = B[b.k].cost;
      delB(S, b);
      let n = 0;
      for (const r in cost) { const v = Math.floor(cost[r] / 2); S.res[r] += v; n += v; }
      if (S.pop > S.cap) S.pop = S.cap;
      g.burst(b.x, b.y, { n: 18, color: ['#a8875a', '#8b7d6b', '#d8c49a'], speed: 2.6, life: 30 });
      if (n) pop(g, b.x, b.y - 20, '+' + n, '#ffe066', 24);
      g.sfx('break');
      S.goalT = 0; S.saveT = Math.min(S.saveT, 0.5);
      return true;
    },
    speed(g) { const S = g.s; S.speed = S.speed === 1 ? 2 : 1; g.sfx('click', { p: S.speed === 2 ? 1.3 : 0.9 }); },
    // פשיטה מוקדמת: לחיצה ראשונה שואלת, השנייה (תוך 3 שניות) מזעיקה את הגובלינים עכשיו
    callRaid(g) {
      const S = g.s;
      if (!S.raidOn || S.raid) return false;
      // הגובלינים צריכים לפחות 45 שניות להתאסף בין פשיטה לפשיטה
      if (S.raidMax - S.raidT < 45) { S.callT = 0; g.sfx('error'); toast(g, g.t('raidWait'), '#ffd166'); return false; }
      if (S.callT > 0) { S.callT = 0; S.raidT = 0; startRaid(g); return true; }
      S.callT = 3; g.sfx('click'); toast(g, g.t('raidNowQ'), '#ffb4a2');
      return false;
    },
  };

  // ---------- כלכלה: עובדים, אוכל, ייצור, גידול, אימון חיילים ----------
  function econ(g) {
    const S = g.s;
    let free = S.pop;
    for (const b of S.bs) { const d = B[b.k]; if (!d.jobs) continue; const n = b.ruin ? 0 : Math.min(d.jobs, free); b.staff = n; free -= n; }
    S.res.food = Math.max(0, S.res.food - S.pop * EAT * DT);
    S.hungry = S.res.food < 0.5;
    for (const b of S.bs) {
      const d = B[b.k];
      if (b.hitT > 0) b.hitT -= DT;
      if (b.ruin) continue;
      // אולם הכפר מביא קצת עץ גם בלי עובדים, כך שאף פעם אי אפשר להיתקע בלי עץ
      const f = !d.make ? 0 : d.jobs ? (b.staff / d.jobs) * (S.hungry ? 0.5 : 1) : 1;
      if (f > 0) {
        b.t += DT * f;
        if (b.t >= d.every) {
          b.t -= d.every;
          S.res[d.make] = Math.min(9999, S.res[d.make] + d.amt);
          if (!S.demo) flyIcon(g, d.make, b.x, b.y - b.s * T * 0.3, d.amt);
        }
      }
      if (d.troops) {
        const mine = troopsOf(S, b);
        if (mine < d.troops && S.res.food >= TRAIN_FOOD) {
          if ((b.train += DT) >= TRAIN) { b.train = 0; S.res.food -= TRAIN_FOOD; addSoldier(S, b, mine); if (!S.demo) g.sfx('power', { p: 0.8 }); }
        } else if (mine >= d.troops) b.train = 0;
      }
    }
    if (S.pop < S.cap && !S.hungry) {
      if ((S.growT += DT) >= GROW) {
        S.growT = 0; S.pop++; S.bump.people = 1;
        const homes = S.bs.filter(b => B[b.k].house);
        const h = homes[Math.floor(Math.random() * homes.length)];
        if (h && S.walkers.length < 12) { const left = h.x < W / 2; S.walkers.push({ x: left ? -10 : W + 10, y: MY + (left ? 4.5 : 3.5) * T, tx: h.x, ty: h.foot - 4, sh: Math.floor(Math.random() * 5) }); }
        if (!S.demo) g.sfx('pop', { p: 1.3 });
      }
    } else S.growT = 0;
    for (let i = S.walkers.length - 1; i >= 0; i--) {
      const w = S.walkers[i], dx = w.tx - w.x, dy = w.ty - w.y, L = Math.hypot(dx, dy), st = 90 * DT;
      if (L <= st) S.walkers.splice(i, 1); else { w.x += dx / L * st; w.y += dy / L * st; }
    }
  }
  // אייקון משאב שעף מהמבנה למונה למעלה
  function flyIcon(g, k, x, y, n) {
    const S = g.s;
    pop(g, x, y - 10, '+' + n, k === 'food' ? '#ffe066' : k === 'wood' ? '#ffc78a' : '#e3e8ee', 20);
    if (S.fly.length < 24) S.fly.push({ k, x0: x, y0: y, t: 0, dur: 0.75 + Math.random() * 0.2 });
  }

  // ---------- חיילים ----------
  function postOf(b, i) { const n = B[b.k].troops; return { x: b.x + (i - (n - 1) / 2) * 22, y: Math.min(BY - 8, b.foot + 6) }; }
  function addSoldier(S, b, i) {
    const knight = b.k === 'castle', p = postOf(b, i);
    S.sol.push({ home: b, i, x: b.x, y: b.foot - 6, px: b.x, py: b.foot - 6, hp: knight ? 70 : SOL.hp, max: knight ? 70 : SOL.hp, dmg: knight ? 9 : SOL.dmg, knight, st: 'idle', cd: 0, ko: 0, face: p.x >= b.x ? 1 : -1, walk: 0, swing: 0 });
  }
  function moveTo(u, x, y, st) {
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.4) u.face = dx > 0 ? 1 : -1;
    if (d <= st) { u.x = x; u.y = y; return true; }
    u.x += dx / d * st; u.y += dy / d * st; u.walk += DT;
    return false;
  }
  const inMap = e => e.x > 4 && e.x < W - 4;
  function solStep(g, s) {
    const S = g.s;
    s.px = s.x; s.py = s.y;
    if (s.swing > 0) s.swing -= DT;
    if (s.st === 'ko') {
      if ((s.ko -= DT) <= 0) { const p = postOf(s.home, s.i); s.st = 'idle'; s.hp = s.max; s.x = s.px = s.home.x; s.y = s.py = s.home.foot - 6; s.face = p.x >= s.x ? 1 : -1; }
      return;
    }
    let tg = null, bd = 1e12;
    for (const e of S.gob) { if (e.dead || !inMap(e)) continue; const d = (e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y); if (d < bd) { bd = d; tg = e; } }
    if (tg) {
      const d = Math.sqrt(bd), reach = T * 0.42 + tg.r * 0.5;
      if (d > reach) moveTo(s, tg.x, tg.y, SOL.sp * T * DT);
      else {
        s.face = tg.x >= s.x ? 1 : -1;
        if ((s.cd -= DT) <= 0) { s.cd = SOL.rate; s.swing = 0.22; hurtGob(g, tg, s.dmg); if (!S.demo) g.noise({ f: 2400, f2: 900, dur: 0.05, vol: 0.05 }); }
      }
    } else {
      const p = postOf(s.home, s.i);
      moveTo(s, p.x, p.y, SOL.sp * 0.6 * T * DT);
      s.hp = Math.min(s.max, s.hp + 8 * DT);
    }
  }

  // ---------- גובלינים ----------
  function spawnGob(g, k, side, row, hm) {
    const S = g.s, d = GOB[k], gc = side < 0 ? 0 : COLS - 1;
    S.gob.push({ k, x: side < 0 ? -28 : W + 28, y: MY + row * T + T / 2, px: 0, py: 0, ox: (Math.random() - 0.5) * 14, oy: (Math.random() - 0.5) * 10,
      hp: d.hp * hm, max: d.hp * hm, sp: d.sp * (0.92 + Math.random() * 0.16), dmg: d.dmg, r: d.r, loot: d.loot,
      st: 'enter', ex: gc * T + T / 2, ey: MY + row * T + T / 2, tgt: -1, cd: 0.6, carry: null, face: side < 0 ? 1 : -1, side, walk: Math.random(), ph: Math.random() * 6, swing: 0, hitT: 0, dead: false });
    const e = S.gob[S.gob.length - 1]; e.px = e.x; e.py = e.y;
  }
  function hurtGob(g, e, dmg) {
    const S = g.s;
    if (e.dead) return;
    e.hp -= dmg; e.hitT = 0.12;
    if (e.hp > 0) return;
    e.dead = true;
    g.burst(e.x, e.y - 6, { n: e.k === 'chief' ? 30 : 14, color: ['#d9d9d9', '#f1f3f5', '#9be36b', '#fff3a0'], speed: e.k === 'chief' ? 4 : 2.6, life: 30, gravity: -0.02 });
    if (e.carry && e.carry.n) { S.res[e.carry.k] += e.carry.n; pop(g, e.x, e.y - 24, '+' + e.carry.n, '#8ce99a', 22); }
    if (S.raid) S.raid.beat++;
    if (!S.demo) { g.sfx('pop', { p: 0.7 + Math.random() * 0.5 }); if (e.k === 'chief' || e.k === 'brute') g.shake(5); }
  }
  function ruinB(g, b) {
    const S = g.s;
    b.ruin = true; b.hp = 0; S.flowDirty = true;
    g.burst(b.x, b.y, { n: 20, color: ['#8b7d6b', '#a8875a', '#555'], speed: 3, life: 34 });
    if (!S.demo) { g.sfx('break'); g.shake(4); }
    if (S.pick === b) S.pick = null;
  }
  function steal(g, e) {
    const S = g.s;
    let k = 'food';
    for (const r of RES) if (S.res[r] > S.res[k]) k = r;
    const n = Math.min(e.loot, Math.floor(S.res[k]));
    S.res[k] -= n; e.carry = { k, n }; e.tgt = -1;
    if (n > 0 && !S.demo) { pop(g, e.x, e.y - 26, '-' + n, '#ff8787', 22); g.sfx('error'); }
  }
  function gobStep(g, e) {
    const S = g.s, sp = e.sp * T * DT * (e.carry ? 1.15 : 1);
    e.px = e.x; e.py = e.y;
    if (e.hitT > 0) e.hitT -= DT;
    if (e.swing > 0) e.swing -= DT;
    if (e.st === 'enter') { if (moveTo(e, e.ex, e.ey, sp)) e.st = 'go'; return; }
    if (e.st === 'leave') {
      moveTo(e, e.side < 0 ? -40 : W + 40, e.y, sp);
      if (e.x < -32 || e.x > W + 32) { e.dead = true; if (S.raid && e.carry) S.raid.lost += e.carry.n; }
      return;
    }
    // חייל צמוד? נלחמים
    for (const s of S.sol) {
      if (s.st === 'ko' || Math.abs(s.x - e.x) > T * 0.55 || Math.abs(s.y - e.y) > T * 0.55) continue;
      e.face = s.x >= e.x ? 1 : -1;
      if ((e.cd -= DT) <= 0) {
        e.cd = 1; e.swing = 0.25; s.hp -= e.dmg;
        if (s.hp <= 0) { s.st = 'ko'; s.ko = KO_TIME; g.burst(s.x, s.y - 8, { n: 12, color: ['#fff', '#ffe066', '#a5d8ff'], speed: 2.2, life: 26, gravity: -0.03 }); }
      }
      return;
    }
    const F = e.carry ? S.fOut : S.fIn, [c, r] = tileOf(e.x, e.y), here = idx(c, r);
    if (e.tgt < 0) {
      if (F[here] < 0.5) {
        if (!e.carry) steal(g, e);
        else { e.st = 'leave'; e.side = c < COLS / 2 ? -1 : 1; }
        return;
      }
      let best = -1, bv = 1e18;
      for (const [dx, dy] of D4) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || SOLID[ter(nc, nr)]) continue;
        const ni = idx(nc, nr), v = 1 + block(S, ni) + F[ni];
        if (v < bv) { bv = v; best = ni; }
      }
      if (best < 0 || bv >= 1e8) { e.st = 'leave'; e.side = c < COLS / 2 ? -1 : 1; return; }
      e.tgt = best;
    }
    const tx = (e.tgt % COLS) * T + T / 2, ty = MY + ((e.tgt / COLS) | 0) * T + T / 2, b = S.grid[e.tgt];
    if (b && !b.ruin) {
      if (b.k === 'hall') { e.tgt = -1; return; }
      if (Math.hypot(tx - e.x, ty - e.y) > T * 0.64) { moveTo(e, tx, ty, sp); return; }
      e.face = tx >= e.x ? 1 : -1;
      if ((e.cd -= DT) <= 0) {
        e.cd = 1; e.swing = 0.25; b.hp -= e.dmg; b.hitT = 0.15;
        if (!S.demo) g.noise({ f: 700, f2: 200, dur: 0.07, vol: 0.06 });
        if (b.hp <= 0) ruinB(g, b);
      }
      return;
    }
    if (moveTo(e, tx, ty, sp)) e.tgt = -1;
  }

  // ---------- מגדלים, הטירה וחצים ----------
  function towerStep(g, b) {
    const S = g.s, d = B[b.k];
    if (!d.range || b.ruin || (b.cd -= DT) > 0) return;
    const R = d.range * T;
    let tg = null, bv = 1e18;
    for (const e of S.gob) {
      if (e.dead || !inMap(e)) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy > R * R) continue;
      const [c, r] = tileOf(e.x, e.y), v = (e.carry ? -500 : 0) + S.fIn[idx(c, r)];
      if (v < bv) { bv = v; tg = e; }
    }
    if (!tg) { b.cd = 0.1; return; }
    b.cd = 1 / d.rate;
    b.ang = Math.atan2(tg.y - b.y, tg.x - b.x);
    const top = b.k === 'castle' ? b.y - 66 : b.y - 44;
    S.arrows.push({ x: b.x, y: top, px: b.x, py: top, tg, dmg: d.dmg, a: b.ang, dead: false });
    if (!S.demo) g.tone({ f: 900 + Math.random() * 200, f2: 420, dur: 0.05, type: 'triangle', vol: 0.03 });
  }
  function arrowStep(g, a) {
    a.px = a.x; a.py = a.y;
    if (a.tg.dead) { a.dead = true; return; }
    const dx = a.tg.x - a.x, dy = a.tg.y - 8 - a.y, L = Math.hypot(dx, dy), st = 540 * DT;
    a.a = Math.atan2(dy, dx);
    if (L <= st) { a.dead = true; hurtGob(g, a.tg, a.dmg); } else { a.x += dx / L * st; a.y += dy / L * st; }
  }

  // ---------- פשיטות ----------
  function raidStep(g) {
    const S = g.s;
    if (!S.raidOn) return;
    if (!S.raid) {
      S.raidT -= DT;
      if (S.raidT <= 15 && !S.warned) {
        S.warned = true;
        banner(g, g.t('raidSoon'), null, '#ff8787');
        g.tone({ f: 196, f2: 220, dur: 0.5, type: 'sawtooth', vol: 0.07 }); g.tone({ f: 262, dur: 0.7, type: 'sawtooth', vol: 0.07, delay: 0.5 });
      }
      if (S.raidT <= 0) startRaid(g);
      return;
    }
    const R = S.raid;
    R.t += DT;
    while (R.q.length && R.q[0].at <= R.t) { const q = R.q.shift(); spawnGob(g, q.k, q.side, q.row, R.hm); }
    if (!R.q.length && !S.gob.length) endRaid(g);
  }
  function raidList(n, diff) {
    const D = DIFF[diff], list = [];
    const add = (k, m) => { for (let i = 0; i < m; i++) list.push(k); };
    add('grunt', Math.round((2 + n * 1.2) * D.n));
    if (n >= 3) add('runner', Math.round(Math.floor(n / 2) * D.n));
    if (n >= 4) add('brute', Math.round(Math.floor((n - 2) / 2) * D.n));
    if (n % 5 === 0) add('chief', 1);
    return list;
  }
  function startRaid(g) {
    const S = g.s, n = ++S.raidN, list = g.shuffle(raidList(n, g.diff));
    let at = 0.4;
    const q = list.map(k => {
      const o = { k, side: n === 1 ? -1 : Math.random() < 0.5 ? -1 : 1, row: 3 + Math.floor(Math.random() * 4), at };
      at += k === 'brute' || k === 'chief' ? 1.7 : 0.9;
      return o;
    });
    S.raid = { n, q, t: 0, hm: DIFF[g.diff].hp * (1 + 0.07 * (n - 1)), size: list.length, beat: 0, lost: 0 };
    S.warned = false;
    banner(g, g.t('raidGo'), null, '#ff8787');
    g.sfx('boom'); g.shake(6);
  }
  function endRaid(g) {
    const S = g.s, R = S.raid;
    S.raid = null; S.raidT = S.raidMax = DIFF[g.diff].every * (S.ch >= 5 ? 0.75 : 1);   // אחרי הטירה הפשיטות באות קצת יותר מהר
    for (const b of S.bs) if (b.ruin || b.hp < b.max) { b.ruin = false; b.hp = b.max; b.fixT = 1.2; }
    S.flowDirty = true;
    if (R.lost === 0) {
      S.won++;
      const v = 10 + 4 * R.n;
      for (const r of RES) S.res[r] += v;
      banner(g, g.t('raidWon'), '+' + v, '#8ce99a');
      g.sfx('win');
      g.burst(S.bs[0].x, S.bs[0].y - 30, { n: 40, color: ['#ffe066', '#8ce99a', '#74c0fc', '#ff8fab'], speed: 4, life: 50 });
    } else { banner(g, g.t('raidLost', { n: R.lost }), null, '#ffb4a2'); g.sfx('lose'); }
    S.goalT = 0; S.saveT = 0.3;
  }

  // ---------- פרקים ----------
  function goalVal(S, k) {
    if (k === 'people') return S.pop;
    if (k === 'raids') return S.won;
    if (k === 'soldiers') return S.sol.length;
    return S.cnt[{ farms: 'farm', walls: 'wall', towers: 'tower' }[k] || k] || 0;
  }
  function chapterStep(g) {
    const S = g.s;
    if ((S.goalT -= DT) > 0) return;
    S.goalT = 0.5;
    if (S.ch >= 2 && !S.raidOn) { S.raidOn = true; S.raidT = S.raidMax = DIFF[g.diff].first; }
    if (S.ch >= CH.length || S.panel) return;
    if (CH[S.ch].goals.every(([k, n]) => goalVal(S, k) >= n)) {
      const C = CH[S.ch];
      for (const r in C.reward) S.res[r] += C.reward[r];
      S.ch++;
      S.sel = null; S.pick = null;
      g.sfx('win');
      g.flash('#fff6c2', 0.25);
      for (let i = 0; i < 4; i++) g.burst(120 + i * 240, MY + 40, { n: 26, color: ['#ffe066', '#ff8fab', '#74c0fc', '#8ce99a', '#fff'], speed: 5, life: 70, gravity: 0.12, shape: 'square' });
      save(g);
      chapterPanel(g, 'done');
    }
  }

  // ---------- שמירה ----------
  function save(g) {
    const S = g.s;
    if (!S || S.demo) return;
    g.save('kingdom', {
      v: 1, ch: S.ch, pop: S.pop, won: S.won, raidOn: S.raidOn, raidN: S.raidN, raidT: S.raid ? 12 : Math.ceil(S.raidT), t: Math.round(S.t),
      res: { food: Math.floor(S.res.food), wood: Math.floor(S.res.wood), stone: Math.floor(S.res.stone) },
      b: S.bs.filter(b => b.k !== 'hall').map(b => [b.k, b.c, b.r, troopsOf(S, b)]),
    });
  }
  function loadState(g) {
    const S = newState(false), d = g.load('kingdom', null);
    if (!d || d.v !== 1 || !Array.isArray(d.b)) return S;
    const num = (v, a, b) => (typeof v === 'number' && isFinite(v) ? Math.max(a, Math.min(b, v)) : a);
    try {
      for (const it of d.b) {
        if (!Array.isArray(it) || !B[it[0]] || it[0] === 'hall' || canPlace(S, it[0], it[1] | 0, it[2] | 0) !== '') continue;
        const b = addB(S, it[0], it[1] | 0, it[2] | 0);
        for (let i = 0; i < Math.min(B[b.k].troops || 0, it[3] | 0); i++) addSoldier(S, b, i);
      }
      S.ch = num(d.ch | 0, 0, CH.length);
      for (const r of RES) S.res[r] = num(d.res && d.res[r], 0, 9999);
      S.pop = num(d.pop | 0, 0, S.cap);
      S.won = num(d.won | 0, 0, 1e6); S.raidN = num(d.raidN | 0, 0, 1e6); S.t = num(d.t, 0, 1e9);
      S.raidOn = !!d.raidOn; S.raidT = S.raidMax = num(d.raidT, 10, 900);
    } catch (e) { return newState(false); }
    return S;
  }

  // ---------- בוט לבדיקות: בונה לפי הצרכים והמטרות, דרך אותן פעולות של השחקן ----------
  function pathTiles(S) {
    const set = new Set();
    for (let r = 0; r < ROWS; r++) for (const c0 of [0, COLS - 1]) {
      if (!isGate(c0, r)) continue;
      let c = c0, rr = r;
      for (let n = 0; n < 60; n++) {
        const i = idx(c, rr);
        set.add(i);
        if (S.fIn[i] < 0.5) break;
        let best = -1, bv = 1e18;
        for (const [dx, dy] of D4) { const nc = c + dx, nr = rr + dy; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || SOLID[ter(nc, nr)]) continue; const ni = idx(nc, nr), v = 1 + block(S, ni) + S.fIn[ni]; if (v < bv) { bv = v; best = ni; } }
        if (best < 0) break;
        c = best % COLS; rr = (best / COLS) | 0;
      }
    }
    return set;
  }
  function botSpot(g, k) {
    const S = g.s, s = B[k].s, hx = HALL.c + 1, hy = HALL.r + 1;
    flows(S);
    const path = k === 'tower' || k === 'wall' ? pathTiles(S) : null;
    let best = null, bv = -1e18;
    for (let r = 0; r <= ROWS - s; r++) for (let c = 0; c <= COLS - s; c++) {
      if (canPlace(S, k, c, r) !== '') continue;
      const mx = c + s / 2, my = r + s / 2, dist = Math.hypot(mx - hx, my - hy);
      let v = -dist;
      if (k === 'tower') {
        let n = 0;
        for (const i of path) { const px = i % COLS + 0.5, py = ((i / COLS) | 0) + 0.5; if (Math.hypot(px - mx, py - my) <= B.tower.range - 0.4) n++; }
        v = n * 2 - dist * 0.6;
      } else if (k === 'wall') {
        const i = idx(c, r);
        if (!path.has(i)) continue;
        v = -Math.abs(Math.max(Math.abs(c + 0.5 - hx), Math.abs(r + 0.5 - hy)) - 4);
      } else if (k === 'farm' || k === 'barracks' || k === 'castle') v = -Math.abs(dist - 3.5);
      if (v > bv) { bv = v; best = [c, r]; }
    }
    return best;
  }
  // מה הבוט רוצה לבנות, לפי הסדר. [מבנה, חובה]: על "חובה" הוא חוסך ולא קונה דברים אחרים בינתיים
  const GOALB = { house: 'house', farm: 'farm', mill: 'mill', quarry: 'quarry', tower: 'tower', barracks: 'barracks', castle: 'castle', farms: 'farm', walls: 'wall', towers: 'tower' };
  const troopCap = S => S.bs.reduce((n, b) => n + (B[b.k].troops || 0), 0);
  function botPlan(S, lvl) {
    const c = k => S.cnt[k] || 0, ch = S.ch, out = [];
    const food = c('farm') * B.farm.amt / B.farm.every, eat = S.pop * EAT;
    if (food < eat + 0.1 || (S.res.food < 12 && food < eat + 0.5)) out.push(['farm', 1]);
    if (S.pop >= S.cap - 1 && S.cap < S.jobs + 5) out.push(['house', 1]);
    if (ch < CH.length) for (const [k, n] of CH[ch].goals) {
      if (goalVal(S, k) >= n) continue;
      if (GOALB[k]) out.push([GOALB[k], 1]);
      else if (k === 'people' && S.pop >= S.cap - 2) out.push(['house', 1]);
      else if (k === 'soldiers' && troopCap(S) < n) out.push(['barracks', 1]);
    }
    // הגנה שגדלה עם הפשיטות (lvl 0 = שחקן עצלן: רק מה שהפרקים מבקשים)
    if (S.raidOn && lvl > 0) {
      if (c('tower') < Math.min(10, 1 + Math.ceil(S.raidN * 0.6))) out.push(['tower', 0]);
      if (c('barracks') < Math.min(3, 1 + Math.floor(S.raidN / 4))) out.push(['barracks', 0]);
      if (ch >= 3 && c('wall') < Math.min(28, 8 + 2 * S.raidN)) out.push(['wall', 0]);
    }
    if (ch >= 1 && c('mill') < 1 + Math.floor(S.pop / 16)) out.push(['mill', 0]);
    if (ch >= 1 && c('quarry') < 1 + Math.floor(S.pop / 24)) out.push(['quarry', 0]);
    if (S.pop >= S.cap - 1 && S.pop < 60) out.push(['house', 0]);
    return out;
  }
  function botStep(g) {
    const S = g.s;
    if (S.demo) return;
    if (S.panel) { closePanel(g); return; }
    if ((S.botT -= DT) > 0) return;
    S.botT = 0.5;
    // בוט נלהב (רמה 2): כשההגנה מוכנה הוא מזעיק את הפשיטה הבאה מוקדם, דרך אותה לחיצה כפולה של השחקן
    const lvl = g.spec.botLevel == null ? 1 : g.spec.botLevel;
    if (lvl >= 2 && S.raidOn && !S.raid && S.raidT > 20 && S.raidMax - S.raidT >= 45 && (S.cnt.tower || 0) >= Math.min(10, 1 + Math.ceil(S.raidN * 0.6))) { act.callRaid(g); act.callRaid(g); return; }
    for (const [k, must] of botPlan(S, lvl)) {
      if (B[k].ch > S.ch) continue;
      if (lackOf(S, k)) { if (must) return; continue; }
      const sp = botSpot(g, k);
      if (!sp) continue;
      if (S.sel !== k) act.select(g, k);
      act.place(g, sp[0], sp[1]);
      S.sel = null;
      return;
    }
  }

  // ---------- סימולציה: צעד אחד = 1/60 שנייה ----------
  function sim(g) {
    const S = g.s;
    S.t += DT;
    flows(S);
    econ(g);
    if (!S.demo) { raidStep(g); chapterStep(g); }
    for (const b of S.bs) towerStep(g, b);
    for (const e of S.gob) if (!e.dead) gobStep(g, e);
    for (const s of S.sol) solStep(g, s);
    for (const a of S.arrows) arrowStep(g, a);
    compact(S.gob); compact(S.arrows);
    for (const f of S.fly) if ((f.t += DT) >= f.dur) { f.dead = true; S.bump[f.k] = 1; }
    compact(S.fly);
    for (const k in S.bump) if (S.bump[k] > 0) S.bump[k] = Math.max(0, S.bump[k] - DT * 4);
    for (const b of S.bs) if (b.fixT > 0) b.fixT -= DT;
  }
  function compact(a) { let j = 0; for (let i = 0; i < a.length; i++) if (!a[i].dead) a[j++] = a[i]; a.length = j; }

  // ---------- ציור: אייקונים של משאבים ----------
  function icon(ctx, k, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (k === 'food') {
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const a of [-0.38, 0, 0.38]) { ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(Math.sin(a) * 11, 9 - Math.cos(a) * 15); ctx.stroke(); }
      for (const a of [-0.38, 0, 0.38]) for (let i = 0; i < 3; i++) {
        const d = 7 + i * 3.4, gx = Math.sin(a) * d, gy = 9 - Math.cos(a) * d;
        ctx.fillStyle = i === 2 ? '#ffe28a' : '#f5c242'; ctx.beginPath(); ctx.ellipse(gx, gy, 2.6, 3.8, a, 0, 6.3); ctx.fill();
      }
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-4, 4, 8, 3);
    } else if (k === 'wood') {
      ctx.rotate(-0.35);
      ctx.fillStyle = '#8a5a2b'; U.rr(ctx, -11, -5, 20, 10, 4); ctx.fill();
      ctx.fillStyle = '#a8743d'; ctx.fillRect(-9, -4, 16, 2.5);
      ctx.fillStyle = '#e8c48c'; ctx.beginPath(); ctx.ellipse(9, 0, 4, 5, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#a8743d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(9, 0, 2, 2.6, 0, 0, 6.3); ctx.stroke();
    } else if (k === 'stone') {
      ctx.fillStyle = '#8d96a0'; ctx.beginPath(); ctx.moveTo(-11, 6); ctx.lineTo(-8, -4); ctx.lineTo(-1, -9); ctx.lineTo(8, -6); ctx.lineTo(11, 4); ctx.lineTo(5, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c3cad1'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-1, -9); ctx.lineTo(8, -6); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(11, 4); ctx.lineTo(5, 8); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
    } else if (k === 'people') {
      ctx.fillStyle = '#4f8de0'; ctx.beginPath(); ctx.ellipse(0, 8, 9, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffd3a8'; ctx.beginPath(); ctx.arc(0, -3, 6, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.arc(0, -5, 6, Math.PI, 0); ctx.fill();
    } else if (k === 'soldier') {
      ctx.fillStyle = '#3b6fd6'; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(8, 1); ctx.quadraticCurveTo(8, 8, 0, 10); ctx.quadraticCurveTo(-8, 8, -8, 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd43b'; ctx.fillRect(-1.5, -6, 3, 13); ctx.fillRect(-6, -2, 12, 3);
    }
    ctx.restore();
  }

  // ---------- ציור: המפה (נשמרת פעם אחת בתמונה) ----------
  function tree(ctx, x, y, s, v) {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 14 * s, 15 * s, 5 * s, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7a4f2a'; ctx.fillRect(x - 3 * s, y + 2 * s, 6 * s, 12 * s);
    const cols = v ? ['#2f7d3a', '#3f9b47', '#5cbf5c'] : ['#2d6e44', '#3a8a52', '#56ad69'];
    for (const [a, b, r, i] of [[-8, -2, 10, 0], [8, -2, 10, 0], [0, -10, 12, 1], [-3, -13, 6, 2]]) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x + a * s, y + b * s, r * s, 0, 6.3); ctx.fill(); }
  }
  function rock(ctx, x, y, s, v) {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 12 * s, 18 * s, 5 * s, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = v ? '#8b939c' : '#7d868f';
    ctx.beginPath(); ctx.moveTo(x - 18 * s, y + 12 * s); ctx.lineTo(x - 13 * s, y - 6 * s); ctx.lineTo(x - 2 * s, y - 15 * s); ctx.lineTo(x + 11 * s, y - 9 * s); ctx.lineTo(x + 18 * s, y + 12 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b4bcc4'; ctx.beginPath(); ctx.moveTo(x - 13 * s, y - 6 * s); ctx.lineTo(x - 2 * s, y - 15 * s); ctx.lineTo(x + 11 * s, y - 9 * s); ctx.lineTo(x, y - 2 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.moveTo(x, y - 2 * s); ctx.lineTo(x + 11 * s, y - 9 * s); ctx.lineTo(x + 18 * s, y + 12 * s); ctx.lineTo(x + 4 * s, y + 12 * s); ctx.closePath(); ctx.fill();
  }
  function paintMap(ctx, U) {
    const rnd = U.seeded(4242), y0 = MY - TOPM;
    // רצועת נוף מעל המפה: משוכת שיחים, כדי שגגות ודגלים בשורה העליונה לא ייחתכו
    const sk = ctx.createLinearGradient(0, y0, 0, MY);
    sk.addColorStop(0, '#3f7a33'); sk.addColorStop(1, '#5d9e47');
    ctx.fillStyle = sk; ctx.fillRect(0, y0, W, TOPM + 2);
    for (let x = -12, i = 0; x < W + 24; x += 22, i++) {
      const r = 12 + ((i * 7) % 5), yy = y0 + 8 + ((i * 5) % 4);
      ctx.fillStyle = i % 2 ? '#356d2c' : '#2f6427'; ctx.beginPath(); ctx.arc(x, yy, r, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.arc(x - 3, yy - 4, r * 0.5, 0, 6.3); ctx.fill();
    }
    const gr = ctx.createLinearGradient(0, MY, 0, BY);
    gr.addColorStop(0, '#86d063'); gr.addColorStop(1, '#6db84f');
    ctx.fillStyle = gr; ctx.fillRect(0, MY, W, MH);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, MY, W, 4);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let r = 0; r < ROWS; r++) for (let c = r % 2; c < COLS; c += 2) ctx.fillRect(c * T, MY + r * T, T, T);
    // הדרכים מהשערים לאולם (קישוט)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const road = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    const hy = MY + (HALL.r + 1) * T, RL = [[-20, hy], [3 * T, hy], [5 * T, hy + 6], [HALL.c * T + T, hy]], RR = [[W + 20, hy], [W - 3 * T, hy], [W - 5 * T, hy - 6], [(HALL.c + 1) * T, hy]];
    for (const P of [RL, RR]) { road(P, 34, 'rgba(120,90,50,.25)'); road(P, 28, '#d9bf8a'); road(P, 10, '#e6d0a0'); }
    for (let i = 0; i < 520; i++) {
      const x = rnd() * W, y = MY + 4 + rnd() * (MH - 4), v = rnd();
      ctx.strokeStyle = 'rgba(40,110,40,.45)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x - 1, y - 3); ctx.moveTo(x + 1, y + 3); ctx.lineTo(x + 2, y - 4); ctx.stroke();
      if (v < 0.1) { ctx.fillStyle = v < 0.03 ? '#fff' : v < 0.065 ? '#ffd43b' : '#ff8fab'; ctx.beginPath(); ctx.arc(x + 5, y - 2, 2.3, 0, 6.3); ctx.fill(); }
    }
    // האגם: עיגולים שמתמזגים לצורה רכה, עם חוף חול
    const water = [];
    const isW = (c, r) => ter(c, r) === 'W';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isW(c, r)) {
      const x = c * T + T / 2, y = MY + r * T + T / 2;
      water.push([x, y]);
      if (isW(c + 1, r)) water.push([x + T / 2, y]);
      if (isW(c, r + 1)) water.push([x, y + T / 2]);
      if (isW(c + 1, r) && isW(c, r + 1) && isW(c + 1, r + 1)) water.push([x + T / 2, y + T / 2]);
    }
    const blob = rad => { ctx.beginPath(); for (const [x, y] of water) { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.3); } };
    ctx.save(); ctx.beginPath(); ctx.rect(0, MY, W, MH); ctx.clip();
    blob(T * 0.68 + 6); ctx.fillStyle = '#dcc790'; ctx.fill();
    blob(T * 0.68); const wg = ctx.createLinearGradient(0, MY + 6.4 * T, 0, BY);
    wg.addColorStop(0, '#68c3f4'); wg.addColorStop(1, '#2d80c6'); ctx.fillStyle = wg; ctx.fill();
    blob(T * 0.42); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    for (const [x, y] of [[1.6, 7.5], [0.7, 8.6], [2.5, 8.4], [1.3, 9.4]]) { ctx.beginPath(); ctx.moveTo(x * T - 8, MY + y * T); ctx.quadraticCurveTo(x * T, MY + y * T - 4, x * T + 8, MY + y * T); ctx.stroke(); }
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(2.2 * T, MY + 9.1 * T, 7, 0.5, 5.9); ctx.lineTo(2.2 * T, MY + 9.1 * T); ctx.fill();
    ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.arc(2.2 * T - 1, MY + 9.1 * T - 2, 2.6, 0, 6.3); ctx.fill();
    // גבעת הטירה: רמה מוגבהת עם שלט קטן
    const gx = HILL.c * T, gy = MY + HILL.r * T, gw = 3 * T;
    ctx.fillStyle = 'rgba(0,0,0,.14)'; U.rr(ctx, gx + 2, gy + 14, gw - 4, gw - 8, 26); ctx.fill();
    ctx.fillStyle = '#a58b62'; U.rr(ctx, gx + 4, gy + 10, gw - 8, gw - 12, 24); ctx.fill();
    ctx.fillStyle = '#8c7451'; for (let i = 0; i < 6; i++) ctx.fillRect(gx + 16 + i * 20, gy + gw - 22 + (i % 2) * 4, 9, 4);
    const hg = ctx.createLinearGradient(0, gy, 0, gy + gw);
    hg.addColorStop(0, '#aee688'); hg.addColorStop(1, '#93d36b');
    ctx.fillStyle = hg; U.rr(ctx, gx + 4, gy + 4, gw - 8, gw - 24, 24); ctx.fill();
    ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3;
    U.rr(ctx, gx + 16, gy + 14, gw - 32, gw - 44, 14); ctx.stroke(); ctx.setLineDash([]);
    const sx = gx + gw / 2, sy = gy + gw / 2 + 2;
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(sx - 2.5, sy - 8, 5, 24);
    ctx.fillStyle = '#e9cf98'; U.rr(ctx, sx - 22, sy - 26, 44, 26, 5); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7d8590';
    ctx.fillRect(sx - 13, sy - 15, 26, 10); ctx.fillRect(sx - 15, sy - 21, 7, 8); ctx.fillRect(sx + 8, sy - 21, 7, 8); ctx.fillRect(sx - 4, sy - 22, 8, 9);
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(sx, sy - 22); ctx.lineTo(sx, sy - 31); ctx.lineTo(sx + 8, sy - 28); ctx.lineTo(sx, sy - 25); ctx.fill();
    // שערי הגובלינים: מערה בכל צד
    for (const side of [-1, 1]) {
      const x = side < 0 ? 0 : W, y = MY + 4.5 * T;
      ctx.save(); ctx.translate(x, y); ctx.scale(-side, 1);
      ctx.fillStyle = '#6d6875'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 54, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = '#4a4453'; ctx.beginPath(); ctx.ellipse(0, 2, 17, 44, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = '#1d1726'; ctx.beginPath(); ctx.ellipse(0, 6, 11, 34, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = '#8a8494';
      for (const [a, b, r] of [[8, -46, 7], [16, -30, 6], [20, -8, 5], [18, 18, 6], [10, 40, 7]]) { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
    // עצים וסלעים, מלמעלה למטה
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = ter(c, r), x = c * T + T / 2, y = MY + r * T + T / 2;
      if (t === 'T') { tree(ctx, x - 9 + rnd() * 6, y - 4, 0.95, (c + r) % 2); tree(ctx, x + 8 - rnd() * 6, y + 8, 0.85, (c + r + 1) % 2); }
      else if (t === 'R') { rock(ctx, x - 4, y - 2, 0.9, (c * r) % 2); if (rnd() < 0.6) rock(ctx, x + 12, y + 12, 0.5, 1); }
    }
  }
  let bgCache = { key: '', c: null };
  function mapImage(g) {
    const res = g.canvas.width / W, key = g.canvas.width + ':' + MY;
    if (bgCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * res); c.height = Math.round((MH + TOPM) * res);
      const x = c.getContext('2d');
      x.setTransform(res, 0, 0, res, 0, -(MY - TOPM) * res);
      paintMap(x, g);
      bgCache = { key, c };
    }
    return bgCache.c;
  }
  // ---------- ציור: אנשים, חיילים וגובלינים ----------
  const SHIRTS = ['#e8590c', '#4f8de0', '#2f9e44', '#c2255c', '#f0b429'];
  function villager(ctx, x, y, shirt, t, work) {
    const bob = Math.abs(Math.sin(t * 9)) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 2.2, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x - 3.5, y - 5, 2.5, 5); ctx.fillRect(x + 1, y - 5, 2.5, 5);
    ctx.fillStyle = shirt; U.rr(ctx, x - 5, y - 13 - bob, 10, 9, 4); ctx.fill();
    ctx.fillStyle = '#ffd3a8'; ctx.beginPath(); ctx.arc(x, y - 17 - bob, 4.2, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#6b3f1d'; ctx.beginPath(); ctx.arc(x, y - 18.5 - bob, 4.2, Math.PI, 0); ctx.fill();
    if (work) { const a = Math.sin(t * 8) * 0.9; ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + 4, y - 10 - bob); ctx.lineTo(x + 4 + Math.cos(a - 1) * 9, y - 10 - bob + Math.sin(a - 1) * 9); ctx.stroke(); }
  }
  function soldier(ctx, s, x, y, t) {
    const f = s.face || 1, walk = s.walk || 0, step = Math.sin(walk * 14) * 2.5;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 2.8, 0, 0, 6.3); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = '#3d3d4a'; ctx.fillRect(-4 + step * 0.5, -6, 3, 6); ctx.fillRect(1 - step * 0.5, -6, 3, 6);
    ctx.fillStyle = s.knight ? '#c9d1da' : '#3b6fd6'; U.rr(ctx, -6, -17, 12, 12, 4); ctx.fill();
    ctx.fillStyle = '#ffd3a8'; ctx.beginPath(); ctx.arc(0, -21, 4.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#aeb6bf'; ctx.beginPath(); ctx.arc(0, -22.5, 5, Math.PI, 0); ctx.fill(); ctx.fillRect(-5, -23, 10, 2);
    if (s.knight) { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.ellipse(-2, -29, 5, 2.6, -0.5, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(1.5, -22, 1.6, 1.8);
    const sw = s.swing > 0 ? -1.2 + (0.22 - s.swing) * 8 : -0.5;
    ctx.save(); ctx.translate(5, -12); ctx.rotate(sw);
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, -1, 13, 2.4); ctx.fillStyle = '#ffd43b'; ctx.fillRect(-1, -2.5, 2.2, 5.4);
    ctx.restore();
    ctx.fillStyle = s.knight ? '#e03131' : '#ffd43b'; ctx.beginPath(); ctx.ellipse(-6, -11, 3.6, 5.4, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function goblin(ctx, e, x, y, t) {
    const k = e.k, sc = k === 'brute' ? 1.45 : k === 'chief' ? 1.7 : k === 'runner' ? 0.85 : 1;
    const f = e.face || 1, step = Math.sin((e.walk || 0) * (k === 'runner' ? 20 : 12)) * 2.4;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 9 * sc, 3 * sc, 0, 0, 6.3); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(f * sc, sc);
    const skin = k === 'brute' ? '#6aa84f' : k === 'chief' ? '#4f9a3c' : '#8bcf5a', dark = U.shade(skin, -0.3);
    if (e.carry && e.carry.n) { ctx.fillStyle = '#a0784a'; ctx.beginPath(); ctx.arc(-7, -14, 6.5, 0, 6.3); ctx.fill(); ctx.fillStyle = '#7a5530'; ctx.fillRect(-9, -21, 4, 3); }
    if (k === 'chief') { ctx.fillStyle = '#9c36b5'; ctx.beginPath(); ctx.moveTo(-5, -16); ctx.lineTo(-10, -1); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = dark; ctx.fillRect(-4 + step * 0.4, -5, 3, 5); ctx.fillRect(1 - step * 0.4, -5, 3, 5);
    ctx.fillStyle = k === 'runner' ? '#d9480f' : '#8a5a2b'; U.rr(ctx, -6, -13, 12, 9, 4); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -18, 7, 6.2, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-14, -25); ctx.lineTo(-5, -16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(14, -25); ctx.lineTo(5, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1, -19, 2.4, 0, 6.3); ctx.arc(5, -19, 2.1, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(2, -19, 1.2, 0, 6.3); ctx.arc(5.8, -19, 1.1, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#2b4a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(3, -15.5, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
    if (k === 'runner') { ctx.fillStyle = '#e03131'; ctx.fillRect(-6, -23, 12, 2.2); }
    if (k === 'brute') { ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(0, -21, 6.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f8f0e3'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-9, -29); ctx.lineTo(-3, -24); ctx.moveTo(6, -22); ctx.lineTo(9, -29); ctx.lineTo(3, -24); ctx.fill(); }
    if (k === 'chief') { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(-5, -29); ctx.lineTo(-2, -26); ctx.lineTo(0, -30); ctx.lineTo(2, -26); ctx.lineTo(5, -29); ctx.lineTo(5, -23); ctx.closePath(); ctx.fill(); }
    const sw = e.swing > 0 ? -1.4 + (0.25 - e.swing) * 7 : -0.3 + Math.sin(t * 3 + e.ph) * 0.1;
    ctx.save(); ctx.translate(6, -10); ctx.rotate(sw);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(0, -1.5, 10, 3); ctx.beginPath(); ctx.arc(11, 0, k === 'brute' || k === 'chief' ? 4.2 : 3, 0, 6.3); ctx.fill();
    ctx.restore();
    if (e.hitT > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -14, 9, 11, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function hpBar(ctx, x, y, w, f) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; U.rr(ctx, x - w / 2 - 1, y - 1, w + 2, 6, 3); ctx.fill();
    ctx.fillStyle = f > 0.6 ? '#51cf66' : f > 0.3 ? '#fcc419' : '#ff6b6b'; U.rr(ctx, x - w / 2, y, Math.max(0, w * f), 4, 2); ctx.fill();
  }

  // ---------- ציור: מבנים ----------
  const BH = { hall: 92, house: 52, farm: 80, mill: 64, quarry: 62, tower: 70, wall: 34, barracks: 66, castle: 150 };
  const ROOFS = ['#d9534f', '#4a7bd0', '#e8843c', '#8e6bd8', '#2bb3a3'];
  const shadow = (ctx, x, y, rx, ry) => { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.3); ctx.fill(); };
  function roof(ctx, x0, x1, y, h, inset, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1 - inset, y - h); ctx.lineTo(x0 + inset, y - h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.shade(col, -0.25); ctx.lineWidth = 1.2;
    for (let yy = y - h * 0.33; yy > y - h; yy -= h * 0.33) { const f = (y - yy) / h; ctx.beginPath(); ctx.moveTo(x0 + inset * f + 2, yy); ctx.lineTo(x1 - inset * f - 2, yy); ctx.stroke(); }
    ctx.fillStyle = U.shade(col, -0.3); ctx.fillRect(x0 + inset - 2, y - h - 3, x1 - x0 - inset * 2 + 4, 4);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + inset, y - h); ctx.lineTo(x0 + inset + 8, y - h); ctx.lineTo(x0 + 10, y); ctx.closePath(); ctx.fill();
  }
  function flag(ctx, x, y, col, t, len) {
    ctx.strokeStyle = '#5c3a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - len); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - len);
    for (let i = 0; i <= 5; i++) ctx.lineTo(x + i * 3.2, y - len + Math.sin(t * 6 - i * 0.8) * 1.8);
    for (let i = 5; i >= 0; i--) ctx.lineTo(x + i * 3.2, y - len + 9 + Math.sin(t * 6 - i * 0.8) * 1.8);
    ctx.closePath(); ctx.fill();
  }
  function stoneTex(ctx, x, y, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = 1;
    for (let yy = y + 7, i = 0; yy < y + h; yy += 7, i++) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      for (let xx = x + (i % 2 ? 5 : 10); xx < x + w; xx += 12) { ctx.beginPath(); ctx.moveTo(xx, yy - 7); ctx.lineTo(xx, yy); ctx.stroke(); }
    }
  }
  function workers(ctx, b, t, spots) {
    for (let i = 0; i < Math.min(b.staff, spots.length); i++) villager(ctx, b.x + spots[i][0], b.foot + spots[i][1], SHIRTS[(b.id + i) % 5], t + i * 0.7, true);
  }
  function drawB(ctx, b, t, S) {
    const x = b.x, fy = b.foot, k = b.k;
    let sc = 1;
    if (S && S.t - b.born < 0.4) sc = 0.55 + 0.45 * U.ease.back(Math.max(0, (S.t - b.born) / 0.4));
    ctx.save();
    if (sc !== 1) { ctx.translate(x, fy); ctx.scale(sc, sc); ctx.translate(-x, -fy); }
    if (k === 'house') {
      shadow(ctx, x, fy - 3, 21, 5);
      ctx.fillStyle = '#f3e3c3'; ctx.fillRect(x - 16, fy - 28, 32, 25);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + 6, fy - 28, 10, 25);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.strokeRect(x - 16, fy - 28, 32, 25);
      ctx.fillStyle = '#7a4a22'; U.rr(ctx, x - 9, fy - 17, 9, 14, 3); ctx.fill();
      ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x + 4, fy - 22, 8, 7); ctx.strokeStyle = '#6e4220'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 4, fy - 22, 8, 7);
      ctx.fillStyle = '#9b4a35'; ctx.fillRect(x + 6, fy - 47, 6, 12);
      roof(ctx, x - 21, x + 21, fy - 26, 20, 12, ROOFS[b.seed % 5]);
      if (S) for (let i = 0; i < 3; i++) { const p = (t * 0.45 + i / 3 + b.seed * 0.13) % 1; ctx.fillStyle = 'rgba(240,240,240,' + (0.55 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(x + 9 + Math.sin(p * 6) * 3, fy - 50 - p * 22, 3 + p * 4, 0, 6.3); ctx.fill(); }
    } else if (k === 'farm') {
      shadow(ctx, x, fy - 6, 46, 8);
      ctx.fillStyle = '#8f5e34'; U.rr(ctx, x - 44, fy - 80, 88, 74, 9); ctx.fill();
      const grow = B.farm.every ? Math.min(1, b.t / B.farm.every) : 0.5;
      for (let r = 0; r < 5; r++) {
        const yy = fy - 70 + r * 13;
        ctx.fillStyle = '#7a4c28'; ctx.fillRect(x - 40, yy + 4, 80, 4);
        for (let c = 0; c < 8; c++) {
          const px = x - 36 + c * 10.3, h = 4 + 7 * grow + ((c + r) % 3);
          ctx.fillStyle = grow > 0.75 ? '#e9c46a' : '#6cc04a';
          ctx.beginPath(); ctx.ellipse(px, yy + 4 - h / 2, 2.6, h / 2, 0, 0, 6.3); ctx.fill();
        }
      }
      ctx.strokeStyle = '#a5763f'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 46, fy - 8); ctx.lineTo(x + 46, fy - 8); ctx.moveTo(x - 46, fy - 14); ctx.lineTo(x + 46, fy - 14); ctx.stroke();
      ctx.fillStyle = '#7a4a22'; for (let px = x - 46; px <= x + 46; px += 15.3) ctx.fillRect(px - 1.5, fy - 19, 3, 14);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 14, fy - 98, 30, 24);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.strokeRect(x + 23, fy - 88, 12, 14); ctx.beginPath(); ctx.moveTo(x + 23, fy - 88); ctx.lineTo(x + 35, fy - 74); ctx.moveTo(x + 35, fy - 88); ctx.lineTo(x + 23, fy - 74); ctx.stroke();
      roof(ctx, x + 10, x + 48, fy - 96, 12, 8, '#7d2a20');
      if (S) workers(ctx, b, t, [[-22, -30], [10, -52]]);
    } else if (k === 'mill') {
      shadow(ctx, x, fy - 5, 46, 8);
      ctx.fillStyle = 'rgba(160,120,70,.55)'; U.rr(ctx, x - 44, fy - 46, 88, 40, 12); ctx.fill();
      ctx.fillStyle = '#a0682d'; ctx.fillRect(x - 40, fy - 62, 44, 38);
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.2; for (let yy = fy - 56; yy < fy - 24; yy += 6) { ctx.beginPath(); ctx.moveTo(x - 40, yy); ctx.lineTo(x + 4, yy); ctx.stroke(); }
      ctx.fillStyle = '#5c3a1e'; U.rr(ctx, x - 26, fy - 44, 13, 20, 3); ctx.fill();
      roof(ctx, x - 46, x + 10, fy - 60, 16, 10, '#6e4220');
      ctx.fillStyle = '#7a4a22'; ctx.fillRect(x + 6, fy - 30, 38, 7);
      ctx.fillStyle = '#c8955a'; ctx.beginPath(); ctx.ellipse(x + 44, fy - 26.5, 3, 3.5, 0, 0, 6.3); ctx.fill();
      const a = S && b.staff ? t * 9 : 0.3;
      ctx.save(); ctx.translate(x + 22, fy - 38);
      ctx.fillStyle = '#ced4da'; ctx.beginPath();
      for (let i = 0; i < 24; i++) { const r = i % 2 ? 11 : 14, an = a + i * Math.PI / 12; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fill();
      ctx.restore();
      for (const [lx, ly] of [[-36, -12], [-22, -12], [-29, -20]]) { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + lx - 6, fy + ly - 4, 14, 8); ctx.fillStyle = '#e8c48c'; ctx.beginPath(); ctx.ellipse(x + lx + 8, fy + ly, 3, 4, 0, 0, 6.3); ctx.fill(); }
      if (S) workers(ctx, b, t, [[-4, -8], [34, -8]]);
    } else if (k === 'quarry') {
      shadow(ctx, x, fy - 6, 46, 8);
      ctx.fillStyle = '#a3a6ab'; ctx.beginPath(); ctx.ellipse(x - 4, fy - 36, 42, 28, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#6f7378'; ctx.beginPath(); ctx.ellipse(x - 4, fy - 32, 30, 18, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#585c61'; ctx.beginPath(); ctx.ellipse(x - 4, fy - 29, 18, 9, 0, 0, 6.3); ctx.fill();
      for (const [bx, by, s] of [[-34, -14, 9], [-22, -10, 7], [22, -12, 8]]) { ctx.fillStyle = '#d0d5da'; ctx.fillRect(x + bx - s, fy + by - s, s * 2, s * 1.6); ctx.fillStyle = '#aeb5bc'; ctx.fillRect(x + bx - s, fy + by + s * 0.2, s * 2, s * 0.4); }
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 34, fy - 8); ctx.lineTo(x + 34, fy - 76); ctx.lineTo(x + 6, fy - 70); ctx.stroke();
      const bob = S && b.staff ? Math.sin(t * 2) * 8 : 0;
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 8, fy - 70); ctx.lineTo(x + 8, fy - 48 + bob); ctx.stroke();
      ctx.fillStyle = '#d0d5da'; ctx.fillRect(x + 3, fy - 48 + bob, 10, 8);
      if (S) workers(ctx, b, t, [[-14, -26], [10, -22]]);
    } else if (k === 'tower') {
      shadow(ctx, x, fy - 3, 18, 5);
      ctx.fillStyle = '#c9c1b3'; ctx.fillRect(x - 12, fy - 48, 24, 45);
      stoneTex(ctx, x - 12, fy - 48, 24, 45);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 4, fy - 48, 8, 45);
      ctx.fillStyle = '#2b2b38'; U.rr(ctx, x - 3, fy - 34, 6, 10, 3); ctx.fill();
      ctx.fillStyle = '#958b7c'; ctx.fillRect(x - 16, fy - 56, 32, 9);
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 16 + i * 9, fy - 61, 6, 6);
      ctx.save(); ctx.translate(x, fy - 60);
      ctx.fillStyle = '#2f9e44'; U.rr(ctx, -5, -7, 10, 9, 3); ctx.fill();
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(0, -11, 4.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(0, -12.5, 5, Math.PI, 0); ctx.fill();
      ctx.rotate(b.ang || 0); ctx.strokeStyle = '#6e4220'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(5, -4, 8, -1.2, 1.2); ctx.stroke();
      ctx.restore();
    } else if (k === 'wall') {
      const nb = (dc, dr) => { const g2 = S && S.grid[idx(b.c + dc, b.r + dr)]; return b.c + dc >= 0 && b.c + dc < COLS && g2 && g2.k === 'wall'; };
      shadow(ctx, x, fy - 3, 18, 4);
      ctx.fillStyle = '#b8b0a2';
      if (nb(-1, 0)) ctx.fillRect(x - 24, fy - 30, 14, 26);
      if (nb(1, 0)) ctx.fillRect(x + 10, fy - 30, 14, 26);
      if (nb(0, -1)) { ctx.fillRect(x - 11, fy - 30 - T, 22, T); stoneTex(ctx, x - 11, fy - 30 - T, 22, T); }
      ctx.fillStyle = '#cfc7b8'; U.rr(ctx, x - 13, fy - 32, 26, 29, 3); ctx.fill();
      stoneTex(ctx, x - 13, fy - 32, 26, 29);
      ctx.fillStyle = '#a39a8a'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 13 + i * 10, fy - 37, 6, 6);
      ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(x + 5, fy - 32, 8, 29);
    } else if (k === 'barracks') {
      shadow(ctx, x, fy - 5, 46, 8);
      ctx.fillStyle = '#cdbb9a'; ctx.fillRect(x - 40, fy - 22, 80, 16);
      stoneTex(ctx, x - 40, fy - 22, 80, 16);
      ctx.fillStyle = '#e9dcc0'; ctx.fillRect(x - 38, fy - 56, 76, 35);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; for (const bx of [-38, -12, 12, 38]) { ctx.beginPath(); ctx.moveTo(x + bx, fy - 56); ctx.lineTo(x + bx, fy - 21); ctx.stroke(); }
      ctx.fillStyle = '#5c3a1e'; U.rr(ctx, x - 8, fy - 38, 16, 32, 5); ctx.fill();
      roof(ctx, x - 46, x + 46, fy - 54, 18, 12, '#3b5bdb');
      icon(ctx, 'soldier', x, fy - 46, 0.85);
      flag(ctx, x - 32, fy - 72, '#e03131', t, 22);
      ctx.fillStyle = '#c9a15a'; ctx.fillRect(x + 30, fy - 26, 4, 20); ctx.beginPath(); ctx.arc(x + 32, fy - 30, 7, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 32, fy - 30, 3.5, 0, 6.3); ctx.stroke();
      if (S && b.train > 0) { const f = b.train / TRAIN; ctx.fillStyle = 'rgba(0,0,0,.5)'; U.rr(ctx, x - 22, fy - 84, 44, 7, 3.5); ctx.fill(); ctx.fillStyle = '#74c0fc'; U.rr(ctx, x - 21, fy - 83, 42 * f, 5, 2.5); ctx.fill(); }
    } else if (k === 'hall' || k === 'castle') {
      if (k === 'hall') {
        shadow(ctx, x, fy - 6, 48, 10);
        ctx.fillStyle = '#cdbb9a'; ctx.fillRect(x - 42, fy - 28, 84, 24); stoneTex(ctx, x - 42, fy - 28, 84, 24);
        ctx.fillStyle = '#f1dcb0'; ctx.fillRect(x - 38, fy - 62, 76, 35);
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2.4;
        for (const bx of [-38, -14, 14, 38]) { ctx.beginPath(); ctx.moveTo(x + bx, fy - 62); ctx.lineTo(x + bx, fy - 27); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - 38, fy - 45); ctx.lineTo(x + 38, fy - 45); ctx.stroke();
        ctx.fillStyle = '#9fd3ff'; for (const wx of [-27, 21]) { ctx.fillRect(x + wx, fy - 57, 7, 9); }
        ctx.fillStyle = '#6e4220'; ctx.beginPath(); ctx.moveTo(x - 10, fy - 4); ctx.lineTo(x - 10, fy - 28); ctx.arc(x, fy - 28, 10, Math.PI, 0); ctx.lineTo(x + 10, fy - 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(x + 5, fy - 16, 1.6, 0, 6.3); ctx.fill();
        roof(ctx, x - 48, x + 48, fy - 60, 28, 18, '#b03a2e');
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(x, fy - 76, 8, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.moveTo(x - 5, fy - 74); ctx.lineTo(x - 5, fy - 80); ctx.lineTo(x - 2, fy - 77); ctx.lineTo(x, fy - 81); ctx.lineTo(x + 2, fy - 77); ctx.lineTo(x + 5, fy - 80); ctx.lineTo(x + 5, fy - 74); ctx.closePath(); ctx.fill();
        flag(ctx, x - 30, fy - 86, '#ffd43b', t, 16); flag(ctx, x + 28, fy - 86, '#ffd43b', t + 1, 16);
      } else {
        shadow(ctx, x, fy - 8, 70, 13);
        ctx.fillStyle = '#d6cdbd'; ctx.fillRect(x - 62, fy - 58, 124, 54); stoneTex(ctx, x - 62, fy - 58, 124, 54);
        ctx.fillStyle = '#bfb5a3'; for (let i = 0; i < 9; i++) ctx.fillRect(x - 62 + i * 14.5, fy - 64, 9, 7);
        ctx.fillStyle = '#e1d9cb'; ctx.fillRect(x - 30, fy - 112, 60, 56); stoneTex(ctx, x - 30, fy - 112, 60, 56);
        ctx.fillStyle = '#c9c0b0'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 30 + i * 13, fy - 119, 8, 8);
        for (const sx of [-1, 1]) {
          const tx = x + sx * 56;
          ctx.fillStyle = '#d6cdbd'; ctx.fillRect(tx - 14, fy - 98, 28, 94); stoneTex(ctx, tx - 14, fy - 98, 28, 94);
          ctx.fillStyle = '#3b5bdb'; ctx.beginPath(); ctx.moveTo(tx - 18, fy - 98); ctx.lineTo(tx + 18, fy - 98); ctx.lineTo(tx, fy - 132); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(tx - 18, fy - 98); ctx.lineTo(tx - 6, fy - 98); ctx.lineTo(tx, fy - 132); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2b2b38'; U.rr(ctx, tx - 4, fy - 82, 8, 13, 4); ctx.fill();
        }
        ctx.fillStyle = '#e1d9cb'; ctx.fillRect(x - 13, fy - 140, 26, 32);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(x - 17, fy - 140); ctx.lineTo(x + 17, fy - 140); ctx.lineTo(x, fy - 168); ctx.closePath(); ctx.fill();
        flag(ctx, x, fy - 168, '#ffd43b', t, 18);
        ctx.fillStyle = '#5c3a1e'; ctx.beginPath(); ctx.moveTo(x - 15, fy - 4); ctx.lineTo(x - 15, fy - 30); ctx.arc(x, fy - 30, 15, Math.PI, 0); ctx.lineTo(x + 15, fy - 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.5; for (let i = -10; i <= 10; i += 5) { ctx.beginPath(); ctx.moveTo(x + i, fy - 4); ctx.lineTo(x + i, fy - 40); ctx.stroke(); }
        for (const bx of [-38, 38]) { ctx.fillStyle = '#c92a2a'; ctx.fillRect(x + bx - 6, fy - 54, 12, 24); ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(x + bx, fy - 44, 3, 0, 6.3); ctx.fill(); }
      }
    }
    if (S && b.hitT > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(x - b.s * T * 0.45, fy - BH[k], b.s * T * 0.9, BH[k]); ctx.globalAlpha = 1; }
    ctx.restore();
    if (!S) return;
    if (b.ruin) {
      ctx.fillStyle = 'rgba(45,35,30,.5)'; U.rr(ctx, x - b.s * T * 0.46, fy - BH[k] * 0.8, b.s * T * 0.92, BH[k] * 0.8, 8); ctx.fill();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 14, fy - 6); ctx.lineTo(x + 2, fy - 22); ctx.moveTo(x + 4, fy - 6); ctx.lineTo(x + 16, fy - 18); ctx.stroke();
      for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; ctx.fillStyle = 'rgba(90,90,90,' + (0.6 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(x - 8 + i * 8 + Math.sin(p * 5 + i) * 4, fy - BH[k] * 0.6 - p * 30, 5 + p * 6, 0, 6.3); ctx.fill(); }
    } else if (b.hp < b.max) hpBar(ctx, x, fy - BH[k] - 10, Math.min(50, b.s * 26), b.hp / b.max);
    if (b.fixT > 0) { ctx.globalAlpha = Math.min(1, b.fixT); for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * b.s * 16, fy - BH[k] * 0.6 + Math.sin(a) * 10, 2.5, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1; }
    const d = B[k];
    if (d.jobs && !b.ruin && b.staff < d.jobs) {
      const bx = x + b.s * T * 0.32, by = fy - BH[k] - 6 + Math.sin(t * 4) * 2;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(bx + 1, by + 2, 12, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 4, by + 9); ctx.lineTo(bx - 8, by + 16); ctx.lineTo(bx + 2, by + 10); ctx.fill();
      icon(ctx, 'people', bx - 2, by, 0.6);
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(bx + 7, by - 6, 4.5, 0, 6.3); ctx.fill();
      g2text(ctx, '!', bx + 7, by - 6, 8, '#fff');
    }
  }
  function g2text(ctx, s, x, y, size, col) { ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y + 0.5); }

  // ---------- ממשק: מיקומים. לרוחב במחשב, לאורך בטלפון (פסים וכפתורים גדולים) ----------
  const inR = (p, R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  const RESK = ['food', 'wood', 'stone', 'people'];
  let L = null;
  function setLayout(port) {
    if (port) {
      H = HP; MY = 200; BY = MY + MH;
      const ih = Math.round(U.clamp(150 + (H - BY - 648) * 0.25, 128, 220)), top = BY + 24 + ih, ch = Math.floor((H - top - 32) / 3);
      L = {
        P: true, rm: { w: 230, h: 66 },
        pill: i => ({ x: 8 + i * 238, y: 10, w: 230, h: 76 }),
        goal: { x: 8, y: 96, w: 704, h: 78 }, raid: { x: 720, y: 96, w: 232, h: 78 },
        info: { x: 8, y: BY + 12, w: 944, h: ih },
        card: i => ({ x: 8 + (i % 4) * 238, y: top + ((i / 4) | 0) * (ch + 10), w: 228, h: ch }),
      };
      L.spd = { x: 8, y: top + 2 * (ch + 10), w: 466, h: ch }; L.book = { x: 486, y: L.spd.y, w: 466, h: ch };
    } else {
      H = 648; MY = 72; BY = MY + MH;
      L = {
        P: false, rm: { w: 120, h: 36 },
        pill: i => ({ x: 8 + i * 114, y: 6, w: 108, h: 36 }),
        goal: { x: 466, y: 6, w: 352, h: 36 }, raid: { x: 826, y: 6, w: 126, h: 36 },
        info: { x: 250, y: BY - 98, w: 460, h: 90 },
        card: i => ({ x: 8 + i * 100, y: BY + 6, w: 94, h: 84 }),
      };
      L.spd = { x: 810, y: BY + 6, w: 66, h: 84 }; L.book = { x: 884, y: BY + 6, w: 68, h: 84 };
    }
  }
  setLayout(false);
  const rmRect = g => { const I = L.info, R = L.rm; return { x: g.rtl ? I.x + 12 : I.x + I.w - R.w - 12, y: I.y + I.h - R.h - 10, w: R.w, h: R.h }; };
  function fit(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const w = ctx.measureText(String(s)).width;
    return w <= maxW ? size : Math.max(9, Math.floor(size * maxW / w));
  }
  function wrap(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 700) + ' ' + size + 'px ' + FONT;
    const out = []; let cur = '';
    for (const w of String(s).split(' ')) { const tr = cur ? cur + ' ' + w : w; if (ctx.measureText(tr).width <= maxW || !cur) cur = tr; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
    return out;
  }
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function panelBg(ctx, R, col, hover) {
    const r = Math.min(16, R.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; U.rr(ctx, R.x, R.y + 3, R.w, R.h, r); ctx.fill();
    const gr = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    gr.addColorStop(0, U.shade(col, hover ? 0.25 : 0.12)); gr.addColorStop(1, U.shade(col, -0.15));
    ctx.fillStyle = gr; U.rr(ctx, R.x, R.y, R.w, R.h, r); ctx.fill();
  }
  const hov = (g, R) => !g.touch && g.ptr.over && inR(g.ptr, R);

  // ---------- ממשק: הפס העליון (משאבים, המטרה הבאה, הפשיטה הבאה) ----------
  function drawTop(g, ctx, S) {
    const top = MY - TOPM, gr = ctx.createLinearGradient(0, 0, 0, top);
    gr.addColorStop(0, '#5a3a20'); gr.addColorStop(1, '#3e2814');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, top);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, top - 3, W, 3);
    RESK.forEach((k, i) => {
      const R = L.pill(i), bump = S.bump[k] || 0, u = R.h / 36;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; U.rr(ctx, R.x, R.y, R.w, R.h, R.h / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,180,.18)'; ctx.lineWidth = 1.5 * u; ctx.stroke();
      icon(ctx, k, R.x + R.h * 0.6, R.y + R.h / 2, u * (1.05 + bump * 0.35));
      let s, col = '#fff';
      if (k === 'people') { s = S.pop + '/' + S.cap; if (S.pop >= S.cap) col = '#ffd166'; }
      else { s = String(Math.floor(S.res[k])); if (k === 'food' && S.hungry) col = '#ff8787'; }
      const tx = R.x + R.h * 1.1, tw = R.x + R.w - tx - 8 * u;
      g.text(ctx, s, tx + tw / 2, R.y + R.h / 2 + u, { size: fit(ctx, s, (24 + bump * 3) * u, tw), color: col, dir: 'ltr' });
    });
    // המטרה הבאה (לחיצה פותחת את רשימת המטרות)
    const G = L.goal, u = G.h / 36, cy = G.y + G.h / 2;
    panelBg(ctx, G, '#2a5d34', hov(g, G));
    ctx.strokeStyle = 'rgba(180,255,190,.35)'; ctx.lineWidth = 1.5 * u; U.rr(ctx, G.x, G.y, G.w, G.h, Math.min(16, G.h / 2)); ctx.stroke();
    const bx = g.rtl ? G.x + G.w - G.h * 0.56 : G.x + G.h * 0.56;
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(bx, cy, 13 * u, 0, 6.3); ctx.fill();
    g.text(ctx, S.ch >= CH.length ? '★' : String(S.ch + 1), bx, cy + u, { size: 16 * u, color: '#4a3000', dir: 'ltr' });
    let txt, prog = '';
    if (S.ch >= CH.length) txt = g.t('c7');
    else {
      const gl = CH[S.ch].goals.find(([k, n]) => goalVal(S, k) < n) || CH[S.ch].goals[0];
      txt = g.t('g_' + gl[0], { n: gl[1] });
      prog = Math.min(goalVal(S, gl[0]), gl[1]) + '/' + gl[1];
    }
    ctx.font = '800 ' + 16 * u + 'px ' + FONT;
    const pw = prog ? ctx.measureText(prog).width + 18 * u : 0, px = g.rtl ? G.x + 12 * u : G.x + G.w - 12 * u - pw;
    if (prog) { ctx.fillStyle = 'rgba(0,0,0,.3)'; U.rr(ctx, px, cy - 11 * u, pw, 22 * u, 11 * u); ctx.fill(); g.text(ctx, prog, px + pw / 2, cy + 0.5 * u, { size: 16 * u, color: '#b2f2bb', dir: 'ltr' }); }
    const room = G.w - G.h * 1.1 - pw - 18 * u, tx = g.rtl ? G.x + G.w - G.h * 1.06 : G.x + G.h * 1.06;
    g.text(ctx, txt, tx, cy + u, { size: fit(ctx, txt, 20 * u, room), color: '#fff', align: g.rtl ? 'right' : 'left' });
    // הפשיטה הבאה: שעון, או כמה גובלינים נשארו. לחיצה כפולה מזעיקה אותה מוקדם
    if (S.raidOn) {
      const R = L.raid, v = R.h / 36, live = !!S.raid, soon = S.raidT < 15, ask = S.callT > 0;
      const pulse = live || ask ? 0.5 + 0.5 * Math.sin(S.anim * 8) : soon ? 0.5 + 0.5 * Math.sin(S.anim * 6) : 0;
      panelBg(ctx, R, live ? '#a61e1e' : soon || ask ? '#8a3a12' : '#4a2a3a', !live && hov(g, R));
      if (pulse) { ctx.strokeStyle = 'rgba(255,160,120,' + (0.3 + pulse * 0.6) + ')'; ctx.lineWidth = 2.5 * v; U.rr(ctx, R.x, R.y, R.w, R.h, Math.min(16, R.h / 2)); ctx.stroke(); }
      ctx.save(); ctx.translate(R.x + 24 * v, R.y + 33 * v); ctx.scale(v, v);
      goblin(ctx, { k: 'grunt', face: 1, walk: 0, swing: 0, hitT: 0, ph: 0 }, 0, 0, S.anim);
      ctx.restore();
      const s = live ? '⚔ ' + (S.gob.length + S.raid.q.length) : fmtT(S.raidT);
      g.text(ctx, s, R.x + 44 * v + (R.w - 52 * v) / 2, R.y + R.h / 2 + v, { size: fit(ctx, s, 21 * v, R.w - 56 * v), color: '#fff', dir: 'ltr' });
      // אפשר כבר להזעיק את הפשיטה מוקדם: עיגול צהוב קטן עם משולש
      if (!live && !soon && S.raidMax - S.raidT >= 45) {
        const qx = R.x + R.w - 9 * v, qy = R.y + 9 * v;
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(qx, qy, 7.5 * v, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#4a1d0a'; ctx.beginPath(); ctx.moveTo(qx - 2.5 * v, qy - 4 * v); ctx.lineTo(qx + 4 * v, qy); ctx.lineTo(qx - 2.5 * v, qy + 4 * v); ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---------- ממשק: סרגל הבנייה ----------
  const PREV = { house: 0.95, farm: 0.5, mill: 0.55, quarry: 0.55, tower: 0.7, wall: 1, barracks: 0.55, castle: 0.36 };
  function drawBar(g, ctx, S) {
    const gr = ctx.createLinearGradient(0, BY, 0, H);
    gr.addColorStop(0, '#6b4424'); gr.addColorStop(1, '#3a2413');
    ctx.fillStyle = gr; ctx.fillRect(0, BY, W, H - BY);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, BY, W, 2);
    ORDER.forEach((k, i) => {
      const R = L.card(i), d = B[k], locked = d.ch > S.ch, sel = S.sel === k, hv = hov(g, R), lack = lackOf(S, k), u = Math.min(R.w / 94, R.h / 84);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; U.rr(ctx, R.x, R.y + 3, R.w, R.h, 12 * u); ctx.fill();
      const cg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
      cg.addColorStop(0, sel ? '#fff1b8' : hv ? '#fbefd5' : '#f1e1c0'); cg.addColorStop(1, sel ? '#f5c84c' : '#cdb185');
      ctx.fillStyle = cg; U.rr(ctx, R.x, R.y, R.w, R.h, 12 * u); ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : 'rgba(60,35,10,.5)'; ctx.lineWidth = (sel ? 3.5 : 2) * u; ctx.stroke();
      ctx.save(); U.rr(ctx, R.x + 2, R.y + 2, R.w - 4, R.h - 4, 10 * u); ctx.clip();
      ctx.globalAlpha = locked ? 0.35 : lack ? 0.6 : 1;
      ctx.translate(R.x + R.w / 2, R.y + R.h * (L.P ? 0.64 : 0.667)); ctx.scale(PREV[k] * u, PREV[k] * u);
      drawB(ctx, { k, x: 0, foot: 0, s: d.s, c: 0, r: 0, seed: 0, staff: 0, t: 3, born: -9, ang: -0.6, hp: 1, max: 1, train: 0 }, S.anim, null);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (locked) {
        const lx = R.x + R.w / 2, ly = R.y + R.h * 0.3;
        ctx.fillStyle = 'rgba(40,25,10,.55)'; U.rr(ctx, R.x, R.y, R.w, R.h, 12 * u); ctx.fill();
        ctx.fillStyle = '#ffe8a3'; U.rr(ctx, lx - 9 * u, ly, 18 * u, 15 * u, 3 * u); ctx.fill();
        ctx.strokeStyle = '#ffe8a3'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(lx, ly, 6 * u, Math.PI, 0); ctx.stroke();
        const s = g.t('chapter', { n: d.ch + 1 });
        g.text(ctx, s, lx, R.y + R.h - 16 * u, { size: fit(ctx, s, 18 * u, R.w - 10), color: '#ffe8a3' });
      } else {
        const parts = Object.keys(d.cost).map(r => ({ r, n: d.cost[r], ok: S.res[r] >= d.cost[r] }));
        const rows = parts.length > 2 ? [parts.slice(0, 2), parts.slice(2)] : [parts];
        rows.forEach((row, ri) => {
          const y = R.y + R.h - (rows.length > 1 ? 26 - ri * 15 : 13) * u, size = (rows.length > 1 ? 15 : 19) * u;
          ctx.font = '800 ' + size + 'px ' + FONT;
          const ws = row.map(p => size * 0.95 + ctx.measureText(String(p.n)).width + 6 * u);
          let x = R.x + R.w / 2 - ws.reduce((a, b) => a + b, 0) / 2 + 3 * u;
          row.forEach((p, j) => {
            icon(ctx, p.r, x + size * 0.45, y, size / 22);
            const tw = ctx.measureText(String(p.n)).width;
            g.text(ctx, p.n, x + size * 0.95 + tw / 2, y + u, { size, color: p.ok ? '#3b2a12' : '#c92a2a', dir: 'ltr' });
            x += ws[j];
          });
        });
        if (!g.touch) g.text(ctx, String(i + 1), R.x + 12, R.y + 12, { size: 13, color: 'rgba(70,45,15,.6)' });
      }
      ctx.restore();
    });
    // מהירות ×2
    const SP = L.spd, su = Math.min(SP.w / 66, SP.h / 84, 2.3), scx = SP.x + SP.w / 2, scy = SP.y + SP.h * 0.4;
    panelBg(ctx, SP, S.speed === 2 ? '#e8590c' : '#4a3a2c', hov(g, SP));
    ctx.fillStyle = '#fff';
    for (const o of [-10, 4]) { const sx = scx + o * su; ctx.beginPath(); ctx.moveTo(sx - 4 * su, scy - 9 * su); ctx.lineTo(sx + 8 * su, scy); ctx.lineTo(sx - 4 * su, scy + 9 * su); ctx.closePath(); ctx.fill(); }
    g.text(ctx, '×2', scx, SP.y + SP.h * 0.78, { size: 22 * su, color: '#fff', dir: 'ltr' });
    // ספר המטרות
    const BK = L.book, bu = Math.min(BK.w / 68, BK.h / 84, 2.3), bx = BK.x + BK.w / 2, by = BK.y + BK.h * 0.38;
    panelBg(ctx, BK, '#2a5d34', hov(g, BK));
    ctx.fillStyle = '#f3e5c9'; U.rr(ctx, bx - 17 * bu, by - 15 * bu, 34 * bu, 30 * bu, 4 * bu); ctx.fill();
    ctx.strokeStyle = '#a5763f'; ctx.lineWidth = 1.5 * bu;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx - 11 * bu, by - 7 * bu + i * 7 * bu); ctx.lineTo(bx + 11 * bu, by - 7 * bu + i * 7 * bu); ctx.stroke(); }
    ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(bx + 14 * bu, by + 13 * bu, 6 * bu, 0, 6.3); ctx.fill();
    const s = g.t('goals');
    g.text(ctx, s, bx, BK.y + BK.h * 0.8, { size: fit(ctx, s, 16 * bu, BK.w - 8), color: '#fff' });
  }

  // ---------- ממשק: חלונית מידע על מבנה (או על הפשיטה הבאה) ----------
  function infoFor(g, S) {
    let k = null, b = null;
    if (S.pick) { b = S.pick; k = b.k; }
    else { for (let i = 0; i < ORDER.length; i++) if (hov(g, L.card(i))) k = ORDER[i]; if (!k) k = S.sel; }
    if (k) {
      const d = B[k], mk = () => g.t('makes', { n: d.amt, r: g.t(d.make), s: d.every });
      let line;
      if (!b) line = g.t('d_' + k);
      else if (b.ruin) line = g.t('ruined');
      else if (d.jobs) line = g.t('workers', { n: b.staff, m: d.jobs }) + ' · ' + mk();
      else if (d.troops) line = g.t('training', { n: troopsOf(S, b), m: d.troops }) + (d.house ? ' · ' + g.t('home', { n: d.house }) : '');
      else if (d.make) line = mk() + ' · ' + g.t('home', { n: d.house });
      else if (d.range) line = g.t('shoots');
      else if (d.house) line = g.t('home', { n: d.house });
      else line = g.t('d_' + k);
      return { title: g.t('n_' + k), line, rm: !!b && k !== 'hall' };
    }
    if (S.raidOn && !S.raid && hov(g, L.raid)) return { title: g.t('raidNextT'), line: g.t('raidNextD') };
    return null;
  }
  function drawInfo(g, ctx, it) {
    const R = L.info, P = L.P, pad = P ? 26 : 16, ax = g.rtl ? R.x + R.w - pad : R.x + pad, al = g.rtl ? 'right' : 'left';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; U.rr(ctx, R.x, R.y + 3, R.w, R.h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(28,20,12,.92)'; U.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,232,163,.5)'; ctx.lineWidth = 2; ctx.stroke();
    const f1 = P ? Math.max(42, R.h * 0.24) : 24, f2 = P ? Math.max(33, R.h * 0.18) : 19, maxW = R.w - pad * 2 - (it.rm ? L.rm.w + 10 : 0);
    const ty = R.y + (P ? R.h * 0.24 : 22);
    g.text(ctx, it.title, ax, ty, { size: fit(ctx, it.title, f1, R.w - pad * 2), align: al, color: '#ffe8a3' });
    wrap(ctx, it.line, f2, maxW, 600).slice(0, 2).forEach((ln, i) => g.text(ctx, ln, ax, ty + (P ? f1 * 1.2 : 29) + i * (P ? f2 * 1.22 : 22), { size: fit(ctx, ln, f2, maxW, 600), weight: 600, align: al, color: '#f3e5c9' }));
    if (it.rm) {
      const RB = rmRect(g), s = g.t('removeB');
      panelBg(ctx, RB, '#b8541c', hov(g, RB));
      g.text(ctx, s, RB.x + RB.w / 2, RB.y + RB.h / 2 + 1, { size: fit(ctx, s, P ? 32 : 18, RB.w - 14), color: '#fff' });
    }
    ctx.restore();
  }

  // ---------- ממשק: באנרים, הדרכה, הודעות ----------
  function banner(g, title, sub, col) { g.s.banner = { title, sub, col, t: 3.2 }; }
  function drawBanner(g, ctx, cx, y, title, sub, col, a, size) {
    ctx.save(); ctx.globalAlpha = a;
    const ts = size || 22, ss = Math.round(ts * 0.74), maxW = W - 40 - ts * 2;
    ctx.font = '800 ' + ts + 'px ' + FONT;
    let tw = Math.min(maxW, ctx.measureText(title).width);
    if (sub) { ctx.font = '700 ' + ss + 'px ' + FONT; tw = Math.max(tw, Math.min(maxW, ctx.measureText(sub).width)); }
    const bw = tw + ts * 2, bh = sub ? ts * 1.2 + ss * 1.9 : ts * 2, x = cx - bw / 2, r = ts * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; U.rr(ctx, x, y + 3, bw, bh, r); ctx.fill();
    ctx.fillStyle = 'rgba(28,24,40,.92)'; U.rr(ctx, x, y, bw, bh, r); ctx.fill();
    ctx.strokeStyle = col || 'rgba(255,232,163,.6)'; ctx.lineWidth = 2; ctx.stroke();
    g.text(ctx, title, cx, y + (sub ? ts * 0.95 : bh / 2), { size: fit(ctx, title, ts, maxW), color: col || '#ffe8a3' });
    if (sub) g.text(ctx, sub, cx, y + ts * 1.2 + ss * 0.95, { size: fit(ctx, sub, ss, maxW, 700), weight: 700, color: '#fff', dir: 'ltr' });
    ctx.restore();
    return bh;
  }
  function hintKey(g) {
    const S = g.s;
    if (S.ch === 0) {
      if (!S.cnt.house) return [S.sel === 'house' ? (g.touch ? 'tut2t' : 'tut2') : 'tut1', S.sel === 'house' ? null : 0];
      if (!S.cnt.farm) return [S.sel === 'farm' ? (g.touch ? 'tut2t' : 'tut2') : 'tut3', S.sel === 'farm' ? null : 1];
      return ['tut4', null];
    }
    if (S.ch === 1 && !S.cnt.mill) return ['tut5', S.sel === 'mill' ? null : 2];
    if (S.ch === 2 && !S.cnt.tower) return ['tut6', S.sel === 'tower' ? null : 4];
    if (S.hungry) return ['hungry', S.sel === 'farm' ? null : 1];
    if (S.jobs > S.pop && S.pop >= S.cap) return ['noWork', S.sel === 'house' ? null : 0];
    return null;
  }
  function arrowDown(ctx, x, y, t, s) {
    const b = Math.sin(t * 7) * 5 * s;
    ctx.save(); ctx.translate(x, y + b); ctx.scale(s, s);
    ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -15); ctx.lineTo(-5, -15); ctx.lineTo(-5, -30); ctx.lineTo(5, -30); ctx.lineTo(5, -15); ctx.lineTo(13, -15); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // ---------- חלונות (DOM, חדים בכל גודל) ----------
  function closePanel(g) { const S = g.s; if (S) S.panel = null; g.closePanel(); }
  function chapterPanel(g, mode) {
    const S = g.s;
    S.panel = mode; S.sel = null; S.pend = null;
    g.panel(card => {
      if (mode === 'done') {
        card.appendChild(g.el('h2', '', g.t('chDone', { n: S.ch })));
        const R = CH[S.ch - 1].reward, parts = Object.keys(R).map(r => '+' + R[r] + ' ' + g.t(r));
        card.appendChild(g.el('p', '', g.t('reward') + ': ' + parts.join(' · ')));
      }
      if (S.ch < CH.length) {
        card.appendChild(g.el(mode === 'done' ? 'p' : 'h2', mode === 'done' ? 'g2d-lbl' : '', g.t('chapter', { n: S.ch + 1 }) + ' — ' + g.t('c' + (S.ch + 1))));
        const box = g.el('div', 'g2d-help');
        for (const [k, n] of CH[S.ch].goals) {
          const v = Math.min(goalVal(S, k), n), done = v >= n;
          const row = g.el('div', '', (done ? '✔ ' : '○ ') + g.t('g_' + k, { n }) + '  (' + v + '/' + n + ')');
          if (done) row.style.color = '#8ce99a';
          box.appendChild(row);
        }
        card.appendChild(box);
      } else card.appendChild(g.el('p', '', g.t('allDone')));
      const row = g.el('div', 'g2d-row');
      g.button(row, mode === 'done' ? g.t('nextCh') : mode === 'intro' ? g.t('letsGo') : g.t('closeB'), () => closePanel(g), { primary: true });
      if (mode === 'list') g.button(row, g.t('newK'), () => confirmNew(g), { alt: true });
      card.appendChild(row);
    }, 'custom');
  }
  function confirmNew(g) {
    const S = g.s;
    S.panel = 'confirm';
    g.panel(card => {
      card.appendChild(g.el('h2', '', g.t('newK')));
      card.appendChild(g.el('p', '', g.t('newQ')));
      const row = g.el('div', 'g2d-row');
      g.button(row, g.t('no'), () => closePanel(g), { primary: true });
      const yes = g.button(row, g.t('newYes'), () => { g.save('kingdom', null); g.s = newState(false); closePanel(g); chapterPanel(g, 'intro'); }, { alt: true });
      yes.style.background = '#c92a2a'; yes.style.borderColor = '#c92a2a';
      card.appendChild(row);
    }, 'custom');
  }

  // ---------- הכפר שמאחורי התפריט ובתמונת הכרטיס ----------
  const DEMO = [['castle', 8, 1], ['house', 12, 2], ['house', 12, 4], ['house', 6, 5], ['house', 8, 6], ['house', 11, 6], ['house', 6, 4], ['farm', 3, 5], ['farm', 13, 7], ['mill', 4, 0], ['quarry', 16, 0], ['tower', 6, 2], ['tower', 14, 4], ['barracks', 9, 7], ['wall', 2, 3], ['wall', 2, 4], ['wall', 2, 6], ['wall', 17, 3], ['wall', 17, 4], ['wall', 17, 5]];
  function demoState() {
    const S = newState(true);
    for (const [k, c, r] of DEMO) if (canPlace(S, k, c, r) === '') addB(S, k, c, r);
    S.pop = S.cap - 3; S.res = { food: 240, wood: 180, stone: 120 }; S.ch = 6; S.demoT = 1;
    for (const b of S.bs) if (B[b.k].troops) for (let i = 0; i < B[b.k].troops; i++) addSoldier(S, b, i);
    for (const s of S.sol) { const p = postOf(s.home, s.i); s.x = s.px = p.x; s.y = s.py = p.y; }
    flows(S);
    return S;
  }
  function ring(ctx, x, y, R, col) { ctx.save(); ctx.fillStyle = col.replace('A', '.1'); ctx.strokeStyle = col.replace('A', '.7'); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(x, y, R, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function drawWorld(g, ctx, S, alpha, t) {
    const items = [];
    for (const b of S.bs) items.push([b.foot, 0, b]);
    for (const s of S.sol) if (s.st !== 'ko') items.push([s.y, 1, s]);
    for (const e of S.gob) items.push([e.y + e.oy, 2, e]);
    for (const w of S.walkers) items.push([w.y, 3, w]);
    items.sort((a, b) => a[0] - b[0]);
    const lx = o => o.px + (o.x - o.px) * alpha, ly = o => o.py + (o.y - o.py) * alpha;
    for (const [, kind, o] of items) {
      if (kind === 0) drawB(ctx, o, t, S);
      else if (kind === 1) soldier(ctx, o, lx(o), ly(o), t);
      else if (kind === 2) goblin(ctx, o, lx(o) + o.ox, ly(o) + o.oy, t);
      else villager(ctx, o.x, o.y, SHIRTS[o.sh], t * 1.4, false);
    }
    for (const e of S.gob) if (e.hp < e.max) hpBar(ctx, lx(e) + e.ox, ly(e) + e.oy - (e.k === 'chief' ? 58 : e.k === 'brute' ? 48 : 36), e.k === 'chief' ? 40 : 24, e.hp / e.max);
    for (const s of S.sol) if (s.st !== 'ko' && s.hp < s.max) hpBar(ctx, lx(s), ly(s) - 36, 20, s.hp / s.max);
    for (const a of S.arrows) {
      ctx.save(); ctx.translate(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha); ctx.rotate(a.a);
      ctx.strokeStyle = '#6e4220'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(-12, -2, 4, 4);
      ctx.restore();
    }
  }
  function stepFl(S) { for (const f of S.fl) if ((f.t += DT) >= 1) f.dead = true; compact(S.fl); }
  function drawFl(g, ctx, S) {
    const k = L.P ? 1.45 : 1;
    for (const f of S.fl) g.text(ctx, f.s, f.x, f.y - f.t * 55, { size: f.size * k, color: f.col, stroke: 'rgba(0,0,0,.55)', strokeW: 4, alpha: Math.min(1, (1 - f.t) * 3) });
  }
  const tileB = { x: 0, foot: 0, c: 0, r: 0, seed: 0, staff: 0, t: 3, born: -9, ang: -0.6, hp: 1, max: 1, train: 0 };

  GK.register('little-kingdom', {
    w: W,
    // לאורך (טלפון): גובה העולם לפי צורת המסך, כדי שהכפתורים ימלאו אותו
    get h() {
      if (!PORT()) return 648;
      try { HP = Math.round(U.clamp(960 * (innerHeight - 246) / Math.max(200, innerWidth - 50), 1240, 1720)); } catch (e) { HP = 1328; }
      return HP;
    },
    bg: '#2a1a0d', accent: '#ffd166',
    diffs: true, noBest: true,
    text: TX,

    setup(g) { setLayout(g.H > 1000); },

    init(g) {
      setLayout(g.H > 1000);
      if (g.demo) { g.s = demoState(); return; }
      const fresh = !g.load('kingdom', null);
      g.s = loadState(g);
      flows(g.s);
      if (fresh) chapterPanel(g, 'intro');
    },

    idle(g) {
      const S = g.s;
      if (!g.demo || !S || !S.demo) return;
      S.anim += DT;
      if ((S.demoT -= DT) <= 0 && S.gob.length < 5) { S.demoT = 2.6; spawnGob(g, g.pick(['grunt', 'grunt', 'runner', 'brute']), Math.random() < 0.5 ? -1 : 1, 3 + Math.floor(Math.random() * 4), 1.5); }
      sim(g);
      stepFl(S);
    },

    step(g) {
      const S = g.s;
      S.anim += DT;
      if (S.toast && (S.toast.t -= DT) <= 0) S.toast = null;
      if (S.banner && (S.banner.t -= DT) <= 0) S.banner = null;
      if (S.callT > 0) S.callT -= DT;
      if (!S.panel) for (let i = 0; i < S.speed; i++) sim(g);
      else for (const A of [S.gob, S.sol, S.arrows]) for (const u of A) { u.px = u.x; u.py = u.y; }
      stepFl(S);
      if ((S.saveT -= DT) <= 0) { S.saveT = 5; save(g); }
      g.hud([]);
      let cur = 'default';
      const p = g.ptr;
      if (p.over && !S.panel && !g.touch) {
        if (inR(p, L.goal) || (S.raidOn && !S.raid && inR(p, L.raid)) || ORDER.some((k, i) => inR(p, L.card(i))) || inR(p, L.spd) || inR(p, L.book) || (S.pick && S.pick.k !== 'hall' && inR(p, rmRect(g)))) cur = 'pointer';
        else if (p.y >= MY && p.y < BY) { if (S.sel) cur = 'pointer'; else { const [c, r] = tileOf(p.x, p.y); if (S.grid[idx(c, r)]) cur = 'pointer'; } }
      }
      if (g.canvas.style.cursor !== cur) g.canvas.style.cursor = cur;
    },

    bot(g) { botStep(g); },

    onKey(g, e) {
      const S = g.s;
      if (S.panel) {
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { const b = g.root.querySelector('.g2d-ov.show [data-primary]'); if (b && !e.repeat) b.click(); }
        return;
      }
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].indexOf(e.code);
      if (i >= 0) { act.select(g, ORDER[i]); return; }
      if (e.code === 'KeyF') act.speed(g);
      else if ((e.code === 'KeyX' || e.code === 'Delete') && S.pick) act.remove(g);
      else if (e.code === 'KeyG') chapterPanel(g, 'list');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S || S.panel || S.demo) return;
      if (type === 'move') {
        // במגע: גרירה מזיזה את המקום שבו המבנה ייבנה
        if (p.down && S.sel && S.pend && p.kind !== 'mouse' && p.y >= MY && p.y < BY) S.pend = anchorAt(S.sel, p.x, p.y);
        return;
      }
      if (type !== 'down') return;
      if (p.button === 2) { S.sel = null; S.pick = null; S.pend = null; return; }
      if (S.pick && S.pick.k !== 'hall' && inR(p, rmRect(g))) { act.remove(g); return; }
      if (p.y < MY - TOPM) {
        if (inR(p, L.goal)) { g.sfx('click'); chapterPanel(g, 'list'); }
        else if (S.raidOn && !S.raid && inR(p, L.raid)) act.callRaid(g);
        return;
      }
      if (p.y >= BY) {
        for (let i = 0; i < ORDER.length; i++) if (inR(p, L.card(i))) { act.select(g, ORDER[i]); return; }
        if (inR(p, L.spd)) act.speed(g);
        else if (inR(p, L.book)) { g.sfx('click'); chapterPanel(g, 'list'); }
        return;
      }
      if (p.y < MY || (!L.P && S.pick && inR(p, L.info))) return;
      if (S.sel) {
        const [c, r] = anchorAt(S.sel, p.x, p.y);
        if (p.kind !== 'mouse') {
          // במגע: הקשה ראשונה מראה איפה ייבנה, הקשה על המקום המסומן (או לידו) בונה
          const P = S.pend, s = B[S.sel].s;
          if (!P || p.x < (P[0] - 0.6) * T || p.x > (P[0] + s + 0.6) * T || p.y < MY + (P[1] - 0.6) * T || p.y > MY + (P[1] + s + 0.6) * T) { S.pend = [c, r]; g.sfx('tick'); return; }
          act.place(g, P[0], P[1]);
          return;
        }
        act.place(g, c, r);
        return;
      }
      const [c, r] = tileOf(p.x, p.y), b = S.grid[idx(c, r)];
      if (b) act.pick(g, b); else S.pick = null;
    },

    onPause(g) { if (g.s) { g.s.panel = null; save(g); } },
    onLang(g) { const S = g.s; if (S && S.panel && S.panel !== 'confirm' && g.state === 'play') chapterPanel(g, S.panel); },
    destroy(g) { if (g.s && !g.s.demo) save(g); },

    draw(g, ctx, alpha) {
      const S = g.s, t = S.anim;
      ctx.drawImage(mapImage(g), 0, MY - TOPM, W, MH + TOPM);
      if (S.sel) {
        const s = B[S.sel].s;
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        for (let r = 0; r <= ROWS - s; r++) for (let c = 0; c <= COLS - s; c++) if (canPlace(S, S.sel, c, r) === '') { ctx.beginPath(); ctx.arc((c + s / 2) * T, MY + (r + s / 2) * T, 4.5, 0, 6.3); ctx.fill(); }
        if (S.sel === 'castle' && !S.cnt.castle) { ctx.strokeStyle = 'rgba(255,224,102,' + (0.55 + 0.4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 4; U.rr(ctx, HILL.c * T + 4, MY + HILL.r * T + 4, 3 * T - 8, 3 * T - 8, 18); ctx.stroke(); }
      }
      if (S.pick) {
        const b = S.pick;
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; U.rr(ctx, b.c * T + 2, MY + b.r * T + 2, b.s * T - 4, b.s * T - 4, 8); ctx.stroke();
        if (B[b.k].range) ring(ctx, b.x, b.y, B[b.k].range * T, 'rgba(255,255,255,A)');
      }
      drawWorld(g, ctx, S, alpha, t);
      // רוח רפאים של המבנה לפני הבנייה: ירוק = אפשר, אדום = אי אפשר
      let gh = null;
      if (S.sel) {
        if (S.pend) gh = S.pend;
        else if (!g.touch && g.ptr.over && g.ptr.y >= MY && g.ptr.y < BY && !(S.pick && !L.P && inR(g.ptr, L.info))) gh = anchorAt(S.sel, g.ptr.x, g.ptr.y);
      }
      if (gh) {
        const k = S.sel, s = B[k].s, ok = canPlace(S, k, gh[0], gh[1]) === '', x0 = gh[0] * T, y0 = MY + gh[1] * T;
        ctx.fillStyle = ok ? 'rgba(140,233,154,.35)' : 'rgba(255,107,107,.35)'; U.rr(ctx, x0 + 2, y0 + 2, s * T - 4, s * T - 4, 8); ctx.fill();
        ctx.strokeStyle = ok ? '#8ce99a' : '#ff6b6b'; ctx.lineWidth = L.P ? 4.5 : 2.5; ctx.stroke();
        if (B[k].range) ring(ctx, x0 + s * T / 2, y0 + s * T / 2, B[k].range * T, ok ? 'rgba(140,233,154,A)' : 'rgba(255,107,107,A)');
        ctx.globalAlpha = ok ? 0.75 : 0.4;
        drawB(ctx, Object.assign({}, tileB, { k, x: x0 + s * T / 2, foot: y0 + s * T, s, c: gh[0], r: gh[1] }), t, null);
        ctx.globalAlpha = 1;
        // במגע: סימן וי מעל המקום המסומן — עוד הקשה עליו בונה
        if (S.pend && ok) {
          const z = (L.P ? 1.7 : 1.1) * (1 + 0.08 * Math.sin(t * 8)), cx = x0 + s * T / 2, cy = y0 - 4 - 14 * z;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(cx, cy + 2, 14 * z, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#40c057'; ctx.beginPath(); ctx.arc(cx, cy, 14 * z, 0, 6.3); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5 * z; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(cx - 6 * z, cy); ctx.lineTo(cx - 1.5 * z, cy + 5 * z); ctx.lineTo(cx + 7 * z, cy - 5 * z); ctx.stroke();
        }
      }
      // צללי עננים שנעים לאט מעל הכפר
      ctx.save(); ctx.beginPath(); ctx.rect(0, MY - TOPM, W, MH + TOPM); ctx.clip();
      ctx.fillStyle = 'rgba(20,40,10,.07)';
      for (let i = 0; i < 3; i++) {
        const x = ((t * (9 + i * 4) + i * 420) % (W + 460)) - 230, y = MY + 70 + i * 150;
        ctx.beginPath(); ctx.ellipse(x, y, 110 + i * 20, 42, 0, 0, 6.3); ctx.moveTo(x + 140, y - 18); ctx.ellipse(x + 70, y - 18, 70, 34, 0, 0, 6.3); ctx.fill();
      }
      ctx.restore();
      drawFl(g, ctx, S);
      // משאבים שעפים למונים
      for (const f of S.fly) {
        const q = U.ease.inOut(Math.min(1, f.t / f.dur)), R = L.pill(RESK.indexOf(f.k));
        const x = f.x0 + (R.x + R.h * 0.6 - f.x0) * q, y = f.y0 + (R.y + R.h / 2 - f.y0) * q - Math.sin(q * Math.PI) * 50;
        icon(ctx, f.k, x, y, 0.9 * (L.P ? 1.4 : 1));
      }
      drawTop(g, ctx, S);
      drawBar(g, ctx, S);
      if (S.demo) return;
      const it = infoFor(g, S);
      if (it) drawInfo(g, ctx, it);
      const h = !S.panel && hintKey(g);
      let ty = MY + 8;
      if (h) {
        if (!L.P) { if (!S.pick) ty += drawBanner(g, ctx, W / 2, MY + 8, g.t(h[0]), null, null, 1, 21) + 8; }
        else if (!it) drawBanner(g, ctx, W / 2, L.info.y + L.info.h / 2 - 38, g.t(h[0]), null, null, 1, 38);
        if (h[1] != null && S.sel !== ORDER[h[1]]) { const R = L.card(h[1]); arrowDown(ctx, R.x + R.w / 2, R.y - 4, t, L.P ? 1.7 : 1); }
      }
      if (S.toast) drawBanner(g, ctx, W / 2, ty, S.toast.s, null, S.toast.col, Math.min(1, S.toast.t * 3), L.P ? 36 : 20);
      if (S.banner) { const b = S.banner; drawBanner(g, ctx, W / 2, MY + MH * 0.3, b.title, b.sub, b.col, Math.min(1, b.t * 2, (3.2 - b.t) * 5), L.P ? 50 : 30); }
    },

    cover(ctx, w, h, k) {
      const keep = L.P;
      setLayout(false);
      const S = demoState();
      S.t = 5;
      const add = (kind, x, y, face, carry) => { spawnGob({ s: S }, kind, -1, 4, 1); const e = S.gob[S.gob.length - 1]; e.x = e.px = x; e.y = e.py = y; e.ox = e.oy = 0; e.face = face; e.hp = e.max * 0.6; if (carry) e.carry = { k: 'wood', n: 10 }; };
      add('brute', 3.3 * T, MY + 4.5 * T, -1); add('grunt', 3.4 * T, MY + 3.5 * T, -1); add('grunt', 3.3 * T, MY + 6.4 * T, -1); add('runner', 15.6 * T, MY + 5.6 * T, -1, true);
      add('grunt', 18.5 * T, MY + 4.4 * T, -1); add('chief', 18.4 * T, MY + 6.2 * T, -1);
      S.sol.forEach((s, i) => { if (i === 0) { s.x = s.px = 4.3 * T; s.y = s.py = MY + 4.6 * T; s.face = -1; s.swing = 0.1; } if (i === 1) { s.x = s.px = 16.4 * T; s.y = s.py = MY + 5.8 * T; s.face = 1; } });
      S.arrows.push({ x: 5.1 * T, y: MY + 3.4 * T, px: 5.1 * T, py: MY + 3.4 * T, a: Math.PI * 0.85, tg: { dead: false } }, { x: 15.6 * T, y: MY + 3.7 * T, px: 15.6 * T, py: MY + 3.7 * T, a: 0.6, tg: { dead: false } });
      const sc = 1.22;
      ctx.save();
      ctx.scale(sc, sc);
      ctx.translate(-(W - w / sc) / 2, -MY + 4);
      paintMap(ctx, k);
      for (const b of S.bs) b.staff = B[b.k].jobs || 0;
      drawWorld(k, ctx, S, 1, 1.3);
      ctx.restore();
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.75, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.3)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      setLayout(keep);
    },
  });
})();
