<script>
  /** @type {{ headings: Array<{ slug: string; text: string; depth: number }> }} */
  let { headings = [] } = $props();

  let activeSlug = $state('');

  $effect(() => {
    if (typeof window === 'undefined' || headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSlug = entry.target.id;
          }
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  });
</script>

<nav class="toc" aria-label="Table of Contents">
  <span class="toc__title">目錄</span>
  <ul class="toc__list">
    {#each headings as heading}
      <li
        class="toc__item"
        class:toc__item--active={activeSlug === heading.slug}
        style="padding-left: {(heading.depth - 2) * 0.75}rem"
      >
        <a class="toc__link" href="#{heading.slug}">
          {heading.text}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .toc {
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    min-width: 0;
    max-width: 100%;
  }

  .toc__title {
    display: block;
    font-weight: 700;
    font-size: var(--text-body);
    color: var(--color-ink);
    margin-bottom: 0.75rem;
  }

  .toc__list {
    list-style: none;
    padding: 0;
    min-width: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .toc__item {
    border-left: 3px solid transparent;
    transition: border-color 0.15s ease;
    min-width: 0;
  }

  .toc__item--active {
    border-left-color: var(--color-teal);
  }

  .toc__item--active .toc__link {
    font-weight: 700;
    color: var(--color-teal);
  }

  .toc__link {
    display: block;
    padding: 0.35rem 0.75rem;
    color: color-mix(in oklch, var(--color-ink) 65%, transparent);
    text-decoration: none;
    overflow-wrap: anywhere;
    line-height: 1.5;
    transition: color 0.15s ease;
  }

  .toc__link:hover {
    color: var(--color-teal);
    text-decoration: none;
    overflow-wrap: anywhere;
  }
</style>
