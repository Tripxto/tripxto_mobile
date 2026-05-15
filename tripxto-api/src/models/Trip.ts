import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: Number, required: true },
    destination: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    about: { type: String },
    title: { type: String },
    description: { type: String },
  },
  { timestamps: true },
);

tripSchema.index({ userId: 1, clientId: 1 }, { unique: true });

export const Trip = mongoose.model('Trip', tripSchema);
