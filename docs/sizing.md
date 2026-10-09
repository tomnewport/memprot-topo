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

The element carries a `fullscreen` attribute while it is full screen, and
fires `fullscreen-change` (`detail.fullscreen`) on entering and leaving. Pages
can also call `toggleFullscreen()`, `requestFullscreenView()` and
`exitFullscreenView()`; entering the browser's full screen needs a user
gesture, so call them from a click.

The window-covering fallback is `position: fixed`, so it covers the viewport
only when no ancestor has a `transform`, `filter` or `contain` that would trap
it.
