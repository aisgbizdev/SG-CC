// Reliable dev loader: reads JSON backups and inserts via json_populate_record.
// Runs against dev DATABASE_URL with node-postgres (non-durable, persistent).
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
// FK-safe order
const ORDER = [
  'companies', 'branches', 'users', 'master_categories',
  'cases',            // from cases_base.json (attachments filled separately)
  'activities', 'case_updates', 'case_meetings', 'tasks',
  'announcements', 'announcement_reads', 'comments', 'messages',
  'audit_logs', 'kpi_assessments', 'push_subscriptions', 'read_receipts',
  'notifications', 'session',
];
const FILE = { cases: 'cases_base.json' };

function loadJson(t) {
  const f = path.join(DIR, FILE[t] || `${t}.json`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query('SET session_replication_role = replica'); // defer FK checks during load
    await c.query(`TRUNCATE ${ORDER.join(', ')} RESTART IDENTITY CASCADE`);

    const summary = {};
    for (const t of ORDER) {
      const rows = loadJson(t);
      let ok = 0;
      // batch inserts of ~200 rows using a VALUES list of json params
      const BATCH = 200;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const placeholders = slice.map((_, k) => `($${k + 1}::json)`).join(',');
        const sql = `INSERT INTO ${t} OVERRIDING SYSTEM VALUE SELECT (jpr).* FROM (
                       SELECT json_populate_record(null::${t}, j) AS jpr
                       FROM (VALUES ${placeholders}) v(j)
                     ) s`;
        await c.query(sql, slice.map(r => JSON.stringify(r)));
        ok += slice.length;
      }
      // fix sequence if table has integer id
      const hasId = rows.length && Object.prototype.hasOwnProperty.call(rows[0], 'id') && typeof rows[0].id === 'number';
      if (hasId) {
        await c.query(`SELECT setval(pg_get_serial_sequence('${t}','id'), GREATEST((SELECT MAX(id) FROM ${t}), 1))`);
      }
      summary[t] = ok;
      console.log(`${t}: ${ok}`);
    }
    await c.query('SET session_replication_role = origin');
    console.log('DONE', JSON.stringify(summary));
  } finally {
    await c.end();
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
