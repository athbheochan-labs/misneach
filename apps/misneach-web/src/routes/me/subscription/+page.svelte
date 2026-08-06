<svelte:head>
  <title>Subscription - Misneach</title>
</svelte:head>

<div class="page">
  <header class="subhead">
    <a href="/me" class="back" aria-label="Back to Me">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
    </a>
    <div>
      <p class="eyebrow">Subscription</p>
      <h1>Your plan</h1>
    </div>
  </header>

  <section class="plan-card">
    <div class="badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      Early adopter
    </div>
    <h2>Misne<em>ach</em></h2>
    <p class="price">Locked in at EUR 4.99/month forever</p>

    <div class="features">
      <div><span>✓</span> Full course access - all units</div>
      <div><span>✓</span> Phrasebook and flashcards</div>
      <div><span>✓</span> Real-world challenges</div>
      <div><span>✓</span> New individual courses while active</div>
    </div>
  </section>

  <section class="details">
    <div class="section-label">Billing</div>
    <div class="row"><span>Status</span><strong class="green">Active</strong></div>
    <div class="row"><span>Next payment</span><strong>1 May 2025</strong></div>
    <div class="row"><span>Amount</span><strong>EUR 4.99 / month</strong></div>
    <div class="row"><span>Payment method</span><strong>Visa ending 4242</strong></div>
  </section>

  <section class="details">
    <div class="section-label">Manage</div>
    <button type="button" class="action">
      <span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg></span>
      Update payment method
      <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
    </button>
    <button type="button" class="action">
      <span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
      View invoices
      <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </section>

  <button type="button" class="cancel">Cancel subscription</button>
</div>

<style>
  .page {
    display: grid;
    gap: 14px;
    max-width: 860px;
  }

  .subhead {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .back {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #e8e0d0;
    color: #1c2b22;
    display: grid;
    place-items: center;
  }

  .eyebrow,
  .section-label {
    margin: 0 0 7px;
    color: #5a7a64;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
    font-family: 'Fraunces', serif;
    letter-spacing: -0.03em;
  }

  h1 {
    font-size: clamp(28px, 4vw, 42px);
    color: #1c2b22;
  }

  .plan-card {
    border-radius: 18px;
    background: #1c2b22;
    color: #f5f0e8;
    padding: clamp(22px, 4vw, 34px);
    position: relative;
    overflow: hidden;
  }

  .plan-card::after {
    content: '';
    position: absolute;
    right: -70px;
    bottom: -80px;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: rgba(45, 122, 80, 0.18);
  }

  .badge,
  .features,
  .price,
  .plan-card h2 {
    position: relative;
    z-index: 1;
  }

  .badge {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    border: 1px solid rgba(126, 201, 154, 0.24);
    background: rgba(126, 201, 154, 0.16);
    color: #7ec99a;
    padding: 5px 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .plan-card h2 {
    margin-top: 14px;
    color: #f5f0e8;
    font-size: clamp(34px, 5vw, 56px);
  }

  .plan-card h2 em {
    color: #7ec99a;
    font-style: italic;
    font-weight: 300;
  }

  .price {
    margin: 6px 0 20px;
    color: rgba(245, 240, 232, 0.55);
    font-weight: 600;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 18px;
    color: rgba(245, 240, 232, 0.72);
    font-size: 14px;
  }

  .features span {
    color: #7ec99a;
    font-weight: 900;
    margin-right: 6px;
  }

  .details {
    border: 1px solid #e8e0d0;
    border-radius: 16px;
    background: #fffdf8;
    overflow: hidden;
    padding-top: 14px;
  }

  .details .section-label {
    padding: 0 18px;
  }

  .row,
  .action {
    min-height: 54px;
    padding: 0 18px;
    border-top: 1px solid #e8e0d0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .row span {
    color: #1c2b22;
    font-weight: 700;
    font-size: 14px;
  }

  .row strong {
    color: #787f79;
    font-size: 14px;
  }

  .row strong.green {
    color: #2d7a50;
  }

  .action {
    width: 100%;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    background: transparent;
    color: #1c2b22;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    text-align: left;
  }

  .icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #e8e0d0;
    color: #5a7a64;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .arrow {
    color: #b9b0a0;
    margin-left: auto;
  }

  .cancel {
    border: 1px solid #e8e0d0;
    border-radius: 13px;
    background: transparent;
    color: #8d968f;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    padding: 13px 18px;
  }

  @media (max-width: 680px) {
    .features {
      grid-template-columns: 1fr;
    }

    .row {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      padding: 12px 18px;
    }
  }
</style>
