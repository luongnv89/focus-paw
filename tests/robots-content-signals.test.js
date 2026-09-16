/**
 * robots.txt Content Signals test — guards issue #108 acceptance criteria.
 *
 * The isitagentready.com `botAccessControl.contentSignals` check requires
 * `Content-Signal` directives declaring ai-train, search and ai-input
 * preferences in the landing page's robots.txt.
 */

import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

describe('robots.txt content signals (#108)', () => {
  const robots = fs.readFileSync(
    path.join(repoRoot, 'landing-page', 'public', 'robots.txt'),
    'utf8',
  );

  test('declares Content-Signal directive with ai-train, search and ai-input', () => {
    const lines = robots.split('\n').filter((line) => line.startsWith('Content-Signal:'));
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const directive = lines.join(' ');
    expect(directive).toMatch(/ai-train\s*=\s*no/);
    expect(directive).toMatch(/search\s*=\s*yes/);
    expect(directive).toMatch(/ai-input\s*=\s*no/);
  });

  test('keeps crawler access and sitemap intact', () => {
    expect(robots).toMatch(/^User-agent: \*/m);
    expect(robots).toMatch(/^Allow: \//m);
    expect(robots).toMatch(/^Sitemap: https:\/\/focus-paw\.luongnv\.com\/sitemap\.xml$/m);
  });
});
