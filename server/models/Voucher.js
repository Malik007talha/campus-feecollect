import mongoose from 'mongoose';

export const VOUCHER_STATUSES = ['unpaid', 'partial', 'paid'];

const itemSchema = new mongoose.Schema(
  {
    head: { type: String, required: [true, 'Fee name is required'], trim: true },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount cannot be negative'] },
  },
  { _id: false }
);

const voucherSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    month: { type: String, required: true, match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like 2026-11'] },
    items: {
      type: [itemSchema],
      validate: [(v) => v.length > 0, 'A voucher needs at least one fee item'],
    },
    discount: { type: Number, default: 0, min: [0, 'Discount cannot be negative'] },
    fine: { type: Number, default: 0, min: [0, 'Fine cannot be negative'] },
    total: { type: Number, required: true, min: [0, 'Total cannot be negative'] },
    paid: { type: Number, default: 0, min: [0, 'Paid amount cannot be negative'] },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: VOUCHER_STATUSES, default: 'unpaid' },
    fineAppliedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Copied from the student and class when the voucher is made, so an old voucher never changes
    // even if the student later moves to another class or the parent's phone number changes.
    studentName: { type: String, required: true },
    rollNo: { type: String, required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    parentName: { type: String },
    parentPhone: { type: String },
  },
  { timestamps: true }
);

// THE guard against duplicates: one voucher per student per month, enforced by the database itself.
voucherSchema.index({ student: 1, month: 1 }, { unique: true });
voucherSchema.index({ month: 1, class: 1 });
voucherSchema.index({ status: 1, dueDate: 1 });

// total must always equal fees - discount + fine
voucherSchema.pre('validate', function checkAmounts() {
  const subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  if (this.discount > subtotal) this.invalidate('discount', 'Discount cannot be more than the fees');
  const expected = subtotal - this.discount + this.fine;
  if (this.total !== expected) {
    this.invalidate('total', `Total must equal fees − discount + fine (expected ${expected})`);
  }
  if (this.paid > this.total) this.invalidate('paid', 'Paid amount cannot be more than the total');
});

export default mongoose.model('Voucher', voucherSchema);