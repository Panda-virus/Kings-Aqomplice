# Kings Aqomplice — Legal Intelligence Platform

A structured legal intelligence platform for the Kings Aqomplice law firm. HTML-first architecture with progressive enhancement.

**Repository:** [github.com/Lordsi/Kings-Aqomplice-](https://github.com/Lordsi/Kings-Aqomplice-)

## Stack

- **Frontend:** Semantic HTML5, Tailwind CSS, vanilla JavaScript
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (e.g. [Supabase](https://supabase.com)), Prisma ORM
- **AI:** OpenAI API (optional)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL and secrets.

3. **Database**

   **Supabase:** Create a project at [supabase.com](https://supabase.com). In **Project Settings → Database**, use the **direct** connection URI (port **5432**) for `DATABASE_URL` in `.env`. Add `?sslmode=require` if missing. Use the same `DATABASE_URL` in Hostinger’s environment variables for production.

   **Local PostgreSQL:** Set `DATABASE_URL` to your local instance instead.

   Then apply the schema and seed the admin user:

   ```bash
   npm run db:generate
   npm run db:push
   npm run seed:admin
   ```

   To create/update the two team admin accounts (`praisemagangani@gmail.com`, `fanuelrudi@gmail.com`) with new random passwords (printed once in the terminal):

   ```bash
   npm run seed:team
   ```

4. **Build CSS**
   ```bash
   npm run build:css
   ```

5. **Run**
   ```bash
   npm start
   ```
   Or for development with auto-reload: `npm run dev`

## Pages

- `/` — Home
- `/about.html` — About
- `/practice-areas.html` — Practice Areas
- Legal Intelligence — Chat widget (no dedicated page)
- `/insights.html` — Insights
- `/contact.html` — Contact

## Admin

- `/admin/login` — Admin login
- `/admin/register` — Create administrator account (disable with `ALLOW_ADMIN_REGISTRATION=false` in production if you do not want open signup). If registration fails, confirm `DATABASE_URL` on the host, run `npm run db push` once, and check the server logs — “could not create account” usually means the app cannot connect to PostgreSQL or the `AdminUser` table is missing.
- `/admin/dashboard` — Dashboard
- `/admin/intakes` — Case intakes
- `/admin/consultations` — Consultation requests
- `/admin/inquiries` — General inquiries

Default admin (after seed): `admin@kingsaqomplice.com` / `ChangeMe123!`

## API

- `POST /api/chat` — Chat / Legal Intelligence
- `POST /api/intake` — Direct intake submission
- `POST /api/booking` — Consultation request
- `POST /api/contact` — General inquiry

## Security

- CSRF protection (double-submit cookie)
- Rate limiting on chat
- Helmet security headers
- Input validation (Zod)
- JWT admin authentication
