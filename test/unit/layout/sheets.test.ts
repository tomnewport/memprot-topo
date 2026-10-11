// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ChainData } from '../../../src/types.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { resolveMembrane } from '../../../src/membrane/index.js';
import { getTheme } from '../../../src/theme/index.js';
import {
  build3d,
  layoutChain,
  BARREL,
  SS_BODY,
  PLOT,
  type ChainLayout,
} from '../../../src/layout/index.js';
import { findSheets, projectToSheet } from '../../../src/layout/sheets.js';
import { buildView3DModel } from '../../../src/view3d/model.js';
import { computePose } from '../../../src/view3d/curtain.js';
import { helixAndSheetChain } from '../fixtures/sheet.js';
import { threeHelixChain } from '../fixtures/helices.js';

function layoutOf(chain: ChainData, showContacts = false): ChainLayout {
  return layoutChain(
    chain,
    { showPoints: false, extremePoints: true, extremeThreshold: 0.2 },
    analyseBarrel(chain.calphas, chain.segments),
    showContacts,
    resolveMembrane({}, null, []),
    chain.calphas.filter((c) => Math.abs(c.z) < 12),
  );
}

/** Unit 2-D direction of an element, first sample to last. */
function direction(layout: ChainLayout, i: number): { x: number; y: number } {
  const c = layout.elements[i].centreline;
  const dx = c[c.length - 1].sx - c[0].sx;
  const dy = c[c.length - 1].sy - c[0].sy;
  const l = Math.hypot(dx, dy);
  return { x: dx / l, y: dy / l };
}

describe('findSheets', () => {
  it('finds one sheet of three strands with the normal of its plane', () => {
    for (const [plane, axis] of [
      ['flat', 'z'],
      ['upright', 'y'],
    ] as const) {
      const chain = helixAndSheetChain({ plane });
      const sheets = findSheets(analyseBarrel(chain.calphas, chain.segments));
      expect(sheets).toHaveLength(1);
      expect(sheets[0].strands.map((s) => s.start)).toEqual([30, 39, 48]);
      expect(Math.abs(sheets[0].normal[axis])).toBeCloseTo(1, 3);
      for (const s of sheets[0].strands) expect(Math.abs(s.normal[axis])).toBeCloseTo(1, 3);
      // Flat sheets are drawn face-on; upright ones at their real height.
      expect(sheets[0].up === null).toBe(plane === 'upright');
    }
  });

  it('finds none in a helical chain', () => {
    const chain = threeHelixChain();
    expect(findSheets(analyseBarrel(chain.calphas, chain.segments))).toEqual([]);
  });

  it('keeps real heights for an upright sheet and enters it from the left', () => {
    const chain = helixAndSheetChain({ plane: 'upright' });
    const [sheet] = findSheets(analyseBarrel(chain.calphas, chain.segments));
    const p = chain.calphas.find((c) => c.resSeq === 33)!;
    expect(projectToSheet(sheet, p).z).toBe(p.z);
    const u = (resSeq: number) =>
      projectToSheet(sheet, chain.calphas.find((c) => c.resSeq === resSeq)!).u;
    expect(u(33)).toBeLessThan(u(51));
  });
});

describe('open sheets in the 2-D layout (issue #54)', () => {
  for (const plane of ['flat', 'upright'] as const) {
    it(`draws a ${plane} sheet's strands as parallel arrows, packed like barrel strands`, () => {
      const layout = layoutOf(helixAndSheetChain({ plane }));
      expect(layout.mode).toBe('polyline');
      const strands = layout.elements
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.type === 'strand');
      expect(strands).toHaveLength(3);
      expect(strands.every(({ e }) => e.withArrow && e.sheetNormal)).toBe(true);
      const [a, b, c] = strands.map(({ i }) => direction(layout, i));
      // Antiparallel neighbours: parallel bars pointing opposite ways.
      expect(a.x * b.x + a.y * b.y).toBeCloseTo(-1, 2);
      expect(a.x * c.x + a.y * c.y).toBeCloseTo(1, 2);
      // Neighbouring strands sit the barrel packing distance apart, left to right.
      const centre = (i: number) => {
        const cl = layout.elements[i].centreline;
        return cl.reduce((s, p) => s + p.sx, 0) / cl.length;
      };
      const gaps = [
        centre(strands[1].i) - centre(strands[0].i),
        centre(strands[2].i) - centre(strands[1].i),
      ];
      const target = BARREL.minStrandWidths * SS_BODY.halfWidthPx * 2;
      for (const g of gaps) {
        expect(g).toBeGreaterThanOrEqual(target - 1e-6);
        expect(g).toBeLessThan(3 * target);
      }
    });
  }

  it('keeps an upright sheet at its real height', () => {
    const chain = helixAndSheetChain({ plane: 'upright' });
    const layout = layoutOf(chain);
    const el = layout.elements.find((e) => e.type === 'strand')!;
    const z = chain.calphas.find((c) => c.resSeq === 30)!.z * PLOT.zPxPerA;
    expect(Math.abs(-el.centreline[0].sy - z)).toBeLessThan(2.5);
  });

  it('ties the sheet contacts when asked for', () => {
    const chain = helixAndSheetChain({ plane: 'upright' });
    expect(layoutOf(chain).ties).toBeNull();
    expect(layoutOf(chain, true).ties!.length).toBeGreaterThan(0);
  });

  it('leaves helical chains as they were', () => {
    const layout = layoutOf(threeHelixChain());
    expect(layout.elements.every((e) => e.sheetNormal === undefined)).toBe(true);
  });
});

describe('open sheets in the 3-D view (issue #54)', () => {
  it("carries each strand's sheet normal, in the rolled-up path's frame", () => {
    const layout = layoutOf(helixAndSheetChain({ plane: 'flat' }));
    const model = buildView3DModel(build3d(layout, getTheme('light'))!);
    const strands = model.elements.filter((e) => e.type === 'strand');
    expect(strands.every((e) => e.sheetLocal)).toBe(true);
    // A flat sheet's normal is the membrane normal, whatever the path's heading.
    for (const e of strands) {
      for (let k = 0; k < e.sheetLocal!.length; k += 3) {
        expect(Math.abs(e.sheetLocal![k + 2])).toBeCloseTo(1, 2);
      }
    }
  });

  it('starts from the 2-D picture though strands run right to left', () => {
    const layout = layoutOf(helixAndSheetChain({ plane: 'upright' }));
    const model = buildView3DModel(build3d(layout, getTheme('light'))!);
    const pose = computePose(model, 0, 0);
    const x0 = pose.w[0] - model.ud[0];
    for (const e of model.elements) {
      for (let g = e.g0; g <= e.g1; g++) {
        expect(pose.w[g * 4] - model.ud[g]).toBeCloseTo(x0, 6);
        expect(pose.w[g * 4 + 2]).toBeCloseTo(model.zd[g], 6);
      }
    }
  });
});
