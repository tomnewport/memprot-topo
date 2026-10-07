/** Options for {@link syntheticDistortions}. */
export interface SyntheticDistortionsOptions {
  /** z of the bulk midplane in the file's frame (Å). */
  midplane: number;
  /** Bulk half-thickness (Å). */
  half: number;
  /** Centre and radius (Å) of the analysed patch. */
  centre: { x: number; y: number };
  radius: number;
  /** Grid spacing (Å). Default 2. */
  spacing?: number;
  /** Local thickening of each leaflet at (x, y), Å (negative = thinner). Default 0. */
  bump?: (x: number, y: number) => number;
  /** Write the B-factor column (the displacement). Default true. */
  bFactors?: boolean;
}

const f = (v: number, w: number, d: number) => v.toFixed(d).padStart(w);

/**
 * A MemProtMD-style distortions file: a disc of points on each leaflet's
 * headgroup surface, its outer rim tagged `O`, plus the `LCC`/`UCC`
 * colour-scale records the real files carry.
 */
export function syntheticDistortions(o: SyntheticDistortionsOptions): string {
  const spacing = o.spacing ?? 2;
  const bump = o.bump ?? (() => 0);
  const withB = o.bFactors ?? true;
  const lines = ['HEADER    ', 'TITLE     SYNTHETIC DISTORTIONS', 'MODEL         1'];
  let serial = 0;
  const atom = (name: string, res: string, x: number, y: number, z: number, b: number) => {
    serial++;
    const tail = withB ? `${f(0, 6, 2)}${f(b, 6, 2)}           S` : '';
    lines.push(
      `ATOM  ${String(serial % 100000).padStart(5)} ${name.padEnd(4)} ${res.padEnd(3)}  ` +
        `${String(serial % 10000).padStart(4)}    ${f(x, 8, 3)}${f(y, 8, 3)}${f(z, 8, 3)}${tail}`,
    );
  };
  for (const [leaf, sign] of [
    ['U', 1],
    ['L', -1],
  ] as const) {
    const n = Math.ceil(o.radius / spacing);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const r = Math.hypot(i, j) * spacing;
        if (r > o.radius) continue;
        const x = o.centre.x + i * spacing;
        const y = o.centre.y + j * spacing;
        const d = bump(x, y);
        const z = o.midplane + sign * (o.half + d);
        const rim = r > o.radius - spacing ? 'O' : 'M';
        atom('S-1S', `${leaf}${rim}0`, x, y, z, Math.max(-10, Math.min(10, d)));
      }
    }
    atom('MIN', `${leaf}CC`, 0, 0, 0, -10);
    atom('MID', `${leaf}CC`, 1, 0, 0, 0);
    atom('MAX', `${leaf}CC`, 2, 0, 0, 10);
  }
  lines.push('ENDMDL', 'END');
  return lines.join('\n') + '\n';
}

/**
 * Cα of a straight transmembrane helix along z through (x, y), from z0 to
 * z1, 1.5 Å rise per residue.
 */
export function helixCalphas(
  x: number,
  y: number,
  z0: number,
  z1: number,
  firstResSeq = 1,
): { resSeq: number; iCode: string; x: number; y: number; z: number }[] {
  const n = Math.floor((z1 - z0) / 1.5) + 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / 3.6;
    out.push({
      resSeq: firstResSeq + i,
      iCode: '',
      x: x + 2.3 * Math.cos(t),
      y: y + 2.3 * Math.sin(t),
      z: z0 + i * 1.5,
    });
  }
  return out;
}
