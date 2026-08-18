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

test("authoritative superuser status takes precedence over every assigned office role", () => {
  const session = {
    is_superuser: true,
    office_roles: ["Secretary", "BHW", "Captain"],
  };

  assert.equal(operationalAccessLabel(session), "Superuser access");
  assert.equal(operationalIdentityLabel(session), "Superuser");
});

test("an authenticated capability holder without a known office role gets generic authorized wording", () => {
  assert.equal(operationalAccessLabel({ office_roles: [] }), "Authorized access");
  assert.equal(operationalIdentityLabel({ office_roles: [] }), "authorized user");
});
