import { describe, it, expect } from 'vitest';
import { renderTopologySvg } from '../../../src/renderer/svg.js';
import { buildRuns } from '../../../src/renderer/geometry.js';
import { projectResidues } from '../../../src/renderer/projection.js';
import type { CAResidue, SecondaryStructureSegment } from '../../../src/types.js';

function chainFor(residues: CAResidue[], segments: SecondaryStructureSegment[]) {
  return buildRuns(projectResidues(residues), segments);
}

describe('renderTopologySvg', () => {
  // A single helix-like Cα trace going from below to above the membrane.
  const helixResidues: CAResidue[] = Array.from({ length: 20 }, (_, i) => ({
    resSeq: i + 1,
    iCode: '',
    x: i * 1.5,
    y: 0,
    z: -15 + i * 1.5,
  }));
  const helixSegments: SecondaryStructureSegment[] = [{ start: 1, end: 20, type: 'helix' }];

  it('produces a valid SVG root element', () => {
    const svg = renderTopologySvg(chainFor(helixResidues, helixSegments));
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
  });

  it('renders a membrane group with a slab rect and two boundary lines', () => {
    const svg = renderTopologySvg(chainFor(helixResidues, helixSegments));
    const membrane = svg.querySelector('g.membrane');
    expect(membrane).not.toBeNull();
    expect(membrane!.querySelectorAll('rect')).toHaveLength(1);
    expect(membrane!.querySelectorAll('line')).toHaveLength(2);
  });

  it('renders a helix group containing a transformed bar', () => {
    const svg = renderTopologySvg(chainFor(helixResidues, helixSegments));
    const helix = svg.querySelector('g.helix rect');
    expect(helix).not.toBeNull();
    expect(helix!.getAttribute('transform')).toMatch(/translate\(.*\) rotate\(.*\)/);
  });

  it('renders a coil path when residues fall outside any helix/strand', () => {
    const coilResidues: CAResidue[] = Array.from({ length: 5 }, (_, i) => ({
      resSeq: i + 1,
      iCode: '',
      x: i,
      y: 0,
      z: 20,
    }));
    const svg = renderTopologySvg(chainFor(coilResidues, []));
    const coil = svg.querySelector('path.coil');
    expect(coil).not.toBeNull();
    expect(coil!.getAttribute('d')?.length).toBeGreaterThan(0);
  });
});
