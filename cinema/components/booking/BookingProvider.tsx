"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Movie, Showtime } from "@/lib/cinema";
import { BookingModal } from "./BookingModal";

type BookingContextValue = {
  open: (movie: Movie, showtime?: Showtime) => void;
  close: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking muss innerhalb von BookingProvider verwendet werden.");
  return ctx;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [initialShowtime, setInitialShowtime] = useState<Showtime | undefined>();

  const open = useCallback((m: Movie, showtime?: Showtime) => {
    setMovie(m);
    setInitialShowtime(showtime);
  }, []);

  const close = useCallback(() => {
    setMovie(null);
    setInitialShowtime(undefined);
  }, []);

  return (
    <BookingContext.Provider value={{ open, close }}>
      {children}
      <BookingModal movie={movie} initialShowtime={initialShowtime} onClose={close} />
    </BookingContext.Provider>
  );
}
