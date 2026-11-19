/* The Forgotten World — the valley: its map, its mood, and every ruin in it. */
(function (root) {
'use strict';
var FW = root.FW, m = FW.m, fbm = m.fbm, mix = m.mix, sstep = m.sstep, WATER = -3;
var SITES = {
  ring:    { x: 0,    z: 0,    r: 24, y: 2.5, noFlat: true },
  temple:  { x: -52,  z: -44,  r: 13, y: WATER + 0.9 },
  tower:   { x: 128,  z: -38,  r: 9 },
  hamlet:  { x: 62,   z: 124,  r: 24 },
  grove:   { x: -70,  z: 98,   r: 15 },
  arch:    { x: -168, z: 22,   r: 12 },
  aqua:    { x: 58,   z: -116, r: 0 }
};
var PATHS = [
  [[0, 88], [0, 66], [0, 31], [0, 19]],
  [[0, 88], [16, 104], [40, 116], [62, 124]],
  [[-18, -6], [-34, -24], [-46, -38]],
  [[18, -6], [46, -28], [84, -36], [108, -32], [122, -36]],
  [[6, -19], [22, -58], [44, -96], [58, -112]],
  [[42, 124], [10, 118], [-30, 108], [-62, 100]],
  [[-80, 92], [-112, 70], [-140, 44], [-162, 26]],
  [[-160, 12], [-128, -14], [-88, -22], [-60, -36]]
];
function raw(x, z) {
  var d = Math.hypot(x, z);
  var h = (fbm(x * 0.012 + 5, z * 0.012 + 9) - 0.47) * 48 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 4.5;
  var rim = Math.max(0, d - 190); h += Math.pow(rim, 1.5) * 0.036;                                   /* mountain rim */
  var lx = x + 96, lz = z + 74; h -= 17 * Math.exp(-(lx * lx + lz * lz) / (2 * 44 * 44));     /* lake basin */
  h = Math.min(h, mix(h, WATER - 3, Math.exp(-(lx * lx + lz * lz) / (2 * 30 * 30))));
  var tx = x - 128, tz = z + 38; h += 25 * Math.exp(-(tx * tx + tz * tz) / (2 * 32 * 32));    /* tower hill */
  var ax = x + 168, az = z - 22; h += 18 * Math.exp(-(ax * ax + az * az) / (2 * 34 * 34));    /* arch hill */
  var hx = x - 62, hz = z - 124; h += 11 * Math.exp(-(hx * hx + hz * hz) / (2 * 46 * 46));   /* hamlet rise */
  return h;
}

FW.setWorld({
  name: 'valley', WATER: WATER, BOUND: 262, SITES: SITES, PATHS: PATHS,
  base: function (x, z) { return mix(2, raw(x, z), sstep(24, 62, Math.hypot(x, z))); },
  /* the height you stand at: paved ring floor in the middle, the land everywhere else */
  groundY: function (x, z) { var d = Math.hypot(x, z); if (d < 17.4) return 2.5; if (d < 19.4) return 2.25; return FW.hAt(x, z); },
  wade: WATER + 0.3,
  grassRule: function (x, z, h, sl, d) { return d < 19.8 ? 0 : (1 - sstep(0.42, 0.62, sl)) * sstep(WATER + 0.15, WATER + 0.7, h) * (1 - sstep(40, 60, h)) * (0.55 + 0.45 * sstep(0.3, 0.55, fbm(x * 0.03 + 3, z * 0.03 + 8, 3))); },
  tree: { kind: 'pine',
    pick: function (rnd) { var a = rnd() * 6.2832, r = 31 + Math.pow(rnd(), 0.72) * 285; return [Math.cos(a) * r, Math.sin(a) * r]; },
    ok: function (x, z, y, sl, rnd) { if (y < WATER + 0.7 || y > 80 || sl > 0.8) return 0; var r = Math.hypot(x, z), f = fbm(x * 0.016 + 50, z * 0.016 + 20, 3);
      if (f < 0.47 - sstep(200, 250, r) * 0.2 && rnd() > 0.035) return 0;
      var lx = x - 12, lz = z + 101, ux = 0.951, uz = -0.31, tq = m.clamp(lx * ux + lz * uz, 0, 97); if (Math.hypot(lx - ux * tq, lz - uz * tq) < 5) return 0;   /* keep the aqueduct clear */
      return (0.72 + rnd() * 0.75) * (0.8 + sstep(0.47, 0.62, f) * 0.35); } },
  bushOk: function (x, z, y, rnd) { if (y < WATER + 0.4 || y > 40) return false; var f2 = fbm(x * 0.016 + 50, z * 0.016 + 20, 3); return !(Math.abs(f2 - 0.46) > 0.07 && rnd() > 0.12) && Math.hypot(x, z - 66) >= 7; },
  flocks: [[-50, -40, 70, 44, 9], [100, 70, 60, 38, 7], [20, 60, 110, 62, 6], [-150, 40, 50, 52, 5]],
  lakes: [[-96, -74, 62], [110, 70, 75], [70, 0, 75]],
  waterNear: function (x, z) { var dl = Math.min(Math.hypot(x + 96, z + 74) - 40, Math.hypot(x - 110, z - 70) - 50, Math.hypot(x - 70, z) - 16); return 1 - sstep(4, 40, dl); },
  spawn: { x: 0, z: 66, yaw: 0, pitch: 0.09 }, heart: { x: 0, y: 13.2, z: 0 }, orbit: { x: 0, z: 0, R: 46, h: 5.2, look: 8.2, a: 0.61, hx: 0, hz: 40 },
  lore: [
    'They raised the ring to count the seasons. Then the seasons stopped coming.',
    'The lake rose one step each year. They kept praying from the step above.',
    'Someone lit this every night, long after anyone was left to see it.',
    'A name was carved here. Rain took the letters and kept the stone.',
    'Nine stones for nine promises. One has lain down to rest.',
    'A door for the sun to walk through. It still comes, every evening.',
    'The water was carried here from far away. It left, and its road stayed.'
  ],
  places: [['ring', 'The Ring', 26], ['temple', 'The Drowned Steps', 22], ['tower', 'The Watchfire', 20], ['hamlet', 'Hollow Home', 26], ['grove', 'The Nine', 18], ['arch', 'The Sun Door', 24], ['aqua', 'The Dry River', 20]],
  startToast: 'Follow the old road through the gate. Pale lights mark what is still awake.', finalToast: ' All seven are awake. Look to the ring.',
  buildRuins: function (scene) {
  var T = root.THREE, K = FW.kit, Builder = FW.Builder, DRUM = K.DRUM, MONO = K.MONO, ROCKS = K.ROCKS, collide = K.collide, rnd = K.rnd;

  var B, i, j, a, x, z, y, SI = FW.SITES, mk = FW.mask;
  function done() { B.mesh(scene, FW.stone); }

  /* --- the ring --- */
  B = new Builder();
  (function () {
    var cyl = new T.CylinderGeometry(1, 1.03, 1, 56, 1);
    B.geo(cyl, 0, 1.92, 0, 19.5, 0.66, 19.5, 0, 0, 0, [0.8, 0.79, 0.76]); B.geo(cyl, 0, 2.29, 0, 17.5, 0.36, 17.5, 0, 0, 0, [0.72, 0.70, 0.66]);
    for (var rr = 1.0; rr < 17.3; rr += 1.55) { var n = Math.max(5, Math.round(6.2832 * rr / 1.7)), o = rnd() * 6;
      for (j = 0; j < n; j++) { if (rnd() < 0.035 && rr > 3) continue; a = j / n * 6.2832 + o; B.box(Math.cos(a) * (rr + 0.75), 2.36 + rnd() * 0.035, Math.sin(a) * (rr + 0.75), 1.5, 0.26, 6.2832 * (rr + 0.75) / n - 0.05, -a, (rnd() - 0.5) * 0.012, (rnd() - 0.5) * 0.012); } }
    var N = 12, ks = [5, 5, 3, 5, 1, 5, 5, 2, 5, 4, 5, 5], tops = [];
    for (i = 0; i < N; i++) { a = i / N * 6.2832 + 0.13; tops.push(B.column(Math.cos(a) * 14, Math.sin(a) * 14, 2.5, ks[i], 0.84, ks[i] === 5, 1.5)); }
    for (i = 0; i < N; i++) { var nx = (i + 1) % N; if (ks[i] === 5 && ks[nx] === 5 && i !== 6) { var a1 = i / N * 6.2832 + 0.13, a2 = a1 + 6.2832 / N;
      B.box((Math.cos(a1) + Math.cos(a2)) * 7, tops[i] + 0.42, (Math.sin(a1) + Math.sin(a2)) * 7, 7.5, 0.84, 1.55, -(a1 + a2) / 2 + Math.PI / 2, 0, (rnd() - 0.5) * 0.01); } }
    [[9, -21, 0.4], [-20, 6, 1.9], [-23, 9, 2.2], [5, 22, 0.9], [22, 14, 2.8], [-6, -24, 1.2], [-3, 7, 0.3], [7, -5, 2.0], [-9.5, -3, 1.1]].forEach(function (f) {
      B.geo(DRUM, f[0], FW.groundY(f[0], f[1]) + 0.74, f[1], 0.84, 1.5, 0.84, f[2], Math.PI / 2 + (rnd() - 0.5) * 0.2, 0); collide(f[0], f[1], 1.15); });
    B.box(11.5, 2.92, 8.6, 6.8, 0.84, 1.5, 0.9, 0, 0.08); collide(10.2, 7.6, 1); collide(12.8, 9.6, 1);
    B.box(0, 2.68, 0, 5.2, 0.38, 5.2, 0.6); B.box(0, 3.06, 0, 3.7, 0.5, 3.7, 0.6); B.geo(MONO, 0, 7.3, 0, 1.9, 8.2, 1.9, 0.6, 0, 0, [1.06, 1.03, 0.97]); collide(0, 0, 3.0);
    for (i = 0; i < 9; i++) { a = i / 9 * 6.2832 + 0.6 + rnd() * 0.3; if (Math.sin(a) > 0.90) continue; var r = 25.5 + rnd() * 3, len = 5 + rnd() * 5, hgt = 1.4 + rnd() * 3.4, tx = -Math.sin(a), tz = Math.cos(a);
      x = Math.cos(a) * r; z = Math.sin(a) * r; (function (hgt, ph) { B.wall(x - tx * len / 2, z - tz * len / 2, x + tx * len / 2, z + tz * len / 2, { h: function (t) { return hgt * (0.45 + 0.55 * Math.sin(t * 3.1 + ph)); }, th: 1.05, rag: 1.3 }); })(hgt, rnd() * 1.5);
      B.rubble(x, z, 4.5, 5); }
    /* gate and the old road */
    B.arch(0, 31, 0, { span: 5.0, pw: 1.9, depth: 2.0, spring: FW.groundY(0, 31) + 4.4, fill: true, over: 0.9, rag: 1.15 });
    B.wall(4.6, 31, 14, 32.2, { h: function (t) { return 5.6 * Math.pow(1 - t, 1.3) + 0.5; }, th: 1.2, rag: 1.2 });
    B.wall(-4.6, 31, -15, 30.2, { h: function (t) { return 4.2 * Math.pow(1 - t, 0.8) + 0.3; }, th: 1.2, rag: 1.4 });
    B.rubble(9, 34, 4, 7); B.rubble(-10, 28, 4, 6);
    for (i = 0; i < 44; i++) { x = (rnd() - 0.5) * 2.8; z = 20.5 + i * 1.5 + rnd() * 0.5; if (rnd() < 0.2 || (z > 58 && z < 70)) continue; B.box(x, FW.groundY(x, z) - 0.07, z, 0.6 + rnd() * 0.5, 0.2, 0.6 + rnd() * 0.45, rnd() * 0.6, (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.03); }
    FW.relicSpots.push(B.stele(5.2, 50));
  })();
  done();

  /* --- lake temple --- */
  B = new Builder();
  (function () {
    var s = SI.temple, yaw = Math.atan2(0.56, -0.83), F = new T.Matrix4().makeRotationY(yaw).setPosition(s.x, 0, s.z), y0 = s.y;
    function w(lx, lz) { return new T.Vector3(lx, 0, lz).applyMatrix4(F); }
    var p, lx, lz;
    for (lx = -8.25; lx < 9; lx += 1.5) for (lz = -4.5; lz <= 4.6; lz += 1.5) { if (rnd() < 0.05) continue; p = w(lx, lz); B.box(p.x, y0 + 0.1 + rnd() * 0.03, p.z, 1.46, 0.3, 1.46, yaw, (rnd() - 0.5) * 0.015, (rnd() - 0.5) * 0.015); }
    mk.stamp(s.x, s.z, 11, 0, 0, 0.3);
    for (i = 0; i < 4; i++) for (lz = -5.2; lz <= 5.3; lz += 1.3) { p = w(9.6 + i * 1.1, lz); B.box(p.x, y0 - 0.02 - i * 0.3, p.z, 1.12, 0.32, 1.28, yaw + (rnd() - 0.5) * 0.02); }
    var hs = [4, 4, 2, 4, 1, 4, 4, 3, 0, 4, 4, 4], tops = [], k = 0;
    for (lz = -3.6; lz <= 3.7; lz += 7.2) for (lx = -7; lx <= 8.1; lx += 3) { p = w(lx, lz); tops.push(hs[k] ? B.column(p.x, p.z, y0 + 0.2, hs[k], 0.6, hs[k] === 4, 1.2) : 0); k++; }
    [[0, 1], [3, 9], [9, 10], [10, 11], [5, 11], [6, 0]].forEach(function (pr, q) { if (q < 4 ? (hs[pr[0]] === 4 && hs[pr[1]] === 4) : true) { var ax = -7 + (pr[0] % 6) * 3, az = pr[0] < 6 ? -3.6 : 3.6, bx = -7 + (pr[1] % 6) * 3, bz = pr[1] < 6 ? -3.6 : 3.6, mid = w((ax + bx) / 2, (az + bz) / 2);
      if (hs[pr[0]] === 4 && hs[pr[1]] === 4) B.box(mid.x, tops[pr[0]] + 0.36, mid.z, Math.hypot(bx - ax, bz - az) + 1.4, 0.72, 1.25, yaw + Math.atan2(-(bz - az), bx - ax)); } });
    p = w(3.5, 1.2); B.geo(DRUM, p.x, y0 + 0.82, p.z, 0.6, 1.2, 0.6, 0.7, Math.PI / 2, 0); collide(p.x, p.z, 0.9);
    p = w(-2.5, -1.4); B.geo(DRUM, p.x, y0 + 0.82, p.z, 0.6, 1.2, 0.6, 2.1, Math.PI / 2, 0); collide(p.x, p.z, 0.9);
    [[17, -3.6, 4], [20, 3.6, 3], [23.5, -3.4, 5], [27, 3.2, 2], [31, -2.6, 4], [19, 9, 2], [25, -9, 3]].forEach(function (c) { p = w(c[0], c[1]); var bed = FW.hAt(p.x, p.z), nd = Math.ceil((WATER - bed) / 1.2) + c[2]; B.column(p.x, p.z, bed - 0.3, nd, 0.6, c[2] >= 4, 1.2); });
    p = w(-10.5, 0); B.wall(w(-10.5, -5.5).x, w(-10.5, -5.5).z, w(-10.5, 5.5).x, w(-10.5, 5.5).z, { h: function (t) { return 1.2 + 3.2 * Math.abs(Math.sin(t * 2.6 + 0.4)); }, th: 1.0, rag: 1.5, holes: [{ a: 4.4, b: 6.6, y0: -1, y1: 2.5, lintel: true }] });
    B.rubble(s.x, s.z, 14, 10); p = w(0.2, 0); FW.relicSpots.push(B.stele(p.x, p.z));
  })();
  done();

  /* --- watchtower --- */
  B = new Builder();
  (function () {
    var s = SI.tower;
    B.round(s.x, s.z, 4.3, function (a) { return 6.5 + 7.5 * Math.pow(0.5 + 0.5 * Math.cos(a - 0.6), 1.4); }, { maxH: 15, rag: 1.8, th: 1.0, holes: [{ a: Math.PI * 0.95, w: 0.24, y0: -1, y1: 2.5 }, { a: 0.4, w: 0.09, y0: 5, y1: 6.8 }, { a: -1.2, w: 0.09, y0: 8, y1: 9.8 }, { a: 1.6, w: 0.09, y0: 3, y1: 4.6 }] });
    mk.stamp(s.x, s.z, 5.2, 0, 0, 0.2); mk.stamp(s.x, s.z, 5, 1, 255, 0.4);
    B.round(s.x - 0.5, s.z + 0.5, 9.2, function (a) { return 0.3 + 1.6 * Math.max(0, Math.sin(a * 2.0 + 1)); }, { maxH: 2.4, rag: 1.0, th: 0.8, holes: [{ a: Math.PI * 0.95, w: 0.3, y0: -1, y1: 3 }] });
    B.rubble(s.x + 2, s.z - 3, 9, 14, 0.9); FW.relicSpots.push(B.stele(s.x + 0.6, s.z - 0.2));
  })();
  done();

  /* --- hamlet --- */
  B = new Builder();
  (function () {
    var s = SI.hamlet;
    [[-12, -8, 6.5, 5, 0.3], [10, -11, 7, 5.2, -0.4], [14, 6, 6, 4.6, 1.2], [-3, 13, 7.5, 5, 0.1], [-16, 6, 5.5, 4.5, 1.9], [3, -19, 5, 4.2, 0.9]].forEach(function (hd, hi) {
      var cx = s.x + hd[0], cz = s.z + hd[1], w2 = hd[2] / 2, d2 = hd[3] / 2, c = Math.cos(hd[4]), sn = Math.sin(hd[4]), ruin = 0.35 + rnd() * 0.65;
      function pt(lx, lz) { return [cx + lx * c + lz * sn, cz - lx * sn + lz * c]; }
      var cs = [pt(-w2, -d2), pt(w2, -d2), pt(w2, d2), pt(-w2, d2)], k;
      for (k = 0; k < 4; k++) { var A = cs[k], Bq = cs[(k + 1) % 4], gable = k % 2 === 1, len = gable ? hd[3] : hd[2], ph = rnd() * 6;
        (function (gable, ph, k) { B.wall(A[0], A[1], Bq[0], Bq[1], { h: function (t) { var base = gable ? 2.4 + 2.2 * (1 - Math.abs(t * 2 - 1)) : 2.4; return base * m.clamp(ruin + 0.5 * Math.sin(t * 4 + ph + k), 0.12, 1); }, th: 0.62, bh: 0.4, bl: 0.85, rag: 0.9,
          holes: k === 0 ? [{ a: len / 2 - 0.6, b: len / 2 + 0.6, y0: -1, y1: 2.0, lintel: true }] : k === 2 ? [{ a: len * 0.3 - 0.4, b: len * 0.3 + 0.4, y0: 1.0, y1: 1.9, lintel: true }] : [] }); })(gable, ph, k); }
      mk.stamp(cx, cz, Math.max(w2, d2) + 0.5, 0, 60, 0.5); B.rubble(cx, cz, 5.5, 6, 0.4);
    });
    B.round(s.x, s.z, 1.35, function () { return 0.95; }, { maxH: 1.2, rag: 0.15, th: 0.5 }); mk.stamp(s.x, s.z, 4, 1, 255, 0.6); mk.stamp(s.x, s.z, 3.4, 0, 0, 0.4);
    B.box(s.x - 1.6, FW.groundY(s.x, s.z) + 1.3, s.z, 0.3, 2.6, 0.3, 0.2); B.box(s.x + 1.6, FW.groundY(s.x, s.z) + 1.25, s.z, 0.3, 2.5, 0.3, -0.1); B.box(s.x, FW.groundY(s.x, s.z) + 2.62, s.z, 3.9, 0.26, 0.3, 0, 0, 0.02);
    FW.relicSpots.push(B.stele(s.x + 3.4, s.z + 2.6));
  })();
  done();

  /* --- grove of standing stones --- */
  B = new Builder();
  (function () {
    var s = SI.grove;
    for (i = 0; i < 9; i++) { a = i / 9 * 6.2832 + 0.2; x = s.x + Math.cos(a) * 8.6; z = s.z + Math.sin(a) * 8.6; var hh = 3.4 + rnd() * 3.2; if (i === 4) { B.geo(MONO, x + 1.5, FW.groundY(x, z) + 0.5, z, 1.3, 4.6, 0.9, a, 0, Math.PI / 2 - 0.08); collide(x + 1.5, z, 1.3); continue; }
      B.geo(MONO, x, FW.groundY(x, z) + hh / 2 - 0.5, z, 1.25 + rnd() * 0.5, hh, 0.75 + rnd() * 0.3, -a + Math.PI / 2 + (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.16, [0.82, 0.84, 0.86]); collide(x, z, 0.95); }
    for (i = 0; i < 5; i++) { a = i / 5 * 6.2832 + 0.9; x = s.x + Math.cos(a) * 14.5; z = s.z + Math.sin(a) * 14.5; B.geo(MONO, x, FW.groundY(x, z) + 0.8, z, 0.9, 2.2 + rnd(), 0.6, rnd() * 6, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, [0.8, 0.82, 0.84]); collide(x, z, 0.7); }
    B.box(s.x, FW.groundY(s.x, s.z) + 0.3, s.z - 2.4, 3.0, 0.7, 1.7, 0.3); collide(s.x, s.z - 2.4, 1.5); mk.stamp(s.x, s.z, 6, 0, 120, 0.7);
    FW.relicSpots.push(B.stele(s.x, s.z + 0.6));
  })();
  done();

  /* --- the great arch on the western hill --- */
  B = new Builder();
  (function () {
    var s = SI.arch, yaw = Math.atan2(-0.57, -0.82), c = Math.cos(yaw), sn = Math.sin(yaw);
    function w(lx, lz) { return [s.x + lx * c + lz * sn, s.z - lx * sn + lz * c]; }
    B.arch(s.x, s.z, yaw, { span: 10.5, pw: 3.4, depth: 3.4, rt: 1.2, spring: s.y + 8.5, fill: true, over: 1.8, rag: 1.25 });
    var p0 = w(9, 0), p1 = w(22, 1.5); B.wall(p0[0], p0[1], p1[0], p1[1], { h: function (t) { return 7 * Math.pow(1 - t, 1.6) + 0.4; }, th: 1.6, rag: 1.6, bh: 0.6, bl: 1.4 });
    p0 = w(-9, 0); p1 = w(-19, -1); B.wall(p0[0], p0[1], p1[0], p1[1], { h: function (t) { return 4.5 * Math.pow(1 - t, 1.1) + 0.3; }, th: 1.6, rag: 1.8, bh: 0.6, bl: 1.4 });
    for (i = 0; i < 5; i++) for (j = -3; j <= 3; j++) { p0 = w(j * 1.5, -3.2 - i * 1.3); B.box(p0[0], FW.groundY(p0[0], p0[1]) + 0.02, p0[1], 1.46, 0.3, 1.26, yaw + (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.02, 0); }
    p0 = w(0, -2); mk.stamp(p0[0], p0[1], 7, 0, 0, 0.4); p0 = w(4, -9); B.rubble(p0[0], p0[1], 8, 12, 1.1);
    p0 = w(0.4, -11); FW.relicSpots.push(B.stele(p0[0], p0[1]));
  })();
  done();

  /* --- aqueduct --- */
  B = new Builder();
  (function () {
    var x0 = 12, z0 = -101, x1 = 104, z1 = -131, L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, yaw = Math.atan2(-uz, ux), bays = 10, bay = L / bays, pw = 1.15, span = bay - pw * 2, mx = -1e9, t;
    for (t = 0; t <= L; t += 2) mx = Math.max(mx, FW.groundY(x0 + ux * t, z0 + uz * t));
    var spring = mx + 3.2;
    for (i = 0; i < bays; i++) { var cx = x0 + ux * (i + 0.5) * bay, cz = z0 + uz * (i + 0.5) * bay, br = i === 6 || i === 7;
      B.arch(cx, cz, yaw, { span: span, pw: pw, depth: 2.3, rt: 0.8, spring: br ? spring - (i === 6 ? 2.5 : 4.2) : spring, fill: true, over: 1.3, rag: i === 5 || i === 8 || i === 0 ? 1.02 : 1.3, broken: br, skipPier: i === 6 ? -1 : i === 7 ? 1 : 0, gap: i === 5 ? [9, 99] : i === 8 ? [0, 3] : null });
      if (br) B.rubble(cx, cz, 6, 16, 1.2); }
    B.rubble(x0 - 4, z0 + 1, 5, 8, 1.0); FW.relicSpots.push(B.stele(55.5, -107.5));
  })();
  done();

  /* --- boulders (natural rock) --- */
  B = new Builder();
  for (i = 0; i < 300; i++) { a = rnd() * 6.2832; var r = 22 + Math.pow(rnd(), 0.7) * 240; x = Math.cos(a) * r; z = Math.sin(a) * r; y = FW.hAt(x, z); if (y < WATER - 1.2 || FW.pathDist(x, z) < 2.5) continue;
    var near = false, kk; for (kk in SI) if (Math.hypot(x - SI[kk].x, z - SI[kk].z) < SI[kk].r) near = true; if (near) continue;
    var sc = 0.35 + Math.pow(rnd(), 3.2) * 3.4 + FW.slopeAt(x, z) * 1.2; B.geo(ROCKS[i % 4], x, y + sc * 0.12, z, sc * (0.8 + rnd() * 0.7), sc * (0.55 + rnd() * 0.5), sc * (0.8 + rnd() * 0.5), rnd() * 6.28, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4, [0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2]);
    if (sc > 0.8) { collide(x, z, sc * 0.72); mk.stamp(x, z, sc * 1.25, 0, 0, 0.5); } }
  B.mesh(scene, FW.rockMat);
  }
});
})(typeof window !== 'undefined' ? window : globalThis);
