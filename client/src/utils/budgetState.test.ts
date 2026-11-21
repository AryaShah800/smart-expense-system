import { describe, expect, it } from "vitest";
import { budgetState } from "./budgetState";

describe("budgetState", () => {
  it("is ok below 80%", () => expect(budgetState(79, 100)).toBe("ok"));
  it("warns from 80% up to and including the limit", () => {
    expect(budgetState(80, 100)).toBe("warn");
    expect(budgetState(100, 100)).toBe("warn");
  });
  it("is over once spending passes the limit", () => expect(budgetState(101, 100)).toBe("over"));
  it("treats a missing limit as ok", () => expect(budgetState(50, 0)).toBe("ok"));
});
