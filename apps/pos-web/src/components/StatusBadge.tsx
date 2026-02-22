'use client';

import styles from './StatusBadge.module.css';

const statusColors: Record<string, string> = {
  available: '#00B894',
  occupied: '#E17055',
  reserved: '#FDCB6E',
  cleaning: '#74B9FF',
  open: '#74B9FF',
  submitted: '#FDCB6E',
  preparing: '#E17055',
  ready: '#00B894',
  served: '#A29BFE',
  closed: '#6B6E7B',
  void: '#FF6B6B',
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const color = statusColors[status] || '#6B6E7B';

  return (
    <span className={styles.badge} style={{ backgroundColor: color + '22', color }}>
      <span className={styles.dot} style={{ backgroundColor: color }} />
      {status.toUpperCase()}
    </span>
  );
}
