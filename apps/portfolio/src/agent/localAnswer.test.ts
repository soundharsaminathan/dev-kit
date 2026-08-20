import { describe, expect, it } from "vitest";
import { answerFromPortfolio } from "./localAnswer";

describe("answerFromPortfolio", () => {
  it("answers education with real college years", () => {
    const reply = answerFromPortfolio("When did you finish college?");
    expect(reply).toContain("2014");
    expect(reply).toContain("2018");
  });

  it("answers contact with email", () => {
    const reply = answerFromPortfolio("How can I contact you?");
    expect(reply).toContain("@");
  });

  it("answers skills", () => {
    const reply = answerFromPortfolio("What skills do you have?");
    expect(reply.toLowerCase()).toContain("react");
  });
});
