import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, FileText, AlertCircle } from 'lucide-react';
import { extractTextFromPdf } from '../../../lib/pdfUtils';
import { extractTextFromDocx } from '../../../lib/docxUtils';

interface ChatInputProps {
  onSendMessage: (text: string, fileContext?: string, fileName?: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  isLoading,
  placeholder 
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [fileContext, setFileContext] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autofokus på input-feltet når komponenten lastes inn
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsExtracting(true);
    setFileError(null);
    setFileContext('');

    try {
      let extractedText = '';
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        extractedText = await extractTextFromPdf(file);
      } else if (lowerName.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        extractedText = await extractTextFromDocx(file);
      } else {
        // Fallback for plain text
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        throw new Error('Dokumentet inneholder ingen lesbar tekst.');
      }

      setFileContext(extractedText);
    } catch (error: any) {
      console.error('Kunne ikke lese filen:', error);
      setFileError(error?.message || 'Kunne ikke hente tekst fra filen.');
      setTimeout(() => {
        removeFile();
      }, 3500);
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFileContext('');
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading && !isExtracting) {
      onSendMessage(inputText, fileContext, attachedFile?.name);
      setInputText('');
      removeFile();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Dokumentvedlegg-status */}
      {attachedFile && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3.5 py-1.5 rounded-xl w-fit border border-blue-200 text-xs animate-in slide-in-from-bottom-2 shadow-xs">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold truncate max-w-[240px]">{attachedFile.name}</span>
          
          {isExtracting ? (
            <span className="text-[11px] text-blue-600 font-medium animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Leser...
            </span>
          ) : (
            <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              Klar
            </span>
          )}

          <button 
            type="button"
            onClick={removeFile}
            className="ml-1.5 p-0.5 text-blue-400 hover:text-blue-800 transition-colors rounded-md cursor-pointer hover:bg-blue-100"
            title="Fjern vedlegg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {fileError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{fileError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3 items-center">
        {/* Skjult filvelger */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.docx,.doc,.txt" 
          className="hidden" 
        />

        {/* Bindersknapp for opplasting */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isExtracting || attachedFile !== null}
          className="p-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-100 hover:text-blue-600 transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 active:scale-95"
          title="Legg ved PDF eller Word-dokument (.pdf, .docx)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading || isExtracting}
          placeholder={
            isLoading 
              ? "BLU-hjelperen tenker..." 
              : isExtracting 
              ? "Leser dokumentet..." 
              : attachedFile 
              ? `Still et spørsmål om ${attachedFile.name}...` 
              : (placeholder || "Skriv inn ditt spørsmål her...")
          }
          className="flex-1 p-3.5 md:p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all shadow-xs text-slate-800 text-sm disabled:opacity-50 disabled:bg-slate-100"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || isExtracting}
          className="px-6 md:px-8 py-3.5 md:py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-blue-600 flex items-center justify-center min-w-[100px] md:min-w-[120px] text-sm cursor-pointer shadow-xs shrink-0"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sender...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send
            </span>
          )}
        </button>
      </form>
      <div className="text-center text-[11px] text-slate-400">
        BLU-hjelperen kan gjøre feil. Sjekk alltid viktig informasjon mot faglitteratur og Rammeplanen.
      </div>
    </div>
  );
}

export { ChatInput };
