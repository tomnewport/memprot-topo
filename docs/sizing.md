# Sizing and scrolling

`<topology-display>` lays out like a regular block element. The `fit`
attribute chooses how wide it is.

| `fit`             | Width                                         | Diagram wider than the box                          |
| ----------------- | --------------------------------------------- | --------------------------------------------------- |
| `width` (default) | Fills its container, like a `div`.            | Scrolls horizontally inside the box.                |
| `content`         | As wide as its content; the box hugs diagram. | Never scrolls; the element may overflow its parent. |

Only the diagram scrolls. The chain picker, chain label and 3-D controls stay
in place above it.

When part of the diagram is scrolled out of view, that edge of the box shows a
shaded gradient and an arrow button. The arrow scrolls half the box's width,
smoothly unless the reader prefers reduced motion, in which case it jumps.
Both update as the box is scrolled or resized and while the 3-D morph runs.

## Plot scale and height

Two attributes size the 2-D diagram itself (issue #27).

| Attribute | Default | Meaning                                                                    |
| --------- | ------- | -------------------------------------------------------------------------- |
| `scale`   | `2.5`   | px per Å, the same on both axes, so tilts are drawn true.                  |
| `height`  | auto    | Height of the plot in px, between the top and bottom margins (36 px each). |

`scale` stretches the plot, not the drawing: helices, strands, loop widths,
the gap between elements and residue labels keep their size in px, so at a
larger scale the elements are longer but no thicker, and sit closer together
in Å. The 3-D view and the transitions to it and to the sequence view start
from the scaled 2-D picture.

By default the plot shows the membrane and 1.5 membrane thicknesses above and
below it. "Membrane thickness" is the bulk headgroup separation (see
[membrane.md](membrane.md)), so a 40 Å membrane gives a window from −80 Å to
+80 Å about the midplane: 400 px at the default scale. `height` replaces that
window's height; it is then `height ÷ scale` Å tall.

When the protein reaches past the window, the window moves up or down to take
in as much of it as it can, but never so far that less than a quarter of the
membrane's thickness stays in view. A protein taller than the window centres
it on the protein, under the same limit. Whatever is still outside the window
is cut off.

Invalid, zero or negative values fall back to the defaults.

## Full screen

The **Full screen** button at the right of the view switch shows the element
over the whole screen (issue #73). It uses the browser's Fullscreen API where
it can; where it can't (iPhone Safari) the element covers the window instead.
Escape, or the button (now **Exit full screen**), leaves.

In full screen the diagram box takes all the height the controls leave and is
zoomed to fit the 2-D topology: as large as fits, up to 4×. A diagram wider
than the screen is not shrunk to fit; it scrolls sideways at natural size. One
taller than the screen is shrunk to fit, but not below 0.6×. The 1-D and 3-D
views share the zoom, and the 3-D view fills the box's height. On a short
landscape screen (a phone on its side) the title and chain picker move to a
column on the left.

The full-screen zoom multiplies `scale`, and unlike `scale` it also enlarges
text and line widths: `scale` sets the plot at 1×, and full screen magnifies
the whole picture.

The element carries a `fullscreen` attribute while it is full screen, and
fires `fullscreen-change` (`detail.fullscreen`) on entering and leaving. Pages
can also call `toggleFullscreen()`, `requestFullscreenView()` and
`exitFullscreenView()`; entering the browser's full screen needs a user
gesture, so call them from a click.

The window-covering fallback is `position: fixed`, so it covers the viewport
only when no ancestor has a `transform`, `filter` or `contain` that would trap
it.
