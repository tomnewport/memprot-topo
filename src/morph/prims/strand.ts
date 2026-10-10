import { type OutlinePoint, type OutlineSection, ssOutline } from '../../components/ss-outline.js';
import {
  AMBIENT,
  DIFFUSE,
  HALF,
  hexRgb,
  lerp,
  LIGHT,
  type RGB,
  shade,
  shadeEdge,
} from '../colour.js';
import { gradientAlong, type GradientDef, type OpSpec, Run } from '../engine.js';
import { veilBoundary, veiled } from '../membrane-layer.js';
import type { ModelElement } from '../model.js';
import type { PrimEnv } from './env.js';
import type { FrameCtx } from './frame.js';
import {
  EDGE_BL,
  EDGE_BR,
  EDGE_TL,
  EDGE_TR,
  EDGE_X,
  SEAM_BL,
  SEAM_BR,
  SEAM_TL,
  SEAM_TR,
  SEAM_X,
  SIDE_L,
  SIDE_R,
  SIDE_START,
} from './specs.js';
import { STRAND_GROUP_COS } from './specs.js';
export function strandPrims(env: PrimEnv, ctx: FrameCtx, el: ModelElement): void {
  const { pose, cam, sigma, eW, pxA, prims } = ctx;
  const st = env.model.scene.style;
  const opt = env.options;
  const g0 = el.g0;
  const g1 = el.g1;
  if (g1 - g0 < 1) return;

  // Outline in curtain coordinates, exactly as the 2-D renderer computes it.
  const pts: OutlinePoint[] = [];
  for (let g = g0; g <= g1; g++) pts.push({ sx: pose.u[g] * pxA, sy: -pose.z[g] * pxA });
  const withArrow = el.withArrow || eW > 0;
  const sections = ssOutline(pts, withArrow, {
    halfWidth: lerp(st.halfWidthPx, (opt.strandWidth / 2) * pxA, eW),
    arrowHalfWidth: lerp(
      el.withArrow ? st.arrowHalfWidthPx : st.halfWidthPx,
      (opt.arrowWidth / 2) * pxA,
      eW,
    ),
    arrowLength: lerp(el.withArrow ? st.arrowLengthPx : 0, opt.arrowLength * pxA, eW),
  });
  if (sections.length < 2) return;
  // The arrowhead is one section from its base to the tip, much longer than
  // a body section: depth-sorted as one piece, it could be painted over a
  // strand lying in front of part of it. Cut it into pieces as long as body
  // sections (it also follows the strand's curve round the barrel then).
  const tip = sections[sections.length - 1];
  const head = sections[sections.length - 2];
  if (eW > 0 && tip.hw === 0 && tip.fi > head.fi) {
    const pieces = Math.max(1, Math.round(opt.arrowLength / 1.3));
    const inner: OutlineSection[] = [];
    for (let k = 1; k < pieces; k++) {
      const f = k / pieces;
      inner.push({ ...head, fi: lerp(head.fi, tip.fi, f), hw: head.hw * (1 - f) });
    }
    sections.splice(sections.length - 1, 0, ...inner);
  }
  const veil = ctx.veil;
  const kept = keepSections(sections, pts, lerp(0.5, 1.3, eW) * pxA);
  /** Membrane sheets in front of the centre line at outline index `fi`. */
  const levelAt = (fi: number): number => {
    const ga = Math.min(g1, Math.floor(g0 + fi));
    const gb = Math.min(g1, ga + 1);
    const f = g0 + fi - ga;
    return veil.level(
      lerp(pose.w[ga * 4], pose.w[gb * 4], f),
      lerp(pose.w[ga * 4 + 1], pose.w[gb * 4 + 1], f),
      lerp(pose.w[ga * 4 + 2], pose.w[gb * 4 + 2], f),
    );
  };
  // Cut the strand where the membrane tint starts or stops, so each
  // section is wholly in front of or behind a sheet.
  const secs: OutlineSection[] = [];
  const added: boolean[] = [];
  for (let k = 0; k < kept.length; k++) {
    const a = kept[k];
    secs.push(a);
    added.push(false);
    const b = kept[k + 1];
    if (veil.on <= 0 || !b || b.fi - a.fi < 1e-9) continue;
    let from = a;
    let la = levelAt(a.fi);
    const lb = levelAt(b.fi);
    for (let guard = 0; guard < 3 && la !== lb; guard++) {
      const fi = veilBoundary(levelAt, from.fi, b.fi, la);
      const u = (fi - a.fi) / (b.fi - a.fi);
      if (u <= 1e-3 || u >= 1 - 1e-3) break;
      const px = lerp(a.px, b.px, u);
      const py = lerp(a.py, b.py, u);
      const pl = Math.hypot(px, py) || 1;
      from = { fi, hw: lerp(a.hw, b.hw, u), px: px / pl, py: py / pl };
      secs.push(from);
      added.push(true);
      la = levelAt(lerp(fi, b.fi, 1e-3));
    }
  }

  // 3-D cross-sections: centre, width vector, normal; projected corners.
  const m = secs.length;
  const C = new Float64Array(m * 3);
  const W = new Float64Array(m * 3);
  const N = new Float64Array(m * 3);
  const corners = new Float64Array(m * 16); // TL, TR, BL, BR × (x, y, depth, k)
  const hT = opt.strandThickness / 2;
  const tmp = env.tmp;
  for (let i = 0; i < m; i++) {
    const s = secs[i];
    const fi = g0 + s.fi;
    const ga = Math.min(g1, Math.floor(fi));
    const gb = Math.min(g1, ga + 1);
    const f = fi - ga;
    for (let k = 0; k < 3; k++) C[i * 3 + k] = lerp(pose.w[ga * 4 + k], pose.w[gb * 4 + k], f);
    const h = lerp(pose.w[ga * 4 + 3], pose.w[gb * 4 + 3], f);
    const ch = Math.cos(h);
    const sh = Math.sin(h);
    const hwA = s.hw / pxA;
    // Curtain-plane perpendicular: (pu, pz) = (px, −py) in curtain coords.
    W[i * 3] = hwA * s.px * ch;
    W[i * 3 + 1] = hwA * s.px * sh;
    W[i * 3 + 2] = hwA * -s.py;
    N[i * 3] = sh;
    N[i * 3 + 1] = -ch;
    N[i * 3 + 2] = 0;
    for (let c = 0; c < 4; c++) {
      const ws = c === 0 || c === 2 ? 1 : -1;
      const ns = c < 2 ? 1 : -1;
      cam.project(
        C[i * 3] + ws * W[i * 3] + ns * hT * N[i * 3],
        C[i * 3 + 1] + ws * W[i * 3 + 1] + ns * hT * N[i * 3 + 1],
        C[i * 3 + 2] + ws * W[i * 3 + 2] + ns * hT * N[i * 3 + 2],
        corners,
        i * 16 + c * 4,
      );
    }
  }
  const base = env.colours.strand;
  const edge = hexRgb(env.colours.strandEdge);
  // Colours that don't vary along the strand are worked out once for the
  // whole element: if they were averaged over whichever sections share a
  // depth-sorted run, they would shimmer as the runs change with the view.
  // (Over the kept sections only, so the membrane cuts don't move them.)
  let depthSum = 0;
  for (let i = 0; i < m; i++) if (!added[i]) depthSum += corners[i * 16 + 2];
  const elFog = ctx.fogAt(depthSum / Math.max(1, kept.length));
  const sideC = shade(base, AMBIENT * 0.82, 0, sigma, elFog, env.ground);
  const edgeC = shadeEdge(edge, sigma, elFog, env.ground);
  // Face shading does vary along the strand: one gradient per stretch that
  // runs straight on screen, built from every section's own colour.
  const groupStops: { x: number; y: number; c: RGB }[][] = [[]];
  const groupDefs: GradientDef[] = [];
  let gid = 0;
  let refDx = NaN;
  let refDy = NaN;
  let groupLv = -1;
  const P = (i: number, c: number): [number, number] => [
    corners[i * 16 + c * 4],
    corners[i * 16 + c * 4 + 1],
  ];

  // Next centre distinct from centre i (skipping zero-length sections).
  const distinct = (i: number): number => {
    for (let j = i + 1; j < m; j++) {
      const d = Math.hypot(
        C[j * 3] - C[i * 3],
        C[j * 3 + 1] - C[i * 3 + 1],
        C[j * 3 + 2] - C[i * 3 + 2],
      );
      if (d > 1e-6) return j;
    }
    return -1;
  };

  /**
   * Whether the side wall of section a..b on `side` faces the eye direction
   * (ex, ey, ez). Outward normal = edge × N, oriented away from the inside.
   */
  const sideWallVis = (
    a: number,
    b: number,
    side: 1 | -1,
    ex: number,
    ey: number,
    ez: number,
  ): boolean => {
    const nx = N[a * 3] + N[b * 3];
    const ny = N[a * 3 + 1] + N[b * 3 + 1];
    const nz = N[a * 3 + 2] + N[b * 3 + 2];
    const ax = C[a * 3] + side * W[a * 3];
    const ay = C[a * 3 + 1] + side * W[a * 3 + 1];
    const az = C[a * 3 + 2] + side * W[a * 3 + 2];
    const bx = C[b * 3] + side * W[b * 3];
    const by = C[b * 3 + 1] + side * W[b * 3 + 1];
    const bz = C[b * 3 + 2] + side * W[b * 3 + 2];
    const qx = bx - ax;
    const qy = by - ay;
    const qz = bz - az;
    let wx = qy * nz - qz * ny;
    let wy = qz * nx - qx * nz;
    let wz = qx * ny - qy * nx;
    const wl = Math.hypot(wx, wy, wz);
    if (wl < 1e-9) return false;
    wx /= wl;
    wy /= wl;
    wz /= wl;
    const ox = (ax + bx - C[a * 3] - C[b * 3]) / 2;
    const oy = (ay + by - C[a * 3 + 1] - C[b * 3 + 1]) / 2;
    const oz = (az + bz - C[a * 3 + 2] - C[b * 3 + 2]) / 2;
    if (ox * wx + oy * wy + oz * wz < 0) {
      wx = -wx;
      wy = -wy;
      wz = -wz;
    }
    return wx * ex + wy * ey + wz * ez > 1e-4;
  };

  /** A shoulder section waiting to be drawn with the section after it. */
  let held: { pts: number[]; emit: (run: Run) => void } | null = null;
  for (let i = 0; i < m - 1; i++) {
    const j = i + 1;
    const mx = (C[i * 3] + C[j * 3]) / 2;
    const my = (C[i * 3 + 1] + C[j * 3 + 1]) / 2;
    const mz = (C[i * 3 + 2] + C[j * 3 + 2]) / 2;
    cam.toEye(mx, my, mz, tmp);
    const ex = tmp[0];
    const ey = tmp[1];
    const ez = tmp[2];
    const nx = N[i * 3] + N[j * 3];
    const ny = N[i * 3 + 1] + N[j * 3 + 1];
    const nz = N[i * 3 + 2] + N[j * 3 + 2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    const vN = (nx * ex + ny * ey + nz * ez) / nl;
    const EPS = 1e-4;
    const visTop = vN > EPS;
    const visBot = vN < -EPS;

    // Side walls: outward normal = edge × N, oriented away from the inside.
    // A zero-length section is an arrowhead shoulder, whose two walls face
    // back along the strand.
    const shoulder =
      Math.hypot(C[j * 3] - C[i * 3], C[j * 3 + 1] - C[i * 3 + 1], C[j * 3 + 2] - C[i * 3 + 2]) <=
      1e-6;
    const wallVis = (side: 1 | -1): boolean => sideWallVis(i, j, side, ex, ey, ez);
    // A shoulder wall's outward normal is back along the strand. (The side
    // wall test can't orient it: its edge runs across the strand, so the
    // inside/outside check is a tie and the walls came and went at random,
    // showing as detached rectangles; leaving them out instead left a notch
    // where the strand's inside showed through.)
    let shoulderVis = false;
    if (shoulder) {
      const k = distinct(j);
      if (k > 0) {
        const bx = C[j * 3] - C[k * 3];
        const by = C[j * 3 + 1] - C[k * 3 + 1];
        const bz = C[j * 3 + 2] - C[k * 3 + 2];
        shoulderVis = (bx * ex + by * ey + bz * ez) / (Math.hypot(bx, by, bz) || 1) > EPS;
      }
    }
    const visL = shoulder ? shoulderVis : wallVis(1);
    const visR = shoulder ? shoulderVis : wallVis(-1);

    // Start wall (first section only): faces back along the strand.
    let visStart = false;
    const nS = [0, 0, 0];
    if (i === 0) {
      const k = distinct(0);
      if (k > 0) {
        const al = Math.hypot(C[0] - C[k * 3], C[1] - C[k * 3 + 1], C[2] - C[k * 3 + 2]) || 1;
        nS[0] = (C[0] - C[k * 3]) / al;
        nS[1] = (C[1] - C[k * 3 + 1]) / al;
        nS[2] = (C[2] - C[k * 3 + 2]) / al;
        visStart = nS[0] * ex + nS[1] * ey + nS[2] * ez > EPS;
      }
    }

    const depth = (corners[i * 16 + 2] + corners[j * 16 + 2]) / 2;
    const fog = ctx.fogAt(depth);
    /** Lambert + specular shade of a surface with unit world normal n. */
    const lit = (n0: number, n1: number, n2: number): RGB => {
      cam.toCam(n0, n1, n2, tmp, 4);
      const lam = Math.max(0, tmp[4] * LIGHT[0] + tmp[5] * LIGHT[1] + tmp[6] * LIGHT[2]);
      const hv = Math.max(0, tmp[4] * HALF[0] + tmp[5] * HALF[1] + tmp[6] * HALF[2]);
      return shade(base, AMBIENT + DIFFUSE * lam, Math.pow(hv, 30) * 0.3, sigma, fog, env.ground);
    };
    const lv = veil.level(mx, my, mz);
    // Two-sided Lambert on the ribbon face.
    const sgn = (vN >= 0 ? 1 : -1) / nl;
    const faceC = veil.apply(lit(nx * sgn, ny * sgn, nz * sgn), lv);
    // The side walls keep one dark tone that reads as the ribbon's
    // thickness; the blunt start wall is lit like a face, as in that dark
    // tone it read as a stray rectangle.
    const wallC = veil.apply(sideC, lv);
    const lineC = veil.apply(edgeC, lv);
    const startC = veil.apply(visStart ? lit(nS[0], nS[1], nS[2]) : sideC, lv);

    const TL0 = P(i, 0),
      TR0 = P(i, 1),
      BL0 = P(i, 2),
      BR0 = P(i, 3);
    const TL1 = P(j, 0),
      TR1 = P(j, 1),
      BL1 = P(j, 2),
      BR1 = P(j, 3);
    // Gradient group: start a new one when the strand turns on screen, or
    // passes behind a membrane sheet.
    if (lv !== groupLv) {
      if (groupLv >= 0) {
        gid++;
        groupStops.push([]);
        refDx = NaN;
      }
      groupLv = lv;
    }
    {
      const dx = (TL1[0] + TR1[0] - TL0[0] - TR0[0]) / 2;
      const dy = (TL1[1] + TR1[1] - TL0[1] - TR0[1]) / 2;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.5) {
        if (Number.isNaN(refDx)) {
          refDx = dx / dl;
          refDy = dy / dl;
        } else if ((dx * refDx + dy * refDy) / dl < STRAND_GROUP_COS) {
          gid++;
          groupStops.push([]);
          refDx = dx / dl;
          refDy = dy / dl;
        }
      }
    }
    const g = gid;
    groupStops[g].push({
      x: (TL0[0] + TR0[0] + TL1[0] + TR1[0]) / 4,
      y: (TL0[1] + TR0[1] + TL1[1] + TR1[1]) / 4,
      c: faceC,
    });
    const faceTop: OpSpec = { layer: 1, key: `face-t${g}`, kind: 'gradient' };
    const faceBot: OpSpec = { layer: 1, key: `face-b${g}`, kind: 'gradient' };
    // Quads as (start-left, start-right, end-left, end-right).
    const faces: { spec: OpSpec; q: number[]; c: RGB }[] = [];
    if (visTop) faces.push({ spec: faceTop, q: [...TL0, ...TR0, ...TL1, ...TR1], c: faceC });
    if (visBot) faces.push({ spec: faceBot, q: [...BL0, ...BR0, ...BL1, ...BR1], c: faceC });
    const sideL = veiled(SIDE_L, lv);
    const sideR = veiled(SIDE_R, lv);
    if (visL) faces.push({ spec: sideL, q: [...TL0, ...BL0, ...TL1, ...BL1], c: wallC });
    if (visR) faces.push({ spec: sideR, q: [...TR0, ...BR0, ...TR1, ...BR1], c: wallC });
    const startWall = visStart ? [...TL0, ...TR0, ...BR0, ...BL0] : null;
    const edges: { spec: OpSpec; pts: number[] }[] = [];
    const edge = (spec: OpSpec, pts: number[]): void => {
      edges.push({ spec: veiled(spec, lv), pts });
    };
    if (visTop !== visL) edge(EDGE_TL, [...TL0, ...TL1]);
    if (visTop !== visR) edge(EDGE_TR, [...TR0, ...TR1]);
    if (visBot !== visL) edge(EDGE_BL, [...BL0, ...BL1]);
    if (visBot !== visR) edge(EDGE_BR, [...BR0, ...BR1]);
    // A shoulder wall's ends meet the body's wall and the arrowhead's: an
    // end is an outline unless the wall it meets is visible too.
    if (shoulder) {
      for (const side of [1, -1] as const) {
        if (!shoulderVis) break;
        const [o0, o1, i0, i1] = side === 1 ? [TL1, BL1, TL0, BL0] : [TR1, BR1, TR0, BR0];
        if (i === 0 || !sideWallVis(i - 1, i, side, ex, ey, ez)) edge(EDGE_X, [...i0, ...i1]);
        if (j + 1 >= m || !sideWallVis(j, j + 1, side, ex, ey, ez)) edge(EDGE_X, [...o0, ...o1]);
      }
    }
    if (i === 0) {
      if (visStart !== visTop) edge(EDGE_X, [...TL0, ...TR0]);
      if (visStart !== visBot) edge(EDGE_X, [...BL0, ...BR0]);
      if (visStart !== visL) edge(EDGE_X, [...TL0, ...BL0]);
      if (visStart !== visR) edge(EDGE_X, [...TR0, ...BR0]);
    }
    // Where two visible faces meet there is no outline, and the two
    // abutting polygons would leave a light anti-aliasing hairline: cover
    // the shared edge with a thin line in the wall's colour.
    const seams: { spec: OpSpec; pts: number[]; c: RGB }[] = [];
    const seam = (spec: OpSpec, pts: number[], c: RGB): void => {
      seams.push({ spec: veiled(spec, lv), pts, c });
    };
    if (visTop && visL) seam(SEAM_TL, [...TL0, ...TL1], wallC);
    if (visTop && visR) seam(SEAM_TR, [...TR0, ...TR1], wallC);
    if (visBot && visL) seam(SEAM_BL, [...BL0, ...BL1], wallC);
    if (visBot && visR) seam(SEAM_BR, [...BR0, ...BR1], wallC);
    if (visStart) {
      if (visTop) seam(SEAM_X, [...TL0, ...TR0], startC);
      if (visBot) seam(SEAM_X, [...BL0, ...BR0], startC);
      if (visL) seam(SEAM_X, [...TL0, ...BL0], startC);
      if (visR) seam(SEAM_X, [...TR0, ...BR0], startC);
    }
    const startSpec = veiled(SIDE_START, lv);
    const pts = [...TL0, ...TR0, ...BL0, ...BR0, ...TL1, ...TR1, ...BL1, ...BR1];
    const emit = (run: Run): void => {
      for (const f of faces) {
        run.strip(f.spec, f.q, f.c);
        if (f.spec.kind === 'gradient') run.setGradient(f.spec, groupDefs[g]);
      }
      if (startWall) run.fill(startSpec, startWall, startC);
      for (const e of seams) run.stroke(e.spec, e.pts, e.c, 1);
      for (const e of edges) run.stroke(e.spec, e.pts, lineC, 1.5);
    };
    // A shoulder (now just its outline) is depth-sorted with the arrowhead
    // section after it: on its own, its tiny footprint could be painted over
    // a neighbouring strand that hides the rest of the arrowhead.
    if (shoulder && j < m - 1) {
      held = { pts, emit };
      continue;
    }
    const before = held;
    held = null;
    const all = before ? [...before.pts, ...pts] : pts;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < all.length; k += 2) {
      x0 = Math.min(x0, all[k]);
      y0 = Math.min(y0, all[k + 1]);
      x1 = Math.max(x1, all[k]);
      y1 = Math.max(y1, all[k + 1]);
    }
    prims.push({
      id: el.id,
      order: el.order,
      sub: i,
      depth,
      x0: x0 - 1,
      y0: y0 - 1,
      x1: x1 + 1,
      y1: y1 + 1,
      faded: el.faded,
      pts: all,
      pad: 0.75,
      emit: before
        ? (run) => {
            before.emit(run);
            emit(run);
          }
        : emit,
    });
  }
  for (const stops of groupStops) groupDefs.push(gradientAlong(stops));
}

/** Drop body sections closer than `minStep` (outline units); keep arrow sections. */
export function keepSections(
  sections: OutlineSection[],
  pts: OutlinePoint[],
  minStep: number,
): OutlineSection[] {
  const out: OutlineSection[] = [];
  let lastFi = -Infinity;
  const isBody = (s: OutlineSection, k: number): boolean =>
    Number.isInteger(s.fi) && k + 1 < sections.length && sections[k + 1].fi !== s.fi && s.hw > 0;
  for (let k = 0; k < sections.length; k++) {
    const s = sections[k];
    const nextIsArrow = k + 1 < sections.length && !isBody(sections[k + 1], k + 1);
    if (k === 0 || !isBody(s, k) || nextIsArrow || k === sections.length - 1) {
      out.push(s);
      lastFi = s.fi;
      continue;
    }
    const a = pts[Math.round(lastFi)];
    const b = pts[s.fi];
    if (a && Math.hypot(b.sx - a.sx, b.sy - a.sy) >= minStep) {
      out.push(s);
      lastFi = s.fi;
    }
  }
  return out;
}
