<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { trackPlausibleEvent } from './analytics/plausible';
  import type { LessonScreen } from './lesson-flow';

  type QuizState = {
    selectedIndex: number;
    correct: boolean;
  };

  const dispatch = createEventDispatcher<{
    progress: { index: number; screen: LessonScreen };
    complete: { index: number; screen: LessonScreen };
    exit: void;
  }>();

  export let screens: LessonScreen[] = [];
  export let courseTitle = 'Coffee Shop Encounters';
  export let initialIndex = 0;

  export let homeHref = '/';
  export let showAuthLinks = false;
  export let signInHref = '/auth/login';
  export let registerHref = '/auth/register';

  export let showExit = true;
  export let exitHref = '/dashboard';
  export let exitLabel = 'Exit';

  export let primaryCtaHref: string | null = null;
  export let secondaryCtaHref: string | null = null;
  export let primaryCtaLabel = 'Lean ar aghaidh — Keep going';
  export let secondaryCtaLabel = 'See what the full course costs';
  export let reassureText = '';

  export let continueLabel = 'Ar aghaidh — Continue';
  export let finishLabel = 'Criochnaithe — Finish';
  export let finishSavingLabel = 'Saving...';
  export let quizLockedLabel = 'Answer to continue';
  export let advancing = false;

  export let trackEnabled = true;
  export let plausiblePrefix = 'Lesson';

  let current = 0;
  let leaving = -1;
  let quizState: Record<string, QuizState> = {};
  let openVocab: Record<string, boolean> = {};
  let startedTracked = false;
  let completedTracked = false;
  let mountedScreensRef: LessonScreen[] = [];
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  $: if (screens !== mountedScreensRef) {
    mountedScreensRef = screens;
    const nextIndex = clampIndex(initialIndex, screens.length);
    current = nextIndex;
    leaving = -1;
    quizState = {};
    openVocab = {};
    startedTracked = false;
    completedTracked = false;
    queueMicrotask(() => {
      emitProgress(nextIndex);
      if (screens[nextIndex]?.kind === 'conversation') {
        animateConversation();
      }
    });
  }

  $: activeScreen = screens[current] || null;
  $: isQuizScreen = Boolean(activeScreen && activeScreen.kind === 'quiz');
  $: isQuizLocked =
    isQuizScreen && activeScreen && activeScreen.kind === 'quiz'
      ? !quizState[activeScreen.id]?.correct
      : false;
  $: continueLocked = advancing || isQuizLocked;
  $: progressPct = screens.length ? (Math.max(1, current + 1) / screens.length) * 100 : 0;
  $: showFinalCtaPanel = Boolean(activeScreen?.kind === 'final' && primaryCtaHref);

  function clampIndex(value: number, length: number) {
    if (!length) return 0;
    return Math.min(Math.max(0, value), length - 1);
  }

  function track(event: string) {
    if (!trackEnabled) return;
    void trackPlausibleEvent(event);
  }

  function renderInline(value: string) {
    let out = String(value || '')
      .replaceAll('Use this when you ask the customer a question.', '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replace(/`([^`]+)`/g, '<em>$1</em>');
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return out;
  }

  function toggleVocab(id: string) {
    openVocab = { ...openVocab, [id]: !openVocab[id] };
  }

  function setQuizAnswer(screenId: string, index: number, correct: boolean) {
    if (quizState[screenId]) return;
    quizState = {
      ...quizState,
      [screenId]: {
        selectedIndex: index,
        correct,
      },
    };
  }

  function emitProgress(index: number) {
    const screen = screens[index];
    if (!screen) return;

    dispatch('progress', { index, screen });

    if (!startedTracked && index >= 1) {
      startedTracked = true;
      track(`${plausiblePrefix}: Started`);
    }

    if (!completedTracked && screen.kind === 'final') {
      completedTracked = true;
      track(`${plausiblePrefix}: Completed`);
    }
  }

  async function animateConversation() {
    await tick();
    const screenEl = document.getElementById(`screen-${current}`);
    if (!screenEl) return;
    const lines = Array.from(screenEl.querySelectorAll('.dl-line')) as HTMLElement[];
    lines.forEach((line) => line.classList.remove('show'));
    lines.forEach((line, idx) => {
      setTimeout(() => {
        line.classList.add('show');
      }, 260 + idx * 240);
    });
  }

  function goTo(index: number) {
    if (index < 0 || index >= screens.length || index === current) return;

    const old = current;
    leaving = old;
    setTimeout(() => {
      if (leaving === old) leaving = -1;
    }, 210);

    setTimeout(() => {
      current = index;
      emitProgress(current);
      if (activeScreen?.kind === 'conversation') {
        void animateConversation();
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 220);
  }

  function next() {
    if (continueLocked || !screens.length) return;

    if (current < screens.length - 1) {
      goTo(current + 1);
      return;
    }

    const finalScreen = screens[current];
    if (finalScreen) {
      dispatch('complete', { index: current, screen: finalScreen });
    }
  }

  function prev() {
    if (current > 0) {
      goTo(current - 1);
    }
  }

  function onExitClick(event: MouseEvent) {
    event.preventDefault();
    dispatch('exit');
  }

  onMount(() => {
    keyHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (typing) return;

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        if (!continueLocked) {
          event.preventDefault();
          next();
        }
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    };

    window.addEventListener('keydown', keyHandler);

    return () => {
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler);
      }
    };
  });
</script>

<div class="immersive-root">
  <nav>
    <a href={homeHref} class="nav-brand">
      <svg width="18" height="18" viewBox="0 0 80 80" fill="none">
        <path d="M40 7 C19 7,9 19,9 34 C9 50,19 61,37 62 L30 73 L47 62 C63 60,71 50,71 34 C71 19,61 7,40 7Z" fill="rgba(245,240,232,0.15)" stroke="rgba(245,240,232,0.25)" stroke-width="2"/>
        <path d="M33 46 C35.5 37,42 30,47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none"/>
        <circle cx="33.5" cy="45" r="3" fill="#7ec99a"/>
      </svg>
      <span class="nav-name">Misne<em>ach</em></span>
    </a>

    <span class="nav-center">{courseTitle}</span>

    <div class="nav-right">
      {#if showAuthLinks}
        <a href={signInHref} class="nav-exit">Sign in</a>
        <a href={registerHref} class="btn-back">Create account</a>
      {:else}
        <span class="nav-screen-count">{screens.length ? current + 1 : 0} / {screens.length}</span>
        {#if showExit}
          <a href={exitHref} class="nav-exit" on:click={onExitClick}>✕ {exitLabel}</a>
        {/if}
      {/if}
    </div>
  </nav>

  <div class="progress-track">
    <div class="progress-fill" style={`width:${progressPct}%`}></div>
  </div>

  <div class="screens">
    {#each screens as screen, index (screen.id)}
      <section
        id={`screen-${index}`}
        class={`screen ${index === current ? 'active' : ''} ${index === leaving ? 'exit' : ''}`}
      >
        <div class="screen-inner">
          {#if screen.kind === 'intro'}
            <span class="s-section-tag">{screen.tag}</span>
            <h1 class="s-unit-title">{screen.title}</h1>
            <p class="s-unit-sub">{screen.subtitle}</p>
            <div class="s-lesson-pills mt24">
              {#each screen.chips as chip}
                <span class="s-pill">{chip}</span>
              {/each}
            </div>
          {/if}

          {#if screen.kind === 'conversation'}
            <span class="s-section-tag" style="text-align:center;display:block;margin-bottom:16px">{screen.tag}</span>
            <div class="dialogue-feed" style="width:100%">
              {#each screen.lines as line}
                {@const right = line.side === 'right' || /customer|you/i.test(line.speaker)}
                <div class={`dl-line ${right ? 'right' : ''}`}>
                  <div class="dl-avatar">{right ? '☕' : '🧑‍🍳'}</div>
                  <div class="dl-bubble">
                    <div class="dl-role">{line.speaker}</div>
                    <div class="dl-irish">{line.text}</div>
                    {#if line.pronunciation}
                      <div class="dl-pron">{line.pronunciation}</div>
                    {/if}
                    {#if line.translation}
                      <div class="dl-eng">{line.translation}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          {#if screen.kind === 'phrase'}
            <span class="s-section-tag" style="margin-bottom:16px">{screen.tag}</span>
            <div class="phrase-card">
              <div class="phrase-irish">{screen.irish}</div>
              {#if screen.pronunciation}
                <div class="phrase-pron">{screen.pronunciation}</div>
              {/if}
              {#if screen.english}
                <div class="phrase-eng">{screen.english}</div>
              {/if}
            </div>
          {/if}

          {#if screen.kind === 'explain'}
            {#if screen.quoteIrish}
              <div class="explain-quote">
                <div class="eq-irish">{screen.quoteIrish}</div>
                {#if screen.quotePron}
                  <div class="eq-pron">{screen.quotePron}</div>
                {/if}
                {#if screen.quoteEnglish}
                  <div class="eq-eng">{screen.quoteEnglish}</div>
                {/if}
              </div>
            {/if}
            <div class="explain-body">
              {#each screen.paragraphs as paragraph}
                <p>{@html renderInline(paragraph)}</p>
              {/each}
            </div>
          {/if}

          {#if screen.kind === 'quiz'}
            <div class="quiz-prompt">{screen.prompt}</div>
            <div class="quiz-sub">{screen.sub}</div>
            <div class="quiz-options">
              {#each screen.options as option, optionIdx}
                {@const answered = Boolean(quizState[screen.id])}
                {@const selected = quizState[screen.id]?.selectedIndex === optionIdx}
                {@const className = selected ? (option.correct ? 'q-opt correct' : 'q-opt wrong') : (answered && option.correct ? 'q-opt correct' : 'q-opt')}
                <button type="button" class={className} disabled={answered} on:click={() => setQuizAnswer(screen.id, optionIdx, option.correct)}>
                  <div class="q-letter">{option.label}</div>
                  <div>
                    <div class="q-text">{option.text}</div>
                    {#if option.sub}
                      <div class="q-sub">{option.sub}</div>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>

            {#if quizState[screen.id]}
              {#if quizState[screen.id].correct}
                <div class="feedback-box good show"><strong>Maith thú.</strong> Correct answer.</div>
              {:else}
                <div class="feedback-box bad show"><strong>Not quite.</strong> Pick the strongest Irish option.</div>
              {/if}
            {/if}
          {/if}

          {#if screen.kind === 'vocab'}
            <span class="s-section-tag" style="margin-bottom:16px;display:block;text-align:center">{screen.tag}</span>
            <div class="vocab-accordion">
              {#each screen.sections as section, sectionIdx}
                {@const key = `${screen.id}-${sectionIdx}`}
                <div class={`vacc ${openVocab[key] ? 'open' : ''}`}>
                  <div class="vacc-head" on:click={() => toggleVocab(key)}>
                    <span class="vacc-title">{section.title}</span>
                    <span class="vacc-arrow">▾</span>
                  </div>
                  <div class="vacc-body">
                    {#each section.rows as row}
                      <div class="vocab-row">
                        <span class="vr-irish">{row.irish}</span>
                        <span class="vr-pron">{row.pronunciation}</span>
                        <span class="vr-eng">{row.english}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          {#if screen.kind === 'recap'}
            <div class="recap-mark"></div>
            <div class="recap-headline">{screen.headline}</div>
            <p class="recap-body">{screen.body}</p>
            <div class="recap-list">
              {#each screen.chips as chip}
                <span class="recap-chip">{chip}</span>
              {/each}
            </div>
          {/if}

          {#if screen.kind === 'final'}
            <div class="recap-mark"></div>
            <div class="recap-headline">{screen.headline}</div>
            <p class="recap-body">{screen.body}</p>
            {#if showFinalCtaPanel}
              <div class="s-lesson-pills" style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:10px;margin-top:16px">
                <a href={primaryCtaHref || '#'} class="btn-continue" style="text-align:center;text-decoration:none">{primaryCtaLabel}</a>
                {#if secondaryCtaHref}
                  <a href={secondaryCtaHref} class="btn-back" style="text-align:center;text-decoration:none">{secondaryCtaLabel}</a>
                {/if}
              </div>
              {#if reassureText}
                <p class="recap-body" style="font-size:12px;margin-top:12px">{reassureText}</p>
              {/if}
            {/if}
          {/if}
        </div>
      </section>
    {/each}
  </div>

  {#if screens.length && !showFinalCtaPanel}
    <div class="bottom-nav">
      <button class="btn-back" style={`display:${current > 0 ? 'block' : 'none'}`} on:click={prev}>← Back</button>
      <button class="btn-continue" on:click={next} disabled={continueLocked}>
        {#if isQuizLocked}
          {quizLockedLabel}
        {:else if current === screens.length - 1}
          {#if advancing}{finishSavingLabel}{:else}{finishLabel}{/if}
        {:else}
          {continueLabel}
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:global(html), :global(body) { height: 100%; }

.immersive-root {
  --forest:     #1c2b22;
  --forest-mid: #2e4436;
  --forest-l:   #3a5a44;
  --parchment:  #f5f0e8;
  --parch-dark: #e8e0d0;
  --parch-mid:  #ede7da;
  --green:      #2d7a50;
  --sage:       #7ec99a;
  --muted:      #5a7a64;
  --ink:        #1a1a18;
  --amber:      #f0b429;
  --red:        #e05353;

  min-height: 100vh;
  font-family: 'Instrument Sans', sans-serif;
  background: var(--forest);
  color: var(--parchment);
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
}

nav {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 24px; height: 52px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0; z-index: 10;
}

.nav-brand { display: flex; align-items: center; gap: 7px; text-decoration: none; }

.nav-name {
  font-family: 'Fraunces', serif;
  font-weight: 900; font-size: 16px;
  letter-spacing: -0.03em; color: var(--parchment);
}

.nav-name em { font-style: italic; font-weight: 300; color: var(--sage); }

.nav-center {
  font-size: 11px; color: var(--muted);
  letter-spacing: 0.06em; text-transform: uppercase;
  font-weight: 600;
}

.nav-right { display: flex; align-items: center; gap: 16px; }

.nav-screen-count {
  font-size: 11px; color: var(--forest-l);
  font-weight: 600; letter-spacing: 0.04em;
}

.nav-exit {
  font-size: 12px; color: var(--muted);
  text-decoration: none; font-weight: 500;
  transition: color 0.12s;
}

.nav-exit:hover { color: var(--parchment); }

.progress-track {
  height: 2px; background: rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.progress-fill {
  height: 100%; background: var(--sage);
  transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
}

.screens {
  flex: 1; overflow: hidden;
  position: relative;
}

.screen {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px 24px 80px;
  opacity: 0; pointer-events: none;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  overflow-y: auto;
}

.screen.active {
  opacity: 1; pointer-events: all;
  transform: translateY(0);
}

.screen.exit {
  opacity: 0; transform: translateY(-16px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.screen::before {
  content: '';
  position: fixed; top: -80px; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 500px;
  background: radial-gradient(circle, rgba(45,122,80,0.1) 0%, transparent 65%);
  pointer-events: none; z-index: 0;
}

.screen-inner {
  width: 100%; max-width: 560px;
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: 0;
}

.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 72px;
  display: flex; align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(to top, rgba(28,43,34,1) 60%, rgba(28,43,34,0));
  z-index: 20;
  padding: 0 24px;
}

.btn-continue {
  background: var(--sage); color: var(--forest);
  border: none; border-radius: 12px;
  padding: 13px 40px;
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 15px;
  letter-spacing: -0.01em;
  cursor: pointer; transition: all 0.12s;
  min-width: 180px;
}

.btn-continue:hover { background: #8fd4a8; transform: translateY(-1px); }
.btn-continue:disabled {
  background: rgba(126,201,154,0.2);
  color: rgba(28,43,34,0.4);
  cursor: not-allowed; transform: none;
}

.btn-back {
  background: transparent; color: var(--muted);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 12px 20px;
  font-family: 'Instrument Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.12s;
}

.btn-back:hover { color: var(--parchment); border-color: rgba(255,255,255,0.2); }

.s-section-tag {
  font-size: 9px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--muted);
  font-weight: 700; margin-bottom: 20px;
  text-align: center;
}

.s-unit-title {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(38px, 7vw, 64px);
  letter-spacing: -0.04em; line-height: 1;
  color: var(--parchment); text-align: center;
  margin-bottom: 12px;
}

.s-unit-sub {
  font-size: 15px; color: var(--muted);
  text-align: center; line-height: 1.65;
  max-width: 380px; margin: 0 auto;
}

.s-lesson-pills {
  display: flex; gap: 6px;
  flex-wrap: wrap; justify-content: center;
  margin-top: 28px;
}

.s-pill {
  background: rgba(245,240,232,0.06);
  border: 1px solid rgba(245,240,232,0.1);
  border-radius: 20px; padding: 5px 12px;
  font-size: 11px; color: var(--muted);
  font-weight: 500;
}

.phrase-card {
  width: 100%;
  background: rgba(245,240,232,0.05);
  border: 1px solid rgba(245,240,232,0.1);
  border-radius: 20px;
  padding: 36px 40px;
  text-align: center;
  margin-bottom: 20px;
  position: relative; overflow: hidden;
}

.phrase-card::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.phrase-irish {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(28px, 5vw, 48px);
  letter-spacing: -0.04em; color: var(--parchment);
  line-height: 1.1; margin-bottom: 10px;
  position: relative;
}

.phrase-pron {
  font-size: 15px; color: var(--sage);
  font-style: italic; margin-bottom: 8px;
  position: relative;
}

.phrase-eng {
  font-size: 13px; color: var(--muted);
  letter-spacing: 0.02em; position: relative;
}

.explain-quote {
  width: 100%;
  border-left: 3px solid var(--sage);
  padding: 14px 20px;
  margin-bottom: 20px;
  background: rgba(126,201,154,0.06);
  border-radius: 0 10px 10px 0;
}

.eq-irish {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 18px;
  color: var(--parchment); letter-spacing: -0.02em;
  line-height: 1.2; margin-bottom: 3px;
}

.eq-pron {
  font-size: 12px; color: var(--sage);
  font-style: italic; margin-bottom: 2px;
}

.eq-eng { font-size: 12px; color: var(--muted); }

.explain-body {
  width: 100%;
  font-size: 14px; line-height: 1.78;
  color: rgba(245,240,232,0.75);
}

.explain-body p { margin-bottom: 12px; }
.explain-body p:last-child { margin-bottom: 0; }

.explain-body strong {
  color: var(--parchment); font-weight: 600;
}

.explain-body :global(em) {
  font-style: normal;
  font-family: 'Fraunces', serif;
  font-weight: 700; color: var(--sage);
  font-size: 15px;
}

.dialogue-feed {
  width: 100%;
  display: flex; flex-direction: column;
  gap: 10px; margin-bottom: 20px;
}

.dl-line {
  display: flex; gap: 10px;
  align-items: flex-start;
  opacity: 1; transform: translateY(0);
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.dl-line.show { opacity: 1; transform: translateY(0); }

.dl-line.right { flex-direction: row-reverse; }

.dl-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(245,240,232,0.07);
  border: 1px solid rgba(245,240,232,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}

.dl-bubble {
  background: rgba(245,240,232,0.06);
  border: 1px solid rgba(245,240,232,0.1);
  border-radius: 14px; border-top-left-radius: 4px;
  padding: 10px 14px; max-width: 82%;
}

.dl-line.right .dl-bubble {
  background: rgba(45,122,80,0.14);
  border-color: rgba(45,122,80,0.22);
  border-radius: 14px; border-top-right-radius: 4px;
}

.dl-role {
  font-size: 8.5px; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(90,122,100,0.55);
  font-weight: 700; margin-bottom: 4px;
}

.dl-irish {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 14px;
  color: var(--parchment); letter-spacing: -0.01em;
  line-height: 1.25; margin-bottom: 2px;
}

.dl-pron {
  font-size: 10.5px; color: var(--sage);
  font-style: italic; margin-bottom: 1px;
}

.dl-eng { font-size: 10.5px; color: var(--muted); }

.quiz-prompt {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 22px;
  letter-spacing: -0.02em; color: var(--parchment);
  text-align: center; margin-bottom: 6px;
  line-height: 1.2;
}

.quiz-sub {
  font-size: 13px; color: var(--muted);
  text-align: center; margin-bottom: 24px;
  line-height: 1.5;
}

.quiz-options {
  display: flex; flex-direction: column;
  gap: 8px; width: 100%;
}

.q-opt {
  background: rgba(245,240,232,0.05);
  border: 1.5px solid rgba(245,240,232,0.1);
  border-radius: 14px; padding: 14px 18px;
  cursor: pointer; text-align: left;
  display: flex; align-items: center; gap: 12px;
  transition: all 0.14s; width: 100%;
}

.q-opt:hover:not([disabled]) {
  border-color: rgba(245,240,232,0.25);
  background: rgba(245,240,232,0.08);
}

.q-opt.correct { border-color: var(--sage); background: rgba(45,122,80,0.14); }
.q-opt.wrong   { border-color: rgba(224,83,83,0.5); background: rgba(224,83,83,0.07); }

.q-letter {
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(245,240,232,0.07);
  border: 1px solid rgba(245,240,232,0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--muted);
  flex-shrink: 0; transition: all 0.14s;
}

.q-opt.correct .q-letter { background: var(--sage); color: var(--forest); border-color: var(--sage); }
.q-opt.wrong   .q-letter { background: rgba(224,83,83,0.25); color: #f88; border-color: rgba(224,83,83,0.4); }

.q-text {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 15px;
  color: var(--parchment); letter-spacing: -0.01em;
  line-height: 1.2;
}

.q-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }

.feedback-box {
  width: 100%; border-radius: 12px;
  padding: 14px 18px; margin-top: 12px;
  font-size: 13px; line-height: 1.65;
  display: none;
}

.feedback-box.show { display: block; }
.feedback-box.good { background: rgba(45,122,80,0.1); border: 1px solid rgba(45,122,80,0.22); color: var(--sage); }
.feedback-box.bad  { background: rgba(224,83,83,0.07); border: 1px solid rgba(224,83,83,0.2); color: #f99; }
.feedback-box strong { font-weight: 700; }

.recap-mark {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(126,201,154,0.1);
  border: 2px solid rgba(126,201,154,0.22);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px;
}

.recap-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(30px, 5vw, 46px);
  letter-spacing: -0.04em; color: var(--parchment);
  text-align: center; line-height: 1.05;
  margin-bottom: 12px;
}

.recap-body {
  font-size: 14px; color: var(--muted);
  text-align: center; line-height: 1.7;
  max-width: 400px; margin-bottom: 24px;
}

.recap-list {
  display: flex; flex-wrap: wrap;
  gap: 6px; justify-content: center;
  margin-bottom: 4px;
}

.recap-chip {
  background: rgba(245,240,232,0.06);
  border: 1px solid rgba(245,240,232,0.1);
  border-radius: 20px; padding: 5px 14px;
  font-size: 12px; color: var(--muted);
}

.vocab-accordion { width: 100%; display: flex; flex-direction: column; gap: 8px; }

.vacc {
  background: rgba(245,240,232,0.04);
  border: 1px solid rgba(245,240,232,0.09);
  border-radius: 12px; overflow: hidden;
}

.vacc-head {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 14px 18px; cursor: pointer;
  transition: background 0.12s;
}

.vacc-head:hover { background: rgba(245,240,232,0.04); }

.vacc-title {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 15px;
  color: var(--parchment); letter-spacing: -0.01em;
}

.vacc-arrow {
  color: var(--muted); font-size: 12px;
  transition: transform 0.2s;
}

.vacc.open .vacc-arrow { transform: rotate(180deg); }

.vacc-body {
  max-height: 0; overflow: hidden;
  transition: max-height 0.3s ease;
  padding: 0 18px;
}

.vacc.open .vacc-body { max-height: 1200px; padding-bottom: 14px; }

.vocab-row {
  display: flex; align-items: baseline;
  gap: 10px; padding: 7px 0;
  border-bottom: 1px solid rgba(245,240,232,0.05);
}

.vocab-row:last-child { border-bottom: none; }

.vr-irish {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 14px;
  color: var(--parchment); letter-spacing: -0.01em;
  min-width: 160px; flex-shrink: 0;
}

.vr-pron { font-size: 11px; color: var(--sage); font-style: italic; flex: 1; }
.vr-eng  { font-size: 11px; color: var(--muted); min-width: 100px; text-align: right; flex-shrink: 0; }

.mt24 { margin-top: 24px; }

@media (max-width: 820px) {
  nav { padding: 0 16px; }
  .nav-center { display: none; }
}
</style>
