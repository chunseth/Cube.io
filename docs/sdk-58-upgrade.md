# Expo SDK 58 upgrade checks

Upgraded incrementally from SDK 57. SDK 54 remains committed at `3662c42`; SDK 57 configuration and lockfile are backed up in `/private/tmp/cubeio-sdk57-checkpoint-20261024`. Upgrade changes remain uncommitted.

## Installed versions and migration

Expo 58.0.19, React Native 0.88.0, React 19.3.0, Expo Router 58.0.26, Gesture Handler 3.3.0, Reanimated 4.7.1, Worklets 0.13.0, safe-area-context 5.10.1, Screens 4.30.0, SVG 15.16.0 and React types 19.3.0. Node 24.14.1 meets the SDK tooling requirement.

The initial dependency alignment encountered an npm peer resolution conflict with installed SDK 57 packages. Moving the old dependency tree and intermediate lockfile to temporary backups and installing the aligned package manifest cleanly resolved it without force or legacy-peer-deps. `npm ls` and Expo's online dependency check both pass. Temporary installation backups are `/private/tmp/cubeio-sdk58-prealign-node-modules` and `/private/tmp/cubeio-sdk58-prealign-package-lock.json`.

Set `expo.web.output` explicitly to `single` to preserve the existing browser SPA preview instead of adopting SDK 58's default server output. No strict TypeScript API opt-out or application source migration was needed. The managed project has no custom AppDelegate or native directories; SDK 58 handles scene lifecycle generation. See the official [SDK 58 release notes](https://expo.dev/changelog/sdk-58).

## Validation

- `npm run typecheck`: passed with the new strict React Native API.
- `npm test`: all 35 tests passed.
- `npm ls --depth=0`: passed with no invalid or missing dependencies.
- `npx expo install --check`: passed online.
- `npx expo-doctor@latest`: all 20 checks passed.
- Web export to `dist`: passed, including async route chunks.
- iOS JavaScript/Hermes export to `dist-ios`: passed.
- Native configuration introspection: passed; saved to `/private/tmp/cubeio-sdk58-native-config.json`.
- Browser smoke checks: startup restores the session; hold/release starts the timer; tap stops and saves a 2.11-second test solve; statistics update; reload retains the result and statistics. Cube net remains visible.
- Fresh Expo Go LAN server started on port 8084; its iOS manifest confirms SDK 58.0.0.
- `git diff --check`: passed.

## iPhone demo

Keep the Mac and iPhone on the same Wi-Fi. With the current server running, open `exp://10.0.0.221:8084` in Expo Go on the phone. Allow local network access if iOS asks. The address can change when the Mac reconnects to Wi-Fi.

To restart later, run `npx expo start --go --lan --port 8084` from the project directory and scan its QR code using the iPhone Camera. Use an Expo Go version supporting SDK 58. If local Wi-Fi blocks device communication, Expo CLI supports `--tunnel`; SDK 58's default tunnel requires an Expo login.

## Limits

No physical iPhone/simulator runtime or native Xcode build was performed. Bundle exports do not verify native SQLite persistence/migrations, haptics, audio, gesture cancellation, device safe areas or native runtime memory use. The installed Xcode 26.5 was not used to compile this upgrade. npm reports five high-severity dependency audit findings; no unrelated force upgrades were applied.
