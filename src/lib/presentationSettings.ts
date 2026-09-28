export type TopBadgeIconType = 'cap' | 'school' | 'users' | 'sparkles' | 'book' | 'heart' | 'none';

export interface PresentationBrandingSettings {
  // Element 1: Topp-merke (Hoved-badge oppe til venstre)
  showTopBadge: boolean;
  topBadgeText: string;
  topBadgeIcon: TopBadgeIconType;

  // Element 2: Kategori / Undertype-badge (over tittel på slide 1)
  showCategoryBadge: boolean;
  categoryBadgeText: string;

  // Element 3: Layout / Slide-tag (nede til høyre)
  showLayoutTag: boolean;
  layoutTagCustomText?: string;

  // Element 4: Bunntekst / Footer (nede til venstre)
  showFooter: boolean;
  footerText: string;
  showSlideTitleInFooter: boolean;
}

export const DEFAULT_BRANDING_SETTINGS: PresentationBrandingSettings = {
  showTopBadge: true,
  topBadgeText: 'BLU • Barnehagelærerutdanningen',
  topBadgeIcon: 'cap',
  showCategoryBadge: true,
  categoryBadgeText: 'Akademisk presentasjon',
  showLayoutTag: true,
  layoutTagCustomText: '',
  showFooter: true,
  footerText: 'BLU-Hjelperen Presentasjonsmotor',
  showSlideTitleInFooter: true
};

export interface BrandingPreset {
  id: string;
  name: string;
  description: string;
  settings: PresentationBrandingSettings;
}

export const BRANDING_PRESETS: BrandingPreset[] = [
  {
    id: 'akademisk',
    name: 'Akademisk / Eksamen',
    description: 'Offisielt BLU-preg for semesteroppgave, muntlig eksamen og bachelor',
    settings: {
      showTopBadge: true,
      topBadgeText: 'BLU • Barnehagelærerutdanningen',
      topBadgeIcon: 'cap',
      showCategoryBadge: true,
      categoryBadgeText: 'Akademisk presentasjon',
      showLayoutTag: false,
      layoutTagCustomText: '',
      showFooter: true,
      footerText: 'BLU-Hjelperen',
      showSlideTitleInFooter: true
    }
  },
  {
    id: 'foreldremote',
    name: 'Foreldremøte',
    description: 'Vennlig og imøtekommende for foreldre og foresatte i barnehagen',
    settings: {
      showTopBadge: true,
      topBadgeText: 'Foreldremøte',
      topBadgeIcon: 'users',
      showCategoryBadge: true,
      categoryBadgeText: 'Informasjon & dialog',
      showLayoutTag: false,
      layoutTagCustomText: '',
      showFooter: true,
      footerText: 'Barnehagen vår',
      showSlideTitleInFooter: true
    }
  },
  {
    id: 'personalmote',
    name: 'Personalmøte & Fagdag',
    description: 'Fokusert på didaktisk refleksjon, pedagogisk ledelse og personalgruppe',
    settings: {
      showTopBadge: true,
      topBadgeText: 'Personalmøte • Pedagogisk refleksjon',
      topBadgeIcon: 'school',
      showCategoryBadge: true,
      categoryBadgeText: 'Faglig utvikling',
      showLayoutTag: false,
      layoutTagCustomText: '',
      showFooter: true,
      footerText: 'Fagdag / Personalmøte',
      showSlideTitleInFooter: true
    }
  },
  {
    id: 'praksis',
    name: 'Praksisfortelling & Veiledning',
    description: 'For praksisperioder, veiledningstimer og didaktiske analyser',
    settings: {
      showTopBadge: true,
      topBadgeText: 'Praksisfortelling • Veiledning',
      topBadgeIcon: 'book',
      showCategoryBadge: true,
      categoryBadgeText: 'Didaktisk analyse',
      showLayoutTag: false,
      layoutTagCustomText: '',
      showFooter: true,
      footerText: 'Praksis',
      showSlideTitleInFooter: true
    }
  },
  {
    id: 'minimalistisk',
    name: 'Helt ren (Minimalistisk)',
    description: 'Skjuler alle merker og bunntekster for et 100 % rent lysbilde',
    settings: {
      showTopBadge: false,
      topBadgeText: '',
      topBadgeIcon: 'none',
      showCategoryBadge: false,
      categoryBadgeText: '',
      showLayoutTag: false,
      layoutTagCustomText: '',
      showFooter: false,
      footerText: '',
      showSlideTitleInFooter: false
    }
  }
];
