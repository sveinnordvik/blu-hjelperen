import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  Clock, 
  Heart, 
  BookOpen, 
  Send, 
  Sparkles, 
  Smartphone, 
  Copy, 
  Check, 
  Trees, 
  Calendar, 
  Compass, 
  Bookmark, 
  Layers, 
  RefreshCw, 
  ChevronDown,
  MessageSquare,
  FileText
} from 'lucide-react';
import { getBarnehageProfil, BarnehageProfilData } from '../../lib/pedagogiskPlattform';
import { callGoogleAIProxy } from '../../services/geminiService';

/**
 * Hjelpefunksjon for å garantere at generert tekst er 100 % fri for emojier,
 * i tråd med instruksene for skriveassistenten.
 */
export const stripEmojis = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{200D}\u{FE0F}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

interface WeeklyPlanItem {
  id: string;
  day: string;
  activity: string;
  fagomrade: string;
  responsible: string;
  notes: string;
}

interface MonthlyPlanContext {
  month: string;
  year: string;
  coverTitle: string;
  coverIntro: string;
  pedagogicalReviewTitle: string;
  pedagogicalReviewText: string;
  focusAreas: string[];
}

const DEFAULT_WEEKLY_PLAN: WeeklyPlanItem[] = [
  { 
    id: '1', 
    day: 'Mandag', 
    activity: 'Turdag i skogen: Småkryp og høstblader', 
    fagomrade: 'Natur, miljø og teknologi', 
    responsible: 'Fatima (fagarbeider)', 
    notes: 'Ta med lupeglass og bøtter til naturoppdagelser' 
  },
  { 
    id: '2', 
    day: 'Tirsdag', 
    activity: 'Samlingsstund: Bukkene Bruse og tallrekker', 
    fagomrade: 'Antall, rom og form', 
    responsible: 'Ingrid (pedleder)', 
    notes: 'Fokus på begrepene stor, mellomstor, liten og sortering' 
  },
  { 
    id: '3', 
    day: 'Onsdag', 
    activity: 'Forming: Malesverksted med naturmaterialer', 
    fagomrade: 'Kunst, kultur og kreativitet', 
    responsible: 'Camilla (assistent)', 
    notes: 'Blande primærfarger og male med kongler og pinner' 
  },
  { 
    id: '4', 
    day: 'Torsdag', 
    activity: 'Hinderløype i ulendt terreng: Balanse og koordinasjon', 
    fagomrade: 'Kropp, bevegelse, mat og helse', 
    responsible: 'Lars (fagarbeider)', 
    notes: 'Grovmotorisk mestring og risikolek i trygge rammer' 
  },
  { 
    id: '5', 
    day: 'Fredag', 
    activity: 'Barnas eget valg, lavvokos og fellessamling', 
    fagomrade: 'Etikk, religion og filosofi', 
    responsible: 'Teamet', 
    notes: 'Barns medvirkning, refleksjon over uka og fellesskapsfølelse' 
  }
];

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

const getTodayNorwegianWeekday = (): string => {
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const today = days[new Date().getDay()];
  return WEEKDAYS.includes(today) ? today : 'Mandag';
};

/**
 * Bygger en ren, varm, profesjonell meldingstekst etter de 4 reglene uten emojier
 */
export const buildCleanBriefMessage = (
  vikarNavn: string,
  avdeling: string,
  kontaktperson: string,
  dagensPlan: string,
  hovedfokus: string,
  pauser: string
): string => {
  const navn = vikarNavn.trim() ? vikarNavn.trim() : 'vikar';
  const person = kontaktperson.trim() ? kontaktperson.trim() : 'Ola (Pedleder)';

  // Formatér dagens plan med rene bindestreker hvis det er stikkord eller linjer
  const planLines = dagensPlan
    .split(/\n|\.\s+/)
    .map(l => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(l => l.length > 0)
    .map(l => `- ${l.endsWith('.') ? l : l + '.'}`)
    .join('\n');

  return stripEmojis(`Hei ${navn}! Velkommen til oss, vi er veldig glade for å ha deg her i dag.

Ditt aller viktigste fokus i dag er ${hovedfokus.trim()}

Dagens plan:
${planLines || `- ${dagensPlan}`}

Din kontaktperson i dag er ${person}. Spør meg heller en gang for mye enn en gang for lite! Pausen din blir på ${pauser}

All praktisk informasjon, husregler og vår personalhåndbok finner du i "Vikarn" her: [Sett inn lenke til Vikarn]

Ha en strålende vakt!`);
};

interface VelkomstBriefProps {
  onOpenHandbok?: () => void;
  avdelingNavn?: string;
}

export default function VelkomstBrief({ onOpenHandbok, avdelingNavn }: VelkomstBriefProps) {
  // 1. Pedagogisk plattform
  const [profil, setProfil] = useState<BarnehageProfilData>(() => getBarnehageProfil());
  
  // 2. Ukedag og ukeplan
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayNorwegianWeekday());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanItem[]>(() => {
    try {
      const saved = localStorage.getItem('pedledern_weekly_plan');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorer
    }
    return DEFAULT_WEEKLY_PLAN;
  });

  // 3. Månedsplan-kontekst
  const [monthlyContext, setMonthlyContext] = useState<MonthlyPlanContext>(() => {
    try {
      const savedV2 = localStorage.getItem('pedledern_monthly_letter_data_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        return {
          month: parsed.month || 'Mars',
          year: parsed.year || '2026',
          coverTitle: parsed.coverTitle || 'Månedsbrev',
          coverIntro: parsed.coverIntro || '',
          pedagogicalReviewTitle: parsed.pedagogicalReviewTitle || 'Naturforståelse, samspill og magien i å vente',
          pedagogicalReviewText: parsed.pedagogicalReviewText || '',
          focusAreas: (parsed.nextMonthFocusAreas || []).map((f: any) => `${f.title}: ${f.description}`)
        };
      }
    } catch {
      // Ignorer
    }
    return {
      month: 'Mars/April',
      year: '2026',
      coverTitle: 'Månedsbrev for avdelingen',
      coverIntro: 'Vårstemning, utforskertrang og levende læring i naturen.',
      pedagogicalReviewTitle: 'Naturforståelse, samspill og magien i å vente',
      pedagogicalReviewText: 'Vi har spesielt fokus på barns undring, sansemotorisk trygghet og tålmodighet.',
      focusAreas: [
        'Utforsking av naturens endringer i vårløsninga',
        'Grovmotorisk mestring i variert skogsterreng',
        'Relasjonsbygging og positivt samspill'
      ]
    };
  });

  // Aktiv aktivitet fra ukeplanen for valgt dag
  const currentDayPlan = useMemo(() => {
    return weeklyPlan.find(item => item.day.toLowerCase() === selectedDay.toLowerCase()) || weeklyPlan[0];
  }, [weeklyPlan, selectedDay]);

  // Skjemadata for Base-Brief
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('pedportalen_dagens_vikarbrief');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          dagensPlan: stripEmojis(parsed.dagensPlan || ''),
          hovedfokus: stripEmojis(parsed.hovedfokus || ''),
          pauser: stripEmojis(parsed.pauser || '')
        };
      } catch {
        // fallback
      }
    }
    return {
      vikarNavn: '',
      kontaktperson: 'Ola (Pedleder)',
      avdeling: avdelingNavn || 'Blåbærtua',
      ukedag: getTodayNorwegianWeekday(),
      fagomrade: 'Natur, miljø og teknologi',
      dagensPlan: 'Kl 08:30 Frokost og mottak i garderoben.\nKl 09:30 Samling og tur i skogen med lupe og bøtter.\nKl 11:15 Matpause ved gapahuken.\nKl 12:30 Sovevakt for de minste og rolig lesestund.\nKl 14:00 Fruktmåltid.\nKl 14:30 Utelek frem til barna hentes.',
      hovedfokus: 'Vær tett på barna nede i lyngen og på bakken! I vår friluftsbarnehage støtter vi barnas nysgjerrighet – undre deg sammen med barna over småkrypene, snu på steiner og la dem ta ledelsen i leken. Vi tar oss av bleieskift og rutiner i dag.',
      pauser: 'Kl 12:00 - 12:30 (avtales fortløpende med kontaktperson når barna hviler eller sover).',
      handbok: true
    };
  });

  // Ferdig generert tekst fra skriveassistenten (100 % emoji-fri)
  const [generatedBriefText, setGeneratedBriefText] = useState<string>(() => {
    const saved = localStorage.getItem('pedportalen_dagens_vikarbrief');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.briefMelding) {
          return stripEmojis(parsed.briefMelding);
        }
      } catch {
        // ignorer
      }
    }
    return buildCleanBriefMessage(
      formData.vikarNavn,
      formData.avdeling,
      formData.kontaktperson,
      formData.dagensPlan,
      formData.hovedfokus,
      formData.pauser
    );
  });

  const [previewMode, setPreviewMode] = useState<'melding' | 'kort'>('melding');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAiGeneratingPlans, setIsAiGeneratingPlans] = useState(false);
  const [isAiGeneratingText, setIsAiGeneratingText] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(true);

  // Synkroniser endringer i pedagogisk plattform
  useEffect(() => {
    const handleProfilChange = () => setProfil(getBarnehageProfil());
    window.addEventListener('pedportalen_profil_updated', handleProfilChange);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilChange);
  }, []);

  // Oppdater formData når avdelingNavn endres utenfra
  useEffect(() => {
    if (avdelingNavn && (!formData.avdeling || formData.avdeling === 'Blåmeis / Moseplassen')) {
      setFormData(prev => ({ ...prev, avdeling: avdelingNavn }));
    }
  }, [avdelingNavn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const cleanValue = type === 'checkbox' ? checked : stripEmojis(value);
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: cleanValue
      };
      // Oppdater også meldingsteksten dynamisk hvis brukeren ikke har spesialtilpasset den manuelt
      const newBriefText = buildCleanBriefMessage(
        name === 'vikarNavn' ? String(cleanValue) : updated.vikarNavn,
        name === 'avdeling' ? String(cleanValue) : updated.avdeling,
        name === 'kontaktperson' ? String(cleanValue) : updated.kontaktperson,
        name === 'dagensPlan' ? String(cleanValue) : updated.dagensPlan,
        name === 'hovedfokus' ? String(cleanValue) : updated.hovedfokus,
        name === 'pauser' ? String(cleanValue) : updated.pauser
      );
      setGeneratedBriefText(newBriefText);

      localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify({
        ...updated,
        briefMelding: newBriefText
      }));
      return updated;
    });
  };

  // Lokal regelbasert sammensetning (uten KI-ventetid)
  const applyLocalIntegration = (dayPlan: WeeklyPlanItem) => {
    let dagsrytme = '';
    let fokus = '';
    const pausetid = 'Kl 12:00 - 12:30 (ca. 30 min lunsjpause avtales med kontaktperson når barna hviler)';

    if (dayPlan.day === 'Mandag') {
      dagsrytme = `Kl 08:30 Frokost og mottak i garderoben.\nKl 09:30 Kort samling og pakking av tursekker.\nKl 10:00 ${dayPlan.activity} (${dayPlan.fagomrade}).\nKl 11:30 Matpause i naturen eller lavvoen.\nKl 12:30 Sovevakt for de minste og rolig stund.\nKl 14:00 Fruktmåltid og oppsummering.\nKl 14:30 Utelek frem til henting.`;
      fokus = `Vær tett på barna i skogen. Som ${profil.plattformNavn.toLowerCase()} oppmuntrer vi til fri lek og sansing i ulendt terreng. Sett deg ned i lyngen og undre deg sammen med barna over naturen. Vi tar oss av bleieskift og praktiske rutiner.`;
    } else if (dayPlan.day === 'Tirsdag') {
      dagsrytme = `Kl 08:30 Frokost og rolig bordaktivitet.\nKl 09:30 ${dayPlan.activity} (Fagområde: ${dayPlan.fagomrade}).\nKl 10:15 Utelek på avdelingens uteområde.\nKl 11:15 Lunsj og måltidsfellesskap.\nKl 12:00 Hviletid og soving for de minste.\nKl 13:30 Lekegrupper inne og ute.\nKl 14:30 Frukt og ettermiddagslek.`;
      fokus = `Støtt barnas språklige og matematiske undring. I tråd med vår pedagogiske profil (${profil.plattformNavn}) hjelper vi barna å sette ord på begreper som stor, mellomstor og liten, og øve på turtaking.`;
    } else if (dayPlan.day === 'Onsdag') {
      dagsrytme = `Kl 08:30 Frokost.\nKl 09:30 ${dayPlan.activity} i mindre grupper.\nKl 11:00 Lunsj.\nKl 11:45 Utetid og fysisk aktivitet.\nKl 13:30 Rolig lek og lesekrok.\nKl 14:15 Fruktmåltid.\nKl 14:45 Fri lek.`;
      fokus = `La barna eksperimentere fritt med materialene uten fasit. I ${profil.plattformNavn.toLowerCase()} verdsetter vi prosessen og skapergleden fremfor det ferdige produktet.`;
    } else if (dayPlan.day === 'Torsdag') {
      dagsrytme = `Kl 08:30 Frokost og levering.\nKl 09:30 Oppvarming og ${dayPlan.activity}.\nKl 11:00 Varmmat og lunsj.\nKl 11:45 Soving og lesing for de eldste.\nKl 13:00 Stasjonslek inne og ute.\nKl 14:00 Frukt og eventyrstund.`;
      fokus = `Vær den trygge støtten som heier på mestring. Når barna klatrer og utfordrer balansen, gi dem tid og trygghet fremfor å løfte dem for fort opp.`;
    } else {
      dagsrytme = `Kl 08:30 Frokost.\nKl 09:30 ${dayPlan.activity}.\nKl 11:00 Fredagslunsj og fellessamling.\nKl 12:00 Utetid og frilek.\nKl 14:00 Fruktmåltid og ukesrefleksjon.`;
      fokus = `Lytt til barnas innspill og ønsker for dagen. Barns medvirkning og trygghet er kjernen i vår pedagogiske plattform (${profil.plattformNavn}).`;
    }

    const updated = {
      ...formData,
      ukedag: dayPlan.day,
      fagomrade: dayPlan.fagomrade,
      kontaktperson: dayPlan.responsible || formData.kontaktperson,
      dagensPlan: stripEmojis(dagsrytme),
      hovedfokus: stripEmojis(fokus),
      pauser: stripEmojis(pausetid)
    };

    const newBriefText = buildCleanBriefMessage(
      updated.vikarNavn,
      updated.avdeling,
      updated.kontaktperson,
      updated.dagensPlan,
      updated.hovedfokus,
      updated.pauser
    );

    setFormData(updated);
    setGeneratedBriefText(newBriefText);
    localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify({
      ...updated,
      briefMelding: newBriefText
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // KI-fletting: Generer dagsrytme og pedagogisk fokus fra planer & profil
  const handleGenerateFromPlans = async () => {
    setIsAiGeneratingPlans(true);
    try {
      const prompt = `Du er pedagogisk leder i en norsk barnehage.
Oppgave: Generer en krystallklar, varm DAGSRYTME og et konkret PEDAGOGISK FOKUS for dagens vikar på avdeling "${formData.avdeling || 'Blåbærtua'}".

VIKTIG REGEL: INGEN EMOJIER OVERHODET. Teksten skal være 100 % fri for emojier.

Dette MÅ forankres direkte i våre eksisterende planer og barnehagens pedagogiske profil:

1. DAGENS AKTIVITET FRA UKEPLANEN (${selectedDay.toUpperCase()}):
- Aktivitet: "${currentDayPlan.activity}"
- Fagområde i Rammeplanen: "${currentDayPlan.fagomrade}"
- Ansvarlig voksen: "${currentDayPlan.responsible}"
- Didaktiske notater: "${currentDayPlan.notes}"

2. MÅNEDSPLAN & OVERORDNET TEMA (${monthlyContext.month} ${monthlyContext.year}):
- Tittel/tema: "${monthlyContext.coverTitle}"
- Pedagogisk blikk: "${monthlyContext.pedagogicalReviewTitle}" (${monthlyContext.pedagogicalReviewText.slice(0, 180)})
- Månedens fokusområder: ${monthlyContext.focusAreas.slice(0, 2).join('; ') || 'Utforsking, fellesskap og trygghet'}

3. BARNEHAGENS PEDAGOGISKE PLATTFORM & VERDIGRUNNLAG:
- Profilnavn: "${profil.plattformNavn}" (${profil.plattformType})
- Beskrivelse: "${profil.beskrivelse}"
- Visjon & kjerneverdier: "${profil.visjon}. ${profil.kjerneverdier}"
- Faglig forankrings-mal: "${profil.fagligForankringsMal}"

Svar KUN i gyldig JSON-format uten markdown-ticks eller emojier:
{
  "dagensPlan": "En realistisk, tidsinndelt dagsrytme for vikaren uten emojier (f.eks. 'Kl 08:30 Frokost, Kl 09:30 Samling, Kl 10:00 [Dagens planlagte aktivitet fra ukeplanen], Kl 11:30 Mat/lunsj, Kl 12:30 Sovevakt & lesekrok, Kl 14:00 Frukt, Kl 14:30 Utelek').",
  "hovedfokus": "Vikarens viktigste pedagogiske oppdrag og tips i dag (2-3 setninger uten emojier). Forklar hvordan vikaren skal opptre overfor barna under dagens aktivitet, med direkte forankring i barnehagens pedagogiske plattform (${profil.plattformNavn}) og dagens fagområde (${currentDayPlan.fagomrade}).",
  "kontaktperson": "${currentDayPlan.responsible || formData.kontaktperson}",
  "pauser": "Anbefalt tidspunkt for pause som ikke kolliderer med aktiviteten (f.eks. 'Kl 12:00 - 12:30 under sovevakt/hviletid')"
}`;

      const response = await callGoogleAIProxy({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.3
        }
      });

      const rawText = typeof response === 'string' ? response : (response?.text || '');
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const cleanPlan = stripEmojis(parsed.dagensPlan || formData.dagensPlan);
      const cleanFokus = stripEmojis(parsed.hovedfokus || formData.hovedfokus);
      const cleanKontakt = stripEmojis(parsed.kontaktperson || currentDayPlan.responsible || formData.kontaktperson);
      const cleanPauser = stripEmojis(parsed.pauser || formData.pauser);

      const updated = {
        ...formData,
        ukedag: selectedDay,
        fagomrade: currentDayPlan.fagomrade,
        kontaktperson: cleanKontakt,
        dagensPlan: cleanPlan,
        hovedfokus: cleanFokus,
        pauser: cleanPauser
      };

      const newBriefText = buildCleanBriefMessage(
        updated.vikarNavn,
        updated.avdeling,
        updated.kontaktperson,
        updated.dagensPlan,
        updated.hovedfokus,
        updated.pauser
      );

      setFormData(updated);
      setGeneratedBriefText(newBriefText);
      localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify({
        ...updated,
        briefMelding: newBriefText
      }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn('AI proxy feilet eller falt tilbake, bruker smart lokal kobling:', err);
      applyLocalIntegration(currentDayPlan);
    } finally {
      setIsAiGeneratingPlans(false);
    }
  };

  // Last inn det offisielle gullstandard-eksempelet fra instruksen
  const handleLoadGoldStandard = () => {
    const exampleData = {
      vikarNavn: 'Kari',
      kontaktperson: 'Ola (Pedleder)',
      avdeling: formData.avdeling || 'Blåbærtua',
      ukedag: 'Mandag',
      fagomrade: 'Kropp, bevegelse, mat og helse',
      dagensPlan: 'Utetid fra kl 09:30. Turdag for 5-åringene. Varmmåltid kl 11:00.',
      hovedfokus: 'Vær tett på barna nede på gulvet. Lek, vær nysgjerrig og bygg relasjoner! Vi tar oss av bleieskift og rutiner i dag.',
      pauser: 'Avtales fortløpende med Ola (ca. 30 min mellom 12:00 og 13:30).',
      handbok: true
    };
    const goldOutput = `Hei Kari! Velkommen til oss, vi er veldig glade for å ha deg her i dag. 

Ditt aller viktigste fokus i dag er å være tett på barna nede på gulvet. Vi ønsker at du leker, er nysgjerrig og bygger relasjoner. Vi faste ansatte tar oss av bleieskift og de faste rutinene, slik at du kan konsentrere deg om barna.

Dagens plan:
- Vi går ut kl. 09:30. 
- Det er turdag for 5-åringene. 
- Varmmåltid serveres kl. 11:00.

Din kontaktperson i dag er Ola (Pedleder). Spør meg heller en gang for mye enn en gang for lite! Pausen din blir på ca. 30 minutter mellom 12:00 og 13:30, vi avtaler nøyaktig tidspunkt fortløpende.

All praktisk informasjon, husregler og vår personalhåndbok finner du i "Vikarn" her: [Sett inn lenke til Vikarn]

Ha en strålende vakt!`;

    setFormData(exampleData);
    setGeneratedBriefText(goldOutput);
    localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify({
      ...exampleData,
      briefMelding: goldOutput
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // KI-skriveassistent for ferdig "Velkomst-brief" til vikar (f.eks. via SMS)
  // Oppfyller de 4 reglene 100 % med Gullstandard Few-Shot eksempel
  const handleGenerateBriefTextWithAI = async () => {
    setIsAiGeneratingText(true);
    try {
      const prompt = `Du er en skriveassistent for en pedagogisk leder i en barnehage. Din oppgave er å ta imot stikkord og generere en kort, varm og tydelig "Velkomst-brief" som skal sendes til dagens vikar (f.eks. via SMS).

VIKTIGE REGLER FOR TEKSTEN:
1. INGEN EMOJIER: Teksten skal være 100 % fri for emojier. Ikke bruk noen form for smilefjes, symboler eller emojier.
2. TONE: Varm, inkluderende og betryggende, men profesjonell. Vikaren skal føle seg velkommen og vite nøyaktig hva som forventes.
3. STRUKTUR: Formater teksten slik at den er lett å skumlese på en mobilskjerm. Bruk avsnitt og gjerne bindestrek for lister hvis det er naturlig. Ikke bruk komplekse Markdown-tabeller eller overskrifter som tar for mye plass.
4. "VIKARN"-LENKEN: Du SKAL alltid avslutte meldingen med en standard setning som leder vikaren til portalen "Vikarn" for praktisk informasjon, uansett hva inputen er.

HER ER ET EKSEMPEL PÅ INPUT OG ØNSKET SVAR (GULLSTANDARD):

Eksempel på Input (User Prompt):
Vikarens navn: Kari
Kontaktperson: Ola (Pedleder)
Dagens plan: Utetid fra kl 09:30. Turdag for 5-åringene. Varmmåltid kl 11:00.
Hovedfokus: Vær tett på barna nede på gulvet. Lek, vær nysgjerrig og bygg relasjoner! Vi tar oss av bleieskift og rutiner i dag.
Pauser: Avtales fortløpende med Ola (ca. 30 min mellom 12:00 og 13:30).

Eksempel på Output (Svar fra modellen):
Hei Kari! Velkommen til oss, vi er veldig glade for å ha deg her i dag. 

Ditt aller viktigste fokus i dag er å være tett på barna nede på gulvet. Vi ønsker at du leker, er nysgjerrig og bygger relasjoner. Vi faste ansatte tar oss av bleieskift og de faste rutinene, slik at du kan konsentrere deg om barna.

Dagens plan:
- Vi går ut kl. 09:30. 
- Det er turdag for 5-åringene. 
- Varmmåltid serveres kl. 11:00.

Din kontaktperson i dag er Ola (Pedleder). Spør meg heller en gang for mye enn en gang for lite! Pausen din blir på ca. 30 minutter mellom 12:00 og 13:30, vi avtaler nøyaktig tidspunkt fortløpende.

All praktisk informasjon, husregler og vår personalhåndbok finner du i "Vikarn" her: [Sett inn lenke til Vikarn]

Ha en strålende vakt!

---
NÅ ER DET DIN TUR MED FØLGENDE DATA:
Vikarens navn: ${formData.vikarNavn || 'Kari'}
Kontaktperson: ${formData.kontaktperson || 'Ola (Pedleder)'}
Dagens plan: ${formData.dagensPlan}
Hovedfokus: ${formData.hovedfokus}
Pauser: ${formData.pauser}

Generer teksten basert på disse stikkordene. Skriv direkte til vikaren (Bruk "Hei ${formData.vikarNavn || 'Kari'}!"). Følg nøyaktig samme oppbygning og varme, profesjonelle tone som i eksempelet over. Svar KUN med den ferdige meldingsteksten uten noen innledende eller avsluttende kommentarer.`;

      const response = await callGoogleAIProxy({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.25
        }
      });

      const rawText = typeof response === 'string' ? response : (response?.text || '');
      const cleanText = stripEmojis(rawText.trim());

      setGeneratedBriefText(cleanText);
      localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify({
        ...formData,
        briefMelding: cleanText
      }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn('AI proxy feilet, genererer deterministisk tekst:', err);
      const fallback = buildCleanBriefMessage(
        formData.vikarNavn,
        formData.avdeling,
        formData.kontaktperson,
        formData.dagensPlan,
        formData.hovedfokus,
        formData.pauser
      );
      setGeneratedBriefText(fallback);
    } finally {
      setIsAiGeneratingText(false);
    }
  };

  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // 1. Selve dele-funksjonen (JavaScript)
  const handleShare = async () => {
    // 1. Bygg sammen teksten (dette kan også komme direkte fra Gemini)
    const briefText = stripEmojis(
      generatedBriefText || `Hei ${formData.vikarNavn || 'vikar'}! Velkommen til oss, vi er veldig glade for å ha deg her i dag. 

Ditt aller viktigste fokus i dag:
${formData.hovedfokus}

Dagens plan:
${formData.dagensPlan}

Din kontaktperson: ${formData.kontaktperson}. Spør meg heller en gang for mye enn en gang for lite!
Pauser: ${formData.pauser}

Praktisk informasjon og husregler finner du i "Vikarn":
www.pedportalen.no/vikarn

Ha en strålende vakt!`
    );

    // 2. Sjekk om mobilen/nettleseren støtter den innebygde delemenyen
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Velkomst-brief fra Pedledern',
          text: briefText,
        });
        setShareNotice('Briefen ble delt suksessfullt!');
        setTimeout(() => setShareNotice(null), 3000);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.log('Deling ble avbrutt eller feilet:', error);
          // Fallback til utklippstavle hvis deling feiler
          try {
            await navigator.clipboard.writeText(briefText);
            setCopied(true);
            setShareNotice('Teksten er kopiert! Du kan nå lime den inn i en e-post eller SMS.');
            setTimeout(() => {
              setCopied(false);
              setShareNotice(null);
            }, 3500);
          } catch (clipErr) {
            console.error('Klarte ikke å kopiere teksten', clipErr);
          }
        }
      }
    } else {
      // 3. FALLBACK: Hvis man er på en PC uten dele-meny, kopier i stedet teksten!
      try {
        await navigator.clipboard.writeText(briefText);
        setCopied(true);
        setShareNotice('Teksten er kopiert! Du kan nå lime den inn i en e-post eller SMS.');
        setTimeout(() => {
          setCopied(false);
          setShareNotice(null);
        }, 3500);
      } catch (err) {
        console.error('Klarte ikke å kopiere teksten', err);
      }
    }
  };

  // Kopiering til utklippstavle (100 % fri for emojier)
  const handleCopySMS = () => {
    const textToCopy = stripEmojis(
      generatedBriefText || buildCleanBriefMessage(
        formData.vikarNavn,
        formData.avdeling,
        formData.kontaktperson,
        formData.dagensPlan,
        formData.hovedfokus,
        formData.pauser
      )
    );

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Oversendelse til Vikar'n-appen
  const handleSendToVikarApp = () => {
    const payload = {
      ...formData,
      ukedag: selectedDay,
      fagomrade: formData.fagomrade || currentDayPlan.fagomrade,
      pedagogiskProfil: profil.plattformNavn,
      briefMelding: stripEmojis(generatedBriefText),
      sentAt: new Date().toISOString()
    };
    localStorage.setItem('pedportalen_dagens_vikarbrief', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('pedportalen_vikarbrief_updated'));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-slate-50 p-4 sm:p-8 font-sans text-slate-800 rounded-3xl border border-slate-200">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              Didaktisk Vikarstøtte
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Fletter Ukeplan, Månedsplan og Pedagogisk plattform
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <UserPlus className="w-6 h-6" />
            </span>
            Dagens Base-Brief
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Generer dagsrytme og pedagogisk fokus direkte fra avdelingens planer, skreddersydd for dagens vikar.
          </p>
        </div>

        {/* Profil-indikator */}
        <div className="flex items-center gap-2.5 bg-white border border-emerald-200 p-2.5 rounded-2xl shadow-sm text-xs text-emerald-950">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Trees className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase text-emerald-700 tracking-wider">Aktiv plattform</span>
            <span className="font-extrabold text-slate-900">{profil.plattformNavn}</span>
          </div>
        </div>
      </div>

      {/* Datakilder-panel (Ukeplan + Månedsplan + Pedagogisk plattform) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Tilkoblede kilder for generering
            </h2>
          </div>
          <button 
            type="button"
            onClick={() => setShowSourcesPanel(!showSourcesPanel)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
          >
            <span>{showSourcesPanel ? 'Skjul detaljer' : 'Vis detaljer'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSourcesPanel ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Ukedag-velger */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Velg dag fra ukeplanen:
            </span>
            {WEEKDAYS.map((day) => {
              const isSelected = selectedDay.toLowerCase() === day.toLowerCase();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    const matching = weeklyPlan.find(w => w.day.toLowerCase() === day.toLowerCase());
                    if (matching) {
                      applyLocalIntegration(matching);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{day}</span>
                  {day === getTodayNorwegianWeekday() && (
                    <span className="text-[10px] opacity-80">(I dag)</span>
                  )}
                </button>
              );
            })}
          </div>

          {showSourcesPanel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              {/* Kilde 1: Ukeplan */}
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1">
                  <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ukeplan: {selectedDay}</span>
                </div>
                <div className="font-semibold text-slate-900 leading-tight">
                  {currentDayPlan.activity}
                </div>
                <div className="text-[11px] text-teal-800 mt-1 flex items-center gap-1">
                  <span className="font-bold">Fagområde:</span> {currentDayPlan.fagomrade}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ansvarlig: {currentDayPlan.responsible} • Notat: {currentDayPlan.notes}
                </div>
              </div>

              {/* Kilde 2: Månedsplan */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Månedsplan: {monthlyContext.month}</span>
                </div>
                <div className="font-semibold text-slate-900 leading-tight">
                  {monthlyContext.coverTitle}
                </div>
                <div className="text-[11px] text-blue-800 mt-1 line-clamp-2">
                  {monthlyContext.pedagogicalReviewTitle}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  Fokus: {monthlyContext.focusAreas[0] || 'Sansemotorikk og fellesskap'}
                </div>
              </div>

              {/* Kilde 3: Pedagogisk plattform */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                  <Trees className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Plattform: {profil.plattformNavn}</span>
                </div>
                <div className="font-semibold text-slate-900 leading-tight line-clamp-1">
                  {profil.visjon || 'Barns medvirkning og mestring'}
                </div>
                <div className="text-[11px] text-emerald-800 mt-1 line-clamp-2">
                  {profil.beskrivelse.slice(0, 110)}...
                </div>
              </div>
            </div>
          )}

          {/* Aksjonsknapper for generering */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                KI-motoren integrerer dagsrytme og fokus fra ukeplanen med {profil.plattformNavn}.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyLocalIntegration(currentDayPlan)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5"
                title="Hurtigoppdater uten ventetid"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Hurtigfyll fra plan
              </button>

              <button
                type="button"
                onClick={handleGenerateFromPlans}
                disabled={isAiGeneratingPlans}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isAiGeneratingPlans ? 'animate-spin' : ''}`} />
                {isAiGeneratingPlans ? 'Genererer dagsrytme og fokus...' : 'Generer dagsrytme og fokus'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hovedinnhold: Arbeidsbenk (Venstre) + Mobil-preview / SMS (Høyre) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Venstre kolonne: Arbeidsbenken (Input) */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Compass className="text-emerald-600 w-5 h-5" />
                Dagens tilpassede Base-Brief
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stikkord og dagsplan for dagens vikar.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadGoldStandard}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition flex items-center gap-1 shadow-sm"
                title="Last inn Kari & Ola-eksempelet fra gullstandarden"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Last inn gullstandard (Kari & Ola)</span>
              </button>
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {formData.ukedag || selectedDay}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vikarens navn
              </label>
              <input 
                type="text" 
                name="vikarNavn"
                placeholder="F.eks. Kari"
                value={formData.vikarNavn}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dagens kontaktperson
              </label>
              <input 
                type="text" 
                name="kontaktperson"
                value={formData.kontaktperson}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Avdeling / Gruppe
              </label>
              <input 
                type="text" 
                name="avdeling"
                value={formData.avdeling}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dagens Rammeplan-fagområde
              </label>
              <input 
                type="text" 
                name="fagomrade"
                value={formData.fagomrade || currentDayPlan.fagomrade}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dagsrytme (Hva skjer i dag?)
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Hentet fra ukeplanen
              </span>
            </div>
            <textarea 
              name="dagensPlan"
              rows={4}
              value={formData.dagensPlan}
              onChange={handleChange}
              placeholder="08:30 Frokost..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pedagogisk fokus og tips (Det viktigste rådet)
              </label>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                Forankret i {profil.plattformNavn}
              </span>
            </div>
            <textarea 
              name="hovedfokus"
              rows={3}
              value={formData.hovedfokus}
              onChange={handleChange}
              placeholder="Vær tett på barna..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Pauseavvikling
            </label>
            <input 
              type="text" 
              name="pauser"
              value={formData.pauser}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          {/* Skriveassistent-seksjon */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Skriveassistent (100 % fri for emojier)
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateBriefTextWithAI}
                disabled={isAiGeneratingText}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGeneratingText ? 'animate-spin' : ''}`} />
                {isAiGeneratingText ? 'Skriver tekst...' : 'Formuler SMS-tekst med KI'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Skriveassistenten oversetter stikkordene til en varm, profesjonell og mobilvennlig melding – 100 % fri for emojier, med fast henvisning til portalen Vikarn til slutt.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input 
              type="checkbox" 
              name="handbok"
              id="handbok"
              checked={formData.handbok}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="handbok" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
              Inkluder snarvei til Personalhåndbok / Vikarn-rutiner
            </label>
          </div>

          {/* Aksjonsknapper */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button 
              type="button"
              onClick={handleShare}
              className="w-full bg-slate-900 text-white px-8 py-3.5 rounded-full font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
            >
              <Send className="w-5 h-5" />
              Del med vikar
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSendToVikarApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Send til Vikarn-appen
              </button>
              <button
                type="button"
                onClick={handleCopySMS}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopiert til utklippstavle!' : 'Kopier ren SMS'}
              </button>
            </div>
          </div>

          {shareNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareNotice}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dagens Base-Brief er lagret og tilgjengelig for vikaren i Vikarn-appen!</span>
            </div>
          )}
        </div>

        {/* Høyre kolonne: Mobil Preview & SMS Output (100 % fri for emojier) */}
        <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center relative min-h-[640px]">
          
          {/* Toppvelger for preview-format */}
          <div className="w-full flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-slate-600" /> Forhåndsvisning (Vikarens mobil)
            </div>
            
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewMode('melding')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  previewMode === 'melding' 
                    ? 'bg-white text-emerald-800 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS / Melding</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('kort')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  previewMode === 'kort' 
                    ? 'bg-white text-emerald-800 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Strukturert kort</span>
              </button>
            </div>
          </div>
          
          {/* Fiktiv mobilskjerm */}
          <div className="w-[340px] max-w-full bg-white rounded-[2.5rem] shadow-2xl border-[6px] border-slate-800 p-6 flex flex-col relative overflow-hidden">
            
            {/* Notch / Dynamic Island */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto -mt-3 mb-4"></div>

            {/* Innhold etter valgt modus */}
            {previewMode === 'melding' ? (
              /* SMS-visning */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] text-slate-400 font-semibold">
                  <span>Mottatt melding</span>
                  <span>{formData.ukedag || selectedDay}</span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line shadow-inner">
                  {stripEmojis(generatedBriefText)}
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    100 % fri for emojier • Henviser til portalen Vikarn
                  </span>
                </div>
              </div>
            ) : (
              /* Strukturert kortvisning */
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                      {formData.avdeling}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      {formData.ukedag || selectedDay}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mt-2 leading-tight">
                    Velkommen til oss, {formData.vikarNavn || 'kjære vikar'}!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Her er dagens krasjkurs så du får en super og trygg start på avdelingen:
                  </p>
                </div>

                {/* Dagens fagområde & profil-merking */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-bold text-slate-600 text-[11px]">Rammeplan-fokus:</span>
                  <span className="font-extrabold text-emerald-800 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {formData.fagomrade || currentDayPlan.fagomrade}
                  </span>
                </div>

                {/* Kontaktperson */}
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <h4 className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs mb-1">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" /> Kontaktperson i dag:
                  </h4>
                  <p className="text-xs text-slate-800 font-medium">
                    {formData.kontaktperson || 'Spør på basen'}
                  </p>
                </div>

                {/* Dagens plan / Dagsrytme */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h4 className="font-bold flex items-center gap-1.5 text-slate-900 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Dagens dagsrytme
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {formData.dagensPlan || 'Ingen plan registrert ennå.'}
                  </p>
                </div>

                {/* Hovedfokus / Pedagogisk blikk */}
                <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-amber-950 text-xs">
                      <Heart className="w-3.5 h-3.5 text-rose-500" /> Ditt viktigste fokus i dag:
                    </h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                      {profil.plattformNavn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {formData.hovedfokus || 'Vær varm, observant og tilstede for barna!'}
                  </p>
                </div>

                {/* Pauser */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h4 className="font-bold flex items-center gap-1.5 text-slate-900 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-600" /> Pauseavvikling
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">
                    {formData.pauser}
                  </p>
                </div>

                {/* Handbok link */}
                {formData.handbok && (
                  <div 
                    onClick={onOpenHandbok}
                    className="bg-teal-50 hover:bg-teal-100 transition p-2.5 rounded-xl border border-teal-200 flex items-center gap-2 cursor-pointer text-xs text-teal-900"
                  >
                    <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-bold underline">For praktisk informasjon, se Vikarn</span>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500 italic">
                    For praktisk informasjon og rutiner, finn alt i portalen Vikarn.
                  </p>
                </div>
              </div>
            )}

            {/* Home indicator bar */}
            <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-5"></div>
          </div>

          {/* Knapp for deling med vikar under mobilen */}
          <button 
            type="button"
            onClick={handleShare}
            className="mt-8 w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-full font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Send className="w-5 h-5" />
            Del med vikar
          </button>
        </div>

      </div>
    </div>
  );
}
