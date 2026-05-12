import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { SyncService } from '../services/syncService';
import { useAuth } from './useAuth';

export function useSync() {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const syncData = useCallback(async () => {
    if (!user) {
      console.warn('Cannot sync data: User not logged in');
      return;
    }
    const syncService = new SyncService(db);
    await syncService.syncAllData(user.id);
  }, [db, user]);

  return { syncData };
}
