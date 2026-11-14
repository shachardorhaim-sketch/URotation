// ============================================================
//  חידות שחמט — משחק 2D של URotation (המנוע: g2d/kit.js)
//  60 חידות: מט במסע אחד, בשניים ובשלושה. המחשב משחק את ההגנה הטובה ביותר.
//  כל חידה נבדקה עם Stockfish ועם פותר מלא: יש מסע פותח אחד בלבד ומט כפוי.
// ============================================================
(function () {
  'use strict';

  // ---------- מנוע שחמט קטן (לוח 0x88) ----------
  const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  const NOFF = [33, 31, 18, 14, -33, -31, -18, -14];
  const BOFF = [17, 15, -17, -15];
  const ROFF = [16, 1, -16, -1];
  const KOFF = [17, 15, -17, -15, 16, 1, -16, -1];
  const CASMASK = new Int8Array(128).fill(15);
  CASMASK[0] = 13; CASMASK[4] = 12; CASMASK[7] = 14; CASMASK[112] = 7; CASMASK[116] = 3; CASMASK[119] = 11;
  const sqFrom = s => (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97);
  const sqName = q => String.fromCharCode(97 + (q & 7)) + (1 + (q >> 4));

  function fromFen(fen) {
    const parts = fen.trim().split(/\s+/);
    const b = new Int8Array(128), kings = [-1, -1];
    let r = 7, f = 0;
    for (const ch of parts[0]) {
      if (ch === '/') { r--; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += ch.charCodeAt(0) - 48; continue; }
      const lo = ch.toLowerCase(), t = 'pnbrqk'.indexOf(lo) + 1, c = ch === lo ? 1 : 0, sq = r * 16 + f;
      b[sq] = t | (c << 3);
      if (t === KING) kings[c] = sq;
      f++;
    }
    const cs = parts[2] || '-';
    return {
      b, kings, turn: parts[1] === 'b' ? 1 : 0, hist: [],
      cas: (cs.includes('K') ? 1 : 0) | (cs.includes('Q') ? 2 : 0) | (cs.includes('k') ? 4 : 0) | (cs.includes('q') ? 8 : 0),
      ep: parts[3] && parts[3] !== '-' ? sqFrom(parts[3]) : -1,
    };
  }

  function attacked(P, sq, by) {
    const b = P.b, cb = by << 3;
    if (by === 0) {
      if (!((sq - 15) & 0x88) && b[sq - 15] === PAWN) return true;
      if (!((sq - 17) & 0x88) && b[sq - 17] === PAWN) return true;
    } else {
      if (!((sq + 15) & 0x88) && b[sq + 15] === (PAWN | 8)) return true;
      if (!((sq + 17) & 0x88) && b[sq + 17] === (PAWN | 8)) return true;
    }
    for (let i = 0; i < 8; i++) { const s = sq + NOFF[i]; if (!(s & 0x88) && b[s] === (KNIGHT | cb)) return true; }
    for (let i = 0; i < 8; i++) { const s = sq + KOFF[i]; if (!(s & 0x88) && b[s] === (KING | cb)) return true; }
    for (let i = 0; i < 4; i++) {
      const o = BOFF[i];
      for (let s = sq + o; !(s & 0x88); s += o) { const p = b[s]; if (p) { if (p === (BISHOP | cb) || p === (QUEEN | cb)) return true; break; } }
    }
    for (let i = 0; i < 4; i++) {
      const o = ROFF[i];
      for (let s = sq + o; !(s & 0x88); s += o) { const p = b[s]; if (p) { if (p === (ROOK | cb) || p === (QUEEN | cb)) return true; break; } }
    }
    return false;
  }

  const mv = (f, t, p, c, pr, k) => ({ f, t, p, c, pr, k });
  function gen(P, out) {
    const b = P.b, us = P.turn, them = us ^ 1;
    const up = us ? -16 : 16, start = us ? 6 : 1, last = us ? 0 : 7;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p || (p >> 3) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const s1 = sq + up;
        const promo = (s1 >> 4) === last;
        if (!(s1 & 0x88) && !b[s1]) {
          if (promo) for (const q of [QUEEN, KNIGHT, ROOK, BISHOP]) out.push(mv(sq, s1, p, 0, q | (us << 3), 0));
          else {
            out.push(mv(sq, s1, p, 0, 0, 0));
            if ((sq >> 4) === start && !b[s1 + up]) out.push(mv(sq, s1 + up, p, 0, 0, 1));
          }
        }
        for (const d of [up - 1, up + 1]) {
          const s = sq + d;
          if (s & 0x88) continue;
          const q = b[s];
          if (q && (q >> 3) === them) {
            if (promo) for (const pq of [QUEEN, KNIGHT, ROOK, BISHOP]) out.push(mv(sq, s, p, q, pq | (us << 3), 0));
            else out.push(mv(sq, s, p, q, 0, 0));
          } else if (!q && s === P.ep) out.push(mv(sq, s, p, PAWN | (them << 3), 0, 2));
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? NOFF : KOFF;
        for (let i = 0; i < 8; i++) {
          const s = sq + offs[i];
          if (s & 0x88) continue;
          const q = b[s];
          if (!q || (q >> 3) === them) out.push(mv(sq, s, p, q, 0, 0));
        }
        if (t === KING) {
          if (us === 0 && sq === 4) {
            if ((P.cas & 1) && !b[5] && !b[6] && b[7] === ROOK && !attacked(P, 4, 1) && !attacked(P, 5, 1) && !attacked(P, 6, 1)) out.push(mv(4, 6, p, 0, 0, 3));
            if ((P.cas & 2) && !b[3] && !b[2] && !b[1] && b[0] === ROOK && !attacked(P, 4, 1) && !attacked(P, 3, 1) && !attacked(P, 2, 1)) out.push(mv(4, 2, p, 0, 0, 4));
          } else if (us === 1 && sq === 116) {
            if ((P.cas & 4) && !b[117] && !b[118] && b[119] === (ROOK | 8) && !attacked(P, 116, 0) && !attacked(P, 117, 0) && !attacked(P, 118, 0)) out.push(mv(116, 118, p, 0, 0, 3));
            if ((P.cas & 8) && !b[115] && !b[114] && !b[113] && b[112] === (ROOK | 8) && !attacked(P, 116, 0) && !attacked(P, 115, 0) && !attacked(P, 114, 0)) out.push(mv(116, 114, p, 0, 0, 4));
          }
        }
      } else {
        const dirs = t === BISHOP ? BOFF : t === ROOK ? ROFF : KOFF;
        for (const o of dirs) {
          for (let s = sq + o; !(s & 0x88); s += o) {
            const q = b[s];
            if (!q) out.push(mv(sq, s, p, 0, 0, 0));
            else { if ((q >> 3) === them) out.push(mv(sq, s, p, q, 0, 0)); break; }
          }
        }
      }
    }
    return out;
  }

  function make(P, m) {
    const b = P.b, us = P.turn;
    P.hist.push(P.cas, P.ep);
    b[m.t] = m.pr || m.p; b[m.f] = 0;
    if (m.k === 2) b[m.t + (us ? 16 : -16)] = 0;
    else if (m.k === 3) { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = 0; }
    else if (m.k === 4) { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = 0; }
    if ((m.p & 7) === KING) P.kings[us] = m.t;
    P.cas &= CASMASK[m.f] & CASMASK[m.t];
    P.ep = m.k === 1 ? (m.f + m.t) >> 1 : -1;
    P.turn = us ^ 1;
  }
  function unmake(P, m) {
    const b = P.b;
    P.turn ^= 1;
    const us = P.turn;
    P.ep = P.hist.pop(); P.cas = P.hist.pop();
    b[m.f] = m.p;
    if (m.k === 2) { b[m.t] = 0; b[m.t + (us ? 16 : -16)] = m.c; } else b[m.t] = m.c;
    if (m.k === 3) { b[m.t + 1] = b[m.t - 1]; b[m.t - 1] = 0; }
    else if (m.k === 4) { b[m.t - 2] = b[m.t + 1]; b[m.t + 1] = 0; }
    if ((m.p & 7) === KING) P.kings[us] = m.f;
  }
  const inCheck = P => attacked(P, P.kings[P.turn], P.turn ^ 1);
  function legal(P) {
    const out = [], us = P.turn;
    for (const m of gen(P, [])) { make(P, m); if (!attacked(P, P.kings[us], us ^ 1)) out.push(m); unmake(P, m); }
    return out;
  }
  function hasLegal(P) {
    const us = P.turn;
    for (const m of gen(P, [])) { make(P, m); const ok = !attacked(P, P.kings[us], us ^ 1); unmake(P, m); if (ok) return true; }
    return false;
  }
  const isMate = P => inCheck(P) && !hasLegal(P);
  const uci = m => sqName(m.f) + sqName(m.t) + (m.pr ? 'nbrq'[(m.pr & 7) - 2] : '');
  const findUci = (P, s) => legal(P).find(m => uci(m) === s) || null;

  // ----- פותר מט: האם הצד שתורו יכול לכפות מט בתוך n מסעים שלו -----
  function ordered(P) {
    const ms = legal(P), them = P.turn ^ 1;
    for (const m of ms) { make(P, m); m.chk = attacked(P, P.kings[them], P.turn ^ 1) ? 1 : 0; unmake(P, m); }
    return ms.sort((a, b) => (b.chk - a.chk) || ((b.c & 7) - (a.c & 7)));
  }
  function mateIn(P, n) {
    for (const m of ordered(P)) {
      if (n === 1 && !m.chk) break;           // מט במסע אחד חייב להיות שח
      make(P, m);
      const ok = forcedAfter(P, n);
      unmake(P, m);
      if (ok) return m;
    }
    return null;
  }
  // אחרי מסע התוקף: כל תשובה של המגן נגמרת במט בתוך n-1 מסעים נוספים
  function forcedAfter(P, n) {
    const replies = legal(P);
    if (!replies.length) return inCheck(P);   // מט — כן; פט — לא
    if (n <= 1) return false;
    for (const r of replies) {
      make(P, r);
      const ok = mateIn(P, n - 1) !== null;
      unmake(P, r);
      if (!ok) return false;
    }
    return true;
  }
  // כמה מסעים עד מט (הכי מהר), או 0 אם אין בתוך max
  function mateDist(P, max) { for (let k = 1; k <= max; k++) if (mateIn(P, k)) return k; return 0; }

  // ---------- החידות (נוצרו ונבדקו מראש: FEN, מט ב-N, השורה הראשית) ----------
  const PUZ = [
    ['4r1k1/p1r2pBp/3q2p1/3pp3/P5PQ/2b2N2/2P2P2/1n3K1R w - -', 1, 'h4h7'],
    ['4r2k/p4p1p/3R1p2/2p3P1/4PBqP/2P1n3/P5Q1/R5K1 b - -', 1, 'g4g2'],
    ['2k5/p7/1p6/1Pqbp1Bp/P1p3P1/1nPP2p1/5R2/R2Q2K1 b - -', 1, 'c5f2'],
    ['k2r3r/ppp2p2/2N5/7p/P6p/8/1PP1nPPP/R1BR3K b - -', 1, 'd8d1'],
    ['r1bn1k1r/1p2p2p/2p2p1b/p1P5/P1B1P3/2N2p1q/1P5P/1K1R2R1 w - -', 1, 'd1d8'],
    ['3R4/1p3p1k/2p2Bp1/5B1p/b3PP1P/P3K3/1b4r1/8 w - -', 1, 'd8h8'],
    ['rk6/1p4R1/1N1bbB2/p1p4p/2p3PN/1P1q3P/P5B1/6K1 w - -', 1, 'g7b7'],
    ['3q2r1/5pk1/1pbp4/5rPQ/3p3P/R5K1/PP6/8 w - -', 1, 'h5h6'],
    ['7k/ppp4p/7P/1bK3pR/8/P2r4/1r6/R7 b - -', 1, 'b7b6'],
    ['r4rk1/5p2/p2b1B2/1pp2Q1P/6N1/3P4/PP6/2K5 w - -', 1, 'g4h6'],
    ['8/3K2R1/4Nk2/p7/p5P1/P3B3/8/8 w - -', 1, 'e3d4'],
    ['5rk1/2R1pp1p/6p1/4n3/2P5/5QPq/5B2/6K1 b - -', 1, 'e5f3'],
    ['4Q3/p5k1/P5n1/4N2K/3P1q2/7P/8/6R1 b - -', 1, 'f4h4'],
    ['7r/7p/8/p2PpQqk/7P/6P1/3r1nB1/5RK1 w - -', 1, 'f5g5'],
    ['3rnr2/pb2kp1p/1p5Q/2ppqB2/6P1/2P4P/PPN2P2/3RR1K1 w - -', 1, 'e1e5'],
    ['7k/p4Q2/1p3bpp/1P3p2/P3PR2/6KP/1B2r1P1/4r3 w - -', 1, 'b2f6'],
    ['r1b1r3/1p1nbppp/3k4/p7/2QP3n/2P5/PP1NB2P/R4RK1 w - -', 1, 'd2e4'],
    ['6nr/1k5p/2p3pb/p7/P1B1q3/1Pp4P/5P1P/R2K3R b - -', 1, 'c3c2'],
    ['5k2/Q4pb1/2p1p1p1/2P1Pb2/5B2/1P5r/P2RK2P/N5q1 b - -', 1, 'f5g4'],
    ['1R2q2r/R7/R2r4/2kNQpb1/7p/3P3P/1PP2K2/8 w - -', 1, 'b2b4'],
    ['R5K1/P4r2/8/4nk2/4n3/8/8/8 b - -', 2, 'e4f6 g8h8 e5g6'],
    ['6Q1/3k1p2/4p2P/n4b2/3B4/8/2r5/K7 b - -', 2, 'a5b3 a1b1 c2h2'],
    ['r4r2/5p1k/p2b1B2/1pp4P/6N1/3P4/PP6/2K2Q2 w - -', 2, 'f1f5 h7g8 g4h6'],
    ['6k1/1p3p2/2p2Bp1/5B1p/b3PP1P/P3K3/1b4r1/3R4 w - -', 2, 'd1d8 g8h7 d8h8'],
    ['8/7k/1p6/1P6/5qp1/pB2R2p/P1N5/7K b - -', 2, 'f4f1 h1h2 f1g2'],
    ['8/5r2/1p1Bb2k/p1P1P2p/PP2K3/3r4/8/8 b - -', 2, 'e6f5 e4f4 f5g6'],
    ['1r3k1r/1q1n2pp/p1p5/8/N2P2P1/P1B5/K4PPN/2R4R b - -', 2, 'b7b3 a2a1 b3a3'],
    ['7r/3Q3p/7q/p2Pp2k/7P/6P1/3r1nB1/5RK1 w - -', 2, 'd7f5 h6g5 f5g5'],
    ['2rk2r1/2p1n3/2nq4/1pP2Rp1/1P1pP1Bp/1Q1P4/3B3P/1N3RK1 w - -', 2, 'f5f8 g8f8 f1f8'],
    ['7k/ppp4p/7P/1b4pR/1K6/P2r4/4r3/R7 b - -', 2, 'e2b2 b4c5 b7b6'],
    ['r1k5/1p4R1/3bbB2/p1pN3p/2p3PN/1P1q3P/P5B1/6K1 w - -', 2, 'd5b6 c8b8 g7b7'],
    ['5k2/Q4pb1/2p1p1p1/2P1Pb2/3q1B2/1P5r/P2R3P/N2K4 b - -', 2, 'd4g1 d1e2 f5g4'],
    ['4kr2/7p/3Qp3/2p5/8/P3qb1P/1PR1N1r1/4K2R b K -', 2, 'g2e2 e1d1 e2e1'],
    ['k3r2r/1bpnq1p1/1PQ2p2/3pP3/1P1P3p/4PN2/5NPP/1R3RK1 w - -', 2, 'b1a1 a8b8 c6c7'],
    ['4Q3/p5k1/P5n1/4N3/3P2K1/4q2P/8/6R1 b - -', 2, 'e3f4 g4h5 f4h4'],
    ['3k4/1p3Q2/p6p/8/5P2/P7/5Bqp/4K3 w - -', 2, 'f2b6 d8c8 f7c7'],
    ['r1b1r2k/p2p1Qpp/2p5/2n1q3/4n3/1P2P1P1/2PP2BP/R1B2RK1 w - -', 2, 'f7f8 e8f8 f1f8'],
    ['5Q2/2P4r/bp2P1k1/3P2bp/1P5n/2B2BpP/2K5/7R w - -', 2, 'f3e4 h4f5 e4f5'],
    ['r1b1r3/1p1nbppp/8/p2k4/Q2P3n/2P5/PP1NB2P/R4RK1 w - -', 2, 'a4c4 d5d6 d2e4'],
    ['3rnr2/pbq1kp1p/1p5Q/2pp4/4B1P1/2P4P/PPN2P2/3RR1K1 w - -', 2, 'e4f5 c7e5 e1e5'],
    ['5k2/1b5p/p4qp1/3B2P1/2pR4/5Q2/1pP4P/6K1 w - -', 3, 'f3f6 f8e8 f6f7 e8d8 d5b7'],
    ['4r3/6pk/1p5p/2qP1p2/p1n2N1P/P4P2/1P2R2K/1Q6 w - -', 3, 'b1f5 g7g6 f5f7 h7h8 f4g6'],
    ['8/k3nr2/2b5/p7/P2p1PPp/4p2P/1r3n2/1N2KBR1 b - -', 3, 'b2b1 e1e2 e7g6 f4f5 g6f4'],
    ['6r1/3P3p/pr6/k1p2p2/8/5N1P/P2R1PPB/6K1 b - -', 3, 'b6b1 d2d1 b1d1 f3e1 d1e1'],
    ['7k/ppp4p/3r3P/1b4pR/8/P1K5/4r3/R7 b - -', 3, 'd6d3 c3b4 e2b2 b4c5 b7b6'],
    ['r4r2/5p2/p2b1Bk1/1pp5/6NP/3P4/PP6/2K2Q2 w - -', 3, 'h4h5 g6h7 f1f5 h7g8 g4h6'],
    ['rnb1rk2/2R5/p3P1p1/1p3pNp/1P5P/p3P1P1/6B1/6K1 w - -', 3, 'g5h7 f8g8 h7f6 g8f8 c7f7'],
    ['r5k1/p1p4p/1p1qn1p1/1N1pRp2/P2N3P/3P1b2/1PP2b1K/R1Q5 b - -', 3, 'd6e5 c1f4 e5f4 h2h3 f4h4'],
    ['k3r2r/2pnq1p1/bP3p2/3pP3/1P1P3p/4PN2/2Q2NPP/1R3RK1 w - -', 3, 'c2c6 a6b7 b1a1 a8b8 c6c7'],
    ['rn3kr1/8/1p6/2Np2Pp/P2P3P/1qP2P1Q/1P3K2/3bR3 w - -', 3, 'h3f5 f8g7 f5f6 g7h7 f6h6'],
    ['r7/ppp2kp1/6r1/2b2n2/3P1P2/2P2Q1q/PP5p/RNB2R1K b - -', 3, 'f5g3 f3g3 g6g3 d4d5 h3g2'],
    ['3rnr2/pbq2p1p/1p3k2/2pp4/4B1P1/2P4P/PPNQ1P2/3RR1K1 w - -', 3, 'd2h6 f6e7 e4f5 c7e5 e1e5'],
    ['4k3/1P6/2n2QpP/P2P1p2/2p3q1/8/3P1P2/5B1K w - -', 3, 'f6c6 e8f8 b7b8q f8f7 b8e8'],
    ['3k1b2/1Q3p2/1n4r1/2N4p/2qN2p1/2Bp4/5PPP/4R1K1 w - -', 3, 'b7b8 b6c8 c3a5 g6b6 a5b6'],
    ['5knr/p6p/1pp2q2/5b2/P2r4/N1K1p3/1P2B2P/R3Q1R1 b - -', 3, 'd4d2 c3b3 f6b2 b3c4 f5e6'],
    ['8/8/8/1k6/2p1n1P1/1pP1r3/8/2K5 b - -', 3, 'e3e2 c1b1 e4c3 b1a1 b3b2'],
    ['5kN1/8/p3r3/8/7p/6RP/1r6/5K2 b - -', 3, 'h4g3 g8e7 b2f2 f1g1 e6e1'],
    ['8/8/5RQ1/p1P4p/P6k/2P2qn1/8/6K1 w - -', 3, 'f6f3 g3f1 g6f6 h4g4 f6f4'],
    ['8/8/6Pp/8/3k1p1P/8/2K1p3/6rB b - -', 3, 'g1a1 c2b2 e2e1q b2c2 e1c3'],
    ['5Q2/4r2k/2n1P3/2p2Pp1/Pn6/6P1/4R3/5Kb1 w - -', 3, 'f1g1 e7e6 e2h2 e6h6 h2h6'],
  ];
  const NLEV = PUZ.length;

  // ---------- ציור הכלים (צורות מקוריות בקופסה 100×100) ----------
  const PLINTH = 'M24,91 L76,91 Q79,91 79,88 L79,86 Q79,81 73,80 L27,80 Q21,81 21,86 L21,88 Q21,91 24,91 Z';
  const SHAPES = {
    [PAWN]: [PLINTH, 'M30,80 Q33,66 42,55 L58,55 Q67,66 70,80 Z', 'M36,55 A14,4.5 0 1 0 64,55 A14,4.5 0 1 0 36,55 Z', 'M63,39 A13,13 0 1 0 37,39 A13,13 0 1 0 63,39 Z'],
    [ROOK]: [PLINTH, 'M28,80 L28,74 Q28,72 30,72 L70,72 Q72,72 72,74 L72,80 Z', 'M34,72 L37,40 L63,40 L66,72 Z', 'M30,40 L30,35 L70,35 L70,40 Z', 'M29,35 L29,17 L38,17 L38,24 L45.5,24 L45.5,17 L54.5,17 L54.5,24 L62,24 L62,17 L71,17 L71,35 Z'],
    [KNIGHT]: [PLINTH, 'M30,80 C29,68 35,59 43,52 C38,50 31,51 26,52 C21,52 17,48 18,43 C19,37 26,32 31,28 C35,23 38,19 41,16 L44,7 L50,15 C63,16 73,26 75,41 C77,55 72,67 72,80 Z'],
    [BISHOP]: [PLINTH, 'M32,80 Q37,64 43,52 L57,52 Q63,64 68,80 Z', 'M35,52 A15,4.5 0 1 0 65,52 A15,4.5 0 1 0 35,52 Z', 'M50,14 C65,25 67,38 59,48 L41,48 C33,38 35,25 50,14 Z', 'M55,10 A5,5 0 1 0 45,10 A5,5 0 1 0 55,10 Z'],
    [QUEEN]: [PLINTH, 'M30,80 Q36,61 40,45 L60,45 Q64,61 70,80 Z', 'M35,45 A15,4.5 0 1 0 65,45 A15,4.5 0 1 0 35,45 Z', 'M37,43 L27,21 L37,32 L39,14 L46,29 L50,10 L54,29 L61,14 L63,32 L73,21 L63,43 Z'],
    [KING]: [PLINTH, 'M30,80 Q36,61 40,47 L60,47 Q64,61 70,80 Z', 'M35,47 A15,4.5 0 1 0 65,47 A15,4.5 0 1 0 35,47 Z', 'M38,45 C29,36 31,25 41,25 C45,25 48,28 50,31 C52,28 55,25 59,25 C69,25 71,36 62,45 Z', 'M47,26 L47,18 L42,18 L42,12 L47,12 L47,6 L53,6 L53,12 L58,12 L58,18 L53,18 L53,26 Z'],
  };
  const BALLS = { [QUEEN]: [[27, 21], [39, 14], [50, 10], [61, 14], [73, 21]] };
  let PATHS = null;
  const paths = () => PATHS || (PATHS = Object.fromEntries(Object.entries(SHAPES).map(([k, a]) => [k, a.map(s => new Path2D(s))])));
  function drawPiece(ctx, p, x, y, size, o) {
    if (!p) return;
    const t = p & 7, black = p >> 3, k = size / 100;
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(k, k);
    if (o && o.alpha != null) ctx.globalAlpha *= o.alpha;
    // צל רך מתחת לכלי
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(50, 91, 31, 5, 0, 0, Math.PI * 2); ctx.fill();
    const gr = ctx.createLinearGradient(30, 10, 70, 92);
    if (black) { gr.addColorStop(0, '#6b7080'); gr.addColorStop(0.45, '#33363f'); gr.addColorStop(1, '#121318'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#f4ecdc'); gr.addColorStop(1, '#cdbb9b'); }
    ctx.fillStyle = gr;
    ctx.strokeStyle = black ? '#050608' : '#3a2c1c';
    ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
    for (const pa of paths()[t]) { ctx.fill(pa); ctx.stroke(pa); }
    if (BALLS[t]) for (const [bx, by] of BALLS[t]) { ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // פרטים: עין לפרש, חריץ לרץ, ברק קטן
    const det = black ? '#d9dce6' : '#3a2c1c';
    if (t === KNIGHT) {
      ctx.fillStyle = det; ctx.beginPath(); ctx.arc(39, 30, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(22.5, 45, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = det; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(53, 19); ctx.quadraticCurveTo(69, 31, 70, 52); ctx.stroke();
    } else if (t === BISHOP) {
      ctx.strokeStyle = det; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(56, 24); ctx.lineTo(47, 36); ctx.stroke();
    }
    ctx.strokeStyle = black ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(39, 77); ctx.quadraticCurveTo(41, 66, 45, 59); ctx.stroke();
    ctx.restore();
  }

  // ---------- פריסה ----------
  const W = 600, H = 700, BX = 20, BY = 20, SQ = 70;
  const LIGHT = '#eedcbc', DARK = '#b5875c';

  function sqXY(S, sq) {
    const f = sq & 7, r = sq >> 4;
    const col = S.flip ? 7 - f : f, row = S.flip ? r : 7 - r;
    return { x: BX + col * SQ, y: BY + row * SQ };
  }
  function xySq(S, x, y) {
    const col = Math.floor((x - BX) / SQ), row = Math.floor((y - BY) / SQ);
    if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
    const f = S.flip ? 7 - col : col, r = S.flip ? row : 7 - row;
    return r * 16 + f;
  }

  // ---------- טקסטים ----------
  const TEXT = {
    he: { title: 'חידות שחמט', tagline: '20 חידות של מט במסע אחד, 20 של מט ב-2 ו-20 של מט ב-3', help: ['מצא את המט! רק מסע פתיחה אחד מנצח', 'לחץ על כלי ואז על משבצת, או גרור אותו', 'כל טעות או רמז מורידים כוכב · H — רמז'], helpTouch: ['מצא את המט! רק מסע פתיחה אחד מנצח', 'גע בכלי ואז במשבצת, או גרור אותו', 'כל טעות או רמז מורידים כוכב'], mate1: 'מט במסע אחד', mate2: 'מט ב-2 מסעים', mate3: 'מט ב-3 מסעים', white: 'הלבן משחק', black: 'השחור משחק', hint: 'רמז', mistakes: 'טעויות', wrong: 'לא המסע הזה — נסה שוב', good: 'מסע טוב! המשך…', mate: 'שח-מט!', thinking: 'המחשב מתגונן…', pick: 'בחר כלי להכתרה', movesLeft: 'מסעים שנשארו' },
    en: { title: 'Chess Puzzles', tagline: '20 puzzles of mate in 1, 20 of mate in 2 and 20 of mate in 3', help: ['Find the checkmate! Only one first move wins', 'Click a piece, then a square — or drag it', 'Every mistake or hint costs a star · H — hint'], helpTouch: ['Find the checkmate! Only one first move wins', 'Tap a piece, then a square — or drag it', 'Every mistake or hint costs a star'], mate1: 'Mate in 1', mate2: 'Mate in 2', mate3: 'Mate in 3', white: 'White to move', black: 'Black to move', hint: 'Hint', mistakes: 'Mistakes', wrong: 'Not that move — try again', good: 'Good move! Keep going…', mate: 'Checkmate!', thinking: 'The computer defends…', pick: 'Choose a piece', movesLeft: 'Moves left' },
    ar: { title: 'ألغاز الشطرنج', tagline: '20 لغزاً لكش مات بنقلة، و20 بنقلتين و20 بثلاث نقلات', help: ['جد كش مات! نقلة أولى واحدة فقط تفوز', 'انقر على قطعة ثم على مربع، أو اسحبها', 'كل خطأ أو تلميح يكلّف نجمة · H — تلميح'], helpTouch: ['جد كش مات! نقلة أولى واحدة فقط تفوز', 'المس قطعة ثم مربعاً، أو اسحبها', 'كل خطأ أو تلميح يكلّف نجمة'], mate1: 'كش مات بنقلة', mate2: 'كش مات بنقلتين', mate3: 'كش مات بثلاث نقلات', white: 'دور الأبيض', black: 'دور الأسود', hint: 'تلميح', mistakes: 'الأخطاء', wrong: 'ليست هذه النقلة — حاول مجدداً', good: 'نقلة جيدة! تابع…', mate: 'كش مات!', thinking: 'الكمبيوتر يدافع…', pick: 'اختر قطعة للترقية', movesLeft: 'النقلات المتبقية' },
    es: { title: 'Problemas de Ajedrez', tagline: '20 problemas de mate en 1, 20 de mate en 2 y 20 de mate en 3', help: ['¡Encuentra el mate! Solo una primera jugada gana', 'Haz clic en una pieza y luego en una casilla, o arrástrala', 'Cada error o pista cuesta una estrella · H — pista'], helpTouch: ['¡Encuentra el mate! Solo una primera jugada gana', 'Toca una pieza y luego una casilla, o arrástrala', 'Cada error o pista cuesta una estrella'], mate1: 'Mate en 1', mate2: 'Mate en 2', mate3: 'Mate en 3', white: 'Juegan blancas', black: 'Juegan negras', hint: 'Pista', mistakes: 'Errores', wrong: 'Esa no es — inténtalo otra vez', good: '¡Buena jugada! Sigue…', mate: '¡Jaque mate!', thinking: 'La computadora se defiende…', pick: 'Elige una pieza', movesLeft: 'Jugadas restantes' },
    fr: { title: "Problèmes d'Échecs", tagline: '20 problèmes de mat en 1, 20 de mat en 2 et 20 de mat en 3', help: ['Trouve le mat ! Un seul premier coup gagne', 'Clique sur une pièce puis sur une case, ou fais-la glisser', 'Chaque erreur ou indice coûte une étoile · H — indice'], helpTouch: ['Trouve le mat ! Un seul premier coup gagne', 'Touche une pièce puis une case, ou fais-la glisser', 'Chaque erreur ou indice coûte une étoile'], mate1: 'Mat en 1', mate2: 'Mat en 2', mate3: 'Mat en 3', white: 'Les blancs jouent', black: 'Les noirs jouent', hint: 'Indice', mistakes: 'Erreurs', wrong: 'Pas ce coup — réessaie', good: 'Bon coup ! Continue…', mate: 'Échec et mat !', thinking: "L'ordinateur se défend…", pick: 'Choisis une pièce', movesLeft: 'Coups restants' },
    pt: { title: 'Problemas de Xadrez', tagline: '20 problemas de mate em 1, 20 de mate em 2 e 20 de mate em 3', help: ['Encontre o mate! Só um primeiro lance vence', 'Clique numa peça e depois numa casa, ou arraste-a', 'Cada erro ou dica custa uma estrela · H — dica'], helpTouch: ['Encontre o mate! Só um primeiro lance vence', 'Toque numa peça e depois numa casa, ou arraste-a', 'Cada erro ou dica custa uma estrela'], mate1: 'Mate em 1', mate2: 'Mate em 2', mate3: 'Mate em 3', white: 'Brancas jogam', black: 'Pretas jogam', hint: 'Dica', mistakes: 'Erros', wrong: 'Não é esse lance — tente de novo', good: 'Bom lance! Continue…', mate: 'Xeque-mate!', thinking: 'O computador se defende…', pick: 'Escolha uma peça', movesLeft: 'Lances restantes' },
    ru: { title: 'Шахматные задачи', tagline: '20 задач на мат в 1 ход, 20 — в 2 хода и 20 — в 3 хода', help: ['Найди мат! Выигрывает только один первый ход', 'Нажми на фигуру, потом на клетку — или перетащи её', 'Каждая ошибка или подсказка стоит звезды · H — подсказка'], helpTouch: ['Найди мат! Выигрывает только один первый ход', 'Коснись фигуры, потом клетки — или перетащи её', 'Каждая ошибка или подсказка стоит звезды'], mate1: 'Мат в 1 ход', mate2: 'Мат в 2 хода', mate3: 'Мат в 3 хода', white: 'Ход белых', black: 'Ход чёрных', hint: 'Подсказка', mistakes: 'Ошибки', wrong: 'Не этот ход — попробуй ещё', good: 'Хороший ход! Дальше…', mate: 'Мат!', thinking: 'Компьютер защищается…', pick: 'Выбери фигуру', movesLeft: 'Осталось ходов' },
    de: { title: 'Schachrätsel', tagline: '20 Rätsel mit Matt in 1, 20 mit Matt in 2 und 20 mit Matt in 3', help: ['Finde das Matt! Nur ein erster Zug gewinnt', 'Klicke eine Figur und dann ein Feld an – oder zieh sie', 'Jeder Fehler oder Tipp kostet einen Stern · H — Tipp'], helpTouch: ['Finde das Matt! Nur ein erster Zug gewinnt', 'Tippe eine Figur und dann ein Feld an – oder zieh sie', 'Jeder Fehler oder Tipp kostet einen Stern'], mate1: 'Matt in 1', mate2: 'Matt in 2', mate3: 'Matt in 3', white: 'Weiß am Zug', black: 'Schwarz am Zug', hint: 'Tipp', mistakes: 'Fehler', wrong: 'Nicht dieser Zug – versuch es nochmal', good: 'Guter Zug! Weiter…', mate: 'Schachmatt!', thinking: 'Der Computer verteidigt sich…', pick: 'Wähle eine Figur', movesLeft: 'Züge übrig' },
  };

  // ---------- מצב החידה ----------
  function loadPuzzle(g) {
    const n = Math.max(1, Math.min(NLEV, g.level || 1));
    const [fen, N, line] = PUZ[n - 1];
    const P = fromFen(fen);
    const S = g.s = {
      n, N, P, line: line.split(' '), ply: 0, onLine: true, me: P.turn, flip: P.turn === 1,
      left: N, mistakes: 0, hintLv: 0, hintMove: null,
      sel: -1, dots: [], drag: null, down: null, promo: null,
      last: null, anim: null, busy: false, solved: false, msg: null, flashSq: null, mateAt: -1,
      hoverBtn: false, btn: { x: 0, y: 0, w: 0, h: 0 },
    };
    return S;
  }

  function setMsg(g, key, color, ms) { g.s.msg = { key, color, until: ms ? g.time + ms / 1000 : 0 }; }

  // מסע של השחקן (מהעכבר, מהמגע או מהבוט)
  function playerMove(g, m, noAnim) {
    const S = g.s, P = S.P;
    S.sel = -1; S.dots = []; S.busy = true; S.hintLv = 0; S.hintMove = null;
    // נכון? בצעד הראשון רק המסע של החידה; אחר כך כל מסע ששומר על מט בזמן
    let ok;
    const before = S.last;
    make(P, m);
    if (S.ply === 0) ok = uci(m) === S.line[0];
    else ok = forcedAfter(P, S.left);
    unmake(P, m);
    animateMove(g, m, noAnim ? 1 : 10);
    make(P, m);
    S.last = { f: m.f, t: m.t };
    if (!ok) {
      S.mistakes++;
      g.sfx('error');
      g.shake(5);
      S.flashSq = { sq: m.t, until: g.time + 0.9, bad: true };
      setMsg(g, 'wrong', '#ff8a8a', 1800);
      g.after(0.6, () => {
        unmake(P, m);
        S.last = before;
        animateMove(g, { f: m.t, t: m.f, p: m.pr || m.p, back: m }, 10);
        g.after(0.2, () => { S.busy = false; });
      });
      return;
    }
    if (m.c) g.sfx('hit', { p: 1.2 }); else g.sfx('place');
    const usedLine = S.onLine && uci(m) === S.line[S.ply];
    if (!usedLine) S.onLine = false;
    S.ply++;
    S.left--;
    if (isMate(P)) { win(g); return; }
    S.flashSq = { sq: m.t, until: g.time + 0.6, bad: false };
    setMsg(g, 'good', '#8df58d', 1500);
    g.after(0.5, () => defend(g));
  }

  // ההגנה: בשורה הראשית — התשובה השמורה (ההגנה הכי טובה לפי Stockfish).
  // אם השחקן מצא מסע אחר שגם מנצח, מחפשים את התשובה שדוחה את המט הכי הרבה (אז נשאר רק מסע אחד, אז החיפוש קל)
  function defend(g) {
    const S = g.s, P = S.P;
    if (!S || S.solved || g.state !== 'play') return;
    let best = S.onLine ? findUci(P, S.line[S.ply]) : null;
    if (!best) {
      S.onLine = false;
      let bestD = -1, bestTie = -1;
      for (const r of legal(P)) {
        make(P, r);
        const d = mateDist(P, Math.min(S.left, 2)) || 99;
        unmake(P, r);
        const tie = (r.c & 7) * 10 + Math.random();
        if (d > bestD || (d === bestD && tie > bestTie)) { bestD = d; bestTie = tie; best = r; }
      }
    }
    if (!best) return;
    S.ply++;
    animateMove(g, best, 12);
    make(P, best);
    S.last = { f: best.f, t: best.t };
    g.sfx(best.c ? 'hit' : 'move', { p: 0.8 });
    g.after(0.25, () => { S.busy = false; });
  }

  function win(g) {
    const S = g.s;
    S.solved = true; S.busy = true;
    S.mateAt = S.P.kings[S.P.turn];
    const k = sqXY(S, S.mateAt);
    g.after(0.18, () => {
      g.burst(k.x + SQ / 2, k.y + SQ / 2, { n: 46, color: ['#ffd166', '#fff3c4', '#ff6b6b', '#7be0ff'], speed: 6, life: 60, size: 6 });
      g.shake(6);
      g.flash('#fff3c4', 0.2);
      g.sfx('power');
    });
    setMsg(g, 'mate', '#ffd166', 0);
    const stars = S.mistakes === 0 ? 3 : S.mistakes === 1 ? 2 : 1;
    g.after(1.5, () => g.completeLevel(stars, { text: g.t('mistakes') + ': ' + S.mistakes }));
  }

  // אנימציה של מסע: הכלי מחליק, כלי שנאכל דוהה, ובהצרחה גם הצריח זז.
  // m.back = מסע שגוי שחוזר אחורה (הכלי שנאכל מופיע שוב)
  function animateMove(g, m, dur) {
    const S = g.s, bm = m.back || m, back = !!m.back;
    const a = { t0: g.frame, dur, movers: [{ p: m.p, from: m.f, to: m.t }], hide: [m.t], fade: [] };
    if (bm.c) a.fade.push({ sq: bm.k === 2 ? bm.t + (bm.p >> 3 ? 16 : -16) : bm.t, p: bm.c, dir: back ? 1 : -1 });
    if (bm.k === 3 || bm.k === 4) {
      const rf = bm.k === 3 ? bm.t + 1 : bm.t - 2, rt = bm.k === 3 ? bm.t - 1 : bm.t + 1;
      const from = back ? rt : rf, to = back ? rf : rt;
      a.movers.push({ p: ROOK | (bm.p & 8), from, to }); a.hide.push(to);
    }
    S.anim = a;
  }

  function clickSq(g, sq) {
    const S = g.s, P = S.P;
    if (S.busy || S.solved || sq < 0) return;
    if (S.sel >= 0) {
      const cands = S.dots.filter(m => m.t === sq);
      if (cands.length) { choose(g, cands); return; }
    }
    const p = P.b[sq];
    if (p && (p >> 3) === S.me && sq !== S.sel) select(g, sq);
    else { S.sel = -1; S.dots = []; }
  }
  function select(g, sq) {
    const S = g.s;
    S.sel = sq;
    S.dots = legal(S.P).filter(m => m.f === sq);
    g.sfx('click');
  }
  function choose(g, cands) {
    const S = g.s;
    if (cands.length > 1 && cands[0].pr) { S.promo = { cands, t: cands[0].t }; g.sfx('pop'); return; }
    playerMove(g, cands[0], !!S.dropped);
  }

  // בחירת כלי בהכתרה: ארבעה כלים בעמודה של המשבצת
  function promoBoxes(S) {
    const { x, y } = sqXY(S, S.promo.t);
    const down = y < BY + SQ * 4;
    return [QUEEN, KNIGHT, ROOK, BISHOP].map((t, i) => ({ t, x, y: down ? y + i * SQ : y - i * SQ }));
  }

  function hint(g) {
    const S = g.s, P = S.P;
    if (S.busy || S.solved) return;
    let m = null;
    if (S.onLine) m = findUci(P, S.line[S.ply]);
    if (!m) m = mateIn(P, S.left);
    if (!m) return;
    S.mistakes++;
    S.hintMove = m;
    S.hintLv = Math.min(2, S.hintLv + 1);
    if (S.hintLv === 1) select(g, m.f);
    g.sfx('power', { p: 0.8 });
    g.float(sqXY(S, m.f).x + SQ / 2, sqXY(S, m.f).y + 8, '💡', { size: 26 });
  }

  // ----- ציור -----
  function drawBg(g, ctx) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#1d2340'); gr.addColorStop(1, '#0d1024');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, BY + SQ * 4, 60, W / 2, BY + SQ * 4, 420);
    rg.addColorStop(0, 'rgba(120,140,255,.18)'); rg.addColorStop(1, 'rgba(120,140,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  function drawBoard(g, ctx, S) {
    // מסגרת עץ
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    g.rr(ctx, BX - 11, BY - 11, SQ * 8 + 22, SQ * 8 + 22, 14);
    const fr = ctx.createLinearGradient(0, BY - 11, 0, BY + SQ * 8 + 11);
    fr.addColorStop(0, '#7a4a28'); fr.addColorStop(1, '#4a2a14');
    ctx.fillStyle = fr; ctx.fill();
    ctx.restore();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? DARK : LIGHT;
      ctx.fillRect(BX + c * SQ, BY + r * SQ, SQ, SQ);
    }
    // ברק עדין על הלוח
    const sh = ctx.createLinearGradient(BX, BY, BX + SQ * 8, BY + SQ * 8);
    sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.10)');
    ctx.fillStyle = sh; ctx.fillRect(BX, BY, SQ * 8, SQ * 8);
    // אותיות ומספרים בפינות
    for (let i = 0; i < 8; i++) {
      const file = S.flip ? 7 - i : i, rank = S.flip ? i + 1 : 8 - i;
      g.text(ctx, String.fromCharCode(97 + file), BX + i * SQ + SQ - 7, BY + SQ * 8 - 10, { size: 14, weight: 800, color: (7 + i) % 2 ? LIGHT : DARK, align: 'right' });
      g.text(ctx, String(rank), BX + 6, BY + i * SQ + 12, { size: 14, weight: 800, color: i % 2 ? LIGHT : DARK, align: 'left' });
    }
  }
  function tint(ctx, S, sq, col) { const { x, y } = sqXY(S, sq); ctx.fillStyle = col; ctx.fillRect(x, y, SQ, SQ); }

  function drawArrow(ctx, S, f, t, col) {
    const a = sqXY(S, f), b = sqXY(S, t);
    const x1 = a.x + SQ / 2, y1 = a.y + SQ / 2, x2 = b.x + SQ / 2, y2 = b.y + SQ / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1) - SQ * 0.18;
    ctx.save();
    ctx.translate(x1, y1); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(SQ * 0.15, -SQ * 0.09); ctx.lineTo(len - SQ * 0.3, -SQ * 0.09); ctx.lineTo(len - SQ * 0.3, -SQ * 0.22);
    ctx.lineTo(len, 0); ctx.lineTo(len - SQ * 0.3, SQ * 0.22); ctx.lineTo(len - SQ * 0.3, SQ * 0.09); ctx.lineTo(SQ * 0.15, SQ * 0.09);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawStrip(g, ctx, S) {
    const y0 = BY + SQ * 8 + 22, h = H - y0 - 12;
    g.rr(ctx, 12, y0, W - 24, h, 16);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    const rtl = g.rtl;
    // כפתור הרמז
    const bw = 132, bh = 50, bx = rtl ? 26 : W - 26 - bw, by = y0 + (h - bh) / 2;
    S.btn = { x: bx, y: by, w: bw, h: bh };
    const can = !S.busy && !S.solved;
    ctx.save();
    ctx.globalAlpha = can ? 1 : 0.45;
    g.rr(ctx, bx, by + 3, bw, bh, 14); ctx.fillStyle = '#a8761a'; ctx.fill();
    g.rr(ctx, bx, by, bw, bh, 14);
    const bg = ctx.createLinearGradient(0, by, 0, by + bh);
    bg.addColorStop(0, S.hoverBtn && can ? '#ffe28a' : '#ffd166'); bg.addColorStop(1, '#f0a92c');
    ctx.fillStyle = bg; ctx.fill();
    // נורה קטנה
    const lx = bx + 28, ly = by + bh / 2 - 3;
    ctx.fillStyle = '#fff8d6'; ctx.beginPath(); ctx.arc(lx, ly, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3d06'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5a3d06'; ctx.fillRect(lx - 5, ly + 9, 10, 6);
    g.text(ctx, g.t('hint'), bx + 28 + (bw - 28) / 2, by + bh / 2 + 1, { size: 21, weight: 900, color: '#3b2604', maxW: bw - 52 });
    ctx.restore();
    // שורת מצב
    const tx = rtl ? W - 30 : 30, align = rtl ? 'right' : 'left';
    const side = S.me ? 'black' : 'white';
    const discX = rtl ? tx - 11 : tx + 11, tx2 = rtl ? tx - 30 : tx + 30;
    g.circle(ctx, discX, y0 + 28, 17);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
    drawPiece(ctx, KING | (S.me << 3), discX, y0 + 27, 32);
    g.text(ctx, g.t(side), tx2, y0 + 31, { size: 22, weight: 900, color: '#fff', align, maxW: W - 260 });
    const m = S.msg && (!S.msg.until || g.time < S.msg.until) ? S.msg : null;
    const line2 = m ? g.t(m.key) : S.busy && !S.solved && S.ply % 2 === 1 ? g.t('thinking') : g.t('mate' + S.N);
    g.text(ctx, line2, tx, y0 + 64, { size: 18, weight: 800, color: m ? m.color : '#9fb0ff', align, maxW: W - 230 });
    // נקודות: כמה מסעים נשארו
    const dx = rtl ? 26 + bw + 22 : W - 26 - bw - 22;
    for (let i = 0; i < S.N; i++) {
      const cx = rtl ? dx + i * 22 + 8 : dx - i * 22 - 8;
      g.circle(ctx, cx, y0 + 64, 7);
      ctx.fillStyle = i < S.N - S.left ? '#7be07b' : 'rgba(255,255,255,.16)'; ctx.fill();
    }
  }

  GK.register('chess-puzzles', {
    w: W, h: H, bg: '#14182e', accent: '#ffd166',
    levels: NLEV,
    noBest: true,
    text: TEXT,

    init(g) { loadPuzzle(g); },

    step(g) {
      const S = g.s;
      if (S.anim && g.frame - S.anim.t0 >= S.anim.dur) S.anim = null;
      if (g.hit('KeyH')) hint(g);
      g.hud([[g.t('level'), S.n], ['', g.t('mate' + S.N)], [g.t('mistakes'), S.mistakes, S.mistakes ? '#ff9a7a' : null]]);
    },

    bot(g) {
      const S = g.s;
      if (!S || S.busy || S.solved || S.promo || (g.frame % 20)) return;
      // לפעמים טעות בכוונה (כדי לבדוק את הביטול), אחרת המסע הנכון
      const P = S.P;
      let m = null;
      if (S.mistakes === 0 && S.n % 4 === 0 && S.ply === 0) {
        m = legal(P).find(x => uci(x) !== S.line[0]);
      } else {
        if (S.onLine) m = findUci(P, S.line[S.ply]);
        if (!m) m = mateIn(P, S.left);
      }
      if (!m) return;
      clickSq(g, m.f);
      const c = S.dots.filter(x => x.t === m.t && (x.pr || 0) === (m.pr || 0));
      if (c.length) playerMove(g, c[0]);
    },

    onKey(g, e) {
      const S = g.s;
      if (e.code === 'Escape' && S.promo) S.promo = null;
    },

    onPointer(g, type, p) {
      const S = g.s;
      if (!S) return;
      if (type === 'move') {
        const b = S.btn;
        S.hoverBtn = p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
        if (S.down && !S.drag && Math.hypot(p.x - S.down.x, p.y - S.down.y) > 7 && S.sel === S.down.sq) S.drag = { sq: S.down.sq, x: p.x, y: p.y };
        if (S.drag) { S.drag.x = p.x; S.drag.y = p.y; }
        const sq = xySq(S, p.x, p.y);
        const own = sq >= 0 && S.P.b[sq] && (S.P.b[sq] >> 3) === S.me && !S.busy && !S.solved;
        g.canvas.style.cursor = S.drag ? 'grabbing' : S.hoverBtn || own || (S.sel >= 0 && S.dots.some(m => m.t === sq)) ? 'pointer' : 'default';
        return;
      }
      if (type === 'down') {
        if (S.promo) {
          const box = promoBoxes(S).find(b => p.x >= b.x && p.x < b.x + SQ && p.y >= b.y && p.y < b.y + SQ);
          const pr = S.promo; S.promo = null;
          if (box) { const m = pr.cands.find(c => (c.pr & 7) === box.t); if (m) playerMove(g, m, !!S.dropped); }
          S.dropped = false;
          return;
        }
        const b = S.btn;
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { hint(g); return; }
        const sq = xySq(S, p.x, p.y);
        const wasSel = S.sel;
        S.dropped = false;
        clickSq(g, sq);
        S.down = { x: p.x, y: p.y, sq, wasSel };
        return;
      }
      if (type === 'up') {
        const d = S.down;
        S.down = null;
        if (S.drag) {
          const from = S.drag.sq, sq = xySq(S, p.x, p.y);
          S.drag = null;
          g.canvas.style.cursor = 'default';
          if (sq >= 0 && sq !== from && S.sel === from) {
            const cands = S.dots.filter(m => m.t === sq);
            if (cands.length) { S.dropped = true; choose(g, cands); if (!S.promo) S.dropped = false; return; }
          }
          return;
        }
        // לחיצה על הכלי שכבר נבחר מבטלת את הבחירה
        if (d && d.sq === d.wasSel && d.sq >= 0 && S.sel === d.sq) { S.sel = -1; S.dots = []; }
      }
    },

    draw(g, ctx, alpha) {
      const S = g.s, P = S.P, t = g.frame / 60;
      drawBg(g, ctx);
      drawBoard(g, ctx, S);
      if (S.last) { tint(ctx, S, S.last.f, 'rgba(255,214,64,.38)'); tint(ctx, S, S.last.t, 'rgba(255,214,64,.48)'); }
      if (S.sel >= 0) tint(ctx, S, S.sel, 'rgba(90,210,120,.55)');
      if (S.flashSq && g.time < S.flashSq.until) {
        const k = (S.flashSq.until - g.time) / 0.9;
        tint(ctx, S, S.flashSq.sq, S.flashSq.bad ? `rgba(255,70,70,${0.6 * k})` : `rgba(90,230,120,${0.55 * k})`);
      }
      // מלך בשח
      const kc = P.kings[P.turn];
      if (inCheck(P) || S.mateAt >= 0) {
        const { x, y } = sqXY(S, kc);
        const rg = ctx.createRadialGradient(x + SQ / 2, y + SQ / 2, 4, x + SQ / 2, y + SQ / 2, SQ * 0.62);
        const pul = S.mateAt >= 0 ? 0.95 : 0.75 + Math.sin(t * 6) * 0.15;
        rg.addColorStop(0, `rgba(255,40,40,${pul})`); rg.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = rg; ctx.fillRect(x, y, SQ, SQ);
      }
      // רמז
      if (S.hintMove && S.hintLv >= 1 && !S.busy) {
        const { x, y } = sqXY(S, S.hintMove.f);
        ctx.strokeStyle = `rgba(255,209,102,${0.65 + Math.sin(t * 7) * 0.3})`; ctx.lineWidth = 5;
        g.rr(ctx, x + 3, y + 3, SQ - 6, SQ - 6, 8); ctx.stroke();
      }
      // הכלים
      const a = S.anim;
      const prog = a ? g.ease.inOut(Math.min(1, (g.frame - a.t0 + alpha) / a.dur)) : 1;
      const hidden = new Set(a ? a.hide : []);
      if (S.drag) hidden.add(S.drag.sq);
      for (let sq = 0; sq < 128; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = P.b[sq];
        if (!p || hidden.has(sq)) continue;
        const { x, y } = sqXY(S, sq);
        drawPiece(ctx, p, x + SQ / 2, y + SQ / 2, SQ * 0.92);
      }
      if (a) {
        for (const f of a.fade) {
          const { x, y } = sqXY(S, f.sq);
          const al = f.dir < 0 ? 1 - Math.max(0, (prog - 0.6) / 0.4) : prog;
          if (al > 0.01) drawPiece(ctx, f.p, x + SQ / 2, y + SQ / 2, SQ * 0.92, { alpha: al });
        }
      }
      // נקודות של מסעים חוקיים
      if (S.sel >= 0 && !S.busy) {
        const seen = new Set();
        for (const m of S.dots) {
          if (seen.has(m.t)) continue;
          seen.add(m.t);
          const { x, y } = sqXY(S, m.t);
          if (P.b[m.t] || m.k === 2) {
            ctx.strokeStyle = 'rgba(20,40,20,.42)'; ctx.lineWidth = 6;
            g.circle(ctx, x + SQ / 2, y + SQ / 2, SQ * 0.44); ctx.stroke();
          } else {
            g.circle(ctx, x + SQ / 2, y + SQ / 2, SQ * 0.15); ctx.fillStyle = 'rgba(20,40,20,.36)'; ctx.fill();
          }
        }
      }
      if (S.hintMove && S.hintLv >= 2 && !S.busy) drawArrow(ctx, S, S.hintMove.f, S.hintMove.t, 'rgba(255,190,60,.78)');
      if (a) for (const mo of a.movers) {
        const p1 = sqXY(S, mo.from), p2 = sqXY(S, mo.to);
        const x = p1.x + (p2.x - p1.x) * prog, y = p1.y + (p2.y - p1.y) * prog;
        const lift = Math.sin(prog * Math.PI) * 0.08;
        drawPiece(ctx, mo.p, x + SQ / 2, y + SQ / 2, SQ * (0.92 + lift));
      }
      if (S.drag) drawPiece(ctx, P.b[S.drag.sq], S.drag.x, S.drag.y - 6, SQ * 1.05);
      if (S.mateAt >= 0) {
        const { x, y } = sqXY(S, S.mateAt);
        g.text(ctx, '#', x + SQ - 12, y + 14, { size: 22, weight: 900, color: '#fff', stroke: '#c0392b', strokeW: 5 });
      }
      // בחירת כלי בהכתרה
      if (S.promo) {
        ctx.fillStyle = 'rgba(8,10,20,.55)'; ctx.fillRect(BX, BY, SQ * 8, SQ * 8);
        for (const b of promoBoxes(S)) {
          g.rr(ctx, b.x + 3, b.y + 3, SQ - 6, SQ - 6, 12);
          ctx.fillStyle = '#f7f1e3'; ctx.fill();
          ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke();
          drawPiece(ctx, b.t | (S.me << 3), b.x + SQ / 2, b.y + SQ / 2, SQ * 0.86);
        }
        g.text(ctx, g.t('pick'), W / 2, BY + 22, { size: 18, color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
      }
      if (S.mateAt >= 0) {
        const k = Math.min(1, (g.time - (S.mateT || (S.mateT = g.time))) * 3);
        g.text(ctx, g.t('mate'), W / 2, BY + SQ * 4, { size: 64 * g.ease.back(k), weight: 900, color: '#ffd166', stroke: '#3b2604', strokeW: 9, alpha: k });
      }
      drawStrip(g, ctx, S);
    },

    destroy(g) { try { g.canvas.style.cursor = ''; } catch (e) {} },

    cover(ctx, w, h, k) {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#26306a'); bg.addColorStop(1, '#0d1024');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const sq = 92, ox = 120, oy = -40;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(-0.12); ctx.translate(-w / 2, -h / 2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      k.rr(ctx, ox - 14, oy - 14, sq * 8 + 28, sq * 8 + 28, 18); ctx.fillStyle = '#5c3519'; ctx.fill();
      ctx.shadowColor = 'transparent';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? DARK : LIGHT; ctx.fillRect(ox + c * sq, oy + r * sq, sq, sq); }
      const at = (c, r) => [ox + c * sq + sq / 2, oy + r * sq + sq / 2];
      // מט אמיתי: המלכה עולה ל-g7 ליד המלך ב-h7, והרץ מגן עליה מהאלכסון הארוך
      const [kx, ky] = at(7, 1);
      const rg = ctx.createRadialGradient(kx, ky, 6, kx, ky, sq * 0.8);
      rg.addColorStop(0, 'rgba(255,40,40,.95)'); rg.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = rg; ctx.fillRect(kx - sq, ky - sq, sq * 2, sq * 2);
      ctx.fillStyle = 'rgba(255,214,64,.5)'; ctx.fillRect(ox + 6 * sq, oy + 4 * sq, sq, sq); ctx.fillRect(ox + 6 * sq, oy + 1 * sq, sq, sq);
      drawPiece(ctx, KING | 8, kx, ky, sq * 1.05);
      drawPiece(ctx, ROOK | 8, ...at(2, 0), sq * 0.95); drawPiece(ctx, PAWN | 8, ...at(0, 2), sq * 0.95);
      drawPiece(ctx, PAWN | 8, ...at(1, 1), sq * 0.95); drawPiece(ctx, PAWN | 8, ...at(7, 2), sq * 0.95);
      drawPiece(ctx, BISHOP, ...at(2, 5), sq * 1.0);
      drawPiece(ctx, KNIGHT, ...at(4, 5), sq * 1.0);
      drawPiece(ctx, PAWN, ...at(5, 6), sq * 0.95); drawPiece(ctx, PAWN, ...at(7, 5), sq * 0.95);
      // חץ המט
      ctx.fillStyle = 'rgba(255,190,60,.85)';
      const [x1, y1] = at(6, 4), [x2, y2] = at(6, 1);
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
      const len = Math.hypot(x2 - x1, y2 - y1) - 30;
      ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(len - 30, -9); ctx.lineTo(len - 30, -22); ctx.lineTo(len, 0); ctx.lineTo(len - 30, 22); ctx.lineTo(len - 30, 9); ctx.lineTo(14, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
      drawPiece(ctx, QUEEN, ...at(6, 1), sq * 1.05);
      ctx.restore();
      // ניצוצות
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4, r = 70 + (i * 37) % 120;
        ctx.fillStyle = ['#ffd166', '#fff3c4', '#ff6b6b', '#7be0ff'][i % 4];
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(kx - 60 + Math.cos(a) * r * 0.9, ky + 30 + Math.sin(a) * r * 0.6, 4 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },

    // לבדיקות בלבד (לא משמש את המשחק)
    dev: { drawPiece, fromFen, legal, make, unmake, uci, mateIn, forcedAfter, mateDist, isMate, inCheck, gen, attacked, PUZ },
  });
})();
