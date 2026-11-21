import { describe, it, expect } from "vitest";
import { buildCashFlowSeries } from "./cashFlowSeries";
import type { Transaction } from "../types/models";

const t = (date: string, type: "income" | "expense", amount: number) =>
  ({ date, type, amount } as unknown as Transaction);

describe("buildCashFlowSeries", () => {
  it("ends on the true final running balance", () => {
    const s = buildCashFlowSeries([t("2026-11-01T10:00:00", "income", 100), t("2026-11-02T10:00:00", "expense", 30)]);
    expect(s.map((p) => p.balance)).toEqual([100, 70]);
  });
  it("merges same-day transactions into one point", () => {
    const s = buildCashFlowSeries([t("2026-11-01T09:00:00", "income", 100), t("2026-11-01T18:00:00", "expense", 40)]);
    expect(s).toEqual([{ date: "Nov 1", balance: 60 }]);
  });
  it("keeps same month/day of different years as separate, ordered points", () => {
    const s = buildCashFlowSeries([
      t("2025-11-21T10:00:00", "income", 500),
      t("2025-12-01T10:00:00", "expense", 100),
      t("2026-11-21T10:00:00", "income", 50),
    ]);
    expect(s.map((p) => p.balance)).toEqual([500, 400, 450]);
    expect(s[2]?.date).toBe("Nov 21, 26");
  });
});
