/* The Forgotten World — flora: pine trees made of branch cards, bushes, ferns, and grass that follows the walker. */
(function () {
'use strict';
var FW = window.FW, T = THREE, m = FW.m, WATER = FW.WATER, SIZE = FW.SIZE;

FW.uSunV = { value: new T.Vector3() };          /* sun direction in view space, refreshed each frame */
FW.uCam = { value: new T.Vector3() };

/* shared tweaks for leafy Lambert materials: same light on both faces, wind, and a warm glow when the sun is behind */
function leafy(mat, o) {
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = FW.uTime; sh.uniforms.uSunV = FW.uSunV;
    if (o.uniforms) for (var k in o.uniforms) sh.uniforms[k] = o.uniforms[k];
    sh.vertexShader = 'uniform float uTime; uniform vec3 uSunV; varying float vBack;\n' + (o.vpars || '') + sh.vertexShader
      .replace('#include <begin_vertex>', o.begin || '#include <begin_vertex>')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vBack = pow(max(dot(normalize(mvPosition.xyz), uSunV), 0.0), 4.0);' + (o.vpost || ''));
    if (o.uv) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n' + o.uv);
    sh.fragmentShader = 'varying float vBack;\n' + (o.fpars || '') + sh.fragmentShader
      .replace(/\( gl_FrontFacing \) \? (\w+) : \w+/g, '$1')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (o.color || ''))
      .replace('#include <envmap_fragment>', 'outgoingLight += diffuseColor.rgb * vBack * vec3(1.0, 0.70, 0.34) * ' + (o.glow || 0.5).toFixed(2) + ';');
    FW.stats.leafPatched = sh.fragmentShader.indexOf('gl_FrontFacing') < 0;
  };
  return mat;
}

/* ---------- pine ---------- */
function pineGeometry(seed, H) {
  var r = m.RNG(seed), P = [], N = [], U = [], W = [], I = [], n = 0, i, k;
  function v(x, y, z, nx, ny, nz, u, vv, w) { P.push(x, y, z); var l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l); U.push(u, vv); W.push(w); return n++; }
  var sides = 7, segs = 5, r0 = 0.028 * H + 0.1;
  for (k = 0; k <= segs; k++) { var t = k / segs, rr = r0 * (1 - t * 0.92) * (k === 0 ? 1.5 : 1), y = t * H * 0.96 - (k === 0 ? 0.4 : 0);
    for (i = 0; i <= sides; i++) { var a = i / sides * 6.2832; v(Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(a), 0.15, Math.sin(a), 0.515 + (i / sides) * 0.47, 0.012 + t * 0.47, t * t * 0.25); } }
  for (k = 0; k < segs; k++) for (i = 0; i < sides; i++) { var a0 = k * (sides + 1) + i, b0 = a0 + sides + 1; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
  var levels = 15, lv, bare = 0.16 + r() * 0.12;
  for (lv = 0; lv < levels; lv++) {
    var tt = lv / (levels - 1), yy = H * (bare + (0.985 - bare) * Math.pow(tt, 0.92)), len = (Math.pow(1 - tt, 0.85) * 0.30 + 0.035) * H * (0.85 + r() * 0.3), cnt = tt > 0.8 ? 4 : tt > 0.5 ? 5 : 6, off = r() * 6.28, droop = 0.50 - tt * 0.95 + (r() - 0.5) * 0.2;
    for (i = 0; i < cnt; i++) {
      if (tt < 0.25 && r() < 0.3) continue;
      var az = off + i / cnt * 6.2832 + (r() - 0.5) * 0.5, L = len * (0.75 + r() * 0.45), dx = Math.cos(az), dz = Math.sin(az), cd = Math.cos(droop), sd = Math.sin(droop), wd = L * 0.5, px = -dz, pz = dx, tw = (r() - 0.5) * 1.1, s;
      var base = n;
      for (s = 0; s <= 2; s++) { var f = s / 2, sag = f * f * L * 0.24, cx = dx * L * f * cd, cy = yy - L * f * sd - sag, cz = dz * L * f * cd, ww = wd * (s === 0 ? 0.55 : 1), lift = Math.sin(tw) * ww;
        v(cx + px * ww, cy + lift, cz + pz * ww, dx * 0.55 + px * 0.25, 0.85, dz * 0.55 + pz * 0.25, 0.006 + f * 0.48, 0.008, 0.25 + f);
        v(cx - px * ww, cy - lift, cz - pz * ww, dx * 0.55 - px * 0.25, 0.85, dz * 0.55 - pz * 0.25, 0.006 + f * 0.48, 0.492, 0.25 + f); }
      I.push(base, base + 2, base + 1, base + 1, base + 2, base + 3, base + 2, base + 4, base + 3, base + 3, base + 4, base + 5);
    }
  }
  for (i = 0; i < 2; i++) { var ca = Math.cos(i * 1.57 + 0.4), sa = Math.sin(i * 1.57 + 0.4), tl = H * 0.13, tw2 = tl * 0.33, yb = H * 0.9, b2 = n;
    v(ca * tw2, yb, sa * tw2, ca, 0.8, sa, 0.006, 0.008, 0.6); v(-ca * tw2, yb, -sa * tw2, -ca, 0.8, -sa, 0.006, 0.492, 0.6); v(ca * tw2, yb + tl, sa * tw2, ca, 0.8, sa, 0.49, 0.008, 1.4); v(-ca * tw2, yb + tl, -sa * tw2, -ca, 0.8, -sa, 0.49, 0.492, 1.4);
    I.push(b2, b2 + 1, b2 + 2, b2 + 2, b2 + 1, b2 + 3); }
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aSway', new T.Float32BufferAttribute(W, 1)); g.setIndex(I);
  return g;
}
function palmGeometry(seed, H) {
  var r = m.RNG(seed), P = [], N = [], U = [], W = [], I = [], n = 0, i, k;
  function v(x, y, z, nx, ny, nz, u, vv, w) { P.push(x, y, z); var l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l); U.push(u, vv); W.push(w); return n++; }
  var sides = 9, segs = 8, lean = 0.12 + r() * 0.22, la = r() * 6.28, lx = Math.cos(la), lz = Math.sin(la);
  function axis(t) { return [lx * lean * t * t * H, t * H - 0.3, lz * lean * t * t * H]; }
  for (k = 0; k <= segs; k++) { var t = k / segs, c = axis(t), rr = (0.165 - 0.055 * t) * (1 + 0.5 * Math.exp(-t * 9)) * (H / 8 * 0.5 + 0.5);
    for (i = 0; i <= sides; i++) { var a = i / sides * 6.2832; v(c[0] + Math.cos(a) * rr, c[1], c[2] + Math.sin(a) * rr, Math.cos(a), 0.1, Math.sin(a), 0.515 + (i / sides) * 0.47, 0.012 + t * 0.47, 0.72 + t * 0.2); } }
  for (k = 0; k < segs; k++) for (i = 0; i < sides; i++) { var a0 = k * (sides + 1) + i, b0 = a0 + sides + 1; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
  var top = axis(1), fr = 15 + Math.floor(r() * 4), f;
  for (f = 0; f < fr; f++) {
    var az = f / fr * 6.2832 * 2.4 + r() * 0.4, e0 = 1.15 - (f / fr) * 1.5 + (r() - 0.5) * 0.25, L = (2.5 + r() * 1.1) * (H / 8 * 0.45 + 0.55), wd = 0.62 * L / 3, dx = Math.cos(az), dz = Math.sin(az), px = -dz, pz = dx, base = n, s, cx = top[0], cy = top[1] - 0.1, cz = top[2], S = 5;
    for (s = 0; s <= S; s++) { var q = s / S, ang = e0 - q * (1.25 + (1 - e0) * 0.35), ca = Math.cos(ang), sa = Math.sin(ang), ww = wd * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, q * 0.85 + 0.12)));
      v(cx + px * ww, cy + 0.06, cz + pz * ww, dx * 0.4 + px * 0.3, 0.9, dz * 0.4 + pz * 0.3, 0.006 + q * 0.488, 0.008, 0.9 + q * 1.2);
      v(cx - px * ww, cy + 0.06, cz - pz * ww, dx * 0.4 - px * 0.3, 0.9, dz * 0.4 - pz * 0.3, 0.006 + q * 0.488, 0.492, 0.9 + q * 1.2);
      cx += dx * ca * L / S; cy += sa * L / S; cz += dz * ca * L / S; }
    for (s = 0; s < S; s++) { var b = base + s * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aSway', new T.Float32BufferAttribute(W, 1)); g.setIndex(I);
  return g;
}
function share(g, cx, cy, cz, rad) { var c = new T.BufferGeometry(); c.attributes = g.attributes; c.index = g.index; c.boundingSphere = new T.Sphere(new T.Vector3(cx, cy, cz), rad); return c; }

FW.buildFlora = function (scene) {
  var rnd = m.RNG(99), atlas = FW.tex.foliage, Q = FW.Q, SI = FW.SITES, k, i;
  var treeMat = leafy(new T.MeshLambertMaterial({ map: atlas, alphaTest: 0.36, side: T.DoubleSide }), {
    vpars: 'attribute float aSway; varying float vShade;\n', glow: 0.5, fpars: 'varying float vShade;\n', color: 'diffuseColor.rgb *= vShade;',
    begin: '#include <begin_vertex>\n vShade = mix(0.42, 1.0, smoothstep(0.2, 1.0, aSway));\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.17;\n transformed.x += aSway * (sin(uTime * 1.1 + ph + position.y * 0.4) * 0.07 + sin(uTime * 2.7 + ph * 2.0 + position.x) * 0.025);\n transformed.z += aSway * sin(uTime * 0.9 + ph * 1.3 + position.y * 0.3) * 0.06;\n transformed.y += aSway * sin(uTime * 1.7 + ph + position.x * 1.3 + position.z) * 0.03;\n#endif'
  });
  var depthMat = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: atlas, alphaTest: 0.36, side: T.DoubleSide });
  var TC = FW.cfg.tree, palm = TC.kind === 'palm', variants = palm ? [palmGeometry(3, 8), palmGeometry(8, 10.5), palmGeometry(21, 6.5)] : [pineGeometry(3, 11), pineGeometry(8, 13.5), pineGeometry(21, 9)], VH = palm ? [8, 10.5, 6.5] : [11, 13.5, 9], TT = TC.tint || [0.80, 0.94, 0.74];

  /* choose places */
  var trees = [], tries = 0, a, r, x, z, y, s;
  function blocked(x, z, pad) { for (var q in SI) { var S = SI[q]; if (S.r && Math.hypot(x - S.x, z - S.z) < S.r + pad) return true; } return FW.pathDist(x, z) < 3.2; }
  var want = Math.round(Q.trees * (TC.amount === undefined ? 1 : TC.amount)), pk;
  while (trees.length < want && tries++ < 30000) {
    pk = TC.pick(rnd); x = pk[0]; z = pk[1]; y = FW.hAt(x, z);
    if (blocked(x, z, 3)) continue; s = TC.ok(x, z, y, FW.slopeAt(x, z), rnd); if (!s) continue;
    var ok = true; for (i = trees.length - 1; i >= 0 && i > trees.length - 60; i--) if (Math.hypot(trees[i].x - x, trees[i].z - z) < 2.4) { ok = false; break; } if (!ok) continue;
    trees.push({ x: x, z: z, y: y, s: s, v: Math.floor(rnd() * 3), ry: rnd() * 6.28, c: 0.78 + rnd() * 0.42, w: rnd() });
  }
  FW.trees = trees;
  /* spread into sky-view cells so whole groups can be skipped when off screen */
  var CELL = SIZE / 6, cells = {}, t, key, mat4 = new T.Matrix4(), e = new T.Euler(), q4 = new T.Quaternion(), p3 = new T.Vector3(), s3 = new T.Vector3(), col = new T.Color();
  var sx = -FW.SUN.x / Math.hypot(FW.SUN.x, FW.SUN.z), sz = -FW.SUN.z / Math.hypot(FW.SUN.x, FW.SUN.z);
  for (i = 0; i < trees.length; i++) { t = trees[i]; key = Math.floor((t.x + SIZE / 2) / CELL) + '_' + Math.floor((t.z + SIZE / 2) / CELL) + '_' + t.v; (cells[key] = cells[key] || []).push(t);
    FW.colliders.push({ x: t.x, z: t.z, r: 0.34 * t.s + 0.12 });
    var hh = VH[t.v] * t.s; var sl2 = hh * FW.SUN.y > 0 ? Math.min(2, Math.hypot(FW.SUN.x, FW.SUN.z) / FW.SUN.y) : 2;
    if (palm) FW.mask.stamp(t.x + sx * hh * sl2, t.z + sz * hh * sl2, 2.6 * t.s, 2, 200, 0.8);
    else { for (k = 0; k < 4; k++) FW.mask.stamp(t.x + sx * hh * (0.25 + k * 0.5), t.z + sz * hh * (0.25 + k * 0.5), 1.6 * t.s + (k < 2 ? 1.4 : 0.5) * t.s, 2, 235, 0.75);
      FW.mask.stamp(t.x, t.z, 1.5 * t.s, 0, 40, 0.8); } }
  for (key in cells) { var list = cells[key], kk = key.split('_'), cx = (+kk[0] + 0.5) * CELL - SIZE / 2, cz = (+kk[1] + 0.5) * CELL - SIZE / 2, vi = +kk[2];
    var im = new T.InstancedMesh(share(variants[vi], cx, 12, cz, CELL * 0.75 + 22), treeMat, list.length);
    for (i = 0; i < list.length; i++) { t = list[i]; e.set((rnd() - 0.5) * 0.07, t.ry, (rnd() - 0.5) * 0.07); q4.setFromEuler(e); p3.set(t.x, t.y, t.z); s3.set(t.s, t.s * (0.92 + t.w * 0.2), t.s); im.setMatrixAt(i, mat4.compose(p3, q4, s3));
      im.setColorAt(i, col.setRGB(TT[0] * t.c + t.w * 0.14, TT[1] * t.c, TT[2] * t.c)); }
    im.instanceColor.needsUpdate = true; im.castShadow = im.receiveShadow = true; im.customDepthMaterial = depthMat; scene.add(im); FW.stats.treeTris += variants[vi].index.count / 3 * list.length; }

  /* ---------- bushes and ferns ---------- */
  function cards(n, u0, v0, w, h, tilt, baseAtBottom) {
    var P = [], N = [], U = [], W = [], I = [], c;
    for (c = 0; c < n; c++) { var an = c / n * Math.PI * (baseAtBottom ? 2 : 1) + 0.3, ca = Math.cos(an), sa = Math.sin(an), b = c * 4;
      if (baseAtBottom) { var ox = ca * 0.1, oz = sa * 0.1, ex = ca * Math.sin(tilt) * h, ez = sa * Math.sin(tilt) * h, ey = Math.cos(tilt) * h, px = -sa * w / 2, pz = ca * w / 2;
        P.push(ox + px, 0, oz + pz, ox - px, 0, oz - pz, ox + ex + px, ey, oz + ez + pz, ox + ex - px, ey, oz + ez - pz); U.push(u0, v0 + 0.49, u0 + 0.49, v0 + 0.49, u0, v0, u0 + 0.49, v0); }
      else { P.push(-ca * w / 2, -0.12, -sa * w / 2, ca * w / 2, -0.12, sa * w / 2, -ca * w / 2, h, -sa * w / 2, ca * w / 2, h, sa * w / 2); U.push(u0, v0 + 0.49, u0 + 0.49, v0 + 0.49, u0, v0, u0 + 0.49, v0); }
      N.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); W.push(0, 0, 1, 1); I.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aSway', new T.Float32BufferAttribute(W, 1)); g.setIndex(I); return g;
  }
  var bushMat = leafy(new T.MeshLambertMaterial({ map: atlas, alphaTest: 0.4, side: T.DoubleSide }), { vpars: 'attribute float aSway;\n', glow: 0.5,
    begin: '#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.x += aSway * sin(uTime * 1.6 + instanceMatrix[3][0] * 0.5 + instanceMatrix[3][2] * 0.4) * 0.05;\n#endif' });
  function scatter(geo, list, shadow) { var im = new T.InstancedMesh(geo, bushMat, list.length), j, o;
    for (j = 0; j < list.length; j++) { o = list[j]; e.set(0, rnd() * 6.28, 0); q4.setFromEuler(e); p3.set(o.x, o.y, o.z); s3.set(o.s, o.s * (0.8 + rnd() * 0.4), o.s); im.setMatrixAt(j, mat4.compose(p3, q4, s3)); var c = 0.75 + rnd() * 0.5, BT = FW.cfg.bushTint || [1, 1, 0.85]; im.setColorAt(j, col.setRGB(c * (0.9 + rnd() * 0.2) * BT[0], c * BT[1], c * BT[2])); }
    im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = !!shadow; if (shadow) im.customDepthMaterial = depthMat; scene.add(im); }
  var bushes = [], ferns = [];
  tries = 0; while (bushes.length < Q.bushes && tries++ < 20000) { a = rnd() * 6.2832; r = 21 + Math.pow(rnd(), 0.8) * 235; x = Math.cos(a) * r; z = Math.sin(a) * r; y = FW.hAt(x, z);
    if (FW.slopeAt(x, z) > 0.55 || FW.pathDist(x, z) < 2.2 || FW.mask.grassAt(x, z) < 0.2 || !FW.cfg.bushOk(x, z, y, rnd)) continue;
    bushes.push({ x: x, y: y, z: z, s: 0.55 + rnd() * 0.75 }); }
  for (i = 0; i < trees.length && ferns.length < Q.ferns * (FW.cfg.ferns === undefined ? 1 : FW.cfg.ferns); i++) { t = trees[i]; for (k = 0; k < 2; k++) { a = rnd() * 6.28; r = 0.8 + rnd() * 3.2; x = t.x + Math.cos(a) * r; z = t.z + Math.sin(a) * r; if (FW.pathDist(x, z) < 1.8) continue; ferns.push({ x: x, y: FW.hAt(x, z), z: z, s: 0.6 + rnd() * 0.7 }); } }
  scatter(cards(3, 0, 0.505, 1.9, 1.5, 0, false), bushes, true); if (ferns.length) scatter(cards(6, 0.505, 0.505, 0.75, 1.25, 0.95, true), ferns, false);

  /* ---------- grass ---------- */
  var L = Q.grassL, nT = Q.tufts, quads = Q.coarse ? 2 : 3, GP = [], GN = [], GU = [], GI = [];
  for (k = 0; k < quads; k++) { var an = k / quads * Math.PI + 0.2, ca = Math.cos(an) * 0.5, sa = Math.sin(an) * 0.5, b = k * 4;
    GP.push(-ca, 0, -sa, ca, 0, sa, -ca, 1, -sa, ca, 1, sa); GN.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); GU.push(0.01, 0.99, 0.49, 0.99, 0.01, 0.01, 0.49, 0.01); GI.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); }
  var gg = new T.InstancedBufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(GP, 3)); gg.setAttribute('normal', new T.Float32BufferAttribute(GN, 3)); gg.setAttribute('uv', new T.Float32BufferAttribute(GU, 2)); gg.setIndex(GI);
  var off = new Float32Array(nT * 4); for (i = 0; i < nT; i++) { off[i * 4] = rnd() * L; off[i * 4 + 1] = rnd() * L; off[i * 4 + 2] = rnd(); off[i * 4 + 3] = rnd(); }
  gg.setAttribute('aOff', new T.InstancedBufferAttribute(off, 4)); gg.instanceCount = nT;
  var grassMat = leafy(new T.MeshLambertMaterial({ map: FW.tex.tuft, alphaTest: 0.5, side: T.DoubleSide }), {
    glow: 0.42,
    uniforms: { uCam: FW.uCam, uMask: FW.maskTex, uHeight: FW.heightTex, uNoise: { value: FW.tex.noise } },
    vpars: 'attribute vec4 aOff; uniform vec3 uCam; uniform sampler2D uMask, uNoise; varying vec3 vTint; varying float vRoot;\n' + FW.GLSL_HEIGHT + '\n',
    begin: [
      'float GL = ' + L.toFixed(1) + ';',
      'vec2 gw = aOff.xy + GL * floor((uCam.xz - aOff.xy) / GL + 0.5);',
      'float gd = distance(gw, uCam.xz);',
      'vec4 gmk = texture2D(uMask, gw / ' + SIZE.toFixed(1) + ' + 0.5);',
      'float gs = (1.0 - smoothstep(GL * 0.34, GL * 0.48, gd)) * smoothstep(aOff.z * 0.9 + 0.04, aOff.z * 0.9 + 0.24, gmk.r) * (0.42 + aOff.w * 0.5);',
      'float flower = step(0.955, fract(aOff.w * 7.31)) * step(0.5, texture2D(uNoise, gw * 0.021).b);',
      'float ga = aOff.z * 43.0; vec2 gp = vec2(position.x * cos(ga) - position.z * sin(ga), position.x * sin(ga) + position.z * cos(ga)) * (0.95 + flower * 0.2);',
      'float gwv = texture2D(uNoise, gw * 0.011 + uTime * vec2(0.031, 0.017)).r - 0.5;',
      'float gh = (0.85 + fract(aOff.w * 3.7) * 0.75 + flower * 0.2) * gs;',
      'vec3 transformed = vec3(gw.x + gp.x * gs, fwHeight(gw) - 0.09 * gs + position.y * gh, gw.y + gp.y * gs);',
      'transformed.xz += (vec2(gwv * 1.1, gwv * 0.7) + sin(uTime * 2.3 + gw.x * 0.9 + gw.y * 0.7) * 0.05) * position.y * gs;',
      'float gm = texture2D(uNoise, gw * 0.0057).r;',
      'vTint = mix(' + FW.pal.tintA + ', ' + FW.pal.tintB + ', smoothstep(0.3, 0.7, gm)) * (0.82 + fract(aOff.z * 11.3) * 0.36); vTint = mix(vTint, vec3(1.0), flower * 0.5);',
      'vRoot = 1.0 - position.y; vUv.x += flower * 0.5;'
    ].join('\n'),
    fpars: 'varying vec3 vTint; varying float vRoot;\n',
    color: 'diffuseColor.rgb *= vTint * mix(1.0, 0.66, vRoot * vRoot);'
  });
  var grass = new T.Mesh(gg, grassMat); grass.frustumCulled = false; grass.receiveShadow = true; scene.add(grass); FW.grass = grass;
};
})();
