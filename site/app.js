
    /* ===== Editable settings — update these with the school's real details ===== */
    var CONFIG = {
      name: 'Kings Metro School Sokoto',
      // 'page'  -> the login buttons go to /login.html, a full-page in-site view
      //            of the portal (the real URL stays out of the address bar). Default.
      // 'modal' -> open the portal inside an in-page iframe modal.
      // 'tab'   -> open the portal in a new browser tab.
      loginMode: 'page',
      // Portal login URL. Used as-is in 'tab' mode; the iframe loads it with
      // ?embed=1 in 'page' and 'modal' modes.
      portalUrl: 'https://script.google.com/macros/s/AKfycbynmP0luv46PyRtxIcv6gNd2UV82l7oEkQuGon8FXPGcV009sfYJppXFYn9r9ldazE2ew/exec',
      gasUrl: 'https://script.google.com/macros/s/AKfycbynmP0luv46PyRtxIcv6gNd2UV82l7oEkQuGon8FXPGcV009sfYJppXFYn9r9ldazE2ew/exec',
      address: 'Sokoto, Sokoto State, Nigeria',
      phone: '+234 812 210 0528',
      whatsapp: '+234 812 210 0528',
      email: 'info@kingsmetroschools.com.ng'
    };
    /* ========================================================================= */

    var params = new URLSearchParams(location.search);
    var GAS_URL = params.get('gas') || CONFIG.gasUrl;
    var PORTAL_URL = params.get('portal') || CONFIG.portalUrl;

    // Reflect config in the page (elements are optional per page)
    function setText(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
    setText('brand-name', CONFIG.name);
    setText('footer-name', CONFIG.name);
    setText('contact-address', CONFIG.address);
    setText('contact-phone', CONFIG.phone);
    setText('contact-email', CONFIG.email);
    setText('top-contact', CONFIG.address);

    // Mobile menu
    var nav = document.getElementById('main-nav');
    var menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && nav) menuToggle.addEventListener('click', function () { nav.classList.toggle('open'); });
    if (nav) nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });

    // Login modal
    var overlay = document.getElementById('login-overlay');
    var frame = document.getElementById('login-frame');
    var external = document.getElementById('login-external');

    function portalUrl() { return PORTAL_URL; }
    function portalEmbedUrl() { return PORTAL_URL + (PORTAL_URL.indexOf('?') === -1 ? '?' : '&') + 'embed=1'; }
    var applyOpenLink = document.getElementById('apply-open');
    if (applyOpenLink) applyOpenLink.setAttribute('href', GAS_URL + '?admission=1');

    // Lazy-load the admission form only once it is scrolled near (keeps first paint light).
    (function admissionLazy() {
      var box = document.getElementById('apply-online');
      var iframe = document.getElementById('apply-frame');
      var src = GAS_URL + '?admission=1&embed=1';
      if (!box || !iframe) return;
      function load() { if (!iframe.getAttribute('src')) iframe.setAttribute('src', src); }
      if (!('IntersectionObserver' in window)) { load(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { load(); io.disconnect(); } });
      }, { rootMargin: '300px' });
      io.observe(box);
    })();
    var lastFocus = null;
    function openLogin(e) {
      if (e) e.preventDefault();
      var url = portalUrl();
      if (CONFIG.loginMode === 'tab') {
        var win = window.open(url, '_blank', 'noopener');
        if (win) win.opener = null;
        return;
      }
      if (CONFIG.loginMode !== 'modal') {
        // Default: dedicated in-site login page (keeps the portal URL hidden).
        window.location.href = '/login.html';
        return;
      }
      if (!overlay) return;
      var embed = portalEmbedUrl();
      if (frame && frame.getAttribute('src') !== embed) frame.setAttribute('src', embed);
      if (external) external.setAttribute('href', url);
      lastFocus = document.activeElement;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      var closeBtn = document.getElementById('login-close');
      if (closeBtn) closeBtn.focus();
    }
    function closeLogin() {
      if (!overlay || !overlay.classList.contains('open')) return;
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-login]'), function (el) {
      el.addEventListener('click', openLogin);
    });
    var loginCloseBtn = document.getElementById('login-close');
    if (loginCloseBtn) loginCloseBtn.addEventListener('click', closeLogin);
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLogin(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay || !overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { closeLogin(); return; }
      if (e.key !== 'Tab') return;
      var f = overlay.querySelectorAll('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Deep link: ?login=1 opens the portal (login page, tab or modal)
    if (params.get('login') === '1') openLogin();

    // Dedicated portal page (login.html): fill the frame and wire the new-tab link
    var pageFrame = document.getElementById('portal-frame');
    if (pageFrame && !pageFrame.getAttribute('src')) pageFrame.setAttribute('src', portalEmbedUrl());
    var pageExternal = document.getElementById('portal-external');
    if (pageExternal) pageExternal.setAttribute('href', portalUrl());

    /* ===== Announcement marquee (fed by the Announcements sheet, audience = WEBSITE) ===== */
    function marqueeItemHtml(item) {
      var href = safeUrl(item.link);
      var badge = '<span class="marquee-badge">' + escapeHtml(item.category || 'Announcement') + '</span>';
      var title = '<span class="marquee-title">' + escapeHtml(item.title) + '</span>';
      var bodyText = item.body ? '<span class="marquee-body">' + escapeHtml(item.body) + '</span>' : '';
      var linkTag = href ? '<span class="marquee-link">Open &rarr;</span>' : '';
      var inner = badge + title + bodyText + linkTag;
      if (href) {
        return '<a class="marquee-item" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
      }
      return '<span class="marquee-item">' + inner + '</span>';
    }
    function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function safeUrl(s) { var u = String(s == null ? '' : s).trim().split(/\s+/)[0].replace(/[),.;]+$/, ''); return /^https?:\/\//i.test(u) ? u : ''; }
    function renderMarquee(items) {
      var box = document.getElementById('marquee');
      if (!box || !items || !items.length) return;
      var dur = Math.max(items.length * 12, 40);
      var group = items.map(marqueeItemHtml).join('');
      box.innerHTML = '<div class="marquee-track" style="animation-duration:' + dur + 's">' +
        '<div class="marquee-group">' + group + '</div>' +
        '<div class="marquee-group" aria-hidden="true">' + group + '</div></div>';
      box.classList.add('on');
    }
    function newsItemHtml(item) {
      var href = safeUrl(item.link);
      var date = item.date ? '<span>' + escapeHtml(item.date) + '</span>' : '';
      var cat = '<span class="marquee-badge">' + escapeHtml(item.category || 'Announcement') + '</span>';
      var title = href
        ? '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.title) + '</a>'
        : escapeHtml(item.title);
      var body = item.body ? '<p>' + escapeHtml(item.body) + '</p>' : '';
      return '<article class="news-item"><div class="meta">' + cat + date + '</div><h3>' + title + '</h3>' + body + '</article>';
    }
    function renderNews(items) {
      var box = document.getElementById('news-list');
      if (!box) return;
      if (!items || !items.length) {
        box.className = 'news-empty';
        box.innerHTML = 'No announcements right now. Please check back soon.';
        return;
      }
      box.className = 'news-list';
      box.innerHTML = items.map(newsItemHtml).join('');
    }
    window.kmsReceiveAnnouncements = function (data) {
      try {
        if (data && data.items) { renderMarquee(data.items); renderNews(data.items); }
      } catch (e) {}
    };
    (function loadAnnouncements() {
      var cb = 'kmsReceiveAnnouncements';
      var s = document.createElement('script');
      s.async = true;
      s.src = GAS_URL + '?public=announcements&callback=' + cb + '&_=' + Date.now();
      s.onerror = function () { renderNews(null); };
      document.head.appendChild(s);
    })();

    /* ===== Background music (site/music.mp3) =====
       Preloads with the page and starts on the user's first interaction
       (browsers block autoplay with sound). The music button is always shown
       and acts as the mute / unmute control. Preference is remembered. */
    (function music() {
      var audio = document.getElementById('bg-music');
      var btn = document.getElementById('music-btn');
      if (!audio || !btn) return;
      var MUTE_KEY = 'kms_music_muted';
      var started = false;
      function reflect() {
        btn.classList.toggle('muted', audio.muted || audio.paused);
        btn.setAttribute('aria-pressed', String(!audio.muted && !audio.paused));
      }
      function play() {
        audio.muted = false;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
        reflect();
      }
      function firstStart() {
        if (started) return; started = true;
        if (localStorage.getItem(MUTE_KEY) === '1') { audio.muted = true; reflect(); return; }
        play();
      }
      // Offer the mute control immediately; hide it only if the file is missing.
      btn.classList.add('show');
      audio.addEventListener('error', function () { btn.classList.remove('show'); }, { once: true });
      ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) {
        document.addEventListener(ev, firstStart, { once: true, passive: true });
      });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        started = true;
        if (audio.paused || audio.muted) { play(); try { localStorage.setItem(MUTE_KEY, '0'); } catch (err) {} }
        else { audio.pause(); audio.muted = true; reflect(); try { localStorage.setItem(MUTE_KEY, '1'); } catch (err) {} }
      });
      reflect();
    })();

    /* ===== Theme toggle (default dark; persisted in localStorage) ===== */
    (function theme() {
      var KEY = 'kms-theme';
      var root = document.documentElement;
      var toggle = document.getElementById('theme-toggle');
      function reflect() {
        var dark = root.classList.contains('dark');
        root.style.colorScheme = dark ? 'dark' : 'light';
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#0b1220' : '#ffffff');
      }
      reflect();
      if (toggle) toggle.addEventListener('click', function () {
        var dark = !root.classList.contains('dark');
        root.classList.toggle('dark', dark);
        try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) {}
        reflect();
      });
    })();

    /* ===== Floating quick-access rail ===== */
    (function rail() {
      function digits(s) { return String(s == null ? '' : s).replace(/[^\d+]/g, ''); }
      function waDigits(s) { return String(s == null ? '' : s).replace(/[^\d]/g, ''); }
      var phone = digits(CONFIG.phone);
      var wa = waDigits(CONFIG.whatsapp || CONFIG.phone);
      var call = document.getElementById('fab-call');
      if (call) call.setAttribute('href', 'tel:' + phone);
      var mail = document.getElementById('fab-mail');
      if (mail) mail.setAttribute('href', 'mailto:' + CONFIG.email);
      var waBtn = document.getElementById('fab-wa');
      if (waBtn) {
        if (wa) waBtn.setAttribute('href', 'https://wa.me/' + wa);
        else waBtn.style.display = 'none';
      }
      var railEl = document.getElementById('fab-rail');
      var top = document.getElementById('fab-top');
      if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      setTimeout(function () { if (railEl) railEl.classList.add('ready'); }, 400);
    })();

    /* ===== Scroll progress + sticky header shadow + back-to-top ===== */
    (function scrollFx() {
      var bar = document.getElementById('scroll-progress');
      var header = document.querySelector('header.site');
      var ticking = false;
      function update() {
        ticking = false;
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var y = window.pageYOffset || doc.scrollTop;
        if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        if (header) header.classList.toggle('scrolled', y > 8);
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    })();

    /* ===== Scroll-reveal animations ===== */
    (function reveal() {
      if (!('IntersectionObserver' in window)) return;
      var els = document.querySelectorAll('.section-head, .card, .feature, .step, .contact-item, .hero .wrap > div:first-child, .hero-card');
      if (!els.length) return;
      Array.prototype.forEach.call(els, function (el) { el.classList.add('reveal'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      Array.prototype.forEach.call(els, function (el) { io.observe(el); });
      window.addEventListener('load', function () {
        Array.prototype.forEach.call(els, function (el) { el.style.transitionDelay = ''; });
      });
    })();
  