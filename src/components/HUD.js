const hud = document.createElement('div');
hud.className = 'hud';
hud.innerHTML = '<div class="hud-top"><div class="brand"><span class="brand-mark">◉</span><div><strong>FROG AT DUSK</strong><small>VILLAGE NIGHTFALL</small></div></div><div class="hud-stats"><div><small>SCORE</small><b data-score>0</b></div><div><small>FIREFLIES</small><b data-fireflies>0</b></div><div><small>TIME</small><b data-time>0:00</b></div><div><small>BEST</small><b data-best>0</b></div><div><small>LIVES</small><b data-lives>♥♥♥</b></div></div><button class="sound-toggle" type="button" aria-label="Toggle sound">SOUND ON</button></div><div class="phase-chip" data-phase>DAYLIGHT</div><div class="ability-chip" data-ability>NO ACTIVE GIFT</div>';
document.body.appendChild(hud);

const overlay = document.createElement('section');
overlay.className = 'screen-overlay';
overlay.innerHTML = '<div class="title-card"><div class="eyebrow">A LITTLE LIGHT AGAINST THE DARK</div><h1>Frog <i>at</i><br>Dusk</h1><p class="lead">Carry the village from daylight through the night, then return to day with the highest score you can.</p><label class="difficulty-picker" for="difficulty-choice">NIGHT RULES<select id="difficulty-choice"><option value="easy">EASY · gentler threats</option><option value="normal" selected>NORMAL · intended balance</option><option value="hardcore">HARDCORE · 3 minute night</option></select></label><div class="key-guide"><span>↑ ← ↓ → <small>HOP</small></span><span>SPACE <small>ATTACK</small></span></div><button class="primary-button" data-start>BEGIN YOUR EVENING <b>→</b></button><p class="fine-print">Day 1:00 · Sunset 1:00 · Night 2:00</p></div></section>';
document.body.appendChild(overlay);
overlay.querySelector('[data-start]').addEventListener('click', () => window.dispatchEvent(new CustomEvent('frog-start', { detail: overlay.querySelector('#difficulty-choice').value })));

const toast = document.createElement('div');
toast.className = 'achievement-toast';
document.body.appendChild(toast);
let toastTimer;
let muted = false;
import { buyUpgrade, getUpgradeState } from './Upgrades.js';
const soundButton = hud.querySelector('.sound-toggle');
soundButton.addEventListener('click', () => {
  muted = !muted;
  soundButton.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  window.dispatchEvent(new CustomEvent('frog-mute', { detail: muted }));
});

export function isMuted() { return muted; }
export function showStart() { overlay.hidden = false; overlay.classList.remove('is-over'); }
export function hideStart() { overlay.hidden = true; }
export function updateHUD({ score, fireflies, best, phase, ability, time, lives = 3 }) {
  hud.querySelector('[data-score]').textContent = String(score).padStart(3, '0');
  hud.querySelector('[data-fireflies]').textContent = String(fireflies).padStart(2, '0');
  hud.querySelector('[data-best]').textContent = String(best).padStart(3, '0');
  hud.querySelector('[data-time]').textContent = `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
  hud.querySelector('[data-lives]').textContent = `${'♥'.repeat(lives)}${'♡'.repeat(Math.max(0, 3 - lives))}`;
  hud.querySelector('[data-phase]').textContent = phase;
  hud.querySelector('[data-ability]').textContent = ability;
}
export function showToast(title, detail) {
  toast.innerHTML = `<b>✦ &nbsp;${title}</b><span>${detail}</span>`;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function formatDuration(seconds = 0) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export function showGameOver(stats) {
  overlay.classList.add('is-over');
  const achievementText = stats.achievements?.length ? stats.achievements.join(' · ') : 'No village honors this run';
  const analytics = stats.analytics || {};
  const progress = stats.achievementProgress ? Object.values(stats.achievementProgress).filter((item) => item.unlocked).length : 0;
  const challengeIds = ['village_saver', 'perfect_night', 'high_roller'];
  const challengeBoard = challengeIds.map((id) => {
    const item = stats.achievementProgress?.[id];
    return item ? `<span>${id.replaceAll('_', ' ')} ${Math.min(item.current, item.goal)}/${item.goal}</span>` : '';
  }).join('');
  const upgrades = getUpgradeState();
  const upgradeButton = (type) => {
    const level = upgrades[type] || 0;
    const cost = upgrades.costs[type]?.[level];
    return `<button class="upgrade-button" data-upgrade="${type}" ${cost === undefined || upgrades.bank < cost ? 'disabled' : ''}>${upgrades.labels[type]} · ${cost === undefined ? 'MAX' : `${cost} ✦`}</button>`;
  };
  overlay.innerHTML = `<aside class="challenge-board"><small>CHALLENGE BOARD</small>${challengeBoard}</aside><div class="title-card"><div class="eyebrow">${stats.won ? 'THE VILLAGE WAKES' : 'THE VILLAGE GROWS QUIET'}</div><h1>${stats.won ? 'Day<br><i>returns</i>' : 'Night<br><i>claimed</i>'}</h1><p class="lead">${stats.won ? 'You carried the village through the whole night.' : `You held on for <b>${stats.time}</b>. The fireflies will remember.`}</p><div class="result-grid"><div><small>FINAL SCORE</small><b>${stats.score}</b></div><div><small>FIREFLIES</small><b>${stats.fireflies}</b></div><div><small>CREATURES</small><b>${stats.kills}</b></div><div><small>HOUSES VISITED</small><b>${stats.housesVisited} / 3</b></div><div><small>HOPS TAKEN</small><b>${stats.jumps}</b></div><div><small>LIVES LEFT</small><b>${stats.lives}</b></div><div><small>BEST RUN</small><b>${stats.best}</b></div><div><small>ALL-TIME RUNS</small><b>${analytics.runs || 1}</b></div></div><p class="honors">${achievementText}</p><p class="fine-print">${progress} achievements unlocked · ${analytics.totalKills || 0} lifetime creatures defeated · best survival ${formatDuration(analytics.bestTime)}</p><div class="upgrade-panel"><small>FIREFLY BANK · ${upgrades.bank} ✦</small>${upgradeButton('lives')}${upgradeButton('reach')}${upgradeButton('duration')}</div><button class="primary-button" data-start>TRY ONE MORE NIGHT <b>→</b></button><p class="fine-print">Arrow keys to hop · Space to defend</p></div>`;
  overlay.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => {
    if (buyUpgrade(button.dataset.upgrade)) {
      showToast('Upgrade ready', 'It will apply on your next night');
      showGameOver(stats);
    }
  }));
  overlay.querySelector('[data-start]').addEventListener('click', () => window.dispatchEvent(new Event('frog-start')));
  overlay.hidden = false;
}
