/**
 * One leaflet's headgroup surface as a cloud of (x, y, z) points, with a
 * uniform xy grid so the height under any point can be looked up quickly.
 */
export class LeafletSurface {
  /** Grid cell size (Å). */
  private static readonly CELL = 2;
  /**
   * Search radii (Å) tried in turn by {@link heightAt}. The first is a few
   * grid spacings of a MemProtMD surface; the larger ones reach across the
   * holes the surface has over pore lumens.
   */
  private static readonly RADII = [3, 6, 12];

  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  private readonly cells = new Map<string, number[]>();

  constructor(points: { x: number; y: number; z: number }[]) {
    const n = points.length;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.z = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      this.x[i] = p.x;
      this.y[i] = p.y;
      this.z[i] = p.z;
      const key = LeafletSurface.key(
        Math.floor(p.x / LeafletSurface.CELL),
        Math.floor(p.y / LeafletSurface.CELL),
      );
      const cell = this.cells.get(key);
      if (cell) cell.push(i);
      else this.cells.set(key, [i]);
    }
  }

  get size(): number {
    return this.x.length;
  }

  private static key(i: number, j: number): string {
    return `${i},${j}`;
  }

  /**
   * Height of the surface under (x, y): the distance-weighted mean z of the
   * surface points within a few Å, weighted (1 − (d/R)²)² so the result
   * varies smoothly as (x, y) moves. Tries 3, 6 then 12 Å; null when no
   * surface point lies within 12 Å (off the analysed patch). Given a
   * `radius`, only that radius is tried, so holes wider than it stay holes.
   */
  heightAt(x: number, y: number, radius?: number): number | null {
    const C = LeafletSurface.CELL;
    for (const R of radius === undefined ? LeafletSurface.RADII : [radius]) {
      const r2 = R * R;
      const i0 = Math.floor((x - R) / C);
      const i1 = Math.floor((x + R) / C);
      const j0 = Math.floor((y - R) / C);
      const j1 = Math.floor((y + R) / C);
      let wSum = 0;
      let zSum = 0;
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const cell = this.cells.get(LeafletSurface.key(i, j));
          if (!cell) continue;
          for (const k of cell) {
            const dx = this.x[k] - x;
            const dy = this.y[k] - y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= r2) continue;
            const u = 1 - d2 / r2;
            const w = u * u;
            wSum += w;
            zSum += w * this.z[k];
          }
        }
      }
      if (wSum > 1e-9) return zSum / wSum;
    }
    return null;
  }
}
