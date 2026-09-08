import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from '../WorkspaceLayout';
import { 
  FileText, 
  Settings, 
  Sparkles, 
  Save, 
  CheckCircle2, 
  FileEdit, 
  AlertCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Underline,
  Eye,
  Edit3,
  Check,
  RotateCcw,
  BookOpen,
  Copy,
  Download,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeAssignmentText } from '../../services/geminiService';

export interface DocumentItem extends HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
  content: string;
  taskPrompt: string;
  template: string;
  targetWords: number;
  updatedAt: string;
}

const STORAGE_KEY = 'blu_writing_workshop_docs_v2';

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: '1',
    title: 'Tolkning av medvirkning i barnehagen',
    subtitle: 'Refleksjonsnotat • Sist endret i dag',
    isPinned: true,
    template: 'Refleksjonsnotat',
    targetWords: 1500,
    taskPrompt: 'Drøft hvordan barns rett til medvirkning kan ivaretas i hverdagsaktiviteter i barnehagen med utgangspunkt i Rammeplanen og FN-konvensjonen om barnets rettigheter.',
    content: `# Tolkning av barns medvirkning i barnehagehverdagen

Barnehagen skal anerkjenne og ivareta barndommens egenverdi. Barn har rett til å gi uttrykk for sine synspunkter på barnehagens daglige virksomhet, jf. Barnehageloven § 3.

## Teoretisk forankring
Medvirkning handler ikke bare om formelle valg, men om å bli lyttet til og tatt på alvor i de små, uformelle stundene:
- **Anerkjennelse:** Personalets evne til å lytte med et "tredje øre" (Bae, 2012).
- **Demokratisk praksis:** Barn som aktive samfunnsborgere i fellesskapet.

## Didaktisk refleksjon
I samlingsstunden observerte jeg hvordan en treåring viste motstand mot en planlagt aktivitet. I stedet for å korrigere, valgte vi å undersøke barnets intensjon...`,
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Ideer til utedag for 3-åringer',
    subtitle: 'Praksisoppgave • Sist endret i går',
    isPinned: false,
    template: 'Praksisfortelling',
    targetWords: 800,
    taskPrompt: 'Planlegg og begrunn et pedagogisk opplegg i naturen for de yngste barna med fokus på sanser og motorisk mestring.',
    content: `# Utedag med sanseopplevelser i skogen

## Mål for opplegget
Barna skal få erfare naturens mangfold gjennom berøring, bevegelse og utforskning i ulendt terreng.

### Planlagte aktiviteter:
- Samle kongler og blader til et felles naturmosaikk
- Balansere på falne trestammer med støtte fra pedagogen
- Lytte til skogens lyder under samlingsstund under grantrærne`,
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export function WritingWorkshop(_props?: { [key: string]: any }) {
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse documents from localStorage', e);
    }
    return INITIAL_DOCUMENTS;
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    return documents.length > 0 ? documents[0].id : '1';
  });

  const [viewMode, setViewMode] = useState<'editor' | 'setup' | 'quality-check'>('editor');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [outline, setOutline] = useState<{ id: number; title: string; subItems: string[] }[]>([]);

  // Definer standard-disposisjoner for ulike oppgavetyper
  const templates: Record<string, { id: number; title: string; subItems: string[] }[]> = {
    'Refleksjons- og diskusjonsoppgave': [
      { id: 1, title: 'Introduksjon', subItems: [] },
      { id: 2, title: 'Situasjonsbeskrivelse', subItems: [] },
      { id: 3, title: 'Drøfting', subItems: ['Ulike perspektiver'] },
      { id: 4, title: 'Teoretisk forankring', subItems: [] },
      { id: 5, title: 'Oppsummering', subItems: [] }
    ],
    'Refleksjonsnotat': [
      { id: 1, title: 'Praksisfortelling', subItems: [] },
      { id: 2, title: 'Egne reaksjoner', subItems: [] },
      { id: 3, title: 'Faglig analyse', subItems: [] },
      { id: 4, title: 'Kritisk refleksjon', subItems: [] }
    ],
    'Observasjon og dokumentasjon': [
      { id: 1, title: 'Mål og hensikt', subItems: [] },
      { id: 2, title: 'Observasjonsmetode', subItems: [] },
      { id: 3, title: 'Selve observasjonen (Data)', subItems: [] },
      { id: 4, title: 'Tolkning og analyse', subItems: [] }
    ],
    'Pedagogisk planlegging og vurdering': [
      { id: 1, title: 'Didaktisk plan', subItems: [] },
      { id: 2, title: 'Gjennomføring', subItems: [] },
      { id: 3, title: 'Evaluering', subItems: [] }
    ],
    'Bacheloroppgave': [
      { id: 1, title: 'Innledning', subItems: ['Problemstilling', 'Begrunnelse', 'Avgrensning'] },
      { id: 2, title: 'Teori og tidligere forskning', subItems: [] },
      { id: 3, title: 'Metode og etikk', subItems: ['Design', 'Utvalg', 'Analyse'] },
      { id: 4, title: 'Forskningsetiske vurderinger', subItems: ['Anonymisering', 'Samtykke'] },
      { id: 5, title: 'Resultater', subItems: ['Presentasjon av funn'] }
    ],
    'Prosjektarbeid': [{ id: 1, title: 'Innledning', subItems: [] }, { id: 2, title: 'Gjennomføring', subItems: [] }, { id: 3, title: 'Avslutning', subItems: [] }],
    'Fagtekst': [{ id: 1, title: 'Innledning', subItems: [] }, { id: 2, title: 'Hoveddel', subItems: [] }, { id: 3, title: 'Avslutning', subItems: [] }],
    'Obligatorisk arbeidskrav': [{ id: 1, title: 'Innledning', subItems: [] }, { id: 2, title: 'Hoveddel', subItems: [] }, { id: 3, title: 'Avslutning', subItems: [] }],
    'Praksisfortelling/Praksisoppgave': [{ id: 1, title: 'Kontekst', subItems: [] }, { id: 2, title: 'Fortelling', subItems: [] }, { id: 3, title: 'Refleksjon', subItems: [] }],
    'Egendefinert struktur': [{ id: 1, title: 'Nytt kapittel', subItems: [] }]
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = e.target.value;
    setSelectedTemplate(template);
    setOutline(templates[template] || []);
    if (activeDoc) {
      handleUpdateActiveDoc({ template });
    }
  };

  const handleSectionClick = (title: string) => {
    if (!activeDoc) return;
    const headingText = `## ${title}`;
    if (activeDoc.content.includes(headingText)) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      const separator = activeDoc.content.trim().length > 0 ? '\n\n' : '';
      const newContent = activeDoc.content + separator + headingText + '\n\n';
      handleUpdateActiveDoc({ content: newContent });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newContent.length, newContent.length);
        }
      }, 50);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  // Sync template and outline when active document changes
  useEffect(() => {
    if (activeDoc) {
      const currentTpl = activeDoc.template || '';
      setSelectedTemplate(currentTpl);
      setOutline(templates[currentTpl] || []);
    }
  }, [activeDocId]);

  // Save to localStorage whenever documents change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents to localStorage', e);
    }
  }, [documents]);

  const handleNewDocument = () => {
    const newId = Date.now().toString();
    const newDoc: DocumentItem = {
      id: newId,
      title: 'Nytt dokument',
      subtitle: 'Refleksjonsnotat • Kladd',
      isPinned: false,
      template: 'Refleksjonsnotat',
      targetWords: 1200,
      taskPrompt: '',
      content: '# Tittel på oppgaven\n\nBegynn å skrive her...',
      updatedAt: new Date().toISOString()
    };

    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newId);
    setViewMode('editor');
    setEditorTab('write');
  };

  const handleUpdateActiveDoc = (fields: Partial<DocumentItem>) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === activeDocId) {
        return {
          ...doc,
          ...fields,
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    }));
  };

  // Text formatting engine for editor
  const applyFormatting = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeDoc) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeDoc.content || '';
    const selectedText = text.substring(start, end);

    let replacement = '';
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    switch (formatType) {
      case 'Fet':
        if (selectedText) {
          replacement = `**${selectedText}**`;
          selectionOffsetStart = start + 2;
          selectionOffsetEnd = end + 2;
        } else {
          replacement = `**fet tekst**`;
          selectionOffsetStart = start + 2;
          selectionOffsetEnd = start + 11;
        }
        break;

      case 'Kursiv':
        if (selectedText) {
          replacement = `*${selectedText}*`;
          selectionOffsetStart = start + 1;
          selectionOffsetEnd = end + 1;
        } else {
          replacement = `*kursiv tekst*`;
          selectionOffsetStart = start + 1;
          selectionOffsetEnd = start + 13;
        }
        break;

      case 'H1':
        if (selectedText) {
          replacement = `\n# ${selectedText}\n`;
        } else {
          replacement = `\n# Overskrift 1\n`;
        }
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;

      case 'H2':
        if (selectedText) {
          replacement = `\n## ${selectedText}\n`;
        } else {
          replacement = `\n## Overskrift 2\n`;
        }
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;

      case 'Liste':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map(line => line.startsWith('- ') ? line : `- ${line}`)
            .join('\n');
        } else {
          replacement = `\n- Første punkt\n- Andre punkt\n- Tredje punkt\n`;
        }
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;

      case 'Nummerert':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line, idx) => `${idx + 1}. ${line.replace(/^\d+\.\s*/, '')}`)
            .join('\n');
        } else {
          replacement = `\n1. Første steg\n2. Andre steg\n3. Tredje steg\n`;
        }
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;

      case 'Sitat':
        if (selectedText) {
          replacement = `\n> ${selectedText}\n`;
        } else {
          replacement = `\n> "Skriv inn direkte sitat eller faglig referanse her..."\n`;
        }
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;

      case 'Understrek':
        if (selectedText) {
          replacement = `<u>${selectedText}</u>`;
        } else {
          replacement = `<u>understreket tekst</u>`;
        }
        selectionOffsetStart = start + 3;
        selectionOffsetEnd = start + replacement.length - 4;
        break;

      default:
        return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveDoc({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionOffsetStart, selectionOffsetEnd);
    }, 15);
  };

  // Keyboard shortcuts in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormatting('Fet');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormatting('Kursiv');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveDoc();
    }
  };

  const handleSaveDoc = () => {
    setSaveStatus('Lagret!');
    handleUpdateActiveDoc({
      subtitle: `${activeDoc?.template || 'Dokument'} • Sist lagret ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    });
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Calculate statistics
  const currentContent = activeDoc?.content || '';
  const wordCount = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const charCount = currentContent.length;
  const targetWords = activeDoc?.targetWords || 1500;
  const wordProgress = Math.min(100, Math.round((wordCount / targetWords) * 100));

  // Quality check handler
  const handleRunQualityCheck = async () => {
    if (!currentContent.trim()) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Gjennomfør en faglig og didaktisk kvalitetssjekk for dette barnehagelærer-dokumentet:
Oppgavetekst/Instruks: ${activeDoc?.taskPrompt || 'Ingen instruks oppgitt'}
Akademisk mal: ${activeDoc?.template || 'Refleksjonsnotat'}
Innhold:
${currentContent}

Gi en strukturert tilbakemelding med:
1. Rød tråd og struktur
2. Forankring i Rammeplan for barnehagen og pedagogisk teori
3. Kildebruk og akademisk språk
4. 3 konkrete forbedringsforslag`;

      const result = await analyzeAssignmentText(
        `Oppgavetekst: ${activeDoc?.taskPrompt || 'Refleksjon'}\nMal: ${activeDoc?.template}\n\nInnhold:\n${currentContent}`
      );
      setAnalysisResult(result || 'Kvalitetssjekken er fullført.');
    } catch (err) {
      console.error('Quality check error', err);
      setAnalysisResult('Kunne ikke hente kvalitetssjekk akkurat nå. Vennligst sjekk internettforbindelsen og prøv igjen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pin / Unpin
  const handlePinItem = (id: string, isPinned: boolean) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, isPinned } : d));
  };

  // Rename
  const handleRenameItem = (id: string, newTitle: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
  };

  // Delete
  const handleDeleteItem = (id: string) => {
    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== id);
      if (activeDocId === id) {
        if (filtered.length > 0) {
          setActiveDocId(filtered[0].id);
        } else {
          const freshId = Date.now().toString();
          const freshDoc: DocumentItem = {
            id: freshId,
            title: 'Nytt dokument',
            subtitle: 'Refleksjonsnotat • Kladd',
            isPinned: false,
            template: 'Refleksjonsnotat',
            targetWords: 1200,
            taskPrompt: '',
            content: '# Nytt dokument\n\nBegynn å skrive her...',
            updatedAt: new Date().toISOString()
          };
          setActiveDocId(freshId);
          return [freshDoc];
        }
      }
      return filtered;
    });
  };

  return (
    <WorkspaceLayout
      title="Skriveverksted"
      subtitle="Fra oppgavetekst til ferdig innlevering"
      icon={<FileText className="w-6 h-6" />}
      actionButtonLabel="Nytt dokument"
      onActionClick={handleNewDocument}
      historyItems={documents}
      activeItemId={activeDocId}
      onItemClick={(id) => {
        setActiveDocId(id);
        setViewMode('editor');
      }}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
    >
      {({ isCollapsed }) => (
        !activeDoc ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Velg et dokument eller opprett et nytt.
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white relative">
            
            {/* Toppmeny for det aktive dokumentet */}
            <div className={`flex items-center justify-between p-3.5 md:p-4 border-b border-slate-200 bg-white z-10 gap-3 transition-all duration-300 ${
              isCollapsed ? 'pl-16 sm:pl-36' : 'pl-3.5 md:pl-4'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-base md:text-lg font-black text-slate-800 truncate max-w-xs md:max-w-md lg:max-w-xl">
                  {activeDoc.title}
                </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                <button 
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'editor' 
                      ? 'bg-white text-primary shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5 inline mr-1" /> Editor
                </button>
                <button 
                  onClick={() => setViewMode('setup')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'setup' 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 inline mr-1" /> Oppsett
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setViewMode('quality-check')}
                className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'quality-check' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                }`}
              >
                <Sparkles className="w-4 h-4" /> 
                <span className="hidden sm:inline">Finpuss & sjekk</span>
              </button>

              <button 
                onClick={handleSaveDoc}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              >
                {saveStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                <span>{saveStatus || 'Lagre'}</span>
              </button>
            </div>
          </div>

          {/* ARBEIDSFLATER */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 custom-scrollbar">
            
            {/* MODUS: EDITOR */}
            {viewMode === 'editor' && (
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
                
                {/* Dynamisk Disposisjons-meny fra valgt mal */}
                {outline.length > 0 && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 mb-3 uppercase">
                      <FileText className="w-3 h-3" /> Disposisjon (Trykk punkt for å begynne å skrive)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {outline.map((section, idx) => (
                        <button 
                          key={section.id} 
                          onClick={() => handleSectionClick(section.title)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:border-primary hover:text-primary transition-all shadow-sm cursor-pointer"
                        >
                          {idx + 1}. {section.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verktøylinje */}
                <div className="flex gap-2 p-2 border-b border-slate-100 bg-white">
                  {['Fet', 'Kursiv', 'H1', 'H2', 'Liste'].map(tool => (
                    <button 
                      key={tool} 
                      onClick={() => applyFormatting(tool as any)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      {tool}
                    </button>
                  ))}
                </div>
                
                <textarea 
                  ref={textareaRef}
                  value={activeDoc.content}
                  onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })}
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full p-8 resize-none focus:outline-none text-slate-800 leading-relaxed font-sans text-base min-h-[500px]" 
                  placeholder={outline.length > 0 ? "Velg et punkt i disposisjonen over for å begynne skrivingen..." : "Begynn å skrive her..."}
                />
              </div>
            )}

            {/* MODUS: OPPSETT */}
            {viewMode === 'setup' && (
              <div className="max-w-3xl mx-auto space-y-6 pb-12">
                
                {/* 1. Oppgavedefinisjon */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" /> Definer oppgaven
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Dokumenttittel</label>
                      <input 
                        type="text"
                        value={activeDoc.title}
                        onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })}
                        className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                        placeholder="F.eks. Tolkning av medvirkning i barnehagen"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Oppgavetekst / Instruks</label>
                      <textarea 
                        value={activeDoc.taskPrompt}
                        onChange={(e) => handleUpdateActiveDoc({ taskPrompt: e.target.value })}
                        className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 focus:ring-2 focus:ring-primary outline-none" 
                        placeholder="Lim inn oppgaveteksten her..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Akademisk mal</label>
                        <select 
                          value={selectedTemplate}
                          onChange={handleTemplateChange}
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary font-medium text-slate-700"
                        >
                          <option value="">Velg en mal...</option>
                          {Object.keys(templates).map(templateName => (
                            <option key={templateName} value={templateName}>{templateName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Omfang (Ord)</label>
                        <input 
                          type="number" 
                          value={activeDoc.targetWords || ''}
                          onChange={(e) => handleUpdateActiveDoc({ targetWords: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                          placeholder="F.eks. 1500" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Disposisjon (Vises kun hvis en mal er valgt) */}
                {outline.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" /> Din disposisjon
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Strukturen for ditt skriveverksted.</p>
                      </div>
                      <button 
                        onClick={() => setViewMode('editor')}
                        className="px-6 py-3 bg-orange-700/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-orange-800 transition-all shadow-md cursor-pointer"
                      >
                        Gå til skriveverkstedet <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {outline.map((section, index) => (
                        <div key={section.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-3 font-bold text-slate-700">
                            <span className="text-slate-400">{index + 1}</span>
                            {section.title}
                          </div>
                          {section.subItems.length > 0 && (
                            <div className="mt-3 ml-6 space-y-2">
                              {section.subItems.map((sub, subIdx) => (
                                <div key={subIdx} className="flex items-center gap-2 text-sm text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                                  <span className="text-slate-400 text-xs">{index + 1}.{subIdx + 1}</span>
                                  {sub}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODUS: KVALITETSSJEKK / FINPUSS */}
            {viewMode === 'quality-check' && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xs border border-slate-200 space-y-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" /> Didaktisk kvalitetssjekk & Finpuss
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Sjekk oppgaven din mot faglige krav, rød tråd og APA-standard før du leverer.
                      </p>
                    </div>

                    <button 
                      onClick={handleRunQualityCheck}
                      disabled={isAnalyzing || !activeDoc.content.trim()}
                      className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all text-xs md:text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>Analyserer teksten...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Kjør kvalitetssjekk</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Visning av analyseresultat */}
                  {analysisResult ? (
                    <div className="bg-indigo-50/40 border border-indigo-100 p-6 rounded-2xl prose prose-sm max-w-none text-slate-800">
                      <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Hva sjekkes:</h4>
                        <ul className="text-xs text-slate-600 space-y-1.5">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Sammenheng mellom problemstilling og drøfting</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Tydelig forankring i Rammeplan for barnehagen</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Akademisk tone og begrepspresisjon</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" /> Husk kildekritikk
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          AI-tilbakemeldinger er veiledende verktøy for å styrke din egen refleksjon. Husk å alltid kontrollere referanselisten mot offisielle APA 7-krav.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
            
          </div>
        </div>
      )
    )}
  </WorkspaceLayout>
);
}

export default WritingWorkshop;
