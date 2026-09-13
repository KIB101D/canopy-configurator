import * as THREE from "three";
import type { Dimensions } from "../dims";
import type { LoadedModels } from "../loadModel";
import { createBeamBetweenPoints } from "../helpers/createBeamBetweenPoints";

export function buildRimBeam(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const beamThickness = 0.15;

  const points = [
    new THREE.Vector3(-halfWidth, dims.height, -halfDepth),
    new THREE.Vector3(halfWidth, dims.height, -halfDepth),
    new THREE.Vector3(halfWidth, dims.height, halfDepth),
    new THREE.Vector3(-halfWidth, dims.height, halfDepth),
  ];

  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const isShortSide = i % 2 === 0;
    const extend = isShortSide ? beamThickness / 2 : -beamThickness / 2;

    createBeamBetweenPoints(group, models.rimBeam, from, to, extend);
  }

  return group;
}
