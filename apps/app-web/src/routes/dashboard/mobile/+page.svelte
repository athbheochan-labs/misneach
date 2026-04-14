<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe, requestLogout } from '$lib/api/auth-client';
  import { clearAuthSession } from '$lib/mobile/session-storage';
  import { compareLessonsByHierarchy } from '$lib/course-order';

  type Tab = 'learn' | 'practice' | 'phrases' | 'me';
  let activeTab: Tab = 'learn';

  let lessonOpen = false;
  let flashOpen = false;
  let flashRevealed = false;
  let picked: null | boolean = null;
  let loading = true;

  let greetingName = 'Aaron';
  let streakDays = 7;
  let phrasesLearned = 24;
  let unitsDone = 2;
  let progressPct = 40;
  let progressStrokeOffset = 105;
  let continueTitle = 'Unit 3 -- Taking your order';
  let continueSub = 'Lesson 2 of 6 = Sizes and alternatives';
  let continueHref = '/dashboard/courses?view=all';

  let units: Array<{
    title: string;
    subtitle: string;
    status: 'complete' | 'progress' | 'locked';
    progress: number;
  }> = [
    { title: 'Greeting & being greeted', subtitle: '6 lessons = 8 phrases', status: 'complete', progress: 100 },
    { title: 'Ordering a drink', subtitle: '7 lessons = 10 phrases', status: 'complete', progress: 100 },
    { title: 'Taking your order', subtitle: '6 lessons = 9 phrases', status: 'progress', progress: 33 },
    { title: 'Paying & wrapping up', subtitle: '5 lessons = 7 phrases', status: 'locked', progress: 0 },
    { title: 'Real world challenge', subtitle: 'Full interaction = 24 phrases', status: 'locked', progress: 0 }
  ];

  let dueCards: Array<{ irish: string; english: string; dueLabel: string; dueNow: boolean }> = [
    { irish: 'Dia duit', english: 'Hello', dueLabel: 'Due now', dueNow: true },
    { irish: 'Go raibh maith agat', english: 'Thank you', dueLabel: 'Due now', dueNow: true },
    { irish: 'Caife le do thoil', english: 'Coffee please', dueLabel: 'Tomorrow', dueNow: false },
    { irish: 'An bhfuil bainne uait?', english: 'Do you want milk?', dueLabel: 'In 2 days', dueNow: false }
  ];

  let phraseRows: Array<{ irish: string; english: string }> = [
    { irish: 'Dia duit', english: 'Hello (to one person)' },
    { irish: 'Dia is Muire duit', english: 'Hello back (response)' },
    { irish: 'Conas ata tu?', english: 'How are you?' },
    { irish: 'Ta me go maith', english: 'I am well' },
    { irish: 'Caife le do thoil', english: 'Coffee please' },
    { irish: 'Tae le do thoil', english: 'Tea please' },
    { irish: 'Go raibh maith agat', english: 'Thank you' }
  ];

  function switchTab(tab: Tab) {
    activeTab = tab;
  }

  function showLesson() {
    picked = null;
    lessonOpen = true;
  }

  function hideLesson() {
    lessonOpen = false;
    picked = null;
  }

  function pickOpt(correct: boolean) {
    picked = correct;
  }

  function showFlash() {
    flashOpen = true;
    flashRevealed = false;
  }

  function hideFlash() {
    flashOpen = false;
  }

  function revealFlash() {
    flashRevealed = true;
  }

  function nextFlash() {
    flashRevealed = false;
  }

  async function continueCourse() {
    await goto(continueHref);
  }

  async function openPracticeSession() {
    await goto('/dashboard/practice');
  }

  async function logout() {
    await requestLogout().catch(() => undefined);
    await clearAuthSession().catch(() => undefined);
    await goto('/auth/login');
  }

  function updateProgressRing() {
    const pct = Math.max(0, Math.min(100, progressPct));
    progressStrokeOffset = 175.9 - (175.9 * pct) / 100;
  }

  function formatDueLabel(dateRaw: unknown): string {
    if (!dateRaw) return 'Soon';
    const now = new Date();
    const date = new Date(String(dateRaw));
    if (Number.isNaN(date.getTime())) return 'Soon';
    const deltaMs = date.getTime() - now.getTime();
    const day = 24 * 60 * 60 * 1000;
    if (deltaMs <= 0) return 'Due now';
    if (deltaMs < day * 1.5) return 'Tomorrow';
    const days = Math.ceil(deltaMs / day);
    return `In ${days} days`;
  }

  async function loadMobileData() {
    try {
      const auth = await getAuthMe();
      if (auth.loggedIn && auth.user?.email) {
        const local = String(auth.user.email).split('@')[0] || '';
        greetingName = local ? local.charAt(0).toUpperCase() + local.slice(1) : greetingName;
      }
    } catch {
      // keep fallback values
    }

    try {
      const [catalogRes, progressRes, flashRes] = await Promise.all([
        apiFetch('/api/proxy/courses/catalog', { cache: 'no-store' }),
        apiFetch('/api/proxy/practice/progress', { cache: 'no-store' }),
        apiFetch('/api/proxy/flashcards/study/due?limit=8', { cache: 'no-store' })
      ]);

      if (progressRes.ok) {
        const payload = await progressRes.json();
        streakDays = Math.max(0, Number(payload?.streakDays || streakDays));
        phrasesLearned = Math.max(0, Number(payload?.totalTrackedPhrases || phrasesLearned));
      }

      if (flashRes.ok) {
        const cards = await flashRes.json();
        if (Array.isArray(cards) && cards.length > 0) {
          dueCards = cards.slice(0, 4).map((card: any) => ({
            irish: String(card?.front || card?.irish || 'Phrase'),
            english: String(card?.back || card?.english || 'Translation'),
            dueLabel: formatDueLabel(card?.nextReviewAt || card?.dueAt),
            dueNow: !card?.nextReviewAt || new Date(String(card?.nextReviewAt)).getTime() <= Date.now()
          }));
        }
      }

      if (catalogRes.ok) {
        const payload = await catalogRes.json();
        const courses = Array.isArray(payload?.courses) ? payload.courses : [];
        const selected = courses[0];
        const lessons = Array.isArray(selected?.lessons) ? [...selected.lessons].sort(compareLessonsByHierarchy) : [];

        if (lessons.length > 0) {
          const completeCount = lessons.filter((lesson: any) => lesson?.progress?.status === 'completed').length;
          unitsDone = completeCount;
          progressPct = Math.round((completeCount / lessons.length) * 100);
          updateProgressRing();

          const currentIdx = lessons.findIndex((lesson: any) => lesson?.progress?.status !== 'completed');
          const idx = currentIdx >= 0 ? currentIdx : lessons.length - 1;
          const current = lessons[idx];
          continueTitle = String(current?.lessonTitle || continueTitle);
          continueSub = `${String(selected?.courseTitle || 'Course')} = next lesson`;
          if (selected?.courseSlug && current?.lessonSlug) {
            continueHref = `/dashboard/courses/${encodeURIComponent(selected.courseSlug)}/${encodeURIComponent(current.lessonSlug)}`;
          }

          units = lessons.slice(0, 5).map((lesson: any) => {
            const isDone = lesson?.progress?.status === 'completed';
            const isCurrent = lesson === current;
            return {
              title: String(lesson?.lessonTitle || 'Lesson'),
              subtitle: `${Math.max(1, Number(lesson?.estimatedMinutes || 4))} min`,
              status: isDone ? 'complete' : isCurrent ? 'progress' : 'locked',
              progress: Math.max(0, Math.min(100, Number(lesson?.progress?.progressPercent || 0)))
            };
          });

          phraseRows = lessons.slice(0, 7).map((lesson: any) => ({
            irish: String(lesson?.lessonTitle || 'Lesson'),
            english: String(selected?.courseTitle || 'Course')
          }));
        }
      }
    } catch {
      // keep fallback values
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    updateProgressRing();
    void loadMobileData();
  });
</script>

<svelte:head>
  <title>Misneach -- Mobile App</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="phone" id="phone1">
  <div class="status-bar" style="position:absolute;top:0;left:0;right:0;z-index:20;background:transparent">
    <div class="status-time">9:41</div>
    <div class="status-icons">
      <svg width="16" height="12" viewBox="0 0 16 12" fill="#1c2b22"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/><rect x="13.5" y="0" width="2.5" height="12" rx="1" opacity=".3"/></svg>
      <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="#1c2b22" stroke-width="2"><path d="M1 6C5 2 19 2 23 6"/><path d="M4 9.5C7 6.5 17 6.5 20 9.5"/><path d="M7.5 13C9.5 11 14.5 11 16.5 13"/><circle cx="12" cy="15.5" r="1.5" fill="#1c2b22" stroke="none"/></svg>
      <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#1c2b22" stroke-opacity=".35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#1c2b22"/><path d="M23.5 4v4a2 2 0 0 0 0-4z" fill="#1c2b22" opacity=".4"/></svg>
    </div>
  </div>

  <div class={`screen ${activeTab === 'learn' ? 'active' : ''}`} id="learn-screen">
    <div class="learn-header">
      <div style="height:var(--status-h)"></div>
      <div class="lh-greeting">Dia duit, {greetingName}</div>
      <div class="lh-name">Lean ar <em>aghaidh.</em></div>
      <div class="streak-row">
        <div class="streak-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7ec99a" stroke-width="2.5" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span class="streak-num">{streakDays}</span>
          <span class="streak-lbl">day streak</span>
        </div>
      </div>
      <div class="progress-row">
        <div class="progress-ring-wrap">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle class="progress-ring-bg" cx="32" cy="32" r="28"/>
            <circle class="progress-ring-fill" cx="32" cy="32" r="28" stroke-dasharray="175.9" stroke-dashoffset={progressStrokeOffset}/>
          </svg>
          <div class="progress-ring-label">
            <div class="prl-num">{progressPct}%</div>
            <div class="prl-sub">done</div>
          </div>
        </div>
        <div class="progress-text">
          <div class="pt-label">Course progress</div>
          <div class="pt-value">{unitsDone} units complete</div>
          <div class="pt-label" style="margin-top:6px">Phrases learned</div>
          <div class="pt-value">{phrasesLearned} phrases</div>
        </div>
      </div>
    </div>

    <div class="continue-card">
      <div class="cc-eyebrow">Continue</div>
      <div class="cc-title">{continueTitle}</div>
      <div class="cc-sub">{continueSub}</div>
      <div class="cc-progress-bar"><div class="cc-progress-fill"></div></div>
      <button class="cc-btn" type="button" on:click={continueCourse}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Ar aghaidh -- Continue
      </button>
    </div>

    <div class="section-head">
      <div class="sh-title">All units</div>
    </div>

    {#each units as unit, i}
      <div class={`unit-card ${unit.status === 'locked' ? 'locked' : ''} ${unit.status === 'complete' ? 'complete' : ''}`}>
        <div class="uc-header">
          <div class="uc-num">{i + 1}</div>
          <div class="uc-info">
            <div class="uc-title">{unit.title}</div>
            <div class="uc-sub">{unit.subtitle}</div>
          </div>
          <div class={`uc-badge ${unit.status === 'complete' ? 'done' : unit.status === 'progress' ? 'progress' : 'locked'}`}>
            {unit.status === 'complete' ? 'Complete' : unit.status === 'progress' ? 'In progress' : 'Locked'}
          </div>
        </div>
        <div class="uc-progress"><div class="uc-progress-fill" style={`width:${unit.progress}%`}></div></div>
      </div>
    {/each}

    <div style="height:16px"></div>
  </div>

  <div class={`screen ${activeTab === 'practice' ? 'active' : ''}`} id="practice-screen">
    <div class="practice-warmup">
      <div style="height:var(--status-h)"></div>
      <div class="warmup-eyebrow">Practice session</div>
      <h2 class="warmup-headline">Ready to <em>cleachtadh?</em></h2>
      <p class="warmup-sub">{dueCards.length} phrases are due for review today. Pick a mode or jump straight in.</p>

      <div class="due-strip">
        <div class="due-pill primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          {dueCards.length} due today
        </div>
        <div class="due-pill secondary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {Math.min(3, dueCards.length)} mistakes to fix
        </div>
        <div class="due-pill dim">{phrasesLearned} total phrases</div>
      </div>

      <div class="mode-list">
        <button class="mode-card primary-mode" type="button" on:click={openPracticeSession}>
          <div class="mc-icon-wrap dark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ec99a" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
          <div class="mc-text">
            <div class="mc-eyebrow">Anytime session</div>
            <div class="mc-title">Start <em>practice</em></div>
            <div class="mc-sub">Due phrases first, then saved phrases</div>
          </div>
          <div class="mc-badge">{dueCards.length} due</div>
          <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </button>

        <button class="mode-card" type="button" on:click={openPracticeSession}>
          <div class="mc-icon-wrap light"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d7a50" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
          <div class="mc-text">
            <div class="mc-eyebrow">Targeted review</div>
            <div class="mc-title">Fix <em>mistakes</em></div>
            <div class="mc-sub">Retry phrases you got wrong recently</div>
          </div>
          <div class="mc-badge amber">{Math.min(3, dueCards.length)} to fix</div>
          <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </button>

        <button class="mode-card" type="button" on:click={showFlash}>
          <div class="mc-icon-wrap dim"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7a64" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
          <div class="mc-text">
            <div class="mc-eyebrow">Spaced repetition</div>
            <div class="mc-title">Flashcard <em>review</em></div>
            <div class="mc-sub">Open your due flashcards</div>
          </div>
          <div class="mc-badge none">{dueCards.length} due</div>
          <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </button>
      </div>
    </div>

    <div class="streak-section">
      <div class="section-head" style="padding:16px 0 10px">
        <div class="sh-title" style="font-size:14px">Due for review</div>
        <div class="sh-link">See all</div>
      </div>
      <div class="streak-cards">
        {#each dueCards as card}
          <div class={`streak-card ${card.dueNow ? 'due' : ''}`}>
            <div class="sc-irish">{card.irish}</div>
            <div class="sc-english">{card.english}</div>
            <div class="sc-due" style={card.dueNow ? '' : 'color:#ccc'}>{card.dueLabel}</div>
          </div>
        {/each}
      </div>
    </div>
    <div style="height:16px"></div>
  </div>

  <div class={`screen ${activeTab === 'phrases' ? 'active' : ''}`} id="phrases-screen">
    <div class="pb-header">
      <div style="height:var(--status-h)"></div>
      <div class="pb-title">Leabhar <em style="font-style:italic;font-weight:300;color:var(--moss)">frasai</em></div>
      <div class="pb-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="Search phrases..." readonly />
      </div>
    </div>

    <div class="pb-section">
      <div class="pbs-label">Greetings -- Unit 1</div>
      {#each phraseRows.slice(0, 4) as row}
        <div class="phrase-row"><div class="pr-text"><div class="pr-irish">{row.irish}</div><div class="pr-english">{row.english}</div></div><button class="pr-play" type="button"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--forest)"><polygon points="5 3 19 12 5 21 5 3"/></svg></button></div>
      {/each}
    </div>

    <div class="pb-section">
      <div class="pbs-label">Ordering -- Unit 2</div>
      {#each phraseRows.slice(4, 7) as row}
        <div class="phrase-row"><div class="pr-text"><div class="pr-irish">{row.irish}</div><div class="pr-english">{row.english}</div></div><button class="pr-play" type="button"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--forest)"><polygon points="5 3 19 12 5 21 5 3"/></svg></button></div>
      {/each}
    </div>
    <div style="height:16px"></div>
  </div>

  <div class={`screen ${activeTab === 'me' ? 'active' : ''}`} id="me-screen">
    <div class="me-header">
      <div style="height:var(--status-h)"></div>
      <div class="me-avatar"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7ec99a" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="me-name">{greetingName}</div>
      <div class="me-sub">Early adopter = Joined March 2025</div>
    </div>

    <div class="me-stats">
      <div class="me-stat"><div class="ms-num">{streakDays}</div><div class="ms-lbl">Day streak</div></div>
      <div class="me-stat"><div class="ms-num">{phrasesLearned}</div><div class="ms-lbl">Phrases</div></div>
      <div class="me-stat"><div class="ms-num">{unitsDone}</div><div class="ms-lbl">Units done</div></div>
    </div>

    <div class="me-section">
      <div class="mes-title">Account</div>
      <div style="background:white;border-radius:14px;border:1px solid var(--parchment-dark);overflow:hidden">
        <div class="me-row" style="padding:13px 16px"><div class="me-row-icon"></div><div class="me-row-text">Profile</div><div class="me-row-arrow">›</div></div>
        <div style="height:1px;background:var(--parchment-dark);margin:0 16px"></div>
        <div class="me-row" style="padding:13px 16px"><div class="me-row-icon"></div><div class="me-row-text">Subscription</div><div class="me-row-arrow">›</div></div>
        <div style="height:1px;background:var(--parchment-dark);margin:0 16px"></div>
        <button class="me-row" type="button" style="padding:13px 16px" on:click={logout}><div class="me-row-icon"></div><div class="me-row-text" style="color:#c05040">Sign out</div></button>
      </div>
    </div>

    <div style="height:16px"></div>
  </div>

  <div class={`lesson-screen ${lessonOpen ? 'active' : ''}`} id="lesson-screen">
    <div class="lesson-topbar">
      <button class="lesson-close" type="button" on:click={hideLesson}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="lesson-prog-track"><div class="lesson-prog-fill"></div></div>
    </div>
    <div class="lesson-body">
      <div class="lesson-step-label">Unit 3 = Lesson 2</div>
      <div class="lesson-phrase">An bhfuil bainne uait?</div>
      <div class="lesson-translation">Do you want milk?</div>
      <div class="lesson-context">The customer has ordered a tea. You need to ask if they want milk. <strong>An bhfuil</strong> is how you ask "is there / do you want" -- it's one of the most useful constructions in the whole course.</div>
      <div class="lesson-options">
        <button class={`lesson-opt ${picked === false ? 'wrong' : ''}`} type="button" on:click={() => pickOpt(false)}>Ar mhaith leat bainne?</button>
        <button class={`lesson-opt ${picked === true ? 'correct' : ''}`} type="button" on:click={() => pickOpt(true)}>An bhfuil bainne uait?</button>
        <button class={`lesson-opt ${picked === false ? 'wrong' : ''}`} type="button" on:click={() => pickOpt(false)}>C= mh=ad bainne?</button>
      </div>
    </div>
    <div class="lesson-footer"><button class="lesson-continue" type="button" on:click={hideLesson}>Lean ar aghaidh =</button></div>
  </div>

  <div class={`flash-screen ${flashOpen ? 'active' : ''}`} id="flash-screen">
    <div class="flash-topbar">
      <button class="flash-close" type="button" on:click={hideFlash}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,240,232,.5)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="flash-prog-track"><div class="flash-prog-fill"></div></div>
      <div class="flash-count">1 / 8</div>
    </div>
    <div class="flash-card-wrap">
      <button class={`flash-card ${flashRevealed ? 'revealed' : ''}`} id="flash-card" type="button" on:click={revealFlash}>
        <div class="flash-irish">Dia duit</div>
        <div class="flash-hint">Tap to reveal</div>
        <div class="flash-english">Hello</div>
      </button>
    </div>
    <div class="flash-actions" id="flash-actions" style={`display:${flashRevealed ? 'flex' : 'none'}`}>
      <button class="flash-action wrong" type="button" on:click={nextFlash}>N=or thuig m=</button>
      <button class="flash-action right" type="button" on:click={nextFlash}>Thuig m= =</button>
    </div>
  </div>

  <div class="bottom-nav">
    <button class={`nav-item ${activeTab === 'learn' ? 'active' : ''}`} id="nav-learn" type="button" on:click={() => switchTab('learn')}>
      <div class="nav-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <div class="nav-lbl">Learn</div>
    </button>
    <button class={`nav-item ${activeTab === 'practice' ? 'active' : ''}`} id="nav-practice" type="button" on:click={() => switchTab('practice')}>
      <div class="nav-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div class="nav-lbl">Practice</div>
    </button>
    <button class={`nav-item ${activeTab === 'phrases' ? 'active' : ''}`} id="nav-phrases" type="button" on:click={() => switchTab('phrases')}>
      <div class="nav-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="nav-lbl">Phrases</div>
    </button>
    <button class={`nav-item ${activeTab === 'me' ? 'active' : ''}`} id="nav-me" type="button" on:click={() => switchTab('me')}>
      <div class="nav-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="nav-lbl">Me</div>
    </button>
  </div>
</div>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --forest:#1c2b22;--parchment:#f5f0e8;--parchment-dark:#e8e0d0;
  --moss:#2d7a50;--sage:#7ec99a;--muted:#5a7a64;
  --nav-h:72px;--status-h:44px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

:global(html),:global(body){
  font-family:'Instrument Sans',sans-serif;
  background:#111;
  min-height:100vh;
  height:100%;
  overflow:hidden;
}

.phone{
  width:100%;
  height:100svh;
  min-height:100svh;
  height:100dvh;
  min-height:100dvh;
  max-width:430px;
  margin:0 auto;
  background:var(--parchment);
  overflow:hidden;
  position:relative;
  box-shadow:0 0 0 1px rgba(255,255,255,.06);
  flex-shrink:0;
}
.phone::before{
  content:'';
  position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:120px;height:34px;
  background:#111;
  border-radius:0 0 20px 20px;
  z-index:100;
}
.status-bar{
  height:var(--status-h);
  display:flex;align-items:flex-end;justify-content:space-between;
  padding:var(--safe-top) 24px 8px;
  position:relative;z-index:10;
}
.status-time{font-size:15px;font-weight:700;color:var(--forest);letter-spacing:-.02em}
.status-icons{display:flex;align-items:center;gap:6px}

.screen{
  position:absolute;inset:0;
  height:100svh;
  height:100dvh;
  overflow-y:auto;
  overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  padding-bottom:calc(var(--nav-h) + var(--safe-bottom) + 8px);
  display:none;
  flex-direction:column;
}
.screen::-webkit-scrollbar{display:none}
.screen.active{display:flex}
.bottom-nav{
  position:fixed;
  left:50%;
  transform:translateX(-50%);
  width:min(430px,100vw);
  bottom:0;
  height:calc(var(--nav-h) + var(--safe-bottom));
  background:rgba(245,240,232,.95);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-top:1px solid var(--parchment-dark);
  display:flex;align-items:center;justify-content:space-around;
  padding:0 4px calc(8px + var(--safe-bottom));
  z-index:50;
}
.nav-item{
  border:none;background:transparent;
  flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:8px 0;cursor:pointer;
  transition:opacity .15s;
  -webkit-tap-highlight-color:transparent;
}
.nav-item:active{opacity:.7}
.nav-icon{
  width:28px;height:28px;display:flex;align-items:center;justify-content:center;
  border-radius:8px;transition:background .2s;
}
.nav-item.active .nav-icon{background:rgba(45,122,80,.12)}
.nav-icon svg{transition:stroke .2s}
.nav-item .nav-icon svg{stroke:#bbb}
.nav-item.active .nav-icon svg{stroke:var(--moss)}
.nav-lbl{font-size:10px;font-weight:600;color:#bbb;letter-spacing:.02em;transition:color .2s}
.nav-item.active .nav-lbl{color:var(--moss)}
.learn-header{
  background:var(--forest);
  padding:calc(var(--status-h) + 4px) 24px 28px;
  position:relative;overflow:hidden;
}
.learn-header::after{
  content:'';position:absolute;
  bottom:-40px;right:-40px;
  width:200px;height:200px;
  border-radius:50%;
  background:rgba(45,122,80,.15);
}
.lh-greeting{font-size:13px;color:rgba(245,240,232,.45);margin-bottom:4px;font-weight:500}
.lh-name{
  font-family:'Fraunces',serif;font-weight:900;
  font-size:28px;color:var(--parchment);letter-spacing:-.02em;line-height:1.1;
  margin-bottom:20px;
}
.lh-name em{font-style:italic;font-weight:300;color:var(--sage)}
.streak-row{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.streak-pill{display:flex;align-items:center;gap:5px;background:rgba(126,201,154,.15);border:1px solid rgba(126,201,154,.2);border-radius:20px;padding:5px 12px}
.streak-num{font-size:14px;font-weight:700;color:var(--sage)}
.streak-lbl{font-size:11px;color:rgba(245,240,232,.45)}
.progress-row{display:flex;align-items:center;gap:16px}
.progress-ring-wrap{position:relative;width:64px;height:64px;flex-shrink:0}
.progress-ring-wrap svg{transform:rotate(-90deg)}
.progress-ring-bg{fill:none;stroke:rgba(255,255,255,.07);stroke-width:4}
.progress-ring-fill{fill:none;stroke:var(--sage);stroke-width:4;stroke-linecap:round;transition:stroke-dashoffset .6s}
.progress-ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.prl-num{font-size:14px;font-weight:700;color:var(--parchment);line-height:1}
.prl-sub{font-size:8px;color:rgba(245,240,232,.35);font-weight:600;letter-spacing:.05em}
.progress-text{flex:1}
.pt-label{font-size:11px;color:rgba(245,240,232,.4);margin-bottom:2px}
.pt-value{font-size:13px;font-weight:600;color:var(--parchment)}
.continue-card{margin:0 16px;margin-top:-20px;background:white;border-radius:20px;padding:18px 20px;border:1px solid var(--parchment-dark);box-shadow:0 4px 20px rgba(28,43,34,.08);z-index:5;position:relative}
.cc-eyebrow{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.cc-title{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-.01em;margin-bottom:3px}
.cc-sub{font-size:12px;color:#888;margin-bottom:14px;line-height:1.4}
.cc-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;background:var(--forest);color:var(--parchment);border:none;border-radius:12px;font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s;-webkit-tap-highlight-color:transparent}
.cc-btn:active{background:#2a3f30}
.cc-progress-bar{height:3px;background:var(--parchment-dark);border-radius:2px;margin-bottom:10px;overflow:hidden}
.cc-progress-fill{height:100%;background:var(--sage);border-radius:2px;width:40%}
.section-head{padding:24px 20px 12px;display:flex;align-items:baseline;justify-content:space-between}
.sh-title{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-.01em}
.sh-link{font-size:12px;color:var(--moss);font-weight:600}
.unit-card{margin:0 16px 10px;background:white;border-radius:16px;border:1px solid var(--parchment-dark);overflow:hidden}
.unit-card.locked{opacity:.5}
.uc-header{padding:16px 16px 16px;display:flex;align-items:center;gap:12px}
.uc-num{width:36px;height:36px;border-radius:10px;background:var(--forest);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:16px;color:var(--sage);flex-shrink:0}
.unit-card.complete .uc-num{background:var(--moss)}
.uc-info{flex:1}
.uc-title{font-size:14px;font-weight:700;color:var(--forest);margin-bottom:1px}
.uc-sub{font-size:11px;color:#999}
.uc-badge{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:10px}
.uc-badge.done{background:rgba(45,122,80,.1);color:var(--moss)}
.uc-badge.progress{background:rgba(126,201,154,.15);color:var(--muted)}
.uc-badge.locked{background:var(--parchment-dark);color:#bbb}
.uc-progress{height:3px;background:var(--parchment-dark);margin:0 16px 16px}
.uc-progress-fill{height:100%;background:var(--sage)}
.practice-warmup{padding:calc(var(--status-h) + 8px) 16px 12px}
.warmup-eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.warmup-headline{font-family:'Fraunces',serif;font-weight:900;font-size:32px;letter-spacing:-.03em;line-height:1.05;color:var(--forest);margin-bottom:8px}
.warmup-headline em{font-style:italic;font-weight:300;color:var(--moss)}
.warmup-sub{font-size:13px;color:#777;margin-bottom:18px;line-height:1.55}
.due-strip{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.due-pill{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:18px;font-size:12px;font-weight:600}
.due-pill.primary{background:var(--forest);color:var(--parchment)}
.due-pill.secondary{background:white;color:var(--forest);border:1px solid var(--parchment-dark)}
.due-pill.dim{background:var(--parchment-dark);color:var(--muted)}
.mode-list{display:flex;flex-direction:column;gap:10px}
.mode-card{display:flex;align-items:center;gap:12px;padding:16px;background:white;border:1.5px solid var(--parchment-dark);border-radius:16px;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .1s,background .15s;text-align:left;width:100%;font-family:'Instrument Sans',sans-serif;-webkit-tap-highlight-color:transparent}
.mode-card:active{transform:scale(.98)}
.mode-card.primary-mode{background:var(--forest);border-color:var(--forest)}
.mode-card.primary-mode:active{background:#243529}
.mc-icon-wrap{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mc-icon-wrap.dark{background:rgba(126,201,154,.15)}
.mc-icon-wrap.light{background:rgba(45,122,80,.08)}
.mc-icon-wrap.dim{background:var(--parchment-dark)}
.mc-text{flex:1;min-width:0}
.mc-eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.mode-card.primary-mode .mc-eyebrow{color:rgba(245,240,232,.45)}
.mc-title{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-.01em}
.mc-title em{font-style:italic;font-weight:300;color:var(--moss)}
.mode-card.primary-mode .mc-title{color:var(--parchment)}
.mode-card.primary-mode .mc-title em{color:var(--sage)}
.mc-sub{font-size:12px;color:#8e8e8e;margin-top:1px;line-height:1.35}
.mode-card.primary-mode .mc-sub{color:rgba(245,240,232,.48)}
.mc-badge{font-size:11px;font-weight:700;padding:4px 8px;border-radius:10px;white-space:nowrap}
.mc-badge{background:rgba(126,201,154,.2);color:var(--sage)}
.mode-card:not(.primary-mode) .mc-badge{background:rgba(45,122,80,.1);color:var(--moss)}
.mc-badge.amber{background:rgba(200,120,40,.12)!important;color:#c07828!important}
.mc-badge.none{background:var(--parchment-dark)!important;color:#8f8f8f!important}
.mc-arrow{color:#c4c4c4;flex-shrink:0}
.mode-card.primary-mode .mc-arrow{color:rgba(245,240,232,.35)}
.streak-section{padding:20px 16px 0}
.streak-cards{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.streak-cards::-webkit-scrollbar{display:none}
.streak-card{flex-shrink:0;width:100px;background:white;border-radius:12px;border:1px solid var(--parchment-dark);padding:12px 10px;text-align:center}
.streak-card.due{border-color:var(--sage);background:rgba(126,201,154,.05)}
.sc-irish{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:13px;color:var(--forest);margin-bottom:2px}
.sc-english{font-size:10px;color:#aaa}
.sc-due{font-size:9px;font-weight:700;color:var(--sage);margin-top:4px;letter-spacing:.05em}
.review-btn{margin:16px;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:var(--forest);border-radius:14px;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.rb-title{font-size:15px;font-weight:700;color:var(--parchment);margin-bottom:2px}
.rb-sub{font-size:12px;color:rgba(245,240,232,.4)}
.rb-badge{background:var(--sage);color:var(--forest);font-size:13px;font-weight:700;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.pb-header{background:var(--parchment);padding:calc(var(--status-h) + 4px) 20px 16px;border-bottom:1px solid var(--parchment-dark)}
.pb-title{font-family:'Fraunces',serif;font-weight:900;font-size:26px;color:var(--forest);letter-spacing:-.02em}
.pb-search{margin-top:12px;display:flex;align-items:center;gap:8px;background:white;border:1px solid var(--parchment-dark);border-radius:10px;padding:9px 12px}
.pb-search input{flex:1;border:none;outline:none;font-family:'Instrument Sans',sans-serif;font-size:14px;color:var(--forest);background:transparent}
.pb-search input::placeholder{color:#ccc}
.pb-section{padding:16px 16px 0}
.pbs-label{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.phrase-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--parchment-dark)}
.phrase-row:last-child{border-bottom:none}
.pr-text{flex:1}
.pr-irish{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:15px;color:var(--forest);margin-bottom:2px}
.pr-english{font-size:12px;color:#888}
.pr-play{width:32px;height:32px;border-radius:50%;background:var(--parchment-dark);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.me-header{background:var(--forest);padding:calc(var(--status-h) + 4px) 24px 28px}
.me-avatar{width:64px;height:64px;border-radius:50%;background:rgba(126,201,154,.2);border:2px solid rgba(126,201,154,.3);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.me-name{font-family:'Fraunces',serif;font-weight:700;font-size:22px;color:var(--parchment);letter-spacing:-.01em;margin-bottom:2px}
.me-sub{font-size:12px;color:rgba(245,240,232,.4)}
.me-stats{display:flex;gap:1px;margin:0 16px;margin-top:-16px;z-index:5;position:relative}
.me-stat{flex:1;background:white;padding:14px 12px;text-align:center;border:1px solid var(--parchment-dark)}
.me-stat:first-child{border-radius:14px 0 0 14px}
.me-stat:last-child{border-radius:0 14px 14px 0}
.ms-num{font-family:'Fraunces',serif;font-weight:900;font-size:22px;color:var(--forest);letter-spacing:-.02em}
.ms-lbl{font-size:10px;color:#aaa;font-weight:600;margin-top:1px}
.me-section{padding:20px 16px 0}
.mes-title{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.me-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--parchment-dark);cursor:pointer;background:transparent;border-left:none;border-right:none;border-top:none;width:100%;text-align:left}
.me-row:last-child{border-bottom:none}
.me-row-icon{width:34px;height:34px;border-radius:10px;background:var(--parchment-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.me-row-text{flex:1;font-size:14px;color:var(--forest);font-weight:500}
.me-row-arrow{color:#ccc}
.lesson-screen{position:absolute;inset:0;background:var(--parchment);z-index:200;display:none;flex-direction:column;overflow:hidden}
.lesson-screen.active{display:flex}
.lesson-topbar{padding:calc(var(--status-h) - 8px) 20px 12px;display:flex;align-items:center;gap:12px}
.lesson-close{width:32px;height:32px;border-radius:50%;background:var(--parchment-dark);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.lesson-prog-track{flex:1;height:4px;background:var(--parchment-dark);border-radius:2px;overflow:hidden}
.lesson-prog-fill{height:100%;background:var(--moss);border-radius:2px;width:35%;transition:width .4s}
.lesson-body{flex:1;padding:24px 20px 16px;display:flex;flex-direction:column;gap:20px;overflow-y:auto}
.lesson-step-label{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.lesson-phrase{font-family:'Fraunces',serif;font-weight:300;font-style:italic;font-size:32px;color:var(--forest);letter-spacing:-.02em;line-height:1.2}
.lesson-translation{font-size:16px;color:#888;font-weight:400;margin-top:4px}
.lesson-context{background:white;border-radius:14px;border:1px solid var(--parchment-dark);padding:16px;font-size:14px;color:#555;line-height:1.6}
.lesson-context strong{color:var(--forest);font-weight:700}
.lesson-options{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.lesson-opt{padding:14px 16px;border:1.5px solid var(--parchment-dark);border-radius:12px;background:white;font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:500;color:var(--forest);cursor:pointer;text-align:left;transition:all .15s;-webkit-tap-highlight-color:transparent}
.lesson-opt:active{background:var(--parchment-dark)}
.lesson-opt.correct{background:rgba(45,122,80,.08);border-color:var(--moss);color:var(--moss)}
.lesson-opt.wrong{background:rgba(220,80,60,.06);border-color:#e08070;color:#c05040}
.lesson-footer{padding:12px 20px calc(40px + var(--safe-bottom));flex-shrink:0}
.lesson-continue{width:100%;padding:15px;background:var(--forest);color:var(--parchment);border:none;border-radius:14px;font-family:'Instrument Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer}
.flash-screen{position:absolute;inset:0;background:var(--forest);z-index:200;display:none;flex-direction:column}
.flash-screen.active{display:flex}
.flash-topbar{padding:calc(var(--status-h) - 8px) 20px 12px;display:flex;align-items:center;gap:12px}
.flash-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.08);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.flash-prog-track{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden}
.flash-prog-fill{height:100%;background:var(--sage);border-radius:2px;width:20%}
.flash-count{font-size:12px;color:rgba(245,240,232,.3);font-weight:600;flex-shrink:0}
.flash-card-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:20px}
.flash-card{width:100%;max-width:320px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:36px 28px;text-align:center;cursor:pointer;transition:transform .2s;-webkit-tap-highlight-color:transparent}
.flash-card:active{transform:scale(.97)}
.flash-irish{font-family:'Fraunces',serif;font-weight:300;font-style:italic;font-size:30px;color:var(--parchment);letter-spacing:-.02em;line-height:1.25;margin-bottom:12px}
.flash-hint{font-size:12px;color:rgba(245,240,232,.25);letter-spacing:.05em;font-weight:600;text-transform:uppercase}
.flash-english{font-size:16px;color:rgba(245,240,232,.6);margin-top:8px;display:none}
.flash-card.revealed .flash-hint{display:none}
.flash-card.revealed .flash-english{display:block}
.flash-actions{display:flex;gap:10px;padding:0 20px calc(40px + var(--safe-bottom))}
.flash-action{flex:1;padding:14px;border:none;border-radius:14px;font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:transform .1s;-webkit-tap-highlight-color:transparent}
.flash-action:active{transform:scale(.97)}
.flash-action.wrong{background:rgba(220,80,60,.15);color:#e09080}
.flash-action.right{background:rgba(126,201,154,.2);color:var(--sage)}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.screen.active{animation:slideUp .25s cubic-bezier(.4,0,.2,1) both}
</style>
