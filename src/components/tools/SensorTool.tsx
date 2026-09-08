import React from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Scale, 
  AlertTriangle, 
  FileCheck, 
  Upload, 
  Loader2, 
  Sparkles, 
  FileText, 
  Check, 
  Copy, 
  Info, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';
import { cn, formatBytes } from '../../lib/utils';
import { HelpSection } from '../HelpSection';
import { AiTextRewriter } from '../AiTextRewriter';

interface SensorToolProps {
  sensorOption: 'evaluation' | 'feedback';
  setSensorOption: (val: 'evaluation' | 'feedback') => void;
  isDevilAdvocate: boolean;
  setIsDevilAdvocate: (val: boolean) => void;
  sensorUploadMode: 'text' | 'file';
  setSensorUploadMode: (val: 'text' | 'file') => void;
  sensorInput: string;
  setSensorInput: (val: string) => void;
  sensorFile: File | null;
  setSensorFile: (file: File | null) => void;
  teacherFeedback: string;
  setTeacherFeedback: (val: string) => void;
  handleAnalyze: () => void;
  isEvaluating: boolean;
  evaluationResult: string | null;
  copyToClipboard: (content: string, id: string) => void;
  copiedId: string | null;
  pricingTier: string;
  isGuest: boolean;
  plagiarismError: string | null;
  plagiarismResult: string | null;
  isCheckingPlagiarism: boolean;
  handlePlagiarismCheck: () => void;
  setPlagiarismResult: (val: string) => void;
  setPlagiarismError: (val: string | null) => void;
  setActiveTab: (tab: any) => void;
  checkAccess: (tier?: string) => boolean;
}

export const SensorTool: React.FC<SensorToolProps> = ({
  sensorOption,
  setSensorOption,
  isDevilAdvocate,
  setIsDevilAdvocate,
  sensorUploadMode,
  setSensorUploadMode,
  sensorInput,
  setSensorInput,
  sensorFile,
  setSensorFile,
  teacherFeedback,
  setTeacherFeedback,
  handleAnalyze,
  isEvaluating,
  evaluationResult,
  copyToClipboard,
  copiedId,
  pricingTier,
  isGuest,
  plagiarismError,
  plagiarismResult,
  isCheckingPlagiarism,
  handlePlagiarismCheck,
  setPlagiarismResult,
  setPlagiarismError,
  setActiveTab,
  checkAccess
}) => {
  const isYearly = checkAccess('yearly');
  const isMonthly = checkAccess('monthly');

  const getLabel = (base: string) => {
    if (isGuest) return `🔒 Logg inn for å bruke`;
    if (isYearly) return base;
    return `🔒 Krever Årsabonnement`;
  };

  return (
    <motion.div 
      key="sensor"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col gap-6"
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 p-2 rounded-lg">
            <Scale className="text-red-600 w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Sensorverktøyet</h2>
            <p className="text-sm text-slate-500">Få hjelp til å vurdere din oppgave eller forstå sensors tilbakemelding.</p>
            <HelpSection 
              title="Sensor" 
              content="Dette verktøyet simulerer en sensor som vurderer teksten din opp mot vanlige vurderingskriterier. Bruk tilbakemeldingene til å forbedre oppgaven før endelig innlevering." 
            />
          </div>
        </div>

        <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl mb-6">
          <button 
            onClick={() => { setSensorOption('evaluation'); setIsDevilAdvocate(false); }}
            disabled={!isYearly}
            className={cn(
               "flex-1 min-w-[120px] py-2.5 rounded-lg text-sm font-bold transition-all",
               sensorOption === 'evaluation' && !isDevilAdvocate ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700",
               !isYearly && "opacity-50 cursor-not-allowed text-[10px]"
            )}
          >
            {getLabel('Fiktiv vurdering')}
          </button>
          <button 
            onClick={() => { setSensorOption('evaluation'); setIsDevilAdvocate(true); }}
            disabled={!isYearly}
            className={cn(
              "flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
              isDevilAdvocate ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700",
              !isYearly && "opacity-50 cursor-not-allowed text-[10px]"
            )}
          >
            <AlertTriangle className="w-4 h-4" /> {getLabel('Djevelens advokat')}
          </button>
          <button 
            onClick={() => { setSensorOption('feedback'); setIsDevilAdvocate(false); }}
            disabled={!isYearly}
            className={cn(
              "flex-1 min-w-[150px] py-2.5 rounded-lg text-sm font-bold transition-all",
              sensorOption === 'feedback' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700",
              !isYearly && "opacity-50 cursor-not-allowed text-[10px]"
            )}
          >
            {getLabel('Hjelp med tilbakemelding')}
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">1. Last opp PDF eller lim inn tekst</label>
              <div className="flex p-0.5 bg-slate-100 rounded-lg self-start sm:self-auto">
                <button 
                  onClick={() => setSensorUploadMode('text')}
                  disabled={!isYearly}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", sensorUploadMode === 'text' ? "bg-white shadow-sm text-slate-900" : "text-slate-500", !isYearly && "opacity-50 cursor-not-allowed")}
                >
                  Tekst
                </button>
                <button 
                  onClick={() => setSensorUploadMode('file')}
                  disabled={!isYearly}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", sensorUploadMode === 'file' ? "bg-white shadow-sm text-slate-900" : "text-slate-500", !isYearly && "opacity-50 cursor-not-allowed")}
                >
                  PDF
                </button>
              </div>
            </div>

            {sensorUploadMode === 'text' ? (
              <AiTextRewriter 
                value={sensorInput}
                onChange={(val) => setSensorInput(val)}
                placeholder={isGuest ? "🔒 Logg inn for å bruke" : (!isYearly ? "🔒 Krever Årsabonnement" : "Lim inn teksten du vil at sensoren skal vurdere her...")}
                className="h-40"
                disabled={!isYearly}
              />
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all group",
                sensorFile ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                !isYearly && "opacity-50 cursor-not-allowed"
              )}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {sensorFile ? (
                    <>
                      <FileCheck className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-sm text-emerald-700 font-medium">{sensorFile.name} ({formatBytes(sensorFile.size)})</p>
                      <p className="text-[10px] text-emerald-600 mt-1">Klikk for å bytte fil</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                      <p className="text-sm text-slate-500 font-medium">{getLabel('Last opp dokument for analyse')}</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF eller Word (.docx) støttes</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.docx"
                  onChange={(e) => setSensorFile(e.target.files?.[0] || null)}
                  disabled={!isYearly}
                />
              </label>
            )}
          </div>

          {sensorOption === 'feedback' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">2. Lim inn sensors tilbakemelding</label>
              <AiTextRewriter 
                value={teacherFeedback}
                onChange={(val) => setTeacherFeedback(val)}
                placeholder="Lim inn tilbakemeldingen du har fått fra din veileder eller sensor her..."
                className="h-40"
                disabled={!isYearly}
              />
            </motion.div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={(sensorUploadMode === 'file' && !sensorFile) || (sensorUploadMode === 'text' && !sensorInput.trim()) || (sensorOption === 'feedback' && !teacherFeedback.trim()) || isEvaluating || !isYearly}
            className={cn(
              "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg",
              isEvaluating ? "bg-slate-100 text-slate-400" : (isYearly ? "bg-red-600 text-white hover:bg-red-700 shadow-red-100" : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none")
            )}
          >
            {isEvaluating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyserer...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {getLabel('Analyser med Gemini Pro')}</>
            )}
          </button>
        </div>
      </div>

        {/* Empty State for Sensor */}
        {!evaluationResult && !isEvaluating && (
          <div className="mt-12 py-12 text-center space-y-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Ingen analyse ennå</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">Last opp en PDF eller lim inn tekst for å starte en fiktiv vurdering av din oppgave.</p>
            </div>
          </div>
        )}
      
      {evaluationResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {sensorOption === 'evaluation' ? (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-light p-2 rounded-lg">
                    <Sparkles className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Fiktiv vurdering fra sensor</h3>
                </div>
                <button 
                  onClick={() => copyToClipboard(evaluationResult as string, 'sensor-result')}
                  className={cn(
                    "p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center gap-2 text-xs font-bold",
                    copiedId === 'sensor-result' && "text-emerald-500 border-emerald-100 bg-emerald-50"
                  )}
                >
                  {copiedId === 'sensor-result' ? <><Check className="w-4 h-4" /> Kopiert!</> : <><Copy className="w-4 h-4" /> Kopier svar</>}
                </button>
              </div>
              
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                <ReactMarkdown>{evaluationResult as string}</ReactMarkdown>
              </div>
              
                

              <div className="mt-8 bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Viktig:</strong> Denne sensuren er generert av en AI og er kun veiledende. Den faktiske karakteren settes av dine sensorer ved ditt studiested. Bruk denne tilbakemeldingen til å forbedre oppgaven før endelig innlevering.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-light p-2 rounded-lg">
                    <Sparkles className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Veiledning basert på tilbakemelding</h3>
                </div>
                <button 
                  onClick={() => copyToClipboard(evaluationResult as string, 'sensor-result')}
                  className={cn(
                    "p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center gap-2 text-xs font-bold",
                    copiedId === 'sensor-result' && "text-emerald-500 border-emerald-100 bg-emerald-50"
                  )}
                >
                  {copiedId === 'sensor-result' ? <><Check className="w-4 h-4" /> Kopiert!</> : <><Copy className="w-4 h-4" /> Kopier svar</>}
                </button>
              </div>
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                <ReactMarkdown>{evaluationResult as string}</ReactMarkdown>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Dyp plagiat- og KI-sjekk (Eksklusivt Årsabonnement) */}
      <div className={cn(
        "mt-8 p-8 rounded-3xl border-2 transition-all",
        isYearly
          ? "bg-white border-primary/20 shadow-sm" 
          : "bg-slate-50 border-slate-200 opacity-80"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", isYearly ? "bg-primary-light" : "bg-slate-200")}>
              <ShieldCheck className={cn("w-5 h-5", isYearly ? "text-primary" : "text-slate-400")} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Dyp plagiat- og KI-sjekk</h3>
              <p className="text-sm text-slate-500">Analyser teksten for språklig integritet og potensielle "røde flagg".</p>
            </div>
          </div>
          {!isYearly && (
            <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Krever Årsabonnement
            </span>
          )}
        </div>

        {!isYearly ? (
          <button 
            onClick={() => setActiveTab('pricing')}
            className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-primary" /> {getLabel('Oppgrader for dyp plagiat-sjekk')}
          </button>
        ) : (
          <div className="space-y-6">
            {plagiarismError && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-shake">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {plagiarismError}
              </div>
            )}

            {!plagiarismResult && !isCheckingPlagiarism ? (
              <button 
                onClick={handlePlagiarismCheck}
                disabled={!(pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly')}
                className={pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly'
                  ? "w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  : "w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all flex items-center justify-center gap-2 cursor-not-allowed"}
              >
                {pricingTier === 'semester' || pricingTier === 'preview' || pricingTier === 'yearly' ? (
                  <><ShieldCheck className="w-5 h-5" /> Kjør integritetssjekk nå</>
                ) : (
                  <><Lock className="w-5 h-5" /> 🔒 Krever Semester-pakka</>
                )}
              </button>
            ) : isCheckingPlagiarism ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-[0.2em]">Analyserer tekstens integritet...</p>
                <button 
                  disabled
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" /> Analyserer tekst...
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                  <ReactMarkdown>{plagiarismResult}</ReactMarkdown>
                </div>
                <button 
                  onClick={() => {
                    setPlagiarismResult('');
                    setPlagiarismError(null);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                >
                  Kjør ny sjekk
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
