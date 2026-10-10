import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceController } from '../../../src/sequence/controller.js';
import { SequenceRenderer } from '../../../src/sequence/renderer.js';
import { UNWRAP_END } from '../../../src/sequence/transition.js';
import type { SequenceSource, TracePoint } from '../../../src/sequence/types.js';
import { DARK_THEME, LIGHT_THEME } from '../../../src/theme/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const N = 30;

/**
 * 30 residues: a helix (5–12) and an arrowed strand (18–24), a dashed gap
 * (14–16), and a 2-D trace that leaves out the first two and last two residues.
 */
function source(over: Partial<SequenceSource> = {}): SequenceSource {
  const trace: TracePoint[] = [];
  for (let k = 20; k <= 270; k++) {
    const f = k / 10;
    trace.push({ x: 100 + f * 10, y: 150 - 60 * Math.sin((f / 30) * Math.PI * 2), f });
  }
  return {
    residues: Array.from({ length: N }, (_, i) => ({
      resSeq: 101 + i,
      iCode: i === 3 ? 'A' : '',
      code: 'ACDEFGHIKL'[i % 10],
      ss: i >= 5 && i <= 12 ? 'helix' : i >= 18 && i <= 24 ? 'strand' : 'coil',
    })),
    trace,
    dashed: [[14, 16]],
    elements: [
      { type: 'helix', from: 5, to: 12, withArrow: false },
      { type: 'strand', from: 18, to: 24, withArrow: true },
    ],
    z: Array.from({ length: N }, (_, i) => (i >= 5 && i <= 12 ? 0 : 20)),
    membrane: { upper: 15, lower: -15 },
    frame2d: { minX: 0, minY: 0, width: 420, height: 300 },
    origin2d: { x: 50, y: 150, pxPerA: 2 },
    slab: { x0: 0, x1: 150 },
    colourAt: null,
    lanes: [],
    halfWidthPx: 6,
    arrowHalfWidthPx: 9,
    arrowLengthPx: 8,
    ...over,
  };
}

const coloured = (i: number): string | undefined => (i % 3 === 0 ? '#ff0000' : undefined);

function decor(): Element {
  const t = document.createElementNS(SVG_NS, 'text');
  t.classList.add('decor');
  return t;
}

describe('SequenceRenderer', () => {
  it('draws nothing before it is configured', () => {
    const r = new SequenceRenderer(source(), { wrap: null }, LIGHT_THEME);
    r.render(0);
    expect(r.svg.childElementCount).toBe(0);
    expect(r.sequenceLayout).toBeNull();
  });

  it('draws the sequence view at progress 0', () => {
    const r = new SequenceRenderer(source(), { wrap: 10 }, LIGHT_THEME, [decor()]);
    r.configure(420, 0);
    r.render(0);
    const layout = r.sequenceLayout!;
    expect(layout.rows).toHaveLength(3);
    expect(r.svg.getAttribute('viewBox')).toBe(
      `0 0 ${layout.width.toFixed(2)} ${layout.height.toFixed(2)}`,
    );
    // One letter per residue, with its number and insertion code in the tooltip.
    const letters = [...r.svg.querySelectorAll('text[data-res]')];
    expect(letters).toHaveLength(N);
    expect(letters.map((t) => t.firstChild!.textContent).join('')).toBe('ACDEFGHIKL'.repeat(3));
    expect(letters[3].querySelector('title')!.textContent).toBe('E 104A');
    // Row numbers.
    const nums = [...r.svg.querySelectorAll('text[text-anchor="end"]')].map((t) => t.textContent);
    expect(nums).toEqual(['101', '111', '121']);
    // Membrane shading where the 2-D layout puts residues inside the slab:
    // residues 5–9 in row 0 and 10–12 in row 1.
    expect(r.svg.querySelectorAll('rect[height="29"]')).toHaveLength(2);
    // Helix and strand outlines, and a dashed loop for the gap.
    expect(r.svg.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(2);
    expect(r.svg.querySelectorAll('polyline[stroke-dasharray]').length).toBeGreaterThan(0);
    // No 2-D decorations or slab yet.
    expect(r.svg.querySelector('.decor')).toBeNull();
    expect(r.svg.querySelector('line[stroke-dasharray="4 4"]')).toBeNull();
  });

  it('draws data lanes, truncating long labels', () => {
    const lanes = [
      { label: 'Head contacts', colourAt: coloured },
      { label: 'Short', colourAt: () => undefined },
    ];
    const r = new SequenceRenderer(source({ lanes }), { wrap: 10 }, LIGHT_THEME);
    r.configure(420, 0);
    r.render(0);
    const labels = [...r.svg.querySelectorAll('text[font-size="8.5"]')];
    expect(labels.map((t) => t.firstChild!.textContent)).toEqual(
      Array(3).fill(['Head con…', 'Short']).flat(),
    );
    expect(labels[0].querySelector('title')!.textContent).toBe('Head contacts');
    // One coloured cell per residue with a value: 0, 3, 6, …, 27.
    expect(r.svg.querySelectorAll('rect[fill="#ff0000"]')).toHaveLength(10);
  });

  it('colours the chain per residue when the 2-D view does', () => {
    const r = new SequenceRenderer(source({ colourAt: coloured }), { wrap: 10 }, LIGHT_THEME);
    r.configure(420, 0);
    r.render(0);
    expect(r.svg.querySelectorAll('polyline[stroke="#ff0000"]').length).toBeGreaterThan(0);
    expect(r.svg.querySelectorAll('polygon[fill="#ff0000"]').length).toBeGreaterThan(0);
    // The element bodies keep their outline but let the residue colours through:
    // the helix and the strand each cross a row break, so two pieces each.
    expect(r.svg.querySelectorAll('polygon[fill-opacity="0"]')).toHaveLength(4);
  });

  it('joins the rows with connectors while they unwrap', () => {
    const r = new SequenceRenderer(source(), { wrap: 10 }, LIGHT_THEME);
    r.configure(420, 0);
    r.render(0.05);
    expect(r.svg.querySelectorAll('path').length).toBeGreaterThan(0);
    r.render(UNWRAP_END);
    expect(r.svg.querySelectorAll('path')).toHaveLength(0);
  });

  it('reveals the membrane slab and the 2-D decorations near the topology', () => {
    const r = new SequenceRenderer(source(), { wrap: 10 }, LIGHT_THEME, [decor()]);
    r.configure(420, 0);
    const mid = UNWRAP_END + (1 - UNWRAP_END) / 2;
    r.render(mid);
    const slab = r.svg.querySelector('line[stroke-dasharray="4 4"]')!;
    expect(slab).not.toBeNull();
    // Part way through the fold the slab stops at the folding wave.
    const partial = Number(slab.getAttribute('x2'));
    r.render(0.95);
    const full = Number(r.svg.querySelector('line[stroke-dasharray="4 4"]')!.getAttribute('x2'));
    expect(partial).toBeLessThan(full);
    expect(full).toBeCloseTo(50 + 150 * 2, 6);
    // The picture is the topology's height, with its decorations faded in.
    expect(r.svg.getAttribute('height')).toBe('300.00');
    expect(r.svg.querySelector('.decor')).not.toBeNull();
    // The letters and sequence furniture have gone.
    expect(r.svg.querySelector('text[data-res]')).toBeNull();
  });

  it('starts the line at the gutter when the slab starts off screen', () => {
    const r = new SequenceRenderer(source(), { wrap: null }, LIGHT_THEME);
    // Scrolled 100 px: the slab runs from -50 to 250 on screen.
    r.configure(420, 100);
    r.render(UNWRAP_END);
    const xs = [...r.svg.querySelectorAll('polyline')].flatMap((p) =>
      p
        .getAttribute('points')!
        .split(' ')
        .map((xy) => Number(xy.split(',')[0])),
    );
    expect(Math.min(...xs)).toBeCloseTo(12, 1);
    expect(Math.max(...xs)).toBeCloseTo(250, 1);
  });

  it('picks up new options and themes on the next configure and render', () => {
    const r = new SequenceRenderer(source(), { wrap: 10 }, LIGHT_THEME);
    r.configure(420, 0);
    r.setOptions({ wrap: 20 });
    expect(r.sequenceLayout!.perRow).toBe(10);
    r.configure(420, 0);
    expect(r.sequenceLayout!.perRow).toBe(20);
    r.setTheme(DARK_THEME);
    r.render(0);
    const letters = r.svg.querySelector('g[font-size="11"]')!;
    expect(letters.getAttribute('fill')).toBe(DARK_THEME.text);
  });

  it('copes with an empty trace', () => {
    const r = new SequenceRenderer(source({ trace: [] }), { wrap: 10 }, LIGHT_THEME);
    r.configure(420, 0);
    expect(() => r.render(0.9)).not.toThrow();
  });
});

describe('SequenceController', () => {
  let scroll: HTMLDivElement;
  let svg2d: SVGSVGElement;
  let observed: (() => void) | null;
  const disconnect = vi.fn();

  beforeEach(() => {
    observed = null;
    disconnect.mockClear();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observed = cb;
        }
        observe(): void {}
        disconnect = disconnect;
      },
    );
    scroll = document.createElement('div');
    svg2d = document.createElementNS(SVG_NS, 'svg');
    svg2d.setAttribute('aria-label', 'Topology of 2OMF');
    svg2d.setAttribute('width', '420');
    scroll.appendChild(svg2d);
    document.body.appendChild(scroll);
  });

  afterEach(() => {
    scroll.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const make = (): SequenceController =>
    new SequenceController(scroll, svg2d, source(), { wrap: 10 }, LIGHT_THEME, []);

  function setWidth(w: number): void {
    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: w });
  }

  it('labels the sequence SVG after the 2-D one', () => {
    expect(make().svg.getAttribute('aria-label')).toBe('Topology of 2OMF, sequence view');
    svg2d.removeAttribute('aria-label');
    expect(make().svg.getAttribute('aria-label')).toBe('sequence view');
  });

  it('swaps the sequence SVG in away from the topology and back at 1', () => {
    const c = make();
    const changes: [number, number][] = [];
    c.onChange = (u, goal) => changes.push([u, goal]);
    scroll.scrollLeft = 30;
    c.setProgress(0.3);
    expect(scroll.contains(c.svg)).toBe(true);
    expect(scroll.contains(svg2d)).toBe(false);
    expect(c.progress).toBe(0.3);
    expect(c.target).toBe(0);
    // The 2-D width stands in when the container has none.
    expect(c.svg.getAttribute('width')).toBe('420.00');
    c.setProgress(2);
    expect(scroll.contains(svg2d)).toBe(true);
    expect(scroll.contains(c.svg)).toBe(false);
    expect(scroll.scrollLeft).toBe(30);
    expect(changes).toEqual([
      [0.3, 0],
      [1, 1],
    ]);
  });

  it('animates to the sequence over time, then calls back', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const c = make();
    const done = vi.fn();
    c.animateTo(0, done);
    expect(c.animating).toBe(true);
    vi.advanceTimersByTime(1100);
    expect(c.progress).toBeGreaterThan(0);
    expect(c.progress).toBeLessThan(1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1200);
    expect(c.progress).toBe(0);
    expect(c.animating).toBe(false);
    expect(done).toHaveBeenCalledOnce();
  });

  it('stops an animation when the progress is set', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const c = make();
    c.animateTo(0);
    vi.advanceTimersByTime(500);
    c.setProgress(0.2);
    expect(c.animating).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(c.progress).toBe(0.2);
  });

  it('jumps straight to the goal when already there or motion is reduced', () => {
    const c = make();
    const done = vi.fn();
    c.animateTo(1, done);
    expect(done).toHaveBeenCalledOnce();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    c.animateTo(0, done);
    expect(c.progress).toBe(0);
    expect(c.animating).toBe(false);
    expect(done).toHaveBeenCalledTimes(2);
  });

  it('redraws for new options and themes only while shown', () => {
    const c = make();
    const changes = vi.fn();
    c.onChange = changes;
    c.setOptions({ wrap: 20 });
    c.restyle(DARK_THEME);
    expect(changes).not.toHaveBeenCalled();
    c.setProgress(0);
    const rows = c.svg.querySelectorAll('text[text-anchor="end"]').length;
    c.setOptions({ wrap: 10 });
    expect(c.svg.querySelectorAll('text[text-anchor="end"]').length).toBeGreaterThan(rows);
    c.restyle(LIGHT_THEME);
    expect(c.svg.querySelector('g[font-size="11"]')!.getAttribute('fill')).toBe(LIGHT_THEME.text);
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it('re-wraps the rows when the container is resized', () => {
    const c = make();
    c.setOptions({ wrap: null });
    setWidth(420);
    observed!();
    c.setProgress(0);
    expect(c.svg.getAttribute('width')).toBe('420.00');
    setWidth(700);
    observed!();
    expect(c.svg.getAttribute('width')).toBe('700.00');
    setWidth(0);
    observed!();
    expect(c.svg.getAttribute('width')).toBe('700.00');
  });

  it('puts the topology back and stops observing when disposed', () => {
    const c = make();
    c.setProgress(0);
    c.dispose();
    expect(scroll.contains(svg2d)).toBe(true);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
