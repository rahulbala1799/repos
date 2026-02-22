import { useEffect } from 'react';
import { useSyncStore } from '../stores/syncStore';

/**
 * Watches network connectivity and updates the sync store.
 * In production, this uses @react-native-community/netinfo.
 * For now, a simple implementation that defaults to online.
 */
export function useNetworkStatus() {
  const setOnline = useSyncStore((s) => s.setOnline);

  useEffect(() => {
    // When NetInfo is installed, replace with:
    // const unsubscribe = NetInfo.addEventListener(state => {
    //   setOnline(state.isConnected ?? false);
    // });
    // return () => unsubscribe();

    setOnline(true);
  }, [setOnline]);
}
