# assets

Everything the site loads. **File names are lowercase and case sensitive** on Vercel (`BB-8.glb` is not `bb-8.glb`).

| Folder | What goes here |
|---|---|
| `audio/` | `theme.mp3`, the background song |
| `video/` | `aircraft-flyby-hq.mp4`, the Roblox fly-past clip |
| `images/brand/` | logo, avatar, enquiry banner (also used by the contact API) |
| `images/projects/` | Roblox renders and the aircraft poster |
| `images/screenshots/` | Tower screenshots (hero cards, social image sources) |
| `logos/` | Server logos, named by slug (see `docs/CONTENT-GUIDE.md`) |
| `models/` | `.glb` 3D models; `models/posters/` holds the still previews |
| `icons/` | favicon, app and home-screen icons |
| `og/` | `og-image.png`, the 1200x630 social share image |
| `vendor/` | third-party code (`model-viewer.min.js`) with its license |

Run `npm run check` after adding or removing files: it finds broken references and orphaned files.
