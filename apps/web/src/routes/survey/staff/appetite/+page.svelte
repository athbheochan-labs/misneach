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

  let template: Template | null = null;
  let loadingTemplate = true;
  let currentStep = 0;
  let answers: Record<string, string | string[]> = {};
  let submitted = false;
  let campaignId = '';
  let businessName = 'your cafe';
  let submitError = '';
  $: currentQuestion = template ? template.questions[currentStep] : null;

  function setAnswer(question: Question, option: string) {
    if (question.type === 'checkbox') {
      const current = Array.isArray(answers[question.id]) ? [...(answers[question.id] as string[])] : [];
      answers[question.id] = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
    } else {
      answers[question.id] = option;
    }
    answers = { ...answers };
  }

  function canContinue(question: Question) {
    if (!question.required) return true;
    const value = answers[question.id];
    if (question.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (question.type === 'text') return typeof value === 'string' ? value.trim().length > 0 : false;
    return typeof value === 'string' && value.length > 0;
  }

  function next(question: Question) {
    if (!canContinue(question)) return;
    if (!template) return;
    currentStep = Math.min(currentStep + 1, template.questions.length - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (!template) return;
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
      submitted = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      submitError = error instanceof Error ? error.message : 'Could not submit survey';
    }
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    campaignId = params.get('c') || '';

    const templateRes = await fetch('/api/surveys/templates/staff-appetite', { cache: 'no-store' });
    const templatePayload = await templateRes.json().catch(() => ({}));
    if (templateRes.ok && templatePayload?.template) {
      template = templatePayload.template;
    }
    loadingTemplate = false;

    if (!campaignId) return;
    const campaignRes = await fetch(`/api/surveys/campaigns/${encodeURIComponent(campaignId)}/public`);
    const campaignPayload = await campaignRes.json().catch(() => ({}));
    if (campaignRes.ok && campaignPayload?.campaign?.businessName) {
      businessName = campaignPayload.campaign.businessName;
    }
  });
</script>

<svelte:head>
  <title>Misneach - Staff Appetite Survey</title>
</svelte:head>

<div class="hero">
  <div class="hero-inner">
    <p class="eyebrow">A quick question from {businessName}</p>
    <h1>Irish at work - <em>what do you think?</em></h1>
    <p class="sub">Anonymous. No pressure. Just a quick way to understand what staff think.</p>
  </div>
</div>

<main class="wrap">
  {#if loadingTemplate}
    <section class="card"><p>Loading survey...</p></section>
  {:else if !template}
    <section class="card"><p>Survey template unavailable right now.</p></section>
  {:else if submitted}
    <section class="card">
      <h2>Go raibh maith <em>agat.</em></h2>
      <p>Your answers were submitted anonymously.</p>
      <a href="/taster" class="btn">Try a free lesson</a>
    </section>
  {:else}
    <section class="card">
      <p class="counter">{currentStep + 1} of {template.questions.length}</p>
      <h2>{currentQuestion?.label.replaceAll('your cafe', businessName).replaceAll('your business', businessName)}</h2>

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
        <div class="opts">
          {#each currentQuestion?.options || [] as option}
            <button
              type="button"
              class:selected={currentQuestion?.type === 'checkbox'
                ? Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).includes(option)
                : currentQuestion ? answers[currentQuestion.id] === option : false}
              on:click={() => currentQuestion && setAnswer(currentQuestion, option)}
            >
              {option}
            </button>
          {/each}
        </div>
      {/if}

      {#if submitError}
        <p class="error">{submitError}</p>
      {/if}

      {#if currentStep < template.questions.length - 1}
        <button type="button" class="btn" disabled={!currentQuestion || !canContinue(currentQuestion)} on:click={() => currentQuestion && next(currentQuestion)}>Next</button>
      {:else}
        <button type="button" class="btn" disabled={!currentQuestion || !canContinue(currentQuestion)} on:click={submit}>Submit</button>
      {/if}
    </section>
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #f5f0e8; color: #1a1a18; font-family: 'Instrument Sans', sans-serif; }
  .hero { background: #1c2b22; color: #f5f0e8; padding: 46px 20px 34px; }
  .hero-inner { max-width: 560px; margin: 0 auto; }
  .eyebrow { margin: 0 0 8px; color: #7ec99a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; }
  h1, h2 { margin: 0; font-family: 'Fraunces', serif; color: #1c2b22; }
  h1 { color: #f5f0e8; font-size: clamp(28px, 5vw, 40px); line-height: 1.1; }
  h1 em, h2 em { font-style: italic; font-weight: 300; color: #2d7a50; }
  h1 em { color: #7ec99a; }
  .sub { color: rgba(245, 240, 232, 0.7); margin: 10px 0 0; line-height: 1.6; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 24px 18px 60px; }
  .card { background: white; border: 1px solid #e8e0d0; border-radius: 14px; padding: 18px; }
  .counter { color: #5a7a64; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em; }
  .opts { display: grid; gap: 8px; margin-top: 14px; }
  .opts button { text-align: left; border: 1px solid #e8e0d0; border-radius: 10px; background: white; padding: 12px 13px; color: #1a1a18; font: inherit; cursor: pointer; }
  .opts button.selected { border-color: #2d7a50; background: rgba(45, 122, 80, 0.06); }
  .btn { margin-top: 16px; border: none; border-radius: 10px; background: #1c2b22; color: #f5f0e8; padding: 12px 16px; font: inherit; cursor: pointer; text-decoration: none; display: inline-flex; }
  .btn:disabled { opacity: 0.4; cursor: default; }
  textarea { width: 100%; min-height: 120px; border: 1px solid #e8e0d0; border-radius: 10px; padding: 12px; font: inherit; resize: vertical; margin-top: 12px; }
  .error { color: #8c2b2b; margin-top: 8px; }
</style>
