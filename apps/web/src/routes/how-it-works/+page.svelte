<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>How it works — Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav>
  <a href="/" class="nav-brand">
    <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
      <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#1c2b22"/>
      <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="33.5" cy="45" r="3" fill="#f5f0e8"/>
    </svg>
    <span class="nav-name">Misne<em>ach</em></span>
  </a>
  <div class="nav-links">
    <a href="/how-it-works" class="nav-link active">How it works</a>
    <details class="nav-dropdown">
      <summary class="nav-link">Info packs</summary>
      <div class="nav-dropdown-menu">
        <a href="/info-packs/seachtain-na-gaeilge">Seachtain na Gaeilge</a>
        <a href="/info-packs/fleadh-cheoil">Fleadh Cheoil</a>
      </div>
    </details>
    <a href="/for-businesses" class="nav-link">For businesses</a>
    <a href="/pricing" class="nav-link">Pricing</a>
    <a href="/waitlist?interest=individual_course_access" class="nav-cta">Sign in</a>
  </div>
</nav>

<section class="page-hero">
  <div class="page-hero-inner">
    <span class="page-hero-tag">How it works</span>
    <h1 class="page-hero-headline">
      Simple.
      <em>On purpose.</em>
    </h1>
    <p class="page-hero-sub">No grammar tables. No vocabulary lists. Just real conversations, built up piece by piece, until you're ready to use them.</p>
  </div>
</section>

<section class="section lesson-anatomy">
  <div class="section-inner">
    <span class="section-tag reveal">The structure</span>
    <h2 class="section-headline reveal">Every unit follows <em>the same shape.</em></h2>
    <p class="section-intro reveal">You always know where you are and what comes next. There's no guessing, no overwhelm, just one thing at a time.</p>

    <div class="steps">
      <div class="step reveal">
        <div class="step-num">1</div>
        <div class="step-content">
          <h3>You see the <em>full conversation first.</em></h3>
          <p>Every unit opens with a complete real-world exchange. You can see exactly where you're going before you begin.</p>
        </div>
      </div>

      <div class="step reveal">
        <div class="step-num">2</div>
        <div class="step-content">
          <h3>Then you break it down, <em>piece by piece.</em></h3>
          <p>Each lesson explains what's happening and <strong>why this phrase works</strong> in real situations.</p>
          <div class="lesson-types">
            <div class="type-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Conversation
            </div>
            <div class="type-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Breakdown
            </div>
            <div class="type-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Recap
            </div>
          </div>
        </div>
      </div>

      <div class="step reveal">
        <div class="step-num">3</div>
        <div class="step-content">
          <h3>Things go <em>wrong</em> and you handle that too.</h3>
          <p>You practice recovery scenarios, not just the ideal script.</p>
        </div>
      </div>

      <div class="step reveal">
        <div class="step-num">4</div>
        <div class="step-content">
          <h3>A vocabulary reference, <em>when you need it.</em></h3>
          <p>Reference sections are for quick lookup when you need a specific swap.</p>
        </div>
      </div>

      <div class="step reveal">
        <div class="step-num">5</div>
        <div class="step-content">
          <h3>Then you take it <em>outside.</em></h3>
          <p>The last lesson in every unit is one real-world use. <strong>One phrase, used once.</strong></p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section walkthrough">
  <div class="section-inner">
    <span class="section-tag reveal">Inside a unit</span>
    <h2 class="section-headline reveal">What the first unit <em>actually looks like.</em></h2>
    <p class="section-intro reveal">Coffee Shop Encounters, Unit 1. Twelve lessons. Around 45 minutes total.</p>

    <div class="walkthrough-unit reveal">
      <div class="unit-header">
        <div class="unit-header-left">
          <div class="unit-eyebrow">Coffee Shop Encounters · Unit 1</div>
          <div class="unit-title">First <em>Encounters</em></div>
        </div>
        <div class="unit-meta">12 lessons · ~45 min</div>
      </div>

      <div class="unit-lessons">
        <div class="unit-lesson"><div class="lesson-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Full Conversation</div><div class="lesson-desc">The whole exchange, start to finish.</div></div><div class="lesson-time">2 min</div></div>
        <div class="unit-lesson"><div class="lesson-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Breakdown Parts</div><div class="lesson-desc">Greeting, ordering, payment, and goodbyes.</div></div><div class="lesson-time">11 min</div></div>
        <div class="unit-lesson"><div class="lesson-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Recap</div><div class="lesson-desc">A complete interaction, reinforced.</div></div><div class="lesson-time">1 min</div></div>
        <div class="unit-lesson"><div class="lesson-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Challenge</div><div class="lesson-desc">Practice variations and recovery lines.</div></div><div class="lesson-time">10 min</div></div>
        <div class="unit-lesson"><div class="lesson-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Vocabulary Reference</div><div class="lesson-desc">Quick lookup for drinks, prices, and swaps.</div></div><div class="lesson-time">6 min</div></div>
        <div class="unit-lesson"><div class="lesson-icon" style="background: var(--forest); border-color: var(--forest);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--sage)"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div class="lesson-info"><div class="lesson-title-row">Real World Challenge</div><div class="lesson-desc">Use one phrase in a real place.</div></div><div class="lesson-time">1 min</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section platform-section">
  <div class="section-inner">
    <span class="section-tag reveal">Between lessons</span>
    <h2 class="section-headline reveal">The tools that make <em>phrases stick.</em></h2>
    <p class="section-intro reveal">Misneach gives you lightweight ways to keep practising in small daily gaps.</p>

    <div class="platform-features">
      <div class="platform-feature reveal"><div class="platform-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="platform-feature-body"><h3>Flashcards</h3><p>Every phrase from the course becomes drillable.</p></div></div>
      <div class="platform-feature reveal reveal-delay-1"><div class="platform-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h8"/><path d="M8 14h5"/></svg></div><div class="platform-feature-body"><h3>Practice sessions</h3><p>Timed drills that mirror real interactions.</p></div></div>
      <div class="platform-feature reveal"><div class="platform-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="platform-feature-body"><h3>Phrase tracking</h3><p>Weak spots come back more often so progress compounds.</p></div></div>
      <div class="platform-feature reveal reveal-delay-1"><div class="platform-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="platform-feature-body"><h3>Mistake corrector</h3><p>You get plain-language explanations, not just wrong/right.</p></div></div>
    </div>
  </div>
</section>

<section class="section real-world-section">
  <div class="section-inner">
    <span class="section-tag reveal">The last lesson</span>
    <div class="challenge-card reveal">
      <div class="challenge-card-inner">
        <div class="challenge-eyebrow">Real World Challenge</div>
        <h2 class="challenge-headline">Your challenge is <em>simple.</em></h2>
        <p class="challenge-body">Use one phrase from this unit in a real situation. That's it.</p>

        <div class="challenge-tasks">
          <div class="challenge-task"><div class="task-num">-</div><div class="task-text">Start with <em>Go raibh maith agat</em> in a real interaction.</div></div>
          <div class="challenge-task"><div class="task-num">-</div><div class="task-text">If it switches to English, that's still a win.</div></div>
          <div class="challenge-task"><div class="task-num">-</div><div class="task-text">Small repetitions are how this becomes normal.</div></div>
        </div>

        <a href="/taster" class="btn-challenge">Try a free lesson</a>
      </div>
    </div>
  </div>
</section>

<section class="section faq-section">
  <div class="section-inner">
    <span class="section-tag reveal">Questions</span>
    <h2 class="section-headline reveal">Things people <em>usually ask.</em></h2>

    <div class="faq-list">
      <div class="faq-item reveal"><div class="faq-q">Do I need any Irish to start?</div><div class="faq-a">No. The course is built for practical beginners.</div></div>
      <div class="faq-item reveal"><div class="faq-q">How long are lessons?</div><div class="faq-a">Most are <strong>2–10 minutes</strong>.</div></div>
      <div class="faq-item reveal"><div class="faq-q">What about pronunciation?</div><div class="faq-a">Everything uses plain-English pronunciation guidance.</div></div>
      <div class="faq-item reveal"><div class="faq-q">Is this only for cafés?</div><div class="faq-a">Cafés first, with more scenarios coming.</div></div>
      <div class="faq-item reveal"><div class="faq-q">What if the other person doesn't speak Irish?</div><div class="faq-a">English is always available as fallback.</div></div>
    </div>
  </div>
</section>

<section class="final-cta">
  <div class="final-cta-inner">
    <h2 class="final-headline">
      Ready when
      <em>you are.</em>
    </h2>
    <p class="final-sub">Your first lesson takes two minutes.</p>
    <a href="/taster" class="btn-final">Tosaigh — Try a free lesson</a>
  </div>
</section>

<footer>
  <div class="footer-brand">
    <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
      <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#f5f0e8"/>
      <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#1c2b22" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="33.5" cy="45" r="3" fill="#1c2b22"/>
    </svg>
    <div>
      <div class="footer-name">Misne<em>ach</em></div>
      <div class="footer-tagline">Irish, out loud.</div>
    </div>
  </div>
  <div class="footer-links">
    <a href="/how-it-works" class="footer-link">How it works</a>
    <a href="/for-businesses" class="footer-link">For businesses</a>
    <a href="/pricing" class="footer-link">Pricing</a>
    <a href="/waitlist?interest=individual_course_access" class="footer-link">Sign in</a>
  </div>
</footer>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --forest: #1c2b22;
  --forest-mid:#2e4436;
  --parchment: #f5f0e8;
  --parchment-dark: #e8e0d0;
  --green: #2d7a50;
  --sage: #7ec99a;
  --muted: #5a7a64;
  --ink: #1a1a18;
  --paper: #ffffff;
}
:global(html) { scroll-behavior: smooth; }
:global(body) {
  font-family: 'Instrument Sans', sans-serif;
  background: var(--parchment);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: 0 40px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(245,240,232,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(28,43,34,0.08);
}
.nav-brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
.nav-name {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.03em;
  color: var(--forest);
  line-height: 1;
}
.nav-name em { font-style: italic; font-weight: 300; color: var(--green); }
.nav-links { display: flex; align-items: center; gap: 28px; }
.nav-dropdown { position: relative; }
.nav-dropdown summary { list-style: none; cursor: pointer; }
.nav-dropdown summary::-webkit-details-marker { display: none; }
.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 220px;
  border: 1px solid rgba(28,43,34,0.12);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 30px -12px rgba(28,43,34,0.35);
  overflow: hidden;
  display: none;
  z-index: 20;
}
.nav-dropdown[open] .nav-dropdown-menu { display: block; }
.nav-dropdown-menu a {
  display: block;
  padding: 10px 12px;
  text-decoration: none;
  font-size: 12px;
  color: var(--forest);
}
.nav-dropdown-menu a:hover { background: var(--parchment); }
.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.12s;
  letter-spacing: 0.01em;
}
.nav-link:hover { color: var(--forest); }
.nav-link.active { color: var(--forest); font-weight: 600; }
.nav-cta {
  background: var(--forest);
  color: var(--parchment);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-family: 'Instrument Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s;
}
.nav-cta:hover { background: var(--green); }
.page-hero {
  background: var(--forest);
  padding: 120px 24px 80px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.page-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}
.page-hero::after {
  content: '';
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 400px;
  background: radial-gradient(circle, rgba(45,122,80,0.2) 0%, transparent 65%);
  pointer-events: none;
}
.page-hero-inner { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
.page-hero-tag { font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 16px; display: block; }
.page-hero-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(36px, 6vw, 64px);
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--parchment);
  margin-bottom: 20px;
}
.page-hero-headline em { font-style: italic; font-weight: 300; color: var(--sage); display: block; }
.page-hero-sub { font-size: 16px; line-height: 1.65; color: var(--muted); max-width: 480px; margin: 0 auto; }
.section { padding: 88px 24px; display: flex; flex-direction: column; align-items: center; }
.section-inner { max-width: 760px; width: 100%; }
.section-tag { font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 16px; display: block; }
.section-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(28px, 4vw, 44px); letter-spacing: -0.03em; line-height: 1.05; color: var(--forest); margin-bottom: 12px; }
.section-headline em { font-style: italic; font-weight: 300; color: var(--green); }
.section-intro { font-size: 16px; line-height: 1.7; color: #666; max-width: 520px; margin-bottom: 48px; }
.lesson-anatomy { background: var(--parchment); }
.steps { display: flex; flex-direction: column; border-top: 1px solid var(--parchment-dark); margin-bottom: 56px; }
.step { display: grid; grid-template-columns: 48px 1fr; gap: 20px; padding: 28px 0; border-bottom: 1px solid var(--parchment-dark); align-items: start; }
.step-num { font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; font-size: 32px; color: var(--sage); line-height: 1; margin-top: 4px; }
.step-content h3 { font-family: 'Fraunces', serif; font-weight: 700; font-size: 18px; color: var(--forest); letter-spacing: -0.01em; margin-bottom: 6px; line-height: 1.2; }
.step-content h3 em { font-style: italic; font-weight: 300; color: var(--green); }
.step-content p { font-size: 14px; line-height: 1.68; color: #666; }
.step-content p strong { color: var(--ink); font-weight: 600; }
.lesson-types { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.type-tag { display: flex; align-items: center; gap: 6px; background: var(--paper); border: 1px solid var(--parchment-dark); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #555; }
.type-tag svg { width: 13px; height: 13px; color: var(--green); }
.walkthrough { background: var(--paper); }
.walkthrough-unit { border: 1px solid var(--parchment-dark); border-radius: 16px; overflow: hidden; }
.unit-header { background: var(--forest); padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.unit-eyebrow { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
.unit-title { font-family: 'Fraunces', serif; font-weight: 900; font-size: 18px; letter-spacing: -0.02em; color: var(--parchment); line-height: 1; }
.unit-title em { font-style: italic; font-weight: 300; color: var(--sage); }
.unit-meta { font-size: 11px; color: var(--muted); white-space: nowrap; }
.unit-lessons { display: flex; flex-direction: column; }
.unit-lesson { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--parchment-dark); transition: background 0.1s; cursor: default; }
.unit-lesson:last-child { border-bottom: none; }
.unit-lesson:hover { background: var(--parchment); }
.lesson-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--parchment); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--parchment-dark); }
.lesson-icon svg { width: 16px; height: 16px; color: var(--green); }
.lesson-info { flex: 1; }
.lesson-title-row { font-family: 'Fraunces', serif; font-weight: 700; font-size: 14px; color: var(--forest); letter-spacing: -0.01em; margin-bottom: 2px; }
.lesson-desc { font-size: 11.5px; color: #888; line-height: 1.45; }
.lesson-time { font-size: 11px; color: #bbb; font-weight: 500; white-space: nowrap; }
.real-world-section { background: var(--parchment-dark); }
.challenge-card { background: var(--forest); border-radius: 16px; padding: 40px; position: relative; overflow: hidden; }
.challenge-card::before { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; }
.challenge-card-inner { position: relative; z-index: 1; }
.challenge-eyebrow { font-size: 9.5px; letter-spacing: 0.26em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 12px; }
.challenge-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(22px, 3vw, 32px); letter-spacing: -0.03em; color: var(--parchment); line-height: 1.1; margin-bottom: 12px; }
.challenge-headline em { font-style: italic; font-weight: 300; color: var(--sage); }
.challenge-body { font-size: 14px; line-height: 1.7; color: var(--muted); max-width: 480px; margin-bottom: 28px; }
.challenge-tasks { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
.challenge-task { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid var(--forest-mid); border-radius: 10px; }
.task-num { font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; font-size: 18px; color: var(--sage); line-height: 1; flex-shrink: 0; min-width: 16px; }
.task-text { font-size: 13.5px; color: var(--parchment); line-height: 1.5; padding-top: 1px; }
.task-text em { color: var(--sage); font-style: italic; }
.btn-challenge { background: var(--sage); color: var(--forest); border: none; border-radius: 10px; padding: 12px 24px; font-family: 'Fraunces', serif; font-weight: 700; font-size: 15px; letter-spacing: -0.01em; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.12s, transform 0.1s; }
.btn-challenge:hover { background: #8fd4a8; transform: translateY(-1px); }
.platform-section { background: var(--parchment-dark); }
.platform-features { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; border-radius: 16px; overflow: hidden; }
.platform-feature { background: var(--paper); padding: 36px 32px; display: flex; flex-direction: column; gap: 14px; }
.platform-feature-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(45,122,80,0.08); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(45,122,80,0.12); flex-shrink: 0; }
.platform-feature-icon svg { width: 20px; height: 20px; color: var(--green); }
.platform-feature-body h3 { font-family: 'Fraunces', serif; font-weight: 700; font-size: 18px; color: var(--forest); letter-spacing: -0.01em; margin-bottom: 7px; line-height: 1.2; }
.platform-feature-body p { font-size: 13.5px; line-height: 1.72; color: #666; }
.faq-section { background: var(--parchment); }
.faq-list { display: flex; flex-direction: column; border-top: 1px solid var(--parchment-dark); }
.faq-item { border-bottom: 1px solid var(--parchment-dark); padding: 24px 0; }
.faq-q { font-family: 'Fraunces', serif; font-weight: 700; font-size: 17px; color: var(--forest); letter-spacing: -0.01em; margin-bottom: 10px; line-height: 1.3; }
.faq-a { font-size: 14px; line-height: 1.72; color: #555; max-width: 580px; }
.faq-a strong { color: var(--ink); font-weight: 600; }
.final-cta { background: var(--forest); padding: 100px 24px; text-align: center; position: relative; overflow: hidden; }
.final-cta::before { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; }
.final-cta::after { content: ''; position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%); width: 400px; height: 400px; background: radial-gradient(circle, rgba(45,122,80,0.22) 0%, transparent 65%); pointer-events: none; }
.final-cta-inner { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; }
.final-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(32px, 5vw, 52px); letter-spacing: -0.04em; line-height: 1; color: var(--parchment); margin-bottom: 16px; }
.final-headline em { font-style: italic; font-weight: 300; color: var(--sage); display: block; }
.final-sub { font-size: 15px; line-height: 1.65; color: var(--muted); margin-bottom: 36px; }
.btn-final { background: var(--sage); color: var(--forest); border: none; border-radius: 14px; padding: 16px 36px; font-family: 'Fraunces', serif; font-weight: 700; font-size: 17px; letter-spacing: -0.01em; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.12s, transform 0.1s; }
.btn-final:hover { background: #8fd4a8; transform: translateY(-2px); }
footer { background: var(--forest); border-top: 1px solid var(--forest-mid); padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.footer-brand { display: flex; align-items: center; gap: 8px; }
.footer-name { font-family: 'Fraunces', serif; font-weight: 900; font-size: 15px; letter-spacing: -0.02em; color: var(--parchment); }
.footer-name em { font-style: italic; font-weight: 300; color: var(--sage); }
.footer-tagline { font-size: 11px; color: var(--forest-mid); letter-spacing: 0.04em; }
.footer-links { display: flex; gap: 24px; }
.footer-link { font-size: 12px; color: var(--muted); text-decoration: none; font-weight: 500; transition: color 0.12s; }
.footer-link:hover { color: var(--parchment); }
@media (max-width: 760px) {
  nav { padding: 0 20px; }
  .nav-links .nav-link { display: none; }
  .unit-header { flex-direction: column; align-items: flex-start; }
  footer { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .platform-features { grid-template-columns: 1fr; }
}
.reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal-delay-1 { transition-delay: 0.1s; }
</style>
