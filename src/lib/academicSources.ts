/**
 * Pensum og Standardkilder for Barnehagelærerutdanningen (BLU)
 * Følger APA 7. utgave med korrekte forfattere, utgivelsesår, tittel (kursiv), forlag og standardiserte in-text henvisninger.
 */

export interface AcademicSource {
  id: string;
  category: 'rammeverk' | 'pedagogikk' | 'sprak' | 'natur' | 'kunst' | 'ledelse' | 'annen';
  categoryLabel: string;
  author: string; // F.eks. "Bae, B."
  year: number; // 2012
  title: string; // Bok eller artikkeltittel
  details: string; // Utgiver/tidsskrift/url
  inTextCitation: string; // F.eks. "(Bae, 2012)" eller "(Kunnskapsdepartementet, 2017)"
  fullReference: string; // Komplett APA 7 referansestreng med kursivering i markdown (*...*)
  keyTopics: string[]; // Nøkkelord for søk
  description: string; // Kort pedagogisk oppsummering
}

export const BLU_STANDARD_SOURCES: AcademicSource[] = [
  {
    id: 'rammeplan-2017',
    category: 'rammeverk',
    categoryLabel: 'Lover & Rammeverk',
    author: 'Kunnskapsdepartementet',
    year: 2017,
    title: 'Rammeplan for barnehagen: Forskrift om rammeplan for barnehagens innhold og oppgaver',
    details: 'Utdanningsdirektoratet',
    inTextCitation: '(Kunnskapsdepartementet, 2017)',
    fullReference: 'Kunnskapsdepartementet. (2017). *Rammeplan for barnehagen: Forskrift om rammeplan for barnehagens innhold og oppgaver*. Utdanningsdirektoratet. https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/',
    keyTopics: ['rammeplan', 'formål', 'progresjon', 'medvirkning', 'fagområder', 'vurdering', 'didaktikk'],
    description: 'Den overordnede forskriften for alt pedagogisk arbeid i barnehagen.'
  },
  {
    id: 'barnehageloven-2005',
    category: 'rammeverk',
    categoryLabel: 'Lover & Rammeverk',
    author: 'Lov om barnehager',
    year: 2005,
    title: 'Lov om barnehager (barnehageloven)',
    details: 'LOV-2005-06-17-64. Lovdata',
    inTextCitation: '(Barnehageloven, 2005, § ...)',
    fullReference: 'Barnehageloven. (2005). *Lov om barnehager* (LOV-2005-06-17-64). Lovdata. https://lovdata.no/dokument/NL/lov/2005-06-17-64',
    keyTopics: ['lov', 'formålsparagraf', 'rettssikkerhet', 'psykososialt miljø', 'tilrettelegging'],
    description: 'Norges lov for godkjenning, styring og drift av barnehager.'
  },
  {
    id: 'bae-2012',
    category: 'pedagogikk',
    categoryLabel: 'Medvirkning & Relasjoner',
    author: 'Bae, B.',
    year: 2012,
    title: 'Medvirkning i barnehagen: Potensialer i det uforutsette',
    details: 'Fagbokforlaget',
    inTextCitation: '(Bae, 2012)',
    fullReference: 'Bae, B. (Red.). (2012). *Medvirkning i barnehagen: Potensialer i det uforutsette*. Fagbokforlaget.',
    keyTopics: ['medvirkning', 'anerkjennelse', 'dialog', 'uforutsett', 'lytting', 'demokrati'],
    description: 'Standardverket om barns rett til medvirkning og anerkjennende væremåte.'
  },
  {
    id: 'gjervan-2021',
    category: 'pedagogikk',
    categoryLabel: 'Mangfold & Inkludering',
    author: 'Gjervan, M., Andersen, C. E., & Bleka, M.',
    year: 2021,
    title: 'Se mangfold! Perspektiver på flerkulturell pedagogikk i barnehagen',
    details: '3. utg., Cappelen Damm Akademisk',
    inTextCitation: '(Gjervan et al., 2021)',
    fullReference: 'Gjervan, M., Andersen, C. E., & Bleka, M. (2021). *Se mangfold! Perspektiver på flerkulturell pedagogikk i barnehagen* (3. utg.). Cappelen Damm Akademisk.',
    keyTopics: ['flerkulturell', 'mangfold', 'inkludering', 'kultur', 'fordommer', 'foreldresamarbeid'],
    description: 'Sentrale perspektiver på inkludering, språklig mangfold og flerkulturell praksis.'
  },
  {
    id: 'tholin-2020',
    category: 'pedagogikk',
    categoryLabel: 'Småbarnspedagogikk',
    author: 'Tholin, K. R.',
    year: 2020,
    title: 'De minste barna i barnehagen: Hverdagsglimt og pedagogiske utfordringer',
    details: '2. utg., Pedagogisk Forum',
    inTextCitation: '(Tholin, 2020)',
    fullReference: 'Tholin, K. R. (2020). *De minste barna i barnehagen: Hverdagsglimt og pedagogiske utfordringer* (2. utg.). Pedagogisk Forum.',
    keyTopics: ['småbarn', '1-3 år', 'tilknytning', 'omsorg', 'kroppsspråk', 'trygghet', 'bleieskift'],
    description: 'Praksisnær og teoretisk forankret bok om omsorg og relasjoner for 1–3-åringene.'
  },
  {
    id: 'kibsgaard-2019',
    category: 'sprak',
    categoryLabel: 'Språk, tekst og matematikk',
    author: 'Kibsgaard, I., & Husby, H.',
    year: 2019,
    title: 'Norsk som andrespråk i barnehagen: Språkarbeid og flerspråklig utvikling',
    details: 'Universitetsforlaget',
    inTextCitation: '(Kibsgaard & Husby, 2019)',
    fullReference: 'Kibsgaard, I., & Husby, H. (2019). *Norsk som andrespråk i barnehagen: Språkarbeid og flerspråklig utvikling*. Universitetsforlaget.',
    keyTopics: ['språk', 'andrespråk', 'språkutvikling', 'begrepslæring', 'høytlesing'],
    description: 'Håndbok for systematisk og inkluderende språkarbeid med flerspråklige barn.'
  },
  {
    id: 'bjorkvold-2005',
    category: 'kunst',
    categoryLabel: 'Kunst, kultur og kreativitet',
    author: 'Bjørkvold, J.-R.',
    year: 2005,
    title: 'Det musiske menneske: Barnet og sangen, lek og læring gjennom livets faser',
    details: '7. utg., Freidig Forlag',
    inTextCitation: '(Bjørkvold, 2005)',
    fullReference: 'Bjørkvold, J.-R. (2005). *Det musiske menneske: Barnet og sangen, lek og læring gjennom livets faser* (7. utg.). Freidig Forlag.',
    keyTopics: ['musisk', 'musikk', 'sang', 'spontanlek', 'kreativitet', 'rytme'],
    description: 'Klassiker om musikalitet som grunnleggende menneskelig uttrykksform og lekeform.'
  },
  {
    id: 'bostrom-2018',
    category: 'natur',
    categoryLabel: 'Natur, helse og bevegelse',
    author: 'Bostrøm, P., & Hagen, T. L.',
    year: 2018,
    title: 'Natur, helse og bevegelse i barnehagen',
    details: 'Universitetsforlaget',
    inTextCitation: '(Bostrøm & Hagen, 2018)',
    fullReference: 'Bostrøm, P., & Hagen, T. L. (2018). *Natur, helse og bevegelse i barnehagen*. Universitetsforlaget.',
    keyTopics: ['natur', 'utelek', 'motorikk', 'bærekraft', 'risikolek', 'turglede'],
    description: 'Teori og didaktiske tilnærminger til friluftsliv, kroppslig mestring og naturfag.'
  },
  {
    id: 'gotvassli-2020',
    category: 'ledelse',
    categoryLabel: 'Ledelse & Samarbeid',
    author: 'Gotvassli, K.-Å.',
    year: 2020,
    title: 'Boka om ledelse i barnehagen',
    details: '5. utg., Universitetsforlaget',
    inTextCitation: '(Gotvassli, 2020)',
    fullReference: 'Gotvassli, K.-Å. (2020). *Boka om ledelse i barnehagen* (5. utg.). Universitetsforlaget.',
    keyTopics: ['ledelse', 'pedagogisk leder', 'team', 'profesjonsfellesskap', 'møteledelse', 'endring'],
    description: 'Omfattende lærebok om pedagogisk lederrolle og organisasjonsutvikling.'
  },
  {
    id: 'lillemyr-2011',
    category: 'pedagogikk',
    categoryLabel: 'Lek & Læring',
    author: 'Lillemyr, O. F.',
    year: 2011,
    title: 'Lek - opplevelse - læring: I barnehage og skole',
    details: '3. utg., Universitetsforlaget',
    inTextCitation: '(Lillemyr, 2011)',
    fullReference: 'Lillemyr, O. F. (2011). *Lek - opplevelse - læring: I barnehage og skole* (3. utg.). Universitetsforlaget.',
    keyTopics: ['lek', 'lekeformer', 'motivasjon', 'læring', 'egenverdi', 'rollelek'],
    description: 'Grunnleggende teoretisk gjennomgang av lekens betydning og egenverdi i barnehagen.'
  }
];

export const USER_CUSTOM_SOURCES_KEY = 'blu_user_custom_sources_v1';

export function getStoredCustomSources(): AcademicSource[] {
  try {
    const raw = localStorage.getItem(USER_CUSTOM_SOURCES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Feil ved henting av egne kilder:', e);
    return [];
  }
}

export function saveCustomSource(source: AcademicSource): AcademicSource[] {
  try {
    const current = getStoredCustomSources();
    const updated = [source, ...current.filter(s => s.id !== source.id)];
    localStorage.setItem(USER_CUSTOM_SOURCES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Feil ved lagring av kilde:', e);
    return [];
  }
}
