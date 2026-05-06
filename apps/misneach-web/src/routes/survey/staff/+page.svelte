<script lang="ts">
  import { onMount } from 'svelte';

  const steps = [
    {
      id: 'q1',
      question: 'How would you describe your Irish?',
      hint: "Be honest - there's genuinely no wrong answer here.",
      options: [
        'None at all - it never stuck',
        'A few words - slan, go raibh maith agat, that kind of thing',
        'Enough to get by - I could manage a basic exchange',
        'More than I let on - rusty but there',
        'Fairly conversational or fluent',
      ],
    },
    {
      id: 'q2',
      question:
        'How would you feel if your cafe used a small bit of Irish as part of how it operates?',
      hint: '',
      options: [
        "I'd love it - I'd want to be involved",
        "I'd be fine with it - happy to try if it's low-pressure",
        "Neutral - I wouldn't mind either way",
        "A bit uncertain - I'd want to know more first",
        "Not for me - I'd rather not be involved",
      ],
    },
    {
      id: 'q3',
      question: 'If the cafe offered a short, paid Irish course as part of the job, interested?',
      hint: 'Short practical course, done in your own time, at no cost to you.',
      options: [
        "Yes - I'd genuinely like to do that",
        'Possibly - depends how long it takes',
        "Maybe - I'd want to see it first",
        "Probably not - it's not really for me",
        "No - I'm not interested in learning Irish",
      ],
    },
    {
      id: 'q4',
      question: 'If you were to use any Irish at work, what would you be most comfortable with?',
      hint: 'Pick the one that feels most realistic right now.',
      options: [
        'A word or two if a customer started it',
        'A simple greeting',
        'A full order exchange',
        "I'd rather not use Irish at work at all",
      ],
    },
  ];

  let currentStep = 0;
  let answers: Record<string, string> = {};
  let openText = '';
  let submitted = false;
  let campaignId = '';
  let businessName = 'your cafe';
  let submitError = '';

  function pick(option: string) {
    answers[steps[currentStep].id] = String(option);
    answers = { ...answers };
  }

  function canContinue() {
    return String(answers[steps[currentStep].id] ?? '').trim().length > 0;
  }

  function next() {
    if (!canContinue()) return;
    currentStep = Math.min(currentStep + 1, steps.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    submitError = '';
    try {
      const payload = {
        campaignId: campaignId || undefined,
        answers: {
          ...answers,
          q5_open: openText.trim() || undefined,
        },
      };
      const response = await fetch('/api/surveys/responses/staff-cafe-v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
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
    const c = params.get('c') || '';
    campaignId = c;
    if (!campaignId) return;
    const response = await fetch(`/api/surveys/campaigns/${encodeURIComponent(campaignId)}/public`);
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.campaign?.businessName) {
      businessName = data.campaign.businessName;
    }
  });
</script>

<svelte:head>
  <title>Misneach - Staff Survey</title>
</svelte:head>

<div class="hero">
  <div class="hero-inner">
    <p class="eyebrow">A quick question from {businessName}</p>
    <h1>Irish at work - <em>what do you think?</em></h1>
    <p class="sub">Anonymous. No pressure. Just a quick way to understand what staff think.</p>
  </div>
</div>

<main class="wrap">
  {#if submitted}
    <section class="card">
      <h2>Go raibh maith <em>agat.</em></h2>
      <p>Your answers were submitted anonymously.</p>
      <a href="/taster" class="btn">Try a free lesson</a>
    </section>
  {:else if currentStep < steps.length}
    <section class="card">
      <p class="counter">{currentStep + 1} of {steps.length + 1}</p>
      <h2>{steps[currentStep].question}</h2>
      {#if steps[currentStep].hint}
        <p class="hint">{steps[currentStep].hint}</p>
      {/if}
      <div class="opts">
        {#each steps[currentStep].options as option}
          <button
            type="button"
            class:selected={answers[steps[currentStep].id] === option}
            on:click={() => pick(option)}
          >
            {option}
          </button>
        {/each}
      </div>
      <button type="button" class="btn" disabled={!canContinue()} on:click={next}>Next</button>
    </section>
  {:else}
    <section class="card">
      <p class="counter">5 of 5</p>
      <h2>Is there anything about this idea that you'd want your manager to know?</h2>
      <p class="hint">Optional and anonymous.</p>
      <textarea bind:value={openText} placeholder="Anything at all..."></textarea>
      {#if submitError}
        <p class="error">{submitError}</p>
      {/if}
      <button type="button" class="btn" on:click={submit}>Submit</button>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f5f0e8;
    color: #1a1a18;
    font-family: 'Instrument Sans', sans-serif;
  }
  .hero {
    background: #1c2b22;
    color: #f5f0e8;
    padding: 46px 20px 34px;
  }
  .hero-inner {
    max-width: 560px;
    margin: 0 auto;
  }
  .eyebrow {
    margin: 0 0 8px;
    color: #7ec99a;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  h1, h2 {
    margin: 0;
    font-family: 'Fraunces', serif;
    color: #1c2b22;
  }
  h1 {
    color: #f5f0e8;
    font-size: clamp(28px, 5vw, 40px);
    line-height: 1.1;
  }
  h1 em, h2 em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }
  h1 em {
    color: #7ec99a;
  }
  .sub {
    color: rgba(245, 240, 232, 0.7);
    margin: 10px 0 0;
    line-height: 1.6;
  }
  .wrap {
    max-width: 560px;
    margin: 0 auto;
    padding: 24px 18px 60px;
  }
  .card {
    background: white;
    border: 1px solid #e8e0d0;
    border-radius: 14px;
    padding: 18px;
  }
  .counter {
    color: #5a7a64;
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  .hint {
    color: #5a7a64;
    margin: 10px 0 14px;
    line-height: 1.5;
    font-size: 14px;
  }
  .opts {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }
  .opts button {
    text-align: left;
    border: 1px solid #e8e0d0;
    border-radius: 10px;
    background: white;
    padding: 12px 13px;
    color: #1a1a18;
    font: inherit;
    cursor: pointer;
  }
  .opts button.selected {
    border-color: #2d7a50;
    background: rgba(45, 122, 80, 0.06);
  }
  .btn {
    margin-top: 16px;
    border: none;
    border-radius: 10px;
    background: #1c2b22;
    color: #f5f0e8;
    padding: 12px 16px;
    font: inherit;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  textarea {
    width: 100%;
    min-height: 120px;
    border: 1px solid #e8e0d0;
    border-radius: 10px;
    padding: 12px;
    font: inherit;
    resize: vertical;
  }
  .error {
    color: #8c2b2b;
    margin-top: 8px;
  }
</style>
