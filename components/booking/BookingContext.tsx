"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { BookingModal } from "./BookingModal";
import { CallbackModal } from "../widgets/CallbackModal";

type BookingCtx = {
  openBooking: (presetService?: string) => void;
  openCallback: () => void;
};

const Ctx = createContext<BookingCtx | null>(null);

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking muss innerhalb von <BookingProvider> verwendet werden");
  return ctx;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>(undefined);

  const openBooking = useCallback((presetService?: string) => {
    setPreset(presetService);
    setBookingOpen(true);
  }, []);
  const openCallback = useCallback(() => setCallbackOpen(true), []);

  return (
    <Ctx.Provider value={{ openBooking, openCallback }}>
      {children}
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} presetService={preset} />
      <CallbackModal open={callbackOpen} onClose={() => setCallbackOpen(false)} />
    </Ctx.Provider>
  );
}
