<script lang="ts">
  import { MisLessonPlayer, type LessonScreen } from '@decyphr/misneach-ui';

  export let data: {
    courseTitle: string;
    screens: LessonScreen[];
  };
</script>

<svelte:head>
  <title>Try a lesson — Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#key `${data.courseTitle}-${data.screens.length}`}
  {#if data.screens.length}
    <MisLessonPlayer
      screens={data.screens}
      courseTitle={data.courseTitle}
      initialIndex={0}
      homeHref="/"
      showAuthLinks={true}
      signInHref="/auth/login"
      registerHref="/waitlist?interest=individual_course_access"
      showExit={false}
      primaryCtaHref="/waitlist?interest=individual_course_access"
      secondaryCtaHref="/pricing"
      primaryCtaLabel="Join waitlist to continue"
      secondaryCtaLabel="See pricing"
      reassureText="The full first unit is free. Join the waitlist for full access updates."
      continueLabel="Ar aghaidh — Continue"
      finishLabel="Criochnaithe — Finish"
      quizLockedLabel="Answer to continue"
      trackEnabled={true}
      plausiblePrefix="Taster Unit"
    />
  {:else}
    <main class="taster-empty">
      <h1>Couldn&apos;t load taster content</h1>
      <p>The lesson content is unavailable in this environment.</p>
      <a href="/" class="back-home">Back home</a>
    </main>
  {/if}
{/key}

<style>
  .taster-empty {
    min-height: 100vh;
    display: grid;
    place-items: center;
    gap: 10px;
    text-align: center;
    background: #1c2b22;
    color: #f5f0e8;
    font-family: 'Instrument Sans', sans-serif;
    padding: 24px;
  }

  .taster-empty h1 {
    font-family: 'Fraunces', serif;
    font-size: 32px;
    letter-spacing: -0.03em;
  }

  .taster-empty p {
    color: #7ec99a;
  }

  .back-home {
    margin-top: 4px;
    color: #1c2b22;
    background: #7ec99a;
    border-radius: 10px;
    padding: 10px 16px;
    text-decoration: none;
    font-weight: 600;
  }
</style>
