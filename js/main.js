/* ============================================================
   afterbeatsmusic — Main JavaScript
   Stack: GSAP 3 + ScrollTrigger | Lenis | Barba.js
   ============================================================ */

'use strict';

/* ── Helpers ──────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── GSAP plugin registration ─────────────────────────────── */
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Page-resource registry ────────────────────────────────
   Every per-page init registers anything that survives past
   the next Barba leave — IntersectionObservers, requestAnimationFrame
   ticks, AbortControllers for window/document listeners. On the next
   teardown call we disconnect them all. Without this, observers and
   rAF loops from previous pages stack on every Barba transition and
   the site gets slower the more you navigate.
   ─────────────────────────────────────────────────────────── */
const pageResources = {
  observers: [],   // IntersectionObservers / MutationObservers
  rafs:      [],   // requestAnimationFrame handles (numbers)
  aborts:    [],   // AbortControllers
};

function registerObserver(obs)  { pageResources.observers.push(obs); return obs; }
function registerRaf(id)        { pageResources.rafs.push(id);       return id;  }
function registerAbort()        { const c = new AbortController(); pageResources.aborts.push(c); return c; }

function teardownPageResources() {
  pageResources.observers.forEach(o => { try { o.disconnect(); } catch (e) {} });
  pageResources.rafs.forEach(id => { try { cancelAnimationFrame(id); } catch (e) {} });
  pageResources.aborts.forEach(c => { try { c.abort(); } catch (e) {} });
  pageResources.observers.length = 0;
  pageResources.rafs.length      = 0;
  pageResources.aborts.length    = 0;
}

/* ═══════════════════════════════════════════════════════════
   1.  LENIS SMOOTH SCROLL
   ═══════════════════════════════════════════════════════════ */
let lenis;
let pendingNavigationHash = '';

function initLenis() {
  if (typeof Lenis === 'undefined') return;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
  });

  if (typeof gsap !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    // Fallback RAF loop without GSAP
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
}

/* ═══════════════════════════════════════════════════════════
   2.  PAGE LOADER
   ═══════════════════════════════════════════════════════════ */
function initLoader() {
  const loader = qs('#pageLoader');
  if (!loader) return;

  const hide = () => {
    loader.style.transition = 'opacity 0.5s ease';
    loader.style.opacity    = '0';
    setTimeout(() => {
      loader.style.display       = 'none';
      loader.style.pointerEvents = 'none';
    }, 520);
  };

  if (document.readyState === 'complete') {
    setTimeout(hide, 200);
  } else {
    window.addEventListener('load', () => setTimeout(hide, 200));
  }

  // Absolute fallback after 3s
  setTimeout(hide, 3000);
}

/* ═══════════════════════════════════════════════════════════
   3.  NAVIGATION
   ═══════════════════════════════════════════════════════════ */
function initNav() {
  const nav    = qs('#masterNav');
  const toggle = qs('#navToggle');
  const mobile = qs('#mobileMenu');
  if (!nav) return;

  // Sticky scroll class — bound via AbortController so Barba leave removes it
  const navAbort = registerAbort();
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true, signal: navAbort.signal });
  onScroll();

  // Mobile hamburger toggle
  if (toggle && mobile) {
    toggle.addEventListener('click', () => {
      const open = mobile.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      mobile.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on any link click inside mobile menu
    qsa('a', mobile).forEach(link =>
      link.addEventListener('click', () => {
        mobile.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        mobile.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      })
    );
  }

  // Dynamic copyright year
  qsa('.copyright-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/* ═══════════════════════════════════════════════════════════
   4.  KAITONOTE SPOTLIGHT  — hero with floating 3D album covers
       Arranges 8 covers in a ring around the centered headline,
       plays a fly-in entrance on load, then gently floats forever.
       No scroll pinning — the hero is a normal 100vh block.
   ═══════════════════════════════════════════════════════════ */
function initSpotlight() {
  if (typeof gsap === 'undefined') return;

  const section = qs('.kaitonote-spotlight');
  if (!section) return;

  const imgs  = qsa('.spotlight-img', section);
  const intro = qs('#spotlightIntro');
  const outro = qs('#spotlightOutro');
  if (!imgs.length || !intro) return;

  // Final resting positions around the headline
  const positions = [
    { x: -440, y: -210, z:  -80, r: -10 },
    { x:  440, y: -220, z: -130, r:   9 },
    { x: -520, y:   40, z: -110, r:  -6 },
    { x:  520, y:   60, z:  -60, r:   7 },
    { x: -340, y:  260, z: -140, r:  -8 },
    { x:  340, y:  270, z:  -90, r:   6 },
    { x: -160, y: -300, z: -170, r:  -4 },
    { x:  180, y: -280, z: -150, r:   5 },
  ];

  gsap.set(imgs, {
    transformPerspective: 1100,
    xPercent: -50,
    yPercent: -50,
    x: 0, y: 0, z: -2000,
    opacity: 0,
    scale: 0.65,
    rotation: 0,
  });

  if (outro) gsap.set(outro, { opacity: 0, y: 40, display: 'none' });

  imgs.forEach((img, i) => {
    const p = positions[i % positions.length];

    // Fly-in entrance
    gsap.to(img, {
      x: p.x, y: p.y, z: p.z, rotation: p.r,
      opacity: 0.88, scale: 1,
      duration: 1.6,
      delay: 0.35 + i * 0.09,
      ease: 'power3.out',
      onComplete: () => {
        // Gentle floating loop on Y around the resting position
        gsap.to(img, {
          y: p.y + 14,
          duration: 2.8 + Math.random() * 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
        // Subtle rotation breath
        gsap.to(img, {
          rotation: p.r + (p.r >= 0 ? 1.5 : -1.5),
          duration: 3.4 + Math.random() * 1.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      },
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   5.  SCROLL REVEAL  — IntersectionObserver (primary, no GSAP dep)
       + GSAP enhancement when available
       FIX: elements are NEVER hidden by CSS. JS hides them with
            inline style ONLY right before observing, so if JS
            fails the elements are still visible.
   ═══════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const els = qsa('[data-animate-fade-in]');
  if (!els.length) return;

  // Mark & hide elements via inline style (not CSS class)
  // so HTML/CSS alone never causes invisible content
  els.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.7s cubic-bezier(0.625,0.05,0,1), transform 0.7s cubic-bezier(0.625,0.05,0,1)';
  });

  const delay = (el) => parseFloat(el.dataset.delay || 0) * 0.12;

  // Helper to animate an element in
  const reveal = (el) => {
    const d = delay(el);
    if (typeof gsap !== 'undefined') {
      // GSAP path — clear transition so GSAP owns it
      el.style.transition = 'none';
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        delay: d,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    } else {
      // CSS transition fallback
      setTimeout(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, d * 1000);
    }
  };

  // IntersectionObserver is the most reliable trigger mechanism
  const io = registerObserver(new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  }));

  els.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════
   6.  SLIDE IN FROM BOTTOM  (contact tiles)
   ═══════════════════════════════════════════════════════════ */
function initSlideInFromBottom() {
  const els = qsa('[data-animate-slide-in-from-bottom]');
  if (!els.length) return;

  els.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(50px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.625,0.05,0,1), transform 0.8s cubic-bezier(0.625,0.05,0,1)';
  });

  const d = (el) => parseFloat(el.dataset.delay || 0) * 0.13;

  const io = registerObserver(new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el  = entry.target;
        const del = d(el);
        if (typeof gsap !== 'undefined') {
          el.style.transition = 'none';
          gsap.to(el, { opacity: 1, y: 0, duration: 0.9, delay: del, ease: 'power3.out' });
        } else {
          setTimeout(() => {
            el.style.opacity   = '1';
            el.style.transform = 'translateY(0)';
          }, del * 1000);
        }
        io.unobserve(el);
      }
    });
  }, { threshold: 0.1 }));

  els.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════
   7.  PARAGRAPH REVEAL  (contact hero "Let's become friends!")
       FIX: simpler — just fade/slide the whole heading, not word-split
   ═══════════════════════════════════════════════════════════ */
function initParagraphReveal() {
  qsa('[data-animate-paragraph-reveal]').forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(36px)';

    const io = registerObserver(new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (typeof gsap !== 'undefined') {
        el.style.transition = 'none';
        gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.1 });
      } else {
        el.style.transition = 'opacity 1s ease, transform 1s ease';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      }
      io.disconnect();
    }, { threshold: 0.15 }));

    io.observe(el);
  });
}

/* ═══════════════════════════════════════════════════════════
   8.  EMPLOYEE AVATAR ANIMATIONS
   ═══════════════════════════════════════════════════════════ */
function initAvatarAnimations() {
  if (typeof gsap === 'undefined') return;

  qsa('[data-animate-employee-avatar]').forEach((av, i) => {
    // Stagger entrance
    gsap.from(av, {
      opacity: 0,
      scale: 0.5,
      y: 20,
      duration: 0.55,
      delay: i * 0.07,
      ease: 'back.out(1.5)',
      immediateRender: false,   // ← KEY FIX: don't hide element before trigger
      scrollTrigger: {
        trigger: av,
        start: 'top 92%',
        once: true,
      },
    });

    // Gentle floating loop
    gsap.to(av, {
      y: -(4 + Math.random() * 5),
      duration: 1.4 + Math.random() * 1.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 2,
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   9.  TRUSTED-BY SCROLLER  — pause on hover
   ═══════════════════════════════════════════════════════════ */
function initTrustedScroller() {
  const track = qs('.trusted-track');
  if (!track) return;
  track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
  track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
}

/* ═══════════════════════════════════════════════════════════
   10a. MANIFESTO — quote + word-split scroll reveal + CTA/team
   ═══════════════════════════════════════════════════════════ */
function initManifesto() {
  const section = qs('.manifesto');
  if (!section) return;

  // 1) Split the manifesto paragraph into per-word spans
  const textEl = qs('[data-manifesto-text]', section);
  if (textEl && !textEl.dataset.split) {
    const raw = textEl.innerHTML;               // preserve &mdash; etc.
    // Wrap words; keep whitespace as-is so line breaks behave naturally
    textEl.innerHTML = raw
      .split(/(\s+)/)
      .map(chunk => {
        if (/^\s+$/.test(chunk) || chunk === '') return chunk;
        return `<span class="mf-word">${chunk}</span>`;
      })
      .join('');
    textEl.dataset.split = '1';
  }

  const reveals = qsa('[data-manifesto-reveal]', section);

  // GSAP path
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    // Quote / CTA / team strip — fade-up on enter
    reveals.forEach(el => {
      const d = parseFloat(el.dataset.delay || 0) * 0.12;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: d,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // Word-by-word scrubbed reveal, tied to scroll progress through the text
    const words = qsa('.mf-word', textEl);
    if (words.length) {
      gsap.fromTo(words,
        { opacity: 0.18, y: 18 },
        {
          opacity: 1, y: 0,
          ease: 'power2.out',
          stagger: { each: 0.05, from: 'start' },
          scrollTrigger: {
            trigger: textEl,
            start: 'top 82%',
            end: 'bottom 62%',
            scrub: 0.8,
          },
        }
      );
    }
    return;
  }

  // Fallback — CSS transition if GSAP isn't available
  reveals.forEach(el => {
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
  qsa('.mf-word', textEl).forEach(w => {
    w.style.transition = 'opacity 0.4s ease';
    w.style.opacity = '1';
  });
}

/* ═══════════════════════════════════════════════════════════
   10c. SHOWCASE STRIP — mixed image+video marquee
        Perf strategy:
        - Section observer: when the WHOLE strip leaves the viewport, all
          videos are paused (frees the decoder pipeline entirely).
        - Per-card observer: while the strip is visible, only the cards
          whose bounding rect is inside the viewport keep playing. This
          caps live decoders to whatever's actually on screen (~1–2)
          even though the marquee duplicates the deck.
        - Each video's currentTime is set from its data-offset so reused
          clips look like different content.
   ═══════════════════════════════════════════════════════════ */
function initShowcaseStrip() {
  const section = qs('.showcase-strip');
  if (!section) return;

  const videos = qsa('video', section);

  // Helpers: safe play / safe pause
  const safePlay  = v => { const p = v.play(); if (p && typeof p.catch === 'function') p.catch(() => {}); };
  const safePause = v => { try { v.pause(); } catch (e) {} };

  // Track whether the section is currently in viewport at all
  let sectionVisible = true;

  // Apply per-video time offsets + initial play attempt
  videos.forEach(v => {
    v.muted = true;
    v.setAttribute('muted', '');
    const offset = parseFloat(v.dataset.offset || 0);

    const seek = () => {
      try {
        if (!isNaN(v.duration) && v.duration > 0) {
          const target = Math.min(offset, Math.max(0, v.duration - 0.1));
          if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = target;
        }
      } catch (e) { /* metadata not ready */ }
    };

    if (v.readyState >= 1) seek();
    else v.addEventListener('loadedmetadata', seek, { once: true });
  });

  if (!('IntersectionObserver' in window)) {
    // No IO — just play everything (fallback)
    videos.forEach(safePlay);
    return;
  }

  // Per-card observer: only play the videos whose CARD is in the viewport.
  // Keeps live 4K decoders to roughly the on-screen count (~1–2) instead
  // of all 4 marquee duplicates.
  const cardObserver = registerObserver(new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const card = entry.target;
      const v = card.querySelector('video');
      if (!v) return;
      if (entry.isIntersecting && sectionVisible) {
        safePlay(v);
      } else {
        safePause(v);
      }
    });
  }, {
    root: null,
    threshold: 0.15,
  }));
  qsa('.sc-item.sc-video', section).forEach(card => cardObserver.observe(card));

  // Section observer: hard kill all decoders when the strip is fully off-screen,
  // and toggle .is-offscreen so the CSS marquee animation freezes too.
  const sectionObserver = registerObserver(new IntersectionObserver(([entry]) => {
    sectionVisible = entry.isIntersecting;
    section.classList.toggle('is-offscreen', !sectionVisible);
    if (!sectionVisible) videos.forEach(safePause);
    // When the section comes back, the per-card observer's next callback
    // will resume the visible ones.
  }, { threshold: 0 }));
  sectionObserver.observe(section);

  // Pause the marquee on touch so mobile users can read individual cards
  const track = qs('.showcase-track', section);
  if (track) {
    const sa = registerAbort();
    track.addEventListener('touchstart', () => {
      track.style.animationPlayState = 'paused';
    }, { passive: true, signal: sa.signal });
    track.addEventListener('touchend', () => {
      track.style.animationPlayState = '';
    }, { passive: true, signal: sa.signal });
  }
}

/* ═══════════════════════════════════════════════════════════
   10d. STORY — pinned scrollytelling (flurry → zoom → stats → outro)
        Single GSAP timeline scrubbed to a 4× viewport pin. Layers:
          z:4  flurry images (15)        — phase 1
          z:5  story-h1 headline         — phase 1
          z:6  zooming video             — phase 2 (scales 0.15 → 1)
          z:10 phase-2 title + stats     — phase 2
          z:11 phase-3 closing headline  — phase 3
        Video playback is gated to its zoom window so we don't decode
        4K frames while the section is off-screen or in phase 1.
   ═══════════════════════════════════════════════════════════ */
function initStorySection() {
  const story = qs('.story');
  if (!story) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const flurry    = qsa('.sf-img', story);
  const videoWrap = qs('[data-story-video]', story);
  const video     = qs('#storyVideo', story);
  const h1        = qs('[data-story-h1]', story);
  const p2title   = qs('[data-story-p2title]', story);
  const stats     = qs('[data-story-stats]', story);
  const h3        = qs('[data-story-h3]', story);

  // Set the per-clip offset on the video so the same source feels distinct
  if (video) {
    video.muted = true;
    video.setAttribute('muted', '');
    const offset = parseFloat(video.dataset.offset || 0);
    const seek = () => {
      try {
        if (!isNaN(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(offset, Math.max(0, video.duration - 0.1));
        }
      } catch (e) { /* metadata not ready */ }
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
  }

  // ── Initial states (scrub will tween from these) ─────────────
  // CRITICAL: centering for h1 + h3 is owned by GSAP via xPercent/yPercent so
  // the transform-tweens don't wipe the CSS translate(-50%,-50%). Without this
  // the elements jump to the right/below center the moment GSAP applies scale
  // and the section reads as "all black" because everything is offscreen.
  // Each flurry image starts FAR back in 3D space. translateZ + opacity carry
  // the depth read on their own; we no longer animate `filter: blur(...)`
  // because GPU-side blur tweening across 15 elements while a 4K video scales
  // up was the single biggest scrub jank source on this page.
  // GSAP preserves the per-image CSS rotation (rotate(-4deg) etc.) because
  // it merges with the existing transform rather than replacing it.
  flurry.forEach((img) => {
    gsap.set(img, { opacity: 0, z: -1600 });
  });
  gsap.set(h1,        { opacity: 0, scale: 0.92, xPercent: -50, yPercent: -50 });
  gsap.set(videoWrap, { opacity: 0, scale: 0.15, borderRadius: 14 });
  gsap.set(p2title,   { opacity: 0, y: -16 });
  gsap.set(stats,     { opacity: 0, y: 24 });
  gsap.set(h3,        { opacity: 0, scale: 0.94, xPercent: -50, yPercent: -50 });

  const safePlay  = () => { if (!video) return; const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  const safePause = () => { try { video && video.pause(); } catch (e) {} };

  // ── Master timeline ──────────────────────────────────────────
  // No JS pinning here — the section uses position:sticky in CSS for the
  // pin behaviour. ScrollTrigger only scrubs the timeline against scroll
  // progress through the 400vh of scrub-room inside the section.
  // will-change is added to the flurry images only while the timeline is
  // active (onEnter/onLeave) so the 15 compositor layers don't sit allocated
  // while the user is far above or below the section.
  const setLayers = (on) => {
    flurry.forEach(img => { img.style.willChange = on ? 'transform, opacity' : ''; });
    if (videoWrap) videoWrap.style.willChange = on ? 'transform, opacity, border-radius' : '';
  };
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: story,
      start: 'top top',
      end: 'bottom bottom',   // matches the 500vh section height (400vh of scrub + 100vh visible)
      scrub: 0.6,
      onUpdate: (self) => {
        if (!video) return;
        const p = self.progress;
        const shouldPlay = p > 0.36 && p < 0.99;
        if (shouldPlay && video.paused) safePlay();
        else if (!shouldPlay && !video.paused) safePause();
      },
      onEnter:      () => setLayers(true),
      onEnterBack:  () => setLayers(true),
      onLeave:      () => { safePause(); setLayers(false); },
      onLeaveBack:  () => { safePause(); setLayers(false); },
    },
  });

  // Phase 1.0 — opening headline fades in
  tl.to(h1, { opacity: 1, scale: 1, duration: 0.04, ease: 'power2.out' }, 0);

  // Phase 1.1 — image flurry, true 3D approach.
  // Each image: approach from z:-1600 (small + blurred) to z:0 (natural CSS
  // size, fully sharp), holds an instant, then drifts forward to z:300
  // (~17% larger via perspective math) while fading + a touch of blur so it
  // reads as passing the camera. The CSS rotation per .sf-N is preserved.
  flurry.forEach((img, i) => {
    const t = 0.05 + (i / flurry.length) * 0.38;     // 5% → ~43%
    // Approach — slow zoom-in from depth
    tl.to(img, {
      opacity: 1,
      z: 0,
      duration: 0.10,
      ease: 'power2.out',
    }, t);
    // Pass-through — small forward drift + fade
    tl.to(img, {
      opacity: 0,
      z: 300,
      duration: 0.05,
      ease: 'power1.in',
    }, t + 0.11);
  });

  // Phase 1 → 2 — opening headline pushes back + fades
  tl.to(h1, { opacity: 0, scale: 1.25, duration: 0.06 }, 0.42);

  // Phase 2 — video reveals, then continuously scales up to fill viewport.
  // Border-radius animates to 0 once it owns the whole viewport.
  tl.to(videoWrap, { opacity: 1, duration: 0.04 }, 0.40);
  tl.to(videoWrap, {
    scale: 1.0,
    duration: 0.42,
    ease: 'power2.inOut',
  }, 0.40);
  tl.to(videoWrap, { borderRadius: 0, duration: 0.06 }, 0.78);

  // Phase 2 overlay — title + stats fade in once video is ~75% scaled
  tl.to(p2title, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.66);
  tl.to(stats,   { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.70);

  // Phase 2 → 3 — phase-2 overlay clears
  tl.to(p2title, { opacity: 0, y: -16, duration: 0.04 }, 0.84);
  tl.to(stats,   { opacity: 0, y: 24,  duration: 0.04 }, 0.84);

  // Phase 3 — closing headline rises into place
  tl.to(h3, { opacity: 1, scale: 1, duration: 0.06, ease: 'power2.out' }, 0.88);

  // Video gating is handled by the timeline's ScrollTrigger.onUpdate above.
}

/* ═══════════════════════════════════════════════════════════
   10e. AUTOPLAY BG VIDEOS — generic init for any decorative video
        Tag any background <video> with [data-autoplay-bg-video] and it
        gets safe-autoplay (Safari/iOS friendly) + an IntersectionObserver
        that pauses the decoder while the element is offscreen.
        Used by: final-CTA on home, contact hero on contact.html.
   ═══════════════════════════════════════════════════════════ */
function initAutoplayBgVideos() {
  const videos = qsa('[data-autoplay-bg-video], #finalCtaVideo');
  if (!videos.length) return;

  videos.forEach(video => {
    video.muted = true;
    video.setAttribute('muted', '');
    const tryPlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    tryPlay();
    const ab = registerAbort();
    video.addEventListener('canplay', tryPlay, { once: true, signal: ab.signal });

    if (!('IntersectionObserver' in window)) return;

    // The closest section (final-CTA / contact-hero) is what carries the
    // perpetual CSS zoom keyframes — toggling .is-offscreen on it freezes
    // those keyframes (see style.css `.is-offscreen` rules) while also
    // pausing the decoder.
    const section = video.closest('section') || video.parentElement;
    const io = registerObserver(new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      if (section) section.classList.toggle('is-offscreen', !visible);
      if (visible) tryPlay();
      else { try { video.pause(); } catch (e) {} }
    }, { threshold: 0.05 }));
    io.observe(video);
  });
}

/* ═══════════════════════════════════════════════════════════
   10b. HERO VIDEO — load handling, on-enter reveal, scroll parallax
   ═══════════════════════════════════════════════════════════ */
function initHeroVideo() {
  const hero  = qs('.hero-video');
  if (!hero) return;

  const bg      = qs('.hero-video-bg', hero);
  const video   = qs('#heroVideo', hero);
  const content = qs('.hero-content', hero);
  const reveals = qsa('[data-hero-reveal]', hero);

  // Force autoplay on iOS / strict browsers
  if (video) {
    video.muted = true;
    video.setAttribute('muted', '');
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    const ab = registerAbort();
    video.addEventListener('canplay', tryPlay, { once: true, signal: ab.signal });

    // Pause the decoder + freeze the Ken Burns animation when hero leaves view.
    // The CSS `.is-offscreen.hero-video` selector pauses the keyframe.
    if ('IntersectionObserver' in window) {
      const io = registerObserver(new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting;
        hero.classList.toggle('is-offscreen', !visible);
        if (visible) tryPlay();
        else { try { video.pause(); } catch (e) {} }
      }, { threshold: 0.01 }));
      io.observe(hero);
    }
  }

  // Staggered reveal of hero content
  if (typeof gsap !== 'undefined' && reveals.length) {
    reveals.forEach(el => {
      const delay = parseFloat(el.dataset.delay || 0) * 0.12;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        delay: 0.3 + delay,
        ease: 'power3.out',
      });
    });
  } else {
    // Fallback — reveal immediately via CSS transition
    reveals.forEach(el => {
      el.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      requestAnimationFrame(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  // Scroll parallax — subtle upward drift + fade for content
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    if (bg) {
      gsap.to(bg, {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
    if (content) {
      gsap.to(content, {
        y: -40,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '70% top',
          scrub: true,
        },
      });
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   11. DEMO SUBMISSION FORM
   ═══════════════════════════════════════════════════════════ */
function initDemoForm() {
  const form      = qs('#demoForm');
  const submitBtn = qs('#formSubmit');
  const success   = qs('#formSuccess');
  const errorEl   = qs('#formError');
  const errorMsg  = qs('#formErrorMsg');
  if (!form) return;

  // Netlify Forms endpoint. POSTing to the page's own origin (we use "/" for
  // simplicity) is what Netlify's request handler intercepts on its CDN. The
  // form's <form action="/"> is the no-JS fallback — JS hijacks the submit so
  // we can show in-page loading / success / error states instead of a full
  // page redirect.
  const ENDPOINT = '/';

  // The button has a <span class="form-submit-label"> + an arrow SVG. We only
  // want to swap the label text on submit, so write the original aside for restore.
  const labelEl   = qs('.form-submit-label', submitBtn);
  const arrowEl   = qs('.form-submit-arrow', submitBtn);
  const labelOrig = labelEl ? labelEl.textContent : 'Submit Your Demo';

  // Clear error state as the user types / selects
  qsa('.form-input, .form-select, .form-textarea', form).forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('invalid');
      input.closest('.form-field')?.classList.remove('has-error');
    });
    input.addEventListener('change', () => {
      input.classList.remove('invalid');
      input.closest('.form-field')?.classList.remove('has-error');
    });
  });
  // Checkbox: clear error on toggle
  qsa('.form-check-input', form).forEach(box => {
    box.addEventListener('change', () => {
      box.closest('.form-check-wrap')?.classList.remove('has-error');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    let firstInvalid = null;

    qsa('[required]', form).forEach(field => {
      const group = field.closest('.form-field, .form-check-wrap');
      let ok = false;

      if (field.type === 'email')
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
      else if (field.type === 'url')
        try { new URL(field.value.trim()); ok = true; } catch { ok = false; }
      else if (field.tagName === 'SELECT')
        ok = field.value !== '';
      else if (field.type === 'checkbox')
        ok = field.checked;
      else
        ok = field.value.trim().length > 1;

      if (!ok) {
        field.classList.add('invalid');
        group?.classList.add('has-error');
        if (!firstInvalid) firstInvalid = field;
        valid = false;
      } else {
        field.classList.remove('invalid');
        group?.classList.remove('has-error');
      }
    });

    if (!valid) {
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(form, { x: -6 }, { x: 0, duration: 0.45, ease: 'elastic.out(1,0.3)' });
      }
      // Drop focus on the first invalid field so keyboard users land in the right place
      if (firstInvalid && typeof firstInvalid.focus === 'function') {
        firstInvalid.focus({ preventScroll: false });
      }
      return;
    }

    // Honeypot short-circuit. If the hidden `bot-field` has any value, a bot
    // filled it — silently pretend we sent and bail out. Netlify also drops
    // these server-side; this just saves the round trip.
    const honeypot = form.querySelector('input[name="bot-field"]');
    if (honeypot && honeypot.value.trim() !== '') {
      form.reset();
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    if (labelEl) labelEl.textContent = 'Sending…';
    if (arrowEl) arrowEl.style.opacity = '0.4';
    if (errorEl) errorEl.classList.remove('show');

    const restoreButton = () => {
      submitBtn.disabled = false;
      if (labelEl) labelEl.textContent = labelOrig;
      if (arrowEl) arrowEl.style.opacity = '';
    };

    const showError = (msg) => {
      if (!errorEl) return;
      if (errorMsg && msg) errorMsg.textContent = msg;
      errorEl.classList.add('show');
      if (typeof gsap !== 'undefined') {
        gsap.from(errorEl, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out' });
      }
      setTimeout(() => errorEl.classList.remove('show'), 8000);
    };

    // Submit to Netlify via fetch. Netlify's AJAX contract requires
    // application/x-www-form-urlencoded — multipart FormData is silently
    // ignored for non-file forms. URLSearchParams + FormData handles this
    // (FormData iterates as [name, value] pairs that URLSearchParams accepts).
    // The body automatically includes the hidden `form-name` field, which is
    // mandatory for Netlify to route the submission to the right form.
    //
    // Success = HTTP 200 with an empty body; no JSON to parse.
    const body = new URLSearchParams(new FormData(form)).toString();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
      .then((res) => {
        if (res.ok) {
          form.reset();
          restoreButton();
          if (success) {
            success.classList.add('show');
            if (typeof gsap !== 'undefined') {
              gsap.from(success, { opacity: 0, y: 14, duration: 0.4, ease: 'power2.out' });
            }
            setTimeout(() => success.classList.remove('show'), 8000);
          }
          return;
        }

        // Netlify returned a non-2xx status (form not registered, validation
        // failure, rate-limited, or — during local dev — the static server
        // doesn't accept POSTs).
        restoreButton();
        showError('Submission failed — please try again, or email us directly at admin@afterbeatsmusic.com.');
      })
      .catch(() => {
        // Network failure / CORS / offline
        restoreButton();
        showError('We couldn’t reach the server. Check your connection or email admin@afterbeatsmusic.com.');
      });
  });
}

/* ═══════════════════════════════════════════════════════════
   12. ARTICLES SORT BUTTONS
   ═══════════════════════════════════════════════════════════ */
function initArticlesSort() {
  const sortBtns = qsa('.sort-btn');
  const grid     = qs('#articlesGrid');
  if (!sortBtns.length || !grid) return;

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type  = btn.dataset.sort;
      const cards = qsa('.article-card', grid);

      cards.sort((a, b) => {
        if (type === 'latest')  return new Date(b.dataset.date) - new Date(a.dataset.date);
        if (type === 'oldest')  return new Date(a.dataset.date) - new Date(b.dataset.date);
        return 0;
      });

      if (typeof gsap !== 'undefined') {
        gsap.to(cards, {
          opacity: 0, y: 16, duration: 0.22, stagger: 0.02,
          onComplete: () => {
            cards.forEach(c => grid.appendChild(c));
            gsap.to(cards, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
          },
        });
      } else {
        cards.forEach(c => grid.appendChild(c));
      }
    });
  });

  // Pagination click highlight
  qsa('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.textContent.includes('→')) return;
      qsa('.page-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   13. HOF SPHERE  — 3D interior sphere viewer with drag rotation
       Cards are positioned on the inner surface of a sphere via
       `rotateY(θ) rotateX(φ) translateZ(-R)`. That transform places
       each card at -R * normal while its face normal still points
       toward origin, so the text reads correctly from the camera.
       The camera is the parent `.hof-camera` element; drag updates
       its rotateX/rotateY, giving a look-around effect.
   ═══════════════════════════════════════════════════════════ */
function initHofSphere() {
  const viewer = qs('#hofSphere');
  const camera = qs('#hofCamera');
  if (!viewer || !camera) return;

  const cards = qsa('.hof3d-card', camera);

  // Distribute cards across the sphere: 5 rings × 6 columns = 30 slots.
  // Each ring gets a 12° theta offset so rings don't stack perfectly.
  // 60° theta step gives a full 360° wrap (6 × 60 = 360).
  cards.forEach((card) => {
    const ring = parseInt(card.dataset.ring, 10) || 0;
    const col  = parseInt(card.dataset.col,  10) || 0;
    const phi   = -50 + ring * 25;              // -50, -25, 0, 25, 50
    const theta = (col - 2.5) * 60 + ring * 12; // full wrap, offset per ring
    card.style.setProperty('--ry', theta + 'deg');
    card.style.setProperty('--rx', phi + 'deg');

    if (typeof gsap !== 'undefined') {
      gsap.from(card, {
        opacity: 0,
        scale: 0.6,
        duration: 0.8,
        delay: 0.1 + (ring * 6 + col) * 0.028,
        ease: 'power2.out',
      });
    }
  });

  // ── Camera drag state ────────────────────────────────────
  let yaw = 0, pitch = 0;
  let dragging = false, lx = 0, ly = 0;
  let idle = 0;
  let downX = 0, downY = 0, dragDist = 0;
  let viewerVisible = true;   // gated by IO below

  const apply = () => {
    camera.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
  };
  apply();

  const getXY = (e) => {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const onDown = (e) => {
    dragging = true;
    idle = 0;
    viewer.classList.add('dragging');
    const p = getXY(e);
    lx = p.x; ly = p.y;
    downX = p.x; downY = p.y;
    dragDist = 0;
  };
  const onMove = (e) => {
    if (!dragging) return;
    const p = getXY(e);
    yaw   += (p.x - lx) * 0.28;
    pitch -= (p.y - ly) * 0.28;
    if (pitch >  55) pitch =  55;
    if (pitch < -55) pitch = -55;
    lx = p.x; ly = p.y;
    const d = Math.hypot(p.x - downX, p.y - downY);
    if (d > dragDist) dragDist = d;
    apply();
  };
  const onUp = () => {
    dragging = false;
    viewer.classList.remove('dragging');
  };

  // All listeners bound via one AbortController so Barba leave removes them
  // in a single call. Previously these were window-bound and never cleaned,
  // so every visit to /hall-of-fame stacked a new mousemove/touchmove
  // handler on window → the page got slower with each return.
  const sa = registerAbort();
  const opts = { signal: sa.signal };
  const optsPassive = { signal: sa.signal, passive: true };

  viewer.addEventListener('mousedown',  onDown, opts);
  viewer.addEventListener('touchstart', onDown, optsPassive);
  window.addEventListener('mousemove',  onMove, opts);
  window.addEventListener('touchmove',  onMove, optsPassive);
  window.addEventListener('mouseup',    onUp,   opts);
  window.addEventListener('touchend',   onUp,   opts);
  window.addEventListener('touchcancel',onUp,   opts);

  // Gate the idle auto-rotation rAF behind viewport visibility. If the
  // sphere isn't on screen, there's no point spending a frame to rotate it.
  if ('IntersectionObserver' in window) {
    const io = registerObserver(new IntersectionObserver(([entry]) => {
      viewerVisible = entry.isIntersecting;
    }, { threshold: 0.05 }));
    io.observe(viewer);
  }

  // Idle auto-rotation — resumes 1.5s after the last drag.
  // The loop self-terminates on three conditions:
  //   • the AbortController has been aborted (teardownPageResources),
  //   • the viewer element has been detached from the DOM (Barba swap), or
  //   • the document was hidden (tab background) — visibilitychange resumes it.
  let last = performance.now();
  const tick = (now) => {
    if (sa.signal.aborted || !viewer.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging && viewerVisible && !document.hidden) {
      idle += dt;
      if (idle > 1.5) {
        yaw += 4 * dt; // ~4°/sec
        apply();
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ── Card click → open YouTube in a new tab ──
  // Embedded playback was unreliable: many label-controlled music videos block
  // iframe embedding, so the modal would silently play nothing. Sending the
  // user straight to youtube.com guarantees playback every time.
  //
  // Safe-redirect contract:
  //  • Drag-vs-click guard preserved (dragDist > 6 = user was rotating).
  //  • window.open called synchronously inside the click handler so it stays
  //    inside the user-gesture window — pop-up blockers won't reject it.
  //  • 'noopener,noreferrer' prevents tabnabbing on the new YouTube tab.
  //  • `data-youtube` may be a bare video ID or a full URL — handle both.
  //  • If the attribute is missing/empty, bail out silently.
  const toWatchUrl = (val) => {
    if (!val) return '';
    const v = String(val).trim();
    if (!v) return '';
    // Already a URL? Use as-is.
    if (/^https?:\/\//i.test(v)) return v;
    return `https://www.youtube.com/watch?v=${encodeURIComponent(v)}`;
  };

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      if (dragDist > 6) return; // user was rotating the sphere, not clicking
      const url = toWatchUrl(card.dataset.youtube);
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   14. CONTACT PAGE  — video-bg parallax
   ═══════════════════════════════════════════════════════════ */
function initContactParallax() {
  if (typeof gsap === 'undefined') return;

  const hero = qs('.contact-hero');
  const sim  = qs('.contact-video-sim');
  if (!hero || !sim) return;

  gsap.to(sim, {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ═══════════════════════════════════════════════════════════
   15. ANCHOR SMOOTH SCROLL
   ═══════════════════════════════════════════════════════════ */
function initAnchorScroll() {
  const ab = registerAbort();
  const closeMobileMenu = () => {
    const mobile = qs('#mobileMenu');
    const toggle = qs('#navToggle');
    if (mobile?.classList.contains('open')) {
      mobile.classList.remove('open');
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  };

  qsa('a[href*="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const hash = getHashFromUrl(link.getAttribute('href'));
      if (!hash) return;

      const linkUrl = new URL(link.getAttribute('href'), window.location.href);
      const isSamePage = linkUrl.pathname === window.location.pathname;
      if (!isSamePage) {
        pendingNavigationHash = hash;
        return;
      }

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      e.preventDefault();
      scrollToHash(hash);
      closeMobileMenu();
    }, { signal: ab.signal });
  });
}

function getHashFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url, window.location.href).hash;
  } catch (e) {
    return url.startsWith('#') ? url : '';
  }
}

function scrollToHash(hash, opts = {}) {
  if (!hash) return false;
  const target = document.getElementById(hash.replace(/^#/, ''));
  if (!target) return false;

  if (lenis) {
    lenis.scrollTo(target, {
      offset: -80,
      duration: opts.immediate ? 0 : 1.4,
      immediate: Boolean(opts.immediate),
    });
  } else if (opts.immediate) {
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo(0, Math.max(0, top));
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return true;
}

/* ═══════════════════════════════════════════════════════════
   16. NAV ENTRANCE ANIMATION
   ═══════════════════════════════════════════════════════════ */
function initNavEntrance() {
  if (typeof gsap === 'undefined') return;
  const nav = qs('#masterNav');
  if (!nav) return;
  gsap.from(nav, { opacity: 0, y: -14, duration: 0.7, delay: 0.15, ease: 'power3.out' });
}

/* ═══════════════════════════════════════════════════════════
   17. BARBA.JS  — page transitions
   ═══════════════════════════════════════════════════════════ */
function initBarba() {
  if (typeof barba === 'undefined' || typeof gsap === 'undefined') return;

  const overlay = qs('#barbaOverlay');

  barba.init({
    transitions: [{
      name: 'crossfade',
      async leave() {
        if (overlay) await gsap.to(overlay, { opacity: 1, duration: 0.3, ease: 'power2.in' });
        // Tear down everything from the outgoing page before the container is
        // removed. initPageScripts will run again on enter and re-bind for the
        // incoming page, but doing it here means observers attached to the
        // outgoing nodes are gone before the DOM nodes themselves are gone —
        // no stray callbacks firing during the swap.
        teardownPageResources();
      },
      async enter(data) {
        const hash = getHashFromUrl(data?.next?.url?.href || window.location.href) || pendingNavigationHash;
        pendingNavigationHash = '';
        if (!hash) {
          window.scrollTo(0, 0);
          if (lenis) lenis.scrollTo(0, { immediate: true });
        }
        initPageScripts();
        if (hash) {
          requestAnimationFrame(() => {
            scrollToHash(hash, { immediate: true });
            setTimeout(() => scrollToHash(hash, { immediate: true }), 80);
          });
        }
        if (overlay) await gsap.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.out', delay: 0.05 });
      },
    }],
    // (Previously a `views[home].afterEnter` block re-ran initHeroVideo /
    //  initManifesto / initShowcaseStrip / initStorySection — but those same
    //  initX functions are already invoked from initPageScripts when their
    //  markers exist on the page, so the home view was double-initing every
    //  Barba transition into / back to /. Removed.)
  });
}

/* ═══════════════════════════════════════════════════════════
   18. PER-PAGE INIT
       Called once on DOMContentLoaded and again after each
       Barba page transition.
   ═══════════════════════════════════════════════════════════ */
function initPageScripts() {
  // Kill everything left over from the previous page first:
  //   • ScrollTriggers (GSAP)
  //   • IntersectionObservers + window/document listeners (via AbortControllers)
  //   • requestAnimationFrame loops registered by the previous page
  // This is what prevents the "site gets slower with every Barba navigation"
  // failure mode — old observers and rAFs no longer stack indefinitely.
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }
  teardownPageResources();

  initNav();
  initScrollReveal();
  initSlideInFromBottom();
  initParagraphReveal();
  initAvatarAnimations();
  initTrustedScroller();
  initDemoForm();
  initArticlesSort();
  initHofSphere();
  initAnchorScroll();
  initNavEntrance();
  initContactParallax();

  // Home-page hero (video + parallax) only runs when the hero exists
  const ns = qs('[data-barba-namespace]')?.dataset?.barbaNamespace;
  if (ns === 'home' || qs('.hero-video')) {
    initHeroVideo();
  }
  if (qs('.manifesto')) {
    initManifesto();
  }
  if (qs('.showcase-strip')) {
    initShowcaseStrip();
  }
  if (qs('.story')) {
    initStorySection();
  }
  initAutoplayBgVideos();
  // Legacy spotlight — safe no-op if the markup has been replaced
  if (qs('.kaitonote-spotlight')) {
    initSpotlight();
  }

  // Recalculate ScrollTrigger positions after full layout
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initLenis();
  initPageScripts();
  // Barba init after page scripts so initial page works without transitions too
  initBarba();
  if (window.location.hash) {
    requestAnimationFrame(() => {
      scrollToHash(window.location.hash, { immediate: true });
      setTimeout(() => scrollToHash(window.location.hash, { immediate: true }), 80);
    });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST-LOAD REFRESH (critical for pinned ScrollTriggers)
   ───────────────────────────────────────────────────────────
   Pin positions are calculated once at DOMContentLoaded — but at that
   moment fonts (Switzer via Fontshare) and lazy/below-the-fold images
   haven't settled, so the section's `top` shifts by hundreds of pixels
   over the next second. The pinned story timeline ends up engaging at a
   stale scroll position, which is exactly why a fast forward scroll
   reads as "all black": the pinned section is offset off-viewport.

   We force a refresh after every event that can shift layout:
     • window load        — all images fully decoded
     • document.fonts.ready — Switzer swap complete
     • ResizeObserver on the elements above the story (one-shot, in case
       any text reflow happens after fonts.ready resolves)

   ScrollTrigger.refresh() recomputes start/end for every trigger, so
   the next scroll movement uses correct positions.
   ═══════════════════════════════════════════════════════════ */
function forceScrollTriggerRefresh() {
  if (typeof ScrollTrigger === 'undefined') return;
  ScrollTrigger.refresh();
}

window.addEventListener('load', forceScrollTriggerRefresh);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(forceScrollTriggerRefresh).catch(() => {});
}

// Belt-and-suspenders: refresh again ~600ms after load to catch any
// late layout from images that finish decoding after the load event fires.
window.addEventListener('load', () => {
  setTimeout(forceScrollTriggerRefresh, 600);
});
