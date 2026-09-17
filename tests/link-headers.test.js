/**
 * RFC 8288 Link headers for agent discovery — guards issue #109 acceptance
 * criteria for the isitagentready.com `discoverability.linkHeaders` check.
 *
 * GitHub Pages emits a fixed response-header set, so a repository change
 * cannot make it send real `Link:` headers. The repo-side implementation is
 * the maximum static equivalent, expressed in three carriers that must stay
 * in sync:
 *
 *   index.html <link> tags      — HTML equivalent, active on every host today
 *   landing-page/public/_headers — portable file for Netlify/Cloudflare Pages
 *   landing-page/netlify.toml    — Netlify-native declaration of the same set
 *
 * The relations used (api-catalog, service-desc, service-doc, describedby)
 * are the registered relation types named by the implementation guide.
 */

import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'landing-page', 'public');
const indexHtml = fs.readFileSync(
  path.join(repoRoot, 'landing-page', 'index.html'),
  'utf8',
);
const headersFile = fs.readFileSync(path.join(publicDir, '_headers'), 'utf8');
const netlifyToml = fs.readFileSync(
  path.join(repoRoot, 'landing-page', 'netlify.toml'),
  'utf8',
);

const DISCOVERY_RELS = ['api-catalog', 'service-desc', 'service-doc', 'describedby'];

/** Parse `<link>` tags in HTML into { rel, href, type } records. */
const htmlLinks = [...indexHtml.matchAll(/<link\b[^>]*>/g)].map(([tag]) => ({
  rel: tag.match(/rel="([^"]*)"/)?.[1],
  href: tag.match(/href="([^"]*)"/)?.[1],
  type: tag.match(/type="([^"]*)"/)?.[1],
}));

/** Parse an RFC 8288 Link value ("<href>; rel=…, <href>; rel=…"). */
const parseLinkValue = (value) =>
  value
    .split(/,\s*(?=<)/)
    .map((item) => ({
      href: item.match(/<([^>]+)>/)?.[1],
      rel: item.match(/rel="?([^";]+)"?/)?.[1],
      type: item.match(/type="([^"]*)"/)?.[1],
    }))
    .filter((link) => link.href && link.rel);

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

const headers = parseHeadersFile(headersFile);
const tomlLink = netlifyToml.match(/^\s*Link\s*=\s*'([^']*)'/m)?.[1];

const htmlDiscovery = htmlLinks.filter((l) => DISCOVERY_RELS.includes(l.rel));
const headerDiscovery = parseLinkValue(headers['/']?.Link ?? '').filter((l) =>
  DISCOVERY_RELS.includes(l.rel),
);
const tomlDiscovery = parseLinkValue(tomlLink ?? '').filter((l) =>
  DISCOVERY_RELS.includes(l.rel),
);

describe('homepage advertises discovery links (#109)', () => {
  test('index.html carries all four registered relation types', () => {
    for (const rel of DISCOVERY_RELS) {
      expect(htmlLinks.some((l) => l.rel === rel)).toBe(true);
    }
  });

  test('each discovery link points at the published document', () => {
    const expected = {
      'api-catalog': '/.well-known/api-catalog',
      'service-desc': '/.well-known/openapi.json',
      'service-doc': '/llms.txt',
      describedby: '/.well-known/ai-catalog.json',
    };
    for (const [rel, href] of Object.entries(expected)) {
      const tag = htmlLinks.find((l) => l.rel === rel);
      expect(tag?.href).toBe(href);
      // The target must be a real file deployed from public/
      expect(fs.existsSync(path.join(publicDir, href))).toBe(true);
    }
  });

  test('discovery links carry their media types', () => {
    const byRel = Object.fromEntries(htmlDiscovery.map((l) => [l.rel, l.type]));
    expect(byRel['api-catalog']).toBe('application/linkset+json');
    expect(byRel['service-desc']).toBe('application/vnd.oai.openapi+json');
    expect(byRel['service-doc']).toBe('text/plain');
    expect(byRel['describedby']).toBe('application/json');
  });
});

describe('portable _headers declares the same Link set (#109)', () => {
  test('_headers exists and covers the homepage path', () => {
    expect(headers['/']).toEqual(expect.any(Object));
    expect(headers['/'].Link).toEqual(expect.any(String));
    expect(headers['/'].Vary).toBe('Accept');
  });

  test('the / Link value carries all four discovery relations', () => {
    for (const rel of DISCOVERY_RELS) {
      expect(headerDiscovery.some((l) => l.rel === rel)).toBe(true);
    }
  });

  test('/privacy gets its own Link block with the privacy markdown alternate', () => {
    expect(headers['/privacy']?.Link).toEqual(expect.any(String));
    const privacyLinks = parseLinkValue(headers['/privacy'].Link);
    for (const rel of DISCOVERY_RELS) {
      expect(privacyLinks.some((l) => l.rel === rel)).toBe(true);
    }
    const alternate = privacyLinks.find((l) => l.rel === 'alternate');
    expect(alternate?.href).toBe('/privacy/index.md');
    expect(alternate?.type).toBe('text/markdown');
  });

  test('the / Link block advertises the homepage markdown alternate', () => {
    const alternate = parseLinkValue(headers['/'].Link).find(
      (l) => l.rel === 'alternate',
    );
    expect(alternate?.href).toBe('/index.md');
    expect(alternate?.type).toBe('text/markdown');
  });
});

describe('all three carriers agree (#109)', () => {
  const key = (l) => `${l.rel}=${l.href}`;
  const setOf = (links) => new Set(links.map(key));

  test('index.html, _headers and netlify.toml declare the same rel/href pairs', () => {
    const htmlSet = setOf(htmlDiscovery);
    const headersSet = setOf(headerDiscovery);
    const tomlSet = setOf(tomlDiscovery);

    expect(tomlLink).toEqual(expect.any(String));
    expect(htmlSet).toEqual(headersSet);
    expect(headersSet).toEqual(tomlSet);
  });

  test('media types agree between the HTML tags and the Link values', () => {
    const htmlType = Object.fromEntries(
      htmlDiscovery.map((l) => [`${l.rel}|${l.href}`, l.type]),
    );
    for (const link of headerDiscovery) {
      expect(link.type).toBe(htmlType[`${link.rel}|${link.href}`]);
    }
  });
});
