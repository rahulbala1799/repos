'use client';

import styles from './LiveIndicator.module.css';

interface Props {
  isOnline: boolean;
  queueLength: number;
}

export function LiveIndicator({ isOnline, queueLength }: Props) {
  return (
    <div className={styles.container}>
      <span
        className={`${styles.dot} ${isOnline ? styles.dotOnline : styles.dotOffline}`}
      />
      <span className={isOnline ? styles.labelOnline : styles.labelOffline}>
        {isOnline ? 'LIVE' : 'OFFLINE'}
      </span>
      {queueLength > 0 && (
        <span className={styles.queue}>{queueLength}</span>
      )}
    </div>
  );
}
