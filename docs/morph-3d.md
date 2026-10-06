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
will at the end.

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
would otherwise run out of the picture. Drag to orbit once in 3-D.

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
- The membrane (leaflet surfaces, slab rim, midplane) is drawn behind the
  protein. Drawn as a translucent sheet over it, the upper leaflet tinted every
  piece below the plane; on strands seen side-on the plane cuts the ribbon
  almost lengthwise on screen, so strands looked half-hidden.
- Consecutive sections of the same element are merged into one path whenever
  nothing drawn in between overlaps them on screen (convex-footprint test).
  This keeps the DOM small and avoids anti-aliasing seams; contiguous sections
  are emitted as a single outline polygon for the same reason.
- Shading is Lambert lighting from the upper left with depth fog. Cylinders get
  a smooth gradient across their width; because an SVG gradient is straight, a
  curved helix is split into stretches that turn by at most 2.5° on screen,
  each with its own. Strand faces get a gradient along each straight stretch,
  and loops become tubes with edge lines and a highlight. Shading, fog,
  outlines and the membrane surfaces all fade in from the flat 2-D style.
- Strands are thin boxes: the long side walls keep one dark tone for the
  ribbon's thickness, and the blunt start is lit like a face. Arrowhead
  shoulders have no walls: seen face-on while the arrowhead is edge-on, they
  showed as small detached rectangles. Where two visible faces of a strand
  meet (face and side wall), a thin line in the wall colour covers the
  anti-aliasing hairline the abutting polygons would leave.
- Anything that should look the same from frame to frame is computed per
  element, not per depth-sorted run: colours averaged over whichever sections
  happen to share a run, round line ends at run joins, dash patterns restarted
  per path and depth snapping all made the picture shimmer while orbiting.
  Dashes are cut as separate pieces pinned to the curve, and the depth snap
  that preserves the 2-D drawing order near t = 0 fades out by t = 0.3.
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
- Rendering cost scales with chain length; a 340-residue barrel animates at
  roughly 30–60 fps in headless Chromium without GPU rasterisation.
