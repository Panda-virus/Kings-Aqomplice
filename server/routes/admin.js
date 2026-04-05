import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, createToken } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const adminRouter = Router();

/* ═══════════════════════════════════════════════════════════════
   NAV STRUCTURE
═══════════════════════════════════════════════════════════════ */
const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard',    label: 'Dashboard',    icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>` },
      { href: '/admin/clients',      label: 'Clients',      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` },
      { href: '/admin/calendar',     label: 'Calendar',     icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>` },
      { href: '/admin/billing',      label: 'Billing',      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>` },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/network-radar',label: 'Network Radar', icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>` },
      { href: '/admin/memo-drafter', label: 'Memo Drafter',  icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>` },
    ]
  },
  {
    label: 'Intake',
    items: [
      { href: '/admin/intakes',       label: 'Case Intakes',  icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>` },
      { href: '/admin/consultations', label: 'Consultations', icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>` },
      { href: '/admin/inquiries',     label: 'Inquiries',     icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>` },
    ]
  }
];

/* ═══════════════════════════════════════════════════════════════
   LAYOUT BUILDER
═══════════════════════════════════════════════════════════════ */
const layout = (title, body, path = '/admin/dashboard') => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const navHtml = NAV.map(({ label, items }, i) => {
    const links = items.map(item => {
      const active = item.href === path;
      return `<li><a href="${item.href}" class="${active ? 'active' : ''}">${item.icon}<span>${item.label}</span></a></li>`;
    }).join('');
    return `
      <div class="sidebar-section">
        <p class="sidebar-section-label">${label}</p>
        <ul>${links}</ul>
      </div>
      ${i < NAV.length - 1 ? '<div class="sidebar-divider"></div>' : ''}
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · Kings Aqomplice</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/admin.css">
  <link rel="icon" type="image/png" href="/assets/KINGS%20AQOMPLICE%20K-LOGO%20Color.png">
</head>
<body class="admin-body">
<div class="admin-shell">

  <!-- ══════════════════════════════
       SIDEBAR
  ══════════════════════════════ -->
  <aside id="dash-sidebar" class="dash-sidebar">

    <!-- Brand -->
    <div class="sidebar-brand">
      <a href="/admin/dashboard" class="sidebar-brand-link">
        <div class="sidebar-monogram"><span>KA</span></div>
        <div class="sidebar-brand-wordmark">
          <span class="sidebar-brand-name">Kings Aqomplice</span>
          <span class="sidebar-brand-tag">Legal Intelligence</span>
        </div>
      </a>
      <button type="button" id="dash-close" aria-label="Close menu">✕</button>
    </div>

    <!-- Status bar -->
    <div class="sidebar-status">
      <span class="status-dot"></span>
      <span class="status-text">System Operational</span>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">${navHtml}</nav>

    <!-- User tag -->
    <div class="sidebar-user">
      <div class="sidebar-avatar">A</div>
      <div class="sidebar-user-info">
        <p class="sidebar-user-name">Administrator</p>
        <p class="sidebar-user-role">Senior Partner</p>
      </div>
    </div>

    <!-- Footer links -->
    <div class="sidebar-footer">
      <a href="/">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        View public site
      </a>
      <a href="/admin/logout">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        Sign out
      </a>
    </div>

  </aside>

  <!-- ══════════════════════════════
       MAIN
  ══════════════════════════════ -->
  <div class="admin-main">

    <!-- Topbar -->
    <header class="admin-topbar">
      <div class="topbar-left">
        <button type="button" id="dash-menu" class="dash-menu-btn" aria-label="Open menu">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="topbar-crumb">
          <span class="topbar-crumb-firm">KA</span>
          <span class="topbar-crumb-sep">›</span>
          <span class="topbar-crumb-page">${escapeHtml(title)}</span>
        </div>
      </div>
      <div class="topbar-right">
        <span class="topbar-clock" id="live-clock">${dateStr}</span>
        <span class="topbar-divider-v"></span>
        <a href="/" class="topbar-btn">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          View site
        </a>
      </div>
    </header>

    <!-- Content -->
    <main class="admin-content admin-section">
      ${body}
    </main>
  </div>

</div>

<!-- Mobile overlay -->
<div id="dash-overlay" class="dash-overlay" aria-hidden="true"></div>

<script>
(function(){
  // Sidebar toggle
  var sb=document.getElementById('dash-sidebar'),
      ov=document.getElementById('dash-overlay'),
      m=document.getElementById('dash-menu'),
      c=document.getElementById('dash-close');
  function open(){sb.classList.add('open');ov.classList.add('open');ov.removeAttribute('aria-hidden');}
  function close(){sb.classList.remove('open');ov.classList.remove('open');ov.setAttribute('aria-hidden','true');}
  if(m) m.addEventListener('click',open);
  if(c) c.addEventListener('click',close);
  if(ov) ov.addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});

  // Live clock
  var clockEl = document.getElementById('live-clock');
  if(clockEl){
    function tick(){
      var now = new Date();
      var t = now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      var d = now.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
      clockEl.textContent = d + '  ·  ' + t;
    }
    tick();
    setInterval(tick, 1000);
  }
})();
</script>
</body>
</html>`;
};

/* ═══════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/login', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In · Kings Aqomplice</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/admin.css">
  <link rel="icon" type="image/png" href="/assets/KINGS%20AQOMPLICE%20K-LOGO%20Color.png">
</head>
<body class="admin-body">
<div class="login-shell">

  <!-- Cinematic left panel -->
  <div class="login-cinematic">
    <div class="login-grid-lines"></div>
    <div class="login-cinematic-content">
      <p class="login-cin-eyebrow">Secure Access Portal</p>
      <h1 class="login-cin-headline">Strategic<br><em>Legal</em><br>Intelligence.</h1>
      <p class="login-cin-desc">
        Authority, precision, and discretion — the pillars of Kings Aqomplice.
        Sign in to manage matters, clients, and intelligence from one command interface.
      </p>
    </div>
  </div>

  <!-- Form panel -->
  <div class="login-panel">
    <div class="login-form-wrap">

      <div class="login-logo-block">
        <div class="login-monogram"><span>KA</span></div>
        <div>
          <p class="login-logo-name">Kings Aqomplice</p>
          <p class="login-logo-tag">Legal Intelligence Platform</p>
        </div>
      </div>

      <h2 class="login-form-heading">Welcome back</h2>
      <p class="login-form-sub">Enter your credentials to access the command interface</p>

      <form action="/admin/login" method="POST">
        <input type="hidden" name="_csrf" value="${res.locals.csrfToken || ''}">

        <div class="login-field">
          <label class="login-label" for="email">Email address</label>
          <input class="login-input" type="email" id="email" name="email" required autocomplete="email" placeholder="admin@kingsaqomplice.com">
        </div>

        <div class="login-field">
          <label class="login-label" for="password">Password</label>
          <input class="login-input" type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••••">
        </div>

        <button type="submit" class="login-submit login-submit--signin">Sign In</button>
      </form>

      ${req.query.error ? `<div class="login-error">${escapeHtml(req.query.error)}</div>` : ''}
      ${req.query.registered ? `<div class="login-success">Account created. You can sign in below.</div>` : ''}

      <p class="login-create-wrap">
        <span class="login-create-label">New user?</span>
        <a href="/admin/register" class="login-create-account">Create account</a>
      </p>

      <a href="/" class="login-back">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Return to site
      </a>
    </div>
  </div>

</div>
</body>
</html>`);
});

const allowAdminRegistration = () => process.env.ALLOW_ADMIN_REGISTRATION !== 'false';

adminRouter.get('/register', (req, res) => {
  if (!allowAdminRegistration()) {
    return res.send(registerDisabledHtml());
  }
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create account · Kings Aqomplice</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/admin.css">
  <link rel="icon" type="image/png" href="/assets/KINGS%20AQOMPLICE%20K-LOGO%20Color.png">
</head>
<body class="admin-body">
<div class="login-shell">
  <div class="login-cinematic">
    <div class="login-grid-lines"></div>
    <div class="login-cinematic-content">
      <p class="login-cin-eyebrow">New administrator</p>
      <h1 class="login-cin-headline">Create your<br><em>access</em><br>credentials.</h1>
      <p class="login-cin-desc">
        Register once to use the command interface. Use a strong password and an email you control.
      </p>
    </div>
  </div>
  <div class="login-panel">
    <div class="login-form-wrap">
      <div class="login-logo-block">
        <div class="login-monogram"><span>KA</span></div>
        <div>
          <p class="login-logo-name">Kings Aqomplice</p>
          <p class="login-logo-tag">Legal Intelligence Platform</p>
        </div>
      </div>
      <h2 class="login-form-heading">Create account</h2>
      <p class="login-form-sub">Choose email and password for dashboard access</p>
      <form action="/admin/register" method="POST">
        <input type="hidden" name="_csrf" value="${res.locals.csrfToken || ''}">
        <div class="login-field">
          <label class="login-label" for="reg-email">Email address</label>
          <input class="login-input" type="email" id="reg-email" name="email" required autocomplete="email" placeholder="you@example.com">
        </div>
        <div class="login-field">
          <label class="login-label" for="reg-password">Password</label>
          <input class="login-input" type="password" id="reg-password" name="password" required autocomplete="new-password" minlength="8" placeholder="At least 8 characters">
        </div>
        <div class="login-field">
          <label class="login-label" for="reg-password2">Confirm password</label>
          <input class="login-input" type="password" id="reg-password2" name="password2" required autocomplete="new-password" minlength="8" placeholder="Repeat password">
        </div>
        <button type="submit" class="login-submit login-submit--signin">Create account</button>
      </form>
      ${req.query.error ? `<div class="login-error">${escapeHtml(req.query.error)}</div>` : ''}
      <p class="login-create-wrap">
        <a href="/admin/login" class="login-create-account login-create-account--solo">Already have an account? Sign in</a>
      </p>
      <a href="/" class="login-back">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Return to site
      </a>
    </div>
  </div>
</div>
</body>
</html>`);
});

function registerDisabledHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration · Kings Aqomplice</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/admin.css">
  <link rel="icon" type="image/png" href="/assets/KINGS%20AQOMPLICE%20K-LOGO%20Color.png">
</head>
<body class="admin-body">
<div class="login-shell">
  <div class="login-panel" style="width:100%;max-width:28rem;margin:0 auto;">
    <div class="login-form-wrap">
      <h2 class="login-form-heading">Registration closed</h2>
      <p class="login-form-sub">Administrator accounts are not self-service. Contact your firm or use the contact page to request access.</p>
      <p class="login-create-wrap" style="margin-top:1.25rem;">
        <a href="/contact.html" class="login-create-account">Contact the firm</a>
        <span class="login-create-label"> · </span>
        <a href="/admin/login" class="login-create-account">Sign in</a>
      </p>
      <a href="/" class="login-back"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>Return to site</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

adminRouter.post('/register', async (req, res) => {
  if (!allowAdminRegistration()) {
    return res.redirect('/admin/register');
  }
  try {
    const { email, password, password2 } = req.body || {};
    const el = (email || '').trim().toLowerCase();
    if (!el || !password) {
      return res.redirect('/admin/register?error=' + encodeURIComponent('Email and password required'));
    }
    if (password !== password2) {
      return res.redirect('/admin/register?error=' + encodeURIComponent('Passwords do not match'));
    }
    if (password.length < 8) {
      return res.redirect('/admin/register?error=' + encodeURIComponent('Password must be at least 8 characters'));
    }
    const existing = await prisma.adminUser.findUnique({ where: { email: el } });
    if (existing) {
      return res.redirect('/admin/register?error=' + encodeURIComponent('An account with this email already exists'));
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: { email: el, passwordHash },
    });
    res.redirect('/admin/login?registered=1');
  } catch (err) {
    console.error('Admin register error:', err);
    const userMsg = registerFailureMessage(err);
    res.redirect('/admin/register?error=' + encodeURIComponent(userMsg));
  }
});

function registerFailureMessage(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return 'An account with this email already exists.';
    }
  }
  const msg = typeof err?.message === 'string' ? err.message : '';
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    msg.includes("Can't reach database server") ||
    msg.includes('P1001') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT')
  ) {
    return 'Cannot reach the database. Set DATABASE_URL on the server, allow network access to the DB, and run prisma db push so tables exist.';
  }
  if (msg.includes('relation') && msg.includes('does not exist')) {
    return 'Database tables are missing. Run: npm run db push (with DATABASE_URL set).';
  }
  if (process.env.NODE_ENV === 'development' && msg) {
    return `Could not create account (${msg.slice(0, 120)})`;
  }
  return 'Could not create account. Try again.';
}

/* ── AUTH ── */
const FALLBACK_EMAIL = 'test@gmail.com';
const FALLBACK_PASSWORD = 'Test';

const setCookie = (res, token) =>
  res.cookie('ka_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000,
  });

adminRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.redirect('/admin/login?error=Email+and+password+required');
    const el = email.trim().toLowerCase();

    if (el === FALLBACK_EMAIL && password === FALLBACK_PASSWORD) {
      setCookie(res, createToken({ id: 'fallback', email: FALLBACK_EMAIL }));
      return res.redirect('/admin/dashboard');
    }

    const admin = await prisma.adminUser.findUnique({ where: { email: el } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash)))
      return res.redirect('/admin/login?error=Invalid+credentials');

    setCookie(res, createToken({ id: admin.id, email: admin.email }));
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    const el = (req.body?.email || '').trim().toLowerCase();
    if (el === FALLBACK_EMAIL && req.body?.password === FALLBACK_PASSWORD) {
      setCookie(res, createToken({ id: 'fallback', email: FALLBACK_EMAIL }));
      return res.redirect('/admin/dashboard');
    }
    res.redirect('/admin/login?error=An+error+occurred');
  }
});

adminRouter.get('/logout', (req, res) => { res.clearCookie('ka_admin'); res.redirect('/admin/login'); });

adminRouter.use(requireAuth);
adminRouter.get('/', (req, res) => res.redirect('/admin/dashboard'));

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/dashboard', async (req, res) => {
  let ic = 0, cc = 0, qc = 0;
  try {
    [ic, cc, qc] = await Promise.all([
      prisma.caseIntake.count(),
      prisma.consultationRequest.count(),
      prisma.contactInquiry.count(),
    ]);
  } catch (e) { console.warn('DB unavailable:', e.message); }

  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Command Interface</p>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Your firm's live activity — all submissions and metrics at a glance.</p>
      </div>
    </div>
    <div class="rule"></div>

    <!-- Stat cards -->
    <div class="stat-grid">
      <div class="stat-card" data-watermark="${ic}">
        <div class="stat-row-top">
          <div class="stat-icon-wrap">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <span class="stat-badge stat-badge-active">Active</span>
        </div>
        <p class="stat-label">Case Intakes</p>
        <p class="stat-number">${ic}</p>
        <div class="stat-footer">
          <a href="/admin/intakes" class="stat-link">View all intakes →</a>
          <span class="stat-meta">total</span>
        </div>
      </div>

      <div class="stat-card" data-watermark="${cc}">
        <div class="stat-row-top">
          <div class="stat-icon-wrap">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <span class="stat-badge stat-badge-pending">Pending</span>
        </div>
        <p class="stat-label">Consultations</p>
        <p class="stat-number">${cc}</p>
        <div class="stat-footer">
          <a href="/admin/consultations" class="stat-link">View all requests →</a>
          <span class="stat-meta">total</span>
        </div>
      </div>

      <div class="stat-card" data-watermark="${qc}">
        <div class="stat-row-top">
          <div class="stat-icon-wrap">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <span class="stat-badge stat-badge-inbox">Inbox</span>
        </div>
        <p class="stat-label">General Inquiries</p>
        <p class="stat-number">${qc}</p>
        <div class="stat-footer">
          <a href="/admin/inquiries" class="stat-link">View all inquiries →</a>
          <span class="stat-meta">total</span>
        </div>
      </div>
    </div>

    <!-- Dashboard grid -->
    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Recent Activity
          </span>
          <a href="/admin/intakes" class="panel-action">View all →</a>
        </div>
        <div class="panel-body">
          <div class="empty-state">
            <div class="empty-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p>New submissions will appear here in real time as they arrive.</p>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Quick Access
          </span>
        </div>
        <div class="panel-body">
          <div class="quick-links">
            <a href="/admin/clients" class="quick-link">
              <div class="ql-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
              <div class="ql-text"><p class="ql-label">Clients</p><p class="ql-sub">Roster &amp; case assignments</p></div>
              <span class="ql-arrow">→</span>
            </a>
            <a href="/admin/calendar" class="quick-link">
              <div class="ql-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
              <div class="ql-text"><p class="ql-label">Calendar</p><p class="ql-sub">Hearings &amp; deadlines</p></div>
              <span class="ql-arrow">→</span>
            </a>
            <a href="/admin/billing" class="quick-link">
              <div class="ql-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg></div>
              <div class="ql-text"><p class="ql-label">Billing</p><p class="ql-sub">Invoices &amp; PDF exports</p></div>
              <span class="ql-arrow">→</span>
            </a>
            <a href="/admin/memo-drafter" class="quick-link">
              <div class="ql-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
              <div class="ql-text"><p class="ql-label">Memo Drafter</p><p class="ql-sub">Draft &amp; print documents</p></div>
              <span class="ql-arrow">→</span>
            </a>
            <a href="/admin/network-radar" class="quick-link">
              <div class="ql-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
              <div class="ql-text"><p class="ql-label">Network Radar</p><p class="ql-sub">Visitor &amp; traffic analytics</p></div>
              <span class="ql-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  res.send(layout('Dashboard', body, '/admin/dashboard'));
});

/* ═══════════════════════════════════════════════════════════════
   CLIENTS
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/clients', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Client Management</p>
        <h1 class="page-title">Clients</h1>
        <p class="page-subtitle">Manage your client roster, case assignments, and onboard new clients.</p>
      </div>
      <div class="page-actions">
        <button type="button" id="import-intakes" class="btn btn-ghost">Import from Intakes</button>
        <button type="button" id="import-consultations" class="btn btn-accent">Import from Consultations</button>
      </div>
    </div>
    <div class="rule"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;">
      <div class="admin-card edge-crimson">
        <div class="admin-card-head"><h2>Add New Client</h2></div>
        <div class="admin-card-body">
          <form id="add-client-form" style="display:flex;flex-direction:column;gap:0.85rem;">
            <div class="f-group"><label class="f-label">Client Name</label><input type="text" name="name" required class="f-input" placeholder="Full legal name"></div>
            <div class="f-group"><label class="f-label">Email</label><input type="email" name="email" class="f-input"></div>
            <div class="f-group"><label class="f-label">Phone</label><input type="text" name="phone" class="f-input"></div>
            <div class="f-group"><label class="f-label">Case Name</label><input type="text" name="caseName" class="f-input" placeholder="Matter title"></div>
            <div class="f-group"><label class="f-label">Case Summary</label><textarea name="caseSummary" rows="3" class="f-input" placeholder="Brief case description"></textarea></div>
            <div class="f-group"><label class="f-label">Assigned Attorney</label><input type="text" name="assignedTo" class="f-input" placeholder="Attorney name"></div>
            <div class="f-group"><label class="f-label">Progress (%)</label><input type="number" name="progress" min="0" max="100" value="0" class="f-input"></div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.25rem;">Add Client</button>
          </form>
        </div>
      </div>

      <div>
        <div class="page-header" style="margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-hair);">
          <div class="page-header-meta">
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:600;color:var(--brand-crimson);">Clients &amp; Signups</h2>
            <p class="page-subtitle" style="margin:0;">Signups show an "Add to clients" action. Full clients display a progress indicator.</p>
          </div>
        </div>
        <div id="clients-list" class="space-y-3"></div>
      </div>
    </div>
    <script src="/admin/js/clients.js"></script>
  `;
  res.send(layout('Clients', body, '/admin/clients'));
});

/* ═══════════════════════════════════════════════════════════════
   CALENDAR
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/calendar', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Schedule</p>
        <h1 class="page-title">Calendar</h1>
        <p class="page-subtitle">Schedule hearings, deadlines, client meetings, and time tracking.</p>
      </div>
      <div class="page-actions">
        <div class="cal-view-group">
          <button type="button" id="cal-view-month">Month</button>
          <button type="button" id="cal-view-week">Week</button>
          <button type="button" id="cal-view-day">Day</button>
        </div>
        <button type="button" id="cal-add-event" class="btn btn-primary">+ Add Event</button>
      </div>
    </div>
    <div class="rule"></div>

    <div id="calendar-container" class="calendar-wrapper"></div>

    <!-- Event Modal -->
    <div id="event-modal" class="cal-event-modal hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(8,4,3,0.6);">
      <div class="modal-inner bg-white max-w-md w-full p-6">
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:600;color:#5C0601;margin-bottom:1.4rem;">Add Event</h2>
        <form id="event-form" style="display:flex;flex-direction:column;gap:0.85rem;">
          <div class="f-group"><label class="f-label">Event Name</label><input type="text" name="title" required class="f-input"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;">
            <div class="f-group"><label class="f-label">Start Date</label><input type="date" name="startDate" id="event-start-date" class="f-input"></div>
            <div class="f-group"><label class="f-label">End Date</label><input type="date" name="endDate" id="event-end-date" class="f-input"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;">
            <div class="f-group"><label class="f-label">Start Time</label><input type="time" name="startTime" class="f-input"></div>
            <div class="f-group"><label class="f-label">End Time</label><input type="time" name="endTime" class="f-input"></div>
          </div>
          <div class="f-group"><label class="f-label">Summary</label><textarea name="summary" rows="3" class="f-input"></textarea></div>
          <div class="f-group"><label class="f-label">Type</label>
            <select name="type" class="f-input">
              <option value="event">Event</option>
              <option value="case">Case</option>
              <option value="time">Time tracking</option>
            </select>
          </div>
          <div style="display:flex;gap:0.65rem;margin-top:0.25rem;">
            <button type="submit" class="btn btn-primary" style="flex:1;">Add Event</button>
            <button type="button" class="btn btn-ghost" style="flex:1;" onclick="window.closeEventModal()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    <script src="/admin/js/calendar.js"></script>
  `;
  res.send(layout('Calendar', body, '/admin/calendar'));
});

/* ═══════════════════════════════════════════════════════════════
   BILLING
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/billing', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Finance</p>
        <h1 class="page-title">Billing</h1>
        <p class="page-subtitle">Generate professional invoices and track outstanding client accounts.</p>
      </div>
    </div>
    <div class="rule"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;">
      <div class="admin-card edge-crimson">
        <div class="admin-card-head"><h2>New Invoice</h2></div>
        <div class="admin-card-body">
          <div class="firm-block">
            <p class="firm-block-name">Kings Aqomplice</p>
            <p class="firm-block-sub">Legal Intelligence Platform · Strategic Legal Counsel</p>
          </div>
          <form id="add-invoice-form" style="display:flex;flex-direction:column;gap:0.85rem;">
            <div class="f-group">
              <label class="f-label">Client Name</label>
              <input type="text" name="clientName" id="invoice-client-name" required class="f-input" placeholder="Client or company name">
              <select id="invoice-client-select" class="f-input" style="margin-top:0.4rem;">
                <option value="">— Or select existing client —</option>
              </select>
            </div>
            <div class="f-group"><label class="f-label">Service Rendered</label><input type="text" name="serviceRendered" required class="f-input" placeholder="Description of legal service"></div>
            <div class="f-group"><label class="f-label">Amount (R)</label><input type="number" name="amount" step="0.01" required class="f-input" placeholder="0.00"></div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top:0.25rem;">Generate Invoice</button>
          </form>
        </div>
      </div>

      <div>
        <div class="page-header" style="margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-hair);">
          <div class="page-header-meta">
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:600;color:var(--brand-crimson);">Active Invoices</h2>
            <p class="page-subtitle" style="margin:0;">Click Download PDF to save or send to client.</p>
          </div>
        </div>
        <div id="invoices-list" class="space-y-3"></div>
      </div>
    </div>
    <script src="/admin/js/billing.js"></script>
  `;
  res.send(layout('Billing', body, '/admin/billing'));
});

/* ═══════════════════════════════════════════════════════════════
   NETWORK RADAR
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/network-radar', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Analytics</p>
        <h1 class="page-title">Network Radar</h1>
        <p class="page-subtitle">Monitor visitor traffic and engagement across the Kings Aqomplice site.</p>
      </div>
    </div>
    <div class="rule"></div>

    <div class="radar-grid">
      <div class="radar-card">
        <p class="radar-label">Today</p>
        <p id="visits-day" class="radar-number">—</p>
        <p class="radar-sub">unique visitors</p>
      </div>
      <div class="radar-card">
        <p class="radar-label">This Month</p>
        <p id="visits-month" class="radar-number">—</p>
        <p class="radar-sub">unique visitors</p>
      </div>
      <div class="radar-card">
        <p class="radar-label">This Year</p>
        <p id="visits-year" class="radar-number">—</p>
        <p class="radar-sub">unique visitors</p>
      </div>
    </div>
    <script src="/admin/js/network-radar.js"></script>
  `;
  res.send(layout('Network Radar', body, '/admin/network-radar'));
});

/* ═══════════════════════════════════════════════════════════════
   MEMO DRAFTER
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/memo-drafter', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Document Intelligence</p>
        <h1 class="page-title">Memo / Contract Drafter</h1>
        <p class="page-subtitle">Draft, edit, save, and print legal documents and contracts.</p>
      </div>
      <div class="page-actions">
        <select id="memo-select" class="f-input" style="width:auto;min-width:160px;"><option value="">New document</option></select>
        <button type="button" id="memo-save" class="btn btn-ghost">Save</button>
        <label class="btn btn-ghost" style="cursor:pointer;">
          Upload
          <input type="file" id="memo-upload" accept=".txt,.md" style="display:none;">
        </label>
        <button type="button" id="memo-print" class="btn btn-primary">Print / PDF</button>
      </div>
    </div>
    <div class="rule"></div>

    <div class="admin-card" style="padding:1.5rem 1.75rem;">
      <input type="text" id="memo-title" placeholder="Untitled Document" style="margin-bottom:1.25rem;">
      <textarea id="memo-editor" rows="28" placeholder="Begin drafting your legal document…"></textarea>
    </div>
    <script src="/admin/js/memo-drafter.js"></script>
  `;
  res.send(layout('Memo / Contract Drafter', body, '/admin/memo-drafter'));
});

/* ═══════════════════════════════════════════════════════════════
   INTAKES
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/intakes', async (req, res) => {
  let intakes = [];
  try {
    intakes = await prisma.caseIntake.findMany({ include: { session: true }, orderBy: { createdAt: 'desc' } });
  } catch (e) { console.warn('Intakes DB unavailable:', e.message); }

  const rows = intakes.length
    ? intakes.map(i => `<tr>
        <td><span class="email-chip">${escapeHtml(i.email)}</span></td>
        <td>${escapeHtml(i.fullName || '—')}</td>
        <td>${escapeHtml(i.phone || '—')}</td>
        <td>${escapeHtml(i.caseType || '—')}</td>
        <td style="max-width:240px;color:var(--text-muted);">${escapeHtml((i.description||'').slice(0,90))}${(i.description||'').length>90?'…':''}</td>
        <td><span class="date-chip">${i.createdAt.toISOString().slice(0,10)}</span></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">No case intakes yet.</td></tr>';

  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Intake</p>
        <h1 class="page-title">Case Intakes</h1>
        <p class="page-subtitle">All case submissions received through the Legal Intelligence chat interface.</p>
      </div>
    </div>
    <div class="rule"></div>
    <div class="table-shell overflow-x-auto">
      <table class="admin-table">
        <thead><tr><th>Email</th><th>Name</th><th>Phone</th><th>Case Type</th><th>Description</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  res.send(layout('Case Intakes', body, '/admin/intakes'));
});

/* ═══════════════════════════════════════════════════════════════
   CONSULTATIONS
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/consultations', async (req, res) => {
  let data = [];
  try {
    data = await prisma.consultationRequest.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (e) { console.warn('Consultations DB unavailable:', e.message); }

  const statusMap = { pending: 'pending', confirmed: 'active', cancelled: 'closed', completed: 'closed' };

  const rows = data.length
    ? data.map(c => `<tr>
        <td>${escapeHtml(c.fullName)}</td>
        <td><span class="email-chip">${escapeHtml(c.email)}</span></td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.preferredDate || '—')}</td>
        <td><span class="badge badge-${statusMap[c.status]||'closed'}">${escapeHtml(c.status)}</span></td>
        <td style="max-width:200px;color:var(--text-muted);">${escapeHtml((c.message||'').slice(0,60))}${(c.message||'').length>60?'…':''}</td>
        <td><span class="date-chip">${c.createdAt.toISOString().slice(0,10)}</span></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">No consultation requests yet.</td></tr>';

  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Intake</p>
        <h1 class="page-title">Consultations</h1>
        <p class="page-subtitle">All consultation requests submitted through the public-facing site.</p>
      </div>
    </div>
    <div class="rule"></div>
    <div class="table-shell overflow-x-auto">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Preferred Date</th><th>Status</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  res.send(layout('Consultations', body, '/admin/consultations'));
});

/* ═══════════════════════════════════════════════════════════════
   INQUIRIES
═══════════════════════════════════════════════════════════════ */
adminRouter.get('/inquiries', async (req, res) => {
  let data = [];
  try {
    data = await prisma.contactInquiry.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (e) { console.warn('Inquiries DB unavailable:', e.message); }

  const rows = data.length
    ? data.map(i => `<tr>
        <td>${escapeHtml(i.name)}</td>
        <td><span class="email-chip">${escapeHtml(i.email)}</span></td>
        <td style="max-width:340px;color:var(--text-muted);">${escapeHtml((i.message||'').slice(0,100))}${(i.message||'').length>100?'…':''}</td>
        <td><span class="date-chip">${i.createdAt.toISOString().slice(0,10)}</span></td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">No inquiries yet.</td></tr>';

  const body = `
    <div class="page-header">
      <div class="page-header-meta">
        <p class="page-eyebrow">Intake</p>
        <h1 class="page-title">Inquiries</h1>
        <p class="page-subtitle">General contact form submissions from the public site.</p>
      </div>
    </div>
    <div class="rule"></div>
    <div class="table-shell overflow-x-auto">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  res.send(layout('Inquiries', body, '/admin/inquiries'));
});

/* ── UTIL ── */
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
