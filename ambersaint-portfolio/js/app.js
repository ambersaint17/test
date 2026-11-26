/* js/app.js - Amber Saint. Everything that moves, loads live data or responds to input.
   Order: helpers, ambience (grain, clock), smooth scroll + themes, preloader + intro, reveals, sections, utilities.
   Libraries (self-hosted in /vendor): GSAP + ScrollTrigger + SplitText, Lenis. The page still works if any of them fail to load. */
(function () {
  'use strict';

  /* ================================================================ helpers */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, body = document.body;
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger, SPLIT = window.SplitText;
  var HAS_GSAP = !!(G && ST);
  var DISCORD_ID = '1542873663278293150', INVITE = 'https://discord.gg/', REPO = 'ambersaint17/-OPEN-Tower';
  var MARK = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true"><ellipse cx="50" cy="15.5" rx="25" ry="7" stroke-width="5" transform="rotate(-9 50 15.5)"/><path d="M21 93 L50 45 L79 93" stroke-width="11.5" stroke-linejoin="miter" stroke-miterlimit="10"/></svg>';
  if (HAS_GSAP) G.registerPlugin(ST); if (G && SPLIT) G.registerPlugin(SPLIT);

  function track(name, data) { try { if (window.va) window.va('event', { name: name, data: data }); } catch (e) { /* analytics is optional */ } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function plain(s) { return String(s).replace(/<sup>TM<\/sup>/g, '™').replace(/<[^>]+>/g, ''); }
  function slug(n) { return plain(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function initials(n) { var s = plain(n).replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean); return ((s[0] || '?')[0] + ((s[1] || '')[0] || '')).toUpperCase(); }
  var toastT;
  function toast(msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 2200); }
  function copy(text, done) {
    var ok = function () { if (done) done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); ok(); }
  }
  function onVisible(el, fn, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin || '300px' });
    io.observe(el);
  }

  /* ================================================================ ambience: grain + clock */
  (function grain() {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 180;
      var x = c.getContext('2d'), d = x.createImageData(180, 180);
      for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); root.style.setProperty('--grain', 'url(' + c.toDataURL('image/png') + ')');
    } catch (e) { /* purely decorative */ }
  })();

  function istTime() { return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }); }
  function clock() { var t = istTime(); ['#clock', '#clock2'].forEach(function (s) { var e = $(s); if (e) e.textContent = t; }); var p = $('#prTime'); if (p) p.textContent = t + ' IST'; }
  clock(); setInterval(clock, 15000);

  /* ================================================================ smooth scroll */
  var lenis = null;
  if (!REDUCE && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, wheelMultiplier: 0.95 });
    if (HAS_GSAP) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
    else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); }
  }
  function scrollTo(target) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el && target !== 0) return;
    if (lenis) lenis.scrollTo(el || 0, { offset: 0, duration: 1.4 });
    else (el || body).scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var el = $(id); if (!el) return;
    e.preventDefault(); closeMenu(); scrollTo(id === '#top' ? 0 : el);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ================================================================ 07 archive: builds, models, systems
     Desktop: the section pins and the cards slide sideways as you scroll. Cards skew with scroll speed, images drift inside
     their frames, an odometer counts the active piece and a strip of thumbnails shows (and jumps to) everything at once.
     Created first, so every later trigger accounts for the pin spacing. */
  var arTrack = $('#arTrack'), arView = $('.archive__view'), arStrip = $('#arStrip');
  var arCards = $$('.acard', arTrack), arIdx = -1, arST = null;
  var odoA = $('#odoA'), odoB = $('#odoB');
  function odoBuild(el) { if (el) el.innerHTML = '<span>' + '0123456789'.split('').map(function (d) { return '<i>' + d + '</i>'; }).join('') + '</span>'; }
  function odoSet(n) { var s = ('0' + n).slice(-2); [odoA, odoB].forEach(function (el, k) { if (el && el.firstChild) el.firstChild.style.transform = 'translateY(-' + (+s[k]) + 'em)'; }); }
  odoBuild(odoA); odoBuild(odoB);
  function sizeArchive() {
    if (!arView) return;
    if (innerWidth <= 820) { arTrack.style.removeProperty('--ah'); return; }
    arTrack.style.setProperty('--ah', Math.max(200, arView.clientHeight - 56) + 'px');
  }
  function setActive(i) {
    if (i === arIdx || !arCards[i]) return;
    var first = arIdx < 0; arIdx = i;
    var c = arCards[i];
    arCards.forEach(function (x, k) { x.classList.toggle('is-active', k === i); });
    $$('button', arStrip).forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    odoSet(i + 1);
    var tEl = $('#arTitle'), yEl = $('#arType'), dEl = $('#arDesc');
    tEl.textContent = c.getAttribute('data-title'); yEl.textContent = c.getAttribute('data-type'); dEl.textContent = c.getAttribute('data-desc');
    if (HAS_GSAP && !REDUCE && !first) {
      G.fromTo([tEl, yEl], { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', overwrite: true });
      G.fromTo(dEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', overwrite: true });
    }
  }
  if (arTrack && arStrip) {
    arStrip.innerHTML = arCards.map(function (c, i) {
      return '<button type="button" role="tab" aria-selected="false" data-i="' + i + '" data-cursor="View"><img src="' + c.getAttribute('data-thumb') + '" alt="" loading="lazy"><span><b>' + esc(c.getAttribute('data-title')) + '</b><small class="mono">' + ('0' + (i + 1)).slice(-2) + ' · ' + esc(c.getAttribute('data-type')) + '</small></span></button>';
    }).join('');
    setActive(0);
    arStrip.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.getAttribute('data-i');
      if (arST) {
        var dist = Math.max(1, arTrack.scrollWidth - arView.clientWidth), p = Math.min(1, arCards[i].offsetLeft / dist);
        var y = arST.start + p * (arST.end - arST.start) + 2;
        if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      } else arCards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      track('archive_jump', { item: arCards[i].getAttribute('data-title') });
    });
  }
  if (arTrack && HAS_GSAP && !REDUCE) {
    G.matchMedia().add('(min-width: 821px)', function () {
      sizeArchive();
      var dist = function () { return Math.max(0, arTrack.scrollWidth - arView.clientWidth); };
      var imgs = arCards.map(function (c) { return $('.acard__media > img:not(.poster), .acard__media > video', c); });
      var setSkew = G.quickSetter(arCards, 'skewX', 'deg'), clampS = G.utils.clamp(-7, 7), proxy = { s: 0 };
      function drift() {
        var vr = arView.getBoundingClientRect(), best = 0, bestV = -1;
        arCards.forEach(function (c, i) {
          var r = c.getBoundingClientRect(), mid = r.left + r.width / 2, off = Math.max(-1, Math.min(1, (mid - (vr.left + vr.width / 2)) / vr.width));
          if (imgs[i]) imgs[i].style.transform = 'translate3d(' + (off * -5).toFixed(2) + '%,0,0)';
          var vis = (Math.min(r.right, vr.right) - Math.max(r.left, vr.left)) / r.width;   // the card most in view is the active one
          if (vis > bestV + 0.02) { bestV = vis; best = i; }
        });
        setActive(best);
      }
      var tw = G.to(arTrack, {
        x: function () { return -dist(); }, ease: 'none', onUpdate: drift,   // runs as the scrub catches up, so the label never lags
        scrollTrigger: {
          trigger: '.archive', start: 'top top', end: function () { return '+=' + Math.round(dist() * 1.1); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onRefreshInit: sizeArchive,
          onUpdate: function (self) {
            var v = clampS(self.getVelocity() / -320);
            if (Math.abs(v) > Math.abs(proxy.s)) { proxy.s = v; G.to(proxy, { s: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: function () { setSkew(proxy.s); } }); }
          }
        }
      });
      arST = tw.scrollTrigger; drift();
      return function () { arST = null; tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); G.set(arTrack, { clearProps: 'transform' }); setSkew(0); imgs.forEach(function (im) { if (im) im.style.transform = ''; }); };
    });
  }
  addEventListener('resize', function () { if (!arST) sizeArchive(); });

  /* ================================================================ themes: the whole page turns night / paper / amber */
  var THEME_BG = { night: '#0B0907', paper: '#E9E2D4', amber: '#FF9A1F' }, themeMeta = $('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', THEME_BG.night);   // the HTML says amber so Discord's embed stripe is amber; browsers start on night
  function setTheme(t) {
    if (!t || body.getAttribute('data-theme') === t) return;
    body.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', THEME_BG[t]);
  }
  if (HAS_GSAP) {
    $$('[data-theme]').forEach(function (el) {
      if (el === body) return;
      ST.create({ trigger: el, start: el.getAttribute('data-theme-start') || 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) setTheme(el.getAttribute('data-theme')); } });
    });
  } else if ('IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) setTheme(x.target.getAttribute('data-theme')); }); }, { rootMargin: '-50% 0px -50% 0px' });
    $$('main [data-theme], footer[data-theme]').forEach(function (el) { tio.observe(el); });
  }

  /* ================================================================ nav bar */
  var bar = $('.bar'), lastY = 0;
  function onScrollBar() {
    var y = window.scrollY, h = innerHeight * 0.85;
    bar.classList.toggle('is-solid', y > h);
    bar.classList.toggle('is-hidden', y > h && y > lastY + 4 && !root.classList.contains('menu-open'));
    if (y < lastY - 4 || y < h) bar.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onScrollBar, { passive: true });

  /* menu overlay */
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  function openMenu() {
    if (root.classList.contains('menu-open')) return;
    root.classList.add('menu-open'); menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop();
    if (HAS_GSAP && !REDUCE) {
      G.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.inOut' });
      G.fromTo($$('.menu__list a', menu), { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.05, delay: 0.35, ease: 'expo.out' });
      G.fromTo($$('.menu__side > *', menu), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, delay: 0.55 });
    } else menu.style.clipPath = 'none';
    setTimeout(function () { var f = $('.menu__list a', menu); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
    if (HAS_GSAP && !REDUCE) G.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut', onComplete: function () { menu.hidden = true; } });
    else menu.hidden = true;
  }
  menuBtn.addEventListener('click', function () { root.classList.contains('menu-open') ? closeMenu() : openMenu(); });

  /* ================================================================ preloader + hero intro */
  var hero = $('#top');
  function fontsReady(ms) {
    return new Promise(function (res) {
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      setTimeout(fin, ms);
      if (document.fonts && document.fonts.ready) {
        Promise.all([document.fonts.load('800 100px "Archivo"'), document.fonts.load('italic 300 40px "Fraunces"'), document.fonts.load('400 11px "Martian Mono"')]).then(function () { return document.fonts.ready; }).then(fin, fin);
      } else fin();
    });
  }

  function intro() {
    var seen = false; try { seen = sessionStorage.getItem('as_seen') === '1'; sessionStorage.setItem('as_seen', '1'); } catch (e) { }
    var pre = $('#pre');
    var heroBits = $$('.hero__meta, .hero__foot > *');
    var lines = $$('.ln__in', hero);

    if (!HAS_GSAP || REDUCE) {
      root.classList.add('no-pre');
      fontsReady(1500).then(function () { if (window.Halo && window.Halo.init()) window.Halo.show(); });
      return;
    }
    if (lenis) lenis.stop();
    var minTime = seen ? 450 : 1700, start = performance.now();
    var counter = { v: 0 }, nEl = $('#preN'), barEl = $('#preBar');
    G.set(heroBits, { opacity: 0, y: 18 });

    var drawn = G.timeline();
    drawn.to('.pre__apex', { strokeDashoffset: 0, duration: seen ? 0.4 : 1.1, ease: 'power3.inOut' })
      .to('.pre__halo', { strokeDashoffset: 0, duration: seen ? 0.4 : 1, ease: 'power3.inOut' }, seen ? 0.1 : 0.45)
      .from('.pre__line span', { yPercent: 100, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' }, 0.1);
    var countTw = G.to(counter, { v: 92, duration: minTime / 1000, ease: 'power2.inOut', onUpdate: function () { var v = Math.round(counter.v); nEl.textContent = ('00' + v).slice(-3); barEl.style.transform = 'scaleX(' + (v / 100) + ')'; } });

    fontsReady(3000).then(function () {
      var okGL = window.Halo && window.Halo.init();
      G.set(lines, { yPercent: 108 });
      var wait = Math.max(0, minTime - (performance.now() - start));
      setTimeout(function () {
        countTw.kill();
        var tl = G.timeline({ onComplete: function () { pre.remove(); if (lenis) lenis.start(); ST.refresh(); } });
        tl.to(counter, { v: 100, duration: 0.35, ease: 'power2.out', onUpdate: function () { var v = Math.round(counter.v); nEl.textContent = ('00' + v).slice(-3); barEl.style.transform = 'scaleX(' + (v / 100) + ')'; } })
          .to('.pre__mark, .pre__line, .pre__count', { opacity: 0, y: -14, duration: 0.45, ease: 'power2.in', stagger: 0.03 }, '+=0.05')
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, '-=0.15')
          .to(lines, { yPercent: 0, duration: 1.4, stagger: 0.09, ease: 'expo.out' }, '-=0.55')
          .call(function () { if (okGL) window.Halo.show(); }, null, '-=1.0')
          .to(heroBits, { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, '-=1.0');
      }, wait);
    });
  }
  intro();
  // failsafe: if an animation library throws mid-intro, never leave the visitor behind the loading screen
  setTimeout(function () { var p = $('#pre'); if (p) { p.remove(); if (lenis) lenis.start(); if (window.Halo && window.Halo.ok) window.Halo.show(); } }, 9000);

  /* ================================================================ reveals */
  if (HAS_GSAP && !REDUCE) {
    // headline lines rise out of a mask
    $$('[data-split]').forEach(function (el) {
      if (!SPLIT) { G.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }); return; }
      var s = new SPLIT(el, { type: 'lines', linesClass: 'split-line', mask: 'lines' });
      G.from(s.lines, { yPercent: 105, duration: 1.3, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    // section rules draw in
    $$('.sec__head').forEach(function (h) {
      G.from($('.rule', h), { scaleX: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 90%' } });
      G.from($$(':scope > span', h), { opacity: 0, y: 8, duration: 0.8, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } });
    });
    // lists and cards come up in sequence
    ['.cap', '.stat', '.plate', '.tstats > div', '.modgroups > div', '.setup li', '.faq details', '.links li', '.foot__cols > div'].forEach(function (sel) {
      if (!$(sel)) return;
      ST.batch(sel, { start: 'top 90%', once: true, onEnter: function (els) { G.from(els, { opacity: 0, y: 34, duration: 1.1, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity' }); } });
    });
    G.from('.idcard__in', { opacity: 0, y: 60, rotateX: 18, transformPerspective: 1000, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.idcard', start: 'top 88%' } });

    // the profile sheet slides up over the hero, which sinks back and dims underneath it
    G.to('.stage .hero', { scale: 0.92, ease: 'none', scrollTrigger: { trigger: '#profile', start: 'top bottom', end: 'top top', scrub: true } });
    G.to('.hero__dim', { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: '#profile', start: 'top bottom', end: 'top top', scrub: true } });

    // method cards stack: each one slides over the last, which steps back
    var sc = $$('.scard');
    sc.forEach(function (card, i) {
      var next = sc[i + 1]; if (!next) return;
      G.fromTo($('.scard__in', card), { scale: 1, filter: 'brightness(1)' }, { scale: 0.9 + i * 0.015, filter: 'brightness(.8)', transformOrigin: '50% 0', ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top ' + (96 + (i + 1) * 26) + 'px', scrub: true } });
    });

    // images open like curtains
    $$('.video, .idcard__photo, .acard__media, .plate__logo').forEach(function (el, i) {
      var inner = el.classList.contains('idcard__photo') ? null : $('img:not(.poster), video', el);
      var tl = G.timeline({ scrollTrigger: { trigger: el.closest('.archive') || el, start: 'top 82%', once: true } });
      var d = el.classList.contains('acard__media') ? arCards.indexOf(el.parentNode) * 0.09 : 0;
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', delay: d, clearProps: 'clipPath' });
      if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'scale' }, d + 0.15);
    });
    G.from('.dw', { opacity: 0, y: 60, rotateX: 8, transformPerspective: 1200, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.dw', start: 'top 85%' } });

    // the manifesto resolves out of the noise as you read it
    var man = $('[data-scrub]');
    if (man) {
      wrapWords(man);
      G.to($$('.w', man), { opacity: 1, filter: 'blur(0px)', stagger: 0.04, ease: 'none', scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
    }
    // Tower title gets heavier width as it arrives
    G.fromTo('.tower__title', { fontStretch: '75%' }, { fontStretch: '125%', ease: 'none', scrollTrigger: { trigger: '.tower__hero', start: 'top 95%', end: 'top 35%', scrub: 0.8 } });
    // footer wordmark rises, halo floats
    G.from('.foot__word', { yPercent: 55, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
    G.fromTo('.foot__halo', { y: -60, rotate: -10, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 70%', end: 'bottom bottom', scrub: 0.8 } });
    G.to('.foot__halo', { yPercent: -18, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  function wrapWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var parts = t.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
      parts.forEach(function (p) { if (!p) return; if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p)); else { var s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); } });
      t.parentNode.replaceChild(frag, t);
    });
    $$('.inline-av', el).forEach(function (a) { a.classList.add('w'); });
  }

  /* counters */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '';
    if (REDUCE || !HAS_GSAP) { el.textContent = to + suf; return; }
    var o = { v: 0 }; G.to(o, { v: to, duration: 1.8, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.v) + suf; } });
  }
  $$('[data-count]').forEach(function (el) { onVisible(el, function () { countUp(el); }, '-10% 0px'); });

  /* ================================================================ Discord invites (cached, paced, with fallbacks) */
  var INV = { fresh: 30 * 60e3, stale: 14 * 864e5, max: 3 }, invQ = [], invBusy = 0, INVITES = {};
  function invRead(c) { try { return JSON.parse(localStorage.getItem('as_inv_' + c) || 'null'); } catch (e) { return null; } }
  function invSave(c, d) { try { localStorage.setItem('as_inv_' + c, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { } }
  function invPump() { while (invBusy < INV.max && invQ.length) { var j = invQ.shift(); invBusy++; j.job().then(j.ok, j.no).then(function () { invBusy--; setTimeout(invPump, 150); }); } }
  function invPace(job) { return new Promise(function (ok, no) { invQ.push({ job: job, ok: ok, no: no }); invPump(); }); }
  function invJson(url) {
    return fetch(url).then(function (r) {
      if (r.status === 429) return r.json().catch(function () { return {}; }).then(function (b) { var e = new Error('rate'); e.wait = Math.min(8000, Math.ceil((b.retry_after || 1) * 1000)); throw e; });
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (d) { if (!d || !d.guild) throw new Error('no guild'); return d; });
  }
  function invFetch(c) { return invJson('/api/invite?code=' + encodeURIComponent(c)).catch(function () { return invJson('https://discord.com/api/v10/invites/' + c + '?with_counts=true'); }); }
  function invLoad(c, n) { return invPace(function () { return invFetch(c); }).catch(function (e) { if (n >= 3) throw e; return new Promise(function (r) { setTimeout(r, e && e.wait ? e.wait : 900 * (n + 1)); }).then(function () { return invLoad(c, n + 1); }); }); }
  function invite(c) {
    if (INVITES[c]) return INVITES[c];
    var s = invRead(c), ok = !!(s && s.d && s.d.guild);
    INVITES[c] = (ok && Date.now() - s.t < INV.fresh) ? Promise.resolve(s.d) : invLoad(c, 0).then(function (d) { invSave(c, d); return d; }).catch(function () { return ok && Date.now() - s.t < INV.stale ? s.d : null; });
    return INVITES[c];
  }
  function guildIcon(d, size) { return d && d.guild && /^\d{5,25}$/.test(String(d.guild.id)) && /^(a_)?[a-f0-9]{8,40}$/i.test(String(d.guild.icon || '')) ? 'https://cdn.discordapp.com/icons/' + d.guild.id + '/' + d.guild.icon + '.' + (d.guild.icon.indexOf('a_') === 0 ? 'gif' : 'png') + '?size=' + (size || 128) : ''; }
  function fmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n.toLocaleString('en-US'); }

  /* ================================================================ 04 where I lead */
  var LEAD = (window.R || []).map(function (r, i) { return { name: r[0], role: r[1], codes: r[2] || [], members: 0, online: 0, icon: '', order: i }; });
  var rowsEl = $('#leadRows');
  var lc = $('#leadCount'); if (lc) { lc.setAttribute('data-count', LEAD.length); lc.textContent = LEAD.length; }
  function renderLead() {
    if (!rowsEl) return;
    rowsEl.innerHTML = LEAD.map(function (s, i) {
      var href = s.codes.length ? INVITE + s.codes[0] : '', tag = href ? 'a' : 'div';
      var attrs = href ? ' href="' + href + '" target="_blank" rel="noopener" data-cursor="Join" data-ev="invite_lead"' : ' tabindex="0"';
      var mem = s.members ? fmt(s.members) + '<small class="mono">members</small>' : (s.codes.length ? '<span class="mono">—</span>' : '<small class="mono">Private</small>');
      var ico = s.icon ? '<img src="' + esc(s.icon) + '" alt="" loading="lazy" data-rm>' : '';
      return '<' + tag + ' class="irow' + (href ? '' : ' irow--int') + '" role="row" data-i="' + i + '"' + attrs + '>' +
        '<span class="irow__n mono" role="cell">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<span class="irow__name" role="cell"><span class="irow__ico">' + ico + '<span class="irow__ini">' + (ico ? '' : initials(s.name)) + '</span></span><span>' + s.name + '</span></span>' +
        '<span class="irow__role" role="cell">' + esc(s.role) + '</span>' +
        '<span class="irow__mem" role="cell">' + mem + '</span>' +
        '<span class="irow__go" role="cell" aria-hidden="true">' + (href ? '→' : '·') + '</span></' + tag + '>';
    }).join('');
  }
  renderLead();
  // local logos for private servers
  var HAS_LOGO = function (n) { return (window.LOGOS || []).indexOf(slug(n)) > -1; };
  LEAD.forEach(function (s) { if (!s.codes.length && HAS_LOGO(s.name)) { var im = new Image(); im.onload = function () { s.icon = im.src; renderLead(); }; im.src = '/assets/logos/' + slug(s.name) + '.png'; } });
  onVisible($('#work'), function () {
    Promise.all(LEAD.map(function (s) {
      if (!s.codes.length) return null;
      return Promise.all(s.codes.map(invite)).then(function (ds) {
        ds.forEach(function (d) { if (!d) return; s.members += Number(d.approximate_member_count) || 0; s.online += Number(d.approximate_presence_count) || 0; if (!s.icon) s.icon = guildIcon(d, 128); });
      });
    })).then(function () {
      var total = LEAD.reduce(function (a, s) { return a + s.members; }, 0);
      LEAD.sort(function (a, b) { return (b.members - a.members) || (a.order - b.order); });
      var flip = HAS_GSAP && !REDUCE && rowsEl.getBoundingClientRect().top < innerHeight;
      if (flip) G.to(rowsEl, { opacity: 0, duration: 0.25, onComplete: function () { renderLead(); G.to(rowsEl, { opacity: 1, duration: 0.4 }); if (ST) ST.refresh(); } });
      else { renderLead(); if (ST) ST.refresh(); }
      var live = $('#leadLive'); if (live && total) live.textContent = fmt(total) + ' members across public servers, live';
    });
  }, '600px');

  // the peek card follows the cursor over the index
  var peek = $('#peek');
  if (peek && FINE && HAS_GSAP) {
    var px = G.quickTo(peek, 'x', { duration: 0.55, ease: 'power3' }), py = G.quickTo(peek, 'y', { duration: 0.55, ease: 'power3' }), shown = false;
    rowsEl.addEventListener('pointermove', function (e) { px(e.clientX + 150); py(e.clientY); });
    rowsEl.addEventListener('pointerover', function (e) {
      var row = e.target.closest('.irow'); if (!row) return;
      var s = LEAD[+row.getAttribute('data-i')]; if (!s) return;
      var im = $('#peekImg'), mono = $('#peekMono');
      if (s.icon) { im.src = s.icon.replace('size=128', 'size=256'); im.hidden = false; mono.textContent = ''; } else { im.hidden = true; im.removeAttribute('src'); mono.textContent = initials(s.name); }
      $('#peekName').textContent = plain(s.name);
      $('#peekCount').textContent = s.members ? s.members.toLocaleString('en-US') + ' members' : (s.codes.length ? 'Counting…' : 'Private / internal');
      $('#peekOnline').textContent = s.online ? '● ' + s.online.toLocaleString('en-US') + ' online now' : '';
      if (!shown) { shown = true; G.set(peek, { x: e.clientX + 150, y: e.clientY }); G.to(peek, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }); }
    });
    rowsEl.addEventListener('pointerleave', function () { shown = false; G.to(peek, { opacity: 0, scale: 0.9, duration: 0.3 }); });
  }

  /* ================================================================ 05 what I own */
  var ownedEl = $('#ownedGrid');
  if (ownedEl && window.O) {
    ownedEl.innerHTML = window.O.map(function (o, i) {
      return '<article class="plate' + (o[4] === 'Archived' ? ' plate--dim' : '') + '" data-i="' + i + '">' +
        '<div class="plate__top mono"><span>O/' + ('0' + (i + 1)).slice(-2) + '</span><span class="tag">' + esc(o[4]) + '</span></div>' +
        '<div class="plate__logo">' + initials(o[0]) + '</div>' +
        '<h3>' + esc(o[0]) + '</h3><p>' + esc(o[1]) + '</p>' +
        '<div class="plate__foot mono"><span class="plate__n">' + esc(o[3] || '') + '</span>' + (o[2] ? '<a href="' + INVITE + o[2] + '" target="_blank" rel="noopener" data-cursor="Join" data-ev="invite_owned">Join ↗</a>' : '') + '</div></article>';
    }).join('');
    $$('.plate', ownedEl).forEach(function (p) {
      var o = window.O[+p.getAttribute('data-i')], logo = $('.plate__logo', p), setImg = function (src) { var im = new Image(); im.onload = function () { logo.innerHTML = ''; im.alt = ''; logo.appendChild(im); }; im.src = src; };
      if (HAS_LOGO(o[0])) setImg('/assets/logos/' + slug(o[0]) + '.png');
      if (o[2]) onVisible(p, function () { invite(o[2]).then(function (d) { if (!d) return; if (d.approximate_member_count) $('.plate__n', p).textContent = d.approximate_member_count.toLocaleString('en-US') + ' members'; var ic = guildIcon(d, 256); if (ic && !$('img', logo)) setImg(ic); }); });
    });
  }

  /* ================================================================ studio band */
  var band = $('.band__track');
  if (band && HAS_GSAP && !REDUCE) {
    var bx = 0, vel = 0;
    G.ticker.add(function () {
      var half = band.scrollWidth / 2; if (!half) return;
      bx -= 0.6 + Math.abs(vel) * 0.004; if (bx <= -half) bx += half;
      band.style.transform = 'translate3d(' + bx + 'px,0,0)'; vel *= 0.92;
    });
    if (lenis) lenis.on('scroll', function (l) { vel = l.velocity * 40; });
  }

  /* ================================================================ 06 Tower: Discord preview */
  var T = window.T || [], chs = $('#dwChs'), dwBody = $('#dwBody'), cur = -1, timers = [], auto = true, demoVis = false;
  function userLine(t) { return '<div class="um"><b>amber_saint17</b> used <code>' + esc(t.cmd) + '</code></div>'; }
  function botMsg(t) {
    return '<div class="bm"><span class="bm__av">' + MARK + '</span><div class="bm__x"><div class="bm__h"><b>Tower</b><em>APP</em><small>Today at ' + istTime() + '</small></div>' +
      '<div class="emb" style="--c:' + t.c + '"><div class="emb__ban" style="background:linear-gradient(110deg,' + t.b[2] + ')"><b>' + esc(t.b[0]) + '</b><small>' + esc(t.b[1]) + '</small></div>' +
      '<h4>' + esc(t.t) + '</h4><p>' + esc(t.x) + '</p>' +
      (t.f.length ? '<div class="emb__f">' + t.f.map(function (f) { return '<div><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      (t.a.length ? '<div class="emb__btns">' + t.a.map(function (a) { return '<span class="' + a[1] + '">' + esc(a[0]) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="emb__ft">Powered by Tower · Above the noise</p></div></div></div>';
  }
  function play(i, user) {
    if (user) auto = false;
    timers.forEach(clearTimeout); timers = []; cur = i; var t = T[i];
    $$('button', chs).forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
    $('#dwCh').textContent = t.ch; $('#dwCh2').textContent = t.ch;
    dwBody.innerHTML = userLine(t);
    timers.push(setTimeout(function () { dwBody.insertAdjacentHTML('beforeend', '<div class="bm" id="dwTyping"><span class="bm__av">' + MARK + '</span><div class="typing"><i></i><i></i><i></i></div></div>'); }, 260));
    timers.push(setTimeout(function () {
      var ty = $('#dwTyping'); if (ty) ty.remove();
      dwBody.insertAdjacentHTML('beforeend', botMsg(t));
      if (HAS_GSAP && !REDUCE) G.from(dwBody.lastElementChild, { y: 16, opacity: 0, duration: 0.6, ease: 'expo.out' });
    }, 1000));
  }
  if (chs && T.length) {
    chs.innerHTML = T.map(function (t, i) { return '<button type="button" role="tab" aria-selected="false" data-i="' + i + '">' + esc(t.ch) + '</button>'; }).join('');
    chs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { play(+b.getAttribute('data-i'), true); track('tower_module', { module: T[+b.getAttribute('data-i')].k }); } });
    chs.addEventListener('keydown', function (e) { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); var n = (cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + T.length) % T.length; play(n, true); $$('button', chs)[n].focus(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { demoVis = es[0].isIntersecting; if (demoVis && cur < 0) play(0); }, { threshold: 0.3 }).observe($('#dw'));
    else play(0);
    setInterval(function () { if (demoVis && auto && !document.hidden) play((cur + 1) % T.length); }, 7000);
  }

  /* Tower: live GitHub stats */
  var LANG = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Dockerfile: '#384d54', PLpgSQL: '#336790', SQL: '#e38c00' };
  function ago(iso) { var s = (Date.now() - new Date(iso)) / 1000; if (isNaN(s)) return ''; var u = [['yr', 31536000], ['mo', 2592000], ['wk', 604800], ['d', 86400], ['h', 3600], ['m', 60]]; for (var i = 0; i < u.length; i++) { var n = Math.floor(s / u[i][1]); if (n >= 1) return 'Pushed ' + n + u[i][0] + ' ago'; } return 'Pushed just now'; }
  function paintRepo(r, l) {
    var st = $('#ghStars'), fk = $('#ghForks');
    st.nextSibling.textContent = (r.stargazers_count === 1 ? ' star' : ' stars'); fk.nextSibling.textContent = (r.forks_count === 1 ? ' fork' : ' forks');
    [[st, r.stargazers_count || 0], [fk, r.forks_count || 0]].forEach(function (p) { if (HAS_GSAP && !REDUCE) { var o = { v: 0 }; G.to(o, { v: p[1], duration: 1.4, ease: 'expo.out', onUpdate: function () { p[0].textContent = Math.round(o.v); } }); } else p[0].textContent = p[1]; });
    $('#ghUpd').textContent = ago(r.pushed_at);
    var keys = Object.keys(l || {}), tot = keys.reduce(function (a, k) { return a + l[k]; }, 0), barEl = $('#ghBar'), leg = $('#ghLegend');
    if (!tot) { barEl.style.display = 'none'; return; }
    keys = keys.filter(function (k) { return l[k] / tot >= 0.005; }).sort(function (a, b) { return l[b] - l[a]; });
    barEl.innerHTML = keys.map(function (k) { return '<i style="background:' + (LANG[k] || '#8b949e') + '" data-w="' + (l[k] / tot * 100).toFixed(2) + '"></i>'; }).join('');
    leg.innerHTML = keys.slice(0, 4).map(function (k) { return '<span><i style="background:' + (LANG[k] || '#8b949e') + '"></i>' + esc(k) + ' ' + (l[k] / tot * 100).toFixed(1) + '%</span>'; }).join('');
    requestAnimationFrame(function () { requestAnimationFrame(function () { $$('i', barEl).forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; }); }); });
  }
  onVisible($('#repo'), function () {
    var K = 'as_gh', c = null; try { c = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { }
    if (c && Date.now() - c.t < 6e5) { paintRepo(c.r, c.l); return; }
    var ok = function (r) { if (!r.ok) throw 0; return r.json(); }, H = { headers: { Accept: 'application/vnd.github+json' } };
    fetch('/api/github').then(ok).then(function (d) { return { r: d.repo, l: d.languages }; })
      .catch(function () { return fetch('https://api.github.com/repos/' + REPO, H).then(ok).then(function (r) { return fetch('https://api.github.com/repos/' + REPO + '/languages', H).then(ok).catch(function () { return {}; }).then(function (l) { return { r: r, l: l }; }); }); })
      .then(function (x) { try { localStorage.setItem(K, JSON.stringify({ t: Date.now(), r: { stargazers_count: x.r.stargazers_count, forks_count: x.r.forks_count, pushed_at: x.r.pushed_at }, l: x.l })); } catch (e) { } paintRepo(x.r, x.l); })
      .catch(function () { if (c) paintRepo(c.r, c.l); });
  });
  var cloneBtn = $('#cloneBtn');
  if (cloneBtn) cloneBtn.addEventListener('click', function () { copy('git clone https://github.com/' + REPO + '.git', function () { var s = $('span', cloneBtn); cloneBtn.classList.add('is-ok'); s.textContent = 'Copied ✓'; track('tower_clone_copy'); setTimeout(function () { cloneBtn.classList.remove('is-ok'); s.textContent = 'Copy clone command'; }, 1800); }); });

  /* Tower: video facade (nothing from YouTube loads until play) */
  var vBtn = $('#videoBtn'), vBox = $('#video');
  if (vBtn) vBtn.addEventListener('click', function () {
    track('tower_video_play');
    var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/y-10hRfeIN4?autoplay=1&rel=0&modestbranding=1&playsinline=1'; f.title = 'Tower, open source (YouTube video)'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'video__x'; x.setAttribute('aria-label', 'Close video'); x.textContent = '×';
    vBtn.remove(); vBox.appendChild(f); vBox.appendChild(x); if (sound.on) sound.duck(0.15);
    x.addEventListener('click', function () { f.remove(); x.remove(); vBox.appendChild(vBtn); if (sound.on) sound.duck(1); });
  });

  /* ================================================================ 07 archive media */
  var vid = $('.acard--video video');
  if (vid && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) { vid.preload = 'auto'; vid.play().catch(function () { }); } else vid.pause(); }, { threshold: 0.35 }).observe(vid);

  // 3D droids: model-viewer loads only when you get close
  var droids = $$('.acard--droid');
  onVisible($('#worlds'), function () {
    var sc = document.createElement('script'); sc.type = 'module'; sc.src = '/vendor/model-viewer.min.js';
    sc.onerror = function () { droids.forEach(function (d) { d.classList.add('no-3d'); }); };
    document.head.appendChild(sc);
    droids.forEach(function (card) {
      var mv = $('model-viewer', card), media = $('.acard__media', card), bar = $('.load b', card);
      mv.addEventListener('progress', function (e) { bar.style.transform = 'scaleX(' + ((e.detail && e.detail.totalProgress) || 0) + ')'; });
      mv.addEventListener('load', function () { media.classList.add('is-ready'); });
      mv.setAttribute('src', mv.getAttribute('data-src'));
    });
  }, '900px');
  var AC = null;
  function chirp(card) {
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return; if (!AC) AC = new C(); if (AC.state === 'suspended') AC.resume();
    card.classList.remove('chirp'); void card.offsetWidth; card.classList.add('chirp');
    var r2 = card.getAttribute('data-droid') === 'r2d2', n = r2 ? 8 + (Math.random() * 4 | 0) : 4 + (Math.random() * 2 | 0), at = AC.currentTime + 0.02, out = AC.createGain(); out.gain.value = 0.45; out.connect(AC.destination);
    for (var i = 0; i < n; i++) {
      var o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(), dur = r2 ? 0.05 + Math.random() * 0.09 : 0.09 + Math.random() * 0.12, f0 = r2 ? 900 + Math.random() * 2400 : 420 + Math.random() * 700, f1 = r2 ? 600 + Math.random() * 3000 : f0 * (Math.random() < 0.5 ? 1.8 : 0.55);
      o.type = r2 ? (Math.random() < 0.5 ? 'sine' : 'square') : 'triangle'; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(Math.max(80, f1), at + dur);
      f.type = 'lowpass'; f.frequency.value = r2 ? 5200 : 2600; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(r2 ? 0.1 : 0.13, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(f); f.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.02); at += dur * (r2 ? 0.9 : 1.05);
    }
    track('droid_chirp', { droid: card.getAttribute('data-droid') });
  }
  droids.forEach(function (card) {
    var down = null;
    card.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    card.addEventListener('pointerup', function (e) { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 400) chirp(card); down = null; });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chirp(card); } });
  });

  // lightbox
  var lb = $('#lb'), lbImg = $('#lbImg');
  var lbFrom = null;
  function closeLB() { lb.hidden = true; if (lenis) lenis.start(); if (lbFrom && lbFrom.focus) lbFrom.focus({ preventScroll: true }); lbFrom = null; }
  $$('.acard__media[data-lb]').forEach(function (b) {
    b.addEventListener('click', function () {
      var im = $('img', b), cap = $('figcaption b', b.parentNode);
      lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; $('#lbCap').textContent = cap ? cap.textContent : '';
      lbFrom = b; lb.hidden = false; if (lenis) lenis.stop(); $('#lbX').focus();
      if (HAS_GSAP && !REDUCE) G.from(lbImg, { scale: 0.92, opacity: 0, duration: 0.6, ease: 'expo.out' });
    });
  });
  if (lb) { $('#lbX').addEventListener('click', closeLB); lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); }); }

  /* ================================================================ 09 contact form */
  var form = $('#form');
  if (form) {
    var fs = $('#fStatus'), send = $('#fSend'), t0 = Date.now(), busy = false;
    var v = function (s) { return $(s).value.trim(); };
    var type = function () { var r = $('input[name="type"]:checked', form); return r ? r.value : 'Something Else'; };
    var msg = function () { return "Hi Amber, I'm " + (v('#fName') || 'someone') + (v('#fDiscord') ? ' (Discord ID: ' + v('#fDiscord') + ')' : '') + (v('#fEmail') ? ' (Email: ' + v('#fEmail') + ')' : '') + '.\n\nI need help with: ' + type() + '\n\n' + v('#fMsg'); };
    var valid = function () {
      if (v('#fMsg').length < 5) { fs.textContent = 'Tell me a little about the project first.'; $('#fMsg').focus(); return false; }
      if (v('#fDiscord') && !/^\d{17,20}$/.test(v('#fDiscord'))) { fs.textContent = 'A Discord user ID is 17 to 20 digits.'; $('#fDiscord').focus(); return false; }
      if (!v('#fDiscord') && !v('#fEmail')) { fs.textContent = 'Add your Discord user ID or an email so I can reply.'; $('#fDiscord').focus(); return false; }
      if (v('#fEmail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('#fEmail'))) { fs.textContent = 'That email address does not look right.'; $('#fEmail').focus(); return false; }
      return true;
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy || !valid()) return;
      busy = true; send.disabled = true; $('span', send).textContent = 'Sending…'; fs.textContent = ''; var sentType = type();
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: v('#fName'), discord: v('#fDiscord'), email: v('#fEmail'), type: type(), message: v('#fMsg'), website: $('#fTrap').value, elapsed: Date.now() - t0 }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'http ' + r.status); }); })
        .then(function () { fs.textContent = "Sent. Thank you, I'll get back to you."; form.reset(); $('span', send).textContent = 'Sent ✓'; track('contact_sent', { type: sentType }); setTimeout(function () { busy = false; send.disabled = false; $('span', send).textContent = 'Send message'; }, 15000); })
        .catch(function (err) {
          var m = (err && err.message) || '';
          fs.textContent = (m === 'rate_limited' || m === 'http 429' ? "You've sent a few messages quickly. Wait a minute and try again." : m === 'discord_id' ? "That Discord ID doesn't look right." : m === 'email' ? 'That email address does not look right.' : m === 'message' ? 'Tell me a little more about the project.' : m === 'forbidden' || m === 'http 403' ? 'That message was blocked for safety. Reload and try again.' : "That didn't go through.") + ' You can use Email instead or Copy for Discord.';
          busy = false; send.disabled = false; $('span', send).textContent = 'Send message';
        });
    });
    $('#fMail').addEventListener('click', function () { if (!valid()) return; location.href = 'mailto:valeriuselysium@gmail.com?subject=' + encodeURIComponent('Project enquiry: ' + type()) + '&body=' + encodeURIComponent(msg()); });
    $('#fCopy').addEventListener('click', function () { if (!valid()) return; copy(msg(), function () { fs.textContent = 'Copied. Paste it into my DMs.'; window.open('https://discord.com/users/' + DISCORD_ID, '_blank', 'noopener'); }); });
  }
  var copyId = $('#copyId');
  if (copyId) copyId.addEventListener('click', function () { copy('amber_saint17', function () { toast('Copied amber_saint17'); track('copy_username'); }); });

  /* ================================================================ live Discord presence (Lanyard) */
  (function presence() {
    var LAB = { online: 'Online', idle: 'Idle', dnd: 'Do not disturb', offline: 'Offline' }, VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
    var dot = $('#prDot'), sub = $('#prSub'), act = $('#prAct'), navDots = $$('[data-status]');
    function art(a) { var i = a.assets && a.assets.large_image; if (!i) return ''; if (i.indexOf('mp:external/') === 0) return 'https://media.discordapp.net/external/' + i.slice(12); if (i.indexOf('mp:') === 0) return 'https://media.discordapp.net/' + i.slice(3); if (a.application_id && /^\d+$/.test(i)) return 'https://cdn.discordapp.com/app-assets/' + a.application_id + '/' + i + '.png'; return ''; }
    function render(d) {
      var st = d.discord_status || 'offline', acts = d.activities || [], u = d.discord_user;
      dot.className = 's-' + st; navDots.forEach(function (n) { n.className = 'pulse s-' + st; });
      var cs = acts.filter(function (a) { return a.type === 4; })[0];
      sub.textContent = cs && cs.state ? ((cs.emoji && !cs.emoji.id ? cs.emoji.name + ' ' : '') + cs.state) : LAB[st];
      var a = null;
      if (d.listening_to_spotify && d.spotify) a = { k: 'Listening to Spotify', t: d.spotify.song, s: 'by ' + String(d.spotify.artist || '').split(';').join(', '), img: d.spotify.album_art_url };
      else { var o = acts.filter(function (x) { return x.type !== 4; })[0]; if (o) a = { k: (VERB[o.type] || 'Playing') + (o.details ? ' ' + o.name : ''), t: o.details || o.name, s: o.state || '', img: art(o) }; }
      if (!a) { act.hidden = true; return; }
      act.hidden = false; $('#prKind').textContent = a.k; $('#prTitle').textContent = a.t || ''; $('#prState').textContent = a.s || '';
      var im = $('#prImg'); if (a.img) { im.src = a.img; im.hidden = false; } else im.hidden = true;
    }
    function load() { if (document.hidden) return; fetch('https://api.lanyard.rest/v1/users/' + DISCORD_ID).then(function (r) { return r.json(); }).then(function (j) { if (j && j.success) render(j.data); else sub.textContent = 'Usually online daily'; }).catch(function () { sub.textContent = 'Usually online daily'; }); }
    if (dot) { load(); setInterval(load, 30000); }
  })();

  /* ================================================================ ambient sound */
  var sound = { on: false, el: null, duck: function (v) { if (sound.el && HAS_GSAP) G.to(sound.el, { volume: 0.4 * v, duration: 0.6 }); } };
  var sBtn = $('#soundBtn');
  function setSound(on, user) {
    sound.on = on; sBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem('as_sound', on ? '1' : '0'); } catch (e) { }
    if (on) {
      if (!sound.el) { sound.el = new Audio('/assets/audio/theme.mp3'); sound.el.loop = true; sound.el.volume = 0; }
      var p = sound.el.play(); if (p && p.catch) p.catch(function () { sBtn.setAttribute('aria-pressed', 'false'); sound.on = false; });
      if (HAS_GSAP) G.to(sound.el, { volume: 0.4, duration: 2 }); else sound.el.volume = 0.4;
    } else if (sound.el) {
      if (HAS_GSAP) G.to(sound.el, { volume: 0, duration: 0.8, onComplete: function () { sound.el.pause(); } }); else sound.el.pause();
    }
    if (user) track('sound_toggle', { on: on });
  }
  if (sBtn) {
    sBtn.addEventListener('click', function () { setSound(!sound.on, true); });
    var pref = null; try { pref = localStorage.getItem('as_sound'); } catch (e) { }
    if (pref === '1') { var resume = function (e) { if (e && e.target && e.target.closest && e.target.closest('#soundBtn')) return; setSound(true); removeEventListener('pointerdown', resume); removeEventListener('keydown', resume); }; addEventListener('pointerdown', resume, { once: true }); addEventListener('keydown', resume, { once: true }); }
  }

  /* ================================================================ command palette (Ctrl/Cmd + K) */
  var cmd = $('#cmd'), cmdQ = $('#cmdQ'), cmdList = $('#cmdList'), sel = 0, shownItems = [];
  var ITEMS = [
    ['Profile', 'Jump', function () { scrollTo('#profile'); }], ['Capabilities', 'Jump', function () { scrollTo('#capabilities'); }], ['How I work', 'Jump', function () { scrollTo('#process'); }],
    ['Where I lead', 'Jump', function () { scrollTo('#work'); }], ['What I own', 'Jump', function () { scrollTo('#owned'); }], ['Tower, case study', 'Jump', function () { scrollTo('#bots'); }],
    ['The archive: builds, models, systems', 'Jump', function () { scrollTo('#worlds'); }], ['Questions', 'Jump', function () { scrollTo('#faq'); }], ['Contact', 'Jump', function () { scrollTo('#contact'); }], ['Back to top', 'Jump', function () { scrollTo(0); }],
    ['Copy Discord username', 'Copy', function () { copy('amber_saint17', function () { toast('Copied amber_saint17'); }); }],
    ['Message me on Discord', 'Open', function () { window.open('https://discord.com/users/' + DISCORD_ID, '_blank', 'noopener'); }],
    ['Join the bot server', 'Open', function () { window.open(INVITE + 'KhCgDPAABg', '_blank', 'noopener'); }],
    ['Tower on GitHub', 'Open', function () { window.open('https://github.com/' + REPO, '_blank', 'noopener'); }],
    ['Email me', 'Open', function () { location.href = 'mailto:valeriuselysium@gmail.com'; }],
    ['Toggle ambient sound', 'Do', function () { setSound(!sound.on, true); }]
  ];
  function drawCmd() {
    var q = cmdQ.value.trim().toLowerCase();
    shownItems = ITEMS.filter(function (i) { return !q || i[0].toLowerCase().indexOf(q) > -1 || i[1].toLowerCase().indexOf(q) > -1; });
    sel = Math.min(sel, Math.max(0, shownItems.length - 1));
    cmdList.innerHTML = shownItems.map(function (i, k) { return '<li role="option" aria-selected="' + (k === sel) + '" data-k="' + k + '">' + esc(i[0]) + '<small>' + i[1] + '</small></li>'; }).join('') || '<li aria-disabled="true">Nothing found</li>';
  }
  function openCmd() { cmd.hidden = false; cmdQ.value = ''; sel = 0; drawCmd(); cmdQ.focus(); if (lenis) lenis.stop(); track('palette_open'); }
  function closeCmd() { cmd.hidden = true; if (lenis) lenis.start(); }
  function runCmd(k) { var it = shownItems[k]; if (!it) return; closeCmd(); it[2](); }
  if (cmd) {
    cmdQ.addEventListener('input', function () { sel = 0; drawCmd(); });
    cmdList.addEventListener('click', function (e) { var li = e.target.closest('li[data-k]'); if (li) runCmd(+li.getAttribute('data-k')); });
    cmd.addEventListener('click', function (e) { if (e.target === cmd) closeCmd(); });
    cmdQ.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shownItems.length) % Math.max(1, shownItems.length); drawCmd(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCmd(sel); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); cmd.hidden ? openCmd() : closeCmd(); return; }
    if (e.key === 'Escape') { if (!cmd.hidden) closeCmd(); else if (lb && !lb.hidden) closeLB(); else closeMenu(); }
  });
  $$('.menu__hint kbd:first-child').forEach(function (k) { if (/Mac|iPhone|iPad/.test(navigator.platform)) k.textContent = '⌘'; });

  /* ================================================================ cursor */
  var cursor = $('#cursor');
  if (cursor && FINE && !REDUCE && HAS_GSAP) {
    root.classList.add('has-cursor');
    var cx = G.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' }), cy = G.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' }), lbl = $('#cursorLbl');
    addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, summary, label, [role=tab]');
      var label = t && t.getAttribute('data-cursor');
      if (e.target.closest('model-viewer')) label = 'Drag';
      cursor.classList.toggle('is-label', !!label); cursor.classList.toggle('is-link', !!t && !label);
      if (label) lbl.textContent = label;
    });
    document.addEventListener('pointerleave', function () { G.to(cursor, { opacity: 0, duration: 0.2 }); });
    document.addEventListener('pointerenter', function () { G.to(cursor, { opacity: 1, duration: 0.2 }); });
  }

  /* ================================================================ letter roll on hover */
  function roll(el) {
    if (!el || el.querySelector('.roll')) return;
    var nodes = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
    var t = nodes[nodes.length - 1]; if (!t) return;
    var text = t.textContent.trim(), sr = document.createElement('span'), r = document.createElement('span');
    sr.className = 'sr'; sr.textContent = text; r.className = 'roll'; r.setAttribute('aria-hidden', 'true');
    r.innerHTML = text.split('').map(function (ch, i) { return ch === ' ' ? '<span class="sp" style="--i:' + i + '" data-c=" ">&nbsp;</span>' : '<span style="--i:' + i + '" data-c="' + esc(ch) + '">' + esc(ch) + '</span>'; }).join('');
    t.parentNode.insertBefore(sr, t); t.parentNode.replaceChild(r, t);
  }
  if (!REDUCE && FINE) $$('.menu__list a, .bar__lbl, .hero__links a, .btn > span, .foot__cols a, .links a b, .setup b, .foot__top a, .presence__foot, .idcard__foot').forEach(roll);

  /* ================================================================ magnetic buttons */
  if (!REDUCE && FINE && HAS_GSAP) $$('.bar__btn, .btn, .bar__brand').forEach(function (el) {
    var xTo = G.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), yTo = G.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
    el.addEventListener('pointerleave', function () { G.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .35)' }); });
  });

  /* ================================================================ personnel file: tilt + holographic foil */
  var idc = $('#idcard');
  if (idc && FINE && !REDUCE) {
    var host = idc.parentNode;
    host.addEventListener('pointermove', function (e) {
      var r = idc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      idc.style.transform = 'rotateY(' + ((x - 0.5) * 14).toFixed(2) + 'deg) rotateX(' + ((0.5 - y) * 12).toFixed(2) + 'deg)';
      idc.style.setProperty('--hx', (x * 100).toFixed(1) + '%'); idc.style.setProperty('--hy', (y * 100).toFixed(1) + '%'); idc.style.setProperty('--ha', Math.round(x * 360) + 'deg');
    });
    host.addEventListener('pointerleave', function () { idc.style.transform = ''; });
  }

  /* ================================================================ analytics */
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-ev]'); if (a) track(a.getAttribute('data-ev')); });

  /* footer wordmark: fill the width exactly, halo sits over the A like the mark */
  var word = $('.foot__word'), fmark = $('.foot__mark');
  function fitWord() {
    if (!word) return;
    word.style.fontSize = '100px';
    var w = word.getBoundingClientRect().width, avail = fmark.clientWidth;
    var size = 100 * avail / w; word.style.fontSize = size + 'px';
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord); fitWord();
  addEventListener('resize', fitWord);

  /* keep pinned / measured sections correct once images and fonts settle */
  addEventListener('load', function () { if (ST) ST.refresh(); });
})();
