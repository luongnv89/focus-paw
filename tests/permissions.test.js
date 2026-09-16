/**
 * Regression: locks the manifest's permission set against accidental change.
 *
 * Per issue #55 (4.5 Least-privilege permissions review):
 *   - `host_permissions` must be empty (the broad grant moved to
 *     `optional_host_permissions` so the user is prompted at runtime
 *     instead of granting origin access to every page at install time).
 *   - `optional_host_permissions` must contain exactly `<all_urls>`.
 *   - `declarativeNetRequest` and `declarativeNetRequestWithHostAccess`
 *     must both be present so the redirect-to-block-page action keeps
 *     working.
 *   - The non-DNR API permissions must stay at the recorded minimum.
 *
 * If you intentionally add or remove a permission, update this list AND
 * the per-permission table in PRIVACY.md.
 */
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

describe('manifest.json permission set (4.5 least-privilege review)', () => {
  let manifest;

  beforeAll(() => {
    manifest = readManifest();
  });

  test('manifest parses as JSON and is MV3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('recorded required API permissions are present and unchanged', () => {
    const REQUIRED = [
      'tabs',
      'storage',
      'notifications',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
    ];
    const declared = (manifest.permissions || []).slice().sort();
    expect(declared).toEqual([...REQUIRED].sort());
  });

  test('host_permissions is empty/absent (broad grant moved to optional_host_permissions)', () => {
    const host = manifest.host_permissions;
    // Acceptable: key absent, empty array, or all entries empty.
    const normalized = Array.isArray(host) ? host : [];
    expect(normalized).toEqual([]);
  });

  test('optional_host_permissions contains exactly <all_urls>', () => {
    const optional = (manifest.optional_host_permissions || []).slice().sort();
    expect(optional).toEqual(['<all_urls>']);
  });

  test('content_scripts matches stay at <all_urls> (toast needs any-page injection)', () => {
    const matches = (manifest.content_scripts || []).flatMap((cs) => cs.matches || []);
    expect(matches).toEqual(['<all_urls>']);
  });

  test('forbidden permissions are not requested', () => {
    // The extension must not silently widen its grant. Update PRIVACY.md and
    // this list if any of these is intentionally added.
    const FORBIDDEN = [
      'cookies',
      'history',
      'bookmarks',
      'geolocation',
      'clipboardRead',
      'clipboardWrite',
      'topSites',
      'contentSettings',
      'webRequest',
      'webRequestBlocking',
      'unlimitedStorage',
    ];
    const declared = manifest.permissions || [];
    const overlap = declared.filter((p) => FORBIDDEN.includes(p));
    expect(overlap).toEqual([]);
  });

  test('Map CSP allows OSM tiles and HTTPS lookups, not ip-api or unpkg', () => {
    const csp = manifest.content_security_policy?.extension_pages || '';
    expect(csp).toMatch(/img-src[^;]*https:\/\/\*\.tile\.openstreetmap\.org/);
    expect(csp).toMatch(/img-src[^;]*data:/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/cloudflare-dns\.com/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/ipwho\.is/);
    expect(csp).not.toMatch(/ip-api/i);
    expect(csp).not.toMatch(/unpkg/i);
    expect(csp).not.toMatch(/cartocdn/i);
  });
});
