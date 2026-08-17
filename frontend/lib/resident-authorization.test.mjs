import assert from "node:assert/strict";
import test from "node:test";

import { availableResidentLifecycleActions, residentPermissions } from "./resident-authorization.mjs";

const checker = (capabilities) => (capability) => capabilities.includes(capability);

test("resident controls require exact capabilities", () => {
  const permissions = residentPermissions(checker(["resident.view_basic", "resident.create"]));
  assert.equal(permissions.viewBasic, true);
  assert.equal(permissions.create, true);
  assert.equal(permissions.edit, false);
  assert.equal(permissions.archive, false);
});

test("lifecycle controls respect status and permissions", () => {
  const permissions = residentPermissions(checker([
    "resident.lifecycle_archive",
    "resident.lifecycle_transfer",
    "resident.lifecycle_deceased",
    "resident.restore",
  ]));
  assert.deepEqual(availableResidentLifecycleActions(
    { is_active: false, residency_status: "archived" }, permissions,
  ), { archive: false, transfer: true, deceased: true, restore: true, delete: false });
  assert.deepEqual(availableResidentLifecycleActions(
    { is_active: false, residency_status: "deceased" }, permissions,
  ), { archive: false, transfer: false, deceased: false, restore: false, delete: false });
});
