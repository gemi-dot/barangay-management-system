import assert from "node:assert/strict";
import test from "node:test";

import { canSubmitHeadChange } from "./household-head-workflow.mjs";

test("Change Head is disabled without a selected eligible member", () => {
  assert.equal(canSubmitHeadChange(null, false), false);
});

test("Change Head is disabled while a request is running", () => {
  assert.equal(canSubmitHeadChange({ resident_id: 124 }, true), false);
});

test("Change Head is enabled for a selected eligible member", () => {
  assert.equal(canSubmitHeadChange({ resident_id: 124 }, false), true);
});
