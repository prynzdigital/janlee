// Team management (admins only)
//   GET  /api/users -> { owner, users[] }
//   POST /api/users { op: 'create', name, email, role }            -> { user, tempPassword }  (shown once)
//                   { op: 'update', id, name?, role?, active? }
//                   { op: 'reset_password', id }                    -> { tempPassword }
//                   { op: 'delete', id }
const core = require('../lib/core.js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const ROLES = ['admin', 'staff'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const PUBLIC = 'id, created_at, email, name, title, role, active, must_change, last_login_at, created_by';

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const s = await core.requireAuth(req, res, { admin: true }); if (!s) return;
      const users = await core.q(`select ${PUBLIC} from users order by created_at`);
      const prof = (await core.getSetting('profile')) || {};
      return core.send(res, 200, { ok: true, owner: { email: core.ADMIN_EMAIL(), name: prof.name || 'JanLee' }, users, me: s.uid });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return core.send(res, 405, { ok: false }); }
    const s = await core.requireAuth(req, res, { write: true, admin: true }); if (!s) return;
    const b = core.body(req);

    if (b.op === 'create') {
      const name = str(b.name, 80), email = str(b.email, 254).toLowerCase(), role = ROLES.includes(b.role) ? b.role : 'staff';
      if (!name) return core.send(res, 400, { ok: false, error: 'name_required' });
      if (!EMAIL.test(email)) return core.send(res, 400, { ok: false, error: 'bad_email' });
      if (email === core.ADMIN_EMAIL()) return core.send(res, 409, { ok: false, error: 'email_taken' });
      const [{ n }] = await core.q('select count(*)::int n from users');
      if (n >= 25) return core.send(res, 400, { ok: false, error: 'too_many_users' });
      const temp = core.tempPassword(), h = await core.hashPassword(temp);
      try {
        const [user] = await core.q(`insert into users (email, name, role, salt, hash, must_change, created_by) values ($1, $2, $3, $4, $5, true, $6) returning ${PUBLIC}`,
          [email, name, role, h.salt, h.hash, s.name || s.email]);
        return core.send(res, 200, { ok: true, user, tempPassword: temp });
      } catch (e) {
        if (/users_email_uidx|duplicate key/.test(e.message)) return core.send(res, 409, { ok: false, error: 'email_taken' });
        throw e;
      }
    }

    if (!UUID.test(String(b.id))) return core.send(res, 400, { ok: false, error: 'bad_id' });
    if (b.id === s.uid && b.op !== 'update') return core.send(res, 400, { ok: false, error: 'not_on_self' });

    if (b.op === 'update') {
      const sets = [], vals = [];
      if (b.name !== undefined) { const v = str(b.name, 80); if (!v) return core.send(res, 400, { ok: false, error: 'name_required' }); vals.push(v); sets.push(`name = $${vals.length}`); }
      if (b.role !== undefined) {
        if (!ROLES.includes(b.role)) return core.send(res, 400, { ok: false, error: 'bad_role' });
        if (b.id === s.uid && b.role !== 'admin') return core.send(res, 400, { ok: false, error: 'not_on_self' }); // can't demote yourself
        vals.push(b.role); sets.push(`role = $${vals.length}`);
      }
      if (b.active !== undefined) {
        if (b.id === s.uid) return core.send(res, 400, { ok: false, error: 'not_on_self' });
        vals.push(!!b.active); sets.push(`active = $${vals.length}`);
        sets.push('session_version = session_version + 1'); // deactivating signs them out immediately
      }
      if (b.role !== undefined && !sets.some(x => x.startsWith('session_version'))) sets.push('session_version = session_version + 1'); // role change applies now
      if (!vals.length) return core.send(res, 400, { ok: false, error: 'empty' });
      vals.push(b.id);
      const [user] = await core.q(`update users set ${sets.join(', ')} where id = $${vals.length} returning ${PUBLIC}`, vals);
      if (!user) return core.send(res, 404, { ok: false, error: 'not_found' });
      return core.send(res, 200, { ok: true, user });
    }
    if (b.op === 'reset_password') {
      const temp = core.tempPassword(), h = await core.hashPassword(temp);
      const [user] = await core.q(`update users set salt = $1, hash = $2, must_change = true, session_version = session_version + 1 where id = $3 returning ${PUBLIC}`, [h.salt, h.hash, b.id]);
      if (!user) return core.send(res, 404, { ok: false, error: 'not_found' });
      return core.send(res, 200, { ok: true, user, tempPassword: temp });
    }
    if (b.op === 'delete') {
      const r = await core.q('delete from users where id = $1 returning id', [b.id]);
      if (!r.length) return core.send(res, 404, { ok: false, error: 'not_found' });
      return core.send(res, 200, { ok: true });
    }
    return core.send(res, 400, { ok: false, error: 'unknown_op' });
  } catch (e) {
    console.error('users error', e);
    return core.send(res, 500, { ok: false, error: 'server' });
  }
};
