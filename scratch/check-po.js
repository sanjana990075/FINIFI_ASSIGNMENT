import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from '../src/models/purchaseOrderModel.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const po = await PurchaseOrder.findOne().sort({ createdAt: -1 });
    if (!po) {
      console.log('No POs found in database.');
    } else {
      console.log('Latest PO Items:');
      console.log(JSON.stringify(po.items, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
