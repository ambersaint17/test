# Security notes

What the repo already enforces, and the few things that can only be switched on in the Vercel dashboard.

## In the code (already done)

| Area | What it does | Where |
| --- | --- | --- |
| Content-Security-Policy | Only this site's own scripts run. No inline scripts, no `eval`. Third-party hosts are limited to Discord's CDN, YouTube (no-cookie), Google Fonts, GitHub and Lanyard. `frame-ancestors 'none'` stops the site being framed. | `vercel.json` |
| Other headers | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, location, payment, USB off), COOP, CORP. | `vercel.json` |
| Internal files | `/docs`, `/scripts`, `/.github`, `README.md`, `package.json` and `vercel.json` redirect to the home page. `/js`, `/css` and `/vendor` are marked `noindex`. | `vercel.json` |
| Contact endpoint | Same-origin check, JSON only, 8 KB cap, honeypot + timing trap, 3/min and 8/hour per visitor, 60/hour for the whole site, duplicate suppression, 8 s Discord timeout, only you can ever be pinged. | `api/contact.js` |
| Health check | A plain `GET /api/contact` only says "running" and never contacts Discord. Set `CONTACT_HEALTH_TOKEN` in Vercel and send it as the `x-health-token` header for the full report. | `api/contact.js` |
| Invite and GitHub endpoints | GET/HEAD only, cross-site requests refused, per-visitor limit, upstream timeouts, CDN caching. | `api/invite.js`, `api/github.js` |
| Regression guard | `npm run check` (also runs in CI) fails if an inline script or inline `on...=` handler is added, or if the CSP is weakened. | `scripts/check.mjs` |

Why no inline scripts matters: if an attacker ever managed to inject markup, the browser would refuse to run it.

## In the Vercel dashboard (5 minutes, no redeploy needed)

The in-memory limits in the API files are per server instance, so a distributed attacker could get around them. The Firewall rules below run **before** your code and are the real protection against spam and DDoS.

Project > **Firewall** > **Configure**:

1. **Rate-limit the contact form.** New rule: *Request Path equals `/api/contact`* AND *Method equals `POST`* → **Rate Limit**, fixed window 60 s, 5 requests, key = IP, then **Deny** (or 429). If your plan offers it, add a persistent block of 10 to 15 minutes.
2. **Rate-limit all API routes.** *Request Path starts with `/api/`* → Rate Limit 60 requests per 60 s per IP, then 429.
3. **Turn on Bot Protection** (Firewall > Bot Management) in **Challenge** mode so obvious automated traffic gets a browser check.
4. **Know the panic button.** If you are ever under attack, enable **Attack Challenge Mode** (Firewall > Configure). It challenges every visitor and takes effect immediately. Turn it off afterwards.
5. **Optional:** Settings > Billing > set a **Spend Management** limit so an attack can never turn into a surprise bill.

Vercel absorbs network-level (L3/L4) DDoS automatically on every plan. Rule limits per plan change over time, so check the Firewall page for what yours includes.

Note: firewall rules written inside `vercel.json` (`routes` + `mitigate`) cannot be combined with the `headers` and `redirects` this project needs, so the rules above live in the dashboard.

## Environment variables

| Name | Needed | Purpose |
| --- | --- | --- |
| `CONTACT_WEBHOOK_URL` | yes | Discord webhook for the contact form. Server-side only, never sent to the browser. |
| `CONTACT_HEALTH_TOKEN` | optional | Unlocks the detailed health report. Use a long random string. |
| `CONTACT_PING_USER_ID` | optional | Who gets pinged. |
| `GITHUB_TOKEN` | optional | Raises GitHub's rate limit. No scopes needed. |

If the webhook URL is ever exposed (committed, pasted in a screenshot), delete the webhook in Discord and create a new one.

## What cannot be hidden

Anything the browser runs (HTML, CSS, JavaScript, images) can be read by any visitor with DevTools, however it is delivered. What this setup does instead: keeps secrets out of that code entirely (the webhook lives only on the server), stops internal files (docs, scripts, config) being served, tells search engines not to index the code folders, and makes injected code unable to run.

## Reporting a vulnerability

See `/.well-known/security.txt`.
