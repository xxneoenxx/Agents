// Kleiner, typsicherer Event-Bus (Single Source of Truth fuer Kommunikation
// zwischen Logik, Phaser-Darstellung und DOM-UI). Engine-unabhaengig.

export type EventHandler<T> = (payload: T) => void;

/**
 * Minimaler Emitter. Bewusst schlank gehalten, damit kein Framework noetig ist.
 * Verwendung:
 *   const bus = new EventBus<{ coinsChanged: number }>();
 *   bus.on('coinsChanged', (n) => ...);
 *   bus.emit('coinsChanged', 42);
 */
export class EventBus<Events extends Record<string, unknown>> {
  private handlers: {
    [K in keyof Events]?: Set<EventHandler<Events[K]>>;
  } = {};

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    let set = this.handlers[event];
    if (!set) {
      set = new Set();
      this.handlers[event] = set;
    }
    set.add(handler);
    // Rueckgabe: Abmelde-Funktion
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.handlers[event]?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers[event]?.forEach((handler) => handler(payload));
  }

  clear(): void {
    this.handlers = {};
  }
}

// Zentrale Ereignis-Typen des Spiels. Wird in spaeteren Phasen erweitert.
export interface GameEvents extends Record<string, unknown> {
  coinsChanged: number;
}

// Gemeinsamer Bus fuer die gesamte App.
export const gameBus = new EventBus<GameEvents>();
