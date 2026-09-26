import React, { useState, useMemo } from 'react';
import { 
  BookMarked, 
  Search, 
  Plus, 
  X, 
  Check, 
  Sparkles, 
  BookOpen, 
  ExternalLink, 
  Layers, 
  Info,
  BookmarkPlus
} from 'lucide-react';
import { 
  AcademicSource, 
  BLU_STANDARD_SOURCES, 
  getStoredCustomSources, 
  saveCustomSource 
} from '../../lib/academicSources';

interface CitationAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCitation: (inTextCitation: string, fullReference: string) => void;
  existingText?: string;
}

export const CitationAssistantModal: React.FC<CitationAssistantModalProps> = ({
  isOpen,
  onClose,
  onInsertCitation,
  existingText = ''
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'mySources' | 'addNew'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customSources, setCustomSources] = useState<AcademicSource[]>(() => getStoredCustomSources());

  // Form for ny kilde
  const [authorInput, setAuthorInput] = useState('');
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [titleInput, setTitleInput] = useState('');
  const [publisherInput, setPublisherInput] = useState('');
  const [pageNumberInput, setPageNumberInput] = useState('');
  const [includePageNumber, setIncludePageNumber] = useState(false);

  // Sjekker om kilden allerede er i teksten
  const isSourceInDoc = (inText: string) => {
    if (!existingText) return false;
    const authorPart = inText.replace(/[()]/g, '').split(',')[0].trim();
    return existingText.includes(authorPart);
  };

  const allAvailableSources = useMemo(() => {
    return [...customSources, ...BLU_STANDARD_SOURCES];
  }, [customSources]);

  const filteredSources = useMemo(() => {
    let list = activeTab === 'mySources' ? customSources : BLU_STANDARD_SOURCES;
    if (activeTab === 'standard') {
      list = BLU_STANDARD_SOURCES;
    }

    return list.filter(source => {
      const matchesSearch = 
        source.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.keyTopics.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
        source.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'all' || source.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [activeTab, customSources, searchQuery, selectedCategory]);

  const handleSelectSource = (source: AcademicSource) => {
    let inText = source.inTextCitation;
    if (includePageNumber && pageNumberInput.trim()) {
      // Sett inn sidetall f.eks. (Bae, 2012, s. 42)
      inText = inText.replace(/\)$/, `, s. ${pageNumberInput.trim()})`);
    }
    onInsertCitation(inText, source.fullReference);
    onClose();
  };

  const handleSaveAndInsertNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorInput.trim() || !titleInput.trim()) return;

    const year = parseInt(yearInput, 10) || new Date().getFullYear();
    const cleanAuthor = authorInput.trim();
    const authorSurname = cleanAuthor.split(',')[0].trim() || cleanAuthor.split(' ')[cleanAuthor.split(' ').length - 1];

    let inText = `(${authorSurname}, ${year})`;
    if (includePageNumber && pageNumberInput.trim()) {
      inText = `(${authorSurname}, ${year}, s. ${pageNumberInput.trim()})`;
    }

    const fullRef = `${cleanAuthor} (${year}). *${titleInput.trim()}*. ${publisherInput.trim() || 'Fagforlag'}.`;

    const newSource: AcademicSource = {
      id: `custom-${Date.now()}`,
      category: 'annen',
      categoryLabel: 'Egen pensumkilde',
      author: cleanAuthor,
      year,
      title: titleInput.trim(),
      details: publisherInput.trim(),
      inTextCitation: `(${authorSurname}, ${year})`,
      fullReference: fullRef,
      keyTopics: ['pensum', 'egen kilde'],
      description: 'Manuelt registrert referanse'
    };

    const updated = saveCustomSource(newSource);
    setCustomSources(updated);
    onInsertCitation(inText, fullRef);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Kildeassistent & Litteraturliste
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  APA 7
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sett inn riktig henvisning i teksten og legg kilden automatisk til i litteraturlisten
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Valg av kilde-type / Faner */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('standard')}
              className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'standard'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Standard BLU-pensum ({BLU_STANDARD_SOURCES.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('mySources')}
              className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'mySources'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Mine lagrede kilder ({customSources.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('addNew')}
              className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'addNew'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Legg til ny kilde</span>
            </button>
          </div>
        </div>

        {/* Innholdsflate */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab !== 'addNew' && (
            <>
              {/* Søk & Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Søk på forfatter, tittel eller tema (f.eks. Bae, medvirkning, rammeplan)..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Alle fagområder</option>
                  <option value="rammeverk">Lover & Rammeverk</option>
                  <option value="pedagogikk">Pedagogikk & Medvirkning</option>
                  <option value="sprak">Språk & Matematikk</option>
                  <option value="natur">Natur, helse & bevegelse</option>
                  <option value="kunst">Kunst & Kultur</option>
                  <option value="ledelse">Ledelse & Samarbeid</option>
                </select>
              </div>

              {/* Sidetalls-hjelper */}
              <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addPageNum"
                    checked={includePageNumber}
                    onChange={(e) => setIncludePageNumber(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="addPageNum" className="font-medium text-slate-700 cursor-pointer">
                    Ta med sidetall i parentesen (anbefales ved direkte sitat eller presise poeng)
                  </label>
                </div>
                {includePageNumber && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">s.</span>
                    <input
                      type="text"
                      value={pageNumberInput}
                      onChange={(e) => setPageNumberInput(e.target.value)}
                      placeholder="42"
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Kildekort-liste */}
              <div className="space-y-2.5">
                {filteredSources.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Ingen kilder matchet søket ditt</p>
                    <p className="text-xs text-slate-400 mt-1">Prøv et annet søkeord eller legg til en egen kilde.</p>
                  </div>
                ) : (
                  filteredSources.map(source => {
                    const inDoc = isSourceInDoc(source.inTextCitation);
                    return (
                      <div
                        key={source.id}
                        className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 transition-all hover:shadow-xs group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {source.author} ({source.year})
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                              {source.categoryLabel}
                            </span>
                            {inDoc && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="w-3 h-3" /> Allerede henvist
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 italic font-serif leading-snug">
                            {source.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {source.description}
                          </p>
                          <div className="text-[10px] text-indigo-700 font-mono bg-indigo-50/50 inline-block px-1.5 py-0.5 rounded border border-indigo-100">
                            Henvisning: {includePageNumber && pageNumberInput ? source.inTextCitation.replace(/\)$/, `, s. ${pageNumberInput})`) : source.inTextCitation}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSource(source)}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Sett inn</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'addNew' && (
            <form onSubmit={handleSaveAndInsertNew} className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Legg til en bok, forskningsartikkel eller nettkilde fra pensumlisten din. Den lagres automatisk til dine fremtidige oppgaver.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forfatter(e) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="F.eks: Bae, B. eller Gjervan, M. & Bleka, M."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Utgivelsesår <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    placeholder="2022"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sidetall (valgfritt)
                  </label>
                  <input
                    type="text"
                    value={pageNumberInput}
                    onChange={(e) => setPageNumberInput(e.target.value)}
                    placeholder="F.eks. 54 eller 54-58"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tittel på bok eller artikkel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="F.eks: Å samtale i barnehagen"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forlag / Tidsskrift / Nettsted
                </label>
                <input
                  type="text"
                  value={publisherInput}
                  onChange={(e) => setPublisherInput(e.target.value)}
                  placeholder="F.eks: Fagbokforlaget eller Universitetsforlaget"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('standard')}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lagre og sett inn i tekst</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>APA 7-standard: Innrykket 1,27 cm (hanging indent) genereres automatisk ved eksport.</span>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
