# secondary-structure

DSSP computed in the browser on the coordinates actually drawn (#79):
`computeDssp` assigns α, 3₁₀ and π helices, β-bridges and ladders from a
structure's backbone (`parsePdbBackbone`), and `structureSecondaryStructure`
turns that into the segments and ladders `mergeProteinData` takes, numbered
like the structure's Cα. `<topology-loader>` uses it unless
`ss-source="pdb-redo"`. See `docs/secondary-structure.md`.
