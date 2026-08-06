"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

export type TabKey = "books" | "all-tickets" | "insights" | "rooms" | "wallet" | "account";

export interface PageState {
  type: string;
  [key: string]: any;
}

interface NavigationContextType {
  activeTab: TabKey;
  globalStack: TabKey[];
  tabStacks: Record<TabKey, PageState[]>;
  selectTab: (tab: TabKey) => void;
  pushPage: (page: PageState) => void;
  pop: () => void;
  canPop: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const INITIAL_TAB_STACKS: Record<TabKey, PageState[]> = {
  books: [{ type: "books" }],
  "all-tickets": [{ type: "all-tickets" }],
  insights: [{ type: "insights" }],
  rooms: [{ type: "rooms" }],
  wallet: [{ type: "wallet" }],
  account: [{ type: "account" }],
};

const STORAGE_GLOBAL = "kh_global_stack";
const STORAGE_TABS = "kh_tab_stacks";

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [globalStack, setGlobalStack] = useState<TabKey[]>(["books"]);
  const [tabStacks, setTabStacks] = useState<Record<TabKey, PageState[]>>(INITIAL_TAB_STACKS);

  // Keep refs in sync to avoid stale closures in callbacks
  const globalStackRef = useRef(globalStack);
  const tabStacksRef = useRef(tabStacks);

  useEffect(() => {
    globalStackRef.current = globalStack;
  }, [globalStack]);

  useEffect(() => {
    tabStacksRef.current = tabStacks;
  }, [tabStacks]);

  // Load from localStorage on mount (defaults used for SSR/hydration, then restored)
  useEffect(() => {
    try {
      const savedGlobal = localStorage.getItem(STORAGE_GLOBAL);
      const savedTabs = localStorage.getItem(STORAGE_TABS);
      if (savedGlobal) setGlobalStack(JSON.parse(savedGlobal));
      if (savedTabs) setTabStacks(JSON.parse(savedTabs));
    } catch (e) {
      console.error("Failed to load navigation state", e);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_GLOBAL, JSON.stringify(globalStack));
      localStorage.setItem(STORAGE_TABS, JSON.stringify(tabStacks));
    } catch (e) {
      console.error("Failed to save navigation state", e);
    }
  }, [globalStack, tabStacks]);

  const activeTab = globalStack[globalStack.length - 1] || "books";
  const currentTabStack = tabStacks[activeTab] || [INITIAL_TAB_STACKS[activeTab][0]];
  const canPop = globalStack.length > 1 || currentTabStack.length > 1;

  const selectTab = useCallback((tab: TabKey) => {
    setGlobalStack((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      if (prev.includes(tab)) {
        return [...prev.filter((t) => t !== tab), tab];
      }
      return [...prev, tab];
    });
  }, []);

  const pushPage = useCallback((page: PageState) => {
    const current = globalStackRef.current[globalStackRef.current.length - 1] || "books";
    setTabStacks((prevTabs) => ({
      ...prevTabs,
      [current]: [...(prevTabs[current] || []), page],
    }));
  }, []);

  const pop = useCallback(() => {
    setGlobalStack((prevGlobal) => {
      const currentTab = prevGlobal[prevGlobal.length - 1] || "books";
      const currentTabStack = tabStacksRef.current[currentTab] || [INITIAL_TAB_STACKS[currentTab][0]];

      if (currentTabStack.length > 1) {
        // Pop from active tab's stack
        setTabStacks((prevTabs) => ({
          ...prevTabs,
          [currentTab]: prevTabs[currentTab].slice(0, -1),
        }));
        return prevGlobal;
      } else {
        // Current tab's stack is at base — pop from global stack to switch tab
        if (prevGlobal.length > 1) {
          return prevGlobal.slice(0, -1);
        }
        return prevGlobal;
      }
    });
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        globalStack,
        tabStacks,
        selectTab,
        pushPage,
        pop,
        canPop,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
