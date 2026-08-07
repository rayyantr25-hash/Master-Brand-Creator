/* ============================================
   MASTER BRAND CREATORS — INTERACTIONS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Loader ---------- */
  const loader = document.querySelector('.loader');
  const loaderFill = document.querySelector('.loader-bar-fill');
  const loaderPercent = document.querySelector('.loader-percent');
  let loaderDone = false;

  // Cinematic counter that eases toward ~90% while assets load, then snaps to 100%.
  const counterObj = { val: 0 };
  gsap.to(counterObj, {
    val: 92,
    duration: 1.8,
    ease: 'power1.out',
    onUpdate: () => {
      const v = Math.floor(counterObj.val);
      if (loaderFill) loaderFill.style.width = v + '%';
      if (loaderPercent) loaderPercent.textContent = v + '%';
    }
  });

  function finishLoad() {
    if (loaderDone) return;
    loaderDone = true;
    gsap.to(counterObj, {
      val: 100,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        const v = Math.floor(counterObj.val);
        if (loaderFill) loaderFill.style.width = v + '%';
        if (loaderPercent) loaderPercent.textContent = v + '%';
      },
      onComplete: () => {
        gsap.to(loader, {
          yPercent: -100,
          duration: 0.9,
          delay: 0.25,
          ease: 'power4.inOut',
          onComplete: () => { loader.style.display = 'none'; playHeroIntro(); }
        });
      }
    });
  }
  window.addEventListener('load', finishLoad);
  setTimeout(finishLoad, 2600); // safety fallback

  /* ---------- Lenis smooth scroll ---------- */
  let lenis;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Simple section reveal ----------
     Each top-level <section> in <main> gently fades and rises into
     place as it enters the viewport — no pinning, no scroll-jacking.
     Individual cards inside sections use the existing .reveal /
     .reveal-stagger utilities below for their own fade-in. */
  function initSectionReveal() {
    const main = document.querySelector('main');
    if (!main || reduceMotion) return;
    const sections = gsap.utils.toArray(main.children).filter((el) => el.tagName === 'SECTION');
    sections.forEach((section, i) => {
      if (i === 0) return; // hero plays its own load-in intro
      gsap.fromTo(section,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 85%' }
        }
      );
    });
  }
  initSectionReveal();

  /* ---------- Navbar: glass state + hide-on-scroll / reveal-on-scroll-up ---------- */
  const navbar = document.querySelector('.navbar');
  ScrollTrigger.create({
    start: 'top -80',
    end: 99999,
    toggleClass: { targets: navbar, className: 'scrolled' }
  });

  let navLastY = window.scrollY;
  let navVisible = true;
  function handleNavReveal(y) {
    if (!navbar || document.body.classList.contains('menu-open')) { navLastY = y; return; }
    const delta = y - navLastY;
    const pastThreshold = y > 140;
    if (pastThreshold && delta > 6 && navVisible) {
      navVisible = false;
      navbar.classList.add('nav-hidden');
    } else if ((delta < -6 || y <= 140) && !navVisible) {
      navVisible = true;
      navbar.classList.remove('nav-hidden');
    }
    navLastY = y;
  }
  if (lenis) {
    lenis.on('scroll', (e) => handleNavReveal(e && typeof e.scroll === 'number' ? e.scroll : window.scrollY));
  } else {
    window.addEventListener('scroll', () => handleNavReveal(window.scrollY), { passive: true });
  }

  /* ---------- Mobile menu: GSAP timeline open/close ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mmLinks = mobileMenu ? mobileMenu.querySelectorAll('.mobile-menu-links a') : [];
  const mmFooterItems = mobileMenu ? mobileMenu.querySelectorAll('.mobile-menu-footer > *') : [];
  let menuOpen = false;
  let menuTl = null;

  if (mobileMenu && navToggle && !reduceMotion) {
    menuTl = gsap.timeline({ paused: true })
      .fromTo(mobileMenu,
        { clipPath: 'circle(0% at calc(100% - 48px) 48px)' },
        { clipPath: 'circle(150% at calc(100% - 48px) 48px)', duration: 0.85, ease: 'power4.inOut' }
      )
      .fromTo(mmLinks,
        { yPercent: 115, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.75, ease: 'power4.out', stagger: 0.06 },
        '-=0.45'
      )
      .fromTo(mmFooterItems,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.06 },
        '-=0.35'
      );
  }

  function openMobileMenu() {
    menuOpen = true;
    document.body.classList.add('menu-open');
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    if (menuTl) { menuTl.play(); } else { mobileMenu.classList.add('open'); }
  }
  function closeMobileMenu() {
    menuOpen = false;
    document.body.classList.remove('menu-open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    if (menuTl) { menuTl.reverse(); } else { mobileMenu.classList.remove('open'); }
  }
  navToggle?.addEventListener('click', () => (menuOpen ? closeMobileMenu() : openMobileMenu()));
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => { if (menuOpen) closeMobileMenu(); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMobileMenu();
  });

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector('.cursor');
  const cursorRing = document.querySelector('.cursor-ring');
  if (cursor && window.matchMedia('(min-width: 901px)').matches) {
    document.documentElement.classList.add('custom-cursor-ready');
    let mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
    });
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      cursorRing.style.left = rx + 'px';
      cursorRing.style.top = ry + 'px';
    });
    document.querySelectorAll('a, button, .service-card, .work-item').forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('is-active'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('is-active'));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('.magnetic-target').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(el, { x: x * 0.35, y: y * 0.5, duration: 0.4, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* ---------- Floating hero tags — mouse-reactive drift ---------- */
  const floaters = document.querySelectorAll('.floater');
  if (floaters.length && window.matchMedia('(min-width: 901px)').matches) {
    window.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      floaters.forEach((f, i) => {
        const depth = (i + 1) * 6;
        gsap.to(f, { x: dx * depth, y: dy * depth, duration: 1.2, ease: 'power2.out' });
      });
    });
  }

  /* ---------- Hero intro (text reveal) ---------- */
  function playHeroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) tl.from(heroCanvas, { opacity: 0, duration: 1.4, ease: 'power2.out' }, 0);
    gsap.set('.hero h1 .line span', { yPercent: 110 });
    tl.to('.hero h1 .line span', { yPercent: 0, duration: 1.1, stagger: 0.08 })
      .from('.hero-sub', { opacity: 0, y: 20, duration: 0.8 }, '-=0.6')
      .from('.hero-actions', { opacity: 0, y: 20, duration: 0.8 }, '-=0.6')
      .from('.floater', { opacity: 0, scale: 0.8, stagger: 0.1, duration: 0.6 }, '-=0.5')
      .from('.scroll-cue', { opacity: 0, duration: 0.6 }, '-=0.4');
  }
  if (reduceMotion) {
    document.querySelectorAll('.hero h1 .line span').forEach(s => s.style.transform = 'translateY(0)');
  }

  /* ---------- Generic scroll reveals ---------- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  gsap.utils.toArray('.reveal-stagger').forEach((group) => {
    const items = group.children;
    gsap.from(items, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 85%' }
    });
  });

  /* ---------- Counters ---------- */
  document.querySelectorAll('.stat-num').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.childNodes[0].nodeValue = (Number.isInteger(target) ? Math.floor(obj.val) : obj.val.toFixed(1));
          },
          onComplete: () => { el.childNodes[0].nodeValue = target; }
        });
      }
    });
  });

  /* ---------- Work item image parallax ---------- */
  gsap.utils.toArray('.work-media img').forEach((img) => {
    gsap.to(img, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- Testimonials (Swiper) ---------- */
  if (window.Swiper) {
    new Swiper('.testimonial-swiper', {
      loop: true,
      autoplay: { delay: 5500, disableOnInteraction: false },
      speed: 700,
      effect: 'slide',
      pagination: { el: '.testimonial-nav', clickable: true, bulletActiveClass: 'active', bulletClass: 'testimonial-dot' },
    });
  }

  /* ---------- Back to top ---------- */
  document.querySelector('.back-to-top')?.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- Smooth in-page nav links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          if (lenis) lenis.scrollTo(target, { offset: -60 });
          else target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ---------- Process item pinned progress line (subtle) ---------- */
  gsap.utils.toArray('.process-item').forEach((item) => {
    gsap.from(item, {
      opacity: 0,
      x: -20,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: item, start: 'top 90%' }
    });
  });
});

/* ---------- FAQ accordion (all pages) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach((i) => {
        i.classList.remove('open');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Portfolio filter ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const masonryItems = document.querySelectorAll('.masonry-item');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      masonryItems.forEach((item) => {
        const match = filter === 'all' || item.dataset.category === filter;
        item.style.display = match ? 'block' : 'none';
      });
    });
  });

  /* ---------- Blog search ---------- */
  const searchInput = document.querySelector('.search-input');
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll('.blog-card').forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  /* ---------- Contact form (demo submit, no backend) ---------- */
  const contactForm = document.querySelector('.contact-form');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    contactForm.querySelectorAll('[required]').forEach((field) => {
      const wrap = field.closest('.form-field');
      if (!field.value.trim()) {
        valid = false;
        wrap?.classList.add('field-invalid');
        setTimeout(() => wrap?.classList.remove('field-invalid'), 450);
      }
    });
    if (!valid) return;

    const btn = contactForm.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.textContent = 'Message sent';
    btn.classList.add('is-success');
    contactForm.reset();
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('is-success'); }, 3000);
  });
});

/* ============================================
   AWWWARDS UPGRADE LAYER
   Scroll progress, active nav, SplitType reveals,
   3D tilt cards, button ripples, portfolio modal,
   testimonial progress.
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Scroll progress bar ---------- */
  const progressEl = document.querySelector('.scroll-progress');
  function updateProgress() {
    const h = document.documentElement;
    const max = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    if (progressEl) progressEl.style.setProperty('--progress', pct + '%');
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Active nav link ---------- */
  const currentPath = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const file = href.split('#')[0];
    if (file && file === currentPath) a.classList.add('active');
    if (currentPath === 'index.html' && (href === '' )) a.classList.add('active');
  });

  /* ---------- SplitType heading reveals: line-masked, staggered ---------- */
  if (window.SplitType && !reduceMotion) {
    const headings = document.querySelectorAll(
      '.section-head h2, .page-hero h1, .cta-section h2, .error-page h2'
    );
    headings.forEach((el) => {
      if (el.closest('.hero')) return; // hero has its own custom load-in intro
      try {
        const split = new SplitType(el, {
          types: 'lines, words',
          tagName: 'span',
          lineClass: 'split-line',
          wordClass: 'split-word'
        });
        if (!split.words || !split.words.length) return;
        gsap.set(split.words, { opacity: 0, yPercent: 115, filter: 'blur(8px)' });
        gsap.to(split.words, {
          opacity: 1,
          yPercent: 0,
          filter: 'blur(0px)',
          duration: 1,
          stagger: 0.025,
          ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
      } catch (err) { /* graceful fallback: heading stays static */ }
    });

    /* ---------- Subtle body-copy reveal (paragraphs near headings) ---------- */
    const copy = document.querySelectorAll(
      '.section-head p, .page-hero p.lead, .cta-section p, .service-detail p'
    );
    copy.forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.set(el, { opacity: 0, y: 16 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
  }

  /* ---------- 3D tilt / glass cards ---------- */
  const tiltSelectors = '.service-card, .work-item, .masonry-item, .price-card, .blog-card, .achv-card, .mv-card, .team-card, .contact-info-card, .category-card, .subservice-card';
  const tiltEls = document.querySelectorAll(tiltSelectors);
  tiltEls.forEach((el) => {
    el.classList.add('tilt-init');
    const isDesktop = window.matchMedia('(min-width: 901px)').matches;

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
      if (isDesktop && !reduceMotion) {
        const rotY = (px - 0.5) * 8;
        const rotX = (0.5 - py) * 8;
        gsap.to(el, { rotateY: rotY, rotateX: rotX, y: -6, scale: 1.025, duration: 0.5, ease: 'power2.out', transformPerspective: 800 });
      }
    });
    el.addEventListener('mouseenter', () => {
      if (isDesktop && !reduceMotion) {
        gsap.to(el, { scale: 1.02, duration: 0.4, ease: 'power2.out' });
      }
    });
    el.addEventListener('mouseleave', () => {
      if (isDesktop && !reduceMotion) {
        gsap.to(el, { rotateY: 0, rotateX: 0, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
      }
    });
  });

  /* ---------- Magnetic pull on every button (lighter touch than the hero's .magnetic-target) ---------- */
  if (!reduceMotion && window.matchMedia('(min-width: 901px)').matches) {
    document.querySelectorAll('.btn:not(.magnetic-target)').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(el, { x: x * 0.16, y: y * 0.22, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ---------- Button ripple ---------- */
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const r = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      const size = Math.max(r.width, r.height) * 1.4;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });

  /* ---------- Portfolio modal preview ---------- */
  const masonryItems = document.querySelectorAll('.masonry-item');
  if (masonryItems.length) {
    const modal = document.createElement('div');
    modal.className = 'mbc-modal';
    modal.innerHTML = `
      <div class="mbc-modal-inner">
        <button class="mbc-modal-close" aria-label="Close preview">&times;</button>
        <img src="" alt="">
        <div class="mbc-modal-body">
          <span class="work-tag mbc-modal-tag"></span>
          <h3 class="mbc-modal-title"></h3>
          <p>Tap through for the full case study — process, deliverables, and results.</p>
          <a href="case-study.html" class="btn btn-primary mbc-modal-link" style="margin-top:20px;">View case study <span class="btn-arrow">&rarr;</span></a>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const modalImg = modal.querySelector('img');
    const modalTitle = modal.querySelector('.mbc-modal-title');
    const modalTag = modal.querySelector('.mbc-modal-tag');
    const modalLink = modal.querySelector('.mbc-modal-link');

    function openModal(item) {
      const img = item.querySelector('img');
      const title = item.querySelector('h4')?.textContent || '';
      const tag = item.querySelector('.work-tag')?.textContent || '';
      modalImg.src = img?.src || '';
      modalImg.alt = img?.alt || '';
      modalTitle.textContent = title;
      modalTag.textContent = tag;
      modalLink.href = item.dataset.case || item.getAttribute('href') || 'case-study.html';
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    masonryItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(item);
      });
    });
    modal.querySelector('.mbc-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  /* ---------- Testimonial progress bar ---------- */
  const testimonialNav = document.querySelector('.testimonial-nav');
  if (testimonialNav && window.Swiper) {
    const progressWrap = document.createElement('div');
    progressWrap.className = 'testimonial-progress';
    progressWrap.innerHTML = '<div class="testimonial-progress-fill"></div>';
    testimonialNav.insertAdjacentElement('afterend', progressWrap);
    const fill = progressWrap.querySelector('.testimonial-progress-fill');

    const swiperEl = document.querySelector('.testimonial-swiper')?.swiper;
    if (swiperEl && swiperEl.params.autoplay) {
      gsap.ticker.add(() => {
        try {
          const progress = swiperEl.autoplay?.timeLeft
            ? 1 - (swiperEl.autoplay.timeLeft / swiperEl.params.autoplay.delay)
            : 0;
          fill.style.width = (Math.min(1, Math.max(0, progress)) * 100) + '%';
        } catch (e) {}
      });
    }
  }
});
