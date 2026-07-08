# Staging Push — FCM "missing OAuth2 credential" Investigation

**Status:** UNRESOLVED — Appwrite-side bug. Investigated 2026-07-08.
**Scope:** STAGING Appwrite project only. **Production push works.**
**Pending decision:** file Appwrite support ticket (draft below) · or bypass Appwrite Messaging with direct FCM v1 · or park (prod works, so the release isn't blocked).

> Do **not** re-debug the credential/provider next time — that path is exhausted (see Evidence chain). Start from "Options to proceed".

---

## TL;DR

Every staging push fails with the Google error:

> Request is missing required authentication credential. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.

We proved the service account, provider, provider id, Firebase project, and FCM API are all valid and working (the same SA sends fine via a direct FCM v1 call; prod delivers using the same Firebase project + provider id). A brand-new provider with a fresh id fails identically, and both Appwrite projects are on the same plan. **The staging Appwrite project's Messaging worker is not attaching the OAuth2 bearer token when it calls FCM — an Appwrite Cloud defect scoped to this one project.**

---

## How push works here

1. App (`samplefinder-app`) obtains an **FCM device token** via `@react-native-firebase/messaging`.
2. App registers it as an Appwrite **push target**: `account.createPushTarget({ targetId, identifier: <fcm token>, providerId })` — `src/lib/notifications.ts`. `providerId = getFcmProviderId()` = env `EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID` **or** hardcoded default `69cac0a30038ed1a7b92`.
3. Admin **Notification function** (`appwrite/functions/Notification functions/src/main.ts`) calls `messaging.createPush(...)`.
4. **Appwrite Messaging** delivers to each target via that target's **FCM provider** (holds a Firebase **service-account JSON**), calling the **FCM HTTP v1 API** with an OAuth2 token minted from the SA.
5. FCM → APNs (iOS) / direct (Android).

**Failure is at step 4:** Appwrite calls FCM with no OAuth2 token.

---

## Key facts / IDs

| Thing | Value |
|---|---|
| Appwrite endpoint / version | `https://nyc.cloud.appwrite.io/v1` · Cloud **1.9.5** |
| Staging Appwrite project | `6a0ad92e0001d5e515ce` |
| Prod Appwrite project | `691d4a54003b21bf0136` |
| FCM provider id (both projects) | `69cac0a30038ed1a7b92` (name "Staging FCM") |
| Firebase project | `simplefinder-29ed7` (sender `569742468290`) |
| Service account | `firebase-adminsdk-fbsvc@simplefinder-29ed7.iam.gserviceaccount.com` (key id `4de6c8ed9b…`) |
| Bundles | prod `com.samplefinder.app` · staging `com.samplefinder.app.staging` |
| Test user / target | `tillo+1@bolderapps.com` · `push_ios_6a4deefb00155393e137` (iOS) |
| Failing message ids | `6a4e5fd1002d137619d9`, `6a4e8255002b5e731cd0` (+ earlier) |

Prod and staging are **separate Appwrite projects** sharing **one Firebase project** (`simplefinder-29ed7`). The staging FCM provider was deliberately created with the **same id** as prod's (matches the app's hardcoded default). Do **not** commit the SA private key anywhere.

---

## Evidence chain (what was tested)

| # | Test | Result | Rules out |
|---|---|---|---|
| 1 | SA mints Google OAuth2 token + FCM v1 `validate_only` on the real token (direct HTTP) | ✅ works | SA validity, token, FCM API enabled, GCP project |
| 2 | `getProvider` shows SA stored (private key present) + `enabled: true` | ✅ stored | "credential not saved" |
| 3 | Set SA via API (`updateFCMProvider`) → fresh push | ❌ same error | paste/format issue |
| 4 | Delete + recreate provider (same id), SA at creation → fresh push | ❌ same error | corrupted provider record |
| 5 | Brand-new provider, **different id**, same SA → fresh push | ❌ same error | provider id / id-keyed cache |
| 6 | **Prod** push (same Firebase project, provider id, SA type) | ✅ works | Firebase/GCP/global Appwrite |
| 7 | Staging vs prod **plan/tier** | same plan | plan gating |

Message `$createdAt` timestamps confirmed each failure was **after** the credential change (not stale logs).

**Not this error (but still real):** the staging iOS **APNs auth key** is missing in Firebase → Cloud Messaging for `com.samplefinder.app.staging`. That fails one layer later (FCM→APNs) with a *different*, APNs-specific error. Upload the **same `.p8` as prod** (APNs keys are per Apple team, not per bundle) so iOS is ready once the FCM-auth bug is resolved.

---

## Diagnostic scripts (`samplefinder-admin/scripts/`, uncommitted)

All need `APPWRITE_STAGING_WRITE_KEY`; some need `STAGING_TEST_EMAIL`.

| Script | Purpose |
|---|---|
| `inspect-staging-push.mjs` | List FCM providers + a user's push targets; show which provider each target is bound to |
| `verify-fcm-service-account.mjs <sa.json>` | Independently verify a SA JSON: mint OAuth token + FCM `validate_only` |
| `set-staging-fcm-credential.mjs <sa.json>` | Set the SA on the provider via API (no manual paste) |
| `recreate-staging-fcm-provider.mjs <sa.json>` | Delete + recreate the provider (same id) with SA at creation |
| `debug-staging-messages.mjs` | Dump provider + recent messages with timestamps + delivery errors |
| `test-new-fcm-provider.mjs <sa.json>` | Decisive: temporarily repoint the target to a new-id provider, send, verdict, revert |

**Re-verify quickly next time:** `verify-fcm-service-account.mjs <sa.json>` (SA still good?) then `debug-staging-messages.mjs` (still failing? fresh?).

---

## Related fix to make regardless (app provider-id footgun)

`getFcmProviderId()` in `samplefinder-app/src/lib/notifications.ts` defaults to the **prod** provider id `69cac0a30038ed1a7b92` when `EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID` is unset — and that var is **missing from `.env.staging.example` and `src/types/env.d.ts`**. Add it so a staging build can't silently register against the prod provider.

---

## Options to proceed

- **A — Appwrite support ticket (recommended).** It's their bug. Draft below.
- **B — Bypass Appwrite Messaging.** Have the Notification function call FCM v1 **directly** with the service account (the path proven in test #1). Unblocks staging now; diverges from prod's Appwrite-Messaging path.
- **C — Park it.** Prod push works, so the release isn't blocked. Revisit after Appwrite responds.

### Appwrite support ticket (draft)

> **Subject:** FCM v1 push fails "missing OAuth2 credential" for one Cloud project only
>
> Cloud, `nyc`, version 1.9.5.
> Project `6a0ad92e0001d5e515ce`: every push message fails, per-target error: *"Request is missing required authentication credential. Expected OAuth 2 access token…"* (Google FCM v1).
> The FCM provider `69cac0a30038ed1a7b92` has a valid, enabled service-account JSON. We verified independently that this exact SA mints an OAuth2 token and succeeds against FCM v1 `messages:send` (`validate_only`) for the same registration token — credential, token, and FCM API are all valid.
> We set the credential via API and via console, deleted+recreated the provider (same id), and created a brand-new provider (different id) — all fail identically.
> Our other project `691d4a54003b21bf0136` uses the same Firebase project and provider setup and delivers fine.
> Failing message ids: `6a4e5fd1002d137619d9`, `6a4e8255002b5e731cd0`.
> It appears the messaging worker for project `6a0ad92e0001d5e515ce` is not attaching the OAuth2 bearer token to its FCM requests. Please investigate server-side.

---

## Timeline (2026-07-08)

- ~13:29 — first failures observed.
- 13:43 — SA set via API; still fails.
- 14:30 — provider deleted + recreated (same id); still fails (msg 14:33).
- ~14:xx — new-id provider test; fails identically.
- Plans confirmed equal between prod and staging.
