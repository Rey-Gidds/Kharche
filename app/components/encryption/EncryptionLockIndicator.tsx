"use client";

interface EncryptionLockIndicatorProps {
  isEnabled: boolean;
  isUnlocked: boolean;
}

export default function EncryptionLockIndicator({ isEnabled, isUnlocked }: EncryptionLockIndicatorProps) {
  if (!isEnabled) {
    // Encryption not set up — open lock
    return (
      <span className="text-[var(--muted)] opacity-40" title="Encryption disabled">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      </span>
    );
  }

  if (isUnlocked) {
    // Encryption on and unlocked — closed lock with green dot
    return (
      <span className="text-emerald-500" title="Encryption active">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
    );
  }

  // Encryption on but locked — closed lock in muted color
  return (
    <span className="text-[var(--muted)]" title="Encryption locked">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}
