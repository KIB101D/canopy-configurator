import * as THREE from "three";
import { createBeamBetweenPoints } from "./createBeamBetweenPoints";

export function createParallelBeams(
  scene: THREE.Object3D,
  loadedBeam: THREE.Object3D,
  axis: "x" | "z",
  fixedY: number,
  spanFrom: number,
  spanTo: number,
  rangeFrom: number,
  rangeTo: number,
  step: number,
  pivotOffset: number = 0,
) {
  const rangeLength = rangeTo - rangeFrom;
  const count = Math.ceil(rangeLength / step) + 1;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const pos = rangeFrom + t * rangeLength;

    const from =
      axis === "z"
        ? new THREE.Vector3(spanFrom, fixedY, pos)
        : new THREE.Vector3(pos, fixedY, spanFrom);
    const to =
      axis === "z"
        ? new THREE.Vector3(spanTo, fixedY, pos)
        : new THREE.Vector3(pos, fixedY, spanTo);

    createBeamBetweenPoints(scene, loadedBeam, from, to, 0, pivotOffset);
  }

  return count;
}
