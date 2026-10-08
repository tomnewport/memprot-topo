/** Three-letter residue names → one-letter codes, including common modified residues. */
const ONE_LETTER: Record<string, string> = {
  ALA: 'A',
  ARG: 'R',
  ASN: 'N',
  ASP: 'D',
  CYS: 'C',
  GLN: 'Q',
  GLU: 'E',
  GLY: 'G',
  HIS: 'H',
  ILE: 'I',
  LEU: 'L',
  LYS: 'K',
  MET: 'M',
  PHE: 'F',
  PRO: 'P',
  SER: 'S',
  THR: 'T',
  TRP: 'W',
  TYR: 'Y',
  VAL: 'V',
  SEC: 'U',
  PYL: 'O',
  // Modified residues, by their parent amino acid.
  MSE: 'M',
  HSD: 'H',
  HSE: 'H',
  HSP: 'H',
  HID: 'H',
  HIE: 'H',
  HIP: 'H',
  CYX: 'C',
  SEP: 'S',
  TPO: 'T',
  PTR: 'Y',
};

/** One-letter code for a residue name; `X` when unknown or absent. */
export function oneLetter(resName: string | undefined): string {
  if (!resName) return 'X';
  const name = resName.trim().toUpperCase();
  if (name.length === 1) return /[A-Z]/.test(name) ? name : 'X';
  return ONE_LETTER[name] ?? 'X';
}

/** Kyte–Doolittle hydropathy of a one-letter code (undefined for unknown). */
export const KYTE_DOOLITTLE: Record<string, number> = {
  A: 1.8,
  R: -4.5,
  N: -3.5,
  D: -3.5,
  C: 2.5,
  Q: -3.5,
  E: -3.5,
  G: -0.4,
  H: -3.2,
  I: 4.5,
  L: 3.8,
  K: -3.9,
  M: 1.9,
  F: 2.8,
  P: -1.6,
  S: -0.8,
  T: -0.7,
  W: -0.9,
  Y: -1.3,
  V: 4.2,
};
