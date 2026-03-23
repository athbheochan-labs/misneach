<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/analytics';
  import { MisButton, MisChipInput, MisInput } from '@decyphr/misneach-ui';

  type KitAsset = {
    key: string;
    label: string;
    description: string;
    href: string;
  };

  const BASE_PRICE_CENTS = 4900;
  const DRAFT_KEY = 'business_onboarding_draft_v1';

  type OnboardingDraft = {
    currentStep: number;
    businessName: string;
    businessTown: string;
    businessCounty: string;
    ownerName: string;
    ownerEmail: string;
    staffEmails: string[];
    promoInput: string;
    promoApplied: boolean;
    promoCode: string | null;
    totalCents: number;
  };

  let currentStep = 1;
  let saving = false;
  let paymentLoading = false;
  let ownerEmail = '';

  let businessName = '';
  let businessTown = '';
  let businessCounty = '';
  let ownerName = '';

  let staffEmails: string[] = [];

  let promoInput = '';
  let promoApplied = false;
  let promoCode: string | null = null;
  let promoError = '';

  let cardNumber = '';
  let cardExpiry = '';
  let cardCvc = '';
  let cardName = '';

  let fieldErrors: Record<string, string> = {};
  let globalError = '';

  let totalCents = BASE_PRICE_CENTS;
  let kitAssets: KitAsset[] = [];

  function loadDraft(): Partial<OnboardingDraft> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Partial<OnboardingDraft>;
    } catch {
      return {};
    }
  }

  function saveDraft() {
    if (typeof localStorage === 'undefined') return;
    const draft: OnboardingDraft = {
      currentStep,
      businessName,
      businessTown,
      businessCounty,
      ownerName,
      ownerEmail,
      staffEmails,
      promoInput,
      promoApplied,
      promoCode,
      totalCents,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function applyDraft(draft: Partial<OnboardingDraft>) {
    businessName = draft.businessName || businessName;
    businessTown = draft.businessTown || businessTown;
    businessCounty = draft.businessCounty || businessCounty;
    ownerName = draft.ownerName || ownerName;
    ownerEmail = draft.ownerEmail || ownerEmail;
    staffEmails = Array.isArray(draft.staffEmails) ? draft.staffEmails : staffEmails;
    promoInput = draft.promoInput || promoInput;
    promoApplied = typeof draft.promoApplied === 'boolean' ? draft.promoApplied : promoApplied;
    promoCode = draft.promoCode || promoCode;
    totalCents = typeof draft.totalCents === 'number' ? draft.totalCents : totalCents;
    if (typeof draft.currentStep === 'number') {
      currentStep = Math.min(Math.max(draft.currentStep, 1), 5);
    }
  }

  function euro(cents: number) {
    return `€${Math.round(cents / 100)}`;
  }

  $: topLabel = currentStep >= 1 && currentStep <= 4 ? `Step ${currentStep} of 4` : '';
  $: progressWidth = currentStep <= 4 ? `${currentStep * 25}%` : '100%';

  function clearFieldError(key: string) {
    delete fieldErrors[key];
  }

  function validateStep1() {
    fieldErrors = {};

    if (!businessName.trim()) fieldErrors.bizName = 'Please enter your business name.';
    if (!businessTown.trim()) fieldErrors.bizTown = 'Required.';
    if (!ownerName.trim()) fieldErrors.ownerName = 'Please enter your name.';
    if (!ownerEmail.trim() || !isValidEmail(ownerEmail)) {
      fieldErrors.ownerEmail = 'Please enter a valid email address.';
    }

    return Object.keys(fieldErrors).length === 0;
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function saveStep1() {
    const response = await fetch('/api/proxy/business/onboarding/details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessName,
        town: businessTown,
        county: businessCounty,
        ownerName,
        ownerEmail,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to save business details');
    }
  }

  async function saveStep2() {
    const response = await fetch('/api/proxy/business/onboarding/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffEmails,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to save staff');
    }
  }

  async function goTo(step: number) {
    globalError = '';

    try {
      saving = true;

      if (step > currentStep && currentStep === 1) {
        if (!validateStep1()) return;
        await saveStep1();
      }

      if (step > currentStep && currentStep === 2) {
        await saveStep2();
      }

      currentStep = step;
      if (step === 2) trackEvent('Business Onboarding: Staff step');
      if (step === 4) trackEvent('Business Onboarding: Kit step');
      if (step === 5) trackEvent('Business Onboarding: Completed');
      saveDraft();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      globalError = error instanceof Error ? error.message : 'Something went wrong.';
    } finally {
      saving = false;
    }
  }

  async function applyPromo() {
    promoError = '';
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    const response = await fetch('/api/proxy/business/onboarding/promo/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ promoCode: code }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.valid) {
      promoApplied = false;
      promoCode = null;
      totalCents = BASE_PRICE_CENTS;
      promoError = "That code isn't valid or has already been used.";
      saveDraft();
      return;
    }

    promoApplied = true;
    promoCode = payload.promoCode || code;
    totalCents = Number(payload.totalCents ?? 0);
    saveDraft();
  }

  function resetPromo() {
    promoApplied = false;
    promoCode = null;
    promoError = '';
    totalCents = BASE_PRICE_CENTS;
    saveDraft();
  }

  function formatCard(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }

  async function handlePayment() {
    globalError = '';
    paymentLoading = true;

    try {
      let paymentIntentId: string | undefined;

      if (!promoApplied || totalCents > 0) {
        if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim() || !cardName.trim()) {
          throw new Error('Please complete your card details.');
        }

        const intentResponse = await fetch('/api/proxy/business/onboarding/payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ promoCode }),
        });

        const intentPayload = await intentResponse.json().catch(() => ({}));
        if (!intentResponse.ok) {
          throw new Error(intentPayload?.error || 'Failed to initialize payment.');
        }

        if (intentPayload?.intent?.id) {
          paymentIntentId = intentPayload.intent.id;
        }
      }

      const activateResponse = await fetch('/api/proxy/business/onboarding/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          promoCode,
        }),
      });

      const activatePayload = await activateResponse.json().catch(() => ({}));
      if (!activateResponse.ok || !activatePayload?.activated) {
        throw new Error(activatePayload?.error || 'Activation failed.');
      }

      kitAssets = Array.isArray(activatePayload?.kitAssets) ? activatePayload.kitAssets : [];
      currentStep = 4;
      trackEvent('Business Onboarding: Kit step');
      saveDraft();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      globalError = error instanceof Error ? error.message : 'Payment failed.';
    } finally {
      paymentLoading = false;
    }
  }

  async function completeKitAndContinue() {
    trackEvent('Business Onboarding: Kit downloaded');
    await goTo(5);
  }

  async function preload() {
    try {
      const draft = loadDraft();
      applyDraft(draft);

      const onboardingResponse = await fetch('/api/proxy/business/onboarding', { cache: 'no-store' });

      if (onboardingResponse.ok) {
        const onboarding = await onboardingResponse.json();
        const onboardingState = onboarding?.onboarding;
        const pricing = onboarding?.pricing;
        const details = onboardingState?.details;
        businessName = details?.businessName || businessName;
        businessTown = details?.town || businessTown;
        businessCounty = details?.county || businessCounty;
        ownerName = details?.ownerName || ownerName;
        ownerEmail = details?.ownerEmail || ownerEmail;

        if (Array.isArray(onboardingState?.staffEmails)) {
          staffEmails = onboardingState.staffEmails;
        }

        if (typeof pricing?.totalCents === 'number') {
          totalCents = pricing.totalCents;
        }
        if (typeof pricing?.promoCode === 'string' && pricing.promoCode.length > 0) {
          promoCode = pricing.promoCode;
          promoInput = pricing.promoCode;
          promoApplied = Number(pricing?.discountPercent || 0) > 0;
        }

        if (typeof onboardingState?.step === 'number' || typeof draft.currentStep === 'number') {
          const backendStep =
            typeof onboardingState?.step === 'number'
              ? Math.min(Math.max(onboardingState.step, 1), 5)
              : 1;
          const draftStep =
            typeof draft.currentStep === 'number'
              ? Math.min(Math.max(draft.currentStep, 1), 5)
              : 1;
          currentStep = Math.max(backendStep, draftStep);
        }

        if (currentStep >= 4) {
          const assetsResponse = await fetch('/api/proxy/business/onboarding/kit-assets', {
            cache: 'no-store',
          });
          if (assetsResponse.ok) {
            const assetsPayload = await assetsResponse.json();
            kitAssets = Array.isArray(assetsPayload?.assets) ? assetsPayload.assets : [];
          }
        }

        saveDraft();
      }
    } catch (error) {
      globalError = error instanceof Error ? error.message : 'Failed to load onboarding data.';
    }
  }

  onMount(() => {
    trackEvent('Business Onboarding: Started');
    preload();
  });

  $: saveDraft();
</script>

<svelte:head>
  <title>Misneach - Set up your account</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="biz-page">
  <div class="top-bar">
    <a class="brand" href="/business">
      <div class="brand-word">Misne<em>ach</em></div>
    </a>
    <div class="top-step-label">{topLabel}</div>
  </div>
  <div class="progress-bar"><div class="progress-fill" style={`width: ${progressWidth}`}></div></div>

  <div class="page">
    {#if globalError}
      <div class="error-banner">{globalError}</div>
    {/if}

    {#if currentStep === 1}
      <div class="step active">
        <div class="step-head">
          <div class="step-eyebrow"><div class="step-num">1</div>Your business</div>
          <div class="step-title">Let's get <em>started.</em></div>
          <div class="step-sub">Tell us a little about the cafe. This is what staff and customers will see.</div>
        </div>

        <div class="field">
          <label for="biz-name">Cafe or business name</label>
          <MisInput id="biz-name" type="text" bind:value={businessName} oninput={() => clearFieldError('bizName')} />
          {#if fieldErrors.bizName}<div class="field-error show">{fieldErrors.bizName}</div>{/if}
        </div>

        <div class="field-row">
          <div class="field">
            <label for="biz-town">Town</label>
            <MisInput id="biz-town" type="text" bind:value={businessTown} oninput={() => clearFieldError('bizTown')} />
            {#if fieldErrors.bizTown}<div class="field-error show">{fieldErrors.bizTown}</div>{/if}
          </div>
          <div class="field">
            <label for="biz-county">County</label>
            <MisInput id="biz-county" type="text" bind:value={businessCounty} />
          </div>
        </div>

        <div class="field">
          <label for="owner-name">Your name</label>
          <MisInput id="owner-name" type="text" bind:value={ownerName} oninput={() => clearFieldError('ownerName')} />
          {#if fieldErrors.ownerName}<div class="field-error show">{fieldErrors.ownerName}</div>{/if}
        </div>

        <div class="field">
          <label for="owner-email">Your email</label>
          <MisInput
            id="owner-email"
            type="email"
            bind:value={ownerEmail}
            placeholder="you@business.com"
            oninput={() => clearFieldError('ownerEmail')}
          />
          {#if fieldErrors.ownerEmail}<div class="field-error show">{fieldErrors.ownerEmail}</div>{/if}
        </div>

        <MisButton variant="unstyled" size="none" className="btn-primary" disabled={saving} onclick={() => goTo(2)}>Continue</MisButton>
      </div>
    {/if}

    {#if currentStep === 2}
      <div class="step active">
        <div class="step-head">
          <div class="step-eyebrow"><div class="step-num">2</div>Your staff</div>
          <div class="step-title">Who's on <em>the team?</em></div>
          <div class="step-sub">Add staff email addresses. You can add more later.</div>
        </div>

        <div class="field">
          <label for="chip-input">Staff email addresses</label>
          <MisChipInput id="chip-input" bind:value={staffEmails} />
          {#if staffEmails.length > 0}
            <div class="staff-count">{staffEmails.length} staff member{staffEmails.length > 1 ? 's' : ''} added</div>
          {/if}
        </div>

        <MisButton variant="unstyled" size="none" className="btn-primary" disabled={saving} onclick={() => goTo(3)}>Continue</MisButton>
        <MisButton variant="unstyled" size="none" className="btn-back" onclick={() => goTo(1)}>Back</MisButton>
      </div>
    {/if}

    {#if currentStep === 3}
      <div class="step active">
        <div class="step-head">
          <div class="step-eyebrow"><div class="step-num">3</div>Payment</div>
          <div class="step-title">One price. <em>Everything included.</em></div>
          <div class="step-sub">A one-time fee. No subscription, no per-seat costs.</div>
        </div>

        <div class="payment-summary">
          <div class="ps-row"><span class="ps-label">Failte Business Kit</span><span class="ps-value">€49</span></div>
          <hr class="ps-divider" />
          <div class="ps-row">
            <span class="ps-total-label">Total today</span>
            <span class="ps-total-value">{euro(totalCents)}</span>
          </div>
          <div class="ps-note">{promoApplied ? 'Early adopter offer - account is free.' : "That's it. No subscription, no renewal."}</div>
        </div>

        <div class="promo-wrap">
          <label for="promo-input">Early adopter code</label>
          <div class="promo-row">
            <MisInput
              id="promo-input"
              type="text"
              bind:value={promoInput}
              oninput={() => {
                if (promoApplied) resetPromo();
                promoError = '';
              }}
              placeholder="Enter code"
            />
            <MisButton variant="unstyled" size="none" className="btn-apply" onclick={applyPromo}>Apply</MisButton>
          </div>
          {#if promoApplied}
            <div class="promo-feedback good">Early adopter code applied - your account is free.</div>
          {/if}
          {#if promoError}
            <div class="promo-feedback bad">{promoError}</div>
          {/if}
        </div>

        {#if !promoApplied || totalCents > 0}
          <div class="stripe-wrap">
            <div class="field">
              <div class="stripe-label">Card number</div>
              <MisInput
                className="stripe-input"
                variant="stripe"
                type="text"
                bind:value={cardNumber}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  cardNumber = formatCard(target.value);
                }}
              />
            </div>
            <div class="stripe-row">
              <div class="field">
                <div class="stripe-label">Expiry</div>
                <MisInput
                  className="stripe-input"
                  variant="stripe"
                  type="text"
                  bind:value={cardExpiry}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    cardExpiry = formatExpiry(target.value);
                  }}
                />
              </div>
              <div class="field">
                <div class="stripe-label">CVC</div>
                <MisInput className="stripe-input" variant="stripe" type="text" bind:value={cardCvc} maxlength={4} />
              </div>
            </div>
            <div class="field">
              <div class="stripe-label">Name on card</div>
              <MisInput className="stripe-input" variant="stripe" type="text" bind:value={cardName} />
            </div>
          </div>
        {:else}
          <div class="free-banner">Early adopter code active. No payment needed.</div>
        {/if}

        <MisButton variant="unstyled" size="none" className="btn-pay" disabled={paymentLoading} onclick={handlePayment}>
          {paymentLoading ? 'Activating...' : promoApplied ? 'Activate account' : `Pay ${euro(totalCents)} & activate`}
        </MisButton>
        <MisButton variant="unstyled" size="none" className="btn-back" onclick={() => goTo(2)}>Back</MisButton>
      </div>
    {/if}

    {#if currentStep === 4}
      <div class="step active">
        <div class="step-head">
          <div class="step-eyebrow"><div class="step-num done">✓</div>Your digital kit</div>
          <div class="step-title">Download your <em>kit.</em></div>
          <div class="step-sub">Staff welcome emails can now be sent from your business portal tools.</div>
        </div>

        <div class="kit-grid">
          {#each kitAssets as asset}
            <div class="kit-item">
              <div class="kit-info">
                <div class="kit-name">{asset.label}</div>
                <div class="kit-desc">{asset.description}</div>
              </div>
              <span class="btn-download btn-download-disabled" aria-disabled="true">Unavailable</span>
            </div>
          {/each}
        </div>

        <MisButton variant="unstyled" size="none" className="btn-primary" onclick={completeKitAndContinue}>Go to business portal</MisButton>
        <MisButton variant="unstyled" size="none" className="btn-back" onclick={() => goTo(3)}>Back</MisButton>
      </div>
    {/if}

    {#if currentStep === 5}
      <div class="step active done-wrap">
        <div class="done-title">You're <em>live.</em></div>
        <div class="done-sub">Your account is active and ready to manage staff and surveys.</div>
        <a class="btn-dashboard" href="/business">Go to business portal</a>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: 'Instrument Sans', sans-serif;
  }

  .biz-page {
    min-height: 100vh;
    background: #f5f0e8;
    color: #1a1a18;
  }

  .top-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(245, 240, 232, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(28, 43, 34, 0.08);
    padding: 0 24px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    text-decoration: none;
  }

  .brand-word {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  .brand-word em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }

  .top-step-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5a7a64;
  }

  .progress-bar {
    height: 3px;
    background: #e8e0d0;
    position: sticky;
    top: 56px;
    z-index: 19;
  }

  .progress-fill {
    height: 100%;
    background: #2d7a50;
    transition: width 0.35s ease;
  }

  .page {
    max-width: 560px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  .error-banner {
    margin-bottom: 16px;
    border: 1px solid rgba(192, 57, 43, 0.3);
    background: rgba(192, 57, 43, 0.08);
    color: #c0392b;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 13px;
  }

  .step {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .step-head {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .step-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    font-weight: 700;
    color: #5a7a64;
  }

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #1c2b22;
    color: #f5f0e8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }

  .step-num.done {
    background: #2d7a50;
  }

  .step-title {
    font-family: 'Fraunces', serif;
    font-size: clamp(26px, 5vw, 36px);
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #1c2b22;
    line-height: 1;
  }

  .step-title em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }

  .step-sub {
    font-size: 14px;
    color: #666;
    line-height: 1.65;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .field label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: #5a7a64;
  }

  .field-error {
    font-size: 12px;
    color: #c0392b;
  }

  .field-error.show {
    display: block;
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .staff-count {
    font-size: 12px;
    color: #5a7a64;
  }

  .payment-summary {
    background: #1c2b22;
    border-radius: 16px;
    color: #f5f0e8;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ps-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .ps-label {
    color: #7ec99a;
    font-size: 14px;
  }

  .ps-value {
    font-family: 'Fraunces', serif;
    font-size: 18px;
  }

  .ps-divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ps-total-label {
    font-size: 14px;
    font-weight: 700;
  }

  .ps-total-value {
    font-family: 'Fraunces', serif;
    font-size: 28px;
    font-weight: 900;
    color: #7ec99a;
  }

  .ps-note {
    font-size: 12px;
    color: #93b9a2;
  }

  .promo-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .promo-wrap label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: #5a7a64;
  }

  .promo-row {
    display: flex;
    gap: 10px;
  }

  .promo-row :global(.mis-input) {
    flex: 1;
  }

  :global(.btn-apply) {
    border: none;
    border-radius: 10px;
    padding: 0 18px;
    background: #1c2b22;
    color: #f5f0e8;
    font-family: 'Fraunces', serif;
    font-size: 14px;
    cursor: pointer;
  }

  .promo-feedback {
    font-size: 12px;
  }

  .promo-feedback.good {
    color: #2d7a50;
  }

  .promo-feedback.bad {
    color: #c0392b;
  }

  .stripe-wrap {
    border: 1.5px solid #e8e0d0;
    border-radius: 12px;
    background: #fff;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .stripe-row {
    display: grid;
    grid-template-columns: 1fr 100px;
    gap: 12px;
  }

  .stripe-label {
    font-size: 10.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: #999;
  }

  .free-banner {
    border-radius: 12px;
    padding: 16px;
    border: 1.5px solid rgba(45, 122, 80, 0.2);
    background: rgba(45, 122, 80, 0.08);
    color: #2d7a50;
    font-size: 14px;
  }

  :global(.btn-primary),
  :global(.btn-pay) {
    width: 100%;
    border: none;
    border-radius: 12px;
    padding: 16px 24px;
    cursor: pointer;
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 700;
  }

  :global(.btn-primary) {
    background: #1c2b22;
    color: #f5f0e8;
  }

  :global(.btn-pay) {
    background: #7ec99a;
    color: #1c2b22;
  }

  :global(.btn-back) {
    border: none;
    background: transparent;
    text-decoration: underline;
    cursor: pointer;
    color: #5a7a64;
    font-size: 13px;
  }

  .kit-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .kit-item {
    border: 1.5px solid #e8e0d0;
    border-radius: 12px;
    background: #fff;
    padding: 16px 20px;
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
  }

  .kit-name {
    color: #1c2b22;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 2px;
  }

  .kit-desc {
    color: #888;
    font-size: 12px;
  }

  .btn-download {
    border-radius: 8px;
    background: #1c2b22;
    color: #f5f0e8;
    text-decoration: none;
    padding: 8px 14px;
    font-size: 13px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
  }

  .btn-download-disabled {
    background: #cfcfcf;
    color: #666;
    cursor: not-allowed;
    text-decoration: none;
    pointer-events: none;
  }

  .done-wrap {
    text-align: center;
    align-items: center;
    padding: 20px 0;
  }

  .done-title {
    font-family: 'Fraunces', serif;
    font-size: clamp(28px, 5vw, 40px);
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  .done-title em {
    color: #2d7a50;
    font-style: italic;
    font-weight: 300;
  }

  .done-sub {
    color: #555;
    max-width: 420px;
  }

  .btn-dashboard {
    display: inline-flex;
    text-decoration: none;
    border-radius: 12px;
    background: #1c2b22;
    color: #f5f0e8;
    padding: 15px 32px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
  }

  @media (max-width: 480px) {
    .field-row,
    .stripe-row {
      grid-template-columns: 1fr;
    }
  }
</style>
