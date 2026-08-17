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

test("role capability bundles produce the approved resident control visibility", () => {
  const activeResident = { is_active: true, residency_status: "active" };
  const secretary = residentPermissions(checker([
    "resident.view_basic",
    "resident.view_sensitive",
    "resident.create",
    "resident.edit",
    "resident.lifecycle_archive",
    "resident.lifecycle_transfer",
  ]));
  const bhw = residentPermissions(checker(["resident.view_basic"]));
  const captain = residentPermissions(checker([
    "resident.view_basic",
    "resident.view_sensitive",
    "resident.lifecycle_archive",
    "resident.lifecycle_transfer",
    "resident.lifecycle_deceased",
    "resident.restore",
  ]));

  assert.deepEqual({
    create: secretary.create,
    edit: secretary.edit,
    viewSensitive: secretary.viewSensitive,
    ...availableResidentLifecycleActions(activeResident, secretary),
  }, {
    create: true,
    edit: true,
    viewSensitive: true,
    archive: true,
    transfer: true,
    deceased: false,
    restore: false,
    delete: false,
  });
  assert.deepEqual({
    create: bhw.create,
    edit: bhw.edit,
    viewSensitive: bhw.viewSensitive,
    ...availableResidentLifecycleActions(activeResident, bhw),
  }, {
    create: false,
    edit: false,
    viewSensitive: false,
    archive: false,
    transfer: false,
    deceased: false,
    restore: false,
    delete: false,
  });
  assert.deepEqual({
    create: captain.create,
    edit: captain.edit,
    viewSensitive: captain.viewSensitive,
    ...availableResidentLifecycleActions(activeResident, captain),
  }, {
    create: false,
    edit: false,
    viewSensitive: true,
    archive: true,
    transfer: true,
    deceased: true,
    restore: false,
    delete: false,
  });
});
