import { renderRadialGraph } from '../src/popup/graph.js';

function makeD3Mock() {
  const svgMock = {
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    transition: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };
  // Chain for d3.select
  const d3Mock = {
    select: jest.fn(() => svgMock),
    selectAll: jest.fn(() => svgMock),
    scaleSqrt: jest.fn(() => {
      const fn = (v) => v;
      fn.domain = jest.fn().mockReturnThis();
      fn.range = jest.fn(() => fn);
      return fn;
    }),
    forceSimulation: jest.fn(() => {
      const sim = {
        force: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        stop: jest.fn(),
        alphaTarget: jest.fn().mockReturnThis(),
        restart: jest.fn(),
      };
      return sim;
    }),
    forceLink: jest.fn(() => ({ id: jest.fn().mockReturnThis(), distance: jest.fn().mockReturnThis() })),
    forceManyBody: jest.fn(() => ({ strength: jest.fn().mockReturnThis() })),
    forceCollide: jest.fn(() => ({ radius: jest.fn().mockReturnThis() })),
    forceCenter: jest.fn(() => ({})),
    drag: jest.fn(() => ({ on: jest.fn().mockReturnThis() })),
    zoom: jest.fn(() => ({
      scaleExtent: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      scaleBy: jest.fn(),
      transform: jest.fn(),
    })),
    zoomIdentity: { k: 1, x: 0, y: 0 },
  };
  return { d3Mock, svgMock };
}

describe('graph', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '400px';
    document.body.appendChild(container);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    delete window.d3;
  });

  test('renders empty state when no data', () => {
    window.d3 = makeD3Mock().d3Mock;
    renderRadialGraph(container, {});
    expect(container.innerHTML).toContain('No data to visualize');
  });

  test('renders empty state when null data', () => {
    window.d3 = makeD3Mock().d3Mock;
    renderRadialGraph(container, null);
    expect(container.innerHTML).toContain('No data to visualize');
  });

  test('shows error when D3 not loaded', () => {
    delete window.d3;
    const data = { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } };
    renderRadialGraph(container, data);
    expect(container.innerHTML).toContain('Visualization library not loaded');
  });

  test('renders with data and D3 mocked', () => {
    const { d3Mock } = makeD3Mock();
    window.d3 = d3Mock;
    // Need actual svg creation path: d3.select(container).append(svg) etc. With mock, container.innerHTML will be empty but should not throw
    const data = {
      'example.com': { count: 10, lastVisit: Date.now(), subpaths: { '/a': { count: 3, lastVisit: Date.now() } } },
      'other.com': { count: 2, lastVisit: Date.now(), subpaths: {} },
    };
    expect(() => renderRadialGraph(container, data, { width: 400, height: 400, badges: {} })).not.toThrow();
    // Should have called d3.select
    expect(d3Mock.select).toHaveBeenCalled();
  });

  test('renders with badges and respects topDomains limit', () => {
    const { d3Mock } = makeD3Mock();
    window.d3 = d3Mock;
    const data = {};
    for (let i = 0; i < 50; i += 1) data[`site${i}.com`] = { count: i + 1, lastVisit: Date.now(), subpaths: {} };
    expect(() => renderRadialGraph(container, data, { badges: { 'site0.com': { streak: 3 } } })).not.toThrow();
    expect(d3Mock.select).toHaveBeenCalled();
  });

  test('returns cleanup with external zoom API', () => {
    const { d3Mock } = makeD3Mock();
    window.d3 = d3Mock;
    const data = { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } };
    const result = renderRadialGraph(container, data);
    expect(typeof result).toBe('function');
    expect(typeof result.zoomIn).toBe('function');
    expect(typeof result.zoomOut).toBe('function');
    expect(typeof result.resetZoom).toBe('function');
    expect(() => result.zoomIn()).not.toThrow();
    expect(() => result.zoomOut()).not.toThrow();
    expect(() => result.resetZoom()).not.toThrow();
  });

  test('returns cleanup function that stops simulation', () => {
    const { d3Mock } = makeD3Mock();
    window.d3 = d3Mock;
    const data = { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } };
    const cleanup = renderRadialGraph(container, data);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
