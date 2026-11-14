// ============================================================
//  עטלף במערה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  עפים במערה חשוכה. הקירות והנטיפים נראים רק ליד העטלף, או לרגע כשהד מתפשט.
//  אוספים עשים זוהרים. רמת הקושי קובעת את המהירות, והמערה תמיד עבירה (בוט מוכיח).
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 540;
  const BX = 230;                 // מקום העטלף על המסך (x)
  const DX = 24;                  // רוחב עמודה של המערה
  const R = 10;                   // תיבת הפגיעה של העטלף (רדיוס, נדיבה)
  const GRAV = 0.24, THRUST = 0.52, FLAP = 1.8, VUP = -5.6, VDOWN = 6.4;
  const SPEED = [[2.5, 3.7], [3.1, 4.7], [3.7, 5.7]];      // התחלה → מקסימום, לפי רמת הקושי
  const GAP = [[236, 178], [212, 152], [192, 136]];        // גובה המעבר: התחלה → מינימום
  const PASS = [124, 108, 96];                             // מעבר מינימלי ליד נטיף
  const LIGHT = [104, 90, 80];                             // האור הקטן של העטלף עצמו
  const ECHO_LIFE = 72, ECHO_CD = 96, ECHO_V = 18, ECHO_MAX = 820;
  const PXM = 25;                                          // פיקסלים למטר
  const ZONE_M = 400;
  const BTN = { x: 62, y: H - 62, r: 32 };                 // כפתור ההד על הקנבס
  const ZONES = [
    { bg1: '#03040d', bg2: '#080b22', far: '#0c1030', rock0: '#141943', rock1: '#262f7c', rock2: '#4756c8', edge: '#b4c0ff', crys: '#6ff3ff', echo: '#8ff6ff' },
    { bg1: '#020a08', bg2: '#05171a', far: '#082422', rock0: '#0d2e26', rock1: '#185443', rock2: '#2c8f6b', edge: '#9dffd8', crys: '#c2ff6b', echo: '#a6ffd8' },
    { bg1: '#0a0502', bg2: '#1a0f06', far: '#26160a', rock0: '#33200d', rock1: '#633b15', rock2: '#a8661f', edge: '#ffd596', crys: '#ffe066', echo: '#ffe2a8' },
    { bg1: '#07030d', bg2: '#140821', far: '#200c31', rock0: '#2a0f40', rock1: '#4f1f76', rock2: '#8a3cbf', edge: '#f4c2ff', crys: '#ff8ad8', echo: '#f3c1ff' },
  ];
  const RING = [];
  for (let i = 0; i < 12; i++) RING.push([Math.cos(i * Math.PI / 6), Math.sin(i * Math.PI / 6)]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ----- המערה: עמודות (תקרה ורצפה), נטיפים, עשים וגבישים -----
  function makeState(diff, seed, demo) {
    const rnd = GK.U.seeded(seed);
    const S = {
      rnd, diff, demo, x: 0, px: 0, by: H / 2, pby: H / 2, vy: 0, held: false,
      started: !!demo, dead: false, deadVy: 0, spin: 0, deadT: 0,
      cols: [], spikes: [], moths: [], crys: [],
      genX: -DX * 3, genC: H / 2, genV: 0, genTf: 0.5, genRe: 0, nextSpike: 1000, nextMoth: 560, lastSp: null,
      echoes: [], cd: 0, flapPh: 0, blink: 0, pts: 0, mothN: 0, streak: 0, streakT: 0, zone: 0, score: 0,
      ptrHold: new Set(), ptrPress: false, echoReq: false, wingT: 0, hintA: 1, t: 0,
      motes: [],
    };
    const mr = GK.U.seeded(seed ^ 0x5bd1);
    for (let i = 0; i < 46; i++) S.motes.push({ x: mr() * (W + 60), y: mr() * H, z: 0.25 + mr() * 0.6, a: 0.08 + mr() * 0.18, r: 0.8 + mr() * 1.6 });
    generate(S);
    return S;
  }
  const meters = S => Math.max(0, Math.floor(S.x / PXM));
  const speedOf = S => { const d = SPEED[S.diff]; return lerp(d[0], d[1], Math.min(1, meters(S) / 1400)); };

  function ceilAt(S, x) {
    const c = S.cols, f = (x - c[0].x) / DX, i = Math.floor(f);
    if (i < 0) return c[0].t;
    if (i >= c.length - 1) return c[c.length - 1].t;
    return c[i].t + (c[i + 1].t - c[i].t) * (f - i);
  }
  function floorAt(S, x) {
    const c = S.cols, f = (x - c[0].x) / DX, i = Math.floor(f);
    if (i < 0) return c[0].b;
    if (i >= c.length - 1) return c[c.length - 1].b;
    return c[i].b + (c[i + 1].b - c[i].b) * (f - i);
  }
  // נטיף: משולש. dn = יורד מהתקרה. base עמוק בתוך הסלע, tip = הקצה
  function inSpike(sp, px, py) {
    const len = Math.abs(sp.tip - sp.base), dy = sp.dn ? py - sp.base : sp.base - py;
    if (dy < 0 || dy > len) return false;
    return Math.abs(px - sp.x) < sp.w / 2 * (1 - dy / len);
  }
  function spikeEdge(sp, px) {       // הנקודה הכי רחוקה של הנטיף בעמודה px (או null)
    const d = Math.abs(px - sp.x);
    if (d >= sp.w / 2) return null;
    return sp.base + (sp.tip - sp.base) * (1 - d / (sp.w / 2));
  }
  function effTop(S, x) {
    let t = ceilAt(S, x);
    for (const sp of S.spikes) if (sp.dn) { const e = spikeEdge(sp, x); if (e !== null && e > t) t = e; }
    return t;
  }
  function effBot(S, x) {
    let b = floorAt(S, x);
    for (const sp of S.spikes) if (!sp.dn) { const e = spikeEdge(sp, x); if (e !== null && e < b) b = e; }
    return b;
  }
  function hits(S, wx, y) {
    for (let i = 0; i < 12; i++) {
      const px = wx + RING[i][0] * R, py = y + RING[i][1] * R;
      if (py < ceilAt(S, px) || py > floorAt(S, px)) return true;
    }
    for (const sp of S.spikes) {
      if (Math.abs(sp.x - wx) > sp.w / 2 + R) continue;
      if (inSpike(sp, wx, y)) return true;
      for (let i = 0; i < 12; i++) if (inSpike(sp, wx + RING[i][0] * R, y + RING[i][1] * R)) return true;
    }
    return false;
  }

  function genCol(S) {
    const r = S.rnd, x = S.genX;
    const prog = Math.min(1, Math.max(0, x / PXM - 40) / 1500);
    const G = GAP[S.diff];
    let gap = lerp(G[0], G[1], prog);
    const intro = clamp((x - 520) / 720, 0, 1), sm = intro * intro * (3 - 2 * intro);
    gap = lerp(H - 76, gap, sm);
    const lo = gap / 2 + 20, hi = H - gap / 2 - 20;
    if (--S.genRe <= 0) { S.genTf = r(); S.genRe = 7 + Math.floor(r() * 20); }
    const tgt = lerp(lo, hi, S.genTf);
    S.genV += clamp((tgt - S.genC) * 0.035, -1.3, 1.3) * sm;
    S.genV *= 0.88;
    const vmax = 0.42 * DX;
    S.genV = clamp(S.genV, -vmax, vmax);
    S.genC = clamp(S.genC + S.genV, lo, hi);
    const nt = (r() - 0.5) * 11 * sm, nb = (r() - 0.5) * 11 * sm;
    S.cols.push({ x, t: Math.max(12, S.genC - gap / 2 + nt), b: Math.min(H - 12, S.genC + gap / 2 + nb), s: r() });
    if (r() < 0.09 && x > 300) S.crys.push({ x: x + r() * DX, top: r() < 0.5, n: 2 + Math.floor(r() * 3), s: r() * 1000, z: 0.8 + r() * 0.6 });
    S.genX += DX;
  }
  function placeSpikes(S) {
    while (S.genX - 110 > S.nextSpike) {
      const x = S.nextSpike, r = S.rnd;
      const prog = Math.min(1, Math.max(0, x / PXM - 40) / 1500);
      S.nextSpike += lerp(330, 220, prog) + r() * lerp(230, 150, prog);
      if (x < 1300) continue;                        // אין נטיפים בכניסה למערה
      const w = 44 + r() * 42, dn = r() < 0.5;
      let minB = 1e9, maxT = -1e9, minT = 1e9, maxB = -1e9;
      // הקירות ישרים בין עמודות, אז הקיצון נמצא בקצוות או בפינות של העמודות
      const xs = [x - w / 2, x, x + w / 2];
      for (const col of S.cols) if (col.x > x - w / 2 && col.x < x + w / 2) xs.push(col.x);
      for (const px of xs) {
        const t = ceilAt(S, px), b = floorAt(S, px);
        minB = Math.min(minB, b); maxT = Math.max(maxT, t); minT = Math.min(minT, t); maxB = Math.max(maxB, b);
      }
      const room = minB - maxT;
      let L = Math.min(room - PASS[S.diff], (0.36 + r() * 0.38) * room);
      const cAt = ceilAt(S, x), fAt = floorAt(S, x);
      // נטיף קרוב לקודם: חייב להשאיר מסדרון משותף, כדי שלא יהיה זיגזג בלתי אפשרי
      const P = S.lastSp;
      if (P && x - P.x < 400) {
        if (dn) L = Math.min(L, Math.min(P.b, minB) - 64 - cAt);
        else L = Math.min(L, fAt - Math.max(P.a, maxT) - 64);
      }
      if (L < 26) continue;
      const sp = dn ? { x, w, dn, base: minT - 8, tip: cAt + L } : { x, w, dn, base: maxB + 8, tip: fAt - L };
      sp.a = dn ? sp.tip : maxT; sp.b = dn ? minB : sp.tip;   // המעבר שנשאר ליד הנטיף
      sp.hue = r();
      S.spikes.push(sp);
      S.lastSp = sp;
    }
  }
  function placeMoths(S) {
    while (S.genX - 230 > S.nextMoth) {
      const x = S.nextMoth, r = S.rnd;
      S.nextMoth += 150 + r() * 220;
      let top = ceilAt(S, x) + 30, bot = floorAt(S, x) - 30;
      for (let px = x - 20; px <= x + 20; px += 10) { top = Math.max(top, effTop(S, px) + 30); bot = Math.min(bot, effBot(S, px) - 30); }
      if (bot - top < 6) continue;
      S.moths.push({ x, y: top + r() * (bot - top), ph: r() * 6.28, gold: x > 1500 && r() < 0.085, got: false });
    }
  }
  function generate(S) {
    const camX = S.x;
    while (S.genX < camX + W + 280) { genCol(S); placeSpikes(S); placeMoths(S); }
    while (S.cols.length > 3 && S.cols[1].x < camX - 60) S.cols.shift();
    while (S.spikes.length && S.spikes[0].x + S.spikes[0].w < camX - 40) S.spikes.shift();
    while (S.moths.length && S.moths[0].x < camX - 60) S.moths.shift();
    while (S.crys.length && S.crys[0].x < camX - 60) S.crys.shift();
  }

  // ----- תעופה -----
  function fly(S, hold, press) {
    if (press) S.vy -= FLAP;
    if (hold) S.vy -= THRUST;
    S.vy = clamp(S.vy + GRAV, VUP, VDOWN);
    S.pby = S.by; S.by += S.vy;
    S.held = hold;
  }
  // טייס אוטומטי: מנסה תוכניות "החזק k צעדים ואז שחרר" (ולהפך) על הפיזיקה האמיתית ובוחר את הבטוחה
  function autopilot(S, quick) {
    const v = speedOf(S), HZ = 48, stepK = quick ? 6 : 4;
    let bestHold = false, best = -Infinity;
    for (let mode = 0; mode < 2; mode++) {
      for (let k = mode; k <= HZ; k += stepK) {
        let y = S.by, vy = S.vy, held = S.held, wx = S.x + BX, minM = 1e9, alive = HZ, endC = 0, moth = 0;
        for (let i = 0; i < HZ; i++) {
          const hold = mode === 0 ? i < k : i >= k;
          if (hold && !held) vy -= FLAP;
          held = hold;
          if (hold) vy -= THRUST;
          vy += GRAV; vy = vy < VUP ? VUP : vy > VDOWN ? VDOWN : vy;
          y += vy; wx += v;
          if (hits(S, wx, y)) { alive = i; break; }
          const lo = effTop(S, wx), hi = effBot(S, wx), m = Math.min(y - lo, hi - y);
          if (m < minM) minM = m;
          if (i === HZ - 1) endC = Math.abs(y - (lo + hi) / 2);
          if (!quick && i % 3 === 0) for (const mo of S.moths) if (!mo.got && Math.abs(mo.x - wx) < 14 && Math.abs(mo.y - y) < 18) moth = 1;
        }
        const sc = alive * 1000 + Math.min(minM, 42) * 8 - endC * 0.3 + moth * 60;
        if (sc > best) { best = sc; bestHold = mode === 0 ? k > 0 : false; }
      }
    }
    return bestHold;
  }

  function echo(g, S) {
    if (S.cd > 0) { if (!S.demo) g.sfx('tick', { p: 0.6 }); return; }
    S.echoes.push({ x: S.x + BX, y: S.by, age: 0 });
    if (S.echoes.length > 3) S.echoes.shift();
    S.cd = ECHO_CD;
    if (!S.demo) {
      g.tone({ f: 2300, f2: 1250, dur: 0.2, vol: 0.13 });
      g.tone({ f: 2300, f2: 1250, dur: 0.2, vol: 0.06, delay: 0.17 });
      g.tone({ f: 2300, f2: 1250, dur: 0.2, vol: 0.028, delay: 0.34 });
    }
  }
  function tickEchoes(S) {
    if (S.cd > 0) S.cd--;
    for (let i = S.echoes.length - 1; i >= 0; i--) if (++S.echoes[i].age > ECHO_LIFE) S.echoes.splice(i, 1);
  }

  function advance(g, S, hold, press) {
    S.px = S.x;
    S.x += speedOf(S);
    fly(S, hold, press);
    generate(S);
    tickEchoes(S);
    S.flapPh += hold ? 0.46 : 0.2;
    S.t++;
    if (S.blink > 0) S.blink--; else if (S.rnd() < 0.006) S.blink = 8;
    if (S.streakT > 0 && --S.streakT === 0) S.streak = 0;
    // עשים
    const wx = S.x + BX;
    for (const m of S.moths) {
      if (m.got || Math.abs(m.x - wx) > 40) continue;
      const my = m.y + Math.sin(S.t * 0.07 + m.ph) * 7;
      if (Math.hypot(m.x - wx, my - S.by) < 25) {
        m.got = true;
        S.mothN++;
        S.streak = Math.min(S.streak + 1, 10); S.streakT = 150;
        const val = m.gold ? 50 : 10;
        S.pts += val;
        if (!S.demo) {
          g.burst(BX, S.by, { n: m.gold ? 26 : 14, color: m.gold ? ['#ffd65a', '#fff3b0', '#ffae00'] : ['#eaffb0', '#ffffff', '#b8ff6b'], speed: 3, life: 34, gravity: 0 });
          g.float(BX + 6, S.by - 26, '+' + val, { color: m.gold ? '#ffd65a' : '#eaffb0', size: m.gold ? 28 : 22 });
          if (m.gold) { g.sfx('power'); S.cd = 0; } else g.sfx('coin', { p: 1 + S.streak * 0.05 });
        } else if (m.gold) S.cd = 0;
      }
    }
    const z = Math.floor(meters(S) / ZONE_M) % ZONES.length;
    if (z !== S.zone) {
      S.zone = z;
      if (!S.demo) { g.msg(g.t('zone', { n: Math.floor(meters(S) / ZONE_M) + 1 }), 1500, ZONES[z].edge); g.sfx('power'); g.flash(ZONES[z].echo, 0.15); }
    }
    S.score = meters(S) + S.pts;
    if (hits(S, wx, S.by)) crash(g, S);
  }
  function crash(g, S) {
    S.dead = true;
    S.deadVy = Math.min(S.vy, -2.5);
    S.pby = S.by;
    if (!S.demo) {
      g.sfx('hit');
      g.shake(10);
      g.flash('#ffffff', 0.18);
      const Z = ZONES[S.zone];
      g.burst(BX, S.by, { n: 26, color: [Z.rock2, Z.edge, '#ffffff'], speed: 4, life: 40, shape: 'square', size: 5 });
      g.end({ score: S.score, text: g.t('flew', { n: meters(S) }), delay: 1150 });
    }
  }
  function deadStep(S) {
    S.deadT++;
    S.spin += 0.16;
    S.pby = S.by;
    tickEchoes(S);
    if (S.deadVy === 0) return;
    S.deadVy = Math.min(S.deadVy + GRAV, VDOWN);
    S.by += S.deadVy;
    const fl = floorAt(S, S.x + BX) - 11;
    if (S.by > fl) { S.by = fl; S.deadVy = 0; }
  }

  // ----- ציור -----
  let MASK = null;
  function maskCtx() {
    if (!MASK) { const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; MASK = c.getContext('2d'); }
    return MASK;
  }
  function drawBackground(ctx, S, camX, Z) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, Z.bg1); gr.addColorStop(0.5, Z.bg2); gr.addColorStop(1, Z.bg1);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // קירות רחוקים (פרלקסה)
    ctx.fillStyle = Z.far;
    for (const top of [true, false]) {
      ctx.beginPath();
      const off = camX * 0.35;
      ctx.moveTo(0, top ? 0 : H);
      for (let sx = 0; sx <= W + 20; sx += 20) {
        const wx = sx + off;
        const d = 70 + Math.sin(wx * 0.006) * 34 + Math.sin(wx * 0.017 + (top ? 0 : 2)) * 16 + Math.sin(wx * 0.041) * 6;
        ctx.lineTo(sx, top ? d : H - d);
      }
      ctx.lineTo(W + 20, top ? 0 : H);
      ctx.closePath(); ctx.fill();
    }
  }
  function drawRock(ctx, S, camX, Z) {
    const c = S.cols;
    for (const top of [true, false]) {
      const edgePath = () => { ctx.beginPath(); for (let i = 0; i < c.length; i++) { const sx = c[i].x - camX, sy = top ? c[i].t : c[i].b; if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); } };
      ctx.beginPath();
      ctx.moveTo(c[0].x - camX, top ? -4 : H + 4);
      for (const col of c) ctx.lineTo(col.x - camX, top ? col.t : col.b);
      ctx.lineTo(c[c.length - 1].x - camX, top ? -4 : H + 4);
      ctx.closePath();
      const gr = top ? ctx.createLinearGradient(0, 0, 0, H * 0.32) : ctx.createLinearGradient(0, H, 0, H * 0.68);
      gr.addColorStop(0, Z.rock0); gr.addColorStop(1, Z.rock1);
      ctx.fillStyle = gr; ctx.fill();
      ctx.save();
      ctx.clip();
      // אבנים קטנות בתוך הסלע
      ctx.fillStyle = Z.rock0;
      for (let i = 0; i < c.length; i += 2) {
        const col = c[i];
        if (col.s > 0.6) continue;
        const sx = col.x - camX + col.s * 18, sy = top ? col.t - 22 - col.s * 46 : col.b + 22 + col.s * 46;
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.ellipse(sx, sy, 5 + col.s * 10, 3 + col.s * 5, col.s * 3, 0, Math.PI * 2); ctx.fill();
      }
      // שוליים בהירים לאורך הקצה
      edgePath();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = Z.rock2;
      ctx.globalAlpha = 0.3; ctx.lineWidth = 48; ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.lineWidth = 22; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 9; ctx.stroke();
      ctx.restore();
      edgePath();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = Z.edge; ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  function drawSpikes(ctx, S, camX, Z) {
    for (const sp of S.spikes) {
      const sx = sp.x - camX;
      if (sx < -100 || sx > W + 100) continue;
      const gr = ctx.createLinearGradient(0, sp.base, 0, sp.tip);
      gr.addColorStop(0, Z.rock1); gr.addColorStop(0.45, Z.rock2); gr.addColorStop(1, Z.edge);
      ctx.beginPath(); ctx.moveTo(sx - sp.w / 2, sp.base); ctx.lineTo(sx, sp.tip); ctx.lineTo(sx + sp.w / 2, sp.base); ctx.closePath();
      ctx.fillStyle = gr; ctx.fill();
      // צד מואר וטבעות
      ctx.beginPath(); ctx.moveTo(sx - sp.w * 0.18, sp.base + (sp.tip - sp.base) * 0.35); ctx.lineTo(sx, sp.tip); ctx.lineTo(sx - sp.w * 0.05, sp.base + (sp.tip - sp.base) * 0.3); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
      ctx.strokeStyle = Z.edge; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(sx - sp.w / 2, sp.base); ctx.lineTo(sx, sp.tip); ctx.lineTo(sx + sp.w / 2, sp.base); ctx.stroke();
    }
  }
  function drawCrystals(ctx, S, camX, Z) {
    for (const cr of S.crys) {
      const sx = cr.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      const base = cr.top ? ceilAt(S, cr.x) - 3 : floorAt(S, cr.x) + 3, dir = cr.top ? 1 : -1;
      for (let i = 0; i < cr.n; i++) {
        const a = (i - (cr.n - 1) / 2) * 0.42 + Math.sin(cr.s + i) * 0.12, len = (12 + ((cr.s * (i + 3)) % 13)) * cr.z, wd = 4.2 * cr.z;
        ctx.save(); ctx.translate(sx + (i - (cr.n - 1) / 2) * 5, base); ctx.rotate(a * dir);
        ctx.beginPath(); ctx.moveTo(-wd, 0); ctx.lineTo(-wd, dir * len * 0.75); ctx.lineTo(0, dir * len); ctx.lineTo(wd, dir * len * 0.75); ctx.lineTo(wd, 0); ctx.closePath();
        ctx.fillStyle = Z.crys; ctx.globalAlpha = 0.85; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, dir * len); ctx.lineTo(wd, dir * len * 0.75); ctx.lineTo(wd, 0); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.3; ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }
  function lightHole(m, x, y, r, a, ring) {
    if (r < 2 || a <= 0.01) return;
    const gr = m.createRadialGradient(x, y, 0, x, y, r);
    if (ring) {
      gr.addColorStop(0, 'rgba(0,0,0,' + (a * 0.6).toFixed(3) + ')');
      gr.addColorStop(Math.max(0, 1 - 80 / r), 'rgba(0,0,0,' + (a * 0.8).toFixed(3) + ')');
      gr.addColorStop(0.97, 'rgba(0,0,0,' + a.toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      gr.addColorStop(0, 'rgba(0,0,0,' + a.toFixed(3) + ')');
      gr.addColorStop(0.5, 'rgba(0,0,0,' + (a * 0.8).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
    }
    m.fillStyle = gr;
    m.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const echoR = e => Math.min(ECHO_MAX, ECHO_V * e.age + 10);
  const echoA = e => { const u = e.age / ECHO_LIFE; return Math.max(0, 1 - u * u * u); };
  function drawMask(ctx, S, camX, by, Z, t) {
    const m = maskCtx();
    m.setTransform(0.5, 0, 0, 0.5, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.fillStyle = Z.bg1; m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'destination-out';
    lightHole(m, BX, by, LIGHT[S.diff] * (S.dead ? 0.8 : 1) * (S.batS || 1), 1, false);
    for (const e of S.echoes) lightHole(m, e.x - camX, e.y, echoR(e), echoA(e), true);
    for (const mo of S.moths) if (!mo.got) { const sx = mo.x - camX; if (sx > -60 && sx < W + 60) lightHole(m, sx, mo.y + Math.sin(t * 0.07 + mo.ph) * 7, mo.gold ? 62 : 44, 0.55, false); }
    m.globalCompositeOperation = 'source-over';
    ctx.drawImage(m.canvas, 0, 0, W, H);
  }
  function drawEchoRings(ctx, S, camX, Z) {
    for (const e of S.echoes) {
      const r = echoR(e), a = echoA(e);
      if (r >= ECHO_MAX) continue;
      const fade = a * (1 - r / ECHO_MAX);
      ctx.save();
      ctx.strokeStyle = Z.echo; ctx.shadowColor = Z.echo; ctx.shadowBlur = 14;
      ctx.globalAlpha = fade; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x - camX, e.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * 0.4; ctx.lineWidth = 2;
      if (r > 40) { ctx.beginPath(); ctx.arc(e.x - camX, e.y, r - 34, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawMoth(ctx, x, y, t, gold) {
    const r = gold ? 30 : 22;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, gold ? 'rgba(255,214,90,.8)' : 'rgba(225,255,160,.62)');
    gr.addColorStop(1, gold ? 'rgba(255,170,40,0)' : 'rgba(170,255,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const wf = 0.35 + Math.abs(Math.sin(t * 0.55)) * 0.9, s = gold ? 1.35 : 1;
    ctx.fillStyle = gold ? '#fff0b0' : '#f2ffd6';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(x + side * 4.2 * s * wf, y - 2 * s, 4.6 * s * wf, 4 * s, side * -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + side * 3.2 * s * wf, y + 2.6 * s, 3.2 * s * wf, 2.8 * s, side * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = gold ? '#c27a00' : '#6b8f2a';
    ctx.beginPath(); ctx.ellipse(x, y, 1.8 * s, 4.8 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawWing(ctx, side, f) {
    const ty = -3 + f * 19;
    ctx.beginPath();
    ctx.moveTo(side * 8, -5);
    ctx.quadraticCurveTo(side * 21, -17 + f * 9, side * 41, ty - 7);
    ctx.quadraticCurveTo(side * 37, ty + 1, side * 34, ty + 9);
    ctx.quadraticCurveTo(side * 29, ty + 2, side * 24, ty + 9 - f * 5);
    ctx.quadraticCurveTo(side * 19, ty + 2 - f * 4, side * 14, 5 + f * 3);
    ctx.quadraticCurveTo(side * 11, 2, side * 8, 6);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, -18, 0, 20);
    gr.addColorStop(0, '#5a4596'); gr.addColorStop(1, '#2f2352');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#7d68c4'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * 8, -5); ctx.quadraticCurveTo(side * 21, -17 + f * 9, side * 41, ty - 7); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(side * 22, -12 + f * 8); ctx.lineTo(side * 34, ty + 8); ctx.moveTo(side * 18, -9 + f * 6); ctx.lineTo(side * 24, ty + 8 - f * 5); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawBat(ctx, x, y, o) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(o.ang || 0);
    const s = o.s || 1; ctx.scale(s, s);
    const f = o.flap;
    drawWing(ctx, -1, f); drawWing(ctx, 1, f);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#4a3a7c';
      ctx.beginPath(); ctx.moveTo(side * 3 + 1.5, -8); ctx.lineTo(side * 9 + 1.5, -23); ctx.lineTo(side * 12.5 + 1.5, -5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9fd0';
      ctx.beginPath(); ctx.moveTo(side * 5 + 1.5, -8); ctx.lineTo(side * 9 + 1.5, -18.5); ctx.lineTo(side * 10.8 + 1.5, -7); ctx.closePath(); ctx.fill();
    }
    const gr = ctx.createRadialGradient(-3, -5, 2, 0, 0, 15);
    gr.addColorStop(0, '#9682d8'); gr.addColorStop(1, '#4a3a7c');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(0, 0, 13.5, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,205,255,.3)';
    ctx.beginPath(); ctx.ellipse(1.5, 6, 7.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-1.5, 7]) {
      if (o.dead) {
        ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(ex - 2.6, -5.6); ctx.lineTo(ex + 2.6, -0.4); ctx.moveTo(ex + 2.6, -5.6); ctx.lineTo(ex - 2.6, -0.4); ctx.stroke();
      } else if (o.blink) {
        ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(ex - 3, -3); ctx.quadraticCurveTo(ex, -1, ex + 3, -3); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, -3, 3.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(ex + 1.2, -2.6, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.9, -3.6, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,130,190,.45)';
    ctx.beginPath(); ctx.ellipse(-4.5, 3, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(10.5, 3, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1, 4.5); ctx.quadraticCurveTo(3.5, 7, 6, 4.5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(4.2, 5.6); ctx.lineTo(5.2, 8.2); ctx.lineTo(5.9, 5.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawDizzy(ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const a = t * 0.12 + i * 2.09, sx = x + Math.cos(a) * 18, sy = y - 20 + Math.sin(a) * 6;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? 2.2 : 5, aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill();
    }
  }
  function drawEchoButton(g, ctx, S, Z, t) {
    const ready = S.cd <= 0, p = 1 - S.cd / ECHO_CD;
    ctx.save();
    ctx.globalAlpha = 0.92;
    g.circle(ctx, BTN.x, BTN.y, BTN.r);
    ctx.fillStyle = 'rgba(8,10,24,.72)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
    ctx.strokeStyle = Z.echo; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.globalAlpha = ready ? 0.95 : 0.6;
    ctx.beginPath(); ctx.arc(BTN.x, BTN.y, BTN.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    const pulse = ready ? 1 + Math.sin(t * 0.15) * 0.08 : 1;
    ctx.globalAlpha = ready ? 1 : 0.45; ctx.lineWidth = 2.6;
    ctx.fillStyle = Z.echo;
    g.circle(ctx, BTN.x - 9, BTN.y, 3.2); ctx.fill();
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(BTN.x - 9, BTN.y, i * 6.5 * pulse, -0.75, 0.75); ctx.stroke(); }
    ctx.restore();
  }
  function drawMotes(ctx, S, camX) {
    ctx.fillStyle = '#cfd8ff';
    for (const m of S.motes) {
      let sx = (m.x - camX * m.z) % (W + 60); if (sx < 0) sx += W + 60;
      ctx.globalAlpha = m.a;
      ctx.beginPath(); ctx.arc(sx - 30, m.y + Math.sin((camX * 0.01 + m.x) * 0.3) * 4, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawScene(g, ctx, S, camX, by, t, batS) {
    const Z = ZONES[S.zone];
    drawBackground(ctx, S, camX, Z);
    drawCrystals(ctx, S, camX, Z);
    drawRock(ctx, S, camX, Z);
    drawSpikes(ctx, S, camX, Z);
    drawMask(ctx, S, camX, by, Z, t);
    drawMotes(ctx, S, camX);
    drawEchoRings(ctx, S, camX, Z);
    for (const m of S.moths) {
      if (m.got) continue;
      const sx = m.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      const my = m.y + Math.sin(t * 0.07 + m.ph) * 7;
      if (batS) { ctx.save(); ctx.translate(sx, my); ctx.scale(1.45, 1.45); drawMoth(ctx, 0, 0, t + m.ph * 10, m.gold); ctx.restore(); }
      else drawMoth(ctx, sx, my, t + m.ph * 10, m.gold);
    }
    const ang = S.dead ? S.spin : clamp(S.vy * 0.05, -0.35, 0.45);
    const flap = S.dead ? 0.6 : Math.sin(S.flapPh);
    drawBat(ctx, BX, by, { ang, flap, blink: S.blink > 0, dead: S.dead, s: batS || 1 });
    if (S.dead) drawDizzy(ctx, BX, by, t);
  }

  GK.register('bat-cave', {
    w: W, h: H, bg: '#05071a', accent: '#8ff6ff',
    diffs: true,
    touch: [['Space', '〰'], null, ['ArrowUp', '▲']],
    text: {
      he: { title: 'עטלף במערה', help: ['החזק ↑, W או את העכבר — העטלף עף למעלה', 'רווח או קליק ימני — הד שמאיר את המערה לרגע', 'אל תיגע בקירות ובנטיפים. רואים אותם רק מקרוב או בהד', 'אסוף עשים זוהרים. עש זהב שווה 50 וממלא את ההד'], helpTouch: ['החזק את המסך — העטלף עף למעלה', 'כפתור 〰 — הד שמאיר את המערה לרגע', 'אל תיגע בקירות ובנטיפים', 'אסוף עשים זוהרים. עש זהב שווה 50!'], start: 'החזק ↑ או את העכבר כדי לעוף', startT: 'החזק את המסך כדי לעוף', start2: 'רווח — הד', start2T: '〰 — הד', moths: 'עשים', zone: 'אזור {n}!', flew: 'עפת {n} מטר' },
      en: { title: 'Bat Cave', help: ['Hold ↑, W or the mouse — the bat flies up', 'Space or right-click — an echo lights up the cave for a moment', "Don't touch the walls or the stalactites. You only see them up close or in the echo", 'Collect glowing moths. A golden moth is worth 50 and refills the echo'], helpTouch: ['Hold the screen — the bat flies up', 'The 〰 button — an echo lights up the cave for a moment', "Don't touch the walls or the stalactites", 'Collect glowing moths. A golden moth is worth 50!'], start: 'Hold ↑ or the mouse to fly', startT: 'Hold the screen to fly', start2: 'Space — echo', start2T: '〰 — echo', moths: 'Moths', zone: 'Zone {n}!', flew: 'You flew {n} m' },
      ar: { title: 'خفاش في الكهف', help: ['اضغط مطولاً على ↑ أو W أو الفأرة — يطير الخفاش للأعلى', 'المسافة أو النقر الأيمن — صدى يضيء الكهف للحظة', 'لا تلمس الجدران والهوابط. لا تراها إلا عن قرب أو بالصدى', 'اجمع العث المضيء. العثة الذهبية تساوي 50 وتملأ الصدى'], helpTouch: ['اضغط مطولاً على الشاشة — يطير الخفاش للأعلى', 'زر 〰 — صدى يضيء الكهف للحظة', 'لا تلمس الجدران والهوابط', 'اجمع العث المضيء. العثة الذهبية تساوي 50!'], start: 'اضغط مطولاً على ↑ أو الفأرة لتطير', startT: 'اضغط مطولاً على الشاشة لتطير', start2: 'المسافة — صدى', start2T: '〰 — صدى', moths: 'العث', zone: 'المنطقة {n}!', flew: 'طرت {n} م' },
      es: { title: 'Murciélago en la cueva', help: ['Mantén ↑, W o el ratón: el murciélago sube', 'Espacio o clic derecho: un eco ilumina la cueva un momento', 'No toques las paredes ni las estalactitas. Solo se ven de cerca o con el eco', 'Atrapa polillas brillantes. Una dorada vale 50 y recarga el eco'], helpTouch: ['Mantén pulsada la pantalla: el murciélago sube', 'Botón 〰: un eco ilumina la cueva un momento', 'No toques las paredes ni las estalactitas', 'Atrapa polillas brillantes. ¡Una dorada vale 50!'], start: 'Mantén ↑ o el ratón para volar', startT: 'Mantén pulsada la pantalla para volar', start2: 'Espacio: eco', start2T: '〰: eco', moths: 'Polillas', zone: '¡Zona {n}!', flew: 'Volaste {n} m' },
      fr: { title: 'Chauve-souris des cavernes', help: ['Maintiens ↑, W ou la souris : la chauve-souris monte', "Espace ou clic droit : un écho éclaire la grotte un instant", "Ne touche ni les parois ni les stalactites. On ne les voit que de près ou avec l'écho", "Attrape les papillons de nuit lumineux. Un doré vaut 50 et recharge l'écho"], helpTouch: ["Maintiens l'écran : la chauve-souris monte", 'Bouton 〰 : un écho éclaire la grotte un instant', 'Ne touche ni les parois ni les stalactites', 'Attrape les papillons de nuit lumineux. Un doré vaut 50 !'], start: 'Maintiens ↑ ou la souris pour voler', startT: "Maintiens l'écran pour voler", start2: 'Espace : écho', start2T: '〰 : écho', moths: 'Papillons', zone: 'Zone {n} !', flew: 'Tu as volé {n} m' },
      pt: { title: 'Morcego na Caverna', help: ['Segure ↑, W ou o mouse: o morcego sobe', 'Espaço ou clique direito: um eco ilumina a caverna por um momento', 'Não toque nas paredes nem nas estalactites. Só dá para vê-las de perto ou com o eco', 'Pegue mariposas brilhantes. Uma dourada vale 50 e recarrega o eco'], helpTouch: ['Segure a tela: o morcego sobe', 'Botão 〰: um eco ilumina a caverna por um momento', 'Não toque nas paredes nem nas estalactites', 'Pegue mariposas brilhantes. Uma dourada vale 50!'], start: 'Segure ↑ ou o mouse para voar', startT: 'Segure a tela para voar', start2: 'Espaço: eco', start2T: '〰: eco', moths: 'Mariposas', zone: 'Zona {n}!', flew: 'Você voou {n} m' },
      ru: { title: 'Летучая мышь в пещере', help: ['Держи ↑, W или кнопку мыши — мышка летит вверх', 'Пробел или правый клик — эхо на миг освещает пещеру', 'Не касайся стен и сталактитов. Их видно только вблизи или в эхе', 'Лови светящихся мотыльков. Золотой — 50 очков и полное эхо'], helpTouch: ['Держи палец на экране — мышка летит вверх', 'Кнопка 〰 — эхо на миг освещает пещеру', 'Не касайся стен и сталактитов', 'Лови светящихся мотыльков. Золотой — 50 очков!'], start: 'Держи ↑ или мышь, чтобы лететь', startT: 'Держи палец на экране, чтобы лететь', start2: 'Пробел — эхо', start2T: '〰 — эхо', moths: 'Мотыльки', zone: 'Зона {n}!', flew: 'Ты пролетел {n} м' },
      de: { title: 'Fledermaushöhle', help: ['Halte ↑, W oder die Maus – die Fledermaus fliegt hoch', 'Leertaste oder Rechtsklick – ein Echo erhellt kurz die Höhle', 'Berühre keine Wände und Tropfsteine. Du siehst sie nur aus der Nähe oder im Echo', 'Sammle leuchtende Motten. Eine goldene zählt 50 und füllt das Echo auf'], helpTouch: ['Halte den Bildschirm – die Fledermaus fliegt hoch', 'Taste 〰 – ein Echo erhellt kurz die Höhle', 'Berühre keine Wände und Tropfsteine', 'Sammle leuchtende Motten. Eine goldene zählt 50!'], start: 'Halte ↑ oder die Maus zum Fliegen', startT: 'Halte den Bildschirm zum Fliegen', start2: 'Leertaste – Echo', start2T: '〰 – Echo', moths: 'Motten', zone: 'Zone {n}!', flew: 'Du bist {n} m geflogen' },
    },

    init(g) {
      const seed = (Math.random() * 2147483647) | 0;
      const S = g.s = makeState(g.diff, seed, g.demo);
      S.seed = seed;
      if (g.demo) {
        // תמונה יפה מאחורי התפריט: העטלף כבר בתוך המערה, עם הד באמצע הדרך
        for (let i = 0; i < 420 && !S.dead; i++) { const h = autopilot(S, true); advance(g, S, h, h && !S.held); if (i === 380) echo(g, S); }
      }
    },

    // בתפריט: טייס אוטומטי שקט. אחרי התרסקות: העטלף נופל ומסתחרר
    idle(g) {
      const S = g.s;
      if (!S) return;
      if (S.dead) { deadStep(S); return; }
      if (!g.demo) return;
      const h = autopilot(S, true);
      advance(g, S, h, h && !S.held);
      if (S.t % 110 === 0) echo(g, S);
      if (S.dead) { const d = S.diff; g.s = makeState(d, (Math.random() * 2147483647) | 0, true); }
    },

    step(g) {
      const S = g.s;
      if (S.dead) { deadStep(S); return; }
      // botHold/botPress: הקלט של בוט הבדיקות, נצרך בכל צעד (לא נשאר "תקוע" כשהבוט נכבה)
      const hold = g.key('ArrowUp') || g.key('KeyW') || S.ptrHold.size > 0 || S.botHold;
      const press = g.hit('ArrowUp') || g.hit('KeyW') || S.ptrPress || S.botPress;
      S.botHold = S.botPress = false;
      const wantEcho = g.hit('Space') || g.hit('KeyE') || g.hit('Enter') || S.echoReq;
      S.ptrPress = false; S.echoReq = false;
      if (!S.started) {
        S.t++;
        S.flapPh += 0.22;
        S.pby = S.by; S.by = H / 2 + Math.sin(S.t * 0.06) * 7;
        if (S.blink > 0) S.blink--; else if (Math.random() < 0.006) S.blink = 8;
        if (hold || press || wantEcho) {
          S.started = true; S.vy = 0;
          echo(g, S);
          if (hold || press) { S.vy = -FLAP; g.noise({ filter: 'bandpass', f: 700, f2: 260, dur: 0.12, vol: 0.06, q: 1.2 }); }
        }
      } else {
        if (wantEcho) echo(g, S);
        if (press) g.noise({ filter: 'bandpass', f: 760, f2: 280, dur: 0.12, vol: 0.06, q: 1.2 });
        else if (hold && S.t % 16 === 0) g.noise({ filter: 'bandpass', f: 620, f2: 260, dur: 0.1, vol: 0.03, q: 1.2 });
        advance(g, S, hold, press);
        if (S.hintA > 0) S.hintA = Math.max(0, S.hintA - 0.02);
      }
      const b = g.getBest();
      g.hud([[g.t('score'), S.score], [g.t('best'), b === null ? '—' : Math.max(b, S.score)], [g.t('moths'), S.mothN]]);
    },

    // בוט לבדיקות: אותו טייס אוטומטי, דרך המקשים שאדם לוחץ עליהם
    bot(g) {
      const S = g.s;
      if (S.dead) return;
      const want = autopilot(S, false);
      S.botHold = want; S.botPress = want && !S.held;
      if (S.started && S.cd <= 0 && S.t % 130 === 0) g.hits.add('Space');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') {
        if (p.button === 2 || Math.hypot(p.x - BTN.x, p.y - BTN.y) < BTN.r + 10) { S.echoReq = true; return; }
        S.ptrHold.add(p.id); S.ptrPress = true;
      } else if (type === 'up') S.ptrHold.delete(p.id);
    },
    onPause(g) { if (g.s) g.s.ptrHold.clear(); },
    _gen: generate,   // לבדיקות: מייצר את המערה עד המצלמה

    draw(g, ctx, alpha) {
      const S = g.s;
      const camX = S.px + (S.x - S.px) * alpha, by = S.pby + (S.by - S.pby) * alpha;
      const t = S.t + alpha;
      drawScene(g, ctx, S, camX, by, t);
      if (g.state === 'play' || g.state === 'pause') drawEchoButton(g, ctx, S, ZONES[S.zone], t);
      if (!g.demo && (!S.started || S.hintA > 0) && !S.dead) {
        const a = S.started ? S.hintA : 1, y = H * 0.72;
        ctx.save(); ctx.globalAlpha = a;
        g.rr(ctx, W / 2 - 250, y - 38, 500, 82, 18); ctx.fillStyle = 'rgba(5,7,20,.66)'; ctx.fill();
        ctx.restore();
        g.text(ctx, g.t(g.touch ? 'startT' : 'start'), W / 2, y - 12, { size: 25, color: '#ffffff', alpha: a * (S.started ? 1 : 0.75 + 0.25 * Math.sin(t * 0.1)), maxW: 470 });
        g.text(ctx, g.t(g.touch ? 'start2T' : 'start2'), W / 2, y + 22, { size: 19, weight: 700, color: ZONES[S.zone].echo, alpha: a, maxW: 470 });
      }
    },

    cover(ctx, w, h, k) {
      // רגע יפה: נטיף מול העטלף, עשים בדרך וההד באמצע ההתפשטות
      const S = makeState(0, 777, true);
      for (let i = 0; i < 6000 && !S.dead; i++) {
        const hh = autopilot(S, true); advance(k, S, hh, hh && !S.held);
        if (i > 700 && S.spikes.some(sp => sp.x - S.x > 480 && sp.x - S.x < 650) && !S.spikes.some(sp => Math.abs(sp.x - S.x - BX) < sp.w / 2 + 90) && S.moths.filter(m => !m.got && m.x - S.x > 330 && m.x - S.x < 860).length >= 2) break;
      }
      const mid = (ceilAt(S, S.x + BX) + floorAt(S, S.x + BX)) / 2;
      S.by = S.pby = mid; S.vy = 0; S.flapPh = -1.2;
      S.echoes = [{ x: S.x + BX, y: mid, age: 28 }];
      ctx.save();
      ctx.scale(w / W, h / H);
      drawScene(k, ctx, S, S.x, mid, S.t, 1.75);
      ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
  });
})();
