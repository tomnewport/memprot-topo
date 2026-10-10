import { describe, it, expect, afterEach } from 'vitest';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import { DEMO_CONTROLS, mountDemoControls } from '../../src/demo-controls.js';
import { DEFAULT_VIEW3D_OPTIONS } from '../../src/view3d/options.js';

function setup(n = 2): { panel: HTMLElement; displays: HTMLElement[]; reset: () => void } {
  const panel = document.createElement('div');
  document.body.appendChild(panel);
  const displays = Array.from({ length: n }, () => {
    const d = document.createElement('topology-display');
    document.body.appendChild(d);
    return d;
  });
  const reset = mountDemoControls(panel, displays);
  return { panel, displays, reset };
}

function input(root: ParentNode, attribute: string): HTMLInputElement | HTMLSelectElement {
  const el = root.querySelector(
    `.control[data-attribute="${attribute}"] input, .control[data-attribute="${attribute}"] select`,
  );
  if (!el) throw new Error(`no control for ${attribute}`);
  return el as HTMLInputElement | HTMLSelectElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('demo controls', () => {
  it('has a control for every observed attribute except protein-data', () => {
    const expected = TopologyDisplay.observedAttributes.filter((a) => a !== 'protein-data');
    expect(DEMO_CONTROLS.map((c) => c.attribute).sort()).toEqual([...expected].sort());
  });

  it('labels each control with its attribute name and default', () => {
    const { panel } = setup(1);
    for (const control of DEMO_CONTROLS) {
      const row = document.querySelector(`.control[data-attribute="${control.attribute}"]`);
      expect(row, control.attribute).not.toBeNull();
      expect(row!.querySelector('code')!.textContent).toBe(control.attribute);
      expect(row!.querySelector('.default')!.textContent).toMatch(/^default: \S/);
    }
    expect(panel.querySelector('[data-attribute="selection"]')).toBeNull();
  });

  it('writes shared attributes to every display and removes them at the default', () => {
    const { panel, displays } = setup();
    const contacts = input(panel, 'show-contacts') as HTMLInputElement;
    contacts.checked = true;
    contacts.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.getAttribute('show-contacts')).toBe('on');
    contacts.checked = false;
    contacts.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.hasAttribute('show-contacts')).toBe(false);

    const extreme = input(panel, 'loop-extremes') as HTMLInputElement;
    expect(extreme.checked).toBe(true);
    extreme.checked = false;
    extreme.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.getAttribute('loop-extremes')).toBe('off');

    const width = input(panel, 'structure-strand-width');
    expect(width.value).toBe(String(DEFAULT_VIEW3D_OPTIONS.strandWidth));
    width.value = '5';
    width.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.getAttribute('structure-strand-width')).toBe('5');

    const projection = input(panel, 'structure-projection');
    projection.value = 'perspective';
    projection.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.getAttribute('structure-projection')).toBe('perspective');
  });

  it('picks a theme for every display; auto removes it', () => {
    const { panel, displays } = setup();
    const theme = input(panel, 'theme');
    expect(theme.value).toBe('auto');
    theme.value = 'high-contrast';
    theme.dispatchEvent(new Event('input'));
    for (const d of displays) {
      expect(d.getAttribute('theme')).toBe('high-contrast');
      expect((d as TopologyDisplay).activeThemeName).toBe('high-contrast');
    }
    theme.value = 'auto';
    theme.dispatchEvent(new Event('input'));
    for (const d of displays) expect(d.hasAttribute('theme')).toBe(false);
  });

  it('sets selection per display and reflects changes the display makes', async () => {
    const { displays } = setup();
    const field = input(displays[0].previousElementSibling!, 'selection');
    field.value = 'A:1-5';
    field.dispatchEvent(new Event('change'));
    expect(displays[0].getAttribute('selection')).toBe('A:1-5');
    expect(displays[1].hasAttribute('selection')).toBe(false);

    displays[0].setAttribute('selection', 'B');
    await new Promise((r) => setTimeout(r, 0));
    expect(field.value).toBe('B');
  });

  it('resets every control and attribute to its default', () => {
    const { panel, displays, reset } = setup();
    const sweep = input(panel, 'transition-sweep');
    sweep.value = '0';
    sweep.dispatchEvent(new Event('input'));
    expect(displays[0].getAttribute('transition-sweep')).toBe('0');
    reset();
    expect(displays[0].hasAttribute('transition-sweep')).toBe(false);
    expect(sweep.value).toBe(String(DEFAULT_VIEW3D_OPTIONS.sweep));
  });
});
