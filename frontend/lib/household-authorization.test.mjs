import assert from "node:assert/strict";
import test from "node:test";

import { canReactivateHousehold, householdPermissions } from "./household-authorization.mjs";

const checker = (capabilities) => (capability) => capabilities.includes(capability);

test("household controls follow the canonical capability bundles", () => {
  const secretary = householdPermissions(checker([
    "household.view", "household.manage", "household.change_head", "family.view", "family.manage",
  ]));
  const bhw = householdPermissions(checker(["household.view", "family.view"]));
  const captain = householdPermissions(checker([
    "household.view", "household.change_head", "family.view",
  ]));

  assert.deepEqual(secretary, {
    view: true, manage: true, changeHead: true, viewFamily: true, manageFamily: true,
  });
  assert.deepEqual(bhw, {
    view: true, manage: false, changeHead: false, viewFamily: true, manageFamily: false,
  });
  assert.deepEqual(captain, {
    view: true, manage: false, changeHead: true, viewFamily: true, manageFamily: false,
  });
});

test("household controls default deny without exact capabilities", () => {
  assert.deepEqual(householdPermissions(checker([])), {
    view: false, manage: false, changeHead: false, viewFamily: false, manageFamily: false,
  });
});

test("reactivation requires household management and an eligible status", () => {
  const manager = householdPermissions(checker(["household.manage"]));
  const viewer = householdPermissions(checker(["household.view"]));

  for (const status of ["inactive", "archived", "transferred"]) {
    assert.equal(canReactivateHousehold(status, manager), true);
    assert.equal(canReactivateHousehold(status, viewer), false);
  }
  assert.equal(canReactivateHousehold("active", manager), false);
});
