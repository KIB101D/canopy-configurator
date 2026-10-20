import * as THREE from "three";
import type { PartMaterials } from "./partMaterials";
import { plainBox } from "./primitives";

const TRACK_DEPTH = 0.1;
const BOTTOM_TRACK = 0.03;
const TOP_TRACK = 0.07;
const SIDE_PROFILE = 0.04;
const PANEL_PROFILE = 0.035;
const PANEL_THICKNESS = 0.022;
const PANEL_OVERLAP = 0.03;
const MAX_PANEL_WIDTH = 1.1;

/**
 * Розсувна скляна стіна: верхня/нижня напрямна, бокові профілі,
 * N панелей у двох доріжках по черзі (як у реальних системах).
 *
 * Локальні координати такі ж, як у дерев'яної стіни.
 */
export function createGlassSlidingWall(
  span: number,
  height: number,
  m: PartMaterials,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "glass-sliding-wall";

  // рама
  group.add(plainBox(m.aluminium, [span, BOTTOM_TRACK, TRACK_DEPTH], [span / 2, BOTTOM_TRACK / 2, 0]));
  group.add(
    plainBox(m.aluminium, [span, TOP_TRACK, TRACK_DEPTH], [span / 2, height - TOP_TRACK / 2, 0]),
  );
  for (const x of [SIDE_PROFILE / 2, span - SIDE_PROFILE / 2]) {
    group.add(plainBox(m.aluminium, [SIDE_PROFILE, height, TRACK_DEPTH], [x, height / 2, 0]));
  }

  // панелі
  const innerWidth = span - 2 * SIDE_PROFILE;
  const panelCount = Math.max(2, Math.ceil(innerWidth / MAX_PANEL_WIDTH));
  const panelWidth = innerWidth / panelCount + PANEL_OVERLAP;
  const panelBottom = BOTTOM_TRACK;
  const panelHeight = height - BOTTOM_TRACK - TOP_TRACK;

  for (let i = 0; i < panelCount; i++) {
    const cx = SIDE_PROFILE + (innerWidth / panelCount) * (i + 0.5);
    const z = i % 2 === 0 ? 0.022 : -0.022;
    const panel = createPanel(panelWidth, panelHeight, m);
    panel.position.set(cx, panelBottom, z);
    // ручка на зовнішньому боці — біля краю, що "заходить" під сусідню панель
    const handleX = (i % 2 === 0 ? 1 : -1) * (panelWidth / 2 - 0.07);
    panel.add(
      plainBox(
        m.hardware,
        [0.016, 0.32, 0.016],
        [handleX, Math.min(1.05, panelHeight / 2), Math.sign(z) * 0.022],
      ),
    );
    group.add(panel);
  }

  return group;
}

/** Одна панель: алюмінієва рамка + скло. Початок координат — низ по центру. */
function createPanel(width: number, height: number, m: PartMaterials) {
  const panel = new THREE.Group();
  const p = PANEL_PROFILE;
  const t = PANEL_THICKNESS;

  panel.add(plainBox(m.aluminium, [p, height, t], [-width / 2 + p / 2, height / 2, 0]));
  panel.add(plainBox(m.aluminium, [p, height, t], [width / 2 - p / 2, height / 2, 0]));
  panel.add(plainBox(m.aluminium, [width - 2 * p, p, t], [0, p / 2, 0]));
  panel.add(plainBox(m.aluminium, [width - 2 * p, p, t], [0, height - p / 2, 0]));

  const glass = plainBox(m.glass, [width - 2 * p, height - 2 * p, 0.008], [0, height / 2, 0]);
  glass.renderOrder = 2;
  glass.castShadow = false;
  glass.userData.noShadow = true;
  glass.userData.seeThrough = true; // не закриває підписи розмірів
  panel.add(glass);

  return panel;
}
