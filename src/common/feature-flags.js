/**
 * Feature Flags for FocusPaw
 * Controls which features are enabled/disabled
 * Only flags actually consulted by source are listed here.
 * Consumer map:
 * - RADIAL_GRAPH: src/common/visualization-page.js (isFeatureEnabled('RADIAL_GRAPH'))
 * - MAP_VIEW: src/dashboard/map-view.js + visualization-page.js (dashboard Map tab)
 */

export const FEATURES = {
  RADIAL_GRAPH: true,
  MAP_VIEW: true,
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Feature flag name
 * @returns {boolean} True if enabled
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Get all enabled features
 * @returns {string[]} Array of enabled feature names
 */
export function getEnabledFeatures() {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

/**
 * Get feature flag status for debugging
 * @returns {Object} All feature flags
 */
export function getAllFeatures() {
  return { ...FEATURES };
}
