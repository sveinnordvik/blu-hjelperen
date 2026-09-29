import React, { useState } from 'react';
import { Quote, Copy, Check, Loader2, Wand2, Lock, Sparkles, BookOpen } from 'lucide-react';
import { generateAutoAPA } from '../services/geminiService';

const QUICK_EXAMPLES = [
  { label: 'Rammeplanen', val: 'Kunnskapsdepartementet. (2017). Rammeplan for barnehagen: Forskrift om rammeplan for barnehagens innhold og oppgaver. Udir.' },
  { label: 'Barnehageloven', val: 'Lov om barnehager (barnehageloven). (2005). Lov om barnehager (LOV-2005-06-17-64). Lovdata. https://lovdata.no/dokument/NL/lov/2005-06-17-64' },
  { label: 'Berit Bae (2012)', val: 'Bae, B. (Red.). (2012). Medvirkning i barnehagen: Potensialer i det uforutsette. Fagbokforlaget.' },
  { label: 'Glaser (2018)', val: 'Glaser, V. (2018). Foreldresamarbeid: Barnehagen i et mangfoldig samfunn (2. utg.). Universitetsforlaget.' }
];

export function AutoAPA({ 
  pricingTier = 'free',
  onUpgrade 
}: { 
  pricingTier?: string;
  onUpgrade?: () => void;
}) {
  const isLocked = pricingTier === 'free';
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (customText?: string) => {
    const textToUse = customText || input;
    if (isLocked) {
      if (onUpgrade) onUpgrade();
      return;
    }
    if (!textToUse.trim()) return;
    setIsLoading(true);
    setResult('');
    
    try {
      const formattedRef = await generateAutoAPA(textToUse);
      setResult(formattedRef);
    } catch (error: any) {
      setResult("Feil: " + (error?.message || "Klarte ikke å formatere kilden."));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto w-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Quote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Auto-APA 7</h2>
              <span className="text-xs text-slate-500 font-medium">· Premium & Semester</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Lim inn URL, forfatter, boktittel eller lovverk – få ferdig APA 7-referanse.</p>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              Auto-APA 7 krever <strong>Premium Måned</strong> eller <strong>Semester-pakka</strong> for ubegrenset kildeformatering.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shrink-0 transition-all cursor-pointer whitespace-nowrap"
            >
              Oppgrader
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Hurtigvalg / Eksempler */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hurtigeksempler</label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  setInput(ex.val);
                  if (!isLocked) handleGenerate(ex.val);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? "Oppgrader for å bruke Auto-APA..." : "F.eks: https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/ eller 'Glaser, V. (2018)...'"}
          className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
        />
        
        <button 
          onClick={() => handleGenerate()}
          disabled={isLocked ? false : (!input.trim() || isLoading)}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer text-sm"
        >
          {isLocked ? (
            <>
              <Sparkles className="w-4 h-4 text-amber-400" />
              Lås opp med Premium
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Formaterer i henhold til APA 7...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generer APA 7-kilde
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl relative group">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5">Ferdig formatert referanse</p>
            <p className="text-sm text-slate-900 pr-10 whitespace-pre-wrap leading-relaxed font-sans">{result}</p>
            <button 
              onClick={copyToClipboard}
              className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-xs border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              title="Kopier til utklippstavle"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoAPA;
