import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { validateEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { chatRouter } from './routes/chat.js';
import { intakeRouter } from './routes/intake.js';
import { bookingRouter } from './routes/booking.js';
import { contactRouter } from './routes/contact.js';
import { adminRouter } from './routes/admin.js';
import { adminApiRouter } from './routes/adminApi.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { trackVisit } from './middleware/visitTracker.js';

validateEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use('/admin', adminRouter);
app.use('/admin/api', adminApiRouter);

app.use(csrfMiddleware);
app.use(trackVisit);

app.get('/health', async (req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    db = 'unhealthy';
  }
  res.json({ status: 'ok', db, timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../www'), {
  extensions: ['html'],
  index: 'index.html',
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/chat', chatLimiter);
app.use('/api/chat', chatRouter);
app.use('/api/intake', intakeRouter);
app.use('/api/booking', apiLimiter, bookingRouter);
app.use('/api/contact', apiLimiter, contactRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Kings Aqomplice server running on port ${PORT}`);
});
