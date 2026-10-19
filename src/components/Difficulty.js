// How quickly the game gets harder: difficulty factor gained per point of score
// Keep the threat curve readable during a full night instead of ramping
// sharply after only a few score pickups.
const DIFFICULTY_GROWTH = 0.004;

// How strongly the difficulty factor affects each side. Enemies scale faster
// than the player so the hero never outgrows the threat.
const ENEMY_SCALING = 1;
const PLAYER_SCALING = 0.5;
const MAX_ENEMY_DIFFICULTY = 1.7;
const MAX_PLAYER_DIFFICULTY = 1.35;
const modes = {
  easy: { label: 'EASY', enemyRate: 0.72, enemyCap: 1.35, playerCap: 1.2, nightDuration: 120 },
  normal: { label: 'NORMAL', enemyRate: 1, enemyCap: 1.7, playerCap: 1.35, nightDuration: 120 },
  hardcore: { label: 'HARDCORE', enemyRate: 1.28, enemyCap: 2, playerCap: 1.5, nightDuration: 180 },
};
let mode = 'normal';

// Multipliers read by the other systems. Speeds and attack range are multiplied
// by them; delays are divided by them (so the rate of spawning/attacking grows linearly).
export const difficulty = {
  enemy: 1,
  player: 1,
};
export function setDifficulty(nextMode) { if (modes[nextMode]) mode = nextMode; }
export function getDifficultyMode() { return mode; }
export function getDifficultySettings() { return modes[mode]; }

export function updateDifficulty(score) {
  const factor = score * DIFFICULTY_GROWTH;

  const settings = modes[mode];
  difficulty.enemy = Math.min(settings.enemyCap || MAX_ENEMY_DIFFICULTY, 1 + factor * ENEMY_SCALING);
  difficulty.player = Math.min(settings.playerCap || MAX_PLAYER_DIFFICULTY, 1 + factor * PLAYER_SCALING);
}

export function resetDifficulty() {
  difficulty.enemy = 1;
  difficulty.player = 1;
}
