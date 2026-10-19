import * as THREE from 'three';

export const MAP_SIZE = 1000;
// Same as the player's jump distance, so every hop lands on the next tile
export const TILE_SIZE = 40;

const DARK_GREEN = 0x228b22;
const LIGHT_GREEN = 0x90ee90;
let tileMesh = null;
const paletteDark = new THREE.Color();
const paletteLight = new THREE.Color();
const nightDark = new THREE.Color(0x173b39);
const nightLight = new THREE.Color(0x426466);

const half = MAP_SIZE / 2;
// Enemies spawn at the four corners of the map
export const SPAWN_POINTS = [
  { x: -half + TILE_SIZE / 2, y: -half + TILE_SIZE / 2 },
  { x: half - TILE_SIZE / 2, y: -half + TILE_SIZE / 2 },
  { x: -half + TILE_SIZE / 2, y: half - TILE_SIZE / 2 },
  { x: half - TILE_SIZE / 2, y: half - TILE_SIZE / 2 },
];

// Tiles are centred on the spots the player can land on (multiples of TILE_SIZE),
// so the floor reaches half a tile past the corners
export function createMap() {
  const map = new THREE.Group();

  // Use an odd tile count so the origin is the center of a tile. With an
  // even count, the frog starts on the seam between the four center tiles.
  const tilesPerSide = MAP_SIZE / TILE_SIZE;
  const tiles = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
    new THREE.MeshLambertMaterial(),
    tilesPerSide * tilesPerSide
  );
  tileMesh = tiles;

  const matrix = new THREE.Matrix4();
  const dark = new THREE.Color(DARK_GREEN);
  const light = new THREE.Color(LIGHT_GREEN);

  let index = 0;
  for (let i = 0; i < tilesPerSide; i++) {
    for (let j = 0; j < tilesPerSide; j++) {
      // PlaneGeometry already lies in the XY plane, which is our ground
      matrix.makeTranslation((i + 0.5) * TILE_SIZE - half, (j + 0.5) * TILE_SIZE - half, 0);
      tiles.setMatrixAt(index, matrix);
      tiles.setColorAt(index, (i + j) % 2 === 0 ? dark : light);
      index++;
    }
  }

  map.add(tiles);
  return map;
}

export function updateMapPalette(nightMix) {
  if (!tileMesh) return;
  paletteDark.setHex(DARK_GREEN).lerp(nightDark, nightMix);
  paletteLight.setHex(LIGHT_GREEN).lerp(nightLight, nightMix);
  const tilesPerSide = MAP_SIZE / TILE_SIZE;
  for (let i = 0; i < tilesPerSide; i++) {
    for (let j = 0; j < tilesPerSide; j++) tileMesh.setColorAt(i * tilesPerSide + j, (i + j) % 2 === 0 ? paletteDark : paletteLight);
  }
  tileMesh.instanceColor.needsUpdate = true;
}
