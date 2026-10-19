import { queueMove } from './Player.js';
import { triggerAttack } from './Attack.js';
import { isGameOver, isStarted, resetGame } from './GameState.js';

const KEY_DIRECTIONS = {
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();

    if (isGameOver()) {
      // Ignore auto-repeat so a Space still held from attacking doesn't skip the screen
      if (!event.repeat) resetGame();
      return;
    }

    if (!isStarted()) { resetGame(); return; }

    // Holding Space keeps attacking whenever the cooldown allows
    triggerAttack();
    return;
  }

  const direction = KEY_DIRECTIONS[event.key];
  if (!direction) return;

  event.preventDefault();
  // Ignore auto-repeat so holding a key doesn't flood the queue,
  // and ignore movement entirely once the game is over
  if (event.repeat || isGameOver()) return;
  if (!isStarted()) { resetGame(); }

  queueMove(direction);
});
