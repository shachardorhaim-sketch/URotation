// ============================================================
//  החווה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  שותלים, משקים, מחכים שיגדל, קוצרים, ממלאים הזמנות ומוכרים בשוק.
//  קונים חלקות, זרעים חדשים, תרנגולות (ביצים), פרות (חלב) וכלים.
//  ניסיון ורמות פותחים דברים חדשים. החווה נשמרת לבד (g.save) וממשיכה לגדול גם כשלא משחקים.
// ============================================================
(function () {
  'use strict';
  const FONT = 'Heebo, Arial, sans-serif';
  const DT = 1 / 60;
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };

  // ---------- נתונים ----------
  // t = שניות גידול, seed = מחיר זרע, price = מחיר מכירה, xp = ניסיון בקציר, lv = הרמה שבה נפתח, cost = מחיר הזרעים בחנות
  const CROPS = [
    { id: 'wheat', t: 15, seed: 2, price: 6, xp: 1, lv: 1, cost: 0, col: '#f2c14e' },
    { id: 'carrot', t: 25, seed: 4, price: 11, xp: 2, lv: 2, cost: 30, col: '#ff8a2a' },
    { id: 'corn', t: 40, seed: 6, price: 17, xp: 3, lv: 3, cost: 60, col: '#ffd84a' },
    { id: 'tomato', t: 55, seed: 9, price: 25, xp: 4, lv: 5, cost: 110, col: '#e8402f' },
    { id: 'strawberry', t: 75, seed: 12, price: 34, xp: 5, lv: 6, cost: 160, col: '#ff4d6d' },
    { id: 'sunflower', t: 100, seed: 16, price: 46, xp: 7, lv: 8, cost: 240, col: '#ffcc1a' },
    { id: 'pumpkin', t: 140, seed: 22, price: 64, xp: 9, lv: 10, cost: 350, col: '#ff8c1a' },
  ];
  const CROP = {};
  CROPS.forEach(c => { CROP[c.id] = c; });
  // חיות: מה הן אוכלות, מה הן נותנות, כמה זמן, ובאיזו רמה ובאיזה מחיר נפתח כל מקום
  const ANIM = {
    chicken: { feed: 'wheat', prod: 'egg', t: 30, lv: [2, 2, 4, 5, 6, 7], cost: [30, 45, 60, 80, 100, 130] },
    cow: { feed: 'corn', prod: 'milk', t: 60, lv: [4, 5, 7, 8], cost: [120, 170, 230, 300] },
  };
  const PROD = { egg: { price: 16, xp: 2, t: 30, col: '#f3e6cf' }, milk: { price: 44, xp: 4, t: 60, col: '#e8f1ff' } };
  const ITEMS = [...CROPS.map(c => c.id), 'egg', 'milk'];
  const priceOf = id => (CROP[id] ? CROP[id].price : PROD[id].price);
  const xpOf = id => (CROP[id] ? CROP[id].xp : PROD[id].xp);
  const timeOf = id => (CROP[id] ? CROP[id].t : PROD[id].t);
  const colOf = id => (CROP[id] ? CROP[id].col : PROD[id].col);
  const NPLOTS = 16, START = [0, 1, 2, 4, 5, 6];
  const PLOT_LV = [1, 1, 3, 3, 5, 5, 7, 7, 9, 9];           // חלקות 7 עד 16
  const PLOT_COST = [25, 40, 60, 85, 115, 150, 190, 240, 300, 380];
  const UPS = [
    { id: 'sprinkler', lv: 3, cost: 150 },
    { id: 'feeder', lv: 5, cost: 260 },
    { id: 'board', lv: 6, cost: 200 },
    { id: 'fert', lv: 7, cost: 400 },
  ];
  const xpNeed = lv => Math.round(28 * Math.pow(lv, 1.62));
  const lvReward = lv => 15 + 10 * lv;
  const growT = (F, id) => CROP[id].t * (F.up.fert ? 0.7 : 1);
  const LOWER = { en: 1, es: 1, fr: 1, pt: 1, ru: 1 };

  // ---------- טקסטים ----------
  const TXT = {
    he: {
      title: 'החווה',
      tagNew: 'שתול, השקה, קצור — ובנה את החווה הכי נעימה!', tagSaved: 'החווה שלך: רמה {lv} · {c} מטבעות',
      help: ['לחץ על חלקה ריקה כדי לשתול, ושוב כדי להשקות', 'כשהיבול מוכן — לחץ עליו כדי לקצור. אפשר לגרור על כמה חלקות ביחד', 'מלא הזמנות בלוח כדי לקבל מטבעות וניסיון, או מכור בשוק', 'קנה חלקות, זרעים חדשים, תרנגולות ופרות. החווה נשמרת לבד'],
      helpTouch: ['הקש על חלקה ריקה כדי לשתול, ושוב כדי להשקות', 'הקש על יבול מוכן כדי לקצור. אפשר להחליק אצבע על כמה חלקות', 'מלא הזמנות בלוח כדי לקבל מטבעות וניסיון, או מכור בשוק', 'קנה חלקות, זרעים חדשים, תרנגולות ופרות. החווה נשמרת לבד'],
      coins: 'מטבעות', lvl: 'רמה', xp: 'ניסיון', xpF: '+{n} ניסיון',
      wheat: 'חיטה', carrot: 'גזר', corn: 'תירס', tomato: 'עגבנייה', strawberry: 'תות', sunflower: 'חמנייה', pumpkin: 'דלעת', egg: 'ביצה', milk: 'חלב',
      chicken: 'תרנגולת', cow: 'פרה', plot: 'חלקה',
      orders: 'הזמנות', market: 'שוק', shop: 'חנות',
      deliver: 'מסור', sell1: 'מכור 1', sellAll: 'מכור הכול', buy: 'קנה', cancel: 'ביטול', cont: 'המשך',
      tabSeeds: 'זרעים', tabFarm: 'חווה', tabTools: 'כלים',
      sprinkler: 'ממטרה', sprinklerD: 'זרעים חדשים מושקים לבד',
      feeder: 'מאכיל אוטומטי', feederD: 'החיות אוכלות מהמחסן לבד',
      board: 'לוח גדול', boardD: 'מקום להזמנה רביעית',
      fert: 'דשן', fertD: 'היבול גדל מהר יותר ב-30%',
      plotD: 'עוד אדמה לשתילה', chickenD: 'אוכלת חיטה ומטילה ביצים', cowD: 'אוכלת תירס ונותנת חלב',
      seedD: 'גדל ב-{t} · נמכר ב-{p}',
      lvN: 'רמה {n}', owned: 'נקנה', full: 'מלא',
      noCoins: 'אין מספיק מטבעות', noFeed: 'צריך {item} כדי להאכיל אותה', missing: 'עוד חסרים לך דברים להזמנה', opensAt: 'נפתח ברמה {n}',
      welcome: 'ברוך שובך! החווה המשיכה לגדול',
      levelUp: 'רמה {n}!', newThings: 'חדש בחווה שלך:',
      unlockCrop: 'זרעי {name}', unlockChickens: 'תרנגולות', unlockCows: 'פרות', morePlots: 'עוד חלקות', moreChickens: 'עוד מקום לתרנגולות', moreCows: 'עוד מקום לפרות',
      orderDone: 'ההזמנה נמסרה!', newOrder: 'הזמנה חדשה בדרך…', hot: 'מחיר חם!',
      empty: 'המחסן ריק — קצור משהו כדי למכור', bought: 'חדש: {name}!', gift: 'שכן נתן לך {n} מטבעות!',
      tut1: 'לחץ על חלקה ריקה כדי לשתול חיטה', tut1t: 'הקש על חלקה ריקה כדי לשתול חיטה',
      tut2: 'עכשיו השקה את הזרע — לחץ עליו!', tut2t: 'עכשיו השקה את הזרע — הקש עליו!',
      tut3: 'החיטה גדלה! בינתיים שתול והשקה עוד חלקות',
      tut4: 'החיטה מוכנה! לחץ עליה כדי לקצור', tut4t: 'החיטה מוכנה! הקש עליה כדי לקצור',
      tut5: 'יש לך מספיק — לחץ "מסור" כדי למלא את ההזמנה',
      tut6: 'מעולה! מכור עודפים בשוק, וקנה דברים חדשים בחנות',
      readyIn: 'מוכן בעוד {t}', ready: 'מוכן!', wants: 'רעבה — רוצה {item}', needsWater: 'צריך מים',
    },
    en: {
      title: 'The Farm',
      tagNew: 'Plant, water, harvest — and grow the coziest farm!', tagSaved: 'Your farm: level {lv} · {c} coins',
      help: ['Click an empty plot to plant, then click it again to water', 'Click ripe crops to harvest — or drag across many plots at once', 'Fill orders on the board for coins and XP, or sell at the market', 'Buy plots, new seeds, chickens and cows. Your farm saves itself'],
      helpTouch: ['Tap an empty plot to plant, then tap it again to water', 'Tap ripe crops to harvest — or slide across many plots at once', 'Fill orders on the board for coins and XP, or sell at the market', 'Buy plots, new seeds, chickens and cows. Your farm saves itself'],
      coins: 'Coins', lvl: 'Level', xp: 'XP', xpF: '+{n} XP',
      wheat: 'Wheat', carrot: 'Carrot', corn: 'Corn', tomato: 'Tomato', strawberry: 'Strawberry', sunflower: 'Sunflower', pumpkin: 'Pumpkin', egg: 'Egg', milk: 'Milk',
      chicken: 'Chicken', cow: 'Cow', plot: 'Plot',
      orders: 'Orders', market: 'Market', shop: 'Shop',
      deliver: 'Deliver', sell1: 'Sell 1', sellAll: 'Sell all', buy: 'Buy', cancel: 'Cancel', cont: 'Continue',
      tabSeeds: 'Seeds', tabFarm: 'Farm', tabTools: 'Tools',
      sprinkler: 'Sprinkler', sprinklerD: 'New seeds water themselves',
      feeder: 'Auto-feeder', feederD: 'Animals eat from the barn by themselves',
      board: 'Big board', boardD: 'Room for a 4th order',
      fert: 'Fertilizer', fertD: 'Crops grow 30% faster',
      plotD: 'More land to plant on', chickenD: 'Eats wheat and lays eggs', cowD: 'Eats corn and gives milk',
      seedD: 'Grows in {t} · sells for {p}',
      lvN: 'Level {n}', owned: 'Owned', full: 'Full',
      noCoins: 'Not enough coins', noFeed: 'You need {item} to feed it', missing: 'You still need more for this order', opensAt: 'Unlocks at level {n}',
      welcome: 'Welcome back! Your farm kept growing',
      levelUp: 'Level {n}!', newThings: 'New on your farm:',
      unlockCrop: '{name} seeds', unlockChickens: 'Chickens', unlockCows: 'Cows', morePlots: 'More plots', moreChickens: 'More room for chickens', moreCows: 'More room for cows',
      orderDone: 'Order delivered!', newOrder: 'A new order is coming…', hot: 'Hot price!',
      empty: 'The barn is empty — harvest something to sell', bought: 'New: {name}!', gift: 'A neighbor gave you {n} coins!',
      tut1: 'Click an empty plot to plant wheat', tut1t: 'Tap an empty plot to plant wheat',
      tut2: 'Now water the seed — click it!', tut2t: 'Now water the seed — tap it!',
      tut3: 'It is growing! Plant and water more plots meanwhile',
      tut4: 'The wheat is ripe! Click it to harvest', tut4t: 'The wheat is ripe! Tap it to harvest',
      tut5: 'You have enough — press "Deliver" to fill the order',
      tut6: 'Great! Sell extras at the market and buy new things in the shop',
      readyIn: 'Ready in {t}', ready: 'Ready!', wants: 'Hungry — wants {item}', needsWater: 'Needs water',
    },
    ar: {
      title: 'المزرعة',
      tagNew: 'ازرع واسقِ واحصد — وابنِ أجمل مزرعة!', tagSaved: 'مزرعتك: المستوى {lv} · {c} عملة',
      help: ['انقر على قطعة أرض فارغة لتزرع، ثم انقر عليها مجدداً لتسقيها', 'انقر على المحصول الناضج لتحصده — أو اسحب فوق عدة قطع معاً', 'لبِّ الطلبات على اللوحة لتحصل على عملات وخبرة، أو بِع في السوق', 'اشترِ أراضي وبذوراً جديدة ودجاجاً وأبقاراً. مزرعتك تُحفظ تلقائياً'],
      helpTouch: ['المس قطعة أرض فارغة لتزرع، ثم المسها مجدداً لتسقيها', 'المس المحصول الناضج لتحصده — أو مرّر إصبعك فوق عدة قطع', 'لبِّ الطلبات على اللوحة لتحصل على عملات وخبرة، أو بِع في السوق', 'اشترِ أراضي وبذوراً جديدة ودجاجاً وأبقاراً. مزرعتك تُحفظ تلقائياً'],
      coins: 'العملات', lvl: 'المستوى', xp: 'الخبرة', xpF: '+{n} خبرة',
      wheat: 'قمح', carrot: 'جزر', corn: 'ذرة', tomato: 'طماطم', strawberry: 'فراولة', sunflower: 'دوّار الشمس', pumpkin: 'يقطين', egg: 'بيض', milk: 'حليب',
      chicken: 'دجاجة', cow: 'بقرة', plot: 'قطعة أرض',
      orders: 'الطلبات', market: 'السوق', shop: 'المتجر',
      deliver: 'سلِّم', sell1: 'بِع 1', sellAll: 'بِع الكل', buy: 'اشترِ', cancel: 'إلغاء', cont: 'متابعة',
      tabSeeds: 'بذور', tabFarm: 'المزرعة', tabTools: 'أدوات',
      sprinkler: 'رشّاش ماء', sprinklerD: 'البذور الجديدة تُسقى وحدها',
      feeder: 'مُطعِم آلي', feederD: 'الحيوانات تأكل من المخزن وحدها',
      board: 'لوحة كبيرة', boardD: 'مكان لطلب رابع',
      fert: 'سماد', fertD: 'المحاصيل تنمو أسرع بـ30%',
      plotD: 'أرض إضافية للزراعة', chickenD: 'تأكل القمح وتبيض', cowD: 'تأكل الذرة وتعطي الحليب',
      seedD: 'ينمو في {t} · يُباع بـ{p}',
      lvN: 'المستوى {n}', owned: 'تم الشراء', full: 'ممتلئ',
      noCoins: 'العملات لا تكفي', noFeed: 'تحتاج إلى {item} لإطعامها', missing: 'ما زال ينقصك شيء لهذا الطلب', opensAt: 'يُفتح في المستوى {n}',
      welcome: 'أهلاً بعودتك! مزرعتك استمرت في النمو',
      levelUp: 'المستوى {n}!', newThings: 'جديد في مزرعتك:',
      unlockCrop: 'بذور {name}', unlockChickens: 'دجاج', unlockCows: 'أبقار', morePlots: 'قطع أرض إضافية', moreChickens: 'مكان إضافي للدجاج', moreCows: 'مكان إضافي للأبقار',
      orderDone: 'تم تسليم الطلب!', newOrder: 'طلب جديد في الطريق…', hot: 'سعر مميز!',
      empty: 'المخزن فارغ — احصد شيئاً لتبيعه', bought: 'جديد: {name}!', gift: 'جارك أعطاك {n} عملات!',
      tut1: 'انقر على قطعة أرض فارغة لتزرع القمح', tut1t: 'المس قطعة أرض فارغة لتزرع القمح',
      tut2: 'الآن اسقِ البذرة — انقر عليها!', tut2t: 'الآن اسقِ البذرة — المسها!',
      tut3: 'إنه ينمو! ازرع واسقِ قطعاً أخرى في هذه الأثناء',
      tut4: 'القمح ناضج! انقر عليه لتحصده', tut4t: 'القمح ناضج! المسه لتحصده',
      tut5: 'لديك ما يكفي — اضغط «سلِّم» لتلبية الطلب',
      tut6: 'رائع! بِع الفائض في السوق واشترِ أشياء جديدة من المتجر',
      readyIn: 'جاهز بعد {t}', ready: 'جاهز!', wants: 'جائعة — تريد {item}', needsWater: 'يحتاج إلى ماء',
    },
    es: {
      title: 'La Granja',
      tagNew: 'Planta, riega, cosecha… ¡y crea la granja más acogedora!', tagSaved: 'Tu granja: nivel {lv} · {c} monedas',
      help: ['Haz clic en una parcela vacía para plantar y otra vez para regar', 'Haz clic en los cultivos maduros para cosechar, o arrastra sobre varias parcelas', 'Completa pedidos del tablero para ganar monedas y XP, o vende en el mercado', 'Compra parcelas, semillas nuevas, gallinas y vacas. Tu granja se guarda sola'],
      helpTouch: ['Toca una parcela vacía para plantar y otra vez para regar', 'Toca los cultivos maduros para cosechar, o desliza sobre varias parcelas', 'Completa pedidos del tablero para ganar monedas y XP, o vende en el mercado', 'Compra parcelas, semillas nuevas, gallinas y vacas. Tu granja se guarda sola'],
      coins: 'Monedas', lvl: 'Nivel', xp: 'XP', xpF: '+{n} XP',
      wheat: 'Trigo', carrot: 'Zanahoria', corn: 'Maíz', tomato: 'Tomate', strawberry: 'Fresa', sunflower: 'Girasol', pumpkin: 'Calabaza', egg: 'Huevo', milk: 'Leche',
      chicken: 'Gallina', cow: 'Vaca', plot: 'Parcela',
      orders: 'Pedidos', market: 'Mercado', shop: 'Tienda',
      deliver: 'Entregar', sell1: 'Vender 1', sellAll: 'Vender todo', buy: 'Comprar', cancel: 'Cancelar', cont: 'Continuar',
      tabSeeds: 'Semillas', tabFarm: 'Granja', tabTools: 'Herramientas',
      sprinkler: 'Aspersor', sprinklerD: 'Las semillas nuevas se riegan solas',
      feeder: 'Comedero automático', feederD: 'Los animales comen solos del granero',
      board: 'Tablero grande', boardD: 'Espacio para un 4.º pedido',
      fert: 'Abono', fertD: 'Los cultivos crecen un 30% más rápido',
      plotD: 'Más tierra para plantar', chickenD: 'Come trigo y pone huevos', cowD: 'Come maíz y da leche',
      seedD: 'Crece en {t} · se vende a {p}',
      lvN: 'Nivel {n}', owned: 'Comprado', full: 'Completo',
      noCoins: 'No tienes monedas suficientes', noFeed: 'Necesitas {item} para alimentarla', missing: 'Aún te falta algo para este pedido', opensAt: 'Se desbloquea en el nivel {n}',
      welcome: '¡Bienvenido de nuevo! Tu granja siguió creciendo',
      levelUp: '¡Nivel {n}!', newThings: 'Novedades en tu granja:',
      unlockCrop: 'Semillas de {name}', unlockChickens: 'Gallinas', unlockCows: 'Vacas', morePlots: 'Más parcelas', moreChickens: 'Más lugar para gallinas', moreCows: 'Más lugar para vacas',
      orderDone: '¡Pedido entregado!', newOrder: 'Viene un pedido nuevo…', hot: '¡Precio caliente!',
      empty: 'El granero está vacío: cosecha algo para vender', bought: '¡Nuevo: {name}!', gift: '¡Un vecino te regaló {n} monedas!',
      tut1: 'Haz clic en una parcela vacía para plantar trigo', tut1t: 'Toca una parcela vacía para plantar trigo',
      tut2: 'Ahora riega la semilla: ¡haz clic en ella!', tut2t: 'Ahora riega la semilla: ¡tócala!',
      tut3: '¡Está creciendo! Mientras tanto, planta y riega más parcelas',
      tut4: '¡El trigo está maduro! Haz clic para cosechar', tut4t: '¡El trigo está maduro! Tócalo para cosechar',
      tut5: 'Ya tienes suficiente: pulsa «Entregar» para completar el pedido',
      tut6: '¡Genial! Vende lo que sobra en el mercado y compra cosas nuevas en la tienda',
      readyIn: 'Listo en {t}', ready: '¡Listo!', wants: 'Tiene hambre: quiere {item}', needsWater: 'Necesita agua',
    },
    fr: {
      title: 'La Ferme',
      tagNew: 'Plante, arrose, récolte… et fais grandir la ferme la plus douillette !', tagSaved: 'Ta ferme : niveau {lv} · {c} pièces',
      help: ['Clique sur une parcelle vide pour planter, puis encore pour arroser', 'Clique sur les cultures mûres pour récolter, ou glisse sur plusieurs parcelles', 'Remplis les commandes du tableau pour des pièces et de l’XP, ou vends au marché', 'Achète des parcelles, des graines, des poules et des vaches. Ta ferme se sauvegarde seule'],
      helpTouch: ['Touche une parcelle vide pour planter, puis encore pour arroser', 'Touche les cultures mûres pour récolter, ou glisse le doigt sur plusieurs parcelles', 'Remplis les commandes du tableau pour des pièces et de l’XP, ou vends au marché', 'Achète des parcelles, des graines, des poules et des vaches. Ta ferme se sauvegarde seule'],
      coins: 'Pièces', lvl: 'Niveau', xp: 'XP', xpF: '+{n} XP',
      wheat: 'Blé', carrot: 'Carotte', corn: 'Maïs', tomato: 'Tomate', strawberry: 'Fraise', sunflower: 'Tournesol', pumpkin: 'Citrouille', egg: 'Œuf', milk: 'Lait',
      chicken: 'Poule', cow: 'Vache', plot: 'Parcelle',
      orders: 'Commandes', market: 'Marché', shop: 'Boutique',
      deliver: 'Livrer', sell1: 'Vendre 1', sellAll: 'Tout vendre', buy: 'Acheter', cancel: 'Annuler', cont: 'Continuer',
      tabSeeds: 'Graines', tabFarm: 'Ferme', tabTools: 'Outils',
      sprinkler: 'Arroseur', sprinklerD: 'Les nouvelles graines s’arrosent seules',
      feeder: 'Mangeoire auto', feederD: 'Les animaux mangent seuls dans la grange',
      board: 'Grand tableau', boardD: 'Place pour une 4e commande',
      fert: 'Engrais', fertD: 'Les cultures poussent 30 % plus vite',
      plotD: 'Plus de terre à cultiver', chickenD: 'Mange du blé et pond des œufs', cowD: 'Mange du maïs et donne du lait',
      seedD: 'Pousse en {t} · se vend {p}',
      lvN: 'Niveau {n}', owned: 'Acheté', full: 'Complet',
      noCoins: 'Pas assez de pièces', noFeed: 'Il te faut du {item} pour la nourrir', missing: 'Il te manque encore des produits', opensAt: 'Débloqué au niveau {n}',
      welcome: 'Bon retour ! Ta ferme a continué de pousser',
      levelUp: 'Niveau {n} !', newThings: 'Nouveau dans ta ferme :',
      unlockCrop: 'Graines de {name}', unlockChickens: 'Poules', unlockCows: 'Vaches', morePlots: 'Plus de parcelles', moreChickens: 'Plus de place pour les poules', moreCows: 'Plus de place pour les vaches',
      orderDone: 'Commande livrée !', newOrder: 'Une nouvelle commande arrive…', hot: 'Prix en hausse !',
      empty: 'La grange est vide — récolte quelque chose à vendre', bought: 'Nouveau : {name} !', gift: 'Un voisin t’a donné {n} pièces !',
      tut1: 'Clique sur une parcelle vide pour planter du blé', tut1t: 'Touche une parcelle vide pour planter du blé',
      tut2: 'Maintenant, arrose la graine — clique dessus !', tut2t: 'Maintenant, arrose la graine — touche-la !',
      tut3: 'Ça pousse ! En attendant, plante et arrose d’autres parcelles',
      tut4: 'Le blé est mûr ! Clique dessus pour récolter', tut4t: 'Le blé est mûr ! Touche-le pour récolter',
      tut5: 'Tu en as assez — appuie sur « Livrer » pour remplir la commande',
      tut6: 'Super ! Vends le surplus au marché et achète des nouveautés à la boutique',
      readyIn: 'Prêt dans {t}', ready: 'Prêt !', wants: 'Elle a faim — elle veut du {item}', needsWater: 'Besoin d’eau',
    },
    pt: {
      title: 'A Fazenda',
      tagNew: 'Plante, regue, colha — e crie a fazenda mais aconchegante!', tagSaved: 'Sua fazenda: nível {lv} · {c} moedas',
      help: ['Clique num canteiro vazio para plantar e de novo para regar', 'Clique nas plantas maduras para colher, ou arraste sobre vários canteiros', 'Complete pedidos do quadro para ganhar moedas e XP, ou venda na feira', 'Compre canteiros, sementes novas, galinhas e vacas. A fazenda se salva sozinha'],
      helpTouch: ['Toque num canteiro vazio para plantar e de novo para regar', 'Toque nas plantas maduras para colher, ou deslize sobre vários canteiros', 'Complete pedidos do quadro para ganhar moedas e XP, ou venda na feira', 'Compre canteiros, sementes novas, galinhas e vacas. A fazenda se salva sozinha'],
      coins: 'Moedas', lvl: 'Nível', xp: 'XP', xpF: '+{n} XP',
      wheat: 'Trigo', carrot: 'Cenoura', corn: 'Milho', tomato: 'Tomate', strawberry: 'Morango', sunflower: 'Girassol', pumpkin: 'Abóbora', egg: 'Ovo', milk: 'Leite',
      chicken: 'Galinha', cow: 'Vaca', plot: 'Canteiro',
      orders: 'Pedidos', market: 'Feira', shop: 'Loja',
      deliver: 'Entregar', sell1: 'Vender 1', sellAll: 'Vender tudo', buy: 'Comprar', cancel: 'Cancelar', cont: 'Continuar',
      tabSeeds: 'Sementes', tabFarm: 'Fazenda', tabTools: 'Ferramentas',
      sprinkler: 'Irrigador', sprinklerD: 'Sementes novas se regam sozinhas',
      feeder: 'Comedouro automático', feederD: 'Os animais comem sozinhos do celeiro',
      board: 'Quadro grande', boardD: 'Espaço para um 4º pedido',
      fert: 'Adubo', fertD: 'As plantas crescem 30% mais rápido',
      plotD: 'Mais terra para plantar', chickenD: 'Come trigo e bota ovos', cowD: 'Come milho e dá leite',
      seedD: 'Cresce em {t} · vende por {p}',
      lvN: 'Nível {n}', owned: 'Comprado', full: 'Cheio',
      noCoins: 'Moedas insuficientes', noFeed: 'Você precisa de {item} para alimentá-la', missing: 'Ainda falta algo para este pedido', opensAt: 'Libera no nível {n}',
      welcome: 'Bem-vindo de volta! A fazenda continuou crescendo',
      levelUp: 'Nível {n}!', newThings: 'Novidades na fazenda:',
      unlockCrop: 'Sementes de {name}', unlockChickens: 'Galinhas', unlockCows: 'Vacas', morePlots: 'Mais canteiros', moreChickens: 'Mais lugar para galinhas', moreCows: 'Mais lugar para vacas',
      orderDone: 'Pedido entregue!', newOrder: 'Um pedido novo está chegando…', hot: 'Preço em alta!',
      empty: 'O celeiro está vazio — colha algo para vender', bought: 'Novo: {name}!', gift: 'Um vizinho te deu {n} moedas!',
      tut1: 'Clique num canteiro vazio para plantar trigo', tut1t: 'Toque num canteiro vazio para plantar trigo',
      tut2: 'Agora regue a semente — clique nela!', tut2t: 'Agora regue a semente — toque nela!',
      tut3: 'Está crescendo! Enquanto isso, plante e regue mais canteiros',
      tut4: 'O trigo está maduro! Clique para colher', tut4t: 'O trigo está maduro! Toque para colher',
      tut5: 'Você já tem o suficiente — aperte "Entregar" para completar o pedido',
      tut6: 'Ótimo! Venda o que sobrar na feira e compre novidades na loja',
      readyIn: 'Pronto em {t}', ready: 'Pronto!', wants: 'Com fome — quer {item}', needsWater: 'Precisa de água',
    },
    ru: {
      title: 'Ферма',
      tagNew: 'Сажай, поливай, собирай урожай — и расти самую уютную ферму!', tagSaved: 'Твоя ферма: уровень {lv} · монеты: {c}',
      help: ['Нажми на пустую грядку, чтобы посадить, и ещё раз, чтобы полить', 'Нажимай на спелый урожай, чтобы собрать, или проведи по нескольким грядкам', 'Выполняй заказы на доске ради монет и опыта или продавай на рынке', 'Покупай грядки, новые семена, кур и коров. Ферма сохраняется сама'],
      helpTouch: ['Коснись пустой грядки, чтобы посадить, и ещё раз, чтобы полить', 'Касайся спелого урожая, чтобы собрать, или проведи пальцем по грядкам', 'Выполняй заказы на доске ради монет и опыта или продавай на рынке', 'Покупай грядки, новые семена, кур и коров. Ферма сохраняется сама'],
      coins: 'Монеты', lvl: 'Уровень', xp: 'Опыт', xpF: '+{n} опыта',
      wheat: 'Пшеница', carrot: 'Морковь', corn: 'Кукуруза', tomato: 'Помидор', strawberry: 'Клубника', sunflower: 'Подсолнух', pumpkin: 'Тыква', egg: 'Яйцо', milk: 'Молоко',
      chicken: 'Курица', cow: 'Корова', plot: 'Грядка',
      orders: 'Заказы', market: 'Рынок', shop: 'Магазин',
      deliver: 'Отдать', sell1: 'Продать 1', sellAll: 'Продать всё', buy: 'Купить', cancel: 'Отмена', cont: 'Дальше',
      tabSeeds: 'Семена', tabFarm: 'Ферма', tabTools: 'Инструменты',
      sprinkler: 'Дождеватель', sprinklerD: 'Новые семена поливаются сами',
      feeder: 'Автокормушка', feederD: 'Животные сами едят из амбара',
      board: 'Большая доска', boardD: 'Место для 4-го заказа',
      fert: 'Удобрение', fertD: 'Урожай растёт на 30% быстрее',
      plotD: 'Больше земли для посадки', chickenD: 'Ест пшеницу и несёт яйца', cowD: 'Ест кукурузу и даёт молоко',
      seedD: 'Растёт {t} · цена {p}',
      lvN: 'Уровень {n}', owned: 'Куплено', full: 'Всё занято',
      noCoins: 'Не хватает монет', noFeed: 'Нужен корм: {item}', missing: 'Для заказа ещё не хватает', opensAt: 'Откроется на уровне {n}',
      welcome: 'С возвращением! Ферма продолжала расти',
      levelUp: 'Уровень {n}!', newThings: 'Новое на ферме:',
      unlockCrop: 'Семена: {name}', unlockChickens: 'Куры', unlockCows: 'Коровы', morePlots: 'Больше грядок', moreChickens: 'Больше места для кур', moreCows: 'Больше места для коров',
      orderDone: 'Заказ выполнен!', newOrder: 'Новый заказ уже в пути…', hot: 'Высокая цена!',
      empty: 'Амбар пуст — собери урожай, чтобы продать', bought: 'Новое: {name}!', gift: 'Сосед подарил тебе монеты: {n}!',
      tut1: 'Нажми на пустую грядку, чтобы посадить пшеницу', tut1t: 'Коснись пустой грядки, чтобы посадить пшеницу',
      tut2: 'Теперь полей семя — нажми на него!', tut2t: 'Теперь полей семя — коснись его!',
      tut3: 'Растёт! А пока посади и полей ещё грядки',
      tut4: 'Пшеница созрела! Нажми, чтобы собрать', tut4t: 'Пшеница созрела! Коснись, чтобы собрать',
      tut5: 'Хватает — нажми «Отдать», чтобы выполнить заказ',
      tut6: 'Отлично! Продавай лишнее на рынке и покупай новое в магазине',
      readyIn: 'Готово через {t}', ready: 'Готово!', wants: 'Голодна — хочет: {item}', needsWater: 'Нужна вода',
    },
    de: {
      title: 'Der Bauernhof',
      tagNew: 'Pflanzen, gießen, ernten — und den gemütlichsten Hof aufbauen!', tagSaved: 'Dein Hof: Level {lv} · {c} Münzen',
      help: ['Klicke auf ein leeres Beet zum Pflanzen und nochmal zum Gießen', 'Klicke reife Pflanzen zum Ernten an – oder ziehe über mehrere Beete', 'Erfülle Aufträge an der Tafel für Münzen und XP oder verkaufe auf dem Markt', 'Kaufe Beete, neue Samen, Hühner und Kühe. Dein Hof speichert sich selbst'],
      helpTouch: ['Tippe auf ein leeres Beet zum Pflanzen und nochmal zum Gießen', 'Tippe reife Pflanzen zum Ernten an – oder wische über mehrere Beete', 'Erfülle Aufträge an der Tafel für Münzen und XP oder verkaufe auf dem Markt', 'Kaufe Beete, neue Samen, Hühner und Kühe. Dein Hof speichert sich selbst'],
      coins: 'Münzen', lvl: 'Level', xp: 'XP', xpF: '+{n} XP',
      wheat: 'Weizen', carrot: 'Karotte', corn: 'Mais', tomato: 'Tomate', strawberry: 'Erdbeere', sunflower: 'Sonnenblume', pumpkin: 'Kürbis', egg: 'Ei', milk: 'Milch',
      chicken: 'Huhn', cow: 'Kuh', plot: 'Beet',
      orders: 'Aufträge', market: 'Markt', shop: 'Laden',
      deliver: 'Liefern', sell1: '1 verkaufen', sellAll: 'Alle verkaufen', buy: 'Kaufen', cancel: 'Abbrechen', cont: 'Weiter',
      tabSeeds: 'Samen', tabFarm: 'Hof', tabTools: 'Werkzeug',
      sprinkler: 'Sprinkler', sprinklerD: 'Neue Samen gießen sich selbst',
      feeder: 'Futterautomat', feederD: 'Die Tiere fressen selbst aus der Scheune',
      board: 'Große Tafel', boardD: 'Platz für einen 4. Auftrag',
      fert: 'Dünger', fertD: 'Pflanzen wachsen 30 % schneller',
      plotD: 'Mehr Land zum Pflanzen', chickenD: 'Frisst Weizen und legt Eier', cowD: 'Frisst Mais und gibt Milch',
      seedD: 'Wächst in {t} · bringt {p}',
      lvN: 'Level {n}', owned: 'Gekauft', full: 'Voll',
      noCoins: 'Nicht genug Münzen', noFeed: 'Du brauchst {item} zum Füttern', missing: 'Dir fehlt noch etwas für den Auftrag', opensAt: 'Ab Level {n}',
      welcome: 'Willkommen zurück! Dein Hof ist weitergewachsen',
      levelUp: 'Level {n}!', newThings: 'Neu auf deinem Hof:',
      unlockCrop: 'Samen: {name}', unlockChickens: 'Hühner', unlockCows: 'Kühe', morePlots: 'Mehr Beete', moreChickens: 'Mehr Platz für Hühner', moreCows: 'Mehr Platz für Kühe',
      orderDone: 'Auftrag geliefert!', newOrder: 'Ein neuer Auftrag kommt…', hot: 'Heißer Preis!',
      empty: 'Die Scheune ist leer – ernte etwas zum Verkaufen', bought: 'Neu: {name}!', gift: 'Ein Nachbar schenkt dir {n} Münzen!',
      tut1: 'Klicke auf ein leeres Beet, um Weizen zu pflanzen', tut1t: 'Tippe auf ein leeres Beet, um Weizen zu pflanzen',
      tut2: 'Jetzt gieß den Samen – klicke darauf!', tut2t: 'Jetzt gieß den Samen – tippe darauf!',
      tut3: 'Er wächst! Pflanze und gieße inzwischen weitere Beete',
      tut4: 'Der Weizen ist reif! Klicke zum Ernten', tut4t: 'Der Weizen ist reif! Tippe zum Ernten',
      tut5: 'Du hast genug – drück „Liefern“, um den Auftrag zu erfüllen',
      tut6: 'Super! Verkaufe Überschuss auf dem Markt und kaufe Neues im Laden',
      readyIn: 'Fertig in {t}', ready: 'Fertig!', wants: 'Hungrig – will {item}', needsWater: 'Braucht Wasser',
    },
  };
  // השורה שמתחת לכותרת בתפריט: חווה חדשה או החווה השמורה
  let SUM = null;
  for (const L of Object.keys(TXT)) {
    Object.defineProperty(TXT[L], 'tagline', {
      enumerable: true,
      get() { return SUM ? this.tagSaved.replace('{lv}', SUM.lv).replace('{c}', SUM.c) : this.tagNew; },
    });
  }
  const tm = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const nameIn = (g, id) => { const n = g.t(id); return LOWER[g.lang] ? n.toLowerCase() : n; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- החווה (נשמרת) ----------
  function mkOrder(it, c, x) { return { it, c, x }; }
  function freshFarm() {
    const plots = [];
    for (let i = 0; i < NPLOTS; i++) plots.push(START.includes(i) ? { s: 1 } : { s: 0 });
    return {
      v: 1, t: Date.now(), coins: 30, xp: 0, lv: 1,
      plots, crops: ['wheat'], sel: 'wheat', chickens: [], cows: [], inv: {},
      orders: [mkOrder([['wheat', 3]], 30, 10), mkOrder([['wheat', 2]], 20, 7), { w: 25 }],
      up: {}, hot: null, hotT: 90, tut: 1, st: { h: 0, d: 0, e: 0 },
    };
  }
  // חווה יפה לרקע של התפריט כשעוד אין חווה שמורה
  function showcaseFarm() {
    const F = freshFarm();
    F.lv = 9; F.coins = 640; F.crops = CROPS.map(c => c.id); F.tut = 0;
    const crops = ['wheat', 'carrot', 'corn', 'tomato', 'strawberry', 'sunflower', 'pumpkin', 'wheat', 'carrot', 'tomato', 'corn', 'strawberry', 'sunflower', 'wheat', 'pumpkin', 'carrot'];
    F.plots = crops.map((c, i) => { const T = CROP[c].t; const f = [1, 0.7, 1, 0.45, 1, 1, 0.8, 0.2, 1, 1, 0.6, 1, 0.3, 1, 1, 0][i]; return i === 15 ? { s: 1 } : { s: 2, c, w: f > 0 ? 1 : 0, g: T * f }; });
    F.chickens = [{ s: 2, g: 0 }, { s: 1, g: 10 }, { s: 0, g: 0 }, { s: 2, g: 0 }];
    F.cows = [{ s: 2, g: 0 }, { s: 1, g: 30 }];
    F.orders = [mkOrder([['carrot', 3], ['egg', 2]], 95, 20), mkOrder([['milk', 1], ['corn', 2]], 110, 22), mkOrder([['pumpkin', 1]], 100, 18)];
    F.inv = { carrot: 2, egg: 2, corn: 3, wheat: 5 };
    return F;
  }
  function loadFarm(g) {
    const d = g.load('farm', null);
    if (!d || d.v !== 1 || !Array.isArray(d.plots) || d.plots.length !== NPLOTS) return null;
    const F = freshFarm();
    F.t = +d.t || Date.now();
    F.coins = Math.max(0, Math.floor(+d.coins || 0)); F.xp = Math.max(0, +d.xp || 0); F.lv = Math.max(1, Math.floor(+d.lv || 1));
    F.plots = d.plots.map(p => {
      if (!p || ![0, 1, 2].includes(p.s)) return { s: 1 };
      if (p.s === 2) return CROP[p.c] ? { s: 2, c: p.c, w: p.w ? 1 : 0, g: Math.max(0, +p.g || 0) } : { s: 1 };
      return { s: p.s };
    });
    F.crops = Array.isArray(d.crops) ? d.crops.filter(c => CROP[c]) : ['wheat'];
    if (!F.crops.includes('wheat')) F.crops.unshift('wheat');
    F.sel = CROP[d.sel] && F.crops.includes(d.sel) ? d.sel : 'wheat';
    const an = a => (Array.isArray(a) ? a.filter(x => x && [0, 1, 2].includes(x.s)).map(x => ({ s: x.s, g: Math.max(0, +x.g || 0) })) : []);
    F.chickens = an(d.chickens).slice(0, ANIM.chicken.lv.length); F.cows = an(d.cows).slice(0, ANIM.cow.lv.length);
    F.inv = {};
    if (d.inv) for (const id of ITEMS) if (d.inv[id] > 0) F.inv[id] = Math.floor(d.inv[id]);
    F.up = {};
    if (d.up) for (const u of UPS) if (d.up[u.id]) F.up[u.id] = 1;
    const slots = 3 + (F.up.board ? 1 : 0);
    F.orders = (Array.isArray(d.orders) ? d.orders : []).slice(0, slots).map(o => (o && Array.isArray(o.it) && o.it.length && o.it.every(([id, n]) => (CROP[id] || PROD[id]) && n > 0) ? mkOrder(o.it.map(([id, n]) => [id, Math.floor(n)]), Math.floor(+o.c || 10), Math.floor(+o.x || 5)) : { w: Math.max(0, +(o && o.w) || 5) }));
    while (F.orders.length < slots) F.orders.push({ w: 5 });
    F.hot = ITEMS.includes(d.hot) ? d.hot : null; F.hotT = +d.hotT || 90;
    F.tut = [0, 1, 2, 3, 4, 5, 6].includes(d.tut) ? d.tut : 0;
    F.st = Object.assign({ h: 0, d: 0, e: 0 }, d.st || {});
    return F;
  }
  function saveFarm(g) {
    const S = g.s;
    if (!S || S.demo) return;
    S.F.t = Date.now();
    g.save('farm', S.F);
    SUM = { lv: S.F.lv, c: S.F.coins };
    S.dirty = false; S.saveT = 8;
  }
  // הזמן שעבר מאז הפעם הקודמת: היבול המושקה והחיות ממשיכים
  function advance(F, secs) {
    let n = 0;
    for (const P of F.plots) if (P.s === 2 && P.w) { const T = growT(F, P.c); if (P.g < T) { P.g = Math.min(T, P.g + secs); if (P.g >= T) n++; } }
    for (const k of ['chicken', 'cow']) for (const a of F[k + 's']) if (a.s === 1) { a.g += secs; if (a.g >= ANIM[k].t) { a.s = 2; a.g = 0; n++; } }
    for (const o of F.orders) if (o.w != null) o.w = Math.max(0.5, o.w - secs);
    F.hotT -= secs;
    return n;
  }

  // ---------- כמה דברים עולים ומתי הם נפתחים ----------
  const plotsOwned = F => F.plots.filter(p => p.s > 0).length;
  const nextPlot = F => { const k = plotsOwned(F) - START.length; return k < PLOT_COST.length ? { lv: PLOT_LV[k], cost: PLOT_COST[k] } : null; };
  const nextAnimal = (F, kind) => { const k = F[kind + 's'].length, A = ANIM[kind]; return k < A.cost.length ? { lv: A.lv[k], cost: A.cost[k] } : null; };
  const known = (F, id) => (CROP[id] ? F.crops.includes(id) : id === 'egg' ? F.chickens.length > 0 : F.cows.length > 0);
  const have = (F, id) => F.inv[id] || 0;
  const canDeliver = (F, k) => { const o = F.orders[k]; return !!(o && o.it && o.it.every(([id, n]) => have(F, id) >= n)); };
  const slotsOf = F => 3 + (F.up.board ? 1 : 0);
  const hotMul = (F, id) => (F.hot === id ? 1.5 : 1);
  const sellPrice = (F, id) => Math.round(priceOf(id) * hotMul(F, id));

  // ---------- הזמנות ----------
  function availItems(F) {
    const a = F.crops.slice();
    if (F.chickens.length) a.push('egg');
    if (F.cows.length) a.push('milk');
    return a;
  }
  function genOrder(F) {
    const av = availItems(F);
    let nT = 1;
    if (F.lv >= 3 && av.length >= 2) nT = Math.random() < 0.55 ? 1 : 2;
    if (F.lv >= 6 && av.length >= 3) nT = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : 3;
    // דברים חדשים מופיעים יותר, ולא את אותו דבר כמו בהזמנות האחרות
    const used = new Set();
    for (const o of F.orders) if (o.it) for (const [id] of o.it) used.add(id);
    const pool = av.map((id, i) => ({ id, w: (1 + i * 0.5) * (used.has(id) ? 0.35 : 1) }));
    const pick = [];
    for (let k = 0; k < nT && pool.length; k++) {
      let r = Math.random() * pool.reduce((s, p) => s + p.w, 0), j = 0;
      while (j < pool.length - 1 && (r -= pool[j].w) > 0) j++;
      pick.push(pool[j].id); pool.splice(j, 1);
    }
    const it = pick.map(id => {
      const base = Math.max(1, Math.round(50 / timeOf(id)));
      return [id, Math.min(8, base + Math.floor(Math.random() * (2 + Math.min(3, F.lv / 4))))];
    });
    const val = it.reduce((s, [id, n]) => s + priceOf(id) * n, 0);
    const xp = it.reduce((s, [id, n]) => s + xpOf(id) * n, 0);
    return mkOrder(it, Math.max(10, Math.round(val * (1.45 + Math.random() * 0.25) / 5) * 5), Math.round(xp * 1.6 + 4 + F.lv));
  }

  // ---------- פריסה: לרוחב (מחשב) או לאורך (טלפון) ----------
  const rect = (x, y, w, h) => ({ x, y, w, h });
  function grid(R, cols, rows, gap) {
    const out = [], w = (R.w - gap * (cols - 1)) / cols, h = (R.h - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(rect(R.x + c * (w + gap), R.y + r * (h + gap), w, h));
    return out;
  }
  function layout(W, H) {
    const P = H > W, L = { P, W, H };
    if (!P) {
      L.top = rect(0, 0, W, 56);
      L.field = rect(14, 64, 454, 424);
      L.coop = rect(482, 64, 222, 204);
      L.past = rect(482, 278, 222, 210);
      L.ord = rect(716, 64, 232, 424);
      L.bar = rect(0, 498, W, H - 498);
      L.seeds = rect(12, 506, 512, 86);
      L.mk = rect(536, 506, 200, 86);
      L.sh = rect(748, 506, 200, 86);
      L.panel = rect(84, 22, 792, 556);
    } else {
      L.top = rect(0, 0, W, 62);
      L.field = rect(14, 70, 572, 400);
      L.coop = rect(14, 482, 278, 188);
      L.past = rect(308, 482, 278, 188);
      L.ord = rect(12, 682, 576, 166);
      L.bar = rect(0, 856, W, H - 856);
      L.seeds = rect(12, 864, 576, 72);
      L.mk = rect(12, 942, 282, 52);
      L.sh = rect(306, 942, 282, 52);
      L.panel = rect(16, 70, 568, 860);
    }
    L.plots = grid(L.field, 4, 4, 8);
    L.chick = grid(rect(L.coop.x + 6, L.coop.y + 6, L.coop.w - 12, L.coop.h - 12), 3, 2, 4);
    L.cowc = grid(rect(L.past.x + 6, L.past.y + 6, L.past.w - 12, L.past.h - 12), 2, 2, 4);
    const n = CROPS.length, sw = (L.seeds.w - 6 * (n - 1)) / n;
    L.seedC = CROPS.map((c, i) => rect(L.seeds.x + i * (sw + 6), L.seeds.y, sw, L.seeds.h));
    return L;
  }
  function orderCards(L, n) {
    const O = L.ord, head = L.P ? 30 : 36, out = [];
    if (!L.P) { const h = (O.h - head - 8 - 8 * (n - 1)) / n; for (let i = 0; i < n; i++) out.push(rect(O.x + 8, O.y + head + i * (h + 8), O.w - 16, h)); }
    else { const w = (O.w - 16 - 8 * (n - 1)) / n; for (let i = 0; i < n; i++) out.push(rect(O.x + 8 + i * (w + 8), O.y + head, w, O.h - head - 8)); }
    return out;
  }
  // כפתורי כרטיס הזמנה: "מסור" והפח הקטן
  function orderBtns(g, R) {
    const wide = R.w > 200;
    const del = wide ? rect(g.rtl ? R.x + 8 : R.x + R.w - 8 - 96, R.y + R.h - 38, 96, 32) : rect(R.x + 8, R.y + R.h - 36, R.w - 16, 30);
    const x = rect(g.rtl ? R.x + R.w - 28 : R.x + 4, R.y + 4, 24, 24);
    return { del, x };
  }

  // ---------- פעולות (גם העכבר וגם הבוט עוברים כאן) ----------
  function err(g, key, vars) { const S = g.s; if (S.anim - (S.errT || -9) < 0.6) return; S.errT = S.anim; g.sfx('error'); g.msg(g.t(key, vars), 1100, '#ffb3a8'); }
  function addXp(g, n, x, y) {
    const S = g.s, F = S.F;
    F.xp += n;
    if (x != null) g.float(x, y, g.t('xpF', { n }), { color: '#8ff0d2', size: 19, life: 50 });
    while (F.xp >= xpNeed(F.lv)) {
      F.xp -= xpNeed(F.lv); F.lv++;
      F.coins += lvReward(F.lv);
      S.lvq.push(F.lv);
    }
    S.dirty = true;
  }
  function center(R) { return [R.x + R.w / 2, R.y + R.h / 2]; }
  function fly(g, id, x, y) {
    const S = g.s;
    if (S.fly.length > 40) S.fly.shift();
    const [tx, ty] = center(S.L.mk);
    S.fly.push({ id, x0: x, y0: y, x1: tx, y1: ty - 10, t: 0, dur: 0.55 + Math.random() * 0.15 });
  }
  const act = {
    select(g, id) {
      const S = g.s, F = S.F;
      if (!CROP[id]) return false;
      if (!F.crops.includes(id)) {
        if (F.lv < CROP[id].lv) { err(g, 'opensAt', { n: CROP[id].lv }); return false; }
        act.ask(g, { kind: 'crop', arg: id });
        return false;
      }
      if (F.sel !== id) { F.sel = id; S.dirty = true; S.pop['seed' + id] = S.anim; g.sfx('click', { p: 1.2 }); }
      return true;
    },
    plant(g, i) {
      const S = g.s, F = S.F, P = F.plots[i], c = CROP[F.sel];
      if (!P || P.s !== 1) return false;
      if (F.coins < c.seed) { err(g, 'noCoins'); return false; }
      F.coins -= c.seed;
      F.plots[i] = { s: 2, c: c.id, w: F.up.sprinkler ? 1 : 0, g: 0 };
      const [x, y] = center(S.L.plots[i]);
      g.burst(x, y + 10, { n: 10, color: ['#8a5a30', '#c49a6c', '#5a3a1a'], speed: 1.8, life: 22, gravity: 0.1 });
      if (F.up.sprinkler) g.burst(x, y, { n: 12, color: ['#7cc7ff', '#d6f0ff'], speed: 2.4, life: 26, gravity: 0.12, dir: -Math.PI / 2, spread: 2.4 });
      g.sfx('place', { p: 1.15 });
      S.pop['p' + i] = S.anim; S.dirty = true;
      if (F.tut === 1) F.tut = 2;
      return true;
    },
    water(g, i) {
      const S = g.s, F = S.F, P = F.plots[i];
      if (!P || P.s !== 2 || P.w) return false;
      P.w = 1;
      const R = S.L.plots[i], [x, y] = center(R);
      g.burst(x, y - 6, { n: 16, color: ['#5fb8ff', '#bfe6ff', '#ffffff'], speed: 2.6, life: 28, gravity: 0.14, dir: -Math.PI / 2, spread: 2.2 });
      S.can.push({ i, t: 0 });
      g.sfx('splash');
      S.pop['p' + i] = S.anim; S.dirty = true;
      return true;
    },
    harvest(g, i) {
      const S = g.s, F = S.F, P = F.plots[i];
      if (!P || P.s !== 2 || P.g < growT(F, P.c)) return false;
      const id = P.c, R = S.L.plots[i], [x, y] = center(R);
      F.plots[i] = { s: 1 };
      F.inv[id] = have(F, id) + 1;
      F.st.h++;
      g.burst(x, y, { n: 14, color: [CROP[id].col, '#7bc44a', '#fff6c8'], speed: 2.8, life: 30 });
      fly(g, id, x, y - 10);
      g.sfx('pop', { p: 0.9 + Math.random() * 0.3 });
      addXp(g, CROP[id].xp, x, y - 26);
      S.pop['p' + i] = S.anim;
      return true;
    },
    // לחיצה על חלקה: הפעולה לפי מה שיש בה
    plotMode(g, i) {
      const F = g.s.F, P = F.plots[i];
      if (!P) return null;
      if (P.s === 0) return 'buy';
      if (P.s === 1) return 'plant';
      if (!P.w) return 'water';
      return P.g >= growT(F, P.c) ? 'harvest' : 'info';
    },
    feed(g, kind, j) {
      const S = g.s, F = S.F, a = F[kind + 's'][j], A = ANIM[kind];
      if (!a || a.s !== 0) return false;
      if (have(F, A.feed) < 1) { err(g, 'noFeed', { item: nameIn(g, A.feed) }); return false; }
      F.inv[A.feed]--;
      a.s = 1; a.g = 0;
      const R = (kind === 'chicken' ? S.L.chick : S.L.cowc)[j], [x, y] = center(R);
      g.burst(x, y, { n: 8, color: [colOf(A.feed), '#fff3c4'], speed: 1.6, life: 22 });
      if (kind === 'chicken') { g.tone({ f: 900, f2: 1300, dur: 0.06, type: 'square', vol: 0.05 }); g.tone({ f: 1100, f2: 800, dur: 0.07, type: 'square', vol: 0.05, delay: 0.08 }); }
      else { g.tone({ f: 190, f2: 120, dur: 0.55, type: 'triangle', vol: 0.2 }); g.tone({ f: 95, f2: 70, dur: 0.5, type: 'sine', vol: 0.12 }); }
      S.pop[kind + j] = S.anim; S.dirty = true;
      return true;
    },
    collect(g, kind, j) {
      const S = g.s, F = S.F, a = F[kind + 's'][j], A = ANIM[kind];
      if (!a || a.s !== 2) return false;
      a.s = 0; a.g = 0;
      F.inv[A.prod] = have(F, A.prod) + 1;
      F.st.h++;
      const R = (kind === 'chicken' ? S.L.chick : S.L.cowc)[j], [x, y] = center(R);
      g.burst(x, y, { n: 12, color: ['#ffffff', '#ffe9a8', colOf(A.prod)], speed: 2.4, life: 26 });
      fly(g, A.prod, x, y);
      g.sfx('pop', { p: 1.3 });
      addXp(g, PROD[A.prod].xp, x, y - 30);
      S.pop[kind + j] = S.anim;
      return true;
    },
    animalMode(g, kind, j) {
      const F = g.s.F, a = F[kind + 's'][j];
      if (!a) return j === F[kind + 's'].length && nextAnimal(F, kind) ? 'buy' : null;
      return a.s === 0 ? 'feed' : a.s === 2 ? 'collect' : 'info';
    },
    deliver(g, k) {
      const S = g.s, F = S.F, o = F.orders[k];
      if (!canDeliver(F, k)) return false;
      for (const [id, n] of o.it) F.inv[id] -= n;
      F.coins += o.c; F.st.d++; F.st.e += o.c;
      const R = orderCards(S.L, F.orders.length)[k], [x, y] = center(R);
      g.burst(x, y, { n: 30, color: ['#ffd84d', '#fff3b0', '#ffae00', '#8ff0d2'], speed: 4, life: 40 });
      g.float(x, y - 18, '+' + o.c, { color: '#ffe066', size: 30, life: 60 });
      g.sfx('coin'); g.after(0.12, () => g.sfx('score'));
      addXp(g, o.x, x, y + 14);
      F.orders[k] = { w: 3 };
      S.pop['o' + k] = S.anim;
      if (F.tut && F.tut < 6) { F.tut = 6; S.tut6T = 7; }
      g.msg(g.t('orderDone'), 900, '#ffe066');
      S.dirty = true;
      return true;
    },
    discard(g, k) {
      const S = g.s, F = S.F, o = F.orders[k];
      if (!o || !o.it) return false;
      F.orders[k] = { w: 12 };
      const R = orderCards(S.L, F.orders.length)[k], [x, y] = center(R);
      g.burst(x, y, { n: 12, color: ['#fff8e7', '#e8dcc0'], speed: 2.4, life: 24, shape: 'square' });
      g.sfx('whoosh');
      S.dirty = true;
      return true;
    },
    sell(g, id, all) {
      const S = g.s, F = S.F, n = all ? have(F, id) : Math.min(1, have(F, id));
      if (n <= 0) return false;
      const v = n * sellPrice(F, id);
      F.inv[id] -= n; F.coins += v; F.st.e += v;
      S.sold = { id, v, t: S.anim };
      g.sfx('coin', { p: all ? 1 : 1.1 });
      S.dirty = true;
      return v;
    },
    // קנייה (מהחנות, מהשלט על חלקה, מכרטיס זרע או ממקום ריק לחיה)
    buy(g, kind, arg) {
      const S = g.s, F = S.F;
      let lv = 1, cost = 0, name = '';
      if (kind === 'crop') { const c = CROP[arg]; if (!c || F.crops.includes(arg)) return false; lv = c.lv; cost = c.cost; name = cap(g.t('unlockCrop', { name: nameIn(g, arg) })); }
      else if (kind === 'plot') { const n = nextPlot(F); if (!n) return false; lv = n.lv; cost = n.cost; name = g.t('plot'); }
      else if (kind === 'chicken' || kind === 'cow') { const n = nextAnimal(F, kind); if (!n) return false; lv = n.lv; cost = n.cost; name = g.t(kind); }
      else if (kind === 'up') { const u = UPS.find(x => x.id === arg); if (!u || F.up[arg]) return false; lv = u.lv; cost = u.cost; name = g.t(arg); }
      else return false;
      if (F.lv < lv) { err(g, 'opensAt', { n: lv }); return false; }
      if (F.coins < cost) { err(g, 'noCoins'); return false; }
      F.coins -= cost;
      let fx = null;
      if (kind === 'crop') { F.crops.push(arg); F.crops.sort((a, b) => CROP[a].lv - CROP[b].lv); F.sel = arg; fx = S.L.seedC[CROPS.indexOf(CROP[arg])]; }
      else if (kind === 'plot') {
        let i = arg != null && F.plots[arg] && F.plots[arg].s === 0 ? arg : F.plots.findIndex(p => p.s === 0);
        if (i < 0) { F.coins += cost; return false; }
        F.plots[i] = { s: 1 }; fx = S.L.plots[i]; S.pop['p' + i] = S.anim;
      } else if (kind === 'chicken' || kind === 'cow') {
        const arr = F[kind + 's']; arr.push({ s: 0, g: 0 });
        fx = (kind === 'chicken' ? S.L.chick : S.L.cowc)[arr.length - 1]; S.pop[kind + (arr.length - 1)] = S.anim;
      } else {
        F.up[arg] = 1;
        if (arg === 'board') F.orders.push({ w: 2 });
        if (arg === 'sprinkler') for (const P of F.plots) if (P.s === 2) P.w = 1;
      }
      if (fx) { const [x, y] = center(fx); g.burst(x, y, { n: 26, color: ['#ffe066', '#ffffff', '#8ff0d2'], speed: 3.4, life: 36 }); }
      g.sfx('power');
      g.msg(g.t('bought', { name }), 1200, '#c6f6a6');
      S.dirty = true;
      return true;
    },
    ask(g, c) { const S = g.s; S.panel = 'confirm'; S.confirm = c; S.panelT = S.anim; g.sfx('click'); },
    open(g, name) { const S = g.s; S.panel = name; S.panelT = S.anim; S.pop[name] = S.anim; g.sfx('click'); g.noise({ f: 500, f2: 2200, dur: 0.16, vol: 0.06, filter: 'bandpass' }); },
    close(g) { const S = g.s; S.panel = null; S.confirm = null; },
    tab(g, k) { const S = g.s; if (S.tab !== k) { S.tab = k; g.sfx('click', { p: 1.15 }); } },
  };
  // מה עולה הדבר שמבקשים לקנות (לחלון האישור)
  function offer(g, c) {
    const F = g.s.F;
    if (c.kind === 'crop') { const k = CROP[c.arg]; return { lv: k.lv, cost: k.cost, name: cap(g.t('unlockCrop', { name: nameIn(g, c.arg) })), desc: g.t('seedD', { t: tm(growT(F, c.arg)), p: k.price }), icon: c.arg }; }
    if (c.kind === 'plot') { const n = nextPlot(F); return n && { lv: n.lv, cost: n.cost, name: g.t('plot'), desc: g.t('plotD'), icon: 'plot' }; }
    if (c.kind === 'chicken' || c.kind === 'cow') { const n = nextAnimal(F, c.kind); return n && { lv: n.lv, cost: n.cost, name: g.t(c.kind), desc: g.t(c.kind + 'D'), icon: c.kind }; }
    const u = UPS.find(x => x.id === c.arg);
    return u && { lv: u.lv, cost: u.cost, name: g.t(u.id), desc: g.t(u.id + 'D'), icon: u.id, owned: !!F.up[u.id] };
  }
  // מה חדש ברמה הזו (לחלון העלייה ברמה)
  function unlocksAt(lv) {
    const out = [];
    for (const c of CROPS) if (c.lv === lv && c.cost) out.push({ icon: c.id, key: 'unlockCrop', name: c.id });
    if (PLOT_LV.includes(lv) && lv > 1) out.push({ icon: 'plot', key: 'morePlots' });
    const ci = ANIM.chicken.lv.indexOf(lv), wi = ANIM.cow.lv.indexOf(lv);
    if (ci === 0) out.push({ icon: 'chicken', key: 'unlockChickens' }); else if (ci > 0) out.push({ icon: 'chicken', key: 'moreChickens' });
    if (wi === 0) out.push({ icon: 'cow', key: 'unlockCows' }); else if (wi > 0) out.push({ icon: 'cow', key: 'moreCows' });
    for (const u of UPS) if (u.lv === lv) out.push({ icon: u.id, key: u.id });
    return out.slice(0, 4);
  }

  // ---------- בוט לבדיקות: משחק כמו ילד זריז, דרך אותן פעולות ----------
  function botStep(g) {
    const S = g.s, F = S.F;
    if (S.demo) return;
    if ((S.botT -= DT) > 0) return;
    S.botT = S.botGap || 0.25;
    if (S.panel) { act.close(g); S.lvShow = null; return; }
    for (let k = 0; k < F.orders.length; k++) if (canDeliver(F, k)) { act.deliver(g, k); return; }
    for (let i = 0; i < NPLOTS; i++) if (act.plotMode(g, i) === 'harvest') { act.harvest(g, i); return; }
    for (const kind of ['chicken', 'cow']) for (let j = 0; j < F[kind + 's'].length; j++) if (F[kind + 's'][j].s === 2) { act.collect(g, kind, j); return; }
    for (let i = 0; i < NPLOTS; i++) if (act.plotMode(g, i) === 'water') { act.water(g, i); return; }
    // מה צריך: הזמנות פתוחות + אוכל לחיות, פחות מה שיש ומה שכבר גדל
    const need = {};
    for (const o of F.orders) if (o.it) for (const [id, n] of o.it) need[id] = (need[id] || 0) + n;
    for (const kind of ['chicken', 'cow']) if (F[kind + 's'].length) { const A = ANIM[kind]; need[A.feed] = (need[A.feed] || 0) + F[kind + 's'].length; need[A.prod] = need[A.prod] || 0; }
    for (const kind of ['chicken', 'cow']) for (let j = 0; j < F[kind + 's'].length; j++) {
      const a = F[kind + 's'][j], A = ANIM[kind];
      if (a.s === 0 && have(F, A.feed) > 0 && (have(F, A.prod) < (need[A.prod] || 0) + 2 || have(F, A.feed) > 3)) { act.feed(g, kind, j); return; }
    }
    const growing = {};
    for (const P of F.plots) if (P.s === 2) growing[P.c] = (growing[P.c] || 0) + 1;
    let want = null, best = 0;
    for (const id of F.crops) { const d = (need[id] || 0) - have(F, id) - (growing[id] || 0); if (d > best) { best = d; want = id; } }
    if (!want) want = F.crops[(S.botPick = ((S.botPick || 0) + 1)) % F.crops.length];
    if (F.coins < CROP[want].seed) want = F.crops.slice().reverse().find(id => CROP[id].seed <= F.coins) || 'wheat';
    const empty = F.plots.findIndex(p => p.s === 1);
    if (empty >= 0 && F.coins >= CROP[want].seed) { if (F.sel !== want) act.select(g, want); act.plant(g, empty); return; }
    // קניות (משאיר קצת כסף לזרעים)
    const res = 20;
    for (const c of CROPS) if (!F.crops.includes(c.id) && F.lv >= c.lv && F.coins >= c.cost + res) { act.buy(g, 'crop', c.id); return; }
    const np = nextPlot(F);
    if (np && F.lv >= np.lv && F.coins >= np.cost + res) { act.buy(g, 'plot'); return; }
    for (const kind of ['chicken', 'cow']) { const n = nextAnimal(F, kind); if (n && F.lv >= n.lv && F.coins >= n.cost + res) { act.buy(g, kind); return; } }
    for (const u of UPS) if (!F.up[u.id] && F.lv >= u.lv && F.coins >= u.cost + res) { act.buy(g, 'up', u.id); return; }
    // מוכר עודפים כשחסר כסף או שהמחסן מתמלא
    const total = ITEMS.reduce((s, id) => s + have(F, id), 0);
    if (F.coins < 40 || total > 30) for (const id of ITEMS) { const extra = have(F, id) - (need[id] || 0) - 1; if (extra > 0) { for (let k = 0; k < extra; k++) act.sell(g, id, false); return; } }
    // הזמנה שתקועה הרבה זמן — מחליף
    for (let k = 0; k < F.orders.length; k++) { const o = F.orders[k]; if (o.it) { o.age = (o.age || 0) + S.botT; if (o.age > 240) { act.discard(g, k); return; } } }
  }

  // ---------- ציור: כלים ----------
  const inR = (p, R) => !!R && p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  function fitSize(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const w = ctx.measureText(String(s)).width;
    return w <= maxW ? size : Math.max(8, Math.floor(size * maxW / w * 10) / 10);
  }
  function wrap(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const words = String(s).split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function txt(U, ctx, s, x, y, size, o) {
    o = o || {};
    const w = o.weight || 800;
    U.text(ctx, s, x, y, Object.assign({}, o, { weight: w, size: o.maxW ? fitSize(ctx, s, size, o.maxW, w) : size }));
  }
  // פסקה: שוברת לשורות ומקטינה עד שנכנסת
  function para(U, ctx, s, x, y, maxW, size, maxLines, o) {
    o = o || {};
    const w = o.weight || 700;
    let sz = size, lines = wrap(ctx, s, sz, maxW, w);
    while (lines.length > maxLines && sz > 11) { sz -= 1; lines = wrap(ctx, s, sz, maxW, w); }
    if (lines.length > maxLines) lines = lines.slice(0, maxLines - 1).concat(lines.slice(maxLines - 1).join(' '));
    const lh = sz * 1.2, y0 = y - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => U.text(ctx, ln, x, y0 + i * lh, Object.assign({}, o, { weight: w, size: fitSize(ctx, ln, sz, maxW, w), maxW })));
  }
  function coin(ctx, x, y, r) {
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.55, '#ffc61a'); gr.addColorStop(1, '#b8860b');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(130,85,0,.8)'; ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function sparkle(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#fffbe0';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.restore();
  }
  function drop(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gr = ctx.createLinearGradient(0, -10, 0, 9); gr.addColorStop(0, '#9fdcff'); gr.addColorStop(1, '#2b8be6');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -11); ctx.bezierCurveTo(4, -4, 8, 0, 8, 4); ctx.arc(0, 4, 8, 0, Math.PI); ctx.bezierCurveTo(-8, 0, -4, -4, 0, -11); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-3, 3, 1.8, 3.2, 0.3, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function lock(U, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#8d939b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#c9a227'; U.rr(ctx, -9, -4, 18, 14, 3); ctx.fill();
    ctx.fillStyle = '#7a5c0a'; ctx.beginPath(); ctx.arc(0, 2, 2.2, 0, 6.3); ctx.fill(); ctx.fillRect(-1, 2, 2, 4);
    ctx.restore();
  }
  // כפתור מצויר: צבע, שיפוע, צל, ותווית שתמיד נכנסת
  function button(U, ctx, R, col, label, o) {
    o = o || {};
    const r = o.r != null ? o.r : Math.min(14, R.h / 2.6), off = !!o.off, c = off ? '#a59f97' : col;
    const press = o.press || 0, sc = 1 + press * 0.07;
    ctx.save();
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(sc, sc); ctx.translate(-R.w / 2, -R.h / 2);
    ctx.fillStyle = 'rgba(40,25,10,.32)'; U.rr(ctx, 0, 3.5, R.w, R.h, r); ctx.fill();
    const gr = ctx.createLinearGradient(0, 0, 0, R.h);
    gr.addColorStop(0, U.shade(c, o.hot ? 0.32 : 0.2)); gr.addColorStop(1, U.shade(c, -0.1));
    ctx.fillStyle = gr; U.rr(ctx, 0, 0, R.w, R.h, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; U.rr(ctx, 3, 2.5, R.w - 6, R.h * 0.42, Math.max(2, r - 3)); ctx.fill();
    ctx.strokeStyle = U.shade(c, -0.38); ctx.lineWidth = 2; U.rr(ctx, 0, 0, R.w, R.h, r); ctx.stroke();
    if (o.glow) { ctx.strokeStyle = 'rgba(255,250,200,' + o.glow + ')'; ctx.lineWidth = 3 + o.glow * 3; U.rr(ctx, -3, -3, R.w + 6, R.h + 6, r + 3); ctx.stroke(); }
    if (label != null) {
      const sz = o.size || Math.min(24, R.h * 0.46), icon = o.icon, iw = icon ? sz * 1.15 : 0, gap = icon ? 6 : 0;
      const ts = fitSize(ctx, label, sz, R.w - 14 - iw - gap);
      ctx.font = '800 ' + ts + 'px ' + FONT;
      const tw = ctx.measureText(String(label)).width, tot = tw + iw + gap;
      let x0 = R.w / 2 - tot / 2;
      const rtl = !!o.rtl && icon;
      if (icon) { icon(rtl ? x0 + tw + gap + iw / 2 : x0 + iw / 2, R.h / 2 + 1, sz / 24); }
      U.text(ctx, label, (rtl ? x0 : x0 + iw + gap) + tw / 2, R.h / 2 + 1, { size: ts, color: off ? 'rgba(255,255,255,.75)' : '#fff', stroke: 'rgba(0,0,0,.22)', strokeW: 3 });
    }
    ctx.restore();
  }
  function bump(S, key, dur) { const t0 = S.pop[key]; if (t0 == null) return 0; const q = (S.anim - t0) / (dur || 0.35); return q >= 1 ? 0 : Math.sin(q * Math.PI) * (1 - q); }

  // ---------- ציור: פריטים ----------
  function drawItem(U, ctx, id, x, y, s) {
    ctx.save(); ctx.translate(x, y); const k = s / 40; ctx.scale(k, k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'wheat') {
      for (const a of [-0.42, 0, 0.42]) {
        ctx.save(); ctx.translate(0, 17); ctx.rotate(a);
        ctx.strokeStyle = '#b07d22'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
        for (let j = 0; j < 4; j++) for (const sd of [-1, 1]) { ctx.fillStyle = j % 2 ? '#f5cf5f' : '#e8b33c'; ctx.beginPath(); ctx.ellipse(sd * 2.7, -20 - j * 4.4, 2.5, 4.2, sd * 0.45, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#f7d873'; ctx.beginPath(); ctx.ellipse(0, -38, 2.3, 4, 0, 0, 6.3); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#c0392b'; U.rr(ctx, -6.5, 6, 13, 6, 2.5); ctx.fill();
    } else if (id === 'carrot') {
      ctx.rotate(0.5); ctx.scale(0.9, 0.9);
      ctx.fillStyle = '#3aa845';
      for (const a of [-0.55, 0, 0.55]) { ctx.save(); ctx.translate(0, -11); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -8, 3.4, 9, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
      const gr = ctx.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, '#ffb04d'); gr.addColorStop(1, '#e8691a');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-9, -11); ctx.quadraticCurveTo(-8, 6, 0, 22); ctx.quadraticCurveTo(8, 6, 9, -11); ctx.quadraticCurveTo(0, -15, -9, -11); ctx.fill();
      ctx.strokeStyle = 'rgba(150,60,10,.45)'; ctx.lineWidth = 1.6;
      for (const [yy, l] of [[-4, 6], [3, 5], [10, 3.5]]) { ctx.beginPath(); ctx.moveTo(-l, yy); ctx.lineTo(1, yy + 1.5); ctx.stroke(); }
    } else if (id === 'corn') {
      ctx.rotate(-0.35);
      ctx.fillStyle = '#4caf50';
      ctx.beginPath(); ctx.moveTo(0, 21); ctx.quadraticCurveTo(-17, 6, -11, -14); ctx.quadraticCurveTo(-6, 4, 0, 13); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 21); ctx.quadraticCurveTo(17, 6, 11, -14); ctx.quadraticCurveTo(6, 4, 0, 13); ctx.fill();
      const gr = ctx.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, '#ffe066'); gr.addColorStop(1, '#f0b400');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -2, 8, 19, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(190,120,0,.38)';
      for (let yy = -16; yy <= 13; yy += 4.4) for (let xx = -5.4; xx <= 5.5; xx += 3.6) { if ((xx * xx) / 49 + ((yy + 2) * (yy + 2)) / 300 > 0.9) continue; ctx.beginPath(); ctx.arc(xx, yy, 1.1, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#5cbf60';
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-10, 10, -6, -3); ctx.quadraticCurveTo(-2, 10, 0, 17); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(10, 10, 6, -3); ctx.quadraticCurveTo(2, 10, 0, 17); ctx.fill();
    } else if (id === 'tomato') {
      const gr = ctx.createRadialGradient(-5, -3, 2, 0, 2, 18);
      gr.addColorStop(0, '#ff8a75'); gr.addColorStop(0.6, '#e8402f'); gr.addColorStop(1, '#a81e14');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 3, 17, 15, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-7, -3, 4, 2.5, -0.6, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2f9e44'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 9; ctx.lineTo(Math.cos(a) * r, -10 + Math.sin(a) * r * 0.6); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2b7a35'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(1.5, -17); ctx.stroke();
    } else if (id === 'strawberry') {
      const gr = ctx.createLinearGradient(0, -12, 0, 20); gr.addColorStop(0, '#ff5a6e'); gr.addColorStop(1, '#c9183a');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 21); ctx.bezierCurveTo(-19, 6, -17, -12, -6, -12); ctx.quadraticCurveTo(0, -10, 6, -12); ctx.bezierCurveTo(17, -12, 19, 6, 0, 21); ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      for (const [a, b] of [[-8, -5], [0, -6], [8, -5], [-10, 2], [-3, 1], [4, 1], [10, 2], [-6, 8], [1, 8], [6, 9], [-2, 14], [2.5, 15]]) { ctx.beginPath(); ctx.ellipse(a, b, 1, 1.6, 0, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-8, -2, 2.5, 5, 0.4, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2f9e44';
      for (const a of [-1.2, -0.6, 0, 0.6, 1.2]) { ctx.save(); ctx.translate(0, -12); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -4, 2.6, 6, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
    } else if (id === 'sunflower') {
      ctx.fillStyle = '#f0a000';
      for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6 + Math.PI / 12); ctx.beginPath(); ctx.ellipse(0, -13, 3.8, 7.5, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#ffd21f';
      for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.beginPath(); ctx.ellipse(0, -13, 4.4, 8, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
      const gr = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9.5); gr.addColorStop(0, '#9a6630'); gr.addColorStop(1, '#4a2c12');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,140,.35)';
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 2 + (i % 4) * 1.8; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0, 6.3); ctx.fill(); }
    } else if (id === 'pumpkin') {
      for (const [ox, rx, ry, c] of [[-10, 10, 13, '#e2701a'], [10, 10, 13, '#e2701a'], [-4.5, 9, 14, '#f58a24'], [4.5, 9, 14, '#f58a24'], [0, 8, 14.5, '#ffa23a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(ox, 5, rx, ry, 0, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-2, -2, 2.4, 6, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#5b7a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(1, -14, 5, -16); ctx.stroke();
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(-7, -11, 6, 3.4, -0.4, 0, 6.3); ctx.fill();
    } else if (id === 'egg') {
      const gr = ctx.createRadialGradient(-5, -6, 2, 0, 0, 19); gr.addColorStop(0, '#fffdf7'); gr.addColorStop(0.7, '#f3e6cf'); gr.addColorStop(1, '#d6be98');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -17); ctx.bezierCurveTo(10, -17, 15, 1, 13.5, 8); ctx.bezierCurveTo(11.5, 18, -11.5, 18, -13.5, 8); ctx.bezierCurveTo(-15, 1, -10, -17, 0, -17); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-5, -6, 2.5, 4.5, 0.4, 0, 6.3); ctx.fill();
    } else if (id === 'milk') {
      const gr = ctx.createLinearGradient(-11, 0, 11, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9e6f5');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-5, -14); ctx.lineTo(5, -14); ctx.lineTo(6, -8); ctx.quadraticCurveTo(11, -5, 11, 1); ctx.lineTo(11, 16); ctx.quadraticCurveTo(11, 20, 7, 20); ctx.lineTo(-7, 20); ctx.quadraticCurveTo(-11, 20, -11, 16); ctx.lineTo(-11, 1); ctx.quadraticCurveTo(-11, -5, -6, -8); ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,150,.45)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#3b82f6'; U.rr(ctx, -6.5, -19, 13, 6.5, 2); ctx.fill();
      ctx.fillStyle = '#8cc4ff'; U.rr(ctx, -11, 4, 22, 9, 1); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 8.5, 3, 2.6, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-8, -4, 2.4, 20);
    } else if (id === 'chicken') {
      ctx.restore(); drawChicken(ctx, x, y + s * 0.42, s / 40 * 0.95, 0, 0, false, 1); return;
    } else if (id === 'cow') {
      ctx.restore(); drawCow(U, ctx, x, y + s * 0.4, s / 40 * 0.46, 0, 0, 1); return;
    } else if (id === 'plot') {
      ctx.fillStyle = '#7a4a28'; U.rr(ctx, -18, -10, 36, 24, 6); ctx.fill();
      ctx.fillStyle = '#9c6a3c'; U.rr(ctx, -18, -14, 36, 22, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,15,.5)'; ctx.lineWidth = 2;
      for (const yy of [-8, -2, 4]) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(14, yy); ctx.stroke(); }
      ctx.fillStyle = '#6cc04a'; ctx.beginPath(); ctx.ellipse(-5, -10, 3.4, 2, -0.5, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(1, -10, 3.4, 2, 0.5, 0, 6.3); ctx.fill();
    } else if (id === 'sprinkler') {
      ctx.fillStyle = '#7d8a96'; U.rr(ctx, -3, -2, 6, 20, 2); ctx.fill();
      ctx.fillStyle = '#c4ccd4'; U.rr(ctx, -9, -8, 18, 7, 3); ctx.fill();
      ctx.strokeStyle = '#6fc3ff'; ctx.lineWidth = 2.4;
      for (const a of [-2.4, -1.9, -1.25, -0.7]) { ctx.beginPath(); ctx.arc(0, -6, 14, a - 0.15, a + 0.15); ctx.stroke(); }
      for (const [a, b] of [[-14, -14], [-6, -20], [6, -20], [14, -14]]) drop(ctx, a, b, 0.32);
    } else if (id === 'feeder') {
      ctx.fillStyle = '#c98b4f'; U.rr(ctx, -16, 2, 32, 14, 3); ctx.fill();
      ctx.fillStyle = '#a06d3b'; ctx.fillRect(-16, 12, 32, 4);
      ctx.fillStyle = '#e8b33c'; ctx.beginPath(); ctx.ellipse(0, 3, 13, 4, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d0d6dc'; U.rr(ctx, -6, -20, 12, 18, 3); ctx.fill();
      ctx.fillStyle = '#e8b33c'; ctx.fillRect(-4, -12, 8, 9);
    } else if (id === 'board') {
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-13, 8, 4, 12); ctx.fillRect(9, 8, 4, 12);
      ctx.fillStyle = '#c98b4f'; U.rr(ctx, -18, -16, 36, 26, 4); ctx.fill();
      ctx.fillStyle = '#fff8e7';
      for (const [a, b] of [[-14, -12], [-1, -12], [-14, -1], [-1, -1]]) { ctx.fillRect(a, b, 11, 8); }
      ctx.fillStyle = '#e8402f'; for (const [a, b] of [[-8.5, -12], [4.5, -12], [-8.5, -1], [4.5, -1]]) { ctx.beginPath(); ctx.arc(a, b, 1.6, 0, 6.3); ctx.fill(); }
    } else if (id === 'fert') {
      ctx.fillStyle = '#6b8e3a'; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.lineTo(15, 18); ctx.lineTo(-15, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#86ad4c'; ctx.fillRect(-13, -16, 26, 6);
      ctx.fillStyle = '#fff3c4'; U.rr(ctx, -9, -4, 18, 14, 3); ctx.fill();
      ctx.fillStyle = '#3aa845'; ctx.beginPath(); ctx.ellipse(-3, 3, 3.5, 2, -0.6, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(3, 3, 3.5, 2, 0.6, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#3aa845'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 2); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- ציור: צמחים ----------
  // st: 0 זרע יבש, 1 נבט, 2 צמח צעיר (q = כמה גדל), 3 בשל
  function drawPlant(U, ctx, id, st, q, x, y, u, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    const sw = Math.sin(t * 1.7 + ph) * 0.07;
    ctx.fillStyle = 'rgba(50,25,8,.22)'; ctx.beginPath(); ctx.ellipse(0, 1, st >= 2 ? 9 : 6, 3, 0, 0, 6.3); ctx.fill();
    if (st === 0) {
      ctx.fillStyle = '#7d5230'; ctx.beginPath(); ctx.ellipse(0, -1, 6.5, 3.6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f0d9a0'; ctx.beginPath(); ctx.ellipse(0.5, -3.4, 1.7, 1.2, 0.3, 0, 6.3); ctx.fill();
      ctx.restore(); return;
    }
    if (st === 1) {
      ctx.rotate(sw);
      ctx.strokeStyle = '#4f9a3a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -7); ctx.stroke();
      ctx.fillStyle = '#6cc04a';
      ctx.beginPath(); ctx.ellipse(-3.4, -8, 3.8, 2.1, -0.5, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3.4, -8, 3.8, 2.1, 0.5, 0, 6.3); ctx.fill();
      ctx.restore(); return;
    }
    const ripe = st === 3, sz = ripe ? 1 + Math.sin(t * 3.2 + ph) * 0.025 : 0.5 + 0.45 * q;
    ctx.scale(sz, ripe ? sz * (1 + Math.sin(t * 3.2 + ph) * 0.02) : sz);
    if (id === 'wheat') {
      for (const [ox, a, h] of [[-4, -0.2, 28], [4, 0.22, 27], [0, 0.03, 33], [-1.5, -0.08, 24], [2, 0.1, 22]]) {
        ctx.save(); ctx.translate(ox * 0.7, 0); ctx.rotate(a + sw * 1.4);
        ctx.strokeStyle = ripe ? '#c99a3a' : '#5aa63c'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
        if (ripe || q > 0.45) for (let j = 0; j < 4; j++) for (const sd of [-1, 1]) { ctx.fillStyle = ripe ? (j % 2 ? '#f5cf5f' : '#e3ad3a') : '#a5d872'; ctx.beginPath(); ctx.ellipse(sd * 1.9, -h + 2 + j * 3.3, 1.8, 2.9, sd * 0.4, 0, 6.3); ctx.fill(); }
        ctx.restore();
      }
      ctx.fillStyle = ripe ? '#b9a24a' : '#4f9a3a';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 4, -5, 1.8, 6, sd * 0.6, 0, 6.3); ctx.fill(); }
    } else if (id === 'carrot') {
      if (ripe) {
        ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(0, 0.5, 6.5, 4.5, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ffb04d'; ctx.beginPath(); ctx.ellipse(-2, -1.5, 2.4, 1.6, 0, 0, 6.3); ctx.fill();
      }
      ctx.rotate(sw);
      ctx.fillStyle = '#3f9e3a';
      for (const a of [-0.75, -0.38, 0, 0.38, 0.75]) { ctx.save(); ctx.translate(0, -3); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -9, 2.6, 9.5, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#62c24e';
      for (const a of [-0.5, 0.12, 0.55]) { ctx.save(); ctx.translate(0, -3); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -8, 1.7, 7, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
    } else if (id === 'corn') {
      ctx.rotate(sw * 0.6);
      ctx.strokeStyle = '#4e9a35'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -54); ctx.stroke();
      ctx.fillStyle = '#5cb043';
      for (const [yy, sd] of [[-12, -1], [-20, 1], [-30, -1], [-40, 1], [-48, -1]]) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(sd * 12, yy - 10, sd * 19, yy - 4); ctx.quadraticCurveTo(sd * 10, yy - 5, 0, yy - 4); ctx.fill();
      }
      if (ripe || q > 0.6) {
        const k = ripe ? 1 : 0.55;
        ctx.save(); ctx.translate(3, -30); ctx.rotate(0.25); ctx.scale(k, k);
        ctx.fillStyle = ripe ? '#ffd84a' : '#b8e07a'; ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 10, 0, 0, 6.3); ctx.fill();
        if (ripe) { ctx.fillStyle = 'rgba(190,120,0,.35)'; for (let yy = -7; yy <= 7; yy += 3.4) { ctx.beginPath(); ctx.arc(-1.4, yy, 0.9, 0, 6.3); ctx.arc(1.6, yy + 1, 0.9, 0, 6.3); ctx.fill(); } }
        ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.moveTo(0, 11); ctx.quadraticCurveTo(-7, 2, -3, -8); ctx.quadraticCurveTo(-1, 3, 0, 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 11); ctx.quadraticCurveTo(7, 2, 3, -6); ctx.quadraticCurveTo(1, 3, 0, 8); ctx.fill();
        ctx.restore();
      }
      if (ripe) { ctx.strokeStyle = '#e0b84a'; ctx.lineWidth = 1.4; for (const a of [-0.5, -0.15, 0.2, 0.5]) { ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(Math.sin(a) * 9, -54 - Math.cos(a) * 8); ctx.stroke(); } }
    } else if (id === 'tomato') {
      ctx.strokeStyle = '#b58a55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, 1); ctx.lineTo(6, -34); ctx.stroke();
      ctx.rotate(sw * 0.7);
      for (const [a, b, r, c] of [[0, -10, 9, '#3f8f3a'], [-6, -19, 8, '#4a9e3f'], [6, -21, 8, '#3f8f3a'], [0, -28, 7, '#55ab45'], [-7, -9, 6, '#4a9e3f']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); }
      const tc = ripe ? '#e8402f' : '#9bd35a', r = ripe ? 4.8 : 3.2;
      if (ripe || q > 0.4) for (const [a, b] of [[-6, -12], [5, -15], [-2, -24], [7, -26]]) {
        ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(a - r * 0.35, b - r * 0.35, r * 0.3, 0, 6.3); ctx.fill();
      } else { ctx.fillStyle = '#ffe14d'; for (const [a, b] of [[-5, -14], [4, -22]]) { ctx.beginPath(); ctx.arc(a, b, 1.8, 0, 6.3); ctx.fill(); } }
    } else if (id === 'strawberry') {
      ctx.rotate(sw * 0.5);
      for (const [a, b, c] of [[-7, -6, '#3f8f3a'], [7, -6, '#3f8f3a'], [0, -11, '#4a9e3f'], [-3, -3, '#55ab45'], [4, -3, '#55ab45']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, 4.6, 0, 6.3); ctx.fill(); }
      if (ripe) {
        for (const [a, b] of [[-6, 1], [6, 2], [0, -1]]) {
          ctx.save(); ctx.translate(a, b); ctx.scale(0.28, 0.28);
          ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.moveTo(0, 21); ctx.bezierCurveTo(-19, 6, -17, -12, -6, -12); ctx.quadraticCurveTo(0, -10, 6, -12); ctx.bezierCurveTo(17, -12, 19, 6, 0, 21); ctx.fill();
          ctx.fillStyle = '#ffe9a8'; for (const [p, r2] of [[-6, -3], [5, -3], [0, 5], [-4, 10], [4, 10]]) { ctx.beginPath(); ctx.arc(p, r2, 1.6, 0, 6.3); ctx.fill(); }
          ctx.restore();
        }
      } else if (q > 0.35) {
        ctx.fillStyle = '#fff'; for (const [a, b] of [[-5, -12], [6, -10]]) { for (let i = 0; i < 5; i++) { const an = i * 1.256; ctx.beginPath(); ctx.arc(a + Math.cos(an) * 2, b + Math.sin(an) * 2, 1.5, 0, 6.3); ctx.fill(); } }
        ctx.fillStyle = '#ffd43b'; for (const [a, b] of [[-5, -12], [6, -10]]) { ctx.beginPath(); ctx.arc(a, b, 1.1, 0, 6.3); ctx.fill(); }
      }
    } else if (id === 'sunflower') {
      ctx.rotate(sw * 0.5);
      ctx.strokeStyle = '#4e9a35'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2, -28, 0, -52); ctx.stroke();
      ctx.fillStyle = '#5cb043';
      ctx.beginPath(); ctx.ellipse(-8, -20, 8, 4.5, 0.5, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -32, 8, 4.5, -0.5, 0, 6.3); ctx.fill();
      if (ripe) { ctx.save(); ctx.translate(0, -54); ctx.rotate(Math.sin(t * 0.8 + ph) * 0.12); drawItem(U, ctx, 'sunflower', 0, 0, 30); ctx.restore(); }
      else { ctx.fillStyle = '#4f9a3a'; ctx.beginPath(); ctx.ellipse(0, -54, 5, 6.5, 0, 0, 6.3); ctx.fill(); if (q > 0.7) { ctx.fillStyle = '#ffd21f'; for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.ellipse(Math.sin(a) * 4, -59 - Math.cos(a) * 1, 1.5, 2.6, a, 0, 6.3); ctx.fill(); } } }
    } else if (id === 'pumpkin') {
      ctx.strokeStyle = '#4e9a35'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-16, -2); ctx.bezierCurveTo(-8, -10, 8, 4, 16, -4); ctx.stroke();
      for (const [a, b, r] of [[-13, -8, 8], [12, -9, 8], [-2, -15, 7.5]]) {
        ctx.fillStyle = '#4a9e3f'; ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(a - 2, b - 2, r * 0.5, 0, 6.3); ctx.fill();
      }
      if (ripe) drawItem(U, ctx, 'pumpkin', 1, -9, 30);
      else { const k = 0.3 + 0.5 * q; ctx.save(); ctx.translate(2, -5); ctx.scale(k, k); ctx.fillStyle = '#9bd35a'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = 'rgba(60,110,30,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(-5, 9); ctx.moveTo(5, -9); ctx.lineTo(5, 9); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  }
  const SPOTS = {
    six: [[0.2, 0.44], [0.5, 0.44], [0.8, 0.44], [0.2, 0.8], [0.5, 0.8], [0.8, 0.8]],
    four: [[0.28, 0.5], [0.72, 0.5], [0.28, 0.86], [0.72, 0.86]],
    three: [[0.2, 0.84], [0.5, 0.84], [0.8, 0.84]],
    two: [[0.3, 0.8], [0.72, 0.8]],
  };
  const CROP_SPOTS = { wheat: 'six', carrot: 'six', corn: 'three', tomato: 'four', strawberry: 'six', sunflower: 'three', pumpkin: 'two' };
  const CROP_SCALE = { wheat: 1, carrot: 1, corn: 1.05, tomato: 0.95, strawberry: 1.15, sunflower: 1.05, pumpkin: 1.15 };

  // ---------- ציור: חיות ----------
  function drawChicken(ctx, x, y, s, t, mood, blink, face) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (face || 1), s);
    ctx.fillStyle = 'rgba(60,40,10,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.5, 0, 0, 6.3); ctx.fill();
    const peck = mood === 1 ? Math.max(0, Math.sin(t * 8)) : 0, hop = mood === 2 ? Math.abs(Math.sin(t * 5)) * 2 : 0;
    ctx.translate(0, -hop);
    ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const lx of [-3, 3]) { ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx, 0); ctx.lineTo(lx + 3, 0); ctx.stroke(); }
    ctx.fillStyle = '#efe6d6';
    for (const [a, l] of [[-2.3, 9], [-2.0, 10], [-1.7, 8]]) { ctx.beginPath(); ctx.ellipse(-12 + Math.cos(a) * 3, -20 + Math.sin(a) * 3, 2.8, l * 0.6, a + 1.57, 0, 6.3); ctx.fill(); }
    const gr = ctx.createRadialGradient(-2, -21, 2, 0, -16, 15); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e3d9c6');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -16, 13.5, 10.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e6dccb'; ctx.beginPath(); ctx.ellipse(-2, -15, 7.5, 5, mood === 2 ? -0.4 + Math.sin(t * 14) * 0.3 : -0.15, 0, 6.3); ctx.fill();
    const hx = 9 + peck * 4, hy = -27 + peck * 12;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 6.8, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e8402f';
    for (const [a, b, r] of [[-3, -6.5, 2.6], [0, -7.5, 2.9], [3, -6.5, 2.5]]) { ctx.beginPath(); ctx.arc(hx + a, hy + b, r, 0, 6.3); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(hx + 5, hy + 5, 1.8, 2.8, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#f5a000'; ctx.beginPath(); ctx.moveTo(hx + 5.5, hy - 1.5); ctx.lineTo(hx + 11, hy + 0.5); ctx.lineTo(hx + 5.5, hy + 2.5); ctx.closePath(); ctx.fill();
    if (blink) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + 0.5, hy - 1); ctx.lineTo(hx + 4, hy - 1); ctx.stroke(); }
    else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(hx + 2.4, hy - 1.2, 1.6, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 2.9, hy - 1.7, 0.55, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  function drawCow(U, ctx, x, y, s, t, mood, face) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (face || 1), s);
    ctx.fillStyle = 'rgba(40,40,10,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 6, 0, 0, 6.3); ctx.fill();
    const chew = mood === 1 ? Math.sin(t * 9) * 1.2 : 0, headDown = mood === 1 ? 6 : 0, tail = Math.sin(t * 2.2) * 0.35;
    ctx.fillStyle = '#d9d0c4';
    for (const lx of [-24, 14]) U.rr(ctx, lx, -26, 8, 26, 3), ctx.fill();
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(-32, -40); ctx.rotate(tail); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, 12, -5, 24); ctx.stroke(); ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(-5, 26, 3, 4.5, 0, 0, 6.3); ctx.fill(); ctx.restore();
    const gr = ctx.createLinearGradient(0, -56, 0, -20); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e7e0d6');
    ctx.fillStyle = gr; U.rr(ctx, -34, -58, 62, 36, 16); ctx.fill();
    ctx.save(); U.rr(ctx, -34, -58, 62, 36, 16); ctx.clip();
    ctx.fillStyle = '#333';
    for (const [a, b, rx, ry] of [[-20, -50, 9, 7], [4, -34, 10, 6], [16, -52, 7, 5], [-8, -30, 5, 4]]) { ctx.beginPath(); ctx.ellipse(a, b, rx, ry, 0.4, 0, 6.3); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#ffb3c1'; ctx.beginPath(); ctx.ellipse(-6, -21, 8, 4.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e8e0d4';
    for (const lx of [-30, 18]) U.rr(ctx, lx, -28, 9, 28, 3), ctx.fill();
    ctx.fillStyle = '#5a4636'; for (const lx of [-30, 18, -24, 14]) { U.rr(ctx, lx, -4, lx === -24 || lx === 14 ? 8 : 9, 4, 1.5); ctx.fill(); }
    // הראש
    ctx.save(); ctx.translate(30, -50 + headDown);
    ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(-9, -15); ctx.lineTo(-2, -12); ctx.fill(); ctx.beginPath(); ctx.moveTo(7, -9); ctx.lineTo(9, -16); ctx.lineTo(10, -9); ctx.fill();
    ctx.fillStyle = '#c99a7a'; ctx.beginPath(); ctx.ellipse(-9, -6, 6, 3.2, -0.4, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(13, -6, 6, 3.2, 0.4, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffffff'; U.rr(ctx, -6, -11, 16, 24, 8); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(-1, -6, 4.5, 5, 0.3, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffb3c1'; U.rr(ctx, -7, 5 + chew * 0.3, 18, 11, 5.5); ctx.fill();
    ctx.fillStyle = '#c96a80'; ctx.beginPath(); ctx.ellipse(-1, 10 + chew * 0.3, 1.6, 2.2, 0, 0, 6.3); ctx.ellipse(5, 10 + chew * 0.3, 1.6, 2.2, 0, 0, 6.3); ctx.fill();
    const bl = (t * 0.7 + x * 0.01) % 4 < 0.12;
    if (bl) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(1, -2); ctx.moveTo(5, -2); ctx.lineTo(9, -2); ctx.stroke(); }
    else for (const ex of [-1, 7]) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(ex, -2, 2, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.7, -2.7, 0.7, 0, 6.3); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(24, -30 + headDown * 0.5, 3.6, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function nest(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#b8892f'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7a5520'; ctx.beginPath(); ctx.ellipse(0, -1, 10, 3.2, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#e0b85a'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 5); ctx.lineTo(Math.cos(a + 0.9) * 12, Math.sin(a + 0.9) * 4.4 - 1); ctx.stroke(); }
    ctx.restore();
  }
  function bubble(U, ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(40,25,10,.25)'; U.rr(ctx, x - w / 2, y - h / 2 + 2, w, h, h / 2.4); ctx.fill();
    ctx.fillStyle = '#ffffff'; U.rr(ctx, x - w / 2, y - h / 2, w, h, h / 2.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, y + h / 2 - 1); ctx.lineTo(x, y + h / 2 + 7); ctx.lineTo(x + 5, y + h / 2 - 1); ctx.fill();
  }
  function bar(U, ctx, x, y, w, h, f, col) {
    ctx.fillStyle = 'rgba(30,18,6,.45)'; U.rr(ctx, x, y, w, h, h / 2); ctx.fill();
    if (f > 0) { ctx.fillStyle = col; U.rr(ctx, x + 1, y + 1, Math.max(h - 2, (w - 2) * Math.min(1, f)), h - 2, (h - 2) / 2); ctx.fill(); }
  }

  // ---------- ציור: נוף ורקע (נשמר פעם אחת בתמונה) ----------
  function house(U, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff3dc'; ctx.fillRect(-28, -30, 56, 30);
    ctx.fillStyle = '#e04b3a'; ctx.beginPath(); ctx.moveTo(-34, -28); ctx.lineTo(0, -52); ctx.lineTo(34, -28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b83a2c'; ctx.fillRect(-34, -30, 68, 4);
    ctx.fillStyle = '#8a5a2b'; U.rr(ctx, -6, -20, 12, 20, 2); ctx.fill();
    ctx.fillStyle = '#7cc7ff'; for (const wx of [-20, 13]) { ctx.fillRect(wx, -22, 8, 8); }
    ctx.fillStyle = '#fff'; for (const wx of [-20, 13]) { ctx.fillRect(wx + 3.5, -22, 1, 8); ctx.fillRect(wx, -18.5, 8, 1); }
    ctx.fillStyle = '#9c5a3c'; ctx.fillRect(14, -50, 7, 14);
    ctx.restore();
  }
  function barn(U, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#d9483b'; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-32, -30); ctx.lineTo(-18, -46); ctx.lineTo(18, -46); ctx.lineTo(32, -30); ctx.lineTo(32, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.moveTo(-36, -29); ctx.lineTo(-19, -49); ctx.lineTo(19, -49); ctx.lineTo(36, -29); ctx.lineTo(32, -29); ctx.lineTo(17, -45); ctx.lineTo(-17, -45); ctx.lineTo(-32, -29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-12, -22, 24, 22);
    ctx.fillStyle = '#b83a2c'; ctx.fillRect(-10, -20, 20, 20);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(10, 0); ctx.moveTo(10, -20); ctx.lineTo(-10, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -38, 12, 9); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(-4.5, -36.5, 9, 6);
    ctx.restore();
  }
  function silo(U, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gr = ctx.createLinearGradient(-10, 0, 10, 0); gr.addColorStop(0, '#c9ced4'); gr.addColorStop(0.5, '#eef1f4'); gr.addColorStop(1, '#a9b0b8');
    ctx.fillStyle = gr; ctx.fillRect(-10, -50, 20, 50);
    ctx.fillStyle = '#8f98a2'; ctx.beginPath(); ctx.arc(0, -50, 10, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let yy = -42; yy < 0; yy += 8) { ctx.beginPath(); ctx.moveTo(-10, yy); ctx.lineTo(10, yy); ctx.stroke(); }
    ctx.restore();
  }
  function tree(ctx, x, y, s, c1, c2) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7a4f2a'; ctx.fillRect(-2.5, -12, 5, 12);
    for (const [a, b, r, c] of [[-7, -16, 9, c1], [7, -16, 9, c1], [0, -24, 11, c2], [-2, -27, 4, 'rgba(255,255,255,.18)']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  function fence(ctx, R, col) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 4;
    ctx.strokeRect(R.x - 5, R.y - 3, R.w + 10, R.h + 9);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.strokeRect(R.x - 5, R.y - 5, R.w + 10, R.h + 9);
    ctx.fillStyle = col;
    const post = (px, py) => { ctx.fillRect(px - 3, py - 8, 6, 12); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px - 3, py - 8, 6, 2); ctx.fillStyle = col; };
    for (let x = R.x - 5; x <= R.x + R.w + 6; x += 38) { post(x, R.y - 3); post(x, R.y + R.h + 6); }
    for (let y = R.y + 30; y < R.y + R.h; y += 38) { post(R.x - 5, y); post(R.x + R.w + 5, y); }
    ctx.restore();
  }
  function paintBg(U, ctx, L) {
    const W = L.W, H = L.H, rnd = U.seeded(7 + (L.P ? 3 : 0));
    // שמיים וגבעות
    const T = L.top, sky = ctx.createLinearGradient(0, 0, 0, T.h);
    sky.addColorStop(0, '#7ec8f5'); sky.addColorStop(1, '#cdeeff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, T.h + 10);
    ctx.fillStyle = '#a9dc7e';
    ctx.beginPath(); ctx.moveTo(0, T.h);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, T.h - 18 - Math.sin(x * 0.012) * 8 - Math.sin(x * 0.031 + 1) * 4);
    ctx.lineTo(W, T.h + 10); ctx.lineTo(0, T.h + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#93cf68';
    ctx.beginPath(); ctx.moveTo(0, T.h);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, T.h - 8 - Math.sin(x * 0.02 + 2) * 5);
    ctx.lineTo(W, T.h + 10); ctx.lineTo(0, T.h + 10); ctx.closePath(); ctx.fill();
    // דשא
    const gg = ctx.createLinearGradient(0, T.h, 0, H);
    gg.addColorStop(0, '#8fd263'); gg.addColorStop(1, '#74bf4b');
    ctx.fillStyle = gg; ctx.fillRect(0, T.h, W, H - T.h);
    for (let i = 0; i < (L.P ? 260 : 240); i++) {
      const x = rnd() * W, y = T.h + rnd() * (H - T.h), v = rnd();
      ctx.strokeStyle = v < 0.5 ? 'rgba(60,120,30,.35)' : 'rgba(200,255,160,.35)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x - 1, y - 2); ctx.moveTo(x + 1, y + 2); ctx.lineTo(x + 2, y - 3); ctx.stroke();
      if (v > 0.93) { ctx.fillStyle = v > 0.97 ? '#fff' : '#ffd84d'; ctx.beginPath(); ctx.arc(x + 4, y - 1, 2, 0, 6.3); ctx.fill(); }
    }
    // בתים
    const bs = L.P ? 0.85 : 0.82;
    house(U, ctx, L.P ? 70 : 64, T.h + 2, bs);
    tree(ctx, L.P ? 130 : 124, T.h + 3, 0.9, '#4caf50', '#5cbf55');
    silo(U, ctx, W - (L.P ? 112 : 128), T.h + 2, 0.8);
    barn(U, ctx, W - (L.P ? 58 : 66), T.h + 3, bs);
    tree(ctx, L.P ? 290 : 260, T.h + 2, 0.7, '#3f9b3a', '#55b04c');
    tree(ctx, W - (L.P ? 175 : 330), T.h + 2, 0.75, '#3f9b3a', '#55b04c');
    // השדה
    const Fd = L.field;
    ctx.fillStyle = 'rgba(90,60,20,.16)'; U.rr(ctx, Fd.x - 4, Fd.y - 4, Fd.w + 8, Fd.h + 8, 12); ctx.fill();
    fence(ctx, Fd, '#f3e3c3');
    // לול
    const C = L.coop;
    ctx.fillStyle = '#e9d48f'; U.rr(ctx, C.x, C.y, C.w, C.h, 10); ctx.fill();
    for (let i = 0; i < 90; i++) { ctx.strokeStyle = rnd() < 0.5 ? 'rgba(170,130,40,.45)' : 'rgba(255,245,200,.6)'; ctx.lineWidth = 1.3; const x = C.x + 6 + rnd() * (C.w - 12), y = C.y + 6 + rnd() * (C.h - 12), a = rnd() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 3); ctx.stroke(); }
    fence(ctx, C, '#f3e3c3');
    // מרעה
    const Pp = L.past;
    ctx.fillStyle = '#a7df7c'; U.rr(ctx, Pp.x, Pp.y, Pp.w, Pp.h, 10); ctx.fill();
    for (let i = 0; i < 40; i++) { const x = Pp.x + 8 + rnd() * (Pp.w - 16), y = Pp.y + 8 + rnd() * (Pp.h - 16); ctx.fillStyle = rnd() < 0.5 ? '#ffffff' : '#ffd84d'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.3); ctx.fill(); }
    fence(ctx, Pp, '#f3e3c3');
    // לוח ההזמנות
    const O = L.ord;
    ctx.fillStyle = 'rgba(40,20,5,.3)'; U.rr(ctx, O.x, O.y + 4, O.w, O.h, 14); ctx.fill();
    const wg = ctx.createLinearGradient(O.x, 0, O.x + O.w, 0); wg.addColorStop(0, '#b77c45'); wg.addColorStop(1, '#a56c39');
    ctx.fillStyle = wg; U.rr(ctx, O.x, O.y, O.w, O.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,15,.35)'; ctx.lineWidth = 1.5;
    for (let yy = O.y + 26; yy < O.y + O.h; yy += 26) { ctx.beginPath(); ctx.moveTo(O.x + 4, yy); ctx.lineTo(O.x + O.w - 4, yy); ctx.stroke(); }
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 4; U.rr(ctx, O.x + 2, O.y + 2, O.w - 4, O.h - 4, 12); ctx.stroke();
    // סרגל הכלים
    const B = L.bar, bg = ctx.createLinearGradient(0, B.y, 0, B.y + B.h);
    bg.addColorStop(0, '#8d5d33'); bg.addColorStop(1, '#6a4324');
    ctx.fillStyle = bg; ctx.fillRect(B.x, B.y, B.w, B.h);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(B.x, B.y, B.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(B.x, B.y + 3, B.w, 2);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 2;
    for (let yy = B.y + 30; yy < B.y + B.h; yy += 30) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
  }
  let bgCache = { key: '', c: null };
  function bgFor(g, L) {
    const res = g.canvas.width / L.W, key = L.W + 'x' + L.H + ':' + g.canvas.width;
    if (bgCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(L.W * res)); c.height = Math.max(1, Math.round(L.H * res));
      const x = c.getContext('2d');
      x.setTransform(res, 0, 0, res, 0, 0);
      paintBg(g, x, L);
      bgCache = { key, c };
    }
    return bgCache.c;
  }
  function drawSkyLive(g, ctx, L, t) {
    const T = L.top, W = L.W;
    // שמש
    const sx = L.P ? W * 0.62 : W * 0.56, sy = T.h * 0.42, rr = T.h * 0.24;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.3);
    ctx.fillStyle = 'rgba(255,230,120,.55)';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(rr * 1.15, -2.5); ctx.lineTo(rr * 1.75, 0); ctx.lineTo(rr * 1.15, 2.5); ctx.fill(); }
    ctx.restore();
    const sg = ctx.createRadialGradient(sx - 3, sy - 3, 2, sx, sy, rr);
    sg.addColorStop(0, '#fff7c2'); sg.addColorStop(1, '#ffc93a');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.3); ctx.fill();
    // עננים
    for (let i = 0; i < 4; i++) {
      const sp = 6 + i * 3, x = ((i * 271 + t * sp) % (W + 160)) - 80, y = 10 + (i % 2) * 14, s = 0.6 + (i % 3) * 0.18;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.ellipse(x, y + 6, 26 * s, 8 * s, 0, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 8 * s, y + 2, 9 * s, 0, 6.3); ctx.arc(x + 6 * s, y, 11 * s, 0, 6.3); ctx.fill();
    }
    // טחנת רוח
    const mx = L.P ? W * 0.36 : W * 0.38, my = T.h + 2;
    ctx.fillStyle = '#efe2c8'; ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.lineTo(mx - 4, my - 30); ctx.lineTo(mx + 4, my - 30); ctx.lineTo(mx + 7, my); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(mx - 6, my - 29); ctx.lineTo(mx, my - 36); ctx.lineTo(mx + 6, my - 29); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(mx, my - 30); ctx.rotate(t * 1.4);
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#fff'; ctx.fillRect(-1, 2, 2, 17); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(1, 5, 4.5, 13); }
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function butterflies(ctx, L, t) {
    const F = L.field;
    for (let i = 0; i < 2; i++) {
      const x = F.x + F.w * (0.5 + 0.45 * Math.sin(t * 0.23 + i * 3)), y = F.y + F.h * (0.5 + 0.45 * Math.sin(t * 0.31 + i * 2 + Math.sin(t * 0.7)));
      const fl = Math.abs(Math.sin(t * 14 + i));
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = i ? '#ff9fd0' : '#ffe066';
      ctx.beginPath(); ctx.ellipse(-3, 0, 4 * fl + 0.6, 3, -0.4, 0, 6.3); ctx.ellipse(3, 0, 4 * fl + 0.6, 3, 0.4, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-0.7, -3, 1.4, 6);
      ctx.restore();
    }
  }

  // ---------- ציור: השדה ----------
  function stageOf(F, P) {
    if (P.s !== 2) return null;
    if (!P.w) return { st: 0, q: 0 };
    const T = growT(F, P.c), f = P.g / T;
    if (f >= 1) return { st: 3, q: 1 };
    if (f < 0.2) return { st: 1, q: 0 };
    return { st: 2, q: (f - 0.2) / 0.8 };
  }
  function drawPlot(g, ctx, S, i, t) {
    const F = S.F, P = F.plots[i], R = S.L.plots[i], hov = S.hover && S.hover.k === 'plot' && S.hover.i === i;
    const b = bump(S, 'p' + i, 0.32);
    ctx.save();
    if (b) { ctx.translate(R.x + R.w / 2, R.y + R.h); ctx.scale(1 + b * 0.06, 1 - b * 0.04); ctx.translate(-R.x - R.w / 2, -R.y - R.h); }
    if (P.s === 0) {
      ctx.fillStyle = hov ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)'; g.rr(ctx, R.x + 2, R.y + 2, R.w - 4, R.h - 4, 12); ctx.fill();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; g.rr(ctx, R.x + 3, R.y + 3, R.w - 6, R.h - 6, 12); ctx.stroke(); ctx.setLineDash([]);
      const n = nextPlot(F), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      if (n) {
        // שלט "למכירה"
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(cx - 2.5, cy - 2, 5, R.h * 0.36);
        const sw2 = Math.min(R.w - 16, 92), sh = 34;
        ctx.fillStyle = 'rgba(40,20,5,.3)'; g.rr(ctx, cx - sw2 / 2, cy - sh / 2 - 6 + 3, sw2, sh, 8); ctx.fill();
        ctx.fillStyle = '#e8c27a'; g.rr(ctx, cx - sw2 / 2, cy - sh / 2 - 6, sw2, sh, 8); ctx.fill();
        ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 2; ctx.stroke();
        if (F.lv >= n.lv) { coin(ctx, cx - sw2 / 2 + 17, cy - 6, 9); txt(g, ctx, n.cost, cx + 9, cy - 5, 21, { color: F.coins >= n.cost ? '#4a2a0a' : '#b8321f', maxW: sw2 - 36 }); }
        else { lock(g, ctx, cx - sw2 / 2 + 16, cy - 7, 0.85); txt(g, ctx, g.t('lvN', { n: n.lv }), cx + 10, cy - 5, 17, { color: '#4a2a0a', maxW: sw2 - 34 }); }
      }
      ctx.restore();
      return;
    }
    const wet = P.s === 2 && P.w;
    ctx.fillStyle = 'rgba(50,25,5,.35)'; g.rr(ctx, R.x + 1, R.y + 5, R.w - 2, R.h - 3, 12); ctx.fill();
    const sg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    sg.addColorStop(0, wet ? '#8d5b36' : '#c99560'); sg.addColorStop(1, wet ? '#6e4426' : '#a9763f');
    ctx.fillStyle = sg; g.rr(ctx, R.x, R.y, R.w, R.h - 3, 12); ctx.fill();
    ctx.strokeStyle = wet ? 'rgba(40,20,5,.35)' : 'rgba(110,65,25,.35)'; ctx.lineWidth = 2.2;
    for (let k = 1; k <= 3; k++) { const yy = R.y + (R.h - 3) * k / 4; ctx.beginPath(); ctx.moveTo(R.x + 8, yy); ctx.lineTo(R.x + R.w - 8, yy); ctx.stroke(); }
    ctx.strokeStyle = wet ? 'rgba(255,255,255,.08)' : 'rgba(255,240,210,.25)'; ctx.lineWidth = 2; g.rr(ctx, R.x + 1.5, R.y + 1.5, R.w - 3, R.h - 6, 11); ctx.stroke();
    if (wet) { ctx.fillStyle = 'rgba(160,210,255,.12)'; ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.32, R.y + R.h * 0.3, R.w * 0.2, R.h * 0.08, -0.2, 0, 6.3); ctx.fill(); }
    if (hov) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; g.rr(ctx, R.x - 1, R.y - 1, R.w + 2, R.h - 1, 13); ctx.stroke(); }
    if (P.s === 2) {
      const sg2 = stageOf(F, P), spots = SPOTS[CROP_SPOTS[P.c]], u = Math.min(R.w / 110, R.h / 100) * CROP_SCALE[P.c];
      spots.forEach(([fx, fy], k) => drawPlant(g, ctx, P.c, sg2.st, sg2.q, R.x + R.w * fx, R.y + R.h * fy, u, t, i * 1.7 + k * 0.9));
      if (sg2.st === 0) {
        const bx = R.x + R.w / 2, by = R.y + R.h * 0.3 + Math.sin(t * 4 + i) * 3;
        bubble(g, ctx, bx, by, 34, 30); drop(ctx, bx, by + 1, 0.95);
      } else if (sg2.st === 3) {
        for (let k = 0; k < 3; k++) { const ph = t * 2.2 + i * 1.3 + k * 2.1, a = Math.max(0, Math.sin(ph)); sparkle(ctx, R.x + R.w * (0.2 + ((k * 0.37 + i * 0.13) % 0.6)), R.y + R.h * (0.15 + ((k * 0.29 + i * 0.07) % 0.45)), 4 + 3 * a, a); }
      } else {
        bar(g, ctx, R.x + 10, R.y + R.h - 14, R.w - 20, 8, P.g / growT(F, P.c), '#7ee05a');
      }
    }
    ctx.restore();
  }
  // מזלף שמשקה לרגע
  function drawCans(g, ctx, S) {
    for (const c of S.can) {
      const R = S.L.plots[c.i], q = c.t / 0.7, x = R.x + R.w * 0.72, y = R.y + R.h * 0.12 - 8 * Math.sin(q * Math.PI);
      ctx.save(); ctx.globalAlpha = q < 0.85 ? 1 : (1 - q) / 0.15; ctx.translate(x, y); ctx.rotate(-0.5 - Math.sin(q * Math.PI) * 0.35);
      ctx.fillStyle = '#4fa3e0'; g.rr(ctx, -12, -9, 22, 17, 5); ctx.fill();
      ctx.fillStyle = '#3b82c4'; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-26, -12); ctx.lineTo(-27, -9); ctx.lineTo(-12, 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3b82c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -10, 7, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-9, -6, 4, 10);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,200,255,.8)';
      for (let k = 0; k < 4; k++) { const dq = (q * 3 + k * 0.25) % 1; ctx.beginPath(); ctx.arc(x - 24 - k * 3, y - 4 + dq * 26, 1.8, 0, 6.3); ctx.fill(); }
    }
  }

  // ---------- ציור: חיות ----------
  function drawAnimals(g, ctx, S, t) {
    const F = S.F, L = S.L;
    for (const kind of ['chicken', 'cow']) {
      const cells = kind === 'chicken' ? L.chick : L.cowc, arr = F[kind + 's'], A = ANIM[kind];
      cells.forEach((R, j) => {
        const a = arr[j], hov = S.hover && S.hover.k === kind && S.hover.i === j;
        const cx = R.x + R.w / 2, by = R.y + R.h - 12;
        if (!a) {
          if (j !== arr.length) return;
          const n = nextAnimal(F, kind);
          if (!n) return;
          ctx.fillStyle = hov ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.16)'; g.rr(ctx, R.x + 4, R.y + 4, R.w - 8, R.h - 8, 10); ctx.fill();
          ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(120,80,20,.5)'; ctx.lineWidth = 2; g.rr(ctx, R.x + 4, R.y + 4, R.w - 8, R.h - 8, 10); ctx.stroke(); ctx.setLineDash([]);
          ctx.save(); ctx.globalAlpha = 0.35;
          if (kind === 'chicken') drawChicken(ctx, cx, by - 6, Math.min(R.w, R.h) / 80, 0, 0, false, 1); else drawCow(g, ctx, cx - 4, by - 2, Math.min(R.w / 95, R.h / 80), 0, 0, 1);
          ctx.restore();
          const pw = Math.min(R.w - 10, 84), py = R.y + R.h * 0.3;
          ctx.fillStyle = 'rgba(40,20,5,.3)'; g.rr(ctx, cx - pw / 2, py - 14 + 2, pw, 28, 14); ctx.fill();
          ctx.fillStyle = F.lv >= n.lv ? '#3fa34d' : '#8d8478'; g.rr(ctx, cx - pw / 2, py - 14, pw, 28, 14); ctx.fill();
          if (F.lv >= n.lv) { coin(ctx, cx - pw / 2 + 14, py, 8); txt(g, ctx, n.cost, cx + 8, py + 1, 18, { color: '#fff', maxW: pw - 30 }); }
          else { lock(g, ctx, cx - pw / 2 + 13, py - 1, 0.7); txt(g, ctx, g.t('lvN', { n: n.lv }), cx + 9, py + 1, 15, { color: '#fff', maxW: pw - 28 }); }
          return;
        }
        if (hov) { ctx.fillStyle = 'rgba(255,255,255,.22)'; g.rr(ctx, R.x + 2, R.y + 2, R.w - 4, R.h - 4, 10); ctx.fill(); }
        const b = bump(S, kind + j, 0.35), face = j % 2 ? -1 : 1, blink = (t * 0.9 + j * 1.3) % 3.3 < 0.12;
        if (kind === 'chicken') {
          const s = Math.min(R.w / 64, R.h / 82), nx = cx + face * R.w * 0.2;
          nest(ctx, nx, by + 2, s * 0.9);
          if (a.s === 2) { drawItem(g, ctx, 'egg', nx, by - 8 * s + Math.sin(t * 4 + j) * 1.5, 22 * s); sparkle(ctx, nx + 8 * s, by - 18 * s, 4, Math.abs(Math.sin(t * 3 + j))); }
          drawChicken(ctx, cx - face * R.w * 0.14, by + b * 3, s * (1 + b * 0.12), t + j, a.s === 1 ? 1 : a.s === 2 ? 2 : 0, blink, face);
        } else {
          const s = Math.min(R.w / 96, R.h / 84);
          ctx.fillStyle = '#9c6a3c'; g.rr(ctx, cx + face * R.w * 0.18 - 16 * s, by - 7 * s, 32 * s, 9 * s, 3); ctx.fill();
          if (a.s === 1) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(cx + face * R.w * 0.18, by - 7 * s, 13 * s, 3 * s, 0, Math.PI, 0); ctx.fill(); }
          drawCow(g, ctx, cx - face * R.w * 0.06, by + b * 2, s * (1 + b * 0.1), t + j * 1.7, a.s === 1 ? 1 : 0, face);
          if (a.s === 2) { const mx = cx + face * R.w * 0.32; drawItem(g, ctx, 'milk', mx, by - 14 * s + Math.sin(t * 4 + j) * 1.5, 26 * s); sparkle(ctx, mx + 8 * s, by - 30 * s, 4, Math.abs(Math.sin(t * 3 + j))); }
        }
        if (a.s === 0) {
          const bx = cx + (kind === 'cow' ? face * R.w * 0.2 : -face * R.w * 0.1), by2 = R.y + 20 + Math.sin(t * 3.5 + j) * 2.5;
          bubble(g, ctx, bx, by2, 34, 30);
          drawItem(g, ctx, A.feed, bx, by2, 22);
          if (have(F, A.feed) < 1) { ctx.strokeStyle = '#e8402f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bx, by2, 12, 0, 6.3); ctx.moveTo(bx - 8, by2 + 8); ctx.lineTo(bx + 8, by2 - 8); ctx.stroke(); }
        } else if (a.s === 1) bar(g, ctx, R.x + 8, R.y + R.h - 9, R.w - 16, 7, a.g / A.t, kind === 'chicken' ? '#ffd84a' : '#8cc4ff');
      });
    }
  }

  // ---------- ציור: לוח ההזמנות ----------
  function drawOrders(g, ctx, S, t) {
    const F = S.F, L = S.L, O = L.ord;
    txt(g, ctx, g.t('orders'), O.x + O.w / 2, O.y + (L.P ? 16 : 19), L.P ? 20 : 22, { color: '#fff6dc', stroke: 'rgba(60,30,5,.6)', strokeW: 4, maxW: O.w - 30 });
    const cards = orderCards(L, F.orders.length);
    F.orders.forEach((o, k) => {
      const R = cards[k], b = bump(S, 'o' + k, 0.4);
      ctx.save();
      ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.rotate(((k % 2) ? 0.012 : -0.01) + b * 0.03); ctx.scale(1 + b * 0.05, 1 + b * 0.05); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2);
      if (o.w != null) {
        ctx.fillStyle = 'rgba(255,248,230,.35)'; g.rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.fill();
        ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,248,230,.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        para(g, ctx, g.t('newOrder'), R.x + R.w / 2, R.y + R.h / 2 - 6, R.w - 20, L.P ? 16 : 17, 2, { color: '#fff6dc', weight: 700 });
        const dots = Math.floor(t * 3) % 4;
        for (let d = 0; d < 3; d++) { ctx.fillStyle = d < dots ? '#fff6dc' : 'rgba(255,246,220,.35)'; ctx.beginPath(); ctx.arc(R.x + R.w / 2 - 12 + d * 12, R.y + R.h - 16, 3.5, 0, 6.3); ctx.fill(); }
        ctx.restore();
        return;
      }
      const ok = canDeliver(F, k);
      ctx.fillStyle = 'rgba(40,20,5,.3)'; g.rr(ctx, R.x, R.y + 3, R.w, R.h, 10); ctx.fill();
      ctx.fillStyle = ok ? '#f2ffe6' : '#fff8e7'; g.rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.fill();
      if (ok) { ctx.strokeStyle = 'rgba(80,190,70,' + (0.6 + 0.4 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; g.rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.stroke(); }
      ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.arc(R.x + R.w / 2, R.y + 5, 4.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(R.x + R.w / 2 - 1.3, R.y + 3.7, 1.4, 0, 6.3); ctx.fill();
      // הפריטים
      // הפריטים: אייקון ומעליו/לידו כמה יש מתוך כמה צריך
      const n = o.it.length, wide = R.w > 200, B = orderBtns(g, R);
      const areaB = wide ? B.del.y - 4 : B.del.y - 26, top = R.y + 10, ah = areaB - top, stack = !wide || ah >= 60;
      const slot = (R.w - 24) / n;
      const isz = stack ? Math.min(wide ? 34 : 30, ah - 22, slot * 0.7) : Math.min(28, ah - 6, slot * 0.42);
      o.it.forEach(([id, need], m) => {
        const x = g.rtl ? R.x + R.w - 12 - slot * (m + 0.5) : R.x + 12 + slot * (m + 0.5), hv = have(F, id), en = hv >= need;
        const ix = stack ? x : x - slot * 0.22, iy = stack ? top + isz / 2 + 2 : top + ah / 2;
        const tx = stack ? x : x + slot * 0.2, ty = stack ? top + isz + 13 : top + ah / 2 + 1;
        drawItem(g, ctx, id, ix, iy, isz);
        txt(g, ctx, Math.min(hv, need) + '/' + need, tx, ty, wide ? 18 : 17, { color: en ? '#2f9e44' : '#8a5a2b', maxW: stack ? slot - 4 : slot * 0.5, dir: 'ltr' });
        if (en) { const cx2 = ix + isz * 0.42, cy2 = iy - isz * 0.32; ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.arc(cx2, cy2, 6.5, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx2 - 3, cy2); ctx.lineTo(cx2 - 0.5, cy2 + 2.5); ctx.lineTo(cx2 + 3.5, cy2 - 2.5); ctx.stroke(); }
      });
      // פרס וכפתורים
      const rw = wide ? R.w - B.del.w - 24 : R.w - 16;
      const ry = wide ? B.del.y + B.del.h / 2 : B.del.y - 14, rx = wide ? (g.rtl ? R.x + R.w - 12 - rw / 2 : R.x + 12 + rw / 2) : R.x + R.w / 2;
      const cs = String(o.c), xs = String(o.x);
      ctx.font = '800 18px ' + FONT;
      const w1 = ctx.measureText(cs).width, w2 = ctx.measureText(xs).width, tot = 18 + w1 + 12 + 18 + w2;
      const k2 = Math.min(1, rw / tot);
      ctx.save(); ctx.translate(rx, ry); ctx.scale(k2, k2);
      let xx = -tot / 2;
      coin(ctx, xx + 8, 0, 8); xx += 18; g.text(ctx, cs, xx + w1 / 2, 1, { size: 18, color: '#7a4f00' }); xx += w1 + 12;
      star(ctx, xx + 8, 0, 9, '#2bb5a0'); xx += 18; g.text(ctx, xs, xx + w2 / 2, 1, { size: 18, color: '#1f7a6c' });
      ctx.restore();
      button(g, ctx, B.del, '#3fa34d', g.t('deliver'), { off: !ok, size: 17, hot: ok && S.hover && S.hover.k === 'del' && S.hover.i === k, glow: ok ? 0.4 + 0.4 * Math.sin(t * 6) : 0 });
      // הפח (מחליף הזמנה)
      const X = B.x, hx = S.hover && S.hover.k === 'disc' && S.hover.i === k;
      ctx.fillStyle = hx ? '#e8402f' : 'rgba(150,110,70,.35)'; ctx.beginPath(); ctx.arc(X.x + X.w / 2, X.y + X.h / 2, 10, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X.x + X.w / 2 - 4, X.y + X.h / 2 - 4); ctx.lineTo(X.x + X.w / 2 + 4, X.y + X.h / 2 + 4); ctx.moveTo(X.x + X.w / 2 + 4, X.y + X.h / 2 - 4); ctx.lineTo(X.x + X.w / 2 - 4, X.y + X.h / 2 + 4); ctx.stroke();
      ctx.restore();
    });
  }

  // ---------- ציור: סרגל הכלים ----------
  function marketIcon(g, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-14, -4, 3, 16); ctx.fillRect(11, -4, 3, 16);
    ctx.fillStyle = '#c98b4f'; g.rr(ctx, -16, 3, 32, 9, 2); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#e8402f'; ctx.beginPath(); ctx.moveTo(-16 + i * 6.4, -12); ctx.lineTo(-16 + (i + 1) * 6.4, -12); ctx.lineTo(-16 + (i + 1) * 6.4, -4); ctx.arc(-16 + (i + 0.5) * 6.4, -4, 3.2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(-7, 2, 3.4, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.arc(0, 1.5, 3.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(7, 2, 3.4, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function shopIcon(g, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#fff3dc'; g.rr(ctx, -13, -7, 26, 21, 4); ctx.fill();
    ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -7, 7, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#2b8be6'; ctx.beginPath(); ctx.arc(0, 4, 6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-1.2, 0, 2.4, 8); ctx.fillRect(-4, 2.8, 8, 2.4);
    ctx.restore();
  }
  function drawBar(g, ctx, S, t) {
    const F = S.F, L = S.L;
    CROPS.forEach((c, i) => {
      const R = L.seedC[i], ownedC = F.crops.includes(c.id), lvOk = F.lv >= c.lv, sel = F.sel === c.id && ownedC;
      const hov = S.hover && S.hover.k === 'seed' && S.hover.i === i, b = bump(S, 'seed' + c.id, 0.3);
      ctx.save();
      const lift = sel ? -4 : hov ? -2 : 0;
      ctx.translate(R.x + R.w / 2, R.y + R.h / 2 + lift); ctx.scale(1 + b * 0.1, 1 + b * 0.1); ctx.translate(-R.w / 2, -R.h / 2);
      ctx.fillStyle = 'rgba(30,15,5,.4)'; g.rr(ctx, 0, 4 - lift, R.w, R.h, 12); ctx.fill();
      const cg = ctx.createLinearGradient(0, 0, 0, R.h);
      cg.addColorStop(0, sel ? '#fff4c2' : '#fbf1dc'); cg.addColorStop(1, sel ? '#f6cf55' : '#e2cfa8');
      ctx.fillStyle = cg; g.rr(ctx, 0, 0, R.w, R.h, 12); ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : 'rgba(90,55,20,.45)'; ctx.lineWidth = sel ? 3.5 : 2; ctx.stroke();
      if (sel) { ctx.save(); ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14; ctx.stroke(); ctx.restore(); }
      const isz = Math.min(R.w * 0.62, R.h * 0.5);
      ctx.globalAlpha = lvOk ? 1 : 0.35;
      drawItem(g, ctx, c.id, R.w / 2, R.h * 0.36, isz);
      ctx.globalAlpha = 1;
      const ly = R.h - (L.P ? 14 : 16);
      if (ownedC) {
        coin(ctx, R.w / 2 - 12, ly, 7.5);
        txt(g, ctx, c.seed, R.w / 2 + 6, ly + 1, L.P ? 18 : 19, { color: F.coins >= c.seed ? '#4a2a0a' : '#c92a2a', maxW: R.w / 2 - 6 });
        if (!g.touch && !L.P) txt(g, ctx, String(i + 1), 11, 12, 13, { color: 'rgba(90,55,20,.55)' });
      } else if (lvOk) {
        ctx.fillStyle = '#3fa34d'; g.rr(ctx, 5, ly - 11, R.w - 10, 22, 11); ctx.fill();
        coin(ctx, 16, ly, 7); txt(g, ctx, c.cost, R.w / 2 + 6, ly + 1, 16, { color: '#fff', maxW: R.w - 32 });
        ctx.fillStyle = '#3fa34d'; ctx.beginPath(); ctx.arc(R.w - 9, 9, 8, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(R.w - 13.5, 8, 9, 2.4); ctx.fillRect(R.w - 10.2, 4.7, 2.4, 9);
      } else {
        lock(g, ctx, R.w / 2, R.h * 0.36, 0.9);
        txt(g, ctx, g.t('lvN', { n: c.lv }), R.w / 2, ly + 1, 14, { color: '#6b4a2a', maxW: R.w - 8 });
      }
      ctx.restore();
    });
    // השוק והחנות
    const total = ITEMS.reduce((s, id) => s + have(F, id), 0);
    const bm = bump(S, 'mk', 0.3) + bump(S, 'market', 0.3);
    button(g, ctx, L.mk, '#f08c2a', g.t('market'), { icon: (x, y, s) => marketIcon(g, ctx, x, y, s * 1.1), size: L.P ? 22 : 24, hot: S.hover && S.hover.k === 'mk', press: bm, rtl: g.rtl });
    if (total > 0) badge(g, ctx, g.rtl ? L.mk.x + 10 : L.mk.x + L.mk.w - 10, L.mk.y + 8, String(total), '#e8402f');
    const any = canBuyAny(F);
    button(g, ctx, L.sh, '#2f8fd8', g.t('shop'), { icon: (x, y, s) => shopIcon(g, ctx, x, y, s * 1.1), size: L.P ? 22 : 24, hot: S.hover && S.hover.k === 'sh', press: bump(S, 'shop', 0.3), rtl: g.rtl, glow: any ? 0.3 + 0.3 * Math.sin(t * 4) : 0 });
    if (any) badge(g, ctx, g.rtl ? L.sh.x + 10 : L.sh.x + L.sh.w - 10, L.sh.y + 8, '!', '#3fa34d');
  }
  function badge(g, ctx, x, y, s, col) {
    ctx.font = '800 15px ' + FONT;
    const w = Math.max(24, ctx.measureText(s).width + 12);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.rr(ctx, x - w / 2, y - 11, w, 24, 12); ctx.fill();
    ctx.fillStyle = col; g.rr(ctx, x - w / 2, y - 12, w, 24, 12); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    g.text(ctx, s, x, y + 0.5, { size: 15, color: '#fff', dir: 'ltr' });
  }
  function canBuyAny(F) {
    const np = nextPlot(F);
    if (np && F.lv >= np.lv && F.coins >= np.cost) return true;
    for (const c of CROPS) if (!F.crops.includes(c.id) && F.lv >= c.lv && F.coins >= c.cost) return true;
    for (const kind of ['chicken', 'cow']) { const n = nextAnimal(F, kind); if (n && F.lv >= n.lv && F.coins >= n.cost) return true; }
    for (const u of UPS) if (!F.up[u.id] && F.lv >= u.lv && F.coins >= u.cost) return true;
    return false;
  }

  // ---------- חלונות: שוק, חנות, אישור, עלייה ברמה ----------
  function panelFrame(g, ctx, S, R, title, t, noBack) {
    const q = Math.min(1, (S.anim - (S.panelT || 0)) / 0.22), e = g.ease.back(q);
    if (!noBack) { ctx.fillStyle = 'rgba(25,15,5,' + (0.5 * q) + ')'; ctx.fillRect(0, 0, S.L.W, S.L.H); }
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2);
    ctx.globalAlpha = q;
    ctx.fillStyle = 'rgba(30,15,5,.45)'; g.rr(ctx, R.x, R.y + 6, R.w, R.h, 22); ctx.fill();
    const bg = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); bg.addColorStop(0, '#fff6e0'); bg.addColorStop(1, '#f3dfb6');
    ctx.fillStyle = bg; g.rr(ctx, R.x, R.y, R.w, R.h, 22); ctx.fill();
    ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 5; g.rr(ctx, R.x + 2.5, R.y + 2.5, R.w - 5, R.h - 5, 20); ctx.stroke();
    if (title) {
      const tw = Math.min(R.w - 140, 360), tx = R.x + R.w / 2;
      ctx.fillStyle = '#c0392b'; g.rr(ctx, tx - tw / 2, R.y - 14, tw, 52, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; g.rr(ctx, tx - tw / 2 + 4, R.y - 10, tw - 8, 20, 10); ctx.fill();
      txt(g, ctx, title, tx, R.y + 12, 30, { color: '#fff', stroke: 'rgba(80,10,5,.45)', strokeW: 4, maxW: tw - 24 });
    }
  }
  function closeR(g, S) { const P = S.L.panel; return rect(g.rtl ? P.x + 12 : P.x + P.w - 12 - 48, P.y + 12, 48, 48); }
  function drawClose(g, ctx, S) {
    const R = closeR(g, S), hv = S.hover && S.hover.k === 'close';
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(R.x + 24, R.y + 27, 21, 0, 6.3); ctx.fill();
    ctx.fillStyle = hv ? '#ff6b5a' : '#e8402f'; ctx.beginPath(); ctx.arc(R.x + 24, R.y + 24, 21, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R.x + 16, R.y + 16); ctx.lineTo(R.x + 32, R.y + 32); ctx.moveTo(R.x + 32, R.y + 16); ctx.lineTo(R.x + 16, R.y + 32); ctx.stroke();
  }
  // השוק: כרטיס לכל דבר שאפשר למכור
  function marketCards(g, S) {
    const F = S.F, P = S.L.panel, items = ITEMS.filter(id => known(F, id));
    const cols = S.L.P ? 2 : 3, maxRows = S.L.P ? 5 : 3, gap = 12, top = P.y + 74;
    const cw = (P.w - 40 - gap * (cols - 1)) / cols, ch = Math.min(150, (P.y + P.h - 20 - top - gap * (maxRows - 1)) / maxRows);
    return items.map((id, k) => {
      const c = k % cols, r = Math.floor(k / cols), cc = g.rtl ? cols - 1 - c : c;
      const R = rect(P.x + 20 + cc * (cw + gap), top + r * (ch + gap), cw, ch);
      const bw1 = Math.round((R.w - 30) * 0.4), bh = 40;
      const b1 = rect(g.rtl ? R.x + R.w - 10 - bw1 : R.x + 10, R.y + R.h - bh - 10, bw1, bh);
      const b2 = rect(g.rtl ? R.x + 10 : R.x + 20 + bw1, R.y + R.h - bh - 10, R.w - 30 - bw1, bh);
      return { id, R, b1, b2 };
    });
  }
  function drawMarket(g, ctx, S, t) {
    const F = S.F, P = S.L.panel;
    ctx.save();
    panelFrame(g, ctx, S, P, g.t('market'), t);
    const cards = marketCards(g, S);
    if (!cards.some(c => have(F, c.id) > 0)) para(g, ctx, g.t('empty'), P.x + P.w / 2, P.y + P.h - 40, P.w - 140, 19, 2, { color: '#8a5a2b', weight: 700 });
    for (const c of cards) {
      const R = c.R, n = have(F, c.id), hot = F.hot === c.id, rtl = g.rtl;
      ctx.fillStyle = 'rgba(120,80,30,.18)'; g.rr(ctx, R.x, R.y + 3, R.w, R.h, 14); ctx.fill();
      ctx.fillStyle = hot ? '#fff1d6' : '#fffaf0'; g.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.fill();
      ctx.strokeStyle = hot ? '#ff8a2a' : 'rgba(160,112,58,.45)'; ctx.lineWidth = hot ? 3 : 2; ctx.stroke();
      const ix = rtl ? R.x + R.w - 44 : R.x + 44, iy = R.y + 42;
      ctx.fillStyle = 'rgba(200,160,100,.18)'; ctx.beginPath(); ctx.arc(ix, iy, 31, 0, 6.3); ctx.fill();
      drawItem(g, ctx, c.id, ix, iy, 48);
      const tx = rtl ? R.x + R.w - 86 : R.x + 86, al = rtl ? 'right' : 'left', tw = R.w - 98;
      txt(g, ctx, g.t(c.id), tx, R.y + 24, 21, { align: al, color: '#4a2a0a', maxW: tw });
      txt(g, ctx, '×' + n, tx, R.y + 52, 22, { align: al, color: n ? '#1f6f8b' : '#a89880', maxW: tw / 2, dir: 'ltr' });
      // מחיר ליחידה
      const pr = sellPrice(F, c.id), ps = String(pr);
      ctx.font = '800 19px ' + FONT;
      const pw = ctx.measureText(ps).width, px = rtl ? R.x + 14 + 8 : R.x + R.w - 14 - pw - 18;
      coin(ctx, px + 8, R.y + 53, 8); g.text(ctx, ps, px + 18 + pw / 2, R.y + 54, { size: 19, color: hot ? '#d9480f' : '#7a4f00' });
      if (hot) {
        const hx = rtl ? R.x + 16 : R.x + R.w - 16;
        ctx.save(); ctx.translate(hx, R.y + 14); ctx.rotate(rtl ? -0.2 : 0.2);
        txt(g, ctx, g.t('hot'), 0, 6, 15, { align: rtl ? 'left' : 'right', color: '#fff', stroke: '#d9480f', strokeW: 4, maxW: R.w * 0.5 });
        ctx.restore();
      }
      const h1 = S.hover && S.hover.k === 'sell1' && S.hover.id === c.id, h2 = S.hover && S.hover.k === 'sellAll' && S.hover.id === c.id;
      button(g, ctx, c.b1, '#f08c2a', g.t('sell1'), { off: !n, size: 17, hot: h1 });
      button(g, ctx, c.b2, '#3fa34d', g.t('sellAll') + (n ? ' +' + n * pr : ''), { off: !n, size: 17, hot: h2 });
    }
    if (S.sold && S.anim - S.sold.t < 0.9) {
      const q = (S.anim - S.sold.t) / 0.9, c = cards.find(x => x.id === S.sold.id);
      if (c) txt(g, ctx, '+' + S.sold.v, c.R.x + c.R.w / 2, c.R.y + 20 - q * 30, 26, { color: '#ffd84d', stroke: 'rgba(80,40,0,.6)', strokeW: 5, alpha: 1 - q });
    }
    drawClose(g, ctx, S);
    ctx.restore();
  }
  // החנות: שלוש לשוניות, כרטיס לכל דבר שאפשר לקנות
  const TABS = ['tabSeeds', 'tabFarm', 'tabTools'];
  function shopOffers(S) {
    if (S.tab === 0) return CROPS.filter(c => c.cost).map(c => ({ kind: 'crop', arg: c.id }));
    if (S.tab === 1) return [{ kind: 'plot' }, { kind: 'chicken' }, { kind: 'cow' }];
    return UPS.map(u => ({ kind: 'up', arg: u.id }));
  }
  function shopLayout(g, S) {
    const P = S.L.panel, tw = Math.min(200, (P.w - 60) / 3), tabs = [];
    for (let k = 0; k < 3; k++) { const kk = g.rtl ? 2 - k : k; tabs.push(rect(P.x + P.w / 2 - (tw * 3 + 16) / 2 + kk * (tw + 8), P.y + 58, tw, 44)); }
    const offers = shopOffers(S), cols = S.L.P ? 2 : 3, rows = S.L.P ? 3 : 2, gap = 12, top = P.y + 116;
    const cw = (P.w - 40 - gap * (cols - 1)) / cols, ch = (P.y + P.h - 20 - top - gap * (rows - 1)) / rows;
    const cards = offers.map((o, k) => {
      const c = k % cols, r = Math.floor(k / cols), cc = g.rtl ? cols - 1 - c : c;
      const R = rect(P.x + 20 + cc * (cw + gap), top + r * (ch + gap), cw, ch);
      return Object.assign({ R, btn: rect(R.x + 12, R.y + R.h - 52, R.w - 24, 42) }, o);
    });
    return { tabs, cards };
  }
  function offerState(g, S, c) {
    const F = S.F;
    if (c.kind === 'crop' && F.crops.includes(c.arg)) return { done: g.t('owned') };
    if (c.kind === 'up' && F.up[c.arg]) return { done: g.t('owned') };
    const o = offer(g, c);
    if (!o) return { done: g.t('full') };
    return o;
  }
  function drawShop(g, ctx, S, t) {
    const F = S.F, P = S.L.panel;
    ctx.save();
    panelFrame(g, ctx, S, P, g.t('shop'), t);
    const Ly = shopLayout(g, S);
    Ly.tabs.forEach((R, k) => {
      const on = S.tab === k, hv = S.hover && S.hover.k === 'tab' && S.hover.i === k;
      ctx.fillStyle = on ? '#c0392b' : hv ? '#e9c88f' : '#dcc092'; g.rr(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
      txt(g, ctx, g.t(TABS[k]), R.x + R.w / 2, R.y + R.h / 2 + 1, 20, { color: on ? '#fff' : '#5a3a1a', maxW: R.w - 14 });
    });
    for (const c of Ly.cards) {
      const R = c.R, st = offerState(g, S, c), hv = S.hover && S.hover.k === 'offer' && S.hover.id === (c.kind + (c.arg || ''));
      ctx.fillStyle = 'rgba(120,80,30,.18)'; g.rr(ctx, R.x, R.y + 3, R.w, R.h, 14); ctx.fill();
      ctx.fillStyle = '#fffaf0'; g.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(160,112,58,.45)'; ctx.lineWidth = 2; ctx.stroke();
      const icon = c.kind === 'crop' ? c.arg : c.kind === 'up' ? c.arg : c.kind;
      const name = c.kind === 'crop' ? g.t(c.arg) : g.t(c.kind === 'up' ? c.arg : c.kind);
      const desc = c.kind === 'crop' ? g.t('seedD', { t: tm(growT(F, c.arg)), p: CROP[c.arg].price }) : g.t((c.kind === 'up' ? c.arg : c.kind) + 'D');
      const isz = Math.min(56, R.h * 0.3);
      ctx.globalAlpha = st.done || F.lv >= st.lv ? 1 : 0.45;
      drawItem(g, ctx, icon, R.x + R.w / 2, R.y + 12 + isz / 2, isz);
      ctx.globalAlpha = 1;
      txt(g, ctx, name, R.x + R.w / 2, R.y + isz + 30, 21, { color: '#4a2a0a', maxW: R.w - 20 });
      const dTop = R.y + isz + 46, dBot = c.btn.y - 6;
      para(g, ctx, desc, R.x + R.w / 2, (dTop + dBot) / 2, R.w - 22, 16, Math.max(1, Math.floor((dBot - dTop) / 19)), { color: '#7a5a3a', weight: 600 });
      if (st.done) { ctx.fillStyle = '#d9ecd2'; g.rr(ctx, c.btn.x, c.btn.y, c.btn.w, c.btn.h, 12); ctx.fill(); txt(g, ctx, '✓ ' + st.done, c.btn.x + c.btn.w / 2, c.btn.y + c.btn.h / 2 + 1, 19, { color: '#2f7a3a', maxW: c.btn.w - 12 }); }
      else if (F.lv < st.lv) { ctx.fillStyle = '#e6dccb'; g.rr(ctx, c.btn.x, c.btn.y, c.btn.w, c.btn.h, 12); ctx.fill(); lock(g, ctx, c.btn.x + c.btn.w / 2 - 44, c.btn.y + c.btn.h / 2, 0.8); txt(g, ctx, g.t('lvN', { n: st.lv }), c.btn.x + c.btn.w / 2 + 12, c.btn.y + c.btn.h / 2 + 1, 18, { color: '#6b5a4a', maxW: c.btn.w - 70 }); }
      else button(g, ctx, c.btn, '#3fa34d', String(st.cost), { off: F.coins < st.cost, size: 20, hot: hv, icon: (x, y, s) => coin(ctx, x, y, 9 * s) });
    }
    drawClose(g, ctx, S);
    ctx.restore();
  }
  function confirmLayout(g, S) {
    const L = S.L, w = L.P ? 500 : 460, h = 300, R = rect(L.W / 2 - w / 2, L.H / 2 - h / 2, w, h);
    const bw = (w - 60) / 2;
    return { R, yes: rect(g.rtl ? R.x + R.w - 20 - bw : R.x + 20, R.y + h - 70, bw, 52), no: rect(g.rtl ? R.x + 20 : R.x + R.w - 20 - bw, R.y + h - 70, bw, 52) };
  }
  function drawConfirm(g, ctx, S, t) {
    const F = S.F, c = S.confirm, o = offer(g, c);
    if (!o) { S.panel = null; return; }
    const Ly = confirmLayout(g, S), R = Ly.R;
    ctx.save();
    panelFrame(g, ctx, S, R, null, t);
    drawItem(g, ctx, o.icon, R.x + R.w / 2, R.y + 58, 64);
    txt(g, ctx, o.name, R.x + R.w / 2, R.y + 116, 26, { color: '#4a2a0a', maxW: R.w - 40 });
    para(g, ctx, o.desc, R.x + R.w / 2, R.y + 156, R.w - 50, 18, 2, { color: '#7a5a3a', weight: 600 });
    const ok = F.coins >= o.cost && F.lv >= o.lv;
    button(g, ctx, Ly.yes, '#3fa34d', F.lv < o.lv ? g.t('lvN', { n: o.lv }) : g.t('buy') + '  ' + o.cost, { off: !ok, size: 22, hot: S.hover && S.hover.k === 'yes', icon: F.lv < o.lv ? null : (x, y, s) => coin(ctx, x, y, 10 * s), rtl: g.rtl });
    button(g, ctx, Ly.no, '#9c8a76', g.t('cancel'), { size: 21, hot: S.hover && S.hover.k === 'no' });
    ctx.restore();
  }
  function lvLayout(S) {
    const L = S.L, w = 520, h = L.P ? 560 : 480, R = rect(L.W / 2 - w / 2, L.H / 2 - h / 2, w, h);
    return { R, ok: rect(R.x + w / 2 - 110, R.y + h - 76, 220, 56) };
  }
  function drawLevelUp(g, ctx, S, t) {
    const lv = S.lvShow, Ly = lvLayout(S), R = Ly.R;
    ctx.save();
    const q = Math.min(1, (S.anim - (S.panelT || 0)) / 0.22);
    ctx.fillStyle = 'rgba(25,15,5,' + (0.55 * q) + ')'; ctx.fillRect(0, 0, S.L.W, S.L.H);
    // קרני אור
    ctx.save(); ctx.translate(R.x + R.w / 2, R.y + 70); ctx.rotate(t * 0.4); ctx.globalAlpha = 0.35 * q;
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffd84d'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -Math.max(R.w, R.h)); ctx.lineTo(30, -Math.max(R.w, R.h)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    panelFrame(g, ctx, S, R, null, t, true);
    star(ctx, R.x + R.w / 2, R.y + 54, 44, '#ffc61a');
    star(ctx, R.x + R.w / 2, R.y + 54, 32, '#ffe27a');
    txt(g, ctx, String(lv), R.x + R.w / 2, R.y + 57, 30, { color: '#8a5200', dir: 'ltr' });
    txt(g, ctx, g.t('levelUp', { n: lv }), R.x + R.w / 2, R.y + 122, 38, { color: '#c0392b', stroke: '#fff', strokeW: 6, maxW: R.w - 40 });
    const un = unlocksAt(lv);
    let y = R.y + 166;
    if (un.length) {
      txt(g, ctx, g.t('newThings'), R.x + R.w / 2, y, 19, { color: '#7a5a3a', weight: 700, maxW: R.w - 40 }); y += 20;
      const rowH = Math.min(52, (Ly.ok.y - 54 - y) / un.length);
      un.forEach((u, k) => {
        const yy = y + rowH * (k + 0.5), label = u.key === 'unlockCrop' ? cap(g.t('unlockCrop', { name: nameIn(g, u.name) })) : g.t(u.key);
        ctx.font = '800 21px ' + FONT;
        const lw = Math.min(R.w - 120, ctx.measureText(label).width), tot = 40 + 10 + lw, x0 = R.x + R.w / 2 - tot / 2;
        const ix = g.rtl ? x0 + tot - 20 : x0 + 20, tx = g.rtl ? x0 + lw / 2 : x0 + 50 + lw / 2;
        drawItem(g, ctx, u.icon, ix, yy, Math.min(36, rowH - 6));
        txt(g, ctx, label, tx, yy + 1, 21, { color: '#4a2a0a', maxW: R.w - 120 });
      });
    }
    const rs = '+' + lvReward(lv);
    ctx.font = '800 24px ' + FONT;
    const rw = ctx.measureText(rs).width, rx = R.x + R.w / 2, ry = Ly.ok.y - 26;
    coin(ctx, rx - rw / 2 - 6, ry, 11); g.text(ctx, rs, rx + 10, ry + 1, { size: 24, color: '#7a4f00' });
    button(g, ctx, Ly.ok, '#3fa34d', g.t('cont'), { size: 24, hot: S.hover && S.hover.k === 'lvok', glow: 0.3 + 0.3 * Math.sin(t * 5) });
    ctx.restore();
  }

  // ---------- הדרכה, טיפים ----------
  const isRipe = (F, p) => p.s === 2 && p.w && p.g >= growT(F, p.c);
  // ההדרכה מתקדמת לפי מה שקורה בחווה (בצעד, לא בציור)
  function tutStep(S) {
    const F = S.F;
    if (F.tut === 2 && !F.plots.some(p => p.s === 2 && !p.w)) F.tut = 3;
    if (F.tut === 3 && F.plots.some(p => isRipe(F, p))) F.tut = 4;
    if (F.tut === 4 && F.orders.some((o, k) => canDeliver(F, k))) F.tut = 5;
    if (F.tut === 6 && (S.tut6T -= DT) <= 0) { F.tut = 0; S.dirty = true; }
  }
  function tutTarget(g, S) {
    const F = S.F, L = S.L;
    if (!F.tut || S.panel) return null;
    const tk = g.touch ? 't' : '';
    const ripe = () => { const r = F.plots.findIndex(p => isRipe(F, p)); return r >= 0 ? { key: 'tut4' + tk, R: L.plots[r] } : { key: 'tut3', R: null }; };
    if (F.tut === 1) { const i = F.plots.findIndex(p => p.s === 1); return { key: 'tut1' + tk, R: i >= 0 ? L.plots[i] : null }; }
    if (F.tut === 2) { const i = F.plots.findIndex(p => p.s === 2 && !p.w); return { key: 'tut2' + tk, R: i >= 0 ? L.plots[i] : null }; }
    if (F.tut === 3) return { key: 'tut3', R: null };
    if (F.tut === 4) return ripe();
    if (F.tut === 5) {
      const k = F.orders.findIndex((o, kk) => canDeliver(F, kk));
      return k >= 0 ? { key: 'tut5', R: orderBtns(g, orderCards(L, F.orders.length)[k]).del } : ripe();
    }
    if (F.tut === 6) return { key: 'tut6', R: null };
    return null;
  }
  function drawBanner(g, ctx, S, s, t) {
    const L = S.L, maxW = L.W - 40;
    ctx.font = '800 20px ' + FONT;
    const one = ctx.measureText(s).width <= maxW - 40;
    const lines = one ? [s] : wrap(ctx, s, 18, maxW - 40, 800).slice(0, 2);
    const sz = one ? 20 : 18;
    ctx.font = '800 ' + sz + 'px ' + FONT;
    const tw = Math.min(maxW - 40, Math.max(...lines.map(x => ctx.measureText(x).width))), bw = tw + 40, bh = one ? 40 : 56;
    const x = L.W / 2 - bw / 2, y = Math.max(3, L.top.h / 2 - bh / 2 + 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.rr(ctx, x, y + 3, bw, bh, 20); ctx.fill();
    ctx.fillStyle = 'rgba(45,30,15,.92)'; g.rr(ctx, x, y, bw, bh, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,130,' + (0.6 + 0.3 * Math.sin(t * 4)) + ')'; ctx.lineWidth = 2.5; ctx.stroke();
    lines.forEach((ln, i) => txt(g, ctx, ln, L.W / 2, y + bh / 2 + 1 + (i - (lines.length - 1) / 2) * 22, sz, { color: '#ffe8a3', maxW: maxW - 40 }));
  }
  function arrowAt(ctx, x, y, t) {
    const b = Math.sin(t * 7) * 6;
    ctx.save(); ctx.translate(x, y + b);
    ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, -17); ctx.lineTo(-6, -17); ctx.lineTo(-6, -34); ctx.lineTo(6, -34); ctx.lineTo(6, -17); ctx.lineTo(15, -17); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // טיפ שמופיע מעל דבר שמצביעים עליו
  function tipFor(g, S, h) {
    const F = S.F;
    if (!h) return null;
    if (h.k === 'plot') {
      const P = F.plots[h.i];
      if (P.s !== 2) return null;
      const T = growT(F, P.c), nm = g.t(P.c);
      if (!P.w) return nm + ' · ' + g.t('needsWater');
      return P.g >= T ? nm + ' · ' + g.t('ready') : nm + ' · ' + g.t('readyIn', { t: tm(T - P.g) });
    }
    if (h.k === 'chicken' || h.k === 'cow') {
      const a = F[h.k + 's'][h.i], A = ANIM[h.k];
      if (!a) return null;
      if (a.s === 0) return g.t(h.k) + ' · ' + g.t('wants', { item: nameIn(g, A.feed) });
      if (a.s === 1) return g.t(h.k) + ' · ' + g.t('readyIn', { t: tm(A.t - a.g) });
      return g.t(A.prod) + ' · ' + g.t('ready');
    }
    if (h.k === 'seed') {
      const c = CROPS[h.i];
      return g.t(c.id) + ' · ' + g.t('seedD', { t: tm(growT(F, c.id)), p: c.price });
    }
    return null;
  }
  function drawTip(g, ctx, S, s, x, y) {
    const L = S.L;
    ctx.font = '800 17px ' + FONT;
    const w = Math.min(L.W - 20, ctx.measureText(s).width + 26), h = 32;
    let bx = Math.max(10, Math.min(L.W - 10 - w, x - w / 2)), by = y - h - 12;
    if (by < 4) by = y + 18;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.rr(ctx, bx, by + 3, w, h, 12); ctx.fill();
    ctx.fillStyle = 'rgba(40,28,14,.94)'; g.rr(ctx, bx, by, w, h, 12); ctx.fill();
    txt(g, ctx, s, bx + w / 2, by + h / 2 + 1, 17, { color: '#fff6dc', maxW: w - 16 });
  }

  // ---------- מה יש מתחת לנקודה ----------
  function hitFarm(g, S, p) {
    const F = S.F, L = S.L;
    for (let i = 0; i < NPLOTS; i++) if (inR(p, L.plots[i])) return { k: 'plot', i };
    for (let j = 0; j < L.chick.length; j++) if (inR(p, L.chick[j]) && (F.chickens[j] || j === F.chickens.length)) return { k: 'chicken', i: j };
    for (let j = 0; j < L.cowc.length; j++) if (inR(p, L.cowc[j]) && (F.cows[j] || j === F.cows.length)) return { k: 'cow', i: j };
    const cards = orderCards(L, F.orders.length);
    for (let k = 0; k < cards.length; k++) {
      if (!F.orders[k].it) continue;
      const B = orderBtns(g, cards[k]);
      if (inR(p, { x: B.x.x - 4, y: B.x.y - 4, w: B.x.w + 8, h: B.x.h + 8 })) return { k: 'disc', i: k };
      if (inR(p, B.del)) return { k: 'del', i: k };
    }
    for (let i = 0; i < CROPS.length; i++) if (inR(p, L.seedC[i])) return { k: 'seed', i };
    if (inR(p, L.mk)) return { k: 'mk' };
    if (inR(p, L.sh)) return { k: 'sh' };
    return null;
  }
  function hitPanel(g, S, p) {
    if (S.panel === 'levelup') return inR(p, lvLayout(S).ok) ? { k: 'lvok' } : { k: 'bg' };
    if (S.panel === 'confirm') { const Ly = confirmLayout(g, S); if (inR(p, Ly.yes)) return { k: 'yes' }; if (inR(p, Ly.no)) return { k: 'no' }; return inR(p, Ly.R) ? { k: 'in' } : { k: 'out' }; }
    if (inR(p, closeR(g, S))) return { k: 'close' };
    if (S.panel === 'market') {
      for (const c of marketCards(g, S)) { if (inR(p, c.b1)) return { k: 'sell1', id: c.id }; if (inR(p, c.b2)) return { k: 'sellAll', id: c.id }; }
    } else if (S.panel === 'shop') {
      const Ly = shopLayout(g, S);
      for (let k = 0; k < 3; k++) if (inR(p, Ly.tabs[k])) return { k: 'tab', i: k };
      for (const c of Ly.cards) if (inR(p, c.btn)) return { k: 'offer', id: c.kind + (c.arg || ''), c };
    }
    return inR(p, S.L.panel) ? { k: 'in' } : { k: 'out' };
  }
  // פעולה על חלקה או חיה, גם בגרירה
  function applyMode(g, S, h, mode) {
    if (h.k === 'plot') {
      if (mode === 'plant') return act.plant(g, h.i);
      if (mode === 'water') return act.water(g, h.i);
      if (mode === 'harvest') return act.harvest(g, h.i);
    } else if (h.k === 'chicken' || h.k === 'cow') {
      if (mode === 'feed') return act.feed(g, h.k, h.i);
      if (mode === 'collect') return act.collect(g, h.k, h.i);
    }
    return false;
  }
  function pointerDown(g, S, p) {
    const F = S.F;
    if (S.panel) {
      const h = hitPanel(g, S, p);
      if (S.panel === 'levelup') { if (h.k === 'lvok' || S.anim - S.panelT > 0.6) { act.close(g); S.lvShow = null; g.sfx('click'); } return; }
      if (h.k === 'close' || h.k === 'out' || h.k === 'no') { act.close(g); g.sfx('click', { p: 0.9 }); return; }
      if (h.k === 'yes') { const c = S.confirm; if (act.buy(g, c.kind, c.arg)) act.close(g); return; }
      if (h.k === 'sell1') { act.sell(g, h.id, false); return; }
      if (h.k === 'sellAll') { act.sell(g, h.id, true); return; }
      if (h.k === 'tab') { act.tab(g, h.i); return; }
      if (h.k === 'offer') { act.buy(g, h.c.kind, h.c.arg); return; }
      return;
    }
    const h = hitFarm(g, S, p);
    if (!h) return;
    if (h.k === 'plot') {
      const mode = act.plotMode(g, h.i);
      if (mode === 'buy') { act.ask(g, { kind: 'plot', arg: h.i }); return; }
      if (mode === 'info') { S.tip = { s: tipFor(g, S, h), x: p.x, y: p.y, t: 2 }; g.sfx('tick'); return; }
      S.drag = { mode, seen: new Set(['plot' + h.i]) };
      applyMode(g, S, h, mode);
      return;
    }
    if (h.k === 'chicken' || h.k === 'cow') {
      const mode = act.animalMode(g, h.k, h.i);
      if (mode === 'buy') { act.ask(g, { kind: h.k }); return; }
      if (mode === 'info' || !mode) { S.tip = { s: tipFor(g, S, h), x: p.x, y: p.y, t: 2 }; g.sfx('tick'); return; }
      S.drag = { mode, seen: new Set([h.k + h.i]) };
      applyMode(g, S, h, mode);
      return;
    }
    if (h.k === 'del') { if (!act.deliver(g, h.i)) err(g, 'missing'); return; }
    if (h.k === 'disc') { act.discard(g, h.i); return; }
    if (h.k === 'seed') { if (act.select(g, CROPS[h.i].id) && g.touch) S.tip = { s: tipFor(g, S, h), x: p.x, y: S.L.seeds.y, t: 2.2 }; return; }
    if (h.k === 'mk') { act.open(g, 'market'); return; }
    if (h.k === 'sh') { act.open(g, 'shop'); return; }
    void F;
  }

  // ---------- הרישום ----------
  GK.register('farm', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 1000 : 600; },
    bg: '#3d2a17', accent: '#ffcf4d',
    noBest: true,
    text: TXT,

    init(g) {
      const L = layout(g.W, g.H);
      let F = loadFarm(g), demo = !!g.demo;
      SUM = F ? { lv: F.lv, c: F.coins } : null;
      if (demo && !F) F = showcaseFarm();
      if (!F) F = freshFarm();
      const S = g.s = {
        F, L, demo, anim: 0, panel: null, tab: 0, confirm: null, lvq: [], lvShow: null, panelT: 0,
        drag: null, fly: [], can: [], pop: {}, tip: null, hover: null, sold: null,
        dirty: false, saveT: 1, botT: 0.5, rescueT: 4, feedT: 0.6, tut6T: F.tut === 6 ? 6 : 0, ripeT: 0, errT: -9,
      };
      if (!demo) {
        const away = (Date.now() - (F.t || Date.now())) / 1000;
        if (away > 3) {
          const n = advance(F, Math.min(3 * 3600, away));
          if (n > 0 && away > 20) g.after(0.6, () => g.msg(g.t('welcome'), 1800, '#c6f6a6'));
        }
        if (!F.hot || F.hotT <= 0) { const av = availItems(F); F.hot = av[Math.floor(Math.random() * av.length)]; F.hotT = 120; }
        saveFarm(g);
      }
    },

    step(g) {
      const S = g.s, F = S.F;
      S.anim += DT;
      // גידול
      let ripe = 0;
      for (let i = 0; i < NPLOTS; i++) {
        const P = F.plots[i];
        if (P.s !== 2 || !P.w) continue;
        const T = growT(F, P.c);
        if (P.g < T) { P.g += DT; if (P.g >= T) { P.g = T; ripe++; const [x, y] = center(S.L.plots[i]); g.burst(x, y - 10, { n: 10, color: ['#fffbe0', CROP[P.c].col], speed: 1.6, life: 30, gravity: -0.02 }); S.pop['p' + i] = S.anim; } }
      }
      if (ripe && S.anim - S.ripeT > 0.4) { S.ripeT = S.anim; g.tone({ f: 1320, f2: 1760, dur: 0.08, type: 'triangle', vol: 0.06 }); }
      // חיות
      for (const kind of ['chicken', 'cow']) {
        const A = ANIM[kind];
        F[kind + 's'].forEach((a, j) => {
          if (a.s !== 1) return;
          a.g += DT;
          if (a.g >= A.t) { a.s = 2; a.g = 0; S.pop[kind + j] = S.anim; S.dirty = true; if (kind === 'chicken') g.tone({ f: 700, f2: 1050, dur: 0.07, type: 'square', vol: 0.045 }); else g.tone({ f: 520, f2: 780, dur: 0.12, type: 'triangle', vol: 0.08 }); }
        });
      }
      // מאכיל אוטומטי
      if (F.up.feeder && (S.feedT -= DT) <= 0) {
        S.feedT = 0.8;
        outer: for (const kind of ['chicken', 'cow']) for (let j = 0; j < F[kind + 's'].length; j++) if (F[kind + 's'][j].s === 0 && have(F, ANIM[kind].feed) > 0) { act.feed(g, kind, j); break outer; }
      }
      // הזמנות חדשות ומחיר חם
      F.orders.forEach((o, k) => { if (o.w != null && (o.w -= DT) <= 0) { F.orders[k] = genOrder(F); S.pop['o' + k] = S.anim; g.sfx('pop', { p: 0.8 }); S.dirty = true; } });
      if ((F.hotT -= DT) <= 0) { const av = availItems(F).filter(id => id !== F.hot); F.hot = av.length ? av[Math.floor(Math.random() * av.length)] : F.hot; F.hotT = 120; S.dirty = true; }
      // לא נתקעים: בלי כסף, בלי יבול ובלי מה למכור — שכן עוזר
      if ((S.rescueT -= DT) <= 0) {
        S.rescueT = 3;
        const growing = F.plots.some(p => p.s === 2), val = ITEMS.reduce((s, id) => s + have(F, id) * priceOf(id), 0), busy = [...F.chickens, ...F.cows].some(a => a.s !== 0);
        if (F.coins < 2 && !growing && val < 2 && !busy) { F.coins += 12; g.msg(g.t('gift', { n: 12 }), 1600, '#ffe066'); g.sfx('coin'); S.dirty = true; }
      }
      // הדרכה, וחלון אישור שכבר אין מה לקנות בו
      tutStep(S);
      if (S.panel === 'confirm' && (!S.confirm || !offer(g, S.confirm))) act.close(g);
      // עלייה ברמה
      if (S.lvq.length && !S.panel && !S.drag) { S.lvShow = S.lvq.shift(); S.panel = 'levelup'; S.panelT = S.anim; g.sfx('win'); g.burst(S.L.W / 2, S.L.H / 2 - 60, { n: 50, color: ['#ffd84d', '#ff6b6b', '#8ff0d2', '#c3a6ff', '#ffffff'], speed: 6, life: 60, gravity: 0.12 }); saveFarm(g); }
      // אנימציות קטנות
      for (const f of S.fly) f.t += DT;
      while (S.fly.length && S.fly[0].t >= S.fly[0].dur) { S.fly.shift(); S.pop.mk = S.anim; }
      for (const c of S.can) c.t += DT;
      while (S.can.length && S.can[0].t >= 0.7) S.can.shift();
      if (S.tip && (S.tip.t -= DT) <= 0) S.tip = null;
      // שמירה
      S.saveT -= DT;
      if ((S.dirty && S.saveT < 6.5) || S.saveT <= 0) saveFarm(g);
      // מה העכבר מצביע עליו
      S.hover = null;
      if (!g.touch && g.ptr.over) S.hover = S.panel ? hitPanel(g, S, g.ptr) : hitFarm(g, S, g.ptr);
      let cur = 'default';
      if (S.hover) {
        const k = S.hover.k;
        if (k === 'plot') { const m = act.plotMode(g, S.hover.i); if (m && m !== 'info') cur = 'pointer'; }
        else if (k === 'chicken' || k === 'cow') { const m = act.animalMode(g, k, S.hover.i); if (m && m !== 'info') cur = 'pointer'; }
        else if (k !== 'in' && k !== 'out' && k !== 'bg') cur = 'pointer';
      }
      if (g.canvas.style.cursor !== cur) g.canvas.style.cursor = cur;
      g.hud([[g.t('coins'), F.coins, '#ffd166'], [g.t('lvl'), F.lv, '#c9b3ff'], [g.t('xp'), Math.floor(F.xp) + '/' + xpNeed(F.lv), '#8ff0d2']]);
    },

    idle(g) { if (g.s) g.s.anim += DT; },

    bot(g) { botStep(g); },

    onKey(g, e) {
      const S = g.s;
      if (S.panel) { if (e.code === 'Enter' || e.code === 'Space') { if (S.panel === 'levelup') { act.close(g); S.lvShow = null; } else if (S.panel === 'confirm') { const c = S.confirm; if (act.buy(g, c.kind, c.arg)) act.close(g); } else act.close(g); } return; }
      const m = /^Digit([1-7])$/.exec(e.code);
      if (m) act.select(g, CROPS[+m[1] - 1].id);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') { if (p.button === 2) { act.close(g); return; } pointerDown(g, S, p); return; }
      if (type === 'up') { S.drag = null; return; }
      if (type === 'move' && S.drag && p.down && !S.panel) {
        const h = hitFarm(g, S, p);
        if (!h || (h.k !== 'plot' && h.k !== 'chicken' && h.k !== 'cow')) return;
        const key = h.k + h.i;
        if (S.drag.seen.has(key)) return;
        S.drag.seen.add(key);
        applyMode(g, S, h, S.drag.mode);
      }
    },

    onPause(g) { if (g.s) { g.s.drag = null; saveFarm(g); } },
    destroy(g) { if (g.s && !g.s.demo) saveFarm(g); },

    draw(g, ctx, alpha) {
      const S = g.s, F = S.F, L = S.L, t = S.anim + alpha * DT;
      ctx.drawImage(bgFor(g, L), 0, 0, L.W, L.H);
      drawSkyLive(g, ctx, L, t);
      for (let i = 0; i < NPLOTS; i++) drawPlot(g, ctx, S, i, t);
      drawCans(g, ctx, S);
      butterflies(ctx, L, t);
      drawAnimals(g, ctx, S, t);
      drawOrders(g, ctx, S, t);
      drawBar(g, ctx, S, t);
      // פריטים שעפים לשוק
      for (const f of S.fly) {
        const q = g.ease.inOut(Math.min(1, f.t / f.dur)), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 80;
        drawItem(g, ctx, f.id, x, y, 30 * (1 - q * 0.35));
      }
      if (S.demo) return;
      const tt = tutTarget(g, S);
      if (tt) {
        drawBanner(g, ctx, S, g.t(tt.key), t);
        if (tt.R) arrowAt(ctx, tt.R.x + tt.R.w / 2, tt.R.y + Math.min(14, tt.R.h * 0.2), t);
      }
      if (!S.panel) {
        if (S.tip && S.tip.s) drawTip(g, ctx, S, S.tip.s, S.tip.x, S.tip.y);
        else if (S.hover) { const s = tipFor(g, S, S.hover); if (s) drawTip(g, ctx, S, s, g.ptr.x, g.ptr.y); }
      }
      if (S.panel === 'market') drawMarket(g, ctx, S, t);
      else if (S.panel === 'shop') drawShop(g, ctx, S, t);
      else if (S.panel === 'confirm') drawConfirm(g, ctx, S, t);
      else if (S.panel === 'levelup') drawLevelUp(g, ctx, S, t);
      void F;
    },

    cover(ctx, w, h, k) {
      // תמונת הכרטיס: חווה שמשית עם יבול בשל, תרנגולות, פרה ואסם
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42);
      sky.addColorStop(0, '#6cc0f2'); sky.addColorStop(1, '#d4f0ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const sg = ctx.createRadialGradient(w * 0.14, h * 0.15, 8, w * 0.14, h * 0.15, 70);
      sg.addColorStop(0, '#fff7c2'); sg.addColorStop(0.5, '#ffd34d'); sg.addColorStop(1, 'rgba(255,211,77,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(w * 0.14, h * 0.15, 70, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(w * 0.14, h * 0.15, 34, 0, 6.3); ctx.fill();
      for (const [x, y, s] of [[w * 0.42, 50, 1.3], [w * 0.7, 34, 1], [w * 0.92, 70, 0.9]]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y + 8, 46 * s, 14 * s, 0, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 14 * s, y, 17 * s, 0, 6.3); ctx.arc(x + 12 * s, y - 4 * s, 21 * s, 0, 6.3); ctx.fill();
      }
      ctx.fillStyle = '#9fd977'; ctx.beginPath(); ctx.moveTo(0, h * 0.45);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.36 - Math.sin(x * 0.008 + 1) * 22 - Math.sin(x * 0.02) * 8);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#84cc5a'; ctx.beginPath(); ctx.moveTo(0, h * 0.5);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.45 - Math.sin(x * 0.012 + 3) * 12);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      barn(k, ctx, w * 0.8, h * 0.47, 2.6);
      silo(k, ctx, w * 0.62, h * 0.46, 2.2);
      house(k, ctx, w * 0.33, h * 0.44, 1.5);
      tree(ctx, w * 0.47, h * 0.45, 2, '#3f9b3a', '#55b04c');
      tree(ctx, w * 0.06, h * 0.47, 2.2, '#4caf50', '#5cbf55');
      // שתי שורות חלקות עם יבול בשל
      const rows = [['wheat', 'carrot', 'corn', 'sunflower'], ['tomato', 'strawberry', 'pumpkin']];
      rows.forEach((row, r) => row.forEach((id, c) => {
        const pw = 196, ph = 112, x = 20 + c * (pw + 14) + (r ? 70 : 0), y = h * 0.52 + r * (ph + 6);
        if (x > w - 40) return;
        ctx.fillStyle = 'rgba(50,25,5,.35)'; k.rr(ctx, x + 2, y + 6, pw - 4, ph - 2, 16); ctx.fill();
        const gg = ctx.createLinearGradient(0, y, 0, y + ph); gg.addColorStop(0, '#8d5b36'); gg.addColorStop(1, '#6e4426');
        ctx.fillStyle = gg; k.rr(ctx, x, y, pw, ph - 4, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(40,20,5,.35)'; ctx.lineWidth = 3;
        for (let q = 1; q <= 3; q++) { const yy = y + (ph - 4) * q / 4; ctx.beginPath(); ctx.moveTo(x + 10, yy); ctx.lineTo(x + pw - 10, yy); ctx.stroke(); }
        const u = Math.min(pw / 110, ph / 100) * CROP_SCALE[id];
        SPOTS[CROP_SPOTS[id]].forEach(([fx, fy], q) => drawPlant(k, ctx, id, 3, 1, x + pw * fx, y + ph * fy, u, 0.4, r * 3 + c + q));
      }));
      drawCow(k, ctx, w * 0.925, h * 0.97, 1.45, 0.3, 0, -1);
      drawChicken(ctx, w * 0.775, h * 0.98, 2.1, 0.2, 0, false, 1);
      nest(ctx, w * 0.835, h * 0.985, 1.7);
      drawItem(k, ctx, 'egg', w * 0.835, h * 0.94, 32);
      for (const [x, y, s] of [[w * 0.2, h * 0.5, 9], [w * 0.55, h * 0.56, 7], [w * 0.4, h * 0.82, 8]]) sparkle(ctx, x, y, s, 1);
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.75, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },
  });
})();
