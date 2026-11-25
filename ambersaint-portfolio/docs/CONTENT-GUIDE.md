# Content guide

## Communities (Where I lead)
`js/data/servers.js`, array `R`: `["Name", "Role", ["inviteCode"]]`. Leave the code list empty for a private server.
Rows are sorted by live member count; private servers go to the end. Run `npm run seo` afterwards so Google's structured data matches.

## Owned servers (What I own)
Array `O`: `["Name", "Role", "inviteCode or ''", "note (shown when there is no invite)", "tag"]`. Tag `Archived` dims the card.

## Logos
Public servers use their Discord icon automatically. For a private server, add `assets/logos/<name-in-kebab-case>.png` (square, 256 px+)
and add the same kebab-case name to `LOGOS` in `servers.js`.

## Tower preview
`js/data/tower.js`, array `T`. Each entry is one channel in the Discord window: command, accent colour, banner, title, text, fields and buttons.

## Archive (builds, models, systems)
Each piece is one `<figure class="acard">` inside `#arTrack` in `index.html`. Copy the closest example and change:
- `data-type` (Build, Model or System), `data-title`, `data-desc` (shown beside the slider) and `data-thumb` (the strip thumbnail)
- the media: an `<img>` render (`acard__media` button opens it full screen), a `<video>` (`acard--video`), a 3D model (`acard--droid`, with `data-src` pointing at a `.glb` and a poster `.webp`) or a link (`acard--link`)
The counter, the thumbnail strip and the slider length update themselves.

## Link previews
Discord and X cache the preview image by its address. To change it, save the new 1200 x 630 image under a new name in `assets/og/` and point the `og:image` and `twitter:image` tags (and `ogImage` in `scripts/generate-seo.mjs`) at it.

## Music
Replace `assets/audio/theme.mp3`. It only plays after the visitor presses Sound (browsers block autoplay); the choice is remembered.

## Text
All copy (hero, profile, capabilities, method, FAQ, contact) is in `index.html`. After editing the FAQ run `npm run seo`.
