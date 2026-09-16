/**
 * Tests for tracking module
 * Tests URL parsing and focus-switch tracking logic
 */

import { parseUrl, initializeTracking, trackCurrentTab } from '../src/background/tracking.js';

describe('Tracking Module', () => {
  describe('parseUrl', () => {
    test('parses valid HTTP URL correctly', () => {
      const result = parseUrl('http://example.com/path/to/page');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/path/to/page',
      });
    });

    test('parses valid HTTPS URL correctly', () => {
      const result = parseUrl('https://example.com/path/to/page');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/path/to/page',
      });
    });

    test('removes www. prefix from domain', () => {
      const result = parseUrl('https://www.example.com/page');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/page',
      });
    });

    test('handles URLs without subpath', () => {
      const result = parseUrl('https://example.com');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/',
      });
    });

    test('handles URLs with query parameters', () => {
      const result = parseUrl('https://example.com/search?q=test&lang=en');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/search',
      });
    });

    test('handles URLs with hash fragments', () => {
      const result = parseUrl('https://example.com/page#section');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/page',
      });
    });

    test('handles URLs with both query and hash', () => {
      const result = parseUrl('https://example.com/page?id=123#top');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/page',
      });
    });

    test('handles Reddit-style subpaths', () => {
      const result = parseUrl('https://reddit.com/r/programming/comments/abc123');
      expect(result).toEqual({
        domain: 'reddit.com',
        subpath: '/r/programming/comments/abc123',
      });
    });

    test('handles GitHub-style subpaths', () => {
      const result = parseUrl('https://github.com/user/repo/issues/42');
      expect(result).toEqual({
        domain: 'github.com',
        subpath: '/user/repo/issues/42',
      });
    });

    test('returns null for non-HTTP URLs', () => {
      expect(parseUrl('chrome://extensions/')).toBeNull();
      expect(parseUrl('about:blank')).toBeNull();
      expect(parseUrl('file:///path/to/file.html')).toBeNull();
      expect(parseUrl('ftp://example.com')).toBeNull();
    });

    test('returns null for null or undefined URL', () => {
      expect(parseUrl(null)).toBeNull();
      expect(parseUrl(undefined)).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(parseUrl('')).toBeNull();
    });

    test('handles URLs with ports', () => {
      const result = parseUrl('https://example.com:8080/app');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/app',
      });
    });

    test('returns null for localhost URLs', () => {
      expect(parseUrl('https://localhost:3000/app')).toBeNull();
      expect(parseUrl('http://127.0.0.1:8080/test')).toBeNull();
    });

    test('handles URLs with subdomains', () => {
      const result = parseUrl('https://mail.google.com/mail/u/0/');
      expect(result).toEqual({
        domain: 'mail.google.com',
        subpath: '/mail/u/0/',
      });
    });

    test('handles URLs with international domains', () => {
      const result = parseUrl('https://münchen.de/page');
      expect(result).toEqual({
        domain: 'xn--mnchen-3ya.de',
        subpath: '/page',
      });
    });

    test('handles complex YouTube URLs', () => {
      const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        domain: 'youtube.com',
        subpath: '/watch',
      });
    });

    test('handles trailing slashes consistently', () => {
      const result1 = parseUrl('https://example.com/page');
      const result2 = parseUrl('https://example.com/page/');
      expect(result1.subpath).toBe('/page');
      expect(result2.subpath).toBe('/page/');
    });

    test('returns null for malformed URLs', () => {
      expect(parseUrl('not a url')).toBeNull();
      expect(parseUrl('http://')).toBeNull();
      expect(parseUrl('https://')).toBeNull();
    });

    test('handles URLs with authentication', () => {
      const result = parseUrl('https://user:pass@example.com/secure');
      expect(result).toEqual({
        domain: 'example.com',
        subpath: '/secure',
      });
    });

    test('handles IP addresses', () => {
      const result = parseUrl('https://192.168.1.1/admin');
      expect(result).toEqual({
        domain: '192.168.1.1',
        subpath: '/admin',
      });
    });

    test('handles IPv6 addresses', () => {
      const result = parseUrl('https://[2001:db8::1]/page');
      expect(result).toEqual({
        domain: '[2001:db8::1]',
        subpath: '/page',
      });
    });
  });

  describe('initializeTracking', () => {
    let onActivatedListener;
    let onUpdatedListener;

    beforeEach(() => {
      // Mock chrome.tabs event listeners
      global.chrome = {
        tabs: {
          onActivated: {
            addListener: jest.fn((callback) => {
              onActivatedListener = callback;
            }),
          },
          onUpdated: {
            addListener: jest.fn((callback) => {
              onUpdatedListener = callback;
            }),
          },
        },
      };
    });

    test('registers tab activation listener', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      initializeTracking();

      expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Initializing focus-switch tracking...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Focus-switch tracking initialized');

      consoleLogSpy.mockRestore();
    });

    test('registers tab updated listener', () => {
      initializeTracking();

      expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    });

    test('logs initialization messages', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      initializeTracking();

      expect(consoleLogSpy).toHaveBeenCalledWith('Initializing focus-switch tracking...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Focus-switch tracking initialized');

      consoleLogSpy.mockRestore();
    });
  });

  describe('trackCurrentTab', () => {
    beforeEach(() => {
      global.chrome = {
        tabs: {
          query: jest.fn(),
          get: jest.fn(),
          update: jest.fn().mockResolvedValue(),
          sendMessage: jest.fn(),
        },
        storage: {
          local: {
            data: {},
            get(keys, callback) {
              callback(this.data);
            },
            set(items, callback) {
              Object.assign(this.data, items);
              if (callback) callback();
            },
          },
        },
        action: {
          setBadgeText: jest.fn().mockResolvedValue(),
          setBadgeBackgroundColor: jest.fn().mockResolvedValue(),
        },
        declarativeNetRequest: {
          updateDynamicRules: jest.fn().mockResolvedValue(),
          getDynamicRules: jest.fn().mockResolvedValue([]),
        },
        runtime: {
          id: 'test-extension-id',
          getURL: jest.fn((path) => `chrome-extension://test-extension-id/${path}`),
        },
      };
    });

    test('tracks active tab when one exists', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com/page',
        active: true,
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.get.mockResolvedValue(mockTab);

      await trackCurrentTab();

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(chrome.tabs.get).toHaveBeenCalledWith(123);
    });

    test('handles no active tab gracefully', async () => {
      chrome.tabs.query.mockResolvedValue([]);

      await trackCurrentTab();

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(chrome.tabs.get).not.toHaveBeenCalled();
    });

    test('handles undefined active tab', async () => {
      chrome.tabs.query.mockResolvedValue([undefined]);

      await trackCurrentTab();

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(chrome.tabs.get).not.toHaveBeenCalled();
    });

    test('handles error during tab query', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

      await trackCurrentTab();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error tracking current tab:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    test('handles error during tab get', async () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

      await trackCurrentTab();

      expect(consoleDebugSpy).toHaveBeenCalledWith('Could not track tab:', 'Tab not found');
      consoleDebugSpy.mockRestore();
    });

    test('tracks chrome:// URLs and skips them', async () => {
      const mockTab = {
        id: 123,
        url: 'chrome://extensions/',
        active: true,
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.get.mockResolvedValue(mockTab);

      await trackCurrentTab();

      // Should call get but skip tracking (no storage.set)
      expect(chrome.tabs.get).toHaveBeenCalled();
    });

    test('tracks valid HTTP URL and stores visit', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com/test',
        active: true,
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.get.mockResolvedValue(mockTab);

      await trackCurrentTab();

      expect(chrome.storage.local.data.visits).toBeDefined();
    });

    test('redirects the current tab when its visit reaches the limit', async () => {
      const mockTab = { id: 123, url: 'https://www.x.com/home', active: true };
      chrome.storage.local.data.limits = {
        'x.com': {
          enabled: true,
          fiveHour: { enabled: false, limit: 10 },
          daily: { enabled: true, limit: 1 },
        },
      };
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.get.mockResolvedValue(mockTab);

      await trackCurrentTab();

      expect(chrome.tabs.update).toHaveBeenCalledWith(123, {
        url: expect.stringContaining('src/blocked/blocked.html?domain=x.com'),
      });
    });
  });
});
