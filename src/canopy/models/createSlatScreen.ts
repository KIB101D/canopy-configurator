import * as THREE from "three";
import type { PartMaterials } from "./partMaterials";
import { woodBox } from "./primitives";

const SLAT_WIDTH = 0.045;
const SLAT_DEPTH = 0.045;
const TARGET_GAP = 0.025;
const RAIL_HEIGHT = 0.07;
const RAIL_DEPTH = 0.045;

/**
 * Ламельна перегородка: вертикальні рейки 45×45 з просвітом,
 * закріплені на двох горизонтальних ригелях з внутрішнього боку.
 */
export function createSlatScreen(
  span: number,
  height: number,
  m: PartMaterials,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "slat-screen";

  const railZ = -(SLAT_DEPTH / 2 + RAIL_DEPTH / 2);
  for (const y of [0.18, height - 0.22]) {
    group.add(woodBox(m.wood, [span, RAIL_HEIGHT, RAIL_DEPTH], [span / 2, y, railZ], "x"));
  }

  // рівномірно розподіляємо рейки так, щоб крайні просвіти = внутрішнім
  const count = Math.max(1, Math.floor((span - TARGET_GAP) / (SLAT_WIDTH + TARGET_GAP)));
  const gap = (span - count * SLAT_WIDTH) / (count + 1);
  const slatHeight = height - 0.06;

  for (let i = 0; i < count; i++) {
    const x = gap + SLAT_WIDTH / 2 + i * (SLAT_WIDTH + gap);
    group.add(
      woodBox(m.wood, [SLAT_WIDTH, slatHeight, SLAT_DEPTH], [x, 0.03 + slatHeight / 2, 0], "y"),
    );
  }

  return group;
}
