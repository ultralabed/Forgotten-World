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
    V.fromBufferAttribute(pa, i).applyMatrix4(mat); this.P.push(V.x, V.y, V.z); this.G.push(this.noFoot ? 3 : V.y - FW.groundY(V.x, V.z));
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
FW.Builder = Builder;
FW.kit = { BOX: BOX, DRUM: DRUM, MONO: MONO, ROCKS: ROCKS, jitter: jitter, collide: collide, rnd: rnd, tintOf: tintOf };
FW.buildRuins = function (scene) { FW.cfg.buildRuins(scene); };
})();
