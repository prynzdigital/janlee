# JanLee CRM — setup guide

The CRM lives at **`/admin/`** on the website (e.g. `https://interiorsbyjanlee.com/admin/`).
Until it is connected it runs in **demo mode** with sample data that stays in your browser only.

Connecting it takes about 15 minutes and is free (Supabase free plan).

---

## 1. Create the database (Supabase)

1. Go to **https://supabase.com** → sign up (use the business Gmail) → **New project**.
   - Name: `janlee-crm` · Region: **West US** (closest to Colorado) · set a strong database password and save it in a password manager.
2. When the project is ready, open **SQL Editor → New query**, paste the whole contents of
   [`supabase/schema.sql`](../supabase/schema.sql), and click **Run**. You should see "Success. No rows returned".

## 2. Lock down sign-in

1. **Authentication → Sign In / Providers → Email**: keep Email enabled, and turn **"Allow new users to sign up" OFF**.
   (Even if someone could sign up, the database only lets `interiorsbyjanlee@gmail.com` see anything.)
2. **Authentication → Users → Add user → Create new user**
   - Email: `interiorsbyjanlee@gmail.com`
   - Password: a strong password (12+ characters) — save it in a password manager
   - Tick **Auto Confirm User**.
3. **Authentication → URL Configuration**
   - Site URL: `https://interiorsbyjanlee.com/admin/`
   - Redirect URLs: add `https://interiorsbyjanlee.com/admin/` and `https://janlee.vercel.app/admin/`
   (used by "Forgot password?").

## 3. Copy the keys

**Project Settings → API** (or **Data API**). You need three values:

| Value | Where it goes | Secret? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | `site/admin/config.js` **and** Vercel | No |
| `anon` `public` key | `site/admin/config.js` | No — safe in the browser; the database rules protect the data |
| `service_role` key | **Vercel only** | **YES — never put it in any file or share it** |

## 4. Connect the dashboard

Edit `site/admin/config.js`:

```js
window.CRM_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ…your anon public key…',
  adminEmail: 'interiorsbyjanlee@gmail.com',
};
```

Commit and push — Vercel redeploys automatically.

## 5. Connect website enquiries (Vercel)

Vercel → the **janlee** project → **Settings → Environment Variables** → add (Production, Preview):

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key |
| `ALLOWED_ORIGINS` *(optional)* | `https://interiorsbyjanlee.com,https://www.interiorsbyjanlee.com,https://janlee.vercel.app` |

Then **Deployments → ⋯ → Redeploy** so the function picks them up.

From now on every contact-form submission is saved as a **New** lead (and the emails keep working exactly as before).

## 6. Try it

1. Open `/admin/`, sign in.
2. Send a test enquiry from the Contact page → it appears under **Leads → New** within seconds
   (switch tabs and come back, or reload).

---

## Using the CRM

- **Dashboard** — new leads this month, open pipeline value, win rate, active projects, everything due today, and charts.
- **Leads** — Pipeline board (drag cards between stages on a computer; on a phone, open the lead and change *Stage*) or List with search and stage filters. Each lead has notes/call history, tasks, a follow-up date and an estimated value.
- **Convert to client** — on a won lead: creates the client (and optionally the first project) and keeps the history linked.
- **Tasks** — overdue / today / upcoming, plus lead follow-ups for the next 7 days. The red badge shows how many are due.
- **Clients & Projects** — contact details, projects with budget, status and dates, and a full history per client.
- **Export leads (CSV)** — opens in Excel / Google Sheets.

Tip: on a phone, open `/admin/` in Safari/Chrome and choose **Add to Home Screen** for an app-like icon.

## Security notes

- Every table has Row Level Security; only the email in `crm_admins` can read or write.
- The browser only ever holds the public `anon` key; the `service_role` key lives only in Vercel.
- `/admin/` and `/api/` are `noindex` and blocked in `robots.txt`; the admin has its own strict Content-Security-Policy.
- The lead API re-validates every field server-side, checks the request comes from the website, and rate-limits (3 per email per hour, 5 per connection per 10 minutes).
- Turn on **two-factor authentication** for the Supabase and Vercel accounts.
- Backups: Supabase free plan keeps daily backups for 1 day — use **Export leads (CSV)** monthly, or upgrade to Pro for longer retention.
