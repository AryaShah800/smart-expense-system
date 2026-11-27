import { describe, expect, it, vi } from "vitest";
import { exportTransactionsPdf } from "./exportPdf";
import { transaction } from "../test/fixtures";

const texts: string[] = [];
const tableBodies: unknown[] = [];

// A stand-in jsPDF: every drawing method is a no-op, `text` records what would be printed.
vi.mock("jspdf", () => ({
  default: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    lastAutoTable = { finalY: 100 };
    constructor() {
      return new Proxy(this, {
        get(target, prop) {
          if (prop in target) return target[prop as keyof typeof target];
          if (prop === "text") return (value: string | string[]) => texts.push(...[value].flat());
          if (prop === "getTextWidth") return () => 10;
          if (prop === "splitTextToSize") return (value: string) => [value];
          if (prop === "getNumberOfPages") return () => 1;
          return () => undefined;
        },
      });
    }
  },
}));
vi.mock("jspdf-autotable", () => ({ default: (_doc: unknown, options: { body?: unknown }) => tableBodies.push(options.body) }));

describe("exportTransactionsPdf", () => {
  it("prints the user's currency code and 'All' for an all-time start", async () => {
    texts.length = 0;
    tableBodies.length = 0;
    await exportTransactionsPdf({ userName: "arya", transactions: [transaction("t1", 250)], toDate: "27/11/2026", currency: "USD" });

    const printed = JSON.stringify([texts, tableBodies]);
    expect(printed).toContain("USD");
    expect(printed).not.toContain("INR");
    expect(texts.some((t) => t.startsWith("Period: All - 27/11/2026"))).toBe(true);
  });
});
