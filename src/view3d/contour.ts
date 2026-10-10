/**
 * Level lines of a field sampled on a square lattice (marching squares), and
 * resampling of polylines to an even spacing.
 */

/**
 * Lines where the field `f` (n × n values, `f[i * n + j]` at lattice point
 * (i, j)) crosses `level`, as flat (i, j) pairs in lattice units. Cells with a
 * NaN corner are skipped. Closed lines end where they start.
 */
export function levelLines(f: ArrayLike<number>, n: number, level: number): number[][] {
  // Edges are keyed by their lower-left lattice point: 2k along i, 2k + 1 along j.
  const along = (i: number, j: number) => 2 * (i * n + j);
  const up = (i: number, j: number) => 2 * (i * n + j) + 1;
  const point = new Map<number, [number, number]>();
  const at = (key: number, i0: number, j0: number, i1: number, j1: number) => {
    if (!point.has(key)) {
      const a = f[i0 * n + j0];
      const b = f[i1 * n + j1];
      const t = (level - a) / (b - a);
      point.set(key, [i0 + t * (i1 - i0), j0 + t * (j1 - j0)]);
    }
    return key;
  };
  const segs: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = f[i * n + j];
      const b = f[(i + 1) * n + j];
      const c = f[(i + 1) * n + j + 1];
      const d = f[i * n + j + 1];
      if (Number.isNaN(a + b + c + d)) continue;
      const code =
        (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const s = () => at(along(i, j), i, j, i + 1, j);
      const e = () => at(up(i + 1, j), i + 1, j, i + 1, j + 1);
      const nn = () => at(along(i, j + 1), i, j + 1, i + 1, j + 1);
      const w = () => at(up(i, j), i, j, i, j + 1);
      const centreHigh = (a + b + c + d) / 4 > level;
      switch (code) {
        case 1:
        case 14:
          segs.push([w(), s()]);
          break;
        case 2:
        case 13:
          segs.push([s(), e()]);
          break;
        case 3:
        case 12:
          segs.push([w(), e()]);
          break;
        case 4:
        case 11:
          segs.push([e(), nn()]);
          break;
        case 6:
        case 9:
          segs.push([s(), nn()]);
          break;
        case 7:
        case 8:
          segs.push([w(), nn()]);
          break;
        case 5:
          if (centreHigh) segs.push([w(), nn()], [s(), e()]);
          else segs.push([w(), s()], [e(), nn()]);
          break;
        case 10:
          if (centreHigh) segs.push([w(), s()], [e(), nn()]);
          else segs.push([w(), nn()], [s(), e()]);
          break;
      }
    }
  }
  // Chain the segments through their shared edges.
  const byEdge = new Map<number, number[]>();
  segs.forEach(([p, q], k) => {
    for (const e of [p, q]) {
      const list = byEdge.get(e);
      if (list) list.push(k);
      else byEdge.set(e, [k]);
    }
  });
  const used = new Uint8Array(segs.length);
  const next = (edge: number, from: number) =>
    byEdge.get(edge)!.find((k) => k !== from && !used[k]);
  const lines: number[][] = [];
  for (let k0 = 0; k0 < segs.length; k0++) {
    if (used[k0]) continue;
    used[k0] = 1;
    const chain = [segs[k0][0], segs[k0][1]];
    for (const forward of [true, false]) {
      let k = k0;
      for (;;) {
        const end = forward ? chain[chain.length - 1] : chain[0];
        const k2 = next(end, k);
        if (k2 === undefined) break;
        used[k2] = 1;
        const other = segs[k2][0] === end ? segs[k2][1] : segs[k2][0];
        if (forward) chain.push(other);
        else chain.unshift(other);
        k = k2;
        if (other === (forward ? chain[0] : chain[chain.length - 1])) break;
      }
      if (chain.length > 2 && chain[0] === chain[chain.length - 1]) break;
    }
    lines.push(chain.flatMap((e) => point.get(e)!));
  }
  return lines;
}

/**
 * A polyline (flat x, y pairs) resampled to points about `step` apart along
 * it, keeping both ends.
 */
export function resample(pts: ArrayLike<number>, step: number): number[] {
  const m = Math.floor(pts.length / 2);
  if (m < 2) return Array.from(pts);
  const cum = [0];
  for (let i = 1; i < m; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]));
  const total = cum[m - 1];
  const k = Math.max(1, Math.round(total / step));
  const out: number[] = [];
  let seg = 1;
  for (let q = 0; q <= k; q++) {
    const s = (q / k) * total;
    while (seg < m - 1 && cum[seg] < s) seg++;
    const span = cum[seg] - cum[seg - 1];
    const t = span > 0 ? (s - cum[seg - 1]) / span : 0;
    out.push(
      pts[seg * 2 - 2] + t * (pts[seg * 2] - pts[seg * 2 - 2]),
      pts[seg * 2 - 1] + t * (pts[seg * 2 + 1] - pts[seg * 2 - 1]),
    );
  }
  return out;
}
