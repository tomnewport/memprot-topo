# Theming

A theme sets the purely visual side of `<topology-display>`: colours, line
widths, typefaces and rounding (issue #26). It does not touch layout or the
scientific rendering — unrolling, element sizes, kernel widths and other
parameters stay as they are.

## Choosing a theme

Two themes are built in, `light` and `dark`. By default the diagram follows
the system colour scheme (`prefers-color-scheme`) and switches live when it
changes.

| Attribute     | Effect                                             |
| ------------- | -------------------------------------------------- |
| `theme`       | Always use this theme, whatever the colour scheme. |
| `theme-light` | Theme for a light colour scheme (default `light`). |
| `theme-dark`  | Theme for a dark colour scheme (default `dark`).   |

`theme` wins over the other two. An unknown name is ignored with a console
warning, falling back to the next choice. `<topology-loader>` passes all three
through to the diagram it creates.

```html
<!-- Follow the system, with a site theme in dark mode -->
<topology-display theme-dark="site-dark"></topology-display>

<!-- Always dark -->
<topology-display theme="dark"></topology-display>
```

The element reports the theme in use as `activeThemeName` and its tokens as
`activeTheme`, and fires `theme-change` (`detail: { name }`) when it changes.

Changing theme restyles the diagram in place: the chain, 2-D scroll position,
3-D view (progress, orbit, any running animation), selection and keyboard
focus are kept. A theme with different data palettes, while per-residue
colours are shown, recolours the data with a redraw that keeps the same view.

## Registering themes

```js
import { registerTheme } from 'memprot2d';
// or TopologyDisplay.registerTheme(...)

registerTheme('site-dark', {
  extends: 'dark', // tokens not given come from here (default 'light')
  background: '#0b1020',
  helix: '#8ab4f8',
  fontFamily: 'Inter, sans-serif',
  cornerRadius: 8,
});
```

Registering a name again replaces it, including `light` and `dark`, and
diagrams showing it restyle at once. `getTheme(name)` and `themeNames()` read
the registry.

## Tokens

| Token                                                             | Used for                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `background`                                                      | Diagram background; the 3-D view fogs towards it                                                                   |
| `surface`                                                         | Chain-picker panel                                                                                                 |
| `text`, `textMuted`                                               | Body and secondary text                                                                                            |
| `border`                                                          | Diagram box and panel borders                                                                                      |
| `accent`, `accentText`                                            | 3D button, focus rings, the picked chain                                                                           |
| `helix`, `helixEdge`, `strand`, `strandEdge`                      | SS element fill and outline (2-D, 3-D and the picker icons)                                                        |
| `loop`                                                            | Loops                                                                                                              |
| `membrane`, `membraneEdge`, `midplane`                            | Membrane slab, its edges and the z = 0 line                                                                        |
| `membraneRaised`, `membraneLowered`                               | 3-D surface style: a leaflet risen above, or dropped below, its bulk plane                                         |
| `contact`                                                         | β-sheet contact ties                                                                                               |
| `label`                                                           | Residue numbers and the colour legend                                                                              |
| `hover`                                                           | Outline of the hovered element                                                                                     |
| `selectionGlowBlur`, `selectionGlowBrighten`                      | Glow round selected elements and loops, in the element's own colour: blur (px, 0 for none) and % of white mixed in |
| `unselectedSaturation`                                            | Saturation of the helices, strands and loops outside the selection while there is one (1 = unchanged)              |
| `iconBackground`, `iconCoil`, `iconOutline`, `iconGrid`           | Chain-picker icons                                                                                                 |
| `iconMembraneDark`, `iconMembraneLight`                           | Membrane band in the icons                                                                                         |
| `dataCategories`, `dataScale`                                     | Default per-residue palettes ([residue-data.md](residue-data.md))                                                  |
| `outlineWidth`, `loopWidth`, `membraneEdgeWidth`, `midplaneWidth` | Line widths (px)                                                                                                   |
| `contactWidth`, `hoverWidth`, `selectionWidth`                    | Line widths (px); selected loops are drawn 0.5 px wider                                                            |
| `fontFamily`, `serifFontFamily`, `monoFontFamily`                 | Interface and labels; chain names; the chain summary line                                                          |
| `cornerRadius`                                                    | Panels, buttons, diagram box and icon frames (px)                                                                  |
| `lineJoin`                                                        | Corners of SS outlines and loop bends: `round`, `bevel`, `miter`                                                   |

Colours the 3-D view shades or mixes (`helix`, `helixEdge`, `strand`,
`strandEdge`, `loop`, `membrane`, `membraneEdge`, `membraneRaised`,
`membraneLowered`, `midplane`, `contact`, `background`) must be `#rgb`,
`#rrggbb` or `rgb(r, g, b)`; the others take any CSS colour.

Per-residue data widths keep their own base width (1.8 px loops), since they
encode data rather than style.

## CSS custom properties

Every token is also set on the host as a custom property, `--mp-` plus the
token in kebab case: `--mp-helix-edge`, `--mp-corner-radius` (in px),
`--mp-data-categories` (comma-separated). The interface chrome (panels,
buttons, borders, text) is styled from these, so a page can adjust it with
CSS:

```css
topology-display {
  --mp-accent: rebeccapurple;
}
```

The diagram itself is drawn with SVG attributes, so a saved SVG keeps its
colours; change diagram tokens with `registerTheme`. The data palettes are the
exception: `--mp-data-scale` and `--mp-data-categories` set on the element
override the theme's.

## How it works

`src/theme/index.ts` holds the registry and the built-in themes. Drawing code
calls `paint(el, { fill: 'helix', … })`, which records the tokens on the
element (`data-mp-paint`); `repaint(svg, theme)` re-applies them, which is how
a theme change recolours the 2-D view without redrawing it. The 3-D morph
takes its colours from the scene style built from the theme, and
`MorphController.restyle()` rebuilds only its renderer.
