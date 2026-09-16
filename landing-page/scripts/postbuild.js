import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

// SPA fallback so GitHub Pages serves the app shell on unknown routes
writeFileSync(join(dist, '404.html'), html);

// /privacy keeps the app shell but gets its own head for crawlers
const privacy = html
  .replace(/<title>[^<]*<\/title>/, '<title>Privacy Policy — FocusPaw</title>')
  .replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    '$1FocusPaw privacy policy: all tracking data stays in local extension storage. No accounts, no telemetry, no cloud sync.$2'
  )
  .replace(
    /rel="canonical"\s+href="[^"]*"/,
    'rel="canonical" href="https://focus-paw.luongnv.com/privacy"'
  )
  .replace(
    /(property="og:url"\s+content=")[^"]*(")/,
    '$1https://focus-paw.luongnv.com/privacy$2'
  )
  .replace(
    /(property="og:title"\s+content=")[^"]*(")/,
    '$1Privacy Policy — FocusPaw$2'
  )
  .replace(
    /(name="twitter:title"\s+content=")[^"]*(")/,
    '$1Privacy Policy — FocusPaw$2'
  );

mkdirSync(join(dist, 'privacy'), { recursive: true });
writeFileSync(join(dist, 'privacy', 'index.html'), privacy);
