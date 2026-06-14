import mongoose from 'mongoose';

const matchResultSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, trim: true },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: false },
  grnIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GRN', required: true }],
  invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true }],
  status: {
    type: String,
    required: true,
    enum: ['matched', 'partially_matched', 'mismatch', 'mismatched', 'insufficient_documents', 'pending'],
    default: 'pending',
  },
  mismatchReasons: { type: [String], default: [] },
  documentCounts: {
    po: { type: Number, default: 0 },
    grn: { type: Number, default: 0 },
    invoice: { type: Number, default: 0 }
  },
  summary: {
    totalItems: { type: Number, default: 0 },
    matchedItems: { type: Number, default: 0 },
    mismatchedItems: { type: Number, default: 0 }
  },
  itemMismatches: [{
    itemCode: { type: String, required: true },
    reason: { type: String, required: true },
    details: {
      orderedQuantity: { type: Number, default: 0 },
      receivedQuantity: { type: Number, default: 0 },
      invoicedQuantity: { type: Number, default: 0 }
    }
  }],
  updatedAt: { type: Date, default: Date.now },
});

matchResultSchema.index({ poNumber: 1 });
matchResultSchema.index({ poId: 1 });

const MatchResult = mongoose.model('MatchResult', matchResultSchema);
export default MatchResult;
