# Admin panel — setup & how it works

Admin panel address: **https://youngleadershub.co/admin.html**

## One-time setup in Vercel (about 5 minutes)

1. **Database** — Vercel → project `young-leaders-hub` → **Storage** → **Create Database** →
   **Upstash for Redis** (free plan) → **Connect** it to this project (all environments).
   This stores enquiries, staff accounts, edited content and visitor counts.
2. **Photo storage** — **Storage** → **Create** → **Blob** → connect it to this project.
   Needed for uploading photos from the admin panel.
3. **Admin password** — **Settings → Environment Variables** → add
   `ADMIN_PASSWORD` = a strong password (8+ characters), all environments.
4. **Redeploy** (Deployments → latest → Redeploy), or push a new commit.
5. Open `/admin.html`, sign in as **admin** with that password. You will be asked to set
   your own password straight away. Then add staff under **Staff & roles**.

Optional: `SESSION_SECRET` (any long random string) — otherwise one is derived automatically.

## What is in the panel

| Section | What it does |
|---|---|
| Dashboard | Page views, unique visitors, top pages, devices, referrers, enquiries per day, admissions pipeline |
| Enquiries | All form submissions (Expression of Interest, Contact, Feedback). Status, private notes, WhatsApp/email links, CSV export |
| Programs | Course cards — Programs page and/or homepage, photo, badge, filter categories, tags, order, hide/show |
| Student projects | Project cards on the homepage and gallery |
| Team | Mentors on the Team page; tick “Show on homepage” for the teaser |
| Gallery | Albums and photos — upload, captions, filter groups, tile size, order, hide |
| Parent reviews | Homepage testimonial slider |
| Pages & contact | Page headings/intro text, homepage hero, phone / WhatsApp / email |
| Announcement | Notice bar on every page, with colour, button link and start/end dates |
| Staff & roles | Owner, Administrator, Content Editor, Admissions, Viewer |
| Activity log | Who signed in, published or changed what |

## How content works

* The HTML pages still contain all the original content. Until a section is edited
  and **published**, the site looks exactly as before.
* On publish, the content is saved in the database and served by `/api/content.js`;
  `assets/js/cms.js` applies it on each page (CDN cache ≈ 20 seconds).
* “Restore original” in any section removes the edits and returns to the HTML version.
* `data/seed.json` is the original content, extracted from the HTML — the editors start from it.

## Files

| Path | Purpose |
|---|---|
| `admin.html`, `assets/admin/*` | The admin panel |
| `api/router.js`, `api/_lib/*` | The single Vercel Function behind `/api/*` (via `vercel.json`) |
| `assets/js/cms.js` | Applies published content + counts page views (no cookies) |
| `data/seed.json` | Original website content |

Security: passwords hashed with scrypt, signed HttpOnly SameSite=Strict session cookie (12 h),
per-IP rate limits on login and forms, role checks on every API call, CSRF header on writes,
honeypot on forms, CSV formula-injection protection, admin page marked noindex.

The old `server/` folder (local Node server) is no longer used by the website on Vercel.
