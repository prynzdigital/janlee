// GET  /api/data -> all CRM records (leads, clients, projects, activities, tasks, files)
// POST /api/data { op: 'insert'|'update'|'delete', table, id?, row? }
// Only whitelisted tables/columns are accepted; every value is a bound parameter.
const core = require('../lib/core.js');
const { del } = require('@vercel/blob');

const COLS = {
  leads: ['name', 'email', 'phone', 'zip', 'project_type', 'message', 'source', 'stage', 'value', 'lost_reason', 'next_follow_up', 'client_id'],
  clients: ['name', 'email', 'phone', 'address', 'notes', 'lead_id'],
  projects: ['client_id', 'name', 'status', 'budget', 'start_date', 'target_date', 'completed_date', 'notes'],
  activities: ['kind', 'body', 'lead_id', 'client_id', 'project_id'],
  tasks: ['title', 'due_date', 'done', 'completed_at', 'lead_id', 'client_id', 'project_id'],
};
const TABLES = Object.keys(COLS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_COLS = 'id, created_at, name, content_type, size, lead_id, client_id, project_id';

function pick(table, row) {
  const out = {};
  for (const c of COLS[table]) if (row && Object.prototype.hasOwnProperty.call(row, c)) {
    let v = row[c];
    if (typeof v === 'string') { v = v.trim(); if (v === '') v = null; }
    if (v !== null && typeof v === 'object') v = null; // no nested objects
    if (c.endsWith('_id') && v !== null && !UUID.test(String(v))) throw Object.assign(new Error('bad id'), { status: 400 });
    out[c] = v;
  }
  return out;
}

// blobs that will be orphaned when a record (and its cascade) is deleted
async function blobsFor(table, id) {
  if (table === 'leads') return core.q('select blob_url from files where lead_id = $1', [id]);
  if (table === 'projects') return core.q('select blob_url from files where project_id = $1', [id]);
  if (table === 'clients') return core.q('select blob_url from files where client_id = $1 or project_id in (select id from projects where client_id = $1)', [id]);
  return [];
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (!(await core.requireAuth(req, res))) return;
      const [leads, clients, projects, activities, tasks, files] = await Promise.all([
        ...TABLES.map(t => core.q(`select * from ${t} order by created_at desc limit 5000`)),
        core.q(`select ${FILE_COLS} from files order by created_at desc limit 5000`),
      ]);
      return core.send(res, 200, { ok: true, leads, clients, projects, activities, tasks, files });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return core.send(res, 405, { ok: false }); }
    if (!(await core.requireAuth(req, res, { write: true }))) return;

    const { op, table, id, row } = core.body(req);
    if (!TABLES.includes(table)) return core.send(res, 400, { ok: false, error: 'bad_table' });
    if (op !== 'insert' && !UUID.test(String(id))) return core.send(res, 400, { ok: false, error: 'bad_id' });

    if (op === 'insert') {
      const data = pick(table, row);
      const cols = Object.keys(data);
      if (!cols.length) return core.send(res, 400, { ok: false, error: 'empty' });
      const r = await core.q(`insert into ${table} (${cols.join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, cols.map(c => data[c]));
      return core.send(res, 200, { ok: true, row: r[0] });
    }
    if (op === 'update') {
      const data = pick(table, row);
      const cols = Object.keys(data);
      if (!cols.length) return core.send(res, 400, { ok: false, error: 'empty' });
      const r = await core.q(`update ${table} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} where id = $${cols.length + 1} returning *`, [...cols.map(c => data[c]), id]);
      if (!r[0]) return core.send(res, 404, { ok: false, error: 'not_found' });
      return core.send(res, 200, { ok: true, row: r[0] });
    }
    if (op === 'delete') {
      const blobs = await blobsFor(table, id);
      await core.q(`delete from ${table} where id = $1`, [id]);
      if (blobs.length && process.env.BLOB_READ_WRITE_TOKEN) await del(blobs.map(b => b.blob_url)).catch(e => console.error('blob cleanup', e));
      return core.send(res, 200, { ok: true });
    }
    return core.send(res, 400, { ok: false, error: 'unknown_op' });
  } catch (e) {
    const status = e.status || (/violates (check|foreign key|not-null)/.test(e.message) ? 400 : 500);
    if (status === 500) console.error('data error', e);
    return core.send(res, status, { ok: false, error: status === 400 ? 'invalid' : 'server' });
  }
};
