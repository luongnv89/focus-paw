/**
 * Builds the <head> variant served at /privacy.
 *
 * The privacy route keeps the app shell but gets its own title, description,
 * canonical URL, social cards — and its own markdown alternate so agent
 * clients advertising `Accept: text/markdown` (or following
 * `<link rel="alternate" type="text/markdown">`) land on
 * /privacy/index.md instead of the homepage mirror.
 *
 * Kept as a pure string transform so tests/privacy-head.test.js can exercise
 * it without running a Vite build.
 */
export function transformPrivacyHtml(html) {
  return (
    html
      .replace(/<title>[^<]*<\/title>/, '<title>Privacy Policy — FocusPaw</title>')
      .replace(
        /(<meta\s+name="description"\s+content=")[^"]*(")/,
        '$1FocusPaw privacy policy: all tracking data stays in local extension storage. No accounts, no telemetry, no cloud sync.$2'
      )
      .replace(
        /rel="canonical"\s+href="[^"]*"/,
        'rel="canonical" href="https://focus-paw.luongnv.com/privacy"'
      )
      .replace(
        /(property="og:url"\s+content=")[^"]*(")/,
        '$1https://focus-paw.luongnv.com/privacy$2'
      )
      .replace(
        /(property="og:title"\s+content=")[^"]*(")/,
        '$1Privacy Policy — FocusPaw$2'
      )
      .replace(
        /(name="twitter:title"\s+content=")[^"]*(")/,
        '$1Privacy Policy — FocusPaw$2'
      )
      // Point the markdown alternate at the privacy mirror, not the homepage one
      .replace(
        /(type="text\/markdown"\s+href=")\/index\.md(")/,
        '$1/privacy/index.md$2'
      )
  );
}
