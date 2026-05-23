/**
 * Reference protein data for gallery screenshots.
 *
 * Each entry has hand-curated secondary structure ranges from the published
 * topology literature. Cα coordinates are *synthesised* from those ranges
 * (idealised TM helices arranged on a ring, or strands on a barrel surface
 * with a ~37° tilt) so the gallery renders without needing network access in
 * CI. This is a visual regression target for the rendering pipeline rather
 * than a faithful representation of the real structure.
 */

const HELIX_RADIUS = 2.3;
const HELIX_RES_PER_TURN = 3.6;
const MEMBRANE_HALF = 18;
const LOOP_LIFT = 22;
const BARREL_TILT_DEG = 37;

/**
 * Generate synthetic Cα coordinates from a chain's secondary structure ranges.
 *
 * topology: 'bundle' — TM helices arranged radially round a centre point.
 * topology: 'barrel' — strands placed on the surface of a cylinder, alternating
 *           up/down with a ~37° tilt to the membrane normal.
 */
function synthesiseCalphas(chain, { topology, ringRadius }) {
  const wantedType = topology === 'barrel' ? 'strand' : 'helix';
  const tmSegments = chain.segments.filter((s) => s.type === wantedType);
  if (tmSegments.length === 0) return [];

  const centres = tmSegments.map((_, i) => {
    const theta = (i / tmSegments.length) * 2 * Math.PI;
    return { theta, x: ringRadius * Math.cos(theta), y: ringRadius * Math.sin(theta) };
  });
  // Alternate up/down across the membrane along the chain.
  const directions = tmSegments.map((_, i) => (i % 2 === 0 ? 'up' : 'down'));

  const calphas = [];
  for (let resSeq = 1; resSeq <= chain.residueCount; resSeq++) {
    const tmIdx = tmSegments.findIndex((s) => resSeq >= s.start && resSeq <= s.end);

    if (tmIdx >= 0) {
      const tm = tmSegments[tmIdx];
      const centre = centres[tmIdx];
      const dir = directions[tmIdx];
      const tmLen = Math.max(1, tm.end - tm.start);
      const posInTm = resSeq - tm.start;
      const u = posInTm / tmLen; // 0..1 along the segment
      const zStart = dir === 'up' ? -MEMBRANE_HALF : MEMBRANE_HALF;
      const zEnd = dir === 'up' ? MEMBRANE_HALF : -MEMBRANE_HALF;
      const z = zStart + u * (zEnd - zStart);

      if (topology === 'bundle') {
        const theta = centre.theta + (posInTm * 2 * Math.PI) / HELIX_RES_PER_TURN;
        calphas.push({
          resSeq,
          iCode: '',
          x: centre.x + HELIX_RADIUS * Math.cos(theta),
          y: centre.y + HELIX_RADIUS * Math.sin(theta),
          z,
        });
      } else {
        // Strand on the barrel surface, tilted ~37° to z.
        const tilt = (BARREL_TILT_DEG * Math.PI) / 180;
        const tangentialShear = (Math.tan(tilt) * (2 * MEMBRANE_HALF)) / ringRadius;
        const theta = centre.theta + (dir === 'up' ? 1 : -1) * tangentialShear * (u - 0.5);
        calphas.push({
          resSeq,
          iCode: '',
          x: ringRadius * Math.cos(theta),
          y: ringRadius * Math.sin(theta),
          z,
        });
      }
      continue;
    }

    // Loop residue: linearly interpolate between flanking TM ends, lifted to
    // the appropriate side of the membrane.
    const prevTm = [...tmSegments].reverse().find((s) => s.end < resSeq) ?? null;
    const nextTm = tmSegments.find((s) => s.start > resSeq) ?? null;
    const prevCentre = prevTm ? centres[tmSegments.indexOf(prevTm)] : null;
    const nextCentre = nextTm ? centres[tmSegments.indexOf(nextTm)] : null;
    const prevDir = prevTm ? directions[tmSegments.indexOf(prevTm)] : null;

    const loopZ = prevDir === 'up' ? LOOP_LIFT : -LOOP_LIFT;

    let x = 0;
    let y = 0;
    if (prevCentre && nextCentre) {
      const total = nextTm.start - prevTm.end;
      const t = (resSeq - prevTm.end) / total;
      x = prevCentre.x + (nextCentre.x - prevCentre.x) * t;
      y = prevCentre.y + (nextCentre.y - prevCentre.y) * t;
    } else if (prevCentre) {
      x = prevCentre.x;
      y = prevCentre.y;
    } else if (nextCentre) {
      x = nextCentre.x;
      y = nextCentre.y;
    }
    calphas.push({ resSeq, iCode: '', x, y, z: loopZ });
  }

  return calphas;
}

function withCalphas(protein) {
  return {
    ...protein,
    data: {
      ...protein.data,
      chains: protein.data.chains.map((chain) => ({
        ...chain,
        calphas: synthesiseCalphas(chain, {
          topology: protein.topology,
          ringRadius: protein.ringRadius,
        }),
      })),
    },
  };
}

const PROTEINS = [
  {
    pdbId: '3k19',
    label: 'A2A Adenosine Receptor',
    topology: 'bundle',
    ringRadius: 8,
    data: {
      pdbId: '3k19',
      chains: [
        {
          chainId: 'A',
          residueCount: 317,
          segments: [
            { start: 10, end: 37, type: 'helix' },
            { start: 68, end: 97, type: 'helix' },
            { start: 104, end: 135, type: 'helix' },
            { start: 148, end: 172, type: 'helix' },
            { start: 197, end: 226, type: 'helix' },
            { start: 239, end: 265, type: 'helix' },
            { start: 272, end: 300, type: 'helix' },
          ],
        },
      ],
    },
  },
  {
    pdbId: '5g53',
    label: 'A2A Adenosine Receptor with engineered G-protein',
    topology: 'bundle',
    ringRadius: 8,
    data: {
      pdbId: '5g53',
      chains: [
        {
          chainId: 'A',
          residueCount: 308,
          segments: [
            { start: 6, end: 32, type: 'helix' },
            { start: 41, end: 67, type: 'helix' },
            { start: 78, end: 109, type: 'helix' },
            { start: 121, end: 142, type: 'helix' },
            { start: 173, end: 205, type: 'helix' },
            { start: 222, end: 252, type: 'helix' },
            { start: 261, end: 290, type: 'helix' },
          ],
        },
      ],
    },
  },
  {
    pdbId: '2omf',
    label: 'OmpF Porin',
    topology: 'barrel',
    ringRadius: 11,
    data: {
      pdbId: '2omf',
      chains: [
        {
          chainId: 'A',
          residueCount: 340,
          segments: [
            { start: 1, end: 5, type: 'strand' },
            { start: 25, end: 32, type: 'strand' },
            { start: 40, end: 47, type: 'strand' },
            { start: 60, end: 68, type: 'strand' },
            { start: 76, end: 84, type: 'strand' },
            { start: 95, end: 103, type: 'strand' },
            { start: 111, end: 119, type: 'strand' },
            { start: 128, end: 136, type: 'strand' },
            { start: 145, end: 152, type: 'strand' },
            { start: 163, end: 171, type: 'strand' },
            { start: 180, end: 188, type: 'strand' },
            { start: 200, end: 208, type: 'strand' },
            { start: 218, end: 226, type: 'strand' },
            { start: 234, end: 242, type: 'strand' },
            { start: 250, end: 258, type: 'strand' },
            { start: 267, end: 275, type: 'strand' },
          ],
        },
      ],
    },
  },
  {
    pdbId: '2j1n',
    label: 'OmpC Osmoporin',
    topology: 'barrel',
    ringRadius: 11,
    data: {
      pdbId: '2j1n',
      chains: [
        {
          chainId: 'A',
          residueCount: 346,
          segments: [
            { start: 1, end: 8, type: 'strand' },
            { start: 26, end: 33, type: 'strand' },
            { start: 45, end: 52, type: 'strand' },
            { start: 64, end: 71, type: 'strand' },
            { start: 80, end: 88, type: 'strand' },
            { start: 102, end: 110, type: 'strand' },
            { start: 122, end: 130, type: 'strand' },
            { start: 145, end: 153, type: 'strand' },
            { start: 165, end: 173, type: 'strand' },
            { start: 185, end: 193, type: 'strand' },
            { start: 207, end: 215, type: 'strand' },
            { start: 232, end: 240, type: 'strand' },
            { start: 252, end: 260, type: 'strand' },
            { start: 277, end: 285, type: 'strand' },
            { start: 295, end: 303, type: 'strand' },
            { start: 317, end: 325, type: 'strand' },
          ],
        },
      ],
    },
  },
  {
    pdbId: '7ahl',
    label: 'Alpha-Hemolysin',
    topology: 'barrel',
    ringRadius: 7,
    data: {
      pdbId: '7ahl',
      chains: [
        {
          chainId: 'A',
          residueCount: 293,
          segments: [
            { start: 108, end: 113, type: 'strand' },
            { start: 116, end: 121, type: 'strand' },
            { start: 126, end: 131, type: 'strand' },
            { start: 134, end: 139, type: 'strand' },
            { start: 258, end: 263, type: 'strand' },
            { start: 265, end: 270, type: 'strand' },
          ],
        },
      ],
    },
  },
];

export const GALLERY_PROTEINS = PROTEINS.map(withCalphas);
