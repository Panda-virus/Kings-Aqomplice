/**
 * Kings Aqomplice — Chat Session State Manager
 * Backend controls flow state; AI does not.
 */

import { prisma } from '../lib/prisma.js';

const INTAKE_STEPS = [
  'intake_start',      // collect email
  'intake_name',       // collect full name
  'intake_phone',      // collect phone
  'intake_case_type',  // collect case type
  'intake_description', // collect description
  'intake_complete',
];

export async function getOrCreateSession(sessionId) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { intake: true },
    });
    if (existing) return existing;
  }

  return prisma.chatSession.create({
    data: {
      state: {},
      branch: 'general',
    },
  });
}

export async function updateSessionState(sessionId, state, branch) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { state: state || {}, branch: branch || 'general' },
  });
}

export function getNextIntakeStep(currentStep) {
  const idx = INTAKE_STEPS.indexOf(currentStep);
  if (idx < 0 || idx >= INTAKE_STEPS.length - 1) return null;
  return INTAKE_STEPS[idx + 1];
}

export function getIntakeStepPrompt(step) {
  const prompts = {
    intake_start: 'Please provide your email address to begin.',
    intake_name: 'Thank you. What is your full name?',
    intake_phone: 'What is the best phone number to reach you?',
    intake_case_type: 'What type of legal matter is this? (e.g., corporate, commercial, regulatory)',
    intake_description: 'Please provide a brief description of your matter.',
    intake_complete: 'Your intake has been recorded. Our team will contact you within 2 business days.',
  };
  return prompts[step] || null;
}

export function extractStepData(step, message) {
  const trimmed = (message || '').trim();
  if (step === 'intake_start') {
    const match = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? { email: match[0] } : null;
  }
  if (step === 'intake_name') return trimmed ? { fullName: trimmed } : null;
  if (step === 'intake_phone') return trimmed ? { phone: trimmed.replace(/\D/g, '').slice(0, 15) || trimmed } : null;
  if (step === 'intake_case_type') return trimmed ? { caseType: trimmed } : null;
  if (step === 'intake_description') return trimmed ? { description: trimmed } : null;
  return null;
}

export function parseIntent(message) {
  const lower = (message || '').toLowerCase().trim();
  if (/\bintake\b/.test(lower) || lower === 'intake') return 'intake';
  if (/\bconsultation\b/.test(lower) || /\bbook\b/.test(lower) || /\bschedule\b/.test(lower)) return 'consultation';
  return 'general';
}
