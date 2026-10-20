import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Dimensions } from "./dims";
import type { CanopyConfig } from "./config";
import { resolveWalls, totalHeight } from "./config";
import { loadAllModels, applyMaterial } from "./loadModel";
import type { LoadedModels, CanopyMaterials } from "./loadModel";
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
import { buildWalls, buildStorageFloor } from "./build/buildWalls";
import {
  buildDimensionLines,
  disposeDimensionLines,
} from "./build/buildDimensionLines";
import { createPartMaterials } from "./models/partMaterials";
import type { PartMaterials } from "./models/partMaterials";
import { disposeOwnedGeometry } from "./models/primitives";

const BACKGROUND = 0xf4f3f0;

export function createCanopyEngine(host: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  camera.position.set(6, 4.5, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);

  // HTML-підписи розмірів поверх WebGL-канваса
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  host.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // не пускаємо камеру під землю
  controls.minDistance = 2;
  controls.maxDistance = 40;
  controls.target.set(0, 1, 0);

  // --- світло ---
  // м'які відбиття для алюмінію та скла
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.55;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.6));
  const sun = new THREE.DirectionalLight(0xfff6ea, 2.2);
  sun.position.set(5, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  // підлога, що приймає лише тінь + ледь помітна сітка
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ color: 0x5a5f6a, opacity: 0.18 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(20, 20, 0xd2cfc8, 0xe2dfd8);
  grid.position.y = 0.001;
  scene.add(grid);

  // --- стан ---
  let models: LoadedModels | null = null;
  let baseMaterials: CanopyMaterials | null = null;
  let partMaterials: { textured: PartMaterials; plain: PartMaterials } | null =
    null;
  const grayMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfcfcf,
    roughness: 0.8,
  });
  let texturesEnabled = true;
  let dimensionsVisible = true;
  let lastConfig: CanopyConfig | null = null;
  let currentGroup: THREE.Group | null = null;
  let dimensionGroup: THREE.Group | null = null;

  async function init() {
    const result = await loadAllModels();
    models = result.models;
    baseMaterials = result.materials;
    partMaterials = createPartMaterials(baseMaterials, grayMaterial);

    // анізотропна фільтрація: волокна дерева не "розмиваються" під гострим кутом
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    for (const material of [baseMaterials.wood, baseMaterials.asphalt]) {
      const standard = material as THREE.MeshStandardMaterial;
      for (const map of [standard.map, standard.normalMap]) {
        if (map) {
          map.anisotropy = anisotropy;
          map.needsUpdate = true;
        }
      }
    }
  }

  function clearScene() {
    if (currentGroup) {
      scene.remove(currentGroup);
      disposeOwnedGeometry(currentGroup);
      currentGroup = null;
    }
    if (dimensionGroup) {
      scene.remove(dimensionGroup);
      disposeDimensionLines(dimensionGroup);
      dimensionGroup = null;
    }
  }

  function update(config: CanopyConfig) {
    if (!models || !partMaterials) {
      throw new Error("Models not loaded yet — call init() first");
    }

    const dimsChanged =
      !lastConfig || !sameDims(lastConfig.dims, config.dims);
    lastConfig = config;
    clearScene();

    const { dims } = config;
    const walls = resolveWalls(config);
    const mats = texturesEnabled ? partMaterials.textured : partMaterials.plain;

    const canopy = new THREE.Group();
    canopy.add(buildColumns(dims, models));
    canopy.add(buildCornerBraces(dims, models, walls));
    canopy.add(buildRimBeam(dims, models));
    canopy.add(buildInnerFascia(dims, models));
    canopy.add(buildOuterFascia(dims, models));
    canopy.add(buildDecking(dims, models));
    canopy.add(buildRafters(dims, models));
    canopy.add(buildLongRafters(dims, models));
    canopy.add(buildInserts(dims, models));
    canopy.add(buildRoofEdge(dims, models));
    canopy.add(buildRoofing(dims, models));
    canopy.add(buildWalls(dims, walls, models, mats));
    canopy.add(buildStorageFloor(dims, config.storage, models));

    canopy.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = !child.userData.noShadow;
        child.receiveShadow = true;
      }
    });

    scene.add(canopy);
    currentGroup = canopy;

    dimensionGroup = buildDimensionLines(dims);
    dimensionGroup.visible = dimensionsVisible;
    scene.add(dimensionGroup);

    fitShadowCamera(dims);
    if (dimsChanged) {
      controls.target.set(0, dims.height / 2, 0);
    }
    updateLabelOcclusion();
  }

  // --- підписи, закриті конструкцією, робимо напівпрозорими ---
  // (CSS2D-підписи завжди поверх канваса, тож без цього вони "просвічують" крізь стіни)
  const raycaster = new THREE.Raycaster();
  const labelPosition = new THREE.Vector3();
  let lastOcclusionCheck = 0;

  function updateLabelOcclusion() {
    if (!dimensionGroup || !currentGroup || !dimensionsVisible) return;
    const canopy = currentGroup;
    dimensionGroup.traverse((child) => {
      if (!(child instanceof CSS2DObject)) return;
      child.getWorldPosition(labelPosition);
      const direction = labelPosition.clone().sub(camera.position);
      const distance = direction.length();
      raycaster.set(camera.position, direction.normalize());
      raycaster.far = distance - 0.05;
      const hidden = raycaster
        .intersectObject(canopy, true)
        .some((hit) => !hit.object.userData.seeThrough);
      child.element.classList.toggle("is-occluded", hidden);
    });
  }

  controls.addEventListener("change", () => {
    const now = performance.now();
    if (now - lastOcclusionCheck < 120) return;
    lastOcclusionCheck = now;
    updateLabelOcclusion();
  });
  controls.addEventListener("end", () => updateLabelOcclusion());

  function fitShadowCamera(dims: Dimensions) {
    const r = Math.max(dims.width, dims.depth) / 2 + 2;
    const cam = sun.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 0.5;
    cam.far = 30;
    cam.updateProjectionMatrix();
  }

  function setTexturesEnabled(enabled: boolean) {
    if (!models || !baseMaterials) {
      throw new Error("Models not loaded yet — call init() first");
    }
    texturesEnabled = enabled;

    const wood = enabled ? baseMaterials.wood : grayMaterial;
    const asphalt = enabled ? baseMaterials.asphalt : grayMaterial;
    const aluminium = enabled ? baseMaterials.aluminium : grayMaterial;

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
    if (lastConfig) update(lastConfig);
  }

  function setDimensionsVisible(visible: boolean) {
    dimensionsVisible = visible;
    if (dimensionGroup) dimensionGroup.visible = visible;
    labelRenderer.domElement.style.display = visible ? "" : "none";
    updateLabelOcclusion();
  }

  // --- камера ---
  function zoom(factor: number) {
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    );
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);
    updateLabelOcclusion();
  }

  function resetView() {
    const dims = lastConfig?.dims ?? { width: 3, height: 2.2, depth: 5 };
    const size = Math.max(dims.width, dims.depth, totalHeight(dims));
    const distance = size * 1.85 + 2;
    controls.target.set(0, dims.height / 2, 0);
    const direction = new THREE.Vector3(0.75, 0.55, 1).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    controls.update();
    updateLabelOcclusion();
  }

  // --- розмір канваса = розмір контейнера, а не вікна ---
  function resize() {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  let frameId = 0;
  function animate() {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    if (dimensionsVisible) labelRenderer.render(scene, camera);
  }
  animate();

  function dispose() {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    clearScene();
    controls.dispose();
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return {
    init,
    update,
    setTexturesEnabled,
    setDimensionsVisible,
    zoom,
    resetView,
    dispose,
  };
}

function sameDims(a: Dimensions, b: Dimensions) {
  return a.width === b.width && a.height === b.height && a.depth === b.depth;
}
