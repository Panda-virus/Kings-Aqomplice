import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const bookingRouter = Router();

const bookingSchema = z.object({
  fullName: z.string().min(1).max(200).trim(),
  email: z.string().email(),
  phone: z.string().min(1).max(20).trim(),
  preferredDate: z.string().max(20).optional(),
  message: z.string().max(2000).optional(),
});

bookingRouter.post('/', async (req, res) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
      if (isForm) return res.redirect('/contact.html?error=invalid');
      return res.status(400).json({ error: 'Invalid form data. Please check your inputs.' });
    }

    await prisma.consultationRequest.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        preferredDate: parsed.data.preferredDate || null,
        message: parsed.data.message || null,
        status: 'pending',
      },
    });

    const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isForm) return res.redirect('/contact.html?submitted=consultation');
    res.status(201).json({
      message: 'Your consultation request has been submitted. We will respond within 2 business days.',
    });
  } catch (err) {
    console.error('Booking error:', err);
    const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isForm) return res.redirect('/contact.html?error=server');
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});
