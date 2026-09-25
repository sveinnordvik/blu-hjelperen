import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  Library, 
  X, 
  HelpCircle, 
  Loader2, 
  GraduationCap, 
  ScrollText, 
  Lightbulb, 
  FileText,
  ExternalLink,
  Zap
} from 'lucide-react';
import { generateAcademicResponse } from '../../services/geminiService';

export interface MobileGlossaryEntry {
  term: string;
  category: 'Pedagogikk' | 'Rammeplanen' | 'Nøkkelteorier' | 'Metode & Vitenskap';
  desc: string;
  sourceOrFramework?: string; // F.eks. "Rammeplanen kap. 3", "Lev Vygotskij (1978)", "Didaktisk relasjonsmodell"
  example?: string;
}

const GLOSSARY_DATA: MobileGlossaryEntry[] = [
  // --- RAMMEPLANEN ---
  {
    term: 'Barnehagens formål & verdigrunnlag',
    category: 'Rammeplanen',
    desc: 'Barnehagen skal ivareta barnas behov for omsorg og lek, og fremme læring og danning som grunnlag for allsidig utvikling. Bygger på kristne og humanistiske verdier, respekt for menneskeverdet, likeverd og solidaritet.',
    sourceOrFramework: 'Barnehageloven § 1 & Rammeplanen kap. 1',
    example: 'Tydeliggjøres når personalet møter alle barn og familier med fordomsfri anerkjennelse og trygghet.'
  },
  {
    term: 'Barns medvirkning',
    category: 'Rammeplanen',
    desc: 'Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet og skal jevnlig få mulighet til aktiv deltakelse i planlegging og vurdering. Omfatter både verbale ytringer og kroppslige, non-verbale uttrykk hos de yngste.',
    sourceOrFramework: 'Rammeplanen kap. 4 & FNs barnekonvensjon art. 12',
    example: 'Å observere hva ettåringen viser interesse for under påkledning og la barnet velge lue eller aktivitet.'
  },
  {
    term: 'Omsorg i barnehagen',
    category: 'Rammeplanen',
    desc: 'En grunnleggende forutsetning for barns trivsel, danning og læring. Personalet skal være lydhøre, varme og nærværende, og gi barnet trygghet og trøst i alle situasjoner gjennom hele dagen.',
    sourceOrFramework: 'Rammeplanen kap. 3',
    example: 'Det sensitive fanget ved levering og den nære dialogen ved bleieskift eller måltider.'
  },
  {
    term: 'Lekens egenverdi',
    category: 'Rammeplanen',
    desc: 'Leken skal anerkjennes for sin egen verdi og gis stor plass i barnehagehverdagen. Barn leker fordi det er meningsfullt og lystbetont i øyeblikket, ikke primært for å oppnå voksnes læringsmål.',
    sourceOrFramework: 'Rammeplanen kap. 3',
    example: 'Når personalet skjermer og støtter barns spontane rollelek uten å avbryte med voksenstyrte aktiviteter.'
  },
  {
    term: 'Danning i barnehagen',
    category: 'Rammeplanen',
    desc: 'En kontinuerlig og helhetlig prosess der barnet utvikler evne til selvstendig tenkning, etisk refleksjon, empati og deltakelse i et demokratisk fellesskap.',
    sourceOrFramework: 'Rammeplanen kap. 3',
    example: 'Når barn lærer å forhandle om lekeregler, trøste en venn og forstå andres perspektiver.'
  },
  {
    term: 'Progresjon i barnehagen',
    category: 'Rammeplanen',
    desc: 'Innebærer at alle barn skal få utfordringer tilpasset sine erfaringer, interesser og modningsnivå. Læringsmiljøet og innholdet skal utvikle seg over tid fra småbarnsavdeling til skolestart.',
    sourceOrFramework: 'Rammeplanen kap. 5',
    example: 'Samme tema (f.eks. insekter) tilnærmes sanselig for ettåringen og gjennom mikroskop og fakta for femåringen.'
  },
  {
    term: 'Pedagogisk dokumentasjon',
    category: 'Rammeplanen',
    desc: 'En arbeidsmåte der personalet samler inn spor av barns lek, samtaler og aktiviteter (bilder, notater, sitater) for å reflektere i fellesskap, vurdere praksis og åpne for dialog med barn og foreldre.',
    sourceOrFramework: 'Rammeplanen kap. 7',
    example: 'Praksisfortellinger og bilder hengt opp i barnehøyde som danner utgangspunkt for felles refleksjon i personalgruppen.'
  },
  {
    term: 'Kommunikasjon, språk og tekst',
    category: 'Rammeplanen',
    desc: 'Fagområde som omfatter barns verbale og non-verbale språkutvikling, flerspråklighet, høytlesing, fabulering, begrepsforståelse og lek med rim, rytme og skriftkultur.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 1)',
    example: 'Rike samtaler rundt matbordet, daglig lesestund og bruk av konkreter i samlingsstund.'
  },
  {
    term: 'Kropp, bevegelse, mat og helse',
    category: 'Rammeplanen',
    desc: 'Fagområde som handler om motorisk mestring, fysisk utfoldelse, kroppsbevissthet, sunne kostvaner, hygiene og gleden ved å være i aktivitet ute og inne.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 2)',
    example: 'Hinderløyper på avdelingen, turer i ulendt terreng i skogen og fellestilberedning av varmlunsj.'
  },
  {
    term: 'Kunst, kultur og kreativitet',
    category: 'Rammeplanen',
    desc: 'Fagområde som stimulerer barns skaperglede, estetiske sans, fantasi og uttrykksbehov gjennom musikk, dans, drama, forming, arkitektur og kulturopplevelser.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 3)',
    example: 'Åpne formingsmaterialer (leire, naturmaterialer, maling) der prosessen har forrang foran et ferdig produkt.'
  },
  {
    term: 'Natur, miljø og teknologi',
    category: 'Rammeplanen',
    desc: 'Fagområde rettet mot naturopplevelser, kjennskap til planter og dyr, årstider, bærekraftig utvikling, miljøvern og utforskning av enkle teknologiske redskaper.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 4)',
    example: 'Kompostering av matavfall, meitemark-kasse og bruk av forstørrelsesglass i skogen.'
  },
  {
    term: 'Antall, rom og form',
    category: 'Rammeplanen',
    desc: 'Fagområde for hverdagsmatematikk der barna opplever telling, sortering, mønstre, geometriske former, måling, størrelser og orientering i rommet gjennom lek.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 5)',
    example: 'Sortering av kongler etter størrelse, telling av tallerkener til lunsj og bygging med klosser.'
  },
  {
    term: 'Etikk, religion og filosofi',
    category: 'Rammeplanen',
    desc: 'Fagområde for å stimulere barns undring over eksistensielle spørsmål, etiske valg, respekt for ulikhet, kjennskap til kristne høytider og andre religioner og livssyn.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 6)',
    example: 'Filosofiske samtaler om hva det vil si å være en god venn, eller hva som skjer med en død fugl.'
  },
  {
    term: 'Nærmiljø og samfunn',
    category: 'Rammeplanen',
    desc: 'Fagområde som bidrar til medborgerskap, likestilling, kjennskap til lokalsamfunnet, samiske tradisjoner og kultur, samt forståelse for at alle mennesker er likeverdige.',
    sourceOrFramework: 'Rammeplanen kap. 9 (Fagområde 7)',
    example: 'Besøk på brannstasjonen, feiring av samefolkets dag 6. februar og utforsking av nærområdet.'
  },

  // --- NØKKELTEORIER & TEORETIKERE ---
  {
    term: 'Lev Vygotskij (Sosiokulturell læring)',
    category: 'Nøkkelteorier',
    desc: 'Grunnleggeren av sosiokulturell læringsteori. Menneskets tenkning og læring oppstår i sosialt samspill med andre gjennom språket og kulturelle redskaper (mediering).',
    sourceOrFramework: 'Vygotskij, L. S. (1978). Mind in Society.',
    example: 'Barnet lærer nye ord og begreper gjennom dialog med barnehagelæreren i lek og hverdagsaktiviteter.'
  },
  {
    term: 'Den proksimale utviklingssonen (ZPD)',
    category: 'Nøkkelteorier',
    desc: 'Avstanden mellom hva barnet kan mestre alene (det aktuelle utviklingsnivået), og hva barnet kan klare med hjelp, støtte og veiledning fra en mer kompetent person (voksen eller jevnaldrende).',
    sourceOrFramework: 'Lev Vygotskij',
    example: 'Barnet som nesten klarer å kneppe jakken, men trenger at pedagogen holder glidelåsen i sporet.'
  },
  {
    term: 'Stillaser (Scaffolding)',
    category: 'Nøkkelteorier',
    desc: 'Jerome Bruners videreføring av Vygotskijs ZPD: Den midlertidige støtten den voksne gir (oppmuntring, forenkling, demonstrasjon) som gradvis trappes ned etter hvert som barnet mestrer oppgaven selvstendig.',
    sourceOrFramework: 'Jerome Bruner / Wood, Bruner & Ross (1976)',
    example: 'Pedagogen veileder barnet med ord og støttende hender når det skal klatre opp i huskestativet.'
  },
  {
    term: 'Jean Piaget (Kognitiv utvikling)',
    category: 'Nøkkelteorier',
    desc: 'Kognitiv konstruktivisme. Barnet konstruerer kunnskap gjennom egen aktivitet og utforskning. Læring skjer gjennom assimilasjon (tilpasning til kjente skjemaer) og akkommodasjon (endring av skjemaer ved ny innsikt).',
    sourceOrFramework: 'Jean Piaget (1896–1980)',
    example: 'Når barnet kaller en sau for «hund» (assimilasjon), og deretter forstår forskjellen når sauen breker (akkommodasjon).'
  },
  {
    term: 'John Bowlby & Mary Ainsworth (Tilknytningsteori)',
    category: 'Nøkkelteorier',
    desc: 'Mennesket har et medfødt biologisk behov for å knytte seg til nære omsorgspersoner. Den voksne fungerer som en «trygg base» for utforskning og en «sikker havn» for trøst ved stress, frykt eller utrygghet.',
    sourceOrFramework: 'Bowlby (1969/1988) & Ainsworth (1978)',
    example: 'Småbarnet som leker på teppet, kikker opp for å søke øyekontakt med primærkontakten, og fortsetter leken trygt.'
  },
  {
    term: 'Trygghetssirkelen (Circle of Security)',
    category: 'Nøkkelteorier',
    desc: 'En praktisk modell basert på tilknytningsteori som hjelper barnehagelærere å se og imøtekomme barns tilknytnings- og utforskningsbehov («vær større, sterkere, klokere og god»).',
    sourceOrFramework: 'Cooper, Hoffman, Powell & Marvin (2005)',
    example: 'Å støtte barnet når det utforsker verden (toppen av sirkelen) og ønske det velkommen tilbake med åpne armer når det trenger trøst (bunnen av sirkelen).'
  },
  {
    term: 'Loris Malaguzzi & Reggio Emilia',
    category: 'Nøkkelteorier',
    desc: 'Italiensk barnehagepedagogikk bygget på et sterkt, kompetent barn med «hundre språk». Rommet og det fysiske miljøet ses på som «den tredje pedagog». Pedagogisk dokumentasjon er kjernen i arbeidet.',
    sourceOrFramework: 'Loris Malaguzzi (1920–1994)',
    example: 'Gjennomsiktige materialer, speil, atelier og prosjekter der barnas egne spørsmål styrer utforskningen.'
  },
  {
    term: 'Friedrich Fröbel (Barnehagens grunnlegger)',
    category: 'Nøkkelteorier',
    desc: 'Grunnla den første barnehagen («Kindergarten») i 1837. Så på barnet som en plante i en hage som trenger kjærlig pleie og næring for å blomstre. Utviklet de kjente lekematerialene «Fröbel-gavene».',
    sourceOrFramework: 'Friedrich Fröbel (1782–1852)',
    example: 'Lek med geometriske klosser, bretting, sang og naturopplevelser som fundament for helhetlig vekst.'
  },
  {
    term: 'Berit Bae (Anerkjennende relasjoner)',
    category: 'Nøkkelteorier',
    desc: 'Norsk professor i barnehagepedagogikk. Vektlegger betydningen av anerkjennende kommunikasjon, lytting, likeverdighet og å unngå dominerende eller belærende samspillsmønstre overfor barn.',
    sourceOrFramework: 'Berit Bae (f.eks. «Å se barn som subjekt», 2004)',
    example: 'At den voksne setter seg på huk, møter barnets blikk og tar barnets opplevelse på alvor uten å rette på det.'
  },
  {
    term: 'Urie Bronfenbrenner (Økologisk modell)',
    category: 'Nøkkelteorier',
    desc: 'Menneskets utvikling påvirkes av samspillet mellom ulike miljøsystemer: Mikrosystem (barnehage, familie), Mesosystem (samarbeid hjem-barnehage), Eksosystem (foreldres jobb, kommunale rammer), Makrosystem (kultur, lovverk) og Kronosystem (tid og samfunnsendring).',
    sourceOrFramework: 'Bronfenbrenner, U. (1979). The Ecology of Human Development.',
    example: 'Hvordan foreldresamarbeidet (meso) og kommunebudsjettet (ekso) direkte påvirker barnets hverdag på avdelingen (mikro).'
  },
  {
    term: 'Donald Schön (Den reflekterende praktiker)',
    category: 'Nøkkelteorier',
    desc: 'Skiller mellom «refleksjon-i-handling» (spontan vurdering og justering mens situasjonen pågår) og «refleksjon-over-handling» (systematisk ettertanke etter at situasjonen er over).',
    sourceOrFramework: 'Donald Schön (1983). The Reflective Practitioner.',
    example: 'Å justere reglene i en lek der og da fordi et barn faller utenfor (i-handling), og drøfte situasjonen på avdelingsmøtet etterpå (over-handling).'
  },

  // --- PEDAGOGIKK & DIDAKTIKK ---
  {
    term: 'Didaktikk',
    category: 'Pedagogikk',
    desc: 'Læren om undervisning, oppdragelse og dannelse. Teori om planlegging, gjennomføring, begrunnelse og vurdering av pedagogisk virksomhet i barnehagen.',
    sourceOrFramework: 'Den didaktiske relasjonsmodellen (Bjørndal & Lieberg)',
    example: 'Vurdere hvordan målgruppe, rammer, mål, innhold, læreprosess og vurdering henger uløselig sammen.'
  },
  {
    term: 'Didaktisk relasjonsmodell',
    category: 'Pedagogikk',
    desc: 'Modell bestående av seks likeverdige faktorer som gjensidig påvirker hverandre: Mål, Innhold, Arbeidsmåter/Metode, Rammefaktorer, Vurdering og Læringsforutsetninger.',
    sourceOrFramework: 'Bjørndal & Lieberg',
    example: 'Når du planlegger en tur i skogen og må ta hensyn til vær (ramme), barnas gangtempo (forutsetning) og mål.'
  },
  {
    term: 'Resiliens',
    category: 'Pedagogikk',
    desc: 'Psykologisk motstandskraft og elastisitet; barns evne til å tilpasse seg positivt og mestre belastninger, motgang eller sårbarhet over tid gjennom trygge relasjoner og støttende miljø.',
    sourceOrFramework: 'Utviklingspsykologi / Borge (2010)',
    example: 'En trygg tilknytning til barnehagelæreren fungerer som en avgjørende beskyttelsesfaktor for et sårbart barn.'
  },
  {
    term: 'Inkludering',
    category: 'Pedagogikk',
    desc: 'Prinsippet om at alle barn har rett til å delta og oppleve likeverdig tilhørighet i det sosiale og faglige fellesskapet, uavhengig av forutsetninger, funksjonsnivå eller kulturell bakgrunn.',
    sourceOrFramework: 'Barnehageloven § 2 & Rammeplanen kap. 1',
    example: 'Å tilrettelegge lekemiljøet slik at et barn i rullestol eller med nedsatt hørsel deltar på lik linje i sandkassen.'
  },
  {
    term: 'Mentalisering',
    category: 'Pedagogikk',
    desc: 'Evnen til å oppfatte og forstå egne og andres mentale tilstander (følelser, tanker, intensjoner, ønsker og behov). «Å se seg selv utenfra og andre innenfra».',
    sourceOrFramework: 'Fonagy, Bateman m.fl.',
    example: 'Når barnehagelæreren ser bak barnets sinneutbrudd og forstår at barnet egentlig er overveldet og sliten.'
  },
  {
    term: 'Aktivitetsplikten (Barnehageloven § 41–43)',
    category: 'Pedagogikk',
    desc: 'Barnehagens lovfestede plikt til å sikre at alle barn har et trygt og godt psykososialt barnehagemiljø: Følge med, melde fra, undersøke og sette inn tiltak ved mistanke om utestenging eller krenkelser.',
    sourceOrFramework: 'Barnehageloven kapittel VIII (Nulltoleranse for mobbing)',
    example: 'Hvis en pedagog oppdager at et barn systematisk blir holdt utenfor leken, utløser det umiddelbar undersøkelses- og tiltaksplikt.'
  },
  {
    term: 'Felles oppmerksomhetsfokus (Joint Attention)',
    category: 'Pedagogikk',
    desc: 'Når to personer (f.eks. barn og barnehagelærer) bevisst deler oppmerksomhet om samme gjenstand, hendelse eller person, gjerne ledsaget av blikkontakt eller peking. Grunnleggende for tidlig språkutvikling.',
    sourceOrFramework: 'Michael Tomasello',
    example: 'Barnet peker på en katt, ser på pedagogen, pedagogen bekrefter: «Ja, se, en liten pus som løper!»'
  },
  {
    term: 'Interseksjonalitet',
    category: 'Pedagogikk',
    desc: 'Perspektiv som analyserer hvordan ulike sosiale identitetskategorier (som kjønn, etnisitet, sosial bakgrunn, alder og funksjonsevne) samvirker og kan forsterke hverandre i sosiale maktstrukturer.',
    sourceOrFramework: 'Kimberlé Crenshaw / Pedagogisk sosiologi',
    example: 'Undersøke om gutter med minoritetsbakgrunn møtes med andre forventninger og irettesettelser i grovmotorisk lek.'
  },

  // --- METODE & VITENSKAPSTEORI ---
  {
    term: 'Hermeneutikk & Hermeneutisk sirkel',
    category: 'Metode & Vitenskap',
    desc: 'Tolkningslære. Forståelsen av at delene bare kan forstås i lys av helheten, og helheten bare i lys av delene. Forskerens/studentens fordommer og forforståelse er utgangspunkt for ny forståelse.',
    sourceOrFramework: 'Hans-Georg Gadamer',
    example: 'Å tolke et barns enkeltytring i en praksisfortelling ved å se hele situasjonens kontekst og relasjon.'
  },
  {
    term: 'Fenomenologi',
    category: 'Metode & Vitenskap',
    desc: 'Filosofisk og metodisk retning som studerer fenomener slik de oppleves og erfares av mennesket selv («livsverden»). Opptatt av barns førstepersonsperspektiv.',
    sourceOrFramework: 'Husserl, Merleau-Ponty',
    example: 'Å undersøke hvordan småbarn opplever oppstarten i barnehagen med kroppen og sansene.'
  },
  {
    term: 'Ontologi',
    category: 'Metode & Vitenskap',
    desc: 'Læren om væren og virkelighetens beskaffenhet. I barnehageforskning: Hva er et barn? Hva er lekens vesen og natur?',
    sourceOrFramework: 'Vitenskapsteori',
    example: 'Synet på barnet som enten et «ufulstendig menneske som skal formes» eller et «kompetent subjekt her og nå».'
  },
  {
    term: 'Epistemologi',
    category: 'Metode & Vitenskap',
    desc: 'Erkjennelsesteori; læren om hva kunnskap er, hvordan kunnskap oppstår og hvordan vi kan begrunne at noe er sant eller gyldig.',
    sourceOrFramework: 'Vitenskapsteori',
    example: 'Hvordan vet vi hva et barn tenker og føler? Er observasjon eller samtale den sikreste kunnskapskilden?'
  },
  {
    term: 'Abduksjon',
    category: 'Metode & Vitenskap',
    desc: 'En forskningstilnærming der forskeren veksler dynamisk mellom teori og empiri i analysearbeidet. Observasjoner utfordrer teori, og teori belyser observasjonene.',
    sourceOrFramework: 'Charles Sanders Peirce',
    example: 'Du observerer en spesiell dynamikk i sandkassen, finner ny sosiologisk leketeori, og analyserer funnene på nytt.'
  },
  {
    term: 'Reliabilitet & Validitet',
    category: 'Metode & Vitenskap',
    desc: 'Reliabilitet (pålitelighet): Hvor nøyaktig og etterprøvbar er datainnsamlingen? Validitet (gyldighet): Måler du faktisk det problemstillingen din spør etter, og er slutningene dine faglig holdbare?',
    sourceOrFramework: 'Forskningsmetode',
    example: 'Grundige feltnotater og transkripsjoner øker reliabiliteten; god teoretisk forankring styrker validiteten.'
  },
  {
    term: 'Forskningsetikk med barn (NESH)',
    category: 'Metode & Vitenskap',
    desc: 'Nasjonale forskningsetiske retningslinjer for samfunnsvitenskap og humaniora. Barn har krav på særlig beskyttelse: Informert samtykke fra foresatte, barnets eget samtykke/assent, anonymitet og rett til å trekke seg når som helst.',
    sourceOrFramework: 'De nasjonale forskningsetiske komiteene (NESH)',
    example: 'Dersom et barn under observasjon viser tegn til mistrivsel eller snur seg bort, må studenten umiddelbart avslutte observasjonen.'
  }
];

const CATEGORIES = ['Alle', 'Rammeplanen', 'Nøkkelteorier', 'Pedagogikk', 'Metode & Vitenskap'] as const;

export function MobileEncyclopedia({
  onOpenDesktopTools
}: {
  onOpenDesktopTools?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  // KI-oppslag for begreper som ikke finnes i listen
  const [isAiDefining, setIsAiDefining] = useState(false);
  const [aiCustomDefinition, setAiCustomDefinition] = useState<MobileGlossaryEntry | null>(null);

  // Samlet liste med KI-begreper
  const allEntries = useMemo(() => {
    return aiCustomDefinition ? [aiCustomDefinition, ...GLOSSARY_DATA] : GLOSSARY_DATA;
  }, [aiCustomDefinition]);

  // Hent ut alle unike forbokstaver som faktisk finnes i begrepene
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    allEntries.forEach(item => {
      const firstChar = item.term.trim().charAt(0).toUpperCase();
      if (firstChar) letters.add(firstChar);
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'nb'));
  }, [allEntries]);

  // Filtrert liste basert på kategori, søkeord og valgt bokstav
  const filteredEntries = useMemo(() => {
    return allEntries.filter(item => {
      // 1. Kategorifilter
      if (selectedCategory !== 'Alle' && item.category !== selectedCategory) {
        return false;
      }

      // 2. Bokstavfilter
      if (selectedLetter) {
        const firstChar = item.term.trim().charAt(0).toUpperCase();
        if (firstChar !== selectedLetter) {
          return false;
        }
      }

      // 3. Søkeord
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTerm = item.term.toLowerCase().includes(query);
        const matchesDesc = item.desc.toLowerCase().includes(query);
        const matchesSource = item.sourceOrFramework ? item.sourceOrFramework.toLowerCase().includes(query) : false;
        const matchesExample = item.example ? item.example.toLowerCase().includes(query) : false;
        if (!matchesTerm && !matchesDesc && !matchesSource && !matchesExample) {
          return false;
        }
      }

      return true;
    });
  }, [allEntries, selectedCategory, selectedLetter, searchTerm]);

  const toggleTerm = (term: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTerms(new Set(filteredEntries.map(e => e.term)));
  };

  const collapseAll = () => {
    setExpandedTerms(new Set());
  };

  const handleCopy = (item: MobileGlossaryEntry) => {
    const textToCopy = `${item.term} (${item.category})\nDefinisjon: ${item.desc}${item.sourceOrFramework ? `\nForankring: ${item.sourceOrFramework}` : ''}${item.example ? `\nEksempel: ${item.example}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTerm(item.term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const handleFetchAiDefinition = async () => {
    if (!searchTerm.trim()) return;
    setIsAiDefining(true);
    try {
      const response = await generateAcademicResponse(
        `Definer begrepet "${searchTerm}" for en barnehagelærerstudent i Norge. 
Skriv en konsis definisjon (2-3 setninger) rettet mot barnehagepedagogikk, Rammeplanen eller vitenskapsteori/metode, og gi et kort praktisk eksempel fra barnehagen.`,
        [],
        'balanced',
        { frameworkFocus: 'Format: Akademisk ordbok for barnehagelærerutdanningen' }
      );

      const newEntry: MobileGlossaryEntry = {
        term: searchTerm.trim(),
        category: 'Pedagogikk',
        desc: response,
        sourceOrFramework: 'Generert med faglig KI',
        example: `Søkt opp: ${searchTerm.trim()}`
      };

      setAiCustomDefinition(newEntry);
      setExpandedTerms(prev => new Set(prev).add(newEntry.term));
    } catch (err) {
      console.error('Failed to fetch AI definition', err);
    } finally {
      setIsAiDefining(false);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Rammeplanen':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'Nøkkelteorier':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'Pedagogikk':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Metode & Vitenskap':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-28 px-3 sm:px-4 space-y-3.5">
      {/* 1. Header Banner: Oppslagsverk & Begreper */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
              <Library className="w-3.5 h-3.5 text-emerald-300" /> Faglig oppslagsverk
            </span>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
              {allEntries.length} definisjoner
            </span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Begreper & Rammeplan
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed max-w-sm">
            Lynraskt oppslagsverk for barnehagelærerstudenter: pedagogiske begreper, Rammeplan-definisjoner og nøkkelteorier.
          </p>
        </div>
      </div>

      {/* 2. Søkefelt */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Søk i begreper, teorier og Rammeplanen..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Kategori-filter (Piller som legger seg pent over to linjer uten horisontal scroll) */}
      <div className="flex flex-wrap items-center gap-1.5 py-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={`cat-${cat}`}
            type="button"
            onClick={() => {
              setSelectedCategory(cat);
              setSelectedLetter(null);
            }}
            className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all border shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. Alfabetisk hurtignavigering (A-Å bar / scroller) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-bold">
          <span>Alfabetisk hurtigsøk:</span>
          {selectedLetter && (
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className="text-emerald-700 hover:underline flex items-center gap-1 text-[10px] font-bold cursor-pointer"
            >
              <span>Nullstill bokstav ({selectedLetter})</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedLetter(null)}
            className={`w-7 h-7 rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-all cursor-pointer ${
              selectedLetter === null
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Alt
          </button>
          {availableLetters.map((char) => {
            const isSelected = selectedLetter === char;
            return (
              <button
                key={`alpha-${char}`}
                type="button"
                onClick={() => setSelectedLetter(isSelected ? null : char)}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-2xs scale-105'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-200/70'
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Kontroll-linje: Antall treff & Åpne/Lukk alle */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
        <span>
          Viser {filteredEntries.length} {filteredEntries.length === 1 ? 'oppslag' : 'oppslag'}
          {selectedCategory !== 'Alle' && ` i ${selectedCategory}`}
          {selectedLetter && ` på «${selectedLetter}»`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="font-bold text-emerald-800 hover:underline cursor-pointer"
          >
            Åpne alle
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="font-bold text-slate-500 hover:underline cursor-pointer"
          >
            Lukk alle
          </button>
        </div>
      </div>

      {/* 6. Begrepsliste - Trekkspill / Accordion (Lynraskt på mobil) */}
      <div className="space-y-2.5">
        {filteredEntries.map((item, idx) => {
          const isExpanded = expandedTerms.has(item.term);
          return (
            <div
              key={`glossary-${item.term}-${idx}`}
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs transition-all"
            >
              <button
                type="button"
                onClick={() => toggleTerm(item.term)}
                className="w-full p-3.5 flex items-center justify-between text-left gap-2 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-black text-slate-900 text-sm">
                      {item.term}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getCategoryBadgeClass(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {item.desc}
                    </p>
                  )}
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isExpanded ? 'rotate-180 text-emerald-700' : ''
                  }`} 
                />
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 text-xs text-slate-700 space-y-2.5 bg-slate-50/40 animate-in fade-in duration-150">
                  <p className="leading-relaxed font-normal">
                    {item.desc}
                  </p>

                  {item.sourceOrFramework && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/70">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                      <span>{item.sourceOrFramework}</span>
                    </div>
                  )}

                  {item.example && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed italic">
                      <span className="font-bold text-slate-800 not-italic">Praksiseksempel: </span>
                      {item.example}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      {copiedTerm === item.term ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Kopiert til utklipp!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopier definisjon</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 7. Fant ingen treff - KI-oppslag */}
      {filteredEntries.length === 0 && (
        <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Fant ingen definisjon for «{searchTerm || selectedLetter}»
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Vil du at den faglige veilederen skal slå opp begrepet tilpasset barnehagelærerutdanningen?
            </p>
          </div>
          <button
            type="button"
            onClick={handleFetchAiDefinition}
            disabled={isAiDefining || !searchTerm.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 mx-auto shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isAiDefining ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Henter definisjon...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hent forklaring med KI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 8. Diskret lenke til store analyseverktøy (desktop-verktøy) */}
      {onOpenDesktopTools && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onOpenDesktopTools}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Trenger du store analyseverktøy (Sensor, PDF, Eksamen)? Vis spesialverktøy</span>
          </button>
        </div>
      )}
    </div>
  );
}
