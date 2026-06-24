import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";

expect.extend(matchers);
