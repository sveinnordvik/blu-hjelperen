import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookMarked, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  BookmarkPlus, 
  Layers, 
  Filter, 
  ExternalLink, 
  CheckCircle2,
  FileText,
  Library,
  ArrowRight,
  CheckSquare,
  X
} from 'lucide-react';
import { 
  AcademicSource, 
  BLU_STANDARD_SOURCES, 
  getStoredCustomSources, 
  saveCustomSource,
  deleteCustomSource
} from '../../lib/academicSources';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { TransferSourcesModal } from './TransferSourcesModal';
import { WorkspaceLayout } from '../WorkspaceLayout';
import { PensumHubActionMenu, PensumHubAction } from './PensumHubActionMenu';
import { usePensumHub } from '../../context/PensumHubContext';

interface KildebankViewProps {
  onNavigateToWorkshop?: (targetDocId?: string) => void;
  standalone?: boolean;
}

export const KildebankView: React.FC<KildebankViewProps> = ({
  onNavigateToWorkshop,
  standalone = true
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'mySources' | 'all' | 'addNew'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customSources, setCustomSources] = useState<AcademicSource[]>(() => getStoredCustomSources());
  const { pendingAction, startPensumAction } = usePensumHub();

  // Avhuking / Multi-select tilstand
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPensumHubMenuOpen, setIsPensumHubMenuOpen] = useState(false);

  // Kopiert-tilstander
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'inText' | 'full' | 'all' | 'selected' | null>(null);

  // Sidetall-visning
  const [includePageNumber, setIncludePageNumber] = useState(false);
  const [pageNumberInput, setPageNumberInput] = useState('42');

  // Form for ny kilde
  const [sourceType, setSourceType] = useState<'book' | 'article' | 'web' | 'law'>('book');
  const [authorInput, setAuthorInput] = useState('');
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [titleInput, setTitleInput] = useState('');
  const [publisherInput, setPublisherInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'pedagogikk' | 'rammeverk' | 'sprak' | 'natur' | 'kunst' | 'ledelse' | 'annen'>('pedagogikk');
  const [keyTopicsInput, setKeyTopicsInput] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Lytt på endringer i lagrede kilder
  useEffect(() => {
    const handleStorageChange = () => {
      setCustomSources(getStoredCustomSources());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const allAvailableSources = useMemo(() => {
    return [...customSources, ...BLU_STANDARD_SOURCES];
  }, [customSources]);

  const filteredSources = useMemo(() => {
    let list: AcademicSource[] = [];
    if (activeTab === 'standard') {
      list = BLU_STANDARD_SOURCES;
    } else if (activeTab === 'mySources') {
      list = customSources;
    } else {
      list = allAvailableSources;
    }

    return list.filter(source => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        source.author.toLowerCase().includes(q) ||
        source.title.toLowerCase().includes(q) ||
        source.details.toLowerCase().includes(q) ||
        source.keyTopics.some(k => k.toLowerCase().includes(q)) ||
        source.description.toLowerCase().includes(q)
      );

      let matchesCat = true;
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'rammeverk') {
          matchesCat = source.category === 'rammeverk';
        } else if (selectedCategory === 'pedagogikk') {
          matchesCat = source.category === 'pedagogikk' || (source.categoryLabel && source.categoryLabel.includes('Medvirkning'));
        } else if (selectedCategory === 'omsorg') {
          matchesCat = source.keyTopics.some(k => k.includes('omsorg') || k.includes('tilknytning') || k.includes('trygghet') || k.includes('1-3')) || source.category === 'pedagogikk';
        } else if (selectedCategory === 'sprak') {
          matchesCat = source.category === 'sprak';
        } else if (selectedCategory === 'kunst') {
          matchesCat = source.category === 'kunst';
        } else if (selectedCategory === 'natur') {
          matchesCat = source.category === 'natur';
        } else if (selectedCategory === 'ledelse') {
          matchesCat = source.category === 'ledelse';
        } else if (selectedCategory === 'lek') {
          matchesCat = source.keyTopics.some(k => k.includes('lek') || k.includes('læring') || k.includes('didaktikk')) || source.category === 'pedagogikk';
        } else {
          matchesCat = source.category === selectedCategory;
        }
      }

      return matchesSearch && matchesCat;
    });
  }, [activeTab, customSources, allAvailableSources, searchQuery, selectedCategory]);

  // Huk av / fjern avhuking for én kilde
  const toggleSourceSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Huk av alle filtrerte kilder
  const handleSelectAllFiltered = () => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      filteredSources.forEach(s => next.add(s.id));
      return next;
    });
  };

  // Fjern alle avhukinger
  const handleDeselectAll = () => {
    setSelectedSourceIds(new Set());
  };

  // Hent array av faktisk valgte AcademicSource-objekter
  const selectedSourcesList = useMemo(() => {
    return allAvailableSources.filter(s => selectedSourceIds.has(s.id));
  }, [allAvailableSources, selectedSourceIds]);

  const handleCopyInText = (source: AcademicSource) => {
    let inText = source.inTextCitation;
    if (includePageNumber && pageNumberInput.trim()) {
      inText = inText.replace(/\)$/, `, s. ${pageNumberInput.trim()})`);
    }
    navigator.clipboard.writeText(inText);
    setCopiedId(source.id);
    setCopiedType('inText');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  const handleCopyFullRef = (source: AcademicSource) => {
    const cleanRef = source.fullReference.replace(/\*(.*?)\*/g, '$1');
    navigator.clipboard.writeText(cleanRef);
    setCopiedId(source.id);
    setCopiedType('full');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  const handleCopyAllBibliography = () => {
    const listToCopy = customSources.length > 0 ? customSources : BLU_STANDARD_SOURCES;
    const sorted = [...listToCopy].sort((a, b) => a.author.localeCompare(b.author, 'nb'));
    const bibText = sorted.map(s => s.fullReference.replace(/\*(.*?)\*/g, '$1')).join('\n\n');
    navigator.clipboard.writeText(bibText);
    setCopiedType('all');
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  const handleCopySelectedBibliography = () => {
    if (selectedSourcesList.length === 0) return;
    const sorted = [...selectedSourcesList].sort((a, b) => a.author.localeCompare(b.author, 'nb'));
    const bibText = sorted.map(s => s.fullReference.replace(/\*(.*?)\*/g, '$1')).join('\n\n');
    navigator.clipboard.writeText(bibText);
    setCopiedType('selected');
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  const handleDeleteSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Er du sikker på at du vil fjerne denne kilden fra din personlige kildebank?')) {
      const updated = deleteCustomSource(id);
      setCustomSources(updated);
      setSelectedSourceIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSaveNewSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorInput.trim() || !titleInput.trim()) return;

    const year = parseInt(yearInput, 10) || new Date().getFullYear();
    const cleanAuthor = authorInput.trim();
    const authorSurname = cleanAuthor.split(',')[0].trim() || cleanAuthor.split(' ')[cleanAuthor.split(' ').length - 1];

    let fullRef = '';
    if (sourceType === 'book') {
      fullRef = `${cleanAuthor} (${year}). *${titleInput.trim()}*. ${publisherInput.trim() || 'Fagbokforlaget'}.`;
    } else if (sourceType === 'article') {
      fullRef = `${cleanAuthor} (${year}). ${titleInput.trim()}. *${publisherInput.trim() || 'Tidsskrift for barnehagelærerutdanning'}*.${urlInput.trim() ? ` ${urlInput.trim()}` : ''}`;
    } else if (sourceType === 'law') {
      fullRef = `${cleanAuthor}. (${year}). *${titleInput.trim()}*. ${publisherInput.trim() || 'Lovdata'}.${urlInput.trim() ? ` ${urlInput.trim()}` : ''}`;
    } else {
      fullRef = `${cleanAuthor}. (${year}). *${titleInput.trim()}*. ${publisherInput.trim() || 'Utdanningsdirektoratet'}.${urlInput.trim() ? ` Hentet fra ${urlInput.trim()}` : ''}`;
    }

    const categoryLabels: Record<string, string> = {
      pedagogikk: 'Pedagogikk & Medvirkning',
      rammeverk: 'Lover & Rammeverk',
      sprak: 'Språk & Tekst',
      natur: 'Natur & Bevegelse',
      kunst: 'Kunst & Kultur',
      ledelse: 'Ledelse & Samarbeid',
      annen: 'Egen pensumkilde'
    };

    const topicsArray = keyTopicsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (topicsArray.length === 0) {
      topicsArray.push('pensum', 'egen kilde');
    }

    const newSource: AcademicSource = {
      id: `custom-${Date.now()}`,
      category: categoryInput,
      categoryLabel: categoryLabels[categoryInput] || 'Egen pensumkilde',
      author: cleanAuthor,
      year,
      title: titleInput.trim(),
      details: publisherInput.trim() || (urlInput.trim() || 'Fagkilde'),
      inTextCitation: `(${authorSurname}, ${year})`,
      fullReference: fullRef,
      keyTopics: topicsArray,
      description: `Egendefinert kilde registrert i Kildebanken (${sourceType === 'book' ? 'Bok' : sourceType === 'article' ? 'Artikkel' : 'Nettressurs'}).`
    };

    const updated = saveCustomSource(newSource);
    setCustomSources(updated);

    setAuthorInput('');
    setTitleInput('');
    setPublisherInput('');
    setUrlInput('');
    setKeyTopicsInput('');
    setFormSuccessMessage(`Kilden «${newSource.title}» er lagret i din kildebank og tilgjengelig i Skriveverkstedet!`);

    setTimeout(() => {
      setFormSuccessMessage(null);
      setActiveTab('mySources');
    }, 1500);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'rammeverk': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'pedagogikk': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'sprak': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'natur': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'kunst': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ledelse': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Mørk venstremeny innhold tilpasset Kildebank (APA 7)
  const customSidebar = (
    <div className="space-y-5">
      {/* KILDESAMLINGER (VISNING) */}
      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 py-1 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-indigo-400" /> Kildesamlinger
        </h3>

        <button
          type="button"
          onClick={() => { setActiveTab('standard'); }}
          className={cn(
            "w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
            activeTab === 'standard'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Standard BLU-pensum</span>
          </div>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0",
            activeTab === 'standard' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
          )}>
            {BLU_STANDARD_SOURCES.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('mySources'); }}
          className={cn(
            "w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
            activeTab === 'mySources'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mine lagrede kilder</span>
          </div>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0",
            activeTab === 'mySources' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
          )}>
            {customSources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('all'); }}
          className={cn(
            "w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
            activeTab === 'all'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Alle kilder</span>
          </div>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0",
            activeTab === 'all' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
          )}>
            {allAvailableSources.length}
          </span>
        </button>
      </div>

      {/* FAGOMRÅDER (FILTER) */}
      <div className="space-y-1 pt-3 border-t border-slate-800/60">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 py-1 flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-indigo-400" /> Fagområder
        </h3>

        {[
          { id: 'all', label: 'Alle fagområder' },
          { id: 'rammeverk', label: 'Lover & Rammeverk' },
          { id: 'pedagogikk', label: 'Medvirkning & Relasjoner' },
          { id: 'omsorg', label: 'Omsorgspedagogikk' },
          { id: 'sprak', label: 'Språk, tekst og matematikk' },
          { id: 'kunst', label: 'Kunst, kultur og kreativitet' },
          { id: 'natur', label: 'Natur, helse og bevegelse' },
          { id: 'ledelse', label: 'Ledelse & samarbeid' },
          { id: 'lek', label: 'Lek & læring' },
        ].map((cat) => {
          const isSel = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer",
                isSel
                  ? "bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium"
              )}
            >
              <span className="truncate">{cat.label}</span>
              {isSel && <Check className="w-3 h-3 text-indigo-400 shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const mainContent = (
    <div className="flex-1 flex flex-col h-auto min-h-[1050px] bg-slate-50/50 overflow-visible relative">
      {/* STICKY TOPPLINJE */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-4 sm:p-6 border-b border-slate-200/80 rounded-t-2xl sm:rounded-t-3xl space-y-4 shadow-xs">
        {/* Header-rad */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookMarked className="w-6 h-6 text-indigo-600" />
              Ditt pensum- og kildebibliotek
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Bygg din personlige referanseliste uavhengig av oppgaver. Huk av kildene du vil bruke og overfør dem direkte inn i litteraturlisten.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAllBibliography}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              title="Kopier hele den alfabetiske litteraturlisten til utklippstavlen"
            >
              {copiedType === 'all' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Litteraturliste kopiert!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Kopier litteraturliste</span>
                </>
              )}
            </button>

            {activeTab === 'addNew' ? (
              <button
                type="button"
                onClick={() => setActiveTab('standard')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Vis kildelisten
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('addNew')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-200" />
                <span>+ Legg til ny kilde</span>
              </button>
            )}
          </div>
        </div>

        {/* Søk & Kontroller-rad */}
        {activeTab !== 'addNew' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk på forfatter, tittel eller tema..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
              {/* Mobil fagområde-velger hvis venstremenyen er skjult */}
              <div className="md:hidden flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">Alle fagområder</option>
                  <option value="rammeverk">Lover & Rammeverk</option>
                  <option value="pedagogikk">Medvirkning & Relasjoner</option>
                  <option value="omsorg">Omsorgspedagogikk</option>
                  <option value="sprak">Språk, tekst og matematikk</option>
                  <option value="kunst">Kunst, kultur og kreativitet</option>
                  <option value="natur">Natur, helse og bevegelse</option>
                  <option value="ledelse">Ledelse & samarbeid</option>
                  <option value="lek">Lek & læring</option>
                </select>
              </div>

              {/* Sidetall i henvisning checkbox */}
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  id="include-page-kb"
                  checked={includePageNumber}
                  onChange={(e) => setIncludePageNumber(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="include-page-kb" className="cursor-pointer font-medium select-none">
                  Inkluder sidetall i henvisning:
                </label>
                {includePageNumber && (
                  <input
                    type="text"
                    value={pageNumberInput}
                    onChange={(e) => setPageNumberInput(e.target.value)}
                    placeholder="f.eks. 42"
                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Velg alle / Nullstill */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Huk av alle kildene i denne listen"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Velg alle ({filteredSources.length})</span>
                </button>
                {selectedSourceIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Fjern alle markeringer"
                  >
                    Nullstill
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ARBEIDSOMRÅDE UNDER STICKY TOPPLINJE */}
      <div className="p-4 sm:p-6 space-y-4 pb-28">
        {activeTab === 'addNew' ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm max-w-3xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  Registrer ny pensumkilde
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fyll inn forfatter og tittel, så genererer Kildebanken automatisk gyldig APA 7-litteraturlinjer for deg.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('mySources')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
              >
                Avbryt
              </button>
            </div>

            {formSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewSource} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type kilde
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'book', label: 'Pensumbok', icon: BookOpen },
                    { id: 'article', label: 'Tidsskriftartikkel', icon: FileText },
                    { id: 'web', label: 'Rapport / Nettside', icon: ExternalLink },
                    { id: 'law', label: 'Lov / Rammeplan', icon: Library }
                  ].map(type => {
                    const Icon = type.icon;
                    const isSel = sourceType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSourceType(type.id as any)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5",
                          isSel
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold"
                            : "bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-700"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isSel ? "text-indigo-600" : "text-slate-400")} />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Forfatter(e) *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    placeholder="F.eks. Bae, B. eller Gjervan, M., & Bleka, M."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format: Etternavn, Fornavn-initial. Flere skilles med komma.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Utgivelsesår *
                  </label>
                  <input
                    type="number"
                    required
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    placeholder="F.eks. 2021"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tittel på bok, artikkel eller rapport *
                </label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="F.eks. Se mangfold! Perspektiver på flerkulturell pedagogikk i barnehagen"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {sourceType === 'book' ? 'Forlag / Utgiver' : sourceType === 'article' ? 'Tidsskriftnavn (og vol/nr)' : 'Utgiver / Institusjon'}
                  </label>
                  <input
                    type="text"
                    value={publisherInput}
                    onChange={(e) => setPublisherInput(e.target.value)}
                    placeholder={sourceType === 'book' ? 'F.eks. Cappelen Damm Akademisk' : 'F.eks. Nordisk barnehageforskning'}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fagområde
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="pedagogikk">Pedagogikk & Medvirkning</option>
                    <option value="rammeverk">Lover & Rammeverk</option>
                    <option value="sprak">Språk & Tekst</option>
                    <option value="natur">Natur, helse & bevegelse</option>
                    <option value="kunst">Kunst & Kultur</option>
                    <option value="ledelse">Ledelse & Samarbeid</option>
                    <option value="annen">Annet pensum</option>
                  </select>
                </div>
              </div>

              {(sourceType === 'article' || sourceType === 'web' || sourceType === 'law') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lenke / URL / DOI (valgfritt)
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nøkkelord / temaer (komma-separert)
                </label>
                <input
                  type="text"
                  value={keyTopicsInput}
                  onChange={(e) => setKeyTopicsInput(e.target.value)}
                  placeholder="F.eks. medvirkning, 1-3 år, didaktikk, observasjon"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {(authorInput || titleInput) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Forhåndsvisning i APA 7
                  </span>
                  <div className="text-xs text-slate-800">
                    <span className="font-bold text-slate-500 mr-2">I løpende tekst:</span>
                    <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">
                      ({authorInput.split(',')[0].trim() || 'Forfatter'}, {yearInput || '2024'})
                    </code>
                  </div>
                  <div className="text-xs text-slate-800">
                    <span className="font-bold text-slate-500 mr-2">I litteraturlisten:</span>
                    <span className="italic">
                      {authorInput || 'Forfatter, F.'} ({yearInput || '2024'}). {titleInput || 'Tittel på verket'}. {publisherInput || 'Forlag'}.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('mySources')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Lagre i Kildebanken</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSources.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-base">Ingen kilder matchet søket ditt</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Prøv et annet søkeord eller velg et annet fagområde fra sidemenyen, eller legg til kilden selv.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('addNew')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Legg til ny kilde nå</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredSources.map((source) => {
                  const isCustom = source.id.startsWith('custom-');
                  const isCopiedInText = copiedId === source.id && copiedType === 'inText';
                  const isCopiedFull = copiedId === source.id && copiedType === 'full';
                  const isSelected = selectedSourceIds.has(source.id);

                  return (
                    <motion.div
                      key={source.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-white rounded-2xl p-4 sm:p-5 border transition-all space-y-3",
                        isSelected
                          ? "border-indigo-400 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20"
                          : "border-slate-200/90 shadow-2xs hover:border-slate-300"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => toggleSourceSelection(source.id, e)}
                            className={cn(
                              "w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 mt-1",
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                                : "bg-slate-50 border-slate-300 hover:border-indigo-400 text-transparent"
                            )}
                            title={isSelected ? "Fjern avhuking" : "Huk av for å overføre til oppgave"}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", getCategoryColor(source.category))}>
                                {source.categoryLabel}
                              </span>
                              {isCustom && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                                  Min lagrede kilde
                                </span>
                              )}
                              <span className="text-xs text-slate-400 font-semibold">• {source.year}</span>
                            </div>

                            <h3 className="text-base font-bold text-slate-900 leading-snug">
                              {source.author} ({source.year})
                            </h3>
                            <p className="text-sm font-serif italic text-slate-800">
                              {source.title}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {source.details}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleCopyInText(source)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                              isCopiedInText
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            )}
                            title="Kopier kildehenvisning til å lime inn i brødteksten"
                          >
                            {isCopiedInText ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Kopiert!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Kopier henvisning</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyFullRef(source)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                              isCopiedFull
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            )}
                            title="Kopier komplett APA 7 referanselinje til litteraturlisten"
                          >
                            {isCopiedFull ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Referanse kopiert!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Kopier til litteraturliste</span>
                              </>
                            )}
                          </button>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSource(source.id, e)}
                              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Slett denne kilden fra din kildebank"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Tema:</span>
                          {source.keyTopics.map((k, kIdx) => (
                            <span
                              key={`k-${kIdx}`}
                              className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[11px] text-slate-600"
                            >
                              #{k}
                            </span>
                          ))}
                        </div>

                        <div className="text-slate-500 text-[11px] italic">
                          {source.description}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FLYTENDE HANDLINGSLINJE ved avhuking */}
        <AnimatePresence>
          {selectedSourceIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto bg-slate-900 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                  {selectedSourceIds.size}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">
                    {selectedSourceIds.size} {selectedSourceIds.size === 1 ? 'kilde valgt' : 'kilder valgt'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Klar til å overføres til oppgave
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopySelectedBibliography}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-700"
                  title="Kopier kun disse valgte kildene til utklippstavlen"
                >
                  {copiedType === 'selected' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Kopiert!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kopier liste</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const formattedList = selectedSourcesList.map(s => ({
                      id: s.id,
                      title: `${s.author} (${s.year}). ${s.title}`,
                      content: `${s.title}\nForfatter: ${s.author} (${s.year})\nKategori: ${s.categoryLabel}\nSammendrag: ${s.fullReference}`,
                      category: s.categoryLabel
                    }));

                    if (pendingAction) {
                      startPensumAction(formattedList, pendingAction);
                      if (onNavigateToWorkshop) {
                        onNavigateToWorkshop('verktoy');
                      }
                      window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: pendingAction } }));
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    } else {
                      setIsPensumHubMenuOpen(true);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Bruk kilder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Nullstill utvalg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PensumHubActionMenu
          isOpen={isPensumHubMenuOpen}
          onClose={() => setIsPensumHubMenuOpen(false)}
          selectedCount={selectedSourceIds.size}
          selectedTitles={selectedSourcesList.map(s => s.title)}
          selectedFilesList={selectedSourcesList.map(s => ({
            id: s.id,
            title: `${s.author} (${s.year}). ${s.title}`,
            content: s.fullReference,
            category: s.categoryLabel
          }))}
          onSelectAction={(actionType) => {
            console.log("Valgt handling i Kildebanken:", actionType);
            if (onNavigateToWorkshop) {
              onNavigateToWorkshop('verktoy');
            }
            window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: actionType } }));
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }}
          onNavigateToTools={(actionType) => {
            const target = actionType || 'flashcards';
            if (onNavigateToWorkshop) {
              onNavigateToWorkshop('verktoy');
            }
            window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: target } }));
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }}
        />

        <TransferSourcesModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          selectedSources={selectedSourcesList}
          onNavigateToWorkshop={(targetDocId) => {
            if (onNavigateToWorkshop) {
              onNavigateToWorkshop(targetDocId);
            }
          }}
        />
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="w-full h-auto min-h-[1050px]">
        <WorkspaceLayout
          title="Kildebank (APA 7)"
          subtitle="Pensum og referanser"
          icon={<BookMarked className="w-6 h-6" />}
          actionButtonLabel="Legg til ny kilde"
          onActionClick={() => setActiveTab('addNew')}
          className="h-auto md:h-auto lg:h-auto min-h-[1050px] overflow-visible rounded-xl md:rounded-2xl shadow-sm"
          mainClassName="overflow-visible flex-1 flex flex-col bg-slate-50/50 relative h-auto md:h-auto"
          customSidebarContent={customSidebar}
          onItemClick={() => {}}
        >
          {mainContent}
        </WorkspaceLayout>
      </div>
    );
  }

  return mainContent;
};
