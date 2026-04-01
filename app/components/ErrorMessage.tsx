"use client";

import React from "react";

interface Action {
  label: string;
  onClick: () => void;
}

interface ErrorMessageProps {
  /**
   * The primary headline of the error message.
   */
  title: string;
  /**
   * Detailed explanation or context of what went wrong.
   */
  message: string;
  /**
   * Optional primary action (e.g. "Try Again" or "Return Home").
   */
  action?: Action;
  /**
   * Visual severity or type of message.
   * @default "error"
   */
  variant?: "error" | "warning" | "info" | "success";
  /**
   * If true, it adds a subtle backdrop or occupies more screen space.
   */
  fullHeight?: boolean;
  /**
   * If true, renders a smaller, inline version suitable for forms or sidebars.
   */
  compact?: boolean;
}

/**
 * A generalized, premium error message component designed to handle 
 * and display errors gracefully across the application.
 */
export default function ErrorMessage({
  title,
  message,
  action,
  variant = "error",
  fullHeight = false,
  compact = false,
}: ErrorMessageProps) {
  
  // Icon and color mapping based on variant
  const config = {
    error: {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50/50 dark:bg-red-950/20",
      border: "border-red-100 dark:border-red-900/50",
      accent: "bg-red-600 dark:bg-red-400",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      )
    },
    warning: {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
      border: "border-amber-100 dark:border-amber-900/50",
      accent: "bg-amber-600 dark:bg-amber-400",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      )
    },
    info: {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/50 dark:bg-blue-950/20",
      border: "border-blue-100 dark:border-blue-900/50",
      accent: "bg-blue-600 dark:bg-blue-400",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      )
    },
    success: {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      border: "border-emerald-100 dark:border-emerald-900/50",
      accent: "bg-emerald-600 dark:bg-emerald-400",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      )
    }
  }[variant];

  if (compact) {
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
        <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-[var(--foreground)] mb-0.5 tracking-tight font-playfair">{title}</p>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed font-inter">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:underline cursor-pointer"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex items-center justify-center ${fullHeight ? "min-h-[400px]" : "py-8"}`}>
      <div className={`relative max-w-xl w-full mx-auto overflow-hidden rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:shadow-md animate-in fade-in zoom-in-95 duration-500`}>
        {/* Decorative corner accent */}
        <div className={`absolute top-0 left-0 w-1.5 h-full ${config.accent} opacity-80`} />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className={`flex-shrink-0 p-3 rounded-xl bg-white dark:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-sm ${config.color}`}>
            {config.icon}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-playfair font-bold text-[var(--foreground)] mb-2 tracking-tight">
              {title}
            </h2>
            <p className="text-[var(--muted)] text-sm md:text-base leading-relaxed mb-6 font-inter opacity-90">
              {message}
            </p>
            
            {action && (
              <button
                onClick={action.onClick}
                className={`inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer 
                  bg-[var(--accent)] text-[var(--background)] hover:opacity-90 active:scale-95 shadow-sm`}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
