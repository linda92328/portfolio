/* ============================================================
   Linda Zhang Portfolio · Interactions & Motion v2
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. NAV CLOCK ─────────────────────── */
  const navClock = document.getElementById('navClock');
  if (navClock) {
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      const d = new Date();
      navClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── 2. NAV HIDE ON SCROLL DOWN + COLOR TOGGLE ───────── */
  const floatNav = document.querySelector('.float-nav');
  const heroSec = document.querySelector('.hero');
  let lastScrollY = 0;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        // Hide/show on direction
        if (sy > lastScrollY && sy > 100) {
          floatNav.classList.add('hidden');
        } else {
          floatNav.classList.remove('hidden');
        }
        // Dark ↔ light nav based on whether hero is visible
        if (heroSec) {
          const heroBottom = heroSec.offsetHeight;
          floatNav.classList.toggle('scrolled', sy > heroBottom - 80);
        }
        lastScrollY = sy;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ── 3. REVEAL ON SCROLL (IntersectionObserver) ── */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));

  /* ── 4. SCROLL SPY — nav links + section dots ── */
  const sections = document.querySelectorAll('main .sec, main .hero');
  const navLinks = document.querySelectorAll('.nav-links a');
  const dots = document.querySelectorAll('.section-dots .dot');

  const spyObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          navLinks.forEach((a) =>
            a.classList.toggle('active', a.dataset.section === id)
          );
          dots.forEach((d) =>
            d.classList.toggle('active', d.dataset.go === id)
          );
        }
      });
    },
    { threshold: 0, rootMargin: '-45% 0px -45% 0px' }
  );
  sections.forEach((s) => spyObs.observe(s));

  /* Dot click → smooth scroll */
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = document.getElementById(dot.dataset.go);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── 5. EXPERIENCE — light ripple field, floating nodes, follow panel ── */
  (function () {
    const stage = document.getElementById('waveStage');
    if (!stage) return;

    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const panel = document.getElementById('wavePanel');
    const wpTag = document.getElementById('wpTag');
    const wpTitle = document.getElementById('wpTitle');
    const wpBody = document.getElementById('wpBody');
    const nodes = Array.from(stage.querySelectorAll('.wnode'));

    let W = 0, H = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth;
      H = stage.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    stage.addEventListener('mouseleave', () => scheduleHide());

    let running = false, rafId = null;
    function draw(now) {
      ctx.clearRect(0, 0, W, H);

      /* node connection path — 传播路径：贯穿五个节点的 momentum graph */
      if (nodes.length > 1) {
        const sr = stage.getBoundingClientRect();
        const pts = nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
        });
        const trace = () => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }
          const lp = pts[pts.length - 1];
          ctx.lineTo(lp.x, lp.y);
        };
        /* 底层：半透明细线路径 */
        trace();
        ctx.strokeStyle = 'rgba(200,220,235,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();
        /* 数据轨迹：沿线缓慢流动的短划（两道，错开相位） */
        ctx.lineCap = 'round';
        trace();
        ctx.strokeStyle = 'rgba(220,235,245,0.9)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 150]);
        ctx.lineDashOffset = -((now * 0.022) % 153);
        ctx.stroke();
        trace();
        ctx.strokeStyle = 'rgba(210,228,240,0.6)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 150]);
        ctx.lineDashOffset = 76 - ((now * 0.022) % 153);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rafId = requestAnimationFrame(draw);
    }

    /* only animate when the stage is on screen */
    const visObs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !running) {
          running = true;
          rafId = requestAnimationFrame(draw);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(rafId);
        }
      });
    }, { threshold: 0.05 });
    visObs.observe(stage);

    /* annotation panel — follows the hovered node */
    function placePanel(node) {
      const sr = stage.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      const cx = nr.left - sr.left + nr.width / 2;
      const cy = nr.top - sr.top + nr.height / 2;
      const pw = panel.offsetWidth || 300;
      const ph = panel.offsetHeight || 190;
      /* 默认出现在节点右侧；靠右则翻到左侧 */
      let left = nr.right - sr.left + 26;
      if (left + pw > W - 16) left = nr.left - sr.left - pw - 26;
      if (left < 16) left = Math.max(16, W - pw - 16);
      /* 垂直居中于节点，并夹在舞台内 */
      let top = cy - ph * 0.45;
      top = Math.max(14, Math.min(top, H - ph - 14));
      panel.style.left = Math.round(left) + 'px';
      panel.style.top = Math.round(top) + 'px';
    }

    let hideTimer = null;
    function showPanel(node) {
      clearTimeout(hideTimer);
      const no = node.querySelector('.wn-no').textContent;
      wpTag.textContent = no + ' · ' + node.dataset.key;
      wpTitle.textContent = node.dataset.key;
      wpBody.textContent = node.dataset.body;
      placePanel(node);
      panel.classList.add('show');
      panel.setAttribute('aria-hidden', 'false');
      nodes.forEach((n) => n.classList.toggle('active', n === node));
    }
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        panel.classList.remove('show');
        panel.setAttribute('aria-hidden', 'true');
        nodes.forEach((n) => n.classList.remove('active'));
      }, 200);
    }
    const isMobile = window.matchMedia('(max-width: 600px)').matches;

    /* 手机端提示文字：悬停 → 点击 */
    const hint = document.querySelector('.wave-hint');
    if (hint && isMobile) {
      hint.innerHTML = 'Tap the nodes · 点击节点查看过程详情';
    }

    if (!isMobile) {
      /* 桌面端：hover 显示面板 */
      panel.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      panel.addEventListener('mouseleave', scheduleHide);
      nodes.forEach((n) => {
        n.addEventListener('mouseenter', () => showPanel(n));
        n.addEventListener('mouseleave', scheduleHide);
        n.addEventListener('focus', () => showPanel(n));
        n.addEventListener('blur', scheduleHide);
      });
    }

    /* 手机端：点击节点切换面板显示/隐藏 */
    nodes.forEach((n) => {
      n.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (isMobile) {
          if (n.classList.contains('active')) {
            scheduleHide();
          } else {
            showPanel(n);
          }
        } else {
          showPanel(n);
        }
      });
    });

    /* 点击空白处关闭面板（手机端） */
    if (isMobile) {
      document.addEventListener('click', () => {
        scheduleHide();
      });
      panel.addEventListener('click', (ev) => {
        ev.stopPropagation();
      });
    }

    /* section in-view → big title mask reveal */
    ['experience', 'project1', 'project2', 'volunteer', 'ailab', 'media'].forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      const secObs = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            secObs.unobserve(e.target);
          }
        });
      }, { threshold: 0.18 });
      secObs.observe(sec);
    });

    /* signal count-up */
    const cntObs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.sig-count').forEach((b) => {
          const target = parseInt(b.dataset.count, 10) || 0;
          const start = performance.now();
          const dur = 1700;
          (function step(now) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            b.textContent = Math.round(eased * target);
            if (p < 1) requestAnimationFrame(step);
          })(start);
        });
        cntObs.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('.sig-area').forEach((s) => cntObs.observe(s));
  })();

  /* ── 6. BAR CHART ANIMATE ── */
  const chartObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.br-track i').forEach((bar, i) => {
            setTimeout(() => bar.classList.add('animate'), i * 140);
          });
          chartObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.35 }
  );
  document.querySelectorAll('.holo-card').forEach((c) => chartObs.observe(c));

  /* ── 6b. HOLO CARD GYROSCOPE TILT ── */
  (function () {
    const holoWrap = document.querySelector('.holo-card-wrap');
    const holoCard = document.getElementById('holoCard');
    if (!holoWrap || !holoCard) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX_TILT = 14;
    let rafId = null;
    let targetRX = 0, targetRY = 0;
    let curRX = 0, curRY = 0;
    let glareX = 50, glareY = 50;

    function onMove(e) {
      const rect = holoWrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetRY = x * MAX_TILT;
      targetRX = -y * MAX_TILT;
      glareX = (x + 0.5) * 100;
      glareY = (y + 0.5) * 100;
      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function animate() {
      curRX += (targetRX - curRX) * 0.15;
      curRY += (targetRY - curRY) * 0.15;
      holoCard.style.transform =
        'rotateX(' + curRX.toFixed(2) + 'deg) rotateY(' + curRY.toFixed(2) + 'deg)';
      var glare = holoCard.querySelector('.holo-glare');
      if (glare) glare.style.backgroundPosition = glareX.toFixed(1) + '% ' + glareY.toFixed(1) + '%';
      var irid = holoCard.querySelector('.holo-iridescent');
      if (irid) irid.style.backgroundPosition = (100 - glareX).toFixed(1) + '% ' + (100 - glareY).toFixed(1) + '%';
      if (Math.abs(targetRX - curRX) > 0.01 || Math.abs(targetRY - curRY) > 0.01) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
      }
    }

    function onLeave() {
      targetRX = 0; targetRY = 0;
      glareX = 50; glareY = 50;
      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    holoWrap.addEventListener('mousemove', onMove);
    holoWrap.addEventListener('mouseleave', onLeave);
  })();

  /* ── 7. FALLING LEAVES + POEM TAP ── */
  (function () {
    const container = document.getElementById('leavesLayer');
    const poemEl = document.getElementById('poemDisplay');
    if (!container || !poemEl) return;

    const poems = [
      '停车坐爱枫林晚，<br/>霜叶红于二月花。',
      '自古逢秋悲寂寥，<br/>我言秋日胜春朝。',
      '枯藤老树昏鸦，<br/>小桥流水人家。',
      '解落三秋叶，<br/>能开二月花。',
      '榈庭多落叶，<br/>慨然知己秋。',
      '一年好景君须记，<br/>最是橙黄橘绿时。',
      '空山新雨后，<br/>天气晚来秋。',
      '月落乌啼霜满天，<br/>江枫渔火对愁眠。',
    ];
    const glyphs = ['🍂', '🍁', '🍃', '🌿'];
    const COUNT = 26;

    for (let i = 0; i < COUNT; i++) {
      const leaf = document.createElement('span');
      leaf.className = 'leaf';
      leaf.textContent = glyphs[i % glyphs.length];
      leaf.style.left = Math.random() * 100 + '%';
      const dur = 6 + Math.random() * 8;
      leaf.style.animationDuration = dur + 's';
      leaf.style.animationDelay = -Math.random() * dur + 's';
      leaf.style.fontSize = 14 + Math.random() * 18 + 'px';
      leaf.style.opacity = 0.5 + Math.random() * 0.35;

      leaf.addEventListener('click', (ev) => {
        ev.stopPropagation();
        poemEl.style.opacity = 0;
        poemEl.style.transform = 'translateY(10px)';
        setTimeout(() => {
          poemEl.innerHTML = poems[Math.floor(Math.random() * poems.length)];
          poemEl.style.opacity = 1;
          poemEl.style.transform = 'translateY(0)';
        }, 200);
      });

      container.appendChild(leaf);
    }
  })();

  /* ── 8. SMOOTH ANCHOR SCROLL ── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const t = document.getElementById(id);
      if (t) {
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── 9. HERO ENTRY (add .is-loaded to trigger .h-anim) ── */
  (function () {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-loaded')));
  })();

  /* ── 10. HERO ID NUMBERS — count up on load ── */
  (function () {
    const nums = document.querySelectorAll('.id-num[data-count]');
    if (!nums.length) return;
    const dur = 950;
    function run() {
      nums.forEach((n) => {
        const target = parseInt(n.dataset.count, 10) || 0;
        const start = performance.now();
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          n.textContent = String(Math.round(eased * target)).padStart(2, '0');
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }
    setTimeout(run, 480);
  })();

  /* ── 11. HERO PARALLAX — forest bg + photo on scroll ── */
  (function () {
    const hero = document.querySelector('.hero');
    const forestBg = document.querySelector('.forest-bg');
    const photoWrap = document.querySelector('.photo-wrap');
    if (!hero) return;

    // Mouse parallax for floats (if any [data-depth] elements exist)
    const floats = Array.from(document.querySelectorAll('[data-depth]'));
    const MAX = 26;
    let mx = 0, my = 0, tx = 0, ty = 0;
    if (floats.length) {
      window.addEventListener('mousemove', (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      const h = hero.offsetHeight;
      if (sy < h) {
        const ratio = sy / h;
        // Forest background moves slower (parallax)
        if (forestBg) forestBg.style.transform = `translateY(${ratio * 30}px) scale(1.03)`;
        // Photo gently straightens + lifts
        if (photoWrap) {
          const rot = -1.2 + ratio * 1.2;
          const translateY = ratio * -12;
          photoWrap.style.transform = `rotate(${rot}deg) translateY(${translateY}px)`;
        }
      }
      // Mouse drift for floating cards
      if (floats.length) {
        tx += (mx - tx) * 0.06;
        ty += (my - ty) * 0.06;
        floats.forEach((el) => {
          const d = parseFloat(el.dataset.depth) || 0.05;
          el.style.transform = `translate3d(${(tx * d * MAX).toFixed(2)}px, ${(ty * d * MAX).toFixed(2)}px, 0)`;
        });
      }
    }, { passive: true });
  })();

  /* ── 12. AI FOLDER — click to scatter / collapse ── */
  (function () {
    const folderBtn = document.getElementById('aiFolderBtn');
    const aiSec = document.querySelector('.ai-sec');
    const scatter = document.getElementById('aiScatter');
    const lightbox = document.getElementById('aiLightbox');
    const lbImg = document.getElementById('aiLbImg');
    const lbCap = document.getElementById('aiLbCap');
    const lbClose = document.getElementById('aiLbClose');
    const lbBackdrop = document.getElementById('aiLbBackdrop');
    if (!folderBtn || !aiSec) return;

    function toggle() {
      const isOpen = aiSec.classList.toggle('open');
      folderBtn.setAttribute('aria-expanded', String(isOpen));
      var label = folderBtn.querySelector('.ai-folder-label');
      if (label) label.textContent = isOpen ? '收起' : '点击';
    }
    folderBtn.addEventListener('click', toggle);
    folderBtn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    /* card click → lightbox */
    if (scatter && lightbox && lbImg) {
      scatter.querySelectorAll('.ai-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var img = card.querySelector('img');
          var cap = card.querySelector('figcaption');
          if (!img) return;
          lbImg.src = img.src;
          lbImg.alt = img.alt;
          if (lbCap && cap) lbCap.textContent = cap.textContent;
          lightbox.classList.add('open');
          lightbox.setAttribute('aria-hidden', 'false');
        });
      });
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
    }
    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  })();

  /* ── 13. MEDIA — X.com style actions + comments → Feishu ── */
  (function () {
    /* 飞书自定义机器人 webhook — 评论推送 */
    const FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/cd00a2a3-e210-47e7-a35c-f6460ff092e7';

    var likeCounts = { drama: 0, dachuang: 0 };
    var shareCounts = { drama: 0, dachuang: 0 };
    var commentCounts = { drama: 0, dachuang: 0 };

    /* 点赞 */
    document.querySelectorAll('.va-like').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var vid = btn.dataset.vid;
        var countEl = btn.querySelector('.va-count');
        var liked = btn.classList.toggle('liked');
        if (liked) likeCounts[vid]++; else likeCounts[vid]--;
        countEl.textContent = likeCounts[vid];
      });
    });

    /* 分享 — 复制链接 + 动画 */
    document.querySelectorAll('.va-share').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var vid = btn.dataset.vid;
        var countEl = btn.querySelector('.va-count');
        btn.classList.add('shared');
        setTimeout(function () { btn.classList.remove('shared'); }, 600);
        shareCounts[vid]++;
        countEl.textContent = shareCounts[vid];
        var url = window.location.href.split('#')[0] + '#media';

        /* 复制到剪贴板：优先 clipboard API，降级 execCommand */
        function copyDone(ok) {
          var rect = btn.getBoundingClientRect();
          var tip = document.createElement('div');
          tip.textContent = ok ? '已复制链接 ✓' : '链接已复制';
          tip.style.cssText = 'position:fixed;top:' + (rect.top - 32) + 'px;left:' + (rect.left + rect.width / 2) + 'px;transform:translateX(-50%);background:#1d9bf0;color:#fff;padding:5px 14px;border-radius:999px;font-size:12px;font-family:sans-serif;white-space:nowrap;pointer-events:none;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.25);opacity:0;transition:opacity .15s;';
          document.body.appendChild(tip);
          requestAnimationFrame(function () { tip.style.opacity = '1'; });
          setTimeout(function () { tip.style.opacity = '0'; setTimeout(function () { tip.remove(); }, 200); }, 1800);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(function () { copyDone(true); }).catch(function () { copyDone(false); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          document.body.removeChild(ta);
          copyDone(ok);
        }
      });
    });

    /* 评论按钮 — 展开/收起评论区 */
    document.querySelectorAll('.va-comment').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var vid = btn.dataset.vid;
        var box = document.querySelector('.vid-comments[data-vid="' + vid + '"]');
        if (!box) return;
        var isOpen = box.classList.toggle('open');
        btn.classList.toggle('opened', isOpen);
        if (isOpen) {
          var input = box.querySelector('.vc-input');
          if (input) input.focus();
        }
      });
    });

    /* 评论提交 → 飞书 */
    document.querySelectorAll('.vc-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('.vc-input');
        var submit = form.querySelector('.vc-submit');
        var text = input.value.trim();
        if (!text) return;

        var vid = form.closest('.vid-comments').dataset.vid;
        var videoTitle = vid === 'drama' ? '电视剧混剪 · 小红书' : '大创项目视频';
        var time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        var name = '访客' + Math.floor(Math.random() * 9000 + 1000);

        /* 本地显示评论 */
        var list = form.closest('.vid-comments').querySelector('.vc-list');
        var item = document.createElement('div');
        item.className = 'vc-item';
        var initial = name.charAt(2);
        item.innerHTML = '<div class="vc-avatar">' + initial + '</div>' +
          '<div class="vc-body"><div class="vc-name">' + name + '</div>' +
          '<div class="vc-text"></div></div>';
        item.querySelector('.vc-text').textContent = text;
        list.appendChild(item);

        /* 更新评论数 */
        commentCounts[vid]++;
        var cBtn = document.querySelector('.va-comment[data-vid="' + vid + '"] .va-count');
        if (cBtn) cBtn.textContent = commentCounts[vid];

        /* 发送到飞书（多代理轮询，绕过浏览器跨域限制） */
        submit.disabled = true;
        submit.textContent = '发送中...';
        var msg = '📝 Portfolio 新评论\n' +
          '视频：' + videoTitle + '\n' +
          '访客：' + name + '\n' +
          '时间：' + time + '\n' +
          '内容：' + text;

        var payload = JSON.stringify({ msg_type: 'text', content: { text: msg } });
        var targets = [
          'https://corsproxy.io/?url=' + encodeURIComponent(FEISHU_WEBHOOK),
          'https://api.allorigins.win/raw?url=' + encodeURIComponent(FEISHU_WEBHOOK),
          'https://thingproxy.freeboard.io/fetch/' + FEISHU_WEBHOOK,
          FEISHU_WEBHOOK
        ];

        function trySend(i) {
          if (i >= targets.length) {
            submit.textContent = '发送失败 ✗';
            setTimeout(function () { submit.disabled = false; submit.textContent = '发送'; }, 2000);
            return;
          }
          fetch(targets[i], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          }).then(function (res) {
            if (!res.ok && res.status !== 0) throw new Error('HTTP ' + res.status);
            submit.textContent = '已发送 ✓';
            input.value = '';
            setTimeout(function () { submit.disabled = false; submit.textContent = '发送'; }, 1500);
          }).catch(function () { trySend(i + 1); });
        }
        trySend(0);
      });
    });
  })();

  /* ── 14. 翻书轮播（完整双页 + 整张纸 3D 翻页） ── */
  (function () {
    var stage = document.getElementById('bookStage');
    if (!stage) return;
    var dotsContainer = document.getElementById('bookDots');
    if (!dotsContainer) return;
    var pageLeft = document.getElementById('pageLeft');
    var pageRight = document.getElementById('pageRight');
    var flipPage = document.getElementById('flipPage');
    var flipFront = flipPage.querySelector('.flip-front');
    var flipBack = flipPage.querySelector('.flip-back');
    var hoverL = document.getElementById('bookHoverL');
    var hoverR = document.getElementById('bookHoverR');

    var pageList = [
      'assets/book-pages/dreamcore_00.png',
      'assets/book-pages/dreamcore_01.png',
      'assets/book-pages/dreamcore_02.png',
      'assets/book-pages/dreamcore_03.png',
      'assets/book-pages/dreamcore_05.png',
      'assets/book-pages/dreamcore_06.png',
      'assets/book-pages/dreamcore_07.png',
      'assets/book-pages/dreamcore_09.png',
      'assets/book-pages/rural_00.png',
      'assets/book-pages/rural_03.png',
      'assets/book-pages/rural_04.png',
      'assets/book-pages/rural_05.png',
      'assets/book-pages/rural_08.png',
      'assets/book-pages/rural_09.png',
      'assets/book-pages/rural_15.png',
      'assets/book-pages/rural_16.png',
      'assets/book-pages/rural_23.png',
      'assets/book-pages/rural_33.png',
      'assets/book-pages/poetry_00.png',
      'assets/book-pages/poetry_06.png',
      'assets/book-pages/poetry_08.png',
      'assets/book-pages/poetry_12.png',
      'assets/book-pages/poetry_15.png'
    ];

    var total = pageList.length;
    var current = 0;
    var isAnimating = false;
    var startX = 0;
    var FLIP_MS = 900;
    var FLIP_MS_FAST = 280;     /* 快速连点时的翻页时长 */
    var preloaded = {};

    /* ── 快速翻页队列 ──
       pending > 0  表示还有待翻页数（正=右翻，负=左翻）
       lastClickAt   上次点击时间，用于判断是否"快速连点"
       思路：用户每点一次就往队列里加一页，翻页循环不停地消耗队列。
            队列里有多页 → 快速翻；只剩 1 页 → 正常速度翻。 */
    var pending = 0;
    var lastClickAt = 0;
    var RAPID_GAP = 350;        /* 两次点击间隔小于此值视为快速连点 */

    /* 预加载 */
    function preload(i) {
      i = (i + total) % total;
      if (preloaded[i]) return;
      var img = new Image();
      img.src = pageList[i];
      preloaded[i] = true;
    }
    function preloadNeighbors() {
      preload(current);
      preload(current - 1);
      preload(current + 1);
    }

    /* 生成圆点 */
    pageList.forEach(function (_, i) {
      var dot = document.createElement('span');
      dot.className = 'book-dot' + (i === 0 ? ' active' : '');
      dot.dataset.i = i;
      dotsContainer.appendChild(dot);
    });
    var dots = dotsContainer.querySelectorAll('.book-dot');

    function updateDots() {
      dots.forEach(function (d, idx) { d.classList.toggle('active', idx === current); });
    }
    function updateHover() {
      /* 循环模式：两侧始终可翻，hover 提示始终显示 */
      if (hoverL) hoverL.classList.add('visible');
      if (hoverR) hoverR.classList.add('visible');
    }

    /* 设置静态左右页显示某一页（整张页面由左右两半拼成） */
    function setPage(i) {
      var url = 'url(' + pageList[i] + ')';
      pageLeft.style.backgroundImage = url;
      pageRight.style.backgroundImage = url;
    }

    /* 右翻：点击右边 → 入队一页 */
    function flipNext() {
      pending += 1;
      lastClickAt = Date.now();
      if (!isAnimating) consumeQueue();
    }

    /* 左翻：点击左边 → 入队一页 */
    function flipPrev() {
      pending -= 1;
      lastClickAt = Date.now();
      if (!isAnimating) consumeQueue();
    }

    /* ── 翻页循环：持续消耗队列 ── */
    function consumeQueue() {
      if (pending === 0) { isAnimating = false; updateHover(); return; }
      isAnimating = true;

      var direction = pending > 0 ? 1 : -1;
      pending -= direction; /* 消耗一页 */

      /* 速度判断：队列里还有待翻页 → 快速翻；队列空了 → 正常速度收尾 */
      var isRapid = (pending !== 0);
      var duration = isRapid ? FLIP_MS_FAST : FLIP_MS;

      /* 循环翻页：到了末尾再翻就回到开头，反之亦然 */
      var nextIdx = (current + direction + total) % total;
      preload(nextIdx);
      preload((nextIdx + direction + total) % total); /* 预加载再下一页 */

      if (direction > 0) {
        /* 右翻 */
        pageRight.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        flipPage.className = 'flip-page flip-right-dir' + (isRapid ? ' rapid' : ' flipping');
        flipFront.style.backgroundImage = 'url(' + pageList[current] + ')';
        flipBack.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        flipPage.style.transitionDuration = duration + 'ms';
        flipPage.style.transform = 'rotateY(0deg)';
        flipPage.classList.remove('hidden');
        void flipPage.offsetWidth;
        flipPage.style.transform = 'rotateY(-180deg)';
      } else {
        /* 左翻 */
        pageLeft.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        flipPage.className = 'flip-page flip-left-dir' + (isRapid ? ' rapid' : ' flipping');
        flipFront.style.backgroundImage = 'url(' + pageList[current] + ')';
        flipBack.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        flipPage.style.transitionDuration = duration + 'ms';
        flipPage.style.transform = 'rotateY(0deg)';
        flipPage.classList.remove('hidden');
        void flipPage.offsetWidth;
        flipPage.style.transform = 'rotateY(180deg)';
      }

      setTimeout(function () {
        /* 收尾：把另一侧也换成目标页（背面盖着，无缝） */
        if (direction > 0) {
          pageLeft.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        } else {
          pageRight.style.backgroundImage = 'url(' + pageList[nextIdx] + ')';
        }
        current = nextIdx;
        updateDots();
        preloadNeighbors();
        flipPage.classList.add('hidden');
        flipPage.classList.remove('flipping', 'rapid');
        flipPage.style.transform = 'rotateY(0deg)';
        flipPage.style.transitionDuration = '';

        /* 继续消耗队列 */
        consumeQueue();
      }, duration);
    }

    /* 圆点跳转 */
    function goTo(i) {
      if (i === current && pending === 0) return;
      i = (i + total) % total;
      /* 取消当前队列，直接跳转到目标 */
      pending = 0;
      if (!isAnimating) {
        current = i;
        setPage(i);
        updateDots();
        preloadNeighbors();
        updateHover();
      } else {
        /* 动画中 → 直接跳，然后等当前动画结束后队列是空的就停在目标页 */
        current = i;
        setPage(i);
        updateDots();
        preloadNeighbors();
      }
    }

    /* 点击 */
    stage.addEventListener('click', function (e) {
      var rect = stage.getBoundingClientRect();
      var x = e.clientX - rect.left;
      if (x > rect.width * 0.5) { flipNext(); }
      else { flipPrev(); }
    });

    /* hover 方向提示 */
    stage.addEventListener('mousemove', function (e) {
      var rect = stage.getBoundingClientRect();
      var x = e.clientX - rect.left;
      if (x < rect.width * 0.5) {
        if (hoverL) hoverL.classList.add('visible');
        if (hoverR) hoverR.classList.remove('visible');
      } else {
        if (hoverL) hoverL.classList.remove('visible');
        if (hoverR) hoverR.classList.add('visible');
      }
    });
    stage.addEventListener('mouseleave', function () {
      if (hoverL) hoverL.classList.remove('visible');
      if (hoverR) hoverR.classList.remove('visible');
    });

    /* 圆点 */
    dots.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        goTo(parseInt(dot.dataset.i, 10));
      });
    });

    /* 键盘 */
    document.addEventListener('keydown', function (e) {
      var rect = stage.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;
      if (e.key === 'ArrowLeft') flipPrev();
      else if (e.key === 'ArrowRight') flipNext();
    });

    /* 触摸 */
    stage.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { dx < 0 ? flipNext() : flipPrev(); }
    }, { passive: true });

    /* 初始化 */
    setPage(0);
    preloadNeighbors();
    updateHover();
  })();

  /* 键盘 ↓/↑ → 短按本页内滚 70%；长按连滚/连翻，松手即停 */
  /* 用计时器自行驱动连续滚动，不依赖 e.repeat；长按期间临时关闭
     CSS 的 scroll-behavior:smooth，避免平滑动画堆积导致界面卡住 */
  let holdTimeout = null;
  let holdInterval = null;
  let lastFlip = 0;
  const htmlEl = document.documentElement;

  function pageState() {
    const secs = Array.prototype.slice.call(document.querySelectorAll('main .sec, main .hero'));
    if (!secs.length) return null;
    const vmid = window.innerHeight * 0.5;
    let idx = 0, best = Infinity;
    secs.forEach(function (s, i) {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vmid);
      if (d < best) { best = d; idx = i; }
    });
    const cur = secs[idx].getBoundingClientRect();
    const secTopAbs = cur.top + window.scrollY;
    const secBotAbs = cur.bottom + window.scrollY;
    const viewBot = window.scrollY + window.innerHeight;
    const remainBottom = secBotAbs - viewBot;
    const remainTop = window.scrollY - secTopAbs;
    let edgeF = 0.12;
    const sid = secs[idx].id;
    if (sid === 'project2' || sid === 'experience') edgeF = 0.04;
    else if (sid === 'project1') edgeF = 0.14;
    const edge = window.innerHeight * edgeF;
    return { secs: secs, idx: idx, remainBottom: remainBottom, remainTop: remainTop, edge: edge };
  }

  function flipTo(dir) {
    const st = pageState();
    if (!st) return;
    if (dir > 0 && st.idx < st.secs.length - 1) {
      st.secs[st.idx + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (dir < 0 && st.idx > 0) {
      st.secs[st.idx - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function stepHold(dir) {
    const st = pageState();
    if (!st) return;
    if (dir > 0) {
      if (st.remainBottom > st.edge) {
        window.scrollBy({ top: window.innerHeight * 0.16 });
      } else if (st.idx < st.secs.length - 1) {
        const now = Date.now();
        if (now - lastFlip >= 350) { lastFlip = now; flipTo(1); }
      }
    } else {
      if (st.remainTop > st.edge) {
        window.scrollBy({ top: -window.innerHeight * 0.16 });
      } else if (st.idx > 0) {
        const now = Date.now();
        if (now - lastFlip >= 350) { lastFlip = now; flipTo(-1); }
      }
    }
  }

  function stopHold() {
    if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
    if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
    htmlEl.style.scrollBehavior = '';
  }

  function startHold(dir) {
    stopHold();
    stepHold(dir);
    htmlEl.style.scrollBehavior = 'auto';   /* 连滚期间瞬时滚动，避免 smooth 动画堆积 */
    holdInterval = setInterval(function () { stepHold(dir); }, 60);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    const dir = (e.key === 'ArrowDown') ? 1 : -1;
    e.preventDefault();
    if (e.repeat) return;   /* 长按由下方计时器驱动，忽略系统重复事件 */
    /* 短按：先做一次 70% 滚动或翻页（保留原手感） */
    const st = pageState();
    if (!st) return;
    if (dir > 0) {
      if (st.remainBottom > st.edge) window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
      else flipTo(1);
    } else {
      if (st.remainTop > st.edge) window.scrollBy({ top: -window.innerHeight * 0.7, behavior: 'smooth' });
      else flipTo(-1);
    }
    /* 若按住超过 200ms 仍未松开，进入连续滚动 */
    holdTimeout = setTimeout(function () { startHold(dir); }, 200);
  });

  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') stopHold();
  });
  window.addEventListener('blur', stopHold);

})();
