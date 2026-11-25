// Vercel serverless function: cached Discord invite lookup.
//
// The browser asks THIS endpoint instead of Discord. Vercel's CDN caches each answer for 30 minutes
// (and serves a stale copy for up to 7 days while refreshing), so Discord is contacted rarely and the
// "Where I lead" rail never runs into Discord's rate limit. Only public invite information is returned.
//
// Usage: GET /api/invite?code=KhCgDPAABg

const CODE_RE = /^[A-Za-z0-9-]{2,40}$/;

// Light per-visitor limit so the endpoint cannot be used to hammer Discord through our server (Discord would then throttle the site's own lookups).
// CDN-cached repeats never reach this code; only cache misses count. Also add the Vercel Firewall rule in docs/SECURITY.md.
const hits = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.delete(ip); hits.set(ip, recent);
  while (hits.size > 500) hits.delete(hits.keys().next().value);
  return recent.length > 40;
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); res.status(405).json({ error: 'method' }); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.status(403).json({ error: 'forbidden' }); return; }
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) { res.setHeader('Retry-After', '30'); res.setHeader('Cache-Control', 'no-store'); res.status(429).json({ retry_after: 30 }); return; }
  const code = String((req.query && req.query.code) || '').trim();
  if (!CODE_RE.test(code)) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); res.status(400).json({ error: 'invalid code' }); return; }
  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', 'User-Agent': 'DiscordBot (https://ambersaint.vercel.app, 1.0)' },
    });
    if (r.status === 429) {
      let wait = 1;
      try { wait = (await r.json()).retry_after || 1; } catch (e) { /* keep default */ }
      res.setHeader('Retry-After', String(Math.ceil(wait)));
      res.setHeader('Cache-Control', 'no-store');
      res.status(429).json({ retry_after: wait });
      return;
    }
    if (!r.ok) {
      res.setHeader('Cache-Control', 'public, s-maxage=120');
      res.status(r.status === 404 ? 404 : 502).json({ error: 'discord ' + r.status });
      return;
    }
    const d = await r.json();
    const g = d.guild || {};
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=604800');
    res.status(200).json({
      code: d.code,
      guild: {
        id: g.id, name: g.name, icon: g.icon, banner: g.banner, splash: g.splash,
        description: g.description, features: g.features, premium_subscription_count: g.premium_subscription_count,
      },
      approximate_member_count: d.approximate_member_count,
      approximate_presence_count: d.approximate_presence_count,
    });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'upstream unavailable' });
  }
};
