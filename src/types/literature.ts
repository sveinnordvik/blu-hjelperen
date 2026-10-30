export type AccessType = 'privat' | 'felles';
export type SourceType = 'pdf' | 'url' | 'bok' | 'artikkel' | 'kapittel' | string;

export interface LiteratureDocument {
  id?: string;
  title: string;              // Tittel
  authors: string[];          // Forfattere (array)
  year: number;               // Utgivelsesår
  createdAt: string;          // Opplastingsdato (ISO-streng eller dato)
  sourceType: SourceType;     // Kildetype (f.eks. 'pdf', 'url', 'bok', 'artikkel')
  access: AccessType;         // Tilgang ('privat' | 'felles')
  userId?: string;            // Bruker-ID til eier/opplaster
  fileUrl?: string;           // Valgfri fil-lenke
  url?: string;               // Valgfri ekstern nettadresse/DOI
  description?: string;       // Valgfritt sammendrag eller beskrivelse
  keyTopics?: string[];       // Valgfrie nøkkelord
  apaCitation?: string;       // Valgfri generert APA-referanse

  // Norske feltnavn-aliaser for maksimal bakover- og framoverkompatibilitet
  tittel?: string;
  forfattere?: string[];
  utgivelsesår?: number;
  opplastingsdato?: string;
  kildetype?: SourceType;
  tilgang?: AccessType;
}
