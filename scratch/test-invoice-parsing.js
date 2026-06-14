import fs from 'fs';
import pdfParse from 'pdf-parse';
import { sendToGemini } from '../src/services/geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const pdfPath = 'uploads/1781445808993-Invoice_1.pdf';
    console.log('Reading Invoice PDF:', pdfPath);
    const fileBuffer = fs.readFileSync(pdfPath);
    const parsed = await pdfParse(fileBuffer);
    console.log('Calling sendToGemini...');
    const result = await sendToGemini(parsed.text, 'invoice');
    console.log('--- Parsed Invoice JSON ---');
    console.log(JSON.stringify(result.parsedData, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
