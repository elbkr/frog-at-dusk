import * as THREE from 'three';
import { player } from './Player.js';
import { enemies } from './Enemy.js';
import { addKill } from './Score.js';
import { difficulty } from './Difficulty.js';
import { achievementEvent } from './Achievements.js';
import { getAttackReachMultiplier } from './Upgrades.js';

// Starting values; cooldown shrinks and radius grows with difficulty.player
const ATTACK_COOLDOWN = 1; // seconds between attacks
const ATTACK_RADIUS = 30;
const ATTACK_FADE_TIME = 0.3; // seconds the circle takes to fade out

// The circle is a child of the player so it stays centred on Tode while hopping
const circle = new THREE.Mesh(
  new THREE.CircleGeometry(ATTACK_RADIUS, 48),
  new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
);
circle.position.z = 0.25; // just above the ground so it doesn't flicker against it
circle.visible = false;
player.add(circle);

const particlePool = Array.from({ length: 18 }, () => {
  const particle = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd66e, transparent: true, opacity: 0 })
  );
  particle.visible = false;
  player.add(particle);
  return particle;
});
const particleState = particlePool.map(() => ({ life: 0, vx: 0, vy: 0 }));
let cooldown = 0;
let fadeTimer = 0;
const defeatedTypes = new Set();

function burst(position) {
  let emitted = 0;
  for (let i = 0; i < particlePool.length && emitted < 6; i++) {
    if (particleState[i].life > 0) continue;
    const particle = particlePool[i];
    const angle = Math.random() * Math.PI * 2;
    particle.position.set(position.x - player.position.x, position.y - player.position.y, 4);
    particle.scale.setScalar(1);
    particle.visible = true;
    particle.material.opacity = 0.9;
    particleState[i] = { life: 0.45, vx: Math.cos(angle) * 70, vy: Math.sin(angle) * 70 };
    emitted++;
  }
}

export function triggerAttack() {
  if (cooldown > 0) return;
  cooldown = ATTACK_COOLDOWN / difficulty.player;

  const radius = ATTACK_RADIUS * difficulty.player * getAttackReachMultiplier();
  // The geometry is built at the base radius, so scale it up to the current reach
  circle.scale.setScalar(radius / ATTACK_RADIUS);

  fadeTimer = ATTACK_FADE_TIME;
  circle.visible = true;
  circle.material.opacity = 0.6;

  // An enemy is hit if its footprint touches the attack circle.
  // Iterate backwards so removing items doesn't skip the next one.
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const distance = Math.hypot(
      enemy.position.x - player.position.x,
      enemy.position.y - player.position.y
    );

    if (distance < radius + enemy.radius) {
      burst(enemy.position);
      enemy.group.removeFromParent();
      enemies.splice(i, 1);
      addKill(enemy.type);
      defeatedTypes.add(enemy.type);
      achievementEvent('enemyType', defeatedTypes.size);
    }
  }
}

export function resetAttack() {
  cooldown = 0;
  fadeTimer = 0;
  circle.visible = false;
  defeatedTypes.clear();
  for (let i = 0; i < particlePool.length; i++) {
    particleState[i].life = 0;
    particlePool[i].visible = false;
  }
}

export function updateAttack(delta) {
  cooldown = Math.max(0, cooldown - delta);

  if (fadeTimer > 0) {
    fadeTimer = Math.max(0, fadeTimer - delta);
    circle.material.opacity = 0.6 * (fadeTimer / ATTACK_FADE_TIME);
    if (fadeTimer === 0) circle.visible = false;
  }
  for (let i = 0; i < particlePool.length; i++) {
    const state = particleState[i];
    if (state.life <= 0) continue;
    state.life = Math.max(0, state.life - delta);
    particlePool[i].position.x += state.vx * delta;
    particlePool[i].position.y += state.vy * delta;
    particlePool[i].position.z += 18 * delta;
    particlePool[i].scale.setScalar(Math.max(0.2, state.life / 0.45));
    particlePool[i].material.opacity = state.life / 0.45;
    if (state.life === 0) particlePool[i].visible = false;
  }
}
