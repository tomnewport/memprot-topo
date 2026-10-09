import { LeafletSurface } from './surface.js';
import type { LeafletPair } from './types.js';

/**
 * A MemProtMD bilayer-distortions file, parsed. Surfaces and bulk positions
 * are relative to the bulk midplane, so z = 0 is the midplane; x and y are
 * left in the file's own frame, which is the frame of the simulation's
 * structure files. See docs/membrane.md for the format.
 */
export interface MembraneDistortions {
  /** z of the bulk midplane in the file's own frame (Å). */
  midplane: number;
  /** Bulk leaflet positions relative to the midplane (Å). */
  bulk: LeafletPair;
  /** xy centre of the analysed patch (the centroid of its outer rim). */
  centre: { x: number; y: number };
  /** Radius of the analysed patch (median outer-rim distance from the centre, Å). */
  radius: number;
  upper: LeafletSurface;
  lower: LeafletSurface;
}

/** B-factor magnitude the file clamps displacements to (Å). */
const CLAMP = 10;

/**
 * Spread (median absolute deviation, Å) above which the B-factor column is
 * not read as a displacement from one flat reference plane.
 */
const REFERENCE_MAD = 0.5;

/** Minimum outer-rim points for the rim to be used. */
const MIN_RIM = 10;

interface RawPoint {
  x: number;
  y: number;
  z: number;
  b: number;
  rim: string;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Bulk z of one leaflet in the file's frame. The B-factor is that leaflet's
 * displacement from a flat bulk reference plane, positive where the bilayer
 * is thicker: z − B on the upper leaflet and z + B on the lower one recover
 * the plane. Points clamped at ±10 Å are skipped. If the column doesn't hold
 * such a displacement, falls back to the outer rim (the far field), then to
 * the median of the whole leaflet.
 */
function bulkLevel(points: RawPoint[], sign: 1 | -1): number {
  const refs = points
    .filter((p) => Number.isFinite(p.b) && Math.abs(p.b) < CLAMP - 0.01)
    .map((p) => p.z - sign * p.b);
  if (refs.length > 0) {
    const ref = median(refs);
    if (median(refs.map((r) => Math.abs(r - ref))) < REFERENCE_MAD) return ref;
  }
  const rim = points.filter((p) => p.rim === 'O');
  return median((rim.length >= MIN_RIM ? rim : points).map((p) => p.z));
}

/**
 * Parse a MemProtMD `*-distortions.pdb` file. Each ATOM record is a point on
 * a leaflet's headgroup surface: the residue name's first letter is the
 * leaflet (`U` upper, `L` lower), its second the point's place on the
 * surface mesh (`O` outer rim, `I` the rim of a hole, `M` elsewhere). The
 * `LCC`/`UCC` records are colour-scale anchors and are skipped.
 *
 * @throws if either leaflet has no points.
 */
export function parseDistortions(text: string): MembraneDistortions {
  const leaflets: Record<'U' | 'L', RawPoint[]> = { U: [], L: [] };
  for (const line of text.split('\n')) {
    if (line.length < 54) continue;
    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;
    const resName = line.slice(17, 20).trim();
    const leaf = resName[0];
    if ((leaf !== 'U' && leaf !== 'L') || resName.endsWith('CC')) continue;
    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    const b = Number.parseFloat(line.slice(60, 66));
    leaflets[leaf].push({ x, y, z, b, rim: resName[1] ?? '' });
  }
  if (leaflets.U.length === 0 || leaflets.L.length === 0) {
    throw new Error('Distortions file needs points on both leaflets (U… and L… residues)');
  }

  const upperZ = bulkLevel(leaflets.U, 1);
  const lowerZ = bulkLevel(leaflets.L, -1);
  const midplane = (upperZ + lowerZ) / 2;

  const rim = [...leaflets.U, ...leaflets.L].filter((p) => p.rim === 'O');
  const ring = rim.length >= MIN_RIM ? rim : [...leaflets.U, ...leaflets.L];
  let cx = 0;
  let cy = 0;
  for (const p of ring) {
    cx += p.x;
    cy += p.y;
  }
  cx /= ring.length;
  cy /= ring.length;
  const radius = median(ring.map((p) => Math.hypot(p.x - cx, p.y - cy)));

  const recentre = (points: RawPoint[]) =>
    new LeafletSurface(points.map((p) => ({ x: p.x, y: p.y, z: p.z - midplane })));

  return {
    midplane,
    bulk: { upper: upperZ - midplane, lower: lowerZ - midplane },
    centre: { x: cx, y: cy },
    radius,
    upper: recentre(leaflets.U),
    lower: recentre(leaflets.L),
  };
}
