import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Dimensions } from "../dims";
import { COLUMN_SIZE, ROOF_OVERHANG, totalHeight } from "../config";

const COLORS = {
  structure: "#a8436a",
  roof: "#7a6a1f",
  bay: "#3f8f6b",
  height: "#a8436a",
  total: "#3f8f6b",
};

const TICK = 0.07;
const Y_GROUND = 0.012;

interface DimensionSpec {
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** напрямок, у якому малюємо засічки й зсуваємо підпис */
  normal: THREE.Vector3;
  label: string;
  color: string;
  /** точки на конструкції, від яких тягнемо виносні лінії */
  anchors?: [THREE.Vector3, THREE.Vector3];
}

const cm = (meters: number) => `${+(meters * 100).toFixed(1)}cm`;

/**
 * Розмірні лінії в 3D (як на референсі): лінія, засічки під 45°,
 * виносні лінії до конструкції та HTML-підпис через CSS2DRenderer.
 */
export function buildDimensionLines(dims: Dimensions): THREE.Group {
  const group = new THREE.Group();
  group.name = "dimension-lines";

  const hw = dims.width / 2;
  const hd = dims.depth / 2;
  const rw = hw + ROOF_OVERHANG;
  const rd = hd + ROOF_OVERHANG;
  const clearBay = dims.depth / 2 - COLUMN_SIZE;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const plusZ = v(0, 0, 1);
  const plusX = v(1, 0, 0);
  const minusX = v(-1, 0, 0);

  const specs: DimensionSpec[] = [
    // ширина: по осях колон і по даху
    {
      from: v(-hw, Y_GROUND, hd + 0.5),
      to: v(hw, Y_GROUND, hd + 0.5),
      normal: plusZ,
      label: cm(dims.width),
      color: COLORS.structure,
      anchors: [v(-hw, Y_GROUND, hd), v(hw, Y_GROUND, hd)],
    },
    {
      from: v(-rw, Y_GROUND, hd + 0.85),
      to: v(rw, Y_GROUND, hd + 0.85),
      normal: plusZ,
      label: cm(dims.width + 2 * ROOF_OVERHANG),
      color: COLORS.roof,
    },
    // глибина
    {
      from: v(hw + 0.5, Y_GROUND, -hd),
      to: v(hw + 0.5, Y_GROUND, hd),
      normal: plusX,
      label: cm(dims.depth),
      color: COLORS.structure,
      anchors: [v(hw, Y_GROUND, -hd), v(hw, Y_GROUND, hd)],
    },
    {
      from: v(hw + 0.85, Y_GROUND, -rd),
      to: v(hw + 0.85, Y_GROUND, rd),
      normal: plusX,
      label: cm(dims.depth + 2 * ROOF_OVERHANG),
      color: COLORS.roof,
    },
    // чисті прольоти між колонами (корисно для підбору стін)
    {
      from: v(-hw - 0.45, Y_GROUND, -hd + COLUMN_SIZE / 2),
      to: v(-hw - 0.45, Y_GROUND, -COLUMN_SIZE / 2),
      normal: minusX,
      label: cm(clearBay),
      color: COLORS.bay,
      anchors: [v(-hw, Y_GROUND, -hd + COLUMN_SIZE / 2), v(-hw, Y_GROUND, -COLUMN_SIZE / 2)],
    },
    {
      from: v(-hw - 0.45, Y_GROUND, COLUMN_SIZE / 2),
      to: v(-hw - 0.45, Y_GROUND, hd - COLUMN_SIZE / 2),
      normal: minusX,
      label: cm(clearBay),
      color: COLORS.bay,
      anchors: [v(-hw, Y_GROUND, COLUMN_SIZE / 2), v(-hw, Y_GROUND, hd - COLUMN_SIZE / 2)],
    },
    // висота колони та загальна висота
    {
      from: v(hw + 0.3, 0, hd + 0.3),
      to: v(hw + 0.3, dims.height, hd + 0.3),
      normal: v(1, 0, 1).normalize(),
      label: cm(dims.height),
      color: COLORS.height,
    },
    {
      from: v(-hw - 0.45, 0, hd + 0.45),
      to: v(-hw - 0.45, totalHeight(dims), hd + 0.45),
      normal: v(-1, 0, 1).normalize(),
      label: `ca. ${cm(totalHeight(dims))}`,
      color: COLORS.total,
    },
  ];

  for (const spec of specs) group.add(createDimension(spec));
  return group;
}

function createDimension(spec: DimensionSpec): THREE.Group {
  const group = new THREE.Group();
  const { from, to, normal } = spec;
  const dir = to.clone().sub(from).normalize();
  // засічка під 45° між напрямком лінії та нормаллю
  const tick = dir.clone().add(normal).normalize().multiplyScalar(TICK);

  const points: THREE.Vector3[] = [
    from,
    to,
    from.clone().sub(tick),
    from.clone().add(tick),
    to.clone().sub(tick),
    to.clone().add(tick),
    // невеликі "вуса", щоб лінія виходила за засічки
    from.clone().addScaledVector(dir, -0.06),
    from,
    to,
    to.clone().addScaledVector(dir, 0.06),
  ];

  if (spec.anchors) {
    for (const [anchor, end] of [
      [spec.anchors[0], from],
      [spec.anchors[1], to],
    ] as const) {
      points.push(anchor, end.clone().addScaledVector(normal, 0.08));
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: spec.color,
    transparent: true,
    opacity: 0.9,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.userData.ownsGeometry = true;
  lines.userData.ownsMaterial = true;
  lines.renderOrder = 3;
  group.add(lines);

  const el = document.createElement("div");
  el.className = "dim-label";
  el.textContent = spec.label;
  el.style.setProperty("--dim-color", spec.color);
  const label = new CSS2DObject(el);
  label.position.copy(from).lerp(to, 0.5).addScaledVector(normal, 0.12);
  group.add(label);

  return group;
}

/**
 * CSS2DObject прибирає свій DOM-елемент лише коли видаляють саме його,
 * а не батьківську групу — тому чистимо підписи вручну.
 */
export function disposeDimensionLines(group: THREE.Object3D) {
  group.traverse((child) => {
    if (child instanceof CSS2DObject) child.element.remove();
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
}
