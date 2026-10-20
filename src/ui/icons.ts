import type { WallType } from "../canopy/config";

const svg = (body: string, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const toolbarIcons = {
  fullscreen: svg(
    '<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />',
  ),
  exitFullscreen: svg(
    '<path d="M20 10h-6V4M14 10l7-7M4 14h6v6M10 14l-7 7" />',
  ),
  zoomIn: svg(
    '<circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8M10.5 7.5v6M7.5 10.5h6" />',
  ),
  zoomOut: svg(
    '<circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8M7.5 10.5h6" />',
  ),
  ruler: svg(
    '<path d="M4 20V4h4v12h12v4z" /><path d="M8 8H6M8 12H6M12 16v2M16 16v2" />',
  ),
  reset: svg(
    '<path d="M4 11.5L12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" />',
  ),
  view2d: `<span class="tool-text">2D</span>`,
  view3d: `<span class="tool-text">3D</span>`,
};

/** Піктограми типів стін для карток вибору (48 × 36). */
export const wallIcons: Record<WallType, string> = {
  none: svg(
    '<path d="M6 32V8M42 32V8M4 8h40" stroke-width="2.4" /><path d="M6 14l6-6M42 14l-6-6" /><path d="M6 32h36" stroke-dasharray="2 3" />',
    "0 0 48 36",
  ),
  wood: svg(
    '<path d="M6 32V8M42 32V8M4 8h40" stroke-width="2.4" /><rect x="8" y="10" width="32" height="22" fill="var(--wood-soft)" stroke="none" /><path d="M8 14h32M8 18h32M8 22h32M8 26h32M8 30h32" stroke-width="1" />',
    "0 0 48 36",
  ),
  woodDoor: svg(
    '<path d="M6 32V8M42 32V8M4 8h40" stroke-width="2.4" /><rect x="8" y="10" width="32" height="22" fill="var(--wood-soft)" stroke="none" /><path d="M8 14h32M8 18h32M8 22h32M8 26h32M8 30h32" stroke-width="1" /><rect x="19" y="13" width="10" height="19" fill="var(--surface)" stroke-width="1.4" /><path d="M20.5 15h7v6h-7z" stroke-width="1" /><circle cx="27" cy="24" r=".8" fill="currentColor" />',
    "0 0 48 36",
  ),
  glass: svg(
    '<path d="M6 32V8M42 32V8M4 8h40" stroke-width="2.4" /><rect x="8" y="10" width="17" height="22" fill="var(--glass-soft)" stroke-width="1.2" /><rect x="23" y="10" width="17" height="22" fill="var(--glass-soft)" stroke-width="1.2" /><path d="M12 16l4-4M28 18l6-6" stroke-width="1" />',
    "0 0 48 36",
  ),
  slats: svg(
    '<path d="M6 32V8M42 32V8M4 8h40" stroke-width="2.4" /><path d="M10 10v22M14 10v22M18 10v22M22 10v22M26 10v22M30 10v22M34 10v22M38 10v22" stroke-width="2" stroke="var(--wood)" />',
    "0 0 48 36",
  ),
};
