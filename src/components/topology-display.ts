import type { ChainData, ProteinData } from '../types.js';
import { selectTransmembraneChains } from '../orientation/index.js';
import { analyseBarrel, analyseAssemblyBarrel, type BarrelAnalysis } from '../contacts/index.js';
import {
  parseSeriesAttribute,
  readDataTheme,
  resolveColouring,
  widthFactors,
  type ResidueColourValues,
  type ResidueSeries,
  type ResidueWidthValues,
} from './residue-data.js';
import type { IconMembrane } from './chain-icon.js';
import { ScrollBox } from './scroll-box.js';
import type { View3DScene } from '../view3d/types.js';
import type { View3DController, View3DState } from '../view3d/controller.js';
import type { View3DOptions } from '../view3d/options.js';
import type { Fishnet } from '../view3d/net.js';
import { PROJECTIONS } from '../view3d/projections.js';
import {
  DEFAULT_MEMBRANE_STYLE,
  MEMBRANE_STYLES,
  type MembraneStyle,
} from '../view3d/membrane-style.js';
import type { SequenceSource } from '../sequence/types.js';
import { SequenceController } from '../sequence/controller.js';
import { DEFAULT_SEQUENCE_OPTIONS, type SequenceOptions } from '../sequence/renderer.js';
import { SEQ } from '../sequence/layout.js';
import {
  DEFAULT_BULK,
  DEFAULT_MEMBRANE_DETAIL,
  membraneCore,
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
  view3dColours,
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
import { FullscreenController, type FullscreenChangeDetail } from './fullscreen.js';
import {
  DEFAULT_TRANSITION_MS,
  DimensionController,
  renderViewBar,
  type DimensionChangeDetail,
} from './dimension-controller.js';
import { BandBlend } from './band-blend.js';
import {
  bindElements,
  chainBounds,
  elementDetail,
  parseSelection,
  styleSelection,
  type TopologyElementDetail,
  type TopologySelection,
} from './selection.js';
import { sequenceLanes, type SequenceTrack } from './sequence-lanes.js';
import {
  DataNumbering,
  residueNumberingName,
  type ResidueNumberingName,
} from './data-numbering.js';

export { DEFAULT_MIN_HELIX_LENGTH, DEFAULT_MIN_STRAND_LENGTH, effectiveSsSegments };
export { DEFAULT_TRANSITION_MS, parseSelection };
export type {
  DimensionChangeDetail,
  FullscreenChangeDetail,
  SequenceTrack,
  TopologyElementDetail,
  TopologySelection,
};

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
  scene: View3DScene | null;
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

/** A `membrane-detail` change blends over this fraction of `transition-time`. */
const MEMBRANE_BLEND = 0.25;

/** The membrane as drawn, for blending to a new `membrane-detail`. */
interface MembraneSnapshot {
  /** Path data of the 2-D band. */
  band: string | null;
  /** The 3-D membrane, while the 3-D view is shown. */
  net: Fishnet | null;
}

/** Default rolling-wave width for the 2-D → 3-D morph (see `transition-sweep`). */
const DEFAULT_TRANSITION_SWEEP = 0.35;

/** Default strand arrowhead width over ribbon width in the 3-D view (4.65 / 2.85 Å). */
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

/** `detail` of `theme-change` events: the name of the theme now in use. */
export interface ThemeChangeDetail {
  name: string;
}

/** The events `<topology-display>` dispatches, by type. All bubble and are composed. */
export interface TopologyDisplayEventMap {
  'chain-select': CustomEvent<TopologySelection>;
  'element-click': CustomEvent<TopologyElementDetail>;
  /** `detail` is null when the pointer leaves an element. */
  'element-hover': CustomEvent<TopologyElementDetail | null>;
  'dimension-change': CustomEvent<DimensionChangeDetail>;
  'theme-change': CustomEvent<ThemeChangeDetail>;
  'fullscreen-change': CustomEvent<FullscreenChangeDetail>;
}

/** Attribute values that turn a boolean attribute off. */
const OFF_VALUES = ['off', 'false', 'none', '0'];

/**
 * Read a boolean attribute: absent gives `fallback`; present means on, unless
 * its value is `off`, `false`, `none` or `0` (any case).
 */
export function booleanAttribute(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return !OFF_VALUES.includes(value.trim().toLowerCase());
}

/** The space-separated, lower-cased tokens of the `debug` attribute. */
export function debugTokens(value: string | null): Set<string> {
  return new Set((value ?? '').toLowerCase().split(/\s+/).filter(Boolean));
}

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = [
    'protein-data',
    'debug',
    'loop-extremes',
    'loop-extreme-threshold',
    'show-contacts',
    'dimension',
    'transition-time',
    'sequence-wrap',
    'transition-sweep',
    'structure-projection',
    'structure-strand-width',
    'structure-strand-thickness',
    'structure-grid-spacing',
    'structure-membrane-style',
    'chain-icon-bandwidth',
    'fit',
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
    'residue-numbering',
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
  /** Moves residue data given in UniProt numbering onto the structure. */
  private readonly _numbering = new DataNumbering(() => this.render({ keepView: true }));
  /** What the displayed chain's 3-D view is built from, until it is needed. */
  private _view3dSource: {
    scroll: HTMLElement;
    svg: SVGSVGElement;
    scene: View3DScene;
    /** The structure's other chains, shown around it in 3-D (built on first use). */
    context: () => View3DScene[];
    options: Partial<View3DOptions>;
    bar: HTMLDivElement;
  } | null = null;
  private _view3d: View3DController | null = null;
  /** The displayed chain's sequence ↔ topology transition. */
  private _seq: SequenceController | null = null;
  /** Extra data lanes for the sequence view (see {@link sequenceTracks}). */
  private _sequenceTracks: SequenceTrack[] = [];
  /** Moves the view between dimensions and keeps the view switch in step. */
  private readonly _dimension = new DimensionController({
    element: this,
    seq: () => this._seq,
    view3d: () => this._view3d,
    has3d: () => this._view3dSource !== null,
    loadView3D: () => this.loadView3D(),
    setTransitionProgress: (tau) => this.setTransitionProgress(tau),
    leave2d: () => this.finishBand(),
    onMove: () => this._scrollBox?.update(),
  });
  private _view3dLoad: Promise<View3DController | null> | null = null;
  /** A view a redraw is restoring while the 3-D code loads. */
  private _pendingView: View3DState | null = null;
  /** Running blend of the 2-D membrane band after a `membrane-detail` change. */
  private readonly _band = new BandBlend();
  private _scrollBox: ScrollBox | null = null;
  private readonly _fs = new FullscreenController({
    element: this,
    box: () => this._scrollBox,
    svg: () => this._shown?.svg ?? null,
    onFillHeight: (height) => this._view3d?.setFillHeight(height),
  });
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
  // it survives cosmetic re-renders (chain pick, show-contacts, debug).
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
    if (this._view3dSource) {
      Object.assign(this._view3dSource.scene.style, view3dColours(theme));
      this._view3d?.restyle();
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
   * The numbering residue data ({@link residueColours}, {@link residueWidths},
   * {@link sequenceTracks}) is keyed by: `author`, the structure's own
   * (default), or `uniprot`, mapped onto the structure with PDBe's SIFTS
   * file for {@link proteinData}'s `pdbId`, fetched on first use. Unset or
   * unknown values give `author`. See docs/residue-data.md.
   */
  get residueNumbering(): ResidueNumberingName {
    return residueNumberingName(this.getAttribute('residue-numbering'));
  }

  /** Set the numbering; writes the `residue-numbering` attribute (null removes it). */
  set residueNumbering(value: ResidueNumberingName | null) {
    if (value === null) this.removeAttribute('residue-numbering');
    else this.setAttribute('residue-numbering', value);
  }

  /** `series` in the structure's numbering; null while that is being looked up. */
  private structureNumbered<T>(series: ResidueSeries<T> | null): ResidueSeries<T> | null {
    return this._numbering.series(series, this.residueNumbering, this._data?.pdbId);
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
      if (value !== old && this._seq) this._dimension.animateTo(this._dimension.target);
      return;
    }
    if (name === 'transition-time') return;
    if (name === 'sequence-wrap' || name === 'fit') {
      // `fit` is otherwise CSS-only; fit="content" changes the sequence wrap.
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
      name === 'transition-sweep' ||
      name === 'structure-projection' ||
      name === 'structure-strand-width' ||
      name === 'structure-strand-thickness' ||
      name === 'structure-grid-spacing' ||
      name === 'structure-membrane-style'
    ) {
      // 3-D only: update the 3-D view in place, keeping its view.
      if (this._view3dSource) {
        this._view3dSource.options = this.view3dOptions;
        this._view3d?.setOptions(this._view3dSource.options);
      }
      return;
    }
    if (name === 'chain-icon-bandwidth') {
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
      name === 'debug' ||
      name === 'loop-extremes' ||
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
    if (name === 'residue-numbering') {
      if (residueNumberingName(value) !== residueNumberingName(old))
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
   * Whether loop control points are drawn for debugging: the `loops` token
   * of the space-separated `debug` attribute (`debug="loops"`). Debug tokens
   * are not part of the stable API.
   */
  private get showLoopPoints(): boolean {
    return debugTokens(this.getAttribute('debug')).has('loops');
  }

  /**
   * Whether β-sheet residue contacts are overlaid as ties between paired
   * strands (`show-contacts`, a boolean attribute; off by default).
   */
  private get showContacts(): boolean {
    return booleanAttribute(this.getAttribute('show-contacts'), false);
  }

  /**
   * Width of the rolling wave in the 2-D → 3-D morph, as a fraction of the
   * chain (`transition-sweep`, default 0.35). 0 rolls the whole chain up at once;
   * larger values roll it up progressively from the N-terminal end.
   */
  private get transitionSweep(): number {
    const v = Number.parseFloat(this.getAttribute('transition-sweep') ?? '');
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TRANSITION_SWEEP;
  }

  /**
   * Projection of the finished 3-D view (`structure-projection`): `isometric`
   * (default, parallel) or `perspective` (35 mm-equivalent).
   */
  private get structureProjection(): keyof typeof PROJECTIONS {
    return this.getAttribute('structure-projection') === 'perspective'
      ? 'perspective'
      : 'isometric';
  }

  /**
   * Strand ribbon size in the 3-D view, in Å (`structure-strand-width`,
   * `structure-strand-thickness`; defaults 2.85 × 1.0). The arrowhead keeps its
   * default proportion to the ribbon width. Invalid or non-positive values
   * fall back to the defaults.
   */
  private get structureStrandOptions(): Partial<View3DOptions> {
    const read = (name: string): number | null => {
      const v = Number.parseFloat(this.getAttribute(name) ?? '');
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const opts: Partial<View3DOptions> = {};
    const width = read('structure-strand-width');
    if (width !== null) {
      opts.strandWidth = width;
      opts.arrowWidth = width * STRAND_ARROW_RATIO;
    }
    const thickness = read('structure-strand-thickness');
    if (thickness !== null) opts.strandThickness = thickness;
    return opts;
  }

  /**
   * Spacing (Å) of the 3-D membrane grid (`structure-grid-spacing`), at least
   * 2 Å; unset, `auto` or invalid gives 0, which sizes it from the membrane
   * disc (an eighth of its radius, 4–8 Å).
   */
  private get structureGridSpacing(): number {
    const v = Number.parseFloat(this.getAttribute('structure-grid-spacing') ?? '');
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  /** How the 3-D view draws the leaflets (`structure-membrane-style`); `grid` unless valid. */
  private get structureMembraneStyle(): MembraneStyle {
    const v = this.getAttribute('structure-membrane-style');
    return (MEMBRANE_STYLES as readonly string[]).includes(v ?? '')
      ? (v as MembraneStyle)
      : DEFAULT_MEMBRANE_STYLE;
  }

  /** Assemble the 3-D view options from the component's attributes. */
  private get view3dOptions(): Partial<View3DOptions> {
    return {
      sweep: this.transitionSweep,
      ...PROJECTIONS[this.structureProjection],
      ...this.structureStrandOptions,
      gridSpacing: this.structureGridSpacing,
      membraneStyle: this.structureMembraneStyle,
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
   * Smoothing for the chain-picker violins (`chain-icon-bandwidth`): the σ, in Å, of
   * the Gaussian applied on top of the per-row residue counts (one row is half
   * a membrane thickness). Defaults to 0, the plain per-row histogram; invalid
   * or negative values fall back to the default.
   */
  private get iconBandwidth(): number {
    const v = Number.parseFloat(this.getAttribute('chain-icon-bandwidth') ?? '');
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
    const extremePoints = booleanAttribute(this.getAttribute('loop-extremes'), true);
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
    this._fs.leave();
  }

  /** Whether the element is shown full screen. */
  get fullscreen(): boolean {
    return this._fs.active;
  }

  /**
   * Show the element full screen, with the diagram scaled to fit. Uses the
   * Fullscreen API where the browser allows it (not iPhone Safari), else
   * covers the window. Escape, or the button, leaves.
   */
  requestFullscreenView(): Promise<void> {
    return this._fs.request();
  }

  /** Leave full screen. */
  exitFullscreenView(): Promise<void> {
    return this._fs.exit();
  }

  /** Enter full screen, or leave it. */
  toggleFullscreen(): Promise<void> {
    return this._fs.toggle();
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
  get transitionProgress(): number {
    return this._view3d?.progress ?? 0;
  }

  /**
   * Jump the morph to `tau` ∈ [0, 1] without animating. Resolves once the
   * frame is drawn (the 3-D code is loaded on first use).
   */
  async setTransitionProgress(tau: number): Promise<void> {
    if (tau > 0) this.finishBand();
    (await this.loadView3D())?.setProgress(tau);
  }

  /** Animate between the 2-D topology and the 3-D view. */
  async toggle3d(): Promise<void> {
    this.dimension = this.dimension > 2.5 ? 2 : 3;
    // Resolves once the 3-D code is loaded (and, with no animation, drawn).
    await this.loadView3D();
  }

  /**
   * The displayed chain's 3-D view controller. The 3-D code is loaded on
   * first use, so pages that never show the 3-D view don't pay for it.
   */
  private loadView3D(): Promise<View3DController | null> {
    const src = this._view3dSource;
    if (!src) return Promise.resolve(null);
    if (this._view3d) return Promise.resolve(this._view3d);
    this._view3dLoad ??= import('../view3d/controller.js')
      .then(({ View3DController }) => {
        // Re-rendered (new chain or settings) while loading: stale.
        if (this._view3dSource !== src) return null;
        const view = new View3DController(
          src.scroll,
          src.svg,
          src.scene,
          `mp${this._instanceId}`,
          src.options,
          src.context(),
        );
        this._view3d = view;
        view.setFillHeight(this._fs.fillHeight);
        view.setSelection(this.view3dSelection());
        view.onChange = () => this._dimension.sync(src.bar);
        return view;
      })
      .catch((err: unknown) => {
        // Let a later click try again (e.g. after a network blip).
        this._view3dLoad = null;
        throw err;
      });
    return this._view3dLoad;
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
    const view: View3DState | null = !keepView
      ? null
      : (this._view3d?.view ??
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
    this._view3d?.dispose();
    this._view3d = null;
    this._view3dSource = null;
    this._view3dLoad = null;
    this._scrollBox?.dispose();
    this._scrollBox = null;
    this._fs.button = null;
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
    const membraneCoreEdges = membraneCore(this.membrane?.bulk ?? DEFAULT_BULK);
    const autoPick = selectTransmembraneChains(chainsWithCoords, {
      max: 1,
      core: membraneCoreEdges,
    });
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
      c.calphas.filter((ca) => ca.z > membraneCoreEdges.lower && ca.z < membraneCoreEdges.upper),
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
      !this._dimension.animating &&
      (!view || (view.tau <= 0 && !view.animating)) &&
      (seqView === null || seqView >= 1);
    if (membraneFrom?.band && still2d) this.blendBand(svg, membraneFrom.band);
    this.bindElements(svg, selectedChain.chainId);
    this.applySelection();
    sequence.lanes = sequenceLanes(
      selectedChain.chainId,
      sequence.residues,
      this.chainDisplayData(selectedChain.chainId)?.style.colour,
      this.getAttribute('colour-label') || 'Colour',
      this.numberedTracks(),
      this._theme.dataScale,
    );
    const seq = new SequenceController(
      scroll,
      svg,
      sequence,
      this.sequenceOptions,
      this._theme,
      decor2d,
    );
    this._seq = seq;
    const bar = renderViewBar(
      scene !== null,
      (dimension) => (this.dimension = dimension),
      () => void this.loadView3D().then((m) => m?.precompute()),
      this._fs.createButton(),
    );
    seq.onChange = () => this._dimension.sync(bar);
    if (scene) {
      // Every other chain, except the protomers an assembly barrel already draws.
      const drawn = new Set(
        assembly?.analysis.ringOrder.map((i) => assembly!.analysis.strands[i].chainId),
      );
      const others = chainsWithCoords.filter(
        (c) => c.chainId !== selectedChain.chainId && !drawn.has(c.chainId),
      );
      const theme = this._theme;
      this._view3dSource = {
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
        options: this.view3dOptions,
        bar,
      };
    }
    block.appendChild(bar);
    block.appendChild(box.frame);
    region.appendChild(block);

    this._contentEl.appendChild(region);
    if (this._fs.active) this._fs.fit();

    if (view) this.restoreView(view, membraneFrom?.net ?? null);
    if (seqView !== null) {
      if (seqView < 1) seq.setProgress(seqView);
    } else {
      // A fresh view starts at the page's `dimension`, without animating.
      this._dimension.cancel();
      this._dimension.apply(this._dimension.target);
    }
  }

  /**
   * Put the re-rendered chain back in `view`, loading the 3-D view only if
   * needed, and blend its 3-D membrane from `net` (the one drawn before).
   */
  private restoreView(view: View3DState, net: Fishnet | null = null): void {
    this._scrollBox!.scroll.scrollLeft = view.scroll0;
    if (view.tau <= 0 && !view.animating) return;
    const src = this._view3dSource;
    if (!src) return;
    // Until the 3-D view is restored, a further redraw carries this view on.
    this._pendingView = view;
    void this.loadView3D().then((m) => {
      if (this._view3dSource !== src) return;
      this._pendingView = null;
      m?.restore(view);
      // Not while the view moves between dimensions: that redraws every frame.
      if (!this._dimension.animating) m?.blendMembraneFrom(net, this.membraneBlendTime);
    });
  }

  /** The membrane as drawn now, to blend from after a `membrane-detail` change. */
  private membraneSnapshot(): MembraneSnapshot {
    return {
      band: this._shown?.svg.querySelector('path.membrane')?.getAttribute('d') ?? null,
      net: this._view3d?.membraneNet ?? null,
    };
  }

  /** Time (ms) a `membrane-detail` change takes to blend. */
  private get membraneBlendTime(): number {
    return MEMBRANE_BLEND * this._dimension.transitionTime;
  }

  /** Blend the 2-D membrane band in `svg` from path data `from` to the band drawn there now. */
  private blendBand(svg: SVGSVGElement, from: string): void {
    this._band.start(svg, from, this.membraneBlendTime);
  }

  /** End any 2-D band blend, showing the band it was heading for. */
  private finishBand(): void {
    this._band.finish();
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
    const colours = this.structureNumbered(this._residueColours);
    const colouring = resolveColouring(
      colours,
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
    const widths = widthFactors(this.structureNumbered(this._residueWidths), chainId);
    const chainColoured = !!colours?.[chainId] && colouring !== null;
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

  private emit<K extends keyof TopologyDisplayEventMap>(
    type: K,
    detail: TopologyDisplayEventMap[K]['detail'],
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /**
   * Wire the SS element buttons: hover/focus emits `element-hover` (detail
   * null on leave), click/Enter/Space selects the element's residues and
   * emits `element-click`.
   */
  private bindElements(svg: SVGSVGElement, chainId: string): void {
    bindElements(
      svg,
      (el) => {
        if (el === this._hovered) return;
        this._hovered = el;
        this.emit('element-hover', el ? elementDetail(el, chainId) : null);
      },
      (el) => {
        const detail = elementDetail(el, chainId);
        this.selectByUser(detail);
        this.emit('element-click', detail);
      },
    );
  }

  /** Style the on-screen elements and loops that overlap the selection. */
  private applySelection(): void {
    if (!this._shown) return;
    const sel = this.selection;
    const hit = sel && sel.chainId === this._shown.chain.chainId ? sel : null;
    styleSelection(this._shown.svg, hit);
    this._view3d?.setSelection(this.view3dSelection());
  }

  /** The selected residue range on the shown chain, for the 3-D view. */
  private view3dSelection(): { start: number; end: number } | null {
    const sel = this.selection;
    if (!sel || !this._shown || sel.chainId !== this._shown.chain.chainId) return null;
    return { start: sel.start, end: sel.end };
  }

  /**
   * The view's dimensionality, live: 1 (sequence), 2 (topology), 3
   * (structure), or in between while animating (1.3 is 30% of the way from
   * the sequence to the topology). Setting it writes the `dimension`
   * attribute, which animates there at `transition-time` ms per dimension.
   */
  get dimension(): number {
    return 1 + this._dimension.position;
  }

  set dimension(value: number) {
    this.setAttribute('dimension', String(value));
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

  /** {@link sequenceTracks} in the structure's numbering (see {@link residueNumbering}). */
  private numberedTracks(): SequenceTrack[] {
    return this._sequenceTracks.flatMap((track) => {
      const values = this.structureNumbered(track.values);
      return values ? [{ ...track, values }] : [];
    });
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
