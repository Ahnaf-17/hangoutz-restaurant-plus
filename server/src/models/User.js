import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' }
}, { timestamps: true });
export default mongoose.model('User', UserSchema);


// import express from 'express';
// import User from '../models/User.js';
// import { auth } from '../middleware/auth.js';

// const router = express.Router();

// // Get my profile
// router.get('/me', auth(), async (req, res) => {
//   const me = await User.findById(req.user.id).select('-passwordHash');
//   res.json(me);
// });

// // Update role (admin only)
// router.put('/:id/role', auth('admin'), async (req, res) => {
//   const { role } = req.body;
//   if (!['customer', 'staff', 'admin'].includes(role)) {
//     return res.status(400).json({ error: 'Invalid role' });
//   }
//   const user = await User.findByIdAndUpdate(
//     req.params.id,
//     { role },
//     { new: true, runValidators: true }
//   ).select('-passwordHash');
//   res.json(user);
// });

// export default router;
