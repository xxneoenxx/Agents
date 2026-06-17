import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// Leichte SQLite-Datenbank für Tischreservierungen.
// Keine externe Datenbank nötig – die Datei liegt unter /data/reservations.db.
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, "reservations.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      email        TEXT    NOT NULL,
      phone        TEXT    NOT NULL,
      date         TEXT    NOT NULL,
      time         TEXT    NOT NULL,
      guests       INTEGER NOT NULL,
      occasion     TEXT,
      notes        TEXT,
      status       TEXT    NOT NULL DEFAULT 'neu',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export type ReservationInput = {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  occasion?: string;
  notes?: string;
};

export type Reservation = ReservationInput & {
  id: number;
  status: string;
  created_at: string;
};

export function createReservation(input: ReservationInput): Reservation {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO reservations (name, email, phone, date, time, guests, occasion, notes)
    VALUES (@name, @email, @phone, @date, @time, @guests, @occasion, @notes)
  `);
  const result = stmt.run({
    name: input.name,
    email: input.email,
    phone: input.phone,
    date: input.date,
    time: input.time,
    guests: input.guests,
    occasion: input.occasion ?? null,
    notes: input.notes ?? null,
  });

  const row = database
    .prepare("SELECT * FROM reservations WHERE id = ?")
    .get(result.lastInsertRowid as number) as Reservation;
  return row;
}

// Anzahl bereits eingegangener Reservierungen für ein Datum/Uhrzeit –
// dient als einfache Kapazitätsprüfung.
export function countGuestsForSlot(date: string, time: string): number {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT COALESCE(SUM(guests), 0) AS total
       FROM reservations
       WHERE date = ? AND time = ? AND status != 'storniert'`,
    )
    .get(date, time) as { total: number };
  return row.total;
}
