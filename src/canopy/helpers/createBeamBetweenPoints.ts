import * as THREE from "three";

export function createBeamBetweenPoints(
  scene: THREE.Object3D,
  loadedBeam: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  extend: number = 0,
  pivotOffset: number = 0,
  nativeLength: number = 1,
) {
  const beam = loadedBeam.clone();

  const direction = to.clone().sub(from).normalize();
  const adjustedFrom = from
    .clone()
    .sub(direction.clone().multiplyScalar(extend));
  const length = from.distanceTo(to) + extend * 2;

  beam.position.copy(adjustedFrom);
  beam.scale.x = length / nativeLength;

  const dx = to.x - from.x;
  const dz = to.z - from.z;
  beam.rotation.y = Math.atan2(-dz, dx);

  const perpendicular = new THREE.Vector3(
    -Math.sin(beam.rotation.y),
    0,
    Math.cos(beam.rotation.y),
  );
  beam.position.add(perpendicular.multiplyScalar(pivotOffset));

  scene.add(beam);
  return beam;
}
