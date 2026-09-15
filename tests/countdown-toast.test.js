describe('countdown-toast content script', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.focusBearToastInjected;
    global.chrome = {
      runtime: {
        onMessage: {
          listeners: [],
          addListener(fn) {
            this.listeners.push(fn);
          },
        },
      },
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.focusBearToastInjected;
  });

  test('injects toast container on import', async () => {
    await import('../src/content/countdown-toast.js');
    const container = document.getElementById('focuspaw-toast-container');
    expect(container).toBeTruthy();
    expect(container.getAttribute('role')).toBe('status');
  });

  test('does not double-inject when already injected', async () => {
    window.focusBearToastInjected = true;
    const before = document.body.children.length;
    await import('../src/content/countdown-toast.js');
    // Should not add another container because injected flag prevents
    expect(document.body.children.length).toBe(before);
  });

  test('listens for SHOW_COUNTDOWN_TOAST message', async () => {
    jest.resetModules();
    delete window.focusBearToastInjected;
    document.body.innerHTML = '';
    global.chrome.runtime.onMessage.listeners = [];
    global.chrome.runtime.onMessage.addListener = function (fn) {
      this.listeners.push(fn);
    };
    // Re-create container injection expectation
    await import('../src/content/countdown-toast.js');
    const listener = global.chrome.runtime.onMessage.listeners[0];
    expect(listener).toBeDefined();
    const sendResponse = jest.fn();
    const result = listener(
      {
        type: 'SHOW_COUNTDOWN_TOAST',
        domain: 'example.com',
        remaining: 3,
        limit: 10,
        limitType: 'daily',
      },
      {},
      sendResponse,
    );
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
    expect(result).toBe(false);
    const container = document.getElementById('focuspaw-toast-container');
    expect(container.children.length).toBe(1);
    const toast = container.children[0];
    expect(toast.textContent).toContain('example.com');
  });

  test('shows danger severity when remaining 0', async () => {
    // Reset module cache to re-import
    jest.resetModules();
    delete window.focusBearToastInjected;
    document.body.innerHTML = '';
    global.chrome.runtime.onMessage.listeners = [];
    global.chrome.runtime.onMessage.addListener = function (fn) {
      this.listeners.push(fn);
    };
    await import('../src/content/countdown-toast.js');
    const listener = global.chrome.runtime.onMessage.listeners[0];
    listener(
      {
        type: 'SHOW_COUNTDOWN_TOAST',
        domain: 'example.com',
        remaining: 0,
        limit: 10,
        limitType: 'daily',
      },
      {},
      jest.fn(),
    );
    const toast = document.getElementById('focuspaw-toast-container').children[0];
    expect(toast.className).toContain('focuspaw-toast-danger');
  });

  test('ignores unknown message types', async () => {
    jest.resetModules();
    delete window.focusBearToastInjected;
    document.body.innerHTML = '';
    global.chrome.runtime.onMessage.listeners = [];
    global.chrome.runtime.onMessage.addListener = function (fn) {
      this.listeners.push(fn);
    };
    await import('../src/content/countdown-toast.js');
    const listener = global.chrome.runtime.onMessage.listeners[0];
    const sendResponse = jest.fn();
    listener({ type: 'UNKNOWN' }, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
