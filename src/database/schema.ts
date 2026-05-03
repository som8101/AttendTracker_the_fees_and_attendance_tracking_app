import { type SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 4;
  
  let user_version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = user_version?.user_version || 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        subject TEXT,
        timing TEXT,
        days_of_week TEXT,
        weekly_schedule TEXT
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY NOT NULL,
        class_id TEXT NOT NULL,
        name TEXT NOT NULL,
        roll_number TEXT,
        phone TEXT,
        monthly_fee INTEGER,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        time TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fees (
        id TEXT PRIMARY KEY NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        month TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        payment_date TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS extra_classes (
        id TEXT PRIMARY KEY NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        timing TEXT NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      );
    `);
  }

  if (currentDbVersion < 2) {
    // Add join_month column and set default to current month for existing students
    const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-05"
    await db.execAsync(`
      ALTER TABLE students ADD COLUMN join_month TEXT DEFAULT '${currentMonthStr}';
    `);
  }

  if (currentDbVersion < 3) {
    await db.execAsync(`
      ALTER TABLE classes ADD COLUMN days_of_week TEXT DEFAULT '1,2,3,4,5,6';
      
      CREATE TABLE IF NOT EXISTS extra_classes (
        id TEXT PRIMARY KEY NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        timing TEXT NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      );
    `);
  }

  if (currentDbVersion < 4) {
    await db.execAsync(`
      ALTER TABLE classes ADD COLUMN weekly_schedule TEXT;
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
