// READ-ONLY diagnostic for staging push delivery. Writes nothing.
//
// Answers: which FCM providers exist in the staging project (id / enabled), and
// which providerId each of a user's push targets is actually bound to — so you can
// confirm the service-account JSON was pasted onto the SAME provider the device
// registered against (not a different, empty one).
//
// Required env:
//   APPWRITE_STAGING_KEY (or APPWRITE_STAGING_WRITE_KEY) — needs messaging.read + users.read
// Optional env:
//   STAGING_TEST_EMAIL — the account you tested push with (recommended)
//
//   node scripts/inspect-staging-push.mjs
import { Client, Messaging, Users, Query } from 'node-appwrite';

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const STAGING_PROJECT_ID = '6a0ad92e0001d5e515ce';
// The provider id the app falls back to when EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID is unset
// (DEFAULT_FCM_PROVIDER_ID in samplefinder-app/src/lib/notifications.ts) — i.e. the PROD provider.
const APP_DEFAULT_FCM_PROVIDER_ID = '69cac0a30038ed1a7b92';

const key = process.env.APPWRITE_STAGING_KEY || process.env.APPWRITE_STAGING_WRITE_KEY;
if (!key) {
  console.error('Set APPWRITE_STAGING_KEY (messaging.read + users.read) and re-run.');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(STAGING_PROJECT_ID).setKey(key);
const messaging = new Messaging(client);
const users = new Users(client);

const providers = await messaging.listProviders();
console.log(`\nProviders in staging (${providers.total}):`);
const byId = new Map();
for (const p of providers.providers) {
  byId.set(p.$id, p);
  console.log(`  - $id=${p.$id}  name="${p.name}"  provider=${p.provider}  type=${p.type}  enabled=${p.enabled}`);
}

console.log(`\nApp default FCM provider id (used when EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID is unset): ${APP_DEFAULT_FCM_PROVIDER_ID}`);
const def = byId.get(APP_DEFAULT_FCM_PROVIDER_ID);
console.log(def
  ? `  -> present in staging (enabled=${def.enabled}, provider=${def.provider}) — targets default here`
  : '  -> NOT present in staging (so targets could not have registered against the default)');

const email = (process.env.STAGING_TEST_EMAIL || '').trim().toLowerCase();
if (email) {
  const found = await users.list({ queries: [Query.equal('email', [email])] });
  if (found.total === 0) {
    console.log(`\nNo staging user found for ${email}.`);
  } else {
    const u = found.users[0];
    const targets = await users.listTargets({ userId: u.$id });
    const push = targets.targets.filter((t) => t.providerType === 'push');
    console.log(`\nPush targets for ${email} (${push.length}):`);
    for (const t of push) {
      const prov = byId.get(t.providerId);
      const verdict = !t.providerId ? '❌ target has NO providerId'
        : !prov ? `❌ bound to providerId ${t.providerId} which is NOT in the project (orphan)`
        : !prov.enabled ? `⚠️  bound to provider ${t.providerId} but it is DISABLED`
        : `✅ bound to enabled provider ${t.providerId} — this is the one that must hold the service-account JSON`;
      console.log(`  - $id=${t.$id}  providerId=${t.providerId || '(none)'}  token=${(t.identifier || '').slice(0, 20)}…  ${verdict}`);
    }
  }
} else {
  console.log('\n(Set STAGING_TEST_EMAIL to also see which provider your test device is bound to.)');
}

console.log('\nNote: Appwrite never returns a stored service-account secret, so this cannot verify the JSON');
console.log('itself is valid — only which provider the target uses. Confirm in the console that the JSON');
console.log('pasted there has "type": "service_account" and a "private_key" (it must NOT be google-services.json).');
