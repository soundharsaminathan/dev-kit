import { describe, expect, it } from "vitest";
import {
  billingFieldErrors,
  buildBillingPayload,
  DEFAULT_STUDIO_TIMEZONE,
  expiryReminderLabel,
  formatAdmissionFee,
  gracePeriodLabel,
  hasBillingErrors,
  isAdmissionEnabled,
  isValidIanaTimeZone,
  listStudioTimezones,
  parseAmount,
  parseBoundedInteger,
  timezoneConfirmation,
  timezoneOffsetLabel,
  timezonePlace,
  valuesFromSettings,
} from "./studio-billing-model";

describe("studio billing model", () => {
  it("accepts Asia/Kolkata and rejects invented zones", () => {
    expect(isValidIanaTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
  });

  it("parses bounded day counts and amounts", () => {
    expect(parseBoundedInteger("3", 0, 30)).toBe(3);
    expect(parseBoundedInteger("31", 0, 30)).toBeNull();
    expect(parseBoundedInteger("1.5", 0, 30)).toBeNull();
    expect(parseBoundedInteger("-1", 0, 30)).toBeNull();
    expect(parseAmount("1000")).toBe(1000);
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("-10")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  it("treats a positive admission fee as enabled", () => {
    expect(isAdmissionEnabled("1000")).toBe(true);
    expect(isAdmissionEnabled("0")).toBe(false);
    expect(isAdmissionEnabled("")).toBe(false);
  });

  it("formats rupees without forcing extra decimals", () => {
    expect(formatAdmissionFee(1000)).toBe("₹1,000");
    expect(formatAdmissionFee(0)).toBe("₹0");
  });

  it("describes Asia/Kolkata as Chennai, India", () => {
    expect(timezonePlace("Asia/Kolkata")).toMatchObject({
      city: "Chennai",
      country: "India",
    });
    expect(timezoneOffsetLabel("Asia/Kolkata")).toBe("UTC +05:30");
    expect(timezoneConfirmation("Asia/Kolkata")).toEqual([
      "Chennai · India",
      "UTC +05:30",
    ]);
  });

  it("includes searchable aliases for Chennai in the timezone list", () => {
    const kolkata = listStudioTimezones().find(
      (zone) => zone.id === "Asia/Kolkata",
    );
    expect(kolkata?.textValue).toContain("Chennai");
    expect(kolkata?.textValue).toContain("India");
    expect(kolkata?.label).toContain("UTC +05:30");
  });

  it("validates owner fields and still checks expiry for staff", () => {
    const invalid = billingFieldErrors(
      {
        graceDays: "40",
        expireAlertDays: "120",
        timezone: "Nope",
        admissionFee: "-1",
      },
      { isOwner: true },
    );
    expect(invalid.graceDays).toBe("Must be between 0 and 30 days.");
    expect(invalid.expireAlertDays).toBe("Must be between 0 and 90 days.");
    expect(invalid.admissionFee).toBe("Enter a valid amount.");
    expect(invalid.timezone).toBe("Choose a valid studio timezone.");
    expect(hasBillingErrors(invalid)).toBe(true);

    const staff = billingFieldErrors(
      {
        graceDays: "40",
        expireAlertDays: "7",
        timezone: "Nope",
        admissionFee: "-1",
      },
      { isOwner: false },
    );
    expect(staff.graceDays).toBeUndefined();
    expect(staff.timezone).toBeUndefined();
    expect(staff.admissionFee).toBeUndefined();
    expect(staff.expireAlertDays).toBeUndefined();
  });

  it("builds the same owner and staff payloads as before", () => {
    const values = {
      graceDays: "3",
      expireAlertDays: "7",
      timezone: "Asia/Kolkata",
      admissionFee: "1000",
    };
    expect(buildBillingPayload(values, true)).toEqual({
      expireAlertDays: 7,
      graceDays: 3,
      timezone: "Asia/Kolkata",
      admissionFee: 1000,
    });
    expect(buildBillingPayload(values, false)).toEqual({
      expireAlertDays: 7,
    });
  });

  it("hydrates defaults from studio settings", () => {
    expect(valuesFromSettings(null)).toEqual({
      graceDays: "3",
      expireAlertDays: "7",
      timezone: DEFAULT_STUDIO_TIMEZONE,
      admissionFee: "0",
    });
    expect(gracePeriodLabel(3)).toBe("3-day grace period");
    expect(expiryReminderLabel(7)).toBe("7 days before");
    expect(expiryReminderLabel(1)).toBe("1 day before");
  });
});
