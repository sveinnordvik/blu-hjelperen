import React, { useState } from 'react';
import { Quote, Copy, Check, Loader2, Wand2 } from 'lucide-react';
import { generateAutoAPA } from '../services/geminiService';

export function AutoAPA() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
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
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary-light p-3 rounded-2xl">
          <Quote className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Auto-APA 7</h2>
          <p className="text-sm text-slate-500">Lim inn URL, forfatter eller boktittel – få ferdig referanse.</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="F.eks: https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/ eller 'Glaser, V. (2018)...'"
          className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        
        <button 
          onClick={handleGenerate}
          disabled={!input.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          Generer referanse
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
