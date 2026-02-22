'use client';

import styles from './StatCard.module.css';

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor: string;
}

export function StatCard({ label, value, subtitle, accentColor }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.accent} style={{ backgroundColor: accentColor }} />
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
    </div>
  );
}
