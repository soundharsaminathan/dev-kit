import { describe, expect, it } from "vitest";
import { buttonConfig } from "@/registry/button/config";
import { disclosureConfig } from "@/registry/disclosure/config";
import { getCardPreviewProps } from "../preview-props";

describe("getCardPreviewProps", () => {
  it("returns default control values from config", () => {
    const props = getCardPreviewProps(buttonConfig);
    expect(props).toMatchObject({
      children: "Button",
      variant: "default",
      size: "md",
      disabled: false,
      isPending: false,
    });
  });

  it("forces defaultOpen to false when control exists", () => {
    const props = getCardPreviewProps({
      ...disclosureConfig,
      controls: [
        ...disclosureConfig.controls,
        { name: "defaultOpen", type: "boolean", defaultValue: true },
      ],
    });
    expect(props.defaultOpen).toBe(false);
  });
});
