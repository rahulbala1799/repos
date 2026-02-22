import { create } from 'zustand';
import { Staff, Restaurant } from '@packages/supabase/types';
import { supabase } from '@packages/supabase/client';

interface AuthState {
  staff: Staff | null;
  restaurant: Restaurant | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  pinSwitch: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  staff: null,
  restaurant: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;

    const { data: staffData } = await supabase
      .from('staff')
      .select('*, restaurants(*)')
      .eq('id', authData.user.id)
      .single();

    if (!staffData) throw new Error('Staff profile not found');

    const restaurant = (staffData as any).restaurants as Restaurant;
    set({
      staff: staffData,
      restaurant,
      isAuthenticated: true,
    });
  },

  pinSwitch: async (pin) => {
    const { restaurant } = get();
    if (!restaurant) throw new Error('No restaurant context');

    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('pin', pin)
      .eq('active', true)
      .single();

    if (!staffData) throw new Error('Invalid PIN');
    set({ staff: staffData });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ staff: null, restaurant: null, isAuthenticated: false });
  },

  loadSession: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, restaurants(*)')
        .eq('id', session.user.id)
        .single();

      if (staffData) {
        const restaurant = (staffData as any).restaurants as Restaurant;
        set({ staff: staffData, restaurant, isAuthenticated: true });
      }
    }
    set({ isLoading: false });
  },
}));
