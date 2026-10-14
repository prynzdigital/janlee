// Applies db/schema.sql to the Neon database in DATABASE_URL.
//   DATABASE_URL=postgres://... npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first.'); process.exit(1); }

const sql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');
const pool = new Pool({ connectionString: url });
try {
  await pool.query(sql); // multi-statement script over a real (WebSocket) connection
  const { rows } = await pool.query(`select table_name from information_schema.tables where table_schema = 'public' order by 1`);
  console.log('Schema applied. Tables:', rows.map(r => r.table_name).join(', '));
} catch (e) {
  console.error('Migration failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
