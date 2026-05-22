import type { RawChain } from './types.js';

export function parsePdb(content: string): RawChain[] {
  const chainMap = new Map<string, Set<number>>();

  for (const line of content.split('\n')) {
    if (!line.startsWith('ATOM  ') && !line.startsWith('ATOM ')) continue;
    if (line.length < 26) continue;

    const chainId = line[21];
    if (!chainId || chainId.trim() === '') continue;

    const resNumStr = line.slice(22, 26).trim();
    const resNum = parseInt(resNumStr, 10);
    if (isNaN(resNum)) continue;

    if (!chainMap.has(chainId)) chainMap.set(chainId, new Set());
    chainMap.get(chainId)!.add(resNum);
  }

  return Array.from(chainMap.entries()).map(([chainId, residues]) => ({ chainId, residues }));
}
