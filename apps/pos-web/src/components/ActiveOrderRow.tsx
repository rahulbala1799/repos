'use client';

import { Order } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import styles from './ActiveOrderRow.module.css';

interface Props {
  order: Order;
  tableName?: string;
  onClick?: () => void;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function ActiveOrderRow({ order, tableName, onClick }: Props) {
  return (
    <button className={styles.row} onClick={onClick}>
      <div className={styles.left}>
        <span className={styles.table}>{tableName || '—'}</span>
        <span className={styles.time}>{timeAgo(order.created_at)}</span>
      </div>
      <div className={styles.center}>
        <StatusBadge status={order.status} />
        {order.notes && <span className={styles.notes}>{order.notes}</span>}
      </div>
      <div className={styles.right}>
        <span className={styles.covers}>{order.covers} cover{order.covers !== 1 ? 's' : ''}</span>
        <span className={styles.total}>&euro;{Number(order.total).toFixed(2)}</span>
      </div>
    </button>
  );
}
