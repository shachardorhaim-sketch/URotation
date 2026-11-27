// ============================================================
//  ציירו ונחשו — משחק 2D של URotation (המנוע: g2d/kit.js)
//  בכל תור שחקן אחד מצייר מילה והשאר מנחשים. אונליין: חדר עם קוד של 4 אותיות (PeerJS, 2–6 שחקנים) —
//  המארח מנהל את המשחק, והקווים עוברים לכולם בזמן אמת. בחדר אחד: המצייר מחזיק את המכשיר והחברים צועקים.
// ============================================================
(function () {
  'use strict';
  const W = 1000, H = 625;
  const BX = 196, BY = 64, BW = 560, BH = 436;       // דף הציור
  const PX = 8, PW = 180, CX = 764, CW = 228;       // שחקנים משמאל, צ'אט / כפתורים מימין
  const TOP = 64, BOT = 617, TBY = 508;             // TBY = סרגל הכלים שמתחת לדף
  const DRAW_MS = 80000, CHOOSE_MS = 15000, REVEAL_MS = 5500, PODIUM_MS = 9000, LOCAL_S = 80;
  const MAXP = 6, MAXL = 8, PREFIX = 'flrot-dg-';
  const COLORS = ['#1d1d24', '#ffffff', '#8d93a0', '#e8383d', '#ff8a1f', '#ffd21f', '#4cc93f', '#16803c', '#38b6ff', '#2453d6', '#8f4ae8', '#ff70b8', '#8a5a2e', '#f6c8a0'];
  const SIZES = [4, 9, 16, 28];
  const AV = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#20c997', '#f06595'];
  const REACT = ['👍', '😂', '😮', '❤️'];
  const COLS = ['en', 'he', 'ar', 'es', 'fr', 'pt', 'ru', 'de'];
  const INK = '#2a2350', MUTED = '#8a84a8', GOOD = '#2fbf62', HOT = '#ff5a6a', SUN = '#ffcc33', VIO = '#7a4cff';
  const now = () => performance.now();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ----- המילים: כל שורה היא מושג אחד ב-8 השפות (en|he|ar|es|fr|pt|ru|de), "/" = עוד צורה שמתקבלת -----
  // ניחוש נבדק מול כל השפות, אז בחדר שמעורבים בו כמה שפות כל אחד מנחש בשפה שלו
  const RAW = `
apple|תפוח|تفاحة|manzana|pomme|maçã|яблоко|Apfel
banana|בננה|موزة|plátano/banana|banane|banana|банан|Banane
cat|חתול|قطة/قط|gato|chat|gato|кошка/кот|Katze
dog|כלב|كلب|perro|chien|cachorro/cão|собака|Hund
house|בית|بيت/منزل|casa|maison|casa|дом|Haus
sun|שמש|شمس|sol|soleil|sol|солнце|Sonne
moon|ירח|قمر|luna|lune|lua|луна|Mond
star|כוכב|نجمة|estrella|étoile|estrela|звезда|Stern
tree|עץ|شجرة|árbol|arbre|árvore|дерево|Baum
flower|פרח|زهرة/وردة|flor|fleur|flor|цветок|Blume
car|מכונית/אוטו|سيارة|coche/carro/auto|voiture|carro|машина|Auto
bicycle/bike|אופניים|دراجة|bicicleta/bici|vélo|bicicleta|велосипед|Fahrrad
airplane/plane|מטוס|طائرة|avión|avion|avião|самолёт|Flugzeug
boat|סירה|قارب|barco|bateau|barco|лодка|Boot
train|רכבת|قطار|tren|train|trem|поезд|Zug
fish|דג|سمكة|pez|poisson|peixe|рыба|Fisch
bird|ציפור|طائر/عصفور|pájaro|oiseau|pássaro|птица|Vogel
horse|סוס|حصان|caballo|cheval|cavalo|лошадь/конь|Pferd
cow|פרה|بقرة|vaca|vache|vaca|корова|Kuh
sheep|כבשה|خروف|oveja|mouton|ovelha|овца|Schaf
chicken/hen|תרנגולת|دجاجة|gallina|poule|galinha|курица|Huhn
duck|ברווז|بطة|pato|canard|pato|утка|Ente
rabbit/bunny|ארנב|أرنب|conejo|lapin|coelho|кролик/заяц|Hase/Kaninchen
mouse|עכבר|فأر|ratón|souris|rato|мышь|Maus
elephant|פיל|فيل|elefante|éléphant|elefante|слон|Elefant
lion|אריה|أسد|león|lion|leão|лев|Löwe
giraffe|ג'ירפה|زرافة|jirafa|girafe|girafa|жираф|Giraffe
monkey|קוף|قرد|mono|singe|macaco|обезьяна|Affe
snake|נחש|ثعبان|serpiente|serpent|cobra|змея|Schlange
turtle|צב|سلحفاة|tortuga|tortue|tartaruga|черепаха|Schildkröte
frog|צפרדע|ضفدع|rana|grenouille|sapo|лягушка|Frosch
butterfly|פרפר|فراشة|mariposa|papillon|borboleta|бабочка|Schmetterling
bee|דבורה|نحلة|abeja|abeille|abelha|пчела|Biene
spider|עכביש|عنكبوت|araña|araignée|aranha|паук|Spinne
snail|חילזון|حلزون|caracol|escargot|caracol|улитка|Schnecke
bear|דוב|دب|oso|ours|urso|медведь|Bär
penguin|פינגווין|بطريق|pingüino|pingouin/manchot|pinguim|пингвин|Pinguin
owl|ינשוף|بومة|búho/lechuza|hibou/chouette|coruja|сова|Eule
whale|לווייתן|حوت|ballena|baleine|baleia|кит|Wal
shark|כריש|قرش|tiburón|requin|tubarão|акула|Hai
octopus|תמנון|أخطبوط|pulpo|pieuvre/poulpe|polvo|осьминог|Krake/Oktopus
dinosaur|דינוזאור|ديناصور|dinosaurio|dinosaure|dinossauro|динозавр|Dinosaurier
dragon|דרקון|تنين|dragón|dragon|dragão|дракон|Drache
pizza|פיצה|بيتزا|pizza|pizza|pizza|пицца|Pizza
cake|עוגה|كعكة/كيك|pastel/tarta|gâteau|bolo|торт|Kuchen/Torte
ice cream|גלידה|بوظة/آيس كريم/مثلجات|helado|glace|sorvete/gelado|мороженое|Eis
bread|לחם|خبز|pan|pain|pão|хлеб|Brot
cheese|גבינה|جبن/جبنة|queso|fromage|queijo|сыр|Käse
egg|ביצה|بيضة|huevo|œuf/oeuf|ovo|яйцо|Ei
carrot|גזר|جزرة|zanahoria|carotte|cenoura|морковь|Karotte/Möhre
tomato|עגבנייה|طماطم/بندورة|tomate|tomate|tomate|помидор|Tomate
strawberry|תות|فراولة|fresa/frutilla|fraise|morango|клубника|Erdbeere
grapes|ענבים|عنب|uvas/uva|raisin|uva|виноград|Trauben
watermelon|אבטיח|بطيخ|sandía|pastèque|melancia|арбуз|Wassermelone
lemon|לימון|ليمون/ليمونة|limón|citron|limão|лимон|Zitrone
cherry|דובדבן|كرز|cereza|cerise|cereja|вишня|Kirsche
pear|אגס|إجاص/كمثرى|pera|poire|pera|груша|Birne
mushroom|פטרייה|فطر|hongo/champiñón/seta|champignon|cogumelo|гриб|Pilz
corn|תירס|ذرة|maíz/choclo|maïs|milho|кукуруза|Mais
candy/sweet|סוכרייה|حلوى/سكاكر|caramelo/dulce|bonbon|bala/doce|конфета|Bonbon
cookie/biscuit|עוגייה|بسكويت|galleta|biscuit/cookie|biscoito/bolacha|печенье|Keks
hamburger/burger|המבורגר|همبرغر/برغر|hamburguesa|hamburger|hambúrguer|гамбургер|Hamburger
sandwich|כריך/סנדוויץ'|شطيرة/ساندويش|sándwich/bocadillo|sandwich|sanduíche|бутерброд|Sandwich
milk|חלב|حليب|leche|lait|leite|молоко|Milch
cup/mug|כוס/ספל|كوب|taza|tasse|xícara/caneca|чашка/кружка|Tasse
spoon|כף|ملعقة|cuchara|cuillère|colher|ложка|Löffel
fork|מזלג|شوكة|tenedor|fourchette|garfo|вилка|Gabel
plate|צלחת|صحن|plato|assiette|prato|тарелка|Teller
table|שולחן|طاولة|mesa|table|mesa|стол|Tisch
chair|כיסא|كرسي|silla|chaise|cadeira|стул|Stuhl
bed|מיטה|سرير|cama|lit|cama|кровать|Bett
lamp|מנורה|مصباح|lámpara|lampe|luminária/abajur|лампа|Lampe
door|דלת|باب|puerta|porte|porta|дверь|Tür
window|חלון|نافذة/شباك|ventana|fenêtre|janela|окно|Fenster
key|מפתח|مفتاح|llave|clé/clef|chave|ключ|Schlüssel
clock|שעון|ساعة|reloj|horloge/pendule|relógio|часы|Uhr
book|ספר|كتاب|libro|livre|livro|книга|Buch
pencil|עיפרון|قلم|lápiz|crayon|lápis|карандаш|Bleistift/Stift
scissors|מספריים|مقص|tijeras|ciseaux|tesoura|ножницы|Schere
phone|טלפון/פלאפון|هاتف/جوال|teléfono/celular/móvil|téléphone|telefone/celular|телефон|Telefon/Handy
computer|מחשב|حاسوب/كمبيوتر|computadora/ordenador|ordinateur|computador|компьютер|Computer
television/tv|טלוויזיה|تلفاز/تلفزيون|televisión/tele|télévision/télé|televisão/tv|телевизор|Fernseher
camera|מצלמה|كاميرا|cámara|appareil photo/caméra|câmera|фотоаппарат/камера|Kamera
ball|כדור|كرة|pelota/balón|balle/ballon|bola|мяч|Ball
balloon|בלון|بالون|globo|ballon|balão/bexiga|шарик/воздушный шар|Luftballon/Ballon
drum|תוף|طبل|tambor|tambour|tambor|барабан|Trommel
guitar|גיטרה|غيتار/جيتار|guitarra|guitare|violão/guitarra|гитара|Gitarre
piano|פסנתר|بيانو|piano|piano|piano|пианино/рояль|Klavier
hat|כובע|قبعة|sombrero/gorro|chapeau|chapéu|шляпа|Hut
shoe|נעל|حذاء|zapato|chaussure|sapato|ботинок/туфля|Schuh
shirt/t-shirt|חולצה|قميص|camisa/camiseta|chemise/t-shirt|camisa/camiseta|рубашка/футболка|Hemd/T-Shirt
glasses|משקפיים|نظارة|gafas/lentes|lunettes|óculos|очки|Brille
umbrella|מטרייה|مظلة|paraguas|parapluie|guarda-chuva|зонт/зонтик|Regenschirm/Schirm
crown|כתר|تاج|corona|couronne|coroa|корона|Krone
ring|טבעת|خاتم|anillo|bague|anel|кольцо|Ring
backpack/bag|תיק/תיק גב|حقيبة/حقيبة ظهر|mochila|sac à dos/cartable|mochila|рюкзак|Rucksack
sock|גרב|جورب|calcetín|chaussette|meia|носок|Socke
heart|לב|قلب|corazón|cœur/coeur|coração|сердце|Herz
eye|עין|عين|ojo|œil/oeil|olho|глаз|Auge
hand|יד|يد|mano|main|mão|рука/ладонь|Hand
foot|רגל/כף רגל|قدم|pie|pied|pé|нога/ступня|Fuß
nose|אף|أنف|nariz|nez|nariz|нос|Nase
ear|אוזן|أذن|oreja|oreille|orelha|ухо|Ohr
mouth|פה|فم|boca|bouche|boca|рот|Mund
tooth|שן|سن|diente|dent|dente|зуб|Zahn
robot|רובוט|روبوت|robot|robot|robô|робот|Roboter
rocket/spaceship|חללית|صاروخ فضائي/صاروخ|cohete|fusée|foguete|ракета|Rakete
snowman|איש שלג|رجل الثلج/رجل ثلج|muñeco de nieve|bonhomme de neige|boneco de neve|снеговик|Schneemann
rainbow|קשת/קשת בענן|قوس قزح|arcoíris/arco iris|arc-en-ciel|arco-íris|радуга|Regenbogen
cloud|ענן|غيمة/سحابة|nube|nuage|nuvem|облако/туча|Wolke
rain|גשם|مطر|lluvia|pluie|chuva|дождь|Regen
snow|שלג|ثلج|nieve|neige|neve|снег|Schnee
fire|אש|نار|fuego|feu|fogo|огонь|Feuer
mountain|הר|جبل|montaña|montagne|montanha|гора|Berg
island|אי|جزيرة|isla|île|ilha|остров|Insel
beach|חוף/חוף ים|شاطئ|playa|plage|praia|пляж|Strand
river|נהר|نهر|río|rivière/fleuve|rio|река|Fluss
volcano|הר געש|بركان|volcán|volcan|vulcão|вулкан|Vulkan
castle|טירה|قلعة|castillo|château|castelo|замок|Burg/Schloss
bridge|גשר|جسر|puente|pont|ponte|мост|Brücke
tent|אוהל|خيمة|carpa/tienda|tente|barraca/tenda|палатка|Zelt
school|בית ספר|مدرسة|escuela/colegio|école|escola|школа|Schule
bus|אוטובוס|حافلة/باص|autobús/bus|bus/autobus|ônibus|автобус|Bus
truck/lorry|משאית|شاحنة|camión|camion|caminhão|грузовик|Lastwagen/LKW
helicopter|מסוק|مروحية/هليكوبتر|helicóptero|hélicoptère|helicóptero|вертолёт|Hubschrauber
tractor|טרקטור|جرار|tractor|tracteur|trator|трактор|Traktor
skateboard|סקייטבורד|لوح تزلج|monopatín/patineta|skate/skateboard|skate|скейтборд/скейт|Skateboard
ladder|סולם|سلم|escalera|échelle|escada|лестница|Leiter
hammer|פטיש|مطرقة|martillo|marteau|martelo|молоток|Hammer
candle|נר|شمعة|vela|bougie|vela|свеча|Kerze
gift/present|מתנה|هدية|regalo|cadeau|presente|подарок|Geschenk
flag|דגל|علم|bandera|drapeau|bandeira|флаг|Fahne/Flagge
bell|פעמון|جرس|campana|cloche|sino|колокол/колокольчик|Glocke
anchor|עוגן|مرساة|ancla|ancre|âncora|якорь|Anker
cactus|קקטוס|صبار|cactus|cactus|cacto|кактус|Kaktus
leaf|עלה|ورقة/ورقة شجر|hoja|feuille|folha|лист|Blatt
palm tree/palm|דקל/עץ דקל|نخلة|palmera|palmier|palmeira/coqueiro|пальма|Palme
pumpkin|דלעת|يقطين|calabaza|citrouille|abóbora|тыква|Kürbis
igloo|איגלו|إيغلو|iglú|igloo|iglu|иглу|Iglu
king|מלך|ملك|rey|roi|rei|король|König
queen|מלכה|ملكة|reina|reine|rainha|королева|Königin
baby|תינוק|رضيع/طفل|bebé|bébé|bebê|малыш/младенец|Baby
clown|ליצן|مهرج|payaso|clown|palhaço|клоун|Clown
ant|נמלה|نملة|hormiga|fourmi|formiga|муравей|Ameise
ladybug/ladybird|פרת משה רבנו|دعسوقة|mariquita/catarina|coccinelle|joaninha|божья коровка|Marienkäfer
fox|שועל|ثعلب|zorro|renard|raposa|лиса|Fuchs
wolf|זאב|ذئب|lobo|loup|lobo|волк|Wolf
zebra|זברה|حمار وحشي|cebra|zèbre|zebra|зебра|Zebra
camel|גמל|جمل|camello|chameau|camelo|верблюд|Kamel
kangaroo|קנגורו|كنغر|canguro|kangourou|canguru|кенгуру|Känguru
crocodile|תנין|تمساح|cocodrilo|crocodile|crocodilo/jacaré|крокодил|Krokodil
hedgehog|קיפוד|قنفذ|erizo|hérisson|ouriço|ёж|Igel
squirrel|סנאי|سنجاب|ardilla|écureuil|esquilo|белка|Eichhörnchen
parrot|תוכי|ببغاء|loro|perroquet|papagaio|попугай|Papagei
jellyfish|מדוזה|قنديل البحر|medusa|méduse|água-viva|медуза|Qualle
starfish|כוכב ים|نجم البحر|estrella de mar|étoile de mer|estrela-do-mar|морская звезда|Seestern
worm|תולעת|دودة|gusano|ver/ver de terre|minhoca|червяк|Wurm/Regenwurm
popcorn|פופקורן|فشار/بوشار|palomitas|pop-corn|pipoca|попкорн|Popcorn
lollipop|סוכרייה על מקל|مصاصة|piruleta/chupetín/paleta|sucette|pirulito|леденец|Lutscher/Lolli
donut/doughnut|סופגנייה/דונאט|دونات|dona/dónut/rosquilla|donut/beignet|rosquinha/donut|пончик|Donut/Krapfen
soup|מרק|شوربة/حساء|sopa|soupe|sopa|суп|Suppe
honey|דבש|عسل|miel|miel|mel|мёд|Honig
toothbrush|מברשת שיניים|فرشاة أسنان|cepillo de dientes|brosse à dents|escova de dentes|зубная щётка|Zahnbürste
pillow|כרית|وسادة/مخدة|almohada|oreiller|travesseiro|подушка|Kissen
mirror|מראה|مرآة|espejo|miroir|espelho|зеркало|Spiegel
envelope|מעטפה|ظرف|sobre|enveloppe|envelope|конверт|Briefumschlag/Umschlag
magnet|מגנט|مغناطيس|imán|aimant|ímã|магнит|Magnet
trophy|גביע|كأس|trofeo/copa|trophée/coupe|troféu/taça|кубок|Pokal
medal|מדליה|ميدالية|medalla|médaille|medalha|медаль|Medaille
swing|נדנדה|أرجوحة|columpio|balançoire|balanço|качели|Schaukel
slide|מגלשה|زحليقة/زلاقة|tobogán|toboggan|escorregador|горка|Rutsche
snowflake|פתית שלג|ندفة ثلج|copo de nieve|flocon/flocon de neige|floco de neve|снежинка|Schneeflocke
lightning|ברק|برق|rayo|éclair|raio/relâmpago|молния|Blitz
planet|כוכב לכת|كوكب|planeta|planète|planeta|планета|Planet
alien|חייזר|كائن فضائي|extraterrestre|extraterrestre|alienígena/et|инопланетянин|Außerirdischer/Alien
astronaut|אסטרונאוט|رائد فضاء|astronauta|astronaute|astronauta|космонавт/астронавт|Astronaut
mermaid|בת ים|حورية البحر|sirena|sirène|sereia|русалка|Meerjungfrau
wizard/magician|קוסם|ساحر|mago|magicien|mágico/mago|волшебник|Zauberer
superhero|גיבור על|بطل خارق|superhéroe|super-héros|super-herói|супергерой|Superheld
princess|נסיכה|أميرة|princesa|princesse|princesa|принцесса|Prinzessin
glove|כפפה|قفاز|guante|gant|luva|перчатка|Handschuh
scarf|צעיף|وشاح|bufanda|écharpe|cachecol|шарф|Schal
dress|שמלה|فستان|vestido|robe|vestido|платье|Kleid
fence|גדר|سياج|valla/cerca|clôture/barrière|cerca|забор|Zaun
lighthouse|מגדלור|منارة|faro|phare|farol|маяк|Leuchtturm
windmill|טחנת רוח|طاحونة هواء|molino|moulin|moinho|мельница|Windmühle
motorcycle/motorbike|אופנוע|دراجة نارية|moto|moto|moto|мотоцикл|Motorrad
submarine|צוללת|غواصة|submarino|sous-marin|submarino|подводная лодка|U-Boot
wheel|גלגל|عجلة|rueda|roue|roda|колесо|Rad
bucket|דלי|دلو|cubo/balde|seau|balde|ведро|Eimer
basket|סל|سلة|cesta/canasta|panier|cesta|корзина|Korb
box|קופסה/ארגז|صندوق|caja|boîte|caixa|коробка|Kiste/Schachtel
smile|חיוך|ابتسامة|sonrisa|sourire|sorriso|улыбка|Lächeln
peacock|טווס|طاووس|pavo real|paon|pavão|павлин|Pfau
flamingo|פלמינגו|فلامنغو|flamenco|flamant/flamant rose|flamingo|фламинго|Flamingo
dolphin|דולפין|دلفين|delfín|dauphin|golfinho|дельфин|Delfin
pineapple|אננס|أناناس|piña|ananas|abacaxi|ананас|Ananas
orange|תפוז|برتقالة/برتقال|naranja|orange|laranja|апельсин|Orange/Apfelsine
avocado|אבוקדו|أفوكادو|aguacate/palta|avocat|abacate|авокадо|Avocado
potato|תפוח אדמה|بطاطا/بطاطس|patata/papa|pomme de terre/patate|batata|картошка/картофель|Kartoffel
broccoli|ברוקולי|بروكلي|brócoli|brocoli|brócolis|брокколи|Brokkoli
chocolate|שוקולד|شوكولاتة|chocolate|chocolat|chocolate|шоколад|Schokolade
kettle|קומקום|غلاية/إبريق|tetera/hervidor|bouilloire/théière|chaleira|чайник|Wasserkocher/Teekanne`;
  const WORDS = RAW.trim().split('\n').map(r => r.split('|').map(f => f.split('/').map(s => s.trim())));
  const wordOf = (i, L) => (WORDS[i] ? WORDS[i][Math.max(0, COLS.indexOf(L))][0] : '');
  const IDX = en => WORDS.findIndex(r => r[0][0] === en);

  // השוואה סלחנית: בלי ניקוד וסימנים, אותיות סופיות = רגילות, ё = е, ß = ss
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/[ךםןףץ]/g, c => 'כמנפצ'['ךםןףץ'.indexOf(c)])
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/ё/g, 'е').replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }
  const FORMS = WORDS.map(r => [...new Set([].concat(...r).map(norm).filter(Boolean))]);
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = [];
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // 2 = נכון, 1 = ממש קרוב, 0 = לא. מילה ארוכה עם טעות כתיב אחת נחשבת נכונה (ילדים כותבים לפי השמיעה)
  function judge(text, i) {
    const F = FORMS[i] || [], all = norm(text);
    if (!all) return 0;
    const toks = String(text).split(/\s+/).map(norm).filter(Boolean);
    if (F.includes(all) || toks.some(t => F.includes(t))) return 2;
    if (F.some(f => f.length >= 4 && all.length <= f.length + 6 && all.includes(f))) return 2;
    let close = 0;
    for (const f of F) {
      const d = lev(all, f);
      if (f.length >= 6 && d <= 1) return 2;
      if (f.length >= 4 && d <= (f.length >= 8 ? 2 : 1)) close = 1;
    }
    return close;
  }
  const hasWord = (text, i) => { const n = norm(text); return (FORMS[i] || []).some(f => f.length >= 3 && n.includes(f)); };
  const isL = c => /[\p{L}\p{N}]/u.test(c);
  const nLetters = w => [...w].filter(isL).length;
  const maxHints = w => { const n = nLetters(w); return n >= 7 ? 2 : n >= 4 ? 1 : 0; };
  function hintOrder(w) {
    const idx = [];
    [...w].forEach((c, i) => { if (isL(c)) idx.push(i); });
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx;
  }
  function maskOf(w, ord, k) { const show = new Set(ord.slice(0, k)); return [...w].map((c, i) => (isL(c) ? (show.has(i) ? c : '_') : c)).join(' '); }
  function pick3(used) {
    if (used.size > WORDS.length - 12) used.clear();
    const out = [];
    while (out.length < 3) { const i = Math.floor(Math.random() * WORDS.length); if (!used.has(i) && !out.includes(i)) out.push(i); }
    return out;
  }

  // ----- דף הציור: קנבס נסתר ברזולוציה כפולה. קו נצבע פעם אחת כשנקודות מגיעות, ובביטול מציירים הכול מחדש -----
  function newBoard() {
    const cv = document.createElement('canvas');
    cv.width = BW * 2; cv.height = BH * 2;
    const b = { cv, c: cv.getContext('2d'), list: [] };
    boardReset(b);
    return b;
  }
  function paper(b) { const c = b.c; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, b.cv.width, b.cv.height); c.setTransform(2, 0, 0, 2, 0, 0); }
  function boardReset(b) { b.list.length = 0; paper(b); }
  const colOf = i => (i < 0 ? '#ffffff' : COLORS[i] || COLORS[0]);
  // קטעים חלקים (עקומות בין אמצעי הנקודות). s.d = כמה קטעים כבר צוירו
  function segs(c, s) {
    const p = s.p, n = p.length >> 1;
    if (s.d == null) s.d = 0;
    if (s.d + 1 > n - 2) return;
    c.strokeStyle = colOf(s.c); c.lineWidth = s.z; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (let i = s.d + 1; i <= n - 2; i++) {
      const x0 = i === 1 ? p[0] : (p[2 * i - 2] + p[2 * i]) / 2, y0 = i === 1 ? p[1] : (p[2 * i - 1] + p[2 * i + 1]) / 2;
      c.moveTo(x0, y0);
      c.quadraticCurveTo(p[2 * i], p[2 * i + 1], (p[2 * i] + p[2 * i + 2]) / 2, (p[2 * i + 1] + p[2 * i + 3]) / 2);
    }
    c.stroke();
    s.d = n - 2;
  }
  // הקטע האחרון (מהאמצע האחרון עד הנקודה האחרונה), או נקודה בודדת
  function tail(c, s) {
    const p = s.p, n = p.length >> 1;
    if (!n) return;
    if (n === 1) { c.fillStyle = colOf(s.c); c.beginPath(); c.arc(p[0], p[1], s.z / 2, 0, Math.PI * 2); c.fill(); return; }
    const i = n - 1, x0 = n >= 3 ? (p[2 * i - 2] + p[2 * i]) / 2 : p[0], y0 = n >= 3 ? (p[2 * i - 1] + p[2 * i + 1]) / 2 : p[1];
    c.strokeStyle = colOf(s.c); c.lineWidth = s.z; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(p[2 * i], p[2 * i + 1]); c.stroke();
  }
  const findS = (b, id) => { for (let i = b.list.length - 1; i >= 0; i--) if (b.list[i].id === id) return b.list[i]; return null; };
  function bStart(b, id, c, z, pts) { const s = { id, c, z, p: pts.slice(), d: 0, open: true }; b.list.push(s); segs(b.c, s); return s; }
  function bPts(b, id, pts) { const s = findS(b, id); if (!s) return; for (let i = 0; i < pts.length; i++) s.p.push(pts[i]); segs(b.c, s); }
  function bEnd(b, id) { const s = findS(b, id); if (!s || !s.open) return; s.open = false; segs(b.c, s); tail(b.c, s); }
  function bRedraw(b) { paper(b); for (const s of b.list) { if (s.x) { paper(b); continue; } s.d = 0; segs(b.c, s); if (!s.open) tail(b.c, s); } }
  function bUndo(b) { if (b.list.pop()) bRedraw(b); }
  function bClear(b) { b.list.push({ x: 1 }); paper(b); }
  function bLoad(b, arr) {
    b.list.length = 0;
    for (const e of arr || []) {
      if (e && e.x) b.list.push({ x: 1 });
      else if (e && Array.isArray(e.p) && e.p.length >= 2) b.list.push({ id: e.id, c: e.c, z: e.z, p: e.p.slice(), d: 0, open: false });
    }
    bRedraw(b);
  }
  // נקודות שהגיעו מהרשת: רק מספרים בתוך הדף, זוגות, ולא יותר מדי
  function cleanPts(a, max) {
    const out = [];
    if (!Array.isArray(a)) return out;
    for (let i = 0; i + 1 < a.length && out.length < max * 2; i += 2) out.push(Math.round(clamp(+a[i] || 0, 0, BW) * 10) / 10, Math.round(clamp(+a[i + 1] || 0, 0, BH) * 10) / 10);
    return out;
  }

  // ----- הציור לדוגמה (בתפריט ובתמונת הכרטיס): בית, שמש, עץ וענן, בקווים קצת רועדים כמו של ילד -----
  const ART = (() => {
    const r = GK.U.seeded(11), A = [];
    // קווים ישרים מחולקים לנקודות צפופות, אחרת ההחלקה הייתה מעגלת פינות של מלבן לכיפה
    const add = (c, z, pts) => {
      const p = [], j = () => (r() - 0.5) * 2.2;
      for (let i = 0; i < pts.length; i += 2) {
        if (i >= 2) {
          const x0 = pts[i - 2], y0 = pts[i - 1], n = Math.floor(Math.hypot(pts[i] - x0, pts[i + 1] - y0) / 9);
          for (let k = 1; k < n; k++) p.push(x0 + (pts[i] - x0) * k / n + j(), y0 + (pts[i + 1] - y0) * k / n + j());
        }
        p.push(pts[i] + j(), pts[i + 1] + j());
      }
      A.push({ c, z, p });
    };
    const arc = (cx, cy, rx, ry, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } return p; };
    const ground = []; for (let x = 16; x <= 544; x += 16) ground.push(x, 374 + Math.sin(x / 34) * 5);
    add(6, 8, ground);
    add(5, 9, arc(468, 84, 38, 38, 0, Math.PI * 2.06, 32));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; add(4, 7, [468 + Math.cos(a) * 52, 84 + Math.sin(a) * 52, 468 + Math.cos(a) * 72, 84 + Math.sin(a) * 72]); }
    add(8, 7, arc(122, 104, 30, 30, Math.PI, Math.PI * 2, 12));
    add(8, 7, arc(170, 100, 30, 34, Math.PI * 1.05, Math.PI * 2, 12));
    add(8, 7, [92, 104, 202, 104]);
    add(0, 4, [318, 118, 330, 106, 341, 117, 352, 106, 364, 118]);
    add(0, 6, [268, 212, 268, 180, 288, 180, 288, 226]);
    add(0, 6, [150, 372, 150, 246, 302, 246, 302, 372]);
    add(3, 9, [132, 254, 226, 168, 320, 254, 132, 254]);
    add(12, 6, [205, 372, 205, 306, 246, 306, 246, 372]);
    add(12, 7, [238, 342]);
    add(9, 5, [258, 270, 290, 270, 290, 302, 258, 302, 258, 270]);
    add(9, 4, [274, 270, 274, 302]); add(9, 4, [258, 286, 290, 286]);
    add(12, 8, [402, 374, 406, 304]); add(12, 8, [430, 374, 426, 304]);
    add(7, 9, arc(416, 262, 54, 48, Math.PI * 0.62, Math.PI * 2.66, 30));
    add(3, 13, [398, 252]); add(3, 13, [433, 276]); add(3, 13, [420, 236]);
    add(7, 4, [500, 374, 501, 346]); add(11, 14, [501, 340]); add(5, 6, [501, 340]);
    add(7, 4, [96, 374, 95, 350]); add(10, 13, [95, 345]);
    return A;
  })();
  const ART_PTS = ART.reduce((n, s) => n + (s.p.length >> 1), 0);
  function artDraw(ctx, frac) {
    let budget = frac >= 1 ? 1e9 : Math.floor(ART_PTS * frac), last = null;
    for (const s of ART) {
      if (budget <= 0) break;
      const n = s.p.length >> 1, m = Math.min(n, budget);
      budget -= n;
      const sub = { c: s.c, z: s.z, p: m === n ? s.p : s.p.slice(0, m * 2), d: 0 };
      segs(ctx, sub); tail(ctx, sub);
      last = sub;
    }
    return last ? [last.p[last.p.length - 2], last.p[last.p.length - 1]] : null;
  }

  // ----- פרצופים, רקע, אייקונים: הכול מקוד -----
  function avatar(u, ctx, x, y, r, a, o) {
    o = o || {};
    const col = AV[a % AV.length], t = o.t || 0, kind = a % 6, dark = u.shade(col, -0.35);
    ctx.save();
    ctx.translate(x, y + (o.bob ? Math.sin(t * 6 + a) * r * 0.1 : 0));
    ctx.fillStyle = u.shade(col, -0.18);
    if (kind === 0) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * r * 0.86, -r * 0.3); ctx.lineTo(sx * r * 0.66, -r * 1.12); ctx.lineTo(sx * r * 0.16, -r * 0.82); ctx.closePath(); ctx.fill(); }
    if (kind === 3) {
      ctx.strokeStyle = dark; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.22, -r * 1.36); ctx.stroke();
      u.circle(ctx, r * 0.22, -r * 1.4, r * 0.18); ctx.fillStyle = SUN; ctx.fill();
    }
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, u.shade(col, 0.4)); gr.addColorStop(1, col);
    u.circle(ctx, 0, 0, r); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = dark; ctx.stroke();
    const blink = ((t * 0.7 + a * 0.37) % 4) < 0.09;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const ex = sx * r * 0.34, ey = -r * 0.1;
      if (o.happy || blink) {
        ctx.strokeStyle = INK; ctx.lineWidth = r * 0.1; ctx.beginPath();
        if (o.happy) ctx.arc(ex, ey + r * 0.06, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); else { ctx.moveTo(ex - r * 0.13, ey); ctx.lineTo(ex + r * 0.13, ey); }
        ctx.stroke();
      } else {
        u.circle(ctx, ex, ey, r * 0.17); ctx.fillStyle = '#fff'; ctx.fill();
        u.circle(ctx, ex + r * 0.04, ey + r * 0.03, r * 0.09); ctx.fillStyle = INK; ctx.fill();
      }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.arc(0, r * 0.2, r * (o.happy ? 0.32 : 0.2), Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,150,.35)';
    for (const sx of [-1, 1]) { u.circle(ctx, sx * r * 0.6, r * 0.2, r * 0.13); ctx.fill(); }
    if (kind === 1) { ctx.strokeStyle = dark; ctx.lineWidth = r * 0.13; ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.94); ctx.quadraticCurveTo(r * 0.1, -r * 1.55, r * 0.34, -r * 1.06); ctx.stroke(); }
    if (kind === 2) {
      ctx.fillStyle = '#ff4d8d'; const bx = r * 0.56, by = -r * 0.74;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * r * 0.36, by - r * 0.22); ctx.lineTo(bx + sx * r * 0.36, by + r * 0.22); ctx.closePath(); ctx.fill(); }
      u.circle(ctx, bx, by, r * 0.1); ctx.fill();
    }
    if (kind === 4) {
      ctx.strokeStyle = INK; ctx.lineWidth = r * 0.07;
      for (const sx of [-1, 1]) { u.circle(ctx, sx * r * 0.34, -r * 0.1, r * 0.25); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-r * 0.09, -r * 0.12); ctx.lineTo(r * 0.09, -r * 0.12); ctx.stroke();
    }
    if (kind === 5) {
      ctx.fillStyle = SUN; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = r * 0.05; ctx.beginPath();
      ctx.moveTo(-r * 0.46, -r * 0.8); ctx.lineTo(-r * 0.48, -r * 1.26); ctx.lineTo(-r * 0.23, -r * 1.02); ctx.lineTo(0, -r * 1.34);
      ctx.lineTo(r * 0.23, -r * 1.02); ctx.lineTo(r * 0.48, -r * 1.26); ctx.lineTo(r * 0.46, -r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  const DOODLES = (() => { const r = GK.U.seeded(77), a = []; for (let i = 0; i < 34; i++) a.push({ x: r(), y: r(), k: Math.floor(r() * 5), s: 0.6 + r() * 0.9, rot: r() * 6.28, ph: r() * 6.28 }); return a; })();
  function drawBg(ctx, w, h, t) {
    const gr = ctx.createLinearGradient(0, 0, w * 0.3, h);
    gr.addColorStop(0, '#5a3bc4'); gr.addColorStop(1, '#25155e');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const k = w / W;
    for (const d of DOODLES) {
      const s = 15 * d.s * k;
      ctx.save();
      ctx.translate(d.x * w, d.y * h + Math.sin(t * 0.8 + d.ph) * 4 * k);
      ctx.rotate(d.rot + Math.sin(t * 0.5 + d.ph) * 0.12);
      ctx.beginPath();
      if (d.k === 0) for (let i = 0; i <= 10; i++) { const rr = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      else if (d.k === 1) for (let a = 0; a < Math.PI * 4; a += 0.3) ctx.lineTo(Math.cos(a) * s * a / 12.6, Math.sin(a) * s * a / 12.6);
      else if (d.k === 2) ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      else if (d.k === 3) { ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s / 2, -s * 0.7, 0, 0); ctx.quadraticCurveTo(s / 2, s * 0.7, s, 0); }
      else { ctx.moveTo(-s * 0.6, 0); ctx.lineTo(s * 0.6, 0); ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, s * 0.6); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function card(u, ctx, x, y, w, h, r, fill, sh) {
    ctx.save();
    if (sh !== false) { ctx.shadowColor = 'rgba(16,6,50,.38)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; }
    u.rr(ctx, x, y, w, h, r); ctx.fillStyle = fill || '#fff'; ctx.fill();
    ctx.restore();
  }
  function pencil(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot == null ? -0.75 : rot); ctx.scale(s, s);
    ctx.fillStyle = '#ffcf3a'; ctx.fillRect(-6, -34, 12, 30);
    ctx.fillStyle = '#ff8fb0'; ctx.fillRect(-6, -42, 12, 8);
    ctx.fillStyle = '#c9ced8'; ctx.fillRect(-6, -35, 12, 3);
    ctx.fillStyle = '#f3d2a2'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-2, 4.5); ctx.lineTo(2, 4.5); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // ----- טקסטים ב-8 שפות -----
  const TEXT = {
    he: {
      title: 'ציירו ונחשו',
      help: ['בכל תור שחקן אחד מצייר מילה וכל השאר מנחשים', 'אונליין: צור חדר ושלח לחברים את הקוד בן 4 האותיות', "הקלד ניחושים בצ'אט — ככל שתנחש מהר יותר, תקבל יותר נקודות", 'בחדר אחד: המצייר מחזיק את המכשיר והשאר צועקים ניחושים'],
      mOnline: '🌐 אונליין עם חברים', mLocal: '🏠 חברים בחדר אחד',
      online: 'משחק אונליין', yourName: 'השם שלך', create: '✚ צור חדר', orJoin: 'או הצטרף לחדר של חבר:', codePh: 'קוד', join: 'הצטרף',
      connecting: 'מתחבר…', cancel: 'ביטול', roomCode: 'קוד החדר', shareCode: 'שלח את הקוד לחברים (2–6 שחקנים)', copy: 'העתק', copied: 'הועתק!',
      players: 'שחקנים ({n}/6)', rounds: 'סבבים', startGame: '▶ התחל את המשחק', needMore: 'מחכים לעוד שחקן אחד לפחות…',
      waitHost: 'מחכים ש־{name} יתחיל את המשחק…', leave: 'צא מהחדר', myWins: 'ניצחונות אונליין שלך: {n}',
      errServer: 'אין חיבור לשרת האונליין. בדוק את האינטרנט ונסה שוב.', errNoRoom: 'אין חדר עם הקוד הזה. בדוק אותו ונסה שוב.',
      errFull: 'החדר הזה מלא.', errHostLeft: 'המארח סגר את החדר.', errCode: 'הקלד את הקוד בן 4 האותיות.', errLost: 'החיבור נותק.',
      notEnough: 'לא נשארו מספיק שחקנים — חוזרים לחדר.',
      chooseWord: 'בחר מילה לצייר', choosing: '{name} בוחר מילה…', drawing: '{name} מצייר', drawThis: 'צייר:', guessIt: 'נחש את המילה!',
      typeGuess: 'הקלד ניחוש…', guesses: 'ניחושים', letters: '{n} אותיות', wordWas: 'המילה הייתה', timeUp: 'נגמר הזמן!',
      allGuessed: 'כולם ניחשו!', drawerLeft: 'המצייר יצא מהמשחק', skipped: 'המילה דולגה', guessedMsg: '{name} ניחש את המילה!',
      closeMsg: '"{x}" — ממש קרוב!', noSpoil: 'ששש! אל תגלה את המילה 😉', joined: '{name} הצטרף לחדר', leftMsg: '{name} יצא', you: 'אתה',
      round: 'סבב', room: 'חדר', podium: 'התוצאות', backIn: 'חוזרים לחדר בעוד {n}…', nobodyGuessed: 'אף אחד לא ניחש', youGuessed: 'ניחשת!',
      localTitle: 'חברים בחדר אחד', localIntro: 'שחקן אחד מצייר, וכל השאר צועקים ניחושים בקול!', playerN: 'שחקן {n}', addPlayer: '+ הוסף שחקן',
      startLocal: '▶ התחל', passTo: 'העבר את המכשיר ל־{name}', onlyDrawer: 'עכשיו רק המצייר מסתכל על המסך!', imReady: 'אני מוכן ✔',
      gotIt: 'ניחשו! ✔', whoGuessed: 'מי ניחש?', peek: 'החזק כדי להציץ', skip: 'דלג ⏭', shout: 'כל השאר: צעקו ניחושים!',
      defName: 'צייר {n}', pts: '{n} נק׳', tapNext: 'הקש כדי להמשיך', demoNames: 'נועה|איתי|מאיה',
    },
    en: {
      title: 'Draw & Guess',
      help: ['Each turn one player draws a word and everyone else guesses', 'Online: create a room and send your friends the 4-letter code', 'Type guesses in the chat — the faster you guess, the more points', 'One room: the drawer holds the device and the others shout guesses'],
      mOnline: '🌐 Online with friends', mLocal: '🏠 Friends in one room',
      online: 'Play online', yourName: 'Your name', create: '✚ Create a room', orJoin: "Or join a friend's room:", codePh: 'CODE', join: 'Join',
      connecting: 'Connecting…', cancel: 'Cancel', roomCode: 'Room code', shareCode: 'Send this code to your friends (2–6 players)', copy: 'Copy', copied: 'Copied!',
      players: 'Players ({n}/6)', rounds: 'Rounds', startGame: '▶ Start the game', needMore: 'Waiting for at least one more player…',
      waitHost: 'Waiting for {name} to start the game…', leave: 'Leave the room', myWins: 'Your online wins: {n}',
      errServer: "Can't reach the online server. Check the internet and try again.", errNoRoom: 'No room with this code. Check it and try again.',
      errFull: 'This room is full.', errHostLeft: 'The host closed the room.', errCode: 'Type the 4-letter code.', errLost: 'The connection was lost.',
      notEnough: 'Not enough players left — back to the room.',
      chooseWord: 'Choose a word to draw', choosing: '{name} is choosing a word…', drawing: '{name} is drawing', drawThis: 'Draw:', guessIt: 'Guess the word!',
      typeGuess: 'Type your guess…', guesses: 'Guesses', letters: '{n} letters', wordWas: 'The word was', timeUp: "Time's up!",
      allGuessed: 'Everyone guessed it!', drawerLeft: 'The drawer left the game', skipped: 'The word was skipped', guessedMsg: '{name} guessed the word!',
      closeMsg: '"{x}" is very close!', noSpoil: "Shh! Don't give away the word 😉", joined: '{name} joined the room', leftMsg: '{name} left', you: 'you',
      round: 'Round', room: 'Room', podium: 'Final results', backIn: 'Back to the room in {n}…', nobodyGuessed: 'Nobody guessed it', youGuessed: 'You got it!',
      localTitle: 'Friends in one room', localIntro: 'One player draws, everyone else shouts their guesses out loud!', playerN: 'Player {n}', addPlayer: '+ Add a player',
      startLocal: '▶ Start', passTo: 'Pass the device to {name}', onlyDrawer: 'Only the drawer may look at the screen now!', imReady: "I'm ready ✔",
      gotIt: 'Guessed it! ✔', whoGuessed: 'Who guessed it?', peek: 'Hold to peek', skip: 'Skip ⏭', shout: 'Everyone else: shout your guesses!',
      defName: 'Artist {n}', pts: '{n} pts', tapNext: 'Tap to continue', demoNames: 'Mia|Leo|Ava',
    },
    ar: {
      title: 'ارسم وخمّن',
      help: ['في كل دور يرسم لاعب كلمة والباقون يخمّنون', 'أونلاين: أنشئ غرفة وأرسل لأصدقائك الرمز المكوّن من 4 أحرف', 'اكتب تخميناتك في الدردشة — كلما خمّنت أسرع حصلت على نقاط أكثر', 'في غرفة واحدة: الرسّام يمسك الجهاز والباقون يصرخون بتخميناتهم'],
      mOnline: '🌐 أونلاين مع الأصدقاء', mLocal: '🏠 أصدقاء في غرفة واحدة',
      online: 'اللعب أونلاين', yourName: 'اسمك', create: '✚ أنشئ غرفة', orJoin: 'أو انضم إلى غرفة صديق:', codePh: 'الرمز', join: 'انضم',
      connecting: 'جارٍ الاتصال…', cancel: 'إلغاء', roomCode: 'رمز الغرفة', shareCode: 'أرسل الرمز لأصدقائك (2–6 لاعبين)', copy: 'نسخ', copied: 'تم النسخ!',
      players: 'اللاعبون ({n}/6)', rounds: 'الجولات', startGame: '▶ ابدأ اللعبة', needMore: 'بانتظار لاعب آخر على الأقل…',
      waitHost: 'بانتظار {name} ليبدأ اللعبة…', leave: 'اخرج من الغرفة', myWins: 'انتصاراتك أونلاين: {n}',
      errServer: 'تعذّر الوصول إلى خادم اللعب. تحقّق من الإنترنت وحاول مجدداً.', errNoRoom: 'لا توجد غرفة بهذا الرمز. تحقّق منه وحاول مجدداً.',
      errFull: 'هذه الغرفة ممتلئة.', errHostLeft: 'المضيف أغلق الغرفة.', errCode: 'اكتب الرمز المكوّن من 4 أحرف.', errLost: 'انقطع الاتصال.',
      notEnough: 'لم يبقَ لاعبون كفاية — نعود إلى الغرفة.',
      chooseWord: 'اختر كلمة لترسمها', choosing: '{name} يختار كلمة…', drawing: '{name} يرسم', drawThis: 'ارسم:', guessIt: 'خمّن الكلمة!',
      typeGuess: 'اكتب تخمينك…', guesses: 'التخمينات', letters: '{n} أحرف', wordWas: 'الكلمة كانت', timeUp: 'انتهى الوقت!',
      allGuessed: 'الجميع خمّنوا!', drawerLeft: 'الرسّام غادر اللعبة', skipped: 'تم تخطّي الكلمة', guessedMsg: '{name} خمّن الكلمة!',
      closeMsg: '"{x}" — قريب جداً!', noSpoil: 'هس! لا تكشف الكلمة 😉', joined: '{name} انضم إلى الغرفة', leftMsg: '{name} غادر', you: 'أنت',
      round: 'الجولة', room: 'الغرفة', podium: 'النتائج', backIn: 'العودة إلى الغرفة خلال {n}…', nobodyGuessed: 'لم يخمّن أحد', youGuessed: 'أصبت!',
      localTitle: 'أصدقاء في غرفة واحدة', localIntro: 'لاعب واحد يرسم، والباقون يصرخون بتخميناتهم!', playerN: 'اللاعب {n}', addPlayer: '+ أضف لاعباً',
      startLocal: '▶ ابدأ', passTo: 'أعطِ الجهاز إلى {name}', onlyDrawer: 'الآن الرسّام وحده ينظر إلى الشاشة!', imReady: 'أنا جاهز ✔',
      gotIt: 'خمّنوها! ✔', whoGuessed: 'من خمّن؟', peek: 'اضغط مطوّلاً لتلقي نظرة', skip: 'تخطَّ ⏭', shout: 'الباقون: اصرخوا بتخميناتكم!',
      defName: 'رسّام {n}', pts: '{n} نقطة', tapNext: 'اضغط للمتابعة', demoNames: 'ليان|آدم|سارة',
    },
    es: {
      title: 'Dibuja y Adivina',
      help: ['En cada turno un jugador dibuja una palabra y los demás adivinan', 'En línea: crea una sala y envía a tus amigos el código de 4 letras', 'Escribe en el chat: cuanto antes adivines, más puntos ganas', 'En una sala: quien dibuja sostiene el dispositivo y los demás gritan'],
      mOnline: '🌐 En línea con amigos', mLocal: '🏠 Amigos en la misma sala',
      online: 'Jugar en línea', yourName: 'Tu nombre', create: '✚ Crear sala', orJoin: 'O únete a la sala de un amigo:', codePh: 'CÓDIGO', join: 'Unirse',
      connecting: 'Conectando…', cancel: 'Cancelar', roomCode: 'Código de la sala', shareCode: 'Envía este código a tus amigos (2–6 jugadores)', copy: 'Copiar', copied: '¡Copiado!',
      players: 'Jugadores ({n}/6)', rounds: 'Rondas', startGame: '▶ Empezar', needMore: 'Esperando al menos a un jugador más…',
      waitHost: 'Esperando a que {name} empiece…', leave: 'Salir de la sala', myWins: 'Tus victorias en línea: {n}',
      errServer: 'No se puede conectar al servidor. Revisa internet e inténtalo otra vez.', errNoRoom: 'No hay ninguna sala con este código. Revísalo e inténtalo otra vez.',
      errFull: 'Esta sala está llena.', errHostLeft: 'El anfitrión cerró la sala.', errCode: 'Escribe el código de 4 letras.', errLost: 'Se perdió la conexión.',
      notEnough: 'No quedan suficientes jugadores: volvemos a la sala.',
      chooseWord: 'Elige una palabra para dibujar', choosing: '{name} está eligiendo una palabra…', drawing: '{name} está dibujando', drawThis: 'Dibuja:', guessIt: '¡Adivina la palabra!',
      typeGuess: 'Escribe tu respuesta…', guesses: 'Respuestas', letters: '{n} letras', wordWas: 'La palabra era', timeUp: '¡Se acabó el tiempo!',
      allGuessed: '¡Todos la adivinaron!', drawerLeft: 'Quien dibujaba se fue', skipped: 'Se saltó la palabra', guessedMsg: '¡{name} adivinó la palabra!',
      closeMsg: '¡"{x}" está muy cerca!', noSpoil: '¡Shh! No digas la palabra 😉', joined: '{name} entró en la sala', leftMsg: '{name} se fue', you: 'tú',
      round: 'Ronda', room: 'Sala', podium: 'Resultados', backIn: 'Volvemos a la sala en {n}…', nobodyGuessed: 'Nadie la adivinó', youGuessed: '¡Acertaste!',
      localTitle: 'Amigos en la misma sala', localIntro: '¡Uno dibuja y los demás gritan sus respuestas!', playerN: 'Jugador {n}', addPlayer: '+ Añadir jugador',
      startLocal: '▶ Empezar', passTo: 'Pasa el dispositivo a {name}', onlyDrawer: '¡Ahora solo quien dibuja mira la pantalla!', imReady: '¡Estoy listo! ✔',
      gotIt: '¡La adivinaron! ✔', whoGuessed: '¿Quién la adivinó?', peek: 'Mantén para ver', skip: 'Saltar ⏭', shout: 'Los demás: ¡griten sus respuestas!',
      defName: 'Artista {n}', pts: '{n} pts', tapNext: 'Toca para seguir', demoNames: 'Lucía|Mateo|Sofía',
    },
    fr: {
      title: 'Dessine et Devine',
      help: ['À chaque tour, un joueur dessine un mot et les autres devinent', 'En ligne : crée une salle et envoie le code de 4 lettres à tes amis', 'Écris tes réponses dans le chat : plus tu devines vite, plus tu gagnes de points', 'Dans une pièce : le dessinateur tient l’appareil et les autres crient'],
      mOnline: '🌐 En ligne avec des amis', mLocal: '🏠 Entre amis dans une pièce',
      online: 'Jouer en ligne', yourName: 'Ton nom', create: '✚ Créer une salle', orJoin: 'Ou rejoins la salle d’un ami :', codePh: 'CODE', join: 'Rejoindre',
      connecting: 'Connexion…', cancel: 'Annuler', roomCode: 'Code de la salle', shareCode: 'Envoie ce code à tes amis (2 à 6 joueurs)', copy: 'Copier', copied: 'Copié !',
      players: 'Joueurs ({n}/6)', rounds: 'Manches', startGame: '▶ Lancer la partie', needMore: 'En attente d’au moins un autre joueur…',
      waitHost: 'En attente que {name} lance la partie…', leave: 'Quitter la salle', myWins: 'Tes victoires en ligne : {n}',
      errServer: 'Impossible de joindre le serveur. Vérifie internet et réessaie.', errNoRoom: 'Aucune salle avec ce code. Vérifie-le et réessaie.',
      errFull: 'Cette salle est pleine.', errHostLeft: 'L’hôte a fermé la salle.', errCode: 'Écris le code de 4 lettres.', errLost: 'La connexion a été perdue.',
      notEnough: 'Plus assez de joueurs : retour à la salle.',
      chooseWord: 'Choisis un mot à dessiner', choosing: '{name} choisit un mot…', drawing: '{name} dessine', drawThis: 'Dessine :', guessIt: 'Devine le mot !',
      typeGuess: 'Écris ta réponse…', guesses: 'Réponses', letters: '{n} lettres', wordWas: 'Le mot était', timeUp: 'Temps écoulé !',
      allGuessed: 'Tout le monde a trouvé !', drawerLeft: 'Le dessinateur est parti', skipped: 'Le mot a été passé', guessedMsg: '{name} a trouvé le mot !',
      closeMsg: '« {x} » : c’est tout près !', noSpoil: 'Chut ! Ne dévoile pas le mot 😉', joined: '{name} a rejoint la salle', leftMsg: '{name} est parti', you: 'toi',
      round: 'Manche', room: 'Salle', podium: 'Résultats', backIn: 'Retour à la salle dans {n}…', nobodyGuessed: 'Personne n’a trouvé', youGuessed: 'Trouvé !',
      localTitle: 'Entre amis dans une pièce', localIntro: 'Un joueur dessine, les autres crient leurs réponses !', playerN: 'Joueur {n}', addPlayer: '+ Ajouter un joueur',
      startLocal: '▶ Commencer', passTo: 'Passe l’appareil à {name}', onlyDrawer: 'Maintenant, seul le dessinateur regarde l’écran !', imReady: 'Je suis prêt ✔',
      gotIt: 'Trouvé ! ✔', whoGuessed: 'Qui a trouvé ?', peek: 'Maintiens pour voir', skip: 'Passer ⏭', shout: 'Les autres : criez vos réponses !',
      defName: 'Artiste {n}', pts: '{n} pts', tapNext: 'Touche pour continuer', demoNames: 'Léa|Hugo|Chloé',
    },
    pt: {
      title: 'Desenhe e Adivinhe',
      help: ['Em cada vez, um jogador desenha uma palavra e os outros adivinham', 'Online: crie uma sala e mande o código de 4 letras para os amigos', 'Digite palpites no chat: quanto mais rápido, mais pontos', 'Na mesma sala: quem desenha segura o aparelho e os outros gritam'],
      mOnline: '🌐 Online com amigos', mLocal: '🏠 Amigos na mesma sala',
      online: 'Jogar online', yourName: 'Seu nome', create: '✚ Criar sala', orJoin: 'Ou entre na sala de um amigo:', codePh: 'CÓDIGO', join: 'Entrar',
      connecting: 'Conectando…', cancel: 'Cancelar', roomCode: 'Código da sala', shareCode: 'Mande este código para os amigos (2–6 jogadores)', copy: 'Copiar', copied: 'Copiado!',
      players: 'Jogadores ({n}/6)', rounds: 'Rodadas', startGame: '▶ Começar o jogo', needMore: 'Esperando pelo menos mais um jogador…',
      waitHost: 'Esperando {name} começar o jogo…', leave: 'Sair da sala', myWins: 'Suas vitórias online: {n}',
      errServer: 'Não foi possível conectar ao servidor. Verifique a internet e tente de novo.', errNoRoom: 'Não existe sala com este código. Confira e tente de novo.',
      errFull: 'Esta sala está cheia.', errHostLeft: 'O anfitrião fechou a sala.', errCode: 'Digite o código de 4 letras.', errLost: 'A conexão caiu.',
      notEnough: 'Não há jogadores suficientes — de volta à sala.',
      chooseWord: 'Escolha uma palavra para desenhar', choosing: '{name} está escolhendo uma palavra…', drawing: '{name} está desenhando', drawThis: 'Desenhe:', guessIt: 'Adivinhe a palavra!',
      typeGuess: 'Digite seu palpite…', guesses: 'Palpites', letters: '{n} letras', wordWas: 'A palavra era', timeUp: 'Acabou o tempo!',
      allGuessed: 'Todos acertaram!', drawerLeft: 'Quem desenhava saiu', skipped: 'A palavra foi pulada', guessedMsg: '{name} acertou a palavra!',
      closeMsg: '"{x}" está quase!', noSpoil: 'Psiu! Não entregue a palavra 😉', joined: '{name} entrou na sala', leftMsg: '{name} saiu', you: 'você',
      round: 'Rodada', room: 'Sala', podium: 'Resultado final', backIn: 'Voltando à sala em {n}…', nobodyGuessed: 'Ninguém acertou', youGuessed: 'Você acertou!',
      localTitle: 'Amigos na mesma sala', localIntro: 'Um jogador desenha e os outros gritam os palpites!', playerN: 'Jogador {n}', addPlayer: '+ Adicionar jogador',
      startLocal: '▶ Começar', passTo: 'Passe o aparelho para {name}', onlyDrawer: 'Agora só quem desenha olha a tela!', imReady: 'Estou pronto ✔',
      gotIt: 'Acertaram! ✔', whoGuessed: 'Quem acertou?', peek: 'Segure para espiar', skip: 'Pular ⏭', shout: 'Os outros: gritem seus palpites!',
      defName: 'Artista {n}', pts: '{n} pts', tapNext: 'Toque para continuar', demoNames: 'Ana|Davi|Bia',
    },
    ru: {
      title: 'Рисуй и угадывай',
      help: ['Каждый ход один игрок рисует слово, а остальные угадывают', 'Онлайн: создай комнату и отправь друзьям код из 4 букв', 'Пиши догадки в чат — чем быстрее угадаешь, тем больше очков', 'В одной комнате: художник держит устройство, остальные выкрикивают догадки'],
      mOnline: '🌐 Онлайн с друзьями', mLocal: '🏠 Друзья в одной комнате',
      online: 'Игра онлайн', yourName: 'Твоё имя', create: '✚ Создать комнату', orJoin: 'Или войди в комнату друга:', codePh: 'КОД', join: 'Войти',
      connecting: 'Подключение…', cancel: 'Отмена', roomCode: 'Код комнаты', shareCode: 'Отправь этот код друзьям (2–6 игроков)', copy: 'Копировать', copied: 'Скопировано!',
      players: 'Игроки ({n}/6)', rounds: 'Раунды', startGame: '▶ Начать игру', needMore: 'Ждём ещё хотя бы одного игрока…',
      waitHost: 'Ждём, пока {name} начнёт игру…', leave: 'Выйти из комнаты', myWins: 'Твои победы онлайн: {n}',
      errServer: 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.', errNoRoom: 'Комнаты с таким кодом нет. Проверь код и попробуй ещё раз.',
      errFull: 'Эта комната заполнена.', errHostLeft: 'Хозяин закрыл комнату.', errCode: 'Введи код из 4 букв.', errLost: 'Связь потеряна.',
      notEnough: 'Осталось мало игроков — возвращаемся в комнату.',
      chooseWord: 'Выбери слово для рисунка', choosing: '{name} выбирает слово…', drawing: '{name} рисует', drawThis: 'Нарисуй:', guessIt: 'Угадай слово!',
      typeGuess: 'Напиши догадку…', guesses: 'Догадки', letters: 'Букв: {n}', wordWas: 'Это было слово', timeUp: 'Время вышло!',
      allGuessed: 'Все угадали!', drawerLeft: 'Художник вышел из игры', skipped: 'Слово пропущено', guessedMsg: '{name} угадал слово!',
      closeMsg: '«{x}» — очень близко!', noSpoil: 'Тсс! Не выдавай слово 😉', joined: '{name} вошёл в комнату', leftMsg: '{name} вышел', you: 'ты',
      round: 'Раунд', room: 'Комната', podium: 'Итоги', backIn: 'Возвращаемся в комнату через {n}…', nobodyGuessed: 'Никто не угадал', youGuessed: 'Угадал!',
      localTitle: 'Друзья в одной комнате', localIntro: 'Один рисует, остальные выкрикивают догадки!', playerN: 'Игрок {n}', addPlayer: '+ Добавить игрока',
      startLocal: '▶ Начать', passTo: 'Передай устройство: {name}', onlyDrawer: 'Сейчас на экран смотрит только художник!', imReady: 'Я готов ✔',
      gotIt: 'Угадали! ✔', whoGuessed: 'Кто угадал?', peek: 'Удерживай, чтобы подсмотреть', skip: 'Пропустить ⏭', shout: 'Остальные: кричите догадки!',
      defName: 'Художник {n}', pts: '{n} оч.', tapNext: 'Нажми, чтобы продолжить', demoNames: 'Маша|Ваня|Аня',
    },
    de: {
      title: 'Zeichnen & Raten',
      help: ['In jeder Runde zeichnet ein Spieler ein Wort und die anderen raten', 'Online: Erstelle einen Raum und schick deinen Freunden den Code aus 4 Buchstaben', 'Tippe Tipps in den Chat – je schneller du rätst, desto mehr Punkte', 'In einem Raum: Wer zeichnet, hält das Gerät, die anderen rufen ihre Tipps'],
      mOnline: '🌐 Online mit Freunden', mLocal: '🏠 Freunde in einem Raum',
      online: 'Online spielen', yourName: 'Dein Name', create: '✚ Raum erstellen', orJoin: 'Oder tritt dem Raum eines Freundes bei:', codePh: 'CODE', join: 'Beitreten',
      connecting: 'Verbinde…', cancel: 'Abbrechen', roomCode: 'Raumcode', shareCode: 'Schick diesen Code an deine Freunde (2–6 Spieler)', copy: 'Kopieren', copied: 'Kopiert!',
      players: 'Spieler ({n}/6)', rounds: 'Runden', startGame: '▶ Spiel starten', needMore: 'Warte auf mindestens einen weiteren Spieler…',
      waitHost: 'Warte, bis {name} das Spiel startet…', leave: 'Raum verlassen', myWins: 'Deine Online-Siege: {n}',
      errServer: 'Keine Verbindung zum Server. Prüf das Internet und versuch es nochmal.', errNoRoom: 'Es gibt keinen Raum mit diesem Code. Prüf ihn und versuch es nochmal.',
      errFull: 'Dieser Raum ist voll.', errHostLeft: 'Der Gastgeber hat den Raum geschlossen.', errCode: 'Tippe den Code aus 4 Buchstaben ein.', errLost: 'Die Verbindung ist abgebrochen.',
      notEnough: 'Nicht mehr genug Spieler – zurück in den Raum.',
      chooseWord: 'Wähle ein Wort zum Zeichnen', choosing: '{name} wählt ein Wort…', drawing: '{name} zeichnet', drawThis: 'Zeichne:', guessIt: 'Rate das Wort!',
      typeGuess: 'Tippe deinen Tipp…', guesses: 'Tipps', letters: '{n} Buchstaben', wordWas: 'Das Wort war', timeUp: 'Die Zeit ist um!',
      allGuessed: 'Alle haben es erraten!', drawerLeft: 'Der Zeichner hat das Spiel verlassen', skipped: 'Das Wort wurde übersprungen', guessedMsg: '{name} hat das Wort erraten!',
      closeMsg: '„{x}“ ist ganz nah dran!', noSpoil: 'Psst! Verrate das Wort nicht 😉', joined: '{name} ist dem Raum beigetreten', leftMsg: '{name} ist gegangen', you: 'du',
      round: 'Runde', room: 'Raum', podium: 'Ergebnis', backIn: 'Zurück in den Raum in {n}…', nobodyGuessed: 'Niemand hat es erraten', youGuessed: 'Erraten!',
      localTitle: 'Freunde in einem Raum', localIntro: 'Einer zeichnet, alle anderen rufen ihre Tipps laut!', playerN: 'Spieler {n}', addPlayer: '+ Spieler hinzufügen',
      startLocal: '▶ Los geht’s', passTo: 'Gib das Gerät an {name}', onlyDrawer: 'Jetzt schaut nur der Zeichner auf den Bildschirm!', imReady: 'Ich bin bereit ✔',
      gotIt: 'Erraten! ✔', whoGuessed: 'Wer hat es erraten?', peek: 'Halten zum Spicken', skip: 'Überspringen ⏭', shout: 'Alle anderen: Ruft eure Tipps!',
      defName: 'Künstler {n}', pts: '{n} P.', tapNext: 'Tippen zum Weiter', demoNames: 'Mia|Ben|Emma',
    },
  };

  // ----- מצב -----
  const IN_GAME = { choose: 1, draw: 1, reveal: 1, podium: 1 };
  const freshV = ph => ({ phase: ph || 'home', players: [], me: '', drawer: null, choices: null, picked: false, word: -1, mask: '', n: 0, endAt: 0, r: 0, rs: 0, why: '', gains: null, okWord: -1, err: '', hostName: '' });
  const N0 = () => ({ role: null, peer: null, conn: null, conns: new Map(), code: '', myId: '', iv: 0, to: 0, open: false, welcomed: false, dead: false });
  const cleanName = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const cleanText = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const clampR = n => clamp(Math.round(+n) || 2, 1, 3);
  function myName(g) {
    let n = cleanName(g.load('name', ''));
    if (!n) { n = g.t('defName', { n: Math.floor(10 + Math.random() * 90) }); g.save('name', n); }
    return n;
  }
  // קוד חדר: אותיות לטיניות בלבד. מי שמקליד בפריסה עברית/רוסית/ערבית מקבל את האות שעל אותו מקש
  const LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', HEK = "שנבגקכעיןחלךצמםפ/רדאוה'סטז", RUK = 'фисвуапршолдьтщзйкыегмцчня', ARK = 'ش|ؤيثبلاهتنمةىخحضقسفعرصءغئ';
  function toCode(v) {
    let o = '';
    for (const ch of String(v || '')) {
      let c = ch.toUpperCase(), k = HEK.indexOf(ch);
      if (k < 0) k = RUK.indexOf(ch.toLowerCase());
      if (k < 0) k = ARK.indexOf(ch);
      if (k >= 0) c = LAT[k];
      if (/^[A-Z]$/.test(c)) o += c;
    }
    return o.slice(0, 4);
  }

  // ----- רשת: המארח מחזיק את החדר (R) ומחליט הכול; כל שחקן, גם המארח עצמו, מציג רק את מה שקיבל (V) -----
  function netReset(g) {
    const S = g.s;
    if (!S || !S.N) return;
    const N = S.N, peer = N.peer;
    N.dead = true;
    clearInterval(N.iv); clearTimeout(N.to);
    let said = false;
    if (N.role === 'host') for (const c of N.conns.values()) { try { if (c.open) { c.send({ t: 'bye' }); said = true; } } catch (e) {} }
    if (N.role === 'guest' && N.conn && N.conn.open) { try { N.conn.send({ t: 'leave' }); said = true; } catch (e) {} }
    // רגע קטן לפני הסגירה, כדי שהודעת הפרידה תספיק לצאת
    if (peer) setTimeout(() => { try { peer.destroy(); } catch (e) {} }, said ? 200 : 0);
    S.N = N0(); S.R = null;
  }
  function netErr(g, key) {
    const S = g.s;
    netReset(g);
    S.V = freshV('home'); S.V.err = key;
    S.chat.length = 0; S.pen = null; boardReset(S.board);
    g.sfx('error');
  }
  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  function hostCreate(g, tries) {
    const S = g.s;
    if (typeof Peer === 'undefined') return netErr(g, 'errServer');
    netReset(g);
    const N = S.N;
    N.role = 'host'; N.code = genCode();
    S.V = freshV('connecting'); S.chat.length = 0;
    let peer;
    try { peer = new Peer(PREFIX + N.code, { debug: 0 }); } catch (e) { return netErr(g, 'errServer'); }
    N.peer = peer;
    N.to = setTimeout(() => { if (!N.dead && !N.open) netErr(g, 'errServer'); }, 15000);
    peer.on('open', id => {
      if (N.dead) return;
      N.open = true; N.myId = id; clearTimeout(N.to);
      S.R = { code: N.code, ph: 'room', rs: clampR(g.load('rounds', 2)), r: 0, order: [], turn: -1, drawer: null, word: -1, choices: [], endAt: 0, why: '',
        hintK: 0, hintOrd: {}, strokes: [], used: new Set(), guessN: 0,
        players: [{ id, name: myName(g), lang: g.lang, a: 0, score: 0, ok: false, gain: 0, ct: 0, rt: 0 }] };
      sendTo(g, id, { t: 'welcome', you: id, code: N.code, host: S.R.players[0].name });
      hostPlayers(g);
      N.iv = setInterval(() => { if (!N.dead) try { hostTick(g); } catch (e) { console.error(e); } }, 200);
    });
    peer.on('connection', conn => { if (!N.dead) hostConn(g, N, conn); });
    peer.on('error', e => {
      if (N.dead) return;
      if (e && e.type === 'unavailable-id' && (tries || 0) < 6) return hostCreate(g, (tries || 0) + 1);   // הקוד תפוס: קוד אחר
      if (!N.open) netErr(g, 'errServer');
    });
    // אם הקשר לשרת התיווך נפל, החיבורים הקיימים ממשיכים; מתחברים מחדש כדי שעוד חברים יוכלו להצטרף
    peer.on('disconnected', () => { setTimeout(() => { if (!N.dead && peer.disconnected && !peer.destroyed) try { peer.reconnect(); } catch (e) {} }, 2000); });
  }
  function hostConn(g, N, conn) {
    conn.on('data', d => { if (!N.dead) try { hostMsg(g, conn.peer, d, conn); } catch (e) { console.error(e); } });
    conn.on('close', () => { if (!N.dead) hostDrop(g, conn.peer); });
    conn.on('error', () => { if (!N.dead) hostDrop(g, conn.peer); });
  }
  function sendTo(g, id, m) {
    const N = g.s.N;
    if (id === N.myId) { try { view(g, m); } catch (e) { console.error(e); } return; }
    const c = N.conns.get(id);
    if (c && c.open) try { c.send(m); } catch (e) {}
  }
  function bcast(g, m, except) { const R = g.s.R; if (R) for (const p of R.players.slice()) if (p.id !== except) sendTo(g, p.id, m); }
  function hostPlayers(g) {
    const R = g.s.R;
    if (R) bcast(g, { t: 'pl', p: R.players.map(q => ({ id: q.id, n: q.name, a: q.a, s: q.score, ok: q.ok ? 1 : 0 })), d: R.drawer || '', r: R.r, rs: R.rs });
  }
  function hostMsg(g, from, d, conn) {
    const S = g.s, R = S.R, N = S.N;
    if (!R || !d || typeof d !== 'object') return;
    const p = R.players.find(q => q.id === from);
    if (p) p.seen = now();
    if (d.t === 'hello') {
      if (p || !conn) return;
      if (R.players.length >= MAXP) { try { conn.send({ t: 'full' }); } catch (e) {} setTimeout(() => { try { conn.close(); } catch (e) {} }, 800); return; }
      const used = new Set(R.players.map(q => q.a));
      let a = 0; while (used.has(a)) a++;
      const np = { id: from, name: cleanName(d.n) || g.t('playerN', { n: R.players.length + 1 }), lang: COLS.includes(d.l) ? d.l : 'en', a, score: 0, ok: false, gain: 0, ct: 0, rt: 0, seen: now() };
      R.players.push(np); N.conns.set(from, conn);
      sendTo(g, from, { t: 'welcome', you: from, code: R.code, host: R.players[0].name });
      if (IN_GAME[R.ph]) { if (R.ph !== 'podium') R.order.push(from); sendTo(g, from, snapshot(R, np)); }
      bcast(g, { t: 'c', k: 'join', n: np.name, a: np.a });
      hostPlayers(g);
      return;
    }
    if (!p) return;
    const t = now();
    switch (d.t) {
      case 'lang':
        if (COLS.includes(d.l)) { p.lang = d.l; if (R.ph === 'draw' && !p.ok && from !== R.drawer) sendTo(g, from, { t: 'm', m: maskFor(R, p.lang), n: nLetters(wordOf(R.word, p.lang)) }); }
        break;
      case 'pick': if (R.ph === 'choose' && from === R.drawer) hostPick(g, d.i | 0); break;
      case 's': case 'p': case 'e': case 'u': case 'x': if (R.ph === 'draw' && from === R.drawer) hostStroke(g, from, d); break;
      case 'c': if (t - p.ct > 300) { p.ct = t; hostChat(g, p, cleanText(d.x)); } break;
      case 'rx': if (t - p.rt > 600) { p.rt = t; bcast(g, { t: 'rx', e: clamp(d.e | 0, 0, REACT.length - 1), a: p.a }); } break;
      case 'start': if (from === R.players[0].id && R.ph === 'room' && R.players.length >= 2) hostStart(g, d.rs); break;
      case 'rounds': if (from === R.players[0].id && R.ph === 'room') { R.rs = clampR(d.rs); g.save('rounds', R.rs); hostPlayers(g); } break;
      case 'leave': if (from !== R.players[0].id) hostDrop(g, from); break;
    }
  }
  function snapshot(R, p) {
    const m = { t: 'snap', ph: R.ph, d: R.drawer || '', left: Math.max(0, R.endAt - now()), r: R.r, rs: R.rs, strokes: R.strokes };
    if (R.ph === 'draw') { m.m = maskFor(R, p.lang); m.n = nLetters(wordOf(R.word, p.lang)); }
    if (R.ph === 'reveal') { m.w = R.word; m.why = R.why; m.gains = []; }
    return m;
  }
  function maskFor(R, L) {
    const w = wordOf(R.word, L);
    if (!R.hintOrd[L]) R.hintOrd[L] = hintOrder(w);
    return maskOf(w, R.hintOrd[L], Math.min(R.hintK, maxHints(w)));
  }
  function hostStart(g, rs) {
    const R = g.s.R;
    R.rs = clampR(rs); R.r = 1; R.used.clear();
    for (const q of R.players) { q.score = 0; q.ok = false; q.gain = 0; }
    R.order = R.players.map(q => q.id); R.turn = -1;
    hostNext(g);
  }
  function hostNext(g) {
    const R = g.s.R;
    R.strokes = []; R.guessN = 0;
    for (const q of R.players) { q.ok = false; q.gain = 0; }
    let id = null;
    while (!id) {
      if (++R.turn >= R.order.length) {
        if (++R.r > R.rs) { R.r = R.rs; return hostPodium(g); }
        R.order = R.players.map(q => q.id); R.turn = 0;
      }
      if (R.players.some(q => q.id === R.order[R.turn])) id = R.order[R.turn];
    }
    R.drawer = id; R.ph = 'choose'; R.word = -1; R.choices = pick3(R.used); R.endAt = now() + CHOOSE_MS;
    for (const q of R.players.slice()) {
      const m = { t: 'ph', ph: 'choose', d: id, left: CHOOSE_MS, r: R.r, rs: R.rs };
      if (q.id === id) m.ch = R.choices;
      sendTo(g, q.id, m);
    }
    hostPlayers(g);
  }
  function hostPick(g, i) {
    const R = g.s.R;
    if (!(i >= 0 && i < 3)) i = 0;
    R.word = R.choices[i]; R.used.add(R.word);
    R.ph = 'draw'; R.endAt = now() + DRAW_MS; R.hintK = 0; R.hintOrd = {}; R.guessN = 0; R.strokes = [];
    for (const q of R.players.slice()) {
      const m = { t: 'ph', ph: 'draw', d: R.drawer, left: DRAW_MS, r: R.r, rs: R.rs };
      if (q.id === R.drawer) m.w = R.word; else { m.m = maskFor(R, q.lang); m.n = nLetters(wordOf(R.word, q.lang)); }
      sendTo(g, q.id, m);
    }
  }
  function hostTick(g) {
    const R = g.s.R;
    if (!R) return;
    const t = now();
    // דופק כל 2 שניות. אורח שלא נשמע 10 שניות (סגר את הדף, נפל לו האינטרנט) יוצא מהחדר
    if (t - (R.hbT || 0) > 2000) {
      R.hbT = t;
      bcast(g, { t: 'hb' });
      for (const q of R.players.slice(1)) if (t - (q.seen || t) > 10000) { const c = g.s.N.conns.get(q.id); try { if (c) c.close(); } catch (e) {} hostDrop(g, q.id); }
    }
    if (R.ph === 'choose' && t >= R.endAt) hostPick(g, Math.floor(Math.random() * 3));
    else if (R.ph === 'draw') {
      const f = 1 - (R.endAt - t) / DRAW_MS, k = f >= 0.75 ? 2 : f >= 0.5 ? 1 : 0;
      if (k > R.hintK) { R.hintK = k; for (const q of R.players.slice()) if (q.id !== R.drawer && !q.ok) sendTo(g, q.id, { t: 'm', m: maskFor(R, q.lang) }); }
      if (t >= R.endAt) hostReveal(g, 'timeUp');
    } else if (R.ph === 'reveal' && t >= R.endAt) hostNext(g);
    else if (R.ph === 'podium' && t >= R.endAt) hostRoom(g);
  }
  function hostReveal(g, why) {
    const R = g.s.R;
    R.ph = 'reveal'; R.why = why; R.endAt = now() + REVEAL_MS;
    const gains = R.players.filter(q => q.gain > 0).map(q => [q.id, q.gain]);
    bcast(g, { t: 'ph', ph: 'reveal', d: R.drawer || '', left: REVEAL_MS, r: R.r, rs: R.rs, w: R.word, why, gains });
    hostPlayers(g);
  }
  function hostPodium(g) {
    const R = g.s.R;
    R.ph = 'podium'; R.drawer = null; R.endAt = now() + PODIUM_MS;
    hostPlayers(g);
    bcast(g, { t: 'ph', ph: 'podium', d: '', left: PODIUM_MS, r: R.r, rs: R.rs });
  }
  function hostRoom(g) {
    const R = g.s.R;
    R.ph = 'room'; R.drawer = null; R.word = -1; R.r = 0; R.strokes = [];
    for (const q of R.players) { q.ok = false; q.gain = 0; }
    bcast(g, { t: 'ph', ph: 'room', d: '', left: 0, r: 0, rs: R.rs });
    hostPlayers(g);
  }
  function hostChat(g, p, x) {
    const R = g.s.R;
    if (!x) return;
    if (R.ph === 'draw' && R.word >= 0) {
      const isD = p.id === R.drawer, j = judge(x, R.word);
      if (!isD && !p.ok) {
        if (j === 2) return hostCorrect(g, p);
        bcast(g, { t: 'c', k: 'msg', n: p.name, a: p.a, x });
        if (j === 1) sendTo(g, p.id, { t: 'c', k: 'close', x });
        return;
      }
      // המצייר ומי שכבר ניחש לא יכולים לגלות את המילה; מי שניחש מדבר רק עם מי שגם ניחש
      if (j === 2 || hasWord(x, R.word)) return sendTo(g, p.id, { t: 'c', k: 'spoil' });
      if (isD) return bcast(g, { t: 'c', k: 'msg', n: p.name, a: p.a, x });
      for (const q of R.players.slice()) if (q.ok || q.id === R.drawer) sendTo(g, q.id, { t: 'c', k: 'sec', n: p.name, a: p.a, x });
      return;
    }
    bcast(g, { t: 'c', k: 'msg', n: p.name, a: p.a, x });
  }
  function hostCorrect(g, p) {
    const R = g.s.R, left = Math.max(0, R.endAt - now());
    const gain = 50 + Math.round(250 * left / DRAW_MS) + (R.guessN === 0 ? 40 : 0);
    R.guessN++; p.ok = true; p.score += gain; p.gain += gain;
    const d = R.players.find(q => q.id === R.drawer);
    if (d) { const dg = Math.round(gain / 2); d.score += dg; d.gain += dg; }
    bcast(g, { t: 'c', k: 'ok', n: p.name, a: p.a });
    sendTo(g, p.id, { t: 'ok', w: R.word, g: gain });
    hostPlayers(g);
    if (R.players.every(q => q.id === R.drawer || q.ok)) hostReveal(g, 'allGuessed');
  }
  function hostDrop(g, id) {
    const S = g.s, R = S.R;
    if (!R) return;
    S.N.conns.delete(id);
    const i = R.players.findIndex(q => q.id === id);
    if (i < 1) return;
    const p = R.players.splice(i, 1)[0];
    bcast(g, { t: 'c', k: 'left', n: p.name, a: p.a });
    if (IN_GAME[R.ph] && R.ph !== 'podium' && R.players.length < 2) { bcast(g, { t: 'c', k: 'few' }); return hostRoom(g); }
    if ((R.ph === 'choose' || R.ph === 'draw') && R.drawer === id) hostReveal(g, 'drawerLeft');
    else if (R.ph === 'draw' && R.guessN > 0 && R.players.every(q => q.id === R.drawer || q.ok)) hostReveal(g, 'allGuessed');
    else hostPlayers(g);
  }
  function hostStroke(g, from, d) {
    const R = g.s.R;
    if (d.t === 's') {
      const p = cleanPts(d.p, 50);
      if (!p.length || R.strokes.length > 2000) return;
      const id = d.id | 0, c = clamp(d.c | 0, -1, COLORS.length - 1), z = clamp(+d.z || 4, 2, 60);
      R.strokes.push({ id, c, z, p: p.slice() });
      bcast(g, { t: 's', id, c, z, p }, from);
    } else if (d.t === 'p') {
      let st = null;
      for (let i = R.strokes.length - 1; i >= 0 && !st; i--) if (R.strokes[i].id === (d.id | 0)) st = R.strokes[i];
      const p = cleanPts(d.p, 400);
      if (!st || !p.length || st.p.length > 20000) return;
      for (const v of p) st.p.push(v);
      bcast(g, { t: 'p', id: st.id, p }, from);
    } else if (d.t === 'e') bcast(g, { t: 'e', id: d.id | 0 }, from);
    else if (d.t === 'u') { R.strokes.pop(); bcast(g, { t: 'u' }, from); }
    else if (d.t === 'x') { R.strokes.push({ x: 1 }); bcast(g, { t: 'x' }, from); }
  }
  function guestJoin(g, code) {
    const S = g.s;
    code = toCode(code);
    if (code.length !== 4) { S.V.err = 'errCode'; g.sfx('error'); return; }
    if (typeof Peer === 'undefined') return netErr(g, 'errServer');
    netReset(g);
    const N = S.N;
    N.role = 'guest'; N.code = code;
    S.V = freshV('connecting'); S.chat.length = 0;
    let peer;
    try { peer = new Peer({ debug: 0 }); } catch (e) { return netErr(g, 'errServer'); }
    N.peer = peer;
    N.to = setTimeout(() => { if (!N.dead && !N.welcomed) netErr(g, N.open ? 'errNoRoom' : 'errServer'); }, 15000);
    peer.on('open', id => {
      if (N.dead) return;
      N.open = true; N.myId = id;
      const conn = peer.connect(PREFIX + code, { reliable: true });
      N.conn = conn;
      conn.on('open', () => { if (!N.dead) try { conn.send({ t: 'hello', n: myName(g), l: g.lang }); } catch (e) {} });
      conn.on('data', d => {
        if (N.dead) return;
        N.seen = now();
        if (d && d.t === 'welcome' && !N.iv) N.iv = setInterval(() => {   // דופק למארח; אם המארח שותק 10 שניות, החיבור אבד
          if (N.dead) return;
          if (now() - N.seen > 10000) return netErr(g, 'errLost');
          try { conn.send({ t: 'hb' }); } catch (e) {}
        }, 2000);
        try { view(g, d); } catch (e) { console.error(e); }
      });
      conn.on('close', () => { if (!N.dead) netErr(g, N.welcomed ? 'errLost' : 'errNoRoom'); });
      conn.on('error', () => { if (!N.dead && !N.welcomed) netErr(g, 'errNoRoom'); });
    });
    peer.on('error', e => {
      if (N.dead) return;
      if (e && e.type === 'peer-unavailable') netErr(g, 'errNoRoom');
      else if (!N.welcomed) netErr(g, 'errServer');
    });
  }
  // פעולה של השחקן: אצל המארח היא מטופלת מיד, אצל אורח נשלחת למארח
  function act(g, d) {
    const N = g.s.N;
    if (N.role === 'host') { try { hostMsg(g, N.myId, d, null); } catch (e) { console.error(e); } }
    else if (N.conn && N.conn.open) { try { N.conn.send(d); } catch (e) {} }
  }
  function view(g, d) {
    const S = g.s, V = S.V;
    if (!d || typeof d !== 'object') return;
    const mine = V.drawer === V.me;
    switch (d.t) {
      case 'welcome': S.N.welcomed = true; clearTimeout(S.N.to); V.me = String(d.you); V.hostName = cleanName(d.host); V.phase = 'room'; if (S.N.role === 'guest') g.sfx('pop'); break;
      case 'full': return netErr(g, 'errFull');
      case 'bye': return netErr(g, 'errHostLeft');
      case 'pl':
        if (Array.isArray(d.p)) V.players = d.p.slice(0, MAXP).map(p => ({ id: String(p.id), n: cleanName(p.n), a: clamp(p.a | 0, 0, 7), s: p.s | 0, ok: !!p.ok }));
        V.drawer = d.d || null; V.r = d.r | 0; V.rs = d.rs | 0;
        break;
      case 'ph': setPhase(g, d); break;
      case 'snap': setPhase(g, d); bLoad(S.board, d.strokes); break;
      case 'm': if (typeof d.m === 'string') V.mask = d.m; if (d.n) V.n = d.n | 0; break;
      case 'ok': V.okWord = d.w | 0; g.sfx('score'); confetti(g); g.float(BX + BW / 2, 92, '+' + (d.g | 0), { color: '#ffe066', size: 32 }); break;
      case 's': if (!mine) bStart(S.board, d.id | 0, clamp(d.c | 0, -1, COLORS.length - 1), clamp(+d.z || 4, 2, 60), cleanPts(d.p, 50)); break;
      case 'p': if (!mine) bPts(S.board, d.id | 0, cleanPts(d.p, 400)); break;
      case 'e': if (!mine) bEnd(S.board, d.id | 0); break;
      case 'u': if (!mine) bUndo(S.board); break;
      case 'x': if (!mine) bClear(S.board); break;
      case 'c': addChat(g, d); break;
      case 'rx':
        S.rx.push({ e: REACT[clamp(d.e | 0, 0, REACT.length - 1)], x: BX + 50 + Math.random() * (BW - 100), y: BY + BH - 24, t: 0 });
        if (S.rx.length > 24) S.rx.shift();
        g.sfx('pop', { p: 1.5 });
        break;
    }
  }
  function setPhase(g, d) {
    const S = g.s, V = S.V, ph = String(d.ph);
    if (!['room', 'choose', 'draw', 'reveal', 'podium'].includes(ph)) return;
    if (S.pen) { bEnd(S.board, S.pen.id); S.pen = null; }
    V.phase = ph; V.drawer = d.d || null;
    if (d.r != null) V.r = d.r | 0;
    if (d.rs != null) V.rs = d.rs | 0;
    V.endAt = now() + clamp(+d.left || 0, 0, 120000);
    S.lastSec = -1;
    if (ph === 'choose') {
      V.choices = Array.isArray(d.ch) ? d.ch.slice(0, 3).map(x => clamp(x | 0, 0, WORDS.length - 1)) : null;
      V.picked = false; V.word = -1; V.mask = ''; V.okWord = -1; V.gains = null;
      boardReset(S.board); S.tool.erase = false;
      g.sfx('whoosh');
    } else if (ph === 'draw') {
      V.word = d.w != null ? clamp(d.w | 0, 0, WORDS.length - 1) : -1; V.mask = typeof d.m === 'string' ? d.m : ''; V.n = d.n | 0; V.okWord = -1;
      boardReset(S.board);
      g.sfx(V.drawer === V.me ? 'start' : 'pop');
    } else if (ph === 'reveal') {
      V.word = clamp(d.w | 0, 0, WORDS.length - 1); V.why = String(d.why || ''); V.gains = Array.isArray(d.gains) ? d.gains.slice(0, MAXP) : [];
      g.sfx(V.gains.length ? 'power' : 'error');
    } else if (ph === 'podium') {
      const ps = V.players, top = ps.length ? Math.max(...ps.map(p => p.s)) : 0, me = ps.find(p => p.id === V.me);
      if (ps.length >= 2 && me && me.s === top && top > 0 && ps.filter(p => p.s === top).length === 1) g.save('wins', g.load('wins', 0) + 1);
      g.sfx('win');
    } else if (ph === 'room') { V.choices = null; V.word = -1; boardReset(S.board); }
  }
  function addChat(g, d) {
    const S = g.s, k = ['msg', 'sec', 'ok', 'close', 'spoil', 'join', 'left', 'few'].includes(d.k) ? d.k : null;
    if (!k) return;
    S.chat.push({ k, n: cleanName(d.n), a: clamp(d.a | 0, 0, 7), x: cleanText(d.x) });
    if (S.chat.length > 60) S.chat.shift();
    if (k === 'ok') g.sfx('coin');
    else if (k === 'join') g.sfx('pop');
    else if (k === 'close') g.sfx('tick', { p: 1.4 });
    else if (k === 'msg' || k === 'sec') g.sfx('tick', { p: 1.9 });
  }

  // ----- חלונות DOM: לובי אונליין והגדרות "חדר אחד". נבנים רק מתוך step, כלומר רק כשהמשחק רץ -----
  const CSS = `
.dg-in{box-sizing:border-box;width:100%;min-width:0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);border-radius:12px;color:#fff;font:700 17px Heebo,Arial,sans-serif;padding:9px 12px;outline:none;user-select:text;-webkit-user-select:text}
.dg-in:focus{border-color:var(--acc);background:rgba(255,255,255,.16)}
.dg-in.dg-code-in{width:150px;flex:0 0 auto;text-align:center;letter-spacing:6px;direction:ltr;text-transform:uppercase}
.dg-code{font:900 54px Heebo,Arial,sans-serif;letter-spacing:12px;color:var(--acc);direction:ltr;line-height:1.1;margin:2px 0}
.dg-sub{font-size:14px;opacity:.85}
.dg-pl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}
.dg-chip{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding-block:4px;padding-inline:4px 12px;font-weight:800;font-size:15px}
.dg-dot{width:26px;height:26px;border-radius:50%;flex:0 0 auto;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
.dg-err{color:#ff9a9a;font-weight:800}
.dg-row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin:6px 0}
.dg-names{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.dg-nm{display:flex;gap:6px;align-items:center;min-width:0}
.dg-x{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:10px;width:36px;height:38px;font-size:15px;flex:0 0 auto;padding:0}
.dg-spin{width:46px;height:46px;margin:16px auto;border-radius:50%;border:5px solid rgba(255,255,255,.18);border-top-color:var(--acc);animation:dgSpin .8s linear infinite}
@keyframes dgSpin{to{transform:rotate(360deg)}}
.dg-layer{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;z-index:2}
.dg-chat{position:absolute;pointer-events:auto;box-sizing:border-box;border-radius:12px;border:2px solid #cfc6ff;background:#fff;color:#2a2350;font:700 17px Heebo,Arial,sans-serif;padding:0 12px;outline:none;user-select:text;-webkit-user-select:text}
.dg-chat:focus{border-color:#7a4cff;box-shadow:0 0 0 3px rgba(122,76,255,.25)}
`;
  function inputEl(cls, val, max) { const i = document.createElement('input'); i.type = 'text'; i.className = cls; i.value = val || ''; i.maxLength = max; i.autocomplete = 'off'; i.spellcheck = false; return i; }
  function makeLayer(g) {
    const st = document.createElement('style');
    st.textContent = CSS;
    const lay = g.el('div', 'dg-layer');
    lay.style.width = W + 'px'; lay.style.height = H + 'px'; lay.hidden = true;
    const inp = inputEl('dg-chat', '', 80);
    inp.dir = 'auto';
    Object.assign(inp.style, { left: (CX + 8) + 'px', top: (BOT - 50) + 'px', width: (CW - 16) + 'px', height: '42px' });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const x = cleanText(inp.value); inp.value = ''; if (x && g.s && g.s.mode === 'online') act(g, { t: 'c', x }); }
      else if (e.key === 'Escape') { e.preventDefault(); inp.blur(); g.pause(); }
    });
    lay.appendChild(inp);
    g.root.appendChild(st); g.stage.appendChild(lay);
    g.dg = { style: st, layer: lay, input: inp, ui: { kind: null, card: null, sig: '' }, board: null, lsig: '', cur: '' };
    inp.placeholder = g.t('typeGuess');
    // סגירת הדף: נפרדים מהחדר מיד. חזרה ללשונית אחרי השהיה אוטומטית באונליין: ממשיכים לבד (המשחק אצל האחרים לא עצר)
    g.dg.onHide = () => { const S = g.s; if (S && S.N && S.N.role) { netReset(g); S.V = freshV('home'); } };
    g.dg.onBack = () => { const S = g.s; if (!document.hidden && g.state === 'pause' && S && S.autoPaused) { S.autoPaused = false; g.resume(); } };
    window.addEventListener('pagehide', g.dg.onHide);
    window.addEventListener('focus', g.dg.onBack);
    document.addEventListener('visibilitychange', g.dg.onBack);
  }
  function syncPanel(g) {
    const S = g.s, U = g.dg.ui, V = S.V;
    let want = null;
    if (S.mode === 'online' && (V.phase === 'home' || V.phase === 'connecting' || V.phase === 'room')) want = V.phase;
    else if (S.mode === 'local' && S.L.phase === 'setup') want = 'setup';
    if (!want) { if (U.kind) { U.kind = null; U.card = null; g.closePanel(); } return; }
    const sig = want + '|' + g.lang + '|' + (want === 'home' ? V.err : want === 'room' ? [S.N.code, S.N.role, V.rs, V.hostName, V.players.map(p => p.id + ':' + p.n + ':' + p.a).join(',')].join('|') : want === 'setup' ? S.form.names.length + '|' + S.form.rounds : '');
    if (U.card && U.card.isConnected && U.sig === sig) return;
    U.kind = want; U.sig = sig;
    g.panel(c => { U.card = c; (want === 'home' ? buildHome : want === 'room' ? buildRoom : want === 'setup' ? buildSetup : buildConnecting)(g, c); }, 'custom');
  }
  function optRow(g, card, label, cur, fn) {
    card.appendChild(g.el('div', 'g2d-lbl', label));
    const row = g.el('div', 'g2d-row');
    [1, 2, 3].forEach(n => {
      const b = g.el('button', 'g2d-opt' + (n === cur ? ' on' : ''), String(n));
      b.type = 'button';
      b.addEventListener('click', () => { g.sfx('click'); fn(n); });
      row.appendChild(b);
    });
    card.appendChild(row);
  }
  function buildHome(g, card) {
    const S = g.s;
    card.appendChild(g.el('h2', '', g.t('online')));
    card.appendChild(g.el('div', 'g2d-lbl', g.t('yourName')));
    const nm = inputEl('dg-in', myName(g), 14);
    nm.dir = 'auto';
    nm.addEventListener('input', () => { const v = cleanName(nm.value); if (v) g.save('name', v); });
    card.appendChild(nm);
    const r1 = g.el('div', 'g2d-row');
    g.button(r1, g.t('create'), () => hostCreate(g), { primary: true });
    card.appendChild(r1);
    card.appendChild(g.el('div', 'g2d-lbl', g.t('orJoin')));
    const r2 = g.el('div', 'dg-row'), ci = inputEl('dg-in dg-code-in', S.form.code, 4);
    ci.placeholder = g.t('codePh'); ci.setAttribute('autocapitalize', 'characters');
    const set = v => { ci.value = toCode(v); S.form.code = ci.value; };
    ci.addEventListener('keydown', e => {
      const m = /^Key([A-Z])$/.exec(e.code || '');
      if (e.key === 'Enter') { e.preventDefault(); guestJoin(g, ci.value); }
      else if (m && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); if (ci.value.length < 4) set(ci.value + m[1]); }
    });
    ci.addEventListener('input', () => set(ci.value));
    r2.appendChild(ci);
    g.button(r2, g.t('join'), () => guestJoin(g, ci.value), { alt: true });
    card.appendChild(r2);
    if (S.V.err) card.appendChild(g.el('p', 'dg-err', g.t(S.V.err)));
    const w = g.load('wins', 0);
    if (w > 0) card.appendChild(g.el('p', '', '🏆 ' + g.t('myWins', { n: w })));
    const r3 = g.el('div', 'g2d-row');
    g.button(r3, g.t('back'), () => g.menu(), { alt: true });
    card.appendChild(r3);
  }
  function buildConnecting(g, card) {
    card.appendChild(g.el('h2', '', g.t('connecting')));
    card.appendChild(g.el('div', 'dg-spin'));
    const r = g.el('div', 'g2d-row');
    g.button(r, g.t('cancel'), () => { netReset(g); g.s.V = freshV('home'); }, { alt: true });
    card.appendChild(r);
  }
  function buildRoom(g, card) {
    const S = g.s, V = S.V, host = S.N.role === 'host';
    card.appendChild(g.el('div', 'g2d-lbl', g.t('roomCode')));
    card.appendChild(g.el('div', 'dg-code', S.N.code));
    const r0 = g.el('div', 'dg-row');
    r0.appendChild(g.el('span', 'dg-sub', g.t('shareCode')));
    const cp = g.el('button', 'g2d-opt', g.t('copy'));
    cp.type = 'button';
    cp.addEventListener('click', () => { g.sfx('click'); try { navigator.clipboard.writeText(S.N.code).then(() => { cp.textContent = g.t('copied'); }, () => {}); } catch (e) {} });
    r0.appendChild(cp);
    card.appendChild(r0);
    card.appendChild(g.el('div', 'g2d-lbl', g.t('players', { n: V.players.length })));
    const pl = g.el('div', 'dg-pl');
    V.players.forEach((p, i) => {
      const c = g.el('div', 'dg-chip'), dot = g.el('span', 'dg-dot');
      dot.style.background = AV[p.a % AV.length];
      c.appendChild(dot);
      c.appendChild(g.el('span', '', p.n + (i === 0 ? ' 👑' : '') + (p.id === V.me ? ' (' + g.t('you') + ')' : '')));
      pl.appendChild(c);
    });
    card.appendChild(pl);
    if (host) {
      optRow(g, card, g.t('rounds'), V.rs || 2, n => act(g, { t: 'rounds', rs: n }));
      const row = g.el('div', 'g2d-row');
      if (V.players.length >= 2) g.button(row, g.t('startGame'), () => act(g, { t: 'start', rs: V.rs || 2 }), { primary: true });
      else row.appendChild(g.el('p', '', g.t('needMore')));
      card.appendChild(row);
    } else card.appendChild(g.el('p', '', g.t('waitHost', { name: V.hostName || (V.players[0] && V.players[0].n) || '' })));
    const r2 = g.el('div', 'g2d-row');
    g.button(r2, g.t('leave'), () => { netReset(g); S.V = freshV('home'); S.chat.length = 0; boardReset(S.board); }, { alt: true });
    card.appendChild(r2);
  }
  function buildSetup(g, card) {
    const S = g.s, F = S.form;
    card.appendChild(g.el('h2', '', g.t('localTitle')));
    card.appendChild(g.el('p', '', g.t('localIntro')));
    const grid = g.el('div', 'dg-names');
    F.names.forEach((v, i) => {
      const row = g.el('div', 'dg-nm'), dot = g.el('span', 'dg-dot');
      dot.style.background = AV[i % AV.length];
      row.appendChild(dot);
      const inp = inputEl('dg-in', v, 14);
      inp.dir = 'auto';
      inp.addEventListener('input', () => { F.names[i] = inp.value; g.save('lnames', F.names); });
      row.appendChild(inp);
      if (F.names.length > 2) {
        const x = g.el('button', 'dg-x', '✕');
        x.type = 'button';
        x.addEventListener('click', () => { F.names.splice(i, 1); g.save('lnames', F.names); g.sfx('click'); syncPanel(g); });
        row.appendChild(x);
      }
      grid.appendChild(row);
    });
    card.appendChild(grid);
    if (F.names.length < MAXL) {
      const r = g.el('div', 'g2d-row');
      g.button(r, g.t('addPlayer'), () => {
        F.names.push(g.t('playerN', { n: F.names.length + 1 })); g.save('lnames', F.names); syncPanel(g);
        const ins = g.dg.ui.card ? g.dg.ui.card.querySelectorAll('.dg-in') : [];
        if (ins.length) { const l = ins[ins.length - 1]; l.focus(); l.select(); }
      }, { alt: true });
      card.appendChild(r);
    }
    optRow(g, card, g.t('rounds'), F.rounds, n => { F.rounds = n; g.save('lrounds', n); syncPanel(g); });
    const r2 = g.el('div', 'g2d-row');
    g.button(r2, g.t('startLocal'), () => localStart(g), { primary: true });
    card.appendChild(r2);
  }

  // ----- העט: אחד בכל פעם. אונליין הנקודות יוצאות כל 3 צעדים (20 פעמים בשנייה) -----
  const inBoard = (x, y) => x >= BX && x <= BX + BW && y >= BY && y <= BY + BH;
  const bxy = (x, y) => [Math.round(clamp(x - BX, 0, BW) * 10) / 10, Math.round(clamp(y - BY, 0, BH) * 10) / 10];
  function canDraw(g) {
    const S = g.s;
    if (!S || g.state !== 'play') return false;
    if (S.mode === 'online') return S.V.phase === 'draw' && !!S.V.me && S.V.drawer === S.V.me;
    return S.mode === 'local' && S.L.phase === 'draw';
  }
  function penDown(g, x, y, pid) {
    const S = g.s, T = S.tool, id = ++S.seq;
    const z = T.erase ? Math.max(16, SIZES[T.z] * 1.8) : SIZES[T.z], c = T.erase ? -1 : T.c, p = bxy(x, y);
    bStart(S.board, id, c, z, p);
    S.pen = { id, pid, sent: 2, lx: p[0], ly: p[1] };
    if (S.mode === 'online') act(g, { t: 's', id, c, z, p });
  }
  function penMove(g, x, y) {
    const S = g.s, pen = S.pen;
    if (!pen) return;
    const p = bxy(x, y);
    if (Math.abs(p[0] - pen.lx) + Math.abs(p[1] - pen.ly) < 2) return;
    pen.lx = p[0]; pen.ly = p[1];
    bPts(S.board, pen.id, p);
  }
  function flushPen(g) {
    const S = g.s, pen = S.pen;
    if (!pen || S.mode !== 'online') return;
    const s = findS(S.board, pen.id);
    if (!s || s.p.length <= pen.sent) return;
    act(g, { t: 'p', id: pen.id, p: s.p.slice(pen.sent) });
    pen.sent = s.p.length;
  }
  function penUp(g) {
    const S = g.s, pen = S.pen;
    if (!pen) return;
    flushPen(g);
    bEnd(S.board, pen.id);
    if (S.mode === 'online') act(g, { t: 'e', id: pen.id });
    S.pen = null;
  }
  function doUndo(g) {
    const S = g.s;
    if (S.pen) penUp(g);
    if (!S.board.list.length) return;
    bUndo(S.board);
    if (S.mode === 'online') act(g, { t: 'u' });
    g.sfx('click', { p: 0.8 });
  }
  function doClear(g) {
    const S = g.s, l = S.board.list;
    if (S.pen) penUp(g);
    if (!l.length || l[l.length - 1].x) return;
    bClear(S.board);
    if (S.mode === 'online') act(g, { t: 'x' });
    g.sfx('whoosh');
  }

  // ----- כפתורים על הקנבס: נבנים מחדש בכל צעד לפי המצב, ואותה רשימה משמשת לציור וללחיצה -----
  const TOOLS = (() => {
    const a = [];
    COLORS.forEach((c, i) => a.push({ a: 'color', i, x: BX + i * 40 + 2, y: TBY + 6, w: 36, h: 36 }));
    SIZES.forEach((z, i) => a.push({ a: 'size', i, x: BX + i * 58, y: TBY + 50, w: 52, h: 52 }));
    a.push({ a: 'erase', x: BX + 244, y: TBY + 50, w: 96, h: 52 }, { a: 'undo', x: BX + 350, y: TBY + 50, w: 100, h: 52 }, { a: 'clear', x: BX + 460, y: TBY + 50, w: 100, h: 52 });
    return a;
  })();
  const CARDS = [0, 1, 2].map(i => ({ a: 'card', i, x: BX + 25 + i * 175, y: BY + 150, w: 160, h: 120 }));
  const RXB = REACT.map((e, i) => ({ a: 'rx', i, x: BX + BW / 2 - 142 + i * 72, y: TBY + 52, w: 64, h: 50 }));
  const READY = { a: 'ready', x: BX + BW / 2 - 130, y: BY + 300, w: 260, h: 66 };
  const SIDE = [{ a: 'got', x: CX + 12, y: TOP + 14, w: CW - 24, h: 104 }, { a: 'peek', x: CX + 12, y: TOP + 132, w: CW - 24, h: 88 }, { a: 'skip', x: CX + 12, y: TOP + 234, w: CW - 24, h: 54 }];
  const CANCEL = { a: 'cancel', x: BX + BW / 2 - 100, y: BY + 378, w: 200, h: 46 };
  const NEXT = { a: 'next', x: BX, y: BY, w: BW, h: BH };
  const whoBtn = (k, i, rtl) => ({ a: 'who', i, x: BX + 25 + (rtl ? 1 - k % 2 : k % 2) * 260, y: BY + 88 + Math.floor(k / 2) * 66, w: 250, h: 56 });   // בעברית ובערבית הראשון מימין
  function buttons(g) {
    const S = g.s, out = [];
    if (S.mode === 'online') {
      const V = S.V, mine = !!V.me && V.drawer === V.me;
      if (V.phase === 'choose' && mine && V.choices && !V.picked) out.push(...CARDS);
      if (V.phase === 'draw' && mine) out.push(...TOOLS);
      if ((V.phase === 'draw' || V.phase === 'reveal') && !mine) out.push(...RXB);
    } else if (S.mode === 'local') {
      const L = S.L;
      if (L.phase === 'pass') out.push(READY);
      else if (L.phase === 'choose') out.push(...CARDS);
      else if (L.phase === 'draw') out.push(...TOOLS, ...SIDE);
      else if (L.phase === 'who') { let k = 0; L.players.forEach((p, i) => { if (i !== L.drawer) out.push(whoBtn(k++, i, g.rtl)); }); out.push(CANCEL); }
      else if (L.phase === 'reveal' && g.time - L.revT > 0.8) out.push(NEXT);
    }
    return out;
  }
  const hitB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function press(g, a, i) {
    const b = g.s.btns.find(q => q.a === a && (i == null || q.i === i));
    if (b) { doHit(g, b, { x: b.x + b.w / 2, y: b.y + b.h / 2, id: -1 }); g.s.btns = buttons(g); }
    return !!b;
  }
  function doHit(g, b, p) {
    const S = g.s, T = S.tool, L = S.L, V = S.V;
    switch (b.a) {
      case 'color': T.c = b.i; T.erase = false; g.sfx('click', { p: 1.2 }); break;
      case 'size': T.z = b.i; g.sfx('click'); break;
      case 'erase': T.erase = !T.erase; g.sfx('click', { p: 0.8 }); break;
      case 'undo': doUndo(g); break;
      case 'clear': doClear(g); break;
      case 'rx': if (g.time - (S.rxT == null ? -9 : S.rxT) > 0.5) { S.rxT = g.time; act(g, { t: 'rx', e: b.i }); } break;
      case 'card':
        if (S.mode === 'online') { if (!V.picked) { V.picked = true; act(g, { t: 'pick', i: b.i }); } }
        else localPick(g, b.i);
        break;
      case 'ready': L.phase = 'choose'; g.sfx('pop'); break;
      case 'got': L.phase = 'who'; g.sfx('click'); break;
      case 'peek': L.peek = true; L.peekId = p.id; g.sfx('tick'); break;
      case 'skip': localReveal(g, 'skipped'); break;
      case 'who': localGot(g, b.i); break;
      case 'cancel': L.phase = 'draw'; g.sfx('click'); break;
      case 'next': localNext(g); break;
    }
  }

  // ----- מצב "חדר אחד" -----
  function localStart(g) {
    const S = g.s, L = S.L, F = S.form;
    L.players = F.names.map((n, i) => ({ name: cleanName(n) || g.t('playerN', { n: i + 1 }), a: i % AV.length, score: 0 }));
    L.rs = F.rounds; L.r = 1; L.turn = -1; L.used = new Set();
    g.save('lnames', F.names);
    localNext(g);
  }
  function localNext(g) {
    const S = g.s, L = S.L;
    if (S.pen) penUp(g);
    if (++L.turn >= L.players.length) { L.turn = 0; if (++L.r > L.rs) { L.r = L.rs; return localPodium(g); } }
    L.drawer = L.turn; L.phase = 'pass'; L.choices = pick3(L.used); L.word = -1; L.gains = null; L.peek = false; L.why = '';
    boardReset(S.board); S.tool.erase = false;
    g.sfx('whoosh');
  }
  function localPick(g, i) {
    const S = g.s, L = S.L;
    L.word = L.choices[clamp(i | 0, 0, 2)]; L.used.add(L.word);
    L.phase = 'draw'; L.endT = g.time + LOCAL_S; L.drawT0 = g.time; S.lastSec = -1;
    g.sfx('start');
  }
  function localGot(g, who) {
    const S = g.s, L = S.L, left = Math.max(0, L.endT - g.time);
    const gain = 50 + Math.round(250 * left / LOCAL_S), dg = Math.round(gain / 2);
    L.players[who].score += gain; L.players[L.drawer].score += dg;
    L.gains = [[who, gain], [L.drawer, dg]]; L.who = who;
    localReveal(g, 'got');
    g.sfx('score'); confetti(g);
  }
  function localReveal(g, why) {
    const S = g.s, L = S.L;
    if (S.pen) penUp(g);
    L.phase = 'reveal'; L.why = why; L.revT = g.time; L.peek = false;
    if (why === 'timeUp') g.sfx('error'); else if (why === 'skipped') g.sfx('whoosh');
  }
  function localPodium(g) { const L = g.s.L; L.phase = 'podium'; L.podT = g.time; g.sfx('power'); }
  function localFinish(g) {
    const L = g.s.L;
    L.phase = 'done';
    const r = L.players.slice().sort((a, b) => b.score - a.score);
    const text = r.map((p, i) => (i + 1) + '. ' + p.name + ' — ' + p.score).join('   ·   ');
    if (r.length > 1 && r[0].score === r[1].score) g.end({ result: 'draw', score: null, text });
    else g.end({ result: 'win', winner: r[0].name, score: null, text });
  }
  function confetti(g) {
    g.burst(g.rnd(BX + 80, BX + BW - 80), BY + BH - 10, { n: 26, color: ['#ffcc33', '#ff5a6a', '#4dabf7', '#51cf66', '#cc5de8', '#ffffff'], speed: 9, gravity: 0.22, life: 75, size: 8, shape: 'square', dir: -Math.PI / 2, spread: 1.2, drag: 0.985 });
  }
  function stepOnline(g) {
    const S = g.s, V = S.V;
    if (S.pen && !canDraw(g)) { bEnd(S.board, S.pen.id); S.pen = null; }
    if (V.phase === 'draw') {
      const sec = Math.ceil(Math.max(0, V.endAt - now()) / 1000);
      if (sec !== S.lastSec) { if (sec <= 10 && sec > 0) g.sfx('tick', { p: sec <= 5 ? 1.35 : 1 }); S.lastSec = sec; }
    }
    if (V.phase === 'podium' && g.frame % 26 === 0) confetti(g);
    if (S.pen && g.frame % 3 === 0) flushPen(g);
  }
  function stepLocal(g) {
    const S = g.s, L = S.L;
    if (L.phase === 'who') L.endT += 1 / 60;          // בזמן שבוחרים מי ניחש השעון עומד
    if (L.phase === 'draw') {
      const left = L.endT - g.time, sec = Math.ceil(left);
      if (sec !== S.lastSec) { if (sec <= 10 && sec > 0) g.sfx('tick', { p: sec <= 5 ? 1.35 : 1 }); S.lastSec = sec; }
      if (left <= 0) localReveal(g, 'timeUp');
    } else if (S.pen) penUp(g);
    if (L.phase === 'reveal' && g.time - L.revT > 4.5) localNext(g);
    if (L.phase === 'podium') { if (g.frame % 22 === 0) confetti(g); if (g.time - L.podT > 4.5) localFinish(g); }
  }
  function stepRx(S) { for (let i = S.rx.length - 1; i >= 0; i--) if ((S.rx[i].t += 1 / 60) > 1.7) S.rx.splice(i, 1); }
  function hud(g) {
    const S = g.s;
    if (S.mode === 'online') {
      const V = S.V, it = [];
      if (S.N.code && (V.phase === 'room' || IN_GAME[V.phase])) it.push([g.t('room'), S.N.code]);
      if (IN_GAME[V.phase]) { const me = V.players.find(p => p.id === V.me); it.push([g.t('score'), me ? me.s : 0]); }
      g.hud(it);
    } else if (S.mode === 'local' && S.L.phase !== 'setup') g.hud([[g.t('round'), S.L.r + '/' + S.L.rs]]);
    else g.hud([]);
  }

  // ----- בוט לבדיקות (GK.bot): משחק דרך אותם כפתורים ואותו עט של שחקן -----
  function botDraw(g) {
    const S = g.s, B = S.bot;
    if (!S.pen) {
      if (B.wait > 0) { B.wait--; return; }
      if (Math.random() < 0.15) press(g, 'color', g.ri(0, COLORS.length - 1));
      if (Math.random() < 0.08) press(g, 'size', g.ri(0, SIZES.length - 1));
      B.x = g.rnd(BX + 40, BX + BW - 40); B.y = g.rnd(BY + 40, BY + BH - 40); B.ang = g.rnd(0, 6.28); B.n = g.ri(12, 40);
      penDown(g, B.x, B.y, -7);
      return;
    }
    B.ang += g.rnd(-0.4, 0.4);
    B.x += Math.cos(B.ang) * 7; B.y += Math.sin(B.ang) * 7;
    if (B.x < BX + 12 || B.x > BX + BW - 12) B.ang = Math.PI - B.ang;
    if (B.y < BY + 12 || B.y > BY + BH - 12) B.ang = -B.ang;
    penMove(g, B.x, B.y);
    if (--B.n <= 0) { penUp(g); B.wait = g.ri(3, 12); if (Math.random() < 0.05) press(g, 'undo'); }
  }
  function botStep(g) {
    const S = g.s, B = S.bot;
    B.t++;
    if (S.mode === 'local') {
      const L = S.L;
      if (L.phase === 'draw') { botDraw(g); if (g.time - L.drawT0 > B.plan) { if (S.pen) penUp(g); press(g, Math.random() < 0.15 ? 'skip' : 'got'); } return; }
      if (B.t % 20) return;
      if (L.phase === 'setup') localStart(g);
      else if (L.phase === 'pass') press(g, 'ready');
      else if (L.phase === 'choose') { B.plan = g.rnd(1.2, 3.5); press(g, 'card', g.ri(0, 2)); }
      else if (L.phase === 'who') { const o = S.btns.filter(b => b.a === 'who'); if (o.length) { doHit(g, g.pick(o), { id: -1 }); S.btns = buttons(g); } }
      else if (L.phase === 'reveal') press(g, 'next');
    } else if (S.mode === 'online') {
      const V = S.V;
      if (V.phase === 'choose' && B.t % 30 === 0) press(g, 'card', g.ri(0, 2));
      if (V.phase === 'draw' && V.drawer === V.me) botDraw(g);
    }
  }

  // ----- ציור המסך -----
  const DEMO_W = IDX('house');
  function demoInit(g) {
    const S = g.s, nm = String(g.t('demoNames')).split('|');
    S.demo = { players: [{ name: nm[0], a: 1, score: 340, drawing: true }, { name: nm[1], a: 2, score: 285, ok: true }, { name: nm[2], a: 4, score: 150 }] };
    S.chat = [{ k: 'msg', n: nm[2], a: 4, x: wordOf(IDX('castle'), g.lang) + '?' }, { k: 'msg', n: nm[1], a: 2, x: wordOf(IDX('tent'), g.lang) + '?' }, { k: 'ok', n: nm[1], a: 2, x: '' }];
  }
  function wrap(ctx, s, maxW, size, weight) {
    ctx.save();
    ctx.font = weight + ' ' + size + 'px Heebo, Arial, sans-serif';
    const out = [];
    let cur = '';
    for (const w of String(s).split(' ')) {
      if (!w) continue;
      const t = cur ? cur + ' ' + w : w;
      if (!cur || ctx.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = w; }
      while (cur.length > 1 && ctx.measureText(cur).width > maxW) {
        let k = cur.length - 1;
        while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
        out.push(cur.slice(0, k)); cur = cur.slice(k);
      }
    }
    if (cur) out.push(cur);
    ctx.restore();
    return out.length ? out.slice(0, 5) : [''];
  }
  const nameOf = (V, id) => { const p = V.players.find(q => q.id === id); return p ? p.n : ''; };
  function plist(g) {
    const S = g.s;
    if (S.mode === 'demo') return S.demo.players;
    if (S.mode === 'online') {
      const V = S.V, live = IN_GAME[V.phase] && V.phase !== 'podium';
      return V.players.map(p => ({ name: p.n, a: p.a, score: p.s, ok: p.ok, drawing: live && p.id === V.drawer, me: p.id === V.me }));
    }
    const L = S.L, live = L.phase !== 'setup' && L.phase !== 'podium' && L.phase !== 'done';
    return L.players.map((p, i) => ({ name: p.name, a: p.a, score: p.score, ok: L.phase === 'reveal' && L.why === 'got' && i === L.who, drawing: live && i === L.drawer }));
  }
  function timerInfo(g) {
    const S = g.s;
    if (S.mode === 'demo') return { left: 42, total: 80 };
    if (S.mode === 'online') {
      const V = S.V;
      return V.phase === 'draw' || V.phase === 'choose' ? { left: Math.max(0, V.endAt - now()) / 1000, total: (V.phase === 'draw' ? DRAW_MS : CHOOSE_MS) / 1000 } : null;
    }
    const L = S.L;
    return L.phase === 'draw' || L.phase === 'who' ? { left: Math.max(0, L.endT - g.time), total: LOCAL_S } : null;
  }
  function roundInfo(g) {
    const S = g.s;
    if (S.mode === 'online') return IN_GAME[S.V.phase] && S.V.rs ? [S.V.r, S.V.rs] : null;
    if (S.mode === 'local') return S.L.phase !== 'setup' ? [S.L.r, S.L.rs] : null;
    return [1, 2];
  }
  function wordLine(g) {
    const S = g.s, Lg = g.lang, dir = Lg === 'he' || Lg === 'ar' ? 'rtl' : 'ltr';
    if (S.mode === 'demo') { const w = wordOf(DEMO_W, Lg); return { small: g.t('letters', { n: nLetters(w) }), main: maskOf(w, [0], 1), dir }; }
    if (S.mode === 'online') {
      const V = S.V, mine = !!V.me && V.drawer === V.me, dn = nameOf(V, V.drawer);
      if (V.phase === 'choose') return { main: mine ? g.t('chooseWord') : g.t('choosing', { name: dn }) };
      if (V.phase === 'draw') {
        if (mine) return { small: g.t('drawThis'), main: wordOf(V.word, Lg), color: VIO };
        if (V.okWord >= 0) return { small: g.t('youGuessed'), main: '✔ ' + wordOf(V.okWord, Lg), color: GOOD };
        return { small: g.t('letters', { n: V.n }), main: V.mask, dir };
      }
      if (V.phase === 'reveal') return { small: g.t('wordWas'), main: wordOf(V.word, Lg), color: VIO };
      return { main: V.phase === 'podium' ? g.t('podium') : g.t('online') };
    }
    const L = S.L, dn = L.players[L.drawer] ? L.players[L.drawer].name : '';
    if (L.phase === 'pass') return { main: g.t('passTo', { name: dn }) };
    if (L.phase === 'choose') return { main: g.t('chooseWord') };
    if (L.phase === 'draw') return L.peek ? { small: g.t('drawThis'), main: wordOf(L.word, Lg), color: VIO } : { small: g.t('shout'), main: g.t('drawing', { name: dn }) };
    if (L.phase === 'who') return { main: g.t('whoGuessed') };
    if (L.phase === 'reveal') return { small: g.t('wordWas'), main: wordOf(L.word, Lg), color: VIO };
    return { main: L.phase === 'setup' ? g.t('localTitle') : g.t('podium') };
  }
  function drawTop(g, ctx) {
    pencil(ctx, PX + 24, 33, 0.62, -0.6);
    g.text(ctx, g.t('title'), PX + 104, 32, { size: 19, color: SUN, stroke: '#24125c', strokeW: 5, maxW: 132, weight: 900 });
    card(g, ctx, BX, 8, BW, 48, 14, '#fff');
    const w = wordLine(g), cx = BX + BW / 2;
    if (w.small) {
      g.text(ctx, w.small, cx, 20, { size: 12, color: MUTED, maxW: BW - 30, weight: 800 });
      g.text(ctx, w.main, cx, 40, { size: w.dir ? 25 : 21, color: w.color || INK, maxW: BW - 30, dir: w.dir, weight: 900 });
    } else g.text(ctx, w.main, cx, 33, { size: 21, color: w.color || INK, maxW: BW - 30, dir: w.dir, weight: 900 });
    card(g, ctx, CX, 8, CW, 48, 14, '#fff');
    const tm = timerInfo(g), ri = roundInfo(g), hot = tm && tm.left <= 10, kx = CX + 30;
    g.circle(ctx, kx, 32, 15); ctx.fillStyle = '#f1edff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = hot ? HOT : VIO; ctx.stroke();
    if (tm) {
      ctx.beginPath(); ctx.moveTo(kx, 32); ctx.arc(kx, 32, 11.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(tm.left / tm.total, 0, 1)); ctx.closePath();
      ctx.fillStyle = hot ? 'rgba(255,90,106,.5)' : 'rgba(122,76,255,.38)'; ctx.fill();
      const sec = Math.ceil(tm.left), pulse = hot ? 1 + Math.max(0, (tm.left % 1) - 0.72) : 1;
      g.text(ctx, String(sec), CX + 74, 33, { size: 26 * pulse, color: hot ? HOT : INK, weight: 900 });
    } else g.text(ctx, '—', CX + 74, 33, { size: 22, color: MUTED });
    if (ri) g.text(ctx, g.t('round') + ' ' + ri[0] + '/' + ri[1], CX + CW - 14, 33, { size: 15, color: MUTED, align: 'right', maxW: 112, weight: 800 });
  }
  function iconCheck(ctx, x, y, s) {
    ctx.save(); ctx.strokeStyle = GOOD; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(x - 2 * s, y + 6 * s); ctx.lineTo(x + 8 * s, y - 7 * s); ctx.stroke(); ctx.restore();
  }
  function drawPlayers(g, ctx, list) {
    const S = g.s;
    card(g, ctx, PX, TOP, PW, BOT - TOP, 16, 'rgba(255,255,255,.96)');
    if (!list.length) return;
    const rh = Math.min(74, (BOT - TOP - 12) / list.length), top = Math.max(0, ...list.map(p => p.score));
    list.forEach((p, i) => {
      const x = PX + 6, y = TOP + 6 + i * rh, w = PW - 12, h = rh - 6, cy = y + h / 2;
      g.rr(ctx, x, y, w, h, 12);
      ctx.fillStyle = p.drawing ? '#fff1bf' : p.ok ? '#d6f6e1' : '#f3f1fb'; ctx.fill();
      if (p.me) { ctx.lineWidth = 2.5; ctx.strokeStyle = VIO; ctx.stroke(); }
      const r = Math.min(20, h * 0.34), ax = g.rtl ? x + w - r - 8 : x + r + 8;
      avatar(g, ctx, ax, cy + 2, r, p.a, { t: S.clock, happy: p.ok, bob: p.drawing });
      const tx = g.rtl ? ax - r - 8 : ax + r + 8, al = g.rtl ? 'right' : 'left';
      g.text(ctx, p.name, tx, cy - h * 0.17, { size: 15, color: INK, align: al, maxW: w - 2 * r - 44, weight: 800 });
      g.text(ctx, g.t('pts', { n: p.score }), tx, cy + h * 0.2, { size: 13, color: MUTED, align: al, weight: 700 });
      const ix = g.rtl ? x + 16 : x + w - 16;
      if (p.drawing) pencil(ctx, ix - 4, cy - 2, 0.5, -0.6);
      else if (p.ok) iconCheck(ctx, ix, cy, 1);
      else if (p.score > 0 && p.score === top) g.text(ctx, '★', ix, cy, { size: 19, color: SUN, stroke: '#b07d00', strokeW: 2 });
    });
  }
  function drawBoard(g, ctx) {
    const S = g.s;
    card(g, ctx, BX - 5, BY - 5, BW + 10, BH + 10, 17, '#fff');
    ctx.save();
    g.rr(ctx, BX, BY, BW, BH, 12); ctx.clip();
    if (S.mode === 'demo') {
      const frac = Math.min(1, (S.clock % 11) / 7.5);
      ctx.translate(BX, BY);
      const tip = artDraw(ctx, frac);
      ctx.restore();
      if (tip && frac < 1) pencil(ctx, BX + tip[0] - 5, BY + tip[1] - 7, 1.1, -0.6);
      return;
    }
    ctx.drawImage(S.board.cv, BX, BY, BW, BH);
    const l = S.board.list;
    ctx.translate(BX, BY);
    for (let i = Math.max(0, l.length - 3); i < l.length; i++) if (l[i].open) tail(ctx, l[i]);
    ctx.restore();
    if (canDraw(g) && g.ptr.over && inBoard(g.ptr.x, g.ptr.y)) {
      const T = S.tool, z = T.erase ? Math.max(16, SIZES[T.z] * 1.8) : SIZES[T.z];
      g.circle(ctx, g.ptr.x, g.ptr.y, z / 2 + 1);
      if (!T.erase && T.c !== 1) { ctx.globalAlpha = 0.35; ctx.fillStyle = COLORS[T.c]; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.lineWidth = 1.5; ctx.strokeStyle = T.erase ? '#8a8a99' : 'rgba(42,35,80,.75)'; ctx.stroke();
    }
  }
  function iconEraser(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
    ctx.fillStyle = '#ff8fb0'; ctx.fillRect(-18, -9, 24, 18);
    ctx.fillStyle = '#8ec5ff'; ctx.fillRect(6, -9, 12, 18);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-18, -9, 36, 18);
    ctx.restore();
  }
  function iconUndo(ctx, x, y) {
    ctx.save(); ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + 3, y + 3, 12, Math.PI, Math.PI * 2.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 16, y - 1); ctx.lineTo(x - 2, y - 1); ctx.lineTo(x - 9, y + 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function iconTrash(ctx, x, y) {
    ctx.save(); ctx.fillStyle = HOT; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 11, y - 8); ctx.lineTo(x + 11, y - 8); ctx.lineTo(x + 8, y + 15); ctx.lineTo(x - 8, y + 15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 14, y - 14, 28, 5); ctx.strokeRect(x - 14, y - 14, 28, 5); ctx.fillRect(x - 4, y - 18, 8, 4);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.beginPath();
    for (const dx of [-4, 0, 4]) { ctx.moveTo(x + dx, y - 3); ctx.lineTo(x + dx * 0.8, y + 11); }
    ctx.stroke(); ctx.restore();
  }
  function drawTools(g, ctx, live) {
    const T = g.s.tool;
    ctx.save();
    if (!live) ctx.globalAlpha = 0.4;
    for (const b of TOOLS) {
      const on = (b.a === 'color' && !T.erase && T.c === b.i) || (b.a === 'size' && T.z === b.i) || (b.a === 'erase' && T.erase);
      const hov = live && g.ptr.over && hitB(b, g.ptr.x, g.ptr.y);
      if (b.a === 'color') {
        g.rr(ctx, b.x, b.y - (on ? 4 : hov ? 2 : 0), b.w, b.h, 9); ctx.fillStyle = COLORS[b.i]; ctx.fill();
        ctx.lineWidth = on ? 3.5 : 1.5; ctx.strokeStyle = on ? VIO : 'rgba(0,0,0,.22)'; ctx.stroke();
        continue;
      }
      g.rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = on ? '#ece6ff' : hov ? '#f1eefc' : '#f7f6fc'; ctx.fill();
      ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? VIO : '#dcd8ec'; ctx.stroke();
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (b.a === 'size') { g.circle(ctx, cx, cy, SIZES[b.i] / 2 + 1); ctx.fillStyle = T.erase ? '#b9b4cc' : T.c === 1 ? '#d9d6e6' : COLORS[T.c]; ctx.fill(); }
      else if (b.a === 'erase') iconEraser(ctx, cx, cy);
      else if (b.a === 'undo') iconUndo(ctx, cx, cy);
      else iconTrash(ctx, cx, cy);
    }
    ctx.restore();
  }
  function drawBottom(g, ctx) {
    const S = g.s, V = S.V;
    card(g, ctx, BX, TBY, BW, BOT - TBY, 14, 'rgba(255,255,255,.95)');
    if (S.mode === 'online' && (V.phase === 'draw' || V.phase === 'reveal') && V.drawer !== V.me) {
      const p = V.players.find(q => q.id === V.drawer);
      if (V.phase === 'draw' && p) {
        avatar(g, ctx, BX + 28, TBY + 27, 15, p.a, { t: S.clock, bob: true });
        g.text(ctx, g.t('drawing', { name: p.n }), BX + BW / 2, TBY + 27, { size: 17, color: INK, maxW: BW - 110, weight: 800 });
      }
      for (const b of RXB) {
        const hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y), y = b.y - (hov ? 3 : 0);
        g.rr(ctx, b.x, y, b.w, b.h, 14); ctx.fillStyle = hov ? '#ece6ff' : '#f4f2fb'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#dcd8ec'; ctx.stroke();
        g.text(ctx, REACT[b.i], b.x + b.w / 2, y + b.h / 2 + 2, { size: 26, weight: 400 });
      }
      return;
    }
    drawTools(g, ctx, canDraw(g) || S.mode === 'demo');
  }
  function bigBtn(g, ctx, b, label, col, tc, size) {
    const hov = g.ptr.over && hitB(b, g.ptr.x, g.ptr.y), y = b.y + (hov && g.ptr.down ? 3 : hov ? -2 : 0);
    g.rr(ctx, b.x, b.y + 5, b.w, b.h, 16); ctx.fillStyle = g.shade(col, -0.3); ctx.fill();
    g.rr(ctx, b.x, y, b.w, b.h, 16); ctx.fillStyle = col; ctx.fill();
    g.rr(ctx, b.x + 5, y + 4, b.w - 10, b.h * 0.4, 12); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
    if (label) g.text(ctx, label, b.x + b.w / 2, y + b.h / 2 + 1, { size: size || 22, color: tc, weight: 900, maxW: b.w - 20 });
    return y;
  }
  function chatLay(g, ctx, m) {
    if (m.L && m.L.lang === g.lang) return m.L;
    let lay;
    if (m.k === 'msg' || m.k === 'sec') { const lines = wrap(ctx, m.x, CW - 30, 15, 600); lay = { lines, h: 24 + lines.length * 19 }; }
    else {
      const s = m.k === 'ok' ? '✔ ' + g.t('guessedMsg', { name: m.n }) : m.k === 'close' ? g.t('closeMsg', { x: m.x }) : m.k === 'spoil' ? g.t('noSpoil')
        : m.k === 'join' ? g.t('joined', { name: m.n }) : m.k === 'left' ? g.t('leftMsg', { name: m.n }) : g.t('notEnough');
      const st = { ok: ['#d9f7e3', '#1d8a46'], close: ['#fff3c4', '#946500'], spoil: ['#ffe1e6', '#c2334a'], few: ['#ffe1e6', '#c2334a'] }[m.k] || ['#ece8f8', '#6b5fa8'];
      const lines = wrap(ctx, s, CW - 34, 14, 800);
      lay = { sys: true, lines, h: lines.length * 18 + 10, bg: st[0], col: st[1] };
    }
    lay.lang = g.lang; m.L = lay;
    return lay;
  }
  function drawChat(g, ctx) {
    const S = g.s;
    card(g, ctx, CX, TOP, CW, BOT - TOP, 16, 'rgba(255,255,255,.96)');
    g.text(ctx, g.t('guesses'), CX + CW / 2, TOP + 20, { size: 15, color: MUTED, weight: 800 });
    ctx.fillStyle = '#ece8f8'; ctx.fillRect(CX + 12, TOP + 36, CW - 24, 2);
    const al = g.rtl ? 'right' : 'left', x0 = g.rtl ? CX + CW - 14 : CX + 14, top = TOP + 42;
    let y = S.mode === 'online' && IN_GAME[S.V.phase] ? BOT - 58 : BOT - 12;
    for (let i = S.chat.length - 1; i >= 0; i--) {
      const m = S.chat[i], lay = chatLay(g, ctx, m);
      if (y - lay.h < top) break;
      y -= lay.h;
      if (lay.sys) {
        g.rr(ctx, CX + 8, y, CW - 16, lay.h - 4, 9); ctx.fillStyle = lay.bg; ctx.fill();
        lay.lines.forEach((ln, j) => g.text(ctx, ln, CX + CW / 2, y + 12 + j * 18, { size: 14, color: lay.col, weight: 800 }));
      } else {
        if (m.k === 'sec') { g.rr(ctx, CX + 8, y, CW - 16, lay.h - 2, 9); ctx.fillStyle = '#e6f8ec'; ctx.fill(); }
        g.text(ctx, m.n, x0, y + 9, { size: 12.5, color: g.shade(AV[m.a % AV.length], -0.32), align: al, weight: 900, maxW: CW - 28 });
        lay.lines.forEach((ln, j) => g.text(ctx, ln, x0, y + 27 + j * 19, { size: 15, color: INK, align: al, weight: 600 }));
      }
      y -= 4;
    }
  }
  function drawLocalSide(g, ctx) {
    const S = g.s, L = S.L;
    card(g, ctx, CX, TOP, CW, BOT - TOP, 16, 'rgba(255,255,255,.96)');
    let ty = TOP + 60;
    if (L.phase === 'draw') {
      bigBtn(g, ctx, SIDE[0], g.t('gotIt'), GOOD, '#ffffff', 25);
      const y = bigBtn(g, ctx, SIDE[1], '', L.peek ? VIO : '#3d9be9', '#ffffff');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(CX + CW / 2, y + 28, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      g.circle(ctx, CX + CW / 2, y + 28, 7); ctx.fillStyle = INK; ctx.fill();
      g.text(ctx, g.t('peek'), CX + CW / 2, y + 64, { size: 16, color: '#fff', weight: 900, maxW: CW - 40 });
      bigBtn(g, ctx, SIDE[2], g.t('skip'), '#e4e0f3', INK, 18);
      ty = TOP + 330;
    }
    const msg = L.phase === 'pass' || L.phase === 'choose' ? g.t('onlyDrawer') : g.t('shout');
    if (!S.wc || S.wc.s !== msg) S.wc = { s: msg, lines: wrap(ctx, msg, CW - 30, 17, 800) };
    S.wc.lines.forEach((ln, j) => g.text(ctx, ln, CX + CW / 2, ty + j * 23, { size: 17, color: INK, weight: 800 }));
    const bob = Math.sin(S.clock * 3) * 4, bub = (x, y, r, txt, col) => {
      g.circle(ctx, x, y, r); ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.8); ctx.lineTo(x - r * 0.75, y + r * 1.32); ctx.lineTo(x + r * 0.15, y + r * 0.95); ctx.fill();
      g.text(ctx, txt, x, y + 2, { size: r * 1.1, color: '#fff', weight: 900 });
    };
    bub(CX + CW / 2 - 32, BOT - 90 + bob, 42, '?', VIO);
    bub(CX + CW / 2 + 48, BOT - 140 - bob, 28, '!', HOT);
  }
  function dim(g, ctx, a) { ctx.save(); g.rr(ctx, BX, BY, BW, BH, 12); ctx.fillStyle = 'rgba(36,22,92,' + a + ')'; ctx.fill(); ctx.restore(); }
  function drawCards(g, ctx, choices) {
    for (const c of CARDS) {
      const hov = g.ptr.over && hitB(c, g.ptr.x, g.ptr.y), y = c.y - (hov ? 7 : 0) + Math.sin(g.s.clock * 3 + c.i * 2) * 2.5;
      card(g, ctx, c.x, y, c.w, c.h, 16, hov ? '#fffbe8' : '#fff');
      ctx.save(); g.rr(ctx, c.x, y, c.w, c.h, 16); ctx.clip(); ctx.fillStyle = AV[c.i * 2 + 1]; ctx.fillRect(c.x, y, c.w, 14); ctx.restore();
      g.text(ctx, wordOf(choices[c.i], g.lang), c.x + c.w / 2, y + c.h / 2 + 7, { size: 25, color: INK, maxW: c.w - 18, weight: 900 });
    }
  }
  function drawReveal(g, ctx, word, why, gains, el, foot) {
    dim(g, ctx, 0.72);
    const cx = BX + BW / 2, t = clamp(el * 2.5, 0, 1);
    g.text(ctx, g.t('wordWas'), cx, BY + 66, { size: 18, color: '#d8ccff', weight: 800 });
    g.text(ctx, word, cx, BY + 118, { size: 48 * (0.55 + 0.45 * g.ease.back(t)), color: SUN, stroke: '#24125c', strokeW: 7, weight: 900, maxW: BW - 40 });
    g.text(ctx, why, cx, BY + 170, { size: 19, color: '#fff', weight: 800, maxW: BW - 40 });
    const n = Math.min(6, gains.length);
    for (let i = 0; i < n; i++) {
      const p = gains[i][0], v = gains[i][1], x = n === 1 ? cx : cx + (i % 2 ? 128 : -128), y = BY + 226 + (i >> 1) * 58;
      card(g, ctx, x - 118, y - 24, 236, 48, 14, 'rgba(255,255,255,.96)', false);
      avatar(g, ctx, x - 90, y, 17, p.a, { happy: true, t: g.s.clock });
      g.text(ctx, p.name, x - 4, y, { size: 17, color: INK, maxW: 104, weight: 800 });
      g.text(ctx, '+' + v, x + 84, y, { size: 20, color: GOOD, weight: 900 });
    }
    if (foot) g.text(ctx, foot, cx, BY + BH - 24, { size: 15, color: '#d8ccff', weight: 700 });
  }
  function drawOverlay(g, ctx) {
    const S = g.s, cx = BX + BW / 2;
    if (S.mode === 'online') {
      const V = S.V, mine = !!V.me && V.drawer === V.me;
      if (V.phase === 'choose') {
        dim(g, ctx, 0.66);
        if (mine && V.choices && !V.picked) {
          g.text(ctx, g.t('chooseWord'), cx, BY + 96, { size: 28, color: '#fff', weight: 900, maxW: BW - 40 });
          drawCards(g, ctx, V.choices);
          g.text(ctx, String(Math.ceil(Math.max(0, V.endAt - now()) / 1000)), cx, BY + 330, { size: 30, color: SUN, weight: 900 });
        } else {
          const p = V.players.find(q => q.id === V.drawer);
          if (p) avatar(g, ctx, cx, BY + 170, 50, p.a, { t: S.clock, bob: true });
          g.text(ctx, g.t('choosing', { name: nameOf(V, V.drawer) }), cx, BY + 262, { size: 24, color: '#fff', weight: 900, maxW: BW - 40 });
          for (let i = 0; i < 3; i++) { g.circle(ctx, cx - 22 + i * 22, BY + 305 + Math.sin(S.clock * 7 - i) * 5, 6); ctx.fillStyle = '#fff'; ctx.fill(); }
        }
      } else if (V.phase === 'reveal') {
        const gains = (V.gains || []).map(([id, v]) => { const p = V.players.find(q => q.id === id); return p ? [{ name: p.n, a: p.a }, v | 0] : null; }).filter(Boolean);
        const why = V.why === 'timeUp' && !gains.length ? g.t('nobodyGuessed') : g.t(['timeUp', 'allGuessed', 'drawerLeft'].includes(V.why) ? V.why : 'timeUp');
        drawReveal(g, ctx, wordOf(V.word, g.lang), why, gains, (REVEAL_MS - (V.endAt - now())) / 1000, '');
      }
      return;
    }
    if (S.mode !== 'local') return;
    const L = S.L, d = L.players[L.drawer];
    if (L.phase === 'pass' && d) {
      dim(g, ctx, 0.86);
      avatar(g, ctx, cx, BY + 118, 52, d.a, { t: S.clock, bob: true });
      g.text(ctx, g.t('passTo', { name: d.name }), cx, BY + 212, { size: 28, color: '#fff', weight: 900, maxW: BW - 40 });
      g.text(ctx, g.t('onlyDrawer'), cx, BY + 252, { size: 17, color: '#d8ccff', maxW: BW - 40, weight: 700 });
      bigBtn(g, ctx, READY, g.t('imReady'), GOOD, '#ffffff', 24);
    } else if (L.phase === 'choose') {
      dim(g, ctx, 0.86);
      g.text(ctx, g.t('chooseWord'), cx, BY + 96, { size: 28, color: '#fff', weight: 900, maxW: BW - 40 });
      drawCards(g, ctx, L.choices);
    } else if (L.phase === 'who') {
      dim(g, ctx, 0.8);
      g.text(ctx, g.t('whoGuessed'), cx, BY + 48, { size: 28, color: '#fff', weight: 900 });
      for (const b of S.btns) {
        if (b.a !== 'who') continue;
        const p = L.players[b.i], y = bigBtn(g, ctx, b, '', '#ffffff', INK);
        avatar(g, ctx, g.rtl ? b.x + b.w - 30 : b.x + 30, y + b.h / 2, 18, p.a, { t: S.clock });
        g.text(ctx, p.name, b.x + b.w / 2 + (g.rtl ? -14 : 14), y + b.h / 2 + 1, { size: 20, color: INK, maxW: b.w - 80, weight: 900 });
      }
      bigBtn(g, ctx, CANCEL, g.t('cancel'), '#cdc5ee', INK, 18);
    } else if (L.phase === 'reveal') {
      const why = L.why === 'got' ? g.t('guessedMsg', { name: L.players[L.who].name }) : g.t(L.why === 'timeUp' ? 'timeUp' : 'skipped');
      const gains = (L.gains || []).map(([i, v]) => [L.players[i], v]);
      drawReveal(g, ctx, wordOf(L.word, g.lang), why, gains, g.time - L.revT, g.time - L.revT > 0.8 ? g.t('tapNext') : '');
    }
  }
  function drawPodium(g, ctx, list, foot) {
    const S = g.s;
    ctx.save(); g.rr(ctx, PX, TOP, W - 2 * PX, BOT - TOP, 18); ctx.fillStyle = 'rgba(30,16,78,.94)'; ctx.fill(); ctx.restore();
    g.text(ctx, g.t('podium'), W / 2, TOP + 46, { size: 36, color: SUN, stroke: '#140a3c', strokeW: 7, weight: 900 });
    const r = list.slice().sort((a, b) => b.score - a.score), base = BOT - (r.length > 3 ? 98 : 64);
    const spots = [[0, W / 2, 180, '#ffcc33'], [1, W / 2 - 185, 130, '#d5dde8'], [2, W / 2 + 185, 96, '#e9a66c']];
    for (const [k, x, h, col] of spots) {
      const p = r[k];
      if (!p) continue;
      const gr = ctx.createLinearGradient(0, base - h, 0, base);
      gr.addColorStop(0, col); gr.addColorStop(1, g.shade(col, -0.32));
      g.rr(ctx, x - 82, base - h, 164, h, 14); ctx.fillStyle = gr; ctx.fill();
      g.text(ctx, String(k + 1), x, base - h + 36, { size: 42, color: '#fff', stroke: g.shade(col, -0.5), strokeW: 6, weight: 900 });
      g.text(ctx, g.t('pts', { n: p.score }), x, base - h + 76, { size: 17, color: g.shade(col, -0.62), weight: 900, maxW: 150 });
      avatar(g, ctx, x, base - h - 44, 36, p.a, { happy: true, t: S.clock, bob: k === 0 });
      g.text(ctx, p.name, x, base - h - 98, { size: 20, color: '#fff', weight: 900, maxW: 170 });
    }
    // מקום 4 ומטה: שורה מתחת לפודיום. המספר, השם והנקודות מצוירים בנפרד, כדי ששם בעברית לא יערבב את הסדר
    const extra = r.slice(3), y = foot ? BOT - 48 : BOT - 30;
    extra.forEach((p, i) => {
      const cx = W / 2 + (i - (extra.length - 1) / 2) * 180;
      g.circle(ctx, cx - 64, y, 13); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      g.text(ctx, String(i + 4), cx - 64, y + 1, { size: 14, color: '#fff', weight: 900 });
      g.text(ctx, p.name, cx + 6, y - 8, { size: 15, color: '#fff', weight: 800, maxW: 116 });
      g.text(ctx, g.t('pts', { n: p.score }), cx + 6, y + 10, { size: 12, color: '#cfc6ff', weight: 700 });
    });
    if (foot) g.text(ctx, foot, W / 2, BOT - 16, { size: 15, color: '#cfc6ff', weight: 700 });
  }
  function drawRx(g, ctx) {
    for (const r of g.s.rx) g.text(ctx, r.e, r.x + Math.sin(r.t * 6 + r.x) * 10, r.y - r.t * 140, { size: 36 + r.t * 6, weight: 400, alpha: clamp((1.7 - r.t) * 2, 0, 1) });
  }
  function placeLayer(g) {
    const S = g.s, lay = g.dg.layer, show = S.mode === 'online' && !!IN_GAME[S.V.phase] && g.state !== 'menu';
    if (lay.hidden === show) lay.hidden = !show;
    if (!show) { if (document.activeElement === g.dg.input) g.dg.input.blur(); return; }
    const cv = g.canvas, k = cv.clientWidth / W, sig = cv.offsetLeft + ',' + cv.offsetTop + ',' + k;
    if (sig !== g.dg.lsig) { g.dg.lsig = sig; lay.style.transform = 'translate(' + cv.offsetLeft + 'px,' + cv.offsetTop + 'px) scale(' + k + ')'; }
  }
  function setCursor(g) {
    const S = g.s, x = g.ptr.x, y = g.ptr.y;
    let c = '';
    if (g.state === 'play' && g.ptr.over) { if (S.btns.some(b => hitB(b, x, y))) c = 'pointer'; else if (canDraw(g) && inBoard(x, y)) c = 'crosshair'; }
    if (c !== g.dg.cur) { g.dg.cur = c; g.canvas.style.cursor = c; }
  }
  function bubble(u, ctx, x, y, txt, fill, col) {
    ctx.save(); ctx.font = '900 40px Heebo, Arial, sans-serif';
    const tw = Math.min(250, ctx.measureText(txt).width) + 50, hh = 72;
    ctx.restore();
    card(u, ctx, x - tw / 2, y - hh / 2, tw, hh, 28, fill);
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x + tw / 2 - 46, y + hh / 2 - 2); ctx.lineTo(x + tw / 2 - 10, y + hh / 2 + 24); ctx.lineTo(x + tw / 2 - 20, y + hh / 2 - 2); ctx.fill();
    u.text(ctx, txt, x, y + 2, { size: 40, color: col, weight: 900, maxW: 250 });
  }
  const KH = { he: 'Esc — השהיה', en: 'Esc — pause', ar: 'Esc — إيقاف مؤقت', es: 'Esc — pausa', fr: 'Échap — pause', pt: 'Esc — pausa', ru: 'Esc — пауза', de: 'Esc — Pause' };
  for (const L in KH) TEXT[L].keysHint = KH[L];

  GK.register('draw-guess', {
    w: W, h: H, bg: '#2b1b6e', accent: SUN,
    modes: [{ id: 'online', label: 'mOnline' }, { id: 'local', label: 'mLocal' }],
    typing: true, noBest: true,
    text: TEXT,
    setup(g) { makeLayer(g); },
    init(g) {
      if (g.s) netReset(g);      // חדר פתוח נסגר: סיבוב חדש, התחלה מחדש או חזרה לתפריט
      if (!g.dg.board) g.dg.board = newBoard();
      const names = g.load('lnames', null);
      const S = g.s = {
        mode: g.demo ? 'demo' : g.mode === 'local' ? 'local' : 'online',
        board: g.dg.board, tool: { c: 0, z: 1, erase: false }, pen: null, seq: 0, chat: [], rx: [], btns: [], clock: 0, lastSec: -1, wc: null,
        bot: { t: 0, wait: 0, plan: 2, x: 0, y: 0, ang: 0, n: 0 },
        N: N0(), R: null, V: freshV('home'),
        L: { phase: 'setup', players: [], rs: 2, r: 1, turn: -1, drawer: 0, choices: [0, 1, 2], word: -1, endT: 0, drawT0: 0, used: new Set(), peek: false, peekId: null, why: '', gains: null, who: 0, revT: 0, podT: 0 },
        form: { code: '', names: Array.isArray(names) && names.length >= 2 ? names.slice(0, MAXL).map(n => String(n == null ? '' : n).slice(0, 14)) : [1, 2, 3].map(n => g.t('playerN', { n })), rounds: clampR(g.load('lrounds', 2)) },
        demo: null,
      };
      boardReset(S.board);
      Object.assign(g.dg.ui, { kind: null, card: null, sig: '' });
      g.dg.input.value = '';
      if (g.demo) demoInit(g);
    },
    step(g) {
      const S = g.s;
      S.clock += 1 / 60;
      if (S.mode === 'online') stepOnline(g); else if (S.mode === 'local') stepLocal(g);
      stepRx(S);
      syncPanel(g);
      S.btns = buttons(g);
      hud(g);
    },
    idle(g) { const S = g.s; if (S) { S.clock += 1 / 60; stepRx(S); } },
    bot(g) { botStep(g); },
    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') {
        for (let i = S.btns.length - 1; i >= 0; i--) if (hitB(S.btns[i], p.x, p.y)) { doHit(g, S.btns[i], p); S.btns = buttons(g); return; }
        if (canDraw(g) && !S.pen && inBoard(p.x, p.y)) penDown(g, p.x, p.y, p.id);
      } else if (type === 'move') {
        if (S.pen && p.id === S.pen.pid) penMove(g, p.x, p.y);
      } else if (type === 'up') {
        if (S.pen && p.id === S.pen.pid) { penMove(g, p.x, p.y); penUp(g); }
        if (S.L.peek && S.L.peekId === p.id) S.L.peek = false;
      }
    },
    onKey(g, e) {
      const S = g.s, chat = S.mode === 'online' && IN_GAME[S.V.phase] && !g.dg.layer.hidden;
      if (chat && (e.code === 'Enter' || e.code === 'NumpadEnter')) { g.dg.input.focus(); return; }
      if (chat && !canDraw(g) && e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { g.dg.input.focus(); return; }
      if (!canDraw(g) || e.repeat) return;
      if (e.code === 'KeyZ') doUndo(g);
      else if (e.code === 'KeyE') { S.tool.erase = !S.tool.erase; g.sfx('click', { p: 0.8 }); }
      else if (e.code === 'KeyB') { S.tool.erase = false; g.sfx('click'); }
      else if (/^Digit[1-4]$/.test(e.code)) { S.tool.z = +e.code.slice(5) - 1; g.sfx('click'); }
    },
    onPause(g) {
      const S = g.s;
      if (S.pen) penUp(g);
      S.L.peek = false;
      S.autoPaused = S.mode === 'online' && (document.hidden || !document.hasFocus());
    },
    onLang(g) {
      if (!g.dg || !g.s) return;
      g.dg.input.placeholder = g.t('typeGuess');
      const S = g.s;
      if (S.mode === 'demo') demoInit(g);
      if (S.mode === 'online' && S.N.role && S.V.me) act(g, { t: 'lang', l: g.lang });
    },
    destroy(g) {
      netReset(g);
      if (g.dg) {
        g.dg.layer.remove(); g.dg.style.remove(); g.canvas.style.cursor = '';
        window.removeEventListener('pagehide', g.dg.onHide);
        window.removeEventListener('focus', g.dg.onBack);
        document.removeEventListener('visibilitychange', g.dg.onBack);
      }
    },
    draw(g, ctx) {
      const S = g.s;
      drawBg(ctx, W, H, S.clock);
      drawTop(g, ctx);
      drawPlayers(g, ctx, plist(g));
      drawBoard(g, ctx);
      drawBottom(g, ctx);
      if (S.mode === 'local') drawLocalSide(g, ctx); else drawChat(g, ctx);
      drawOverlay(g, ctx);
      drawRx(g, ctx);
      const pod = S.mode === 'online' ? S.V.phase === 'podium' : S.mode === 'local' && (S.L.phase === 'podium' || S.L.phase === 'done');
      if (pod) drawPodium(g, ctx, plist(g), S.mode === 'online' ? g.t('backIn', { n: Math.max(0, Math.ceil((S.V.endAt - now()) / 1000)) }) : '');
      placeLayer(g);
      setCursor(g);
    },
    cover(ctx, w, h, k) {
      drawBg(ctx, w, h, 0);
      const r = k.seeded(5);
      for (let i = 0; i < 46; i++) { ctx.save(); ctx.translate(r() * w, r() * h); ctx.rotate(r() * 3); ctx.globalAlpha = 0.8; ctx.fillStyle = AV[i % AV.length]; ctx.fillRect(-6, -3.5, 12, 7); ctx.restore(); }
      ctx.save(); ctx.translate(405, 285); ctx.rotate(-0.045);
      card(k, ctx, -300, -222, 600, 444, 24, '#fff');
      ctx.save(); k.rr(ctx, -290, -212, 580, 424, 18); ctx.clip(); ctx.translate(-266, -208); ctx.scale(0.95, 0.95); artDraw(ctx, 1); ctx.restore();
      ctx.restore();
      pencil(ctx, 610, 205, 2.3, -0.6);
      bubble(k, ctx, 820, 120, wordOf(IDX('horse'), 'he') + '?', '#ffffff', INK);
      bubble(k, ctx, 850, 222, wordOf(IDX('tent'), 'he') + '?', '#ffffff', INK);
      bubble(k, ctx, 815, 330, '✔ ' + wordOf(IDX('house'), 'he') + '!', GOOD, '#ffffff');
      avatar(k, ctx, 900, 462, 48, 2, { happy: true });
      avatar(k, ctx, 760, 480, 36, 4, {});
      avatar(k, ctx, 70, 465, 46, 1, { happy: true });
      k.circle(ctx, 78, 80, 46); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = HOT; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(78, 80); ctx.arc(78, 80, 36, -Math.PI / 2, Math.PI * 0.55); ctx.closePath(); ctx.fillStyle = 'rgba(255,90,106,.35)'; ctx.fill();
      k.text(ctx, '42', 78, 82, { size: 38, color: INK, weight: 900 });
    },
  });
})();
