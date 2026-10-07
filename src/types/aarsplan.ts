export interface EditableBox {
  id: string;
  boxType?: 'text' | 'image' | 'quote' | 'stat';
  title: string;
  content: string;
  imageSrc?: string;
  imageTag?: string;
  imageCaption?: string;
  statNumber?: string;
  author?: string;
  iconType?: string;
  colSpan?: 1 | 2; // 1 = 50%, 2 = 100%
  heightSize?: 'compact' | 'normal' | 'tall';
  colorScheme?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export type AarsplanChapterType = 
  | 'standard' 
  | 'fagomraader' 
  | 'aarshjul_host' 
  | 'aarshjul_vinter' 
  | 'aarshjul_vaar' 
  | 'aarshjul_sommer' 
  | 'custom';

export interface AarsplanChapter {
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  content?: string;
  iconType?: string;
  layoutVariant?: 'hero-top' | 'image-left' | 'image-right' | 'text-focus' | 'full-page-text';
  imageSrc?: string;
  imageTag?: string;
  imageCaption?: string;
  boxes?: EditableBox[];
  type?: AarsplanChapterType;
  isDeletable?: boolean;
}

export const STORAGE_KEY_AARSPLAN_CHAPTERS = 'barnehage_aarsplan_chapters_v2';
