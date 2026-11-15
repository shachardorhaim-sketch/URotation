// ============================================================
//  הנחש — משחק 2D של URotation (המנוע: g2d/kit.js)
//  אוכלים תפוחים וגדלים. כל 6 תפוחים שלב חדש עם קירות, וחלקם זזים. גם לשני שחקנים.
// ============================================================
(function () {
  const C = 25, COLS = 32, ROWS = 24;       // משבצת 25, לוח 32×24 = עולם 800×600
  const SPEED = [10, 8, 6];                  // צעדים (1/60 שנייה) לכל תזוזה, לפי רמת הקושי
  const PER_STAGE = 6;
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const SKIN = [
    { body: '#5ad35a', dark: '#23702e', light: '#c9ff9e' },
    { body: '#62a8ff', dark: '#2649a8', light: '#d3e8ff' },
  ];
  const key = (x, y) => x + ',' + y;

  // ----- שלבים: קירות קבועים ופסים שזזים -----
  function hbar(x1, x2, y) { const a = []; for (let x = x1; x <= x2; x++) a.push([x, y]); return a; }
  function vbar(x, y1, y2) { const a = []; for (let y = y1; y <= y2; y++) a.push([x, y]); return a; }
  function stageLayout(n) {
    const st = [], mv = [];
    const every = Math.max(12, 28 - n * 2);
    const mover = (cells, axis, min, max, dir) => mv.push({ cells, axis, min, max, off: 0, dir, every, t: 0 });
    const k = n <= 5 ? n : 3 + ((n - 3) % 3);
    if (k === 2) st.push(...hbar(6, 10, 6), ...hbar(21, 25, 6), ...hbar(6, 10, 17), ...hbar(21, 25, 17));
    if (k === 3) { st.push(...hbar(12, 19, 12), ...vbar(16, 8, 11), ...vbar(16, 13, 15)); mover(hbar(2, 5, 4), 'x', 0, 24, 1); }
    if (k === 4) {
      st.push(...hbar(3, 6, 3), ...vbar(3, 4, 6), ...hbar(25, 28, 20), ...vbar(28, 17, 19));
      mover(vbar(10, 2, 5), 'y', 0, 16, 1);
      mover(vbar(21, 18, 21), 'y', -16, 0, -1);
    }
    if (k === 5) {
      st.push(...vbar(16, 2, 8), ...vbar(16, 15, 21), ...hbar(2, 8, 12), ...hbar(23, 29, 12));
      mover(hbar(3, 6, 6), 'x', 0, 22, 1);
      mover(hbar(25, 28, 18), 'x', -22, 0, -1);
    }
    return { st, mv };
  }
  const moverCells = m => m.cells.map(([x, y]) => (m.axis === 'x' ? [x + m.off, y] : [x, y + m.off]));
  const moverTrack = m => {
    const out = [];
    for (let o = m.min; o <= m.max; o++) for (const [x, y] of m.cells) out.push(m.axis === 'x' ? [x + o, y] : [x, y + o]);
    return out;
  };

  function newSnake(x, y, dir, skin, len) {
    const body = [];
    const [dx, dy] = DIR[dir];
    for (let i = 0; i < len; i++) body.push([x - dx * i, y - dy * i]);
    return { body, prev: body.map(p => p.slice()), dir, queue: [], grow: 0, alive: true, skin, streak: 0, blink: 0 };
  }

  function occupied(g, x, y, skipTails) {
    for (const s of g.s.snakes) {
      const n = s.body.length - (skipTails && !s.grow ? 1 : 0);
      for (let i = 0; i < n; i++) if (s.body[i][0] === x && s.body[i][1] === y) return true;
    }
    return false;
  }
  function solidAt(g, x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    const S = g.s;
    if (S.walls.has(key(x, y))) return true;
    for (const m of S.movers) if (!m.ghost) for (const [mx, my] of moverCells(m)) if (mx === x && my === y) return true;
    return false;
  }

  function setStage(g, n) {
    const S = g.s;
    S.stage = n;
    S.fruits = 0;
    const { st, mv } = stageLayout(n);
    S.walls = new Set(); S.ghost = new Set();
    // קיר שנופל על הנחש מחכה (שקוף) עד שהנחש עוזב את המקום
    for (const [x, y] of st) (occupied(g, x, y) ? S.ghost : S.walls).add(key(x, y));
    S.movers = mv;
    for (const m of mv) m.ghost = moverCells(m).some(([x, y]) => occupied(g, x, y));
    S.track = new Set();
    for (const m of mv) for (const [x, y] of moverTrack(m)) S.track.add(key(x, y));
    if (S.fruit && (S.walls.has(key(S.fruit.x, S.fruit.y)) || S.ghost.has(key(S.fruit.x, S.fruit.y)) || S.track.has(key(S.fruit.x, S.fruit.y)))) spawnFruit(g);
    if (S.gold && (S.walls.has(key(S.gold.x, S.gold.y)) || S.track.has(key(S.gold.x, S.gold.y)))) S.gold = null;
  }

  function freeCell(g) {
    const S = g.s;
    for (let tries = 0; tries < 2000; tries++) {
      const x = g.ri(1, COLS - 2), y = g.ri(1, ROWS - 2), k = key(x, y);
      if (S.walls.has(k) || S.ghost.has(k) || S.track.has(k) || occupied(g, x, y)) continue;
      if (S.fruit && S.fruit.x === x && S.fruit.y === y) continue;
      if (S.gold && S.gold.x === x && S.gold.y === y) continue;
      if (S.snakes.some(s => Math.abs(s.body[0][0] - x) + Math.abs(s.body[0][1] - y) < 3)) continue;
      return { x, y };
    }
    return null;
  }
  function spawnFruit(g) { const c = freeCell(g); g.s.fruit = c ? { x: c.x, y: c.y, born: g.frame } : null; }

  function queueDir(s, d) {
    const lastD = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (d === lastD || d === OPP[lastD] || s.queue.length >= 3) return;
    s.queue.push(d);
  }

  function interval(g) { return Math.max(4, SPEED[g.diff] - (g.s.stage - 1) * 0.5); }

  function moveAll(g) {
    const S = g.s, live = S.snakes.filter(s => s.alive);
    for (const s of live) { if (s.queue.length) s.dir = s.queue.shift(); s.prev = s.body.map(p => p.slice()); }
    const heads = live.map(s => { const [dx, dy] = DIR[s.dir]; return [s.body[0][0] + dx, s.body[0][1] + dy]; });
    const dead = new Set();
    live.forEach((s, i) => {
      const [x, y] = heads[i];
      if (solidAt(g, x, y) || occupied(g, x, y, true)) dead.add(s);
      live.forEach((o, j) => {
        if (j === i) return;
        if (heads[j][0] === x && heads[j][1] === y) dead.add(s);
        if (o.body[0][0] === x && o.body[0][1] === y && heads[j][0] === s.body[0][0] && heads[j][1] === s.body[0][1]) dead.add(s);
      });
    });
    live.forEach((s, i) => {
      if (dead.has(s)) return;
      s.body.unshift(heads[i]);
      if (s.grow > 0) s.grow--; else s.body.pop();
    });
    for (const s of dead) die(g, s);
    // אוכל
    for (const s of live) {
      if (!s.alive) continue;
      const [hx, hy] = s.body[0];
      if (S.fruit && S.fruit.x === hx && S.fruit.y === hy) eat(g, s, false);
      if (S.gold && S.gold.x === hx && S.gold.y === hy) eat(g, s, true);
    }
    // קירות שקופים מתמצקים כשהמקום מתפנה
    for (const k of [...S.ghost]) { const [x, y] = k.split(',').map(Number); if (!occupied(g, x, y)) { S.ghost.delete(k); S.walls.add(k); } }
    for (const m of S.movers) if (m.ghost && !moverCells(m).some(([x, y]) => occupied(g, x, y))) m.ghost = false;
  }

  function eat(g, s, gold) {
    const S = g.s, cx = s.body[0][0] * C + C / 2, cy = s.body[0][1] * C + C / 2;
    if (gold) {
      S.gold = null; s.grow += 2;
      if (g.mode !== '2p') g.score += 5;
      g.burst(cx, cy, { n: 26, color: ['#ffd84d', '#fff3b0', '#ffae00'], speed: 4, life: 45 });
      g.float(cx, cy - 14, '+5', { color: '#ffd84d', size: 26 });
      g.sfx('power');
      return;
    }
    s.grow += 1;
    s.streak = Math.min(s.streak + 1, 8);
    if (g.mode !== '2p') g.score += 1;
    g.burst(cx, cy, { n: 14, color: ['#ff5a5a', '#ffd0d0', '#5ad35a'], speed: 3, life: 32 });
    if (g.mode !== '2p') g.float(cx, cy - 12, '+1', { color: '#ffffff' });
    g.sfx('coin', { p: 1 + s.streak * 0.04 });
    spawnFruit(g);
    if (!S.gold && Math.random() < 0.22) { const c = freeCell(g); if (c) S.gold = { x: c.x, y: c.y, left: 7 * 60, max: 7 * 60 }; }
    if (g.mode !== '2p' && ++S.fruits >= PER_STAGE) {
      setStage(g, S.stage + 1);
      g.msg(g.t('stage', { n: S.stage }), 1400, '#ffd84d');
      g.sfx('power');
      g.flash('#ffffff', 0.18);
    }
  }

  function die(g, s) {
    s.alive = false;
    const [x, y] = s.body[0];
    g.burst(x * C + C / 2, y * C + C / 2, { n: 40, color: [SKIN[s.skin].body, SKIN[s.skin].light, '#ffffff'], speed: 5, life: 50 });
    g.shake(10);
    g.flash('#ff3b3b', 0.28);
    g.sfx('hit');
  }

  function finish(g) {
    const S = g.s;
    if (g.mode === '2p') {
      const alive = S.snakes.filter(s => s.alive);
      if (alive.length === 0) return g.end({ result: 'draw', score: null });
      const w = alive[0].skin;
      S.wins[w]++;
      return g.end({ winner: g.t(w ? 'p2' : 'p1'), score: null, text: g.t('length') + ': ' + S.snakes[0].body.length + ' · ' + S.snakes[1].body.length });
    }
    g.end({ score: g.score });
  }

  // ----- בוט לבדיקות: הדרך הקצרה לתפוח, ואם אין — המקום הכי פתוח -----
  function botFor(g, s) {
    const S = g.s;
    const block = new Set();
    for (const o of S.snakes) for (let i = 0; i < o.body.length - (o.grow ? 0 : 1); i++) block.add(key(o.body[i][0], o.body[i][1]));
    for (const k of S.walls) block.add(k);
    for (const k of S.ghost) block.add(k);
    for (const m of S.movers) for (const d of [0, m.dir, -m.dir]) for (const [x, y] of m.cells) block.add(m.axis === 'x' ? key(x + m.off + d, y) : key(x, y + m.off + d));
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !block.has(key(x, y));
    const [hx, hy] = s.body[0];
    const targets = [S.gold, S.fruit].filter(Boolean);
    const prev = new Map([[key(hx, hy), null]]);
    const q = [[hx, hy]];
    let found = null;
    while (q.length && !found) {
      const [x, y] = q.shift();
      for (const d of ['up', 'down', 'left', 'right']) {
        const nx = x + DIR[d][0], ny = y + DIR[d][1], k = key(nx, ny);
        if (prev.has(k) || !free(nx, ny)) continue;
        prev.set(k, [x, y, d]);
        if (targets.some(t => t.x === nx && t.y === ny)) { found = k; break; }
        q.push([nx, ny]);
      }
    }
    let want = null;
    if (found) { let k = found; while (prev.get(k) && key(prev.get(k)[0], prev.get(k)[1]) !== key(hx, hy)) k = key(prev.get(k)[0], prev.get(k)[1]); want = prev.get(k)[2]; }
    const area = (sx, sy) => { const seen = new Set([key(sx, sy)]), st = [[sx, sy]]; while (st.length && seen.size < 200) { const [x, y] = st.pop(); for (const d of Object.values(DIR)) { const nx = x + d[0], ny = y + d[1], k = key(nx, ny); if (!seen.has(k) && free(nx, ny)) { seen.add(k); st.push([nx, ny]); } } } return seen.size; };
    if (want) { const nx = hx + DIR[want][0], ny = hy + DIR[want][1]; if (area(nx, ny) < s.body.length + 4) want = null; }
    if (!want) {
      let bestA = -1;
      for (const d of ['up', 'down', 'left', 'right']) {
        if (d === OPP[s.dir]) continue;
        const nx = hx + DIR[d][0], ny = hy + DIR[d][1];
        if (!free(nx, ny)) continue;
        const a = area(nx, ny);
        if (a > bestA) { bestA = a; want = d; }
      }
    }
    if (want && want !== s.dir && want !== OPP[s.dir]) s.queue = [want];
    else s.queue = [];
  }

  // ----- ציור -----
  function drawBoard(ctx, w, h, c) {
    ctx.fillStyle = '#0f2417'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#132c1d';
    for (let y = 0; y < h / c; y++) for (let x = (y % 2); x < w / c; x += 2) ctx.fillRect(x * c, y * c, c, c);
  }
  function drawWall(g, ctx, x, y, c, alpha) {
    ctx.globalAlpha = alpha;
    g.rr(ctx, x * c + 1, y * c + 1, c - 2, c - 2, c * 0.18);
    ctx.fillStyle = '#6a7886'; ctx.fill();
    ctx.fillStyle = '#8796a4'; ctx.fillRect(x * c + 3, y * c + 3, c - 6, c * 0.22);
    ctx.fillStyle = '#4a5662'; ctx.fillRect(x * c + 3, y * c + c * 0.72, c - 6, c * 0.18);
    ctx.globalAlpha = 1;
  }
  function drawMover(g, ctx, cells, c, alpha) {
    ctx.globalAlpha = alpha;
    cells.forEach(([x, y], i) => {
      g.rr(ctx, x * c + 1, y * c + 1, c - 2, c - 2, c * 0.2);
      ctx.fillStyle = '#b8c4cf'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = i === 0 || i === cells.length - 1 ? '#ffcc33' : '#d7dee5';
      ctx.fillRect(x * c, y * c, c, c);
      ctx.fillStyle = '#222';
      for (let k = -c; k < c * 2; k += c / 2.5) { ctx.beginPath(); ctx.moveTo(x * c + k, y * c); ctx.lineTo(x * c + k + c / 5, y * c); ctx.lineTo(x * c + k - c / 2 + c / 5, y * c + c); ctx.lineTo(x * c + k - c / 2, y * c + c); ctx.fill(); }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  function drawApple(g, ctx, x, y, r, gold, t) {
    const bob = Math.sin(t * 4) * r * 0.08;
    y += bob;
    ctx.save();
    if (gold) { ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = r * 1.6; }
    g.circle(ctx, x, y, r);
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, gold ? '#fff6b8' : '#ff8a8a'); gr.addColorStop(0.55, gold ? '#ffcc22' : '#e8323c'); gr.addColorStop(1, gold ? '#b37a00' : '#8f1420');
    ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + r * 0.15, y - r * 1.25); ctx.stroke();
    ctx.fillStyle = '#4fc24f';
    ctx.beginPath(); ctx.ellipse(x + r * 0.45, y - r * 1.05, r * 0.38, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.35, r * 0.18, r * 0.28, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  function drawSnake(g, ctx, pts, skin, dir, c, o) {
    const S = SKIN[skin];
    const dead = o && o.dead, blink = o && o.blink, tongue = o && o.tongue;
    const col = dead ? '#7d8a80' : S.body, dark = dead ? '#4a524c' : S.dark, light = dead ? '#b7c0b9' : S.light;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]); };
    path(); ctx.strokeStyle = dark; ctx.lineWidth = c * 0.88; ctx.stroke();
    path(); ctx.strokeStyle = col; ctx.lineWidth = c * 0.68; ctx.stroke();
    path(); ctx.strokeStyle = light; ctx.globalAlpha = 0.45; ctx.lineWidth = c * 0.22; ctx.stroke(); ctx.globalAlpha = 1;
    // ראש
    const [hx, hy] = pts[0], [dx, dy] = DIR[dir];
    g.circle(ctx, hx, hy, c * 0.5); ctx.fillStyle = dark; ctx.fill();
    g.circle(ctx, hx, hy, c * 0.42); ctx.fillStyle = col; ctx.fill();
    if (tongue) {
      ctx.strokeStyle = '#ff3355'; ctx.lineWidth = c * 0.08;
      const tx = hx + dx * c * 0.75, ty = hy + dy * c * 0.75;
      ctx.beginPath(); ctx.moveTo(hx + dx * c * 0.4, hy + dy * c * 0.4); ctx.lineTo(tx, ty);
      ctx.lineTo(tx + (dx - dy) * c * 0.15, ty + (dy + dx) * c * 0.15); ctx.moveTo(tx, ty); ctx.lineTo(tx + (dx + dy) * c * 0.15, ty + (dy - dx) * c * 0.15); ctx.stroke();
    }
    for (const sgn of [-1, 1]) {
      const ex = hx + dx * c * 0.12 + -dy * sgn * c * 0.2, ey = hy + dy * c * 0.12 + dx * sgn * c * 0.2;
      if (dead) {
        ctx.strokeStyle = '#222'; ctx.lineWidth = c * 0.07;
        ctx.beginPath(); ctx.moveTo(ex - c * 0.08, ey - c * 0.08); ctx.lineTo(ex + c * 0.08, ey + c * 0.08); ctx.moveTo(ex + c * 0.08, ey - c * 0.08); ctx.lineTo(ex - c * 0.08, ey + c * 0.08); ctx.stroke();
      } else if (blink) {
        ctx.strokeStyle = '#123'; ctx.lineWidth = c * 0.07;
        ctx.beginPath(); ctx.moveTo(ex - c * 0.09, ey); ctx.lineTo(ex + c * 0.09, ey); ctx.stroke();
      } else {
        g.circle(ctx, ex, ey, c * 0.13); ctx.fillStyle = '#fff'; ctx.fill();
        g.circle(ctx, ex + dx * c * 0.05, ey + dy * c * 0.05, c * 0.065); ctx.fillStyle = '#111'; ctx.fill();
      }
    }
  }

  GK.register('snake', {
    w: COLS * C, h: ROWS * C, bg: '#0f2417', accent: '#7be07b',
    modes: ['1p', '2p'],
    diffs: true,
    touch: [['ArrowLeft', '◀'], ['ArrowUp', '▲'], ['ArrowDown', '▼'], ['ArrowRight', '▶']],
    text: {
      he: { title: 'הנחש', help: ['חצים או WASD — לשנות כיוון', 'אכול תפוחים כדי לגדול. תפוח זהב שווה 5!', 'אל תתנגש בקירות או בזנב שלך', 'כל 6 תפוחים — שלב חדש עם קירות, וחלקם זזים', '2 שחקנים: שחקן 1 עם WASD, שחקן 2 עם החצים. מי שנשאר אחרון מנצח'], helpTouch: ['החלק על המסך או השתמש בכפתורים כדי לפנות', 'אכול תפוחים כדי לגדול. תפוח זהב שווה 5!', 'אל תתנגש בקירות או בזנב שלך'], stage: 'שלב {n}!', length: 'אורך' },
      en: { title: 'Snake', help: ['Arrows or WASD — change direction', 'Eat apples to grow. A golden apple is worth 5!', "Don't hit the walls or your own tail", 'Every 6 apples — a new stage with walls, some of them moving', '2 players: player 1 uses WASD, player 2 the arrows. Last snake standing wins'], helpTouch: ['Swipe on the screen or use the buttons to turn', 'Eat apples to grow. A golden apple is worth 5!', "Don't hit the walls or your own tail"], stage: 'Stage {n}!', length: 'Length' },
      ar: { title: 'الثعبان', help: ['الأسهم أو WASD — لتغيير الاتجاه', 'كُل التفاح لتكبر. التفاحة الذهبية تساوي 5!', 'لا تصطدم بالجدران أو بذيلك', 'كل 6 تفاحات — مرحلة جديدة بجدران، وبعضها يتحرك', 'لاعبان: اللاعب 1 بـ WASD واللاعب 2 بالأسهم. آخر ثعبان يبقى يفوز'], helpTouch: ['اسحب على الشاشة أو استخدم الأزرار للالتفاف', 'كُل التفاح لتكبر. التفاحة الذهبية تساوي 5!', 'لا تصطدم بالجدران أو بذيلك'], stage: 'المرحلة {n}!', length: 'الطول' },
      es: { title: 'La Serpiente', help: ['Flechas o WASD — cambiar de dirección', 'Come manzanas para crecer. ¡Una manzana dorada vale 5!', 'No choques con las paredes ni con tu cola', 'Cada 6 manzanas, una etapa nueva con paredes; algunas se mueven', '2 jugadores: el jugador 1 usa WASD y el 2 las flechas. Gana la última serpiente en pie'], helpTouch: ['Desliza en la pantalla o usa los botones para girar', 'Come manzanas para crecer. ¡Una manzana dorada vale 5!', 'No choques con las paredes ni con tu cola'], stage: '¡Etapa {n}!', length: 'Largo' },
      fr: { title: 'Le Serpent', help: ['Flèches ou WASD — changer de direction', 'Mange des pommes pour grandir. Une pomme dorée vaut 5 !', 'Ne touche ni les murs ni ta queue', 'Toutes les 6 pommes, une nouvelle étape avec des murs, dont certains bougent', '2 joueurs : le joueur 1 avec WASD, le joueur 2 avec les flèches. Le dernier serpent en vie gagne'], helpTouch: ["Glisse sur l'écran ou utilise les boutons pour tourner", 'Mange des pommes pour grandir. Une pomme dorée vaut 5 !', 'Ne touche ni les murs ni ta queue'], stage: 'Étape {n} !', length: 'Longueur' },
      pt: { title: 'A Cobra', help: ['Setas ou WASD — mudar de direção', 'Coma maçãs para crescer. Uma maçã dourada vale 5!', 'Não bata nas paredes nem no próprio rabo', 'A cada 6 maçãs, uma nova etapa com paredes; algumas se mexem', '2 jogadores: o jogador 1 usa WASD e o 2 as setas. Vence a última cobra de pé'], helpTouch: ['Deslize na tela ou use os botões para virar', 'Coma maçãs para crescer. Uma maçã dourada vale 5!', 'Não bata nas paredes nem no próprio rabo'], stage: 'Etapa {n}!', length: 'Tamanho' },
      ru: { title: 'Змейка', help: ['Стрелки или WASD — повернуть', 'Ешь яблоки, чтобы расти. Золотое яблоко — 5 очков!', 'Не врезайся в стены и в свой хвост', 'Каждые 6 яблок — новый этап со стенами, некоторые двигаются', '2 игрока: игрок 1 — WASD, игрок 2 — стрелки. Побеждает последняя змейка'], helpTouch: ['Проведи по экрану или нажимай кнопки, чтобы повернуть', 'Ешь яблоки, чтобы расти. Золотое яблоко — 5 очков!', 'Не врезайся в стены и в свой хвост'], stage: 'Этап {n}!', length: 'Длина' },
      de: { title: 'Die Schlange', help: ['Pfeile oder WASD — Richtung ändern', 'Iss Äpfel, um zu wachsen. Ein goldener Apfel zählt 5!', 'Stoß nicht gegen Wände oder deinen Schwanz', 'Alle 6 Äpfel eine neue Stufe mit Wänden, manche bewegen sich', '2 Spieler: Spieler 1 mit WASD, Spieler 2 mit den Pfeilen. Die letzte Schlange gewinnt'], helpTouch: ['Wische über den Bildschirm oder nutze die Tasten zum Abbiegen', 'Iss Äpfel, um zu wachsen. Ein goldener Apfel zählt 5!', 'Stoß nicht gegen Wände oder deinen Schwanz'], stage: 'Stufe {n}!', length: 'Länge' },
    },

    setup(g) { g.s = { wins: [0, 0] }; },

    init(g) {
      const wins = g.s ? g.s.wins : [0, 0];
      const S = g.s = { wins, snakes: [], walls: new Set(), ghost: new Set(), movers: [], track: new Set(), stage: 1, fruits: 0, fruit: null, gold: null, moveAcc: -30, swipe: null, over: false };
      if (g.mode === '2p') S.snakes = [newSnake(6, 6, 'right', 0, 4), newSnake(COLS - 7, ROWS - 7, 'left', 1, 4)];
      else S.snakes = [newSnake(8, 12, 'right', 0, 4)];
      setStage(g, g.mode === '2p' ? 2 : 1);
      spawnFruit(g);
    },

    step(g) {
      const S = g.s;
      if (S.over) return;
      // מקשים: בשחקן אחד גם החצים וגם WASD. בשניים: WASD לשחקן 1, חצים לשחקן 2
      for (const c of g.hits) {
        const d = KEYDIR[c];
        if (!d) continue;
        const who = g.mode === '2p' ? (c.startsWith('Arrow') ? 1 : 0) : 0;
        if (S.snakes[who] && S.snakes[who].alive) queueDir(S.snakes[who], d);
      }
      // פסים שזזים
      for (const m of S.movers) {
        if (m.ghost || ++m.t < m.every) continue;
        m.t = 0;
        let next = m.off + m.dir;
        if (next < m.min || next > m.max) { m.dir = -m.dir; next = m.off + m.dir; }
        const cells = m.cells.map(([x, y]) => (m.axis === 'x' ? [x + next, y] : [x, y + next]));
        if (!cells.some(([x, y]) => occupied(g, x, y))) m.off = next;
      }
      if (S.gold && --S.gold.left <= 0) { const gc = S.gold; S.gold = null; g.burst(gc.x * C + C / 2, gc.y * C + C / 2, { n: 10, color: '#ffd84d', speed: 1.5, life: 25 }); }
      S.moveAcc += 1;
      const iv = interval(g);
      if (S.moveAcc >= iv) {
        S.moveAcc -= iv;
        moveAll(g);
        if (S.snakes.some(s => !s.alive)) { S.over = true; finish(g); }
      }
      for (const s of S.snakes) { if (s.blink > 0) s.blink--; else if (Math.random() < 0.004) s.blink = 7; }
      if (g.mode === '2p') g.hud([[g.t('p1'), '🏆 ' + S.wins[0], SKIN[0].body], [g.t('p2'), '🏆 ' + S.wins[1], SKIN[1].body]]);
      else { const b = g.getBest(); g.hud([[g.t('score'), g.score], [g.t('best'), b === null ? '—' : Math.max(b, g.score)], [g.t('level'), S.stage]]); }
    },

    // בוט לבדיקות (GK.bot): משחק דרך אותו תור כיוונים של השחקן
    bot(g) { for (const s of g.s.snakes) if (s.alive) botFor(g, s); },

    onPointer(g, type, p) {
      const S = g.s;
      if (type === 'down') S.swipe = { x: p.x, y: p.y, id: p.id };
      else if (type === 'move' && S.swipe && S.swipe.id === p.id) {
        const dx = p.x - S.swipe.x, dy = p.y - S.swipe.y;
        if (Math.hypot(dx, dy) < 28) return;
        const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const who = g.mode === '2p' && S.swipe.x > g.W / 2 ? 1 : 0;
        if (S.snakes[who] && S.snakes[who].alive) queueDir(S.snakes[who], d);
        S.swipe = { x: p.x, y: p.y, id: p.id };
      } else if (type === 'up') S.swipe = null;
    },

    draw(g, ctx, alpha) {
      const S = g.s, t = g.frame / 60;
      drawBoard(ctx, g.W, g.H, C);
      for (const k of S.walls) { const [x, y] = k.split(',').map(Number); drawWall(g, ctx, x, y, C, 1); }
      for (const k of S.ghost) { const [x, y] = k.split(',').map(Number); drawWall(g, ctx, x, y, C, 0.28); }
      for (const m of S.movers) drawMover(g, ctx, moverCells(m), C, m.ghost ? 0.3 : 1);
      if (S.fruit) drawApple(g, ctx, S.fruit.x * C + C / 2, S.fruit.y * C + C / 2, C * 0.38, false, t + S.fruit.x);
      if (S.gold) {
        const gx = S.gold.x * C + C / 2, gy = S.gold.y * C + C / 2;
        drawApple(g, ctx, gx, gy, C * 0.42, true, t);
        ctx.strokeStyle = 'rgba(255,216,77,.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(gx, gy, C * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (S.gold.left / S.gold.max)); ctx.stroke();
      }
      const iv = interval(g), p = S.over ? 1 : Math.max(0, Math.min(1, (S.moveAcc + alpha) / iv));
      for (const s of S.snakes) {
        const pts = s.body.map((cur, i) => {
          const pr = s.prev[i] || s.prev[s.prev.length - 1];
          const q = s.alive ? p : 1;
          return [(pr[0] + (cur[0] - pr[0]) * q) * C + C / 2, (pr[1] + (cur[1] - pr[1]) * q) * C + C / 2];
        });
        drawSnake(g, ctx, pts, s.skin, s.dir, C, { dead: !s.alive, blink: s.blink > 0, tongue: s.alive && (g.frame % 150) < 12 });
      }
      // מסגרת הלוח
      ctx.strokeStyle = 'rgba(123,224,123,.35)'; ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, g.W - 3, g.H - 3);
    },

    cover(ctx, w, h, k) {
      const c = 40;
      drawBoard(ctx, w, h, c);
      for (const [x, y] of [[3, 2], [4, 2], [5, 2], [19, 10], [20, 10], [21, 10], [21, 11], [21, 12]]) drawWall(k, ctx, x, y, c, 1);
      drawMover(k, ctx, [[15, 2], [16, 2], [17, 2], [18, 2]], c, 1);
      const pts = [];
      for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([w * 0.62 - u * w * 0.55, h * 0.55 + Math.sin(u * Math.PI * 2.2) * h * 0.2]); }
      drawSnake(k, ctx, pts, 0, 'right', 62, {});
      drawApple(k, ctx, w * 0.8, h * 0.5, 30, false, 0);
      ctx.save(); drawApple(k, ctx, w * 0.86, h * 0.2, 24, true, 1); ctx.restore();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    },
  });
})();
