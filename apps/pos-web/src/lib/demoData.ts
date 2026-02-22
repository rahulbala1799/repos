import { Restaurant, Staff, Section, Table, Order, MenuCategory, MenuItem } from './types';

export const DEMO_RESTAURANT: Restaurant = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Demo Bistro',
  slug: 'demo-bistro',
  timezone: 'UTC',
  currency: 'EUR',
  created_at: new Date().toISOString(),
};

export const DEMO_STAFF: Staff = {
  id: 's0000000-0000-0000-0000-000000000001',
  restaurant_id: DEMO_RESTAURANT.id,
  display_name: 'Sarah',
  role: 'manager',
  pin: '1234',
  active: true,
  created_at: new Date().toISOString(),
};

export const DEMO_SECTIONS: Section[] = [
  { id: 'sec-1', restaurant_id: DEMO_RESTAURANT.id, name: 'Indoor', sort_order: 0, active: true },
  { id: 'sec-2', restaurant_id: DEMO_RESTAURANT.id, name: 'Outdoor', sort_order: 1, active: true },
  { id: 'sec-3', restaurant_id: DEMO_RESTAURANT.id, name: 'Bar', sort_order: 2, active: true },
];

export const DEMO_TABLES: Table[] = [
  { id: 't-1', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T1', capacity: 4, status: 'occupied', current_order_id: 'ord-1' },
  { id: 't-2', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T2', capacity: 4, status: 'available', current_order_id: null },
  { id: 't-3', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T3', capacity: 6, status: 'occupied', current_order_id: 'ord-2' },
  { id: 't-4', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T4', capacity: 2, status: 'reserved', current_order_id: null },
  { id: 't-5', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T5', capacity: 4, status: 'available', current_order_id: null },
  { id: 't-6', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-2', name: 'P1', capacity: 4, status: 'occupied', current_order_id: 'ord-3' },
  { id: 't-7', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-2', name: 'P2', capacity: 6, status: 'available', current_order_id: null },
  { id: 't-8', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-2', name: 'P3', capacity: 4, status: 'available', current_order_id: null },
  { id: 't-9', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-3', name: 'B1', capacity: 2, status: 'occupied', current_order_id: 'ord-4' },
  { id: 't-10', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-3', name: 'B2', capacity: 2, status: 'available', current_order_id: null },
  { id: 't-11', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-3', name: 'B3', capacity: 3, status: 'cleaning', current_order_id: null },
  { id: 't-12', restaurant_id: DEMO_RESTAURANT.id, section_id: 'sec-1', name: 'T6', capacity: 8, status: 'available', current_order_id: null },
];

const now = Date.now();

export const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-1', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-1', section_id: 'sec-1',
    staff_id: DEMO_STAFF.id, status: 'preparing', covers: 4, notes: null,
    total: 87.50, submitted_at: new Date(now - 18 * 60000).toISOString(),
    closed_at: null, created_at: new Date(now - 22 * 60000).toISOString(),
    updated_at: new Date(now - 5 * 60000).toISOString(),
  },
  {
    id: 'ord-2', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-3', section_id: 'sec-1',
    staff_id: DEMO_STAFF.id, status: 'submitted', covers: 2, notes: null,
    total: 45.00, submitted_at: new Date(now - 8 * 60000).toISOString(),
    closed_at: null, created_at: new Date(now - 12 * 60000).toISOString(),
    updated_at: new Date(now - 8 * 60000).toISOString(),
  },
  {
    id: 'ord-3', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-6', section_id: 'sec-2',
    staff_id: DEMO_STAFF.id, status: 'ready', covers: 3, notes: 'Birthday celebration',
    total: 124.00, submitted_at: new Date(now - 35 * 60000).toISOString(),
    closed_at: null, created_at: new Date(now - 42 * 60000).toISOString(),
    updated_at: new Date(now - 2 * 60000).toISOString(),
  },
  {
    id: 'ord-4', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-9', section_id: 'sec-3',
    staff_id: DEMO_STAFF.id, status: 'open', covers: 1, notes: null,
    total: 15.50, submitted_at: null,
    closed_at: null, created_at: new Date(now - 3 * 60000).toISOString(),
    updated_at: new Date(now - 3 * 60000).toISOString(),
  },
  // Closed orders for revenue stats
  {
    id: 'ord-10', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-2', section_id: 'sec-1',
    staff_id: DEMO_STAFF.id, status: 'closed', covers: 2, notes: null,
    total: 62.00, submitted_at: new Date(now - 180 * 60000).toISOString(),
    closed_at: new Date(now - 120 * 60000).toISOString(),
    created_at: new Date(now - 190 * 60000).toISOString(),
    updated_at: new Date(now - 120 * 60000).toISOString(),
  },
  {
    id: 'ord-11', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-5', section_id: 'sec-1',
    staff_id: DEMO_STAFF.id, status: 'closed', covers: 4, notes: null,
    total: 156.50, submitted_at: new Date(now - 240 * 60000).toISOString(),
    closed_at: new Date(now - 150 * 60000).toISOString(),
    created_at: new Date(now - 250 * 60000).toISOString(),
    updated_at: new Date(now - 150 * 60000).toISOString(),
  },
  {
    id: 'ord-12', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-7', section_id: 'sec-2',
    staff_id: DEMO_STAFF.id, status: 'closed', covers: 2, notes: null,
    total: 78.00, submitted_at: new Date(now - 300 * 60000).toISOString(),
    closed_at: new Date(now - 260 * 60000).toISOString(),
    created_at: new Date(now - 310 * 60000).toISOString(),
    updated_at: new Date(now - 260 * 60000).toISOString(),
  },
  {
    id: 'ord-13', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-8', section_id: 'sec-2',
    staff_id: DEMO_STAFF.id, status: 'closed', covers: 6, notes: null,
    total: 234.00, submitted_at: new Date(now - 100 * 60000).toISOString(),
    closed_at: new Date(now - 60 * 60000).toISOString(),
    created_at: new Date(now - 110 * 60000).toISOString(),
    updated_at: new Date(now - 60 * 60000).toISOString(),
  },
  {
    id: 'ord-14', restaurant_id: DEMO_RESTAURANT.id, table_id: 't-10', section_id: 'sec-3',
    staff_id: DEMO_STAFF.id, status: 'closed', covers: 1, notes: null,
    total: 23.50, submitted_at: new Date(now - 70 * 60000).toISOString(),
    closed_at: new Date(now - 55 * 60000).toISOString(),
    created_at: new Date(now - 75 * 60000).toISOString(),
    updated_at: new Date(now - 55 * 60000).toISOString(),
  },
];

export const DEMO_CATEGORIES: MenuCategory[] = [
  { id: 'cat-1', restaurant_id: DEMO_RESTAURANT.id, name: 'Starters', color: '#4CAF50', sort_order: 0, active: true },
  { id: 'cat-2', restaurant_id: DEMO_RESTAURANT.id, name: 'Mains', color: '#FF9800', sort_order: 1, active: true },
  { id: 'cat-3', restaurant_id: DEMO_RESTAURANT.id, name: 'Desserts', color: '#E91E63', sort_order: 2, active: true },
  { id: 'cat-4', restaurant_id: DEMO_RESTAURANT.id, name: 'Drinks', color: '#2196F3', sort_order: 3, active: true },
];

export const DEMO_MENU_ITEMS: MenuItem[] = [
  { id: 'mi-1', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-1', name: 'Garlic Bread', description: 'Crispy with herb butter', price: 5.50, image_url: null, available: true, sort_order: 0 },
  { id: 'mi-2', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-1', name: 'Soup of the Day', description: null, price: 6.00, image_url: null, available: true, sort_order: 1 },
  { id: 'mi-3', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-1', name: 'Bruschetta', description: 'Tomato, basil, balsamic', price: 7.50, image_url: null, available: true, sort_order: 2 },
  { id: 'mi-4', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-2', name: 'Ribeye Steak', description: '300g, aged 28 days', price: 28.00, image_url: null, available: true, sort_order: 0 },
  { id: 'mi-5', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-2', name: 'Grilled Salmon', description: 'Atlantic, lemon dill', price: 22.00, image_url: null, available: true, sort_order: 1 },
  { id: 'mi-6', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-2', name: 'Chicken Parm', description: 'House-crumbed', price: 18.00, image_url: null, available: true, sort_order: 2 },
  { id: 'mi-7', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-2', name: 'Veg Risotto', description: 'Mushroom & truffle', price: 16.00, image_url: null, available: true, sort_order: 3 },
  { id: 'mi-8', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-3', name: 'Tiramisu', description: null, price: 9.00, image_url: null, available: true, sort_order: 0 },
  { id: 'mi-9', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-3', name: 'Cheesecake', description: 'NY style', price: 8.50, image_url: null, available: true, sort_order: 1 },
  { id: 'mi-10', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-4', name: 'Espresso', description: null, price: 3.00, image_url: null, available: true, sort_order: 0 },
  { id: 'mi-11', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-4', name: 'House Wine', description: 'Glass', price: 7.00, image_url: null, available: true, sort_order: 1 },
  { id: 'mi-12', restaurant_id: DEMO_RESTAURANT.id, category_id: 'cat-4', name: 'Draft Beer', description: null, price: 5.50, image_url: null, available: true, sort_order: 2 },
];
