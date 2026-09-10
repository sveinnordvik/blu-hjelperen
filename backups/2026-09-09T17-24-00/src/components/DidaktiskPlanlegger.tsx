import React, { useState } from 'react';
import { 
  MapPin, 
  Sparkles, 
  TrendingUp, 
  BookOpen, 
  ChevronRight, 
  Calendar,
  Layout,
  ChevronDown,
  CheckCircle2,
  ChevronLeft,
  Plus,
  Info,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Save,
  Download,
  Loader2,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { generateDidaktiskPlan } from '../services/geminiService';
import AIWarning from './AIWarning';

// Sorteringsrekkefølge for barnehageåret
const YEAR_ORDER = [
  // Sesonger
  'Høst', 'Vinter', 'Vår', 'Sommer',
  // Måneder
  'August', 'September', 'Oktober', 'November', 'Desember',
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli'
];

interface Plan {
  id: string;
  title: string;
  type: 'måned' | 'sesong';
  content: string;
  period: string; // Navnet som brukes for sortering (f.eks. 'August' eller 'Høst')
}

export const DidaktiskPlanlegger: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'settings'>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // AI Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPlantype, setGenPlantype] = useState('Ukesplan');
  const [genTema, setGenTema] = useState('');
  const [genTillegg, setGenTillegg] = useState('');

  // 1. Innstillinger ("Vår barnehage")
  const [settings, setSettings] = useState({
    tursteder: 'Eventyrskogen, Gapahuken ved vannet, Biblioteket, Den røde lekeplassen',
    pedagogiskSaerpreg: 'Skoggruppemetoden, PLAGG/Gjenkalling, Barns medvirkning',
    satsingsomraader: 'Språkutvikling, Sosial kompetanse, Bærekraftig utvikling',
    prinsipper: 'Vi tror på det kompetente barnet som lærer gjennom lek, utforskning og samspill med andre. Vårt pedagogiske arbeid skal alltid ta utgangspunkt i barnas interesser og behov...'
  });

  // 2. Pre-utfylt database (Mock data)
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: 'plan-aug',
      title: 'Oppstart og fellesskap',
      type: 'måned',
      period: 'August',
      content: `<h2>Tema: Trygghet og vennskap</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Bli-kjent-leker i samlingsstund og på uteområdet.</li>
<li><strong>Hvordan:</strong> Vi bruker små grupper for at barna skal føle seg trygge. Vi synger faste sanger og lærer hverandres navn.</li>
<li><strong>Gjennomføring:</strong> Fast tilknytningsperson følger de nye barna tett de første ukene.</li>
<li><strong>Gjenkalling (PLAGG):</strong> Vi tar bilder av barnas lek og viser dem på skjerm/bildevegg, hvor barna forteller hva de har gjort.</li>
</ul>`
    },
    {
      id: 'plan-sep',
      title: 'Høsting og natur',
      type: 'måned',
      period: 'September',
      content: `<h2>Tema: Hva vokser i naturen?</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Tur til tursteder for å plukke epler og bær.</li>
<li><strong>Hvordan:</strong> Vi studerer insekter med forstørrelsesglass og snakker om årstiden.</li>
<li><strong>Gjennomføring:</strong> Turene skjer gruppevis hver tirsdag og torsdag.</li>
<li><strong>Gjenkalling (PLAGG):</strong> Barna tegner det de så på turen og forklarer tegningene sine til personalet.</li>
</ul>`
    },
    {
      id: 'plan-host',
      title: 'Sesongplan: Høst',
      type: 'sesong',
      period: 'Høst',
      content: `<h2>Tema: Høstens farger og endringer</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Formingsaktiviteter med lyng, blader og naturmaterialer.</li>
<li><strong>Hvordan:</strong> Vi lager collager og skaper uttrykk basert på høstfargene.</li>
<li><strong>Gjennomføring:</strong> Gjennomføres i mindre grupper i "skaperverkstedet".</li>
<li><strong>Gjenkalling (PLAGG):</strong> Vi lager en digital presentasjon med bilder av barna i aktivitet som foreldrene får se.</li>
</ul>`
    },
    {
      id: 'plan-des',
      title: 'Tradisjon og lys',
      type: 'måned',
      period: 'Desember',
      content: `<h2>Tema: Juleglede og tradisjoner</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Lucia-markering, juleverksted og nissefest.</li>
<li><strong>Hvordan:</strong> Vi fokuserer på gleden ved å gi og dele gode øyeblikk.</li>
<li><strong>Gjennomføring:</strong> Tradisjonelle markeringer sammen med barna og foreldre.</li>
<li><strong>Gjenkalling (PLAGG):</strong> Vi reflekterer sammen med barna over hva adventstiden har betydd for dem.</li>
</ul>`
    },
    // Legger til resten som enkle mock-objekter for å fylle året
    ...['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli'].map(month => ({
      id: `plan-${month.toLowerCase()}`,
      title: `Plan for ${month}`,
      type: 'måned' as const,
      period: month,
      content: `<h2>Tema: ${month}-aktiviteter</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Aktiviteter spesielt tilpasset ${month}.</li>
<li><strong>Hvordan:</strong> Gjennom lek og pedagogisk ledelse.</li>
<li><strong>Gjennomføring:</strong> Planlagt gjennomføring i tråd med årsplanen.</li>
<li><strong>Gjenkalling (PLAGG):</strong> Bruk av dokumentasjon for barnegruppens læring.</li>
</ul>`
    })),
    ...['Vinter', 'Vår', 'Sommer'].map(season => ({
      id: `plan-${season.toLowerCase()}`,
      title: `Sesongplan: ${season}`,
      type: 'sesong' as const,
      period: season,
      content: `<h2>Tema: Fokusområde for ${season}</h2>
<h3>Aktiviteter</h3>
<ul>
<li><strong>Hva:</strong> Overordnede mål for sesongen.</li>
<li><strong>Hvordan:</strong> Implementering gjennom barnehagehverdagen.</li>
<li><strong>Gjennomføring:</strong> Fleksibel tilnærming ut fra vær og interesser.</li>
<li><strong>Gjenkalling (PLAGG):</strong> Langsiktig dokumentasjon og refleksjon.</li>
</ul>`
    }))
  ]);

  // 3. Sorteringslogikk
  const sortedPlans = React.useMemo(() => {
    return [...plans].sort((a, b) => {
      return YEAR_ORDER.indexOf(a.period) - YEAR_ORDER.indexOf(b.period);
    });
  }, [plans]);

  const selectedPlan = React.useMemo(() => {
    return plans.find(p => p.id === selectedPlanId);
  }, [plans, selectedPlanId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
      }),
      Bold.extend({
        addKeyboardShortcuts() {
          return {
            'Mod-f': () => this.editor.commands.toggleBold(),
            'Mod-F': () => this.editor.commands.toggleBold(),
          }
        },
      }),
      Italic.extend({
        addKeyboardShortcuts() {
          return {
            'Mod-k': () => this.editor.commands.toggleItalic(),
            'Mod-K': () => this.editor.commands.toggleItalic(),
          }
        },
      }),
    ],
    content: selectedPlan?.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] text-slate-800 leading-relaxed',
      },
    },
  });

  // Oppdater editoren når en ny plan velges
  React.useEffect(() => {
    if (editor && selectedPlan) {
      editor.commands.setContent(selectedPlan.content);
    }
  }, [selectedPlanId, editor]);

  const handleGenerateWithAI = async () => {
    if (!genTema) {
      alert("Vennligst fyll inn 'Tema / Hovedfokus' før du genererer.");
      return;
    }

    setIsGenerating(true);
    try {
      const generatedHtml = await generateDidaktiskPlan({
        plantype: genPlantype,
        tema: genTema,
        tilleggsinfo: genTillegg,
        settings: settings
      });

      if (editor) {
        editor.commands.setContent(generatedHtml);
      }
      setShowGenerator(false);
    } catch (e: any) {
      alert("Det oppstod en feil under genereringen: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!editor || !selectedPlanId) return;
    const newContent = editor.getHTML();
    setPlans(prev => prev.map(p => p.id === selectedPlanId ? { ...p, content: newContent } : p));
    // Her kunne man også lagret til Firebase hvis det var satt opp
    alert('Planen er lagret!');
  };

  const handleDownloadWord = async () => {
    if (!selectedPlan || !editor) return;

    // Veldig enkel HTML-til-Paragraph parser for demo
    // En ekte parser ville vært mer robust, men vi støtter H2, H3, UL/LI, B, I som forespurt
    const html = editor.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const sections: any[] = [];
    
    // Tittel
    sections.push(new Paragraph({
      text: selectedPlan.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 }
    }));

    // Innholdsparser
    Array.from(tempDiv.childNodes).forEach((node: any) => {
      if (node.nodeName === 'H2') {
        sections.push(new Paragraph({
          text: node.innerText,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }));
      } else if (node.nodeName === 'H3') {
        sections.push(new Paragraph({
          text: node.innerText,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 150 }
        }));
      } else if (node.nodeName === 'UL') {
        Array.from(node.childNodes).forEach((li: any) => {
          if (li.nodeName === 'LI') {
            const runs: TextRun[] = [];
            // Enkel sjekk for bold/italic inne i LI
            Array.from(li.childNodes).forEach((child: any) => {
              if (child.nodeType === 3) { // Text
                runs.push(new TextRun(child.textContent));
              } else if (child.nodeName === 'STRONG' || child.nodeName === 'B') {
                runs.push(new TextRun({ text: child.innerText, bold: true }));
              } else if (child.nodeName === 'EM' || child.nodeName === 'I') {
                runs.push(new TextRun({ text: child.innerText, italics: true }));
              } else {
                runs.push(new TextRun(child.innerText));
              }
            });
            sections.push(new Paragraph({
              children: runs,
              bullet: { level: 0 }
            }));
          }
        });
      } else if (node.nodeName === 'P' || node.nodeName === 'DIV') {
        const runs: TextRun[] = [];
        Array.from(node.childNodes).forEach((child: any) => {
          if (child.nodeType === 3) {
            runs.push(new TextRun(child.textContent));
          } else if (child.nodeName === 'STRONG' || child.nodeName === 'B') {
            runs.push(new TextRun({ text: child.innerText, bold: true }));
          } else if (child.nodeName === 'EM' || child.nodeName === 'I') {
            runs.push(new TextRun({ text: child.innerText, italics: true }));
          } else {
            runs.push(new TextRun(child.innerText || child.textContent));
          }
        });
        sections.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${selectedPlan.title}.docx`);
  };

  const Toolbar = () => {
    if (!editor) return null;
    return (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("p-2 rounded hover:bg-slate-200 transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-primary' : 'text-slate-600')}
          title="Overskrift 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn("p-2 rounded hover:bg-slate-200 transition-colors", editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-primary' : 'text-slate-600')}
          title="Overskrift 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-2 rounded hover:bg-slate-200 transition-colors", editor.isActive('bold') ? 'bg-slate-200 text-primary' : 'text-slate-600')}
          title="Fet (Ctrl+F)"
        >
          <BoldIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-2 rounded hover:bg-slate-200 transition-colors", editor.isActive('italic') ? 'bg-slate-200 text-primary' : 'text-slate-600')}
          title="Kursiv (Ctrl+K)"
        >
          <ItalicIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("p-2 rounded hover:bg-slate-200 transition-colors", editor.isActive('bulletList') ? 'bg-slate-200 text-primary' : 'text-slate-600')}
          title="Punktliste"
        >
          <ListIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Angre"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Gjenta"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8 pb-32">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-[4rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-2 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-white flex items-center justify-center md:justify-start gap-3">
            <Layout className="w-7 h-7 md:w-8 md:h-8 text-white" /> Didaktisk Planlegger
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em]">Verktøy for pedagogisk planlegging og oversikt</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 relative z-10">
          <button 
            onClick={() => setActiveSubTab('plans')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'plans' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            Planer
          </button>
          <button 
            onClick={() => setActiveSubTab('settings')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'settings' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            Innstillinger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main View Area */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeSubTab === 'plans' ? (
              <motion.div 
                key="plans-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {selectedPlan ? (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex flex-col">
                      <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              selectedPlan.type === 'sesong' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {selectedPlan.type}
                            </span>
                            <span className="text-xs font-bold text-slate-400">{selectedPlan.period}</span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-black text-slate-900 italic">{selectedPlan.title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowGenerator(!showGenerator)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              showGenerator ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                            )}
                          >
                            <Bot className="w-4 h-4" /> AI Assistent
                          </button>
                          <button 
                            onClick={() => setSelectedPlanId(null)}
                            className="p-2.5 hover:bg-white text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showGenerator && (
                          <motion.div key="ap-auto-120-1"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-b border-slate-200 bg-emerald-50/50 overflow-hidden"
                          >
                            <div className="p-6 md:p-8 space-y-6">
                              <div className="space-y-2">
                                <h3 className="text-lg font-black text-emerald-900 italic flex items-center gap-2">
                                  <Sparkles className="w-5 h-5 text-emerald-500" /> Generer planinnhold med AI
                                </h3>
                                <p className="text-xs text-emerald-700/70 font-medium">Fyll inn feltene under. AI-assistenten bygger planen basert på innstillingene dine for "Vår barnehage" og de pedagogiske prinsippene ("BLU-hjelperen"). OBS: Dette vil overskrive innholdet i editoren.</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Plantype</label>
                                  <div className="relative">
                                    <select
                                      value={genPlantype}
                                      onChange={(e) => setGenPlantype(e.target.value)}
                                      className="w-full appearance-none bg-white border border-emerald-200/60 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-900"
                                    >
                                      <option value="Sesong">Sesong</option>
                                      <option value="Måned">Måned</option>
                                      <option value="Uke">Uke</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Tema / Hovedfokus</label>
                                  <input
                                    type="text"
                                    value={genTema}
                                    onChange={(e) => setGenTema(e.target.value)}
                                    placeholder="F.eks. Høst og naturvern..."
                                    className="w-full bg-white border border-emerald-200/60 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-emerald-900"
                                  />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Tilleggsinfo / Inspirasjon (Valgfritt)</label>
                                  <textarea
                                    value={genTillegg}
                                    onChange={(e) => setGenTillegg(e.target.value)}
                                    placeholder="Skriv inn spesifikke mål, eller 'Hent tips fra forskerfrø.no'..."
                                    rows={2}
                                    className="w-full bg-white border border-emerald-200/60 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-emerald-900 resize-none"
                                  />
                                </div>
                              </div>

                              <AIWarning compact={true} dismissible={true} />

                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={handleGenerateWithAI}
                                  disabled={isGenerating}
                                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                  {isGenerating ? 'Utarbeider plan...' : '✨ Generer Plan med AI'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Toolbar />
                    <div className="p-8 md:p-12 prose prose-slate max-w-none prose-headings:font-black prose-headings:italic prose-h2:text-primary prose-h3:text-slate-800 prose-li:mb-2 text-slate-800 bg-white min-h-[500px]">
                      <EditorContent editor={editor} />
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                      <p className="text-[10px] text-slate-400 font-bold italic">Sist lagret lokalt: {new Date().toLocaleTimeString()}</p>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button 
                          onClick={handleDownloadWord}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Word (.docx)
                        </button>
                        <button 
                          onClick={handleSave}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                          <Save className="w-4 h-4" /> Lagre endringer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <BookOpen className="w-10 h-10 text-slate-300" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">Velg en plan fra listen</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">Klikk på en av planene i oversikten til høyre for å se detaljene.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="settings-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-12 space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 italic">Vår barnehage</h2>
                  <p className="text-slate-500 text-sm">Disse variablene brukes som grunnlag hver gang du genererer nye didaktiske planer.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Tursteder */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                      <MapPin className="w-4 h-4 text-primary" /> Faste tursteder
                    </label>
                    <input 
                      type="text"
                      value={settings.tursteder}
                      onChange={(e) => setSettings({...settings, tursteder: e.target.value})}
                      placeholder="F.eks: Eventyrskogen, Biblioteket..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Pedagogisk særpreg */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Pedagogisk særpreg
                    </label>
                    <input 
                      type="text"
                      value={settings.pedagogiskSaerpreg}
                      onChange={(e) => setSettings({...settings, pedagogiskSaerpreg: e.target.value})}
                      placeholder="F.eks: Skoggruppemetoden, Reggio Emilia..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Satsingsområder */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Aktuelle satsingsområder
                    </label>
                    <input 
                      type="text"
                      value={settings.satsingsomraader}
                      onChange={(e) => setSettings({...settings, satsingsomraader: e.target.value})}
                      placeholder="F.eks: Språk, Sosial kompetanse..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Prinsipper */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                      <BookOpen className="w-4 h-4 text-blue-500" /> Overordnede pedagogiske prinsipper
                    </label>
                    <textarea 
                      value={settings.prinsipper}
                      onChange={(e) => setSettings({...settings, prinsipper: e.target.value})}
                      rows={6}
                      placeholder="Beskriv barnehagens faste føringer og prinsipper..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all font-medium resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    <CheckCircle2 className="w-4 h-4" /> Lagre konfigurasjon
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: Plans List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-6 bg-slate-50 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Barnehageåret
              </h3>
              <div className="text-[10px] font-bold text-slate-400 italic">August - Juli</div>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
              <div className="space-y-1">
                {sortedPlans.map((plan, idx) => (
                  <button 
                    key={`plan-${plan.id}-${Math.random()}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all group relative flex items-center justify-between",
                      selectedPlanId === plan.id 
                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02] z-10" 
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors",
                        selectedPlanId === plan.id ? "bg-white/20" : "bg-slate-100 text-slate-400 group-hover:bg-primary-light/30 group-hover:text-primary"
                      )}>
                        {plan.period.substring(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest mb-0.5",
                          selectedPlanId === plan.id ? "text-white/60" : "text-slate-400"
                        )}>
                          {plan.type}
                        </p>
                        <p className="text-xs font-black truncate">{plan.title}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      selectedPlanId === plan.id ? "translate-x-1" : "text-slate-300 group-hover:translate-x-1"
                    )} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-50">
              <button 
                disabled
                className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" /> Ny didaktisk plan
              </button>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm text-primary">
                <Info className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-primary-dark uppercase tracking-widest">Tips</h4>
            </div>
            <p className="text-[11px] text-primary-dark/70 font-medium leading-relaxed italic">
              "Gjenkalling (PLAGG)" er en sentral del av vår pedagogikk. Den hjelper barna å sette ord på opplevelser gjennom dokumentasjon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
