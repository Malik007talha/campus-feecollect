import mongoose from 'mongoose';

export const FINE_TYPES = ['none', 'fixed', 'per_day', 'percent'];

// One document holds the school's details, printed on every voucher, and the late fine policy.
const schoolSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    schoolName: { type: String, default: 'School Name', trim: true, maxlength: 80 },
    address: { type: String, default: '', trim: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    bankName: { type: String, default: '', trim: true, maxlength: 60 },
    accountTitle: { type: String, default: '', trim: true, maxlength: 80 },
    accountNumber: { type: String, default: '', trim: true, maxlength: 40 },
    paymentInstructions: { type: String, default: '', trim: true, maxlength: 200 },

    // Late fine policy. 'none' means no fine is ever charged.
    fineType: { type: String, enum: FINE_TYPES, default: 'none' },
    fineAmount: { type: Number, default: 0, min: 0 }, // Rs: once (fixed) or per day (per_day)
    finePercent: { type: Number, default: 0, min: 0, max: 100 },
    fineGraceDays: { type: Number, default: 0, min: 0, max: 60 },
    fineCap: { type: Number, default: 0, min: 0 }, // 0 = no maximum
  },
  { timestamps: true }
);

// Returns the settings, creating them with the default school name the first time.
schoolSettingsSchema.statics.getDefault = async function getDefault() {
  try {
    return await this.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { schoolName: 'School Name' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
  } catch (err) {
    if (err.code === 11000) return this.findOne({ key: 'default' }).lean(); // created a moment ago
    throw err;
  }
};

export default mongoose.model('SchoolSettings', schoolSettingsSchema);