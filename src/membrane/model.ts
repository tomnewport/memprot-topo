import type { MembraneDistortions } from './distortions.js';
import type { LeafletSurface } from './surface.js';
import type { LeafletPair } from './types.js';

/**
 * Bulk headgroup positions used when nothing else is given: a DPPC bilayer's
 * phosphate planes, about 40 Å apart (39–41 Å in the MemProtMD distortions
 * files for 2J1N, 2OMF, 3K19, 5G53 and 7AHL).
 */
export const DEFAULT_BULK: Readonly<LeafletPair> = { upper: 20, lower: -20 };

/**
 * |z| (Å) from the bulk midplane within which a Cα counts as membrane core:
 * when lining a structure up with a distortions file, and as part of the
 * transmembrane segments the annular leaflets follow. Matches the
 * transmembrane test's default threshold.
 */
export const MEMBRANE_CORE_HALF = 12;

/** Fewest core Cα for a candidate alignment to be judged at all. */
const MIN_CORE = 6;

/** Fewest per-residue heights for an annular position to be read off the surface. */
const MIN_ANNULAR = 3;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * How much of the membrane the diagram follows (`membrane-detail`):
 * - `bulk`: a flat band at the bulk leaflets;
 * - `annular`: bulk, and the annular leaflets under residues near the
 *   transmembrane segments;
 * - `local`: as `annular`, then the local surfaces under residues near the
 *   bilayer when a distortions file gives them. The default.
 * How near is `MEMBRANE_REACH_A` in profile.ts.
 */
export type MembraneDetail = 'bulk' | 'annular' | 'local';

export const MEMBRANE_DETAILS: readonly MembraneDetail[] = ['bulk', 'annular', 'local'];

export const DEFAULT_MEMBRANE_DETAIL: MembraneDetail = 'local';

/** Leaflet positions given explicitly; anything missing falls back. */
export interface MembraneSettings {
  bulk?: Partial<LeafletPair>;
  annular?: Partial<LeafletPair>;
}

/** The membrane a protein is drawn against, in its (shifted) frame. */
export interface Membrane {
  /** Far-field leaflet positions (Å): what the diagram shows at its edges. */
  bulk: LeafletPair;
  /** Leaflet positions next to the protein (Å). */
  annular: LeafletPair;
  /**
   * Local leaflet surfaces, when a distortions file was given and the
   * structure lines up with it; null otherwise.
   */
  surfaces: { upper: LeafletSurface; lower: LeafletSurface } | null;
  /**
   * z (Å) added to the structure's coordinates to bring it into the
   * membrane frame (bulk midplane at z = 0). 0 unless a distortions file
   * says the structure is still in the simulation-box frame.
   */
  shift: number;
}

/**
 * How to bring a structure into the frame of a distortions file, or null if
 * it doesn't share that frame. MemProtMD writes a simulation's structure and
 * distortions files in the same simulation-box frame, with the analysed
 * surface patch centred on the protein. Two placements are tried: one
 * already centred on the midplane (shift = 0), then the box frame as is
 * (shift = −midplane). A placement fits when at least 6 Cα lie within 12 Å
 * of the midplane and, on average, sit near the patch centre: within 8 Å or
 * 15 % of the patch radius, whichever is larger. A box-frame structure has
 * no Cα near z = 0, so it fails the first; a structure in another frame
 * (e.g. OPM, which centres the protein on the origin and rotates it) fails
 * both. This tells frames apart; it does not fine-tune a small xy offset.
 */
export function alignToDistortions(calphas: Point3[], d: MembraneDistortions): number | null {
  const tolerance = Math.max(8, 0.15 * d.radius);
  for (const shift of [0, -d.midplane]) {
    let n = 0;
    let sx = 0;
    let sy = 0;
    for (const c of calphas) {
      if (Math.abs(c.z + shift) >= MEMBRANE_CORE_HALF) continue;
      n++;
      sx += c.x;
      sy += c.y;
    }
    if (n < MIN_CORE) continue;
    if (Math.hypot(sx / n - d.centre.x, sy / n - d.centre.y) <= tolerance) return shift;
  }
  return null;
}

/**
 * Mean height of each local surface under the residues that sit between the
 * bulk leaflets — the membrane right next to the protein.
 */
function annularFromSurfaces(
  calphas: Point3[],
  shift: number,
  bulk: LeafletPair,
  surfaces: NonNullable<Membrane['surfaces']>,
): Partial<LeafletPair> {
  const sums = { upper: 0, lower: 0 };
  const counts = { upper: 0, lower: 0 };
  for (const c of calphas) {
    const z = c.z + shift;
    if (z <= bulk.lower || z >= bulk.upper) continue;
    for (const leaf of ['upper', 'lower'] as const) {
      const h = surfaces[leaf].heightAt(c.x, c.y);
      if (h === null) continue;
      sums[leaf] += h;
      counts[leaf]++;
    }
  }
  const out: Partial<LeafletPair> = {};
  for (const leaf of ['upper', 'lower'] as const) {
    if (counts[leaf] >= MIN_ANNULAR) out[leaf] = sums[leaf] / counts[leaf];
  }
  return out;
}

/**
 * Settle the membrane for a structure. Each leaflet position comes from, in
 * order: the explicit setting, the distortions file, the default. Bulk
 * defaults to {@link DEFAULT_BULK}; annular defaults to the bulk. With a
 * distortions file the structure is lined up with it (see
 * {@link alignToDistortions}); if it lines up, the annular positions are the
 * mean local surface under its membrane-spanning residues and the local
 * surfaces are kept, otherwise only the file's bulk positions are used.
 *
 * @param calphas every Cα of the structure, in its input frame.
 */
export function resolveMembrane(
  settings: MembraneSettings,
  distortions: MembraneDistortions | null,
  calphas: Point3[],
): Membrane {
  const shift = distortions ? alignToDistortions(calphas, distortions) : null;
  const fileBulk = distortions?.bulk;
  const bulk: LeafletPair = {
    upper: settings.bulk?.upper ?? fileBulk?.upper ?? DEFAULT_BULK.upper,
    lower: settings.bulk?.lower ?? fileBulk?.lower ?? DEFAULT_BULK.lower,
  };
  const surfaces =
    distortions && shift !== null ? { upper: distortions.upper, lower: distortions.lower } : null;
  const fromSurface = surfaces ? annularFromSurfaces(calphas, shift ?? 0, bulk, surfaces) : {};
  const annular: LeafletPair = {
    upper: settings.annular?.upper ?? fromSurface.upper ?? bulk.upper,
    lower: settings.annular?.lower ?? fromSurface.lower ?? bulk.lower,
  };
  return { bulk, annular, surfaces, shift: shift ?? 0 };
}

/**
 * `membrane` as drawn at `detail`: `annular` drops the local surfaces;
 * `bulk` drops them too and puts the annular leaflets at the bulk ones. The
 * shift is kept, so the structure stays where the distortions file put it.
 */
export function membraneAtDetail(membrane: Membrane, detail: MembraneDetail): Membrane {
  if (detail === 'local') return membrane;
  return {
    ...membrane,
    annular: detail === 'bulk' ? { ...membrane.bulk } : membrane.annular,
    surfaces: null,
  };
}
