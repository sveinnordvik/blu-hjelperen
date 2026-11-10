import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PensumActionType = 'flashcards' | 'quiz' | 'podcast' | null;

export interface PensumFileItem {
  id: string;
  title: string;
  content?: string;
  fileType?: string;
  category?: string;
}

interface PensumHubContextType {
  activePensumFiles: PensumFileItem[];
  pendingAction: PensumActionType;
  requestedCardCount: number;
  startPensumAction: (files: PensumFileItem[], actionType: PensumActionType, cardCount?: number) => void;
  setPendingAction: (actionType: PensumActionType) => void;
  setRequestedCardCount: (count: number) => void;
  clearPensumAction: () => void;
}

const PensumHubContext = createContext<PensumHubContextType | undefined>(undefined);

export const PensumHubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePensumFiles, setActivePensumFiles] = useState<PensumFileItem[]>([]);
  const [pendingAction, setPendingAction] = useState<PensumActionType>(null);
  const [requestedCardCount, setRequestedCardCount] = useState<number>(10);

  const startPensumAction = (files: PensumFileItem[], actionType: PensumActionType, cardCount?: number) => {
    console.log("PensumHubContext: Starting action", actionType, "with files:", files, "count:", cardCount);
    setActivePensumFiles(files);
    setPendingAction(null); // Fullført gateway-valg, nullstiller ventende handling
    if (cardCount) {
      setRequestedCardCount(cardCount);
    }
  };

  const clearPensumAction = () => {
    setActivePensumFiles([]);
    setPendingAction(null);
  };

  return (
    <PensumHubContext.Provider
      value={{
        activePensumFiles,
        pendingAction,
        requestedCardCount,
        startPensumAction,
        setPendingAction,
        setRequestedCardCount,
        clearPensumAction
      }}
    >
      {children}
    </PensumHubContext.Provider>
  );
};

export const usePensumHub = () => {
  const context = useContext(PensumHubContext);
  if (!context) {
    return {
      activePensumFiles: [],
      pendingAction: null,
      requestedCardCount: 10,
      startPensumAction: (files: PensumFileItem[], actionType: PensumActionType, cardCount?: number) => {
        console.log("PensumHub Context Fallback:", actionType, files, cardCount);
      },
      setPendingAction: (actionType: PensumActionType) => {},
      setRequestedCardCount: (count: number) => {},
      clearPensumAction: () => {}
    };
  }
  return context;
};
