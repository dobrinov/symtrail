# Repository layout

- `mobile/` — the Expo/React Native app (see `mobile/CLAUDE.md`)
- `backend/` — the Rails sync API (currently unused; the app runs local-only)
- `website/` — the public marketing site
- `docs/` — design prototype and notes

# Marketing website (`website/`)

A single static page, `website/index.html`, aimed at organic search traffic.
No build step, no dependencies, no external requests — CSS is inline in
`<style>` and the store glyphs are inline SVG. Open the file in a browser to
preview it.

The brand mark is `website/logo.png` (96×96, transparent rounded corners so it
sits on both the light and dark background), used by the header, the footer and
`rel="icon"`; `website/apple-touch-icon.png` (180×180, opaque — iOS applies its
own mask) covers the home-screen case. Both are downscaled from the app icon
master described in `mobile/CLAUDE.md`, so the site and the app stay in step.
The page previously used an inline SVG chevron for all three; if you swap the
mark again, remember it lives in a CSS rule (`.logo img`) plus two `<img>` tags
plus the two `<link>` tags.

**The site is duplicated at the repo root** on the `marketing-website` branch
(`index.html`, `logo.png`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`,
`CNAME`, `.nojekyll`) so Pages can serve it from the branch root. The copies
are byte-identical — change `website/` and copy across, or the two drift.

## Deployment — GitHub Pages

Live at **https://symtrail.com** (registered at Namecheap).

`.github/workflows/pages.yml` publishes the `website/` folder to GitHub Pages
on every push to `main` that touches it (plus manual `workflow_dispatch`).
It uses the Pages *artifact* flow, so the repo must have
**Settings → Pages → Source: "GitHub Actions"** selected once, by hand.

The folder is uploaded as the site root, so `website/index.html` is served at
`/`. `website/.nojekyll` stops Pages from running the content through Jekyll.

### Custom domain

`website/CNAME` holds `symtrail.com`. It must stay inside `website/` — with the
Actions artifact flow, Pages reads the custom domain from the CNAME file in the
uploaded artifact, so deleting it can drop the domain on the next deploy.

DNS lives at Namecheap (Domain List → Manage → Advanced DNS):

| Type  | Host | Value                                    |
|-------|------|------------------------------------------|
| A     | @    | 185.199.108.153                          |
| A     | @    | 185.199.109.153                          |
| A     | @    | 185.199.110.153                          |
| A     | @    | 185.199.111.153                          |
| AAAA  | @    | 2606:50c0:8000::153                      |
| AAAA  | @    | 2606:50c0:8001::153                      |
| AAAA  | @    | 2606:50c0:8002::153                      |
| AAAA  | @    | 2606:50c0:8003::153                      |
| CNAME | www  | dobrinov.github.io.                      |

Pages redirects `www.symtrail.com` → `symtrail.com` automatically once both the
apex records and the www CNAME resolve. **Enforce HTTPS** in Settings → Pages
becomes available after the certificate is issued (up to 24h) and should be on.

## Store links

The App Store and Google Play buttons appear twice (hero and closing CTA) and
are deliberately `<a>` elements **with no `href`**. The CSS keys off that:

- no `href` → muted button with a "Coming soon" label (`::after` on `.bot`)
- `href` present → solid, tappable button, label gone

So shipping the real links is only adding `href="…"` to the four anchors
(marked with `TODO` comments); no CSS or copy changes needed. The Android
bundle id is `com.symtrail.app`.

## Other placeholders to fill in

Search for `TODO` in `website/`:

- `og:image` is commented out until a 1200×630 share image exists at `/og.png`

The footer contact address is `martina.dobrinova@gmail.com` (set, not a
placeholder).

## Content notes

Copy is derived from the app itself — feature names and wording follow
`mobile/src/i18n/en.ts`, and colours follow `mobile/src/design/tokens.ts`
(light and dark palettes, switched via `prefers-color-scheme`) with the brand
blue `#208AEF` from the splash screen. Keep them in step when the app changes.

The page carries JSON-LD (`SoftwareApplication` + `FAQPage`); when FAQ copy
changes, update the matching answer in the `<script type="application/ld+json">`
block too, or the structured data will contradict the visible text.

Two claims on the page are product promises, not decoration — the privacy
section states health data stays on the device and is never uploaded. That
matches the current local-only app and the analytics privacy rule in
`mobile/CLAUDE.md`. If sync or richer analytics ever ship, this copy has to
change with them.

The page states Symtrail is not a medical device and gives no medical advice.
Keep that disclaimer in the footer.
