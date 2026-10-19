let muted = false;
let context;
export function setMuted(value) { muted = value; }
export function playTone(kind = 'pickup') {
  if (muted) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const base = kind === 'attack' ? 170 : kind === 'hit' ? 110 : kind === 'win' ? 880 : kind === 'power' ? 720 : 560;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(base, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(base * (kind === 'win' ? 1.8 : 1.35), context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch { /* Audio is optional; gameplay remains available without it. */ }
}
