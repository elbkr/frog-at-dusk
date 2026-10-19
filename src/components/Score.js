import * as THREE from 'three';
import { achievementEvent } from './Achievements.js';
import { playTone } from './Audio.js';

const SCORE_PER_SECOND = 0.1; // 1 point every 10 seconds survived
const SCORE_PER_KILL = 10;
let bonusScore = 0;
let multiplier = 1;

const scoreElement = document.createElement('div');
scoreElement.className = 'score';
document.body.appendChild(scoreElement);

const clock = new THREE.Clock();
let killScore = 0;
let currentScore = 0;
let displayedScore = null;

export function addKill(type = 'creature') {
  killScore += SCORE_PER_KILL;
  achievementEvent('kill', killScore / SCORE_PER_KILL);
  achievementEvent('enemyDefeated', type);
  playTone('attack');
  updateScore();
}

export function addPoints(points) {
  bonusScore += points * multiplier;
  updateScore();
}

export function setScoreMultiplier(value) { multiplier = value; }
export function getSurvivalTime() { return clock.getElapsedTime(); }
export function getKillScore() { return killScore / SCORE_PER_KILL; }

// Don't call updateScore() after this: a stopped Clock restarts itself when read
export function stopScore() {
  clock.stop();
}

export function resetScore() {
  killScore = 0;
  bonusScore = 0;
  multiplier = 1;
  clock.start(); // also resets the elapsed time to 0
  updateScore();
}

// The unrounded score, so difficulty can scale smoothly between whole points
export function getScore() {
  return currentScore;
}

export function updateScore() {
  currentScore = clock.getElapsedTime() * SCORE_PER_SECOND + killScore + bonusScore;
  const score = Math.floor(currentScore);

  // Only touch the DOM when the visible number actually changes
  if (score !== displayedScore) {
    displayedScore = score;
    scoreElement.textContent = `Score: ${score}`;
  }
}

updateScore();
