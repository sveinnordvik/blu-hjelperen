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
  Sparkles, 
  Filter, 
  ExternalLink, 
  Info,
  CheckCircle2,
  FileText,
  Library,
  HelpCircle,
  Download,
  Share2
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

interface KildebankViewProps {
  onNavigateToWorkshop?: () => void;
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

  // Kopiert-tilstander
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'inText' | 'full' | 'all' | null>(null);

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

      const matchesCat = selectedCategory === 'all' || source.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [activeTab, customSources, allAvailableSources, searchQuery, selectedCategory]);

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
    // Fjern eventuelle markdown stjerner hvis brukeren limer inn i ren tekst
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
    // Sorter alfabetisk etter forfatter (APA 7 standard)
    const sorted = [...listToCopy].sort((a, b) => a.author.localeCompare(b.author, 'nb'));
    const bibText = sorted.map(s => s.fullReference.replace(/\*(.*?)\*/g, '$1')).join('\n\n');
    navigator.clipboard.writeText(bibText);
    setCopiedType('all');
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  const handleDeleteSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Er du sikker på at du vil fjerne denne kilden fra din personlige kildebank?')) {
      const updated = deleteCustomSource(id);
      setCustomSources(updated);
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

    // Tilbakestill form
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

  // Kategori-farger
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

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      {/* Topp-overskrift og velkomst */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
            <BookMarked className="w-3.5 h-3.5" />
            <span>Kildebank & APA 7-assistent</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Ditt pensum- og kildebibliotek
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bygg din personlige referanseliste uavhengig av oppgaver. Alle kilder du legger inn her synkroniseres automatisk mot Skriveverkstedet når du skal henvise i teksten.
          </p>
        </div>

        {/* Handlingsknapper i toppen */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyAllBibliography}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
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

          <button
            type="button"
            onClick={() => setActiveTab('addNew')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-200" />
            <span>+ Legg til ny kilde</span>
          </button>
        </div>
      </div>

      {/* Faner og modus-velgere */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'standard'
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Standard BLU-pensum ({BLU_STANDARD_SOURCES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mySources')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'mySources'
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Mine lagrede kilder ({customSources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'all'
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Alle kilder ({allAvailableSources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addNew')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'addNew'
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Ny kilde</span>
          </button>
        </div>

        {/* Hurtig-valg for sidetall i parentesen */}
        {activeTab !== 'addNew' && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0 self-start sm:self-auto">
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
                className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>
        )}
      </div>

      {/* Skjema for ny kilde */}
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
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
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
            {/* Valg av kildetype */}
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

            {/* Forhåndsvisning av APA 7 */}
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
        /* Kilde-listen med søk og filtrering */
        <div className="space-y-4">
          {/* Søk og kategorifilter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk på forfatter, tittel eller tema (f.eks. Bae, medvirkning, rammeplan)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Alle fagområder</option>
                <option value="rammeverk">Lover & Rammeverk</option>
                <option value="pedagogikk">Pedagogikk & Medvirkning</option>
                <option value="sprak">Språk & Matematikk</option>
                <option value="natur">Natur, helse & bevegelse</option>
                <option value="kunst">Kunst & Kultur</option>
                <option value="ledelse">Ledelse & Samarbeid</option>
                <option value="annen">Egendefinerte kilder</option>
              </select>
            </div>
          </div>

          {/* Resultat-liste */}
          {filteredSources.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">Ingen kilder matchet søket ditt</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Prøv et annet søkeord, eller legg til boken/artikkelen selv i kildebanken.
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

                return (
                  <motion.div
                    key={source.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
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

                      {/* Handlingsknapper per kilde */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
                        {/* Kopier in-text */}
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

                        {/* Kopier komplett APA 7 */}
                        <button
                          type="button"
                          onClick={() => handleCopyFullRef(source)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                            isCopiedFull
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                              : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                          )}
                          title="Kopier full APA 7 referanselinje til litteraturlisten"
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

                        {/* Slett hvis egen kilde */}
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

                    {/* Previews & Tag-rekke */}
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
    </div>
  );
};
