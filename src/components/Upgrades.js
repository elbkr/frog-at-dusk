const defaults = { bank: 0, lives: 0, reach: 0, duration: 0 };
let state = { ...defaults };
try { state = { ...state, ...JSON.parse(localStorage.getItem('frog-dusk-upgrades') || '{}') }; } catch { /* optional */ }

const costs = { lives: [80, 160], reach: [60, 120, 220], duration: [70, 140, 240] };
const labels = { lives: 'Extra Heart', reach: 'Longer Reach', duration: 'Gift Duration' };

export function addCurrency(amount) { state.bank += amount; save(); }
export function getUpgradeState() { return { ...state, costs, labels }; }
export function getStartingLives() { return 3 + state.lives; }
export function getAttackReachMultiplier() { return 1 + state.reach * 0.12; }
export function getAbilityDuration() { return 9 + state.duration * 2; }
export function buyUpgrade(type) {
  const level = state[type] || 0;
  const cost = costs[type]?.[level];
  if (cost === undefined || state.bank < cost) return false;
  state.bank -= cost;
  state[type] = level + 1;
  save();
  return true;
}
function save() {
  try { localStorage.setItem('frog-dusk-upgrades', JSON.stringify(state)); } catch { /* optional */ }
}
