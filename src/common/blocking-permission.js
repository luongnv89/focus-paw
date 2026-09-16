/**
 * Request the optional host access required by DNR redirect rules.
 * Must be called from a user gesture when a limit is enabled.
 * @returns {Promise<boolean>}
 */
export async function ensureBlockingHostPermission() {
  try {
    if (!chrome.permissions?.contains) return true;
    const request = { origins: ['<all_urls>'] };
    if (await chrome.permissions.contains(request)) return true;
    return Boolean(await chrome.permissions.request(request));
  } catch (error) {
    console.debug('[Blocking] host permission request failed', error);
    return false;
  }
}
