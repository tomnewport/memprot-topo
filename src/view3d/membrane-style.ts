/**
 * How the leaflets are drawn in 3-D: a square grid of lines, polar rings and
 * spokes that follow the protein's outline near it and turn into circles
 * further out, or a translucent surface coloured by height. Kept in their own
 * tiny module so the component can offer them without loading the 3-D code.
 */
export type MembraneStyle = 'grid' | 'polar' | 'surface';
export const MEMBRANE_STYLES: readonly MembraneStyle[] = ['grid', 'polar', 'surface'];
export const DEFAULT_MEMBRANE_STYLE: MembraneStyle = 'grid';
