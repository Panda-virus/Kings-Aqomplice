import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email(),
  message: z.string().min(1).max(2000).trim(),
});

contactRouter.post('/', async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
      if (isForm) return res.redirect('/contact.html?error=invalid');
      return res.status(400).json({ error: 'Invalid form data. Please check your inputs.' });
    }

    await prisma.contactInquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
      },
    });

    const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isForm) return res.redirect('/contact.html?submitted=inquiry');
    res.status(201).json({
      message: 'Your inquiry has been sent. We will respond within 2 business days.',
    });
  } catch (err) {
    console.error('Contact error:', err);
    const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
    if (isForm) return res.redirect('/contact.html?error=server');
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});
