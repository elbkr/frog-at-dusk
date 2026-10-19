# Frog at Dusk: Nightfall Survival — Progress

## Added in this pass

- Inspected the existing `src` modules and kept the grid-jump, model-loading, house, attack, score, and reset architecture.
- Added a polished responsive title/HUD/game-over interface with controls and run summaries.
- Added a smooth day, sunset, and night cycle with lighting, background, and checkerboard color changes. Current temporary timing is 20 seconds per stage (60 seconds total).
- Added procedural rocks and trees with shared circular collision footprints used by the player and enemies.
- Added pond scenery, non-blocking decorations, and lantern glow.
- Added collectible fireflies and three temporary abilities: shield, cloak, and score boost.
- Added enemy variants with distinct tint, speed, and behavior profiles as the night progresses.
- Added basic achievement notifications and best-score persistence.
- Added sound toggle and original Web Audio pickup/attack tones.
- Added an opaque-tinted, blurred backing behind the top-left HUD bar for legibility.
- House placement now rejects layouts that break connectivity across the valid grid, checks pond clearance, and retains house/rock/tree collision coverage.
- Later enemies spawn at validated perimeter positions with player/enemy clearance; new spawns avoid houses, obstacles, and ponds.
- Ponds slow enemies to half speed and create reusable ripple rings when the frog enters or leaves.
- Night seekers pursue and consume fireflies, and do not cause a lethal collision on contact.
- Expanded the run summary with survival time, visited houses, successful hops, and current-run achievements.
- Added Village Explorer, Rock Hopper, and Moon Survivor achievement unlocks.
- Added Moon Jump and Pond Leap gifts with powered hop movement, pond-crossing tracking, and gift achievements.
- Added dedicated model loading for wanderer, ambusher, and night seeker enemies with distinct movement patterns.
- Removed the zombie swarm enemy and expanded the playable map from 800 to 1000 units while retaining the 40-unit hop grid.
- Removed all remaining zombie references and aligned enemy and pickup spawns to tile centers, including the centered perimeter spawn ring.
- Restored the default `enemy.glb` chaser while keeping the removed zombie/swarm variant out of gameplay.
- Expanded achievement tracking with gift variety, powered leaps, and enemy catalog progress.
- Added three-life runs with collision invulnerability, hit feedback, and recovery to keep play sessions going.
- Added pooled attack burst particles and lifetime run analytics persisted locally.
- Added live life display and expanded game-over analytics/achievement summary.
- Completed the balance pass with capped difficulty scaling, slower enemy spawning, and a twelve-enemy active limit.
- Restored the full competition run timing: 1 minute daylight, 1 minute sunset, and 2 minutes of night; returning to daylight now produces a win.
- Added persistent firefly-funded upgrades for extra lives, attack reach, and gift duration.
- Added enemy telegraph pulsing, impact audio, powered-ability aura colors, and a win jingle.
- Expanded challenge tracking with Village Saver, Perfect Night, and High Roller goals.
- Added a post-run upgrade board and challenge/achievement summary to make replay scoring meaningful.
- Tested the win transition with an accelerated cycle, then restored the competition timings: 1 minute daylight, 1 minute sunset, and 2 minutes night.
- Added title-screen difficulty selection with Easy, Normal, and Hardcore modes; Hardcore increases the night to 3 minutes and raises enemy pressure.
- Added `game.md` as the competition overview covering the run loop, mechanics, enemies, progression, challenges, analytics, and presentation polish.
- Fixed pond ripple state resetting when a new run starts via Space or the title-screen button; reduced ripple size and duration to avoid oversized rings.
- The production Vite build now completes successfully.

## Remaining / not yet implemented

- Detailed achievement progress is tracked in the achievement module; the game-over screen now summarizes unlocked and lifetime progress.
- A visual browser playthrough remains the only follow-up; automated tests were not run, per project instructions.

## Notes

- All edits for this task are confined to the `game` directory.
- Existing loaded assets include the frog, dedicated enemy variants, and three houses; rocks, trees, ponds, lights, and pickups are procedural Three.js geometry.
- No third-party trademarks, fictional characters, memes, or commercial recordings were introduced.
