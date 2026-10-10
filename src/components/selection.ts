import type { ChainData } from '../types.js';

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
export interface ParsedSelection {
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
export function chainBounds(chain: ChainData): { start: number; end: number } {
  let start = Infinity;
  let end = -Infinity;
  for (const ca of chain.calphas) {
    if (ca.resSeq < start) start = ca.resSeq;
    if (ca.resSeq > end) end = ca.resSeq;
  }
  return { start, end };
}

/** Event detail for an SS element polygon. */
export function elementDetail(el: Element, chainId: string): TopologyElementDetail {
  const d = (el as SVGElement).dataset;
  return {
    chainId,
    start: Number(d.start),
    end: Number(d.end),
    type: d.type === 'strand' ? 'strand' : 'helix',
  };
}

/**
 * Wire the SS element buttons in `svg`: pointer or focus on an element calls
 * `hover` with it (null on leave; repeats are the caller's to drop), and
 * click/Enter/Space calls `activate`. Delegated on the svg so one listener
 * set serves every element.
 */
export function bindElements(
  svg: SVGSVGElement,
  hover: (el: Element | null) => void,
  activate: (el: Element) => void,
): void {
  const target = (e: Event): Element | null =>
    e.target instanceof Element ? e.target.closest('.ss-element') : null;
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
 * Style the elements and loops in `svg` that overlap `hit` (a range on the
 * chain drawn there, or null for none). An element or loop counts as
 * selected when any of its residues is in range.
 */
export function styleSelection(
  svg: SVGSVGElement,
  hit: { start: number; end: number } | null,
): void {
  let any = false;
  for (const el of svg.querySelectorAll<SVGElement>('.ss-element, .loop')) {
    const on =
      hit !== null && Number(el.dataset.start) <= hit.end && Number(el.dataset.end) >= hit.start;
    any ||= on;
    el.classList.toggle('selected', on);
    if (el.classList.contains('ss-element')) el.setAttribute('aria-pressed', String(on));
  }
  svg.classList.toggle('has-selection', any);
}
