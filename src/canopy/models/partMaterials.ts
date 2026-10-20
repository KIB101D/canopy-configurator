import * as THREE from "three";
import type { CanopyMaterials } from "../loadModel";

/** Матеріали для параметричних моделей (стіни, двері, скло). */
export interface PartMaterials {
  wood: THREE.Material;
  aluminium: THREE.Material;
  asphalt: THREE.Material;
  glass: THREE.Material;
  hardware: THREE.Material;
}

export function createPartMaterials(
  base: CanopyMaterials,
  grayMaterial: THREE.Material,
) {
  // скло: прозоре, з відбиттями від scene.environment
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd6e6ea,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.28,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // фурнітура: темніший анодований алюміній, щоб ручки читались на фоні дерева
  const hardware = new THREE.MeshStandardMaterial({
    color: 0x3a3b3d,
    metalness: 0.8,
    roughness: 0.35,
  });

  const textured: PartMaterials = {
    wood: base.wood,
    aluminium: base.aluminium,
    asphalt: base.asphalt,
    glass,
    hardware,
  };

  // режим без текстур: усе сіре, але скло лишаємо склом, інакше стіна "суцільна"
  const plain: PartMaterials = {
    wood: grayMaterial,
    aluminium: grayMaterial,
    asphalt: grayMaterial,
    glass,
    hardware: grayMaterial,
  };

  return { textured, plain };
}
