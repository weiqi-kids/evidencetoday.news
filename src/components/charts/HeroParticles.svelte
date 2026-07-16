<script>
  import { onMount } from 'svelte';
  import { timer } from 'd3-timer';

  let canvas;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Initialize 40 particles with random positions, sizes, opacities, velocities
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 2 + Math.random() * 4,
      opacity: 0.1 + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    // 只畫一幀（不推進位置）——靜態幀，reduced-motion 時使用
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      }
    }

    // Handle resize（靜態與動態皆需重繪）
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
      draw();
    });
    resizeObserver.observe(canvas.parentElement);

    // 尊重「減少動態」偏好（WCAG 2.3.3）：只畫一張靜態粒子幀，保留裝飾質感但不飄動
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      draw();
      return () => {
        resizeObserver.disconnect();
      };
    }

    const t = timer(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      }
    });

    return () => {
      t.stop();
      resizeObserver.disconnect();
    };
  });
</script>

<canvas bind:this={canvas} class="hero-particles"></canvas>

<style>
  .hero-particles {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
