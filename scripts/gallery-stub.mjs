import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('gallery-output', { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">
  <rect width="400" height="100" fill="#f0f0f0" />
  <text x="200" y="55" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#333">
    Gallery placeholder — rendering not yet implemented
  </text>
</svg>`;

writeFileSync('gallery-output/placeholder.svg', svg);
console.log('Gallery placeholder written to gallery-output/placeholder.svg');
