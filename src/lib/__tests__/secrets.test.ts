import { describe, expect, it } from "vitest";
import { secretMatches } from "../secrets";

describe("secretMatches", () => {
  it("matches only the exact secret", () => {
    expect(secretMatches("s3cret-value", "s3cret-value")).toBe(true);
    expect(secretMatches("s3cret-valuf", "s3cret-value")).toBe(false);
    expect(secretMatches("s3cret", "s3cret-value")).toBe(false);
    expect(secretMatches("s3cret-value-and-more", "s3cret-value")).toBe(false);
  });

  it("never matches when no secret is configured", () => {
    expect(secretMatches("", "")).toBe(false);
    expect(secretMatches("anything", undefined)).toBe(false);
    expect(secretMatches(undefined, undefined)).toBe(false);
    expect(secretMatches(null, "")).toBe(false);
  });

  it("refuses a missing guess", () => {
    expect(secretMatches(null, "s3cret-value")).toBe(false);
    expect(secretMatches(undefined, "s3cret-value")).toBe(false);
  });
});
