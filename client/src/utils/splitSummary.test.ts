import { describe, expect, it } from "vitest";
import { summarizeBalance } from "./splitSummary";
import type { GroupSplits } from "../types";

const splits = (balance: number, settlements: GroupSplits["settlements"] = []): GroupSplits => ({
  balances: [
    { userId: "me", username: "Me", balance },
    { userId: "other", username: "Other", balance: -balance },
  ],
  settlements,
});

describe("summarizeBalance", () => {
  it("shows a loading label until splits and a user exist", () => {
    expect(summarizeBalance(null, "me")).toBe("Loading...");
    expect(summarizeBalance(splits(0), undefined)).toBe("Loading...");
  });

  it("shows a loading label when the user is not in the balances", () => {
    expect(summarizeBalance(splits(10), "stranger")).toBe("Loading...");
  });

  it("says what you owe, as a positive amount", () => {
    expect(summarizeBalance(splits(-250), "me", "INR")).toBe("You owe ₹250");
  });

  it("says what you are owed", () => {
    expect(summarizeBalance(splits(1200), "me", "INR")).toBe("You are owed ₹1,200");
  });

  it("uses the user's currency", () => {
    expect(summarizeBalance(splits(-5), "me", "USD")).toBe("You owe $5");
  });

  it("treats balances within a cent of zero as settled", () => {
    expect(summarizeBalance(splits(0.01), "me")).toBe("All settled up ✨");
    expect(summarizeBalance(splits(-0.005), "me")).toBe("All settled up ✨");
  });

  it("uses a different label when settled but other people still owe each other", () => {
    const withSettlement = splits(0, [{ from: "A", to: "B", amount: 10 }]);
    expect(summarizeBalance(withSettlement, "me")).toBe("You are all settled up");
  });
});
