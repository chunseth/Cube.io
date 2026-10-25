# Expo SDK 56 upgrade checks

Upgraded incrementally from the verified SDK 55 configuration. SDK 54 remains committed at `3662c42`; SDK 55 configuration and lockfile were copied to `/private/tmp/cubeio-sdk55-checkpoint-20261024` before this step. Upgrade changes are uncommitted.

## Versions and compatibility edits

- Expo 56.0.24, React Native 0.85.3, React 19.2.3, Expo Router 56.2.22.
- Reanimated 4.3.1, Worklets 0.8.3, TypeScript 6.0.3; Expo packages aligned using `expo install --fix`.
- Added the installer-recommended `expo-status-bar` config plugin.
- Replaced the removed `StyleSheet.absoluteFillObject` helper with `StyleSheet.absoluteFill`, preserving the timer layout.
- Updated the standalone test compilation for TypeScript 6: explicit `--ignoreConfig` and Node16 module/resolution settings. The app continues to use Expo's TypeScript configuration.

## Validation

- `npm run typecheck`: passed.
- `npm test`: all 35 tests passed, including all case catalog/recognition tests and statistics rules.
- `npm ls --depth=0`: passed with no missing or invalid dependencies.
- `npx expo install --check`: passed against the bundled dependency map; the command reported offline mode, so it did not verify against the remote versions endpoint.
- `npx expo-doctor@latest`: 21/22 checks passed. The sole failure is the known SDK 56 Hermes V1 memory regression below.
- Web export to `dist`: passed.
- iOS JavaScript/Hermes export to `dist-ios`: passed.
- Native configuration introspection: passed; output saved to `/private/tmp/cubeio-sdk56-native-config.json`.
- Browser smoke check: existing session restored; hold/release starts the timer; tap stops and saves a 3.24-second test solve; swipe-down opens manual entry; reload preserves the result and statistics. Cube net and statistics render.
- `git diff --check`: passed.

## Known limits

Expo SDK 56 uses a Hermes V1 version with a known native memory regression, relevant to this app's Reanimated/Worklets dependencies. Expo Doctor recommends SDK 57 with Expo 57.0.9 or newer and React Native 0.86.2 or newer for the fix. This step intentionally stops at SDK 56 and does not suppress the diagnostic or apply an experimental workaround. See the official [SDK 56 release notes](https://expo.dev/changelog/sdk-56) and [SDK 57 regression notes](https://expo.dev/changelog/sdk-57#known-regressions).

SDK 56 requires iOS 16.4 or newer and Xcode 26.4 or newer for native builds. JavaScript export and configuration checks do not verify a native Xcode build, native SQLite migration, device gestures, haptics, audio, or runtime memory use. No physical iPhone or native simulator runtime test was performed in this step. An Expo Go installation requiring SDK 58 still cannot open this SDK 56 project.
