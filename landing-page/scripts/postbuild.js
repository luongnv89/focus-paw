import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformPrivacyHtml } from './privacy-head.js';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

// SPA fallback so GitHub Pages serves the app shell on unknown routes
writeFileSync(join(dist, '404.html'), html);

// /privacy keeps the app shell but gets its own head for crawlers, including
// the /privacy/index.md markdown alternate (see scripts/privacy-head.js)
const privacy = transformPrivacyHtml(html);

mkdirSync(join(dist, 'privacy'), { recursive: true });
writeFileSync(join(dist, 'privacy', 'index.html'), privacy);
