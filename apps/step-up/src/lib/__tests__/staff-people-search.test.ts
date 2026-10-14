import { describe, expect, it } from "vitest";
import { matchesPersonSearch } from "@/lib/person-search";

describe("staff people list search helpers", () => {
  it("matches booking students by phone digits and email", () => {
    const bookingStudent = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+91 98765 43210",
    };
    expect(matchesPersonSearch(bookingStudent, "9876543210")).toBe(true);
    expect(matchesPersonSearch(bookingStudent, "ADA@EXAMPLE.COM")).toBe(true);
    expect(matchesPersonSearch(bookingStudent, "grace")).toBe(false);
  });

  it("matches chat contacts by email or phone while keeping role text usable", () => {
    const contact = {
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "+91 90000 11111",
      role: "STUDENT",
    };
    expect(matchesPersonSearch(contact, "9000011111")).toBe(true);
    expect(matchesPersonSearch(contact, "grace@example.com")).toBe(true);
  });

  it("matches trainers by name, email, or phone", () => {
    const trainer = {
      name: "Priya Shah",
      email: "priya@studio.test",
      phone: "+91 98888 77777",
    };
    expect(matchesPersonSearch(trainer, "priya")).toBe(true);
    expect(matchesPersonSearch(trainer, "9888877777")).toBe(true);
    expect(matchesPersonSearch(trainer, "missing")).toBe(false);
  });
});
