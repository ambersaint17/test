# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| A 3D card only shows its still image | The `.glb` path in `data-src` is wrong or the file is missing. Names are lowercase and case sensitive on Vercel. |
| Server icons or counts missing | Discord rate-limited the request. The site retries and falls back to saved copies; if it persists, check `/api/invite?code=KhCgDPAABg` returns JSON on your deployment. |
| GitHub stats missing | GitHub allows 60 anonymous calls per hour per IP. Add an optional `GITHUB_TOKEN` environment variable in Vercel (no scopes needed). |
| Contact form fails | Set `CONTACT_WEBHOOK_URL` (and optionally `CONTACT_PING_USER_ID`, `CONTACT_FORMAT`) in Vercel, then redeploy. |
| Music does not start | Browsers only allow sound after a click: press Sound in the top bar. |
| Looks plainer on an old phone | Adaptive quality switched to the light look on purpose (`html.lite`). |
| Local dev: `/api/...` returns 404 | Expected with a plain static server; the site falls back to Discord/GitHub directly. Use `npx vercel dev` to run the functions locally. |

Run `npm run check` first: it catches missing files, renamed assets and syntax errors.
