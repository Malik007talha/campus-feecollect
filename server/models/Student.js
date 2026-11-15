import mongoose from 'mongoose';

export const STUDENT_STATUSES = ['active', 'inactive', 'left'];
export const DISCOUNT_TYPES = ['none', 'sibling', 'scholarship'];

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Student name is required'], trim: true, maxlength: 80 },
    rollNo: { type: String, required: [true, 'Roll number is required'], trim: true, maxlength: 20 },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: [true, 'Class is required'] },
    parentName: { type: String, required: [true, 'Parent name is required'], trim: true, maxlength: 80 },
    parentPhone: { type: String, required: [true, 'Parent phone is required'], trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },
    discountPercent: { type: Number, default: 0, min: [0, 'Discount cannot be negative'], max: [100, 'Discount cannot exceed 100%'] },
    discountType: { type: String, enum: DISCOUNT_TYPES, default: 'none' },
    status: { type: String, enum: STUDENT_STATUSES, default: 'active' },
    familyId: { type: String, trim: true }, // groups siblings; used by the parent stretch goal
  },
  { timestamps: true }
);

// A roll number is unique inside one class-section. This index also speeds up student counts.
studentSchema.index({ class: 1, rollNo: 1 }, { unique: true });

export default mongoose.model('Student', studentSchema);