import { describe, expect, it } from "vitest";
import { buildPortfolioSystemPrompt } from "./portfolioContext";

describe("buildPortfolioSystemPrompt", () => {
  it("includes identity and real college years", () => {
    const prompt = buildPortfolioSystemPrompt();
    expect(prompt).toContain("Soundhar");
    expect(prompt).toContain("2014");
    expect(prompt).toContain("2018");
    expect(prompt).toContain("Answer ONLY using the portfolio data");
  });

  it("tags sample content", () => {
    const prompt = buildPortfolioSystemPrompt();
    expect(prompt).toContain("[SAMPLE");
  });
});
