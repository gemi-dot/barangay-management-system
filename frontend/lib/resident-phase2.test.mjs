import assert from "node:assert/strict";
import test from "node:test";

import { canShowDocumentTransition, canSubmitResidentDocument, qrActionAvailability } from "./resident-phase2.mjs";

test("document submission requires permission and complete resident data", () => {
  assert.equal(canSubmitResidentDocument([], true, false), true);
  assert.equal(canSubmitResidentDocument(["Missing address"], true, false), false);
  assert.equal(canSubmitResidentDocument([], false, false), false);
});

test("document actions only render backend-authorized transitions", () => {
  assert.equal(canShowDocumentTransition(["processing", "cancelled"], "processing"), true);
  assert.equal(canShowDocumentTransition(["processing", "cancelled"], "released"), false);
});

test("QR reissue and revoke require an active identity and reason", () => {
  assert.deepEqual(qrActionAvailability(undefined, ""), { issue: true, reissue: false, revoke: false });
  assert.deepEqual(qrActionAvailability("active", "Lost ID"), { issue: false, reissue: true, revoke: true });
  assert.deepEqual(qrActionAvailability("revoked", "Replacement"), { issue: false, reissue: false, revoke: false });
});
