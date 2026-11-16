import mongoose from 'mongoose';

export const DEFAULT_FEE_HEADS = ['Tuition', 'Transport', 'Laboratory'];

// One document holds the school's list of fee types.
const feeConfigurationSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    heads: { type: [String], default: () => [...DEFAULT_FEE_HEADS] },
  },
  { timestamps: true }
);

// Returns the configuration, creating it with the default fee types the first time.
feeConfigurationSchema.statics.getDefault = async function getDefault() {
  try {
    return await this.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { heads: [...DEFAULT_FEE_HEADS] } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    if (err.code === 11000) return this.findOne({ key: 'default' }); // created a moment ago by another request
    throw err;
  }
};

export default mongoose.model('FeeConfiguration', feeConfigurationSchema);