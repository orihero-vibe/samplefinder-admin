// Set the "Staging FCM" provider's service-account credential via the API, using the
// exact JSON file that passed scripts/verify-fcm-service-account.mjs. This removes the
// manual copy-paste as a variable (partial paste / format / didn't-save).
//
// Required env:
//   APPWRITE_STAGING_WRITE_KEY (or APPWRITE_STAGING_KEY) — needs messaging.write (providers.write)
//
//   node scripts/set-staging-fcm-credential.mjs <path-to-service-account.json>
import fs from 'node:fs';
import { Client, Messaging } from 'node-appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const STAGING_PROJECT_ID = '6a0ad92e0001d5e515ce';
const PROD_PROJECT_ID = '691d4a54003b21bf0136';
const FCM_PROVIDER_ID = '69cac0a30038ed1a7b92'; // "Staging FCM" (from inspect-staging-push.mjs)
const EXPECTED_FIREBASE_PROJECT = 'simplefinder-29ed7';

if (STAGING_PROJECT_ID === PROD_PROJECT_ID) throw new Error('Staging == prod project id — refusing to run.');

const path = process.argv[2] || process.env.SA_JSON_PATH;
if (!path) {
  console.error('Usage: node scripts/set-staging-fcm-credential.mjs <path-to-service-account.json>');
  process.exit(1);
}
const key = process.env.APPWRITE_STAGING_WRITE_KEY || process.env.APPWRITE_STAGING_KEY;
if (!key) {
  console.error('Set APPWRITE_STAGING_WRITE_KEY (messaging.write) and re-run.');
  process.exit(1);
}

let sa;
try {
  sa = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`Could not read/parse ${path}: ${e.message}`);
  process.exit(1);
}
if (sa.type !== 'service_account' || !sa.private_key || !sa.client_email) {
  console.error('This is not a service-account key (need type:"service_account", private_key, client_email). Wrong file.');
  process.exit(1);
}
if (sa.project_id !== EXPECTED_FIREBASE_PROJECT) {
  console.error(`Refusing: service account is for project "${sa.project_id}", expected "${EXPECTED_FIREBASE_PROJECT}".`);
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(STAGING_PROJECT_ID).setKey(key);
const messaging = new Messaging(client);

console.log(`Setting FCM credential on staging provider ${FCM_PROVIDER_ID}`);
console.log(`  service account: ${sa.client_email} (project ${sa.project_id})`);

// serviceAccountJSON expects a parsed object, not a string (node-appwrite v24).
const provider = await messaging.updateFCMProvider({
  providerId: FCM_PROVIDER_ID,
  enabled: true,
  serviceAccountJSON: sa,
});

console.log('\n✅ Provider updated.');
console.log(`   $id=${provider.$id}  name="${provider.name}"  provider=${provider.provider}  enabled=${provider.enabled}`);
console.log('\nNow send a NEW test push (do not hit Retry on the old message) and check the new message\'s status.');
