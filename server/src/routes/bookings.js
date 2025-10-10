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
// router.get('/my', auth(), async (req, res) => {
//   const list = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
//   res.json(list);
// });
router.get('/my', auth(), async (req, res) => {
  const docs = await Booking.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .populate({ path: 'userId', select: 'name email' }) // pull name & email
    .lean();

  const list = docs.map(b => ({
    ...b,
    user: {
      id:    b.userId?._id || req.user.id,
      name:  b.userId?.name  || b.customerName  || req.user.name,
      email: b.userId?.email || b.customerEmail || req.user.email,
    }
  }));

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

// Admin/Staff: list all bookings
router.get('/', auth(['staff','admin']), async (req, res) => {
  const list = await Booking.find({}).sort({ createdAt: -1 });
  res.json(list);
});

// Admin/Staff: update booking status (approved/confirmed or cancelled)
router.put('/:id/status', auth(['staff','admin']), async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','confirmed','cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });

  // simple transition rules (optional)
  // pending -> confirmed/cancelled; confirmed -> cancelled (allowed); cancelled -> (no-op/allow?)
  if (b.status === 'cancelled' && status !== 'cancelled') {
    return res.status(400).json({ error: 'Cannot modify a cancelled booking' });
  }

  b.status = status;
  await b.save();
  res.json(b);
});



export default router;
