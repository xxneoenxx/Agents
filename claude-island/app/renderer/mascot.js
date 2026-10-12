'use strict'

// Mini-Claude: die Figur der Insel, das Claude-Code-Maskottchen in Pixeln.
// Reines CSS; hier nur Aufbau, Blicke und Blinzeln. Jedes Element mit
// [data-mascot] wird zu einer Figur. Stimmung (data-mood), Figur-Modus
// (data-figure: nur Kopf oder ganz) und Auf-/Zuklappen setzt #island, die
// Verwandlung vom Kopf zum ganzen Mini-Claude läuft dann von selbst in CSS.
//
// Die Augen laufen in requestAnimationFrame, also genau so oft, wie der
// Monitor Bilder zeigt (60 Hz am Laptop, 144 Hz am Monitor). Die Glättung
// rechnet mit der echten Zeit zwischen zwei Bildern, damit der Blick bei
// jeder Bildrate gleich schnell folgt.

const Mascot = (() => {
  const LOOK_RANGE = 260 // DIP Abstand, ab dem die Augen ganz zur Seite schauen
  const FOLLOW_MS = 55 // Zeitkonstante der Glättung
  const REACH_X = 0.05 // em (0,8 Pixel), wie weit die Augen zur Seite gehen
  const REACH_Y = 0.0375
  const figures = []
  let frame = 0
  let lastTime = 0
  let lastCursor = null

  const limb = (kind) => `<span class="mascot__limb mascot__limb--${kind}"><span class="mascot__px"></span></span>`

  function build(el) {
    el.classList.add('mascot')
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML = `
      <span class="mascot__rig">
        <span class="mascot__legs">${limb('leg1')}${limb('leg2')}${limb('leg3')}${limb('leg4')}</span>
        <span class="mascot__upper">
          <span class="mascot__spark"></span>
          ${limb('arm-l')}${limb('arm-r')}
          <span class="mascot__body">
            <span class="mascot__face">
              <span class="mascot__eye mascot__eye--l"></span>
              <span class="mascot__eye mascot__eye--r"></span>
            </span>
          </span>
          <span class="mascot__sweat"></span>
        </span>
        <span class="mascot__zzz"><span>z</span><span>z</span><span>z</span></span>
        <span class="mascot__sparkle mascot__sparkle--l"></span>
        <span class="mascot__sparkle mascot__sparkle--r"></span>
      </span>`
    figures.push({ el, face: el.querySelector('.mascot__face'), x: 0, y: 0, tx: 0, ty: 0 })
  }

  // cursor: Mausposition und Fensterecke in Bildschirm-DIP, zoom: CSS-px → DIP.
  function look(cursor) {
    lastCursor = cursor
    const zoom = cursor.zoom || 1
    for (const f of figures) {
      if (!f.el.offsetParent) continue
      // Gezielt wird von der Augenhöhe aus, nicht von der Mitte der Figur.
      const r = f.face.getBoundingClientRect()
      const cx = cursor.wx + (r.left + r.width / 2) * zoom
      const cy = cursor.wy + (r.top + r.height * 0.35) * zoom
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, dist / LOOK_RANGE)
      f.tx = (dx / dist) * reach
      f.ty = (dy / dist) * reach
    }
    if (!frame) {
      lastTime = performance.now()
      frame = requestAnimationFrame(step)
    }
  }

  // Nach Auf-/Zuklappen oder Stimmungswechsel stehen die Figuren woanders:
  // mit der letzten Mausposition neu zielen.
  function refresh() {
    if (lastCursor) look(lastCursor)
  }

  function step(now) {
    const dt = Math.min(64, Math.max(0, now - lastTime))
    lastTime = now
    const k = 1 - Math.exp(-dt / FOLLOW_MS)
    let moving = false
    for (const f of figures) {
      f.x += (f.tx - f.x) * k
      f.y += (f.ty - f.y) * k
      if (Math.abs(f.tx - f.x) > 0.002 || Math.abs(f.ty - f.y) > 0.002) moving = true
      else {
        f.x = f.tx
        f.y = f.ty
      }
      f.face.style.transform = `translate3d(${(f.x * REACH_X).toFixed(4)}em, ${(f.y * REACH_Y).toFixed(4)}em, 0)`
    }
    // Nur so lange Bilder anfordern, wie sich etwas bewegt: in Ruhe kostet es nichts.
    frame = moving ? requestAnimationFrame(step) : 0
  }

  function blinkLoop() {
    const wait = 2400 + Math.random() * 3800
    setTimeout(() => {
      for (const f of figures) f.el.classList.add('is-blinking')
      setTimeout(() => {
        for (const f of figures) f.el.classList.remove('is-blinking')
        blinkLoop()
      }, 130)
    }, wait)
  }

  function init() {
    document.querySelectorAll('[data-mascot]').forEach(build)
    blinkLoop()
  }

  return { init, look, refresh }
})()
