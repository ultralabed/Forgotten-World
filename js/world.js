/* The Forgotten World — world: sky dome, sunlight, ground, and the stone material used by every ruin. */
(function () {
'use strict';
var FW = window.FW, T = THREE, m = FW.m, WATER = FW.WATER, SIZE = FW.SIZE, GRID = FW.GRID;

FW.uTime = { value: 0 };
FW.colliders = [];
/* the height you stand at: paved ring floor in the middle, the land everywhere else */
FW.groundY = function (x, z) { var d = Math.hypot(x, z); if (d < 17.4) return 2.5; if (d < 19.4) return 2.25; return FW.hAt(x, z); };

/* ---------- mask: where grass grows, where paths run, where trees shade the ground ---------- */
var MN = 1024, mask = new Uint8Array(MN * MN * 4);
FW.mask = {
  N: MN, data: mask,
  stamp: function (x, z, r, ch, val, soft) {          /* soft disc; val 0..255 is blended in */
    var c = (x / SIZE + 0.5) * MN, rz = (z / SIZE + 0.5) * MN, pr = r / SIZE * MN, i0 = Math.max(0, Math.floor(c - pr)), i1 = Math.min(MN - 1, Math.ceil(c + pr)),
      j0 = Math.max(0, Math.floor(rz - pr)), j1 = Math.min(MN - 1, Math.ceil(rz + pr)), i, j, d, t, k;
    for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) { d = Math.hypot(i - c, j - rz) / pr; if (d >= 1) continue;
      t = soft ? 1 - m.sstep(1 - soft, 1, d) : 1; k = (j * MN + i) * 4 + ch; mask[k] = mask[k] + (val - mask[k]) * t; }
  },
  grassAt: function (x, z) { var i = m.clamp(Math.round((x / SIZE + 0.5) * MN), 0, MN - 1), j = m.clamp(Math.round((z / SIZE + 0.5) * MN), 0, MN - 1); return mask[(j * MN + i) * 4] / 255; }
};
function buildMask() {
  var i, j, k, x, z, h, sl, g, pd, p, d;
  for (j = 0; j < MN; j++) for (i = 0; i < MN; i++) {
    x = ((i + 0.5) / MN - 0.5) * SIZE; z = ((j + 0.5) / MN - 0.5) * SIZE; d = Math.hypot(x, z); k = (j * MN + i) * 4;
    if (d > 300) { mask[k] = 0; mask[k + 1] = 0; mask[k + 2] = 0; mask[k + 3] = 255; continue; }
    h = FW.hAt(x, z); sl = FW.slopeAt(x, z);
    g = (1 - m.sstep(0.42, 0.62, sl)) * m.sstep(WATER + 0.15, WATER + 0.7, h) * (1 - m.sstep(40, 60, h));
    pd = FW.pathDist(x, z) + (m.vn(x * 0.35, z * 0.35) - 0.5) * 1.6; p = 1 - m.sstep(0.9, 2.3, pd);
    g *= m.sstep(1.3, 2.9, pd); if (d < 19.8) g = 0;
    g *= 0.55 + 0.45 * m.sstep(0.3, 0.55, m.fbm(x * 0.03 + 3, z * 0.03 + 8, 3));       /* thinner meadow in places */
    mask[k] = 255 * g; mask[k + 1] = 255 * p; mask[k + 2] = 0; mask[k + 3] = 255;
  }
}
FW.finishMask = function () {
  var t = new T.DataTexture(mask, MN, MN, T.RGBAFormat); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; t.needsUpdate = true; FW.maskTex.value = t;
};
FW.maskTex = { value: null };
FW.heightTex = { value: null };
var HMIN = -40, HRANGE = 360;
FW.GLSL_HEIGHT = [
  'uniform sampler2D uHeight;',
  'float fwH1(vec2 ij){ vec4 t = texture2D(uHeight, (ij + 0.5) / ' + (GRID + 1).toFixed(1) + '); return (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0 * ' + HRANGE.toFixed(1) + ' + (' + HMIN.toFixed(1) + '); }',
  'float fwHeight(vec2 xz){ vec2 f = clamp((xz / ' + SIZE.toFixed(1) + ' + 0.5) * ' + GRID.toFixed(1) + ', 0.0, ' + (GRID - 0.001).toFixed(3) + '); vec2 i = floor(f); vec2 u = f - i;',
  '  return mix(mix(fwH1(i), fwH1(i + vec2(1.0, 0.0)), u.x), mix(fwH1(i + vec2(0.0, 1.0)), fwH1(i + vec2(1.0, 1.0)), u.x), u.y); }'
].join('\n');
function buildHeightTex() {
  var n = GRID + 1, d = new Uint8Array(n * n * 4), i, v;
  for (i = 0; i < n * n; i++) { v = Math.round(m.clamp((FW.HG[i] - HMIN) / HRANGE, 0, 1) * 65535); d[i * 4] = v >> 8; d[i * 4 + 1] = v & 255; d[i * 4 + 3] = 255; }
  var t = new T.DataTexture(d, n, n, T.RGBAFormat); t.magFilter = t.minFilter = T.NearestFilter; t.needsUpdate = true; FW.heightTex.value = t;
}

/* ---------- sky ---------- */
function buildSky(scene) {
  var mat = new T.ShaderMaterial({
    uniforms: { uNoise: { value: FW.tex.noise }, uTime: FW.uTime },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: 'precision highp float; uniform sampler2D uNoise; uniform float uTime; varying vec3 vD;\n' + FW.GLSL_SKY +
      '\nvoid main(){ vec3 d = normalize(vD); vec3 c = fwSky(d); float mu = dot(d, FW_SUN);' +
      ' c += vec3(1.0, 0.93, 0.74) * smoothstep(0.99962, 0.99982, mu) * 2.0; c += vec3(1.0, 0.8, 0.5) * pow(max(mu, 0.0), 1400.0) * 0.4; gl_FragColor = vec4(c, 1.0); }',
    side: T.BackSide, depthWrite: false, depthTest: true, fog: false
  });
  var sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), mat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky); FW.sky = sky;

  /* far mountains: two jagged rings that the fog turns into pale layers */
  var r = m.RNG(5), ring, k, i, pos, idx, geo;
  for (ring = 0; ring < 2; ring++) {
    var n = 96, R = ring ? 1250 : 760, base = -30; pos = []; idx = [];
    for (i = 0; i <= n; i++) { var a = i / n * 6.2832, ai = i % n, hh = (ring ? 250 : 120) * (0.35 + 1.3 * Math.pow(m.fbm(Math.cos(a) * 2.2 + 4 + ring * 9, Math.sin(a) * 2.2 + 2, 4), 1.6)) + (m.h2(ai, ring) - 0.5) * 22;
      pos.push(Math.cos(a) * R, base, Math.sin(a) * R, Math.cos(a) * (R + 60), base + hh, Math.sin(a) * (R + 60)); if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); }
    geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    k = new T.Mesh(geo, new T.MeshBasicMaterial({ color: ring ? 0x39414a : 0x2c3a33, side: T.DoubleSide })); k.frustumCulled = false; scene.add(k);
  }
}

/* ---------- light ---------- */
function buildLight(scene) {
  var sun = FW.sunLight = new T.DirectionalLight(0xffc48a, 2.75); sun.castShadow = true;
  var s = FW.Q.shadow; sun.shadow.mapSize.set(s, s);
  var sc = sun.shadow.camera, R = FW.Q.shadowR; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 20; sc.far = 520; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
  scene.add(sun); scene.add(sun.target);
  scene.add(new T.HemisphereLight(0x9bb9dc, 0x4a3d2a, 0.72));
  FW.shadowCentre = new T.Vector3(1e9, 0, 0);
}
/* the shadow map only covers the land near you; it is redrawn when you have walked a little */
FW.updateShadow = function (renderer, p, force) {
  if (!force && Math.hypot(p.x - FW.shadowCentre.x, p.z - FW.shadowCentre.z) < FW.Q.shadowR * 0.22) return;
  FW.shadowCentre.set(Math.round(p.x / 4) * 4, 0, Math.round(p.z / 4) * 4);
  FW.sunLight.target.position.set(FW.shadowCentre.x, FW.hAt(FW.shadowCentre.x, FW.shadowCentre.z), FW.shadowCentre.z);
  FW.sunLight.position.copy(FW.sunLight.target.position).addScaledVector(FW.SUN, 260);
  FW.sunLight.target.updateMatrixWorld(); renderer.shadowMap.needsUpdate = true;
};

/* ---------- ground ---------- */
function buildTerrain(scene) {
  var g = new T.PlaneGeometry(SIZE, SIZE, GRID, GRID); g.rotateX(-Math.PI / 2); var p = g.attributes.position, i;
  for (i = 0; i < p.count; i++) p.setY(i, FW.HG[i]);
  g.computeVertexNormals();
  var mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uMask = FW.maskTex; sh.uniforms.uNoise = { value: FW.tex.noise };
    sh.uniforms.uGrass = { value: FW.tex.grass.map }; sh.uniforms.uGrassN = { value: FW.tex.grass.normal };
    sh.uniforms.uRock = { value: FW.tex.rock.map }; sh.uniforms.uRockN = { value: FW.tex.rock.normal }; sh.uniforms.uDirt = { value: FW.tex.dirt.map }; sh.uniforms.uDirtN = { value: FW.tex.dirt.normal };
    sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = position; vWN = normal;');
    sh.fragmentShader = 'varying vec3 vWP; varying vec3 vWN; uniform sampler2D uMask, uNoise, uGrass, uGrassN, uRock, uRockN, uDirt, uDirtN;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', [
        'vec2 xz = vWP.xz; vec4 msk = texture2D(uMask, xz / ' + SIZE.toFixed(1) + ' + 0.5);',
        'float macro = texture2D(uNoise, xz * 0.0057).r; float macro2 = texture2D(uNoise, xz * 0.027 + 0.4).g;',
        'vec3 gcol = mix(texture2D(uGrass, xz * 0.29).rgb, texture2D(uGrass, xz * 0.041).rgb, 0.5); gcol *= gcol;',
        'gcol *= mix(vec3(0.62, 0.80, 0.62), vec3(1.30, 1.16, 0.80), smoothstep(0.3, 0.7, macro));',
        'vec2 ruv = xz * 0.105 + vec2(0.0, vWP.y * 0.105); vec3 rcol = texture2D(uRock, ruv).rgb; rcol *= rcol; rcol *= mix(vec3(0.7), vec3(1.2, 1.14, 1.04), texture2D(uRock, xz * 0.013).a) * mix(vec3(0.8), vec3(1.1), macro2);',
        'vec3 dcol = texture2D(uDirt, xz * 0.33).rgb * (0.7 + 0.6 * texture2D(uDirt, xz * 1.37).a); dcol *= dcol;',
        'float slope = 1.0 - normalize(vWN).y;',
        'float rockAmt = smoothstep(0.13, 0.27, slope + (macro2 - 0.5) * 0.16 + smoothstep(30.0, 62.0, vWP.y) * 0.22);',
        'float shore = 1.0 - smoothstep(' + (WATER + 0.1).toFixed(2) + ', ' + (WATER + 1.3).toFixed(2) + ', vWP.y + (macro2 - 0.5) * 1.1);',
        'float dirtAmt = max(max(msk.g, shore * 0.92), (1.0 - msk.r) * 0.55 * (1.0 - rockAmt));',
        'vec3 tcol = mix(gcol, dcol * mix(vec3(1.0), vec3(0.72, 0.70, 0.66), shore), dirtAmt); tcol = mix(tcol, rcol, rockAmt);',
        'tcol *= mix(0.42, 1.0, smoothstep(' + (WATER - 0.5).toFixed(2) + ', ' + (WATER + 0.3).toFixed(2) + ', vWP.y));',
        'tcol *= 1.0 - msk.b * 0.6 * smoothstep(' + (FW.Q.shadowR * 0.72).toFixed(1) + ', ' + (FW.Q.shadowR * 0.98).toFixed(1) + ', distance(cameraPosition.xz, xz));',
        'diffuseColor.rgb *= tcol;'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        'vec3 wn = normalize(vWN);',
        'vec2 pn = mix(mix(texture2D(uGrassN, xz * 0.29).xy * 2.0 - 1.0, texture2D(uDirtN, xz * 0.33).xy * 2.0 - 1.0, dirtAmt) * 0.45, (texture2D(uRockN, ruv).xy * 2.0 - 1.0) * 1.25 / (1.0 + distance(cameraPosition, vWP) * 0.03), rockAmt);',
        'wn = normalize(vec3(wn.x + pn.x, wn.y, wn.z + pn.y)); normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);'
      ].join('\n'));
  };
  var mesh = new T.Mesh(g, mat); mesh.receiveShadow = true; scene.add(mesh); FW.terrain = mesh;
}

/* ---------- stone: textured from three sides using world position, mossy on top, dirty at the foot ---------- */
FW.stoneMaterial = function (tex, opts) {
  opts = opts || {};
  var mat = new T.MeshStandardMaterial({ color: opts.color || 0xffffff, roughness: 0.93, metalness: 0, vertexColors: true });
  var S = (opts.scale || 0.34).toFixed(3), moss = (opts.moss === undefined ? 1 : opts.moss).toFixed(2), bump = (opts.bump || 1.0).toFixed(2);
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uSt = { value: tex.map }; sh.uniforms.uStN = { value: tex.normal }; sh.uniforms.uNoise = { value: FW.tex.noise };
    sh.vertexShader = 'attribute float aG; varying vec3 vWP; varying vec3 vWN; varying float vG;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = normalize((modelMatrix * vec4(normal, 0.0)).xyz); vG = aG;');
    sh.fragmentShader = 'varying vec3 vWP; varying vec3 vWN; varying float vG; uniform sampler2D uSt, uStN, uNoise;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', [
        'vec3 wn0 = normalize(vWN); vec3 bw = pow(abs(wn0), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);',
        'vec2 ux = vWP.zy * ' + S + ', uy = vWP.xz * ' + S + ', uz = vWP.xy * ' + S + ';',
        'vec3 sc = texture2D(uSt, ux).rgb * bw.x + texture2D(uSt, uy).rgb * bw.y + texture2D(uSt, uz).rgb * bw.z;',
        'vec3 sc2 = texture2D(uSt, ux * 0.23 + 0.37).rgb * bw.x + texture2D(uSt, uy * 0.23 + 0.37).rgb * bw.y + texture2D(uSt, uz * 0.23 + 0.37).rgb * bw.z;',
        'sc = sc * (0.80 + 0.42 * dot(sc2, vec3(0.333))); sc *= sc;',
        'float mn = texture2D(uNoise, vWP.xz * 0.043 + vWP.y * 0.031).r + texture2D(uNoise, vWP.xz * 0.31).a * 0.35;',
        'float foot = 1.0 - smoothstep(0.0, 2.2, vG);',
        'float mossAmt = ' + moss + ' * smoothstep(0.64, 0.88, mn + foot * 0.28 + wn0.y * 0.26) * smoothstep(-0.2, 0.65, wn0.y);',
        'sc = mix(sc, vec3(0.075, 0.100, 0.036) * (0.6 + sc.g * 2.2), mossAmt);',
        'sc *= mix(0.50, 1.0, smoothstep(0.0, 1.1, vG)) * mix(0.82, 1.0, smoothstep(-0.6, 0.3, wn0.y));',
        'diffuseColor.rgb *= sc;'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        'vec3 tx = texture2D(uStN, ux).xyz * 2.0 - 1.0, ty = texture2D(uStN, uy).xyz * 2.0 - 1.0, tz = texture2D(uStN, uz).xyz * 2.0 - 1.0;',
        'float bs = ' + bump + ' * (1.0 - mossAmt * 0.6);',
        'vec3 wn = normalize(vec3(wn0.x, tx.y * bs + wn0.y, tx.x * bs + wn0.z) * bw.x + vec3(ty.x * bs + wn0.x, wn0.y, ty.y * bs + wn0.z) * bw.y + vec3(tz.x * bs + wn0.x, tz.y * bs + wn0.y, wn0.z) * bw.z);',
        'normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);'
      ].join('\n'));
  };
  return mat;
};

FW.initWorld = function (scene) {
  FW.patchFog();
  scene.fog = new T.FogExp2(0xc8b8a8, 0.01);       /* only switches fog on; the look comes from patchFog */
  FW.buildHeights(); buildHeightTex(); buildMask();
  FW.makeTextures();
  buildSky(scene); buildLight(scene); buildTerrain(scene);
  FW.stone = FW.stoneMaterial(FW.tex.stone, { scale: 0.34, bump: 1.1, moss: 0.85 });
  FW.rockMat = FW.stoneMaterial(FW.tex.rock, { scale: 0.21, bump: 1.5, moss: 1.25, color: 0xd8d2c8 });
};
})();
