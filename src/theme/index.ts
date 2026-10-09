/**
 * Themes (issue #26): the purely visual side of the diagram — colours, line
 * widths, typefaces and rounding. Layout and the scientific rendering
 * (unrolling, kernel widths, element sizes) are not themeable.
 *
 * Two themes are built in, `light` and `dark`. A page picks one with the
 * `theme` attribute, or names the themes to follow the system colour scheme
 * with (`theme-light`, `theme-dark`). More can be added with
 * {@link registerTheme}.
 */

export interface Theme {
  // Interface around the diagram.
  /** Diagram background, and the ground the 3-D view fogs towards. */
  background: string;
  /** Panel behind the chain picker. */
  surface: string;
  /** Body text. */
  text: string;
  /** Secondary text: notes, captions, the morph bar. */
  textMuted: string;
  /** Borders of the diagram box and panels. */
  border: string;
  /** Buttons, focus rings and the picked chain. */
  accent: string;
  /** Text on an accent background. */
  accentText: string;

  // Diagram.
  helix: string;
  helixEdge: string;
  strand: string;
  strandEdge: string;
  /** Loops (coil). */
  loop: string;
  membrane: string;
  membraneEdge: string;
  /** 3-D surface style: where a leaflet rises above, or drops below, its bulk plane. */
  membraneRaised: string;
  membraneLowered: string;
  /** Membrane midplane (z = 0) line. */
  midplane: string;
  /** β-sheet contact ties. */
  contact: string;
  /** Residue-number labels. */
  label: string;
  /** Outline of the SS element under the pointer or keyboard focus. */
  hover: string;

  // Chain-picker icons (helix, strand and text come from above).
  iconBackground: string;
  iconCoil: string;
  iconOutline: string;
  iconGrid: string;
  iconMembraneDark: string;
  iconMembraneLight: string;

  // Per-residue data colours (#23).
  /** Palette for categories with no colour of their own. */
  dataCategories: readonly string[];
  /** Colour stops of the default numerical scale, low → high. */
  dataScale: readonly string[];

  // Line widths (px).
  /** Helix and strand outlines. */
  outlineWidth: number;
  loopWidth: number;
  membraneEdgeWidth: number;
  midplaneWidth: number;
  contactWidth: number;
  /** Outline of a hovered or focused element. */
  hoverWidth: number;
  /** Outline of a selected element (selected loops are drawn 0.5 px wider). */
  selectionWidth: number;
  /** Blur radius (px) of the selection glow; 0 turns it off. */
  selectionGlowBlur: number;
  /**
   * How much brighter than the element the selection glow is: the percentage
   * of white mixed into the element's own colour (helix, strand or loop).
   */
  selectionGlowBrighten: number;
  /**
   * Saturation (1 = unchanged) of the helices, strands and loops outside the
   * selection, while there is one.
   */
  unselectedSaturation: number;

  // Type.
  /** Interface text and residue-number labels. */
  fontFamily: string;
  /** Chain names in the picker and its icons. */
  serifFontFamily: string;
  /** The chain summary line. */
  monoFontFamily: string;

  // Rounding.
  /** Corner radius (px) of panels, buttons, the diagram box and icon frames. */
  cornerRadius: number;
  /** Corners of helix and strand outlines and loop bends. */
  lineJoin: 'round' | 'bevel' | 'miter';
}

export type ThemeName = string;

/** A theme to register: any tokens, the rest taken from `extends` (default `light`). */
export type ThemeInput = Partial<Theme> & { extends?: ThemeName };

/** Viridis, sampled at 9 stops. */
export const VIRIDIS: readonly string[] = Object.freeze([
  '#440154',
  '#472d7b',
  '#3b528b',
  '#2c728e',
  '#21918c',
  '#28ae80',
  '#5ec962',
  '#addc30',
  '#fde725',
]);

/** Tableau 10. */
export const TABLEAU_10: readonly string[] = Object.freeze([
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
]);

export const LIGHT_THEME: Readonly<Theme> = Object.freeze({
  background: '#ffffff',
  surface: '#fafafa',
  text: '#212529',
  textMuted: '#6c757d',
  border: '#e0e0e0',
  accent: '#1f77b4',
  accentText: '#ffffff',

  helix: '#6e8db6',
  helixEdge: '#3e587a',
  strand: '#6ea76d',
  strandEdge: '#3d6d3d',
  loop: '#666666',
  membrane: '#eaeaea',
  membraneEdge: '#bdbdbd',
  membraneRaised: '#d6604d',
  membraneLowered: '#4393c3',
  midplane: '#666666',
  contact: '#c98a3b',
  label: '#333333',
  hover: '#111111',

  iconBackground: '#ffffff',
  iconCoil: '#f7f7f7',
  iconOutline: '#2b2b2b',
  iconGrid: '#d6d6d6',
  iconMembraneDark: '#c4c4c4',
  iconMembraneLight: '#e9e9e9',

  dataCategories: TABLEAU_10,
  dataScale: VIRIDIS,

  outlineWidth: 1.5,
  loopWidth: 1.8,
  membraneEdgeWidth: 1,
  midplaneWidth: 1,
  contactWidth: 1,
  hoverWidth: 2.5,
  selectionWidth: 3.5,
  selectionGlowBlur: 5,
  selectionGlowBrighten: 15,
  unselectedSaturation: 0.75,

  fontFamily: 'sans-serif',
  serifFontFamily: 'Georgia, "Times New Roman", serif',
  monoFontFamily: 'monospace',

  cornerRadius: 4,
  lineJoin: 'round',
});

export const DARK_THEME: Readonly<Theme> = Object.freeze({
  ...LIGHT_THEME,
  background: '#1c1d20',
  surface: '#232428',
  text: '#e4e6e8',
  textMuted: '#9ba1a6',
  border: '#3a3d42',
  accent: '#5aa9e6',
  accentText: '#0d1b26',

  helix: '#7d9cc6',
  helixEdge: '#b9cbe5',
  strand: '#7db97c',
  strandEdge: '#b9dcb8',
  loop: '#a6a6a6',
  membrane: '#3b3e44',
  membraneEdge: '#62666d',
  membraneRaised: '#f4a582',
  membraneLowered: '#92c5de',
  midplane: '#8d9197',
  contact: '#dba760',
  label: '#d2d4d6',
  hover: '#ffffff',

  // Brighter glow reads better on a dark ground.
  selectionGlowBrighten: 35,

  iconBackground: '#1c1d20',
  iconCoil: '#3a3d42',
  iconOutline: '#c9cbce',
  iconGrid: '#3a3d42',
  iconMembraneDark: '#4b4f55',
  iconMembraneLight: '#33363b',
});

const registry = new Map<ThemeName, Readonly<Theme>>([
  ['light', LIGHT_THEME],
  ['dark', DARK_THEME],
]);

const listeners = new Set<(name: ThemeName) => void>();

/**
 * Add a named theme, or replace one (including `light` and `dark`). Tokens
 * not given come from the theme named by `extends` (default `light`).
 * Diagrams already showing a theme of that name restyle at once.
 */
export function registerTheme(name: ThemeName, input: ThemeInput): Readonly<Theme> {
  const { extends: base = 'light', ...tokens } = input;
  const parent = registry.get(base);
  if (!parent) throw new Error(`registerTheme: unknown base theme "${base}"`);
  const theme = Object.freeze({ ...parent, ...withoutUndefined(tokens) });
  registry.set(name, theme);
  for (const notify of listeners) notify(name);
  return theme;
}

/** A registered theme by name, or undefined. */
export function getTheme(name: ThemeName): Readonly<Theme> | undefined {
  return registry.get(name);
}

/** Names of the registered themes. */
export function themeNames(): ThemeName[] {
  return [...registry.keys()];
}

/** Call `listener` with a theme's name whenever it is registered; returns an unsubscribe. */
export function onThemeRegistered(listener: (name: ThemeName) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** CSS custom property for a token: `helixEdge` → `--mp-helix-edge`. */
export function themeVar(token: keyof Theme): string {
  return `--mp-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Tokens whose CSS value is a length in px. */
const PX_TOKENS = new Set<keyof Theme>([
  'outlineWidth',
  'loopWidth',
  'membraneEdgeWidth',
  'midplaneWidth',
  'contactWidth',
  'hoverWidth',
  'selectionWidth',
  'selectionGlowBlur',
  'cornerRadius',
]);

/** Tokens whose CSS value is a percentage. */
const PCT_TOKENS = new Set<keyof Theme>(['selectionGlowBrighten']);

/** The value of a token as an SVG attribute or CSS value. */
export function themeValue(theme: Theme, token: keyof Theme): string {
  const v = theme[token];
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** `:host` declarations exposing every token as a `--mp-*` custom property. */
export function themeCss(theme: Theme): string {
  const decls = (Object.keys(theme) as (keyof Theme)[]).map((token) => {
    const value = themeValue(theme, token);
    const unit = PX_TOKENS.has(token) ? 'px' : PCT_TOKENS.has(token) ? '%' : '';
    return `${themeVar(token)}: ${value}${unit};`;
  });
  return `:host {\n  ${decls.join('\n  ')}\n}`;
}

/**
 * Which theme to show: `theme` if it is registered, otherwise the
 * `theme-light` or `theme-dark` theme for the colour scheme (falling back to
 * the built-in `light` / `dark` when those are unset or unknown).
 */
export function resolveThemeName(
  attrs: { theme: string | null; light: string | null; dark: string | null },
  dark: boolean,
): ThemeName {
  const known = (n: string | null): n is string => n !== null && registry.has(n);
  if (known(attrs.theme)) return attrs.theme;
  const scheme = dark ? attrs.dark : attrs.light;
  if (known(scheme)) return scheme;
  return dark ? 'dark' : 'light';
}

/** Attribute → token pairs an element is painted with. */
export type Paint = Partial<Record<string, keyof Theme>>;

/**
 * Paint an SVG element from theme tokens. The element remembers its tokens,
 * so {@link repaint} can (re)style it in place for any theme; without a
 * `theme` the attributes are left for that first repaint.
 */
export function paint(el: Element, tokens: Paint, theme?: Theme): void {
  const entries = Object.entries(tokens).filter((e): e is [string, keyof Theme] => !!e[1]);
  const spec = entries.map(([attr, token]) => `${attr}=${token}`).join(';');
  el.setAttribute('data-mp-paint', spec);
  if (theme) for (const [attr, token] of entries) el.setAttribute(attr, themeValue(theme, token));
}

/** Re-apply `theme` to every painted element under (and including) `root`. */
export function repaint(root: Element, theme: Theme): void {
  const els = [root, ...root.querySelectorAll('[data-mp-paint]')];
  for (const el of els) {
    const spec = el.getAttribute('data-mp-paint');
    if (!spec) continue;
    for (const pair of spec.split(';')) {
      const [attr, token] = pair.split('=') as [string, keyof Theme];
      if (attr && token && token in theme) el.setAttribute(attr, themeValue(theme, token));
    }
  }
}
