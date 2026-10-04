import { test } from "node:test";
import assert from "node:assert/strict";
import { distance, suggestEmail } from "./email-suggest";

const s = (e: string) => suggestEmail(e)?.email ?? null;

test("distance counts a swap as one edit", () => {
  assert.equal(distance("gmial", "gmail"), 1);
  assert.equal(distance("gmail", "gmail"), 0);
  assert.equal(distance("", "abc"), 3);
});

test("common typos get the right provider", () => {
  assert.equal(s("sam@gmial.com"), "sam@gmail.com");
  assert.equal(s("sam@gmailll.com"), "sam@gmail.com");
  assert.equal(s("sam@gnail.com"), "sam@gmail.com");
  assert.equal(s("sam@gmail.co"), "sam@gmail.com");
  assert.equal(s("sam@hotmial.co"), "sam@hotmail.com");
  assert.equal(s("sam@yaho.com"), "sam@yahoo.com");
  assert.equal(s("sam@outlok.com"), "sam@outlook.com");
  assert.equal(s("sam@iclod.com"), "sam@icloud.com");
  assert.equal(s("Sam.Smith+tv@GMIAL.COM"), "Sam.Smith+tv@gmail.com"); // keeps the local part as typed
  assert.equal(s("sam@hotmial.fr"), "sam@hotmail.fr");
  assert.equal(s("sam@btinternt.com"), "sam@btinternet.com");
});

test("bad endings on unknown providers", () => {
  assert.equal(s("ayush@manali.con"), "ayush@manali.com");
  assert.equal(s("a@company.cmo"), "a@company.com");
  assert.equal(s("a@school.ogr"), "a@school.org");
});

test("no suggestion for good or unknowable addresses", () => {
  for (const ok of ["sam@gmail.com", "sam@me.com", "sam@mac.com", "sam@mail.com", "sam@proton.me", "sam@manali.page",
    "sam@company.co", "sam@uni.ac.uk", "sam@sky.com", "sam@yahoo.de", "sam@t-online.de", "sam@ma.com", "sam@fastmail.com", "a@b", "@gmail.com", "nope", "", "sam@"]) {
    assert.equal(s(ok), null, ok);
  }
});
