import express from 'express';
import Order from '../models/Order.js';
import { auth } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Place order
router.post('/', auth(), async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items required' });
  const total = items.reduce((sum, it) => sum + (it.qty * it.price), 0);
  const order = await Order.create({
    userId: req.user.id,
    items,
    total
  });
  res.status(201).json(order);
});

// My orders
router.get('/my', auth(), async (req, res) => {
  const list = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(list);
});

// Update order status (staff/admin)
router.put('/:id/status', auth(['staff', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['placed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Cancel my order
router.delete('/:id', auth(), async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (String(o.userId) !== req.user.id && !['staff','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  o.status = 'cancelled';
  await o.save();
  res.json({ ok: true });
});


// Admin/Staff: list all orders
router.get('/', auth(['staff','admin']), async (req, res) => {
  const list = await Order.find({}).sort({ createdAt: -1 });
  res.json(list);
});

export default router;
