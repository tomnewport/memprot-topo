/**
 * Outline geometry for a helix / strand element, shared by the 2-D topology
 * renderer and the 2-D → 3-D morph so both draw exactly the same shape.
 *
 * The element is described as a sequence of cross-sections along its
 * centreline. Each cross-section sits at a (possibly fractional) index into the
 * input points and spans `hw` either side of the centre along the unit
 * perpendicular `(px, py)`. Walking the left edges forward then the right edges
 * backward gives the closed outline; an arrowhead adds three cross-sections
 * (body width at the arrow base, wing width at the base, zero width at the tip).
 */

export interface OutlinePoint {
  sx: number;
  sy: number;
}

export interface OutlineSection {
  /** Fractional index into the input points (0 = first point). */
  fi: number;
  /** Half-width either side of the centreline, in the input's units. */
  hw: number;
  /** Unit perpendicular (towards the "left" edge), in the input's units. */
  px: number;
  py: number;
}

export interface OutlineDims {
  /** Body half-width. */
  halfWidth: number;
  /** Arrow wing half-width. */
  arrowHalfWidth: number;
  /** Distance from the tip back to the arrow base, along the centreline. */
  arrowLength: number;
}

/** Interpolate the centreline at a fractional index. */
export function outlineCentre(pts: OutlinePoint[], fi: number): OutlinePoint {
  const i = Math.max(0, Math.min(pts.length - 1, Math.floor(fi)));
  const f = fi - i;
  if (f <= 0 || i >= pts.length - 1) return { sx: pts[i].sx, sy: pts[i].sy };
  return {
    sx: pts[i].sx + f * (pts[i + 1].sx - pts[i].sx),
    sy: pts[i].sy + f * (pts[i + 1].sy - pts[i].sy),
  };
}

/**
 * Cross-sections of a uniform-width body with butt ends, terminated at the last
 * point by an integrated arrowhead when `withArrow` is set. Units are whatever
 * the input points use (the 2-D renderer passes screen pixels).
 */
export function ssOutline(
  pts: OutlinePoint[],
  withArrow: boolean,
  dims: OutlineDims,
): OutlineSection[] {
  const n = pts.length;
  if (n < 2) return [];

  // Unit tangent at each point (averaged across adjacent segments at interior
  // points so the perpendicular offsets transition smoothly).
  const tx = new Array<number>(n).fill(0);
  const ty = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let dx = 0,
      dy = 0;
    if (i > 0) {
      dx += pts[i].sx - pts[i - 1].sx;
      dy += pts[i].sy - pts[i - 1].sy;
    }
    if (i < n - 1) {
      dx += pts[i + 1].sx - pts[i].sx;
      dy += pts[i + 1].sy - pts[i].sy;
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-9) {
      tx[i] = dx / len;
      ty[i] = dy / len;
    }
  }

  const lastIdx = n - 1;
  const sections: OutlineSection[] = [];

  if (!withArrow) {
    for (let i = 0; i <= lastIdx; i++) {
      sections.push({ fi: i, hw: dims.halfWidth, px: -ty[i], py: tx[i] });
    }
    return sections;
  }

  // Arrow base = a point `arrowLength` back from the tip along the polyline.
  // `bodyLast` is the last point fully part of the body before the arrow base;
  // points beyond it sit inside the arrowhead.
  let remaining = dims.arrowLength;
  let baseSegEnd = lastIdx;
  let baseFrac = 0;
  let walkedOff = true;
  for (let i = lastIdx; i > 0; i--) {
    const dx = pts[i].sx - pts[i - 1].sx;
    const dy = pts[i].sy - pts[i - 1].sy;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen <= 0) continue;
    if (remaining <= segLen) {
      baseSegEnd = i;
      baseFrac = 1 - remaining / segLen;
      walkedOff = false;
      break;
    }
    remaining -= segLen;
  }

  let bodyLast: number;
  let baseFi: number;
  let basePx: number;
  let basePy: number;
  if (walkedOff) {
    // Element shorter than the arrow — collapse the body to a single point at
    // the start and render a pure arrowhead from start to tip.
    bodyLast = -1;
    baseFi = 0;
    basePx = -ty[0];
    basePy = tx[0];
  } else {
    bodyLast = baseSegEnd - 1;
    baseFi = baseSegEnd - 1 + baseFrac;
    // Take the arrowhead perpendicular from the smoothed body-axis tangent at
    // bodyLast rather than the interpolated local tangent at the base: the
    // terminal point can land off-axis, which would rotate the base and put a
    // visible kink where the body meets the head. The tip stays at the last
    // point so loop connections are not displaced.
    basePx = -ty[lastIdx];
    basePy = tx[lastIdx];
    const bLen = Math.sqrt(tx[bodyLast] * tx[bodyLast] + ty[bodyLast] * ty[bodyLast]);
    if (bLen > 1e-9) {
      basePx = -ty[bodyLast] / bLen;
      basePy = tx[bodyLast] / bLen;
    }
  }

  for (let i = 0; i <= bodyLast; i++) {
    sections.push({ fi: i, hw: dims.halfWidth, px: -ty[i], py: tx[i] });
  }
  sections.push({ fi: baseFi, hw: dims.halfWidth, px: basePx, py: basePy });
  sections.push({ fi: baseFi, hw: dims.arrowHalfWidth, px: basePx, py: basePy });
  sections.push({ fi: lastIdx, hw: 0, px: basePx, py: basePy });
  return sections;
}

/**
 * Closed outline polygon for a set of cross-sections: left edges forward, then
 * right edges backward. A zero-width section (the arrow tip) contributes a
 * single vertex.
 */
export function outlinePolygon(pts: OutlinePoint[], sections: OutlineSection[]): OutlinePoint[] {
  const verts: OutlinePoint[] = [];
  for (const s of sections) {
    const c = outlineCentre(pts, s.fi);
    verts.push({ sx: c.sx + s.hw * s.px, sy: c.sy + s.hw * s.py });
  }
  for (let k = sections.length - 1; k >= 0; k--) {
    const s = sections[k];
    if (s.hw === 0) continue;
    const c = outlineCentre(pts, s.fi);
    verts.push({ sx: c.sx - s.hw * s.px, sy: c.sy - s.hw * s.py });
  }
  return verts;
}
