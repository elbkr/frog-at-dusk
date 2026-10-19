import * as THREE from 'three';
import { TILE_SIZE, SPAWN_POINTS } from './Map.js';

export const worldObstacles = [];
export const ponds = [];
const lanternLights = [];
const ripplePool = [];
let lastPondState = null;
const RIPPLE_DURATION = 0.56;
const RIPPLE_START_SIZE = 2;
const RIPPLE_END_SIZE = 14;

const positions = [
  [-240, -120, 'tree'], [240, -120, 'rock'], [-200, 200, 'rock'],
  [160, 200, 'tree'], [-80, -240, 'tree'], [80, 240, 'rock'],
  [-280, 80, 'tree'], [280, 80, 'rock'], [-120, 120, 'rock'], [200, -240, 'tree'],
];

function nearSpawn(x, y) {
  return [{ x: 0, y: 0 }, ...SPAWN_POINTS].some((p) => Math.hypot(p.x - x, p.y - y) < 100);
}

function makeTree(group, x, y, scale) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(4 * scale, 6 * scale, 24 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x70462c }));
  trunk.rotation.x = Math.PI / 2;
  trunk.position.set(x, y, 12 * scale);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(19 * scale, 42 * scale, 7), new THREE.MeshStandardMaterial({ color: [0x347044, 0x477c48, 0x285c43][Math.floor(Math.random() * 3)] }));
  crown.rotation.x = Math.PI / 2;
  crown.position.set(x, y, 39 * scale);
  group.add(trunk, crown);
}

function makeRock(group, x, y, scale) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(12 * scale, 0), new THREE.MeshStandardMaterial({ color: [0x777b76, 0x817664, 0x687768][Math.floor(Math.random() * 3)], flatShading: true }));
  rock.scale.set(1.35, 0.9, 0.8);
  rock.position.set(x, y, 8 * scale);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  group.add(rock);
}

export function createEnvironment(parent) {
  worldObstacles.length = 0;
  ponds.length = 0;
  ripplePool.length = 0;
  lastPondState = null;
  const group = new THREE.Group();
  for (const [x, y, kind] of positions) {
    if (nearSpawn(x, y)) continue;
    const scale = 0.8 + Math.random() * 0.45;
    if (kind === 'tree') makeTree(group, x, y, scale);
    else makeRock(group, x, y, scale);
    worldObstacles.push({ position: { x, y }, radius: kind === 'tree' ? 18 * scale : 14 * scale, type: kind });
  }

  for (const [x, y, rx, ry] of [[-120, -40, 42, 27], [120, 80, 35, 25]]) {
    if (nearSpawn(x, y)) continue;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0x174d62, roughness: 0.28, metalness: 0.15, transparent: true, opacity: 0.88 }));
    pond.scale.set(rx, ry, 1);
    pond.position.set(x, y, 0.35);
    group.add(pond);
    ponds.push({ x, y, rx, ry, mesh: pond });
  }

  lanternLights.length = 0;
  for (const [x, y] of [[-40, -160], [80, 160], [240, 0]]) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd887 }));
    lantern.position.set(x, y, 19);
    group.add(lantern);
    const glow = new THREE.PointLight(0xffbc65, 0, 105);
    glow.position.set(x, y, 21);
    group.add(glow);
    lanternLights.push(glow);
  }

  for (let i = 0; i < 3; i++) {
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 28), new THREE.MeshBasicMaterial({ color: 0xb4f6ec, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ripple.visible = false;
    ripple.position.z = 1.4;
    group.add(ripple);
    ripplePool.push({ mesh: ripple, expiresAt: 0 });
  }

  // Small non-blocking flowers at the edge of a few paths.
  const flowerGeo = new THREE.SphereGeometry(2.2, 7, 5);
  const flowerMat = new THREE.MeshBasicMaterial({ color: 0xe9bb63 });
  for (let i = 0; i < 28; i++) {
    const x = (Math.floor(Math.random() * 15) - 7) * TILE_SIZE;
    const y = (Math.floor(Math.random() * 15) - 7) * TILE_SIZE;
    if (nearSpawn(x, y)) continue;
    const flower = new THREE.Mesh(flowerGeo, flowerMat);
    flower.position.set(x, y, 2.5);
    group.add(flower);
  }
  parent.add(group);
  return group;
}

export function updateEnvironment(elapsed, night) {
  for (const pond of ponds) pond.mesh.material.emissive.setHex(night > 0.55 ? 0x06202c : 0x000000);
  for (const light of lanternLights) light.intensity = night * (0.72 + Math.sin(elapsed * 2 + light.position.x) * 0.035);
  for (const ripple of ripplePool) {
    const remaining = ripple.expiresAt - elapsed;
    if (remaining <= 0) { ripple.mesh.visible = false; ripple.mesh.material.opacity = 0; continue; }
    const life = 1 - remaining / RIPPLE_DURATION;
    ripple.mesh.visible = true;
    ripple.mesh.scale.setScalar(RIPPLE_START_SIZE + life * RIPPLE_END_SIZE);
    ripple.mesh.material.opacity = (1 - life) * 0.52;
  }
}

function pointInPond(position, pond) {
  const x = (position.x - pond.x) / pond.rx;
  const y = (position.y - pond.y) / pond.ry;
  return x * x + y * y <= 1;
}

export function isInPond(position) {
  return ponds.some((pond) => pointInPond(position, pond));
}

export function updatePondCrossing(position, elapsed) {
  const current = ponds.map((pond) => pointInPond(position, pond));
  if (lastPondState) {
    for (let i = 0; i < current.length; i++) {
      if (current[i] === lastPondState[i]) continue;
      const ripple = ripplePool.find((item) => item.expiresAt <= elapsed) || ripplePool[0];
      ripple.mesh.position.set(position.x, position.y, 1.4);
      ripple.expiresAt = elapsed + RIPPLE_DURATION;
      ripple.mesh.scale.setScalar(RIPPLE_START_SIZE);
      ripple.mesh.material.opacity = 0.52;
      ripple.mesh.visible = true;
    }
  }
  lastPondState = current;
}

export function resetPondEffects(position = { x: 0, y: 0 }) {
  lastPondState = ponds.map((pond) => pointInPond(position, pond));
  for (const ripple of ripplePool) {
    ripple.expiresAt = 0;
    ripple.mesh.scale.setScalar(RIPPLE_START_SIZE);
    ripple.mesh.material.opacity = 0;
    ripple.mesh.visible = false;
  }
}
