"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface ProcessingContextType {
  processingIds: Record<string, boolean>;
  setProcessing: (id: string, isProcessing: boolean) => void;
  isProcessing: (id: string) => boolean;
  withProcessing: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  const setProcessing = useCallback((id: string, isProcessing: boolean) => {
    setProcessingIds(prev => ({ ...prev, [id]: isProcessing }));
  }, []);

  const isProcessing = useCallback((id: string) => {
    return !!processingIds[id];
  }, [processingIds]);

  const withProcessing = useCallback(async <T,>(id: string, fn: () => Promise<T>): Promise<T> => {
    setProcessing(id, true);
    try {
      return await fn();
    } finally {
      setProcessing(id, false);
    }
  }, [setProcessing]);

  return (
    <ProcessingContext.Provider value={{ processingIds, setProcessing, isProcessing, withProcessing }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error("useProcessing must be used within a ProcessingProvider");
  }
  return context;
}
