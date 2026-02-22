'use client';

import { Table } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import styles from './TableCard.module.css';

const statusBorderColors: Record<string, string> = {
  available: '#00B894',
  occupied: '#E17055',
  reserved: '#FDCB6E',
  cleaning: '#74B9FF',
};

interface Props {
  table: Table;
  orderTotal?: number;
  elapsed?: string;
  onClick?: () => void;
}

export function TableCard({ table, orderTotal, elapsed, onClick }: Props) {
  const borderColor = statusBorderColors[table.status] || '#2E3144';

  return (
    <button
      className={styles.card}
      style={{ borderColor }}
      onClick={onClick}
    >
      <div className={styles.topRow}>
        <span className={styles.name}>{table.name}</span>
        {elapsed && <span className={styles.elapsed}>{elapsed}</span>}
      </div>

      <StatusBadge status={table.status} />

      <div className={styles.bottomRow}>
        {table.capacity && (
          <span className={styles.capacity}>{table.capacity} seats</span>
        )}
        {orderTotal !== undefined && orderTotal > 0 && (
          <span className={styles.total}>&euro;{orderTotal.toFixed(2)}</span>
        )}
      </div>
    </button>
  );
}
