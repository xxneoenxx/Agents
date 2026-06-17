import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// SQLite-Datenbank für Kinokarten-Buchungen inkl. Sitzplatz-Sperrung.
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "bookings.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      reference   TEXT    NOT NULL UNIQUE,
      showtime_id TEXT    NOT NULL,
      movie_id    TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      time        TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL,
      phone       TEXT    NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS booked_seats (
      showtime_id TEXT    NOT NULL,
      seat_id     TEXT    NOT NULL,
      booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      PRIMARY KEY (showtime_id, seat_id)
    );
  `);
  return db;
}

export function getBookedSeats(showtimeId: string): string[] {
  const rows = getDb()
    .prepare("SELECT seat_id FROM booked_seats WHERE showtime_id = ?")
    .all(showtimeId) as { seat_id: string }[];
  return rows.map((r) => r.seat_id);
}

export type BookingInput = {
  showtimeId: string;
  movieId: string;
  date: string;
  time: string;
  seats: string[];
  name: string;
  email: string;
  phone: string;
  totalCents: number;
};

export type BookingResult =
  | { ok: true; reference: string; id: number }
  | { ok: false; reason: "seat_taken"; takenSeats: string[] };

function makeReference(): string {
  const chars = "ACDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CS-${s}`;
}

// Erstellt eine Buchung in einer Transaktion. Schlägt fehl, wenn einer der
// gewünschten Sitze bereits vergeben ist (Schutz vor Doppelbuchung).
export function createBooking(input: BookingInput): BookingResult {
  const database = getDb();

  const tx = database.transaction((): BookingResult => {
    // Bereits vergebene Sitze prüfen
    const placeholders = input.seats.map(() => "?").join(",");
    const taken = database
      .prepare(
        `SELECT seat_id FROM booked_seats WHERE showtime_id = ? AND seat_id IN (${placeholders})`,
      )
      .all(input.showtimeId, ...input.seats) as { seat_id: string }[];

    if (taken.length > 0) {
      return { ok: false, reason: "seat_taken", takenSeats: taken.map((t) => t.seat_id) };
    }

    const reference = makeReference();
    const info = database
      .prepare(
        `INSERT INTO bookings (reference, showtime_id, movie_id, date, time, name, email, phone, total_cents)
         VALUES (@reference, @showtimeId, @movieId, @date, @time, @name, @email, @phone, @totalCents)`,
      )
      .run({ ...input, reference });

    const bookingId = info.lastInsertRowid as number;
    const seatStmt = database.prepare(
      "INSERT INTO booked_seats (showtime_id, seat_id, booking_id) VALUES (?, ?, ?)",
    );
    for (const seat of input.seats) seatStmt.run(input.showtimeId, seat, bookingId);

    return { ok: true, reference, id: bookingId };
  });

  return tx();
}
