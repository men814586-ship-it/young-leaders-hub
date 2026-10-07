const crypto = require('crypto')
const { r, json, TOKEN } = require('./redis')

const ROLES = {
  owner: {
    label: 'Owner',
    desc: 'Full control, including other administrators.',
    perms: ['dashboard', 'enquiries.read', 'enquiries.write', 'enquiries.delete', 'content', 'banner', 'users', 'users.owner', 'activity'],
  },
  admin: {
    label: 'Administrator',
    desc: 'Everything except managing Owner accounts.',
    perms: ['dashboard', 'enquiries.read', 'enquiries.write', 'enquiries.delete', 'content', 'banner', 'users', 'activity'],
  },
  editor: {
    label: 'Content Editor',
    desc: 'Edits programs, team, gallery, text and the announcement banner. Cannot see enquiries.',
    perms: ['dashboard', 'content', 'banner'],
  },
  admissions: {
    label: 'Admissions',
    desc: 'Works the enquiry inbox: statuses, notes and export. Cannot change the website.',
    perms: ['dashboard', 'enquiries.read', 'enquiries.write'],
  },
  viewer: {
    label: 'Viewer',
    desc: 'Read-only: dashboard and enquiries.',
    perms: ['dashboard', 'enquiries.read'],
  },
}

const SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('ylh-session|' + TOKEN + '|' + (process.env.ADMIN_PASSWORD || '')).digest('hex')
const SESSION_HOURS = 12
const COOKIE = 'ylh_admin'

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}
function checkPassword(password, salt, hash) {
  const a = crypto.scryptSync(String(password), salt, 64)
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return body + '.' + mac
}
function verify(token) {
  if (!token || token.indexOf('.') < 0) return null
  const [body, mac] = token.split('.')
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  if (!safeEqual(mac, want)) return null
  const p = json.parse(Buffer.from(body, 'base64url').toString())
  if (!p || p.exp < Date.now()) return null
  return p
}

function cookies(req) {
  const out = {}
  String(req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=')
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim())
  })
  return out
}
function isHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
}
function sessionCookie(req, user) {
  const token = sign({ u: user.username, v: user.tokenVersion || 0, exp: Date.now() + SESSION_HOURS * 3600e3 })
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}` + (isHttps(req) ? '; Secure' : '')
}
function clearCookie(req) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` + (isHttps(req) ? '; Secure' : '')
}

async function getUser(username) {
  return json.parse(await r('HGET', 'ylh:users', String(username).toLowerCase()))
}
async function saveUser(u) {
  await r('HSET', 'ylh:users', u.username, JSON.stringify(u))
}

// Resolve the signed-in user for a request, or null.
async function currentUser(req) {
  const p = verify(cookies(req)[COOKIE])
  if (!p) return null
  const u = await getUser(p.u)
  if (!u || u.disabled || (u.tokenVersion || 0) !== p.v || !ROLES[u.role]) return null
  return u
}

function perms(u) { return u ? ROLES[u.role].perms : [] }
function can(u, perm) { return perms(u).includes(perm) }
function publicUser(u) {
  return {
    username: u.username, name: u.name || u.username, role: u.role, roleLabel: ROLES[u.role] ? ROLES[u.role].label : u.role,
    disabled: Boolean(u.disabled), createdAt: u.createdAt, lastLogin: u.lastLogin || null, perms: perms(u),
  }
}

module.exports = {
  ROLES, hashPassword, checkPassword, safeEqual, sessionCookie, clearCookie,
  getUser, saveUser, currentUser, can, perms, publicUser,
}
