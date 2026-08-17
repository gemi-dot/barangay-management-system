import test from "node:test";
import assert from "node:assert/strict";

import { hasOperationalCapability, sessionCan } from "./auth-capabilities.mjs";

test("capability checks default deny anonymous and unassigned users", () => {
  assert.equal(sessionCan(null, "resident.view_basic"), false);
  assert.equal(sessionCan({ is_authenticated: true, capabilities: [] }, "resident.view_basic"), false);
});

test("plain staff status does not grant operational capabilities", () => {
  const session = { is_authenticated: true, is_staff: true, capabilities: [] };
  assert.equal(sessionCan(session, "resident.edit"), false);
  assert.equal(hasOperationalCapability(session), false);
});

test("capability checks use exact assigned codenames", () => {
  const session = { is_authenticated: true, capabilities: ["resident.view_basic"] };
  assert.equal(sessionCan(session, "resident.view_basic"), true);
  assert.equal(sessionCan(session, "resident.view"), false);
  assert.equal(hasOperationalCapability(session), true);
});
