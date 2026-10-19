import * as THREE from 'three';
import './style.css';
import { player, processInputQueue, updateMovement, getPlayerCollider, getJumpCount } from './components/Player.js';
import { enemies, updateEnemies } from './components/Enemy.js';
import { createMap } from './components/Map.js';
import { loadHouses, houseBoxes } from './components/House.js';
import { updateAttack } from './components/Attack.js';
import { getScore, updateScore, getSurvivalTime, addPoints } from './components/Score.js';
import { updateDifficulty, setDifficulty, getDifficultyMode } from './components/Difficulty.js';
import { isGameOver, isStarted, resetGame, endGame, getBestScore, getLives, loseLife } from './components/GameState.js';
import { overlaps, overlapsBox } from './components/Collision.js';
import { camera } from './components/Camera.js';
import { renderer } from './components/Renderer.js';
import { createEnvironment, updateEnvironment, updatePondCrossing } from './components/Environment.js';
import { updateDayNight, getCycleDurations } from './components/DayNightCycle.js';
import { initPickups, updatePickups, getPickupStatus, absorbHit } from './components/Pickups.js';
import { updateHUD, showToast } from './components/HUD.js';
import { achievementEvent } from './components/Achievements.js';
import { setMuted } from './components/Audio.js';
import { playTone } from './components/Audio.js';
import { getStartingLives } from './components/Upgrades.js';
import './components/Controls.js';

const scene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(-100, -100, 200);
scene.add(dirLight);
const map = createMap();
scene.add(map);
createEnvironment(map);
loadHouses(map);
scene.add(player);
player.add(camera);
initPickups(scene);
updateHUD({ score: 0, fireflies: 0, best: getBestScore(), phase: 'DAYLIGHT', ability: 'NO ACTIVE GIFT', time: 0 });

const clock = new THREE.Clock();
let nightUnlocked = false;
let fullNightReward = false;
let nightBonusPaid = false;
let nightWon = false;
let hitInvulnerability = 0;
const visitedHouses = new Set();
window.addEventListener('frog-start', (event) => {
  setDifficulty(event.detail || getDifficultyMode());
  resetGame();
  nightUnlocked = false;
  fullNightReward = false;
  nightBonusPaid = false;
  nightWon = false;
  visitedHouses.clear();
  hitInvulnerability = 0;
});
window.addEventListener('frog-mute', (event) => setMuted(event.detail));

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  if (isStarted() && !isGameOver()) {
    const elapsed = getSurvivalTime();
    const cycle = updateDayNight(elapsed, scene, ambientLight, dirLight);
    if (cycle.completed && !nightWon) {
      nightWon = true;
      achievementEvent('win');
      if (getLives() === getStartingLives()) achievementEvent('perfect');
      achievementEvent('score', Math.floor(getScore()));
      playTone('win');
      endGame({ won: true, housesVisited: visitedHouses.size, jumps: getJumpCount() });
    }
    if (isGameOver()) {
      renderer.render(scene, camera);
      return;
    }
    if (cycle.phase === 'NIGHTFALL' && !nightUnlocked) {
      nightUnlocked = true;
      achievementEvent('night');
      showToast('Nightfall', 'The village is no longer safe');
    }
    if (elapsed >= getCycleDurations().total - 0.5 && !fullNightReward) {
      fullNightReward = true;
      showToast('Moon Survivor', 'You held on through the whole night · +100');
      achievementEvent('fullNight');
    }
    updateEnvironment(elapsed, cycle.nightMix);
    updateDifficulty(getScore() + cycle.nightMix * 14);
    processInputQueue();
    updateMovement(delta);
    updatePondCrossing(player.position, elapsed);
    updatePickups(delta, player, cycle.nightMix);
    updateEnemies(scene, delta, getPlayerCollider(), cycle.nightMix);
    updateAttack(delta);
    hitInvulnerability = Math.max(0, hitInvulnerability - delta);
    player.visible = hitInvulnerability === 0 || Math.floor(hitInvulnerability * 12) % 2 === 0;

    const { position, radius } = getPlayerCollider();
    for (let index = 0; index < houseBoxes.length; index++) {
      if (!visitedHouses.has(index) && overlapsBox(position, 54, houseBoxes[index])) {
        visitedHouses.add(index);
        achievementEvent('house', visitedHouses.size);
      }
    }
    const dangerousEnemies = enemies.filter((enemy) => enemy.type !== 'seeker');
    if (hitInvulnerability === 0 && overlaps(position, radius, dangerousEnemies)) {
      if (absorbHit()) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (Math.hypot(enemies[i].position.x - position.x, enemies[i].position.y - position.y) < radius + enemies[i].radius) {
            enemies[i].group.removeFromParent();
            enemies.splice(i, 1);
          }
        }
      } else {
        const remainingLives = loseLife();
        achievementEvent('damage', 1);
        playTone('hit');
        hitInvulnerability = 1.5;
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (Math.hypot(enemies[i].position.x - position.x, enemies[i].position.y - position.y) < radius + enemies[i].radius) {
            enemies[i].group.removeFromParent();
            enemies.splice(i, 1);
          }
        }
        if (remainingLives === 0) endGame({ housesVisited: visitedHouses.size, jumps: getJumpCount() });
        else showToast('Ouch', `${remainingLives} ${remainingLives === 1 ? 'life' : 'lives'} remaining`);
      }
    }
    if (!isGameOver()) {
      if (fullNightReward && elapsed >= DAY_CYCLE_DURATION && !nightBonusPaid) {
        nightBonusPaid = true;
        addPoints(100);
      }
      updateScore();
      const status = getPickupStatus();
      const phase = cycle.phase === 'NIGHTFALL' ? 'NIGHTFALL' : cycle.phase;
      const ability = status.shield ? 'LILY SHIELD READY' : status.ability ? `${status.ability.toUpperCase()} · ${Math.ceil(status.abilityTime)}s` : 'NO ACTIVE GIFT';
      updateHUD({ score: Math.floor(getScore()), fireflies: status.collected, best: Math.max(getBestScore(), Math.floor(getScore())), phase, ability, time: elapsed, lives: getLives() });
      achievementEvent('time', elapsed);
    }
  }
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
