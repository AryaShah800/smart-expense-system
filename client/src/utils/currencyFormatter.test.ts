import { describe, expect, it } from "vitest";
import formatCurrency, { getCurrencySymbol } from "./currencyFormatter";

describe("formatCurrency", () => {
  it("defaults to INR with Indian digit grouping", () => {
    expect(formatCurrency(1234567)).toBe("₹12,34,567");
  });

  it("formats USD and GBP", () => {
    expect(formatCurrency(1500, "USD")).toBe("$1,500");
    expect(formatCurrency(99, "GBP")).toBe("£99");
  });

  it("rounds to whole units", () => {
    expect(formatCurrency(10.6, "USD")).toBe("$11");
  });

  it("treats missing amounts as zero", () => {
    expect(formatCurrency(undefined)).toBe("₹0");
    expect(formatCurrency(null, "USD")).toBe("$0");
  });
});

describe("getCurrencySymbol", () => {
  it("returns known symbols", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("falls back to the rupee for unknown codes", () => {
    expect(getCurrencySymbol("XYZ")).toBe("₹");
    expect(getCurrencySymbol()).toBe("₹");
  });
});
