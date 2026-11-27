// ============================================================
//  קלפי קרב — משחק 2D של URotation (המנוע: g2d/kit.js)
//  משחק קלפים: יצורים וכישופים מצוירים מקוד, מאנה שגדלה בכל תור, 5 מקומות על הלוח לכל צד.
//  מסע של 8 יריבים: כל ניצחון פותח קלפים חדשים (נשמר), ובוחרים חפיסה או בונים אחת לבד.
//  החוקים (R) נפרדים מהציור — אותו קוד משמש את המשחק, את המחשב ואת הסימולציות בבדיקות.
// ============================================================
(function () {
  'use strict';
  const W = 1280, H = 720, CW = 150, CH = 210;
  const TAU = Math.PI * 2, OL = '#2b1f36', FONT = 'Heebo, Arial, sans-serif';
  const MAXB = 5, MAXH = 8, MAXM = 10, DECK = 20, COPIES = 2, PHP = 20, TURN_CAP = 45;
  const SLOT_ORDER = [2, 1, 3, 0, 4];

  // ---------- הקלפים ----------
  // c מחיר, a התקפה, h חיים. kw: g שומר, s זריז, h מגן, p רעל.
  // fx = כשנכנס ללוח, sp = כישוף, die = כשהוא מת. k: dmg (נזק לאויב), aoe (לכל יצורי האויב), draw, heal (לגיבור), buff, kill, face (לגיבור האויב)
  const CARDS = {
    sprout:   { el: 'forest', c: 1, a: 1, h: 2 },
    bunny:    { el: 'forest', c: 1, a: 1, h: 1, kw: 's' },
    wolf:     { el: 'forest', c: 2, a: 3, h: 2 },
    bear:     { el: 'forest', c: 3, a: 3, h: 4 },
    oak:      { el: 'forest', c: 5, a: 4, h: 5, kw: 'g', fx: { k: 'heal', n: 3 } },
    growth:   { el: 'forest', c: 2, sp: { k: 'buff', a: 2, h: 2 } },
    dew:      { el: 'forest', c: 1, sp: { k: 'heal', n: 5 } },
    imp:      { el: 'fire', c: 1, a: 2, h: 1 },
    fox:      { el: 'fire', c: 2, a: 2, h: 1, kw: 's' },
    lizard:   { el: 'fire', c: 3, a: 3, h: 3, fx: { k: 'dmg', n: 1 } },
    phoenix:  { el: 'fire', c: 5, a: 4, h: 4, kw: 's' },
    dragon:   { el: 'fire', c: 7, a: 6, h: 6, fx: { k: 'aoe', n: 2 } },
    fireball: { el: 'fire', c: 4, sp: { k: 'dmg', n: 5 } },
    crab:     { el: 'water', c: 1, a: 1, h: 2, kw: 'g' },
    jelly:    { el: 'water', c: 2, a: 2, h: 2, kw: 'h' },
    knight:   { el: 'water', c: 3, a: 2, h: 3, kw: 'gh' },
    serpent:  { el: 'water', c: 5, a: 5, h: 6 },
    kraken:   { el: 'water', c: 6, a: 5, h: 6, kw: 'g' },
    wave:     { el: 'water', c: 4, sp: { k: 'aoe', n: 2 } },
    owlet:    { el: 'sky', c: 2, a: 1, h: 2, fx: { k: 'draw', n: 1 } },
    eagle:    { el: 'sky', c: 3, a: 3, h: 2, kw: 's' },
    pony:     { el: 'sky', c: 4, a: 4, h: 3, kw: 's' },
    titan:    { el: 'sky', c: 6, a: 6, h: 5, fx: { k: 'dmg', n: 3 } },
    zap:      { el: 'sky', c: 1, sp: { k: 'dmg', n: 2 } },
    wisdom:   { el: 'sky', c: 3, sp: { k: 'draw', n: 2 } },
    bat:      { el: 'shadow', c: 1, a: 1, h: 1, die: { k: 'face', n: 1 } },
    snake:    { el: 'shadow', c: 2, a: 1, h: 2, kw: 'p' },
    cat:      { el: 'shadow', c: 3, a: 3, h: 2, die: { k: 'face', n: 2 } },
    gargoyle: { el: 'shadow', c: 4, a: 3, h: 5, kw: 'g' },
    curse:    { el: 'shadow', c: 4, sp: { k: 'kill' } },
  };
  const IDS = Object.keys(CARDS);
  for (const id of IDS) { const C = CARDS[id]; C.id = id; C.unit = !C.sp; C.kw = C.kw || ''; }
  const parse = s => s.trim().split(/\s+/).flatMap(w => { const [id, n] = w.split('*'); return Array(+(n || 1)).fill(id); });

  // הקלפים שיש מההתחלה; כל ניצחון ראשון על יריב נותן את שני הקלפים שלו (rw)
  const START = ['sprout', 'bunny', 'wolf', 'bear', 'growth', 'dew', 'imp', 'fox', 'lizard', 'crab', 'jelly', 'owlet', 'zap', 'bat'];
  const OPP = [
    { id: 'mossy', art: 'turtle', el: 'forest', hp: 12, ai: 0, err: 0, deck: 'sprout*4 crab*3 bunny*3 wolf*2 jelly*2 bear*2 dew*2 knight*2', rw: ['oak', 'knight'] },
    { id: 'sparky', art: 'imp', el: 'fire', hp: 15, ai: 0, err: 0, deck: 'imp*4 fox*3 bat*2 lizard*2 fireball*1 wolf*2 phoenix*1 bunny*3 sprout*2', rw: ['fireball', 'phoenix'] },
    { id: 'pinch', art: 'crab', el: 'water', hp: 15, ai: 1, err: 0.55, deck: 'crab*3 jelly*3 knight*2 serpent*1 kraken*1 wave*1 owlet*2 sprout*3 bear*2 dew*2', rw: ['wave', 'kraken'] },
    { id: 'hoot', art: 'owl', el: 'sky', hp: 18, ai: 1, err: 0.2, deck: 'owlet*3 eagle*3 zap*3 wisdom*2 pony*2 fox*2 wolf*2 lizard*2 titan*1', rw: ['eagle', 'wisdom'] },
    { id: 'gravel', art: 'gargoyle', el: 'shadow', hp: 20, ai: 1, err: 0.15, deck: 'gargoyle*2 crab*2 knight*2 oak*1 bear*3 snake*2 wolf*3 growth*2 serpent*1 sprout*2', rw: ['gargoyle', 'snake'] },
    { id: 'shade', art: 'cat', el: 'shadow', hp: 22, ai: 2, err: 0.12, deck: 'bat*3 snake*3 cat*3 curse*2 gargoyle*2 zap*2 lizard*2 eagle*2 phoenix*1', rw: ['cat', 'curse'] },
    { id: 'tempest', art: 'eagle', el: 'sky', hp: 24, ai: 2, err: 0.1, deck: 'eagle*2 pony*3 titan*2 zap*3 wisdom*1 fox*2 owlet*2 fireball*2 jelly*2 wave*1', rw: ['pony', 'titan'] },
    { id: 'blaze', art: 'dragon', el: 'fire', hp: 28, ai: 2, err: 0, deck: 'dragon*2 phoenix*2 fireball*2 lizard*2 imp*2 fox*2 serpent*1 curse*1 wave*1 titan*1 kraken*1 gargoyle*1 cat*1 eagle*1', rw: ['dragon', 'serpent'] },
  ];
  // חפיסות מוכנות (כל קלף פעמיים). חפיסה נפתחת כשכל הקלפים שלה פתוחים
  const DECKS = [
    { id: 'forest', el: 'forest', ids: 'sprout bunny wolf bear growth zap crab owlet jelly lizard' },
    { id: 'fire', el: 'fire', ids: 'imp fox bunny wolf lizard zap fireball phoenix bat bear' },
    { id: 'water', el: 'water', ids: 'crab jelly knight owlet bear wave kraken dew zap oak' },
    { id: 'sky', el: 'sky', ids: 'eagle wisdom owlet zap fox wolf lizard bunny fireball phoenix' },
    { id: 'shadow', el: 'shadow', ids: 'bat snake cat curse gargoyle imp wolf zap lizard eagle' },
  ];
  for (const D of DECKS) D.list = D.ids.split(' ').flatMap(id => [id, id]);

  // ---------- החוקים (בלי ציור: אותו קוד משמש את המשחק, את המחשב ואת הסימולציות) ----------
  const R = (function () {
    const HERO = 9;
    const ref = (s, i) => s * 10 + i, sideOf = r => (r / 10) | 0, slotOf = r => r % 10, isHero = r => r % 10 === HERO;
    const END = { t: 'end' };
    function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function mkSide(hp, deck) { return { hp, max: hp, mana: 0, mm: 0, deck: deck.slice(), hand: [], b: [null, null, null, null, null], fat: 0 }; }
    function newBattle(o) {
      const rnd = o.rnd || Math.random;
      const B = { t: 0, cur: 0, win: -1, uid: 1, p: [mkSide(o.hp0, o.deck0), mkSide(o.hp1, o.deck1)], ev: [] };
      shuffle(B.p[0].deck, rnd); shuffle(B.p[1].deck, rnd);
      for (let k = 0; k < 3; k++) { draw(B, 0); draw(B, 1); }
      startTurn(B);
      return B;
    }
    function clone(B) {
      return {
        t: B.t, cur: B.cur, win: B.win, uid: B.uid, ev: [],
        p: B.p.map(P => ({ hp: P.hp, max: P.max, mana: P.mana, mm: P.mm, deck: P.deck.slice(), hand: P.hand.map(c => ({ u: c.u, id: c.id })), b: P.b.map(u => (u ? Object.assign({}, u) : null)), fat: P.fat })),
      };
    }
    function draw(B, s) {
      const P = B.p[s];
      if (!P.deck.length) { P.fat++; P.hp -= P.fat; B.ev.push({ e: 'fat', s, n: P.fat }); return; }
      const id = P.deck.pop();
      if (P.hand.length >= MAXH) { B.ev.push({ e: 'burn', s, id }); return; }
      const c = { u: B.uid++, id };
      P.hand.push(c);
      B.ev.push({ e: 'draw', s, u: c.u, id });
    }
    function checkWin(B) {
      if (B.win >= 0) return;
      const d0 = B.p[0].hp <= 0, d1 = B.p[1].hp <= 0;
      if (d0 && d1) B.win = 2; else if (d0) B.win = 1; else if (d1) B.win = 0;
      else if (B.t > TURN_CAP) B.win = B.p[0].hp > B.p[1].hp ? 0 : B.p[1].hp > B.p[0].hp ? 1 : 2;
      if (B.win >= 0) B.ev.push({ e: 'win', w: B.win });
    }
    function startTurn(B) {
      const s = B.cur, P = B.p[s];
      if (s === 0) B.t++;
      P.mm = Math.min(MAXM, P.mm + 1); P.mana = P.mm;
      for (const u of P.b) if (u) { u.sick = false; u.done = false; }
      B.ev.push({ e: 'turn', s });
      draw(B, s);
      checkWin(B);
    }
    function endTurn(B) { if (B.win >= 0) return; B.cur = 1 - B.cur; startTurn(B); }
    function hurtUnit(B, s, i, n, poison) {
      const u = B.p[s].b[i];
      if (!u || n <= 0) return;
      if (u.sh) { u.sh = false; B.ev.push({ e: 'pop', r: ref(s, i) }); return; }
      u.hp -= n;
      B.ev.push({ e: 'dmg', r: ref(s, i), n });
      if (poison && u.hp > 0) { u.hp = 0; B.ev.push({ e: 'poison', r: ref(s, i) }); }
    }
    function hurtHero(B, s, n) { if (n <= 0) return; B.p[s].hp -= n; B.ev.push({ e: 'dmg', r: ref(s, HERO), n }); }
    function hurt(B, r, n, poison) { if (isHero(r)) hurtHero(B, sideOf(r), n); else hurtUnit(B, sideOf(r), slotOf(r), n, poison); }
    function heal(B, s, n) { const P = B.p[s], k = Math.max(0, Math.min(n, P.max - P.hp)); P.hp += k; B.ev.push({ e: 'heal', r: ref(s, HERO), n: k }); }
    // מסלקים יצורים מתים (קודם של מי שתורו), ואז מה שקורה כשהם מתים
    function resolve(B) {
      for (let pass = 0; pass < 6; pass++) {
        const dead = [];
        for (const s of [B.cur, 1 - B.cur]) B.p[s].b.forEach((u, i) => { if (u && u.hp <= 0) dead.push([s, i, u]); });
        if (!dead.length) break;
        for (const [s, i, u] of dead) { B.p[s].b[i] = null; B.ev.push({ e: 'die', r: ref(s, i), u: Object.assign({}, u) }); }
        for (const [s, , u] of dead) { const d = CARDS[u.id].die; if (d && d.k === 'face') hurtHero(B, 1 - s, d.n); }
      }
      checkWin(B);
    }
    const needsTg = e => !!e && (e.k === 'dmg' || e.k === 'kill' || e.k === 'buff');
    function fxTargets(B, s, e) {
      const o = 1 - s, out = [];
      if (e.k === 'dmg' || e.k === 'kill') { for (let i = 0; i < MAXB; i++) if (B.p[o].b[i]) out.push(ref(o, i)); if (e.k === 'dmg') out.push(ref(o, HERO)); }
      else if (e.k === 'buff') for (let i = 0; i < MAXB; i++) if (B.p[s].b[i]) out.push(ref(s, i));
      return out;
    }
    const canAtk = u => !!u && !u.done && (!u.sick || u.sw) && u.atk > 0;
    function atkTargets(B, s) {
      const o = 1 - s, ob = B.p[o].b, out = [];
      for (let i = 0; i < MAXB; i++) if (ob[i] && ob[i].g) out.push(ref(o, i));
      if (out.length) return out;
      for (let i = 0; i < MAXB; i++) if (ob[i]) out.push(ref(o, i));
      out.push(ref(o, HERO));
      return out;
    }
    function freeSlot(P) { for (const i of SLOT_ORDER) if (!P.b[i]) return i; return -1; }
    function legal(B) {
      const s = B.cur, P = B.p[s], out = [];
      if (B.win >= 0) return out;
      const slot = freeSlot(P);
      for (let hi = 0; hi < P.hand.length; hi++) {
        const C = CARDS[P.hand[hi].id];
        if (C.c > P.mana) continue;
        if (C.unit) {
          if (slot < 0) continue;
          if (needsTg(C.fx)) for (const tg of fxTargets(B, s, C.fx)) out.push({ t: 'play', hi, slot, tg });
          else out.push({ t: 'play', hi, slot, tg: -1 });
        } else if (needsTg(C.sp)) { for (const tg of fxTargets(B, s, C.sp)) out.push({ t: 'play', hi, slot: -1, tg }); }
        else out.push({ t: 'play', hi, slot: -1, tg: -1 });
      }
      for (let i = 0; i < MAXB; i++) if (canAtk(P.b[i])) for (const tg of atkTargets(B, s)) out.push({ t: 'atk', i, tg });
      return out;
    }
    // שלבים נפרדים, כדי שהמשחק יוכל להציג אנימציה בין לבין
    function pay(B, hi) { const s = B.cur, P = B.p[s], c = P.hand.splice(hi, 1)[0]; P.mana -= CARDS[c.id].c; B.ev.push({ e: 'pay', s, u: c.u, id: c.id }); return c; }
    function summon(B, s, slot, c) {
      const C = CARDS[c.id], kw = C.kw;
      const u = { u: c.u, id: c.id, atk: C.a, hp: C.h, max: C.h, g: kw.includes('g'), sw: kw.includes('s'), sh: kw.includes('h'), po: kw.includes('p'), sick: true, done: false };
      B.p[s].b[slot] = u;
      B.ev.push({ e: 'sum', r: ref(s, slot), u: c.u, id: c.id });
      return u;
    }
    function effect(B, s, e, tg) {
      const o = 1 - s;
      if (e.k === 'dmg') hurt(B, tg, e.n, false);
      else if (e.k === 'aoe') { for (let i = 0; i < MAXB; i++) if (B.p[o].b[i]) hurtUnit(B, o, i, e.n, false); }
      else if (e.k === 'draw') { for (let k = 0; k < e.n; k++) draw(B, s); }
      else if (e.k === 'heal') heal(B, s, e.n);
      else if (e.k === 'buff') { const u = B.p[sideOf(tg)].b[slotOf(tg)]; if (u) { u.atk += e.a; u.hp += e.h; u.max += e.h; B.ev.push({ e: 'buff', r: tg, a: e.a, h: e.h }); } }
      else if (e.k === 'kill') { const u = B.p[sideOf(tg)].b[slotOf(tg)]; if (u) { u.hp = 0; B.ev.push({ e: 'kill', r: tg }); } }
    }
    function canPlay(B, hi, slot, tg) {
      const s = B.cur, P = B.p[s], c = P.hand[hi];
      if (B.win >= 0 || !c) return false;
      const C = CARDS[c.id];
      if (C.c > P.mana) return false;
      if (C.unit) { if (!(slot >= 0 && slot < MAXB) || P.b[slot]) return false; return needsTg(C.fx) ? fxTargets(B, s, C.fx).includes(tg) : true; }
      return needsTg(C.sp) ? fxTargets(B, s, C.sp).includes(tg) : true;
    }
    function canAttack(B, i, tg) { const s = B.cur; return B.win < 0 && canAtk(B.p[s].b[i]) && atkTargets(B, s).includes(tg); }
    function play(B, a) {
      const s = B.cur, c = pay(B, a.hi), C = CARDS[c.id];
      if (C.unit) { summon(B, s, a.slot, c); if (C.fx) effect(B, s, C.fx, a.tg); }
      else effect(B, s, C.sp, a.tg);
      resolve(B);
    }
    function attack(B, i, tg) {
      const s = B.cur, o = 1 - s, u = B.p[s].b[i];
      u.done = true;
      B.ev.push({ e: 'atk', r: ref(s, i), tg });
      if (isHero(tg)) hurtHero(B, o, u.atk);
      else {
        const d = B.p[o].b[slotOf(tg)], ua = u.atk, da = d.atk, up = u.po, dp = d.po;
        hurtUnit(B, o, slotOf(tg), ua, up);
        hurtUnit(B, s, i, da, dp);
      }
      resolve(B);
    }
    function apply(B, a) {
      B.ev = [];
      if (a.t === 'play') play(B, a);
      else if (a.t === 'atk') attack(B, a.i, a.tg);
      else endTurn(B);
      return B.ev;
    }

    // ---------- המחשב: 0 קל (כמעט אקראי), 1 בינוני (כללים פשוטים), 2 קשה (בודק כל מהלך) ----------
    const uval = u => 1.5 + u.atk * 1.2 + Math.max(0, u.hp) * 0.9 + (u.g ? 1.2 : 0) + (u.sh ? 1 + u.atk * 0.6 : 0) + (u.po ? 2.5 : 0) + (CARDS[u.id].die ? 1.2 : 0);
    const kills = (a, d) => !d.sh && a.atk > 0 && (a.po || a.atk >= d.hp);
    const survives = (a, d) => a.sh || d.atk <= 0 || (!d.po && d.atk < a.hp);
    function ai0(B, rnd) {
      const acts = legal(B);
      if (!acts.length || rnd() < 0.1) return END;
      const plays = acts.filter(a => a.t === 'play'), atks = acts.filter(a => a.t === 'atk');
      const pool = plays.length && (!atks.length || rnd() < 0.65) ? plays : atks;
      const key = a => (a.t === 'play' ? 'h' + a.hi : 'a' + a.i);
      const keys = [...new Set(pool.map(key))];
      const k = keys[Math.floor(rnd() * keys.length)];
      const opts = pool.filter(a => key(a) === k);
      return opts[Math.floor(rnd() * opts.length)];
    }
    function pick1(B, s, list) {
      const P = B.p[s], O = B.p[1 - s], a0 = list[0], C = CARDS[P.hand[a0.hi].id], e = C.unit ? C.fx : C.sp, oh = ref(1 - s, HERO);
      if (!e) return a0;
      if (e.k === 'dmg') {
        let best = null, bv = -1;
        for (const a of list) { if (a.tg === oh) continue; const d = O.b[slotOf(a.tg)]; if (!d.sh && d.hp <= e.n && uval(d) > bv) { bv = uval(d); best = a; } }
        if (best) return best;
        if (C.unit) return list.find(a => a.tg === oh) || a0;
        if (O.hp <= e.n + 2) return list.find(a => a.tg === oh);
        if (e.n >= 4) { let bu = null, bh = -1; for (const a of list) if (a.tg !== oh) { const d = O.b[slotOf(a.tg)]; if (uval(d) > bh) { bh = uval(d); bu = a; } } if (bu && bh >= 8) return bu; }
        return null;
      }
      if (e.k === 'kill') { let best = null, bv = 0; for (const a of list) { const d = O.b[slotOf(a.tg)]; if (uval(d) > bv) { bv = uval(d); best = a; } } return bv >= 8 ? best : null; }
      if (e.k === 'buff') { let best = null, bv = -1; for (const a of list) { const u = P.b[slotOf(a.tg)]; const v = u.atk + u.hp + (u.g ? 2 : 0); if (v > bv) { bv = v; best = a; } } return best; }
      if (e.k === 'aoe') { let n = 0; for (const d of O.b) if (d) n += !d.sh && d.hp <= e.n ? 2 : 1; return C.unit || n >= 3 ? a0 : null; }
      if (e.k === 'heal') return C.unit || P.hp <= P.max - e.n + 1 ? a0 : null;
      if (e.k === 'draw') return C.unit || P.hand.length <= 4 ? a0 : null;
      return a0;
    }
    function ai1(B) {
      const s = B.cur, P = B.p[s], O = B.p[1 - s], acts = legal(B), oh = ref(1 - s, HERO);
      if (!acts.length) return END;
      const plays = acts.filter(a => a.t === 'play'), atks = acts.filter(a => a.t === 'atk');
      // ניצחון בתור הזה? הכול לגיבור
      if (atks.length && !O.b.some(u => u && u.g)) {
        let dmg = 0; for (const u of P.b) if (canAtk(u)) dmg += u.atk;
        if (dmg >= O.hp) { const a = atks.find(x => x.tg === oh); if (a) return a; }
      }
      for (const a of plays) { const C = CARDS[P.hand[a.hi].id], e = C.unit ? C.fx : C.sp; if (e && e.k === 'dmg' && a.tg === oh && e.n >= O.hp) return a; }
      // קלפים: היקר ביותר קודם
      const byCard = new Map();
      for (const a of plays) { if (!byCard.has(a.hi)) byCard.set(a.hi, []); byCard.get(a.hi).push(a); }
      const rank = hi => { const C = CARDS[P.hand[hi].id]; return C.c + (C.unit ? 0.5 : 0); };
      for (const hi of [...byCard.keys()].sort((x, y) => rank(y) - rank(x))) { const a = pick1(B, s, byCard.get(hi)); if (a) return a; }
      // התקפות: החזק קודם; החלפה טובה אם יש, אחרת לגיבור
      if (atks.length) {
        const ids = [...new Set(atks.map(a => a.i))].sort((x, y) => P.b[y].atk - P.b[x].atk);
        const i = ids[0], u = P.b[i], tgs = atks.filter(a => a.i === i).map(a => a.tg);
        if (!tgs.includes(oh)) {
          const gs = tgs.map(tg => O.b[slotOf(tg)] && [tg, O.b[slotOf(tg)]]).filter(Boolean);
          gs.sort((x, y) => (kills(u, y[1]) - kills(u, x[1])) || (x[1].hp - y[1].hp));
          return { t: 'atk', i, tg: gs[0][0] };
        }
        let best = oh, bs = 0;
        for (const tg of tgs) {
          if (tg === oh) continue;
          const d = O.b[slotOf(tg)];
          if (!kills(u, d)) continue;
          const sc = survives(u, d) ? uval(d) + 1 : uval(d) - uval(u);
          if (sc > bs) { bs = sc; best = tg; }
        }
        return { t: 'atk', i, tg: best };
      }
      return END;
    }
    const hv = hp => hp + Math.min(0, hp - 10) * 0.7;
    function evalB(B, me) {
      if (B.win === me) return 1e5;
      if (B.win === 1 - me) return -1e5;
      if (B.win === 2) return -4e4;
      const A = B.p[me], O = B.p[1 - me];
      let v = hv(A.hp) - hv(O.hp) * 1.15;
      for (const u of A.b) if (u) v += uval(u);
      for (const u of O.b) if (u) v -= uval(u) * 1.1;
      for (const c of A.hand) v += 1 + 0.35 * CARDS[c.id].c;
      v -= O.hand.length * 1.6;
      return v;
    }
    function ai2(B, rnd) {
      const s = B.cur, P = B.p[s], acts = legal(B);
      if (!acts.length) return END;
      const base = evalB(B, s);
      const bestPlay = new Map();
      let atkBest = null, atkD = 0.15;
      for (const a of acts) {
        const C = clone(B); apply(C, a);
        if (C.win === s) return a;
        const d = evalB(C, s) - base + (rnd() - 0.5) * 0.05;
        if (a.t === 'play') { const cur = bestPlay.get(a.hi); if (!cur || d > cur.d) bestPlay.set(a.hi, { a, d }); }
        else if (d > atkD) { atkD = d; atkBest = a; }
      }
      // אילו קלפים לשחק עם המאנה שיש (הכי הרבה ערך ביחד)
      const items = [...bestPlay.values()].filter(x => x.d > 0.15);
      let set = 0, sum = 0;
      for (let m = 1; m < 1 << items.length; m++) {
        let c = 0, v = 0;
        for (let k = 0; k < items.length; k++) if (m & (1 << k)) { c += CARDS[P.hand[items[k].a.hi].id].c; v += items[k].d; }
        if (c <= P.mana && v > sum) { sum = v; set = m; }
      }
      let play = null, playD = 0;
      for (let k = 0; k < items.length; k++) if (set & (1 << k) && items[k].d > playD) { playD = items[k].d; play = items[k].a; }
      if (play && (!atkBest || playD >= atkD)) return play;
      return atkBest || END;
    }
    const AIS = [ai0, ai1, ai2];
    function aiAction(B, lvl, rnd, err) { rnd = rnd || Math.random; return err && rnd() < err ? ai0(B, rnd) : AIS[lvl](B, rnd); }
    function simulate(o) {
      const rnd = o.rnd || Math.random;
      const B = newBattle(Object.assign({}, o, { rnd }));
      let n = 0;
      while (B.win < 0 && n < 4000) { apply(B, B.cur === 0 ? aiAction(B, o.lv0, rnd, o.err0) : aiAction(B, o.lv1, rnd, o.err1)); n++; }
      return { win: B.win, turns: B.t, acts: n, hp0: B.p[0].hp, hp1: B.p[1].hp };
    }
    return { HERO, ref, sideOf, slotOf, isHero, newBattle, clone, legal, apply, pay, summon, effect, resolve, endTurn, canPlay, canAttack, canAtk, atkTargets, fxTargets, needsTg, freeSlot, aiAction, evalB, uval, simulate, END };
  })();

  // ---------- טקסטים: 8 שפות ----------
  const DK = ['forest', 'fire', 'water', 'sky', 'shadow', 'mine'];
  const TEXT = {
    he: {
      title: 'קלפי קרב',
      help: ['גרור קלף ללוח כדי לשחק אותו. כל קלף עולה מאנה, ובכל תור יש לך יותר', 'גרור יצור שלך אל יצור של האויב או אל הגיבור שלו כדי לתקוף', 'הורד את חיי הגיבור של האויב לאפס — וניצחת!', 'נצח 8 יריבים, קבל את הקלפים שלהם ובנה חפיסה משלך'],
      helpTouch: ['הקש על קלף ואז על הלוח כדי לשחק אותו. כל קלף עולה מאנה', 'הקש על יצור שלך ואז על יעד כדי לתקוף', 'הורד את חיי הגיבור של האויב לאפס — וניצחת!', 'נצח 8 יריבים, קבל את הקלפים שלהם ובנה חפיסה משלך'],
      turn: 'תור', endTurn: 'סיים תור', enemyTurn: 'תור האויב', yourTurn: 'התור שלך!', noMana: 'אין מספיק מאנה', boardFull: 'הלוח שלך מלא', sleepy: 'הוא יוכל לתקוף בתור הבא', attacked: 'הוא כבר תקף בתור הזה', mustGuard: 'קודם תקוף את השומר!', pickTarget: 'בחר יעד', handFull: 'היד מלאה!', fatigue: 'נגמרו הקלפים! נזק {n}',
      battleOf: 'קרב {n} מתוך {m}', reward: 'נצח וקבל:', beaten: 'ניצחת אותו!', yourDeck: 'החפיסה שלך', fight: 'לקרב!', edit: 'ערוך חפיסה', nCards: '{n} קלפים', unlockAt: 'נצח את {name}',
      auto: 'מלא לבד', clear: 'נקה', done: 'סיום', maxCopies: 'עד 2 מכל קלף', deckFull: 'החפיסה מלאה (20)', filled: 'הוספנו {n} קלפים כדי להשלים את החפיסה',
      victory: 'ניצחון!', defeat: 'הפסד', newCards: 'קלפים חדשים!', newDeck: 'חפיסה חדשה: {name}!', gotCards: 'קיבלת קלפים חדשים: {a} ו{b}', haveCards: 'כבר יש לך את הקלפים של היריב הזה', champion: 'ניצחת את כל היריבים!',
      tip1: 'טיפ: יצורים עם "שומר" מגינים על הגיבור שלך', tip2: 'טיפ: נסה חפיסה אחרת או ערוך את החפיסה שלך', tip3: 'טיפ: לפעמים עדיף להשמיד את יצורי האויב לפני שתוקפים את הגיבור',
      kw_g: 'שומר', kw_s: 'זריז', kw_h: 'מגן', kw_p: 'רעל',
      tip_g: 'שומר: האויב חייב לתקוף אותו קודם', tip_s: 'זריז: יכול לתקוף מיד', tip_h: 'מגן: חוסם את הנזק הראשון', tip_p: 'רעל: משמיד כל יצור שהוא פוגע בו',
      fx_dmg: 'כשנכנס ללוח: {n} נזק לאויב', fx_aoe: 'כשנכנס ללוח: {n} נזק לכל יצורי האויב', fx_draw: 'כשנכנס ללוח: שלוף קלף', fx_heal: 'כשנכנס ללוח: רפא {n} לגיבור שלך', die_face: 'כשהוא מת: {n} נזק לגיבור האויב',
      sp_dmg: 'גרום {n} נזק לאויב', sp_aoe: 'גרום {n} נזק לכל יצורי האויב', sp_heal: 'רפא {n} חיים לגיבור שלך', sp_buff: 'תן ליצור שלך +{a}/+{h}', sp_draw: 'שלוף {n} קלפים', sp_kill: 'השמד יצור של האויב',
      tut1: 'גרור קלף אל הלוח שלך', tut1t: 'הקש על קלף ואז על הלוח שלך', tut2: 'גרור את היצור שלך אל האויב כדי לתקוף', tut2t: 'הקש על היצור שלך ואז על האויב', tut3: 'אין עוד מהלכים — לחץ "סיים תור"',
    },
    en: {
      title: 'Card Battle',
      help: ['Drag a card onto the board to play it. Each card costs mana, and you get more every turn', 'Drag your creature onto an enemy creature or hero to attack', 'Bring the enemy hero down to 0 health and you win!', 'Beat 8 opponents, win their cards and build your own deck'],
      helpTouch: ['Tap a card, then tap the board to play it. Each card costs mana', 'Tap your creature, then tap a target to attack', 'Bring the enemy hero down to 0 health and you win!', 'Beat 8 opponents, win their cards and build your own deck'],
      turn: 'Turn', endTurn: 'End turn', enemyTurn: 'Enemy turn', yourTurn: 'Your turn!', noMana: 'Not enough mana', boardFull: 'Your board is full', sleepy: 'It can attack next turn', attacked: 'It already attacked this turn', mustGuard: 'Attack the Guard first!', pickTarget: 'Choose a target', handFull: 'Your hand is full!', fatigue: 'Out of cards! {n} damage',
      battleOf: 'Battle {n} of {m}', reward: 'Win to get:', beaten: 'Beaten!', yourDeck: 'Your deck', fight: 'Fight!', edit: 'Edit deck', nCards: '{n} cards', unlockAt: 'Beat {name}',
      auto: 'Auto-fill', clear: 'Clear', done: 'Done', maxCopies: 'Up to 2 of each card', deckFull: 'Your deck is full (20)', filled: 'Added {n} cards to finish your deck',
      victory: 'Victory!', defeat: 'Defeat', newCards: 'New cards!', newDeck: 'New deck: {name}!', gotCards: 'New cards: {a} and {b}', haveCards: "You already have this opponent's cards", champion: 'You beat every opponent!',
      tip1: 'Tip: creatures with Guard protect your hero', tip2: 'Tip: try another deck, or edit your own', tip3: "Tip: sometimes it's better to destroy enemy creatures before hitting the hero",
      kw_g: 'Guard', kw_s: 'Swift', kw_h: 'Shield', kw_p: 'Poison',
      tip_g: 'Guard: enemies must attack it first', tip_s: 'Swift: can attack right away', tip_h: 'Shield: blocks the first damage', tip_p: 'Poison: destroys any creature it damages',
      fx_dmg: 'On play: deal {n} damage to an enemy', fx_aoe: 'On play: deal {n} damage to all enemy creatures', fx_draw: 'On play: draw a card', fx_heal: 'On play: restore {n} health to your hero', die_face: 'When it dies: deal {n} damage to the enemy hero',
      sp_dmg: 'Deal {n} damage to an enemy', sp_aoe: 'Deal {n} damage to all enemy creatures', sp_heal: 'Restore {n} health to your hero', sp_buff: 'Give your creature +{a}/+{h}', sp_draw: 'Draw {n} cards', sp_kill: 'Destroy an enemy creature',
      tut1: 'Drag a card onto your board', tut1t: 'Tap a card, then tap your board', tut2: 'Drag your creature onto the enemy to attack', tut2t: 'Tap your creature, then tap the enemy', tut3: 'No more moves — press "End turn"',
    },
    ar: {
      title: 'معركة البطاقات',
      help: ['اسحب بطاقة إلى اللوح لتلعبها. كل بطاقة تكلّف مانا، وتحصل على المزيد كل دور', 'اسحب مخلوقك إلى مخلوق للعدو أو إلى بطله لتهاجم', 'أوصل صحة بطل العدو إلى صفر لتفوز!', 'اهزم 8 خصوم، واربح بطاقاتهم، وابنِ مجموعتك الخاصة'],
      helpTouch: ['المس بطاقة ثم المس اللوح لتلعبها. كل بطاقة تكلّف مانا', 'المس مخلوقك ثم المس هدفاً لتهاجم', 'أوصل صحة بطل العدو إلى صفر لتفوز!', 'اهزم 8 خصوم، واربح بطاقاتهم، وابنِ مجموعتك الخاصة'],
      turn: 'الدور', endTurn: 'إنهاء الدور', enemyTurn: 'دور العدو', yourTurn: 'دورك!', noMana: 'لا تكفي المانا', boardFull: 'لوحك ممتلئ', sleepy: 'يستطيع الهجوم في الدور القادم', attacked: 'هاجم بالفعل في هذا الدور', mustGuard: 'هاجم الحارس أولاً!', pickTarget: 'اختر هدفاً', handFull: 'يدك ممتلئة!', fatigue: 'نفدت البطاقات! ضرر {n}',
      battleOf: 'المعركة {n} من {m}', reward: 'افز لتحصل على:', beaten: 'هزمته!', yourDeck: 'مجموعتك', fight: 'إلى المعركة!', edit: 'عدّل المجموعة', nCards: '{n} بطاقة', unlockAt: 'اهزم {name}',
      auto: 'املأ تلقائياً', clear: 'امسح', done: 'تم', maxCopies: 'حتى نسختين من كل بطاقة', deckFull: 'مجموعتك ممتلئة (20)', filled: 'أضفنا {n} بطاقة لإكمال مجموعتك',
      victory: 'انتصار!', defeat: 'هزيمة', newCards: 'بطاقات جديدة!', newDeck: 'مجموعة جديدة: {name}!', gotCards: 'بطاقات جديدة: {a} و{b}', haveCards: 'لديك بطاقات هذا الخصم بالفعل', champion: 'هزمت كل الخصوم!',
      tip1: 'نصيحة: المخلوقات الحارسة تحمي بطلك', tip2: 'نصيحة: جرّب مجموعة أخرى أو عدّل مجموعتك', tip3: 'نصيحة: أحياناً من الأفضل تدمير مخلوقات العدو قبل مهاجمة البطل',
      kw_g: 'حارس', kw_s: 'سريع', kw_h: 'درع', kw_p: 'سُم',
      tip_g: 'حارس: على العدو أن يهاجمه أولاً', tip_s: 'سريع: يستطيع الهجوم فوراً', tip_h: 'درع: يصدّ الضرر الأول', tip_p: 'سُم: يدمّر أي مخلوق يصيبه',
      fx_dmg: 'عند اللعب: ضرر {n} لعدو', fx_aoe: 'عند اللعب: ضرر {n} لكل مخلوقات العدو', fx_draw: 'عند اللعب: اسحب بطاقة', fx_heal: 'عند اللعب: يعالج بطلك {n}', die_face: 'عند موته: ضرر {n} لبطل العدو',
      sp_dmg: 'ضرر {n} لعدو', sp_aoe: 'ضرر {n} لكل مخلوقات العدو', sp_heal: 'عالج بطلك {n}', sp_buff: 'امنح مخلوقك +{a}/+{h}', sp_draw: 'اسحب {n} بطاقات', sp_kill: 'دمّر مخلوقاً للعدو',
      tut1: 'اسحب بطاقة إلى لوحك', tut1t: 'المس بطاقة ثم المس لوحك', tut2: 'اسحب مخلوقك إلى العدو لتهاجم', tut2t: 'المس مخلوقك ثم المس العدو', tut3: 'لا حركات أخرى — اضغط "إنهاء الدور"',
    },
    es: {
      title: 'Batalla de Cartas',
      help: ['Arrastra una carta al tablero para jugarla. Cada carta cuesta maná, y cada turno tienes más', 'Arrastra tu criatura sobre una criatura o el héroe enemigo para atacar', '¡Deja al héroe enemigo sin vida y ganas!', 'Vence a 8 rivales, gana sus cartas y arma tu propio mazo'],
      helpTouch: ['Toca una carta y luego el tablero para jugarla. Cada carta cuesta maná', 'Toca tu criatura y luego un objetivo para atacar', '¡Deja al héroe enemigo sin vida y ganas!', 'Vence a 8 rivales, gana sus cartas y arma tu propio mazo'],
      turn: 'Turno', endTurn: 'Fin del turno', enemyTurn: 'Turno rival', yourTurn: '¡Tu turno!', noMana: 'No tienes suficiente maná', boardFull: 'Tu tablero está lleno', sleepy: 'Podrá atacar en el próximo turno', attacked: 'Ya atacó en este turno', mustGuard: '¡Ataca primero al Guardián!', pickTarget: 'Elige un objetivo', handFull: '¡Tu mano está llena!', fatigue: '¡Sin cartas! {n} de daño',
      battleOf: 'Batalla {n} de {m}', reward: 'Gana y consigue:', beaten: '¡Vencido!', yourDeck: 'Tu mazo', fight: '¡A luchar!', edit: 'Editar mazo', nCards: '{n} cartas', unlockAt: 'Vence a {name}',
      auto: 'Autocompletar', clear: 'Vaciar', done: 'Listo', maxCopies: 'Hasta 2 de cada carta', deckFull: 'Tu mazo está lleno (20)', filled: 'Añadimos {n} cartas para completar tu mazo',
      victory: '¡Victoria!', defeat: 'Derrota', newCards: '¡Cartas nuevas!', newDeck: '¡Mazo nuevo: {name}!', gotCards: 'Cartas nuevas: {a} y {b}', haveCards: 'Ya tienes las cartas de este rival', champion: '¡Venciste a todos los rivales!',
      tip1: 'Consejo: las criaturas con Guardián protegen a tu héroe', tip2: 'Consejo: prueba otro mazo o edita el tuyo', tip3: 'Consejo: a veces conviene destruir las criaturas enemigas antes de atacar al héroe',
      kw_g: 'Guardián', kw_s: 'Veloz', kw_h: 'Escudo', kw_p: 'Veneno',
      tip_g: 'Guardián: el enemigo debe atacarlo primero', tip_s: 'Veloz: puede atacar enseguida', tip_h: 'Escudo: bloquea el primer daño', tip_p: 'Veneno: destruye a cualquier criatura que dañe',
      fx_dmg: 'Al jugarla: {n} de daño a un enemigo', fx_aoe: 'Al jugarla: {n} de daño a todas las criaturas enemigas', fx_draw: 'Al jugarla: roba una carta', fx_heal: 'Al jugarla: cura {n} a tu héroe', die_face: 'Al morir: {n} de daño al héroe enemigo',
      sp_dmg: '{n} de daño a un enemigo', sp_aoe: '{n} de daño a todas las criaturas enemigas', sp_heal: 'Cura {n} a tu héroe', sp_buff: 'Da +{a}/+{h} a tu criatura', sp_draw: 'Roba {n} cartas', sp_kill: 'Destruye una criatura enemiga',
      tut1: 'Arrastra una carta a tu tablero', tut1t: 'Toca una carta y luego tu tablero', tut2: 'Arrastra tu criatura sobre el enemigo para atacar', tut2t: 'Toca tu criatura y luego al enemigo', tut3: 'No quedan jugadas: pulsa «Fin del turno»',
    },
    fr: {
      title: 'Bataille de Cartes',
      help: ['Glisse une carte sur le plateau pour la jouer. Chaque carte coûte du mana, et tu en as plus à chaque tour', 'Glisse ta créature sur une créature ou le héros ennemi pour attaquer', 'Fais tomber le héros ennemi à 0 et tu gagnes !', 'Bats 8 adversaires, gagne leurs cartes et construis ton deck'],
      helpTouch: ['Touche une carte puis le plateau pour la jouer. Chaque carte coûte du mana', 'Touche ta créature puis une cible pour attaquer', 'Fais tomber le héros ennemi à 0 et tu gagnes !', 'Bats 8 adversaires, gagne leurs cartes et construis ton deck'],
      turn: 'Tour', endTurn: 'Fin du tour', enemyTurn: 'Tour ennemi', yourTurn: 'À toi de jouer !', noMana: 'Pas assez de mana', boardFull: 'Ton plateau est plein', sleepy: 'Elle pourra attaquer au prochain tour', attacked: 'Elle a déjà attaqué ce tour-ci', mustGuard: "Attaque d'abord le Gardien !", pickTarget: 'Choisis une cible', handFull: 'Ta main est pleine !', fatigue: 'Plus de cartes ! {n} dégâts',
      battleOf: 'Combat {n} sur {m}', reward: 'Gagne et obtiens :', beaten: 'Battu !', yourDeck: 'Ton deck', fight: 'Au combat !', edit: 'Modifier le deck', nCards: '{n} cartes', unlockAt: 'Bats {name}',
      auto: 'Remplir', clear: 'Vider', done: 'Terminé', maxCopies: "Jusqu'à 2 exemplaires par carte", deckFull: 'Ton deck est plein (20)', filled: 'On a ajouté {n} cartes pour compléter ton deck',
      victory: 'Victoire !', defeat: 'Défaite', newCards: 'Nouvelles cartes !', newDeck: 'Nouveau deck : {name} !', gotCards: 'Nouvelles cartes : {a} et {b}', haveCards: 'Tu as déjà les cartes de cet adversaire', champion: 'Tu as battu tous les adversaires !',
      tip1: 'Astuce : les créatures Gardien protègent ton héros', tip2: 'Astuce : essaie un autre deck ou modifie le tien', tip3: 'Astuce : il vaut parfois mieux détruire les créatures ennemies avant de frapper le héros',
      kw_g: 'Gardien', kw_s: 'Rapide', kw_h: 'Bouclier', kw_p: 'Poison',
      tip_g: "Gardien : l'ennemi doit l'attaquer en premier", tip_s: 'Rapide : peut attaquer tout de suite', tip_h: 'Bouclier : bloque les premiers dégâts', tip_p: 'Poison : détruit toute créature qu’il blesse',
      fx_dmg: 'En jeu : {n} dégâts à un ennemi', fx_aoe: 'En jeu : {n} dégâts à toutes les créatures ennemies', fx_draw: 'En jeu : pioche une carte', fx_heal: 'En jeu : rend {n} PV à ton héros', die_face: 'À sa mort : {n} dégâts au héros ennemi',
      sp_dmg: '{n} dégâts à un ennemi', sp_aoe: '{n} dégâts à toutes les créatures ennemies', sp_heal: 'Rend {n} PV à ton héros', sp_buff: 'Donne +{a}/+{h} à ta créature', sp_draw: 'Pioche {n} cartes', sp_kill: 'Détruis une créature ennemie',
      tut1: 'Glisse une carte sur ton plateau', tut1t: 'Touche une carte puis ton plateau', tut2: "Glisse ta créature sur l'ennemi pour attaquer", tut2t: "Touche ta créature puis l'ennemi", tut3: 'Plus de coups possibles : appuie sur « Fin du tour »',
    },
    pt: {
      title: 'Batalha de Cartas',
      help: ['Arraste uma carta para o tabuleiro para jogá-la. Cada carta custa mana, e a cada turno você tem mais', 'Arraste sua criatura até uma criatura ou o herói inimigo para atacar', 'Zere a vida do herói inimigo e você vence!', 'Vença 8 rivais, ganhe as cartas deles e monte seu próprio baralho'],
      helpTouch: ['Toque numa carta e depois no tabuleiro para jogá-la. Cada carta custa mana', 'Toque na sua criatura e depois num alvo para atacar', 'Zere a vida do herói inimigo e você vence!', 'Vença 8 rivais, ganhe as cartas deles e monte seu próprio baralho'],
      turn: 'Turno', endTurn: 'Fim do turno', enemyTurn: 'Turno inimigo', yourTurn: 'Sua vez!', noMana: 'Mana insuficiente', boardFull: 'Seu tabuleiro está cheio', sleepy: 'Ela poderá atacar no próximo turno', attacked: 'Ela já atacou neste turno', mustGuard: 'Ataque o Guardião primeiro!', pickTarget: 'Escolha um alvo', handFull: 'Sua mão está cheia!', fatigue: 'Acabaram as cartas! {n} de dano',
      battleOf: 'Batalha {n} de {m}', reward: 'Vença e ganhe:', beaten: 'Vencido!', yourDeck: 'Seu baralho', fight: 'À luta!', edit: 'Editar baralho', nCards: '{n} cartas', unlockAt: 'Vença {name}',
      auto: 'Completar', clear: 'Limpar', done: 'Pronto', maxCopies: 'Até 2 de cada carta', deckFull: 'Seu baralho está cheio (20)', filled: 'Adicionamos {n} cartas para completar seu baralho',
      victory: 'Vitória!', defeat: 'Derrota', newCards: 'Cartas novas!', newDeck: 'Baralho novo: {name}!', gotCards: 'Cartas novas: {a} e {b}', haveCards: 'Você já tem as cartas deste rival', champion: 'Você venceu todos os rivais!',
      tip1: 'Dica: criaturas com Guardião protegem seu herói', tip2: 'Dica: tente outro baralho ou edite o seu', tip3: 'Dica: às vezes é melhor destruir as criaturas inimigas antes de atacar o herói',
      kw_g: 'Guardião', kw_s: 'Veloz', kw_h: 'Escudo', kw_p: 'Veneno',
      tip_g: 'Guardião: o inimigo precisa atacá-lo primeiro', tip_s: 'Veloz: pode atacar na hora', tip_h: 'Escudo: bloqueia o primeiro dano', tip_p: 'Veneno: destrói qualquer criatura que ferir',
      fx_dmg: 'Ao entrar: {n} de dano a um inimigo', fx_aoe: 'Ao entrar: {n} de dano a todas as criaturas inimigas', fx_draw: 'Ao entrar: compre uma carta', fx_heal: 'Ao entrar: cura {n} do seu herói', die_face: 'Ao morrer: {n} de dano ao herói inimigo',
      sp_dmg: '{n} de dano a um inimigo', sp_aoe: '{n} de dano a todas as criaturas inimigas', sp_heal: 'Cura {n} do seu herói', sp_buff: 'Dá +{a}/+{h} à sua criatura', sp_draw: 'Compre {n} cartas', sp_kill: 'Destrua uma criatura inimiga',
      tut1: 'Arraste uma carta para o seu tabuleiro', tut1t: 'Toque numa carta e depois no seu tabuleiro', tut2: 'Arraste sua criatura até o inimigo para atacar', tut2t: 'Toque na sua criatura e depois no inimigo', tut3: 'Sem mais jogadas: aperte "Fim do turno"',
    },
    ru: {
      title: 'Битва карт',
      help: ['Перетащи карту на поле, чтобы сыграть её. Каждая карта стоит ману, и с каждым ходом её больше', 'Перетащи своё существо на существо или героя врага, чтобы атаковать', 'Доведи здоровье вражеского героя до нуля — и ты победил!', 'Победи 8 соперников, получи их карты и собери свою колоду'],
      helpTouch: ['Коснись карты, а потом поля, чтобы сыграть её. Каждая карта стоит ману', 'Коснись своего существа, а потом цели, чтобы атаковать', 'Доведи здоровье вражеского героя до нуля — и ты победил!', 'Победи 8 соперников, получи их карты и собери свою колоду'],
      turn: 'Ход', endTurn: 'Конец хода', enemyTurn: 'Ход врага', yourTurn: 'Твой ход!', noMana: 'Не хватает маны', boardFull: 'Твоё поле заполнено', sleepy: 'Сможет атаковать в следующем ходу', attacked: 'Уже атаковало в этом ходу', mustGuard: 'Сначала атакуй Стража!', pickTarget: 'Выбери цель', handFull: 'Рука полна!', fatigue: 'Карты кончились! Урон {n}',
      battleOf: 'Битва {n} из {m}', reward: 'Победи и получи:', beaten: 'Побеждён!', yourDeck: 'Твоя колода', fight: 'В бой!', edit: 'Изменить колоду', nCards: 'Карт: {n}', unlockAt: 'Победи: {name}',
      auto: 'Заполнить', clear: 'Очистить', done: 'Готово', maxCopies: 'Не больше 2 одинаковых карт', deckFull: 'Колода заполнена (20)', filled: 'Добавили карт: {n}, чтобы заполнить колоду',
      victory: 'Победа!', defeat: 'Поражение', newCards: 'Новые карты!', newDeck: 'Новая колода: {name}!', gotCards: 'Новые карты: {a} и {b}', haveCards: 'Карты этого соперника у тебя уже есть', champion: 'Ты победил всех соперников!',
      tip1: 'Совет: существа со Стражем защищают твоего героя', tip2: 'Совет: попробуй другую колоду или измени свою', tip3: 'Совет: иногда лучше сначала уничтожить существ врага, а потом бить героя',
      kw_g: 'Страж', kw_s: 'Рывок', kw_h: 'Щит', kw_p: 'Яд',
      tip_g: 'Страж: враг должен атаковать его первым', tip_s: 'Рывок: может атаковать сразу', tip_h: 'Щит: блокирует первый урон', tip_p: 'Яд: уничтожает любое раненое им существо',
      fx_dmg: 'При розыгрыше: {n} урона врагу', fx_aoe: 'При розыгрыше: {n} урона всем существам врага', fx_draw: 'При розыгрыше: возьми карту', fx_heal: 'При розыгрыше: вылечи своего героя на {n}', die_face: 'При гибели: {n} урона вражескому герою',
      sp_dmg: '{n} урона врагу', sp_aoe: '{n} урона всем существам врага', sp_heal: 'Вылечи своего героя на {n}', sp_buff: 'Дай своему существу +{a}/+{h}', sp_draw: 'Возьми {n} карты', sp_kill: 'Уничтожь существо врага',
      tut1: 'Перетащи карту на своё поле', tut1t: 'Коснись карты, а потом своего поля', tut2: 'Перетащи своё существо на врага, чтобы атаковать', tut2t: 'Коснись своего существа, а потом врага', tut3: 'Ходов больше нет — нажми «Конец хода»',
    },
    de: {
      title: 'Kartenkampf',
      help: ['Zieh eine Karte aufs Feld, um sie zu spielen. Jede Karte kostet Mana, und jede Runde hast du mehr', 'Zieh deine Kreatur auf eine gegnerische Kreatur oder den Helden, um anzugreifen', 'Bring den gegnerischen Helden auf 0 Leben und du gewinnst!', 'Besiege 8 Gegner, gewinne ihre Karten und bau dein eigenes Deck'],
      helpTouch: ['Tippe auf eine Karte und dann aufs Feld, um sie zu spielen. Jede Karte kostet Mana', 'Tippe auf deine Kreatur und dann auf ein Ziel, um anzugreifen', 'Bring den gegnerischen Helden auf 0 Leben und du gewinnst!', 'Besiege 8 Gegner, gewinne ihre Karten und bau dein eigenes Deck'],
      turn: 'Runde', endTurn: 'Zug beenden', enemyTurn: 'Gegner ist dran', yourTurn: 'Du bist dran!', noMana: 'Nicht genug Mana', boardFull: 'Dein Feld ist voll', sleepy: 'Sie kann nächste Runde angreifen', attacked: 'Sie hat diese Runde schon angegriffen', mustGuard: 'Greif zuerst den Wächter an!', pickTarget: 'Wähle ein Ziel', handFull: 'Deine Hand ist voll!', fatigue: 'Keine Karten mehr! {n} Schaden',
      battleOf: 'Kampf {n} von {m}', reward: 'Gewinne und erhalte:', beaten: 'Besiegt!', yourDeck: 'Dein Deck', fight: 'Kämpfen!', edit: 'Deck bearbeiten', nCards: '{n} Karten', unlockAt: 'Besiege {name}',
      auto: 'Auffüllen', clear: 'Leeren', done: 'Fertig', maxCopies: 'Höchstens 2 von jeder Karte', deckFull: 'Dein Deck ist voll (20)', filled: '{n} Karten hinzugefügt, um dein Deck zu füllen',
      victory: 'Sieg!', defeat: 'Niederlage', newCards: 'Neue Karten!', newDeck: 'Neues Deck: {name}!', gotCards: 'Neue Karten: {a} und {b}', haveCards: 'Die Karten dieses Gegners hast du schon', champion: 'Du hast alle Gegner besiegt!',
      tip1: 'Tipp: Wächter-Kreaturen schützen deinen Helden', tip2: 'Tipp: Probier ein anderes Deck oder bearbeite deins', tip3: 'Tipp: Manchmal ist es besser, erst die Kreaturen des Gegners zu besiegen',
      kw_g: 'Wächter', kw_s: 'Flink', kw_h: 'Schild', kw_p: 'Gift',
      tip_g: 'Wächter: Der Gegner muss ihn zuerst angreifen', tip_s: 'Flink: Kann sofort angreifen', tip_h: 'Schild: Blockt den ersten Schaden', tip_p: 'Gift: Vernichtet jede Kreatur, die es verletzt',
      fx_dmg: 'Beim Ausspielen: {n} Schaden an einem Gegner', fx_aoe: 'Beim Ausspielen: {n} Schaden an allen Gegner-Kreaturen', fx_draw: 'Beim Ausspielen: Zieh eine Karte', fx_heal: 'Beim Ausspielen: Heilt deinen Helden um {n}', die_face: 'Wenn sie stirbt: {n} Schaden am Gegner-Helden',
      sp_dmg: '{n} Schaden an einem Gegner', sp_aoe: '{n} Schaden an allen Gegner-Kreaturen', sp_heal: 'Heilt deinen Helden um {n}', sp_buff: 'Gib deiner Kreatur +{a}/+{h}', sp_draw: 'Zieh {n} Karten', sp_kill: 'Vernichte eine gegnerische Kreatur',
      tut1: 'Zieh eine Karte auf dein Feld', tut1t: 'Tippe auf eine Karte, dann auf dein Feld', tut2: 'Zieh deine Kreatur auf den Gegner, um anzugreifen', tut2t: 'Tippe auf deine Kreatur, dann auf den Gegner', tut3: 'Keine Züge mehr – drück „Zug beenden“',
    },
  };
  // שמות הקלפים (לפי הסדר של IDS), היריבים, מה שהם אומרים, והחפיסות
  const CNAMES = {
    he: 'נבטון|ארנבון קפצן|זאב הטחב|דוב הקוצים|האלון הזקן|צמיחה פראית|טל מרפא|שדון גחלים|שועל האש|לטאת לבה|עוף החול|דרקון הגחלים|כדור אש|סרטן שריון|מדוזה בועה|אביר סוסון ים|נחש ים|תמנון המעמקים|גל ענק|ינשופון|נשר הסערה|סוסון ענן|ענק הרעם|ברק|חוכמה|עטלף לילה|נחש ארסי|חתול צללים|גרגויל אבן|קללת הירח',
    en: 'Sprout|Hop Bunny|Moss Wolf|Bramble Bear|Old Oak|Wild Growth|Healing Dew|Ember Imp|Fire Fox|Lava Lizard|Phoenix|Ember Dragon|Fireball|Shell Crab|Jelly Puff|Seahorse Knight|Sea Serpent|Deep Kraken|Tidal Wave|Owlet|Storm Eagle|Cloud Pony|Thunder Titan|Zap|Wisdom|Night Bat|Venom Snake|Shadow Cat|Gargoyle|Moon Curse',
    ar: 'البُرعم|الأرنب القافز|ذئب الطحلب|دب الشوك|السنديانة العجوز|نمو بري|ندى الشفاء|عفريت الجمر|ثعلب النار|سحلية الحمم|العنقاء|تنين الجمر|كرة النار|سلطعون الصدفة|قنديل الفقاعة|فارس فرس البحر|ثعبان البحر|أخطبوط الأعماق|موجة عارمة|البومة الصغيرة|نسر العاصفة|مهر الغيمة|عملاق الرعد|صاعقة|الحكمة|خفاش الليل|الأفعى السامة|قط الظلال|الغرغول الحجري|لعنة القمر',
    es: 'Brotecito|Conejo Saltarín|Lobo de Musgo|Oso Zarzal|Roble Anciano|Crecimiento|Rocío Sanador|Diablillo de Brasa|Zorro de Fuego|Lagarto de Lava|Fénix|Dragón de Brasa|Bola de Fuego|Cangrejo Coraza|Medusa Burbuja|Caballito Caballero|Serpiente Marina|Kraken Abisal|Maremoto|Buhíto|Águila Tormenta|Poni Nube|Titán del Trueno|Chispazo|Sabiduría|Murciélago|Serpiente Venenosa|Gato Sombra|Gárgola|Maldición Lunar',
    fr: 'Pousse|Lapin Sauteur|Loup de Mousse|Ours des Ronces|Vieux Chêne|Croissance|Rosée de Soin|Diablotin de Braise|Renard de Feu|Lézard de Lave|Phénix|Dragon de Braise|Boule de Feu|Crabe Carapace|Méduse Bulle|Hippocampe Chevalier|Serpent de Mer|Kraken des Abysses|Raz-de-marée|Petit Hibou|Aigle Tempête|Poney Nuage|Titan du Tonnerre|Éclair|Sagesse|Chauve-souris|Serpent Venimeux|Chat des Ombres|Gargouille|Malédiction Lunaire',
    pt: 'Brotinho|Coelho Saltitante|Lobo de Musgo|Urso Espinhoso|Carvalho Ancião|Crescimento|Orvalho Curativo|Diabrete de Brasa|Raposa de Fogo|Lagarto de Lava|Fênix|Dragão de Brasa|Bola de Fogo|Caranguejo Couraça|Água-viva Bolha|Cavaleiro-marinho|Serpente Marinha|Kraken Abissal|Maremoto|Corujinha|Águia da Tempestade|Pônei Nuvem|Titã do Trovão|Choque|Sabedoria|Morcego Noturno|Cobra Venenosa|Gato Sombrio|Gárgula|Maldição Lunar',
    ru: 'Росток|Прыгучий зайка|Моховой волк|Колючий медведь|Старый дуб|Буйный рост|Целебная роса|Угольный бесёнок|Огненный лис|Лавовая ящерица|Феникс|Угольный дракон|Огненный шар|Панцирный краб|Медуза-пузырь|Конёк-рыцарь|Морской змей|Глубинный кракен|Цунами|Совёнок|Штормовой орёл|Облачный пони|Громовой титан|Разряд|Мудрость|Летучая мышь|Ядовитая змея|Теневой кот|Горгулья|Лунное проклятие',
    de: 'Sprössling|Hüpfhase|Mooswolf|Dornenbär|Alte Eiche|Wildwuchs|Heiltau|Glutkobold|Feuerfuchs|Lavaechse|Phönix|Glutdrache|Feuerball|Panzerkrabbe|Blubberqualle|Seepferd-Ritter|Seeschlange|Tiefseekrake|Flutwelle|Eulchen|Sturmadler|Wolkenpony|Donnertitan|Blitz|Weisheit|Fledermaus|Giftschlange|Schattenkatze|Gargoyle|Mondfluch',
  };
  const ONAMES = {
    he: 'מוסי הצב|ניצוצי השדון|קפטן צבתות|פרופסור הוּ-הוּ|חצץ השומר|צללית החתולה|מלכת הסערה|להט הדרקון',
    en: 'Mossy the Turtle|Sparky the Imp|Captain Pinch|Professor Hoot|Gravel the Guardian|Shade the Cat|Tempest, Storm Queen|Blaze the Dragon',
    ar: 'موسي السلحفاة|شرارة العفريت|القبطان قرصة|البروفيسور هوهو|حصى الحارس|ظلّ القطة|ملكة العاصفة|لهيب التنين',
    es: 'Musgo la Tortuga|Chispas el Diablillo|Capitán Pinza|Profesor Ulu|Grava el Guardián|Sombra la Gata|Tempestad, la Reina|Llama el Dragón',
    fr: 'Mousse la Tortue|Étincelle le Diablotin|Capitaine Pince|Professeur Hou-Hou|Gravier le Gardien|Ombre le Chat|Tempête, la Reine|Brasier le Dragon',
    pt: 'Musgo, a Tartaruga|Faísca, o Diabrete|Capitão Pinça|Professor Uhu|Cascalho, o Guardião|Sombra, a Gata|Tempestade, a Rainha|Labareda, o Dragão',
    ru: 'Черепаха Мох|Бесёнок Искра|Капитан Клешня|Профессор Уху|Страж Гравий|Кошка Тень|Королева Буря|Дракон Пламя',
    de: 'Moosi die Schildkröte|Funki der Kobold|Käpt’n Kneifer|Professor Uhu|Kiesel der Wächter|Schatten die Katze|Sturmkönigin|Lodern der Drache',
  };
  const OSAYS = {
    he: 'לאט לאט... אבל בטוח. זזז...|הי-הי! כל מה שאני נוגע בו מתלקח!|אהוי! הסרטנים שלי אף פעם לא משחררים!|הוּ-הוּ! בוא נראה אם הכנת שיעורי בית|שום דבר לא עובר את חומת האבן שלי|אתה אפילו לא תראה את החתולים שלי מגיעים...|הרגש את הרעם! אני מהירה כמו ברק!|ניצחת את כולם? עכשיו תפגוש את האש!',
    en: 'Slow and steady… zzz…|Hehe! Everything I touch goes up in sparks!|Ahoy! My crabs never let go!|Hoo-hoo! Let’s see if you did your homework.|Nothing gets past my stone wall.|You won’t even see my cats coming…|Feel the thunder! I’m fast as lightning!|You beat them all? Now face the fire!',
    ar: 'ببطء ولكن بثبات… خخخ…|هيهي! كل ما ألمسه يشتعل!|أهوي! سلطعوناتي لا تُفلت أبداً!|هو-هو! لنرَ إن كنت أنجزت واجبك.|لا شيء يعبر جداري الحجري.|لن ترى قططي قادمة حتى…|اشعر بالرعد! أنا سريعة كالبرق!|هزمتهم جميعاً؟ واجه النار الآن!',
    es: 'Lento pero seguro… zzz…|¡Jeje! ¡Todo lo que toco echa chispas!|¡Ahoy! ¡Mis cangrejos nunca sueltan!|¡Uh-uh! A ver si hiciste los deberes.|Nada atraviesa mi muro de piedra.|Ni siquiera verás venir a mis gatos…|¡Siente el trueno! ¡Soy rápida como un rayo!|¿Venciste a todos? ¡Ahora enfrenta el fuego!',
    fr: 'Lentement mais sûrement… zzz…|Héhé ! Tout ce que je touche fait des étincelles !|Ohé ! Mes crabes ne lâchent jamais !|Hou-hou ! Voyons si tu as fait tes devoirs.|Rien ne passe mon mur de pierre.|Tu ne verras même pas mes chats arriver…|Sens le tonnerre ! Je suis rapide comme l’éclair !|Tu les as tous battus ? Affronte le feu !',
    pt: 'Devagar e sempre… zzz…|Hehe! Tudo que eu toco solta faíscas!|Ahoy! Meus caranguejos nunca soltam!|Uhu! Vamos ver se você fez a lição.|Nada passa pela minha muralha de pedra.|Você nem vai ver meus gatos chegando…|Sinta o trovão! Sou rápida como um raio!|Venceu todos? Agora enfrente o fogo!',
    ru: 'Медленно, но верно… хррр…|Хи-хи! Всё, чего я касаюсь, искрит!|Йо-хо! Мои крабы никогда не отпускают!|Уху! Посмотрим, сделал ли ты домашку.|Ничто не пройдёт сквозь мою каменную стену.|Ты даже не увидишь, как подкрадутся мои коты…|Почувствуй гром! Я быстрая, как молния!|Победил всех? Теперь встреться с огнём!',
    de: 'Langsam, aber sicher… zzz…|Hihi! Alles, was ich anfasse, sprüht Funken!|Ahoi! Meine Krabben lassen nie los!|Uhu! Mal sehen, ob du deine Hausaufgaben gemacht hast.|Nichts kommt an meiner Steinmauer vorbei.|Meine Katzen siehst du nicht mal kommen…|Spür den Donner! Ich bin schnell wie der Blitz!|Alle besiegt? Jetzt stell dich dem Feuer!',
  };
  const DNAMES = {
    he: 'חברי היער|זעם האש|חומת הים|סערת השמיים|צללי הלילה|החפיסה שלי',
    en: 'Forest Friends|Fire Fury|Ocean Wall|Sky Storm|Night Shadows|My Deck',
    ar: 'أصدقاء الغابة|غضب النار|سور المحيط|عاصفة السماء|ظلال الليل|مجموعتي',
    es: 'Amigos del Bosque|Furia de Fuego|Muro Oceánico|Tormenta Celeste|Sombras Nocturnas|Mi Mazo',
    fr: 'Amis de la Forêt|Furie de Feu|Mur de l’Océan|Tempête Céleste|Ombres de la Nuit|Mon Deck',
    pt: 'Amigos da Floresta|Fúria de Fogo|Muralha do Oceano|Tempestade Celeste|Sombras da Noite|Meu Baralho',
    ru: 'Лесные друзья|Ярость огня|Стена океана|Небесная буря|Ночные тени|Моя колода',
    de: 'Waldfreunde|Feuerwut|Ozeanmauer|Himmelssturm|Nachtschatten|Mein Deck',
  };
  for (const L of Object.keys(TEXT)) {
    const T = TEXT[L];
    CNAMES[L].split('|').forEach((s, i) => { T['c_' + IDS[i]] = s; });
    ONAMES[L].split('|').forEach((s, i) => { T['o_' + OPP[i].id] = s; });
    OSAYS[L].split('|').forEach((s, i) => { T['q_' + OPP[i].id] = s; });
    DNAMES[L].split('|').forEach((s, i) => { T['d_' + DK[i]] = s; });
  }

  // ---------- ציור: צבעים לכל יסוד ----------
  const EL = {
    forest: { m: '#46b04f', d: '#1e6b2a', l: '#b5ecaa', b0: '#ecffd8', b1: '#4f9e3e' },
    fire: { m: '#f2603a', d: '#8c2213', l: '#ffc69a', b0: '#fff3c4', b1: '#d4481c' },
    water: { m: '#3591e6', d: '#14407c', l: '#a8d8ff', b0: '#e4f6ff', b1: '#2a68c0' },
    sky: { m: '#f0b52e', d: '#875600', l: '#ffeeaa', b0: '#fffdf0', b1: '#e3a116' },
    shadow: { m: '#9157dc', d: '#3c1d6d', l: '#dcc2ff', b0: '#f1e6ff', b1: '#5a33a0' },
  };
  function E(c, x, y, rx, ry, r) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), r || 0, 0, TAU); }
  function fl(c, f, lw) { c.fillStyle = f; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = OL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); } }
  function rg(c, x, y, r, a, b) { const q = c.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.05, x, y, r * 1.2); q.addColorStop(0, a); q.addColorStop(1, b); return q; }
  function lgr(c, y0, y1, a, b) { const q = c.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; }
  function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
  function line(c, pts, w, col) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.lineWidth = w; c.strokeStyle = col || OL; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  function eye(c, x, y, r, o, sg) {
    if (o.closed) { c.beginPath(); c.arc(x, y - r * 0.3, r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = r * 0.32; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke(); return; }
    E(c, x, y, r, r * 1.12); fl(c, o.white || '#fff', r * 0.3);
    const lx = (o.lx || 0) * r, ly = (o.ly || 0) * r;
    E(c, x + lx, y + ly + r * 0.1, r * 0.6, r * 0.7); c.fillStyle = o.iris || '#1d1230'; c.fill();
    if (o.slit) { E(c, x + lx, y + ly + r * 0.1, r * 0.15, r * 0.58); c.fillStyle = '#120a1a'; c.fill(); }
    E(c, x + lx - r * 0.22, y + ly - r * 0.18, r * 0.22, r * 0.22); c.fillStyle = '#fff'; c.fill();
    if (o.brow) line(c, [[x + sg * r * 1.15, y - r * 1.55], [x - sg * r * 0.85, y - r * 1.05]], r * 0.36);
  }
  function eyes(c, x, y, gap, r, o) { o = o || {}; eye(c, x - gap, y, r, o, -1); eye(c, x + gap, y, r, o, 1); }
  function blush(c, x, y, r) { E(c, x, y, r, r * 0.6); c.fillStyle = 'rgba(255,105,135,.42)'; c.fill(); }
  function smile(c, x, y, w, lw) { c.beginPath(); c.arc(x, y - w * 0.6, w, 0.22 * Math.PI, 0.78 * Math.PI); c.lineWidth = lw; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke(); }
  function leaf(c, x, y, len, wid, ang, col, lw) {
    c.save(); c.translate(x, y); c.rotate(ang);
    E(c, len / 2, 0, len / 2, wid); fl(c, rg(c, len / 2, 0, len / 2, '#d2f7a6', col || '#3f9e2f'), lw);
    line(c, [[len * 0.12, 0], [len * 0.85, 0]], lw * 0.55, 'rgba(25,80,20,.55)');
    c.restore();
  }
  function flame(c, x, y, w, h, a, b, lw) {
    c.beginPath(); c.moveTo(x, y - h);
    c.bezierCurveTo(x + w * 0.25, y - h * 0.6, x + w * 0.6, y - h * 0.45, x + w * 0.5, y - h * 0.05);
    c.bezierCurveTo(x + w * 0.45, y + h * 0.2, x + w * 0.15, y + h * 0.25, x, y + h * 0.25);
    c.bezierCurveTo(x - w * 0.15, y + h * 0.25, x - w * 0.45, y + h * 0.2, x - w * 0.5, y - h * 0.05);
    c.bezierCurveTo(x - w * 0.55, y - h * 0.35, x - w * 0.2, y - h * 0.45, x, y - h);
    const q = c.createLinearGradient(0, y - h, 0, y + h * 0.25); q.addColorStop(0, a); q.addColorStop(1, b);
    fl(c, q, lw);
  }
  function star(c, x, y, r, col, n, inner) {
    n = n || 5; c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r * (inner || 0.45) : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    c.closePath(); c.fillStyle = col; c.fill();
  }
  function sparkle(c, x, y, r, col) { star(c, x, y, r, col || '#fff', 4, 0.28); }
  function boltPath(c, x, y, s) { poly(c, [[x + s * 0.1, y - s], [x - s * 0.45, y + s * 0.1], [x - s * 0.02, y + s * 0.1], [x - s * 0.18, y + s], [x + s * 0.45, y - s * 0.15], [x + s * 0.05, y - s * 0.15], [x + s * 0.28, y - s]]); }
  function moonPath(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0.35 * Math.PI, 1.65 * Math.PI, false); c.arc(x + r * 0.45, y - r * 0.1, r * 0.82, 1.5 * Math.PI, 0.45 * Math.PI, true); c.closePath(); }
  function tentacle(c, x0, y0, x1, y1, cx, cy, w, col) {
    for (const [lw, cl] of [[w + 3, OL], [w, col]]) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.lineWidth = lw; c.strokeStyle = cl; c.lineCap = 'round'; c.stroke(); }
  }

  // ---------- היצורים והכישופים, מצוירים סביב (0,0); s ≈ חצי גובה ----------
  const ART = {
    sprout(c, s) {
      const lw = s * 0.07;
      line(c, [[0, -s * 0.15], [0, -s * 0.5]], lw * 1.3);
      leaf(c, 0, -s * 0.5, s * 0.58, s * 0.21, -2.55, '#3f9e2f', lw);
      leaf(c, 0, -s * 0.5, s * 0.58, s * 0.21, -0.6, '#3f9e2f', lw);
      E(c, 0, s * 0.22, s * 0.68, s * 0.6); fl(c, rg(c, 0, s * 0.22, s * 0.68, '#efffd2', '#4cb238'), lw);
      eyes(c, 0, s * 0.12, s * 0.25, s * 0.14);
      blush(c, -s * 0.44, s * 0.34, s * 0.11); blush(c, s * 0.44, s * 0.34, s * 0.11);
      smile(c, 0, s * 0.38, s * 0.13, lw * 0.8);
    },
    bunny(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { c.save(); c.translate(sg * s * 0.27, -s * 0.28); c.rotate(sg * 0.2); E(c, 0, -s * 0.36, s * 0.17, s * 0.5); fl(c, '#fff6ee', lw); E(c, 0, -s * 0.33, s * 0.08, s * 0.37); c.fillStyle = '#ffb2c8'; c.fill(); c.restore(); }
      E(c, 0, s * 0.27, s * 0.62, s * 0.54); fl(c, rg(c, 0, s * 0.27, s * 0.62, '#ffffff', '#e2cdb8'), lw);
      eyes(c, 0, s * 0.16, s * 0.25, s * 0.13);
      blush(c, -s * 0.4, s * 0.36, s * 0.1); blush(c, s * 0.4, s * 0.36, s * 0.1);
      poly(c, [[-s * 0.08, s * 0.31], [s * 0.08, s * 0.31], [0, s * 0.4]]); fl(c, '#ff7fa6', lw * 0.5);
      line(c, [[0, s * 0.4], [0, s * 0.46]], lw * 0.6);
      c.fillStyle = '#fff'; c.lineWidth = lw * 0.5; c.strokeStyle = OL;
      for (const x of [-s * 0.075, s * 0.005]) { c.fillRect(x, s * 0.46, s * 0.07, s * 0.1); c.strokeRect(x, s * 0.46, s * 0.07, s * 0.1); }
      for (const sg of [-1, 1]) for (const dy of [-0.03, 0.05]) line(c, [[sg * s * 0.2, s * (0.38 + dy)], [sg * s * 0.5, s * (0.34 + dy * 2)]], lw * 0.35, 'rgba(60,40,40,.6)');
    },
    wolf(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.16, -s * 0.3], [sg * s * 0.55, -s * 0.88], [sg * s * 0.64, -s * 0.08]]); fl(c, '#6f8c78', lw); poly(c, [[sg * s * 0.28, -s * 0.32], [sg * s * 0.52, -s * 0.68], [sg * s * 0.56, -s * 0.2]]); c.fillStyle = '#d9a7a7'; c.fill(); }
      c.beginPath(); c.moveTo(-s * 0.7, -s * 0.05); c.quadraticCurveTo(-s * 0.64, -s * 0.58, 0, -s * 0.58); c.quadraticCurveTo(s * 0.64, -s * 0.58, s * 0.7, -s * 0.05); c.quadraticCurveTo(s * 0.6, s * 0.55, 0, s * 0.82); c.quadraticCurveTo(-s * 0.6, s * 0.55, -s * 0.7, -s * 0.05); c.closePath();
      fl(c, rg(c, 0, 0, s * 0.72, '#c3d8bf', '#56735d'), lw);
      E(c, 0, s * 0.44, s * 0.34, s * 0.27); fl(c, '#eef2e4', lw * 0.7);
      E(c, 0, s * 0.29, s * 0.12, s * 0.085); fl(c, '#2a2230');
      line(c, [[-s * 0.13, s * 0.55], [0, s * 0.6], [s * 0.13, s * 0.55]], lw * 0.7);
      eyes(c, 0, -s * 0.05, s * 0.26, s * 0.12, { brow: 1, iris: '#3b2a10' });
      for (const [x, y, r] of [[-s * 0.25, -s * 0.52, s * 0.1], [-s * 0.07, -s * 0.58, s * 0.12], [s * 0.13, -s * 0.54, s * 0.09]]) { E(c, x, y, r, r * 0.8); fl(c, '#5fbf4a', lw * 0.6); }
    },
    bear(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { E(c, sg * s * 0.5, -s * 0.36, s * 0.21, s * 0.21); fl(c, '#9a6a3c', lw); E(c, sg * s * 0.5, -s * 0.36, s * 0.1, s * 0.1); c.fillStyle = '#e3b48c'; c.fill(); }
      E(c, 0, s * 0.14, s * 0.72, s * 0.63); fl(c, rg(c, 0, s * 0.14, s * 0.72, '#d29c66', '#6e4524'), lw);
      E(c, 0, s * 0.38, s * 0.3, s * 0.22); fl(c, '#f0d2a8', lw * 0.7);
      E(c, 0, s * 0.29, s * 0.11, s * 0.08); fl(c, '#2a1a12');
      smile(c, 0, s * 0.47, s * 0.1, lw * 0.7);
      eyes(c, 0, s * 0.04, s * 0.27, s * 0.11);
      c.beginPath(); c.moveTo(-s * 0.62, -s * 0.16); c.quadraticCurveTo(0, -s * 0.78, s * 0.62, -s * 0.16); c.lineWidth = lw * 1.3; c.strokeStyle = '#2f7a28'; c.stroke();
      for (const u of [0.15, 0.38, 0.62, 0.85]) { const x = -s * 0.62 + u * s * 1.24, y = -s * 0.16 - Math.sin(u * Math.PI) * s * 0.31; poly(c, [[x - s * 0.04, y], [x + s * 0.04, y], [x, y - s * 0.1]]); c.fillStyle = '#2f7a28'; c.fill(); }
      leaf(c, -s * 0.28, -s * 0.42, s * 0.24, s * 0.09, -2.5, '#3f9e2f', lw * 0.6);
      E(c, s * 0.3, -s * 0.45, s * 0.09, s * 0.09); fl(c, '#ff8fb8', lw * 0.5); E(c, s * 0.3, -s * 0.45, s * 0.035, s * 0.035); c.fillStyle = '#ffe066'; c.fill();
    },
    oak(c, s) {
      const lw = s * 0.07;
      poly(c, [[-s * 0.4, s * 0.92], [-s * 0.3, -s * 0.12], [s * 0.3, -s * 0.12], [s * 0.4, s * 0.92]]); fl(c, lgr(c, -s * 0.1, s * 0.9, '#a3703f', '#5d3a1f'), lw);
      for (const x of [-s * 0.2, s * 0.18]) line(c, [[x, s * 0.55], [x + s * 0.03, s * 0.85]], lw * 0.5, 'rgba(40,20,10,.5)');
      for (const [x, y, r] of [[-s * 0.48, -s * 0.36, s * 0.33], [s * 0.48, -s * 0.36, s * 0.33], [0, -s * 0.58, s * 0.42], [-s * 0.24, -s * 0.18, s * 0.3], [s * 0.24, -s * 0.18, s * 0.3]]) { E(c, x, y, r, r * 0.9); fl(c, rg(c, x, y, r, '#b4f096', '#2f8a2a'), lw); }
      eyes(c, 0, s * 0.26, s * 0.14, s * 0.085, { closed: 1 });
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.42); c.quadraticCurveTo(-s * 0.1, s * 0.34, 0, s * 0.42); c.quadraticCurveTo(s * 0.1, s * 0.34, s * 0.22, s * 0.42); c.lineWidth = lw * 1.2; c.strokeStyle = '#5fbf4a'; c.stroke();
      smile(c, 0, s * 0.58, s * 0.08, lw * 0.7);
    },
    growth(c, s) {
      const lw = s * 0.07;
      const q = c.createRadialGradient(0, 0, 2, 0, 0, s); q.addColorStop(0, 'rgba(255,255,200,.9)'); q.addColorStop(1, 'rgba(255,255,200,0)'); c.fillStyle = q; c.fillRect(-s, -s, s * 2, s * 2);
      E(c, 0, s * 0.72, s * 0.55, s * 0.16); fl(c, '#7a5530', lw);
      c.beginPath(); c.moveTo(0, s * 0.65); c.bezierCurveTo(-s * 0.15, s * 0.2, s * 0.2, -s * 0.1, 0, -s * 0.55); c.lineWidth = lw * 1.6; c.strokeStyle = '#2f7a28'; c.stroke();
      leaf(c, -s * 0.02, s * 0.25, s * 0.5, s * 0.17, -2.7, '#3f9e2f', lw);
      leaf(c, s * 0.06, s * 0.0, s * 0.5, s * 0.17, -0.45, '#3f9e2f', lw);
      leaf(c, 0, -s * 0.5, s * 0.42, s * 0.16, -1.57, '#3f9e2f', lw);
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.62, -s * 0.15], [sg * s * 0.82, s * 0.12], [sg * s * 0.42, s * 0.12]]); fl(c, '#ffe066', lw * 0.6); }
      sparkle(c, -s * 0.5, -s * 0.5, s * 0.14); sparkle(c, s * 0.48, -s * 0.6, s * 0.1);
    },
    dew(c, s) {
      const lw = s * 0.07;
      c.beginPath(); c.moveTo(0, -s * 0.8); c.bezierCurveTo(s * 0.2, -s * 0.45, s * 0.6, -s * 0.1, s * 0.6, s * 0.28); c.arc(0, s * 0.28, s * 0.6, 0, Math.PI); c.bezierCurveTo(-s * 0.6, -s * 0.1, -s * 0.2, -s * 0.45, 0, -s * 0.8); c.closePath();
      fl(c, rg(c, 0, s * 0.1, s * 0.7, '#e2fff6', '#21a39b'), lw);
      c.beginPath(); const hx = 0, hy = s * 0.3, hr = s * 0.24;
      c.moveTo(hx, hy + hr * 0.9); c.bezierCurveTo(hx - hr * 1.6, hy - hr * 0.2, hx - hr * 0.6, hy - hr * 1.4, hx, hy - hr * 0.45); c.bezierCurveTo(hx + hr * 0.6, hy - hr * 1.4, hx + hr * 1.6, hy - hr * 0.2, hx, hy + hr * 0.9);
      fl(c, '#ff6f91', lw * 0.6);
      E(c, -s * 0.25, -s * 0.15, s * 0.08, s * 0.18, 0.4); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
      sparkle(c, s * 0.62, -s * 0.5, s * 0.14); sparkle(c, -s * 0.66, -s * 0.1, s * 0.1);
    },
    imp(c, s) {
      const lw = s * 0.07;
      flame(c, 0, -s * 0.3, s * 0.85, s * 0.62, '#fff07a', '#ff6a1f', lw);
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.45, s * 0.05], [sg * s * 0.9, -s * 0.1], [sg * s * 0.52, s * 0.32]]); fl(c, '#d9393a', lw); }
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * s * 0.22, -s * 0.22); c.quadraticCurveTo(sg * s * 0.36, -s * 0.48, sg * s * 0.18, -s * 0.6); c.quadraticCurveTo(sg * s * 0.18, -s * 0.36, sg * s * 0.08, -s * 0.26); c.closePath(); fl(c, '#fff1d6', lw * 0.8); }
      E(c, 0, s * 0.18, s * 0.56, s * 0.5); fl(c, rg(c, 0, s * 0.18, s * 0.56, '#ff9a8a', '#c4282a'), lw);
      eyes(c, 0, s * 0.08, s * 0.22, s * 0.12, { lx: 0.25, iris: '#2a0d0d' });
      c.beginPath(); c.moveTo(-s * 0.26, s * 0.33); c.quadraticCurveTo(0, s * 0.58, s * 0.26, s * 0.33); c.quadraticCurveTo(0, s * 0.42, -s * 0.26, s * 0.33); fl(c, '#5a1010', lw * 0.6);
      poly(c, [[s * 0.06, s * 0.385], [s * 0.15, s * 0.375], [s * 0.1, s * 0.46]]); c.fillStyle = '#fff'; c.fill();
    },
    fox(c, s) {
      const lw = s * 0.07;
      c.save(); c.translate(s * 0.55, s * 0.2); c.rotate(0.6); flame(c, 0, 0, s * 0.5, s * 0.8, '#ffe066', '#ff5a1f', lw); c.restore();
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.12, -s * 0.35], [sg * s * 0.55, -s * 0.9], [sg * s * 0.65, -s * 0.15]]); fl(c, '#ff8a3d', lw); poly(c, [[sg * s * 0.5, -s * 0.7], [sg * s * 0.55, -s * 0.9], [sg * s * 0.61, -s * 0.62]]); c.fillStyle = '#3a1d10'; c.fill(); }
      c.beginPath(); c.moveTo(-s * 0.72, -s * 0.18); c.quadraticCurveTo(0, -s * 0.62, s * 0.72, -s * 0.18); c.quadraticCurveTo(s * 0.55, s * 0.45, 0, s * 0.72); c.quadraticCurveTo(-s * 0.55, s * 0.45, -s * 0.72, -s * 0.18); c.closePath();
      fl(c, rg(c, 0, -s * 0.1, s * 0.75, '#ffb066', '#d4561c'), lw);
      c.save(); c.clip(); for (const sg of [-1, 1]) { E(c, sg * s * 0.3, s * 0.42, s * 0.34, s * 0.26); c.fillStyle = '#fff4e6'; c.fill(); } c.restore();
      E(c, 0, s * 0.56, s * 0.1, s * 0.07); fl(c, '#2a1a12');
      eyes(c, 0, s * 0.03, s * 0.25, s * 0.12, { iris: '#3b2408' });
    },
    lizard(c, s) {
      const lw = s * 0.07;
      tentacle(c, s * 0.3, s * 0.45, s * 0.75, -s * 0.1, s * 0.9, s * 0.55, s * 0.2, '#ff7a3a');
      flame(c, s * 0.76, -s * 0.18, s * 0.28, s * 0.4, '#ffe066', '#ff5a1f', lw * 0.7);
      for (const [x, y] of [[-s * 0.35, s * 0.62], [s * 0.3, s * 0.68]]) { E(c, x, y, s * 0.13, s * 0.08); fl(c, '#e2552a', lw * 0.6); }
      E(c, s * 0.02, s * 0.36, s * 0.55, s * 0.32, -0.15); fl(c, rg(c, 0, s * 0.3, s * 0.55, '#ffab6b', '#d4401c'), lw);
      for (const [x, y, r] of [[-s * 0.15, s * 0.28, 0.07], [s * 0.15, s * 0.36, 0.06], [s * 0.32, s * 0.24, 0.05]]) { E(c, x, y, s * r, s * r); c.fillStyle = '#ffe066'; c.fill(); }
      E(c, -s * 0.32, -s * 0.12, s * 0.45, s * 0.36); fl(c, rg(c, -s * 0.32, -s * 0.12, s * 0.45, '#ffb27a', '#e0491f'), lw);
      eyes(c, -s * 0.32, -s * 0.3, s * 0.2, s * 0.15);
      smile(c, -s * 0.32, s * 0.08, s * 0.16, lw * 0.7);
    },
    phoenix(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) {
        c.beginPath(); c.moveTo(sg * s * 0.15, -s * 0.05);
        c.quadraticCurveTo(sg * s * 0.6, -s * 0.85, sg * s * 1.1, -s * 0.62);
        for (let k = 0; k < 4; k++) { const x = sg * s * (1.05 - k * 0.2), y = -s * (0.45 - k * 0.2); c.quadraticCurveTo(sg * s * (1.1 - k * 0.2), y + s * 0.18, x - sg * s * 0.12, y + s * 0.16); }
        c.quadraticCurveTo(sg * s * 0.35, s * 0.3, sg * s * 0.12, s * 0.2); c.closePath();
        const q = c.createLinearGradient(0, -s * 0.8, 0, s * 0.3); q.addColorStop(0, '#fff07a'); q.addColorStop(0.5, '#ff9a1f'); q.addColorStop(1, '#d92d1a'); fl(c, q, lw);
      }
      flame(c, 0, s * 0.72, s * 0.5, s * 0.5, '#ffe066', '#e8361a', lw);
      E(c, 0, s * 0.2, s * 0.3, s * 0.42); fl(c, rg(c, 0, s * 0.2, s * 0.32, '#fff1a0', '#ff8a1f'), lw);
      for (const dx of [-0.12, 0, 0.12]) flame(c, s * dx, -s * 0.62, s * 0.14, s * 0.26, '#fff07a', '#ff6a1f', lw * 0.6);
      E(c, 0, -s * 0.36, s * 0.25, s * 0.24); fl(c, rg(c, 0, -s * 0.36, s * 0.25, '#ffd36a', '#f07a1a'), lw);
      eyes(c, 0, -s * 0.4, s * 0.1, s * 0.075);
      poly(c, [[-s * 0.07, -s * 0.28], [s * 0.07, -s * 0.28], [0, -s * 0.16]]); fl(c, '#ffcf3a', lw * 0.6);
    },
    dragon(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * s * 0.25, -s * 0.45); c.quadraticCurveTo(sg * s * 0.55, -s * 0.85, sg * s * 0.85, -s * 0.95); c.quadraticCurveTo(sg * s * 0.6, -s * 0.62, sg * s * 0.48, -s * 0.32); c.closePath(); fl(c, '#fff0cc', lw); }
      for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { poly(c, [[sg * s * (0.55 + k * 0.06), -s * (0.2 - k * 0.22)], [sg * s * (0.92 + k * 0.02), -s * (0.12 - k * 0.24)], [sg * s * (0.6 + k * 0.05), s * (0.0 + k * 0.2)]]); fl(c, '#b8231c', lw * 0.7); }
      E(c, 0, -s * 0.1, s * 0.62, s * 0.52); fl(c, rg(c, 0, -s * 0.1, s * 0.62, '#ff7a5a', '#a81c16'), lw);
      E(c, 0, s * 0.36, s * 0.46, s * 0.3); fl(c, rg(c, 0, s * 0.3, s * 0.46, '#ff9a7a', '#c9301f'), lw);
      for (const sg of [-1, 1]) { E(c, sg * s * 0.14, s * 0.27, s * 0.05, s * 0.035); c.fillStyle = '#3a0d0a'; c.fill(); }
      c.beginPath(); c.moveTo(-s * 0.32, s * 0.48); c.quadraticCurveTo(0, s * 0.6, s * 0.32, s * 0.48); c.lineWidth = lw; c.strokeStyle = OL; c.stroke();
      for (const x of [-s * 0.22, s * 0.16]) { poly(c, [[x, s * 0.5], [x + s * 0.07, s * 0.51], [x + s * 0.035, s * 0.6]]); c.fillStyle = '#fff'; c.fill(); }
      eyes(c, 0, -s * 0.18, s * 0.27, s * 0.13, { brow: 1, iris: '#ffbf00', slit: 1 });
      for (const [x, y, r] of [[-s * 0.2, s * 0.1, 0.08], [-s * 0.32, -s * 0.02, 0.06]]) { E(c, x - s * 0.5, y - s * 0.5, s * r, s * r); c.fillStyle = 'rgba(200,200,210,.55)'; c.fill(); }
    },
    fireball(c, s) {
      const lw = s * 0.07;
      for (const [dx, dy, k] of [[0.42, -0.42, 0.8], [0.15, -0.55, 0.6], [0.55, -0.12, 0.6]]) { c.save(); c.translate(s * dx, s * dy); c.rotate(0.75); flame(c, 0, 0, s * 0.35 * k, s * 0.9 * k, '#fff3a0', '#ff5a1f', lw * 0.7); c.restore(); }
      E(c, -s * 0.12, s * 0.15, s * 0.52, s * 0.52);
      const q = c.createRadialGradient(-s * 0.25, 0, 1, -s * 0.12, s * 0.15, s * 0.52); q.addColorStop(0, '#ffffff'); q.addColorStop(0.3, '#fff27a'); q.addColorStop(0.7, '#ff8a1f'); q.addColorStop(1, '#d4301a'); fl(c, q, lw);
      for (const [x, y] of [[-0.75, -0.3], [0.6, 0.55], [-0.6, 0.65]]) sparkle(c, s * x, s * y, s * 0.1, '#ffe066');
    },
    crab(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) line(c, [[sg * s * 0.4, s * (0.25 + k * 0.12)], [sg * s * 0.75, s * (0.35 + k * 0.17)], [sg * s * 0.82, s * (0.5 + k * 0.17)]], lw * 1.1, '#c43d1f');
      for (const sg of [-1, 1]) {
        line(c, [[sg * s * 0.45, s * 0.05], [sg * s * 0.68, -s * 0.32]], lw * 2.2, OL); line(c, [[sg * s * 0.45, s * 0.05], [sg * s * 0.68, -s * 0.32]], lw * 1.3, '#ff7b54');
        c.save(); c.translate(sg * s * 0.72, -s * 0.5);
        E(c, -sg * s * 0.04, s * 0.02, s * 0.22, s * 0.26, sg * 0.4); fl(c, rg(c, 0, 0, s * 0.26, '#ff9a72', '#c43d1f'), lw);
        poly(c, [[0, -s * 0.05], [sg * s * 0.18, -s * 0.3], [sg * s * 0.24, -s * 0.06]]); c.fillStyle = '#5ec4ff'; c.fill();
        c.restore();
      }
      for (const sg of [-1, 1]) { line(c, [[sg * s * 0.18, -s * 0.05], [sg * s * 0.22, -s * 0.32]], lw); eye(c, sg * s * 0.22, -s * 0.4, s * 0.12, {}, sg); }
      E(c, 0, s * 0.22, s * 0.62, s * 0.42); fl(c, rg(c, 0, s * 0.2, s * 0.62, '#ff9a72', '#c43d1f'), lw);
      smile(c, 0, s * 0.32, s * 0.14, lw * 0.8);
      blush(c, -s * 0.35, s * 0.25, s * 0.08); blush(c, s * 0.35, s * 0.25, s * 0.08);
    },
    jelly(c, s) {
      const lw = s * 0.07;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * s * 0.2, s * 0.15); c.bezierCurveTo(i * s * 0.2 - s * 0.12, s * 0.4, i * s * 0.22 + s * 0.12, s * 0.6, i * s * 0.24, s * 0.88); c.lineWidth = s * 0.1; c.strokeStyle = OL; c.stroke(); c.lineWidth = s * 0.06; c.strokeStyle = '#e891e8'; c.stroke(); }
      c.beginPath(); c.moveTo(-s * 0.68, s * 0.18); c.bezierCurveTo(-s * 0.68, -s * 0.78, s * 0.68, -s * 0.78, s * 0.68, s * 0.18);
      for (let k = 0; k < 5; k++) { const x0 = s * 0.68 - k * s * 0.272; c.quadraticCurveTo(x0 - s * 0.136, s * 0.32, x0 - s * 0.272, s * 0.18); }
      c.closePath(); fl(c, rg(c, 0, -s * 0.15, s * 0.7, '#ffe0fb', '#b65ad9'), lw);
      E(c, -s * 0.28, -s * 0.32, s * 0.16, s * 0.08, -0.5); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
      eyes(c, 0, -s * 0.06, s * 0.22, s * 0.12);
      blush(c, -s * 0.4, s * 0.06, s * 0.09); blush(c, s * 0.4, s * 0.06, s * 0.09);
      smile(c, 0, s * 0.1, s * 0.1, lw * 0.7);
    },
    knight(c, s) {
      const lw = s * 0.07;
      const body = () => { c.beginPath(); c.moveTo(s * 0.05, -s * 0.25); c.bezierCurveTo(s * 0.5, -s * 0.05, s * 0.45, s * 0.45, s * 0.1, s * 0.55); c.bezierCurveTo(-s * 0.2, s * 0.62, -s * 0.25, s * 0.95, s * 0.05, s * 0.9); };
      body(); c.lineWidth = s * 0.44; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke(); body(); c.lineWidth = s * 0.34; c.strokeStyle = '#32c4b4'; c.stroke();
      for (let k = 0; k < 4; k++) line(c, [[s * (0.08 + k * 0.05), s * (0.0 + k * 0.13)], [s * (0.22 + k * 0.04), s * (0.02 + k * 0.13)]], lw * 0.5, 'rgba(10,70,70,.6)');
      c.save(); c.translate(-s * 0.32, -s * 0.36); c.rotate(0.15); g2rr(c, -s * 0.28, -s * 0.09, s * 0.35, s * 0.18, s * 0.08); fl(c, '#41d6c4', lw); c.restore();
      E(c, 0, -s * 0.38, s * 0.32, s * 0.28); fl(c, rg(c, 0, -s * 0.38, s * 0.32, '#7af0de', '#1f9b8e'), lw);
      c.beginPath(); c.arc(s * 0.02, -s * 0.48, s * 0.3, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); fl(c, lgr(c, -s * 0.8, -s * 0.45, '#ffffff', '#9aa6b8'), lw);
      flame(c, s * 0.04, -s * 0.78, s * 0.2, s * 0.3, '#ff9a9a', '#d92d3a', lw * 0.6);
      eye(c, s * 0.08, -s * 0.36, s * 0.11, {}, 1);
      poly(c, [[s * 0.3, -s * 0.2], [s * 0.55, -s * 0.05], [s * 0.36, s * 0.05]]); fl(c, '#7af0de', lw * 0.6);
    },
    serpent(c, s) {
      const lw = s * 0.07;
      const neck = () => { c.beginPath(); c.moveTo(-s * 0.45, s * 0.9); c.bezierCurveTo(-s * 0.55, s * 0.3, s * 0.35, s * 0.2, s * 0.12, -s * 0.3); };
      neck(); c.lineWidth = s * 0.42; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke(); neck(); c.lineWidth = s * 0.32; c.strokeStyle = '#2b8fbf'; c.stroke();
      for (let k = 0; k < 4; k++) { E(c, -s * (0.32 - k * 0.12), s * (0.62 - k * 0.2), s * 0.06, s * 0.035, 0.5); c.fillStyle = '#9fe4ff'; c.fill(); }
      for (const [x, y] of [[-0.05, -0.62], [0.18, -0.68], [0.38, -0.58]]) { poly(c, [[s * x - s * 0.08, s * y + s * 0.15], [s * x, s * y - s * 0.12], [s * x + s * 0.08, s * y + s * 0.15]]); fl(c, '#7fd7ff', lw * 0.6); }
      E(c, s * 0.18, -s * 0.35, s * 0.42, s * 0.3, -0.15); fl(c, rg(c, s * 0.18, -s * 0.35, s * 0.42, '#7fd7ff', '#1d6b9c'), lw);
      eyes(c, s * 0.2, -s * 0.42, s * 0.17, s * 0.1, { iris: '#0b3a2a' });
      smile(c, s * 0.25, -s * 0.18, s * 0.14, lw * 0.7);
      c.beginPath(); c.moveTo(-s * 1.1, s * 0.75);
      for (let k = 0; k <= 6; k++) c.quadraticCurveTo(-s * 1.1 + (k + 0.5) * s * 0.36, s * (k % 2 ? 0.62 : 0.88), -s * 1.1 + (k + 1) * s * 0.36, s * 0.75);
      c.lineTo(s * 1.2, s * 1.2); c.lineTo(-s * 1.2, s * 1.2); c.closePath(); fl(c, 'rgba(40,120,210,.85)', lw * 0.6);
      for (const x of [-0.8, -0.1, 0.6]) { E(c, s * x, s * 0.76, s * 0.06, s * 0.06); c.fillStyle = '#fff'; c.fill(); }
    },
    kraken(c, s) {
      const lw = s * 0.07;
      const T = [[-0.5, 0.25, -0.95, 0.75, -0.95, 0.3], [-0.3, 0.35, -0.55, 0.95, -0.15, 0.75], [-0.1, 0.4, -0.05, 0.98, -0.35, 0.9], [0.1, 0.4, 0.15, 0.98, 0.4, 0.9], [0.3, 0.35, 0.6, 0.95, 0.15, 0.75], [0.5, 0.25, 0.95, 0.72, 0.95, 0.3]];
      for (const [x0, y0, x1, y1, cx, cy] of T) tentacle(c, s * x0, s * y0, s * x1, s * y1, s * cx, s * cy, s * 0.15, '#9b5bd6');
      E(c, 0, -s * 0.12, s * 0.62, s * 0.62); fl(c, rg(c, 0, -s * 0.15, s * 0.62, '#d7a6ff', '#6a2fa8'), lw);
      for (const [x, y, r] of [[-0.3, -0.48, 0.07], [0.22, -0.55, 0.05], [0.38, -0.3, 0.06]]) { E(c, s * x, s * y, s * r, s * r); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); }
      eyes(c, 0, s * 0.02, s * 0.25, s * 0.16);
      smile(c, 0, s * 0.28, s * 0.12, lw * 0.8);
    },
    wave(c, s) {
      const lw = s * 0.07;
      c.beginPath(); c.moveTo(-s * 1.2, s * 0.95); c.bezierCurveTo(-s * 0.9, s * 0.1, -s * 0.4, -s * 0.85, s * 0.35, -s * 0.72);
      c.bezierCurveTo(s * 0.8, -s * 0.62, s * 0.8, -s * 0.1, s * 0.4, -s * 0.12); c.bezierCurveTo(s * 0.15, -s * 0.12, s * 0.1, -s * 0.38, s * 0.3, -s * 0.42);
      c.bezierCurveTo(-s * 0.15, -s * 0.45, -s * 0.3, s * 0.2, s * 0.2, s * 0.95); c.closePath();
      fl(c, lgr(c, -s * 0.8, s * 0.9, '#7fe0ff', '#1550b0'), lw);
      for (const [x, y, r] of [[0.32, -0.74, 0.1], [0.55, -0.6, 0.08], [0.1, -0.74, 0.08], [0.68, -0.38, 0.07], [-0.15, -0.65, 0.06]]) { E(c, s * x, s * y, s * r, s * r); fl(c, '#ffffff', lw * 0.4); }
      c.beginPath(); c.moveTo(s * 0.2, s * 0.95); c.bezierCurveTo(s * 0.4, s * 0.45, s * 0.8, s * 0.3, s * 1.1, s * 0.4); c.lineTo(s * 1.2, s * 0.95); c.closePath(); fl(c, 'rgba(30,110,200,.9)', lw * 0.7);
    },
    owlet(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.18, -s * 0.5], [sg * s * 0.5, -s * 0.85], [sg * s * 0.52, -s * 0.4]]); fl(c, '#8a5a32', lw); }
      for (const sg of [-1, 1]) { E(c, sg * s * 0.55, s * 0.25, s * 0.2, s * 0.38, sg * 0.25); fl(c, '#7a4c28', lw); }
      E(c, 0, s * 0.12, s * 0.6, s * 0.68); fl(c, rg(c, 0, s * 0.1, s * 0.62, '#c99a64', '#7a4c28'), lw);
      E(c, 0, s * 0.42, s * 0.36, s * 0.32); c.fillStyle = '#f6e3c2'; c.fill();
      for (const [x, y] of [[-0.12, 0.35], [0.12, 0.35], [0, 0.5], [-0.2, 0.52], [0.2, 0.52]]) { c.beginPath(); c.arc(s * x, s * y, s * 0.06, 0.1, Math.PI - 0.1); c.lineWidth = lw * 0.5; c.strokeStyle = 'rgba(120,80,40,.6)'; c.stroke(); }
      for (const sg of [-1, 1]) { E(c, sg * s * 0.24, -s * 0.1, s * 0.22, s * 0.22); fl(c, '#ffb347', lw * 0.8); }
      eyes(c, 0, -s * 0.1, s * 0.24, s * 0.15);
      poly(c, [[-s * 0.07, s * 0.05], [s * 0.07, s * 0.05], [0, s * 0.18]]); fl(c, '#ff9a1f', lw * 0.6);
    },
    eagle(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { poly(c, [[sg * s * 0.3, s * (0.1 + k * 0.18)], [sg * s * (0.95 - k * 0.1), s * (0.0 + k * 0.25)], [sg * s * 0.45, s * (0.32 + k * 0.18)]]); fl(c, '#8a5a32', lw * 0.8); }
      for (const dx of [-0.25, -0.08, 0.1, 0.27]) { poly(c, [[s * dx - s * 0.1, -s * 0.4], [s * dx + s * 0.04, -s * 0.82], [s * dx + s * 0.12, -s * 0.38]]); fl(c, '#f4f4f8', lw * 0.7); }
      E(c, 0, -s * 0.05, s * 0.52, s * 0.55); fl(c, rg(c, 0, -s * 0.1, s * 0.55, '#ffffff', '#c4c8d8'), lw);
      c.beginPath(); c.moveTo(-s * 0.2, s * 0.1); c.quadraticCurveTo(0, s * 0.02, s * 0.2, s * 0.1); c.quadraticCurveTo(s * 0.2, s * 0.45, 0, s * 0.62); c.quadraticCurveTo(-s * 0.04, s * 0.45, -s * 0.2, s * 0.1); c.closePath(); fl(c, lgr(c, 0, s * 0.62, '#ffe066', '#e89a10'), lw);
      eyes(c, 0, -s * 0.12, s * 0.24, s * 0.12, { brow: 1, iris: '#5a3a08' });
      boltPath(c, s * 0.62, -s * 0.62, s * 0.22); fl(c, '#ffe066', lw * 0.6);
    },
    pony(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { c.save(); c.translate(sg * s * 0.55, s * 0.2); c.rotate(sg * -0.5); E(c, 0, 0, s * 0.18, s * 0.36); fl(c, '#eaf4ff', lw * 0.8); c.restore(); }
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.1, -s * 0.48], [sg * s * 0.3, -s * 0.88], [sg * s * 0.36, -s * 0.42]]); fl(c, '#ffffff', lw); }
      E(c, 0, s * 0.05, s * 0.42, s * 0.6); fl(c, rg(c, 0, 0, s * 0.5, '#ffffff', '#d6e2f2'), lw);
      E(c, 0, s * 0.48, s * 0.32, s * 0.22); fl(c, '#ffd9e6', lw * 0.8);
      for (const sg of [-1, 1]) { E(c, sg * s * 0.1, s * 0.5, s * 0.04, s * 0.05); c.fillStyle = '#c45a7a'; c.fill(); }
      for (const [x, y, r] of [[-0.3, -0.55, 0.16], [-0.08, -0.66, 0.18], [0.16, -0.62, 0.15], [-0.42, -0.3, 0.14], [-0.46, -0.05, 0.12]]) { E(c, s * x, s * y, s * r, s * r); fl(c, '#9fd4ff', lw * 0.6); }
      eyes(c, 0, s * 0.02, s * 0.2, s * 0.12, { iris: '#26408a' });
      blush(c, -s * 0.28, s * 0.22, s * 0.08); blush(c, s * 0.28, s * 0.22, s * 0.08);
    },
    titan(c, s) {
      const lw = s * 0.07;
      for (let k = 0; k < 5; k++) { const x = -s * 0.5 + k * s * 0.25; poly(c, [[x - s * 0.08, -s * 0.5], [x + s * 0.03, -s * (0.88 + (k % 2) * 0.1)], [x + s * 0.12, -s * 0.5]]); fl(c, '#ffe066', lw * 0.6); }
      for (const [x, y, r] of [[-0.55, -0.25, 0.3], [0.55, -0.25, 0.3], [0, -0.42, 0.38], [-0.5, 0.2, 0.28], [0.5, 0.2, 0.28]]) { E(c, s * x, s * y, s * r, s * r * 0.9); fl(c, rg(c, s * x, s * y, s * r, '#e8eefa', '#7d8fb5'), lw); }
      E(c, 0, s * 0.02, s * 0.5, s * 0.48); fl(c, rg(c, 0, 0, s * 0.5, '#b8c6e6', '#56688f'), lw);
      for (const [x, y, r] of [[-0.3, 0.5, 0.2], [0, 0.6, 0.24], [0.3, 0.5, 0.2]]) { E(c, s * x, s * y, s * r, s * r * 0.85); fl(c, '#f2f6ff', lw * 0.7); }
      c.save(); c.shadowColor = '#ffe066'; c.shadowBlur = s * 0.4;
      for (const sg of [-1, 1]) { E(c, sg * s * 0.2, -s * 0.05, s * 0.12, s * 0.07); c.fillStyle = '#fff6a0'; c.fill(); }
      c.restore();
      line(c, [[-s * 0.36, -s * 0.2], [-s * 0.08, -s * 0.12]], lw); line(c, [[s * 0.36, -s * 0.2], [s * 0.08, -s * 0.12]], lw);
    },
    zap(c, s) {
      const lw = s * 0.07;
      c.save(); c.shadowColor = '#ffe066'; c.shadowBlur = s * 0.5;
      boltPath(c, 0, s * 0.18, s * 0.72); fl(c, lgr(c, -s * 0.5, s * 0.9, '#ffffff', '#ffd21f'), lw);
      c.restore();
      for (const [x, y, r] of [[-0.45, -0.62, 0.28], [0, -0.75, 0.34], [0.45, -0.62, 0.28], [-0.2, -0.5, 0.25], [0.25, -0.5, 0.25]]) { E(c, s * x, s * y, s * r, s * r * 0.8); fl(c, rg(c, s * x, s * y, s * r, '#9aa4c8', '#4a5072'), lw * 0.8); }
      sparkle(c, -s * 0.6, s * 0.4, s * 0.12, '#fff6a0'); sparkle(c, s * 0.6, s * 0.2, s * 0.1, '#fff6a0');
    },
    wisdom(c, s) {
      const lw = s * 0.07;
      c.save(); c.globalAlpha = 0.55;
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(0, s * 0.1); c.lineTo(k * s * 0.3 - s * 0.08, -s * 0.9); c.lineTo(k * s * 0.3 + s * 0.08, -s * 0.9); c.closePath(); c.fillStyle = '#fff6b0'; c.fill(); }
      c.restore();
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, s * 0.2); c.quadraticCurveTo(sg * s * 0.35, -s * 0.05, sg * s * 0.8, s * 0.08); c.lineTo(sg * s * 0.8, s * 0.62); c.quadraticCurveTo(sg * s * 0.35, s * 0.5, 0, s * 0.72); c.closePath(); fl(c, sg < 0 ? '#fffaf0' : '#f3e6c8', lw); }
      for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) line(c, [[sg * s * 0.15, s * (0.3 + k * 0.12)], [sg * s * 0.62, s * (0.24 + k * 0.12)]], lw * 0.45, 'rgba(90,70,40,.5)');
      line(c, [[0, s * 0.2], [0, s * 0.72]], lw);
      sparkle(c, -s * 0.45, -s * 0.35, s * 0.16, '#fff'); sparkle(c, s * 0.3, -s * 0.55, s * 0.12, '#fff'); sparkle(c, s * 0.1, -s * 0.2, s * 0.09, '#fff');
    },
    bat(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) {
        c.beginPath(); c.moveTo(sg * s * 0.2, -s * 0.05); c.quadraticCurveTo(sg * s * 0.6, -s * 0.6, sg * s * 1.08, -s * 0.38);
        c.quadraticCurveTo(sg * s * 0.95, s * 0.0, sg * s * 0.85, s * 0.12); c.quadraticCurveTo(sg * s * 0.72, s * 0.0, sg * s * 0.6, s * 0.2); c.quadraticCurveTo(sg * s * 0.45, s * 0.08, sg * s * 0.3, s * 0.3); c.closePath();
        fl(c, rg(c, sg * s * 0.6, -s * 0.2, s * 0.6, '#9a6ad8', '#3d1f6d'), lw);
      }
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.1, -s * 0.3], [sg * s * 0.32, -s * 0.72], [sg * s * 0.38, -s * 0.2]]); fl(c, '#6b3fb0', lw); }
      E(c, 0, s * 0.08, s * 0.42, s * 0.45); fl(c, rg(c, 0, 0, s * 0.45, '#b48af0', '#5a33a0'), lw);
      eyes(c, 0, -s * 0.02, s * 0.17, s * 0.12);
      for (const x of [-s * 0.09, s * 0.04]) { poly(c, [[x, s * 0.22], [x + s * 0.06, s * 0.22], [x + s * 0.03, s * 0.31]]); c.fillStyle = '#fff'; c.fill(); }
      smile(c, 0, s * 0.24, s * 0.12, lw * 0.6);
    },
    snake(c, s) {
      const lw = s * 0.07;
      for (const [y, rx, ry] of [[0.62, 0.7, 0.24], [0.38, 0.55, 0.2]]) { E(c, 0, s * y, s * rx, s * ry); fl(c, rg(c, 0, s * y, s * rx, '#c08af0', '#5a2fa0'), lw); c.save(); c.clip(); for (let k = -3; k <= 3; k++) { c.fillStyle = 'rgba(140,240,120,.5)'; c.fillRect(k * s * 0.22, s * (y - 0.3), s * 0.06, s * 0.6); } c.restore(); }
      const neck = () => { c.beginPath(); c.moveTo(s * 0.25, s * 0.3); c.quadraticCurveTo(s * 0.45, -s * 0.05, s * 0.05, -s * 0.3); };
      neck(); c.lineWidth = s * 0.3; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke(); neck(); c.lineWidth = s * 0.22; c.strokeStyle = '#9a5ad8'; c.stroke();
      E(c, s * 0.02, -s * 0.38, s * 0.36, s * 0.27); fl(c, rg(c, 0, -s * 0.4, s * 0.36, '#d0a6ff', '#6a33b0'), lw);
      eyes(c, s * 0.02, -s * 0.44, s * 0.16, s * 0.1, { iris: '#2a8a1a', slit: 1 });
      line(c, [[s * 0.02, -s * 0.18], [s * 0.02, -s * 0.04], [-s * 0.05, s * 0.03]], lw * 0.6, '#ff3355');
      line(c, [[s * 0.02, -s * 0.04], [s * 0.09, s * 0.03]], lw * 0.6, '#ff3355');
    },
    cat(c, s) {
      const lw = s * 0.07;
      moonPath(c, s * 0.62, -s * 0.6, s * 0.3); c.fillStyle = '#ffe58a'; c.fill();
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.12, -s * 0.32], [sg * s * 0.52, -s * 0.85], [sg * s * 0.62, -s * 0.12]]); fl(c, '#4b2a7a', lw); poly(c, [[sg * s * 0.26, -s * 0.34], [sg * s * 0.5, -s * 0.66], [sg * s * 0.55, -s * 0.24]]); c.fillStyle = '#ff9ec4'; c.fill(); }
      E(c, 0, s * 0.12, s * 0.65, s * 0.56); fl(c, rg(c, 0, 0, s * 0.65, '#7a54b8', '#2e1652'), lw);
      eyes(c, 0, s * 0.02, s * 0.26, s * 0.14, { white: '#ffe066', iris: '#ffb800', slit: 1 });
      poly(c, [[-s * 0.06, s * 0.24], [s * 0.06, s * 0.24], [0, s * 0.31]]); c.fillStyle = '#ff9ec4'; c.fill();
      c.beginPath(); c.moveTo(-s * 0.13, s * 0.36); c.quadraticCurveTo(-s * 0.06, s * 0.42, 0, s * 0.33); c.quadraticCurveTo(s * 0.06, s * 0.42, s * 0.13, s * 0.36); c.lineWidth = lw * 0.6; c.strokeStyle = '#d8c8ff'; c.stroke();
      for (const sg of [-1, 1]) for (const dy of [-0.02, 0.07]) line(c, [[sg * s * 0.22, s * (0.3 + dy)], [sg * s * 0.62, s * (0.25 + dy * 2)]], lw * 0.35, 'rgba(230,220,255,.7)');
    },
    gargoyle(c, s) {
      const lw = s * 0.07;
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * s * 0.35, -s * 0.1); c.lineTo(sg * s * 1.0, -s * 0.6); c.lineTo(sg * s * 0.92, -s * 0.1); c.lineTo(sg * s * 0.78, -s * 0.2); c.lineTo(sg * s * 0.7, s * 0.15); c.lineTo(sg * s * 0.5, s * 0.15); c.closePath(); fl(c, '#6f6888', lw); }
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * s * 0.25, -s * 0.38); c.quadraticCurveTo(sg * s * 0.45, -s * 0.75, sg * s * 0.25, -s * 0.9); c.quadraticCurveTo(sg * s * 0.3, -s * 0.6, sg * s * 0.1, -s * 0.42); c.closePath(); fl(c, '#d8d0e8', lw * 0.8); }
      E(c, 0, s * 0.15, s * 0.62, s * 0.6); fl(c, rg(c, 0, 0, s * 0.62, '#b8b0cc', '#58506e'), lw);
      line(c, [[-s * 0.38, s * 0.35], [-s * 0.28, s * 0.45], [-s * 0.32, s * 0.55]], lw * 0.5, 'rgba(40,30,60,.6)');
      line(c, [[s * 0.4, -s * 0.1], [s * 0.3, s * 0.0]], lw * 0.5, 'rgba(40,30,60,.6)');
      c.save(); c.shadowColor = '#ffd23f'; c.shadowBlur = s * 0.25; eyes(c, 0, s * 0.05, s * 0.24, s * 0.11, { white: '#fff3a0', iris: '#d48a00', brow: 1 }); c.restore();
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.4); c.lineTo(s * 0.22, s * 0.4); c.lineWidth = lw; c.strokeStyle = OL; c.stroke();
      for (const sg of [-1, 1]) { poly(c, [[sg * s * 0.16, s * 0.4], [sg * s * 0.1, s * 0.4], [sg * s * 0.13, s * 0.3]]); c.fillStyle = '#fff'; c.fill(); }
    },
    curse(c, s) {
      const lw = s * 0.07;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, s * 0.05, s * (0.45 + k * 0.2), k, k + 4); c.lineWidth = lw * (1.4 - k * 0.3); c.strokeStyle = 'rgba(200,150,255,' + (0.8 - k * 0.2) + ')'; c.stroke(); }
      c.save(); c.shadowColor = '#e0b8ff'; c.shadowBlur = s * 0.35; moonPath(c, -s * 0.05, s * 0.0, s * 0.48); fl(c, lgr(c, -s * 0.5, s * 0.5, '#fbf3ff', '#b886f0'), lw); c.restore();
      eyes(c, -s * 0.2, s * 0.0, s * 0.0, s * 0.07, { closed: 1 });
      for (const [x, y, r] of [[0.55, -0.6, 0.12], [0.7, 0.2, 0.09], [-0.65, -0.55, 0.1], [0.35, 0.65, 0.08]]) sparkle(c, s * x, s * y, s * r, '#f3e6ff');
    },
    // ---------- רק לגיבורים ----------
    turtle(c, s) {
      const lw = s * 0.07;
      E(c, 0, s * 0.6, s * 0.85, s * 0.42); fl(c, rg(c, 0, s * 0.5, s * 0.85, '#9bd36a', '#3f7a2a'), lw);
      for (const [x, y] of [[-0.4, 0.55], [0, 0.45], [0.4, 0.55]]) { poly(c, [[s * (x - 0.15), s * y], [s * (x - 0.07), s * (y - 0.12)], [s * (x + 0.07), s * (y - 0.12)], [s * (x + 0.15), s * y], [s * (x + 0.07), s * (y + 0.12)], [s * (x - 0.07), s * (y + 0.12)]]); c.lineWidth = lw * 0.5; c.strokeStyle = 'rgba(30,60,20,.6)'; c.stroke(); }
      E(c, 0, -s * 0.02, s * 0.5, s * 0.46); fl(c, rg(c, 0, -s * 0.02, s * 0.5, '#c8f09a', '#5aa83a'), lw);
      eyes(c, 0, -s * 0.05, s * 0.2, s * 0.11, { closed: 1 });
      blush(c, -s * 0.3, s * 0.12, s * 0.08); blush(c, s * 0.3, s * 0.12, s * 0.08);
      smile(c, 0, s * 0.2, s * 0.12, lw * 0.8);
      c.beginPath(); c.moveTo(-s * 0.45, -s * 0.3); c.quadraticCurveTo(-s * 0.1, -s * 0.95, s * 0.65, -s * 0.55); c.quadraticCurveTo(s * 0.2, -s * 0.5, s * 0.45, -s * 0.3); c.closePath(); fl(c, lgr(c, -s * 0.9, -s * 0.3, '#7fb2ff', '#2f5fc4'), lw);
      E(c, s * 0.68, -s * 0.55, s * 0.11, s * 0.11); fl(c, '#ffffff', lw * 0.6);
      for (const [x, y] of [[-0.6, 0.85], [0.7, 0.8]]) { E(c, s * x, s * y, s * 0.12, s * 0.08); fl(c, '#6abf4a', lw * 0.5); }
    },
    hero(c, s) {
      const lw = s * 0.07;
      E(c, 0, s * 0.08, s * 0.74, s * 0.78); fl(c, rg(c, 0, 0, s * 0.78, '#6fa8ff', '#2442a8'), lw);
      E(c, 0, s * 0.14, s * 0.5, s * 0.5); fl(c, rg(c, 0, s * 0.1, s * 0.5, '#ffe2c6', '#eaa878'), lw);
      c.beginPath(); c.moveTo(-s * 0.5, s * 0.02); c.quadraticCurveTo(-s * 0.4, -s * 0.38, 0, -s * 0.38); c.quadraticCurveTo(s * 0.4, -s * 0.38, s * 0.5, s * 0.02); c.quadraticCurveTo(s * 0.3, -s * 0.12, s * 0.12, -s * 0.06); c.quadraticCurveTo(0, -s * 0.2, -s * 0.15, -s * 0.05); c.quadraticCurveTo(-s * 0.3, -s * 0.12, -s * 0.5, s * 0.02); c.closePath(); fl(c, '#7a4a24', lw * 0.8);
      eyes(c, 0, s * 0.12, s * 0.19, s * 0.1, { iris: '#2a4a8a' });
      blush(c, -s * 0.3, s * 0.3, s * 0.08); blush(c, s * 0.3, s * 0.3, s * 0.08);
      smile(c, 0, s * 0.36, s * 0.12, lw * 0.8);
      c.beginPath(); c.arc(0, s * 0.1, s * 0.62, Math.PI * 1.08, Math.PI * 1.92); c.lineWidth = lw * 1.4; c.strokeStyle = '#9cc4ff'; c.stroke();
      star(c, 0, s * 0.74, s * 0.13, '#ffd23f');
    },
  };
  // תוספות לפרצופי היריבים
  function hatFor(c, s, art) {
    const lw = s * 0.07;
    if (art === 'owl') {
      for (const sg of [-1, 1]) { E(c, sg * s * 0.24, -s * 0.1, s * 0.25, s * 0.25); c.lineWidth = lw * 1.1; c.strokeStyle = '#3a2a1a'; c.stroke(); }
      line(c, [[-s * 0.02, -s * 0.12], [s * 0.02, -s * 0.12]], lw);
      poly(c, [[-s * 0.6, -s * 0.62], [0, -s * 0.86], [s * 0.6, -s * 0.62], [0, -s * 0.4]]); fl(c, '#2a2a3a', lw);
      line(c, [[s * 0.1, -s * 0.62], [s * 0.45, -s * 0.5], [s * 0.45, -s * 0.28]], lw * 0.7, '#ffd23f');
    } else if (art === 'crab') {
      c.beginPath(); c.moveTo(-s * 0.7, -s * 0.18); c.quadraticCurveTo(0, -s * 1.05, s * 0.7, -s * 0.18); c.quadraticCurveTo(0, -s * 0.45, -s * 0.7, -s * 0.18); c.closePath(); fl(c, '#22202e', lw);
      line(c, [[-s * 0.55, -s * 0.28], [0, -s * 0.5], [s * 0.55, -s * 0.28]], lw * 0.7, '#ffd23f');
      E(c, 0, -s * 0.62, s * 0.1, s * 0.1); fl(c, '#ffffff', lw * 0.5);
    } else if (art === 'eagle') {
      poly(c, [[-s * 0.32, -s * 0.62], [-s * 0.38, -s * 0.98], [-s * 0.16, -s * 0.8], [0, -s * 1.05], [s * 0.16, -s * 0.8], [s * 0.38, -s * 0.98], [s * 0.32, -s * 0.62]]); fl(c, lgr(c, -s * 1.05, -s * 0.62, '#fff3a0', '#e0a010'), lw);
      E(c, 0, -s * 0.76, s * 0.06, s * 0.06); c.fillStyle = '#ff4d6d'; c.fill();
    }
  }

  // ---------- ציור: קלף שלם ----------
  function g2rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fitSize(c, s, size, maxW, weight) { c.font = (weight || 800) + ' ' + size + 'px ' + FONT; const w = c.measureText(s).width; return w <= maxW ? size : Math.max(7, Math.floor(size * maxW / w * 10) / 10); }
  function wrap(c, s, size, maxW, weight) {
    c.font = (weight || 700) + ' ' + size + 'px ' + FONT;
    const words = String(s).split(' '), out = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || c.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
    return out;
  }
  // גודל הכתב הגדול ביותר שבו הטקסט נכנס לתיבה
  function fitBlock(c, s, maxW, maxH, size, weight) {
    for (let z = size; z >= 7; z -= 0.5) { const ls = wrap(c, s, z, maxW, weight); if (ls.length * z * 1.16 <= maxH && ls.every(l => c.measureText(l).width <= maxW)) return { ls, z }; }
    return { ls: wrap(c, s, 7, maxW, weight), z: 7 };
  }
  const tt = (U, k, v) => String(U.t(k, v)).replace(/\{(\w+)\}/g, (m, n) => (v && v[n] !== undefined ? v[n] : m));
  function fxText(U, C) {
    if (!C.unit) return tt(U, 'sp_' + C.sp.k, { n: C.sp.n, a: C.sp.a, h: C.sp.h });
    if (C.fx) return tt(U, 'fx_' + C.fx.k, { n: C.fx.n });
    if (C.die) return tt(U, 'die_face', { n: C.die.n });
    return '';
  }
  const kwText = (U, C) => C.kw.split('').map(k => U.t('kw_' + k)).join(' · ');
  function emblem(c, x, y, r, el) {
    E(c, x, y, r, r); fl(c, rg(c, x, y, r, '#ffffff', EL[el].m), r * 0.18);
    c.save(); c.translate(x, y);
    if (el === 'forest') leaf(c, -r * 0.55, r * 0.35, r * 1.2, r * 0.38, -0.7, '#2f8a2a', r * 0.12);
    else if (el === 'fire') flame(c, 0, r * 0.1, r * 0.9, r * 0.75, '#fff07a', '#e8361a', r * 0.1);
    else if (el === 'water') { c.beginPath(); c.moveTo(0, -r * 0.65); c.quadraticCurveTo(r * 0.55, 0, 0, r * 0.55); c.quadraticCurveTo(-r * 0.55, 0, 0, -r * 0.65); fl(c, '#2a7ad8', r * 0.1); }
    else if (el === 'sky') { boltPath(c, 0, 0, r * 0.62); fl(c, '#ffd21f', r * 0.1); }
    else { moonPath(c, -r * 0.05, 0, r * 0.5); fl(c, '#7a44c8', r * 0.1); }
    c.restore();
  }
  function gem(c, U, x, y, r, n, col) {
    poly(c, [[x, y - r], [x + r * 0.9, y - r * 0.35], [x + r * 0.9, y + r * 0.45], [x, y + r], [x - r * 0.9, y + r * 0.45], [x - r * 0.9, y - r * 0.35]]);
    fl(c, rg(c, x, y, r, '#c6ecff', col || '#1f62d8'), r * 0.14);
    U.text(c, String(n), x, y + r * 0.06, { size: r * 1.25, weight: 900, color: '#fff', stroke: OL, strokeW: r * 0.28 });
  }
  function atkBadge(c, U, x, y, r, n, col) {
    c.save(); c.translate(x, y); c.rotate(-0.78);
    poly(c, [[-r * 0.12, -r * 1.25], [r * 0.12, -r * 1.25], [r * 0.12, r * 0.6], [-r * 0.12, r * 0.6]]); fl(c, '#e8eef8', r * 0.1);
    c.restore();
    E(c, x, y, r, r); fl(c, rg(c, x, y, r, '#fff0a0', '#e08a1c'), r * 0.14);
    U.text(c, String(n), x, y + r * 0.06, { size: r * 1.25, weight: 900, color: col || '#fff', stroke: OL, strokeW: r * 0.28 });
  }
  function hpBadge(c, U, x, y, r, n, col) {
    c.beginPath(); c.moveTo(x, y - r * 1.15); c.bezierCurveTo(x + r * 0.6, y - r * 0.5, x + r * 1.0, y - r * 0.05, x + r * 1.0, y + r * 0.25); c.arc(x, y + r * 0.25, r, 0, Math.PI); c.bezierCurveTo(x - r, y - r * 0.05, x - r * 0.6, y - r * 0.5, x, y - r * 1.15); c.closePath();
    fl(c, rg(c, x, y, r, '#ffb0b0', '#c81e3a'), r * 0.14);
    U.text(c, String(n), x, y + r * 0.22, { size: r * 1.2, weight: 900, color: col || '#fff', stroke: OL, strokeW: r * 0.28 });
  }
  function artBg(c, U, el, cx, cy, w, h) {
    const P = EL[el], q = c.createRadialGradient(cx, cy - h * 0.25, 3, cx, cy, Math.max(w, h) * 0.75);
    q.addColorStop(0, P.b0); q.addColorStop(1, P.b1);
    c.fillStyle = q; c.fillRect(cx - w, cy - h, w * 2, h * 2);
    const R0 = U.seeded(el.length * 97 + 3);
    c.save();
    if (el === 'forest') { c.fillStyle = 'rgba(30,100,30,.35)'; E(c, cx - w * 0.3, cy + h * 0.55, w * 0.5, h * 0.3); c.fill(); E(c, cx + w * 0.35, cy + h * 0.6, w * 0.55, h * 0.32); c.fill(); }
    else if (el === 'fire') { for (let i = 0; i < 14; i++) { E(c, cx + (R0() - 0.5) * w, cy + (R0() - 0.5) * h, 1 + R0() * 2, 1 + R0() * 2); c.fillStyle = 'rgba(255,240,170,.75)'; c.fill(); } }
    else if (el === 'water') { for (let i = 0; i < 9; i++) { E(c, cx + (R0() - 0.5) * w, cy + (R0() - 0.5) * h, 2 + R0() * 4, 2 + R0() * 4); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); } }
    else if (el === 'sky') { c.fillStyle = 'rgba(255,255,255,.7)'; for (const k of [-0.35, 0.05, 0.4]) { E(c, cx + k * w, cy + h * 0.45, w * 0.18, h * 0.14); c.fill(); } }
    else { for (let i = 0; i < 16; i++) { E(c, cx + (R0() - 0.5) * w, cy + (R0() - 0.5) * h, 0.7 + R0() * 1.2, 0.7 + R0() * 1.2); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); } }
    c.restore();
  }
  // הקלף בגודל מלא (150×210), מהפינה (0,0)
  function paintCard(c, U, id) {
    const C = CARDS[id], P = EL[C.el];
    c.save();
    g2rr(c, 0, 0, CW, CH, 13);
    const q = c.createLinearGradient(0, 0, 0, CH); q.addColorStop(0, U.shade(P.m, 0.38)); q.addColorStop(0.45, P.m); q.addColorStop(1, P.d);
    c.fillStyle = q; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OL; c.stroke();
    if (!C.unit) { c.save(); c.setLineDash([2, 4]); g2rr(c, 3.5, 3.5, CW - 7, CH - 7, 11); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,240,190,.8)'; c.stroke(); c.restore(); }
    g2rr(c, 7, 7, CW - 14, CH - 14, 9); c.fillStyle = U.shade(P.d, -0.35); c.fill();
    c.save();
    const win = () => { if (C.unit) g2rr(c, 11, 11, CW - 22, 92, 9); else E(c, CW / 2, 57, 63, 47); };
    win(); c.clip();
    artBg(c, U, C.el, CW / 2, 57, 130, 94);
    c.translate(CW / 2, 62); ART[id](c, 33, U);
    c.restore();
    win(); c.lineWidth = 2.5; c.strokeStyle = U.shade(P.l, 0.2); c.stroke();
    // סרט השם
    c.beginPath(); c.moveTo(3, 100); c.lineTo(CW - 3, 100); c.lineTo(CW - 9, 112); c.lineTo(CW - 3, 124); c.lineTo(3, 124); c.lineTo(9, 112); c.closePath();
    c.fillStyle = lgr(c, 100, 124, U.shade(P.m, 0.15), P.d); c.fill(); c.lineWidth = 1.6; c.strokeStyle = OL; c.stroke();
    const nm = U.t('c_' + id);
    U.text(c, nm, CW / 2, 112.5, { size: fitSize(c, nm, 15, CW - 30, 900), weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 3 });
    // תיבת הטקסט
    g2rr(c, 13, 128, CW - 26, 60, 7); c.fillStyle = lgr(c, 128, 188, '#fbf3e0', '#e6d3ad'); c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(60,40,20,.5)'; c.stroke();
    const kw = kwText(U, C), fx = fxText(U, C), maxW = CW - 34;
    let y = 133;
    if (kw) { const z = fitSize(c, kw, 13, maxW, 900); U.text(c, kw, CW / 2, y + z / 2 + 1, { size: z, weight: 900, color: P.d }); y += z + 3; }
    if (fx) { const b = fitBlock(c, fx, maxW, 181 - y, 12.5, 700); b.ls.forEach((l, i) => U.text(c, l, CW / 2, y + b.z * 0.58 + i * b.z * 1.16, { size: b.z, weight: 700, color: '#3a2a1a' })); }
    if (!kw && !fx) { c.globalAlpha = 0.35; emblem(c, CW / 2, 158, 15, C.el); c.globalAlpha = 1; }
    gem(c, U, 19, 19, 16, C.c);
    emblem(c, CW - 18, 18, 10, C.el);
    if (C.unit) { atkBadge(c, U, 19, CH - 17, 15, C.a); hpBadge(c, U, CW - 19, CH - 19, 15, C.h); }
    c.restore();
  }
  function cardBack(c, U, x, y, w, h) {
    c.save();
    g2rr(c, x, y, w, h, w * 0.09);
    const q = c.createLinearGradient(x, y, x + w, y + h); q.addColorStop(0, '#4a4fc4'); q.addColorStop(1, '#1d1e5a');
    c.fillStyle = q; c.fill(); c.lineWidth = Math.max(1, w * 0.035); c.strokeStyle = '#e8c26a'; c.stroke();
    g2rr(c, x + w * 0.1, y + w * 0.1, w * 0.8, h - w * 0.2, w * 0.06); c.lineWidth = Math.max(0.7, w * 0.02); c.strokeStyle = 'rgba(232,194,106,.6)'; c.stroke();
    const cx = x + w / 2, cy = y + h / 2, r = w * 0.25;
    E(c, cx, cy, r, r); c.fillStyle = 'rgba(232,194,106,.22)'; c.fill(); c.stroke();
    star(c, cx, cy, r * 0.72, '#f3d27a');
    c.restore();
  }

  // ---------- מקומות על המסך (עולם 1280×720) ----------
  const SLOTX = i => 640 + (i - 2) * 134;
  const ROWY = [452, 262];                    // שורת היצורים שלך (0) ושל האויב (1)
  const UW = 112, UH = 134;                   // יצור על הלוח
  const HEROP = [{ x: 132, y: 566 }, { x: 132, y: 150 }], HR = 58;
  const HAND_Y = 676, HAND_S = 0.8, HAND_TOP = 574, BIG_S = 1.25;
  const ENDB = { x: 1072, y: 324, w: 176, h: 66 };
  const DECKP = [{ x: 1160, y: 548 }, { x: 1160, y: 168 }];
  const MAT = { x: 286, y: 186, w: 708, h: 342 };
  const ELS = ['forest', 'fire', 'water', 'sky', 'shadow'];
  const OART = { owl: 'owlet' };
  const FACE = { forest: 'bear', fire: 'phoenix', water: 'kraken', sky: 'eagle', shadow: 'cat' };
  // סדר העדיפות של "מלא לבד" (הקלפים החזקים קודם)
  const PRIO = 'fireball curse wave titan dragon kraken serpent phoenix pony oak gargoyle cat eagle knight lizard bear wolf snake jelly owlet fox wisdom zap growth imp crab bat sprout bunny dew'.split(' ');
  const posOf = r => (R.isHero(r) ? HEROP[R.sideOf(r)] : { x: SLOTX(R.slotOf(r)), y: ROWY[R.sideOf(r)] });

  // ---------- מטמון ציורים: כל קלף מצויר פעם אחת לתמונה, ואז רק מועתק ----------
  const cache = new Map();
  let cacheKey = '';
  const resK = g => Math.max(1, Math.min(2.5, g.canvas && g.canvas.width ? g.canvas.width / W : 1));
  function cached(g, key, w, h, paint) {
    const k = resK(g), ck = g.lang + ':' + k;
    if (ck !== cacheKey) { cache.clear(); cacheKey = ck; }
    let c = cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
      const x = c.getContext('2d'); x.scale(k, k); paint(x);
      cache.set(key, c);
    }
    return c;
  }
  const cardImg = (g, id) => cached(g, 'c:' + id, CW, CH, x => paintCard(x, g, id));
  const backImg = g => cached(g, 'back', CW, CH, x => cardBack(x, g, 0, 0, CW, CH));
  const ART_W = 100, ART_H = 92;
  const artImg = (g, id) => cached(g, 'a:' + id, ART_W, ART_H, x => {
    g2rr(x, 0, 0, ART_W, ART_H, 10); x.clip();
    artBg(x, g, CARDS[id].el, ART_W / 2, ART_H / 2, ART_W, ART_H);
    x.translate(ART_W / 2, ART_H / 2 + 5); ART[id](x, 32, g);
  });
  const heroImg = (g, art, el) => cached(g, 'h:' + art, 128, 128, x => {
    E(x, 64, 64, 63, 63); x.clip();
    artBg(x, g, el, 64, 64, 128, 128);
    x.translate(64, 72); ART[OART[art] || art](x, 42, g); hatFor(x, 42, art);
  });

  // ---------- התקדמות: קלפים פתוחים וחפיסות ----------
  function unlockedSet(g) { const s = new Set(START); OPP.forEach((o, i) => { if (g.levelStars(i + 1) > 0) o.rw.forEach(id => s.add(id)); }); return s; }
  const deckOpen = (id, un) => id === 'mine' || DECKS.some(D => D.id === id && D.list.every(c => un.has(c)));
  function lockedBy(id, un) {   // היריב שהניצחון עליו פותח את החפיסה
    const D = DECKS.find(d => d.id === id); let k = -1;
    if (D) for (const c of D.list) if (!un.has(c)) k = Math.max(k, OPP.findIndex(o => o.rw.includes(c)));
    return k;
  }
  const countIn = (list, id) => list.reduce((n, x) => n + (x === id ? 1 : 0), 0);
  function autoFill(list, un) {
    const out = list.slice();
    let big = out.filter(x => CARDS[x].c >= 5).length;
    for (const pass of [0, 1]) for (const id of PRIO) {
      if (!un.has(id)) continue;
      while (out.length < DECK && countIn(out, id) < COPIES) {
        if (!pass && CARDS[id].c >= 5 && big >= 6) break;
        out.push(id); if (CARDS[id].c >= 5) big++;
      }
    }
    return out;
  }
  function mineDeck(g) {
    const un = unlockedSet(g), raw = g.load('mine', null), out = [];
    for (const id of Array.isArray(raw) ? raw : DECKS[0].list) if (CARDS[id] && un.has(id) && out.length < DECK && countIn(out, id) < COPIES) out.push(id);
    return out.length < DECK ? autoFill(out, un) : out;
  }
  const deckList = (g, id) => (id === 'mine' ? mineDeck(g) : (DECKS.find(D => D.id === id) || DECKS[0]).list.slice());
  const faceOf = (g, id) => (id === 'mine' ? mineDeck(g).slice().sort((a, b) => CARDS[b].c - CARDS[a].c)[0] : FACE[id]);

  // ---------- מצב הקרב שמוצג (V) מתעדכן אירוע אחרי אירוע, כדי שכל מכה תיראה ----------
  function mkUnit(u, id) { const C = CARDS[id], kw = C.kw; return { u, id, atk: C.a, hp: C.h, max: C.h, g: kw.includes('g'), sw: kw.includes('s'), sh: kw.includes('h'), po: kw.includes('p'), sick: true, done: false }; }
  const viewOf = B => ({ t: B.t, cur: B.cur, p: B.p.map(P => ({ hp: P.hp, max: P.max, mana: P.mana, mm: P.mm, deckN: P.deck.length, hand: P.hand.map(c => ({ u: c.u, id: c.id })), b: P.b.map(u => (u ? Object.assign({}, u) : null)) })) });
  function newState(g) {
    return {
      phase: 'prep', clock: 0, B: null, V: null, opp: OPP[Math.max(0, Math.min(OPP.length - 1, g.level - 1))], q: [], wait: 0, synced: true, aiT: 0,
      fxu: new Map(), hpos: new Map(), heroHit: [-9, -9], ghosts: [], shots: [], flys: [], sweeps: [], banner: null, show: null, say: null, reveal: null, lost: null,
      drag: null, sel: null, pend: null, peek: null, hover: null, hoverT: 0, idleT: 0, castAt: null, done: false, botT: 0, turbo: 0, tut: false,
      deck: g.load('deck', 'forest'), ed: null, btns: [], btnHover: null,
    };
  }
  const busy = S => S.q.length > 0 || S.wait > 0 || !S.synced;
  const canAct = S => S.phase === 'battle' && !!S.B && S.B.cur === 0 && S.B.win < 0 && !busy(S) && !S.done;
  const fxOf = (S, u) => { let f = S.fxu.get(u); if (!f) { f = { born: -9, hit: -9, lunge: null }; S.fxu.set(u, f); } return f; };
  function say(g, key) { g.msg(g.t(key), 1300); g.sfx('error'); }

  function act(g, S, a) {
    for (const e of R.apply(S.B, a)) S.q.push(e);
    S.synced = false; S.idleT = 0;
  }
  function playCard(g, S, hi, slot, tg) {
    if (!canAct(S) || !R.canPlay(S.B, hi, slot, tg)) return false;
    const c = S.V.p[0].hand[hi], hp = c && S.hpos.get(c.u);
    if (!S.castAt && hp) S.castAt = { x: hp.x, y: hp.y };
    act(g, S, { t: 'play', hi, slot, tg });
    S.sel = null; S.pend = null;
    return true;
  }
  function attackWith(g, S, i, tg) {
    if (!canAct(S) || !R.canAttack(S.B, i, tg)) return false;
    act(g, S, { t: 'atk', i, tg });
    S.sel = null;
    return true;
  }
  function endTurn(g, S) {
    if (!canAct(S)) return false;
    S.sel = S.pend = S.drag = null;
    act(g, S, R.END);
    return true;
  }

  // ---------- אירועים: כל אירוע מהחוקים מקבל אנימציה, צליל וזמן ----------
  function heroHit(g, S, s, n) {
    const p = HEROP[s];
    S.heroHit[s] = S.clock;
    g.float(p.x, p.y - 34, '-' + n, { color: '#ff4d4d', size: 46 });
    g.burst(p.x, p.y, { n: 22, color: ['#ff6b6b', '#ffd166', '#ffffff'], speed: 5, life: 30 });
    g.shake(5 + Math.min(10, n));
    if (s === 0) g.flash('#ff2020', 0.16);
  }
  function castFx(g, S, s, id, x, y) {
    const C = CARDS[id], e = C.unit ? C.fx : C.sp;
    if (!e) return 0;
    if (e.k === 'aoe') { S.sweeps.push({ side: 1 - s, t0: S.clock, el: C.el }); g.sfx('boom'); g.shake(7); return 0.42; }
    const nx = S.q[0];
    if ((e.k === 'dmg' || e.k === 'kill' || e.k === 'buff') && nx && nx.r != null) {
      const p = posOf(nx.r);
      S.shots.push({ x0: x, y0: y, x1: p.x, y1: p.y, t0: S.clock, dur: 0.3, el: C.el, k: e.k });
      g.sfx(e.k === 'buff' ? 'jump' : 'laser');
      return 0.3;
    }
    if (e.k === 'heal') { const p = HEROP[s]; S.shots.push({ x0: x, y0: y, x1: p.x, y1: p.y, t0: S.clock, dur: 0.3, el: 'forest', k: 'heal' }); return 0.3; }
    return 0.1;
  }
  function fire(g, S, e) {
    const V = S.V, cl = S.clock;
    switch (e.e) {
      case 'draw': {
        const P = V.p[e.s], d = DECKP[e.s];
        P.deckN = Math.max(0, P.deckN - 1);
        P.hand.push({ u: e.u, id: e.id });
        S.hpos.set(e.u, { x: d.x, y: d.y, r: e.s ? 0.3 : -0.5, s: 0.42 });
        if (e.s === 0) g.noise({ filter: 'bandpass', f: 1800, f2: 600, dur: 0.12, vol: 0.12 });
        return e.s === 0 ? 0.17 : 0.1;
      }
      case 'burn': {
        const d = DECKP[e.s];
        V.p[e.s].deckN = Math.max(0, V.p[e.s].deckN - 1);
        S.flys.push({ id: e.id, x0: d.x, y0: d.y, x1: d.x - 90, y1: d.y, t0: cl, dur: 0.5, s0: 0.5, s1: 0.5, burn: true });
        g.burst(d.x - 90, d.y, { n: 24, color: ['#ff9a1f', '#ffd166', '#555'], speed: 3, life: 36, gravity: -0.05 });
        if (e.s === 0) g.msg(g.t('handFull'), 1300);
        g.sfx('break');
        return 0.5;
      }
      case 'fat': {
        V.p[e.s].hp -= e.n;
        heroHit(g, S, e.s, e.n);
        g.msg(g.t('fatigue', { n: e.n }), 1400);
        g.sfx('hit');
        return 0.55;
      }
      case 'pay': {
        const P = V.p[e.s], k = P.hand.findIndex(c => c.u === e.u), C = CARDS[e.id];
        const hp = S.hpos.get(e.u);
        if (k >= 0) P.hand.splice(k, 1);
        P.mana = Math.max(0, P.mana - C.c);
        if (!C.unit) S.q.unshift({ e: 'cast', s: e.s, id: e.id });   // הכישוף פועל אחרי שרואים את הקלף
        if (e.s === 1) { S.show = { id: e.id, t0: cl, x: hp ? hp.x : 640, y: hp ? hp.y : 40 }; g.sfx('whoosh'); return 1.0; }
        if (!C.unit) {
          const at = S.castAt || { x: 640, y: 430 };
          S.flys.push({ id: e.id, x0: hp ? hp.x : at.x, y0: hp ? hp.y : at.y, x1: at.x, y1: Math.min(at.y, 430), t0: cl, dur: 0.22, s0: 0.9, s1: 0.75, fade: true });
          return 0.2;
        }
        S.lastPaid = { id: e.id, x: hp ? hp.x : 640, y: hp ? hp.y : 620 };
        return 0;
      }
      case 'cast': {
        const at = e.s === 1 ? { x: 640, y: 300 } : { x: (S.castAt || {}).x || 640, y: Math.min((S.castAt || {}).y || 430, 430) };
        if (e.s === 1) S.show = null;
        const P = EL[CARDS[e.id].el];
        g.burst(at.x, at.y, { n: 26, color: [P.l, P.m, '#ffffff'], speed: 4, life: 30 });
        return castFx(g, S, e.s, e.id, at.x, at.y);
      }
      case 'sum': {
        const s = R.sideOf(e.r), i = R.slotOf(e.r), C = CARDS[e.id], x = SLOTX(i), y = ROWY[s];
        const from = s === 1 ? (S.show ? { x: 640, y: 300 } : { x: 640, y: 40 }) : S.lastPaid || { x, y: 620 };
        S.flys.push({ id: e.id, x0: from.x, y0: from.y, x1: x, y1: y, t0: cl, dur: 0.16, s0: s === 1 ? 1 : 0.8, s1: 0.6, fade: true });
        if (s === 1) S.show = null;
        V.p[s].b[i] = mkUnit(e.u, e.id);
        fxOf(S, e.u).born = cl + 0.12;
        g.after(0.12 / Math.max(1, S.turbo || 1), () => g.burst(x, y + UH * 0.42, { n: 18, color: [EL[C.el].l, '#ffffff', EL[C.el].m], speed: 3.2, life: 28, gravity: 0.06, spread: Math.PI, dir: -Math.PI / 2 }));
        g.sfx('place');
        return 0.3 + castFx(g, S, s, e.id, x, y);
      }
      case 'atk': {
        const s = R.sideOf(e.r), u = V.p[s].b[R.slotOf(e.r)];
        if (u) { u.done = true; const a = posOf(e.r), b = posOf(e.tg); fxOf(S, u.u).lunge = { dx: b.x - a.x, dy: b.y - a.y, t0: cl }; }
        g.sfx('whoosh');
        return 0.2;
      }
      case 'dmg': {
        const s = R.sideOf(e.r), p = posOf(e.r);
        if (R.isHero(e.r)) { V.p[s].hp -= e.n; heroHit(g, S, s, e.n); g.sfx('hit'); return 0.12; }
        const u = V.p[s].b[R.slotOf(e.r)];
        if (u) { u.hp -= e.n; fxOf(S, u.u).hit = cl; }
        g.float(p.x, p.y - 26, '-' + e.n, { color: '#ff5050', size: 38 });
        g.burst(p.x, p.y, { n: 14, color: ['#ffd166', '#ff7b54', '#ffffff'], speed: 4, life: 26 });
        g.shake(3 + Math.min(6, e.n));
        g.sfx('hit');
        return 0.06;
      }
      case 'pop': {
        const p = posOf(e.r), u = V.p[R.sideOf(e.r)].b[R.slotOf(e.r)];
        if (u) u.sh = false;
        g.burst(p.x, p.y, { n: 26, color: ['#fff3a0', '#ffd23f', '#ffffff'], speed: 5, life: 30, shape: 'square' });
        g.sfx('break', { p: 1.3 });
        return 0.14;
      }
      case 'poison': case 'kill': {
        const p = posOf(e.r), u = V.p[R.sideOf(e.r)].b[R.slotOf(e.r)];
        if (u) { u.hp = 0; fxOf(S, u.u).hit = cl; }
        g.burst(p.x, p.y, { n: 30, color: e.e === 'poison' ? ['#7dff6a', '#2fae3a', '#e8ffd0'] : ['#c58bff', '#6b2fc8', '#ffffff'], speed: 4, life: 34, gravity: -0.03 });
        g.sfx(e.e === 'poison' ? 'pop' : 'laser', { p: 0.6 });
        return 0.16;
      }
      case 'heal': {
        const p = HEROP[R.sideOf(e.r)];
        V.p[R.sideOf(e.r)].hp += e.n;
        if (e.n > 0) g.float(p.x, p.y - 34, '+' + e.n, { color: '#6dff8a', size: 42 });
        g.burst(p.x, p.y, { n: 22, color: ['#b8ffb0', '#ffffff', '#5ee06a'], speed: 2.5, life: 40, gravity: -0.06 });
        g.sfx('power');
        return 0.35;
      }
      case 'buff': {
        const p = posOf(e.r), u = V.p[R.sideOf(e.r)].b[R.slotOf(e.r)];
        if (u) { u.atk += e.a; u.hp += e.h; u.max += e.h; }
        g.float(p.x, p.y - 30, '+' + e.a + '/+' + e.h, { color: '#7dff6a', size: 34 });
        g.burst(p.x, p.y, { n: 24, color: ['#fff6a0', '#b8ffb0', '#ffffff'], speed: 3, life: 36, gravity: -0.05 });
        g.sfx('power');
        return 0.35;
      }
      case 'die': {
        const s = R.sideOf(e.r), i = R.slotOf(e.r), p = posOf(e.r), u = V.p[s].b[i] || e.u;
        V.p[s].b[i] = null;
        S.ghosts.push({ u: Object.assign({}, u), x: p.x, y: p.y, t0: cl });
        g.burst(p.x, p.y, { n: 30, color: [EL[CARDS[u.id].el].m, EL[CARDS[u.id].el].l, '#ffffff'], speed: 4.5, life: 36 });
        g.sfx('break');
        if (CARDS[u.id].die) { const h = HEROP[1 - s]; S.shots.push({ x0: p.x, y0: p.y, x1: h.x, y1: h.y, t0: cl, dur: 0.32, el: CARDS[u.id].el, k: 'dmg' }); return 0.36; }
        return 0.3;
      }
      case 'turn': {
        const P = V.p[e.s], BP = S.B.p[e.s];
        V.cur = e.s; V.t = S.B.t;
        P.mm = BP.mm; P.mana = BP.mana;
        for (const u of P.b) if (u) { u.sick = false; u.done = false; }
        S.banner = { txt: g.t(e.s === 0 ? 'yourTurn' : 'enemyTurn'), t0: cl, col: e.s === 0 ? '#ffd84d' : '#ff8a8a' };
        if (e.s === 0) g.sfx('score'); else g.tone({ f: 330, f2: 220, dur: 0.25, type: 'triangle', vol: 0.12 });
        S.aiT = 0;
        return e.s === 0 ? 0.7 : 0.6;
      }
    }
    return 0;
  }
  function runQueue(g, S, dt) {
    if (S.wait > 0) { S.wait -= dt; if (S.wait > 0) return; }
    let n = 0;
    while (S.q.length && S.wait <= 0 && n++ < 60) {
      const e = S.q.shift();
      let d = fire(g, S, e);
      if (S.q.length && S.q[0].e === 'die' && e.e !== 'die') d += 0.32;   // רגע לראות את המכה לפני שהיצור נעלם
      S.wait += d;
    }
    if (!S.q.length) {
      if (S.wait < 0) S.wait = 0;
      if (S.wait <= 0 && !S.synced) { const nv = viewOf(S.B); if (S.check) S.check(S.V, nv); S.V = nv; S.synced = true; S.castAt = null; S.lastPaid = null; }
    }
  }

  // ---------- תחילת קרב, תור המחשב, סוף ----------
  function startBattle(g, S) {
    const o = OPP[g.level - 1], deck0 = deckList(g, S.deck);
    S.opp = o;
    S.B = R.newBattle({ hp0: PHP, hp1: o.hp, deck0, deck1: parse(o.deck) });
    S.V = viewOf(S.B);
    for (const P of S.V.p) { P.deckN += P.hand.length; P.hand = []; P.mana = P.mm = 0; }
    S.V.t = 0;
    S.q = S.B.ev.slice(); S.synced = false; S.wait = 0.45;
    S.phase = 'battle';
    S.say = { txt: g.t('q_' + o.id), t0: S.clock };
    S.tut = g.level === 1 && !g.load('tut', 0);
    S.deckName = g.t('d_' + S.deck);
    g.sfx('start');
  }
  function stepBattle(g, S) {
    const sp = S.turbo || 1, dt = sp / 60;
    S.clock += dt;
    runQueue(g, S, dt);
    tidy(S);
    S.legal = canAct(S) ? R.legal(S.B) : null;   // מה אפשר לעשות עכשיו (זוהר על קלפים, רמזים)
    if (busy(S) || S.done) return;
    if (S.B.win >= 0) return finish(g, S);
    if (S.B.cur === 1) {
      S.aiT += dt;
      if (S.aiT >= 0.62) { S.aiT = 0; act(g, S, R.aiAction(S.B, S.opp.ai, Math.random, S.opp.err)); }
    } else S.idleT += dt;
  }
  function tidy(S) {   // אנימציות שנגמרו יוצאות מהרשימות
    const c = S.clock;
    if (S.ghosts.length) S.ghosts = S.ghosts.filter(o => c - o.t0 < 0.6);
    if (S.shots.length) S.shots = S.shots.filter(o => c - o.t0 < o.dur);
    if (S.flys.length) S.flys = S.flys.filter(o => c - o.t0 < o.dur);
    if (S.sweeps.length) S.sweeps = S.sweeps.filter(o => c - o.t0 < 0.7);
  }
  function finish(g, S) {
    if (S.done) return;
    S.done = true; S.sel = S.drag = S.pend = null;
    const w = S.B.win, o = S.opp;
    for (const s of w === 2 ? [0, 1] : [1 - w]) { const p = HEROP[s]; g.burst(p.x, p.y, { n: 70, color: ['#ffd166', '#ff7b54', '#ffffff', EL[s ? o.el : 'sky'].m], speed: 7, life: 50 }); }
    g.shake(14);
    if (w === 0) {
      const first = !g.levelStars(g.level), before = unlockedSet(g);
      const r = S.B.p[0].hp / PHP, stars = r >= 0.6 ? 3 : r >= 0.3 ? 2 : 1;
      let text = first ? g.t('gotCards', { a: g.t('c_' + o.rw[0]), b: g.t('c_' + o.rw[1]) }) : g.t('haveCards');
      if (first) {
        const after = new Set(before); o.rw.forEach(id => after.add(id));
        const nd = DECKS.find(D => !deckOpen(D.id, before) && deckOpen(D.id, after));
        if (nd) text += ' · ' + g.t('newDeck', { name: g.t('d_' + nd.id) });
        g.save('tut', 1);
      }
      S.reveal = { t0: S.clock, ids: o.rw, first, stars };
      g.completeLevel(stars, { title: g.level >= OPP.length ? g.t('champion') : g.t('victory'), text, delay: 2600 });
    } else {
      S.lost = { t0: S.clock, draw: w === 2 };
      g.end({ result: w === 2 ? 'draw' : 'lose', score: null, title: w === 2 ? undefined : g.t('defeat'), text: g.t(g.pick(['tip1', 'tip2', 'tip3'])), delay: 1500 });
    }
  }
  // ---------- בוט לבדיקות: משחק דרך אותן פעולות שהעכבר מפעיל ----------
  function botStep(g, S) {
    if (S.phase === 'edit') { closeEditor(g, S); return; }
    if (S.phase === 'prep') { if (++S.botT > 24) { S.botT = 0; startBattle(g, S); } return; }
    if (!canAct(S)) { S.botT = 0; return; }
    if (++S.botT < 14 / Math.max(1, S.turbo || 1)) return;
    S.botT = 0;
    const a = R.aiAction(S.B, 2, Math.random);
    if (a.t === 'play') playCard(g, S, a.hi, a.slot, a.tg);
    else if (a.t === 'atk') attackWith(g, S, a.i, a.tg);
    else endTurn(g, S);
  }

  // ---------- היד: איפה כל קלף נח, ואיפה הוא כשמרחפים עליו / גוררים אותו ----------
  function handLayout(n, k) {
    const sp = Math.min(98, 620 / Math.max(1, n)), off = k - (n - 1) / 2;
    return { x: 640 + off * sp, y: HAND_Y + off * off * 2.4, r: off * 0.045, s: HAND_S, sp };
  }
  function enemyHandLayout(n, k) {
    const sp = Math.min(46, 330 / Math.max(1, n)), off = k - (n - 1) / 2;
    return { x: 640 + off * sp, y: 20 - off * off * 1.1, r: -off * 0.06, s: 0.42 };
  }
  const tgSpell = id => !CARDS[id].unit && R.needsTg(CARDS[id].sp);
  const LIFT_Y = H - CH / 2 - 26;
  function handTargets(g, S) {
    const V = S.V, lerp = (p, L, k) => { p.x += (L.x - p.x) * k; p.y += (L.y - p.y) * k; p.r += (L.r - p.r) * k; p.s += (L.s - p.s) * k; };
    const mine = V.p[0].hand, n = mine.length;
    mine.forEach((c, k) => {
      let L = handLayout(n, k), snap = false;
      const d = S.drag && S.drag.kind === 'card' && S.drag.u === c.u && S.drag.moved;
      if (d) { if (tgSpell(c.id)) L = { x: L.x, y: LIFT_Y, r: 0, s: 1 }; else { L = { x: S.drag.x, y: S.drag.y, r: 0, s: 0.86 }; snap = true; } }
      else if ((S.sel && S.sel.kind === 'card' && S.sel.u === c.u) || (S.pend && S.pend.u === c.u)) L = { x: L.x, y: LIFT_Y, r: 0, s: 1 };
      else if (S.hover && S.hover.kind === 'hand' && S.hover.k === k && !S.drag && !S.sel) L = { x: L.x, y: H - CH * BIG_S / 2 - 4, r: 0, s: BIG_S };
      let p = S.hpos.get(c.u);
      if (!p) { p = Object.assign({}, L); S.hpos.set(c.u, p); }
      lerp(p, L, snap ? 0.6 : 0.22);
    });
    const his = V.p[1].hand;
    his.forEach((c, k) => {
      const L = enemyHandLayout(his.length, k);
      let p = S.hpos.get(c.u);
      if (!p) { p = Object.assign({}, L); S.hpos.set(c.u, p); }
      lerp(p, L, 0.2);
    });
    if (S.hpos.size > 60) { const keep = new Set([...mine, ...his].map(c => c.u)); for (const u of [...S.hpos.keys()]) if (!keep.has(u)) S.hpos.delete(u); }
  }

  // ---------- מה נמצא מתחת לעכבר ----------
  const inR = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function handAt(S, x, y) {
    const n = S.V.p[0].hand.length;
    if (!n) return -1;
    const hv = S.hover && S.hover.kind === 'hand' ? S.hover.k : -1;
    if (hv >= 0 && hv < n && !S.drag) { const L = handLayout(n, hv); if (Math.abs(x - L.x) < CW * BIG_S / 2 && y > H - CH * BIG_S - 6) return hv; }
    if (y < HAND_Y - CH * HAND_S / 2 - 6) return -1;
    let best = -1, bd = 1e9;
    for (let k = 0; k < n; k++) { const d = Math.abs(x - handLayout(n, k).x); if (d < CW * HAND_S / 2 && d < bd) { bd = d; best = k; } }
    return best;
  }
  function unitAt(S, x, y) {
    for (const s of [0, 1]) if (Math.abs(y - ROWY[s]) < UH / 2 + 4) for (let i = 0; i < MAXB; i++) if (S.V.p[s].b[i] && Math.abs(x - SLOTX(i)) < UW / 2 + 6) return { s, i };
    return null;
  }
  const heroAt = (x, y) => (Math.hypot(x - HEROP[0].x, y - HEROP[0].y) < HR + 10 ? 0 : Math.hypot(x - HEROP[1].x, y - HEROP[1].y) < HR + 10 ? 1 : -1);
  function refAt(S, x, y) { const u = unitAt(S, x, y); if (u) return R.ref(u.s, u.i); const h = heroAt(x, y); return h >= 0 ? R.ref(h, R.HERO) : -1; }
  function hoverAt(S, x, y) {
    const k = handAt(S, x, y); if (k >= 0) return { kind: 'hand', k };
    const u = unitAt(S, x, y); if (u) return { kind: 'unit', s: u.s, i: u.i };
    const h = heroAt(x, y); if (h >= 0) return { kind: 'hero', s: h };
    return inR(x, y, ENDB) ? { kind: 'end' } : null;
  }
  function hoverUpdate(g, S) {
    const h = g.ptr.over && !g.touch ? hoverAt(S, g.ptr.x, g.ptr.y) : null;
    const same = h && S.hover && h.kind === S.hover.kind && h.k === S.hover.k && h.s === S.hover.s && h.i === S.hover.i;
    if (same) S.hoverT += 1 / 60; else { S.hover = h; S.hoverT = 0; }
  }
  function nearestFree(b, x) { let best = -1, bd = 1e9; for (let i = 0; i < MAXB; i++) if (!b[i]) { const d = Math.abs(SLOTX(i) - x); if (d < bd) { bd = d; best = i; } } return best; }

  // ---------- לשחק קלף / לתקוף (גרירה או שתי לחיצות) ----------
  function useCard(g, S, k, x, y) {
    const B = S.B, c = B.p[0].hand[k];
    if (!c || !canAct(S)) return false;
    const C = CARDS[c.id];
    if (C.c > B.p[0].mana) { say(g, 'noMana'); return false; }
    if (C.unit) {
      if (y > HAND_TOP) return false;
      const slot = nearestFree(B.p[0].b, x);
      if (slot < 0) { say(g, 'boardFull'); return false; }
      if (R.needsTg(C.fx)) { S.pend = { k, u: c.u, id: c.id, slot }; S.sel = null; g.sfx('place', { p: 1.3 }); g.msg(g.t('pickTarget'), 1200); return true; }
      return playCard(g, S, k, slot, -1);
    }
    if (R.needsTg(C.sp)) {
      const r = refAt(S, x, y);
      if (r < 0 || !R.fxTargets(B, 0, C.sp).includes(r)) { if (y < HAND_TOP) say(g, 'pickTarget'); return false; }
      const p = S.hpos.get(c.u); S.castAt = p ? { x: p.x, y: p.y - 60 } : null;
      return playCard(g, S, k, -1, r);
    }
    if (y > HAND_TOP) return false;
    S.castAt = { x, y };
    return playCard(g, S, k, -1, -1);
  }
  function unitReady(g, S, i, talk) {
    const u = S.B.p[0].b[i];
    if (!u || !canAct(S)) return false;
    if (R.canAtk(u)) return true;
    if (talk) say(g, u.done ? 'attacked' : 'sleepy');
    return false;
  }
  function useUnit(g, S, i, x, y) {
    const r = refAt(S, x, y);
    if (r < 0 || R.sideOf(r) !== 1) return false;
    if (!R.canAttack(S.B, i, r)) { if (R.canAtk(S.B.p[0].b[i])) say(g, 'mustGuard'); return false; }
    return attackWith(g, S, i, r);
  }
  function battlePtr(g, S, type, p) {
    if (type === 'down') {
      S.peek = null;
      if (p.button === 2) { S.sel = S.pend = S.drag = null; return; }
      if (S.pend) {
        const r = refAt(S, p.x, p.y);
        if (r >= 0 && R.fxTargets(S.B, 0, CARDS[S.pend.id].fx).includes(r)) playCard(g, S, S.pend.k, S.pend.slot, r);
        else { S.pend = null; g.sfx('click', { p: 0.7 }); }
        return;
      }
      if (inR(p.x, p.y, ENDB)) { S.sel = null; if (!endTurn(g, S)) g.sfx('error'); else g.sfx('click'); return; }
      const k = handAt(S, p.x, p.y), c = k >= 0 ? S.V.p[0].hand[k] : null;
      if (c) { S.drag = { kind: 'card', k, u: c.u, id: c.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, wasSel: !!(S.sel && S.sel.u === c.u) }; return; }
      if (S.sel) {
        const sk = S.sel.kind === 'card' ? S.V.p[0].hand.findIndex(h => h.u === S.sel.u) : -1;
        const ok = S.sel.kind === 'card' ? sk >= 0 && useCard(g, S, sk, p.x, p.y) : useUnit(g, S, S.sel.i, p.x, p.y);
        if (!ok) { const u = unitAt(S, p.x, p.y); S.sel = null; if (u && u.s === 0 && unitReady(g, S, u.i, true)) S.sel = { kind: 'unit', i: u.i }; }
        return;
      }
      const u = unitAt(S, p.x, p.y);
      if (u && u.s === 0) { S.drag = { kind: 'unit', i: u.i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; return; }
      if (u || heroAt(p.x, p.y) >= 0) S.peek = { ref: refAt(S, p.x, p.y), t0: S.clock };
      return;
    }
    const D = S.drag;
    if (!D) return;
    if (type === 'move') {
      D.x = p.x; D.y = p.y;
      if (!D.moved && Math.hypot(p.x - D.sx, p.y - D.sy) > 12) {
        D.moved = true;
        if (D.kind === 'card') {
          const C = CARDS[D.id];
          if (!canAct(S)) { S.drag = null; return; }
          if (C.c > S.B.p[0].mana) { say(g, 'noMana'); S.drag = null; return; }
          S.sel = null; g.sfx('whoosh');
        } else if (!unitReady(g, S, D.i, true)) S.drag = null;
      }
      return;
    }
    if (type === 'up') {
      S.drag = null;
      if (D.moved) { if (D.kind === 'card') useCard(g, S, D.k, p.x, p.y); else useUnit(g, S, D.i, p.x, p.y); return; }
      if (D.kind === 'card') {
        if (D.wasSel) { S.sel = null; return; }
        S.sel = { kind: 'card', k: D.k, u: D.u, id: D.id };
        g.sfx('click');
        if (canAct(S) && CARDS[D.id].c > S.B.p[0].mana) say(g, 'noMana');
      } else if (unitReady(g, S, D.i, true)) { S.sel = { kind: 'unit', i: D.i }; g.sfx('click'); }
      else S.sel = null;
    }
  }

  // ---------- לפני הקרב: היריב, בחירת חפיסה, עריכה ----------
  function prepBtns(g, S) {
    const un = unlockedSet(g), out = [];
    DK.forEach((id, k) => out.push({ id: 'deck', deck: id, x: 712 + (k % 3) * 170, y: 152 + ((k / 3) | 0) * 164, w: 156, h: 150, open: deckOpen(id, un), lock: lockedBy(id, un), face: faceOf(g, id) }));
    out.push({ id: 'edit', x: 820, y: 492, w: 280, h: 54 });
    out.push({ id: 'fight', x: 800, y: 572, w: 320, h: 88 });
    return out;
  }
  const ED_ORDER = IDS.slice().sort((a, b) => ELS.indexOf(CARDS[a].el) - ELS.indexOf(CARDS[b].el) || CARDS[a].c - CARDS[b].c || (CARDS[a].unit ? 0 : 1) - (CARDS[b].unit ? 0 : 1));
  const ED_S = 0.56, edPos = k => ({ x: 66 + (k % 10) * 88, y: 152 + ((k / 10) | 0) * 126 });
  function edGroups(list) {
    const m = new Map();
    for (const id of list) m.set(id, (m.get(id) || 0) + 1);
    return [...m.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => CARDS[a.id].c - CARDS[b.id].c || IDS.indexOf(a.id) - IDS.indexOf(b.id));
  }
  function edBtns(g, S) {
    const out = [];
    ED_ORDER.forEach((id, k) => { const p = edPos(k); out.push({ id: 'card', card: id, x: p.x - CW * ED_S / 2, y: p.y - CH * ED_S / 2, w: CW * ED_S, h: CH * ED_S }); });
    edGroups(S.ed.list).forEach((e, k) => out.push({ id: 'row', card: e.id, n: e.n, x: 934, y: 92 + k * 25, w: 318, h: 23 }));
    out.push({ id: 'auto', x: 236, y: 634, w: 200, h: 56 }, { id: 'clear', x: 452, y: 634, w: 170, h: 56 }, { id: 'done', x: 962, y: 626, w: 280, h: 68 });
    return out;
  }
  function openEditor(g, S) { S.deck = 'mine'; g.save('deck', 'mine'); S.ed = { list: mineDeck(g), peek: null, un: unlockedSet(g) }; S.phase = 'edit'; S.btns = null; }
  function closeEditor(g, S) {
    const E = S.ed;
    if (E && E.list.length < DECK) { const n = DECK - E.list.length; E.list = autoFill(E.list, E.un); g.msg(g.t('filled', { n }), 1800); }
    if (E) g.save('mine', E.list);
    S.phase = 'prep'; S.ed = null; S.btns = null;
  }
  const btnsOf = (g, S) => S.btns || (S.btns = S.phase === 'prep' ? prepBtns(g, S) : S.phase === 'edit' ? edBtns(g, S) : []);
  const btnAt = (g, S, x, y) => { const L = btnsOf(g, S); for (let k = L.length - 1; k >= 0; k--) if (inR(x, y, L[k])) return L[k]; return null; };
  function uiPtr(g, S, type, p) {
    if (type !== 'down') return;
    const b = btnAt(g, S, p.x, p.y);
    if (!b) return;
    if (S.phase === 'prep') {
      if (b.id === 'deck') {
        if (!b.open) { g.msg(g.t('unlockAt', { name: g.t('o_' + OPP[b.lock].id) }), 1500); g.sfx('error'); return; }
        S.deck = b.deck; g.save('deck', b.deck); g.sfx('pop');
      } else if (b.id === 'edit') { g.sfx('click'); openEditor(g, S); }
      else if (b.id === 'fight') startBattle(g, S);
      return;
    }
    const E = S.ed, L = E.list;
    if (b.id === 'card') {
      E.peek = b.card;
      if (p.button === 2) { const i = L.lastIndexOf(b.card); if (i >= 0) { L.splice(i, 1); g.sfx('pop', { p: 0.8 }); S.btns = null; } return; }
      if (!E.un.has(b.card)) { g.msg(g.t('locked'), 1000); g.sfx('error'); return; }
      if (countIn(L, b.card) >= COPIES) { say(g, 'maxCopies'); return; }
      if (L.length >= DECK) { say(g, 'deckFull'); return; }
      L.push(b.card); g.sfx('place'); S.btns = null;
      E.flash = { id: b.card, t0: S.clock };
    } else if (b.id === 'row') { const i = L.lastIndexOf(b.card); if (i >= 0) L.splice(i, 1); E.peek = b.card; g.sfx('pop', { p: 0.8 }); S.btns = null; }
    else if (b.id === 'auto') { E.list = autoFill(L, E.un); g.sfx('power'); S.btns = null; }
    else if (b.id === 'clear') { E.list = []; g.sfx('break'); S.btns = null; }
    else if (b.id === 'done') { g.sfx('click'); closeEditor(g, S); }
  }

  // ---------- ציור הקרב ----------
  function drawTable(g, c, S) {
    let q = c.createRadialGradient(640, 360, 80, 640, 360, 820);
    q.addColorStop(0, '#3a2a5e'); q.addColorStop(1, '#140e24');
    c.fillStyle = q; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {   // אבק נוצץ שזז לאט
      const x = (i * 197.3 + S.clock * (6 + (i % 5) * 3)) % W, y = (i * 131.7 + Math.sin(S.clock * 0.5 + i) * 20 + 720) % H;
      c.globalAlpha = 0.12 + 0.1 * Math.sin(S.clock * 2 + i); E(c, x, y, 1.6 + (i % 3), 1.6 + (i % 3)); c.fillStyle = '#ffe9a8'; c.fill();
    }
    c.globalAlpha = 1;
    for (const [r, f] of [[22, '#6b4524'], [14, '#8a5a2e']]) { g.rr(c, MAT.x - r, MAT.y - r, MAT.w + r * 2, MAT.h + r * 2, 26 + r * 0.6); c.fillStyle = f; c.fill(); }
    g.rr(c, MAT.x - 14, MAT.y - 14, MAT.w + 28, MAT.h + 28, 34); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    g.rr(c, MAT.x, MAT.y, MAT.w, MAT.h, 20);
    q = c.createLinearGradient(0, MAT.y, 0, MAT.y + MAT.h);
    q.addColorStop(0, '#5a2f45'); q.addColorStop(0.49, '#3d2a4a'); q.addColorStop(0.51, '#24405a'); q.addColorStop(1, '#1f5a62');
    c.fillStyle = q; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,220,150,.35)'; c.stroke();
    const my = (ROWY[0] + ROWY[1]) / 2;
    c.save(); c.globalAlpha = 0.55;
    line(c, [[MAT.x + 24, my], [MAT.x + MAT.w - 24, my]], 2.5, '#ffd98a');
    E(c, 640, my, 34, 14); c.lineWidth = 2; c.strokeStyle = '#ffd98a'; c.stroke();
    star(c, 640, my, 9, '#ffd98a', 4, 0.35);
    c.restore();
    for (const s of [0, 1]) for (let i = 0; i < MAXB; i++) { g.rr(c, SLOTX(i) - UW / 2, ROWY[s] - UH / 2, UW, UH, 16); c.fillStyle = 'rgba(0,0,0,.16)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.08)'; c.stroke(); }
    // לוחות הצד: הגיבורים משמאל, החפיסות והכפתור מימין
    for (const s of [0, 1]) { g.rr(c, 18, HEROP[s].y - 92, 228, s ? 214 : 200, 22); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(); }
  }
  function crystal(c, x, y, r, full) {
    poly(c, [[x, y - r], [x + r * 0.78, y - r * 0.15], [x, y + r], [x - r * 0.78, y - r * 0.15]]);
    if (full) fl(c, rg(c, x, y, r, '#d8f4ff', '#2f7cf0'), Math.max(1, r * 0.16)); else { c.fillStyle = 'rgba(20,30,60,.7)'; c.fill(); c.lineWidth = Math.max(1, r * 0.14); c.strokeStyle = 'rgba(140,180,255,.45)'; c.stroke(); }
  }
  function drawMana(g, c, S, s) {
    const P = S.V.p[s];
    if (s === 0) {
      crystal(c, 1022, 668, 34, true);
      g.text(c, String(P.mana), 1022, 666, { size: 30, weight: 900, color: '#fff', stroke: OL, strokeW: 6 });
      for (let k = 0; k < MAXM; k++) { c.globalAlpha = k < P.mm ? 1 : 0.22; crystal(c, 1078 + (k % 5) * 34, 652 + ((k / 5) | 0) * 34, 13, k < P.mana); }
      c.globalAlpha = 1;
      g.text(c, P.mana + '/' + P.mm, 1022, 710, { size: 15, weight: 800, color: '#bfe0ff' });
    } else {
      crystal(c, 112, 254, 11, P.mana > 0);
      g.text(c, P.mana + '/' + P.mm, 142, 255, { size: 17, weight: 900, color: '#bfe0ff', stroke: OL, strokeW: 4 });
    }
  }
  function drawHero(g, c, S, s, tgt) {
    const p = HEROP[s], P = S.V.p[s], el = s ? S.opp.el : 'sky', art = s ? S.opp.art : 'hero';
    const hit = S.clock - S.heroHit[s];
    c.save();
    if (hit < 0.3) c.translate(Math.sin(hit * 80) * 5 * (1 - hit / 0.3), 0);
    E(c, p.x, p.y, HR + 7, HR + 7); fl(c, lgr(c, p.y - HR, p.y + HR, '#ffe7a0', '#b77a1c'), 3);
    E(c, p.x, p.y, HR, HR); c.fillStyle = EL[el].d; c.fill();
    c.drawImage(heroImg(g, art, el), p.x - HR + 2, p.y - HR + 2, HR * 2 - 4, HR * 2 - 4);
    if (hit < 0.4) { E(c, p.x, p.y, HR, HR); c.fillStyle = 'rgba(255,40,40,' + (0.5 * (1 - hit / 0.4)) + ')'; c.fill(); }
    if (tgt) { const a = 0.6 + 0.4 * Math.sin(S.clock * 8), r = HR + 13 + Math.sin(S.clock * 8) * 2; E(c, p.x, p.y, r, r); c.lineWidth = 7; c.strokeStyle = tgt === 2 ? 'rgba(120,255,140,' + a + ')' : 'rgba(255,70,70,' + a + ')'; c.stroke(); }
    hpBadge(c, g, p.x + 46, p.y + 34, 22, Math.max(0, P.hp), P.hp < P.max ? '#ffd2d2' : '#fff');
    const nm = s ? g.t('o_' + S.opp.id) : S.deckName || g.t('d_' + S.deck);
    g.rr(c, p.x - 104, p.y + HR + 10, 208, 28, 14); c.fillStyle = s ? 'rgba(120,30,40,.85)' : 'rgba(30,60,120,.85)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,220,150,.6)'; c.stroke();
    g.text(c, nm, p.x, p.y + HR + 24.5, { size: fitSize(c, nm, 16, 196, 800), weight: 800, color: '#fff' });
    c.restore();
  }
  function drawPile(g, c, S, s) {
    const d = DECKP[s], n = S.V.p[s].deckN, img = backImg(g);
    for (let k = Math.min(3, n) - 1; k >= 0; k--) c.drawImage(img, d.x - 34 + k * 3, d.y - 47 - k * 3, 68, 95);
    if (!n) { g.rr(c, d.x - 34, d.y - 47, 68, 95, 8); c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,.3)'; c.stroke(); c.setLineDash([]); }
    E(c, d.x + 30, d.y + 40, 17, 17); fl(c, '#1d1e5a', 2.5);
    g.text(c, String(n), d.x + 30, d.y + 41, { size: 17, weight: 900, color: n ? '#fff' : '#ff8080' });
  }
  function drawEndBtn(g, c, S) {
    const b = ENDB, mine = S.V.cur === 0 && (S.phase === 'battle' || S.phase === 'demo') && !S.done, ready = canAct(S);
    const glow = ready && !!S.legal && !S.legal.some(a => a.t !== 'end');
    const hov = S.hover && S.hover.kind === 'end' && ready;
    c.save();
    if (glow) { g.rr(c, b.x - 8, b.y - 8, b.w + 16, b.h + 16, 26); c.fillStyle = 'rgba(255,230,90,' + (0.3 + 0.25 * Math.sin(S.clock * 6)) + ')'; c.fill(); }
    g.rr(c, b.x, b.y, b.w, b.h, 20);
    c.fillStyle = mine ? lgr(c, b.y, b.y + b.h, hov ? '#fff07a' : '#ffd84d', '#e08a10') : lgr(c, b.y, b.y + b.h, '#7d7896', '#4a4560');
    c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    const tx = g.t(mine ? 'endTurn' : 'enemyTurn');
    g.text(c, tx, b.x + b.w / 2, b.y + b.h / 2 + 1, { size: fitSize(c, tx, 22, b.w - 22, 900), weight: 900, color: mine ? '#3a2208' : '#e8e4f4' });
    c.restore();
  }
  function drawUnit(g, c, S, u, x, y, o) {
    o = o || {};
    const C = CARDS[u.id], P = EL[C.el], f = S.fxu.get(u.u);
    c.save();
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (f) {
      const b = (S.clock - f.born) / 0.28;
      if (b < 1) { const k = b <= 0 ? 0.01 : g.ease.back(b); c.translate(x, y); c.scale(k, k); c.translate(-x, -y); }
      if (f.lunge) {
        const t = (S.clock - f.lunge.t0) / 0.42;
        if (t >= 1) f.lunge = null;
        else { const k = (t < 0.45 ? g.ease.in(t / 0.45) : 1 - g.ease.out((t - 0.45) / 0.55)) * 0.78; x += f.lunge.dx * k; y += f.lunge.dy * k; }
      }
    }
    if (o.scale) { c.translate(x, y); c.scale(o.scale, o.scale); c.translate(-x, -y); }
    if (o.bob) y += Math.sin(S.clock * 2.2 + u.u * 1.7) * 1.6;
    const L = x - UW / 2, T = y - UH / 2;
    if (u.g) {
      c.beginPath(); c.moveTo(x, T - 13); c.lineTo(L + UW + 11, T + 4); c.lineTo(L + UW + 9, T + UH - 30); c.quadraticCurveTo(L + UW + 2, T + UH + 6, x, T + UH + 15);
      c.quadraticCurveTo(L - 2, T + UH + 6, L - 9, T + UH - 30); c.lineTo(L - 11, T + 4); c.closePath();
      fl(c, lgr(c, T - 13, T + UH + 15, '#dfe6f0', '#7c8aa3'), 3);
    }
    if (o.ready) { g.rr(c, L - 6, T - 6, UW + 12, UH + 12, 20); c.lineWidth = 5; c.strokeStyle = 'rgba(110,255,120,' + (0.6 + 0.35 * Math.sin(S.clock * 6)) + ')'; c.stroke(); }
    g.rr(c, L, T, UW, UH, 16); c.fillStyle = lgr(c, T, T + UH, g.shade(P.m, 0.25), P.d); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
    c.drawImage(artImg(g, u.id), x - ART_W / 2, T + 6, ART_W, ART_H);
    g.rr(c, x - ART_W / 2, T + 6, ART_W, ART_H, 10); c.lineWidth = 2; c.strokeStyle = g.shade(P.l, 0.2); c.stroke();
    const hit = f ? S.clock - f.hit : 9;
    if (hit < 0.35) { g.rr(c, L, T, UW, UH, 16); c.fillStyle = 'rgba(255,60,60,' + (0.55 * (1 - hit / 0.35)) + ')'; c.fill(); }
    if (u.po) { c.beginPath(); c.moveTo(L + 16, T + 10); c.quadraticCurveTo(L + 27, T + 26, L + 16, T + 30); c.quadraticCurveTo(L + 5, T + 26, L + 16, T + 10); fl(c, '#7dff6a', 2); }
    if (u.sh) {
      E(c, x, y - 4, UW * 0.62, UH * 0.6); c.fillStyle = 'rgba(255,230,120,.16)'; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,225,110,' + (0.7 + 0.25 * Math.sin(S.clock * 4)) + ')'; c.stroke();
    }
    atkBadge(c, g, L + 16, T + UH - 17, 17, u.atk, u.atk > C.a ? '#a8ff9a' : '#fff');
    hpBadge(c, g, L + UW - 16, T + UH - 20, 17, Math.max(0, u.hp), u.hp < u.max ? '#ff9c9c' : u.max > C.h ? '#a8ff9a' : '#fff');
    if (o.tgt) { const a = 0.6 + 0.4 * Math.sin(S.clock * 8); g.rr(c, L - 8, T - 8, UW + 16, UH + 16, 22); c.lineWidth = 6; c.strokeStyle = o.tgt === 2 ? 'rgba(120,255,140,' + a + ')' : 'rgba(255,70,70,' + a + ')'; c.stroke(); }
    if (o.zz) { const t = S.clock; for (let k = 0; k < 2; k++) g.text(c, 'z', x + 30 + k * 10, T + 18 - ((t * 14 + k * 9) % 18), { size: 15 + k * 4, weight: 900, color: '#e8f0ff', stroke: OL, strokeW: 4, alpha: 0.9 }); }
    c.restore();
  }
  function drawCardAt(g, c, id, x, y, s, r, o) {
    o = o || {};
    c.save(); c.translate(x, y); if (r) c.rotate(r); c.scale(s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (o.glow) { g.rr(c, -CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 18); c.fillStyle = o.glow; c.fill(); }
    else { g.rr(c, -CW / 2 + 3, -CH / 2 + 7, CW, CH, 14); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill(); }
    c.drawImage(o.back ? backImg(g) : cardImg(g, id), -CW / 2, -CH / 2, CW, CH);
    if (o.dim) { g.rr(c, -CW / 2, -CH / 2, CW, CH, 13); c.fillStyle = 'rgba(10,6,20,.35)'; c.fill(); }
    c.restore();
  }
  function drawArrow(g, c, S, x0, y0, x1, y1, col) {
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 60 - Math.abs(x1 - x0) * 0.1;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1);
    c.lineWidth = 15; c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke();
    c.setLineDash([16, 12]); c.lineDashOffset = -S.clock * 60;
    c.lineWidth = 9; c.strokeStyle = col; c.stroke();
    c.setLineDash([]);
    const a = Math.atan2(y1 - cy, x1 - cx);
    c.translate(x1, y1); c.rotate(a);
    poly(c, [[10, 0], [-18, -16], [-12, 0], [-18, 16]]); fl(c, col, 3);
    c.restore();
  }
  function bubble(g, c, txt, x, y, w, t) {
    const a = Math.min(1, t * 4, (4 - t) * 2);
    if (a <= 0) return;
    const b = fitBlock(c, txt, w - 28, 50, 17, 700);
    const h = b.ls.length * b.z * 1.2 + 22;
    c.save(); c.globalAlpha = a;
    g.rr(c, x, y, w, h, 16); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
    poly(c, [[x + 4, y + h * 0.45], [x - 18, y + h * 0.7], [x + 6, y + h * 0.72]]); c.fillStyle = '#fffaf0'; c.fill();
    b.ls.forEach((l, i) => g.text(c, l, x + w / 2, y + 11 + b.z * 0.6 + i * b.z * 1.2, { size: b.z, weight: 700, color: '#2b1f36' }));
    c.restore();
  }
  function bannerAt(g, c, txt, col, t, y) {
    const a = t < 0.15 ? t / 0.15 : t > 0.9 ? Math.max(0, 1 - (t - 0.9) / 0.25) : 1, k = t < 0.2 ? g.ease.back(t / 0.2) : 1;
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.translate(640, y); c.scale(k, k);
    poly(c, [[-330, -38], [330, -38], [300, 0], [330, 38], [-330, 38], [-300, 0]]); c.fillStyle = 'rgba(20,10,40,.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = col; c.stroke();
    g.text(c, txt, 0, 2, { size: 44, weight: 900, color: col, stroke: OL, strokeW: 7, maxW: 560 });
    c.restore();
  }

  // מה מסומן עכשיו כיעד, ומאיפה יוצא החץ
  function targetsNow(g, S) {
    if (!S.B || !canAct(S)) return null;
    const B = S.B, D = S.drag;
    if (S.pend) return { refs: R.fxTargets(B, 0, CARDS[S.pend.id].fx), col: '#ff5a5a', from: { x: SLOTX(S.pend.slot), y: ROWY[0] } };
    if (D && D.moved && D.kind === 'unit') return { refs: R.atkTargets(B, 0), col: '#ff5a5a', from: { x: SLOTX(D.i), y: ROWY[0] } };
    const card = D && D.moved && D.kind === 'card' ? D : S.sel && S.sel.kind === 'card' ? S.sel : null;
    if (card && tgSpell(card.id)) {
      const sp = CARDS[card.id].sp, hp = S.hpos.get(card.u);
      return { refs: R.fxTargets(B, 0, sp), col: sp.k === 'buff' ? '#7dff6a' : '#ff5a5a', buff: sp.k === 'buff', from: hp ? { x: hp.x, y: hp.y - CH * hp.s * 0.3 } : null };
    }
    if (S.sel && S.sel.kind === 'unit') return { refs: R.atkTargets(B, 0), col: '#ff5a5a', from: { x: SLOTX(S.sel.i), y: ROWY[0] } };
    return null;
  }
  function inspectAt(g, c, S) {
    let r = -1;
    if (S.hover && S.hover.kind === 'unit' && S.hoverT > 0.3 && !S.drag) r = R.ref(S.hover.s, S.hover.i);
    else if (S.peek && S.peek.ref >= 0 && !R.isHero(S.peek.ref) && S.clock - S.peek.t0 < 3) r = S.peek.ref;
    else if (g.touch && S.sel && S.sel.kind === 'unit') r = R.ref(0, S.sel.i);
    if (r < 0) return;
    const s = R.sideOf(r), i = R.slotOf(r), u = S.V.p[s].b[i];
    if (!u) return;
    const x = SLOTX(i), right = x < 640, cx = right ? x + UW / 2 + 14 + CW / 2 : x - UW / 2 - 14 - CW / 2, cy = g.clamp(ROWY[s], CH / 2 + 8, H - CH / 2 - 8);
    drawCardAt(g, c, u.id, cx, cy, 1, 0);
    kwTips(g, c, u.id, right ? cx + CW / 2 + 8 : cx - CW / 2 - 8, cy - CH / 2 + 4, right);
  }
  // הסבר קצר למילות המפתח (שומר, זריז, מגן, רעל) ליד קלף שמסתכלים עליו
  function kwTips(g, c, id, x, y, right) {
    for (const k of CARDS[id].kw.split('')) {
      const t = g.t('tip_' + k), b = fitBlock(c, t, 190, 40, 15, 700), h = b.ls.length * b.z * 1.2 + 14, L = right ? x : x - 214;
      g.rr(c, L, y, 214, h, 10); c.fillStyle = 'rgba(16,10,34,.92)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#ffd84d'; c.stroke();
      b.ls.forEach((l, j) => g.text(c, l, L + 107, y + 7 + b.z * 0.6 + j * b.z * 1.2, { size: b.z, weight: 700, color: '#fff' }));
      y += h + 6;
    }
  }
  function tutHint(g, c, S) {
    if (!S.tut || !S.legal || S.drag || S.sel || S.pend || S.peek || (S.hover && S.hover.kind !== 'end') || S.idleT < 1.1) return;
    const hasPlay = S.legal.some(a => a.t === 'play'), hasAtk = S.legal.some(a => a.t === 'atk');
    const key = hasPlay ? (g.touch ? 'tut1t' : 'tut1') : hasAtk ? (g.touch ? 'tut2t' : 'tut2') : 'tut3';
    const txt = g.t(key), z = fitSize(c, txt, 22, 600, 800), w = Math.min(640, c.measureText(txt).width + 50);
    const a = 0.75 + 0.25 * Math.sin(S.clock * 5), my = (ROWY[0] + ROWY[1]) / 2;
    c.save(); c.globalAlpha = a;
    g.rr(c, 640 - w / 2, my - 24, w, 48, 24); c.fillStyle = 'rgba(255,216,77,.95)'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    g.text(c, txt, 640, my + 1, { size: z, weight: 800, color: '#2b1f36' });
    c.restore();
    // יד קטנה שמראה את התנועה
    let from = null, to = null;
    if (hasPlay) { const a2 = S.legal.find(x => x.t === 'play'), L = handLayout(S.V.p[0].hand.length, a2.hi); from = { x: L.x, y: L.y - 30 }; to = { x: SLOTX(a2.slot >= 0 ? a2.slot : 2), y: ROWY[0] }; }
    else if (hasAtk) { const a2 = S.legal.find(x => x.t === 'atk'); from = posOf(R.ref(0, a2.i)); to = posOf(a2.tg); }
    else { from = { x: ENDB.x + ENDB.w * 0.82, y: ENDB.y + 150 }; to = { x: ENDB.x + ENDB.w * 0.82, y: ENDB.y + ENDB.h + 18 }; }
    const t = (S.clock * 0.7) % 1, k = g.ease.inOut(Math.min(1, t * 1.4));
    const hx = g.lerp(from.x, to.x, k), hy = g.lerp(from.y, to.y, k);
    c.save(); c.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1; c.translate(hx, hy); c.rotate(-0.4);
    g.rr(c, -9, -4, 18, 34, 9); fl(c, '#ffe2c6', 2.5);
    g.rr(c, -9, -26, 9, 28, 4.5); fl(c, '#ffe2c6', 2.5);
    c.restore();
  }
  function drawBattle(g, c, S) {
    const V = S.V, tg = targetsNow(g, S), ready = canAct(S);
    const tset = new Map(); if (tg) for (const r of tg.refs) tset.set(r, tg.buff ? 2 : 1);
    drawTable(g, c, S);
    drawPile(g, c, S, 1); drawPile(g, c, S, 0);
    drawEndBtn(g, c, S);
    drawMana(g, c, S, 1); drawMana(g, c, S, 0);
    drawHero(g, c, S, 1, tset.get(R.ref(1, R.HERO))); drawHero(g, c, S, 0, tset.get(R.ref(0, R.HERO)));
    // יחידה שנגררת / קלף יצור שנגרר: איפה הוא ינחת
    const D = S.drag;
    if (D && D.moved && D.kind === 'card' && CARDS[D.id].unit && D.y < HAND_TOP && ready) {
      const sl = nearestFree(S.B.p[0].b, D.x);
      if (sl >= 0) { g.rr(c, SLOTX(sl) - UW / 2 - 4, ROWY[0] - UH / 2 - 4, UW + 8, UH + 8, 18); c.lineWidth = 4; c.strokeStyle = 'rgba(120,255,140,' + (0.6 + 0.3 * Math.sin(S.clock * 8)) + ')'; c.stroke(); }
    }
    for (const s of [1, 0]) for (let i = 0; i < MAXB; i++) {
      const u = V.p[s].b[i];
      if (!u) continue;
      const mine = s === 0, lifted = D && D.moved && D.kind === 'unit' && D.i === i && mine || (S.sel && S.sel.kind === 'unit' && S.sel.i === i && mine);
      drawUnit(g, c, S, u, SLOTX(i), ROWY[s] - (lifted ? 8 : 0), { tgt: tset.get(R.ref(s, i)), ready: mine && ready && R.canAtk(u) && !lifted, zz: mine && u.sick && !u.sw && V.cur === 0, scale: lifted ? 1.06 : 0, bob: !lifted });
    }
    for (const o of S.ghosts) {
      const t = (S.clock - o.t0) / 0.5;
      c.save(); c.translate(o.x, o.y); c.rotate(t * 0.5); c.translate(-o.x, -o.y);
      drawUnit(g, c, S, o.u, o.x, o.y + t * 20, { alpha: Math.max(0, 1 - t), scale: 1 - t * 0.4 });
      c.restore();
    }
    if (S.pend) drawUnit(g, c, S, mkUnit(S.pend.u, S.pend.id), SLOTX(S.pend.slot), ROWY[0], { alpha: 0.7 });
    for (const o of S.sweeps) {
      const t = (S.clock - o.t0) / 0.7, x = MAT.x + t * MAT.w, y = ROWY[o.side], P = EL[o.el];
      c.save(); c.globalAlpha = Math.min(1, (1 - t) * 3);
      const q = c.createLinearGradient(x - 160, 0, x + 20, 0); q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(1, P.l);
      c.fillStyle = q; g.rr(c, x - 160, y - UH / 2 - 10, 180, UH + 20, 30); c.fill();
      c.restore();
    }
    for (const o of S.shots) {
      const t = Math.min(1, (S.clock - o.t0) / o.dur), P = EL[o.el];
      for (let k = 3; k >= 0; k--) {
        const tt = Math.max(0, t - k * 0.06), x = g.lerp(o.x0, o.x1, tt), y = g.lerp(o.y0, o.y1, tt) - Math.sin(tt * Math.PI) * 60;
        E(c, x, y, 15 - k * 3, 15 - k * 3); c.fillStyle = k ? P.l : '#ffffff'; c.globalAlpha = 1 - k * 0.22; c.fill();
      }
      c.globalAlpha = 1;
    }
    for (const c2 of V.p[1].hand) { const p = S.hpos.get(c2.u); if (p) drawCardAt(g, c, '', p.x, p.y, p.s, p.r, { back: true }); }
    for (const o of S.flys) {
      const t = Math.min(1, (S.clock - o.t0) / o.dur), k = g.ease.out(t);
      drawCardAt(g, c, o.id, g.lerp(o.x0, o.x1, k), g.lerp(o.y0, o.y1, k), g.lerp(o.s0, o.s1, k), 0, { alpha: o.burn ? 1 - t : o.fade ? 1 - t * 0.7 : 1 });
    }
    // היד שלך: הקלף שמרחפים עליו או גוררים אותו מצויר אחרון (למעלה)
    const hand = V.p[0].hand, play = new Set(S.legal ? S.legal.filter(a => a.t === 'play').map(a => a.hi) : []);
    let top = -1;
    hand.forEach((card, k) => {
      if (S.pend && S.pend.u === card.u) return;
      const p = S.hpos.get(card.u);
      if (!p) return;
      if ((D && D.u === card.u) || (S.sel && S.sel.u === card.u) || (S.hover && S.hover.kind === 'hand' && S.hover.k === k && p.s > 1)) { top = k; return; }
      drawCardAt(g, c, card.id, p.x, p.y, p.s, p.r, { glow: play.has(k) ? 'rgba(110,255,120,.75)' : null, dim: ready && !play.has(k) });
    });
    if (top >= 0) {
      const card = hand[top], p = S.hpos.get(card.u);
      drawCardAt(g, c, card.id, p.x, p.y, p.s, p.r, { glow: play.has(top) ? 'rgba(110,255,120,.85)' : 'rgba(255,255,255,.5)' });
      if (p.s > 1.15 && !D) kwTips(g, c, card.id, p.x + CW * p.s / 2 + 8, p.y - CH * p.s / 2 + 6, true);
    }
    if (tg && tg.from) {
      const px = D && D.moved ? D.x : g.ptr.x, py = D && D.moved ? D.y : g.ptr.y;
      if ((D && D.moved) || S.pend || (S.sel && g.ptr.over && !g.touch)) drawArrow(g, c, S, tg.from.x, tg.from.y, px, py, tg.col);
    }
    if (S.show) {
      const t = S.clock - S.show.t0, k = g.ease.back(Math.min(1, t / 0.25));
      drawCardAt(g, c, S.show.id, g.lerp(S.show.x, 640, k), g.lerp(S.show.y, 300, k), 0.4 + 0.7 * k, 0, {});
    }
    inspectAt(g, c, S);
    if (S.say) bubble(g, c, S.say.txt, 206, 66, 390, S.clock - S.say.t0);
    if (S.banner) { const t = (S.clock - S.banner.t0) / 1.1; if (t < 1.2) bannerAt(g, c, S.banner.txt, S.banner.col, t, (ROWY[0] + ROWY[1]) / 2); else S.banner = null; }
    if (ready) tutHint(g, c, S);
    if (S.reveal) drawReveal(g, c, S);
    if (S.lost) {
      const t = S.clock - S.lost.t0;
      c.fillStyle = 'rgba(30,0,10,' + Math.min(0.5, t) + ')'; c.fillRect(0, 0, W, H);
      bannerAt(g, c, g.t(S.lost.draw ? 'draw' : 'defeat'), '#ff8a8a', Math.min(0.9, t / 1.1), 330);
    }
  }
  function drawReveal(g, c, S) {
    const R0 = S.reveal, t = S.clock - R0.t0;
    c.fillStyle = 'rgba(10,6,24,' + Math.min(0.6, t * 1.2) + ')'; c.fillRect(0, 0, W, H);
    bannerAt(g, c, g.t('victory'), '#ffd84d', Math.min(0.9, t / 1.1), 120);
    for (let k = 0; k < 3; k++) { const on = k < R0.stars, a = Math.min(1, Math.max(0, (t - 0.3 - k * 0.2) * 4)); c.save(); c.globalAlpha = a; star(c, 580 + k * 60, 196, on ? 24 : 18, on ? '#ffd84d' : 'rgba(255,255,255,.25)'); c.restore(); }
    if (!R0.first) return;
    g.text(c, g.t('newCards'), 640, 262, { size: 30, weight: 900, color: '#fff', stroke: OL, strokeW: 6, alpha: Math.min(1, Math.max(0, (t - 0.6) * 3)) });
    R0.ids.forEach((id, k) => {
      const tt = Math.max(0, Math.min(1, (t - 0.8 - k * 0.25) / 0.45)), x = 540 + k * 200, y = 430;
      if (tt <= 0) return;
      c.save(); c.translate(x, y); c.rotate(S.clock * 0.4); c.globalAlpha = 0.35 * tt;
      for (let r = 0; r < 12; r++) { c.rotate(TAU / 12); poly(c, [[0, 0], [-16, -190], [16, -190]]); c.fillStyle = '#ffe9a0'; c.fill(); }
      c.restore();
      const flip = Math.abs(Math.cos(tt * Math.PI)), front = tt > 0.5;
      c.save(); c.translate(x, y); c.scale(Math.max(0.02, flip) * 1.05, 1.05);
      drawCardAt(g, c, id, 0, 0, 1, 0, { back: !front });
      c.restore();
    });
  }
  function revealFx(g, S) {   // פעם אחת לכל קלף, כשהוא מתהפך
    const R0 = S.reveal;
    if (!R0 || !R0.first) return;
    R0.ids.forEach((id, k) => {
      if (R0['b' + k] || S.clock - R0.t0 < 0.8 + k * 0.25 + 0.23) return;
      R0['b' + k] = 1;
      g.burst(540 + k * 200, 430, { n: 34, color: ['#ffd84d', '#ffffff', EL[CARDS[id].el].l], speed: 6, life: 42 });
      g.sfx('coin', { p: 1 + k * 0.2 });
    });
  }

  // ---------- כפתורים ומסכים שלפני הקרב ----------
  const BTN = { gold: ['#ffe066', '#e88a10', '#3a2208'], blue: ['#7fc8ff', '#2a68c0', '#ffffff'], grey: ['#8d88a8', '#4d4866', '#ffffff'], red: ['#ff9a8a', '#c43d3a', '#ffffff'] };
  function drawBtn(g, c, S, b, label, style, o) {
    o = o || {};
    const P = BTN[style || 'blue'], hov = S.btnHover === b, lift = hov ? 2 : 0;
    c.save();
    if (o.pulse) { const k = 1 + 0.03 * Math.sin(S.clock * 5); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(k, k); c.translate(-b.x - b.w / 2, -b.y - b.h / 2); }
    g.rr(c, b.x, b.y + 5, b.w, b.h, b.h * 0.32); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
    g.rr(c, b.x, b.y - lift, b.w, b.h, b.h * 0.32); c.fillStyle = lgr(c, b.y, b.y + b.h, hov ? g.shade(P[0], 0.25) : P[0], P[1]); c.fill();
    c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    g.rr(c, b.x + 6, b.y + 4 - lift, b.w - 12, b.h * 0.36, b.h * 0.18); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill();
    g.text(c, label, b.x + b.w / 2, b.y + b.h / 2 + 1 - lift, { size: fitSize(c, label, o.size || 24, b.w - 24, 900), weight: 900, color: P[2], stroke: style === 'gold' ? null : 'rgba(0,0,0,.35)', strokeW: 4 });
    c.restore();
  }
  function screenBg(g, c, S) {
    const q = c.createRadialGradient(640, 300, 60, 640, 360, 860);
    q.addColorStop(0, '#45306e'); q.addColorStop(1, '#140e24');
    c.fillStyle = q; c.fillRect(0, 0, W, H);
    c.save(); c.translate(640, -120); c.rotate(S.clock * 0.05); c.globalAlpha = 0.06;
    for (let r = 0; r < 16; r++) { c.rotate(TAU / 16); poly(c, [[0, 0], [-60, 980], [60, 980]]); c.fillStyle = '#ffe9a0'; c.fill(); }
    c.restore();
  }
  function panelBox(g, c, x, y, w, h) { g.rr(c, x, y, w, h, 24); c.fillStyle = 'rgba(8,5,20,.45)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,220,150,.25)'; c.stroke(); }
  function drawDeckBox(g, c, S, b) {
    const sel = S.deck === b.deck, hov = S.btnHover === b, el = b.deck === 'mine' ? 'shadow' : b.deck, P = EL[el];
    const x = b.x, y = b.y - (hov && b.open ? 3 : 0);
    c.save();
    if (sel) { g.rr(c, x - 7, y - 7, b.w + 14, b.h + 14, 24); c.fillStyle = 'rgba(255,216,77,' + (0.55 + 0.25 * Math.sin(S.clock * 4)) + ')'; c.fill(); }
    g.rr(c, x, y, b.w, b.h, 18); c.fillStyle = lgr(c, y, y + b.h, g.shade(P.m, 0.2), P.d); c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    const img = backImg(g);
    c.save(); c.translate(x + b.w / 2, y + 60);
    for (const [r, dx] of [[-0.25, -26], [0.25, 26]]) { c.save(); c.translate(dx, 4); c.rotate(r); c.drawImage(img, -26, -36, 52, 73); c.restore(); }
    c.restore();
    if (!b.open) {   // נעולה: רק מנעול ומי צריך לנצח
      g.rr(c, x, y, b.w, b.h, 18); c.fillStyle = 'rgba(10,8,20,.72)'; c.fill();
      lockIcon(c, x + b.w / 2, y + 56, 1.2);
      const lt = g.t('unlockAt', { name: g.t('o_' + OPP[Math.max(0, b.lock)].id) }), fb = fitBlock(c, lt, b.w - 16, 46, 15, 800);
      fb.ls.forEach((l, i) => g.text(c, l, x + b.w / 2, y + 100 + fb.z * 0.6 + i * fb.z * 1.16, { size: fb.z, weight: 800, color: '#ffd9a0' }));
      c.restore();
      return;
    }
    E(c, x + b.w / 2, y + 60, 38, 38); c.fillStyle = OL; c.fill();
    c.save(); E(c, x + b.w / 2, y + 60, 35, 35); c.clip(); c.drawImage(artImg(g, b.face), x + b.w / 2 - 40, y + 60 - 37, 80, 74); c.restore();
    E(c, x + b.w / 2, y + 60, 36, 36); c.lineWidth = 3; c.strokeStyle = '#ffe7a0'; c.stroke();
    const nm = g.t('d_' + b.deck);
    g.text(c, nm, x + b.w / 2, y + 116, { size: fitSize(c, nm, 17, b.w - 14, 900), weight: 900, color: '#fff', stroke: OL, strokeW: 4 });
    const sub = g.t('nCards', { n: DECK });
    g.text(c, sub, x + b.w / 2, y + 137, { size: fitSize(c, sub, 13, b.w - 20, 700), weight: 700, color: 'rgba(255,255,255,.75)' });
    if (sel) { E(c, x + b.w - 8, y + 8, 15, 15); fl(c, '#5ee06a', 2.5); line(c, [[x + b.w - 15, y + 8], [x + b.w - 9, y + 14], [x + b.w - 1, y + 2]], 3.5, '#fff'); }
    c.restore();
  }
  function lockIcon(c, x, y, k) {
    c.beginPath(); c.arc(x, y - 8 * k, 11 * k, Math.PI, 0); c.lineWidth = 5 * k; c.strokeStyle = '#d8d0e8'; c.stroke();
    g2rr(c, x - 16 * k, y - 8 * k, 32 * k, 26 * k, 6 * k); fl(c, lgr(c, y - 8 * k, y + 18 * k, '#ffe066', '#c08a10'), 2.5 * k);
    E(c, x, y + 3 * k, 3.5 * k, 3.5 * k); c.fillStyle = OL; c.fill();
  }
  function drawPrep(g, c, S) {
    const o = OPP[g.level - 1], L = btnsOf(g, S);
    screenBg(g, c, S);
    g.text(c, g.t('battleOf', { n: g.level, m: OPP.length }), 640, 38, { size: 30, weight: 900, color: '#ffd84d', stroke: OL, strokeW: 6 });
    panelBox(g, c, 36, 74, 592, 624); panelBox(g, c, 668, 74, 576, 624);
    // היריב
    const bob = Math.sin(S.clock * 2) * 4;
    c.save(); c.translate(332, 214 + bob); c.rotate(S.clock * 0.3);
    for (let r = 0; r < 10; r++) { c.rotate(TAU / 10); poly(c, [[0, 0], [-22, -150], [22, -150]]); c.fillStyle = 'rgba(255,233,160,.07)'; c.fill(); }
    c.restore();
    E(c, 332, 214 + bob, 108, 108); fl(c, lgr(c, 100, 330, '#ffe7a0', '#b77a1c'), 4);
    c.drawImage(heroImg(g, o.art, o.el), 332 - 100, 214 + bob - 100, 200, 200);
    hpBadge(c, g, 426, 290 + bob, 26, o.hp, '#fff');
    const nm = g.t('o_' + o.id);
    g.text(c, nm, 332, 352, { size: fitSize(c, nm, 32, 540, 900), weight: 900, color: '#fff', stroke: OL, strokeW: 6 });
    const st = g.levelStars(g.level);
    if (st) for (let k = 0; k < 3; k++) star(c, 290 + k * 42, 386, 15, k < st ? '#ffd84d' : 'rgba(255,255,255,.2)');
    const q = fitBlock(c, '“' + g.t('q_' + o.id) + '”', 500, 52, 19, 700);
    q.ls.forEach((l, i) => g.text(c, l, 332, (st ? 420 : 400) + i * q.z * 1.2, { size: q.z, weight: 700, color: '#e6dcff' }));
    g.text(c, st ? g.t('beaten') : g.t('reward'), 332, 474, { size: 20, weight: 800, color: st ? '#7dff6a' : '#ffd84d' });
    o.rw.forEach((id, k) => drawCardAt(g, c, id, 250 + k * 164, 600, 0.78, (k - 0.5) * 0.1, { dim: !!st }));
    // החפיסה שלך
    g.text(c, g.t('yourDeck'), 956, 116, { size: 28, weight: 900, color: '#fff', stroke: OL, strokeW: 5 });
    for (const b of L) {
      if (b.id === 'deck') drawDeckBox(g, c, S, b);
      else if (b.id === 'edit') drawBtn(g, c, S, b, '✎ ' + g.t('edit'), 'blue', { size: 21 });
      else if (b.id === 'fight') drawBtn(g, c, S, b, g.t('fight'), 'gold', { size: 34, pulse: true });
    }
  }
  function drawEditor(g, c, S) {
    const E2 = S.ed, L = btnsOf(g, S), cnt = E2.list.length;
    screenBg(g, c, S);
    panelBox(g, c, 14, 76, 902, 400); panelBox(g, c, 922, 14, 342, 596);
    const tt = g.t('d_mine');
    g.text(c, tt, 465, 40, { size: fitSize(c, tt, 32, 600, 900), weight: 900, color: '#ffd84d', stroke: OL, strokeW: 6 });
    g.text(c, cnt + ' / ' + DECK, 1093, 52, { size: 34, weight: 900, color: cnt === DECK ? '#7dff6a' : '#fff', stroke: OL, strokeW: 6 });
    let hovCard = null;
    for (const b of L) {
      if (b.id === 'card') {
        const open = E2.un.has(b.card), n = countIn(E2.list, b.card), hov = S.btnHover === b, cx = b.x + b.w / 2, cy = b.y + b.h / 2 - (hov ? 4 : 0);
        const fresh = E2.flash && E2.flash.id === b.card && S.clock - E2.flash.t0 < 0.3;
        drawCardAt(g, c, b.card, cx, cy, ED_S * (fresh ? 1.08 : 1), 0, { back: !open, glow: hov && open ? 'rgba(255,255,255,.6)' : n === COPIES ? 'rgba(255,216,77,.85)' : null });
        if (!open) lockIcon(c, cx, cy, 1.1);
        if (n) { E(c, b.x + b.w - 6, b.y + 6, 15, 15); fl(c, '#ffd84d', 2.5); g.text(c, '×' + n, b.x + b.w - 6, b.y + 7, { size: 15, weight: 900, color: '#3a2208' }); }
        if (hov && open) hovCard = b.card;
      } else if (b.id === 'row') {
        const C = CARDS[b.card], hov = S.btnHover === b;
        g.rr(c, b.x, b.y, b.w, b.h, 8); c.fillStyle = hov ? 'rgba(255,90,90,.35)' : 'rgba(255,255,255,.07)'; c.fill();
        g.rr(c, b.x, b.y, 6, b.h, 3); c.fillStyle = EL[C.el].m; c.fill();
        gem(c, g, b.x + 20, b.y + b.h / 2, 10, C.c);
        const nm = g.t('c_' + b.card);
        g.text(c, nm, b.x + 160, b.y + b.h / 2 + 1, { size: fitSize(c, nm, 15, 220, 700), weight: 700, color: '#fff' });
        g.text(c, hov ? '−' : '×' + b.n, b.x + b.w - 20, b.y + b.h / 2 + 1, { size: hov ? 20 : 15, weight: 900, color: hov ? '#ff9c9c' : '#ffd84d' });
      }
    }
    const pk = hovCard || E2.peek;
    if (pk) drawCardAt(g, c, pk, 112, 590, 0.98, 0);
    else { g.rr(c, 38, 486, 148, 206, 14); c.lineWidth = 2; c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke(); c.setLineDash([]); }
    const hint = g.t('maxCopies');
    g.text(c, hint, 560, 520, { size: fitSize(c, hint, 20, 680, 700), weight: 700, color: '#e6dcff' });
    for (const b of L) {
      if (b.id === 'auto') drawBtn(g, c, S, b, g.t('auto'), 'blue', { size: 21 });
      else if (b.id === 'clear') drawBtn(g, c, S, b, g.t('clear'), 'red', { size: 21 });
      else if (b.id === 'done') drawBtn(g, c, S, b, g.t('done'), 'gold', { size: 30, pulse: cnt === DECK });
    }
  }
  // ---------- תמונה קבועה מאחורי התפריט ----------
  function demoView(g, S) {
    const u = (id, k, o) => Object.assign(mkUnit(900 + k, id), { sick: false }, o || {});
    S.opp = OPP[6];
    S.deck = 'forest'; S.deckName = g.t('d_forest');
    S.V = {
      t: 4, cur: 0,
      p: [
        { hp: 16, max: PHP, mana: 3, mm: 5, deckN: 11, hand: ['fireball', 'bear', 'owlet', 'growth', 'zap'].map((id, k) => ({ u: 800 + k, id })), b: [null, u('wolf', 1), u('phoenix', 2, { sh: false }), u('knight', 3), null] },
        { hp: 13, max: 24, mana: 0, mm: 5, deckN: 10, hand: [1, 2, 3, 4].map(k => ({ u: 850 + k, id: 'imp' })), b: [u('eagle', 4), null, u('kraken', 5, { hp: 4 }), u('pony', 6), null] },
      ],
    };
    S.hpos.clear();
    S.V.p[0].hand.forEach((c, k) => S.hpos.set(c.u, handLayout(5, k)));
    S.V.p[1].hand.forEach((c, k) => S.hpos.set(c.u, enemyHandLayout(4, k)));
    S.phase = 'demo';
  }

  // קלף לתמונת הכרטיס: בלי שם ובלי טקסט, רק ציור גדול ומספרים
  function coverCard(c, U, id) {
    const C = CARDS[id], P = EL[C.el];
    g2rr(c, 0, 0, CW, CH, 13);
    const q = c.createLinearGradient(0, 0, 0, CH); q.addColorStop(0, U.shade(P.m, 0.38)); q.addColorStop(0.45, P.m); q.addColorStop(1, P.d);
    c.fillStyle = q; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OL; c.stroke();
    g2rr(c, 7, 7, CW - 14, CH - 14, 9); c.fillStyle = U.shade(P.d, -0.35); c.fill();
    c.save(); g2rr(c, 11, 11, CW - 22, CH - 22, 9); c.clip();
    artBg(c, U, C.el, CW / 2, CH / 2 - 8, 130, 190);
    c.translate(CW / 2, CH / 2 + 4); ART[id](c, 52, U);
    c.restore();
    g2rr(c, 11, 11, CW - 22, CH - 22, 9); c.lineWidth = 2.5; c.strokeStyle = U.shade(P.l, 0.2); c.stroke();
    gem(c, U, 19, 19, 16, C.c);
    emblem(c, CW - 18, 18, 10, C.el);
    if (C.unit) { atkBadge(c, U, 19, CH - 17, 15, C.a); hpBadge(c, U, CW - 19, CH - 19, 15, C.h); }
  }

  GK.register('card-battle', {
    w: W, h: H, bg: '#140e24', accent: '#ffd84d',
    levels: OPP.length,
    text: TEXT,
    rules: { R, CARDS, OPP, DECKS, START, IDS, parse, autoFill, PRIO, PHP },   // לבדיקות ולסימולציות

    init(g) {
      const S = g.s = newState(g);
      if (g.demo) { demoView(g, S); return; }
      if (!DK.includes(S.deck) || !deckOpen(S.deck, unlockedSet(g))) S.deck = 'forest';
      S.phase = 'prep'; S.btns = null;
    },
    step(g) {
      const S = g.s;
      if (S.phase === 'battle') {
        stepBattle(g, S); handTargets(g, S); hoverUpdate(g, S);
        g.hud([['', g.t('o_' + S.opp.id)], [g.t('turn'), S.V.t || 1]]);
        return;
      }
      S.clock += 1 / 60;
      S.btnHover = g.ptr.over && !g.touch ? btnAt(g, S, g.ptr.x, g.ptr.y) : null;
      g.hud([['', g.t('battleOf', { n: g.level, m: OPP.length })]]);
    },
    idle(g) {
      const S = g.s;
      if (!S) return;
      S.clock += 1 / 60;
      if (S.phase === 'battle') { tidy(S); revealFx(g, S); handTargets(g, S); }
    },
    bot(g) { botStep(g, g.s); },
    onPointer(g, type, p) {
      const S = g.s;
      if (S.phase === 'battle') battlePtr(g, S, type, p);
      else if (S.phase === 'prep' || S.phase === 'edit') uiPtr(g, S, type, p);
    },
    onKey(g, e) {
      const S = g.s, k = e.code;
      if (S.phase === 'battle' && (k === 'Space' || k === 'Enter' || k === 'KeyE')) { if (!endTurn(g, S) && S.B && S.B.cur === 1) g.sfx('error'); }
      else if (S.phase === 'prep' && (k === 'Enter' || k === 'Space')) startBattle(g, S);
      else if (S.phase === 'edit' && k === 'Enter') closeEditor(g, S);
    },
    onLang(g) {
      const S = g.s;
      if (!S) return;
      S.btns = null; S.deckName = g.t('d_' + S.deck);
      if (S.say && S.opp) S.say.txt = g.t('q_' + S.opp.id);
    },
    draw(g, ctx) {
      const S = g.s;
      if (!S) return;
      if (S.phase === 'prep') drawPrep(g, ctx, S);
      else if (S.phase === 'edit') drawEditor(g, ctx, S);
      else drawBattle(g, ctx, S);
    },

    cover(ctx, w, h, k) {
      let q = ctx.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.75);
      q.addColorStop(0, '#6a4bb0'); q.addColorStop(0.55, '#2c1d52'); q.addColorStop(1, '#110a22');
      ctx.fillStyle = q; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2, h * 0.45); ctx.globalAlpha = 0.13;
      for (let r = 0; r < 18; r++) { ctx.rotate(TAU / 18); poly(ctx, [[0, 0], [-46, -700], [46, -700]]); ctx.fillStyle = '#ffe9a0'; ctx.fill(); }
      ctx.restore();
      const R0 = k.seeded(36);
      for (let i = 0; i < 46; i++) sparkle(ctx, R0() * w, R0() * h, 3 + R0() * 7, R0() < 0.5 ? '#fff3c4' : '#d8c2ff');
      q = ctx.createLinearGradient(0, h * 0.8, 0, h); q.addColorStop(0, '#6b4524'); q.addColorStop(1, '#3a2412');
      ctx.fillStyle = q; ctx.fillRect(0, h * 0.82, w, h * 0.18);
      ctx.fillStyle = 'rgba(255,220,150,.35)'; ctx.fillRect(0, h * 0.82, w, 3);
      const cards = [['wolf', 108, 330, -0.42, 1.05], ['eagle', 852, 330, 0.42, 1.05], ['phoenix', 262, 296, -0.2, 1.3], ['kraken', 698, 296, 0.2, 1.3], ['dragon', 480, 272, 0, 1.62]];
      for (const [id, x, y, r, s] of cards) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
        if (id === 'dragon') { ctx.save(); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 60; g2rr(ctx, -CW / 2, -CH / 2, CW, CH, 13); ctx.fillStyle = '#ffb347'; ctx.fill(); ctx.restore(); }
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; g2rr(ctx, -CW / 2, -CH / 2, CW, CH, 13); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
        ctx.translate(-CW / 2, -CH / 2); coverCard(ctx, k, id);
        ctx.restore();
      }
      ctx.save(); ctx.translate(800, 104); ART.fireball(ctx, 62, k); ctx.restore();
      for (const [x, y, r] of [[724, 178, 9], [694, 206, 6], [670, 228, 4]]) { E(ctx, x, y, r, r); ctx.fillStyle = 'rgba(255,200,90,.8)'; ctx.fill(); }
      q = ctx.createLinearGradient(0, 0, 0, h); q.addColorStop(0.7, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = q; ctx.fillRect(0, 0, w, h);
    },
  });
})();
