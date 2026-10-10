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
import type { GradientDef, OpSpec } from '../engine.js';
import { veilBoundary, veiled } from '../membrane-layer.js';
import type { ModelElement } from '../model.js';
import type { PrimEnv } from './env.js';
import type { FrameCtx } from './frame.js';
import { fitLine } from './kinks.js';
import { SILHOUETTE, SILHOUETTE_R } from './specs.js';
import { GROUP_COS } from './specs.js';
import { AXIS_BASELINE } from './specs.js';
export function helixPrims(env: PrimEnv, ctx: FrameCtx, el: ModelElement): void {
  const { pose, cam, scale, sigma, eW, pxA, prims } = ctx;
  const st = env.model.scene.style;
  const g0 = el.g0;
  const g1 = el.g1;
  if (g1 - g0 < 1) return;
  const rA = lerp(st.halfWidthPx / pxA, env.options.helixRadius, eW);
  const idx = downsample(ctx, g0, g1, lerp(0.5, 1.0, ctx.eW));
  const m0 = idx.length;

  // Axis: the sample trace bends with the local-axis smoothing (and hooks
  // at the ends, where its window is one-sided), so in 3-D it is pulled onto
  // a straight line fitted to the samples — two lines meeting at a real
  // kink — as the cylinder grows.
  const nh = g1 - g0 + 1;
  const hw = new Float64Array(nh * 3);
  const hp = new Float64Array(nh * 4);
  for (let g = g0; g <= g1; g++)
    for (let k = 0; k < 3; k++) hw[(g - g0) * 3 + k] = pose.w[g * 4 + k];
  if (eW > 0) {
    env.precompute();
    const kink = env.kinks!.get(el.id) ?? -1;
    const straight = new Float64Array(nh * 3);
    /**
     * The segment of the line fitted to samples a..b that spans them, and
     * each sample's fraction of the way along the trace. Samples are spread
     * along the segment by that fraction, so they stay in order even where
     * the trace hooks back (projecting them would fold the cylinder).
     */
    const axis = (a: number, b: number): { from: number[]; to: number[]; frac: number[] } => {
      const { c, d } = fitLine(pose.w, a, b);
      let lo = Infinity;
      let hi = -Infinity;
      const frac = [0];
      for (let g = a; g <= b; g++) {
        const t =
          (pose.w[g * 4] - c[0]) * d[0] +
          (pose.w[g * 4 + 1] - c[1]) * d[1] +
          (pose.w[g * 4 + 2] - c[2]) * d[2];
        lo = Math.min(lo, t);
        hi = Math.max(hi, t);
        if (g > a) {
          frac.push(
            frac[frac.length - 1] +
              Math.hypot(
                pose.w[g * 4] - pose.w[g * 4 - 4],
                pose.w[g * 4 + 1] - pose.w[g * 4 - 3],
                pose.w[g * 4 + 2] - pose.w[g * 4 - 2],
              ),
          );
        }
      }
      const total = frac[frac.length - 1] || 1;
      return {
        from: c.map((x, k) => x + lo * d[k]),
        to: c.map((x, k) => x + hi * d[k]),
        frac: frac.map((f) => f / total),
      };
    };
    const place = (g: number, p: number[], q: number[], f: number): void => {
      for (let k = 0; k < 3; k++) straight[(g - g0) * 3 + k] = p[k] + f * (q[k] - p[k]);
    };
    if (kink < 0) {
      const L = axis(g0, g1);
      for (let g = g0; g <= g1; g++) place(g, L.from, L.to, L.frac[g - g0]);
    } else {
      // Two lines meeting at the joint (the mean of their kink ends).
      const L1 = axis(g0, kink);
      const L2 = axis(kink, g1);
      const joint = L1.to.map((x, k) => (x + L2.from[k]) / 2);
      for (let g = g0; g <= kink; g++) place(g, L1.from, joint, L1.frac[g - g0]);
      for (let g = kink + 1; g <= g1; g++) place(g, joint, L2.to, L2.frac[g - kink]);
    }
    for (let i = 0; i < nh * 3; i++) hw[i] = lerp(hw[i], straight[i], eW);
    for (const g of [g0, g1]) {
      const o = (g - g0) * 3;
      ctx.endShift.set(g, [
        hw[o] - pose.w[g * 4],
        hw[o + 1] - pose.w[g * 4 + 1],
        hw[o + 2] - pose.w[g * 4 + 2],
      ]);
    }
  }
  for (let i = 0; i < nh; i++) cam.project(hw[i * 3], hw[i * 3 + 1], hw[i * 3 + 2], hp, i * 4);

  const veil = ctx.veil;
  const base = env.colours.helix;
  const edge = hexRgb(env.colours.helixEdge);
  // Outline colour per element, not per section (see strandPrims).
  let depthSum = 0;
  for (const g of idx) depthSum += hp[(g - g0) * 4 + 2];
  const edgeC = shadeEdge(edge, sigma, ctx.fogAt(depthSum / Math.max(1, m0)), env.ground);
  const unit = (x: number, y: number): [number, number] => {
    const l = Math.hypot(x, y);
    return l > 1e-12 ? [x / l, y / l] : [0, 0];
  };

  /**
   * One straight (or gently kinked) cylinder through axis points `lw`
   * (flat x, y, z), sectioned at the points `keep`. A `joints` end is where
   * a sharply kinked helix's two cylinders meet.
   */
  const cylinder = (
    lw: Float64Array,
    keep: number[],
    part: number,
    joints: [boolean, boolean],
  ): void => {
    const n1 = lw.length / 3 - 1;
    const lp = new Float64Array((n1 + 1) * 4);
    for (let i = 0; i <= n1; i++) cam.project(lw[i * 3], lw[i * 3 + 1], lw[i * 3 + 2], lp, i * 4);
    const m0 = keep.length;

    // Silhouette frame per kept point: screen centre, perpendicular, radius.
    // The 2-D outline takes its tangent from the neighbouring samples; in 3-D
    // that is noisy for a helix seen nearly end-on, so blend towards the
    // projected axis direction over a wider (~1 Å) baseline.
    const sx0 = new Float64Array(m0);
    const sy0 = new Float64Array(m0);
    const ppx0 = new Float64Array(m0);
    const ppy0 = new Float64Array(m0);
    const rs0 = new Float64Array(m0);
    const dep0 = new Float64Array(m0);
    for (let i = 0; i < m0; i++) {
      const g = keep[i];
      const [fx, fy] = unit(
        lp[Math.min(n1, g + 1) * 4] - lp[Math.max(0, g - 1) * 4],
        lp[Math.min(n1, g + 1) * 4 + 1] - lp[Math.max(0, g - 1) * 4 + 1],
      );
      const [wx, wy] = unit(
        lp[Math.min(n1, g + AXIS_BASELINE) * 4] - lp[Math.max(0, g - AXIS_BASELINE) * 4],
        lp[Math.min(n1, g + AXIS_BASELINE) * 4 + 1] - lp[Math.max(0, g - AXIS_BASELINE) * 4 + 1],
      );
      const [ux, ty] = unit(lerp(fx, wx, eW), lerp(fy, wy, eW));
      const tx = ux === 0 && ty === 0 ? 1 : ux;
      sx0[i] = lp[g * 4];
      sy0[i] = lp[g * 4 + 1];
      ppx0[i] = -ty;
      ppy0[i] = tx;
      rs0[i] = rA * scale * lp[g * 4 + 3];
      dep0[i] = lp[g * 4 + 2];
    }

    // Cut where the membrane tint starts or stops (see strandPrims): extra
    // points on the axis polyline, interpolated between their neighbours.
    const sxL: number[] = [];
    const syL: number[] = [];
    const ppxL: number[] = [];
    const ppyL: number[] = [];
    const rsL: number[] = [];
    const depL: number[] = [];
    const wL: number[] = [];
    const point = (i: number, j: number, u: number): void => {
      sxL.push(lerp(sx0[i], sx0[j], u));
      syL.push(lerp(sy0[i], sy0[j], u));
      const px = lerp(ppx0[i], ppx0[j], u);
      const py = lerp(ppy0[i], ppy0[j], u);
      const pl = Math.hypot(px, py) || 1;
      ppxL.push(px / pl);
      ppyL.push(py / pl);
      rsL.push(lerp(rs0[i], rs0[j], u));
      depL.push(lerp(dep0[i], dep0[j], u));
      for (let k = 0; k < 3; k++) wL.push(lerp(lw[keep[i] * 3 + k], lw[keep[j] * 3 + k], u));
    };
    for (let i = 0; i < m0; i++) {
      point(i, i, 0);
      if (i + 1 >= m0 || veil.on <= 0) continue;
      const a = keep[i] * 3;
      const b = keep[i + 1] * 3;
      const lvAt = (u: number): number =>
        veil.level(
          lerp(lw[a], lw[b], u),
          lerp(lw[a + 1], lw[b + 1], u),
          lerp(lw[a + 2], lw[b + 2], u),
        );
      let la = lvAt(0);
      const lb = lvAt(1);
      let from = 0;
      for (let guard = 0; guard < 3 && la !== lb; guard++) {
        const u = veilBoundary(lvAt, from, 1, la);
        if (u <= from + 1e-3 || u >= 1 - 1e-3) break;
        point(i, i + 1, u);
        from = u;
        la = lvAt(lerp(u, 1, 1e-3));
      }
    }
    const m = sxL.length;
    const sx = Float64Array.from(sxL);
    const sy = Float64Array.from(syL);
    const ppx = Float64Array.from(ppxL);
    const ppy = Float64Array.from(ppyL);
    const rs = Float64Array.from(rsL);
    const dep = Float64Array.from(depL);
    /** Membrane sheets in front of each section's midpoint. */
    const lvSec = new Int32Array(Math.max(0, m - 1));
    for (let i = 0; i < m - 1; i++) {
      lvSec[i] = veil.level(
        (wL[i * 3] + wL[i * 3 + 3]) / 2,
        (wL[i * 3 + 1] + wL[i * 3 + 4]) / 2,
        (wL[i * 3 + 2] + wL[i * 3 + 5]) / 2,
      );
    }

    // Smooth shading: a linear gradient across the cylinder. A gradient is
    // straight in screen space, so the cylinder is split into groups whose
    // on-screen direction stays within a few degrees, each with its own.
    const group = new Int32Array(Math.max(0, m - 1));
    let gid = 0;
    let refX = ppx[0];
    let refY = ppy[0];
    for (let i = 0; i < m - 1; i++) {
      if (ppx[i + 1] * refX + ppy[i + 1] * refY < GROUP_COS) {
        gid++;
        refX = ppx[i];
        refY = ppy[i];
      } else if (i > 0 && lvSec[i] !== lvSec[i - 1]) gid++;
      group[i] = gid;
    }
    const grads: GradientDef[] = [];
    for (let k = 0, i = 0; k <= gid; k++) {
      let j = i;
      while (j + 1 < m - 1 && group[j + 1] === k) j++;
      const pm = Math.min(m - 1, Math.round((i + j + 1) / 2));
      const gd = cylinderGradient(
        env.ground,
        sx[pm],
        sy[pm],
        ppx[pm],
        ppy[pm],
        rs[pm],
        base,
        sigma,
        ctx.fogAt(dep[pm]),
      );
      const lv = lvSec[Math.min(i, m - 2)] ?? 0;
      grads.push({
        ...gd,
        stops: gd.stops.map((t) => ({ o: t.o, c: veil.apply(t.c, lv) })),
        mean: veil.apply(gd.mean, lv),
      });
      i = j + 1;
    }

    for (let i = 0; i < m - 1; i++) {
      const depth = (dep[i] + dep[i + 1]) / 2;
      const left = [
        sx[i] + rs[i] * ppx[i],
        sy[i] + rs[i] * ppy[i],
        sx[i + 1] + rs[i + 1] * ppx[i + 1],
        sy[i + 1] + rs[i + 1] * ppy[i + 1],
      ];
      const right = [
        sx[i] - rs[i] * ppx[i],
        sy[i] - rs[i] * ppy[i],
        sx[i + 1] - rs[i + 1] * ppx[i + 1],
        sy[i + 1] - rs[i + 1] * ppy[i + 1],
      ];
      const body = [left[0], left[1], right[0], right[1], left[2], left[3], right[2], right[3]];
      const xs = [left[0], left[2], right[0], right[2]];
      const ys = [left[1], left[3], right[1], right[3]];
      const grad = grads[group[i]];
      const spec: OpSpec = { layer: 1, key: `cyl${part}.${group[i]}`, kind: 'gradient' };
      const silL = veiled(SILHOUETTE, lvSec[i]);
      const silR = veiled(SILHOUETTE_R, lvSec[i]);
      const lineC = veil.apply(edgeC, lvSec[i]);
      prims.push({
        id: el.id,
        order: el.order,
        sub: part * 1e4 + i + 1,
        depth,
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: [left[0], left[1], left[2], left[3], right[2], right[3], right[0], right[1]],
        pad: 0.75,
        emit: (run) => {
          run.strip(spec, body, grad.mean);
          run.setGradient(spec, grad);
          run.stroke(silL, left, lineC, 1.5);
          run.stroke(silR, right, lineC, 1.5);
        },
      });
    }

    // End caps.
    for (const end of [0, m - 1]) {
      if (joints[end === 0 ? 0 : 1]) continue;
      const g = keep[end === 0 ? 0 : m0 - 1];
      const gIn = keep[end === 0 ? Math.min(m0 - 1, 1) : Math.max(0, m0 - 2)];
      const o = g * 3;
      const oIn = gIn * 3;
      const lv = veil.level(lw[o], lw[o + 1], lw[o + 2]);
      const lineC = veil.apply(edgeC, lv);
      const ox = lw[o] - lw[oIn];
      const oy = lw[o + 1] - lw[oIn + 1];
      const oz = lw[o + 2] - lw[oIn + 2];
      const ol = Math.hypot(ox, oy, oz) || 1;
      cam.toEye(lw[o], lw[o + 1], lw[o + 2], env.tmp);
      const facing = (ox * env.tmp[0] + oy * env.tmp[1] + oz * env.tmp[2]) / ol;
      // Outward axis direction on screen (the tangent, from the stable
      // perpendicular), pointing away from the body.
      let qx = ppy[end];
      let qy = -ppx[end];
      if (end === 0) {
        qx = -qx;
        qy = -qy;
      }
      const minor = rs[end] * Math.abs(facing);
      const ring: number[] = [];
      const arc: number[] = [];
      for (let a = 0; a <= 24; a++) {
        const th = (a / 24) * 2 * Math.PI;
        const x = sx[end] + Math.cos(th) * rs[end] * ppx[end] + Math.sin(th) * minor * qx;
        const y = sy[end] + Math.cos(th) * rs[end] * ppy[end] + Math.sin(th) * minor * qy;
        if (a < 24) ring.push(x, y);
        if (a <= 12) arc.push(x, y);
      }
      ring.push(ring[0], ring[1]);
      const near = facing >= -1e-6;
      const fog = ctx.fogAt(dep[end]);
      // Cap normal = outward axis; light it in camera space.
      cam.toCam(ox / ol, oy / ol, oz / ol, env.tmp, 4);
      const lam = Math.max(
        0,
        env.tmp[4] * LIGHT[0] + env.tmp[5] * LIGHT[1] + env.tmp[6] * LIGHT[2],
      );
      const capC = veil.apply(shade(base, AMBIENT + DIFFUSE * lam, 0, sigma, fog, env.ground), lv);
      // The far end shows only as the rounded end of the cylinder's side, so
      // it takes the side's own gradient (a flat dark disc read as a second,
      // detached cap when the helix is seen nearly end-on).
      const gi = group[end === 0 ? 0 : Math.max(0, m - 2)];
      const sideSpec: OpSpec = { layer: 0, key: `cap-back${part}.${end}`, kind: 'gradient' };
      const sideGrad = grads[gi] ?? grads[0];
      const xs = ring.filter((_, k) => k % 2 === 0);
      const ys = ring.filter((_, k) => k % 2 === 1);
      prims.push({
        id: el.id,
        order: el.order,
        sub: near ? 1e6 + part * 1e4 + end : -1 - part * 1e4 - end,
        depth: dep[end] + (near ? -1e-3 : 1e-3),
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: ring,
        pad: 0.75,
        emit: (run) => {
          if (near) {
            run.fill({ layer: 3, key: `cap${part}.${end}`, kind: 'fill' }, ring, capC);
            run.stroke(
              { layer: 4, key: `cap-edge${part}.${end}`, kind: 'stroke', linecap: 'round' },
              ring,
              lineC,
              1.5,
            );
          } else {
            run.fill(sideSpec, ring, sideGrad.mean);
            run.setGradient(sideSpec, sideGrad);
            run.stroke(
              { layer: 2, key: `cap-arc${part}.${end}`, kind: 'stroke', linecap: 'round' },
              arc,
              lineC,
              1.5,
            );
          }
        },
      });
    }
  };

  // A sharp kink is drawn as two cylinders meeting at a ball joint: one
  // outline bent through 45° or more opened at the outside of the bend and
  // showed the inside of the tube. The ball goes behind both cylinders' ends
  // and fills the wedge between them; it fades in with the cylinders, as the
  // 2-D bar has nothing there.
  const local = idx.map((g) => g - g0);
  const sharp = eW > 0 && env.sharpKinks.has(el.id) ? (env.kinks!.get(el.id) ?? -1) : -1;
  if (sharp < 0) {
    cylinder(hw, local, 0, [false, false]);
    return;
  }
  const j = sharp - g0;
  const keepA = local.filter((g) => g < j);
  keepA.push(j);
  const keepB = [0];
  for (const g of local) if (g > j) keepB.push(g - j);
  cylinder(hw.subarray(0, (j + 1) * 3), keepA, 0, [false, true]);
  cylinder(hw.subarray(j * 3), keepB, 1, [true, false]);

  const jx = hp[j * 4];
  const jy = hp[j * 4 + 1];
  const jr = rA * scale * hp[j * 4 + 3];
  const lv = veil.level(hw[j * 3], hw[j * 3 + 1], hw[j * 3 + 2]);
  const fog = ctx.fogAt(hp[j * 4 + 2]);
  // Shaded as a cylinder across arm A's direction on screen.
  const [ux, uy] = unit(jx - hp[0], jy - hp[1]);
  const gd = cylinderGradient(env.ground, jx, jy, -uy, ux, jr, base, sigma, fog);
  const ballGrad: GradientDef = {
    ...gd,
    stops: gd.stops.map((t) => ({ o: t.o, c: veil.apply(t.c, lv) })),
    mean: veil.apply(gd.mean, lv),
  };
  const ring: number[] = [];
  for (let a = 0; a <= 24; a++) {
    const th = (a / 24) * 2 * Math.PI;
    ring.push(jx + jr * Math.cos(th), jy + jr * Math.sin(th));
  }
  // Outline only the half on the outside of the bend: inside it, the ball
  // is hidden between the arms and its line showed in the crease.
  const [ax, ay] = unit(hp[0] - jx, hp[1] - jy);
  const [bx, by] = unit(hp[(nh - 1) * 4] - jx, hp[(nh - 1) * 4 + 1] - jy);
  let arc = ring;
  if (Math.hypot(ax + bx, ay + by) > 0.2) {
    const out = Math.atan2(-(ay + by), -(ax + bx));
    arc = [];
    for (let a = 0; a <= 12; a++) {
      const th = out + ((a - 6) / 12) * Math.PI;
      arc.push(jx + jr * Math.cos(th), jy + jr * Math.sin(th));
    }
  }
  const ballSpec: OpSpec = { layer: 0, key: 'ball', kind: 'gradient' };
  const ballEdge: OpSpec = { layer: 0, key: 'ball-edge', kind: 'stroke', linecap: 'round' };
  const lineC = veil.apply(edgeC, lv);
  prims.push({
    id: el.id,
    order: el.order,
    sub: 5e5,
    depth: hp[j * 4 + 2] + rA,
    x0: jx - jr - 1,
    y0: jy - jr - 1,
    x1: jx + jr + 1,
    y1: jy + jr + 1,
    faded: el.faded,
    pts: ring,
    pad: 0.75,
    emit: (run) => {
      run.fill(ballSpec, ring, ballGrad.mean, eW);
      run.setGradient(ballSpec, ballGrad);
      run.stroke(ballEdge, arc, lineC, 1.5, eW);
    },
  });
}

/** Sample indices in [g0, g1] at least `minStep` Å apart (display arc). */
export function downsample(ctx: FrameCtx, g0: number, g1: number, minStep: number): number[] {
  const { pose } = ctx;
  const out = [g0];
  let last = g0;
  for (let g = g0 + 1; g < g1; g++) {
    if (Math.hypot(pose.u[g] - pose.u[last], pose.z[g] - pose.z[last]) >= minStep) {
      out.push(g);
      last = g;
    }
  }
  out.push(g1);
  return out;
}

/** Lighting profile across a cylinder at one point, as a gradient. */
export function cylinderGradient(
  ground: RGB,
  cx: number,
  cy: number,
  px: number,
  py: number,
  r: number,
  base: RGB,
  sigma: number,
  fog: number,
): GradientDef {
  // Surface normal at fraction f across the silhouette (camera space):
  // f·P + √(1−f²)·(towards the viewer), with P the on-screen perpendicular.
  const Px = px;
  const Py = -py;
  const stops: { o: number; c: RGB }[] = [];
  const K = 9;
  let sum: RGB = [0, 0, 0];
  for (let k = 0; k < K; k++) {
    const f = Math.sin(-Math.PI / 2 + (k * Math.PI) / (K - 1));
    const q = Math.sqrt(Math.max(0, 1 - f * f));
    const nx = f * Px;
    const ny = f * Py;
    const nz = -q;
    const lam = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const hv = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
    const c = shade(base, AMBIENT + DIFFUSE * lam, 0.35 * Math.pow(hv, 24), sigma, fog, ground);
    stops.push({ o: (f + 1) / 2, c });
    sum = [sum[0] + c[0] / K, sum[1] + c[1] / K, sum[2] + c[2] / K];
  }
  return { x1: cx - r * px, y1: cy - r * py, x2: cx + r * px, y2: cy + r * py, stops, mean: sum };
}
