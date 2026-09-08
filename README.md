# Young Leaders Hub — Website (v3)

A professional, animated, fully static website for Young Leaders Hub, Dubai.
No build step, no dependencies, no npm. Open `index.html` in any browser, or
upload the whole folder to any host.

---

## Pages

| File | Page |
|---|---|
| `index.html` | Home — hero collage, stats, programs, features, student work, ESM, testimonials, 3D map |
| `about.html` | About Us — story, mission/vision/values, five pillars |
| `programs.html` | 12 programs with category filters, schedules, ESM |
| `teaching-model.html` | Traditional vs YLH method, 5-stage learning arc |
| `team.html` | 9 mentors with real bios |
| `campus.html` | Facilities + interactive 3D map |
| `gallery.html` | Masonry gallery with full-screen lightbox |
| `enrollment.html` | Enrollment form + FAQ accordion |
| `contact.html` | Contact form + 3D map + details |

Plus `robots.txt`, `sitemap.xml` and `assets/`.

---

## What's in v3

**Interactive 3D map** — MapLibre GL JS with OpenFreeMap tiles. Tilted camera,
extruded 3D buildings, a custom gold pin with popup, and a slow cinematic orbit
that stops the moment you touch it. If the map libraries can't load on a visitor's
network, it silently falls back to a Google Maps embed after 9 seconds.

**Artwork** — 29 hand-generated layered SVG artworks in `assets/img/art/`
(program covers, gallery scenes, section illustrations). Vector, tiny, and they
can never 404 because nothing is loaded from an external image host.

**Motion** — preloader, scroll-progress bar, staggered scroll reveals (up / left /
right / scale), animated counters, 3D tilt on cards, hover image zoom, drifting
gradient blobs, infinite marquee, auto-playing testimonial slider, floating
WhatsApp button with pulse, back-to-top, sticky mobile CTA bar.

**Interactions** — lightbox gallery (click, arrow keys, Esc), program category
filters, FAQ accordion, mobile slide-down menu.

---

## Folder structure

```
YOUNG LEADERS HUB/
├─ *.html                 9 pages
├─ robots.txt
├─ sitemap.xml
└─ assets/
   ├─ css/style.css       Design system + all components
   ├─ js/main.js          All interactions incl. the 3D map
   └─ img/
      ├─ favicon.svg
      └─ art/             29 generated SVG artworks
```

---

## Design system

Edit the variables at the top of `assets/css/style.css` to re-theme everything.

| Token | Value | Use |
|---|---|---|
| `--navy-800` | `#0a1733` | Primary brand / dark sections |
| `--gold-500` | `#e6a819` | Accent, CTAs, highlights |
| `--teal-500` | `#12a594` | Secondary accent |
| `--bg-soft` | `#f6f8fc` | Alternating section background |

Fonts: **Sora** (headings) + **Plus Jakarta Sans** (body), from Google Fonts.

---

## Contact details used

- Address: 501, 5th Floor, Arab Bank Corporate Office, Dubai Outsource City (DOC), Dubai, UAE
- Email: Info@youngleadershub.co
- Phone / WhatsApp: +971 58 512 0895

To change these everywhere, search and replace across the `.html` files.

---

## Before going live

1. **Forms** — `enrollment.html` and `contact.html` show a success message on the
   front end only. Connect them to a real handler (Formspree, Web3Forms, or your
   own endpoint): set `<form action="…" method="post">` and remove the `data-form`
   attribute so `main.js` stops intercepting the submit.

2. **Social links** — the footer icons point to `#`. Replace with your real
   Facebook / Instagram / LinkedIn / YouTube URLs.

3. **Real photos** — to swap the generated artwork for real photography, drop your
   images into `assets/img/` and change the `src` in the HTML. Recommended sizes:
   - Program covers — 900 × 560 px
   - Gallery images — 900 × 640 px
   - Section images — 900 × 700 px
   
   The CSS handles cropping (`object-fit: cover`), so exact ratios are forgiving.
   Also update the matching `data-lb="…"` attribute on gallery items so the
   lightbox opens the full-size version.

4. **Exact map pin** — the map is centred on Dubai Outsource City. To drop the pin
   on your exact door, open `assets/js/main.js` … actually edit the HTML: search for
   `data-lat` / `data-lng` in `campus.html`, `contact.html` and `index.html` and
   paste your coordinates (right-click your building in Google Maps → the numbers
   at the top of the menu).

5. **Sitemap** — update the domain in `sitemap.xml` and `robots.txt` if the site
   goes live on a different URL.

---

## Photographs (v4)

The site now uses the **real photography from youngleadershub.co**, loaded directly
from that domain:

- **Team portraits** — all 9 mentors on `team.html`
- **Program covers** — the actual course photo for each of the 12 programs
- **Section & gallery images** — campus, classroom and course photography
- **Hero** — the VR headset shot (`hero-v2.png`)

Every one of these has a `data-fallback` attribute pointing at a bundled local file
(`assets/img/art/…` for scenes, `assets/img/avatars/…` for portraits). If a remote
photo ever fails to load, `main.js` swaps in the local artwork automatically, so the
page never shows a broken image.

### Making the photos fully local (recommended before launch)

Hot-linking works, but it ties this site to the old one staying online. To bundle
the images instead:

1. In your browser, open each image URL (they are all in the HTML — search for
   `youngleadershub.co/wp-content`), right-click → **Save image as…**
2. Save them into `assets/img/photos/`
3. Find-and-replace the long `https://youngleadershub.co/wp-content/uploads/…`
   URLs with `assets/img/photos/<filename>`

The `data-fallback` attributes can stay exactly as they are.

> The hero image (`hero-v2.png`) comes from the `ylh.hafizwaqas7895.workers.dev`
> preview deployment. If that preview is ever taken down the hero falls back to the
> `young-boy-with-fists-closed` image from the main site — but it is worth saving
> `hero-v2.png` locally for the same reason as above.

---

## Backend & admin panel (v7)

The site is no longer static-only. `server/server.js` is a **zero-dependency Node
server** — built-ins only, nothing to `npm install` — that serves the whole site
and handles enquiries.

```bash
node server/server.js          # or double-click start-server.bat on Windows
```

- Website: <http://localhost:3000/>
- Admin panel: <http://localhost:3000/admin.html>

The first run prints a generated admin password **once** — save it. Change it
with `node server/server.js --set-password YOUR_NEW_PASSWORD`.

The enrollment and contact forms now POST to `/api/enquiries` and are stored in
`server/data/enquiries.json`. If the page is opened without the server running,
the form shows an honest error with the email and phone number instead of a fake
success message.

The admin panel gives you: live counts, search, filters by status and form type,
a detail drawer with one-click reply-by-email, status tracking
(new → contacted → enrolled → closed), delete, and CSV export.

Full detail — API reference, storage layout, and the security notes — is in
[`server/README.md`](server/README.md).

---

## Brand (v7)

The real Young Leaders Hub logo is now in place, and the whole palette was
rebuilt around it.

| Token | Value | Source |
|---|---|---|
| `--navy-500` | `#243090` | the blue in the logo |
| `--gold-500` | `#f0871e` | the orange in the logo |
| `--navy-800` | `#0d1440` | dark sections, hue-matched to the logo blue |

Logo assets in `assets/img/`, all cut from the supplied artwork with a clean
transparent matte:

| File | Use |
|---|---|
| `logo.png` | full lockup with tagline — footer, admin login |
| `logo-mark.png` | emblem only — navbar, preloader |
| `logo-icon.png` | square 512px — social sharing |
| `apple-touch-icon.png` | 180px home-screen icon |
| `favicon-32.png` | browser tab |

Social links point at the real accounts (Instagram, YouTube, WhatsApp), and the
address is the full office line with the map linking to the Google listing.

---

## Hosting

**With the backend** (forms + admin panel): you need a host that runs Node —
a small VPS, Railway, Render, or Fly. Run `node server/server.js` behind Nginx
or Caddy with HTTPS. See `server/README.md`.

**Static only** (no forms, no admin): drag the folder onto
**app.netlify.com/drop** or **pages.cloudflare.com**. Everything works except
form submission, which falls back to showing the email address.

---

## Accessibility & performance

- Semantic HTML, ARIA labels, visible focus rings, keyboard-operable lightbox.
- `prefers-reduced-motion` respected — every animation disables automatically.
- `<noscript>` fallback keeps all content visible if JavaScript is blocked.
- All imagery is vector SVG; only the two web fonts and the map library are
  fetched from a CDN, and the map degrades gracefully if blocked.
