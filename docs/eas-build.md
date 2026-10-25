# EAS builds for iPhone and iPad

The project is linked to [@esht/cube-io](https://expo.dev/accounts/esht/projects/cube-io), project ID `7344e141-a3ad-4d1e-a7e0-b8afdd0e053b`. Its Apple bundle identifier is `com.sethchun.cubeio`. The npm commands use EAS CLI 25.3.0 through `npx`, so a global CLI installation is optional.

## Build profiles

| Profile                 | Command                                   | Result                                                                      |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `development`           | `npm run build:ios:development`           | Development client for registered iPhones and iPads; connects to Metro.     |
| `development-simulator` | `npm run build:ios:development-simulator` | Development client for the iOS Simulator; connects to Metro.                |
| `preview`               | `npm run build:ios:preview`               | Standalone release preview for registered iPhones and iPads.                |
| `preview-simulator`     | `npm run build:ios:simulator`             | Standalone release preview for the iOS Simulator.                           |
| `production`            | `npm run build:ios`                       | Signed App Store/TestFlight archive with automatic build-number increments. |

All profiles use Node 24.14.1. EAS selects its SDK-compatible iOS build image. Development profiles use `expo-dev-client`; after installing a development build, run `npx expo start --dev-client` to connect it to the local app source.

App version `0.1.0` is explicit in `app.json`. Build numbers are managed remotely by EAS. Update the app version deliberately for future releases; production builds increment the native build number automatically.

## First device build and signing

Sign in with `npx eas-cli@25.3.0 login` if needed. Run `npm run eas:configure` to repeat the iOS configuration check. The first physical-device build asks for Apple Developer signing information and can generate or reuse certificates and provisioning profiles. Internal distribution also requires registering the test devices; use `npx eas-cli@25.3.0 device:create` before building a device preview. Simulator profiles do not require Apple signing credentials.

The app keeps the same bundle identifier across profiles. Installing a device preview or development client can replace another installed Cube.io build.

## App Store Connect submission

After a successful production build, use `npm run submit:ios` and select the build to upload. The first submission asks for App Store Connect authentication and the app's numeric Apple ID. Once the App Store Connect record exists, its ID can be saved as `submit.production.ios.ascAppId` in `eas.json` to make submissions repeatable. Apple account IDs, team IDs, and signing secrets are supplied by the account owner.

This setup creates no build or submission by itself. Running a build command queues an EAS build. Submission uploads the selected production archive to App Store Connect for processing; release remains controlled through App Store Connect.

## Build archive

`.easignore` retains the existing Git exclusions and also excludes screenshots, local output, and signing credentials. The build still includes the bundled catalog, local `vendor/cubejs` package, and app icon. Credentials and API keys should stay out of source control.

Reference: [Expo build profiles](https://docs.expo.dev/build/eas-json/), [remote build numbers](https://docs.expo.dev/build-reference/app-versions/), and [iOS submission](https://docs.expo.dev/submit/ios/).
