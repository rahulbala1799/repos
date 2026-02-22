'use client';

import { create } from 'zustand';
import { Order, Table, Section, Restaurant, Staff } from '@/lib/types';
import {
  DEMO_RESTAURANT,
  DEMO_STAFF,
  DEMO_SECTIONS,
  DEMO_TABLES,
  DEMO_ORDERS,
} from '@/lib/demoData';

interface AppState {
  // Auth
  restaurant: Restaurant;
  staff: Staff;

  // Tables
  tables: Table[];
  sections: Section[];
  selectedSectionId: string | null;

  // Orders
  orders: Order[];

  // Sync
  isOnline: boolean;
  queueLength: number;

  // Computed
  tablesForSection: (sectionId: string | null) => Table[];
  tableCounts: () => { available: number; occupied: number; reserved: number; cleaning: number; total: number };
  activeOrders: () => Order[];
  todayStats: () => { totalRevenue: number; orderCount: number; avgOrderValue: number; openOrders: number };
  tableNameMap: () => Record<string, string>;
  orderForTable: (tableId: string) => Order | undefined;

  // Actions
  selectSection: (sectionId: string | null) => void;
  toggleTableStatus: (tableId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  restaurant: DEMO_RESTAURANT,
  staff: DEMO_STAFF,
  tables: DEMO_TABLES,
  sections: DEMO_SECTIONS,
  selectedSectionId: null,
  orders: DEMO_ORDERS,
  isOnline: true,
  queueLength: 0,

  tablesForSection: (sectionId) => {
    const { tables } = get();
    if (!sectionId) return tables;
    return tables.filter((t) => t.section_id === sectionId);
  },

  tableCounts: () => {
    const { tables } = get();
    return {
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
      total: tables.length,
    };
  },

  activeOrders: () => {
    return get().orders.filter((o) => !['closed', 'void'].includes(o.status));
  },

  todayStats: () => {
    const all = get().orders;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = all.filter((o) => o.created_at.startsWith(today));
    const closed = todayOrders.filter((o) => o.status === 'closed');
    const totalRevenue = closed.reduce((sum, o) => sum + Number(o.total), 0);
    return {
      totalRevenue,
      orderCount: closed.length,
      avgOrderValue: closed.length > 0 ? totalRevenue / closed.length : 0,
      openOrders: todayOrders.filter((o) => !['closed', 'void'].includes(o.status)).length,
    };
  },

  tableNameMap: () => {
    const map: Record<string, string> = {};
    get().tables.forEach((t) => { map[t.id] = t.name; });
    return map;
  },

  orderForTable: (tableId) => {
    return get().orders.find(
      (o) => o.table_id === tableId && !['closed', 'void'].includes(o.status)
    );
  },

  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),

  toggleTableStatus: (tableId) => {
    const { tables } = get();
    set({
      tables: tables.map((t) => {
        if (t.id !== tableId) return t;
        const next: Record<string, Table['status']> = {
          available: 'occupied',
          occupied: 'ready' as any || 'available',
          reserved: 'occupied',
          cleaning: 'available',
        };
        return { ...t, status: next[t.status] || 'available' };
      }),
    });
  },
}));
