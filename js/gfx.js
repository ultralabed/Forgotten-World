/* The Forgotten World — gfx: sky + fog maths shared by every shader, and all textures (made by code). */
(function () {
'use strict';
var FW = window.FW, T = THREE, m = FW.m;

FW.SUN = new T.Vector3(-0.55, 0.335, -0.79).normalize();
function v3(v) { return 'vec3(' + v.x.toFixed(5) + ',' + v.y.toFixed(5) + ',' + v.z.toFixed(5) + ')'; }

/* One sky-colour function. The sky dome, the fog on every object and the water reflection all call it,
   so far things fade into exactly the colour of the sky behind them. Colours are display-space. */
FW.GLSL_ATMO = [
  'const vec3 FW_SUN = ' + v3(FW.SUN) + ';',
  'vec3 fwAtmoG(vec3 d, float glow){',
  '  float y = max(d.y, 0.0);',
  '  float mu = max(dot(d, FW_SUN), 0.0);',
  '  float flat_ = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(FW_SUN.x, 0.0, FW_SUN.z))), -1.0);',
  '  vec3 zen = vec3(0.20, 0.29, 0.47);',
  '  vec3 hor = mix(vec3(0.70, 0.65, 0.69), vec3(0.98, 0.76, 0.54), smoothstep(-0.6, 1.0, flat_));',
  '  vec3 c = mix(hor, zen, 1.0 - exp(-y * 3.2));',
  '  float low = exp(-y * 7.0);',
  '  c += glow * vec3(1.0, 0.56, 0.24) * pow(mu, 6.0) * (0.16 + 0.34 * low);',
  '  c += glow * vec3(1.0, 0.80, 0.52) * pow(mu, 64.0) * 0.30;',
  '  return c;',
  '}',
  'vec3 fwAtmo(vec3 d){ return fwAtmoG(d, 1.0); }'
].join('\n');

/* clouds on top of the sky colour; needs uniform sampler2D uNoise and float uTime */
FW.GLSL_CLOUD = [
  'float fwCloudN(vec2 p){ return texture2D(uNoise, p).r * 0.56 + texture2D(uNoise, p * 2.63 + 0.31).g * 0.29 + texture2D(uNoise, p * 6.1 + 0.57).b * 0.15; }',
  'vec3 fwSky(vec3 d){',
  '  vec3 c = fwAtmo(d);',
  '  if (d.y > 0.004) {',
  '    vec2 p = d.xz / (d.y + 0.16) * 0.085 + uTime * vec2(0.0016, 0.0007);',
  '    float n = fwCloudN(p);',
  '    float cov = smoothstep(0.43, 0.62, n);',
  '    float n2 = fwCloudN(p + normalize(FW_SUN.xz) * 0.022);',
  '    float lit = clamp((n - n2) * 5.0 + 0.45, 0.0, 1.0);',
  '    float mu = max(dot(d, FW_SUN), 0.0);',
  '    vec3 cl = mix(vec3(0.46, 0.41, 0.50), vec3(1.0, 0.83, 0.64), lit);',
  '    cl += vec3(1.0, 0.72, 0.42) * pow(mu, 10.0) * 0.45 * (1.0 - cov * 0.6);',
  '    cl = mix(fwAtmo(vec3(d.x, 0.0, d.z)), cl, smoothstep(0.0, 0.22, d.y));',
  '    c = mix(c, cl, cov * smoothstep(0.0, 0.06, d.y) * 0.92);',
  '  }',
  '  return c;',
  '}'
].join('\n');
FW.GLSL_SKY = FW.GLSL_ATMO + '\n' + FW.GLSL_CLOUD;

/* Replace three.js fog with height fog tinted by the sky in the viewing direction. */
FW.patchFog = function () {
  var C = T.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n varying vec3 vFogDir;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n vFogDir = vec3(dot(mvPosition.xyz, viewMatrix[0].xyz), dot(mvPosition.xyz, viewMatrix[1].xyz), dot(mvPosition.xyz, viewMatrix[2].xyz));\n#endif';
  C.fog_pars_fragment = [
    '#ifdef USE_FOG',
    'uniform vec3 fogColor; varying vec3 vFogDir;',
    '#ifdef FOG_EXP2',
    'uniform float fogDensity;',
    '#else',
    'uniform float fogNear; uniform float fogFar;',
    '#endif',
    FW.GLSL_ATMO,
    'vec3 fwFog(vec3 col){',
    '  float dist = length(vFogDir); vec3 fd = vFogDir / max(dist, 1e-4);',
    '  float camY = -dot(vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y), viewMatrix[3].xyz);',   /* camera height from the view matrix: not every material is given cameraPosition */
    '  float camH = max(camY - (' + FW.WATER.toFixed(1) + '), -10.0);',
    '  float t = 0.055 * fd.y * dist;',
    '  float integ = abs(t) > 0.002 ? (1.0 - exp(-t)) / t : 1.0;',
    '  float od = dist * (0.0021 + 0.0120 * exp(-0.055 * camH) * integ) * (fogDensity * 100.0);',
    '  float f = 1.0 - exp(-od);',
    '  vec3 fc = fwAtmoG(normalize(vec3(fd.x, abs(fd.y) * 0.25 + 0.03, fd.z)), 0.5) * 0.96;',
    '  return mix(col, fc, f);',
    '}',
    '#endif'
  ].join('\n');
  C.fog_fragment = '#ifdef USE_FOG\n gl_FragColor.rgb = fwFog(gl_FragColor.rgb);\n#endif';
};

/* ---------- textures ---------- */
function dataTex(n, data, srgb) {
  var t = new T.DataTexture(data, n, n, T.RGBAFormat);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = FW.Q ? FW.Q.aniso : 4; if (srgb) t.encoding = T.sRGBEncoding; t.needsUpdate = true; return t;
}
/* fn(u,v) -> [r,g,b,h]  colour 0..1 plus a height used for the normal map */
function surface(n, fn, bump) {
  var col = new Uint8Array(n * n * 4), H = new Float32Array(n * n), i, j, k, c;
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
    c = fn(i / n, j / n); k = (j * n + i) * 4; H[j * n + i] = c[3];
    col[k] = 255 * m.clamp(c[0], 0, 1); col[k + 1] = 255 * m.clamp(c[1], 0, 1); col[k + 2] = 255 * m.clamp(c[2], 0, 1); col[k + 3] = 255 * m.clamp(c[3], 0, 1);
  }
  var nrm = new Uint8Array(n * n * 4);
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
    var l = H[j * n + (i + n - 1) % n], r = H[j * n + (i + 1) % n], u = H[((j + n - 1) % n) * n + i], d = H[((j + 1) % n) * n + i];
    var nx = (l - r) * bump, ny = (u - d) * bump, il = 1 / Math.sqrt(nx * nx + ny * ny + 1); k = (j * n + i) * 4;
    nrm[k] = 255 * (nx * il * 0.5 + 0.5); nrm[k + 1] = 255 * (ny * il * 0.5 + 0.5); nrm[k + 2] = 255 * (il * 0.5 + 0.5); nrm[k + 3] = 255;
  }
  return { map: dataTex(n, col), normal: dataTex(n, nrm) };
}
function ridged(u, v, p, o) { var s = 0, a = 0.5, f = 1; for (var i = 0; i < o; i++) { s += a * (1 - Math.abs(2 * m.vnP(u * p * f + i * 5.3, v * p * f + i * 3.7, p * f) - 1)); f *= 2; a *= 0.5; } return s; }

FW.makeTextures = function () {
  var X = FW.tex = {}, n, d, i, j, k;
  /* noise: four different cloudy channels */
  n = 256; d = new Uint8Array(n * n * 4);
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) { k = (j * n + i) * 4; var u = i / n, v = j / n;
    d[k] = 255 * m.fbmP(u * 4, v * 4, 4, 5); d[k + 1] = 255 * m.fbmP(u * 4 + 9.2, v * 4 + 3.1, 4, 5);
    d[k + 2] = 255 * m.fbmP(u * 8 + 1.7, v * 8 + 6.4, 8, 4); d[k + 3] = 255 * m.fbmP(u * 16 + 4.4, v * 16 + 8.8, 16, 3); }
  X.noise = dataTex(n, d);

  /* meadow ground */
  X.grass = surface(256, function (u, v) {
    var a = m.fbmP(u * 6, v * 6, 6, 4), b = m.fbmP(u * 40 + 3, v * 40 + 7, 40, 2), s = m.vnP(u * 90, v * 24, 90) * m.vnP(u * 20 + 4, v * 70, 20);
    var dry = m.sstep(0.55, 0.75, m.fbmP(u * 3 + 8, v * 3 + 2, 3, 3));
    var g = 0.75 + 0.5 * b + 0.25 * s;
    return [(0.165 + 0.08 * a + 0.09 * dry) * g, (0.265 + 0.10 * a + 0.04 * dry) * g, (0.085 + 0.03 * a) * g, b * 0.6 + s * 0.4];
  }, 2.2);
  /* natural rock: layered, cracked */
  X.rock = surface(256, function (u, v) {
    var r = ridged(u, v, 5, 5), f = m.fbmP(u * 10 + 2, v * 10 + 5, 10, 4), strata = m.vnP(u * 3 + f * 1.5, v * 26 + f * 3, 26);
    var crack = m.sstep(0.0, 0.05, Math.abs(m.fbmP(u * 7 + 11, v * 7 + 70, 7, 4) - 0.5));
    var h = (r * 0.55 + strata * 0.25 + f * 0.2) * (0.35 + 0.65 * crack), b = 0.30 + h * 0.52;
    var warm = m.fbmP(u * 4 + 5, v * 4 + 1, 4, 3);
    return [b * (0.50 + 0.10 * warm), b * (0.47 + 0.06 * warm), b * (0.43 + 0.01 * warm), h];
  }, 4.5);
  /* worked stone for the ruins: pale, pitted, stained */
  X.stone = surface(512, function (u, v) {
    var f = m.fbmP(u * 8, v * 8, 8, 5), g = m.fbmP(u * 48 + 4, v * 48 + 9, 48, 3), big = m.fbmP(u * 3 + 7, v * 3 + 3, 3, 3);
    var pit = m.sstep(0.62, 0.74, m.fbmP(u * 26 + 31, v * 26 + 5, 26, 3));
    var crack = m.sstep(0.0, 0.018, Math.abs(m.fbmP(u * 4 + 11, v * 4 + 70, 4, 4) - 0.5));
    var chisel = m.fbmP(u * 96 + 3, v * 96 + 8, 96, 2);
    var h = (0.45 + f * 0.30 + g * 0.20 + chisel * 0.08) * (1 - pit * 0.40) * (0.78 + 0.22 * crack);
    var b = 0.50 + h * 0.62, stain = m.sstep(0.50, 0.72, big), lichen = m.sstep(0.66, 0.72, m.fbmP(u * 12 + 50, v * 12 + 20, 12, 4));
    var r = b * (0.63 - stain * 0.10), gg = b * (0.60 - stain * 0.085), bb = b * (0.54 - stain * 0.09);
    r = m.mix(r, 0.74, lichen * 0.55); gg = m.mix(gg, 0.72, lichen * 0.55); bb = m.mix(bb, 0.52, lichen * 0.55);
    return [r, gg, bb, h];
  }, 5.5);
  /* path dirt with pebbles */
  X.dirt = surface(256, function (u, v) {
    var f = m.fbmP(u * 8, v * 8, 8, 4), g = m.fbmP(u * 50 + 2, v * 50 + 6, 50, 2), peb = m.sstep(0.66, 0.74, m.fbmP(u * 22 + 13, v * 22 + 8, 22, 2));
    var b = 0.72 + f * 0.4 + g * 0.2;
    return [m.mix(0.37 * b, 0.55, peb), m.mix(0.30 * b, 0.52, peb), m.mix(0.21 * b, 0.47, peb), f * 0.5 + g * 0.2 + peb * 0.5];
  }, 3.5);
  /* small waves */
  X.wave = surface(256, function (u, v) { var h = m.fbmP(u * 6, v * 6, 6, 4) * 0.7 + ridged(u, v, 9, 3) * 0.3; return [h, h, h, h]; }, 3.0).normal;

  X.foliage = foliageAtlas();
  X.tuft = grassTufts();
};

/* canvas helpers: draw with 2D canvas, then fill the see-through pixels with a plain colour so edges never go dark */
function finish(cv, fill, srgbTex) {
  var w = cv.width, h = cv.height, im = cv.getContext('2d').getImageData(0, 0, w, h), d = im.data;
  for (var k = 0; k < d.length; k += 4) { var a = d[k + 3]; if (a < 255) { var t = a / 255, f = fill(k / 4 % w, Math.floor(k / 4 / w));
    d[k] = d[k] * t + f[0] * (1 - t); d[k + 1] = d[k + 1] * t + f[1] * (1 - t); d[k + 2] = d[k + 2] * t + f[2] * (1 - t); } }
  var t2 = new T.DataTexture(new Uint8Array(d.buffer), w, h, T.RGBAFormat);
  t2.magFilter = T.LinearFilter; t2.minFilter = T.LinearMipmapLinearFilter; t2.generateMipmaps = true; t2.anisotropy = 4;
  t2.encoding = T.sRGBEncoding; t2.needsUpdate = true; return t2;
}
function foliageAtlas() {
  var cv = document.createElement('canvas'); cv.width = cv.height = 512; var x = cv.getContext('2d'), r = m.RNG(31), i, j;
  x.lineCap = 'round';
  /* [0,0] pine branch, base at the left edge */
  function needles(x0, y0, x1, y1, len, dens) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, steps = Math.floor(L / dens);
    for (var s = 0; s <= steps; s++) { var t = s / steps, px = x0 + dx * t, py = y0 + dy * t;
      for (var side = -1; side <= 1; side += 2) { var a = Math.atan2(uy, ux) + side * (0.55 + r() * 0.5), l = len * (0.6 + r() * 0.6) * (1 - t * 0.35);
        x.strokeStyle = 'hsl(' + (92 + r() * 40) + ',' + (20 + r() * 18) + '%,' + (9 + r() * 14) + '%)'; x.lineWidth = 1.2 + r() * 0.9;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); } }
  }
  x.strokeStyle = '#2b2015'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 128); x.lineTo(246, 128); x.stroke();
  for (i = 0; i < 15; i++) { var t = 0.06 + i / 15 * 0.9, bx = t * 246, side = i % 2 ? 1 : -1, bl = (1 - t) * 104 + 14, ang = side * (0.62 + r() * 0.25);
    var ex = Math.min(250, bx + Math.cos(ang) * bl), ey = 128 + Math.sin(ang) * bl;
    x.strokeStyle = '#2b2015'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(bx, 128); x.lineTo(ex, ey); x.stroke(); needles(bx, 128, ex, ey, 13, 2.2);
    if (bl > 50) { var mx = (bx + ex) / 2, my = (128 + ey) / 2, a2 = ang - side * 0.75, e2x = Math.min(250, mx + Math.cos(a2) * bl * 0.45), e2y = my + Math.sin(a2) * bl * 0.45; needles(mx, my, e2x, e2y, 10, 2.4); } }
  needles(0, 128, 248, 128, 14, 2.0);
  /* [1,0] bark */
  x.fillStyle = '#2b231d'; x.fillRect(256, 0, 256, 256);
  for (i = 0; i < 520; i++) { var px = 256 + r() * 256, py = r() * 256, l = 14 + r() * 60;
    x.strokeStyle = r() < 0.5 ? 'rgba(20,14,9,' + (0.25 + r() * 0.4) + ')' : 'rgba(96,86,74,' + (0.15 + r() * 0.3) + ')'; x.lineWidth = 1 + r() * 3;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (r() - 0.5) * 9, py + l / 2, Math.min(511, Math.max(257, px + (r() - 0.5) * 7)), py + l); x.stroke(); }
  /* [0,1] round-leaf bush clump */
  x.save(); x.beginPath(); x.rect(0, 256, 256, 256); x.clip();
  var lobes = [[78, 420, 62], [132, 372, 70], [186, 414, 60], [108, 452, 52], [160, 458, 50], [128, 316, 40], [60, 470, 34], [204, 468, 36]];
  for (i = 0; i < 1100; i++) { var lb = lobes[Math.floor(r() * lobes.length)], a = r() * 6.283, rr = Math.pow(r(), 0.55) * lb[2], cx = lb[0] + Math.cos(a) * rr, cy = Math.min(506, lb[1] + Math.sin(a) * rr * 0.9), s = 3.2 + r() * 3.6, depth = i / 1100;
    x.save(); x.translate(cx, cy); x.rotate(r() * 6.283); x.fillStyle = 'hsl(' + (74 + r() * 36) + ',' + (26 + r() * 20) + '%,' + (8 + depth * 15 + r() * 9) + '%)';
    x.beginPath(); x.ellipse(0, 0, s, s * 0.5, 0, 0, 6.283); x.fill(); x.restore(); }
  x.restore();
  /* [1,1] fern frond, base at the bottom */
  x.save(); x.beginPath(); x.rect(256, 256, 256, 256); x.clip();
  x.strokeStyle = '#33401a'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(384, 510); x.lineTo(384, 262); x.stroke();
  for (i = 0; i < 30; i++) { var tt = i / 30, yy = 500 - tt * 232, w = (1 - tt) * 86 + 8;
    for (j = -1; j <= 1; j += 2) { x.save(); x.translate(384, yy); x.rotate(j * (1.05 - tt * 0.25) - Math.PI / 2 + (j < 0 ? 0 : 0));
      x.fillStyle = 'hsl(' + (86 + r() * 26) + ',' + (36 + r() * 16) + '%,' + (14 + r() * 13) + '%)';
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(w * 0.5, -7, w, 0); x.quadraticCurveTo(w * 0.5, 7, 0, 0); x.fill(); x.restore(); } }
  x.restore();
  return finish(cv, function (px, py) { return px < 256 && py < 256 ? [26, 36, 22] : px >= 256 && py < 256 ? [43, 35, 29] : [34, 50, 22]; });
}
function grassTufts() {
  var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; var x = cv.getContext('2d'), r = m.RNG(77), q, i;
  x.lineCap = 'round';
  for (q = 0; q < 2; q++) {
    var ox = q * 256, tips = [];
    x.save(); x.beginPath(); x.rect(ox + 2, 0, 252, 256); x.clip();
    for (i = 0; i < 96; i++) {
      var bx = ox + 128 + (r() - 0.5) * 120, lean = (bx - ox - 128) / 75 * 0.5 + (r() - 0.5) * 0.9, hgt = 110 + r() * 138, tx = bx + lean * hgt * 0.55, ty = 256 - hgt;
      var g = x.createLinearGradient(0, 256, 0, ty), hue = 66 + r() * 34, lt = 17 + r() * 13;
      g.addColorStop(0, 'hsl(' + (hue + 14) + ',30%,' + (lt * 0.45) + '%)'); g.addColorStop(0.55, 'hsl(' + hue + ',33%,' + lt + '%)'); g.addColorStop(1, 'hsl(' + (hue - 12) + ',36%,' + (lt + 12) + '%)');
      x.fillStyle = g; var w = 2.0 + r() * 2.6, cxp = bx + lean * hgt * 0.12, cyp = 256 - hgt * 0.6;
      x.beginPath(); x.moveTo(bx - w, 258); x.quadraticCurveTo(cxp - w * 0.6, cyp, tx, ty); x.quadraticCurveTo(cxp + w * 0.7, cyp, bx + w, 258); x.closePath(); x.fill();
      if (hgt > 185) tips.push([tx, ty]);
    }
    if (q === 1) tips.forEach(function (p, k) { if (k % 2) return; var hue = r() < 0.5 ? 48 : r() < 0.6 ? 285 : 0, white = hue === 0;
      for (var a = 0; a < 6; a++) { x.fillStyle = white ? 'hsl(50,30%,' + (82 + r() * 12) + '%)' : 'hsl(' + hue + ',62%,' + (58 + r() * 14) + '%)';
        x.beginPath(); x.ellipse(p[0] + Math.cos(a * 1.047) * 4.6, p[1] + 5 + Math.sin(a * 1.047) * 4.6, 3.6, 2.2, a * 1.047, 0, 6.283); x.fill(); }
      x.fillStyle = '#e0a52c'; x.beginPath(); x.arc(p[0], p[1] + 5, 2.4, 0, 6.283); x.fill(); });
    x.restore();
  }
  return finish(cv, function () { return [70, 84, 42]; });
}
FW.util = { dataTex: dataTex };
})();
