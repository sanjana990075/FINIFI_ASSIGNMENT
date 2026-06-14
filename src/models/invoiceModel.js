import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true },
  poNumber: { type: String, required: true, trim: true },
  invoiceDate: { type: Date, required: true },
  items: { type: [invoiceItemSchema], required: true, validate: [(val) => val.length > 0, 'At least one item is required'] },
  rawGeminiResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
