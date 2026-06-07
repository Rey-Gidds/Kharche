"use client";

import { useState, useRef, useEffect } from "react";
import { useEncryption } from "@/hooks/useEncryption";
import EncryptionLockIndicator from "./EncryptionLockIndicator";
import EncryptionSetupModal from "./EncryptionSetupModal";
import EncryptionUnlockModal from "./EncryptionUnlockModal";

/**
 * Clicking cycles through: setup → unlock → lock depending on current state.
 */
export default function EncryptionLockSlot() {
  const { isEnabled, isUnlocked } = useEncryption();
  const [showMenu, setShowMenu] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  const handleToggle = () => {
    if (!isEnabled) {
      // Off → turn on: open setup
      setShowSetup(true);
    } else if (!isUnlocked) {
      // Locked → unlock
      setShowUnlock(true);
    } else {
      // Unlocked → show menu with lock/disable options
      setShowMenu(!showMenu);
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        onClick={handleToggle}
        className="relative inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-[var(--border)]/50 transition-colors cursor-pointer"
        title={
          !isEnabled ? "Encryption off — click to enable"
          : !isUnlocked ? "Encryption locked — click to unlock"
          : "Encryption active"
        }
      >
        <EncryptionLockIndicator isEnabled={isEnabled} isUnlocked={isUnlocked} />

        {/* Minimal toggle track */}
        <span
          className={`relative w-7 h-3.5 rounded-full transition-colors ${
            isEnabled ? "bg-emerald-500/60" : "bg-[var(--border)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-3.5" : "translate-x-0"
            }`}
          />
        </span>
      </button>

      {/* Dropdown menu for active state */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-[100] py-1 animate-in fade-in slide-in-from-top-1 duration-150"
        >
        </div>
      )}

      <EncryptionSetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
      <EncryptionUnlockModal
        isOpen={showUnlock}
        onUnlocked={() => setShowUnlock(false)}
        onLocked={() => setShowUnlock(false)}
      />
    </span>
  );
}
