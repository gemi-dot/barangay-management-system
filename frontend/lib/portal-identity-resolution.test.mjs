import assert from "node:assert/strict";
import test from "node:test";

import { portalIdentityControls } from "./portal-identity-resolution.mjs";

test("portal identity controls stay hidden until dashboard resolution completes", () => {
  for (const resolution of ["idle", "loading"]) {
    assert.deepEqual(portalIdentityControls(resolution, null), {
      showRequestForm: false,
      showLinkedIdentity: false,
      showManualIdentity: false,
    });
  }
});

test("linked portal accounts receive only the official identity presentation", () => {
  assert.deepEqual(portalIdentityControls("resolved", { id: 25 }), {
    showRequestForm: true,
    showLinkedIdentity: true,
    showManualIdentity: false,
  });
});

test("unlinked portal accounts receive manual identity fields after resolution", () => {
  assert.deepEqual(portalIdentityControls("resolved", null), {
    showRequestForm: true,
    showLinkedIdentity: false,
    showManualIdentity: true,
  });
});

test("dashboard failure never falls back to the unlinked request form", () => {
  assert.deepEqual(portalIdentityControls("failed", null), {
    showRequestForm: false,
    showLinkedIdentity: false,
    showManualIdentity: false,
  });
});
