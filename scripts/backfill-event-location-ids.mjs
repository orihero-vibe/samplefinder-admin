/**
 * Backfill events.locationId from locationName + city when locationId is empty.
 * Requires a server API key with rows.read and rows.write on the events and locations tables.
 *
 * Usage (from samplefinder-admin):
 *   APPWRITE_API_KEY=... node scripts/backfill-event-location-ids.mjs --dry-run
 *   APPWRITE_API_KEY=... node scripts/backfill-event-location-ids.mjs
 *
 * Loads VITE_* vars from .env when present (same as the Vite admin app).
 */
import { Client, TablesDB, Query } from 'node-appwrite';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '../.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '69217af50038b9005a61';
const eventsTable = process.env.VITE_APPWRITE_COLLECTION_EVENTS || 'events';
const locationsTable = process.env.VITE_APPWRITE_COLLECTION_LOCATIONS || 'locations';

const DRY_RUN = process.argv.includes('--dry-run');

if (!endpoint || !projectId || !apiKey) {
  console.error(
    'Set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY (optionally in .env).'
  );
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);

function parseLocationId(ev) {
  const raw = ev.locationId;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') return raw.trim() || null;
  if (typeof raw === 'object' && raw !== null && '$id' in raw) return String(raw.$id);
  return null;
}

async function main() {
  const locRes = await tablesDB.listRows({
    databaseId,
    tableId: locationsTable,
    queries: [Query.limit(5000)],
  });

  const byName = new Map();
  for (const loc of locRes.rows || []) {
    const key = (loc.name || '').toLowerCase().trim();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(loc);
  }

  let offset = 0;
  const page = 100;
  let updated = 0;

  for (;;) {
    const evRes = await tablesDB.listRows({
      databaseId,
      tableId: eventsTable,
      queries: [Query.limit(page), Query.offset(offset)],
    });
    const rows = evRes.rows || [];
    if (rows.length === 0) break;

    for (const ev of rows) {
      if (parseLocationId(ev)) continue;
      const name = (ev.locationName || '').toLowerCase().trim();
      if (!name) continue;
      const candidates = byName.get(name);
      if (!candidates?.length) continue;

      let pick = candidates[0];
      if (candidates.length > 1) {
        const city = (ev.city || '').toLowerCase().trim();
        const match = candidates.find((c) => !city || (c.city || '').toLowerCase().trim() === city);
        if (match) pick = match;
      }

      if (DRY_RUN) {
        console.log(`[dry-run] ${ev.$id} -> locationId ${pick.$id} (${pick.name})`);
        updated++;
        continue;
      }

      await tablesDB.updateRow({
        databaseId,
        tableId: eventsTable,
        rowId: ev.$id,
        data: { locationId: pick.$id },
      });
      console.log(`Updated ${ev.$id} -> ${pick.$id}`);
      updated++;
    }

    if (rows.length < page) break;
    offset += page;
  }

  console.log(
    DRY_RUN ? `Dry run: would update ${updated} event(s).` : `Done. Updated ${updated} event(s).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
