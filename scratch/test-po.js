import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { sendToGemini } from '../src/services/geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const pdfPath = 'uploads/1781445748845-PO_1.pdf';
    console.log('Reading PO PDF:', pdfPath);
    const fileBuffer = await fs.readFileSync(pdfPath);
    const parsed = await pdfParse(fileBuffer);
    console.log('Calling sendToGemini for PO...');
    const result = await sendToGemini(parsed.text, 'po');
    console.log('--- PO Result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
