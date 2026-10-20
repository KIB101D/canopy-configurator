import * as THREE from "three";
import type { PartMaterials } from "./partMaterials";
import { plainBox, woodBox } from "./primitives";

export const DOOR_FRAME_WIDTH = 0.06;
const FRAME_DEPTH = 0.09;
const LEAF_THICKNESS = 0.04;
const STILE = 0.11;
const BOTTOM_RAIL = 0.2;
const RAIL = 0.1;
const MUNTIN = 0.025;

/**
 * Двері з коробкою: нижня філенка з вертикальної вагонки,
 * верхня частина засклена з розкладкою (як на референсі), ручка з обох боків.
 *
 * Локальні координати: x від 0 до leafWidth + 2 * DOOR_FRAME_WIDTH,
 * y від 0 до frameTop, товщина центрована по z.
 */
export function createDoor(
  leafWidth: number,
  leafHeight: number,
  frameTop: number,
  m: PartMaterials,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "door";
  const fw = DOOR_FRAME_WIDTH;
  const totalWidth = leafWidth + 2 * fw;

  // --- коробка ---
  group.add(woodBox(m.wood, [fw, frameTop, FRAME_DEPTH], [fw / 2, frameTop / 2, 0], "y"));
  group.add(
    woodBox(m.wood, [fw, frameTop, FRAME_DEPTH], [totalWidth - fw / 2, frameTop / 2, 0], "y"),
  );
  const headHeight = frameTop - leafHeight;
  group.add(
    woodBox(
      m.wood,
      [leafWidth, headHeight, FRAME_DEPTH],
      [totalWidth / 2, leafHeight + headHeight / 2, 0],
      "x",
    ),
  );

  // --- полотно ---
  const leaf = new THREE.Group();
  leaf.position.set(fw, 0.01, 0);
  const lh = leafHeight - 0.015;
  const lw = leafWidth;
  const t = LEAF_THICKNESS;

  // стійки та поперечки
  leaf.add(woodBox(m.wood, [STILE, lh, t], [STILE / 2, lh / 2, 0], "y"));
  leaf.add(woodBox(m.wood, [STILE, lh, t], [lw - STILE / 2, lh / 2, 0], "y"));
  const innerWidth = lw - 2 * STILE;
  const midRailY = lh * 0.42;
  leaf.add(woodBox(m.wood, [innerWidth, BOTTOM_RAIL, t], [lw / 2, BOTTOM_RAIL / 2, 0], "x"));
  leaf.add(woodBox(m.wood, [innerWidth, RAIL, t], [lw / 2, midRailY, 0], "x"));
  leaf.add(woodBox(m.wood, [innerWidth, RAIL, t], [lw / 2, lh - RAIL / 2, 0], "x"));

  // нижня філенка: вертикальна вагонка з тонкими шпаринами
  const panelBottom = BOTTOM_RAIL;
  const panelTop = midRailY - RAIL / 2;
  const panelHeight = panelTop - panelBottom;
  const boardCount = Math.max(2, Math.round(innerWidth / 0.09));
  const boardWidth = innerWidth / boardCount;
  for (let i = 0; i < boardCount; i++) {
    leaf.add(
      woodBox(
        m.wood,
        [boardWidth - 0.005, panelHeight, 0.022],
        [STILE + boardWidth * (i + 0.5), panelBottom + panelHeight / 2, 0],
        "y",
      ),
    );
  }
  leaf.add(
    woodBox(
      m.wood,
      [innerWidth, panelHeight, 0.008],
      [lw / 2, panelBottom + panelHeight / 2, -0.012],
      "y",
    ),
  );

  // верхня частина: скло + розкладка 3 × 4
  const glassBottom = midRailY + RAIL / 2;
  const glassTop = lh - RAIL;
  const glassHeight = glassTop - glassBottom;
  const glassMesh = plainBox(
    m.glass,
    [innerWidth, glassHeight, 0.006],
    [lw / 2, glassBottom + glassHeight / 2, 0],
  );
  glassMesh.renderOrder = 2;
  glassMesh.userData.noShadow = true;
  glassMesh.userData.seeThrough = true;
  leaf.add(glassMesh);

  const cols = 3;
  const rows = 4;
  for (let c = 1; c < cols; c++) {
    leaf.add(
      woodBox(
        m.wood,
        [MUNTIN, glassHeight, 0.03],
        [STILE + (innerWidth / cols) * c, glassBottom + glassHeight / 2, 0],
        "y",
      ),
    );
  }
  for (let r = 1; r < rows; r++) {
    leaf.add(
      woodBox(
        m.wood,
        [innerWidth, MUNTIN, 0.03],
        [lw / 2, glassBottom + (glassHeight / rows) * r, 0],
        "x",
      ),
    );
  }

  // ручка з обох боків полотна
  const handleX = lw - STILE / 2;
  const handleY = Math.min(1.05, lh * 0.5);
  for (const side of [1, -1]) {
    const z = side * (t / 2);
    leaf.add(plainBox(m.hardware, [0.035, 0.2, 0.01], [handleX, handleY - 0.05, z + side * 0.005]));
    leaf.add(plainBox(m.hardware, [0.018, 0.018, 0.04], [handleX, handleY, z + side * 0.02]));
    leaf.add(
      plainBox(m.hardware, [0.13, 0.02, 0.02], [handleX - 0.055, handleY, z + side * 0.045]),
    );
  }

  // петлі
  for (const y of [0.25, lh - 0.25]) {
    leaf.add(plainBox(m.hardware, [0.02, 0.1, t + 0.01], [0.004, y, 0]));
  }

  group.add(leaf);
  return group;
}
