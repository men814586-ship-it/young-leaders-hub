// Young Leaders Hub — single API function for the website and the admin panel.
// vercel.json rewrites every /api/* request here (as ?__path=...), so the whole
// backend counts as one Vercel Function.
const crypto = require('crypto')
const { r, pipe, pairs, json, configured } = require('./_lib/redis')
const A = require('./_lib/auth')

const COLLECTIONS = ['programs', 'projects', 'team', 'testimonials', 'albums', 'texts', 'settings', 'banner']
const BANNER_ONLY = ['banner']
const STATUSES = ['new', 'contacted', 'visit', 'enrolled', 'closed']
const PAGES = ['index.html', 'about.html', 'programs.html', 'teaching-model.html', 'campus.html', 'team.html',
  'gallery.html', 'videos.html', 'contact.html', 'enrollment.html']

/* ------------------------------------------------------------ helpers */
function send(res, status, body, headers = {}) {
  res.statusCode = status
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store')
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}
function fail(status, message) { const e = new Error(message); e.status = status; return e }

async function readBody(req, limit = 6 * 1024 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return json.parse(req.body, {}) || {}
    if (Buffer.isBuffer(req.body)) return json.parse(req.body.toString(), {}) || {}
    return req.body
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = []
    req.on('data', c => { size += c.length; if (size > limit) { reject(fail(413, 'Request too large')); req.destroy() } else chunks.push(c) })
    req.on('end', () => resolve(json.parse(Buffer.concat(chunks).toString() || '{}', {}) || {}))
    req.on('error', reject)
  })
}

function clean(v, max = 500) {
  if (v === undefined || v === null) return ''
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
function ipOf(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
}
function today(offsetDays = 0) {
  // Dubai time (UTC+4, no DST) so "today" matches the school's day.
  return new Date(Date.now() + 4 * 3600e3 - offsetDays * 86400e3).toISOString().slice(0, 10)
}
async function rateLimit(key, max, windowSec) {
  const [n] = await pipe([['INCR', 'ylh:rl:' + key], ['EXPIRE', 'ylh:rl:' + key, windowSec, 'NX']])
  return n <= max
}
async function log(user, action, detail = '') {
  const entry = JSON.stringify({ t: new Date().toISOString(), user: user ? user.username : 'system', action, detail: clean(detail, 300) })
  await pipe([['LPUSH', 'ylh:log', entry], ['LTRIM', 'ylh:log', 0, 999]])
}

// Strings are clipped, depth/size bounded, URLs restricted to safe schemes.
function sanitize(v, depth = 0) {
  if (depth > 6) return null
  if (Array.isArray(v)) return v.slice(0, 600).map(x => sanitize(x, depth + 1))
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, x] of Object.entries(v).slice(0, 60)) {
      if (!/^[a-zA-Z0-9_.-]{1,40}$/.test(k)) continue
      o[k] = sanitize(x, depth + 1)
      if (typeof o[k] === 'string' && /^(image|full|photo|fallback|linkUrl|url)$/.test(k) && o[k] && !safeUrl(o[k])) o[k] = ''
    }
    return o
  }
  if (typeof v === 'string') return clean(v, 6000)
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'boolean') return v
  return null
}
function safeUrl(u) {
  return /^(https:\/\/|http:\/\/|\/|assets\/|[a-z0-9-]+\.html|#|mailto:|tel:)/i.test(u) && !/^\s*javascript:/i.test(u)
}

/* ------------------------------------------------------------ public routes */
async function submitEnquiry(req, res) {
  const ip = ipOf(req)
  if (!(await rateLimit('submit:' + ip, 8, 600))) return send(res, 429, { error: 'Too many submissions. Please try again later.' })
  const b = await readBody(req, 64 * 1024)
  if (clean(b.website, 100)) return send(res, 200, { ok: true }) // honeypot

  const type = ['contact', 'feedback'].includes(b.type) ? b.type : 'enrollment'
  const rating = Number(b.rating)
  const rec = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    type, status: 'new', notes: [],
    name: clean(b.name || b.fname || b.pname, 120),
    childName: clean(b.childName || b.sname || b.cname, 120),
    childAge: clean(b.childAge || b.sage || b.age, 10),
    email: clean(b.email, 160),
    phone: clean(b.phone || b.fphone, 40),
    program: clean(b.program, 120),
    slot: clean(b.slot, 60),
    subject: clean(b.subject, 120),
    reference: clean(b.reference, 160),
    message: clean(b.message || b.msg, 4000),
    source: clean(b.source, 120),
    rating: type === 'feedback' && rating >= 1 && rating <= 5 ? rating : null,
  }
  const errors = []
  if (!rec.name) errors.push('Name is required')
  if (!isEmail(rec.email)) errors.push('A valid email address is required')
  if (type === 'enrollment') {
    if (!rec.childName) errors.push("Student's name is required")
    if (!rec.phone) errors.push('Phone number is required')
  }
  if (type === 'feedback') {
    if (!rec.message) errors.push('Please tell us a bit about your experience')
    if (!rec.rating) errors.push('Please choose a star rating')
  }
  if (errors.length) return send(res, 400, { error: errors.join('. ') })

  await pipe([
    ['HSET', 'ylh:enq', rec.id, JSON.stringify(rec)],
    ['ZADD', 'ylh:enq:ids', Date.now(), rec.id],
  ])
  return send(res, 201, { ok: true, id: rec.id })
}

async function loadContent() {
  const vals = await pipe(COLLECTIONS.map(c => ['GET', 'ylh:content:' + c]))
  const out = {}
  COLLECTIONS.forEach((c, i) => { if (vals[i]) out[c] = json.parse(vals[i]) })
  return out
}

async function publicContent(req, res, asScript) {
  let data = {}
  try { if (configured()) data = await loadContent() } catch (e) { data = {} }
  // hide anything switched off before it leaves the server
  for (const k of ['programs', 'projects', 'team', 'testimonials', 'albums']) {
    if (Array.isArray(data[k])) data[k] = data[k].filter(x => x && x.visible !== false)
  }
  if (Array.isArray(data.albums)) data.albums.forEach(a => { a.photos = (a.photos || []).filter(p => p && p.visible !== false) })
  const cache = 'public, max-age=0, s-maxage=20, stale-while-revalidate=300'
  if (asScript) {
    const body = 'window.YLH_CMS=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';'
    return send(res, 200, body, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': cache })
  }
  return send(res, 200, data, { 'Cache-Control': cache })
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime/i
async function track(req, res) {
  const ua = String(req.headers['user-agent'] || '')
  if (BOT.test(ua) || !configured()) return send(res, 204, '')
  const b = await readBody(req, 4096)
  let page = clean(b.p, 80).split('?')[0].split('#')[0].replace(/^\//, '') || 'index.html'
  if (!page.endsWith('.html')) page = page.replace(/\/$/, '') + '.html'
  if (page === '.html') page = 'index.html'
  if (!PAGES.includes(page)) return send(res, 204, '')
  const d = today()
  const w = Number(b.w) || 0
  const device = w && w < 768 ? 'mobile' : w && w < 1100 ? 'tablet' : 'desktop'
  let ref = ''
  try {
    const host = new URL(clean(b.r, 300)).hostname.replace(/^www\./, '')
    const self = String(req.headers.host || '').replace(/^www\./, '')
    if (host && host !== self && !host.endsWith('.vercel.app')) ref = host.slice(0, 60)
  } catch { /* no referrer */ }
  const visitor = crypto.createHash('sha256').update(ipOf(req) + '|' + ua + '|' + d).digest('hex').slice(0, 20)
  const ttl = 400 * 86400
  const cmds = [
    ['HINCRBY', 'ylh:pv:' + d, page, 1], ['EXPIRE', 'ylh:pv:' + d, ttl],
    ['INCR', 'ylh:pvt:' + d], ['EXPIRE', 'ylh:pvt:' + d, ttl],
    ['PFADD', 'ylh:uv:' + d, visitor], ['EXPIRE', 'ylh:uv:' + d, ttl],
    ['HINCRBY', 'ylh:dev:' + d, device, 1], ['EXPIRE', 'ylh:dev:' + d, ttl],
  ]
  if (ref) cmds.push(['HINCRBY', 'ylh:ref:' + d, ref, 1], ['EXPIRE', 'ylh:ref:' + d, ttl])
  await pipe(cmds)
  return send(res, 204, '')
}

/* ------------------------------------------------------------ admin: auth */
async function login(req, res) {
  const ip = ipOf(req)
  const b = await readBody(req, 4096)
  const username = clean(b.username, 40).toLowerCase()
  const password = String(b.password || '').slice(0, 200)
  if (!(await rateLimit('login:' + ip, 8, 600)) || !(await rateLimit('login-u:' + username, 10, 600))) {
    return send(res, 429, { error: 'Too many attempts. Wait 10 minutes and try again.' })
  }
  let user = await A.getUser(username)

  // First run: no accounts yet -> the owner signs in as "admin" with ADMIN_PASSWORD.
  if (!user && username === 'admin') {
    const count = await r('HLEN', 'ylh:users')
    const envPw = process.env.ADMIN_PASSWORD || ''
    if (!count && envPw.length >= 8 && A.safeEqual(password, envPw)) {
      const { salt, hash } = A.hashPassword(password)
      user = { username: 'admin', name: 'Administrator', role: 'owner', salt, hash, tokenVersion: 0, createdAt: new Date().toISOString(), mustChange: true }
      await A.saveUser(user)
      await log(user, 'Created the first owner account')
    } else if (!count && envPw.length < 8) {
      return send(res, 503, { error: 'Admin panel is not set up yet: add an ADMIN_PASSWORD (8+ characters) environment variable in Vercel and redeploy.' })
    }
  }
  if (!user || user.disabled || !A.checkPassword(password, user.salt, user.hash)) {
    return send(res, 401, { error: 'Wrong username or password.' })
  }
  user.lastLogin = new Date().toISOString()
  await A.saveUser(user)
  await log(user, 'Signed in')
  return send(res, 200, { ok: true, user: A.publicUser(user), mustChange: Boolean(user.mustChange) }, { 'Set-Cookie': A.sessionCookie(req, user) })
}

async function session(req, res) {
  const setup = {
    database: configured(),
    storage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
  }
  let user = null
  if (setup.database) { try { user = await A.currentUser(req) } catch { user = null } }
  return send(res, 200, {
    signedIn: Boolean(user), user: user ? A.publicUser(user) : null, mustChange: Boolean(user && user.mustChange), setup,
    roles: Object.fromEntries(Object.entries(A.ROLES).map(([k, v]) => [k, { label: v.label, desc: v.desc, perms: v.perms }])),
  })
}

async function changePassword(req, res, me) {
  const b = await readBody(req, 4096)
  if (!A.checkPassword(String(b.current || ''), me.salt, me.hash)) throw fail(400, 'Your current password is not correct.')
  const next = String(b.next || '')
  if (next.length < 8) throw fail(400, 'Use at least 8 characters for the new password.')
  Object.assign(me, A.hashPassword(next))
  me.tokenVersion = (me.tokenVersion || 0) + 1
  me.mustChange = false
  await A.saveUser(me)
  await log(me, 'Changed own password')
  return send(res, 200, { ok: true }, { 'Set-Cookie': A.sessionCookie(req, me) })
}

/* ------------------------------------------------------------ admin: enquiries */
async function allEnquiries() {
  const h = pairs(await r('HGETALL', 'ylh:enq'))
  return Object.values(h).map(v => json.parse(v)).filter(Boolean)
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
}

async function patchEnquiry(req, res, me, id) {
  const rec = json.parse(await r('HGET', 'ylh:enq', id))
  if (!rec) throw fail(404, 'Enquiry not found')
  const b = await readBody(req, 16 * 1024)
  const changes = []
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw fail(400, 'Unknown status')
    if (b.status !== rec.status) { changes.push(`status ${rec.status} → ${b.status}`); rec.status = b.status }
  }
  if (b.note) {
    rec.notes = rec.notes || []
    rec.notes.push({ t: new Date().toISOString(), by: me.name || me.username, text: clean(b.note, 2000) })
    changes.push('added a note')
  }
  if (b.assignee !== undefined) { rec.assignee = clean(b.assignee, 60); changes.push('assigned to ' + (rec.assignee || 'nobody')) }
  rec.updatedAt = new Date().toISOString()
  await r('HSET', 'ylh:enq', id, JSON.stringify(rec))
  if (changes.length) await log(me, 'Updated enquiry', `${rec.name}: ${changes.join(', ')}`)
  return send(res, 200, { ok: true, enquiry: rec })
}

function csvCell(v) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@]/.test(s)) s = "'" + s // spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"'
}
async function exportCsv(res) {
  const list = await allEnquiries()
  const cols = ['receivedAt', 'type', 'status', 'name', 'email', 'phone', 'childName', 'childAge', 'program', 'subject', 'reference', 'rating', 'message', 'source', 'assignee']
  const rows = [cols.join(',')].concat(list.map(e => cols.map(c => csvCell(e[c])).concat(csvCell((e.notes || []).map(n => n.by + ': ' + n.text).join(' | '))).join(',')))
  rows[0] += ',notes'
  return send(res, 200, '﻿' + rows.join('\r\n'), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="ylh-enquiries-${today()}.csv"`,
  })
}

/* ------------------------------------------------------------ admin: stats */
async function stats(req, res, me, url) {
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days')) || 30))
  const dates = Array.from({ length: days }, (_, i) => today(days - 1 - i))
  const cmds = []
  dates.forEach(d => cmds.push(['GET', 'ylh:pvt:' + d], ['PFCOUNT', 'ylh:uv:' + d], ['HGETALL', 'ylh:pv:' + d], ['HGETALL', 'ylh:dev:' + d], ['HGETALL', 'ylh:ref:' + d]))
  const out = await pipe(cmds)
  const series = [], pages = {}, devices = {}, refs = {}
  dates.forEach((d, i) => {
    const [pv, uv, pg, dev, ref] = out.slice(i * 5, i * 5 + 5)
    series.push({ date: d, views: Number(pv) || 0, visitors: Number(uv) || 0 })
    for (const [k, v] of Object.entries(pairs(pg))) pages[k] = (pages[k] || 0) + Number(v)
    for (const [k, v] of Object.entries(pairs(dev))) devices[k] = (devices[k] || 0) + Number(v)
    for (const [k, v] of Object.entries(pairs(ref))) refs[k] = (refs[k] || 0) + Number(v)
  })
  const body = {
    days, series,
    pages: Object.entries(pages).sort((a, b) => b[1] - a[1]),
    devices, referrers: Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 10),
  }
  if (A.can(me, 'enquiries.read')) {
    const list = await allEnquiries()
    const from = dates[0]
    const byDay = Object.fromEntries(dates.map(d => [d, 0]))
    const byType = {}, byStatus = {}
    list.forEach(e => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1
      const d = new Date(new Date(e.receivedAt).getTime() + 4 * 3600e3).toISOString().slice(0, 10)
      if (d >= from) { if (d in byDay) byDay[d]++; byType[e.type] = (byType[e.type] || 0) + 1 }
    })
    body.enquiries = {
      total: list.length, inRange: Object.values(byDay).reduce((a, b) => a + b, 0),
      newCount: byStatus.new || 0, byDay, byType, byStatus,
      recent: list.slice(0, 6).map(e => ({ id: e.id, name: e.name, type: e.type, status: e.status, receivedAt: e.receivedAt, childName: e.childName })),
    }
  }
  return send(res, 200, body)
}

/* ------------------------------------------------------------ admin: content */
async function getContent(res) {
  const data = await loadContent()
  const meta = json.parse(await r('GET', 'ylh:content:meta'), {}) || {}
  return send(res, 200, { data, meta })
}
async function putContent(req, res, me, name) {
  if (!COLLECTIONS.includes(name)) throw fail(404, 'Unknown section')
  if (!A.can(me, BANNER_ONLY.includes(name) ? 'banner' : 'content')) throw fail(403, 'Your role cannot edit this section.')
  const b = await readBody(req, 2 * 1024 * 1024)
  const data = sanitize(b.data)
  if (data === null || data === undefined) throw fail(400, 'Nothing to save')
  const meta = json.parse(await r('GET', 'ylh:content:meta'), {}) || {}
  meta[name] = { at: new Date().toISOString(), by: me.name || me.username }
  await pipe([['SET', 'ylh:content:' + name, JSON.stringify(data)], ['SET', 'ylh:content:meta', JSON.stringify(meta)]])
  await log(me, 'Published ' + name, b.summary || '')
  return send(res, 200, { ok: true, meta: meta[name] })
}
async function resetContent(res, me, name) {
  if (!COLLECTIONS.includes(name)) throw fail(404, 'Unknown section')
  if (!A.can(me, BANNER_ONLY.includes(name) ? 'banner' : 'content')) throw fail(403, 'Your role cannot edit this section.')
  const meta = json.parse(await r('GET', 'ylh:content:meta'), {}) || {}
  delete meta[name]
  await pipe([['DEL', 'ylh:content:' + name], ['SET', 'ylh:content:meta', JSON.stringify(meta)]])
  await log(me, 'Reset ' + name + ' to the original website content')
  return send(res, 200, { ok: true })
}

async function upload(req, res, me) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw fail(503, 'Photo storage is not connected. In Vercel open Storage, create a Blob store and connect it to this project.')
  const b = await readBody(req, 6 * 1024 * 1024)
  const m = /^data:(image\/(jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.dataUrl || ''))
  if (!m) throw fail(400, 'Please upload a JPG, PNG, WEBP or GIF image.')
  const buf = Buffer.from(m[3], 'base64')
  if (buf.length > 4.2 * 1024 * 1024) throw fail(413, 'That image is too large (max 4 MB after compression).')
  const base = clean(b.name, 80).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo'
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2]
  const { put } = require('@vercel/blob')
  const blob = await put(`ylh/${base}.${ext}`, buf, { access: 'public', contentType: m[1], addRandomSuffix: true })
  await log(me, 'Uploaded a photo', base + '.' + ext)
  return send(res, 201, { ok: true, url: blob.url })
}

/* ------------------------------------------------------------ admin: users */
async function listUsers(res) {
  const h = pairs(await r('HGETALL', 'ylh:users'))
  const users = Object.values(h).map(v => json.parse(v)).filter(Boolean).map(A.publicUser)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
  return send(res, 200, { users })
}
function assertCanManage(me, targetRole) {
  if (!A.ROLES[targetRole]) throw fail(400, 'Unknown role')
  if (targetRole === 'owner' && !A.can(me, 'users.owner')) throw fail(403, 'Only an Owner can create or change Owner accounts.')
}
async function createUser(req, res, me) {
  const b = await readBody(req, 8 * 1024)
  const username = clean(b.username, 32).toLowerCase()
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw fail(400, 'Username: 3–32 letters, numbers, dot, dash or underscore.')
  assertCanManage(me, b.role)
  if (await A.getUser(username)) throw fail(409, 'That username is already taken.')
  if (String(b.password || '').length < 8) throw fail(400, 'Temporary password must be at least 8 characters.')
  const u = { username, name: clean(b.name, 80) || username, role: b.role, ...A.hashPassword(b.password), tokenVersion: 0, createdAt: new Date().toISOString(), mustChange: true }
  await A.saveUser(u)
  await log(me, 'Added team member', `${u.name} (${A.ROLES[u.role].label})`)
  return send(res, 201, { ok: true, user: A.publicUser(u) })
}
async function updateUser(req, res, me, username) {
  const u = await A.getUser(username)
  if (!u) throw fail(404, 'User not found')
  assertCanManage(me, u.role)
  const b = await readBody(req, 8 * 1024)
  const changes = []
  if (b.role !== undefined && b.role !== u.role) {
    assertCanManage(me, b.role)
    if (u.username === me.username) throw fail(400, 'You cannot change your own role.')
    if (u.role === 'owner' && (await ownerCount()) <= 1) throw fail(400, 'Keep at least one Owner.')
    changes.push(`role → ${A.ROLES[b.role].label}`); u.role = b.role; u.tokenVersion = (u.tokenVersion || 0) + 1
  }
  if (b.name !== undefined) { u.name = clean(b.name, 80) || u.username; changes.push('name') }
  if (b.disabled !== undefined) {
    if (u.username === me.username) throw fail(400, 'You cannot disable your own account.')
    if (b.disabled && u.role === 'owner' && (await ownerCount()) <= 1) throw fail(400, 'Keep at least one active Owner.')
    u.disabled = Boolean(b.disabled); u.tokenVersion = (u.tokenVersion || 0) + 1; changes.push(u.disabled ? 'disabled' : 'enabled')
  }
  if (b.password) {
    if (String(b.password).length < 8) throw fail(400, 'Password must be at least 8 characters.')
    Object.assign(u, A.hashPassword(b.password)); u.tokenVersion = (u.tokenVersion || 0) + 1; u.mustChange = true; changes.push('password reset')
  }
  await A.saveUser(u)
  await log(me, 'Updated team member', `${u.name}: ${changes.join(', ')}`)
  return send(res, 200, { ok: true, user: A.publicUser(u) })
}
async function ownerCount() {
  const h = pairs(await r('HGETALL', 'ylh:users'))
  return Object.values(h).map(v => json.parse(v)).filter(u => u && u.role === 'owner' && !u.disabled).length
}
async function deleteUser(res, me, username) {
  const u = await A.getUser(username)
  if (!u) throw fail(404, 'User not found')
  assertCanManage(me, u.role)
  if (u.username === me.username) throw fail(400, 'You cannot delete your own account.')
  if (u.role === 'owner' && (await ownerCount()) <= 1) throw fail(400, 'Keep at least one Owner.')
  await r('HDEL', 'ylh:users', u.username)
  await log(me, 'Removed team member', u.name)
  return send(res, 200, { ok: true })
}

/* ------------------------------------------------------------ router */
async function route(req, res) {
  const url = new URL(req.url, 'http://x')
  const raw = url.searchParams.get('__path')
  const path = '/' + (raw != null ? raw : url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '')
  const M = req.method

  if (path === '/enquiries' && M === 'POST') return submitEnquiry(req, res)
  if ((path === '/content.js' || path === '/content') && M === 'GET') return publicContent(req, res, path.endsWith('.js'))
  if (path === '/track' && M === 'POST') return track(req, res)

  if (!path.startsWith('/admin/')) throw fail(404, 'Not found')
  const sub = path.slice(7)

  // CSRF: admin writes must be same-origin JSON calls from the panel.
  if (M !== 'GET' && req.headers['x-ylh-admin'] !== '1') throw fail(403, 'Forbidden')

  if (sub === 'session' && M === 'GET') return session(req, res)
  if (sub === 'login' && M === 'POST') return login(req, res)
  if (sub === 'logout' && M === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': A.clearCookie(req) })

  const me = await A.currentUser(req)
  if (!me) throw fail(401, 'Please sign in again.')
  const need = p => { if (!A.can(me, p)) throw fail(403, 'Your role does not have access to this.') }
  let m

  if (sub === 'password' && M === 'POST') return changePassword(req, res, me)
  if (sub === 'stats' && M === 'GET') { need('dashboard'); return stats(req, res, me, url) }

  if (sub === 'enquiries' && M === 'GET') { need('enquiries.read'); return send(res, 200, { enquiries: await allEnquiries(), statuses: STATUSES }) }
  if (sub === 'export.csv' && M === 'GET') { need('enquiries.read'); return exportCsv(res) }
  if ((m = /^enquiries\/([\w-]{8,64})$/.exec(sub))) {
    if (M === 'PATCH') { need('enquiries.write'); return patchEnquiry(req, res, me, m[1]) }
    if (M === 'DELETE') {
      need('enquiries.delete')
      const rec = json.parse(await r('HGET', 'ylh:enq', m[1]))
      await pipe([['HDEL', 'ylh:enq', m[1]], ['ZREM', 'ylh:enq:ids', m[1]]])
      await log(me, 'Deleted enquiry', rec ? rec.name : m[1])
      return send(res, 200, { ok: true })
    }
  }

  if (sub === 'content' && M === 'GET') { if (!A.can(me, 'content') && !A.can(me, 'banner')) need('content'); return getContent(res) }
  if ((m = /^content\/([a-z]+)$/.exec(sub))) {
    if (M === 'PUT') return putContent(req, res, me, m[1])
    if (M === 'DELETE') return resetContent(res, me, m[1])
  }
  if (sub === 'upload' && M === 'POST') { if (!A.can(me, 'content') && !A.can(me, 'banner')) need('content'); return upload(req, res, me) }

  if (sub === 'users' && M === 'GET') { need('users'); return listUsers(res) }
  if (sub === 'users' && M === 'POST') { need('users'); return createUser(req, res, me) }
  if ((m = /^users\/([a-z0-9._-]{3,32})$/.exec(sub))) {
    need('users')
    if (M === 'PATCH') return updateUser(req, res, me, m[1])
    if (M === 'DELETE') return deleteUser(res, me, m[1])
  }
  if (sub === 'activity' && M === 'GET') {
    need('activity')
    const items = (await r('LRANGE', 'ylh:log', 0, 299)).map(x => json.parse(x)).filter(Boolean)
    return send(res, 200, { items })
  }
  throw fail(404, 'Not found')
}

module.exports = async function handler(req, res) {
  try {
    await route(req, res)
  } catch (e) {
    const status = e.status || 500
    if (status >= 500) console.error('[api]', e)
    if (!res.headersSent) send(res, status, { error: status >= 500 && !e.status ? 'Server error — please try again.' : e.message })
  }
}
