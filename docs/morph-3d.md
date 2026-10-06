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

By default the roll travels as a wave from the N-terminus (`morph-sweep`,
default `0.7`; `0` rolls the whole chain at once). The middle of the picture is
the anchor that stays put.

## Camera

The camera is a dolly-zoom: as the field of view opens from 0 (orthographic —
the 2-D view) to a 35 mm-equivalent perspective, the camera backs off to keep
the scale at the target constant. It also tilts to look slightly down onto the
membrane, re-centres on the protein, and the picture grows from the 2-D strip
to a 3-D-friendly aspect ratio. Drag to orbit once in 3-D.

## Drawing: SVG all the way

Switching renderer mid-transition (SVG → canvas/WebGL) would make the first
frame differ from the 2-D picture. Instead every frame is plain SVG built from
the same primitives as the 2-D renderer, so frame 0 _is_ the 2-D picture: the
static SVG is swapped for the morph SVG without a visible change, and the
finished 3-D view stays vector (and exportable).

- Elements are cut into short sections and drawn back-to-front (painter's
  algorithm), with a BSP-style split on the two membrane planes so the
  translucent leaflet surfaces layer correctly.
- Consecutive sections of the same element are merged into one path whenever
  nothing drawn in between overlaps them on screen (convex-footprint test).
  This keeps the DOM small and avoids anti-aliasing seams; contiguous sections
  are emitted as a single outline polygon for the same reason.
- Shading is Lambert lighting from the upper left with depth fog: cylinders
  use nested bands, ribbons a gradient along the run. Shading, fog, outlines on
  loops and the membrane surfaces all fade in from the flat 2-D style.

## Limitations

- Painter's ordering is per section, so tightly interleaved geometry (e.g. a
  loop threading between two strands) can occasionally be ordered wrongly for a
  few pixels.
- Strand ribbons lie in the curtain (correct for barrel walls). β-sheets in
  non-barrel proteins are not yet oriented by their sheet plane.
- Rendering cost scales with chain length; a 340-residue barrel animates at
  roughly 30–60 fps in headless Chromium without GPU rasterisation.
