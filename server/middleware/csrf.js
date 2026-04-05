import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'ka_csrf';
const HEADER_NAME = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfMiddleware(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    const token = req.cookies[COOKIE_NAME] || generateToken();
    if (!req.cookies[COOKIE_NAME]) {
      res.cookie(COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
      });
    }
    res.locals.csrfToken = req.cookies[COOKIE_NAME] || token;
    return next();
  }

  const cookieToken = req.cookies[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME] || req.body?._csrf;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }

  next();
}

export function getCsrfToken(req, res) {
  return res?.locals?.csrfToken ?? req?.cookies?.[COOKIE_NAME] ?? null;
}
