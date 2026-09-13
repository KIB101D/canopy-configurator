import { createCanopyEngine } from "./canopy/Createcanopyengine";
import type { Dimensions } from "./canopy/Dims";

const host = document.querySelector<HTMLDivElement>("#canvas-host")!;
const widthInput = document.querySelector<HTMLInputElement>("#width")!;
const heightInput = document.querySelector<HTMLInputElement>("#height")!;
const depthInput = document.querySelector<HTMLInputElement>("#depth")!;

const engine = createCanopyEngine(host);

function getDimensions(): Dimensions {
  return {
    width: parseFloat(widthInput.value),
    height: parseFloat(heightInput.value),
    depth: parseFloat(depthInput.value),
  };
}

function onDimensionsChange() {
  engine.rebuild(getDimensions());
}

widthInput.addEventListener("input", onDimensionsChange);
heightInput.addEventListener("input", onDimensionsChange);
depthInput.addEventListener("input", onDimensionsChange);

async function start() {
  await engine.init();
  engine.rebuild(getDimensions());
}

start();
