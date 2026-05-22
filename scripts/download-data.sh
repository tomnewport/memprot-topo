#!/usr/bin/env bash
# Downloads protein data files for the bundled demo.
# Sources:
#   MemProtMD — CC BY 4.0 — Newport, Sansom & Stansfeld (Oxford)
#   PDB-REDO  — copyright-free — Vriend et al. (CMBI Nijmegen)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEMPROTMD_DIR="$REPO_ROOT/data/memprotmd"
PDBREDO_DIR="$REPO_ROOT/data/pdbredo"

mkdir -p "$MEMPROTMD_DIR" "$PDBREDO_DIR"

PROTEINS=(3k19 2omf 7ahl)

for id in "${PROTEINS[@]}"; do
  echo "Downloading MemProtMD PDB for $id..."
  curl -fsSL \
    "https://memprotmd.bioch.ox.ac.uk/data/memprotmd/simulations/${id}_default_dppc/files/structures/at.pdb" \
    -o "$MEMPROTMD_DIR/${id}.pdb"
  echo "  -> $MEMPROTMD_DIR/${id}.pdb ($(wc -l < "$MEMPROTMD_DIR/${id}.pdb") lines)"

  echo "Downloading PDB-REDO DSSP for $id..."
  curl -fsSL \
    "https://pdb-redo.eu/dssp/get?pdb-id=${id}&format=mmcif" \
    -o "$PDBREDO_DIR/${id}.mmcif"
  echo "  -> $PDBREDO_DIR/${id}.mmcif ($(wc -l < "$PDBREDO_DIR/${id}.mmcif") lines)"
done

echo ""
echo "Done. Commit the data/ directory and push to main."
