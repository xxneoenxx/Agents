"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Phone } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Label, Input, FieldError } from "../ui/Field";
import { callbackSchema, type CallbackInput } from "@/lib/schema";
import { callbackMailto } from "@/lib/mailto";
import { company } from "@/content/site";

const empty: CallbackInput = { name: "", phone: "", topic: "", website: "" };

export function CallbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<CallbackInput>(empty);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "fallback">("idle");

  useEffect(() => {
    if (open) {
      setData(empty);
      setErrors({});
      setStatus("idle");
    }
  }, [open]);

  const set = (patch: Partial<CallbackInput>) => setData((d) => ({ ...d, ...patch }));

  async function submit() {
    const parsed = callbackSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]]),
        ),
      );
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const out = await res.json();
      setStatus(res.ok && out.delivered ? "done" : "fallback");
    } catch {
      setStatus("fallback");
    }
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="Telefon" title="Rückruf anfordern">
      {status === "done" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-6 text-center"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-adr text-adr">
            <Check size={30} />
          </div>
          <h3 className="text-2xl text-papier">Wir rufen zurück</h3>
          <p className="mt-3 max-w-sm text-alu/80">
            Danke, {data.name.split(" ")[0]}. Wir melden uns schnellstmöglich unter {data.phone}.
          </p>
          <Button variant="outline" onClick={onClose} className="mt-7">
            Schließen
          </Button>
        </motion.div>
      ) : status === "fallback" ? (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="max-w-sm text-alu/80">
            Der automatische Versand ist gerade nicht verfügbar. Senden Sie Ihren Rückrufwunsch als
            E-Mail oder rufen Sie uns direkt an.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" href={callbackMailto(data)}>
              Als E-Mail senden
            </Button>
            <Button variant="outline" href={`tel:${company.phoneHref}`}>
              <Phone size={16} /> {company.phoneDisplay}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-alu/80">
            Lassen Sie Nummer und Anliegen da — wir rufen während unserer Sprechzeiten zurück.
          </p>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={data.website}
            onChange={(e) => set({ website: e.target.value })}
            className="hidden"
            aria-hidden="true"
          />
          <div>
            <Label htmlFor="cb-name">Name *</Label>
            <Input
              id="cb-name"
              value={data.name}
              onChange={(e) => set({ name: e.target.value })}
              aria-invalid={!!errors.name}
            />
            <FieldError msg={errors.name} />
          </div>
          <div>
            <Label htmlFor="cb-phone">Telefon *</Label>
            <Input
              id="cb-phone"
              type="tel"
              value={data.phone}
              onChange={(e) => set({ phone: e.target.value })}
              aria-invalid={!!errors.phone}
            />
            <FieldError msg={errors.phone} />
          </div>
          <div>
            <Label htmlFor="cb-topic">Thema (optional)</Label>
            <Input
              id="cb-topic"
              value={data.topic}
              onChange={(e) => set({ topic: e.target.value })}
              placeholder="z. B. Tankprüfung"
            />
          </div>
          <Button variant="primary" onClick={submit} disabled={status === "sending"} className="mt-2">
            {status === "sending" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Wird gesendet…
              </>
            ) : (
              "Rückruf anfordern"
            )}
          </Button>
        </div>
      )}
    </Modal>
  );
}
