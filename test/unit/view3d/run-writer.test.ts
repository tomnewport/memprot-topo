import { describe, it, expect } from 'vitest';
import { Run, RunWriter, type OpSpec, type RunLook } from '../../../src/view3d/engine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FILL: OpSpec = { layer: 0, key: 'f', kind: 'fill' };
const LINE: OpSpec = { layer: 1, key: 'l', kind: 'stroke', linecap: 'round' };

const look = (selected: number[] = []): RunLook => ({
  style: { fadedOpacity: 0.32, unselectedSaturation: 0.2, selectionWidthScale: 2 },
  ground: [255, 255, 255],
  fadeOpacity: 1,
  contextOpacity: 1,
  coordScale: 100,
  selected: new Set(selected),
  typeOf: (id) => (id === 1 ? 'helix' : 'loop'),
});

function run(id: number): Run {
  const r = new Run(id, false, true, 100);
  r.fill(FILL, [0, 0, 10, 0, 10, 10], [200, 0, 0]);
  r.stroke(LINE, [0, 0, 10, 10], [0, 0, 0], 1.5);
  return r;
}

describe('RunWriter', () => {
  it('writes one group per run, one path per op, and reuses them next frame', () => {
    const g = document.createElementNS(SVG_NS, 'g');
    const defs = document.createElementNS(SVG_NS, 'defs');
    const writer = new RunWriter(g, defs, 'tst');
    writer.emit([run(1), run(2)], look([1]));
    const groups = [...g.children];
    expect(groups.length).toBe(2);
    expect(groups[0].querySelectorAll('path').length).toBe(2);
    expect(groups[0].getAttribute('class')).toBe('selected');
    expect(groups[0].getAttribute('data-type')).toBe('helix');
    const fill = groups[0].querySelector('path')!;
    expect(fill.getAttribute('fill')).toBe('rgb(200,0,0)');

    writer.emit([run(2)], look());
    expect(g.children.length).toBe(2);
    expect(g.children[0]).toBe(groups[0]);
    expect(g.children[1].getAttribute('display')).toBe('none');
    expect(g.children[0].getAttribute('class')).toBeNull();
  });
});
