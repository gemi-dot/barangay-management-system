import assert from "node:assert/strict";
import test from "node:test";

import { resolveResidentProfileTab } from "./resident-profile-tabs.mjs";

test("resident profile preserves a visible tab from the URL", () => {
  assert.equal(
    resolveResidentProfileTab("household", ["overview", "personal", "household"]),
    "household",
  );
});

test("resident profile falls back when a tab is invalid or hidden", () => {
  assert.equal(resolveResidentProfileTab("health", ["overview", "personal"]), "overview");
  assert.equal(resolveResidentProfileTab(undefined, ["overview", "personal"]), "overview");
});
