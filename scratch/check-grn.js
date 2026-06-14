import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GRN from '../src/models/grnModel.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const grn = await GRN.findOne().sort({ createdAt: -1 });
    if (!grn) {
      console.log('No GRNs found in database.');
    } else {
      console.log('Latest GRN Items:');
      console.log(JSON.stringify(grn.items, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
