import { player, resetPlayer } from './Player.js';
import { resetEnemies } from './Enemy.js';
import { resetAttack } from './Attack.js';
import { resetScore, stopScore, getScore, getSurvivalTime, getKillScore } from './Score.js';
import { showGameOver, showStart, hideStart } from './HUD.js';
import { getPickupStatus, resetPickups } from './Pickups.js';
import { resetAchievements, getRunAchievements, getAchievementProgress } from './Achievements.js';
import { resetDifficulty } from './Difficulty.js';
import { resetPondEffects } from './Environment.js';
import { addCurrency, getStartingLives } from './Upgrades.js';

let gameOver = false;
let started = false;
let bestScore = 0;
let lives = getStartingLives();
let analytics = { runs: 0, totalKills: 0, totalFireflies: 0, bestTime: 0 };
try { bestScore = Number(localStorage.getItem('frog-dusk-best') || 0); } catch { /* optional */ }
try { analytics = { ...analytics, ...JSON.parse(localStorage.getItem('frog-dusk-analytics') || '{}') }; } catch { /* optional */ }

stopScore();
showStart();

export function isStarted() { return started; }
export function getBestScore() { return bestScore; }

export function isGameOver() {
  return gameOver;
}
export function getLives() { return lives; }
export function loseLife() {
  lives = Math.max(0, lives - 1);
  return lives;
}

export function endGame(runStats = {}) {
  if (gameOver) return;
  gameOver = true;
  started = false;

  player.visible = false;
  stopScore();
  const score = Math.floor(getScore());
  bestScore = Math.max(bestScore, score);
  try { localStorage.setItem('frog-dusk-best', String(bestScore)); } catch { /* optional */ }
  const pickups = getPickupStatus();
  const elapsed = Math.floor(getSurvivalTime());
  analytics = {
    runs: analytics.runs + 1,
    totalKills: analytics.totalKills + Math.floor(getKillScore()),
    totalFireflies: analytics.totalFireflies + pickups.collected,
    bestTime: Math.max(analytics.bestTime, elapsed),
  };
  try { localStorage.setItem('frog-dusk-analytics', JSON.stringify(analytics)); } catch { /* optional */ }
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  addCurrency(pickups.collected + (runStats.won ? 100 : 0));
  showGameOver({ won: Boolean(runStats.won), score, time, fireflies: pickups.collected, kills: Math.floor(getKillScore()), best: bestScore, lives, housesVisited: runStats.housesVisited || 0, jumps: runStats.jumps || 0, achievements: getRunAchievements(), achievementProgress: getAchievementProgress(), analytics });
}

export function resetGame() {
  resetPlayer();
  resetPondEffects(player.position);
  resetEnemies();
  resetAttack();
  resetScore();
  resetPickups();
  resetAchievements();
  resetDifficulty();
  lives = getStartingLives();

  hideStart();
  gameOver = false;
  started = true;
}
