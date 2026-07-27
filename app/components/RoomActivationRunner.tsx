"use client";

import { usePendingRoomActivations } from "@/hooks/usePendingRoomActivations";

/**
 * Thin shell component that mounts the global pending-room-activation hook.
 * Renders nothing — exists only to anchor the hook in the app-level layout
 * so it runs on every page, not just the join link page.
 */
export default function RoomActivationRunner() {
  usePendingRoomActivations();
  return null;
}
