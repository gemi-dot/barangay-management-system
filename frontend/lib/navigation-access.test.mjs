import assert from "node:assert/strict";
import test from "node:test";

import { hasNavigationAccess } from "./navigation-access.mjs";

const householdsItem = {
  label: "Households",
  href: "/households",
  matchPaths: ["/households"],
  capability: "household.view",
};

function canFrom(capabilities) {
  return (capability) => capabilities.includes(capability);
}

test("households sidebar visibility follows household.view capability", () => {
  assert.equal(hasNavigationAccess(householdsItem, ["Secretary"], canFrom(["household.view"])), true);
  assert.equal(hasNavigationAccess(householdsItem, ["BHW"], canFrom(["household.view"])), true);
  assert.equal(hasNavigationAccess(householdsItem, ["Captain"], canFrom(["household.view"])), true);
  assert.equal(hasNavigationAccess(householdsItem, ["Superuser"], canFrom(["household.view"])), true);
  assert.equal(hasNavigationAccess(householdsItem, ["BHW"], canFrom([])), false);
  assert.equal(hasNavigationAccess(householdsItem, ["Secretary"], canFrom([])), false);
});

test("role-based fallback still applies to legacy navigation items", () => {
  const inventoryItem = {
    label: "Inventory",
    href: "/inventory",
    matchPaths: ["/inventory"],
    roles: ["Secretary", "Captain", "Superuser"],
  };

  assert.equal(hasNavigationAccess(inventoryItem, ["Secretary"], canFrom([])), true);
  assert.equal(hasNavigationAccess(inventoryItem, ["BHW"], canFrom([])), false);
});

test("document queue navigation requires document.view instead of an office role", () => {
  const item = {
    label: "Document Requests",
    href: "/document-requests",
    matchPaths: ["/document-requests"],
    capability: "document.view",
  };

  assert.equal(hasNavigationAccess(item, ["Secretary"], canFrom(["document.view"])), true);
  assert.equal(hasNavigationAccess(item, ["Captain"], canFrom(["document.view"])), true);
  assert.equal(hasNavigationAccess(item, ["BHW"], canFrom([])), false);
});
