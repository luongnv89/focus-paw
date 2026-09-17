/**
 * WebMCP site tools (#120) — the landing page registers its key actions with
 * the browser's experimental `navigator.modelContext` API so AI agents can
 * discover and invoke them. These tests run the real module against a mocked
 * model-context container in jsdom.
 */

import fs from 'fs';
import path from 'path';

import {
  WEBMCP_TOOLS,
  getModelContext,
  registerWebMcpTools,
} from '../landing-page/src/webmcp.js';

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/focusbear-focus-tracker/hlhhifmjlgekgchkaemeldfhcgcajcoe?authuser=0&hl=en';

const toolByName = (name) => WEBMCP_TOOLS.find((tool) => tool.name === name);

const setNavigatorContext = (value) => {
  Object.defineProperty(window.navigator, 'modelContext', {
    value,
    configurable: true,
    writable: true,
  });
};

const setDocumentContext = (value) => {
  Object.defineProperty(window.document, 'modelContext', {
    value,
    configurable: true,
    writable: true,
  });
};

const makeContext = () => ({
  registerTool: jest.fn().mockResolvedValue(undefined),
});

afterEach(() => {
  setNavigatorContext(undefined);
  setDocumentContext(undefined);
  jest.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('getModelContext', () => {
  test('returns null when neither surface exists', () => {
    expect(getModelContext()).toBeNull();
  });

  test('prefers navigator.modelContext over document.modelContext', () => {
    const navContext = makeContext();
    const docContext = makeContext();
    setNavigatorContext(navContext);
    setDocumentContext(docContext);
    expect(getModelContext()).toBe(navContext);
  });

  test('falls back to document.modelContext when navigator lacks it', () => {
    const docContext = makeContext();
    setDocumentContext(docContext);
    expect(getModelContext()).toBe(docContext);
  });
});

describe('registerWebMcpTools', () => {
  test('no-ops without throwing when the API is unsupported', async () => {
    const result = await registerWebMcpTools();
    expect(result.supported).toBe(false);
    expect(result.registered).toEqual([]);
    expect(result.signal).toBeNull();
  });

  test('registers every tool with one shared AbortSignal', async () => {
    const context = makeContext();
    const result = await registerWebMcpTools(context);

    expect(result.supported).toBe(true);
    expect(result.registered).toEqual(WEBMCP_TOOLS.map((tool) => tool.name));
    expect(context.registerTool).toHaveBeenCalledTimes(WEBMCP_TOOLS.length);

    const signals = context.registerTool.mock.calls.map(
      ([, options]) => options.signal,
    );
    for (const [tool, options] of context.registerTool.mock.calls) {
      expect(WEBMCP_TOOLS).toContain(tool);
      expect(options).toEqual({ signal: expect.any(AbortSignal) });
    }
    expect(new Set(signals).size).toBe(1);
    expect(signals[0].aborted).toBe(false);
    expect(result.signal).toBe(signals[0]);
  });

  test('keeps registering when one tool fails', async () => {
    const context = makeContext();
    context.registerTool.mockImplementation((tool) =>
      tool.name === WEBMCP_TOOLS[1].name
        ? Promise.reject(new Error('unsupported schema'))
        : Promise.resolve(),
    );

    const result = await registerWebMcpTools(context);

    expect(result.supported).toBe(true);
    expect(result.registered).toEqual([
      WEBMCP_TOOLS[0].name,
      WEBMCP_TOOLS[2].name,
    ]);
    expect(context.registerTool).toHaveBeenCalledTimes(WEBMCP_TOOLS.length);
  });

  test('resolves rather than throwing when the container rejects at call time', async () => {
    const context = {
      registerTool: jest.fn().mockRejectedValue(new Error('denied')),
    };
    const result = await registerWebMcpTools(context);
    expect(result.supported).toBe(true);
    expect(result.registered).toEqual([]);
  });
});

describe('tool descriptors', () => {
  test('exposes at least a data-retrieval and a navigation tool', () => {
    expect(WEBMCP_TOOLS.length).toBeGreaterThanOrEqual(3);
    expect(toolByName('get_site_overview')).toBeDefined();
    expect(toolByName('navigate')).toBeDefined();
    expect(toolByName('list_agent_resources')).toBeDefined();
  });

  test('each tool has name, description, inputSchema and execute', () => {
    for (const tool of WEBMCP_TOOLS) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toEqual(
        expect.objectContaining({ type: 'object' }),
      );
      expect(tool.execute).toEqual(expect.any(Function));
    }
  });
});

describe('get_site_overview', () => {
  test('returns product metadata and key links', async () => {
    const overview = await toolByName('get_site_overview').execute();
    expect(overview.name).toBe('FocusPaw');
    expect(overview.description).toMatch(/privacy/i);
    expect(overview.urls.install).toBe(CHROME_STORE_URL);
    expect(overview.urls.source).toBe('https://github.com/luongnv89/focus-paw');
    expect(overview.urls.privacy).toBe(
      'https://focus-paw.luongnv.com/privacy',
    );
  });
});

describe('navigate', () => {
  const navigate = () => toolByName('navigate');

  test('requires a destination covering sections, pages and external links', () => {
    const schema = navigate().inputSchema;
    expect(schema.required).toEqual(['destination']);
    const destinations = schema.properties.destination.enum;
    for (const expected of [
      'features',
      'screenshots',
      'how-it-works',
      'home',
      'privacy',
      'install',
      'github',
    ]) {
      expect(destinations).toContain(expected);
    }
  });

  test('scrolls to an in-page section when the element exists', async () => {
    const scrollIntoView = jest.fn();
    document.body.innerHTML = '<section id="features"></section>';
    const section = document.getElementById('features');
    section.scrollIntoView = scrollIntoView;

    const result = await navigate().execute({ destination: 'features' });

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start' }),
    );
    expect(result).toMatch(/scrolled to the "features" section/i);
  });

  test('falls back to an anchor navigation when the section is absent', async () => {
    // jsdom implements same-page hash changes: assigning '/#screenshots'
    // against the test URL 'http://localhost/' only moves the fragment.
    window.location.hash = '';

    const result = await navigate().execute({ destination: 'screenshots' });

    expect(window.location.hash).toBe('#screenshots');
    expect(result).toMatch(/navigating to \/#screenshots/i);

    window.location.hash = '';
  });

  test('navigates to the privacy policy page', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await navigate().execute({ destination: 'privacy' });

    expect(result).toMatch(/\/privacy/);
    expect(errSpy).toHaveBeenCalled();
  });

  test('opens the Chrome Web Store listing in a new tab', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    const result = await navigate().execute({ destination: 'install' });

    expect(open).toHaveBeenCalledWith(
      CHROME_STORE_URL,
      '_blank',
      'noopener,noreferrer',
    );
    expect(result).toMatch(/chrome web store|install/i);
  });

  test('opens the GitHub repository in a new tab', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    const result = await navigate().execute({ destination: 'github' });

    expect(open).toHaveBeenCalledWith(
      'https://github.com/luongnv89/focus-paw',
      '_blank',
      'noopener,noreferrer',
    );
    expect(result).toMatch(/github/i);
  });

  test('reports an unknown destination without throwing', async () => {
    const result = await navigate().execute({ destination: 'nope' });
    expect(result).toMatch(/unknown destination: nope/i);
  });
});

describe('list_agent_resources', () => {
  test('lists the published machine-readable documents with absolute URLs', async () => {
    const { resources } = await toolByName('list_agent_resources').execute();

    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThanOrEqual(8);

    const paths = resources.map((resource) => resource.url);
    for (const url of paths) {
      expect(url).toMatch(/^https:\/\/focus-paw\.luongnv\.com\//);
    }
    expect(paths).toContain('https://focus-paw.luongnv.com/llms.txt');
    expect(paths).toContain('https://focus-paw.luongnv.com/auth.md');
    expect(paths).toContain(
      'https://focus-paw.luongnv.com/.well-known/agent-card.json',
    );
    expect(paths).toContain(
      'https://focus-paw.luongnv.com/.well-known/ai-catalog.json',
    );
    expect(paths).toContain(
      'https://focus-paw.luongnv.com/.well-known/mcp/server-card.json',
    );
  });

  test('only advertises resources that exist in landing-page/public', async () => {
    const publicDir = path.join(process.cwd(), 'landing-page', 'public');
    const { resources } = await toolByName('list_agent_resources').execute();

    for (const resource of resources) {
      const filePath = path.join(
        publicDir,
        new URL(resource.url).pathname,
      );
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
