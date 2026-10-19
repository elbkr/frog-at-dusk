import * as THREE from 'three';

const canvas = document.querySelector('canvas.game');

export const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
