"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error-Boundary um die WebGL-/3D-Szene. Schlägt die 3D-Darstellung fehl
 * (kein WebGL, GPU-Kontextverlust, alte Geräte), wird ein eleganter statischer
 * Fallback gezeigt – die restliche Seite bleibt voll funktionsfähig.
 */
export class SceneBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[3D] Szene konnte nicht gerendert werden, Fallback aktiv:", error);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
