import { describe, it, expect } from 'vitest';
import {
  parseDistortions,
  parseOpmHalfThickness,
  parseStructureBilayer,
  parseStructureMembrane,
  resolveMembrane,
} from '../../../src/membrane/index.js';
import { helixCalphas, syntheticDistortions } from '../fixtures/distortions.js';
import OMF_AT from '../fixtures/2omf-memprotmd-at.pdb?raw';
import OMF_OPM from '../../../examples/2omf.pdb?raw';

const f = (v: number, w: number, d: number) => v.toFixed(d).padStart(w);

function atom(
  serial: number,
  name: string,
  res: string,
  resSeq: number,
  x: number,
  y: number,
  z: number,
) {
  return (
    `ATOM  ${String(serial).padStart(5)} ${name.padEnd(4)} ${res.padEnd(4)} ${String(resSeq).padStart(4)}    ` +
    `${f(x, 8, 3)}${f(y, 8, 3)}${f(z, 8, 3)}  1.00  0.00`
  );
}

/**
 * A box-frame system: a TM helix at (50, 50) and a lipid on each leaflet at
 * every 6 Å grid point, phosphates at midplane ± half (Å).
 */
function boxSystem(midplane: number, half: number, phosphate = ' P8') {
  const lines: string[] = [];
  let serial = 0;
  for (const c of helixCalphas(50, 50, midplane - 20, midplane + 20, 1)) {
    lines.push(atom(++serial, ' CA', 'ALA', c.resSeq, c.x, c.y, c.z));
  }
  let res = 100;
  for (let x = 0; x <= 100; x += 6) {
    for (let y = 0; y <= 100; y += 6) {
      for (const sign of [1, -1]) {
        res++;
        // The lipids next to the protein are pulled 5 Å toward the midplane.
        const near = Math.hypot(x - 50, y - 50) < 15 ? -5 : 0;
        const z = midplane + sign * (half + near);
        lines.push(atom(++serial, phosphate, 'DPP', res, x, y, z));
        lines.push(atom(++serial, ' C21', 'DPP', res, x, y, z - sign * 8));
      }
    }
  }
  return lines.join('\n');
}

describe('parseStructureBilayer', () => {
  it('reads the midplane and bulk leaflets from the phosphates, away from the protein', () => {
    const b = parseStructureBilayer(boxSystem(70, 19.5))!;
    expect(b.midplane).toBeCloseTo(70, 5);
    expect(b.bulk.upper).toBeCloseTo(19.5, 5);
    expect(b.bulk.lower).toBeCloseTo(-19.5, 5);
  });

  it('reads Martini PO4 beads and CHARMM P atoms', () => {
    expect(parseStructureBilayer(boxSystem(40, 20, 'PO4'))!.midplane).toBeCloseTo(40, 5);
    expect(parseStructureBilayer(boxSystem(40, 20, ' P'))!.midplane).toBeCloseTo(40, 5);
  });

  it('ignores the phosphate of a phosphorylated residue', () => {
    const lines = boxSystem(70, 20).split('\n');
    // Phosphoserines far above the bilayer, each with a Cα.
    for (let i = 0; i < 40; i++) {
      lines.push(atom(90000 + 2 * i, ' CA', 'SEP', 900 + i, 20 + i, 20, 130));
      lines.push(atom(90001 + 2 * i, ' P', 'SEP', 900 + i, 20 + i, 22, 131));
    }
    expect(parseStructureBilayer(lines.join('\n'))!.midplane).toBeCloseTo(70, 5);
  });

  it('returns null for a structure without lipids', () => {
    expect(parseStructureBilayer(OMF_OPM)).toBeNull();
  });

  it('reads the bilayer of a real MemProtMD at.pdb (2OMF)', () => {
    // The full file gives the same: 342 phosphates, 177 of them 20 Å clear of the protein.
    const b = parseStructureBilayer(OMF_AT)!;
    expect(b.midplane).toBeCloseTo(47.96, 2);
    expect(b.bulk.upper).toBeCloseTo(19.97, 2);
    // Within 1 Å of the distortions file's bulk for the same simulation (±20.25).
    expect(Math.abs(b.bulk.upper - 20.25)).toBeLessThan(1);
    expect(Math.abs(b.bulk.lower + 20.25)).toBeLessThan(1);
  });
});

describe('parseOpmHalfThickness', () => {
  it("reads OPM's REMARK", () => {
    expect(parseOpmHalfThickness(OMF_OPM)).toBe(12.6);
  });

  it('returns null without one', () => {
    expect(parseOpmHalfThickness(OMF_AT)).toBeNull();
  });
});

describe('resolveMembrane with the structure’s own membrane', () => {
  it('centres a box-frame structure on its bilayer and takes its bulk', () => {
    const text = boxSystem(70, 19.5);
    const calphas = helixCalphas(50, 50, 50, 90, 1);
    const m = resolveMembrane({}, null, calphas, parseStructureMembrane(text));
    expect(m.shift).toBeCloseTo(-70, 5);
    expect(m.bulk.upper).toBeCloseTo(19.5, 5);
    expect(m.annular).toEqual(m.bulk);
    expect(m.halfThickness).toBeNull();
  });

  it('puts explicit settings first', () => {
    const structure = { bilayer: { midplane: 70, bulk: { upper: 19, lower: -19 } } };
    const m = resolveMembrane({ bulk: { upper: 22 } }, null, [], structure);
    expect(m.bulk).toEqual({ upper: 22, lower: -19 });
  });

  it("exposes OPM's half-thickness, leaving the frame alone", () => {
    const m = resolveMembrane({}, null, [], parseStructureMembrane(OMF_OPM));
    expect(m.halfThickness).toBe(12.6);
    expect(m.shift).toBe(0);
    expect(m.bulk).toEqual({ upper: 20, lower: -20 });
  });

  it('lines a distortions file up on the structure’s own midplane', () => {
    // The distortions file says 55, the lipids 50: the lipids place the protein.
    const d = parseDistortions(
      syntheticDistortions({ midplane: 55, half: 20, centre: { x: 60, y: 60 }, radius: 40 }),
    );
    const calphas = helixCalphas(60, 60, 30, 70, 1);
    const structure = { bilayer: { midplane: 50, bulk: { upper: 19.5, lower: -19.5 } } };
    const m = resolveMembrane({}, d, calphas, structure);
    expect(m.shift).toBe(-50);
    expect(m.surfaces).not.toBeNull();
    // The file's bulk comes before the structure's.
    expect(m.bulk).toEqual({ upper: 20, lower: -20 });
  });
});
