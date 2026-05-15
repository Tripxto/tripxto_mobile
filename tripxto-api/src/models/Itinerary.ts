import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tripClientId: { type: Number, required: true },
    document: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

itinerarySchema.index({ userId: 1, tripClientId: 1 }, { unique: true });

export const Itinerary = mongoose.model('Itinerary', itinerarySchema);
