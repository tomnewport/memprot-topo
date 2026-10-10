import { SCROLL_BOX_STYLES } from './scroll-box.js';

/** Shadow-DOM styles of `<topology-display>`. */
export const STYLES = `
  :host {
    display: block;
    font-family: var(--mp-font-family);
    color: var(--mp-text);
    background: var(--mp-background);
    padding: 0.5rem;
    max-width: 100%;
  }
  /* fit="content": as wide as the diagram, never scrolling (it may overflow
     its parent). The default (fit="width") fills the available width and
     scrolls the diagram horizontally when it is wider. */
  :host([fit='content']) {
    display: inline-block;
    width: max-content;
    max-width: none;
  }
  :host([fit='content']) .scroll-frame { width: max-content; }
  .protein-id {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }
  .chain-block { margin-top: 0.75rem; }
  .chain-label {
    font-family: var(--mp-mono-font-family);
    font-size: 0.85rem;
    color: var(--mp-text);
    margin-bottom: 0.25rem;
  }
  .chain-note {
    font-size: 0.8rem;
    color: var(--mp-text-muted);
    font-style: italic;
    margin-top: 0.25rem;
  }
  .chain-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: var(--mp-surface);
    border-radius: var(--mp-corner-radius);
    border: 1px solid var(--mp-border);
  }
  .chain-violin {
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: calc(var(--mp-corner-radius) + 2px);
    display: flex;
    font-family: inherit;
  }
  .chain-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }
  .chain-copy {
    font-family: var(--mp-serif-font-family);
    font-size: 0.75rem;
    padding: 0 0.15rem;
    border: 1px solid var(--mp-border);
    border-radius: max(0px, calc(var(--mp-corner-radius) - 1px));
    background: var(--mp-background);
    color: var(--mp-text);
  }
  .chain-violin .icon-grid { display: none; }
  .chain-violin:hover .icon-grid,
  .chain-violin.selected .icon-grid { display: inline; }
  .chain-violin:hover { background: color-mix(in srgb, var(--mp-accent) 8%, transparent); }
  .chain-violin.selected {
    background: color-mix(in srgb, var(--mp-accent) 14%, transparent);
    border-color: var(--mp-accent);
  }
  .chain-violin:focus-visible {
    outline: 2px solid var(--mp-accent);
    outline-offset: 1px;
  }
  .chain-picker-label {
    font-size: 0.75rem;
    color: var(--mp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .svg-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--mp-background);
    border: 1px solid var(--mp-border);
    border-radius: var(--mp-corner-radius);
  }
  svg {
    display: block;
    max-width: none;
    /* no height: auto — inside overflow-x:auto containers it causes the browser
       to compute height from container width, producing a huge whitespace gap */
  }
  .placeholder { font-style: italic; color: var(--mp-text-muted); }
  .dimension-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
    font-size: 0.75rem;
    color: var(--mp-text-muted);
  }
  .view-button {
    font: inherit;
    font-weight: 600;
    padding: 0.15rem 0.6rem;
    border: 1px solid var(--mp-accent);
    border-radius: var(--mp-corner-radius);
    background: var(--mp-background);
    color: var(--mp-accent);
    cursor: pointer;
  }
  .view-switch { display: inline-flex; }
  .view-switch .view-button { border-radius: 0; margin-left: -1px; }
  .view-switch .view-button:first-child {
    border-radius: var(--mp-corner-radius) 0 0 var(--mp-corner-radius);
    margin-left: 0;
  }
  .view-switch .view-button:last-child { border-radius: 0 var(--mp-corner-radius) var(--mp-corner-radius) 0; }
  .view-button[aria-pressed='true'] { background: var(--mp-accent); color: var(--mp-accent-text); }
  .view-button:disabled { opacity: 0.45; cursor: default; }
  .view-button:focus-visible {
    outline: 2px solid var(--mp-accent);
    outline-offset: 1px;
  }
  .dimension-hint { visibility: hidden; }
  .dimension-bar.is-3d .dimension-hint { visibility: visible; }
  .ss-element { cursor: pointer; outline: none; }
  .ss-element:hover, .ss-element:focus-visible {
    filter: brightness(1.15);
    stroke: var(--mp-hover);
    stroke-width: var(--mp-hover-width);
  }
  /* Selection: a wider outline in the element's own edge colour, and a glow
     in its own colour, brightened. */
  .ss-element[data-type='helix'] { --glow-base: var(--mp-helix); }
  .ss-element[data-type='strand'] { --glow-base: var(--mp-strand); }
  .loop { --glow-base: var(--mp-loop); }
  .ss-element.selected, .loop.selected {
    --glow: color-mix(in srgb, var(--glow-base), white var(--mp-selection-glow-brighten));
    filter: drop-shadow(0 0 var(--mp-selection-glow-blur) var(--glow));
  }
  .ss-element.selected { stroke-width: var(--mp-selection-width); }
  .ss-element.selected:hover, .ss-element.selected:focus-visible {
    filter: brightness(1.15) drop-shadow(0 0 var(--mp-selection-glow-blur) var(--glow));
    stroke-width: calc(var(--mp-selection-width) + 1px);
  }
  .loop.selected { stroke-width: calc(var(--mp-selection-width) + 0.5px); }
  /* While there is a selection, everything else is a little less saturated. */
  .has-selection .ss-element:not(.selected), .has-selection .loop:not(.selected) {
    filter: saturate(var(--mp-unselected-saturation));
  }
  .has-selection .ss-element:not(.selected):hover,
  .has-selection .ss-element:not(.selected):focus-visible {
    filter: saturate(var(--mp-unselected-saturation)) brightness(1.15);
  }
  /* The same glow in the 3-D view (its wider outlines are drawn by the renderer). */
  .view3d-svg .selected[data-type='helix'] { --glow-base: var(--mp-helix); }
  .view3d-svg .selected[data-type='strand'] { --glow-base: var(--mp-strand); }
  .view3d-svg .selected[data-type='loop'] { --glow-base: var(--mp-loop); }
  .view3d-svg .selected {
    --glow: color-mix(in srgb, var(--glow-base), white var(--mp-selection-glow-brighten));
    filter: drop-shadow(0 0 var(--mp-selection-glow-blur) var(--glow));
  }
  /* A loop drawn residue by residue shows its plain curve only as the halo. */
  .loop.has-data { stroke-opacity: 0; }
  .loop.has-data.selected {
    stroke-opacity: 1;
    stroke-width: calc(var(--mp-selection-width) + 2.5px);
  }
  .fullscreen-button {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font: inherit;
    padding: 0.15rem 0.6rem;
    border: 1px solid var(--mp-accent);
    border-radius: var(--mp-corner-radius);
    background: var(--mp-background);
    color: var(--mp-accent);
    cursor: pointer;
  }
  .fullscreen-button:hover { background: color-mix(in srgb, var(--mp-accent) 8%, var(--mp-background)); }
  .fullscreen-button:focus-visible {
    outline: 2px solid var(--mp-accent);
    outline-offset: 1px;
  }
  .fullscreen-button svg { width: 0.9rem; height: 0.9rem; }
  /* Full screen (issue #73): the element covers the screen and the diagram
     box takes the space the controls above it leave. The box is scaled to
     fit (see TopologyDisplay.fitFullscreen) and scrolls both ways. */
  :host([fullscreen]) {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    width: auto;
    height: auto;
    max-width: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: max(0.5rem, env(safe-area-inset-top)) max(0.5rem, env(safe-area-inset-right))
      max(0.5rem, env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left));
  }
  :host([fullscreen]) .content,
  :host([fullscreen]) [role='region'],
  :host([fullscreen]) .chain-block {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* One row of chains, scrolled sideways, so the picker stays short. */
  :host([fullscreen]) .chain-picker { flex-wrap: nowrap; overflow-x: auto; flex: none; }
  :host([fullscreen]) .scroll-frame { flex: 1; min-height: 0; overflow: hidden; }
  /* Sized (in its own, unscaled px) and scaled up by fitFullscreen. */
  :host([fullscreen]) .svg-scroll {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    transform-origin: 0 0;
    overflow: auto;
    display: flex;
  }
  /* Centred while it fits; scrolls from its left/top edge when it doesn't. */
  :host([fullscreen]) .svg-scroll > svg { flex: none; margin: auto; }
  /* A short landscape screen (a phone on its side): the title and chain
     picker move to a column on the left, leaving the height to the diagram. */
  @media (orientation: landscape) and (max-height: 500px) {
    :host([fullscreen]) [role='region'] {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: repeat(4, auto) minmax(0, 1fr);
      align-content: start;
      column-gap: 0.75rem;
    }
    :host([fullscreen]) [role='region'] > * { grid-column: 1; max-width: 6rem; }
    :host([fullscreen]) [role='region'] > .chain-block {
      grid-column: 2;
      grid-row: 1 / -1;
      max-width: none;
      min-height: 0;
    }
    :host([fullscreen]) .chain-picker {
      flex-direction: column;
      flex-wrap: nowrap;
      overflow: hidden auto;
      max-height: calc(100dvh - 6rem);
    }
    :host([fullscreen]) .chain-block { margin-top: 0; }
  }
${SCROLL_BOX_STYLES}`;
