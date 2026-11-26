// Vercel serverless function: receives the website contact form and posts it to a private Discord channel
// as a Components V2 card (with a ping and reply buttons). If Discord ever refuses that format,
// it automatically falls back to a classic embed, so an enquiry is never lost.
//
// The webhook URL is read ONLY from the CONTACT_WEBHOOK_URL environment variable
// (Vercel > Project > Settings > Environment Variables). It is never sent to the browser.
// Optional: CONTACT_FORMAT=embed forces the classic embed; CONTACT_PING_USER_ID changes who is pinged.
//
// Health check: a plain GET only says the function is running. To see whether the webhook variable is set and whether
// Discord accepts it, set CONTACT_HEALTH_TOKEN in Vercel and send it as a header:
//   curl -H "x-health-token: <your token>" https://YOUR-SITE/api/contact
// It never shows the webhook itself, and an unauthenticated GET never contacts Discord (so it cannot be used to burn the webhook's rate limit).
//
// Abuse protection (defence in depth): same-origin check, JSON only, size cap, honeypot + timing trap, per-visitor and global
// rate limits, duplicate suppression and a Discord timeout. The in-memory limits are per server instance, so also add the
// Vercel Firewall rate-limit rule described in docs/SECURITY.md, which is enforced before this code runs.

const { timingSafeEqual } = require('node:crypto');
const PING = process.env.CONTACT_PING_USER_ID || '1542873663278293150';
const SITE = 'ambersaint.vercel.app';
const BANNER = `https://${SITE}/assets/images/brand/banner-enquiry.png`;
const TYPES = ['Project Management', 'Server Administration', 'Moderation Management', 'Marketing and Growth', 'Documentation', 'Custom Discord Bot', 'Something Else'];
const HOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?(?:discord|discordapp)\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+(?:\?.*)?$/;
const IS_COMPONENTS_V2 = 1 << 15;
const DISCORD_ID_RE = /^\d{17,20}$/;
const hits = new Map();
const seen = new Map();   // message fingerprint -> time, to drop copy-paste floods
let globalHits = [];

// Vercel sets these itself, so a visitor cannot spoof them the way they can a client-sent X-Forwarded-For.
const clientIp = (req) => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim()
  || String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || 'unknown';

// Best-effort limits: 3 per minute and 8 per hour per visitor, 60 per hour for the whole site.
function limited(ip) {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < 3600000);
  if (globalHits.length >= 60) return true;
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  recent.push(now);
  hits.delete(ip); hits.set(ip, recent);                       // re-insert so the Map stays ordered by recency
  while (hits.size > 500) hits.delete(hits.keys().next().value); // evict the oldest, never wipe everyone's counters at once
  const over = recent.filter((t) => now - t < 60000).length > 3 || recent.length > 8;
  if (!over) globalHits.push(now);
  return over;
}

function duplicate(d) {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 600000) seen.delete(k);
  const key = [d.discord, d.email, d.message].join('|').toLowerCase();
  if (seen.has(key)) return true;
  seen.set(key, now);
  if (seen.size > 300) seen.delete(seen.keys().next().value);
  return false;
}

// Only accept submissions that come from this site's own pages (blocks other sites and scripts posting to the endpoint from a browser).
function sameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients are handled by the rate limits and the honeypot
  try {
    const h = new URL(origin).host;
    if (h === SITE || h === process.env.VERCEL_URL || h === process.env.VERCEL_BRANCH_URL) return true;
    return process.env.VERCEL_ENV !== 'production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h);
  } catch (e) { return false; }
}

// Tolerates stray spaces, a trailing newline or surrounding quotes pasted into Vercel.
const hookUrl = () => String(process.env.CONTACT_WEBHOOK_URL || '').trim().replace(/^["']+|["']+$/g, '').trim();

const line = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const esc = (s) => String(s).replace(/([\\*_~|`>\[\]()#])/g, '\\$1');   // stops a visitor's name breaking the card layout
const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';

// ---- The Components V2 card -------------------------------------------------------------
function cardPayload({ name, discord, email, type, message }) {
  // Keep the visitor's paragraph breaks without wrapping every line in Discord's bulky quote bar.
  const body = message.replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.trim() ? esc(l.trim()) : '')
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Discord only allows web links on buttons, so "reply by email" opens a Gmail compose window.
  let gmail = '';
  if (email) {
    const base = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) + '&su=' + encodeURIComponent('Re: your enquiry to Amber Saint');
    const withBody = base + '&body=' + encodeURIComponent('Hi ' + (name ? name.slice(0, 30) : 'there') + ',\n\nThanks for getting in touch.\n\n');
    gmail = withBody.length <= 500 ? withBody : base;
  }

  const buttons = [];
  if (email) buttons.push({ type: 2, style: 5, label: 'Reply By E-mail', url: gmail });
  if (discord) {
    buttons.push({ type: 2, style: 5, label: 'Open Discord Profile', url: 'https://discord.com/users/' + discord });
  }

  const details = [
    `**Author:**  ${name ? esc(name) : 'Not given'}`,
    `**Discord ID:**  ${discord ? code(discord) : 'Not given'}`,
    `**Email:**  ${email ? code(email) : 'Not given'}`,
  ].join('\n');

  const parts = [
    { type: 12, items: [{ media: { url: BANNER }, description: 'New enquiry from the website' }] },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: `### ${type}\n-# ${SITE} · <t:${Math.floor(Date.now() / 1000)}:R>` },
    { type: 10, content: `### Message\n${body}` },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: details },
  ];
  if (buttons.length) parts.push({ type: 14, divider: true, spacing: 2 }, { type: 1, components: buttons });
  parts.push({ type: 10, content: `-# Powered by Discord ID ${code(PING)} · ${SITE}` });

  return {
    flags: IS_COMPONENTS_V2,
    allowed_mentions: { users: [PING] }, // only you can be pinged, never anything a visitor types
    // Components V2 rejects legacy top-level content/embeds, so keep the ping in a Text Display.
    components: [
      { type: 10, content: `<@${PING}> New website enquiry received` },
      { type: 17, accent_color: 0x2997ff, components: parts },
    ],
  };
}

// ---- Classic embed (automatic fallback) ---------------------------------------------------
function embedPayload({ name, discord, email, type, message }) {
  return {
    content: `<@${PING}>, you have a new message from the website.`,
    allowed_mentions: { users: [PING] },
    embeds: [{
      title: 'New Website Enquiry!',
      description: message,
      color: 0x2997ff,
      fields: [
        { name: 'Name', value: name || 'Not given', inline: true },
        { name: 'Discord ID', value: discord || 'Not given', inline: true },
        { name: 'Email', value: email || 'Not given', inline: true },
        { name: 'Needs', value: type },
      ],
      footer: { text: SITE },
      timestamp: new Date().toISOString(),
    }],
  };
}

const send = (url, payload) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });

async function health(full) {
  if (!full) return { function: 'running' };
  const hook = hookUrl();
  const out = { function: 'running', webhookConfigured: Boolean(hook), webhookFormatOk: HOOK_RE.test(hook) };
  if (!out.webhookConfigured) out.hint = 'CONTACT_WEBHOOK_URL is not set for this deployment. Add it in Vercel (Production), then redeploy.';
  else if (!out.webhookFormatOk) out.hint = 'CONTACT_WEBHOOK_URL is set but does not look like a Discord webhook URL. Paste the full URL, nothing else.';
  else {
    try {
      const r = await fetch(hook.split('?')[0], { signal: AbortSignal.timeout(5000) }); // reading a webhook posts nothing
      out.discordStatus = r.status;
      out.webhookValid = r.ok;
      out.hint = r.ok ? 'All good. Submitting the form will post to your channel.' : 'Discord rejected this webhook (it was deleted or replaced). Create a new webhook and update CONTACT_WEBHOOK_URL.';
    } catch (e) {
      out.hint = 'Could not reach Discord from the server. Try again in a minute.';
    }
  }
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET') {
    const token = process.env.CONTACT_HEALTH_TOKEN;
    const given = String(req.headers['x-health-token'] || '');
    const okToken = Boolean(token) && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
    return res.status(200).json(await health(okToken));
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return res.status(415).json({ ok: false, error: 'type' });
  if (Number(req.headers['content-length'] || 0) > 8192) return res.status(413).json({ ok: false, error: 'too_large' });

  const hook = hookUrl();
  if (!HOOK_RE.test(hook)) return res.status(500).json({ ok: false, error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  if (!b || typeof b !== 'object' || Array.isArray(b)) b = {};

  // Bots fill the hidden field or submit instantly. Pretend it worked and drop it.
  if (b.website || !(Number(b.elapsed) >= 1200)) return res.status(200).json({ ok: true });

  if (limited(clientIp(req))) return res.status(429).json({ ok: false, error: 'rate_limited' });

  const data = {
    message: text(b.message, 1500),
    name: line(b.name, 60),
    discord: line(b.discord, 64),
    email: line(b.email, 120),
    type: TYPES.includes(b.type) ? b.type : 'Something Else',
  };
  if (data.message.length < 5) return res.status(400).json({ ok: false, error: 'message' });
  if (data.discord && !DISCORD_ID_RE.test(data.discord)) return res.status(400).json({ ok: false, error: 'discord_id' });
  if (!data.discord && !data.email) return res.status(400).json({ ok: false, error: 'contact' });
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return res.status(400).json({ ok: false, error: 'email' });
  if (duplicate(data)) return res.status(200).json({ ok: true }); // same enquiry sent twice: acknowledge, do not post again

  try {
    let format = 'embed';
    let r;
    if (String(process.env.CONTACT_FORMAT || '').toLowerCase() !== 'embed') {
      const u = new URL(hook);
      u.searchParams.set('with_components', 'true'); // lets a plain webhook send the V2 layout and link buttons
      r = await send(u.toString(), cardPayload(data));
      format = 'card';
      // Discord refused the card format for some reason: send the classic embed instead.
      if (!r.ok && r.status >= 400 && r.status < 500 && ![401, 404, 429].includes(r.status)) {
        r = await send(hook, embedPayload(data));
        format = 'embed';
      }
    } else {
      r = await send(hook, embedPayload(data));
    }
    if (!r.ok) return res.status(502).json({ ok: false, error: 'discord_' + r.status });
    return res.status(200).json({ ok: true, format });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
};
