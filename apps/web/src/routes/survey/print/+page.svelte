<script lang="ts">
  import { browser } from '$app/environment';
  import { PUBLIC_SURVEY_QR_BASE_URL } from '$env/static/public';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';

  type Audience = 'customers' | 'staff';
  type FormatKey = 'a4p-dark' | 'a4p-light' | 'a4l' | 'a5' | 'a6l' | 'a6p' | 'bc' | 'strip';

  const FORMATS: Record<FormatKey, { name: string; dims: string }> = {
    'a4p-dark': { name: 'A4 Portrait · Dark', dims: '210 × 297mm' },
    'a4p-light': { name: 'A4 Portrait · Light', dims: '210 × 297mm' },
    a4l: { name: 'A4 Landscape', dims: '297 × 210mm' },
    a5: { name: 'A5 Portrait', dims: '148 × 210mm' },
    a6l: { name: 'A6 Landscape', dims: '148 × 105mm' },
    a6p: { name: 'A6 Portrait', dims: '105 × 148mm' },
    bc: { name: 'Business card', dims: '85 × 55mm' },
    strip: { name: 'Receipt strip', dims: '58mm wide' },
  };

  let campaignId = '';
  let audience: Audience = 'customers';
  let businessName = 'Your business';
  let selected: FormatKey | null = null;
  let printing: FormatKey | null = null;

  $: runtimeOrigin = browser ? window.location.origin : '';
  $: qrBaseUrl = (PUBLIC_SURVEY_QR_BASE_URL || runtimeOrigin).replace(/\/$/, '');
  $: surveyUrl =
    campaignId && qrBaseUrl
      ? `${qrBaseUrl}/survey/${audience}/appetite?c=${encodeURIComponent(campaignId)}`
      : '';
  $: qrSmall = surveyUrl
    ? `https://quickchart.io/qr?size=120&margin=1&format=png&text=${encodeURIComponent(surveyUrl)}`
    : '';
  $: qrLarge = surveyUrl
    ? `https://quickchart.io/qr?size=600&margin=1&format=png&text=${encodeURIComponent(surveyUrl)}`
    : '';

  $: selectedMeta = selected ? FORMATS[selected] : null;

  function select(fmt: FormatKey) {
    selected = fmt;
  }

  function deselect() {
    selected = null;
  }

  async function doPrint() {
    if (!selected) return;
    printing = selected;
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.print();
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    campaignId = params.get('c') || '';
    const aud = params.get('aud');
    if (aud === 'customers' || aud === 'staff') {
      audience = aud;
    }

    if (!campaignId) return;
    const response = await fetch(`/api/surveys/campaigns/${encodeURIComponent(campaignId)}/public`, {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload?.campaign?.businessName) {
      businessName = payload.campaign.businessName;
    }

    window.addEventListener('afterprint', () => {
      printing = null;
    });
  });
</script>

<svelte:head>
  <title>Print Survey Card - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav>
  <div class="nav-brand">Misne<em>ach</em></div>
  <a href="#" class="nav-back" on:click|preventDefault={() => history.back()}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="m12 5-7 7 7 7"></path></svg>
    Back to surveys
  </a>
</nav>

<div class="screen-page">
  <div class="page-eyebrow">Print a survey card</div>
  <h1 class="page-title">Choose your <em>format.</em></h1>
  <p class="page-sub">Pick a card size that suits where you're putting it - window, counter, table, or till. Click to select, then hit Print.</p>

  <div class="format-grid">
    <button class="format-card" class:selected={selected === 'a4p-dark'} on:click={() => select('a4p-dark')} id="fc-a4p-dark">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a4p">
          <div>
            <div class="prev-headline">Cad e do <em>bharuil?</em></div>
            <div class="prev-sub" style="margin-top:6px">Tell us how you feel about Irish being used here.</div>
          </div>
          <div class="prev-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
          <div class="prev-brand">Misne<em>ach</em></div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A4 Portrait · Dark</div>
        <div class="fc-desc">210 × 297mm · Best for windows and noticeboards</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'a4p-light'} on:click={() => select('a4p-light')} id="fc-a4p-light">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a4p light">
          <div>
            <div class="prev-headline dark">Cad e do <em>bharuil?</em></div>
            <div class="prev-sub dark" style="margin-top:6px">Tell us how you feel about Irish being used here.</div>
          </div>
          <div class="prev-qr" style="border:1px solid var(--parchment-dark)"><img class="qr-sm" src={qrSmall} alt=""></div>
          <div class="prev-brand dark">Misne<em>ach</em></div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A4 Portrait · Light</div>
        <div class="fc-desc">210 × 297mm · Print-friendly, lower ink usage</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'a4l'} on:click={() => select('a4l')} id="fc-a4l">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a4l">
          <div class="prev-a4l-left">
            <div>
              <div class="prev-a4l-hl">Cad e do <em>bharuil?</em></div>
              <div class="prev-a4l-body">We're thinking about using more Irish here - tell us what you think. Scan the QR code. Takes 2 minutes.</div>
            </div>
            <div class="prev-a4l-brand">Misne<em>ach</em></div>
          </div>
          <div class="prev-a4l-right">
            <div class="prev-a4l-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
            <div class="prev-scan">Scan</div>
          </div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A4 Landscape</div>
        <div class="fc-desc">297 × 210mm · Counter display or behind till</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'a5'} on:click={() => select('a5')} id="fc-a5">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a5">
          <div class="prev-a5-top">
            <div style="font-family:'Fraunces',serif;font-weight:700;font-size:7px;color:rgba(245,240,232,.4)">Misne<em style="font-style:italic;font-weight:300;color:var(--sage)">ach</em></div>
            <div class="prev-a5-hl">Cad e do <em>bharuil</em> faoi Ghaeilge anseo?</div>
          </div>
          <div class="prev-a5-bot">
            <div class="prev-a5-cta">Scan to share your view</div>
            <div class="prev-a5-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
            <div style="font-size:4.5px;color:#bbb">2 minutes · Anonymous</div>
          </div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A5 Portrait</div>
        <div class="fc-desc">148 × 210mm · Tent card or pinboard</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'a6l'} on:click={() => select('a6l')} id="fc-a6l">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a6">
          <div class="prev-a6-left">
            <div>
              <div class="prev-a6-hl">Cad e do <em>bharuil?</em></div>
              <div class="prev-a6-body">We're thinking about using more Irish here. Scan and tell us what you think. 2 minutes, anonymous.</div>
            </div>
            <div class="prev-a6-brand">Misne<em>ach</em></div>
          </div>
          <div class="prev-a6-right">
            <div class="prev-a6-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
            <div class="prev-scan" style="font-size:4px">Scan</div>
          </div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A6 Landscape</div>
        <div class="fc-desc">148 × 105mm · Small counter or table card</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'a6p'} on:click={() => select('a6p')} id="fc-a6p">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-a6p">
          <div class="prev-a6p-top">
            <div class="prev-a6p-brand">Misne<em>ach</em></div>
            <div class="prev-a6p-hl">Cad e do <em>bharuil</em> faoi Ghaeilge anseo?</div>
          </div>
          <div class="prev-a6p-bot">
            <div class="prev-a6p-body">Tell us what you think about Irish being used here. Scan below - 2 minutes, anonymous.</div>
            <div class="prev-a6p-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
            <div class="prev-a6p-cta">Scan to share your view</div>
          </div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">A6 Portrait</div>
        <div class="fc-desc">105 × 148mm · Menu insert or card holder</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'bc'} on:click={() => select('bc')} id="fc-bc">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-bc">
          <div class="prev-bc-left">
            <div>
              <div class="prev-bc-hl">Cad e do <em>bharuil?</em></div>
              <div class="prev-bc-sub">Tell us how you feel about Irish here - scan and share your view.</div>
            </div>
            <div class="prev-bc-brand">Misne<em>ach</em></div>
          </div>
          <div class="prev-bc-right">
            <div class="prev-bc-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
            <div class="prev-bc-scan">Scan me</div>
          </div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">Business card</div>
        <div class="fc-desc">85 × 55mm · Leave-behind or handout</div>
      </div>
    </button>

    <button class="format-card" class:selected={selected === 'strip'} on:click={() => select('strip')} id="fc-strip">
      <div class="fc-preview">
        <div class="fc-selected-badge">Selected</div>
        <div class="prev-strip">
          <div class="prev-strip-hl">Cad e do <em>bharuil</em> faoi Ghaeilge anseo?</div>
          <div class="prev-strip-rule"></div>
          <div class="prev-strip-qr"><img class="qr-sm" src={qrSmall} alt=""></div>
          <div style="font-size:4.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Scan · 2 mins</div>
          <div class="prev-strip-rule"></div>
          <div class="prev-strip-brand">Misne<em>ach</em></div>
        </div>
      </div>
      <div class="fc-info">
        <div class="fc-name">Receipt strip</div>
        <div class="fc-desc">58mm wide · Tape to counter or till area</div>
      </div>
    </button>
  </div>
</div>

<div class="print-bar" class:visible={Boolean(selected)}>
  <div class="print-bar-text">
    <strong>{selectedMeta?.name || '-'}</strong> selected
    <span style="color:#bbb;margin-left:8px;font-size:12px">{selectedMeta?.dims || ''}</span>
  </div>
  <button class="btn-print-ghost" on:click={deselect}>Cancel</button>
  <button class="btn-print" on:click={doPrint}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
    Print this card
  </button>
</div>

<!-- Print cards -->
<div class="print-card fmt-a4p" class:printing={printing === 'a4p-dark'} id="print-a4p-dark" style="background:#1c2b22;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:32mm 28mm 28mm">
  <div style="text-align:center">
    <div style="font-family:'Fraunces',serif;font-weight:900;font-size:36pt;color:#f5f0e8;letter-spacing:-.02em;line-height:1.05;margin-bottom:6mm">Cad e do <span style="font-style:italic;font-weight:300;color:#7ec99a">bharuil?</span></div>
    <div style="font-size:11pt;color:rgba(245,240,232,.4);max-width:120mm;margin:0 auto;line-height:1.6">Tell us how you feel about Irish being used here. Scan below - takes about two minutes and is completely anonymous.</div>
  </div>
  <img class="qr-print" src={qrLarge} style="width:60mm;height:60mm;display:block;background:white;border-radius:4mm;padding:3mm" alt="QR code">
  <div style="text-align:center">
    <div style="font-size:8pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(245,240,232,.25);margin-bottom:4mm">Scan to share your view</div>
    <div style="font-family:'Fraunces',serif;font-weight:700;font-size:12pt;color:rgba(245,240,232,.2)">{businessName}</div>
  </div>
</div>

<div class="print-card fmt-a4p light" class:printing={printing === 'a4p-light'} id="print-a4p-light" style="background:#f5f0e8;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:32mm 28mm 28mm">
  <div style="text-align:center">
    <div style="font-family:'Fraunces',serif;font-weight:900;font-size:36pt;color:#1c2b22;letter-spacing:-.02em;line-height:1.05;margin-bottom:6mm">Cad e do <span style="font-style:italic;font-weight:300;color:#2d7a50">bharuil?</span></div>
    <div style="font-size:11pt;color:#777;max-width:120mm;margin:0 auto;line-height:1.6">Tell us how you feel about Irish being used here. Scan below - takes about two minutes and is completely anonymous.</div>
  </div>
  <img class="qr-print" src={qrLarge} style="width:60mm;height:60mm;display:block;border:1px solid #e8e0d0;border-radius:4mm;padding:3mm;background:white" alt="QR code">
  <div style="text-align:center">
    <div style="font-size:8pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#bbb;margin-bottom:4mm">Scan to share your view</div>
    <div style="font-family:'Fraunces',serif;font-weight:700;font-size:12pt;color:#bbb">{businessName}</div>
  </div>
</div>

<div class="print-card fmt-a4l" class:printing={printing === 'a4l'} id="print-a4l">
  <div style="padding:18mm 14mm;display:flex;flex-direction:column;justify-content:space-between">
    <div>
      <div style="font-family:'Fraunces',serif;font-weight:900;font-size:34pt;color:#1c2b22;line-height:1.02">Cad e do <span style="font-style:italic;font-weight:300;color:#2d7a50">bharuil?</span></div>
      <div style="font-size:12pt;color:#666;max-width:150mm;line-height:1.6;margin-top:6mm">We're thinking about using more Irish here. Tell us what you think by scanning the QR code. Two minutes, anonymous.</div>
    </div>
    <div style="font-family:'Fraunces',serif;font-size:14pt;color:#5a7a64">{businessName}</div>
  </div>
  <div style="background:#1c2b22;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;padding:8mm">
    <img class="qr-print" src={qrLarge} style="width:66mm;height:66mm;background:#fff;border-radius:3mm;padding:3mm" alt="QR code">
    <div style="font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:rgba(245,240,232,.45)">Scan</div>
  </div>
</div>

<div class="print-card fmt-a5" class:printing={printing === 'a5'} id="print-a5">
  <div style="background:#1c2b22;flex:1;padding:12mm 10mm;display:flex;flex-direction:column;justify-content:space-between">
    <div style="font-family:'Fraunces',serif;font-weight:700;font-size:11pt;color:rgba(245,240,232,.35)">Misne<em style="font-style:italic;font-weight:300;color:#7ec99a">ach</em></div>
    <div style="font-family:'Fraunces',serif;font-weight:900;font-size:26pt;color:#f5f0e8;line-height:1.05">Cad e do <span style="font-style:italic;font-weight:300;color:#7ec99a">bharuil</span> faoi Ghaeilge anseo?</div>
  </div>
  <div style="background:#f5f0e8;padding:12mm;display:flex;flex-direction:column;align-items:center;gap:4mm">
    <div style="font-size:8pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5a7a64">Scan to share your view</div>
    <img class="qr-print" src={qrLarge} style="width:52mm;height:52mm;background:white;border-radius:3mm;padding:2.5mm;border:1px solid #e8e0d0" alt="QR code">
    <div style="font-size:7pt;color:#8b8b8b">2 minutes · Anonymous</div>
  </div>
</div>

<div class="print-card fmt-a6l" class:printing={printing === 'a6l'} id="print-a6l">
  <div style="padding:8mm 7mm;display:flex;flex-direction:column;justify-content:space-between">
    <div>
      <div style="font-family:'Fraunces',serif;font-weight:900;font-size:16pt;color:#1c2b22;line-height:1.02">Cad e do <span style="font-style:italic;font-weight:300;color:#2d7a50">bharuil?</span></div>
      <div style="font-size:7pt;color:#777;line-height:1.5;margin-top:2mm">We're thinking about using more Irish here. Scan and tell us what you think.</div>
    </div>
    <div style="font-family:'Fraunces',serif;font-size:8pt;color:#5a7a64">{businessName}</div>
  </div>
  <div style="background:#1c2b22;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;padding:4mm">
    <img class="qr-print" src={qrLarge} style="width:34mm;height:34mm;background:white;border-radius:2mm;padding:1.5mm" alt="QR code">
    <div style="font-size:5pt;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,232,.45)">Scan</div>
  </div>
</div>

<div class="print-card fmt-a6p" class:printing={printing === 'a6p'} id="print-a6p">
  <div style="background:#1c2b22;padding:10mm 8mm;flex:0 0 58mm;display:flex;flex-direction:column;justify-content:space-between">
    <div style="font-family:'Fraunces',serif;font-weight:700;font-size:9pt;color:rgba(245,240,232,.25)">{businessName}</div>
    <div style="font-family:'Fraunces',serif;font-weight:900;font-size:22pt;color:#f5f0e8;letter-spacing:-.02em;line-height:1.05">Cad e do <span style="font-style:italic;font-weight:300;color:#7ec99a">bharuil</span> faoi Ghaeilge anseo?</div>
  </div>
  <div style="background:#f5f0e8;flex:1;padding:8mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between">
    <div style="font-size:9pt;color:#666;line-height:1.6;text-align:center;max-width:70mm">Tell us what you think about Irish being used here. Scan below - takes two minutes and is anonymous.</div>
    <img class="qr-print" src={qrLarge} style="width:50mm;height:50mm;display:block;background:white;border-radius:3mm;padding:2mm;border:1px solid #e8e0d0" alt="QR code">
    <div style="font-size:7pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aaa">Scan to share your view</div>
  </div>
</div>

<div class="print-card fmt-bc" class:printing={printing === 'bc'} id="print-bc">
  <div style="padding:4mm;display:flex;flex-direction:column;justify-content:space-between">
    <div style="font-family:'Fraunces',serif;font-weight:900;font-size:9pt;color:#f5f0e8;line-height:1.1">Cad e do <span style="font-style:italic;font-weight:300;color:#7ec99a">bharuil?</span></div>
    <div style="font-size:5pt;color:rgba(245,240,232,.45);line-height:1.4">Tell us how you feel about Irish here.</div>
    <div style="font-size:5pt;color:rgba(245,240,232,.3)">{businessName}</div>
  </div>
  <div style="background:rgba(255,255,255,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;padding:3mm">
    <img class="qr-print" src={qrLarge} style="width:23mm;height:23mm;background:white;border-radius:1.5mm;padding:1mm" alt="QR code">
    <div style="font-size:4pt;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,240,232,.4)">Scan</div>
  </div>
</div>

<div class="print-card fmt-strip" class:printing={printing === 'strip'} id="print-strip">
  <div style="font-family:'Fraunces',serif;font-weight:900;font-size:10pt;color:#1c2b22;text-align:center;line-height:1.2">Cad e do <span style="font-style:italic;font-weight:300;color:#2d7a50">bharuil</span> faoi Ghaeilge anseo?</div>
  <div style="width:100%;height:0.3mm;background:#e8e0d0"></div>
  <img class="qr-print" src={qrLarge} style="width:36mm;height:36mm;background:#f5f0e8;border-radius:2mm;padding:1.6mm" alt="QR code">
  <div style="font-size:6pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5a7a64">Scan · 2 mins</div>
  <div style="width:100%;height:0.3mm;background:#e8e0d0"></div>
  <div style="font-size:6pt;color:#5a7a64">{businessName}</div>
</div>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --forest:#1c2b22;--parchment:#f5f0e8;--parchment-dark:#e8e0d0;
  --moss:#2d7a50;--sage:#7ec99a;--muted:#5a7a64;
}

:global(body){font-family:'Instrument Sans',sans-serif;background:#e8e4dc;color:var(--forest);min-height:100vh}

nav{background:var(--forest);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.nav-brand{font-family:'Fraunces',serif;font-weight:900;font-size:18px;color:var(--parchment);letter-spacing:-.02em}
.nav-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.nav-back{font-size:13px;color:rgba(245,240,232,.5);text-decoration:none;display:flex;align-items:center;gap:6px;transition:color .2s}
.nav-back:hover{color:var(--parchment)}

.screen-page{max-width:1100px;margin:0 auto;padding:48px 24px 80px}

.page-eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888;margin-bottom:10px}
.page-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(24px,3vw,34px);letter-spacing:-.03em;line-height:1.05;margin-bottom:8px}
.page-title em{font-style:italic;font-weight:300;color:var(--moss)}
.page-sub{font-size:14px;color:#777;margin-bottom:40px;line-height:1.6;max-width:520px}

.format-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}

.format-card{
  background:white;border-radius:14px;border:1px solid var(--parchment-dark);
  overflow:hidden;cursor:pointer;transition:border-color .2s,box-shadow .2s;
}
.format-card:hover{border-color:var(--moss);box-shadow:0 4px 16px rgba(45,122,80,.1)}
.format-card.selected{border-color:var(--moss);box-shadow:0 0 0 3px rgba(45,122,80,.12)}

.fc-preview{
  background:#f0ece4;padding:24px;display:flex;
  align-items:center;justify-content:center;min-height:160px;
  position:relative;
}
.fc-selected-badge{
  position:absolute;top:10px;right:10px;
  background:var(--moss);color:white;
  font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  padding:3px 8px;border-radius:20px;
  display:none;
}
.format-card.selected .fc-selected-badge{display:block}

.fc-info{padding:16px 18px;border-top:1px solid var(--parchment-dark)}
.fc-name{font-family:'Fraunces',serif;font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:2px}
.fc-desc{font-size:12px;color:#888;line-height:1.4}

.print-bar{
  position:fixed;bottom:0;left:0;right:0;
  background:white;border-top:1px solid var(--parchment-dark);
  padding:16px 24px;display:flex;align-items:center;gap:16px;
  z-index:100;
  transform:translateY(100%);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
}
.print-bar.visible{transform:translateY(0)}
.print-bar-text{flex:1;font-size:13px;color:#666}
.print-bar-text strong{color:var(--forest)}
.btn-print{
  padding:12px 24px;background:var(--forest);color:var(--parchment);
  font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:700;
  border:none;border-radius:10px;cursor:pointer;
  display:flex;align-items:center;gap:8px;transition:background .2s;
}
.btn-print:hover{background:#2a3f30}
.btn-print-ghost{
  padding:12px 20px;background:transparent;color:var(--muted);
  font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;
  border:1.5px solid var(--parchment-dark);border-radius:10px;cursor:pointer;transition:all .15s;
}
.btn-print-ghost:hover{border-color:var(--muted);color:var(--forest)}

.prev-a4p{
  width:120px;height:170px;background:var(--forest);border-radius:3px;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;
  padding:14px 12px 12px;
}
.prev-a4p.light{background:var(--parchment)}
.prev-headline{font-family:'Fraunces',serif;font-weight:900;font-size:11px;color:var(--parchment);letter-spacing:-.01em;text-align:center;line-height:1.2}
.prev-headline.dark{color:var(--forest)}
.prev-headline em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-headline.dark em{color:var(--moss)}
.prev-sub{font-size:6px;color:rgba(245,240,232,.4);text-align:center;line-height:1.4}
.prev-sub.dark{color:#aaa}
.prev-qr{width:52px;height:52px;background:white;border-radius:4px;display:flex;align-items:center;justify-content:center}
.prev-qr img{width:44px;height:44px;display:block}
.prev-brand{font-family:'Fraunces',serif;font-weight:700;font-size:7px;color:rgba(245,240,232,.25)}
.prev-brand.dark{color:var(--muted)}
.prev-brand em{font-style:italic;font-weight:300;color:var(--sage)}

.prev-a4l{
  width:200px;height:136px;background:var(--parchment);border-radius:3px;
  display:grid;grid-template-columns:1fr 72px;overflow:hidden;
}
.prev-a4l-left{padding:12px 10px;display:flex;flex-direction:column;justify-content:space-between}
.prev-a4l-right{background:var(--forest);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px}
.prev-a4l-hl{font-family:'Fraunces',serif;font-weight:900;font-size:13px;color:var(--forest);letter-spacing:-.01em;line-height:1.1}
.prev-a4l-hl em{font-style:italic;font-weight:300;color:var(--moss)}
.prev-a4l-body{font-size:5.5px;color:#777;line-height:1.4;margin-top:4px}
.prev-a4l-brand{font-family:'Fraunces',serif;font-weight:700;font-size:6px;color:var(--muted)}
.prev-a4l-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-a4l-qr{width:46px;height:46px;background:white;border-radius:4px;display:flex;align-items:center;justify-content:center}
.prev-a4l-qr img{width:38px;height:38px;display:block}
.prev-scan{font-size:5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,240,232,.4);text-align:center}

.prev-a5{
  width:90px;height:128px;background:white;border-radius:3px;overflow:hidden;
  display:flex;flex-direction:column;
}
.prev-a5-top{background:var(--forest);padding:8px;flex:1;display:flex;flex-direction:column;justify-content:space-between}
.prev-a5-hl{font-family:'Fraunces',serif;font-weight:900;font-size:9px;color:var(--parchment);line-height:1.1}
.prev-a5-hl em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-a5-bot{background:var(--parchment);padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px}
.prev-a5-qr{width:38px;height:38px;background:white;border-radius:3px;display:flex;align-items:center;justify-content:center}
.prev-a5-qr img{width:32px;height:32px;display:block}
.prev-a5-cta{font-size:5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:center}

.prev-a6{
  width:150px;height:100px;background:var(--parchment);border-radius:3px;
  display:grid;grid-template-columns:1fr 60px;overflow:hidden;
}
.prev-a6-left{padding:10px 8px;display:flex;flex-direction:column;justify-content:space-between}
.prev-a6-right{background:var(--forest);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px}
.prev-a6-hl{font-family:'Fraunces',serif;font-weight:900;font-size:10px;color:var(--forest);letter-spacing:-.01em;line-height:1.05}
.prev-a6-hl em{font-style:italic;font-weight:300;color:var(--moss)}
.prev-a6-body{font-size:5px;color:#888;line-height:1.4;margin-top:3px}
.prev-a6-brand{font-family:'Fraunces',serif;font-weight:700;font-size:5.5px;color:var(--muted)}
.prev-a6-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-a6-qr{width:38px;height:38px;background:white;border-radius:3px;display:flex;align-items:center;justify-content:center}
.prev-a6-qr img{width:30px;height:30px;display:block}

.prev-a6p{
  width:100px;height:142px;background:white;border-radius:3px;overflow:hidden;
  display:flex;flex-direction:column;
}
.prev-a6p-top{background:var(--forest);padding:9px 8px;flex:0 0 56px;display:flex;flex-direction:column;justify-content:space-between}
.prev-a6p-hl{font-family:'Fraunces',serif;font-weight:900;font-size:10px;color:var(--parchment);line-height:1.1;letter-spacing:-.01em}
.prev-a6p-hl em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-a6p-brand{font-family:'Fraunces',serif;font-weight:700;font-size:6px;color:rgba(245,240,232,.3)}
.prev-a6p-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-a6p-bot{background:var(--parchment);padding:8px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.prev-a6p-body{font-size:5px;color:#888;line-height:1.4;text-align:center}
.prev-a6p-qr{width:46px;height:46px;background:white;border-radius:3px;border:1px solid var(--parchment-dark);display:flex;align-items:center;justify-content:center}
.prev-a6p-qr img{width:38px;height:38px;display:block}
.prev-a6p-cta{font-size:4.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:center}

.prev-bc{
  width:128px;height:82px;background:var(--forest);border-radius:3px;
  display:grid;grid-template-columns:1fr 48px;overflow:hidden;
}
.prev-bc-left{padding:8px;display:flex;flex-direction:column;justify-content:space-between}
.prev-bc-hl{font-family:'Fraunces',serif;font-weight:900;font-size:8.5px;color:var(--parchment);line-height:1.1}
.prev-bc-hl em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-bc-sub{font-size:5px;color:rgba(245,240,232,.35);line-height:1.4;margin-top:2px}
.prev-bc-brand{font-family:'Fraunces',serif;font-weight:700;font-size:5.5px;color:rgba(245,240,232,.25)}
.prev-bc-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.prev-bc-right{background:rgba(255,255,255,.05);border-left:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px}
.prev-bc-qr{width:30px;height:30px;background:white;border-radius:2px;display:flex;align-items:center;justify-content:center}
.prev-bc-qr img{width:24px;height:24px;display:block}
.prev-bc-scan{font-size:4.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(245,240,232,.3);text-align:center}

.prev-strip{
  width:70px;background:white;border-radius:2px;
  padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:5px;
  border-top:2px solid var(--forest);border-bottom:2px solid var(--forest);
}
.prev-strip-hl{font-family:'Fraunces',serif;font-weight:900;font-size:7px;color:var(--forest);text-align:center;line-height:1.2}
.prev-strip-hl em{font-style:italic;font-weight:300;color:var(--moss)}
.prev-strip-rule{width:100%;height:1px;background:var(--parchment-dark)}
.prev-strip-qr{width:44px;height:44px;background:var(--parchment);border-radius:3px;display:flex;align-items:center;justify-content:center}
.prev-strip-qr img{width:36px;height:36px;display:block}
.prev-strip-brand{font-family:'Fraunces',serif;font-weight:700;font-size:5.5px;color:var(--muted)}
.prev-strip-brand em{font-style:italic;font-weight:300;color:var(--sage)}

.print-card{display:none}

@media print {
  nav, .screen-page, .print-bar { display: none !important }
  .print-card { display: none !important; visibility: hidden !important; }
  .print-card.printing { display: block !important; visibility: visible !important; }

  @page { margin: 0; size: auto; }
  :global(body) {
    margin: 0 !important;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-card.printing,
  .print-card.printing * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    forced-color-adjust: none !important;
  }

  .print-card.printing {
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: auto !important;
    bottom: auto !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    transform: translate3d(0, 0, 0);
  }

  .print-card.printing.fmt-a4p {
    width: 210mm; height: 297mm;
    background: #1c2b22;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 32mm 28mm 28mm;
  }
  .print-card.printing.fmt-a4p.light { background: #f5f0e8 }

  .print-card.printing.fmt-a4l {
    width: 297mm; height: 210mm;
    background: #f5f0e8;
    display: grid !important;
    grid-template-columns: 1fr 90mm;
  }

  .print-card.printing.fmt-a5 {
    width: 148mm; height: 210mm;
    background: white;
    display: flex !important;
    flex-direction: column;
  }

  .print-card.printing.fmt-a6l {
    width: 148mm; height: 105mm;
    background: #f5f0e8;
    display: grid !important;
    grid-template-columns: 1fr 55mm;
  }

  .print-card.printing.fmt-a6p {
    width: 105mm; height: 148mm;
    background: white;
    display: flex !important;
    flex-direction: column;
  }

  .print-card.printing.fmt-bc {
    width: 85mm; height: 55mm;
    background: #1c2b22;
    display: grid !important;
    grid-template-columns: 1fr 32mm;
  }

  .print-card.printing.fmt-strip {
    width: 58mm;
    background: white;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    padding: 6mm 4mm;
    border-top: 1mm solid #1c2b22;
    border-bottom: 1mm solid #1c2b22;
    gap: 4mm;
  }
}
</style>
