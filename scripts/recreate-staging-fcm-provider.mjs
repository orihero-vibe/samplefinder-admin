// Delete + recreate the "Staging FCM" provider with the SAME id, setting the service-account
// credential at creation time. This forces Appwrite's messaging worker to re-initialize the
// credential — the workaround for "updated the FCM service account but sends still go out with
// no OAuth2 token" (getProvider shows the credential, yet delivery fails unauthenticated).
//
// Same id => existing push targets keep matching. Deleting a provider may drop its targets;
// re-open the staging app afterwards so the device re-registers before you test.
//
// Required env: APPWRITE_STAGING_WRITE_KEY (or APPWRITE_STAGING_KEY) — messaging.write
//   node scripts/recreate-staging-fcm-provider.mjs <path-to-service-account.json>
import fs from 'node:fs';
import { Client, Messaging } from 'node-appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const STAGING_PROJECT_ID = '6a0ad92e0001d5e515ce';
const PROD_PROJECT_ID = '691d4a54003b21bf0136';
const FCM_PROVIDER_ID = '69cac0a30038ed1a7b92';
const PROVIDER_NAME = 'Staging FCM';
const EXPECTED_FIREBASE_PROJECT = 'simplefinder-29ed7';

if (STAGING_PROJECT_ID === PROD_PROJECT_ID) throw new Error('Staging == prod project id — refusing to run.');

const path = process.argv[2] || process.env.SA_JSON_PATH;
if (!path) { console.error('Usage: node scripts/recreate-staging-fcm-provider.mjs <path-to-service-account.json>'); process.exit(1); }
const key = process.env.APPWRITE_STAGING_WRITE_KEY || process.env.APPWRITE_STAGING_KEY;
if (!key) { console.error('Set APPWRITE_STAGING_WRITE_KEY (messaging.write) and re-run.'); process.exit(1); }

let sa;
try { sa = JSON.parse(fs.readFileSync(path, 'utf8')); }
catch (e) { console.error(`Could not read/parse ${path}: ${e.message}`); process.exit(1); }
if (sa.type !== 'service_account' || !sa.private_key || sa.project_id !== EXPECTED_FIREBASE_PROJECT) {
  console.error(`Bad service account (need type:service_account, private_key, project_id=${EXPECTED_FIREBASE_PROJECT}).`);
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(STAGING_PROJECT_ID).setKey(key);
const messaging = new Messaging(client);

try {
  await messaging.deleteProvider({ providerId: FCM_PROVIDER_ID });
  console.log(`Deleted old provider ${FCM_PROVIDER_ID}.`);
} catch (e) {
  console.log(`Delete skipped (${e.message || e.code}).`);
}

const created = await messaging.createFCMProvider({
  providerId: FCM_PROVIDER_ID,
  name: PROVIDER_NAME,
  serviceAccountJSON: sa,
  enabled: true,
});
console.log('\n✅ Recreated provider.');
console.log(`   $id=${created.$id}  name="${created.name}"  provider=${created.provider}  enabled=${created.enabled}`);
console.log('\nNext: re-open the STAGING app on the device (so it re-registers its push target),');
console.log('then send a NEW push from the admin panel and check the new message status.');
