<script lang="ts">
  import { launchConfig } from '$lib/launch-config';

  type Phrase = {
    irish: string;
    english: string;
    phonetic: string;
  };

  type PhraseTab = {
    id: string;
    label: string;
    phrases: Phrase[];
  };

  type BizCard = {
    num: string;
    title: string;
    body: string;
  };

  export let pageTitle = 'Misneach — Info pack';
  export let navEvent = '';
  export let heroEyebrow = '';
  export let heroTitleLine1 = '';
  export let heroTitleLine2 = '';
  export let heroDates = '';
  export let heroIntro = '';
  export let aboutTag = '';
  export let aboutHeadline = '';
  export let aboutBody1 = '';
  export let aboutBody2 = '';
  export let phrasesHeadline = '';
  export let phrasesSub = '';
  export let phraseTabs: PhraseTab[] = [];
  export let courseHeadline = '';
  export let courseBody = '';
  export let bizTag = '';
  export let bizHeadline = '';
  export let bizIntro = '';
  export let bizCards: BizCard[] = [];
  export let signpostBody = '';
  export let footerNote = '';

  let activeTab = phraseTabs[0]?.id ?? '';
  $: if (!phraseTabs.some((tab) => tab.id === activeTab)) activeTab = phraseTabs[0]?.id ?? '';
  $: activePhrases = phraseTabs.find((tab) => tab.id === activeTab)?.phrases ?? [];

  function speakPhrase(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ga-IE';
    utter.rate = 0.86;
    window.speechSynthesis.speak(utter);
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav>
  <a href="/" class="nav-brand">
    <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
      <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#f5f0e8"/>
      <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#1c2b22" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="33.5" cy="45" r="3" fill="#7ec99a"/>
    </svg>
    <span class="nav-name">Misne<em>ach</em></span>
  </a>
  <div class="nav-links">
    <a href="/how-it-works" class="nav-link">How it works</a>
    <details class="nav-dropdown">
      <summary class="nav-link active">Info packs</summary>
      <div class="nav-dropdown-menu">
        <a href="/info-packs/seachtain-na-gaeilge">Seachtain na Gaeilge</a>
        <a href="/info-packs/fleadh-cheoil">Fleadh Cheoil</a>
      </div>
    </details>
    <a href="/for-businesses" class="nav-link">For businesses</a>
    <a href="/pricing" class="nav-link">Pricing</a>
    <a href={launchConfig.accountLinksEnabled ? '/auth/login' : launchConfig.waitlistHref} class="nav-cta">
      {launchConfig.accountLinksEnabled ? 'Sign in' : launchConfig.waitlistLabel}
    </a>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <p class="hero-eyebrow">{heroEyebrow}</p>
    <h1>{heroTitleLine1}<em>{heroTitleLine2}</em></h1>
    <p class="hero-dates">{heroDates}</p>
    <p class="hero-intro">{heroIntro}</p>
    <div class="hero-actions">
      <a href="#phrases" class="btn-primary">Learn some phrases</a>
      <a href="#businesses" class="btn-ghost">For businesses →</a>
    </div>
  </div>
</section>

<section class="section" style="background: white;">
  <div class="section-inner">
    <span class="section-tag">{aboutTag}</span>
    <h2 class="section-headline">{@html aboutHeadline}</h2>
    <p class="section-body">{@html aboutBody1}</p>
    <p class="section-body" style="margin-top: 14px;">{@html aboutBody2}</p>
  </div>
</section>

<hr class="divider"/>

<section class="phrases-section" id="phrases">
  <div class="phrases-inner">
    <p class="phrases-tag">Cúpla focal</p>
    <h2 class="phrases-headline">{@html phrasesHeadline}</h2>
    <p class="phrases-sub">{phrasesSub}</p>
    <div class="phrases-tabs">
      {#each phraseTabs as tab}
        <button type="button" class={`phrase-tab ${activeTab === tab.id ? 'active' : ''}`} onclick={() => (activeTab = tab.id)}>
          {tab.label}
        </button>
      {/each}
    </div>
    <div class="phrases-grid">
      {#each activePhrases as phrase}
        <button type="button" class="phrase-card" onclick={() => speakPhrase(phrase.irish)}>
          <div class="phrase-irish">{phrase.irish}</div>
          <div class="phrase-english">{phrase.english}</div>
          <div class="phrase-phonetic">{phrase.phonetic}</div>
        </button>
      {/each}
    </div>
  </div>
</section>

<section class="course-section">
  <div class="course-inner">
    <span class="section-tag">Interactive</span>
    <h2 class="section-headline">{@html courseHeadline}</h2>
    <p class="section-body">{courseBody}</p>
    <a href="/taster" class="btn-course">Start the lesson — it's free</a>
  </div>
</section>

<hr class="divider"/>

<section class="biz-section" id="businesses">
  <div class="biz-inner">
    <span class="section-tag">{bizTag}</span>
    <h2 class="section-headline">{@html bizHeadline}</h2>
    <p class="section-body">{bizIntro}</p>
    <div class="biz-grid">
      {#each bizCards as card}
        <article class="biz-card">
          <div class="biz-card-num">{card.num}</div>
          <h3 class="biz-card-title">{card.title}</h3>
          <p class="biz-card-body">{@html card.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="signpost-section">
  <div class="signpost-inner">
    <h2 class="signpost-headline">Want to go <em>further?</em></h2>
    <p class="signpost-body">{signpostBody}</p>
    <a href="/" class="btn-primary">See what's next on Misneach</a>
  </div>
</section>

<footer>
  <div class="footer-left">
    <div class="footer-name">Misne<em>ach</em></div>
    <div class="footer-note">Irish for everyday life</div>
  </div>
  <span class="footer-note">{footerNote}</span>
</footer>

<style>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --forest: #1c2b22;
  --parchment: #f5f0e8;
  --moss: #2d7a50;
  --sage: #7ec99a;
  --muted: #5a7a64;
  --ink: #1a1a18;
  --parchment-dark: #ddd5c5;
}
body {
  font-family: 'Instrument Sans', sans-serif;
  background: var(--parchment);
  color: var(--ink);
  margin: 0;
}
nav {
  position: sticky; top: 0; z-index: 20;
  background: var(--forest);
  padding: 0 24px; height: 52px;
  display: flex; align-items: center; justify-content: space-between;
}
.nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.nav-name { font-family: 'Fraunces', serif; font-weight: 900; font-size: 18px; letter-spacing: -0.03em; color: var(--parchment); }
.nav-name em { font-style: italic; font-weight: 300; color: var(--sage); }
.nav-event { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.nav-links { display: flex; align-items: center; gap: 24px; }
.nav-link { font-size: 13px; font-weight: 500; color: var(--muted); text-decoration: none; }
.nav-link.active { color: var(--sage); }
.nav-cta {
  background: var(--parchment);
  color: var(--forest);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
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
  z-index: 30;
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
.hero { background: var(--forest); padding: 72px 24px 80px; text-align: center; }
.hero-inner { max-width: 640px; margin: 0 auto; }
.hero-eyebrow { font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-bottom: 16px; }
.hero h1 { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(2.4rem, 7vw, 4rem); letter-spacing: -0.04em; line-height: 1; color: var(--parchment); margin: 0 0 8px; }
.hero h1 em { display: block; font-style: italic; font-weight: 300; color: var(--sage); }
.hero-dates { font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; font-size: 1.1rem; color: var(--muted); margin-bottom: 20px; }
.hero-intro { font-size: 16px; line-height: 1.75; color: rgba(245,240,232,0.7); max-width: 520px; margin: 0 auto 24px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.btn-primary { display: inline-flex; align-items: center; background: var(--sage); color: var(--forest); font-family: 'Fraunces', serif; font-weight: 700; font-size: 15px; padding: 12px 24px; border-radius: 10px; text-decoration: none; border: none; }
.btn-ghost { display: inline-flex; align-items: center; border: 1px solid rgba(245,240,232,0.2); color: rgba(245,240,232,0.75); font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
.section { padding: 64px 24px; }
.section-inner { max-width: 800px; margin: 0 auto; }
.section-tag { font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 10px; display: block; }
.section-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: -0.03em; line-height: 1.05; color: var(--forest); margin: 0 0 14px; }
.section-headline :global(em) { font-style: italic; font-weight: 300; color: var(--moss); }
.section-body { font-size: 15px; line-height: 1.75; color: #555; max-width: 620px; }
.divider { border: none; border-top: 1px solid var(--parchment-dark); margin: 0; }
.phrases-section { background: var(--forest); padding: 64px 24px; }
.phrases-inner { max-width: 920px; margin: 0 auto; }
.phrases-tag { font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 10px; }
.phrases-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(1.6rem, 4vw, 2.6rem); letter-spacing: -0.03em; line-height: 1.05; color: var(--parchment); margin: 0 0 6px; }
.phrases-headline :global(em) { font-style: italic; font-weight: 300; color: var(--sage); }
.phrases-sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; max-width: 520px; line-height: 1.65; }
.phrases-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.phrase-tab { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(126,201,154,0.25); color: var(--muted); background: transparent; cursor: pointer; }
.phrase-tab.active { background: var(--moss); border-color: var(--moss); color: var(--parchment); }
.phrases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.phrase-card { text-align: left; background: rgba(255,255,255,0.04); border: 1px solid rgba(126,201,154,0.12); border-radius: 14px; padding: 18px; cursor: pointer; }
.phrase-irish { font-family: 'Fraunces', serif; font-weight: 700; font-size: 19px; letter-spacing: -0.02em; color: var(--parchment); margin-bottom: 4px; }
.phrase-english { font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 8px; }
.phrase-phonetic { font-size: 12px; color: rgba(126,201,154,0.6); font-style: italic; font-family: 'Fraunces', serif; font-weight: 300; }
.course-section { background: white; padding: 64px 24px; }
.course-inner { max-width: 800px; margin: 0 auto; }
.btn-course { margin-top: 16px; display: inline-flex; align-items: center; background: var(--forest); color: var(--parchment); padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; }
.biz-section { background: var(--parchment); padding: 64px 24px; }
.biz-inner { max-width: 920px; margin: 0 auto; }
.biz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }
.biz-card { background: white; border: 1px solid var(--parchment-dark); border-radius: 16px; padding: 24px 26px; }
.biz-card-num { font-family: 'Fraunces', serif; font-weight: 300; font-style: italic; font-size: 32px; color: var(--parchment-dark); line-height: 1; margin-bottom: 10px; }
.biz-card-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; color: var(--forest); margin: 0 0 8px; }
.biz-card-body { font-size: 13.5px; line-height: 1.7; color: #666; }
.signpost-section { background: var(--forest); padding: 80px 24px; text-align: center; }
.signpost-inner { max-width: 580px; margin: 0 auto; }
.signpost-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.04em; line-height: 1; color: var(--parchment); margin: 0 0 16px; }
.signpost-headline em { display: block; font-style: italic; font-weight: 300; color: var(--sage); }
.signpost-body { font-size: 15px; line-height: 1.75; color: var(--muted); margin-bottom: 32px; }
footer { background: var(--forest); border-top: 1px solid rgba(245,240,232,0.07); padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.footer-left { display: flex; align-items: center; gap: 10px; }
.footer-name { font-family: 'Fraunces', serif; font-weight: 900; font-size: 14px; color: var(--parchment); }
.footer-name em { font-style: italic; font-weight: 300; color: var(--sage); }
.footer-note { font-size: 11px; color: var(--muted); }
@media (max-width: 720px) {
  .nav-links .nav-link { display: none; }
  .biz-grid { grid-template-columns: 1fr; }
}
</style>
