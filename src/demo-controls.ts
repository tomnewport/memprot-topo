/**
 * Demo-page controls for every `<topology-display>` attribute (issue #15).
 *
 * Each control writes its attribute on the displays it targets; a control at
 * its default removes the attribute, so the component's own default applies.
 * `DEMO_CONTROLS` must cover every observed attribute except `protein-data`
 * (enforced by a unit test), so new attributes need an entry here.
 */
import { DEFAULT_MORPH_OPTIONS } from './morph/renderer.js';

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
    attribute: 'debug-loops',
    kind: 'toggle',
    default: false,
    on: 'on',
    off: 'off',
    scope: 'all',
    description: 'Draw loop control points for debugging.',
  },
  {
    attribute: 'loop-extreme-points',
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
    attribute: 'morph-sweep',
    kind: 'number',
    default: DEFAULT_MORPH_OPTIONS.sweep,
    min: 0,
    max: 1,
    step: 0.05,
    scope: 'all',
    description: '3-D morph rolling-wave width (fraction of chain); 0 rolls all at once.',
  },
  {
    attribute: 'morph-projection',
    kind: 'select',
    default: 'isometric',
    options: ['isometric', 'perspective'],
    scope: 'all',
    description: 'Projection of the finished 3-D view.',
  },
  {
    attribute: 'morph-strand-width',
    kind: 'number',
    default: DEFAULT_MORPH_OPTIONS.strandWidth,
    min: 0.5,
    max: 10,
    step: 0.1,
    scope: 'all',
    description: 'Strand ribbon width in the 3-D view (Å).',
  },
  {
    attribute: 'morph-strand-thickness',
    kind: 'number',
    default: DEFAULT_MORPH_OPTIONS.strandThickness,
    min: 0.1,
    max: 5,
    step: 0.1,
    scope: 'all',
    description: 'Strand ribbon thickness in the 3-D view (Å).',
  },
  {
    attribute: 'selection',
    kind: 'text',
    default: '',
    placeholder: 'e.g. A:45-60',
    scope: 'each',
    description: 'Residue selection: chain, chain:residue or chain:start-end.',
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
    for (const sync of syncs) sync();
  };
}
