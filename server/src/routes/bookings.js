import express from 'express';
import Booking from '../models/Booking.js';
import { auth } from '../middleware/auth.js';
import { bookingRules } from '../utils/validate.js';
import { validationResult } from 'express-validator';

const router = express.Router();

// Create booking
router.post('/', auth(), bookingRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const b = await Booking.create({ ...req.body, userId: req.user.id });
  res.status(201).json(b);
});

// My bookings
router.get('/my', auth(), async (req, res) => {
  const list = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(list);
});

// Update booking (owner or staff/admin)
router.put('/:id', auth(), async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (String(b.userId) !== req.user.id && !['staff','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  Object.assign(b, req.body);
  await b.save();
  res.json(b);
});

// Delete/cancel booking
router.delete('/:id', auth(), async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (String(b.userId) !== req.user.id && !['staff','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await b.deleteOne();
  res.json({ ok: true });
});

export default router;
