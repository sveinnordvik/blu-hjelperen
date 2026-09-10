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

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0] || {
    id: 'temp',
    title: 'Nytt dokument',
    content: '',
    taskPrompt: '',
    template: 'Refleksjonsnotat',
    targetWords: 1000,
    updatedAt: new Date().toISOString()
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents to localStorage', e);
    }
  }, [documents]);

  const handleUpdateActiveDoc = (fields: Partial<DocumentItem>) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === activeDocId) {
        return {
          ...d,
          ...fields,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    }));
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setSaveStatus('Lagrer...');
    setTimeout(() => {
      setSaveStatus('Lagret');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 500);
  };

  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templates[templateName]) {
      setOutline(templates[templateName]);
    }
  };

  const handleApplyOutline = () => {
    if (!outline.length) return;
    let generatedMarkdown = `\n\n# Disposisjon: ${selectedTemplate || activeDoc.title}\n\n`;
    outline.forEach(sec => {
      generatedMarkdown += `## ${sec.title}\n\n[Skriv innhold her...]\n\n`;
      sec.subItems.forEach(sub => {
        generatedMarkdown += `### ${sub}\n\n[Underpunkt-innhold...]\n\n`;
      });
    });

    handleUpdateActiveDoc({
      content: (activeDoc.content ? activeDoc.content + '\n' : '') + generatedMarkdown
    });
    setViewMode('editor');
  };

  const handleRunAnalysis = async () => {
    if (!activeDoc.content.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const prompt = `Gjør en akademisk vurdering av følgende studenttekst for barnehagelærerutdanningen:
Oppgavetekst/Problemstilling: ${activeDoc.taskPrompt || 'Ikke oppgitt'}
Mal/Type: ${activeDoc.template || 'Generell'}

Tekst:
${activeDoc.content}

Vurder spesielt:
1. Rød tråd og struktur
2. Forankring i barnehagepedagogisk teori og Rammeplanen
3. Språkføring og akademisk tone
4. Konkrete råd for forbedring`;
      
      const result = await analyzeAssignmentText(prompt);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setAnalysisResult("Kunne ikke fullføre analysen. Prøv igjen senere.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text formatting helpers for editor
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeDoc.content;
    const selectedText = text.substring(start, end);

    let replacement = '';
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'fet tekst'}**`;
        newStart = start + 2;
        newEnd = selectedText ? end + 2 : start + 10;
        break;
      case 'italic':
        replacement = `*${selectedText || 'kursiv tekst'}*`;
        newStart = start + 1;
        newEnd = selectedText ? end + 1 : start + 13;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'understreket'}</u>`;
        newStart = start + 3;
        newEnd = selectedText ? end + 3 : start + 15;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || 'Overskrift 1'}\n`;
        newStart = start + replacement.length;
        newEnd = newStart;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Overskrift 2'}\n`;
        newStart = start + replacement.length;
        newEnd = newStart;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'Punkt 1'}\n- Punkt 2\n`;
        newStart = start + replacement.length;
        newEnd = newStart;
        break;
      case 'orderedList':
        replacement = `\n1. ${selectedText || 'Første punkt'}\n2. Andre punkt\n`;
        newStart = start + replacement.length;
        newEnd = newStart;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Sitat / akademisk kildereferanse'}\n`;
        newStart = start + replacement.length;
        newEnd = newStart;
        break;
      default:
        return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateActiveDoc({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 10);
  };

  // Word count & progress calculation
  const wordCount = activeDoc.content.trim() ? activeDoc.content.trim().split(/\s+/).length : 0;
  const wordProgress = Math.min(100, Math.round((wordCount / (activeDoc.targetWords || 1000)) * 100));

  return (
    <WorkspaceLayout
      title="Skriveverksted"
      subtitle="Strukturer, skriv og analyser dine barnehagepedagogiske oppgaver"
      icon={<FileText className="w-6 h-6" />}
      actionButtonLabel="Ny oppgave"
      onActionClick={() => {
        const newId = Date.now().toString();
        const newDoc: DocumentItem = {
          id: newId,
          title: 'Nytt dokument',
          subtitle: 'Opprettet i dag',
          content: '# Nytt dokument\n\nSkriv inn teksten din her...',
          taskPrompt: '',
          template: 'Refleksjonsnotat',
          targetWords: 1500,
          updatedAt: new Date().toISOString()
        };
        setDocuments(prev => [newDoc, ...prev]);
        setActiveDocId(newId);
        setViewMode('setup');
      }}
      historyItems={documents}
      activeItemId={activeDocId}
      historySectionTitle="Mine oppgaver"
      onItemClick={(id: string) => {
        setActiveDocId(id);
        setViewMode('editor');
      }}
      onPinItem={(id: string, isPinned: boolean) => {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, isPinned } : d));
      }}
      onRenameItem={(id: string, newTitle: string) => {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
      }}
      onDeleteItem={(id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocId === id) {
          const remaining = documents.filter(d => d.id !== id);
          if (remaining.length > 0) setActiveDocId(remaining[0].id);
        }
      }}
    >
      <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Top bar with modes and status */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-xl">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'editor'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5 inline mr-1.5" />
              Skriveflate
            </button>
            <button
              onClick={() => setViewMode('setup')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'setup'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 inline mr-1.5" />
              Oppgaveoppsett
            </button>
            <button
              onClick={() => {
                setViewMode('quality-check');
                if (!analysisResult) handleRunAnalysis();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'quality-check'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />
              Kvalitetssjekk
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            {saveStatus && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span>
                {wordCount} / {activeDoc.targetWords || 1500} ord ({wordProgress}%)
              </span>
              <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${wordProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* View Mode: Editor */}
        {viewMode === 'editor' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar for formatting */}
            <div className="px-6 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
              <div className="flex items-center gap-1 text-slate-600">
                <button 
                  onClick={() => applyFormatting('bold')} 
                  title="Fet (Ctrl+B)" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormatting('italic')} 
                  title="Kursiv (Ctrl+I)" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormatting('underline')} 
                  title="Understreket" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button 
                  onClick={() => applyFormatting('h1')} 
                  title="Overskrift 1" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormatting('h2')} 
                  title="Overskrift 2" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button 
                  onClick={() => applyFormatting('list')} 
                  title="Punktliste" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormatting('orderedList')} 
                  title="Nummerert liste" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormatting('quote')} 
                  title="Sitatblokk" 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                  <Quote className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setEditorTab('write')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorTab === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />
                    Skriv
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    Forhåndsvis
                  </button>
                </div>
              </div>
            </div>

            {/* Main writing area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <div className="max-w-3xl mx-auto space-y-4">
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })}
                  placeholder="Oppgavetittel..."
                  className="w-full text-2xl font-bold text-slate-900 border-none bg-transparent focus:outline-none placeholder:text-slate-300"
                />

                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    value={activeDoc.content}
                    onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })}
                    placeholder="Begynn å skrive oppgaven din her... Bruk overskrifter, avsnitt og referanser."
                    rows={24}
                    className="w-full bg-transparent resize-none border-none focus:outline-none text-slate-800 text-base leading-relaxed placeholder:text-slate-300 min-h-[500px]"
                  />
                ) : (
                  <div className="prose prose-slate max-w-none min-h-[500px] text-slate-800 leading-relaxed py-2">
                    <ReactMarkdown>{activeDoc.content || '*Ingen tekst skrevet enda.*'}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Setup & Mal */}
        {viewMode === 'setup' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Oppgaveinnstillinger</h3>
                <p className="text-sm text-slate-500">Definer rammer, problemstilling og struktur for denne oppgaven.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Oppgavetekst / Problemstilling
                  </label>
                  <textarea
                    value={activeDoc.taskPrompt || ''}
                    onChange={(e) => handleUpdateActiveDoc({ taskPrompt: e.target.value })}
                    placeholder="Lim inn oppgaveteksten eller formuler din egen problemstilling her..."
                    rows={4}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Mål for ordantall
                    </label>
                    <input
                      type="number"
                      value={activeDoc.targetWords || 1500}
                      onChange={(e) => handleUpdateActiveDoc({ targetWords: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Oppgavetype
                    </label>
                    <select
                      value={activeDoc.template || 'Refleksjonsnotat'}
                      onChange={(e) => {
                        handleUpdateActiveDoc({ template: e.target.value });
                        handleSelectTemplate(e.target.value);
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.keys(templates).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mal og disposisjonsforslag */}
              <div className="pt-6 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Strukturforslag for: {selectedTemplate || activeDoc.template || 'Valgt oppgavetype'}
                </h4>
                
                <div className="space-y-2 mb-6">
                  {(outline.length > 0 ? outline : (templates[activeDoc.template] || templates['Refleksjonsnotat'])).map((sec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{sec.title}</p>
                          {sec.subItems.length > 0 && (
                            <p className="text-xs text-slate-500">Underpunkter: {sec.subItems.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApplyOutline}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Sett inn struktur i oppgaveteksten
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Quality Check */}
        {viewMode === 'quality-check' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Akademisk kvalitetssjekk</h3>
                  <p className="text-sm text-slate-500">Automatisk analyse basert på barnehagefaglige vurderingskriterier.</p>
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzing ? 'Analyserer tekst...' : 'Kjør ny analyse'}
                </button>
              </div>

              {isAnalyzing && (
                <div className="p-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium text-slate-600">
                    Leser gjennom oppgaven, sjekker rød tråd og teoretisk forankring...
                  </p>
                </div>
              )}

              {!isAnalyzing && analysisResult && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    Analyse fullført
                  </div>
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{analysisResult}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!isAnalyzing && !analysisResult && (
                <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-600">Ingen analyse utført for dette utkastet ennå.</p>
                  <button
                    onClick={handleRunAnalysis}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Start analyse nå
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export default WritingWorkshop;
