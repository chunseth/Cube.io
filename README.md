# Cube.io

An offline-first Expo / React Native practice app for intermediate 3×3 cubers. The implementation follows the referenced “Discuss App Goals Architecture Content” plan and PRD.

## Run

```sh
npm install
npm start
# Browser content authoring and preview
npm run web
# Tests and type checking
npm test
npm run typecheck
```

Use Expo Go on iPhone, or an iOS simulator, for native interaction testing. The browser version is a local preview and content authoring tool; iPhone remains the product target.

## Implemented

- Four working tabs: Timer, Train, Algorithms, Progress.
- Dark theme with blue accents and white text, bundled Inter UI font and Share Tech Mono timer font.
- Timestamp-based timer; 550 ms red-to-green preparation, release to start, touch anywhere to stop. Active solves clear the UI.
- Optional inspection with 8/12 second visual, haptic and spoken cues; +2 at 15 seconds and DNF at 17. A hold/release begins inspection; a second hold/release starts the solve.
- Directional swipes: left refreshes scramble, right confirms deletion, down enters Stackmat time, up opens penalties and (only for manual entries) editing.
- Local random-state scramble generation using the existing vendored cubejs solver. Normal scrambles use white on top and green in front. Cube preview reflects the scramble; manual horizontal drag rotates the cube smoothly, with optional quarter-turn buttons.
- Session create/rename/delete/switch; session-isolated solves and stats. Numeric entry accepts seconds and minutes.
- Pure statistics: single, Mo3, Ao5, Ao12, Ao100, best possible Ao5. DNF and +2 are included in calculations. Trimming uses 5% rounded up on each side. The statistics sheet remembers when a session has first reached five solves.
- SQLite on native, browser storage on web, serialized persistence with error visibility and retry. Native sessions/solves use relational tables; training/content/preferences currently use a versioned JSON state record. Existing `cubeio.timer.v1` data migrates without deleting the old copy.
- Complete sourced catalog: 57 OLL and 21 PLL cases, 411 distinct built-in algorithms, 4,188 J Perm trainer scrambles, 78 SpeedCubeDB published setups, and 469 derived alternative setups. Every setup preserves F2L and matches its case. OLL is grouped by shape; PLL by permutation name.
- Original vector diagrams with stable image IDs show U and all four last-layer side rows. A browsable atlas and source/verification records are in `content/`. Existing installs receive the catalog while preserving authored data and progress.
- Content studio in Algorithms: edit case metadata, setup, algorithms and recognition answer IDs; JSON import/export and browser download.
- Execution timer for authored cases; AUF variation; separate attempts, penalties, PBs, and learned prompts after 5/10/15 attempts.
- OLL two-sided identification covers all 57 cases and all 215 distinct non-skip orientations: fixed UFR prompts with F2L blank, four full-diagram answer choices, and angle-specific structural lookalikes. An author audit documents all 228 answer sets.
- PLL two-sided identification covers all 21 cases: fixed colored UFR prompts with F2L blank and four PLL-name answers. Per-angle distractors compare blocks, headlights and color relationships; an audit records every comparison against the other 20 PLLs.
- Recognition uses the verified scramble bank: four-sided diagrams in full view, locked 3D cubes in two-sided mode, OLL diagram choices and PLL names, immediate correction, and timed attempts. After an answer, the next question is chosen from available cases of the same type.
- Deterministic daily OLL/PLL persisted by local calendar date; midnight refresh and foreground refresh; 20/8 distinct-case suppression where possible.
- Session and global milestones, training PBs, learned percentages, skippable knowledge onboarding with group selection and authored case diagrams.

## Authoring case content

The complete bundled catalog is ready to train. See [the catalog documentation](content/CATALOG.md) for source attribution, verification rules, setup kinds, image IDs, and the offline rebuild workflow. Open `content/images/index.html` to browse all 78 diagrams.

The content studio remains available for authoring:

1. Open **Algorithms → Content editor**.
2. Choose a case and edit its metadata, primary setup, algorithms, or recognition answer IDs.
3. Setups must start from solved and preserve F2L while producing the correct case. Imports validate this semantically; OLL is matched by orientation and PLL by permutation.
4. Export/download the full JSON to preserve the setup bank and source metadata. Imported edits stay on that device.

Use `npm run catalog:build` to regenerate bundled content and diagrams from the checked-in source snapshots. Use `npm run catalog:fetch` only when refreshing those snapshots from the public sites. Algorithms and scrambles are available offline after bundling.

## Verification

The automated tests cover averages/trimming/DNF/+2 and rounding, manual time parsing, inspection boundaries, best-possible averages, achievements, deterministic daily selection/suppression, cube projection, SQLite constraints/cascade deletion, every last-layer setup at every U alignment, all 411 algorithms, independent source diagrams, case identification, semantic imports, catalog migration and SVG image mappings. Browser interaction checks cover startup, hold/release/stop, manual minute entry, swipe actions, penalties, persistence, case editing, execution/AUF variation, and two-sided recognition with immediate correction and rotation unlock. Web and iOS JavaScript exports both succeed. Native runtime verification remains outstanding because the available simulator controls did not reliably accept input.

An iOS export verifies bundling; it does not replace simulator or physical-device testing.

## Remaining before release

- Device QA: multitouch/gesture cancellation, system interruptions, haptics/audio, inspection boundaries, keyboard/safe-area layouts and VoiceOver.
- Longer-session database migration/persistence and performance testing. Training tables can be normalized as usage grows.
- Solve/attempt data backup and restore; the current JSON export is for authored case content only.
- App icons, accessibility polish, release metadata, signing, privacy review and App Store submission.
- No accounts, cloud, analytics, hardware integration, other puzzles, F2L, tutorials, leaderboards or monetization were added. The donation item is intentionally inactive.

Inspection timing reference: [WCA Regulations](https://www.worldcubeassociation.org/regulations/).
