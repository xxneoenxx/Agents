"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CallbackModal } from "./CallbackModal";

type CallbackContextValue = {
  open: (topic?: string) => void;
  close: () => void;
};

const CallbackContext = createContext<CallbackContextValue | null>(null);

export function useCallbackModal() {
  const ctx = useContext(CallbackContext);
  if (!ctx) throw new Error("useCallbackModal muss innerhalb von CallbackProvider verwendet werden.");
  return ctx;
}

export function CallbackProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [presetTopic, setPresetTopic] = useState<string | undefined>();

  const open = useCallback((topic?: string) => {
    setPresetTopic(topic);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CallbackContext.Provider value={{ open, close }}>
      {children}
      <CallbackModal open={isOpen} presetTopic={presetTopic} onClose={close} />
    </CallbackContext.Provider>
  );
}
