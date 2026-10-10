import type { SeqLane, SeqResidue } from '../sequence/types.js';
import { parseResidueKey, residueKey, type ResidueKey } from '../residue-key.js';
import { interpolateStops, parseColour } from './residue-data.js';

/**
 * A data series for the sequence view (see `TopologyDisplay.sequenceTracks`),
 * drawn as a colour strip.
 */
export interface SequenceTrack {
  /** Shown beside the strip. */
  label?: string;
  /**
   * Values keyed by chain ID, then residue number, with the insertion code
   * where a residue has one (`100A`): numbers are coloured on the scale,
   * strings are taken as CSS colours.
   */
  values: Record<string, Record<string | number, number | string>>;
  /** Colour stops, low → high; the theme's data scale by default. */
  scale?: string[];
  /** Value range; by default the data's. */
  domain?: [number, number];
}

/**
 * Colour strips of the sequence view for `chainId`: `colour` (the residue
 * colouring, labelled `colourLabel`) when there is one, then each of
 * `tracks` with values for the chain, on its own scale or `dataScale`.
 */
export function sequenceLanes(
  chainId: string,
  residues: SeqResidue[],
  colour: ((key: ResidueKey) => string | undefined) | null | undefined,
  colourLabel: string,
  tracks: SequenceTrack[],
  dataScale: readonly string[],
): SeqLane[] {
  const lanes: SeqLane[] = [];
  if (colour) {
    lanes.push({
      label: colourLabel,
      colourAt: (i) => colour(residueKey(residues[i])),
    });
  }
  for (const track of tracks) {
    const given = track.values?.[chainId];
    if (!given) continue;
    const values = new Map<ResidueKey, number | string>();
    for (const [k, v] of Object.entries(given)) {
      const key = parseResidueKey(k);
      if (key !== null) values.set(key, v);
    }
    const valueAt = (i: number) => values.get(residueKey(residues[i]));
    const nums = residues
      .map((_, i) => valueAt(i))
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const [lo, hi] = track.domain ?? [Math.min(...nums), Math.max(...nums)];
    const stops = (track.scale ?? dataScale)
      .map(parseColour)
      .filter((c): c is NonNullable<typeof c> => c !== null);
    lanes.push({
      label: track.label ?? 'Data',
      colourAt: (i) => {
        const v = valueAt(i);
        if (typeof v === 'string') return v;
        if (typeof v !== 'number' || !Number.isFinite(v) || stops.length === 0) return undefined;
        return interpolateStops(stops, hi > lo ? (v - lo) / (hi - lo) : 0.5);
      },
    });
  }
  return lanes;
}
