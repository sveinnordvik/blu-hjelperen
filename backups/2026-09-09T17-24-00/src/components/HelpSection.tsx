import React, { useState } from 'react';
import { HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpSectionProps {
  title: string;
  content: string;
}

export const HelpSection: React.FC<HelpSectionProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover transition-colors uppercase tracking-widest"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Hva er dette?
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="ap-auto-122-1" 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-primary-light/30 rounded-2xl text-[11px] text-primary-dark leading-relaxed font-medium border border-primary-light italic">
              <strong>{title}:</strong> {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
