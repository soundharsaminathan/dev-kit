export type EmailActionMode =
  | "verifyEmail"
  | "verifyAndChangeEmail"
  | "resetPassword"
  | "recoverEmail";

export function parseEmailActionMode(
  value: string | undefined,
): EmailActionMode | null {
  switch (value) {
    case "verifyEmail":
    case "verifyAndChangeEmail":
    case "resetPassword":
    case "recoverEmail":
      return value;
    default:
      return null;
  }
}

export function emailActionCopy(mode: EmailActionMode) {
  switch (mode) {
    case "verifyAndChangeEmail":
      return {
        title: "Confirm new email",
        successTitle: "Email updated",
        successBody:
          "Sign in with your new email address. This link can only be used once.",
      };
    case "verifyEmail":
      return {
        title: "Verify email",
        successTitle: "Email verified",
        successBody: "You can sign in with this address now.",
      };
    case "resetPassword":
      return {
        title: "Set a new password",
        successTitle: "Password updated",
        successBody: "Sign in with your new password.",
      };
    case "recoverEmail":
      return {
        title: "Restore email",
        successTitle: "Email restored",
        successBody: "Your previous email address is active again.",
      };
  }
}
