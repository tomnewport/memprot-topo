/** A residue of a SIFTS file: chain, author number (null: not observed), UniProt entry and position. */
export type SiftsRow = [
  chain: string,
  author: string | null,
  accession: string | null,
  uniprot?: number,
];

/** A minimal SIFTS XML file in PDBe's layout, with the cross-references the parser reads. */
export function siftsXml(rows: SiftsRow[]): string {
  const residues = rows.map(([chain, author, accession, uniprot], i) => {
    const unp = accession
      ? `\n          <crossRefDb dbSource="UniProt" dbCoordSys="UniProt" dbAccessionId="${accession}" dbResNum="${uniprot}" dbResName="A"/>` +
        `\n          <crossRefDb dbSource="NCBI" dbCoordSys="UniProt" dbAccessionId="9606" dbResNum="${uniprot}" dbResName="A"/>`
      : '';
    return `        <residue dbSource="PDBe" dbCoordSys="PDBe" dbResNum="${i + 1}" dbResName="ALA">
          <crossRefDb dbSource="PDB" dbCoordSys="PDBresnum" dbAccessionId="1abc" dbResNum="${author ?? 'null'}" dbResName="ALA" dbChainId="${chain}"/>${unp}
          <residueDetail dbSource="PDBe" property="codeSecondaryStructure">T</residueDetail>
        </residue>`;
  });
  return `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<entry dbSource="PDBe" dbCoordSys="PDBe" dbAccessionId="1abc">
  <entity type="protein" entityId="A">
    <segment segId="1abc_A_1_${rows.length}" start="1" end="${rows.length}">
      <listResidue>
${residues.join('\n')}
      </listResidue>
    </segment>
  </entity>
</entry>
`;
}
