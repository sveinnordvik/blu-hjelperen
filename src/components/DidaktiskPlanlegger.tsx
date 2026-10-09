import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  GripVertical, 
  Calendar, 
  BrainCircuit, 
  ChevronRight, 
  Leaf, 
  Clock, 
  Share2, 
  Printer, 
  CheckCircle2, 
  Plus, 
  X, 
  Trash2, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  Send, 
  Copy, 
  HelpCircle,
  Layers,
  ChevronDown,
  Edit2,
  Compass,
  Info,
  Sliders,
  RotateCcw,
  ArrowUpDown,
  Check,
  ExternalLink,
  Globe
} from 'lucide-react';
import { 
  generateForskningsbaserteAktiviteter, 
  ForskningsbasertAktivitet,
  stripAllEmojis 
} from '../services/geminiService';
import { 
  getBarnehageProfil, 
  getDagsrytmeForProfil, 
  getStoredDagsrytme,
  saveStoredDagsrytme,
  resetStoredDagsrytme,
  sortDagsrytmeChronologically,
  DagsrytmeSlot,
  isSkogsgruppePlattform, 
  BarnehageProfilData 
} from '../lib/pedagogiskPlattform';
import PlaggInfoModal from './portalen/PlaggInfoModal';
import PedagogiskPlattformModal from './portalen/PedagogiskPlattformModal';
import { STORAGE_KEY_AARSPLAN_CHAPTERS } from '../types/aarsplan';
import { createDefaultChapters } from '../lib/aarsplanDefaults';

export interface PlacedActivity {
  id: string;
  sourceActivityId: number | string;
  type: 'hoved' | 'gjenkalling' | 'fagdrypp';
  tittel: string;
  kilde: string;
  beskrivelse?: string;
  hva?: string;
  hvordan?: string;
  hvorfor?: string;
  begrepslaering?: string;
  mestring?: string;
  plaggFokus?: string;
  refleksjon?: string;
}

export interface DidaktiskPlanleggerProps {
  onOpenWritingWorkshop?: () => void;
  avdelingNavn?: string;
}

// Faste tidsblokker hentet fra masterplanene (Standard uten arbeidsbok)
export const DEFAULT_DAGSRYTME = [
  { tid: '09:30', navn: 'Påkledning & Forberedelse' },
  { tid: '10:00', navn: 'Aktivitet 1 (Hovedfokus)' },
  { tid: '11:00', navn: 'Felles Lunsj' },
  { tid: '11:45', navn: 'Aktivitet 2 / Utetid' },
  { tid: '14:00', navn: 'Fruktmåltid' },
  { tid: '15:00', navn: 'Gjenkalling & Refleksjon' },
];

export const UKEDAGER = [
  { dagNum: 1, navn: 'Mandag', erTur: false },
  { dagNum: 2, navn: 'Tirsdag', erTur: false },
  { dagNum: 3, navn: 'Onsdag', erTur: false },
  { dagNum: 4, navn: 'Torsdag', erTur: false },
  { dagNum: 5, navn: 'Fredag (Tur)', erTur: true },
];

export interface RelevantKilde {
  id: string;
  navn: string;
  url?: string;
  erEgendefinert?: boolean;
}

export const STANDARD_KILDER: RelevantKilde[] = [
  { id: 'udir', navn: 'Udir (Rammeplanen)', url: 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/' },
  { id: 'forskerfro', navn: 'Forskerfrø (Naturfagsenteret)', url: 'https://forskerfro.no' },
  { id: 'sprakløyper', navn: 'Språkløyper (Lesesenteret)', url: 'https://sprakloyper.uis.no' },
  { id: 'matematikk', navn: 'Matematikksenteret', url: 'https://www.matematikksenteret.no' },
  { id: 'voksne', navn: 'Voksne for Barn', url: 'https://vfb.no' },
];

export const TILGJENGELIGE_KILDER = STANDARD_KILDER;

export const STANDARD_AKTIVITETER: ForskningsbasertAktivitet[] = [
  { 
    id: 'std-akt-1', 
    type: 'hoved', 
    tittel: 'Sporjakt med lupe', 
    kilde: 'Forskerfrø (Naturfagsenteret)',
    beskrivelse: 'Barna leter etter spor i snø eller søle med lupe, fotograferer og sammenligner avtrykk.',
    hvorfor: 'Rammeplanen: Natur, miljø og teknologi. Utforske og oppdage fenomener i naturen.'
  },
  { 
    id: 'std-akt-2', 
    type: 'hoved', 
    tittel: 'Bygge hi av naturmaterialer', 
    kilde: 'Udir (Natur, miljø og teknologi)',
    beskrivelse: 'Samarbeid i smågrupper for å bygge ly eller hi for skogens dyr med kvister, mose og bark.',
    hvorfor: 'Styrker samarbeid, motorikk og forståelse for dyrenes overlevelse.'
  },
  { 
    id: 'std-akt-3', 
    type: 'gjenkalling', 
    tittel: 'Samlingsstund: Gjenkalle dyrespor', 
    kilde: 'PLAGG-metoden',
    beskrivelse: 'Gjenkallingsøkt i samling etter utetid. Barna reflekterer sammen og deler sine observasjoner.',
    plaggFokus: 'Hukommelse & Språklig bevisstgjøring',
    hvorfor: 'Aktiv gjenkalling (retrieval) bekrefter erfaringene og styrker begrepsforståelsen.'
  },
  { 
    id: 'std-akt-4', 
    type: 'fagdrypp', 
    tittel: 'Fag-drypp: Bruk begrepet "kamuflasje"', 
    kilde: 'Språkløyper',
    beskrivelse: 'Personalet oppfordres til å aktivt bruke ordet "kamuflasje" i minst to hverdagssituasjoner i dag.',
    hvorfor: 'Målrettet begrepslæring gjennom repetert og meningsbærende bruk i kontekst.'
  },
];

export default function DidaktiskPlanlegger({ 
  onOpenWritingWorkshop,
  avdelingNavn = 'Blåbærtua'
}: DidaktiskPlanleggerProps) {
  // 1. Tema & Alder
  const [tema, setTema] = useState<string>(() => {
    return localStorage.getItem('didaktisk_tema') || 'Overlevelse om vinteren og dyrespor';
  });
  const [alder, setAlder] = useState<string>(() => {
    return localStorage.getItem('didaktisk_alder') || '4-5 år';
  });
  const [ukeTittel, setUkeTittel] = useState<string>(() => {
    return localStorage.getItem('didaktisk_uke_tittel') || 'Uke 4 (Vinter)';
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 2. Kilde-valg
  const [egneKilder, setEgneKilder] = useState<RelevantKilde[]>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_egne_kilder_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [visNyKildeSkjema, setVisNyKildeSkjema] = useState(false);
  const [nyKildeNavn, setNyKildeNavn] = useState('');
  const [nyKildeUrl, setNyKildeUrl] = useState('');

  const alleKilder: RelevantKilde[] = [...STANDARD_KILDER, ...egneKilder];

  const [valgteKilder, setValgteKilder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_valgte_kilder');
      if (saved) return JSON.parse(saved);
    } catch {}
    return STANDARD_KILDER.map(k => k.navn);
  });

  // 3. Genererte aktiviteter (venstre kolonne) - sikret med unike ID-er
  const [genererteAktiviteter, setGenererteAktiviteter] = useState<ForskningsbasertAktivitet[]>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_genererte_kort');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenIds = new Set<string>();
          return parsed.map((item, idx) => {
            let uniqueId = String(item.id ?? `kort-${idx}`);
            if (seenIds.has(uniqueId) || uniqueId === '1' || uniqueId === '2' || uniqueId === '3' || uniqueId === '4') {
              uniqueId = `kort-${item.id || idx}-${idx}-${Date.now().toString(36)}`;
            }
            seenIds.add(uniqueId);
            return { ...item, id: uniqueId };
          });
        }
      }
    } catch {}
    return STANDARD_AKTIVITETER;
  });

  // 4. Plasserte aktiviteter i ukeplanen: nøkkel er `${dagNum}-${tidIdx}`
  const [plasserteAktiviteter, setPlasserteAktiviteter] = useState<Record<string, PlacedActivity[]>>(() => {
    try {
      const saved = localStorage.getItem('didaktisk_planlegger_grid');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      '1-1': [{
        id: 'init-1',
        sourceActivityId: 'std-akt-1',
        type: 'hoved',
        tittel: 'Sporjakt med lupe',
        kilde: 'Forskerfrø (Naturfagsenteret)',
        beskrivelse: 'Barna leter etter spor i snø eller søle med lupe, fotograferer og sammenligner avtrykk.',
        hvorfor: 'Rammeplanen: Natur, miljø og teknologi.'
      }],
      '1-5': [{
        id: 'init-2',
        sourceActivityId: 'std-akt-3',
        type: 'gjenkalling',
        tittel: 'Samlingsstund: Gjenkalle dyrespor',
        kilde: 'PLAGG-metoden',
        plaggFokus: 'Hukommelse & Språklig bevisstgjøring'
      }],
      '5-1': [{
        id: 'init-3',
        sourceActivityId: 'std-akt-2',
        type: 'hoved',
        tittel: 'Bygge hi av naturmaterialer',
        kilde: 'Udir (Natur, miljø og teknologi)'
      }]
    };
  });

  // 4b. Barnehagens pedagogiske plattform (Styrern) og PLAGG-innstillinger
  const [profil, setProfil] = useState<BarnehageProfilData>(() => getBarnehageProfil());
  const [isPlattformModalOpen, setIsPlattformModalOpen] = useState(false);
  const [isPlaggInfoModalOpen, setIsPlaggInfoModalOpen] = useState(false);
  const [inkluderPlagg, setInkluderPlagg] = useState<boolean>(() => {
    const saved = localStorage.getItem('didaktisk_inkluder_plagg');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleProfilUpdate = (e: any) => {
      if (e?.detail) setProfil(e.detail);
      else setProfil(getBarnehageProfil());
    };
    window.addEventListener('pedportalen_profil_updated', handleProfilUpdate);
    return () => window.removeEventListener('pedportalen_profil_updated', handleProfilUpdate);
  }, []);

  const [dagsrytme, setDagsrytme] = useState<DagsrytmeSlot[]>(() => {
    return getStoredDagsrytme(profil);
  });

  // Lytt til profil- og dagsrytmeoppdateringer
  useEffect(() => {
    const handleDagsrytmeUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setDagsrytme(e.detail);
      }
    };
    window.addEventListener('pedportalen_dagsrytme_updated', handleDagsrytmeUpdate);
    return () => window.removeEventListener('pedportalen_dagsrytme_updated', handleDagsrytmeUpdate);
  }, []);

  // Tilstand for egendefinerte tidspunkter modal
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DagsrytmeSlot | null>(null);
  const [slotFormTid, setSlotFormTid] = useState('');
  const [slotFormNavn, setSlotFormNavn] = useState('');
  const [slotFormBeskrivelse, setSlotFormBeskrivelse] = useState('');

  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setSlotFormTid('12:30');
    setSlotFormNavn('');
    setSlotFormBeskrivelse('');
    setShowTimeSlotModal(true);
  };

  const handleOpenEditSlot = (slot: DagsrytmeSlot) => {
    setEditingSlot(slot);
    setSlotFormTid(slot.tid);
    setSlotFormNavn(slot.navn);
    setSlotFormBeskrivelse(slot.beskrivelse || '');
    setShowTimeSlotModal(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotFormTid.trim() || !slotFormNavn.trim()) {
      showToast('Både klokkeslett og navn på økten må fylles ut.');
      return;
    }

    if (editingSlot) {
      const updated = dagsrytme.map(s => 
        s.id === editingSlot.id 
          ? { ...s, tid: slotFormTid.trim(), navn: slotFormNavn.trim(), beskrivelse: slotFormBeskrivelse.trim(), erEgendefinert: true }
          : s
      );
      setDagsrytme(updated);
      saveStoredDagsrytme(updated);
      showToast(`Oppdaterte tidspunkt "${slotFormNavn.trim()}" (${slotFormTid.trim()})`);
    } else {
      const newSlot: DagsrytmeSlot = {
        id: `slot-custom-${Date.now()}`,
        tid: slotFormTid.trim(),
        navn: slotFormNavn.trim(),
        beskrivelse: slotFormBeskrivelse.trim(),
        erEgendefinert: true
      };
      const updated = sortDagsrytmeChronologically([...dagsrytme, newSlot]);
      setDagsrytme(updated);
      saveStoredDagsrytme(updated);
      showToast(`La til nytt tidspunkt "${newSlot.navn}" (${newSlot.tid})`);
    }

    setShowTimeSlotModal(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    let antallKort = 0;
    for (let d = 1; d <= 5; d++) {
      if (plasserteAktiviteter[`${d}-${slotId}`]?.length) {
        antallKort += plasserteAktiviteter[`${d}-${slotId}`].length;
      }
    }

    if (antallKort > 0) {
      const ok = window.confirm(
        `Dette tidspunktet har ${antallKort} aktivitet(er) plassert i ukeplanen. Sletting fjerner også disse fra ukeplanen. Vil du fortsette?`
      );
      if (!ok) return;
    }

    const updated = dagsrytme.filter(s => s.id !== slotId);
    if (updated.length === 0) {
      showToast('Du må beholde minst ett tidspunkt i ukeplanen.');
      return;
    }

    setDagsrytme(updated);
    saveStoredDagsrytme(updated);

    setPlasserteAktiviteter(prev => {
      const ny = { ...prev };
      for (let d = 1; d <= 5; d++) {
        delete ny[`${d}-${slotId}`];
      }
      return ny;
    });

    if (editingSlot?.id === slotId) {
      setShowTimeSlotModal(false);
    }
    showToast('Tidspunktet ble fjernet.');
  };

  const handleResetSlots = () => {
    const ok = window.confirm('Vil du tilbakestille dagsrytmen til barnehagens standard tidsblokker?');
    if (!ok) return;
    const defaults = resetStoredDagsrytme(profil);
    setDagsrytme(defaults);
    showToast('Dagsrytme tilbakestilt til standard!');
  };

  const handleSortChronologically = () => {
    const sorted = sortDagsrytmeChronologically(dagsrytme);
    setDagsrytme(sorted);
    saveStoredDagsrytme(sorted);
    showToast('Tidspunktene er sortert kronologisk.');
  };

  // 5. Genererings-tilstand
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);

  // 6. Dra-og-slipp hjelpetilstand
  const [draggedActivity, setDraggedActivity] = useState<ForskningsbasertAktivitet | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // 7. Modaler og visninger
  const [selectedCardForModal, setSelectedCardForModal] = useState<ForskningsbasertAktivitet | PlacedActivity | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customKilde, setCustomKilde] = useState('Eget opplegg');
  const [customType, setCustomType] = useState<'hoved' | 'gjenkalling' | 'fagdrypp'>('hoved');
  const [quickPlaceActivity, setQuickPlaceActivity] = useState<ForskningsbasertAktivitet | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lagre til localStorage og send synkroniserings-hendelser
  useEffect(() => {
    localStorage.setItem('didaktisk_tema', tema);
  }, [tema]);

  useEffect(() => {
    localStorage.setItem('didaktisk_alder', alder);
  }, [alder]);

  useEffect(() => {
    localStorage.setItem('didaktisk_uke_tittel', ukeTittel);
  }, [ukeTittel]);

  useEffect(() => {
    localStorage.setItem('didaktisk_valgte_kilder', JSON.stringify(valgteKilder));
  }, [valgteKilder]);

  useEffect(() => {
    localStorage.setItem('didaktisk_genererte_kort', JSON.stringify(genererteAktiviteter));
  }, [genererteAktiviteter]);

  useEffect(() => {
    localStorage.setItem('didaktisk_planlegger_grid', JSON.stringify(plasserteAktiviteter));
    window.dispatchEvent(new CustomEvent('didaktisk_planlegger_grid_updated', {
      detail: {
        grid: plasserteAktiviteter,
        slots: dagsrytme,
        ukeTittel,
        tema
      }
    }));
  }, [plasserteAktiviteter, dagsrytme, ukeTittel, tema]);

  useEffect(() => {
    localStorage.setItem('didaktisk_inkluder_plagg', String(inkluderPlagg));
  }, [inkluderPlagg]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle kilder
  const handleToggleKilde = (kildeNavn: string) => {
    setValgteKilder(prev => 
      prev.includes(kildeNavn) 
        ? prev.filter(k => k !== kildeNavn)
        : [...prev, kildeNavn]
    );
  };

  // Legg til egendefinert kilde / lenke
  const handleLeggTilEgenKilde = () => {
    if (!nyKildeNavn.trim()) return;

    let formatertUrl = nyKildeUrl.trim();
    if (formatertUrl && !formatertUrl.startsWith('http://') && !formatertUrl.startsWith('https://')) {
      formatertUrl = `https://${formatertUrl}`;
    }

    const nyKilde: RelevantKilde = {
      id: `egen-kilde-${Date.now()}`,
      navn: nyKildeNavn.trim(),
      url: formatertUrl || undefined,
      erEgendefinert: true
    };

    const oppdatert = [...egneKilder, nyKilde];
    setEgneKilder(oppdatert);
    localStorage.setItem('didaktisk_egne_kilder_v1', JSON.stringify(oppdatert));

    // Automatisk huk av den nye kilden
    setValgteKilder(prev => [...prev, nyKilde.navn]);

    setNyKildeNavn('');
    setNyKildeUrl('');
    setVisNyKildeSkjema(false);
    showToast(`Kilden «${nyKilde.navn}» ble lagt til og valgt!`);
  };

  // Slett egendefinert kilde
  const handleSlettEgenKilde = (kildeId: string, kildeNavn: string) => {
    const oppdatert = egneKilder.filter(k => k.id !== kildeId);
    setEgneKilder(oppdatert);
    localStorage.setItem('didaktisk_egne_kilder_v1', JSON.stringify(oppdatert));
    setValgteKilder(prev => prev.filter(n => n !== kildeNavn));
    showToast(`Kilden «${kildeNavn}» ble fjernet.`);
  };

  // Hent årsplan automatisk fra Styrern
  const handleHentAarsplanFraStyrern = () => {
    try {
      const rawChapters = localStorage.getItem(STORAGE_KEY_AARSPLAN_CHAPTERS);
      let chapters: any[] = [];
      if (rawChapters) {
        chapters = JSON.parse(rawChapters);
      }
      if (!chapters || chapters.length === 0) {
        chapters = createDefaultChapters();
      }

      // Finn relevant årshjul-kapittel eller satsingsområde
      const hostChap = chapters.find((c: any) => c.id === 'chap_aarshjul_host' || c.category === 'Årshjul');
      const satsingChap = chapters.find((c: any) => c.id === 'chap_satsingsomraader' || c.title?.toLowerCase().includes('satsing'));

      let funnetTema = '';
      if (hostChap?.subtitle && hostChap.subtitle.trim() && !hostChap.subtitle.toLowerCase().includes('aug – okt')) {
        funnetTema = `${hostChap.title}: ${hostChap.subtitle}`;
      } else if (satsingChap?.content && satsingChap.content.length > 5) {
        funnetTema = `Satsingsområde: ${satsingChap.content.substring(0, 100)}`;
      } else {
        funnetTema = 'Natur, miljø og teknologi: Småkryp, høsttegn og sanserik utforskning i skogen';
      }

      setTema(funnetTema);
      setProfil(getBarnehageProfil());
      showToast(`Årsplan hentet automatisk fra Styrern! Tema oppdatert.`);
    } catch (err) {
      console.error(err);
      showToast('Kunne ikke hente årsplan fra Styrern.');
    }
  };

  // KI-generering av aktiviteter
  const handleGenererAktiviteter = async () => {
    if (!tema.trim()) {
      showToast('Vennligst oppgi et tema først.');
      return;
    }
    if (valgteKilder.length === 0) {
      showToast('Velg minst én kilde for å generere aktiviteter.');
      return;
    }

    setIsGenerating(true);
    setGenerateStatus(`Henter forskningsbaserte forslag forankret i ${profil.plattformNavn}...`);

    try {
      const kilderMedUrls = alleKilder
        .filter(k => valgteKilder.includes(k.navn))
        .map(k => k.url ? `${k.navn} (${k.url})` : k.navn);

      const nyeKort = await generateForskningsbaserteAktiviteter({
        tema,
        alder,
        kilder: kilderMedUrls.length > 0 ? kilderMedUrls : valgteKilder,
        barnehagePlattform: `${profil.plattformNavn}: ${profil.fagligForankringsMal}`,
        plattformType: profil.plattformType,
        inkluderPlagg
      });

      if (nyeKort && nyeKort.length > 0) {
        setGenererteAktiviteter(prev => {
          const eksisterendeTitler = new Set(prev.map(p => p.tittel.toLowerCase()));
          const eksisterendeIds = new Set(prev.map(p => String(p.id)));

          const sikredeNye = nyeKort
            .filter(n => !eksisterendeTitler.has(n.tittel.toLowerCase()))
            .map((n, idx) => {
              let safeId = String(n.id || `gen-${idx}`);
              if (eksisterendeIds.has(safeId)) {
                safeId = `gen-${safeId}-${Date.now()}-${idx}`;
              }
              eksisterendeIds.add(safeId);
              return { ...n, id: safeId };
            });

          return [...sikredeNye, ...prev];
        });
        showToast(`${nyeKort.length} nye aktiviteter ble generert!`);
      } else {
        showToast('Fant ingen nye forslag. Prøv et annet tema.');
      }
    } catch (err: any) {
      console.error('Feil ved generering:', err);
      showToast('Klarte ikke å koble til KI akkurat nå. Bruker forhåndslagrede forslag.');
    } finally {
      setIsGenerating(false);
      setGenerateStatus(null);
    }
  };

  // Dra og slipp håndtering
  const handleDragStart = (akt: ForskningsbasertAktivitet) => {
    setDraggedActivity(akt);
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverCell !== cellKey) {
      setDragOverCell(cellKey);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, cellKey: string) => {
    if (dragOverCell === cellKey) {
      setDragOverCell(null);
    }
  };

  const handleDrop = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedActivity) return;

    plasserAktivitetICelle(draggedActivity, cellKey);
    setDraggedActivity(null);
  };

  const plasserAktivitetICelle = (akt: ForskningsbasertAktivitet, cellKey: string) => {
    const nyPlassert: PlacedActivity = {
      id: `plassert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceActivityId: akt.id,
      type: akt.type,
      tittel: akt.tittel,
      kilde: akt.kilde,
      beskrivelse: akt.beskrivelse,
      hva: akt.hva,
      hvordan: akt.hvordan,
      hvorfor: akt.hvorfor,
      begrepslaering: akt.begrepslaering,
      mestring: akt.mestring,
      plaggFokus: akt.plaggFokus,
      refleksjon: akt.refleksjon
    };

    setPlasserteAktiviteter(prev => {
      const eksisterende = prev[cellKey] || [];
      return {
        ...prev,
        [cellKey]: [...eksisterende, nyPlassert]
      };
    });

    const parts = cellKey.split('-');
    const dagNum = Number(parts[0]);
    const slotId = parts.slice(1).join('-');
    const dagNavn = UKEDAGER.find(d => d.dagNum === dagNum)?.navn || 'dagen';
    const tidNavn = dagsrytme.find(s => s.id === slotId)?.navn || dagsrytme[Number(slotId)]?.navn || '';
    showToast(`La til "${akt.tittel}" på ${dagNavn} (${tidNavn})`);
  };

  const fjernPlassertAktivitet = (cellKey: string, plassertId: string) => {
    setPlasserteAktiviteter(prev => {
      const liste = prev[cellKey] || [];
      const oppdatert = liste.filter(p => p.id !== plassertId);
      if (oppdatert.length === 0) {
        const ny = { ...prev };
        delete ny[cellKey];
        return ny;
      }
      return {
        ...prev,
        [cellKey]: oppdatert
      };
    });
  };

  // Legg til manuell aktivitet
  const handleOpprettEgenAktivitet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const nyAktivitet: ForskningsbasertAktivitet = {
      id: Date.now(),
      type: customType,
      tittel: stripAllEmojis(customTitle.trim()),
      kilde: stripAllEmojis(customKilde.trim() || 'Eget opplegg'),
      beskrivelse: 'Egendefinert didaktisk aktivitet.',
      hvorfor: 'Valgt av pedagogisk leder for å møte barnegruppens behov.'
    };

    setGenererteAktiviteter(prev => [nyAktivitet, ...prev]);
    setCustomTitle('');
    setShowCustomModal(false);
    showToast(`Opprettet "${nyAktivitet.tittel}"`);
  };

  // PDF / Utskrift
  const handlePrint = () => {
    window.print();
  };

  // Send varsel til base (Share API + Fallback)
  const handleSendVarsler = async () => {
    // Samle opp fagdrypp og hovedaktiviteter for uken
    const allePlasserte: PlacedActivity[] = Object.values(plasserteAktiviteter).flat();
    const fagdryppTekster = allePlasserte.filter(p => p.type === 'fagdrypp').map(p => `• ${p.tittel}`);
    const hovedAktiviteter = allePlasserte.filter(p => p.type === 'hoved').slice(0, 3).map(p => `• ${p.tittel} (${p.kilde})`);

    const varselTekst = `Ukeplan & Dagsfokus: ${ukeTittel}
Avdeling: ${avdelingNavn}
Tema: ${tema} (${alder})

Hovedaktiviteter denne uken:
${hovedAktiviteter.length > 0 ? hovedAktiviteter.join('\n') : '• Følg dagsrytmen og vær tett på barna i leken.'}

Didaktisk Fag-drypp til personalet:
${fagdryppTekster.length > 0 ? fagdryppTekster.join('\n') : '• Husk å sette ord på det barna utforsker i naturen i dag!'}

Gjenkalling og dagsrytme er tilgjengelig i Pedportalen: www.pedportalen.no`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ukevarsel: ${ukeTittel} (${avdelingNavn})`,
          text: varselTekst,
        });
        showToast('Ukevarsel ble delt med basen!');
        return;
      } catch (err) {
        console.log('Deling avbrutt eller feilet:', err);
      }
    }

    // Fallback til clipboard
    try {
      await navigator.clipboard.writeText(varselTekst);
      showToast('Teksten er kopiert til utklippstavlen! Kan limes rett inn i SMS eller personalgruppe.');
    } catch {
      showToast('Kunne ikke kopiere automatisk. Åpner delingsvisning.');
    }
    setShowShareModal(true);
  };

  const handleNullstill = () => {
    if (window.confirm('Er du sikker på at du vil tømme alle plasserte aktiviteter i denne ukeplanen?')) {
      setPlasserteAktiviteter({});
      showToast('Ukeplanen ble nullstilt.');
    }
  };

  // Type styling
  const getTypeBadge = (type: 'hoved' | 'gjenkalling' | 'fagdrypp') => {
    switch (type) {
      case 'hoved':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Hovedaktivitet'
        };
      case 'gjenkalling':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Gjenkalling (PLAGG)'
        };
      case 'fagdrypp':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Fag-drypp'
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* Toast Notifikasjon */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Skriveverksted hurtiglenke hvis koblet til student/pedleder */}
      {onOpenWritingWorkshop && (
        <div className="mb-4 flex items-center justify-between bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-emerald-900">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Jobber du med lengre fagtekster eller oppgaveskriving?</span>
          </div>
          <button
            onClick={onOpenWritingWorkshop}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
          >
            Åpne Skriveverksted <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* VENSTRE KOLONNE: KI-Planleggeren */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1.5">
              <BrainCircuit className="text-emerald-500 w-6 h-6 shrink-0" />
              Planleggeren
            </h1>
            <p className="text-slate-500 text-xs">
              Generer forskningsbaserte aktiviteter forankret i barnehagens pedagogiske plattform og dagsrytme.
            </p>
          </div>

          {/* Barnehagens Pedagogiske Plattform (fra Styrern) */}
          <div className="mb-4 p-3 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                  Pedagogisk plattform (Styrern)
                </span>
                <span className="font-extrabold text-xs text-slate-900 truncate block">
                  {profil.plattformNavn}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPlattformModalOpen(true)}
              className="text-[11px] font-bold text-teal-700 bg-white hover:bg-teal-100/70 px-2.5 py-1.5 rounded-lg border border-teal-300 transition shrink-0 shadow-2xs"
            >
              Endre
            </button>
          </div>

          {/* PLAGG Innstilling (Standard, men valgfritt med forklaring) */}
          <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={inkluderPlagg}
                  onChange={(e) => setInkluderPlagg(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-400 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-950">
                  Inkluder PLAGG-gjenkalling
                </span>
              </label>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                Standard
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-800/80 pl-6">
              <span>Refleksjon, hukommelse og begrep</span>
              <button
                type="button"
                onClick={() => setIsPlaggInfoModalOpen(true)}
                className="font-bold underline text-indigo-700 hover:text-indigo-950 flex items-center gap-1 shrink-0"
              >
                <HelpCircle className="w-3 h-3" /> Hva er PLAGG?
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-bold text-slate-800 block">Tema for perioden</label>
                <button
                  type="button"
                  onClick={handleHentAarsplanFraStyrern}
                  className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Hent årsplan og månedens tema automatisk fra Styrern"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Hent årsplan</span>
                </button>
              </div>
              <textarea 
                rows={4}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="f.eks. Natur, miljø og teknologi: Småkryp og høsttegn (eller klikk «Hent årsplan»)..."
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition leading-relaxed resize-y min-h-[96px] bg-white text-slate-800"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 block">Aldersgruppe</label>
              <select 
                value={alder}
                onChange={(e) => setAlder(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm transition"
              >
                <option value="1-2 år">1-2 år</option>
                <option value="3-4 år">3-4 år</option>
                <option value="4-5 år">4-5 år</option>
              </select>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 block">
                  Inkluder kilder fra:
                </label>
                <button
                  type="button"
                  onClick={() => setVisNyKildeSkjema(!visNyKildeSkjema)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  title="Legg til en egen kilde eller nettlenke"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{visNyKildeSkjema ? 'Lukk' : 'Legg til egen kilde'}</span>
                </button>
              </div>

              {/* Skjema for ny egen kilde */}
              {visNyKildeSkjema && (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs animate-fade-in">
                  <div className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Legg til egen kilde eller lenke</span>
                  </div>
                  <div>
                    <input 
                      type="text"
                      placeholder="Kildenavn (f.eks: Natursekken, Salaby, Eget hefte)"
                      value={nyKildeNavn}
                      onChange={(e) => setNyKildeNavn(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <input 
                      type="text"
                      placeholder="Lenke / URL (valgfritt, f.eks: https://natursekken.no)"
                      value={nyKildeUrl}
                      onChange={(e) => setNyKildeUrl(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setVisNyKildeSkjema(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg"
                    >
                      Avbryt
                    </button>
                    <button
                      type="button"
                      onClick={handleLeggTilEgenKilde}
                      disabled={!nyKildeNavn.trim()}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Legg til kilde</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Kilde-listen */}
              <div className="space-y-1.5 text-sm text-slate-600">
                {alleKilder.map(k => (
                  <div key={k.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/80 transition group">
                    <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-900 transition flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={valgteKilder.includes(k.navn)}
                        onChange={() => handleToggleKilde(k.navn)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-400 accent-emerald-600 cursor-pointer shrink-0" 
                      /> 
                      <span className={`text-xs ${k.erEgendefinert ? 'font-bold text-emerald-950' : ''} truncate`}>
                        {k.navn}
                      </span>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      {k.url && (
                        <a 
                          href={k.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-emerald-700 p-1 rounded transition hover:bg-emerald-50"
                          title={`Åpne ${k.navn} (${k.url}) i ny fane`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {k.erEgendefinert && (
                        <button
                          type="button"
                          onClick={() => handleSlettEgenKilde(k.id, k.navn)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded transition opacity-80 hover:opacity-100 hover:bg-rose-50"
                          title="Fjern denne kilden"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenererAktiviteter}
              disabled={isGenerating}
              className={`w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                isGenerating ? 'opacity-80 cursor-wait' : 'hover:bg-emerald-600 active:scale-98'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Genererer forskningsbaserte kort...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generer aktiviteter</span>
                </>
              )}
            </button>

            {generateStatus && (
              <p className="text-xs text-center text-slate-500 animate-pulse">
                {generateStatus}
              </p>
            )}
          </div>

          {/* Genererte dra-og-slipp kort */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Dra til ukeplanen ({genererteAktiviteter.length})
              </h3>
              <button
                onClick={() => setShowCustomModal(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Egen
              </button>
            </div>

            <div className="space-y-3">
              {genererteAktiviteter.map((akt, aktIdx) => {
                const badge = getTypeBadge(akt.type);
                return (
                  <div 
                    key={`gen-akt-${akt.id}-${aktIdx}`} 
                    draggable={true}
                    onDragStart={() => handleDragStart(akt)}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-all group relative select-none hover:shadow-md"
                  >
                    <div className="flex items-start gap-2.5">
                      <GripVertical className="text-slate-300 w-5 h-5 mt-0.5 group-hover:text-emerald-500 shrink-0 transition-colors" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        <h4 className="font-semibold text-sm text-slate-800 leading-snug break-words">
                          {akt.tittel}
                        </h4>
                        
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-xs text-slate-500">
                          <span className="flex items-center gap-1 truncate">
                            <Leaf className="w-3 h-3 text-emerald-600 shrink-0" /> 
                            <span className="truncate">{akt.kilde}</span>
                          </span>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {akt.beskrivelse && (
                              <button
                                onClick={() => setSelectedCardForModal(akt)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                                title="Vis detaljer"
                              >
                                Detaljer
                              </button>
                            )}

                            {/* Hurtig-plasseringsknapp for mobil / touchskjerm */}
                            <button
                              onClick={() => setQuickPlaceActivity(akt)}
                              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded"
                              title="Plasser i kalender"
                            >
                              + Plasser
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {genererteAktiviteter.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Ingen aktiviteter generert ennå. Klikk på "Generer aktiviteter" ovenfor.
              </div>
            )}
          </div>
        </div>

        {/* HØYRE KOLONNE: Ukeplan og Dagsrytme */}
        <div className="flex-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-emerald-500 w-6 h-6 shrink-0" />
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={ukeTittel}
                    onChange={(e) => setUkeTittel(e.target.value)}
                    className="text-xl font-bold text-slate-900 border-b border-emerald-500 outline-none pb-0.5"
                    autoFocus
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  />
                  <button 
                    onClick={() => setIsEditingTitle(false)}
                    className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold"
                  >
                    Ferdig
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {ukeTittel}
                  </h2>
                  <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleOpenAddSlot}
                className="px-3.5 py-2 text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Legg til egendefinert tidspunkt eller ny økt"
              >
                <Plus className="w-4 h-4" />
                <span>Nytt tidspunkt</span>
              </button>

              <button 
                onClick={() => {
                  setEditingSlot(null);
                  setShowTimeSlotModal(true);
                }}
                className="px-3.5 py-2 text-xs md:text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm text-slate-700 cursor-pointer"
                title="Administrer og tilpass dagsrytmen"
              >
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>Tilpass dagsrytme</span>
              </button>

              <button 
                onClick={handlePrint}
                className="px-3.5 py-2 text-xs md:text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm text-slate-700 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Eksporter til PDF</span>
              </button>
              
              <button 
                onClick={handleSendVarsler}
                className="px-3.5 py-2 text-xs md:text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send varsler til base</span>
              </button>

              <button
                onClick={handleNullstill}
                title="Nullstill ukeplan"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rutenett for kalender */}
          <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left table-fixed min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-36 p-3 font-semibold text-slate-700 border-b border-slate-200 text-xs tracking-wider">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-[11px] font-bold text-slate-500">Tid</span>
                      <button
                        onClick={handleOpenAddSlot}
                        title="Legg til egendefinert tidspunkt"
                        className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1 rounded-md transition flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Legg til</span>
                      </button>
                    </div>
                  </th>
                  {UKEDAGER.map(dag => (
                    <th 
                      key={`th-ukedag-${dag.dagNum}`} 
                      className={`p-3 font-bold border-b border-slate-200 text-center ${
                        dag.erTur 
                          ? 'bg-emerald-50 text-emerald-900 font-extrabold border-l border-emerald-100' 
                          : 'text-slate-800 border-l border-slate-100'
                      }`}
                    >
                      {dag.navn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dagsrytme.map((tidspunkt, tidIdx) => {
                  const slotId = tidspunkt.id || `slot-${tidIdx}`;
                  return (
                    <tr key={`row-tid-${slotId}-${tidspunkt.tid}`} className="border-b border-slate-100 group">
                      {/* Tids-kolonne med redigering og sletting */}
                      <td className="p-3 align-top border-r border-slate-100 bg-slate-50/70 group/timerow">
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
                            <span>{tidspunkt.tid}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-40 group-hover/timerow:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditSlot(tidspunkt)}
                              title="Rediger tidspunkt og tittel"
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/60 rounded transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(tidspunkt.id)}
                              title="Slett dette tidspunktet"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 mt-1 leading-snug">
                          {tidspunkt.navn}
                        </div>
                        {tidspunkt.beskrivelse && (
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic" title={tidspunkt.beskrivelse}>
                            {tidspunkt.beskrivelse}
                          </div>
                        )}
                        {tidspunkt.erEgendefinert && (
                          <span className="inline-block mt-1 text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-1 py-0.2 rounded">
                            Egendefinert
                          </span>
                        )}
                      </td>

                      {/* Dropp-soner for ukedagene (1 til 5) */}
                      {UKEDAGER.map(dag => {
                        const cellKey = `${dag.dagNum}-${slotId}`;
                        const legacyKey = `${dag.dagNum}-${tidIdx}`;
                        const kortListe = plasserteAktiviteter[cellKey] || plasserteAktiviteter[legacyKey] || [];
                        const isHovered = dragOverCell === cellKey || dragOverCell === legacyKey;

                        return (
                          <td 
                            key={`cell-dag-${dag.dagNum}-${slotId}`} 
                            onDragOver={(e) => handleDragOver(e, cellKey)}
                            onDragLeave={(e) => handleDragLeave(e, cellKey)}
                            onDrop={(e) => handleDrop(e, cellKey)}
                            className={`p-2 align-top border-r border-slate-100 transition-colors ${
                              dag.erTur ? 'bg-emerald-50/20' : ''
                            } ${isHovered ? 'bg-emerald-100/60 ring-2 ring-emerald-400 ring-inset' : 'hover:bg-slate-50/70'}`}
                          >
                            <div className={`min-h-[4.5rem] w-full rounded-lg flex flex-col gap-1.5 transition-all p-1 ${
                              kortListe.length === 0 
                                ? 'border-2 border-dashed border-slate-200 hover:border-slate-300 items-center justify-center' 
                                : ''
                            }`}>
                              
                              {/* Hvis ingen kort er plassert */}
                              {kortListe.length === 0 && (
                                <span className="text-[10px] text-slate-300 font-medium select-none pointer-events-none group-hover:text-slate-400">
                                  {isHovered ? 'Slipp her!' : 'Slipp kort her'}
                                </span>
                              )}

                              {/* Plasserte kort i cellen */}
                              {kortListe.map((plassert, pIdx) => {
                                const badge = getTypeBadge(plassert.type);
                                return (
                                  <div 
                                    key={`plassert-${plassert.id}-${pIdx}`} 
                                    className={`p-2 rounded-lg border shadow-xs relative group/card transition-all ${
                                      plassert.type === 'hoved' 
                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
                                        : plassert.type === 'gjenkalling'
                                        ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                                        : 'bg-amber-50/90 border-amber-200 text-amber-950'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                        <h5 className="font-bold text-xs leading-tight line-clamp-2">
                                          {plassert.tittel}
                                        </h5>
                                      </div>
                                      
                                      <button
                                        onClick={() => {
                                          fjernPlassertAktivitet(cellKey, plassert.id);
                                          fjernPlassertAktivitet(legacyKey, plassert.id);
                                        }}
                                        className="opacity-0 group-hover/card:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                        title="Fjern fra ukeplanen"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                                      <span className="truncate max-w-[100px]">{plassert.kilde}</span>
                                      {plassert.beskrivelse && (
                                        <button 
                                          onClick={() => setSelectedCardForModal(plassert)}
                                          className="text-slate-400 hover:text-slate-700 underline text-[9px] cursor-pointer"
                                        >
                                          Se info
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bunn-info og fotnote */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hovedaktivitet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> {inkluderPlagg ? 'Gjenkalling (PLAGG)' : 'Gjenkalling & Refleksjon'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Fag-drypp
              </span>
            </div>
            <span>
              Tips: Du kan også klikke "+ Plasser" på mobil for å legge aktiviteter direkte i kalenderen.
            </span>
          </div>
        </div>

      </div>

      {/* MODAL 1: Kortdetaljer */}
      {selectedCardForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadge(selectedCardForModal.type).bg}`}>
                  {getTypeBadge(selectedCardForModal.type).label}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedCardForModal.tittel}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Leaf className="w-3 h-3 text-emerald-600" /> Kilde: {selectedCardForModal.kilde}
                </p>
              </div>
              <button 
                onClick={() => setSelectedCardForModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-[60vh] overflow-y-auto">
              {selectedCardForModal.hva && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-1">Hva:</h4>
                  <p className="leading-relaxed text-slate-800">{selectedCardForModal.hva}</p>
                </div>
              )}

              {selectedCardForModal.hvordan && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-1">Hvordan (Metode og voksenrolle):</h4>
                  <p className="leading-relaxed text-slate-800">{selectedCardForModal.hvordan}</p>
                </div>
              )}

              {!selectedCardForModal.hva && selectedCardForModal.beskrivelse && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-1">Beskrivelse:</h4>
                  <p className="leading-relaxed text-slate-800">{selectedCardForModal.beskrivelse}</p>
                </div>
              )}

              {selectedCardForModal.hvorfor && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-1">Hvorfor (Rammeplan & Formål):</h4>
                  <p className="leading-relaxed text-slate-800">{selectedCardForModal.hvorfor}</p>
                </div>
              )}

              {selectedCardForModal.begrepslaering && (
                <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-lg">
                  <h4 className="font-bold text-xs uppercase text-emerald-800 tracking-wider mb-1">Begrepslæring (Språkløyper):</h4>
                  <p className="font-medium text-emerald-950">{selectedCardForModal.begrepslaering}</p>
                </div>
              )}

              {selectedCardForModal.mestring && (
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-lg">
                  <h4 className="font-bold text-xs uppercase text-amber-800 tracking-wider mb-1">Læring gjennom mestring (Skoggruppemetoden):</h4>
                  <p className="font-medium text-amber-950">{selectedCardForModal.mestring}</p>
                </div>
              )}

              {selectedCardForModal.plaggFokus && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-1">PLAGG-Fokus:</h4>
                  <span className="inline-block bg-indigo-100 text-indigo-900 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-200">
                    {selectedCardForModal.plaggFokus}
                  </span>
                </div>
              )}

              {selectedCardForModal.refleksjon && (
                <div className="bg-sky-50/80 border border-sky-200 p-3 rounded-lg">
                  <h4 className="font-bold text-xs uppercase text-sky-800 tracking-wider mb-1">Refleksjon for personalet:</h4>
                  <p className="font-medium text-sky-950 italic">{selectedCardForModal.refleksjon}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedCardForModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Hurtig-plassering for mobil/touch */}
      {quickPlaceActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Plasser i ukeplanen
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {quickPlaceActivity.tittel}
                </p>
              </div>
              <button 
                onClick={() => setQuickPlaceActivity(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Velg ukedag og tidsblokk for aktiviteten:
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {UKEDAGER.map(dag => (
                <div key={`qp-dag-${dag.dagNum}`} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                  <div className="font-bold text-xs text-slate-800 mb-2">
                    {dag.navn}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {dagsrytme.map((tid, tidIdx) => (
                      <button
                        key={`qp-slot-${dag.dagNum}-${tid.id || tidIdx}`}
                        onClick={() => {
                          plasserAktivitetICelle(quickPlaceActivity, `${dag.dagNum}-${tid.id || tidIdx}`);
                          setQuickPlaceActivity(null);
                        }}
                        className="text-left text-xs bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 p-2 rounded-lg transition cursor-pointer"
                      >
                        <span className="font-bold text-[11px] block">{tid.tid}</span>
                        <span className="text-[10px] text-slate-500 truncate block">{tid.navn}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setQuickPlaceActivity(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Opprett egen aktivitet */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleOpprettEgenAktivitet} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Opprett egen aktivitet
              </h3>
              <button 
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tittel på aktivitet</label>
                <input 
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="f.eks. Eventyrstund i skogen"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kilde / Forankring</label>
                <input 
                  value={customKilde}
                  onChange={(e) => setCustomKilde(e.target.value)}
                  placeholder="f.eks. Rammeplanen / Eget prosjekt"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type</label>
                <select 
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="hoved">Hovedaktivitet</option>
                  <option value="gjenkalling">Gjenkalling (PLAGG)</option>
                  <option value="fagdrypp">Fag-drypp</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Avbryt
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Legg til
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Tilpass dagsrytme og egendefinerte tidspunkter */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  {editingSlot ? 'Rediger tidspunkt i ukeplanen' : 'Legg til egendefinert tidspunkt'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tilpass barnehagens dagsrytme og tidsblokker. Endringer synkroniseres automatisk med Avdelingen i dag.
                </p>
              </div>
              <button 
                onClick={() => setShowTimeSlotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Hurtigvalg for vanlige økter */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Hurtigforslag for barnehagen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tid: '09:15', navn: 'Morgensamling', desc: 'Felles sang, tilstedeværelse og dagens tema' },
                    { tid: '10:00', navn: 'Aktivitet 1 (Hovedfokus)', desc: 'Pedagogisk kjerneøkt forankret i Rammeplanen' },
                    { tid: '10:30', navn: 'Smågruppeaktivitet', desc: 'Aldersinndelte grupper med målrettet pedagogikk' },
                    { tid: '11:00', navn: 'Felles Lunsj', desc: 'Måltidsfellesskap, språklig samspill og ro' },
                    { tid: '11:45', navn: 'Aktivitet 2 / Utetid', desc: 'Grovmotorisk lek og sanseopplevelser ute' },
                    { tid: '12:30', navn: 'Hvile & Lyttepause', desc: 'Rolig stund med høytlesning og lydbok' },
                    { tid: '14:00', navn: 'Fruktmåltid', desc: 'Oppskåret frukt og samtaler om dagen' },
                    { tid: '15:00', navn: 'Gjenkalling & Refleksjon', desc: 'PLAGG-refleksjon og danning med barna' },
                  ].map((forslag, fIdx) => (
                    <button
                      key={`forslag-${fIdx}`}
                      type="button"
                      onClick={() => {
                        setSlotFormTid(forslag.tid);
                        setSlotFormNavn(forslag.navn);
                        setSlotFormBeskrivelse(forslag.desc);
                      }}
                      className="text-[11px] px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-lg transition font-medium cursor-pointer"
                    >
                      <span className="font-bold text-emerald-700 mr-1">{forslag.tid}</span>
                      <span>{forslag.navn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skjema */}
              <form id="time-slot-form" onSubmit={handleSaveSlot} className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Klokkeslett:
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="f.eks. 09:30"
                      value={slotFormTid}
                      onChange={(e) => setSlotFormTid(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Navn på økten:
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="f.eks. Smågrupper eller Morgensamling"
                      value={slotFormNavn}
                      onChange={(e) => setSlotFormNavn(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Beskrivelse / Pedagogisk formål (valgfritt):
                  </label>
                  <input 
                    type="text"
                    placeholder="f.eks. Garderobesituasjon, måltidsfellesskap eller språkgrupper"
                    value={slotFormBeskrivelse}
                    onChange={(e) => setSlotFormBeskrivelse(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </form>

              {/* Oversikt over alle nåværende tidspunkter i ukeplanen */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Dagens tidspunkter ({dagsrytme.length} økter):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSortChronologically}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Sorter tidspunktene fra morgen til ettermiddag"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Sorter kronologisk</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSlots}
                      className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition cursor-pointer"
                      title="Nullstill til standardplan"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Standard</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {dagsrytme.map((slot) => (
                    <div 
                      key={`slot-item-${slot.id}`}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                        editingSlot?.id === slot.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 shrink-0">
                          {slot.tid}
                        </span>
                        <span className="truncate">{slot.navn}</span>
                        {slot.erEgendefinert && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">
                            Egen
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSlot(slot)}
                          className="p-1 text-slate-500 hover:text-emerald-700 rounded transition cursor-pointer"
                          title="Rediger dette tidspunktet"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Slett dette tidspunktet"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                {editingSlot && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Slett dette tidspunktet</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setShowTimeSlotModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Avbryt
                </button>
                <button 
                  type="submit"
                  form="time-slot-form"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingSlot ? 'Lagre endring' : 'Legg til tidspunkt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Send varsler / Del med base */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                  Varsel til basen
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sendes til ansatte, fagarbeidere og eventuelle vikarer.
                </p>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto mb-4">
              {`Hei teamet på ${avdelingNavn}!

Her er ukeplanen og hovedfokuset for "${ukeTittel}":
Tema: ${tema} (${alder})

Faste hovedaktiviteter:
${Object.values(plasserteAktiviteter).flat().filter(p => p.type === 'hoved').map(p => `• ${p.tittel} (${p.kilde})`).join('\n') || '• Være tett på barna i frileken'}

Fag-drypp til personalet:
${Object.values(plasserteAktiviteter).flat().filter(p => p.type === 'fagdrypp').map(p => `• ${p.tittel}`).join('\n') || '• Husk å sette ord på det barna utforsker i dag!'}

Se full dagsrytme og gjenkallinger i Pedportalen:
www.pedportalen.no`}
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Lukk
              </button>
              <button 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `Hei teamet på ${avdelingNavn}!\nTema: ${tema}\nSe dagsplan i Pedportalen: www.pedportalen.no`
                    );
                    showToast('Kopiert til utklippstavlen!');
                    setShowShareModal(false);
                  } catch {
                    showToast('Klarte ikke å kopiere teksten.');
                  }
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Copy className="w-3.5 h-3.5" /> Kopier tekst
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Hva er PLAGG Veiledningsmodal */}
      <PlaggInfoModal 
        isOpen={isPlaggInfoModalOpen}
        onClose={() => setIsPlaggInfoModalOpen(false)}
      />

      {/* MODAL 5: Pedagogisk Plattform & DNA (Styrern) */}
      <PedagogiskPlattformModal
        isOpen={isPlattformModalOpen}
        onClose={() => setIsPlattformModalOpen(false)}
        onProfileSaved={(oppdatert) => {
          setProfil(oppdatert);
          showToast(`Pedagogisk plattform oppdatert til ${oppdatert.plattformNavn}!`);
        }}
      />

    </div>
  );
}

// Named export for backwards compatibility
export { DidaktiskPlanlegger };
