import mongoose from 'mongoose';

// A permanent record of sensitive actions, such as deleting a voucher.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    reason: { type: String, default: '' },
    details: { type: Object, default: {} },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    byName: { type: String, required: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);