import { describe, expect, it } from "vitest";
import { matchesPersonSearch } from "./person-search";

describe("matchesPersonSearch", () => {
  const person = {
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 98765 43210",
  };

  it("matches name, email, and blank queries", () => {
    expect(matchesPersonSearch(person, "asha")).toBe(true);
    expect(matchesPersonSearch(person, "EXAMPLE.COM")).toBe(true);
    expect(matchesPersonSearch(person, "  ")).toBe(true);
    expect(matchesPersonSearch(person, "priya")).toBe(false);
  });

  it("matches spaced phone substrings and digit-only queries", () => {
    expect(matchesPersonSearch(person, "98765")).toBe(true);
    expect(matchesPersonSearch(person, "9876543210")).toBe(true);
    expect(matchesPersonSearch(person, "9999")).toBe(false);
  });

  it("does not digit-normalize short queries under 4 digits", () => {
    expect(matchesPersonSearch(person, "91")).toBe(true);
    expect(matchesPersonSearch(person, "99")).toBe(false);
  });
});
