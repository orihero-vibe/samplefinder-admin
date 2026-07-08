// READ-ONLY: verify a Firebase service-account JSON is a usable FCM v1 credential,
// independently of Appwrite. Sends nothing real — uses FCM validate_only (dry run).
//
// This isolates the failing layer: if this passes but Appwrite still errors, the JSON
// is fine and the problem is how it was pasted into the provider; if this fails with the
// same "missing OAuth2 credential", the JSON itself is the wrong/invalid file.
//
//   node scripts/verify-fcm-service-account.mjs <path-to-service-account.json>
// Optional env:
//   FCM_TEST_TOKEN — an FCM registration token to validate (defaults to the failing staging token)
import crypto from 'node:crypto';
import fs from 'node:fs';

const EXPECTED_PROJECT = 'simplefinder-29ed7';
const DEFAULT_TEST_TOKEN =
  'dc0O9iPJ109YrVHSneOpN5:APA91bFjxoepTnRZ96KUtMdE19Y6nbHZHnMJMSk7rV9xlW2FQW5LRRrK748JBx1AqV4zjw8ABhZFVHbn1y2tlhuQFMsQaORdiMQJC8_fCvfQV1aVuZ0ueR4';

const path = process.argv[2] || process.env.SA_JSON_PATH;
if (!path) {
  console.error('Usage: node scripts/verify-fcm-service-account.mjs <path-to-service-account.json>');
  process.exit(1);
}

let sa;
try {
  sa = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`❌ Could not read/parse ${path}: ${e.message}`);
  process.exit(1);
}

// Shape check — catches "pasted google-services.json / client config instead of the SA key".
const missing = ['type', 'project_id', 'private_key', 'client_email'].filter((k) => !sa[k]);
if (sa.type !== 'service_account' || missing.length) {
  console.error('❌ This is NOT a service-account key.');
  console.error(`   type=${JSON.stringify(sa.type)} ; missing fields: ${missing.join(', ') || '(none)'}`);
  if (sa.project_info || sa.client || sa.api_key) console.error('   -> Looks like google-services.json (client config). Wrong file.');
  process.exit(1);
}
console.log(`Service account: ${sa.client_email}`);
console.log(`project_id     : ${sa.project_id}${sa.project_id === EXPECTED_PROJECT ? ' ✅' : ` ⚠️  expected ${EXPECTED_PROJECT}`}`);

const b64url = (x) => Buffer.from(x).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const jwtInput =
  `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
  b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
const signer = crypto.createSign('RSA-SHA256');
signer.update(jwtInput);
signer.end();
const jwt = `${jwtInput}.${b64url(signer.sign(sa.private_key))}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
});
const tokenJson = await tokenRes.json();
if (!tokenRes.ok) {
  console.error(`\n❌ OAuth2 token exchange FAILED (${tokenRes.status}) — the JSON cannot authenticate to Google:`);
  console.error('   ', JSON.stringify(tokenJson));
  console.error('   This is the same failure Appwrite hits. Regenerate the key / use the correct project.');
  process.exit(1);
}
console.log('\n✅ Minted an OAuth2 access token — the service account itself is valid.');

const token = process.env.FCM_TEST_TOKEN || DEFAULT_TEST_TOKEN;
const sendRes = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ validate_only: true, message: { token, notification: { title: 'test', body: 'test' } } }),
});
const sendJson = await sendRes.json();
if (sendRes.ok) {
  console.log(`✅ FCM validate_only OK for ${sa.project_id}. Credential + token + FCM API all good.`);
  console.log('   => Paste THIS exact file into the "Staging FCM" provider; if Appwrite still fails, it was a paste/format issue.');
} else {
  const status = sendJson?.error?.status;
  console.log(`\nFCM validate_only returned ${sendRes.status} (${status}):`);
  console.log('   ', JSON.stringify(sendJson?.error ?? sendJson));
  if (status === 'PERMISSION_DENIED') console.log('   -> API not enabled on the project, or the SA lacks the messaging role.');
  if (status === 'NOT_FOUND' || status === 'INVALID_ARGUMENT') console.log('   -> Credential is fine; the TOKEN is stale/unregistered. Get a fresh token from the app.');
}
