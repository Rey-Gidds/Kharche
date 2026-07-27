"use client";

import { useState } from "react";
import useSWR from "swr";
import { useEncryption } from "@/hooks/useEncryption";
import { useRoomSSE } from "@/hooks/useRoomSSE";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch pending members");
  return data.members || [];
};

function Avatar({ user, size = 36 }: { user: any; size?: number }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user?.image) {
    return <img src={user.image} alt={user.name} className="rounded-full object-cover border border-[var(--border)]" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--muted)] font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function RoomPendingMembers({ roomId, activeKeyVersion }: { roomId: string, activeKeyVersion: number }) {
  const { data: pendingMembers, error, mutate } = useSWR(
    `/api/rooms/${roomId}/members/pending`,
    fetcher,
    { refreshInterval: 10000 } // Fallback poll every 10s for offline-recovery
  );

  // React instantly to SSE events so the creator sees new join requests
  // in real time without waiting for the 10s poll interval.
  useRoomSSE({
    onEventType: {
      MEMBER_WAITING_FOR_KEY: (event) => {
        if (event.roomId === roomId) {
          mutate();
        }
      },
    },
  });

  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [opError, setOpError] = useState("");
  
  // We don't strictly need useEncryption's state here because we use getRoomKeyDecrypted, 
  // but we can make sure the user has unlocked their encryption.
  const { isUnlocked } = useEncryption();

  const handleApprove = async (member: any) => {
    setProcessing(prev => ({ ...prev, [member.userId]: true }));
    setOpError("");

    try {
      if (!isUnlocked) {
        throw new Error("Please unlock your encryption keys in the dashboard first to approve members.");
      }

      // 1. Fetch pending member's public key
      const pkRes = await fetch(`/api/user/${member.userId}/public-key`);
      if (!pkRes.ok) throw new Error("Could not fetch user's public key.");
      const pkData = await pkRes.json();
      
      const { importKeyFromJwk } = await import("@/crypto/utils/keySerializer");
      const targetPublicKey = await importKeyFromJwk(JSON.parse(pkData.publicKey), { name: "RSA-OAEP", hash: "SHA-256" }, ["encrypt"]);

      // 2. Fetch the decrypted room key from IndexedDB cache
      const { getRoomKeyDecrypted } = await import("@/crypto/indexeddb/cacheManager");
      const roomKey = await getRoomKeyDecrypted(roomId);
      if (!roomKey) {
        throw new Error("Failed to read the decrypted room key from cache. Try unlocking again.");
      }

      // 3. Encrypt the room key for the target user
      const { encryptRoomKeyForUser } = await import("@/crypto/services/roomKey.service");
      const encryptedRoomKey = await encryptRoomKeyForUser(roomKey, targetPublicKey);

      // 4. Submit to server
      const pkgRes = await fetch(`/api/rooms/${roomId}/key-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: member.userId,
          encryptedRoomKey,
          keyVersion: activeKeyVersion,
        }),
      });

      if (!pkgRes.ok) {
        const pkgData = await pkgRes.json();
        throw new Error(pkgData.error || "Failed to deliver key package.");
      }

      // 5. Success -> mutate pending members list
      await mutate();

    } catch (e: any) {
      setOpError(e.message || "Something went wrong.");
    } finally {
      setProcessing(prev => ({ ...prev, [member.userId]: false }));
    }
  };

  if (error) return null; // If they can't fetch (maybe not creator), just hide it
  if (!pendingMembers || pendingMembers.length === 0) return null;

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h3 className="font-bold text-sm text-[var(--foreground)]">Pending Approvals</h3>
        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
      </div>
      
      {opError && (
        <div className="mb-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2 font-medium">
          {opError}
        </div>
      )}

      <div className="space-y-2">
        {pendingMembers.map((member: any) => (
          <div key={member.userId} className="flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Avatar user={member} />
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">{member.name}</p>
                <p className="text-[10px] text-[var(--muted)]">Waiting for room key</p>
              </div>
            </div>
            <button
              onClick={() => handleApprove(member)}
              disabled={processing[member.userId] || !isUnlocked}
              className="px-4 py-1.5 bg-[var(--foreground)] text-[var(--background)] text-xs font-bold uppercase tracking-wider rounded-lg disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {processing[member.userId] ? "Approving..." : "Approve"}
            </button>
          </div>
        ))}
      </div>
      {!isUnlocked && (
        <p className="text-[10px] text-amber-500 mt-2 font-medium text-center">
          You must unlock your encryption keys before you can approve members.
        </p>
      )}
    </div>
  );
}
