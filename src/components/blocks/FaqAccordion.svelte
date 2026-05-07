<script>
  /** @type {{ question: string; answer: string }[]} */
  export let items = [];

  let openIndex = -1;

  function toggle(index) {
    openIndex = openIndex === index ? -1 : index;
  }
</script>

<div class="faq-accordion">
  {#each items as item, i}
    <div class="faq-accordion__item">
      <button
        class="faq-accordion__question"
        type="button"
        aria-expanded={openIndex === i}
        on:click={() => toggle(i)}
      >
        <span>{item.question}</span>
        <svg
          class="faq-accordion__chevron"
          class:faq-accordion__chevron--open={openIndex === i}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {#if openIndex === i}
        <div class="faq-accordion__answer">
          <p>{item.answer}</p>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .faq-accordion {
    width: 100%;
  }

  .faq-accordion__item {
    border-bottom: 1px solid var(--color-fog);
  }

  .faq-accordion__item:last-child {
    border-bottom: none;
  }

  .faq-accordion__question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    min-height: 48px;
    padding: 1rem 0;
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: var(--text-body);
    font-weight: 600;
    color: var(--color-ink);
    text-align: left;
    line-height: 1.5;
  }

  .faq-accordion__question:hover {
    color: var(--color-teal);
  }

  .faq-accordion__question:focus-visible {
    outline: 2px solid var(--color-teal);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .faq-accordion__chevron {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    color: color-mix(in oklch, var(--color-ink) 50%, transparent);
  }

  .faq-accordion__chevron--open {
    transform: rotate(180deg);
  }

  .faq-accordion__answer {
    padding: 0 0 1rem;
  }

  .faq-accordion__answer p {
    font-size: var(--text-body);
    color: color-mix(in oklch, var(--color-ink) 80%, transparent);
    line-height: 1.8;
  }
</style>
