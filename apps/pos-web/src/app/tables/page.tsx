'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { LiveIndicator } from '@/components/LiveIndicator';
import { SectionTabs } from '@/components/SectionTabs';
import { TableCard } from '@/components/TableCard';
import styles from './page.module.css';

export default function TablesPage() {
  const sections = useStore((s) => s.sections);
  const selectedSectionId = useStore((s) => s.selectedSectionId);
  const selectSection = useStore((s) => s.selectSection);
  const tablesForSection = useStore((s) => s.tablesForSection);
  const isOnline = useStore((s) => s.isOnline);
  const queueLength = useStore((s) => s.queueLength);
  const orders = useStore((s) => s.orders);
  const toggleTableStatus = useStore((s) => s.toggleTableStatus);

  const displayTables = tablesForSection(selectedSectionId);

  const occupiedCounts = useMemo(() => {
    const allTables = tablesForSection(null);
    const counts: Record<string, number> = {};
    allTables.forEach((t) => {
      if (t.status === 'occupied' && t.section_id) {
        counts[t.section_id] = (counts[t.section_id] || 0) + 1;
      }
    });
    return counts;
  }, [tablesForSection]);

  const tableOrderTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    orders.forEach((order) => {
      if (order.table_id && !['closed', 'void'].includes(order.status)) {
        totals[order.table_id] = Number(order.total);
      }
    });
    return totals;
  }, [orders]);

  const tableElapsed = useMemo(() => {
    const elapsed: Record<string, string> = {};
    orders.forEach((order) => {
      if (order.table_id && !['closed', 'void'].includes(order.status)) {
        const diffMs = Date.now() - new Date(order.created_at).getTime();
        const mins = Math.floor(diffMs / 60000);
        elapsed[order.table_id] = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60}m`;
      }
    });
    return elapsed;
  }, [orders]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tables</h1>
          <p className={styles.subtitle}>
            {displayTables.length} tables
            {selectedSectionId
              ? ` in ${sections.find((s) => s.id === selectedSectionId)?.name}`
              : ''}
          </p>
        </div>
        <LiveIndicator isOnline={isOnline} queueLength={queueLength} />
      </header>

      <div className={styles.tabs}>
        <SectionTabs
          sections={sections}
          selectedId={selectedSectionId}
          onSelect={selectSection}
          occupiedCounts={occupiedCounts}
        />
      </div>

      <div className={styles.grid}>
        {displayTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            orderTotal={tableOrderTotals[table.id]}
            elapsed={tableElapsed[table.id]}
            onClick={() => toggleTableStatus(table.id)}
          />
        ))}
      </div>
    </div>
  );
}
