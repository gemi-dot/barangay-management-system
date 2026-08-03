import assert from "node:assert/strict";
import test from "node:test";

import { normalizeApiBaseUrl, portalRequestCreateUrl } from "./api-url.mjs";

test("portal request URL contains one API prefix and a trailing slash", () => {
  assert.equal(portalRequestCreateUrl("/api"), "/api/portal/requests/create/");
  assert.equal(
    portalRequestCreateUrl("http://localhost:8000"),
    "http://localhost:8000/api/portal/requests/create/",
  );
  assert.equal(
    portalRequestCreateUrl("http://localhost:8000/api/"),
    "http://localhost:8000/api/portal/requests/create/",
  );
});

test("empty API configuration is rejected", () => {
  assert.throws(
    () => normalizeApiBaseUrl("  ", "NEXT_PUBLIC_API_BASE_URL"),
    /NEXT_PUBLIC_API_BASE_URL is not configured/,
  );
});
