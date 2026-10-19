# Frog at Dusk

## Competition overview

Frog at Dusk is a score-focused survival game built around one clear goal: guide the frog through daylight, sunset, and a dangerous night, then return to daylight alive. Winning ends the run and preserves the score chase. Players can replay to improve their score, collect more fireflies, defeat more creatures, and complete challenge goals.

## Run structure

- Daylight lasts 1 minute.
- Sunset lasts 1 minute.
- Normal and Easy nights last 2 minutes.
- Hardcore nights last 3 minutes.
- Returning to daylight is the win condition.
- A run ends early when all lives are lost.

## Difficulty modes

- Easy: reduced enemy pressure and a gentler threat cap.
- Normal: the intended balance and default selection.
- Hardcore: faster enemy pressure, a higher threat cap, and a 3-minute night.

The difficulty is selected on the title screen before starting a run. The selected mode applies to enemy spawn pressure, difficulty scaling, and night duration.

## Core play

- Arrow keys queue grid-aligned hops.
- Space triggers the defensive attack.
- Rocks, trees, houses, and ponds shape movement.
- Ponds slow enemies and create ripple effects when crossed.
- Fireflies award points and power gifts appear throughout the run.
- Shield, cloak, score boost, Moon Jump, and Pond Leap each change how the player handles danger.
- The default chaser remains available alongside wanderer, ambusher, and night seeker variants.

## Enemies

- Chaser: the standard direct threat using the restored default enemy model.
- Wanderer: circles its target instead of taking a direct line.
- Ambusher: waits at range, then uses a faster burst when close. Its marker pulses as a warning.
- Night seeker: hunts fireflies instead of immediately pursuing the frog. Its marker has a slower pulse.

The removed zombie/swarm enemy is not loaded or spawned.

## Progression and replay

Fireflies collected during a run are added to the persistent firefly bank. The post-run store offers:

- Extra Heart: increases starting lives.
- Longer Reach: increases attack radius.
- Gift Duration: increases temporary ability duration.

Upgrades are stored locally and apply on the next run. This gives successful runs a lasting reward without replacing the score challenge.

## Challenges and analytics

The challenge board tracks:

- Village Saver: complete a full night.
- Perfect Night: win without losing a life.
- High Roller: earn 500 points in a run.
- First Light, Bug Hunter, Night Watch, Still Here, Village Defender, Village Explorer, Rock Hopper, Moon Survivor, Gift Collector, Moon Stepper, Pond Runner, and Creature Catalog.

The game-over screen shows score, fireflies, creatures defeated, houses visited, hops, lives, best score, run count, lifetime creature defeats, best survival time, current-run honors, and challenge progress.

## Presentation polish

- Day, sunset, and night change the sky, fog, map palette, ambient light, directional light, pond glow, and lantern intensity.
- Ability auras use distinct colors for shield, cloak, Moon Jump, and Pond Leap.
- Attack hits use pooled burst particles.
- Enemy markers communicate ambusher and seeker behavior.
- Hit and win events have distinct Web Audio tones.
- The game-over screen keeps the run card centered, with a challenge board on the left and the upgrade store on the right. Both side panels stack cleanly on mobile.

## Technical notes

- The map is 1000 by 1000 units with a centered 40-unit grid.
- Houses, enemies, and pickups use the same tile-center coordinate system.
- Best score, lifetime analytics, achievements, and upgrades use local storage when available.
- All gameplay code and assets are contained in `game`.
