import { describe, it, expect } from 'vitest';
import { fullscreenScale } from '../../../src/components/fullscreen.js';
import {
  DEFAULT_TRANSITION_MS,
  DimensionController,
  renderViewBar,
  type DimensionHost,
} from '../../../src/components/dimension-controller.js';
import { chainBounds, styleSelection } from '../../../src/components/selection.js';
import { sequenceLanes } from '../../../src/components/sequence-lanes.js';
import type { SeqResidue } from '../../../src/sequence/types.js';
import type { SequenceController } from '../../../src/sequence/controller.js';

describe('fullscreenScale', () => {
  it('fills the frame, up to 4×', () => {
    expect(fullscreenScale(100, 50, 304, 404)).toBe(3);
    expect(fullscreenScale(10, 10, 1004, 1004)).toBe(4);
  });

  it('scrolls sideways rather than shrink below natural size for the width', () => {
    expect(fullscreenScale(1000, 100, 504, 404)).toBe(1);
  });

  it('shrinks to fit the height, but not below 0.6', () => {
    expect(fullscreenScale(100, 400, 1004, 204)).toBe(0.6);
    expect(fullscreenScale(100, 400, 1004, 324)).toBe(0.8);
  });
});

describe('DimensionController', () => {
  function host(seqProgress: number, view3dProgress: number | null, attrs: Record<string, string>) {
    const element = document.createElement('div');
    for (const [k, v] of Object.entries(attrs)) element.setAttribute(k, v);
    const seq = { progress: seqProgress } as SequenceController;
    const h: DimensionHost = {
      element,
      seq: () => seq,
      view3d: () => (view3dProgress === null ? null : ({ progress: view3dProgress } as never)),
      has3d: () => view3dProgress !== null,
      loadView3D: () => Promise.resolve(null),
      setTransitionProgress: () => Promise.resolve(),
      leave2d: () => undefined,
      onMove: () => undefined,
    };
    return Object.assign(new DimensionController(h), { element });
  }

  it('reads the position from the sequence, then the morph', () => {
    expect(host(0.3, 0.5, {}).position).toBe(0.3);
    expect(host(1, 0.5, {}).position).toBe(1.5);
    expect(host(1, null, {}).position).toBe(1);
  });

  it('clamps the target to what the chain can show', () => {
    expect(host(1, 0, { dimension: '3' }).target).toBe(2);
    expect(host(1, null, { dimension: '3' }).target).toBe(1);
    expect(host(1, 0, { dimension: '0' }).target).toBe(0);
    expect(host(1, 0, {}).target).toBe(1);
  });

  it('reads transition-time, defaulting when absent or invalid', () => {
    expect(host(1, 0, {}).transitionTime).toBe(DEFAULT_TRANSITION_MS);
    expect(host(1, 0, { 'transition-time': '-1' }).transitionTime).toBe(DEFAULT_TRANSITION_MS);
    expect(host(1, 0, { 'transition-time': '0' }).transitionTime).toBe(0);
  });

  it('presses the view button for where the view is, and announces moves once', () => {
    const c = host(1, 1, {});
    const bar = renderViewBar(
      true,
      () => undefined,
      () => undefined,
      document.createElement('span'),
    );
    const seen: number[] = [];
    c.element.addEventListener('dimension-change', (e) =>
      seen.push((e as CustomEvent<{ dimension: number }>).detail.dimension),
    );
    c.sync(bar);
    c.sync(bar);
    const pressed = bar.querySelector('[aria-pressed="true"]') as HTMLElement;
    expect(pressed.dataset.dimension).toBe('3');
    expect(bar.classList.contains('is-3d')).toBe(true);
    expect(seen).toEqual([3]);
  });
});

describe('renderViewBar', () => {
  it('disables 3D without a 3-D view', () => {
    const bar = renderViewBar(
      false,
      () => undefined,
      () => undefined,
      document.createElement('span'),
    );
    const b3 = bar.querySelector<HTMLButtonElement>('[data-dimension="3"]')!;
    expect(b3.disabled).toBe(true);
  });

  it('reports the picked dimension', () => {
    const picked: number[] = [];
    const bar = renderViewBar(
      true,
      (d) => picked.push(d),
      () => undefined,
      document.createElement('span'),
    );
    bar.querySelector<HTMLButtonElement>('[data-dimension="1"]')!.click();
    expect(picked).toEqual([1]);
  });
});

describe('selection helpers', () => {
  it('finds a chain’s residue bounds', () => {
    const calphas = [5, -2, 9].map((resSeq) => ({ resSeq, iCode: '', x: 0, y: 0, z: 0 }));
    expect(chainBounds({ chainId: 'A', residueCount: 3, segments: [], calphas })).toEqual({
      start: -2,
      end: 9,
    });
  });

  it('marks the elements and loops overlapping a range', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML =
      '<g class="ss-element" data-start="1" data-end="10"/>' +
      '<path class="loop" data-start="11" data-end="14"/>' +
      '<g class="ss-element" data-start="15" data-end="30"/>';
    styleSelection(svg, { start: 8, end: 12 });
    const on = [...svg.children].map((el) => el.classList.contains('selected'));
    expect(on).toEqual([true, true, false]);
    expect(svg.children[0].getAttribute('aria-pressed')).toBe('true');
    expect(svg.classList.contains('has-selection')).toBe(true);
    styleSelection(svg, null);
    expect(svg.classList.contains('has-selection')).toBe(false);
  });
});

describe('sequenceLanes', () => {
  const residues = [1, 2, 3].map((resSeq) => ({ resSeq }) as SeqResidue);

  it('puts the residue colouring first, then tracks with data for the chain', () => {
    const lanes = sequenceLanes(
      'A',
      residues,
      (k) => (k === '2' ? 'red' : undefined),
      'Hydrophobicity',
      [
        { label: 'Other chain', values: { B: { 1: 1 } } },
        { label: 'Contacts', values: { A: { 1: 0, 3: 10, 2: 'blue' } }, scale: ['#000', '#fff'] },
      ],
      ['#000000', '#ffffff'],
    );
    expect(lanes.map((l) => l.label)).toEqual(['Hydrophobicity', 'Contacts']);
    expect(lanes[0].colourAt(1)).toBe('red');
    expect(lanes[1].colourAt(1)).toBe('blue');
    expect(lanes[1].colourAt(0)).not.toBe(lanes[1].colourAt(2));
  });
});
