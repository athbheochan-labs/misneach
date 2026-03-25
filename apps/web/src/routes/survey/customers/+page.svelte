<script lang="ts">
  import { onMount } from 'svelte';

  type Question = {
    id: string;
    label: string;
    type: 'radio' | 'checkbox';
    options: string[];
    hint?: string;
  };

  const questions: Question[] = [
    {
      id: 'q1',
      label: 'How would you describe your Irish?',
      type: 'radio',
      options: [
        'None at all',
        'A few words - slan, go raibh maith agat',
        'Enough to order a coffee',
        'More than I let on - rusty but there',
        'Conversational or fluent',
      ],
    },
    {
      id: 'q2',
      label: 'When did you last use Irish with a stranger?',
      type: 'radio',
      options: ['Recently - this year', 'A few years ago', 'School - and not since', 'Never'],
    },
    {
      id: 'q3',
      label: 'If a member of staff greeted you in Irish, how would you feel?',
      type: 'radio',
      options: [
        "Delighted - I'd try to reply",
        'Pleasantly surprised',
        'Fine either way',
        "A bit awkward - I wouldn't know what to say",
        "I'd prefer they didn't",
      ],
    },
    {
      id: 'q4',
      label: 'If there was a sign on the door saying Irish was welcome, would you try ordering in Irish?',
      type: 'radio',
      options: [
        "Yes - I'd do it straight away",
        "Probably - once I'd seen someone else do it",
        "Maybe - I'd need to feel ready first",
        "Probably not - my Irish isn't good enough",
        "No - I'm happy ordering in English",
      ],
    },
    {
      id: 'q5',
      label: 'What would make you more likely to use Irish here?',
      type: 'checkbox',
      hint: 'Pick all that apply.',
      options: [
        'A sign on the door saying Irish is welcome',
        'Knowing the staff had some Irish',
        'A cheatsheet on the counter with key phrases',
        'Seeing other customers do it first',
        "Just knowing it wouldn't be weird",
        "Nothing - I'd just do it",
      ],
    },
    {
      id: 'q6',
      label: 'Would it make you feel better about this place if Irish was part of how it operated?',
      type: 'radio',
      options: [
        'Yes - it would feel more like a community place',
        "Probably - it's a nice thing to do",
        "Neutral - it wouldn't change how I feel",
        'Not really - I come for the coffee',
      ],
    },
  ];

  type AggregatePayload = {
    responseCount: number;
    questions: Record<string, { totalAnswers: number; optionCounts: Record<string, number> }>;
  };

  let campaignId = '';
  let current = 0;
  let answers: Record<string, string | string[]> = {};
  let isSubmitting = false;
  let submitError = '';
  let liveCount = 0;
  let showResults = false;
  let aggregate: AggregatePayload | null = null;

  const total = questions.length;

  function isSelected(question: Question, option: string) {
    const normalizedOption = String(option);
    const value = answers[question.id];
    if (question.type === 'checkbox') {
      return Array.isArray(value) && value.includes(normalizedOption);
    }
    return value === normalizedOption;
  }

  function toggleAnswer(question: Question, option: string) {
    const normalizedOption = String(option);
    if (question.type === 'checkbox') {
      const currentValues = Array.isArray(answers[question.id]) ? [...(answers[question.id] as string[])] : [];
      const has = currentValues.includes(normalizedOption);
      answers[question.id] = has
        ? currentValues.filter((entry) => entry !== normalizedOption)
        : [...currentValues, normalizedOption];
    } else {
      answers[question.id] = normalizedOption;
    }
    answers = { ...answers };
  }

  function canContinue() {
    const question = questions[current];
    const value = answers[question.id];
    if (question.type === 'checkbox') {
      return Array.isArray(value) && value.length > 0;
    }
    return String(value ?? '').trim().length > 0;
  }

  function next() {
    if (!canContinue()) return;
    current = Math.min(total - 1, current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function percent(value: number, denominator: number) {
    if (!denominator) return 0;
    return Math.round((value / denominator) * 100);
  }

  async function fetchAggregate() {
    const query = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
    const response = await fetch(`/api/surveys/templates/customers-cafe-v1/aggregate${query}`);
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      aggregate = data;
      liveCount = data.responseCount || 0;
    }
  }

  async function submit() {
    isSubmitting = true;
    submitError = '';
    try {
      const response = await fetch('/api/surveys/responses/customers-cafe-v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignId || undefined,
          answers,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Could not submit survey');
      }
      await fetchAggregate();
      showResults = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      submitError = error instanceof Error ? error.message : 'Could not submit survey';
    } finally {
      isSubmitting = false;
    }
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    campaignId = params.get('c') || '';
    await fetchAggregate();
  });
</script>

<svelte:head>
  <title>Misneach - Would Irish Work Here?</title>
</svelte:head>

<header class="site-header">
  <a href="/" class="brand">Misne<em>ach</em></a>
  <span>{liveCount.toLocaleString()} responses</span>
</header>

<section class="hero">
  <div class="hero-inner">
    <p class="eyebrow">Quick question for customers</p>
    <h1>Would Irish work <em>here?</em></h1>
    <p>Six quick questions. See how your answers compare when you're done.</p>
  </div>
</section>

{#if !showResults}
  <main class="wrap">
    <div class="progress"><div style={`width:${Math.round((current / total) * 100)}%`}></div></div>
    <section class="card">
      <p class="counter">Question {current + 1} of {total}</p>
      <h2>{questions[current].label}</h2>
      {#if questions[current].hint}
        <p class="hint">{questions[current].hint}</p>
      {/if}

      <div class="options">
        {#each questions[current].options as option}
          <button
            type="button"
            class:selected={isSelected(questions[current], option)}
            on:click={() => toggleAnswer(questions[current], option)}
          >
            {option}
          </button>
        {/each}
      </div>

      {#if current < total - 1}
        <button type="button" class="next" disabled={!canContinue()} on:click={next}>Next</button>
      {:else}
        <button type="button" class="next" disabled={!canContinue() || isSubmitting} on:click={submit}>
          {isSubmitting ? 'Submitting...' : 'See results'}
        </button>
      {/if}
      {#if submitError}
        <p class="error">{submitError}</p>
      {/if}
    </section>
  </main>
{:else}
  <main class="wrap">
    <section class="card dark">
      <p class="counter light">Your results</p>
      <h2 class="light">Go raibh maith <em>agat.</em></h2>
      <p class="light-body">Here's how your answers compare to everyone who's taken this survey.</p>
    </section>

    {#if aggregate}
      {#each questions as question}
        <section class="card">
          <h3>{question.label}</h3>
          <div class="bars">
            {#each question.options as option}
              {@const count = aggregate.questions?.[question.id]?.optionCounts?.[option] || 0}
              {@const denom = aggregate.questions?.[question.id]?.totalAnswers || aggregate.responseCount || 0}
              {@const pct = percent(count, denom)}
              <div class="bar-row">
                <div class="bar-meta">
                  <span>{option}</span>
                  <strong>{pct}%</strong>
                </div>
                <div class="track">
                  <div class="fill" style={`width:${pct}%`}></div>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/each}
      <p class="note">Based on {aggregate.responseCount.toLocaleString()} responses.</p>
    {/if}
  </main>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: #f5f0e8;
    color: #1a1a18;
    font-family: 'Instrument Sans', sans-serif;
  }
  .site-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e8e0d0;
    background: #f5f0e8;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .brand {
    text-decoration: none;
    color: #1c2b22;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 19px;
  }
  .brand em {
    font-style: italic;
    color: #2d7a50;
    font-weight: 300;
  }
  .hero {
    background: #1c2b22;
    color: #f5f0e8;
    padding: 42px 20px 30px;
  }
  .hero-inner {
    max-width: 600px;
    margin: 0 auto;
  }
  .eyebrow {
    margin: 0 0 8px;
    color: #7ec99a;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  h1, h2, h3 {
    margin: 0;
    font-family: 'Fraunces', serif;
  }
  h1 {
    font-size: clamp(28px, 5vw, 42px);
    line-height: 1.05;
  }
  h1 em, h2 em {
    font-style: italic;
    font-weight: 300;
    color: #7ec99a;
  }
  .hero p {
    color: rgba(245, 240, 232, 0.72);
    margin: 10px 0 0;
    line-height: 1.5;
  }
  .wrap {
    max-width: 600px;
    margin: 0 auto;
    padding: 22px 18px 60px;
  }
  .progress {
    width: 100%;
    background: #e8e0d0;
    height: 4px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .progress > div {
    height: 100%;
    background: #2d7a50;
    transition: width 0.2s ease;
  }
  .card {
    background: white;
    border: 1px solid #e8e0d0;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .dark {
    background: #1c2b22;
    border-color: #1c2b22;
  }
  .counter {
    margin: 0 0 8px;
    font-size: 12px;
    color: #5a7a64;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .light {
    color: #f5f0e8;
  }
  .light-body {
    color: rgba(245, 240, 232, 0.7);
    margin-top: 8px;
  }
  .hint {
    margin: 10px 0 0;
    color: #5a7a64;
    font-size: 14px;
  }
  .options {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }
  .options button {
    text-align: left;
    border: 1px solid #e8e0d0;
    background: white;
    border-radius: 10px;
    padding: 11px 12px;
    font: inherit;
    cursor: pointer;
  }
  .options button.selected {
    border-color: #2d7a50;
    background: rgba(45, 122, 80, 0.08);
  }
  .next {
    margin-top: 14px;
    border: none;
    border-radius: 10px;
    background: #1c2b22;
    color: #f5f0e8;
    padding: 12px 16px;
    font: inherit;
    cursor: pointer;
  }
  .next:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .error {
    color: #8c2b2b;
    margin-top: 10px;
  }
  .bars {
    margin-top: 12px;
    display: grid;
    gap: 10px;
  }
  .bar-meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
  }
  .track {
    margin-top: 4px;
    height: 8px;
    border-radius: 10px;
    overflow: hidden;
    background: #e8e0d0;
  }
  .fill {
    height: 100%;
    background: #2d7a50;
  }
  .note {
    font-size: 12px;
    color: #5a7a64;
    text-align: center;
    margin-top: 16px;
  }
</style>
