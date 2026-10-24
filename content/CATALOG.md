# Cube.io last-layer catalog

The bundled catalog contains all 57 OLL and 21 PLL cases. OLL is grouped by J Perm's shape names; PLL is grouped by its conventional permutation name. These records power the offline Algorithms and Train screens on existing and new installs.

The source snapshot was collected on October 24, 2026 from [J Perm OLL](https://jperm.net/algs/oll), [J Perm PLL](https://jperm.net/algs/pll), [SpeedCubeDB OLL](https://speedcubedb.com/a/3x3/OLL), and [SpeedCubeDB PLL](https://speedcubedb.com/a/3x3/PLL). Only algorithm moves, setup moves, case metadata, and reference diagram sticker data are stored. The diagrams are original Cube.io vector artwork generated from simulated cube states.

## Contents

- `cases.json`: 78 case records, 411 distinct solution algorithms, 4,735 attributed setup records, and recognition answer choices.
- `sources/jperm.json`: every published alternative algorithm and all 4,188 original trainer scrambles from J Perm's OLL/PLL data. Source array positions are retained.
- `sources/speedcubedb.json`: 78 explicit setups, the standard algorithms and alternatives displayed on the category pages, and reference sticker patterns. This is a dated snapshot of the displayed alternatives, not every community submission or the entire SpeedCubeDB site.
- `sources/manifest.json`: source URLs, retrieval date, and SHA-256 digests of the source responses.
- `verification.json`: totals and rejected entries. The current snapshot has zero rejected entries.
- `images/manifest.json`: a stable mapping from each case ID to its custom image ID and SVG filename.
- `images/index.html`: a browsable atlas of all 78 case diagrams, with setup and solution algorithms.
- `oll-recognition.json`: 57 OLL identification quizzes with four U-alignment variants per case and documented distractor selection.
- `oll-quizzes/index.html` and `oll-quizzes/audit.json`: an author review of all 228 answer sets, including similarity measurements and the reason for each wrong choice.
- `pll-recognition.json`: 21 PLL quizzes with four U-angle variants and four name choices per question.
- `pll-similarity.json`: all 1,680 per-angle comparisons against the other 20 PLLs. This larger analysis file is not bundled into the app.
- `pll-quizzes/index.html` and `pll-quizzes/audit.json`: the complete PLL lookalike review, per-case peer summaries, visible candidate cube comparisons, and distractor rationale.

## Setups and solutions

Hold a solved cube with **yellow on U and green on F** before applying a setup. Published setup rotations are explicitly returned to this reference frame. Move spellings such as `U2'` and `Rw` are normalized to `U2` and `r`; the source text is retained when it differs.

Each setup has a stable ID, case ID, source URL, source name, kind, executable moves, and verification result. There are three kinds:

| Kind        | Count | Meaning                                                                                                                                            |
| ----------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trainer`   | 4,188 | The complete finite J Perm OLL/PLL scramble banks, with their original case correlations.                                                          |
| `published` |    78 | Explicit SpeedCubeDB setup moves. These are also the default diagram setups.                                                                       |
| `inverse`   |   469 | Alternative setups derived locally by inverting a source algorithm after closing its final cube rotation. `derivedFrom` identifies that algorithm. |

The 4,735 records retain separate provenance when two sources give the same moves. The trainer deduplicates identical executable strings and adds a random U alignment. It does not require a scramble to be the inverse of the selected solution algorithm.

OLL verification checks the last-layer **orientation pattern** and solved F2L, ignoring last-layer permutation. Solving an OLL need only orient the last layer while preserving F2L. The resulting PLL can vary. PLL verification additionally requires an oriented last layer and the claimed permutation, allowing initial and final U alignment. Whole-cube rotations are normalized using centers. Solved/skip states are not mislabeled as one of the 78 non-skip cases.

Every distinct algorithm is checked from the independently sourced published setup under possible U alignments. No claim is made that an algorithm can be applied immediately without inspecting the cube and choosing its starting angle. Source rotations and finger-trick grouping remain available in algorithm provenance; stored executable algorithms use normalized move notation.

## Diagrams

Image IDs follow `cubeio-oll-01-v1` through `cubeio-oll-57-v1` and `cubeio-pll-aa-v1`, etc. Each image exposes the **nine U stickers and all twelve side stickers of the last layer**: B above, F below, L to the left, R to the right. This contains the complete last-layer recognition pattern without hiding a side. F2L stickers are omitted because F2L is verified solved.

OLL diagrams highlight yellow orientation and mute other colors. PLL diagrams show the full side-color permutation. The F/B/L/R labels identify fixed faces; the label colors on PLL diagrams show their reference center colors. The cube scheme follows Cube.io's existing convention: yellow U, white D, green F, blue B, orange R, red L. The static SVG atlas and live React Native diagrams share the same geometry and colors.

## Two-sided OLL identification

OLL recognition starts in two-sided mode. The question is a fixed UFR cube: all nine U stickers and the three last-layer stickers on each of F and R are visible. F2L is a null surface with no colored stickers or grid. Rotation controls and the two hidden side rows are unavailable even after a wrong answer. Each answer is the existing full U-plus-four-side-rows visual ID, labeled A–D; the four answer positions are shuffled.

Each OLL has four authored U-angle variants. These cover all **215 distinct non-skip legal last-layer orientations**; symmetric cases share some views. Exhaustive tests enumerate the 27 legal corner-orientation combinations and eight legal edge-orientation combinations (216 including skip), and confirm that no UFR pattern belongs to two different cases. Every verified OLL setup in the source bank is also checked at all four U alignments against the quiz bank.

Distractors are selected separately for the observed angle:

1. Keep the edge shape: dot, line, L, or cross. Prefer two other cases with the same number of oriented corners.
2. Add one case with the nearest available different corner count, within the same edge shape.
3. If fewer than two same-count peers exist, fill those slots using the nearest corner counts of that edge shape. For example, only OLL 1 and 2 are zero-corner dot cases, so both use OLL 3 and 4 (one oriented corner) as the remaining choices. OLL 20 has all four corners oriented, so its nearest dot choices are OLL 17–19 (two oriented corners).
4. Rank eligible candidates after trying all four candidate U alignments: U-sticker differences have weight four, visible F/R-sticker differences have weight two, and the complete last-layer pattern adds weight one. A small same-family preference and then case number make tie-breaking deterministic. Choice diagrams retain their standard orientation so the learner may need to mentally rotate them.

`oll-recognition.json` records the selected case IDs, matching candidate angle, U/visible-sticker difference counts, and plain-language reasons. This is a reproducible visual-similarity policy, not a claim of user-tested difficulty. The author audit makes each choice reviewable. These choices take precedence over older generic answer mappings in two-sided OLL mode; full-view mode retains its authored mappings. A shuffled case deck visits every available case before starting the next deck, avoiding immediate repeats across decks.

## Two-sided PLL identification

All 21 PLLs start in two-sided mode. The question shows a colored U face and only the three last-layer stickers on F and R. F2L is a blank, unsegmented surface; centers and lower-layer color references are absent. The four answers are PLL names, shuffled into A–D slots. The view stays fixed after both correct and incorrect answers. Full-view authored answer mappings remain available in full-view mode.

The 84 authored U-angle variants represent **71 distinct color-neutral visible configurations** and **284 colored non-skip states**. Tests independently enumerate all 288 legal oriented last-layer permutations (matching corner/edge parity), verify the four skip states are excluded, and confirm a unique PLL name for every other UFR view. Every saved PLL setup is tested with every initial and final U alignment.

A visible pattern consists of the F top row followed by the R top row. Color-neutral matching ignores a global cyclic shift around F→R→B→L while preserving clockwise color order and opposite-color relationships. Arbitrary color swapping and reflection are not allowed. Equal-color groupings alone are insufficient: some H/Z and Ua/Ub views share those groupings but differ in color relationships.

For each question, all 20 other PLLs are compared at all four candidate U angles. The best angle for each candidate is recorded. The similarity score counts mismatches in these features:

| Visible feature                                         | Weight per mismatch |
| ------------------------------------------------------- | ------------------: |
| Full same-color bars on F/R                             |                  15 |
| Headlights (matching row-end corners) on F/R            |                  12 |
| Adjacent same-color two-sticker blocks                  |                   9 |
| Same-color relationships among all six visible stickers |                   9 |
| Opposite-color relationships among all six stickers     |                   2 |
| Directed cyclic color relationships                     |                   1 |
| Color-normalized sticker positions                      |                   1 |

The first two distractors are the nearest measured matches. A third slot can include a user-specified confusion family—Ra/F, Ga/Gd with A perms, Gb/Gc with H, or U perms with Z—when that family is not already represented and an actual candidate angle has close geometry: at most two same-color-pair mismatches, one headlight mismatch, no full-bar mismatch, and one adjacent-block mismatch. Otherwise the third choice is the next nearest measured match. This makes the choices specific to the visible angle: an F-perm view with a full bar can have J-perm lookalikes, while another F-perm view includes Ra.

The author review lists the selected lookalikes for every case, all 20 ranked alternatives for every angle, and color-aligned candidate cubes so the comparison can be inspected. Candidate cyclic recoloring in the audit is equivalent to a valid initial U alignment; it does not change the PLL case. The numerical distance and confusion anchors are reproducible design choices, not a user-tested error-rate or difficulty model.

## Rebuild and verify

Run `npm run catalog:build` to regenerate the bundled records, verification report, vector assets, and atlas from the checked-in source snapshots. Run `npm test` and `npm run typecheck` afterward. Tests cover every setup at all four U alignments, independent source sticker patterns, algorithms, imports, migration, and diagram indexing.

To refresh public source data, run `npm run catalog:fetch`, then rebuild and inspect the verification report. Source JavaScript is parsed as a TypeScript syntax tree to read string/array literals; downloaded code is never evaluated. Snapshot-count assertions intentionally catch incomplete downloads or source structure changes.

The content editor still imports/exports version-1 documents, with optional provenance and setup-bank fields. Imports now validate case semantics and recompute verification instead of trusting a supplied verified flag. Existing authored case names, setups, family labels, and answer choices are preserved when the bundled catalog is merged; algorithm alternatives are combined. Learned flags, selected/custom algorithms, solve history, sessions, and attempts remain in their existing store fields.
