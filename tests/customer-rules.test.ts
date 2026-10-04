/** Customer approval workflow and contact-format rules. Run with `npm test`. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBdPhone, isEmail, isPostcode } from "../src/lib/customers/contact.ts";
import { checkStatusChange, statusActions } from "../src/lib/customers/status.ts";

describe("approval workflow", () => {
  it("allows only the defined transitions", () => {
    assert.deepEqual(statusActions("pending").map((a) => a.to), ["approved", "rejected"]);
    assert.deepEqual(statusActions("approved").map((a) => a.to), ["suspended"]);
    assert.deepEqual(statusActions("suspended").map((a) => a.to), ["approved"]);
    assert.deepEqual(statusActions("rejected").map((a) => a.to), ["approved", "pending"]);
    assert.ok(checkStatusChange("approved", "pending").status);
    assert.ok(checkStatusChange("pending", "suspended").status);
  });

  it("requires a reason to reject or suspend", () => {
    assert.ok(checkStatusChange("pending", "rejected").reason);
    assert.ok(checkStatusChange("approved", "suspended", "late").reason);
    assert.deepEqual(checkStatusChange("approved", "suspended", "Overdue invoices"), {});
  });

  it("makes the reason optional for approval and reactivation, but limits its length", () => {
    assert.deepEqual(checkStatusChange("pending", "approved"), {});
    assert.deepEqual(checkStatusChange("suspended", "approved", ""), {});
    assert.ok(checkStatusChange("pending", "approved", "x".repeat(301)).reason);
  });
});

describe("contact formats", () => {
  it("accepts Bangladesh phone numbers in common formats", () => {
    for (const p of ["01712-345678", "+880 1712-345678", "8801712345678", "+880 1700-000001", "02-9876543"]) assert.ok(isBdPhone(p), p);
  });

  it("rejects malformed phone numbers", () => {
    for (const p of ["12345", "01212345678", "+1 555 123 4567", "0171234567a", ""]) assert.ok(!isBdPhone(p), p);
  });

  it("checks postcode and email format only", () => {
    assert.ok(isPostcode("1212"));
    assert.ok(isPostcode(" 9100 "));
    assert.ok(!isPostcode("121"));
    assert.ok(!isPostcode("12a4"));
    assert.ok(isEmail("buyer@customer.example.com"));
    assert.ok(!isEmail("buyer@"));
  });
});
