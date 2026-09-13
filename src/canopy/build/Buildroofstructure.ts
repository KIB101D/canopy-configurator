import * as THREE from "three";
import type { Dimensions } from "../Dims";
import type { LoadedModels } from "../loadModel";
import { createBeamBetweenPoints } from "../helpers/createBeamBetweenPoints";
import { createParallelBeams } from "../helpers/createParallelBeams";
import { createDeckingBoard } from "../createDeckingBoard";
import { OUTER_FASCIA_OVERHANG } from "./Buildfascialayers";

export function buildDecking(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = OUTER_FASCIA_OVERHANG;
  const deckingY = dims.height + 0.1 + 0.2;
  const boardWidth = 0.19;

  const spanFrom = -(halfWidth + overhang);
  const spanTo = halfWidth + overhang;
  const rangeFrom = -(halfDepth + overhang) + boardWidth / 2;
  const rangeTo = halfDepth + overhang - boardWidth / 2;
  const rangeLength = rangeTo - rangeFrom;
  const count = Math.round(rangeLength / boardWidth) + 1;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const z = rangeFrom + t * rangeLength;

    createDeckingBoard(
      group,
      models.decking,
      new THREE.Vector3(spanFrom, deckingY, z),
      new THREE.Vector3(spanTo, deckingY, z),
    );
  }

  return group;
}

export function buildRafters(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = 0.18;
  const rimBeamTopY = dims.height + 0.15;
  const rafterStep = 0.5;

  createParallelBeams(
    group,
    models.rafter,
    "z",
    rimBeamTopY,
    -(halfWidth + overhang),
    halfWidth + overhang,
    -halfDepth,
    halfDepth,
    rafterStep,
    0.025,
  );

  return group;
}

export function buildLongRafters(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = 0.17;
  const rimBeamTopY = dims.height + 0.15;
  const columnOuterEdge = halfWidth + 0.075;

  const points = [{ x: -columnOuterEdge }, { x: columnOuterEdge }];

  for (const point of points) {
    const from = new THREE.Vector3(
      point.x,
      rimBeamTopY,
      -(halfDepth + overhang),
    );
    const to = new THREE.Vector3(point.x, rimBeamTopY, halfDepth + overhang);

    createBeamBetweenPoints(group, models.rafter, from, to, 0, 0.025);
  }

  return group;
}

export function buildInserts(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = 0.18;
  const rimBeamTopY = dims.height + 0.15;

  const sides = [-halfDepth, halfDepth];
  const insertCount = 4;
  const insertNativeLength = 0.2;
  const rimBeamOuterEdge = 0.075;
  const fasciaInsetOverlap = 0.01;
  const extendInwardNear = 0.1; // асиметрична поправка, підібрана вручну на -halfDepth стороні

  for (const z of sides) {
    const direction = z < 0 ? -1 : 1;
    const extraInward = z < 0 ? extendInwardNear : 0;

    const startZ = z + direction * (rimBeamOuterEdge - extraInward);
    const endZ = z + direction * (overhang - fasciaInsetOverlap);

    for (let i = 0; i < insertCount; i++) {
      const t = i / (insertCount - 1);
      const x = -halfWidth + t * dims.width;

      const from = new THREE.Vector3(x, rimBeamTopY, startZ);
      const to = new THREE.Vector3(x, rimBeamTopY, endZ);

      createBeamBetweenPoints(
        group,
        models.insert,
        from,
        to,
        0,
        0,
        insertNativeLength,
      );
    }
  }

  return group;
}
