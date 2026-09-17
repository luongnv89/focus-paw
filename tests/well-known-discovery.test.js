/**
 * .well-known agent-discovery documents — guards issues #112–#117 acceptance
 * criteria for the isitagentready.com discovery checks.
 *
 * The landing page publishes a static discovery tree under
 * `landing-page/public/.well-known/`, which Vite copies verbatim into `dist/`
 * and the gh-pages deploy then serves:
 *
 *   /.well-known/agent-card.json          A2A agent card            (#112)
 *   /.well-known/agent-skills/index.json  Agent skills index        (#113)
 *   /.well-known/api-catalog              RFC 9727 linkset          (#114)
 *   /.well-known/ai-catalog.json          ARD manifest              (#115)
 *   /.well-known/mcp/server-card.json     MCP server card (SEP-1649)(#117)
 *   /.well-known/openapi.json             OpenAPI description       (supports #114)
 *   /.well-known/oauth-authorization-server  RFC 8414 AS metadata  (#118)
 *   /.well-known/openid-configuration     OIDC discovery doc        (#118)
 *   /.well-known/oauth-protected-resource RFC 9728 PRM document     (#119)
 *   /.well-known/jwks.json                empty JWKS behind jwks_uri
 *   /auth.md                              auth.md agent registration(#116)
 *   /.nojekyll                            keeps dot-directories served on GH Pages
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'landing-page', 'public');
const wellKnown = (...parts) => path.join(publicDir, '.well-known', ...parts);

const readJson = (...parts) =>
  JSON.parse(fs.readFileSync(wellKnown(...parts), 'utf8'));

const SITE = 'https://focus-paw.luongnv.com';

describe('.well-known hosting prerequisites', () => {
  test('.nojekyll exists so GitHub Pages serves dot-directories', () => {
    expect(fs.existsSync(path.join(publicDir, '.nojekyll'))).toBe(true);
  });
});

describe('A2A agent card (#112)', () => {
  const card = readJson('agent-card.json');

  test('declares name, version and description', () => {
    expect(card.name).toEqual(expect.any(String));
    expect(card.name.length).toBeGreaterThan(0);
    expect(card.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(card.description).toEqual(expect.any(String));
    expect(card.description.length).toBeGreaterThan(0);
  });

  test('declares supportedInterfaces with a service URL and transport protocol', () => {
    expect(Array.isArray(card.supportedInterfaces)).toBe(true);
    expect(card.supportedInterfaces.length).toBeGreaterThanOrEqual(1);
    for (const iface of card.supportedInterfaces) {
      expect(iface.url).toMatch(/^https:\/\//);
      expect(
        typeof iface.protocolBinding === 'string' ||
          typeof iface.transport === 'string',
      ).toBe(true);
    }
  });

  test('declares capabilities and skills with id/name/description', () => {
    expect(card.capabilities).toEqual(expect.any(Object));
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.skills.length).toBeGreaterThanOrEqual(1);
    for (const skill of card.skills) {
      expect(skill.id).toEqual(expect.any(String));
      expect(skill.name).toEqual(expect.any(String));
      expect(skill.description).toEqual(expect.any(String));
    }
  });
});

describe('agent skills discovery index (#113)', () => {
  const index = readJson('agent-skills', 'index.json');

  test('uses the agentskills.io discovery 0.2.0 schema', () => {
    expect(index.$schema).toBe(
      'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    );
  });

  test('lists skills with name, type, description, url and digest', () => {
    expect(Array.isArray(index.skills)).toBe(true);
    expect(index.skills.length).toBeGreaterThanOrEqual(1);
    for (const skill of index.skills) {
      expect(skill.name).toMatch(/^[a-z0-9-]+$/);
      expect(['skill-md', 'archive']).toContain(skill.type);
      expect(skill.description).toEqual(expect.any(String));
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.url).toMatch(/^https:\/\//);
      expect(skill.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
  });

  test('each skill URL resolves to a published artifact whose digest matches', () => {
    for (const skill of index.skills) {
      const urlPath = new URL(skill.url).pathname;
      expect(urlPath.startsWith('/.well-known/')).toBe(true);
      const artifact = path.join(publicDir, urlPath);
      expect(fs.existsSync(artifact)).toBe(true);
      const actual =
        'sha256:' +
        crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
      expect(skill.digest).toBe(actual);
    }
  });
});

describe('RFC 9727 API catalog (#114)', () => {
  const catalog = readJson('api-catalog');

  test('is a linkset document with anchored entries', () => {
    expect(Array.isArray(catalog.linkset)).toBe(true);
    expect(catalog.linkset.length).toBeGreaterThanOrEqual(1);
    for (const entry of catalog.linkset) {
      expect(entry.anchor).toMatch(/^https:\/\//);
      const relations = Object.keys(entry).filter((key) => key !== 'anchor');
      expect(relations.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('advertises a machine-readable service description', () => {
    const links = catalog.linkset.flatMap((entry) => [
      ...(entry['service-desc'] || []),
      ...(entry['service-doc'] || []),
    ]);
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link.href).toMatch(/^https:\/\//);
    }
    const serviceDescHrefs = catalog.linkset.flatMap((entry) =>
      (entry['service-desc'] || []).map((link) => link.href),
    );
    for (const href of serviceDescHrefs) {
      const urlPath = new URL(href).pathname;
      if (urlPath.startsWith('/.well-known/')) {
        expect(fs.existsSync(path.join(publicDir, urlPath))).toBe(true);
      }
    }
  });
});

describe('ARD manifest (#115)', () => {
  const catalog = readJson('ai-catalog.json');

  test('declares specVersion, host and a non-empty entries array', () => {
    expect(catalog.specVersion).toEqual(expect.any(String));
    expect(catalog.specVersion.length).toBeGreaterThan(0);
    expect(catalog.host.displayName).toEqual(expect.any(String));
    expect(catalog.host.identifier).toEqual(expect.any(String));
    expect(Array.isArray(catalog.entries)).toBe(true);
    expect(catalog.entries.length).toBeGreaterThanOrEqual(1);
  });

  test('each entry has identifier, displayName, type and exactly one of url/data', () => {
    for (const entry of catalog.entries) {
      expect(entry.identifier).toMatch(/^urn:air:focus-paw\.luongnv\.com:/);
      expect(entry.displayName).toEqual(expect.any(String));
      expect(entry.type).toMatch(/^[-\w.+]+\/[-\w.+]+$/);
      expect('url' in entry).not.toBe('data' in entry);
      if ('url' in entry) {
        expect(entry.url).toMatch(/^https:\/\//);
      }
      expect(Array.isArray(entry.representativeQueries)).toBe(true);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
    }
  });

  test('entries reference the discovery documents published by this repo', () => {
    const urls = catalog.entries.map((entry) => entry.url);
    const expected = [
      `${SITE}/.well-known/agent-card.json`,
      `${SITE}/.well-known/mcp/server-card.json`,
      `${SITE}/.well-known/agent-skills/index.json`,
      `${SITE}/.well-known/api-catalog`,
    ];
    for (const url of expected) {
      expect(urls).toContain(url);
    }
    // And every entry URL under /.well-known/ resolves to a real file.
    for (const url of urls) {
      const urlPath = new URL(url).pathname;
      if (urlPath.startsWith('/.well-known/')) {
        expect(fs.existsSync(path.join(publicDir, urlPath))).toBe(true);
      }
    }
  });

  test('is discoverable via robots.txt Agentmap and HTML link tag', () => {
    const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
    expect(robots).toMatch(
      /^Agentmap: https:\/\/focus-paw\.luongnv\.com\/\.well-known\/ai-catalog\.json$/m,
    );
    const html = fs.readFileSync(
      path.join(repoRoot, 'landing-page', 'index.html'),
      'utf8',
    );
    expect(html).toMatch(/rel="ai-catalog"\s+href="\/.well-known\/ai-catalog\.json"/);
  });
});

describe('MCP server card (#117)', () => {
  const card = readJson('mcp', 'server-card.json');

  test('declares serverInfo with name and version', () => {
    expect(card.serverInfo).toEqual(expect.any(Object));
    expect(card.serverInfo.name).toEqual(expect.any(String));
    expect(card.serverInfo.name.length).toBeGreaterThan(0);
    expect(card.serverInfo.version).toEqual(expect.any(String));
  });

  test('declares a transport endpoint URL', () => {
    const endpoint = card.transport?.endpoint ?? card.endpoint;
    expect(endpoint).toMatch(/^https:\/\//);
  });

  test('declares capabilities (tools, resources, prompts)', () => {
    expect(card.capabilities).toEqual(expect.any(Object));
    for (const key of ['tools', 'resources', 'prompts']) {
      expect(card.capabilities).toHaveProperty(key);
    }
  });

  test('also satisfies the current SEP-2127 wire shape (name/remotes)', () => {
    expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    expect(card.description.length).toBeLessThanOrEqual(100);
    expect(Array.isArray(card.remotes)).toBe(true);
    for (const remote of card.remotes) {
      expect(['streamable-http', 'sse']).toContain(remote.type);
      expect(remote.url).toMatch(/^https:\/\//);
    }
  });
});

describe('OAuth authorization server metadata (#118)', () => {
  const as = readJson('oauth-authorization-server');

  test('declares RFC 8414 issuer and endpoints', () => {
    expect(as.issuer).toBe(SITE.replace(/\/$/, ''));
    expect(as.authorization_endpoint).toMatch(/^https:\/\//);
    expect(as.token_endpoint).toMatch(/^https:\/\//);
    expect(as.jwks_uri).toMatch(/^https:\/\//);
  });

  test('lists grant types and response types', () => {
    expect(Array.isArray(as.grant_types_supported)).toBe(true);
    expect(as.grant_types_supported.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(as.response_types_supported)).toBe(true);
    expect(as.response_types_supported.length).toBeGreaterThanOrEqual(1);
  });

  test('advertised jwks_uri resolves to a published JWKS document', () => {
    const urlPath = new URL(as.jwks_uri).pathname;
    const jwks = JSON.parse(
      fs.readFileSync(path.join(publicDir, urlPath), 'utf8'),
    );
    expect(Array.isArray(jwks.keys)).toBe(true);
  });

  test('publishes an OIDC openid-configuration companion document', () => {
    const oidc = readJson('openid-configuration');
    expect(oidc.issuer).toBe(as.issuer);
    expect(oidc.authorization_endpoint).toMatch(/^https:\/\//);
    expect(oidc.jwks_uri).toBe(as.jwks_uri);
    expect(Array.isArray(oidc.response_types_supported)).toBe(true);
    expect(Array.isArray(oidc.subject_types_supported)).toBe(true);
    expect(Array.isArray(oidc.id_token_signing_alg_values_supported)).toBe(true);
  });
});

describe('OAuth protected resource metadata (#119)', () => {
  const prm = readJson('oauth-protected-resource');
  const as = readJson('oauth-authorization-server');

  test('declares resource identifier and authorization_servers', () => {
    expect(prm.resource).toMatch(/^https:\/\//);
    expect(Array.isArray(prm.authorization_servers)).toBe(true);
    expect(prm.authorization_servers.length).toBeGreaterThanOrEqual(1);
  });

  test('advertised authorization server matches the AS metadata issuer', () => {
    expect(prm.authorization_servers).toContain(as.issuer);
  });

  test('declares scopes and header bearer method per auth.md guide', () => {
    expect(Array.isArray(prm.scopes_supported)).toBe(true);
    expect(prm.bearer_methods_supported).toContain('header');
  });
});

describe('auth.md agent registration (#116)', () => {
  const authMd = fs.readFileSync(path.join(publicDir, 'auth.md'), 'utf8');
  const as = readJson('oauth-authorization-server');
  const prm = readJson('oauth-protected-resource');

  test('is served from the site root with an auth.md H1 heading', () => {
    expect(authMd).toMatch(/^# .*auth\.md/m);
  });

  test('identifies the agent audience and supported registration method', () => {
    expect(authMd).toMatch(/agent/i);
    expect(authMd).toMatch(/anonymous/i);
  });

  test('points agents at the PRM and AS metadata documents', () => {
    expect(authMd).toContain('/.well-known/oauth-protected-resource');
    expect(authMd).toContain('/.well-known/oauth-authorization-server');
  });

  test('AS metadata carries an agent_auth block with skill and register_uri', () => {
    const agentAuth = as.agent_auth;
    expect(agentAuth).toEqual(expect.any(Object));
    expect(agentAuth.skill).toBe(`${SITE}/auth.md`);
    expect(agentAuth.register_uri).toMatch(/^https:\/\//);
  });

  test('agent_auth declares at least one complete registration method', () => {
    const agentAuth = as.agent_auth;
    expect(Array.isArray(agentAuth.identity_types_supported)).toBe(true);
    expect(agentAuth.identity_types_supported).toContain('anonymous');
    expect(agentAuth.anonymous).toEqual(expect.any(Object));
    expect(agentAuth.claim_uri).toMatch(/^https:\/\//);
  });

  test('AS issuer matches the issuer advertised in the PRM document', () => {
    expect(prm.authorization_servers).toContain(as.issuer);
  });
});

describe('supporting OpenAPI description', () => {
  const api = readJson('openapi.json');

  test('is a valid OpenAPI 3.x document listing the well-known resources', () => {
    expect(api.openapi).toMatch(/^3\./);
    expect(api.info.title).toEqual(expect.any(String));
    const paths = Object.keys(api.paths);
    expect(paths).toContain('/.well-known/ai-catalog.json');
    expect(paths).toContain('/.well-known/agent-card.json');
  });
});
