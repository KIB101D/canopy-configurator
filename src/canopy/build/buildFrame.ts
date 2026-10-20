import * as THREE from "three";
import type { Dimensions } from "../dims";
import type { LoadedModels } from "../loadModel";
import type { WallsConfig } from "../config";
import { getWallSegments } from "../config";

export function buildColumns(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;

  const positions: [number, number, number][] = [
    [-halfWidth, 0, -halfDepth],
    [halfWidth, 0, -halfDepth],
    [halfWidth, 0, 0],
    [-halfWidth, 0, halfDepth],
    [-halfWidth, 0, 0],
    [halfWidth, 0, halfDepth],
  ];

  const referenceHeight = 2.2; // висота колони в оригінальному .obj

  for (const [x, y, z] of positions) {
    const instance = models.column.clone();
    instance.position.set(x, y, z);
    instance.scale.y = dims.height / referenceHeight;
    group.add(instance);
  }

  return group;
}

/**
 * Кутові розкоси ставимо з обох кінців кожного відкритого прольоту по периметру.
 * Якщо в прольоті є стіна, розкоси прибираємо — інакше вони пройдуть крізь обшивку.
 * Для каркасу без стін виходить ті самі 12 розкосів, що й раніше.
 */
export function buildCornerBraces(
  dims: Dimensions,
  models: LoadedModels,
  walls?: WallsConfig,
): THREE.Group {
  const group = new THREE.Group();
  const referenceHeight = 2.2;

  for (const segment of getWallSegments(dims)) {
    if (!segment.perimeter) continue;
    if (walls && walls[segment.id] !== "none") continue;

    const ends = [
      { at: segment.from, toward: segment.to },
      { at: segment.to, toward: segment.from },
    ];

    for (const { at, toward } of ends) {
      const instance = models.cornerBeam.clone();
      instance.position.set(at.x, 0, at.z);
      instance.scale.y = dims.height / referenceHeight;
      // модель розкосу дивиться вздовж +X, тож повертаємо її в бік прольоту
      instance.rotation.y = Math.atan2(-(toward.z - at.z), toward.x - at.x);
      group.add(instance);
    }
  }

  return group;
}
