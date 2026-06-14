import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import { sendToGemini } from '../src/services/geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const pdfPath = 'uploads/1781445808993-Invoice_1.pdf';
    console.log('Reading PDF:', pdfPath);
    const fileBuffer = await fs.readFile(pdfPath);
    const parsed = await pdfParse(fileBuffer);
    
    await fs.writeFile('scratch/extracted-text.txt', parsed.text);
    console.log('Extracted text written to scratch/extracted-text.txt');

    console.log('Calling sendToGemini...');
    const result = await sendToGemini(parsed.text, 'invoice');
    await fs.writeFile('scratch/gemini-result.json', JSON.stringify(result, null, 2));
    console.log('Gemini result written to scratch/gemini-result.json');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
