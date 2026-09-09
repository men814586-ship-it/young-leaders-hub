/* Young Leaders Hub — site scripts */
(function () {
  'use strict';

  /* ---- Sticky header ---- */
  var header = document.querySelector('.header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          var el = en.target;
          var delay = parseInt(el.dataset.delay || 0, 10);
          setTimeout(function () { el.classList.add('in'); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Counter animation ---- */
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var dur = 1400, start = performance.now();
        function tick(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        co.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---- Accordions ---- */
  document.querySelectorAll('.acc-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acc = btn.closest('.acc');
      var panel = acc.querySelector('.acc-a');
      var isOpen = acc.classList.contains('open');
      var group = acc.parentElement;
      group.querySelectorAll('.acc.open').forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.acc-a').style.maxHeight = null;
        o.querySelector('.acc-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        acc.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---- Program filter ---- */
  var filterBtns = document.querySelectorAll('[data-filter]');
  if (filterBtns.length) {
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.filter;
        filterBtns.forEach(function (x) {
          x.classList.remove('btn-dark');
          x.classList.add('btn-ghost');
        });
        b.classList.remove('btn-ghost');
        b.classList.add('btn-dark');
        document.querySelectorAll('[data-cat]').forEach(function (card) {
          var show = f === 'all' || card.dataset.cat.indexOf(f) > -1;
          card.style.display = show ? '' : 'none';
        });
      });
    });

    /* Deep-link support: ?cat=academics|leadership|professional|fitness auto-applies the matching filter */
    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat');
    if (cat) {
      var target = document.querySelector('[data-filter="' + cat + '"]');
      if (target) {
        target.click();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /* ---- Forms: submit to the enquiry API ---- */
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var ok = form.querySelector('.form-ok');
    var err = form.querySelector('.form-err');

    // The error banner is created on demand so the markup stays clean.
    if (!err) {
      err = document.createElement('div');
      err.className = 'form-err';
      form.insertBefore(err, form.firstChild);
    }

    // Live progress bar across the form's required fields — same fields,
    // just a bit of encouragement while filling them in.
    var required = [].slice.call(form.querySelectorAll('[required]'));
    var bar = null, updateProgress = function () {};
    if (required.length) {
      var progress = document.createElement('div');
      progress.className = 'form-progress';
      progress.innerHTML = '<i></i>';
      form.insertBefore(progress, ok || form.firstChild);
      bar = progress.querySelector('i');
      updateProgress = function () {
        var filled = required.filter(function (f) { return f.value && f.checkValidity(); }).length;
        bar.style.width = (filled / required.length * 100) + '%';
      };
      updateProgress();
    }

    // Inline validity feedback — only kicks in once a field has been visited.
    required.forEach(function (f) {
      var field = f.closest('.field');
      if (!field) return;
      var mark = function () {
        var valid = f.checkValidity();
        field.classList.toggle('is-valid', valid && !!f.value);
        field.classList.toggle('is-invalid', !valid && f.dataset.touched === '1');
        updateProgress();
      };
      f.addEventListener('blur', function () { f.dataset.touched = '1'; mark(); });
      f.addEventListener('input', function () {
        if (f.dataset.touched === '1') mark(); else updateProgress();
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      var formKind = form.getAttribute('data-form');
      data.type = (formKind === 'contact' || formKind === 'feedback') ? formKind : 'enrollment';
      data.source = location.pathname.split('/').pop() || 'index.html';
      // The enrollment form calls the parent field 'pname'; the API expects 'name'.
      if (!data.name && data.pname) data.name = data.pname;
      if (!data.childName && data.cname) data.childName = data.cname;
      if (!data.childAge && data.age) data.childAge = data.age;
      if (!data.message && data.msg) data.message = data.msg;
      // Updated enrollment form fields: father's name is the primary contact,
      // student's name/age are the child fields the API expects.
      if (!data.name && data.fname) data.name = data.fname;
      if (!data.childName && data.sname) data.childName = data.sname;
      if (!data.childAge && data.sage) data.childAge = data.sage;
      if (!data.phone && data.fphone) data.phone = data.fphone;

      err.classList.remove('show');
      if (ok) ok.classList.remove('show');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }

      fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            if (!r.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
            return body;
          });
        })
        .then(function () {
          if (ok) {
            ok.classList.add('show');
            ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          form.reset();
          required.forEach(function (f) {
            var field = f.closest('.field');
            if (field) field.classList.remove('is-valid', 'is-invalid');
            delete f.dataset.touched;
          });
          updateProgress();
        })
        .catch(function (e2) {
          // Offline, or the page was opened straight from disk without the server.
          var offline = /failed to fetch|networkerror|load failed/i.test(e2.message);
          err.innerHTML = offline
            ? 'We could not reach the server. Please email us at ' +
              '<a href="mailto:Info@youngleadershub.co">Info@youngleadershub.co</a> ' +
              'or call <a href="tel:+971585120895">+971 58 512 0895</a>.'
            : e2.message;
          err.classList.add('show');
          err.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        });
    });
  });

  /* ---- Active nav link ---- */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });

  /* ---- Footer year ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

/* ==========================================================================
   v3 — preloader, progress, lightbox, tilt, slider, 3D map
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Scroll progress bar ---- */
  var bar = document.querySelector('.scroll-bar');
  var top = document.querySelector('.fab-top');
  function progress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (bar) bar.style.width = p + '%';
    if (top) top.classList.toggle('show', window.scrollY > 600);
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();
  if (top) top.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---- Extra reveal variants ---- */
  var extras = document.querySelectorAll('.reveal-l, .reveal-r, .reveal-s, .mask-rise');
  if ('IntersectionObserver' in window && extras.length) {
    var eo = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var d = parseInt(e.target.dataset.delay || 0, 10);
        setTimeout(function () { e.target.classList.add('in'); }, d);
        eo.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    extras.forEach(function (el) { eo.observe(el); });
  } else {
    extras.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Button ripple ---- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  }

  /* ---- 3D tilt on cards ---- */
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          'perspective(900px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' +
          (-py * 7).toFixed(2) + 'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- Lightbox gallery ---- */
  var lb = document.querySelector('.lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-cap');
    var items = [].slice.call(document.querySelectorAll('[data-lb]'));
    var idx = 0;
    function show(i) {
      idx = (i + items.length) % items.length;
      var src = items[idx].dataset.lb;
      var cap = items[idx].dataset.cap || '';
      lbImg.src = src; lbImg.alt = cap; lbCap.textContent = cap;
    }
    function open(i) { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    items.forEach(function (el, i) {
      el.addEventListener('click', function () { open(i); });
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(i); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
    lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---- Testimonial slider ---- */
  document.querySelectorAll('.slider').forEach(function (sl) {
    var track = sl.querySelector('.slider-track');
    var slides = track ? track.children.length : 0;
    if (!track || !slides) return;
    var nav = sl.parentElement.querySelector('.slider-nav');
    var perView = function () { return window.innerWidth >= 900 ? 3 : 1; };
    var pages = function () { return Math.max(1, slides - perView() + 1); };
    var cur = 0, timer = null;

    function build() {
      if (!nav) return;
      nav.innerHTML = '';
      for (var i = 0; i < pages(); i++) {
        var b = document.createElement('button');
        b.className = 'dot-btn' + (i === cur ? ' on' : '');
        b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        (function (n) { b.addEventListener('click', function () { go(n); restart(); }); })(i);
        nav.appendChild(b);
      }
    }
    function go(i) {
      cur = (i + pages()) % pages();
      track.style.transform = 'translateX(' + (-cur * (100 / perView())) + '%)';
      if (nav) [].forEach.call(nav.children, function (d, n) { d.classList.toggle('on', n === cur); });
    }
    function restart() {
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(function () { go(cur + 1); }, 5200);
    }
    build(); go(0); restart();
    sl.addEventListener('mouseenter', function () { clearInterval(timer); });
    sl.addEventListener('mouseleave', restart);
    window.addEventListener('resize', function () { build(); go(0); });
  });

  /* ---- 3D map (MapLibre GL + OpenFreeMap), with graceful fallback ---- */
  var mapEl = document.getElementById('map3d');
  if (mapEl) {
    var wrap = mapEl.closest('.map3d-wrap');
    var LAT = parseFloat(mapEl.dataset.lat), LNG = parseFloat(mapEl.dataset.lng);
    var failed = false;
    var giveUp = setTimeout(function () {
      if (!failed) { failed = true; if (wrap) wrap.classList.add('fallback'); }
    }, 9000);

    function loadCss(href) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
    }
    function loadJs(src, cb, err) {
      var s = document.createElement('script');
      s.src = src; s.onload = cb; s.onerror = err; document.head.appendChild(s);
    }
    function fail() {
      if (failed) return;
      failed = true; clearTimeout(giveUp);
      if (wrap) wrap.classList.add('fallback');
    }

    loadCss('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css');
    loadJs('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', function () {
      try {
        var map = new maplibregl.Map({
          container: 'map3d',
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [LNG, LAT],
          zoom: 15.4,
          pitch: 62,
          bearing: -22,
          antialias: true,
          attributionControl: { compact: true }
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
        map.addControl(new maplibregl.FullscreenControl(), 'top-left');
        map.scrollZoom.disable(); // page scroll stays natural; ctrl+scroll still zooms

        map.on('error', function () { /* tile hiccups shouldn't kill the map */ });

        map.on('load', function () {
          clearTimeout(giveUp);

          /* 3D building extrusions */
          var layers = map.getStyle().layers || [];
          var labelId;
          for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) { labelId = layers[i].id; break; }
          }
          if (!map.getLayer('ylh-3d-buildings') && map.getSource('openmaptiles')) {
            map.addLayer({
              id: 'ylh-3d-buildings',
              source: 'openmaptiles',
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 13,
              paint: {
                'fill-extrusion-color': [
                  'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 12],
                  0, '#c9d3e4', 30, '#9fb0cb', 80, '#6d82a5', 160, '#3c5a8c'
                ],
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, ['coalesce', ['get', 'render_height'], 12]],
                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                'fill-extrusion-opacity': 0.92
              }
            }, labelId);
          }

          /* Custom gold pin */
          var pin = document.createElement('div');
          pin.className = 'map-pin';
          pin.innerHTML =
            '<svg viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M17 43C17 43 32 27.6 32 16.5 32 8.5 25.3 2 17 2S2 8.5 2 16.5C2 27.6 17 43 17 43Z" fill="#e6a819" stroke="#0a1733" stroke-width="2.5"/>' +
            '<circle cx="17" cy="16.5" r="5.6" fill="#0a1733"/></svg>';

          new maplibregl.Marker({ element: pin, anchor: 'bottom' })
            .setLngLat([LNG, LAT])
            .setPopup(new maplibregl.Popup({ offset: 26, closeButton: false })
              .setHTML('<b>Young Leaders Hub</b><br>Dubai Outsource City, Dubai, UAE'))
            .addTo(map);

          /* Gentle cinematic orbit until the user interacts */
          if (!reduce) {
            var spin = true, raf;
            ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
              map.getCanvas().addEventListener(ev, function () { spin = false; cancelAnimationFrame(raf); }, { passive: true });
            });
            (function orbit() {
              if (!spin) return;
              map.setBearing(map.getBearing() + 0.045);
              raf = requestAnimationFrame(orbit);
            })();
          }
        });
      } catch (e) { fail(); }
    }, fail);
  }
})();

/* ---- Image fallback: if a remote photo fails, swap to bundled artwork ---- */
(function () {
  'use strict';
  function attach(img) {
    if (img.dataset.fbBound) return;
    img.dataset.fbBound = '1';
    img.addEventListener('error', function handle() {
      var fb = img.getAttribute('data-fallback');
      if (fb && img.getAttribute('src') !== fb) {
        img.setAttribute('src', fb);
      } else {
        img.removeEventListener('error', handle);
      }
    });
    if (img.complete && img.naturalWidth === 0) {
      var fb = img.getAttribute('data-fallback');
      if (fb) img.setAttribute('src', fb);
    }
  }
  document.querySelectorAll('img[data-fallback]').forEach(attach);
})();
