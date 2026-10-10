/**
 * Geometry constants of the 2-D topology diagram, shared by the layout stage
 * and the views built from it.
 */

export const PLOT = {
  width: 1200,
  // Top/bottom/right padded enough for residue-number labels that sit just
  // past the membrane-facing tips of helix/strand polygons.
  margin: { top: 36, right: 40, bottom: 36, left: 40 },
  /** Maximum |z| (Å) shown on the y-axis — auto-expands if data exceeds. */
  zRangeMin: 25,
  /**
   * Å per pixel on the x-axis (arc length).  Set equal to `zPxPerA` for a
   * 1:1 aspect ratio so that tilt angles in the 2-D plot faithfully match
   * the true 3-D tilt.  The previous 1.6/4 ratio produced 2.5× vertical
   * exaggeration that inflated apparent helix angles once the unroller
   * started reporting geometrically accurate arc lengths.
   */
  arcPxPerA: 2.5,
  /** Å per pixel on the y-axis (real z).  Equal to arcPxPerA for 1:1 aspect ratio. */
  zPxPerA: 2.5,
};

export const LOOP = {
  /**
   * Fixed horizontal distance (screen px) between adjacent SS elements, measured
   * centre-of-path to centre-of-path (end of the previous element to the start
   * of the next).  SS elements are repositioned so every inter-element gap is
   * exactly this wide, regardless of the loop's real arc length.
   */
  elementGapPx: 30,
  /**
   * Distance (screen px) to follow each element's end/start tangent when placing
   * the loop's tangent control points (points 2 and 6 in the sequence).
   */
  tangentMagPx: 10,
  /**
   * If the loop's vertical extreme lies more than this fraction of the
   * tangent-points' z-range beyond that range, two extra control points are
   * placed at the extreme to pull the curve out to the real excursion.
   */
  extremeThreshold: 0.2,
  /** Horizontal spacing (screen px) between the two vertical-extreme points. */
  extremeSpacingPx: 5,
};

export const BARREL = {
  /**
   * Target closest distance between two adjacent SS elements, expressed in
   * strand widths. Each element keeps its true tilt; the next element is slid in
   * until the shortest centreline-to-centreline distance to the previously
   * placed elements hits this target, so neighbours sit a fixed clearance apart
   * however they tilt. The same value is the minimum centre-to-centre spacing
   * used to keep elements ordered left to right.
   */
  minStrandWidths: 2,
  /**
   * Loop span (strand widths) from a barrel element's C-terminus to the next
   * non-barrel element's start at a transition — i.e. how long the connecting
   * loop is. Measured from where the loop actually leaves, then the element is
   * nudged further only if it would otherwise crowd something.
   */
  transitionGapWidths: 4,
  /**
   * Tangent-handle length (screen px) for barrel hairpin loops. Long enough that
   * the loop leaves each strand parallel to it (following the tilt) before
   * curving to the next, for a clean leaning hairpin rather than a vertical rise.
   */
  loopTangentPx: 14,
  /**
   * Residues of the focal protomer's chain to include each side of its stem in
   * an assembly barrel, so the backbone visibly continues off the strand tops
   * toward the extramembrane cap. Kept small so the cap stub stays near the
   * membrane and doesn't blow up the z-range.
   */
  capHintResidues: 5,
};

/**
 * Minimum residue count for a helix/strand to be drawn as a discrete SS
 * element (`min-helix-length`, `min-strand-length`). Shorter assignments are
 * folded into the surrounding loop so they don't fragment it into stubs.
 */
export const DEFAULT_MIN_HELIX_LENGTH = 4;
export const DEFAULT_MIN_STRAND_LENGTH = 4;

export const SS_BODY = {
  /** Body half-width in screen pixels (full SS element width = 8 px). */
  halfWidthPx: 4,
  /** Arrow wing half-width — 1.5× the body so the wings flare visibly. */
  arrowHalfWidthPx: 6,
  /** Distance from the tip back to the arrow's base, in screen pixels. */
  arrowLengthPx: 12,
};

export const LABEL = {
  fontSizePx: 11,
  /** Gap (screen pixels) between the polygon tip and the nearest label edge. */
  gapPx: 3,
  /** How many samples to step across when computing the endpoint tangent.
   * Stepping > 1 averages out the helix curl that makes single-sample
   * tangents jitter at the ends. */
  tangentStepSamples: 3,
};

/** Opacity of neighbouring (context) protomers in an assembly barrel. */
export const FADED_OPACITY = 0.32;
