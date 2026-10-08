'use strict'

// Funke: die Figur der Insel. Reines CSS; hier nur Aufbau, Blicke und Blinzeln.
// Jedes Element mit [data-funke] wird zu einer Figur, ihre Stimmung setzt das
// data-mood eines Vorfahren (#island) über CSS.

const Funke = (() => {
  const LOOK_RANGE = 260 // px Abstand, ab dem die Pupillen ganz zur Seite schauen
  const figures = []

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
    figures.push(el)
  }

  // Bildschirmkoordinaten (DIP) der Maus → Blickrichtung je Figur.
  function look(cursor) {
    for (const el of figures) {
      if (!el.offsetParent) continue
      const r = el.getBoundingClientRect()
      const cx = window.screenX + r.left + r.width / 2
      const cy = window.screenY + r.top + r.height * 0.55
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, dist / LOOK_RANGE)
      el.style.setProperty('--look-x', ((dx / dist) * reach).toFixed(3))
      el.style.setProperty('--look-y', ((dy / dist) * reach).toFixed(3))
    }
  }

  function blinkLoop() {
    const wait = 2400 + Math.random() * 3800
    setTimeout(() => {
      for (const el of figures) el.classList.add('is-blinking')
      setTimeout(() => {
        for (const el of figures) el.classList.remove('is-blinking')
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
