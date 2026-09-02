import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// SQLite-Datenbank für Rückruf-Anfragen. Keine externe DB nötig – die Datei
// liegt unter /data/callbacks.db.
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "callbacks.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS callbacks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      reference   TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      company     TEXT,
      phone       TEXT    NOT NULL,
      email       TEXT,
      topic       TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      window      TEXT    NOT NULL,
      message     TEXT,
      status      TEXT    NOT NULL DEFAULT 'offen',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export type CallbackInput = {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  topic: string;
  date: string;
  window: string;
  message?: string;
};

export type Callback = CallbackInput & {
  id: number;
  reference: string;
  status: string;
  created_at: string;
};

function makeReference(): string {
  const chars = "ACDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `EL-${s}`;
}

// Anzahl bereits gebuchter Rückrufe in einem Zeitfenster (Kapazitätsprüfung).
export function countForSlot(date: string, window: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total FROM callbacks
       WHERE date = ? AND window = ? AND status != 'storniert'`,
    )
    .get(date, window) as { total: number };
  return row.total;
}

export function createCallback(input: CallbackInput): Callback {
  const database = getDb();
  const reference = makeReference();
  const info = database
    .prepare(
      `INSERT INTO callbacks (reference, name, company, phone, email, topic, date, window, message)
       VALUES (@reference, @name, @company, @phone, @email, @topic, @date, @window, @message)`,
    )
    .run({
      reference,
      name: input.name,
      company: input.company ?? null,
      phone: input.phone,
      email: input.email ?? null,
      topic: input.topic,
      date: input.date,
      window: input.window,
      message: input.message ?? null,
    });

  return database
    .prepare("SELECT * FROM callbacks WHERE id = ?")
    .get(info.lastInsertRowid as number) as Callback;
}
