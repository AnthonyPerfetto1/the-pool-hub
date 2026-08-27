import { describe, expect, it } from "vitest";
import { computeAmountRemaining } from "./money";

describe("computeAmountRemaining", () => {
  it("subtracts total paid from price", () => {
    expect(computeAmountRemaining("500.00", "200.00")).toBe("300.00");
  });

  it("returns the full price when nothing has been paid", () => {
    expect(computeAmountRemaining("500.00", "0.00")).toBe("500.00");
  });

  it("returns 0.00 when fully paid", () => {
    expect(computeAmountRemaining("500.00", "500.00")).toBe("0.00");
  });

  it("clamps at 0.00 rather than going negative when overpaid", () => {
    expect(computeAmountRemaining("100.00", "150.00")).toBe("0.00");
  });
});
