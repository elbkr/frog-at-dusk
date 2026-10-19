import { showToast } from './HUD.js';

const definitions = {
  first_light: ['First Light', 'Collected your first firefly', 1],
  night_watch: ['Night Watch', 'Stayed until the village went dark', 1],
  bug_hunter: ['Bug Hunter', 'Collected 10 fireflies in one evening', 10],
  survivor: ['Still Here', 'Survived for one minute', 60],
  defender: ['Village Defender', 'Drove away your first creature', 1],
  explorer: ['Village Explorer', 'Visited all three village houses', 3],
  rock_hopper: ['Rock Hopper', 'Made 10 careful hops beside rocks', 10],
  moon_survivor: ['Moon Survivor', 'Survived the complete night cycle', 1],
  gift_collector: ['Gift Collector', 'Used three different gifts', 3],
  moon_stepper: ['Moon Stepper', 'Made a powered leap beneath the moon', 1],
  pond_runner: ['Pond Runner', 'Crossed a pond with Pond Leap', 1],
  creature_catalog: ['Creature Catalog', 'Drove away four kinds of creature', 4],
  village_saver: ['Village Saver', 'Returned the village from night to day', 1],
  perfect_night: ['Perfect Night', 'Won a night without losing a life', 1],
  high_roller: ['High Roller', 'Earned 500 points in one run', 500],
};

const earned = new Set();
const progress = Object.fromEntries(Object.keys(definitions).map((id) => [id, 0]));
const usedAbilities = new Set();
const defeatedTypes = new Set();
function unlock(id) {
  if (earned.has(id)) return;
  earned.add(id);
  try {
    const saved = new Set(JSON.parse(localStorage.getItem('frog-dusk-achievements') || '[]'));
    saved.add(id);
    localStorage.setItem('frog-dusk-achievements', JSON.stringify([...saved]));
  } catch { /* Storage can be unavailable in private browsing. */ }
  const [name, description] = definitions[id];
  showToast(name, description);
}
function setProgress(id, value) {
  progress[id] = Math.max(progress[id], value);
  if (progress[id] >= definitions[id][2]) unlock(id);
}
export function achievementEvent(event, value) {
  if (event === 'firefly') { setProgress('first_light', value); setProgress('bug_hunter', value); }
  if (event === 'night') setProgress('night_watch', 1);
  if (event === 'time') setProgress('survivor', value);
  if (event === 'kill') setProgress('defender', value);
  if (event === 'house') setProgress('explorer', value);
  if (event === 'rockHop') setProgress('rock_hopper', value);
  if (event === 'fullNight') setProgress('moon_survivor', 1);
  if (event === 'ability') {
    usedAbilities.add(value);
    setProgress('gift_collector', usedAbilities.size);
    if (value === 'moonJump') setProgress('moon_stepper', 1);
  }
  if (event === 'pondLeap') setProgress('pond_runner', 1);
  if (event === 'enemyType') setProgress('creature_catalog', value);
  if (event === 'enemyDefeated') {
    defeatedTypes.add(value);
    setProgress('creature_catalog', defeatedTypes.size);
  }
  if (event === 'win') setProgress('village_saver', 1);
  if (event === 'perfect') setProgress('perfect_night', 1);
  if (event === 'score') setProgress('high_roller', value);
}
export function resetAchievements() {
  earned.clear();
  usedAbilities.clear();
  defeatedTypes.clear();
  for (const id of Object.keys(progress)) progress[id] = 0;
}
export function getRunAchievements() { return [...earned].map((id) => definitions[id][0]); }
export function getAchievementProgress() {
  return Object.fromEntries(Object.entries(definitions).map(([id, [, , goal]]) => [id, { current: progress[id], goal, unlocked: earned.has(id) }]));
}
