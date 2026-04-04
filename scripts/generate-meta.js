const fs = require('fs');

const domain = process.env.DOMAIN_NAME || 'shizentaiga.com';
const baseUrl = `https://${domain}`;

let lastMod;
if (process.env.LAST_MOD) {
  lastMod = process.env.LAST_MOD; 
} else {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; 
  const jstDate = new Date(now.getTime() + jstOffset);
  lastMod = jstDate.toISOString().split('T')[0];
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

const robots = `User-agent: *
Allow: /
Crawl-delay: 1

Sitemap: ${baseUrl}/sitemap.xml`;

try {
  fs.writeFileSync('sitemap.xml', sitemap);
  fs.writeFileSync('robots.txt', robots);
  console.log(`[SUCCESS] Meta files generated for: ${baseUrl}`);
  console.log(`[INFO] lastmod is set to: ${lastMod}`);
} catch (err) {
  console.error(`[FATAL ERROR] Meta generation failed: ${err}`);
  process.exit(1); 
}