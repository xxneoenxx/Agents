import Phaser from 'phaser';

// WorldScene: die eigentliche Spielwelt. In Phase 0 nur eine "Hallo Welt"-
// Platzhalterszene mit warmem Hintergrund, Boden, Sonne und einem Titel --
// alles programmatisch gezeichnet (keine externen Assets).
export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Himmel-Verlauf (warm) via Grafik-Rechtecke.
    this.drawSky(width, height);

    // Sonne oben rechts.
    this.add.circle(width - 70, 80, 44, 0xffe08a).setAlpha(0.9);

    // Boden / Strasse.
    const groundY = height * 0.72;
    this.add.rectangle(width / 2, (groundY + height) / 2, width, height - groundY, 0x8fce6a);
    this.add.rectangle(width / 2, groundY, width, 6, 0x6fae4c);

    // Platzhalter-"Stand" (einfaches Haeuschen aus Formen).
    this.drawStand(width / 2, groundY);

    // Titel + Hinweis (im Spiel sichtbarer Text auf Deutsch).
    this.add
      .text(width / 2, height * 0.16, "Bella's Food Empire", {
        fontFamily: 'Nunito, Arial, sans-serif',
        fontSize: '32px',
        fontStyle: '900',
        color: '#3A2A1F',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.16 + 34, 'Phase 0 - Geruest laeuft', {
        fontFamily: 'Nunito, Arial, sans-serif',
        fontSize: '16px',
        fontStyle: '700',
        color: '#7A6353',
      })
      .setOrigin(0.5);

    // Auf Groessenaenderung (Rotation/Resize) reagieren: Szene neu zeichnen.
    this.scale.on('resize', this.handleResize, this);
  }

  private drawSky(width: number, height: number): void {
    // Zwei ueberlagerte Rechtecke als einfacher Verlauf-Ersatz.
    this.add.rectangle(width / 2, height / 2, width, height, 0xffc24b);
    this.add
      .rectangle(width / 2, height * 0.72, width, height * 0.55, 0xff8a3d)
      .setAlpha(0.55)
      .setOrigin(0.5, 1);
  }

  private drawStand(cx: number, baseY: number): void {
    const stand = this.add.container(cx, baseY);
    // Korpus
    stand.add(this.add.rectangle(0, -50, 120, 80, 0xfffdf7).setStrokeStyle(4, 0x3a2a1f));
    // Dach (rot-weiss gestreift, angedeutet)
    stand.add(this.add.rectangle(0, -96, 140, 22, 0xff5c5c).setStrokeStyle(4, 0x3a2a1f));
    // Theke
    stand.add(this.add.rectangle(0, -12, 130, 16, 0xffc72c).setStrokeStyle(4, 0x3a2a1f));
    // Emoji-Schild als Platzhalter
    stand.add(
      this.add
        .text(0, -54, '🍋', { fontSize: '34px' })
        .setOrigin(0.5),
    );
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Simple Neu-Initialisierung fuer die Platzhalterszene.
    this.cameras.resize(gameSize.width, gameSize.height);
    this.scene.restart();
  }
}
