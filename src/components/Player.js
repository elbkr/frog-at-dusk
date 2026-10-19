import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getFootprintRadius, isBlocked, isBlockedByBoxes } from './Collision.js';
import { difficulty } from './Difficulty.js';
import { houseBoxes } from './House.js';
import { worldObstacles } from './Environment.js';
import { isInPond } from './Environment.js';
import { MAP_SIZE } from './Map.js';
import { achievementEvent } from './Achievements.js';

const MOVE_SPEED = 4; // jumps per second at the start; grows with difficulty.player
const JUMP_HEIGHT = 15;
const JUMP_DISTANCE = 40;

// Unit vectors on the ground plane and the model's facing angle (around world Z)
const DIRECTIONS = {
  forward: { x: 0, y: 1, rotation: Math.PI },
  backward: { x: 0, y: -1, rotation: 0 },
  left: { x: -1, y: 0, rotation: -Math.PI / 2 },
  right: { x: 1, y: 0, rotation: Math.PI / 2 },
};

export const player = new THREE.Group();
player.position.set(0, 0, 0);

let model = null;
let groundOffset = 0;
let radius = 0;

const loader = new GLTFLoader();

loader.load('/models/tode.glb', (gltf) => {
  model = gltf.scene;

  model.rotation.x = Math.PI / 2;
  model.scale.setScalar(20);

  // Lift the model so its lowest point rests on the ground (z = 0)
  const box = new THREE.Box3().setFromObject(model);
  groundOffset = -box.min.z;
  model.position.z = groundOffset;

  radius = getFootprintRadius(model);

  player.add(model);
});

export const movesQueue = [];

export function queueMove(direction) {
  movesQueue.push(direction);
}

const movement = {
  direction: null,
  progress: 0,
  completed: true,
  startX: 0,
  startY: 0,
  startRotation: 0,
  endRotation: 0,
};
let jumpCount = 0;
let rockHops = 0;
let movementAbility = null;

// The player as a collision shape: { position, radius }
export function getPlayerCollider() {
  return { position: player.position, radius };
}

export function resetPlayer() {
  player.position.set(0, 0, 0);
  player.visible = true;
  movesQueue.length = 0;
  movement.completed = true;
  jumpCount = 0;
  rockHops = 0;
  movementAbility = null;

  if (model) {
    model.position.z = groundOffset;
    model.rotation.y = 0;
  }
}

export function getJumpCount() { return jumpCount; }
export function setMovementAbility(ability) { movementAbility = ability; }

export function processInputQueue() {
  if (!movement.completed || movesQueue.length === 0) return;

  const direction = movesQueue.shift();
  const startRotation = model ? model.rotation.y : 0;
  // Turn the shortest way around to the new facing angle
  const turn = DIRECTIONS[direction].rotation - startRotation;

  movement.direction = direction;
  movement.progress = 0;
  movement.completed = false;
  movement.startX = player.position.x;
  movement.startY = player.position.y;
  movement.startRotation = startRotation;
  movement.endRotation = startRotation + Math.atan2(Math.sin(turn), Math.cos(turn));
}

// The player isn't blocked by enemies: touching one ends the game,
// which is checked in the animation loop after everything has moved
export function updateMovement(delta) {
  if (movement.completed) return;

  const { x, y } = DIRECTIONS[movement.direction];
  const pondLeap = movementAbility === 'pondLeap' && (isInPond({ x: movement.startX, y: movement.startY }) || isInPond({ x: movement.startX + x * JUMP_DISTANCE, y: movement.startY + y * JUMP_DISTANCE }));
  const jumpDistance = pondLeap ? JUMP_DISTANCE * 1.65 : movementAbility === 'moonJump' ? JUMP_DISTANCE * 1.25 : JUMP_DISTANCE;
  const destination = {
    x: movement.startX + x * jumpDistance,
    y: movement.startY + y * jumpDistance,
  };
  const mapHalf = MAP_SIZE / 2;
  if (Math.abs(destination.x) > mapHalf || Math.abs(destination.y) > mapHalf) {
    movement.progress = 0;
    movement.completed = true;
    return;
  }

  // Reject the jump before starting its animation when a house blocks it.
  if (
    isBlocked({ x: movement.startX, y: movement.startY }, destination, radius, worldObstacles) ||
    isBlockedByBoxes(
      { x: movement.startX, y: movement.startY },
      destination,
      radius,
      houseBoxes
    )
  ) {
    movement.progress = 0;
    movement.completed = true;
    return;
  }

  movement.progress = Math.min(1, movement.progress + delta * MOVE_SPEED * difficulty.player);

  const distance = jumpDistance * movement.progress;

  const nextPosition = {
    x: movement.startX + x * distance,
    y: movement.startY + y * distance,
  };
  const blocked = isBlocked({ x: movement.startX, y: movement.startY }, nextPosition, radius, worldObstacles) || isBlockedByBoxes(
    { x: movement.startX, y: movement.startY },
    nextPosition,
    radius,
    houseBoxes
  );

  if (blocked) {
    player.position.x = movement.startX;
    player.position.y = movement.startY;
    movement.progress = 1;
  } else {
    player.position.x = nextPosition.x;
    player.position.y = nextPosition.y;
  }
  // The hop is applied to the model, not the group, so the camera
  // (a child of the group) stays level and the jump is visible
  if (model) {
    const jumpHeight = pondLeap ? JUMP_HEIGHT * 1.35 : movementAbility === 'moonJump' ? JUMP_HEIGHT * 2 : JUMP_HEIGHT;
    model.position.z = groundOffset + Math.sin(movement.progress * Math.PI) * jumpHeight;

    // Rotating around the model's local Y axis turns it around world Z,
    // because the model is tipped upright by rotation.x = PI / 2
    model.rotation.y = THREE.MathUtils.lerp(
      movement.startRotation,
      movement.endRotation,
      movement.progress
    );
  }

  if (movement.progress === 1) {
    movement.completed = true;
    if (!blocked) {
      jumpCount++;
      if (pondLeap) achievementEvent('pondLeap', jumpCount);
      const start = { x: movement.startX, y: movement.startY };
      const end = { x: player.position.x, y: player.position.y };
      if (worldObstacles.some((obstacle) => obstacle.type === 'rock' && Math.min(Math.hypot(start.x - obstacle.position.x, start.y - obstacle.position.y), Math.hypot(end.x - obstacle.position.x, end.y - obstacle.position.y)) < obstacle.radius + 72)) {
        rockHops++;
        achievementEvent('rockHop', rockHops);
      }
    }
    if (model) model.rotation.y = DIRECTIONS[movement.direction].rotation;
  }
}
