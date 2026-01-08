// Minimal mock document list that always has a selectable latestVersion

export async function fetchLoanDocumentsMock(_loanId: string) {
  const now = new Date().toISOString();

  return [
    {
      documentId: "demo-doc-001",
      type: "FACILITY_AGREEMENT",
      title: "Facility Agreement (Demo)",
      createdAt: now,
      latestVersion: {
        documentVersionId: "demo-docver-001",
        version: 1,
        fileName: "facility_agreement_demo.txt",
        contentType: "text/plain",
        uploadedAt: now,
        checksum: undefined,
        fileKey: "demo://facility_agreement_demo.txt",
      },
      versions: [
        {
          documentVersionId: "demo-docver-001",
          version: 1,
          fileName: "facility_agreement_demo.txt",
          contentType: "text/plain",
          uploadedAt: now,
          checksum: undefined,
          fileKey: "demo://facility_agreement_demo.txt",
        },
      ],
    },
  ];
}

