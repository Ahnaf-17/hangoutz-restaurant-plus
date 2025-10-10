import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import authRouter from './routes/auth.js';
import menuRouter from './routes/menu.js';
import bookingsRouter from './routes/bookings.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';

import { httpsOnly } from './middleware/httpsOnly.js';
import { errorHandler, notFound } from './middleware/error.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Trust proxy (for Render/Heroku to detect https)
app.set('trust proxy', 1);

// Security & middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// Enforce HTTPS (proxy-aware). For local testing over HTTP, comment this line.
app.use(httpsOnly);

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/users', usersRouter);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

// Start
(async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
})();
