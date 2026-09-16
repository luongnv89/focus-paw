import {
  FEATURES,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFeatures,
} from '../src/common/feature-flags.js';

describe('feature-flags', () => {
  test('FEATURES contains RADIAL_GRAPH and MAP_VIEW', () => {
    expect(FEATURES.RADIAL_GRAPH).toBe(true);
    expect(FEATURES.MAP_VIEW).toBe(true);
  });

  test('isFeatureEnabled returns true for enabled flag', () => {
    expect(isFeatureEnabled('RADIAL_GRAPH')).toBe(true);
    expect(isFeatureEnabled('MAP_VIEW')).toBe(true);
  });

  test('isFeatureEnabled returns false for unknown or disabled flag', () => {
    expect(isFeatureEnabled('UNKNOWN_FLAG')).toBe(false);
    expect(isFeatureEnabled('')).toBe(false);
  });

  test('getEnabledFeatures lists enabled flags', () => {
    const enabled = getEnabledFeatures();
    expect(enabled).toContain('RADIAL_GRAPH');
    expect(enabled).toContain('MAP_VIEW');
    expect(Array.isArray(enabled)).toBe(true);
  });

  test('getAllFeatures returns shallow copy', () => {
    const all = getAllFeatures();
    expect(all.RADIAL_GRAPH).toBe(true);
    expect(all.MAP_VIEW).toBe(true);
    all.RADIAL_GRAPH = false;
    expect(FEATURES.RADIAL_GRAPH).toBe(true);
  });
});
