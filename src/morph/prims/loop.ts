/** Loops in the 3-D view (lines that grow into tubes) and β-sheet contact ties. */

import { clamp01, fogged, hexRgb, lerp, LIGHT, mixRgb, smooth, WHITE } from '../colour.js';
import { DASH_ON, DASH_PERIOD, dashPieces, type OpSpec, Run } from '../engine.js';
import { veilBoundary, veiled } from '../membrane-layer.js';
import type { ModelLoop } from '../model.js';
import type { PrimEnv } from './env.js';
import type { FrameCtx } from './frame.js';
import { END_EASE } from './kinks.js';
import { TUBE_BODY, TUBE_EDGE_L, TUBE_EDGE_R, TUBE_SHINE } from './specs.js';
export function loopPrims(env: PrimEnv, ctx: FrameCtx, loop: ModelLoop): void {
  const { model, pose, cam, scale, sigma, eW, eLoop, prims } = ctx;
  const { ud, zd } = model;
  // Fine sampling near t = 0 keeps the curve faithful to the 2-D Bézier;
  // coarser in 3-D where the tube is smooth anyway.
  const spacing = lerp(0.35, 1.2, eW);
  const count = Math.max(12, Math.min(900, Math.ceil(loop.length / spacing))) + 1;
  const dAu = loop.fromG >= 0 ? pose.u[loop.fromG] - ud[loop.fromG] : NaN;
  const dAz = loop.fromG >= 0 ? pose.z[loop.fromG] - zd[loop.fromG] : NaN;
  const dBu = loop.toG >= 0 ? pose.u[loop.toG] - ud[loop.toG] : NaN;
  const dBz = loop.toG >= 0 ? pose.z[loop.toG] - zd[loop.toG] : NaN;
  const aU = Number.isNaN(dAu) ? (Number.isNaN(dBu) ? 0 : dBu) : dAu;
  const aZ = Number.isNaN(dAz) ? (Number.isNaN(dBz) ? 0 : dBz) : dAz;
  const bU = Number.isNaN(dBu) ? aU : dBu;
  const bZ = Number.isNaN(dBz) ? aZ : dBz;

  const sx = new Float64Array(count);
  const sy = new Float64Array(count);
  const sd = new Float64Array(count);
  const sk = new Float64Array(count);
  const wx = new Float64Array(count);
  const wy = new Float64Array(count);
  const wz = new Float64Array(count);
  let js = 0;
  let jr = 0;
  const { syn, synS, real, realS } = loop;
  const nSyn = synS.length;
  const nReal = realS.length;
  for (let c = 0; c < count; c++) {
    const s = c / (count - 1);
    while (js < nSyn - 2 && synS[js + 1] < s) js++;
    const fsd = synS[js + 1] - synS[js];
    const fs = nSyn > 1 && fsd > 1e-12 ? clamp01((s - synS[js]) / fsd) : 0;
    const su = nSyn > 1 ? lerp(syn[js * 2], syn[js * 2 + 2], fs) : syn[0];
    const sz = nSyn > 1 ? lerp(syn[js * 2 + 1], syn[js * 2 + 3], fs) : syn[1];
    while (jr < nReal - 2 && realS[jr + 1] < s) jr++;
    const frd = nReal > 1 ? realS[jr + 1] - realS[jr] : 0;
    const fr = frd > 1e-12 ? clamp01((s - realS[jr]) / frd) : 0;
    const ra = real[jr];
    const rb = real[Math.min(nReal - 1, jr + 1)];
    const ru = lerp(pose.u[ra], pose.u[rb], fr);
    const rz = lerp(pose.z[ra], pose.z[rb], fr);
    const rn = lerp(pose.n[ra], pose.n[rb], fr);
    const rbb = lerp(pose.b[ra], pose.b[rb], fr);
    const cu = lerp(su + lerp(aU, bU, s), ru, eLoop);
    const cz = lerp(sz + lerp(aZ, bZ, s), rz, eLoop);
    pose.curtain.place(cu, cz, rn * eLoop, rbb * eLoop, env.tmp);
    wx[c] = env.tmp[0];
    wy[c] = env.tmp[1];
    wz[c] = env.tmp[2];
  }
  // Length along the loop in space (Å), independent of the view.
  const arc = new Float64Array(count);
  for (let c = 1; c < count; c++) {
    arc[c] = arc[c - 1] + Math.hypot(wx[c] - wx[c - 1], wy[c] - wy[c - 1], wz[c] - wz[c - 1]);
  }
  // Follow element ends drawn away from their pose (straightened helices),
  // easing back to the loop's own path within a few Å.
  for (const [g, fromEnd] of [
    [loop.fromG, true],
    [loop.toG, false],
  ] as const) {
    const shift = g >= 0 ? ctx.endShift.get(g) : undefined;
    if (!shift) continue;
    for (let c = 0; c < count; c++) {
      const d = fromEnd ? arc[c] : arc[count - 1] - arc[c];
      if (d >= END_EASE) continue;
      const f = 1 - smooth(0, END_EASE, d);
      wx[c] += shift[0] * f;
      wy[c] += shift[1] * f;
      wz[c] += shift[2] * f;
    }
  }
  for (let c = 0; c < count; c++) {
    cam.project(wx[c], wy[c], wz[c], env.tmp, 4);
    sx[c] = env.tmp[4];
    sy[c] = env.tmp[5];
    sd[c] = env.tmp[6];
    sk[c] = env.tmp[7];
  }
  const coil = env.colours.coil;
  // One set of colours and one width per loop: averaging them over whichever
  // pieces share a depth-sorted run would make them shimmer as the view moves.
  let dAvg = 0;
  let kAvg = 0;
  for (let c = 0; c < count; c++) {
    dAvg += sd[c] / count;
    kAvg += sk[c] / count;
  }
  const fog = ctx.fogAt(dAvg);
  const core = lerp(1.8, 2 * env.options.coilRadius * scale * kAvg, eW);
  const outer = core + 1.8 * sigma;
  // Pieces closer than this along the loop overlap anyway (see Prim.reach).
  const reach = 3 + 2 * Math.max(2 * env.options.coilRadius, outer / Math.max(1e-6, scale * kAvg));
  const coreC = fogged(mixRgb(coil, [150, 150, 150], sigma), fog, env.ground);
  const outC = fogged(mixRgb(coil, [52, 52, 52], sigma), fog, env.ground);
  const shineC = mixRgb(coreC, WHITE, 0.45);

  // In 3-D a solid loop is drawn as a filled tube with edge lines and a
  // highlight, so the joins between depth-sorted pieces are invisible. Near
  // t = 0 (and for dashed loops) it stays a stroke, matching the 2-D curve;
  // dashes are cut as separate pieces pinned to the curve so they don't
  // crawl when the loop is split differently from frame to frame.
  const tube = sigma >= 0.05 && !loop.discontinuous;
  const cap = loop.discontinuous || !tube ? 'round' : 'butt';
  const coreSpec: OpSpec = { layer: 2, key: 'tube', kind: 'stroke', linecap: cap };
  const outSpec: OpSpec = { layer: 1, key: 'tube-o', kind: 'stroke', linecap: cap };
  // Dashes of a chain break: as in 2-D at t = 0; in 3-D laid along the
  // loop's length on screen (laid along its length in space, a stretch
  // pointing at the viewer bunches them into a clump) and sized to the
  // line, which is much wider than in 2-D.
  const dashPx = loop.discontinuous ? loop.synLength * ctx.pxA : 0;
  const dashOn = lerp(DASH_ON, core, sigma);
  const dashPeriod = lerp(DASH_PERIOD, 3.5 * core, sigma);
  const onScreen = new Float64Array(count);
  for (let c = 1; c < count; c++) {
    onScreen[c] = onScreen[c - 1] + Math.hypot(sx[c] - sx[c - 1], sy[c] - sy[c - 1]);
  }
  const edgeAlpha = clamp01((sigma - 0.05) / 0.3);
  const rb = outer / 2;
  const edgeW = 1.2;
  // Per-point screen perpendicular (smoothed over a few points).
  const ppx = new Float64Array(count);
  const ppy = new Float64Array(count);
  const shine = new Float64Array(count);
  if (tube) {
    const lx = LIGHT[0];
    const ly = -LIGHT[1];
    for (let c = 0; c < count; c++) {
      const a = Math.max(0, c - 2);
      const b = Math.min(count - 1, c + 2);
      let tx = sx[b] - sx[a];
      let ty = sy[b] - sy[a];
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-9) {
        tx /= tl;
        ty /= tl;
      } else {
        tx = 1;
        ty = 0;
      }
      ppx[c] = -ty;
      ppy[c] = tx;
      // Highlight offset towards the light, continuous along the tube.
      const ls = Math.hypot(lx, ly) || 1;
      shine[c] = 0.32 * rb * ((ppx[c] * lx + ppy[c] * ly) / ls);
    }
  }

  // Depth-sorted pieces of about 1.2 Å, cut where the membrane tint starts
  // or stops (see strandPrims).
  const veil = ctx.veil;
  const lvS = new Int32Array(count);
  for (let c = 0; c < count; c++) lvS[c] = veil.level(wx[c], wy[c], wz[c]);
  interface LoopPoint {
    x: number;
    y: number;
    d: number;
    px: number;
    py: number;
    sh: number;
    s: number;
    /** Length along the loop in space (Å) and on screen (px). */
    a: number;
    scr: number;
  }
  const at = (q: number, r: number, u: number): LoopPoint => {
    let px = lerp(ppx[q], ppx[r], u);
    let py = lerp(ppy[q], ppy[r], u);
    const pl = Math.hypot(px, py);
    if (pl > 1e-12) {
      px /= pl;
      py /= pl;
    }
    return {
      x: lerp(sx[q], sx[r], u),
      y: lerp(sy[q], sy[r], u),
      d: lerp(sd[q], sd[r], u),
      px,
      py,
      sh: lerp(shine[q], shine[r], u),
      s: lerp(q, r, u) / (count - 1),
      a: lerp(arc[q], arc[r], u),
      scr: lerp(onScreen[q], onScreen[r], u),
    };
  };
  const piece = (P: LoopPoint[], lv: number, sub: number): void => {
    const pts: number[] = [];
    let dSum = 0;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const p of P) {
      pts.push(p.x, p.y);
      dSum += p.d;
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    const pad = outer / 2 + 1;
    const cC = veil.apply(coreC, lv);
    const oC = veil.apply(outC, lv);
    let emit: (run: Run) => void;
    if (tube) {
      const quads: number[][] = [];
      const left: number[] = [];
      const right: number[] = [];
      const hi: number[] = [];
      const re = rb - edgeW / 2;
      for (let q = 0; q < P.length; q++) {
        const p = P[q];
        left.push(p.x + re * p.px, p.y + re * p.py);
        right.push(p.x - re * p.px, p.y - re * p.py);
        hi.push(p.x + p.sh * p.px, p.y + p.sh * p.py);
        const n = P[q + 1];
        if (n) {
          quads.push([
            p.x + rb * p.px,
            p.y + rb * p.py,
            p.x - rb * p.px,
            p.y - rb * p.py,
            n.x + rb * n.px,
            n.y + rb * n.py,
            n.x - rb * n.px,
            n.y - rb * n.py,
          ]);
        }
      }
      const hC = veil.apply(shineC, lv);
      const bodyS = veiled(TUBE_BODY, lv);
      const shineS = veiled(TUBE_SHINE, lv);
      const edgeL = veiled(TUBE_EDGE_L, lv);
      const edgeR = veiled(TUBE_EDGE_R, lv);
      emit = (run) => {
        for (const quad of quads) run.strip(bodyS, quad, cC);
        run.stroke(shineS, hi, hC, rb * 0.55, edgeAlpha);
        run.stroke(edgeL, left, oC, edgeW, edgeAlpha);
        run.stroke(edgeR, right, oC, edgeW, edgeAlpha);
      };
    } else {
      const phases = P.map((p) => lerp(p.s * dashPx, p.scr, sigma));
      const coreS = veiled(coreSpec, lv);
      const outS = veiled(outSpec, lv);
      emit = (run) => {
        const pieces = dashPx > 0 ? dashPieces(pts, phases, dashOn, dashPeriod) : [pts];
        for (const pc of pieces) {
          if (sigma > 0) run.stroke(outS, pc, oC, outer, sigma);
          run.stroke(coreS, pc, cC, core);
        }
      };
    }
    prims.push({
      id: loop.id,
      order: loop.order,
      sub,
      depth: dSum / P.length,
      x0: x0 - pad,
      y0: y0 - pad,
      x1: x1 + pad,
      y1: y1 + pad,
      faded: loop.faded,
      pts,
      pad: outer / 2,
      along: (P[0].a + P[P.length - 1].a) / 2,
      reach,
      emit,
    });
  };
  const STEP = Math.max(1, Math.round(((count - 1) * 1.2) / Math.max(loop.length, 1e-6)));
  for (let c = 0; c < count - 1; c += STEP) {
    const e = Math.min(count - 1, c + STEP);
    const parts: { pts: LoopPoint[]; lv: number }[] = [];
    let cur: LoopPoint[] = [at(c, c, 0)];
    let lv = lvS[c];
    for (let q = c; q < e; q++) {
      if (lvS[q + 1] !== lvS[q]) {
        const lvAt = (u: number): number =>
          veil.level(
            lerp(wx[q], wx[q + 1], u),
            lerp(wy[q], wy[q + 1], u),
            lerp(wz[q], wz[q + 1], u),
          );
        let from = 0;
        for (let guard = 0; guard < 3 && lv !== lvS[q + 1]; guard++) {
          const u = veilBoundary(lvAt, from, 1, lv);
          const b = at(q, q + 1, u);
          cur.push(b);
          parts.push({ pts: cur, lv });
          cur = [b];
          lv = lvAt(lerp(u, 1, 1e-3));
          from = u;
        }
        lv = lvS[q + 1];
      }
      cur.push(at(q + 1, q + 1, 0));
    }
    parts.push({ pts: cur, lv });
    parts.forEach((part, k) => piece(part.pts, part.lv, c + k / 16));
  }
}

export function tiePrims(env: PrimEnv, ctx: FrameCtx, alpha: number): void {
  const { model, pose, cam, prims } = ctx;
  const contact = hexRgb(model.scene.style.contact);
  const spec: OpSpec = { layer: 0, key: 'tie', kind: 'stroke' };
  for (const tie of model.ties) {
    const ends: number[] = [];
    let depth = 0;
    for (const [g, z0] of [
      [tie.a, tie.az],
      [tie.b, tie.bz],
    ]) {
      const z = lerp(z0, pose.w[g * 4 + 2], pose.t[g]);
      cam.project(pose.w[g * 4], pose.w[g * 4 + 1], z, env.tmp);
      ends.push(env.tmp[0], env.tmp[1]);
      depth += env.tmp[2] / 2;
    }
    prims.push({
      id: -100,
      order: -1,
      sub: 0,
      depth,
      x0: Math.min(ends[0], ends[2]) - 1,
      y0: Math.min(ends[1], ends[3]) - 1,
      x1: Math.max(ends[0], ends[2]) + 1,
      y1: Math.max(ends[1], ends[3]) + 1,
      faded: false,
      pts: ends,
      pad: 0.5,
      emit: (run) => run.stroke(spec, ends, contact, 1, alpha),
    });
  }
}
