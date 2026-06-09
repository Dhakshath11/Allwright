import { execSync } from 'node:child_process';
import config from './mobilewright.config';

// Android runtime "dangerous" permissions that the Contacts app may request
// on launch. We grant them via `adb shell pm grant` before any test runs so
// OS dialogs (e.g. "Allow Contacts to send you notifications?") never appear.
//
// Only permissions actually declared in the app's manifest can be granted;
// any unsupported ones are silently skipped (see the catch block below).
const ANDROID_DANGEROUS_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.GET_ACCOUNTS',
];

// Substrings of adb-error messages we consider expected / harmless:
//   1. Permission not declared in the app's manifest on this Android version.
//   2. No Android emulator running — fine when the active run is iOS-only.
const TOLERATED_ADB_ERRORS = [
  'has not requested permission',
  'no devices/emulators found',
  'device not found',
];

export default function globalSetup(): void {
  // After the move to a `projects[]` matrix, `platform` and `bundleId` live
  // under each project's `use` block — NOT at the top level of the config.
  // Walk every Android project and grant its package's permissions.
  //
  // iOS doesn't expose a CLI grant equivalent — its first-launch prompts
  // (Contacts access, etc.) must be dismissed via locator-based taps.
  const androidPackages = (config.projects ?? [])
    .map((p) => p.use)
    .filter((u): u is { platform: 'android'; bundleId: string } =>
      u?.platform === 'android' && typeof u.bundleId === 'string',
    )
    .map((u) => u.bundleId);

  if (androidPackages.length === 0) return;

  for (const pkg of androidPackages) {
    for (const perm of ANDROID_DANGEROUS_PERMISSIONS) {
      try {
        // `adb -e` targets the only running emulator. If you later run
        // against multiple devices, switch to `-s <deviceId>` driven by
        // the project's `use.deviceName`.
        execSync(`adb -e shell pm grant ${pkg} ${perm}`, { stdio: 'pipe' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!TOLERATED_ADB_ERRORS.some((m) => msg.includes(m))) {
          throw err;
        }
      }
    }
  }
}
