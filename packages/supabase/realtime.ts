import { supabase } from './client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'orders' | 'order_items' | 'tables' | 'payments' | 'print_jobs';
type ChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

export function subscribeToTable(
  restaurantId: string,
  table: TableName,
  handler: ChangeHandler,
) {
  return supabase
    .channel(`${table}-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      handler,
    )
    .subscribe();
}

export function unsubscribeAll() {
  supabase.removeAllChannels();
}
