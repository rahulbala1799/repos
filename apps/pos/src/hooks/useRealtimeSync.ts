import { useEffect, useRef } from 'react';
import { subscribeToTable, unsubscribeAll } from '@packages/supabase/realtime';
import { useOrderStore } from '../stores/orderStore';
import { useTableStore } from '../stores/tableStore';

/**
 * Subscribes to Supabase Realtime channels for the given restaurant.
 * Automatically updates Zustand stores on every change.
 * Call once at the app root level.
 */
export function useRealtimeSync(restaurantId: string | undefined) {
  const subscribed = useRef(false);

  const handleOrderEvent = useOrderStore((s) => s.handleRealtimeEvent);
  const handleTableEvent = useTableStore((s) => s.handleRealtimeEvent);

  useEffect(() => {
    if (!restaurantId || subscribed.current) return;

    subscribed.current = true;

    // Subscribe to hot tables — these fire on every INSERT/UPDATE/DELETE
    const orderChannel = subscribeToTable(restaurantId, 'orders', handleOrderEvent);
    const tableChannel = subscribeToTable(restaurantId, 'tables', handleTableEvent);

    return () => {
      subscribed.current = false;
      unsubscribeAll();
    };
  }, [restaurantId, handleOrderEvent, handleTableEvent]);
}
