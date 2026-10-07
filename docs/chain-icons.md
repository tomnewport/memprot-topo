# Chain-picker icons

When a structure has more than one chain, `<topology-display>` shows a row of
icons to pick the chain to draw. Each icon is deliberately simple: a 5 × 6 grid
with the protein in the middle three columns and the membrane in the middle two
rows.

| Row | Contents (h = half the membrane thickness, z from the membrane centre) |
| --- | ---------------------------------------------------------------------- |
| 1   | z > 2h — more than half a thickness above the membrane surface         |
| 2   | h < z ≤ 2h — surface to half a thickness above                         |
| 3   | 0 < z ≤ h — upper leaflet                                              |
| 4   | −h < z ≤ 0 — lower leaflet                                             |
| 5   | −2h < z ≤ −h — surface to half a thickness below                       |
| 6   | z ≤ −2h — more than half a thickness below                             |

Rows 2–5 are linear in z. Rows 1 and 6 compress everything further out into a
single row, scaled to the furthest Cα across all chains so icons stay
comparable.

A chain is drawn as a mirrored violin: a Gaussian kernel density estimate of
its Cα z positions, cut at the chain's highest and lowest Cα. The violin is
stacked by secondary structure: helix innermost, strand around
it, and coil as a pale outer halo, so the outer edge is the total density. All
violins share one width scale, so a larger chain draws a wider violin.

A chain whose Cα all lie more than half a thickness outside the membrane is
drawn instead as a rounded box hanging into the top or bottom row, layered the
same way by its secondary-structure composition.

The chain label sits in the icon's lower-left corner. Copies of the same chain
(same residue count, labelled A(I), A(II), …) share one icon, with a dropdown
beneath it to pick the copy; picking from the icon or the dropdown emits
`chain-select` (see [selection.md](selection.md)). The residue count is in the tooltip. A
faint layout grid shows on hover and on the selected chain.

## Attributes

| Attribute        | Default                   | Meaning                          |
| ---------------- | ------------------------- | -------------------------------- |
| `icon-bandwidth` | membrane thickness (30 Å) | KDE bandwidth (Gaussian σ) in Å. |

## Membrane datum

Rows are measured from the membrane centre. Input coordinates are expected in
the OPM / MemProtMD membrane frame, where z = 0 is the bulk bilayer midplane,
so the centre is currently z = 0 and the thickness is 30 Å. Explicit bulk and
annular leaflet positions are tracked in #24; once they exist, the bulk centre
and thickness will feed the icons.
