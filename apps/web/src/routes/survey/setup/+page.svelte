<script lang="ts">
  import { onMount } from 'svelte';

  type SurveyQuestion = {
    id: string;
    type: 'radio' | 'checkbox' | 'text';
    label: string;
    options?: string[];
    required: boolean;
  };

  type SurveyTemplate = {
    key: string;
    title: string;
    audience: 'staff' | 'customers';
    questions: SurveyQuestion[];
  };

  type CampaignResult = {
    campaign: { id: string; businessName: string; town: string | null; createdAt: string };
    links: { staffSurveyUrl: string; customersSurveyUrl: string; manageUrl: string };
    qrCodes: {
      staff: { pngUrl: string; svgUrl: string };
      customers: { pngUrl: string; svgUrl: string };
    };
  };

  let businessName = '';
  let town = '';
  let email = '';
  let submitting = false;
  let error = '';
  let result: CampaignResult | null = null;
  let copiedKey: '' | 'staff' | 'customer' | 'manage' = '';
  let staffTemplate: SurveyTemplate | null = null;
  let customerTemplate: SurveyTemplate | null = null;

  $: trimmedName = businessName.trim();
  $: trimmedTown = town.trim();
  $: trimmedEmail = email.trim();
  $: nameReady = trimmedName.length > 0;
  $: emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  $: canActivate = nameReady && emailReady && !submitting;

  $: staffBiz = trimmedName || 'your business';
  $: customerBiz = trimmedName || 'this cafe';
  $: townBiz = trimmedTown || 'your town';
  $: campaignId = result?.campaign.id || '';
  $: printCardUrl = campaignId ? `/survey/print?c=${encodeURIComponent(campaignId)}&aud=customers` : '#';

  async function activateSurveys() {
    if (!canActivate) return;
    submitting = true;
    error = '';

    try {
      const response = await fetch('/api/surveys/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessName: trimmedName,
          town: trimmedTown || undefined,
          email: trimmedEmail,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Could not activate surveys');
      }

      result = payload as CampaignResult;
      const manageUrl = new URL(result.links.manageUrl);
      const token = manageUrl.searchParams.get('t');
      if (token) {
        const current = new URL(window.location.href);
        current.searchParams.set('t', token);
        window.history.replaceState(null, '', current.toString());
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not activate surveys';
    } finally {
      submitting = false;
    }
  }

  async function copyLink(key: 'staff' | 'customer' | 'manage', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      copiedKey = key;
      setTimeout(() => {
        if (copiedKey === key) copiedKey = '';
      }, 1800);
    } catch {
      copiedKey = '';
    }
  }

  function previewQuestions(template: SurveyTemplate | null) {
    if (!template) return [];
    return template.questions.filter((question) => question.type !== 'text');
  }

  onMount(async () => {
    const response = await fetch('/api/surveys/templates/public/appetite', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return;
    staffTemplate = payload.staff || null;
    customerTemplate = payload.customers || null;
  });
</script>

<svelte:head>
  <title>Surveys - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav>
  <div class="nav-brand">Misne<em>ach</em></div>
  <a href="/for-businesses" class="nav-back">For businesses</a>
</nav>

<div class="page">
  <div class="left">
    <div class="eyebrow">Free surveys</div>
    <h1 class="headline">Is your business <em>ready for Irish?</em></h1>
    <p class="body-text">
      Before committing to anything, find out what your staff and customers actually think. These
      surveys measure appetite - how open people already are to Irish being used in your business.
    </p>

    <div class="form-group">
      <label class="form-label" for="f-name">Business name</label>
      <input
        class="form-input"
        class:active={nameReady}
        id="f-name"
        type="text"
        maxlength="60"
        placeholder="e.g. Cafe na Cathrach"
        bind:value={businessName}
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="f-town">Town</label>
      <input
        class="form-input"
        id="f-town"
        type="text"
        maxlength="40"
        placeholder="e.g. Wexford"
        bind:value={town}
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="f-email">Your email</label>
      <input
        class="form-input"
        class:active={emailReady}
        id="f-email"
        type="email"
        placeholder="name@example.com"
        bind:value={email}
      />
      <span class="form-hint">We'll email your survey links so you can find them any time.</span>
    </div>

    <button class="btn-activate" disabled={!canActivate} on:click={activateSurveys}>
      {submitting ? 'Activating...' : 'Activate appetite surveys'}
    </button>
    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="wyg">
      <div class="wyg-title">What you get - free</div>
      <div class="wyg-item"><div class="wyg-dot"></div><div>A staff appetite survey</div></div>
      <div class="wyg-item"><div class="wyg-dot"></div><div>A customer appetite survey</div></div>
      <div class="wyg-item"><div class="wyg-dot"></div><div>Unique links and printable QR codes</div></div>
      <div class="wyg-item"><div class="wyg-dot"></div><div>A results page with no account</div></div>
    </div>

    <div class="next-steps">
      <div class="next-steps-title">How it fits together</div>
      <div class="next-step"><div class="step-num">1</div><div><strong>Run appetite surveys</strong> with staff and customers</div></div>
      <div class="next-step"><div class="step-num">2</div><div><strong>Try a small initiative</strong> that fits your business</div></div>
      <div class="next-step"><div class="step-num">3</div><div><strong>Run follow-up</strong> and compare attitude changes</div></div>
    </div>

    <div class="upsell" class:show={Boolean(result)}>
      <div class="upsell-text">
        Want staff training, phrase cards, and a window sign too? <strong>That's Misneach.</strong>
      </div>
      <a href="/waitlist?interest=business_pack" class="btn-upsell">Set up your full account -></a>
    </div>
  </div>

  <div class="right">
    <div class="survey-card">
      <div class="card-header">
        <div class="card-meta">
          <div class="badge staff">Staff - Appetite survey</div>
          <div class="card-title" class:empty={!nameReady}>
            {staffTemplate?.title || `How does your team at ${staffBiz} feel about Irish?`}
          </div>
          <div class="card-desc">Shared with staff before any initiative</div>
        </div>
        <div class="qr-wrap">
          {#if result}
            <div class="qr-real"><img src={result.qrCodes.staff.pngUrl} alt="Staff QR" /></div>
          {:else}
            <div class="qr-placeholder"><div class="qr-placeholder-label">QR code</div></div>
          {/if}
        </div>
      </div>

      <div class="questions">
        {#each previewQuestions(staffTemplate) as question}
          <div class="q">
            <div class="q-text">{question.label.replaceAll('your cafe', staffBiz).replaceAll('your business', staffBiz)}</div>
            {#if question.options?.length}
              {#if question.options.length <= 5}
                <div class="q-scale">
                  {#each question.options as _, idx}
                    <div class="q-scale-n">{idx + 1}</div>
                  {/each}
                </div>
              {:else}
                <div class="q-opts">
                  {#each question.options.slice(0, 5) as option}
                    <div class="q-opt"><div class="q-dot"></div>{option}</div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>

      <div class="card-footer">
        <div class="footer-brand">Misne<em>ach</em></div>
        <div class="footer-note">Responses are private to your business</div>
      </div>
    </div>

    <div class="survey-card">
      <div class="card-header">
        <div class="card-meta">
          <div class="badge customer">Customer - Appetite survey</div>
          <div class="card-title" class:empty={!nameReady}>
            {customerTemplate?.title || `Would you use Irish at ${customerBiz}?`}
          </div>
          <div class="card-desc">Share on counter, socials, or table cards</div>
        </div>
        <div class="qr-wrap">
          {#if result}
            <div class="qr-real"><img src={result.qrCodes.customers.pngUrl} alt="Customer QR" /></div>
          {:else}
            <div class="qr-placeholder"><div class="qr-placeholder-label">QR code</div></div>
          {/if}
        </div>
      </div>

      <div class="questions">
        {#each previewQuestions(customerTemplate) as question}
          <div class="q">
            <div class="q-text">{question.label.replaceAll('this cafe', customerBiz).replaceAll('your town', townBiz)}</div>
            {#if question.options?.length}
              <div class="q-opts">
                {#each question.options.slice(0, 5) as option}
                  <div class="q-opt"><div class="q-dot"></div>{option}</div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="card-footer">
        <div class="footer-brand">Misne<em>ach</em></div>
        <div class="footer-note">Anonymous responses</div>
      </div>
    </div>

    <div class="links-section" class:show={Boolean(result)}>
      <div class="links-title">Your appetite survey links</div>
      <div class="links-sub">Share these with staff and customers. Keep the results link.</div>

      <div class="link-row">
        <div class="link-lbl">Staff</div>
        <div class="link-url">{result?.links.staffSurveyUrl || 'misneach.ie/survey/staff/appetite?c=-'}</div>
        <button class="btn-copy" class:copied={copiedKey === 'staff'} on:click={() => result && copyLink('staff', result.links.staffSurveyUrl)}>{copiedKey === 'staff' ? 'Copied' : 'Copy'}</button>
      </div>

      <div class="link-row">
        <div class="link-lbl">Customer</div>
        <div class="link-url">{result?.links.customersSurveyUrl || 'misneach.ie/survey/customers/appetite?c=-'}</div>
        <button class="btn-copy" class:copied={copiedKey === 'customer'} on:click={() => result && copyLink('customer', result.links.customersSurveyUrl)}>{copiedKey === 'customer' ? 'Copied' : 'Copy'}</button>
      </div>

      <div class="link-row">
        <div class="link-lbl">Results</div>
        <div class="link-url">{result?.links.manageUrl || 'misneach.ie/survey/manage?t=-'}</div>
        <button class="btn-copy" class:copied={copiedKey === 'manage'} on:click={() => result && copyLink('manage', result.links.manageUrl)}>{copiedKey === 'manage' ? 'Copied' : 'Copy'}</button>
      </div>

      <div class="email-note">These links have been sent to your email.</div>
      <a class="print-card-link" href={printCardUrl}>
        <span>Print a counter card</span>
        <span class="print-card-sub">A4, A5, A6 and more -></span>
      </a>
    </div>
  </div>
</div>

<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :global(body){font-family:'Instrument Sans',sans-serif;background:var(--parchment);color:var(--forest);min-height:100vh}
  :root{
    --forest:#1c2b22;--parchment:#f5f0e8;--parchment-dark:#e8e0d0;
    --moss:#2d7a50;--sage:#7ec99a;--muted:#5a7a64;
  }
  nav{background:var(--forest);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .nav-brand{font-family:'Fraunces',serif;font-weight:900;font-size:18px;color:var(--parchment);letter-spacing:-.02em}
  .nav-brand em{font-style:italic;font-weight:300;color:var(--sage)}
  .nav-back{font-size:13px;color:rgba(245,240,232,.65);text-decoration:none}
  .page{max-width:1100px;margin:0 auto;padding:56px 24px 80px;display:grid;grid-template-columns:360px 1fr;gap:48px;align-items:start}
  .left{position:sticky;top:32px}
  .eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
  .headline{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(26px,3vw,36px);letter-spacing:-.03em;line-height:1.05;margin-bottom:14px}
  .headline em{font-style:italic;font-weight:300;color:var(--moss)}
  .body-text{font-size:14px;line-height:1.7;color:#555;margin-bottom:22px}
  .form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
  .form-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .form-input{font-family:'Instrument Sans',sans-serif;font-size:15px;padding:11px 14px;border:1.5px solid var(--parchment-dark);border-radius:10px;background:white;color:var(--forest);outline:none}
  .form-input.active{border-color:var(--sage)}
  .form-hint{font-size:12px;color:#888;margin-top:3px;line-height:1.4}
  .btn-activate{margin-top:6px;width:100%;padding:12px;border:none;border-radius:10px;background:var(--forest);color:var(--parchment);font-weight:700;cursor:pointer}
  .btn-activate:disabled{opacity:.35;cursor:not-allowed}
  .error{margin-top:8px;color:#912e2e;font-size:13px}

  .wyg{margin-top:24px;padding:18px;background:white;border-radius:12px;border:1px solid var(--parchment-dark)}
  .wyg-title{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
  .wyg-item{display:flex;align-items:flex-start;gap:9px;margin-bottom:8px;font-size:13px;color:#444;line-height:1.5}
  .wyg-dot{width:5px;height:5px;border-radius:50%;background:var(--sage);margin-top:6px;flex-shrink:0}

  .next-steps{margin-top:16px;padding:18px;background:var(--parchment-dark);border-radius:12px;border:1px solid #d5ccba}
  .next-steps-title{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
  .next-step{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:13px;color:#444;line-height:1.5}
  .step-num{width:20px;height:20px;border-radius:50%;background:var(--forest);color:var(--parchment);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

  .upsell{margin-top:20px;padding:18px;background:var(--forest);border-radius:12px;display:none}
  .upsell.show{display:block}
  .upsell-text{font-size:13px;color:rgba(245,240,232,.75);margin-bottom:12px;line-height:1.5}
  .upsell-text strong{color:var(--parchment)}
  .btn-upsell{display:block;width:100%;padding:11px;background:var(--sage);color:var(--forest);font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;text-align:center}

  .right{display:flex;flex-direction:column;gap:20px}
  .survey-card{background:white;border-radius:16px;border:1px solid var(--parchment-dark);overflow:hidden}
  .card-header{padding:18px 22px 16px;border-bottom:1px solid var(--parchment-dark);display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
  .card-meta{flex:1}
  .badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:20px;margin-bottom:7px}
  .badge.staff{background:rgba(28,43,34,.08);color:var(--forest)}
  .badge.customer{background:rgba(45,122,80,.1);color:var(--moss)}
  .card-title{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-.01em;line-height:1.25}
  .card-title .biz{color:var(--moss)}
  .card-title.empty .biz{color:#c5c5c5}
  .card-desc{font-size:12.5px;color:#888;margin-top:5px;line-height:1.5}

  .qr-wrap{width:68px;height:68px;flex-shrink:0}
  .qr-placeholder{width:68px;height:68px;border-radius:8px;background:var(--parchment);border:1.5px dashed var(--parchment-dark);display:flex;align-items:center;justify-content:center}
  .qr-placeholder-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#bbb}
  .qr-real{width:68px;height:68px;border-radius:8px;overflow:hidden;border:1.5px solid var(--parchment-dark)}
  .qr-real img{width:100%;height:100%;object-fit:cover;display:block}

  .questions{padding:18px 22px;display:flex;flex-direction:column;gap:14px}
  .q-text{font-size:13px;font-weight:600;color:var(--forest);margin-bottom:8px;line-height:1.35}
  .q-text .biz{color:var(--moss)}
  .q-opts{display:flex;flex-direction:column;gap:5px}
  .q-opt{display:flex;align-items:center;gap:9px;padding:7px 11px;border:1.5px solid var(--parchment-dark);border-radius:7px;font-size:12.5px;color:#666;background:var(--parchment)}
  .q-dot{width:13px;height:13px;border-radius:50%;border:1.5px solid #ccc;flex-shrink:0}
  .q-scale{display:flex;gap:5px}
  .q-scale-n{flex:1;aspect-ratio:1;border-radius:7px;background:var(--parchment);border:1.5px solid var(--parchment-dark);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#aaa}

  .card-footer{padding:12px 22px;border-top:1px solid var(--parchment-dark);display:flex;align-items:center;justify-content:space-between;background:var(--parchment)}
  .footer-brand{font-family:'Fraunces',serif;font-weight:700;font-size:12px;color:var(--muted);letter-spacing:-.01em}
  .footer-brand em{font-style:italic;font-weight:300;color:var(--sage)}
  .footer-note{font-size:11px;color:#8a8a8a}

  .links-section{background:white;border-radius:16px;border:1px solid var(--parchment-dark);padding:20px 22px;display:none}
  .links-section.show{display:block}
  .links-title{font-family:'Fraunces',serif;font-weight:700;font-size:16px;letter-spacing:-.01em;margin-bottom:3px}
  .links-sub{font-size:13px;color:#888;margin-bottom:14px}
  .link-row{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--parchment);border-radius:7px;margin-bottom:6px;border:1px solid var(--parchment-dark)}
  .link-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);min-width:72px;flex-shrink:0}
  .link-url{font-size:11.5px;color:var(--moss);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Courier New',monospace}
  .btn-copy{font-size:11px;font-weight:700;padding:4px 9px;border:1.5px solid var(--parchment-dark);border-radius:5px;background:white;color:var(--forest);cursor:pointer;flex-shrink:0}
  .btn-copy.copied{background:var(--sage);border-color:var(--sage)}
  .email-note{margin-top:12px;padding:10px 12px;background:rgba(126,201,154,.1);border:1px solid rgba(126,201,154,.3);border-radius:7px;font-size:12.5px;color:var(--moss)}
  .print-card-link{display:flex;align-items:center;gap:8px;margin-top:14px;padding:11px 14px;background:var(--forest);color:var(--parchment);border-radius:9px;text-decoration:none;font-size:13px;font-weight:700}
  .print-card-sub{margin-left:auto;font-size:11px;color:rgba(245,240,232,.55);font-weight:400}

  @media(max-width:800px){
    .page{grid-template-columns:1fr;padding:28px 16px 60px;gap:28px}
    .left{position:static}
  }
</style>
