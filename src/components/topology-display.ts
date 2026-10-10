import type { ChainData, ProteinData } from '../types.js';
import { selectTransmembraneChains } from '../orientation/index.js';
import { analyseBarrel, analyseAssemblyBarrel, type BarrelAnalysis } from '../contacts/index.js';
import {
  interpolateStops,
  parseColour,
  parseSeriesAttribute,
  readDataTheme,
  resolveColouring,
  widthFactors,
  type ResidueColourValues,
  type ResidueWidthValues,
} from './residue-data.js';
import type { IconMembrane } from './chain-icon.js';
import { ScrollBox } from './scroll-box.js';
import type { MorphScene } from '../morph/types.js';
import type { MorphController, MorphView } from '../morph/controller.js';
import type { MorphOptions } from '../morph/renderer.js';
import type { Fishnet } from '../morph/net.js';
import { PROJECTIONS } from '../morph/projections.js';
import {
  DEFAULT_MEMBRANE_STYLE,
  MEMBRANE_STYLES,
  type MembraneStyle,
} from '../morph/membrane-style.js';
import type { SeqResidue, SequenceSource } from '../sequence/types.js';
import { SequenceController } from '../sequence/controller.js';
import { DEFAULT_SEQUENCE_OPTIONS, type SequenceOptions } from '../sequence/renderer.js';
import type { SeqLane } from '../sequence/types.js';
import { SEQ } from '../sequence/layout.js';
import {
  DEFAULT_BULK,
  DEFAULT_MEMBRANE_DETAIL,
  MEMBRANE_CORE_HALF,
  MEMBRANE_DETAILS,
  membraneAtDetail,
  parseDistortions,
  resolveMembrane,
  type LeafletPair,
  type Membrane,
  type MembraneDetail,
  type MembraneDistortions,
  type MembraneSettings,
} from '../membrane/index.js';
import {
  getTheme,
  onThemeRegistered,
  registerTheme,
  repaint,
  resolveThemeName,
  themeCss,
  type Theme,
  type ThemeInput,
  type ThemeName,
} from '../theme/index.js';
import {
  DEFAULT_MIN_HELIX_LENGTH,
  DEFAULT_MIN_STRAND_LENGTH,
  LOOP,
  build3d,
  buildSequence,
  effectiveSsSegments,
  layoutChain,
  morphColours,
  type ChainLayout,
  type AssemblyContext,
  type LoopRenderOptions,
  type SsMinLengths,
} from '../layout/index.js';
import { render2d, type ChainDisplayData } from './render-2d.js';
import {
  buildChainLabels,
  chainLabelNode,
  iconColours,
  renderChainPicker,
  type ChainLabel,
} from './chain-picker.js';
import { STYLES } from './topology-styles.js';

export { DEFAULT_MIN_HELIX_LENGTH, DEFAULT_MIN_STRAND_LENGTH, effectiveSsSegments };

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build a laid-out chain's three views: the 2-D SVG, the 3-D scene (null
 * without 3-D positions) and the sequence view's source.
 */
function renderChainViews(
  chain: ChainData,
  layout: ChainLayout,
  membrane: Membrane,
  theme: Theme,
  showLoopPoints: boolean,
  display?: ChainDisplayData,
): {
  svg: SVGSVGElement;
  scene: MorphScene | null;
  sequence: SequenceSource;
  decor2d: Element[];
} {
  const { svg, decor2d } = render2d(layout, theme, { showLoopPoints, display });
  const scene = build3d(layout, theme, membrane.surfaces);
  const sequence = buildSequence(chain, layout, display?.style.colour ?? null);
  // The sequence view grows to the 2-D picture's full height (legend included).
  const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
  sequence.frame2d = { minX: vb[0], minY: vb[1], width: vb[2], height: vb[3] };
  return { svg, scene, sequence, decor2d };
}

/** Default time (ms) to move one whole dimension (see `transition-time`). */
export const DEFAULT_TRANSITION_MS = 2500;
/** A `membrane-detail` change blends over this fraction of `transition-time`. */
const MEMBRANE_BLEND = 0.25;
/** A number in SVG path data. */
const PATH_NUMBER = /-?\d+(?:\.\d+)?/g;

/** The membrane as drawn, for blending to a new `membrane-detail`. */
interface MembraneSnapshot {
  /** Path data of the 2-D band. */
  band: string | null;
  /** The 3-D membrane, while the 3-D view is shown. */
  net: Fishnet | null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Default rolling-wave width for the 2-D → 3-D morph (see `morph-sweep`). */
const DEFAULT_MORPH_SWEEP = 0.35;

/** Default strand arrowhead width over ribbon width in the morph (4.65 / 2.85 Å). */
const STRAND_ARROW_RATIO = 4.65 / 2.85;

let _instanceCounter = 0;

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Whether the system asks for a dark colour scheme. */
function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/**
 * A residue range on one chain: the value of the `selection` attribute once
 * resolved, and the `detail` of `chain-select` events. `start`/`end` are
 * inclusive author residue numbers (`resSeq`).
 */
export interface TopologySelection {
  chainId: string;
  start: number;
  end: number;
}

/** `detail` of `element-click` and `element-hover` events. */
export interface TopologyElementDetail extends TopologySelection {
  type: 'helix' | 'strand';
}

/** A parsed `selection` attribute; `start`/`end` are null for a whole chain. */
interface ParsedSelection {
  chainId: string;
  start: number | null;
  end: number | null;
}

const SELECTION_RE = /^([A-Za-z0-9_]+)(?::(-?\d+)(?:-(-?\d+))?)?$/;

/**
 * Parse a `selection` attribute: `A` (whole chain), `A:45` (one residue) or
 * `A:45-60` (inclusive range; negative residue numbers allowed, e.g. `A:-3-10`).
 * A reversed range is swapped. Returns null for anything else, including a
 * range that names a second chain (`A:45-B:60`) or a list (`A:1-5,B:1-5`).
 */
export function parseSelection(value: string | null): ParsedSelection | null {
  if (value === null) return null;
  const m = SELECTION_RE.exec(value.replace(/\s+/g, ''));
  if (!m) return null;
  if (m[2] === undefined) return { chainId: m[1], start: null, end: null };
  const a = Number(m[2]);
  const b = m[3] === undefined ? a : Number(m[3]);
  return { chainId: m[1], start: Math.min(a, b), end: Math.max(a, b) };
}

/** Lowest and highest residue number of a chain's Cα trace. */
function chainBounds(chain: ChainData): { start: number; end: number } {
  let start = Infinity;
  let end = -Infinity;
  for (const ca of chain.calphas) {
    if (ca.resSeq < start) start = ca.resSeq;
    if (ca.resSeq > end) end = ca.resSeq;
  }
  return { start, end };
}

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = [
    'protein-data',
    'debug-loops',
    'loop-extreme-points',
    'loop-extreme-threshold',
    'show-contacts',
    'dimension',
    'transition-time',
    'sequence-wrap',
    'morph-sweep',
    'morph-projection',
    'morph-strand-width',
    'morph-strand-thickness',
    'morph-grid-spacing',
    'morph-membrane-style',
    'icon-bandwidth',
    'min-helix-length',
    'min-strand-length',
    'membrane-upper',
    'membrane-lower',
    'membrane-annular-upper',
    'membrane-annular-lower',
    'membrane-detail',
    'selection',
    'residue-colours',
    'residue-widths',
    'colour-scale',
    'colour-domain',
    'colour-label',
    'theme',
    'theme-light',
    'theme-dark',
  ];

  /** Add or replace a named theme (see {@link registerTheme}). */
  static registerTheme(name: ThemeName, theme: ThemeInput): Readonly<Theme> {
    return registerTheme(name, theme);
  }

  private readonly _instanceId = ++_instanceCounter;
  private _data: ProteinData | null = null;
  private _distortions: MembraneDistortions | null = null;
  /** Membrane resolved for the current data, distortions and settings, and as drawn. */
  private _membraneCache: {
    data: ProteinData;
    distortions: MembraneDistortions | null;
    key: string;
    resolved: Membrane;
    detail: MembraneDetail;
    membrane: Membrane;
  } | null = null;
  /** Chain layouts for the current data and membrane, by chain and layout options. */
  private _layouts: {
    data: ProteinData;
    membrane: Membrane;
    byKey: Map<string, ChainLayout>;
  } | null = null;
  private _residueColours: ResidueColourValues | null = null;
  private _residueWidths: ResidueWidthValues | null = null;
  /** What the displayed chain's 3-D morph is built from, until it is needed. */
  private _morphSource: {
    scroll: HTMLElement;
    svg: SVGSVGElement;
    scene: MorphScene;
    /** The structure's other chains, shown around it in 3-D (built on first use). */
    context: () => MorphScene[];
    options: Partial<MorphOptions>;
    bar: HTMLDivElement;
  } | null = null;
  private _morph: MorphController | null = null;
  /** The displayed chain's sequence ↔ topology transition. */
  private _seq: SequenceController | null = null;
  /** Extra data lanes for the sequence view (see {@link sequenceTracks}). */
  private _sequenceTracks: SequenceTrack[] = [];
  /** The running `dimension` animation's frame, and a counter that cancels a pending start. */
  private _dimensionRaf = 0;
  private _dimensionRun = 0;
  /** Last position announced in a `dimension-change` event. */
  private _lastPosition = NaN;
  private _morphLoad: Promise<MorphController | null> | null = null;
  /** A view a redraw is restoring while the morph code loads. */
  private _pendingView: MorphView | null = null;
  /** Running blend of the 2-D membrane band after a `membrane-detail` change. */
  private _band: { raf: number; path: Element; to: string } | null = null;
  private _scrollBox: ScrollBox | null = null;
  /** Full-screen state: 'native' (Fullscreen API) or 'overlay' (fixed-position fallback). */
  private _fullscreen: 'native' | 'overlay' | null = null;
  /** Height the 3-D view fills while full screen (Infinity otherwise). */
  private _fillHeight = Infinity;
  private _fsButton: HTMLButtonElement | null = null;
  /** Undo the full-screen listeners and page changes. */
  private _fsCleanup: (() => void) | null = null;
  private _selectedChainId: string | null = null;
  /** The chain picker, when the protein has more than one chain. */
  private _picker: HTMLElement | null = null;
  /** Chain and 2-D svg currently on screen, for in-place selection updates. */
  private _shown: { chain: ChainData; svg: SVGSVGElement } | null = null;
  /** SS element under the pointer or focus, so hover events fire once each. */
  private _hovered: Element | null = null;
  /** `selection` value last written by a user pick or click, not the page. */
  private _userSelection: string | null = null;
  private _styleEl: HTMLStyleElement;
  /** The theme's tokens as `--mp-*` custom properties on the host. */
  private _themeEl: HTMLStyleElement;
  private _contentEl: HTMLDivElement;
  private _themeName: ThemeName = 'light';
  private _theme: Readonly<Theme> = getTheme('light')!;
  /** Undo the colour-scheme and theme-registry listeners while connected. */
  private _unlisten: (() => void) | null = null;
  // Cached multi-chain assembly-barrel analysis; depends only on proteinData, so
  // it survives cosmetic re-renders (chain pick, show-contacts, debug-loops).
  private _assemblyCache: {
    data: ProteinData;
    min: SsMinLengths;
    shift: number;
    analysis: BarrelAnalysis;
  } | null = null;

  /** Assembly-barrel analysis for the current proteinData, memoised. */
  private assemblyAnalysis(chains: ChainData[]): BarrelAnalysis {
    const min = this.ssMinLengths;
    const shift = this.membrane?.shift ?? 0;
    const cached = this._assemblyCache;
    if (
      cached &&
      cached.data === this._data &&
      cached.min.helix === min.helix &&
      cached.min.strand === min.strand &&
      cached.shift === shift
    ) {
      return cached.analysis;
    }
    const analysis = analyseAssemblyBarrel(chains);
    if (this._data) this._assemblyCache = { data: this._data, min, shift, analysis };
    return analysis;
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this._themeEl = document.createElement('style');
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = STYLES;
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'content';
    shadow.append(this._themeEl, this._styleEl, this._contentEl);
    this._themeName = this.resolveTheme();
    this._theme = getTheme(this._themeName)!;
    this._themeEl.textContent = themeCss(this._theme);
  }

  /** Name of the theme in use: from `theme`, else `theme-light` / `theme-dark` by colour scheme. */
  get activeThemeName(): ThemeName {
    return this._themeName;
  }

  /** The tokens of the theme in use. */
  get activeTheme(): Readonly<Theme> {
    return this._theme;
  }

  private resolveTheme(): ThemeName {
    for (const attr of ['theme', 'theme-light', 'theme-dark']) {
      const name = this.getAttribute(attr);
      if (name !== null && !getTheme(name)) {
        console.warn(`topology-display: unknown theme "${name}" in ${attr}`);
      }
    }
    return resolveThemeName(
      {
        theme: this.getAttribute('theme'),
        light: this.getAttribute('theme-light'),
        dark: this.getAttribute('theme-dark'),
      },
      prefersDark(),
    );
  }

  /**
   * Show the theme the attributes and colour scheme now call for. Restyles in
   * place: the chain, 2-D scroll position, 3-D view and focus are kept.
   * `force` re-applies a theme whose tokens were re-registered.
   */
  private applyTheme(force = false): void {
    const name = this.resolveTheme();
    const theme = getTheme(name)!;
    if (!force && name === this._themeName && theme === this._theme) return;
    const old = this._theme;
    this._themeName = name;
    this._theme = theme;
    this._themeEl.textContent = themeCss(theme);
    this.restyle(old);
    this.emit('theme-change', { name });
  }

  /** Bring what is on screen into the current theme. */
  private restyle(old: Theme): void {
    const theme = this._theme;
    if (!this._shown) return;
    // Per-residue colours come from the data palettes; a new palette means
    // recolouring the data, which is a redraw.
    const palettesChanged =
      old.dataScale.join() !== theme.dataScale.join() ||
      old.dataCategories.join() !== theme.dataCategories.join();
    if (palettesChanged && this._residueColours) {
      this.render({ keepView: true });
      return;
    }
    repaint(this._shown.svg, theme);
    this._seq?.restyle(theme);
    if (this._morphSource) {
      Object.assign(this._morphSource.scene.style, morphColours(theme));
      this._morph?.restyle();
    }
    this.redrawPicker();
  }

  get proteinData(): ProteinData | null {
    return this._data;
  }

  set proteinData(value: ProteinData | null) {
    // Re-assigning the same object (e.g. from a framework re-render) is a no-op.
    if (value === this._data) return;
    this.loadData(value);
  }

  /**
   * Per-residue colour data, `{ chainId: { resSeq: value } }` (issue #23).
   * All-number values are mapped through a numerical colour scale
   * (`colour-scale`, `colour-domain`); otherwise values are categories with a
   * colour each (`colour-scale` as `key:colour` pairs, else the theme
   * palette, or amino-acid colours when every category is a one-letter code).
   * Mirrors the `residue-colours` attribute (JSON).
   */
  get residueColours(): ResidueColourValues | null {
    return this._residueColours;
  }

  set residueColours(value: ResidueColourValues | null) {
    if (value === this._residueColours) return;
    this._residueColours = value;
    this.render({ keepView: true });
  }

  /**
   * Per-residue width relative to the normal width, `{ chainId: { resSeq:
   * factor } }`: 1 is unchanged, 1.5 half as wide again, 0 a bare line
   * (negative values count as 0). Widths vary smoothly between residues.
   * Mirrors the `residue-widths` attribute (JSON).
   */
  get residueWidths(): ResidueWidthValues | null {
    return this._residueWidths;
  }

  set residueWidths(value: ResidueWidthValues | null) {
    if (value === this._residueWidths) return;
    this._residueWidths = value;
    this.render({ keepView: true });
  }

  /**
   * A MemProtMD bilayer-distortions file for the loaded structure: its text,
   * or the result of {@link parseDistortions}. It sets the bulk leaflet
   * positions and, when the structure is in the same frame as the file (as
   * MemProtMD's own structure files are), moves the structure onto the bulk
   * midplane and, at the default {@link membraneDetail}, draws the local
   * leaflet surfaces under its residues. Text that can't be parsed is ignored
   * with a warning. See docs/membrane.md.
   */
  get distortions(): MembraneDistortions | null {
    return this._distortions;
  }

  set distortions(value: MembraneDistortions | string | null) {
    let parsed: MembraneDistortions | null = null;
    if (typeof value === 'string') {
      try {
        parsed = parseDistortions(value);
      } catch (err) {
        console.warn(`topology-display: ignoring distortions file: ${(err as Error).message}`);
      }
    } else {
      parsed = value;
    }
    this._distortions = parsed;
    this.render({ keepView: true });
  }

  /**
   * How much of the membrane the diagram follows (`membrane-detail`): `bulk`,
   * a flat band at the bulk leaflets; `annular`, bulk, and the annular
   * leaflets under residues near the transmembrane segments; `local` (the
   * default), the local surfaces under residues near the bilayer as well, when
   * a distortions file gives them (see {@link MEMBRANE_REACH_A}).
   * Unset or unknown values give `local`. The 3-D view follows the same
   * detail; the chain-picker icons always use the bulk.
   */
  get membraneDetail(): MembraneDetail {
    const value = this.getAttribute('membrane-detail');
    return MEMBRANE_DETAILS.find((d) => d === value) ?? DEFAULT_MEMBRANE_DETAIL;
  }

  /** Set the detail; writes the `membrane-detail` attribute (null removes it). */
  set membraneDetail(value: MembraneDetail | null) {
    if (value === null) this.removeAttribute('membrane-detail');
    else this.setAttribute('membrane-detail', value);
  }

  /**
   * The membrane the protein is drawn against, at {@link membraneDetail}:
   * bulk and annular leaflet positions (Å), any local surfaces, and the z
   * shift applied to the structure. Null until protein data is set.
   */
  get membrane(): Membrane | null {
    const data = this._data;
    if (!data) return null;
    const settings = this.membraneSettings;
    const detail = this.membraneDetail;
    const key = JSON.stringify(settings);
    const cached = this._membraneCache;
    if (
      cached &&
      cached.data === data &&
      cached.distortions === this._distortions &&
      cached.key === key
    ) {
      // Only the detail changed: no need to resolve (or warn) again.
      if (cached.detail !== detail) {
        cached.detail = detail;
        cached.membrane = membraneAtDetail(cached.resolved, detail);
      }
      return cached.membrane;
    }
    const calphas = (data.chains ?? []).flatMap((c) => (Array.isArray(c.calphas) ? c.calphas : []));
    const resolved = resolveMembrane(settings, this._distortions, calphas);
    if (this._distortions && !resolved.surfaces) {
      console.warn(
        'topology-display: the structure is not in the distortions file’s frame; ' +
          'using its bulk leaflet positions only',
      );
    }
    const membrane = membraneAtDetail(resolved, detail);
    this._membraneCache = { data, distortions: this._distortions, key, resolved, detail, membrane };
    return membrane;
  }

  /**
   * The current selection resolved against the loaded protein, or null when
   * there is none, the attribute is invalid, or its chain isn't in the
   * protein. A whole-chain selection resolves to the chain's residue bounds.
   */
  get selection(): TopologySelection | null {
    const parsed = parseSelection(this.getAttribute('selection'));
    const chain = parsed && this.chainsWithCoords().find((c) => c.chainId === parsed.chainId);
    if (!parsed || !chain) return null;
    if (parsed.start === null || parsed.end === null) {
      return { chainId: chain.chainId, ...chainBounds(chain) };
    }
    return { chainId: chain.chainId, start: parsed.start, end: parsed.end };
  }

  /** Set the selection; writes the `selection` attribute (null removes it). */
  set selection(value: TopologySelection | string | null) {
    if (value === null) this.removeAttribute('selection');
    else if (typeof value === 'string') this.setAttribute('selection', value);
    else this.setAttribute('selection', `${value.chainId}:${value.start}-${value.end}`);
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === 'dimension') {
      // Travel to the new dimension, keeping everything else.
      if (value !== old && this._seq) this.animateTo(this.targetPosition);
      return;
    }
    if (name === 'transition-time') return;
    if (name === 'sequence-wrap') {
      this._seq?.setOptions(this.sequenceOptions);
      return;
    }
    if (name === 'theme' || name === 'theme-light' || name === 'theme-dark') {
      // Restyled in place: the view is kept.
      this.applyTheme();
      return;
    }
    if (name === 'selection') {
      // The page set its own selection: it is no longer the user's.
      if (value !== this._userSelection) this._userSelection = null;
      const parsed = parseSelection(value);
      if (value !== null && !parsed) {
        console.warn(`topology-display: ignoring invalid selection "${value}"`);
      }
      // Same chain on screen: restyle in place so keyboard focus survives.
      // Otherwise the selected chain changes, which needs a redraw; it keeps
      // the 2-D / 3-D view.
      if (this._shown && (!parsed || parsed.chainId === this._shown.chain.chainId)) {
        this.applySelection();
      } else {
        this.render({ keepView: true });
      }
      return;
    }
    if (
      name === 'morph-sweep' ||
      name === 'morph-projection' ||
      name === 'morph-strand-width' ||
      name === 'morph-strand-thickness' ||
      name === 'morph-grid-spacing' ||
      name === 'morph-membrane-style'
    ) {
      // 3-D only: update the morph in place, keeping its view.
      if (this._morphSource) {
        this._morphSource.options = this.morphOptions;
        this._morph?.setOptions(this._morphSource.options);
      }
      return;
    }
    if (name === 'icon-bandwidth') {
      // Only the chain-picker icons change.
      this.redrawPicker();
      return;
    }
    if (name === 'membrane-detail') {
      // Redraw, keeping the view, and blend from the old membrane to the new.
      const detail = (v: string | null) =>
        MEMBRANE_DETAILS.find((d) => d === v) ?? DEFAULT_MEMBRANE_DETAIL;
      const from = detail(value) !== detail(old) ? this.membraneSnapshot() : null;
      this.render({ keepView: true, membraneFrom: from });
      return;
    }
    if (
      name === 'debug-loops' ||
      name === 'loop-extreme-points' ||
      name === 'loop-extreme-threshold' ||
      name === 'show-contacts' ||
      name === 'min-helix-length' ||
      name === 'min-strand-length' ||
      name.startsWith('membrane-')
    ) {
      // The 2-D drawing changes; keep the scroll position and 3-D view.
      this.render({ keepView: true });
      return;
    }
    if (name === 'residue-colours' || name === 'residue-widths') {
      if (value === old) return;
      if (name === 'residue-colours') this._residueColours = parseSeriesAttribute(value, name);
      else this._residueWidths = parseSeriesAttribute(value, name);
      this.render({ keepView: true });
      return;
    }
    if (name === 'colour-scale' || name === 'colour-domain' || name === 'colour-label') {
      this.render({ keepView: true });
      return;
    }
    if (name !== 'protein-data' || value === old) return;
    let data: ProteinData | null = null;
    if (value !== null) {
      try {
        data = JSON.parse(value) as ProteinData;
      } catch {
        data = null;
      }
    }
    this.loadData(data);
  }

  /**
   * Show a new protein, changing as little as possible: the 2-D / 3-D view,
   * orbit and scroll carry over, as do the user's chain pick and selection
   * when the new protein has that chain. `resetView()` starts afresh.
   */
  private loadData(data: ProteinData | null): void {
    this._data = data;
    const has = (id: string): boolean => this.chainsWithCoords().some((c) => c.chainId === id);
    if (this._selectedChainId && !has(this._selectedChainId)) this._selectedChainId = null;
    const mine = parseSelection(this._userSelection);
    if (mine && !has(mine.chainId)) this.dropUserSelection();
    this.render({ keepView: true });
  }

  /**
   * Reset what the user has changed: back to the 2-D view at the start of the
   * default chain, forgetting their chain pick, selection and 3-D orbit.
   * Attributes the page set (including its own `selection`) are kept.
   */
  resetView(): void {
    this._selectedChainId = null;
    this.dropUserSelection();
    this.render();
  }

  /**
   * Whether loop control points are drawn for debugging. Hidden by default;
   * set the `debug-loops` attribute to "on"/"true"/"show"/"1" to display them.
   */
  private get showLoopPoints(): boolean {
    const v = this.getAttribute('debug-loops');
    return v !== null && ['on', 'true', 'show', '1'].includes(v.toLowerCase());
  }

  /**
   * Whether β-sheet residue contacts are overlaid as ties between paired
   * strands. Off by default; set `show-contacts` to "on"/"true"/"show"/"1".
   */
  private get showContacts(): boolean {
    const v = this.getAttribute('show-contacts');
    return v !== null && ['on', 'true', 'show', '1'].includes(v.toLowerCase());
  }

  /**
   * Width of the rolling wave in the 2-D → 3-D morph, as a fraction of the
   * chain (`morph-sweep`, default 0.35). 0 rolls the whole chain up at once;
   * larger values roll it up progressively from the N-terminal end.
   */
  private get morphSweep(): number {
    const v = Number.parseFloat(this.getAttribute('morph-sweep') ?? '');
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_MORPH_SWEEP;
  }

  /**
   * Projection of the finished 3-D view (`morph-projection`): `isometric`
   * (default, parallel) or `perspective` (35 mm-equivalent).
   */
  private get morphProjection(): keyof typeof PROJECTIONS {
    return this.getAttribute('morph-projection') === 'perspective' ? 'perspective' : 'isometric';
  }

  /**
   * Strand ribbon size in the 3-D view, in Å (`morph-strand-width`,
   * `morph-strand-thickness`; defaults 2.85 × 1.0). The arrowhead keeps its
   * default proportion to the ribbon width. Invalid or non-positive values
   * fall back to the defaults.
   */
  private get morphStrandOptions(): Partial<MorphOptions> {
    const read = (name: string): number | null => {
      const v = Number.parseFloat(this.getAttribute(name) ?? '');
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const opts: Partial<MorphOptions> = {};
    const width = read('morph-strand-width');
    if (width !== null) {
      opts.strandWidth = width;
      opts.arrowWidth = width * STRAND_ARROW_RATIO;
    }
    const thickness = read('morph-strand-thickness');
    if (thickness !== null) opts.strandThickness = thickness;
    return opts;
  }

  /**
   * Spacing (Å) of the 3-D membrane grid (`morph-grid-spacing`), at least
   * 2 Å; unset, `auto` or invalid gives 0, which sizes it from the membrane
   * disc (an eighth of its radius, 4–8 Å).
   */
  private get morphGridSpacing(): number {
    const v = Number.parseFloat(this.getAttribute('morph-grid-spacing') ?? '');
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  /** How the 3-D view draws the leaflets (`morph-membrane-style`); `grid` unless valid. */
  private get morphMembraneStyle(): MembraneStyle {
    const v = this.getAttribute('morph-membrane-style');
    return (MEMBRANE_STYLES as readonly string[]).includes(v ?? '')
      ? (v as MembraneStyle)
      : DEFAULT_MEMBRANE_STYLE;
  }

  /** Assemble the 3-D morph options from the component's attributes. */
  private get morphOptions(): Partial<MorphOptions> {
    return {
      sweep: this.morphSweep,
      ...PROJECTIONS[this.morphProjection],
      ...this.morphStrandOptions,
      gridSpacing: this.morphGridSpacing,
      membraneStyle: this.morphMembraneStyle,
    };
  }

  /**
   * Explicit leaflet positions, in Å from the bulk midplane: `membrane-upper`
   * and `membrane-lower` (bulk), `membrane-annular-upper` and
   * `membrane-annular-lower` (next to the protein). Unset or non-numeric
   * values fall back to the distortions file, then the defaults.
   */
  private get membraneSettings(): MembraneSettings {
    const read = (name: string): number | undefined => {
      const v = Number.parseFloat(this.getAttribute(name) ?? '');
      return Number.isFinite(v) ? v : undefined;
    };
    const pair = (upper: string, lower: string): Partial<LeafletPair> => {
      const out: Partial<LeafletPair> = {};
      const u = read(upper);
      const l = read(lower);
      if (u !== undefined) out.upper = u;
      if (l !== undefined) out.lower = l;
      return out;
    };
    return {
      bulk: pair('membrane-upper', 'membrane-lower'),
      annular: pair('membrane-annular-upper', 'membrane-annular-lower'),
    };
  }

  /** Membrane the chain-picker icons are drawn against: the bulk bilayer. */
  private get iconMembrane(): IconMembrane {
    const { upper, lower } = this.membrane?.bulk ?? DEFAULT_BULK;
    return { centre: (upper + lower) / 2, thickness: upper - lower };
  }

  /**
   * Smoothing for the chain-picker violins (`icon-bandwidth`): the σ, in Å, of
   * the Gaussian applied on top of the per-row residue counts (one row is half
   * a membrane thickness). Defaults to 0, the plain per-row histogram; invalid
   * or negative values fall back to the default.
   */
  private get iconBandwidth(): number {
    const v = Number.parseFloat(this.getAttribute('icon-bandwidth') ?? '');
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }

  /**
   * Shortest helix and strand, in residues, drawn as SS elements
   * (`min-helix-length`, `min-strand-length`; default 4 each). Shorter
   * assignments read as coil everywhere, including β-barrel detection and the
   * chain-picker icons. Invalid or negative values fall back to the default.
   */
  private get ssMinLengths(): SsMinLengths {
    const read = (name: string, fallback: number): number => {
      const v = Number.parseInt(this.getAttribute(name) ?? '', 10);
      return Number.isFinite(v) && v >= 0 ? v : fallback;
    };
    return {
      helix: read('min-helix-length', DEFAULT_MIN_HELIX_LENGTH),
      strand: read('min-strand-length', DEFAULT_MIN_STRAND_LENGTH),
    };
  }

  /** Assemble the loop rendering options from the component's attributes. */
  private get loopOptions(): LoopRenderOptions {
    const ext = this.getAttribute('loop-extreme-points');
    const extremePoints =
      ext === null || !['off', 'false', 'none', '0'].includes(ext.toLowerCase());
    const parsed = Number.parseFloat(this.getAttribute('loop-extreme-threshold') ?? '');
    const extremeThreshold = Number.isFinite(parsed) ? parsed : LOOP.extremeThreshold;
    return { showPoints: this.showLoopPoints, extremePoints, extremeThreshold };
  }

  connectedCallback() {
    this.listenForThemes();
    // The colour scheme may have changed while disconnected.
    this.applyTheme();
    this.render();
  }

  disconnectedCallback() {
    this._unlisten?.();
    this._unlisten = null;
    this.leaveFullscreen();
  }

  /** Whether the element is shown full screen. */
  get fullscreen(): boolean {
    return this._fullscreen !== null;
  }

  /**
   * Show the element full screen, with the diagram scaled to fit. Uses the
   * Fullscreen API where the browser allows it (not iPhone Safari), else
   * covers the window. Escape, or the button, leaves.
   */
  async requestFullscreenView(): Promise<void> {
    if (this._fullscreen || !this.isConnected) return;
    let mode: 'native' | 'overlay' = 'overlay';
    if (document.fullscreenEnabled && typeof this.requestFullscreen === 'function') {
      try {
        await this.requestFullscreen({ navigationUI: 'hide' });
        mode = 'native';
      } catch {
        // Refused (e.g. not from a user gesture): fall back to the overlay.
      }
    }
    this.enterFullscreen(mode);
  }

  /** Leave full screen. */
  async exitFullscreenView(): Promise<void> {
    const native = this._fullscreen === 'native' && document.fullscreenElement === this;
    this.leaveFullscreen();
    if (native) await document.exitFullscreen().catch(() => undefined);
  }

  /** Enter full screen, or leave it. */
  toggleFullscreen(): Promise<void> {
    return this._fullscreen ? this.exitFullscreenView() : this.requestFullscreenView();
  }

  private enterFullscreen(mode: 'native' | 'overlay'): void {
    this._fullscreen = mode;
    this.setAttribute('fullscreen', '');
    const offs: (() => void)[] = [];
    const on = <K extends keyof DocumentEventMap>(
      type: K,
      fn: (e: DocumentEventMap[K]) => void,
    ): void => {
      document.addEventListener(type, fn);
      offs.push(() => document.removeEventListener(type, fn));
    };
    if (mode === 'native') {
      // The browser's own Escape (or the page leaving full screen).
      on('fullscreenchange', () => {
        if (document.fullscreenElement !== this) this.leaveFullscreen();
      });
    } else {
      on('keydown', (e) => {
        if (e.key === 'Escape') this.leaveFullscreen();
      });
      // The page under the overlay shouldn't scroll.
      const root = document.documentElement;
      const overflow = root.style.overflow;
      root.style.overflow = 'hidden';
      offs.push(() => (root.style.overflow = overflow));
    }
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => this.fitFullscreen());
      resize.observe(this);
      offs.push(() => resize.disconnect());
    }
    this._fsCleanup = () => offs.forEach((off) => off());
    this.fitFullscreen();
    this.syncFullscreenButton();
    this.dispatchFullscreenChange();
  }

  private leaveFullscreen(): void {
    if (!this._fullscreen) return;
    this._fullscreen = null;
    this._fsCleanup?.();
    this._fsCleanup = null;
    this.removeAttribute('fullscreen');
    this.fitFullscreen();
    this.syncFullscreenButton();
    this.dispatchFullscreenChange();
  }

  private dispatchFullscreenChange(): void {
    this.dispatchEvent(
      new CustomEvent('fullscreen-change', {
        detail: { fullscreen: this.fullscreen },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Scale the diagram box to the screen: the 2-D topology as large as fits
   * (at most 4×; see below for when it is shrunk), with the 1-D and 3-D
   * views at the same scale; the 3-D view fills the box's height. Undoes it
   * all when not full screen.
   *
   * The box is laid out at the frame's size divided by the scale and then
   * scaled up with a transform, so the views, which fit themselves to the
   * box's width, see the smaller width. (CSS `zoom` would be simpler, but
   * stray lines were seen across a zoomed 3-D view in Firefox.)
   */
  private fitFullscreen(): void {
    const box = this._scrollBox;
    const svg = this._shown?.svg;
    if (!box) return;
    const style = box.scroll.style;
    let fill = Infinity;
    if (this._fullscreen && svg) {
      const w = Number(svg.getAttribute('width')) || 1;
      const h = Number(svg.getAttribute('height')) || 1;
      const fw = box.frame.clientWidth;
      const fh = box.frame.clientHeight;
      // Leave the border and a little slack, so rounding adds no scrollbars.
      const aw = fw - 4;
      const ah = fh - 4;
      // As large as fits; never smaller than natural size for the width (it
      // scrolls sideways instead), but shrunk, to a point, to fit the height.
      const floor = Math.max(0.6, Math.min(1, ah / h));
      const scale = Math.min(4, Math.max(floor, Math.min(aw / w, ah / h)));
      style.width = `${fw / scale}px`;
      style.height = `${fh / scale}px`;
      style.transform = scale === 1 ? '' : `scale(${scale})`;
      fill = box.scroll.clientHeight;
    } else {
      style.width = style.height = style.transform = '';
    }
    this._fillHeight = fill > 0 ? fill : Infinity;
    this._morph?.setFillHeight(this._fillHeight);
    box.update();
  }

  private syncFullscreenButton(): void {
    const b = this._fsButton;
    if (!b) return;
    const on = this.fullscreen;
    const label = on ? 'Exit full screen' : 'Full screen';
    b.title = on ? 'Exit full screen (Esc)' : 'Show full screen';
    b.replaceChildren(fullscreenIcon(on), label);
  }

  /** Follow the system colour scheme, and themes (re-)registered by name. */
  private listenForThemes(): void {
    if (this._unlisten) return;
    const offRegistry = onThemeRegistered((name) => {
      if (name === this._themeName || name === this.resolveTheme()) this.applyTheme(true);
    });
    const query =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(DARK_QUERY)
        : null;
    const onScheme = (): void => this.applyTheme();
    query?.addEventListener?.('change', onScheme);
    this._unlisten = () => {
      offRegistry();
      query?.removeEventListener?.('change', onScheme);
    };
  }

  /** 2-D ↔ 3-D morph progress of the displayed chain: 0 = 2-D, 1 = 3-D. */
  get morphProgress(): number {
    return this._morph?.progress ?? 0;
  }

  /**
   * Jump the morph to `tau` ∈ [0, 1] without animating. Resolves once the
   * frame is drawn (the morph code is loaded on first use).
   */
  async setMorphProgress(tau: number): Promise<void> {
    if (tau > 0) this.finishBand();
    (await this.loadMorph())?.setProgress(tau);
  }

  /** Animate between the 2-D topology and the 3-D view. */
  async toggle3d(): Promise<void> {
    this.dimension = this.dimension > 2.5 ? 2 : 3;
    // Resolves once the morph code is loaded (and, with no animation, drawn).
    await this.loadMorph();
  }

  /**
   * The displayed chain's morph controller. The morph code is loaded on
   * first use, so pages that never show the 3-D view don't pay for it.
   */
  private loadMorph(): Promise<MorphController | null> {
    const src = this._morphSource;
    if (!src) return Promise.resolve(null);
    if (this._morph) return Promise.resolve(this._morph);
    this._morphLoad ??= import('../morph/controller.js')
      .then(({ MorphController }) => {
        // Re-rendered (new chain or settings) while loading: stale.
        if (this._morphSource !== src) return null;
        const morph = new MorphController(
          src.scroll,
          src.svg,
          src.scene,
          `mp${this._instanceId}`,
          src.options,
          src.context(),
        );
        this._morph = morph;
        morph.setFillHeight(this._fillHeight);
        morph.setSelection(this.morphSelection());
        this.bindMorphBar(src.bar, morph);
        return morph;
      })
      .catch((err: unknown) => {
        // Let a later click try again (e.g. after a network blip).
        this._morphLoad = null;
        throw err;
      });
    return this._morphLoad;
  }

  /**
   * Rebuild the shadow DOM. With `keepView`, the redraw keeps the 2-D scroll
   * position and the 3-D view (progress, orbit and any running animation).
   */
  /**
   * The layout of `chain`, memoised for the current data and membrane: a
   * redraw that only restyles it (theme, residue data, selection) reuses it,
   * and so do the context chains of the 3-D view.
   */
  private layoutOf(
    chain: ChainData,
    opts: LoopRenderOptions,
    showContacts: boolean,
    membrane: Membrane,
    core: readonly { x: number; y: number }[],
    assembly?: AssemblyContext,
    analysis?: BarrelAnalysis,
  ): ChainLayout {
    const data = this._data!;
    if (this._layouts?.data !== data || this._layouts.membrane !== membrane) {
      this._layouts = { data, membrane, byKey: new Map() };
    }
    // The minimum SS lengths shape every chain's segments (and so an assembly
    // barrel's ring); the membrane carries the distortions shift, and the core
    // follows from the data and the shift.
    const key = JSON.stringify([
      chain.chainId,
      chain.segments,
      this.ssMinLengths,
      opts,
      showContacts,
      assembly?.focalChainId ?? null,
    ]);
    let layout = this._layouts.byKey.get(key);
    if (!layout) {
      layout = layoutChain(
        chain,
        opts,
        analysis ?? analyseBarrel(chain.calphas, chain.segments),
        showContacts,
        membrane,
        core,
        assembly,
      );
      this._layouts.byKey.set(key, layout);
    }
    return layout;
  }

  private render({
    keepView = false,
    membraneFrom = null,
  }: { keepView?: boolean; membraneFrom?: MembraneSnapshot | null } = {}) {
    this.finishBand();
    const view: MorphView | null = !keepView
      ? null
      : (this._morph?.view ??
        this._pendingView ??
        (this._scrollBox
          ? {
              tau: 0,
              goal: 0,
              animating: false,
              orbit: { az: 0, el: 0 },
              scroll0: this._scrollBox.scroll.scrollLeft,
            }
          : null));
    this._pendingView = null;
    const seqView = keepView && this._seq ? this._seq.progress : null;
    this._seq?.dispose();
    this._seq = null;
    this._morph?.dispose();
    this._morph = null;
    this._morphSource = null;
    this._morphLoad = null;
    this._scrollBox?.dispose();
    this._scrollBox = null;
    this._fsButton = null;
    this._shown = null;
    this._picker = null;
    this._hovered = null;
    this._contentEl.replaceChildren();

    if (!this._data) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Loading…';
      this._contentEl.appendChild(placeholder);
      return;
    }

    const region = document.createElement('div');
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Protein topology');

    const titleEl = document.createElement('div');
    titleEl.className = 'protein-id';
    titleEl.textContent = this._data.pdbId;
    region.appendChild(titleEl);

    // Don't mutate the caller's proteinData — build a normalised local view
    // so consumers can safely share or memoise the input. Drops chains whose
    // `calphas` field is missing or empty.
    const chainsWithCoords = this.chainsWithCoords();

    if (chainsWithCoords.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No Cα coordinates available for this protein.';
      region.appendChild(placeholder);
      this._contentEl.appendChild(region);
      return;
    }

    // Pick a default chain: largest transmembrane chain, falling back to the
    // largest chain overall if nothing crosses the bilayer.
    const autoPick = selectTransmembraneChains(chainsWithCoords, { max: 1 });
    const defaultId = autoPick.selected[0]?.chainId ?? chainsWithCoords[0]?.chainId ?? null;
    // A `selection` naming a chain in this protein shows that chain; otherwise
    // the last chain picked, then the default.
    const selectionChainId = parseSelection(this.getAttribute('selection'))?.chainId;
    const selectedId =
      chainsWithCoords.find((c) => c.chainId === selectionChainId)?.chainId ??
      ((this._selectedChainId &&
        chainsWithCoords.find((c) => c.chainId === this._selectedChainId)?.chainId) ||
        defaultId);

    const displayLabels = buildChainLabels(chainsWithCoords);

    // Chain picker — only shown when there are multiple chains to choose between.
    // A single-chain protein has nothing to pick, and the violin would look like
    // a standalone protein figure rather than a UI control.
    if (chainsWithCoords.length > 1 && selectedId) {
      const labelId = `chain-picker-label-${this._instanceId}`;
      const pickerLabel = document.createElement('div');
      pickerLabel.className = 'chain-picker-label';
      pickerLabel.id = labelId;
      pickerLabel.textContent = 'Select chain';
      region.appendChild(pickerLabel);
      this._picker = this.buildPicker(chainsWithCoords, displayLabels, selectedId);
      region.appendChild(this._picker);
    }

    const selectedChain =
      chainsWithCoords.find((c) => c.chainId === selectedId) ?? chainsWithCoords[0];

    if (!selectedChain) {
      this._contentEl.appendChild(region);
      return;
    }

    const selectedLabel = displayLabels.get(selectedChain.chainId) ?? {
      base: selectedChain.chainId,
      suffix: null,
      text: selectedChain.chainId,
    };

    // Note when the user is viewing a non-TM chain — useful for double-checking
    // why a chain doesn't look "right" in the unrolled view.
    if (
      !autoPick.fellBackToLargest &&
      autoPick.selected[0] &&
      selectedChain.chainId !== autoPick.selected[0].chainId
    ) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = `Chain ${selectedLabel.text} does not appear to span the membrane.`;
      region.appendChild(note);
    } else if (autoPick.fellBackToLargest) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = 'No chain in this protein crosses the bilayer.';
      region.appendChild(note);
    }

    const block = document.createElement('div');
    block.className = 'chain-block';

    const label = document.createElement('div');
    label.className = 'chain-label';
    const helices = selectedChain.segments.filter((s) => s.type === 'helix').length;
    // Analyse the β-sheet topology once: it drives both the summary label and
    // the parallel-strand unwrap in the layout.
    const analysis = analyseBarrel(selectedChain.calphas, selectedChain.segments);
    // Count physical strands from the analysis (overlapping SHEET records are
    // merged there); raw segment counts over-report on real structures.
    const strands = analysis.strands.length;
    label.append(
      'Chain ',
      chainLabelNode(selectedLabel),
      ` · ${selectedChain.residueCount} residues · ${helices} helices · ${strands} strands`,
    );

    // If this chain isn't itself a barrel, it may be one protomer of a
    // multi-chain assembly barrel (e.g. α-hemolysin's heptameric stem).
    let assembly: AssemblyContext | undefined;
    if (!analysis.cylindrical && chainsWithCoords.length > 1) {
      const asmAnalysis = this.assemblyAnalysis(chainsWithCoords);
      const focalInRing = asmAnalysis.ringOrder.some(
        (i) => asmAnalysis.strands[i].chainId === selectedChain.chainId,
      );
      if (asmAnalysis.cylindrical && focalInRing) {
        assembly = {
          chains: chainsWithCoords,
          analysis: asmAnalysis,
          focalChainId: selectedChain.chainId,
        };
      }
    }

    if (analysis.cylindrical) {
      const shear = Number.isFinite(analysis.shear) ? `, shear ${Math.round(analysis.shear)}` : '';
      label.append(
        ` · β-barrel (${analysis.strandCount} strands${shear}, ${Math.round(analysis.tiltDeg)}° tilt)`,
      );
    } else if (assembly) {
      const nChains = new Set(
        assembly.analysis.ringOrder.map((i) => assembly!.analysis.strands[i].chainId),
      ).size;
      label.append(
        ` · β-barrel (${assembly.analysis.strandCount} strands across ${nChains} chains, ` +
          `${Math.round(assembly.analysis.tiltDeg)}° tilt)`,
      );
    }
    block.appendChild(label);

    // Only the diagram scrolls; the chain picker above stays put.
    const box = new ScrollBox('svg-scroll');
    this._scrollBox = box;
    const scroll = box.scroll;
    const core = chainsWithCoords.flatMap((c) =>
      c.calphas.filter((ca) => Math.abs(ca.z) < MEMBRANE_CORE_HALF),
    );
    const membrane = this.membrane!;
    const loopOptions = this.loopOptions;
    const layout = this.layoutOf(
      selectedChain,
      loopOptions,
      this.showContacts,
      membrane,
      core,
      assembly,
      analysis,
    );
    const { svg, scene, sequence, decor2d } = renderChainViews(
      selectedChain,
      layout,
      membrane,
      this._theme,
      loopOptions.showPoints,
      this.chainDisplayData(selectedChain.chainId),
    );
    scroll.appendChild(svg);
    box.observe(svg);
    this._shown = { chain: selectedChain, svg };
    // The 2-D band blends only while the 2-D topology is shown and still.
    const still2d =
      !this._dimensionRaf &&
      (!view || (view.tau <= 0 && !view.animating)) &&
      (seqView === null || seqView >= 1);
    if (membraneFrom?.band && still2d) this.blendBand(svg, membraneFrom.band);
    this.bindElements(svg, selectedChain.chainId);
    this.applySelection();
    sequence.lanes = this.sequenceLanes(selectedChain.chainId, sequence.residues);
    const seq = new SequenceController(
      scroll,
      svg,
      sequence,
      this.sequenceOptions,
      this._theme,
      decor2d,
    );
    this._seq = seq;
    const bar = this.renderMorphBar(scene !== null);
    this.bindSequenceBar(bar, seq);
    if (scene) {
      // Every other chain, except the protomers an assembly barrel already draws.
      const drawn = new Set(
        assembly?.analysis.ringOrder.map((i) => assembly!.analysis.strands[i].chainId),
      );
      const others = chainsWithCoords.filter(
        (c) => c.chainId !== selectedChain.chainId && !drawn.has(c.chainId),
      );
      const theme = this._theme;
      this._morphSource = {
        scroll,
        svg,
        scene,
        context: () =>
          others.flatMap((c) => {
            // Only the layout and the 3-D scene: these chains are never drawn in 2-D.
            const s = build3d(
              this.layoutOf(c, loopOptions, false, membrane, core),
              theme,
              membrane.surfaces,
            );
            // Shared style, so theme changes reach the context chains too.
            return s ? [{ ...s, style: scene.style }] : [];
          }),
        options: this.morphOptions,
        bar,
      };
    }
    block.appendChild(bar);
    block.appendChild(box.frame);
    region.appendChild(block);

    this._contentEl.appendChild(region);
    if (this._fullscreen) this.fitFullscreen();

    if (view) this.restoreView(view, membraneFrom?.net ?? null);
    if (seqView !== null) {
      if (seqView < 1) seq.setProgress(seqView);
    } else {
      // A fresh view starts at the page's `dimension`, without animating.
      this.cancelDimension();
      this.applyPosition(this.targetPosition);
    }
  }

  /**
   * Put the re-rendered chain back in `view`, loading the morph only if
   * needed, and blend its 3-D membrane from `net` (the one drawn before).
   */
  private restoreView(view: MorphView, net: Fishnet | null = null): void {
    this._scrollBox!.scroll.scrollLeft = view.scroll0;
    if (view.tau <= 0 && !view.animating) return;
    const src = this._morphSource;
    if (!src) return;
    // Until the morph is restored, a further redraw carries this view on.
    this._pendingView = view;
    void this.loadMorph().then((m) => {
      if (this._morphSource !== src) return;
      this._pendingView = null;
      m?.restore(view);
      // Not while the view moves between dimensions: that redraws every frame.
      if (!this._dimensionRaf) m?.blendMembraneFrom(net, this.membraneBlendTime);
    });
  }

  /** The membrane as drawn now, to blend from after a `membrane-detail` change. */
  private membraneSnapshot(): MembraneSnapshot {
    return {
      band: this._shown?.svg.querySelector('path.membrane')?.getAttribute('d') ?? null,
      net: this._morph?.membraneNet ?? null,
    };
  }

  /** Time (ms) a `membrane-detail` change takes to blend. */
  private get membraneBlendTime(): number {
    return MEMBRANE_BLEND * this.transitionTime;
  }

  /**
   * Blend the 2-D membrane band in `svg` from path data `from` to the band
   * drawn there now. The first frame changes on the next animation frame, so
   * until then the new band shows.
   */
  private blendBand(svg: SVGSVGElement, from: string): void {
    const path = svg.querySelector('path.membrane');
    const to = path?.getAttribute('d');
    const ms = this.membraneBlendTime;
    if (!path || !to || to === from || ms <= 0 || prefersReducedMotion()) return;
    // Both are membranePath output over the same x samples: blend the heights.
    const a = from.match(PATH_NUMBER)?.map(Number);
    const b = to.match(PATH_NUMBER)?.map(Number);
    if (!a || !b || a.length !== b.length || a.some((v, i) => i % 2 === 0 && v !== b[i])) return;
    const start = performance.now();
    const band = { raf: 0, path, to };
    const step = (now: number): void => {
      const f = Math.max(0, Math.min(1, (now - start) / ms));
      if (f >= 1) {
        this.finishBand();
        return;
      }
      const t = 0.5 - 0.5 * Math.cos(Math.PI * f);
      let d = '';
      for (let i = 0; i < a.length; i += 2) {
        d += `${i === 0 ? 'M' : 'L'}${a[i]},${(a[i + 1] + t * (b[i + 1] - a[i + 1])).toFixed(2)}`;
      }
      path.setAttribute('d', d + 'Z');
      band.raf = requestAnimationFrame(step);
    };
    band.raf = requestAnimationFrame(step);
    this._band = band;
  }

  /** End any 2-D band blend, showing the band it was heading for. */
  private finishBand(): void {
    const band = this._band;
    if (!band) return;
    cancelAnimationFrame(band.raf);
    band.path.setAttribute('d', band.to);
    this._band = null;
  }

  /** The chain picker, labelled by the "Select chain" heading. */
  private buildPicker(
    chains: ChainData[],
    labels: Map<string, ChainLabel>,
    selectedId: string,
  ): HTMLElement {
    const icon = {
      membrane: this.iconMembrane,
      // Å → rows: one row is half a membrane thickness.
      smoothing: this.iconBandwidth / (this.iconMembrane.thickness / 2),
    };
    const picker = renderChainPicker(
      chains,
      labels,
      selectedId,
      icon,
      iconColours(this._theme),
      (chainId) => this.pickChain(chainId),
    );
    picker.setAttribute('aria-labelledby', `chain-picker-label-${this._instanceId}`);
    return picker;
  }

  /** Redraw just the chain picker (new icon settings or theme), keeping keyboard focus. */
  private redrawPicker(): void {
    const old = this._picker;
    const shown = this._shown?.chain.chainId;
    if (!old || !shown) return;
    const chains = this.chainsWithCoords();
    const controls = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('button, select')];
    const focused = controls(old).indexOf(this.shadowRoot!.activeElement as HTMLElement);
    const picker = this.buildPicker(chains, buildChainLabels(chains), shown);
    old.replaceWith(picker);
    this._picker = picker;
    if (focused >= 0) controls(picker)[focused]?.focus();
  }

  /** Residue data styling for `chainId`, or undefined when there is none. */
  private chainDisplayData(chainId: string): ChainDisplayData | undefined {
    const colouring = resolveColouring(
      this._residueColours,
      {
        scale: this.getAttribute('colour-scale'),
        domain: this.getAttribute('colour-domain'),
        label: this.getAttribute('colour-label'),
      },
      readDataTheme(this, {
        scale: this._theme.dataScale,
        categories: this._theme.dataCategories,
      }),
    );
    const widths = widthFactors(this._residueWidths, chainId);
    const chainColoured = !!this._residueColours?.[chainId] && colouring !== null;
    if (!chainColoured && widths.size === 0) return undefined;
    return {
      style: {
        colour: chainColoured ? (r) => colouring!.residueColour(chainId, r) : null,
        widths,
      },
      colouring: chainColoured ? colouring : null,
      idPrefix: `mp${this._instanceId}`,
    };
  }

  /** Chains that have Cα coordinates (the ones that can be drawn). */
  /**
   * Chains with Cα coordinates, their SS segments filtered by
   * {@link ssMinLengths} so every consumer (barrel detection, the diagram,
   * the picker icons) sees the same elements.
   */
  private chainsWithCoords(): ChainData[] {
    // Don't mutate the caller's proteinData — consumers may share or memoise it.
    const min = this.ssMinLengths;
    // A structure in a distortions file's simulation-box frame is moved onto
    // the bulk midplane, so everything downstream sees z = 0 there.
    const shift = this.membrane?.shift ?? 0;
    return (this._data?.chains ?? [])
      .filter((c) => Array.isArray(c.calphas) && c.calphas.length > 0)
      .map((c) => ({
        ...c,
        segments: effectiveSsSegments(c.segments, min),
        calphas: shift === 0 ? c.calphas : c.calphas.map((ca) => ({ ...ca, z: ca.z + shift })),
      }));
  }

  /** Reflect a user's pick or click into the `selection` attribute. */
  private selectByUser(sel: TopologySelection): void {
    this.selection = sel;
    this._userSelection = this.getAttribute('selection');
  }

  /**
   * Forget the selection the user picked, but keep a `selection` the page
   * set, so it can be set before the data loads.
   */
  private dropUserSelection(): void {
    const mine = this._userSelection;
    this._userSelection = null;
    if (mine !== null && this.getAttribute('selection') === mine) {
      this.removeAttribute('selection');
    }
  }

  /** A chain picked in the chain picker becomes the whole selection. */
  private pickChain(chainId: string): void {
    const chain = this.chainsWithCoords().find((c) => c.chainId === chainId);
    if (!chain) return;
    const detail: TopologySelection = { chainId, ...chainBounds(chain) };
    this._selectedChainId = chainId;
    this.selectByUser(detail);
    this.emit('chain-select', detail);
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }

  /** Event detail for an SS element polygon. */
  private static elementDetail(el: Element, chainId: string): TopologyElementDetail {
    const d = (el as SVGElement).dataset;
    return {
      chainId,
      start: Number(d.start),
      end: Number(d.end),
      type: d.type === 'strand' ? 'strand' : 'helix',
    };
  }

  /**
   * Wire the SS element buttons: hover/focus emits `element-hover` (detail
   * null on leave), click/Enter/Space selects the element's residues and
   * emits `element-click`. Delegated on the svg so one listener set serves
   * every element.
   */
  private bindElements(svg: SVGSVGElement, chainId: string): void {
    const target = (e: Event): Element | null =>
      e.target instanceof Element ? e.target.closest('.ss-element') : null;
    const hover = (el: Element | null): void => {
      if (el === this._hovered) return;
      this._hovered = el;
      this.emit('element-hover', el ? TopologyDisplay.elementDetail(el, chainId) : null);
    };
    const activate = (el: Element): void => {
      const detail = TopologyDisplay.elementDetail(el, chainId);
      this.selectByUser(detail);
      this.emit('element-click', detail);
    };
    svg.addEventListener('pointerover', (e) => hover(target(e)));
    svg.addEventListener('pointerleave', () => hover(null));
    svg.addEventListener('focusin', (e) => hover(target(e)));
    svg.addEventListener('focusout', (e) => {
      const next = (e as FocusEvent).relatedTarget;
      if (!(next instanceof Element && svg.contains(next))) hover(null);
    });
    svg.addEventListener('click', (e) => {
      const el = target(e);
      if (el) activate(el);
    });
    svg.addEventListener('keydown', (e) => {
      const el = target(e);
      if (!el || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault(); // Space would otherwise scroll the page.
      activate(el);
    });
  }

  /**
   * Style the on-screen elements and loops that overlap the selection. An
   * element or loop counts as selected when any of its residues is in range.
   */
  private applySelection(): void {
    if (!this._shown) return;
    const sel = this.selection;
    const hit = sel && sel.chainId === this._shown.chain.chainId ? sel : null;
    let any = false;
    for (const el of this._shown.svg.querySelectorAll<SVGElement>('.ss-element, .loop')) {
      const on =
        hit !== null && Number(el.dataset.start) <= hit.end && Number(el.dataset.end) >= hit.start;
      any ||= on;
      el.classList.toggle('selected', on);
      if (el.classList.contains('ss-element')) el.setAttribute('aria-pressed', String(on));
    }
    this._shown.svg.classList.toggle('has-selection', any);
    this._morph?.setSelection(this.morphSelection());
  }

  /** The selected residue range on the shown chain, for the 3-D view. */
  private morphSelection(): { start: number; end: number } | null {
    const sel = this.selection;
    if (!sel || !this._shown || sel.chainId !== this._shown.chain.chainId) return null;
    return { start: sel.start, end: sel.end };
  }

  /**
   * Where the view stands, 0 (sequence) → 1 (topology) → 2 (structure): the
   * dimension minus one.
   */
  private get viewPosition(): number {
    const u = this._seq?.progress ?? 1;
    return u < 1 ? u : 1 + this.morphProgress;
  }

  /**
   * The view's dimensionality, live: 1 (sequence), 2 (topology), 3
   * (structure), or in between while animating (1.3 is 30% of the way from
   * the sequence to the topology). Setting it writes the `dimension`
   * attribute, which animates there at `transition-time` ms per dimension.
   */
  get dimension(): number {
    return 1 + this.viewPosition;
  }

  set dimension(value: number) {
    this.setAttribute('dimension', String(value));
  }

  /** Time (ms) to move one whole dimension (`transition-time`; 0 = instant). */
  private get transitionTime(): number {
    const v = Number.parseFloat(this.getAttribute('transition-time') ?? '');
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TRANSITION_MS;
  }

  /** Where `dimension` asks to be, as a view position (0–2), within what the chain can show. */
  private get targetPosition(): number {
    const raw = this.getAttribute('dimension');
    const v = raw === null ? NaN : Number.parseFloat(raw);
    const max = this._morphSource ? 2 : 1;
    return Number.isFinite(v) ? Math.max(0, Math.min(max, v - 1)) : 1;
  }

  /** Show position `p` (0–2) at once. */
  private applyPosition(p: number): void {
    const seq = this._seq;
    if (!seq) return;
    // Leaving the 2-D topology: its picture is the first frame either way.
    if (p !== 1) this.finishBand();
    if (p < 1) {
      if (this.morphProgress > 0) this._morph?.setProgress(0);
      seq.setProgress(p);
    } else {
      seq.setProgress(1);
      if (this._morph) this._morph.setProgress(p - 1);
      else if (p > 1) void this.setMorphProgress(p - 1);
    }
  }

  private cancelDimension(): void {
    if (this._dimensionRaf) cancelAnimationFrame(this._dimensionRaf);
    this._dimensionRaf = 0;
    this._dimensionRun++;
  }

  /**
   * Animate from where the view is to `target` (0–2) at `transition-time` per
   * dimension, passing through the topology between the other two.
   */
  private animateTo(target: number): void {
    this.cancelDimension();
    const run = this._dimensionRun;
    const from = this.viewPosition;
    const ms = this.transitionTime * Math.abs(target - from);
    if (ms <= 0 || from === target || prefersReducedMotion()) {
      this.applyPosition(target);
      return;
    }
    const go = (): void => {
      if (run !== this._dimensionRun) return;
      const start = performance.now();
      const step = (now: number): void => {
        const f = Math.min(1, (now - start) / ms);
        const x = 0.5 - 0.5 * Math.cos(Math.PI * f);
        this.applyPosition(f >= 1 ? target : from + (target - from) * x);
        this._dimensionRaf = f < 1 ? requestAnimationFrame(step) : 0;
      };
      this._dimensionRaf = requestAnimationFrame(step);
    };
    // Set the 3-D view up before the clock starts, so the first frames don't stall.
    if (Math.max(from, target) > 1) {
      void this.loadMorph().then((m) => {
        m?.precompute();
        go();
      });
    } else {
      go();
    }
  }

  /** Sequence-view options from the attributes (`sequence-wrap`). */
  private get sequenceOptions(): SequenceOptions {
    const raw = this.getAttribute('sequence-wrap');
    const n = raw === null || raw === 'auto' ? NaN : Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return { ...DEFAULT_SEQUENCE_OPTIONS, wrap: n };
    // fit="content" sizes the box to the picture, so there is no width to fit.
    const wrap = this.getAttribute('fit') === 'content' ? SEQ.fallbackPerRow : null;
    return { ...DEFAULT_SEQUENCE_OPTIONS, wrap };
  }

  /**
   * Extra data series drawn as colour strips under each row of the sequence
   * view, after the strip for `residueColours`. Values are keyed by chain ID,
   * then residue number, like those.
   */
  get sequenceTracks(): SequenceTrack[] {
    return this._sequenceTracks;
  }

  set sequenceTracks(tracks: SequenceTrack[] | null) {
    this._sequenceTracks = Array.isArray(tracks) ? tracks : [];
    this.render({ keepView: true });
  }

  /** Colour strips of the sequence view for `chainId`. */
  private sequenceLanes(chainId: string, residues: SeqResidue[]): SeqLane[] {
    const lanes: SeqLane[] = [];
    const colour = this.chainDisplayData(chainId)?.style.colour;
    if (colour) {
      lanes.push({
        label: this.getAttribute('colour-label') || 'Colour',
        colourAt: (i) => colour(residues[i].resSeq),
      });
    }
    for (const track of this._sequenceTracks) {
      const values = track.values?.[chainId];
      if (!values) continue;
      const nums = residues
        .map((r) => values[r.resSeq])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const [lo, hi] = track.domain ?? [Math.min(...nums), Math.max(...nums)];
      const stops = (track.scale ?? this._theme.dataScale)
        .map(parseColour)
        .filter((c): c is NonNullable<typeof c> => c !== null);
      lanes.push({
        label: track.label ?? 'Data',
        colourAt: (i) => {
          const v = values[residues[i].resSeq];
          if (typeof v === 'string') return v;
          if (typeof v !== 'number' || !Number.isFinite(v) || stops.length === 0) return undefined;
          return interpolateStops(stops, hi > lo ? (v - lo) / (hi - lo) : 0.5);
        },
      });
    }
    return lanes;
  }

  /**
   * The view switch: 1D (sequence), 2D (topology) and 3D (structure). 3D is
   * disabled when the chain has no 3-D view. Pointing at or focusing the
   * switch loads the morph code and does its set-up ahead of the click.
   */
  private renderMorphBar(available: boolean): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'morph-bar';
    const group = document.createElement('div');
    group.className = 'view-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Dimensions');
    const views: [string, string][] = [
      ['1D', 'Sequence: the chain flattened into its amino-acid sequence'],
      ['2D', 'Topology: the chain unrolled across the membrane'],
      ['3D', 'Structure: the topology rolled up into the 3-D structure'],
    ];
    const buttons = views.map(([text, label], k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'view-button';
      if (k === 2) b.classList.add('morph-toggle');
      b.dataset.dimension = String(k + 1);
      b.textContent = text;
      b.title = label;
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', k === 1 ? 'true' : 'false');
      b.addEventListener('click', () => (this.dimension = k + 1));
      group.appendChild(b);
      return b;
    });
    const hint = document.createElement('span');
    hint.className = 'morph-hint';
    hint.textContent = 'Drag to rotate';
    const fs = document.createElement('button');
    fs.type = 'button';
    fs.className = 'fullscreen-button';
    fs.addEventListener('click', () => void this.toggleFullscreen());
    this._fsButton = fs;
    this.syncFullscreenButton();
    bar.append(group, hint, fs);
    if (!available) {
      buttons[2].disabled = true;
      buttons[2].title = 'No 3-D view for this chain: its 3-D coordinates are incomplete';
      return bar;
    }
    const warm = (): void => {
      void this.loadMorph().then((m) => m?.precompute());
    };
    bar.addEventListener('pointerenter', warm, { once: true });
    bar.addEventListener('focusin', warm, { once: true });
    return bar;
  }

  /** Bring the switch in step with the view, and tell the page where it is. */
  private syncViewBar(bar: HTMLDivElement): void {
    const p = this.viewPosition;
    const shown = Math.round(this._dimensionRaf ? this.targetPosition : p) + 1;
    for (const b of bar.querySelectorAll<HTMLButtonElement>('.view-button')) {
      b.setAttribute('aria-pressed', Number(b.dataset.dimension) === shown ? 'true' : 'false');
    }
    bar.classList.toggle('is-3d', p > 1);
    // The views resize and scroll the picture, so the edges change too.
    this._scrollBox?.update();
    if (p !== this._lastPosition) {
      this._lastPosition = p;
      this.dispatchEvent(
        new CustomEvent('dimension-change', {
          detail: { dimension: 1 + p },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private bindSequenceBar(bar: HTMLDivElement, seq: SequenceController): void {
    seq.onChange = () => this.syncViewBar(bar);
  }

  /** Keep the bar in step with the morph once it is loaded. */
  private bindMorphBar(bar: HTMLDivElement, morph: MorphController): void {
    morph.onChange = () => this.syncViewBar(bar);
  }
}

/** Four corners pointing out (enter full screen) or in (leave). */
function fullscreenIcon(exit: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    exit ? 'M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5' : 'M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5',
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  svg.appendChild(path);
  return svg;
}

/**
 * A data series for the sequence view (see {@link TopologyDisplay.sequenceTracks}),
 * drawn as a colour strip.
 */
export interface SequenceTrack {
  /** Shown beside the strip. */
  label?: string;
  /**
   * Values keyed by chain ID, then residue number: numbers are coloured on
   * the scale, strings are taken as CSS colours.
   */
  values: Record<string, Record<string | number, number | string>>;
  /** Colour stops, low → high; the theme's data scale by default. */
  scale?: string[];
  /** Value range; by default the data's. */
  domain?: [number, number];
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
