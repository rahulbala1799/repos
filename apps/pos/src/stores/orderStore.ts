import { create } from 'zustand';
import { Order, OrderItem } from '@packages/supabase/types';
import { supabase } from '@packages/supabase/client';

interface OrderWithItems extends Order {
  items?: OrderItem[];
}

interface OrderState {
  orders: Map<string, OrderWithItems>;
  activeOrderId: string | null;
  isLoading: boolean;

  // Computed
  activeOrder: () => OrderWithItems | undefined;
  activeOrders: () => OrderWithItems[];
  ordersByStatus: (status: string) => OrderWithItems[];
  todayStats: () => {
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    openOrders: number;
  };

  // Actions
  loadOrders: (restaurantId: string) => Promise<void>;
  setActiveOrder: (orderId: string | null) => void;
  createOrder: (tableId: string, staffId: string, restaurantId: string) => Promise<string>;
  addItem: (orderId: string, item: { menuItemId: string; name: string; price: number; quantity: number; notes?: string }) => Promise<void>;
  submitOrder: (orderId: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: new Map(),
  activeOrderId: null,
  isLoading: false,

  activeOrder: () => {
    const { orders, activeOrderId } = get();
    return activeOrderId ? orders.get(activeOrderId) : undefined;
  },

  activeOrders: () => {
    return Array.from(get().orders.values()).filter(
      (o) => !['closed', 'void'].includes(o.status),
    );
  },

  ordersByStatus: (status) => {
    return Array.from(get().orders.values()).filter((o) => o.status === status);
  },

  todayStats: () => {
    const all = Array.from(get().orders.values());
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

  loadOrders: async (restaurantId) => {
    set({ isLoading: true });

    // Load today's orders only — fast
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    const orderMap = new Map<string, OrderWithItems>();
    (data || []).forEach((o: any) => {
      orderMap.set(o.id, { ...o, items: o.order_items || [] });
    });

    set({ orders: orderMap, isLoading: false });
  },

  setActiveOrder: (orderId) => set({ activeOrderId: orderId }),

  createOrder: async (tableId, staffId, restaurantId) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticOrder: OrderWithItems = {
      id: tempId,
      restaurant_id: restaurantId,
      table_id: tableId,
      section_id: null,
      staff_id: staffId,
      status: 'open',
      covers: 1,
      notes: null,
      total: 0,
      submitted_at: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    // Optimistic: instant UI update
    const { orders } = get();
    const newOrders = new Map(orders);
    newOrders.set(tempId, optimisticOrder);
    set({ orders: newOrders, activeOrderId: tempId });

    // Async: persist to Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        staff_id: staffId,
      })
      .select()
      .single();

    if (error) {
      // Rollback
      const rollback = new Map(get().orders);
      rollback.delete(tempId);
      set({ orders: rollback, activeOrderId: null });
      throw error;
    }

    // Replace temp with real
    const replace = new Map(get().orders);
    replace.delete(tempId);
    replace.set(data.id, { ...data, items: [] });
    set({ orders: replace, activeOrderId: data.id });

    return data.id;
  },

  addItem: async (orderId, item) => {
    const { orders } = get();
    const order = orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const tempItem: OrderItem = {
      id: `temp-${Date.now()}`,
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      menu_item_id: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || null,
      status: 'pending',
      seat: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    const newOrders = new Map(orders);
    const updatedOrder = { ...order, items: [...(order.items || []), tempItem] };
    newOrders.set(orderId, updatedOrder);
    set({ orders: newOrders });

    // Persist
    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        restaurant_id: order.restaurant_id,
        menu_item_id: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })
      .select()
      .single();

    if (error) {
      // Rollback the optimistic item
      const rollbackOrders = new Map(get().orders);
      const ro = rollbackOrders.get(orderId);
      if (ro) {
        ro.items = (ro.items || []).filter((i) => i.id !== tempItem.id);
        rollbackOrders.set(orderId, { ...ro });
        set({ orders: rollbackOrders });
      }
      throw error;
    }

    // Replace temp with real
    const finalOrders = new Map(get().orders);
    const fo = finalOrders.get(orderId);
    if (fo) {
      fo.items = (fo.items || []).map((i) => (i.id === tempItem.id ? data : i));
      finalOrders.set(orderId, { ...fo });
      set({ orders: finalOrders });
    }
  },

  submitOrder: async (orderId) => {
    // Optimistic
    const { orders } = get();
    const newOrders = new Map(orders);
    const order = newOrders.get(orderId);
    if (!order) return;

    const prev = { ...order };
    newOrders.set(orderId, { ...order, status: 'submitted', submitted_at: new Date().toISOString() });
    set({ orders: newOrders });

    // Call Edge Function for server-side validation
    const { error } = await supabase.functions.invoke('submit-order', {
      body: { orderId },
    });

    if (error) {
      // Rollback
      const rollback = new Map(get().orders);
      rollback.set(orderId, prev);
      set({ orders: rollback });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { orders } = get();
    const newOrders = new Map(orders);

    if (payload.eventType === 'INSERT') {
      const order = payload.new as Order;
      if (!newOrders.has(order.id)) {
        newOrders.set(order.id, { ...order, items: [] });
      }
    } else if (payload.eventType === 'UPDATE') {
      const updated = payload.new as Order;
      const existing = newOrders.get(updated.id);
      newOrders.set(updated.id, { ...updated, items: existing?.items || [] });
    } else if (payload.eventType === 'DELETE') {
      newOrders.delete(payload.old.id);
    }

    set({ orders: newOrders });
  },
}));
