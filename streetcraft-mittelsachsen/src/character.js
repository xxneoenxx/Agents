// Blockfiguren im Minecraft-Skin-Format: Spielerfigur, Hand in der Ich-Perspektive, Zombies, Skelette.

import * as THREE from 'three';
import { boxUV, SKIN_PARTS } from './textures.js';

export const PX = 1.8 / 32; // ein Skin-Pixel in Metern (Figur ist 1,8 m groß)
const FACE_SHADE = [0.8, 0.8, 1, 0.55, 0.9, 0.7];

// Box mit Skin-UVs. Reihenfolge der Seiten in three.js: +x, -x, +y, -y, +z, -z.
// Die Figur schaut nach +z, ihre rechte Seite ist -x.
export function skinBoxGeometry(w, h, d, uv, texW = 64, texH = 64) {
  const geo = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
  const f = boxUV(uv[0], uv[1], w, h, d);
  const order = [f.left, f.right, f.top, f.bottom, f.front, f.back];
  const attr = geo.attributes.uv;
  order.forEach(([x, y, fw, fh], i) => {
    const u0 = x / texW;
    const u1 = (x + fw) / texW;
    const v0 = 1 - y / texH;
    const v1 = 1 - (y + fh) / texH;
    attr.setXY(i * 4 + 0, u0, v0);
    attr.setXY(i * 4 + 1, u1, v0);
    attr.setXY(i * 4 + 2, u0, v1);
    attr.setXY(i * 4 + 3, u1, v1);
  });
  attr.needsUpdate = true;
  return geo;
}

export function skinTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  return tex;
}

export function skinMaterials(overlay, tex) {
  return FACE_SHADE.map((s) => overlay.shaded({ map: tex, alphaTest: 0.5 }, s));
}

// Menschliche Figur. armW = Armbreite in Pixeln (Skelette haben 2).
export function buildHumanoid(mats, opts = {}) {
  const legacy = !!opts.legacy;
  const limbW = opts.limbW || 4;
  const texH = legacy ? 32 : 64;
  const group = new THREE.Group();
  const part = (name, w, h, d, pivot, offset) => {
    const def = SKIN_PARTS[name];
    const uv = legacy && def.legacy ? def.legacy : def.uv;
    const geo = skinBoxGeometry(w, h, d, uv, 64, texH);
    geo.translate(offset[0] * PX, offset[1] * PX, offset[2] * PX);
    const mesh = new THREE.Mesh(geo, mats);
    const pivotObj = new THREE.Group();
    pivotObj.position.set(pivot[0] * PX, pivot[1] * PX, pivot[2] * PX);
    pivotObj.add(mesh);
    group.add(pivotObj);
    return pivotObj;
  };
  const parts = {
    head: part('head', 8, 8, 8, [0, 24, 0], [0, 4, 0]),
    body: part('body', 8, 12, 4, [0, 12, 0], [0, 6, 0]),
    // rechte Seite der Figur ist -x
    rightArm: part('rightArm', limbW, 12, limbW, [-4 - limbW / 2, 22, 0], [0, -4, 0]),
    leftArm: part('leftArm', limbW, 12, limbW, [4 + limbW / 2, 22, 0], [0, -4, 0]),
    rightLeg: part('rightLeg', limbW, 12, limbW, [-2, 12, 0], [0, -6, 0]),
    leftLeg: part('leftLeg', limbW, 12, limbW, [2, 12, 0], [0, -6, 0]),
  };
  return { group, parts };
}

// Lauf- und Schlaganimation für eine Figur.
export function animateHumanoid(parts, walkPhase, walkAmount, swing, armsForward = false) {
  const a = Math.sin(walkPhase) * 0.8 * walkAmount;
  parts.rightLeg.rotation.x = a;
  parts.leftLeg.rotation.x = -a;
  if (armsForward) {
    parts.rightArm.rotation.x = -Math.PI / 2 + a * 0.2;
    parts.leftArm.rotation.x = -Math.PI / 2 - a * 0.2;
  } else {
    parts.rightArm.rotation.x = -a;
    parts.leftArm.rotation.x = a;
  }
  if (swing > 0) {
    const s = Math.sin(swing * Math.PI);
    parts.rightArm.rotation.x = -1.6 * s - 0.3;
    parts.rightArm.rotation.z = 0.3 * s;
  } else {
    parts.rightArm.rotation.z = 0;
  }
}

// Spielerfigur + Hand für die Ich-Perspektive.
export class PlayerCharacter {
  constructor(overlay) {
    this.overlay = overlay;
    this.root = new THREE.Group();
    overlay.scene.add(this.root);
    this.hand = new THREE.Group();
    overlay.handScene.add(this.hand);
    this.walkPhase = 0;
    this.walkAmount = 0;
    this.swing = 0;
    this.jump = 0;
    this.heldId = undefined;
  }

  setSkin(canvas) {
    const legacy = canvas.height === 32;
    if (this.texture) this.texture.dispose();
    this.texture = skinTexture(canvas);
    this.mats = skinMaterials(this.overlay, this.texture);
    this.root.clear();
    const { group, parts } = buildHumanoid(this.mats, { legacy });
    this.model = group;
    this.parts = parts;
    this.root.add(group);
    this.heldObj = null;
    this.heldId = undefined;
    // Hand für die Ich-Perspektive
    this.hand.clear();
    const def = SKIN_PARTS.rightArm;
    const armGeo = skinBoxGeometry(4, 12, 4, def.uv, 64, legacy ? 32 : 64);
    this.armMesh = new THREE.Mesh(armGeo, this.mats);
    this.armPivot = new THREE.Group();
    this.armPivot.add(this.armMesh);
    this.handItemPivot = new THREE.Group();
    this.hand.add(this.armPivot, this.handItemPivot);
    this.handItem = null;
  }

  setHeld(id) {
    if (id === this.heldId) return;
    this.heldId = id;
    if (this.heldObj) this.parts.rightArm.remove(this.heldObj);
    if (this.handItem) this.handItemPivot.remove(this.handItem);
    this.heldObj = null;
    this.handItem = null;
    if (!id) return;
    this.heldObj = this.overlay.itemObject(id, 0.28);
    this.heldObj.position.set(0, -10 * PX, 3 * PX);
    this.heldObj.rotation.set(0, Math.PI / 2, 0);
    this.parts.rightArm.add(this.heldObj);
    this.handItem = this.overlay.itemObject(id, 0.12);
    this.handItemPivot.add(this.handItem);
  }

  // pos: Fußpunkt; heading/pitch in Grad.
  update(dt, pos, headingDeg, pitchDeg, moving, thirdPerson) {
    this.walkAmount += ((moving ? 1 : 0) - this.walkAmount) * Math.min(1, dt * 8);
    this.walkPhase += dt * 9 * this.walkAmount;
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 3.5);
    if (this.jump > 0) this.jump = Math.max(0, this.jump - dt * 2.2);
    const jumpY = Math.sin(this.jump * Math.PI) * 0.6;
    this.root.visible = thirdPerson;
    this.hand.visible = !thirdPerson;
    if (!this.parts) return;
    this.root.position.set(pos.x, pos.y + jumpY, pos.z);
    this.root.rotation.y = Math.PI - (headingDeg * Math.PI) / 180;
    this.parts.head.rotation.x = (-pitchDeg * Math.PI) / 180 * 0.8;
    animateHumanoid(this.parts, this.walkPhase, this.walkAmount, this.swing);

    // Ich-Perspektive: Arm unten rechts im Bild
    const s = this.swing > 0 ? Math.sin(this.swing * Math.PI) : 0;
    const bob = Math.sin(this.walkPhase) * 0.02 * this.walkAmount;
    if (this.handItem) {
      this.armPivot.visible = false;
      this.handItemPivot.position.set(0.3 - s * 0.1, -0.24 + bob + s * 0.06, -0.55 - s * 0.1);
      this.handItemPivot.rotation.set(-0.2 - s * 0.9, -0.6, 0.1);
    } else {
      this.armPivot.visible = true;
      this.armPivot.scale.setScalar(0.42);
      this.armPivot.position.set(0.32 - s * 0.1, -0.3 + bob + s * 0.08, -0.5 - s * 0.08);
      this.armPivot.rotation.set(-1.3 - s * 0.6, 0.3, 0.2);
    }
  }

  doSwing() {
    if (this.swing <= 0.3) this.swing = 1;
  }

  doJump() {
    if (this.jump <= 0) this.jump = 1;
  }
}
