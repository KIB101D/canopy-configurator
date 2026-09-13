import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Dimensions } from "./Dims";
import { loadAllModels } from "./loadModel";
import type { LoadedModels } from "./loadModel";
import { buildColumns, buildCornerBraces } from "./build/Buildframe";
import { buildRimBeam } from "./build/Buildrimbeam";
import { buildInnerFascia, buildOuterFascia } from "./build/Buildfascialayers";
import {
  buildDecking,
  buildRafters,
  buildLongRafters,
  buildInserts,
} from "./build/Buildroofstructure";
import { buildRoofEdge, buildRoofing } from "./build/Buildroofedgeandroofing";

export function createCanopyEngine(host: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2b2b);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  );
  camera.position.set(3, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(4, 6, 3);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  scene.add(new THREE.GridHelper(10, 10));

  let models: LoadedModels | null = null;
  let currentGroup: THREE.Group | null = null;

  async function init() {
    const result = await loadAllModels();
    models = result.models; // матеріали вже призначені всередині loadAllModels
  }

  // ВАЖЛИВО: НЕ викликаємо geometry.dispose()/material.dispose() тут.
  // .clone() у Three.js не копіює geometry/material глибоко — усі копії
  // однієї деталі ділять ті самі спільні об'єкти (завантажені один раз у init()).
  // dispose() на одному екземплярі знищив би дані для геометрії/матеріалу
  // ВСІХ інших копій цієї ж деталі, зламавши наступні виклики rebuild().
  // Просто прибираємо стару групу зі сцени — сам JS garbage collector
  // прибере обгортки Object3D, а спільна geometry/material лишається живою.
  function removeGroup(group: THREE.Group) {
    scene.remove(group);
  }

  function rebuild(dims: Dimensions) {
    if (!models) {
      throw new Error("Models not loaded yet — call init() first");
    }

    if (currentGroup) {
      removeGroup(currentGroup);
    }

    const canopy = new THREE.Group();
    canopy.add(buildColumns(dims, models));
    canopy.add(buildCornerBraces(dims, models));
    canopy.add(buildRimBeam(dims, models));
    canopy.add(buildInnerFascia(dims, models));
    canopy.add(buildOuterFascia(dims, models));
    canopy.add(buildDecking(dims, models));
    canopy.add(buildRafters(dims, models));
    canopy.add(buildLongRafters(dims, models));
    canopy.add(buildInserts(dims, models));
    canopy.add(buildRoofEdge(dims, models));
    canopy.add(buildRoofing(dims, models));

    scene.add(canopy);
    currentGroup = canopy;

    controls.target.set(0, dims.height / 2, 0);
    controls.update();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function dispose() {
    if (currentGroup) removeGroup(currentGroup);
    renderer.dispose();
    controls.dispose();
  }

  return { init, rebuild, dispose };
}
