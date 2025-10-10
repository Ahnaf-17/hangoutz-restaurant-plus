import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  name:
    { type: String, required: true },
  description:
    { type: String, default: '' },
  price:
    { type: Number, required: true, min: 0 },
  category:
    { type: String, default: 'General' },
  available:
    { type: Boolean, default: true }
},
  { timestamps: true });

export default mongoose.model('MenuItem', MenuItemSchema);
