import type { CanopyConfig, WallSideId, WallType } from "../canopy/config";
import {
  COLUMN_SIZE,
  WALL_SIDE_LABELS,
  WALL_TYPES,
  getStorageWalls,
  getWallSegments,
} from "../canopy/config";

/**
 * Міні-план у панелі "Walls": клік по стороні ставить на неї вибраний тип стіни.
 * Сторони, зайняті коморою, заштриховані (як на референсі) і не клікаються.
 */
export function renderWallPicker(
  config: CanopyConfig,
  brush: WallType,
): string {
  const { dims } = config;
  const locked = getStorageWalls(config.storage);

  // фіксований масштаб по більшій стороні, щоб план не "стрибав" у панелі
  const scale = 240 / Math.max(dims.depth, dims.width * 1.25);
  const D = dims.depth * scale;
  const W = dims.width * scale;
  const pad = 26;
  const C = Math.max(COLUMN_SIZE * scale, 9);
  const vbW = D + pad * 2 + 8;
  const vbH = W + pad * 2;

  // та сама орієнтація, що й на великому плані: Z — вправо, X — вгору
  const P = (x: number, z: number) => ({
    u: pad + D / 2 + z * scale,
    v: pad + W / 2 - x * scale,
  });

  const parts: string[] = [];
  parts.push(
    `<rect x="${pad}" y="${pad}" width="${D}" height="${W}" class="wp-floor" />`,
  );

  for (const seg of getWallSegments(dims)) {
    const a = P(seg.from.x, seg.from.z);
    const b = P(seg.to.x, seg.to.z);
    const type = locked[seg.id] ?? config.walls[seg.id];
    const isLocked = seg.id in locked;
    const label = `${WALL_SIDE_LABELS[seg.id]}: ${WALL_TYPES.find((t) => t.id === type)!.label}${isLocked ? " (storage room)" : ""}`;

    parts.push(
      `<g class="wp-side ${isLocked ? "is-locked" : ""}" data-side="${seg.id}" data-type="${type}" ${isLocked ? "" : `tabindex="0" role="button"`} aria-label="${label}">
        <title>${label}</title>
        <line class="wp-hit" x1="${a.u}" y1="${a.v}" x2="${b.u}" y2="${b.v}" />
        <line class="wp-wall" x1="${a.u}" y1="${a.v}" x2="${b.u}" y2="${b.v}" />
      </g>`,
    );
  }

  const hw = dims.width / 2;
  const hd = dims.depth / 2;
  for (const [x, z] of [
    [-hw, -hd], [hw, -hd], [-hw, 0], [hw, 0], [-hw, hd], [hw, hd],
  ]) {
    const p = P(x, z);
    parts.push(
      `<rect class="wp-column" x="${p.u - C / 2}" y="${p.v - C / 2}" width="${C}" height="${C}" />`,
    );
  }

  // розміри прольотів під планом і ширина зліва (в см, як на референсі)
  const bay = (dims.depth / 2) * 100;
  parts.push(
    `<text class="wp-dim" x="${pad + D / 4}" y="${vbH - 6}" text-anchor="middle">${+bay.toFixed(1)} cm</text>`,
    `<text class="wp-dim" x="${pad + (3 * D) / 4}" y="${vbH - 6}" text-anchor="middle">${+bay.toFixed(1)} cm</text>`,
    `<text class="wp-dim" x="12" y="${pad + W / 2}" text-anchor="middle" transform="rotate(-90 12 ${pad + W / 2})">${+(dims.width * 100).toFixed(1)} cm</text>`,
    `<text class="wp-front" x="${vbW - 6}" y="${pad + W / 2}" text-anchor="middle" transform="rotate(90 ${vbW - 6} ${pad + W / 2})">FRONT</text>`,
  );

  return `<svg class="wall-picker-svg" data-brush="${brush}" viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wp-hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <rect width="10" height="10" fill="#ffffff" />
        <rect width="5" height="10" fill="var(--accent)" />
      </pattern>
    </defs>
    ${parts.join("")}
  </svg>`;
}

export function sideFromEvent(event: Event): WallSideId | null {
  const target = event.target as Element | null;
  const side = target?.closest<SVGGElement>(".wp-side:not(.is-locked)");
  return (side?.dataset.side as WallSideId | undefined) ?? null;
}
