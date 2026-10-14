// Shared helpers for the CRM API (Vercel Node functions in /api).
// Env: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET, (ADMIN_EMAIL), and for files either
//      BLOB_READ_WRITE_TOKEN (classic) or BLOB_STORE_ID (newer stores, authenticated with Vercel OIDC)
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

// Returns { ok, temp }. ADMIN_PASSWORD (set in Vercel) is a *temporary* password: signing in with it
// only allows choosing a new one. A password set in the CRM replaces it — until ADMIN_PASSWORD is
// changed in Vercel again (that's the reset path).
async function verifyPassword(pw) {
  const rec = await getSetting('password');
  if (rec && rec.envfp === envFingerprint()) {
    const k = await scrypt(String(pw), Buffer.from(rec.salt, 'hex'));
    return { ok: safeEq(k, Buffer.from(rec.hash, 'hex')), temp: false };
  }
  return { ok: safeEq(sha(String(pw)), sha(process.env.ADMIN_PASSWORD || '\u0000never')), temp: true };
}
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const k = await scrypt(String(pw), salt);
  return { salt: salt.toString('hex'), hash: k.toString('hex') };
}
async function checkHash(pw, salt, hash) {
  const k = await scrypt(String(pw), Buffer.from(salt, 'hex'));
  return safeEq(k, Buffer.from(hash, 'hex'));
}
async function storePassword(pw) {
  const h = await hashPassword(pw);
  await setSetting('password', { ...h, envfp: envFingerprint(), at: new Date().toISOString() });
}
// readable one-time password for new team members, e.g. JanLee-k7Rm2-Qx9Tp-4hWz
function tempPassword() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const pick = n => Array.from(crypto.randomBytes(n), b => A[b % A.length]).join('');
  return `JanLee-${pick(5)}-${pick(5)}-${pick(4)}`;
}

// ---- sessions: signed, HttpOnly cookie ----
const b64 = s => Buffer.from(s).toString('base64url');
const sign = data => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('base64url');
async function sessionVersion() { return Number((await getSetting('session_version')) ?? 1); }

// temp: signed in with a temporary password (may only change it; 30 minutes max)
// remember: stay signed in for 14 days; otherwise the cookie ends with the browser session (max 12 h)
// user: a team member row ({ id, email, session_version }); omitted = the owner account
async function issueSession(res, { temp = false, remember = true, user = null } = {}) {
  const v = await sessionVersion();
  const ttl = temp ? 30 * 60e3 : remember ? SESSION_DAYS * 864e5 : 12 * 3600e3;
  const who = user ? { uid: user.id, uv: user.session_version, sub: user.email } : { uid: 'owner', sub: ADMIN_EMAIL() };
  const payload = b64(JSON.stringify({ ...who, v, temp: !!temp, rem: !!remember, exp: Date.now() + ttl }));
  const token = `${payload}.${sign(payload)}`;
  const age = temp || !remember ? '' : `; Max-Age=${SESSION_DAYS * 86400}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict${age}`);
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
  if (p.v !== (await sessionVersion())) return null; // owner signed everyone out / owner password changed
  if (!p.uid || p.uid === 'owner') {
    const prof = (await getSetting('profile')) || {};
    return { ...p, uid: 'owner', owner: true, role: 'admin', email: ADMIN_EMAIL(), name: prof.name || 'JanLee' };
  }
  // team member: must still exist, be active, and not have been signed out since
  const [u] = await q('select id, email, name, role, active, session_version from users where id = $1', [p.uid]);
  if (!u || !u.active || u.session_version !== p.uv) return null;
  return { ...p, owner: false, role: u.role, email: u.email, name: u.name };
}
// guard for authenticated endpoints; returns session or sends the error
async function requireAuth(req, res, { write = false, admin = false } = {}) {
  const miss = missingEnv();
  if (miss.length) { send(res, 503, { ok: false, error: 'not_configured', missing: miss }); return null; }
  if (write && !sameOrigin(req)) { send(res, 403, { ok: false, error: 'origin' }); return null; }
  const s = await currentSession(req);
  if (!s) { send(res, 401, { ok: false, error: 'signed_out' }); return null; }
  if (s.temp) { send(res, 403, { ok: false, error: 'must_change_password' }); return null; }
  if (admin && s.role !== 'admin') { send(res, 403, { ok: false, error: 'forbidden' }); return null; }
  return s;
}

// ---- Vercel Blob credentials ----
// Newer Blob connections only add BLOB_STORE_ID and authenticate with the function's OIDC token
// (sent by Vercel in the x-vercel-oidc-token request header); older ones add BLOB_READ_WRITE_TOKEN.
const blobConfigured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
function blobAuth(req) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return {};
  const oidcToken = req?.headers?.['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  return { storeId: process.env.BLOB_STORE_ID, ...(oidcToken ? { oidcToken } : {}) };
}

module.exports = {
  blobConfigured, blobAuth,
  q, sql, send, body, clientIp, sameOrigin, missingEnv, ADMIN_EMAIL,
  getSetting, setSetting, verifyPassword, storePassword, hashPassword, checkHash, tempPassword,
  issueSession, clearSession, currentSession, requireAuth, sessionVersion,
};
