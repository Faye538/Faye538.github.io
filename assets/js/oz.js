/* ============================================================
   《绿野仙踪》AI 立体书 · 创作手账  |  轻交互
   原则：互动服务于内容 —— 翻纸片、看记录、展开 Prompt、播放影片
   ============================================================ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- 1. 撕纸边缘生成器 ---------- */
  function tornPath(amount) {
    const jag = (n, amp) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 100;
        const v = (Math.random() - 0.5) * amp;
        pts.push([+t.toFixed(2), +v.toFixed(2)]);
      }
      return pts;
    };
    const top = jag(9, amount).map(([x, y]) => `${x}% ${y.toFixed(2)}%`);
    const r = [], b = [], l = [];
    for (let i = 1; i < 7; i++) r.push(`${(100 + (Math.random() - 0.5) * amount).toFixed(2)}% ${((i / 7) * 100).toFixed(2)}%`);
    for (let i = 1; i < 9; i++) b.push(`${(100 - (i / 9) * 100).toFixed(2)}% ${(100 + (Math.random() - 0.5) * amount).toFixed(2)}%`);
    for (let i = 1; i < 7; i++) l.push(`${((Math.random() - 0.5) * amount).toFixed(2)}% ${(100 - (i / 7) * 100).toFixed(2)}%`);
    return 'polygon(' + [...top, ...r, ...b, ...l].join(', ') + ')';
  }
  $$('[data-torn]').forEach((el) => {
    const amt = parseFloat(el.dataset.torn) || 1.6;
    el.style.clipPath = tornPath(amt);
  });

  /* ---------- 2. 鼠标视差 ---------- */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const layers = $$('.plx');
    const tick = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      layers.forEach((el) => {
        const d = parseFloat(el.dataset.depth || 1);
        el.style.setProperty('--px', (cx * d).toFixed(3));
        el.style.setProperty('--py', (cy * d).toFixed(3));
      });
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(tick) : null;
    };
    window.addEventListener('mousemove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ---------- 3. 滚动揭示 ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('on'));

  /* ---------- 4. 阅读进度 + 章节书签 ---------- */
  const bar = $('#progress');
  const tabs = $$('.tabs a');
  const spreads = $$('.spread[data-chap]');
  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    if (bar) bar.style.height = (p * 100).toFixed(2) + '%';

    const mid = window.scrollY + window.innerHeight * 0.34;
    let cur = null;
    spreads.forEach((s) => { if (s.offsetTop <= mid) cur = s.dataset.chap; });
    tabs.forEach((a) => a.classList.toggle('on', a.dataset.to === cur));
    document.body.classList.toggle('is-cover', window.scrollY < window.innerHeight * 0.6);
  }
  let st = null;
  window.addEventListener('scroll', () => {
    if (st) return;
    st = requestAnimationFrame(() => { st = null; onScroll(); });
  }, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- 5. 手绘路线：滚动描线 ---------- */
  const paths = $$('path[data-draw]');
  paths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = p.dataset.dash || '9 13';
    p.dataset.len = len;
    if (reduce) p.style.strokeDashoffset = 0;
  });
  if (!reduce && 'IntersectionObserver' in window) {
    const pio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        const p = en.target;
        const wrap = p.closest('[data-drawwrap]') || p.parentElement;
        const rect = wrap.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.6)));
        p.style.strokeDashoffset = ((1 - prog) * (parseFloat(p.dataset.len) || 1000)).toFixed(1);
      });
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    paths.forEach((p) => pio.observe(p));
  }

  /* ---------- 6. 撕开 / 展开 Prompt ---------- */
  $$('.prompt-block').forEach((block) => {
    const btn = $('.pbtn--toggle', block);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = block.dataset.collapsed === 'true';
      block.dataset.collapsed = open ? 'false' : 'true';
      btn.setAttribute('aria-pressed', String(open));
      btn.textContent = open ? (btn.dataset.labelLess || '收起') : (btn.dataset.labelMore || '展开全文');
    });
    btn.textContent = btn.dataset.labelMore || '展开全文';
    btn.setAttribute('aria-pressed', 'false');
  });

  /* ---------- 7. 复制 Prompt ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const src = document.getElementById(btn.dataset.copy);
      if (!src) return;
      const text = src.innerText.replace(/\u00a0/g, ' ');
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      const old = btn.textContent;
      btn.textContent = '✓ 已复制';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1800);
    });
  });

  /* ---------- 8. 作品灯箱 ---------- */
  const lb = $('#lightbox');
  if (lb) {
    const img = $('img', lb), cap = $('.lb__cap', lb);
    const open = (src, text) => {
      img.src = src; img.alt = text || '';
      cap.textContent = text || '';
      lb.classList.add('on');
      document.documentElement.style.overflow = 'hidden';
    };
    const close = () => {
      lb.classList.remove('on');
      document.documentElement.style.overflow = '';
    };
    $$('[data-lightbox]').forEach((el) => {
      const go = (e) => {
        if (e) e.preventDefault();
        const s = el.dataset.lightbox;
        if (s) open(s, el.dataset.caption || '');
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
    $('.lb__x', lb).addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------- 9. 从静态到动态：分步点亮（不塌陷版面） ---------- */
  $$('[data-pipeline]').forEach((root) => {
    const setStage = (n) => {
      root.dataset.stage = String(n);
      $$('.tt', root).forEach((el, i) => {
        const k = i + 1, unlocked = k <= n;
        el.hidden = false;                              // 始终占位：靠明暗区分进度
        el.classList.toggle('tt--locked', !unlocked);
        el.classList.toggle('on', unlocked);
        el.classList.toggle('tt--cur', k === n);        // 刚点亮的那一格才挂提示
        el.classList.toggle('tt--next', k === n + 1);   // 下一格才提示“可点”
      });
      const panel = $('.motion-panel', root);
      if (panel) {
        panel.hidden = false;
        panel.classList.toggle('is-locked', n < 4);
      }
      const tip = $('[data-stage-tip]', root);
      if (tip) tip.textContent = tip.dataset['stageTip' + n] || '';
      if (n >= 4) {
        const v = root.querySelector('video');
        if (v) { v.setAttribute('preload', 'auto'); if (v.readyState < 1) v.load(); }
      }
    };
    setStage(1);
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-advance]');
      if (!t) return;
      const cur = parseInt(root.dataset.stage || '1', 10);
      if (cur >= 4) return;
      setStage(cur + 1);
    });
  });

  /* ---------- 10. 放映厅：切换片段 ---------- */
  $$('[data-screenlist]').forEach((list) => {
    const items = $$('.screenlist__item', list);
    items.forEach((it) => {
      it.addEventListener('click', () => {
        const stage = document.querySelector(it.dataset.target || '#mainScreen');
        if (!stage) return;
        const v = stage.querySelector('video');
        if (!v) return;
        items.forEach((o) => o.classList.remove('on'));
        it.classList.add('on');
        v.pause();
        v.setAttribute('src', it.dataset.src);
        v.setAttribute('poster', it.dataset.poster || '');
        v.load();
        const cap = document.querySelector('[data-screen-caption]');
        if (cap) cap.textContent = it.dataset.caption || '';
      });
    });
  });

  /* ---------- 11. 视频首次进入视野时懒加载海报 ---------- */
  $$('video[data-lazy]').forEach((v) => {
    if (!('IntersectionObserver' in window)) { v.setAttribute('preload', 'metadata'); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { v.setAttribute('preload', 'metadata'); io.disconnect(); } });
    }, { rootMargin: '200px' });
    io.observe(v);
  });

  /* ---------- 12. 角色档案：点击展开对应 Prompt ---------- */
  $$('[data-char]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const id = card.dataset.char;
      const target = document.getElementById('cast-' + id);
      if (!target) return;
      const open = target.hidden;
      $$('[data-char]').forEach((c) => c.classList.remove('is-open'));
      if (open) {
        target.hidden = false;
        card.classList.add('is-open');
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      } else target.hidden = true;
    });
  });

  /* ---------- 13. 键盘：方向键翻章 ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea')) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const mid = window.scrollY + window.innerHeight * 0.34;
    let idx = 0;
    spreads.forEach((s, i) => { if (s.offsetTop <= mid) idx = i; });
    const j = Math.min(spreads.length - 1, Math.max(0, e.key === 'ArrowDown' ? idx + 1 : idx - 1));
    if (j === idx) return;
    e.preventDefault();
    window.scrollTo({ top: spreads[j].offsetTop - 14, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- 14. 首屏轻微倾斜跟随 ---------- */
  const cover = $('.cover__paper');
  if (cover && !reduce && window.matchMedia('(pointer: fine)').matches) {
    cover.addEventListener('mousemove', (e) => {
      const r = cover.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      cover.style.transform = `rotate(${(-1.15 + dx * 1.1).toFixed(2)}deg) translate(${(dx * 5).toFixed(2)}px, ${(dy * 4).toFixed(2)}px)`;
    });
    cover.addEventListener('mouseleave', () => { cover.style.transform = ''; });
  }

  onScroll();
  document.documentElement.classList.add('js-on');
})();
