import { extractTextFromPDF } from '../src/utils/pdfParser.js';

async function main() {
  const files = [
    './Invoice_2026_001.pdf',
    './Professional_INV1001.pdf'
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
