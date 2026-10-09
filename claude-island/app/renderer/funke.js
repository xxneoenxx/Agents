'use strict'

// Funke: die Figur der Insel. Reines CSS; hier nur Aufbau, Blicke und Blinzeln.
// Jedes Element mit [data-funke] wird zu einer Figur, ihre Stimmung setzt das
// data-mood eines Vorfahren (#island) über CSS.
//
// Die Pupillen laufen in requestAnimationFrame, also genau so oft, wie der
// Monitor Bilder zeigt (60 Hz am Laptop, 144 Hz am Monitor). Die Glättung
// rechnet mit der echten Zeit zwischen zwei Bildern, damit der Blick bei
// jeder Bildrate gleich schnell folgt.

const Funke = (() => {
  const LOOK_RANGE = 260 // DIP Abstand, ab dem die Pupillen ganz zur Seite schauen
  const FOLLOW_MS = 55 // Zeitkonstante der Glättung
  const REACH_X = 0.045 // em, wie weit die Pupille zur Seite geht
  const REACH_Y = 0.05
  const figures = []
  let frame = 0
  let lastTime = 0

  function build(el) {
    el.classList.add('funke')
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML = `
      <div class="funke__antenna"><span class="funke__stalk"></span><span class="funke__bulb"></span></div>
      <div class="funke__body">
        <span class="funke__brow funke__brow--l"></span>
        <span class="funke__brow funke__brow--r"></span>
        <span class="funke__eye funke__eye--l"><span class="funke__pupil"></span><span class="funke__lid"></span></span>
        <span class="funke__eye funke__eye--r"><span class="funke__pupil"></span><span class="funke__lid"></span></span>
        <span class="funke__cheek funke__cheek--l"></span>
        <span class="funke__cheek funke__cheek--r"></span>
        <span class="funke__mouth"></span>
      </div>
      <div class="funke__zzz"><span>z</span><span>z</span><span>z</span></div>`
    figures.push({ el, pupils: [...el.querySelectorAll('.funke__pupil')], x: 0, y: 0, tx: 0, ty: 0 })
  }

  // cursor: Mausposition und Fensterecke in Bildschirm-DIP; zoom: CSS-px → DIP.
  function look(cursor, zoom = 1) {
    for (const f of figures) {
      if (!f.el.offsetParent) continue
      const r = f.el.getBoundingClientRect()
      const cx = cursor.wx + (r.left + r.width / 2) * zoom
      const cy = cursor.wy + (r.top + r.height * 0.55) * zoom
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
      const t = `translate3d(${(f.x * REACH_X).toFixed(4)}em, ${(f.y * REACH_Y).toFixed(4)}em, 0)`
      for (const p of f.pupils) p.style.transform = t
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
    document.querySelectorAll('[data-funke]').forEach(build)
    blinkLoop()
  }

  return { init, look }
})()
