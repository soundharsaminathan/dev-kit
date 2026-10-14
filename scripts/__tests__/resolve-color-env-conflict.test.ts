import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  resolveColorEnvConflict,
} = require("../resolve-color-env-conflict.cjs");

describe("resolveColorEnvConflict", () => {
  it("drops FORCE_COLOR=0 when NO_COLOR is set", () => {
    const env = { NO_COLOR: "1", FORCE_COLOR: "0" };
    resolveColorEnvConflict(env);
    expect(env).toEqual({ NO_COLOR: "1" });
  });

  it("drops NO_COLOR when FORCE_COLOR enables color", () => {
    const env = { NO_COLOR: "1", FORCE_COLOR: "1" };
    resolveColorEnvConflict(env);
    expect(env).toEqual({ FORCE_COLOR: "1" });
  });

  it("leaves a single signal alone", () => {
    const onlyNoColor = { NO_COLOR: "1" };
    resolveColorEnvConflict(onlyNoColor);
    expect(onlyNoColor).toEqual({ NO_COLOR: "1" });

    const onlyForce = { FORCE_COLOR: "0" };
    resolveColorEnvConflict(onlyForce);
    expect(onlyForce).toEqual({ FORCE_COLOR: "0" });
  });
});
