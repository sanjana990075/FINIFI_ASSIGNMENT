import fs from 'fs/promises';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import PurchaseOrder from '../src/models/purchaseOrderModel.js';
import GRN from '../src/models/grnModel.js';
import Invoice from '../src/models/invoiceModel.js';
import MatchResult from '../src/models/matchResultModel.js';
import { sendToGemini } from '../src/services/geminiService.js';
import { updateMatchResult } from '../src/services/matchService.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function clearCollections() {
  const collections = ['purchaseorders', 'grns', 'invoices', 'matchresults'];
  for (const name of collections) {
    try {
      await mongoose.connection.db.collection(name).deleteMany({});
      console.log(`Cleared collection: ${name}`);
    } catch (e) {
      // ignore
    }
  }
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected. Resetting collections...');
    await clearCollections();

    const poPath = 'uploads/1781445748845-PO_1.pdf';
    const grnPath = 'uploads/1781445780014-GRN_1.pdf';
    const invPath = 'uploads/1781445808993-Invoice_1.pdf';

    // 1. Process PO
    console.log('\n--- Processing PO ---');
    const poBuffer = await fs.readFile(poPath);
    const poText = (await pdfParse(poBuffer)).text;
    console.log('Parsing PO with Gemini...');
    const poParsed = await sendToGemini(poText, 'po');
    const poDoc = await PurchaseOrder.create({
      poNumber: poParsed.parsedData.poNumber,
      poDate: poParsed.parsedData.poDate ? new Date(poParsed.parsedData.poDate) : new Date(),
      vendorName: poParsed.parsedData.vendorName,
      items: poParsed.parsedData.items,
      rawGeminiResponse: poParsed,
    });
    console.log(`PO saved. Number: ${poDoc.poNumber}, Items: ${poDoc.items.length}`);

    // 2. Process GRN
    console.log('\n--- Processing GRN ---');
    const grnBuffer = await fs.readFile(grnPath);
    const grnText = (await pdfParse(grnBuffer)).text;
    console.log('Parsing GRN with Gemini...');
    const grnParsed = await sendToGemini(grnText, 'grn');
    const grnDoc = await GRN.create({
      grnNumber: grnParsed.parsedData.grnNumber,
      poNumber: grnParsed.parsedData.poNumber,
      grnDate: grnParsed.parsedData.grnDate ? new Date(grnParsed.parsedData.grnDate) : new Date(),
      items: grnParsed.parsedData.items,
      rawGeminiResponse: grnParsed,
    });
    console.log(`GRN saved. Number: ${grnDoc.grnNumber}, Items: ${grnDoc.items.length}`);

    // 3. Process Invoice
    console.log('\n--- Processing Invoice ---');
    const invBuffer = await fs.readFile(invPath);
    const invText = (await pdfParse(invBuffer)).text;
    console.log('Parsing Invoice with Gemini...');
    const invParsed = await sendToGemini(invText, 'invoice');
    const invDoc = await Invoice.create({
      invoiceNumber: invParsed.parsedData.invoiceNumber,
      poNumber: invParsed.parsedData.poNumber,
      invoiceDate: invParsed.parsedData.invoiceDate ? new Date(invParsed.parsedData.invoiceDate) : new Date(),
      items: invParsed.parsedData.items,
      rawGeminiResponse: invParsed,
    });
    console.log(`Invoice saved. Number: ${invDoc.invoiceNumber}, Items: ${invDoc.items.length}`);

    // 4. Recalculate match result
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
