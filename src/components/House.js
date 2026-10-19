import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { overlapsBox } from './Collision.js';
import { MAP_SIZE, TILE_SIZE, SPAWN_POINTS } from './Map.js';
import { worldObstacles, ponds } from './Environment.js';

const HOUSE_COUNT = 3;
const HOUSE_SCALE = 65;
// Keep houses this far from the player's start and the enemy spawn corners
const SPAWN_CLEARANCE = 80;
// Minimum gap between houses so there's always room to pass between them
const HOUSE_GAP = 40;
const MAX_PLACEMENT_ATTEMPTS = 800;

// Ground footprints (Box3) of the placed houses, used for collision.
// Houses only turn in multiples of 90°, so their boxes fit them tightly.
export const houseBoxes = [];

function randomGridCoordinate() {
  const steps = MAP_SIZE / TILE_SIZE;
  return (Math.floor(Math.random() * steps) - steps / 2 + 0.5) * TILE_SIZE;
}

function keepsGridConnected(candidate) {
  const boxes = [...houseBoxes, candidate];
  const open = new Set();
  const pointKey = (x, y) => `${x},${y}`;
  const min = -MAP_SIZE / 2 + TILE_SIZE / 2;
  const max = MAP_SIZE / 2 - TILE_SIZE / 2;
  for (let x = min; x <= max; x += TILE_SIZE) {
    for (let y = min; y <= max; y += TILE_SIZE) {
      const point = { x, y };
      if (worldObstacles.some((obstacle) => Math.hypot(x - obstacle.position.x, y - obstacle.position.y) < obstacle.radius + 12)) continue;
      if (boxes.some((box) => overlapsBox(point, 12, box))) continue;
      open.add(pointKey(x, y));
    }
  }
  const start = pointKey(0, 0);
  if (!open.has(start)) return false;
  const visited = new Set([start]);
  const queue = [[0, 0]];
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[TILE_SIZE, 0], [-TILE_SIZE, 0], [0, TILE_SIZE], [0, -TILE_SIZE]]) {
      const key = pointKey(x + dx, y + dy);
      if (open.has(key) && !visited.has(key)) { visited.add(key); queue.push([x + dx, y + dy]); }
    }
  }
  return visited.size === open.size;
}

function isValidPlacement(box) {
  const half = MAP_SIZE / 2;
  if (box.min.x < -half || box.max.x > half || box.min.y < -half || box.max.y > half) {
    return false;
  }

  const keepClear = [{ x: 0, y: 0 }, ...SPAWN_POINTS];
  if (keepClear.some((point) => overlapsBox(point, SPAWN_CLEARANCE, box))) return false;
  if (worldObstacles.some((obstacle) => overlapsBox(obstacle.position, obstacle.radius + HOUSE_GAP, box))) return false;
  if (ponds.some((pond) => overlapsBox({ x: pond.x, y: pond.y }, Math.max(pond.rx, pond.ry) + HOUSE_GAP, box))) return false;

  return houseBoxes.every((other) => !box.intersectsBox(other.clone().expandByScalar(HOUSE_GAP))) && keepsGridConnected(box);
}

function placeHouse(template, map) {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const house = template.clone();

    house.rotation.x = Math.PI / 2;
    // Rotating around the model's local Y axis turns it around world Z
    house.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
    house.scale.setScalar(HOUSE_SCALE);
    house.position.set(randomGridCoordinate(), randomGridCoordinate(), 0);

    // Lift the house so its lowest point rests exactly on the ground (z = 0)
    const box = new THREE.Box3().setFromObject(house);
    house.position.z = -box.min.z;
    box.translate(new THREE.Vector3(0, 0, house.position.z));

    if (!isValidPlacement(box)) continue;

    map.add(house);
    houseBoxes.push(box);
    return;
  }
}

export function loadHouses(map) {
  const loader = new GLTFLoader();

  loader.load('/models/small_house.glb', (gltf) => {
    for (let i = 0; i < HOUSE_COUNT; i++) placeHouse(gltf.scene, map);
  });
}
