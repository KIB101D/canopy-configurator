import * as THREE from "three";

export function createDeckingBoard(
  scene: THREE.Object3D,
  loadedBeam: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
) {
  const board = loadedBeam.clone();

  const length = from.distanceTo(to);

  board.position.copy(to);
  board.scale.z = length;

  const ddx = from.x - to.x;
  const ddz = from.z - to.z;
  board.rotation.y = Math.atan2(-ddx, -ddz);

  scene.add(board);
  return board;
}
