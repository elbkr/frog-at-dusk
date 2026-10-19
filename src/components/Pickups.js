import * as THREE from 'three';
import { MAP_SIZE, TILE_SIZE } from './Map.js';
import { worldObstacles } from './Environment.js';
import { houseBoxes } from './House.js';
import { addPoints, setScoreMultiplier } from './Score.js';
import { overlaps, overlapsBox } from './Collision.js';
import { achievementEvent } from './Achievements.js';
import { playTone } from './Audio.js';
import { setMovementAbility } from './Player.js';
import { getAbilityDuration } from './Upgrades.js';

const pickups = [];
const playerAura = new THREE.Mesh(new THREE.SphereGeometry(19, 16, 12), new THREE.MeshBasicMaterial({ color: 0x72fff0, transparent: true, opacity: 0.3, wireframe: true }));
let sceneRef;
let spawnTimer = 3;
let collected = 0;
let activeAbility = null;
let abilityTime = 0;
let shield = false;

function freeSpot(radius = 12) {
  const min = -MAP_SIZE / 2 + TILE_SIZE / 2;
  const count = MAP_SIZE / TILE_SIZE;
  for (let i = 0; i < 80; i++) {
    const x = min + Math.floor(Math.random() * count) * TILE_SIZE;
    const y = min + Math.floor(Math.random() * count) * TILE_SIZE;
    if (Math.hypot(x, y) < 110 || overlaps({ x, y }, radius, worldObstacles) || houseBoxes.some((box) => overlapsBox({ x, y }, radius, box))) continue;
    return { x, y };
  }
  return null;
}

function spawn(kind = 'firefly') {
  const position = freeSpot();
  if (!position || !sceneRef) return;
  const color = kind === 'firefly' ? 0xffef77 : ({ shield: 0x70edff, cloak: 0xb782ff, boost: 0xffad4d, moonJump: 0xd8c7ff, pondLeap: 0x6ed9d0 })[kind];
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(kind === 'firefly' ? 6 : 9, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.3 }));
  mesh.position.set(position.x, position.y, 12);
  sceneRef.add(mesh);
  pickups.push({ mesh, kind, baseZ: 12, phase: Math.random() * Math.PI * 2 });
}

function removePickup(item) {
  item.mesh.removeFromParent();
  item.mesh.geometry.dispose();
  item.mesh.material.dispose();
}

export function initPickups(scene) {
  sceneRef = scene;
  scene.add(playerAura);
  spawn('firefly');
  spawn('firefly');
}

export function updatePickups(delta, player, nightMix) {
  spawnTimer -= delta;
  if (spawnTimer <= 0 && pickups.length < 7) {
    const power = Math.random() < 0.34;
    spawn(power ? ['shield', 'cloak', 'boost', 'moonJump', 'pondLeap'][Math.floor(Math.random() * 5)] : 'firefly');
    spawnTimer = power ? 11 : Math.max(4, 11 - nightMix * 5);
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const item = pickups[i];
    item.phase += delta * 2;
    item.mesh.position.z = item.baseZ + Math.sin(item.phase) * 2.2;
    item.mesh.rotation.z += delta * 0.8;
    if (Math.hypot(item.mesh.position.x - player.position.x, item.mesh.position.y - player.position.y) < 18) {
      removePickup(item);
      pickups.splice(i, 1);
      if (item.kind === 'firefly') { collected++; addPoints(10); achievementEvent('firefly', collected); playTone('pickup'); }
      else { activate(item.kind); playTone('power'); }
    }
  }
  if (abilityTime > 0) {
    abilityTime = Math.max(0, abilityTime - delta);
    if (abilityTime === 0) {
      activeAbility = null;
      setMovementAbility(null);
      playerAura.visible = shield;
      setScoreMultiplier(1);
    }
  }
  playerAura.position.copy(player.position);
  playerAura.position.z = 19;
  playerAura.visible = shield || Boolean(activeAbility);
  playerAura.material.color.setHex(
    shield ? 0x70edff : activeAbility === 'moonJump' ? 0xd8c7ff : activeAbility === 'pondLeap' ? 0x6ed9d0 : 0xb782ff
  );
  playerAura.material.opacity = activeAbility === 'cloak' ? 0.18 : 0.32;
}

function activate(kind) {
  if (kind === 'shield') shield = true;
  else { activeAbility = kind; abilityTime = getAbilityDuration(); }
  setMovementAbility(kind === 'moonJump' || kind === 'pondLeap' ? kind : null);
  achievementEvent('ability', kind);
  if (kind === 'boost') setScoreMultiplier(2);
}

export function absorbHit() {
  if (shield) { shield = false; return true; }
  return activeAbility === 'cloak' && abilityTime > 0;
}

export function getNearestFirefly(position) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const item of pickups) {
    if (item.kind !== 'firefly') continue;
    const distance = Math.hypot(item.mesh.position.x - position.x, item.mesh.position.y - position.y);
    if (distance < nearestDistance) { nearest = item.mesh.position; nearestDistance = distance; }
  }
  return nearest;
}

export function consumeFireflyAt(position, radius = 14) {
  const index = pickups.findIndex((item) => item.kind === 'firefly' && Math.hypot(item.mesh.position.x - position.x, item.mesh.position.y - position.y) < radius);
  if (index < 0) return false;
  removePickup(pickups[index]);
  pickups.splice(index, 1);
  return true;
}

export function getPickupStatus() { return { collected, shield, ability: activeAbility, abilityTime }; }

export function resetPickups() {
  for (const item of pickups) removePickup(item);
  pickups.length = 0;
  spawnTimer = 3;
  collected = 0;
  shield = false;
  activeAbility = null;
  abilityTime = 0;
  setMovementAbility(null);
  setScoreMultiplier(1);
  playerAura.visible = false;
  if (sceneRef) { spawn('firefly'); spawn('firefly'); }
}
