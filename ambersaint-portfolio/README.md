# Amber Saint · Portfolio

The portfolio of **Amber Saint** (`amber_saint17`): project manager, server administrator and Discord bot developer.
Live at **https://ambersaint.vercel.app**

A hand-built static site: plain HTML, CSS and JavaScript, no framework and no build step, plus three small Vercel serverless functions.

## The identity

| | |
|---|---|
| **Idea** | *Above the noise.* A saint's halo over an apex: the mark reads as an A, a tower and a figure at once. |
| **Mark** | `assets/brand/mark.svg` (halo + crossbar-less A). Favicon: `assets/brand/favicon.svg`. |
| **Colour** | Resin night `#0B0907` · Bone `#EEE6D8` · Paper `#E9E2D4` · Ink `#16110B` · Amber `#FF9A1F` · Deep amber `#D96F0B` |
| **Type** | Archivo (variable width, 62–125%) for display and text · Fraunces italic for voice · Martian Mono for metadata. All self-hosted, SIL OFL. |
| **Signature** | A WebGL amber-resin halo floats over the name: its far arc passes behind the letters, its near arc refracts them. |
| **Motion** | The whole page changes colour as you scroll (night → paper → night → paper → amber → night). Headlines rise out of masks, the manifesto resolves out of blur ("the noise"). |

## What's on the page

00 Hero with the halo · 01 Profile (manifesto, stats, live Discord status) · 02 Capabilities · 03 Method · 04 Where I lead (live member counts, cursor preview) ·
05 What I own · studio teaser band · 06 Tower case study (interactive Discord preview, live GitHub stats, video, setup) · 07 Building worlds (horizontal gallery, 3D droids) ·
08 Questions · 09 Contact (form to Discord, links) · footer.

Extras: preloader, full-screen menu, command palette (`Ctrl/Cmd + K`), custom cursor, ambient sound toggle, smooth scrolling.

## Project structure

```
.
├── index.html              the page
├── 404.html                not-found page (self-contained)
├── css/main.css            the whole design system, one file
├── js/
│   ├── boot.js             head script: js flag, slow-device flag, image fallbacks
│   ├── hero-gl.js          the amber halo (WebGL)
│   ├── app.js              everything else: scroll, themes, reveals, sections, form, palette, cursor, sound
│   ├── vercel-stubs.js     analytics queue stubs
│   └── data/
│       ├── servers.js      communities (R), owned servers (O), local logo list (LOGOS)   <- edit to add a server
│       └── tower.js        Tower modules shown in the Discord preview
├── api/                    contact.js (form -> Discord), invite.js (cached invite lookups), github.js (cached repo stats)
├── assets/                 brand, fonts, icons, images, logos, models, video, audio, og
├── vendor/                 GSAP + ScrollTrigger + SplitText, Lenis, model-viewer (self-hosted, so the CSP stays strict)
├── scripts/                check.mjs (integrity), generate-seo.mjs (JSON-LD, llms.txt, sitemap)
└── docs/                   ARCHITECTURE · CONTENT-GUIDE · SECURITY · TROUBLESHOOTING
```

## Run locally

```bash
npm run dev        # http://localhost:3000 (Node 18+)
```

Open it over `http://`, not by double-clicking `index.html`. The `/api/*` functions only run on Vercel (`npx vercel dev` runs them locally);
on a plain static server the site falls back to calling Discord and GitHub directly.

## Deploy (Vercel, free plan)

1. Push to the branch Vercel deploys. Framework preset **Other**, no build command, output directory = repository root (already set in `vercel.json`).
2. Environment variables (Project Settings -> Environment Variables):

| Variable | Required | Purpose |
|---|---|---|
| `CONTACT_WEBHOOK_URL` | yes, for the contact form | Discord webhook that receives enquiries |
| `CONTACT_PING_USER_ID` | optional | Discord user to ping on a new enquiry |
| `CONTACT_FORMAT` | optional | `embed` forces the classic embed format |
| `GITHUB_TOKEN` | optional | Raises GitHub's rate limit for the stats card (no scopes needed) |

## Everyday tasks

| I want to... | Do this |
|---|---|
| Add a community | Add a row to `R` in `js/data/servers.js`, then `npm run seo` |
| Add an owned server | Add a row to `O` in `js/data/servers.js` |
| Use my own logo for a private server | Drop `assets/logos/<name-in-kebab-case>.png` and add the name to `LOGOS` |
| Change a Tower module card | Edit `js/data/tower.js` |
| Update the FAQ | Edit the `#faq` section in `index.html`, then `npm run seo` |
| Change the song | Replace `assets/audio/theme.mp3` |
| Check nothing is broken | `npm run check` |

## Performance and accessibility

Fonts are self-hosted and preloaded. The halo renders at a capped resolution, pauses when the hero is off screen and drops resolution on slow devices;
without WebGL a CSS halo is shown instead. The 3D library loads only near the gallery, YouTube only on play. With *reduced motion* on, the preloader,
smooth scrolling and scroll animations are skipped and everything is visible immediately. All text stays real, selectable HTML.

Known opportunity: `assets/video/aircraft-flyby-hq.mp4` is about 22 MB; compressing it to 3 to 5 MB would speed up mobile visits.

## Credits and licenses

- Tower (open source, MIT): https://github.com/ambersaint17/-OPEN-Tower
- GSAP (free standard license), Lenis (MIT), Google `<model-viewer>` (Apache-2.0, see `vendor/LICENSE-model-viewer.txt`)
- Archivo, Fraunces, Martian Mono: SIL Open Font License (see `assets/fonts/LICENSE-OFL.txt`)
