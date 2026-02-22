'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '/' },
  { href: '/tables', label: 'Tables', icon: '#' },
  { href: '/orders', label: 'Orders', icon: '=' },
  { href: '/menu', label: 'Menu', icon: '*' },
  { href: '/kds', label: 'KDS', icon: '>' },
  { href: '/reports', label: 'Reports', icon: '~' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>P</span>
        <span className={styles.brandText}>POS</span>
      </div>

      <div className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>S</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Sarah</span>
            <span className={styles.userRole}>Manager</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
