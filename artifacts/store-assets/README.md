# Cube.io icon and native screenshots

## Icon

`aa-perm-1024.png` is an opaque 1024 × 1024 PNG with a dark blue (#0c1420) background. Its U face and four side rows reproduce the app's verified Aa Perm sticker arrangement. The app icon at `assets/icon.png` has been updated to the same image; `assets/icon.svg` is the editable vector source.

## Native captures

- iPhone 17 Pro Max, iOS 26.5: 1320 × 2868 PNGs in `iphone/`.
- iPad Pro 13-inch (M5), iPadOS 26.5: 2064 × 2752 PNGs in `ipad/`.
- Portrait captures from the actual React Native app in Expo Go, with developer overlays hidden.
- Screenshots use a separate temporary app copy and sample data. They do not contain personal solve history.

Each device folder contains:

1. `01-aa-perm-learned.png`: Aa Perm learned, execution PB 1.43 s, recognition PB 0.82 s.
2. `02-oll-23-unlearned.png`: OLL 23 unlearned, no execution or recognition PBs.
3. `03-oll-13-mid-move.png`: first J Perm OLL 13 algorithm, paused halfway through move 4 (U'). Algorithm: F U R U' R2 F' R U R U' R'.
4. `04-progress-168-solves.png`: Progress with 168 session solves and Ao5, Ao12, Ao100 chart lines.
5. `05-timer.png`: Timer with populated session statistics.
6. `06-train.png`: Train with daily OLL/PLL and practice controls.
7. `07-pll-quiz-unanswered.png`: two-sided PLL recognition, answer not submitted.
8. `08-oll-quiz-incorrect.png`: two-sided OLL recognition, wrong selection highlighted and correct answer shown.

`iphone-overview.png` and `ipad-overview.png` are reduced-size contact sheets for browsing. Use the full-resolution PNGs in the device folders for uploads.
