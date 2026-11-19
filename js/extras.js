/* The Forgotten World — extras: lake water, birds, drifting leaves and dust, and the soft glow / sun-ray pass. */
(function () {
'use strict';
var FW = window.FW, T = THREE, m = FW.m, WATER = FW.WATER, SIZE = FW.SIZE;
FW.noReflect = [];

/* ---------- water ---------- */
FW.buildWater = function (scene) {
  var Q = FW.Q, rt = null, texMat = new T.Matrix4(), WC = FW.cfg.water || {}, wS = WC.shallow || 'vec3(0.20, 0.23, 0.16)', wD = WC.deep || 'vec3(0.035, 0.085, 0.10)', wR = (WC.range || 3.0).toFixed(1), wSize = WC.size || SIZE;
  if (Q.reflect) { rt = new T.WebGLRenderTarget(Q.reflectSize, Q.reflectSize, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat }); rt.texture.encoding = T.sRGBEncoding; }
  var mat = new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 }, uNoise: { value: null }, uWave: { value: null }, uHeight: { value: null }, uRefl: { value: null }, uReflOn: { value: 0 }, uTexMat: { value: texMat } }]),
    vertexShader: 'uniform mat4 uTexMat; varying vec3 vW; varying vec4 vPr;\n#include <fog_pars_vertex>\nvoid main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vPr = uTexMat * w; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: [
      'precision highp float; uniform float uTime, uReflOn; uniform sampler2D uNoise, uWave, uRefl; varying vec3 vW; varying vec4 vPr;',
      '#include <fog_pars_fragment>', FW.GLSL_CLOUD, FW.GLSL_HEIGHT,
      'void main(){',
      '  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 V = toCam / dist;',
      '  vec2 nn = (texture2D(uWave, vW.xz * 0.085 + uTime * vec2(0.011, 0.006)).xy * 2.0 - 1.0) + (texture2D(uWave, vW.xz * 0.27 - uTime * vec2(0.012, 0.019)).xy * 2.0 - 1.0) * 0.7;',
      '  float k = 1.0 / (1.0 + dist * 0.012);',
      '  vec3 N = normalize(vec3(nn.x * 0.22 * k, 1.0, nn.y * 0.22 * k));',
      '  vec3 R = reflect(-V, N); R.y = abs(R.y);',
      '  vec3 sky = fwSky(R);',
      '  if (uReflOn > 0.5) { vec4 rf = texture2D(uRefl, vPr.xy / vPr.w + nn * 0.018 * k); sky = mix(sky, rf.rgb, smoothstep(0.05, 0.5, rf.a)); }',
      '  float depth = ' + WATER.toFixed(1) + ' - fwHeight(vW.xz);',
      '  float F = 0.035 + 0.965 * pow(1.0 - max(dot(V, N), 0.0), 5.0);',
      '  vec3 body = mix(' + wS + ', ' + wD + ', smoothstep(0.0, ' + wR + ', depth));',
      '  vec3 col = mix(body, sky, F);',
      '  float sd = max(dot(reflect(-V, normalize(vec3(nn.x * 0.5, 1.0, nn.y * 0.5))), FW_SUN), 0.0);',
      '  col += vec3(1.0, 0.86, 0.62) * (pow(sd, 260.0) * 2.2 + pow(sd, 30.0) * 0.10);',
      '  float foam = smoothstep(0.32, 0.02, depth) * smoothstep(0.35, 0.65, texture2D(uNoise, vW.xz * 0.21 + uTime * 0.01).r + 0.25 * sin(uTime * 0.9 + vW.x * 0.6 + vW.z * 0.4));',
      (WC.surf ? '  float sn = texture2D(uNoise, vW.xz * 0.013 + uTime * 0.004).g; foam = max(foam, smoothstep(0.80, 0.98, sin(depth * 4.5 + uTime * 1.1 + sn * 9.0)) * smoothstep(1.5, 0.05, depth) * (0.5 + sn)) ;' : ''),
      '  col = mix(col, ' + (WC.surf ? 'vec3(0.94, 0.95, 0.92), foam * 0.8' : 'vec3(0.80, 0.78, 0.72), foam * 0.5') + ');',
      '  float alpha = max(max(mix(' + (WC.clear || 0.30).toFixed(2) + ', 0.97, smoothstep(0.0, ' + (WC.alphaRange || 1.5).toFixed(1) + ', depth)), F), foam * 0.8);',
      '  gl_FragColor = vec4(col, alpha);',
      '  #include <fog_fragment>',
      '}'
    ].join('\n'),
    transparent: true, depthWrite: false, fog: true
  });
  mat.uniforms.uTime = FW.uTime; mat.uniforms.uNoise.value = FW.tex.noise; mat.uniforms.uWave.value = FW.tex.wave; mat.uniforms.uHeight = FW.heightTex; mat.uniforms.uTexMat.value = texMat; if (rt) mat.uniforms.uRefl.value = rt.texture;
  var mesh = new T.Mesh(new T.PlaneGeometry(wSize, wSize, 1, 1).rotateX(-Math.PI / 2), mat); mesh.position.y = WATER; mesh.renderOrder = 2; scene.add(mesh); FW.noReflect.push(mesh);

  /* mirrored camera, as in three.js Reflector */
  var vcam = new T.PerspectiveCamera(), plane = new T.Plane(), nrm = new T.Vector3(0, 1, 0), rp = new T.Vector3(0, WATER, 0), cw = new T.Vector3(), rot = new T.Matrix4(), look = new T.Vector3(), view = new T.Vector3(), target = new T.Vector3(), clip = new T.Vector4(), q = new T.Vector4();
  var lakes = (FW.cfg.lakes || []).map(function (l) { var v = new T.Vector3(l[0], WATER, l[1]); v.r = l[2]; return v; }), sph = new T.Sphere(), fr = new T.Frustum(), pm = new T.Matrix4();
  FW.water = { mesh: mesh, on: !!rt, tick: 0,
    render: function (renderer, scene, camera) {
      if (!rt || !this.on) { mat.uniforms.uReflOn.value = 0; return; }
      pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
      var seen = false, i; for (i = 0; i < lakes.length; i++) { sph.set(lakes[i], lakes[i].r); if (fr.intersectsSphere(sph) && camera.position.distanceTo(lakes[i]) < 170 + lakes[i].r) seen = true; }
      if (!seen || camera.position.y < WATER + 0.2) { mat.uniforms.uReflOn.value = 0; return; }
      cw.setFromMatrixPosition(camera.matrixWorld); rot.extractRotation(camera.matrixWorld);
      view.subVectors(rp, cw); view.reflect(nrm).negate(); view.add(rp);
      look.set(0, 0, -1).applyMatrix4(rot).add(cw); target.subVectors(rp, look); target.reflect(nrm).negate(); target.add(rp);
      vcam.position.copy(view); vcam.up.set(0, 1, 0).applyMatrix4(rot).reflect(nrm); vcam.lookAt(target); vcam.far = camera.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(camera.projectionMatrix);
      texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); texMat.multiply(vcam.projectionMatrix); texMat.multiply(vcam.matrixWorldInverse);
      plane.setFromNormalAndCoplanarPoint(nrm, rp); plane.applyMatrix4(vcam.matrixWorldInverse); clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      var pr = vcam.projectionMatrix.elements; q.x = (Math.sign(clip.x) + pr[8]) / pr[0]; q.y = (Math.sign(clip.y) + pr[9]) / pr[5]; q.z = -1; q.w = (1 + pr[10]) / pr[14];
      clip.multiplyScalar(2 / clip.dot(q)); pr[2] = clip.x; pr[6] = clip.y; pr[10] = clip.z + 1 - 0.003; pr[14] = clip.w;
      var hid = FW.noReflect, vis = [], old = renderer.getRenderTarget(), sa = renderer.shadowMap.autoUpdate, snu = renderer.shadowMap.needsUpdate;
      for (i = 0; i < hid.length; i++) { vis[i] = hid[i].visible; hid[i].visible = false; }
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, vcam);
      renderer.setRenderTarget(old); renderer.shadowMap.autoUpdate = sa; renderer.shadowMap.needsUpdate = snu;
      for (i = 0; i < hid.length; i++) hid[i].visible = vis[i];
      mat.uniforms.uReflOn.value = 1;
    } };
};

/* ---------- birds, leaves, dust ---------- */
FW.buildLife = function (scene) {
  var Q = FW.Q, rnd = m.RNG(555), i, g, n;
  /* birds: a body and two flapping wings each, circling in loose flocks */
  g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.45, 0.07, 0, -0.3, -0.07, 0, -0.3, 0.05, 0, 0.2, 0.05, 0, -0.18, 1.0, 0, -0.1, -0.05, 0, 0.2, -1.0, 0, -0.1, -0.05, 0, -0.18], 3));
  g.setAttribute('aTip', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 1, 0, 1, 0], 1));
  var flocks = FW.cfg.flocks, A = [], Bq = [];
  flocks.forEach(function (f, fi) { for (i = 0; i < f[4]; i++) { A.push(f[0] + (rnd() - 0.5) * 16, f[1] + (rnd() - 0.5) * 16, f[2] * (0.8 + rnd() * 0.4), f[3] + rnd() * 9); Bq.push(fi * 2.1 + rnd() * 0.9, (fi % 2 ? -1 : 1) * (0.085 + rnd() * 0.02) * 70 / f[2], 7 + rnd() * 3, 0.55 + rnd() * 0.3); } });
  g.setAttribute('aA', new T.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aB', new T.InstancedBufferAttribute(new Float32Array(Bq), 4)); g.instanceCount = A.length / 4;
  var birds = new T.Mesh(g, new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: 'attribute float aTip; attribute vec4 aA, aB; uniform float uTime;\n#include <fog_pars_vertex>\nvoid main(){ float an = aB.x + uTime * aB.y; vec3 c = vec3(aA.x + cos(an) * aA.z, aA.w + sin(uTime * 0.23 + aB.x * 3.0) * 4.0, aA.y + sin(an) * aA.z * 0.72);' +
      ' vec3 f = normalize(vec3(-sin(an), 0.0, cos(an) * 0.72)) * sign(aB.y); vec3 r = vec3(f.z, 0.0, -f.x); float fl = sin(uTime * aB.z + aB.x * 9.0) * (0.55 + 0.45 * sin(uTime * 0.6 + aB.x * 5.0));' +
      ' vec3 p = c + (r * position.x + f * position.z) * aB.w * 1.5 + vec3(0.0, aTip * fl * 0.75 * aB.w, 0.0); vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: 'precision highp float;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor = vec4(' + (FW.cfg.birdColor || '0.07, 0.065, 0.07') + ', 1.0);\n#include <fog_fragment>\n}',
    side: T.DoubleSide, fog: true }));
  birds.material.uniforms.uTime = FW.uTime; birds.frustumCulled = false; scene.add(birds);

  /* leaves and seeds: small tumbling flakes in a box that travels with you */
  n = FW.cfg.leaves === false ? 1 : Q.leaves; g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([-1, -0.6, 0, 1, -0.6, 0, -1, 0.6, 0, 1, 0.6, 0], 3)); g.setIndex([0, 1, 2, 2, 1, 3]);
  var lo = new Float32Array(n * 4), lc = new Float32Array(n * 3);
  for (i = 0; i < n; i++) { lo[i * 4] = rnd() * 44; lo[i * 4 + 1] = rnd() * 16; lo[i * 4 + 2] = rnd() * 44; lo[i * 4 + 3] = rnd(); var w = rnd(); lc[i * 3] = 0.55 + w * 0.4; lc[i * 3 + 1] = 0.36 + w * 0.36; lc[i * 3 + 2] = 0.10 + w * 0.12; }
  g.setAttribute('aOff', new T.InstancedBufferAttribute(lo, 4)); g.setAttribute('aCol', new T.InstancedBufferAttribute(lc, 3)); g.instanceCount = n;
  var leaves = new T.Mesh(g, new T.ShaderMaterial({ uniforms: { uTime: FW.uTime, uCam: FW.uCam },
    vertexShader: 'attribute vec4 aOff; attribute vec3 aCol; uniform float uTime; uniform vec3 uCam; varying vec3 vC; varying float vA;\nvoid main(){ vec3 B = vec3(44.0, 16.0, 44.0); vec3 o = aOff.xyz; o.y -= uTime * (0.45 + aOff.w * 0.5); o.x += uTime * 0.5 + sin(uTime * 0.7 + aOff.w * 40.0) * 0.8; o.z += uTime * 0.2 + cos(uTime * 0.5 + aOff.w * 31.0) * 0.8;' +
      ' vec3 w = o + B * floor((uCam - o) / B + 0.5); float a = uTime * (1.5 + aOff.w * 3.0) + aOff.w * 50.0; vec3 ax = vec3(cos(a), sin(a) * 0.7, sin(a * 0.7)); vec3 ay = normalize(cross(ax, vec3(sin(a * 0.4), cos(a * 0.6), 0.3)));' +
      ' w += (ax * position.x + ay * position.y) * (0.022 + aOff.w * 0.026); vec3 d = w - uCam; vA = 1.0 - smoothstep(15.0, 21.0, max(abs(d.x), abs(d.z))); vA *= smoothstep(1.5, 4.0, length(d)); vC = aCol * (0.55 + 0.6 * abs(ay.y));' +
      ' gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); if (vA < 0.02) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
    fragmentShader: 'precision highp float; varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC, vA); }', transparent: true, depthWrite: false, side: T.DoubleSide }));
  leaves.frustumCulled = false; leaves.visible = FW.cfg.leaves !== false; leaves.renderOrder = 3; scene.add(leaves); FW.noReflect.push(leaves);

  /* dust that catches the low sun */
  n = Q.motes; g = new T.BufferGeometry(); var mp = new Float32Array(n * 3), ms = new Float32Array(n);
  for (i = 0; i < n; i++) { mp[i * 3] = rnd() * 50; mp[i * 3 + 1] = rnd() * 12; mp[i * 3 + 2] = rnd() * 50; ms[i] = rnd(); }
  g.setAttribute('position', new T.BufferAttribute(mp, 3)); g.setAttribute('aS', new T.BufferAttribute(ms, 1));
  var motes = new T.Points(g, new T.ShaderMaterial({ uniforms: { uTime: FW.uTime, uCam: FW.uCam, uPx: { value: 1 } },
    vertexShader: 'attribute float aS; uniform float uTime, uPx; uniform vec3 uCam; varying float vA;\nvoid main(){ vec3 B = vec3(50.0, 12.0, 50.0); vec3 o = position; o.y += uTime * (0.08 + aS * 0.12); o.x += sin(uTime * 0.3 + aS * 60.0) * 0.6 + uTime * 0.15; o.z += cos(uTime * 0.27 + aS * 47.0) * 0.6;' +
      ' vec3 w = o + B * floor((uCam - o) / B + 0.5); vec4 mv = viewMatrix * vec4(w, 1.0); float d = -mv.z; vA = (0.35 + 0.65 * sin(uTime * (0.8 + aS) + aS * 30.0)) * smoothstep(1.0, 4.0, d) * (1.0 - smoothstep(16.0, 24.0, d));' +
      ' gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (0.028 + aS * 0.03) / max(d, 0.5); }',
    fragmentShader: 'precision highp float; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(p)); gl_FragColor = vec4(vec3(1.0, 0.83, 0.55) * a * vA * 0.75, 1.0); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  motes.frustumCulled = false; motes.renderOrder = 4; scene.add(motes); FW.noReflect.push(motes); FW.motes = motes;
};

/* ---------- glow, sun rays, colour finish ---------- */
FW.Post = function (renderer) {
  var Q = FW.Q, cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), scene = new T.Scene(), quad = new T.Mesh(new T.PlaneGeometry(2, 2), null); quad.frustumCulled = false; scene.add(quad);
  var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  function pass(fs, u) { return new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: 'precision highp float; varying vec2 vUv;\n' + fs, depthTest: false, depthWrite: false }); }
  var bright = pass('uniform sampler2D t; uniform vec2 px; void main(){ vec3 c = (texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + px).rgb) * 0.25; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.78, 1.0, l), 1.0); }', { t: { value: null }, px: { value: new T.Vector2() } });
  var blur = pass('uniform sampler2D t; uniform vec2 d; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227; c += (texture2D(t, vUv + d * 1.385).rgb + texture2D(t, vUv - d * 1.385).rgb) * 0.316; c += (texture2D(t, vUv + d * 3.231).rgb + texture2D(t, vUv - d * 3.231).rgb) * 0.0703; gl_FragColor = vec4(c, 1.0); }', { t: { value: null }, d: { value: new T.Vector2() } });
  var rays = pass('uniform sampler2D t; uniform vec2 sun; uniform float amt; void main(){ vec2 d = (sun - vUv) / 18.0 * 0.85; vec2 p = vUv; vec3 c = vec3(0.0); float w = 1.0; for (int i = 0; i < 18; i++) { c += texture2D(t, p).rgb * w; w *= 0.93; p += d; } gl_FragColor = vec4(c * amt / 9.0, 1.0); }', { t: { value: null }, sun: { value: new T.Vector2() }, amt: { value: 0 } });
  var fin = pass([
    'uniform sampler2D t, tb, tr; uniform float uTime, uRays, uBloom;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){ vec3 c = texture2D(t, vUv).rgb; vec3 b = texture2D(tb, vUv).rgb; vec3 r = texture2D(tr, vUv).rgb;',
    '  c += b * uBloom + r * uRays * vec3(1.0, 0.86, 0.66); c = clamp(c, 0.0, 1.0);',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(c, c * c * (3.0 - 2.0 * c), 0.28);',                                  /* a little contrast */
    '  c += vec3(-0.012, 0.004, 0.022) * (1.0 - l) + vec3(0.02, 0.008, -0.016) * l;', /* cool shadows, warm lights */
    '  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.06);',
    '  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.55;',
    '  c += (hash(vUv * 917.0 + uTime) - 0.5) * 0.022;',
    '  gl_FragColor = vec4(c, 1.0); }'
  ].join('\n'), { t: { value: null }, tb: { value: null }, tr: { value: null }, uTime: FW.uTime, uRays: { value: 0.6 }, uBloom: { value: FW.cfg.bloom || 0.32 } });
  var main, A, B, C, W = 0, H = 0, sv = new T.Vector3(), fwd = new T.Vector3();
  this.setSize = function (w, h) {
    W = Math.max(2, Math.floor(w)); H = Math.max(2, Math.floor(h)); if (main) { main.dispose(); A.dispose(); B.dispose(); C.dispose(); }
    var o = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat };
    main = (Q.msaa && renderer.capabilities.isWebGL2) ? new T.WebGLMultisampleRenderTarget(W, H, o) : new T.WebGLRenderTarget(W, H, o); if (main.isWebGLMultisampleRenderTarget) main.samples = 4;
    main.texture.encoding = T.sRGBEncoding;
    var w4 = Math.max(2, W >> 2), h4 = Math.max(2, H >> 2); o.depthBuffer = false; A = new T.WebGLRenderTarget(w4, h4, o); B = new T.WebGLRenderTarget(w4, h4, o); C = new T.WebGLRenderTarget(w4, h4, o);
  };
  function run(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(scene, cam); }
  this.render = function (world, camera) {
    renderer.setRenderTarget(main); renderer.render(world, camera);
    bright.uniforms.t.value = main.texture; bright.uniforms.px.value.set(1 / W, 1 / H); run(bright, A);
    var w4 = A.width, h4 = A.height, it;
    for (it = 0; it < 2; it++) { blur.uniforms.t.value = A.texture; blur.uniforms.d.value.set((1 + it * 1.2) / w4, 0); run(blur, B); blur.uniforms.t.value = B.texture; blur.uniforms.d.value.set(0, (1 + it * 1.2) / h4); run(blur, A); }
    camera.getWorldDirection(fwd); var vis = m.sstep(0.15, 0.6, fwd.dot(FW.SUN));
    if (vis > 0.01 && Q.rays) { sv.copy(camera.position).addScaledVector(FW.SUN, 1000).project(camera); rays.uniforms.t.value = A.texture; rays.uniforms.sun.value.set(sv.x * 0.5 + 0.5, sv.y * 0.5 + 0.5); rays.uniforms.amt.value = vis; run(rays, C); fin.uniforms.uRays.value = 0.42; }
    else fin.uniforms.uRays.value = 0;
    fin.uniforms.t.value = main.texture; fin.uniforms.tb.value = A.texture; fin.uniforms.tr.value = C.texture; run(fin, null);
  };
};
})();
