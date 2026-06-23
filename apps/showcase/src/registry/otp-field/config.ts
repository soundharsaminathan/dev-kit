import type { ComponentRegistryConfig } from "../types";

export const otpFieldConfig: ComponentRegistryConfig = {
  name: "OTPField",
  slug: "otp-field",
  category: "forms",
  description: "OTPField component showcase.",
  controls: [
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    { name: "isReadOnly", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
    { name: "labelText", type: "string", defaultValue: "Verification code" },
    { name: "showSeparator", type: "boolean", defaultValue: false },
  ],
};
