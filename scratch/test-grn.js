import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { sendToGemini } from '../src/services/geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const pdfPath = 'uploads/1781445780014-GRN_1.pdf';
    console.log('Reading GRN PDF:', pdfPath);
    const fileBuffer = await fs.readFileSync(pdfPath);
    const parsed = await pdfParse(fileBuffer);
    console.log('Calling sendToGemini for GRN...');
    const result = await sendToGemini(parsed.text, 'grn');
    console.log('--- GRN Result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
