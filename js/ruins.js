/* The Forgotten World — ruins: every wall, column and arch is stacked from single stone blocks. */
(function () {
'use strict';
var FW = window.FW, T = THREE, m = FW.m, WATER = FW.WATER, rnd = m.RNG(1234);
var M = new T.Matrix4(), M2 = new T.Matrix4(), N3 = new T.Matrix3(), V = new T.Vector3(), Qn = new T.Quaternion(), E = new T.Euler(), S = new T.Vector3(), P = new T.Vector3();

function jitter(g, amt) {
  var p = g.attributes.position, i, x, y, z;
  for (i = 0; i < p.count; i++) { x = p.getX(i); y = p.getY(i); z = p.getZ(i);
    p.setXYZ(i, x + (m.h2(x * 13.1 + z * 7.7, y * 5.3) - 0.5) * amt, y + (m.h2(y * 9.7 + x * 3.1, z * 8.3) - 0.5) * amt, z + (m.h2(z * 11.3 + y * 4.1, x * 6.7) - 0.5) * amt); }
  g.computeVertexNormals(); return g;
}
var BOX = new T.BoxGeometry(1, 1, 1);
var DRUM = jitter(new T.CylinderGeometry(1, 1, 1, 16, 1), 0.05);
var MONO = (function () { var g = new T.BoxGeometry(1, 1, 1, 3, 7, 3), p = g.attributes.position, i; for (i = 0; i < p.count; i++) { var y = p.getY(i) + 0.5, k = 1 - y * 0.42; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } return jitter(g, 0.09); })();
var ROCKS = [0, 1, 2, 3].map(function (s) {
  var g = new T.SphereGeometry(1, 14, 10), p = g.attributes.position, i;
  for (i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i).normalize(); var k = 0.62 + 0.75 * m.fbm(V.x * 1.6 + V.y * 0.9 + s * 7.1, V.z * 1.6 - V.y * 0.7 + s * 3.3, 3); V.multiplyScalar(k); if (V.y < -0.35) V.y = -0.35 + (V.y + 0.35) * 0.25; p.setXYZ(i, V.x, V.y, V.z); }
  g.computeVertexNormals(); return g;
});

function Builder() { this.P = []; this.N = []; this.C = []; this.G = []; this.I = []; this.count = 0; }
Builder.prototype.add = function (geo, mat, tint) {
  N3.getNormalMatrix(mat); var pa = geo.attributes.position, na = geo.attributes.normal, base = this.count, i, ix = geo.index.array;
  for (i = 0; i < pa.count; i++) {
    V.fromBufferAttribute(pa, i).applyMatrix4(mat); this.P.push(V.x, V.y, V.z); this.G.push(V.y - FW.groundY(V.x, V.z));
    V.fromBufferAttribute(na, i).applyMatrix3(N3).normalize(); this.N.push(V.x, V.y, V.z); this.C.push(tint[0], tint[1], tint[2]);
  }
  for (i = 0; i < ix.length; i++) this.I.push(base + ix[i]); this.count += pa.count;
};
function tintOf() { var b = 0.80 + rnd() * 0.34, w = rnd() * 0.07; return [b + w, b, b - w * 0.8]; }
Builder.prototype.geo = function (g, x, y, z, sx, sy, sz, ry, rx, rz, tint) {
  E.set(rx || 0, ry || 0, rz || 0, 'YXZ'); Qn.setFromEuler(E); P.set(x, y, z); S.set(sx, sy, sz); this.add(g, M.compose(P, Qn, S), tint || tintOf());
};
Builder.prototype.box = function (x, y, z, sx, sy, sz, ry, rx, rz, tint) { this.geo(BOX, x, y, z, sx, sy, sz, ry, rx, rz, tint); };
Builder.prototype.mesh = function (scene, material) {
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(this.C, 3)); g.setAttribute('aG', new T.Float32BufferAttribute(this.G, 1));
  g.setIndex(this.count > 65535 ? new T.Uint32BufferAttribute(this.I, 1) : new T.Uint16BufferAttribute(this.I, 1)); g.computeBoundingSphere();
  var me = new T.Mesh(g, material); me.castShadow = me.receiveShadow = true; scene.add(me); FW.stats.stoneTris += this.I.length / 3; return me;
};
function collide(x, z, r) { FW.colliders.push({ x: x, z: z, r: r }); }

/* a wall of coursed blocks from (x0,z0) to (x1,z1); o.h is its height above the ground (number or fn(0..1)) */
Builder.prototype.wall = function (x0, z0, x1, z1, o) {
  var L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, yaw = Math.atan2(-uz, ux), bh = o.bh || 0.52, bl = o.bl || 1.15, th = o.th || 0.8, rag = o.rag === undefined ? 1.2 : o.rag;
  var H = typeof o.h === 'function' ? o.h : function () { return o.h; }, holes = o.holes || [], s, c, i, minG = 1e9, maxG = -1e9, maxH = 0, t;
  for (s = 0; s <= L; s += 0.5) { var gy0 = FW.groundY(x0 + ux * s, z0 + uz * s); minG = Math.min(minG, gy0); maxG = Math.max(maxG, gy0); maxH = Math.max(maxH, H(s / L)); }
  var baseY = minG - 0.45, courses = Math.ceil((maxG - baseY + maxH + rag) / bh), sd = rnd() * 100;
  for (c = 0; c < courses; c++) {
    var y = baseY + (c + 0.5) * bh; s = -(c % 2) * bl * 0.5 - rnd() * 0.2;
    while (s < L) {
      var bw = bl * (0.7 + rnd() * 0.6), a = Math.max(s, 0), b = Math.min(s + bw, L); s += bw; if (b - a < 0.22) continue;
      var mid = (a + b) / 2, px = x0 + ux * mid, pz = z0 + uz * mid, gy = FW.groundY(px, pz), rel = y - gy; t = mid / L;
      if (rel + bh * 0.5 < -0.55) continue;
      var top = H(t) + (m.fbm(mid * 0.55 + sd, c * 0.13 + sd, 2) - 0.5) * 2 * rag; if (rel > top) continue;
      var hit = false; for (i = 0; i < holes.length; i++) if (mid > holes[i].a && mid < holes[i].b && rel > holes[i].y0 && rel < holes[i].y1) hit = true; if (hit) continue;
      var loose = rel > top - bh * 1.5 ? 1 : 0;
      this.box(px + (rnd() - 0.5) * 0.05 * (1 + loose * 2), y, pz + (rnd() - 0.5) * 0.05 * (1 + loose * 2), (b - a) - 0.025, bh - 0.02, th * (0.93 + rnd() * 0.1), yaw + (rnd() - 0.5) * 0.03 * (1 + loose * 3), 0, (rnd() - 0.5) * 0.02 * loose);
    }
  }
  for (i = 0; i < holes.length; i++) if (holes[i].lintel) { var hm = (holes[i].a + holes[i].b) / 2, hx = x0 + ux * hm, hz = z0 + uz * hm;
    if (H(hm / L) > holes[i].y1) this.box(hx, FW.groundY(hx, hz) + holes[i].y1 + 0.2, hz, holes[i].b - holes[i].a + 0.9, 0.42, th * 1.06, yaw); }
  for (s = 0.3; s < L; s += 0.75) { t = s / L; var door = false; for (i = 0; i < holes.length; i++) if (s > holes[i].a && s < holes[i].b && holes[i].y0 < 0.8) door = true;
    if (!door && H(t) > 0.8) collide(x0 + ux * s, z0 + uz * s, th * 0.5 + 0.12); }
};
/* a column of drums */
Builder.prototype.column = function (x, z, y0, drums, r, cap, dh) {
  dh = dh || r * 1.8; var j;
  this.box(x, y0 + 0.17, z, r * 2.9, 0.34, r * 2.9, rnd() * 0.1);
  for (j = 0; j < drums; j++) this.geo(DRUM, x + (rnd() - 0.5) * 0.06, y0 + 0.34 + (j + 0.5) * dh, z + (rnd() - 0.5) * 0.06, r * (1 - j * 0.012), dh, r * (1 - j * 0.012), rnd() * 6.28);
  if (cap) { this.geo(DRUM, x, y0 + 0.34 + drums * dh + 0.12, z, r * 1.22, 0.24, r * 1.22, rnd() * 6); this.box(x, y0 + 0.34 + drums * dh + 0.42, z, r * 2.75, 0.36, r * 2.75, rnd() * 0.06); }
  collide(x, z, r * 1.45); return y0 + 0.34 + drums * dh + (cap ? 0.6 : 0);
};
/* a round arch standing on two piers; local x runs across the opening */
Builder.prototype.arch = function (cx, cz, yaw, o) {
  var R = o.span / 2, pw = o.pw, dep = o.depth, rt = o.rt || 0.75, bh = 0.6, F = new T.Matrix4().makeRotationY(yaw).setPosition(cx, 0, cz), self = this, k, y, x;
  function wp(lx, lz) { V.set(lx, 0, lz || 0).applyMatrix4(F); return V; }
  function put(lx, y, sx, sy, sz, rz) { E.set(0, 0, rz || 0); Qn.setFromEuler(E); P.set(lx, y, (rnd() - 0.5) * 0.06); S.set(sx, sy, sz); M2.compose(P, Qn, S); self.add(BOX, M.multiplyMatrices(F, M2), tintOf()); }
  var spring = o.spring;
  [-1, 1].forEach(function (sd) {
    if (o.skipPier === sd) return;
    var lx = sd * (R + pw / 2), w = wp(lx), g = FW.groundY(w.x, w.z); collide(w.x, w.z, Math.max(pw, dep) * 0.55);
    for (y = g - 0.6; y < spring; y += bh) put(lx + (rnd() - 0.5) * 0.04, Math.min(y + bh / 2, spring - bh / 2 + 0.001), pw * (0.96 + rnd() * 0.06), bh - 0.02, dep * (0.96 + rnd() * 0.06));
    put(lx, spring + 0.14, pw + 0.3, 0.28, dep + 0.3);
  });
  if (o.broken) return;
  var n = Math.max(7, Math.round(Math.PI * R / 0.72)) | 1, rm = R + rt / 2, tl = Math.PI * rm / n;
  for (k = 0; k < n; k++) { var a = (k + 0.5) / n * Math.PI; if (o.gap && k >= o.gap[0] && k <= o.gap[1]) continue; put(Math.cos(a) * rm, spring + 0.28 + Math.sin(a) * rm, tl * 1.02, rt, dep * (k === (n - 1) / 2 ? 1.08 : 1), a + Math.PI / 2); }
  if (o.fill) { var top = spring + 0.28 + R + rt + (o.over || 0.6), half = R + pw, bl = 1.25;
    for (y = spring + 0.28 + bh / 2; y < top; y += bh) { var off = (Math.round(y / bh) % 2) * bl * 0.5, last = y + bh >= top;
      for (x = -half - off; x < half; x += bl) { var a0 = Math.max(x, -half), b0 = Math.min(x + bl, half), mx = (a0 + b0) / 2; if (b0 - a0 < 0.2) continue;
        var dy = y - spring - 0.28, lim = R + rt + 0.1; if (!last) { if (Math.hypot(a0, dy - bh / 2) < lim && Math.hypot(b0, dy - bh / 2) < lim) continue; if (Math.hypot(mx, dy) < lim - 0.25) continue; }
        else if (Math.hypot(mx, dy - bh / 2) < R + rt - 0.1) continue;
        if (o.rag && m.fbm(mx * 0.4 + cx, y * 0.3 + cz, 2) + (y - spring) / (top - spring) * 0.35 > o.rag) continue;
        put(mx, y, b0 - a0 - 0.025, bh - 0.02, dep * (last ? 1.1 : 0.97 + rnd() * 0.05)); } } }
};
/* a round tower: courses of blocks set in a circle; top(angle) gives the wall height */
Builder.prototype.round = function (cx, cz, R, top, o) {
  var bh = 0.55, n = Math.round(6.2832 * R / 1.15), g0 = FW.groundY(cx, cz) - 0.5, maxH = o.maxH, c, k, th = o.th || 0.9;
  for (c = 0; c * bh < maxH + 0.5; c++) { var y = g0 + (c + 0.5) * bh, rel = y - g0 - 0.5;
    for (k = 0; k < n; k++) { var a = (k + (c % 2) * 0.5) / n * 6.2832, hh = top(a) + (m.fbm(a * 3 + c * 0.2, c * 0.3 + cx, 2) - 0.5) * (o.rag || 1.5); if (rel > hh) continue;
      var skip = false, da; (o.holes || []).forEach(function (h) { da = Math.atan2(Math.sin(a - h.a), Math.cos(a - h.a)); if (Math.abs(da) < h.w && rel > h.y0 && rel < h.y1) skip = true; }); if (skip) continue;
      this.box(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R, th * (0.95 + rnd() * 0.1), bh - 0.02, 6.2832 * R / n - 0.03, -a + (rnd() - 0.5) * 0.03); } }
  for (k = 0; k < n * 2; k++) { var a2 = k / (n * 2) * 6.2832, door = false; (o.holes || []).forEach(function (h) { var d2 = Math.atan2(Math.sin(a2 - h.a), Math.cos(a2 - h.a)); if (Math.abs(d2) < h.w && h.y0 < 0.8) door = true; });
    if (!door && top(a2) > 0.8) collide(cx + Math.cos(a2) * R, cz + Math.sin(a2) * R, th * 0.5 + 0.15); }
};
Builder.prototype.rubble = function (cx, cz, r, n, big) {
  for (var i = 0; i < n; i++) { var a = rnd() * 6.2832, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, s = 0.35 + rnd() * (big || 0.7), y = FW.groundY(x, z);
    if (y < WATER - 1.5) continue; this.box(x, y + s * 0.12, z, s * (1 + rnd()), s * (0.5 + rnd() * 0.3), s * (0.7 + rnd() * 0.5), rnd() * 6.28, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5); if (s > 0.75) collide(x, z, s * 0.6); }
};
Builder.prototype.stele = function (x, z) {
  var y = FW.groundY(x, z); this.box(x, y + 0.12, z, 1.5, 0.36, 1.5, rnd()); this.geo(MONO, x, y + 1.45, z, 0.8, 2.4, 0.55, rnd() * 6.28, 0.03, -0.03, [1.05, 1.02, 0.96]); collide(x, z, 0.85);
  return { x: x, z: z, y: y + 3.3 };
};

FW.relicSpots = [];
FW.buildRuins = function (scene) {
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
};
})();
