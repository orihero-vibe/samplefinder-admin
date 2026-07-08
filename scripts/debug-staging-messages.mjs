// READ-ONLY: dump the staging FCM provider state and the most recent messages, so we can
// tell whether the failure you see is FRESH (after the credential update) or a stale log,
// and whether Appwrite actually holds the credential now.
//
// Required env: APPWRITE_STAGING_WRITE_KEY (or APPWRITE_STAGING_KEY) — messaging.read
//   node scripts/debug-staging-messages.mjs
import { Client, Messaging, Query } from 'node-appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const STAGING_PROJECT_ID = '6a0ad92e0001d5e515ce';
const FCM_PROVIDER_ID = '69cac0a30038ed1a7b92';

const key = process.env.APPWRITE_STAGING_WRITE_KEY || process.env.APPWRITE_STAGING_KEY;
if (!key) { console.error('Set APPWRITE_STAGING_WRITE_KEY and re-run.'); process.exit(1); }

const client = new Client().setEndpoint(ENDPOINT).setProject(STAGING_PROJECT_ID).setKey(key);
const messaging = new Messaging(client);

const prov = await messaging.getProvider({ providerId: FCM_PROVIDER_ID });
console.log('=== Provider (full, secrets are never returned) ===');
console.log(JSON.stringify(prov, null, 2));
console.log(`\nProvider $updatedAt: ${prov.$updatedAt}   (the credential-set ran just before this)`);

const msgs = await messaging.listMessages({ queries: [Query.orderDesc('$createdAt'), Query.limit(5)] });
console.log(`\n=== Most recent messages (${msgs.total} total) ===`);
for (const m of msgs.messages) {
  const fresh = m.$createdAt > prov.$updatedAt ? 'AFTER credential update' : 'before credential update (stale)';
  console.log(`- $id=${m.$id}`);
  console.log(`    createdAt=${m.$createdAt}  (${fresh})`);
  console.log(`    status=${m.status}  deliveredTotal=${m.deliveredTotal}`);
  if (m.deliveryErrors?.length) console.log(`    deliveryErrors=${JSON.stringify(m.deliveryErrors)}`);
}
console.log('\nRead: if the newest FAILED message is "AFTER credential update", the credential genuinely');
console.log('is not being used at send time -> next step is delete + recreate the provider with the same id.');
console.log('If the only failures are "stale", the fix already worked — send one truly new push to confirm.');
