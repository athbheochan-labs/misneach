<script lang="ts">
  import InfoPackPage from '$lib/components/InfoPackPage.svelte';
  const year = new Date().getFullYear();

  const tabs = [
    {
      id: 'greetings',
      label: 'Greetings',
      phrases: [
        { irish: 'Dia duit', english: 'Hello', phonetic: 'dee-ah gwit' },
        { irish: 'Conas atá tú?', english: 'How are you?', phonetic: 'kun-us ah-taw too' },
        { irish: 'Tá mé go maith', english: "I'm well", phonetic: 'taw may guh mah' },
      ],
    },
    {
      id: 'cafe',
      label: 'In a café',
      phrases: [
        { irish: 'Caife, le do thoil', english: 'Coffee, please', phonetic: 'kaf-eh leh duh hull' },
        { irish: 'Cé mhéad atá air?', english: 'How much is it?', phonetic: 'kay vayd ah-taw er' },
        { irish: 'Go raibh maith agat', english: 'Thank you', phonetic: 'guh rev mah ah-gut' },
      ],
    },
    {
      id: 'small-talk',
      label: 'Small talk',
      phrases: [
        { irish: 'An bhfuil Gaeilge agat?', english: 'Do you speak Irish?', phonetic: 'un will gway-liga ah-gut' },
        { irish: 'Tá cúpla focal agam', english: 'I have a few words', phonetic: 'taw koop-la fuk-ul ah-gum' },
        { irish: 'Slán', english: 'Goodbye', phonetic: 'slawn' },
      ],
    },
  ];

  const bizCards = [
    {
      num: '01',
      title: 'Put a visible fáilte sign in your window',
      body: 'Show customers Irish is welcome here before anyone has to take a social risk.',
    },
    {
      num: '02',
      title: 'Train staff on one phrase this week',
      body: 'One phrase used consistently beats a long list never used.',
    },
    {
      num: '03',
      title: 'Add bilingual labels to your menu board',
      body: 'Small visual prompts reduce friction and invite participation.',
    },
    {
      num: '04',
      title: 'Let willing staff lead with Irish',
      body: 'Give people permission to start small and use what they already have.',
    },
  ];
</script>

<InfoPackPage
  pageTitle="Misneach — Seachtain na Gaeilge Info Pack"
  navEvent={`Seachtain na Gaeilge ${year}`}
  heroEyebrow="1–17 Márta · 1–17 March"
  heroTitleLine1="Seachtain"
  heroTitleLine2="na Gaeilge"
  heroDates="Irish Language Week"
  heroIntro="A few words goes a long way. This pack gives you practical phrases and actions for real places."
  aboutTag="About the week"
  aboutHeadline="The biggest Irish language <em>celebration</em> in the world"
  aboutBody1="Every March, Seachtain na Gaeilge invites everyone — speakers, learners, and complete beginners — to use Irish in daily life."
  aboutBody2="You do not need fluency. You need one phrase, used once, in a real interaction."
  phrasesHeadline="Handy phrases <em>to try this week</em>"
  phrasesSub="Tap any phrase to hear it in Irish."
  phraseTabs={tabs}
  courseHeadline="Try ordering a coffee <em>as Gaeilge</em>"
  courseBody="The first Misneach unit is free and built for real-world conversation."
  bizTag="For local businesses"
  bizHeadline="Four things you can do <em>this week</em>"
  bizIntro="Practical moves that make Irish visible and usable in your space."
  bizCards={bizCards}
  signpostBody="Misneach is a practical platform for Irish in real contexts — cafés, shops, and everyday conversations."
  footerNote={`Seachtain na Gaeilge ${year} · 1–17 Márta`}
/>
