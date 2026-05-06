<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/analytics';
  import { requestMagicLink } from '$lib/api/auth-client';

  type Plan = 'monthly' | 'annual';

  let step = 1;
  let email = '';
  let name = '';
  let emailError = '';
  let step1Error = '';
  let step1Loading = false;
  let magicSent = false;

  let plan: Plan = 'monthly';

  let promoInput = '';
  let promoResult = '';
  let promoResultType: 'success' | 'fail' | '' = '';
  let promoApplied = false;
  let promoCode = '';
  let promoDiscountCents = 0;

  let payLoading = false;
  let paymentError = '';

  const prices = {
    monthly: { label: 'Monthly plan', price: 4.99, display: '€4.99', period: '/month' },
    annual: { label: 'Annual plan', price: 49, display: '€49', period: '/year' }
  } as const;

  $: planData = prices[plan];
  $: baseCents = plan === 'monthly' ? 499 : 4900;
  $: totalCents = Math.max(0, baseCents - promoDiscountCents);
  $: totalDisplay =
    totalCents === 0
      ? plan === 'monthly'
        ? 'Free (first month)'
        : 'Free today'
      : `€${(totalCents / 100).toFixed(2).replace('.00', '')}`;
  $: firstName = (name.trim().split(/\s+/)[0] || 'a chara').replace(/\.+$/, '');

  function formatEuroFromCents(cents: number) {
    return `€${(Math.max(0, cents) / 100).toFixed(2).replace('.00', '')}`;
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > 4) return;
    step = nextStep;
    if (nextStep === 2) trackEvent('Signup: Plan step');
    if (nextStep === 3) trackEvent('Signup: Payment step');
    if (nextStep === 4) trackEvent('Signup: Completed');
  }

  onMount(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('payment') === 'cancelled') {
      step = 3;
      paymentError = 'Payment was cancelled. You can try again.';
      url.searchParams.delete('payment');
      history.replaceState({}, '', `${url.pathname}${url.search ? url.search : ''}`);
    }
  });

  async function submitStep1() {
    const nextEmail = email.trim().toLowerCase();
    emailError = '';
    step1Error = '';

    if (!isValidEmail(nextEmail)) {
      emailError = 'Please enter a valid email address';
      return;
    }

    step1Loading = true;

    try {
      const res = await requestMagicLink(nextEmail);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        step1Error = data?.error || "Couldn't send your magic link. Please try again.";
        return;
      }

      email = nextEmail;
      magicSent = true;
      await new Promise((resolve) => setTimeout(resolve, 900));
      goToStep(2);
    } catch {
      step1Error = "Couldn't reach the auth service. Please try again.";
    } finally {
      step1Loading = false;
    }
  }

  function selectPlan(nextPlan: Plan) {
    plan = nextPlan;
    if (promoApplied && promoCode) {
      void requotePromo(promoCode, true);
    }
  }

  async function requotePromo(code: string, silent = false) {
    const response = await apiFetch('/api/auth/signup/discount-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        plan
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.valid) {
      promoApplied = false;
      promoDiscountCents = 0;
      promoCode = '';
      if (!silent) {
        promoResultType = 'fail';
        promoResult = "That code isn't valid right now.";
      }
      return false;
    }

    promoApplied = true;
    promoCode = String(payload.promoCode || code).toUpperCase();
    promoInput = promoCode;
    promoDiscountCents = Number(payload.discountCents || 0);
    promoResultType = 'success';
    promoResult = `✓ ${promoCode} applied (${formatEuroFromCents(promoDiscountCents)} off)`;
    return true;
  }

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      promoResultType = 'fail';
      promoResult = 'Please enter a promo code';
      return;
    }

    try {
      await requotePromo(code);
    } catch {
      promoResultType = 'fail';
      promoResult = 'Unable to validate code right now.';
    }
  }

  async function submitPayment() {
    paymentError = '';

    if (!isValidEmail(email)) {
      paymentError = 'Please complete your email details first.';
      return;
    }

    payLoading = true;
    try {
      const res = await apiFetch('/api/auth/signup/payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          plan,
          promoCode: promoApplied ? promoCode : ''
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        paymentError = data?.error || 'Payment failed. Please try again.';
        return;
      }

      if (typeof data?.redirectUrl === 'string' && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }

      goToStep(4);
    } catch {
      paymentError = 'Could not reach payment service. Please try again.';
    } finally {
      payLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Cleachtadh - Get started</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="bg">
  <div class="bg-glow-a"></div>
  <div class="bg-glow-b"></div>
  <div class="bg-grain"></div>
</div>

<div class="shell">
  <div class="left">
    <div class="left-top">
      <a href="/" class="brand">
        <svg width="24" height="24" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <path d="M40 7 C19 7,9 19,9 34 C9 50,19 61,37 62 L30 73 L47 62 C63 60,71 50,71 34 C71 19,61 7,40 7Z" fill="#f5f0e8"></path>
          <path d="M33 46 C35.5 37,42 30,47 25" stroke="#1c2b22" stroke-width="5" stroke-linecap="round" fill="none"></path>
          <circle cx="33.5" cy="45" r="3" fill="#1c2b22"></circle>
        </svg>
        <span class="brand-name">Cleacht<em>adh</em></span>
      </a>

      {#if step === 1}
        <div>
          <h2 class="left-headline">Irish,<br /><em>out loud.</em></h2>
          <p class="left-sub">Your Irish is already in there. Cleachtadh gives you a place to use it every day through review, recall, and output.</p>
          <div class="proof-quote visible">
            <div class="pq-text">"Everybody that comes in uses their cupla focal."</div>
            <div class="pq-attr">Courtney Nic Uilis - An Nead, Monaghan</div>
          </div>
          <div class="proof-quote visible">
            <div class="pq-text">"I couldn't hold a conversation in Irish two months ago."</div>
            <div class="pq-attr">Aisling Ni Fhionnagain - Caife agus Comhra, Dundalk</div>
          </div>
        </div>
      {/if}

      {#if step === 2}
        <div>
          <div class="plan-badge">
            <div class="plan-badge-dot"></div>
            <span class="plan-badge-text">Early adopter offer</span>
          </div>
          <h2 class="left-headline">First <em>100 members.</em></h2>
          <p class="left-sub">You're joining before the pilot even launches. The early adopter rate locks in permanently - it won't change when pricing goes to €6.99.</p>
          <div class="proof-quote visible">
            <div class="pq-text">"Irish is becoming so trendy - but it's putting your money where your mouth is."</div>
            <div class="pq-attr">Aisling Ni Fhionnagain, Dundalk</div>
          </div>
        </div>
      {/if}

      {#if step === 3}
        <div>
          <h2 class="left-headline">Almost <em>there.</em></h2>
          <p class="left-sub">One step away from your first lesson. Your details are secure - we use Stripe for all payments and never store card details.</p>
          <div class="order-summary" style="margin-top:8px">
            <div class="order-row">
              <span class="order-row-label">Plan</span>
              <span class="order-row-val">{planData.label.replace(' plan', '')}</span>
            </div>
            <div class="order-row">
              <span class="order-row-label">Rate</span>
              <span class="order-row-val">{planData.display}{planData.period}</span>
            </div>
            {#if promoApplied}
              <div class="order-row">
                <span class="order-row-label">Promo</span>
                <span class="order-row-val discount">−{formatEuroFromCents(promoDiscountCents)}</span>
              </div>
            {/if}
            <div class="order-divider"></div>
            <div class="order-row order-total">
              <span class="order-row-label">Today</span>
              <span class="order-row-val">{totalDisplay}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="left-footer">
      Already have an account? <a href="/auth/login">Sign in -&gt;</a><br />
      Questions? <a href="mailto:hello@misneach.ie">hello@misneach.ie</a>
    </div>
  </div>

  <div class="right">
    {#if step < 4}
      <div>
        <div class="steps-indicator">
          <div class="step-dot" class:active={step === 1} class:done={step > 1}><span>1</span></div>
          <div class="step-line" class:done={step > 1}></div>
          <div class="step-dot" class:active={step === 2} class:done={step > 2}><span>2</span></div>
          <div class="step-line" class:done={step > 2}></div>
          <div class="step-dot" class:active={step === 3}><span>3</span></div>
        </div>
        <div class="step-labels">
          <span class="step-label" class:active={step === 1} class:done={step > 1}>Your details</span>
          <span class="step-label" class:active={step === 2} class:done={step > 2}>Choose a plan</span>
          <span class="step-label" class:active={step === 3}>Payment</span>
        </div>
      </div>
    {/if}

    {#if step === 1}
      <div class="panel active">
        <h2 class="panel-title">Tosaigh.<br /><em>Let's get started.</em></h2>
        <p class="panel-sub">Enter your email - we'll send you a magic link. No password to forget.</p>

        <div class="field">
          <label for="email-input">Email address</label>
          <input
            type="email"
            id="email-input"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
            class:error={Boolean(emailError)}
            on:keydown={(event) => {
              if (event.key === 'Enter') void submitStep1();
            }}
            on:input={() => {
              emailError = '';
              step1Error = '';
            }}
          />
          {#if emailError}<div class="field-error visible">{emailError}</div>{/if}
        </div>

        <div class="field">
          <label for="name-input">Your name <span class="helper">(optional - used in your dashboard)</span></label>
          <input type="text" id="name-input" bind:value={name} placeholder="First name or nickname" autocomplete="given-name" />
        </div>

        <div class="magic-sent" class:visible={magicSent}>
          <div class="magic-sent-icon">✉️</div>
          <div class="magic-sent-title">Check your inbox</div>
          <div class="magic-sent-body">We've sent a link to <span class="magic-sent-email">{email}</span>. Click it to continue - no password needed.</div>
        </div>

        {#if step1Error}<div class="promo-result fail">{step1Error}</div>{/if}

        <button class="cta-btn" class:loading={step1Loading} on:click={() => void submitStep1()} disabled={step1Loading}>
          <div class="btn-loading"></div>
          <span class="btn-label">Continue -&gt;</span>
        </button>

        <p class="terms-note">By continuing you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></p>

        <div class="back-link" style="margin-top:20px">
          <a href="/" style="color:rgba(245,240,232,0.3);text-decoration:none;font-size:13px">← Back to cleachtadh.misneach.site</a>
        </div>
      </div>
    {/if}

    {#if step === 2}
      <div class="panel active">
        <h2 class="panel-title">Choose your <em>plan.</em></h2>
        <p class="panel-sub">Early adopter rate - locked in permanently for the first 100 members. <strong style="color:rgba(245,240,232,0.7)">87 spots remaining.</strong></p>

        <div class="plan-opts">
          <label class="plan-opt" class:selected={plan === 'monthly'}>
            <input type="radio" name="plan" value="monthly" class="plan-opt-radio" checked={plan === 'monthly'} on:change={() => selectPlan('monthly')} />
            <div class="plan-opt-left">
              <div class="plan-opt-name">Monthly</div>
              <div class="plan-opt-desc">Cancel anytime · billed monthly</div>
            </div>
            <div>
              <div class="plan-opt-price">€4.99<span class="plan-opt-period">/mo</span></div>
            </div>
          </label>

          <label class="plan-opt" class:selected={plan === 'annual'}>
            <div class="plan-opt-badge">Best value</div>
            <input type="radio" name="plan" value="annual" class="plan-opt-radio" checked={plan === 'annual'} on:change={() => selectPlan('annual')} />
            <div class="plan-opt-left">
              <div class="plan-opt-name">Annual</div>
              <div class="plan-opt-desc">Two months free · billed yearly</div>
            </div>
            <div>
              <div class="plan-opt-price">€49<span class="plan-opt-period">/yr</span></div>
            </div>
          </label>
        </div>

        {#if plan === 'annual'}
          <div class="saving-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            You save €10.88 compared to monthly
          </div>
        {/if}

        <button class="cta-btn" on:click={() => goToStep(3)}>
          <span class="btn-label">Continue to payment -&gt;</span>
        </button>
        <button class="back-link" type="button" on:click={() => goToStep(1)}><span>← Back</span></button>
      </div>
    {/if}

    {#if step === 3}
      <div class="panel active">
        <h2 class="panel-title">Payment <em>details.</em></h2>
        <p class="panel-sub">You'll be redirected to Stripe's secure checkout to complete payment. We never store your card details.</p>

        <div class="card-icons">
          <div class="card-icon"><svg viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="3" fill="#1a1f71"></rect></svg></div>
          <div class="card-icon"><svg viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="3" fill="#252525"></rect></svg></div>
          <div class="card-icon"><svg viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="3" fill="#006FCF"></rect><text x="19" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="Arial">AMEX</text></svg></div>
        </div>

        <div class="promo-row">
          <div class="field">
            <label for="promo-input">Promo code <span class="helper">(optional)</span></label>
            <input id="promo-input" type="text" bind:value={promoInput} placeholder="MISNEACH2025" style="text-transform:uppercase" />
          </div>
          <button class="promo-apply" class:applied={promoApplied} on:click={applyPromo}>
            {promoApplied ? 'Reapply' : 'Apply'}
          </button>
        </div>
        {#if promoResult}
          <div class="promo-result {promoResultType}">{promoResult}</div>
        {/if}

        <div class="order-summary">
          <div class="order-row">
            <span class="order-row-label">{planData.label}</span>
            <span class="order-row-val">{planData.display}</span>
          </div>
          {#if promoApplied}
            <div class="order-row">
              <span class="order-row-label">Promo discount</span>
              <span class="order-row-val discount">−{formatEuroFromCents(promoDiscountCents)}</span>
            </div>
          {/if}
          <div class="order-divider"></div>
          <div class="order-row order-total">
            <span class="order-row-label">Total today</span>
            <span class="order-row-val">{totalDisplay}</span>
          </div>
        </div>

        <button class="cta-btn" class:loading={payLoading} id="btn-pay" on:click={() => void submitPayment()} disabled={payLoading}>
          <div class="btn-loading"></div>
          <span class="btn-label">Continue to secure payment -&gt;</span>
        </button>
        {#if paymentError}<div class="promo-result fail">{paymentError}</div>{/if}

        <div class="secure-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Secured by Stripe - 256-bit SSL encryption
        </div>

        <button class="back-link" type="button" on:click={() => goToStep(2)}><span>← Back</span></button>
      </div>
    {/if}

    {#if step === 4}
      <div class="panel active">
        <div class="success-wrap">
          <div class="success-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>

          <h2 class="success-title">Failte,<br /><em>{firstName}.</em></h2>
          <p class="success-sub">You're in. A confirmation has been sent to <strong style="color:var(--sage)">{email}</strong>. Your first lesson is waiting.</p>

          <div class="next-cards">
            <div class="next-card">
              <div class="next-card-num">01</div>
              <div class="next-card-body">
                <div class="next-card-title">Your dashboard is ready</div>
                <div class="next-card-desc">Track your progress, manage flashcards, set goals, and pick up where you left off.</div>
              </div>
            </div>
            <div class="next-card">
              <div class="next-card-num">02</div>
              <div class="next-card-body">
                <div class="next-card-title">Unit 1 - Coffee Shop Encounters</div>
                <div class="next-card-desc">A full real-world conversation from your first session. No grammar tables. No vocabulary lists. Just Irish.</div>
              </div>
            </div>
            <div class="next-card">
              <div class="next-card-num">03</div>
              <div class="next-card-body">
                <div class="next-card-title">Find a Failte cafe near you</div>
                <div class="next-card-desc">Your saved phrases are ready for review. Keep showing up and your cúpla focal will stay active.</div>
              </div>
            </div>
          </div>

          <a class="cta-btn" href="/dashboard">
            <span class="btn-label">Tosaigh - Go to my dashboard -&gt;</span>
          </a>

          <p class="terms-note" style="margin-top:16px">Receipt sent to <strong style="color:rgba(245,240,232,0.4)">{email}</strong></p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :global(html), :global(body) {
    min-height: 100%;
    font-family: 'Instrument Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    background: var(--forest);
    color: var(--parchment);
  }

  :global(:root) {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --forest-l: #3a5a44;
    --green: #2d7a50;
    --sage: #7ec99a;
    --sage-l: #c4e8d1;
    --parchment: #f5f0e8;
    --parch-dark: #e8e0d0;
    --parch-mid: #ede7da;
    --muted: #5a7a64;
    --ink: #1a1a18;
  }

  .bg { position: fixed; inset: 0; background: var(--forest); overflow: hidden; pointer-events: none; }
  .bg-glow-a { position: absolute; top: -200px; right: -100px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(ellipse, rgba(45,122,80,0.12) 0%, transparent 65%); }
  .bg-glow-b { position: absolute; bottom: -200px; left: -100px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(ellipse, rgba(126,201,154,0.06) 0%, transparent 65%); }
  .bg-grain {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
    opacity: 0.5;
  }

  .shell { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
  .left { padding: 48px 56px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid rgba(255,255,255,0.05); min-height: 100vh; }
  .brand { display: flex; align-items: center; gap: 9px; text-decoration: none; margin-bottom: 72px; }
  .brand-name { font-family: 'Fraunces', serif; font-weight: 900; font-size: 20px; letter-spacing: -0.04em; color: var(--parchment); }
  .brand-name em { font-style: italic; font-weight: 300; color: var(--sage); }
  .left-headline { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(32px,3.5vw,48px); letter-spacing: -0.04em; line-height: 1.05; color: var(--parchment); margin-bottom: 18px; }
  .left-headline em { font-style: italic; font-weight: 300; color: var(--sage); }
  .left-sub { font-size: 15px; color: rgba(245,240,232,0.45); line-height: 1.75; max-width: 360px; margin-bottom: 24px; }
  .proof-quote { border-left: 2px solid rgba(126,201,154,0.3); padding: 14px 20px; margin-bottom: 12px; opacity: 0; transition: opacity 0.4s ease; }
  .proof-quote.visible { opacity: 1; }
  .pq-text { font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; font-size: 15px; color: rgba(245,240,232,0.7); line-height: 1.5; margin-bottom: 5px; }
  .pq-attr { font-size: 11px; color: rgba(245,240,232,0.3); font-weight: 500; }
  .plan-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(126,201,154,0.1); border: 1px solid rgba(126,201,154,0.2); border-radius: 100px; padding: 8px 16px; margin-bottom: 16px; }
  .plan-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sage); animation: pulse 2s infinite; }
  .plan-badge-text { font-size: 12px; font-weight: 700; color: var(--sage); letter-spacing: 0.04em; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .left-footer { font-size: 12px; color: rgba(245,240,232,0.2); line-height: 1.6; }
  .left-footer a { color: rgba(245,240,232,0.35); text-decoration: none; }
  .right { padding: 48px 56px; display: flex; flex-direction: column; justify-content: center; min-height: 100vh; }

  .steps-indicator { display: flex; align-items: center; margin-bottom: 10px; }
  .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1.5px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.25); transition: all 0.3s ease; position: relative; }
  .step-dot.active { background: var(--green); border-color: var(--green); color: var(--parchment); box-shadow: 0 0 0 4px rgba(45,122,80,0.2); }
  .step-dot.done { background: rgba(45,122,80,0.2); border-color: rgba(45,122,80,0.4); color: var(--sage); }
  .step-dot.done::after { content: '✓'; font-size: 12px; }
  .step-dot.done span { display: none; }
  .step-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); transition: background 0.4s ease; }
  .step-line.done { background: rgba(45,122,80,0.3); }
  .step-labels { display: flex; justify-content: space-between; margin-top: 8px; margin-bottom: 40px; }
  .step-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.2); flex: 1; text-align: center; }
  .step-label:first-child { text-align: left; }
  .step-label:last-child { text-align: right; }
  .step-label.active { color: rgba(255,255,255,0.6); }
  .step-label.done { color: rgba(126,201,154,0.5); }

  .panel.active { display: block; animation: panelIn 0.35s cubic-bezier(0.4,0,0.2,1) both; }
  @keyframes panelIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  .panel-title { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(24px,2.5vw,32px); letter-spacing: -0.04em; color: var(--parchment); line-height: 1.1; margin-bottom: 6px; }
  .panel-title em { font-style: italic; font-weight: 300; color: var(--sage); }
  .panel-sub { font-size: 14px; color: rgba(245,240,232,0.4); line-height: 1.65; margin-bottom: 28px; }

  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,232,0.4); margin-bottom: 7px; }
  .helper { font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; color: rgba(245,240,232,0.2); }
  .field input { width: 100%; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 13px 16px; font-family: 'Instrument Sans', sans-serif; font-size: 15px; color: var(--parchment); outline: none; }
  .field input:focus { border-color: rgba(126,201,154,0.5); background: rgba(255,255,255,0.07); box-shadow: 0 0 0 3px rgba(45,122,80,0.15); }
  .field input.error { border-color: rgba(192,57,43,0.25); background: rgba(192,57,43,0.08); }
  .field-error { font-size: 12px; color: #e07070; margin-top: 5px; }

  .plan-opts { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .plan-opt { border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 18px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; position: relative; }
  .plan-opt.selected { border-color: var(--green); background: rgba(45,122,80,0.1); }
  .plan-opt-badge { position: absolute; top: 0; right: 0; background: var(--sage); color: var(--forest); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 10px; border-radius: 0 10px 0 8px; }
  .plan-opt-name { font-size: 14px; font-weight: 700; color: var(--parchment); }
  .plan-opt.selected .plan-opt-name { color: var(--sage); }
  .plan-opt-desc { font-size: 12px; color: rgba(245,240,232,0.35); }
  .plan-opt-price { font-family: 'Fraunces', serif; font-weight: 900; font-size: 22px; letter-spacing: -0.04em; color: var(--parchment); }
  .plan-opt.selected .plan-opt-price { color: var(--sage); }
  .plan-opt-period { font-size: 11px; color: rgba(245,240,232,0.3); font-weight: 400; font-family: 'Instrument Sans', sans-serif; }
  .plan-opt-radio { position: absolute; opacity: 0; pointer-events: none; }
  .saving-note { font-size: 12px; color: rgba(126,201,154,0.6); text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 6px; }

  .card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card-icons { display: flex; gap: 8px; margin-bottom: 16px; }
  .card-icon { width: 38px; height: 24px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; }

  .promo-row { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 6px; }
  .promo-row .field { flex: 1; margin-bottom: 0; }
  .promo-apply { padding: 13px 18px; border-radius: 10px; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.1); color: rgba(245,240,232,0.5); font-family: 'Instrument Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
  .promo-apply.applied { background: rgba(45,122,80,0.2); border-color: rgba(45,122,80,0.4); color: var(--sage); }
  .promo-result { font-size: 12px; margin: 8px 0 16px; }
  .promo-result.success { color: var(--sage); }
  .promo-result.fail { color: #e07070; }

  .order-summary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 18px; margin-bottom: 20px; }
  .order-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 4px 0; }
  .order-row-label { color: rgba(245,240,232,0.45); }
  .order-row-val { color: var(--parchment); font-weight: 600; }
  .order-row-val.discount { color: var(--sage); }
  .order-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 10px 0; }
  .order-total .order-row-label { font-size: 14px; font-weight: 700; color: var(--parchment); }
  .order-total .order-row-val { font-family: 'Fraunces', serif; font-weight: 900; font-size: 20px; letter-spacing: -0.03em; color: var(--sage); }

  .cta-btn { width: 100%; padding: 15px; border-radius: 12px; border: none; background: var(--green); font-family: 'Fraunces', serif; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; color: var(--parchment); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none; }
  .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-loading { display: none; width: 18px; height: 18px; border: 2px solid rgba(245,240,232,0.3); border-top-color: var(--parchment); border-radius: 50%; animation: spin 0.7s linear infinite; }
  .cta-btn.loading .btn-loading { display: block; }
  .cta-btn.loading .btn-label { opacity: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .secure-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(245,240,232,0.25); margin-top: 12px; }
  .secure-badge svg { width: 12px; height: 12px; color: rgba(126,201,154,0.4); }

  .back-link { text-align: center; margin-top: 14px; font-size: 13px; color: rgba(245,240,232,0.3); cursor: pointer; background: none; border: none; padding: 0; width: 100%; }
  .back-link span { text-decoration: underline; text-underline-offset: 2px; }

  .success-wrap { text-align: center; }
  .success-mark { width: 72px; height: 72px; border-radius: 50%; background: rgba(45,122,80,0.15); border: 2px solid rgba(45,122,80,0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 28px; }
  .success-mark svg { width: 32px; height: 32px; color: var(--sage); }
  .success-title { font-family: 'Fraunces', serif; font-weight: 900; font-size: 28px; letter-spacing: -0.04em; color: var(--parchment); margin-bottom: 8px; line-height: 1.1; }
  .success-title em { font-style: italic; font-weight: 300; color: var(--sage); }
  .success-sub { font-size: 14px; color: rgba(245,240,232,0.45); line-height: 1.7; max-width: 340px; margin: 0 auto 32px; }

  .next-cards { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; text-align: left; }
  .next-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; gap: 14px; }
  .next-card-num { font-family: 'Fraunces', serif; font-weight: 900; font-size: 18px; color: rgba(126,201,154,0.3); }
  .next-card-title { font-size: 13px; font-weight: 700; color: var(--parchment); margin-bottom: 2px; }
  .next-card-desc { font-size: 12px; color: rgba(245,240,232,0.35); line-height: 1.5; }

  .magic-sent { background: rgba(45,122,80,0.08); border: 1px solid rgba(45,122,80,0.2); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; display: none; }
  .magic-sent.visible { display: block; }
  .magic-sent-icon { font-size: 28px; margin-bottom: 10px; }
  .magic-sent-title { font-size: 15px; font-weight: 700; color: var(--parchment); margin-bottom: 4px; }
  .magic-sent-body { font-size: 13px; color: rgba(245,240,232,0.4); line-height: 1.6; }
  .magic-sent-email { color: var(--sage); font-weight: 600; }

  .terms-note { font-size: 11px; color: rgba(245,240,232,0.2); text-align: center; line-height: 1.6; margin-top: 12px; }
  .terms-note a { color: rgba(245,240,232,0.35); text-decoration: none; }

  @media (max-width: 800px) {
    .shell { grid-template-columns: 1fr; }
    .left { display: none; }
    .right { padding: 32px 24px; justify-content: flex-start; padding-top: 40px; }
  }
</style>
