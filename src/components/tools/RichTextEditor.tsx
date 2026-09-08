import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Maximize2, Minimize2, FolderPlus, FileText, FileDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface RichTextEditorProps {
  editorContext: { id: string; name: string };
  initialNotes: string;
  onChange: (notes: string) => void;
  onSaveToFolder?: (notes: string) => void; 
  onExportPdf?: () => void;
  onExportWord?: () => void;
}

export const RichTextEditor = React.memo(({ editorContext, initialNotes, onChange, onSaveToFolder, onExportPdf, onExportWord }: RichTextEditorProps) => {
  const [sharedNotes, setSharedNotes] = useState(initialNotes);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSharedNotes(initialNotes);
    if (editorRef.current && editorRef.current.innerHTML !== initialNotes) {
      editorRef.current.innerHTML = initialNotes;
    }
  }, [editorContext.id, initialNotes]);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const notifyChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setSharedNotes(content);
      onChange(content);
    }
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {};

  const handleEditorBlur = () => {
    notifyChange();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key.length === 1 && e.key.match(/[a-zæøå]/)) {
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      if (node && node.nodeType === 3) {
        const text = node.nodeValue || '';
        const offset = selection?.anchorOffset || 0;
        if (offset >= 2 && text.substring(offset - 2, offset) === '. ') {
          e.preventDefault();
          document.execCommand('insertText', false, e.key.toUpperCase());
        }
      }
    }
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Notater for ${editorContext.name}`, 20, 20);
    doc.setFontSize(12);
    const plainText = editorRef.current?.innerText || sharedNotes.replace(/<[^>]+>/g, '');
    const lines = doc.splitTextToSize(plainText, 170);
    doc.text(lines, 20, 30);
    doc.save(`Notater_${editorContext.id}.pdf`);
  };

  const exportToWord = async () => {
    const plainText = editorRef.current?.innerText || sharedNotes.replace(/<[^>]+>/g, '');
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: `Notater for ${editorContext.name}`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: '' }),
          ...plainText.split('\n').map(line => new Paragraph({ text: line }))
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Notater_${editorContext.id}.docx`);
  };

  return (
    <>
    <div className={cn("flex flex-col border border-slate-200 bg-white shadow-sm overflow-hidden", isFullscreen ? "fixed inset-4 z-[60] rounded-2xl" : "rounded-3xl h-full min-h-[400px]")}>
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center justify-between flex-wrap gap-2 rounded-t-3xl">
        <div className="flex items-center gap-1">
          <button onClick={() => handleFormat('bold')} className="p-1.5 hover:bg-slate-200 rounded font-bold text-slate-700"><b>B</b></button>
          <button onClick={() => handleFormat('italic')} className="p-1.5 hover:bg-slate-200 rounded italic text-slate-700"><i>I</i></button>
          <div className="w-px h-5 bg-slate-300 mx-1"></div>
          <button onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 text-sm flex items-center gap-1">
            <span className="font-bold">•</span> Liste
          </button>
          <button onClick={() => handleFormat('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 text-sm flex items-center gap-1">
            <span className="font-bold">1.</span> Liste
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1"></div>
          <button onClick={() => handleFormat('formatBlock', 'H1')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 text-sm font-bold">H1</button>
          <button onClick={() => handleFormat('formatBlock', 'H2')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 text-sm font-bold">H2</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-slate-200 rounded text-slate-600">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div 
        ref={editorRef}
        className={cn("p-4 outline-none overflow-y-auto custom-scrollbar flex-1", isFullscreen ? "text-lg" : "text-sm", "min-h-[300px]")}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onBlur={handleEditorBlur}
        onKeyDown={handleEditorKeyDown}
        dangerouslySetInnerHTML={{ __html: sharedNotes }}
      />
      <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-emerald-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Autolagret (ved klikk utenfor)
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onSaveToFolder && (
            <button onClick={() => { notifyChange(); onSaveToFolder(editorRef.current?.innerHTML || ''); }} className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-slate-600 hover:text-emerald-700 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
              <FolderPlus className="w-3.5 h-3.5" /> Lagre i Gruppemappe
            </button>
          )}
          <button onClick={onExportPdf || exportToPdf} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-red-600 border border-slate-200 bg-white px-2 py-1.5 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={onExportWord || exportToWord} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 border border-slate-200 bg-white px-2 py-1.5 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-colors">
            <FileDown className="w-3.5 h-3.5" /> Word
          </button>
        </div>
      </div>
    </div>
    {isFullscreen && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsFullscreen(false)} />
    )}
    </>
  );
});
