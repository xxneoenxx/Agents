import Phaser from 'phaser';

// Kamera-Steuerung: Ziehen zum Schwenken (Maus/Touch), Scrollrad und Pinch zum
// Zoomen, weiche Grenzen ueber Kamera-Bounds sowie sanftes Zentrieren.

export interface CameraOptions {
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  focusX: number;
  focusY: number;
}

export class CameraController {
  private isPinching = false;
  private lastPinchDist = 0;

  private readonly onMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onWheel: (
    pointer: Phaser.Input.Pointer,
    over: unknown,
    dx: number,
    dy: number,
  ) => void;

  constructor(
    private scene: Phaser.Scene,
    private opts: CameraOptions,
  ) {
    // Zwei Zeiger fuer Pinch erlauben.
    scene.input.addPointer(1);

    const cam = scene.cameras.main;
    cam.setZoom(opts.defaultZoom);
    cam.centerOn(opts.focusX, opts.focusY);

    this.onMove = (pointer) => this.handleMove(pointer);
    this.onWheel = (_p, _o, _dx, dy) => this.handleWheel(dy);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('wheel', this.onWheel);
  }

  /** Kamera-Grenzen (Weltausdehnung) setzen -- clamped Panning. */
  setBounds(x: number, y: number, width: number, height: number): void {
    this.scene.cameras.main.setBounds(x, y, width, height);
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    const cam = this.scene.cameras.main;
    const p1 = this.scene.input.pointer1;
    const p2 = this.scene.input.pointer2;

    // Pinch-Zoom bei zwei aktiven Zeigern.
    if (p1.isDown && p2.isDown) {
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (!this.isPinching) {
        this.isPinching = true;
        this.lastPinchDist = dist;
        return;
      }
      const delta = dist - this.lastPinchDist;
      this.lastPinchDist = dist;
      this.setZoom(cam.zoom + delta * 0.004);
      return;
    }
    this.isPinching = false;

    // Einfingriges/Maus-Ziehen zum Schwenken.
    if (pointer.isDown) {
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    }
  }

  private handleWheel(dy: number): void {
    const cam = this.scene.cameras.main;
    this.setZoom(cam.zoom - dy * 0.001);
  }

  private setZoom(z: number): void {
    const clamped = Phaser.Math.Clamp(z, this.opts.minZoom, this.opts.maxZoom);
    this.scene.cameras.main.setZoom(clamped);
  }

  /** Sanft auf den Fokuspunkt zentrieren und Standard-Zoom herstellen. */
  center(): void {
    const cam = this.scene.cameras.main;
    cam.pan(this.opts.focusX, this.opts.focusY, 350, 'Sine.easeInOut');
    cam.zoomTo(this.opts.defaultZoom, 350, 'Sine.easeInOut');
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('wheel', this.onWheel);
  }
}
