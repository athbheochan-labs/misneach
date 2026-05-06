<script lang="ts">
  import { onMount } from 'svelte';

  let openIndex: number | null = null;

  function toggleObj(index: number) {
    openIndex = openIndex === index ? null : index;
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.08 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll<HTMLElement>('.bc-fill[data-w]').forEach((bar) => {
            const width = bar.dataset.w || '0';
            setTimeout(() => {
              bar.style.width = `${width}%`;
            }, 100);
          });
          barObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    const chart = document.getElementById('barrier-chart');
    if (chart) barObserver.observe(chart);

    return () => {
      observer.disconnect();
      barObserver.disconnect();
    };
  });
</script>

<svelte:head>
  <title>Misneach - The numbers behind Irish in daily life</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700;1,9..144,900&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav>
  <a href="/" class="brand">Misne<em>ach</em></a>
  <div class="nav-links">
    <a href="/how-it-works">How it works</a>
    <details class="nav-dropdown">
      <summary class="nav-dd-label">Info packs</summary>
      <div class="nav-dropdown-menu">
        <a href="/info-packs/seachtain-na-gaeilge">Seachtain na Gaeilge</a>
        <a href="/info-packs/fleadh-cheoil">Fleadh Cheoil</a>
      </div>
    </details>
    <a href="/for-businesses">For businesses</a>
    <a href="/pricing">Pricing</a>
    <a href="/waitlist?interest=business_pack" class="nav-cta">Get started -&gt;</a>
  </div>
</nav>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow">The case for Irish in your cafe</div>
    <h1 class="hero-title">Your customers <em>already want this.</em></h1>
    <p class="hero-sub">Before you decide whether Misneach is right for your business, here are the numbers. Not our numbers - national polling data and language research. We didn't commission it. We just pay attention to it.</p>
    <div class="hero-stat-row">
      <div class="hero-stat">
        <div class="hero-stat-n">65%</div>
        <div class="hero-stat-l">want to see cupla focal used by most people daily</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-n">74%</div>
        <div class="hero-stat-l">want to improve or learn their Irish</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-n">473k</div>
        <div class="hero-stat-l">people can speak Irish but say they never do</div>
      </div>
    </div>
    <p class="hero-source">Sources: Ireland Thinks / The Good Information Project 2022 - Gaelchultur / Udaras na Gaeltachta / Amarach Research - CSO Census 2022</p>
  </div>
</div>

<div class="section reveal">
  <div class="section-eyebrow">The appetite</div>
  <h2 class="section-title">Most of your customers have <em>some</em> Irish.</h2>
  <p class="section-body">Irish is compulsory in schools for thirteen years. That means the overwhelming majority of adults who grew up in Ireland have at least a functional vocabulary - they just haven't had anywhere to use it. That's the gap Misneach closes.</p>

  <div class="stat-grid">
    <div class="stat-card dark">
      <div class="sc-num">40%</div>
      <div class="sc-label">of the population aged 3 and over can speak Irish - almost 1.9 million people</div>
      <div class="sc-source">CSO Census 2022</div>
    </div>
    <div class="stat-card mid">
      <div class="sc-num">66%</div>
      <div class="sc-label">express regret over not having better spoken Irish</div>
      <div class="sc-source">Gaelchultur / Udaras na Gaeltachta / Amarach Research</div>
    </div>
    <div class="stat-card light">
      <div class="sc-num">27%</div>
      <div class="sc-label">of 18-24 year olds self-report as fluent in Irish - significantly higher than older generations</div>
      <div class="sc-source">Ireland Thinks / The Good Information Project, 2022</div>
    </div>
  </div>

  <div class="insight-strip">
    <div class="is-mark">-&gt;</div>
    <div class="is-body">
      <div class="is-title">The problem has never been ability. It's been opportunity.</div>
      <div class="is-sub">There is no socially accepted moment to use Irish in a coffee shop. Nobody expects it, there's no signal it's welcome, and trying feels risky. Misneach creates the moment - the sign on the door, the trained staff, the permission to just say the thing.</div>
    </div>
  </div>

  <div class="insight-strip">
    <div class="is-mark">-&gt;</div>
    <div class="is-body">
      <div class="is-title">The problem has never been ability. It's been opportunity.</div>
      <div class="is-sub">Most language tools prepare people to speak Irish and then release them into a world that isn't ready to receive it. There's no signal that Irish is welcome. No moment where trying feels safe. Misneach creates that moment - the sign on the door, the trained staff, the permission to just say the thing.</div>
    </div>
  </div>
</div>

<div class="section reveal" style="padding-top:0">
  <div class="section-eyebrow">What they actually want</div>
  <h2 class="section-title">The barrier is social, <em>not linguistic.</em></h2>
  <p class="section-body">When you ask people why they don't use their Irish, the numbers tell a consistent story. It's rarely about ability.</p>

  <div class="stat-grid">
    <div class="stat-card dark" style="grid-column:span 2">
      <div class="sc-num" style="font-size:52px">75%</div>
      <div class="sc-label" style="font-size:14px;margin-top:8px">of people with basic Irish fluency say that people in their social circle don't use Irish - leaving them with no one to practise with and nowhere to try.</div>
      <div class="sc-source" style="margin-top:8px">ESRI / Foras na Gaeilge Irish Language Survey, 2013</div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card mid">
      <div class="sc-num">63%</div>
      <div class="sc-label">want to hear more Irish used in daily life. Only 14% say they wouldn't.</div>
      <div class="sc-source">Ireland Thinks / The Good Information Project, 2022</div>
    </div>
    <div class="stat-card light">
      <div class="sc-num">473k</div>
      <div class="sc-label">people declared they can speak Irish but never do - that's one in four Irish speakers.</div>
      <div class="sc-source">CSO Census 2022</div>
    </div>
  </div>

  <div class="insight-strip">
    <div class="is-mark">-&gt;</div>
    <div class="is-body">
      <div class="is-title">Your cafe can be the circle where people do use it.</div>
      <div class="is-sub">In Dundalk, two people set up an informal Irish conversation cafe called Caife agus Comhra. One of them said she couldn't hold a conversation in Irish two months before it started. It attracted people from Monaghan and Meath. The mix of levels helped everyone. No grammar police - just confidence. That's the Misneach model.</div>
    </div>
  </div>
</div>

<div class="section reveal" style="padding-top:0">
  <div class="section-eyebrow">What it does for your business</div>
  <h2 class="section-title">Community differentiation <em>is real.</em></h2>
  <p class="section-body">Independent cafes compete on character, not price. Irish-speaking status is a genuine differentiator - it creates a specific kind of regulars, attracts press attention, and generates organic word of mouth that can't be bought. And it's already happening, in five different places, in five different ways.</p>

  <div class="stat-grid">
    <div class="stat-card dark">
      <div class="sc-num">85%</div>
      <div class="sc-label">of customers at An Nead use some Irish when they come in. "People come in nervous, then they just go with the flow, then they're delighted."</div>
      <div class="sc-source">Courtney Nic Uilis, An Nead - RTE, 2026</div>
    </div>
    <div class="stat-card mid">
      <div class="sc-num">67%</div>
      <div class="sc-label">of people in the Republic hold a positive attitude towards the Irish language - up from 49% in 2001.</div>
      <div class="sc-source">ESRI / Amarach Research, 2013</div>
    </div>
    <div class="stat-card light">
      <div class="sc-num">0</div>
      <div class="sc-label">Irish-speaking cafe environments in most Irish towns right now. Whoever opens first becomes the one people talk about.</div>
    </div>
  </div>

  <div class="section-eyebrow" style="margin-top:48px">Already happening</div>
  <h2 class="section-title">Five places. <em>Five different ways.</em></h2>
  <p class="section-body">Nobody commissioned these. Nobody funded a campaign. These businesses just decided to make Irish part of what they do - and it worked.</p>

  <div style="display:flex;flex-direction:column;gap:1px;border-radius:16px;overflow:hidden;border:1px solid var(--parch-dark);margin-bottom:48px">
    <div style="background:white;padding:24px 28px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-0.02em">An Nead - Monaghan town</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#bbb">Since 2025</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:10px">A dedicated Irish language cafe grown from a ciorcal comhra. Flat out from day one. Local businesses nearby reported an increase in customers greeting them in Irish - a spillover nobody planned for.</p>
      <div class="pq-source" style="font-size:13px;color:var(--muted);line-height:1.6">According to the cafe manager, the overwhelming majority of customers use some Irish when they visit - including people who came in nervous. Neighbouring businesses reported a noticeable increase in Irish greetings on the street as a direct result. <em>(RTE, 2026)</em></div>
    </div>

    <div style="background:white;padding:24px 28px;border-top:1px solid var(--parch-dark)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-0.02em">Aon Sceal - Tallaght, Dublin</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#bbb">Since 2019</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:10px">Opened before An Cailin Ciuin, before Kneecap, before TikTok Irish. A Dublin suburb. Grew from a community group into a full hub - Irish classes, arts, music, a garden. Proof the demand predates the trend.</p>
      <div class="pq-source" style="font-size:13px;color:var(--muted);line-height:1.6">The cafe manager described the lack of similar spaces across Ireland as one of the biggest obstacles to people having the opportunity to use their Irish in daily life. Even customers who don't speak Irish reported enjoying simply hearing it used in a normal setting. <em>(Tallaght Echo / Dublin Inquirer, 2022)</em></div>
    </div>

    <div style="background:white;padding:24px 28px;border-top:1px solid var(--parch-dark)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-0.02em">Plamas - Galway</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#bbb">2022 - Award winner</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:10px">Named from the Irish for flattery. Gives a discount to customers who order in Irish. Won the Gradam Sheosaimh Ui Ogartaigh from Udaras na Gaeltachta in Tourism &amp; Hospitality - institutional recognition that this kind of business is valued.</p>
      <div class="pq-source" style="font-size:13px;color:var(--muted);line-height:1.6">The owner noted that nervousness about speaking Irish is common, but that the cafe environment gives people the confidence to try - and that most people have more Irish than they realise. <em>(2022)</em></div>
    </div>

    <div style="background:white;padding:24px 28px;border-top:1px solid var(--parch-dark)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-0.02em">Caife Anseo - Syddan, Co Meath</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#bbb">Opened 2025</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:10px">A coffee truck at a GAA pitch, run by an Irish teacher at weekends. Irish is part of the identity - not the whole premise. Busy from week three. GAA clubs, local schools, people driving in off the main road between Slane and Ardee.</p>
      <div class="pq-source" style="font-size:13px;color:var(--muted);line-height:1.6">The owner - an Irish teacher - wanted the business name to reflect something as Gaeilge from the start. Irish is woven into the identity of the truck without being its sole purpose. <em>(Meath Chronicle, 2025)</em></div>
    </div>

    <div style="background:white;padding:24px 28px;border-top:1px solid var(--parch-dark)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);letter-spacing:-0.02em">Caife agus Comhra - Dundalk, Co Louth</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#bbb">Pop-up - 2025</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:10px">Two people, no funding, no fixed venue. Started in a kitchen showroom. Attracted people from Monaghan and Meath. One founder couldn't hold a conversation in Irish two months before it started.</p>
      <div class="pq-source" style="font-size:13px;color:var(--muted);line-height:1.6">The organisers described the core goal as building confidence rather than testing fluency - no grammar police, all levels welcome. One co-founder had gone from no conversational Irish to running a multi-county Irish conversation event within two months. <em>(RTE, 2025)</em></div>
    </div>
  </div>

  <div class="insight-strip" style="margin-top:0;margin-bottom:32px">
    <div class="is-mark">"</div>
    <div class="is-body">
      <div class="is-title">A new generation isn't carrying the old baggage.</div>
      <div class="is-sub">A former school principal in Monaghan observed that younger Irish speakers today have no anxiety about the language - no association with compulsory schooling or Peig Sayers. They learned Irish, they use it, and that's the end of it. That shift is already visible in who's walking through the doors of these cafes. <em>(RTE, 2026)</em></div>
    </div>
  </div>

  <div class="insight-strip" style="margin-top:32px">
    <div class="is-mark">-&gt;</div>
    <div class="is-body">
      <div class="is-title">None of these are outliers. They're a pattern.</div>
      <div class="is-sub">Monaghan, Dublin, Galway, Meath, Louth. Dedicated cafes, coffee trucks, pop-ups. Founded by community groups, teachers, managers. Since 2019. The demand has been there for years. What most towns are missing isn't the appetite - it's the place.</div>
    </div>
  </div>

  <div class="insight-strip" style="margin-top:16px">
    <div class="is-mark">↑</div>
    <div class="is-body">
      <div class="is-title">The staff story matters too.</div>
      <div class="is-sub">Misneach is entirely optional for staff at every stage. But for staff who are interested, it's a genuine upskilling opportunity - a language qualification, a new skill on their CV, and something they might actually enjoy. That's a meaningful benefit, not a burden.</div>
    </div>
  </div>
</div>

<div class="section reveal" style="padding-top:0">
  <div class="section-eyebrow">Common questions</div>
  <h2 class="section-title">Things worth <em>asking.</em></h2>
  <p class="section-body">These are the questions most cafe owners ask us. We'd rather answer them here than have you wonder.</p>

  <div class="obj-grid">
    {#each [
      {
        q: 'What exactly do my staff have to do?',
        a: "Nothing they're not comfortable with. Participation is entirely voluntary at every level. The most basic version is just having the window sign up - that signals to customers that Irish is welcome here. Staff who have some Irish and want to use it can. Staff who don't, or who don't want to, don't have to. The sign does most of the work."
      },
      {
        q: "What if my staff don't have any Irish?",
        a: "That's exactly what the course is for. Misneach gives every staff member access to a short, practical Irish course - not grammar, just the phrases they'd actually use at a counter. It's designed to take about an hour to get to a usable level. It's entirely optional - but for staff who are interested, it's a real upskilling benefit they can put on their CV."
      },
      {
        q: "What if a customer doesn't have Irish and feels left out?",
        a: "The framing is always Irish is welcome here, not Irish is required. Staff greet in English unless a customer opens in Irish. The sign and the badge don't change the default - they just remove the uncertainty for the customer who wants to try. Nobody is excluded."
      },
      {
        q: 'Will it slow down service?',
        a: "No. The phrases used are the phrases already used in service - ordering, confirming, thanking. The course trains staff on exactly these exchanges. Once they're comfortable, it adds nothing to service time."
      },
      {
        q: "What's in the kit and when does it arrive?",
        a: 'The Failte Kit contains: a window or door sign, staff badge lanyards, and a pack of customer cheatsheet cards for the counter. Typically arrives within a week of signing up. Digital materials are available immediately.'
      },
      {
        q: 'Can I try it for a limited time before committing?',
        a: "Yes. Seachtain na Gaeilge is a natural starting point - it gives you a culturally accepted moment to try Irish in your cafe without it feeling like a unilateral decision."
      },
      {
        q: 'What does it cost?',
        a: "The Failte Kit is EUR49 one-time, which covers all staff, all physical materials, and full access to the course. There's an optional EUR29/year renewal for updated materials and continued course access."
      },
      {
        q: 'Has anyone else done this? Does it actually work?',
        a: 'Misneach is new. What we do have is evidence the model works across five real venues. The demand is real and it is national. The question is whether your town has a place for it yet.'
      }
    ] as item, index}
      <div class="obj-item" class:open={openIndex === index}>
        <button class="obj-toggle" on:click={() => toggleObj(index)}>
          <span class="obj-q">{item.q}</span>
          <span class="obj-chevron">↓</span>
        </button>
        <div class="obj-body">{item.a}</div>
      </div>
    {/each}
  </div>
</div>

<div class="section reveal" style="padding-top:0">
  <div class="section-eyebrow">Not convinced by the national numbers?</div>
  <h2 class="section-title">Ask your own <em>people.</em></h2>
  <p class="section-body">National polling is useful context. But what matters most is what your specific customers and your specific staff think. We've built two short surveys you can use - one for customers, one for staff. Free, branded, shareable in under a minute.</p>

  <div class="survey-grid">
    <div class="survey-card dark">
      <div class="sv-eyebrow">For your customers</div>
      <div class="sv-title">Would Irish work here?</div>
      <div class="sv-body">Four questions. Under a minute. Share the link on your social or put a QR code on the counter. See what your actual customers think before you decide anything.</div>
      <a href="/survey/setup" class="sv-btn">Start customer appetite survey -&gt;</a>
    </div>
    <div class="survey-card light">
      <div class="sv-eyebrow">For your staff</div>
      <div class="sv-title">What does your team think?</div>
      <div class="sv-body">A short, anonymous survey for your staff. No pressure, no commitment - just a way to find out who's interested and what their current level is, before you make any decisions.</div>
      <a href="/survey/setup" class="sv-btn">Start staff appetite survey -&gt;</a>
    </div>
  </div>
</div>

<div class="bottom-cta">
  <div class="bc-inner">
    <div class="bc-eyebrow">Ready to talk?</div>
    <h2 class="bc-title">Be the first cafe in <em>your town.</em></h2>
    <p class="bc-body">There are no Irish-speaking cafe environments in most Irish towns right now. Misneach is looking for the right first partners - places with character, owners who care, staff who might be interested. If that sounds like you, let's have a conversation.</p>
    <div class="bc-btns">
      <a href="/waitlist?interest=business_pack" class="bc-btn primary">Get started -&gt;</a>
      <a href="/for-businesses" class="bc-btn ghost">Learn more about the kit</a>
    </div>
  </div>
</div>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--forest:#1c2b22;--green:#2d7a50;--sage:#7ec99a;--parchment:#f5f0e8;--parch-dark:#e8e0d0;--muted:#5a7a64;--ink:#1a1a18}
html{scroll-behavior:smooth}
body{font-family:'Instrument Sans',sans-serif;background:var(--parchment);color:var(--ink);-webkit-font-smoothing:antialiased}
nav{padding:20px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--parch-dark);position:sticky;top:0;background:var(--parchment);z-index:20}
.brand{font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-.04em;color:var(--forest);text-decoration:none}
.brand em{font-style:italic;font-weight:300;color:var(--green)}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{font-size:13px;font-weight:600;color:var(--muted);text-decoration:none;transition:color .15s}
.nav-links a:hover{color:var(--forest)}
.nav-dropdown{position:relative}
.nav-dd-label{list-style:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--muted)}
.nav-dd-label::-webkit-details-marker{display:none}
.nav-dropdown-menu{
  position:absolute;top:calc(100% + 10px);left:0;min-width:220px;
  border:1px solid rgba(28,43,34,.12);border-radius:10px;background:#fff;
  box-shadow:0 14px 30px -12px rgba(28,43,34,.35);overflow:hidden;display:none;z-index:20
}
.nav-dropdown[open] .nav-dropdown-menu{display:block}
.nav-dropdown-menu a{display:block;padding:10px 12px;font-size:12px}
.nav-cta{background:var(--forest);color:var(--parchment)!important;padding:9px 18px;border-radius:8px;font-size:13px!important}
.nav-cta:hover{background:#253b2e!important}
.hero{background:var(--forest);padding:88px 40px 72px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 10%,rgba(126,201,154,.07) 0%,transparent 55%),radial-gradient(ellipse at 5% 90%,rgba(45,122,80,.2) 0%,transparent 50%);pointer-events:none}
.hero-inner{max-width:780px;position:relative}
.hero-eyebrow{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:16px}
.hero-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(34px,5.5vw,58px);letter-spacing:-.04em;color:var(--parchment);line-height:1;margin-bottom:14px}
.hero-title em{font-style:italic;font-weight:300;color:var(--sage)}
.hero-sub{font-size:16px;color:rgba(245,240,232,.45);line-height:1.7;max-width:560px;margin-bottom:36px}
.hero-stat-row{display:flex;gap:40px;flex-wrap:wrap}
.hero-stat{display:flex;flex-direction:column;gap:4px}
.hero-stat-n{font-family:'Fraunces',serif;font-weight:900;font-size:44px;letter-spacing:-.05em;color:var(--sage);line-height:1}
.hero-stat-l{font-size:13px;color:rgba(245,240,232,.35);line-height:1.4;max-width:140px}
.hero-source{margin-top:28px;font-size:11px;color:rgba(245,240,232,.2);font-style:italic}
.section{max-width:900px;margin:0 auto;padding:72px 40px}
.section+.section{padding-top:0}
.section-eyebrow{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);font-weight:700;display:flex;align-items:center;gap:12px;margin-bottom:32px}
.section-eyebrow::after{content:'';flex:1;height:1px;background:var(--parch-dark)}
.section-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(26px,4vw,38px);letter-spacing:-.04em;color:var(--forest);line-height:1.05;margin-bottom:12px}
.section-title em{font-style:italic;font-weight:300;color:var(--green)}
.section-body{font-size:15px;color:#555;line-height:1.75;max-width:620px;margin-bottom:40px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:48px}
.stat-card{border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;gap:8px}
.stat-card.dark{background:var(--forest)}
.stat-card.mid{background:#e0ede5;border:1px solid #cce0d4}
.stat-card.light{background:white;border:1px solid var(--parch-dark)}
.sc-num{font-family:'Fraunces',serif;font-weight:900;font-size:52px;letter-spacing:-.06em;line-height:1}
.stat-card.dark .sc-num{color:var(--sage)}
.stat-card.mid .sc-num{color:var(--forest)}
.stat-card.light .sc-num{color:var(--green)}
.sc-label{font-size:13px;line-height:1.45}
.stat-card.dark .sc-label{color:rgba(245,240,232,.4)}
.stat-card.mid .sc-label{color:var(--muted)}
.stat-card.light .sc-label{color:#777}
.sc-source{font-size:10px;margin-top:4px;font-style:italic}
.stat-card.dark .sc-source{color:rgba(245,240,232,.18)}
.stat-card.mid .sc-source{color:#aaa}
.stat-card.light .sc-source{color:#ccc}
.insight-strip{background:var(--sage);border-radius:20px;padding:36px 40px;margin-bottom:48px;display:flex;gap:28px;align-items:flex-start}
.is-mark{font-family:'Fraunces',serif;font-weight:900;font-size:56px;letter-spacing:-.06em;color:var(--forest);line-height:1;flex-shrink:0}
.is-title{font-family:'Fraunces',serif;font-weight:700;font-size:20px;letter-spacing:-.02em;color:var(--forest);margin-bottom:6px;line-height:1.2}
.is-sub{font-size:14px;color:rgba(28,43,34,.55);line-height:1.65}
.obj-grid{display:flex;flex-direction:column;gap:1px;border-radius:16px;overflow:hidden;border:1px solid var(--parch-dark)}
.obj-item{background:white;padding:0}
.obj-toggle{width:100%;background:none;border:none;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;text-align:left;gap:16px;border-bottom:1px solid var(--parch-dark)}
.obj-item:last-child .obj-toggle{border-bottom:none}
.obj-q{font-family:'Fraunces',serif;font-weight:700;font-size:16px;color:var(--forest);letter-spacing:-.02em;line-height:1.3}
.obj-chevron{color:var(--muted);font-size:18px;flex-shrink:0;transition:transform .25s}
.obj-item.open .obj-chevron{transform:rotate(180deg)}
.obj-body{display:none;padding:0 24px 22px;font-size:14px;color:#555;line-height:1.75;border-bottom:1px solid var(--parch-dark)}
.obj-item.open .obj-body{display:block}
.obj-item:last-child .obj-body{border-bottom:none}
.survey-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.survey-card{border-radius:16px;padding:28px 24px}
.survey-card.dark{background:var(--forest)}
.survey-card.light{background:white;border:1.5px solid var(--parch-dark)}
.sv-eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:10px}
.sv-title{font-family:'Fraunces',serif;font-weight:900;font-size:18px;letter-spacing:-.03em;color:var(--parchment);line-height:1.15;margin-bottom:8px}
.survey-card.light .sv-title{color:var(--forest)}
.sv-body{font-size:13px;line-height:1.6;margin-bottom:18px}
.survey-card.dark .sv-body{color:rgba(245,240,232,.4)}
.survey-card.light .sv-body{color:#777}
.sv-btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:9px;padding:10px 16px;font-family:'Fraunces',serif;font-weight:700;font-size:13px;letter-spacing:-.01em;cursor:pointer;text-decoration:none;transition:background .15s}
.survey-card.dark .sv-btn{background:var(--parchment);color:var(--forest)}
.survey-card.dark .sv-btn:hover{background:white}
.survey-card.light .sv-btn{background:var(--forest);color:var(--parchment)}
.survey-card.light .sv-btn:hover{background:#253b2e}
.bottom-cta{background:var(--forest);padding:88px 40px;position:relative;overflow:hidden}
.bottom-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 85% 15%,rgba(126,201,154,.08) 0%,transparent 55%);pointer-events:none}
.bc-inner{max-width:620px;position:relative}
.bc-eyebrow{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:14px}
.bc-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(28px,4.5vw,44px);letter-spacing:-.04em;color:var(--parchment);line-height:1.05;margin-bottom:12px}
.bc-title em{font-style:italic;font-weight:300;color:var(--sage)}
.bc-body{font-size:15px;color:rgba(245,240,232,.4);line-height:1.7;max-width:480px;margin-bottom:28px}
.bc-btns{display:flex;gap:12px;flex-wrap:wrap}
.bc-btn{display:inline-flex;align-items:center;gap:9px;border-radius:10px;padding:14px 22px;font-family:'Fraunces',serif;font-weight:700;font-size:15px;letter-spacing:-.02em;cursor:pointer;text-decoration:none;border:none;transition:background .15s}
.bc-btn.primary{background:var(--parchment);color:var(--forest)}
.bc-btn.primary:hover{background:white}
.bc-btn.ghost{background:transparent;color:rgba(245,240,232,.5);border:1.5px solid rgba(245,240,232,.15)}
.bc-btn.ghost:hover{color:var(--parchment);border-color:rgba(245,240,232,.35)}
.reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
.reveal:global(.visible){opacity:1;transform:translateY(0)}
@media(max-width:640px){nav{padding:16px 20px}.nav-links{gap:16px}.hero{padding:60px 20px 52px}.section{padding:52px 20px}.hero-stat-row{gap:24px}.hero-stat-n{font-size:36px}.survey-grid{grid-template-columns:1fr}.insight-strip{flex-direction:column;gap:12px;padding:28px 24px}.bottom-cta{padding:60px 20px}}
</style>
