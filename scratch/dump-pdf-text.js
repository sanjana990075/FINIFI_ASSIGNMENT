import { extractTextFromPDF } from '../src/utils/pdfParser.js';

async function main() {
  const files = [
    './uploads/1781437328897-PO_1.pdf',
    './uploads/1781437346371-GRN_1.pdf',
    './uploads/1781437564952-Invoice_1.pdf'
  ];

  for (const file of files) {
    console.log(`\n======================================\nFILE: ${file}\n======================================`);
    try {
      const text = await extractTextFromPDF(file);
      console.log(text);
    } catch (err) {
      console.error(`Error parsing ${file}:`, err.message);
    }
  }
}

main();
