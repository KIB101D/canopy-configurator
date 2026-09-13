import { createCanopyEngine } from "./canopy/createCanopyEngine";
import type { Dimensions } from "./canopy/dims";

const host = document.querySelector<HTMLDivElement>("#canvas-host")!;
const widthInput = document.querySelector<HTMLInputElement>("#width")!;
const heightInput = document.querySelector<HTMLInputElement>("#height")!;
const depthInput = document.querySelector<HTMLInputElement>("#depth")!;
const texturesCheckbox =
  document.querySelector<HTMLInputElement>("#textures-checkbox")!;

const MIN_DIM = 2;
const MAX_DIM = 8;

const engine = createCanopyEngine(host);

let dims: Dimensions = {
  width: Math.max(parseFloat(widthInput.value) || 0, MIN_DIM),
  height: Math.max(parseFloat(heightInput.value) || 0, MIN_DIM),
  depth: Math.max(parseFloat(depthInput.value) || 0, MIN_DIM),
};

// валілація інпутів
function handleInput(key: keyof Dimensions, input: HTMLInputElement) {
  const parsed = parseFloat(input.value);
  if (Number.isNaN(parsed)) return;

  let fieldValue = parsed;
  if (parsed < 0) fieldValue = 0;
  if (parsed > MAX_DIM) fieldValue = MAX_DIM;

  if (fieldValue !== parsed) {
    input.value = String(fieldValue);
  }

  const warningEl = document.querySelector<HTMLSpanElement>(`#${key}-warning`);
  if (warningEl) {
    warningEl.textContent =
      fieldValue < MIN_DIM ? `мінімум ${MIN_DIM} м (буде застосовано)` : "";
  }

  dims = { ...dims, [key]: Math.max(fieldValue, MIN_DIM) }; // рушій завжди отримує безпечне 2–8
  engine.rebuild(dims);
}

function bindDimensionInput(key: keyof Dimensions, input: HTMLInputElement) {
  input.addEventListener("input", () => handleInput(key, input));
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
