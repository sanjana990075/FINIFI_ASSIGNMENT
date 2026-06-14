import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from '../src/models/invoiceModel.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const invoice = await Invoice.findOne().sort({ createdAt: -1 });
    if (!invoice) {
      console.log('No invoices found in database.');
    } else {
      console.log('Latest Invoice Items:');
      console.log(JSON.stringify(invoice.items, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
