import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createCatalogReadinessTracker,
  draftSessionKey,
  type SessionStatus,
} from "../src/lib/session-state";

describe("customer draft ownership across session changes", () => {
  it("preserves a quote through same-user permission reloads and retries", () => {
    const initial = draftSessionKey("authorized", "staff-a");
    for (const status of ["loading", "authorized", "loading", "authorized"] as const) {
      assert.equal(draftSessionKey(status, "staff-a"), initial);
    }
  });

  it("clears a previous customer's draft when switching staff accounts", () => {
    const previous = draftSessionKey("authorized", "staff-a");
    const loading = draftSessionKey("loading", "staff-b");
    assert.notEqual(loading, previous);
    assert.equal(draftSessionKey("authorized", "staff-b"), loading);
  });

  it("clears on sign-out, denied permissions, auth failure or missing configuration", () => {
    const previous = draftSessionKey("authorized", "staff-a");
    for (const status of ["signedOut", "unauthorized", "error", "unconfigured"] satisfies SessionStatus[]) {
      const cleared = draftSessionKey(status, "staff-a");
      assert.notEqual(cleared, previous, status);
      // Re-approval creates a fresh state after the cleared state was mounted.
      assert.notEqual(draftSessionKey("authorized", "staff-a"), cleared, status);
    }
    assert.notEqual(draftSessionKey("loading", null), previous);
    assert.notEqual(draftSessionKey("signedOut", null), previous);
  });
});

describe("catalogue readiness with live Firestore updates", () => {
  it("does not finish when cached and server brand snapshots arrive before rods", () => {
    const ready = createCatalogReadinessTracker();
    assert.equal(ready("brands"), false);
    assert.equal(ready("brands"), false);
    assert.equal(ready("brands"), false);
    assert.equal(ready("rods"), true);
    assert.equal(ready("brands"), true);
  });

  it("waits for brands when rod snapshots arrive first and resets on retry", () => {
    const ready = createCatalogReadinessTracker();
    assert.equal(ready("rods"), false);
    assert.equal(ready("rods"), false);
    assert.equal(ready("brands"), true);
    const retry = createCatalogReadinessTracker();
    assert.equal(retry("brands"), false);
    assert.equal(retry("rods"), true);
  });
});
