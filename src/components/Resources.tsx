import React, { useState, useRef, useEffect } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { 
  Library, 
  Folder, 
  UploadCloud, 
  ExternalLink, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Search, 
  BookOpen, 
  Lock, 
  Trash2,
  Copy,
  Check,
  Plus,
  Download,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  FieldNote, 
  NoteCategory, 
  subscribeFieldNotes, 
  saveFieldNote, 
  deleteFieldNote 
} from '../services/fieldNotesService';
import { cn } from '../lib/utils';

export interface ResourcesProps {
  collegeName?: string;
  initialMenu?: 'library' | 'files' | 'field-notes-archive' | string;
  onNavigateToFieldNotes?: () => void;
}

const RESOURCE_LINKS: Record<string, string> = {
  'Canvas (Læringsplattform)': 'https://www.instructure.com/canvas/login',
  'Wiseflow (Eksamen)': 'https://europe.wiseflow.net/login/search',
  'Studentweb': 'https://fsweb.no/studentweb/index.jsf',
  'Pensumoversikt': 'https://oria.no',
  'Rammeplan for barnehagen': 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/',
  'Barnehageloven': 'https://lovdata.no/dokument/NL/lov/2005-06-17-64',
  'SIKT (Personvern)': 'https://sikt.no/logg-inn',
  'NESH-Retningslinjer': 'https://www.forskningsetikk.no/retningslinjer/hum-sam/forskningsetiske-retningslinjer-for-samfunnsvitenskap-humaniora-juss-og-teologi/'
};

const CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string }> = {
  'Observasjon': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Didaktisk idé': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Rammeplanen': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Barna sa/gjorde': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Praksisveileder': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Annet': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

const CATEGORIES: NoteCategory[] = [
  'Observasjon', 
  'Didaktisk idé', 
  'Rammeplanen', 
  'Barna sa/gjorde', 
  'Praksisveileder', 
  'Annet'
];

export function Resources({ 
  collegeName = 'DMMH', 
  initialMenu = 'library',
  onNavigateToFieldNotes
}: ResourcesProps) {
  const [activeMenu, setActiveMenu] = useState<string>(initialMenu);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field notes state synced with shared service
  const [fieldNotes, setFieldNotes] = useState<FieldNote[]>([]);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string>('Alle');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  
  // Quick create in archive
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('Observasjon');

  useEffect(() => {
    const unsub = subscribeFieldNotes((notes) => {
      setFieldNotes(notes);
    });
    return () => unsub();
  }, []);

  const [files, setFiles] = useState([
    { id: '1', name: 'Didaktiske planer', type: 'Mappe', date: '4 timer siden' },
    { id: '2', name: 'Læring gjennom mestring - skoggruppemetoden.pdf', type: 'PDF', date: 'I går' },
    { id: '3', name: 'Generelle prinsipper for alle sesongplaner.docx', type: 'Word', date: '2. sept 2026' }
  ]);

  const menuItems = [
    { id: 'library', title: 'Ressursbibliotek', subtitle: 'Lenker og retningslinjer', icon: <Library className="w-4 h-4" /> },
    { id: 'files', title: 'Mitt Filarkiv', subtitle: 'Organiser dokumenter', icon: <Folder className="w-4 h-4" /> },
    { 
      id: 'field-notes-archive', 
      title: 'Feltnotater & Kladdablokk', 
      subtitle: `${fieldNotes.length} notater fra felt & mobil`, 
      icon: <BookOpen className="w-4 h-4" /> 
    }
  ];

  const handleOpenLink = (linkName: string) => {
    const url = RESOURCE_LINKS[linkName];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTriggerUpload = () => {
    setActiveMenu('files');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploaded = Array.from(e.target.files).map((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let typeName = 'Fil';
      if (ext === 'pdf') typeName = 'PDF';
      else if (ext === 'docx' || ext === 'doc') typeName = 'Word';
      else if (ext === 'xlsx' || ext === 'xls') typeName = 'Excel';

      return {
        id: `${Date.now()}-${idx}`,
        name: file.name,
        type: typeName,
        date: 'Akkurat nå'
      };
    });

    setFiles(prev => [...uploaded, ...prev]);
    e.target.value = '';
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCopyNote = (note: FieldNote) => {
    const text = `${note.title} [${note.category}]\n\n${note.content}`;
    navigator.clipboard.writeText(text);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('Vil du slette dette feltnotatet fra arkivet?')) {
      await deleteFieldNote(id);
    }
  };

  const handleDownloadNote = (note: FieldNote) => {
    const text = `# ${note.title}\nKategori: ${note.category}\nDato: ${note.createdAt}\n\n${note.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveArchiveNote = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;

    const noteToSave: FieldNote = {
      id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle.trim() || 'Feltnotat ' + new Date().toLocaleDateString('no-NO'),
      content: newContent.trim(),
      category: newCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveFieldNote(noteToSave);
    setNewTitle('');
    setNewContent('');
    setNewCategory('Observasjon');
    setIsCreatingNote(false);
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFieldNotes = fieldNotes.filter(n => {
    const matchesCategory = selectedNoteCategory === 'Alle' || n.category === selectedNoteCategory;
    const q = notesSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <WorkspaceLayout
      title="Ressurser"
      subtitle="Ditt faglige bibliotek og arkiv"
      icon={<Library className="w-6 h-6" />}
      actionButtonLabel={activeMenu === 'field-notes-archive' ? "Nytt feltnotat" : "Last opp fil"}
      onActionClick={activeMenu === 'field-notes-archive' ? () => setIsCreatingNote(true) : handleTriggerUpload}
      historyItems={menuItems}
      activeItemId={activeMenu}
      onItemClick={setActiveMenu}
      historySectionTitle=""
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        className="hidden" 
        id="resources-file-upload-input"
        aria-label="Last opp fil"
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-5xl w-full">

          {/* VISNING 1: RESSURSBIBLIOTEK */}
          {activeMenu === 'library' && (
            <div className="space-y-8 pb-12">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Ressursbibliotek</h2>
                <p className="text-slate-500 mt-1">Hurtiglenker til viktige verktøy, lovverk og institusjonens sider.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Din Høgskole */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Din Høgskole ({collegeName})
                  </h3>
                  <div className="space-y-2">
                    {['Canvas (Læringsplattform)', 'Wiseflow (Eksamen)', 'Studentweb', 'Pensumoversikt'].map(link => (
                      <button 
                        key={link} 
                        onClick={() => handleOpenLink(link)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{link}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styring & Etikk */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" /> Styring & Etikk
                  </h3>
                  <div className="space-y-2">
                    {['Rammeplan for barnehagen', 'Barnehageloven', 'SIKT (Personvern)', 'NESH-Retningslinjer'].map(link => (
                      <button 
                        key={link} 
                        onClick={() => handleOpenLink(link)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">{link}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informasjonsbokser */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-600" /> Personvern & Sikkerhet
                  </h3>
                  <p className="text-sm text-emerald-800 leading-relaxed mb-4">
                    Tjenesten lagrer og behandler teksten din trygt. Data slettes når du lukker økten, og brukes ikke til å trene andres modeller.
                  </p>
                  <ul className="text-xs text-emerald-700 space-y-2">
                    <li>• <strong>Sikker skylagring:</strong> Kryptert og isolert per bruker.</li>
                    <li>• <strong>Ingen KI-trening:</strong> Dine data forblir dine.</li>
                  </ul>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" /> KI-Vettregler
                  </h3>
                  <p className="text-sm text-amber-800 leading-relaxed mb-4">
                    Bruk KI som en sparringspartner, ikke som en fasit. Du er alltid ansvarlig for innholdet du leverer.
                  </p>
                  <ul className="text-xs text-amber-700 space-y-2">
                    <li>• <strong>Vær åpen:</strong> Oppgi alltid at KI er brukt.</li>
                    <li>• <strong>Kritisk blikk:</strong> Sjekk alltid fakta mot troverdige kilder.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* VISNING 2: FILARKIV */}
          {activeMenu === 'files' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Filarkiv & Dokumenter</h2>
                  <p className="text-slate-500 mt-1">Organiser din pedagogiske kontekst og opplastede dokumenter.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" /> Last opp filer
                </button>
              </div>

              {/* Kladdablokk & Feltnotater integrasjonskort (Løsning 3) */}
              <div className="bg-gradient-to-r from-amber-50 via-emerald-50/50 to-amber-50/80 border border-amber-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        Feltnotater & Kladdablokk
                      </h3>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {fieldNotes.length} notater
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Alle observasjoner og notater du har skrevet i farta på mobil eller desktop er samlet i arkivet ditt.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveMenu('field-notes-archive')}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Åpne notatarkiv</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {onNavigateToFieldNotes && (
                    <button
                      onClick={onNavigateToFieldNotes}
                      className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="Gå til Kladdablokk-verktøyet"
                    >
                      Kladdablokk
                    </button>
                  )}
                </div>
              </div>

              {/* Søk og filter */}
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400 ml-3" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk i filarkivet..." 
                  className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Filliste */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredFiles.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 font-medium">
                      {searchQuery ? `Ingen filer funnet for «${searchQuery}»` : 'Ingen filer i arkivet ennå.'}
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                            {file.type === 'Mappe' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 text-sm truncate">{file.name}</p>
                            <p className="text-xs text-slate-400">{file.type} • Sist endret {file.date}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                          title="Slett fil"
                          aria-label="Slett fil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VISNING 3: FELTNOTATER & KLADDABLOKK ARKIV (Løsning 3) */}
          {activeMenu === 'field-notes-archive' && (
            <div className="space-y-6 pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[11px] font-bold">
                      <BookOpen className="w-3.5 h-3.5" /> Felles notatarkiv
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Synkronisert på mobil & desktop
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mt-1">Feltnotater & Kladdablokk</h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Se, søk i, kopier og administrer alle notater registrert under praksis og feltarbeid.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsCreatingNote(!isCreatingNote)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nytt notat her</span>
                  </button>

                  {onNavigateToFieldNotes && (
                    <button
                      onClick={onNavigateToFieldNotes}
                      className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Åpne Kladdablokk</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Hurtigskjema for nytt notat */}
              {isCreatingNote && (
                <div className="bg-white border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" /> Skriv nytt feltnotat
                    </h3>
                    <button
                      onClick={() => setIsCreatingNote(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tittel / Situasjon</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="F.eks: Samling i skogkanten..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Kategori</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all border",
                            newCategory === cat
                              ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} shadow-xs`
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Notatinnhold</label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Observasjon, replikk eller didaktisk idé..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsCreatingNote(false)}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleSaveArchiveNote}
                      disabled={!newTitle.trim() && !newContent.trim()}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Lagre i arkivet
                    </button>
                  </div>
                </div>
              )}

              {/* Søk og filter */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    placeholder="Søk i arkiverte feltnotater..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  {notesSearchQuery && (
                    <button
                      onClick={() => setNotesSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  <button
                    onClick={() => setSelectedNoteCategory('Alle')}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                      selectedNoteCategory === 'Alle'
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    Alle ({fieldNotes.length})
                  </button>
                  {CATEGORIES.map(cat => {
                    const count = fieldNotes.filter(n => n.category === cat).length;
                    if (count === 0 && selectedNoteCategory !== cat) return null;
                    return (
                      <button
                        key={`archive-cat-${cat}`}
                        onClick={() => setSelectedNoteCategory(cat)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                          selectedNoteCategory === cat
                            ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} shadow-xs`
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notatliste i arkivet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFieldNotes.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-slate-700">Ingen notater funnet i arkivet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      {notesSearchQuery || selectedNoteCategory !== 'Alle'
                        ? 'Prøv et annet søkeord eller endre kategorifilteret.'
                        : 'Opprett et notat via «Nytt notat her» over eller fra Kladdablokk i mobilvisning.'}
                    </p>
                  </div>
                ) : (
                  filteredFieldNotes.map(note => {
                    const catStyle = CATEGORY_COLORS[note.category] || CATEGORY_COLORS['Annet'];
                    const dateFormatted = (() => {
                      try {
                        return new Date(note.createdAt).toLocaleDateString('no-NO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        });
                      } catch {
                        return '';
                      }
                    })();

                    return (
                      <div
                        key={note.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                              catStyle.bg,
                              catStyle.text,
                              catStyle.border
                            )}>
                              {note.category}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {dateFormatted}
                            </span>
                          </div>

                          <h3 className="font-bold text-base text-slate-900 mb-2 group-hover:text-amber-900 transition-colors">
                            {note.title}
                          </h3>

                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>

                        {/* Handlingsknapper */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyNote(note)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                                copiedNoteId === note.id
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              )}
                              title="Kopier notat til utklippstavlen"
                            >
                              {copiedNoteId === note.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Kopiert!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Kopier</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDownloadNote(note)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Last ned som .txt"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Slett fra arkiv"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </WorkspaceLayout>
  );
}

export default Resources;
