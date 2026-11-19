/* The Forgotten World — game: start-up, walking, relics, sound, and the frame loop. */
(function () {
'use strict';
function $(id) { return document.getElementById(id); }
var FW = window.FW, T = window.THREE, opts = window.FW_OPTS || {};
if (!T || !FW) { $('fail').hidden = false; $('intro').hidden = true; return; }
var m = FW.m, WATER = FW.WATER, COARSE = opts.coarse !== undefined ? opts.coarse : !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
$('how').textContent = COARSE ? 'Left thumb walks. Right thumb looks around.' : 'Drag to look. W A S D or arrow keys to walk. Hold Shift to run.';

/* quality: a lighter set for phones; it also steps down by itself if frames get slow */
var Q = FW.Q = {
  coarse: COARSE, dpr: opts.dpr || Math.min(window.devicePixelRatio || 1, COARSE ? 1.6 : 2), aniso: COARSE ? 2 : 4,
  shadow: COARSE ? 1024 : 2048, shadowR: COARSE ? 52 : 70, trees: COARSE ? 620 : 1150, bushes: COARSE ? 260 : 520, ferns: COARSE ? 500 : 1100,
  tufts: COARSE ? 15000 : 40000, grassL: COARSE ? 44 : 62, leaves: COARSE ? 70 : 160, motes: COARSE ? 220 : 500,
  reflect: !COARSE, reflectSize: 512, msaa: !COARSE, rays: true, post: true
};
FW.stats = { stoneTris: 0, treeTris: 0 };

var LORE = [
  'They raised the ring to count the seasons. Then the seasons stopped coming.',
  'The lake rose one step each year. They kept praying from the step above.',
  'Someone lit this every night, long after anyone was left to see it.',
  'A name was carved here. Rain took the letters and kept the stone.',
  'Nine stones for nine promises. One has lain down to rest.',
  'A door for the sun to walk through. It still comes, every evening.',
  'The water was carried here from far away. It left, and its road stayed.'
];
var PLACES = [['ring', 'The Ring', 26], ['temple', 'The Drowned Steps', 22], ['tower', 'The Watchfire', 20], ['hamlet', 'Hollow Home', 26], ['grove', 'The Nine', 18], ['arch', 'The Sun Door', 24], ['aqua', 'The Dry River', 20]];

var renderer, scene, camera, post, relics = [], found = 0, orb, orbL, relicL, beam;
var pos = new T.Vector3(0, 0, 66), yaw = 0, pitch = 0.09, eye = 0, keys = {}, move = { x: 0, y: 0 }, entered = false, walked = 0, stepAt = 0, seen = {};

function build() {
  try { renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' }); } catch (e) { $('fail').hidden = false; $('intro').hidden = true; return; }
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = COARSE ? T.PCFShadowMap : T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  scene = FW.scene = new T.Scene(); camera = FW.camera = new T.PerspectiveCamera(62, 1, 0.15, 2400);
  FW.initWorld(scene); FW.buildRuins(scene); FW.buildFlora(scene); FW.finishMask(); FW.buildWater(scene); FW.buildLife(scene); FW.noReflect.push(FW.grass, FW.sky);
  buildRelics();
  post = Q.post ? new FW.Post(renderer) : null;
  window.addEventListener('resize', resize); resize();
  eye = FW.groundY(pos.x, pos.z) + 1.7;
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { x: pos.x, z: pos.z, yaw: yaw, found: relics.map(function (r) { return r.found; }), entered: entered }; });
  if (hot && hot.data && hot.data.found) { pos.x = hot.data.x; pos.z = hot.data.z; yaw = hot.data.yaw; hot.data.found.forEach(function (f, i) { if (f && relics[i]) mark(relics[i], true); }); }
  $('intro').classList.remove('loading'); var b = $('enter'); b.disabled = false; b.textContent = 'Enter'; b.onclick = enter;
  requestAnimationFrame(frame);
}
function resize() {
  var w = window.innerWidth, h = window.innerHeight; renderer.setPixelRatio(Q.dpr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 74 : 62; camera.updateProjectionMatrix(); if (post) post.setSize(w * Q.dpr, h * Q.dpr);
  if (FW.motes) FW.motes.material.uniforms.uPx.value = h * Q.dpr / (2 * Math.tan(camera.fov * Math.PI / 360));
}

/* ---------- relics ---------- */
function buildRelics() {
  var gc = document.createElement('canvas'); gc.width = gc.height = 64; var gx = gc.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
  var glowTex = new T.CanvasTexture(gc);
  var gem = new T.OctahedronGeometry(0.24, 0), pg = new T.CylinderGeometry(0.5, 0.5, 1, 14, 1, true);
  function beamMat(col) { return new T.ShaderMaterial({ uniforms: { uCol: { value: new T.Color(col) }, uAmt: { value: 0.22 }, uTime: FW.uTime },
    vertexShader: 'varying vec2 vUv; varying float vF; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vF = abs(dot(n, normalize(mv.xyz))); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'precision highp float; uniform vec3 uCol; uniform float uAmt, uTime; varying vec2 vUv; varying float vF; varying float vD; void main(){ float a = pow(vF, 2.0) * pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.04, vUv.y) * (0.8 + 0.2 * sin(uTime * 1.7 + vUv.y * 30.0)); a *= uAmt * (0.35 + 0.65 * exp(-vD * 0.006)) * smoothstep(2.0, 9.0, vD); gl_FragColor = vec4(uCol * a, 1.0); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }); }
  FW.relicSpots.forEach(function (s, i) {
    var mat = new T.MeshBasicMaterial({ color: 0x58d6c0, fog: false, toneMapped: false }), g = new T.Mesh(gem, mat); g.position.set(s.x, s.y, s.z); scene.add(g);
    var halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x7fe3d0, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55 })); halo.scale.set(2.6, 2.6, 1); g.add(halo);
    var bm = beamMat(0x7fe3d0), b = new T.Mesh(pg, bm); b.scale.set(0.8, 90, 0.8); b.position.set(s.x, s.y + 45, s.z); b.renderOrder = 5; scene.add(b); FW.noReflect.push(b);
    relics.push({ x: s.x, z: s.z, y: s.y, gem: g, mat: mat, halo: halo, beam: bm, found: false, i: i });
  });
  orb = new T.Mesh(new T.SphereGeometry(0.34, 24, 16), new T.MeshBasicMaterial({ color: 0xb4fff0, fog: false })); var oh = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x9ff5e2, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.7 })); oh.scale.set(5, 5, 1); orb.add(oh); orb.position.set(0, 13.2, 0); scene.add(orb);
  orbL = new T.PointLight(0x7fe3d0, 1.0, 38, 2); orbL.position.copy(orb.position); scene.add(orbL);
  relicL = new T.PointLight(0x7fe3d0, 0, 15, 2); scene.add(relicL);
  var bm = beamMat(0xffdca0); beam = new T.Mesh(pg, bm); beam.scale.set(5, 260, 5); beam.position.set(0, 142, 0); beam.renderOrder = 5; beam.visible = false; scene.add(beam); beam.userData.mat = bm; FW.noReflect.push(beam);
}
function mark(r, quiet) {
  r.found = true; found++; r.mat.color.setHex(0xffd08a); r.halo.material.color.setHex(0xffc070); r.beam.uniforms.uCol.value.setHex(0xffc878); r.beam.uniforms.uAmt.value = 0.16;
  $('count').textContent = 'Relics ' + found + ' / ' + relics.length;
  if (found === relics.length) { beam.visible = true; beam.userData.mat.uniforms.uAmt.value = 0.9; }
  if (!quiet) { chime(r.i); toast(found < relics.length ? LORE[r.i] : LORE[r.i] + ' All seven are awake. Look to the ring.', found < relics.length ? 7500 : 12000); }
}

/* ---------- walking ---------- */
function tryMove(dx, dz) {
  var nx = pos.x + dx, nz = pos.z + dz, c = FW.colliders, i, o, ex, ez, d, r;
  if (Math.hypot(nx, nz) > FW.BOUND) return; if (Math.hypot(nx, nz) > 19.5 && FW.hAt(nx, nz) < WATER + 0.3) return;
  for (i = 0; i < c.length; i++) { o = c[i]; ex = nx - o.x; if (ex > 4 || ex < -4) continue; ez = nz - o.z; d = Math.hypot(ex, ez); r = o.r + 0.35; if (d < r && d > 0.0001) { nx = o.x + ex / d * r; nz = o.z + ez / d * r; } }
  pos.x = nx; pos.z = nz;
}
window.addEventListener('keydown', function (e) { keys[e.code] = true; if (entered && /^Arrow|Space/.test(e.code)) e.preventDefault(); });
window.addEventListener('keyup', function (e) { keys[e.code] = false; });
window.addEventListener('blur', function () { keys = {}; });
var cvs = $('gl'), ptrs = {}, stickEl = $('stick'), knob = stickEl.firstElementChild;
cvs.addEventListener('pointerdown', function (e) {
  if (!entered) return; try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  var st = e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45 && !stickBusy(); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, stick: st };
  if (st) { stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.hidden = false; knob.style.transform = ''; } e.preventDefault();
});
function stickBusy() { for (var k in ptrs) if (ptrs[k].stick) return true; return false; }
cvs.addEventListener('pointermove', function (e) {
  var p = ptrs[e.pointerId]; if (!p) return;
  if (p.stick) { var dx = e.clientX - p.ox, dy = e.clientY - p.oy, l = Math.hypot(dx, dy), k2 = Math.min(l, 48) / (l || 1); move.x = dx * k2 / 48; move.y = dy * k2 / 48; knob.style.transform = 'translate(' + dx * k2 + 'px,' + dy * k2 + 'px)'; }
  else { var k = e.pointerType === 'touch' ? 0.0055 : 0.0034; yaw -= (e.clientX - p.x) * k; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - p.y) * k)); }
  p.x = e.clientX; p.y = e.clientY;
});
function up(e) { var p = ptrs[e.pointerId]; if (p && p.stick) { move.x = move.y = 0; stickEl.hidden = true; } delete ptrs[e.pointerId]; }
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
cvs.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* ---------- sound (all made here: wind, lake, birds, steps, chimes) ---------- */
var ac = null, lakeG = null, noiseBuf = null;
function startSound() {
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)(); var n = ac.sampleRate * 3, d, l = 0, i;
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate); d = noiseBuf.getChannelData(0); for (i = 0; i < n; i++) { l = l * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = l * 6; }
    var s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; var g = ac.createGain(); g.gain.value = 0.15;
    var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.085; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
    var wb = ac.createBuffer(1, n, ac.sampleRate), wd = wb.getChannelData(0); for (i = 0; i < n; i++) wd[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / ac.sampleRate * 2.1) * Math.sin(i / ac.sampleRate * 0.7));
    var s2 = ac.createBufferSource(); s2.buffer = wb; s2.loop = true; var f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1400; f2.Q.value = 0.6; lakeG = ac.createGain(); lakeG.gain.value = 0; s2.connect(f2); f2.connect(lakeG); lakeG.connect(ac.destination); s2.start();
    setTimeout(chirp, 2500);
  } catch (e) { ac = null; }
}
function chime(i) { if (!ac) return; [0, 7, 12].forEach(function (st, k) { var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + k * 0.14; o.type = 'sine'; o.frequency.value = 330 * Math.pow(2, (st + (i % 5) * 2) / 12);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 2.5); }); }
function chirp() {
  if (!ac) return; var n = 2 + Math.floor(Math.random() * 4), base = 2300 + Math.random() * 1800, t0 = ac.currentTime + 0.05, pan = ac.createStereoPanner ? ac.createStereoPanner() : null, vol = 0.012 + Math.random() * 0.02, k;
  if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(ac.destination); }
  for (k = 0; k < n; k++) { var o = ac.createOscillator(), g = ac.createGain(), t = t0 + k * (0.09 + Math.random() * 0.05); o.type = 'sine'; o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t); o.frequency.exponentialRampToValueAtTime(base * (1.15 + Math.random() * 0.4), t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075); o.connect(g); g.connect(pan || ac.destination); o.start(t); o.stop(t + 0.09); }
  setTimeout(chirp, 2500 + Math.random() * 9000);
}
function footstep() { if (!ac || !noiseBuf) return; var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime, onStone = Math.hypot(pos.x, pos.z) < 19.5; s.buffer = noiseBuf; s.playbackRate.value = (onStone ? 2.2 : 1.1) + Math.random() * 0.5;
  f.type = 'bandpass'; f.frequency.value = onStone ? 900 : 380; f.Q.value = 0.8; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(onStone ? 0.16 : 0.22, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t, Math.random() * 2, 0.15); }

/* ---------- words on screen ---------- */
var toastT = null, placeT = null;
function toast(s, ms) { var t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, ms || 6500); }
function place(s) { var t = $('place'); t.textContent = s; t.classList.add('on'); clearTimeout(placeT); placeT = setTimeout(function () { t.classList.remove('on'); }, 4200); }
function enter() {
  entered = true; $('intro').hidden = true; $('count').hidden = false; $('count').textContent = 'Relics ' + found + ' / ' + relics.length; startSound();
  var h = $('hint'); h.textContent = COARSE ? 'Left thumb walks · right thumb looks' : 'Drag to look · W A S D to walk · Shift to run'; h.hidden = false;
  toast('Follow the old road through the gate. Pale lights mark what is still awake.', 6500);
}

/* ---------- frame loop ---------- */
var clock = new T.Clock(), orbit = 0, acc = 0, accN = 0, warm = 0, level = 0, baseDpr = Q.dpr, v3 = new T.Vector3();
function adapt(dt) {
  if (opts.noAdapt) return; warm += dt; if (warm < 2.5) return; acc += dt; accN++; if (acc < 1.6) return; var avg = acc / accN; acc = 0; accN = 0;
  if (avg > 1 / 27 && level < 5) { level++;
    if (level === 1) FW.water.on = false; else if (level === 2) { Q.dpr = Math.max(1, baseDpr * 0.8); resize(); } else if (level === 3) { Q.rays = false; FW.grass.geometry.instanceCount = Math.floor(Q.tufts * 0.6); }
    else if (level === 4) { Q.dpr = Math.max(0.75, baseDpr * 0.62); resize(); } else { Q.post = false; post = null; renderer.shadowMap.enabled = false; scene.traverse(function (o) { if (o.material) o.material.needsUpdate = true; }); }
    warm = 1.2; }
}
function frame() {
  requestAnimationFrame(frame); var rawDt = clock.getDelta(), dt = Math.min(0.05, rawDt), t = clock.elapsedTime, i; FW.uTime.value = t; adapt(rawDt);
  if (entered) {
    var f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - move.y, sd = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + move.x, l = Math.hypot(f, sd);
    if (l > 1) { f /= l; sd /= l; l = 1; }
    if (l > 0.02) { var sp = (keys.ShiftLeft || keys.ShiftRight ? 11 : 5.6) * dt, sy = Math.sin(yaw), cy = Math.cos(yaw), ox = pos.x, oz = pos.z;
      tryMove((-sy * f + cy * sd) * sp, 0); tryMove(0, (-cy * f - sy * sd) * sp); walked += Math.hypot(pos.x - ox, pos.z - oz);
      if (walked > 8 && !$('hint').hidden) $('hint').hidden = true; if (walked - stepAt > 1.5) { stepAt = walked; footstep(); } }
    var gy = FW.groundY(pos.x, pos.z) + 1.7 + Math.sin(walked * 2.1) * 0.04; eye += (gy - eye) * Math.min(1, dt * 9);
    camera.position.set(pos.x, eye, pos.z); camera.rotation.set(pitch, yaw, 0, 'YXZ');
    for (i = 0; i < relics.length; i++) if (!relics[i].found && Math.hypot(pos.x - relics[i].x, pos.z - relics[i].z) < 4.4) mark(relics[i]);
    for (i = 0; i < PLACES.length; i++) { var P = PLACES[i], S = FW.SITES[P[0]]; if (!seen[P[0]] && Math.hypot(pos.x - S.x, pos.z - S.z) < P[2]) { seen[P[0]] = 1; place(P[1]); } }
    if (lakeG) { var dl = Math.min(Math.hypot(pos.x + 96, pos.z + 74) - 40, Math.hypot(pos.x - 110, pos.z - 70) - 50, Math.hypot(pos.x - 70, pos.z) - 16); lakeG.gain.value = 0.05 * (1 - m.sstep(4, 40, dl)); }
  } else { orbit += dt * 0.03; var oa = 0.61 + Math.sin(orbit) * 0.75, R = 46; camera.position.set(Math.sin(oa) * R, FW.groundY(0, 40) + 5.2, Math.cos(oa) * R); camera.lookAt(0, 8.2, 0); }
  camera.updateMatrixWorld(); FW.uCam.value.copy(camera.position); FW.uSunV.value.copy(FW.SUN).transformDirection(camera.matrixWorldInverse);
  var best = 1e9, near = null;
  for (i = 0; i < relics.length; i++) { var q = relics[i], dd = Math.hypot(camera.position.x - q.x, camera.position.z - q.z); q.gem.rotation.y = t * 0.8 + i; q.gem.position.y = q.y + Math.sin(t * 1.3 + i) * 0.12; if (dd < best) { best = dd; near = q; } }
  if (near && best < 60) { relicL.position.set(near.x, near.y, near.z); relicL.color.setHex(near.found ? 0xffc878 : 0x7fe3d0); relicL.intensity = (near.found ? 1.3 : 0.9) * (1 - m.sstep(30, 60, best)); } else relicL.intensity = 0;
  var all = found === relics.length; orb.position.y = 13.2 + Math.sin(t * 0.7) * 0.35; orb.scale.setScalar((1 + Math.sin(t * 1.4) * 0.12) * (1 + found * 0.12) * (all ? 1.6 : 1)); orbL.position.y = orb.position.y; orbL.intensity = 1.0 + found * 0.35 + (all ? 1.5 : 0);
  FW.sky.position.copy(camera.position); FW.updateShadow(renderer, camera.position);
  FW.water.render(renderer, scene, camera);
  if (post) post.render(scene, camera); else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
}
/* test hooks */
FW.tp = function (x, z, y, p) { pos.x = x; pos.z = z; yaw = y || 0; pitch = p || 0; eye = FW.groundY(x, z) + 1.7; };
FW.state = function () { return { x: pos.x, z: pos.z, found: found, level: level, dpr: Q.dpr, tris: renderer.info.render.triangles, calls: renderer.info.render.calls, stats: FW.stats, colliders: FW.colliders.length }; };
setTimeout(build, 60);
})();
