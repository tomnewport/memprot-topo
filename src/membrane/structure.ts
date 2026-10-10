import type { LeafletPair } from './types.js';

/**
 * The bilayer a structure file carries with it: MemProtMD's `at.pdb` holds
 * the simulated lipids as well as the protein, in the simulation-box frame,
 * whose z axis is the membrane normal.
 */
export interface StructureBilayer {
  /** z of the bulk midplane in the file's own frame (Å). */
  midplane: number;
  /** Bulk leaflet (phosphate) positions relative to the midplane (Å). */
  bulk: LeafletPair;
}

/** What a structure file says about its membrane. */
export interface StructureMembrane {
  /** The bilayer read from the file's lipids (MemProtMD), if it has any. */
  bilayer?: StructureBilayer | null;
  /**
   * OPM's hydrophobic half-thickness (Å), from its
   * `REMARK 1/2 of bilayer thickness` line: the hydrophobic boundary, not the
   * headgroup surface the diagram draws.
   */
  halfThickness?: number | null;
}

/**
 * Phosphate atom names: `P` (CHARMM, Slipids), `P8` (MemProtMD's atomistic
 * DPPC), `PO4` (Martini).
 */
const PHOSPHATE = /^(P\d*|PO4)$/;

/** Fewest phosphates per leaflet for a bilayer to be read. */
const MIN_PER_LEAFLET = 10;

/**
 * Phosphates closer than this (Å, in the membrane plane) to any Cα are left
 * out of the bulk, which the protein bends near it.
 */
const ANNULUS = 20;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Leaflet levels of a set of phosphate z, split about their own midplane. */
function leaflets(zs: number[]): LeafletPair | null {
  let mid = median(zs);
  let pair: LeafletPair | null = null;
  // Start from the median z and settle on the midpoint of the two leaflets'
  // medians, so unequal leaflet counts don't bias the split.
  for (let i = 0; i < 10; i++) {
    const upper = zs.filter((z) => z > mid);
    const lower = zs.filter((z) => z <= mid);
    if (upper.length < MIN_PER_LEAFLET || lower.length < MIN_PER_LEAFLET) return null;
    pair = { upper: median(upper), lower: median(lower) };
    const next = (pair.upper + pair.lower) / 2;
    if (Math.abs(next - mid) < 1e-6) break;
    mid = next;
  }
  return pair;
}

/**
 * Read the bilayer from the lipids in a PDB file, as MemProtMD's `at.pdb`
 * has them: the bulk leaflets are the median z of the phosphates above and
 * below the midplane, and the midplane is halfway between. Phosphates within
 * 20 Å of the protein in the membrane plane are left out, unless that leaves
 * fewer than 10 in a leaflet. A residue with a Cα (a phosphorylated amino
 * acid) is not a lipid. Assumes z is the membrane normal, as in a
 * simulation box.
 *
 * @returns null when the file has fewer than 10 phosphates in either leaflet.
 */
export function parseStructureBilayer(text: string): StructureBilayer | null {
  const phosphates: { residue: string; x: number; y: number; z: number }[] = [];
  const withCalpha = new Set<string>();
  const calphas: { x: number; y: number }[] = [];
  for (const line of text.split('\n')) {
    if (line.length < 54) continue;
    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;
    const atom = line.slice(12, 16);
    const isCalpha = atom === ' CA ';
    if (!isCalpha && !PHOSPHATE.test(atom.trim())) continue;
    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    // Residue name, chain and number: one key per residue.
    const residue = line.slice(17, 27);
    if (isCalpha) {
      withCalpha.add(residue);
      calphas.push({ x, y });
    } else {
      phosphates.push({ residue, x, y, z });
    }
  }
  const lipids = phosphates.filter((p) => !withCalpha.has(p.residue));
  if (lipids.length < 2 * MIN_PER_LEAFLET) return null;

  const r2 = ANNULUS * ANNULUS;
  const far = lipids.filter((p) => calphas.every((c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 > r2));
  const pair = leaflets(far.map((p) => p.z)) ?? leaflets(lipids.map((p) => p.z));
  if (!pair) return null;
  const midplane = (pair.upper + pair.lower) / 2;
  return { midplane, bulk: { upper: pair.upper - midplane, lower: pair.lower - midplane } };
}

/**
 * OPM's hydrophobic half-thickness (Å) from a PDB file's
 * `REMARK      1/2 of bilayer thickness:   12.6` line, or null if it has none.
 */
export function parseOpmHalfThickness(text: string): number | null {
  const match = /^REMARK\s+1\/2 of bilayer thickness:\s*(-?\d+(?:\.\d+)?)/m.exec(text);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** What a PDB file says about its membrane: its lipids and any OPM remark. */
export function parseStructureMembrane(text: string): StructureMembrane {
  return { bilayer: parseStructureBilayer(text), halfThickness: parseOpmHalfThickness(text) };
}
