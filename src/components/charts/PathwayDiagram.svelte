<script>
  /** @type {{ name: string; description: string; enzyme?: string }[]} */
  export let steps = [];

  let hoveredIndex = -1;
  let tooltipX = 0;
  let tooltipY = 0;
  let containerEl;

  const NODE_W = 100;
  const NODE_H = 44;
  const GAP = 60;
  const PADDING = 24;

  $: totalW = steps.length * NODE_W + (steps.length - 1) * GAP + PADDING * 2;
  $: totalH = NODE_H + PADDING * 2 + 24;

  function nodeX(i) {
    return PADDING + i * (NODE_W + GAP);
  }

  function handleMouseEnter(i, event) {
    hoveredIndex = i;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      tooltipX = event.clientX - rect.left;
      tooltipY = event.clientY - rect.top - 10;
    }
  }

  function handleMouseLeave() {
    hoveredIndex = -1;
  }
</script>

<div class="pathway-diagram" bind:this={containerEl}>
  <h3 class="pathway-title">機制與代謝路徑</h3>

  <div class="pathway-scroll">
    <svg viewBox="0 0 {totalW} {totalH}" role="img" aria-label="代謝路徑圖">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-fog)" />
        </marker>
      </defs>

      {#each steps as step, i}
        <!-- Node -->
        <g
          transform="translate({nodeX(i)},{PADDING})"
          class="pathway-node"
          class:pathway-node--hovered={hoveredIndex === i}
          on:mouseenter={(e) => handleMouseEnter(i, e)}
          on:mouseleave={handleMouseLeave}
          role="listitem"
        >
          <rect
            width={NODE_W}
            height={NODE_H}
            rx="8"
            ry="8"
          />
          <text
            x={NODE_W / 2}
            y={NODE_H / 2}
            text-anchor="middle"
            dominant-baseline="central"
            class="node-label"
          >{step.name}</text>
        </g>

        <!-- Arrow + enzyme label -->
        {#if i < steps.length - 1}
          <line
            x1={nodeX(i) + NODE_W}
            y1={PADDING + NODE_H / 2}
            x2={nodeX(i + 1)}
            y2={PADDING + NODE_H / 2}
            stroke="var(--color-fog)"
            stroke-width="2"
            marker-end="url(#arrow)"
          />
          {#if steps[i + 1].enzyme}
            <text
              x={nodeX(i) + NODE_W + GAP / 2}
              y={PADDING - 4}
              text-anchor="middle"
              class="enzyme-label"
            >{steps[i + 1].enzyme}</text>
          {/if}
        {/if}
      {/each}
    </svg>
  </div>

  {#if hoveredIndex >= 0 && steps[hoveredIndex]}
    <div class="tooltip" style="left:{tooltipX}px;top:{tooltipY}px">
      {steps[hoveredIndex].description}
    </div>
  {/if}
</div>

<noscript>
  <ol>
    {#each steps as step}
      <li><strong>{step.name}</strong>{step.enzyme ? `（${step.enzyme}）` : ''}：{step.description}</li>
    {/each}
  </ol>
</noscript>

<style>
  .pathway-diagram {
    position: relative;
    padding: 1.5rem;
    border-radius: var(--radius-card);
    border: 1px solid var(--color-fog);
    background-color: white;
  }

  .pathway-title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 1rem;
  }

  .pathway-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  svg {
    display: block;
    min-width: 100%;
    height: auto;
  }

  .pathway-node rect {
    fill: white;
    stroke: var(--color-teal);
    stroke-width: 2;
    transition: stroke 0.2s ease;
    cursor: default;
  }

  .pathway-node--hovered rect {
    stroke: var(--color-coral);
    stroke-width: 2.5;
  }

  .node-label {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    fill: var(--color-ink);
    pointer-events: none;
  }

  .enzyme-label {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 500;
    fill: var(--color-cat-ingredient);
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    background-color: var(--color-ink);
    color: white;
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    max-width: 240px;
    pointer-events: none;
    z-index: 10;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .pathway-scroll {
      margin: 0 -1.5rem;
      padding: 0 1.5rem;
    }
  }
</style>
