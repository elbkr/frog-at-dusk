import * as THREE from 'three';

// Extra gap added on top of the two characters' radii before they count as touching.
// Negative values let characters get closer, positive values keep them further apart.
export const COLLISION_DISTANCE = 0;

const vertex = new THREE.Vector3();

// Radius of the model's footprint on the ground, measured from its actual vertices
// rather than a bounding box, so rounded characters don't get boxy corners.
// A circle also stays the same however the model is turned around the Z axis.
// Call this on a model that hasn't been added to a parent yet.
export function getFootprintRadius(model) {
  model.updateMatrixWorld(true);

  let radius = 0;
  model.traverse((child) => {
    if (!child.isMesh) return;

    const positions = child.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      // Rigged models store raw vertices in a different space; posing them
      // with the skeleton gives the size the model is actually drawn at
      if (child.isSkinnedMesh) child.applyBoneTransform(i, vertex);
      vertex.applyMatrix4(child.matrixWorld);
      radius = Math.max(radius, Math.hypot(vertex.x - model.position.x, vertex.y - model.position.y));
    }
  });

  return radius;
}

function minDistance(radius, obstacle) {
  return radius + obstacle.radius + COLLISION_DISTANCE;
}

// Obstacles are { position, radius } objects
export function overlaps(position, radius, obstacles) {
  return obstacles.some(
    (obstacle) =>
      Math.hypot(position.x - obstacle.position.x, position.y - obstacle.position.y) <
      minDistance(radius, obstacle)
  );
}

// Circle vs. ground footprint of a box-shaped obstacle (e.g. a house)
export function overlapsBox(position, radius, box) {
  const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
  const closestY = THREE.MathUtils.clamp(position.y, box.min.y, box.max.y);
  return Math.hypot(position.x - closestX, position.y - closestY) < radius + COLLISION_DISTANCE;
}

export function hitsWall(position, radius, boxes) {
  return boxes.some((box) => overlapsBox(position, radius, box));
}

function segmentIntersectsBox(from, to, box, radius) {
  const minX = box.min.x - radius - COLLISION_DISTANCE;
  const maxX = box.max.x + radius + COLLISION_DISTANCE;
  const minY = box.min.y - radius - COLLISION_DISTANCE;
  const maxY = box.max.y + radius + COLLISION_DISTANCE;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let entry = 0;
  let exit = 1;

  for (const [start, direction, min, max] of [
    [from.x, dx, minX, maxX],
    [from.y, dy, minY, maxY],
  ]) {
    if (direction === 0) {
      if (start < min || start > max) return false;
      continue;
    }

    const near = (min - start) / direction;
    const far = (max - start) / direction;
    entry = Math.max(entry, Math.min(near, far));
    exit = Math.min(exit, Math.max(near, far));
    if (entry > exit) return false;
  }

  return exit >= 0 && entry <= 1;
}

export function isBlockedByBoxes(from, to, radius, boxes) {
  return boxes.some((box) => segmentIntersectsBox(from, to, box, radius));
}

// A move is blocked when it ends inside
// an obstacle and also brings the mover closer to it, so characters that already
// overlap (e.g. right after spawning) can still separate.
export function isBlocked(from, to, radius, obstacles) {
  return obstacles.some((obstacle) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : THREE.MathUtils.clamp(((obstacle.position.x - from.x) * dx + (obstacle.position.y - from.y) * dy) / lengthSq, 0, 1);
    const closestX = from.x + t * dx;
    const closestY = from.y + t * dy;
    const closest = Math.hypot(closestX - obstacle.position.x, closestY - obstacle.position.y);
    const next = Math.hypot(to.x - obstacle.position.x, to.y - obstacle.position.y);
    if (closest >= minDistance(radius, obstacle)) return false;
    const current = Math.hypot(from.x - obstacle.position.x, from.y - obstacle.position.y);
    return current >= minDistance(radius, obstacle) || next < current;
  });
}
