/**
 * FocusPaw D3.js Bubble Graph
 * Interactive visualization of focus visit data
 */

import { categorizeDomain } from '../common/categories.js';

// Note: getNodeOutlineColor removed - using inline styling instead

/**
 * Render bubble graph visualization
 * @param {HTMLElement} container - Container element for graph
 * @param {Object} data - Domain visit data
 * @param {Object} options - Visualization options
 */
export function renderRadialGraph(container, data, options = {}) {
  // Calculate responsive dimensions based on container
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width || options.width || 400;
  const containerHeight = containerRect.height || options.height || 450;

  const { badges = {} } = options;
  const width = Math.max(containerWidth - 16, 300);
  const height = Math.max(containerHeight - 16, 300);

  // Performance monitoring
  const graphPerfStart = performance.now();

  // Clear existing content
  container.innerHTML = '';

  // No data state
  if (!data || Object.keys(data).length === 0) {
    container.innerHTML = '<div class="graph-empty">No data to visualize yet</div>';
    return;
  }

  // D3 is vendored locally (loaded via vendor/d3.min.js in popup.html / dashboard.html)
  const { d3 } = window;
  if (!d3) {
    console.error('D3.js not loaded');
    container.innerHTML = '<div class="graph-error">Visualization library not loaded</div>';
    return;
  }

  // Create SVG — responsive: viewBox keeps the coordinate space, CSS sizes it
  // to the container so the graph rescales without re-rendering.
  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('display', 'block')
    .attr('role', 'img')
    .attr('aria-label', 'Topology graph showing website activity');

  // Create a group for zoom/pan transformations
  const gZoom = svg.append('g').attr('class', 'zoom-group');

  // Tooltip
  const tooltip = d3
    .select(container)
    .append('div')
    .attr('class', 'graph-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'var(--bg-2)')
    .style('color', 'var(--ink-1)')
    .style('border', '1px solid var(--line-2)')
    .style('padding', '8px 12px')
    .style('border-radius', '8px')
    .style('box-shadow', 'var(--shadow-2)')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('backdrop-filter', 'blur(4px)');

  // Back Button
  const backBtn = document.createElement('button');
  backBtn.className = 'graph-back-btn';
  const backIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  backIcon.setAttribute('width', '14');
  backIcon.setAttribute('height', '14');
  backIcon.setAttribute('aria-hidden', 'true');
  const backIconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  backIconUse.setAttribute('href', '../../assets/icons.svg#i-arrow-left');
  backIcon.appendChild(backIconUse);
  backBtn.append(backIcon, document.createTextNode('Back to Universe'));
  backBtn.style.position = 'absolute';
  backBtn.style.top = '10px';
  backBtn.style.left = '10px';
  backBtn.style.zIndex = '100';
  backBtn.style.display = 'none'; // Hidden by default
  backBtn.style.alignItems = 'center';
  backBtn.style.gap = '6px';
  backBtn.style.padding = '6px 12px';
  backBtn.style.background = 'var(--bg-2)';
  backBtn.style.color = 'var(--ink-1)';
  backBtn.style.border = '1px solid var(--line-2)';
  backBtn.style.borderRadius = '10px';
  backBtn.style.cursor = 'pointer';
  backBtn.style.fontSize = '12px';
  backBtn.style.fontWeight = '600';
  backBtn.style.fontFamily = 'inherit';
  backBtn.style.transition = 'background 160ms ease';

  backBtn.onmouseenter = () => {
    backBtn.style.background = 'var(--bg-3)';
  };
  backBtn.onmouseleave = () => {
    backBtn.style.background = 'var(--bg-2)';
  };

  backBtn.onclick = () => {
    render({ type: 'domains' });
    window.dispatchEvent(new CustomEvent('domainDrilldownExit'));
  };

  // Container is already positioned by CSS (popup: relative, dashboard: absolute
  // inset-0 inside .graph-stage) — no inline override needed for the absolutely
  // positioned tooltip/back button children.
  container.appendChild(backBtn);

  let simulation = null;

  // Internal function to render the graph based on state
  function render(viewState) {
    // Clear previous graph elements
    gZoom.selectAll('*').remove();
    if (simulation) simulation.stop();

    // Handle Back Button visibility
    if (viewState.type === 'subpaths') {
      backBtn.style.display = 'inline-flex';
    } else {
      backBtn.style.display = 'none';
    }

    const nodes = [];
    const links = [];

    if (viewState.type === 'domains') {
      // --- DOMAINS VIEW ---
      // Center node: You
      nodes.push({
        id: 'You',
        group: 'center',
        r: 40,
        fx: width / 2,
        fy: height / 2,
      });

      // Domain nodes
      const domainNodes = Object.entries(data)
        .filter(([domain]) => domain !== 'localhost' && domain !== '127.0.0.1')
        .map(([domain, domainData]) => {
          const category = categorizeDomain(domain);
          return {
            id: domain,
            group: 'domain',
            count: domainData.count,
            lastVisit: domainData.lastVisit,
            subpaths: domainData.subpaths || {},
            category: category.key,
            categoryName: category.name,
            categoryColor: category.color,
            sentiment: category.sentiment,
          };
        });

      // Sort and limit
      domainNodes.sort((a, b) => b.count - a.count);
      const topDomains = domainNodes.slice(0, 40);

      // Scale for domain nodes
      const maxCount = Math.max(...topDomains.map((d) => d.count), 1);
      const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([10, 35]);

      topDomains.forEach((d) => {
        d.r = sizeScale(d.count);
        nodes.push(d);
        links.push({ source: 'You', target: d.id });
      });
    } else if (viewState.type === 'subpaths') {
      // --- SUBPATHS VIEW ---
      const { domain } = viewState;
      const domainData = data[domain];
      const category = categorizeDomain(domain);

      // Center node: The Domain
      nodes.push({
        id: domain,
        group: 'center-domain',
        r: 45,
        fx: width / 2,
        fy: height / 2,
        categoryColor: category.color,
        count: domainData.count,
      });

      // Subpath nodes
      const subpaths = Object.entries(domainData.subpaths || {}).map(([path, pathData]) => ({
        id: path,
        group: 'subpath',
        count: pathData.count,
        lastVisit: pathData.lastVisit,
        domain,
      }));

      // Sort and limit subpaths
      subpaths.sort((a, b) => b.count - a.count);
      const topSubpaths = subpaths.slice(0, 30);

      const maxCount = Math.max(...topSubpaths.map((d) => d.count), 1);
      const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([8, 25]);

      topSubpaths.forEach((d) => {
        d.r = sizeScale(d.count);
        nodes.push(d);
        links.push({ source: domain, target: d.id });
      });
    }

    // --- SIMULATION ---
    simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(viewState.type === 'domains' ? 120 : 100),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force(
        'collide',
        d3.forceCollide().radius((d) => d.r + 5),
      )
      .force('center', d3.forceCenter(width / 2, height / 2));

    // --- DRAW LINKS ---
    const link = gZoom
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--line-2)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6);

    // --- DRAW NODES ---
    const node = gZoom
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

    // Circle
    node
      .append('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => {
        if (d.group === 'center') return 'var(--bg-3)';
        if (d.group === 'center-domain') return d.categoryColor;
        if (d.group === 'domain') return d.categoryColor;
        return 'var(--ink-3)'; // subpath default
      })
      .attr('stroke', (d) => (d.group === 'center' ? 'var(--line-2)' : 'var(--bg-1)'))
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Count Label (inside circle). Same paint-order stroke as domain labels so
    // numbers stay AA on muted CATEGORY_PALETTE fills (white-on-fill failed 1.4.3).
    node
      .filter((d) => d.group !== 'center') // Don't show count for "You" node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', 'var(--ink-1)')
      .attr('stroke', 'var(--bg-1)')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .style('paint-order', 'stroke')
      .attr('font-size', (d) => `${Math.min(d.r / 1.5, 12)}px`)
      .attr('font-weight', 700)
      .attr('pointer-events', 'none')
      .style('display', (d) => (d.r > 12 ? 'block' : 'none'))
      .text((d) => d.count);

    // Labels — below the bubble, truncated at 14 chars (full domain stays in the
    // tooltip); paint-order stroke keeps text legible over links/bubbles.
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.r + 15)
      .attr('fill', 'var(--ink-2)')
      .attr('stroke', 'var(--bg-1)')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .style('paint-order', 'stroke')
      .attr('font-size', '11px')
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.group === 'center') return 'You';
        if (d.id.length > 14) return `${d.id.slice(0, 14)}…`;
        return d.id;
      });

    // Badges — trophy icon above the node circle
    node
      .filter((d) => badges[d.id])
      .append('use')
      .attr('href', '../../assets/icons.svg#i-trophy')
      .attr('width', 14)
      .attr('height', 14)
      .attr('x', -7)
      .attr('y', (d) => -d.r - 18)
      .attr('color', 'var(--warn)')
      .attr('pointer-events', 'none');

    // --- INTERACTIONS ---
    node
      .on('mouseenter', function (event, d) {
        // eslint-disable-next-line newline-per-chained-call
        d3.select(this).select('circle').transition().duration(200).attr('transform', 'scale(1.1)');

        tooltip.selectAll('*').remove();
        if (d.group === 'center') {
          tooltip.append('strong').text('You');
          tooltip.append('br');
          tooltip.append('span').text('Center of your digital universe');
        } else if (d.group === 'domain' || d.group === 'center-domain') {
          tooltip.append('strong').text(d.id);
          tooltip.append('br');
          tooltip
            .append('span')
            .style('opacity', '0.8')
            .text(d.categoryName || 'Website');
          tooltip.append('br');
          tooltip.append('strong').text(String(d.count));
          tooltip.append('span').text(' visits');
          if (badges[d.id]) {
            tooltip.append('br');
            tooltip.append('span').text(`Focus Hero (${badges[d.id].streak} days!)`);
          }
        } else if (d.group === 'subpath') {
          tooltip.append('strong').text(d.id);
          tooltip.append('br');
          tooltip.append('span').text(`Path on ${d.domain}`);
          tooltip.append('br');
          tooltip.append('strong').text(String(d.count));
          tooltip.append('span').text(' visits');
        }
        tooltip.style('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        tooltip.style('top', `${event.pageY - 40}px`).style('left', `${event.pageX + 10}px`);
      })
      .on('mouseleave', function () {
        // eslint-disable-next-line newline-per-chained-call
        d3.select(this).select('circle').transition().duration(200).attr('transform', 'scale(1)');
        tooltip.style('visibility', 'hidden');
      })
      .on('click', (event, d) => {
        if (d.group === 'domain') {
          // Drilldown to domain
          render({ type: 'subpaths', domain: d.id });

          // Dispatch event for dashboard table
          window.dispatchEvent(
            new CustomEvent('domainDrilldown', {
              detail: {
                domain: d.id,
                domainData: data[d.id],
              },
            }),
          );
        } else if (d.group === 'center-domain') {
          // Go back to main view
          render({ type: 'domains' });

          // Dispatch event for dashboard table reset
          window.dispatchEvent(new CustomEvent('domainDrilldownExit'));
        }
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.group !== 'center' && d.group !== 'center-domain') {
        d.fx = null;
        d.fy = null;
      }
    }
  }

  // Initial render
  render({ type: 'domains' });

  // Zoom behavior
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      gZoom.attr('transform', event.transform);
      options.onZoomChange?.(event.transform.k);
    });

  svg.call(zoomBehavior);

  // Log performance metrics
  const graphPerfEnd = performance.now();
  const graphRenderTime = Math.round(graphPerfEnd - graphPerfStart);
  console.log(`[FocusPaw Performance] Graph init time: ${graphRenderTime}ms`);

  // Return cleanup function with zoom controls attached
  const cleanup = () => {
    if (simulation) simulation.stop();
    tooltip.remove();
    backBtn.remove();
  };
  cleanup.zoomIn = () => svg.transition().duration(160).call(zoomBehavior.scaleBy, 1.25);
  cleanup.zoomOut = () => svg.transition().duration(160).call(zoomBehavior.scaleBy, 0.8);
  cleanup.resetZoom = () => {
    svg.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity);
  };
  return cleanup;
}
