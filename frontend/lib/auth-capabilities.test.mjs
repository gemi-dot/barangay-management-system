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

test("document and digital ID controls follow the exact capability matrix", () => {
  const sessions = {
    secretary: { is_authenticated: true, capabilities: [
      "document.view", "document.create", "document.process", "document.release", "document.print", "document.export",
      "digital_id.view", "digital_id.verify", "digital_id.issue", "digital_id.print",
    ] },
    captain: { is_authenticated: true, capabilities: [
      "document.view", "document.approve", "document.print", "document.export",
      "digital_id.view", "digital_id.verify", "digital_id.reissue", "digital_id.revoke", "digital_id.print",
    ] },
    bhw: { is_authenticated: true, capabilities: ["digital_id.verify"] },
  };

  assert.equal(sessionCan(sessions.secretary, "document.process"), true);
  assert.equal(sessionCan(sessions.secretary, "document.approve"), false);
  assert.equal(sessionCan(sessions.secretary, "digital_id.issue"), true);
  assert.equal(sessionCan(sessions.secretary, "digital_id.reissue"), false);

  assert.equal(sessionCan(sessions.captain, "document.approve"), true);
  assert.equal(sessionCan(sessions.captain, "document.process"), false);
  assert.equal(sessionCan(sessions.captain, "document.release"), false);
  assert.equal(sessionCan(sessions.captain, "digital_id.reissue"), true);
  assert.equal(sessionCan(sessions.captain, "digital_id.issue"), false);

  assert.equal(sessionCan(sessions.bhw, "document.view"), false);
  assert.equal(sessionCan(sessions.bhw, "digital_id.verify"), true);
  assert.equal(sessionCan(sessions.bhw, "digital_id.view"), false);
  assert.equal(sessionCan(sessions.bhw, "digital_id.print"), false);
});
