/* ============================================================
   Hero · 3D Particle Book — Three.js / WebGL
   严格时间轴（QR-reveal 结构）：
     0–3s    GATHER   粒子从全屏缓慢汇聚成书
     3–8s    HOLD     书完整保持（≥5s）
     8–12s   ROTATE   360° 慢速真实 3D 旋转（≥4s）
     12–20s  DISPERSE 边缘优先、缓慢墨迹式消散（≥8s，无爆炸）
     20–24s  FLOAT    回到全屏漂浮 → 循环
   书形：书脊 + 左右展开书页 + 厚度页块 + 封面轮廓 + 手稿线
   无图片 / 无 SVG / 无二维点阵 / 无矩形 mask。真实 3D 坐标 + 透视 + 噪声位移。
   ============================================================ */
(function () {
  'use strict';
  const canvas = document.querySelector('.hero-tree');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  /* ── Build a clear OPEN BOOK in 3D object space ──
     Spine at x=0; each page is a rectangle (u: spine→outer, v: height)
     tilted UP at the outer edge → unmistakable "V" open-book silhouette. */
  function buildBook() {
    const W = 1.0;          // page half-width (spine→outer)
    const H = 0.72;         // half-height
    const open = 0.62;      // tilt: outer edges lift (open-book angle)
    const step = 0.022;     // single page-layer thickness
    const L = 11;           // number of page layers → visible thickness
    const pos = [], edge = [];

    const push3 = (x, y, z, e) => { pos.push(x, y, z); edge.push(e); };

    // SPINE — dense bright vertical binding at x≈0
    for (let i = 0; i < 320; i++) {
      const y = (Math.random() - 0.5) * H * 1.9;
      const z = (Math.random() - 0.5) * step * 1.4;
      push3(0, y, z, 1.0);
    }

    [-1, 1].forEach((s) => {
      // PAGE FILL — interior particles, denser near the spine
      for (let i = 0; i < 1700; i++) {
        const u = Math.sqrt(Math.random());
        const v = Math.random() * 2 - 1;
        const x = s * u * W;
        const y = v * H;
        const xw = x * Math.cos(open);
        const zw = s * x * Math.sin(open);
        const dEdge = Math.min(u, 1 - Math.abs(v));
        push3(xw, y, zw, 0.12 + (1 - dEdge) * 0.25);
      }
      // THICKNESS — page block below the surface (shows real depth)
      for (let k = 1; k <= L; k++) {
        for (let i = 0; i < 70; i++) {
          const u = Math.random();
          const v = (Math.random() * 2 - 1) * 0.96;
          const x = s * u * W;
          const y = v * H;
          const xw = x * Math.cos(open);
          const zw = s * x * Math.sin(open) - k * step;
          push3(xw, y, zw, 0.35);
        }
      }
      // COVER OUTLINE — bright perimeter (top, bottom, outer edge)
      const ring = (u0, u1, v0, v1, n) => {
        for (let i = 0; i < n; i++) {
          const u = u0 + (u1 - u0) * (i / (n - 1));
          const v = v0 + (v1 - v0) * (i / (n - 1));
          const x = s * u * W, y = v * H;
          const xw = x * Math.cos(open), zw = s * x * Math.sin(open);
          push3(xw, y, zw, 1.0);
        }
      };
      ring(0.0, 1.0, 1.0, 1.0, 130);     // top edge
      ring(0.0, 1.0, -1.0, -1.0, 130);   // bottom edge
      ring(1.0, 1.0, -1.0, 1.0, 130);    // outer edge

      // MANUSCRIPT TEXT LINES — faint horizontal lines on the page
      for (let l = 0; l < 6; l++) {
        const v = -0.62 + (l / 5) * 1.24;
        for (let i = 0; i < 70; i++) {
          const u = 0.14 + 0.74 * (i / 69);
          const x = s * u * W, y = v * H + Math.sin((u - 0.5) * Math.PI) * 0.012;
          const xw = x * Math.cos(open), zw = s * x * Math.sin(open);
          push3(xw, y, zw, 0.25);
        }
      }
    });

    return { pos, edge };
  }

  const book = buildBook();
  const N = book.pos.length / 3;

  const aHome = new Float32Array(N * 3);
  const aBook = new Float32Array(N * 3);
  const aEdge = new Float32Array(N);
  const aRand = new Float32Array(N);
  const aSize = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    // floating dust: spread across the whole viewport volume, with depth
    aHome[i * 3]     = (Math.random() - 0.5) * 15;
    aHome[i * 3 + 1] = (Math.random() - 0.5) * 9.5;
    aHome[i * 3 + 2] = -9 + Math.random() * 13;       // z depth → perspective size
    aBook[i * 3]     = book.pos[i * 3];
    aBook[i * 3 + 1] = book.pos[i * 3 + 1];
    aBook[i * 3 + 2] = book.pos[i * 3 + 2];
    aEdge[i] = book.edge[i];
    aRand[i] = Math.random();
    aSize[i] = 0.85 + Math.random() * 1.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aHome', new THREE.BufferAttribute(aHome, 3));
  geo.setAttribute('aBook', new THREE.BufferAttribute(aBook, 3));
  geo.setAttribute('aEdge', new THREE.BufferAttribute(aEdge, 1));
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const uniforms = {
    uTime:       { value: 0 },
    uGather:     { value: 0 },
    uDisperse:   { value: 0 },
    uRotY:       { value: 0 },
    uTilt:       { value: 0.14 },
    uFloat:      { value: 0 },
    uBookScale:  { value: 0.5 },   // 比上一版(0.7)缩小约30%
    uBookOffset: { value: new THREE.Vector3(3.0, -1.7, 0) }, // 右下角，不贴边
    uSizeBase:   { value: 17.0 },
    uPixelRatio: { value: PR },
    uColorA:     { value: new THREE.Color(0.80, 0.93, 0.85) }, // 统一柔光薄荷白
  };

  const vert = `
    attribute vec3 aHome;
    attribute vec3 aBook;
    attribute float aEdge;
    attribute float aRand;
    attribute float aSize;

    uniform float uTime, uGather, uDisperse, uRotY, uTilt, uFloat, uBookScale, uSizeBase, uPixelRatio;
    uniform vec3 uBookOffset;

    varying float vAlpha;
    varying float vEdge;

    // --- Ashima simplex noise (snoise) for organic drift ---
    vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
    mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }

    void main(){
      float t = uTime * 0.12 + aRand * 6.2831;
      vec3 np = aHome * 0.22;
      vec3 drift = vec3(
        snoise(np + vec3(t, 0.0, 0.0)),
        snoise(np + vec3(0.0, t, 10.0)),
        snoise(np + vec3(0.0, 0.0, t + 20.0))
      );
      // dust: full-screen floating, drift only while scattered
      vec3 dust = aHome + drift * (1.0 - uGather) * 1.2;

      // book target: rotate (Y spin + X tilt), scale, offset
      vec3 b = aBook * uBookScale;
      b = rotY(uRotY) * b;
      b = rotX(uTilt) * b;
      b += uBookOffset;
      b.y += uFloat;

      // Disperse ALL together — no edge-first staging, no spine lingering
      float dispLocal = uDisperse;
      float form = uGather * (1.0 - dispLocal);   // 1 = fully book, 0 = dust

      vec3 pos = mix(dust, b, form);

      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mv;

      float sz = aSize * uSizeBase * uPixelRatio / max(0.1, -mv.z);
      gl_PointSize = clamp(sz, 1.0, 9.0);

      vEdge = aEdge;
      vAlpha = (0.20 + 0.72 * form) * (1.0 - 0.30 * dispLocal);
    }
  `;

  const frag = `
    uniform vec3 uColorA;
    varying float vAlpha;
    varying float vEdge;
    void main(){
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float soft = smoothstep(0.5, 0.06, d);
      vec3 col = uColorA;
      // 边缘粒子更亮
      col *= 0.85 + 0.35 * vEdge;
      gl_FragColor = vec4(col, vAlpha * soft);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  /* ── Sizing ── */
  let baseCamZ = 7;
  const baseOffsetX = 3.0;
  const baseOffsetY = -1.7;
  const baseScale = 0.5;
  function resize() {
    const r = hero.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const isNarrow = w < 600;
    const isTablet = w >= 600 && w < 1024;
    const narrowFactor = isNarrow ? (600 / w) * 0.5 + 0.5 : 1;
    baseCamZ = 7 * Math.min(narrowFactor, 1.5);

    // 计算视锥体可见范围
    const vFov = 45 * Math.PI / 180;
    const halfH = Math.tan(vFov / 2) * baseCamZ;
    const halfW = halfH * (w / h);

    if (isNarrow) {
      // 手机端：书放在 hero-role / tagline 文字的右侧，紧贴右边缘但完整可见
      const t = Math.min(1, (600 - w) / 400);
      const scale = baseScale * (1 - t * 0.35);
      const bookHalfW = 1.0 * scale * 1.1;
      uniforms.uBookOffset.value.x = halfW - bookHalfW - 0.15;
      uniforms.uBookOffset.value.y = -1.5 - t * 1.0;
      uniforms.uBookScale.value = scale;
    } else if (isTablet) {
      // 平板端（iPad）：书放在右下区域，确保完整可见不超出
      const t = Math.min(1, (w - 600) / 424);  // 0 → 1 随宽度变宽
      const scale = baseScale * (0.8 + t * 0.2); // 0.4 → 0.5
      const bookHalfW = 1.0 * scale * 1.15;
      const bookHalfH = 0.72 * scale * 1.3;
      // x：右边缘内收
      uniforms.uBookOffset.value.x = halfW - bookHalfW - 0.3;
      // y：底部上收
      uniforms.uBookOffset.value.y = -halfH + bookHalfH + 0.5;
      uniforms.uBookScale.value = scale;
    } else {
      // 桌面端：使用基准位置，但若屏幕不够宽则自动内收
      const bookHalfW = 1.0 * baseScale * 1.15;
      const maxX = halfW - bookHalfW - 0.3;
      uniforms.uBookOffset.value.x = Math.min(baseOffsetX, maxX);
      uniforms.uBookOffset.value.y = baseOffsetY;
      uniforms.uBookScale.value = baseScale;
    }
    camera.updateProjectionMatrix();
  }
  resize();

  /* ── Strict timeline (seconds) ──
     GATHER 3s → HOLD 3s → ROTATE 5s(360° linear) → HOLD2 2s(stop) → DISPERSE 6s → FLOAT 3s → loop
     Rotation: strictly linear 0°→360°, single direction, no reversal/yoyo/ping-pong. */
  const GATHER = 3, HOLD = 3, ROTATE = 5, HOLD2 = 2, DISPERSE = 6, FLOAT = 3;
  const CYCLE = (GATHER + HOLD + ROTATE + HOLD2 + DISPERSE + FLOAT) * 1000;
  const start = performance.now();
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  function frame(now) {
    const ts = ((now - start) % CYCLE) / 1000;
    let g = 0, disp = 0, rotY = 0, tilt = 0.14, flt = 0, camZ = baseCamZ;

    if (ts < GATHER) {
      // Stage 1: particles slowly converge to form the book
      g = easeInOut(ts / GATHER);
      flt = Math.sin(now * 0.0016) * 0.05;
    } else if (ts < GATHER + HOLD) {
      // Stage 2: book holds complete form, gentle float only
      g = 1;
      flt = Math.sin(now * 0.0016) * 0.05;
    } else if (ts < GATHER + HOLD + ROTATE) {
      // Stage 3: 360° LINEAR rotation — single direction, no reversal, no float, no wobble
      //   rotY = p * 2π  (0° → 360°, strictly monotonic, like a product turntable)
      const p = (ts - GATHER - HOLD) / ROTATE;
      g = 1;
      rotY = p * Math.PI * 2;
      tilt = 0.14;
      // flt stays 0 — no vertical bob during spin
    } else if (ts < GATHER + HOLD + ROTATE + HOLD2) {
      // Stage 4: rotation STOPPED at 360°, hold book form for 2 seconds
      g = 1;
      rotY = Math.PI * 2;
      tilt = 0.14;
      flt = Math.sin(now * 0.0016) * 0.05;
    } else if (ts < GATHER + HOLD + ROTATE + HOLD2 + DISPERSE) {
      // Stage 5: slow linear deconstruction — no burst, no ease-in-out
      const p = (ts - GATHER - HOLD - ROTATE - HOLD2) / DISPERSE;
      g = 1;
      disp = p;              // linear, slow dust/ink dissipation
      rotY = Math.PI * 2;
      tilt = 0.14;
    } else {
      // Stage 6: floating dust, then loop restarts
      g = 1; disp = 1;
    }

    uniforms.uTime.value = now * 0.001;
    uniforms.uGather.value = g;
    uniforms.uDisperse.value = disp;
    uniforms.uRotY.value = rotY;
    uniforms.uTilt.value = tilt;
    uniforms.uFloat.value = flt;
    camera.position.z = camZ;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  let rzT;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(resize, 150); });
})();
