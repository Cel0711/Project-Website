import { $ } from '../core/dom.js';

type VantaEffect = { destroy(): void };
type VantaWindow = {
  VANTA?: { RINGS: (opts: Record<string, unknown>) => VantaEffect };
  THREE?: unknown;
};

let fx: VantaEffect | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Animated rings behind the Home page (Vanta RINGS), recoloured to silver in CSS
 * (`.rings-bg .vanta-canvas` in main.css). They are drawn on #ringsBg, a fixed full-viewport layer behind
 * all the content, so they stay in place while the page scrolls over them. (Vanta only renders while its
 * element is on screen, so inside the hero they used to pause and scroll away.) three.js and Vanta are
 * plain <script> tags in index.html (served from /vendor), so if they are blocked or WebGL is
 * unavailable the page simply has no rings.
 *
 * Started when Home is shown and destroyed when it is left (nothing renders for a hidden page).
 * Creating the WebGL scene is synchronous, so it starts slightly after the laptop intro does.
 */
export function startHeroBg(delay = 150): void {
  stopHeroBg();
  const el = $<HTMLElement>('#ringsBg');
  const w = window as unknown as VantaWindow;
  const vanta = w.VANTA;
  const three = w.THREE;
  if (!el || !vanta || !three) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  timer = setTimeout(() => {
    try {
      fx = vanta.RINGS({
        el,
        THREE: three,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        backgroundColor: 0x0b0b0c, // near-black: the CSS filter turns it silver-white (light) or keeps it dark
        color: 0x0,
      });
    } catch {
      fx = null; /* WebGL unavailable — no rings */
      return;
    }
    requestAnimationFrame(() => el.classList.add('rings-on')); // CSS fades the canvas in
  }, delay);
}

export function stopHeroBg(): void {
  clearTimeout(timer);
  fx?.destroy();
  fx = null;
  $('#ringsBg')?.classList.remove('rings-on');
}
