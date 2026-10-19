import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { getFootprintRadius, isBlocked, isBlockedByBoxes, overlaps, overlapsBox } from './Collision.js';
import { difficulty, getDifficultySettings } from './Difficulty.js';
import { houseBoxes } from './House.js';
import { worldObstacles } from './Environment.js';
import { isInPond } from './Environment.js';
import { getNearestFirefly, consumeFireflyAt } from './Pickups.js';
import { MAP_SIZE, TILE_SIZE } from './Map.js';

// Starting values; both get harder as difficulty.enemy grows
const ENEMY_SPEED = 40; // units per second
const SPAWN_DELAY = 4.5; // seconds between spawns
const MAX_ENEMIES = 12;
const SHOWCASE_ALL_ENEMIES = false;
const FREEZE_ENEMIES = false;
const enemyProfiles = {
  chaser: { speed: 1, color: 0xff7777 },
  wanderer: { speed: 0.72, color: 0x8ee58c },
  ambusher: { speed: 1.08, color: 0xc596ff },
  seeker: { speed: 0.92, color: 0xffc56e },
};

const half = MAP_SIZE / 2;
const gridMin = -half + TILE_SIZE / 2;
const gridMax = half - TILE_SIZE / 2;
const SPAWN_POINTS = [
  { x: gridMin, y: gridMin },
  { x: gridMax, y: gridMin },
  { x: gridMin, y: gridMax },
  { x: gridMax, y: gridMax },
];
const EDGE_SPAWN_POINTS = [];
for (let coordinate = gridMin; coordinate <= gridMax; coordinate += TILE_SIZE * 2) {
  EDGE_SPAWN_POINTS.push({ x: coordinate, y: gridMin }, { x: coordinate, y: gridMax });
  if (coordinate !== gridMin && coordinate !== gridMax) EDGE_SPAWN_POINTS.push({ x: gridMin, y: coordinate }, { x: gridMax, y: coordinate });
}

// Enemy models are loaded once and cloned for every enemy.
let template = null;
const templates = {};
let radius = 0;

const loader = new GLTFLoader();

loader.load('/models/enemy.glb', (gltf) => {
  template = gltf.scene;
  template.rotation.x = Math.PI / 2;
  template.scale.setScalar(5);

  const box = new THREE.Box3().setFromObject(template);
  template.position.z = -box.min.z;
  radius = getFootprintRadius(template);
  templates.chaser = template;
});

for (const [type, path] of Object.entries({
  wanderer: '/models/enemies/wanderer_drake.glb',
  ambusher: '/models/enemies/ambusher_bat.glb',
  seeker: '/models/enemies/night_hunter.glb',
})) {
  loader.load(path, (gltf) => {
    const model = gltf.scene;
    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(5);
    const box = new THREE.Box3().setFromObject(model);
    model.position.z = -box.min.z;
    templates[type] = model;
  });
}

// Each enemy is { group, model, position, radius }; position and radius
// make it usable directly as a collision obstacle
export const enemies = [];

let spawnTimer = 0;
// Fill every corner on the first update (game start, and after each reset)
let spawnAtAllCorners = true;

function spawnEnemy(scene, point, type = 'chaser') {
  const group = new THREE.Group();
  const source = templates[type] || template;
  const model = clone(source);
  group.add(model);
  group.position.set(point.x, point.y, 0);

  scene.add(group);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.6, 2, 5, 16), new THREE.MeshBasicMaterial({ color: enemyProfiles[type].color, transparent: true, opacity: 0.7 }));
  marker.rotation.x = Math.PI / 2;
  marker.position.z = 2;
  group.add(marker);
  enemies.push({ group, model, position: group.position, radius: getFootprintRadius(model) || radius, type, marker, wander: Math.random() * Math.PI * 2, ambushReady: false });
}

function spawnAtRandomFreeCorner(scene, playerCollider, type) {
  // Only use corners that aren't already occupied
  const obstacles = [...enemies, playerCollider];
  const freePoints = EDGE_SPAWN_POINTS.filter((point) => Math.hypot(point.x - playerCollider.position.x, point.y - playerCollider.position.y) > 200 && !overlaps(point, radius + 28, obstacles) && !overlaps(point, radius, worldObstacles) && !isInPond(point) && !houseBoxes.some((box) => overlapsBox(point, radius, box)));
  if (freePoints.length === 0) return;

  spawnEnemy(scene, freePoints[Math.floor(Math.random() * freePoints.length)], type);
}

export function resetEnemies() {
  for (const enemy of enemies) enemy.group.removeFromParent();
  enemies.length = 0;
  spawnTimer = 0;
  spawnAtAllCorners = true;
}

export function updateEnemies(scene, delta, playerCollider, nightMix = 0) {
  if (!template) return;

  if (spawnAtAllCorners) {
    spawnAtAllCorners = false;
    const showcaseTypes = ['chaser', 'wanderer', 'ambusher', 'seeker'];
    for (let i = 0; i < SPAWN_POINTS.length; i++) {
      spawnEnemy(scene, SPAWN_POINTS[i], SHOWCASE_ALL_ENEMIES ? showcaseTypes[i % showcaseTypes.length] : 'chaser');
    }
  }

  const spawnDelay = SPAWN_DELAY / (difficulty.enemy * getDifficultySettings().enemyRate * (1 + nightMix * 0.32));

  spawnTimer += delta;
  if (spawnTimer >= spawnDelay && enemies.length < MAX_ENEMIES) {
    spawnTimer -= spawnDelay;
    const roll = Math.random();
    const type = SHOWCASE_ALL_ENEMIES
      ? ['chaser', 'wanderer', 'ambusher', 'seeker'][Math.floor(Math.random() * 4)]
      : nightMix > 0.68 && roll < 0.23 ? 'seeker' : nightMix > 0.28 && roll < 0.62 ? 'ambusher' : nightMix > 0.12 && roll < 0.78 ? 'wanderer' : 'chaser';
    spawnAtRandomFreeCorner(scene, playerCollider, type);
  }

  const target = playerCollider.position;

  for (const enemy of enemies) {
    if (FREEZE_ENEMIES) continue;
    const { position } = enemy;
    const profile = enemyProfiles[enemy.type] || enemyProfiles.chaser;
    const distanceToPlayer = Math.hypot(target.x - position.x, target.y - position.y);
    enemy.marker.material.opacity = enemy.type === 'ambusher' && distanceToPlayer < 260
      ? 0.45 + Math.sin(performance.now() * 0.012) * 0.35
      : enemy.type === 'seeker'
        ? 0.35 + Math.sin(performance.now() * 0.004) * 0.15
        : 0.7;
    if (enemy.type === 'ambusher') {
      if (distanceToPlayer > 260) continue;
      enemy.ambushReady = true;
    }
    if (enemy.type === 'wanderer') enemy.wander += delta * 0.55;
    const lightTarget = enemy.type === 'seeker' ? getNearestFirefly(position) : null;
    const aimPoint = lightTarget || target;
    const aimX = enemy.type === 'wanderer' ? aimPoint.x + Math.cos(enemy.wander) * 90 : aimPoint.x;
    const aimY = enemy.type === 'wanderer' ? aimPoint.y + Math.sin(enemy.wander) * 90 : aimPoint.y;
    const dx = aimX - position.x;
    const dy = aimY - position.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) continue;

    // Same convention as the player: rotation.y = 0 faces -Y, turning around world Z
    enemy.model.rotation.y = Math.atan2(dx, -dy);

    const terrainPoint = { x: position.x + dx / distance * Math.min(distance, ENEMY_SPEED * delta), y: position.y + dy / distance * Math.min(distance, ENEMY_SPEED * delta) };
    const pondSlow = isInPond(position) || isInPond(terrainPoint) ? 0.5 : 1;
    const seekerCaution = enemy.type === 'seeker' && !lightTarget ? 0.72 : 1;
    const ambushBurst = enemy.type === 'ambusher' && enemy.ambushReady ? 1.7 : 1;
    const step = Math.min(distance, ENEMY_SPEED * difficulty.enemy * profile.speed * pondSlow * seekerCaution * ambushBurst * delta);
    const stepX = (dx / distance) * step;
    const stepY = (dy / distance) * step;

    // Only other enemies block movement. The player is deliberately not an obstacle:
    // reaching the player ends the game, which takes priority over collision blocking
    const obstacles = enemies.filter((other) => other !== enemy);

    // Try the direct step first, then slide along one axis so enemies
    // can work their way around each other instead of jamming
    const candidates = [
      { x: position.x + stepX, y: position.y + stepY },
      { x: position.x + stepX, y: position.y },
      { x: position.x, y: position.y + stepY },
    ];
    const next = candidates.find(
      (candidate) =>
        !isBlocked(position, candidate, radius, [...obstacles, ...worldObstacles]) &&
        !isBlockedByBoxes(position, candidate, radius, houseBoxes)
    );

    if (next) {
      position.x = next.x;
      position.y = next.y;
      if (enemy.type === 'seeker') consumeFireflyAt(position);
    }
  }
}
