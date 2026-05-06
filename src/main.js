import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const issModelUrl = '/assets/International Space Station (ISS).glb';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  5000,
);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 28;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;

const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
keyLight.position.set(6, 8, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8fb6ff, 1.8);
fillLight.position.set(-8, 3, -6);
scene.add(fillLight);

const ambientLight = new THREE.AmbientLight(0x9bbcff, 0.75);
scene.add(ambientLight);

const stars = createStarField();
scene.add(stars);

const clock = new THREE.Clock();
const defaultTarget = new THREE.Vector3(0, 0, 0);
const defaultCameraDirection = new THREE.Vector3(0.62, 0.5, 0.72).normalize();
const defaultCameraPosition = new THREE.Vector3(6.4, 5.1, 7.2);
const targetCameraPosition = defaultCameraPosition.clone();
const targetControlsTarget = defaultTarget.clone();

let modelRoot;
let modelRadius = 4;
let returnOrbitDistance = defaultCameraPosition.length();
let isInteracting = false;
let isReturningToDefault = false;
let hasUserInteracted = false;
let lastInteractionTime = performance.now();
let orbitAngle = Math.atan2(defaultCameraPosition.z, defaultCameraPosition.x);

camera.position.copy(defaultCameraPosition);
controls.target.copy(defaultTarget);
controls.update();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/gltf/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load(
  issModelUrl,
  (gltf) => {
    modelRoot = gltf.scene;
    prepareModel(modelRoot);
    scene.add(modelRoot);
    loading.classList.add('is-hidden');
  },
  undefined,
  (error) => {
    loading.textContent = 'Could not load ISS model.';
    console.error(error);
  },
);

controls.addEventListener('start', () => {
  isInteracting = true;
  isReturningToDefault = false;
  hasUserInteracted = true;
  lastInteractionTime = performance.now();
});

controls.addEventListener('change', () => {
  if (isInteracting) {
    lastInteractionTime = performance.now();
  }
});

controls.addEventListener('end', () => {
  isInteracting = false;
  lastInteractionTime = performance.now();
});

renderer.domElement.addEventListener(
  'wheel',
  () => {
    isInteracting = true;
    isReturningToDefault = false;
    hasUserInteracted = true;
    lastInteractionTime = performance.now();
    window.setTimeout(() => {
      isInteracting = false;
      lastInteractionTime = performance.now();
    }, 140);
  },
  { passive: true },
);

window.addEventListener('resize', onResize);

animate();

function prepareModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = 7 / maxDimension;

  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const sphere = scaledBox.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 3);

  controls.minDistance = modelRadius * 0.65;
  updateDefaultCameraPosition(true);
  orbitAngle = Math.atan2(defaultCameraPosition.z, defaultCameraPosition.x);
}

function createStarField() {
  const group = new THREE.Group();
  const starTexture = createStarTexture();

  group.add(createStarLayer(2100, 950, 2600, 1.65, 0.78, starTexture, 0.74));
  group.add(createStarLayer(620, 1100, 2900, 2.35, 0.88, starTexture, 0.86));
  group.add(createStarLayer(130, 1250, 3200, 3.25, 1, starTexture, 0.98));

  return group;
}

function createStarLayer(starCount, minRadius, maxRadius, size, opacity, starTexture, brightness) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const color = new THREE.Color();

  for (let i = 0; i < starCount; i += 1) {
    const radius = THREE.MathUtils.randFloat(minRadius, maxRadius);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const index = i * 3;

    positions[index] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index + 1] = radius * Math.cos(phi);
    positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const colorType = Math.random();
    const hue = colorType < 0.22
      ? THREE.MathUtils.randFloat(0.08, 0.13)
      : colorType > 0.82
        ? THREE.MathUtils.randFloat(0.58, 0.66)
        : THREE.MathUtils.randFloat(0.52, 0.6);
    const saturation = colorType < 0.22 || colorType > 0.82
      ? THREE.MathUtils.randFloat(0.16, 0.34)
      : THREE.MathUtils.randFloat(0.02, 0.12);
    const lightness = THREE.MathUtils.randFloat(0.62, 1) * brightness;

    color.setHSL(hue, saturation, lightness);
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    map: starTexture,
    alphaMap: starTexture,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createStarTexture() {
  const size = 64;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;

  const context = textureCanvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.38, 'rgba(255, 255, 255, 0.82)');
  gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.18)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const now = performance.now();
  const hasBeenIdle = now - lastInteractionTime > 3000;

  if (!isInteracting && hasUserInteracted && hasBeenIdle) {
    if (!isReturningToDefault) {
      isReturningToDefault = true;
      const offset = camera.position.clone().sub(controls.target);
      returnOrbitDistance = THREE.MathUtils.clamp(
        offset.length(),
        controls.minDistance,
        controls.maxDistance,
      );
      orbitAngle = Math.atan2(offset.z, offset.x);
      targetCameraPosition.copy(getOrbitPosition(returnOrbitDistance, orbitAngle));
      targetControlsTarget.copy(defaultTarget);
    }

    orbitAngle -= delta * 0.13;
    targetCameraPosition.copy(getOrbitPosition(returnOrbitDistance, orbitAngle));
    const returnProgress = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetCameraPosition, returnProgress);
    controls.target.lerp(targetControlsTarget, returnProgress);

    if (
      camera.position.distanceTo(targetCameraPosition) < 0.04
      && controls.target.distanceTo(defaultTarget) < 0.01
    ) {
      isReturningToDefault = false;
      hasUserInteracted = false;
      orbitIdleCamera(delta);
    }
  } else if (!isInteracting && !hasUserInteracted) {
    orbitIdleCamera(delta);
  }

  if (modelRoot) {
    modelRoot.rotation.y -= delta * 0.035;
  }

  stars.rotation.y -= delta * 0.001;
  controls.update();
  renderer.render(scene, camera);
}

function orbitIdleCamera(delta) {
  const distance = THREE.MathUtils.clamp(
    camera.position.distanceTo(defaultTarget),
    controls.minDistance,
    controls.maxDistance,
  );

  orbitAngle -= delta * 0.13;
  const nextPosition = getOrbitPosition(distance, orbitAngle);
  camera.position.x = nextPosition.x;
  camera.position.z = nextPosition.z;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, nextPosition.y, 1 - Math.pow(0.0001, delta));
  controls.target.lerp(defaultTarget, 1 - Math.pow(0.0001, delta));
}

function getOrbitPosition(distance, angle) {
  const height = distance * defaultCameraDirection.y;
  const planarRadius = Math.sqrt(Math.max(distance * distance - height * height, 0));

  return new THREE.Vector3(
    Math.cos(angle) * planarRadius,
    height,
    Math.sin(angle) * planarRadius,
  );
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateDefaultCameraPosition(!hasUserInteracted && !isInteracting);
}

function updateDefaultCameraPosition(snapCamera = false) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const fitFov = Math.min(verticalFov, horizontalFov);
  const fitPadding = camera.aspect < 0.75 ? 1.08 : 0.94;
  const distance = (modelRadius / Math.sin(fitFov / 2)) * fitPadding;

  defaultCameraPosition.copy(defaultCameraDirection).multiplyScalar(distance);
  targetCameraPosition.copy(defaultCameraPosition);
  controls.maxDistance = Math.max(distance * 2.4, modelRadius * 5.5);

  if (snapCamera) {
    camera.position.copy(defaultCameraPosition);
    controls.target.copy(defaultTarget);
    controls.update();
    orbitAngle = Math.atan2(defaultCameraPosition.z, defaultCameraPosition.x);
  }
}
