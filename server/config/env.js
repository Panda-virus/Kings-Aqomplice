/**
 * Environment validation - fail fast if critical config is missing in production
 */
const isProd = process.env.NODE_ENV === 'production';

export function validateEnv() {
  const errors = [];

  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-in-production') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET === 'dev-csrf-secret-change-in-production') {
      errors.push('CSRF_SECRET must be set to a secure value in production');
    }
  }

  if (!process.env.DATABASE_URL && isProd) {
    errors.push('DATABASE_URL is required in production');
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:\n' + errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
  }
}
