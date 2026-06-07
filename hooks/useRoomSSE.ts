"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RoomEvent, RoomEventType } from "@/lib/sse/roomEventBus";

interface UseRoomSSEOptions {
  onEvent?: (event: RoomEvent) => void;
  onEventType?: Partial<Record<RoomEventType, (event: RoomEvent) => void>>;
}

interface UseRoomSSEReturn {
  lastEvent: RoomEvent | null;
  isConnected: boolean;
}

export function useRoomSSE(options?: UseRoomSSEOptions): UseRoomSSEReturn {
  const [lastEvent, setLastEvent] = useState<RoomEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    const es = new EventSource("/api/rooms/sse");
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      retryRef.current = 0;
    };

    es.addEventListener("connected", () => {
      setIsConnected(true);
      retryRef.current = 0;
    });

    es.onmessage = (event) => {
      try {
        const parsed: RoomEvent = JSON.parse(event.data);
        setLastEvent(parsed);
        options?.onEvent?.(parsed);
        options?.onEventType?.[parsed.type]?.(parsed);
      } catch {
        // Ignore non-JSON events (keepalive, etc.)
      }
    };

    // Handle specific event types using the `event` field in SSE
    const eventTypes: RoomEventType[] = [
      "MEMBER_WAITING_FOR_KEY",
      "ROOM_KEY_AVAILABLE",
      "MEMBERSHIP_ACTIVATED",
      "MEMBER_LEFT",
      "ROOM_KEY_ROTATED",
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (event: MessageEvent) => {
        try {
          const parsed: RoomEvent = JSON.parse(event.data);
          setLastEvent(parsed);
          options?.onEvent?.(parsed);
          options?.onEventType?.[parsed.type]?.(parsed);
        } catch {
          // Ignore parse errors
        }
      });
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff: 1s → 2s → 4s → 8s → max 30s
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
      retryRef.current += 1;

      setTimeout(() => {
        if (!eventSourceRef.current) {
          connect();
        }
      }, delay);
    };
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { lastEvent, isConnected };
}
