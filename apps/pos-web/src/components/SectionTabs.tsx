'use client';

import { Section } from '@/lib/types';
import styles from './SectionTabs.module.css';

interface Props {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  occupiedCounts?: Record<string, number>;
}

export function SectionTabs({ sections, selectedId, onSelect, occupiedCounts }: Props) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.tab} ${selectedId === null ? styles.tabSelected : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {sections.map((section) => (
        <button
          key={section.id}
          className={`${styles.tab} ${selectedId === section.id ? styles.tabSelected : ''}`}
          onClick={() => onSelect(section.id)}
        >
          {section.name}
          {occupiedCounts && occupiedCounts[section.id] > 0 && (
            <span className={styles.badge}>{occupiedCounts[section.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
