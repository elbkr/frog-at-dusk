import * as THREE from 'three';
import { updateMapPalette } from './Map.js';
import { getDifficultySettings } from './Difficulty.js';

export const DAY_DURATION = 60;
export const SUNSET_DURATION = 60;
export const NIGHT_DURATION = 120;
export function getCycleDurations() {
  const night = getDifficultySettings().nightDuration;
  return { day: DAY_DURATION, sunset: SUNSET_DURATION, night, total: DAY_DURATION + SUNSET_DURATION + night };
}
const day = new THREE.Color(0x83b8a0);
const dusk = new THREE.Color(0xdf8a69);
const night = new THREE.Color(0x101a36);
const lightColor = new THREE.Color();
const skyColor = new THREE.Color();
const coolLight = new THREE.Color(0x879bdc);
const fog = new THREE.Fog(day, 900, 1650);

export function updateDayNight(elapsed, scene, ambient, sun) {
  const durations = getCycleDurations();
  const completed = elapsed >= durations.total;
  const progress = THREE.MathUtils.clamp(elapsed / durations.total, 0, 1);
  const dayEnd = durations.day / durations.total;
  const sunsetEnd = (durations.day + durations.sunset) / durations.total;
  let blend;
  let phase;
  if (completed) { blend = 0; phase = 'DAYLIGHT'; }
  else if (progress < dayEnd) { blend = 0; phase = 'DAYLIGHT'; }
  else if (progress < sunsetEnd) { blend = (progress - dayEnd) / (sunsetEnd - dayEnd); phase = 'SUNSET'; }
  else { blend = 1; phase = 'NIGHTFALL'; }
  const nightMix = completed ? 0 : progress < sunsetEnd ? 0 : THREE.MathUtils.smoothstep(progress, sunsetEnd, 1);
  if (completed) skyColor.copy(day);
  else if (progress < sunsetEnd) skyColor.copy(day).lerp(dusk, blend);
  else skyColor.copy(dusk).lerp(night, THREE.MathUtils.smoothstep(progress, sunsetEnd, sunsetEnd + (1 - sunsetEnd) * 0.55));
  scene.background = skyColor;
  fog.color.copy(skyColor);
  scene.fog = fog;
  ambient.intensity = THREE.MathUtils.lerp(1.35, 0.48, nightMix);
  lightColor.set(0xffffff).lerp(coolLight, nightMix);
  sun.color.copy(lightColor);
  sun.intensity = THREE.MathUtils.lerp(1.4, 0.72, nightMix);
  updateMapPalette(nightMix * 0.82);
  return { progress, nightMix, phase, completed };
}
