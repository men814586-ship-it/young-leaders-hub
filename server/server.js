/**
 * Young Leaders Hub — enquiry backend + admin panel
 *
 * Zero dependencies: plain Node built-ins only. No `npm install`, nothing to
 * keep patched. Run `node server/server.js` and it serves the whole site plus
 * the API on one port.
 *
 * Storage is a single JSON file (server/data/enquiries.json). For an enquiry
 * inbox measured in hundreds of rows a year, a database server would be more
 * moving parts than the problem deserves.
 */
'use strict'

const http = require('node:http')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'enquiries.json')
const CONFIG_FILE = path.join(__dirname, 'config.json')

const PORT = Number(process.env.PORT) || 3000
const SESSION_HOURS = 12
const MAX_BODY = 64 * 1024

const STATUSES = ['new', 'contacted', 'enrolled', 'closed']

/* ------------------------------------------------------------------ config */

function scryptHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))

  // First run — generate credentials and show them once.
  const password = crypto.randomBytes(9).toString('base64url')
  const salt = crypto.randomBytes(16).toString('hex')
  const config = {
    adminUser: 'admin',
    salt,
    passwordHash: scryptHash(password, salt),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('  ADMIN ACCOUNT CREATED - save these details now')
  console.log('='.repeat(60))
  console.log('  Username: admin')
  console.log('  Password: ' + password)
  console.log('')
  console.log('  Change it any time with:')
  console.log('    node server/server.js --set-password YOUR_NEW_PASSWORD')
  console.log('='.repeat(60) + '\n')
  return config
}

function setPassword(newPassword) {
  const config = loadConfig()
  config.salt = crypto.randomBytes(16).toString('hex')
  config.passwordHash = scryptHash(newPassword, config.salt)
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  console.log('Admin password updated.')
}

/* -------------------------------------------------------------- data store */

let enquiries = []
let writeQueue = Promise.resolve()

function loadEnquiries() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]')
    return []
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Never lose data to a parse error - park the bad file and start clean.
    const backup = DB_FILE + '.corrupt-' + Date.now()
    fs.copyFileSync(DB_FILE, backup)
    console.error('enquiries.json was unreadable; backed up to ' + backup)
    return []
  }
}

/** Serialised atomic write: temp file then rename, so a crash cannot truncate. */
function persist() {
  writeQueue = writeQueue
    .then(async () => {
      const tmp = DB_FILE + '.tmp'
      await fsp.writeFile(tmp, JSON.stringify(enquiries, null, 2))
      await fsp.rename(tmp, DB_FILE)
    })
    .catch((err) => console.error('write failed:', err.message))
  return writeQueue
}

/* ----------------------------------------------------------------- helpers */

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign(
    { 'Content-Type': 'application/json; charset=utf-8' }, headers || {}))
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** Trim, drop control characters, cap length. */
function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 400)
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress || 'unknown'
}

/* -------------------------------------------------------------- rate limit */

const hits = new Map()

function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const rec = hits.get(key)
  if (!rec || now > rec.reset) {
    hits.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  rec.count += 1
  return rec.count <= limit
}

setInterval(() => {
  const now = Date.now()
  for (const [key, rec] of hits) if (now > rec.reset) hits.delete(key)
}, 60000).unref()

/* -------------------------------------------------------------------- auth */

function issueSession(config) {
  const exp = Date.now() + SESSION_HOURS * 3600000
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(String(exp)).digest('hex')
  return exp + '.' + sig
}

function validSession(config, token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) return false
  const parts = token.split('.')
  const exp = parts[0]
  const sig = parts[1] || ''
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  const expected = crypto.createHmac('sha256', config.sessionSecret).update(exp).digest('hex')
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function cookies(req) {
  const out = {}
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function requireAuth(config, req, res) {
  if (validSession(config, cookies(req).ylh_session)) return true
  send(res, 401, { error: 'Not signed in' })
  return false
}

/* ------------------------------------------------------------ static files */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname)
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html'
  if (!path.extname(rel)) rel += '.html'

  const file = path.normalize(path.join(ROOT, rel))

  // Directory-traversal guard: the resolved path must stay inside ROOT.
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Forbidden' })
  // The server's own config and stored data are never web-readable.
  if (file.startsWith(path.join(ROOT, 'server') + path.sep)) {
    return send(res, 404, { error: 'Not found' })
  }

  try {
    const stat = await fsp.stat(file)
    if (!stat.isFile()) throw new Error('not a file')
    const ext = path.extname(file).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    })
    fs.createReadStream(file).pipe(res)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<!doctype html><meta charset="utf-8"><title>Page not found</title>' +
      '<div style="font:16px/1.6 system-ui,sans-serif;padding:14vh 8vw;color:#2b3547">' +
      '<h1 style="font-size:2.4rem;margin:0 0 .5rem;color:#0d1440">404</h1>' +
      '<p>That page does not exist. <a href="/" style="color:#f0871e">Back to the homepage</a>.</p></div>')
  }
}

/* --------------------------------------------------------------------- CSV */

function toCsv(rows) {
  const cols = ['id', 'receivedAt', 'type', 'status', 'name', 'childName', 'childAge',
    'email', 'phone', 'slot', 'program', 'subject', 'rating', 'message']
  const esc = (v) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [cols.join(',')]
  for (const row of rows) lines.push(cols.map((c) => esc(row[c])).join(','))
  return '\ufeff' + lines.join('\r\n')
}

/* ------------------------------------------------------------------ routes */

async function handleApi(config, req, res, url) {
  const { pathname } = url
  const ip = clientIp(req)

  /* ---- public: submit an enquiry ---- */
  if (pathname === '/api/enquiries' && req.method === 'POST') {
    if (!rateLimit('submit:' + ip, 8, 10 * 60000)) {
      return send(res, 429, { error: 'Too many submissions. Please try again later.' })
    }

    let body
    try {
      body = await readBody(req)
    } catch (err) {
      return send(res, 400, { error: err.message })
    }

    // Honeypot: real people never fill a hidden field.
    if (clean(body.website, 100)) return send(res, 200, { ok: true })

    const type = body.type === 'contact' ? 'contact' : body.type === 'feedback' ? 'feedback' : 'enrollment'
    const rating = Number(body.rating)
    const record = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      type,
      status: 'new',
      name: clean(body.name, 120),
      childName: clean(body.childName, 120),
      childAge: clean(body.childAge, 10),
      email: clean(body.email, 160),
      phone: clean(body.phone, 40),
      slot: clean(body.slot, 60),
      program: clean(body.program, 120),
      subject: clean(body.subject, 120),
      message: clean(body.message, 4000),
      source: clean(body.source, 200),
      rating: type === 'feedback' && rating >= 1 && rating <= 5 ? rating : undefined,
    }

    const errors = []
    if (!record.name) errors.push('Name is required')
    if (!isEmail(record.email)) errors.push('A valid email address is required')
    if (type === 'enrollment') {
      if (!record.childName) errors.push("Child's name is required")
      if (!record.phone) errors.push('Phone number is required')
    }
    if (type === 'feedback') {
      if (!record.message) errors.push('Please tell us a bit about your experience')
      if (record.rating === undefined) errors.push('Please choose a star rating')
    }
    if (errors.length) return send(res, 400, { error: errors.join('. ') })

    enquiries.unshift(record)
    await persist()
    console.log('[enquiry] ' + type + ' from ' + record.name + ' <' + record.email + '>')
    return send(res, 201, { ok: true, id: record.id })
  }

  /* ---- admin: sign in ---- */
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (!rateLimit('login:' + ip, 6, 10 * 60000)) {
      return send(res, 429, { error: 'Too many attempts. Try again in a few minutes.' })
    }

    let body
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: 'Bad request' })
    }

    const user = clean(body.username, 60)
    const pass = typeof body.password === 'string' ? body.password : ''
    const candidate = Buffer.from(scryptHash(pass, config.salt), 'utf8')
    const stored = Buffer.from(config.passwordHash, 'utf8')
    const ok = user === config.adminUser &&
      candidate.length === stored.length &&
      crypto.timingSafeEqual(candidate, stored)

    if (!ok) return send(res, 401, { error: 'Incorrect username or password' })

    const token = issueSession(config)
    return send(res, 200, { ok: true }, {
      'Set-Cookie': 'ylh_session=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' +
        SESSION_HOURS * 3600,
    })
  }

  /* ---- admin: sign out ---- */
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    return send(res, 200, { ok: true },
      { 'Set-Cookie': 'ylh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
  }

  /* ---- admin: session probe ---- */
  if (pathname === '/api/admin/session' && req.method === 'GET') {
    return send(res, 200, { signedIn: validSession(config, cookies(req).ylh_session) })
  }

  /* ---- admin: list ---- */
  if (pathname === '/api/admin/enquiries' && req.method === 'GET') {
    if (!requireAuth(config, req, res)) return
    const counts = { all: enquiries.length }
    for (const s of STATUSES) counts[s] = enquiries.filter((e) => e.status === s).length
    counts.enrollment = enquiries.filter((e) => e.type === 'enrollment').length
    counts.contact = enquiries.filter((e) => e.type === 'contact').length
    counts.feedback = enquiries.filter((e) => e.type === 'feedback').length
    const ratings = enquiries.filter((e) => e.type === 'feedback' && e.rating).map((e) => e.rating)
    counts.avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return send(res, 200, { enquiries, counts })
  }

  /* ---- admin: CSV export (everything) ---- */
  if (pathname === '/api/admin/export.csv' && req.method === 'GET') {
    if (!requireAuth(config, req, res)) return
    const csv = toCsv(enquiries)
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ylh-enquiries-' +
        new Date().toISOString().slice(0, 10) + '.csv"',
    })
    return res.end(csv)
  }

  /* ---- admin: CSV export (a single enquiry, for one-by-one downloads) ---- */
  const singleExport = pathname.match(/^\/api\/admin\/enquiries\/([\w-]{6,64})\/export\.csv$/)
  if (singleExport && req.method === 'GET') {
    if (!requireAuth(config, req, res)) return
    const row = enquiries.find((e) => e.id === singleExport[1])
    if (!row) return send(res, 404, { error: 'Enquiry not found' })
    const csv = toCsv([row])
    const who = (row.name || 'enquiry').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ylh-' + who + '-' + row.id.slice(0, 8) + '.csv"',
    })
    return res.end(csv)
  }

  /* ---- admin: update / delete one ---- */
  const match = pathname.match(/^\/api\/admin\/enquiries\/([\w-]{6,64})$/)
  if (match) {
    if (!requireAuth(config, req, res)) return
    const index = enquiries.findIndex((e) => e.id === match[1])
    if (index < 0) return send(res, 404, { error: 'Enquiry not found' })

    if (req.method === 'PATCH') {
      let body
      try {
        body = await readBody(req)
      } catch {
        return send(res, 400, { error: 'Bad request' })
      }
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return send(res, 400, { error: 'Unknown status' })
        enquiries[index].status = body.status
      }
      if (body.note !== undefined) enquiries[index].note = clean(body.note, 2000)
      enquiries[index].updatedAt = new Date().toISOString()
      await persist()
      return send(res, 200, { ok: true, enquiry: enquiries[index] })
    }

    if (req.method === 'DELETE') {
      enquiries.splice(index, 1)
      await persist()
      return send(res, 200, { ok: true })
    }
  }

  return send(res, 404, { error: 'Unknown endpoint' })
}

/* ------------------------------------------------------------------ server */

function start() {
  const config = loadConfig()
  enquiries = loadEnquiries()

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'))

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    if (url.pathname.startsWith('/api/')) {
      handleApi(config, req, res, url).catch((err) => {
        console.error('api error:', err)
        if (!res.headersSent) send(res, 500, { error: 'Server error' })
      })
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { error: 'Method not allowed' })
    }

    serveStatic(res, url.pathname).catch(() => {
      if (!res.headersSent) send(res, 500, { error: 'Server error' })
    })
  })

  server.listen(PORT, () => {
    console.log('Young Leaders Hub')
    console.log('  Website:  http://localhost:' + PORT + '/')
    console.log('  Admin:    http://localhost:' + PORT + '/admin.html')
    console.log('  Storage:  ' + DB_FILE)
    console.log('  ' + enquiries.length + ' enquiries on file. Press Ctrl+C to stop.\n')
  })
}

/* --------------------------------------------------------------------- CLI */

const arg = process.argv[2]
if (arg === '--set-password') {
  const next = process.argv[3]
  if (!next || next.length < 8) {
    console.error('Usage: node server/server.js --set-password YOUR_NEW_PASSWORD  (min 8 characters)')
    process.exit(1)
  }
  setPassword(next)
} else {
  start()
}
