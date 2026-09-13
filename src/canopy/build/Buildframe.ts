import * as THREE from "three";
import type { Dimensions } from "../Dims";
import type { LoadedModels } from "../loadModel";

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

export function buildCornerBraces(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const referenceHeight = 2.2;

  const braces: { x: number; z: number; rotation: number }[] = [
    { x: -halfWidth, z: -halfDepth, rotation: 0 },
    { x: -halfWidth, z: halfDepth, rotation: 90 },
    { x: -halfWidth, z: halfDepth, rotation: 0 },
    { x: halfWidth, z: 0, rotation: 90 },
    { x: halfWidth, z: 0, rotation: 270 },
    { x: -halfWidth, z: 0, rotation: 90 },
    { x: -halfWidth, z: 0, rotation: 270 },
    { x: halfWidth, z: -halfDepth, rotation: 180 },
    { x: halfWidth, z: -halfDepth, rotation: 270 },
    { x: halfWidth, z: halfDepth, rotation: 90 },
    { x: halfWidth, z: halfDepth, rotation: 180 },
    { x: -halfWidth, z: -halfDepth, rotation: 270 },
  ];

  for (const brace of braces) {
    const instance = models.cornerBeam.clone();
    instance.position.set(brace.x, 0, brace.z);
    instance.scale.y = dims.height / referenceHeight;
    instance.rotation.y = THREE.MathUtils.degToRad(brace.rotation);
    group.add(instance);
  }

  return group;
}
