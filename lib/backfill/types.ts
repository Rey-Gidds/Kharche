export interface BackfillProgress {
  total: number;
  completed: number;
  phase: "expenses" | "books" | "rooms" | "room_tickets" | "complete";
  error?: string;
}

export interface BackfillCheckpoint {
  phase: BackfillProgress["phase"];
  completed: number;
  total: number;
  processedIds: string[];
  timestamp: number;
}
