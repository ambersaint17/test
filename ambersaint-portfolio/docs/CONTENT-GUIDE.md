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

## 3D models
Drop a `.glb` in `assets/models/`, a still `.webp` in `assets/models/posters/`, and copy one of the `.wcard--droid` figures in `index.html`.

## Music
Replace `assets/audio/theme.mp3`. It only plays after the visitor presses Sound (browsers block autoplay); the choice is remembered.

## Text
All copy (hero, profile, capabilities, method, FAQ, contact) is in `index.html`. After editing the FAQ run `npm run seo`.
