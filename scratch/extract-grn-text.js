import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  try {
    const fileBuffer = fs.readFileSync('uploads/1781445780014-GRN_1.pdf');
    const parsed = await pdfParse(fileBuffer);
    fs.writeFileSync('scratch/grn-text.txt', parsed.text);
    console.log('GRN text written to scratch/grn-text.txt');
  } catch (error) {
    console.error(error);
  }
}

run();
