<script lang="ts">
  import { onMount } from 'svelte';

  type Question = {
    id: string;
    type: 'radio' | 'checkbox' | 'text';
    label: string;
    options?: string[];
    required: boolean;
  };

  type Template = {
    key: string;
    title: string;
    audience: 'staff' | 'customers';
    questions: Question[];
  };

  type AggregatePayload = {
    responseCount: number;
    questions: Record<string, { totalAnswers: number; optionCounts: Record<string, number> }>;
  };

  let template: Template | null = null;
  let loadingTemplate = true;
  let campaignId = '';
  let current = 0;
  let answers: Record<string, string | string[]> = {};
  let isSubmitting = false;
  let submitError = '';
  let liveCount = 0;
  let showResults = false;
  let aggregate: AggregatePayload | null = null;
  $: currentQuestion = template ? template.questions[current] : null;

  function isSelected(question: Question, option: string) {
    const value = answers[question.id];
    if (question.type === 'checkbox') {
      return Array.isArray(value) && value.includes(option);
    }
    return value === option;
  }

  function toggleAnswer(question: Question, option: string) {
    if (question.type === 'checkbox') {
      const currentValues = Array.isArray(answers[question.id]) ? [...(answers[question.id] as string[])] : [];
      const has = currentValues.includes(option);
      answers[question.id] = has
        ? currentValues.filter((entry) => entry !== option)
        : [...currentValues, option];
    } else {
      answers[question.id] = option;
    }
    answers = { ...answers };
  }

  function canContinue() {
    if (!template) return false;
    const question = template.questions[current];
    const value = answers[question.id];
    if (!question.required) return true;
    if (question.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (question.type === 'text') return typeof value === 'string' && value.trim().length > 0;
    return typeof value === 'string' && value.length > 0;
  }

  function next() {
    if (!template || !canContinue()) return;
    current = Math.min(template.questions.length - 1, current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function percent(value: number, denominator: number) {
    if (!denominator) return 0;
    return Math.round((value / denominator) * 100);
  }

  async function fetchAggregate() {
    if (!template) return;
    const query = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
    const response = await fetch(`/api/surveys/templates/${encodeURIComponent(template.key)}/aggregate${query}`);
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      aggregate = data;
      liveCount = data.responseCount || 0;
    }
  }

  async function submit() {
    if (!template) return;
    isSubmitting = true;
    submitError = '';
    try {
      const response = await fetch(`/api/surveys/responses/${encodeURIComponent(template.key)}`, {
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

    const templateRes = await fetch('/api/surveys/templates/customers-appetite', { cache: 'no-store' });
    const templatePayload = await templateRes.json().catch(() => ({}));
    if (templateRes.ok && templatePayload?.template) {
      template = templatePayload.template;
      await fetchAggregate();
    }

    loadingTemplate = false;
  });
</script>

<svelte:head>
  <title>Misneach - Customer Appetite Survey</title>
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

{#if loadingTemplate}
  <main class="wrap"><section class="card"><p>Loading survey...</p></section></main>
{:else if !template}
  <main class="wrap"><section class="card"><p>Survey template unavailable right now.</p></section></main>
{:else if !showResults}
  <main class="wrap">
    <div class="progress"><div style={`width:${Math.round((current / template.questions.length) * 100)}%`}></div></div>
    <section class="card">
      <p class="counter">Question {current + 1} of {template.questions.length}</p>
      <h2>{currentQuestion?.label}</h2>

      {#if currentQuestion?.type === 'text'}
        <textarea
          placeholder="Anything at all..."
          value={typeof answers[currentQuestion.id] === 'string' ? String(answers[currentQuestion.id]) : ''}
          on:input={(event) => {
            if (!currentQuestion) return;
            answers[currentQuestion.id] = (event.currentTarget as HTMLTextAreaElement).value;
            answers = { ...answers };
          }}
        ></textarea>
      {:else}
        <div class="options">
          {#each currentQuestion?.options || [] as option}
            <button
              type="button"
              class:selected={currentQuestion ? isSelected(currentQuestion, option) : false}
              on:click={() => currentQuestion && toggleAnswer(currentQuestion, option)}
            >
              {option}
            </button>
          {/each}
        </div>
      {/if}

      {#if current < template.questions.length - 1}
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
      {#each template.questions as question}
        <section class="card">
          <h3>{question.label}</h3>
          {#if question.type !== 'text'}
            <div class="bars">
              {#each question.options || [] as option}
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
          {:else}
            <p class="note">Free-text responses are collected anonymously.</p>
          {/if}
        </section>
      {/each}
      <p class="note">Based on {aggregate.responseCount.toLocaleString()} responses.</p>
    {/if}
  </main>
{/if}

<style>
  :global(body) { margin: 0; background: #f5f0e8; color: #1a1a18; font-family: 'Instrument Sans', sans-serif; }
  .site-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e8e0d0; background: #f5f0e8; position: sticky; top: 0; z-index: 10; }
  .brand { text-decoration: none; color: #1c2b22; font-family: 'Fraunces', serif; font-weight: 900; font-size: 19px; }
  .brand em { font-style: italic; color: #2d7a50; font-weight: 300; }
  .hero { background: #1c2b22; color: #f5f0e8; padding: 42px 20px 30px; }
  .hero-inner { max-width: 600px; margin: 0 auto; }
  .eyebrow { margin: 0 0 8px; color: #7ec99a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; }
  h1, h2, h3 { margin: 0; font-family: 'Fraunces', serif; }
  h1 { font-size: clamp(28px, 5vw, 42px); line-height: 1.05; }
  h1 em, h2 em { font-style: italic; font-weight: 300; color: #7ec99a; }
  .hero p { color: rgba(245, 240, 232, 0.72); margin: 10px 0 0; line-height: 1.5; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 22px 18px 60px; }
  .progress { width: 100%; background: #e8e0d0; height: 4px; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
  .progress > div { height: 100%; background: #2d7a50; transition: width 0.2s ease; }
  .card { background: white; border: 1px solid #e8e0d0; border-radius: 14px; padding: 16px; margin-bottom: 12px; }
  .dark { background: #1c2b22; border-color: #1c2b22; }
  .counter { margin: 0 0 8px; font-size: 12px; color: #5a7a64; text-transform: uppercase; letter-spacing: 0.14em; }
  .light { color: #f5f0e8; }
  .light-body { color: rgba(245, 240, 232, 0.7); margin-top: 8px; }
  .options { margin-top: 14px; display: grid; gap: 8px; }
  .options button { text-align: left; border: 1px solid #e8e0d0; background: white; border-radius: 10px; padding: 11px 12px; font: inherit; cursor: pointer; }
  .options button.selected { border-color: #2d7a50; background: rgba(45, 122, 80, 0.08); }
  textarea { width: 100%; min-height: 130px; border: 1px solid #e8e0d0; border-radius: 10px; padding: 12px; font: inherit; resize: vertical; margin-top: 10px; }
  .next { margin-top: 14px; border: none; border-radius: 10px; background: #1c2b22; color: #f5f0e8; padding: 12px 16px; font: inherit; cursor: pointer; }
  .next:disabled { opacity: 0.45; cursor: default; }
  .error { color: #8c2b2b; margin-top: 10px; }
  .bars { margin-top: 12px; display: grid; gap: 10px; }
  .bar-meta { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
  .track { margin-top: 4px; height: 8px; border-radius: 10px; overflow: hidden; background: #e8e0d0; }
  .fill { height: 100%; background: #2d7a50; }
  .note { font-size: 12px; color: #5a7a64; margin-top: 10px; }
</style>
