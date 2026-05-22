/**
 * Hardcoded reference protein data for gallery screenshots.
 * Uses synthetic but plausible secondary structure assignments
 * derived from published topology literature for each protein.
 */
export const GALLERY_PROTEINS = [
  {
    pdbId: '3k19',
    label: 'A2A Adenosine Receptor',
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
    pdbId: '2omf',
    label: 'OmpF Porin',
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
    pdbId: '7ahl',
    label: 'Alpha-Hemolysin',
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
