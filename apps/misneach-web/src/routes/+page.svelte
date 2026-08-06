<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/analytics';

  function trackHomepageTasterCta() {
    trackEvent('Homepage: Taster CTA clicked');
  }

  function trackHomepageBusinessCta() {
    trackEvent('Homepage: Business CTA clicked');
  }

  onMount(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>Misneach — Irish, out loud</title>
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
    <a href="/how-it-works" class="nav-link">How it works</a>
    <details class="nav-dropdown">
      <summary class="nav-link">Info packs</summary>
      <div class="nav-dropdown-menu">
        <a href="/info-packs/seachtain-na-gaeilge">Seachtain na Gaeilge</a>
        <a href="/info-packs/fleadh-cheoil">Fleadh Cheoil</a>
      </div>
    </details>
    <a href="/for-businesses" class="nav-link" on:click={trackHomepageBusinessCta}>For businesses</a>
    <a href="/pricing" class="nav-link">Pricing</a>
    <a href="/me" class="nav-link nav-me">Me</a>
    <a href="/auth/login" class="nav-cta">Sign in</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <p class="hero-opening">You already have it.</p>
    <h1 class="hero-headline">
      Irish,
      <em>out loud.</em>
    </h1>
    <p class="hero-sub">
      Most people in Ireland have <strong>some Irish</strong>. The problem was never the language — it was never having anywhere to use it. That changes here.
    </p>
    <div class="hero-actions">
      <a href="/taster" class="btn-hero-primary" on:click={trackHomepageTasterCta}>Tosaigh — Get started</a>
      <a href="/how-it-works" class="btn-hero-ghost">
        See how it works
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    </div>
  </div>
  <div class="hero-scroll">
    <span>Scroll</span>
    <div class="scroll-line"></div>
  </div>
</section>

<section class="honest">
  <div class="honest-inner">
    <span class="section-tag reveal">Sound familiar?</span>
    <h2 class="honest-headline reveal reveal-delay-1">
      You're not bad<br>at Irish. You just<br>never had <em>anywhere to use it.</em>
    </h2>

    <div class="honest-statements">
      <div class="honest-statement reveal">
        <span class="statement-mark">—</span>
        <p class="statement-text">"I have Irish from school, but I haven't spoken it since my Leaving Cert."</p>
      </div>
      <div class="honest-statement reveal">
        <span class="statement-mark">—</span>
        <p class="statement-text">"I'd love to use it more but I don't know <em>where</em> or <em>how</em> to start."</p>
      </div>
      <div class="honest-statement reveal">
        <span class="statement-mark">—</span>
        <p class="statement-text">"I work in a café. I'd say the odd word if I thought people wouldn't think it was strange."</p>
      </div>
      <div class="honest-statement reveal">
        <span class="statement-mark">—</span>
        <p class="statement-text">"My Irish isn't <em>good enough</em> to use in real life."</p>
      </div>
    </div>

    <div class="honest-response reveal">
      <p class="honest-response-text">Your Irish is good enough. <em>Right now.</em></p>
      <p class="honest-response-sub">In Dundalk, a pop-up Irish conversation café started with no funding and no fixed venue — and within months was drawing people from three counties. One of the organisers had gone from no conversational Irish to running it in two months. Misneach starts with what you already have and puts it somewhere real.</p>
    </div>
  </div>
</section>

<section class="lesson-feel">
  <div class="lesson-feel-inner">
    <span class="section-tag reveal">What it feels like</span>
    <div class="split">
      <div class="split-text">
        <h3 class="reveal">A real conversation, <em>from day one.</em></h3>
        <p class="reveal reveal-delay-1">You don't start with grammar tables or vocabulary lists. You start with a full conversation — something that actually happens — and work through it line by line.</p>
        <p class="reveal reveal-delay-1">Every phrase has a pronunciation guide written in plain English. <strong>No special notation. No linguistics degree required.</strong> Just say it the way it looks.</p>
        <p class="reveal reveal-delay-1">By the end of your first lesson, you'll have the full shape of a real interaction. Not a fragment. Not a vocabulary word. A conversation.</p>
      </div>

      <div class="lesson-preview reveal reveal-delay-2">
        <div class="preview-header">
          <div class="preview-header-dot"></div>
          <div class="preview-header-dot"></div>
          <div class="preview-header-dot"></div>
          <span class="preview-header-title">Coffee Shop <em>Encounters</em></span>
        </div>
        <div class="preview-body">
          <div class="preview-convo">
            <div class="preview-line">
              <div class="preview-speaker">Barista</div>
              <div class="preview-bubble">
                <div class="preview-irish">Dia duit!</div>
                <div class="preview-pron">DEE-ah gwich</div>
                <div class="preview-eng">Hello!</div>
              </div>
            </div>
            <div class="preview-line" style="align-items:flex-end">
              <div class="preview-speaker" style="text-align:right;padding-right:2px">You</div>
              <div class="preview-bubble you">
                <div class="preview-irish">Dia is Muire duit.</div>
                <div class="preview-pron">DEE-ah iss MWIR-eh gwich</div>
                <div class="preview-eng">Hello back.</div>
              </div>
            </div>
            <div class="preview-line" style="align-items:flex-end">
              <div class="preview-bubble you">
                <div class="preview-irish">Cupán tae, le do thoil.</div>
                <div class="preview-pron">Kuh-PAWN teh, leh duh hull</div>
                <div class="preview-eng">A cup of tea, please.</div>
              </div>
            </div>
          </div>
          <div class="preview-note">
            <strong>Dia duit</strong> literally means "God to you" — but treat it exactly like hello. Your reply, <strong>Dia is Muire duit</strong>, adds Mary. In Irish, we return a greeting with a slightly fuller one. You'll get used to it fast.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="network">
  <div class="network-inner">
    <span class="section-tag reveal">Bigger than an app</span>
    <h2 class="network-headline reveal">Irish belongs <em>here.</em></h2>
    <p class="network-intro reveal">Misneach isn't just a course. It's a network of businesses where Irish is openly welcomed — and the people who work in them are ready for it.</p>

    <div class="network-cards">
      <div class="network-card reveal">
        <div class="network-card-num">01</div>
        <h3>You learn the phrases</h3>
        <p>Short, real, scenario-based lessons built around the actual conversations you'll have — in a café, a shop, a restaurant.</p>
      </div>
      <div class="network-card reveal reveal-delay-1">
        <div class="network-card-num">02</div>
        <h3>Businesses put up the sign</h3>
        <p>Participating shops and cafés display the <strong>Fáilte</strong> mark — so customers know Irish is welcome before anyone says a word.</p>
      </div>
      <div class="network-card reveal reveal-delay-2">
        <div class="network-card-num">03</div>
        <h3>Irish becomes normal</h3>
        <p>When it happens in public, in front of children, in everyday life — that's when a language stops being remarkable and starts being <strong>ordinary again.</strong></p>
      </div>
    </div>

    <div class="network-sticker-wrap reveal">
      <div class="network-sticker">
        <div class="ns-top">Gaeilge</div>
        <div class="ns-div"></div>
        <div class="ns-main">Fáil<em>te</em></div>
        <div class="ns-div"></div>
        <div class="ns-sub">Irish spoken here</div>
      </div>
      <div class="network-sticker-text">
        <h4>The Fáilte mark</h4>
        <p>Displayed in the windows of participating businesses across Ireland. A quiet signal that changes everything — customers know they can try, staff know they're supported.</p>
      </div>
    </div>

    <div class="network-proof reveal">
      <div class="proof-inner">
        <div class="proof-quote">An Nead, Monaghan — the vast majority of customers use some Irish when they visit.</div>
        <div class="proof-attr">RTÉ, 2026</div>
        <div class="proof-body">An Nead opened in Monaghan town and was flat out from the start. Local businesses nearby began to notice an increase in customers greeting them in Irish — a spillover nobody planned for. The sign on the door changed what happened on the street.</div>
      </div>
    </div>

    <div class="network-proof reveal" style="margin-top:12px">
      <div class="proof-inner">
        <div class="proof-quote">Aon Scéal, Tallaght — open since 2019, before any of the current cultural moment.</div>
        <div class="proof-attr">2022</div>
        <div class="proof-body">Even customers who don't speak Irish reported that it's simply nice to hear it used in a normal setting. The café manager described the absence of similar spaces across Ireland as the biggest obstacle for people who want to use their Irish but have nowhere to do it.</div>
      </div>
    </div>

  </div>
</section>

<section class="real-world">
  <div class="real-world-inner">
    <p class="real-world-quote">"You've just completed a full real-world interaction in Irish. Most people never get this far."</p>
    <p class="real-world-attribution">— End of your first lesson</p>

    <h2 class="real-world-headline">That's not <em>small.</em></h2>
    <p class="real-world-sub">Start with one phrase. One counter. One moment. That's all it takes to begin changing what Irish sounds like in this country.</p>
    <a href="/taster" class="btn-final" on:click={trackHomepageTasterCta}>Tosaigh — Start now</a>
    <a href="/how-it-works" class="how-it-works-link">Want to know more first? See how it works →</a>
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
    <a href="/for-businesses" class="footer-link" on:click={trackHomepageBusinessCta}>For businesses</a>
    <a href="/pricing" class="footer-link">Pricing</a>
    <a href="/auth/login" class="footer-link">Sign in</a>
  </div>
</footer>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --forest:    #1c2b22;
  --forest-mid:#2e4436;
  --parchment: #f5f0e8;
  --parchment-dark: #e8e0d0;
  --green:     #2d7a50;
  --sage:      #7ec99a;
  --muted:     #5a7a64;
  --ink:       #1a1a18;
  --paper:     #ffffff;
}

html { scroll-behavior: smooth; }

body {
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

.nav-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
}

.nav-name {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.03em;
  color: var(--forest);
  line-height: 1;
}

.nav-name em {
  font-style: italic;
  font-weight: 300;
  color: var(--green);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-dropdown { position: relative; }
.nav-dropdown summary { list-style: none; cursor: pointer; }
.nav-dropdown summary::-webkit-details-marker { display: none; }
.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 220px;
  border: 1px solid rgba(28, 43, 34, 0.12);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 30px -12px rgba(28, 43, 34, 0.35);
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

.hero {
  min-height: 100vh;
  background: var(--forest);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px 80px;
  position: relative;
  overflow: hidden;
  text-align: center;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.hero::after {
  content: '';
  position: absolute;
  top: 20%; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(45,122,80,0.22) 0%, transparent 65%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.hero-opening {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(15px, 2vw, 18px);
  color: var(--muted);
  letter-spacing: 0.03em;
  margin-bottom: 20px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.1s forwards;
}

.hero-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(52px, 9vw, 96px);
  letter-spacing: -0.04em;
  line-height: 0.92;
  color: var(--parchment);
  margin-bottom: 10px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.2s forwards;
}

.hero-headline em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
  display: block;
}

.hero-sub {
  font-size: clamp(15px, 2vw, 18px);
  line-height: 1.6;
  color: var(--muted);
  max-width: 480px;
  margin-top: 24px;
  margin-bottom: 40px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.35s forwards;
}

.hero-sub strong {
  color: var(--parchment);
  font-weight: 600;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.48s forwards;
}

.btn-hero-primary {
  background: var(--sage);
  color: var(--forest);
  border: none;
  border-radius: 12px;
  padding: 14px 28px;
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s, transform 0.1s;
}

.btn-hero-primary:hover {
  background: #8fd4a8;
  transform: translateY(-2px);
}

.btn-hero-ghost {
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: color 0.12s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-hero-ghost:hover { color: var(--parchment); }

.hero-scroll {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.8s forwards;
}

.hero-scroll span {
  font-size: 9.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--forest-mid);
  font-weight: 600;
}

.scroll-line {
  width: 1px;
  height: 32px;
  background: linear-gradient(to bottom, var(--forest-mid), transparent);
  animation: scrollPulse 2s ease-in-out infinite;
}

@keyframes scrollPulse {
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50%       { opacity: 1;   transform: scaleY(1.1); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.honest {
  background: var(--parchment);
  padding: 100px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.honest-inner {
  max-width: 680px;
  width: 100%;
}

.section-tag {
  font-size: 9.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 20px;
  display: block;
}

.honest-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--forest);
  margin-bottom: 32px;
}

.honest-headline em {
  font-style: italic;
  font-weight: 300;
  color: var(--green);
}

.honest-statements {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--parchment-dark);
}

.honest-statement {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 16px;
  padding: 22px 0;
  border-bottom: 1px solid var(--parchment-dark);
  align-items: start;
}

.statement-mark {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: 20px;
  color: var(--sage);
  line-height: 1.4;
  margin-top: 2px;
}

.statement-text {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: clamp(16px, 2.2vw, 20px);
  color: var(--forest);
  line-height: 1.45;
  letter-spacing: -0.01em;
}

.statement-text em {
  font-style: italic;
  font-weight: 300;
  color: var(--green);
}

.honest-response {
  margin-top: 48px;
  padding: 36px 40px;
  background: var(--forest);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.honest-response::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.honest-response-text {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: clamp(18px, 2.5vw, 24px);
  color: var(--parchment);
  letter-spacing: -0.02em;
  line-height: 1.35;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.honest-response-text em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.honest-response-sub {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

.lesson-feel {
  background: var(--paper);
  padding: 100px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lesson-feel-inner {
  max-width: 800px;
  width: 100%;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: start;
  margin-top: 48px;
}

.split-text h3 {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: -0.02em;
  color: var(--forest);
  line-height: 1.15;
  margin-bottom: 16px;
}

.split-text h3 em {
  font-style: italic;
  font-weight: 300;
  color: var(--green);
}

.split-text p {
  font-size: 15px;
  line-height: 1.72;
  color: #555;
  margin-bottom: 12px;
}

.split-text p strong {
  color: var(--ink);
  font-weight: 600;
}

.lesson-preview {
  background: var(--parchment);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(28,43,34,0.08), 0 20px 48px -16px rgba(28,43,34,0.12);
}

.preview-header {
  background: var(--forest);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-header-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--forest-mid);
}

.preview-header-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 12px;
  color: var(--parchment);
  letter-spacing: -0.01em;
}

.preview-header-title em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.preview-body {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-convo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-line {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-speaker {
  font-size: 8px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #aaa;
  font-weight: 600;
  padding-left: 2px;
}

.preview-bubble {
  background: var(--paper);
  border-radius: 10px 10px 10px 3px;
  padding: 9px 12px;
  border: 1px solid var(--parchment-dark);
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 88%;
}

.preview-bubble.you {
  border-radius: 10px 10px 3px 10px;
  background: var(--forest);
  border-color: transparent;
  align-self: flex-end;
}

.preview-irish {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 12px;
  color: var(--forest);
  letter-spacing: -0.01em;
}

.preview-bubble.you .preview-irish { color: var(--parchment); }

.preview-pron {
  font-size: 10px;
  color: var(--green);
  font-style: italic;
}

.preview-bubble.you .preview-pron { color: var(--sage); }

.preview-eng {
  font-size: 10px;
  color: #999;
}

.preview-bubble.you .preview-eng { color: #4a7a5a; }

.preview-note {
  background: rgba(45,122,80,0.08);
  border-left: 2px solid var(--sage);
  border-radius: 0 8px 8px 0;
  padding: 8px 12px;
  font-size: 11px;
  line-height: 1.55;
  color: #555;
}

.preview-note strong {
  color: var(--forest);
  font-weight: 600;
}

.network {
  background: var(--parchment-dark);
  padding: 100px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.network-inner {
  max-width: 800px;
  width: 100%;
}

.network-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--forest);
  margin-bottom: 16px;
}

.network-headline em {
  font-style: italic;
  font-weight: 300;
  color: var(--green);
}

.network-intro {
  font-size: 16px;
  line-height: 1.7;
  color: #666;
  max-width: 560px;
  margin-bottom: 56px;
}

.network-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2px;
  border-radius: 16px;
  overflow: hidden;
}

.network-card {
  background: var(--paper);
  padding: 36px 28px;
}

.network-card-num {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: 36px;
  color: var(--sage);
  line-height: 1;
  margin-bottom: 12px;
}

.network-card h3 {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 17px;
  color: var(--forest);
  letter-spacing: -0.01em;
  margin-bottom: 10px;
  line-height: 1.2;
}

.network-card p {
  font-size: 13.5px;
  line-height: 1.68;
  color: #666;
}

.network-card p strong { color: var(--ink); font-weight: 600; }

.network-proof {
  margin-top: 48px;
  border-top: 1px solid var(--parchment-dark);
  padding-top: 40px;
}

.proof-inner {
  background: white;
  border: 1px solid var(--parchment-dark);
  border-radius: 16px;
  padding: 28px 32px;
  max-width: 640px;
}

.proof-quote {
  font-family: 'Instrument Sans', sans-serif;
  font-style: normal;
  font-weight: 700;
  font-size: clamp(14px,1.6vw,16px);
  color: var(--forest);
  letter-spacing: 0;
  line-height: 1.5;
  margin-bottom: 4px;
}

.proof-attr {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.proof-body {
  font-size: 14px;
  color: #555;
  line-height: 1.75;
  border-top: 1px solid var(--parchment-dark);
  padding-top: 14px;
}

.network-sticker-wrap {
  margin-top: 48px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.network-sticker {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--forest);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 8px 24px -8px rgba(28,43,34,0.3);
}

.network-sticker::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1px dashed rgba(126,201,154,0.3);
}

.ns-top {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 7px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sage);
  z-index: 1;
}

.ns-main {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--parchment);
  line-height: 1;
  z-index: 1;
}

.ns-main em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.ns-div {
  width: 20px; height: 1px;
  background: rgba(126,201,154,0.3);
  margin: 3px 0;
  z-index: 1;
}

.ns-sub {
  font-size: 6px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(245,240,232,0.5);
  z-index: 1;
}

.network-sticker-text {
  flex: 1;
  min-width: 200px;
}

.network-sticker-text h4 {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 18px;
  color: var(--forest);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}

.network-sticker-text p {
  font-size: 13.5px;
  line-height: 1.65;
  color: #666;
}

.real-world {
  background: var(--forest);
  padding: 100px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.real-world::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.real-world::after {
  content: '';
  position: absolute;
  bottom: -100px; left: 50%;
  transform: translateX(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(45,122,80,0.2) 0%, transparent 65%);
  pointer-events: none;
}

.real-world-inner {
  position: relative;
  z-index: 1;
  max-width: 600px;
}

.real-world-quote {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(22px, 3.5vw, 36px);
  color: var(--parchment);
  line-height: 1.4;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.real-world-attribution {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 48px;
}

.real-world-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(28px, 4vw, 44px);
  letter-spacing: -0.03em;
  color: var(--parchment);
  line-height: 1.1;
  margin-bottom: 16px;
}

.real-world-headline em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.real-world-sub {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.65;
  margin-bottom: 40px;
}

.btn-final {
  background: var(--sage);
  color: var(--forest);
  border: none;
  border-radius: 14px;
  padding: 16px 36px;
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 0.12s, transform 0.1s;
}

.btn-final:hover {
  background: #8fd4a8;
  transform: translateY(-2px);
}

.how-it-works-link {
  display: block;
  margin-top: 16px;
  font-size: 13px;
  color: var(--forest-mid);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.12s;
}

.how-it-works-link:hover { color: var(--muted); }

footer {
  background: var(--forest);
  border-top: 1px solid var(--forest-mid);
  padding: 32px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-name {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: -0.02em;
  color: var(--parchment);
}

.footer-name em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.footer-tagline {
  font-size: 11px;
  color: var(--forest-mid);
  letter-spacing: 0.04em;
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-link {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.12s;
}

.footer-link:hover { color: var(--parchment); }

@media (max-width: 760px) {
  nav { padding: 0 20px; }
  .nav-links .nav-link:not(.nav-me) { display: none; }
  .split { grid-template-columns: 1fr; gap: 40px; }
  .network-cards { grid-template-columns: 1fr; }
  footer { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 480px) {
  .honest-response { padding: 24px 20px; }
}

.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal:global(.visible) {
  opacity: 1;
  transform: none;
}

.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
</style>
