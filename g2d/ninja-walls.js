// ============================================================
//  נינג'ה על הקירות — משחק 2D של URotation (המנוע: g2d/kit.js)
//  נינג'ה מטפס לבד בין שני קירות. לחיצה = קפיצה בקשת אל הקיר השני.
//  קוצים, מסורים מסתובבים, ציפורים (קופצים עליהן ומעיפים אותן) וכוכבי נינג'ה שנופלים. המהירות עולה.
//  כל קטע חדש נבדק לפני שהוא נכנס: סימולציה של כל המצבים מוכיחה שאפשר לעבור, ושלכל קפיצה יש חלון זמן נוח.
// ============================================================
(function () {
  'use strict';
  const U = GK.U;
  const W = 600, H = 800;
  const WL = 64, WR = 536, XL = WL + 20, XR = WR - 20, MIDX = (XL + XR) / 2;   // פני הקירות ומקום הנינג'ה עליהם
  const SY = 560;                          // גובה הנינג'ה על המסך
  const J = 22, ARC = 42, NR = 13;         // משך קפיצה (צעדים), קשת, רדיוס הפגיעה של הנינג'ה (נדיב)
  const BUF = 9, PXM = 40, ZONE_M = 250;
  const SPD = [[3.6, 6.0], [4.2, 7.0], [4.8, 8.0]];
  const RAMP = 1200 * PXM;
  const SPK = 20, SAW = 30;
  const WMIN = [24, 16, 11];               // חלון זמן מינימלי לכל קפיצה שחייבים לקפוץ, לפי רמת הקושי
  const HORIZON = 170;
  const TAU = Math.PI * 2;
  const ZONES = [
    { sky1: '#7cc8ff', sky2: '#d8f1ff', far: '#9ab8d8', mid: '#5f8f7a', wall1: '#8f9aa8', wall2: '#5d6877', mort: '#4b5563', moss: '#6fbf5a', edge: '#e8f0f8', glow: '#ffffff' },
    { sky1: '#ff8a5c', sky2: '#ffd7a0', far: '#c86a7a', mid: '#7a3b5a', wall1: '#a8877a', wall2: '#6b4e48', mort: '#553a36', moss: '#d9a441', edge: '#ffe4cc', glow: '#ffd27a' },
    { sky1: '#0c1640', sky2: '#2a3f88', far: '#26346e', mid: '#141c45', wall1: '#5a6488', wall2: '#363d5c', mort: '#272c45', moss: '#4f9a8a', edge: '#b9c6ff', glow: '#ffe9a8' },
    { sky1: '#6a4aa8', sky2: '#f0b8e0', far: '#9a78c8', mid: '#5b3a8a', wall1: '#a294c0', wall2: '#675a88', mort: '#4e4270', moss: '#ff9ad0', edge: '#f4e8ff', glow: '#ffffff' },
    { sky1: '#05040f', sky2: '#1b1240', far: '#2a1d5c', mid: '#120c2e', wall1: '#4a4a66', wall2: '#2a2a40', mort: '#1d1d30', moss: '#7af0ff', edge: '#c8f6ff', glow: '#9af6ff' },
  ];
  const SKINS = [
    { suit: '#2b2d42', dark: '#14151f', band: '#e63946', cost: 0 },
    { suit: '#c0392b', dark: '#6e1d14', band: '#ffd447', cost: 25 },
    { suit: '#2f6fd6', dark: '#173a78', band: '#ffffff', cost: 60 },
    { suit: '#eef1f6', dark: '#9aa3b5', band: '#ff4d8d', cost: 120 },
    { suit: '#2e9e5b', dark: '#155a32', band: '#ffd447', cost: 200 },
    { suit: '#f2b81c', dark: '#a87400', band: '#7a2cff', cost: 350 },
  ];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const speedAt = (d, h) => { const s = SPD[d]; return s[0] + (s[1] - s[0]) * clamp(h / RAMP, 0, 1); };
  const meters = h => Math.max(0, Math.floor(h / PXM));
  const hash = i => { let x = Math.imul((i | 0) ^ 0x2c1b3c6d, 0x297a2d39); x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  const sawY = (o, t) => o.y + (o.amp ? o.amp * Math.sin(t * TAU / o.per + o.ph) : 0);
  const birdX = (o, t) => MIDX + (XR - MIDX) * Math.sin(t * TAU / o.per + o.ph);
  const shurY = (o, t) => o.y0 + o.vs * (t - o.t0);

  // ---------- הפיזיקה (אותה פונקציה במשחק, אצל הבוט ובבדיקת הקטעים) ----------
  // P = {s: הקיר (0 שמאל, 1 ימין; באוויר — הקיר שממנו קפץ), k: 0 על הקיר, 1..J באמצע קפיצה}
  function posOf(P, h) {
    if (!P.k) return { x: P.s ? XR : XL, y: -h };
    const u = P.k / J;
    return { x: lerp(P.s ? XR : XL, P.s ? XL : XR, u), y: -h - ARC * Math.sin(Math.PI * u) };
  }
  function hazard(V, P, t, h) {
    const { x, y } = posOf(P, h);
    for (const o of V.spk) {
      if (o.y2 < y - NR) continue;
      if (o.y1 > y + NR) continue;
      if (y + NR - 6 > o.y1 && y - NR + 6 < o.y2 && (o.s ? x + NR > WR - SPK + 4 : x - NR < WL + SPK - 4)) return true;
    }
    for (const o of V.saw) {
      const sy = sawY(o, t), dx = x - (o.s ? WR : WL), dy = y - sy;
      if (dx * dx + dy * dy < (SAW + NR - 4) * (SAW + NR - 4)) return true;
    }
    for (const o of V.shu) {
      if (t < o.t0) continue;
      const dx = x - (o.s ? XR : XL), dy = y - shurY(o, t);
      if (dx * dx + dy * dy < (NR + 9) * (NR + 9)) return true;
    }
    if (!P.k) for (const o of V.bird) {   // ציפור פוגעת רק כשהנינג'ה על הקיר; באוויר הוא מעיף אותה
      const dx = x - birdX(o, t), dy = y - o.y;
      if (dx * dx + dy * dy < (NR + 14) * (NR + 14)) return true;
    }
    return false;
  }
  // צעד אחד בזמן t, בגובה הבסיס h. P.ev: 1 = קפץ, 2 = נחת
  let CALLS = 0;   // כמה צעדי פיזיקה חושבו (המחיר של הבדיקות)
  function phys(V, P, t, h, jump) {
    CALLS++;
    P.ev = 0;
    if (P.k) { P.k++; if (P.k > J) { P.k = 0; P.s = 1 - P.s; P.ev = 2; } }
    else if (jump) { P.k = 1; P.ev = 1; }
    return hazard(V, P, t, h) ? 1 : 0;
  }
  const cloneP = P => ({ s: P.s, k: P.k, ev: 0 });
  const skey = P => P.s * 100 + P.k;
  function expand(V, R, t, h) {
    const out = [], seen = new Set();
    for (const P of R) for (let f = 0; f < 2; f++) {
      if (f && P.k) break;
      const Q = cloneP(P);
      if (phys(V, Q, t, h, f === 1)) continue;
      const k = skey(Q);
      if (!seen.has(k)) { seen.add(k); out.push(Q); }
    }
    return out;
  }
  function canSurvive(V, P0, t0, h0, n, d, memo) {
    const M = memo || { lost: new Set(), won: new Set() }, tEnd = t0 + n;
    const rec = (P, t, h) => {
      if (t >= tEnd) return true;
      const k = t * 1000 + skey(P);
      if (M.won.has(k)) return true;
      if (M.lost.has(k)) return false;
      const nh = h + speedAt(d, h);
      const A = cloneP(P);
      if (!phys(V, A, t + 1, nh, false) && rec(A, t + 1, nh)) { M.won.add(k); return true; }
      if (!P.k) { const B = cloneP(P); if (!phys(V, B, t + 1, nh, true) && rec(B, t + 1, nh)) { M.won.add(k); return true; } }
      M.lost.add(k);
      return false;
    };
    return rec(P0, t0, h0);
  }
  function findPath(V, P0, t0, h0, n, d, memo) {
    const lost = memo.lost, tEnd = t0 + n, path = [];
    const rec = (P, t, h) => {
      if (t >= tEnd) return true;
      const k = t * 1000 + skey(P);
      if (lost.has(k)) return false;
      const nh = h + speedAt(d, h);
      const A = cloneP(P);
      if (!phys(V, A, t + 1, nh, false) && rec(A, t + 1, nh)) { path.push({ t: t + 1, P, h, f: false }); return true; }
      if (!P.k) { const B = cloneP(P); if (!phys(V, B, t + 1, nh, true) && rec(B, t + 1, nh)) { path.push({ t: t + 1, P, h, f: true }); return true; } }
      lost.add(k);
      return false;
    };
    return rec(P0, t0, h0) ? path.reverse() : null;
  }
  // לחיצה בצעד ts: קופצת מיד, או ברגע הנחיתה אם נוחתים תוך BUF צעדים — בדיוק כמו במשחק
  function pressOk(V, Q, ts, h, tEnd, d, memo) {
    const P = cloneP(Q);
    let pend = BUF;
    for (let t = ts; t <= tEnd; t++) {
      const nh = h + speedAt(d, h);
      const f = !P.k;
      if (!f) pend--;
      if (phys(V, P, t, nh, f)) return false;
      h = nh;
      if (f) return canSurvive(V, P, t, h, tEnd - t, d, memo);
      if (pend <= 0) return false;
    }
    return true;
  }
  function windowsOk(V, path, tEnd, d, memo) {
    for (let i = 0; i < path.length; i++) {
      if (!path[i].f) continue;
      let w = 1;
      for (let j = i - 1; j >= 0 && w < WMIN[d] && !path[j].f; j--) {
        if (!pressOk(V, path[j].P, path[j].t, path[j].h, tEnd, d, memo)) break;
        w++;
      }
      if (w < WMIN[d]) return false;
    }
    return true;
  }
  // חלון של העולם בין שני גבהים (y בעולם יורד כשעולים)
  function viewOf(wd, hLo, hHi) {
    const yTop = -hHi - 60, yBot = -hLo + 60;
    return {
      spk: wd.spk.filter(o => o.y2 > yTop && o.y1 < yBot),
      saw: wd.saw.filter(o => o.y + o.amp + SAW > yTop && o.y - o.amp - SAW < yBot),
      bird: wd.bird.filter(o => o.y > yTop && o.y < yBot),
      shu: wd.shu.filter(o => o.hLo < hHi + 60 && o.hHi > hLo - 60),
    };
  }
  // הטייס: קופץ כשהקיר שלו נהיה מסוכן בקרוב (EARLY צעדים) ואם הקפיצה בטוחה — כמו שחקן, לא ברגע האחרון
  const EARLY = 40;
  function wantJump(S, hz) {
    const P = S.P;
    if (P.k) return false;
    const V = viewOf(S.wd, S.h - 40, S.h + hz * 8.2 + 120), nh = S.h + speedAt(S.diff, S.h);
    const jumpOk = () => { const B = cloneP(P); return !phys(V, B, S.t + 1, nh, true) && canSurvive(V, B, S.t + 1, nh, hz - 1, S.diff); };
    const A = cloneP(P);
    if (phys(V, A, S.t + 1, nh, false) || !canSurvive(V, A, S.t + 1, nh, hz - 1, S.diff)) return jumpOk();
    // אפשר להישאר — אבל אם להישאר עוד EARLY צעדים בלי לקפוץ זה מסוכן, עדיף לקפוץ כבר עכשיו
    let h = S.h;
    const Q = cloneP(P);
    for (let t = S.t + 1; t <= S.t + EARLY; t++) { h += speedAt(S.diff, h); if (phys(V, Q, t, h, false)) return jumpOk(); }
    return false;
  }

  // ---------- בניית המגדל: קטעים. כל קטע = כניסה בטוחה + 1–4 מכשולים ----------
  const GAPS = [[150, 260], [90, 200], [50, 150]];
  const gap = (d, p, r) => Math.round(lerp(GAPS[d][0], GAPS[d][1], r()) * (1 - 0.3 * p));
  const need = (d, v) => (WMIN[d] + 15) * v + 30;     // מתחילת מכשול עד תחילת המכשול שאחריו בצד השני
  const altGap = (d, p, v, r, L) => Math.max(gap(d, p, r), Math.round(need(d, v) - L));
  const newSec = h0 => ({ h0, h1: h0, spk: [], saw: [], bird: [], shu: [], coin: [], kinds: [] });
  const coinX = s => (s ? XR : XL);
  function coinCol(o, s, hA, hB) {
    const n = Math.max(1, Math.round((hB - hA) / 48));
    for (let i = 0; i <= n; i++) o.coin.push({ x: coinX(s), y: -(hA + (hB - hA) * i / n), got: false });
  }
  // הגובה (הבסיסי) בכל צעד מכאן והלאה ידוע מראש — בשביל כוכבים שנופלים בדיוק בזמן
  function frameAt(S, hTarget) {
    let t = S.rt, h = S.rh;
    while (h < hTarget) { h += speedAt(S.diff, h); t++; }
    return t;
  }
  const PIECES = {
    spk(S, o, h, v, p, d, r) {
      const s = r() < 0.5 ? 1 : 0, L = Math.round(lerp(110, [240, 320, 420][d], p * (0.35 + 0.65 * r())));
      o.spk.push({ s, y1: -(h + L), y2: -h });
      coinCol(o, 1 - s, h + 20, h + L - 10);
      return h + L;
    },
    zig(S, o, h, v, p, d, r) {
      const n = 2 + Math.floor(r() * Math.min(3, 1 + p * 3));
      let s = r() < 0.5 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const L = Math.round(lerp(80, 180, r()));
        o.spk.push({ s, y1: -(h + L), y2: -h });
        coinCol(o, 1 - s, h + 16, h + L - 10);
        h += L;
        if (i < n - 1) h += altGap(d, p, v, r, L);
        s = 1 - s;
      }
      return h;
    },
    saw(S, o, h, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(3, 1 + p * 2.2));
      let s = r() < 0.5 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const moving = p > 0.08 && r() < 0.35 + 0.4 * p;
        const amp = moving ? Math.round(lerp(50, 110, r())) : 0;
        h += SAW + amp;
        o.saw.push({ s, y: -h, amp, per: Math.round(lerp([200, 170, 140][d], [150, 120, 100][d], r() * p)), ph: r() * TAU });
        coinCol(o, 1 - s, h - SAW - amp, h + SAW + amp);
        h += SAW + amp;
        if (i < n - 1) { if (r() < 0.7) { s = 1 - s; h += altGap(d, p, v, r, 2 * SAW); } else h += Math.round(lerp(40, 120, r())); }
      }
      return h;
    },
    bird(S, o, h, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(2, 1 + p * 1.5));
      for (let i = 0; i < n; i++) {
        h += 40;
        o.bird.push({ y: -h, per: Math.round(lerp([260, 220, 180][d], [200, 160, 130][d], r() * p)), ph: r() * TAU, hit: false });
        h += 40;
        if (i < n - 1) h += Math.round(Math.max(gap(d, p, r), (J + WMIN[d]) * v));
      }
      return h;
    },
    shu(S, o, h, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(3, 1 + p * 2.2));
      let s = r() < 0.5 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        h += 30;
        const vs = lerp(3.2, 5.2, r() * (0.4 + 0.6 * p)), tm = frameAt(S, h), lead = 150;
        // נופל כך שבצעד tm הוא בגובה h; נזרק lead צעדים קודם, הרבה מעל המסך
        o.shu.push({ s, t0: tm - lead, y0: -h - vs * lead, vs, hLo: h - 60, hHi: h + vs * lead + 60 });
        h += 30;
        if (i < n - 1) { if (r() < 0.75) { s = 1 - s; h += altGap(d, p, v, r, 60); } else h += Math.round(lerp(60, 140, r())); }
      }
      return h;
    },
    arc(S, o, h, v, p, d, r) {
      h += 20;
      const s = r() < 0.5 ? 1 : 0;
      for (let k = 2; k < J; k += 2) {
        const q = posOf({ s, k }, h + v * k);
        o.coin.push({ x: q.x, y: q.y, got: false });
      }
      return h + v * J + 40;
    },
  };
  function pickPiece(p, d, r, last) {
    const w = { spk: 3, zig: 0.8 + 2 * p, saw: 1.4 + p, arc: last === 'arc' ? 0 : 0.6, bird: p > 0.05 ? 1 + 1.4 * p : 0, shu: p > 0.1 ? 0.8 + 1.6 * p : 0 };
    let sum = 0;
    for (const k in w) sum += w[k];
    let q = r() * sum;
    for (const k in w) { q -= w[k]; if (q <= 0) return k; }
    return 'spk';
  }
  function buildSection(S, h0, v, p, r) {
    const o = newSec(h0), d = S.diff;
    let h = h0 + Math.round(Math.max(24 * v + 40, (WMIN[d] + 12) * v + 30)), last = null;
    const k = 1 + Math.floor(r() * (1.2 + p * 2.2));
    for (let i = 0; i < k; i++) {
      last = pickPiece(p, d, r, last);
      o.kinds.push(last);
      h = PIECES[last](S, o, h, v, p, d, r);
      if (i < k - 1) h += Math.max(gap(d, p, r), Math.round(need(d, v) - 70));
    }
    o.h1 = h + 50;
    return o;
  }
  const KINDS = ['spk', 'saw', 'bird', 'shu', 'coin'];
  // המערכים ממוינים לפי גובה עולה (y יורד)
  const KEYH = { spk: o => -o.y2, saw: o => -o.y, bird: o => -o.y, shu: o => o.hLo, coin: o => -o.y };
  function pushSec(wd, o) { for (const k of KINDS) { o[k].sort((a, b) => KEYH[k](a) - KEYH[k](b)); for (const e of o[k]) wd[k].push(e); } }
  // קטע שנפסל יוצא מסוף המערכים (גם אם trim קיצץ בינתיים מההתחלה)
  function popSec(wd, o) { for (const k of KINDS) wd[k].length -= o[k].length; }
  // הבדיקה של קטע חדש (הוא כבר בתוך העולם, הרבה מעל קצה המסך):
  // 1) קבוצת כל המצבים שאפשר להגיע אליהם מתחילת הריצה לא מתרוקנת — יש תמיד דרך לעבור;
  // 2) מי שנצמד לקיר השמאלי או הימני בתחילת הקטע יכול לעבור אותו, ולכל קפיצה יש חלון זמן נוח (WMIN).
  // הבדיקה רצה בפרוסות של עד BUDGET צעדי פיזיקה לכל צעד של המשחק, כדי ששום תמונה לא תחכה לה.
  const BUDGET = 2500;
  function startJob(S) {
    const h0 = S.gh, r = S.rnd, p = clamp((h0 / PXM - 25) / 1000, 0, 1), v = speedAt(S.diff, h0 + 300);
    const o = S.tries < 7 ? buildSection(S, h0, v, p, r) : Object.assign(newSec(h0), { h1: h0 + 300 });
    pushSec(S.wd, o);
    const stopH = o.h1 - 40;
    S.job = { o, stopH, V: viewOf(S.wd, S.rh - 100, stopH + 200), R: S.R, t: S.rt, h: S.rh, cT: -1, cH: 0, side: 0, memo: { lost: new Set(), won: new Set() } };
  }
  function endJob(S, ok) {
    const J = S.job;
    S.job = null;
    if (ok) { S.R = J.R; S.rt = J.t; S.rh = J.h; S.gh = J.o.h1; S.secs++; S.rejects += S.tries; S.tries = 0; return; }
    popSec(S.wd, J.o);
    if (++S.tries < 8) return;   // עד 7 קטעים שנפסלו ברצף, ואז הפסקה בטוחה
    // לא אמור לקרות: גם קטע ריק לא עבר. משאירים אותו ורושמים (הבדיקות מחפשות את זה)
    const q = Object.assign(newSec(J.o.h0), { h1: J.o.h0 + 300 }); pushSec(S.wd, q); S.gh = q.h1; S.bad++; S.tries = 0;
  }
  // ממשיכים את הבדיקה הנוכחית (או מתחילים חדשה). budget = כמה צעדי פיזיקה מותר עכשיו
  function workJob(S, budget) {
    if (!S.job) startJob(S);
    const J = S.job, d = S.diff, c0 = CALLS;
    while (J.h < J.stopH) {
      if (J.cT < 0 && J.h >= J.o.h0) { J.cT = J.t; J.cH = J.h; }
      const nh = J.h + speedAt(d, J.h);
      J.R = expand(J.V, J.R, J.t + 1, nh);
      if (!J.R.length) return endJob(S, false);
      J.h = nh; J.t++;
      if (CALLS - c0 > budget) return;
    }
    while (J.cT >= 0 && J.side < 2) {
      const path = findPath(J.V, { s: J.side, k: 0, ev: 0 }, J.cT, J.cH, J.t - J.cT, d, J.memo);
      if (!path || !windowsOk(J.V, path, J.t, d, J.memo)) return endJob(S, false);
      J.side++;
      if (CALLS - c0 > budget) return;
    }
    endJob(S, true);
  }
  // העולם נבנה הרבה לפני המסך (גם לכל האופק של הטייס), פרוסה אחת בכל צעד.
  // רק אם הבנייה מפגרת עד קרוב למסך (או בהתחלה) — בונים מיד כמה שצריך
  const AHEAD = HORIZON * 8.2 + 300, NEAR = SY + 300;
  function generate(S, all) {
    let n = 0;
    while (S.gh < S.h + (all ? AHEAD : NEAR) && n++ < 200) workJob(S, Infinity);
    if (S.gh < S.h + AHEAD) workJob(S, BUDGET);
  }
  function trim(S) {
    const lim = -(S.h - 400), wd = S.wd;   // מה שמתחת לתחתית המסך
    const drop = (arr, lowY) => { let i = 0; while (i < arr.length - 1 && lowY(arr[i]) > lim) i++; if (i) arr.splice(0, i); return i; };
    drop(wd.spk, o => o.y1); drop(wd.saw, o => o.y - o.amp - SAW); drop(wd.bird, o => o.y - 30);
    drop(wd.shu, o => -o.hHi);
    S.ci = Math.max(0, S.ci - drop(wd.coin, c => c.y - 30));
  }

  // ---------- מצב ----------
  function unlockedCount(total) { let n = 0; for (const k of SKINS) if (total >= k.cost) n++; return n; }
  function makeState(diff, seed, demo, skin) {
    const S = {
      diff, seed, demo, rnd: U.seeded(seed),
      wd: { spk: [], saw: [], bird: [], shu: [], coin: [] },
      gh: 420, R: null, rt: 0, rh: 0, secs: 0, rejects: 0, bad: 0, tries: 0, job: null,
      h: 0, ph0: 0, P: { s: 0, k: 0, ev: 0 }, t: 0, started: !!demo, dead: false, deadT: 0, dx: 0, dy: 0, dvy: 0, dspin: 0,
      idleT: 0, blink: 0, run: 0, buf: 0, ptrPress: false, jumps: 0, trail: [],
      coins: 0, ci: 0, streak: 0, streakT: 0, floatT: -99, zn: 0, zone: 0, bgPrev: 0, bgT: 1, bonks: 0,
      skin: skin || 0, total: 0, unl: 1, newSkin: false, best: null, hintA: 0, petals: [],
    };
    S.R = [cloneP(S.P)];
    const pr = U.seeded(seed ^ 0x7e11);
    for (let i = 0; i < 22; i++) S.petals.push({ x: pr() * W, y: pr() * H, z: 0.3 + pr() * 0.6, r: 2.5 + pr() * 3, ph: pr() * TAU });
    generate(S, true);
    return S;
  }

  // ---------- אפקטים ----------
  function onJump(g, S) {
    g.sfx('jump', { p: 1 + Math.min(0.3, S.jumps * 0.002) });
    g.noise({ filter: 'bandpass', f: 600, f2: 2200, dur: 0.12, vol: 0.06, q: 1 });
    const q = posOf(S.P, S.h), sy = SY;
    g.burst(q.x, sy, { n: 8, color: ['#ffffff', '#dde6f0'], speed: 2.2, life: 18, size: 4, gravity: 0, spread: 1.4, dir: S.P.s ? Math.PI : 0 });
  }
  function onLand(g, S) {
    g.tone({ f: 210, f2: 120, dur: 0.07, vol: 0.12 });
    const x = S.P.s ? WR : WL;
    g.burst(x, SY + 6, { n: 7, color: ZONES[S.zone].edge, speed: 1.8, life: 18, size: 3.5, gravity: 0.05, spread: 1.6, dir: S.P.s ? Math.PI : 0 });
  }
  function collect(g, S, c, sx, sy) {
    c.got = true; S.coins++;
    if (S.demo) return;
    S.streak = Math.min(S.streak + 1, 12); S.streakT = 70;
    S.total++; g.save('coins', S.total);
    g.sfx('coin', { p: 1 + S.streak * 0.035 });
    g.burst(sx, sy, { n: 10, color: ['#ffe066', '#fff7c2', '#ffb300'], speed: 2.4, life: 24, size: 3.5, gravity: 0 });
    // "+1" צף רק כשהקודם כבר התרחק, כדי שעמודת מטבעות לא תיצור ערימה של טקסטים זה על זה
    if (S.t - S.floatT >= 16) { S.floatT = S.t; g.float(sx, sy - 18, '+1', { color: '#ffe066', size: 20 }); }
    checkUnlock(g, S);
  }
  function checkUnlock(g, S) {
    const n = unlockedCount(S.total);
    if (n > S.unl) { S.unl = n; S.newSkin = true; g.msg('🥷 ' + g.t('unlocked'), 1800, '#ffe066'); g.sfx('power'); }
  }
  function bonk(g, S, b, x, y) {
    b.hit = true; b.hx = x; b.hy = b.y; b.ht = 0; b.hvx = (x < MIDX ? -1 : 1) * 3.5;
    S.bonks++;
    if (S.demo) return;
    S.coins += 3; S.total += 3; g.save('coins', S.total);
    g.sfx('bounce', { p: 1.2 }); g.sfx('score');
    g.burst(x, y, { n: 16, color: ['#ffffff', '#ffe066', '#9ad8ff'], speed: 3.4, life: 26, size: 4, gravity: 0 });
    g.float(x, y - 26, g.t('bonk') + ' +3', { color: '#ffe066', size: 24 });
    g.shake(4);
    checkUnlock(g, S);
  }
  function die(g, S) {
    S.dead = true; S.deadT = 0;
    const q = posOf(S.P, S.h);
    S.dx = q.x; S.dy = SY + (q.y + S.h); S.dvy = -7; S.dspin = 0; S.dvx = q.x < MIDX ? 2.5 : -2.5;
    if (S.demo) return;
    g.burst(q.x, S.dy, { n: 22, color: ['#ffffff', '#d6dde8', '#b8c2d0'], speed: 3.6, life: 34, size: 9, gravity: -0.02 });
    g.burst(q.x, S.dy, { n: 10, color: ['#ffe066', '#ffffff'], speed: 4.5, life: 30, size: 4 });
    g.shake(12); g.flash('#ffffff', 0.25); g.sfx('hit');
    g.end({ score: meters(S.h), scoreLabel: g.t('height'), text: g.t('endCoins', { n: S.coins }) + (S.newSkin ? ' · ' + g.t('unlocked') : ''), delay: 1150 });
  }
  function advance(g, S, jump) {
    S.t++;
    const P = S.P;
    S.ph0 = S.h;
    S.h += speedAt(S.diff, S.h);
    const before = posOf(P, S.ph0);
    S.trail.unshift({ x: before.x, y: before.y });
    if (S.trail.length > 6) S.trail.pop();
    const dead = phys(S.wd, P, S.t, S.h, jump);
    if (P.ev & 1) { S.jumps++; if (!S.demo) onJump(g, S); }
    if (P.ev & 2 && !S.demo) onLand(g, S);
    if (dead) { die(g, S); return; }
    const q = posOf(P, S.h);
    // ציפורים שהנינג'ה פוגע בהן באוויר
    if (P.k) for (const b of S.wd.bird) {
      if (b.hit || Math.abs(b.y - q.y) > 40) continue;
      const bx = birdX(b, S.t);
      if (Math.hypot(q.x - bx, q.y - b.y) < NR + 16) bonk(g, S, b, bx, SY + (b.y - q.y) + (q.y + S.h));
    }
    // מטבעות
    const coins = S.wd.coin;
    for (let i = S.ci; i < coins.length; i++) {
      const c = coins[i];
      if (c.y < q.y - 40) break;
      if (!c.got && Math.abs(c.x - q.x) < 26 && Math.abs(c.y - q.y) < 28) collect(g, S, c, c.x, SY + (c.y + S.h));
    }
    while (S.ci < coins.length && coins[S.ci].y > q.y + 60) S.ci++;
    if (S.blink > 0) S.blink--; else if (Math.random() < 0.008) S.blink = 7;
    if (S.streakT > 0 && --S.streakT === 0) S.streak = 0;
    S.run += P.k ? 0 : speedAt(S.diff, S.h) * 0.07;
    const zn = Math.floor(meters(S.h) / ZONE_M);
    if (zn !== S.zn) {
      S.zn = zn; S.bgPrev = S.zone; S.zone = zn % ZONES.length; S.bgT = 0;
      if (!S.demo) { g.msg(g.t('zone', { name: g.t('z' + S.zone) }), 1700, '#ffe066'); g.sfx('power'); g.flash(ZONES[S.zone].glow, 0.15); }
    }
    // עוברים את השיא הקודם באמצע הטיפוס: חוגגים פעם אחת
    if (!S.demo && S.best && !S.passed && meters(S.h) > S.best) {
      S.passed = true;
      g.msg('🏆 ' + g.t('newBest'), 1500, '#ffe066');
      g.sfx('record');
      g.burst(q.x, SY + q.y + S.h, { n: 22, color: ['#ffe066', '#ffffff', '#ffb300'], speed: 4, life: 36, size: 4, gravity: 0 });
    }
    if (S.bgT < 1) S.bgT = Math.min(1, S.bgT + 1 / 50);
    for (const b of S.wd.bird) if (b.hit) b.ht++;
    generate(S);
    if (S.t % 30 === 0) trim(S);
  }
  function nextHazardH(S) {
    const wd = S.wd, h = S.h - 10;
    let best = Infinity;
    for (const o of wd.spk) if (-o.y2 > h) { best = Math.min(best, -o.y2); break; }
    for (const o of wd.saw) if (-o.y + o.amp + SAW > h) { best = Math.min(best, -o.y - o.amp - SAW); break; }
    for (const o of wd.bird) if (-o.y > h) { best = Math.min(best, -o.y - 30); break; }
    for (const o of wd.shu) if (o.hLo + 60 > h) { best = Math.min(best, o.hLo + 30); break; }
    return best;
  }
  function cycleSkin(g, S, dir) {
    if (unlockedCount(S.total) <= 1) { g.sfx('error'); return; }
    let i = S.skin;
    for (let k = 0; k < SKINS.length; k++) { i = (i + dir + SKINS.length) % SKINS.length; if (S.total >= SKINS[i].cost) break; }
    S.skin = i; g.save('skin', i);
    g.sfx('move', { p: 1 + i * 0.06 });
    g.burst(SEL.x, SEL.y, { n: 12, color: [SKINS[i].suit, SKINS[i].band, '#ffffff'], speed: 2.4, life: 24, size: 3.5, gravity: 0 });
  }
  function hud(g, S) {
    const m = meters(S.h), b = S.best;
    g.hud([[g.t('height'), g.t('mfmt', { n: m })], [g.t('coins'), '🪙 ' + S.coins], [g.t('best'), b === null ? '—' : g.t('mfmt', { n: Math.max(b, m) })]]);
  }

  // ---------- ציור ----------
  const SEL = { x: 300, y: 318, ax: 92, r: 26 };
  function drawSky(ctx, Z, camH, t, alpha) {
    ctx.globalAlpha = alpha;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, Z.sky1); gr.addColorStop(1, Z.sky2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (Z === ZONES[2] || Z === ZONES[4]) {   // כוכבים וירח
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 46; i++) {
        const x = hash(i) * W, y = ((hash(i + 50) * H * 1.6 + camH * 0.05) % (H * 1.2)) - 40;
        ctx.globalAlpha = alpha * (0.35 + 0.5 * Math.abs(Math.sin(t * 0.03 + i)));
        U.circle(ctx, x, y, 0.8 + hash(i + 9) * 1.6); ctx.fill();
      }
      ctx.globalAlpha = alpha;
      const mx = 430, my = 150 + (camH * 0.02) % 60;
      const rg = ctx.createRadialGradient(mx, my, 10, mx, my, 90);
      rg.addColorStop(0, 'rgba(255,248,220,.5)'); rg.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = rg; ctx.fillRect(mx - 90, my - 90, 180, 180);
      ctx.fillStyle = '#fff4d6'; U.circle(ctx, mx, my, 34); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,160,.35)'; U.circle(ctx, mx - 10, my - 6, 7); ctx.fill(); U.circle(ctx, mx + 12, my + 10, 5); ctx.fill();
    } else {
      const sx = 440, sy = 170;
      const rg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 130);
      rg.addColorStop(0, Z.glow + 'aa'); rg.addColorStop(1, Z.glow + '00');
      ctx.fillStyle = rg; ctx.fillRect(sx - 130, sy - 130, 260, 260);
    }
    // הרים רחוקים: יורדים לאט כשמטפסים, ונעלמים למטה
    const base = H + 120 + camH * 0.06;
    if (base < H + 420) {
      ctx.fillStyle = Z.far;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - 170 - Math.abs(Math.sin(x * 0.011 + 1)) * 120 - Math.sin(x * 0.031) * 20);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = Z.mid;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - 60 - Math.abs(Math.sin(x * 0.018 + 3)) * 80);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    // עננים
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const y = ((hash(i * 7) * 1400 + camH * 0.25) % 1100) - 150, x = ((hash(i * 3) * 900 + t * (0.2 + hash(i) * 0.3)) % 900) - 150;
      ctx.globalAlpha = alpha * (Z === ZONES[4] ? 0.06 : 0.5);
      U.circle(ctx, x, y, 26); ctx.fill(); U.circle(ctx, x + 30, y - 10, 32); ctx.fill(); U.circle(ctx, x + 62, y, 24); ctx.fill();
      ctx.fillRect(x, y, 62, 22);
    }
    ctx.globalAlpha = 1;
  }
  function drawWall(ctx, side, camH, Z) {
    const x0 = side ? WR : 0, w = side ? W - WR : WL;
    const gr = ctx.createLinearGradient(side ? WR : WL, 0, side ? W : 0, 0);
    gr.addColorStop(0, Z.wall1); gr.addColorStop(1, Z.wall2);
    ctx.fillStyle = gr; ctx.fillRect(x0, 0, w, H);
    // לבנים
    const bh = 34, off = (camH % (bh * 2) + bh * 2) % (bh * 2);
    ctx.fillStyle = Z.mort;
    for (let y = -bh * 2 + off; y < H + bh; y += bh) {
      ctx.fillRect(x0, y, w, 3);
      const row = Math.round((y - off) / bh), sh = (row & 1) ? 26 : 0;
      for (let bx = x0 + sh - 52; bx < x0 + w; bx += 52) if (bx > x0) ctx.fillRect(bx, y, 3, bh);
    }
    // טחב
    ctx.fillStyle = Z.moss; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      const y = ((hash(i * 31 + side * 7) * 900 + camH) % 900) - 50;
      U.circle(ctx, side ? WR + 4 : WL - 4, y, 9 + hash(i) * 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // פנים הקיר
    ctx.fillStyle = Z.edge; ctx.globalAlpha = 0.6;
    ctx.fillRect(side ? WR : WL - 4, 0, 4, H);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.fillRect(side ? WR - 6 : WL, 0, 6, H);
    ctx.globalAlpha = 1;
  }
  function drawSpikes(ctx, o, oy, Z) {
    const y1 = o.y1 + oy, y2 = o.y2 + oy, n = Math.max(1, Math.round((y2 - y1) / 20)), hh = (y2 - y1) / n;
    const fx = o.s ? WR : WL, dir = o.s ? -1 : 1;
    const gr = ctx.createLinearGradient(fx, 0, fx + dir * SPK, 0);
    gr.addColorStop(0, '#6f7a8c'); gr.addColorStop(1, '#f4f8ff');
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = y1 + i * hh; ctx.moveTo(fx, a); ctx.lineTo(fx + dir * SPK, a + hh / 2); ctx.lineTo(fx, a + hh); ctx.closePath(); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,40,.5)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = '#3d4352'; ctx.fillRect(o.s ? fx : fx - 5, y1 - 2, 5, y2 - y1 + 4);
  }
  function drawSaw(ctx, x, y, t, moving, o, oy) {
    if (moving) {
      ctx.fillStyle = 'rgba(20,20,30,.45)';
      U.rr(ctx, x - 5, o.y - o.amp + oy - 6, 10, o.amp * 2 + 12, 5); ctx.fill();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.32);
    ctx.beginPath();
    for (let i = 0; i < 28; i++) { const a = i * TAU / 28, r = i % 2 ? SAW - 6 : SAW + 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
    const gr = ctx.createRadialGradient(-8, -8, 4, 0, 0, SAW + 2);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#c7cfdb'); gr.addColorStop(1, '#79849a');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(30,34,50,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(80,90,110,.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 16, i * 2.09, i * 2.09 + 1.2); ctx.stroke(); }
    ctx.fillStyle = '#ff5d5d'; U.circle(ctx, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; U.circle(ctx, -2, -2, 2.2); ctx.fill();
    ctx.restore();
  }
  function drawBird(ctx, x, y, t, dirX, o) {
    ctx.save(); ctx.translate(x, y);
    if (o && o.hit) ctx.rotate(o.ht * 0.3);
    ctx.scale(dirX < 0 ? -1 : 1, 1);
    const f = Math.sin(t * 0.45);
    ctx.fillStyle = '#4a8fe0';
    ctx.beginPath(); ctx.ellipse(-4, -4 - f * 6, 12, 6, -0.5 - f * 0.5, 0, TAU); ctx.fill();
    const gr = ctx.createRadialGradient(-4, -6, 3, 0, 0, 18);
    gr.addColorStop(0, '#9fd0ff'); gr.addColorStop(1, '#3b7fd0');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, 17, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.ellipse(3, 5, 9, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(24, 1); ctx.lineTo(15, 5); ctx.closePath(); ctx.fill();
    if (o && o.hit) {
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(12, -2); ctx.moveTo(12, -8); ctx.lineTo(6, -2); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; U.circle(ctx, 9, -5, 4.6); ctx.fill();
      ctx.fillStyle = '#1a1030'; U.circle(ctx, 10.5, -4.6, 2.4); ctx.fill();
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(13, -10); ctx.stroke();
    }
    ctx.fillStyle = '#2c5fa8'; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(-25, -7); ctx.lineTo(-23, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawShuriken(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 5 : 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
    const gr = ctx.createLinearGradient(-16, -16, 16, 16);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#7b879c');
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#3a4152'; U.circle(ctx, 0, 0, 3); ctx.fill();
    ctx.restore();
  }
  function drawCoin(ctx, x, y, t) {
    const sx = Math.max(0.16, Math.abs(Math.cos(t * 0.09)));
    ctx.save(); ctx.translate(x, y + Math.sin(t * 0.06) * 2);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffd84d'; U.circle(ctx, 0, 0, 16); ctx.fill(); ctx.globalAlpha = 1;
    ctx.scale(sx, 1);
    const gr = ctx.createLinearGradient(0, -11, 0, 11);
    gr.addColorStop(0, '#fff3a6'); gr.addColorStop(0.5, '#ffc21a'); gr.addColorStop(1, '#c98a00');
    U.circle(ctx, 0, 0, 11); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#9a6400'; ctx.stroke();
    if (sx > 0.45) {
      ctx.fillStyle = '#fff6c4'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 4.6, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // הנינג'ה: o.side = הקיר שהוא נצמד אליו (0 שמאל), o.air = 0..1 בקפיצה, o.spin = סיבוב
  function drawNinja(ctx, x, y, o) {
    const K = SKINS[o.sk] || SKINS[0], t = o.t || 0, s = o.sc || 1.4;   // 1.4: בגודל הזה הגב נוגע בקיר
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const face = o.side ? -1 : 1;           // לאן הוא מסתכל (אל מרכז הפיר)
    if (o.spin) ctx.rotate(o.spin);
    ctx.scale(face, 1);
    // סרט הראש מתנופף
    const w1 = Math.sin(t * 0.35), w2 = Math.sin(t * 0.35 + 1.2);
    ctx.fillStyle = K.band;
    ctx.beginPath(); ctx.moveTo(-8, -15); ctx.quadraticCurveTo(-20, -12 + w1 * 4, -30, -6 + w2 * 6); ctx.lineTo(-28, -1 + w2 * 6); ctx.quadraticCurveTo(-18, -7 + w1 * 3, -8, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(-18, -2 + w2 * 3, -24, 6 + w1 * 5); ctx.lineTo(-21, 8 + w1 * 5); ctx.quadraticCurveTo(-15, 0, -7, -10); ctx.closePath(); ctx.fill();
    // רגליים וידיים (נצמד לקיר שמאחוריו: הצד השלילי של x)
    const r = o.run || 0, air = o.air;
    ctx.strokeStyle = K.dark; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
    for (const k of [0, 1]) {
      const a = air ? 0.8 : Math.sin(r + k * Math.PI) * 0.9;
      ctx.beginPath(); ctx.moveTo(-2, 9); ctx.lineTo(-11 - (air ? 0 : 2), 15 + a * 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-12, -8 - a * 6 + (air ? 8 : 0)); ctx.stroke();
    }
    // גוף
    const gr = ctx.createLinearGradient(0, -22, 0, 16);
    gr.addColorStop(0, U.shade(K.suit, 0.18)); gr.addColorStop(1, K.dark);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(0, 2, 13, 15, 0, 0, TAU); ctx.fill();
    // ראש
    ctx.fillStyle = K.suit; U.circle(ctx, 1, -13, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    // פס העיניים
    ctx.fillStyle = '#ffe2c4'; U.rr(ctx, -6, -18, 19, 8, 4); ctx.fill();
    if (o.dead) {
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.8;
      for (const ex of [3, 9]) { ctx.beginPath(); ctx.moveTo(ex - 2, -16); ctx.lineTo(ex + 2, -12); ctx.moveTo(ex + 2, -16); ctx.lineTo(ex - 2, -12); ctx.stroke(); }
    } else if (o.blink) {
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.8;
      for (const ex of [3, 9.5]) { ctx.beginPath(); ctx.moveTo(ex - 2.2, -14); ctx.lineTo(ex + 2.2, -14); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#1a1030';
      for (const ex of [3.5, 9.5]) { ctx.beginPath(); ctx.ellipse(ex, -14, 1.9, 2.6, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff'; U.circle(ctx, 4.2, -15, 0.8); ctx.fill(); U.circle(ctx, 10.2, -15, 0.8); ctx.fill();
    }
    ctx.fillStyle = K.band; ctx.fillRect(-12, -24, 25, 4.5);
    ctx.restore();
  }
  function drawArrow(ctx, x, y, dir, on, t) {
    U.circle(ctx, x, y, SEL.r); ctx.fillStyle = on ? 'rgba(255,224,102,.22)' : 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = on ? 'rgba(255,224,102,.85)' : 'rgba(255,255,255,.2)'; ctx.stroke();
    const k = on ? 1 + Math.sin(t * 0.12) * 0.06 : 1;
    ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(x + dir * 9 * k, y); ctx.lineTo(x - dir * 7 * k, y - 10 * k); ctx.lineTo(x - dir * 7 * k, y + 10 * k); ctx.closePath(); ctx.fill();
  }
  function drawReady(g, ctx, S, t) {
    U.rr(ctx, 70, 168, 460, 320, 26); ctx.fillStyle = 'rgba(10,14,32,.82)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,224,102,.45)'; ctx.stroke();
    const pulse = 0.82 + 0.18 * Math.sin(t * 0.1);
    g.text(ctx, g.t(g.touch ? 'startT' : 'start'), W / 2, 214, { size: 25, weight: 900, color: '#ffffff', alpha: pulse, maxW: 420 });
    const many = unlockedCount(S.total) > 1;
    drawArrow(ctx, SEL.x - SEL.ax, SEL.y, -1, many, t);
    drawArrow(ctx, SEL.x + SEL.ax, SEL.y, 1, many, t);
    drawNinja(ctx, SEL.x, SEL.y + 8 + Math.sin(t * 0.08) * 3, { sk: S.skin, side: 0, t, run: 0, blink: S.blink > 0, sc: 2.3 });
    g.text(ctx, (S.skin + 1) + '/' + SKINS.length, SEL.x, SEL.y + 64, { size: 15, weight: 800, color: 'rgba(255,255,255,.7)' });
    g.text(ctx, g.t('pick'), W / 2, 420, { size: 18, weight: 700, color: '#ffe066', maxW: 420 });
    const nextI = SKINS.findIndex(k => k.cost > S.total);
    g.text(ctx, nextI < 0 ? g.t('allSkins') : g.t('next', { a: S.total, b: SKINS[nextI].cost }), W / 2, 452, { size: 16, weight: 700, color: '#cfe3ff', maxW: 420 });
  }
  function drawScene(g, ctx, S, alpha) {
    const a = S.started && !S.dead ? alpha : 1;
    const hh = S.ph0 + (S.h - S.ph0) * a;           // הגובה של המצלמה
    const oy = SY + hh;                              // y בעולם + oy = y על המסך
    const tt = S.t + S.deadT + a;
    const Z = ZONES[S.zone];
    if (S.bgT < 1) drawSky(ctx, ZONES[S.bgPrev], hh, tt, 1);
    drawSky(ctx, Z, hh, tt, S.bgT < 1 ? S.bgT : 1);
    // עלי כותרת
    ctx.fillStyle = S.zone === 4 ? '#9af6ff' : '#ffc6dd';
    for (const p of S.petals) {
      let y = (p.y + hh * p.z * 0.6 + tt * 0.6) % (H + 20); if (y < 0) y += H + 20;
      const x = (p.x + Math.sin(tt * 0.02 + p.ph) * 30 + W) % W;
      ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(x, y - 10, p.r, p.r * 0.55, tt * 0.02 + p.ph, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // הקרקע בהתחלה
    const gy = oy + 30;
    if (gy < H + 10) {
      ctx.fillStyle = '#3f8f4a'; ctx.fillRect(0, gy, W, H - gy + 10);
      ctx.fillStyle = '#5fbf5a'; ctx.fillRect(0, gy, W, 10);
      ctx.fillStyle = '#c0392b';   // שער יפני קטן
      ctx.fillRect(MIDX - 70, gy - 120, 12, 120); ctx.fillRect(MIDX + 58, gy - 120, 12, 120);
      U.rr(ctx, MIDX - 92, gy - 138, 184, 16, 6); ctx.fill(); ctx.fillRect(MIDX - 78, gy - 104, 156, 10);
    }
    drawWall(ctx, 0, hh, Z); drawWall(ctx, 1, hh, Z);
    // השיא הקודם: קו מקווקו בין הקירות ודגל
    if (S.best && !S.demo) {
      const by = -S.best * PXM + oy;
      if (by > -10 && by < H + 30) {
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(WL, by); ctx.lineTo(WR, by); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.moveTo(WL + 2, by - 28); ctx.lineTo(WL + 64, by - 15); ctx.lineTo(WL + 2, by - 2); ctx.closePath(); ctx.fill();
        g.text(ctx, g.t('best'), WL + 24, by - 15, { size: 12, weight: 900, color: '#3a2a00', maxW: 38 });
      }
    }
    const wd = S.wd, top = -hh - SY - 60, bot = -hh + (H - SY) + 60;
    for (const o of wd.spk) if (o.y2 > top && o.y1 < bot) drawSpikes(ctx, o, oy, Z);
    for (const o of wd.saw) { const y = sawY(o, tt); if (y > top - 40 && y < bot + 40) drawSaw(ctx, o.s ? WR : WL, y + oy, tt, o.amp > 0, o, oy); }
    for (let i = Math.max(0, S.ci - 3); i < wd.coin.length; i++) {
      const c = wd.coin[i];
      if (c.y < top) break;
      if (!c.got && c.y < bot) drawCoin(ctx, c.x, c.y + oy, tt + c.y * 0.1);
    }
    for (const o of wd.bird) {
      if (o.hit) {
        if (o.ht > 70) continue;
        drawBird(ctx, o.hx + o.hvx * o.ht, o.hy + o.ht * o.ht * 0.25 + oy, tt, o.hvx, o);
        continue;
      }
      if (o.y < top || o.y > bot) continue;
      const bx = birdX(o, tt), vx = Math.cos(tt * TAU / o.per + o.ph);
      drawBird(ctx, bx, o.y + oy + Math.sin(tt * 0.08) * 3, tt, vx, null);
    }
    for (const o of wd.shu) {
      if (S.job && o.hLo >= S.gh) break;   // שייך לקטע שעוד נבדק
      if (tt < o.t0 - 70) continue;
      const y = shurY(o, Math.max(o.t0, tt)) + oy, x = o.s ? XR : XL;
      if (y > H + 30) continue;
      if (y < -10) {   // אזהרה: כוכב נינג'ה עומד ליפול בצד הזה
        if (tt > o.t0 - 70) {
          const k = 0.6 + 0.4 * Math.sin(tt * 0.4);
          ctx.globalAlpha = k; ctx.fillStyle = '#ff3b3b';
          ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x - 16, 12); ctx.lineTo(x + 16, 12); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          g.text(ctx, '!', x, 22, { size: 18, weight: 900, color: '#ffffff' });
        }
        continue;
      }
      drawShuriken(ctx, x, y, tt);
    }
    // הנינג'ה (בתמונת הכרטיס הוא מצויר בנפרד, גדול)
    if (S.hide) return { q: { x: XL, y: -hh }, oy, tt };
    if (!S.dead) {
      const P = S.P, k = P.k ? Math.min(J, P.k + a - 1) : 0;
      let q;
      if (P.k) { const u = Math.max(0, k) / J; q = { x: lerp(P.s ? XR : XL, P.s ? XL : XR, u), y: -hh - ARC * Math.sin(Math.PI * u) }; }
      else q = { x: P.s ? XR : XL, y: -hh };
      if (P.k) for (let i = 1; i < S.trail.length; i += 2) {
        const p = S.trail[i];
        drawNinja(ctx, p.x, p.y + oy, { sk: S.skin, side: P.s, t: tt, air: 1, spin: (P.s ? -1 : 1) * (k / J) * TAU * 0.9, alpha: 0.22 - i * 0.03 });
      }
      drawNinja(ctx, q.x, q.y + oy, { sk: S.skin, side: P.k ? (k / J > 0.5 ? 1 - P.s : P.s) : P.s, t: tt, air: P.k ? 1 : 0, run: S.run, blink: S.blink > 0, spin: P.k ? (P.s ? -1 : 1) * (k / J) * TAU : 0 });
      return { q, oy, tt };
    }
    drawNinja(ctx, S.dx, S.dy, { sk: S.skin, side: S.P.s, t: tt, air: 1, dead: true, spin: S.dspin });
    for (let i = 0; i < 3; i++) {
      const an = tt * 0.15 + i * 2.1;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      for (let k2 = 0; k2 < 10; k2++) { const rr = k2 % 2 ? 2.4 : 5.5, aa = k2 * Math.PI / 5; ctx.lineTo(S.dx + Math.cos(an) * 22 + Math.cos(aa) * rr, S.dy - 26 + Math.sin(an) * 7 + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill();
    }
    return { q: { x: S.dx, y: S.dy - oy }, oy, tt };
  }

  GK.register('ninja-walls', {
    w: W, h: H, bg: '#10162e', accent: '#ffe066',
    diffs: true,
    touch: [['Space', '⇄']],
    fmt: (v, g) => g.t('mfmt', { n: v }),
    text: {
      he: { title: 'נינג׳ה על הקירות', help: ['רווח, קליק או חצים — קפוץ אל הקיר השני', 'הנינג׳ה מטפס לבד, והמהירות עולה', 'היזהר מקוצים, ממסורים ומכוכבי נינג׳ה שנופלים', 'קפוץ על ציפורים כדי להעיף אותן ולקבל 3 מטבעות!'], helpTouch: ['גע במסך — קפוץ אל הקיר השני', 'הנינג׳ה מטפס לבד, והמהירות עולה', 'היזהר מקוצים, ממסורים ומכוכבי נינג׳ה שנופלים', 'קפוץ על ציפורים כדי להעיף אותן ולקבל 3 מטבעות!'], start: 'רווח או קליק — מתחילים לטפס!', startT: 'גע במסך — מתחילים לטפס!', pick: '◀ ▶ בחר נינג׳ה', next: 'הנינג׳ה הבא: {a}/{b} מטבעות', allSkins: 'פתחת את כל הנינג׳ות!', height: 'גובה', coins: 'מטבעות', mfmt: '{n} מ׳', zone: '{name}!', z0: 'עמק הבמבוק', z1: 'פסגות השקיעה', z2: 'לילה של ירח', z3: 'מקדש העננים', z4: 'בין הכוכבים', endCoins: 'אספת {n} מטבעות', unlocked: 'נינג׳ה חדש נפתח!', tap: 'עכשיו! קפוץ', bonk: 'בום!' },
      en: { title: 'Ninja Walls', help: ['Space, click or arrows — jump to the other wall', 'The ninja climbs by himself, faster and faster', 'Watch out for spikes, saws and falling ninja stars', 'Jump into birds to knock them away for 3 coins!'], helpTouch: ['Tap the screen — jump to the other wall', 'The ninja climbs by himself, faster and faster', 'Watch out for spikes, saws and falling ninja stars', 'Jump into birds to knock them away for 3 coins!'], start: 'Space or click — start climbing!', startT: 'Tap the screen — start climbing!', pick: '◀ ▶ choose a ninja', next: 'Next ninja: {a}/{b} coins', allSkins: 'You unlocked every ninja!', height: 'Height', coins: 'Coins', mfmt: '{n} m', zone: '{name}!', z0: 'Bamboo Valley', z1: 'Sunset Peaks', z2: 'Moonlit Night', z3: 'Cloud Temple', z4: 'Among the Stars', endCoins: 'You collected {n} coins', unlocked: 'New ninja unlocked!', tap: 'Now! Jump', bonk: 'Bonk!' },
      ar: { title: 'نينجا الجدران', help: ['المسافة أو النقر أو الأسهم — اقفز إلى الجدار الآخر', 'النينجا يتسلق وحده، وتزداد السرعة', 'احذر الأشواك والمناشير ونجوم النينجا المتساقطة', 'اقفز على الطيور لتبعدها وتحصل على 3 عملات!'], helpTouch: ['المس الشاشة — اقفز إلى الجدار الآخر', 'النينجا يتسلق وحده، وتزداد السرعة', 'احذر الأشواك والمناشير ونجوم النينجا المتساقطة', 'اقفز على الطيور لتبعدها وتحصل على 3 عملات!'], start: 'المسافة أو النقر — ابدأ التسلق!', startT: 'المس الشاشة — ابدأ التسلق!', pick: '◀ ▶ اختر نينجا', next: 'النينجا التالي: {a}/{b} عملة', allSkins: 'فتحت كل النينجا!', height: 'الارتفاع', coins: 'العملات', mfmt: '{n} م', zone: '{name}!', z0: 'وادي الخيزران', z1: 'قمم الغروب', z2: 'ليلة مقمرة', z3: 'معبد الغيوم', z4: 'بين النجوم', endCoins: 'جمعت {n} عملة', unlocked: 'فُتح نينجا جديد!', tap: 'الآن! اقفز', bonk: 'بوم!' },
      es: { title: 'Ninja en las Paredes', help: ['Espacio, clic o flechas — salta a la otra pared', 'El ninja trepa solo, cada vez más rápido', 'Cuidado con los pinchos, las sierras y las estrellas ninja que caen', '¡Salta contra los pájaros para apartarlos y gana 3 monedas!'], helpTouch: ['Toca la pantalla — salta a la otra pared', 'El ninja trepa solo, cada vez más rápido', 'Cuidado con los pinchos, las sierras y las estrellas ninja que caen', '¡Salta contra los pájaros para apartarlos y gana 3 monedas!'], start: 'Espacio o clic — ¡a trepar!', startT: 'Toca la pantalla — ¡a trepar!', pick: '◀ ▶ elige un ninja', next: 'Próximo ninja: {a}/{b} monedas', allSkins: '¡Desbloqueaste todos los ninjas!', height: 'Altura', coins: 'Monedas', mfmt: '{n} m', zone: '¡{name}!', z0: 'Valle de Bambú', z1: 'Cumbres del Ocaso', z2: 'Noche de Luna', z3: 'Templo de las Nubes', z4: 'Entre las Estrellas', endCoins: 'Juntaste {n} monedas', unlocked: '¡Nuevo ninja desbloqueado!', tap: '¡Ahora! Salta', bonk: '¡Pum!' },
      fr: { title: 'Ninja des Murs', help: ["Espace, clic ou flèches — saute sur l'autre mur", 'Le ninja grimpe tout seul, de plus en plus vite', 'Attention aux pics, aux scies et aux étoiles de ninja qui tombent', 'Saute sur les oiseaux pour les écarter et gagner 3 pièces !'], helpTouch: ["Touche l'écran — saute sur l'autre mur", 'Le ninja grimpe tout seul, de plus en plus vite', 'Attention aux pics, aux scies et aux étoiles de ninja qui tombent', 'Saute sur les oiseaux pour les écarter et gagner 3 pièces !'], start: 'Espace ou clic — on grimpe !', startT: "Touche l'écran — on grimpe !", pick: '◀ ▶ choisis un ninja', next: 'Prochain ninja : {a}/{b} pièces', allSkins: 'Tu as débloqué tous les ninjas !', height: 'Hauteur', coins: 'Pièces', mfmt: '{n} m', zone: '{name} !', z0: 'Vallée des Bambous', z1: 'Sommets du Couchant', z2: 'Nuit de Lune', z3: 'Temple des Nuages', z4: 'Parmi les Étoiles', endCoins: 'Tu as ramassé {n} pièces', unlocked: 'Nouveau ninja débloqué !', tap: 'Maintenant ! Saute', bonk: 'Paf !' },
      pt: { title: 'Ninja nas Paredes', help: ['Espaço, clique ou setas — pule para a outra parede', 'O ninja escala sozinho, cada vez mais rápido', 'Cuidado com os espinhos, as serras e as estrelas ninja que caem', 'Pule nos pássaros para afastá-los e ganhar 3 moedas!'], helpTouch: ['Toque na tela — pule para a outra parede', 'O ninja escala sozinho, cada vez mais rápido', 'Cuidado com os espinhos, as serras e as estrelas ninja que caem', 'Pule nos pássaros para afastá-los e ganhar 3 moedas!'], start: 'Espaço ou clique — bora escalar!', startT: 'Toque na tela — bora escalar!', pick: '◀ ▶ escolha um ninja', next: 'Próximo ninja: {a}/{b} moedas', allSkins: 'Você desbloqueou todos os ninjas!', height: 'Altura', coins: 'Moedas', mfmt: '{n} m', zone: '{name}!', z0: 'Vale do Bambu', z1: 'Picos do Pôr do Sol', z2: 'Noite de Lua', z3: 'Templo das Nuvens', z4: 'Entre as Estrelas', endCoins: 'Você pegou {n} moedas', unlocked: 'Novo ninja desbloqueado!', tap: 'Agora! Pule', bonk: 'Pou!' },
      ru: { title: 'Ниндзя на стенах', help: ['Пробел, клик или стрелки — прыжок на другую стену', 'Ниндзя лезет вверх сам и всё быстрее', 'Берегись шипов, пил и падающих звёздочек ниндзя', 'Прыгай на птиц, чтобы отбросить их и получить 3 монеты!'], helpTouch: ['Коснись экрана — прыжок на другую стену', 'Ниндзя лезет вверх сам и всё быстрее', 'Берегись шипов, пил и падающих звёздочек ниндзя', 'Прыгай на птиц, чтобы отбросить их и получить 3 монеты!'], start: 'Пробел или клик — лезем!', startT: 'Коснись экрана — лезем!', pick: '◀ ▶ выбери ниндзя', next: 'Следующий ниндзя: {a}/{b} монет', allSkins: 'Ты открыл всех ниндзя!', height: 'Высота', coins: 'Монеты', mfmt: '{n} м', zone: '{name}!', z0: 'Бамбуковая долина', z1: 'Закатные вершины', z2: 'Лунная ночь', z3: 'Храм облаков', z4: 'Среди звёзд', endCoins: 'Собрано монет: {n}', unlocked: 'Открыт новый ниндзя!', tap: 'Сейчас! Прыгай', bonk: 'Бум!' },
      de: { title: 'Ninja an der Wand', help: ['Leertaste, Klick oder Pfeile — zur anderen Wand springen', 'Der Ninja klettert von selbst, immer schneller', 'Pass auf Stacheln, Sägen und fallende Ninjasterne auf', 'Spring in Vögel, um sie wegzuschubsen — das gibt 3 Münzen!'], helpTouch: ['Tippe auf den Bildschirm — zur anderen Wand springen', 'Der Ninja klettert von selbst, immer schneller', 'Pass auf Stacheln, Sägen und fallende Ninjasterne auf', 'Spring in Vögel, um sie wegzuschubsen — das gibt 3 Münzen!'], start: 'Leertaste oder Klick — los klettern!', startT: 'Tippe auf den Bildschirm — los klettern!', pick: '◀ ▶ wähle einen Ninja', next: 'Nächster Ninja: {a}/{b} Münzen', allSkins: 'Du hast alle Ninjas freigeschaltet!', height: 'Höhe', coins: 'Münzen', mfmt: '{n} m', zone: '{name}!', z0: 'Bambustal', z1: 'Abendgipfel', z2: 'Mondnacht', z3: 'Wolkentempel', z4: 'Zwischen den Sternen', endCoins: 'Du hast {n} Münzen gesammelt', unlocked: 'Neuer Ninja freigeschaltet!', tap: 'Jetzt! Spring', bonk: 'Bumm!' },
    },

    init(g) {
      const seed = (Math.random() * 2147483647) | 0;
      const total = Math.max(0, +g.load('coins', 0) || 0);
      let skin = clamp(+g.load('skin', 0) || 0, 0, SKINS.length - 1);
      if (total < SKINS[skin].cost) skin = 0;
      const S = g.s = makeState(g.diff, seed, g.demo, skin);
      S.total = total; S.unl = unlockedCount(total); S.best = g.getBest();
      if (g.demo) {
        S.skin = (Math.random() * unlockedCount(total)) | 0;
        for (let i = 0; i < 260 && !S.dead; i++) advance(g, S, wantJump(S, 90));
        if (S.dead) g.s = makeState(g.diff, seed + 1, true, 0);
      }
      hud(g, S);
    },
    idle(g) {
      const S = g.s;
      if (!S) return;
      if (S.dead) { deadStep(S); return; }
      if (!g.demo) return;
      advance(g, S, wantJump(S, 90));
      if (S.dead) g.s = makeState(S.diff, (Math.random() * 2147483647) | 0, true, S.skin);
    },
    step(g) {
      const S = g.s;
      if (S.dead) { deadStep(S); return; }
      if (!S.started) {
        S.idleT++;
        if (S.blink > 0) S.blink--; else if (Math.random() < 0.01) S.blink = 7;
        if (g.hit('ArrowLeft') || g.hit('KeyA')) cycleSkin(g, S, -1);
        if (g.hit('ArrowRight') || g.hit('KeyD')) cycleSkin(g, S, 1);
        const go = g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter') || g.hit('ArrowUp') || g.hit('KeyW') || S.ptrPress;
        S.ptrPress = false;
        if (go) { S.started = true; g.sfx('whoosh'); }
        hud(g, S);
        return;
      }
      // קלט: רווח / Enter / ↑ / קליק = קפיצה. חץ לכיוון הקיר השני גם קופץ. לחיצה באוויר נשמרת לנחיתה
      const P = S.P;
      const press = g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter') || g.hit('ArrowUp') || g.hit('KeyW') || S.ptrPress ||
        ((g.hit('ArrowLeft') || g.hit('KeyA')) && (P.k ? P.s === 0 : P.s === 1)) || ((g.hit('ArrowRight') || g.hit('KeyD')) && (P.k ? P.s === 1 : P.s === 0));
      S.ptrPress = false;
      if (press) S.buf = BUF;
      let jump = false;
      if (S.buf > 0) { if (!P.k) { jump = true; S.buf = 0; } else S.buf--; }
      advance(g, S, jump);
      if (S.dead) return;
      const near = S.jumps === 0 && nextHazardH(S) - S.h < 330;
      S.hintA = clamp(S.hintA + (near ? 0.08 : -0.08), 0, 1);
      hud(g, S);
    },
    bot(g) {
      const S = g.s;
      if (S.dead) return;
      if (!S.started) { g.hits.add('Space'); return; }
      if (wantJump(S, HORIZON)) g.hits.add('Space');
    },
    onPointer(g, type, p) {
      const S = g.s;
      if (type !== 'down' || !S || S.dead) return;
      if (!S.started) for (const dir of [-1, 1]) if (Math.hypot(p.x - (SEL.x + dir * SEL.ax), p.y - SEL.y) < SEL.r + 12) { cycleSkin(g, S, dir); return; }
      S.ptrPress = true;
    },
    onPause(g) { if (g.s) { g.s.ptrPress = false; g.s.buf = 0; } },
    draw(g, ctx, alpha) {
      const S = g.s;
      const { q, oy, tt } = drawScene(g, ctx, S, alpha);
      if (!g.demo && !S.started) drawReady(g, ctx, S, S.idleT + alpha);
      if (!g.demo && S.hintA > 0 && !S.dead) {
        const x = q.x < MIDX ? q.x + 120 : q.x - 120, y = q.y + oy - 70, k = 1 + Math.sin(tt * 0.25) * 0.05;
        ctx.save(); ctx.globalAlpha = S.hintA; ctx.translate(x, y); ctx.scale(k, k);
        U.rr(ctx, -105, -21, 210, 42, 14); ctx.fillStyle = 'rgba(10,14,32,.85)'; ctx.fill();
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        g.text(ctx, (q.x < MIDX ? '➜ ' : '') + g.t('tap') + (q.x < MIDX ? '' : ' ⬅'), x, y + 1, { size: 20, weight: 900, color: '#ffffff', alpha: S.hintA, maxW: 196 });
      }
    },
    cover(ctx, w, h, k) {
      // רגע אחד: נינג'ה גדול באמצע קפיצה בשקיעה, אוסף קשת מטבעות; מסורים וקוצים על הקירות, ציפור וכוכב נינג'ה
      const S = makeState(0, 999, true, 0);
      S.wd = { spk: [], saw: [], bird: [], shu: [], coin: [] };
      S.h = S.ph0 = 2600; S.t = 50; S.zone = 1; S.bgT = 1; S.started = true; S.hide = true;
      const hb = S.h, arc = u => ({ x: lerp(XL, XR, u), y: SY - 40 - ARC * 2.2 * Math.sin(Math.PI * u) });   // על המסך
      S.wd.spk.push({ s: 1, y1: -hb - 120, y2: -hb + 140 });
      S.wd.spk.push({ s: 0, y1: -hb - 520, y2: -hb - 380 });
      S.wd.saw.push({ s: 0, y: -hb - 210, amp: 0, per: 100, ph: 0 });
      S.wd.saw.push({ s: 1, y: -hb - 430, amp: 0, per: 100, ph: 0 });
      S.wd.bird.push({ y: -hb - 300, per: 200, ph: 2.4, hit: false });
      S.wd.shu.push({ s: 1, t0: 0, y0: -hb - 520 - 50 * 4, vs: 4, hLo: 0, hHi: 1e9 });
      for (let i = 6; i < 10; i++) { const p = arc(i / 10); S.wd.coin.push({ x: p.x, y: p.y - SY - hb, got: false }); }
      const kg = Object.assign(Object.create(k), { t: key => k.t(key), demo: true, touch: false });
      // רקע רחב: השמיים של אותו אזור משני הצדדים, והמגדל באמצע
      const sc = h / H, ox = (w - W * sc) / 2;
      ctx.save(); ctx.scale(w / W, h / H); drawSky(ctx, ZONES[1], hb, 50, 1); ctx.restore();
      ctx.save(); ctx.translate(ox, 0); ctx.scale(sc, sc);
      ctx.translate(W / 2, H / 2); ctx.scale(1.12, 1.12); ctx.translate(-W / 2, -H / 2 - 20);
      drawScene(kg, ctx, S, 1);
      // רוחות לאורך הקשת, ניצוצות של המטבעות שנאספו והנינג'ה עצמו
      for (const [u, a] of [[0.14, 0.14], [0.26, 0.22], [0.38, 0.3]]) { const p = arc(u); drawNinja(ctx, p.x, p.y, { side: 0, t: 50, air: 1, spin: u * 1.4 - 0.2, alpha: a, sc: 2.3 }); }
      for (let i = 0; i < 12; i++) {
        const p = arc(0.1 + i * 0.04), r = 2 + (i % 3);
        ctx.globalAlpha = 0.55 + (i % 2) * 0.35; ctx.fillStyle = i % 2 ? '#fff3a6' : '#ffffff';
        U.circle(ctx, p.x + Math.sin(i * 2.7) * 16, p.y + Math.cos(i * 1.9) * 18 - 8, r); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const m = arc(0.52);
      drawNinja(ctx, m.x, m.y - 6, { side: 0, t: 50, air: 1, spin: 0.42, sc: 2.5 });
      ctx.restore();
      // צל רך בצדדים של המגדל
      for (const side of [0, 1]) {
        const gx = side ? ox + W * sc : ox;
        const gr = ctx.createLinearGradient(gx, 0, gx + (side ? 40 : -40), 0);
        gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(side ? gx : gx - 40, 0, 40, h);
      }
    },
    _t: { phys, canSurvive, findPath, pressOk, viewOf, speedAt, wantJump, cloneP, posOf, makeState, calls: () => CALLS, consts: { PXM, HORIZON, WMIN, J, BUF } },
  });
  function deadStep(S) {
    S.deadT++;
    S.dvy += 0.45; S.dy += S.dvy; S.dx += S.dvx; S.dspin += 0.22;
    for (const b of S.wd.bird) if (b.hit) b.ht++;
  }
})();
