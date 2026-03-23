<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { trackPlausibleEvent } from './analytics/plausible';

  type UnitLesson = {
    title: string;
    estimatedMinutes: number;
    bodyHtml: string;
  };

  const dispatch = createEventDispatcher<{
    complete: { step: number };
    primary: { step: number };
  }>();

  export let mode: 'taster' | 'unit' = 'taster';
  export let homeHref = '/';
  export let signInHref = '/auth/login';
  export let registerHref = '/auth/signup';
  export let primaryCtaHref: string | null = '/auth/signup';
  export let secondaryCtaHref: string | null = '/pricing';
  export let primaryCtaLabel = 'Lean ar aghaidh — Keep going';
  export let secondaryCtaLabel = 'See what the full course costs';
  export let reassureText = 'No card needed to create an account. The first unit is completely free.';
  export let lessonLabel = 'Lesson 1 of 12 · Coffee Shop Encounters';
  export let embedded = false;
  export let trackEnabled = true;
  export let plausiblePrefix = 'Taster';
  export let unitTitle = 'Coffee Shop Encounters';
  export let unitLessons: UnitLesson[] = [];

  let currentStep = 1;
  const tasterTotalSteps = 5;
  const quizCorrectIndex = 1;

  let quizAnswered = false;
  let quizSelectedIndex = -1;
  let showQuizContinue = false;

  const options = [
    { label: 'A', irish: 'Dia duit', pron: 'DEE-ah gwich' },
    { label: 'B', irish: 'Dia is Muire duit', pron: 'DEE-ah iss MWIR-eh gwich' },
    { label: 'C', irish: 'Go raibh maith agat', pron: 'Guh rev mah ah-gut' },
  ];

  $: totalSteps = mode === 'unit' ? Math.max(1, unitLessons.length + 1) : tasterTotalSteps;
  $: progressPct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;
  $: quizIsCorrect = quizSelectedIndex === quizCorrectIndex;
  $: activeLesson = mode === 'unit' ? unitLessons[currentStep - 1] : null;

  function track(event: string) {
    if (!trackEnabled) return;
    void trackPlausibleEvent(event);
  }

  export function reset() {
    currentStep = 1;
    quizAnswered = false;
    quizSelectedIndex = -1;
    showQuizContinue = false;
  }

  function goTo(step: number) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;
    if (mode === 'taster' && step === 3) {
      quizAnswered = false;
      quizSelectedIndex = -1;
      showQuizContinue = false;
    }
    if (step === 2) track(`${plausiblePrefix}: Started`);
    if (step === totalSteps) {
      track(`${plausiblePrefix}: Completed`);
      dispatch('complete', { step });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function answerQuiz(index: number) {
    if (quizAnswered) return;
    quizAnswered = true;
    quizSelectedIndex = index;
    setTimeout(() => {
      showQuizContinue = true;
    }, 800);
  }

  function handlePrimaryClick(event: MouseEvent) {
    dispatch('primary', { step: currentStep });
    if (!primaryCtaHref) {
      event.preventDefault();
    }
  }

  function nextUnitStep() {
    if (currentStep < totalSteps) {
      goTo(currentStep + 1);
    }
  }

  function prevUnitStep() {
    if (currentStep > 1) {
      goTo(currentStep - 1);
    }
  }
</script>

<div class={`mis-course-content-flow-root ${embedded ? 'embedded' : ''}`}>
  {#if !embedded}
    <nav>
      <a href={homeHref} class="nav-brand">
        <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
          <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="rgba(245,240,232,0.15)" stroke="rgba(245,240,232,0.3)" stroke-width="2"></path>
          <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none"></path>
          <circle cx="33.5" cy="45" r="3" fill="#7ec99a"></circle>
        </svg>
        <span class="nav-name">Misne<em>ach</em></span>
      </a>
      <div class="nav-right">
        <a href={signInHref} class="nav-sign-in">Sign in</a>
        <a href={registerHref} class="nav-register">Create account</a>
      </div>
    </nav>
  {/if}

  <div class="progress-bar-wrap">
    <div class="progress-bar-fill" style={`width:${progressPct}%`}></div>
  </div>

  <main class="lesson-wrap">
    {#if currentStep < totalSteps}
      <div class="lesson-counter">
        {#each Array.from({ length: totalSteps }, (_, idx) => idx + 1) as dot}
          <div class="counter-dot" class:done={dot < currentStep} class:active={dot === currentStep}></div>
        {/each}
      </div>
    {/if}

    {#if mode === 'unit' && currentStep <= unitLessons.length}
      <div class="step active">
        <div class="step-label">Lesson {currentStep} of {unitLessons.length} · {unitTitle}</div>
        <div class="phrase-card">
          <div class="phrase-irish">{activeLesson?.title || ''}</div>
          <div class="phrase-english">~{activeLesson?.estimatedMinutes || 0} min</div>
        </div>
        <div class="context-box unit-body">
          {@html activeLesson?.bodyHtml || ''}
        </div>
        <div class="unit-nav">
          <button class="btn-ghost btn-unit-nav" on:click={prevUnitStep} disabled={currentStep === 1}>Back</button>
          <button class="btn-continue" on:click={nextUnitStep}>
            {currentStep < unitLessons.length ? 'Next lesson →' : 'Finish unit →'}
          </button>
        </div>
      </div>
    {/if}

    {#if mode === 'taster' && currentStep === 1}
      <div class="step active">
        <div class="step-label">{lessonLabel}</div>
        <div class="phrase-card">
          <div class="phrase-irish">Dia duit</div>
          <div class="phrase-pronunciation">DEE-ah gwich</div>
          <div class="phrase-english">Hello</div>
        </div>
        <div class="context-box">
          This is how you say hello in Irish. Literally it means <strong>"God be with you"</strong> — but don't think about that. Just think: <strong>Dia duit = Hello.</strong> You've probably heard it before without realising.
        </div>
        <button class="btn-continue" on:click={() => goTo(2)}>Go on then →</button>
      </div>
    {/if}

    {#if mode === 'taster' && currentStep === 2}
      <div class="step active">
        <div class="step-label">Now, the reply</div>
        <div class="dialogue">
          <div class="dialogue-line">
            <div class="dialogue-avatar">☕</div>
            <div class="dialogue-bubble">
              <div class="dialogue-speaker">Customer</div>
              <div class="dialogue-irish">Dia duit</div>
              <div class="dialogue-pron">DEE-ah gwich</div>
              <div class="dialogue-eng">Hello</div>
            </div>
          </div>
          <div class="dialogue-line right">
            <div class="dialogue-avatar">🧑‍🍳</div>
            <div class="dialogue-bubble">
              <div class="dialogue-speaker">Staff</div>
              <div class="dialogue-irish">Dia is Muire duit</div>
              <div class="dialogue-pron">DEE-ah iss MWIR-eh gwich</div>
              <div class="dialogue-eng">Hello back</div>
            </div>
          </div>
        </div>
        <div class="context-box">
          You don't reply with <em>Dia duit</em> again. The response is <strong>Dia is Muire duit</strong> — "God and Mary be with you." Two beats longer, slightly more elaborate. That's Irish for you.
        </div>
        <button class="btn-continue" on:click={() => goTo(3)}>I've got it →</button>
      </div>
    {/if}

    {#if mode === 'taster' && currentStep === 3}
      <div class="step active">
        <div class="step-label">Quick check</div>
        <div class="quiz-prompt">Someone says "Dia duit" to you.</div>
        <div class="quiz-subprompt">What do you say back?</div>

        <div class="quiz-options">
          {#each options as opt, index}
            {@const isCorrect = index === quizCorrectIndex}
            <button
              class={`quiz-opt ${quizAnswered ? 'answered' : ''} ${quizAnswered && isCorrect ? 'correct' : ''} ${quizAnswered && quizSelectedIndex === index && !isCorrect ? 'wrong' : ''}`}
              on:click={() => answerQuiz(index)}
              disabled={quizAnswered}
            >
              <div class="quiz-opt-letter">{opt.label}</div>
              <div>
                <div class="quiz-opt-text">{opt.irish}</div>
                <div class="quiz-opt-sub">{opt.pron}</div>
              </div>
            </button>
          {/each}
        </div>

        {#if quizAnswered && quizIsCorrect}
          <div class="feedback good show">
            <strong>Maith thú — well done.</strong> You don't mirror the greeting back, you step it up. That's the pattern.
          </div>
        {/if}

        {#if quizAnswered && !quizIsCorrect}
          <div class="feedback bad show">
            <strong>Not quite.</strong> You can't reply with the same greeting. Try <strong>Dia is Muire duit</strong> — the longer reply.
          </div>
        {/if}

        {#if showQuizContinue}
          <button class="btn-continue" on:click={() => goTo(4)}>Keep going →</button>
        {/if}
      </div>
    {/if}

    {#if mode === 'taster' && currentStep === 4}
      <div class="step active">
        <div class="step-label">One more</div>
        <div class="phrase-card">
          <div class="phrase-irish">Go raibh maith agat</div>
          <div class="phrase-pronunciation">Guh rev mah ah-gut</div>
          <div class="phrase-english">Thank you</div>
        </div>
        <div class="context-box">
          This one looks terrifying written down. But say it out loud slowly: <strong>Guh — rev — mah — ah-gut.</strong> Now faster. That's it. You just said thank you in Irish.
        </div>
        <button class="btn-continue" on:click={() => goTo(5)}>I can say that →</button>
      </div>
    {/if}

    {#if currentStep === totalSteps}
      <div class="step active">
        <div class="win-mark">
          <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
            <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="rgba(126,201,154,0.15)" stroke="rgba(126,201,154,0.3)" stroke-width="2"></path>
            <path d="M28 52 C31 40, 40 32, 46 26" stroke="#7ec99a" stroke-width="5" stroke-linecap="round" fill="none"></path>
            <circle cx="28.5" cy="51.5" r="4" fill="#7ec99a"></circle>
          </svg>
        </div>
        <div class="win-headline">
          That's not nothing.
          <em>That's a start.</em>
        </div>
        {#if mode === 'unit'}
          <div class="win-sub">
            You completed the full first unit. Next, join the waitlist to continue with the rest of the course.
          </div>
        {:else}
          <div class="win-sub">
            You just learned three Irish phrases — hello, hello back, and thank you. That's a real exchange. The rest of the course covers everything else you'd need in a coffee shop.
          </div>
        {/if}
        <div class="win-ctas">
          {#if primaryCtaHref}
            <a href={primaryCtaHref} class="btn-primary" on:click={handlePrimaryClick}>{primaryCtaLabel}</a>
          {:else}
            <button class="btn-primary" on:click={handlePrimaryClick}>{primaryCtaLabel}</button>
          {/if}
          {#if secondaryCtaHref}
            <a href={secondaryCtaHref} class="btn-ghost">{secondaryCtaLabel}</a>
          {/if}
        </div>
        {#if reassureText}
          <div class="win-reassure">{reassureText}</div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  .mis-course-content-flow-root *,
  .mis-course-content-flow-root *::before,
  .mis-course-content-flow-root *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .mis-course-content-flow-root {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --parchment: #f5f0e8;
    --parchment-dark: #e8e0d0;
    --green: #2d7a50;
    --sage: #7ec99a;
    --muted: #5a7a64;
    --ink: #1a1a18;

    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--forest);
    color: var(--parchment);
    font-family: 'Instrument Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .mis-course-content-flow-root.embedded nav {
    display: none;
  }

  .mis-course-content-flow-root.embedded {
    min-height: 100%;
  }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 56px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  .nav-name {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 17px;
    letter-spacing: -0.03em;
    color: var(--parchment);
  }

  .nav-name em {
    font-style: italic;
    font-weight: 300;
    color: var(--sage);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .nav-sign-in {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.12s;
  }

  .nav-sign-in:hover {
    color: var(--parchment);
  }

  .nav-register {
    background: rgba(245, 240, 232, 0.08);
    border: 1px solid rgba(245, 240, 232, 0.12);
    color: var(--parchment);
    border-radius: 8px;
    padding: 7px 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.12s;
  }

  .nav-register:hover {
    background: rgba(245, 240, 232, 0.14);
  }

  .progress-bar-wrap {
    height: 3px;
    background: rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--sage);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    width: 0%;
  }

  .lesson-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px 48px;
    position: relative;
    overflow: hidden;
  }

  .lesson-wrap::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 700px;
    height: 600px;
    background: radial-gradient(circle, rgba(45, 122, 80, 0.12) 0%, transparent 65%);
    pointer-events: none;
  }

  .step {
    display: none;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 540px;
    position: relative;
    z-index: 1;
    animation: stepIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .step.active {
    display: flex;
  }

  @keyframes stepIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .step-label {
    font-size: 9.5px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 28px;
    text-align: center;
  }

  .phrase-card {
    background: rgba(245, 240, 232, 0.05);
    border: 1px solid rgba(245, 240, 232, 0.1);
    border-radius: 20px;
    padding: 40px 44px;
    width: 100%;
    text-align: center;
    margin-bottom: 28px;
    backdrop-filter: blur(8px);
    position: relative;
    overflow: hidden;
  }

  .phrase-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .phrase-irish {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(36px, 6vw, 56px);
    letter-spacing: -0.04em;
    color: var(--parchment);
    line-height: 1.1;
    margin-bottom: 10px;
    position: relative;
  }

  .phrase-pronunciation {
    font-size: 16px;
    color: var(--sage);
    font-style: italic;
    margin-bottom: 12px;
    position: relative;
  }

  .phrase-english {
    font-size: 14px;
    color: var(--muted);
    letter-spacing: 0.04em;
    position: relative;
  }

  .context-box {
    background: rgba(45, 122, 80, 0.1);
    border: 1px solid rgba(45, 122, 80, 0.2);
    border-radius: 14px;
    padding: 18px 22px;
    width: 100%;
    margin-bottom: 28px;
    font-size: 14px;
    color: var(--muted);
    line-height: 1.65;
  }

  .context-box strong {
    color: var(--sage);
    font-weight: 600;
  }

  .dialogue {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }

  .dialogue-line {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .dialogue-line.right {
    flex-direction: row-reverse;
  }

  .dialogue-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(245, 240, 232, 0.08);
    border: 1px solid rgba(245, 240, 232, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .dialogue-bubble {
    background: rgba(245, 240, 232, 0.07);
    border: 1px solid rgba(245, 240, 232, 0.1);
    border-radius: 14px;
    border-top-left-radius: 4px;
    padding: 12px 16px;
    max-width: 80%;
  }

  .dialogue-line.right .dialogue-bubble {
    background: rgba(45, 122, 80, 0.15);
    border-color: rgba(45, 122, 80, 0.25);
    border-radius: 14px;
    border-top-right-radius: 4px;
  }

  .dialogue-irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 17px;
    color: var(--parchment);
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-bottom: 3px;
  }

  .dialogue-pron {
    font-size: 11.5px;
    color: var(--sage);
    font-style: italic;
    margin-bottom: 2px;
  }

  .dialogue-eng {
    font-size: 11.5px;
    color: var(--muted);
  }

  .dialogue-speaker {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(90, 122, 100, 0.6);
    margin-bottom: 6px;
    font-weight: 700;
  }

  .quiz-prompt {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.02em;
    color: var(--parchment);
    text-align: center;
    margin-bottom: 8px;
  }

  .quiz-subprompt {
    font-size: 14px;
    color: var(--muted);
    text-align: center;
    margin-bottom: 28px;
    line-height: 1.5;
  }

  .quiz-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin-bottom: 12px;
  }

  .quiz-opt {
    background: rgba(245, 240, 232, 0.05);
    border: 1.5px solid rgba(245, 240, 232, 0.1);
    border-radius: 14px;
    padding: 16px 20px;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: all 0.15s;
    width: 100%;
  }

  .quiz-opt:hover:not(.answered) {
    border-color: rgba(245, 240, 232, 0.25);
    background: rgba(245, 240, 232, 0.08);
  }

  .quiz-opt.correct {
    border-color: var(--sage);
    background: rgba(45, 122, 80, 0.15);
  }

  .quiz-opt.wrong {
    border-color: rgba(200, 80, 80, 0.5);
    background: rgba(200, 80, 80, 0.08);
  }

  .quiz-opt-letter {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(245, 240, 232, 0.08);
    border: 1px solid rgba(245, 240, 232, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .quiz-opt.correct .quiz-opt-letter {
    background: var(--sage);
    color: var(--forest);
    border-color: var(--sage);
  }

  .quiz-opt.wrong .quiz-opt-letter {
    background: rgba(200, 80, 80, 0.3);
    border-color: rgba(200, 80, 80, 0.5);
    color: #f88;
  }

  .quiz-opt-text {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 16px;
    color: var(--parchment);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .quiz-opt-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
  }

  .feedback {
    width: 100%;
    border-radius: 14px;
    padding: 16px 20px;
    display: none;
    margin-bottom: 20px;
    font-size: 14px;
    line-height: 1.6;
  }

  .feedback.show {
    display: block;
  }

  .feedback.good {
    background: rgba(45, 122, 80, 0.12);
    border: 1px solid rgba(45, 122, 80, 0.25);
    color: var(--sage);
  }

  .feedback.bad {
    background: rgba(200, 80, 80, 0.08);
    border: 1px solid rgba(200, 80, 80, 0.2);
    color: #f99;
  }

  .feedback strong {
    font-weight: 700;
  }

  .win-mark {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(126, 201, 154, 0.12);
    border: 2px solid rgba(126, 201, 154, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28px;
  }

  .win-headline {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(32px, 5vw, 48px);
    letter-spacing: -0.04em;
    color: var(--parchment);
    text-align: center;
    line-height: 1.05;
    margin-bottom: 12px;
  }

  .win-headline em {
    display: block;
    font-style: italic;
    font-weight: 300;
    color: var(--sage);
  }

  .win-sub {
    font-size: 15px;
    color: var(--muted);
    text-align: center;
    line-height: 1.7;
    max-width: 400px;
    margin-bottom: 36px;
  }

  .win-ctas {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 360px;
  }

  .btn-primary {
    background: var(--sage);
    color: var(--forest);
    border: none;
    border-radius: 14px;
    padding: 16px 0;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: -0.01em;
    cursor: pointer;
    text-decoration: none;
    display: block;
    text-align: center;
    transition: all 0.12s;
  }

  .btn-primary:hover {
    background: #8fd4a8;
    transform: translateY(-1px);
  }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid rgba(245, 240, 232, 0.12);
    border-radius: 14px;
    padding: 15px 0;
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    text-decoration: none;
    display: block;
    text-align: center;
    transition: all 0.12s;
  }

  .btn-ghost:hover {
    color: var(--parchment);
    border-color: rgba(245, 240, 232, 0.25);
  }

  .win-reassure {
    margin-top: 16px;
    font-size: 11.5px;
    color: rgba(90, 122, 100, 0.6);
    text-align: center;
    font-style: italic;
  }

  .btn-continue {
    background: var(--sage);
    color: var(--forest);
    border: none;
    border-radius: 14px;
    padding: 15px 48px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: all 0.12s;
    margin-top: 4px;
  }

  .btn-continue:hover {
    background: #8fd4a8;
    transform: translateY(-1px);
  }

  .btn-continue:disabled {
    background: rgba(126, 201, 154, 0.2);
    color: rgba(28, 43, 34, 0.5);
    cursor: not-allowed;
    transform: none;
  }

  .lesson-counter {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
  }

  .counter-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(245, 240, 232, 0.12);
    transition: background 0.2s;
  }

  .counter-dot.done {
    background: var(--sage);
  }

  .counter-dot.active {
    background: var(--parchment);
    width: 20px;
    border-radius: 3px;
  }

  .unit-body {
    width: 100%;
    max-height: 52vh;
    overflow: auto;
    color: var(--muted);
    line-height: 1.75;
  }

  .unit-body :global(h1),
  .unit-body :global(h2),
  .unit-body :global(h3) {
    font-family: 'Fraunces', serif;
    color: var(--parchment);
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }

  .unit-body :global(p) {
    margin: 0 0 12px;
  }

  .unit-body :global(ul) {
    margin: 0 0 12px;
    padding-left: 20px;
  }

  .unit-body :global(li) {
    margin-bottom: 6px;
  }

  .unit-body :global(blockquote) {
    margin: 0 0 10px;
    padding: 10px 12px;
    border-left: 3px solid rgba(126, 201, 154, 0.45);
    background: rgba(245, 240, 232, 0.04);
    border-radius: 8px;
    color: var(--parchment);
  }

  .unit-body :global(details) {
    margin-bottom: 10px;
    border: 1px solid rgba(245, 240, 232, 0.1);
    border-radius: 10px;
    padding: 10px 12px;
    background: rgba(245, 240, 232, 0.03);
  }

  .unit-body :global(summary) {
    cursor: pointer;
    color: var(--parchment);
    font-weight: 600;
  }

  .unit-nav {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .btn-unit-nav {
    min-width: 116px;
    padding-left: 18px;
    padding-right: 18px;
  }

  .btn-unit-nav:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    nav {
      padding: 0 20px;
    }
  }
</style>
