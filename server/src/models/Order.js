import mongoose from 'mongoose';
const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['placed', 'preparing', 'ready', 'completed', 'cancelled'], default: 'placed' }
}, { timestamps: true });
export default mongoose.model('Order', OrderSchema);
