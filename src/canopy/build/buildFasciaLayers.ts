import * as THREE from "three";
import type { Dimensions } from "../dims";
import type { LoadedModels } from "../loadModel";
import { createBeamBetweenPoints } from "../helpers/createBeamBetweenPoints";

function buildFasciaLayer(
  dims: Dimensions,
  models: LoadedModels,
  y: number,
  overhang: number,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const beamThickness = 0.02;

  const points = [
    new THREE.Vector3(-(halfWidth + overhang), y, -(halfDepth + overhang)),
    new THREE.Vector3(halfWidth + overhang, y, -(halfDepth + overhang)),
    new THREE.Vector3(halfWidth + overhang, y, halfDepth + overhang),
    new THREE.Vector3(-(halfWidth + overhang), y, halfDepth + overhang),
  ];

  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const isShortSide = i % 2 === 0;
    const extend = isShortSide ? beamThickness / 2 : -beamThickness / 2;

    createBeamBetweenPoints(group, models.fascia, from, to, extend, 0.01);
  }

  return group;
}

export const INNER_FASCIA_OVERHANG = 0.18;
export const OUTER_FASCIA_OVERHANG = 0.18 + 0.02;

export function buildInnerFascia(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const y = dims.height + 0.1;
  return buildFasciaLayer(dims, models, y, INNER_FASCIA_OVERHANG);
}

export function buildOuterFascia(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const y = dims.height + 0.1 + 0.1;
  return buildFasciaLayer(dims, models, y, OUTER_FASCIA_OVERHANG);
}
