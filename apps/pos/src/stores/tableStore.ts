import { create } from 'zustand';
import { Table, Section } from '@packages/supabase/types';
import { supabase } from '@packages/supabase/client';

interface TableState {
  tables: Map<string, Table>;
  sections: Section[];
  selectedSectionId: string | null;
  isLoading: boolean;

  // Computed
  tablesForSection: (sectionId: string | null) => Table[];
  tableById: (id: string) => Table | undefined;
  counts: () => { available: number; occupied: number; reserved: number; total: number };

  // Actions
  loadTables: (restaurantId: string) => Promise<void>;
  selectSection: (sectionId: string | null) => void;
  handleRealtimeEvent: (payload: any) => void;
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: new Map(),
  sections: [],
  selectedSectionId: null,
  isLoading: false,

  tablesForSection: (sectionId) => {
    const { tables } = get();
    const all = Array.from(tables.values());
    if (!sectionId) return all;
    return all.filter((t) => t.section_id === sectionId);
  },

  tableById: (id) => get().tables.get(id),

  counts: () => {
    const all = Array.from(get().tables.values());
    return {
      available: all.filter((t) => t.status === 'available').length,
      occupied: all.filter((t) => t.status === 'occupied').length,
      reserved: all.filter((t) => t.status === 'reserved').length,
      total: all.length,
    };
  },

  loadTables: async (restaurantId) => {
    set({ isLoading: true });

    const [sectionsRes, tablesRes] = await Promise.all([
      supabase
        .from('sections')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId),
    ]);

    const tableMap = new Map<string, Table>();
    (tablesRes.data || []).forEach((t) => tableMap.set(t.id, t));

    set({
      sections: sectionsRes.data || [],
      tables: tableMap,
      isLoading: false,
    });
  },

  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),

  handleRealtimeEvent: (payload) => {
    const { tables } = get();
    const newTables = new Map(tables);

    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      newTables.set(payload.new.id, payload.new as Table);
    } else if (payload.eventType === 'DELETE') {
      newTables.delete(payload.old.id);
    }

    set({ tables: newTables });
  },
}));
