// Regenerates the Google structured data (JSON-LD in index.html), llms.txt and the sitemap date
// from js/data/servers.js and the FAQ in index.html.      Run: npm run seo
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, t) => fs.writeFileSync(path.join(root, p), t);

// ---- edit these if your details change ----
const SITE = {
  url: 'https://ambersaint.vercel.app/',
  name: 'Amber Saint', handle: 'amber_saint17',
  email: 'valeriuselysium@gmail.com',
  title: 'Amber Saint | Project Manager, Server Administrator & Bot Developer',
  description: 'Amber Saint is a project manager, server administrator and Discord bot developer. I run large Discord communities and build the bots and systems that keep them moving. 10M+ members reached.',
  discordUser: 'https://discord.com/users/1542873663278293150',
  discordServer: 'https://discord.gg/KhCgDPAABg',
  github: 'https://github.com/ambersaint17',
  roblox: 'https://www.roblox.com/users/7982369047/profile',
  towerRepo: 'https://github.com/ambersaint17/-OPEN-Tower',
  towerVideo: 'https://youtu.be/y-10hRfeIN4',
  image: 'assets/icons/icon-512.png', ogImage: 'assets/og/og-image.png',
};

const strip = (t) => t.replace(/<sup>TM<\/sup>/g, '\u2122').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8599;/g, '').trim();
const servers = vm.runInNewContext(read('js/data/servers.js') + '\n;R', {});
const html = read('index.html');
const faqHtml = html.slice(html.indexOf('<section id="faq"'));
const faq = [...faqHtml.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)].map((m) => [strip(m[1]), strip(m[2])]);

const U = SITE.url, PER = { '@id': U + '#person' };
const graph = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'Person', '@id': U + '#person', name: SITE.name, alternateName: [SITE.handle, 'Amber Saint17', 'AmberSaint'],
    identifier: { '@type': 'PropertyValue', propertyID: 'Discord username', value: SITE.handle },
    url: U, mainEntityOfPage: { '@id': U + '#profile' }, image: U + SITE.image,
    jobTitle: 'Project Manager, Server Administrator and Bot Developer', description: SITE.description, email: SITE.email,
    hasOccupation: ['Project Manager', 'Discord Server Administrator', 'Discord Bot Developer'].map((name) => ({ '@type': 'Occupation', name })),
    knowsAbout: ['Discord community management', 'Discord bot development', 'Open source software', 'Project management', 'Server administration', 'Moderation', 'Community marketing', 'Roblox development', '3D modelling'],
    makesOffer: ['Discord bot development', 'Discord community and staff management', 'Project management'].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, provider: PER } })),
    memberOf: servers.map((r) => ({ '@type': 'OrganizationRole', roleName: strip(r[1]), memberOf: { '@type': 'Organization', name: strip(r[0]) } })),
    sameAs: [SITE.github, SITE.roblox, SITE.discordUser] },
  { '@type': 'SoftwareSourceCode', '@id': U + '#tower', name: 'Tower',
    description: 'An open-source Discord bot for running a real community. Verification, moderation, tickets, levels, giveaways, logging, staff tools and more, all in one bot you host yourself.',
    codeRepository: SITE.towerRepo, programmingLanguage: 'Node.js', runtimePlatform: 'Node.js 20+', license: 'https://opensource.org/license/mit',
    author: PER, url: U + '#opensource', sameAs: SITE.towerVideo },
  { '@type': '3DModel', '@id': U + '#bb8', name: 'BB-8, Force Awakens design', creator: PER, encodingFormat: 'model/gltf-binary', contentUrl: U + 'assets/models/bb-8.glb' },
  { '@type': '3DModel', '@id': U + '#r2d2', name: 'R2-D2, original trilogy design', creator: PER, encodingFormat: 'model/gltf-binary', contentUrl: U + 'assets/models/r2-d2.glb' },
  { '@type': 'WebSite', '@id': U + '#website', url: U, name: SITE.name, alternateName: SITE.handle, description: SITE.description, inLanguage: 'en', publisher: PER },
  { '@type': 'ProfilePage', '@id': U + '#profile', url: U, name: SITE.title, inLanguage: 'en', dateModified: new Date().toISOString().slice(0, 10),
    isPartOf: { '@id': U + '#website' }, mainEntity: PER, about: PER,
    primaryImageOfPage: { '@type': 'ImageObject', url: U + SITE.ogImage, width: 1200, height: 630 } },
  { '@type': 'FAQPage', '@id': U + '#faq', mainEntity: faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
] };

const block = '<script type="application/ld+json">' + JSON.stringify(graph) + '</script>';
const re = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
if (!re.test(html)) throw new Error('JSON-LD block not found in index.html');
write('index.html', html.replace(re, () => block));

write('llms.txt', `# ${SITE.name}

> ${SITE.name} (also known as ${SITE.handle}) is a project manager, server administrator and Discord bot developer. For more than two years Amber has led staff teams, run marketing and growth and managed communities of up to 50,000 members, reaching 3M+ members across gaming, esports, Star Wars and tech servers.

## Key facts
- Name: ${SITE.name} (Discord username: ${SITE.handle})
- Roles: Project Manager, Server Administrator, Discord Bot Developer
- Experience: 2+ years of concurrent community management and bot making
- Reach: 3M+ members across the communities contributed to
- Built: Tower, an open-source Discord bot (MIT license) with 30+ slash commands and 17 modules
- Also built: 3D models of BB-8 and R2-D2
- Availability: open for commissions and management roles
- Time zone: GMT+5:30

## Links
- Website: ${U}
- Tower source code (MIT): ${SITE.towerRepo}
- Tower video: ${SITE.towerVideo}
- GitHub profile: ${SITE.github}
- Discord profile: ${SITE.discordUser}
- Discord server (Tower, live): ${SITE.discordServer}
- Roblox profile: ${SITE.roblox}

## Communities and roles
${servers.map((r) => `- ${strip(r[0])}: ${strip(r[1])}`).join('\n')}

## Common questions
${faq.map(([q, a]) => `### ${q}\n${a}\n`).join('\n')}`);

const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', read('sitemap.xml').replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`));
console.log(`SEO files updated: ${servers.length} communities, ${faq.length} FAQ entries, ${today}.`);
