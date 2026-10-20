import * as THREE from "three";
import type { PartMaterials } from "./partMaterials";
import { woodBox } from "./primitives";
import { createDoor, DOOR_FRAME_WIDTH } from "./createDoor";

const BOARD_HEIGHT = 0.19; // ~ Lodge_20x190 з комплекту
const BOARD_THICKNESS = 0.02;
const BOARD_OVERLAP = 0.012; // дошки трохи заходять одна на одну, як вагонка
const BOARD_TILT = THREE.MathUtils.degToRad(-2.5); // нахил, щоб було видно шви

const DOOR_LEAF_WIDTH = 0.9;
const DOOR_LEAF_HEIGHT = 2.0;
const MIN_DOOR_SPAN = 0.8; // найкоротший проліт (2 м / 2 − колона) теж отримує двері

/**
 * Дерев'яна стіна з горизонтальних дошок (опційно — з дверима по центру).
 *
 * Локальні координати: x від 0 до `span` (між гранями колон),
 * y від 0 до `height`, товщина центрована по z = 0, +Z — назовні.
 */
export function createTimberWall(
  span: number,
  height: number,
  materials: PartMaterials,
  withDoor = false,
): THREE.Group {
  const group = new THREE.Group();
  group.name = withDoor ? "timber-wall-door" : "timber-wall";

  const boardCount = Math.max(1, Math.round(height / BOARD_HEIGHT));
  const pitch = height / boardCount;

  // проріз під двері: вирівнюємо верх коробки по шву дошок,
  // щоб над дверима лягали цілі дошки без щілин
  const door = withDoor && span >= MIN_DOOR_SPAN ? planDoor(span, height, pitch) : null;

  for (let i = 0; i < boardCount; i++) {
    const yBottom = i * pitch;
    const pieces: [number, number][] =
      door && yBottom < door.frameTop - 1e-6
        ? [
            [0, door.x0],
            [door.x1, span],
          ]
        : [[0, span]];

    for (const [a, b] of pieces) {
      const length = b - a;
      if (length < 0.01) continue;
      const board = woodBox(
        materials.wood,
        [length, pitch + BOARD_OVERLAP, BOARD_THICKNESS],
        [a + length / 2, yBottom + pitch / 2 + BOARD_OVERLAP / 2, 0],
        "x",
      );
      board.rotation.x = BOARD_TILT;
      group.add(board);
    }
  }

  // вертикальні стійки з внутрішнього боку — щоб стіна мала "каркас" зсередини
  const studCount = Math.max(0, Math.floor(span / 1.2));
  for (let i = 1; i <= studCount; i++) {
    const x = (span / (studCount + 1)) * i;
    if (door && x > door.x0 - 0.05 && x < door.x1 + 0.05) continue;
    group.add(
      woodBox(materials.wood, [0.045, height, 0.07], [x, height / 2, -0.045], "y"),
    );
  }

  if (door) {
    const doorGroup = createDoor(door.leafWidth, door.leafHeight, door.frameTop, materials);
    doorGroup.position.x = door.x0;
    group.add(doorGroup);
  }

  return group;
}

function planDoor(span: number, height: number, pitch: number) {
  const leafWidth = Math.min(DOOR_LEAF_WIDTH, span - 2 * DOOR_FRAME_WIDTH - 0.1);
  const leafHeight = Math.min(DOOR_LEAF_HEIGHT, height - 0.25);
  const minFrameTop = leafHeight + 0.06;
  const frameTop = Math.min(Math.ceil(minFrameTop / pitch - 1e-6) * pitch, height);

  const totalWidth = leafWidth + 2 * DOOR_FRAME_WIDTH;
  const x0 = span / 2 - totalWidth / 2;
  return { leafWidth, leafHeight, frameTop, x0, x1: x0 + totalWidth };
}
