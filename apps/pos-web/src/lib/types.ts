export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  created_at: string;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  display_name: string;
  role: 'owner' | 'manager' | 'server' | 'kitchen' | 'cashier';
  pin: string | null;
  active: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface Table {
  id: string;
  restaurant_id: string;
  section_id: string | null;
  name: string;
  capacity: number | null;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  current_order_id: string | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  section_id: string | null;
  staff_id: string | null;
  status: 'open' | 'submitted' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'closed' | 'void';
  covers: number;
  notes: string | null;
  total: number;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
  status: 'pending' | 'sent' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'void';
  seat: number | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  restaurant_id: string;
  method: 'cash' | 'card' | 'split' | 'voucher' | 'complimentary';
  amount: number;
  tip_amount: number;
  reference: string | null;
  staff_id: string | null;
  created_at: string;
}
