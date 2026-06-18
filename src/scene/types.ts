/**
 * The shared, renderer-agnostic topology scene (issue #22).
 *
 * `TopologyScene` is the single source of truth for "which elements go where".
 * Both the SVG renderer and the 3-D (Three.js) renderer consume it, so the two
 * are consistent by construction and the 2-D⇄3-D morph is a per-sample
 * interpolation between each sample's flat and real-3-D position.
 *
 * No DOM, no Three.js, no rendering — pure data. See `docs/3d-renderer-plan.md`.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * One point on an element centreline, expressed in BOTH frames.
 *
 * Frame convention: the membrane normal is the vertical axis in both spaces.
 *   - flat 2-D position  = `(arc, z, 0)`
 *   - real 3-D position  = `pos3d` (the de-spiralled smooth backbone axis; its
 *     `z` equals the real membrane depth `z` above)
 */
export interface SceneSample {
  /** Display-space arc length (post-layout), Å — horizontal axis of the 2-D view. */
  arc: number;
  /** Membrane depth, Å — vertical axis of the 2-D view. */
  z: number;
  /** Real membrane-frame coordinate, Å — the morph target. */
  pos3d: Vec3;
}

/** Per-input-Cα anchor, for residue labels and picking. */
export interface SceneResidue {
  resSeq: number;
  iCode: string;
  arc: number;
  z: number;
  pos3d: Vec3;
  /** Index into the owning element's `samples`. */
  sampleIndex: number;
}

export type SceneElementType = 'helix' | 'strand' | 'loop';

interface SceneElementBase {
  type: SceneElementType;
  /** Dense centreline, N→C. */
  samples: SceneSample[];
  /** Residue anchors within this element, N→C. */
  residues: SceneResidue[];
  /**
   * Neighbour-protomer element in an assembly barrel — rendered desaturated so
   * the focal protomer reads as the subject.
   */
  faded: boolean;
}

export interface RibbonElement extends SceneElementBase {
  type: 'strand';
  /** β-strands carry a C-terminal arrowhead. */
  arrow: true;
}

export interface HelixElement extends SceneElementBase {
  type: 'helix';
  arrow: false;
}

/** A loop / coil run, or a connector across a chain break. */
export interface LoopElement extends SceneElementBase {
  type: 'loop';
  /**
   * Resolved 2-D schematic control points (the bézier the SVG draws) in display
   * `(arc, z)`. The 3-D renderer instead sweeps the real centreline (`samples`).
   */
  control: { arc: number; z: number; kind: 'endpoint' | 'tangent' | 'extreme' }[];
  /** Dashed style — the cross-break / inter-protomer connector. */
  dashed: boolean;
}

export type SceneElement = RibbonElement | HelixElement | LoopElement;

/** A β-sheet contact tie between paired strands. */
export interface SceneContact {
  a: { arc: number; z: number; pos3d: Vec3 };
  b: { arc: number; z: number; pos3d: Vec3 };
}

/** Cross-section dimensions, shared so both renderers agree on element shape. */
export interface SceneStyle {
  /** Ribbon (β-strand) body half-width, screen px. */
  ribbonHalfWidth: number;
  /** Ribbon arrowhead wing half-width, screen px. */
  ribbonArrowHalfWidth: number;
  /** Ribbon arrowhead length from base to tip, screen px. */
  ribbonArrowLen: number;
  /** Ribbon thickness in 3-D (the thin dimension), Å. */
  ribbonThickness: number;
  /** α-helix cylinder radius, Å. */
  helixRadius: number;
  /** Coil/loop tube radius, Å. */
  loopRadius: number;
}

/** Summary counts for the chain label and the accessibility text. */
export interface SceneMeta {
  helices: number;
  strands: number;
  /** Total strands in the (possibly multi-chain) barrel ring, if any. */
  strandCount?: number;
  /** Mean strand tilt to the barrel axis, degrees. */
  tiltDeg?: number;
  /** Barrel shear number. */
  shear?: number;
}

/**
 * The complete renderer-agnostic description of one chain's topology diagram.
 */
export interface TopologyScene {
  chainId: string;
  kind: 'helical' | 'barrel' | 'assembly';
  /** Bilayer half-thickness, Å. */
  membrane: { half: number };
  /** Total display arc length, Å. */
  arcSpan: number;
  /** Observed membrane-depth range across the chain, Å. */
  zRange: { min: number; max: number };
  /** All elements, ordered N→C across chain segments. */
  elements: SceneElement[];
  contacts: SceneContact[];
  style: SceneStyle;
  meta: SceneMeta;
}
