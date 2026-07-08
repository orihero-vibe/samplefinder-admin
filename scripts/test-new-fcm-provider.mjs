// DECISIVE TEST: does a brand-new FCM provider (fresh id) in the staging project deliver?
// Temporarily repoints your existing push target to a new provider, sends to it, reads the
// result, then REVERTS the target and deletes the test provider. Baseline is restored either way.
//
//   new provider DELIVERS  -> id 69cac0a30038ed1a7b92 is wedged in Appwrite; switch staging to a new id.
//   new provider ALSO FAILS -> it's the staging PROJECT (Appwrite bug); file a support ticket.
//
// Required env: APPWRITE_STAGING_WRITE_KEY (messaging.write + users.write), STAGING_TEST_EMAIL
//   node scripts/test-new-fcm-provider.mjs <path-to-service-account.json>
import fs from 'node:fs';
import { Client, Messaging, Users, ID, Query } from 'node-appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const STAGING_PROJECT_ID = '6a0ad92e0001d5e515ce';
const EXPECTED_FIREBASE_PROJECT = 'simplefinder-29ed7';
const TEST_PROVIDER_NAME = 'Staging FCM (new-id test)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const path = process.argv[2] || process.env.SA_JSON_PATH;
const email = (process.env.STAGING_TEST_EMAIL || '').trim().toLowerCase();
const key = process.env.APPWRITE_STAGING_WRITE_KEY || process.env.APPWRITE_STAGING_KEY;
if (!path || !email || !key) { console.error('Need <service-account.json>, STAGING_TEST_EMAIL, APPWRITE_STAGING_WRITE_KEY.'); process.exit(1); }
const sa = JSON.parse(fs.readFileSync(path, 'utf8'));
if (sa.type !== 'service_account' || sa.project_id !== EXPECTED_FIREBASE_PROJECT) { console.error(`Bad service account for ${EXPECTED_FIREBASE_PROJECT}.`); process.exit(1); }

const client = new Client().setEndpoint(ENDPOINT).setProject(STAGING_PROJECT_ID).setKey(key);
const messaging = new Messaging(client);
const users = new Users(client);

// Clean up any leftover test providers from prior runs.
const all = await messaging.listProviders();
for (const p of all.providers) {
  if (p.name === TEST_PROVIDER_NAME) { try { await messaging.deleteProvider({ providerId: p.$id }); console.log(`Removed stale test provider ${p.$id}`); } catch {} }
}

const newProvider = await messaging.createFCMProvider({ providerId: ID.unique(), name: TEST_PROVIDER_NAME, serviceAccountJSON: sa, enabled: true });
console.log(`New provider: ${newProvider.$id} (enabled=${newProvider.enabled})`);

const found = await users.list({ queries: [Query.equal('email', [email])] });
if (found.total === 0) { console.error(`No user for ${email}`); process.exit(1); }
const userId = found.users[0].$id;
const targets = await users.listTargets({ userId });
const pushTarget = targets.targets.find((t) => t.providerType === 'push');
if (!pushTarget) { console.error('No push target — open the staging app to register one, then re-run.'); await messaging.deleteProvider({ providerId: newProvider.$id }); process.exit(1); }
const originalProviderId = pushTarget.providerId;
console.log(`Target ${pushTarget.$id}: currently provider ${originalProviderId} -> repointing to ${newProvider.$id} for the test.`);

await users.updateTarget({ userId, targetId: pushTarget.$id, providerId: newProvider.$id });

const messageId = ID.unique();
await messaging.createPush({ messageId, title: 'Staging new-id test', body: 'new provider delivery test', targets: [pushTarget.$id] });
console.log(`Sent ${messageId}; polling...`);

let msg;
for (let i = 0; i < 8; i++) { await sleep(2500); msg = await messaging.getMessage({ messageId }); if (msg.status === 'sent' || msg.status === 'failed') break; }
console.log(`\nstatus=${msg.status}  deliveredTotal=${msg.deliveredTotal}`);
if (msg.deliveryErrors?.length) console.log(`deliveryErrors=${JSON.stringify(msg.deliveryErrors)}`);
if (msg.status === 'sent' && msg.deliveredTotal > 0) {
  console.log('\n✅ NEW provider DELIVERED -> the id 69cac0a30038ed1a7b92 is the problem (wedged in Appwrite). Switch staging to a new provider id.');
} else {
  console.log('\n❌ NEW provider ALSO FAILED -> the staging PROJECT messaging is broken (Appwrite bug). File a ticket.');
}

// Restore baseline no matter what.
try { await users.updateTarget({ userId, targetId: pushTarget.$id, providerId: originalProviderId }); console.log(`\nReverted target to original provider ${originalProviderId}.`); }
catch (e) { console.log(`\nRevert failed (do it manually): target ${pushTarget.$id} -> provider ${originalProviderId}. ${e.message}`); }
try { await messaging.deleteProvider({ providerId: newProvider.$id }); console.log(`Deleted test provider ${newProvider.$id}.`); } catch {}
