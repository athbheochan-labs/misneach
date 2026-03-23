<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/analytics';

  function trackBusinessCtaClicked() {
    trackEvent('Business CTA: Clicked');
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
      { threshold: 0.1 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>For Businesses - Misneach</title>
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
    <a href="/for-businesses" class="nav-link active">For businesses</a>
    <a href="/pricing" class="nav-link">Pricing</a>
    <a href="/waitlist?interest=individual_course_access" class="nav-cta">Sign in</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-text">
      <span class="hero-tag">For businesses</span>
      <h1 class="hero-headline">
        Put Irish in
        <em>your window.</em>
      </h1>
      <p class="hero-sub">You don't need a fluent Irish speaker on staff to get started. You just need to <strong>open the door</strong> - and let customers know it's welcome.</p>
      <div class="hero-actions">
        <a href="/waitlist?interest=business_pack" class="btn-primary" on:click={trackBusinessCtaClicked}>Register your business</a>
        <a href="#how-it-works" class="btn-ghost">
          See what's involved
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="big-sticker">
        <div class="bs-inner">
          <div class="bs-top">Gaeilge</div>
          <div class="bs-div"></div>
          <div class="bs-main">Fail<em>te</em></div>
          <div class="bs-div"></div>
          <div class="bs-sub">Irish spoken here</div>
          <div class="bs-url">misneach.ie</div>
        </div>
      </div>
      <div class="hero-visual-caption">The Fáilte mark</div>
    </div>
  </div>
</section>

<section style="background:var(--forest);padding:48px 40px">
  <div class="section-inner" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;align-items:start">
    <div>
      <div style="font-family:'Fraunces',serif;font-weight:900;font-size:48px;letter-spacing:-.05em;color:var(--sage);line-height:1">65%</div>
      <div style="font-size:13px;color:rgba(245,240,232,.4);line-height:1.5;margin-top:6px">want to see cupla focal used by most people daily</div>
      <div style="font-size:10px;color:rgba(245,240,232,.2);font-style:italic;margin-top:6px">Ireland Thinks, 2022</div>
    </div>
    <div>
      <div style="font-family:'Fraunces',serif;font-weight:900;font-size:48px;letter-spacing:-.05em;color:var(--sage);line-height:1">473k</div>
      <div style="font-size:13px;color:rgba(245,240,232,.4);line-height:1.5;margin-top:6px">people can speak Irish but say they never do</div>
      <div style="font-size:10px;color:rgba(245,240,232,.2);font-style:italic;margin-top:6px">CSO Census 2022</div>
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:14px;color:rgba(245,240,232,.35);line-height:1.65;margin-bottom:16px">The appetite is there. The opportunity isn't. That's exactly the gap a cafe like yours can fill.</div>
      <a href="/stats" style="display:inline-flex;align-items:center;gap:8px;color:var(--sage);font-family:'Fraunces',serif;font-weight:700;font-size:13px;text-decoration:none;letter-spacing:-.01em">See the full research -&gt;</a>
    </div>
  </div>
</section>

<section class="section what-you-get" id="what-you-get">
  <div class="section-inner">
    <span class="section-tag reveal">What you receive</span>
    <h2 class="section-headline reveal">Three things. <em>That's it.</em></h2>
    <p class="section-intro reveal">No training programme to implement. No system to learn. Just the materials that make Irish feel welcome in your space - and a course your staff can do in their own time.</p>

    <div class="materials-grid">
      <div class="material-tile reveal">
        <div class="material-visual">
          <div class="mini-sticker">
            <div class="ms-top">Gaeilge</div>
            <div class="ms-div"></div>
            <div class="ms-main">Fail<em>te</em></div>
            <div class="ms-div"></div>
            <div class="ms-sub">Irish here</div>
          </div>
        </div>
        <div class="material-info">
          <div class="material-title">The <em>Fáilte</em> window mark</div>
          <div class="material-desc">A circular sticker for your window or door. It tells customers - before anyone says a word - that Irish is <strong>welcome here</strong>. Small enough not to shout, visible enough to matter.</div>
        </div>
      </div>

      <div class="material-tile reveal reveal-delay-1">
        <div class="material-visual">
          <div class="mini-badge">
            <div class="mini-badge-hole"></div>
            <div class="mini-badge-top">
              <div class="mini-badge-brand">Misne<em>ach</em></div>
              <div class="mini-badge-chip">Gaeilge</div>
            </div>
            <div class="mini-badge-div"></div>
            <div class="mini-badge-name">Aoife</div>
            <div class="mini-badge-role">Barista</div>
            <div class="mini-badge-spoken">
              <strong>Labraim Gaeilge</strong>
              I speak Irish
            </div>
          </div>
        </div>
        <div class="material-info">
          <div class="material-title">Staff <em>badges</em></div>
          <div class="material-desc">Worn by staff who can take orders in Irish. <strong>"Labraim Gaeilge"</strong> removes the customer's biggest worry before they open their mouth - they know this person will understand them.</div>
        </div>
      </div>

      <div class="material-tile reveal">
        <div class="material-visual">
          <div class="mini-card">
            <div class="mini-card-header">
              <span class="mini-card-brand">Misne<em>ach</em></span>
              <span class="mini-card-title">Phrases</span>
            </div>
            <div class="mini-card-body">
              <div class="mini-card-label">Greetings</div>
              <div class="mini-phrase">
                <div class="mini-phrase-irish">Dia duit</div>
                <div class="mini-phrase-eng">Hello</div>
              </div>
              <div class="mini-phrase">
                <div class="mini-phrase-irish">Go raibh maith agat</div>
                <div class="mini-phrase-eng">Thank you</div>
              </div>
              <div class="mini-phrase">
                <div class="mini-phrase-irish">Cupan tae, le do thoil</div>
                <div class="mini-phrase-eng">A cup of tea, please</div>
              </div>
            </div>
          </div>
        </div>
        <div class="material-info">
          <div class="material-title">Customer <em>cheatsheet cards</em></div>
          <div class="material-desc">Credit-card sized phrase cards left at the counter. Customers can pick one up, use it to place an order, and <strong>take it with them</strong>. The back links to the full course.</div>
        </div>
      </div>

      <div class="material-tile reveal reveal-delay-1">
        <div class="material-visual" style="align-items:flex-start;padding-top:8px">
          <div style="background:var(--parchment);border-radius:10px;padding:16px 20px;border:1px solid var(--parchment-dark);width:100%">
            <div style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#aaa;font-weight:700;margin-bottom:8px">Staff access</div>
            <div style="font-family:'Fraunces',serif;font-weight:700;font-size:14px;color:var(--forest);letter-spacing:-0.01em;margin-bottom:4px">Coffee Shop Encounters</div>
            <div style="font-size:11px;color:#888;margin-bottom:12px">12 lessons - ~45 min total</div>
            <div style="height:3px;background:var(--parchment-dark);border-radius:3px;overflow:hidden;margin-bottom:4px"><div style="height:100%;width:0%;background:var(--sage);border-radius:3px"></div></div>
            <div style="font-size:10px;color:#bbb">Not started</div>
          </div>
        </div>
        <div class="material-info">
          <div class="material-title">Access to the <em>platform</em></div>
          <div class="material-desc">Your staff get full Misneach access - the Coffee Shop Encounters course plus flashcards, practice sessions, phrase tracking, and a mistake corrector. <strong>Short enough to do on a lunch break.</strong> Deep enough to build real confidence.</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section how-biz" id="how-it-works">
  <div class="section-inner">
    <span class="section-tag reveal">How it works</span>
    <h2 class="section-headline reveal">Four steps. <em>No expertise required.</em></h2>
    <p class="section-intro reveal">We've designed this so that the business owner does almost nothing. The materials do the work.</p>
    <div class="biz-steps">
      <div class="biz-step reveal"><div class="biz-step-num">1</div><div class="biz-step-content"><h3>Register your <em>business</em></h3><p>Fill in a short form - your business name, type, and location. That's all we need to get your materials ready. There's no contract, no commitment beyond wanting to give this a go.</p></div></div>
      <div class="biz-step reveal"><div class="biz-step-num">2</div><div class="biz-step-content"><h3>Your kit <em>arrives</em></h3><p>We post you the window sticker, a set of staff badges, and a batch of customer phrase cards. The sticker goes on the window. The badges go to the staff who want to use them. The cards go on the counter.</p></div></div>
      <div class="biz-step reveal"><div class="biz-step-num">3</div><div class="biz-step-content"><h3>Staff do the course <em>in their own time</em></h3><p>Anyone on the team who wants to try gets a link to the Misneach course. <strong>No pressure, no obligation.</strong> The course is built for people who have very little Irish - and it's short enough to do on a lunch break. The badge is there when they're ready for it.</p></div></div>
      <div class="biz-step reveal"><div class="biz-step-num">4</div><div class="biz-step-content"><h3>Irish becomes <em>part of the place</em></h3><p>Customers notice the sticker. Some will try a word. Staff respond. A phrase card gets picked up. Someone takes it home. <strong>It starts small and it grows on its own.</strong> We've seen it happen already.</p></div></div>
    </div>
  </div>
</section>

<section class="section honest-biz">
  <div class="section-inner">
    <span class="section-tag reveal">About your staff</span>
    <div class="worry-block reveal">
      <div class="worry-inner">
        <p class="worry-q">Participation is always a choice - for every member of staff, at every stage.</p>
        <p class="worry-a">Nobody is asked to do anything they're not comfortable with. The most basic version of Misneach is just the window sign - which signals to customers that Irish is welcome, without requiring anything from your team. Staff who want to go further can. Staff who don't, don't have to.</p>
        <div class="worry-divider"></div>
        <div class="worry-list">
          <div class="worry-item"><div class="worry-item-mark">-</div><div class="worry-item-text">For staff who are interested, the course is a <strong>genuine upskilling opportunity</strong> - a language skill they can put on their CV, done in their own time, at no cost to them.</div></div>
          <div class="worry-item"><div class="worry-item-mark">-</div><div class="worry-item-text">Staff don't wear the Labraim Gaeilge badge until <strong>they decide they're ready.</strong> There's no deadline and no expectation.</div></div>
          <div class="worry-item"><div class="worry-item-mark">-</div><div class="worry-item-text">The customer cheatsheet cards mean <strong>both sides have the words in front of them.</strong> It becomes a shared attempt, not a test of anyone's fluency.</div></div>
          <div class="worry-item"><div class="worry-item-mark">-</div><div class="worry-item-text">Want to know where your team stands before you decide anything? <strong>Run a staff appetite survey</strong> - anonymous, five questions, takes two minutes.</div></div>
        </div>
        <div style="margin-top:24px"><a href="/survey/setup" style="display:inline-flex;align-items:center;gap:8px;background:var(--forest);color:var(--parchment);text-decoration:none;border-radius:10px;padding:12px 20px;font-family:'Fraunces',serif;font-weight:700;font-size:14px;letter-spacing:-.02em">Set up appetite surveys -&gt;</a></div>
      </div>
    </div>
  </div>
</section>

<section class="section section-surveys">
  <div class="section-inner">
    <span class="section-tag reveal">Not convinced yet?</span>
    <h2 class="section-headline reveal">Ask your own <em>people first.</em></h2>
    <p class="section-intro reveal" style="margin-bottom:32px">National research is useful context. But what matters most is what your customers and your staff actually think. We've built two short surveys you can share before you commit to anything.</p>
    <div class="survey-cards reveal">
      <div style="background:var(--forest);border-radius:16px;padding:28px 24px;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 20%,rgba(126,201,154,.08) 0%,transparent 55%);pointer-events:none"></div>
        <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:10px;position:relative">For your customers</div>
        <div style="font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-.03em;color:var(--parchment);line-height:1.15;margin-bottom:8px;position:relative">Would Irish work here?</div>
        <div style="font-size:13px;color:rgba(245,240,232,.4);line-height:1.6;margin-bottom:18px;position:relative">Four questions, under a minute. Share on your socials or put a QR code on the counter.</div>
        <a href="/survey/setup" style="display:inline-flex;align-items:center;gap:7px;background:var(--parchment);color:var(--forest);text-decoration:none;border-radius:9px;padding:10px 16px;font-family:'Fraunces',serif;font-weight:700;font-size:13px;position:relative">Start customer appetite survey -&gt;</a>
      </div>
      <div style="background:white;border:1.5px solid var(--parchment-dark);border-radius:16px;padding:28px 24px">
        <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:10px">For your staff</div>
        <div style="font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-.03em;color:var(--forest);line-height:1.15;margin-bottom:8px">What does your team think?</div>
        <div style="font-size:13px;color:#777;line-height:1.6;margin-bottom:18px">Anonymous, five questions. Find out who's interested and what their level is - before you decide anything.</div>
        <a href="/survey/setup" style="display:inline-flex;align-items:center;gap:7px;background:var(--forest);color:var(--parchment);text-decoration:none;border-radius:9px;padding:10px 16px;font-family:'Fraunces',serif;font-weight:700;font-size:13px">Start staff appetite survey -&gt;</a>
      </div>
    </div>
  </div>
</section>

<section class="section pricing" id="get-started">
  <div class="section-inner">
    <span class="section-tag reveal">What it costs</span>
    <h2 class="section-headline reveal">Simple pricing. <em>No surprises.</em></h2>
    <p class="section-intro reveal">We're keeping this as accessible as possible while the network is getting started.</p>

    <div class="pricing-card reveal">
      <div class="pricing-header"><div class="pricing-header-inner"><div class="pricing-eyebrow">Participation package</div><div class="pricing-name">Fail<em>te</em> Kit</div><div class="pricing-tagline">Everything you need to get started - materials and course access included.</div></div></div>
      <div class="pricing-body">
        <div>
          <div class="pricing-includes-label">What's included</div>
          <div class="pricing-includes">
            <div class="pricing-include"><div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="include-text"><strong>Fáilte window sticker</strong> - durable, weatherproof, for door or window</div></div>
            <div class="pricing-include"><div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="include-text"><strong>Staff badges</strong> - pack of 5, reorderable</div></div>
            <div class="pricing-include"><div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="include-text"><strong>Customer phrase cards</strong> - pack of 50, reorderable</div></div>
            <div class="pricing-include"><div class="include-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="include-text"><strong>Course access for all staff</strong> - the full Misneach course, shared link</div></div>
          </div>
        </div>
        <div class="pricing-cost">
          <div class="cost-item"><div class="cost-item-label">One-time kit fee</div><div class="cost-item-price">EUR<em>49</em></div><div class="cost-item-note">Materials + first year of course access for all staff. No subscription.</div></div>
          <div class="cost-item"><div class="cost-item-label">Renewal (optional)</div><div class="cost-item-price">EUR<em>29</em> <span style="font-size:14px;color:#aaa;font-family:'Instrument Sans',sans-serif;font-weight:400">/yr</span></div><div class="cost-item-note">Continued course access and materials reorder discount. Cancel any time.</div></div>
        </div>
      </div>
      <div class="pricing-footer"><p class="pricing-footer-text"><strong>Pilot pricing.</strong> We're starting with a small number of businesses. If you're one of the first ten to register, you get the kit free - we want the feedback more than the fee.</p><a href="/waitlist?interest=business_pack" class="btn-pricing" on:click={trackBusinessCtaClicked}>Register your business -&gt;</a></div>
    </div>
  </div>
</section>

<section class="section monaghan">
  <div class="section-inner">
    <span class="section-tag reveal">It's already happening</span>
    <div class="pull-quote-block reveal"><p class="pull-quote">An Nead in Monaghan reported that the vast majority of customers use some Irish when they visit - and that neighbouring businesses started using more Irish with their customers without being asked.</p><p class="pull-quote-attr">RTE, 2026</p></div>
    <p class="monaghan-body reveal">An Nead opened in Monaghan and was flat out from day one. Neighbouring businesses started using more Irish with their customers without being asked. One cafe changed what felt normal on a whole street.</p>
    <p class="monaghan-body reveal" style="margin-top:16px">It's not just Monaghan. Aon Sceal in Tallaght has been doing this since 2019. Plamas in Galway won an Udaras na Gaeltachta award for it. Caife Anseo, a coffee truck at a GAA pitch in Meath, made Irish part of its identity from day one and has been busy since week three. A pop-up in Dundalk draws people from three counties with no funding and no fixed venue.</p>
    <p class="monaghan-body reveal" style="margin-top:16px"><strong>Five places. Five different models. All working.</strong> What most towns are missing isn't the appetite - it's the place.</p>
  </div>
</section>

<section class="section faq-section">
  <div class="section-inner">
    <span class="section-tag reveal">Questions</span>
    <h2 class="section-headline reveal">Things business owners <em>usually ask.</em></h2>
    <div class="faq-list">
      <div class="faq-item reveal"><div class="faq-q">What type of businesses is this for?</div><div class="faq-a">Right now, Misneach is built specifically for <strong>coffee shops</strong>. More business types are in the works, but we're starting here and doing it properly.</div></div>
      <div class="faq-item reveal"><div class="faq-q">What if only one person on the team is interested?</div><div class="faq-a">That's completely fine. <strong>One willing person is enough.</strong> The sticker stays up regardless and the phrase cards still work.</div></div>
      <div class="faq-item reveal"><div class="faq-q">What if a customer tries to have a full conversation in Irish?</div><div class="faq-a">Most customers using Irish will be at the same level as your staff: a few phrases, a simple exchange. If it goes beyond what someone can handle, English is always there. <strong>Nobody is expected to be fluent.</strong></div></div>
      <div class="faq-item reveal"><div class="faq-q">Can we get more phrase cards or badges when we run out?</div><div class="faq-a">Yes. Registered businesses can reorder materials at cost - we're not trying to make money on consumables. If the cards are going out the door, that means they're working.</div></div>
    </div>
  </div>
</section>

<section class="final-cta">
  <div class="final-cta-inner">
    <h2 class="final-headline">Your window.<em>Your move.</em></h2>
    <p class="final-sub">It starts with a sticker and a stack of cards on a counter. What happens next tends to surprise people.</p>
    <a href="/waitlist?interest=business_pack" class="btn-final" on:click={trackBusinessCtaClicked}>Register your business</a>
    <span class="final-note">Questions? <a href="mailto:hello@misneach.ie">hello@misneach.ie</a></span>
  </div>
</section>

<footer>
  <div class="footer-brand">
    <svg width="20" height="20" viewBox="0 0 80 80" fill="none"><path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#f5f0e8"/><path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#1c2b22" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="33.5" cy="45" r="3" fill="#1c2b22"/></svg>
    <div><div class="footer-name">Misne<em>ach</em></div><div class="footer-tagline">Irish, out loud.</div></div>
  </div>
  <div class="footer-links"><a href="/how-it-works" class="footer-link">How it works</a><a href="/for-businesses" class="footer-link">For businesses</a><a href="/waitlist?interest=individual_course_access" class="footer-link">Sign in</a></div>
</footer>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--forest:#1c2b22;--forest-mid:#2e4436;--forest-dim:#243322;--parchment:#f5f0e8;--parchment-dark:#e8e0d0;--green:#2d7a50;--sage:#7ec99a;--muted:#5a7a64;--ink:#1a1a18;--paper:#ffffff}
html{scroll-behavior:smooth}
body{font-family:'Instrument Sans',sans-serif;background:var(--parchment);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}
nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;background:rgba(245,240,232,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(28,43,34,0.08)}
.nav-brand{display:flex;align-items:center;gap:9px;text-decoration:none}
.nav-name{font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-0.03em;color:var(--forest);line-height:1}
.nav-name em{font-style:italic;font-weight:300;color:var(--green)}
.nav-links{display:flex;align-items:center;gap:28px}
.nav-dropdown{position:relative}
.nav-dropdown summary{list-style:none;cursor:pointer}
.nav-dropdown summary::-webkit-details-marker{display:none}
.nav-dropdown-menu{
  position:absolute;top:calc(100% + 10px);left:0;min-width:220px;
  border:1px solid rgba(28,43,34,.12);border-radius:10px;background:#fff;
  box-shadow:0 14px 30px -12px rgba(28,43,34,.35);overflow:hidden;display:none;z-index:20
}
.nav-dropdown[open] .nav-dropdown-menu{display:block}
.nav-dropdown-menu a{display:block;padding:10px 12px;text-decoration:none;font-size:12px;color:var(--forest)}
.nav-dropdown-menu a:hover{background:var(--parchment)}
.nav-link{font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;transition:color .12s}
.nav-link:hover{color:var(--forest)}
.nav-link.active{color:var(--forest);font-weight:600}
.nav-cta{background:var(--forest);color:var(--parchment);border:none;border-radius:8px;padding:8px 16px;font-family:'Instrument Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;text-decoration:none;transition:background .12s}
.nav-cta:hover{background:var(--green)}
.hero{min-height:80vh;background:var(--forest);display:flex;align-items:center;padding:120px 24px 80px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none}
.hero::after{content:'';position:absolute;top:-80px;right:-80px;width:600px;height:600px;background:radial-gradient(circle,rgba(45,122,80,0.22) 0%,transparent 65%);pointer-events:none}
.hero-inner{position:relative;z-index:1;max-width:960px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.hero-tag{font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:18px;display:block;opacity:0;animation:fadeUp .6s ease .1s forwards}
.hero-headline{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(38px,5.5vw,60px);letter-spacing:-.04em;line-height:1;color:var(--parchment);margin-bottom:22px;opacity:0;animation:fadeUp .6s ease .2s forwards}
.hero-headline em{font-style:italic;font-weight:300;color:var(--sage);display:block}
.hero-sub{font-size:16px;line-height:1.7;color:var(--muted);margin-bottom:36px;opacity:0;animation:fadeUp .6s ease .32s forwards}
.hero-sub strong{color:var(--parchment);font-weight:600}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;opacity:0;animation:fadeUp .6s ease .44s forwards}
.btn-primary{background:var(--sage);color:var(--forest);border:none;border-radius:10px;padding:13px 24px;font-family:'Fraunces',serif;font-weight:700;font-size:15px;letter-spacing:-.01em;cursor:pointer;text-decoration:none;transition:background .12s,transform .1s;white-space:nowrap}
.btn-primary:hover{background:#8fd4a8;transform:translateY(-1px)}
.btn-ghost{color:var(--muted);font-size:13px;font-weight:500;text-decoration:none;letter-spacing:.01em;transition:color .12s;display:flex;align-items:center;gap:5px}
.btn-ghost:hover{color:var(--parchment)}
.hero-visual{display:flex;align-items:center;justify-content:center;opacity:0;animation:fadeUp .7s ease .3s forwards;gap:24px;flex-direction:column}
.big-sticker{width:200px;height:200px;border-radius:50%;background:var(--parchment);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:0 0 0 8px rgba(245,240,232,0.06),0 0 0 16px rgba(245,240,232,0.03),0 24px 64px -20px rgba(0,0,0,0.5);flex-shrink:0}
.big-sticker::before{content:'';position:absolute;inset:9px;border-radius:50%;border:1.5px dashed var(--parchment-dark)}
.bs-inner{display:flex;flex-direction:column;align-items:center;gap:0;z-index:1}
.bs-top{font-family:'Fraunces',serif;font-weight:900;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
.bs-main{font-family:'Fraunces',serif;font-weight:900;font-size:36px;letter-spacing:-.02em;color:var(--forest);line-height:1}
.bs-main em{font-style:italic;font-weight:300;color:var(--green)}
.bs-div{width:36px;height:1.5px;background:var(--parchment-dark);margin:7px 0}
.bs-sub{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600}
.bs-url{font-size:8px;letter-spacing:.12em;color:#aaa;margin-top:4px}
.hero-visual-caption{font-size:11px;color:var(--forest-mid);letter-spacing:.1em;text-align:center;font-weight:500;text-transform:uppercase}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.section{padding:88px 24px;display:flex;flex-direction:column;align-items:center}
.section-inner{max-width:860px;width:100%}
.section-tag{font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:14px;display:block}
.section-headline{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(28px,4vw,44px);letter-spacing:-.03em;line-height:1.05;color:var(--forest);margin-bottom:12px}
.section-headline em{font-style:italic;font-weight:300;color:var(--green)}
.section-intro{font-size:16px;line-height:1.7;color:#666;max-width:540px;margin-bottom:52px}
.what-you-get{background:var(--parchment)}
.materials-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:16px;overflow:hidden;margin-bottom:48px}
.material-tile{background:var(--paper);padding:36px 32px;display:flex;flex-direction:column;gap:16px}
.material-visual{height:120px;display:flex;align-items:center;justify-content:center}
.mini-sticker{width:96px;height:96px;border-radius:50%;background:var(--forest);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:0 8px 24px -8px rgba(28,43,34,0.3)}
.mini-sticker::before{content:'';position:absolute;inset:5px;border-radius:50%;border:1px dashed #2e4436}
.ms-top{font-family:'Fraunces',serif;font-weight:900;font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:var(--sage);z-index:1}
.ms-main{font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-.01em;color:var(--parchment);line-height:1;z-index:1}
.ms-main em{font-style:italic;font-weight:300;color:var(--sage)}
.ms-div{width:18px;height:1px;background:#2e4436;margin:3px 0;z-index:1}
.ms-sub{font-size:6px;letter-spacing:.12em;text-transform:uppercase;color:#3a5a44;z-index:1}
.mini-badge{width:140px;background:var(--parchment);border-radius:8px;padding:11px 14px 13px;box-shadow:0 4px 16px -4px rgba(28,43,34,0.15);position:relative;display:flex;flex-direction:column;gap:8px}
.mini-badge-hole{position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:14px;height:6px;border-radius:0 0 14px 14px;background:#d8d2c4;border:1px solid #c8c2b4;border-top:none}
.mini-badge-top{display:flex;align-items:center;justify-content:space-between;padding-top:5px}
.mini-badge-brand{font-family:'Fraunces',serif;font-weight:900;font-size:9px;color:var(--forest);letter-spacing:-.01em}
.mini-badge-brand em{font-style:italic;font-weight:300;color:var(--green)}
.mini-badge-chip{background:var(--forest);color:var(--sage);font-size:5.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:2px 5px;border-radius:3px}
.mini-badge-div{height:1px;background:#d8d2c4}
.mini-badge-name{font-family:'Fraunces',serif;font-weight:700;font-size:16px;color:var(--forest);letter-spacing:-.02em;line-height:1}
.mini-badge-role{font-size:7.5px;letter-spacing:.1em;color:var(--muted);font-weight:500;text-transform:uppercase}
.mini-badge-spoken{font-size:7px;color:var(--muted);line-height:1.35}
.mini-badge-spoken strong{color:var(--green);font-weight:600;display:block;font-size:8px}
.mini-card{width:150px;background:var(--parchment);border-radius:6px;overflow:hidden;box-shadow:0 4px 16px -4px rgba(28,43,34,0.15)}
.mini-card-header{background:var(--forest);padding:6px 10px;display:flex;align-items:center;justify-content:space-between}
.mini-card-brand{font-family:'Fraunces',serif;font-weight:900;font-size:9px;color:var(--parchment);letter-spacing:-.01em}
.mini-card-brand em{font-style:italic;font-weight:300;color:var(--sage)}
.mini-card-title{font-size:7px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;font-weight:600}
.mini-card-body{padding:8px 10px;display:flex;flex-direction:column;gap:5px}
.mini-card-label{font-size:6.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:1px}
.mini-phrase{border-bottom:1px solid var(--parchment-dark);padding-bottom:4px;margin-bottom:1px}
.mini-phrase-irish{font-family:'Fraunces',serif;font-weight:700;font-size:8px;color:var(--forest)}
.mini-phrase-eng{font-size:7px;color:#999}
.material-title{font-family:'Fraunces',serif;font-weight:700;font-size:18px;color:var(--forest);letter-spacing:-.01em;margin-bottom:6px;line-height:1.2}
.material-title em{font-style:italic;font-weight:300;color:var(--green)}
.material-desc{font-size:13.5px;line-height:1.68;color:#666}
.material-desc strong{color:var(--ink);font-weight:600}
.how-biz{background:var(--paper)}
.biz-steps{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--parchment-dark)}
.biz-step{display:grid;grid-template-columns:52px 1fr;gap:20px;padding:30px 0;border-bottom:1px solid var(--parchment-dark);align-items:start}
.biz-step-num{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:36px;color:var(--sage);line-height:1;margin-top:3px}
.biz-step-content h3{font-family:'Fraunces',serif;font-weight:700;font-size:19px;color:var(--forest);letter-spacing:-.01em;margin-bottom:7px;line-height:1.2}
.biz-step-content h3 em{font-style:italic;font-weight:300;color:var(--green)}
.biz-step-content p{font-size:14px;line-height:1.7;color:#666}
.biz-step-content p strong{color:var(--ink);font-weight:600}
.honest-biz{background:var(--parchment-dark)}
.worry-block{background:var(--forest);border-radius:16px;padding:44px 40px;position:relative;overflow:hidden;margin-bottom:32px}
.worry-block::before{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none}
.worry-inner{position:relative;z-index:1}
.worry-q{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:clamp(18px,2.5vw,24px);color:var(--parchment);letter-spacing:-.01em;margin-bottom:16px;line-height:1.4}
.worry-a{font-size:14.5px;line-height:1.72;color:var(--muted);max-width:540px}
.worry-a strong{color:var(--parchment);font-weight:600}
.worry-divider{height:1px;background:var(--forest-mid);margin:28px 0}
.worry-list{display:flex;flex-direction:column;gap:12px}
.worry-item{display:flex;gap:12px;align-items:flex-start}
.worry-item-mark{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:20px;color:var(--sage);line-height:1;flex-shrink:0;margin-top:1px}
.worry-item-text{font-size:14px;line-height:1.6;color:var(--muted)}
.worry-item-text strong{color:var(--parchment);font-weight:600}
.section-surveys{background:var(--parchment-dark);padding:64px 40px}
.survey-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pricing{background:var(--parchment)}
.pricing-card{background:var(--paper);border-radius:16px;border:1.5px solid var(--parchment-dark);overflow:hidden}
.pricing-header{background:var(--forest);padding:28px 32px;position:relative;overflow:hidden}
.pricing-header::before{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none}
.pricing-header-inner{position:relative;z-index:1}
.pricing-eyebrow{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:8px}
.pricing-name{font-family:'Fraunces',serif;font-weight:900;font-size:28px;letter-spacing:-.03em;color:var(--parchment);line-height:1;margin-bottom:4px}
.pricing-name em{font-style:italic;font-weight:300;color:var(--sage)}
.pricing-tagline{font-size:14px;color:var(--muted);line-height:1.5}
.pricing-body{padding:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
.pricing-includes-label{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#bbb;font-weight:700;margin-bottom:16px}
.pricing-includes{display:flex;flex-direction:column;gap:10px}
.pricing-include{display:flex;gap:10px;align-items:flex-start}
.include-check{width:18px;height:18px;border-radius:50%;background:rgba(45,122,80,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.include-check svg{width:10px;height:10px;color:var(--green)}
.include-text{font-size:13.5px;line-height:1.5;color:#555}
.include-text strong{color:var(--ink);font-weight:600}
.pricing-cost{display:flex;flex-direction:column;gap:16px}
.cost-item{padding:16px 20px;border:1px solid var(--parchment-dark);border-radius:10px;display:flex;flex-direction:column;gap:4px}
.cost-item-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#aaa}
.cost-item-price{font-family:'Fraunces',serif;font-weight:900;font-size:28px;letter-spacing:-.03em;color:var(--forest);line-height:1}
.cost-item-price em{font-style:italic;font-weight:300;color:var(--green);font-size:20px}
.cost-item-note{font-size:11.5px;color:#888;line-height:1.4}
.pricing-footer{padding:20px 32px;border-top:1px solid var(--parchment-dark);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:#fdfaf5}
.pricing-footer-text{font-size:13px;color:#888;line-height:1.5;max-width:400px}
.pricing-footer-text strong{color:var(--ink);font-weight:600}
.btn-pricing{background:var(--forest);color:var(--parchment);border:none;border-radius:10px;padding:12px 24px;font-family:'Fraunces',serif;font-weight:700;font-size:15px;letter-spacing:-.01em;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .12s,transform .1s}
.btn-pricing:hover{background:var(--green);transform:translateY(-1px)}
.monaghan{background:var(--paper)}
.pull-quote-block{border-left:3px solid var(--sage);padding:4px 0 4px 32px;margin-bottom:32px}
.pull-quote{font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:clamp(20px,3vw,28px);letter-spacing:-.02em;color:var(--forest);line-height:1.4;margin-bottom:10px}
.pull-quote-attr{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#aaa;font-weight:600}
.monaghan-body{font-size:15px;line-height:1.75;color:#555;max-width:580px}
.monaghan-body strong{color:var(--ink);font-weight:600}
.faq-section{background:var(--parchment-dark)}
.faq-list{display:flex;flex-direction:column;gap:0;border-top:1px solid #d0c8b8}
.faq-item{border-bottom:1px solid #d0c8b8;padding:24px 0}
.faq-q{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-.01em;margin-bottom:10px;line-height:1.3}
.faq-a{font-size:14px;line-height:1.72;color:#555;max-width:580px}
.faq-a strong{color:var(--ink);font-weight:600}
.final-cta{background:var(--forest);padding:100px 24px;text-align:center;position:relative;overflow:hidden}
.final-cta::before{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none}
.final-cta::after{content:'';position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);width:500px;height:500px;background:radial-gradient(circle,rgba(45,122,80,0.2) 0%,transparent 65%);pointer-events:none}
.final-cta-inner{position:relative;z-index:1;max-width:560px;margin:0 auto}
.final-headline{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(32px,5vw,52px);letter-spacing:-.04em;line-height:1;color:var(--parchment);margin-bottom:16px}
.final-headline em{font-style:italic;font-weight:300;color:var(--sage);display:block}
.final-sub{font-size:15px;line-height:1.65;color:var(--muted);margin-bottom:36px}
.btn-final{background:var(--sage);color:var(--forest);border:none;border-radius:14px;padding:16px 36px;font-family:'Fraunces',serif;font-weight:700;font-size:17px;letter-spacing:-.01em;cursor:pointer;text-decoration:none;display:inline-block;transition:background .12s,transform .1s}
.btn-final:hover{background:#8fd4a8;transform:translateY(-2px)}
.final-note{display:block;margin-top:14px;font-size:12px;color:var(--forest-mid);letter-spacing:.04em}
footer{background:var(--forest);border-top:1px solid var(--forest-mid);padding:32px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.footer-brand{display:flex;align-items:center;gap:8px}
.footer-name{font-family:'Fraunces',serif;font-weight:900;font-size:15px;letter-spacing:-.02em;color:var(--parchment)}
.footer-name em{font-style:italic;font-weight:300;color:var(--sage)}
.footer-tagline{font-size:11px;color:var(--forest-mid);letter-spacing:.04em}
.footer-links{display:flex;gap:24px}
.footer-link{font-size:12px;color:var(--muted);text-decoration:none;font-weight:500;transition:color .12s}
.footer-link:hover{color:var(--parchment)}
@media (max-width:800px){.hero-inner{grid-template-columns:1fr}.hero-visual{display:none}.materials-grid{grid-template-columns:1fr}.section-surveys{padding:64px 24px}.survey-cards{grid-template-columns:1fr}.pricing-body{grid-template-columns:1fr;gap:28px}nav{padding:0 20px}.nav-links .nav-link{display:none}footer{flex-direction:column;align-items:flex-start}.pricing-footer{flex-direction:column;align-items:flex-start}}
.reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
.reveal:global(.visible){opacity:1;transform:none}
.reveal-delay-1{transition-delay:.1s}.reveal-delay-2{transition-delay:.2s}.reveal-delay-3{transition-delay:.3s}
</style>
