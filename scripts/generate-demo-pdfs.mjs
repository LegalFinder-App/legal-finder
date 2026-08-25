import fs from "node:fs";
import path from "node:path";

const dir = path.join("public", "docs", "demo");
fs.mkdirSync(dir, { recursive: true });

const files = [
  "constitution-of-uganda-demo.pdf",
  "employment-act-2006-demo.pdf",
  "land-act-1998-demo.pdf",
  "evidence-act-demo.pdf",
  "civil-procedure-rules-demo.pdf",
  "children-act-demo.pdf",
  "data-protection-privacy-act-2019-demo.pdf",
  "succession-act-demo.pdf",
  "legal-document-demo.pdf",
  "judgement-sck-pet-12-demo.pdf",
  "judgement-ca-civ-238-demo.pdf",
  "judgement-hc-crim-91-demo.pdf",
  "judgement-elrc-45-demo.pdf",
  "judgement-elc-302-demo.pdf",
  "retainer-agreement-demo.pdf",
  "national-id-copy-demo.pdf",
  "hearing-notice-demo.pdf",
  "affidavit-demo.pdf",
];

function pdfFor(title) {
  const safe = title.replace(/[()\\]/g, "");
  const stream = `BT /F1 16 Tf 50 750 Td (${safe}) Tj T* /F1 11 Tf (LegalFinder presentation demo. Not an official source.) Tj ET`;
  const objs = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const o of objs) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${o}\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

for (const file of files) {
  const title = file.replace(/-demo\.pdf$/, "").replace(/-/g, " ");
  fs.writeFileSync(path.join(dir, file), pdfFor(title));
}

console.log(`wrote ${files.length} demo PDFs to ${dir}`);
