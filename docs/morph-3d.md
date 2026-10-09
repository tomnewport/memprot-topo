# 2-D → 3-D morph

The `3D` button (and the scrubber next to it) rolls the unrolled topology up
into a 3-D Richardson-style diagram — helices as cylinders, strands as arrowed
ribbons, loops as smooth tubes, in a cut-away membrane slab — and back again
(issue #22). This note records how it works and why.

## The curtain

The 2-D view is the _development_ of a vertical surface — a "curtain" hung
along the chain's path in the membrane plane:

- **arc-length unroll** (helical bundles): the curtain follows the chain's own
  smoothed xy path; every sample sits on it.
- **cylindrical unwrap** (β-barrels): the curtain is the barrel cylinder; each
  residue keeps a small offset off it (along the curtain normal and tangent).

A developable surface can be bent without stretching, so the morph bends the
curtain rather than interpolating positions: at progress `t` every turn of the
curtain's base curve is scaled by `t`. Lengths along the curtain never change,
so helices and strands keep their shape and the strip curls like paper; at
`t = 1` the curtain is the real path (or the barrel) again and every element
sits exactly where it is in the structure (unit tests check this is a rigid
motion of the real coordinates). Strands slide along the barrel curtain from
their laid-out 2-D spacing to their true spacing as it closes.

On the barrel curtain, each sample's position along it is its real angle round
the barrel, not the 2-D unwrap's. The unwrap holds its angle while the chain
dips inside the barrel (OmpF/OmpC's L3 loop), so the plot doesn't fan out, and
so drops however far the chain turned in there. Using that angle put every
later strand up to half a turn away from its curtain point: positions still
came out right through large offsets, but the curtain's heading (which orients
the strand ribbons and their lighting) belonged to the wrong side of the
barrel, and the strands rendered as twisted, edge-on slivers.

Things the 2-D layout invents are blended out as the curtain rolls:

- loop gaps are a fixed width in 2-D — the curtain stretches them to their real
  arc length;
- loop curves are synthetic Bézier arcs in 2-D — they blend into the real
  (smoothed) loop path;
- element widths grow from the 2-D bar width to 3-D cylinder / ribbon sizes, and
  non-barrel strands grow their arrowheads.

By default the roll travels as a wave from the N-terminus to the C-terminus
(`morph-sweep`, default `0.35` of the chain; `0` rolls the whole chain at once).
Each joint of the curtain bends by its own share of the final turn, so the strip
rolls up like a carpet: the finished part is already a rigid copy of the real
structure, the rest is still flat, and the curtain never curls tighter than it
will at the end. On the barrel curtain the samples also slide (from their 2-D
spacing to their real one), so its curvature at each point follows the
progress of the samples sitting there at that moment, not a fixed position
along the strip.

The curtain is built outwards from one anchor sample, which on its own would
make whatever is furthest from the anchor swing round like a lever. So the
renderer precomputes a steadying track: it steps through the morph and, at each
step, finds the rotation about the membrane normal and the shift that best line
every sample up with the previous step (least squares). Applying that track
leaves only the motion the roll itself needs; across the demo proteins it cuts
total on-screen motion by 2–3× and the largest per-frame jump by 2–5×. It is
sampled once per transition, so scrubbing back and forth is repeatable. One
consequence: the final orientation is the one that best matches where the parts
sat in the 2-D strip, not a chosen "best" view (drag to orbit).

## Camera

The finished view is isometric by default: a parallel projection looking down
on the membrane at atan(1/√2) ≈ 35.3°, so sizes don't change with depth. The
camera tilts down into that view as the strip rolls up, re-centres on the
protein, and the picture grows from the 2-D strip to a 3-D-friendly aspect
ratio. A precomputed zoom track backs the camera off where a half-rolled frame
would otherwise run out of the picture.

Once in 3-D, drag to orbit, or use the arrow keys on the focused diagram. On
touch screens a horizontal drag turns the view and a vertical swipe still
scrolls the page (the diagram can fill most of a phone screen), so tilting is
mouse/pen/keyboard only. The framing is refitted when the container changes
width. With `prefers-reduced-motion: reduce` the 3D button jumps straight to
the other view instead of animating.

The selection is shown in 3-D as in 2-D: selected elements and loops glow in
their own colour and are outlined wider (by `selectionWidth / outlineWidth`).
Each depth-sorted run of a selected element carries `class="selected"` and
`data-type`, which the component's styles give the glow.

Attribute and data changes keep the view. The `morph-*` attributes and
`selection` update the 3-D picture in place, so it keeps its progress, orbit and any running
animation. 2-D drawing attributes (`debug-loops`, `loop-*`, `show-contacts`, `min-*-length`, residue data and `colour-*`),
a chain switch and new protein data redraw but restore the scroll position and
3-D view; new data also keeps the user's chain pick and selection when it has
that chain. `icon-bandwidth` redraws only the chain picker. Re-assigning the
same `proteinData` object does nothing. To start afresh, call `resetView()`:
it returns to the 2-D view of the default chain and forgets the user's chain
pick, selection and orbit (attributes the page set are kept).

`morph-strand-width` and `morph-strand-thickness` set the strand ribbon size
in Å (defaults 2.85 × 1.0; the arrowhead, 4.65 Å, scales with the width).
Neighbouring barrel strands are ≈ 4.8 Å apart, so the default leaves a gap
between ribbons and keeps arrowheads from cutting into the next strand. The
issue's suggested ~10 × 2.5 Å works, but the strands then overlap heavily.

`morph-grid-spacing` sets the membrane grid's spacing in Å (from 2 Å up to
the disc's radius; unset, `auto` or `0` sizes it from the membrane disc, an
eighth of its radius within 4–8 Å). A finer grid shows more of the local
surface but adds lines to every frame.

`morph-membrane-style` picks how the leaflets are drawn:

| `morph-membrane-style` | Drawn                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `grid` (default)       | A square grid of lines, `morph-grid-spacing` apart.                                          |
| `polar`                | Rings and spokes: rings follow the protein's outline near it and become circles further out. |
| `surface`              | A translucent surface per leaflet, coloured by its rise or drop from the bulk plane.         |

The polar rings are spaced by `morph-grid-spacing`. The first follows the
protein-lipid interface, taken as 4 Å out from the drawn protein's
membrane-spanning samples, and the next ones keep a constant distance from it
out to about 10 Å (the largest whole number of spacings up to 10 Å, at least
one). From there to the circle where the bulk starts (5 Å in from the rim), the
rings follow a harmonic blend (Laplace's equation, solved on a 1 Å lattice)
from the outline to the circle, so their shape eases from one to the other.
The spokes are about `morph-grid-spacing` apart round that circle. Each runs
straight in from the rim and then down the blend's gradient towards the
protein. It stops at the interface, at a pore, or where it comes within half
a spacing of another spoke. Pores the protein encloses (not reachable from
outside without crossing the interface) get no lines.

The surface is a 2 Å mesh over the disc, drawn behind the protein like the
sheets it replaces. It is coloured by the bilayer's local thickness (upper
leaflet height minus lower) against the bulk's, in 1 Å bands from `membrane`
at the bulk thickness towards `membraneThinned` where the bilayer is thinner
and `membraneThickened` where it is thicker, reaching full strength at 6 Å
either way. Both leaflets take the same colour at each point, so a bilayer
that bends without changing thickness stays uncoloured. Where only the other
leaflet is open (a pore on that side alone), a leaflet's own shift from its
bulk plane is doubled, as if the bilayer were symmetric there. The bands meet
along smooth contours. The upper leaflet is
40 % opaque and the lower 30 %. A piece of protein seen through the surface
takes the colour of the band where its line of sight first crosses the
surface (found by marching along the line of sight about every 1 Å across the
leaflet's height range, then bisecting), so the tint matches the surface in
front of it, with the far leaflet's colour under the near one's. Pores stay
open: next to a pore the surface is drawn over the part of each mesh cell
nearest its lipid corners, which is also where the tint stops. There is no
colour key in the view yet.

`morph-projection="perspective"` switches to a dolly-zoom instead: the field of
view opens from 0 (orthographic, the 2-D view) to a 35 mm-equivalent
perspective while the camera backs off to keep the scale at the target constant.

## Drawing: SVG all the way

Switching renderer mid-transition (SVG → canvas/WebGL) would make the first
frame differ from the 2-D picture. Instead every frame is plain SVG built from
the same primitives as the 2-D renderer, so frame 0 _is_ the 2-D picture: the
static SVG is swapped for the morph SVG without a visible change, and the
finished 3-D view stays vector (and exportable).

- Elements are cut into short sections and drawn back-to-front (painter's
  algorithm).
- The leaflet surfaces are translucent sheets, but they are not painted over
  the protein: that would need every piece split by the planes in drawing
  order, and a piece straddling a plane can only be drawn on one side of it,
  which showed as strands split lengthwise into light and dark wedges. Instead
  the sheet fills are drawn behind the protein, and every piece whose line of
  sight passes through a sheet takes the sheet's tint in its own colour (the
  same colour compositing would give). Strands, helices and loops are cut
  exactly where that changes — where they pass through a plane, or where the
  line of sight leaves the sheet past its rim — so the boundary is a clean cut
  across the element. The rims are depth-sorted with the protein, so the near
  rim passes in front of whatever lies behind it and marks the edge of the
  tint.
- Each leaflet also carries a fishnet: a square grid of thin lines over its
  disc (4–8 Å apart by default; see `morph-grid-spacing` above), depth-sorted
  with the protein like the rims, so the membrane stays visible without hiding
  the protein. The net follows the leaflet's height: the local surface from a
  distortions file (averaged over 1.5 grid cells, kept within 6–12 Å), or
  else the annular height next to the protein easing to the bulk 4–14 Å away.
  Where the file has no lipid within 6 Å and the drawn protein surrounds the
  point (its membrane-spanning parts lie in all twelve 30° sectors around it:
  a pore), the net is left open. Where it has none elsewhere (other subunits,
  which the view doesn't draw; the drawn protein's own footprint; or past the
  file's edge) the net is filled in as a stretched membrane would be: each
  point there is the mean of its neighbours along the lines, held by the lipid
  around the gap and the bulk at the rim, so it neither tears nor steps. The
  disc reaches 19 Å past the farthest membrane-spanning helix or strand
  sample (at least 29 Å from its centre): room for the annular leaflet to ease
  to the bulk (4 + 10 Å), then a flat ring of bulk 5 Å wide at the edge
  (`BULK_MARGIN` in `src/morph/net.ts`). Inside that ring the net eases to
  the bulk over the outer fifth. It grows out of the flat planes as the sheets
  fade in. The tinted sheets stay at the bulk planes. With
  `morph-membrane-style="polar"` the lines are rings and spokes instead, and
  with `"surface"` the sheets themselves follow the heights and are coloured
  by them (see above). See [membrane.md](membrane.md).
- Consecutive sections of the same element are merged into one path whenever
  nothing drawn in between overlaps them on screen (convex-footprint test).
  This keeps the DOM small and avoids anti-aliasing seams; contiguous sections
  are emitted as a single outline polygon for the same reason. A merged run
  draws all its fills before its lines, so a loop that crosses itself on screen
  must not share a run with its own far piece: pieces further apart along the
  loop than a few tube widths that overlap start a new run.
- Helices become straight cylinders, as in a Richardson diagram: the sample
  trace (a smoothed local axis, which bends and hooks at the ends where its
  window is one-sided) is pulled onto a line fitted to it as the cylinder
  grows, or onto two lines meeting at a real kink (> 20° between the halves'
  axes, each half at least 7.5 Å of trace, decided once from the real
  structure; shorter halves let the end hooks pass for kinks, and the helix
  grew a stub cylinder at a sharp angle on its end). Samples are spread along the
  line by their fraction of the trace's length, so a hooked trace can't fold
  the cylinder back on itself. Loops ease onto the moved helix ends within a
  few Å. A gentle kink bends one cylinder outline; one of 45° or more is drawn
  as two cylinders meeting at a ball joint, as a single outline bent that far
  opened at the outside of the bend and showed the inside of the tube.
- Shading is Lambert lighting from the upper left with depth fog. Cylinders get
  a smooth gradient across their width (one per straight stretch, as an SVG
  gradient is straight). Strand faces get a gradient along each straight
  stretch, and loops become tubes with edge lines and a highlight. Shading,
  fog, outlines and the membrane surfaces all fade in from the flat 2-D style.
- Strands are thin boxes: the long side walls keep one dark tone for the
  ribbon's thickness, and the blunt start is lit like a face. The arrowhead
  shoulders' walls face back along the strand and are drawn only when seen
  from behind (left out, the strand's inside showed through as a notch). Where
  two visible faces of a strand meet (face and side wall), a thin line in the
  wall colour covers the anti-aliasing hairline the abutting polygons would
  leave.
- A helix's far end is drawn as the end of its side, in the side's gradient,
  in its own path beneath the body: sharing the body's path, the overlapping
  polygons cancelled under the non-zero fill rule and left white holes.
- Anything that should look the same from frame to frame is computed per
  element, not per depth-sorted run: colours averaged over whichever sections
  happen to share a run, round line ends at run joins, dash patterns restarted
  per path and depth snapping all made the picture shimmer while orbiting.
  Dashes are cut as separate pieces with one pattern along the whole loop, and
  the depth snap that preserves the 2-D drawing order near t = 0 fades out by
  t = 0.3.
- Chain-break dashes match the 2-D figure at t = 0; in 3-D the pattern is laid
  along the loop's length on screen and sized to the (much wider) line, so a
  stretch pointing at the viewer doesn't bunch its dashes into a clump. The
  price is that the dashes slide along the curve as the view turns.
- Faded neighbouring chains (assembly barrels) start at the 2-D figure's
  translucency and become opaque by t = 0.3, with colours lightened so they
  look the same over white. Translucent pieces of one element overlap slightly
  where it is split for depth sorting, which would show as darker lines.

## Limitations

- Painter's ordering is per section, so tightly interleaved geometry (e.g. a
  loop threading between two strands) can occasionally be ordered wrongly for a
  few pixels.
- Strand ribbons lie in the curtain (correct for barrel walls). β-sheets in
  non-barrel proteins are not yet oriented by their sheet plane.
- Rendering cost scales with chain length. In headless Chromium without GPU
  rasterisation, a 340-residue barrel takes about 17–25 ms of script per frame
  (plus style, layout and paint), so it animates at about 30 fps there.
- The morph code is a separate chunk loaded on first use, so pages that never
  show the 3-D view don't download or parse it. The first frame then builds
  the model and the steadying track (about 250–300 ms for the demo proteins in
  the setting above); pointing at or focusing the 3D bar does this ahead of the
  click (about 45–70 ms left), and the steadying track is kept for later
  transitions.
- A chain whose samples lack 3-D positions gets a disabled 3D button rather
  than a picture with parts rolled up to the origin.
