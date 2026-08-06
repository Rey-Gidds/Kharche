"use client";

import { useState } from "react";
import { useNavigation } from "@/context/NavigationContext";
import ExpenseBookList from "./ExpenseBookList";
import ExpenseList from "./ExpenseList";
import ActionFab from "./ActionFab";
import Modal from "./Modal";
import AddExpenseForm from "./AddExpenseForm";
import AddExpenseBookForm from "./AddExpenseBookForm";
import InsightsView from "./InsightsView";
import BottomNav from "./BottomNav";
import { useSession } from "@/lib/auth-client";
import RoomList from "./rooms/RoomList";
import RoomView from "./rooms/RoomView";
import WalletPage from "@/app/me/wallet/page";
import { useSWRConfig } from "swr";

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);

const RoomsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);

export default function Dashboard() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const { data: session } = useSession();
  const { activeTab, tabStacks, selectTab, pushPage, pop, canPop } = useNavigation();
  const { mutate } = useSWRConfig();

  const currentTabStack = tabStacks[activeTab] || [];
  const currentPage = currentTabStack[currentTabStack.length - 1];

  const handleSelectBook = (bookId: string, bookTitle: string, bookCurrency: string) => {
    pushPage({ type: "single-book", id: bookId, title: bookTitle, currency: bookCurrency });
  };

  const handleSelectRoom = (room: any) => {
    pushPage({ type: "room-view", room });
  };

  const handleRoomLeft = () => {
    pop();
    mutate("/api/rooms");
  };

  const navItems = [
    { key: "books" as const, label: "Collections", icon: <BookIcon /> },
    { key: "all-tickets" as const, label: "Journal", icon: <ListIcon /> },
    { key: "insights" as const, label: "Insights", icon: <ChartIcon /> },
    { key: "rooms" as const, label: "Rooms", icon: <RoomsIcon /> },
    { key: "wallet" as const, label: "Wallet", icon: <WalletIcon /> },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-0 md:mt-8 space-y-4 md:space-y-12">
      {/* Navigation / Secondary Header (Desktop Only) */}
      <div className="hidden md:flex items-center gap-6 border-b border-[var(--border)] pb-4 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => selectTab(item.key)}
            className={`pb-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap cursor-pointer ${
              activeTab === item.key
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
            {activeTab === item.key && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <section className="min-h-[200px] md:min-h-[400px]">
        {/* Collections / Books */}
        {(currentPage?.type === "books" || (activeTab === "books" && !currentPage)) && (
          <div className="space-y-6 md:space-y-8">
            <h2 className="hidden md:block text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">Workspaces</h2>
            <ExpenseBookList onSelectBook={handleSelectBook} />
          </div>
        )}

        {/* Single Book */}
        {currentPage?.type === "single-book" && (
          <ExpenseList
            bookId={currentPage.id}
            bookTitle={currentPage.title}
            bookCurrency={currentPage.currency}
            onBack={pop}
          />
        )}

        {/* All Tickets / Journal */}
        {currentPage?.type === "all-tickets" && (
          <ExpenseList onBack={canPop ? pop : undefined} />
        )}

        {/* Insights */}
        {(activeTab === "insights" || currentPage?.type === "insights") && (
          <InsightsView />
        )}

        {/* Rooms */}
        {(activeTab === "rooms" || currentPage?.type === "rooms") && session && (
          <RoomList currentUserId={session.user.id} onSelectRoom={handleSelectRoom} />
        )}

        {/* Room View */}
        {currentPage?.type === "room-view" && currentPage.room && session && (
          <RoomView
            room={currentPage.room}
            currentUserId={session.user.id}
            onBack={pop}
            onLeft={handleRoomLeft}
          />
        )}

        {/* Wallet */}
        {(activeTab === "wallet" || currentPage?.type === "wallet") && (
          <WalletPage onBack={pop} />
        )}
      </section>

      {/* FAB + Modals — only for non-rooms and non-insights views */}
      {activeTab !== "rooms" && activeTab !== "insights" && activeTab !== "wallet" && (
        <>
          <Modal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            title="Record Transaction"
            sheet
          >
          <AddExpenseForm
            bookId={currentPage?.type === "single-book" ? currentPage.id : undefined}
            bookCurrency={currentPage?.type === "single-book" ? currentPage.currency : undefined}
            onSuccess={() => {
              setIsExpenseModalOpen(false);
            }}
          />
          </Modal>

          <Modal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            title="New Collection"
            sheet
          >
            <AddExpenseBookForm
              onSuccess={() => {
                setIsBookModalOpen(false);
              }}
            />
          </Modal>

          <ActionFab
            onAddExpense={() => setIsExpenseModalOpen(true)}
            onAddBook={() => setIsBookModalOpen(true)}
            isInsideBook={currentPage?.type === "single-book"}
          />
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav navItems={navItems} />
    </div>
  );
}
