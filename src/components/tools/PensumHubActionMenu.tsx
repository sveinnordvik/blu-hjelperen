import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Headphones, 
  ArrowRight,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePensumHub, PensumActionType, PensumFileItem } from '../../context/PensumHubContext';

export type PensumHubAction = 'flashcards' | 'quiz' | 'podcast';

interface PensumHubActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedTitles?: string[];
  selectedFilesList?: PensumFileItem[];
  onSelectAction?: (actionType: PensumHubAction) => void;
  onNavigateToTools?: (actionType?: PensumHubAction) => void;
}

export const PensumHubActionMenu: React.FC<PensumHubActionMenuProps> = ({
  isOpen,
  onClose,
  selectedCount,
  selectedTitles = [],
  selectedFilesList = [],
  onSelectAction,
  onNavigateToTools
}) => {
  const navigate = useNavigate();
  const { startPensumAction } = usePensumHub();

  const [selectedCardCount, setSelectedCardCount] = useState<number>(10);

  const handleActionClick = (actionType: PensumHubAction) => {
    console.log("PensumHubActionMenu: handleActionClick triggered for:", actionType);
    
    // Bygg samling av filer som sendes inn i global context
    const filesToStore: PensumFileItem[] = selectedFilesList.length > 0 
      ? selectedFilesList 
      : selectedTitles.map((title, i) => ({
          id: `source-${i}-${Date.now()}`,
          title
        }));

    console.log("PensumHub: startPensumAction kalt med:", actionType, filesToStore, "count:", selectedCardCount);
    try {
        startPensumAction(filesToStore, actionType, selectedCardCount);
        console.log("PensumHub: startPensumAction executed successfully");
    } catch (e) {
        console.error("PensumHub: startPensumAction failed", e);
    }

    if (onSelectAction) {
      onSelectAction(actionType);
    }

    console.log("PensumHub: Closing modal");
    onClose();

    // Naviger direkte til Verktøy-fanen og subfane
    if (onNavigateToTools) {
      console.log("PensumHub: Navigating via onNavigateToTools:", actionType);
      onNavigateToTools(actionType);
    }

    // Send alltid global event for umiddelbar visningsveksling
    window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: actionType } }));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    try {
      navigate(`/student?tab=verktoy&tool=${actionType}`);
    } catch (err) {
      console.warn("Router navigation failed, fallback:", err);
    }
  };

  const actionOptions = [
    {
      id: 'flashcards' as PensumHubAction,
      icon: Layers,
      title: 'Teori-Flashcards',
      subtitle: 'Trekk ut de viktigste begrepene og lag vendbare puggekort.',
      badge: 'Begrepslæring',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50/70 hover:bg-blue-100/60',
      borderColor: 'border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-600 text-white',
      badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'quiz' as PensumHubAction,
      icon: HelpCircle,
      title: 'Eksamens-Quiz (Grill meg!)',
      subtitle: 'Få flervalgsspørsmål og caser basert på teorien.',
      badge: 'Eksamensspurring',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50/70 hover:bg-amber-100/60',
      borderColor: 'border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-600 text-white',
      badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      id: 'podcast' as PensumHubAction,
      icon: Headphones,
      title: 'Pensum-Podden',
      subtitle: 'Lag en lydoppsummering du kan høre på farten.',
      badge: 'Lyd & Lytting',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50/70 hover:bg-emerald-100/60',
      borderColor: 'border-emerald-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-600 text-white',
      badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/90 overflow-hidden my-auto"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all cursor-pointer"
                title="Lukk meny"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Pensum-Hub Generator
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 text-white rounded-full text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-300" /> {selectedCount} {selectedCount === 1 ? 'kilde' : 'kilder'} valgt
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                Hva vil du generere fra disse kildene?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
                Velg hvilket format du ønsker å transformere pensumlitteraturen og notatene dine til.
              </p>

              {/* Antall kort velger */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-300">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Velg antall kort i kortstokken:
                </span>
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
                  {[5, 10, 15, 20, 25, 30].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedCardCount(cnt); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                        selectedCardCount === cnt 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTitles.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Inkluderer:</span>
                  {selectedTitles.slice(0, 3).map((title, idx) => (
                    <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-[11px] truncate max-w-[200px] border border-white/5">
                      {title}
                    </span>
                  ))}
                  {selectedTitles.length > 3 && (
                    <span className="text-[11px] text-indigo-300 font-bold">
                      +{selectedTitles.length - 3} til
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Cards */}
            <div className="p-6 sm:p-8 space-y-4 bg-slate-50/50">
              <div className="grid grid-cols-1 gap-3.5">
                {actionOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleActionClick(opt.id);
                      }}
                      className={cn(
                        "w-full text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:scale-[1.015] hover:shadow-lg active:scale-[0.99]",
                        opt.bgColor,
                        opt.borderColor
                      )}
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-110", opt.iconBg)}>
                          <Icon className="w-6 h-6 pointer-events-none" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-900 transition-colors">
                              {opt.title}
                            </h3>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", opt.badgeStyle)}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                            {opt.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:text-indigo-800 shrink-0 self-end sm:self-center bg-white px-3 py-2 rounded-xl shadow-2xs border border-slate-200 group-hover:border-indigo-300">
                        <span>Generer</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 pointer-events-none" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer info */}
              <div className="pt-2 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Teksten analyseres med APA 7-presisjon i henhold til Rammeplanen for barnehagen.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
