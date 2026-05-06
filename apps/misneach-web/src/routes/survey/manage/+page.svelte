<script lang="ts">
  import { onMount } from 'svelte';

  type Question = {
    id: string;
    type: 'radio' | 'checkbox' | 'text';
    label: string;
    options?: string[];
    required: boolean;
  };

  type Template = {
    key: string;
    title: string;
    audience: 'staff' | 'customers';
    questions: Question[];
  };

  type Aggregate = {
    responseCount: number;
    questions: Record<string, { totalAnswers: number; optionCounts: Record<string, number> }>;
  };

  type CampaignPayload = {
    campaign: {
      businessName: string;
      town: string | null;
      createdAt: string;
      updatedAt: string;
    };
    links: {
      staffSurveyUrl: string;
      customersSurveyUrl: string;
      manageUrl: string;
    };
    results: {
      staff: Aggregate;
      customers: Aggregate;
    };
  };

  let token = '';
  let loading = true;
  let error = '';
  let data: CampaignPayload | null = null;
  let staffTemplate: Template | null = null;
  let customerTemplate: Template | null = null;
  let copiedKey: '' | 'staff' | 'customer' = '';

  function pluralise(n: number, word: string) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  function pct(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  function answerCount(aggregate: Aggregate, questionId: string) {
    return aggregate.questions?.[questionId]?.totalAnswers || 0;
  }

  function optionCount(aggregate: Aggregate, questionId: string, option: string) {
    return aggregate.questions?.[questionId]?.optionCounts?.[option] || 0;
  }

  function positivePct(template: Template | null, aggregate: Aggregate | null) {
    if (!template || !aggregate || template.questions.length === 0) return null;
    const question = template.questions.find((q) => q.type !== 'text' && (q.options?.length || 0) > 0);
    if (!question || !question.options?.length) return null;

    const total = answerCount(aggregate, question.id);
    if (!total) return null;

    const shortlist = question.options.slice(0, 2);
    const positive = shortlist.reduce((sum, option) => sum + optionCount(aggregate, question.id, option), 0);
    return pct(positive, total);
  }

  function overallAppetite() {
    if (!data) return null;
    const staff = positivePct(staffTemplate, data.results.staff);
    const customer = positivePct(customerTemplate, data.results.customers);
    if (staff == null && customer == null) return null;
    if (staff == null) return customer;
    if (customer == null) return staff;
    return Math.round((staff + customer) / 2);
  }

  function sentimentClass(index: number) {
    if (index <= 1) return 'positive';
    if (index >= 3) return 'negative';
    return 'neutral';
  }

  async function copyLink(key: 'staff' | 'customer', value: string) {
    await navigator.clipboard.writeText(value);
    copiedKey = key;
    setTimeout(() => {
      if (copiedKey === key) copiedKey = '';
    }, 1800);
  }

  async function load() {
    if (!token) {
      error = 'Missing manage token.';
      loading = false;
      return;
    }

    loading = true;
    error = '';

    try {
      const [campaignRes, templatesRes] = await Promise.all([
        fetch(`/api/surveys/campaigns/by-token/${encodeURIComponent(token)}`, { cache: 'no-store' }),
        fetch('/api/surveys/templates/public/appetite', { cache: 'no-store' }),
      ]);

      const campaignPayload = await campaignRes.json().catch(() => ({}));
      const templatesPayload = await templatesRes.json().catch(() => ({}));

      if (!campaignRes.ok) {
        throw new Error(campaignPayload?.message || campaignPayload?.error || 'Failed to load campaign');
      }

      data = campaignPayload;
      staffTemplate = templatesPayload?.staff || null;
      customerTemplate = templatesPayload?.customers || null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load campaign';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    token = params.get('t') || '';
    void load();
  });
</script>

<svelte:head>
  <title>Survey Results - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if loading}
  <main class="page"><div class="q-card">Loading survey results...</div></main>
{:else if error}
  <main class="page"><div class="q-card" style="color:#8c2b2b">{error}</div></main>
{:else if data}
  <nav>
    <div class="nav-brand">Misne<em>ach</em></div>
    <div class="nav-biz">Results for <strong>{data.campaign.businessName}</strong></div>
    <div class="nav-share">Private link</div>
  </nav>

  <div class="page">
    <div class="page-header">
      <div class="page-eyebrow">Appetite survey results</div>
      <h1 class="page-title">{data.campaign.businessName} - <em>what your people said</em></h1>
      <div class="page-meta">
        <div class="page-meta-item"><span>{pluralise(data.results.staff.responseCount, 'staff response')}</span></div>
        <div class="page-meta-item"><span>{pluralise(data.results.customers.responseCount, 'customer response')}</span></div>
        <div class="page-meta-item">Last response: {new Date(data.campaign.updatedAt).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-card highlight">
        <div class="sc-label">Staff responses</div>
        <div class="sc-num">{data.results.staff.responseCount}</div>
        <div class="sc-sub">from your staff appetite survey</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Customer responses</div>
        <div class="sc-num" style="color:var(--muted)">{data.results.customers.responseCount}</div>
        <div class="sc-sub">from your customer appetite survey</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Overall appetite</div>
        <div class="sc-num" style="color:var(--moss)">{overallAppetite() == null ? '—' : `${overallAppetite()}%`}</div>
        <div class="sc-sub">{overallAppetite() == null ? 'More responses needed' : 'positive signal across first indicators'}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-badge staff">Staff</div>
        <div class="section-title">How your team feels</div>
        <div class="section-count">{pluralise(data.results.staff.responseCount, 'response')}</div>
      </div>

      {#if data.results.staff.responseCount === 0 || !staffTemplate}
        <div class="q-card"><div class="no-data">No staff responses yet. Share the staff survey link with your team.</div></div>
      {:else}
        {#each staffTemplate.questions as question}
          <div class="q-card">
            <div class="q-card-title">{question.label}</div>
            {#if question.type === 'text'}
              <div class="no-data">Free-text responses are collected anonymously.</div>
            {:else}
              <div class="bar-list">
                {#each question.options || [] as option, idx}
                  {@const total = answerCount(data.results.staff, question.id)}
                  {@const count = optionCount(data.results.staff, question.id, option)}
                  {@const p = pct(count, total)}
                  <div class="bar-item">
                    <div class="bar-label">{option}</div>
                    <div class="bar-track">
                      <div class={`bar-fill ${sentimentClass(idx)}`} style={`width:${p}%`}>
                        {#if p > 8}<span class="bar-pct {idx >= 2 ? 'dark' : ''}">{p}%</span>{/if}
                      </div>
                    </div>
                    <div class="bar-n">{count}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-badge customer">Customers</div>
        <div class="section-title">What your customers think</div>
        <div class="section-count">{pluralise(data.results.customers.responseCount, 'response')}</div>
      </div>

      {#if data.results.customers.responseCount === 0 || !customerTemplate}
        <div class="q-card"><div class="no-data">No customer responses yet. Share the customer survey in your business and on social.</div></div>
      {:else}
        {#each customerTemplate.questions as question}
          <div class="q-card">
            <div class="q-card-title">{question.label}</div>
            {#if question.type === 'text'}
              <div class="no-data">Free-text responses are collected anonymously.</div>
            {:else}
              <div class="bar-list">
                {#each question.options || [] as option, idx}
                  {@const total = answerCount(data.results.customers, question.id)}
                  {@const count = optionCount(data.results.customers, question.id, option)}
                  {@const p = pct(count, total)}
                  <div class="bar-item">
                    <div class="bar-label">{option}</div>
                    <div class="bar-track">
                      <div class={`bar-fill ${sentimentClass(idx)}`} style={`width:${p}%`}>
                        {#if p > 8}<span class="bar-pct {idx >= 2 ? 'dark' : ''}">{p}%</span>{/if}
                      </div>
                    </div>
                    <div class="bar-n">{count}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="share-section">
      <div class="share-title">Keep collecting responses</div>
      <div class="share-sub">Bookmark this page. Share these links to collect more responses.</div>
      <div class="link-row">
        <div class="link-lbl">Staff</div>
        <div class="link-url">{data.links.staffSurveyUrl}</div>
        <button class="btn-copy" class:copied={copiedKey === 'staff'} on:click={() => copyLink('staff', data.links.staffSurveyUrl)}>{copiedKey === 'staff' ? 'Copied' : 'Copy'}</button>
      </div>
      <div class="link-row">
        <div class="link-lbl">Customer</div>
        <div class="link-url">{data.links.customersSurveyUrl}</div>
        <button class="btn-copy" class:copied={copiedKey === 'customer'} on:click={() => copyLink('customer', data.links.customersSurveyUrl)}>{copiedKey === 'customer' ? 'Copied' : 'Copy'}</button>
      </div>
      <a class="print-card-link" href={`/survey/print?c=${encodeURIComponent(data.campaign.id)}&aud=customers`}>
        <span>Print a counter card</span>
        <span class="print-card-sub">A4, A5, A6 and more -></span>
      </a>
    </div>

    <div class="upsell">
      <div class="upsell-text">
        <div class="upsell-headline">Ready to take the next step?</div>
        <div class="upsell-sub">Staff training, phrase cards, and a window sign are available in the full Misneach business package.</div>
      </div>
      <a href="/waitlist?interest=business_pack" class="btn-upsell">Set up your full account -></a>
    </div>
  </div>
{/if}

<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--forest:#1c2b22;--parchment:#f5f0e8;--parchment-dark:#e8e0d0;--moss:#2d7a50;--sage:#7ec99a;--muted:#5a7a64}
  :global(body){font-family:'Instrument Sans',sans-serif;background:var(--parchment);color:var(--forest);min-height:100vh}
  nav{background:var(--forest);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .nav-brand{font-family:'Fraunces',serif;font-weight:900;font-size:18px;color:var(--parchment);letter-spacing:-.02em;flex-shrink:0}
  .nav-brand em{font-style:italic;font-weight:300;color:var(--sage)}
  .nav-biz{font-size:13px;color:rgba(245,240,232,.5);flex:1;text-align:center}
  .nav-biz strong{color:rgba(245,240,232,.8)}
  .nav-share{font-size:12px;color:rgba(245,240,232,.4);flex-shrink:0}
  .page{max-width:960px;margin:0 auto;padding:48px 24px 80px}
  .page-header{margin-bottom:40px}
  .page-eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
  .page-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(28px,4vw,40px);letter-spacing:-.03em;line-height:1.05;margin-bottom:8px}
  .page-title em{font-style:italic;font-weight:300;color:var(--moss)}
  .page-meta{font-size:13px;color:#888;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:40px}
  .summary-card{background:white;border-radius:14px;border:1px solid var(--parchment-dark);padding:20px 22px}
  .summary-card.highlight{background:var(--forest);border-color:var(--forest)}
  .sc-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .highlight .sc-label{color:rgba(245,240,232,.5)}
  .sc-num{font-family:'Fraunces',serif;font-weight:900;font-size:36px;letter-spacing:-.03em;line-height:1;color:var(--forest);margin-bottom:4px}
  .highlight .sc-num{color:var(--sage)}
  .sc-sub{font-size:12px;color:#888;line-height:1.4}
  .highlight .sc-sub{color:rgba(245,240,232,.4)}
  .section{margin-bottom:48px}
  .section-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--parchment-dark)}
  .section-badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:4px 10px;border-radius:20px}
  .section-badge.staff{background:rgba(28,43,34,.08);color:var(--forest)}
  .section-badge.customer{background:rgba(45,122,80,.1);color:var(--moss)}
  .section-title{font-family:'Fraunces',serif;font-weight:700;font-size:20px;letter-spacing:-.02em;color:var(--forest)}
  .section-count{margin-left:auto;font-size:12px;color:#aaa;font-weight:600}
  .q-card{background:white;border-radius:14px;border:1px solid var(--parchment-dark);padding:22px 24px;margin-bottom:12px}
  .q-card-title{font-size:13.5px;font-weight:600;color:var(--forest);margin-bottom:16px;line-height:1.4}
  .bar-list{display:flex;flex-direction:column;gap:8px}
  .bar-item{display:flex;align-items:center;gap:10px}
  .bar-label{font-size:12.5px;color:#444;flex:0 0 260px;line-height:1.3}
  .bar-track{flex:1;height:28px;background:var(--parchment);border-radius:6px;overflow:hidden;position:relative}
  .bar-fill{height:100%;border-radius:6px;transition:width .6s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;padding-left:10px;min-width:2px}
  .bar-fill.positive{background:var(--sage)}
  .bar-fill.neutral{background:var(--parchment-dark)}
  .bar-fill.negative{background:#e8d5cc}
  .bar-pct{font-size:11.5px;font-weight:700;color:white;white-space:nowrap}
  .bar-pct.dark{color:var(--forest)}
  .bar-n{font-size:11px;color:#bbb;flex:0 0 28px;text-align:right}
  .no-data{text-align:center;padding:24px 20px;color:#bbb;font-size:13px}
  .share-section{background:white;border-radius:14px;border:1px solid var(--parchment-dark);padding:20px 24px;margin-top:40px}
  .share-title{font-family:'Fraunces',serif;font-weight:700;font-size:16px;letter-spacing:-.01em;margin-bottom:4px}
  .share-sub{font-size:13px;color:#888;margin-bottom:16px}
  .link-row{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--parchment);border-radius:7px;margin-bottom:6px;border:1px solid var(--parchment-dark)}
  .link-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);min-width:72px;flex-shrink:0}
  .link-url{font-size:11.5px;color:var(--moss);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Courier New',monospace}
  .btn-copy{font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:700;padding:4px 9px;border:1.5px solid var(--parchment-dark);border-radius:5px;background:white;color:var(--forest);cursor:pointer;flex-shrink:0}
  .btn-copy.copied{background:var(--sage);border-color:var(--sage);color:var(--forest)}
  .print-card-link{display:flex;align-items:center;gap:8px;margin-top:14px;padding:11px 14px;background:var(--forest);color:var(--parchment);border-radius:9px;text-decoration:none;font-size:13px;font-weight:700}
  .print-card-sub{margin-left:auto;font-size:11px;color:rgba(245,240,232,.55);font-weight:400}
  .upsell{background:var(--forest);border-radius:14px;padding:24px;margin-top:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
  .upsell-text{flex:1;min-width:200px}
  .upsell-headline{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--parchment);letter-spacing:-.01em;margin-bottom:4px}
  .upsell-sub{font-size:13px;color:rgba(245,240,232,.5);line-height:1.5}
  .btn-upsell{padding:11px 20px;background:var(--sage);color:var(--forest);font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:700;border:none;border-radius:8px;cursor:pointer;text-decoration:none;white-space:nowrap}
  @media(max-width:700px){
    .summary-row{grid-template-columns:1fr 1fr}
    .summary-row .summary-card:last-child{grid-column:span 2}
    .bar-label{flex:0 0 160px;font-size:11.5px}
    .section-title{font-size:17px}
  }
</style>
