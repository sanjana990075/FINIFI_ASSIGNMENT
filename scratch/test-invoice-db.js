import fs from 'fs/promises';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import Invoice from '../src/models/invoiceModel.js';
import { sendToGemini } from '../src/services/geminiService.js';
import { updateMatchResult } from '../src/services/matchService.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const invPath = 'uploads/1781445808993-Invoice_1.pdf';

    console.log('\n--- Processing Invoice ---');
    const invBuffer = await fs.readFile(invPath);
    const invText = (await pdfParse(invBuffer)).text;
    console.log('Parsing Invoice with Gemini/Groq...');
    const invParsed = await sendToGemini(invText, 'invoice');
    
    // Remove any existing invoices for this PO first to avoid duplicate invoice number errors
    await Invoice.deleteMany({ poNumber: invParsed.parsedData.poNumber });
    
    const invDoc = await Invoice.create({
      invoiceNumber: invParsed.parsedData.invoiceNumber,
      poNumber: invParsed.parsedData.poNumber,
      invoiceDate: invParsed.parsedData.invoiceDate ? new Date(invParsed.parsedData.invoiceDate) : new Date(),
      items: invParsed.parsedData.items,
      rawGeminiResponse: invParsed,
    });
    console.log(`Invoice saved. Number: ${invDoc.invoiceNumber}, Items: ${invDoc.items.length}`);

    console.log('\n--- Running Match Engine Recalculation ---');
    const matchRes = await updateMatchResult('CI4PO05788');
    
    console.log('\n================ MATCH RESULT ================');
    console.log(JSON.stringify(matchRes, null, 2));
    console.log('==============================================');

  } catch (error) {
    console.error('Error in flow:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
