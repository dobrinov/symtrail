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

**What's actually live today:** GitHub's legacy branch-deploy Pages, sourced
from the repo root of the `marketing-website` branch. That's why the site is
duplicated there (see above) — Pages serves whatever's at that branch's root,
not `website/`. Pushing `marketing-website` is what deploys; it lands in
15-30s. This is a `pages-build-deployment` run, not one of ours.

`.github/workflows/pages.yml` is the *intended* replacement — it would publish
`website/` straight from `main` via the Actions artifact flow, making the
branch-root duplicate unnecessary. **It has never once succeeded.** Every run
is rejected before any step executes:
`Branch "main" is not allowed to deploy to github-pages due to environment
protection rules.` (visible via the Checks API annotations, not the run log).

The repo's auto-created `github-pages` environment has a branch policy
allowing only `gh-pages` and `marketing-website` to deploy to it — left over
from when Pages was first set to branch-deploy mode. `configure-pages`'s
`enablement: true` never gets a chance to run (the block happens before
Checkout), so it has **not** switched Pages to the Actions build type; a prior
version of this doc claimed otherwise — that was wrong.

**To actually finish the switch** (one-time, needs a write-scoped token this
assistant doesn't have): Settings → Environments → `github-pages` →
Deployment branches and tags → add `main` (or set "No restriction"). Once
`pages.yml` can run, it will flip Pages' Source to "GitHub Actions" itself.
From that point on, deploy by pushing `main` (paths `website/**`), not
`marketing-website` — and the branch-root duplicate can be retired.
Until then, keep pushing `marketing-website` for real deploys.

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

## Share image

`website/og.png` (1200×630) is the `og:image`, generated rather than hand-drawn:
the app mark plus the `og:title` copy set in Sora — the same family as the app's
own wordmark — on the site's `--canvas` with washes of the brand blue and the
icon's teal. The Sora TTFs come from `mobile/node_modules/@expo-google-fonts`,
so regenerating needs the mobile deps installed. Keep the headline in step with
`og:title` and the feature line in step with the hero's bullets.

All the ink sits inside a 55px margin, so the 2:1 crop some platforms apply
(Twitter's `summary_large_image`) can't clip any of it.

## Other placeholders to fill in

The footer contact address is `martina.dobrinova@gmail.com` (set, not a
placeholder). The remaining `TODO`s in `website/index.html` are the four store
`href`s described above.

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
