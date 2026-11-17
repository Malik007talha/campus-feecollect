import mongoose from 'mongoose';

export const REMINDER_STATUSES = ['sent', 'failed', 'logged'];
export const REMINDER_CHANNELS = ['email', 'sms'];

const reminderLogSchema = new mongoose.Schema(
  {
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    voucherNo: { type: String, required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, required: true },
    channel: { type: String, enum: REMINDER_CHANNELS, required: true },
    to: { type: String, required: true },
    // sent = delivered to the email/SMS provider, logged = test mode (written to the console), failed = provider error
    status: { type: String, enum: REMINDER_STATUSES, required: true },
    message: { type: String, required: true },
    error: { type: String, default: '' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sentByName: { type: String, required: true },
  },
  { timestamps: true }
);

reminderLogSchema.index({ voucher: 1, channel: 1, createdAt: -1 });
reminderLogSchema.index({ createdAt: -1 });

export default mongoose.model('ReminderLog', reminderLogSchema);