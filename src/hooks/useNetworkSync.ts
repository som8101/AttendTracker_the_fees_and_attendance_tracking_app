import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSync } from './useSync';
import { useAuth } from './useAuth';

export function useNetworkSync() {
  const { syncData } = useSync();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('Network connected. Triggering auto-sync...');
        syncData().catch(err => console.error('Auto-sync failed:', err));
      }
    });

    return () => unsubscribe();
  }, [user, syncData]);
}
