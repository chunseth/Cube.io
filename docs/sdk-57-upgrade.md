# Expo SDK 57 upgrade checks

Upgraded incrementally from SDK 56. SDK 54 remains committed at `3662c42`; the SDK 56 package files, configuration, timer component, README and report were backed up to `/private/tmp/cubeio-sdk56-checkpoint-20261024` before installation. Upgrade changes remain uncommitted.

## Installed versions

Expo 57.0.31, React Native 0.86.3, React 19.2.3, Expo Router 57.0.29, Reanimated 4.5.1, Worklets 0.10.1, Gesture Handler 2.32.0 and TypeScript 6.0.3. Expo modules were aligned with `expo install --fix`. No additional application code changes were required for this step.

These versions include the fixes for the SDK 56 Hermes memory regression and the development startup regression, according to the official [SDK 57 release notes](https://expo.dev/changelog/sdk-57#known-regressions). Expo Doctor no longer reports the Hermes regression. Native memory usage has not been measured on a device.

## Validation

- `npm run typecheck`: passed.
- `npm test`: all 35 tests passed, including statistics and the complete catalog/recognition validation.
- `npm ls --depth=0`: passed, with no missing or invalid dependencies.
- `npx expo install --check`: passed using online compatibility validation.
- `npx expo-doctor@latest`: all 21 checks passed.
- `npx expo export --platform web --output-dir dist`: passed.
- `npx expo export --platform ios --output-dir dist-ios`: passed, including Hermes bytecode export.
- `npx expo config --type introspect --json`: passed; output saved to `/private/tmp/cubeio-sdk57-native-config.json`.
- Browser smoke checks: existing session and results restored; hold/release starts the timer; tap stops and saves a 2.42-second test solve; statistics update; swipe-down opens manual entry; reload preserves the solve and statistics. Cube net and statistics panels remain visible.
- `git diff --check`: passed.

## Native testing limits

No Xcode native build or physical iPhone/simulator runtime test was performed. JavaScript exports do not verify native SQLite migrations, haptics, audio, device gesture behavior or native runtime performance.

The installed host Xcode is 26.5. If building SDK 57 with Xcode 27 in the future, Expo's release notes require opting into UIKit scene support; SDK 58 enables it by default. No Xcode 27 configuration was added in this step.

This step stops at SDK 57. The user's Expo Go installation requiring SDK 58 still needs the next SDK upgrade before it can open the project.
