// Vercel serverless function: cached GitHub stats for the open-source Tower card.
//
// GitHub only allows 60 anonymous requests per hour per IP, which a busy page can exhaust. This endpoint asks
// GitHub once and lets Vercel's CDN cache the answer for 30 minutes (stale copy served for up to 7 days).
// Optional: add a GITHUB_TOKEN environment variable (no scopes needed) to raise GitHub's limit to 5,000 per hour.
//
// Usage: GET /api/github

const REPO = 'ambersaint17/-OPEN-Tower';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); res.status(405).json({ error: 'method' }); return; }
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'ambersaint-portfolio' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  try {
    const signal = AbortSignal.timeout(8000);
    const [a, b] = await Promise.all([
      fetch('https://api.github.com/repos/' + REPO, { headers, signal }),
      fetch('https://api.github.com/repos/' + REPO + '/languages', { headers, signal }),
    ]);
    if (!a.ok) { res.setHeader('Cache-Control', 'no-store'); res.status(502).json({ error: 'github ' + a.status }); return; }
    const repo = await a.json();
    const languages = b.ok ? await b.json() : {};
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=604800');
    res.status(200).json({
      repo: { stargazers_count: repo.stargazers_count, forks_count: repo.forks_count, pushed_at: repo.pushed_at },
      languages,
    });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'upstream unavailable' });
  }
};
