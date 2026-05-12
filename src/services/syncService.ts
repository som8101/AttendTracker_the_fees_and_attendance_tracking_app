import { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';

const TABLES = ['classes', 'students', 'attendance', 'fees', 'extra_classes'];

let isSyncing = false;

export class SyncService {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Main sync function: Pushes local changes then pulls remote changes.
   */
  async syncAllData(userId: string) {
    if (isSyncing) {
      console.log('Sync already in progress. Skipping.');
      return;
    }
    
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (!isConnected) {
      throw new Error('No network connection');
    }

    isSyncing = true;
    try {
      await this.pushLocalChanges(userId);
      await this.pullRemoteChanges(userId);
      
      // Update last sync time
      await SecureStore.setItemAsync(`last_sync_${userId}`, new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Pushes all local rows where sync_status is 'pending' (including soft-deleted rows marked with is_deleted = 1).
   */
  private async pushLocalChanges(userId: string) {
    for (const table of TABLES) {
      const pendingRows = await this.db.getAllAsync<any>(
        `SELECT * FROM ${table} WHERE sync_status = 'pending'`
      );

      if (pendingRows.length > 0) {
        // Strip out SQLite specific sync_status before sending to Supabase
        // And ensure user_id is set
        const payload = pendingRows.map(({ sync_status, ...row }) => ({
          ...row,
          user_id: userId,
          updated_at: row.updated_at || new Date().toISOString()
        }));

        const { error } = await supabase.from(table).upsert(payload);

        if (!error) {
          // Mark as synced locally
          const ids = payload.map(r => `'${r.id}'`).join(',');
          await this.db.runAsync(
            `UPDATE ${table} SET sync_status = 'synced' WHERE id IN (${ids})`
          );
        } else {
          console.error(`Error pushing to ${table}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Pulls all changes from Supabase since the last sync time
   */
  private async pullRemoteChanges(userId: string) {
    const lastSyncTime = await SecureStore.getItemAsync(`last_sync_${userId}`) || new Date(0).toISOString();

    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncTime);

      if (error) {
        console.error(`Error pulling from ${table}:`, error);
        throw error;
      }

      if (data && data.length > 0) {
        // Upsert into local SQLite
        for (const row of data) {
          if (row.is_deleted === 1) {
            await this.db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [row.id]);
          } else {
            // Dynamically construct insert/replace query based on object keys
            // Exclude user_id from local insert if not strictly necessary, but we have the column now.
            const { sync_status: _syncStatus, ...localRow } = row;
            const keys = Object.keys(localRow);
            const values = Object.values(localRow);
            const placeholders = [...keys, 'sync_status'].map(() => '?').join(',');
            
            await this.db.runAsync(
              `INSERT OR REPLACE INTO ${table} (${keys.join(',')}, sync_status) VALUES (${placeholders})`,
              [...values, 'synced']
            );
          }
        }
      }
    }
  }
}
