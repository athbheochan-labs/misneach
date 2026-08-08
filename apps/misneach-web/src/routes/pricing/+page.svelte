<script>
  import { onMount } from 'svelte';
  import { MisButton, MisToggle } from '@decyphr/misneach-ui';
  import { trackEvent } from '$lib/analytics';
  import { launchConfig } from '$lib/launch-config';

  let isAnnual = false;
  let isSwitching = false;

  const spotsLeft = 67;
  const isEarlyAdopter = spotsLeft > 0;

  const monthlyPrice = isEarlyAdopter ? '4.99' : '6.99';
  const annualPrice = isEarlyAdopter ? '49' : '59';
  const annualEquivalent = isEarlyAdopter ? '4.08' : '4.92';
  const annualSub = isEarlyAdopter
    ? 'Early adopter rate · saves €10.88 vs monthly'
    : 'Saves €24.88 vs monthly';
  const annualSaveText = isEarlyAdopter ? 'Save 18%' : 'Save 30%';
  const billingOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annual', badge: annualSaveText }
  ];

  $: billingValue = isAnnual ? 'annual' : 'monthly';

  async function setBilling(nextAnnual) {
    if (isAnnual === nextAnnual || isSwitching) return;
    isSwitching = true;
    await new Promise((resolve) => setTimeout(resolve, 150));
    isAnnual = nextAnnual;
    isSwitching = false;
  }

  function handleBillingChange(nextValue) {
    void setBilling(nextValue === 'annual');
  }

  function trackIndividualPlanSelected() {
    trackEvent('Pricing: Individual plan selected');
  }

  function trackBusinessKitSelected() {
    trackEvent('Pricing: Business kit selected');
  }

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
  <title>Pricing — Misneach</title>
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
    <a href="/for-businesses" class="nav-link" on:click={trackBusinessKitSelected}>For businesses</a>
    <a href="/pricing" class="nav-link active">Pricing</a>
    <a href={launchConfig.accountLinksEnabled ? '/auth/login' : launchConfig.waitlistHref} class="nav-cta">
      {launchConfig.accountLinksEnabled ? 'Sign in' : launchConfig.waitlistLabel}
    </a>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <span class="hero-tag">Pricing</span>
    <h1 class="hero-headline">
      Simple.
      <em>As it should be.</em>
    </h1>
    <p class="hero-sub">One plan for people who just want to learn. One kit for businesses that want to go further. No hidden fees, no upsells.</p>
    <a class="hero-link" href="/taster" on:click={trackIndividualPlanSelected}>Not sure yet? Try a free lesson first →</a>
  </div>
</section>

<section class="plans-section">
  <div class="plans-inner">
    <div class="solo-plan-wrap">
      <div class="plan-card reveal">
        <div class="plan-header">
          <div class="plan-eyebrow">For learners</div>
          <div class="plan-name">Mise <em>féin</em></div>
          <div class="plan-tagline">Just you, the course, and the tools to practise.</div>
        </div>

        <div class="early-banner">
          <div class="early-banner-left">
            <span class="early-badge">Early adopter</span>
            <span class="early-text">First 100 subscribers lock in <strong>€4.99/month</strong> — yours for as long as you stay subscribed.</span>
          </div>
          <div class="early-spots">
            <span class="spots-num">{spotsLeft}</span>
            <span class="spots-label">spots left</span>
          </div>
        </div>

        <div class="billing-toggle-wrap">
          <MisToggle options={billingOptions} value={billingValue} onChange={handleBillingChange} className="billing-toggle" />
        </div>

        <div class="plan-price-wrap" class:switching={isSwitching}>
          {#if isAnnual}
            <div class="plan-price">€<em>{annualPrice}</em></div>
            <div class="plan-price-meta">
              <span class="plan-period">per year · €{annualEquivalent}/mo</span>
              <span class="plan-cancel">{annualSub}</span>
            </div>
          {:else}
            <div class="plan-price">€<em>{monthlyPrice}</em></div>
            <div class="plan-price-meta">
              <span class="plan-period">per month</span>
              <span class="plan-cancel">Cancel any time</span>
            </div>
          {/if}
        </div>

        <div class="plan-free-note">
          <strong>First unit is free.</strong> Start the Coffee Shop course before you pay a thing — no card required.
        </div>

        <div class="plan-includes">
          <div class="plan-includes-label">What's included</div>

          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>Full course access</strong> — all units, all lessons, all scenarios</div>
          </div>
          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>Flashcards</strong> — every phrase from the course, drillable any time</div>
          </div>
          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>Practice sessions</strong> — full conversation drills, repeat as often as you like</div>
          </div>
          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>Phrase tracking</strong> — the platform learns which phrases need more work</div>
          </div>
          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>Mistake corrector</strong> — explains what went wrong and why</div>
          </div>
          <div class="include-row">
            <div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="include-text"><strong>New courses</strong> as they launch — restaurant, retail, and more</div>
          </div>

        </div>

        <div class="plan-cta">
          <a href="/taster" class="btn-plan-primary" on:click={trackIndividualPlanSelected}>Bain triail as — Try a free lesson</a>
          <div class="plan-cta-note">No account needed · Try before you subscribe</div>
        </div>
      </div>

      <div class="biz-signpost reveal">
        <div class="biz-signpost-left">
          <div class="biz-signpost-heading">Own or manage a coffee shop?</div>
          <div class="biz-signpost-body">The business kit covers your whole team — plus the window sticker, staff badges, and customer phrase cards that make Irish visible in your space.</div>
        </div>
        <a href="/for-businesses" class="biz-signpost-link" on:click={trackBusinessKitSelected}>
          See the business kit
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="faq-inner">
    <span class="section-tag reveal">Questions</span>
    <h2 class="section-headline reveal">The ones people <em>usually ask.</em></h2>

    <div class="faq-list">
      <div class="faq-item reveal">
        <div class="faq-q">Can I cancel any time?</div>
        <div class="faq-a">Yes, for monthly subscribers — no notice period, no penalty. Annual subscribers are billed once for the year and can cancel renewal before the next billing date. If you've got what you needed and feel ready to use Irish on your own, that's exactly the outcome we're hoping for. You can always come back when a new course launches.</div>
      </div>

      <div class="faq-item reveal">
        <div class="faq-q">I work in a café that has the kit. Do I need to subscribe separately?</div>
        <div class="faq-a">No. The Fáilte Kit covers <strong>all staff</strong> at a participating business. If your employer has registered, your access is already there — ask them for the shared link.</div>
      </div>

      <div class="faq-item reveal">
        <div class="faq-q">What happens when new courses come out?</div>
        <div class="faq-a">Active subscribers and first-year kit holders get access to new courses automatically — restaurant, retail, and whatever comes after. No extra charge while your plan is active.</div>
      </div>

      <div class="faq-item reveal">
        <div class="faq-q">Is there a student or group discount?</div>
        <div class="faq-a">Not yet, but it's something we're thinking about — particularly for schools and community groups. If you have a specific situation in mind, <strong>get in touch</strong> and we'll see what we can do.</div>
      </div>

      <div class="faq-item reveal">
        <div class="faq-q">What does "first unit free" actually mean?</div>
        <div class="faq-a">The full first unit of the Coffee Shop Encounters course — all 12 lessons, the real-world challenge included — is free with no account required. You only need to create an account and subscribe to access the rest. We'd rather you try it first.</div>
      </div>
    </div>
  </div>
</section>

<section class="final-cta">
  <div class="final-inner">
    <h2 class="final-headline">
      Start with
      <em>one phrase.</em>
    </h2>
    <p class="final-sub">The first unit is free. No card, no account. Just open it and begin.</p>
    <a href="/taster" class="btn-final" on:click={trackIndividualPlanSelected}>Bain triail as — Try it free</a>
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
    <a href="/for-businesses" class="footer-link" on:click={trackBusinessKitSelected}>For businesses</a>
    <a href="/pricing" class="footer-link">Pricing</a>
    <a href={launchConfig.accountLinksEnabled ? '/auth/login' : launchConfig.waitlistHref} class="footer-link">
      {launchConfig.accountLinksEnabled ? 'Sign in' : launchConfig.waitlistLabel}
    </a>
  </div>
</footer>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --forest:        #1c2b22;
  --forest-mid:    #2e4436;
  --parchment:     #f5f0e8;
  --parchment-dark:#e8e0d0;
  --green:         #2d7a50;
  --sage:          #7ec99a;
  --muted:         #5a7a64;
  --ink:           #1a1a18;
  --paper:         #ffffff;
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
  background: rgba(245,240,232,0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(28,43,34,0.08);
}

.nav-brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }

.nav-name {
  font-family: 'Fraunces', serif;
  font-weight: 900; font-size: 18px;
  letter-spacing: -0.03em; color: var(--forest); line-height: 1;
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
  font-size: 13px; font-weight: 500;
  color: var(--muted); text-decoration: none; transition: color 0.12s;
}

.nav-link:hover { color: var(--forest); }
.nav-link.active { color: var(--forest); font-weight: 600; }

.nav-cta {
  background: var(--forest); color: var(--parchment);
  border: none; border-radius: 8px; padding: 8px 16px;
  font-family: 'Instrument Sans', sans-serif;
  font-weight: 600; font-size: 13px;
  cursor: pointer; text-decoration: none; transition: background 0.12s;
}

.nav-cta:hover { background: var(--green); }

.hero {
  background: var(--forest);
  padding: 120px 24px 80px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.hero::after {
  content: '';
  position: absolute; top: -60px; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 500px;
  background: radial-gradient(circle, rgba(45,122,80,0.2) 0%, transparent 65%);
  pointer-events: none;
}

.hero-inner {
  position: relative; z-index: 1;
  max-width: 600px; margin: 0 auto;
}

.hero-tag {
  font-size: 9.5px; letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--muted);
  font-weight: 700; margin-bottom: 16px; display: block;
}

.hero-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(38px, 6vw, 64px);
  letter-spacing: -0.04em; line-height: 1;
  color: var(--parchment); margin-bottom: 20px;
}

.hero-headline em {
  font-style: italic; font-weight: 300;
  color: var(--sage); display: block;
}

.hero-sub {
  font-size: 16px; line-height: 1.65;
  color: var(--muted); max-width: 440px; margin: 0 auto;
}

.hero-link {
  display: inline-block;
  margin-top: 18px;
  font-size: 13px;
  color: var(--sage);
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(126, 201, 154, 0.3);
  padding-bottom: 2px;
}

.plans-section {
  padding: 88px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.plans-inner {
  max-width: 560px;
  width: 100%;
}

.solo-plan-wrap {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.biz-signpost {
  background: var(--paper);
  border: 1.5px solid var(--parchment-dark);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.biz-signpost-heading {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 15px;
  color: var(--forest);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}

.biz-signpost-body {
  font-size: 13px;
  color: #888;
  line-height: 1.55;
  max-width: 320px;
}

.biz-signpost-link {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--forest);
  text-decoration: none;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1.5px solid var(--forest);
  border-radius: 8px;
  padding: 9px 16px;
  transition: all 0.12s;
  flex-shrink: 0;
}

.biz-signpost-link:hover {
  background: var(--forest);
  color: var(--parchment);
}

.early-banner {
  background: linear-gradient(135deg, #1c2b22 0%, #2e4436 100%);
  padding: 16px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
}

.early-banner::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events: none;
}

.early-banner-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative; z-index: 1;
}

.early-badge {
  display: inline-block;
  background: var(--sage);
  color: var(--forest);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  width: fit-content;
}

.early-text {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

.early-text strong { color: var(--sage); font-weight: 700; }

.early-spots {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative; z-index: 1;
  flex-shrink: 0;
}

.spots-num {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 32px;
  letter-spacing: -0.04em;
  color: var(--parchment);
  line-height: 1;
}

.spots-label {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}

.billing-toggle-wrap {
  padding: 16px 22px 0;
  display: flex;
  justify-content: center;
}

.plan-price-wrap {
  transition: opacity 0.15s;
}

.plan-price-wrap.switching { opacity: 0; }

.plan-card {
  border-radius: 20px;
  overflow: hidden;
  border: 1.5px solid var(--parchment-dark);
  background: var(--paper);
  position: relative;
  transition: transform 0.15s, box-shadow 0.15s;
}

.plan-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px -8px rgba(28,43,34,0.14);
}

.plan-header {
  padding: 28px 28px 24px;
  border-bottom: 1px solid var(--parchment-dark);
}

.plan-eyebrow {
  font-size: 9px; letter-spacing: 0.24em;
  text-transform: uppercase; font-weight: 700;
  color: #aaa; margin-bottom: 8px;
  position: relative; z-index: 1;
}

.plan-name {
  font-family: 'Fraunces', serif;
  font-weight: 900; font-size: 22px;
  letter-spacing: -0.02em; color: var(--forest);
  line-height: 1; margin-bottom: 4px;
  position: relative; z-index: 1;
}

.plan-name em { font-style: italic; font-weight: 300; color: var(--green); }

.plan-tagline {
  font-size: 13px; color: #888; line-height: 1.45;
  position: relative; z-index: 1;
}

.plan-price-wrap {
  padding: 24px 28px;
  border-bottom: 1px solid var(--parchment-dark);
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.plan-price {
  font-family: 'Fraunces', serif;
  font-weight: 900; font-size: 52px;
  letter-spacing: -0.04em; color: var(--forest);
  line-height: 1;
}

.plan-price em {
  font-style: italic; font-weight: 300;
  color: var(--green); font-size: 36px;
}

.plan-price-meta {
  display: flex; flex-direction: column;
  gap: 2px; padding-bottom: 6px;
}

.plan-period {
  font-size: 13px; color: #aaa; font-weight: 500;
}

.plan-cancel {
  font-size: 11px; color: #bbb;
  font-style: italic;
}

.plan-free-note {
  font-family: 'Fraunces', serif;
  font-style: italic; font-weight: 300;
  font-size: 18px; color: var(--muted);
  padding: 24px 28px;
  border-bottom: 1px solid var(--parchment-dark);
  line-height: 1.4;
}

.plan-free-note strong {
  color: var(--forest); font-style: normal; font-weight: 700;
}

.plan-includes {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-includes-label {
  font-size: 9px; letter-spacing: 0.22em;
  text-transform: uppercase; color: #bbb;
  font-weight: 700; margin-bottom: 6px;
}

.include-row {
  display: flex; align-items: flex-start;
  gap: 10px;
}

.include-check {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(45,122,80,0.08);
  border: 1px solid rgba(45,122,80,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}

.include-check svg { width: 9px; height: 9px; color: var(--green); }

.include-text {
  font-size: 13.5px; line-height: 1.5; color: #555;
}

.include-text strong { color: var(--ink); font-weight: 600; }

.plan-cta {
  padding: 20px 28px 28px;
}

.btn-plan-primary {
  width: 100%;
  background: var(--forest); color: var(--parchment);
  border: none; border-radius: 12px;
  padding: 14px 0;
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 16px;
  letter-spacing: -0.01em;
  cursor: pointer; text-decoration: none;
  display: block; text-align: center;
  transition: background 0.12s, transform 0.1s;
}

.btn-plan-primary:hover { background: var(--green); transform: translateY(-1px); }

.plan-cta-note {
  text-align: center; margin-top: 8px;
  font-size: 11px; color: #bbb;
  font-style: italic;
}

.faq-section {
  background: var(--parchment);
  padding: 88px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.faq-inner { max-width: 680px; width: 100%; }

.section-tag {
  font-size: 9.5px; letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--muted);
  font-weight: 700; margin-bottom: 14px; display: block;
}

.section-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(28px, 4vw, 44px);
  letter-spacing: -0.03em; line-height: 1.05;
  color: var(--forest); margin-bottom: 12px;
}

.section-headline em { font-style: italic; font-weight: 300; color: var(--green); }

.faq-list { border-top: 1px solid var(--parchment-dark); }

.faq-item {
  border-bottom: 1px solid var(--parchment-dark);
  padding: 22px 0;
}

.faq-q {
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 17px;
  color: var(--forest); letter-spacing: -0.01em;
  margin-bottom: 9px; line-height: 1.3;
}

.faq-a {
  font-size: 14px; line-height: 1.72;
  color: #555; max-width: 560px;
}

.faq-a strong { color: var(--ink); font-weight: 600; }

.final-cta {
  background: var(--forest);
  padding: 100px 24px;
  text-align: center;
  position: relative; overflow: hidden;
}

.final-cta::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}

.final-cta::after {
  content: '';
  position: absolute; bottom: -80px; left: 50%;
  transform: translateX(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(45,122,80,0.2) 0%, transparent 65%);
  pointer-events: none;
}

.final-inner {
  position: relative; z-index: 1;
  max-width: 520px; margin: 0 auto;
}

.final-headline {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -0.04em; line-height: 1;
  color: var(--parchment); margin-bottom: 16px;
}

.final-headline em {
  font-style: italic; font-weight: 300;
  color: var(--sage); display: block;
}

.final-sub {
  font-size: 15px; line-height: 1.65;
  color: var(--muted); margin-bottom: 36px;
}

.btn-final {
  background: var(--sage); color: var(--forest);
  border: none; border-radius: 14px;
  padding: 16px 36px;
  font-family: 'Fraunces', serif;
  font-weight: 700; font-size: 17px;
  letter-spacing: -0.01em;
  cursor: pointer; text-decoration: none;
  display: inline-block;
  transition: background 0.12s, transform 0.1s;
}

.btn-final:hover { background: #8fd4a8; transform: translateY(-2px); }

footer {
  background: var(--forest);
  border-top: 1px solid var(--forest-mid);
  padding: 32px 40px;
  display: flex; align-items: center;
  justify-content: space-between;
  flex-wrap: wrap; gap: 16px;
}

.footer-brand { display: flex; align-items: center; gap: 8px; }

.footer-name {
  font-family: 'Fraunces', serif;
  font-weight: 900; font-size: 15px;
  letter-spacing: -0.02em; color: var(--parchment);
}

.footer-name em { font-style: italic; font-weight: 300; color: var(--sage); }
.footer-tagline { font-size: 11px; color: var(--forest-mid); letter-spacing: 0.04em; }
.footer-links { display: flex; gap: 24px; }

.footer-link {
  font-size: 12px; color: var(--muted);
  text-decoration: none; font-weight: 500; transition: color 0.12s;
}

.footer-link:hover { color: var(--parchment); }

@media (max-width: 720px) {
  .biz-signpost { flex-direction: column; align-items: flex-start; }
  nav { padding: 0 20px; }
  .nav-links .nav-link { display: none; }
  footer { flex-direction: column; align-items: flex-start; }
}

.reveal {
  opacity: 0; transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

</style>
