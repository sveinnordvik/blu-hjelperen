import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Send, 
  RefreshCw, 
  HelpCircle, 
  Edit3, 
  Heart, 
  Users, 
  GraduationCap, 
  Building2, 
  Lightbulb,
  Check,
  Copy,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { jsPDF } from 'jspdf';

export interface GrunnsynChapter {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  isCustom?: boolean;
  socraticQuestions: string[];
}

export const STANDARD_GRUNNSYN_CHAPTERS: GrunnsynChapter[] = [
  {
    id: 'syn-paa-barnet',
    title: '1. Synet på barnet og barndommen',
    category: 'Grunnleggende verdi',
    description: 'Forståelsen av barnet som et eget subjekt med egne perspektiver, ressurser og rettigheter, og barndommens egenverdi.',
    content: '',
    socraticQuestions: [
      'Hvordan kommer det til uttrykk i din hverdag at barnet er et eget subjekt og ikke et objekt for voksenstyring?',
      'Hva betyr "barndommens egenverdi" for deg i situasjoner der dagsorden og rutiner oppleves hektiske?',
      'Hvordan sikrer du at barnas egne stemmer og uttrykk blir vektlagt i planleggingen av praksis?'
    ]
  },
  {
    id: 'omsorg-og-relasjoner',
    title: '2. Omsorg, trygghet og relasjoner',
    category: 'Relasjonelt helsefremmende',
    description: 'Hvordan voksne møter barn med anerkjennelse, varme og innlevelse, samt relasjonens betydning for trygghet og selvfølelse.',
    content: '',
    socraticQuestions: [
      'På hvilken måte viser du anerkjennelse og varme til et barn som utfordrer deg emosjonelt eller atferdsmessig?',
      'Hvordan balanserer du behovet for rammer og struktur med barnets behov for emosjonell trygghet?',
      'Hva legger du i profesjonell kjærlighet og omsorg i barnehagekonteksten?'
    ]
  },
  {
    id: 'synet-paa-lek',
    title: '3. Synet på lek',
    category: 'Lek & Egenverdi',
    description: 'Leken som barns primære uttrykks-, livs- og læringsform med sterk egenverdi, medvirkning og sosialt samspill.',
    content: '',
    socraticQuestions: [
      'Hva gjør du når leken "ikke fører til definerte læringsmål", men barna er dyp konsentrert? Beskytter du leken?',
      'Hvordan støtter du barn som strever med å komme inn i leke-fellesskapet uten å overta styringen?',
      'På hvilken måte gir den frie leken rom for medvirkning og fantasi i din barnehage?'
    ]
  },
  {
    id: 'laering-og-danning',
    title: '4. Synet på læring og danning',
    category: 'Utforskning & Danning',
    description: 'Læring gjennom undring, utforskning og samspill i hverdagen. Danning som en livslang prosess i et sosialt fellesskap.',
    content: '',
    socraticQuestions: [
      'Hvordan skiller du mellom undervisning og danning i hverdagens uformelle situasjoner?',
      'På hvilken måte stimulerer du barnas undring i stedet for å gi ferdige svar?',
      'Hvordan bidrar felles opplevelser i barnehagen til barnets gryende samfunnsforståelse og etiske bevissthet?'
    ]
  },
  {
    id: 'voksenrollen-og-etikk',
    title: '5. Den voksne sin rolle og profesjonsetikk',
    category: 'Maktbalanse & Etikk',
    description: 'Refleksjon over maktbalansen mellom barn og voksne, ivaretakelse av medvirkning og foreldresamarbeid.',
    content: '',
    socraticQuestions: [
      'Hvordan er du deg bevisst din maktposisjon som voksen i møte med små barn?',
      'Hvordan håndterer du situasjoner der foreldres ønsker kolliderer med barnehagens faglige verdier og rammeplan?',
      'Hvilke etiske dilemmaer opplever du oftets i praksis, og hvordan reflekterer du rundt dem?'
    ]
  },
  {
    id: 'ledelse-og-organisasjon',
    title: '6. Pedagogisk ledelse og organisasjonsutvikling',
    category: '2. & 3. studieår (Utvidelse)',
    description: 'Refleksjoner om å lede personalgruppen, fremme felles refleksjon og skape en lærende organisasjon.',
    content: '',
    socraticQuestions: [
      'Hvordan vil du som pedagogisk leder forankre ditt pedagogiske grunnsyn i hele personalgruppen?',
      'Hvordan håndterer du motstand mot endring eller ulik faglig forståelse på avdelingen?',
      'På hvilken måte fremmer du en kultur for veiledning og kritisk refleksjon blant medarbeiderne?'
    ]
  }
];

interface PedagogiskGrunnsynBuilderProps {
  studiested?: string;
  user?: any;
  onNavigateToChat?: (initialPrompt: string) => void;
}

export const PedagogiskGrunnsynBuilder: React.FC<PedagogiskGrunnsynBuilderProps> = ({
  studiested,
  user,
  onNavigateToChat
}) => {
  const [chapters, setChapters] = useState<GrunnsynChapter[]>(() => {
    const saved = localStorage.getItem('blu_pedagogisk_grunnsyn_chapters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Feil ved lesing av lagrede grunnsyn-kapitler", e);
      }
    }
    return STANDARD_GRUNNSYN_CHAPTERS;
  });

  const [activeChapterId, setActiveChapterId] = useState<string>(STANDARD_GRUNNSYN_CHAPTERS[0].id);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];
  const institutionName = studiested || user?.studiested || 'Din utdanningsinstitusjon';

  // Lagre lokalt ved endringer
  useEffect(() => {
    localStorage.setItem('blu_pedagogisk_grunnsyn_chapters', JSON.stringify(chapters));
  }, [chapters]);

  // Hent fra Firestore om tilgjengelig
  useEffect(() => {
    async function loadFromFirestore() {
      const currentUser = auth.currentUser || user;
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'documents', 'pedagogiskGrunnsyn');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.chapters) {
          setChapters(snap.data().chapters);
        }
      } catch (err) {
        console.error("Feil ved lesing av Pedagogisk Grunnsyn fra Firestore:", err);
      }
    }
    loadFromFirestore();
  }, [user]);

  const handleUpdateContent = (text: string) => {
    setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, content: text } : c));
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const currentUser = auth.currentUser || user;
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'documents', 'pedagogiskGrunnsyn');
        await setDoc(docRef, {
          userId: currentUser.uid,
          studiested: institutionName,
          chapters,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Speil i hovedbruker-dokumentet for lett tilgang i henhold til Rammeplanen
        await setDoc(doc(db, 'users', currentUser.uid), {
          pedagogicalPhilosophySummary: chapters.map(c => `${c.title}:\n${c.content}`).join('\n\n')
        }, { merge: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Feil ved lagring av Pedagogisk Grunnsyn:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomChapter = () => {
    if (!customTitle.trim()) return;
    const newChap: GrunnsynChapter = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      category: 'Fordypning & Egenvalgt',
      description: customDesc.trim() || 'Egendefinert kapittel i ditt pedagogiske grunnsyn.',
      content: '',
      isCustom: true,
      socraticQuestions: [
        'Hva er de viktigste faglige begrunnelsene for dette temaet i ditt grunnsyn?',
        'Hvordan omsetter du disse refleksjonene til konkret handling i barnehagehverdagen?',
        'Hvilke utfordringer kan du møte på, og hvordan vil du takle dem som barnehagelærer?'
      ]
    };
    setChapters(prev => [...prev, newChap]);
    setActiveChapterId(newChap.id);
    setCustomTitle('');
    setCustomDesc('');
    setShowAddCustomModal(false);
  };

  const handleDeleteChapter = (id: string) => {
    if (window.confirm('Er du sikker på at du vil slette dette egendefinerte kapittelet?')) {
      setChapters(prev => prev.filter(c => c.id !== id));
      setActiveChapterId(chapters[0].id);
    }
  };

  const handleExportDocx = async () => {
    const docSections = chapters.map(c => [
      new Paragraph({
        text: c.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: c.description, italics: true, color: '666666', size: 20 })
        ],
        spacing: { after: 180 }
      }),
      new Paragraph({
        text: c.content || '(Ikke skrevet ennå)',
        spacing: { after: 300 }
      })
    ]).flat();

    const docFile = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `Pedagogisk Grunnsyn`,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Forankret i Rammeplan for barnehagen · ${institutionName}`, italics: true, size: 22 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          ...docSections
        ]
      }]
    });

    const blob = await Packer.toBlob(docFile);
    saveAs(blob, `Pedagogisk_Grunnsyn_${new Date().toISOString().split('T')[0]}.docx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Pedagogisk Grunnsyn", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.text(`Forankret i Rammeplan for barnehagen · ${institutionName}`, 105, y, { align: "center" });
    y += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    chapters.forEach((c) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(c.title, 14, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      const descLines = doc.splitTextToSize(c.description, 180);
      doc.text(descLines, 14, y);
      y += descLines.length * 5 + 3;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const bodyLines = doc.splitTextToSize(c.content || "(Ikke skrevet ennå)", 180);
      doc.text(bodyLines, 14, y);
      y += bodyLines.length * 5 + 10;
    });

    doc.save(`Pedagogisk_Grunnsyn_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const completedCount = chapters.filter(c => c.content.trim().length > 50).length;
  const totalCount = chapters.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto py-2">
      {/* TOPP-BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
              <span>Forankret i Rammeplan for barnehagen · {institutionName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Mitt Pedagogiske Grunnsyn
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Ditt levende dokument for verdier, omsorgsfilosofi, synet på lek, læring og profesjonell voksenrolle. Uforsk, utvid og formidle din yrkesidentitet gjennom studieløpet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className={cn(
                "px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95",
                saveSuccess 
                  ? "bg-emerald-600 text-white" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Lagrer...' : saveSuccess ? 'Lagret i skyen!' : 'Lagre grunnsyn'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={handleExportDocx}
                className="px-3 py-2 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Eksporter til Word-dokument (.docx)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Word
              </button>
              <button
                onClick={handleExportPdf}
                className="px-3 py-2 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Eksporter til PDF-dokument"
              >
                <Download className="w-3.5 h-3.5 text-red-400" /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* PROGRESJONSLINJE */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-300">Gjennomarbeidet:</span>
            <div className="flex-1 sm:w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-400">{completedCount} av {totalCount} kapitler ({progressPercent}%)</span>
          </div>

          <button
            onClick={() => setShowAddCustomModal(true)}
            className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Legg til nytt kapittel / fordypning
          </button>
        </div>
      </div>

      {/* HOVEDARBEIDSFLATE: 2 KOLONNER (VENSTRE NAVIGATION / HØYRE EDITOR & SOKRATISK PANEL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KAPITTELOVERSIKT / FANEVELGER (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
              <span>Kapitler i ditt grunnsyn</span>
              <span>{chapters.length} totalt</span>
            </div>

            {chapters.map((chap, idx) => {
              const isActive = chap.id === activeChapterId;
              const isFilled = chap.content.trim().length > 50;

              return (
                <button
                  key={chap.id}
                  onClick={() => setActiveChapterId(chap.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 border cursor-pointer relative group",
                    isActive 
                      ? "bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-2xs font-bold" 
                      : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors",
                    isFilled 
                      ? "bg-emerald-500 text-white" 
                      : isActive 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-100 text-slate-500"
                  )}>
                    {isFilled ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-snug truncate">{chap.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{chap.category}</p>
                  </div>

                  {chap.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chap.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                      title="Slett kapittel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* REDIGERINGSOMRÅDE & SOKRATISK SPARPRING (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* AKTIVT KAPITTEL-EDITOR */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1.5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[11px] font-bold rounded-md">
                  {activeChapter.category}
                </span>
                {activeChapter.isCustom && (
                  <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200/60 text-amber-700 text-[11px] font-bold rounded-md">
                    Egendefinert
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">{activeChapter.title}</h2>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{activeChapter.description}</p>
            </div>

            {/* SKRIVEFELT */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Dine refleksjoner og standpunkter
              </label>
              <textarea
                value={activeChapter.content}
                onChange={(e) => handleUpdateContent(e.target.value)}
                placeholder={`Skriv dine refleksjoner om ${activeChapter.title.toLowerCase()} her...\n\nSvar gjerne på de sokratiske spørsmålene til høyre hvis du står fast, eller knytt teksten til opplevelser fra praksis og Rammeplanen.`}
                rows={12}
                className="w-full p-4 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium leading-relaxed text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-y"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                <span>{activeChapter.content.trim().split(/\s+/).filter(w => w.length > 0).length} ord</span>
                <span>Lagres automatisk lokalt</span>
              </div>
            </div>

            {/* SOKRATISK SPARPRINGSBOKS VED SIDEN / UNDER */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/30 rounded-2xl border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900">
                <Brain className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-sm">Sokratisk sparring for dette kapittelet</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Står du fast? Still deg selv disse reflekterende spørsmålene eller send et innkast direkte til Superveilederen for faglige innspill:
              </p>

              <div className="space-y-2">
                {activeChapter.socraticQuestions.map((q, qIdx) => (
                  <div 
                    key={`q-${qIdx}`}
                    className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs flex items-start justify-between gap-3 group hover:border-indigo-300 transition"
                  >
                    <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{q}"</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(q);
                          setCopiedQuestion(`q-${qIdx}`);
                          setTimeout(() => setCopiedQuestion(null), 2000);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        title="Kopier spørsmål"
                      >
                        {copiedQuestion === `q-${qIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {onNavigateToChat && (
                        <button
                          onClick={() => onNavigateToChat(`Jeg jobber med mitt Pedagogiske Grunnsyn (${activeChapter.title}). Kan du gi meg sokratisk sparring på følgende spørsmål: "${q}"?`)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Sparr med Superveilederen i chatten"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" /> Sparr i chat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FOR Å LEGGE TIL NYTT EGENDEFINERT KAPITTEL */}
      <AnimatePresence>
        {showAddCustomModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Legg til nytt kapittel</h3>
                <p className="text-xs text-slate-500">Utvid ditt pedagogiske grunnsyn med et nytt fordypningstema (f.eks. Flerspråklighet, Utepedagogikk eller Spesialpedagogikk).</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Kapittel-tittel</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="F.eks. Min tilnærming til flerkulturelt mangfold"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Kort beskrivelse / Formål</label>
                  <input
                    type="text"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="F.eks. Hvordan jeg skaper inkluderende felleskap for alle barn..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleAddCustomChapter}
                  disabled={!customTitle.trim()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Opprett kapittel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PedagogiskGrunnsynBuilder;
