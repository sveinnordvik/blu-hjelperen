// ============================================================================
// BARNEHAGENS PEDAGOGISKE PLATTFORM & VERDIGRUNNLAG (KI-GRUNNMUREN)
// ============================================================================

export type PedagogiskPlattformType = 
  | 'friluft' 
  | 'skogsgruppe'
  | 'montessori' 
  | 'reggio_emilia' 
  | 'steiner' 
  | 'idrett' 
  | 'kunst_kultur' 
  | 'egen';

export interface PedagogiskPlattformPreset {
  id: PedagogiskPlattformType;
  navn: string;
  kortBeskrivelse: string;
  visjon: string;
  kjerneverdier: string;
  fagligForankringsMal: string;
  eksempelAvdelinger: string[];
}

export interface BarnehageProfilData {
  barnehageNavn: string;
  avdelingsNavn: string;
  plattformType: PedagogiskPlattformType;
  plattformNavn: string;
  beskrivelse: string;
  visjon: string;
  kjerneverdier: string;
  fagligForankringsMal: string;
  opplastetFilnavn?: string;
  opplastetDato?: string;
  aarsplanUtdrag?: string;
}

export const PEDAGOGISKE_PLATTFORMER: Record<PedagogiskPlattformType, PedagogiskPlattformPreset> = {
  friluft: {
    id: 'friluft',
    navn: 'Friluftsbarnehage (Standard)',
    kortBeskrivelse: 'Naturen og uterommet er barnehagens fremste arena for lek, læring og danning. Vektlegger årstider, vær, sansemotorisk mestring, bærekraft, bålkos og undring.',
    visjon: '«Med naturen som lekeplass og undring som drivkraft.»',
    kjerneverdier: 'Naturglede, mestring i ulendt terreng, risikomestring, omsorg for miljøet og fellesskap i flokk.',
    fagligForankringsMal: 'Som friluftsbarnehage forankrer vi aktiviteten i Rammeplanens fagområder (spesielt Natur, miljø og teknologi samt Kropp, bevegelse, mat og helse). Autentiske opplevelser i naturen gir helhetlig læring, der barna får utforske naturens kretsløp, teste fysiske grenser og utvikle samhold.',
    eksempelAvdelinger: ['Blåbærtua (3-6 år)', 'Konglestua (0-3 år)', 'Tiurtoppen (5-6 år)']
  },
  skogsgruppe: {
    id: 'skogsgruppe',
    navn: 'Skoggruppemetoden (Læring gjennom mestring)',
    kortBeskrivelse: 'Friluftspedagogikk med sansemotorisk mestring, den med-undrende voksne, PLAGG-strukturen og bruk av egen Arbeidsbok for systematisk gjenkalling og danning.',
    visjon: '«Læring gjennom mestring i naturen, der barna eier egne erfaringer.»',
    kjerneverdier: 'Mestring i terreng, risikomestring, medvirkning, PLAGG-modellen og systematisk gjenkalling med Arbeidsboken.',
    fagligForankringsMal: 'Forankret i Skoggruppemetoden og Rammeplanen. Bygger på den treleddede PLAGG-modellen (Planlegging, Gjennomføring, Gjenkalling) og den med-undrende voksne. Barna reflekterer og dokumenterer i sin personlige Arbeidsbok etter tur.',
    eksempelAvdelinger: ['Skoggjengen', 'Mestringsgruppa']
  },
  montessori: {
    id: 'montessori',
    navn: 'Montessoribarnehage',
    kortBeskrivelse: 'Hjelp meg til å gjøre det selv. Tilrettelagt miljø, frihet under ansvar, sansetrening og indre motivasjon.',
    visjon: '«Barnet viser vei for sin egen utvikling i et tilrettelagt miljø.»',
    kjerneverdier: 'Selvstendighet, konsentrasjon, respekt, orden og gjensidig hjelpsomhet.',
    fagligForankringsMal: 'Forankret i Rammeplanen og Maria Montessoris prinsipper om tilrettelagt miljø. Aktiviteten støtter barnets indre drivkraft, praktiske livsferdigheter, sanselig erfaring og evne til å fullføre en arbeidssyklus.',
    eksempelAvdelinger: ['Casina (3-6 år)', 'Bambini (1-3 år)']
  },
  reggio_emilia: {
    id: 'reggio_emilia',
    navn: 'Reggio Emilia-inspirert',
    kortBeskrivelse: 'Barnet har hundre språk. Det fysiske rommet fungerer som den tredje pedagog, med fokus på prosjektarbeid, estetikk og pedagogisk dokumentasjon.',
    visjon: '«Et lyttende fellesskap der barnets hundre språk får utfolde seg.»',
    kjerneverdier: 'Utforskning, estetikk, relasjonelt samspill, nysgjerrighet og medvirkning.',
    fagligForankringsMal: 'Forankret i Rammeplanens estetiske fagområder og Reggio Emilia-filosofien. Vi ser på barna som kompetente forskere som undersøker verden i dialog med hverandre og materialene.',
    eksempelAvdelinger: ['Atelieret', 'Piazzaen (3-6 år)']
  },
  steiner: {
    id: 'steiner',
    navn: 'Steinerbarnehage',
    kortBeskrivelse: 'Danning gjennom etterligning, faste rytmer, årstidsfester, eventyr og naturlige lekematerialer uten ferdigdefinert fasit.',
    visjon: '«Gjennom trygge rytmer og skapende fantasi dannes hele mennesket.»',
    kjerneverdier: 'Rytme, etterligning, respekt for naturens gang, ro og naturlige materialer.',
    fagligForankringsMal: 'Forankret i Rammeplanen og steinerpedagogiske prinsipper der fri lek, sansepleie, eventyrfortelling og årstidsrytmer danner grunnlag for barnets helhetlige utvikling.',
    eksempelAvdelinger: ['Morgensol', 'Stjerneglimt (3-6 år)']
  },
  idrett: {
    id: 'idrett',
    navn: 'Idretts- og bevegelsesbarnehage',
    kortBeskrivelse: 'Glede i bevegelse, allsidig motorisk stimulering, fysisk helse, sunne matvaner og aktiv lagånd.',
    visjon: '«Bevegelsesglede for livet gjennom lek og mestring.»',
    kjerneverdier: 'Bevegelsesglede, samhold, mestringsfølelse, energi og sunne vaner.',
    fagligForankringsMal: 'Forankret i Rammeplanens Kropp, bevegelse, mat og helse. Vi vektlegger grovmotorisk allsidighet, koordinasjon og mestringsopplevelser som bygger fysisk selvtillit.',
    eksempelAvdelinger: ['Sprekinger (3-6 år)', 'Mini-hopperne (1-3 år)']
  },
  kunst_kultur: {
    id: 'kunst_kultur',
    navn: 'Kunst- og kulturbarnehage',
    kortBeskrivelse: 'Skapende utfoldelse gjennom musikk, drama, forming, arkitektur og varierte visuelle uttrykk.',
    visjon: '«Rom for fantasi, kreativitet og estetiske opplevelser.»',
    kjerneverdier: 'Skaperglede, nysgjerrighet, mangfold, uttrykksfrihet og samspill.',
    fagligForankringsMal: 'Forankret i Rammeplanens Kunst, kultur og kreativitet. Barna erfarer ulike kunstneriske teknikker, fortellinger og musikk for å uttrykke følelser og bygge identitet.',
    eksempelAvdelinger: ['Paletten (3-6 år)', 'Musikk-kroken']
  },
  egen: {
    id: 'egen',
    navn: 'Egendefinert plattform / Egen årsplan',
    kortBeskrivelse: 'Barnehagens unike verdigrunnlag og satsingsområder definert lokalt i barnehagens årsplan.',
    visjon: '«Trygghet, trivsel og utvikling i tråd med barnehagens formål.»',
    kjerneverdier: 'Trygghet, omsorg, lek og læring.',
    fagligForankringsMal: 'Forankret i Rammeplan for barnehagen (2017) og barnehagens egne vedtatte satsingsområder og verdigrunnlag.',
    eksempelAvdelinger: ['Avdeling 1', 'Avdeling 2']
  }
};

const STORAGE_KEY = 'pedportalen_barnehage_profil_v1';

// Hent lagret barnehageprofil, eller returner standard Friluftsbarnehage
export function getBarnehageProfil(): BarnehageProfilData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Kunne ikke lese barnehageprofil:", e);
  }

  // Standardprofil: Furutoppen Friluftsbarnehage (generisk & trygt eksempel)
  const defaultPreset = PEDAGOGISKE_PLATTFORMER.friluft;
  return {
    barnehageNavn: 'Furutoppen Barnehage',
    avdelingsNavn: 'Blåbærtua (3-6 år)',
    plattformType: 'friluft',
    plattformNavn: defaultPreset.navn,
    beskrivelse: defaultPreset.kortBeskrivelse,
    visjon: defaultPreset.visjon,
    kjerneverdier: defaultPreset.kjerneverdier,
    fagligForankringsMal: defaultPreset.fagligForankringsMal,
    opplastetFilnavn: undefined
  };
}

// Sjekk om valgt pedagogisk plattform er Skoggruppemetoden
export function isSkogsgruppePlattform(profil?: BarnehageProfilData | null): boolean {
  if (!profil) return false;
  return profil.plattformType === 'skogsgruppe' || 
    profil.plattformNavn.toLowerCase().includes('skogsgruppe') ||
    profil.plattformNavn.toLowerCase().includes('skoggruppe');
}

export interface DagsrytmeSlot {
  id: string;
  tid: string;
  navn: string;
  beskrivelse?: string;
  erEgendefinert?: boolean;
}

export const DAGSRYTME_STORAGE_KEY = 'didaktisk_egendefinert_dagsrytme';

/**
 * Returnerer dagsrytme tilpasset barnehagens valgte pedagogiske plattform.
 * MERK: Arbeidsboken er SPESIFIKK for Skoggruppemetoden.
 * For alle standardplaner og øvrige profiler benyttes "Gjenkalling & Refleksjon".
 */
export function getDagsrytmeForProfil(profil?: BarnehageProfilData | null): DagsrytmeSlot[] {
  const isSkog = isSkogsgruppePlattform(profil);
  return [
    { id: 'slot-0', tid: '09:30', navn: 'Påkledning & Forberedelse' },
    { id: 'slot-1', tid: '10:00', navn: 'Aktivitet 1 (Hovedfokus)' },
    { id: 'slot-2', tid: '11:00', navn: 'Felles Lunsj' },
    { id: 'slot-3', tid: '11:45', navn: 'Aktivitet 2 / Utetid' },
    { id: 'slot-4', tid: '14:00', navn: 'Fruktmåltid' },
    { 
      id: 'slot-5',
      tid: '15:00', 
      navn: isSkog ? 'Arbeidsbok & Gjenkalling' : 'Gjenkalling & Refleksjon',
      beskrivelse: isSkog 
        ? 'Skoggruppemetodens arbeidsbok med tegning, refleksjon og PLAGG-gjenkalling' 
        : 'Systematisk ettermiddagsrefleksjon, samtale og PLAGG-gjenkalling'
    },
  ];
}

/**
 * Henter lagret dagsrytme (egendefinert) fra localStorage, eller returnerer plattformens standard
 */
export function getStoredDagsrytme(profil?: BarnehageProfilData | null): DagsrytmeSlot[] {
  try {
    const saved = localStorage.getItem(DAGSRYTME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((slot: any, idx: number) => ({
          id: slot.id || `slot-${idx}`,
          tid: slot.tid || '10:00',
          navn: slot.navn || `Økt ${idx + 1}`,
          beskrivelse: slot.beskrivelse || '',
          erEgendefinert: Boolean(slot.erEgendefinert)
        }));
      }
    }
  } catch (e) {
    console.warn("Kunne ikke lese lagret dagsrytme:", e);
  }
  return getDagsrytmeForProfil(profil);
}

/**
 * Lagrer egendefinert dagsrytme og varsler andre komponenter
 */
export function saveStoredDagsrytme(slots: DagsrytmeSlot[]): void {
  try {
    localStorage.setItem(DAGSRYTME_STORAGE_KEY, JSON.stringify(slots));
    window.dispatchEvent(new CustomEvent('pedportalen_dagsrytme_updated', { detail: slots }));
  } catch (e) {
    console.warn("Kunne ikke lagre dagsrytme:", e);
  }
}

/**
 * Tilbakestiller dagsrytmen til plattformens standard
 */
export function resetStoredDagsrytme(profil?: BarnehageProfilData | null): DagsrytmeSlot[] {
  try {
    localStorage.removeItem(DAGSRYTME_STORAGE_KEY);
  } catch {}
  const defaults = getDagsrytmeForProfil(profil);
  window.dispatchEvent(new CustomEvent('pedportalen_dagsrytme_updated', { detail: defaults }));
  return defaults;
}

/**
 * Sorterer tidsluker kronologisk etter tidspunkt (f.eks. "09:30", "11:00")
 */
export function sortDagsrytmeChronologically(slots: DagsrytmeSlot[]): DagsrytmeSlot[] {
  const parseMinutes = (t: string): number => {
    const match = t.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 9999;
  };

  return [...slots].sort((a, b) => parseMinutes(a.tid) - parseMinutes(b.tid));
}

export interface FullstendigDagsrytmeElement {
  id: string;
  slotId?: string;
  tid: string;
  tittel: string;
  undertekst?: string;
  kategori: 'morgen' | 'frokost' | 'pedagogisk' | 'lunsj' | 'utetid' | 'frukt' | 'refleksjon' | 'avslutning' | 'egendefinert';
  erFastRutine: boolean;
  harPlanlagteAktiviteter: boolean;
  plasserteAktiviteter: any[];
}

/**
 * Bygger en fullstendig dagsrytme for en gitt ukedag (1-5), basert på Ukeplanen.
 * Inkluderer faste morgen- og ettermiddagsrutiner + kjernetidens økter og aktiviteter fra ukeplanen.
 */
export function getFullstendigDagsplanForDag(
  dagNum: number,
  plasserteAktiviteter: Record<string, any[]>,
  dagsrytmeSlots: DagsrytmeSlot[]
): FullstendigDagsrytmeElement[] {
  const resultat: FullstendigDagsrytmeElement[] = [];

  // 1. Fast morgenrutine
  resultat.push({
    id: `fast-mottak-${dagNum}`,
    tid: '07:00 - 08:30',
    tittel: 'Mottak og rolig lek',
    undertekst: 'Trygg levering i garderoben, lesekrok og puslespill. Morgenvakt tar imot barna og skaper en trygg overgang fra hjemmet.',
    kategori: 'morgen',
    erFastRutine: true,
    harPlanlagteAktiviteter: false,
    plasserteAktiviteter: []
  });

  // 2. Felles frokost
  resultat.push({
    id: `fast-frokost-${dagNum}`,
    tid: '08:30 - 09:15',
    tittel: 'Felles frokost',
    undertekst: 'Selvsmøring, språklig samspill, rolig måltidsstemning og forberedelse til formiddagen.',
    kategori: 'frokost',
    erFastRutine: true,
    harPlanlagteAktiviteter: false,
    plasserteAktiviteter: []
  });

  // 3. Kjernetidens økter fra ukeplanen (sortert kronologisk)
  const sorterteSlots = sortDagsrytmeChronologically(dagsrytmeSlots);

  sorterteSlots.forEach((slot, idx) => {
    // Sjekk både slot.id og indeks-nøkkel
    const cellKeyId = `${dagNum}-${slot.id}`;
    const cellKeyIdx = `${dagNum}-${idx}`;
    const kort = plasserteAktiviteter[cellKeyId] || plasserteAktiviteter[cellKeyIdx] || [];

    let kat: FullstendigDagsrytmeElement['kategori'] = 'pedagogisk';
    const navnLav = slot.navn.toLowerCase();
    if (navnLav.includes('lunsj') || navnLav.includes('mat')) kat = 'lunsj';
    else if (navnLav.includes('frukt')) kat = 'frukt';
    else if (navnLav.includes('utetid') || navnLav.includes('tur')) kat = 'utetid';
    else if (navnLav.includes('gjenkalling') || navnLav.includes('refleksjon') || navnLav.includes('arbeidsbok')) kat = 'refleksjon';
    else if (slot.erEgendefinert) kat = 'egendefinert';

    resultat.push({
      id: `slot-element-${dagNum}-${slot.id}`,
      slotId: slot.id,
      tid: slot.tid,
      tittel: slot.navn,
      undertekst: slot.beskrivelse || (kort.length === 0 ? 'Felles kjerneøkt i henhold til dagsrytmen.' : undefined),
      kategori: kat,
      erFastRutine: false,
      harPlanlagteAktiviteter: kort.length > 0,
      plasserteAktiviteter: kort
    });
  });

  // 4. Fast avslutning og ettermiddag
  resultat.push({
    id: `fast-avslutning-${dagNum}`,
    tid: '15:30 - 16:30',
    tittel: 'Ettermiddagslek, henting og avslutning',
    undertekst: 'Rolig lek inne eller ute, overlevering til foreldre med dagens positive glimt, og rydding før stenging.',
    kategori: 'avslutning',
    erFastRutine: true,
    harPlanlagteAktiviteter: false,
    plasserteAktiviteter: []
  });

  return resultat;
}

// Lagre oppdatert profil (synkroniseres på tvers av Styrern og Pedledern)
export function saveBarnehageProfil(profil: BarnehageProfilData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profil));
    // Trigger custom event slik at andre faner/komponenter oppdateres umiddelbart
    window.dispatchEvent(new CustomEvent('pedportalen_profil_updated', { detail: profil }));
  } catch (e) {
    console.warn("Kunne ikke lagre barnehageprofil til localStorage:", e);
  }
}

