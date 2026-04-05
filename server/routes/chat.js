import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `chat-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|txt|jpg|jpeg|png)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use PDF, DOC, DOCX, TXT, JPG, or PNG.'));
    }
  },
});
import {
  getOrCreateSession,
  updateSessionState,
  getNextIntakeStep,
  getIntakeStepPrompt,
  parseIntent,
  extractStepData,
} from '../services/stateManager.js';
import { getAIResponse } from '../services/aiService.js';

export const chatRouter = Router();

const SESSION_COOKIE = 'ka_session';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

chatRouter.post('/', upload.single('file'), async (req, res) => {
  const message = (req.body?.message || '').trim();
  const file = req.file;
  const userContent = file
    ? (message ? `${message}\n[Attached: ${file.originalname}]` : `[Attached: ${file.originalname}]`)
    : message;

  if (!message && !file) {
    return res.status(400).json({ error: 'Please enter a message or attach a file.' });
  }

  const fallbackResponse = async () => {
    const { content } = await getAIResponse([{ role: 'user', content: userContent }]);
    return res.json({ message: content, nextStep: null, branch: 'general' });
  };

  try {
    let sessionId = req.cookies?.[SESSION_COOKIE];

    let session;
    try {
      session = await getOrCreateSession(sessionId);
    } catch (dbErr) {
      console.warn('Database unavailable, using fallback mode:', dbErr.message);
      return await fallbackResponse();
    }
    if (!sessionId) {
      sessionId = session.id;
      res.cookie(SESSION_COOKIE, sessionId, COOKIE_OPTS);
    }

    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: userContent },
    });

    const state = (session.state && typeof session.state === 'object') ? session.state : {};
    const branch = session.branch || 'general';

    let intent = branch === 'intake' ? 'intake' : parseIntent(message || userContent);
    let currentStep = state.currentStep || (intent === 'intake' ? 'intake_start' : null);

    if (intent === 'intake' && branch !== 'intake') {
      await updateSessionState(sessionId, { currentStep: 'intake_start' }, 'intake');
      const prompt = getIntakeStepPrompt('intake_start');
      await prisma.chatMessage.create({
        data: { sessionId, role: 'assistant', content: prompt },
      });
      return res.json({
        message: prompt,
        nextStep: 'intake_start',
        branch: 'intake',
      });
    }

    if (branch === 'intake' && currentStep) {
      const extracted = extractStepData(currentStep, message || userContent);
      const updatedState = { ...state };

      if (extracted) {
        Object.assign(updatedState, extracted);
        const nextStep = getNextIntakeStep(currentStep);

        if (nextStep) {
          updatedState.currentStep = nextStep;
          await updateSessionState(sessionId, updatedState, 'intake');

          if (nextStep === 'intake_complete') {
            await prisma.caseIntake.upsert({
              where: { sessionId },
              create: {
                sessionId,
                email: updatedState.email || '',
                fullName: updatedState.fullName,
                phone: updatedState.phone,
                caseType: updatedState.caseType,
                description: updatedState.description,
              },
              update: {
                email: updatedState.email || undefined,
                fullName: updatedState.fullName,
                phone: updatedState.phone,
                caseType: updatedState.caseType,
                description: updatedState.description,
              },
            });
          }

          const responseMessage = getIntakeStepPrompt(nextStep) || 'Your intake has been submitted. Our team will contact you within 2 business days.';

          await prisma.chatMessage.create({
            data: { sessionId, role: 'assistant', content: responseMessage },
          });

          return res.json({
            message: responseMessage,
            nextStep: nextStep === 'intake_complete' ? null : nextStep,
            branch: 'intake',
          });
        }
      }

      const prompt = getIntakeStepPrompt(currentStep);
      if (prompt) {
        await prisma.chatMessage.create({
          data: { sessionId, role: 'assistant', content: prompt },
        });
        return res.json({
          message: prompt,
          nextStep: currentStep,
          branch: 'intake',
        });
      }
    }

    if (intent === 'consultation') {
      const msg = 'To request a consultation, please visit our Contact page or complete the consultation form. We will respond within 2 business days.';
      await prisma.chatMessage.create({
        data: { sessionId, role: 'assistant', content: msg },
      });
      return res.json({ message: msg, nextStep: null, branch: 'general' });
    }

    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const aiContext = file
      ? ` The user has attached a file: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB). You cannot read file contents directly; acknowledge the attachment and ask how you can help.`
      : '';

    const aiMessages = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const lastUser = aiMessages.filter((m) => m.role === 'user').pop();
    if (file && lastUser) {
      lastUser.content = lastUser.content + aiContext;
    }

    const { content } = await getAIResponse(aiMessages);

    await prisma.chatMessage.create({
      data: { sessionId, role: 'assistant', content },
    });

    res.json({
      message: content,
      nextStep: null,
      branch: 'general',
    });
  } catch (err) {
    console.error('Chat error:', err.message || err);
    console.error('Stack:', err.stack);
    try {
      return await fallbackResponse();
    } catch (fallbackErr) {
      console.error('Fallback also failed:', fallbackErr.message);
      res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred. Please try again.',
      });
    }
  }
});

chatRouter.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
  }
  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
