/**
 * How the leaflets are drawn in 3-D: a square grid of lines, polar rings and
 * spokes that follow the protein's outline near it and turn into circles
 * further out, or a translucent surface coloured by height. Kept in their own
 * tiny module so the component can offer them without loading the 3-D code.
 */
export type MembraneStyle = 'grid' | 'polar' | 'surface';
export const MEMBRANE_STYLES: readonly MembraneStyle[] = ['grid', 'polar', 'surface'];
export const DEFAULT_MEMBRANE_STYLE: MembraneStyle = 'polar';

/** Default spacing (Å) of the grid or polar lines; 0 would size it from the disc. */
export const DEFAULT_GRID_SPACING = 1;

/**
 * How the grid and polar lines are coloured: one plain colour, or by how much
 * thinner or thicker the bilayer is than the bulk, as the surface style is.
 */
export type MembraneColour = 'plain' | 'thickness';
export const MEMBRANE_COLOURS: readonly MembraneColour[] = ['plain', 'thickness'];
export const DEFAULT_MEMBRANE_COLOUR: MembraneColour = 'plain';
