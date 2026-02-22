'use client';

import styles from './QuickAction.module.css';

interface Props {
  label: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export function QuickAction({ label, icon, color, onClick }: Props) {
  return (
    <button
      className={styles.button}
      style={{
        backgroundColor: color + '15',
        borderColor: color + '40',
        color,
      }}
      onClick={onClick}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
