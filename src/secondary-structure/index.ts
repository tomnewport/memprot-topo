import type { BetaLadder } from '../types.js';
import type { BackboneChain, RawChain, RawSSSegment } from '../parser/types.js';
import { computeDssp, dsspSegments, type DsspSegmentOptions } from './dssp.js';

export {
  computeDssp,
  dsspSegments,
  type DsspCode,
  type DsspResidue,
  type DsspResult,
  type DsspSegmentOptions,
} from './dssp.js';

/**
 * Secondary structure and β-ladders computed with DSSP on a structure's own
 * backbone, numbered as `chains` number its Cα: `chains` lists the same
 * residues in the same order (as `parsePdb`, or `mapToDeposited` after it,
 * gives them), so a MemProtMD structure can be computed on and still be
 * drawn in the deposited numbering. Null when the backbone doesn't line up
 * with `chains`, or fewer than half its residues have N, Cα, C and O (a
 * Cα-only file).
 */
export function structureSecondaryStructure(
  backbone: readonly BackboneChain[],
  chains: readonly RawChain[],
  options: DsspSegmentOptions = {},
): { segments: RawSSSegment[]; ladders: BetaLadder[] } | null {
  const names = chains.flatMap((c) =>
    c.calphas.map((ca) => ({ chainId: c.chainId, resSeq: ca.resSeq, iCode: ca.iCode })),
  );
  const residues = backbone.flatMap((c) => c.residues);
  if (residues.length !== names.length || residues.length === 0) return null;
  const complete = residues.filter((r) => r.n && r.ca && r.c && r.o).length;
  if (complete < residues.length / 2) return null;

  // Regroup the backbone under the chains' names and numbers.
  const renamed: BackboneChain[] = [];
  residues.forEach((r, k) => {
    const name = names[k];
    let chain = renamed[renamed.length - 1];
    if (!chain || chain.chainId !== name.chainId) {
      chain = { chainId: name.chainId, residues: [] };
      renamed.push(chain);
    }
    chain.residues.push({ ...r, resSeq: name.resSeq, iCode: name.iCode });
  });
  const dssp = computeDssp(renamed);
  return { segments: dsspSegments(dssp.residues, options), ladders: dssp.ladders };
}
