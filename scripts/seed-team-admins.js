/**
 * Create/update fixed admin accounts with freshly generated random passwords.
 * Run: node scripts/seed-team-admins.js
 * Requires DATABASE_URL in .env. Passwords print once to stdout — save them securely; they are not stored in the repo.
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAILS = ['praisemagangani@gmail.com', 'fanuelrudi@gmail.com'];

function randomPassword(length = 18) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  const buf = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i++) s += chars[buf[i] % chars.length];
  return s;
}

async function main() {
  console.log('Seeding admin accounts...\n');
  const rows = [];
  for (const email of EMAILS) {
    const password = randomPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.adminUser.upsert({
      where: { email: email.toLowerCase() },
      update: { passwordHash },
      create: { email: email.toLowerCase(), passwordHash },
    });
    rows.push({ email: admin.email, password });
  }
  console.log('Done. Store these credentials securely (not in git):\n');
  console.table(rows.map((r) => ({ email: r.email, password: r.password })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
