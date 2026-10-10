import { describe, it, expect, afterEach } from 'vitest';
import '../../../src/index.js';
import type { TopologyDisplay } from '../../../src/components/topology-display.js';
import { render2d } from '../../../src/components/render-2d.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { resolveMembrane } from '../../../src/membrane/index.js';
import { getTheme } from '../../../src/theme/index.js';
import { layoutChain } from '../../../src/layout/index.js';
import { threeHelixChain } from '../fixtures/helices.js';

function layout() {
  const chain = threeHelixChain();
  return layoutChain(
    chain,
    { showPoints: false, extremePoints: true, extremeThreshold: 0.2 },
    analyseBarrel(chain.calphas, chain.segments),
    false,
    resolveMembrane({}, null, []),
    chain.calphas.filter((c) => Math.abs(c.z) < 12),
  );
}

describe('render2d', () => {
  it('paints one button per selectable element, one loop per selectable loop and every label', () => {
    const l = layout();
    const { svg, decor2d } = render2d(l, getTheme('light'));
    expect(svg.querySelectorAll('.ss-element').length).toBe(
      l.elements.filter((e) => e.selectable).length,
    );
    expect(svg.querySelectorAll('path.loop').length).toBe(
      l.loops.filter((p) => p.selectable).length,
    );
    expect(svg.querySelectorAll('text').length).toBe(l.labels.filter((x) => x.box).length);
    const { minX, minY, width, height } = l.frame;
    expect(svg.getAttribute('viewBox')).toBe(`${minX} ${minY} ${width} ${height}`);
    expect(decor2d).toHaveLength(1);
  });

  it('draws loop control points only when asked', () => {
    const l = layout();
    expect(render2d(l, getTheme('light')).svg.querySelector('.loop-debug-point')).toBeNull();
    expect(
      render2d(l, getTheme('light'), { showLoopPoints: true }).svg.querySelector(
        '.loop-debug-point',
      ),
    ).not.toBeNull();
  });
});

describe('<topology-display> layout reuse', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const protein = { pdbId: 'tst3', chains: [threeHelixChain()] };
  const colours = JSON.stringify({ A: { 3: 0.2, 30: 0.9, 55: 0.5 } });

  function mount(): TopologyDisplay {
    const el = document.createElement('topology-display') as TopologyDisplay;
    document.body.appendChild(el);
    return el;
  }

  it('restyling redraws from the same layout and matches a fresh render', () => {
    const el = mount();
    el.proteinData = protein;
    const before = (el as unknown as { _layouts: { byKey: Map<string, unknown> } })._layouts;
    const cached = [...before.byKey.values()][0];
    el.setAttribute('residue-colours', colours);
    const after = (el as unknown as { _layouts: { byKey: Map<string, unknown> } })._layouts;
    expect([...after.byKey.values()][0]).toBe(cached);

    const fresh = mount();
    fresh.setAttribute('residue-colours', colours);
    fresh.proteinData = protein;
    const svgOf = (e: TopologyDisplay) =>
      e.shadowRoot!.querySelector('.svg-scroll svg')!.outerHTML.replace(/mp\d+-/g, 'mp-');
    expect(svgOf(el)).toBe(svgOf(fresh));
  });

  it('lays the chain out again when a layout option changes', () => {
    const el = mount();
    el.proteinData = protein;
    const cache = () => (el as unknown as { _layouts: { byKey: Map<string, unknown> } })._layouts;
    el.setAttribute('min-helix-length', '30');
    expect(cache().byKey.size).toBe(2);
    expect(el.shadowRoot!.querySelectorAll('.ss-element').length).toBe(0);
  });
});
