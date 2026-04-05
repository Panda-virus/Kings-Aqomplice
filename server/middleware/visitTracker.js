import { prisma } from '../lib/prisma.js';

export async function trackVisit(req, res, next) {
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return next();
  }
  try {
    await prisma.siteVisit.create({ data: {} });
  } catch (err) {
    // ignore - db might not be set up
  }
  next();
}
