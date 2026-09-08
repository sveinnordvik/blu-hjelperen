import React, { useState } from 'react';
import { PenTool, Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { improveAcademicWriting } from '../services/geminiService';
import AIWarning from './AIWarning';

export function LanguageBot() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Akademisk finpuss');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImprove = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResult('');
    
    try {
      const response = await improveAcademicWriting(input, mode);
      setResult(response);
    } catch (error: any) {
      setResult("Feil: " + (error?.message || "Kunne ikke forbedre teksten akkurat nå."));
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
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary-light p-3 rounded-2xl">
          <PenTool className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Språkstøtte</h2>
          <p className="text-sm text-slate-500">Lim inn tekst for å heve det akademiske nivået.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
          {['Akademisk finpuss', 'Korrektur', 'Omformulering'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === m ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Lim inn teksten du vil forbedre her (maks 500 ord av gangen for best resultat)..."
          className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        
        <button 
          onClick={handleImprove}
          disabled={!input.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50 shadow-md shadow-primary/20"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Forbedre tekst
        </button>

        {result && (
          <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl relative group">
            <button 
              onClick={copyToClipboard}
              className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
              title="Kopier til utklippstavle"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
            <div className="whitespace-pre-wrap text-sm text-slate-700 font-medium pr-10 leading-relaxed">
              {result}
            </div>
          </div>
        )}

        <AIWarning compact={true} dismissible={true} />
      </div>
    </div>
  );
}

export default LanguageBot;
