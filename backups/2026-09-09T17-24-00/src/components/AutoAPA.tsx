import React, { useState } from 'react';
import { Quote, Copy, Check, Loader2, Wand2, Lock, Sparkles } from 'lucide-react';
import { generateAutoAPA } from '../services/geminiService';

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

  const handleGenerate = async () => {
    if (isLocked) {
      if (onUpgrade) onUpgrade();
      return;
    }
    if (!input.trim()) return;
    setIsLoading(true);
    setResult('');
    
    try {
      const formattedRef = await generateAutoAPA(input);
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
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto w-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary-light p-3 rounded-2xl">
            <Quote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Auto-APA 7</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Premium & Semester
              </span>
            </div>
            <p className="text-sm text-slate-500">Lim inn URL, forfatter eller boktittel – få ferdig referanse.</p>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-700 shrink-0" />
            <p className="text-xs text-amber-900 font-medium">
              Auto-APA 7 krever <strong>Premium Måned</strong> eller <strong>Semester-pakka</strong> for automatisk kildeformatering.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shrink-0 transition-all cursor-pointer"
            >
              Oppgrader
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? "Oppgrader til Premium Måned eller Semester-pakka for å bruke Auto-APA..." : "F.eks: https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/ eller 'Glaser, V. (2018)...'"}
          className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
        
        <button 
          onClick={handleGenerate}
          disabled={isLocked ? false : (!input.trim() || isLoading)}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLocked ? (
            <>
              <Sparkles className="w-5 h-5 text-amber-400" />
              Lås opp med Premium (129,-/mnd)
            </>
          ) : isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generer referanse
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl relative group">
            <p className="text-sm font-medium text-slate-800 pr-10 whitespace-pre-wrap">{result}</p>
            <button 
              onClick={copyToClipboard}
              className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
              title="Kopier til utklippstavle"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoAPA;
