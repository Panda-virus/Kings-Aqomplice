import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const intakeRouter = Router();

const intakeSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  caseType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

intakeRouter.post('/', async (req, res) => {
  try {
    const parsed = intakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid intake data.' });
    }

    const session = await prisma.chatSession.create({
      data: {
        branch: 'intake',
        state: { currentStep: 'intake_complete' },
      },
    });

    await prisma.caseIntake.create({
      data: {
        sessionId: session.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        caseType: parsed.data.caseType,
        description: parsed.data.description,
      },
    });

    res.status(201).json({
      message: 'Intake submitted. Our team will contact you within 2 business days.',
    });
  } catch (err) {
    console.error('Intake error:', err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});
