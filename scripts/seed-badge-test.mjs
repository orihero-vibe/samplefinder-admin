/**
 * Seed fake check-in or review rows so a test user is sitting at exactly N-1
 * before a badge milestone.  After running this script, one real check-in or
 * review from the app will cross the threshold and fire the badge popup + push.
 *
 * Requires a server API key with rows.read and rows.write on the target table.
 *
 * Usage (from samplefinder-admin):
 *
 *   # Set count to 9 so next real check-in triggers milestone 10
 *   APPWRITE_API_KEY=... node scripts/seed-badge-test.mjs --user <profileId> --type checkin --milestone 10
 *
 *   # Set review count to 24 so next review triggers milestone 25
 *   APPWRITE_API_KEY=... node scripts/seed-badge-test.mjs --user <profileId> --type review --milestone 25
 *
 *   # Remove all seeded fake rows for a user (cleanup)
 *   APPWRITE_API_KEY=... node scripts/seed-badge-test.mjs --user <profileId> --type checkin --cleanup
 *
 *   # Dry run (shows what would happen without writing)
 *   APPWRITE_API_KEY=... node scripts/seed-badge-test.mjs --user <profileId> --type checkin --milestone 10 --dry-run
 *
 * The user <profileId> is the Appwrite document ID from the user_profiles table
 * (visible in the admin UI under Users → select a user → copy the document ID).
 *
 * Env vars loaded from .env if present (VITE_* naming matches the admin app).
 */
import { Client, TablesDB, ID, Query, Permission, Role } from 'node-appwrite';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── env loading ─────────────────────────────────────────────────────────────

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

const endpoint   = process.env.VITE_APPWRITE_ENDPOINT  || process.env.APPWRITE_ENDPOINT;
const projectId  = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey     = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '';

const CHECKINS_TABLE = process.env.VITE_APPWRITE_COLLECTION_CHECKINS
  || process.env.APPWRITE_CHECKINS_TABLE_ID
  || 'checkins';

const REVIEWS_TABLE  = process.env.VITE_APPWRITE_COLLECTION_REVIEWS
  || process.env.APPWRITE_REVIEWS_TABLE_ID
  || 'reviews';

const USER_PROFILES_TABLE = process.env.VITE_APPWRITE_COLLECTION_USER_PROFILES
  || process.env.APPWRITE_USER_PROFILES_TABLE_ID
  || 'user_profiles';

// Badge milestone thresholds — must match src/constants/Badges.ts
const BADGE_THRESHOLDS = [10, 25, 50, 100, 250];

// Tag written on every fake row so we can clean them up later
const SEED_TAG = '__seed_badge_test__';

// ─── CLI args ─────────────────────────────────────────────────────────────────

function arg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const userId    = arg('--user');
const typeArg   = arg('--type');           // 'checkin' | 'review'
const milestone = arg('--milestone');      // '10' | '25' | '50' | '100' | '250'
const CLEANUP   = process.argv.includes('--cleanup');
const DRY_RUN   = process.argv.includes('--dry-run');

// ─── validation ──────────────────────────────────────────────────────────────

if (!endpoint || !projectId || !apiKey || !databaseId) {
  console.error(
    'Missing config. Set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, ' +
    'VITE_APPWRITE_DATABASE_ID and APPWRITE_API_KEY (optionally in .env).'
  );
  process.exit(1);
}

if (!userId) {
  console.error('Pass --user <profileDocumentId>');
  process.exit(1);
}

if (!typeArg || !['checkin', 'review'].includes(typeArg)) {
  console.error('Pass --type checkin  or  --type review');
  process.exit(1);
}

if (!CLEANUP && !milestone) {
  console.error('Pass --milestone <10|25|50|100|250>  or  --cleanup');
  process.exit(1);
}

if (!CLEANUP && !BADGE_THRESHOLDS.includes(Number(milestone))) {
  console.error(`--milestone must be one of ${BADGE_THRESHOLDS.join(', ')}`);
  process.exit(1);
}

const tableId    = typeArg === 'checkin' ? CHECKINS_TABLE : REVIEWS_TABLE;
const targetCount = CLEANUP ? 0 : Number(milestone) - 1;  // we want N-1 rows total

// ─── Appwrite client ──────────────────────────────────────────────────────────

const client  = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);

// ─── helpers ─────────────────────────────────────────────────────────────────

async function listAllRows(tableId, queries = []) {
  const rows = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const res = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [...queries, Query.limit(limit), Query.offset(offset)],
    });
    const page = res.rows || [];
    rows.push(...page);
    if (page.length < limit) break;
    offset += page.length;
  }
  return rows;
}

function isFakeRow(row) {
  // Fake rows store the seed tag in the 'review' text field (reviews)
  // or in the 'points' field being 0 combined with event ID starting with 'seed_'
  // We detect them by the event field being a string that starts with 'seed_'
  const eventId = typeof row.event === 'string' ? row.event : row.event?.$id ?? '';
  return eventId.startsWith('seed_');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch the user profile to get authID (needed for row permissions)
  console.log(`Fetching user profile: ${userId}`);
  const profile = await tablesDB.getRow({
    databaseId,
    tableId: USER_PROFILES_TABLE,
    rowId: userId,
  });

  if (!profile) {
    console.error('User profile not found. Check --user value.');
    process.exit(1);
  }

  const authId = profile.authID;
  if (!authId) {
    console.error('Profile has no authID field.');
    process.exit(1);
  }

  console.log(`User profile found. authID: ${authId}`);

  // 2. Count all existing rows for this user
  const allRows = await listAllRows(tableId, [Query.equal('user', userId)]);
  const fakeRows = allRows.filter(isFakeRow);
  const realCount = allRows.length - fakeRows.length;

  console.log(`Current total rows: ${allRows.length}  (real: ${realCount}, seeded: ${fakeRows.length})`);

  // ── CLEANUP mode ────────────────────────────────────────────────────────────
  if (CLEANUP) {
    if (fakeRows.length === 0) {
      console.log('No seeded rows to remove.');
      return;
    }
    console.log(`Removing ${fakeRows.length} seeded rows...`);
    for (const row of fakeRows) {
      if (DRY_RUN) {
        console.log(`  [dry-run] would delete ${row.$id}`);
        continue;
      }
      await tablesDB.deleteRow({ databaseId, tableId, rowId: row.$id });
      console.log(`  Deleted ${row.$id}`);
    }
    console.log(DRY_RUN ? 'Dry run complete.' : 'Cleanup done.');
    return;
  }

  // ── SEED mode ───────────────────────────────────────────────────────────────

  // How many total rows (real + fake) do we need?
  // We want totalCount = targetCount so that the *next* real action makes it targetCount+1
  // and crosses the milestone.
  const currentTotal = allRows.length;

  if (currentTotal > targetCount) {
    console.log(
      `\nTotal row count (${currentTotal}) is already above target (${targetCount}).` +
      `\nRun with --cleanup first to remove seeded rows, then re-run.`
    );
    process.exit(1);
  }

  if (currentTotal === targetCount) {
    console.log(`\nAlready at ${targetCount} rows — one real ${typeArg} will hit milestone ${milestone}. Nothing to do.`);
    return;
  }

  const toInsert = targetCount - currentTotal;
  console.log(`\nNeed to insert ${toInsert} fake row(s) to reach ${targetCount} total (milestone ${milestone} - 1).`);
  if (DRY_RUN) {
    console.log('[dry-run] No rows will be written.');
    return;
  }

  for (let i = 0; i < toInsert; i++) {
    const fakeEventId = `seed_${ID.unique()}`;
    const rowId = ID.unique();

    const data = typeArg === 'checkin'
      ? { user: userId, event: fakeEventId, points: 0 }
      : {
          user: userId,
          event: fakeEventId,
          review: `[seed] test row ${i + 1}`,
          rating: 5,
          liked: [],
          hasPurchased: false,
          pointsEarned: 0,
        };

    await tablesDB.createRow({
      databaseId,
      tableId,
      rowId,
      data,
      permissions: [
        Permission.read(Role.user(authId)),
        Permission.update(Role.user(authId)),
        Permission.delete(Role.user(authId)),
      ],
    });

    process.stdout.write(`  Inserted ${i + 1}/${toInsert}\r`);
  }

  console.log(`\n\nDone. User now has ${targetCount} total ${typeArg} rows.`);
  console.log(`→ Do ONE real ${typeArg} in the app to trigger the milestone ${milestone} badge notification.`);
  console.log(`→ Afterwards, run --cleanup to remove seeded rows before testing the next milestone.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
