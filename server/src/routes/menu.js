import express from 'express';
import MenuItem from '../models/MenuItem.js';
import { auth } from '../middleware/auth.js';
import { validationResult } from 'express-validator';
import { menuItemRules } from '../utils/validate.js';

const router = express.Router();

// Public: list menu
router.get('/', async (_req, res) => {
  const items = await MenuItem.find({}).sort({ createdAt: -1 });
  res.json(items);
});

// Staff/Admin: create item
router.post('/', auth(['staff', 'admin']), menuItemRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const item = await MenuItem.create(req.body);
  res.status(201).json(item);
});

// Staff/Admin: update item
router.put('/:id', auth(['staff', 'admin']), async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

// Staff/Admin: delete item
router.delete('/:id', auth(['staff', 'admin']), async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
