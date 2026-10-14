// POST /api/auth  { op: 'login' | 'logout' | 'logout_all' | 'password' | 'profile', ... }
// GET  /api/auth  -> { configured, authenticated, mustChange, email, role, owner, profile, files }
// Accounts: the owner (ADMIN_EMAIL + ADMIN_PASSWORD in Vercel) and team members in the users table.
const core = require('../lib/core.js');

const DEFAULT_PROFILE = { name: 'JanLee', title: 'Owner & Lead Designer', phone: '(719) 930-5245' };
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const DUMMY = { salt: '00'.repeat(16), hash: '00'.repeat(64) }; // equalises timing for unknown emails

async function profileFor(s) {
  if (s.owner) return { ...DEFAULT_PROFILE, ...((await core.getSetting('profile')) || {}) };
  const [u] = await core.q('select name, title, phone from users where id = $1', [s.uid]);
  return { name: u?.name || '', title: u?.title || (s.role === 'admin' ? 'Admin' : 'Team member'), phone: u?.phone || '' };
}

module.exports = async (req, res) => {
  try {
    const miss = core.missingEnv();
    if (req.method === 'GET') {
      if (miss.length) return core.send(res, 200, { ok: true, configured: false, missing: miss });
      const s = await core.currentSession(req);
      if (!s) return core.send(res, 200, { ok: true, configured: true, authenticated: false });
      return core.send(res, 200, {
        ok: true, configured: true, authenticated: true, mustChange: !!s.temp,
        email: s.email, role: s.role, owner: !!s.owner,
        profile: s.temp ? null : await profileFor(s), files: core.blobConfigured(),
      });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return core.send(res, 405, { ok: false }); }
    if (miss.length) return core.send(res, 503, { ok: false, error: 'not_configured', missing: miss });
    if (!core.sameOrigin(req)) return core.send(res, 403, { ok: false, error: 'origin' });

    const b = core.body(req);
    const ip = core.clientIp(req);

    if (b.op === 'login') {
      // rate limit: 5 failures per IP / 15 min, 30 failures overall / 15 min
      const [{ n: perIp }] = await core.q(`select count(*)::int n from login_attempts where ip = $1 and not ok and at > now() - interval '15 minutes'`, [ip]);
      const [{ n: all }] = await core.q(`select count(*)::int n from login_attempts where not ok and at > now() - interval '15 minutes'`);
      if (perIp >= 5 || all >= 30) return core.send(res, 429, { ok: false, error: 'rate_limited' });
      const email = str(b.email, 254).toLowerCase(), password = str(b.password, 200);
      let good = false, temp = false, user = null;
      if (email === core.ADMIN_EMAIL()) {
        const pw = await core.verifyPassword(password);
        good = pw.ok; temp = pw.temp;
      } else {
        const [u] = await core.q('select * from users where lower(email) = $1', [email]);
        const okHash = await core.checkHash(password, (u || DUMMY).salt, (u || DUMMY).hash);
        good = !!u && u.active && okHash; temp = !!u?.must_change; user = good ? u : null;
      }
      await core.q('insert into login_attempts (ip, ok) values ($1, $2)', [ip, good]);
      if (Math.random() < 0.05) await core.q(`delete from login_attempts where at < now() - interval '7 days'`);
      if (!good) return core.send(res, 401, { ok: false, error: 'invalid', remaining: Math.max(0, 4 - perIp) });
      if (user) await core.q('update users set last_login_at = now() where id = $1', [user.id]);
      await core.issueSession(res, { temp, remember: b.remember !== false, user });
      return core.send(res, 200, { ok: true, mustChange: temp });
    }

    if (b.op === 'logout') { core.clearSession(res); return core.send(res, 200, { ok: true }); }

    // everything below requires a valid session
    const s = await core.currentSession(req);
    if (!s) return core.send(res, 401, { ok: false, error: 'signed_out' });

    if (b.op === 'logout_all') {
      // owner: signs out every account on every device; team member: only their own devices
      if (s.owner) await core.setSetting('session_version', (await core.sessionVersion()) + 1);
      else await core.q('update users set session_version = session_version + 1 where id = $1', [s.uid]);
      core.clearSession(res);
      return core.send(res, 200, { ok: true });
    }
    if (b.op === 'password') {
      const next = String(b.next ?? '');
      if (next.length < 12 || next.length > 200) return core.send(res, 400, { ok: false, error: 'weak_password' });
      if (s.owner) {
        // a temporary sign-in already proved the temporary password; otherwise re-check the current one
        if (!s.temp && !(await core.verifyPassword(str(b.current, 200))).ok) return core.send(res, 400, { ok: false, error: 'wrong_password' });
        if (next === process.env.ADMIN_PASSWORD) return core.send(res, 400, { ok: false, error: 'same_as_temp' });
        await core.storePassword(next);
        await core.setSetting('session_version', (await core.sessionVersion()) + 1); // sign out other devices
        await core.issueSession(res, { remember: s.rem !== false });
        return core.send(res, 200, { ok: true });
      }
      const [u] = await core.q('select * from users where id = $1', [s.uid]);
      if (!s.temp && !(await core.checkHash(str(b.current, 200), u.salt, u.hash))) return core.send(res, 400, { ok: false, error: 'wrong_password' });
      if (await core.checkHash(next, u.salt, u.hash)) return core.send(res, 400, { ok: false, error: s.temp ? 'same_as_temp' : 'same_password' });
      const h = await core.hashPassword(next);
      const [nu] = await core.q('update users set salt = $1, hash = $2, must_change = false, session_version = session_version + 1 where id = $3 returning *', [h.salt, h.hash, u.id]);
      await core.issueSession(res, { remember: s.rem !== false, user: nu });
      return core.send(res, 200, { ok: true });
    }
    if (s.temp) return core.send(res, 403, { ok: false, error: 'must_change_password' });
    if (b.op === 'profile') {
      const p = { name: str(b.name, 60) || (s.owner ? DEFAULT_PROFILE.name : s.name), title: str(b.title, 80), phone: str(b.phone, 30) };
      if (s.owner) await core.setSetting('profile', p);
      else await core.q('update users set name = $1, title = $2, phone = $3 where id = $4', [p.name, p.title || null, p.phone || null, s.uid]);
      return core.send(res, 200, { ok: true, profile: p });
    }
    return core.send(res, 400, { ok: false, error: 'unknown_op' });
  } catch (e) {
    console.error('auth error', e);
    return core.send(res, 500, { ok: false, error: 'server' });
  }
};
