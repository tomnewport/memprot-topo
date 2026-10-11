/**
 * SVG export (issue #25): the 1-D sequence or 2-D topology of a chain as a
 * standalone SVG file, drawn afresh from its layout in any theme rather than
 * cloned from the live view. Every colour, width and typeface is an attribute
 * on the element it styles, so the file needs no stylesheet; interactive
 * markup (buttons, hit areas, theme bookkeeping) is left out.
 *
 * The 3-D view is not exported.
 */

import type { ChainLayout } from '../layout/chain-layout.js';
import { SequenceRenderer, type SequenceOptions } from '../sequence/renderer.js';
import type { SequenceSource } from '../sequence/types.js';
import { themeValue, type Theme } from '../theme/index.js';
import { ICON, renderChainIcon, type ChainIconShape, type IconLabel } from './chain-icon.js';
import { iconColours } from './chain-picker.js';
import { render2d, type ChainDisplayData } from './render-2d.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The view to export: the 2-D topology or the 1-D sequence. */
export type ExportView =
  | {
      dimension: 2;
      layout: ChainLayout;
      /** Residue data and its legend, as in the live view. */
      display?: ChainDisplayData;
    }
  | {
      dimension: 1;
      sequence: SequenceSource;
      /** Width (px) the rows wrap to. */
      width: number;
      options: SequenceOptions;
    };

/** One chain icon over the picture; `selected` marks the exported chain. */
export interface ExportIcon {
  shape: ChainIconShape | null;
  label: IconLabel;
  selected: boolean;
}

export interface SvgExportOptions {
  /** Chain icons to draw in a row over the picture (none when absent or empty). */
  icons?: { icons: ExportIcon[]; maxDensity: number } | null;
  /** Fill the picture with the theme's background (default true); false leaves it transparent. */
  background?: boolean;
}

/** Room (px) around each icon, for the selected chain's highlight. */
const ICON_PAD = 3;
/** Space (px) between icons, and between the icon row and the picture. */
const ICON_GAP = 6;

/** Attributes that only matter to the live, interactive view. */
const LIVE_ATTRIBUTES = [
  'xmlns',
  'data-mp-paint',
  'role',
  'tabindex',
  'aria-pressed',
  'pointer-events',
];

/** The picture of `view` alone, as its own svg. */
function drawView(view: ExportView, theme: Theme): SVGSVGElement {
  if (view.dimension === 2) {
    return render2d(view.layout, theme, { display: view.display }).svg;
  }
  const renderer = new SequenceRenderer(view.sequence, view.options, theme);
  renderer.configure(view.width, 0);
  renderer.render(0);
  const svg = renderer.svg;
  svg.removeAttribute('style');
  svg.removeAttribute('class');
  return svg;
}

/**
 * Strip what only the live view uses: loop curves that stand in as hit areas
 * under residue data (the stylesheet hides them), the element-button markup
 * and the theme bookkeeping.
 */
function cleanse(root: Element): void {
  for (const hitArea of root.querySelectorAll('.loop.has-data')) hitArea.remove();
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const attr of LIVE_ATTRIBUTES) el.removeAttribute(attr);
    if (el !== root) el.removeAttribute('aria-label');
  }
}

/** The row of chain icons, and its size. */
function drawIcons(
  { icons, maxDensity }: NonNullable<SvgExportOptions['icons']>,
  theme: Theme,
): { group: SVGGElement; width: number; height: number } {
  const colours = iconColours(theme);
  const w = ICON.columns * ICON.cellW + 2 * ICON.pad;
  const h = ICON.rows * ICON.cellH + 2 * ICON.pad;
  const cell = w + 2 * ICON_PAD;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'chain-icons');
  icons.forEach(({ shape, label, selected }, k) => {
    const x = k * (cell + ICON_GAP);
    if (selected) {
      // The picker's highlight: a tint of the accent, edged with it.
      const ring = document.createElementNS(SVG_NS, 'rect');
      ring.setAttribute('x', String(x + 0.5));
      ring.setAttribute('y', '0.5');
      ring.setAttribute('width', String(cell - 1));
      ring.setAttribute('height', String(h + 2 * ICON_PAD - 1));
      ring.setAttribute('rx', String(theme.cornerRadius + 2));
      ring.setAttribute('fill', theme.accent);
      ring.setAttribute('fill-opacity', '0.14');
      ring.setAttribute('stroke', theme.accent);
      group.appendChild(ring);
    }
    const icon = renderChainIcon(shape, maxDensity, label, colours);
    // The faint grid shows only on the selected chain, as in the picker.
    if (!selected) icon.querySelector('.icon-grid')?.remove();
    icon.removeAttribute('aria-hidden');
    icon.setAttribute('x', String(x + ICON_PAD));
    icon.setAttribute('y', String(ICON_PAD));
    group.appendChild(icon);
  });
  const width = icons.length * cell + Math.max(0, icons.length - 1) * ICON_GAP;
  return { group, width, height: h + 2 * ICON_PAD };
}

/**
 * The view as a standalone svg element: the picture drawn in `theme`, on the
 * theme's background unless that is turned off, under an optional row of
 * chain icons.
 */
export function exportSvgElement(
  view: ExportView,
  theme: Theme,
  { icons = null, background = true }: SvgExportOptions = {},
): SVGSVGElement {
  const picture = drawView(view, theme);
  const [minX, minY, width, height] = picture.getAttribute('viewBox')!.split(' ').map(Number);
  const label = picture.getAttribute('aria-label');

  const row = icons && icons.icons.length > 0 ? drawIcons(icons, theme) : null;
  const top = row ? row.height + ICON_GAP : 0;
  const W = Math.max(width, row?.width ?? 0);
  const H = top + height;

  // The serialiser declares the namespace.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${fmt(W)} ${fmt(H)}`);
  svg.setAttribute('width', fmt(W));
  svg.setAttribute('height', fmt(H));
  svg.setAttribute('font-family', themeValue(theme, 'fontFamily'));
  if (label) {
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = label;
    svg.appendChild(title);
  }
  if (background) {
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('class', 'background');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', theme.background);
    svg.appendChild(bg);
  }
  if (row) svg.appendChild(row.group);

  // The picture keeps its own coordinates inside a nested viewport.
  picture.removeAttribute('aria-label');
  picture.setAttribute('x', '0');
  picture.setAttribute('y', fmt(top));
  picture.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  picture.setAttribute('width', fmt(width));
  picture.setAttribute('height', fmt(height));
  svg.appendChild(picture);
  cleanse(svg);
  return svg;
}

/** {@link exportSvgElement} serialised as the text of an `.svg` file. */
export function exportSvg(view: ExportView, theme: Theme, options: SvgExportOptions = {}): string {
  const svg = exportSvgElement(view, theme, options);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}\n`;
}

function fmt(v: number): string {
  return String(Math.round(v * 100) / 100);
}
