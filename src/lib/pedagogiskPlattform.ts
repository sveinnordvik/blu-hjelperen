// ============================================================================
// BARNEHAGENS PEDAGOGISKE PLATTFORM & VERDIGRUNNLAG (KI-GRUNNMUREN)
// ============================================================================

export type PedagogiskPlattformType = 
  | 'friluft' 
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
