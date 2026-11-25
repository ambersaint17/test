
// Integrity check: node scripts/check.mjs   (also runs in CI)
//  1. every file referenced from HTML / CSS / JS / API / manifest exists
//  2. every file in assets/ is used somewhere (warning only)
//  3. every JS file parses
//  4. security guards: no inline scripts / inline event handlers (the CSP forbids them) and the CSP is still strict
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.vercel']);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  SKIP.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const all = walk(root);
const isVendored = (f) => rel(f).startsWith('vendor/') || rel(f).startsWith('node_modules/');
const scan = all.filter((f) => /\.(html|css|js|json|webmanifest|xml|txt)$/.test(f) && !rel(f).startsWith('docs/') && !isVendored(f));

const REF = /(?:https:\/\/ambersaint\.vercel\.app)?\/?((?:assets|css|js)\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|webp|svg|ico|mp3|mp4|webm|glb|js|css|woff2))/g;
const used = new Set();
const missing = [];
for (const f of scan) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(REF)) {
    const ref = m[1];
    used.add(ref);
    if (!fs.existsSync(path.join(root, ref))) missing.push(`${rel(f)} -> ${ref}`);
  }
}

const problems = [];
let errors = 0;
if (missing.length) { errors += missing.length; problems.push('MISSING FILES (referenced but not found):\n  ' + [...new Set(missing)].join('\n  ')); }

const orphans = all.map(rel).filter((f) => f.startsWith('assets/') && !/README\.md$|LICENSE/.test(f) && !f.startsWith('assets/brand/mark') && !f.startsWith('assets/logos/') && !used.has(f));
if (orphans.length) problems.push('ORPHANED (in assets/ but never referenced, safe to delete):\n  ' + orphans.join('\n  '));

for (const f of all.filter((x) => x.endsWith('.js') && !isVendored(x))) {
  try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: rel(f) }); }
  catch (e) { errors++; problems.push(`SYNTAX ERROR in ${rel(f)}: ${e.message}`); }
}

// ---- security guards -------------------------------------------------------------------------------------
for (const page of ['index.html', '404.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc=/.test(attrs) || /type=["']application\/ld\+json["']/.test(attrs)) continue;
    errors++; problems.push(`INLINE SCRIPT in ${page}: move it to js/ (the Content-Security-Policy blocks inline scripts): ${m[2].trim().slice(0, 60)}...`);
  }
  for (const m of html.matchAll(/<[a-z][^>]*\s(on[a-z]+)=["']/gi)) { errors++; problems.push(`INLINE EVENT HANDLER in ${page}: ${m[1]}= (blocked by the CSP, use addEventListener or a data- attribute)`); }
  if (/javascript:/i.test(html)) { errors++; problems.push(`javascript: URL in ${page}`); }
}
for (const f of all.filter((x) => x.endsWith('.js') && !isVendored(x) && rel(x).startsWith('js/'))) {
  const t = fs.readFileSync(f, 'utf8');
  if (/\son(?:error|load|click)=\\?["']/.test(t)) { errors++; problems.push(`INLINE EVENT HANDLER inside a template string in ${rel(f)}`); }
}
try {
  const csp = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy');
  const v = csp ? csp.value : '';
  const scriptSrc = (v.match(/script-src([^;]*)/) || [])[1] || '';
  if (!v) { errors++; problems.push('vercel.json has no Content-Security-Policy header'); }
  else {
    if (!/default-src 'self'/.test(v)) { errors++; problems.push("CSP must start from default-src 'self'"); }
    if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)) { errors++; problems.push("CSP script-src must not allow 'unsafe-inline' or 'unsafe-eval'"); }
    if (!/frame-ancestors 'none'/.test(v) || !/object-src 'none'/.test(v)) { errors++; problems.push("CSP must keep frame-ancestors 'none' and object-src 'none'"); }
  }
} catch (e) { errors++; problems.push('vercel.json could not be read as JSON: ' + e.message); }

if (problems.length) console.log(problems.join('\n\n') + '\n');
console.log(errors ? `Check failed: ${errors} problem(s).` : `Check passed: ${scan.length} files scanned, ${used.size} asset/code references verified.`);
process.exit(errors ? 1 : 0);
