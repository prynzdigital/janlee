// Files attached to leads, clients and projects, stored in Vercel Blob (private by default).
//   POST   /api/files?name=..&lead_id|client_id|project_id=..   body = raw file bytes (≤ 4 MB)
//   GET    /api/files?id=..[&download=1]                         streams the file (auth required)
//   DELETE /api/files?id=..
const crypto = require('node:crypto');
const core = require('../lib/core.js');
const { put, get, del, BlobAccessError } = require('@vercel/blob');

const MAX = 4 * 1024 * 1024; // Vercel function request limit is 4.5 MB
const TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
  'application/pdf': 'pdf',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeName = n => String(n || 'file').normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 120) || 'file';

function readRaw(req) {
  return new Promise((ok, no) => {
    // read the raw stream directly (never touch req.body, which would make Vercel buffer/parse it)
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX) { no(Object.assign(new Error('too_large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'https://x');
    const p = url.searchParams;
    if (!core.blobConfigured()) {
      if (!(await core.requireAuth(req, res))) return;
      return core.send(res, 503, { ok: false, error: 'blob_not_configured' });
    }

    if (req.method === 'GET') {
      if (!(await core.requireAuth(req, res))) return;
      if (!UUID.test(p.get('id') || '')) return core.send(res, 400, { ok: false, error: 'bad_id' });
      const [f] = await core.q('select * from files where id = $1', [p.get('id')]);
      if (!f) return core.send(res, 404, { ok: false, error: 'not_found' });
      const r = await get(f.blob_url, { access: f.access, ...core.blobAuth(req) });
      if (!r || r.statusCode !== 200) return core.send(res, 404, { ok: false, error: 'not_found' });
      const inline = !p.get('download') && /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(f.content_type);
      res.setHeader('Content-Type', f.content_type);
      res.setHeader('Content-Length', String(f.size));
      res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeName(f.name)}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
      res.status(200);
      const reader = r.stream.getReader();
      for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
      return res.end();
    }

    if (req.method === 'POST') {
      if (!(await core.requireAuth(req, res, { write: true }))) return;
      const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!TYPES[type]) return core.send(res, 415, { ok: false, error: 'type_not_allowed' });
      const ref = ['lead_id', 'client_id', 'project_id'].find(k => p.get(k));
      if (!ref || !UUID.test(p.get(ref))) return core.send(res, 400, { ok: false, error: 'bad_ref' });
      const buf = await readRaw(req);
      if (!buf.length) return core.send(res, 400, { ok: false, error: 'empty' });
      if (buf.length > MAX) return core.send(res, 413, { ok: false, error: 'too_large' });
      let name = safeName(p.get('name'));
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += '.' + TYPES[type];
      const pathname = `crm/${ref.replace('_id', '')}/${p.get(ref)}/${crypto.randomUUID()}-${name}`;
      let access = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private', blob;
      const auth = core.blobAuth(req);
      try { blob = await put(pathname, buf, { access, contentType: type, addRandomSuffix: true, ...auth }); }
      catch (e) {
        // the store was created as public: fall back (URLs stay unguessable and are only shown via this API)
        if (access === 'private' && (e instanceof BlobAccessError || /access/i.test(e.message))) { access = 'public'; blob = await put(pathname, buf, { access, contentType: type, addRandomSuffix: true, ...auth }); }
        else throw e;
      }
      const [row] = await core.q(
        `insert into files (name, content_type, size, blob_url, blob_pathname, access, ${ref}) values ($1, $2, $3, $4, $5, $6, $7)
         returning id, created_at, name, content_type, size, lead_id, client_id, project_id`,
        [String(p.get('name') || name).slice(0, 200), type, buf.length, blob.url, blob.pathname, access, p.get(ref)]);
      return core.send(res, 200, { ok: true, file: row });
    }

    if (req.method === 'DELETE') {
      if (!(await core.requireAuth(req, res, { write: true }))) return;
      if (!UUID.test(p.get('id') || '')) return core.send(res, 400, { ok: false, error: 'bad_id' });
      const [f] = await core.q('delete from files where id = $1 returning blob_url', [p.get('id')]);
      if (f) await del(f.blob_url, core.blobAuth(req)).catch(e => console.error('blob delete', e));
      return core.send(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return core.send(res, 405, { ok: false });
  } catch (e) {
    console.error('files error', e);
    return core.send(res, e.status || 500, { ok: false, error: e.status === 413 ? 'too_large' : 'server' });
  }
};
