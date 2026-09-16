export const heroContent = {
  headline: 'Track Your Focus, Master Your Time',
  tagline:
    'Privacy-first Chrome extension that helps you understand your browsing habits through beautiful visualizations. All data stays on your device. Now with React 19, Manifest V3, and enhanced privacy.',
  ctaButton: {
    text: "Get FocusPaw 1.0.0 — It's Free",
    url:
      import.meta.env.VITE_CHROME_STORE_URL ||
      'https://chromewebstore.google.com/detail/focusbear-focus-tracker/hlhhifmjlgekgchkaemeldfhcgcajcoe?authuser=0&hl=en',
    ariaLabel: 'Install FocusPaw extension from Chrome Web Store',
  },
  heroImage: {
    src: '/screenshots/dashboard.png',
    alt: 'FocusPaw dashboard showing focus tracking graph with interactive visualization',
    width: 1280,
    height: 800,
  },
};
