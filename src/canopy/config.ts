import type { Dimensions } from "./dims";

// ---------- типи стін ----------

export type WallType = "none" | "wood" | "woodDoor" | "glass" | "slats";

export const WALL_TYPES: { id: WallType; label: string; hint: string }[] = [
  { id: "none", label: "Open", hint: "No wall, braces stay" },
  { id: "wood", label: "Timber wall", hint: "Horizontal cladding boards" },
  { id: "woodDoor", label: "Timber wall + door", hint: "Glazed door in the centre" },
  { id: "glass", label: "Glass sliding wall", hint: "Aluminium frame, sliding panels" },
  { id: "slats", label: "Slatted screen", hint: "Vertical slats with gaps" },
];

// ---------- сторони (сегменти) ----------
//
// Каркас має 6 колон: 4 кутові + 2 посередині довгих сторін (z = 0).
// Отже стін може бути 7: 2 торці, 4 прольоти по боках і внутрішня перегородка.
//
//          back (z = -d/2)
//     ┌───────────────────────┐
//  L  │ left-back  │ right-back │  R
//     ├─────── middle ────────┤
//     │ left-front │ right-front│
//     └───────────────────────┘
//          front (z = +d/2)

export type WallSideId =
  | "front"
  | "back"
  | "leftFront"
  | "leftBack"
  | "rightFront"
  | "rightBack"
  | "middle";

export const WALL_SIDE_IDS: WallSideId[] = [
  "back",
  "leftBack",
  "rightBack",
  "middle",
  "leftFront",
  "rightFront",
  "front",
];

export const WALL_SIDE_LABELS: Record<WallSideId, string> = {
  front: "Front end",
  back: "Back end",
  leftFront: "Left side, front bay",
  leftBack: "Left side, back bay",
  rightFront: "Right side, front bay",
  rightBack: "Right side, back bay",
  middle: "Middle partition",
};

export type WallsConfig = Record<WallSideId, WallType>;

export type StorageBay = "none" | "front" | "back";
export type StorageDoor = "side" | "end" | "partition";

export interface CanopyConfig {
  dims: Dimensions;
  walls: WallsConfig;
  storage: { bay: StorageBay; door: StorageDoor };
}

export function emptyWalls(): WallsConfig {
  return {
    front: "none",
    back: "none",
    leftFront: "none",
    leftBack: "none",
    rightFront: "none",
    rightBack: "none",
    middle: "none",
  };
}

/** Сегменти, які займає комора (замкнений проліт + двері). */
export function getStorageWalls(
  storage: CanopyConfig["storage"],
): Partial<WallsConfig> {
  if (storage.bay === "none") return {};

  const isFront = storage.bay === "front";
  const end: WallSideId = isFront ? "front" : "back";
  const right: WallSideId = isFront ? "rightFront" : "rightBack";
  const left: WallSideId = isFront ? "leftFront" : "leftBack";

  const doorSide: WallSideId =
    storage.door === "side" ? right : storage.door === "end" ? end : "middle";

  const walls: Partial<WallsConfig> = {
    [end]: "wood",
    [right]: "wood",
    [left]: "wood",
    middle: "wood",
  };
  walls[doorSide] = "woodDoor";
  return walls;
}

/** Підсумкові стіни: ручний вибір + комора поверх нього. */
export function resolveWalls(config: CanopyConfig): WallsConfig {
  return { ...config.walls, ...getStorageWalls(config.storage) };
}

// ---------- геометрія сегментів ----------

export interface WallSegment {
  id: WallSideId;
  /** точки на осях колон, y = 0 */
  from: { x: number; z: number };
  to: { x: number; z: number };
  length: number;
  /** чи лежить сегмент по периметру (там стоять кутові розкоси) */
  perimeter: boolean;
}

/**
 * Порядок from → to підібраний так, щоб локальна вісь +Z стіни
 * (після rotation.y = atan2(-dz, dx)) дивилась назовні.
 * Тоді ручки дверей, напрямок відкривання тощо однакові для всіх сторін.
 */
export function getWallSegments(dims: Dimensions): WallSegment[] {
  const hw = dims.width / 2;
  const hd = dims.depth / 2;

  const raw: Omit<WallSegment, "length">[] = [
    { id: "front", from: { x: -hw, z: hd }, to: { x: hw, z: hd }, perimeter: true },
    { id: "back", from: { x: hw, z: -hd }, to: { x: -hw, z: -hd }, perimeter: true },
    { id: "leftFront", from: { x: -hw, z: 0 }, to: { x: -hw, z: hd }, perimeter: true },
    { id: "leftBack", from: { x: -hw, z: -hd }, to: { x: -hw, z: 0 }, perimeter: true },
    { id: "rightFront", from: { x: hw, z: hd }, to: { x: hw, z: 0 }, perimeter: true },
    { id: "rightBack", from: { x: hw, z: 0 }, to: { x: hw, z: -hd }, perimeter: true },
    { id: "middle", from: { x: -hw, z: 0 }, to: { x: hw, z: 0 }, perimeter: false },
  ];

  return raw.map((s) => ({
    ...s,
    length: Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z),
  }));
}

// ---------- спільні розміри конструкції (м) ----------

export const COLUMN_SIZE = 0.15;
export const ROOF_OVERHANG = 0.2; // OUTER_FASCIA_OVERHANG
export const ROOF_STACK = 0.4; // від верху колони до площини покрівлі
export const ROOF_EDGE_HEIGHT = 0.05;

export function totalHeight(dims: Dimensions) {
  return dims.height + ROOF_STACK + ROOF_EDGE_HEIGHT;
}
