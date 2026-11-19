/* The Forgotten World — core: noise, world layout, height field.
   Plain script (no modules). Everything hangs off the global FW. */
(function (root) {
'use strict';
var FW = root.FW = root.FW || {};

/* ---------- small maths ---------- */
function h2(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o) { var s = 0, a = 0.5; o = o || 5; for (var i = 0; i < o; i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }
function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function mix(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function RNG(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
/* periodic value noise, for tileable textures */
function vnP(x, y, p) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
  var a = h2(x0, y0), b = h2(x1, y0), c = h2(x0, y1), d = h2(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbmP(x, y, p, o) { var s = 0, a = 0.5; for (var i = 0; i < o; i++) { s += a * vnP(x + i * 17.3, y + i * 9.1, p); x *= 2; y *= 2; p *= 2; a *= 0.5; } return s; }
FW.m = { h2: h2, vn: vn, fbm: fbm, sstep: sstep, mix: mix, clamp: clamp, RNG: RNG, vnP: vnP, fbmP: fbmP };

/* ---------- world layout ---------- */
var WATER = FW.WATER = -3;
var SIZE = FW.SIZE = 640, GRID = FW.GRID = 256;           /* terrain: 640 m square, 256 cells a side */
FW.BOUND = 262;                                            /* how far the player may walk from the centre */
/* Landmarks. r = radius of ground that is levelled for it. */
var SITES = FW.SITES = {
  ring:    { x: 0,    z: 0,    r: 24, y: 2.5 },
  temple:  { x: -52,  z: -44,  r: 13, y: WATER + 0.9 },
  tower:   { x: 128,  z: -38,  r: 9 },
  hamlet:  { x: 62,   z: 124,  r: 24 },
  grove:   { x: -70,  z: 98,   r: 15 },
  arch:    { x: -168, z: 22,   r: 12 },
  aqua:    { x: 58,   z: -116, r: 0 }
};
/* footpaths between landmarks: lists of [x,z] */
FW.PATHS = [
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
function height(x, z) {
  var h = raw(x, z), k, s, d;
  h = mix(2, h, sstep(24, 62, Math.hypot(x, z)));
  for (k in SITES) { s = SITES[k]; if (!s.r || k === 'ring') continue;
    d = Math.hypot(x - s.x, z - s.z); if (d < s.r * 2.2) h = mix(s.y, h, sstep(s.r, s.r * 2.2, d)); }
  return h;
}
(function () { for (var k in SITES) { var s = SITES[k]; if (s.y === undefined) s.y = Math.max(WATER + 1.2, mix(2, raw(s.x, s.z), sstep(24, 62, Math.hypot(s.x, s.z)))); } })();
FW.heightFn = height;

/* height grid: every later lookup is a bilinear read of this, so grass, trees and the player agree with the mesh */
var HG = null, HN = GRID + 1;
FW.buildHeights = function () {
  HG = FW.HG = new Float32Array(HN * HN);
  for (var j = 0; j < HN; j++) for (var i = 0; i < HN; i++) HG[j * HN + i] = height((i / GRID - 0.5) * SIZE, (j / GRID - 0.5) * SIZE);
};
FW.hAt = function (x, z) {
  var fx = clamp((x / SIZE + 0.5) * GRID, 0, GRID - 0.001), fz = clamp((z / SIZE + 0.5) * GRID, 0, GRID - 0.001);
  var i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * HN + i;
  return (HG[k] * (1 - u) + HG[k + 1] * u) * (1 - v) + (HG[k + HN] * (1 - u) + HG[k + HN + 1] * u) * v;
};
FW.slopeAt = function (x, z) { var e = 1.5; return Math.hypot(FW.hAt(x + e, z) - FW.hAt(x - e, z), FW.hAt(x, z + e) - FW.hAt(x, z - e)) / (2 * e); };
/* distance from a point to the nearest footpath */
FW.pathDist = function (x, z) {
  var best = 1e9, P = FW.PATHS;
  for (var p = 0; p < P.length; p++) for (var i = 0; i < P[p].length - 1; i++) {
    var a = P[p][i], b = P[p][i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    var t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1), d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < best) best = d;
  }
  return best;
};
})(typeof window !== 'undefined' ? window : globalThis);
