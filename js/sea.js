/* The Salt Shore — a hot, bright island: its map, its mood, and everything left on its beaches. */
(function (root) {
'use strict';
var FW = root.FW, m = FW.m, fbm = m.fbm, mix = m.mix, sstep = m.sstep, WATER = 0;
var SITES = {
  wreck:   { x: 30,   z: 73,   r: 0 },
  pier:    { x: -14,  z: 67,   r: 7, y: 1.15 },
  village: { x: -30,  z: 10,   r: 26 },
  light:   { x: 150,  z: -62,  r: 10 },
  fort:    { x: -140, z: -52,  r: 17 },
  bones:   { x: 60,   z: -40,  r: 12 },
  idol:    { x: 84,   z: 146,  r: 5, y: 0.6 }
};
var PATHS = [
  [[-30, 12], [-22, 36], [-15, 56], [-14, 66]],
  [[-15, 56], [6, 62], [22, 64]],
  [[-30, 12], [10, -16], [44, -34], [60, -40]],
  [[60, -40], [100, -48], [134, -58], [148, -62]],
  [[-30, 12], [-70, -14], [-108, -38], [-136, -50]]
];
var PIER = { x: -14, z: 70, ux: 0.08, uz: 0.9968, len: 36, half: 1.6, y: 1.3 };
function onPier(x, z) { var dx = x - PIER.x, dz = z - PIER.z, al = dx * PIER.ux + dz * PIER.uz, la = dx * PIER.uz - dz * PIER.ux; return al > -0.5 && al < PIER.len && Math.abs(la) < PIER.half; }
function base(x, z) {
  var d = Math.hypot(x, z), n = fbm(x * 0.013 + 11, z * 0.013 + 4, 4), s = 1 - sstep(95, 215, d + (n - 0.5) * 150);
  var h = -11 + s * (13.5 + (fbm(x * 0.011 + 5, z * 0.011 + 9, 5) - 0.42) * 48 * s) + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 3 * s;
  var bx = x - 14, bz = z - 142; h -= 13 * Math.exp(-(bx * bx + bz * bz) / (2 * 46 * 46));                 /* the bay */
  var lx = x - 150, lz = z + 62; h += 21 * Math.exp(-(lx * lx + lz * lz) / (2 * 30 * 30));                 /* lighthouse head */
  var fx = x + 140, fz = z + 52; h += 17 * Math.exp(-(fx * fx + fz * fz) / (2 * 36 * 36));                 /* fort cliff */
  var ix = x - 84, iz = z - 146; h += 8.5 * Math.exp(-(ix * ix + iz * iz) / (2 * 17 * 17));                /* sandbar */
  var ax = 41, az = 73, ex = 84 - ax, ez = 146 - az, tt = m.clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez), 0, 1), sd = Math.hypot(x - ax - ex * tt, z - az - ez * tt);
  h = Math.max(h, -0.42 - Math.pow(sd / 9, 2) * 3 + (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 0.25);     /* a sandbar you can wade along */
  if (h > 0 && h < 7) h = 7 * Math.pow(h / 7, 1.7); else if (h < 0 && h > -6) h = -6 * Math.pow(-h / 6, 1.25);   /* wide, gentle beaches */
  return h;
}
FW.setWorld({
  name: 'sea', WATER: WATER, BOUND: 300, SITES: SITES, PATHS: PATHS, base: base, mountains: false, leaves: false, moss: 0.0, ferns: 0, bloom: 0.2,
  wade: WATER - 0.75,
  groundY: function (x, z) { return onPier(x, z) ? PIER.y : FW.hAt(x, z); },
  sky: { sun: [-0.35, 0.55, 0.76], zen: [0.12, 0.33, 0.70], horFar: [0.62, 0.78, 0.90], horSun: [0.80, 0.87, 0.90], glowA: [1.0, 0.92, 0.75], glowAk: [0.06, 0.10], glowB: [1.0, 0.97, 0.9], glowBk: 0.3,
    cov: [0.52, 0.66], cloudShade: [0.66, 0.72, 0.82], cloudLit: [1.0, 1.0, 0.98], cloudRim: 0.15, fogBase: 0.0006, fogHeight: 0.0022, fogGlow: 0.5 },
  light: { sun: 0xfff1dc, sunI: 2.5, sky: 0xa9cdf0, ground: 0xb09a78, hemiI: 0.85 },
  pal: { grassBase: [0.36, 0.33, 0.15], dirt: [0.70, 0.60, 0.43], pebble: 0.25, rockTint: [1.45, 1.2, 0.95], stoneTint: [1.22, 1.18, 1.08], tintA: 'vec3(0.85, 0.95, 0.75)', tintB: 'vec3(1.20, 1.08, 0.80)',
    shoreTop: 3.6, bare: 1.0, wetDark: 0.8, tuft: { hue: 46, hueR: 26, sat: 36, lt: 27, ltR: 16, fill: [140, 125, 62] } },
  water: { shallow: 'vec3(0.20, 0.62, 0.58)', deep: 'vec3(0.02, 0.16, 0.30)', range: 7, size: 6000, surf: true, clear: 0.22, alphaRange: 3.0 },
  lakes: [[0, 0, 2500]], birdColor: '0.86, 0.86, 0.84', bushTint: [1.15, 1.0, 0.6],
  flocks: [[30, 90, 55, 26, 8], [150, -62, 40, 40, 6], [-60, 40, 90, 46, 6], [70, 0, 45, 22, 5]],
  grassRule: function (x, z, h, sl) { return sstep(1.6, 3.6, h) * (1 - sstep(0.4, 0.6, sl)) * (0.2 + 0.8 * sstep(0.36, 0.6, fbm(x * 0.03 + 3, z * 0.03 + 8, 3))); },
  tree: { kind: 'palm', amount: 0.5, tint: [1.0, 1.0, 0.72],
    pick: function (rnd) { var a = rnd() * 6.2832, r = Math.sqrt(rnd()) * 225; return [Math.cos(a) * r, Math.sin(a) * r]; },
    ok: function (x, z, y, sl, rnd) { if (y < 0.9 || y > 17 || sl > 0.45 || onPier(x, z)) return 0; if (Math.hypot(x - 30, z - 73) < 16 || Math.hypot(x - 8, z - 60) < 7) return 0;
      var f = fbm(x * 0.02 + 50, z * 0.02 + 20, 3); if (f < 0.46 - sstep(6, 1.5, y) * 0.08 && rnd() > 0.07) return 0; return 0.8 + rnd() * 0.5; } },
  bushOk: function (x, z, y, rnd) { return y > 2 && y < 18 && rnd() < 0.5; },
  waterNear: function (x, z) { return 1 - sstep(1.5, 16, FW.hAt(x, z)); }, waterGain: 0.09,
  spawn: { x: 8, z: 60, yaw: Math.atan2(-22, -13), pitch: 0.06 }, heart: { x: 150, y: 0, z: -62 }, orbit: { x: 30, z: 73, R: 31, h: 2.6, look: 3.2, a: 2.72, swing: 0.45, hx: 42, hz: 46 },
  lore: [
    'She came in on the last high tide and never asked to leave.',
    'They waited here for sails. The planks remember the waiting.',
    'The doors were left open so the wind could come home.',
    'It showed the way in. Nobody told it the ships had stopped.',
    'The guns watched the sea for an enemy. Only the sun ever landed.',
    'Something vast lay down here, and the sand kept its shape.',
    'Salt was the first coin. They paid the sea, and the sea kept the change.'
  ],
  places: [['wreck', 'The Long Sleeper', 20], ['pier', 'The Last Step', 12], ['village', 'White Rooms', 26], ['light', 'The Blind Lamp', 20], ['fort', 'The Quiet Guns', 24], ['bones', 'The Old Singer', 18], ['idol', 'The Salt Idol', 12]],
  startToast: 'Walk down to the wreck. Pale lights mark what is still awake.', finalToast: ' All seven are awake. Look to the lighthouse.',

  buildRuins: function (scene) {
    var T = root.THREE, K = FW.kit, Builder = FW.Builder, BOX = K.BOX, DRUM = K.DRUM, MONO = K.MONO, ROCKS = K.ROCKS, collide = K.collide, rnd = K.rnd, SI = SITES, mk = FW.mask, i, j, a, x, z, y, p;
    var S = new Builder(), Wd = new Builder(); Wd.noFoot = true;
    var ID = new T.Matrix4(), M = new T.Matrix4(), Bm = new T.Matrix4(), X = new T.Vector3(), Y = new T.Vector3(), Z = new T.Vector3(), C = new T.Vector3(), tmp = new T.Vector3();
    function wt() { var b = 0.78 + rnd() * 0.4; return [b * 1.04, b, b * 0.94]; }
    /* a box running from a to b (points in frame F); ty/tz = its thickness; up = roughly which way its "top" faces */
    function beam(B, F, ax, ay, az, bx, by, bz, ty, tz, tint, ux, uy, uz) {
      X.set(bx - ax, by - ay, bz - az); var len = X.length(); if (len < 0.01) return; X.divideScalar(len); Y.set(ux || 0, uy === undefined ? 1 : uy, uz || 0);
      Z.crossVectors(X, Y); if (Z.lengthSq() < 1e-4) { Y.set(1, 0, 0); Z.crossVectors(X, Y); } Z.normalize(); Y.crossVectors(Z, X).normalize();
      Bm.makeBasis(X, Y, Z); Bm.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); Bm.scale(tmp.set(len, ty, tz)); B.add(BOX, M.multiplyMatrices(F, Bm), tint || wt());
    }
    function pole(B, F, ax, ay, az, bx, by, bz, r, tint) {
      Y.set(bx - ax, by - ay, bz - az); var len = Y.length(); Y.divideScalar(len); X.set(1, 0, 0); if (Math.abs(Y.x) > 0.9) X.set(0, 0, 1); Z.crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
      Bm.makeBasis(X, Y, Z); Bm.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); Bm.scale(tmp.set(r, len, r)); B.add(DRUM, M.multiplyMatrices(F, Bm), tint || wt());
    }
    /* a wooden hull: keel, ribs, planks with holes. o: x,z,yaw,roll,pitch,sink,L,B,D,damage,masts,side(-1/1 broken side) */
    function ship(o) {
      var L = o.L, BW = o.B, D = o.D, F = new T.Matrix4(), R = new T.Matrix4(), NX = Math.max(8, Math.round(L / 1.15)), NS = Math.max(4, Math.round(D / 0.42)), sd, k, s, seed = rnd() * 50, bs = o.side || -1;
      F.makeRotationY(o.yaw); R.makeRotationZ(o.pitch || 0); F.multiply(R); R.makeRotationX(o.roll || 0); F.multiply(R); F.setPosition(o.x, FW.hAt(o.x, o.z) - (o.sink || 0), o.z);
      function hp(xx, s, side, inset) { var u = 2 * xx / L, e = u < 0 ? 3.6 : 2.1, hb = BW / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), e)), 0.55) * (inset || 1), bow = Math.pow(Math.max(0, u - 0.55) / 0.45, 2);
        C.set(xx, D * (Math.pow(s, 1.6) * 0.75 + s * 0.25) + 0.9 * u * u * s + bow * D * 0.3 * (1 - s), side * hb * Math.pow(s, 0.55)); return C; }
      function gone(i, k, side) { var t = k / NS, n = m.fbm(i * 0.33 + seed + side * 7, k * 0.45 + seed, 3), dmg = o.damage * (side === bs ? 1.5 : 0.75); if (side === bs && i > NX * 0.36 && i < NX * 0.62 && t > 0.12) return true; return n + t * 0.22 * dmg > 0.74 - dmg * 0.16; }
      for (sd = -1; sd <= 1; sd += 2) {
        for (k = 0; k < NS; k++) for (i = 0; i < NX; i++) { if (gone(i, k, sd)) continue; var x0 = -L / 2 + i / NX * L, x1 = x0 + L / NX, sm = (k + 0.5) / NS, A = hp(x0, sm, sd).clone(), Bq = hp(x1, sm, sd).clone(), lo = hp((x0 + x1) / 2, k / NS, sd).clone(), hi = hp((x0 + x1) / 2, (k + 1) / NS, sd);
          beam(Wd, F, A.x, A.y, A.z, Bq.x, Bq.y, Bq.z, lo.distanceTo(hi) * 0.97, 0.075, null, hi.x - lo.x, hi.y - lo.y, hi.z - lo.z); }
        for (i = 1; i < NX; i += 2) { var xr = -L / 2 + i / NX * L, top = 1.0 + (m.h2(i, sd + seed) > 0.5 ? 0.18 : 0) - (sd === bs ? m.h2(i * 3, seed) * 0.35 : 0), n2 = 7;
          for (s = 0; s < n2; s++) { var s0 = s / n2 * top, s1 = (s + 1) / n2 * top, a0 = hp(xr, s0, sd, 0.94).clone(), a1 = hp(xr, s1, sd, 0.94); beam(Wd, F, a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, 0.15, 0.17, [0.62, 0.58, 0.52], 1, 0, 0); } }
      }
      for (i = 0; i < NX; i++) { var k0 = hp(-L / 2 + i / NX * L, 0, 1).clone(), k1 = hp(-L / 2 + (i + 1) / NX * L, 0, 1); beam(Wd, F, k0.x, k0.y - 0.1, 0, k1.x, k1.y - 0.1, 0, 0.36, 0.3, [0.55, 0.52, 0.47]); }
      var st = hp(L / 2, 0, 1).clone(); beam(Wd, F, st.x - 0.1, st.y, 0, st.x + 0.7, D + 1.5, 0, 0.3, 0.3, [0.55, 0.52, 0.47], 0, 0, 1);
      var sp = hp(-L / 2, 0, 1).clone(); beam(Wd, F, sp.x, sp.y, 0, sp.x - 0.3, D + 0.9, 0, 0.3, 0.3, [0.55, 0.52, 0.47], 0, 0, 1);
      if (o.deck) for (i = 2; i < NX - 1; i += 2) { var xd = -L / 2 + i / NX * L, dl = hp(xd, 0.86, -1, 0.95).clone(), dr = hp(xd, 0.86, 1, 0.95).clone(); if (m.h2(i, seed) < 0.25) continue; beam(Wd, F, dl.x, dl.y, dl.z, dr.x, dr.y, dr.z, 0.16, 0.2, [0.6, 0.57, 0.5], 1, 0, 0);
        if (xd < -L * 0.14) for (j = 0; j < 9; j++) { var f0 = (j + 0.5) / 9, zz = dl.z + (dr.z - dl.z) * f0; if (rnd() < 0.3) continue; beam(Wd, F, xd - L / NX * 1.02, dl.y + 0.12, zz, xd + L / NX * 1.02, dl.y + 0.12, zz, 0.06, Math.abs(dr.z - dl.z) / 9 * 0.92); } }
      (o.masts || []).forEach(function (ms) { var bx = ms[0] * L, base = hp(bx, 0, 1).y, lean = ms[3] || 0;
        pole(Wd, F, bx, base, 0, bx + lean * ms[1], base + ms[1], lean * ms[1] * 0.4, ms[2], [0.6, 0.56, 0.5]);
        if (ms[4]) { pole(Wd, F, bx + 0.5, base + ms[1] * 0.7, bs * 0.6, bx + ms[4] * 0.45, D * 0.6, bs * (BW / 2 + ms[4] * 0.75), ms[2] * 0.9, [0.58, 0.55, 0.5]); pole(Wd, F, bx + ms[4] * 0.2, D * 0.9, bs * (BW / 2 + 2.5), bx + ms[4] * 0.2 + 3.6, D * 0.45, bs * (BW / 2 + 4.4), ms[2] * 0.5); } });
      if (o.sprit) { var b0 = hp(L / 2, 0.9, 1).clone(); pole(Wd, F, b0.x - 0.6, b0.y + 0.5, 0, b0.x + o.sprit, b0.y + 0.5 + o.sprit * 0.35, 0, 0.14); }
      if (o.collide !== false) for (sd = -1; sd <= 1; sd += 2) for (i = 0; i <= NX * 2; i++) { var ii = i / 2; if (sd === bs && ii > NX * 0.38 && ii < NX * 0.60) continue; tmp.copy(hp(-L / 2 + ii / NX * L, 0.42, sd)).applyMatrix4(F); if (tmp.y - FW.hAt(tmp.x, tmp.z) < 1.9) collide(tmp.x, tmp.z, 0.42); }
      return F;
    }

    /* --- the great wreck on the bay beach --- */
    var wk = SI.wreck, WF = ship({ x: wk.x, z: wk.z, yaw: 0.5, roll: -0.33, pitch: 0.05, sink: 0.9, L: 27, B: 7.6, D: 4.6, damage: 1, deck: true, sprit: 4.5, side: -1, masts: [[0.08, 7.5, 0.3, 0.05, 9], [0.3, 3.2, 0.24, -0.1, 0], [-0.26, 11.5, 0.25, 0.1, 0]] });
    for (i = 0; i < 26; i++) { a = rnd() * 6.28; var rr = 6 + rnd() * 13; x = wk.x + Math.cos(a) * rr; z = wk.z + Math.sin(a) * rr; y = FW.hAt(x, z); if (y < -0.6) continue; var pl = 1 + rnd() * 2.6, an = rnd() * 6.28;
      beam(Wd, ID, x, y + 0.05, z, x + Math.cos(an) * pl, y + 0.05 + (rnd() - 0.3) * 0.3, z + Math.sin(an) * pl, 0.07, 0.24 + rnd() * 0.1); }
    for (i = 0; i < 5; i++) { a = rnd() * 6.28; x = wk.x + Math.cos(a) * (8 + rnd() * 6); z = wk.z - 6 + Math.sin(a) * 5; y = FW.hAt(x, z); if (y < 0.1) continue; Wd.geo(DRUM, x, y + 0.42, z, 0.42, 0.95, 0.42, rnd() * 6, rnd() < 0.5 ? Math.PI / 2 : 0.1, 0, [0.7, 0.62, 0.5]); collide(x, z, 0.6); }
    p = new T.Vector3(1.5, 0, -8.2).applyMatrix4(WF); FW.relicSpots.push(S.stele(p.x, p.z));
    /* small boats */
    ship({ x: -4, z: 64, yaw: 2.2, roll: 0.5, sink: 0.25, L: 5.2, B: 1.9, D: 0.8, damage: 0.25, side: 1, collide: true });
    ship({ x: -24, z: 62, yaw: 0.9, roll: -0.2, sink: 0.3, L: 4.6, B: 1.7, D: 0.75, damage: 0.6, side: -1 });
    ship({ x: 62, z: 2, yaw: 1.1, roll: 0.5, pitch: 0.12, sink: -1.4, L: 15, B: 4.6, D: 3, damage: 0.5, side: 1, collide: false, masts: [[0.05, 12, 0.2, 0.12, 0], [-0.25, 9, 0.17, 0.2, 0]] });
    ship({ x: -172, z: -6, yaw: 0.3, roll: 0.7, pitch: -0.1, sink: 0.4, L: 13, B: 4.2, D: 2.8, damage: 1.1, side: 1, collide: false, masts: [[0.1, 8, 0.2, 0.3, 0]] });

    /* --- the pier --- */
    (function () {
      var P = PIER, px = P.uz, pz = -P.ux, t, s;
      function w(al, la) { return [P.x + P.ux * al + px * la, P.z + P.uz * al + pz * la]; }
      for (t = 0; t < P.len; t += 0.31) { if (rnd() < 0.06 && t > 4) continue; var e = t > P.len - 3 ? rnd() * 1.2 : 0, q0 = w(t, -P.half - 0.15 + e), q1 = w(t, P.half + 0.15 - (rnd() < 0.1 ? rnd() : 0)); beam(Wd, ID, q0[0], P.y - 0.05 + rnd() * 0.02, q0[1], q1[0], P.y - 0.05 + rnd() * 0.02, q1[1], 0.07, 0.27); }
      for (t = 1; t < P.len + 1; t += 3.4) { for (s = -1; s <= 1; s += 2) { var q = w(t, s * (P.half - 0.1)), bed = FW.hAt(q[0], q[1]), tall = rnd() < 0.4 ? 1.1 + rnd() : 0.25; pole(Wd, ID, q[0], bed - 0.6, q[1], q[0] + (rnd() - 0.5) * 0.2, P.y + tall, q[1] + (rnd() - 0.5) * 0.2, 0.17, [0.55, 0.52, 0.47]); if (tall > 1) collide(q[0], q[1], 0.3); }
        var c0 = w(t, -P.half), c1 = w(t, P.half); beam(Wd, ID, c0[0], P.y - 0.2, c0[1], c1[0], P.y - 0.2, c1[1], 0.2, 0.2, [0.55, 0.52, 0.47]); }
      for (s = -1; s <= 1; s += 2) { var r0 = w(0, s * 0.9), r1 = w(P.len, s * 0.9); beam(Wd, ID, r0[0], P.y - 0.2, r0[1], r1[0], P.y - 0.2, r1[1], 0.2, 0.16, [0.55, 0.52, 0.47]); }
      for (i = 0; i < 5; i++) { var qq = w(P.len + 2 + i * 2.6, (rnd() - 0.5) * 3), bd = FW.hAt(qq[0], qq[1]); pole(Wd, ID, qq[0], bd - 0.5, qq[1], qq[0] + rnd() - 0.5, 0.3 + rnd() * 1.6, qq[1] + rnd() - 0.5, 0.17, [0.5, 0.48, 0.44]); }
      var e2 = w(P.len - 2.2, 0); FW.relicSpots.push(S.stele(e2[0], e2[1])); mk.stamp(P.x, P.z - 3, 6, 0, 0, 0.4);
    })();

    /* --- the white village --- */
    (function () {
      var s = SI.village, white = [1.12, 1.1, 1.04];
      [[-13, -9, 6.5, 5, 0.3], [10, -12, 7, 5.2, -0.4], [15, 5, 6, 4.6, 1.2], [-4, 14, 7.5, 5, 0.1], [-17, 6, 5.5, 4.5, 1.9], [3, -20, 5, 4.2, 0.9], [18, -8, 4.6, 4, 0.2]].forEach(function (hd) {
        var cx = s.x + hd[0], cz = s.z + hd[1], w2 = hd[2] / 2, d2 = hd[3] / 2, c = Math.cos(hd[4]), sn = Math.sin(hd[4]), ruin = 0.45 + rnd() * 0.6;
        function pt(lx, lz) { return [cx + lx * c + lz * sn, cz - lx * sn + lz * c]; }
        var cs = [pt(-w2, -d2), pt(w2, -d2), pt(w2, d2), pt(-w2, d2)], k;
        for (k = 0; k < 4; k++) { var A = cs[k], Bq = cs[(k + 1) % 4], len = k % 2 ? hd[3] : hd[2], ph = rnd() * 6;
          (function (ph, k) { S.wall(A[0], A[1], Bq[0], Bq[1], { h: function (t) { return 2.9 * m.clamp(ruin + 0.45 * Math.sin(t * 4 + ph + k), 0.15, 1); }, th: 0.6, bh: 0.42, bl: 0.9, rag: 0.8,
            holes: k === 0 ? [{ a: len / 2 - 0.6, b: len / 2 + 0.6, y0: -1, y1: 2.1, lintel: true }] : k === 2 ? [{ a: len * 0.3 - 0.4, b: len * 0.3 + 0.4, y0: 1.0, y1: 1.9, lintel: true }] : [] }); })(ph, k); }
        if (ruin > 0.75) for (k = 0; k < 4; k++) { var b0 = pt(-w2 + (k + 0.5) * hd[2] / 4, -d2 - 0.3), b1 = pt(-w2 + (k + 0.5) * hd[2] / 4 + (rnd() - 0.5), d2 + 0.3), gy = FW.hAt(cx, cz) + 2.9; if (rnd() < 0.3) continue; pole(Wd, ID, b0[0], gy, b0[1], b1[0], gy - rnd() * 0.5, b1[1], 0.09); }
        mk.stamp(cx, cz, Math.max(w2, d2) + 0.5, 0, 0, 0.5); S.rubble(cx, cz, 5.5, 5, 0.4);
      });
      S.round(s.x, s.z, 1.35, function () { return 0.95; }, { maxH: 1.2, rag: 0.15, th: 0.5 }); mk.stamp(s.x, s.z, 6, 0, 0, 0.6);
      for (i = 0; i < 3; i++) { x = s.x - 7 + i * 1.2; z = s.z + 4 + i * 3.2; y = FW.hAt(x, z); pole(Wd, ID, x - 1.6, y - 0.3, z, x - 1.5, y + 1.9, z, 0.07); pole(Wd, ID, x + 1.6, y - 0.3, z + 0.4, x + 1.5, y + 1.8, z + 0.4, 0.07); pole(Wd, ID, x - 1.9, y + 1.75, z - 0.05, x + 1.9, y + 1.68, z + 0.45, 0.05); }
      FW.relicSpots.push(S.stele(s.x + 3.4, s.z + 2.6));
    })();

    /* --- the lighthouse --- */
    (function () {
      var s = SI.light, top = 17, ang, lamp = s.y + top + 0.4;
      S.round(s.x, s.z, 3.5, function (a) { return top - 2.2 * Math.pow(0.5 + 0.5 * Math.cos(a - 2.2), 3); }, { maxH: top + 0.5, rag: 0.5, th: 0.95, holes: [{ a: 2.9, w: 0.3, y0: -1, y1: 2.5 }, { a: 0.4, w: 0.1, y0: 5, y1: 6.6 }, { a: -1.3, w: 0.1, y0: 9, y1: 10.6 }, { a: 1.9, w: 0.1, y0: 12.5, y1: 14 }] });
      S.round(s.x, s.z, 4.3, function () { return 0.9; }, { maxH: 1.1, rag: 0.1, th: 0.9, holes: [{ a: 2.9, w: 0.3, y0: -1, y1: 3 }] });
      S.geo(DRUM, s.x, lamp - 0.2, s.z, 4.1, 0.36, 4.1, 0, 0, 0, [1.3, 1.28, 1.22]);
      for (i = 0; i < 6; i++) { ang = i / 6 * 6.2832; if (i === 2) continue; pole(S, ID, s.x + Math.cos(ang) * 2.2, lamp, s.z + Math.sin(ang) * 2.2, s.x + Math.cos(ang) * 2.2, lamp + 2.6, s.z + Math.sin(ang) * 2.2, 0.15, [0.3, 0.29, 0.28]); }
      S.geo(K.jitter(new T.CylinderGeometry(0.25, 1, 1, 10, 1), 0.02), s.x, lamp + 3.7, s.z, 2.9, 2.4, 2.9, 0, 0.03, 0.02, [0.62, 0.3, 0.24]);
      S.round(s.x + 1, s.z - 1, 9.5, function (a) { return 0.2 + 1.2 * Math.max(0, Math.sin(a * 2.0 + 1)); }, { maxH: 1.8, rag: 0.8, th: 0.8, holes: [{ a: 2.9, w: 0.35, y0: -1, y1: 3 }] });
      mk.stamp(s.x, s.z, 5.5, 0, 0, 0.3); S.rubble(s.x - 3, s.z + 4, 8, 10, 0.8); FW.cfg.heart.y = lamp + 1.5;
      FW.relicSpots.push(S.stele(s.x - 7.2, s.z + 1.8));
    })();

    /* --- the fort --- */
    (function () {
      var s = SI.fort, R = 13, pts = [], k;
      for (k = 0; k < 5; k++) { a = k / 5 * 6.2832 + 0.5; pts.push([s.x + Math.cos(a) * R, s.z + Math.sin(a) * R]); }
      for (k = 0; k < 5; k++) { var A = pts[k], Bq = pts[(k + 1) % 5], len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]), ph = rnd() * 6;
        (function (ph, k) { S.wall(A[0], A[1], Bq[0], Bq[1], { h: function (t) { return 3.4 * m.clamp(0.75 + 0.35 * Math.sin(t * 5 + ph), 0.3, 1) + (Math.floor(t * 14) % 2 ? 0.45 : 0); }, th: 1.5, bh: 0.55, bl: 1.3, rag: 0.7,
          holes: k === 4 ? [{ a: len / 2 - 1.3, b: len / 2 + 1.3, y0: -1, y1: 2.8, lintel: true }] : [] }); })(ph, k);
        S.round(A[0], A[1], 2.3, function (an) { return 4.2 + Math.sin(an * 3 + k) * 0.8; }, { maxH: 5.2, rag: 0.8, th: 0.9 }); }
      [[-7, -3, 2.9], [-6, 5, 3.6], [1, -9, 4.6]].forEach(function (c, ci) { x = s.x + c[0]; z = s.z + c[1]; y = FW.hAt(x, z); var dx = Math.cos(c[2]), dz = Math.sin(c[2]);
        pole(S, ID, x - dx * 1.2, y + 0.75, z - dz * 1.2, x + dx * 1.5, y + (ci === 1 ? 0.5 : 0.95), z + dz * 1.5, 0.24, [0.22, 0.22, 0.24]); pole(S, ID, x - dx * 1.45, y + 0.74, z - dz * 1.45, x - dx * 1.15, y + 0.75, z - dz * 1.15, 0.3, [0.2, 0.2, 0.22]);
        beam(Wd, ID, x - dx * 1.1, y + 0.35, z - dz * 1.1, x + dx * 0.6, y + 0.35, z + dz * 0.6, 0.5, 0.75); collide(x, z, 1.1); collide(x + dx * 1.2, z + dz * 1.2, 0.5); });
      for (i = 0; i < 8; i++) { x = s.x + 4 + (i % 3) * 0.5; z = s.z + 3 + Math.floor(i / 3) * 0.5; S.geo(K.ROCKS[0], x, FW.hAt(x, z) + 0.2 + (i > 5 ? 0.38 : 0), z, 0.24, 0.24, 0.24, 0, 0, 0, [0.2, 0.2, 0.22]); }
      mk.stamp(s.x, s.z, 12, 0, 70, 0.4); S.rubble(s.x, s.z, 12, 12, 0.7); FW.relicSpots.push(S.stele(s.x + 1.5, s.z + 0.5));
    })();

    /* --- the whale --- */
    (function () {
      var s = SI.bones, Bn = new Builder(), F = new T.Matrix4().makeRotationY(0.5), bone = [1.5, 1.46, 1.3], k, q, gy = s.y; F.setPosition(s.x, gy, s.z);
      for (k = 0; k < 20; k++) { var sx = -9 + k * 0.95, sy = 1.35 - Math.pow(Math.abs(k - 7) / 13, 2) * 1.2; 
        pole(Bn, F, sx, sy, 0, sx + 0.8, sy, 0, 0.26 - k * 0.006, bone); }
      for (k = 0; k < 9; k++) { var rx = -6.5 + k * 1.15, rad = 2.5 - Math.abs(k - 3) * 0.22, top = 1.35 - Math.pow(Math.abs(rx / 0.95 + 9 - 7) / 13, 2) * 1.2;
        for (var sd = -1; sd <= 1; sd += 2) { if (m.h2(k, sd) < 0.15) continue; for (q = 0; q < 6; q++) { var a0 = q / 6 * 2.5, a1 = (q + 1) / 6 * 2.5; beam(Bn, F, rx + q * 0.05, top - rad * (1 - Math.cos(a0)) * 0.62, sd * rad * Math.sin(a0), rx + (q + 1) * 0.05, top - rad * (1 - Math.cos(a1)) * 0.62, sd * rad * Math.sin(a1), 0.13 - q * 0.012, 0.16 - q * 0.012, bone, 1, 0, 0); } } }
      tmp.set(-11.6, 0.75, 0).applyMatrix4(F); Bn.geo(MONO, tmp.x, tmp.y, tmp.z, 2.3, 4.6, 1.5, 0.5, 0, Math.PI / 2 + 0.1, bone); collide(tmp.x, tmp.z, 1.6);
      for (sd = -1; sd <= 1; sd += 2) { beam(Bn, F, -9.6, 0.35, sd * 1.0, -14.6, 0.25, sd * 0.25, 0.3, 0.26, bone); }
      for (k = 0; k < 5; k++) { tmp.set(-8 + k * 4, 0, 0).applyMatrix4(F); collide(tmp.x, tmp.z, 0.6); }
      Bn.mesh(scene, FW.stoneMaterial(FW.tex.stone, { scale: 0.5, bump: 0.6, moss: 0 })); mk.stamp(s.x, s.z, 9, 0, 40, 0.6);
      tmp.set(2, 0, 5.5).applyMatrix4(F); FW.relicSpots.push(S.stele(tmp.x, tmp.z));
    })();

    /* --- the salt idol on its islet --- */
    (function () {
      var s = SI.idol; y = FW.hAt(s.x, s.z);
      S.geo(DRUM, s.x, y + 0.15, s.z, 2.1, 0.45, 2.1, 0.3); S.geo(DRUM, s.x, y + 0.55, s.z, 1.5, 0.4, 1.5, 1.1); S.geo(MONO, s.x, y + 2.7, s.z, 1.15, 4.0, 0.95, 0.4, 0.03, -0.04, [1.1, 1.08, 1.0]); S.box(s.x, y + 3.5, s.z, 1.7, 0.4, 0.7, 0.4, 0, 0.03); collide(s.x, s.z, 1.7);
      for (i = 0; i < 7; i++) { a = i / 7 * 6.2832; x = s.x + Math.cos(a) * 4.2; z = s.z + Math.sin(a) * 4.2; S.geo(MONO, x, FW.hAt(x, z) + 0.45, z, 0.5, 1.1 + rnd() * 0.6, 0.4, rnd() * 6, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3); collide(x, z, 0.4); }
      FW.relicSpots.push(S.stele(s.x + 2.8, s.z - 1.6));
    })();

    S.mesh(scene, FW.stone); Wd.mesh(scene, FW.wood);

    /* --- sandstone boulders --- */
    var Bk = new Builder();
    for (i = 0; i < 260; i++) { a = rnd() * 6.2832; var r = Math.sqrt(rnd()) * 230; x = Math.cos(a) * r; z = Math.sin(a) * r; y = FW.hAt(x, z); if (y < -1.5 || FW.pathDist(x, z) < 2.5 || onPier(x, z) || Math.hypot(x - SP0[0], z - SP0[1]) < 5) continue;
      var near = false, kk; for (kk in SI) if (Math.hypot(x - SI[kk].x, z - SI[kk].z) < Math.max(SI[kk].r, 12)) near = true; if (near) continue; if (y > 0.3 && y < 3 && rnd() < 0.6) continue;
      var sc = 0.35 + Math.pow(rnd(), 3.0) * 3.0 + FW.slopeAt(x, z) * 2.5; Bk.geo(ROCKS[i % 4], x, y + sc * 0.12, z, sc * (0.8 + rnd() * 0.7), sc * (0.55 + rnd() * 0.5), sc * (0.8 + rnd() * 0.5), rnd() * 6.28, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4, [0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2]);
      if (sc > 0.8) { collide(x, z, sc * 0.72); mk.stamp(x, z, sc * 1.25, 0, 0, 0.5); } }
    Bk.mesh(scene, FW.rockMat);
  }
});
var SP0 = [8, 60];
})(typeof window !== 'undefined' ? window : globalThis);
