import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const adminApiRouter = Router();
adminApiRouter.use(requireAuth);

adminApiRouter.get('/clients', async (req, res) => {
  try {
    const { combined } = req.query;
    const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
    if (combined !== '1') {
      return res.json(clients);
    }
    const [intakes, consultations] = await Promise.all([
      prisma.caseIntake.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.consultationRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
    const importedEmails = new Set(clients.filter((c) => c.source === 'intake').map((c) => c.email?.toLowerCase()).filter(Boolean));
    const importedConsultEmails = new Set(clients.filter((c) => c.source === 'consultation').map((c) => c.email?.toLowerCase()).filter(Boolean));
    const signups = [
      ...intakes
        .filter((i) => !importedEmails.has(i.email.toLowerCase()))
        .map((i) => ({
          id: 'intake-' + i.id,
          name: i.fullName || i.email,
          email: i.email,
          phone: i.phone,
          caseName: i.caseType,
          caseSummary: i.description,
          assignedTo: null,
          progress: 0,
          source: 'intake',
          createdAt: i.createdAt,
          isSignup: true,
        })),
      ...consultations
        .filter((c) => !importedConsultEmails.has(c.email.toLowerCase()))
        .map((c) => ({
          id: 'consult-' + c.id,
          name: c.fullName,
          email: c.email,
          phone: c.phone,
          caseName: null,
          caseSummary: c.message,
          assignedTo: null,
          progress: 0,
          source: 'consultation',
          createdAt: c.createdAt,
          isSignup: true,
        })),
    ];
    const combinedList = [...clients.map((c) => ({ ...c, isSignup: false })), ...signups]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combinedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const clientSchema = {
  name: (v) => (v == null || typeof v === 'string') && (!v || v.length <= 500),
  email: (v) => v == null || (typeof v === 'string' && v.length <= 255),
  phone: (v) => v == null || (typeof v === 'string' && v.length <= 50),
  caseName: (v) => v == null || (typeof v === 'string' && v.length <= 500),
  caseSummary: (v) => v == null || (typeof v === 'string' && v.length <= 5000),
  assignedTo: (v) => v == null || (typeof v === 'string' && v.length <= 255),
  progress: (v) => v == null || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
};

function validate(schema, data) {
  for (const [key, fn] of Object.entries(schema)) {
    if (data[key] !== undefined && !fn(data[key])) {
      return { invalid: key };
    }
  }
  return null;
}

adminApiRouter.post('/clients', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(clientSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { name, email, phone, caseName, caseSummary, assignedTo, progress } = body;
    const client = await prisma.client.create({
      data: {
        name: name || 'Unknown',
        email: email || null,
        phone: phone || null,
        caseName: caseName || null,
        caseSummary: caseSummary || null,
        assignedTo: assignedTo || null,
        progress: Math.min(100, Math.max(0, parseInt(progress, 10) || 0)),
        source: 'manual',
      },
    });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.patch('/clients/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(clientSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { name, email, phone, caseName, caseSummary, assignedTo, progress } = body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name != null && { name }),
        ...(email != null && { email }),
        ...(phone != null && { phone }),
        ...(caseName != null && { caseName }),
        ...(caseSummary != null && { caseSummary }),
        ...(assignedTo != null && { assignedTo }),
        ...(progress != null && { progress: Math.min(100, Math.max(0, parseInt(progress, 10) || 0)) }),
      },
    });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.delete('/clients/:id', async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.post('/clients/import-intakes', async (req, res) => {
  try {
    const intakes = await prisma.caseIntake.findMany();
    const created = [];
    for (const i of intakes) {
      const existing = await prisma.client.findFirst({
        where: { email: i.email, source: 'intake' },
      });
      if (!existing) {
        const c = await prisma.client.create({
          data: {
            name: i.fullName || i.email,
            email: i.email,
            phone: i.phone || null,
            caseName: i.caseType || null,
            caseSummary: i.description || null,
            source: 'intake',
          },
        });
        created.push(c);
      }
    }
    res.json({ imported: created.length, clients: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.post('/clients/from-signup', async (req, res) => {
  try {
    const { id, name, email, phone, caseName, caseSummary } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: 'id and name required' });
    const prefix = String(id).split('-')[0];
    const realId = String(id).replace(/^(intake|consult)-/, '');
    let source = 'manual';
    if (prefix === 'intake') {
      const intake = await prisma.caseIntake.findUnique({ where: { id: realId } });
      if (!intake) return res.status(404).json({ error: 'Intake not found' });
      const c = await prisma.client.create({
        data: {
          name: intake.fullName || intake.email,
          email: intake.email,
          phone: intake.phone || null,
          caseName: intake.caseType || null,
          caseSummary: intake.description || null,
          source: 'intake',
        },
      });
      return res.json(c);
    }
    if (prefix === 'consult') {
      const consult = await prisma.consultationRequest.findUnique({ where: { id: realId } });
      if (!consult) return res.status(404).json({ error: 'Consultation not found' });
      const c = await prisma.client.create({
        data: {
          name: consult.fullName,
          email: consult.email,
          phone: consult.phone || null,
          caseName: null,
          caseSummary: consult.message || null,
          source: 'consultation',
        },
      });
      return res.json(c);
    }
    const c = await prisma.client.create({
      data: {
        name: name || 'Unknown',
        email: email || null,
        phone: phone || null,
        caseName: caseName || null,
        caseSummary: caseSummary || null,
        source: 'manual',
      },
    });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.post('/clients/import-consultations', async (req, res) => {
  try {
    const consultations = await prisma.consultationRequest.findMany();
    const created = [];
    for (const c of consultations) {
      const existing = await prisma.client.findFirst({
        where: { email: c.email, source: 'consultation' },
      });
      if (!existing) {
        const client = await prisma.client.create({
          data: {
            name: c.fullName,
            email: c.email,
            phone: c.phone || null,
            caseName: null,
            caseSummary: c.message || null,
            source: 'consultation',
          },
        });
        created.push(client);
      }
    }
    res.json({ imported: created.length, clients: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.get('/calendar', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      where.startDate = { lte: endDate };
      where.endDate = { gte: startDate };
    }
    const events = await prisma.calendarEvent.findMany({ where, orderBy: { startDate: 'asc' } });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const calendarSchema = {
  title: (v) => v == null || (typeof v === 'string' && v.length <= 500),
  startDate: (v) => v == null || !isNaN(new Date(v).getTime()),
  endDate: (v) => v == null || !isNaN(new Date(v).getTime()),
  startTime: (v) => v == null || (typeof v === 'string' && v.length <= 20),
  endTime: (v) => v == null || (typeof v === 'string' && v.length <= 20),
  summary: (v) => v == null || (typeof v === 'string' && v.length <= 2000),
  type: (v) => v == null || (typeof v === 'string' && ['event', 'meeting', 'deadline', 'other'].includes(v)),
};

adminApiRouter.post('/calendar', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(calendarSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { title, startDate, endDate, startTime, endTime, summary, type } = body;
    const event = await prisma.calendarEvent.create({
      data: {
        title: title || 'Untitled',
        startDate: new Date(startDate || Date.now()),
        endDate: new Date(endDate || startDate || Date.now()),
        startTime: startTime || null,
        endTime: endTime || null,
        summary: summary || null,
        type: type || 'event',
      },
    });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.patch('/calendar/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(calendarSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { title, startDate, endDate, startTime, endTime, summary, type } = body;
    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        ...(title != null && { title }),
        ...(startDate != null && { startDate: new Date(startDate) }),
        ...(endDate != null && { endDate: new Date(endDate) }),
        ...(startTime != null && { startTime }),
        ...(endTime != null && { endTime }),
        ...(summary != null && { summary }),
        ...(type != null && { type }),
      },
    });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.delete('/calendar/:id', async (req, res) => {
  try {
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.get('/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const invoiceSchema = {
  clientName: (v) => v == null || (typeof v === 'string' && v.length <= 500),
  serviceRendered: (v) => v == null || (typeof v === 'string' && v.length <= 2000),
  amount: (v) => v == null || (Number.isFinite(Number(v)) && Number(v) >= 0),
};

adminApiRouter.post('/invoices', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(invoiceSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { clientName, serviceRendered, amount } = body;
    const invoice = await prisma.invoice.create({
      data: {
        clientName: clientName || 'Unknown',
        serviceRendered: serviceRendered || '',
        amount: parseFloat(amount) || 0,
        status: 'active',
      },
    });
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.get('/visits', async (req, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [day, month, year] = await Promise.all([
      prisma.siteVisit.count({ where: { visitedAt: { gte: dayStart } } }),
      prisma.siteVisit.count({ where: { visitedAt: { gte: monthStart } } }),
      prisma.siteVisit.count({ where: { visitedAt: { gte: yearStart } } }),
    ]);

    res.json({ day, month, year });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.get('/memos', async (req, res) => {
  try {
    const memos = await prisma.memoDocument.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(memos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.get('/memos/:id', async (req, res) => {
  try {
    const memo = await prisma.memoDocument.findUnique({ where: { id: req.params.id } });
    if (!memo) return res.status(404).json({ error: 'Not found' });
    res.json(memo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const memoSchema = {
  title: (v) => v == null || (typeof v === 'string' && v.length <= 500),
  content: (v) => v == null || typeof v === 'string',
};

adminApiRouter.post('/memos', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(memoSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { title, content } = body;
    const memo = await prisma.memoDocument.create({
      data: { title: title || 'Untitled', content: content || '' },
    });
    res.json(memo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.patch('/memos/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const err = validate(memoSchema, body);
    if (err) return res.status(400).json({ error: `Invalid ${err.invalid}` });
    const { title, content } = body;
    const memo = await prisma.memoDocument.update({
      where: { id: req.params.id },
      data: {
        ...(title != null && { title }),
        ...(content != null && { content }),
      },
    });
    res.json(memo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

adminApiRouter.delete('/memos/:id', async (req, res) => {
  try {
    await prisma.memoDocument.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
