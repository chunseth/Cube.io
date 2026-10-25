# Cold startup performance

The boot callback used to call `prepareScrambleService()` before setting the app
ready. This synchronously rebuilt cubejs's move and pruning tables on every new
process, even though the first timer scramble is already bundled. Closing and
reopening the app therefore paid the entire cost again.

Solver preparation now starts after the ready timer mounts. The vendored solver
builds the same tables incrementally with a 4 ms work budget and yields between
steps. Concurrent requests share one initialization promise. A request for a new
scramble waits for complete tables; the timer shows a preparing label and prevents
starting a solve against the previous scramble during that wait. Leaving the timer
while a request is pending cannot update an unmounted screen.

Local Node measurement on October 24, 2026:

- Previous synchronous initialization: approximately 880 ms blocking the caller.
- New preparation call: approximately 0.05 ms before returning a promise.
- Background preparation: approximately 1.3 seconds total, in 249 steps; longest
  measured step was 5.5 ms. The work budget is checked at incremental boundaries.

These measure solver preparation, not total device launch time. Physical iPhone
launch timing remains to be checked.

Validation: all 39 tests pass, including original-table SHA-256 fingerprints,
concurrent preparation, an immediate scramble request during cold initialization,
random-state solving, and solved/single-move rejection. Type checking and the iOS
JavaScript export pass. Browser checks cover first launch, reopening with saved
preferences, and generating a new scramble.
