/**
 * WebMCP site tools — expose the landing page's key actions to AI agents
 * through the browser's experimental Model Context API (issue #120).
 *
 * Guide: https://isitagentready.com/.well-known/agent-skills/webmcp/SKILL.md
 * Spec:  https://webmachinelearning.github.io/webmcp/
 *
 * The API surface is `navigator.modelContext` (the alias this issue targets);
 * newer spec drafts expose the same container as `document.modelContext`, so
 * both are probed. Browsers without the API no-op — nothing throws.
 *
 * Deliberately self-contained (no imports): the `src/data/*.js` modules read
 * `import.meta.env`, which the root jest/babel transform cannot parse, and
 * this module is unit-tested from `tests/webmcp.test.js`. The URLs below are
 * the same public constants used as the env-var fallbacks in `src/data/`.
 */

const SITE_ORIGIN = 'https://focus-paw.luongnv.com';
const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/focusbear-focus-tracker/hlhhifmjlgekgchkaemeldfhcgcajcoe?authuser=0&hl=en';
const GITHUB_URL = 'https://github.com/luongnv89/focus-paw';

/** In-page anchor sections rendered by the landing page. */
const SECTION_DESTINATIONS = ['features', 'screenshots', 'how-it-works'];

/** Same-site routes served by the app shell (see scripts/postbuild.js). */
const PAGE_DESTINATIONS = {
  home: '/',
  privacy: '/privacy',
};

/** Off-site destinations opened in a new tab. */
const EXTERNAL_DESTINATIONS = {
  install: CHROME_STORE_URL,
  github: GITHUB_URL,
};

/** Machine-readable resources this site already publishes for agents. */
const AGENT_RESOURCES = [
  {
    name: 'llms.txt',
    path: '/llms.txt',
    description: 'LLM-oriented summary of FocusPaw and its key links',
  },
  {
    name: 'auth.md',
    path: '/auth.md',
    description: 'Agent registration and authentication guide',
  },
  {
    name: 'agent-card.json',
    path: '/.well-known/agent-card.json',
    description: 'A2A agent card describing the site for agents',
  },
  {
    name: 'ai-catalog.json',
    path: '/.well-known/ai-catalog.json',
    description: 'Agentic Resource Discovery manifest for the site',
  },
  {
    name: 'agent-skills index',
    path: '/.well-known/agent-skills/index.json',
    description: 'Index of published agent skill documents',
  },
  {
    name: 'api-catalog',
    path: '/.well-known/api-catalog',
    description: 'RFC 9727 linkset of machine-readable API descriptions',
  },
  {
    name: 'openapi.json',
    path: '/.well-known/openapi.json',
    description: 'OpenAPI description of the well-known resources',
  },
  {
    name: 'mcp server card',
    path: '/.well-known/mcp/server-card.json',
    description: 'MCP server card (SEP-1649/SEP-2127)',
  },
  {
    name: 'oauth-authorization-server',
    path: '/.well-known/oauth-authorization-server',
    description: 'RFC 8414 authorization server metadata',
  },
  {
    name: 'openid-configuration',
    path: '/.well-known/openid-configuration',
    description: 'OIDC discovery document',
  },
  {
    name: 'oauth-protected-resource',
    path: '/.well-known/oauth-protected-resource',
    description: 'RFC 9728 protected resource metadata',
  },
  {
    name: 'sitemap.xml',
    path: '/sitemap.xml',
    description: 'XML sitemap of public pages',
  },
];

/**
 * Resolve the model-context container, preferring `navigator.modelContext`
 * (the surface isitagentready's webMcp check and this issue target) and
 * falling back to the spec-canonical `document.modelContext`.
 *
 * @returns {object|null} the container, or null when WebMCP is unsupported
 */
export function getModelContext() {
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }
  return null;
}

function scrollToSection(id) {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(id);
  if (!el || typeof el.scrollIntoView !== 'function') return false;
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  return true;
}

function navigateToPath(path) {
  if (typeof window === 'undefined' || !window.location) return false;
  try {
    window.location.assign(path);
    return true;
  } catch {
    return false;
  }
}

function openExternal(url) {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return false;
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}

/**
 * The site's key actions exposed as WebMCP tools. Each descriptor follows the
 * guide's contract: `name`, `description`, `inputSchema` (JSON Schema) and an
 * `execute` callback that never throws.
 */
export const WEBMCP_TOOLS = [
  {
    name: 'get_site_overview',
    description:
      'Get an overview of FocusPaw: what the extension does and the key ' +
      'site links (install, privacy policy, source code).',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({
      name: 'FocusPaw',
      tagline: 'Track your focus, privacy-first.',
      description:
        'Free, open-source, privacy-first Chrome extension that tracks ' +
        'focus-switching habits: per-domain visit counts, a radial focus ' +
        'graph, daily site limits, streaks and focus scores. All data ' +
        'stays in local extension storage — no accounts, no telemetry.',
      urls: {
        site: SITE_ORIGIN,
        install: CHROME_STORE_URL,
        privacy: `${SITE_ORIGIN}/privacy`,
        source: GITHUB_URL,
      },
    }),
  },
  {
    name: 'navigate',
    description:
      'Navigate the FocusPaw site: scroll to a landing-page section, open ' +
      'the privacy policy, the Chrome Web Store install listing, or the ' +
      'GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          enum: [
            ...SECTION_DESTINATIONS,
            ...Object.keys(PAGE_DESTINATIONS),
            ...Object.keys(EXTERNAL_DESTINATIONS),
          ],
          description:
            'Where to go: a landing-page section (features, screenshots, ' +
            'how-it-works), a site page (home, privacy), or an external ' +
            'destination (install = Chrome Web Store, github = source).',
        },
      },
      required: ['destination'],
    },
    execute: ({ destination } = {}) => {
      if (SECTION_DESTINATIONS.includes(destination)) {
        if (scrollToSection(destination)) {
          return `Scrolled to the "${destination}" section.`;
        }
        const target = `/#${destination}`;
        navigateToPath(target);
        return `Navigating to ${target} on the home page.`;
      }
      if (
        Object.prototype.hasOwnProperty.call(PAGE_DESTINATIONS, destination)
      ) {
        const path = PAGE_DESTINATIONS[destination];
        navigateToPath(path);
        return `Navigating to ${path} (${destination}).`;
      }
      if (
        Object.prototype.hasOwnProperty.call(EXTERNAL_DESTINATIONS, destination)
      ) {
        const url = EXTERNAL_DESTINATIONS[destination];
        openExternal(url);
        return `Opening ${destination} in a new tab: ${url}`;
      }
      return `Unknown destination: ${String(destination)}.`;
    },
  },
  {
    name: 'list_agent_resources',
    description:
      'List the machine-readable resources FocusPaw publishes for AI ' +
      'agents (llms.txt, auth.md, .well-known discovery documents).',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({
      resources: AGENT_RESOURCES.map((resource) => ({
        ...resource,
        url: `${SITE_ORIGIN}${resource.path}`,
      })),
    }),
  },
];

/**
 * Register every site tool with the browser's model-context container.
 * Safe to call unconditionally: it resolves with `supported: false` when the
 * API is absent, and a single tool's registration failure never blocks the
 * rest. Registrations are bound to one AbortController signal so the page can
 * unregister them later via the returned `signal`.
 *
 * @param {object} [modelContext] container override (defaults to detection)
 * @returns {Promise<{supported: boolean, registered: string[], signal: ?AbortSignal}>}
 */
export async function registerWebMcpTools(modelContext = getModelContext()) {
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return { supported: false, registered: [], signal: null };
  }
  const controller = new AbortController();
  const registered = [];
  for (const tool of WEBMCP_TOOLS) {
    try {
      await modelContext.registerTool(tool, { signal: controller.signal });
      registered.push(tool.name);
    } catch {
      // A tool that fails to register must not block the remaining tools.
    }
  }
  return { supported: true, registered, signal: controller.signal };
}
