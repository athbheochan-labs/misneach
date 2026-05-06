<script lang="ts">
  import InfoPackPage from '$lib/components/InfoPackPage.svelte';
  const year = new Date().getFullYear();

  const tabs = [
    {
      id: 'session',
      label: 'At the session',
      phrases: [
        { irish: 'Cén port é sin?', english: 'What tune is that?', phonetic: 'kayn port ay shin' },
        { irish: 'Arís é!', english: 'Again!', phonetic: 'ah-reesh ay' },
        { irish: 'Go hiontach!', english: 'Brilliant!', phonetic: 'guh hun-tukh' },
      ],
    },
    {
      id: 'pub',
      label: 'In the pub',
      phrases: [
        { irish: 'Pionta Guinness, le do thoil', english: 'A pint of Guinness, please', phonetic: 'pyun-tah gwin-iss leh duh hull' },
        { irish: 'Sláinte!', english: 'Cheers!', phonetic: 'slawn-cheh' },
        { irish: 'Ceann eile?', english: 'Another one?', phonetic: 'kyan el-eh' },
      ],
    },
    {
      id: 'craic',
      label: 'The craic',
      phrases: [
        { irish: 'Cad é mar atá an craic?', english: "How's the craic?", phonetic: 'kah-jay mar ah-taw un krak' },
        { irish: 'Is aoibhinn liom an ceol', english: 'I love the music', phonetic: 'iss ee-vin lyum un kyole' },
        { irish: 'Oíche mhaith', english: 'Good night', phonetic: 'ee-heh wah' },
      ],
    },
  ];

  const bizCards = [
    {
      num: '01',
      title: 'Mark your venue as Gaeilge fáilte',
      body: 'A visible signal helps visitors know Irish is genuinely welcome in your space.',
    },
    {
      num: '02',
      title: 'Announce sessions bilingually',
      body: 'Simple bilingual notices create confidence and participation.',
    },
    {
      num: '03',
      title: 'Use one Irish welcome phrase nightly',
      body: 'Consistency matters more than complexity during a busy festival week.',
    },
    {
      num: '04',
      title: 'Give Irish-speaking staff permission to lead',
      body: 'Small social permission changes customer behaviour fast.',
    },
  ];
</script>

<InfoPackPage
  pageTitle="Misneach — Fleadh Cheoil Info Pack"
  navEvent={`Fleadh Cheoil ${year}`}
  heroEyebrow={`Inis · 8–17 Lúnasa ${year}`}
  heroTitleLine1="Fleadh"
  heroTitleLine2="Cheoil"
  heroDates="The all-Ireland festival of music and song"
  heroIntro="The Fleadh is the heartbeat of Irish music. This pack helps people join in with practical Irish."
  aboutTag="About the Fleadh"
  aboutHeadline="Half a million people, <em>one living language</em>"
  aboutBody1="Fleadh Cheoil na hÉireann is the largest traditional Irish music gathering in the world."
  aboutBody2="Irish and music are deeply linked. A few useful phrases make participation easier immediately."
  phrasesHeadline="Phrases for <em>the session</em>"
  phrasesSub="Tap any phrase to hear it in Irish."
  phraseTabs={tabs}
  courseHeadline="Learn the language <em>behind the music</em>"
  courseBody="Misneach gives learners practical conversational Irish for places like sessions, cafés, and pubs."
  bizTag="For venues and session pubs"
  bizHeadline="Make your venue feel <em>as Gaeilge</em> this week"
  bizIntro="Small practical steps that change how visitors experience your space."
  bizCards={bizCards}
  signpostBody="Misneach helps people use Irish in real contexts. The first unit is free and built for immediate use."
  footerNote={`Fleadh Cheoil ${year} · Inis · 8–17 Lúnasa`}
/>
