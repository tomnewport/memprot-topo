/**
 * Demo-page controls for every `<topology-display>` attribute (issue #15).
 *
 * Each control writes its attribute on the displays it targets; a control at
 * its default removes the attribute, so the component's own default applies.
 * `DEMO_CONTROLS` must cover every observed attribute except `protein-data`
 * (enforced by a unit test), so new attributes need an entry here.
 */
import { DEFAULT_VIEW3D_OPTIONS } from './view3d/options.js';
import { DEFAULT_MEMBRANE_STYLE, MEMBRANE_STYLES } from './view3d/membrane-style.js';
import { DEFAULT_BULK, DEFAULT_MEMBRANE_DETAIL, MEMBRANE_DETAILS } from './membrane/model.js';
import { registerTheme } from './theme/index.js';
import {
  DEFAULT_TRANSITION_MS,
  DEFAULT_MIN_HELIX_LENGTH,
  DEFAULT_MIN_STRAND_LENGTH,
} from './components/topology-display.js';

/** An example of a page's own theme (#26): black on white, heavier lines, square corners. */
registerTheme('high-contrast', {
  extends: 'light',
  helix: '#4477aa',
  helixEdge: '#000000',
  strand: '#228833',
  strandEdge: '#000000',
  loop: '#000000',
  membrane: '#dddddd',
  membraneEdge: '#000000',
  midplane: '#000000',
  label: '#000000',
  text: '#000000',
  textMuted: '#333333',
  border: '#000000',
  outlineWidth: 2,
  loopWidth: 2.5,
  cornerRadius: 0,
  lineJoin: 'miter',
});

const THEMES = ['light', 'dark', 'high-contrast'];

interface BaseControl {
  attribute: string;
  description: string;
  /**
   * `all`: one control in the shared panel sets every display.
   * `each`: one control per display (values that depend on the protein).
   */
  scope: 'all' | 'each';
}

/** On/off flag. `on` is the value written when checked and not the default. */
export interface ToggleControl extends BaseControl {
  kind: 'toggle';
  default: boolean;
  on: string;
  off: string;
}

export interface NumberControl extends BaseControl {
  kind: 'number';
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface SelectControl extends BaseControl {
  kind: 'select';
  default: string;
  options: string[];
}

export interface TextControl extends BaseControl {
  kind: 'text';
  /** Empty: the attribute is absent by default. */
  default: string;
  placeholder: string;
}

export type DemoControl = ToggleControl | NumberControl | SelectControl | TextControl;

export const DEMO_CONTROLS: DemoControl[] = [
  {
    attribute: 'debug',
    kind: 'select',
    default: 'none',
    options: ['none', 'loops'],
    scope: 'all',
    description: 'Debug drawing (not stable API): loops draws loop control points.',
  },
  {
    attribute: 'loop-extremes',
    kind: 'toggle',
    default: true,
    on: 'on',
    off: 'off',
    scope: 'all',
    description: 'Pull loops out to their real vertical extreme.',
  },
  {
    attribute: 'loop-extreme-threshold',
    kind: 'number',
    // LOOP.extremeThreshold in topology-display.ts.
    default: 0.2,
    min: 0,
    max: 2,
    step: 0.05,
    scope: 'all',
    description: 'How far (fraction of span) a loop must overshoot to get extreme points.',
  },
  {
    attribute: 'show-contacts',
    kind: 'toggle',
    default: false,
    on: 'on',
    off: 'off',
    scope: 'all',
    description: 'Overlay β-sheet residue contacts as ties between strands.',
  },
  {
    attribute: 'min-helix-length',
    kind: 'number',
    default: DEFAULT_MIN_HELIX_LENGTH,
    min: 0,
    max: 20,
    step: 1,
    scope: 'all',
    description: 'Shortest helix (residues) drawn as a helix; shorter ones become loop.',
  },
  {
    attribute: 'min-strand-length',
    kind: 'number',
    default: DEFAULT_MIN_STRAND_LENGTH,
    min: 0,
    max: 20,
    step: 1,
    scope: 'all',
    description: 'Shortest strand (residues) drawn as a strand; shorter ones become loop.',
  },
  {
    attribute: 'dimension',
    kind: 'number',
    default: 2,
    min: 1,
    max: 3,
    step: 0.1,
    scope: 'all',
    description:
      '1 = sequence, 2 = topology, 3 = structure; in between is part-way (1.3 = 30% of the way to 2-D).',
  },
  {
    attribute: 'transition-time',
    kind: 'number',
    default: DEFAULT_TRANSITION_MS,
    min: 0,
    max: 10000,
    step: 100,
    scope: 'all',
    description: 'Time (ms) to animate one whole dimension; 0 jumps straight there.',
  },
  {
    attribute: 'sequence-wrap',
    kind: 'number',
    default: 0,
    min: 0,
    max: 200,
    step: 10,
    scope: 'all',
    description: 'Residues per row in the sequence view; 0 fits whole blocks of ten to the width.',
  },
  {
    attribute: 'transition-sweep',
    kind: 'number',
    default: DEFAULT_VIEW3D_OPTIONS.sweep,
    min: 0,
    max: 1,
    step: 0.05,
    scope: 'all',
    description: '2-D → 3-D rolling-wave width (fraction of chain); 0 rolls all at once.',
  },
  {
    attribute: 'structure-projection',
    kind: 'select',
    default: 'isometric',
    options: ['isometric', 'perspective'],
    scope: 'all',
    description: 'Projection of the finished 3-D view.',
  },
  {
    attribute: 'structure-strand-width',
    kind: 'number',
    default: DEFAULT_VIEW3D_OPTIONS.strandWidth,
    min: 0.5,
    max: 10,
    step: 0.1,
    scope: 'all',
    description: 'Strand ribbon width in the 3-D view (Å).',
  },
  {
    attribute: 'structure-strand-thickness',
    kind: 'number',
    default: DEFAULT_VIEW3D_OPTIONS.strandThickness,
    min: 0.1,
    max: 5,
    step: 0.1,
    scope: 'all',
    description: 'Strand ribbon thickness in the 3-D view (Å).',
  },
  {
    attribute: 'structure-grid-spacing',
    kind: 'number',
    default: 0,
    min: 0,
    max: 20,
    step: 2,
    scope: 'all',
    description: 'Membrane grid spacing in the 3-D view (Å, at least 2); 0 sizes it from the disc.',
  },
  {
    attribute: 'structure-membrane-style',
    kind: 'select',
    default: DEFAULT_MEMBRANE_STYLE,
    options: [...MEMBRANE_STYLES],
    scope: 'all',
    description:
      'Membrane in the 3-D view: a square grid, rings and spokes that follow the protein near it, or a surface coloured by height.',
  },
  {
    attribute: 'chain-icon-bandwidth',
    kind: 'number',
    default: 0,
    min: 0,
    max: 20,
    step: 0.5,
    scope: 'all',
    description: 'Smoothing σ (Å) of the chain-picker violins; 0 is the plain histogram.',
  },
  {
    attribute: 'membrane-upper',
    kind: 'number',
    default: DEFAULT_BULK.upper,
    min: 0,
    max: 50,
    step: 0.5,
    scope: 'all',
    description: 'Bulk upper-leaflet headgroup surface (Å above the midplane).',
  },
  {
    attribute: 'membrane-lower',
    kind: 'number',
    default: DEFAULT_BULK.lower,
    min: -50,
    max: 0,
    step: 0.5,
    scope: 'all',
    description: 'Bulk lower-leaflet headgroup surface (Å; negative is below the midplane).',
  },
  {
    attribute: 'membrane-annular-upper',
    kind: 'number',
    default: DEFAULT_BULK.upper,
    min: 0,
    max: 50,
    step: 0.5,
    scope: 'all',
    description: 'Upper leaflet next to the protein (Å); follows the bulk unless set.',
  },
  {
    attribute: 'membrane-annular-lower',
    kind: 'number',
    default: DEFAULT_BULK.lower,
    min: -50,
    max: 0,
    step: 0.5,
    scope: 'all',
    description: 'Lower leaflet next to the protein (Å); follows the bulk unless set.',
  },
  {
    attribute: 'membrane-detail',
    kind: 'select',
    default: DEFAULT_MEMBRANE_DETAIL,
    options: [...MEMBRANE_DETAILS],
    scope: 'all',
    description:
      'Membrane drawn: flat at the bulk leaflets, annular next to the protein, or the local surface from a distortions file.',
  },
  {
    attribute: 'theme',
    kind: 'select',
    default: 'auto',
    options: ['auto', ...THEMES],
    scope: 'all',
    description: 'Theme to use whatever the colour scheme; auto follows the system.',
  },
  {
    attribute: 'theme-light',
    kind: 'select',
    default: 'light',
    options: THEMES,
    scope: 'all',
    description: 'Theme for a light system colour scheme (when theme is auto).',
  },
  {
    attribute: 'theme-dark',
    kind: 'select',
    default: 'dark',
    options: THEMES,
    scope: 'all',
    description: 'Theme for a dark system colour scheme (when theme is auto).',
  },
  {
    attribute: 'fit',
    kind: 'select',
    default: 'width',
    options: ['width', 'content'],
    scope: 'all',
    description: 'Fill the available width and scroll, or size to the diagram.',
  },
  {
    attribute: 'colour-scale',
    kind: 'text',
    default: '',
    placeholder: '#fff, #c00 or K:#00f, D:red',
    scope: 'all',
    description: 'Residue colour scale: stops low → high, or key:colour pairs for categories.',
  },
  {
    attribute: 'colour-domain',
    kind: 'text',
    default: '',
    placeholder: 'min,max',
    scope: 'all',
    description: 'Numerical colour scale range (default: data range).',
  },
  {
    attribute: 'colour-label',
    kind: 'text',
    default: '',
    placeholder: 'e.g. Conservation',
    scope: 'all',
    description: 'Title of the residue colour legend.',
  },
  {
    attribute: 'selection',
    kind: 'text',
    default: '',
    placeholder: 'e.g. A:45-60',
    scope: 'each',
    description: 'Residue selection: chain, chain:residue or chain:start-end.',
  },
  {
    attribute: 'residue-colours',
    kind: 'text',
    default: '',
    placeholder: '{"A":{"45":0.7,"46":0.2}}',
    scope: 'each',
    description: 'Per-residue colour values (JSON: chain → residue → number or category).',
  },
  {
    attribute: 'residue-widths',
    kind: 'text',
    default: '',
    placeholder: '{"A":{"45":1.5,"46":0}}',
    scope: 'each',
    description: 'Per-residue width factors (JSON: chain → residue → factor; 1 normal, 0 a line).',
  },
  {
    attribute: 'residue-numbering',
    kind: 'select',
    default: 'author',
    options: ['author', 'uniprot'],
    scope: 'all',
    description: 'Numbering of the residue data: the structure’s own, or UniProt (via SIFTS).',
  },
  {
    attribute: 'tracks',
    kind: 'text',
    default: '',
    placeholder: '{"sources":{…},"series":{…},"tracks":[…]}',
    scope: 'each',
    description: 'Data tracks for the sequence view (JSON; see docs/data-tracks.md).',
  },
];

/** The value an input shows when its display has `value` for the attribute. */
function inputValue(control: DemoControl, value: string | null): string | boolean {
  switch (control.kind) {
    case 'toggle':
      return value === null ? control.default : value.toLowerCase() !== control.off;
    case 'number':
      return value ?? String(control.default);
    case 'select':
    case 'text':
      return value ?? control.default;
  }
}

/** The attribute value for an input value; null removes the attribute. */
function attributeValue(control: DemoControl, value: string | boolean): string | null {
  if (control.kind === 'toggle') {
    if (value === control.default) return null;
    return value ? control.on : control.off;
  }
  const v = String(value).trim();
  if (v === '' || v === String(control.default)) return null;
  return v;
}

function defaultLabel(control: DemoControl): string {
  if (control.kind === 'toggle') return control.default ? control.on : control.off;
  if (control.kind === 'text' && control.default === '') return 'none';
  return String(control.default);
}

/**
 * One labelled control for `control`, writing to the displays `targets()`
 * returns. Returns the row and a function that re-reads the input from the
 * first target (for two-way attributes such as `selection`).
 */
export function createControl(
  control: DemoControl,
  targets: () => HTMLElement[],
): { row: HTMLElement; sync: () => void } {
  const id = `ctl-${control.attribute}-${Math.random().toString(36).slice(2, 8)}`;
  const row = document.createElement('div');
  row.className = 'control';
  row.dataset.attribute = control.attribute;
  row.title = control.description;

  const label = document.createElement('label');
  label.htmlFor = id;
  const name = document.createElement('code');
  name.textContent = control.attribute;
  label.appendChild(name);

  let input: HTMLInputElement | HTMLSelectElement;
  if (control.kind === 'select') {
    const select = document.createElement('select');
    for (const opt of control.options) {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      select.appendChild(o);
    }
    input = select;
  } else {
    const el = document.createElement('input');
    if (control.kind === 'toggle') el.type = 'checkbox';
    if (control.kind === 'number') {
      el.type = 'number';
      el.min = String(control.min);
      el.max = String(control.max);
      el.step = String(control.step);
    }
    if (control.kind === 'text') {
      el.type = 'text';
      el.placeholder = control.placeholder;
      el.spellcheck = false;
    }
    input = el;
  }
  input.id = id;

  const read = (): string | boolean =>
    input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value;
  const write = (v: string | boolean): void => {
    if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = v === true;
    else input.value = String(v);
  };

  const apply = (): void => {
    const value = attributeValue(control, read());
    for (const t of targets()) {
      if (value === null) t.removeAttribute(control.attribute);
      else t.setAttribute(control.attribute, value);
    }
  };
  // Text applies on Enter / blur so a half-typed selection doesn't warn.
  input.addEventListener(control.kind === 'text' ? 'change' : 'input', apply);

  const sync = (): void => {
    const first = targets()[0];
    write(inputValue(control, first ? first.getAttribute(control.attribute) : null));
  };
  sync();

  const def = document.createElement('span');
  def.className = 'default';
  def.textContent = `default: ${defaultLabel(control)}`;

  row.append(label, input, def);
  return { row, sync };
}

/**
 * Build the shared parameter panel into `panel` and a per-display row for
 * each `each`-scoped attribute after each display. Returns a reset function
 * that puts every control back to its default.
 */
export function mountDemoControls(panel: HTMLElement, displays: HTMLElement[]): () => void {
  const syncs: (() => void)[] = [];
  const grid = document.createElement('div');
  grid.className = 'control-grid';
  for (const control of DEMO_CONTROLS.filter((c) => c.scope === 'all')) {
    const { row, sync } = createControl(control, () => displays);
    grid.appendChild(row);
    syncs.push(sync);
  }
  panel.appendChild(grid);

  const each = DEMO_CONTROLS.filter((c) => c.scope === 'each');
  for (const display of displays) {
    const rows = document.createElement('div');
    rows.className = 'display-controls';
    for (const control of each) {
      const { row, sync } = createControl(control, () => [display]);
      rows.appendChild(row);
      syncs.push(sync);
      // Reflect the user's picks, which the display writes to its attribute.
      new MutationObserver(sync).observe(display, { attributeFilter: [control.attribute] });
    }
    display.before(rows);
  }

  return () => {
    for (const control of DEMO_CONTROLS) {
      for (const d of displays) d.removeAttribute(control.attribute);
    }
    for (const d of displays) (d as { resetView?: () => void }).resetView?.();
    for (const sync of syncs) sync();
  };
}
