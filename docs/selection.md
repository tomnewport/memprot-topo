# Selecting residues

`<topology-display>` binds a residue selection both ways (issue #17): the page
sets it with the `selection` attribute, and the user changes it by picking a
chain or clicking a helix/strand, which fires an event.

```html
<topology-display selection="A:45-60"></topology-display>
<script type="module">
  const view = document.querySelector('topology-display');
  view.addEventListener('chain-select', (e) => console.log(e.detail));
  view.addEventListener('element-click', (e) => console.log(e.detail));
</script>
```

## The `selection` attribute

| Value     | Meaning                                 |
| --------- | --------------------------------------- |
| `A:45-60` | residues 45 to 60 of chain A, inclusive |
| `A:45`    | residue 45 of chain A                   |
| `A`       | the whole of chain A                    |
| `A:-3-10` | negative residue numbers are allowed    |
| `A:60-45` | a reversed range is read as `A:45-60`   |

Residue numbers are author numbers (`resSeq`, as in the PDB file). A range
takes in residues with insertion codes by their number, so `A:100-101` includes
100A. Chain IDs are case-sensitive. Whitespace is ignored.

Setting it:

- **shows the named chain**, as if it had been picked in the chain picker;
- **styles every helix, strand and loop with a residue in the range** as
  selected (a wider outline and a glow in the element's own colour, brightened;
  see the `selection*` tokens in
  [theming.md](theming.md)). Elements are selected whole: `A:50-52` on a helix
  spanning 45–60 marks that helix.

Edge cases:

- **A range that spans chains** (`A:45-B:60`) or a list (`A:1-5,B:1-5`) cannot be
  expressed; the value is invalid. One selection is one range on one chain.
- **An invalid value** is ignored with a console warning: no selection, and the
  displayed chain stays as it would be without the attribute.
- **A chain not in the protein** (or one with no Cα coordinates) is no
  selection; the default chain is shown.
- **A range with no residues in the chain** (e.g. `A:900-950`) still shows
  chain A, with nothing styled. A range partly outside the chain styles the
  part inside it.

The attribute may be set before the protein data loads, and it is kept when
the data changes. The `selection` property returns the resolved selection
(`{ chainId, start, end }`, with a whole-chain selection resolved to the
chain's first and last residue), or `null`. Assigning an object or a string to
it writes the attribute.

## Events

All events bubble and cross the shadow boundary (`composed`). They fire only
for user actions, never for changes the page makes to `selection`.

| Event           | When                                            | `detail`                                |
| --------------- | ----------------------------------------------- | --------------------------------------- |
| `chain-select`  | a chain is picked in the chain picker           | `{ chainId, start, end }` (whole chain) |
| `element-click` | a helix/strand is clicked, or Enter/Space on it | `{ chainId, start, end, type }`         |
| `element-hover` | the pointer or focus moves onto a helix/strand  | `{ chainId, start, end, type }`         |
| `element-hover` | the pointer or focus leaves the elements        | `null`                                  |

`type` is `'helix'` or `'strand'`. The types are exported as
`TopologySelection` and `TopologyElementDetail`.

A user action also updates the selection: picking a chain selects the whole
chain, and clicking an element selects its residues. The new value is written
back to the `selection` attribute, so the page can read it there or from the
event. When a new protein is loaded, a selection the user made this way is
kept if the new protein has that chain, and cleared otherwise; one the page
set is always kept. `resetView()` clears the user's selection and chain pick.

## Keyboard and styling

Helices and strands are buttons (`role="button"`, `aria-pressed` while
selected) in the tab order, with an `aria-label` such as "Helix 45–60". Enter
or Space activates the focused one. Hover and keyboard focus brighten the
element and give it a dark outline.

Only the displayed chain's elements are interactive: in an assembly barrel the
faded neighbouring protomers are context, not part of the selection. The 3-D
view shows the selection with the same glow and wider outlines (changing it
there keeps the view), but its elements are not clickable.
