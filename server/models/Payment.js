import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'other'];

const LOCKED_MESSAGE = 'Payment records cannot be changed or deleted';

const paymentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, unique: true },
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: [true, 'Voucher is required'] },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least Rs 1'],
      validate: { validator: Number.isInteger, message: 'Amount must be in whole rupees' },
    },
    method: { type: String, enum: PAYMENT_METHODS, required: [true, 'Payment method is required'] },
    date: { type: Date, required: [true, 'Payment date is required'] },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receivedByName: { type: String, required: true },

    // Copied from the voucher when the payment is made, so the receipt never changes later.
    voucherNo: { type: String, required: true },
    studentName: { type: String, required: true },
    rollNo: { type: String, required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    month: { type: String, required: true },
    voucherTotal: { type: Number, required: true },
    paidAfter: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ voucher: 1, date: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ student: 1 });

// Payments are append-only: once saved, a record can never be edited or removed through the app.
const refuse = () => {
  throw new Error(LOCKED_MESSAGE);
};
paymentSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete', 'replaceOne', 'deleteMany'],
  refuse
);
paymentSchema.pre('deleteOne', { document: true, query: true }, refuse);
paymentSchema.pre('save', function blockEdits() {
  if (!this.isNew) throw new Error(LOCKED_MESSAGE);
});

export default mongoose.model('Payment', paymentSchema);