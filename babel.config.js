// Project-wide Babel config (used by babel-jest). Replaces the package-scoped
// .babelrc so that modules outside the root package — e.g. landing-page/src —
// are transformed identically when imported by tests.
export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '100',
        },
      },
    ],
  ],
};
