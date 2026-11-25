export type PodcastLengthPreset = 'short' | 'medium' | 'long';
export type PodcastAngle = 'oversikt' | 'praksisnaer' | 'eksamen';
export type PodcastSpeaker = 'Programleder' | 'Ekspert';

export interface PodcastDialogueLine {
  speaker: PodcastSpeaker;
  text: string;
}

export interface PodcastEpisode {
  id: string;
  userId?: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  lengthPreset: PodcastLengthPreset;
  angle: PodcastAngle;
  focusNote?: string;
  sourceTitles: string[];
  wordCount: number;
  dialogue: PodcastDialogueLine[];
  createdAt: string;
}

export interface PodcastLengthOption {
  id: PodcastLengthPreset;
  label: string;
  shortLabel: string;
  estimatedMinutes: number;
  wordRangeLabel: string;
  minWords: number;
  maxWords: number;
  targetWords: number;
  targetTurns: string;
  description: string;
}

export interface PodcastAngleOption {
  id: PodcastAngle;
  label: string;
  description: string;
  promptDirective: string;
}

export interface PodcastPresetTopic {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  sourceContent: string;
}

export const PODCAST_LENGTH_OPTIONS: PodcastLengthOption[] = [
  {
    id: 'short',
    label: 'Kort (ca. 5 min)',
    shortLabel: '5 min',
    estimatedMinutes: 5,
    wordRangeLabel: '650–750 ord',
    minWords: 650,
    maxWords: 750,
    targetWords: 700,
    targetTurns: '14–18',
    description: 'Kjapp oversikt over kjernebegreper og sentrale teoretikere.'
  },
  {
    id: 'medium',
    label: 'Medium (ca. 10 min)',
    shortLabel: '10 min',
    estimatedMinutes: 10,
    wordRangeLabel: '1 300–1 500 ord',
    minWords: 1300,
    maxWords: 1500,
    targetWords: 1400,
    targetTurns: '24–32',
    description: 'Grundig gjennomgang koblet til praktiske eksempler fra barnehagehverdagen.'
  },
  {
    id: 'long',
    label: 'Lang (ca. 20 min)',
    shortLabel: '20 min',
    estimatedMinutes: 20,
    wordRangeLabel: '2 500–2 800 ord',
    minWords: 2500,
    maxWords: 2800,
    targetWords: 2600,
    targetTurns: '42–56',
    description: 'Dybdedrøfting, ulike perspektiver, kritiske spørsmål og eksamensvinkling.'
  }
];

export const PODCAST_ANGLE_OPTIONS: PodcastAngleOption[] = [
  {
    id: 'oversikt',
    label: 'Oversikt',
    description: 'Kjernebegreper, rød tråd og klare forklaringer av teoretikere.',
    promptDirective:
      'Strukturer samtalen som en klar, pedagogisk oversikt. Sørg for at hovedbegreper, sentrale teoretikere og sammenhengen mellom dem blir forklart på en tydelig og huskevennlig måte.'
  },
  {
    id: 'praksisnaer',
    label: 'Praksisnær',
    description: 'Teorien oversatt til konkrete hverdagssituasjoner i barnehagen.',
    promptDirective:
      'Forankre hvert teoretisk poeng i konkrete, levende praksiseksempler fra barnehagehverdagen (f.eks. garderobesituasjoner, frilek ute, samlingsstund, måltider og foreldresamarbeid). Programlederen spør ofte: "Hvordan ser dette egentlig ut på avdelingen?"'
  },
  {
    id: 'eksamen',
    label: 'Eksamensdrøfting',
    description: 'Kritiske spørsmål, ulike perspektiver og hvordan man drøfter til toppkarakter.',
    promptDirective:
      'Ha en skarp eksamens- og drøftingsvinkling. Programlederen stiller kritiske oppfølgingsspørsmål, tester mulige motargumenter og utfordrer Eksperten på hvordan studenten kan drøfte dette opp mot Rammeplanen, Barnehageloven og profesjonsetiske dilemmaer til en sterk eksamensbesvarelse.'
  }
];

export const PODCAST_PRESET_TOPICS: PodcastPresetTopic[] = [
  {
    id: 'risikolek',
    title: 'Risikofylt lek & lekemiljø',
    subtitle: 'Sandseter, Gibson (affordance), risikomestring og personalets rolle',
    category: 'Lek & Utvikling',
    sourceContent: `TEMA: Risikofylt lek og lekemiljø i barnehagen.
Sentrale kilder og begreper:
- Ellen Beate Hansen Sandseter: Risikofylt lek definert som spennende og utfordrende lek som innebærer risiko for mindre fysisk skade. De 6 (senere 8) kategoriene: store høyder, høy fart, farlige redskaper (kniv, sag, hammer), farlige elementer (vann, bål, bratte skrenter), herjelek/brytekamp (rough-and-tumble play), og å forsvinne/gjemme seg.
- James J. Gibson: Begrepet "affordance" (handlingsmuligheter) i det fysiske miljøet – hvordan trær, steiner, skråninger og løse materialer inviterer barn til variert kroppslig lek.
- Rasmus Kleppe, Ole Johan Sando og Sandseter: Integrerte tumlearealer og hvordan ansattes risikovurdering og sikkerhetsfokus kan fremme eller hemme barns mestringstro (Albert Bandura).
- Rammeplan for barnehagen (2017): Barnehagen skal legge til rette for utfordrende og meningsfull lek, kroppslig mestring og livsglede, og personalet må skille mellom reell fare (alvorlig skade) og sunn utfordring.`
  },
  {
    id: 'rammeplan-medvirkning',
    title: 'Rammeplan & barns medvirkning',
    subtitle: 'Barnehageloven § 3, danning, anerkjennelse og maktforhold',
    category: 'Lovverk & Verdigrunnlag',
    sourceContent: `TEMA: Barns medvirkning, danning og demokratisk praksis i barnehagen.
Sentrale kilder og begreper:
- Barnehageloven § 3 og FNs barnekonvensjon artikkel 12: Barns rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet, og få jevnlig mulighet til aktiv deltakelse i planlegging og vurdering, tilpasset alder og forutsetninger.
- Berit Bae: Anerkjennende relasjoner, å lytte med et "tredje øre", skille mellom romslige og trange samhandlingsmønstre, og bevissthet rundt voksnes definisjonsmakt.
- Danning i Rammeplanen (2017): En helhetlig, gjensidig prosess der barnet utvikler selvstendighet, etisk dømmekraft og evne til å delta i demokratiske fellesskap – i motsetning til passiv tilpasning eller ren sosialisering.
- Små barns kroppslige medvirkning (Gunvor Løkken): Hvordan de yngste barna (1–2 år) medvirker gjennom blikk, kroppsspråk, bevegelse, lyder og motstand, og hva det krever av personalets tilstedeværelse.`
  },
  {
    id: 'teoretikere',
    title: 'Sentrale teoretikere i BLU',
    subtitle: 'Vygotskij, Corsaro, Dewey, Bae og Bronfenbrenner i samspill',
    category: 'Pedagogisk teori',
    sourceContent: `TEMA: Sentrale pedagogiske og utviklingspsykologiske teoretikere i barnehagelærerutdanningen.
Sentrale kilder og begreper:
- Lev Vygotskij: Sosiokulturell læringsteori, den proksimale utviklingssonen (ZPD) og stillasbygging (scaffolding, utdypet av Bruner/Wood). Språk og sosialt samspill som grunnlag for kognitiv utvikling.
- William Corsaro: Fortolkende reproduksjon (interpretive reproduction) og barns jevnalderkultur (peer culture). Barn kopierer ikke bare voksenverdenen, men omskaper den kreativt i egen lek, og beskytter lekerommet sitt.
- John Dewey: Erfaringsbasert læring ("learning by doing"), demokratisk oppdragelse og sammenhengen mellom aktiv handling og refleksjon.
- Urie Bronfenbrenner: Utviklingsøkologisk modell (mikro-, meso-, ekso-, makro- og kronosystem) – hvordan samarbeid mellom hjem og barnehage (mesosystemet) påvirker barnets trivsel og utvikling.
- Berit Bae: Subjekt-til-subjekt-møter og hverdagssamtalers betydning for barns selvfølelse.`
  },
  {
    id: 'ledelse-etikk',
    title: 'Pedagogisk ledelse & profesjonsetikk',
    subtitle: 'Ledelse i praksis, refleksjonskultur, makt og profesjonsfaglig skjønn',
    category: 'Ledelse & Etikk',
    sourceContent: `TEMA: Pedagogisk ledelse, veiledning og profesjonsetikk i barnehagen.
Sentrale kilder og begreper:
- Rammeplanen (2017) om pedagogisk leder: Ansvar for å iverksette og lede det pedagogiske arbeidet, veilede og sørge for at Barnehageloven og Rammeplanen oppfylles gjennom praksis.
- Marit Bøe og Karin Hognestad: Hybrid ledelse i barnehagen – balansen mellom å være nær praksis sammen med barn og kolleger på gulvet, samtidig som man leder, utfordrer og holder faglig retning.
- Profesjonsfaglig skjønn og Barnehagelærerprofesjonens etiske plattform: Evnen til å gjøre kloke, verdibaserte vurderinger i uforutsigbare situasjoner der regler og rutiner alene ikke gir fasit.
- Lærende organisasjon og pedagogisk dokumentasjon: Hvordan avdelingsmøter, felles refleksjon og åpen tilbakemeldingskultur skaper kvalitet, og hvordan man håndterer motstand mot endring i personalgruppen.`
  }
];

export type PodcastVoiceEngine = 'browser' | 'ai';
export type PodcastAiQuality = 'standard' | 'studio';
export type PodcastAiVoiceId = 'Kore' | 'Charon' | 'Puck' | 'Fenrir' | 'Zephyr';

export interface PodcastAiVoiceOption {
  id: PodcastAiVoiceId;
  label: string;
  description: string;
}

export interface PodcastAiQualityOption {
  id: PodcastAiQuality;
  label: string;
  badgeText: string;
  multiplier: number;
  description: string;
}

export const PODCAST_AI_VOICES: PodcastAiVoiceOption[] = [
  { id: 'Kore', label: 'Kore', description: 'Varm og tydelig (anbefalt programleder)' },
  { id: 'Charon', label: 'Charon', description: 'Dyp og rolig (anbefalt ekspert)' },
  { id: 'Puck', label: 'Puck', description: 'Livlig og engasjert' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Faglig og stødig' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Lett og vennlig' }
];

export const PODCAST_AI_QUALITY_OPTIONS: PodcastAiQualityOption[] = [
  {
    id: 'standard',
    label: 'Standard AI',
    badgeText: '0,5× minuttpris',
    multiplier: 0.5,
    description: '1 valgt AI-fortellerstemme leser hele manuset. Raskest og rimeligst.'
  },
  {
    id: 'studio',
    label: 'Studio To-stemmers',
    badgeText: '1× minuttpris',
    multiplier: 1,
    description: 'Ekte podcast-samtale med egne AI-stemmer for Programleder og Ekspert.'
  }
];

export function calculatePodcastAudioCost(
  estimatedMinutes: number,
  quality: PodcastAiQuality
): number {
  const baseMinutes = Math.max(1, Math.round(estimatedMinutes || 5));
  const multiplier = quality === 'standard' ? 0.5 : 1;
  return Math.max(1, Math.ceil(baseMinutes * multiplier));
}

export function countDialogueWords(dialogue: PodcastDialogueLine[]): number {
  return dialogue.reduce((acc, line) => {
    const words = (line.text || '').trim().split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);
}
