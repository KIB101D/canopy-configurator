import type { CanopyConfig, WallType, WallSideId } from "../canopy/config";
import {
  COLUMN_SIZE,
  ROOF_OVERHANG,
  WALL_TYPES,
  getWallSegments,
  resolveWalls,
} from "../canopy/config";

/**
 * 2D-креслення плану (вигляд згори) у міліметрах, як на референсі:
 * контур даху, колони, стіни умовними позначками та розмірні ланцюжки.
 *
 * Орієнтація: глибина (Z) — горизонтально, передній торець праворуч;
 * ширина (X) — вертикально, права сторона зверху. Так план збігається
 * з тим, що видно в 3D з камери за замовчуванням.
 */

const mm = (m: number) => Math.round(m * 1000);
// світ (x, z) → план (u, v)
const toPlan = (x: number, z: number) => ({ u: mm(z), v: -mm(x) });

export interface PlanOptions {
  showDimensions: boolean;
}

export function renderPlan(config: CanopyConfig, opts: PlanOptions): string {
  const { dims } = config;
  const walls = resolveWalls(config);

  const D = mm(dims.depth);
  const W = mm(dims.width);
  const O = mm(ROOF_OVERHANG);
  const C = mm(COLUMN_SIZE);
  const roofU = D / 2 + O;
  const roofV = W / 2 + O;

  const fs = Math.min(Math.max(Math.max(D, W) * 0.03, 110), 210);
  const gap = fs * 2.1; // відстань між рядами розмірних ланцюжків
  const margin = fs * 2 + gap * 3.4;

  const minU = -roofU - margin;
  const minV = -roofV - margin;
  const width = 2 * (roofU + margin);
  const height = 2 * (roofV + margin) + fs * 3;

  const parts: string[] = [];

  // --- дах ---
  parts.push(
    `<rect class="plan-roof" x="${-roofU}" y="${-roofV}" width="${2 * roofU}" height="${2 * roofV}" stroke-width="${fs * 0.28}" />`,
  );
  // контур колон (пунктир по осях)
  parts.push(
    `<rect class="plan-axis" x="${-D / 2}" y="${-W / 2}" width="${D}" height="${W}" stroke-width="${fs * 0.06}" stroke-dasharray="${fs * 0.6} ${fs * 0.3}" />`,
  );

  // --- стіни ---
  for (const seg of getWallSegments(dims)) {
    const type = walls[seg.id];
    if (type === "none") continue;
    parts.push(renderWall(seg.id, type, seg, C, fs));
  }

  // --- колони ---
  const hw = dims.width / 2;
  const hd = dims.depth / 2;
  const columns: [number, number][] = [
    [-hw, -hd], [hw, -hd], [-hw, 0], [hw, 0], [-hw, hd], [hw, hd],
  ];
  for (const [x, z] of columns) {
    const p = toPlan(x, z);
    parts.push(
      `<rect class="plan-column" x="${p.u - C / 2}" y="${p.v - C / 2}" width="${C}" height="${C}" />`,
    );
  }

  // --- розмірні ланцюжки ---
  if (opts.showDimensions) {
    const top = -roofV;
    const bottom = roofV;
    const left = -roofU;
    const right = roofU;
    const clearBay = D / 2 - C;

    // зверху: дах → колони (по осях) → прольоти
    parts.push(hChain([-roofU, roofU], top - gap * 3, top, fs));
    parts.push(hChain([-D / 2, D / 2], top - gap * 2, -W / 2, fs));
    parts.push(hChain([-D / 2, 0, D / 2], top - gap, -W / 2, fs));
    // знизу: чисті прольоти між гранями колон
    parts.push(
      hChain([-D / 2 + C / 2, -C / 2], bottom + gap, W / 2, fs, clearBay),
    );
    parts.push(
      hChain([C / 2, D / 2 - C / 2], bottom + gap, W / 2, fs, clearBay),
    );
    // зліва: дах → колони; справа: чистий проліт
    parts.push(vChain([-roofV, roofV], left - gap * 2, left, fs));
    parts.push(vChain([-W / 2, W / 2], left - gap, -D / 2, fs));
    // праворуч лишаємо місце під дугу відкривання дверей у торці
    parts.push(vChain([-W / 2 + C / 2, W / 2 - C / 2], right + gap * 2.4, D / 2, fs));
  }

  // --- легенда ---
  const used = new Set<WallType>(Object.values(walls).filter((t) => t !== "none"));
  if (used.size) {
    const items = WALL_TYPES.filter((t) => used.has(t.id));
    const y = minV + height - fs * 1.4;
    // ширина пункту залежить від довжини підпису, щоб вони не наїжджали
    const widths = items.map((t) => fs * (3.2 + t.label.length * 0.48));
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    items.forEach((t, i) => {
      if (i > 0) x += widths[i - 1];
      parts.push(
        `<g transform="translate(${x} ${y})">${legendSwatch(t.id, fs)}<text class="plan-legend" x="${fs * 2.2}" y="${fs * 0.35}" font-size="${fs * 0.8}">${t.label}</text></g>`,
      );
    });
  }

  return `<svg class="plan-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${minU} ${minV} ${width} ${height}" role="img" aria-label="Top view plan">
  <defs>
    <pattern id="hatch-wood" patternUnits="userSpaceOnUse" width="${fs * 0.5}" height="${fs * 0.5}" patternTransform="rotate(45)">
      <rect width="${fs * 0.5}" height="${fs * 0.5}" fill="#ecd9bf" />
      <line x1="0" y1="0" x2="0" y2="${fs * 0.5}" stroke="#a6773f" stroke-width="${fs * 0.08}" />
    </pattern>
    <marker id="dim-tick" viewBox="-5 -5 10 10" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
      <line x1="-4" y1="4" x2="4" y2="-4" stroke="currentColor" stroke-width="1.2" />
    </marker>
  </defs>
  ${parts.join("\n  ")}
</svg>`;
}

// ---------- стіни ----------

function renderWall(
  id: WallSideId,
  type: WallType,
  seg: ReturnType<typeof getWallSegments>[number],
  C: number,
  fs: number,
): string {
  const a = toPlan(seg.from.x, seg.from.z);
  const b = toPlan(seg.to.x, seg.to.z);
  const len = Math.hypot(b.u - a.u, b.v - a.v);
  const angle = (Math.atan2(b.v - a.v, b.u - a.u) * 180) / Math.PI;
  const span = len - C;
  const t = Math.max(C * 0.6, 80); // товщина стіни на кресленні (трохи перебільшена)

  // локальна система: x уздовж стіни від грані колони, y = 0 — вісь стіни.
  // Порядок from→to у сегментів такий, що "назовні" — це +y у цій системі.
  const open = `<g class="plan-wall plan-wall--${type}" data-side="${id}" transform="translate(${a.u} ${a.v}) rotate(${angle}) translate(${C / 2} 0)">`;
  let body = "";

  switch (type) {
    case "wood":
      body = `<rect x="0" y="${-t / 2}" width="${span}" height="${t}" fill="url(#hatch-wood)" stroke="#7a5a32" stroke-width="${fs * 0.05}" />`;
      break;
    case "woodDoor": {
      const door = Math.min(900, span - 220);
      const frame = 60;
      const d0 = span / 2 - door / 2 - frame;
      const d1 = span / 2 + door / 2 + frame;
      body =
        `<rect x="0" y="${-t / 2}" width="${d0}" height="${t}" fill="url(#hatch-wood)" stroke="#7a5a32" stroke-width="${fs * 0.05}" />` +
        `<rect x="${d1}" y="${-t / 2}" width="${span - d1}" height="${t}" fill="url(#hatch-wood)" stroke="#7a5a32" stroke-width="${fs * 0.05}" />` +
        // полотно відкрите назовні на 90° + дуга відкривання
        `<line x1="${d0 + frame}" y1="0" x2="${d0 + frame}" y2="${door}" stroke="#7a5a32" stroke-width="${fs * 0.1}" />` +
        `<path d="M ${d0 + frame} ${door} A ${door} ${door} 0 0 0 ${d0 + frame + door} 0" fill="none" stroke="#7a5a32" stroke-width="${fs * 0.04}" stroke-dasharray="${fs * 0.25} ${fs * 0.18}" />`;
      break;
    }
    case "glass": {
      const g = t * 0.35;
      body =
        `<rect x="0" y="${-t / 2}" width="${span}" height="${t}" fill="#dcecf1" stroke="#5f7e8a" stroke-width="${fs * 0.05}" />` +
        `<line x1="0" y1="${-g}" x2="${span * 0.55}" y2="${-g}" stroke="#2f7896" stroke-width="${fs * 0.12}" />` +
        `<line x1="${span * 0.45}" y1="${g}" x2="${span}" y2="${g}" stroke="#2f7896" stroke-width="${fs * 0.12}" />`;
      break;
    }
    case "slats": {
      const step = 70;
      const count = Math.floor(span / step);
      let slats = "";
      for (let i = 0; i < count; i++) {
        slats += `<rect x="${(span - count * step) / 2 + i * step + 12}" y="${-22}" width="45" height="45" fill="#c99a62" />`;
      }
      body = `<line x1="0" y1="${-45}" x2="${span}" y2="${-45}" stroke="#a6773f" stroke-width="${fs * 0.05}" />${slats}`;
      break;
    }
    case "none":
      return "";
  }
  return `${open}${body}</g>`;
}

function legendSwatch(type: WallType, fs: number) {
  const w = fs * 1.7;
  const h = fs * 0.55;
  switch (type) {
    case "wood":
    case "woodDoor":
      return `<rect x="0" y="${-h / 2}" width="${w}" height="${h}" fill="url(#hatch-wood)" stroke="#7a5a32" stroke-width="${fs * 0.05}" />`;
    case "glass":
      return `<rect x="0" y="${-h / 2}" width="${w}" height="${h}" fill="#e7f1f4" stroke="#4a8fa8" stroke-width="${fs * 0.07}" />`;
    case "slats":
      return `<rect x="0" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="#c99a62" stroke-width="${fs * 0.25}" stroke-dasharray="${fs * 0.2} ${fs * 0.15}" />`;
    default:
      return "";
  }
}

// ---------- розмірні ланцюжки ----------

function hChain(stops: number[], y: number, fromY: number, fs: number, label?: number) {
  let out = `<g class="plan-dim" font-size="${fs}">`;
  for (const u of stops) {
    out += `<line class="plan-dim-ext" x1="${u}" y1="${fromY}" x2="${u}" y2="${y + Math.sign(y - fromY) * fs * 0.35}" stroke-width="${fs * 0.03}" />`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    out += `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke-width="${fs * 0.045}" marker-start="url(#dim-tick)" marker-end="url(#dim-tick)" />`;
    out += `<text x="${(a + b) / 2}" y="${y - fs * 0.35}" text-anchor="middle">${label ?? Math.round(b - a)}</text>`;
  }
  return out + "</g>";
}

function vChain(stops: number[], x: number, fromX: number, fs: number) {
  let out = `<g class="plan-dim" font-size="${fs}">`;
  for (const v of stops) {
    out += `<line class="plan-dim-ext" x1="${fromX}" y1="${v}" x2="${x + Math.sign(x - fromX) * fs * 0.35}" y2="${v}" stroke-width="${fs * 0.03}" />`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    const cy = (a + b) / 2;
    const tx = x + (x < 0 ? -fs * 0.35 : fs * 0.35);
    const rot = x < 0 ? -90 : 90;
    out += `<line x1="${x}" y1="${a}" x2="${x}" y2="${b}" stroke-width="${fs * 0.045}" marker-start="url(#dim-tick)" marker-end="url(#dim-tick)" />`;
    out += `<text x="${tx}" y="${cy}" text-anchor="middle" transform="rotate(${rot} ${tx} ${cy})">${Math.round(b - a)}</text>`;
  }
  return out + "</g>";
}
