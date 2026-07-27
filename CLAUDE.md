# Repository layout

- `mobile/` — the Expo/React Native app (see `mobile/CLAUDE.md`)
- `backend/` — the Rails sync API (currently unused; the app runs local-only)
- `website/` — the public marketing site
- `docs/` — design prototype and notes

# Marketing website (`website/`)

`website/index.html` is the marketing page, aimed at organic search traffic;
`website/privacy/index.html` is the privacy policy, served at
`https://symtrail.com/privacy/`. No build step, no dependencies, no external
requests — CSS is inline in `<style>` and the store glyphs are inline SVG. Open
either file in a browser to preview it.

The policy lives in its own directory rather than as `privacy.html` so Pages
serves it as a directory index — a clean extensionless URL without relying on
Pages' `.html` fallback. Its tokens, base rules, header and footer CSS are
copied from `index.html` and must stay in step with it; only the `.prose`/
`.summary`/`.toc` block is page-specific.

The brand mark is `website/logo.png` (96×96, transparent rounded corners so it
sits on both the light and dark background), used by the header, the footer and
`rel="icon"`; `website/apple-touch-icon.png` (180×180, opaque — iOS applies its
own mask) covers the home-screen case. Both are downscaled from the app icon
master described in `mobile/CLAUDE.md`, so the site and the app stay in step.
The page previously used an inline SVG chevron for all three; if you swap the
mark again, remember it lives in a CSS rule (`.logo img`) plus two `<img>` tags
plus the two `<link>` tags.

**The site is duplicated at the repo root** on the `marketing-website` branch
(`index.html`, `privacy/index.html`, `assets/`, `og.png`, `logo.png`,
`apple-touch-icon.png`, `robots.txt`, `sitemap.xml`, `CNAME`, `.nojekyll`) so
Pages can serve it from the branch root. The copies are byte-identical — change
`website/` and copy across, or the two drift. One exception: the root `CNAME`
has no trailing newline (Pages wrote it), so `cmp` reports it as differing from
`website/CNAME`; leave it alone rather than "fixing" it.

## Deployment — GitHub Pages

Live at **https://symtrail.com** (registered at Namecheap).

Deploys via GitHub's legacy branch-deploy Pages, sourced from the repo root of
the `marketing-website` branch — that's why the site is duplicated there (see
above); Pages serves whatever's at that branch's root, not `website/`. **Pushing
`marketing-website` is what deploys** (keep it byte-identical to `website/`,
as noted above); it lands in 15-30s as a `pages-build-deployment` run.

An Actions-artifact workflow (`.github/workflows/pages.yml`) was tried as a
replacement that would publish `website/` straight from `main`, but the repo's
auto-created `github-pages` environment only allows `gh-pages`/
`marketing-website` to deploy to it (left over from when Pages was first set
to branch-deploy mode), so every run was rejected before checkout ever ran.
Fixing that needs a one-time manual change at Settings → Environments →
`github-pages` → Deployment branches and tags → add `main`. **Decided
2026-07-26: not making that change** — branch-deploy off `marketing-website`
works fine, so the workflow was deleted rather than left permanently failing.
If this is ever revisited, `website/` is already in the right shape for the
Actions artifact flow; only the environment's branch policy needs to change.

`.nojekyll` at the branch root stops Pages from running the content through
Jekyll.

### Custom domain

`CNAME` (holding `symtrail.com`) must stay at the `marketing-website` branch
root — in branch-deploy mode Pages reads the custom domain straight from that
file, so deleting it can drop the domain on the next deploy.

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

## Privacy policy (`website/privacy/index.html`)

`https://symtrail.com/privacy/` is the URL registered as the app's Privacy
Policy URL in App Store Connect, so it must keep resolving — Apple re-checks it
on every review.

Its contents are a description of what the code actually does, not boilerplate,
and each claim has a counterpart in the app:

- health data local-only → `LOCAL_ONLY` in `mobile/src/config.ts` plus the
  expo-sqlite store
- the analytics section (event shape, anonymous id, device context, IP/coarse
  geo, PostHog **EU** Cloud) → `mobile/src/analytics/index.ts`; the host is
  `https://eu.i.posthog.com` and `captureAppLifecycleEvents` is on, with no
  session replay and no autocapture
- reminders scheduled locally, no push token → `mobile/src/notifications/reminders.ts`
- report generated on-device, shared only by user action → expo-print/expo-sharing

Section 10 promises that gaining sync, accounts, or richer collection would be
announced in-app rather than quietly edited in. Honour that: restoring the
backend means updating sections 1–4 *and* saying so in the release notes.

The policy states we rely on legitimate interest for analytics, and there is no
in-app analytics opt-out — if one is ever added, section 3 should point at it.

The page states Symtrail is not a medical device and gives no medical advice.
Keep that disclaimer in the footer.
