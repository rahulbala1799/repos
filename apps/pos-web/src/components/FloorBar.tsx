'use client';

import styles from './FloorBar.module.css';

interface Props {
  available: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  total: number;
}

export function FloorBar({ available, occupied, reserved, cleaning, total }: Props) {
  if (total === 0) return null;

  return (
    <div>
      <div className={styles.bar}>
        <div className={styles.segmentAvailable} style={{ flex: available || 0.01 }} />
        <div className={styles.segmentOccupied} style={{ flex: occupied || 0.01 }} />
        <div className={styles.segmentReserved} style={{ flex: reserved || 0.01 }} />
        {cleaning > 0 && (
          <div className={styles.segmentCleaning} style={{ flex: cleaning }} />
        )}
      </div>
      <div className={styles.legend}>
        <LegendItem color="#00B894" label="Available" count={available} />
        <LegendItem color="#E17055" label="Occupied" count={occupied} />
        <LegendItem color="#FDCB6E" label="Reserved" count={reserved} />
        {cleaning > 0 && <LegendItem color="#74B9FF" label="Cleaning" count={cleaning} />}
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ backgroundColor: color }} />
      <span className={styles.legendLabel}>{label}</span>
      <span className={styles.legendCount}>{count}</span>
    </div>
  );
}
