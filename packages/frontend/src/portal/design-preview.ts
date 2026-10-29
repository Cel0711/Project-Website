import type { DesignPayload, ElementInstance, Scene } from '@coreloop/shared';
import { fitStage, paintScene } from '../engine/stage.js';

/** Turns the design a client attached (a trimmed snapshot) back into something the screen engine can draw. */
export function designToScene(d: DesignPayload): Scene {
  const els: ElementInstance[] = d.elements.map((e, i) => ({
    id: `d${i}`,
    type: e.type,
    x: e.x,
    y: e.y,
    w: e.w,
    h: e.h,
    rot: e.rot,
    op: e.opacity,
    lock: 0,
    hide: 0,
    name: e.name,
    s: e.style,
    a: e.adjust,
    p: e.content,
  }));
  return { w: d.canvas[0], h: d.canvas[1], cv: d.theme, els };
}

/** Draws the design read-only inside `host` (a `.m-shot` box) and keeps it fitted when the box is resized. */
export function renderDesign(host: HTMLElement, design: DesignPayload): void {
  paintScene(host, designToScene(design));
  new ResizeObserver(() => fitStage(host)).observe(host);
}

/** Saves any JSON as a file download (the design, for the team to open elsewhere). */
export function downloadJson(name: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
