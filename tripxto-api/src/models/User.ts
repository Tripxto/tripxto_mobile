import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    phoneE164: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    pincode: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    phoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active'], default: 'active' },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

export function toPublicUser(doc: mongoose.Document) {
  const o = doc.toObject() as {
    id: string;
    phoneE164: string;
    firstName: string;
    lastName: string;
    email: string;
    pincode: string;
    city: string;
    state: string;
    country: string;
    phoneVerified: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  return {
    id: o.id,
    phoneE164: o.phoneE164,
    firstName: o.firstName,
    lastName: o.lastName,
    email: o.email,
    pincode: o.pincode,
    city: o.city,
    state: o.state,
    country: o.country,
    phoneVerified: o.phoneVerified,
    status: 'active' as const,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
