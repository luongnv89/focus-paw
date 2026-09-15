/**
 * Shared inline-SVG icon helper.
 * Pages live two levels deep under src/, so the sprite resolves at ../../assets/icons.svg.
 */

const SPRITE = '../../assets/icons.svg';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Build an inline <svg><use> icon via DOM APIs (no innerHTML).
 * @param {string} name - Icon name; maps to <symbol id="i-<name>"> in the sprite
 * @param {Object} [options]
 * @param {number} [options.size=16]
 * @param {string} [options.className='icon']
 * @param {string} [options.label] - Accessible label; when given the icon gets role="img"
 * @returns {SVGElement}
 */
export function svgIcon(name, { size = 16, className = 'icon', label } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#i-${name}`);
  use.setAttributeNS(XLINK_NS, 'xlink:href', `${SPRITE}#i-${name}`);
  svg.appendChild(use);
  return svg;
}
