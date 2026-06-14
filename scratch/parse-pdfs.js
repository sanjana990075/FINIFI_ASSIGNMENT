import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../src/utils/pdfParser.js';

async function main() {
  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));

  console.log(`Found ${files.length} PDFs in ${uploadsDir}`);

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    try {
      const text = await extractTextFromPDF(filePath);
      const hasPO = text.includes('CI4PO05788');
      const poMatches = text.match(/CI4PO\d+/g);
      console.log(`File: ${file} | Size: ${fs.statSync(filePath).size} | Contains CI4PO05788: ${hasPO} | PO Matches: ${poMatches}`);
    } catch (err) {
      console.error(`Error parsing ${file}:`, err.message);
    }
  }
}

main();
