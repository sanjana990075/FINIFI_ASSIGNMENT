import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from '../src/models/purchaseOrderModel.js';
import GRN from '../src/models/grnModel.js';
import Invoice from '../src/models/invoiceModel.js';
import MatchResult from '../src/models/matchResultModel.js';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully.');

    const poNumber = 'CI4PO05788';
    const query = { poNumber: new RegExp(`^${poNumber}$`, 'i') };

    const pos = await PurchaseOrder.find(query).lean();
    const grns = await GRN.find(query).lean();
    const invoices = await Invoice.find(query).lean();
    const results = await MatchResult.find(query).lean();

    console.log(`\n=== POs (${pos.length}) ===`);
    console.log(JSON.stringify(pos, null, 2));

    console.log(`\n=== GRNs (${grns.length}) ===`);
    console.log(JSON.stringify(grns, null, 2));

    console.log(`\n=== Invoices (${invoices.length}) ===`);
    console.log(JSON.stringify(invoices, null, 2));

    console.log(`\n=== MatchResults (${results.length}) ===`);
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
