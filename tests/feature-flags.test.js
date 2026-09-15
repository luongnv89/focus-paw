import {
  FEATURES,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFeatures,
} from '../src/common/feature-flags.js';

describe('feature-flags', () => {
  test('FEATURES contains RADIAL_GRAPH', () => {
    expect(FEATURES.RADIAL_GRAPH).toBe(true);
  });

  test('isFeatureEnabled returns true for enabled flag', () => {
    expect(isFeatureEnabled('RADIAL_GRAPH')).toBe(true);
  });

  test('isFeatureEnabled returns false for unknown or disabled flag', () => {
    expect(isFeatureEnabled('UNKNOWN_FLAG')).toBe(false);
    expect(isFeatureEnabled('')).toBe(false);
  });

  test('getEnabledFeatures lists enabled flags', () => {
    const enabled = getEnabledFeatures();
    expect(enabled).toContain('RADIAL_GRAPH');
    expect(Array.isArray(enabled)).toBe(true);
  });

  test('getAllFeatures returns shallow copy', () => {
    const all = getAllFeatures();
    expect(all.RADIAL_GRAPH).toBe(true);
    all.RADIAL_GRAPH = false;
    expect(FEATURES.RADIAL_GRAPH).toBe(true);
  });
});
