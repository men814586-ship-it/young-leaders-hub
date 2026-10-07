/* Young Leaders Hub — applies content published from the admin panel.
   /api/content.js (loaded just before this file) sets window.YLH_CMS.
   Anything the admin has not edited is left exactly as written in the HTML,
   and if the API is unreachable the page simply keeps its built-in content.
   Runs before main.js so reveal, filters, lightbox, tilt and the slider pick
   up the rendered elements. */
(function () {
  var D = window.YLH_CMS || {};
  var page = (location.pathname.split('/').pop() || 'index.html');
  if (page.indexOf('.') < 0) page += '.html';

  function e(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(u) { u = String(u || ''); return /^\s*javascript:/i.test(u) ? '' : e(u); }
  function cls(list, fallback) {
    var first = list && list.firstElementChild;
    return first ? first.className : fallback;
  }
  function list(name) { return document.querySelectorAll('[data-cms-list="' + name + '"]'); }
  function render(name, items, tpl, fallbackCls) {
    if (!Array.isArray(items)) return;
    list(name).forEach(function (el) {
      var c = cls(el, fallbackCls);
      el.innerHTML = items.map(function (it, i) { return tpl(it, i, c); }).join('');
    });
  }

  try {
    /* ---- page headings ---- */
    var T = D.texts && D.texts[page];
    if (T) {
      if (page === 'index.html') {
        var hero = document.querySelector('.hero');
        if (hero) {
          var b = hero.querySelector('.hero-badge'), h1 = hero.querySelector('h1'), p = hero.querySelector('.hero-grid h1 + p');
          if (b && T.badge) b.innerHTML = '<b>' + e(T.badge.split(' — ')[0]) + '</b>' + (T.badge.indexOf(' — ') > -1 ? ' &mdash; ' + e(T.badge.split(' — ').slice(1).join(' — ')) : '');
          if (h1 && (T.title || T.accent)) h1.innerHTML = e(T.title) + (T.accent ? '<br><span class="accent">' + e(T.accent) + '</span>' : '');
          if (p && T.lead) p.textContent = T.lead;
        }
      } else {
        var ph = document.querySelector('.page-head');
        if (ph) {
          var t1 = ph.querySelector('h1'), l1 = ph.querySelector('.lead');
          if (t1 && T.title) t1.textContent = T.title;
          if (l1 && T.lead) l1.textContent = T.lead;
        }
      }
    }

    /* ---- programs ---- */
    var progTpl = function (p, i, c) {
      var tags = (p.tags || []).filter(function (t) { return t && t.text; }).map(function (t) {
        return '<span class="tag' + (t.gold ? ' tag--gold' : '') + '">' + e(t.text) + '</span>';
      }).join('');
      return '<article class="' + e(c) + '" data-cat="' + e(p.cat || 'all') + '" data-delay="' + (i % 3) * 60 + '">' +
        '<div class="prog-cover">' + (p.badge ? '<span class="badge">' + e(p.badge) + '</span>' : '') +
        '<img src="' + url(p.image) + '" data-fallback="' + url(p.fallback || 'assets/img/art/prog-thinking.svg') + '" alt="' + e(p.alt || p.title) + '" loading="lazy" width="900" height="560"></div>' +
        '<div class="prog-body"><h3>' + e(p.title) + '</h3><p>' + e(p.desc) + '</p>' + (tags ? '<div class="prog-meta">' + tags + '</div>' : '') + '</div></article>';
    };
    if (Array.isArray(D.programs)) {
      render('programs', D.programs.filter(function (p) { return p.onPrograms !== false; }), progTpl, 'prog reveal tilt');
      render('programs-home', D.programs.filter(function (p) { return p.onHome; }), progTpl, 'prog reveal tilt');
    }

    /* ---- student projects ---- */
    render('projects', D.projects, function (p, i, c) {
      return '<article class="' + e(c) + '" data-delay="' + [0, 120, 240, 300][i % 4] + '"><div class="prog-cover">' +
        '<img src="' + url(p.image) + '" data-fallback="' + url(p.fallback || 'assets/img/art/gallery-1.svg') + '" alt="' + e(p.alt || p.title) + '" loading="lazy"></div>' +
        '<div class="prog-body"><h3>' + e(p.title) + '</h3><p>' + e(p.desc) + '</p></div></article>';
    }, 'prog reveal tilt');

    /* ---- team ---- */
    var memberTpl = function (m, i, c) {
      var initials = String(m.name || '').split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
      var avatar = m.photo
        ? '<div class="avatar avatar--photo"><img src="' + url(m.photo) + '" alt="' + e(m.name) + '"' + (m.fallback ? ' data-fallback="' + url(m.fallback) + '"' : '') + ' loading="lazy" width="112" height="112"></div>'
        : '<div class="avatar">' + e(initials) + '</div>';
      return '<article class="' + e(c) + '" data-delay="' + (i % 3) * 70 + '">' + avatar + '<h4>' + e(m.name) + '</h4><div class="role">' + e(m.role) + '</div>' +
        (m.bio ? '<p>' + e(m.bio) + '</p>' : '') + '</article>';
    };
    if (Array.isArray(D.team)) {
      render('team', D.team, memberTpl, 'member reveal tilt');
      render('team-home', D.team.filter(function (m) { return m.onHome; }), memberTpl, 'member reveal tilt');
    }

    /* ---- testimonials ---- */
    render('testimonials', D.testimonials, function (q) {
      var n = Math.max(1, Math.min(5, Number(q.stars) || 5));
      return '<div class="slide"><article class="quote"><div class="stars">' + new Array(n + 1).join('&#9733;') + '</div>' +
        '<p>&ldquo;' + e(q.quote) + '&rdquo;</p><div class="quote-by"><div class="avatar">' + e(q.initials || '') + '</div><div><b>' + e(q.name) +
        '</b><span>' + e(q.label || 'Parent') + '</span></div></div></article></div>';
    }, 'slide');

    /* ---- gallery albums ---- */
    var albumSecs = document.querySelectorAll('[data-cms-album]');
    if (Array.isArray(D.albums) && albumSecs.length) {
      var sizeCls = { big: ' g-w2 g-h2', wide: ' g-w2', tall: ' g-h2' };
      var html = D.albums.map(function (a) {
        var filters = (a.filters || []).filter(function (f) { return f && f.key; });
        var used = {};
        (a.photos || []).forEach(function (p) { used[p.cat] = 1; });
        filters = filters.filter(function (f) { return used[f.key]; });
        return '<section class="section section--soft" data-cms-album="' + e(a.id) + '">' +
          '<div class="blobs" aria-hidden="true"><span class="blob blob-1"></span><span class="blob blob-2"></span><span class="blob blob-3"></span></div>' +
          '<div class="container"><div class="sec-head center reveal">' + (a.eyebrow ? '<span class="eyebrow">' + e(a.eyebrow) + '</span>' : '') +
          '<h2>' + e(a.title) + '</h2>' + (a.lead ? '<p class="lead">' + e(a.lead) + '</p>' : '') + '</div>' +
          (filters.length > 1 ? '<div class="center reveal mb-2"><div class="btn-row" style="justify-content:center;margin-top:0;flex-wrap:wrap">' +
            '<button class="btn btn-dark btn-sm" data-filter="all">All</button>' +
            filters.map(function (f) { return '<button class="btn btn-ghost btn-sm" data-filter="' + e(f.key) + '">' + e(f.label) + '</button>'; }).join('') +
            '</div></div>' : '') +
          '<div class="gal reveal mt-3">' + (a.photos || []).map(function (p) {
            var cap = p.lbcap || [p.label, p.caption].filter(Boolean).join(' — ');
            return '<figure class="media' + (sizeCls[p.size] || '') + '" data-cat="' + e(p.cat || 'all') + '" data-lb="' + url(p.full || p.image) + '" data-cap="' + e(cap) + '">' +
              '<img src="' + url(p.image) + '" alt="' + e(p.alt || cap) + '" loading="lazy" decoding="async">' +
              ((p.label || p.caption) ? '<div class="media-cap">' + (p.label ? '<small>' + e(p.label) + '</small>' : '') + e(p.caption) + '</div>' : '') + '</figure>';
          }).join('') + '</div></div></section>';
      }).join('\n');
      var first = albumSecs[0];
      var holder = document.createElement('div');
      holder.innerHTML = html;
      while (holder.firstChild) first.parentNode.insertBefore(holder.firstChild, first);
      albumSecs.forEach(function (s) { s.parentNode.removeChild(s); });
    }

    /* ---- contact details ---- */
    var S = D.settings;
    if (S) {
      var defPhone = '971585120895', defMail = 'info@youngleadershub.co';
      var phoneDigits = String(S.phone || '').replace(/[^\d]/g, '');
      var wa = String(S.whatsapp || '').replace(/[^\d]/g, '');
      document.querySelectorAll('a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        if (phoneDigits && /^tel:/i.test(h) && h.replace(/[^\d]/g, '') === defPhone) {
          a.setAttribute('href', 'tel:+' + phoneDigits);
          if (/\d{3}/.test(a.textContent) && a.children.length === 0) a.textContent = S.phone;
        }
        if (wa && /wa\.me\/971585120895/.test(h)) a.setAttribute('href', h.replace('971585120895', wa));
        if (S.email && /^mailto:/i.test(h) && h.slice(7).toLowerCase() === defMail) {
          a.setAttribute('href', 'mailto:' + S.email);
          if (a.children.length === 0 && /@/.test(a.textContent)) a.textContent = S.email;
        }
      });
    }

    /* ---- announcement banner ---- */
    var B = D.banner;
    var now = new Date().toISOString().slice(0, 10);
    if (B && B.enabled && B.message && (!B.start || B.start <= now) && (!B.end || B.end >= now) && page !== 'admin.html') {
      var key = 'ylh-banner-' + (B.message + B.linkUrl).length + '-' + B.message.slice(0, 20);
      var hidden = false;
      try { hidden = sessionStorage.getItem(key) === '1'; } catch (x) {}
      if (!hidden) {
        var colors = { orange: ['#f0871e', '#fff'], navy: ['#151D5C', '#fff'], green: ['#16855b', '#fff'], gold: ['#fff1e6', '#7a3d00'] };
        var col = colors[B.style] || colors.orange;
        var st = document.createElement('style');
        st.textContent = '.ylh-bar{position:fixed;top:0;left:0;right:0;z-index:101;display:flex;align-items:center;justify-content:center;gap:.8rem;' +
          'padding:.55rem 3rem .55rem 1rem;min-height:42px;font:600 14px/1.35 "Plus Jakarta Sans",system-ui,sans-serif;text-align:center;background:' + col[0] + ';color:' + col[1] + '}' +
          '.ylh-bar a{color:inherit;text-decoration:underline;text-underline-offset:3px;font-weight:800;white-space:nowrap}' +
          '.ylh-bar button{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);background:none;border:0;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:.3rem .5rem;opacity:.85}' +
          '.header{top:var(--ylh-bar,0px)!important}body{padding-top:var(--ylh-bar,0px)}.mobile-menu{top:calc(var(--nav-h) + var(--ylh-bar,0px))!important}';
        document.head.appendChild(st);
        var bar = document.createElement('div');
        bar.className = 'ylh-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Announcement');
        bar.innerHTML = '<span>' + e(B.message) + '</span>' + (B.linkText && B.linkUrl ? '<a href="' + url(B.linkUrl) + '">' + e(B.linkText) + '</a>' : '') +
          (B.dismissible !== false ? '<button type="button" aria-label="Close announcement">&times;</button>' : '');
        document.body.insertBefore(bar, document.body.firstChild);
        var setH = function () { document.documentElement.style.setProperty('--ylh-bar', bar.offsetHeight + 'px'); };
        setH(); window.addEventListener('resize', setH);
        var x = bar.querySelector('button');
        if (x) x.addEventListener('click', function () {
          bar.remove(); document.documentElement.style.setProperty('--ylh-bar', '0px');
          try { sessionStorage.setItem(key, '1'); } catch (y) {}
        });
      }
    }
  } catch (err) {
    if (window.console) console.warn('[cms]', err);
  }

  /* ---- privacy-friendly page-view count (no cookies, no personal data) ---- */
  try {
    if (page !== 'admin.html' && location.protocol.indexOf('http') === 0 && !/^(localhost|127\.)/.test(location.hostname) || window.YLH_TRACK_LOCAL) {
      var payload = JSON.stringify({ p: page, r: document.referrer, w: window.innerWidth });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    }
  } catch (err2) { /* never block the page */ }
})();
