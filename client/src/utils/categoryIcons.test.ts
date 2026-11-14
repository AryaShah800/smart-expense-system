import { describe, expect, it } from "vitest";
import { getCategoryIcon } from "./categoryIcons";

describe("getCategoryIcon", () => {
  it("prefers an emoji stored on the category", () => {
    expect(getCategoryIcon({ name: "Food", icon: "🍕" })).toBe("🍕");
  });

  it("ignores the default-icon placeholder and matches by name", () => {
    expect(getCategoryIcon({ name: "Food", icon: "default-icon" })).toBe("🍔");
  });

  it("matches names case-insensitively and by substring", () => {
    expect(getCategoryIcon("  MONTHLY Rent ")).toBe("🏠");
  });

  it("falls back by transaction type", () => {
    expect(getCategoryIcon("Unknown thing")).toBe("🏷️");
    expect(getCategoryIcon("Unknown thing", "income")).toBe("💰");
    expect(getCategoryIcon(null)).toBe("🏷️");
    expect(getCategoryIcon(undefined, "income")).toBe("💰");
  });
});
