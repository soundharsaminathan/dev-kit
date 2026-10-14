/**
 * Node ESM loader that stubs stylesheet imports.
 *
 * Component dist JS side-effect-imports extracted CSS for bundlers. Playwright
 * (and other Node consumers) load those modules for test metadata and cannot
 * parse .css — return an empty module instead.
 */
const STYLE_EXT = /\.(?:css|scss|sass|less)(?:\?.*)?$/i;

/**
 * @param {string} url
 * @param {{ format?: string }} context
 * @param {(url: string, context: object) => Promise<object>} nextLoad
 */
export async function load(url, context, nextLoad) {
  if (STYLE_EXT.test(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default {};\n",
    };
  }

  return nextLoad(url, context);
}
