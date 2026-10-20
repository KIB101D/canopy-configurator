import type {
  CanopyConfig,
  StorageBay,
  StorageDoor,
  WallSideId,
  WallType,
} from "../canopy/config";
import { WALL_SIDE_IDS, WALL_TYPES, emptyWalls } from "../canopy/config";

// Конфігурація живе в URL-хеші: її можна зберегти в закладки або надіслати.
// Формат: #w=3&h=2.2&d=5&walls=front:wood,leftFront:glass&storage=back:side

const WALL_IDS = new Set<string>(WALL_SIDE_IDS);
const TYPE_IDS = new Set<string>(WALL_TYPES.map((t) => t.id));

export function encodeConfig(config: CanopyConfig): string {
  const params = new URLSearchParams();
  params.set("w", String(config.dims.width));
  params.set("h", String(config.dims.height));
  params.set("d", String(config.dims.depth));

  const walls = Object.entries(config.walls)
    .filter(([, type]) => type !== "none")
    .map(([side, type]) => `${side}:${type}`)
    .join(",");
  if (walls) params.set("walls", walls);

  if (config.storage.bay !== "none") {
    params.set("storage", `${config.storage.bay}:${config.storage.door}`);
  }
  return params.toString().replace(/%3A/g, ":").replace(/%2C/g, ",");
}

export function decodeConfig(
  hash: string,
  fallback: CanopyConfig,
  clamp: (v: number) => number,
): CanopyConfig {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const num = (key: string, def: number) => {
    const v = parseFloat(params.get(key) ?? "");
    return Number.isFinite(v) ? clamp(v) : def;
  };

  const walls = emptyWalls();
  for (const pair of (params.get("walls") ?? "").split(",")) {
    const [side, type] = pair.split(":");
    if (WALL_IDS.has(side) && TYPE_IDS.has(type)) {
      walls[side as WallSideId] = type as WallType;
    }
  }

  const [bay, door] = (params.get("storage") ?? "").split(":");
  const storage = {
    bay: (["front", "back"].includes(bay) ? bay : "none") as StorageBay,
    door: (["side", "end", "partition"].includes(door)
      ? door
      : fallback.storage.door) as StorageDoor,
  };

  return {
    dims: {
      width: num("w", fallback.dims.width),
      height: num("h", fallback.dims.height),
      depth: num("d", fallback.dims.depth),
    },
    walls: params.has("walls") ? walls : fallback.walls,
    storage: params.has("storage") ? storage : fallback.storage,
  };
}
