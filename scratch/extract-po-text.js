import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  try {
    const fileBuffer = fs.readFileSync('uploads/1781445748845-PO_1.pdf');
    const parsed = await pdfParse(fileBuffer);
    fs.writeFileSync('scratch/po-text.txt', parsed.text);
    console.log('PO text written to scratch/po-text.txt');
  } catch (error) {
    console.error(error);
  }
}

run();
