// Vercel serverless function: POST /api/lead
// Saves a website enquiry into the CRM (Supabase) after server-side validation.
// Env vars (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL                e.g. https://abcd1234.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   Supabase → Project Settings → API → service_role (secret! never in the browser)
//   ALLOWED_ORIGINS             optional, comma-separated; defaults below
// The email notification + visitor auto-reply are still sent by FormSubmit from the browser.

const DEFAULT_ORIGINS = ['https://interiorsbyjanlee.com', 'https://www.interiorsbyjanlee.com', 'https://janlee.vercel.app'];
const PROJECT_TYPES = ['Interior design & decorating', 'Kitchen renovation', 'Bathroom renovation', 'Whole-home remodel', 'Color consultation', 'Furniture selection / repurposing', 'Commercial space', 'Something else'];
const hits = new Map(); // best-effort per-IP limiter (per warm instance)

const clean = (v, max, multiline = false) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, '')
  .replace(multiline ? /[ \t]{2,}/g : /\s+/g, ' ')
  .trim()
  .slice(0, max);
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const links = v => (v.match(/https?:\/\/|www\.|\[url|<a\s/gi) || []).length;

function validate(b) {
  const d = {
    name: clean(b.name, 80),
    email: clean(b.email, 254).toLowerCase(),
    phone: clean(b.phone, 20),
    zip: clean(b.zip, 10),
    project_type: clean(b.project, 80),
    message: clean(b.message, 2000, true),
  };
  const errors = [];
  if (d.name.length < 2 || !/^[\p{L}][\p{L}\p{M} .,'’\-]*$/u.test(d.name)) errors.push('name');
  if (!EMAIL.test(d.email) || /\.\./.test(d.email)) errors.push('email');
  const digits = d.phone.replace(/\D/g, '');
  if (/[^\d\s().+\-]/.test(d.phone) || digits.length < 10 || digits.length > 15) errors.push('phone');
  if (d.zip && !/^\d{5}(-\d{4})?$/.test(d.zip)) errors.push('zip');
  if (d.message.length < 10 || links(d.message) > 2) errors.push('message');
  if (b.consent !== true && b.consent !== 'Yes') errors.push('consent');
  if (!PROJECT_TYPES.includes(d.project_type)) d.project_type = 'Something else';
  return { d, errors };
}

async function sb(path, init = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const allowed = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  if (!allowed.includes(origin)) return res.status(403).json({ ok: false, error: 'origin' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ ok: false, error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object' || JSON.stringify(b).length > 10000) return res.status(400).json({ ok: false, error: 'bad_request' });

  // bots: honeypot filled → pretend success, store nothing
  if (b._honey) return res.status(200).json({ ok: true });

  // per-IP: max 5 per 10 minutes on this instance
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 600e3);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: 'rate_limited' });
  hits.set(ip, [...recent, now]);

  const { d, errors } = validate(b);
  if (errors.length) return res.status(422).json({ ok: false, error: 'invalid', fields: errors });

  try {
    // per-email: max 3 enquiries per hour (database-backed, survives cold starts)
    const since = new Date(now - 3600e3).toISOString();
    const c = await sb(`leads?select=id&email=eq.${encodeURIComponent(d.email)}&created_at=gte.${encodeURIComponent(since)}`, {
      method: 'HEAD', headers: { Prefer: 'count=exact' },
    });
    const count = Number((c.headers.get('content-range') || '').split('/')[1] || 0);
    if (count >= 3) return res.status(429).json({ ok: false, error: 'rate_limited' });

    const r = await sb('leads', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...d, zip: d.zip || null, source: 'website', stage: 'new' }),
    });
    if (!r.ok) { console.error('supabase insert failed', r.status, await r.text()); return res.status(502).json({ ok: false, error: 'store_failed' }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('lead error', e);
    return res.status(500).json({ ok: false, error: 'server' });
  }
};
