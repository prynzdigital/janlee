// POST /api/auth  { op: 'login' | 'logout' | 'logout_all' | 'password' | 'profile', ... }
// GET  /api/auth  -> { configured, authenticated, email, profile }
const core = require('../lib/core.js');

const DEFAULT_PROFILE = { name: 'JanLee', title: 'Owner & Lead Designer', phone: '(719) 930-5245' };
const str = (v, max) => String(v ?? '').trim().slice(0, max);

module.exports = async (req, res) => {
  try {
    const miss = core.missingEnv();
    if (req.method === 'GET') {
      if (miss.length) return core.send(res, 200, { ok: true, configured: false, missing: miss });
      const s = await core.currentSession(req);
      const profile = s ? { ...DEFAULT_PROFILE, ...((await core.getSetting('profile')) || {}) } : null;
      return core.send(res, 200, { ok: true, configured: true, authenticated: !!s, mustChange: !!s?.temp, email: s ? core.ADMIN_EMAIL() : null, profile: s?.temp ? null : profile, files: s ? core.blobConfigured() : undefined });
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
      const emailOk = str(b.email, 254).toLowerCase() === core.ADMIN_EMAIL();
      const pw = await core.verifyPassword(str(b.password, 200));
      const good = emailOk && pw.ok;
      await core.q('insert into login_attempts (ip, ok) values ($1, $2)', [ip, good]);
      if (Math.random() < 0.05) await core.q(`delete from login_attempts where at < now() - interval '7 days'`);
      if (!good) return core.send(res, 401, { ok: false, error: 'invalid', remaining: Math.max(0, 4 - perIp) });
      await core.issueSession(res, { temp: pw.temp, remember: b.remember !== false });
      return core.send(res, 200, { ok: true, mustChange: pw.temp });
    }

    if (b.op === 'logout') { core.clearSession(res); return core.send(res, 200, { ok: true }); }

    // everything below requires a valid session
    const s = await core.currentSession(req);
    if (!s) return core.send(res, 401, { ok: false, error: 'signed_out' });

    if (b.op === 'logout_all') {
      await core.setSetting('session_version', (await core.sessionVersion()) + 1);
      core.clearSession(res);
      return core.send(res, 200, { ok: true });
    }
    if (b.op === 'password') {
      const next = String(b.next ?? '');
      // a temporary sign-in already proved the temporary password; otherwise re-check the current one
      if (!s.temp && !(await core.verifyPassword(str(b.current, 200))).ok) return core.send(res, 400, { ok: false, error: 'wrong_password' });
      if (next.length < 12 || next.length > 200) return core.send(res, 400, { ok: false, error: 'weak_password' });
      if (next === process.env.ADMIN_PASSWORD) return core.send(res, 400, { ok: false, error: 'same_as_temp' });
      await core.storePassword(next);
      await core.setSetting('session_version', (await core.sessionVersion()) + 1); // sign out other devices
      await core.issueSession(res, { remember: s.rem !== false }); // this device stays signed in, now fully
      return core.send(res, 200, { ok: true });
    }
    if (s.temp) return core.send(res, 403, { ok: false, error: 'must_change_password' });
    if (b.op === 'profile') {
      const p = { name: str(b.name, 60) || DEFAULT_PROFILE.name, title: str(b.title, 80), phone: str(b.phone, 30) };
      await core.setSetting('profile', p);
      return core.send(res, 200, { ok: true, profile: p });
    }
    return core.send(res, 400, { ok: false, error: 'unknown_op' });
  } catch (e) {
    console.error('auth error', e);
    return core.send(res, 500, { ok: false, error: 'server' });
  }
};
