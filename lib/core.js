// Shared helpers for the CRM API (Vercel Node functions in /api).
// Env: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET, (ADMIN_EMAIL), BLOB_READ_WRITE_TOKEN
const crypto = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

let _sql;
const sql = () => (_sql ||= neon(process.env.DATABASE_URL));
const q = (text, params = []) => sql().query(text, params);

const ADMIN_EMAIL = () => (process.env.ADMIN_EMAIL || 'interiorsbyjanlee@gmail.com').toLowerCase();
const COOKIE = 'jl_crm';
const SESSION_DAYS = 14;

function missingEnv() {
  return ['DATABASE_URL', 'ADMIN_PASSWORD', 'SESSION_SECRET'].filter(k => !process.env[k]);
}

function send(res, code, body, headers = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.status(code).json(body);
}

// ---- request checks ----
const clientIp = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
// state-changing requests must come from this same site (blocks CSRF) and carry our custom header
function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return !!origin && !!host && origin === `${proto}://${host}` && req.headers['x-crm'] === '1';
}
function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

// ---- settings ----
async function getSetting(key) {
  const r = await q('select value from settings where key = $1', [key]);
  return r[0]?.value ?? null;
}
async function setSetting(key, value) {
  await q(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
           on conflict (key) do update set value = excluded.value, updated_at = now()`, [key, JSON.stringify(value)]);
}

// ---- passwords (scrypt) ----
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? no(e) : ok(k))));
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const envFingerprint = () => sha('jl-env:' + (process.env.ADMIN_PASSWORD || '')).toString('hex').slice(0, 24);
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b);

async function verifyPassword(pw) {
  const rec = await getSetting('password');
  // A password changed in the CRM wins — unless ADMIN_PASSWORD was changed in Vercel since (that's the reset path).
  if (rec && rec.envfp === envFingerprint()) {
    const k = await scrypt(String(pw), Buffer.from(rec.salt, 'hex'));
    return safeEq(k, Buffer.from(rec.hash, 'hex'));
  }
  return safeEq(sha(String(pw)), sha(process.env.ADMIN_PASSWORD || '\u0000never'));
}
async function storePassword(pw) {
  const salt = crypto.randomBytes(16);
  const k = await scrypt(String(pw), salt);
  await setSetting('password', { salt: salt.toString('hex'), hash: k.toString('hex'), envfp: envFingerprint(), at: new Date().toISOString() });
}

// ---- sessions: signed, HttpOnly cookie ----
const b64 = s => Buffer.from(s).toString('base64url');
const sign = data => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('base64url');
async function sessionVersion() { return Number((await getSetting('session_version')) ?? 1); }

async function issueSession(res) {
  const v = await sessionVersion();
  const payload = b64(JSON.stringify({ sub: ADMIN_EMAIL(), v, exp: Date.now() + SESSION_DAYS * 864e5 }));
  const token = `${payload}.${sign(payload)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}
async function currentSession(req) {
  if (!process.env.SESSION_SECRET) return null;
  const raw = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload)), got = Buffer.from(sig);
  if (!safeEq(good, got)) return null;
  let p; try { p = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
  if (!p.exp || p.exp < Date.now()) return null;
  if (p.v !== (await sessionVersion())) return null; // signed out everywhere / password changed
  return p;
}
// guard for authenticated endpoints; returns session or sends the error
async function requireAuth(req, res, { write = false } = {}) {
  const miss = missingEnv();
  if (miss.length) { send(res, 503, { ok: false, error: 'not_configured', missing: miss }); return null; }
  if (write && !sameOrigin(req)) { send(res, 403, { ok: false, error: 'origin' }); return null; }
  const s = await currentSession(req);
  if (!s) { send(res, 401, { ok: false, error: 'signed_out' }); return null; }
  return s;
}

module.exports = {
  q, sql, send, body, clientIp, sameOrigin, missingEnv, ADMIN_EMAIL,
  getSetting, setSetting, verifyPassword, storePassword,
  issueSession, clearSession, currentSession, requireAuth, sessionVersion,
};
