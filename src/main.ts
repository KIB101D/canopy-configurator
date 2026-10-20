import "./style.css";
import { createCanopyEngine } from "./canopy/createCanopyEngine";
import type { Dimensions } from "./canopy/dims";
import type {
  CanopyConfig,
  StorageBay,
  StorageDoor,
  WallType,
} from "./canopy/config";
import {
  ROOF_OVERHANG,
  WALL_SIDE_IDS,
  WALL_TYPES,
  emptyWalls,
  getStorageWalls,
  getWallSegments,
  resolveWalls,
} from "./canopy/config";
import { renderPlan } from "./plan/renderPlan";
import { renderWallPicker, sideFromEvent } from "./ui/wallPicker";
import { toolbarIcons, wallIcons } from "./ui/icons";
import { decodeConfig, encodeConfig } from "./ui/shareLink";

const MIN_DIM = 2;
const MAX_DIM = 8;
const clampDim = (v: number) => Math.min(Math.max(v, MIN_DIM), MAX_DIM);
const round1 = (v: number) => Math.round(v * 10) / 10;

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;

// ---------- стан ----------

const DEFAULT_CONFIG: CanopyConfig = {
  dims: { width: 3, height: 2.2, depth: 5 },
  walls: emptyWalls(),
  storage: { bay: "none", door: "side" },
};

let config: CanopyConfig = decodeConfig(location.hash, DEFAULT_CONFIG, clampDim);
let brush: WallType = "wood";
let viewMode: "3d" | "2d" = "3d";
let planZoom = 1;
let showDimensions = true;
let ready = false;

const host = $<HTMLDivElement>("#canvas-host");
const planView = $<HTMLDivElement>("#plan-view");
const engine = createCanopyEngine(host);

function setConfig(next: CanopyConfig) {
  config = next;
  scheduleRender();
}

// перебудова 3D дорога, тож збираємо всі зміни за кадр в одну
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  if (ready) engine.update(config);
  if (viewMode === "2d") renderPlanView();
  syncDimensionInputs();
  renderWallsSection();
  renderStorageSection();
  renderSummary();
  history.replaceState(null, "", `#${encodeConfig(config)}`);
}

// ---------- 1. розміри ----------

const dimRows = document.querySelectorAll<HTMLDivElement>(".dim-row");

function syncDimensionInputs() {
  dimRows.forEach((row) => {
    const key = row.dataset.key as keyof Dimensions;
    const input = row.querySelector<HTMLInputElement>(".dim-input")!;
    const range = row.querySelector<HTMLInputElement>(".dim-range")!;
    const value = config.dims[key];
    // не перезаписуємо поле, поки користувач у ньому друкує
    if (document.activeElement !== input) input.value = value.toFixed(1);
    range.value = String(value);
  });
}

function setDimension(key: keyof Dimensions, raw: number, row: HTMLDivElement) {
  const warning = row.querySelector<HTMLSpanElement>(".dim-warning")!;
  warning.textContent =
    raw < MIN_DIM
      ? `Minimum ${MIN_DIM} m — will be applied`
      : raw > MAX_DIM
        ? `Maximum ${MAX_DIM} m — will be applied`
        : "";
  setConfig({ ...config, dims: { ...config.dims, [key]: round1(clampDim(raw)) } });
}

dimRows.forEach((row) => {
  const key = row.dataset.key as keyof Dimensions;
  const input = row.querySelector<HTMLInputElement>(".dim-input")!;
  const range = row.querySelector<HTMLInputElement>(".dim-range")!;

  input.addEventListener("input", () => {
    const parsed = parseFloat(input.value);
    if (!Number.isNaN(parsed)) setDimension(key, parsed, row);
  });
  input.addEventListener("change", () => {
    row.querySelector(".dim-warning")!.textContent = "";
    input.value = config.dims[key].toFixed(1);
  });
  range.addEventListener("input", () => setDimension(key, parseFloat(range.value), row));

  row.querySelectorAll<HTMLButtonElement>(".step-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.step) * 0.1;
      setDimension(key, round1(config.dims[key] + delta), row);
      input.value = clampDim(round1(config.dims[key])).toFixed(1);
    });
  });
});

// ---------- 2. стіни ----------

const wallTypesEl = $<HTMLDivElement>("#wall-types");
const wallPickerEl = $<HTMLDivElement>("#wall-picker");
const pickerHint = $<HTMLParagraphElement>("#picker-hint");

wallTypesEl.innerHTML = WALL_TYPES.map(
  (t) => `
  <button type="button" class="wall-type" role="radio" data-type="${t.id}">
    <span class="wall-type-icon">${wallIcons[t.id]}</span>
    <span>
      <span class="wall-type-name">${t.label}</span>
      <span class="wall-type-hint">${t.hint}</span>
    </span>
  </button>`,
).join("");

wallTypesEl.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>(".wall-type");
  if (!button) return;
  brush = button.dataset.type as WallType;
  renderWallsSection();
});

function applyBrush(side: (typeof WALL_SIDE_IDS)[number]) {
  const current = config.walls[side];
  // повторний клік тим самим типом знімає стіну — так зручніше "стирати"
  const next: WallType = current === brush ? "none" : brush;
  setConfig({ ...config, walls: { ...config.walls, [side]: next } });
}

wallPickerEl.addEventListener("click", (event) => {
  const side = sideFromEvent(event);
  if (side) applyBrush(side);
});
wallPickerEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const side = sideFromEvent(event);
  if (side) {
    event.preventDefault();
    applyBrush(side);
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-walls]").forEach((button) => {
  button.addEventListener("click", () => {
    const walls = emptyWalls();
    if (button.dataset.walls === "perimeter") {
      for (const seg of getWallSegments(config.dims)) {
        walls[seg.id] = seg.perimeter ? brush : config.walls[seg.id];
      }
    }
    setConfig({ ...config, walls });
  });
});

function renderWallsSection() {
  // план перемальовується цілком — повертаємо фокус на ту ж сторону (клавіатура)
  const focusedSide = (document.activeElement as HTMLElement | null)?.closest?.<SVGGElement>(
    ".wp-side",
  )?.dataset.side;
  wallPickerEl.innerHTML = renderWallPicker(config, brush);
  if (focusedSide) {
    wallPickerEl.querySelector<SVGGElement>(`[data-side="${focusedSide}"]`)?.focus();
  }
  wallTypesEl.querySelectorAll<HTMLButtonElement>(".wall-type").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.type === brush));
  });
  const label = WALL_TYPES.find((t) => t.id === brush)!.label;
  pickerHint.textContent =
    brush === "none"
      ? "Click a side to remove its wall."
      : `Click a side to apply “${label}”. Click again to remove it.`;
}

// ---------- 3. комора ----------

const bayControl = $<HTMLDivElement>('.segmented[data-field="bay"]');
const doorControl = $<HTMLDivElement>('.segmented[data-field="door"]');

bayControl.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!button) return;
  const bay = button.dataset.value as StorageBay;
  // стіни, які тепер займе комора, з ручного вибору прибираємо
  const walls = { ...config.walls };
  for (const side of Object.keys(getStorageWalls({ ...config.storage, bay }))) {
    walls[side as keyof typeof walls] = "none";
  }
  setConfig({ ...config, walls, storage: { ...config.storage, bay } });
});

doorControl.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!button) return;
  setConfig({
    ...config,
    storage: { ...config.storage, door: button.dataset.value as StorageDoor },
  });
});

function renderStorageSection() {
  for (const [control, value] of [
    [bayControl, config.storage.bay],
    [doorControl, config.storage.door],
  ] as const) {
    control.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.value === value));
    });
  }
  doorControl.classList.toggle("is-disabled", config.storage.bay === "none");
}

// ---------- 4. відображення ----------

const texturesCheckbox = $<HTMLInputElement>("#textures-checkbox");
const dimensionsCheckbox = $<HTMLInputElement>("#dimensions-checkbox");

texturesCheckbox.addEventListener("change", () => {
  if (ready) engine.setTexturesEnabled(texturesCheckbox.checked);
});

function setDimensionsVisible(visible: boolean) {
  showDimensions = visible;
  dimensionsCheckbox.checked = visible;
  const tool = $<HTMLButtonElement>('[data-action="dimensions"]');
  tool.classList.toggle("is-active", visible);
  tool.setAttribute("aria-pressed", String(visible));
  engine.setDimensionsVisible(visible);
  if (viewMode === "2d") renderPlanView();
}

dimensionsCheckbox.addEventListener("change", () =>
  setDimensionsVisible(dimensionsCheckbox.checked),
);

// ---------- підсумок і посилання ----------

const summaryEl = $<HTMLElement>("#summary");

function renderSummary() {
  const { width, depth } = config.dims;
  const roofArea = (width + 2 * ROOF_OVERHANG) * (depth + 2 * ROOF_OVERHANG);
  const walls = resolveWalls(config);
  const closed = Object.values(walls).filter((t) => t !== "none").length;
  const storageArea =
    config.storage.bay === "none" ? 0 : width * (depth / 2);

  summaryEl.innerHTML = `
    <div><dt>Roof</dt><dd>${roofArea.toFixed(1)} m²</dd></div>
    <div><dt>Walls</dt><dd>${closed} / ${WALL_SIDE_IDS.length}</dd></div>
    <div><dt>Storage</dt><dd>${storageArea ? `${storageArea.toFixed(1)} m²` : "—"}</dd></div>`;
}

const shareButton = $<HTMLButtonElement>("#share-btn");
shareButton.addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}#${encodeConfig(config)}`;
  const original = "Copy configuration link";
  try {
    await navigator.clipboard.writeText(url);
    shareButton.textContent = "Link copied ✓";
  } catch {
    shareButton.textContent = "Copy failed — link is in the address bar";
  }
  setTimeout(() => (shareButton.textContent = original), 1800);
});

// ---------- панель інструментів ----------

const tools = {
  fullscreen: $<HTMLButtonElement>('[data-action="fullscreen"]'),
  view: $<HTMLButtonElement>('[data-action="view"]'),
  zoomIn: $<HTMLButtonElement>('[data-action="zoom-in"]'),
  zoomOut: $<HTMLButtonElement>('[data-action="zoom-out"]'),
  dimensions: $<HTMLButtonElement>('[data-action="dimensions"]'),
  reset: $<HTMLButtonElement>('[data-action="reset"]'),
};

tools.fullscreen.innerHTML = toolbarIcons.fullscreen;
tools.view.innerHTML = toolbarIcons.view2d;
tools.zoomIn.innerHTML = toolbarIcons.zoomIn;
tools.zoomOut.innerHTML = toolbarIcons.zoomOut;
tools.dimensions.innerHTML = toolbarIcons.ruler;
tools.reset.innerHTML = toolbarIcons.reset;

tools.fullscreen.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
document.addEventListener("fullscreenchange", () => {
  tools.fullscreen.innerHTML = document.fullscreenElement
    ? toolbarIcons.exitFullscreen
    : toolbarIcons.fullscreen;
});

tools.view.addEventListener("click", () => setViewMode(viewMode === "3d" ? "2d" : "3d"));

tools.zoomIn.addEventListener("click", () => {
  if (viewMode === "3d") engine.zoom(0.8);
  else setPlanZoom(planZoom * 1.2);
});
tools.zoomOut.addEventListener("click", () => {
  if (viewMode === "3d") engine.zoom(1.25);
  else setPlanZoom(planZoom / 1.2);
});
tools.dimensions.addEventListener("click", () => setDimensionsVisible(!showDimensions));
tools.reset.addEventListener("click", () => {
  if (viewMode === "3d") engine.resetView();
  else setPlanZoom(1);
});

function setViewMode(mode: "3d" | "2d") {
  viewMode = mode;
  const is2d = mode === "2d";
  planView.hidden = !is2d;
  host.style.visibility = is2d ? "hidden" : "";
  tools.view.innerHTML = is2d ? toolbarIcons.view3d : toolbarIcons.view2d;
  tools.view.title = is2d ? "Switch to 3D view" : "Switch to 2D plan";
  if (is2d) renderPlanView();
}

function setPlanZoom(value: number) {
  planZoom = Math.min(Math.max(value, 0.6), 3);
  const svg = planView.querySelector<SVGElement>("svg");
  if (svg) svg.style.transform = `scale(${planZoom})`;
}

function renderPlanView() {
  planView.innerHTML = renderPlan(config, { showDimensions });
  setPlanZoom(planZoom);
}

// ---------- старт ----------

async function start() {
  render();
  try {
    await engine.init();
    ready = true;
    engine.setTexturesEnabled(texturesCheckbox.checked);
    engine.update(config);
    engine.resetView();
    $<HTMLDivElement>("#loader").hidden = true;
  } catch (error) {
    console.error(error);
    $<HTMLDivElement>("#loader").textContent = "Could not load 3D models.";
  }
}

start();
