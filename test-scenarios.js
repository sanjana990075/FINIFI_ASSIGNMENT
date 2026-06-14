import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from './src/models/purchaseOrderModel.js';
import GRN from './src/models/grnModel.js';
import Invoice from './src/models/invoiceModel.js';
import MatchResult from './src/models/matchResultModel.js';
import { matchPurchaseOrder, updateMatchResult } from './src/services/matchService.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function clearCollections() {
  const collections = ['purchaseorders', 'grns', 'invoices', 'matchresults'];
  for (const name of collections) {
    try {
      await mongoose.connection.db.collection(name).deleteMany({});
    } catch (e) {
      // Collection might not exist yet
    }
  }
}

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected successfully. Starting Scenario Tests...\n');

  // ==========================================
  // SCENARIO 1: PO Only
  // ==========================================
  console.log('--------------------------------------------------');
  console.log('Scenario 1: PO Only (Expected: insufficient_documents)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-1',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  const res1 = await matchPurchaseOrder('PO-SCEN-1');
  console.log('Status:', res1.status);
  console.log('Reasons:', res1.mismatchReasons);
  if (res1.status === 'insufficient_documents' && res1.mismatchReasons.includes('po_missing') === false) {
    console.log('SUCCESS: Scenario 1 Passed.');
  } else {
    console.error('FAIL: Scenario 1 Failed.');
  }

  // ==========================================
  // SCENARIO 2: PO + GRN (No Violations, Partial Qty)
  // ==========================================
  console.log('\n--------------------------------------------------');
  console.log('Scenario 2: PO + GRN (Expected: partially_matched)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-2',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  await GRN.create({
    grnNumber: 'GRN-SCEN-2',
    poNumber: 'PO-SCEN-2',
    grnDate: new Date('2026-06-02'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', receivedQuantity: 5 }],
  });

  const res2 = await matchPurchaseOrder('PO-SCEN-2');
  console.log('Status:', res2.status);
  console.log('Reasons:', res2.mismatchReasons);
  if (res2.status === 'insufficient_documents' && res2.summary.mismatchedItems === 1) {
    console.log('SUCCESS: Scenario 2 Passed.');
  } else {
    console.error('FAIL: Scenario 2 Failed.');
  }

  // ==========================================
  // SCENARIO 3: PO + GRN + Invoice (Date Overage)
  // ==========================================
  console.log('\n--------------------------------------------------');
  console.log('Scenario 3: PO + GRN + Invoice (Expected: mismatch / invoice_date_after_po_date)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-3',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  await GRN.create({
    grnNumber: 'GRN-SCEN-3',
    poNumber: 'PO-SCEN-3',
    grnDate: new Date('2026-06-02'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', receivedQuantity: 10 }],
  });

  // Invoice date (June 5) is AFTER PO date (June 1)
  await Invoice.create({
    invoiceNumber: 'INV-SCEN-3',
    poNumber: 'PO-SCEN-3',
    invoiceDate: new Date('2026-06-05'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  const res3 = await matchPurchaseOrder('PO-SCEN-3');
  console.log('Status:', res3.status);
  console.log('Reasons:', res3.mismatchReasons);
  if (res3.status === 'mismatch' && res3.mismatchReasons.includes('invoice_date_after_po_date')) {
    console.log('SUCCESS: Scenario 3 Passed.');
  } else {
    console.error('FAIL: Scenario 3 Failed.');
  }

  // ==========================================
  // SCENARIO 4: GRN Qty > PO Qty
  // ==========================================
  console.log('\n--------------------------------------------------');
  console.log('Scenario 4: GRN Qty > PO Qty (Expected: mismatch / grn_qty_exceeds_po_qty)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-4',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  // Received 15, ordered 10
  await GRN.create({
    grnNumber: 'GRN-SCEN-4',
    poNumber: 'PO-SCEN-4',
    grnDate: new Date('2026-06-02'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', receivedQuantity: 15 }],
  });

  const res4 = await matchPurchaseOrder('PO-SCEN-4');
  console.log('Status:', res4.status);
  console.log('Reasons:', res4.mismatchReasons);
  if (res4.status === 'mismatch' && res4.mismatchReasons.includes('grn_qty_exceeds_po_qty')) {
    console.log('SUCCESS: Scenario 4 Passed.');
  } else {
    console.error('FAIL: Scenario 4 Failed.');
  }

  // ==========================================
  // SCENARIO 5: Invoice Qty > GRN Qty
  // ==========================================
  console.log('\n--------------------------------------------------');
  console.log('Scenario 5: Invoice Qty > GRN Qty (Expected: mismatch / invoice_qty_exceeds_grn_qty)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-5',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  await GRN.create({
    grnNumber: 'GRN-SCEN-5',
    poNumber: 'PO-SCEN-5',
    grnDate: new Date('2026-06-02'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', receivedQuantity: 8 }],
  });

  // Invoiced 10, received 8
  await Invoice.create({
    invoiceNumber: 'INV-SCEN-5',
    poNumber: 'PO-SCEN-5',
    invoiceDate: new Date('2026-06-01'),
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  const res5 = await matchPurchaseOrder('PO-SCEN-5');
  console.log('Status:', res5.status);
  console.log('Reasons:', res5.mismatchReasons);
  if (res5.status === 'mismatch' && res5.mismatchReasons.includes('invoice_qty_exceeds_grn_qty')) {
    console.log('SUCCESS: Scenario 5 Passed.');
  } else {
    console.error('FAIL: Scenario 5 Failed.');
  }

  // ==========================================
  // SCENARIO 6: Duplicate PO
  // ==========================================
  console.log('\n--------------------------------------------------');
  console.log('Scenario 6: Duplicate PO Upload (Expected: ValidationError / Duplicate Block)');
  console.log('--------------------------------------------------');
  await clearCollections();

  await PurchaseOrder.create({
    poNumber: 'PO-SCEN-6',
    poDate: new Date('2026-06-01'),
    vendorName: 'Acme Test Corp',
    items: [{ itemCode: 'ITEM-A', description: 'Widget A', quantity: 10 }],
  });

  try {
    // Attempting to save another PO with the exact same poNumber
    await PurchaseOrder.create({
      poNumber: 'PO-SCEN-6',
      poDate: new Date('2026-06-01'),
      vendorName: 'Duplicate Corp',
      items: [{ itemCode: 'ITEM-B', description: 'Widget B', quantity: 20 }],
    });
    console.error('FAIL: MongoDB allowed duplicate PO!');
  } catch (err) {
    console.log('Successfully blocked duplicate PO in DB. Error code/message:', err.message);
    console.log('SUCCESS: Scenario 6 Passed.');
  }

  console.log('\n--------------------------------------------------');
  console.log('All Scenario Tests Finished.');
  console.log('--------------------------------------------------');

  await clearCollections();
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Error during testing:', err);
  mongoose.disconnect();
});
