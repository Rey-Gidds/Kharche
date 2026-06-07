"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SmartCategoryInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function SmartCategoryInput({
  value,
  onChange,
  placeholder = "e.g. Shopping",
  className = "w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)]",
  required = false,
}: SmartCategoryInputProps) {
  const [focused, setFocused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch top 10 categories for instant suggestion display
  const { data: topCategories } = useSWR<{ displayName: string; normalizedName: string }[]>(
    "/api/categories",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Debounce the search value — SWR handles dedup & caching automatically
  useEffect(() => {
    if (value.trim().length < 2) {
      setDebouncedValue("");
      return;
    }
    const timer = setTimeout(() => setDebouncedValue(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);

  // SWR handles the search request with automatic dedup, caching, and revalidation
  const { data: searchResults, isValidating: searchLoading } = useSWR<{ displayName: string; normalizedName: string }[]>(
    debouncedValue ? `/api/categories?q=${encodeURIComponent(debouncedValue)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full font-inter">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className={`${className} pr-8`}
          required={required}
        />
        
        {/* Minimal Search Button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Browse All Categories"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      {/* Suggestion & Search Dropdown Overlay */}
      {focused && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
          
          {/* 1. Show Debounced Autocomplete Search Results */}
          {value.trim().length >= 2 ? (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                {searchLoading ? "Searching..." : searchResults && searchResults.length > 0 ? "Matching Categories" : "No Matches Found"}
              </p>
              
              {searchResults && searchResults.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {searchResults.map((cat) => (
                    <button
                      key={cat.normalizedName}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        onChange(cat.displayName);
                        setFocused(false);
                      }}
                      className="px-2.5 py-1 bg-[var(--background)] hover:bg-[var(--accent)] hover:text-[var(--background)] border border-[var(--border)] rounded-full text-xs font-semibold transition-all cursor-pointer"
                    >
                      {cat.displayName}
                    </button>
                  ))}
                </div>
              ) : !searchLoading ? (
                <p className="text-xs text-[var(--muted)] italic">Typing "{value}" will create a new category.</p>
              ) : null}
            </div>
          ) : (
            
            // 2. Default: Show Top 10 Most Frequently Used Category Suggestions
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                Frequently Used
              </p>
              {topCategories && topCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {topCategories.map((cat) => (
                    <button
                      key={cat.normalizedName}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        onChange(cat.displayName);
                        setFocused(false);
                      }}
                      className="px-2.5 py-1 bg-[var(--background)] hover:bg-[var(--accent)] hover:text-[var(--background)] border border-[var(--border)] rounded-full text-xs font-semibold transition-all cursor-pointer"
                    >
                      {cat.displayName}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--muted)] italic">No custom categories created yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightweight Browse Categories Modal */}
      {showModal && (
        <BrowseCategoriesModal
          onSelect={(val) => {
            onChange(val);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ────────── Subcomponent: BrowseCategoriesModal ────────── */
interface BrowseModalProps {
  onSelect: (val: string) => void;
  onClose: () => void;
}

function BrowseCategoriesModal({ onSelect, onClose }: BrowseModalProps) {
  const [search, setSearch] = useState("");
  
  // Fetch ALL categories for the history modal list
  const { data: allCategories } = useSWR<{ displayName: string; normalizedName: string; usageCount: number }[]>(
    "/api/categories?all=true",
    fetcher
  );

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Filter category list based on local text search
  const filtered = allCategories
    ? allCategories.filter((c) =>
        c.displayName.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal Dialog Content */}
      <div className="relative bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl w-full max-w-sm flex flex-col max-h-[70vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h4 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">All Categories</h4>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 hover:bg-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Local Search Input inside Modal */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--background)]/30 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none text-[var(--foreground)]"
              autoFocus
            />
            <svg 
              className="absolute left-2.5 text-[var(--muted)]" 
              xmlns="http://www.w3.org/2000/svg" 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {!allCategories ? (
            <div className="py-6 text-center text-xs text-[var(--muted)]">Loading categories...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)] italic">No categories found.</div>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat.normalizedName}
                type="button"
                onClick={() => onSelect(cat.displayName)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--border)] transition-colors flex items-center justify-between text-xs cursor-pointer group"
              >
                <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)]">
                  {cat.displayName}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                  {cat.usageCount} {cat.usageCount === 1 ? "use" : "uses"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
