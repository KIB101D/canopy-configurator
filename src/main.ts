import { createCanopyEngine } from "./canopy/Createcanopyengine";
import type { Dimensions } from "./canopy/dims";

const host = document.querySelector<HTMLDivElement>("#canvas-host")!;
const widthInput = document.querySelector<HTMLInputElement>("#width")!;
const heightInput = document.querySelector<HTMLInputElement>("#height")!;
const depthInput = document.querySelector<HTMLInputElement>("#depth")!;
const texturesCheckbox =
  document.querySelector<HTMLInputElement>("#textures-checkbox")!;

const MIN_DIM = 2;
const MAX_DIM = 8;

function clamp(value: number): number {
  return Math.min(Math.max(value, MIN_DIM), MAX_DIM);
}

const engine = createCanopyEngine(host);

let dims: Dimensions = {
  width: clamp(parseFloat(widthInput.value)),
  height: clamp(parseFloat(heightInput.value)),
  depth: clamp(parseFloat(depthInput.value)),
};

function handleInput(key: keyof Dimensions, input: HTMLInputElement) {
  const parsed = parseFloat(input.value);
  if (Number.isNaN(parsed)) return;

  dims = { ...dims, [key]: clamp(parsed) };
  engine.rebuild(dims);
}

function handleBlur(key: keyof Dimensions, input: HTMLInputElement) {
  input.value = String(dims[key]);
}

function bindDimensionInput(key: keyof Dimensions, input: HTMLInputElement) {
  input.addEventListener("input", () => handleInput(key, input));
  input.addEventListener("blur", () => handleBlur(key, input));
}

bindDimensionInput("width", widthInput);
bindDimensionInput("height", heightInput);
bindDimensionInput("depth", depthInput);

document
  .querySelectorAll<HTMLButtonElement>(".step-up, .step-down")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target!;
      const input = document.querySelector<HTMLInputElement>(`#${targetId}`)!;
      const step = parseFloat(input.step || "0.1");
      const current = parseFloat(input.value) || 0;
      const delta = button.classList.contains("step-up") ? step : -step;

      input.value = (Math.round((current + delta) * 10) / 10).toString();
      input.dispatchEvent(new Event("input"));
    });
  });

texturesCheckbox.addEventListener("change", () => {
  engine.setTexturesEnabled(texturesCheckbox.checked);
});

async function start() {
  await engine.init();
  engine.setTexturesEnabled(texturesCheckbox.checked);
  engine.rebuild(dims);
}

start();
