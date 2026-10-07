// Minimal Upstash Redis REST client (no dependencies).
// Works with the env vars Vercel's Upstash / KV integration adds to the project.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''

function configured() { return Boolean(URL_ && TOKEN) }

async function call(path, body) {
  if (!configured()) {
    const e = new Error('Database is not connected. In Vercel open Storage, create an Upstash Redis database and connect it to this project.')
    e.status = 503
    throw e
  }
  const r = await fetch(URL_.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error('Database error: ' + (data.error || r.status))
  return data
}

// r('HGET', 'key', 'field') -> result
async function r(...args) {
  const d = await call('', args.map(String))
  if (d.error) throw new Error('Database error: ' + d.error)
  return d.result
}

// pipe([['INCR','a'],['GET','b']]) -> [result, result]
async function pipe(cmds) {
  if (!cmds.length) return []
  const d = await call('/pipeline', cmds.map(c => c.map(String)))
  return d.map(x => {
    if (x.error) throw new Error('Database error: ' + x.error)
    return x.result
  })
}

// HGETALL comes back as a flat [k, v, k, v] array over REST.
function pairs(arr) {
  const o = {}
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1]
  else if (arr && typeof arr === 'object') return arr
  return o
}

const json = {
  parse(v, fallback = null) {
    if (v == null) return fallback
    try { return JSON.parse(v) } catch { return fallback }
  },
}

module.exports = { r, pipe, pairs, json, configured, TOKEN }
