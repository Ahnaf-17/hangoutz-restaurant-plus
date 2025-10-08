import mongoose from 'mongoose';
const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  partySize: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },   // YYYY-MM-DD
  time: { type: String, required: true },   // HH:mm
  notes: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' }
}, { timestamps: true });
export default mongoose.model('Booking', BookingSchema);
