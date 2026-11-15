// ============================================================
//  מסעדת ההמבורגרים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  לקוחות מגיעים עם בועת הזמנה. בונים את ההמבורגר על המגש לפי הסדר, צולים קציצות
//  בתזמון (נא, מוכן, שרוף), מוזגים שתייה ומטגנים צ'יפס, ומגישים לפני שנגמרת הסבלנות.
//  30 ימים עם יעד וכוכבים, ושדרוגים בין הימים (נשמרים ב-g.save).
// ============================================================
(function () {
  'use strict';
  const FONT = 'Heebo, Arial, sans-serif';
  const DT = 1 / 60;
  const PORT = () => { try { return window.innerHeight > window.innerWidth * 1.15; } catch (e) { return false; } };
  const DAYS = 30;

  // ---------- נתונים ----------
  const BINS = ['patty', 'bun', 'cheese', 'lettuce', 'tomato', 'onion', 'sauce'];
  const TOPS = ['cheese', 'lettuce', 'tomato', 'onion', 'sauce'];
  const UNLOCK = { patty: 1, bun: 1, cheese: 2, lettuce: 3, drink: 4, tomato: 5, fries: 6, onion: 8, sauce: 10 };
  const PRICE = { bunB: 1, bunT: 1, patty: 4, cheese: 2, lettuce: 1, tomato: 1, onion: 1, sauce: 1, drink: 3, fries: 3 };
  const LH = { bunB: 15, patty: 13, cheese: 6, lettuce: 8, tomato: 8, onion: 7, sauce: 5, bunT: 24 };
  const UPG = [
    { id: 'grill', costs: [60, 160], day: 2 },
    { id: 'slow', costs: [70], day: 2 },
    { id: 'tips', costs: [100], day: 3 },
    { id: 'fast', costs: [90], day: 3 },
    { id: 'chairs', costs: [120], day: 4 },
    { id: 'soda', costs: [60], day: 5 },
    { id: 'fryer', costs: [60], day: 7 },
  ];
  // יעד הכסף של כל יום (נבדק בבוט איטי — ראו tests/burger-shop)
  const TARGET = [0, 30, 40, 45, 55, 60, 75, 80, 90, 100, 110, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 170, 175, 175, 180, 180, 180, 185, 185, 185];
  const dayLen = d => Math.min(110, 70 + d * 1.5);
  const cookT = U => 4.5 * (U.fast ? 0.7 : 1);
  const burnT = U => 4.5 + (U.slow ? 3 : 0);
  const sodaT = U => (U.soda ? 1.5 : 2.6);
  const fryT = U => (U.fryer ? 2.6 : 4);
  const has = (d, id) => d >= UNLOCK[id];

  // ---------- טקסטים ----------
  const TXT = {
    he: {
      title: 'מסעדת ההמבורגרים',
      help: ['בנה כל הזמנה מלמטה למעלה: לחמנייה, קציצה, תוספות, לחמנייה', 'קח את הקציצה מהגריל כשהיא חומה — לא נאה ולא שרופה', 'לחץ על הלקוח כדי להגיש. מהר יותר = טיפ גדול יותר'],
      helpTouch: ['בנה כל הזמנה מלמטה למעלה: לחמנייה, קציצה, תוספות, לחמנייה', 'קח את הקציצה מהגריל כשהיא חומה — לא נאה ולא שרופה', 'הקש על הלקוח כדי להגיש. מהר יותר = טיפ גדול יותר'],
      day: 'יום', money: 'כסף', clock: 'זמן', dayN: 'יום {n}',
      startDay: 'פתח את המסעדה!', target: 'היעד: {n}', bank: 'החסכונות שלך', upgrades: 'שדרוגים', newToday: 'חדש היום:',
      patty: 'קציצה', bun: 'לחמנייה', cheese: 'גבינה', lettuce: 'חסה', tomato: 'עגבנייה', onion: 'בצל', sauce: 'רוטב', drink: 'שתייה', fries: 'צ׳יפס',
      grill: 'גריל גדול', grillD: 'עוד מקום לקציצה', slow: 'שעון גריל', slowD: 'הקציצות נשרפות לאט יותר',
      tips: 'צנצנת טיפים', tipsD: 'טיפים גדולים פי 1.5', fast: 'גריל לוהט', fastD: 'הקציצות מוכנות מהר יותר',
      chairs: 'כיסאות נוחים', chairsD: 'הלקוחות מחכים יותר זמן', soda: 'מכונת שתייה', sodaD: 'השתייה נמזגת מהר יותר', fryer: 'מטגנת מהירה', fryerD: 'הצ׳יפס מוכן מהר יותר',
      buy: 'קנה', owned: 'נקנה', fromDay: 'מיום {n}', noMoney: 'אין מספיק כסף', serve: 'הגש',
      noBun: 'התחל עם לחמנייה!', closed: 'ההמבורגר סגור — הגש אותו!', raw: 'הקציצה עוד נאה — חכה!', grillFull: 'הגריל מלא', burnt: 'שרוף! זרקת לפח',
      wrong: 'זו לא ההזמנה שלי!', noMatch: 'אף אחד לא הזמין את זה', hasDrink: 'כבר יש שתייה על המגש', hasFries: 'כבר יש צ׳יפס על המגש', notReady: 'עוד לא מוכן',
      closing: 'סוף היום! מגישים ללקוחות האחרונים', left: 'לקוח הלך…', tip: 'טיפ +{n}',
      earned: 'הרווחת {n} מתוך {m}', dayDone: 'יום {n} הצליח!', dayFail: 'לא הגעת ליעד',
      tut1: 'לחץ על הלחמנייה כדי להתחיל', tut2: 'שים קציצה על הגריל', tut3: 'חכה שהקציצה תשחים…', tut4: 'הקציצה מוכנה! לחץ עליה', tut5: 'סגור עם הלחמנייה העליונה', tut6: 'לחץ על הלקוח כדי להגיש!', tut7: 'הוסף את מה שבבועה, לפי הסדר',
      tut1t: 'הקש על הלחמנייה כדי להתחיל', tut4t: 'הקציצה מוכנה! הקש עליה', tut6t: 'הקש על הלקוח כדי להגיש!',
    },
    en: {
      title: 'Burger Shop',
      help: ['Build each order bottom to top: bun, patty, toppings, bun', 'Take the patty off the grill when brown — not raw, not burnt', 'Click the customer to serve. Faster = bigger tip'],
      helpTouch: ['Build each order bottom to top: bun, patty, toppings, bun', 'Take the patty off the grill when brown — not raw, not burnt', 'Tap the customer to serve. Faster = bigger tip'],
      day: 'Day', money: 'Money', clock: 'Time', dayN: 'Day {n}',
      startDay: 'Open the shop!', target: 'Target: {n}', bank: 'Your savings', upgrades: 'Upgrades', newToday: 'New today:',
      patty: 'Patty', bun: 'Bun', cheese: 'Cheese', lettuce: 'Lettuce', tomato: 'Tomato', onion: 'Onion', sauce: 'Sauce', drink: 'Drink', fries: 'Fries',
      grill: 'Big grill', grillD: 'Room for one more patty', slow: 'Grill timer', slowD: 'Patties burn more slowly',
      tips: 'Tip jar', tipsD: 'Tips are 1.5× bigger', fast: 'Hot grill', fastD: 'Patties cook faster',
      chairs: 'Comfy chairs', chairsD: 'Customers wait longer', soda: 'Soda machine', sodaD: 'Drinks pour faster', fryer: 'Fast fryer', fryerD: 'Fries are ready sooner',
      buy: 'Buy', owned: 'Owned', fromDay: 'From day {n}', noMoney: 'Not enough money', serve: 'Serve',
      noBun: 'Start with a bun!', closed: 'The burger is closed — serve it!', raw: 'Still raw — wait!', grillFull: 'The grill is full', burnt: 'Burnt! Into the trash',
      wrong: 'That is not my order!', noMatch: 'Nobody ordered this', hasDrink: 'The tray already has a drink', hasFries: 'The tray already has fries', notReady: 'Not ready yet',
      closing: 'Closing time! Serve the last customers', left: 'A customer left…', tip: 'Tip +{n}',
      earned: 'You earned {n} of {m}', dayDone: 'Day {n} done!', dayFail: 'You missed the target',
      tut1: 'Click the bun to start', tut2: 'Put a patty on the grill', tut3: 'Wait for the patty to turn brown…', tut4: 'The patty is ready! Click it', tut5: 'Close it with the top bun', tut6: 'Click the customer to serve!', tut7: 'Add what the bubble shows, in order',
      tut1t: 'Tap the bun to start', tut4t: 'The patty is ready! Tap it', tut6t: 'Tap the customer to serve!',
    },
    ar: {
      title: 'مطعم البرغر',
      help: ['ابنِ كل طلب من الأسفل للأعلى: خبز، لحم، إضافات، خبز', 'خذ اللحم عن الشواية عندما يصبح بنياً — لا نيئاً ولا محروقاً', 'انقر على الزبون لتقدّم. الأسرع = إكرامية أكبر'],
      helpTouch: ['ابنِ كل طلب من الأسفل للأعلى: خبز، لحم، إضافات، خبز', 'خذ اللحم عن الشواية عندما يصبح بنياً — لا نيئاً ولا محروقاً', 'المس الزبون لتقدّم. الأسرع = إكرامية أكبر'],
      day: 'اليوم', money: 'المال', clock: 'الوقت', dayN: 'اليوم {n}',
      startDay: 'افتح المطعم!', target: 'الهدف: {n}', bank: 'مدخراتك', upgrades: 'التحسينات', newToday: 'جديد اليوم:',
      patty: 'قطعة لحم', bun: 'خبز', cheese: 'جبن', lettuce: 'خس', tomato: 'طماطم', onion: 'بصل', sauce: 'صلصة', drink: 'مشروب', fries: 'بطاطس',
      grill: 'شواية كبيرة', grillD: 'مكان لقطعة لحم إضافية', slow: 'مؤقّت الشواية', slowD: 'اللحم يحترق ببطء أكثر',
      tips: 'جرة الإكراميات', tipsD: 'إكراميات أكبر بمرة ونصف', fast: 'شواية حامية', fastD: 'اللحم ينضج أسرع',
      chairs: 'كراسٍ مريحة', chairsD: 'الزبائن ينتظرون مدة أطول', soda: 'آلة المشروبات', sodaD: 'المشروب يُسكب أسرع', fryer: 'مقلاة سريعة', fryerD: 'البطاطس تجهز أسرع',
      buy: 'اشترِ', owned: 'تم الشراء', fromDay: 'من اليوم {n}', noMoney: 'المال لا يكفي', serve: 'قدِّم',
      noBun: 'ابدأ بالخبز!', closed: 'البرغر مغلق — قدّمه!', raw: 'ما زالت نيئة — انتظر!', grillFull: 'الشواية ممتلئة', burnt: 'محروقة! إلى سلة المهملات',
      wrong: 'هذا ليس طلبي!', noMatch: 'لم يطلب أحد هذا', hasDrink: 'على الصينية مشروب بالفعل', hasFries: 'على الصينية بطاطس بالفعل', notReady: 'ليس جاهزاً بعد',
      closing: 'وقت الإغلاق! قدّم لآخر الزبائن', left: 'غادر زبون…', tip: 'إكرامية +{n}',
      earned: 'ربحت {n} من {m}', dayDone: 'نجح اليوم {n}!', dayFail: 'لم تصل إلى الهدف',
      tut1: 'انقر على الخبز لتبدأ', tut2: 'ضع قطعة لحم على الشواية', tut3: 'انتظر حتى تصبح بنية…', tut4: 'قطعة اللحم جاهزة! انقر عليها', tut5: 'أغلقه بالخبز العلوي', tut6: 'انقر على الزبون لتقدّم!', tut7: 'أضف ما في الفقاعة بالترتيب',
      tut1t: 'المس الخبز لتبدأ', tut4t: 'قطعة اللحم جاهزة! المسها', tut6t: 'المس الزبون لتقدّم!',
    },
    es: {
      title: 'La Hamburguesería',
      help: ['Arma cada pedido de abajo arriba: pan, carne, extras, pan', 'Saca la carne cuando esté dorada: ni cruda ni quemada', 'Haz clic en el cliente para servir. Rápido = más propina'],
      helpTouch: ['Arma cada pedido de abajo arriba: pan, carne, extras, pan', 'Saca la carne cuando esté dorada: ni cruda ni quemada', 'Toca al cliente para servir. Rápido = más propina'],
      day: 'Día', money: 'Dinero', clock: 'Tiempo', dayN: 'Día {n}',
      startDay: '¡Abrir el local!', target: 'Meta: {n}', bank: 'Tus ahorros', upgrades: 'Mejoras', newToday: 'Nuevo hoy:',
      patty: 'Carne', bun: 'Pan', cheese: 'Queso', lettuce: 'Lechuga', tomato: 'Tomate', onion: 'Cebolla', sauce: 'Salsa', drink: 'Bebida', fries: 'Papas fritas',
      grill: 'Parrilla grande', grillD: 'Sitio para una carne más', slow: 'Temporizador', slowD: 'La carne se quema más despacio',
      tips: 'Bote de propinas', tipsD: 'Propinas 1,5× más grandes', fast: 'Parrilla potente', fastD: 'La carne se hace más rápido',
      chairs: 'Sillas cómodas', chairsD: 'Los clientes esperan más', soda: 'Máquina de refrescos', sodaD: 'Las bebidas se sirven más rápido', fryer: 'Freidora rápida', fryerD: 'Las papas salen antes',
      buy: 'Comprar', owned: 'Comprado', fromDay: 'Desde el día {n}', noMoney: 'No tienes dinero suficiente', serve: 'Servir',
      noBun: '¡Empieza con un pan!', closed: 'La hamburguesa está cerrada: ¡sírvela!', raw: 'Aún está cruda: ¡espera!', grillFull: 'La parrilla está llena', burnt: '¡Quemada! A la basura',
      wrong: '¡Ese no es mi pedido!', noMatch: 'Nadie pidió esto', hasDrink: 'La bandeja ya tiene bebida', hasFries: 'La bandeja ya tiene papas', notReady: 'Todavía no está listo',
      closing: '¡Hora de cerrar! Atiende a los últimos clientes', left: 'Un cliente se fue…', tip: 'Propina +{n}',
      earned: 'Ganaste {n} de {m}', dayDone: '¡Día {n} superado!', dayFail: 'No llegaste a la meta',
      tut1: 'Haz clic en el pan para empezar', tut2: 'Pon una carne en la parrilla', tut3: 'Espera a que la carne se dore…', tut4: '¡La carne está lista! Haz clic en ella', tut5: 'Ciérrala con el pan de arriba', tut6: '¡Haz clic en el cliente para servir!', tut7: 'Añade lo que muestra la burbuja, en orden',
      tut1t: 'Toca el pan para empezar', tut4t: '¡La carne está lista! Tócala', tut6t: '¡Toca al cliente para servir!',
    },
    fr: {
      title: 'Le Burger Shop',
      help: ['Monte chaque commande de bas en haut : pain, steak, garnitures, pain', 'Retire le steak quand il est doré — ni cru, ni brûlé', 'Clique sur le client pour servir. Vite = gros pourboire'],
      helpTouch: ['Monte chaque commande de bas en haut : pain, steak, garnitures, pain', 'Retire le steak quand il est doré — ni cru, ni brûlé', 'Touche le client pour servir. Vite = gros pourboire'],
      day: 'Jour', money: 'Argent', clock: 'Temps', dayN: 'Jour {n}',
      startDay: 'Ouvrir le resto !', target: 'Objectif : {n}', bank: 'Tes économies', upgrades: 'Améliorations', newToday: 'Nouveau aujourd’hui :',
      patty: 'Steak', bun: 'Pain', cheese: 'Fromage', lettuce: 'Salade', tomato: 'Tomate', onion: 'Oignon', sauce: 'Sauce', drink: 'Boisson', fries: 'Frites',
      grill: 'Grand gril', grillD: 'Place pour un steak de plus', slow: 'Minuteur', slowD: 'Les steaks brûlent moins vite',
      tips: 'Pot à pourboires', tipsD: 'Pourboires 1,5× plus gros', fast: 'Gril brûlant', fastD: 'Les steaks cuisent plus vite',
      chairs: 'Chaises confortables', chairsD: 'Les clients attendent plus longtemps', soda: 'Machine à soda', sodaD: 'Les boissons coulent plus vite', fryer: 'Friteuse rapide', fryerD: 'Les frites sont prêtes plus tôt',
      buy: 'Acheter', owned: 'Acheté', fromDay: 'Dès le jour {n}', noMoney: 'Pas assez d’argent', serve: 'Servir',
      noBun: 'Commence par un pain !', closed: 'Le burger est fermé — sers-le !', raw: 'Encore cru — attends !', grillFull: 'Le gril est plein', burnt: 'Brûlé ! À la poubelle',
      wrong: 'Ce n’est pas ma commande !', noMatch: 'Personne n’a commandé ça', hasDrink: 'Il y a déjà une boisson sur le plateau', hasFries: 'Il y a déjà des frites sur le plateau', notReady: 'Pas encore prêt',
      closing: 'C’est l’heure de fermer ! Sers les derniers clients', left: 'Un client est parti…', tip: 'Pourboire +{n}',
      earned: 'Tu as gagné {n} sur {m}', dayDone: 'Jour {n} réussi !', dayFail: 'Objectif manqué',
      tut1: 'Clique sur le pain pour commencer', tut2: 'Mets un steak sur le gril', tut3: 'Attends que le steak soit doré…', tut4: 'Le steak est prêt ! Clique dessus', tut5: 'Ferme avec le pain du dessus', tut6: 'Clique sur le client pour servir !', tut7: 'Ajoute ce que montre la bulle, dans l’ordre',
      tut1t: 'Touche le pain pour commencer', tut4t: 'Le steak est prêt ! Touche-le', tut6t: 'Touche le client pour servir !',
    },
    pt: {
      title: 'A Hamburgueria',
      help: ['Monte cada pedido de baixo para cima: pão, carne, extras, pão', 'Tire a carne quando dourar — nem crua, nem queimada', 'Clique no cliente para servir. Rápido = mais gorjeta'],
      helpTouch: ['Monte cada pedido de baixo para cima: pão, carne, extras, pão', 'Tire a carne quando dourar — nem crua, nem queimada', 'Toque no cliente para servir. Rápido = mais gorjeta'],
      day: 'Dia', money: 'Dinheiro', clock: 'Tempo', dayN: 'Dia {n}',
      startDay: 'Abrir a lanchonete!', target: 'Meta: {n}', bank: 'Suas economias', upgrades: 'Melhorias', newToday: 'Novo hoje:',
      patty: 'Carne', bun: 'Pão', cheese: 'Queijo', lettuce: 'Alface', tomato: 'Tomate', onion: 'Cebola', sauce: 'Molho', drink: 'Bebida', fries: 'Batata frita',
      grill: 'Chapa grande', grillD: 'Lugar para mais uma carne', slow: 'Timer da chapa', slowD: 'A carne queima mais devagar',
      tips: 'Pote de gorjetas', tipsD: 'Gorjetas 1,5× maiores', fast: 'Chapa quente', fastD: 'A carne fica pronta mais rápido',
      chairs: 'Cadeiras confortáveis', chairsD: 'Os clientes esperam mais', soda: 'Máquina de refrigerante', sodaD: 'As bebidas enchem mais rápido', fryer: 'Fritadeira rápida', fryerD: 'A batata fica pronta antes',
      buy: 'Comprar', owned: 'Comprado', fromDay: 'A partir do dia {n}', noMoney: 'Dinheiro insuficiente', serve: 'Servir',
      noBun: 'Comece com um pão!', closed: 'O hambúrguer está fechado — sirva!', raw: 'Ainda está crua — espere!', grillFull: 'A chapa está cheia', burnt: 'Queimou! Para o lixo',
      wrong: 'Esse não é o meu pedido!', noMatch: 'Ninguém pediu isso', hasDrink: 'A bandeja já tem bebida', hasFries: 'A bandeja já tem batata', notReady: 'Ainda não está pronto',
      closing: 'Hora de fechar! Atenda os últimos clientes', left: 'Um cliente foi embora…', tip: 'Gorjeta +{n}',
      earned: 'Você ganhou {n} de {m}', dayDone: 'Dia {n} concluído!', dayFail: 'Você não bateu a meta',
      tut1: 'Clique no pão para começar', tut2: 'Coloque uma carne na chapa', tut3: 'Espere a carne dourar…', tut4: 'A carne está pronta! Clique nela', tut5: 'Feche com o pão de cima', tut6: 'Clique no cliente para servir!', tut7: 'Coloque o que o balão mostra, em ordem',
      tut1t: 'Toque no pão para começar', tut4t: 'A carne está pronta! Toque nela', tut6t: 'Toque no cliente para servir!',
    },
    ru: {
      title: 'Бургерная',
      help: ['Собирай заказ снизу вверх: булка, котлета, начинка, булка', 'Снимай котлету, когда она коричневая — не сырая и не горелая', 'Нажми на клиента, чтобы подать. Быстрее = больше чаевых'],
      helpTouch: ['Собирай заказ снизу вверх: булка, котлета, начинка, булка', 'Снимай котлету, когда она коричневая — не сырая и не горелая', 'Коснись клиента, чтобы подать. Быстрее = больше чаевых'],
      day: 'День', money: 'Деньги', clock: 'Время', dayN: 'День {n}',
      startDay: 'Открыть бургерную!', target: 'Цель: {n}', bank: 'Твои сбережения', upgrades: 'Улучшения', newToday: 'Новое сегодня:',
      patty: 'Котлета', bun: 'Булка', cheese: 'Сыр', lettuce: 'Салат', tomato: 'Помидор', onion: 'Лук', sauce: 'Соус', drink: 'Напиток', fries: 'Картошка фри',
      grill: 'Большой гриль', grillD: 'Место ещё для одной котлеты', slow: 'Таймер гриля', slowD: 'Котлеты сгорают медленнее',
      tips: 'Банка для чаевых', tipsD: 'Чаевые в 1,5 раза больше', fast: 'Жаркий гриль', fastD: 'Котлеты жарятся быстрее',
      chairs: 'Удобные стулья', chairsD: 'Клиенты ждут дольше', soda: 'Автомат с газировкой', sodaD: 'Напитки наливаются быстрее', fryer: 'Быстрая фритюрница', fryerD: 'Картошка готова раньше',
      buy: 'Купить', owned: 'Куплено', fromDay: 'С дня {n}', noMoney: 'Не хватает денег', serve: 'Подать',
      noBun: 'Начни с булки!', closed: 'Бургер закрыт — подавай!', raw: 'Ещё сырая — подожди!', grillFull: 'Гриль занят', burnt: 'Сгорела! В мусор',
      wrong: 'Это не мой заказ!', noMatch: 'Никто такое не заказывал', hasDrink: 'На подносе уже есть напиток', hasFries: 'На подносе уже есть картошка', notReady: 'Ещё не готово',
      closing: 'Закрываемся! Обслужи последних клиентов', left: 'Клиент ушёл…', tip: 'Чаевые +{n}',
      earned: 'Заработано {n} из {m}', dayDone: 'День {n} пройден!', dayFail: 'Цель не достигнута',
      tut1: 'Нажми на булку, чтобы начать', tut2: 'Положи котлету на гриль', tut3: 'Подожди, пока котлета подрумянится…', tut4: 'Котлета готова! Нажми на неё', tut5: 'Закрой верхней булкой', tut6: 'Нажми на клиента, чтобы подать!', tut7: 'Добавь то, что в облачке, по порядку',
      tut1t: 'Коснись булки, чтобы начать', tut4t: 'Котлета готова! Коснись её', tut6t: 'Коснись клиента, чтобы подать!',
    },
    de: {
      title: 'Der Burgerladen',
      help: ['Bau jede Bestellung von unten nach oben: Brötchen, Patty, Belag, Brötchen', 'Nimm das Patty vom Grill, wenn es braun ist — nicht roh, nicht verbrannt', 'Klicke auf den Gast zum Servieren. Schneller = mehr Trinkgeld'],
      helpTouch: ['Bau jede Bestellung von unten nach oben: Brötchen, Patty, Belag, Brötchen', 'Nimm das Patty vom Grill, wenn es braun ist — nicht roh, nicht verbrannt', 'Tippe auf den Gast zum Servieren. Schneller = mehr Trinkgeld'],
      day: 'Tag', money: 'Geld', clock: 'Zeit', dayN: 'Tag {n}',
      startDay: 'Laden öffnen!', target: 'Ziel: {n}', bank: 'Dein Erspartes', upgrades: 'Upgrades', newToday: 'Neu heute:',
      patty: 'Patty', bun: 'Brötchen', cheese: 'Käse', lettuce: 'Salat', tomato: 'Tomate', onion: 'Zwiebel', sauce: 'Soße', drink: 'Getränk', fries: 'Pommes',
      grill: 'Großer Grill', grillD: 'Platz für ein Patty mehr', slow: 'Grill-Timer', slowD: 'Pattys verbrennen langsamer',
      tips: 'Trinkgeldglas', tipsD: '1,5× mehr Trinkgeld', fast: 'Heißer Grill', fastD: 'Pattys sind schneller fertig',
      chairs: 'Bequeme Stühle', chairsD: 'Gäste warten länger', soda: 'Getränkeautomat', sodaD: 'Getränke laufen schneller', fryer: 'Schnelle Fritteuse', fryerD: 'Pommes sind früher fertig',
      buy: 'Kaufen', owned: 'Gekauft', fromDay: 'Ab Tag {n}', noMoney: 'Nicht genug Geld', serve: 'Servieren',
      noBun: 'Fang mit einem Brötchen an!', closed: 'Der Burger ist fertig — servier ihn!', raw: 'Noch roh — warte!', grillFull: 'Der Grill ist voll', burnt: 'Verbrannt! Ab in den Müll',
      wrong: 'Das ist nicht meine Bestellung!', noMatch: 'Das hat niemand bestellt', hasDrink: 'Auf dem Tablett ist schon ein Getränk', hasFries: 'Auf dem Tablett sind schon Pommes', notReady: 'Noch nicht fertig',
      closing: 'Feierabend! Bediene die letzten Gäste', left: 'Ein Gast ist gegangen…', tip: 'Trinkgeld +{n}',
      earned: 'Du hast {n} von {m} verdient', dayDone: 'Tag {n} geschafft!', dayFail: 'Ziel verfehlt',
      tut1: 'Klicke auf das Brötchen, um anzufangen', tut2: 'Leg ein Patty auf den Grill', tut3: 'Warte, bis das Patty braun ist…', tut4: 'Das Patty ist fertig! Klicke darauf', tut5: 'Schließ ihn mit dem oberen Brötchen', tut6: 'Klicke auf den Gast, um zu servieren!', tut7: 'Leg auf, was die Blase zeigt — der Reihe nach',
      tut1t: 'Tippe auf das Brötchen, um anzufangen', tut4t: 'Das Patty ist fertig! Tippe darauf', tut6t: 'Tippe auf den Gast, um zu servieren!',
    },
  };

  // ---------- פריסה ----------
  const rect = (x, y, w, h) => ({ x, y, w, h });
  const inR = (p, R) => !!R && p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  function layout(W, H) {
    const P = H > W, L = { P, W, H };
    if (!P) {
      L.counter = 250; L.room = 300; L.spots = [170, 480, 790]; L.headY = 196; L.bubY = 14;
      L.grill = rect(16, 312, 300, 182); L.tray = rect(328, 312, 300, 182);
      L.soda = rect(640, 312, 148, 182); L.fryer = rect(800, 312, 148, 182);
      L.bins = BINS.map((b, i) => rect(16 + i * 90, 506, 84, 88));
      L.trash = rect(652, 506, 96, 88); L.serve = rect(760, 506, 188, 88);
      L.panel = rect(70, 24, 820, 552);
    } else {
      L.counter = 352; L.room = 404; L.spots = [102, 300, 498]; L.headY = 286; L.bubY = 22;
      L.grill = rect(12, 416, 288, 210); L.tray = rect(312, 416, 276, 210);
      L.soda = rect(12, 638, 140, 160); L.fryer = rect(160, 638, 140, 160);
      L.trash = rect(312, 638, 100, 160); L.serve = rect(420, 638, 168, 160);
      const bw = (576 - 18) / 4;
      L.bins = BINS.map((b, i) => rect(12 + (i % 4) * (bw + 6), 810 + Math.floor(i / 4) * 92, bw, 86));
      L.panel = rect(16, 60, 568, 880);
    }
    const G = L.grill;
    L.slots = [0, 1, 2, 3].map(i => rect(G.x + 14 + (i % 2) * ((G.w - 36) / 2 + 8), G.y + 40 + Math.floor(i / 2) * ((G.h - 52) / 2 + 4), (G.w - 36) / 2, (G.h - 60) / 2));
    return L;
  }

  // ---------- שמירה: חסכונות ושדרוגים ----------
  function loadProg(g) {
    const d = g.load('prog', null) || {};
    const up = {};
    for (const u of UPG) { const v = Math.floor(+((d.up || {})[u.id]) || 0); if (v > 0) up[u.id] = Math.min(v, u.costs.length); }
    return { bank: Math.max(0, Math.floor(+d.bank || 0)), up };
  }
  const saveProg = (g, P) => g.save('prog', P);

  // ---------- הזמנות ולקוחות ----------
  function makeOrder(day) {
    const tops = TOPS.filter(t => has(day, t));
    const maxT = Math.min(tops.length, 1 + Math.floor(day / 4)), minT = day >= 10 ? 1 : 0;
    const nT = minT + Math.floor(Math.random() * (maxT - minT + 1));
    const pick = [];
    for (let i = 0; i < nT; i++) pick.push(tops[Math.floor(Math.random() * tops.length)]);
    const layers = ['bunB', 'patty'];
    if (day >= 12 && Math.random() < Math.min(0.35, (day - 11) * 0.04)) layers.push('patty');
    // הגבינה הכי טעימה על הקציצה, השאר בכל סדר
    pick.sort((a, b) => (a === 'cheese' ? -1 : b === 'cheese' ? 1 : Math.random() - 0.5));
    layers.push(...pick, 'bunT');
    return { layers, drink: has(day, 'drink') && Math.random() < 0.35 + day * 0.01, fries: has(day, 'fries') && Math.random() < 0.3 + day * 0.01 };
  }
  const orderPrice = o => o.layers.reduce((s, l) => s + PRICE[l], 0) + (o.drink ? PRICE.drink : 0) + (o.fries ? PRICE.fries : 0);
  const SKIN = ['#f9d7b5', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbc4'];
  const HAIR = ['#2b1d14', '#5a3825', '#e6c27a', '#b5562b', '#1b1b1b', '#8e8e8e', '#d94f7a'];
  const SHIRT = ['#e8402f', '#2f8fd8', '#3fa34d', '#8e5bd8', '#f08c2a', '#16a6a6', '#e85d9c'];
  function newCustomer(S, spot) {
    const d = S.day, o = makeOrder(d), n = o.layers.length - 2 + (o.drink ? 1 : 0) + (o.fries ? 1 : 0);
    const pat = (24 + n * 3.6) * Math.max(0.62, 1 - 0.013 * (d - 1)) * (S.up.chairs ? 1.25 : 1);
    const L = S.L, from = Math.random() < 0.5 ? -80 : L.W + 80;
    return { spot, o, pat, max: pat, x: from, tx: L.spots[spot], st: 0, mood: 0, frown: 0, t: 0, ph: Math.random() * 6,
      look: { skin: S.rnd.pick(SKIN), hair: S.rnd.pick(HAIR), shirt: S.rnd.pick(SHIRT), style: Math.floor(Math.random() * 5), hat: Math.random() < 0.25, glasses: Math.random() < 0.2 } };
  }

  // ---------- פעולות (גם העכבר וגם הבוט) ----------
  function err(g, key) { const S = g.s; if (S.t - (S.errT || -9) < 0.5) return; S.errT = S.t; g.sfx('error'); g.msg(g.t(key), 1000, '#ffb3a8'); }
  const trayOpen = T => T.layers.length > 0 && T.layers[T.layers.length - 1] !== 'bunT';
  const pattyState = (S, p) => (p.t < cookT(S.up) ? 0 : p.t < cookT(S.up) + burnT(S.up) ? 1 : 2);
  const matches = (T, o) => T.layers.length === o.layers.length && T.layers.every((l, i) => l === o.layers[i]) && !!T.drink === !!o.drink && !!T.fries === !!o.fries;
  function pop(S, k) { S.pop[k] = S.t; }
  const act = {
    bin(g, id) {
      const S = g.s, T = S.tray;
      if (!has(S.day, id)) { err(g, 'notReady'); return false; }
      if (id === 'patty') {
        const n = 2 + (S.up.grill || 0), i = S.grill.findIndex((p, k) => k < n && !p);
        if (i < 0) { err(g, 'grillFull'); return false; }
        S.grill[i] = { t: 0, s: 0 }; pop(S, 'slot' + i); pop(S, 'bin' + id);
        g.noise({ f: 3000, f2: 1200, dur: 0.35, vol: 0.12, filter: 'highpass' }); g.sfx('place', { p: 0.8 });
        return true;
      }
      if (id === 'bun') {
        if (!T.layers.length) T.layers.push('bunB');
        else if (trayOpen(T)) T.layers.push('bunT');
        else { err(g, 'closed'); return false; }
      } else {
        if (!T.layers.length) { err(g, 'noBun'); return false; }
        if (!trayOpen(T)) { err(g, 'closed'); return false; }
        T.layers.push(id);
      }
      pop(S, 'tray'); pop(S, 'bin' + id);
      g.sfx('place', { p: 1 + BINS.indexOf(id) * 0.08 });
      return true;
    },
    slot(g, i) {
      const S = g.s, p = S.grill[i], T = S.tray;
      if (!p) return false;
      const st = pattyState(S, p);
      if (st === 2) { S.grill[i] = null; err(g, 'burnt'); const R = S.L.slots[i]; g.burst(R.x + R.w / 2, R.y + R.h / 2, { n: 14, color: ['#444', '#777', '#222'], speed: 2, life: 30, gravity: -0.04 }); return true; }
      if (st === 0) { err(g, 'raw'); return false; }
      if (!T.layers.length) { err(g, 'noBun'); return false; }
      if (!trayOpen(T)) { err(g, 'closed'); return false; }
      S.grill[i] = null; T.layers.push('patty'); pop(S, 'tray');
      g.sfx('place', { p: 0.9 });
      return true;
    },
    soda(g) {
      const S = g.s, M = S.soda;
      if (!has(S.day, 'drink')) { err(g, 'notReady'); return false; }
      if (M.st === 0) { M.st = 1; M.t = 0; pop(S, 'soda'); g.noise({ f: 900, f2: 2400, dur: 0.5, vol: 0.06, filter: 'bandpass' }); return true; }
      if (M.st === 1) { err(g, 'notReady'); return false; }
      if (S.tray.drink) { err(g, 'hasDrink'); return false; }
      M.st = 0; S.tray.drink = true; pop(S, 'tray'); g.sfx('pop'); return true;
    },
    fryer(g) {
      const S = g.s, M = S.fry;
      if (!has(S.day, 'fries')) { err(g, 'notReady'); return false; }
      if (M.st === 0) { M.st = 1; M.t = 0; pop(S, 'fryer'); g.noise({ f: 4000, f2: 2500, dur: 0.6, vol: 0.08, filter: 'highpass' }); return true; }
      if (M.st === 1) { err(g, 'notReady'); return false; }
      if (S.tray.fries) { err(g, 'hasFries'); return false; }
      M.st = 0; S.tray.fries = true; pop(S, 'tray'); g.sfx('pop', { p: 0.9 }); return true;
    },
    trash(g) {
      const S = g.s, T = S.tray;
      if (!T.layers.length && !T.drink && !T.fries) return false;
      S.tray = { layers: [], drink: false, fries: false }; pop(S, 'trash');
      const R = S.L.tray; g.burst(R.x + R.w / 2, R.y + R.h / 2, { n: 12, color: ['#d99a4e', '#7a4a2a', '#4caf50'], speed: 2.5, life: 26 });
      g.sfx('whoosh');
      return true;
    },
    serve(g, c) {
      const S = g.s, T = S.tray;
      if (!c) { c = S.cust.filter(x => x && x.st === 1 && matches(T, x.o)).sort((a, b) => a.pat - b.pat)[0]; if (!c) { err(g, 'noMatch'); return false; } }
      if (!c || c.st !== 1) return false;
      if (!matches(T, c.o)) { c.frown = 1.2; c.pat = Math.max(0.5, c.pat - c.max * 0.12); err(g, 'wrong'); return false; }
      const base = orderPrice(c.o), f = c.pat / c.max, tip = Math.round(base * 0.5 * f * (S.up.tips ? 1.5 : 1));
      S.money += base + tip; S.served++; S.tipsSum += tip;
      c.st = 2; c.mood = 1; c.t = 0;
      S.tray = { layers: [], drink: false, fries: false };
      const x = c.x, y = S.L.headY - 40;
      g.burst(x, y, { n: 26, color: ['#ffd84d', '#fff3b0', '#ffae00'], speed: 4, life: 40 });
      g.float(x, y - 20, '+' + base, { color: '#ffe066', size: 30 });
      if (tip > 0) g.float(x, y + 14, g.t('tip', { n: tip }), { color: '#8ff0d2', size: 21 });
      g.sfx('coin'); g.after(0.1, () => g.sfx('score', { p: 1 + f * 0.3 }));
      if (S.day === 1) S.tutDone = true;
      return true;
    },
    buy(g, id) {
      const S = g.s, u = UPG.find(x => x.id === id), lv = S.up[id] || 0;
      if (!u || lv >= u.costs.length || S.day < u.day) return false;
      const cost = u.costs[lv];
      if (S.prog.bank < cost) { err(g, 'noMoney'); return false; }
      S.prog.bank -= cost; S.prog.up[id] = lv + 1; S.up = S.prog.up;
      saveProg(g, S.prog); pop(S, 'up' + id);
      g.sfx('power');
      return true;
    },
    open(g) { const S = g.s; if (S.phase !== 'prep') return false; S.phase = 'run'; S.t0 = S.t; g.sfx('start'); g.tone({ f: 1320, dur: 0.12, type: 'triangle', vol: 0.12, delay: 0.25 }); return true; },
  };

  // ---------- בוט לבדיקות: בונה את ההזמנה של הלקוח הכי חסר סבלנות, דרך אותן פעולות ----------
  function botStep(g) {
    const S = g.s;
    if ((S.botT -= DT) > 0) return;
    S.botT = S.botGap || 0.45;
    if (S.phase === 'prep') {
      for (const id of ['grill', 'slow', 'chairs', 'tips', 'fast', 'grill', 'soda', 'fryer']) if (S.prog.up[id] !== UPG.find(u => u.id === id).costs.length && act.buy(g, id)) return;
      act.open(g); return;
    }
    if (S.phase !== 'run') return;
    const T = S.tray, nG = 2 + (S.up.grill || 0);
    for (let i = 0; i < nG; i++) if (S.grill[i] && pattyState(S, S.grill[i]) === 2) { act.slot(g, i); return; }
    const live = S.cust.filter(c => c && c.st === 1);
    const ok = live.find(c => matches(T, c.o));
    if (ok) { act.serve(g, ok); return; }
    const pre = c => T.layers.every((l, i) => l === c.o.layers[i]) && T.layers.length <= c.o.layers.length && (!T.drink || c.o.drink) && (!T.fries || c.o.fries);
    let tg = live.filter(pre).sort((a, b) => a.pat - b.pat)[0];
    if (!tg) { if (T.layers.length || T.drink || T.fries) { act.trash(g); return; } tg = live.sort((a, b) => a.pat - b.pat)[0]; }
    if (!tg) return;
    const o = tg.o;
    if (o.drink && !T.drink) { if (S.soda.st === 0) { act.soda(g); return; } if (S.soda.st === 2 && T.layers.length === o.layers.length) { act.soda(g); return; } }
    if (o.fries && !T.fries) { if (S.fry.st === 0) { act.fryer(g); return; } if (S.fry.st === 2 && T.layers.length === o.layers.length) { act.fryer(g); return; } }
    const needP = o.layers.slice(T.layers.length).filter(l => l === 'patty').length, onG = S.grill.slice(0, nG).filter(p => p && pattyState(S, p) < 2).length;
    if (needP > onG && S.grill.slice(0, nG).some(p => !p)) { act.bin(g, 'patty'); return; }
    const next = o.layers[T.layers.length];
    if (!next) return;
    if (next === 'patty') { const i = S.grill.findIndex((p, k) => k < nG && p && pattyState(S, p) === 1); if (i >= 0) act.slot(g, i); return; }
    act.bin(g, next === 'bunB' || next === 'bunT' ? 'bun' : next);
  }

  // ---------- ציור: כלים ----------
  function fitSize(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const w = ctx.measureText(String(s)).width;
    return w <= maxW ? size : Math.max(8, Math.floor(size * maxW / w * 10) / 10);
  }
  function wrap(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const words = String(s).split(' '), lines = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    return lines;
  }
  function txt(U, ctx, s, x, y, size, o) { o = o || {}; const w = o.weight || 800; U.text(ctx, s, x, y, Object.assign({}, o, { weight: w, size: o.maxW ? fitSize(ctx, s, size, o.maxW, w) : size })); }
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
    ctx.strokeStyle = 'rgba(130,85,0,.8)'; ctx.lineWidth = Math.max(1, r * 0.15); ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function lock(U, ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#8d939b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#c9a227'; U.rr(ctx, -9, -4, 18, 14, 3); ctx.fill();
    ctx.fillStyle = '#7a5c0a'; ctx.beginPath(); ctx.arc(0, 2, 2.2, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function button(U, ctx, R, col, label, o) {
    o = o || {};
    const r = Math.min(14, R.h / 2.6), off = !!o.off, c = off ? '#a59f97' : col, sc = 1 + (o.press || 0) * 0.07;
    ctx.save();
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(sc, sc); ctx.translate(-R.w / 2, -R.h / 2);
    ctx.fillStyle = 'rgba(30,15,5,.32)'; U.rr(ctx, 0, 3.5, R.w, R.h, r); ctx.fill();
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
      const tw = ctx.measureText(String(label)).width, x0 = R.w / 2 - (tw + iw + gap) / 2;
      if (icon) icon(x0 + iw / 2, R.h / 2 + 1, sz / 24);
      U.text(ctx, label, x0 + iw + gap + tw / 2, R.h / 2 + 1, { size: ts, color: off ? 'rgba(255,255,255,.75)' : '#fff', stroke: 'rgba(0,0,0,.22)', strokeW: 3 });
    }
    ctx.restore();
  }
  const bump = (S, k, dur) => { const t0 = S.pop[k]; if (t0 == null) return 0; const q = (S.t - t0) / (dur || 0.3); return q >= 1 || q < 0 ? 0 : Math.sin(q * Math.PI) * (1 - q); };

  // ---------- ציור: מצרכים ----------
  // שכבה אחת של ההמבורגר, ממורכזת ב-x, התחתית שלה ב-y, ברוחב w
  function layer(U, ctx, id, x, y, w, st) {
    const h = LH[id], hw = w / 2;
    ctx.save();
    if (id === 'bunB') {
      const gr = ctx.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, '#f2c27a'); gr.addColorStop(1, '#c98a3e');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - hw, y - h); ctx.lineTo(x + hw, y - h); ctx.quadraticCurveTo(x + hw, y, x + hw - 10, y); ctx.lineTo(x - hw + 10, y); ctx.quadraticCurveTo(x - hw, y, x - hw, y - h); ctx.fill();
      ctx.fillStyle = '#fbe3b4'; ctx.fillRect(x - hw + 2, y - h, w - 4, 3);
    } else if (id === 'bunT') {
      const gr = ctx.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, '#f5b955'); gr.addColorStop(1, '#d4892f');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.bezierCurveTo(x - hw, y - h * 1.25, x + hw, y - h * 1.25, x + hw, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x - hw * 0.4, y - h * 0.62, hw * 0.25, h * 0.15, -0.3, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff6dc';
      for (const [a, b] of [[-0.5, 0.55], [-0.15, 0.75], [0.2, 0.68], [0.5, 0.5], [0.05, 0.4], [-0.32, 0.32], [0.35, 0.28]]) { ctx.beginPath(); ctx.ellipse(x + a * hw, y - b * h, Math.max(1, w * 0.018), Math.max(0.8, w * 0.01), 0.4, 0, 6.3); ctx.fill(); }
    } else if (id === 'patty') {
      const c = st === 0 ? ['#e8848a', '#c95c66'] : st === 2 ? ['#3a2a22', '#1c1410'] : ['#8a4a26', '#5c2e14'];
      const gr = ctx.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
      ctx.fillStyle = gr; U.rr(ctx, x - hw - 2, y - h, w + 4, h, h / 2); ctx.fill();
      ctx.fillStyle = st === 0 ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.18)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x - hw + 8 + i * (w - 16) / 5, y - h / 2 + (i % 2 ? 2 : -2), Math.max(1, h * 0.13), 0, 6.3); ctx.fill(); }
      if (st === 1) { ctx.strokeStyle = 'rgba(40,20,10,.55)'; ctx.lineWidth = Math.max(1, h * 0.12); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - hw + i * w / 4 - 4, y - h + 2); ctx.lineTo(x - hw + i * w / 4 + 4, y - 2); ctx.stroke(); } }
    } else if (id === 'cheese') {
      ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.moveTo(x - hw - 3, y - h); ctx.lineTo(x + hw + 3, y - h); ctx.lineTo(x + hw + 3, y - 1);
      for (let i = 4; i >= 0; i--) { const xx = x - hw - 3 + i * (w + 6) / 4; ctx.lineTo(xx + (w + 6) / 8, y + (i % 2 ? h * 1.2 : 0)); ctx.lineTo(xx, y - 1); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - hw, y - h, w, 1.6);
    } else if (id === 'lettuce') {
      ctx.fillStyle = '#5cbf3a'; ctx.beginPath(); ctx.moveTo(x - hw - 4, y - h * 0.4);
      for (let i = 0; i <= 10; i++) ctx.quadraticCurveTo(x - hw - 4 + (i - 0.5) * (w + 8) / 10, y - h * (i % 2 ? 1.1 : 0.2), x - hw - 4 + i * (w + 8) / 10, y - h * 0.5);
      ctx.lineTo(x + hw + 4, y); ctx.lineTo(x - hw - 4, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8fdc5a'; ctx.fillRect(x - hw, y - h * 0.55, w, Math.max(1, h * 0.18));
    } else if (id === 'tomato') {
      for (const sx of [-0.27, 0.27]) {
        ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.ellipse(x + sx * w, y - h / 2, w * 0.25, h / 2, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ff8a75'; ctx.beginPath(); ctx.ellipse(x + sx * w, y - h / 2, w * 0.17, h * 0.3, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffe9a8'; for (const dx of [-0.08, 0.08]) { ctx.beginPath(); ctx.arc(x + sx * w + dx * w, y - h / 2, Math.max(0.8, w * 0.015), 0, 6.3); ctx.fill(); }
      }
    } else if (id === 'onion') {
      ctx.strokeStyle = '#c77dbb'; ctx.lineWidth = Math.max(1.5, h * 0.35);
      for (const sx of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.ellipse(x + sx * w, y - h / 2, w * 0.15, h * 0.38, 0, 0, 6.3); ctx.stroke(); }
      ctx.strokeStyle = '#f6e6f2'; ctx.lineWidth = Math.max(1, h * 0.16);
      for (const sx of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.ellipse(x + sx * w, y - h / 2, w * 0.15, h * 0.38, 0, 0, 6.3); ctx.stroke(); }
    } else if (id === 'sauce') {
      ctx.fillStyle = '#d62d20'; ctx.beginPath(); ctx.moveTo(x - hw + 2, y - h);
      ctx.lineTo(x + hw - 2, y - h);
      for (let i = 6; i >= 0; i--) { const xx = x - hw + 2 + i * (w - 4) / 6; ctx.quadraticCurveTo(xx + (w - 4) / 12, y + (i % 2 ? h * 1.4 : h * 0.3), xx, y); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return h;
  }
  function stackH(layers) { return layers.reduce((s, l) => s + LH[l], 0) + (layers[layers.length - 1] === 'bunT' ? -4 : 0); }
  function drawStack(U, ctx, layers, x, y, w) {
    let yy = y;
    for (const l of layers) { layer(U, ctx, l, x, yy, w, 1); yy -= LH[l] * (l === 'bunT' ? 1 : 0.92); }
  }
  function cup(U, ctx, x, y, s, fill) { // y = תחתית הכוס
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(10, -54); ctx.lineTo(16, -54); ctx.stroke();
    ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(14, -40); ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12.6, -28); ctx.lineTo(12.6, -28); ctx.lineTo(11.6, -18); ctx.lineTo(-11.6, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.arc(0, -23, 3.4, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#f2f2f2'; U.rr(ctx, -16, -44, 32, 5, 2); ctx.fill();
    if (fill != null && fill < 1) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(14, -40); ctx.lineTo(14 - 4 * (1 - fill), -40 + 40 * (1 - fill)); ctx.lineTo(-14 + 4 * (1 - fill), -40 + 40 * (1 - fill)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function friesBox(U, ctx, x, y, s, done) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const fc = done === false ? '#f3e2a0' : '#ffcf3f';
    for (const [a, h, r] of [[-9, 30, -0.15], [-4, 36, -0.05], [1, 33, 0.05], [6, 38, 0.12], [10, 29, 0.2], [-1, 40, 0]]) { ctx.save(); ctx.translate(a, -18); ctx.rotate(r); ctx.fillStyle = fc; ctx.fillRect(-2.2, -h + 18, 4.4, h); ctx.fillStyle = 'rgba(200,120,0,.3)'; ctx.fillRect(1, -h + 18, 1.2, h); ctx.restore(); }
    ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.moveTo(-15, -24); ctx.quadraticCurveTo(0, -17, 15, -24); ctx.lineTo(11, 0); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(0, -11, 4.2, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  // אייקון למצרך (בפחים ובחלון הפתיחה)
  function icon(U, ctx, id, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'bun') { layer(U, ctx, 'bunB', 0, 16, 46); layer(U, ctx, 'bunT', 0, -2, 46); }
    else if (id === 'patty') { for (let i = 0; i < 3; i++) layer(U, ctx, 'patty', -3 + i * 3, 14 - i * 11, 40, 0); }
    else if (id === 'cheese') { layer(U, ctx, 'cheese', -3, 4, 36); layer(U, ctx, 'cheese', 3, -5, 36); }
    else if (id === 'drink') cup(U, ctx, 0, 22, 0.8);
    else if (id === 'fries') friesBox(U, ctx, 0, 22, 0.9);
    else if (id === 'sauce') {
      ctx.fillStyle = '#d62d20'; U.rr(ctx, -11, -10, 22, 32, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(2, -22); ctx.lineTo(-2, -22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-7, -6, 3, 22);
      ctx.fillStyle = '#ffd84d'; U.rr(ctx, -8, 2, 16, 9, 3); ctx.fill();
    } else layer(U, ctx, id, 0, 6 + LH[id] / 2, 44, 1);
    ctx.restore();
  }

  // ---------- ציור: לקוח ----------
  function drawCustomer(U, ctx, c, x, y, s, t) { // y = קו הדלפק
    const L = c.look, f = c.st === 1 ? c.pat / c.max : 1, happy = c.mood === 1, angry = c.mood === -1 || c.frown > 0 || f < 0.25;
    const bob = Math.sin(t * 2 + c.ph) * 1.5 + (c.st !== 1 ? Math.abs(Math.sin(t * 9)) * -4 : 0);
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    ctx.fillStyle = L.shirt; U.rr(ctx, -40, -58, 80, 70, 26); ctx.fill();
    ctx.fillStyle = U.shade(L.shirt, -0.15); U.rr(ctx, -40, -30, 80, 40, 18); ctx.fill();
    ctx.fillStyle = U.shade(L.skin, -0.1); ctx.fillRect(-9, -70, 18, 16);
    const hy = -100;
    if (L.style === 3) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(0, hy + 6, 37, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.fillRect(-37, hy, 12, 40); ctx.fillRect(25, hy, 12, 40); }
    const gr = ctx.createRadialGradient(-8, hy - 10, 4, 0, hy, 34); gr.addColorStop(0, U.shade(L.skin, 0.15)); gr.addColorStop(1, L.skin);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, hy, 32, 0, 6.3); ctx.fill();
    ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(-31, hy + 4, 6, 0, 6.3); ctx.arc(31, hy + 4, 6, 0, 6.3); ctx.fill();
    ctx.fillStyle = L.hair;
    if (L.hat) { ctx.fillStyle = L.shirt === '#e8402f' ? '#2f8fd8' : '#e8402f'; ctx.beginPath(); ctx.arc(0, hy - 8, 32, Math.PI, 0); ctx.fill(); ctx.fillRect(-4, hy - 10, 46, 7); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(0, hy - 28, 5, 0, 6.3); ctx.fill(); }
    else if (L.style === 0) { ctx.beginPath(); ctx.arc(0, hy - 6, 33, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(28, hy - 6); ctx.quadraticCurveTo(0, hy - 18, -28, hy - 4); ctx.closePath(); ctx.fill(); }
    else if (L.style === 1) { for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9 - 7, hy - 22); ctx.lineTo(i * 9, hy - 44 + Math.abs(i) * 3); ctx.lineTo(i * 9 + 7, hy - 22); ctx.fill(); } ctx.beginPath(); ctx.arc(0, hy - 8, 31, Math.PI * 1.1, Math.PI * 1.9); ctx.fill(); }
    else if (L.style === 2) { ctx.beginPath(); ctx.arc(0, hy - 6, 33, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, hy - 42, 13, 0, 6.3); ctx.fill(); }
    else if (L.style === 3) { ctx.beginPath(); ctx.arc(0, hy - 6, 34, Math.PI, 0); ctx.fill(); }
    else { ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; ctx.moveTo(Math.cos(a) * 26, hy - 4 + Math.sin(a) * 26); ctx.arc(Math.cos(a) * 26, hy - 4 + Math.sin(a) * 26, 11, 0, 6.3); } ctx.fill(); }
    const blink = (t * 0.8 + c.ph) % 3.4 < 0.12;
    for (const ex of [-12, 12]) {
      if (blink || happy) { ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3; ctx.beginPath(); if (happy) ctx.arc(ex, hy + 2, 5, Math.PI * 1.15, Math.PI * 1.85); else { ctx.moveTo(ex - 5, hy); ctx.lineTo(ex + 5, hy); } ctx.stroke(); }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, hy, 6, 7, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.arc(ex, hy + 1, 3.6, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.2, hy - 0.6, 1.2, 0, 6.3); ctx.fill(); }
      if (angry && !happy) { ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 7 * Math.sign(ex), hy - 13); ctx.lineTo(ex + 6 * Math.sign(ex), hy - 9); ctx.stroke(); }
    }
    if (L.glasses) { ctx.strokeStyle = '#333'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-12, hy, 9, 0, 6.3); ctx.moveTo(21, hy); ctx.arc(12, hy, 9, 0, 6.3); ctx.moveTo(-3, hy); ctx.lineTo(3, hy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,120,120,.35)'; ctx.beginPath(); ctx.ellipse(-20, hy + 12, 6, 3.5, 0, 0, 6.3); ctx.ellipse(20, hy + 12, 6, 3.5, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#7a2a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    if (happy) { ctx.fillStyle = '#7a2a1a'; ctx.arc(0, hy + 12, 9, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); }
    else if (angry) { ctx.arc(0, hy + 22, 8, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (f < 0.55) { ctx.moveTo(-7, hy + 16); ctx.lineTo(7, hy + 16); ctx.stroke(); }
    else { ctx.arc(0, hy + 10, 8, 0.25, Math.PI - 0.25); ctx.stroke(); }
    ctx.restore();
  }
  function orderBubble(U, ctx, S, c, x, y, t) {
    const o = c.o, L = S.L, sc = L.P ? 0.62 : 0.72, bw = 100 * sc;
    const h = stackH(o.layers) * sc * 0.95 + 26, extra = (o.drink ? 1 : 0) + (o.fries ? 1 : 0);
    const w = bw + 26 + extra * 36 * (L.P ? 0.85 : 1), bh = Math.max(h, extra ? 78 : 0);
    const bx = Math.max(6, Math.min(L.W - w - 6, x - w / 2)), by = y;
    ctx.fillStyle = 'rgba(30,15,5,.25)'; U.rr(ctx, bx, by + 3, w, bh, 16); ctx.fill();
    ctx.fillStyle = c.frown > 0 ? '#ffe3df' : '#ffffff'; U.rr(ctx, bx, by, w, bh, 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 8, by + bh - 1); ctx.lineTo(x, by + bh + 10); ctx.lineTo(x + 8, by + bh - 1); ctx.fill();
    // ההמבורגר (מלמטה למעלה, כמו על המגש)
    let yy = by + bh - 12;
    o.layers.forEach(l => { layer(U, ctx, l, bx + 13 + bw / 2, yy, bw, 1); yy -= LH[l] * sc * (l === 'bunT' ? 1 : 0.92); });
    let ex = bx + 13 + bw + 8;
    const k = L.P ? 0.6 : 0.68;
    if (o.fries) { friesBox(U, ctx, ex + 16 * k + 2, by + bh - 12, k); ex += 36 * (L.P ? 0.85 : 1); }
    if (o.drink) cup(U, ctx, ex + 16 * k + 2, by + bh - 12, k);
    // סבלנות
    const f = Math.max(0, c.pat / c.max), pw = Math.max(70, w - 20), px = x - pw / 2, py = by + bh + 14;
    ctx.fillStyle = 'rgba(30,15,5,.45)'; U.rr(ctx, px, py, pw, 11, 5.5); ctx.fill();
    ctx.fillStyle = f > 0.55 ? '#4cd964' : f > 0.25 ? '#ffcc00' : (Math.sin(t * 12) > 0 ? '#ff3b30' : '#ff8a80');
    U.rr(ctx, px + 1.5, py + 1.5, Math.max(8, (pw - 3) * f), 8, 4); ctx.fill();
  }

  // ---------- ציור: המסעדה (רקע שנשמר) ----------
  function paintBg(U, ctx, L) {
    const W = L.W, H = L.H, C = L.counter;
    const wall = ctx.createLinearGradient(0, 0, 0, C); wall.addColorStop(0, '#ffe7c7'); wall.addColorStop(1, '#ffd29e');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, C);
    ctx.fillStyle = 'rgba(232,64,47,.12)'; for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 24, C);
    // חלון עם רחוב
    const wx = L.P ? 30 : 330, ww = L.P ? 220 : 300, wy = L.P ? 190 : 120, wh = L.P ? 90 : 90;
    ctx.fillStyle = '#8a5a2b'; U.rr(ctx, wx - 8, wy - 8, ww + 16, wh + 16, 10); ctx.fill();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#7ec8f5'); sky.addColorStop(1, '#d4f0ff');
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#a9dc7e'; ctx.fillRect(wx, wy + wh - 22, ww, 22);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#e28b6a', '#8cc4ff', '#f2c94c', '#b38ddf'][i]; ctx.fillRect(wx + 10 + i * ww / 4, wy + wh - 22 - 26 - (i % 2) * 12, ww / 4 - 20, 26 + (i % 2) * 12); }
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    // שלט תפריט עם ציורים
    const mx = L.P ? 360 : 690, my = L.P ? 180 : 60, mw = L.P ? 210 : 230, mh = L.P ? 110 : 120;
    ctx.fillStyle = '#3b2a20'; U.rr(ctx, mx, my, mw, mh, 10); ctx.fill();
    ctx.strokeStyle = '#c98b4f'; ctx.lineWidth = 5; U.rr(ctx, mx, my, mw, mh, 10); ctx.stroke();
    drawStack(U, ctx, ['bunB', 'patty', 'cheese', 'lettuce', 'bunT'], mx + mw * 0.3, my + mh * 0.72, 62);
    friesBox(U, ctx, mx + mw * 0.62, my + mh * 0.82, 0.8); cup(U, ctx, mx + mw * 0.84, my + mh * 0.85, 0.75);
    // מנורות
    for (const lx of L.P ? [150, 450] : [120, 840]) {
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 26); ctx.stroke();
      ctx.fillStyle = '#2f8f6f'; ctx.beginPath(); ctx.moveTo(lx - 20, 42); ctx.lineTo(lx - 8, 24); ctx.lineTo(lx + 8, 24); ctx.lineTo(lx + 20, 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,.55)'; ctx.beginPath(); ctx.ellipse(lx, 44, 14, 5, 0, 0, 6.3); ctx.fill();
    }
    // דלפק
    const cg = ctx.createLinearGradient(0, C, 0, L.room); cg.addColorStop(0, '#b77c45'); cg.addColorStop(1, '#8a5a2b');
    ctx.fillStyle = cg; ctx.fillRect(0, C + 12, W, L.room - C - 12);
    ctx.fillStyle = '#e9c48f'; ctx.fillRect(0, C, W, 14);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, C, W, 3);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, L.room - 4, W, 4);
    // מטבח: אריחים
    for (let y = L.room; y < H; y += 30) for (let x = 0; x < W; x += 30) { ctx.fillStyle = ((x + y) / 30) % 2 ? '#e9eef2' : '#dde4ea'; ctx.fillRect(x, y, 30, 30); }
    // גריל
    const G = L.grill;
    ctx.fillStyle = '#4a4f55'; U.rr(ctx, G.x, G.y, G.w, G.h, 14); ctx.fill();
    ctx.fillStyle = '#2b2f33'; U.rr(ctx, G.x + 8, G.y + 32, G.w - 16, G.h - 40, 10); ctx.fill();
    ctx.strokeStyle = '#5c636b'; ctx.lineWidth = 3; for (let x = G.x + 18; x < G.x + G.w - 12; x += 14) { ctx.beginPath(); ctx.moveTo(x, G.y + 36); ctx.lineTo(x, G.y + G.h - 12); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c4ccd4'; ctx.beginPath(); ctx.arc(G.x + 24 + i * 22, G.y + 17, 7, 0, 6.3); ctx.fill(); ctx.fillStyle = '#e8402f'; ctx.fillRect(G.x + 23 + i * 22, G.y + 11, 2, 6); }
    // מגש
    const T = L.tray;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; U.rr(ctx, T.x + 4, T.y + 8, T.w - 8, T.h - 8, 18); ctx.fill();
    ctx.fillStyle = '#c0392b'; U.rr(ctx, T.x, T.y, T.w, T.h - 6, 18); ctx.fill();
    ctx.fillStyle = '#e8402f'; U.rr(ctx, T.x + 8, T.y + 8, T.w - 16, T.h - 22, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; U.rr(ctx, T.x + 18, T.y + 16, T.w - 36, T.h - 38, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(232,64,47,.25)'; ctx.lineWidth = 2; for (let x = T.x + 30; x < T.x + T.w - 24; x += 18) { ctx.beginPath(); ctx.moveTo(x, T.y + 16); ctx.lineTo(x, T.y + T.h - 22); ctx.stroke(); }
  }
  let bgCache = { key: '', c: null };
  function bgFor(g, L) {
    const res = g.canvas.width / L.W, key = L.W + 'x' + L.H + ':' + g.canvas.width;
    if (bgCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(L.W * res)); c.height = Math.max(1, Math.round(L.H * res));
      const x = c.getContext('2d'); x.setTransform(res, 0, 0, res, 0, 0);
      paintBg(g, x, L); bgCache = { key, c };
    }
    return bgCache.c;
  }
  function machine(U, ctx, R, col, hov) {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; U.rr(ctx, R.x + 3, R.y + 6, R.w, R.h, 14); ctx.fill();
    const gr = ctx.createLinearGradient(R.x, 0, R.x + R.w, 0); gr.addColorStop(0, U.shade(col, 0.15)); gr.addColorStop(1, U.shade(col, -0.12));
    ctx.fillStyle = gr; U.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.fill();
    ctx.strokeStyle = hov ? '#fff' : U.shade(col, -0.35); ctx.lineWidth = hov ? 3 : 2; U.rr(ctx, R.x, R.y, R.w, R.h, 14); ctx.stroke();
  }
  function ring(ctx, x, y, r, f, col) {
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, f))); ctx.stroke();
  }
  function check(ctx, x, y, s) {
    ctx.fillStyle = '#3fa34d'; ctx.beginPath(); ctx.arc(x, y, 10 * s, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 4.5 * s, y); ctx.lineTo(x - 1 * s, y + 3.5 * s); ctx.lineTo(x + 5 * s, y - 3.5 * s); ctx.stroke();
  }

  // ---------- ציור: המטבח ----------
  function drawKitchen(g, ctx, S, t) {
    const L = S.L, U = S.up, nG = 2 + (U.grill || 0), H = S.hover;
    // גריל
    L.slots.forEach((R, i) => {
      if (i >= nG) { ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.fill(); lock(g, ctx, R.x + R.w / 2, R.y + R.h / 2, 1); return; }
      const p = S.grill[i], hov = H && H.k === 'slot' && H.i === i && p;
      ctx.strokeStyle = hov ? '#fff' : 'rgba(255,255,255,.12)'; ctx.lineWidth = hov ? 3 : 2; g.rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.stroke();
      if (!p) return;
      const st = pattyState(S, p), cx = R.x + R.w / 2, cy = R.y + R.h / 2 + 8, pw = Math.min(R.w - 34, 92), b = bump(S, 'slot' + i, 0.3);
      if (st < 2) { ctx.fillStyle = 'rgba(255,140,40,' + (0.18 + 0.1 * Math.sin(t * 9 + i)) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy - 4, pw * 0.62, 14, 0, 0, 6.3); ctx.fill(); }
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + b * 0.15, 1 + b * 0.15); layer(g, ctx, 'patty', 0, 6, pw, st); ctx.restore();
      const rx = R.x + R.w - 16, ry = R.y + 16;
      if (st === 0) ring(ctx, rx, ry, 9, p.t / cookT(U), '#9fd8ff');
      else if (st === 1) { const left = cookT(U) + burnT(U) - p.t; if (left < 1.6 && Math.sin(t * 16) > 0) ring(ctx, rx, ry, 9, 1, '#ff3b30'); else check(ctx, rx, ry, 1); }
      // אדים ועשן
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.8 + k / 3 + i * 0.37) % 1, a = (st === 2 ? 0.55 : st === 1 ? 0.35 : 0.18) * (1 - q);
        ctx.fillStyle = st === 2 ? 'rgba(60,60,60,' + a + ')' : 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(cx - pw * 0.3 + k * pw * 0.3 + Math.sin(q * 6 + k) * 4, cy - 10 - q * 34, 5 + q * 8, 0, 6.3); ctx.fill();
      }
    });
    // מגש
    const T = L.tray, tb = bump(S, 'tray', 0.25), bx = T.x + T.w * 0.36, by = T.y + T.h - 30, w = Math.min(120, T.w * 0.4);
    ctx.save(); ctx.translate(bx, by); ctx.scale(1 + tb * 0.05, 1 - tb * 0.04); ctx.translate(-bx, -by);
    if (S.tray.layers.length) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(bx, by + 2, w * 0.6, 7, 0, 0, 6.3); ctx.fill(); drawStack(g, ctx, S.tray.layers, bx, by, w); }
    else { ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(192,57,43,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(bx, by - 6, w * 0.55, 14, 0, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    if (S.tray.fries) friesBox(g, ctx, T.x + T.w * 0.7, by, L.P ? 0.95 : 1);
    if (S.tray.drink) cup(g, ctx, T.x + T.w * 0.87, by, L.P ? 0.85 : 0.9);
    // מכונת שתייה
    const SD = L.soda, sOn = has(S.day, 'drink');
    machine(g, ctx, SD, sOn ? '#2f8fd8' : '#8d939b', H && H.k === 'soda');
    ctx.fillStyle = '#d8eefc'; g.rr(ctx, SD.x + 16, SD.y + 14, SD.w - 32, 30, 8); ctx.fill();
    ctx.fillStyle = '#e8402f'; ctx.beginPath(); ctx.arc(SD.x + SD.w / 2, SD.y + 29, 9, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#5a6570'; g.rr(ctx, SD.x + SD.w / 2 - 10, SD.y + 50, 20, 14, 4); ctx.fill();
    const cupY = SD.y + SD.h - 18;
    if (sOn && S.soda.st > 0) {
      const f = S.soda.st === 2 ? 1 : S.soda.t / sodaT(U);
      if (S.soda.st === 1) { ctx.fillStyle = '#6b3a1a'; ctx.fillRect(SD.x + SD.w / 2 - 2, SD.y + 64, 4, cupY - 40 * 0.95 - SD.y - 64); }
      cup(g, ctx, SD.x + SD.w / 2, cupY, 0.95, f);
      if (S.soda.st === 1) ring(ctx, SD.x + SD.w - 18, SD.y + SD.h - 22, 9, f, '#9fd8ff'); else check(ctx, SD.x + SD.w - 18, SD.y + SD.h - 22, 1);
    } else { ctx.fillStyle = 'rgba(255,255,255,.18)'; g.rr(ctx, SD.x + SD.w / 2 - 22, cupY - 46, 44, 46, 8); ctx.fill(); }
    if (!sOn) { lock(g, ctx, SD.x + SD.w / 2, SD.y + SD.h / 2, 1.3); txt(g, ctx, g.t('fromDay', { n: UNLOCK.drink }), SD.x + SD.w / 2, SD.y + SD.h / 2 + 30, 16, { color: '#fff', maxW: SD.w - 12 }); }
    // מטגנת
    const FR = L.fryer, fOn = has(S.day, 'fries');
    machine(g, ctx, FR, fOn ? '#7d8a96' : '#8d939b', H && H.k === 'fryer');
    ctx.fillStyle = '#e0a23a'; g.rr(ctx, FR.x + 14, FR.y + FR.h * 0.42, FR.w - 28, FR.h * 0.36, 8); ctx.fill();
    if (fOn && S.fry.st === 1) for (let k = 0; k < 5; k++) { const q = (t * 2 + k * 0.2) % 1; ctx.fillStyle = 'rgba(255,240,200,' + (1 - q) + ')'; ctx.beginPath(); ctx.arc(FR.x + 24 + k * (FR.w - 48) / 4, FR.y + FR.h * 0.6 - q * 14, 3, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = '#c4ccd4'; ctx.lineWidth = 3; g.rr(ctx, FR.x + 22, FR.y + 18, FR.w - 44, FR.h * 0.3, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FR.x + FR.w / 2, FR.y + 18); ctx.lineTo(FR.x + FR.w / 2, FR.y + 4); ctx.stroke();
    if (fOn && S.fry.st > 0) {
      const f = S.fry.st === 2 ? 1 : S.fry.t / fryT(U);
      friesBox(g, ctx, FR.x + FR.w / 2, FR.y + 18 + FR.h * 0.3, 0.9, S.fry.st === 2);
      if (S.fry.st === 1) ring(ctx, FR.x + FR.w - 18, FR.y + FR.h - 18, 9, f, '#ffd84d'); else check(ctx, FR.x + FR.w - 18, FR.y + FR.h - 18, 1);
    }
    if (!fOn) { lock(g, ctx, FR.x + FR.w / 2, FR.y + FR.h / 2 - 10, 1.3); txt(g, ctx, g.t('fromDay', { n: UNLOCK.fries }), FR.x + FR.w / 2, FR.y + FR.h / 2 + 20, 16, { color: '#fff', maxW: FR.w - 12 }); }
    // פחי המצרכים
    BINS.forEach((id, i) => {
      const R = L.bins[i], on = has(S.day, id), hov = H && H.k === 'bin' && H.i === i, b = bump(S, 'bin' + id, 0.25);
      ctx.save(); ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(1 + b * 0.08, 1 + b * 0.08); ctx.translate(-R.w / 2, -R.h / 2);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; g.rr(ctx, 0, 4, R.w, R.h, 12); ctx.fill();
      const gr = ctx.createLinearGradient(0, 0, 0, R.h); gr.addColorStop(0, hov ? '#ffffff' : '#f4f6f8'); gr.addColorStop(1, '#c9d1d8');
      ctx.fillStyle = gr; g.rr(ctx, 0, 0, R.w, R.h, 12); ctx.fill();
      ctx.strokeStyle = hov ? '#2f8fd8' : '#98a3ad'; ctx.lineWidth = hov ? 3 : 2; ctx.stroke();
      ctx.globalAlpha = on ? 1 : 0.3;
      icon(g, ctx, id, R.w / 2, R.h * 0.42, Math.min(1.25, R.h / 80));
      ctx.globalAlpha = 1;
      if (on) txt(g, ctx, g.t(id), R.w / 2, R.h - 12, L.P ? 17 : 15, { color: '#3b4650', maxW: R.w - 8 });
      else { lock(g, ctx, R.w / 2, R.h * 0.42, 1); txt(g, ctx, g.t('fromDay', { n: UNLOCK[id] }), R.w / 2, R.h - 12, 13, { color: '#3b4650', maxW: R.w - 6 }); }
      if (!g.touch && !L.P) txt(g, ctx, String(i + 1), 10, 11, 12, { color: 'rgba(60,70,80,.5)' });
      ctx.restore();
    });
    // פח אשפה והגשה
    const TR = L.trash, th = H && H.k === 'trash';
    ctx.fillStyle = 'rgba(0,0,0,.22)'; g.rr(ctx, TR.x + 2, TR.y + 4, TR.w, TR.h, 12); ctx.fill();
    ctx.fillStyle = th ? '#9aa5b0' : '#7d8a96'; g.rr(ctx, TR.x, TR.y, TR.w, TR.h, 12); ctx.fill();
    const tx = TR.x + TR.w / 2, ty = TR.y + TR.h / 2 + 4, tl = bump(S, 'trash', 0.35);
    ctx.fillStyle = '#e9eef2'; ctx.beginPath(); ctx.moveTo(tx - 16, ty - 14); ctx.lineTo(tx + 16, ty - 14); ctx.lineTo(tx + 12, ty + 20); ctx.lineTo(tx - 12, ty + 20); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(tx + 20, ty - 17); ctx.rotate(-tl * 0.8); ctx.fillStyle = '#e9eef2'; g.rr(ctx, -40, -5, 40, 6, 3); ctx.fill(); ctx.fillRect(-24, -10, 8, 5); ctx.restore();
    ctx.strokeStyle = '#7d8a96'; ctx.lineWidth = 2.5; for (const dx of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(tx + dx, ty - 8); ctx.lineTo(tx + dx * 0.8, ty + 15); ctx.stroke(); }
    const ready = S.tray.layers.length && !trayOpen(S.tray);
    button(g, ctx, L.serve, '#3fa34d', g.t('serve'), { size: L.P ? 26 : 28, hot: H && H.k === 'serve', glow: ready ? 0.35 + 0.35 * Math.sin(t * 6) : 0,
      icon: (x, y, s) => { ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(x, y + 2 * s, 10 * s, Math.PI, 0); ctx.lineTo(x + 12 * s, y + 5 * s); ctx.lineTo(x - 12 * s, y + 5 * s); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 2 * s, y - 11 * s, 4 * s, 4 * s); } });
  }
  function drawBars(g, ctx, S, t) {
    const L = S.L, y = L.counter + 22, h = L.room - L.counter - 30, half = L.W / 2;
    const tgt = TARGET[S.day], ds = dayLen(S.day), tf = S.phase === 'run' ? Math.min(1, (S.t - S.t0) / ds) : 0;
    // שעון היום
    const cx = 24, cw = half - 40;
    ctx.fillStyle = 'rgba(40,20,5,.45)'; g.rr(ctx, cx, y, cw, h, h / 2); ctx.fill();
    const sg = ctx.createLinearGradient(cx, 0, cx + cw, 0); sg.addColorStop(0, '#ffd84d'); sg.addColorStop(1, '#ff8a3a');
    ctx.fillStyle = sg; g.rr(ctx, cx + 2, y + 2, Math.max(h - 4, (cw - 4) * tf), h - 4, (h - 4) / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + h / 2, y + h / 2, h / 2 - 3, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#3b2a20'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + h / 2, y + h / 2); ctx.lineTo(cx + h / 2, y + 5); ctx.moveTo(cx + h / 2, y + h / 2); ctx.lineTo(cx + h / 2 + 5, y + h / 2); ctx.stroke();
    const left = Math.max(0, Math.ceil(ds - (S.t - S.t0)));
    txt(g, ctx, S.closing ? g.t('closing') : Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), cx + cw / 2 + h / 2, y + h / 2 + 1, Math.min(18, h * 0.7), { color: '#fff', stroke: 'rgba(60,30,5,.6)', strokeW: 3, maxW: cw - h - 10 });
    // כסף מול היעד, עם שלושה כוכבים
    const mx = half + 16, mw = half - 40, top = tgt * 1.75, mf = Math.min(1, S.money / top);
    ctx.fillStyle = 'rgba(40,20,5,.45)'; g.rr(ctx, mx, y, mw, h, h / 2); ctx.fill();
    ctx.fillStyle = S.money >= tgt ? '#4cd964' : '#ffcc33'; g.rr(ctx, mx + 2, y + 2, Math.max(h - 4, (mw - 4) * mf), h - 4, (h - 4) / 2); ctx.fill();
    [1, 1.3, 1.6].forEach((k, i) => { const sx = mx + mw * (k / 1.75); star(ctx, sx, y + h / 2, h * 0.62, S.money >= tgt * k ? '#ffd84d' : 'rgba(255,255,255,.5)'); if (i === 0) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(sx - 1, y, 2, h); } });
    coin(ctx, mx + h / 2, y + h / 2, h / 2 - 3);
    txt(g, ctx, S.money + ' / ' + tgt, mx + h + 34, y + h / 2 + 1, Math.min(18, h * 0.7), { color: '#fff', stroke: 'rgba(60,30,5,.6)', strokeW: 3, dir: 'ltr', maxW: mw * 0.4 });
  }

  // ---------- חלון הפתיחה של היום: יעד, חדש היום ושדרוגים ----------
  function prepLayout(g, S) {
    const P = S.L.panel, cols = S.L.P ? 2 : 4, rows = S.L.P ? 4 : 2, gap = 10, top = P.y + (S.L.P ? 214 : 184);
    const cw = (P.w - 40 - gap * (cols - 1)) / cols, ch = Math.min(S.L.P ? 140 : 150, (P.y + P.h - 96 - top - gap * (rows - 1)) / rows);
    const cards = UPG.map((u, k) => { const c = k % cols, r = Math.floor(k / cols), cc = g.rtl ? cols - 1 - c : c; const R = rect(P.x + 20 + cc * (cw + gap), top + r * (ch + gap), cw, ch); return { u, R, btn: rect(R.x + 8, R.y + R.h - 42, R.w - 16, 34) }; });
    return { cards, go: rect(P.x + P.w / 2 - 150, P.y + P.h - 78, 300, 60) };
  }
  function drawPrep(g, ctx, S, t) {
    const L = S.L, P = L.panel, Ly = prepLayout(g, S), d = S.day;
    ctx.fillStyle = 'rgba(25,15,5,.55)'; ctx.fillRect(0, 0, L.W, L.H);
    ctx.fillStyle = 'rgba(30,15,5,.45)'; g.rr(ctx, P.x, P.y + 6, P.w, P.h, 22); ctx.fill();
    const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#fff6e0'); bg.addColorStop(1, '#f3dfb6');
    ctx.fillStyle = bg; g.rr(ctx, P.x, P.y, P.w, P.h, 22); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 5; g.rr(ctx, P.x + 2.5, P.y + 2.5, P.w - 5, P.h - 5, 20); ctx.stroke();
    txt(g, ctx, g.t('dayN', { n: d }), P.x + P.w / 2, P.y + 38, 36, { color: '#c0392b', stroke: '#fff', strokeW: 6, maxW: P.w - 60 });
    // יעד וכוכבים
    const tg = TARGET[d], row = (y, parts) => { let tot = 0; ctx.font = '800 22px ' + FONT; for (const p of parts) tot += p.w || ctx.measureText(p.s).width + 8; let x = P.x + P.w / 2 - tot / 2; for (const p of parts) { if (p.icon) { p.icon(x + p.w / 2, y); x += p.w; } else { const w = ctx.measureText(p.s).width; g.text(ctx, p.s, x + w / 2, y, { size: 22, color: p.c || '#4a2a0a' }); x += w + 8; } } };
    txt(g, ctx, g.t('target', { n: tg }), P.x + P.w / 2, P.y + 80, 24, { color: '#4a2a0a', maxW: P.w - 60 });
    row(P.y + 112, [{ icon: (x, y) => star(ctx, x, y, 11, '#ffc61a'), w: 26 }, { s: String(tg) }, { icon: (x, y) => { star(ctx, x - 7, y, 10, '#ffc61a'); star(ctx, x + 7, y, 10, '#ffc61a'); }, w: 36 }, { s: String(Math.ceil(tg * 1.3)) }, { icon: (x, y) => { for (const k of [-13, 0, 13]) star(ctx, x + k, y, 9, '#ffc61a'); }, w: 44 }, { s: String(Math.ceil(tg * 1.6)) }]);
    // חדש היום
    const nw = Object.keys(UNLOCK).filter(k => UNLOCK[k] === d && d > 1);
    let y2 = P.y + 148;
    if (nw.length) {
      ctx.fillStyle = '#fff1b8'; g.rr(ctx, P.x + P.w / 2 - 190, y2 - 20, 380, 40, 20); ctx.fill();
      const s = g.t('newToday') + ' ' + nw.map(k => g.t(k)).join(', ');
      icon(g, ctx, nw[0], g.rtl ? P.x + P.w / 2 + 166 : P.x + P.w / 2 - 166, y2, 0.5);
      txt(g, ctx, s, P.x + P.w / 2, y2 + 1, 20, { color: '#c0392b', maxW: 300 });
    }
    // חסכונות ושדרוגים
    const by = Ly.cards[0].R.y - 18;
    txt(g, ctx, g.t('upgrades'), g.rtl ? P.x + P.w - 24 : P.x + 24, by, 20, { color: '#7a5a3a', align: g.rtl ? 'right' : 'left', maxW: P.w / 2 - 40 });
    ctx.font = '800 21px ' + FONT;
    const bs = g.t('bank') + ': ' + S.prog.bank, bw = Math.min(P.w / 2 - 40, ctx.measureText(bs).width);
    const bx = g.rtl ? P.x + 24 + bw / 2 + 14 : P.x + P.w - 24 - bw / 2;
    coin(ctx, g.rtl ? P.x + 30 : bx - bw / 2 - 16, by, 10);
    txt(g, ctx, bs, bx, by + 1, 21, { color: '#7a4f00', maxW: P.w / 2 - 70 });
    for (const c of Ly.cards) {
      const R = c.R, u = c.u, lv = S.up[u.id] || 0, max = lv >= u.costs.length, locked = d < u.day, hov = S.hover && S.hover.k === 'up' && S.hover.id === u.id, b = bump(S, 'up' + u.id, 0.35);
      ctx.save(); ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(1 + b * 0.06, 1 + b * 0.06); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2);
      ctx.fillStyle = 'rgba(120,80,30,.18)'; g.rr(ctx, R.x, R.y + 3, R.w, R.h, 12); ctx.fill();
      ctx.fillStyle = max ? '#eaf6e4' : '#fffaf0'; g.rr(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(160,112,58,.45)'; ctx.lineWidth = 2; ctx.stroke();
      txt(g, ctx, g.t(u.id) + (u.costs.length > 1 ? ' ' + Math.min(lv + 1, u.costs.length) + '/' + u.costs.length : ''), R.x + R.w / 2, R.y + 20, 18, { color: '#4a2a0a', maxW: R.w - 14 });
      para(g, ctx, g.t(u.id + 'D'), R.x + R.w / 2, R.y + (R.h - 42) / 2 + 16, R.w - 16, 15, 2, { color: '#7a5a3a', weight: 600 });
      if (max) { txt(g, ctx, '✓ ' + g.t('owned'), c.btn.x + c.btn.w / 2, c.btn.y + c.btn.h / 2, 17, { color: '#2f7a3a', maxW: c.btn.w - 8 }); }
      else if (locked) { lock(g, ctx, c.btn.x + 18, c.btn.y + c.btn.h / 2, 0.75); txt(g, ctx, g.t('fromDay', { n: u.day }), c.btn.x + c.btn.w / 2 + 8, c.btn.y + c.btn.h / 2 + 1, 15, { color: '#6b5a4a', maxW: c.btn.w - 40 }); }
      else button(g, ctx, c.btn, '#3fa34d', String(u.costs[lv]), { off: S.prog.bank < u.costs[lv], size: 18, hot: hov, icon: (x, y, s) => coin(ctx, x, y, 8 * s) });
      ctx.restore();
    }
    button(g, ctx, Ly.go, '#e8402f', g.t('startDay'), { size: 26, hot: S.hover && S.hover.k === 'go', glow: 0.3 + 0.3 * Math.sin(t * 4) });
  }

  // ---------- הדרכה ביום הראשון ----------
  function tutor(g, S) {
    if (S.day !== 1 || S.tutDone || S.phase !== 'run') return null;
    const L = S.L, T = S.tray, live = S.cust.filter(c => c && c.st === 1), tk = g.touch ? 't' : '';
    if (!live.length) return null;
    const o = live[0].o, nG = 2 + (S.up.grill || 0);
    const ready = S.grill.findIndex((p, i) => i < nG && p && pattyState(S, p) === 1), raw = S.grill.findIndex((p, i) => i < nG && p && pattyState(S, p) === 0);
    if (matches(T, o)) return { key: 'tut6' + tk, R: rect(live[0].x - 30, L.headY - 70, 60, 40) };
    if (!T.layers.length) return { key: 'tut1' + tk, R: L.bins[1] };
    const next = o.layers[T.layers.length];
    if (next === 'patty') {
      if (ready >= 0) return { key: 'tut4' + tk, R: L.slots[ready] };
      if (raw >= 0) return { key: 'tut3', R: L.slots[raw] };
      return { key: 'tut2', R: L.bins[0] };
    }
    if (next === 'bunT') return { key: 'tut5', R: L.bins[1] };
    return { key: 'tut7', R: null };
  }
  function banner(g, ctx, S, s, t) {
    const L = S.L;
    ctx.font = '800 21px ' + FONT;
    const tw = Math.min(L.W - 80, ctx.measureText(s).width), bw = tw + 40, bh = 42, x = L.W / 2 - bw / 2, y = L.counter - bh - 6;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.rr(ctx, x, y + 3, bw, bh, 21); ctx.fill();
    ctx.fillStyle = 'rgba(45,30,15,.92)'; g.rr(ctx, x, y, bw, bh, 21); ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,130,' + (0.6 + 0.3 * Math.sin(t * 4)) + ')'; ctx.lineWidth = 2.5; ctx.stroke();
    txt(g, ctx, s, L.W / 2, y + bh / 2 + 1, 21, { color: '#ffe8a3', maxW: L.W - 80 });
  }
  function arrow(ctx, x, y, t) {
    const b = Math.sin(t * 7) * 6;
    ctx.save(); ctx.translate(x, y + b);
    ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, -17); ctx.lineTo(-6, -17); ctx.lineTo(-6, -34); ctx.lineTo(6, -34); ctx.lineTo(6, -17); ctx.lineTo(15, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ---------- מה יש מתחת לנקודה ----------
  function hit(g, S, p) {
    const L = S.L;
    if (S.phase === 'prep') {
      const Ly = prepLayout(g, S);
      if (inR(p, Ly.go)) return { k: 'go' };
      for (const c of Ly.cards) if (inR(p, c.btn)) return { k: 'up', id: c.u.id };
      return null;
    }
    for (let i = 0; i < BINS.length; i++) if (inR(p, L.bins[i])) return { k: 'bin', i };
    for (let i = 0; i < 4; i++) if (inR(p, L.slots[i])) return { k: 'slot', i };
    if (inR(p, L.soda)) return { k: 'soda' };
    if (inR(p, L.fryer)) return { k: 'fryer' };
    if (inR(p, L.trash)) return { k: 'trash' };
    if (inR(p, L.serve) || inR(p, L.tray)) return { k: 'serve' };
    if (p.y < L.counter + 10) {
      let best = null, bd = 1e9;
      for (const c of S.cust) if (c && c.st === 1) { const d = Math.abs(c.x - p.x); if (d < bd && d < (L.P ? 95 : 140)) { bd = d; best = c; } }
      if (best) return { k: 'cust', c: best };
    }
    return null;
  }

  // ---------- הרישום ----------
  GK.register('burger-shop', {
    get w() { return PORT() ? 600 : 960; },
    get h() { return PORT() ? 1000 : 600; },
    bg: '#3a1f14', accent: '#ffb347',
    levels: DAYS,
    text: TXT,

    init(g) {
      const L = layout(g.W, g.H), prog = loadProg(g), day = g.demo ? 7 : g.level;
      const S = g.s = {
        L, day, prog, up: prog.up, demo: !!g.demo, phase: g.demo ? 'demo' : 'prep', t: 0, t0: 0, money: 0, served: 0, tipsSum: 0, lost: 0,
        tray: { layers: [], drink: false, fries: false }, grill: [null, null, null, null], soda: { st: 0, t: 0 }, fry: { st: 0, t: 0 },
        cust: [null, null, null], nextT: 1.2, closing: false, ended: false, endT: 0, pop: {}, hover: null, botT: 0.6, errT: -9, sizzleT: 0, tutDone: false,
        rnd: { pick: a => a[Math.floor(Math.random() * a.length)] },
      };
      if (g.demo) {
        // רקע התפריט: מסעדה פתוחה עם לקוחות, המבורגר על המגש וקציצות על הגריל
        S.cust = [0, 1, 2].map(i => { const c = newCustomer(S, i); c.x = L.spots[i]; c.st = 1; c.pat = c.max * (0.9 - i * 0.25); return c; });
        S.tray.layers = ['bunB', 'patty', 'cheese', 'lettuce']; S.tray.fries = true;
        S.grill = [{ t: 2, s: 0 }, { t: 6, s: 0 }, null, null]; S.soda = { st: 1, t: 1.2 };
      }
    },

    step(g) {
      const S = g.s, U = S.up, L = S.L;
      S.t += DT;
      S.hover = !g.touch && g.ptr.over ? hit(g, S, g.ptr) : null;
      g.canvas.style.cursor = S.hover ? 'pointer' : 'default';
      g.hud([[g.t('day'), S.day + '/' + DAYS, '#ffb347'], [g.t('money'), S.money + '/' + TARGET[S.day], S.money >= TARGET[S.day] ? '#4cd964' : '#ffd166']]);
      if (S.phase !== 'run') return;
      const el = S.t - S.t0, nG = 2 + (U.grill || 0);
      // גריל, שתייה, צ'יפס
      let sizzle = false;
      for (let i = 0; i < nG; i++) {
        const p = S.grill[i];
        if (!p) continue;
        const before = pattyState(S, p);
        p.t += DT; sizzle = true;
        const after = pattyState(S, p);
        if (after !== before) { pop(S, 'slot' + i); if (after === 1) g.tone({ f: 1250, f2: 1500, dur: 0.12, type: 'triangle', vol: 0.12 }); else { g.tone({ f: 160, f2: 90, dur: 0.3, type: 'sawtooth', vol: 0.06 }); const R = L.slots[i]; g.burst(R.x + R.w / 2, R.y + R.h / 2, { n: 10, color: ['#555', '#888'], speed: 1.5, life: 34, gravity: -0.05 }); } }
      }
      if (sizzle && (S.sizzleT -= DT) <= 0) { S.sizzleT = 0.9; g.noise({ f: 5000, f2: 3000, dur: 0.5, vol: 0.035, filter: 'highpass' }); }
      if (S.soda.st === 1 && (S.soda.t += DT) >= sodaT(U)) { S.soda.st = 2; g.sfx('pop', { p: 1.3 }); pop(S, 'soda'); }
      if (S.fry.st === 1 && (S.fry.t += DT) >= fryT(U)) { S.fry.st = 2; g.sfx('pop', { p: 1.1 }); pop(S, 'fryer'); }
      // לקוחות
      const open = el < dayLen(S.day);
      if (!open && !S.closing) { S.closing = true; g.msg(g.t('closing'), 1500, '#ffe066'); g.tone({ f: 880, dur: 0.15, type: 'triangle', vol: 0.12 }); g.tone({ f: 660, dur: 0.25, type: 'triangle', vol: 0.12, delay: 0.16 }); }
      if (open && (S.nextT -= DT) <= 0) {
        const free = [0, 1, 2].filter(i => !S.cust[i]);
        if (free.length) {
          const spot = free[Math.floor(Math.random() * free.length)];
          S.cust[spot] = newCustomer(S, spot);
          g.tone({ f: 988, dur: 0.1, type: 'triangle', vol: 0.1 }); g.tone({ f: 1319, dur: 0.18, type: 'triangle', vol: 0.1, delay: 0.1 });
          const d = S.day, lo = Math.max(3.4, 7 - d * 0.15), hi = Math.max(5.4, 10 - d * 0.2);
          S.nextT = lo + Math.random() * (hi - lo);
        } else S.nextT = 0.5;
      }
      S.cust.forEach((c, i) => {
        if (!c) return;
        c.t += DT;
        if (c.frown > 0) c.frown -= DT;
        if (c.st === 0) { c.x += (c.tx - c.x) * 0.12; if (Math.abs(c.x - c.tx) < 2) { c.x = c.tx; c.st = 1; } }
        else if (c.st === 1) {
          c.pat -= DT;
          if (c.pat <= 0) { c.st = 2; c.mood = -1; c.t = 0; S.lost++; g.msg(g.t('left'), 900, '#ffb3a8'); g.tone({ f: 330, f2: 220, dur: 0.35, type: 'triangle', vol: 0.12 }); g.burst(c.x, L.headY - 60, { n: 12, color: ['#ff6b6b', '#ffb3a8'], speed: 2.5, life: 30 }); }
        } else {
          const dir = c.x < L.W / 2 ? -1 : 1;
          c.x += dir * Math.min(9, 2 + c.t * 10);
          if (c.x < -120 || c.x > L.W + 120) S.cust[i] = null;
        }
      });
      // סוף היום
      if (S.closing && !S.ended && !S.cust.some(c => c)) {
        S.ended = true; S.endT = 0.6;
      }
      if (S.ended && (S.endT -= DT) <= 0 && g.state === 'play') {
        S.prog.bank += S.money; saveProg(g, S.prog);
        const tg = TARGET[S.day], text = g.t('earned', { n: S.money, m: tg });
        if (S.money >= tg) g.completeLevel(S.money >= tg * 1.6 ? 3 : S.money >= tg * 1.3 ? 2 : 1, { text, title: g.t('dayDone', { n: S.day }) });
        else g.end({ result: 'lose', score: null, text, title: g.t('dayFail') });
      }
    },

    idle(g) { if (g.s) g.s.t += DT; },
    bot(g) { botStep(g); },

    onKey(g, e) {
      const S = g.s;
      if (S.phase === 'prep') { if (e.code === 'Enter' || e.code === 'Space') act.open(g); return; }
      if (S.phase !== 'run') return;
      const m = /^Digit([1-7])$/.exec(e.code);
      if (m) { act.bin(g, BINS[+m[1] - 1]); return; }
      if (e.code === 'Space' || e.code === 'Enter') act.serve(g, null);
      else if (e.code === 'Backspace' || e.code === 'KeyX' || e.code === 'Delete') act.trash(g);
      else if (e.code === 'KeyQ') act.soda(g);
      else if (e.code === 'KeyW') act.fryer(g);
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type !== 'down') return;
      const h = hit(g, S, p);
      if (!h) return;
      if (h.k === 'go') act.open(g);
      else if (h.k === 'up') act.buy(g, h.id);
      else if (S.phase !== 'run') return;
      else if (h.k === 'bin') act.bin(g, BINS[h.i]);
      else if (h.k === 'slot') act.slot(g, h.i);
      else if (h.k === 'soda') act.soda(g);
      else if (h.k === 'fryer') act.fryer(g);
      else if (h.k === 'trash') act.trash(g);
      else if (h.k === 'serve') act.serve(g, null);
      else if (h.k === 'cust') act.serve(g, h.c);
    },

    draw(g, ctx) {
      const S = g.s, L = S.L, t = S.t;
      ctx.drawImage(bgFor(g, L), 0, 0, L.W, L.H);
      // לקוחות (מאחורי הדלפק) ובועות
      for (const c of S.cust) if (c) drawCustomer(g, ctx, c, c.x, L.counter + 30, L.P ? 0.95 : 1, t);
      ctx.fillStyle = '#e9c48f'; ctx.fillRect(0, L.counter, L.W, 14);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, L.counter, L.W, 3);
      const cg = ctx.createLinearGradient(0, L.counter + 14, 0, L.room); cg.addColorStop(0, '#b77c45'); cg.addColorStop(1, '#8a5a2b');
      ctx.fillStyle = cg; ctx.fillRect(0, L.counter + 14, L.W, L.room - L.counter - 18);
      for (const c of S.cust) if (c && c.st === 1) { orderBubble(g, ctx, S, c, c.x, L.bubY, t); if (S.hover && S.hover.k === 'cust' && S.hover.c === c) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c.x, L.headY - 30, 46, 58, 0, 0, 6.3); ctx.stroke(); } }
      drawBars(g, ctx, S, t);
      drawKitchen(g, ctx, S, t);
      if (S.phase === 'prep') { drawPrep(g, ctx, S, t); return; }
      const tt = tutor(g, S);
      if (tt) { banner(g, ctx, S, g.t(tt.key), t); if (tt.R) arrow(ctx, tt.R.x + tt.R.w / 2, tt.R.y + 6, t); }
    },

    cover(ctx, w, h, k) {
      // תמונת הכרטיס: לקוחות מחכים, המבורגר ענק, צ'יפס ושתייה
      const L = layout(960, 600), S = { L, day: 12, up: {}, pop: {}, t: 0.5 };
      paintBg(k, ctx, Object.assign({}, L, { H: 540 }));
      const looks = [{ skin: '#f1c27d', hair: '#5a3825', shirt: '#2f8fd8', style: 0, hat: false, glasses: false }, { skin: '#c68642', hair: '#1b1b1b', shirt: '#e85d9c', style: 2, hat: false, glasses: true }, { skin: '#ffdbc4', hair: '#e6c27a', shirt: '#3fa34d', style: 4, hat: true, glasses: false }];
      const orders = [{ layers: ['bunB', 'patty', 'cheese', 'lettuce', 'bunT'], drink: true }, { layers: ['bunB', 'patty', 'tomato', 'onion', 'bunT'], fries: true }, { layers: ['bunB', 'patty', 'patty', 'cheese', 'sauce', 'bunT'] }];
      [0, 1, 2].forEach(i => { const c = { look: looks[i], o: orders[i], st: 1, pat: 10 - i * 3, max: 10, mood: i === 0 ? 1 : 0, frown: 0, ph: i }; drawCustomer(k, ctx, c, L.spots[i], L.counter + 30, 1, 1.3); orderBubble(k, ctx, S, c, L.spots[i], L.bubY, 0.5); });
      ctx.fillStyle = '#e9c48f'; ctx.fillRect(0, L.counter, w, 14);
      const cg = ctx.createLinearGradient(0, L.counter + 14, 0, h); cg.addColorStop(0, '#b77c45'); cg.addColorStop(1, '#6a4324');
      ctx.fillStyle = cg; ctx.fillRect(0, L.counter + 14, w, h - L.counter);
      // המבורגר ענק במרכז
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(w / 2, h - 34, 170, 18, 0, 0, 6.3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(w / 2, h - 40); ctx.scale(2.5, 2.5); drawStack(k, ctx, ['bunB', 'patty', 'cheese', 'lettuce', 'tomato', 'patty', 'cheese', 'sauce', 'bunT'], 0, 0, 116); ctx.restore();
      ctx.save(); ctx.translate(w / 2 - 290, h - 30); ctx.scale(2.6, 2.6); friesBox(k, ctx, 0, 0, 1); ctx.restore();
      ctx.save(); ctx.translate(w / 2 + 290, h - 30); ctx.scale(2.4, 2.4); cup(k, ctx, 0, 0, 1); ctx.restore();
    },
  });
})();
