<script>
  import { onMount } from 'svelte';
  import { forceSimulation, forceCollide, forceCenter, forceX, forceY } from 'd3-force';
  import { scaleSqrt } from 'd3-scale';

  /** @type {{ tag: string; count: number }[]} */
  export let tags = [];

  let svgEl;
  let width = 400;
  let height = 280;
  let nodes = [];
  let hoveredIndex = -1;
  let tooltipX = 0;
  let tooltipY = 0;

  onMount(() => {
    const container = svgEl.parentElement;
    width = container.clientWidth;
    height = container.clientHeight;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (height <= 0) height = 280;

    const minDim = Math.min(width, height);
    const radiusScale = scaleSqrt()
      .domain([1, Math.max(...tags.map((t) => t.count), 1)])
      .range([minDim * 0.06, minDim * 0.22]);

    nodes = tags.map((t) => ({
      ...t,
      r: radiusScale(t.count),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sim = forceSimulation(nodes)
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide((d) => d.r + 6).strength(0.95))
      .force('x', forceX(width / 2).strength(0.035))
      .force('y', forceY(height / 2).strength(0.035))
      .on('tick', () => {
        nodes = [...nodes];
      });

    if (reduceMotion) sim.alpha(0.3).stop();
    return () => sim.stop();
  });

  function handleMouseEnter(i, event) {
    hoveredIndex = i;
    const rect = svgEl.getBoundingClientRect();
    tooltipX = event.clientX - rect.left;
    tooltipY = event.clientY - rect.top - 10;
  }

  function handleMouseLeave() {
    hoveredIndex = -1;
  }

  function tierClass(count) {
    const max = Math.max(...tags.map((t) => t.count), 1);
    const ratio = count / max;
    if (ratio > 0.66) return 'bubble--high';
    if (ratio > 0.33) return 'bubble--mid';
    return 'bubble--low';
  }
</script>

<div class="trend-bubbles">
  <svg bind:this={svgEl} viewBox="0 0 {width} {height}" role="img" aria-label="熱門標籤氣泡圖">
    {#each nodes as node, i}
      <g
        transform="translate({node.x},{node.y})"
        class="bubble-group {tierClass(node.count)}"
        class:bubble-group--hovered={hoveredIndex === i}
        on:mouseenter={(e) => handleMouseEnter(i, e)}
        on:mouseleave={handleMouseLeave}
        role="listitem"
      >
        <circle r={node.r} />
        {#if node.r >= 24}
          <text text-anchor="middle" dominant-baseline="central" class="bubble-label">{node.tag}</text>
        {/if}
      </g>
    {/each}
  </svg>

  {#if hoveredIndex >= 0 && nodes[hoveredIndex]}
    <div class="tooltip" style="left:{tooltipX}px;top:{tooltipY}px">
      <strong>{nodes[hoveredIndex].tag}</strong>
      <span>{nodes[hoveredIndex].count} 次</span>
    </div>
  {/if}
</div>

<noscript>
  <p>熱門標籤：{tags.map((t) => `${t.tag}（${t.count} 次）`).join('、')}</p>
</noscript>

<style>
  .trend-bubbles { position: relative; border-radius: var(--radius-card); border: 1px solid color-mix(in oklch, var(--color-fog) 75%, white); background: radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--color-paper) 88%, white), white 72%); height: 100%; overflow: hidden; }
  svg { display: block; width: 100%; height: 100%; }
  .bubble-group circle { transition: transform 0.4s ease, opacity 0.4s ease; cursor: default; }
  .bubble--high circle { fill: color-mix(in oklch, var(--color-teal) 88%, var(--color-ink)); }
  .bubble--mid circle { fill: color-mix(in oklch, var(--color-teal) 52%, var(--color-fog)); }
  .bubble--low circle { fill: color-mix(in oklch, var(--color-teal) 34%, var(--color-fog)); }
  .bubble-group--hovered circle { transform: scale(1.1); }
  .bubble-label { font-family: var(--font-ui); font-size: 0.875rem; font-weight: 600; fill: white; pointer-events: none; }
  .bubble--low .bubble-label { fill: var(--color-ink); }
  .tooltip { position: absolute; transform: translate(-50%, -100%); padding: 0.375rem 0.75rem; border-radius: var(--radius-sm); background-color: var(--color-ink); color: white; font-family: var(--font-ui); font-size: var(--text-badge); white-space: nowrap; pointer-events: none; z-index: 10; display: flex; gap: 0.5rem; align-items: center; }
</style>
