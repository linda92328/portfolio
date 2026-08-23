/* ============================================================
   Flowing Green Silk — WebGL fragment shader background
   Simulates undulating silk fabric with dynamic highlights & shadows
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.querySelector('.silk-flow-canvas');
  if (!canvas) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    premultipliedAlpha: true
  });

  if (!gl) {
    canvas.style.backgroundColor = '#F2EFE0';
    return;
  }

  /* ── Shaders ── */
  var vertSrc = [
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fragSrc = [
    'precision highp float;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    '',
    'float hash(vec2 p) {',
    '  p = fract(p * vec2(234.34, 435.345));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
    '    p = m * p;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'float silkHeight(vec2 p, float t) {',
    '  vec2 q = vec2(',
    '    fbm(p * 1.5 + vec2(t * 0.35, t * 0.15)),',
    '    fbm(p * 1.5 + vec2(-t * 0.22, t * 0.28) + 5.0)',
    '  );',
    '  float folds  = fbm(p * 2.5 + q * 2.0 + vec2(t * 0.12, -t * 0.08));',
    '  float medium = fbm(p * 5.0 + q * 1.0 + vec2(-t * 0.08, t * 0.06));',
    '  float fine   = fbm(p * 12.0 + q * 0.5);',
    '  return folds * 0.55 + medium * 0.30 + fine * 0.15;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
    '  vec2 p = uv * 3.0;',
    '  float t = u_time * 0.08;',
    '',
    '  vec2 q = vec2(',
    '    fbm(p + vec2(t, t * 0.5)),',
    '    fbm(p + vec2(-t * 0.6, t * 0.8) + 3.0)',
    '  );',
    '',
    '  float h = fbm(p + q * 2.0 + vec2(t * 0.3, -t * 0.2));',
    '',
    '  float eps = 0.003;',
    '  float hx = fbm(p + vec2(eps, 0.0) + q * 2.0);',
    '  float hy = fbm(p + vec2(0.0, eps) + q * 2.0);',
    '',
    '  vec3 nrm = normalize(vec3((h - hx) * 4.0, (h - hy) * 4.0, 0.5));',
    '  vec3 light = normalize(vec3(-0.5, 0.7, 0.6));',
    '  float diff = max(dot(nrm, light), 0.0);',
    '  float spec = pow(max(dot(nrm, normalize(light + vec3(0.0,0.0,1.0))), 0.0), 16.0);',
    '',
    '  vec3 cBase  = vec3(0.949, 0.937, 0.878);',
    '  vec3 cLite  = vec3(0.959, 0.947, 0.890);',
    '  vec3 cSheen = vec3(0.970, 0.960, 0.910);',
    '',
    '  vec3 col = mix(cBase, cLite, smoothstep(0.35, 0.65, h));',
    '  col *= 0.97 + 0.03 * diff;',
    '  col += cSheen * spec * 0.12;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ── Compile helpers ── */
  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, vertSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* Light sage fallback clear color matching #EDF0E4 */
  gl.clearColor(0.93, 0.94, 0.89, 1.0);

  /* ── Full-screen quad ── */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1
  ]), gl.STATIC_DRAW);

  var posLoc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  var resLoc = gl.getUniformLocation(prog, 'u_resolution');
  var timeLoc = gl.getUniformLocation(prog, 'u_time');

  /* ── Resize ── */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
  }

  /* ── Animation loop with visibility gating ── */
  var startTime = performance.now();
  var running = false;
  var frozenTime = 0;
  var hasRendered = false;

  function drawFrame(t) {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, t);
    gl.clearColor(0.93, 0.94, 0.89, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
  }

  function render() {
    if (!running) return;
    var elapsed = (performance.now() - startTime) * 0.001;
    drawFrame(elapsed);
    requestAnimationFrame(render);
  }

  /* Size canvas and render one static frame so the silk is always visible,
     even before the section scrolls into view */
  requestAnimationFrame(function () {
    resize();
    drawFrame(0);
    hasRendered = true;
  });

  /* Start/pause animation based on section visibility */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        resize();
        if (!running) {
          running = true;
          startTime = performance.now() - frozenTime * 1000;
          requestAnimationFrame(render);
        }
      } else {
        running = false;
        frozenTime = (performance.now() - startTime) * 0.001;
      }
    });
  }, { threshold: 0.01 });

  io.observe(canvas);

  window.addEventListener('resize', function () {
    resize();
    if (!running && hasRendered) drawFrame(frozenTime);
  }, { passive: true });

  window.addEventListener('load', function () {
    resize();
    if (!running) drawFrame(0);
  });

  if (prefersReducedMotion) {
    running = false;
    requestAnimationFrame(function () { resize(); drawFrame(0); });
  }
})();
