import mongoose from 'mongoose';

export const REMINDER_STATUSES = ['sent', 'failed', 'logged', 'pending'];
export const REMINDER_CHANNELS = ['email', 'sms'];
export const REMINDER_KINDS = ['manual', 'auto'];

const reminderLogSchema = new mongoose.Schema(
  {
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    voucherNo: { type: String, required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, required: true },
    channel: { type: String, enum: REMINDER_CHANNELS, required: true },
    to: { type: String, required: true },
    // sent = accepted by the email server, failed = email server error, pending = being sent right now
    // (logged = old test-mode rows, kept as history)
    status: { type: String, enum: REMINDER_STATUSES, required: true },
    message: { type: String, required: true },
    error: { type: String, default: '' },
    kind: { type: String, enum: REMINDER_KINDS, default: 'manual' },
    // Only automatic reminders: "auto:3" = the 3-days-before reminder. Unique per voucher, so it is never sent twice.
    trigger: { type: String },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function needsUser() {
        return this.kind !== 'auto';
      },
    },
    sentByName: { type: String, default: 'Automatic reminder' },
  },
  { timestamps: true }
);

reminderLogSchema.index({ voucher: 1, channel: 1, createdAt: -1 });
reminderLogSchema.index({ createdAt: -1 });
// The guard against double sending: one automatic reminder per voucher per reminder day.
reminderLogSchema.index({ voucher: 1, trigger: 1 }, { unique: true, partialFilterExpression: { trigger: { $type: 'string' } } });

export default mongoose.model('ReminderLog', reminderLogSchema);