export type RoomEventType =
  | "MEMBER_WAITING_FOR_KEY"
  | "ROOM_KEY_AVAILABLE"
  | "MEMBERSHIP_ACTIVATED"
  | "MEMBER_LEFT"
  | "ROOM_KEY_ROTATED";

export interface RoomEvent {
  type: RoomEventType;
  roomId: string;
  userId?: string;
  targetUserId?: string;
  keyVersion?: number;
  timestamp: number;
}

type EventCallback = (event: RoomEvent) => void;

class RoomEventBus {
  private connections: Map<string, Set<EventCallback>> = new Map();

  subscribe(userId: string, callback: EventCallback): () => void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(callback);

    return () => {
      const callbacks = this.connections.get(userId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.connections.delete(userId);
        }
      }
    };
  }

  unsubscribe(userId: string): void {
    this.connections.delete(userId);
  }

  emit(targetUserId: string, event: RoomEvent): void {
    const callbacks = this.connections.get(targetUserId);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(event);
        } catch {
          // Silently handle subscriber errors
        }
      });
    }
  }

  /** Emit to all ACTIVE members of a room by their user IDs */
  emitToRoom(userIds: string[], event: RoomEvent): void {
    userIds.forEach((uid) => this.emit(uid, event));
  }

  connectionCount(): number {
    return this.connections.size;
  }
}

// Singleton
export const roomEventBus = new RoomEventBus();
