// ============================================================
//  כובשי הכוכבים — משחק 2D של URotation (המנוע: g2d/kit.js)
//  כוכבים עם מספר חלליות שגדל. גוררים מכוכב שלך (או מכמה) אל מטרה ושולחים חצי מהחלליות.
//  1–3 אויבים עם אופי שונה, 25 שלבים. מנצחים כשלא נשארים כוכבים לאויבים.
// ============================================================
(function () {
  'use strict';
  const W = 960, H = 600, DT = 1 / 60, FONT = 'Heebo, Arial, sans-serif', SPEED = 92;
  const NEUTRAL = { c: '#8e99a4', d: '#4a535c' }, PLAYER = { c: '#4dabf7', d: '#1864ab' };
  // אופי האויבים: כל כמה שניות הם מחליטים, כמה הם אוהבים כוכבים ריקים / לתקוף, ואם הם אוספים צי גדול
  const PERS = {
    snooze: { c: '#69db7c', d: '#2b8a3e', every: 6.5, greed: 1.0, aggro: 0.25, multi: 1, hoard: 1.15, defend: false },
    bloop: { c: '#ffa94d', d: '#c2560c', every: 3.6, greed: 1.7, aggro: 0.5, multi: 1, hoard: 1.15, defend: true },
    zorg: { c: '#ff6b6b', d: '#b02a2a', every: 2.8, greed: 0.8, aggro: 1.7, multi: 3, hoard: 1.15, defend: true },
    shell: { c: '#b197fc', d: '#5f3dc4', every: 4.4, greed: 0.7, aggro: 1.1, multi: 4, hoard: 1.8, defend: true },
  };
  const BOTP = { every: 0.6, greed: 1.3, aggro: 1.3, multi: 8, hoard: 1.15, defend: true };
  const DEMOP = { every: 3, greed: 1.2, aggro: 1, multi: 2, hoard: 1.15, defend: true };
  // 25 שלבים: מספר כוכבים ואילו אויבים
  const LV = [
    [8, ['snooze']], [9, ['snooze']], [10, ['bloop']], [10, ['zorg']], [11, ['snooze', 'bloop']],
    [11, ['shell']], [12, ['bloop', 'zorg']], [12, ['snooze', 'shell']], [13, ['zorg', 'shell']], [13, ['bloop', 'shell']],
    [14, ['zorg', 'bloop']], [14, ['snooze', 'zorg', 'bloop']], [15, ['shell', 'zorg']], [15, ['bloop', 'snooze', 'shell']], [16, ['zorg', 'bloop', 'shell']],
    [16, ['shell', 'bloop']], [17, ['zorg', 'snooze', 'shell']], [17, ['bloop', 'zorg', 'snooze']], [18, ['shell', 'zorg', 'bloop']], [18, ['zorg', 'shell']],
    [19, ['bloop', 'zorg', 'shell']], [19, ['shell', 'bloop', 'zorg']], [20, ['zorg', 'bloop', 'snooze']], [20, ['zorg', 'shell', 'bloop']], [20, ['shell', 'zorg', 'bloop']],
  ];
  const NAMEK = { snooze: 'nSnooze', bloop: 'nBloop', zorg: 'nZorg', shell: 'nShell' };
  // הכי נוח → הכי קשוח. עם 3 אויבים, הנוח ביותר יושב הכי קרוב אליך (למעלה משמאל) והקשוח ביותר בפינה הרחוקה
  const HARSH = { snooze: 0, bloop: 1, shell: 2, zorg: 3 };
  function enemiesOf(L) {
    const e = LV[L - 1][1].slice();
    if (e.length === 3) { const s = e.slice().sort((a, b) => HARSH[b] - HARSH[a]); return [s[0], s[2], s[1]]; }
    return e;
  }
  const TRAITK = { snooze: 'trSnooze', bloop: 'trBloop', zorg: 'trZorg', shell: 'trShell' };
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- שלב ----------
  function makeLevel(L) {
    const def = [LV[L - 1][0], enemiesOf(L)], f = (L - 1) / 24, rnd = GK.U.seeded(4242 + L * 97), P = [];
    const add = (x, y, r, owner, ships) => P.push({ x, y, r, owner, ships, prod: 0.18 + r * 0.02, cap: Math.round(r * 4.2), id: P.length, kind: Math.floor(rnd() * 3), seed: Math.floor(rnd() * 1000), flash: 0, hit: 0, ring: rnd() < 0.3 && r > 30 });
    const spots = def[1].length === 1 ? [[845, 125]] : def[1].length === 2 ? [[845, 125], [845, 475]] : [[845, 125], [115, 125], [845, 475]];
    const big = def[1].length === 3;
    add(115 + rnd() * 30, 470 + rnd() * 20, big ? 42 : 38, 1, big ? 50 : 40);
    def[1].forEach((pk, i) => add(spots[i][0] + (rnd() - 0.5) * 30, spots[i][1] + (rnd() - 0.5) * 30, 34 + Math.round(f * 4), 2 + i, Math.round(25 + 20 * f)));
    for (let tries = 0; P.length < def[0] && tries < 6000; tries++) {
      const r = 16 + Math.floor(rnd() * 15) + (rnd() < 0.18 ? 9 : 0);
      const x = 40 + r + rnd() * (W - 80 - 2 * r), y = 36 + r + rnd() * (H - 72 - 2 * r);
      if (P.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 38)) continue;
      add(x, y, r, 0, Math.max(3, Math.round((r * 0.42 + rnd() * r * 0.36) * (0.65 + 0.55 * f))));
    }
    return P;
  }
  function newState(g) {
    const L = Math.max(1, Math.min(LV.length, g.level || 1)), f = (L - 1) / 24;
    const S = {
      L, planets: makeLevel(L), fleets: [], fx: [], t: 0, anim: 0, ai: {}, sel: new Set(), drag: null,
      over: null, endT: 0, ended: false, tut: L === 1 ? 1 : 0, tutT: 0, banner: 5, demo: !!g.demo, botT: 0,
      aiMul: 1.25 - 0.3 * f, pAggro: L <= 3 ? 0.3 : (0.35 + 0.35 * f) * (LV[L - 1][1].length > 1 ? 0.85 : 1), caps: 0, lost: 0,
    };
    enemiesOf(L).forEach((pk, i) => { S.ai[2 + i] = { pk, P: PERS[pk], t: 2.5 + i * 0.7 + Math.random() }; });
    return S;
  }
  const colOf = (S, o) => (o === 0 ? NEUTRAL : o === 1 ? PLAYER : PERS[S.ai[o].pk]);

  // ---------- שליחה (העכבר, המגע, הבוט והאויבים — כולם עוברים כאן) ----------
  function send(g, owner, srcs, target) {
    const S = g.s;
    let total = 0;
    for (const p of srcs) {
      if (p === target || p.owner !== owner) continue;
      const n = Math.floor(p.ships / 2);
      if (n < 1) continue;
      p.ships -= n;
      launch(S, owner, p, target, n);
      total += n;
    }
    if (total && owner === 1 && !S.demo) { g.sfx('whoosh'); if (S.tut === 1) { S.tut = 2; S.tutT = 4.5; } }
    return total;
  }
  function launch(S, owner, from, to, n) {
    const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const sx = from.x + ux * (from.r + 4), sy = from.y + uy * (from.r + 4), ex = to.x - ux * (to.r + 2), ey = to.y - uy * (to.r + 2);
    const len = Math.max(10, Math.hypot(ex - sx, ey - sy)), vis = Math.min(n, 26), spread = 5 + Math.sqrt(vis) * 3.2, ships = [];
    for (let i = 0; i < vis; i++) ships.push({ a: Math.random() * 6.28, d: Math.sqrt(Math.random()) * spread, w: Math.random() * 6.28, lag: Math.random() * spread * 1.6 });
    S.fleets.push({ owner, n, from, to, sx, sy, ex, ey, len, t: 0, ships, ux, uy, spread, dead: false });
  }
  function arrive(g, f) {
    const S = g.s, p = f.to, col = colOf(S, f.owner);
    if (p.owner === f.owner) { p.ships += f.n; p.flash = 0.3; return; }
    p.ships -= f.n; p.hit = 0.3;
    g.burst(f.ex, f.ey, { n: Math.min(16, 4 + f.n), color: [col.c, '#fff'], speed: 2.2, life: 20, size: 3, gravity: 0 });
    if (!S.demo && (f.owner === 1 || p.owner === 1)) g.sfx('hit', { p: 1.4 });
    if (p.ships < 0) {
      const prev = p.owner;
      p.owner = f.owner; p.ships = -p.ships; p.flash = 0.6;
      S.fx.push({ k: 'cap', x: p.x, y: p.y, r: p.r, c: col.c, t: 0, dur: 0.7 });
      g.burst(p.x, p.y, { n: 28, color: [col.c, col.d, '#fff'], speed: 3.4, life: 36, gravity: 0 });
      S.sel.delete(p);
      if (!S.demo) {
        if (f.owner === 1) { S.caps++; g.sfx('power'); g.float(p.x, p.y - p.r - 12, '★', { color: '#ffe066', size: 26 }); }
        else if (prev === 1) { S.lost++; g.sfx('error'); g.shake(4); }
      }
    }
  }

  // ---------- אויבים (וגם הבוט שמשחק בשבילך בבדיקות) ----------
  function incoming(S, p, o) {
    let n = 0;
    for (const f of S.fleets) if (f.to === p) n += f.owner === o ? -f.n : f.n;
    return n;
  }
  function pickSources(list, target, need, maxN) {
    const sorted = list.slice().sort((a, b) => dist(a, target) - dist(b, target));
    if (maxN === 1) { for (const p of sorted) if (Math.floor(p.ships / 2) >= need) return [p]; return null; }
    let sum = 0;
    const out = [];
    for (const p of sorted) {
      const n = Math.floor(p.ships / 2);
      if (n < 2) continue;
      out.push(p); sum += n;
      if (sum >= need) return out;
      if (out.length >= maxN) break;
    }
    return null;
  }
  function decide(g, o, P, aggroMul) {
    const S = g.s, mine = S.planets.filter(p => p.owner === o);
    if (!mine.length) return 0;
    if (P.defend) {
      for (const p of mine) {
        const th = incoming(S, p, o);
        if (th > p.ships + 1) {
          const srcs = pickSources(mine.filter(q => q !== p), p, th - p.ships + 3, 3);
          if (srcs) return send(g, o, srcs, p);
        }
      }
    }
    let best = null, bv = 0;
    for (const t of S.planets) {
      if (t.owner === o) continue;
      let d = 1e9;
      for (const m of mine) d = Math.min(d, dist(m, t));
      const def = t.ships + (t.owner ? t.prod * d / SPEED : 0) + incoming(S, t, o);
      if (def < -2) continue;   // כבר בדרך לשם מספיק
      const want = t.owner === 0 ? P.greed : t.owner === 1 ? P.aggro * aggroMul : P.aggro * 0.85;
      const v = want * (0.5 + t.prod) / (Math.max(0, def) + 6) / (d + 150) * 1000;
      if (v > bv) { bv = v; best = { t, def: Math.max(0, def) }; }
    }
    if (!best) return 0;
    const srcs = pickSources(mine, best.t, best.def * P.hoard + 2, P.multi);
    return srcs ? send(g, o, srcs, best.t) : 0;
  }
  function aiStep(g) {
    const S = g.s;
    for (const k in S.ai) {
      const o = +k, A = S.ai[k];
      if ((A.t -= DT) > 0) continue;
      A.t = A.P.every * S.aiMul * (0.8 + Math.random() * 0.4);
      decide(g, o, A.P, S.pAggro);
    }
  }

  // ---------- סימולציה ----------
  function sim(g) {
    const S = g.s;
    S.t += DT;
    for (const p of S.planets) {
      if (p.owner && p.ships < p.cap) p.ships = Math.min(p.cap, p.ships + p.prod * DT);
      if (p.flash > 0) p.flash -= DT;
      if (p.hit > 0) p.hit -= DT;
    }
    if (!S.over) aiStep(g);
    for (const f of S.fleets) {
      f.t += SPEED * DT / f.len;
      if (f.t >= 1) { f.dead = true; if (!f.fade) arrive(g, f); }
    }
    let j = 0;
    for (const f of S.fleets) if (!f.dead) S.fleets[j++] = f;
    S.fleets.length = j;
    for (const f of S.fx) f.t += DT;
    j = 0;
    for (const f of S.fx) if (f.t < f.dur) S.fx[j++] = f;
    S.fx.length = j;
    if (S.demo || S.over) return;
    const enemy = S.planets.some(p => p.owner >= 2);
    if (!enemy) {
      S.over = 'win'; S.endT = 1.5;
      for (const f of S.fleets) if (f.owner >= 2) f.fade = true;
      g.sfx('score');
    } else if (!S.planets.some(p => p.owner === 1) && !S.fleets.some(f => f.owner === 1)) { S.over = 'lose'; S.endT = 1.2; }
  }
  const par = S => 45 + S.planets.length * 6 + Object.keys(S.ai).length * 25;
  function finish(g) {
    const S = g.s;
    if (S.over === 'win') {
      const p = par(S), stars = S.t <= p ? 3 : S.t <= p * 1.7 ? 2 : 1;
      g.completeLevel(stars, { text: g.t('timeTxt', { t: fmtT(S.t) }) });
    } else g.end({ result: 'lose', score: null, text: g.t('loseTxt') });
  }
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // ---------- קלט ----------
  function planetAt(S, x, y, pad) {
    let best = null, bd = 1e9;
    for (const p of S.planets) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r + (pad || 14) && d < bd) { bd = d; best = p; } }
    return best;
  }

  // ---------- ציור ----------
  function fitSize(ctx, s, size, maxW, weight) {
    ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT;
    const w = ctx.measureText(s).width;
    return w <= maxW ? size : Math.max(9, Math.floor(size * maxW / w));
  }
  function paintSky(ctx, U, seed) {
    const rnd = U.seeded(seed);
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#0b1030'); gr.addColorStop(0.55, '#140c2e'); gr.addColorStop(1, '#06121f');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    for (const [x, y, r, c] of [[W * 0.25, H * 0.3, 300, 'rgba(120,60,200,.16)'], [W * 0.8, H * 0.7, 340, 'rgba(30,140,200,.13)'], [W * 0.6, H * 0.15, 220, 'rgba(220,70,140,.10)'], [W * 0.1, H * 0.85, 240, 'rgba(60,200,180,.08)']]) {
      const ng = ctx.createRadialGradient(x, y, 10, x, y, r);
      ng.addColorStop(0, c); ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < 420; i++) {
      const x = rnd() * W, y = rnd() * H, s = rnd();
      ctx.fillStyle = s > 0.97 ? '#ffe9b0' : s > 0.94 ? '#b8d8ff' : '#ffffff';
      ctx.globalAlpha = 0.25 + rnd() * 0.65;
      ctx.beginPath(); ctx.arc(x, y, s > 0.985 ? 1.8 : 0.5 + rnd() * 0.9, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // גלקסיה רחוקה
    ctx.save(); ctx.translate(W * 0.72, H * 0.42); ctx.rotate(-0.4);
    const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 70);
    gg.addColorStop(0, 'rgba(255,240,220,.35)'); gg.addColorStop(0.3, 'rgba(180,150,255,.12)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.scale(1, 0.35); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function drawPlanet(ctx, U, p, col, t) {
    const { x, y, r } = p;
    ctx.save();
    const gl = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.7);
    gl.addColorStop(0, hexA(col.c, p.owner ? 0.38 : 0.18)); gl.addColorStop(1, hexA(col.c, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 6.3); ctx.fill();
    if (p.ring) { ctx.strokeStyle = hexA(col.c, 0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.42, -0.35, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke(); }
    const gr = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r);
    gr.addColorStop(0, U.shade(col.c, 0.5)); gr.addColorStop(0.55, col.c); gr.addColorStop(1, col.d);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.clip();
    const rnd = U.seeded(p.seed + 1);
    if (p.kind === 0) {
      ctx.fillStyle = hexA(col.d, 0.35);
      for (let i = 0; i < 4; i++) { const yy = y - r + (i + 0.5 + rnd() * 0.5) * r * 0.5; ctx.beginPath(); ctx.ellipse(x, yy, r * 1.1, r * (0.06 + rnd() * 0.07), 0, 0, 6.3); ctx.fill(); }
    } else if (p.kind === 1) {
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.28, d = rnd() * r * 0.7, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, cr = r * (0.1 + rnd() * 0.14);
        ctx.fillStyle = hexA(col.d, 0.45); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx - 1, cy - 1, cr, 3.6, 5.6); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      for (let i = 0; i < 4; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.6; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.18 + rnd() * 0.2), r * (0.1 + rnd() * 0.12), rnd() * 3, 0, 6.3); ctx.fill(); }
    }
    const sh = ctx.createRadialGradient(x - r * 0.5, y - r * 0.5, r * 0.6, x, y, r * 1.45);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,15,.6)');
    ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
    if (p.ring) { ctx.strokeStyle = hexA(U.shade(col.c, 0.3), 0.75); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.42, -0.35, Math.PI * 2.05, Math.PI * 2.95); ctx.stroke(); }
    ctx.strokeStyle = hexA(U.shade(col.c, 0.4), 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.stroke();
    if (p.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, p.flash) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }
    if (p.hit > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + p.hit * 2 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 6.3); ctx.stroke(); }
    ctx.restore();
  }
  function drawFleet(ctx, f, col, t, alpha) {
    const tt = Math.min(1, f.t + (f.fade ? 0 : alpha * SPEED * DT / f.len));
    const cx = f.sx + (f.ex - f.sx) * tt, cy = f.sy + (f.ey - f.sy) * tt, px = -f.uy, py = f.ux;
    ctx.save();
    if (f.fade) ctx.globalAlpha = 0.5;
    ctx.strokeStyle = hexA(col.c, 0.35); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const s of f.ships) {
      const wob = Math.sin(t * 4 + s.w) * 1.6, ox = Math.cos(s.a) * s.d + wob, oy = Math.sin(s.a) * s.d;
      const back = Math.min(s.lag, tt * f.len), sx = cx + px * ox + f.ux * (oy - back), sy = cy + py * ox + f.uy * (oy - back);
      ctx.moveTo(sx - f.ux * 3, sy - f.uy * 3); ctx.lineTo(sx - f.ux * 13, sy - f.uy * 13);
    }
    ctx.stroke();
    ctx.fillStyle = col.c;
    ctx.beginPath();
    for (const s of f.ships) {
      const wob = Math.sin(t * 4 + s.w) * 1.6, ox = Math.cos(s.a) * s.d + wob, oy = Math.sin(s.a) * s.d;
      const back = Math.min(s.lag, tt * f.len), sx = cx + px * ox + f.ux * (oy - back), sy = cy + py * ox + f.uy * (oy - back);
      ctx.moveTo(sx + f.ux * 7, sy + f.uy * 7);
      ctx.lineTo(sx - f.ux * 4.5 + px * 3.9, sy - f.uy * 4.5 + py * 3.9);
      ctx.lineTo(sx - f.ux * 2.3, sy - f.uy * 2.3);
      ctx.lineTo(sx - f.ux * 4.5 - px * 3.9, sy - f.uy * 4.5 - py * 3.9);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    for (const s of f.ships) {
      const wob = Math.sin(t * 4 + s.w) * 1.6, ox = Math.cos(s.a) * s.d + wob, oy = Math.sin(s.a) * s.d;
      const back = Math.min(s.lag, tt * f.len), sx = cx + px * ox + f.ux * (oy - back), sy = cy + py * ox + f.uy * (oy - back);
      ctx.moveTo(sx + f.ux * 3.2, sy + f.uy * 3.2); ctx.arc(sx + f.ux * 2, sy + f.uy * 2, 1.3, 0, 6.3);
    }
    ctx.fill();
    ctx.restore();
    return [cx, cy];
  }
  function drawBanner(g, ctx, cx, y, lines, a) {
    // lines: [{text, size, color, dot}]
    ctx.save(); ctx.globalAlpha = a;
    let w = 0;
    for (const l of lines) { ctx.font = (l.weight || 800) + ' ' + l.size + 'px ' + FONT; w = Math.max(w, ctx.measureText(l.text).width + (l.dot ? 30 : 0)); }
    const bw = Math.min(W - 40, w + 44), bh = lines.reduce((s, l) => s + l.size + 12, 14), x = cx - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, x, y + 3, bw, bh, 14); ctx.fill();
    ctx.fillStyle = 'rgba(14,18,40,.9)'; g.rr(ctx, x, y, bw, bh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,255,.45)'; ctx.lineWidth = 2; ctx.stroke();
    let yy = y + 10;
    for (const l of lines) {
      const s = fitSize(ctx, l.text, l.size, bw - 30 - (l.dot ? 30 : 0), l.weight);
      yy += l.size / 2 + 3;
      if (l.dot) {
        ctx.font = (l.weight || 800) + ' ' + s + 'px ' + FONT;
        const tw = ctx.measureText(l.text).width, dx = g.rtl ? cx + tw / 2 + 16 : cx - tw / 2 - 16;
        ctx.fillStyle = l.dot; ctx.beginPath(); ctx.arc(dx + (g.rtl ? -4 : 4), yy, 8, 0, 6.3); ctx.fill();
        g.text(ctx, l.text, cx + (g.rtl ? -10 : 10), yy, { size: s, color: l.color || '#fff', weight: l.weight || 800 });
      } else g.text(ctx, l.text, cx, yy, { size: s, color: l.color || '#fff', weight: l.weight || 800 });
      yy += l.size / 2 + 9;
    }
    ctx.restore();
  }
  let skyCache = { key: '', c: null };
  function skyFor(g, S) {
    const res = g.canvas.width / W, key = (S.L % 5) + ':' + g.canvas.width;
    if (skyCache.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * res); c.height = Math.round(H * res);
      const x = c.getContext('2d');
      x.setTransform(res, 0, 0, res, 0, 0);
      paintSky(x, g, 300 + (S.L % 5) * 13);
      skyCache = { key, c };
    }
    return skyCache.c;
  }

  GK.register('star-conquest', {
    w: W, h: H, bg: '#0b1030', accent: '#74c0fc',
    levels: LV.length,
    text: {
      he: {
        title: 'כובשי הכוכבים',
        help: ['גרור מכוכב כחול שלך כדי לשלוח חצי מהחלליות שלו', 'גרור דרך כמה כוכבים שלך כדי לשלוח מכולם ביחד', 'כוכב גדול מייצר יותר חלליות. כבוש את כל כוכבי האויב!', 'או לחץ על כוכבים שלך ואז על המטרה · A — בחר הכול'],
        helpTouch: ['גרור מכוכב כחול שלך כדי לשלוח חצי מהחלליות שלו', 'גרור דרך כמה כוכבים שלך כדי לשלוח מכולם ביחד', 'כוכב גדול מייצר יותר חלליות. כבוש את כל כוכבי האויב!'],
        you: 'אתה', nSnooze: 'נמנמן', nBloop: 'בלופ', nZorg: 'זורג', nShell: 'שריונית',
        trSnooze: 'איטי ועצלן', trBloop: 'אוהב לכבוש כוכבים ריקים', trZorg: 'תוקף הרבה!', trShell: 'אוסף צי ענק ותוקף בבת אחת',
        enemies: 'האויבים שלך:', tut1: 'גרור מהכוכב הכחול שלך אל כוכב אפור', tut2: 'יופי! כבוש את כל כוכבי האויב כדי לנצח',
        timeTxt: 'ניצחת בזמן {t}', loseTxt: 'האויבים כבשו את כל הכוכבים שלך',
      },
      en: {
        title: 'Star Conquest',
        help: ['Drag from your blue planet to send half its ships', 'Drag across several of your planets to send from all', 'Big planets build more ships. Take all enemy planets!', 'Or click your planets, then a target · A — select all'],
        helpTouch: ['Drag from your blue planet to send half its ships', 'Drag across several of your planets to send from all', 'Big planets build more ships. Take all enemy planets!'],
        you: 'You', nSnooze: 'Snooze', nBloop: 'Bloop', nZorg: 'Zorg', nShell: 'Shell',
        trSnooze: 'slow and lazy', trBloop: 'loves grabbing empty planets', trZorg: 'attacks a lot!', trShell: 'builds a huge fleet, then strikes',
        enemies: 'Your enemies:', tut1: 'Drag from your blue planet to a grey planet', tut2: 'Great! Capture every enemy planet to win',
        timeTxt: 'You won in {t}', loseTxt: 'The enemies took all your planets',
      },
      ar: {
        title: 'غزاة الكواكب',
        help: ['اسحب من كوكبك الأزرق لترسل نصف سفنه', 'اسحب عبر عدة كواكب لك لترسل منها كلها', 'الكوكب الكبير يصنع سفناً أكثر. احتلّ كل كواكب العدو!', 'أو انقر على كواكبك ثم على الهدف · A — تحديد الكل'],
        helpTouch: ['اسحب من كوكبك الأزرق لترسل نصف سفنه', 'اسحب عبر عدة كواكب لك لترسل منها كلها', 'الكوكب الكبير يصنع سفناً أكثر. احتلّ كل كواكب العدو!'],
        you: 'أنت', nSnooze: 'نعسان', nBloop: 'بلوب', nZorg: 'زورغ', nShell: 'صدفة',
        trSnooze: 'بطيء وكسول', trBloop: 'يحب احتلال الكواكب الفارغة', trZorg: 'يهاجم كثيراً!', trShell: 'يجمع أسطولاً ضخماً ثم يضرب',
        enemies: 'أعداؤك:', tut1: 'اسحب من كوكبك الأزرق إلى كوكب رمادي', tut2: 'رائع! احتلّ كل كواكب الأعداء لتفوز',
        timeTxt: 'فزت في {t}', loseTxt: 'احتلّ الأعداء كل كواكبك',
      },
      es: {
        title: 'Conquista Estelar',
        help: ['Arrastra desde un planeta azul y envía la mitad de sus naves', 'Pasa por varios planetas tuyos para enviar desde todos', 'Planeta grande, más naves. ¡Conquista los planetas enemigos!', 'O haz clic en tus planetas y luego en el objetivo · A: todos'],
        helpTouch: ['Arrastra desde un planeta azul y envía la mitad de sus naves', 'Pasa por varios planetas tuyos para enviar desde todos', 'Planeta grande, más naves. ¡Conquista los planetas enemigos!'],
        you: 'Tú', nSnooze: 'Dormilón', nBloop: 'Blup', nZorg: 'Zorg', nShell: 'Caparazón',
        trSnooze: 'lento y perezoso', trBloop: 'le encanta tomar planetas vacíos', trZorg: '¡ataca mucho!', trShell: 'junta una flota enorme y luego golpea',
        enemies: 'Tus enemigos:', tut1: 'Arrastra desde tu planeta azul a un planeta gris', tut2: '¡Genial! Conquista todos los planetas enemigos para ganar',
        timeTxt: 'Ganaste en {t}', loseTxt: 'Los enemigos tomaron todos tus planetas',
      },
      fr: {
        title: 'Conquête Stellaire',
        help: ['Glisse d’une planète bleue : la moitié de ses vaisseaux part', 'Passe sur plusieurs planètes pour envoyer de toutes', 'Grosses planètes = plus de vaisseaux. Conquiers tout !', 'Ou clique tes planètes, puis la cible · A : tout choisir'],
        helpTouch: ['Glisse d’une planète bleue : la moitié de ses vaisseaux part', 'Passe sur plusieurs planètes pour envoyer de toutes', 'Grosses planètes = plus de vaisseaux. Conquiers tout !'],
        you: 'Toi', nSnooze: 'Roupillon', nBloop: 'Blop', nZorg: 'Zorg', nShell: 'Carapace',
        trSnooze: 'lent et paresseux', trBloop: 'adore prendre les planètes vides', trZorg: 'attaque souvent !', trShell: 'réunit une énorme flotte puis frappe',
        enemies: 'Tes ennemis :', tut1: 'Glisse depuis ta planète bleue vers une planète grise', tut2: 'Bravo ! Conquiers toutes les planètes ennemies pour gagner',
        timeTxt: 'Victoire en {t}', loseTxt: 'Les ennemis ont pris toutes tes planètes',
      },
      pt: {
        title: 'Conquista Estelar',
        help: ['Arraste de um planeta azul para enviar metade das naves', 'Passe por vários planetas seus para enviar de todos', 'Planeta grande faz mais naves. Conquiste os inimigos!', 'Ou clique nos seus planetas e depois no alvo · A: todos'],
        helpTouch: ['Arraste de um planeta azul para enviar metade das naves', 'Passe por vários planetas seus para enviar de todos', 'Planeta grande faz mais naves. Conquiste os inimigos!'],
        you: 'Você', nSnooze: 'Dorminhoco', nBloop: 'Blup', nZorg: 'Zorg', nShell: 'Carapaça',
        trSnooze: 'lento e preguiçoso', trBloop: 'adora pegar planetas vazios', trZorg: 'ataca muito!', trShell: 'junta uma frota enorme e depois ataca',
        enemies: 'Seus inimigos:', tut1: 'Arraste do seu planeta azul até um planeta cinza', tut2: 'Ótimo! Conquiste todos os planetas inimigos para vencer',
        timeTxt: 'Você venceu em {t}', loseTxt: 'Os inimigos tomaram todos os seus planetas',
      },
      ru: {
        title: 'Покорители звёзд',
        help: ['Тяни от синей планеты — полетит половина её кораблей', 'Проведи через несколько планет, чтобы послать со всех', 'Большие планеты строят больше. Захвати все вражеские!', 'Или нажми на свои планеты, потом на цель · A — все'],
        helpTouch: ['Тяни от синей планеты — полетит половина её кораблей', 'Проведи через несколько планет, чтобы послать со всех', 'Большие планеты строят больше. Захвати все вражеские!'],
        you: 'Ты', nSnooze: 'Соня', nBloop: 'Блуп', nZorg: 'Зорг', nShell: 'Панцирь',
        trSnooze: 'медленный и ленивый', trBloop: 'любит захватывать пустые планеты', trZorg: 'часто нападает!', trShell: 'копит огромный флот и бьёт разом',
        enemies: 'Твои враги:', tut1: 'Тяни от своей синей планеты к серой', tut2: 'Отлично! Захвати все вражеские планеты',
        timeTxt: 'Победа за {t}', loseTxt: 'Враги захватили все твои планеты',
      },
      de: {
        title: 'Sternen-Eroberer',
        help: ['Zieh von einem blauen Planeten: die Hälfte der Schiffe fliegt', 'Zieh über mehrere Planeten, um von allen zu schicken', 'Große Planeten bauen mehr Schiffe. Erobere alle Gegner!', 'Oder klicke deine Planeten, dann das Ziel · A — alle'],
        helpTouch: ['Zieh von einem blauen Planeten: die Hälfte der Schiffe fliegt', 'Zieh über mehrere Planeten, um von allen zu schicken', 'Große Planeten bauen mehr Schiffe. Erobere alle Gegner!'],
        you: 'Du', nSnooze: 'Schlafmütze', nBloop: 'Blupp', nZorg: 'Zorg', nShell: 'Panzer',
        trSnooze: 'langsam und faul', trBloop: 'schnappt sich gern leere Planeten', trZorg: 'greift oft an!', trShell: 'sammelt eine riesige Flotte und schlägt dann zu',
        enemies: 'Deine Gegner:', tut1: 'Zieh von deinem blauen Planeten zu einem grauen', tut2: 'Super! Erobere alle feindlichen Planeten',
        timeTxt: 'Gewonnen in {t}', loseTxt: 'Die Gegner haben alle deine Planeten erobert',
      },
    },

    init(g) {
      const S = g.s = newState(g);
      if (g.demo) {
        S.pAggro = 1; S.banner = 0;
        S.ai[1] = { pk: null, P: DEMOP, t: 1 };
        for (let i = 0; i < 60 * 12; i++) demoStep(g);
      }
    },

    step(g) {
      const S = g.s;
      S.anim += DT;
      if (S.banner > 0) S.banner -= DT;
      if (S.tutT > 0 && (S.tutT -= DT) <= 0 && S.tut === 2) S.tut = 0;
      sim(g);
      if (S.over && (S.endT -= DT) <= 0 && !S.ended) { S.ended = true; finish(g); return; }
      const cnt = o => S.planets.filter(p => p.owner === o).length;
      const hud = [[g.t('you'), cnt(1), PLAYER.c]];
      for (const k in S.ai) hud.push([g.t(NAMEK[S.ai[k].pk]), cnt(+k), PERS[S.ai[k].pk].c]);
      g.hud(hud);
      let cur = 'default';
      if (S.drag) cur = 'grabbing';
      else if (g.ptr.over) { const p = planetAt(S, g.ptr.x, g.ptr.y); if (p && (p.owner === 1 || S.sel.size)) cur = 'pointer'; }
      if (g.canvas.style.cursor !== cur) g.canvas.style.cursor = cur;
    },

    idle(g) { if (g.demo && g.s) demoStep(g); },

    bot(g) {
      const S = g.s;
      if (S.over || (S.botT -= DT) > 0) return;
      S.botT = BOTP.every * (0.8 + Math.random() * 0.4);
      for (let i = 0; i < 3; i++) if (!decide(g, 1, BOTP, 1)) break;
    },

    onKey(g, e) {
      const S = g.s;
      if (e.code === 'KeyA') { S.sel = new Set(S.planets.filter(p => p.owner === 1)); g.sfx('click'); }
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (S.over) return;
      if (type === 'down') {
        const pl = planetAt(S, p.x, p.y);
        if (pl && pl.owner === 1) {
          const srcs = S.sel.has(pl) ? new Set(S.sel) : new Set([pl]);
          S.drag = { id: p.id, x: p.x, y: p.y, x0: p.x, y0: p.y, srcs, start: pl, moved: false };
          g.sfx('tick');
        } else if (pl && S.sel.size) {
          send(g, 1, [...S.sel], pl); S.sel.clear();
        } else if (!pl) S.sel.clear();
      } else if (type === 'move' && S.drag && S.drag.id === p.id) {
        const d = S.drag;
        d.x = p.x; d.y = p.y;
        if (Math.hypot(p.x - d.x0, p.y - d.y0) > 12) d.moved = true;
        const pl = planetAt(S, p.x, p.y, 4);
        if (pl && pl.owner === 1 && !d.srcs.has(pl) && d.moved) { d.srcs.add(pl); g.sfx('tick', { p: 1.3 }); }
      } else if (type === 'up' && S.drag && S.drag.id === p.id) {
        const d = S.drag;
        S.drag = null;
        const pl = planetAt(S, p.x, p.y);
        if (!d.moved || (pl === d.start && d.srcs.size === 1)) {
          // לחיצה בלי גרירה: מסמנים / מבטלים סימון
          if (S.sel.has(d.start)) S.sel.delete(d.start); else S.sel.add(d.start);
          return;
        }
        if (pl) {
          const srcs = [...d.srcs].filter(q => q !== pl);
          if (srcs.length && send(g, 1, srcs, pl)) S.sel.clear();
        }
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s, t = S.anim;
      ctx.drawImage(skyFor(g, S), 0, 0, W, H);
      // כוכבים מנצנצים
      for (let i = 0; i < 26; i++) {
        const x = (i * 337.7) % W, y = (i * 191.3 + 57) % H, a = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.6 + (i % 5) * 0.3) + i));
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        if (i % 6 === 0) { ctx.fillStyle = 'rgba(255,255,255,' + a * 0.4 + ')'; ctx.fillRect(x - 3, y - 0.3, 6, 0.6); ctx.fillRect(x - 0.3, y - 3, 0.6, 6); }
      }
      // קווי גרירה
      const d = S.drag;
      let target = null;
      if (d && d.moved) {
        target = planetAt(S, d.x, d.y);
        ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const s of d.srcs) {
          const tx = target && !d.srcs.has(target) ? target.x : d.x, ty = target && !d.srcs.has(target) ? target.y : d.y;
          ctx.strokeStyle = 'rgba(116,192,252,.85)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
        }
        ctx.restore();
      }
      for (const p of S.planets) drawPlanet(ctx, g, p, colOf(S, p.owner), t);
      // סימונים
      for (const p of S.planets) {
        const sel = S.sel.has(p) || (d && d.srcs.has(p));
        if (sel) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.65 + 0.35 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7, 0, 6.3); ctx.stroke(); }
        if (target === p && !(d && d.srcs.has(p))) { ctx.strokeStyle = p.owner === 1 ? '#8ce99a' : '#ffe066'; ctx.lineWidth = 4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, t * 2, t * 2 + 6.3); ctx.stroke(); ctx.setLineDash([]); }
      }
      if (!g.touch && g.ptr.over && !d) { const hp = planetAt(S, g.ptr.x, g.ptr.y); if (hp && (hp.owner === 1 || S.sel.size)) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hp.x, hp.y, hp.r + 6, 0, 6.3); ctx.stroke(); } }
      // צי בדרך
      for (const f of S.fleets) {
        const col = colOf(S, f.owner), [cx, cy] = drawFleet(ctx, f, col, t, alpha);
        if (f.n >= 2) g.text(ctx, String(f.n), cx - f.uy * (f.spread + 12), cy + f.ux * (f.spread + 12) - 2, { size: 15, color: col.c, stroke: 'rgba(0,0,0,.7)', strokeW: 4 });
      }
      for (const f of S.fx) {
        const q = f.t / f.dur;
        ctx.strokeStyle = hexA(f.c, 1 - q); ctx.lineWidth = 5 * (1 - q) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 6 + q * 40, 0, 6.3); ctx.stroke();
      }
      // מספרי החלליות
      for (const p of S.planets) {
        const s = Math.max(18, Math.min(27, p.r * 0.68)), full = p.owner && p.ships >= p.cap - 0.01;
        g.text(ctx, String(Math.floor(p.ships)), p.x, p.y + 1, { size: s, color: full ? '#ffe066' : '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
      }
      // כמה יישלחו
      if (d && d.moved) {
        let n = 0;
        for (const s of d.srcs) if (s !== target) n += Math.floor(s.ships / 2);
        if (n > 0) g.text(ctx, '→ ' + n, d.x + 18, d.y - 22, { size: 20, color: '#d0ebff', stroke: 'rgba(0,0,0,.7)', strokeW: 4, align: 'left', dir: 'ltr' });
      }
      if (S.demo) return;
      // שעון וכוכבים: כמה כוכבים תקבל אם תנצח עכשיו
      {
        const pp = par(S), st = S.t <= pp ? 3 : S.t <= pp * 1.7 ? 2 : 1, label = fmtT(S.t);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; g.rr(ctx, 10, H - 40, 150, 30, 15); ctx.fill();
        g.text(ctx, label, 46, H - 25, { size: 18, color: '#e9ecef', dir: 'ltr' });
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < st ? '#ffd43b' : 'rgba(255,255,255,.18)'; starPath(ctx, 96 + i * 20, H - 25, 8); ctx.fill(); }
      }
      // הדרכה
      if (S.tut === 1) {
        const home = S.planets.find(p => p.owner === 1);
        let near = null, nd = 1e9;
        if (home) for (const p of S.planets) if (p.owner === 0 && dist(p, home) < nd) { nd = dist(p, home); near = p; }
        if (home && near) {
          const q = (t * 0.6) % 1, e = q < 0.75 ? g.ease.inOut(q / 0.75) : 1;
          const hx = home.x + (near.x - home.x) * e, hy = home.y + (near.y - home.y) * e;
          ctx.save(); ctx.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
          ctx.strokeStyle = 'rgba(255,224,102,.7)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(home.x, home.y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
          drawHand(ctx, hx + 6, hy + 8);
          ctx.restore();
        }
        drawBanner(g, ctx, W / 2, 14, [{ text: g.t('tut1'), size: 22, color: '#ffe8a3' }], 1);
      } else if (S.tut === 2) drawBanner(g, ctx, W / 2, 14, [{ text: g.t('tut2'), size: 22, color: '#ffe8a3' }], Math.min(1, S.tutT));
      else if (S.banner > 0) {
        const lines = [{ text: g.t('enemies'), size: 19, color: '#d0ebff', weight: 700 }];
        for (const k in S.ai) { const pk = S.ai[k].pk; lines.push({ text: g.t(NAMEK[pk]) + ' — ' + g.t(TRAITK[pk]), size: 20, color: PERS[pk].c, dot: PERS[pk].c }); }
        drawBanner(g, ctx, W / 2, 14, lines, Math.min(1, S.banner));
      }
    },

    cover(ctx, w, h, k) {
      ctx.save(); ctx.scale(w / W, h / H); paintSky(ctx, k, 311); ctx.restore();
      const planets = [
        { x: 190, y: 385, r: 80, owner: 1, ships: 87, seed: 3, kind: 2 },
        { x: 410, y: 165, r: 42, owner: 1, ships: 24, seed: 8, kind: 1 },
        { x: 560, y: 335, r: 52, owner: 0, ships: 30, seed: 5, kind: 0, ring: true },
        { x: 795, y: 140, r: 70, owner: 2, ships: 52, seed: 9, kind: 1 },
        { x: 830, y: 440, r: 46, owner: 3, ships: 17, seed: 11, kind: 2 },
        { x: 610, y: 85, r: 27, owner: 0, ships: 9, seed: 13, kind: 1 },
      ];
      const fake = { ai: { 2: { pk: 'zorg' }, 3: { pk: 'bloop' } } };
      const tmp = { fleets: [] }, rr = k.seeded(77), keep = Math.random;
      Math.random = rr;
      const routes = [[0, 2, 26, 1, 0.5], [1, 5, 14, 1, 0.62], [3, 1, 20, 2, 0.45], [4, 2, 11, 3, 0.55]];
      for (const [a, b, n, o] of routes) {
        const A = planets[a], B = planets[b], c = colOf(fake, o).c;
        ctx.save(); ctx.setLineDash([10, 9]); ctx.lineWidth = 3; ctx.strokeStyle = hexA(c, 0.35);
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
      }
      for (const p of planets) drawPlanet(ctx, k, p, colOf(fake, p.owner), 0.5);
      for (const [a, b, n, o, t] of routes) {
        launch(tmp, o, planets[a], planets[b], n);
        const f = tmp.fleets[tmp.fleets.length - 1]; f.t = t;
        for (const s of f.ships) s.lag = Math.min(s.lag, 6);
        const cx = f.sx + (f.ex - f.sx) * t, cy = f.sy + (f.ey - f.sy) * t;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1.5, 1.5); ctx.translate(-cx, -cy);
        drawFleet(ctx, f, colOf(fake, o), 0.3, 0);
        ctx.restore();
      }
      Math.random = keep;
      // פגיעה: הבזק וניצוצות ליד הכוכב הקטן
      const P5 = planets[5], ix = P5.x - 22, iy = P5.y + 26;
      const gl = ctx.createRadialGradient(ix, iy, 2, ix, iy, 46);
      gl.addColorStop(0, 'rgba(255,255,255,.95)'); gl.addColorStop(0.35, 'rgba(116,192,252,.6)'); gl.addColorStop(1, 'rgba(116,192,252,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ix, iy, 46, 0, 6.3); ctx.fill();
      for (let i = 0; i < 14; i++) { const a = i * 0.45 + 0.3, d = 18 + (i % 4) * 9; ctx.fillStyle = i % 2 ? '#d0ebff' : '#fff'; ctx.beginPath(); ctx.arc(ix + Math.cos(a) * d, iy + Math.sin(a) * d, 2.4, 0, 6.3); ctx.fill(); }
      for (const p of planets) k.text(ctx, String(p.ships), p.x, p.y + 1, { size: Math.min(40, p.r * 0.6), color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 6 });
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0.7, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },
  });

  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function drawHand(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
    ctx.fillStyle = '#ffe3c4'; ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -18); ctx.quadraticCurveTo(0, -24, 4, -18); ctx.lineTo(4, -4); ctx.lineTo(13, -2); ctx.quadraticCurveTo(17, 4, 12, 16); ctx.lineTo(-6, 16); ctx.quadraticCurveTo(-12, 6, -10, -2); ctx.lineTo(-4, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // מסך התפריט: כמה אויבים (וגם "אתה") נלחמים לבד, בלי צלילים
  function demoStep(g) {
    const S = g.s;
    S.anim += DT;
    sim(g);
    // כשצד אחד כבש הכול — מתחילים קרב חדש מאחורי התפריט
    if (S.t > 20 && new Set(S.planets.filter(p => p.owner).map(p => p.owner)).size < 2) {
      const n = newState(g);
      n.pAggro = 1; n.banner = 0; n.ai[1] = { pk: null, P: DEMOP, t: 1 };
      g.s = n;
    }
  }
})();
