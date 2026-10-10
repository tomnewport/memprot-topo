import type { Theme } from '../theme/index.js';
import type { MorphScene, MorphStyle } from '../morph/types.js';
import type { Membrane } from '../membrane/index.js';
import { FADED_OPACITY, LABEL, LOOP, PLOT, SS_BODY } from './constants.js';
import type { ChainLayout } from './chain-layout.js';

export type MorphThemeStyle = Pick<
  MorphStyle,
  | 'selectionWidthScale'
  | 'unselectedSaturation'
  | 'helixFill'
  | 'helixStroke'
  | 'strandFill'
  | 'strandStroke'
  | 'coil'
  | 'membraneFill'
  | 'membraneEdge'
  | 'membraneThinned'
  | 'membraneThickened'
  | 'midplane'
  | 'contact'
  | 'background'
  | 'labelFill'
  | 'labelFontFamily'
>;

/** The 3-D morph's colours from a theme: its shading is built from the same tokens. */
export function morphColours(theme: Theme): MorphThemeStyle {
  return {
    helixFill: theme.helix,
    helixStroke: theme.helixEdge,
    strandFill: theme.strand,
    strandStroke: theme.strandEdge,
    coil: theme.loop,
    membraneFill: theme.membrane,
    membraneEdge: theme.membraneEdge,
    membraneThinned: theme.membraneThinned,
    membraneThickened: theme.membraneThickened,
    midplane: theme.midplane,
    contact: theme.contact,
    background: theme.background,
    labelFill: theme.label,
    labelFontFamily: theme.fontFamily,
    selectionWidthScale: theme.selectionWidth / theme.outlineWidth,
    unselectedSaturation: theme.unselectedSaturation,
  };
}

/**
 * The 3-D view's scene for a laid-out chain: the same elements, loops and
 * labels as the 2-D picture, with the real 3-D geometry behind them, so the
 * morph starts from exactly the 2-D picture. Null when the chain lacks 3-D
 * positions. `surfaces` are the membrane's local leaflet surfaces, if any.
 */
export function build3d(
  layout: ChainLayout,
  theme: Theme,
  surfaces: Membrane['surfaces'] = null,
): MorphScene | null {
  if (!layout.morphable) return null;
  const { profile, bulk, annular } = layout.membrane;
  return {
    mode: layout.mode,
    segments: layout.segments.map((seg) => ({
      display: seg.samples,
      positions: seg.positions ?? [],
      unwrapArc: seg.unwrapArc,
      cylinder: seg.cylinder,
    })),
    elements: layout.elements.map((e) => ({
      type: e.type,
      seg: e.seg,
      start: e.start,
      end: e.end,
      withArrow: e.withArrow,
      faded: e.faded,
      order: e.order,
      selectable: e.selectable,
    })),
    loops: layout.loops.map((l) => ({
      points: l.points.map((p) => ({ arc: p.arc, z: p.z })),
      discontinuous: l.discontinuous,
      faded: l.faded,
      from: l.from,
      to: l.to,
      seg: l.seg,
      order: l.order,
      residues: l.residues,
      selectable: l.selectable,
    })),
    labels: layout.labels.map((l) => ({
      seg: l.seg,
      sample: l.sample,
      text: l.text,
      isStart: l.isStart,
    })),
    ties: (layout.ties ?? []).map((t) => ({
      a: { seg: t.a.seg, sample: t.a.sample, z: t.a.z },
      b: { seg: t.b.seg, sample: t.b.sample, z: t.b.z },
    })),
    slab: {
      x0: profile.x[0],
      x1: profile.x[profile.x.length - 1],
      upper: bulk.upper,
      lower: bulk.lower,
      profile,
      annular,
      surface: surfaces
        ? {
            upper: (x, y, radius) => surfaces.upper.heightAt(x, y, radius),
            lower: (x, y, radius) => surfaces.lower.heightAt(x, y, radius),
          }
        : undefined,
    },
    frame: { ...layout.frame },
    gapA: LOOP.elementGapPx / PLOT.arcPxPerA,
    style: {
      ...morphColours(theme),
      labelFontSize: LABEL.fontSizePx,
      labelGap: LABEL.gapPx,
      labelTangentStep: LABEL.tangentStepSamples,
      halfWidthPx: SS_BODY.halfWidthPx,
      arrowHalfWidthPx: SS_BODY.arrowHalfWidthPx,
      arrowLengthPx: SS_BODY.arrowLengthPx,
      fadedOpacity: FADED_OPACITY,
    },
  };
}
