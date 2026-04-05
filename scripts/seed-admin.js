/**
 * Seed an admin user. Run: node scripts/seed-admin.js
 * Set ADMIN_EMAIL and ADMIN_PASSWORD env vars, or edit below.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL || 'test@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Test';

async function main() {
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { email, passwordHash: hash },
  });
  console.log('Admin user created/updated:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
