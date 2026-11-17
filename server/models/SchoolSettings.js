import mongoose from 'mongoose';

// One document holds the school's details, printed on every voucher.
const schoolSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    schoolName: { type: String, default: 'My School', trim: true, maxlength: 80 },
    address: { type: String, default: '', trim: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    bankName: { type: String, default: '', trim: true, maxlength: 60 },
    accountTitle: { type: String, default: '', trim: true, maxlength: 80 },
    accountNumber: { type: String, default: '', trim: true, maxlength: 40 },
    paymentInstructions: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

// Returns the settings, creating them with the default school name the first time.
schoolSettingsSchema.statics.getDefault = async function getDefault() {
  try {
    return await this.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { schoolName: 'My School' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
  } catch (err) {
    if (err.code === 11000) return this.findOne({ key: 'default' }).lean(); // created a moment ago
    throw err;
  }
};

export default mongoose.model('SchoolSettings', schoolSettingsSchema);