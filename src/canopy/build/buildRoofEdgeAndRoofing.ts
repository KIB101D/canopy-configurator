import * as THREE from "three";
import type { Dimensions } from "../dims";
import type { LoadedModels } from "../loadModel";
import { createBeamBetweenPoints } from "../helpers/createBeamBetweenPoints";
import { OUTER_FASCIA_OVERHANG } from "./Buildfascialayers";

export function buildRoofEdge(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = OUTER_FASCIA_OVERHANG;
  const roofHalfWidth = halfWidth + overhang;
  const roofHalfDepth = halfDepth + overhang;
  const roofY = dims.height + 0.2 + 0.2; // верх зовнішнього фризу

  // прямі профілі
  createBeamBetweenPoints(
    group,
    models.roofEdgeStraight,
    new THREE.Vector3(-roofHalfWidth, roofY, -roofHalfDepth),
    new THREE.Vector3(roofHalfWidth, roofY, -roofHalfDepth),
  );
  createBeamBetweenPoints(
    group,
    models.roofEdgeStraight,
    new THREE.Vector3(roofHalfWidth, roofY, roofHalfDepth),
    new THREE.Vector3(-roofHalfWidth, roofY, roofHalfDepth),
  );
  createBeamBetweenPoints(
    group,
    models.roofEdgeStraight,
    new THREE.Vector3(roofHalfWidth, roofY, -roofHalfDepth),
    new THREE.Vector3(roofHalfWidth, roofY, roofHalfDepth),
  );
  createBeamBetweenPoints(
    group,
    models.roofEdgeStraight,
    new THREE.Vector3(-roofHalfWidth, roofY, roofHalfDepth),
    new THREE.Vector3(-roofHalfWidth, roofY, -roofHalfDepth),
  );

  // кутові з'єднання
  const roofCorners = [
    { x: -roofHalfWidth, z: -roofHalfDepth, rotation: 0 },
    { x: roofHalfWidth, z: -roofHalfDepth, rotation: 270 },
    { x: roofHalfWidth, z: roofHalfDepth, rotation: 180 },
    { x: -roofHalfWidth, z: roofHalfDepth, rotation: 90 },
  ];

  for (const corner of roofCorners) {
    const instance = models.roofEdgeCorner.clone();
    instance.position.set(corner.x, roofY, corner.z);
    instance.rotation.y = THREE.MathUtils.degToRad(corner.rotation);
    group.add(instance);
  }

  return group;
}

export function buildRoofing(
  dims: Dimensions,
  models: LoadedModels,
): THREE.Group {
  const group = new THREE.Group();
  const halfWidth = dims.width / 2;
  const halfDepth = dims.depth / 2;
  const overhang = OUTER_FASCIA_OVERHANG;
  const roofY = dims.height + 0.2 + 0.2; // верх зовнішнього фризу + товщина фризу

  const xMin = -(halfWidth + overhang);
  const xMax = halfWidth + overhang;
  const zMin = -(halfDepth + overhang);
  const zMax = halfDepth + overhang;

  const tileSize = 1;
  const cols = Math.ceil((xMax - xMin) / tileSize);
  const rows = Math.ceil((zMax - zMin) / tileSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileX = xMin + col * tileSize;
      const tileZTop = zMax - row * tileSize;

      const actualWidth = Math.min(tileSize, xMax - tileX);
      const actualDepth = Math.min(tileSize, tileZTop - zMin);

      const tile = models.roofingTile.clone();
      tile.position.set(tileX, roofY, tileZTop);
      tile.scale.x = actualWidth;
      tile.scale.z = actualDepth;

      group.add(tile);
    }
  }

  return group;
}
