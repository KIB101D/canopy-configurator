import * as THREE from "three";
import type { Dimensions } from "../dims";
import type { LoadedModels } from "../loadModel";
import type { CanopyConfig, WallsConfig, WallType } from "../config";
import { COLUMN_SIZE, getWallSegments } from "../config";
import type { PartMaterials } from "../models/partMaterials";
import { createTimberWall } from "../models/createTimberWall";
import { createGlassSlidingWall } from "../models/createGlassSlidingWall";
import { createSlatScreen } from "../models/createSlatScreen";
import { createBeamBetweenPoints } from "../helpers/createBeamBetweenPoints";
import { createDeckingBoard } from "../helpers/createDeckingBoard";

function createWallModel(
  type: WallType,
  span: number,
  height: number,
  materials: PartMaterials,
): THREE.Group | null {
  switch (type) {
    case "wood":
      return createTimberWall(span, height, materials, false);
    case "woodDoor":
      return createTimberWall(span, height, materials, true);
    case "glass":
      return createGlassSlidingWall(span, height, materials);
    case "slats":
      return createSlatScreen(span, height, materials);
    case "none":
      return null;
  }
}

/**
 * Ставить стіни між колонами. Кожна модель будується в локальних координатах
 * (x уздовж стіни, +Z назовні) і потім повертається/зсувається на свій сегмент.
 */
export function buildWalls(
  dims: Dimensions,
  walls: WallsConfig,
  models: LoadedModels,
  materials: PartMaterials,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "walls";
  const half = COLUMN_SIZE / 2;

  for (const segment of getWallSegments(dims)) {
    const type = walls[segment.id];
    const span = segment.length - COLUMN_SIZE;
    const model = createWallModel(type, span, dims.height, materials);
    if (!model) continue;

    const dx = segment.to.x - segment.from.x;
    const dz = segment.to.z - segment.from.z;
    const dir = new THREE.Vector3(dx, 0, dz).normalize();

    // починаємо від грані колони, а не від її осі
    model.position.set(segment.from.x, 0, segment.from.z).addScaledVector(dir, half);
    model.rotation.y = Math.atan2(-dz, dx);
    model.userData.wallSide = segment.id;
    group.add(model);
  }

  // по центру немає контурної балки, тож під перегородку кладемо ригель,
  // щоб стіна впиралась у конструкцію, а не "висіла" під кроквами
  if (walls.middle !== "none") {
    const hw = dims.width / 2;
    createBeamBetweenPoints(
      group,
      models.rimBeam,
      new THREE.Vector3(-hw, dims.height, 0),
      new THREE.Vector3(hw, dims.height, 0),
    );
  }

  return group;
}

/** Дощата підлога в коморі (з тієї ж дошки, що й настил даху). */
export function buildStorageFloor(
  dims: Dimensions,
  storage: CanopyConfig["storage"],
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "storage-floor";
  if (storage.bay === "none") return group;

  const hw = dims.width / 2;
  const hd = dims.depth / 2;
  const boardWidth = 0.19;
  const inset = COLUMN_SIZE / 2;

  const zFrom = storage.bay === "front" ? inset : -hd + inset;
  const zTo = storage.bay === "front" ? hd - inset : -inset;
  const count = Math.max(1, Math.round((zTo - zFrom) / boardWidth));
  const pitch = (zTo - zFrom) / count;

  for (let i = 0; i < count; i++) {
    const z = zFrom + pitch * (i + 0.5);
    const board = createDeckingBoard(
      group,
      models.decking,
      new THREE.Vector3(-hw + inset, 0.002, z),
      new THREE.Vector3(hw - inset, 0.002, z),
    );
    board.scale.x = pitch / boardWidth;
  }

  return group;
}
