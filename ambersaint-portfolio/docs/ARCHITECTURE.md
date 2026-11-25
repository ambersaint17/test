# Architecture

```
index.html            the page (all copy lives here)
css/main.css          one stylesheet: tokens, themes, sections, responsive rules
js/boot.js            <head>: adds .js and .lite, image fallbacks
js/data/servers.js    R (communities), O (owned servers), LOGOS
js/data/tower.js      T (Tower modules for the Discord preview)
js/hero-gl.js         window.Halo: the WebGL amber halo over the name
js/app.js             everything else
```

## Load order
`boot.js` (head) -> markup -> vendor (GSAP, ScrollTrigger, SplitText, Lenis) -> `data/*` -> `hero-gl.js` -> `app.js`.
`app.js` runs the preloader, waits for fonts, calls `Halo.init()` (which measures the headline), then plays the intro and calls `Halo.show()`.

## How the halo works
The headline is real HTML text. `hero-gl.js` redraws it into an offscreen canvas at the exact DOM positions and uploads it as a texture.
A full-screen fragment shader draws an elliptical torus: inside the tube it refracts that texture (amber absorption, flecks, bubbles,
specular, fresnel); on the far arc it lets the letters cover the ring; around it, it adds glow and a caustic. Outside the ring the canvas is transparent.
If the headline layout changes, `layout()` re-measures (on resize and when fonts finish loading).

## Themes
Every section has `data-theme="night|paper|amber"`. When a section crosses the middle of the screen, `body[data-theme]` switches and every
colour token (`--bg`, `--fg`, `--mute`, `--line`, `--accent`) transitions. The hero and the Discord preview keep their own fixed colours.

## Live data
- Discord invites: `/api/invite` (edge-cached 30 min) -> Discord directly -> localStorage (14 days). Paced 3 at a time with retries.
- GitHub: `/api/github` (edge-cached) -> GitHub directly -> localStorage (10 min).
- Presence: Lanyard (`api.lanyard.rest`), polled every 30 s while the tab is visible.

## Degrades gracefully
No JS: all content visible, no preloader. No WebGL: CSS halo. No GSAP: content shows, simple theme switching via IntersectionObserver.
Reduced motion: no preloader, no smooth scroll, no scroll animations.
