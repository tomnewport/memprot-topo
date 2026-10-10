import type { MembraneDistortions } from './distortions.js';
import type { StructureMembrane } from './structure.js';
import type { LeafletSurface } from './surface.js';
import type { LeafletPair } from './types.js';

/**
 * Bulk headgroup positions used when nothing else is given: a DPPC bilayer's
 * phosphate planes, about 40 Å apart (39–41 Å in the MemProtMD distortions
 * files for 2J1N, 2OMF, 3K19, 5G53 and 7AHL).
 */
export const DEFAULT_BULK: Readonly<LeafletPair> = { upper: 20, lower: -20 };

/**
 * Depth (Å) below each bulk leaflet at which the membrane core starts: 8 Å,
 * so the 40 Å default bilayer has its core within ±12 Å of the midplane.
 */
export const MEMBRANE_CORE_INSET = 8;

/**
 * The membrane core between `bulk` leaflets: z (Å) of its upper and lower
 * edges, each {@link MEMBRANE_CORE_INSET} inside its own leaflet, so an
 * asymmetric bilayer gets an asymmetric core. In a bilayer too thin to have
 * one, both edges sit at the midpoint of the leaflets. A Cα strictly between
 * the edges is in the core: when lining a structure up with a distortions
 * file, and as part of the transmembrane segments the annular leaflets
 * follow. A chain that reaches both edges is transmembrane
 * (`isTransmembrane`).
 */
export function membraneCore(bulk: LeafletPair): LeafletPair {
  const mid = (bulk.upper + bulk.lower) / 2;
  return {
    upper: Math.max(mid, bulk.upper - MEMBRANE_CORE_INSET),
    lower: Math.min(mid, bulk.lower + MEMBRANE_CORE_INSET),
  };
}

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
   * membrane frame (bulk midplane at z = 0). 0 unless a distortions file or
   * the structure's own lipids say it is still in the simulation-box frame.
   */
  shift: number;
  /**
   * OPM's hydrophobic half-thickness (Å) when the structure file gives it;
   * null otherwise. Reported, not drawn.
   */
  halfThickness: number | null;
}

/**
 * How to bring a structure into the frame of a distortions file, or null if
 * it doesn't share that frame. MemProtMD writes a simulation's structure and
 * distortions files in the same simulation-box frame, with the analysed
 * surface patch centred on the protein. Two placements are tried: one
 * already centred on the midplane (shift = 0), then the box frame as is
 * (shift = −midplane). A placement fits when at least 6 Cα lie in the core
 * of the file's bulk bilayer ({@link membraneCore}) and, on average, sit near the patch centre: within 8 Å or
 * 15 % of the patch radius, whichever is larger. A box-frame structure has
 * no Cα near z = 0, so it fails the first; a structure in another frame
 * (e.g. OPM, which centres the protein on the origin and rotates it) fails
 * both. This tells frames apart; it does not fine-tune a small xy offset.
 * `shifts` replaces the two placements tried.
 */
export function alignToDistortions(
  calphas: Point3[],
  d: MembraneDistortions,
  shifts: readonly number[] = [0, -d.midplane],
): number | null {
  const tolerance = Math.max(8, 0.15 * d.radius);
  const core = membraneCore(d.bulk);
  for (const shift of shifts) {
    let n = 0;
    let sx = 0;
    let sy = 0;
    for (const c of calphas) {
      const z = c.z + shift;
      if (z <= core.lower || z >= core.upper) continue;
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
 * order: the explicit setting, the distortions file, the bilayer in the
 * structure file itself (`structure.bilayer`, MemProtMD's lipids), the
 * default. Bulk defaults to {@link DEFAULT_BULK}; annular defaults to the
 * bulk. With a distortions file the structure is lined up with it (see
 * {@link alignToDistortions}); if it lines up, the annular positions are the
 * mean local surface under its membrane-spanning residues and the local
 * surfaces are kept, otherwise only the file's bulk positions are used.
 * A structure that carries its bilayer is shifted onto that bilayer's
 * midplane, and only that placement is tried against a distortions file:
 * MemProtMD's distortions files share the xy of the simulation's structure
 * files but not always their z (the midplanes differ by up to 13 Å), so the
 * lipids in the structure file are the better guide to where it sits.
 *
 * @param calphas every Cα of the structure, in its input frame.
 * @param structure what the structure file says about its membrane.
 */
export function resolveMembrane(
  settings: MembraneSettings,
  distortions: MembraneDistortions | null,
  calphas: Point3[],
  structure: StructureMembrane | null = null,
): Membrane {
  const own = structure?.bilayer ?? null;
  const aligned = distortions
    ? alignToDistortions(calphas, distortions, own ? [-own.midplane] : undefined)
    : null;
  const shift = aligned ?? (own ? -own.midplane : 0);
  const fileBulk = distortions?.bulk;
  const bulk: LeafletPair = {
    upper: settings.bulk?.upper ?? fileBulk?.upper ?? own?.bulk.upper ?? DEFAULT_BULK.upper,
    lower: settings.bulk?.lower ?? fileBulk?.lower ?? own?.bulk.lower ?? DEFAULT_BULK.lower,
  };
  const surfaces =
    distortions && aligned !== null ? { upper: distortions.upper, lower: distortions.lower } : null;
  const fromSurface = surfaces ? annularFromSurfaces(calphas, shift, bulk, surfaces) : {};
  const annular: LeafletPair = {
    upper: settings.annular?.upper ?? fromSurface.upper ?? bulk.upper,
    lower: settings.annular?.lower ?? fromSurface.lower ?? bulk.lower,
  };
  return { bulk, annular, surfaces, shift, halfThickness: structure?.halfThickness ?? null };
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
