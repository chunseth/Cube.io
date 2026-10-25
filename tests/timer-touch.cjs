const { test } = require("node:test");
const assert = require("node:assert/strict");
const { timerTouchIntent, GESTURE_LOCK_MS, HOLD_MS } =
  require("../scripts/load-domain.cjs")("timer/engine");

test("swipes must start before the 150 ms hold boundary", () => {
  assert.equal(GESTURE_LOCK_MS, 150);
  assert.equal(timerTouchIntent("pending", 149.99, 100), "swipe");
  assert.equal(timerTouchIntent("pending", 150, 100), "hold");
  assert.equal(timerTouchIntent("pending", 151, 100), "hold");
});

test("small early finger movements do not prevent a hold from locking", () => {
  let intent = timerTouchIntent("pending", 40, 8);
  intent = timerTouchIntent(intent, 149, 28);
  assert.equal(intent, "pending");
  intent = timerTouchIntent(intent, 150, 200);
  assert.equal(intent, "hold");
});

test("movement in any direction stays a hold after lock, including after green readiness", () => {
  for (const [x, y] of [
    [-200, 0],
    [200, 0],
    [0, -200],
    [0, 200],
    [150, 150],
  ]) {
    let intent = timerTouchIntent("pending", 150, 0);
    for (const elapsed of [151, HOLD_MS - 1, HOLD_MS, HOLD_MS + 1000]) {
      intent = timerTouchIntent(intent, elapsed, Math.hypot(x, y));
      assert.equal(intent, "hold");
    }
  }
});

test("a first movement well after 150 ms cannot become a swipe", () => {
  assert.equal(timerTouchIntent("pending", 300, 500), "hold");
  assert.equal(timerTouchIntent("pending", HOLD_MS + 1, 500), "hold");
});

test("an early committed swipe remains a swipe even when released after 150 ms", () => {
  let intent = timerTouchIntent("pending", 60, 29);
  assert.equal(intent, "swipe");
  intent = timerTouchIntent(intent, 200, 300);
  intent = timerTouchIntent(intent, HOLD_MS + 100, 0);
  assert.equal(intent, "swipe");
});

test("a fresh contact can swipe after a previous contact locked to a hold", () => {
  assert.equal(timerTouchIntent("pending", 200, 400), "hold");
  assert.equal(timerTouchIntent("pending", 20, 40), "swipe");
});
