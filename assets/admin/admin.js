/* Young Leaders Hub — admin panel (vanilla JS, no build step) */
(function () {
  'use strict'

  /* =============================================================== utils */
  var $ = function (s, el) { return (el || document).querySelector(s) }
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)) }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)) }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 9) }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) }
  function fmtDate(iso, withTime) {
    if (!iso) return '—'
    var d = new Date(iso)
    var o = { day: 'numeric', month: 'short', year: 'numeric' }
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit' }
    return d.toLocaleString('en-GB', o)
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s / 60) + ' min ago'
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago'
    return fmtDate(iso)
  }
  function num(n) { return Number(n || 0).toLocaleString('en-US') }
  function initials(n) { return String(n || '?').split(/\s+/).map(function (w) { return w[0] || '' }).join('').slice(0, 2).toUpperCase() }
  function imgSrc(u) { return u || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }

  var I = {
    dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4.5-6.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 4-4 5-4 5zM14 21c3 0 7-1 7-8V5h-7v7h4c0 4-4 5-4 5z"/>',
    text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    mega: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
    trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  }
  function icon(n, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[n] || '') + '</svg>' }

  function toast(msg, kind) {
    var t = h('<div class="toast ' + (kind || '') + '">' + esc(msg) + '</div>')
    $('#toasts').appendChild(t)
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0' }, 3200)
    setTimeout(function () { t.remove() }, 3600)
  }

  function api(method, path, body) {
    var opt = { method: method, credentials: 'same-origin', headers: { 'X-YLH-Admin': '1' } }
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body) }
    return fetch('/api/' + path, opt).then(function (r) {
      return r.json().catch(function () { return {} }).then(function (d) {
        if (r.status === 401 && path !== 'admin/login') { showLogin('Your session ended — please sign in again.'); throw new Error('Please sign in again.') }
        if (!r.ok) throw new Error(d.error || ('Request failed (' + r.status + ')'))
        return d
      })
    })
  }

  /* =============================================================== state */
  var S = {
    me: null, roles: {}, setup: {}, saved: {}, meta: {}, seed: null, draft: {}, enquiries: null, statuses: [],
    view: 'dashboard', statsDays: 30,
  }
  function can(p) { return S.me && S.me.perms.indexOf(p) > -1 }

  var NAV = [
    { group: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'dash', perm: 'dashboard', sub: 'Visitors, enquiries and what needs attention' },
    { id: 'enquiries', label: 'Enquiries', icon: 'inbox', perm: 'enquiries.read', sub: 'Every form submitted on the website' },
    { group: 'Website content' },
    { id: 'programs', label: 'Programs', icon: 'book', perm: 'content', sub: 'Course cards on the Programs page and the homepage' },
    { id: 'projects', label: 'Student projects', icon: 'bulb', perm: 'content', sub: 'Project cards on the homepage and gallery' },
    { id: 'team', label: 'Team', icon: 'users', perm: 'content', sub: 'Mentors on the Team page and the homepage teaser' },
    { id: 'albums', label: 'Gallery', icon: 'image', perm: 'content', sub: 'Photo albums on the Gallery page' },
    { id: 'testimonials', label: 'Parent reviews', icon: 'quote', perm: 'content', sub: 'The “What families tell us” slider on the homepage' },
    { id: 'texts', label: 'Pages & contact', icon: 'text', perm: 'content', sub: 'Page headings, intro text and contact details' },
    { id: 'banner', label: 'Announcement', icon: 'mega', perm: 'banner', sub: 'A notice bar across the top of every page' },
    { group: 'Administration' },
    { id: 'users', label: 'Staff & roles', icon: 'shield', perm: 'users', sub: 'Who can sign in, and what they can do' },
    { id: 'activity', label: 'Activity log', icon: 'clock', perm: 'activity', sub: 'Who changed what, and when' },
    { id: 'account', label: 'My account', icon: 'user', perm: null, sub: 'Your name and password' },
  ]
  var COLLECTION_VIEWS = ['programs', 'projects', 'team', 'albums', 'testimonials', 'texts', 'banner']

  /* =============================================================== auth */
  function showLogin(msg) {
    $('#app').classList.add('hidden'); $('#publishBar').classList.remove('show')
    $('#login').classList.remove('hidden')
    var e = $('#loginErr')
    if (msg) { e.textContent = msg; e.classList.remove('hidden') } else e.classList.add('hidden')
    var n = $('#setupNote'), st = S.setup || {}
    var missing = []
    if (!st.database) missing.push('<li><b>Database:</b> Vercel → your project → <b>Storage</b> → Create → <b>Upstash Redis</b> (free) → connect to this project.</li>')
    if (!st.adminPassword) missing.push('<li><b>Admin password:</b> Vercel → Settings → Environment Variables → add <code>ADMIN_PASSWORD</code> (8+ characters).</li>')
    if (missing.length) {
      n.innerHTML = '<b>Finish setup in Vercel first</b><ol>' + missing.join('') + '<li>Then redeploy, and sign in as <b>admin</b> with that password.</li></ol>'
      n.classList.remove('hidden')
    } else n.classList.add('hidden')
  }
  $('#loginForm').addEventListener('submit', function (ev) {
    ev.preventDefault()
    var f = ev.target, btn = f.querySelector('button')
    btn.disabled = true
    api('POST', 'admin/login', { username: f.username.value.trim(), password: f.password.value })
      .then(function (d) { f.password.value = ''; return boot(d.mustChange) })
      .catch(function (e) { var x = $('#loginErr'); x.textContent = e.message; x.classList.remove('hidden') })
      .finally(function () { btn.disabled = false })
  })
  $('#logout').addEventListener('click', function () {
    if (!confirmLeave()) return
    api('POST', 'admin/logout').finally(function () { location.hash = ''; location.reload() })
  })

  function boot(mustChange) {
    return api('GET', 'admin/session').then(function (d) {
      S.setup = d.setup || {}; S.roles = d.roles || {}
      if (!d.signedIn) return showLogin()
      S.me = d.user
      $('#login').classList.add('hidden'); $('#app').classList.remove('hidden')
      $('#meName').textContent = S.me.name; $('#meRole').textContent = S.me.roleLabel; $('#meAvatar').textContent = initials(S.me.name)
      buildNav()
      if (mustChange || d.mustChange) { location.hash = '#account'; setTimeout(function () { toast('Please set your own password before you continue.') }, 300) }
      route()
    }).catch(function (e) { showLogin(e.message) })
  }

  /* =============================================================== nav + routing */
  function buildNav() {
    var html = '', group = ''
    NAV.forEach(function (n) {
      if (n.group) { group = n.group; return }
      if (n.perm && !can(n.perm)) return
      if (group) { html += (html ? '</div>' : '') + '<div class="nav-group"><span>' + group + '</span>'; group = '' }
      html += '<a href="#' + n.id + '" data-v="' + n.id + '">' + icon(n.icon) + '<span>' + n.label + '</span>' + (n.id === 'enquiries' ? '<span class="count hidden" id="newCount"></span>' : '') + '</a>'
    })
    $('#nav').innerHTML = html + '</div>'
  }
  function setNewCount(n) { var c = $('#newCount'); if (!c) return; c.textContent = n; c.classList.toggle('hidden', !n) }

  var lastHash = location.hash
  window.addEventListener('hashchange', function () {
    if (S.view && COLLECTION_VIEWS.indexOf(S.view) > -1 && isDirty(S.view === 'texts' ? ['texts', 'settings'] : [S.view])) {
      if (!confirm('You have unpublished changes. Leave without publishing?')) { history.replaceState(null, '', lastHash); return }
      discard(S.view === 'texts' ? ['texts', 'settings'] : [S.view])
    }
    lastHash = location.hash; route()
  })
  window.addEventListener('beforeunload', function (e) { if (anyDirty()) { e.preventDefault(); e.returnValue = '' } })
  function confirmLeave() { return !anyDirty() || confirm('You have unpublished changes. Leave anyway?') }

  function route() {
    var id = (location.hash || '#dashboard').slice(1).split('/')[0]
    var n = NAV.filter(function (x) { return x.id === id })[0]
    if (!n || (n.perm && !can(n.perm))) n = NAV.filter(function (x) { return x.id && (!x.perm || can(x.perm)) })[0]
    S.view = n.id
    $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.v === n.id) })
    $('#pageTitle').textContent = n.label; $('#pageSub').textContent = n.sub || ''
    $('#topActions').innerHTML = ''
    $('#side').classList.remove('open')
    publishBar(false)
    var v = $('#view'); v.innerHTML = '<div class="loading"><span class="spinner"></span> Loading…</div>'
    window.scrollTo(0, 0)
    var fn = VIEWS[n.id]
    Promise.resolve(fn(v)).catch(function (e) { v.innerHTML = '<div class="notice warn">' + icon('info') + '<div>' + esc(e.message) + '</div></div>' })
  }
  $('#burger').addEventListener('click', function () { $('#side').classList.toggle('open') })

  /* =============================================================== drawer */
  function drawer(title, body, foot) {
    $('#drawerTitle').textContent = title
    var b = $('#drawerBody'); b.innerHTML = ''; if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body)
    var f = $('#drawerFoot'); f.innerHTML = ''; (foot || []).forEach(function (x) { f.appendChild(x) })
    f.classList.toggle('hidden', !(foot && foot.length))
    $('#drawer').classList.add('open'); $('#scrim').classList.add('open')
    setTimeout(function () { var i = b.querySelector('input,textarea,select'); if (i && window.innerWidth > 860) i.focus() }, 260)
  }
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open') }
  $('#drawerClose').addEventListener('click', closeDrawer)
  $('#scrim').addEventListener('click', function () { closeDrawer(); $('#side').classList.remove('open') })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer() })
  function button(label, cls, onClick) { var b = h('<button type="button" class="btn ' + cls + '">' + label + '</button>'); b.addEventListener('click', onClick); return b }

  /* =============================================================== content state */
  function loadContent() {
    if (S.seed) return Promise.resolve()
    return Promise.all([
      api('GET', 'admin/content'),
      fetch('data/seed.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Could not load data/seed.json'); return r.json() }),
    ]).then(function (res) {
      S.saved = res[0].data || {}; S.meta = res[0].meta || {}; S.seed = res[1]
      Object.keys(S.seed).forEach(function (k) { S.draft[k] = clone(S.saved[k] != null ? S.saved[k] : S.seed[k]) })
    })
  }
  function base(name) { return S.saved[name] != null ? S.saved[name] : S.seed[name] }
  function isDirty(names) { return names.some(function (n) { return S.draft[n] && JSON.stringify(S.draft[n]) !== JSON.stringify(base(n)) }) }
  function anyDirty() { return S.seed && COLLECTION_VIEWS.concat(['settings']).some(function (n) { return isDirty([n]) }) }
  function discard(names) { names.forEach(function (n) { S.draft[n] = clone(base(n)) }) }
  var publishNames = [], onRerender = null
  function publishBar(show) { $('#publishBar').classList.toggle('show', Boolean(show)) }
  function changed() { publishBar(isDirty(publishNames)) }
  $('#discardBtn').addEventListener('click', function () {
    if (!confirm('Discard all unpublished changes on this page?')) return
    discard(publishNames); publishBar(false); onRerender && onRerender()
  })
  $('#publishBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true
    var names = publishNames.filter(function (n) { return isDirty([n]) })
    names.reduce(function (p, n) {
      return p.then(function () {
        return api('PUT', 'admin/content/' + n, { data: S.draft[n] }).then(function (d) { S.saved[n] = clone(S.draft[n]); S.meta[n] = d.meta })
      })
    }, Promise.resolve()).then(function () {
      publishBar(false); toast('Published — live on the website within a minute.', 'good'); onRerender && onRerender()
    }).catch(function (e) { toast(e.message, 'bad') }).finally(function () { btn.disabled = false })
  })
  function resetButton(names, label) {
    var b = button('Restore original', 'btn-ghost btn-sm', function () {
      if (!confirm('Go back to the content that was originally built into the website for “' + label + '”? Your edits in this section will be removed from the live site.')) return
      Promise.all(names.map(function (n) { return api('DELETE', 'admin/content/' + n) })).then(function () {
        names.forEach(function (n) { delete S.saved[n]; delete S.meta[n]; S.draft[n] = clone(S.seed[n]) })
        toast('Restored the original content.', 'good'); onRerender && onRerender(); publishBar(false)
      }).catch(function (e) { toast(e.message, 'bad') })
    })
    b.title = 'Undo all admin edits in this section'
    return b
  }
  function metaLine(names) {
    var m = names.map(function (n) { return S.meta[n] }).filter(Boolean).sort(function (a, b) { return a.at < b.at ? 1 : -1 })[0]
    return m ? 'Last published ' + ago(m.at) + ' by ' + esc(m.by) : 'Showing the original website content — not edited yet'
  }

  /* =============================================================== image upload */
  function compress(file, maxSide) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('Please choose an image file.'))
      var img = new Image(), url = URL.createObjectURL(file)
      img.onload = function () {
        var s = Math.min(1, (maxSide || 1600) / Math.max(img.width, img.height))
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height)
        URL.revokeObjectURL(url)
        res(c.toDataURL('image/jpeg', 0.84))
      }
      img.onerror = function () { rej(new Error('That file could not be read as an image.')) }
      img.src = url
    })
  }
  function uploadFile(file, maxSide) {
    return compress(file, maxSide).then(function (dataUrl) {
      return api('POST', 'admin/upload', { name: file.name, dataUrl: dataUrl })
    }).then(function (d) { return d.url })
  }
  function pickFiles(multiple) {
    return new Promise(function (res) {
      var inp = $('#filePick'); inp.multiple = Boolean(multiple); inp.value = ''
      inp.onchange = function () { res([].slice.call(inp.files || [])) }
      inp.click()
    })
  }

  /* =============================================================== form fields */
  // fields: [{k, label, type: text|textarea|image|checkbox|select|chips|tags|number|date|switch, ...}]
  function form(obj, fields, onChange) {
    var wrap = document.createElement('div')
    fields.forEach(function (f) {
      var el
      if (f.type === 'checkbox') {
        el = h('<label class="check"><input type="checkbox"> <span>' + esc(f.label) + '</span></label>')
        var cb = el.querySelector('input')
        cb.checked = obj[f.k] === undefined ? Boolean(f.defTrue) : Boolean(obj[f.k])
        cb.addEventListener('change', function () { obj[f.k] = cb.checked; onChange && onChange(f.k) })
      } else if (f.type === 'image') {
        el = h('<div class="f" style="margin-bottom:14px"><span style="display:block;font-weight:700;font-size:12.5px;color:var(--ink-2);margin-bottom:6px">' + esc(f.label) + '</span>' +
          '<div class="img-field"><div class="prev' + (f.round ? ' round' : '') + '"></div><div class="side-f">' +
          '<div class="row"><button type="button" class="btn btn-dark btn-sm up">' + icon('upload') + ' Upload photo</button>' + (S.setup.storage ? '' : '<span class="faint" style="font-size:12px">Connect a Vercel Blob store to enable uploads</span>') + '</div>' +
          '<input class="input" placeholder="…or paste an image address (https://… or assets/img/…)"></div></div></div>')
        var prev = el.querySelector('.prev'), inp = el.querySelector('input'), up = el.querySelector('.up')
        var paint = function () { prev.style.backgroundImage = obj[f.k] ? 'url("' + String(obj[f.k]).replace(/"/g, '%22') + '")' : '' }
        inp.value = obj[f.k] || ''; paint()
        inp.addEventListener('input', function () { obj[f.k] = inp.value.trim(); paint(); onChange && onChange(f.k) })
        up.addEventListener('click', function () {
          pickFiles(false).then(function (files) {
            if (!files.length) return
            up.disabled = true; up.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Uploading…'
            return uploadFile(files[0], f.maxSide).then(function (u) {
              obj[f.k] = u; inp.value = u; paint(); onChange && onChange(f.k); toast('Photo uploaded', 'good')
              if (f.alsoSet) f.alsoSet.forEach(function (k) { obj[k] = u })
            }).catch(function (e) { toast(e.message, 'bad') }).finally(function () { up.disabled = false; up.innerHTML = icon('upload') + ' Upload photo' })
          })
        })
      } else if (f.type === 'chips') {
        el = h('<div class="f" style="margin-bottom:14px"><span style="display:block;font-weight:700;font-size:12.5px;color:var(--ink-2);margin-bottom:6px">' + esc(f.label) + '</span><div class="chips"></div>' + (f.help ? '<small class="faint" style="display:block;font-size:12px;margin-top:5px">' + esc(f.help) + '</small>' : '') + '</div>')
        var box = el.querySelector('.chips')
        var cur = function () { return String(obj[f.k] || '').split(/\s+/).filter(Boolean) }
        f.options.forEach(function (o) {
          var c = h('<button type="button" class="chip">' + esc(o.label) + '</button>')
          c.classList.toggle('on', cur().indexOf(o.value) > -1)
          c.addEventListener('click', function () {
            var v = cur(), i = v.indexOf(o.value)
            if (i > -1) v.splice(i, 1); else v.push(o.value)
            obj[f.k] = v.join(' '); c.classList.toggle('on', i < 0); onChange && onChange(f.k)
          })
          box.appendChild(c)
        })
      } else if (f.type === 'tags') {
        el = h('<div class="f" style="margin-bottom:14px"><span style="display:block;font-weight:700;font-size:12.5px;color:var(--ink-2);margin-bottom:6px">' + esc(f.label) + '</span><div class="tl"></div><button type="button" class="btn btn-ghost btn-sm add">' + icon('plus') + ' Add tag</button></div>')
        var tl = el.querySelector('.tl')
        obj[f.k] = Array.isArray(obj[f.k]) ? obj[f.k] : []
        var draw = function () {
          tl.innerHTML = ''
          obj[f.k].forEach(function (t, i) {
            var r = h('<div class="tag-row"><input class="input" placeholder="e.g. Age 8+"><label class="check" style="margin:0;white-space:nowrap"><input type="checkbox"> Orange</label><button type="button" class="btn btn-ghost btn-icon" aria-label="Remove tag">' + icon('trash') + '</button></div>')
            var ti = r.querySelector('.input'), gc = r.querySelector('input[type=checkbox]')
            ti.value = t.text || ''; gc.checked = Boolean(t.gold)
            ti.addEventListener('input', function () { t.text = ti.value; onChange && onChange(f.k) })
            gc.addEventListener('change', function () { t.gold = gc.checked; onChange && onChange(f.k) })
            r.querySelector('button').addEventListener('click', function () { obj[f.k].splice(i, 1); draw(); onChange && onChange(f.k) })
            tl.appendChild(r)
          })
        }
        draw()
        el.querySelector('.add').addEventListener('click', function () { obj[f.k].push({ text: '', gold: obj[f.k].length > 0 }); draw(); onChange && onChange(f.k) })
      } else if (f.type === 'select') {
        el = h('<label class="f"><span>' + esc(f.label) + '</span><select class="input"></select>' + (f.help ? '<small>' + esc(f.help) + '</small>' : '') + '</label>')
        var sel = el.querySelector('select')
        f.options.forEach(function (o) { var op = document.createElement('option'); op.value = o.value; op.textContent = o.label; sel.appendChild(op) })
        sel.value = obj[f.k] == null ? (f.def || '') : obj[f.k]
        sel.addEventListener('change', function () { obj[f.k] = f.numeric ? Number(sel.value) : sel.value; onChange && onChange(f.k) })
      } else {
        var tag = f.type === 'textarea' ? 'textarea' : 'input'
        el = h('<label class="f"><span>' + esc(f.label) + '</span><' + tag + ' class="input"' + (f.type === 'date' ? ' type="date"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + ' placeholder="' + esc(f.ph || '') + '">' + (tag === 'textarea' ? '</textarea>' : '') + (f.help ? '<small>' + esc(f.help) + '</small>' : '') + '</label>')
        var ip = el.querySelector(tag)
        if (f.rows) ip.style.minHeight = (f.rows * 24) + 'px'
        ip.value = obj[f.k] == null ? '' : obj[f.k]
        ip.addEventListener('input', function () { obj[f.k] = ip.value; onChange && onChange(f.k) })
      }
      wrap.appendChild(el)
    })
    return wrap
  }

  /* =============================================================== charts */
  function lineChart(series, keys, colors, labels) {
    var W = 760, H = 230, P = { l: 38, r: 12, t: 12, b: 26 }
    var max = Math.max(4, Math.max.apply(null, series.map(function (d) { return Math.max.apply(null, keys.map(function (k) { return d[k] })) })))
    var step = Math.pow(10, Math.floor(Math.log10(max))); var nice = Math.ceil(max / step) * step; if (nice / step <= 3) nice = Math.ceil(max / (step / 2)) * (step / 2)
    var x = function (i) { return P.l + i * (W - P.l - P.r) / Math.max(1, series.length - 1) }
    var y = function (v) { return H - P.b - v / nice * (H - P.t - P.b) }
    var g = '<g class="grid">' + [0, .25, .5, .75, 1].map(function (f) { return '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(nice * f) + '" y2="' + y(nice * f) + '"/>' }).join('') + '</g>'
    var ax = '<g class="axis">' + [0, .5, 1].map(function (f) { return '<text x="' + (P.l - 8) + '" y="' + (y(nice * f) + 4) + '" text-anchor="end">' + num(Math.round(nice * f)) + '</text>' }).join('')
    var every = Math.ceil(series.length / 7)
    series.forEach(function (d, i) { if (i % every === 0 || i === series.length - 1) ax += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtShort(d.date) + '</text>' })
    ax += '</g>'
    var paths = keys.map(function (k, ki) {
      var pts = series.map(function (d, i) { return x(i).toFixed(1) + ',' + y(d[k]).toFixed(1) })
      var area = ki === 0 ? '<path d="M' + x(0) + ',' + y(0) + ' L' + pts.join(' L') + ' L' + x(series.length - 1) + ',' + y(0) + 'Z" fill="' + colors[ki] + '" opacity=".08"/>' : ''
      return area + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + colors[ki] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
    }).join('')
    var el = h('<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(labels.join(' and ') + ' per day') + '">' + g + ax + paths +
      '<line class="cross" y1="' + P.t + '" y2="' + (H - P.b) + '" stroke="#97a1b1" stroke-dasharray="3 3" visibility="hidden"/>' +
      keys.map(function (k, ki) { return '<circle class="dot' + ki + '" r="4.5" fill="' + colors[ki] + '" stroke="#fff" stroke-width="2" visibility="hidden"/>' }).join('') +
      '<rect x="' + P.l + '" y="0" width="' + (W - P.l - P.r) + '" height="' + H + '" fill="transparent"/></svg><div class="tip hidden"></div></div>')
    var svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('.cross')
    svg.addEventListener('mousemove', function (ev) {
      var r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W
      var i = Math.max(0, Math.min(series.length - 1, Math.round((sx - P.l) / ((W - P.l - P.r) / Math.max(1, series.length - 1)))))
      var d = series[i]
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible')
      keys.forEach(function (k, ki) { var c = el.querySelector('.dot' + ki); c.setAttribute('cx', x(i)); c.setAttribute('cy', y(d[k])); c.setAttribute('visibility', 'visible') })
      tip.innerHTML = '<b>' + fmtDate(d.date) + '</b><br>' + keys.map(function (k, ki) { return '<i style="background:' + colors[ki] + '"></i>' + labels[ki] + ': <b>' + num(d[k]) + '</b>' }).join('<br>')
      tip.classList.remove('hidden'); tip.style.left = (x(i) / W * r.width) + 'px'; tip.style.top = (Math.min.apply(null, keys.map(function (k) { return y(d[k]) })) / H * r.height) + 'px'
    })
    svg.addEventListener('mouseleave', function () { tip.classList.add('hidden'); cross.setAttribute('visibility', 'hidden'); $$('circle', el).forEach(function (c) { c.setAttribute('visibility', 'hidden') }) })
    return el
  }
  function fmtShort(d) { var x = new Date(d + 'T00:00:00'); return x.getDate() + ' ' + x.toLocaleString('en-GB', { month: 'short' }) }
  function barChart(entries, color, label) {
    var W = 760, H = 180, P = { l: 30, r: 8, t: 10, b: 26 }
    var max = Math.max(3, Math.max.apply(null, entries.map(function (e) { return e[1] })))
    var bw = (W - P.l - P.r) / entries.length, gap = Math.min(6, bw * .3)
    var y = function (v) { return H - P.b - v / max * (H - P.t - P.b) }
    var every = Math.ceil(entries.length / 7)
    var out = '<g class="grid"><line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(0) + '" y2="' + y(0) + '"/><line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(max) + '" y2="' + y(max) + '"/></g><g class="axis"><text x="' + (P.l - 6) + '" y="' + (y(max) + 4) + '" text-anchor="end">' + max + '</text><text x="' + (P.l - 6) + '" y="' + (y(0) + 4) + '" text-anchor="end">0</text>'
    entries.forEach(function (e, i) { if (i % every === 0 || i === entries.length - 1) out += '<text x="' + (P.l + i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtShort(e[0]) + '</text>' })
    out += '</g>'
    entries.forEach(function (e, i) {
      var x0 = P.l + i * bw + gap / 2, w = bw - gap, top = y(e[1]), hh = y(0) - top
      if (e[1] > 0) out += '<path d="M' + x0 + ',' + y(0) + 'V' + (top + Math.min(4, hh)) + 'q0,-' + Math.min(4, hh) + ' ' + Math.min(4, w / 2) + ',-' + Math.min(4, hh) + 'H' + (x0 + w - Math.min(4, w / 2)) + 'q' + Math.min(4, w / 2) + ',0 ' + Math.min(4, w / 2) + ',' + Math.min(4, hh) + 'V' + y(0) + 'Z" fill="' + color + '"/>'
      out += '<rect class="hit" data-i="' + i + '" x="' + (P.l + i * bw) + '" y="' + P.t + '" width="' + bw + '" height="' + (H - P.t - P.b) + '" fill="transparent"/>'
    })
    var el = h('<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' + out + '</svg><div class="tip hidden"></div></div>')
    var tip = el.querySelector('.tip'), svg = el.querySelector('svg')
    $$('.hit', el).forEach(function (r) {
      r.addEventListener('mouseenter', function () {
        var e = entries[+r.dataset.i], b = svg.getBoundingClientRect()
        tip.innerHTML = '<b>' + fmtDate(e[0]) + '</b><br><i style="background:' + color + '"></i>' + label + ': <b>' + e[1] + '</b>'
        tip.classList.remove('hidden'); tip.style.left = ((+r.getAttribute('x') + bw / 2) / W * b.width) + 'px'; tip.style.top = (y(e[1]) / H * b.height) + 'px'
      })
    })
    svg.addEventListener('mouseleave', function () { tip.classList.add('hidden') })
    return el
  }
  function hbars(entries, color, fmtLabel) {
    if (!entries.length) return '<div class="empty">No data yet</div>'
    var max = Math.max.apply(null, entries.map(function (e) { return e[1] }))
    return '<div class="bars-h">' + entries.map(function (e) {
      return '<div class="bar-row" title="' + esc((fmtLabel ? fmtLabel(e[0]) : e[0]) + ': ' + e[1]) + '"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(fmtLabel ? fmtLabel(e[0]) : e[0]) + '</span><div class="track"><div class="fill" style="width:' + Math.max(2, e[1] / max * 100) + '%;background:' + (color || 'var(--indigo)') + '"></div></div><span class="num">' + num(e[1]) + '</span></div>'
    }).join('') + '</div>'
  }
  var PAGE_NAMES = { 'index.html': 'Home', 'about.html': 'About', 'programs.html': 'Programs', 'teaching-model.html': 'Teaching Model', 'campus.html': 'Campus', 'team.html': 'Our Team', 'gallery.html': 'Gallery', 'videos.html': 'Our Videos', 'contact.html': 'Contact', 'enrollment.html': 'Expression of Interest' }
  var TYPE_NAMES = { enrollment: 'Expression of interest', contact: 'Contact message', feedback: 'Parent feedback' }
  var STATUS_NAMES = { new: 'New', contacted: 'Contacted', visit: 'Visit booked', enrolled: 'Enrolled', closed: 'Closed' }

  /* =============================================================== views */
  var VIEWS = {}

  /* ---------------- dashboard ---------------- */
  VIEWS.dashboard = function (v) {
    var tabs = h('<div class="tabs" role="tablist"><button data-d="7">7 days</button><button data-d="30">30 days</button><button data-d="90">90 days</button></div>')
    $$('button', tabs).forEach(function (b) {
      b.classList.toggle('on', +b.dataset.d === S.statsDays)
      b.addEventListener('click', function () { S.statsDays = +b.dataset.d; route() })
    })
    $('#topActions').appendChild(tabs)
    return api('GET', 'admin/stats?days=' + S.statsDays).then(function (d) {
      var views = d.series.reduce(function (a, x) { return a + x.views }, 0)
      var visitors = d.series.reduce(function (a, x) { return a + x.visitors }, 0)
      var E = d.enquiries
      if (E) setNewCount(E.newCount)
      v.innerHTML = ''
      var warn = []
      if (!S.setup.storage) warn.push('Photo uploads are off until a <b>Blob</b> store is connected in Vercel → Storage.')
      if (warn.length) v.appendChild(h('<div class="notice warn">' + icon('info') + '<div>' + warn.join('<br>') + '</div></div>'))

      var k = h('<div class="grid g4"></div>')
      k.appendChild(h('<div class="card kpi accent"><div class="label">' + icon('eye') + 'Page views</div><div class="val">' + num(views) + '</div><div class="foot">last ' + d.days + ' days</div></div>'))
      k.appendChild(h('<div class="card kpi"><div class="label">' + icon('users') + 'Visitors</div><div class="val">' + num(visitors) + '</div><div class="foot">unique per day, summed</div></div>'))
      if (E) {
        k.appendChild(h('<div class="card kpi"><div class="label">' + icon('inbox') + 'Enquiries</div><div class="val">' + num(E.inRange) + '</div><div class="foot">' + (visitors ? (E.inRange / visitors * 100).toFixed(1) + '% of visitors enquired' : 'last ' + d.days + ' days') + '</div></div>'))
        k.appendChild(h('<a class="card kpi" href="#enquiries" style="text-decoration:none;color:inherit"><div class="label">' + icon('clock') + 'Waiting for reply</div><div class="val" style="color:' + (E.newCount ? 'var(--orange-ink)' : 'inherit') + '">' + num(E.newCount) + '</div><div class="foot">status “New” → open inbox</div></a>'))
      } else {
        var top = d.pages[0]
        k.appendChild(h('<div class="card kpi"><div class="label">' + icon('globe') + 'Most visited</div><div class="val" style="font-size:20px">' + esc(top ? PAGE_NAMES[top[0]] || top[0] : '—') + '</div><div class="foot">' + (top ? num(top[1]) + ' views' : '') + '</div></div>'))
        k.appendChild(h('<div class="card kpi"><div class="label">' + icon('phone') + 'Mobile share</div><div class="val">' + (views ? Math.round((d.devices.mobile || 0) / views * 100) : 0) + '%</div><div class="foot">of page views</div></div>'))
      }
      v.appendChild(k)

      var row = h('<div class="grid g3 mt"></div>')
      var traffic = h('<div class="card span2"><div class="card-h"><h3>Website traffic</h3><span class="grow"></span><div class="legend"><span><i style="background:#3442b0"></i>Page views</span><span><i style="background:#cf6a0a"></i>Visitors</span></div></div><div class="card-b"></div></div>')
      if (views) traffic.querySelector('.card-b').appendChild(lineChart(d.series, ['views', 'visitors'], ['#3442b0', '#cf6a0a'], ['Page views', 'Visitors']))
      else traffic.querySelector('.card-b').innerHTML = '<div class="empty">No visits recorded yet. Counting starts as soon as this version is live — admins and bots are not counted.</div>'
      row.appendChild(traffic)
      row.appendChild(h('<div class="card"><div class="card-h"><h3>Top pages</h3></div><div class="card-b">' + hbars(d.pages.slice(0, 8), '#3442b0', function (p) { return PAGE_NAMES[p] || p }) + '</div></div>'))
      v.appendChild(row)

      var row2 = h('<div class="grid g3 mt"></div>')
      if (E) {
        var ec = h('<div class="card span2"><div class="card-h"><h3>Enquiries per day</h3><span class="grow"></span><span class="muted">' + Object.keys(E.byType).map(function (t) { return esc(TYPE_NAMES[t] || t) + ': <b>' + E.byType[t] + '</b>' }).join(' · ') + '</span></div><div class="card-b"></div></div>')
        var bd = Object.keys(E.byDay).map(function (k2) { return [k2, E.byDay[k2]] })
        ec.querySelector('.card-b').appendChild(E.inRange ? barChart(bd, '#cf6a0a', 'Enquiries') : h('<div class="empty">No enquiries in this period.</div>'))
        row2.appendChild(ec)
        var order = ['new', 'contacted', 'visit', 'enrolled', 'closed']
        row2.appendChild(h('<div class="card"><div class="card-h"><h3>Admissions pipeline</h3><span class="muted">all time</span></div><div class="card-b">' +
          hbars(order.map(function (s) { return [s, E.byStatus[s] || 0] }), '#3442b0', function (s) { return STATUS_NAMES[s] }) + '</div></div>'))
      }
      var dev = Object.keys(d.devices).map(function (k3) { return [k3, d.devices[k3]] }).sort(function (a, b) { return b[1] - a[1] })
      row2.appendChild(h('<div class="card"><div class="card-h"><h3>Devices</h3></div><div class="card-b">' + hbars(dev, '#3442b0', function (x) { return x[0].toUpperCase() + x.slice(1) }) + '</div></div>'))
      row2.appendChild(h('<div class="card"><div class="card-h"><h3>Where visitors come from</h3></div><div class="card-b">' + (d.referrers.length ? hbars(d.referrers, '#3442b0') : '<div class="empty">Mostly direct visits so far (typed address, WhatsApp links, bookmarks).</div>') + '</div></div>'))
      if (E) {
        var rec = h('<div class="card' + (E ? '' : '') + '"><div class="card-h"><h3>Latest enquiries</h3><span class="grow"></span><a href="#enquiries" class="btn btn-ghost btn-sm">Open inbox</a></div><div class="card-b" style="padding-top:8px"></div></div>')
        rec.querySelector('.card-b').innerHTML = E.recent.length ? E.recent.map(function (r) {
          return '<div class="log-item"><div style="flex:1;min-width:0"><b>' + esc(r.name) + '</b>' + (r.childName ? ' <span class="muted">for ' + esc(r.childName) + '</span>' : '') + '<div class="faint" style="font-size:12px">' + esc(TYPE_NAMES[r.type] || r.type) + ' · ' + ago(r.receivedAt) + '</div></div><span class="pill s-' + r.status + '">' + STATUS_NAMES[r.status] + '</span></div>'
        }).join('') : '<div class="empty">No enquiries yet.</div>'
        row2.appendChild(rec)
      }
      v.appendChild(row2)
    })
  }

  /* ---------------- enquiries ---------------- */
  var EQ = { q: '', type: '', status: '' }
  VIEWS.enquiries = function (v) {
    if (can('enquiries.read')) {
      var ex = h('<a class="btn btn-ghost btn-sm" href="/api/admin/export.csv">' + icon('download') + ' Export CSV</a>')
      $('#topActions').appendChild(ex)
    }
    return api('GET', 'admin/enquiries').then(function (d) {
      S.enquiries = d.enquiries; S.statuses = d.statuses
      setNewCount(d.enquiries.filter(function (e) { return e.status === 'new' }).length)
      v.innerHTML = ''
      var bar = h('<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" placeholder="Search name, email, phone, child…" aria-label="Search enquiries"></div>' +
        '<select class="input" aria-label="Type"><option value="">All types</option><option value="enrollment">Expression of interest</option><option value="contact">Contact message</option><option value="feedback">Parent feedback</option></select>' +
        '<select class="input" aria-label="Status"><option value="">All statuses</option>' + d.statuses.map(function (s) { return '<option value="' + s + '">' + STATUS_NAMES[s] + '</option>' }).join('') + '</select><span class="grow"></span><span class="muted count"></span></div>')
      var q = bar.querySelector('input'), selT = bar.querySelectorAll('select')[0], selS = bar.querySelectorAll('select')[1]
      q.value = EQ.q; selT.value = EQ.type; selS.value = EQ.status
      v.appendChild(bar)
      var card = h('<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Received</th><th>Name</th><th class="hide-sm">Student</th><th class="hide-sm">Contact</th><th class="hide-sm">Type</th><th>Status</th></tr></thead><tbody></tbody></table></div></div>')
      v.appendChild(card)
      var draw = function () {
        var term = q.value.trim().toLowerCase()
        EQ.q = q.value; EQ.type = selT.value; EQ.status = selS.value
        var rows = S.enquiries.filter(function (e) {
          if (EQ.type && e.type !== EQ.type) return false
          if (EQ.status && e.status !== EQ.status) return false
          if (!term) return true
          return [e.name, e.email, e.phone, e.childName, e.message, e.subject, e.reference].join(' ').toLowerCase().indexOf(term) > -1
        })
        bar.querySelector('.count').textContent = rows.length + ' of ' + S.enquiries.length
        card.querySelector('tbody').innerHTML = rows.length ? rows.map(function (e) {
          return '<tr class="clickable' + (e.status === 'new' ? ' unread' : '') + '" data-id="' + e.id + '"><td style="white-space:nowrap">' + fmtDate(e.receivedAt) + '<div class="faint" style="font-size:12px">' + ago(e.receivedAt) + '</div></td>' +
            '<td><span class="name">' + esc(e.name) + '</span><div class="faint" style="font-size:12px">' + esc(e.email) + '</div></td>' +
            '<td class="hide-sm">' + esc(e.childName || '—') + (e.childAge ? ' <span class="faint">(' + esc(e.childAge) + ')</span>' : '') + '</td>' +
            '<td class="hide-sm">' + esc(e.phone || '—') + '</td>' +
            '<td class="hide-sm"><span class="pill plain t-' + e.type + '">' + esc(TYPE_NAMES[e.type] || e.type) + '</span></td>' +
            '<td><span class="pill s-' + e.status + '">' + STATUS_NAMES[e.status] + '</span></td></tr>'
        }).join('') : '<tr><td colspan="6"><div class="empty">' + (S.enquiries.length ? 'Nothing matches these filters.' : 'No enquiries yet. Submissions from the Contact and Expression of Interest forms appear here.') + '</div></td></tr>'
        $$('tr[data-id]', card).forEach(function (tr) { tr.addEventListener('click', function () { openEnquiry(tr.dataset.id, draw) }) })
      }
      q.addEventListener('input', draw); selT.addEventListener('change', draw); selS.addEventListener('change', draw)
      draw()
      var openId = location.hash.split('/')[1]
      if (openId) openEnquiry(openId, draw)
    })
  }
  function openEnquiry(id, redraw) {
    var e = S.enquiries.filter(function (x) { return x.id === id })[0]
    if (!e) return
    var body = document.createElement('div')
    var rows = [
      ['Received', fmtDate(e.receivedAt, true)], ['Type', TYPE_NAMES[e.type] || e.type],
      ['Parent / name', e.name], ['Email', e.email ? '<a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a>' : ''],
      ['Phone', e.phone ? '<a href="tel:' + esc(e.phone.replace(/\s/g, '')) + '">' + esc(e.phone) + '</a> · <a href="https://wa.me/' + esc(e.phone.replace(/[^\d]/g, '').replace(/^0/, '971')) + '" target="_blank" rel="noopener">WhatsApp</a>' : ''],
      ['Student', e.childName ? esc(e.childName) + (e.childAge ? ', age ' + esc(e.childAge) : '') : ''],
      ['Program', esc(e.program)], ['Subject', esc(e.subject)], ['Heard about us', esc(e.reference)],
      ['Rating', e.rating ? '★★★★★'.slice(0, e.rating) + '<span class="faint">' + '★★★★★'.slice(e.rating) + '</span>' : ''], ['Sent from', esc(PAGE_NAMES[e.source] || e.source)],
    ].filter(function (r) { return r[1] })
    body.innerHTML = '<dl class="kv">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + (r[0] === 'Parent / name' || r[0] === 'Received' || r[0] === 'Type' ? esc(r[1]) : r[1]) + '</dd>' }).join('') + '</dl>' +
      (e.message ? '<h4 class="mt2" style="font-size:13px;margin-bottom:8px">Message</h4><div class="msg-box">' + esc(e.message) + '</div>' : '')
    var st = h('<div class="mt2"><h4 style="font-size:13px;margin-bottom:8px">Status</h4><div class="chips"></div></div>')
    var writable = can('enquiries.write')
    S.statuses.forEach(function (s) {
      var c = h('<button type="button" class="chip' + (e.status === s ? ' on' : '') + '"' + (writable ? '' : ' disabled') + '>' + STATUS_NAMES[s] + '</button>')
      c.addEventListener('click', function () {
        if (e.status === s) return
        api('PATCH', 'admin/enquiries/' + e.id, { status: s }).then(function (d) {
          Object.assign(e, d.enquiry); $$('.chip', st).forEach(function (x) { x.classList.toggle('on', x === c) }); redraw(); toast('Marked as ' + STATUS_NAMES[s])
          setNewCount(S.enquiries.filter(function (x) { return x.status === 'new' }).length)
        }).catch(function (err) { toast(err.message, 'bad') })
      })
      st.querySelector('.chips').appendChild(c)
    })
    body.appendChild(st)
    var notes = h('<div class="mt2"><h4 style="font-size:13px;margin-bottom:8px">Notes <span class="faint" style="font-weight:600">— only staff see these</span></h4><div class="nl"></div></div>')
    var drawNotes = function () {
      notes.querySelector('.nl').innerHTML = (e.notes || []).length ? e.notes.map(function (n) { return '<div class="note"><small>' + esc(n.by) + ' · ' + fmtDate(n.t, true) + '</small>' + esc(n.text) + '</div>' }).join('') : '<div class="faint" style="font-size:13px;margin-bottom:8px">No notes yet.</div>'
    }
    drawNotes()
    if (writable) {
      var add = h('<div><textarea class="input" rows="3" placeholder="e.g. Called the father, visit booked for Saturday 10am"></textarea><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn btn-dark btn-sm" type="button">Add note</button></div></div>')
      add.querySelector('button').addEventListener('click', function () {
        var t = add.querySelector('textarea').value.trim(); if (!t) return
        api('PATCH', 'admin/enquiries/' + e.id, { note: t }).then(function (d) { Object.assign(e, d.enquiry); add.querySelector('textarea').value = ''; drawNotes() }).catch(function (err) { toast(err.message, 'bad') })
      })
      notes.appendChild(add)
    }
    body.appendChild(notes)
    var foot = []
    if (can('enquiries.delete')) foot.push(button(icon('trash') + ' Delete', 'btn-danger', function () {
      if (!confirm('Delete this enquiry from ' + e.name + ' permanently? This cannot be undone.')) return
      api('DELETE', 'admin/enquiries/' + e.id).then(function () {
        S.enquiries = S.enquiries.filter(function (x) { return x.id !== e.id }); closeDrawer(); redraw(); toast('Enquiry deleted')
      }).catch(function (err) { toast(err.message, 'bad') })
    }))
    if (e.email) foot.push(h('<a class="btn btn-primary" href="mailto:' + esc(e.email) + '?subject=' + encodeURIComponent('Young Leaders Hub — your enquiry') + '">Reply by email</a>'))
    drawer(e.name || 'Enquiry', body, foot)
  }

  /* ---------------- generic list editor ---------------- */
  function listEditor(v, cfg) {
    // cfg: {name, label, single, thumb(it), round, title(it), sub(it), flags(it), fields, blank(), filters}
    publishNames = [cfg.name]
    var render = function () {
      var items = S.draft[cfg.name]
      v.innerHTML = ''
      var head = h('<div class="row" style="margin-bottom:14px"><span class="muted" style="font-size:13px">' + metaLine([cfg.name]) + '</span><span class="grow"></span></div>')
      head.appendChild(resetButton([cfg.name], cfg.label))
      head.appendChild(button(icon('plus') + ' Add ' + cfg.single, 'btn-primary btn-sm', function () {
        var it = cfg.blank(); edit(it, true)
      }))
      v.appendChild(head)
      if (cfg.help) v.appendChild(h('<div class="notice">' + icon('info') + '<div>' + cfg.help + '</div></div>'))
      var filterVal = cfg.filters ? (cfg._f || cfg.filters[0].value) : null
      if (cfg.filters) {
        var tabs = h('<div class="tabs" style="display:inline-flex;margin-bottom:12px"></div>')
        cfg.filters.forEach(function (f) {
          var b = h('<button type="button">' + esc(f.label) + ' <span class="faint">' + items.filter(f.test).length + '</span></button>')
          b.classList.toggle('on', f.value === filterVal)
          b.addEventListener('click', function () { cfg._f = f.value; render() })
          tabs.appendChild(b)
        })
        v.appendChild(tabs)
      }
      var list = h('<div class="items"></div>')
      var test = cfg.filters ? cfg.filters.filter(function (f) { return f.value === filterVal })[0].test : function () { return true }
      items.forEach(function (it, i) {
        if (!test(it)) return
        var row = h('<div class="item' + (it.visible === false ? ' off' : '') + '">' +
          '<div class="handle"><button type="button" aria-label="Move up">' + icon('up') + '</button><button type="button" aria-label="Move down">' + icon('down') + '</button></div>' +
          (cfg.thumb ? '<img class="thumb' + (cfg.round ? ' round' : '') + '" alt="" loading="lazy" src="' + esc(imgSrc(cfg.thumb(it))) + '">' : '') +
          '<div class="info"><b>' + esc(cfg.title(it) || '(untitled)') + '</b><small>' + esc(cfg.sub(it) || '') + '</small></div>' +
          '<div class="flags">' + (cfg.flags ? cfg.flags(it) : '') + (it.visible === false ? '<span class="pill">Hidden</span>' : '') + '</div>' +
          '<div class="acts"><button type="button" class="btn btn-ghost btn-icon" title="' + (it.visible === false ? 'Show on website' : 'Hide from website') + '">' + icon(it.visible === false ? 'eyeoff' : 'eye') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon" title="Edit">' + icon('edit') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon" title="Delete">' + icon('trash') + '</button></div></div>')
        var hb = row.querySelectorAll('.handle button'), ab = row.querySelectorAll('.acts button')
        var move = function (dir) {
          // move within the currently visible (filtered) subset
          var idxs = items.map(function (x, j) { return test(x) ? j : -1 }).filter(function (j) { return j > -1 })
          var p = idxs.indexOf(i), q = p + dir
          if (q < 0 || q >= idxs.length) return
          var a = idxs[p], b = idxs[q], t = items[a]; items[a] = items[b]; items[b] = t
          render(); changed()
        }
        hb[0].addEventListener('click', function () { move(-1) })
        hb[1].addEventListener('click', function () { move(1) })
        ab[0].addEventListener('click', function () { it.visible = it.visible === false; render(); changed() })
        ab[1].addEventListener('click', function () { edit(it, false) })
        ab[2].addEventListener('click', function () {
          if (!confirm('Delete “' + (cfg.title(it) || 'this item') + '”? It disappears from the website when you publish.')) return
          items.splice(items.indexOf(it), 1); render(); changed()
        })
        row.querySelector('.info').addEventListener('dblclick', function () { edit(it, false) })
        list.appendChild(row)
      })
      if (!list.children.length) list.appendChild(h('<div class="empty card">Nothing here yet — use “Add ' + esc(cfg.single) + '”.</div>'))
      v.appendChild(list)
      changed()
    }
    var edit = function (it, isNew) {
      var work = clone(it)
      var body = form(work, typeof cfg.fields === 'function' ? cfg.fields(work) : cfg.fields)
      drawer((isNew ? 'Add ' : 'Edit ') + cfg.single, body, [
        button('Cancel', 'btn-ghost', closeDrawer),
        button(isNew ? 'Add' : 'Done', 'btn-dark', function () {
          if (cfg.validate) { var err = cfg.validate(work); if (err) return toast(err, 'bad') }
          if (cfg.before) cfg.before(work)
          if (isNew) S.draft[cfg.name].unshift(work); else Object.assign(it, work)
          closeDrawer(); render(); changed()
          toast(isNew ? 'Added — publish to put it live' : 'Updated — publish to put it live')
        }),
      ])
    }
    onRerender = render
    render()
  }

  var CAT_LABELS = { academics: 'Academics', leadership: 'Leadership', professional: 'Professional & Life Skills', fitness: 'Sports & Wellbeing', 'ai-tech': 'AI & Technologies', entrepreneurship: 'Entrepreneurship', stem: 'STEM', lifeskills: 'Life Skills', tech: 'Technology', business: 'Business', creative: 'Creative', language: 'Language' }
  function catOptions() {
    var set = {}
    Object.keys(CAT_LABELS).forEach(function (k) { set[k] = 1 })
    ;(S.draft.programs || []).forEach(function (p) { String(p.cat || '').split(/\s+/).forEach(function (c) { if (c) set[c] = 1 }) })
    return Object.keys(set).map(function (k) { return { value: k, label: CAT_LABELS[k] || k } })
  }

  VIEWS.programs = function (v) {
    return loadContent().then(function () {
      listEditor(v, {
        name: 'programs', label: 'Programs', single: 'program',
        help: 'Each card can show on the <b>Programs</b> page, the <b>homepage</b> “Our Programs” section, or both. Use the arrows to change the order. Changes go live when you press <b>Publish</b>.',
        filters: [
          { value: 'all', label: 'All', test: function () { return true } },
          { value: 'p', label: 'Programs page', test: function (x) { return x.onPrograms !== false } },
          { value: 'h', label: 'Homepage', test: function (x) { return x.onHome } },
        ],
        thumb: function (x) { return x.image }, title: function (x) { return x.title },
        sub: function (x) { return [x.badge, x.desc].filter(Boolean).join(' · ') },
        flags: function (x) { return (x.onPrograms !== false ? '<span class="pill plain">Programs page</span>' : '') + (x.onHome ? '<span class="pill plain t-enrollment">Homepage</span>' : '') },
        blank: function () { return { id: uid('p'), title: '', desc: '', badge: '', cat: '', image: '', alt: '', tags: [{ text: 'Age 8+', gold: false }], onPrograms: true, onHome: false, visible: true } },
        fields: function () {
          return [
            { k: 'title', label: 'Program name', max: 80 },
            { k: 'desc', label: 'Short description', type: 'textarea', max: 300, help: 'One or two sentences — it shows under the title on the card.' },
            { k: 'image', label: 'Card photo', type: 'image', maxSide: 1400 },
            { k: 'alt', label: 'Photo description (for screen readers and Google)', ph: 'e.g. Students building a robot arm', max: 200 },
            { k: 'badge', label: 'Badge on the photo', ph: 'e.g. Academics', max: 30 },
            { k: 'cat', label: 'Filter categories', type: 'chips', options: catOptions(), help: 'Which filter buttons on the Programs page show this card.' },
            { k: 'tags', label: 'Tags under the description', type: 'tags' },
            { k: 'onPrograms', label: 'Show on the Programs page', type: 'checkbox', defTrue: true },
            { k: 'onHome', label: 'Show on the homepage', type: 'checkbox' },
          ]
        },
        validate: function (x) { if (!x.title.trim()) return 'Please give the program a name.' },
      })
    })
  }

  VIEWS.projects = function (v) {
    return loadContent().then(function () {
      listEditor(v, {
        name: 'projects', label: 'Student projects', single: 'project',
        help: 'These cards appear in “What our students have actually built” on the homepage and in the Gallery page.',
        thumb: function (x) { return x.image }, title: function (x) { return x.title }, sub: function (x) { return x.desc },
        blank: function () { return { id: uid('j'), title: '', desc: '', image: '', alt: '', visible: true } },
        fields: [
          { k: 'title', label: 'Project name', max: 80 },
          { k: 'desc', label: 'Description', type: 'textarea', max: 300 },
          { k: 'image', label: 'Photo', type: 'image', maxSide: 1400 },
          { k: 'alt', label: 'Photo description', max: 200 },
        ],
        validate: function (x) { if (!x.title.trim()) return 'Please give the project a name.' },
      })
    })
  }

  VIEWS.team = function (v) {
    return loadContent().then(function () {
      listEditor(v, {
        name: 'team', label: 'Team', single: 'team member', round: true,
        help: 'Everyone listed shows on the <b>Our Team</b> page. Tick “Show on homepage” for the few people in the homepage teaser (three looks best).',
        filters: [
          { value: 'all', label: 'Everyone', test: function () { return true } },
          { value: 'h', label: 'On homepage', test: function (x) { return x.onHome } },
        ],
        thumb: function (x) { return x.photo }, title: function (x) { return x.name }, sub: function (x) { return x.role },
        flags: function (x) { return x.onHome ? '<span class="pill plain t-enrollment">Homepage</span>' : '' },
        blank: function () { return { id: uid('m'), name: '', role: '', bio: '', photo: '', onHome: false, visible: true } },
        fields: [
          { k: 'name', label: 'Full name', max: 80 },
          { k: 'role', label: 'Title / role', ph: 'e.g. Head of STEM', max: 80 },
          { k: 'bio', label: 'Short bio', type: 'textarea', max: 600, rows: 5 },
          { k: 'photo', label: 'Photo', type: 'image', round: true, maxSide: 600 },
          { k: 'onHome', label: 'Show on the homepage', type: 'checkbox' },
        ],
        validate: function (x) { if (!x.name.trim()) return 'Please enter a name.' },
      })
    })
  }

  VIEWS.testimonials = function (v) {
    return loadContent().then(function () {
      listEditor(v, {
        name: 'testimonials', label: 'Parent reviews', single: 'review',
        help: 'Only publish reviews that real parents gave you, with their permission.',
        title: function (x) { return x.name }, sub: function (x) { return x.quote },
        flags: function (x) { return '<span class="pill plain">' + '★★★★★'.slice(0, x.stars || 5) + '</span>' },
        blank: function () { return { id: uid('q'), quote: '', name: '', label: 'Parent', initials: '', stars: 5, visible: true } },
        fields: [
          { k: 'quote', label: 'What they said', type: 'textarea', max: 600, rows: 5 },
          { k: 'name', label: 'Name', ph: 'e.g. Mrs. Sadia Rehman', max: 80 },
          { k: 'label', label: 'Shown under the name', ph: 'Parent', max: 40 },
          { k: 'stars', label: 'Stars', type: 'select', numeric: true, options: [5, 4, 3].map(function (n) { return { value: n, label: n + ' stars' } }) },
        ],
        before: function (x) { x.initials = initials(x.name.replace(/^(mr|mrs|ms|dr)\.?\s+/i, '')) },
        validate: function (x) { if (!x.quote.trim() || !x.name.trim()) return 'Please fill in the review and the name.' },
      })
    })
  }

  /* ---------------- gallery ---------------- */
  VIEWS.albums = function (v) {
    return loadContent().then(function () {
      publishNames = ['albums']
      var openAlbum = null
      var render = function () {
        var albums = S.draft.albums
        v.innerHTML = ''
        if (openAlbum && albums.indexOf(openAlbum) < 0) openAlbum = null
        if (!openAlbum) {
          var head = h('<div class="row" style="margin-bottom:14px"><span class="muted" style="font-size:13px">' + metaLine(['albums']) + '</span><span class="grow"></span></div>')
          head.appendChild(resetButton(['albums'], 'Gallery'))
          head.appendChild(button(icon('plus') + ' New album', 'btn-primary btn-sm', function () {
            var a = { id: uid('a'), title: 'New album', eyebrow: '', lead: '', filters: [], photos: [], visible: true }
            albums.unshift(a); openAlbum = a; render(); changed(); editAlbum(a)
          }))
          v.appendChild(head)
          v.appendChild(h('<div class="notice">' + icon('info') + '<div>Each album is one section of the Gallery page, in this order. Open an album to add, caption, sort or hide photos.</div></div>'))
          var list = h('<div class="items"></div>')
          albums.forEach(function (a, i) {
            var cover = (a.photos.filter(function (p) { return p.visible !== false })[0] || {}).image
            var row = h('<div class="item' + (a.visible === false ? ' off' : '') + '"><div class="handle"><button type="button" aria-label="Move up">' + icon('up') + '</button><button type="button" aria-label="Move down">' + icon('down') + '</button></div>' +
              '<img class="thumb" alt="" src="' + esc(imgSrc(cover)) + '"><div class="info"><b>' + esc(a.title) + '</b><small>' + a.photos.length + ' photos' + (a.eyebrow ? ' · ' + esc(a.eyebrow) : '') + '</small></div>' +
              '<div class="flags">' + (a.visible === false ? '<span class="pill">Hidden</span>' : '') + '</div>' +
              '<div class="acts"><button type="button" class="btn btn-ghost btn-icon" title="' + (a.visible === false ? 'Show' : 'Hide') + '">' + icon(a.visible === false ? 'eyeoff' : 'eye') + '</button><button type="button" class="btn btn-dark btn-sm">Open</button><button type="button" class="btn btn-ghost btn-icon" title="Delete album">' + icon('trash') + '</button></div></div>')
            var hb = row.querySelectorAll('.handle button'), ab = row.querySelectorAll('.acts button')
            hb[0].addEventListener('click', function () { if (i > 0) { albums.splice(i - 1, 0, albums.splice(i, 1)[0]); render(); changed() } })
            hb[1].addEventListener('click', function () { if (i < albums.length - 1) { albums.splice(i + 1, 0, albums.splice(i, 1)[0]); render(); changed() } })
            ab[0].addEventListener('click', function () { a.visible = a.visible === false; render(); changed() })
            ab[1].addEventListener('click', function () { openAlbum = a; render(); window.scrollTo(0, 0) })
            ab[2].addEventListener('click', function () { if (confirm('Delete the album “' + a.title + '” and its ' + a.photos.length + ' photos from the Gallery?')) { albums.splice(i, 1); render(); changed() } })
            list.appendChild(row)
          })
          v.appendChild(list)
        } else {
          var a = openAlbum
          var head2 = h('<div class="row" style="margin-bottom:14px"><button class="btn btn-ghost btn-sm back">← All albums</button><h3 style="font-size:17px">' + esc(a.title) + '</h3><span class="muted">' + a.photos.length + ' photos</span><span class="grow"></span><button class="btn btn-ghost btn-sm ed">' + icon('edit') + ' Album details</button><button class="btn btn-primary btn-sm up">' + icon('upload') + ' Add photos</button></div>')
          head2.querySelector('.back').addEventListener('click', function () { openAlbum = null; render() })
          head2.querySelector('.ed').addEventListener('click', function () { editAlbum(a) })
          head2.querySelector('.up').addEventListener('click', function () { pickFiles(true).then(function (fs) { addPhotos(a, fs) }) })
          v.appendChild(head2)
          if (!S.setup.storage) v.appendChild(h('<div class="notice warn">' + icon('info') + '<div>Uploading needs a Vercel Blob store (Vercel → Storage → Create → Blob → connect to this project). You can still reorder, caption and hide existing photos.</div></div>'))
          var grid = h('<div class="photos"></div>')
          var drop = h('<div class="drop" tabindex="0">' + icon('upload', '') + '<br>Drop photos here<br>or click to choose</div>')
          drop.querySelector('svg').style.cssText = 'width:26px;height:26px'
          drop.addEventListener('click', function () { pickFiles(true).then(function (fs) { addPhotos(a, fs) }) })
          drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over') })
          drop.addEventListener('dragleave', function () { drop.classList.remove('over') })
          drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); addPhotos(a, [].slice.call(e.dataTransfer.files)) })
          grid.appendChild(drop)
          var catName = function (k) { var f = a.filters.filter(function (x) { return x.key === k })[0]; return f ? f.label : '' }
          a.photos.forEach(function (p, i) {
            var el = h('<div class="photo' + (p.visible === false ? ' off' : '') + '" tabindex="0" role="button" aria-label="Edit photo"><img loading="lazy" alt="" src="' + esc(imgSrc(p.image)) + '">' +
              (catName(p.cat) ? '<span class="badge">' + esc(catName(p.cat)) + '</span>' : '') +
              '<div class="mv"><button type="button" aria-label="Move earlier">' + icon('up') + '</button><button type="button" aria-label="Move later">' + icon('down') + '</button></div>' +
              '<div class="cap">' + esc(p.caption || p.label || '—') + (p.visible === false ? ' (hidden)' : '') + '</div></div>')
            var mv = el.querySelectorAll('.mv button')
            mv[0].addEventListener('click', function (e) { e.stopPropagation(); if (i > 0) { a.photos.splice(i - 1, 0, a.photos.splice(i, 1)[0]); render(); changed() } })
            mv[1].addEventListener('click', function (e) { e.stopPropagation(); if (i < a.photos.length - 1) { a.photos.splice(i + 1, 0, a.photos.splice(i, 1)[0]); render(); changed() } })
            el.addEventListener('click', function () { editPhoto(a, p) })
            el.addEventListener('keydown', function (e) { if (e.key === 'Enter') editPhoto(a, p) })
            grid.appendChild(el)
          })
          v.appendChild(grid)
        }
        changed()
      }
      var addPhotos = function (a, files) {
        files = files.filter(function (f) { return /^image\//.test(f.type) })
        if (!files.length) return
        var done = 0
        toast('Uploading ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…')
        files.reduce(function (p, f) {
          return p.then(function () {
            return uploadFile(f, 1800).then(function (u) {
              a.photos.unshift({ image: u, full: u, alt: '', cat: a.filters[0] ? a.filters[0].key : '', label: '', caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), size: 'normal', visible: true })
              done++; render(); changed()
            })
          })
        }, Promise.resolve()).then(function () { toast(done + ' uploaded — add captions, then publish', 'good') })
          .catch(function (e) { toast(e.message, 'bad') })
      }
      var editAlbum = function (a) {
        var work = clone(a)
        var body = form(work, [
          { k: 'title', label: 'Album title', max: 80 },
          { k: 'eyebrow', label: 'Small label above the title', ph: 'e.g. Community Event', max: 40 },
          { k: 'lead', label: 'Intro sentence', type: 'textarea', max: 400 },
        ])
        var fl = h('<div><span style="display:block;font-weight:700;font-size:12.5px;color:var(--ink-2);margin-bottom:6px">Filter buttons</span><small class="faint" style="display:block;margin-bottom:8px">Optional groups inside the album (e.g. “Forest Hall”, “Pool Time”). Shown only when 2 or more are used.</small><div class="fl"></div><button type="button" class="btn btn-ghost btn-sm">' + icon('plus') + ' Add filter</button></div>')
        var drawF = function () {
          var box = fl.querySelector('.fl'); box.innerHTML = ''
          work.filters.forEach(function (f, i) {
            var r = h('<div class="tag-row"><input class="input" placeholder="Button label"><button type="button" class="btn btn-ghost btn-icon" aria-label="Remove">' + icon('trash') + '</button></div>')
            r.querySelector('input').value = f.label
            r.querySelector('input').addEventListener('input', function (e) { f.label = e.target.value })
            r.querySelector('button').addEventListener('click', function () { work.filters.splice(i, 1); drawF() })
            box.appendChild(r)
          })
        }
        drawF()
        fl.querySelector('button.btn-ghost.btn-sm').addEventListener('click', function () { work.filters.push({ key: uid('f'), label: '' }); drawF() })
        body.appendChild(fl)
        drawer('Album details', body, [button('Cancel', 'btn-ghost', closeDrawer), button('Done', 'btn-dark', function () {
          work.filters = work.filters.filter(function (f) { return f.label.trim() })
          Object.assign(a, work); closeDrawer(); render(); changed()
        })])
      }
      var editPhoto = function (a, p) {
        var work = clone(p)
        var fields = [
          { k: 'image', label: 'Photo', type: 'image', maxSide: 1800, alsoSet: ['full'] },
          { k: 'caption', label: 'Caption', max: 120 },
          { k: 'label', label: 'Small label above the caption', ph: 'e.g. Forest Hall', max: 40 },
          { k: 'alt', label: 'Photo description (for screen readers and Google)', max: 200 },
          { k: 'size', label: 'Tile size', type: 'select', options: [{ value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }, { value: 'tall', label: 'Tall' }, { value: 'big', label: 'Big (2×2) — use for a highlight' }] },
        ]
        if (a.filters.length) fields.push({ k: 'cat', label: 'Filter group', type: 'select', options: [{ value: '', label: '— none —' }].concat(a.filters.map(function (f) { return { value: f.key, label: f.label } })) })
        fields.push({ k: 'visible', label: 'Show on the website', type: 'checkbox', defTrue: true })
        var body = form(work, fields)
        drawer('Edit photo', body, [
          button(icon('trash') + ' Remove', 'btn-danger', function () { if (confirm('Remove this photo from the album?')) { a.photos.splice(a.photos.indexOf(p), 1); closeDrawer(); render(); changed() } }),
          button('Cancel', 'btn-ghost', closeDrawer),
          button('Done', 'btn-dark', function () { work.lbcap = ''; if (work.image && !work.full) work.full = work.image; Object.assign(p, work); closeDrawer(); render(); changed() }),
        ])
      }
      onRerender = render
      render()
    })
  }

  /* ---------------- pages & contact ---------------- */
  VIEWS.texts = function (v) {
    return loadContent().then(function () {
      publishNames = ['texts', 'settings']
      var render = function () {
        v.innerHTML = ''
        var head = h('<div class="row" style="margin-bottom:14px"><span class="muted" style="font-size:13px">' + metaLine(['texts', 'settings']) + '</span><span class="grow"></span></div>')
        head.appendChild(resetButton(['texts', 'settings'], 'Pages & contact'))
        v.appendChild(head)
        var grid = h('<div class="grid g2"></div>')
        var c = h('<div class="card"><div class="card-h"><h3>Contact details</h3></div><div class="card-b"></div></div>')
        c.querySelector('.card-b').appendChild(form(S.draft.settings, [
          { k: 'phone', label: 'Phone number', ph: '+971 58 512 0895', help: 'Updates every “call us” link on the website.' },
          { k: 'whatsapp', label: 'WhatsApp number (digits only, with country code)', ph: '971585120895' },
          { k: 'email', label: 'Main email', ph: 'info@youngleadershub.co' },
        ], changed))
        grid.appendChild(c)
        var hero = h('<div class="card"><div class="card-h"><h3>Homepage hero</h3></div><div class="card-b"></div></div>')
        var T = S.draft.texts
        hero.querySelector('.card-b').appendChild(form(T['index.html'], [
          { k: 'badge', label: 'Small badge above the headline', max: 120, help: 'Text before “ — ” is shown in bold.' },
          { k: 'title', label: 'Headline (line 1)', max: 60 },
          { k: 'accent', label: 'Headline (line 2, orange)', max: 60 },
          { k: 'lead', label: 'Intro paragraph', type: 'textarea', max: 400 },
        ], changed))
        grid.appendChild(hero)
        v.appendChild(grid)
        v.appendChild(h('<h3 class="mt2" style="font-size:15px;margin-bottom:10px">Page headings</h3>'))
        var g2 = h('<div class="grid g2"></div>')
        Object.keys(T).filter(function (k) { return k !== 'index.html' }).forEach(function (pg) {
          var card = h('<div class="card"><div class="card-h"><h3>' + esc(PAGE_NAMES[pg] || pg) + '</h3><span class="grow"></span><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + pg + '">View ↗</a></div><div class="card-b"></div></div>')
          card.querySelector('.card-b').appendChild(form(T[pg], [{ k: 'title', label: 'Heading', max: 120 }, { k: 'lead', label: 'Intro text', type: 'textarea', max: 400 }], changed))
          g2.appendChild(card)
        })
        v.appendChild(g2)
        changed()
      }
      onRerender = render
      render()
    })
  }

  /* ---------------- banner ---------------- */
  VIEWS.banner = function (v) {
    return loadContent().then(function () {
      publishNames = ['banner']
      var B = S.draft.banner
      var COL = { orange: ['#f0871e', '#fff'], navy: ['#151D5C', '#fff'], green: ['#16855b', '#fff'], gold: ['#fff1e6', '#7a3d00'] }
      var render = function () {
        B = S.draft.banner
        v.innerHTML = ''
        var head = h('<div class="row" style="margin-bottom:14px"><span class="muted" style="font-size:13px">' + metaLine(['banner']) + '</span><span class="grow"></span></div>')
        v.appendChild(head)
        var prev = h('<div class="card"><div class="card-h"><h3>Preview</h3><span class="grow"></span><span class="pill status"></span></div><div class="card-b"><div class="banner-prev"></div></div></div>')
        var paint = function () {
          var c = COL[B.style] || COL.orange, p = prev.querySelector('.banner-prev')
          p.style.background = c[0]; p.style.color = c[1]
          p.innerHTML = esc(B.message || 'Your announcement text…') + (B.linkText && B.linkUrl ? '<a>' + esc(B.linkText) + '</a>' : '') + (B.dismissible !== false ? '<span class="close">×</span>' : '')
          var now = new Date().toISOString().slice(0, 10)
          var live = B.enabled && B.message && (!B.start || B.start <= now) && (!B.end || B.end >= now)
          var st = prev.querySelector('.status')
          st.className = 'pill status ' + (live ? 's-enrolled' : 's-closed')
          st.textContent = live ? 'Showing on the website' : (B.enabled && B.start > now ? 'Scheduled' : B.enabled && B.end && B.end < now ? 'Ended' : 'Off')
          changed()
        }
        var sw = h('<div class="card mt"><div class="card-b"><label class="switch"><input type="checkbox"><i></i> Show the announcement bar</label></div></div>')
        var cb = sw.querySelector('input'); cb.checked = Boolean(B.enabled)
        cb.addEventListener('change', function () { B.enabled = cb.checked; paint() })
        var fc = h('<div class="card mt"><div class="card-b"></div></div>')
        fc.querySelector('.card-b').appendChild(form(B, [
          { k: 'message', label: 'Message', max: 160, ph: 'e.g. Winter Camp 2026 registrations are open — limited seats' },
          { k: 'linkText', label: 'Button text (optional)', max: 40, ph: 'Register now' },
          { k: 'linkUrl', label: 'Button link', ph: 'enrollment.html  or  https://…', help: 'A page on this site (like enrollment.html) or a full web address.' },
          { k: 'style', label: 'Colour', type: 'select', options: [{ value: 'orange', label: 'Orange (brand)' }, { value: 'navy', label: 'Navy' }, { value: 'green', label: 'Green' }, { value: 'gold', label: 'Soft cream' }] },
          { k: 'start', label: 'Start showing on (optional)', type: 'date' },
          { k: 'end', label: 'Stop showing after (optional)', type: 'date' },
          { k: 'dismissible', label: 'Visitors can close it', type: 'checkbox', defTrue: true },
        ], paint))
        v.appendChild(prev); v.appendChild(sw); v.appendChild(fc)
        paint()
      }
      onRerender = render
      render()
    })
  }

  /* ---------------- users ---------------- */
  VIEWS.users = function (v) {
    $('#topActions').appendChild(button(icon('plus') + ' Add staff member', 'btn-primary btn-sm', function () { editUser(null) }))
    var load = function () {
      return api('GET', 'admin/users').then(function (d) {
        v.innerHTML = ''
        var card = h('<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Name</th><th>Role</th><th class="hide-sm">Last sign-in</th><th>Status</th><th></th></tr></thead><tbody></tbody></table></div></div>')
        card.querySelector('tbody').innerHTML = d.users.map(function (u) {
          return '<tr><td><div class="row" style="flex-wrap:nowrap"><div class="avatar-sm">' + esc(initials(u.name)) + '</div><div><span class="name">' + esc(u.name) + '</span>' + (u.username === S.me.username ? ' <span class="faint">(you)</span>' : '') + '<div class="faint" style="font-size:12px">@' + esc(u.username) + '</div></div></div></td>' +
            '<td>' + esc(u.roleLabel) + '</td><td class="hide-sm">' + (u.lastLogin ? ago(u.lastLogin) : '<span class="faint">never</span>') + '</td>' +
            '<td>' + (u.disabled ? '<span class="pill s-closed">Disabled</span>' : '<span class="pill s-enrolled">Active</span>') + '</td>' +
            '<td style="text-align:right">' + (u.username !== S.me.username && (u.role !== 'owner' || can('users.owner')) ? '<button class="btn btn-ghost btn-sm" data-u="' + esc(u.username) + '">Manage</button>' : '') + '</td></tr>'
        }).join('')
        $$('button[data-u]', card).forEach(function (b) { b.addEventListener('click', function () { editUser(d.users.filter(function (u) { return u.username === b.dataset.u })[0]) }) })
        v.appendChild(card)
        var keys = [['dashboard', 'Dashboard & analytics'], ['enquiries.read', 'See enquiries'], ['enquiries.write', 'Update status & notes'], ['enquiries.delete', 'Delete enquiries'], ['content', 'Edit website content'], ['banner', 'Announcement bar'], ['users', 'Manage staff'], ['activity', 'Activity log']]
        var roles = Object.keys(S.roles)
        v.appendChild(h('<div class="card mt"><div class="card-h"><h3>What each role can do</h3></div><div class="card-b table-wrap"><table class="t perm-table"><thead><tr><th>Permission</th>' + roles.map(function (r) { return '<th>' + esc(S.roles[r].label) + '</th>' }).join('') + '</tr></thead><tbody>' +
          keys.map(function (k) { return '<tr><td>' + k[1] + '</td>' + roles.map(function (r) { return S.roles[r].perms.indexOf(k[0]) > -1 ? '<td class="yes" aria-label="yes">✓</td>' : '<td class="no" aria-label="no">—</td>' }).join('') + '</tr>' }).join('') +
          '</tbody></table><p class="muted" style="font-size:12.5px;margin:12px 0 0">' + roles.map(function (r) { return '<b>' + esc(S.roles[r].label) + ':</b> ' + esc(S.roles[r].desc) }).join('<br>') + '</p></div></div>'))
      })
    }
    var editUser = function (u) {
      var isNew = !u
      var work = isNew ? { username: '', name: '', role: 'admissions', password: genPw() } : { name: u.name, role: u.role, password: '' }
      var roleOpts = Object.keys(S.roles).filter(function (r) { return r !== 'owner' || can('users.owner') }).map(function (r) { return { value: r, label: S.roles[r].label + ' — ' + S.roles[r].desc } })
      var fields = []
      if (isNew) fields.push({ k: 'username', label: 'Username (for signing in)', ph: 'e.g. sara', help: 'Lowercase letters, numbers, dot, dash or underscore.' })
      fields.push({ k: 'name', label: 'Full name', ph: 'e.g. Sara Ahmed' }, { k: 'role', label: 'Role', type: 'select', options: roleOpts })
      fields.push({ k: 'password', label: isNew ? 'Temporary password' : 'Reset password (leave empty to keep)', help: isNew ? 'Share it privately — they will be asked to choose their own on first sign-in.' : 'They will be signed out and asked to choose a new password.' })
      var body = form(work, fields)
      var foot = [button('Cancel', 'btn-ghost', closeDrawer)]
      if (!isNew) {
        foot.unshift(button(u.disabled ? 'Enable' : 'Disable', 'btn-ghost', function () {
          api('PATCH', 'admin/users/' + u.username, { disabled: !u.disabled }).then(function () { closeDrawer(); load(); toast(u.disabled ? 'Account enabled' : 'Account disabled — signed out everywhere') }).catch(function (e) { toast(e.message, 'bad') })
        }))
        foot.unshift(button(icon('trash'), 'btn-danger btn-icon', function () {
          if (!confirm('Remove ' + u.name + '? They will no longer be able to sign in.')) return
          api('DELETE', 'admin/users/' + u.username).then(function () { closeDrawer(); load(); toast('Removed') }).catch(function (e) { toast(e.message, 'bad') })
        }))
      }
      foot.push(button(isNew ? 'Add staff member' : 'Save', 'btn-dark', function () {
        var p = isNew ? api('POST', 'admin/users', work) : api('PATCH', 'admin/users/' + u.username, { name: work.name, role: work.role, password: work.password || undefined })
        p.then(function () {
          closeDrawer(); load()
          toast(isNew ? 'Added. Username: ' + work.username + ' — share the temporary password privately.' : 'Saved', 'good')
        }).catch(function (e) { toast(e.message, 'bad') })
      }))
      drawer(isNew ? 'Add staff member' : 'Manage ' + u.name, body, foot)
    }
    return load()
  }
  function genPw() {
    var a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = ''
    var r = new Uint32Array(12); crypto.getRandomValues(r)
    for (var i = 0; i < 12; i++) out += a[r[i] % a.length]
    return out
  }

  /* ---------------- activity ---------------- */
  VIEWS.activity = function (v) {
    return api('GET', 'admin/activity').then(function (d) {
      v.innerHTML = '<div class="card"><div class="card-b">' + (d.items.length ? d.items.map(function (x) {
        return '<div class="log-item"><div class="when" title="' + esc(fmtDate(x.t, true)) + '">' + ago(x.t) + '</div><div><b>@' + esc(x.user) + '</b> ' + esc(x.action) + (x.detail ? '<div class="muted" style="font-size:12.5px">' + esc(x.detail) + '</div>' : '') + '</div></div>'
      }).join('') : '<div class="empty">Nothing yet.</div>') + '</div></div>'
    })
  }

  /* ---------------- account ---------------- */
  VIEWS.account = function (v) {
    v.innerHTML = ''
    var c = h('<div class="card" style="max-width:520px"><div class="card-h"><h3>Change password</h3></div><div class="card-b"><form autocomplete="on">' +
      '<input type="hidden" name="username" autocomplete="username" value="' + esc(S.me.username) + '">' +
      '<label class="f"><span>Current password</span><input class="input" type="password" name="current" autocomplete="current-password" required></label>' +
      '<label class="f"><span>New password</span><input class="input" type="password" name="next" autocomplete="new-password" minlength="8" required><small>At least 8 characters. A short sentence is easy to remember and hard to guess.</small></label>' +
      '<label class="f"><span>Repeat new password</span><input class="input" type="password" name="again" autocomplete="new-password" required></label>' +
      '<button class="btn btn-dark" type="submit">Update password</button></form></div></div>')
    c.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault()
      var f = e.target
      if (f.next.value !== f.again.value) return toast('The two new passwords do not match.', 'bad')
      api('POST', 'admin/password', { current: f.current.value, next: f.next.value }).then(function () { f.reset(); toast('Password updated', 'good') }).catch(function (err) { toast(err.message, 'bad') })
    })
    v.appendChild(h('<div class="card" style="max-width:520px;margin-bottom:16px"><div class="card-b"><div class="row"><div class="avatar-sm" style="width:46px;height:46px;font-size:16px">' + esc(initials(S.me.name)) + '</div><div><b style="font-size:16px">' + esc(S.me.name) + '</b><div class="muted">@' + esc(S.me.username) + ' · ' + esc(S.me.roleLabel) + '</div></div></div></div></div>'))
    v.appendChild(c)
  }

  /* =============================================================== go */
  boot()
})()
