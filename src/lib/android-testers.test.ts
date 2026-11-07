import assert from "node:assert/strict";
import { test } from "node:test";
import { checkTesterEmail } from "./android-testers";

test("a full address passes, Gmail or not", () => {
  assert.equal(checkTesterEmail("sam@gmail.com"), null);
  assert.equal(checkTesterEmail("  sam@work.co.uk "), null);
});

test("empty and incomplete addresses say so", () => {
  assert.deepEqual(checkTesterEmail("   "), { err: "empty" });
  assert.deepEqual(checkTesterEmail("sam.gmail.com"), { err: "invalid" });
  assert.deepEqual(checkTesterEmail("sam@gmail"), { err: "invalid" });
  assert.deepEqual(checkTesterEmail("sam@@gmail.com"), { err: "invalid" });
  assert.deepEqual(checkTesterEmail(`${"a".repeat(250)}@gmail.com`), { err: "invalid" });
});

test("a Gmail typo offers the fix, keeping what came before the @", () => {
  assert.deepEqual(checkTesterEmail("Sam.Lee@GMIAL.com"), { err: "typo", fixed: "Sam.Lee@gmail.com" });
  assert.deepEqual(checkTesterEmail("sam@gmail.con"), { err: "typo", fixed: "sam@gmail.com" });
});
