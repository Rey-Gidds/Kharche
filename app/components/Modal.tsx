"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import BottomSheet from "./BottomSheet";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  sheet?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, sheet }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (isMobile || sheet) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="relative bg-[var(--surface)] w-full max-w-lg rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-playfair font-bold text-[var(--foreground)]">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--muted)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
