import * as THREE from "three";

export type Axis = "x" | "y" | "z";

// Ті ж пропорції UV, що й у наданих .obj-дошках:
// 1 м уздовж волокон = 1.0 по U, 1 м поперек = 0.4 по V
const UV_ALONG_GRAIN = 1.0;
const UV_ACROSS_GRAIN = 0.4;

const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 };

/**
 * Брусок/дошка довільного розміру з UV, прив'язаними до реальних метрів.
 * Текстура не розтягується разом із розміром, а волокна йдуть уздовж `grain`.
 * Геометрія створюється під конкретний розмір, тому позначаємо її
 * як "власну" — рушій звільнить її при перебудові сцени.
 */
export function woodBox(
  material: THREE.Material,
  size: [number, number, number],
  center: [number, number, number],
  grain: Axis = "x",
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  remapBoxUVs(geometry, grain);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center[0], center[1], center[2]);
  mesh.userData.ownsGeometry = true;
  return mesh;
}

/** Простий брусок без перерахунку UV — для металу та скла. */
export function plainBox(
  material: THREE.Material,
  size: [number, number, number],
  center: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material,
  );
  mesh.position.set(center[0], center[1], center[2]);
  mesh.userData.ownsGeometry = true;
  return mesh;
}

function remapBoxUVs(geometry: THREE.BoxGeometry, grain: Axis) {
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const g = AXIS_INDEX[grain];
  // невеликий випадковий зсув, щоб сусідні дошки не мали ідентичного малюнка
  const offsetU = Math.random() * 3;
  const offsetV = Math.random() * 3;

  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const n = [
      Math.abs(normal.getX(i)),
      Math.abs(normal.getY(i)),
      Math.abs(normal.getZ(i)),
    ];
    const normalAxis = n.indexOf(Math.max(...n));
    const faceAxes = [0, 1, 2].filter((a) => a !== normalAxis);

    let uAxis: number;
    let vAxis: number;
    let uScale = UV_ALONG_GRAIN;
    if (faceAxes.includes(g)) {
      uAxis = g;
      vAxis = faceAxes.find((a) => a !== g)!;
    } else {
      // торець — волокна дивляться на нас, беремо обидві осі "поперек"
      [uAxis, vAxis] = faceAxes;
      uScale = UV_ACROSS_GRAIN;
    }

    uv.setXY(
      i,
      p[uAxis] * uScale + offsetU,
      p[vAxis] * UV_ACROSS_GRAIN + offsetV,
    );
  }
  uv.needsUpdate = true;
}

/** Звільняє геометрію, створену під конкретні розміри (woodBox / plainBox). */
export function disposeOwnedGeometry(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.ownsGeometry) {
      child.geometry.dispose();
    }
  });
}
