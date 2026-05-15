import mongoose from 'mongoose';

/** Single-use OTP; MongoDB TTL removes doc 10 minutes after creation. */
const otpSchema = new mongoose.Schema(
  {
    phoneE164: { type: String, required: true, index: true },
    code: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

export const Otp = mongoose.model('Otp', otpSchema);
