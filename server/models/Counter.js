import mongoose from 'mongoose';

// A named counter. Used to hand out voucher numbers without two requests ever getting the same one.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export default mongoose.model('Counter', counterSchema);