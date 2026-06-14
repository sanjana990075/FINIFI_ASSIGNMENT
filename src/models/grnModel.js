import mongoose from 'mongoose';

const grnItemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  receivedQuantity: { type: Number, required: true, min: 0 },
});

const grnSchema = new mongoose.Schema({
  grnNumber: { type: String, required: true, unique: true, trim: true },
  poNumber: { type: String, required: true, trim: true },
  grnDate: { type: Date, required: true },
  items: { type: [grnItemSchema], required: true, validate: [(val) => val.length > 0, 'At least one item is required'] },
  rawGeminiResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

grnSchema.index({ grnNumber: 1 }, { unique: true });

const GRN = mongoose.model('GRN', grnSchema);
export default GRN;
