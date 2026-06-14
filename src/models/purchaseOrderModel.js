import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true, trim: true },
  poDate: { type: Date, required: true },
  vendorName: { type: String, required: true, trim: true },
  items: { type: [itemSchema], required: true, validate: [(val) => val.length > 0, 'At least one item is required'] },
  rawGeminiResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
