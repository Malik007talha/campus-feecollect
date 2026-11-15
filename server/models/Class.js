import mongoose from 'mongoose';

const feeItemSchema = new mongoose.Schema(
  {
    head: { type: String, required: [true, 'Fee head is required'], trim: true, maxlength: 40 },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount cannot be negative'] },
  },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Class name is required'], trim: true, maxlength: 40 },
    section: { type: String, required: [true, 'Section is required'], trim: true, uppercase: true, maxlength: 10 },
    // Filled in Milestone 2 (Fee Structure).
    monthlyFees: { type: [feeItemSchema], default: [] },
  },
  { timestamps: true }
);

// "Class 5 / A" can exist only once. Case-insensitive, so "class 5 / a" is a duplicate too.
classSchema.index({ name: 1, section: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Class', classSchema);