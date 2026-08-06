"use strict";

/**
 * Cursor agent shells (and some CI) set both NO_COLOR and FORCE_COLOR.
 * Node warns on every process that inspects color support when both exist.
 * Keep a single signal: disable via NO_COLOR, or enable via FORCE_COLOR.
 */
function resolveColorEnvConflict(env = process.env) {
  if (env.NO_COLOR === undefined || env.FORCE_COLOR === undefined) {
    return env;
  }

  const force = env.FORCE_COLOR;
  if (force === "0" || force === "") {
    delete env.FORCE_COLOR;
  } else {
    delete env.NO_COLOR;
  }

  return env;
}

resolveColorEnvConflict();

module.exports = { resolveColorEnvConflict };
