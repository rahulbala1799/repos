import { create } from 'zustand';

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  serverId?: string;
}

interface SyncState {
  queue: PendingOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;

  setOnline: (online: boolean) => void;
  enqueue: (op: Omit<PendingOperation, 'id' | 'createdAt' | 'attempts'>) => void;
  drainQueue: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,

  setOnline: (online) => {
    set({ isOnline: online });
    // Auto-drain when back online
    if (online && get().queue.length > 0) {
      get().drainQueue();
    }
  },

  enqueue: (op) => {
    const entry: PendingOperation = {
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      attempts: 0,
    };
    set((state) => ({ queue: [...state.queue, entry] }));
  },

  drainQueue: async () => {
    const { queue, isOnline, isSyncing } = get();
    if (!isOnline || isSyncing || queue.length === 0) return;

    set({ isSyncing: true });

    const remaining: PendingOperation[] = [];

    for (const op of queue) {
      try {
        // Process each operation — this would call supabase
        // For now, placeholder for the sync engine
        op.attempts += 1;
        // await supabase.from(op.table)[op.operation](op.payload);
        // Success — don't add to remaining
      } catch {
        if (op.attempts < 5) {
          remaining.push(op);
        }
        // Drop after 5 attempts
      }
    }

    set({
      queue: remaining,
      isSyncing: false,
      lastSyncAt: Date.now(),
    });
  },
}));
