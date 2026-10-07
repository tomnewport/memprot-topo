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
