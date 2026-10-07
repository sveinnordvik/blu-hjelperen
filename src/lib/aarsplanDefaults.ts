import { AarsplanChapter, STORAGE_KEY_AARSPLAN_CHAPTERS } from '../types/aarsplan';

export interface ChapterTextDefaults {
  barnehageNavn?: string;
  omBarnehagenText?: string;
  visjonText?: string;
  kjerneverdierText?: string;
  psykososialtMiljoeText?: string;
  laeringssynText?: string;
  lekensPilarerText?: string;
  fagomraaderBeskrivelseText?: string;
  satsingsomraaderText?: string;
  arbeidsmaaterText?: string;
  barnsMedvirkningText?: string;
  foreldresamarbeidText?: string;
  overgangerText?: string;
  bakgrunnsdokumenterText?: string;
  suVedtakDato?: string;
}

export const createDefaultChapters = (texts?: ChapterTextDefaults): AarsplanChapter[] => {
  return [
    {
      id: 'chap_velkommen',
      title: 'Velkommen til oss',
      subtitle: 'Vår identitet og våre hovedmål',
      category: 'Identitet',
      iconType: 'building',
      type: 'standard',
      layoutVariant: 'hero-top',
      imageSrc: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Identitet & Kultur',
      imageCaption: 'Felles opplevelser og glede i barnehagehverdagen',
      content: texts?.omBarnehagenText || 'Vi er en barnehage med fokus på natur, relasjoner og skaperglede.',
      boxes: [
        {
          id: 'b_om',
          boxType: 'text',
          title: 'Hvem er vi?',
          content: texts?.omBarnehagenText || 'Eventyrskogen Barnehage ble etablert i 2012 og har i dag 88 barn i alderen 0-6 år fordelt på 6 avdelinger. Vi ligger i naturskjønne omgivelser med variert terreng og egen gapahuk.',
          iconType: 'building',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b_visjon',
          boxType: 'text',
          title: 'Vår Visjon',
          content: texts?.visjonText || '«Vi får verdens viktigste verdier til å vokse! Alle barn skal føle seg verdifulle og oppleve mestring i et varmt fellesskap.»',
          iconType: 'target',
          colSpan: 1,
          colorScheme: 'indigo'
        }
      ]
    },
    {
      id: 'chap_verdigrunnlag',
      title: 'Verdigrunnlag & Samarbeid',
      subtitle: 'Inkludering, mangfold og barns medvirkning',
      category: 'Verdier',
      iconType: 'heart',
      type: 'standard',
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1602330925725-d36cfa1e0e85?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Fellesskap & Samspill',
      imageCaption: 'Barn som bygger relasjoner og trygghet.',
      content: texts?.kjerneverdierText || 'Trygghet, likeverd og anerkjennelse.',
      boxes: [
        {
          id: 'b_kjerneverdier',
          boxType: 'text',
          title: 'Kjerneverdier',
          content: texts?.kjerneverdierText || 'Trygghet, likeverd og anerkjennelse. Vi møter hvert enkelt barn med respekt og bygger et inkluderende miljø.',
          iconType: 'heart',
          colSpan: 1,
          colorScheme: 'rose'
        },
        {
          id: 'b_medvirkning',
          boxType: 'text',
          title: 'Barns medvirkning',
          content: texts?.barnsMedvirkningText || 'Barn har rett til å uttrykke sine meninger og påvirke barnehagedagen i tråd med alder og modning.',
          iconType: 'smile',
          colSpan: 1,
          colorScheme: 'emerald'
        },
        {
          id: 'b_foreldre',
          boxType: 'text',
          title: 'Foreldresamarbeid',
          content: texts?.foreldresamarbeidText || 'Åpent og tillitsfullt foreldresamarbeid er avgjørende for barnas trivsel og trygghet.',
          iconType: 'users',
          colSpan: 1,
          colorScheme: 'indigo'
        }
      ]
    },
    {
      id: 'chap_pedagogikk',
      title: 'Vår pedagogiske plattform',
      subtitle: 'Omsorg, lek, danning og læring',
      category: 'Pedagogikk',
      iconType: 'sun',
      type: 'standard',
      layoutVariant: 'image-right',
      imageSrc: 'https://images.unsplash.com/photo-1587691592099-24045742c181?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Læringssyn',
      imageCaption: 'Fokusert lek og undring i stimulerende omgivelser.',
      content: texts?.laeringssynText || 'Barn lærer med hele seg, hele dagen, i samspill med omgivelsene.',
      boxes: [
        {
          id: 'b_laering',
          boxType: 'text',
          title: 'Helhetlig læringssyn',
          content: texts?.laeringssynText || 'Barn lærer med hele seg, hele dagen, i samspill med omgivelsene.',
          iconType: 'sun',
          colSpan: 1,
          colorScheme: 'amber'
        },
        {
          id: 'b_satsing',
          boxType: 'text',
          title: 'Årets satsingsområder',
          content: texts?.satsingsomraaderText || 'Fokus på lek, språkstimulering og utforskende friluftsliv.',
          iconType: 'compass',
          colSpan: 1,
          colorScheme: 'indigo'
        },
        {
          id: 'b_metode',
          boxType: 'text',
          title: 'Arbeidsmåter og vurdering',
          content: texts?.arbeidsmaaterText || 'Prosjektbasert arbeid forankret i barnas egne initiativ og systematisk pedagogisk dokumentasjon.',
          iconType: 'palette',
          colSpan: 1,
          colorScheme: 'rose'
        }
      ]
    },
    {
      id: 'chap_miljo_lek',
      title: 'Psykososialt miljø & lek',
      subtitle: 'Trygt barnehagemiljø (Kap. 8) og lekens egenverdi',
      category: 'Miljø & Trygghet',
      iconType: 'shield',
      type: 'standard',
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Trivsel & Trygghet',
      imageCaption: 'Leken har en egenverdi og er grunnlaget for trivsel.',
      content: texts?.psykososialtMiljoeText || 'Nulltoleranse for utestengelse og mobbing.',
      boxes: [
        {
          id: 'b_miljo',
          boxType: 'text',
          title: 'Psykososialt barnehagemiljø',
          content: texts?.psykososialtMiljoeText || 'Nulltoleranse for mobbing og krenkelser (Kapittel 8 i barnehageloven). Nærværende og varme voksne sikrer trygghet for alle.',
          iconType: 'shield',
          colSpan: 1,
          colorScheme: 'emerald'
        },
        {
          id: 'b_lek',
          boxType: 'text',
          title: 'Lekens tre pilarer',
          content: texts?.lekensPilarerText || 'Vår viktigste arena for danning, vennskap, fantasi og språk. Leken gis rom og tid i hverdagen.',
          iconType: 'smile',
          colSpan: 1,
          colorScheme: 'amber'
        }
      ]
    },
    {
      id: 'chap_fagomraader',
      title: 'Fagområdene',
      subtitle: 'Konkretisering av rammeplanen i hverdagen',
      category: 'Fagområder',
      iconType: 'palette',
      type: 'fagomraader',
      layoutVariant: 'image-right',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      imageTag: 'De 7 fagområdene',
      imageCaption: 'Rammeplanens kjerneområder veves sammen i lek og prosjekter.',
      content: texts?.fagomraaderBeskrivelseText || 'Vi jobber tverrfaglig slik at turer og samlinger berører flere områder samtidig.',
      boxes: []
    },
    {
      id: 'chap_aarshjul_host',
      title: 'Pedagogisk Årshjul: Høst',
      subtitle: 'Sensommer, oppstart og tilvenning (Aug – Okt)',
      category: 'Årshjul',
      iconType: 'trees',
      type: 'aarshjul_host',
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Høststemning',
      imageCaption: 'Utforskning i naturens egne farger',
      content: 'Månedsplaner for august, september og oktober.',
      boxes: []
    },
    {
      id: 'chap_aarshjul_vinter',
      title: 'Pedagogisk Årshjul: Vinter',
      subtitle: 'Mørketid, tradisjoner og lys (Nov – Jan)',
      category: 'Årshjul',
      iconType: 'sparkles',
      type: 'aarshjul_vinter',
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Vintertid',
      imageCaption: 'Lys, varme og eventyr i mørketiden',
      content: 'Månedsplaner for november, desember og januar.',
      boxes: []
    },
    {
      id: 'chap_aarshjul_vaar',
      title: 'Pedagogisk Årshjul: Vår',
      subtitle: 'Livet våkner og spirer (Feb – Apr)',
      category: 'Årshjul',
      iconType: 'sun',
      type: 'aarshjul_vaar',
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Vårtegn',
      imageCaption: 'Nysgjerrighet over alt som spirer og gror',
      content: 'Månedsplaner for februar, mars og april.',
      boxes: []
    },
    {
      id: 'chap_aarshjul_sommer',
      title: 'Pedagogisk Årshjul: Sommer',
      subtitle: 'Frihet, turglede og avskjed (Mai – Jul)',
      category: 'Årshjul',
      iconType: 'smile',
      type: 'aarshjul_sommer',
      layoutVariant: 'full-page-text',
      imageSrc: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Sommertider',
      imageCaption: 'Vannlek, glede og avskjed med førskolebarna',
      content: 'Månedsplaner for mai, juni og juli.',
      boxes: []
    },
    {
      id: 'chap_progresjon',
      title: 'Progresjon og overganger',
      subtitle: 'Tilpassede utfordringer i barnets løp',
      category: 'Utvikling',
      iconType: 'compass',
      type: 'standard',
      layoutVariant: 'hero-top',
      imageSrc: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80',
      imageTag: 'Vekst & Mestring',
      imageCaption: 'Å vokse trygt, steg for steg i eget tempo.',
      content: texts?.overgangerText || 'Vi sikrer trygge og gode overganger.',
      boxes: [
        {
          id: 'b_prog',
          boxType: 'text',
          title: 'Didaktisk progresjon',
          content: 'Vi sikrer at alle barn får utfordringer tilpasset sin modning og alder. Våre pedagogiske opplegg justeres systematisk for småbarn og storbarn.',
          iconType: 'target',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b_overg',
          boxType: 'text',
          title: 'Trygge overganger',
          content: texts?.overgangerText || 'Vi sikrer trygge og gode overganger ved oppstart, avdelingsbytte og til skole.',
          iconType: 'compass',
          colSpan: 1,
          colorScheme: 'indigo'
        }
      ]
    },
    {
      id: 'chap_bakgrunn',
      title: 'Bakgrunnsdokumenter & SU',
      subtitle: 'Lover, forskrifter, vedtekter og samarbeidsutvalg',
      category: 'Styring',
      iconType: 'book',
      type: 'standard',
      layoutVariant: 'image-left',
      imageSrc: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
      imageTag: 'Kvalitet & Forankring',
      imageCaption: 'Faglig fundamentert drift og godkjent styringsdokument.',
      content: texts?.bakgrunnsdokumenterText || 'Vår praksis bygger på Lov om barnehager og Rammeplanen (2017).',
      boxes: [
        {
          id: 'b_lov',
          boxType: 'text',
          title: 'Lover og forskrifter',
          content: texts?.bakgrunnsdokumenterText || 'Vår praksis bygger på Lov om barnehager og Rammeplanen (2017).',
          iconType: 'book',
          colSpan: 1,
          colorScheme: 'default'
        },
        {
          id: 'b_su',
          boxType: 'text',
          title: 'SU-Vedtak & Godkjenning',
          content: `Godkjent dato: ${texts?.suVedtakDato || '15. Oktober 2026'}. Behandlet og godkjent i Samarbeidsutvalget (SU).`,
          iconType: 'award',
          colSpan: 1,
          colorScheme: 'emerald'
        }
      ]
    }
  ];
};

export const loadStoredChapters = (texts?: ChapterTextDefaults): AarsplanChapter[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AARSPLAN_CHAPTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Kunne ikke laste lagrede årsplankapitler:', err);
  }
  return createDefaultChapters(texts);
};

export const saveStoredChapters = (chapters: AarsplanChapter[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_AARSPLAN_CHAPTERS, JSON.stringify(chapters));
  } catch (err) {
    console.warn('Kunne ikke lagre årsplankapitler:', err);
  }
};
