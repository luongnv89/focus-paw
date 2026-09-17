/**
 * Markdown content negotiation — guards issue #110 acceptance criteria for
 * the isitagentready.com `contentAccessibility.markdownNegotiation` check.
 *
 * GitHub Pages cannot perform real `Accept: text/markdown` negotiation (it
 * emits a fixed header set), so the repository-side implementation is the
 * static equivalent recommended for static hosts:
 *
 *   landing-page/public/index.md          Markdown mirror of the landing page
 *   landing-page/public/privacy/index.md  Markdown mirror of /privacy
 *   index.html <link rel="alternate" type="text/markdown">  advertises them
 *   scripts/privacy-head.js               rewrites the alternate for /privacy
 *   public/_headers + netlify.toml        Content-Type / x-markdown-tokens
 *                                         for edge hosts that can emit them
 */

import fs from 'fs';
import path from 'path';

import { privacyPolicyContent } from '../landing-page/src/data/privacy.js';
import { featuresContent } from '../landing-page/src/data/features.js';
import { screenshotGalleryContent } from '../landing-page/src/data/screenshots.js';
import { transformPrivacyHtml } from '../landing-page/scripts/privacy-head.js';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'landing-page', 'public');
const readPublic = (...parts) =>
  fs.readFileSync(path.join(publicDir, ...parts), 'utf8');
const indexHtml = fs.readFileSync(
  path.join(repoRoot, 'landing-page', 'index.html'),
  'utf8',
);

/** Whitespace-insensitive containment so line wrapping can differ. */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('markdown mirrors exist for every deployed route (#110)', () => {
  test.each(['index.md', path.join('privacy', 'index.md')])(
    '%s is published from public/ and starts with an H1',
    (rel) => {
      const file = path.join(publicDir, rel);
      expect(fs.existsSync(file)).toBe(true);
      const body = fs.readFileSync(file, 'utf8');
      expect(body).toMatch(/^# \S/m);
      expect(body.length).toBeGreaterThan(500);
    },
  );

  test('each mirror identifies itself as a markdown alternate', () => {
    expect(readPublic('index.md')).toMatch(/text\/markdown/i);
    expect(readPublic('privacy', 'index.md')).toMatch(/text\/markdown/i);
    expect(readPublic('privacy', 'index.md')).toContain(
      'https://focus-paw.luongnv.com/privacy',
    );
  });
});

describe('markdown alternates are advertised in HTML (#110)', () => {
  test('index.html advertises /index.md as a text/markdown alternate', () => {
    expect(indexHtml).toMatch(
      /<link\b[^>]*rel="alternate"[^>]*type="text\/markdown"[^>]*href="\/index\.md"[^>]*>/,
    );
  });

  test('privacy transform retargets the alternate to /privacy/index.md', () => {
    const privacyHtml = transformPrivacyHtml(indexHtml);
    expect(privacyHtml).toMatch(
      /type="text\/markdown"\s+href="\/privacy\/index\.md"/,
    );
    expect(privacyHtml).not.toContain('href="/index.md"');
    // Existing head rewrites still apply alongside the new one
    expect(privacyHtml).toContain('<title>Privacy Policy — FocusPaw</title>');
    expect(privacyHtml).toContain(
      'rel="canonical" href="https://focus-paw.luongnv.com/privacy"',
    );
  });
});

describe('mirror content stays faithful to the rendered pages (#110)', () => {
  const mirror = readPublic('privacy', 'index.md');

  test('privacy mirror carries the policy title and last-updated stamp', () => {
    expect(mirror).toContain(`# ${privacyPolicyContent.title}`);
    expect(mirror).toContain(privacyPolicyContent.lastUpdated);
  });

  test('every privacy policy section appears as a heading with its content', () => {
    for (const section of privacyPolicyContent.sections) {
      expect(mirror).toContain(`## ${section.title}`);
      expect(norm(mirror)).toContain(norm(section.content));
    }
  });

  test('summary table answers are preserved', () => {
    expect(mirror).toContain(`## ${privacyPolicyContent.summary.title}`);
    for (const item of privacyPolicyContent.summary.items) {
      expect(mirror).toContain(item.question);
      expect(norm(mirror)).toContain(norm(item.answer));
    }
  });

  const homeMirror = readPublic('index.md');

  test('landing mirror carries the hero headline and tagline', () => {
    expect(homeMirror).toContain('Track Your Focus, Master Your Time');
    expect(norm(homeMirror)).toContain(
      norm('privacy-first Chrome extension that helps you understand your browsing habits'),
    );
  });

  test('every rendered feature appears in the landing mirror', () => {
    for (const feature of featuresContent.features) {
      expect(homeMirror).toContain(feature.title);
      expect(norm(homeMirror)).toContain(norm(feature.description));
    }
  });

  test('every screenshot caption appears in the landing mirror', () => {
    for (const shot of screenshotGalleryContent.screenshots) {
      expect(homeMirror).toContain(shot.caption);
    }
  });

  test('landing mirror links to the store listing and repository', () => {
    expect(homeMirror).toContain(
      'https://chromewebstore.google.com/detail/focusbear-focus-tracker',
    );
    expect(homeMirror).toContain('https://github.com/luongnv89/focus-paw');
  });
});

describe('markdown responses are declared for edge hosts (#110)', () => {
  /** Parse a _headers file into { path: { HeaderName: value } }. */
  const parseHeadersFile = (text) => {
    const blocks = {};
    let current = null;
    for (const line of text.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      if (/^\S/.test(line)) {
        current = line.trim();
        blocks[current] = {};
      } else if (current) {
        const idx = line.indexOf(':');
        blocks[current][line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return blocks;
  };
  const headers = parseHeadersFile(readPublic('_headers'));

  test('_headers marks .md mirrors as text/markdown with a token estimate', () => {
    for (const route of ['/index.md', '/privacy/index.md']) {
      expect(headers[route]).toEqual(expect.any(Object));
      expect(headers[route]['Content-Type']).toMatch(/^text\/markdown/);
      expect(headers[route]['x-markdown-tokens']).toMatch(/^\d+$/);
    }
  });

  test('x-markdown-tokens approximates bytes/4 of the mirror file', () => {
    for (const [route, file] of [
      ['/index.md', 'index.md'],
      ['/privacy/index.md', path.join('privacy', 'index.md')],
    ]) {
      const bytes = fs.statSync(path.join(publicDir, file)).size;
      const expected = Math.ceil(bytes / 4);
      expect(Number(headers[route]['x-markdown-tokens'])).toBe(expected);
    }
  });
});

describe('agent-facing indexes mention the mirrors (#110)', () => {
  test('llms.txt lists both markdown alternates', () => {
    const llms = readPublic('llms.txt');
    expect(llms).toContain('/index.md');
    expect(llms).toContain('/privacy/index.md');
  });
});
