import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Dimensions } from "./dims";
import { loadAllModels } from "./loadModel";
import type { LoadedModels } from "./loadModel";
import type { CanopyMaterials } from "./loadModel";
import { applyMaterial } from "./loadModel";
import { buildColumns, buildCornerBraces } from "./build/buildFrame";
import { buildRimBeam } from "./build/buildRimBeam";
import { buildInnerFascia, buildOuterFascia } from "./build/buildFasciaLayers";
import {
  buildDecking,
  buildRafters,
  buildLongRafters,
  buildInserts,
} from "./build/buildRoofStructure";
import { buildRoofEdge, buildRoofing } from "./build/buildRoofEdgeAndRoofing";

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
  let materials: CanopyMaterials | null = null;
  const grayMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  let lastDims: Dimensions | null = null;
  let currentGroup: THREE.Group | null = null;

  async function init() {
    const result = await loadAllModels();
    models = result.models;
    materials = result.materials;
  }

  function removeGroup(group: THREE.Group) {
    scene.remove(group);
  }

  function rebuild(dims: Dimensions) {
    if (!models) {
      throw new Error("Models not loaded yet — call init() first");
    }

    lastDims = dims;

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

  function setTexturesEnabled(enabled: boolean) {
    if (!models || !materials) {
      throw new Error("Models not loaded yet — call init() first");
    }

    const wood = enabled ? materials.wood : grayMaterial;
    const asphalt = enabled ? materials.asphalt : grayMaterial;
    const aluminium = enabled ? materials.aluminium : grayMaterial;

    applyMaterial(models.column, wood);
    applyMaterial(models.cornerBeam, wood);
    applyMaterial(models.rimBeam, wood);
    applyMaterial(models.fascia, wood);
    applyMaterial(models.decking, wood);
    applyMaterial(models.rafter, wood);
    applyMaterial(models.insert, wood);
    applyMaterial(models.roofEdgeStraight, aluminium);
    applyMaterial(models.roofEdgeCorner, aluminium);
    applyMaterial(models.roofingTile, asphalt);

    // перебудовуємо, щоб уже видимі копії на сцені підхопили нове посилання на матеріал
    if (lastDims) {
      rebuild(lastDims);
    }
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

  return { init, rebuild, setTexturesEnabled, dispose };
}
