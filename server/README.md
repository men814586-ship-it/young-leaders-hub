# Server & Admin Panel

Zero dependencies. Nothing to `npm install` — it uses only what ships with Node.

## Start

```bash
node server/server.js
```

or double-click **start-server.bat** on Windows.

- Website: <http://localhost:3000/>
- Admin panel: <http://localhost:3000/admin.html>

On the very first run the server prints a generated admin password to the
console **once**. Save it. To change it later:

```bash
node server/server.js --set-password YOUR_NEW_PASSWORD
```

## Where the data lives

| Path | What |
|---|---|
| `server/data/enquiries.json` | every submitted enquiry |
| `server/config.json` | admin username, password hash, session secret |

Neither is reachable over HTTP — the static file handler refuses any path under
`server/`. Both should be excluded from backups you share, and `config.json`
must never be committed to a public repo.

Writes are atomic (temp file + rename), so a crash mid-write cannot truncate the
file. If `enquiries.json` is ever unparseable the server backs it up as
`enquiries.json.corrupt-<timestamp>` rather than overwriting it.

## API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/enquiries` | public | submit the enrollment, contact, or parent-feedback form |
| POST | `/api/admin/login` | public | sign in, sets an HttpOnly session cookie |
| POST | `/api/admin/logout` | public | clear the session |
| GET | `/api/admin/session` | public | is the caller signed in? |
| GET | `/api/admin/enquiries` | admin | list everything, with counts |
| PATCH | `/api/admin/enquiries/:id` | admin | change `status` or add a `note` |
| DELETE | `/api/admin/enquiries/:id` | admin | remove one permanently |
| GET | `/api/admin/export.csv` | admin | download everything as CSV |

## Security notes

- Passwords are hashed with **scrypt** and a per-install random salt; the login
  comparison is constant-time, so it leaks nothing through timing.
- Sessions are HMAC-signed tokens with a 12-hour expiry, sent as an
  `HttpOnly; SameSite=Strict` cookie — not readable from JavaScript, and not
  sent on cross-site requests.
- Rate limits: 8 form submissions and 6 login attempts per IP per 10 minutes.
- Forms carry a hidden honeypot field; anything that fills it is accepted with a
  200 and silently discarded, so bots get no signal.
- Request bodies are capped at 64 KB, every field is length-limited, and control
  characters are stripped before storage.
- The static handler blocks directory traversal and refuses to serve `server/`.

## Putting it online

The server listens on `PORT` (default 3000). On a VPS, run it behind Nginx or
Caddy with HTTPS and keep it alive with `pm2` or a systemd unit:

```bash
PORT=8080 node server/server.js
```

**Run it behind HTTPS in production.** The session cookie is not marked
`Secure`, because that would break local `http://localhost` testing; once you
have TLS in front, add `Secure;` to the `Set-Cookie` header in `server.js`.
