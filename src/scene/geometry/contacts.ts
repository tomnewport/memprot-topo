/**
 * Pure β-sheet contact-tie geometry (issue #22, Phase 1).
 *
 * Extracted from the SVG renderer's `drawContacts`: given the barrel analysis and
 * the laid-out segments, resolve the endpoint pairs (in display `(arc, z)` Å) for
 * the ties drawn between paired barrel-wall strands. Both renderers consume these.
 */
import type { BarrelAnalysis } from '../../contacts/index.js';

export interface ContactEndpoint {
  resSeq: number;
  arc: number;
  z: number;
}

export interface ContactLine {
  a: ContactEndpoint;
  b: ContactEndpoint;
}

/** Minimal layout shape the contact resolver needs. */
export interface ContactLayout {
  residues: { resSeq: number; arc: number; z: number }[];
}

/**
 * Resolve contact ties between barrel-wall (ring) strands. Only pairings where
 * both strands are in the ring are tied; ties to inside-barrel strands (rendered
 * as coil near the axis) are skipped, matching the SVG renderer.
 */
export function contactLines(analysis: BarrelAnalysis, layouts: ContactLayout[]): ContactLine[] {
  const pos = new Map<number, { arc: number; z: number }>();
  for (const layout of layouts) {
    for (const r of layout.residues) pos.set(r.resSeq, { arc: r.arc, z: r.z });
  }
  const ring = new Set(analysis.ringOrder);
  const lines: ContactLine[] = [];
  for (const pairing of analysis.pairings) {
    if (!ring.has(pairing.a) || !ring.has(pairing.b)) continue;
    for (const c of pairing.contacts) {
      const a = pos.get(c.aResSeq);
      const b = pos.get(c.bResSeq);
      if (!a || !b) continue;
      lines.push({
        a: { resSeq: c.aResSeq, arc: a.arc, z: a.z },
        b: { resSeq: c.bResSeq, arc: b.arc, z: b.z },
      });
    }
  }
  return lines;
}
