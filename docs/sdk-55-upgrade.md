# Expo SDK 55 upgrade check

Checked on October 24, 2026.

- Branch: `upgrade/expo-sdk-55`
- Preserved SDK 54 checkpoint: `3662c42`
- Upgrade scope: SDK 54 → SDK 55 only

## Changes

Aligned installed packages using `npm install expo@^55.0.0` followed by `npx expo install --fix`.

| Package           | Previous | Upgraded |
| ----------------- | -------- | -------- |
| Expo              | 54       | 55.0.32  |
| React / React DOM | 19.1.0   | 19.2.0   |
| React Native      | 0.81.5   | 0.83.10  |
| Expo Router       | 6        | 55.0.18  |
| Reanimated        | 4.1      | 4.2.1    |
| Worklets          | 0.5.1    | 0.7.4    |
| Gesture Handler   | 2.28     | 2.30.1   |
| SQLite            | 16       | 55.0.20  |

Other Expo modules were aligned with SDK 55. The Expo installer added the `expo-font` configuration plugin. The app already used the New Architecture. No database schema or application behavior changes were required.

Environment: Node 24.14.1 and Xcode 26.5.

## Passed checks

- `npx expo install --check`: dependencies are up to date.
- `npm ls --depth=0`: installed direct dependencies resolve successfully.
- `npx expo-doctor@latest`: 20/20 checks pass.
- `npm run typecheck`: passes.
- `npm test`: all 35 tests pass, including statistics, SQLite schema behavior, catalog integrity and OLL/PLL recognition mappings.
- `npx expo export --platform web --output-dir dist`: passes.
- `npx expo export --platform ios --output-dir dist-ios`: passes, including Hermes bytecode generation.
- `npx expo config --type introspect --json`: passes; native plugin configuration generates successfully.
- Browser smoke check: existing saved session/results restored; hold/release starts; tap stops and saves; swipe-down opens manual keypad; updated result survives reload; cube net and statistics render correctly. No captured errors were attributed to the new web bundle.

## Remaining verification

An iOS JavaScript export and configuration introspection do **not** prove that a full Xcode native build or physical-device runtime works. Those have not been tested during this step. Native SQLite persistence, haptics, speech, keyboard, safe-area behavior and timer gestures still need testing in an SDK 55-compatible native client or development build.

An Expo Go installation requiring SDK 58 will still reject this SDK 55 project. Stop here until the next incremental upgrade is requested.

## References

- [SDK 55 release notes](https://expo.dev/changelog/sdk-55)
- [Expo SDK upgrade process](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
