import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();

export function loadModel(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    objLoader.load(
      path,
      (object) => resolve(object),
      undefined,
      (error) => reject(error),
    );
  });
}

export interface CanopyMaterials {
  wood: THREE.Material;
  asphalt: THREE.Material;
  aluminium: THREE.Material;
}

export function loadMaterials(path: string): Promise<CanopyMaterials> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const found: Partial<Record<string, THREE.Material>> = {};

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = Array.isArray(child.material)
              ? child.material[0]
              : child.material;
            if (material?.name) {
              found[material.name] = material;
            }
          }
        });

        const wood = found["wood.001"];
        const asphalt = found["asphalt"];
        const aluminium = found["aluminium"];

        if (!wood || !asphalt || !aluminium) {
          reject(
            new Error(
              `Не знайдено всі 3 матеріали в ${path}. Знайдено: ${Object.keys(found).join(", ")}`,
            ),
          );
          return;
        }

        resolve({ wood, asphalt, aluminium });
      },
      undefined,
      (error) => reject(error),
    );
  });
}

export interface LoadedModels {
  column: THREE.Group;
  cornerBeam: THREE.Group;
  rimBeam: THREE.Group;
  fascia: THREE.Group;
  decking: THREE.Group;
  rafter: THREE.Group;
  insert: THREE.Group;
  roofEdgeStraight: THREE.Group;
  roofEdgeCorner: THREE.Group;
  roofingTile: THREE.Group;
}

export async function loadAllModels(): Promise<{
  models: LoadedModels;
  materials: CanopyMaterials;
}> {
  const [
    column,
    cornerBeam,
    rimBeam,
    fascia,
    decking,
    rafter,
    insert,
    roofEdgeStraight,
    roofEdgeCorner,
    roofingTile,
    materials,
  ] = await Promise.all([
    loadModel("/models/balk_150x150x2200.obj"),
    loadModel("/models/balk_corner.obj"),
    loadModel("/models/balk_150x150x1000.obj"),
    loadModel("/models/Lodge_20x200x1000.obj"),
    loadModel("/models/Lodge_20x190x1000_bevel.obj"),
    loadModel("/models/lodge_150x50x1000.obj"),
    loadModel("/models/lodge_150x50x200.obj"),
    loadModel("/models/roof_edge/roof_edge_1m2.obj"),
    loadModel("/models/roof_edge/roof_edge_corner2.obj"),
    loadModel("/models/ruberoid_1000x1000x2.obj"),
    loadMaterials("/glb/Canopy_Materials.glb"),
  ]);

  const models: LoadedModels = {
    column,
    cornerBeam,
    rimBeam,
    fascia,
    decking,
    rafter,
    insert,
    roofEdgeStraight,
    roofEdgeCorner,
    roofingTile,
  };

  // призначаємо правильний матеріал кожному типу деталі
  applyMaterial(models.column, materials.wood);
  applyMaterial(models.cornerBeam, materials.wood);
  applyMaterial(models.rimBeam, materials.wood);
  applyMaterial(models.fascia, materials.wood);
  applyMaterial(models.decking, materials.wood);
  applyMaterial(models.rafter, materials.wood);
  applyMaterial(models.insert, materials.wood);
  applyMaterial(models.roofEdgeStraight, materials.aluminium);
  applyMaterial(models.roofEdgeCorner, materials.aluminium);
  applyMaterial(models.roofingTile, materials.asphalt);

  return { models, materials };
}

export function applyMaterial(obj: THREE.Object3D, material: THREE.Material) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
    }
  });
}
