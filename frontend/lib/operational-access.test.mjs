import assert from "node:assert/strict";
import test from "node:test";

import { operationalAccessLabel, operationalIdentityLabel } from "./operational-access.mjs";

for (const role of ["Secretary", "BHW", "Captain"]) {
  test(`${role} receives role-appropriate operational access wording`, () => {
    const session = { office_roles: [role] };

    assert.equal(operationalAccessLabel(session), `${role} access`);
    assert.equal(operationalIdentityLabel(session), role);
  });
}

test("an authenticated capability holder without a known office role gets generic authorized wording", () => {
  assert.equal(operationalAccessLabel({ office_roles: [] }), "Authorized access");
  assert.equal(operationalIdentityLabel({ office_roles: [] }), "authorized user");
});
