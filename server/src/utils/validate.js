import { body } from 'express-validator';

export const signupRules = [
  body('name').isString().isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
];

export const loginRules = [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
];

export const menuItemRules = [
  body('name').isString().notEmpty(),
  body('price').isFloat({ min: 0 })
];

export const bookingRules = [
  body('partySize').isInt({ min: 1 }),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('time').matches(/^\d{2}:\d{2}$/)
];
