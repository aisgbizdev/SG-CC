// Load attachment .bin files into dev cases via node-postgres (parameterized, handles large text).
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'case_attachments');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.bin'));
    let n = 0;
    for (const file of files) {
      const m = file.match(/^case_(\d+)_(case_documents|complaint_attachments)\.bin$/);
      if (!m) { console.log('skip', file); continue; }
      const id = parseInt(m[1]), col = m[2];
      const content = fs.readFileSync(path.join(DIR, file), 'utf8');
      await c.query(`UPDATE cases SET ${col} = $1 WHERE id = $2`, [content, id]);
      n++;
      if (n % 20 === 0) console.log('...', n);
    }
    console.log('loaded attachments:', n);
  } finally {
    await c.end();
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
