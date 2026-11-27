// ============================================================
//  הופכים כבידה — משחק 2D של URotation (המנוע: g2d/kit.js)
//  רובוט קטן רץ לבד במסדרון. לחיצה הופכת את הכבידה, והוא עף מהרצפה לתקרה ובחזרה.
//  קוצים, בורות, קירות, פלטפורמות וקוביות קוצים שזזות. המהירות עולה, והמטבעות פותחים רובוטים חדשים.
//  כל קטע חדש נבדק לפני שהוא נכנס למשחק: סימולציה של כל המצבים האפשריים מוכיחה שאפשר לעבור אותו.
// ============================================================
(function () {
  'use strict';
  const U = GK.U;
  const W = 960, H = 540;
  const CY = 92, FY = 448, MID = (CY + FY) / 2;      // פני התקרה, פני הרצפה, אמצע המסדרון
  const PX = 250;                                     // איפה הרובוט עומד על המסך
  const PW = 28, PH = 44;                             // הגוף: קירות ונחיתה
  const HW = 18, HH = 32;                             // תיבת הפגיעה בקוצים ובקוביות (נדיבה, קטנה מהציור)
  const GRAV = 0.95, VMAX = 17, KICK = 3, COY = 7, BUF = 9, STEP_UP = 8, EPS = 0.01;
  const PXM = 32, ZONE_M = 400, ZL = ZONE_M * PXM;   // פיקסלים למטר, אורך אזור
  const SPD = [[4.6, 7.4], [5.4, 8.8], [6.2, 10.2]];  // מהירות בהתחלה → מקסימום, לפי רמת הקושי
  const RAMP = 1500 * PXM;                            // המקסימום מגיע אחרי 1500 מטר
  const SPK = 22, MOV = 54;                           // גובה קוץ, גודל קוביית קוצים
  const FLOOR_Y = FY - PH / 2, CEIL_Y = CY + PH / 2;  // מרכז הגוף כשהוא עומד על הרצפה / על התקרה
  const HORIZON = 180;                                // כמה צעדים קדימה הבוט מתכנן
  const WMIN = [24, 16, 11];                          // חלון זמן מינימלי (צעדים) לכל היפוך שחייבים לעשות, לפי רמת הקושי
  const TAU = Math.PI * 2;
  const ZONES = [
    { bg1: '#060a20', bg2: '#141e50', glow: '#46d9ff', far: '#1a2862', band1: '#2b3a78', band2: '#111838', seam: '#1b2654', edge: '#5ce1ff', spk1: '#f2f8ff', spk2: '#5b6d99', mov: '#ff5d8f', plat: '#3b4fa0', dust: '#a8ecff' },
    { bg1: '#1c0724', bg2: '#46125a', glow: '#ff7ad9', far: '#5a1f6e', band1: '#743084', band2: '#30103b', seam: '#511c5e', edge: '#ff92e2', spk1: '#fff2fb', spk2: '#a75a9e', mov: '#ffc93a', plat: '#8e3ca6', dust: '#ffd6f4' },
    { bg1: '#05170c', bg2: '#123e22', glow: '#9bff5a', far: '#1d4c2b', band1: '#566634', band2: '#232d16', seam: '#3b4a20', edge: '#c8ff6e', spk1: '#fff7cc', spk2: '#a68d34', mov: '#ff7a3a', plat: '#62763c', dust: '#dcffb4' },
    { bg1: '#1d0603', bg2: '#4c1708', glow: '#ff9a3a', far: '#5f1e0d', band1: '#64301d', band2: '#28110a', seam: '#47200f', edge: '#ffb547', spk1: '#fff2d8', spk2: '#a8684e', mov: '#6fd3ff', plat: '#7a4026', dust: '#ffc994' },
    { bg1: '#05192a', bg2: '#0f3b58', glow: '#a8f0ff', far: '#164b6e', band1: '#33698d', band2: '#14324a', seam: '#224f6c', edge: '#cff7ff', spk1: '#ffffff', spk2: '#77a9c4', mov: '#ff6b6b', plat: '#4280aa', dust: '#e8fbff' },
  ];
  // רובוטים: נפתחים לפי כל המטבעות שנאספו אי פעם
  const SKINS = [
    { body: '#4fb6ff', dark: '#1d5aa3', light: '#c4e8ff', scarf: '#ff5a6e', acc: 0, cost: 0 },
    { body: '#ff8fc8', dark: '#b33c7a', light: '#ffe0f0', scarf: '#ffd84d', acc: 1, cost: 25 },
    { body: '#5fe08a', dark: '#1f8446', light: '#d4ffe2', scarf: '#ffffff', acc: 2, cost: 60 },
    { body: '#ff9a3c', dark: '#b4520e', light: '#ffe3c4', scarf: '#ffe14d', acc: 3, cost: 120 },
    { body: '#8d70ff', dark: '#3c2a9a', light: '#ded4ff', scarf: '#262636', acc: 4, cost: 200 },
    { body: '#ffd447', dark: '#b08300', light: '#fff5c4', scarf: '#ff4d4d', acc: 5, cost: 350 },
  ];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const speedAt = (d, x) => { const s = SPD[d]; return s[0] + (s[1] - s[0]) * clamp(x / RAMP, 0, 1); };
  const zoneOf = x => Math.max(0, Math.floor(x / ZL)) % ZONES.length;
  const meters = x => Math.max(0, Math.floor(x / PXM));
  const movY = (m, t) => m.cy + m.amp * Math.sin(t * TAU / m.per + m.ph);
  const hash = i => { let h = Math.imul((i | 0) ^ 0x2c1b3c6d, 0x297a2d39); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

  // ---------- הפיזיקה: אותה פונקציה בדיוק במשחק, אצל הבוט ובבדיקת הקטעים ----------
  // V = עולם (או חלון ממנו) עם מערכים ממוינים לפי x. P = מצב הרובוט {y, vy, gd (1 למטה, -1 למעלה), gr (עומד), co (זמן חסד)}
  function anySolid(V, x, y) {
    const a = x - PW / 2, b = x + PW / 2, t = y - PH / 2 + EPS, u = y + PH / 2 - EPS;
    for (const s of V.sol) {
      if (s.x1 >= b) break;
      if (s.x2 > a && s.y1 < u && s.y2 > t) return s;
    }
    return null;
  }
  function surfaceHit(V, x, y, down) {
    const a = x - PW / 2, b = x + PW / 2, t = y - PH / 2 + EPS, u = y + PH / 2 - EPS;
    let best = null;
    for (const s of V.sol) {
      if (s.x1 >= b) break;
      if (s.x2 > a && s.y1 < u && s.y2 > t && (!best || (down ? s.y1 < best.y1 : s.y2 > best.y2))) best = s;
    }
    return best;
  }
  function supported(V, x, P) {
    const a = x - PW / 2, b = x + PW / 2, e = P.gd > 0 ? P.y + PH / 2 : P.y - PH / 2;
    for (const s of V.sol) {
      if (s.x1 >= b) break;
      if (s.x2 > a && Math.abs((P.gd > 0 ? s.y1 : s.y2) - e) < 0.5) return true;
    }
    return false;
  }
  function hazard(V, x, y, t) {
    const a = x - HW / 2, b = x + HW / 2, top = y - HH / 2, bot = y + HH / 2;
    for (const s of V.spk) {
      if (s.x1 + 4 >= b) break;
      if (s.x2 - 4 <= a) continue;
      if (s.up ? bot > s.y - SPK + 8 && top < s.y + 2 : top < s.y + SPK - 8 && bot > s.y - 2) return true;
    }
    for (const m of V.mov) {
      if (m.x - m.w / 2 + 6 >= b) break;
      if (m.x + m.w / 2 - 6 <= a) continue;
      const my = movY(m, t), hh = m.h / 2 - 6;
      if (bot > my - hh && top < my + hh) return true;
    }
    return false;
  }
  // צעד אחד: מ-x אל nx, ובזמן t (בשביל הקוביות שזזות). מחזיר 1 אם הרובוט נפגע. P.ev: 1 = התהפך, 2 = נחת
  let CALLS = 0;   // כמה צעדי פיזיקה חושבו (המחיר של הבדיקות)
  function phys(V, P, nx, t, flip) {
    CALLS++;
    P.ev = 0;
    if (flip && (P.gr || P.co > 0)) { P.gd = -P.gd; P.vy = P.gd * KICK; P.gr = false; P.co = 0; P.ev = 1; }
    let s = anySolid(V, nx, P.y);
    if (s) {
      // פינה נמוכה של קיר בצד של הכבידה: עולים עליה במקום להתרסק
      const ny = P.gd > 0 ? s.y1 - PH / 2 : s.y2 + PH / 2;
      if (Math.abs(ny - P.y) <= STEP_UP && P.vy * P.gd >= 0 && !anySolid(V, nx, ny)) {
        if (!P.gr) P.ev |= 2;
        P.y = ny; P.vy = 0; P.gr = true; P.co = 0;
      } else return 1;
    }
    if (P.gr && !supported(V, nx, P)) { P.gr = false; P.co = COY; }
    if (!P.gr) {
      if (P.co > 0) P.co--;
      P.vy = clamp(P.vy + P.gd * GRAV, -VMAX, VMAX);
      P.y += P.vy;
      const down = P.vy > 0 || (P.vy === 0 && P.gd > 0);
      s = surfaceHit(V, nx, P.y, down);
      if (s) {
        if (P.vy * P.gd >= 0) { P.y = P.gd > 0 ? s.y1 - PH / 2 : s.y2 + PH / 2; P.vy = 0; P.gr = true; P.co = 0; P.ev |= 2; }
        else { P.y = down ? s.y1 - PH / 2 : s.y2 + PH / 2; P.vy = 0; }
      }
    }
    if (P.y < -PH || P.y > H + PH) return 1;
    return hazard(V, nx, P.y, t) ? 1 : 0;
  }
  const cloneP = P => ({ y: P.y, vy: P.vy, gd: P.gd, gr: P.gr, co: P.co, ev: 0 });
  const skey = P => (P.gd > 0 ? 'd' : 'u') + (P.gr ? 'g' : 'a') + P.co + '|' + P.y + '|' + P.vy;
  // כל המצבים שאפשר להגיע אליהם בצעד הבא (בלי כפילויות)
  function expand(V, R, nx, t) {
    const out = [], seen = new Set();
    for (const P of R) {
      for (let f = 0; f < 2; f++) {
        if (f && !(P.gr || P.co > 0)) break;
        const Q = cloneP(P);
        if (phys(V, Q, nx, t, f === 1)) continue;
        const k = skey(Q);
        if (!seen.has(k)) { seen.add(k); out.push(Q); }
      }
    }
    return out;
  }
  // האם יש דרך לשרוד n צעדים מהמצב P (חיפוש לעומק, קודם "לא להתהפך", עם זיכרון של מצבים אבודים)
  // memo = זיכרון משותף לכמה חיפושים עם אותו עולם ואותו זמן סיום (בבדיקת קטע: חוסך את רוב העבודה)
  function canSurvive(V, P0, t0, x0, n, d, memo) {
    const M = memo || { lost: new Set(), won: new Set() }, tEnd = t0 + n;
    const rec = (P, t, x) => {
      if (t >= tEnd) return true;
      const k = t + ':' + skey(P);
      if (M.won.has(k)) return true;
      if (M.lost.has(k)) return false;
      const nx = x + speedAt(d, x);
      const A = cloneP(P);
      if (!phys(V, A, nx, t + 1, false) && rec(A, t + 1, nx)) { M.won.add(k); return true; }
      if (P.gr || P.co > 0) { const B = cloneP(P); if (!phys(V, B, nx, t + 1, true) && rec(B, t + 1, nx)) { M.won.add(k); return true; } }
      M.lost.add(k);
      return false;
    };
    return rec(P0, t0, x0);
  }
  // כמו canSurvive, אבל מחזיר את הדרך: המצב לפני כל צעד והאם התהפך בו (או null)
  function findPath(V, P0, t0, x0, n, d, memo) {
    const lost = (memo || { lost: new Set() }).lost, tEnd = t0 + n, path = [];
    const rec = (P, t, x) => {
      if (t >= tEnd) return true;
      const k = t + ':' + skey(P);
      if (lost.has(k)) return false;
      const nx = x + speedAt(d, x);
      const A = cloneP(P);
      if (!phys(V, A, nx, t + 1, false) && rec(A, t + 1, nx)) { path.push({ t: t + 1, P, x, f: false }); return true; }
      if (P.gr || P.co > 0) { const B = cloneP(P); if (!phys(V, B, nx, t + 1, true) && rec(B, t + 1, nx)) { path.push({ t: t + 1, P, x, f: true }); return true; } }
      lost.add(k);
      return false;
    };
    return rec(P0, t0, x0) ? path.reverse() : null;
  }
  // לחיצה בצעד ts (מהמצב Q שלפניו): הופכת מיד, או ברגע הנחיתה אם נוחתים תוך BUF צעדים — כמו במשחק
  function pressOk(V, Q, ts, x, tEnd, d, memo) {
    const P = cloneP(Q);
    let pend = BUF;
    for (let t = ts; t <= tEnd; t++) {
      const nx = x + speedAt(d, x);
      let f = false;
      if (P.gr || P.co > 0) { f = true; pend = 0; } else pend--;
      if (phys(V, P, nx, t, f)) return false;
      x = nx;
      if (f) return canSurvive(V, P, t, x, tEnd - t, d, memo);
      if (pend <= 0) return false;
    }
    return true;
  }
  // בדרך של "מתהפכים ברגע האחרון": לכל היפוך — כמה צעדים רצופים לפניו לחיצה עדיין מצילה
  function windowsOk(V, path, tEnd, d, memo) {
    for (let i = 0; i < path.length; i++) {
      if (!path[i].f) continue;
      let w = 1;
      for (let j = i - 1; j >= 0 && w < WMIN[d] && !path[j].f; j--) {
        if (!pressOk(V, path[j].P, path[j].t, path[j].x, tEnd, d, memo)) break;
        w++;
      }
      if (w < WMIN[d]) return false;
    }
    return true;
  }
  function viewOf(wd, a, b) {
    return {
      sol: wd.sol.filter(s => s.x2 > a && s.x1 < b),
      spk: wd.spk.filter(s => s.x2 > a && s.x1 < b),
      mov: wd.mov.filter(m => m.x + m.w / 2 > a && m.x - m.w / 2 < b),
    };
  }
  // הטייס: להתהפך עכשיו רק אם בלי זה אין דרך לשרוד את האופק
  function wantFlip(S, hz) {
    const P = S.P;
    if (!(P.gr || P.co > 0)) return false;
    const V = viewOf(S.wd, S.x - 60, S.x + hz * 11 + 140), nx = S.x + speedAt(S.diff, S.x);
    const A = cloneP(P);
    if (!phys(V, A, nx, S.t + 1, false) && canSurvive(V, A, S.t + 1, nx, hz - 1, S.diff)) return false;
    const B = cloneP(P);
    return !phys(V, B, nx, S.t + 1, true) && canSurvive(V, B, S.t + 1, nx, hz - 1, S.diff);
  }

  // ---------- בניית המסדרון: קטעים. כל קטע = כניסה בטוחה + 1–4 מכשולים + זנב קצר ----------
  const GAPS = [[90, 200], [40, 160], [12, 120]];   // רווח בין מכשולים בצדדים מתחלפים
  const zigGap = (d, p, r) => Math.round(lerp(GAPS[d][0], GAPS[d][1], r()) * (1 - 0.3 * p));
  // מי שמתהפך ברגע האחרון נוחת 25 צעדים אחר כך. מתחילת מכשול עד תחילת המכשול שאחריו בצד השני
  // צריך מספיק מקום להיפוך, לנחיתה ולחלון זמן נוח (WMIN) לפני ההיפוך הבא
  const need = (d, v) => (WMIN[d] + 16) * v + 30;
  const altGap = (d, p, v, r, L, extra) => Math.max(zigGap(d, p, r), Math.round(need(d, v) + (extra || 0) - L));
  const newSec = s0 => ({ s0, s1: s0, sol: [], spk: [], mov: [], coin: [], pit: [], gate: [], fp: [], cp: [] });
  const spikes = (o, a, b, floor) => o.spk.push({ x1: a, x2: b, y: floor ? FY : CY, up: floor });
  function coinRow(o, a, b, y) {
    if (b - a < 30) { o.coin.push({ x: (a + b) / 2, y, got: false }); return; }
    const n = Math.max(1, Math.round((b - a) / 46));
    for (let i = 0; i <= n; i++) o.coin.push({ x: a + (b - a) * i / n, y, got: false });
  }
  // המסלול של היפוך אחד (בשביל קשת מטבעות)
  function flipPath(v, fromFloor) {
    const pts = [];
    let y = fromFloor ? FLOOR_Y : CEIL_Y, vy = fromFloor ? -KICK : KICK, dx = 0;
    const gd = fromFloor ? -1 : 1;
    for (let i = 0; i < 60; i++) {
      vy = clamp(vy + gd * GRAV, -VMAX, VMAX); y += vy; dx += v;
      if (fromFloor ? y <= CEIL_Y : y >= FLOOR_Y) break;
      pts.push([dx, y]);
    }
    return pts;
  }
  const PIECES = {
    // שורת קוצים בצד אחד
    spk(o, x, v, p, d, r) {
      const side = r() < 0.5, L = Math.round(lerp(110, [250, 340, 440][d], p * (0.35 + 0.65 * r())));
      spikes(o, x, x + L, side);
      coinRow(o, x + 24, x + L - 14, side ? CEIL_Y : FLOOR_Y);
      return x + L;
    },
    // קוצים לסירוגין: רצפה, תקרה, רצפה...
    zig(o, x, v, p, d, r) {
      const n = 2 + Math.floor(r() * Math.min(3, 1 + p * 3)), Ls = [];
      for (let i = 0; i < n; i++) Ls.push(Math.round(lerp(80, 190, r())));
      let side = r() < 0.5;
      for (let i = 0; i < n; i++) {
        const L = Ls[i];
        spikes(o, x, x + L, side);
        coinRow(o, x + 22, x + L - 14, side ? CEIL_Y : FLOOR_Y);
        x += L;
        if (i < n - 1) x += altGap(d, p, v, r, L);
        side = !side;
      }
      return x;
    },
    // בורות ברצפה או בתקרה
    pit(o, x, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(3, 1 + p * 2.5)), alt = r() < 0.7, Ls = [];
      for (let i = 0; i < n; i++) Ls.push(Math.round(lerp(72, [150, 190, 230][d], r() * (0.4 + 0.6 * p))));
      let side = r() < 0.5;
      for (let i = 0; i < n; i++) {
        const L = Ls[i];
        (side ? o.fp : o.cp).push([x, x + L]);
        coinRow(o, x + 8, x + L - 8, side ? CEIL_Y : FLOOR_Y);
        x += L;
        if (i < n - 1) { if (alt) { x += altGap(d, p, v, r, L) + 10; side = !side; } else x += Math.round(lerp(60, 140, r())); }
      }
      return x;
    },
    // קירות שיוצאים מהרצפה או מהתקרה (אפשר לנחות עליהם מלמעלה)
    blk(o, x, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(3, 1 + p * 2));
      x += Math.round(12 * v);   // לפני קיר צריך להתהפך מוקדם יותר, כדי לעבור מעל הגובה שלו
      for (let i = 0; i < n; i++) {
        const side = r() < 0.5, h = Math.round(lerp(70, 165, r())), w = Math.round(lerp(48, 150, r()));
        o.sol.push(side ? { x1: x, x2: x + w, y1: FY - h, y2: FY, k: 'b' } : { x1: x, x2: x + w, y1: CY, y2: CY + h, k: 'b' });
        coinRow(o, x + 8, x + w - 8, side ? CEIL_Y : FLOOR_Y);
        x += w;
        if (i < n - 1) x += altGap(d, p, v, r, w, 12 * v);
      }
      return x;
    },
    // פלטפורמה באמצע, וקוצים מתחתיה ומעליה: רצים עליה או מתחתיה
    plat(o, x, v, p, d, r) {
      const L = Math.round(lerp(300, 460, r())), a = Math.round(30 + (WMIN[d] - 6) * v);
      o.sol.push({ x1: x, x2: x + L, y1: MID - 15, y2: MID + 15, k: 'p' });
      spikes(o, x + a, x + L - 14, true); spikes(o, x + a, x + L - 14, false);
      coinRow(o, x + 30, x + L - 26, MID - 15 - PH / 2);
      return x + L;
    },
    // קוביות קוצים שעולות ויורדות
    mov(o, x, v, p, d, r) {
      const n = 1 + Math.floor(r() * Math.min(d + 1, 1 + p * 2.2));
      const A = [[50, 105], [70, 150], [95, 150]][d], PER = [[210, 165], [175, 128], [145, 104]][d];
      x += 30;
      for (let i = 0; i < n; i++) {
        const amp = Math.round(lerp(A[0], A[1], Math.min(1, r() * (0.45 + 0.75 * p))));
        const per = Math.round(lerp(PER[0], PER[1], r() * p));
        o.mov.push({ x: x + MOV / 2, w: MOV, h: MOV, cy: MID, amp, per, ph: r() * TAU });
        x += MOV;
        if (i < n - 1) x += Math.round(Math.max(170, 22 * v) + r() * 120);
      }
      return x + 30;
    },
    // קשת מטבעות: הפסקה קטנה ופרס
    arc(o, x, v, p, d, r) {
      const up = flipPath(v, true), dn = flipPath(v, false);
      x += 30;
      for (let i = 2; i < up.length; i += 3) o.coin.push({ x: x + up[i][0], y: up[i][1], got: false });
      const m = x + up[up.length - 1][0] + 130;
      for (let i = 2; i < dn.length; i += 3) o.coin.push({ x: m + dn[i][0], y: dn[i][1], got: false });
      return m + dn[dn.length - 1][0] + 20;
    },
  };
  function pickPiece(p, d, r, last) {
    const w = {
      spk: 3, pit: 2.2, zig: 0.8 + 2 * p, arc: last === 'arc' ? 0 : 0.6,
      blk: p > 0.04 ? 1 + 1.5 * p : 0, mov: p > 0.07 ? 0.9 + 2 * p : 0, plat: p > 0.14 ? 0.6 + 1.2 * p : 0,
    };
    let sum = 0;
    for (const k in w) sum += w[k];
    let q = r() * sum;
    for (const k in w) { q -= w[k]; if (q <= 0) return k; }
    return 'spk';
  }
  function buildSection(S, s0, v, p, r) {
    const o = newSec(s0), d = S.diff;
    let x = s0 + Math.round(Math.max(26 * v + 40, (WMIN[d] + 14) * v + 30)), last = null;
    const k = 1 + Math.floor(r() * (1.2 + p * 2.2));
    for (let i = 0; i < k; i++) {
      last = pickPiece(p, d, r, last);
      x = PIECES[last](o, x, v, p, d, r);
      if (i < k - 1) x += Math.max(zigGap(d, p, r) + 30, Math.round(need(d, v) + 12 * v - 80));
    }
    o.s1 = x + 50;
    addBands(o, s0, o.s1);
    return o;
  }
  // הפסקה בטוחה (גם התשובה של המחולל אם קטע לא עבר את הבדיקה)
  function plainSection(s0, len) { const o = newSec(s0); o.s1 = s0 + len; addBands(o, s0, o.s1); return o; }
  function addBands(o, a, b) {
    for (const floor of [true, false]) {
      const pits = (floor ? o.fp : o.cp).slice().sort((p, q) => p[0] - q[0]);
      const seg = (x1, x2) => {
        let s = x1;
        while (s < x2) {   // חותכים בגבול של אזור, כדי שכל חלק יהיה בצבע אחד
          const e = Math.min(x2, (Math.floor(s / ZL) + 1) * ZL);
          o.sol.push(floor ? { x1: s, x2: e, y1: FY, y2: H + 400, k: 'f' } : { x1: s, x2: e, y1: -400, y2: CY, k: 'c' });
          s = e;
        }
      };
      let x = a;
      for (const [p1, p2] of pits) { if (p1 > x) seg(x, p1); o.pit.push({ x1: p1, x2: p2, f: floor }); x = Math.max(x, p2); }
      if (x < b) seg(x, b);
    }
    for (let z = Math.max(1, Math.floor(a / ZL) + 1); z * ZL <= b; z++) if (z * ZL > a) o.gate.push({ x: z * ZL, z });
  }
  const KINDS = ['sol', 'spk', 'mov', 'coin', 'pit', 'gate'];
  const KEYX = { sol: 'x1', spk: 'x1', mov: 'x', coin: 'x', pit: 'x1', gate: 'x' };
  function pushSec(wd, o) { for (const k of KINDS) { o[k].sort((p, q) => p[KEYX[k]] - q[KEYX[k]]); for (const e of o[k]) wd[k].push(e); } }
  // קטע שנפסל יוצא מסוף המערכים (גם אם trim קיצץ בינתיים מההתחלה)
  function popSec(wd, o) { for (const k of KINDS) wd[k].length -= o[k].length; }

  // הבדיקה של קטע חדש (הוא כבר בתוך העולם, הרבה אחרי קצה המסך):
  // 1) קבוצת כל המצבים שאפשר להגיע אליהם מתחילת הריצה לא מתרוקנת — יש תמיד דרך לעבור;
  // 2) מי שעומד על הרצפה או על התקרה בתחילת הקטע יכול לעבור אותו, ולכל היפוך יש חלון זמן נוח (WMIN).
  // הבדיקה רצה בפרוסות של עד BUDGET צעדי פיזיקה לכל צעד של המשחק, כדי ששום תמונה לא תחכה לה.
  const BUDGET = 2500;
  function startJob(S) {
    const s0 = S.gx, r = S.rnd, p = clamp((s0 / PXM - 30) / 1300, 0, 1), v = speedAt(S.diff, s0 + 300);
    const o = S.tries < 7 ? buildSection(S, s0, v, p, r) : plainSection(s0, 320);
    pushSec(S.wd, o);
    const stopX = o.s1 - 60;
    S.job = { o, stopX, V: viewOf(S.wd, S.rx - 120, stopX + 200), R: S.R, t: S.rt, x: S.rx, cT: -1, cX: 0, side: 0, memo: { lost: new Set(), won: new Set() } };
  }
  function endJob(S, ok) {
    const J = S.job;
    S.job = null;
    if (ok) { S.R = J.R; S.rt = J.t; S.rx = J.x; S.gx = J.o.s1; S.secs++; S.rejects += S.tries; S.tries = 0; return; }
    popSec(S.wd, J.o);
    if (++S.tries < 8) return;   // עד 7 קטעים שנפסלו ברצף, ואז הפסקה בטוחה
    // לא אמור לקרות: גם קטע ריק לא עבר. משאירים אותו ורושמים (הבדיקות מחפשות את זה)
    const q = plainSection(J.o.s0, 320); pushSec(S.wd, q); S.gx = q.s1; S.bad++; S.tries = 0;
  }
  // ממשיכים את הבדיקה הנוכחית (או מתחילים חדשה). budget = כמה צעדי פיזיקה מותר עכשיו
  function workJob(S, budget) {
    if (!S.job) startJob(S);
    const J = S.job, d = S.diff, c0 = CALLS;
    while (J.x < J.stopX) {
      if (J.cT < 0 && J.x >= J.o.s0) { J.cT = J.t; J.cX = J.x; }
      const nx = J.x + speedAt(d, J.x);
      J.R = expand(J.V, J.R, nx, J.t + 1);
      if (!J.R.length) return endJob(S, false);
      J.x = nx; J.t++;
      if (CALLS - c0 > budget) return;
    }
    while (J.cT >= 0 && J.side < 2) {
      const gd = J.side ? -1 : 1, P = { y: gd > 0 ? FLOOR_Y : CEIL_Y, vy: 0, gd, gr: true, co: 0, ev: 0 };
      const path = findPath(J.V, P, J.cT, J.cX, J.t - J.cT, d, J.memo);
      if (!path || !windowsOk(J.V, path, J.t, d, J.memo)) return endJob(S, false);
      J.side++;
      if (CALLS - c0 > budget) return;
    }
    endJob(S, true);
  }
  // העולם נבנה הרבה לפני המסך (גם לכל האופק של הטייס), פרוסה אחת בכל צעד.
  // רק אם הבנייה מפגרת עד קרוב למסך (או בהתחלה) — בונים מיד כמה שצריך
  const AHEAD = HORIZON * 11 + 260, NEAR = W - PX + 260;
  function generate(S, all) {
    let n = 0;
    while (S.gx < S.x + (all ? AHEAD : NEAR) && n++ < 200) workJob(S, Infinity);
    if (S.gx < S.x + AHEAD) workJob(S, BUDGET);
  }
  function trim(S) {
    const lim = S.x - PX - 160, wd = S.wd;
    const drop = (arr, endOf) => { let i = 0; while (i < arr.length - 1 && endOf(arr[i]) < lim) i++; if (i) arr.splice(0, i); return i; };
    drop(wd.sol, s => s.x2); drop(wd.spk, s => s.x2); drop(wd.mov, m => m.x + m.w); drop(wd.pit, s => s.x2); drop(wd.gate, e => e.x + 60);
    S.ci = Math.max(0, S.ci - drop(wd.coin, c => c.x + 40));
  }

  // ---------- מצב המשחק ----------
  function unlockedCount(total) { let n = 0; for (const k of SKINS) if (total >= k.cost) n++; return n; }
  function makeState(diff, seed, demo, skin) {
    const S = {
      diff, seed, demo, rnd: U.seeded(seed),
      wd: { sol: [], spk: [], mov: [], coin: [], pit: [], gate: [] },
      gx: 1100, R: null, rt: 0, rx: 0, secs: 0, rejects: 0, bad: 0, tries: 0, job: null,
      x: 0, px: 0, P: { y: FLOOR_Y, vy: 0, gd: 1, gr: true, co: 0, ev: 0 }, py: FLOOR_Y,
      t: 0, started: !!demo, dead: false, deadT: 0, deadY: 0, idleT: 0,
      fy: 1, fyT: 1, sq: 0, ph: 0, blink: 0, trail: [], buf: null, ptrPress: false,
      coins: 0, ci: 0, streak: 0, streakT: 0, floatT: -99, zn: 0, zone: 0, bgPrev: 0, bgT: 1, flips: 0,
      skin: skin || 0, total: 0, unl: 1, newSkin: false, best: null, hintA: 0,
      motes: [],
    };
    S.R = [cloneP(S.P)];
    const mr = U.seeded(seed ^ 0x51ab);
    for (let i = 0; i < 40; i++) S.motes.push({ x: mr() * (W + 40), y: CY + 10 + mr() * (FY - CY - 20), z: 0.2 + mr() * 0.5, r: 0.8 + mr() * 1.7, a: 0.12 + mr() * 0.25 });
    const o = plainSection(-480, 1580);   // הכניסה: מסדרון ארוך בלי מכשולים
    pushSec(S.wd, o);
    generate(S, true);
    return S;
  }

  // ---------- אפקטים ----------
  function flipFx(g, S) {
    const up = S.P.gd < 0, Z = ZONES[S.zone];
    g.tone({ type: 'triangle', f: up ? 300 : 620, f2: up ? 760 : 230, dur: 0.14, vol: 0.12 });
    g.noise({ filter: 'bandpass', f: up ? 500 : 1600, f2: up ? 1800 : 450, dur: 0.12, vol: 0.05, q: 1.1 });
    g.burst(PX - 4, S.P.y - S.P.gd * 18, { n: 9, color: [Z.edge, '#ffffff'], speed: 2.6, life: 22, size: 3.5, gravity: 0, spread: 1.2, dir: Math.PI });
  }
  function landFx(g, S, fallV) {
    const Z = ZONES[S.zone], fy = S.P.gd > 0 ? S.P.y + PH / 2 : S.P.y - PH / 2;
    g.burst(PX, fy, { n: 7 + Math.round(fallV / 3), color: Z.dust, speed: 1.8 + fallV / 10, life: 22, size: 4, gravity: -0.04 * S.P.gd, spread: Math.PI * 0.9, dir: S.P.gd > 0 ? -Math.PI / 2 : Math.PI / 2 });
    g.tone({ f: 170, f2: 95, dur: 0.08, vol: Math.min(0.16, 0.06 + fallV / 120) });
  }
  function collect(g, S, c, cam) {
    c.got = true; S.coins++;
    if (S.demo) return;
    S.streak = Math.min(S.streak + 1, 12); S.streakT = 70;
    S.total++;
    g.save('coins', S.total);
    g.sfx('coin', { p: 1 + S.streak * 0.035 });
    g.burst(c.x - cam, c.y, { n: 10, color: ['#ffe066', '#fff7c2', '#ffb300'], speed: 2.4, life: 26, size: 3.5, gravity: 0 });
    // "+1" צף רק כשהקודם כבר התרחק, כדי ששורת מטבעות לא תיצור ערימה של טקסטים זה על זה
    if (S.t - S.floatT >= 16) { S.floatT = S.t; g.float(c.x - cam, c.y - 20, '+1', { color: '#ffe066', size: 20 }); }
    const n = unlockedCount(S.total);
    if (n > S.unl) {
      S.unl = n; S.newSkin = true;
      g.msg('🤖 ' + g.t('unlocked'), 1800, '#ffe066');
      g.sfx('power');
    }
  }
  function die(g, S) {
    S.dead = true; S.deadT = 0;
    S.deadY = clamp(S.P.y, CY + 16, FY - 16);
    if (S.demo) return;
    const K = SKINS[S.skin];
    g.burst(PX, S.deadY, { n: 28, color: [K.body, K.light, K.dark, '#ffffff'], speed: 5.2, life: 48, size: 6, shape: 'square', gravity: 0.1 * S.P.gd });
    g.burst(PX, S.deadY, { n: 14, color: ['#ffe066', '#ffffff', K.scarf], speed: 3.4, life: 30, size: 4 });
    g.shake(12); g.flash('#ffffff', 0.28);
    g.sfx('hit');
    const m = meters(S.x);
    g.end({ score: m, scoreLabel: g.t('dist'), text: g.t('endCoins', { n: S.coins }) + (S.newSkin ? ' · ' + g.t('unlocked') : ''), delay: 1150 });
  }
  function announceZone(g, S) {
    const Z = ZONES[S.zone];
    g.msg(g.t('zone', { name: g.t('z' + S.zone) }), 1700, Z.edge);
    g.sfx('power');
    g.flash(Z.glow, 0.16);
  }

  // צעד אחד של הריצה — אותו דבר במשחק ובתפריט (שם הטייס האוטומטי משחק בשקט)
  function advance(g, S, flip) {
    S.t++;
    const P = S.P, nx = S.x + speedAt(S.diff, S.x), cam0 = S.x - PX;
    S.px = S.x; S.py = P.y;
    const fallV = Math.abs(P.vy), wasY = P.y;
    const dead = phys(S.wd, P, nx, S.t, flip);
    S.x = nx;
    if (P.ev & 1) { S.flips++; S.fyT = P.gd; if (!S.demo) flipFx(g, S); }
    if (P.ev & 2) { S.sq = Math.min(0.26, 0.07 + fallV / 70); if (!S.demo) landFx(g, S, fallV); }
    S.trail.unshift({ x: S.px, y: wasY, fy: S.fy });
    if (S.trail.length > 7) S.trail.pop();
    if (dead) { die(g, S); return; }
    S.fy += (S.fyT - S.fy) * 0.34;
    if (Math.abs(S.fy - S.fyT) < 0.01) S.fy = S.fyT;
    S.sq *= 0.8;
    if (P.gr) S.ph += speedAt(S.diff, S.x) * 0.055;
    if (S.blink > 0) S.blink--; else if (Math.random() < 0.007) S.blink = 7;
    if (S.streakT > 0 && --S.streakT === 0) S.streak = 0;
    if (!S.demo && P.gr && S.t % 10 === 0) {
      const fy = P.gd > 0 ? P.y + PH / 2 : P.y - PH / 2;
      g.burst(PX - 10, fy, { n: 1, color: ZONES[S.zone].dust, speed: 1, life: 16, size: 3, gravity: -0.02 * P.gd, spread: 0.6, dir: Math.PI + 0.3 * P.gd });
    }
    // מטבעות
    const coins = S.wd.coin;
    for (let i = S.ci; i < coins.length; i++) {
      const c = coins[i];
      if (c.x > nx + 30) break;
      if (!c.got && Math.abs(c.x - nx) < 22 && Math.abs(c.y - P.y) < 28) collect(g, S, c, cam0 + (nx - S.px));
    }
    while (S.ci < coins.length && coins[S.ci].x < nx - 40) S.ci++;
    // אזורים
    const zn = Math.floor(meters(S.x) / ZONE_M);
    if (zn !== S.zn) {
      S.zn = zn; S.bgPrev = S.zone; S.zone = zn % ZONES.length; S.bgT = 0;
      if (!S.demo) announceZone(g, S);
    }
    // עוברים את השיא הקודם באמצע הריצה: חוגגים פעם אחת
    if (!S.demo && S.best && !S.passed && meters(S.x) > S.best) {
      S.passed = true;
      g.msg('🏆 ' + g.t('newBest'), 1500, '#ffe066');
      g.sfx('record');
      g.burst(PX, P.y, { n: 22, color: ['#ffe066', '#ffffff', '#ffb300'], speed: 4, life: 36, size: 4, gravity: 0 });
    }
    if (S.bgT < 1) S.bgT = Math.min(1, S.bgT + 1 / 50);
    generate(S);
    if (S.t % 30 === 0) trim(S);
  }
  function nextHazard(S) {
    const wd = S.wd, x = S.x - 10;
    let h = Infinity;
    for (const s of wd.spk) if (s.x2 > x) { h = Math.min(h, s.x1); break; }
    for (const s of wd.pit) if (s.x2 > x) { h = Math.min(h, s.x1); break; }
    for (const m of wd.mov) if (m.x + m.w > x) { h = Math.min(h, m.x - m.w / 2); break; }
    for (const s of wd.sol) if (s.k === 'b' && s.x2 > x) { h = Math.min(h, s.x1); break; }
    return h;
  }
  function cycleSkin(g, S, dir) {
    const n = unlockedCount(S.total);
    if (n <= 1) { g.sfx('error'); return; }
    let i = S.skin;
    for (let k = 0; k < SKINS.length; k++) { i = (i + dir + SKINS.length) % SKINS.length; if (S.total >= SKINS[i].cost) break; }
    S.skin = i; g.save('skin', i);
    g.sfx('move', { p: 1 + i * 0.06 });
    g.burst(SEL.x, SEL.y, { n: 12, color: [SKINS[i].body, SKINS[i].light, '#ffffff'], speed: 2.4, life: 24, size: 3.5, gravity: 0 });
  }
  function hud(g, S) {
    const m = meters(S.x), b = S.best;
    g.hud([[g.t('dist'), g.t('mfmt', { n: m })], [g.t('coins'), '🪙 ' + S.coins], [g.t('best'), b === null ? '—' : g.t('mfmt', { n: Math.max(b, m) })]]);
  }

  // ---------- ציור ----------
  const SEL = { x: 350, y: 214, ax: 66, r: 23 };     // בוחר הרובוטים במסך "מוכנים"
  function drawBg(ctx, cam, Z, t, alpha) {
    ctx.globalAlpha = alpha;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, Z.bg1); gr.addColorStop(0.5, Z.bg2); gr.addColorStop(1, Z.bg1);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // אורות רחוקים
    const o1 = cam * 0.1, i0 = Math.floor(o1 / 210) - 1;
    for (let i = i0; i < i0 + 7; i++) {
      const gx = i * 210 - o1 + hash(i) * 150, gy = 150 + hash(i + 91) * 240, r = 46 + hash(i + 7) * 70;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      rg.addColorStop(0, Z.glow + '2e'); rg.addColorStop(1, Z.glow + '00');
      ctx.fillStyle = rg; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    // הקיר האחורי: לוחות עם פסי אור (פרלקסה)
    const o2 = cam * 0.42, j0 = Math.floor(o2 / 150) - 1;
    for (let j = j0; j < j0 + 9; j++) {
      const px = j * 150 - o2, hj = hash(j * 7 + 3);
      ctx.globalAlpha = alpha * 0.55; ctx.fillStyle = Z.far;
      U.rr(ctx, px + 10, CY + 18, 130, FY - CY - 36, 10); ctx.fill();
      ctx.globalAlpha = alpha * 0.22; ctx.fillStyle = Z.glow;
      ctx.fillRect(px + 22, CY + 34 + hj * 40, 4, 120 + hj * 80);
      if (hj > 0.45) {
        ctx.globalAlpha = alpha * (0.35 + 0.35 * Math.sin(t * 0.05 + j * 1.7));
        U.circle(ctx, px + 112, CY + 46, 4); ctx.fill();
        U.circle(ctx, px + 112, CY + 62, 4); ctx.fillStyle = Z.edge; ctx.fill();
      }
      if (hj < 0.3) {   // צינור אופקי
        ctx.globalAlpha = alpha * 0.4; ctx.fillStyle = Z.band2;
        ctx.fillRect(px - 10, FY - 70 - hj * 120, 170, 12);
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawMotes(ctx, S, cam, Z) {
    ctx.fillStyle = Z.dust;
    for (const m of S.motes) {
      let sx = (m.x - cam * m.z) % (W + 40); if (sx < 0) sx += W + 40;
      ctx.globalAlpha = m.a;
      ctx.beginPath(); ctx.arc(sx - 20, m.y + Math.sin(cam * 0.004 + m.x) * 5, m.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawSpeedLines(ctx, S, cam, Z) {
    const v = speedAt(S.diff, S.x), k = clamp((v - 6.2) / 4, 0, 1);
    if (k <= 0 || !S.started || S.dead) return;
    ctx.strokeStyle = Z.dust; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = CY + 30 + hash(i * 13) * (FY - CY - 60), len = 60 + hash(i * 5) * 90;
      let sx = (hash(i * 3) * 1400 - cam * (1.4 + hash(i) * 0.6)) % (W + 300); if (sx < 0) sx += W + 300;
      ctx.globalAlpha = 0.12 * k;
      ctx.beginPath(); ctx.moveTo(sx - 150, y); ctx.lineTo(sx - 150 + len, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function band(ctx, x1, x2, floor, Z, cam) {
    const y1 = floor ? FY : 0, y2 = floor ? H : CY, surf = floor ? FY : CY;
    const gr = ctx.createLinearGradient(0, surf, 0, floor ? H : 0);
    gr.addColorStop(0, Z.band1); gr.addColorStop(1, Z.band2);
    ctx.fillStyle = gr; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    // אריחים
    ctx.fillStyle = Z.seam;
    const w0 = Math.ceil((x1 + cam) / 64) * 64;
    for (let wx = w0; wx < x2 + cam; wx += 64) {
      const sx = wx - cam;
      ctx.fillRect(sx - 1.5, floor ? FY + 8 : 0, 3, floor ? H - FY : CY - 8);
      ctx.globalAlpha = 0.5; U.circle(ctx, sx + 32, floor ? FY + 14 : CY - 14, 2.6); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillRect(x1, floor ? FY + 22 : CY - 25, x2 - x1, 3);
    // הקצה הזוהר
    ctx.fillStyle = Z.edge;
    ctx.globalAlpha = 0.22; ctx.fillRect(x1, floor ? FY - 3 : CY - 3, x2 - x1, 6);
    ctx.globalAlpha = 1; ctx.fillRect(x1, floor ? FY : CY - 3, x2 - x1, 3);
  }
  function drawWorld(g, ctx, S, cam, tt) {
    const wd = S.wd;
    // בורות: תהום חשוכה
    for (const p of wd.pit) {
      const x1 = p.x1 - cam, x2 = p.x2 - cam;
      if (x2 < -10) continue; if (x1 > W + 10) break;
      const Z = ZONES[zoneOf(p.x1)];
      const gr = ctx.createLinearGradient(0, p.f ? FY : CY, 0, p.f ? H : 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = gr; ctx.fillRect(x1, p.f ? FY : 0, x2 - x1, p.f ? H - FY : CY);
      ctx.fillStyle = Z.glow; ctx.globalAlpha = 0.1;
      ctx.fillRect(x1, p.f ? H - 30 : 0, x2 - x1, 30);
      ctx.globalAlpha = 1;
    }
    for (const s of wd.sol) {
      const x1 = s.x1 - cam, x2 = s.x2 - cam;
      if (x2 < -20) continue; if (x1 > W + 20) break;
      const Z = ZONES[zoneOf(s.x1)];
      if (s.k === 'f' || s.k === 'c') band(ctx, Math.max(-4, x1), Math.min(W + 4, x2), s.k === 'f', Z, cam);
    }
    // שפות הבורות: פסי אזהרה
    for (const p of wd.pit) {
      const x1 = p.x1 - cam, x2 = p.x2 - cam;
      if (x2 < -20) continue; if (x1 > W + 20) break;
      const Z = ZONES[zoneOf(p.x1)];
      for (const ex of [x1, x2]) {
        ctx.fillStyle = Z.edge; ctx.globalAlpha = 0.85;
        ctx.fillRect(ex - 2, p.f ? FY : 0, 4, p.f ? H - FY : CY);
        ctx.globalAlpha = 1;
        ctx.save();
        U.rr(ctx, ex - (ex === x1 ? 14 : 0), p.f ? FY + 3 : CY - 13, 14, 10, 3); ctx.clip();
        ctx.fillStyle = '#ffd23a'; ctx.fillRect(ex - 16, p.f ? FY : CY - 16, 32, 16);
        ctx.fillStyle = '#1b1b22';
        for (let k = -3; k < 4; k++) { ctx.beginPath(); ctx.moveTo(ex + k * 8, p.f ? FY + 14 : CY - 2); ctx.lineTo(ex + k * 8 + 4, p.f ? FY + 14 : CY - 2); ctx.lineTo(ex + k * 8 + 12, p.f ? FY : CY - 16); ctx.lineTo(ex + k * 8 + 8, p.f ? FY : CY - 16); ctx.fill(); }
        ctx.restore();
      }
    }
    // סימני מרחק כל 100 מטר על הרצפה
    const m0 = Math.floor((cam - 40) / (100 * PXM)) + 1;
    for (let k = Math.max(1, m0); k * 100 * PXM < cam + W + 40; k++) {
      const sx = k * 100 * PXM - cam;
      const Z = ZONES[zoneOf(k * 100 * PXM)];
      ctx.globalAlpha = 0.9;
      U.rr(ctx, sx - 30, FY + 34, 60, 24, 8); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      g.text(ctx, g.t('mfmt', { n: k * 100 }), sx, FY + 46.5, { size: 15, weight: 800, color: Z.edge, maxW: 54 });
      ctx.globalAlpha = 1;
    }
    // שערי אזור
    for (const e of wd.gate) {
      const sx = e.x - cam;
      if (sx < -60) continue; if (sx > W + 60) break;
      const Z = ZONES[e.z % ZONES.length];
      const gr = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
      gr.addColorStop(0, Z.glow + '00'); gr.addColorStop(0.5, Z.glow + '55'); gr.addColorStop(1, Z.glow + '00');
      ctx.fillStyle = gr; ctx.fillRect(sx - 30, CY, 60, FY - CY);
      ctx.fillStyle = Z.edge; ctx.fillRect(sx - 2, CY, 4, FY - CY);
    }
    // שיא קודם: דגל
    if (S.best && !S.demo) {
      const bx = S.best * PXM - cam;
      if (bx > -20 && bx < W + 40) {
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(bx, CY + 4); ctx.lineTo(bx, FY - 4); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.moveTo(bx, CY + 8); ctx.lineTo(bx + 46, CY + 20); ctx.lineTo(bx, CY + 32); ctx.closePath(); ctx.fill();
        g.text(ctx, g.t('best'), bx + 18, CY + 20, { size: 11, weight: 900, color: '#3a2a00', maxW: 30 });
      }
    }
    // פלטפורמות וקירות
    for (const s of wd.sol) {
      const x1 = s.x1 - cam, x2 = s.x2 - cam;
      if (x2 < -20) continue; if (x1 > W + 20) break;
      if (s.k !== 'b' && s.k !== 'p') continue;
      const Z = ZONES[zoneOf(s.x1)];
      if (s.k === 'b') drawBlock(ctx, x1, s.y1, x2 - x1, s.y2 - s.y1, Z, s.y1 <= CY);
      else drawPlat(ctx, x1, s.y1, x2 - x1, s.y2 - s.y1, Z, tt);
    }
    drawSpikes(ctx, wd, cam);
    // קוביות קוצים
    for (const m of wd.mov) {
      const sx = m.x - cam;
      if (sx < -70) continue; if (sx > W + 70) break;
      const Z = ZONES[zoneOf(m.x)];
      ctx.strokeStyle = Z.edge; ctx.globalAlpha = 0.25; ctx.lineWidth = 4; ctx.setLineDash([6, 9]);
      ctx.beginPath(); ctx.moveTo(sx, Math.max(CY + 4, m.cy - m.amp - 26)); ctx.lineTo(sx, Math.min(FY - 4, m.cy + m.amp + 26)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      drawSpikeBlock(ctx, sx, movY(m, tt), Z, PX - sx, S.P.y - movY(m, tt), tt + m.ph * 30);
    }
    // מטבעות
    for (let i = Math.max(0, S.ci - 4); i < wd.coin.length; i++) {
      const c = wd.coin[i], sx = c.x - cam;
      if (sx > W + 30) break;
      if (c.got || sx < -30) continue;
      drawCoin(ctx, sx, c.y, tt + c.x * 0.13);
    }
  }
  function drawBlock(ctx, x, y, w, h, Z, top) {
    const gr = ctx.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, U.shade(Z.band1, 0.08)); gr.addColorStop(1, Z.band2);
    U.rr(ctx, x, y - (top ? 6 : 0), w, h + 6, 7); ctx.fillStyle = gr; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 7;
    for (let k = -h; k < w; k += 22) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = Z.edge; ctx.lineWidth = 2.5;
    U.rr(ctx, x + 1.25, y + 1.25 - (top ? 6 : 0), w - 2.5, h + 3.5, 6); ctx.stroke();
  }
  function drawPlat(ctx, x, y, w, h, Z, t) {
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, U.shade(Z.plat, 0.25)); gr.addColorStop(1, U.shade(Z.plat, -0.35));
    U.rr(ctx, x, y, w, h, 12); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = Z.edge; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = Z.edge;
    for (let k = x + 24; k < x + w - 16; k += 34) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 0.08 + k * 0.05); U.circle(ctx, k, y + h / 2, 3); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const ex of [x + 4, x + w - 4]) {
      const rg = ctx.createRadialGradient(ex, y + h / 2, 0, ex, y + h / 2, 22);
      rg.addColorStop(0, Z.glow + '99'); rg.addColorStop(1, Z.glow + '00');
      ctx.fillStyle = rg; ctx.fillRect(ex - 22, y + h / 2 - 22, 44, 44);
    }
  }
  function drawSpikes(ctx, wd, cam) {
    for (const s of wd.spk) {
      const x1 = s.x1 - cam, x2 = s.x2 - cam;
      if (x2 < -10) continue; if (x1 > W + 10) break;
      const Z = ZONES[zoneOf(s.x1)];
      const n = Math.max(1, Math.round((s.x2 - s.x1) / 22)), w = (x2 - x1) / n;
      const base = s.y, tip = s.up ? s.y - SPK : s.y + SPK;
      ctx.fillStyle = Z.edge; ctx.globalAlpha = 0.3;
      ctx.fillRect(x1, s.up ? base - 4 : base, x2 - x1, 4);
      ctx.globalAlpha = 1;
      const gr = ctx.createLinearGradient(0, base, 0, tip);
      gr.addColorStop(0, Z.spk2); gr.addColorStop(1, Z.spk1);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = x1 + i * w; ctx.moveTo(a, base); ctx.lineTo(a + w / 2, tip); ctx.lineTo(a + w, base); ctx.closePath(); }
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,30,.45)'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = x1 + i * w; ctx.moveTo(a + w / 2, tip); ctx.lineTo(a + w * 0.22, base); ctx.lineTo(a + w * 0.42, base); ctx.closePath(); }
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    }
  }
  function drawSpikeBlock(ctx, x, y, Z, lookX, lookY, t) {
    const c = Z.mov, s = 22;
    ctx.save(); ctx.translate(x, y);
    // הילה
    const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 46);
    rg.addColorStop(0, c + '55'); rg.addColorStop(1, c + '00');
    ctx.fillStyle = rg; ctx.fillRect(-46, -46, 92, 92);
    // קוצים מסביב
    ctx.fillStyle = '#e8eef8'; ctx.strokeStyle = 'rgba(20,20,40,.5)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 2);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 13 - 6, -s + 1); ctx.lineTo(i * 13, -s - 9); ctx.lineTo(i * 13 + 6, -s + 1); ctx.closePath(); }
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const gr = ctx.createLinearGradient(0, -s, 0, s);
    gr.addColorStop(0, U.shade(c, 0.3)); gr.addColorStop(1, U.shade(c, -0.35));
    U.rr(ctx, -s, -s, s * 2, s * 2, 10); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = U.shade(c, -0.5); ctx.stroke();
    // פנים: עיניים שמסתכלות על הרובוט וגבות כועסות (מצוירות)
    const d = Math.hypot(lookX, lookY) || 1, ex = lookX / d * 2.4, ey = lookY / d * 2.4;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(side * 8, -2, 6, 6.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1030'; U.circle(ctx, side * 8 + ex, -2 + ey, 3); ctx.fill();
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(side * 14, -12); ctx.lineTo(side * 3, -8); ctx.stroke();
    }
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-7, 11); ctx.quadraticCurveTo(0, 6 + Math.sin(t * 0.1), 7, 11); ctx.stroke();
    ctx.restore();
  }
  function drawCoin(ctx, x, y, t) {
    const sp = Math.cos(t * 0.09), sx = Math.max(0.16, Math.abs(sp));
    y += Math.sin(t * 0.06) * 2;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffd84d'; U.circle(ctx, 0, 0, 16); ctx.fill(); ctx.globalAlpha = 1;
    ctx.scale(sx, 1);
    const gr = ctx.createLinearGradient(0, -11, 0, 11);
    gr.addColorStop(0, '#fff3a6'); gr.addColorStop(0.5, '#ffc21a'); gr.addColorStop(1, '#c98a00');
    U.circle(ctx, 0, 0, 11); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#9a6400'; ctx.stroke();
    U.circle(ctx, 0, 0, 7.2); ctx.strokeStyle = 'rgba(154,100,0,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
    if (sx > 0.45) {
      ctx.fillStyle = '#fff6c4'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 4.6, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // הרובוט. מערכת צירים מקומית: 0,0 = מרכז הגוף, ה-y החיובי = לכיוון הרגליים
  function drawRunner(ctx, x, y, o) {
    const K = SKINS[o.sk] || SKINS[0], t = o.t || 0, ph = o.ph || 0;
    ctx.save();
    ctx.translate(x, y);
    const s = o.sc || 1.14;
    ctx.scale(1, Math.abs(o.fy) < 0.12 ? (o.fy < 0 ? -0.12 : 0.12) : o.fy);
    ctx.translate(0, 22); ctx.scale(s, s); ctx.translate(0, -22);
    if (o.sq) { ctx.translate(0, 22); ctx.scale(1 + o.sq * 0.7, 1 - o.sq); ctx.translate(0, -22); }
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    // צעיף (מאחורי הגוף)
    const w1 = Math.sin(t * 0.32), w2 = Math.sin(t * 0.32 + 1.4);
    ctx.fillStyle = K.scarf;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.quadraticCurveTo(-21, -10 + w1 * 3, -33, -6 + w2 * 5);
    ctx.lineTo(-31, 0 + w2 * 5);
    ctx.quadraticCurveTo(-20, -2 + w1 * 3, -9, -1);
    ctx.closePath(); ctx.fill();
    // רגליים
    ctx.lineCap = 'round';
    for (const side of [1, -1]) {
      const a = o.air ? 0.55 * side - 0.2 : Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 0.8;
      const hx = side * 4, hy = 5, fx = hx + Math.sin(a) * 11, fyy = o.air ? 16 : hy + Math.cos(a) * 13;
      ctx.strokeStyle = side > 0 ? K.dark : U.shade(K.dark, -0.25); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fyy); ctx.stroke();
      ctx.fillStyle = side > 0 ? K.dark : U.shade(K.dark, -0.25);
      ctx.beginPath(); ctx.ellipse(fx + 2.5, fyy + 2, 5, 3.2, 0, 0, TAU); ctx.fill();
    }
    // גוף
    const gr = ctx.createLinearGradient(0, -21, 0, 9);
    gr.addColorStop(0, K.light); gr.addColorStop(0.38, K.body); gr.addColorStop(1, K.dark);
    U.rr(ctx, -14, -21, 28, 30, 11); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = U.shade(K.dark, -0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; U.rr(ctx, -10, -18, 8, 5, 2.5); ctx.fill();
    // יד
    const ha = o.air ? -0.9 : Math.sin(ph + Math.PI) * 0.7;
    ctx.strokeStyle = U.shade(K.dark, -0.1); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-2 + Math.sin(ha) * 9, -4 + Math.cos(ha) * 9); ctx.stroke();
    // מסך הפנים ועיניים
    U.rr(ctx, -2, -16, 15, 13, 5); ctx.fillStyle = '#0c1430'; ctx.fill();
    if (o.dead) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
      for (const ex of [3, 9]) { ctx.beginPath(); ctx.moveTo(ex - 2, -12); ctx.lineTo(ex + 2, -8); ctx.moveTo(ex + 2, -12); ctx.lineTo(ex - 2, -8); ctx.stroke(); }
    } else if (o.blink) {
      ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 1.8;
      for (const ex of [3, 9.2]) { ctx.beginPath(); ctx.moveTo(ex - 2.4, -9.5); ctx.lineTo(ex + 2.4, -9.5); ctx.stroke(); }
    } else {
      for (const ex of [3, 9.2]) {
        ctx.fillStyle = '#e9fbff'; ctx.beginPath(); ctx.ellipse(ex, -9.6, 2.5, 3.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0c1430'; U.circle(ctx, ex + 0.9, -9.2, 1.4); ctx.fill();
      }
    }
    // אנטנה
    ctx.strokeStyle = U.shade(K.dark, -0.15); ctx.lineWidth = 2.2;
    const tx = -9 + Math.sin(t * 0.21) * 1.6;
    ctx.beginPath(); ctx.moveTo(-5, -21); ctx.quadraticCurveTo(-6, -27, tx, -31); ctx.stroke();
    if (K.acc === 2) {   // עלה
      ctx.fillStyle = '#3fcf6a'; ctx.beginPath(); ctx.ellipse(tx - 3, -33, 6, 3, -0.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1f7a3c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + 2, -30.5); ctx.lineTo(tx - 7, -35.5); ctx.stroke();
    } else {
      ctx.fillStyle = K.scarf; ctx.globalAlpha = (o.alpha != null ? o.alpha : 1) * 0.35; U.circle(ctx, tx, -31, 6); ctx.fill();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1; U.circle(ctx, tx, -31, 3.4); ctx.fill();
    }
    if (K.acc === 1) {   // פפיון
      ctx.fillStyle = K.scarf;
      ctx.beginPath(); ctx.moveTo(6, -21); ctx.lineTo(0, -27); ctx.lineTo(0, -15); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -21); ctx.lineTo(12, -27); ctx.lineTo(12, -15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.shade(K.scarf, -0.25); U.circle(ctx, 6, -21, 2.6); ctx.fill();
    } else if (K.acc === 3) {   // להבות
      for (let k = 0; k < 3; k++) {
        const fx = -6 + k * 7, fh = 9 + Math.sin(t * 0.5 + k * 2) * 3;
        ctx.fillStyle = k === 1 ? '#ffe14d' : '#ff7a1a';
        ctx.beginPath(); ctx.moveTo(fx - 4, -20); ctx.quadraticCurveTo(fx - 3, -20 - fh * 0.7, fx + 1, -20 - fh); ctx.quadraticCurveTo(fx + 2, -20 - fh * 0.5, fx + 4, -20); ctx.closePath(); ctx.fill();
      }
    } else if (K.acc === 4) {   // סרט נינג'ה
      ctx.fillStyle = K.scarf; ctx.fillRect(-14, -21, 28, 5);
      ctx.fillStyle = '#c9c9d6'; U.rr(ctx, 1, -20.5, 8, 4, 1.5); ctx.fill();
    } else if (K.acc === 5) {   // כתר
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#a87400'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-3, -21); ctx.lineTo(-4, -30); ctx.lineTo(0, -25); ctx.lineTo(4, -32); ctx.lineTo(8, -25); ctx.lineTo(12, -30); ctx.lineTo(11, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4d6d'; U.circle(ctx, 4, -24, 1.6); ctx.fill();
    }
    ctx.restore();
  }
  function drawArrow(ctx, x, y, dir, on, t) {
    ctx.save();
    U.circle(ctx, x, y, SEL.r); ctx.fillStyle = on ? 'rgba(92,225,255,.22)' : 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = on ? 'rgba(92,225,255,.8)' : 'rgba(255,255,255,.2)'; ctx.stroke();
    const k = on ? 1 + Math.sin(t * 0.12) * 0.06 : 1;
    ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(x + dir * 8 * k, y); ctx.lineTo(x - dir * 6 * k, y - 9 * k); ctx.lineTo(x - dir * 6 * k, y + 9 * k); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawReady(g, ctx, S, t) {
    const bx = 228, by = 112, bw = 600, bh = 196;
    ctx.save();
    U.rr(ctx, bx, by, bw, bh, 24); ctx.fillStyle = 'rgba(5,9,28,.8)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(92,225,255,.35)'; ctx.stroke();
    ctx.restore();
    const many = unlockedCount(S.total) > 1;
    drawArrow(ctx, SEL.x - SEL.ax, SEL.y, -1, many, t);
    drawArrow(ctx, SEL.x + SEL.ax, SEL.y, 1, many, t);
    const bob = Math.sin(t * 0.08) * 3;
    drawRunner(ctx, SEL.x, SEL.y + 30 + bob, { sk: S.skin, fy: 1, ph: 0, t, blink: S.blink > 0, sc: 2.1 });
    g.text(ctx, (S.skin + 1) + '/' + SKINS.length, SEL.x, SEL.y + 70, { size: 15, weight: 800, color: 'rgba(255,255,255,.7)' });
    const tx = 628, pulse = 0.82 + 0.18 * Math.sin(t * 0.1);
    g.text(ctx, g.t(g.touch ? 'startT' : 'start'), tx, by + 58, { size: 27, weight: 900, color: '#ffffff', alpha: pulse, maxW: 340 });
    g.text(ctx, g.t('pick'), tx, by + 104, { size: 18, weight: 700, color: '#5ce1ff', maxW: 340 });
    const nextI = SKINS.findIndex(k => k.cost > S.total);
    g.text(ctx, nextI < 0 ? g.t('allSkins') : g.t('next', { a: S.total, b: SKINS[nextI].cost }), tx, by + 142, { size: 16, weight: 700, color: '#ffe066', maxW: 340 });
  }
  function drawScene(g, ctx, S, alpha) {
    const a = S.started && !S.dead ? alpha : 1;
    const x = S.px + (S.x - S.px) * a, cam = x - PX;
    const ry = S.dead ? S.P.y : S.py + (S.P.y - S.py) * a;
    const tt = S.t + S.deadT + a;
    const Z = ZONES[S.zone];
    if (S.bgT < 1) drawBg(ctx, cam, ZONES[S.bgPrev], tt, 1);
    drawBg(ctx, cam, Z, tt, S.bgT < 1 ? S.bgT : 1);
    drawMotes(ctx, S, cam, Z);
    drawSpeedLines(ctx, S, cam, Z);
    drawWorld(g, ctx, S, cam, tt);
    if (!S.dead) {
      // רוחות של הרובוט בזמן היפוך
      if (!S.P.gr) for (let i = 1; i < S.trail.length; i += 2) {
        const p = S.trail[i];
        drawRunner(ctx, p.x - cam, p.y, { sk: S.skin, fy: p.fy, ph: S.ph, t: tt, air: true, alpha: 0.28 - i * 0.035 });
      }
      drawRunner(ctx, PX, ry, { sk: S.skin, fy: S.fy, ph: S.ph, t: tt, air: !S.P.gr, sq: S.sq, blink: S.blink > 0 });
    } else if (S.deadT < 24) {
      const k = S.deadT / 24;
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1;
      U.circle(ctx, PX, S.deadY, 14 + k * 70); ctx.stroke(); ctx.globalAlpha = 1;
    }
    return { cam, tt, ry };
  }

  GK.register('gravity-flip', {
    w: W, h: H, bg: '#060a20', accent: '#5ce1ff',
    diffs: true,
    touch: [['Space', '⇅']],
    fmt: (v, g) => g.t('mfmt', { n: v }),
    text: {
      he: { title: 'הופכים כבידה', help: ['רווח, קליק או ↑ ↓ — הופכים את הכבידה', 'הרובוט רץ לבד, עף מהרצפה לתקרה ובחזרה, והמהירות עולה', 'היזהר מקוצים, מבורות, מקירות ומקוביות קוצים שזזות', 'אסוף מטבעות כדי לפתוח רובוטים חדשים'], helpTouch: ['גע במסך — הופכים את הכבידה', 'הרובוט רץ לבד, עף מהרצפה לתקרה ובחזרה, והמהירות עולה', 'היזהר מקוצים, מבורות, מקירות ומקוביות קוצים שזזות', 'אסוף מטבעות כדי לפתוח רובוטים חדשים'], start: 'רווח או קליק — יוצאים לדרך!', startT: 'גע במסך — יוצאים לדרך!', pick: '◀ ▶ בחר רובוט', next: 'הרובוט הבא: {a}/{b} מטבעות', allSkins: 'פתחת את כל הרובוטים!', dist: 'מרחק', coins: 'מטבעות', mfmt: '{n} מ׳', zone: '{name}!', z0: 'מעבדת הניאון', z1: 'מפעל הממתקים', z2: 'מקדש הג׳ונגל', z3: 'מפעל הלבה', z4: 'תחנת הקרח', endCoins: 'אספת {n} מטבעות', unlocked: 'רובוט חדש נפתח!', tap: 'עכשיו! הפוך כבידה' },
      en: { title: 'Gravity Flip', help: ['Space, click or ↑ ↓ — flip gravity', 'The robot runs by itself, flies between floor and ceiling, and keeps speeding up', 'Watch out for spikes, pits, walls and moving spike blocks', 'Collect coins to unlock new robots'], helpTouch: ['Tap the screen — flip gravity', 'The robot runs by itself, flies between floor and ceiling, and keeps speeding up', 'Watch out for spikes, pits, walls and moving spike blocks', 'Collect coins to unlock new robots'], start: "Space or click — let's go!", startT: "Tap the screen — let's go!", pick: '◀ ▶ choose a robot', next: 'Next robot: {a}/{b} coins', allSkins: 'You unlocked every robot!', dist: 'Distance', coins: 'Coins', mfmt: '{n} m', zone: '{name}!', z0: 'Neon Lab', z1: 'Candy Factory', z2: 'Jungle Temple', z3: 'Lava Works', z4: 'Ice Station', endCoins: 'You collected {n} coins', unlocked: 'New robot unlocked!', tap: 'Now! Flip gravity' },
      ar: { title: 'قلب الجاذبية', help: ['المسافة أو النقر أو ↑ ↓ — اقلب الجاذبية', 'الروبوت يركض وحده ويطير بين الأرض والسقف، وتزداد سرعته', 'احذر الأشواك والحفر والجدران ومكعبات الأشواك المتحركة', 'اجمع العملات لتفتح روبوتات جديدة'], helpTouch: ['المس الشاشة — اقلب الجاذبية', 'الروبوت يركض وحده ويطير بين الأرض والسقف، وتزداد سرعته', 'احذر الأشواك والحفر والجدران ومكعبات الأشواك المتحركة', 'اجمع العملات لتفتح روبوتات جديدة'], start: 'المسافة أو النقر — انطلق!', startT: 'المس الشاشة — انطلق!', pick: '◀ ▶ اختر روبوتًا', next: 'الروبوت التالي: {a}/{b} عملة', allSkins: 'فتحت كل الروبوتات!', dist: 'المسافة', coins: 'العملات', mfmt: '{n} م', zone: '{name}!', z0: 'مختبر النيون', z1: 'مصنع الحلوى', z2: 'معبد الأدغال', z3: 'مصنع الحمم', z4: 'محطة الجليد', endCoins: 'جمعت {n} عملة', unlocked: 'فُتح روبوت جديد!', tap: 'الآن! اقلب الجاذبية' },
      es: { title: 'Gravedad al Revés', help: ['Espacio, clic o ↑ ↓ — invierte la gravedad', 'El robot corre solo, vuela entre el suelo y el techo y va cada vez más rápido', 'Cuidado con los pinchos, los hoyos, las paredes y los bloques de pinchos que se mueven', 'Junta monedas para desbloquear robots nuevos'], helpTouch: ['Toca la pantalla — invierte la gravedad', 'El robot corre solo, vuela entre el suelo y el techo y va cada vez más rápido', 'Cuidado con los pinchos, los hoyos, las paredes y los bloques de pinchos que se mueven', 'Junta monedas para desbloquear robots nuevos'], start: 'Espacio o clic — ¡vamos!', startT: 'Toca la pantalla — ¡vamos!', pick: '◀ ▶ elige un robot', next: 'Próximo robot: {a}/{b} monedas', allSkins: '¡Desbloqueaste todos los robots!', dist: 'Distancia', coins: 'Monedas', mfmt: '{n} m', zone: '¡{name}!', z0: 'Laboratorio Neón', z1: 'Fábrica de Dulces', z2: 'Templo de la Selva', z3: 'Fundición de Lava', z4: 'Estación de Hielo', endCoins: 'Juntaste {n} monedas', unlocked: '¡Nuevo robot desbloqueado!', tap: '¡Ahora! Invierte la gravedad' },
      fr: { title: 'Gravité Inversée', help: ['Espace, clic ou ↑ ↓ — inverse la gravité', 'Le robot court tout seul, vole entre le sol et le plafond et accélère sans cesse', 'Attention aux pics, aux trous, aux murs et aux blocs à pics qui bougent', 'Ramasse des pièces pour débloquer de nouveaux robots'], helpTouch: ["Touche l'écran — inverse la gravité", 'Le robot court tout seul, vole entre le sol et le plafond et accélère sans cesse', 'Attention aux pics, aux trous, aux murs et aux blocs à pics qui bougent', 'Ramasse des pièces pour débloquer de nouveaux robots'], start: "Espace ou clic — c'est parti !", startT: "Touche l'écran — c'est parti !", pick: '◀ ▶ choisis un robot', next: 'Prochain robot : {a}/{b} pièces', allSkins: 'Tu as débloqué tous les robots !', dist: 'Distance', coins: 'Pièces', mfmt: '{n} m', zone: '{name} !', z0: 'Labo Néon', z1: 'Usine à Bonbons', z2: 'Temple de la Jungle', z3: 'Forge de Lave', z4: 'Station de Glace', endCoins: 'Tu as ramassé {n} pièces', unlocked: 'Nouveau robot débloqué !', tap: 'Maintenant ! Inverse la gravité' },
      pt: { title: 'Gravidade Invertida', help: ['Espaço, clique ou ↑ ↓ — inverta a gravidade', 'O robô corre sozinho, voa entre o chão e o teto e fica cada vez mais rápido', 'Cuidado com os espinhos, os buracos, as paredes e os blocos de espinhos que se mexem', 'Pegue moedas para desbloquear robôs novos'], helpTouch: ['Toque na tela — inverta a gravidade', 'O robô corre sozinho, voa entre o chão e o teto e fica cada vez mais rápido', 'Cuidado com os espinhos, os buracos, as paredes e os blocos de espinhos que se mexem', 'Pegue moedas para desbloquear robôs novos'], start: 'Espaço ou clique — vamos lá!', startT: 'Toque na tela — vamos lá!', pick: '◀ ▶ escolha um robô', next: 'Próximo robô: {a}/{b} moedas', allSkins: 'Você desbloqueou todos os robôs!', dist: 'Distância', coins: 'Moedas', mfmt: '{n} m', zone: '{name}!', z0: 'Laboratório Neon', z1: 'Fábrica de Doces', z2: 'Templo da Selva', z3: 'Usina de Lava', z4: 'Estação de Gelo', endCoins: 'Você pegou {n} moedas', unlocked: 'Novo robô desbloqueado!', tap: 'Agora! Inverta a gravidade' },
      ru: { title: 'Переворот гравитации', help: ['Пробел, клик или ↑ ↓ — переверни гравитацию', 'Робот бежит сам, летает между полом и потолком и всё ускоряется', 'Берегись шипов, ям, стен и движущихся блоков с шипами', 'Собирай монеты, чтобы открыть новых роботов'], helpTouch: ['Коснись экрана — переверни гравитацию', 'Робот бежит сам, летает между полом и потолком и всё ускоряется', 'Берегись шипов, ям, стен и движущихся блоков с шипами', 'Собирай монеты, чтобы открыть новых роботов'], start: 'Пробел или клик — вперёд!', startT: 'Коснись экрана — вперёд!', pick: '◀ ▶ выбери робота', next: 'Следующий робот: {a}/{b} монет', allSkins: 'Ты открыл всех роботов!', dist: 'Дистанция', coins: 'Монеты', mfmt: '{n} м', zone: '{name}!', z0: 'Неоновая лаборатория', z1: 'Конфетная фабрика', z2: 'Храм джунглей', z3: 'Лавовый завод', z4: 'Ледяная станция', endCoins: 'Собрано монет: {n}', unlocked: 'Открыт новый робот!', tap: 'Сейчас! Переверни гравитацию' },
      de: { title: 'Schwerkraft-Dreher', help: ['Leertaste, Klick oder ↑ ↓ — Schwerkraft umdrehen', 'Der Roboter rennt von selbst, fliegt zwischen Boden und Decke und wird immer schneller', 'Pass auf Stacheln, Löcher, Wände und bewegliche Stachelblöcke auf', 'Sammle Münzen, um neue Roboter freizuschalten'], helpTouch: ['Tippe auf den Bildschirm — Schwerkraft umdrehen', 'Der Roboter rennt von selbst, fliegt zwischen Boden und Decke und wird immer schneller', 'Pass auf Stacheln, Löcher, Wände und bewegliche Stachelblöcke auf', 'Sammle Münzen, um neue Roboter freizuschalten'], start: "Leertaste oder Klick — los geht's!", startT: "Tippe auf den Bildschirm — los geht's!", pick: '◀ ▶ wähle einen Roboter', next: 'Nächster Roboter: {a}/{b} Münzen', allSkins: 'Du hast alle Roboter freigeschaltet!', dist: 'Strecke', coins: 'Münzen', mfmt: '{n} m', zone: '{name}!', z0: 'Neon-Labor', z1: 'Süßigkeitenfabrik', z2: 'Dschungeltempel', z3: 'Lavawerk', z4: 'Eisstation', endCoins: 'Du hast {n} Münzen gesammelt', unlocked: 'Neuer Roboter freigeschaltet!', tap: 'Jetzt! Schwerkraft umdrehen' },
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
        for (let i = 0; i < 150 && !S.dead; i++) advance(g, S, wantFlip(S, 100));
        if (S.dead) g.s = makeState(g.diff, seed + 1, true, 0);
      }
      hud(g, S);
    },

    // בתפריט: הטייס האוטומטי רץ בשקט. אחרי פגיעה: רק הזמן של האנימציה ממשיך
    idle(g) {
      const S = g.s;
      if (!S) return;
      if (S.dead) { S.deadT++; return; }
      if (!g.demo) return;
      advance(g, S, wantFlip(S, 100));
      if (S.dead) g.s = makeState(S.diff, (Math.random() * 2147483647) | 0, true, S.skin);
    },

    step(g) {
      const S = g.s;
      if (S.dead) { S.deadT++; return; }
      if (!S.started) {
        S.idleT++;
        if (S.blink > 0) S.blink--; else if (Math.random() < 0.01) S.blink = 7;
        if (g.hit('ArrowLeft') || g.hit('KeyA')) cycleSkin(g, S, -1);
        if (g.hit('ArrowRight') || g.hit('KeyD')) cycleSkin(g, S, 1);
        const go = g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter') || g.hit('ArrowUp') || g.hit('KeyW') || g.hit('ArrowDown') || g.hit('KeyS') || S.ptrPress;
        S.ptrPress = false;
        if (go) { S.started = true; g.sfx('whoosh'); }
        hud(g, S);
        return;
      }
      // קלט: רווח / Enter / קליק הופכים; ↑ ו-W = לתקרה; ↓ ו-S = לרצפה. לחיצה באוויר נשמרת לרגע הנחיתה
      const P = S.P;
      if (g.hit('Space') || g.hit('Enter') || g.hit('NumpadEnter') || S.ptrPress) S.buf = { k: 0, t: BUF };
      else if (g.hit('ArrowUp') || g.hit('KeyW')) S.buf = { k: -1, t: BUF };
      else if (g.hit('ArrowDown') || g.hit('KeyS')) S.buf = { k: 1, t: BUF };
      S.ptrPress = false;
      let flip = false;
      if (S.buf) {
        if (P.gr || P.co > 0) { flip = S.buf.k === 0 || S.buf.k !== P.gd; S.buf = null; }
        else if (--S.buf.t <= 0) S.buf = null;
      }
      advance(g, S, flip);
      if (S.dead) return;
      // רמז בריצה הראשונה של כל סיבוב: המכשול הראשון מתקרב ועוד לא הפכת
      const near = S.flips === 0 && nextHazard(S) - S.x < 470;
      S.hintA = clamp(S.hintA + (near ? 0.08 : -0.08), 0, 1);
      hud(g, S);
    },

    // בוט לבדיקות: אותו מתכנן כמו בתפריט, דרך המקש שאדם לוחץ עליו
    bot(g) {
      const S = g.s;
      if (S.dead) return;
      if (!S.started) { g.hits.add('Space'); return; }
      if (wantFlip(S, HORIZON)) g.hits.add('Space');
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (type !== 'down' || !S || S.dead) return;
      if (!S.started) {
        for (const dir of [-1, 1]) if (Math.hypot(p.x - (SEL.x + dir * SEL.ax), p.y - SEL.y) < SEL.r + 12) { cycleSkin(g, S, dir); return; }
      }
      S.ptrPress = true;
    },
    onPause(g) { if (g.s) { g.s.ptrPress = false; g.s.buf = null; } },

    draw(g, ctx, alpha) {
      const S = g.s;
      const { tt, ry } = drawScene(g, ctx, S, alpha);
      if (!g.demo && !S.started) drawReady(g, ctx, S, S.idleT + alpha);
      if (!g.demo && S.hintA > 0 && !S.dead) {
        const up = S.P.gd > 0, y = up ? ry - 64 : ry + 64, k = 1 + Math.sin(tt * 0.25) * 0.05;
        ctx.save(); ctx.globalAlpha = S.hintA;
        ctx.translate(PX + 40, y); ctx.scale(k, k);
        U.rr(ctx, -130, -21, 260, 42, 14); ctx.fillStyle = 'rgba(5,9,28,.82)'; ctx.fill();
        ctx.strokeStyle = '#5ce1ff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        g.text(ctx, (up ? '⬆ ' : '⬇ ') + g.t('tap'), PX + 40, y + 1, { size: 20, weight: 900, color: '#ffffff', alpha: S.hintA, maxW: 240 });
      }
    },

    cover(ctx, w, h, k) {
      // רגע אחד: הרובוט באמצע היפוך מעל קוצים, קשת מטבעות, קוביית קוצים על המסילה שלה ובור בתקרה
      const S = makeState(0, 4242, true, 0);
      const wd = S.wd = { sol: [], spk: [], mov: [], coin: [], pit: [], gate: [] };
      const o = newSec(-300);
      o.cp.push([650, 770]);
      spikes(o, 60, 400, true); spikes(o, 840, 1000, false);
      o.sol.push({ x1: 860, x2: 950, y1: FY - 130, y2: FY, k: 'b' });
      addBands(o, -300, 1400);
      pushSec(wd, o);
      wd.mov.push({ x: 560, w: MOV, h: MOV, cy: MID, amp: 80, per: 160, ph: -1.1 });
      const path = flipPath(6, true);
      for (let i = 1; i < path.length; i += 2) wd.coin.push({ x: 40 + path[i][0], y: path[i][1], got: false });
      for (let i = 0; i < 4; i++) wd.coin.push({ x: 660 + i * 44, y: FLOOR_Y, got: false });
      S.x = S.px = PX; S.zone = 0; S.t = 10; S.ci = 0; S.dead = true; S.deadT = 30;
      S.motes.length = 30;
      const kg = Object.assign(Object.create(k), { t: key => (key === 'mfmt' ? '' : k.t(key)), demo: true, touch: false });
      kg.text = () => {};
      ctx.save(); ctx.scale(w / W, h / H);
      ctx.translate(480, 270); ctx.scale(1.18, 1.18); ctx.translate(-480, -270);
      drawScene(kg, ctx, S, 1);
      // הרובוט: הפוך, ממש לפני הנחיתה על התקרה, עם רוחות לאורך הקשת
      for (let i = 5; i >= 1; i--) {
        const p = path[Math.max(0, 15 - i * 3)];
        drawRunner(ctx, 40 + p[0] + 30, p[1] + 10, { sk: 0, fy: i > 3 ? 1 : -1, ph: 2, t: 10, air: true, alpha: 0.32 - i * 0.05, sc: 1.45 });
      }
      for (let i = 0; i < 16; i++) {
        const a = i * 2.4, r = 26 + (i * 37) % 44;
        ctx.globalAlpha = 0.45 + (i % 3) * 0.2; ctx.fillStyle = i % 2 ? '#5ce1ff' : '#ffffff';
        U.circle(ctx, 330 + Math.cos(a) * r, 190 + Math.sin(a) * r * 0.9, 1.6 + (i % 3)); ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawRunner(ctx, 336, 150, { sk: 0, fy: -1, ph: 2, t: 10, air: true, sc: 1.6 });
      ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד
    _t: { phys, canSurvive, findPath, pressOk, viewOf, speedAt, wantFlip, expand, cloneP, makeState, calls: () => CALLS, consts: { FY, CY, PH, PXM, FLOOR_Y, CEIL_Y, HORIZON, WMIN, SKINS: SKINS.length } },
  });
})();
