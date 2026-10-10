import type { ChainData } from '../types.js';
import type { Theme } from '../theme/index.js';
import {
  chainIconShape,
  iconZOuter,
  maxIconDensity,
  renderChainIcon,
  type IconColours,
  type IconMembrane,
} from './chain-icon.js';

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++)
    while (n >= vals[i]) {
      out += syms[i];
      n -= vals[i];
    }
  return out;
}

export interface ChainLabel {
  /** The protomer letter shown as the base, e.g. "A" */
  base: string;
  /** Roman numeral suffix when multiple chains share the same residue count, else null */
  suffix: string | null;
  /** Plain-text representation for aria labels etc., e.g. "A(II)" */
  text: string;
}

/**
 * When chains share the same residue count they are almost certainly identical
 * monomers. Rather than showing arbitrary letters (A, B, C for a trimer) we
 * label them A(I), A(II), A(III) — the base letter is that of the first chain
 * in the group, and the suffix is a Roman numeral copy index.
 */
export function buildChainLabels(chains: ChainData[]): Map<string, ChainLabel> {
  const groups = new Map<number, ChainData[]>();
  for (const c of chains) {
    const g = groups.get(c.residueCount) ?? [];
    g.push(c);
    groups.set(c.residueCount, g);
  }
  const labels = new Map<string, ChainLabel>();
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      const c = group[i];
      if (group.length > 1) {
        const roman = toRoman(i + 1);
        labels.set(c.chainId, {
          base: group[0].chainId,
          suffix: roman,
          text: `${group[0].chainId}(${roman})`,
        });
      } else {
        labels.set(c.chainId, { base: c.chainId, suffix: null, text: c.chainId });
      }
    }
  }
  return labels;
}

export function chainLabelNode(lbl: ChainLabel): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = lbl.base;
  if (lbl.suffix) {
    const sub = document.createElement('sub');
    sub.textContent = lbl.suffix;
    span.appendChild(sub);
  }
  return span;
}

export function renderChainPicker(
  chains: ChainData[],
  chainLabels: Map<string, ChainLabel>,
  selectedId: string,
  icon: { membrane: IconMembrane; smoothing: number },
  colours: IconColours,
  onSelect: (chainId: string) => void,
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chain-picker';
  container.setAttribute('role', 'group');

  const zOuter = iconZOuter(chains, icon.membrane);
  const shapes = chains.map((c) => chainIconShape(c, icon.membrane, icon.smoothing, zOuter));
  const maxDensity = maxIconDensity(shapes);

  // Copies of the same chain (A(I), A(II), …) share one icon; a dropdown picks
  // the copy. The icon shows the selected copy, or the first if none is.
  const groups = new Map<string, number[]>();
  chains.forEach((c, i) => {
    const base = chainLabels.get(c.chainId)!.base;
    groups.set(base, [...(groups.get(base) ?? []), i]);
  });

  for (const [base, members] of groups) {
    const shownIdx = members.find((i) => chains[i].chainId === selectedId) ?? members[0];
    const chain = chains[shownIdx];
    const lbl = chainLabels.get(chain.chainId)!;
    const isSelected = chain.chainId === selectedId;

    const group = document.createElement('div');
    group.className = 'chain-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chain-violin' + (isSelected ? ' selected' : '');
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.setAttribute('aria-label', `Select chain ${lbl.text} (${chain.residueCount} residues)`);
    button.title = `Chain ${lbl.text} · ${chain.residueCount} aa`;
    button.appendChild(
      renderChainIcon(shapes[shownIdx], maxDensity, { base, suffix: null }, colours),
    );
    button.addEventListener('click', () => onSelect(chain.chainId));
    group.appendChild(button);

    if (members.length > 1) {
      const select = document.createElement('select');
      select.className = 'chain-copy';
      select.setAttribute('aria-label', `Copy of chain ${base}`);
      for (const i of members) {
        const option = document.createElement('option');
        option.value = chains[i].chainId;
        option.textContent = chainLabels.get(chains[i].chainId)!.suffix ?? '';
        option.selected = i === shownIdx;
        select.appendChild(option);
      }
      select.addEventListener('change', () => onSelect(select.value));
      group.appendChild(select);
    }
    container.appendChild(group);
  }

  return container;
}

/** The chain-picker icon colours of a theme. */
export function iconColours(theme: Theme): IconColours {
  return {
    helix: theme.helix,
    strand: theme.strand,
    coil: theme.iconCoil,
    outline: theme.iconOutline,
    frame: theme.iconOutline,
    grid: theme.iconGrid,
    membraneEdge: theme.iconOutline,
    membraneDark: theme.iconMembraneDark,
    membraneLight: theme.iconMembraneLight,
    label: theme.text,
    background: theme.iconBackground,
    fontFamily: theme.serifFontFamily,
    frameRadius: theme.cornerRadius,
  };
}
